import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyStagingBackendRoute,
  CLOUDFLARE_LEGACY_ROUTE_PAIRS,
  createBackendApiRouter,
  isCloudflareRouteFamilyReady,
  isRetryableGatewayFailure,
  isStagingDisabledPath
} from "../public/backend-api-routing.mjs";

const renderBaseUrl = "https://render-staging.example";
const cloudflareBaseUrl = "https://smvastro-backend-api-staging.astroservices.workers.dev";

const workerRouteFiles = [
  "../cloudflare/backend-api/src/index.mjs",
  "../cloudflare/backend-api/src/core-read-routes.mjs",
  "../cloudflare/backend-api/src/wallet-read-routes.mjs",
  "../cloudflare/backend-api/src/wallet-recharge-routes.mjs",
  "../cloudflare/backend-api/src/wallet-offer-routes.mjs",
  "../cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs",
  "../cloudflare/backend-api/src/identity-profile-backfill-routes.mjs",
  "../cloudflare/backend-api/src/live-session-routes.mjs"
];

const workerRegisteredRoutePairs = new Set();
const routeRegistrationPattern = /\bapp\.(get|post|put|patch|delete)\s*\(\s*(['"])([^'"]+)\2/g;
for (const path of workerRouteFiles) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  for (const match of source.matchAll(routeRegistrationPattern)) {
    workerRegisteredRoutePairs.add(match[1].toUpperCase() + " " + match[3]);
  }
}

const ready = Object.freeze({
  ready: true,
  backendActive: true,
  firebaseConnected: true,
  identityProfileBackfillRoutesRegistered: true,
  walletBackfillRoutesRegistered: true,
  walletBackfillToolsEnabled: true,
  walletReadRoutesEnabled: true,
  walletRechargeRoutesEnabled: true,
  walletOfferRoutesEnabled: true,
  razorpayCredentialsConfigured: true,
  razorpayMode: "test",
  razorpayProviderConnectionVerified: true,
  liveCallChatRoutesEnabled: true
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function readinessFetch(value = ready, calls = []) {
  return async (url, init = {}) => {
    calls.push({ url, method: init.method || "GET" });
    if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(value);
    if (url.startsWith(renderBaseUrl)) return jsonResponse({ source: "render" });
    if (url.startsWith(cloudflareBaseUrl)) return jsonResponse({ source: "cloudflare" });
    throw new Error("Unexpected URL: " + url);
  };
}

test("the selected Cloudflare route map contains only real Worker registrations", () => {
  assert.equal(CLOUDFLARE_LEGACY_ROUTE_PAIRS.length, 45);
  for (const route of CLOUDFLARE_LEGACY_ROUTE_PAIRS) {
    const key = route.method + " " + route.path;
    assert.equal(workerRegisteredRoutePairs.has(key), true, key + " must exist in Worker source");
  }
});

test("Wallet, Recharge, Razorpay Wallet webhook, Live and Book Call/Chat routes are Cloudflare-primary", () => {
  const cases = [
    ["/wallet", "GET", "walletRead"],
    ["/wallet/transactions?limit=10", "GET", "walletRead"],
    ["/wallet/recharge-offers", "GET", "walletOffers"],
    ["/admin/offers/save", "POST", "walletOffers"],
    ["/wallet/recharge/create-order", "POST", "walletRecharge"],
    ["/wallet/recharge/verify", "POST", "walletRecharge"],
    ["/wallet/recharge/webhook", "POST", "walletRecharge"],
    ["/live/pricing", "GET", "live"],
    ["/live/requests", "POST", "live"],
    ["/live/sessions", "GET", "live"],
    ["/live/bookings/pending", "GET", "live"],
    ["/live/bookings/mine", "GET", "live"],
    ["/live/bookings/booking-1/accept", "POST", "live"],
    ["/live/sessions/session-1/signal", "POST", "live"],
    ["/live/sessions/session-1/messages", "GET", "live"]
  ];
  for (const [path, method, family] of cases) {
    assert.deepEqual(classifyStagingBackendRoute(path, method), {
      target: "cloudflare-primary",
      family
    }, method + " " + path);
  }
});

test("general identity and public configuration reads are Render-primary with Cloudflare secondary", () => {
  for (const path of ["/admin/access", "/account/role", "/public/push-config"]) {
    assert.deepEqual(classifyStagingBackendRoute(path, "GET"), {
      target: "render-primary",
      family: "renderRead"
    });
  }
});

test("legacy Private Consultation, Ask Now/question-payment and Android APK APIs are disabled only in Staging", () => {
  const paths = [
    "/customer/consultations",
    "/customer/private-consultations",
    "/admin/private-consultations-data",
    "/private-consultation/create-order",
    "/admin/private-consultation/reject-question",
    "/astrologer/private-consultations",
    "/submit-answer",
    "/question-notify",
    "/admin/questions-data",
    "/create-order",
    "/verify-payment",
    "/razorpay/webhook",
    "/public/android-app",
    "/admin/android-app",
    "/admin/android-app/upload"
  ];
  for (const path of paths) {
    assert.equal(isStagingDisabledPath(path), true, path);
    assert.deepEqual(classifyStagingBackendRoute(path, "GET"), {
      target: "disabled",
      family: "stagingDisabled"
    }, path);
  }
});

test("disabled Staging flows return 410 without contacting either backend", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      return jsonResponse({ unexpected: true });
    }
  });
  const response = await router.fetch("/private-consultation/create-order", { method: "POST", body: "{}" });
  assert.equal(response.status, 410);
  assert.equal((await response.json()).code, "STAGING_FEATURE_DISABLED");
  assert.deepEqual(calls, []);
});

