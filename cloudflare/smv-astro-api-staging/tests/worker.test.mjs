import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const TOKEN = "unit-test-staging-token-must-be-at-least-32-chars";
const ORIGIN = "http://localhost:8788";

function fakeDb({ failReads = false, failWrites = false } = {}) {
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (failWrites) throw new Error("simulated database failure");
              return { success: true, sql, args };
            },
          };
        },
        async first() {
          if (failReads) throw new Error("simulated database failure");
          assert.equal(sql, "SELECT 1 AS alive");
          return { alive: 1 };
        },
      };
    },
  };
}

function env(overrides = {}) {
  return {
    APP_ENV: "staging",
    STAGING_BUILD_VERSION: "test",
    STAGING_ADMIN_TOKEN: TOKEN,
    CORS_ALLOWED_ORIGINS: ORIGIN,
    DB: fakeDb(),
    ...overrides,
  };
}

async function call(path, { method = "GET", headers = {}, body, bindings = env() } = {}) {
  const request = new Request("https://worker.test" + path, {
    method, headers, ...(body === undefined ? {} : { body }),
  });
  const response = await worker.fetch(request, bindings);
  const text = await response.text();
  return { response, json: text ? JSON.parse(text) : null };
}

test("health endpoint identifies staging and denies production data access", async () => {
  const { response, json } = await call("/healthz");
  assert.equal(response.status, 200);
  assert.equal(json.environment, "staging");
  assert.equal(json.productionDataAccess, false);
});

test("security headers are always applied to JSON responses", async () => {
  const { response } = await call("/healthz");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("X-Frame-Options"), "DENY");
  assert.equal(response.headers.get("Referrer-Policy"), "no-referrer");
});

test("fails closed when APP_ENV is not staging", async () => {
  for (const bindings of [env({ APP_ENV: "production" }), env({ APP_ENV: undefined })]) {
    const { response, json } = await call("/healthz", { bindings });
    assert.equal(response.status, 503);
    assert.equal(json.error.code, "STAGING_ONLY");
  }
});

test("manifest declares wallet, payments and live features disabled", async () => {
  const { response, json } = await call("/api/v1/staging/manifest");
  assert.equal(response.status, 200);
  assert.equal(json.status, "scaffold-only");
  assert.ok(json.deliberatelyDisabled.includes("wallet"));
  assert.ok(json.deliberatelyDisabled.includes("razorpay"));
  assert.ok(json.deliberatelyDisabled.includes("live-call"));
});

test("allows only configured CORS origin", async () => {
  const ok = await call("/healthz", { headers: { Origin: ORIGIN } });
  assert.equal(ok.response.status, 200);
  assert.equal(ok.response.headers.get("Access-Control-Allow-Origin"), ORIGIN);

  const blocked = await call("/healthz", { headers: { Origin: "https://smvastroservices.pages.dev" } });
  assert.equal(blocked.response.status, 403);
  assert.equal(blocked.json.error.code, "ORIGIN_NOT_ALLOWED");
});

test("preflight responds only for configured origin", async () => {
  const { response } = await call("/api/v1/staging/probe", {
    method: "OPTIONS",
    headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST" },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.match(response.headers.get("Access-Control-Allow-Headers"), /Authorization/);
});

test("D1 health probe succeeds with a D1-compatible binding", async () => {
  const { response, json } = await call("/api/v1/staging/db-check");
  assert.equal(response.status, 200);
  assert.equal(json.database, "reachable");
});

test("D1 health probe fails closed if binding is missing or unavailable", async () => {
  for (const bindings of [env({ DB: undefined }), env({ DB: fakeDb({ failReads: true }) })]) {
    const { response } = await call("/api/v1/staging/db-check", { bindings });
    assert.equal(response.status, 503);
  }
});

test("probe requires an authenticated bearer token", async () => {
  const { response, json } = await call("/api/v1/staging/probe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ probeName: "connectivity" }),
  });
  assert.equal(response.status, 401);
  assert.equal(json.error.code, "UNAUTHORIZED");
});

test("probe rejects weak or missing configured secret", async () => {
  const { response, json } = await call("/api/v1/staging/probe", {
    method: "POST",
    bindings: env({ STAGING_ADMIN_TOKEN: "short" }),
    headers: { Authorization: "Bearer short", "Content-Type": "application/json" },
    body: JSON.stringify({ probeName: "connectivity" }),
  });
  assert.equal(response.status, 503);
  assert.equal(json.error.code, "STAGING_TOKEN_NOT_CONFIGURED");
});

test("probe rejects invalid JSON and invalid probe names", async () => {
  const headers = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
  const badJson = await call("/api/v1/staging/probe", { method: "POST", headers, body: "{" });
  assert.equal(badJson.response.status, 400);
  const badName = await call("/api/v1/staging/probe", {
    method: "POST", headers, body: JSON.stringify({ probeName: "bad name / value" }),
  });
  assert.equal(badName.response.status, 400);
});

test("probe rejects oversized request bodies", async () => {
  const { response, json } = await call("/api/v1/staging/probe", {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ probeName: "ok" }) + " ".repeat(3000),
  });
  assert.equal(response.status, 413);
  assert.equal(json.error.code, "REQUEST_BODY_TOO_LARGE");
});

test("probe writes only a validated staging probe row", async () => {
  let inserted;
  const db = { prepare(sql) { return { bind(...args) { return { async run() { inserted = { sql, args }; return { success: true }; } }; } }; } };
  const { response, json } = await call("/api/v1/staging/probe", {
    method: "POST",
    bindings: env({ DB: db }),
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ probeName: "smoke_test-1" }),
  });
  assert.equal(response.status, 201);
  assert.equal(json.environment, "staging");
  assert.match(inserted.sql, /INSERT INTO staging_probe_events/);
  assert.equal(inserted.args[1], "smoke_test-1");
});

test("probe hides internal database write errors", async () => {
  const { response, json } = await call("/api/v1/staging/probe", {
    method: "POST",
    bindings: env({ DB: fakeDb({ failWrites: true }) }),
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ probeName: "smoke" }),
  });
  assert.equal(response.status, 503);
  assert.equal(JSON.stringify(json).includes("simulated database failure"), false);
});

test("probe endpoint rejects other methods and unknown routes return 404", async () => {
  const wrongMethod = await call("/api/v1/staging/probe");
  assert.equal(wrongMethod.response.status, 405);
  const unknown = await call("/missing");
  assert.equal(unknown.response.status, 404);
});
