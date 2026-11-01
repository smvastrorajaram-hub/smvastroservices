import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyStagingBackendRoute,
  createBackendApiRouter,
  isCloudflareRouteFamilyReady,
  isRetryableRenderReadFailure
} from "../public/backend-api-routing.mjs";

const renderBaseUrl = "https://render-staging.example";
const cloudflareBaseUrl = "https://smvastro-backend-api-staging.astroservices.workers.dev";

const ready = Object.freeze({
  ready: true,
  identityProfileBackfillRoutesRegistered: true,
  walletBackfillRoutesRegistered: true,
  walletBackfillToolsEnabled: true,
  walletReadRoutesEnabled: true,
  walletRechargeRoutesEnabled: true,
  walletOfferRoutesEnabled: true,
  razorpayCredentialsConfigured: true,
  razorpayMode: "test",
  liveCallChatRoutesEnabled: true
});

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

test("classifies Wallet, Razorpay probe, booking, payout, APK and Live routes as Cloudflare-primary", () => {
  const cases = [
    ["/wallet", "walletRead"],
    ["/wallet/transactions?limit=10", "walletRead"],
    ["/wallet/recharge/create-order", "walletRecharge"],
    ["/wallet/recharge/verify", "walletRecharge"],
    ["/wallet/recharge-offers", "walletOffers"],
    ["/admin/offers/save", "walletOffers"],
    ["/admin/wallet/backfill/preview", "walletBackfill"],
    ["/admin/wallet/transactions", "walletBackfill"],
    ["/test-razorpay", "razorpayProbe"],
    ["/appointment-booking", "booking"],
    ["/customer/appointments", "booking"],
    ["/astrologer/appointments/booking-1/respond", "booking"],
    ["/astrologer/availability", "booking"],
    ["/astrologer/change-payout", "payout"],
    ["/admin/payout-change-status", "payout"],
    ["/admin/android-app/upload", "apkRelease"],
    ["/live/push/register", "liveNotifications"],
    ["/live/sessions/session-1/accept", "live"],
    ["/astrologer/withdrawal-request", "live"],
    ["/admin/withdrawals-data", "live"]
  ];

  for (const [path, family] of cases) {
    assert.deepEqual(classifyStagingBackendRoute(path), {
      target: "cloudflare-primary",
      family
    }, path);
  }
});

test("keeps ordinary non-financial endpoints Render-primary", () => {
  for (const path of [
    "/public/astrologers",
    "/public/content",
    "/admin-data",
    "/lookup-id-login",
    "/register-customer-profile",
    "/register-astrologer-profile",
    "/contact-query",
    "/submit-answer",
    "/api-version"
  ]) {
    assert.deepEqual(classifyStagingBackendRoute(path), {
      target: "render-primary",
      family: "ordinary"
    }, path);
  }
});

test("allows failover only for GET/HEAD network or gateway failures", () => {
  assert.equal(isRetryableRenderReadFailure({ method: "GET", networkError: true }), true);
  assert.equal(isRetryableRenderReadFailure({ method: "HEAD", status: 503 }), true);
  for (const status of [400, 401, 403, 404, 409, 422]) {
    assert.equal(isRetryableRenderReadFailure({ method: "GET", status }), false);
  }
  assert.equal(isRetryableRenderReadFailure({ method: "POST", networkError: true }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "PUT", status: 503 }), false);
  assert.equal(isRetryableRenderReadFailure({ method: "GET", status: 503, aborted: true }), false);
});

test("readiness gates keep Wallet, Razorpay and Live fail-closed", () => {
  assert.equal(isCloudflareRouteFamilyReady("ordinary", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("booking", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("walletRead", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("walletOffers", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("walletBackfill", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("live", ready), true);
  assert.equal(isCloudflareRouteFamilyReady("razorpayProbe", ready), true);

  assert.equal(isCloudflareRouteFamilyReady("walletRead", { ...ready, walletReadRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletRecharge", { ...ready, razorpayCredentialsConfigured: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("walletOffers", { ...ready, walletOfferRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("live", { ...ready, liveCallChatRoutesEnabled: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("ordinary", { ...ready, ready: false }), false);
  assert.equal(isCloudflareRouteFamilyReady("booking", { ...ready, identityProfileBackfillRoutesRegistered: false }), false);
});

test("ordinary GET fails over from Render 503 to Cloudflare only after readiness succeeds", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      if (url === renderBaseUrl + "/public/astrologers") return jsonResponse({ error: "Render unavailable" }, 503);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/public/astrologers") return jsonResponse({ success: true, astrologers: [] });
      throw new Error("Unexpected request: " + url);
    }
  });

  const response = await router.fetch("/public/astrologers", { method: "GET" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls.map(call => call.url), [
    renderBaseUrl + "/public/astrologers",
    cloudflareBaseUrl + "/api/backend/readiness",
    cloudflareBaseUrl + "/public/astrologers"
  ]);
});

test("ordinary POST is never replayed to Cloudflare after a Render failure", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push({ url, method: init.method || "GET" });
      return jsonResponse({ error: "Render unavailable" }, 503);
    }
  });

  const response = await router.fetch("/admin/dashboard-touch", { method: "POST", body: "{}" });
  assert.equal(response.status, 503);
  assert.deepEqual(calls, [{ url: renderBaseUrl + "/admin/dashboard-touch", method: "POST" }]);
});

test("Cloudflare-primary Wallet requests never fall back to Render while the feature gate is off", async () => {
  const calls = [];
  const disabled = { ...ready, walletRechargeRoutesEnabled: false };
  const router = createBackendApiRouter({
    staging: true,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(disabled);
      throw new Error("A disabled route must not be called.");
    }
  });

  await assert.rejects(
    router.fetch("/wallet/recharge/create-order", { method: "POST", body: "{}" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY" && error.status === 503
  );
  assert.deepEqual(calls, [cloudflareBaseUrl + "/api/backend/readiness"]);
});

test("Cloudflare-primary requests use Cloudflare only after their specific readiness gate is true", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url, init = {}) => {
      calls.push(url);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") return jsonResponse(ready);
      if (url === cloudflareBaseUrl + "/wallet/recharge/verify") return jsonResponse({ success: true });
      throw new Error("Unexpected request: " + url);
    }
  });

  const response = await router.fetch("/wallet/recharge/verify", { method: "POST", body: "{}" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [
    cloudflareBaseUrl + "/api/backend/readiness",
    cloudflareBaseUrl + "/wallet/recharge/verify"
  ]);
});

test("Live sessions fail closed and are never sent to Render before the Live gate is enabled", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: true,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url === cloudflareBaseUrl + "/api/backend/readiness") {
        return jsonResponse({ ...ready, liveCallChatRoutesEnabled: false });
      }
      throw new Error("Live request should be gated before dispatch.");
    }
  });

  await assert.rejects(
    router.fetch("/live/sessions", { method: "GET" }),
    error => error.code === "CLOUDFLARE_ROUTE_NOT_READY"
  );
  assert.deepEqual(calls, [cloudflareBaseUrl + "/api/backend/readiness"]);
});

test("non-Staging hosts preserve the existing Render-only backend", async () => {
  const calls = [];
  const router = createBackendApiRouter({
    staging: false,
    renderBaseUrl,
    cloudflareBaseUrl,
    fetchImpl: async (url) => {
      calls.push(url);
      return jsonResponse({ ok: true });
    }
  });

  const response = await router.fetch("/wallet", { method: "GET" });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [renderBaseUrl + "/wallet"]);
});