test("readiness gates require real Firebase, Razorpay and route proofs", () => {
  for (const family of ["walletRead", "walletRecharge", "live", "coreRead"]) {
    assert.equal(isCloudflareRouteFamilyReady(family, { ...ready, firebaseConnected: false }), false, family);
  }
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", {
    ...ready, razorpayProviderConnectionVerified: false
  }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", {
    ...ready, razorpayMode: "live"
  }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletOffers", {
    ...ready, walletOfferRoutesEnabled: false
  }), false);
  assert.equal(isCloudflareRouteFamilyReady("live", {
    ...ready, liveCallChatRoutesEnabled: false
  }), false);
  assert.equal(isCloudflareRouteFamilyReady("publicConfig", { ready: true }), true);
});

test("Cloudflare-primary business writes stay on Render until the explicit backend cutover gate is enabled", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") {
        return jsonResponse({ ...ready, backendActive: false });
      }
      if (url === renderBaseUrl + "/wallet/recharge/create-order") {
        return jsonResponse({ source: "render-secondary-before-cutover" });
      }
      throw new Error("Wallet writes must stay on Render until Cloudflare backend cutover is enabled.");
    }
  });
  const response = await router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" });
  assert.deepEqual(await response.json(), { source: "render-secondary-before-cutover" });
  assert.deepEqual(calls, [
    { url: cloudflareBaseUrl + "/api/backend/readiness", method: "GET" },
    { url: renderBaseUrl + "/wallet/recharge/create-order", method: "POST" }
  ]);
});

test("Cloudflare-primary payment writes use Render secondary only when readiness fails before dispatch", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse({
        ...ready, firebaseConnected: false
      });
      if (url === renderBaseUrl + "/wallet/recharge/create-order") return jsonResponse({ source: "render-secondary" });
      throw new Error("Cloudflare must not receive a gated payment write.");
    }
  });
  const response = await router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" });
  assert.deepEqual(await response.json(), { source: "render-secondary" });
  assert.deepEqual(calls, [
    { url: cloudflareBaseUrl + "/api/backend/readiness", method: "GET" },
    { url: renderBaseUrl + "/wallet/recharge/create-order", method: "POST" }
  ]);
});

test("Cloudflare-primary payment writes are dispatched once when all readiness gates pass", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/wallet/recharge/create-order") return jsonResponse({ source: "cloudflare-primary" });
      throw new Error("Unexpected request: " + url);
    }
  });
  const response = await router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" });
  assert.deepEqual(await response.json(), { source: "cloudflare-primary" });
  assert.deepEqual(calls, [
    { url: cloudflareBaseUrl + "/api/backend/readiness", method: "GET" },
    { url: cloudflareBaseUrl + "/wallet/recharge/create-order", method: "POST" }
  ]);
});

