const RETRYABLE_GATEWAY_STATUSES = new Set([408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);

// Exact method/path pairs are cross-checked against real Cloudflare Worker registrations.
// Unported legacy endpoints remain Render-pinned or are explicitly disabled on Staging.
const CLOUDFLARE_LEGACY_ROUTE_LINES = \`GET /admin/access
GET /account/role
GET /admin/withdrawals-data
GET /astrologer/earnings
POST /astrologer/withdrawal-request
POST /admin/withdrawal-mark-paid
GET /admin/withdrawal-payout/:withdrawalDocId
GET /wallet/recharge-offers
GET /admin/offers
POST /admin/offers/save
POST /admin/offers/delete
GET /public/push-config
GET /wallet
GET /wallet/transactions
POST /wallet/recharge/create-order
POST /wallet/recharge/verify
POST /wallet/recharge/webhook
GET /admin/wallet/backfill/status
POST /admin/wallet/backfill/preflight
POST /admin/wallet/backfill/preview
POST /admin/wallet/backfill/apply
POST /admin/wallet/backfill/reconcile
GET /live/pricing
GET /live/ice-config
POST /admin/live/pricing
POST /admin/live/commission
GET /live/events
POST /live/requests
GET /live/sessions
GET /live/bookings/pending
GET /live/bookings/mine
POST /live/bookings/:id/accept
POST /live/bookings/:id/reject
POST /live/bookings/:id/cancel
POST /live/sessions/:id/accept
POST /live/sessions/:id/reject
POST /live/sessions/:id/end
POST /live/sessions/:id/ready
POST /live/sessions/:id/signal
GET /live/sessions/:id/signals
POST /live/sessions/:id/messages
GET /live/sessions/:id/messages
POST /admin/withdrawal-mark-processing
POST /admin/withdrawal-reject
POST /live/sessions/:id/connection\`;
export const CLOUDFLARE_LEGACY_ROUTE_PAIRS = Object.freeze(
  CLOUDFLARE_LEGACY_ROUTE_LINES.split("\\n").filter(Boolean).map(line => {
    const separator = line.indexOf(" ");
    return Object.freeze({ method: line.slice(0, separator), path: line.slice(separator + 1) });
  })
);

function pathnameOf(path) {
  const raw = String(path || "");
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    throw new TypeError("API path must be an absolute same-origin path.");
  }
  return new URL(raw, "https://smvastro.invalid").pathname;
}

function routePatternMatches(pattern, pathname) {
  const expected = pattern.split("/").filter(Boolean);
  const actual = pathname.split("/").filter(Boolean);
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) =>
    segment.startsWith(":") ? actual[index].length > 0 : segment === actual[index]
  );
}

const STAGING_DISABLED_EXACT_PATHS = new Set([
  "/submit-answer",
  "/astrologer/edit-answer",
  "/astrologer/edit-answer",
  "/question-notify",
  "/admin/approve-question",
  "/astrologer/claim-question",
  "/admin/reject-question",
  "/admin/retry-refund",
  "/customer/sync-refund",
  "/admin/sync-refund",
  "/admin/reallocate-question",
  "/admin/edit-question",
  "/admin/takeover-answer",
  "/customer/mark-answer-viewed",
  "/admin/questions-data",
  "/astrologer/open-questions",
  "/create-order",
  "/verify-payment",
  "/razorpay/webhook",
  "/customer/consultations",
  "/customer/private-consultations",
  "/admin/private-consultations-data",
  "/astrologer/private-consultations",
  "/public/android-app",
  "/admin/android-app",
  "/admin/android-app/upload"
]);

export function isStagingDisabledPath(path) {
  const pathname = pathnameOf(path);
  return STAGING_DISABLED_EXACT_PATHS.has(pathname) ||
    /^\\/admin\\/refund-trace(?:\\/|$)/.test(pathname) ||
    /^\\/admin\\/private-consultation(?:\\/|$)/.test(pathname) ||
    /^\\/astrologer\\/private-consultation(?:\\/|$)/.test(pathname) ||
    /^\\/private-consultation(?:\\/|$)/.test(pathname);
}

function isRetainedOutsideCloudflare(pathname) {
  return /^\\/horoscope(?:-|\\/)/.test(pathname) ||
    /^\\/admin\\/horoscope(?:-|\\/|$)/.test(pathname) ||
    /^\\/horoscope-payment(?:\\/|$)/.test(pathname) ||
    /^\\/api\\/prediction\\//.test(pathname) ||
    pathname === "/contact-query" ||
    pathname === "/question-notify";
}

function routeFamily(pathname) {
  if (pathname === "/public/push-config") return "publicConfig";
  if (/^\\/admin\\/wallet\\/backfill(?:\\/|$)/.test(pathname) || pathname === "/admin/wallet/transactions") {
    return "walletBackfill";
  }
  if (pathname === "/wallet/recharge-offers" || /^\\/admin\\/offers(?:\\/|$)/.test(pathname)) {
    return "walletOffers";
  }
  if (/^\\/wallet\\/recharge(?:\\/|$)/.test(pathname)) return "walletRecharge";
  if (pathname === "/wallet" || pathname === "/wallet/transactions") return "walletRead";
  if (/^\\/live(?:\\/|$)/.test(pathname) || /^\\/admin\\/live(?:\\/|$)/.test(pathname) ||
      pathname === "/astrologer/earnings" || pathname === "/astrologer/withdrawal-request" ||
      pathname === "/admin/withdrawals-data" || pathname === "/admin/withdrawal-mark-paid" ||
      pathname === "/admin/withdrawal-mark-processing" || pathname === "/admin/withdrawal-reject" ||
      /^\\/admin\\/withdrawal-payout\\//.test(pathname)) return "live";
  return "coreRead";
}

function matchesRegisteredRoute(pathname, method) {
  const verb = String(method || "GET").toUpperCase();
  return CLOUDFLARE_LEGACY_ROUTE_PAIRS.find(route =>
    (route.method === verb || (verb === "HEAD" && route.method === "GET")) &&
    routePatternMatches(route.path, pathname)
  ) || null;
}

export function classifyStagingBackendRoute(path, method = "GET") {
  const pathname = pathnameOf(path);
  const verb = String(method || "GET").toUpperCase();
  if (isStagingDisabledPath(pathname)) {
    return Object.freeze({ target: "disabled", family: "stagingDisabled" });
  }
  if (isRetainedOutsideCloudflare(pathname)) {
    return Object.freeze({ target: "render-primary", family: "renderPinned" });
  }
  const matchedRoute = matchesRegisteredRoute(pathname, verb);
  if (!matchedRoute) {
    return Object.freeze({ target: "render-primary", family: "renderPinned" });
  }

  const exact = matchedRoute.method + " " + matchedRoute.path;
  if (exact === "GET /admin/access" || exact === "GET /account/role" ||
      exact === "GET /public/push-config") {
    return Object.freeze({ target: "render-primary", family: "renderRead" });
  }
  return Object.freeze({
    target: "cloudflare-primary",
    family: routeFamily(pathname)
  });
}

export function isSafeReadMethod(method) {
  const value = String(method || "GET").toUpperCase();
  return value === "GET" || value === "HEAD";
}

export function isRetryableGatewayFailure({ method = "GET", status = null, networkError = false, aborted = false } = {}) {
  if (!isSafeReadMethod(method) || aborted) return false;
  return networkError || RETRYABLE_GATEWAY_STATUSES.has(Number(status));
}

export function isCloudflareRouteFamilyReady(family, readiness) {
  if (!readiness || readiness.ready !== true) return false;
  const firebaseReady = readiness.firebaseConnected === true;
  const razorpayReady = readiness.razorpayCredentialsConfigured === true &&
    readiness.razorpayProviderConnectionVerified === true &&
    readiness.razorpayMode === "test";

  switch (family) {
    case "publicConfig":
      return true;
    case "coreRead":
    case "renderRead":
      return firebaseReady && readiness.identityProfileBackfillRoutesRegistered === true;
    case "walletBackfill":
      return firebaseReady &&
        readiness.walletBackfillRoutesRegistered === true &&
        readiness.walletBackfillToolsEnabled === true;
    case "walletRead":
      return firebaseReady && readiness.walletReadRoutesEnabled === true;
    case "walletOffers":
      return readiness.walletOfferRoutesEnabled === true;
    case "walletRecharge":
      return firebaseReady && readiness.walletRechargeRoutesEnabled === true && razorpayReady;
    case "live":
      return firebaseReady && readiness.liveCallChatRoutesEnabled === true;
    default:
      return false;
  }
}

function routeUnavailable(family) {
  return new Response(JSON.stringify({
    success: false,
    code: "CLOUDFLARE_ROUTE_NOT_READY",
    error: "The Cloudflare Staging " + family + " route is not ready. The request has not been sent to Cloudflare."
  }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function disabledResponse() {
  return new Response(JSON.stringify({
    success: false,
    code: "STAGING_FEATURE_DISABLED",
    error: "This legacy consultation, question-payment, or Android APK flow is disabled on Staging."
  }), {
    status: 410,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

export function createBackendApiRouter({
  staging = false,
  renderBaseUrl,
  cloudflareBaseUrl,
  fetchImpl = (...args) => fetch(...args),
  readinessTtlMs = 3000
} = {}) {
  if (!renderBaseUrl || !cloudflareBaseUrl || typeof fetchImpl !== "function") {
    throw new TypeError("Render URL, Cloudflare URL and fetch implementation are required.");
  }

  const renderBase = String(renderBaseUrl).replace(/\\/$/, "");
  const cloudflareBase = String(cloudflareBaseUrl).replace(/\\/$/, "");
  let readinessValue = null;
  let readinessExpiresAt = 0;
  let readinessInFlight = null;

  async function getReadiness() {
    if (readinessValue && Date.now() < readinessExpiresAt) return readinessValue;
    if (readinessInFlight) return readinessInFlight;
    readinessInFlight = (async () => {
      const response = await fetchImpl(cloudflareBase + "/api/backend/readiness", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok || payload?.ready !== true) throw new Error("Cloudflare Staging readiness check failed.");
      readinessValue = payload;
      readinessExpiresAt = Date.now() + Math.max(0, Number(readinessTtlMs) || 0);
      return payload;
    })();
    try {
      return await readinessInFlight;
    } finally {
      readinessInFlight = null;
    }
  }

  async function renderSecondary(path, init, originalResponse = null, originalError = null) {
    try {
      return await fetchImpl(renderBase + path, init);
    } catch (secondaryError) {
      if (originalResponse) return originalResponse;
      throw originalError || secondaryError;
    }
  }

  async function cloudflareSecondaryRead(path, init, family, renderResponse = null, renderError = null) {
    const method = String(init.method || "GET").toUpperCase();
    if (!isSafeReadMethod(method) || init.signal?.aborted === true) {
      if (renderResponse) return renderResponse;
      throw renderError || new Error("The Render read request was aborted.");
    }
    try {
      const readiness = await getReadiness();
      if (!isCloudflareRouteFamilyReady(family, readiness)) {
        if (renderResponse) return renderResponse;
        throw new Error("Cloudflare Staging read routes are not ready.");
      }
      const response = await fetchImpl(cloudflareBase + path, init);
      if (!isRetryableGatewayFailure({ method, status: response.status, aborted: init.signal?.aborted === true })) {
        return response;
      }
      if (renderResponse) return renderResponse;
      throw renderError || new Error("Cloudflare secondary read failed.");
    } catch (error) {
      if (renderResponse) return renderResponse;
      throw renderError || error;
    }
  }

  async function cloudflarePrimary(path, init, family) {
    const method = String(init.method || "GET").toUpperCase();
    let readiness;
    try {
      readiness = await getReadiness();
    } catch (_error) {
      if (family === "walletBackfill") return routeUnavailable(family);
      // Nothing has been sent to Cloudflare yet. Render is the safe secondary,
      // including for mutations, because there is no ambiguous payment/session outcome.
      return renderSecondary(path, init);
    }

    if (!isCloudflareRouteFamilyReady(family, readiness)) {
      if (family === "walletBackfill") return routeUnavailable(family);
      return renderSecondary(path, init);
    }

    // Once a mutation reaches Cloudflare, never replay it to Render: a timeout or
    // gateway error could happen after D1/payment/session state has committed.
    let response;
    try {
      response = await fetchImpl(cloudflareBase + path, init);
    } catch (error) {
      if (isSafeReadMethod(method) && init.signal?.aborted !== true) {
        return renderSecondary(path, init, null, error);
      }
      throw error;
    }

    if (isRetryableGatewayFailure({ method, status: response.status, aborted: init.signal?.aborted === true })) {
      if (isSafeReadMethod(method)) return renderSecondary(path, init, response);
    }
    return response;
  }

  async function fetchApi(path, init = {}) {
    const pathname = pathnameOf(path);
    const method = String(init.method || "GET").toUpperCase();
    if (!staging) return fetchImpl(renderBase + path, init);

    const classification = classifyStagingBackendRoute(pathname, method);
    if (classification.target === "disabled") return disabledResponse();
    if (classification.target === "cloudflare-primary") {
      return cloudflarePrimary(path, init, classification.family);
    }
    if (classification.family === "renderPinned") return fetchImpl(renderBase + path, init);

    // Ordinary/core reads are Render-primary; only explicitly registered GET/HEAD
    // routes may use Cloudflare as a secondary.
    let renderResponse;
    try {
      renderResponse = await fetchImpl(renderBase + path, init);
    } catch (error) {
      if (!isRetryableGatewayFailure({ method, networkError: true, aborted: init.signal?.aborted === true })) throw error;
      return cloudflareSecondaryRead(path, init, classification.family, null, error);
    }
    if (!isRetryableGatewayFailure({ method, status: renderResponse.status, aborted: init.signal?.aborted === true })) {
      return renderResponse;
    }
    return cloudflareSecondaryRead(path, init, classification.family, renderResponse);
  }

  return Object.freeze({
    fetch: fetchApi,
    getReadiness,
    cloudflareBaseUrl: cloudflareBase,
    renderBaseUrl: renderBase
  });
}
