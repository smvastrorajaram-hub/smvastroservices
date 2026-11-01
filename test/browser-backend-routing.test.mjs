import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyStagingBackendRoute,
  CLOUDFLARE_LEGACY_ROUTE_PAIRS,
  createBackendApiRouter,
  isCloudflareRouteFamilyReady,
  isRetryableRenderReadFailure
} from "../public/backend-api-routing.mjs";

const renderBaseUrl = "https://render-staging.example";
const cloudflareBaseUrl = "https://smvastro-backend-api-staging.astroservices.workers.dev";

const workerRouteFiles = ["../cloudflare/backend-api/src/index.mjs","../cloudflare/backend-api/src/core-read-routes.mjs","../cloudflare/backend-api/src/wallet-read-routes.mjs","../cloudflare/backend-api/src/wallet-recharge-routes.mjs","../cloudflare/backend-api/src/wallet-offer-routes.mjs","../cloudflare/backend-api/src/wallet-domain-backfill-routes.mjs","../cloudflare/backend-api/src/identity-profile-backfill-routes.mjs","../cloudflare/backend-api/src/live-session-routes.mjs","../cloudflare/backend-api/src/legacy-razorpay-routes.mjs"];
const workerRegisteredRoutePairs = new Set();
for (const path of workerRouteFiles) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const expression = /\\bapp\\.(get|post|put|patch|delete)\\s*\\(\\s*(['"`])([^'"`]+)\\2/g;
  for (const match of source.matchAll(expression)) {
    workerRegisteredRoutePairs.add(match[1].toUpperCase() + " " + match[3]);
  }
}

const ready = Object.freeze({
  ready: true,
  firebaseConnected: true,
  identityProfileBackfillRoutesRegistered: true,
  walletBackfillRoutesRegistered: true,
  walletBackfillToolsEnabled: true,
  walletReadRoutesEnabled: true,
  walletRechargeRoutesEnabled: true,
  walletOfferRoutesEnabled: true,
  legacyRazorpayRoutesRegistered: true,
  razorpayCredentialsConfigured: true,
  razorpayMode: "test",
  liveCallChatRoutesEnabled: true,
  razorpayConnected: true,
  razorpayProviderConnectionVerified: true
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("every selected Cloudflare route is backed by a literal Worker handler registration", () => {
  assert.equal(CLOUDFLARE_LEGACY_ROUTE_PAIRS.length, 52);
  for (const route of CLOUDFLARE_LEGACY_ROUTE_PAIRS) {
    const key = route.method + " " + route.path;
    assert.equal(workerRegisteredRoutePairs.has(key), true, key + " must exist in Worker source");
    const expectedTarget = key === "GET /admin/access" || key === "GET /account/role"
      ? "render-primary"
      : "cloudflare-primary";
    assert.equal(classifyStagingBackendRoute(route.path, route.method).target, expectedTarget, key);
  }
  assert.equal(classifyStagingBackendRoute("/lookup-id-login", "POST").family, "renderPinned");
  assert.equal(classifyStagingBackendRoute("/create-order", "POST").family, "renderPinned");
  assert.equal(classifyStagingBackendRoute("/public/astrologers", "GET").family, "renderPinned");
});
  assert.equal(CLOUDFLARE_LEGACY_ROUTE_PAIRS.length, 122);
  for (const route of CLOUDFLARE_LEGACY_ROUTE_PAIRS) {
    assert.equal(
      classifyStagingBackendRoute(route.path, route.method).target,
      "cloudflare-primary",
      route.method + " " + route.path
    );
  }
  assert.equal(classifyStagingBackendRoute("/lookup-id-login", "GET").target, "render-primary");
  assert.equal(classifyStagingBackendRoute("/register-customer-profile", "POST").target, "cloudflare-primary");
  assert.equal(classifyStagingBackendRoute("/public/astrologers", "GET").target, "cloudflare-primary");
});

test("retired, Horoscope, email-unverified and unprovisioned APK routes stay pinned outside Cloudflare", () => {
  const pinned = [
    ["/customer/consultations", "GET"],
    ["/customer/private-consultations", "GET"],
    ["/admin/private-consultation/reject-question", "POST"],
    ["/private-consultation/create-order", "POST"],
    ["/astrologer/private-consultation/submit-answer", "POST"],
    ["/horoscope-auth/session", "GET"],
    ["/admin/horoscope-feature-settings", "POST"],
    ["/admin/private-consultations-data", "GET"],
    ["/api/prediction/horoscope", "POST"],
    ["/contact-query", "POST"],
    ["/question-notify", "POST"],
    ["/admin/android-app/upload", "POST"]
  ];
  for (const [path, method] of pinned) {
    assert.deepEqual(classifyStagingBackendRoute(path, method), {
      target: "render-primary",
      family: "renderPinned"
    }, method + " " + path);
  }
});

test("maps only implemented Wallet, Razorpay and Live handlers to their own readiness gates", () => {
  const cases = [
    ["/admin/access", "GET", "legacyCore"],
    ["/account/role", "GET", "legacyCore"],
    ["/admin/reject-question", "POST", "legacyPayments"],
    ["/admin/retry-refund", "POST", "legacyPayments"],
    ["/admin/refund-trace/question-1", "GET", "legacyPayments"],
    ["/customer/sync-refund", "POST", "legacyPayments"],
    ["/admin/sync-refund", "POST", "legacyPayments"],
    ["/create-order", "POST", "legacyPayments"],
    ["/verify-payment", "POST", "legacyPayments"],
    ["/razorpay/webhook", "POST", "legacyPayments"],
    ["/wallet", "GET", "walletRead"],
    ["/wallet/transactions?limit=10", "GET", "walletRead"],
    ["/wallet/recharge/create-order", "POST", "walletRecharge"],
    ["/wallet/recharge/verify", "POST", "walletRecharge"],
    ["/wallet/recharge-offers", "GET", "walletOffers"],
    ["/admin/offers", "GET", "walletOffers"],
    ["/admin/offers/save", "POST", "walletOffers"],
    ["/admin/offers/delete", "POST", "walletOffers"],
    ["/admin/wallet/backfill/status", "GET", "walletBackfill"],
    ["/admin/wallet/backfill/preflight", "POST", "walletBackfill"],
    ["/admin/wallet/backfill/preview", "POST", "walletBackfill"],
    ["/admin/wallet/backfill/apply", "POST", "walletBackfill"],
    ["/admin/wallet/backfill/reconcile", "POST", "walletBackfill"],
    ["/admin/withdrawals-data", "GET", "live"],
    ["/admin/withdrawal-mark-processing", "POST", "live"],
    ["/admin/withdrawal-reject", "POST", "live"],
    ["/astrologer/earnings", "GET", "live"],
    ["/astrologer/withdrawal-request", "POST", "live"],
    ["/admin/withdrawal-mark-paid", "POST", "live"],
    ["/admin/withdrawal-payout/withdrawal-1", "GET", "live"],
    ["/live/pricing", "GET", "live"],
    ["/live/ice-config", "GET", "live"],
    ["/admin/live/pricing", "POST", "live"],
    ["/admin/live/commission", "POST", "live"],
    ["/live/events", "GET", "live"],
    ["/live/requests", "POST", "live"],
    ["/live/sessions", "GET", "live"],
    ["/live/bookings/pending", "GET", "live"],
    ["/live/bookings/mine", "GET", "live"],
    ["/live/bookings/booking-1/accept", "POST", "live"],
    ["/live/bookings/booking-1/reject", "POST", "live"],
    ["/live/bookings/booking-1/cancel", "POST", "live"],
    ["/live/sessions/session-1/accept", "POST", "live"],
    ["/live/sessions/session-1/reject", "POST", "live"],
    ["/live/sessions/session-1/end", "POST", "live"],
    ["/live/sessions/session-1/ready", "POST", "live"],
    ["/live/sessions/session-1/signal", "POST", "live"],
    ["/live/sessions/session-1/signals", "GET", "live"],
    ["/live/sessions/session-1/messages", "POST", "live"],
    ["/live/sessions/session-1/messages", "GET", "live"],
    ["/live/sessions/session-1/connection", "POST", "live"]
  ];
  for (const [path, method, family] of cases) {
    assert.deepEqual(classifyStagingBackendRoute(path, method), {
      target: family === "legacyCore" ? "render-primary" : "cloudflare-primary",
      family: family === "legacyCore" ? "coreReadFallback" : family
    }, method + " " + path);
  }
});

test("legacy inventory paths without a literal Worker handler are pinned to Render", () => {
  const unported = [
    ["/lookup-customer-login", "POST"],
    ["/register-customer-profile", "POST"],
    ["/appointment-booking", "POST"],
    ["/customer/appointments", "GET"],
    ["/public/astrologers", "GET"],
    ["/test-razorpay", "GET"],
    ["/admin/questions-data", "GET"],
    ["/public/content", "GET"],
    ["/live/push/register", "POST"],
    ["/api/locations/search", "GET"]
  ];
  for (const [path, method] of unported) {
    assert.deepEqual(classifyStagingBackendRoute(path, method), {
      target: "render-primary",
      family: "renderPinned"
    }, method + " " + path);
  }
});

test("Cloudflare legacy-core readiness requires both route-registration proofs", () => {
  assert.equal(isCloudflareRouteFamilyReady("legacyCore", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("booking", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("legacyCore", { ...ready, identityProfileBackfillRoutesRegistered: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyCore", { ...ready, walletBackfillRoutesRegistered: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyCore", { ...ready, ready: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyCore", { ...ready, firebaseConnected: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRead", { ...ready, firebaseConnected: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("razorpayProbe", { ...ready, firebaseConnected: false }), false);
});

test("Wallet, Razorpay and Live gates remain fail-closed until their own readiness flags open", () => {
  assert.equal(isCloudflareRouteFamilyReady("walletBackfill", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("walletRead", { ...ready, walletReadRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletOffers", { ...ready, walletOfferRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", { ...ready, walletRechargeRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", { ...ready, razorpayCredentialsConfigured: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", { ...ready, razorpayProviderConnectionVerified: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyPayments", { ...ready, razorpayProviderConnectionVerified: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyPayments", { ...ready, legacyRazorpayRoutesRegistered: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyPayments", { ...ready, razorpayCredentialsConfigured: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("legacyPayments", { ...ready, razorpayProviderConnectionVerified: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("live", { ...ready, liveCallChatRoutesEnabled: false }), false);
});

test("only GET/HEAD network or gateway failures may fail over; mutations are never retried", () => {
  assert.equal(isRetryableRenderReadFailure({ method: "GET", networkError: true }), true);
  assert.equal(isRetryableRenderReadFailure({ method: "HEAD", status: 503 }), true);
  for (const status of [400, 401, 403, 404, 409, 422]) {
    assert.equal(isRetryableRenderReadFailure({ method: "GET", status }), false);
  }
  assert.equal(isRetryableRenderReadFailure({ method: "POST", networkError: true }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "PUT", status: 503 }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "PATCH", status: 503 }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "DELETE", status: 503 }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "GET", status: 503, aborted: true }), false);
});

test("Cloudflare-primary legacy writes go to Cloudflare exactly once after readiness succeeds", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/create-order") return jsonResponse({ success: true });
      throw new Error("Unexpected request: " + url);
    }
  });
  const response = await router.fetch("/register-customer-profile", { method: "POST", body: "{}" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    { url: cloudflareBaseUrl + "/api/backend/readiness", method: "GET" },
    { url: cloudflareBaseUrl + "/register-customer-profile", method: "POST" }
  ]);
});

test("legacy payment writes require the specific Razorpay readiness gate and never fall back to Render", async () => {
  const calls = [];
  const disabled = { ...ready, legacyRazorpayRoutesRegistered: false };
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async url => {
      calls.push(url);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(disabled);
      throw new Error("A gated Razorpay route must not be called.");
    }
  });
  await assert.rejects(
    router.fetch("/create-order", { method: "POST", body: "{}" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY" && error.status === 503
  );
  assert.deepEqual(calls, [cloudflareBaseUrl + "/api/backend/readiness"]);
});

test("Wallet recharge and Live sessions fail closed and are never sent to Render when disabled", async () => {
  const calls = [];
  const disabled = { ...ready, walletRechargeRoutesEnabled: false, liveCallChatRoutesEnabled: false };
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async url => {
      calls.push(url);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(disabled);
      throw new Error("A disabled Wallet or Live route must not be dispatched.");
    }
  });
  await assert.rejects(router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY");
  await assert.rejects(router.fetch("/live/sessions", { method: "GET" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY");
  await assert.rejects(router.fetch("/admin/withdrawal-mark-processing", { method: "POST", body: "{}" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY");
  await assert.rejects(router.fetch("/live/sessions/session-1/connection", { method: "POST", body: "{}" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY");
  assert.deepEqual(calls, [
    cloudflareBaseUrl + "/api/backend/readiness"
  ]);
});

test("only a registered safe read may fail over from Render to Cloudflare after a gateway failure", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async url => {
      calls.push(url);
      if (url === renderBaseUrl + "/account/role") return jsonResponse({ error: "Render unavailable" }, 503);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/account/role") return jsonResponse({ success: true, role: "customer" });
      throw new Error("Unexpected request: " + url);
    }
  });
  const response = await router.fetch("/account/role", { method: "GET" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    renderBaseUrl + "/account/role",
    cloudflareBaseUrl + "/api/backend/readiness",
    cloudflareBaseUrl + "/account/role"
  ]);
});

test("an unported GET stays on Render after a gateway failure and is not sent to the Worker catch-all", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async url => {
      calls.push(url);
      if (url === renderBaseUrl + "/public/astrologers") return jsonResponse({ error: "Render unavailable" }, 503);
      throw new Error("Unported route must not reach Cloudflare: " + url);
    }
  });
  const response = await router.fetch("/public/astrologers", { method: "GET" });
  assert.equal(response.status, 503);
  assert.deepEqual(calls, [renderBaseUrl + "/public/astrologers"]);
});

test("unknown POST is never replayed after a Render failure", async () => {
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

test("non-Staging hosts preserve the existing Render-only backend", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: false, renderBaseUrl, cloudflareBaseUrl,
    fetchImpl: async url => { calls.push(url); return jsonResponse({ ok: true }); }
  });
  const response = await router.fetch("/wallet", { method: "GET" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [renderBaseUrl + "/wallet"]);
});
