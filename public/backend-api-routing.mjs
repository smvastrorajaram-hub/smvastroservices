const RETRYABLE_GATEWAY_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);

// Only exact method/path pairs with route registrations in the current Worker modules.
// The Render inventory is guard-only; unported legacy handlers stay Render-pinned.
// Wallet, Razorpay, withdrawal and Live handlers remain behind independent readiness gates.
const CLOUDFLARE_LEGACY_ROUTE_LINES = `GET /admin/access
GET /account/role
POST /admin/reject-question
POST /admin/retry-refund
GET /admin/refund-trace/:questionId
POST /customer/sync-refund
POST /admin/sync-refund
GET /admin/withdrawals-data
POST /create-order
POST /verify-payment
GET /astrologer/earnings
POST /astrologer/withdrawal-request
POST /admin/withdrawal-mark-paid
GET /admin/withdrawal-payout/:withdrawalDocId
POST /razorpay/webhook
GET /wallet/recharge-offers
GET /admin/offers
POST /admin/offers/save
POST /admin/offers/delete
GET /public/push-config
GET /wallet
GET /wallet/transactions
POST /wallet/recharge/create-order
POST /wallet/recharge/verify
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
POST /live/sessions/:id/connection`;
export const CLOUDFLARE_LEGACY_ROUTE_PAIRS = Object.freeze(
  CLOUDFLARE_LEGACY_ROUTE_LINES.split("\n").filter(Boolean).map(line => {
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

function isRetainedOutsideCloudflare(pathname) {
  return pathname === "/customer/consultations" ||
    pathname === "/admin/private-consultations-data" ||
    /^\/(?:customer|admin|astrologer)\/private-consultations?(?:\/|$)/.test(pathname) ||
    /^\/private-consultation(?:\/|$)/.test(pathname) ||
    /^\/horoscope(?:-|\/)/.test(pathname) ||
    /^\/admin\/horoscope(?:-|\/|$)/.test(pathname) ||
    /^\/api\/prediction\//.test(pathname) ||
    pathname === "/contact-query" ||
    pathname === "/question-notify" ||
    pathname === "/admin/android-app/upload";
}

function routeFamily(pathname) {
  if (pathname === "/public/push-config") return "publicConfig";
  if (/^\/admin\/wallet\/backfill(?:\/|$)/.test(pathname) || pathname === "/admin/wallet/transactions") {
    return "walletBackfill";
  }
  if (pathname === "/wallet/recharge-offers" || /^\/admin\/offers(?:\/|$)/.test(pathname)) {
    return "walletOffers";
  }
  if (/^\/wallet\/recharge(?:\/|$)/.test(pathname)) return "walletRecharge";
  if (pathname === "/wallet" || pathname === "/wallet/transactions") return "walletRead";
  if (pathname === "/test-razorpay") return "razorpayProbe";
  if (/^\/live\/push(?:\/|$)/.test(pathname)) return "liveNotifications";
  if (/^\/live(?:\/|$)/.test(pathname) || /^\/admin\/live(?:\/|$)/.test(pathname) ||
      pathname === "/astrologer/earnings" || pathname === "/astrologer/withdrawal-request" ||
      pathname === "/admin/withdrawals-data" || pathname === "/admin/withdrawal-mark-paid" ||
      pathname === "/admin/withdrawal-mark-processing" || pathname === "/admin/withdrawal-reject" ||
      /^\/admin\/withdrawal-payout\//.test(pathname)) return "live";
  if (pathname === "/razorpay/webhook" || pathname === "/create-order" || pathname === "/verify-payment" ||
      pathname === "/admin/reject-question" || pathname === "/admin/retry-refund" ||
      pathname === "/customer/sync-refund" || pathname === "/admin/sync-refund" ||
      /^\/admin\/refund-trace\//.test(pathname)) return "legacyPayments";
  if (pathname === "/appointment-booking" || pathname === "/customer/appointments" ||
      /^\/customer\/appointments\//.test(pathname) || pathname === "/astrologer/appointments" ||
      /^\/astrologer\/appointments\//.test(pathname) || pathname === "/astrologer/availability" ||
      pathname === "/admin/appointments" || pathname === "/admin/appointment-status") return "booking";
  return "legacyCore";
}

export function classifyStagingBackendRoute(path, method = "GET") {
  const pathname = pathnameOf(path);
  const verb = String(method || "GET").toUpperCase();
  if (isRetainedOutsideCloudflare(pathname)) {
    return Object.freeze({ target: "render-primary", family: "renderPinned" });
  }
  const matchedRoute = CLOUDFLARE_LEGACY_ROUTE_PAIRS.find(route =>
    (route.method === verb || (verb === "HEAD" && route.method === "GET")) &&
    routePatternMatches(route.path, pathname)
  );
  // Never send an unported Render route to the Worker catch-all, even after a
  // Render 5xx. Only the two verified read-only identity routes may use fallback.
  if (!matchedRoute) return Object.freeze({ target: "render-primary", family: "renderPinned" });
  if ((verb === "GET" || verb === "HEAD") &&
      (matchedRoute.method + " " + matchedRoute.path === "GET /admin/access" ||
       matchedRoute.method + " " + matchedRoute.path === "GET /account/role")) {
    return Object.freeze({ target: "render-primary", family: "coreReadFallback" });
  }
  return Object.freeze({ target: "cloudflare-primary", family: routeFamily(pathname) });
}

export function isSafeReadMethod(method) {
  const value = String(method || "GET").toUpperCase();
  return value === "GET" || value === "HEAD";
}

export function isRetryableRenderReadFailure({ method = "GET", status = null, networkError = false, aborted = false } = {}) {
  if (!isSafeReadMethod(method) || aborted) return false;
  return networkError || RETRYABLE_GATEWAY_STATUSES.has(Number(status));
}

export function isCloudflareRouteFamilyReady(family, readiness) {
  if (!readiness || readiness.ready !== true) return false;
  const firebaseReady = readiness.firebaseConnected === true;
  const coreRoutesReady = firebaseReady &&
    readiness.identityProfileBackfillRoutesRegistered === true &&
    readiness.walletBackfillRoutesRegistered === true;
  const razorpayReady = readiness.razorpayCredentialsConfigured === true &&
    readiness.razorpayProviderConnectionVerified === true &&
    readiness.razorpayMode === "test";

  switch (family) {
    case "publicConfig":
      return true;
    case "legacyCore":
    case "ordinary":
    case "booking":
    case "liveNotifications":
      return coreRoutesReady;
    case "walletBackfill":
      return firebaseReady &&
        readiness.walletBackfillRoutesRegistered === true &&
        readiness.walletBackfillToolsEnabled === true;
    case "walletRead":
      return firebaseReady && readiness.walletReadRoutesEnabled === true;
    case "walletOffers":
      return firebaseReady && readiness.walletOfferRoutesEnabled === true;
    case "walletRecharge":
      return firebaseReady && readiness.walletRechargeRoutesEnabled === true && razorpayReady;
    case "legacyPayments":
      return firebaseReady && readiness.legacyRazorpayRoutesRegistered === true && razorpayReady;
    case "razorpayProbe":
      return razorpayReady;
    case "live":
      return firebaseReady && readiness.liveCallChatRoutesEnabled === true;
    default:
      return false;
  }
}

function routeUnavailable(family) {
  const error = new Error("The Cloudflare Staging " + family + " routes are not enabled and ready yet. The request was not sent to Render.");
  error.name = "BackendRouteUnavailableError";
  error.code = "CLOUDFLARE_ROUTE_NOT_READY";
  error.status = 503;
  return error;
}

export function createBackendApiRouter({
  staging = false,
  renderBaseUrl,
  cloudflareBaseUrl,
  fetchImpl = (...args) => fetch(...args),
  readinessTtlMs = 5000
} = {}) {
  if (!renderBaseUrl || !cloudflareBaseUrl || typeof fetchImpl !== "function") {
    throw new TypeError("Render URL, Cloudflare URL and fetch implementation are required.");
  }

  const renderBase = String(renderBaseUrl).replace(/\/$/, "");
  const cloudflareBase = String(cloudflareBaseUrl).replace(/\/$/, "");
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
      if (!response.ok || payload?.ready !== true) {
        throw new Error("Cloudflare Staging backend readiness check failed.");
      }
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

  async function fetchApi(path, init = {}) {
    pathnameOf(path);
    const method = String(init.method || "GET").toUpperCase();

    if (!staging) return fetchImpl(renderBase + path, init);

    const classification = classifyStagingBackendRoute(path, method);
    if (classification.target === "cloudflare-primary") {
      const readiness = await getReadiness();
      if (!isCloudflareRouteFamilyReady(classification.family, readiness)) {
        throw routeUnavailable(classification.family);
      }
      // No Render fallback for Cloudflare-primary routes. In particular, never replay
      // payments, Wallet mutations, booking or Live session writes to Render.
      return fetchImpl(cloudflareBase + path, init);
    }

    // Retired/externally-owned/unprovisioned routes are pinned to their existing Render
    // or dedicated service. They are never opportunistically redirected to Cloudflare.
    if (classification.family === "renderPinned") return fetchImpl(renderBase + path, init);

    let renderResponse = null;
    let renderError = null;
    try {
      renderResponse = await fetchImpl(renderBase + path, init);
      if (!isRetryableRenderReadFailure({
        method,
        status: renderResponse.status,
        aborted: init.signal?.aborted === true
      })) {
        return renderResponse;
      }
    } catch (error) {
      if (!isRetryableRenderReadFailure({
        method,
        networkError: true,
        aborted: init.signal?.aborted === true
      })) {
        throw error;
      }
      renderError = error;
    }

    // Unknown GET/HEAD reads may fall back only after the legacy core readiness gate.
    try {
      const readiness = await getReadiness();
      if (!isCloudflareRouteFamilyReady("legacyCore", readiness)) {
        if (renderResponse) return renderResponse;
        throw new Error("Cloudflare Staging read routes are not ready.");
      }
      return await fetchImpl(cloudflareBase + path, init);
    } catch (fallbackError) {
      if (renderResponse) return renderResponse;
      throw renderError || fallbackError;
    }
  }

  return Object.freeze({
    fetch: fetchApi,
    getReadiness,
    cloudflareBaseUrl: cloudflareBase,
    renderBaseUrl: renderBase
  });
}