test("a dispatched Cloudflare payment failure is never replayed to Render", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/wallet/recharge/create-order") throw new Error("connection lost after dispatch");
      throw new Error("A payment mutation must not be retried on Render.");
    }
  });
  await assert.rejects(
    router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" }),
    /connection lost after dispatch/
  );
  assert.deepEqual(calls, [
    { url: cloudflareBaseUrl + "/api/backend/readiness", method: "GET" },
    { url: cloudflareBaseUrl + "/wallet/recharge/create-order", method: "POST" }
  ]);
});

test("Cloudflare-primary GET failures safely fall back to Render", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/live/pricing") return jsonResponse({ error: "Worker unavailable" }, 503);
      if (url === renderBaseUrl + "/live/pricing") return jsonResponse({ source: "render-secondary" });
      throw new Error("Unexpected request: " + url);
    }
  });
  const response = await router.fetch("/live/pricing", { method: "GET" });
  assert.deepEqual(await response.json(), { source: "render-secondary" });
  assert.deepEqual(calls.map(call => call.url), [
    cloudflareBaseUrl + "/api/backend/readiness",
    cloudflareBaseUrl + "/live/pricing",
    renderBaseUrl + "/live/pricing"
  ]);
});

test("Render-primary GET failures safely fall back to a ready Cloudflare secondary", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === renderBaseUrl + "/account/role") return jsonResponse({ error: "Render down" }, 503);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/account/role") return jsonResponse({ source: "cloudflare-secondary" });
      throw new Error("Unexpected request: " + url);
    }
  });
  const response = await router.fetch("/account/role", { method: "GET" });
  assert.deepEqual(await response.json(), { source: "cloudflare-secondary" });
  assert.deepEqual(calls.map(call => call.url), [
    renderBaseUrl + "/account/role",
    cloudflareBaseUrl + "/api/backend/readiness",
    cloudflareBaseUrl + "/account/role"
  ]);
});

test("unported Render routes remain pinned and never reach the Cloudflare catch-all", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === renderBaseUrl + "/public/astrologers") return jsonResponse({ error: "Render unavailable" }, 503);
      throw new Error("Unported route must not reach Cloudflare.");
    }
  });
  const response = await router.fetch("/public/astrologers", { method: "GET" });
  assert.equal(response.status, 503);
  assert.deepEqual(calls, [{ url: renderBaseUrl + "/public/astrologers", method: "GET" }]);
});

test("ordinary mutations are never replayed between Render and Cloudflare", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      return jsonResponse({ error: "Render unavailable" }, 503);
    }
  });
  const response = await router.fetch("/unknown-mutation", { method: "POST", body: "{}" });
  assert.equal(response.status, 503);
  assert.deepEqual(calls, [{ url: renderBaseUrl + "/unknown-mutation", method: "POST" }]);
});

test("only GET/HEAD network and gateway failures are retryable", () => {
  assert.equal(isRetryableGatewayFailure({ method: "GET", networkError: true }), true);
  assert.equal(isRetryableGatewayFailure({ method: "HEAD", status: 503 }), true);
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    assert.equal(isRetryableGatewayFailure({ method, status: 503 }), false);
    assert.equal(isRetryableGatewayFailure({ method, networkError: true }), false);
  }
  assert.equal(isRetryableGatewayFailure({ method: "GET", status: 503, aborted: true }), false);
});

test("non-Staging hosts preserve Render-only routing and all Production consultation/APK routes", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: false, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      return jsonResponse({ source: "render-production" });
    }
  });
  const response = await router.fetch("/private-consultation/create-order", { method: "POST", body: "{}" });
  assert.deepEqual(await response.json(), { source: "render-production" });
  assert.deepEqual(calls, [{
    url: renderBaseUrl + "/private-consultation/create-order",
    method: "POST"
  }]);
});
