const RETRYABLE_GATEWAY_STATUSES = new Set([502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);

function pathnameOf(path) {
  const raw = String(path || "");
  if (!raw.startsWith("/") || raw.startsWith("//")) {
    throw new TypeError("API path must be an absolute same-origin path.");
  }
  return new URL(raw, "https://smvastro.invalid").pathname;
}

export function classifyStagingBackendRoute(path) {
  const pathname = pathnameOf(path);

  if (/^\/admin\/wallet\/backfill(?:\/|$)/.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "walletBackfill" });
  }
  if (/^\/admin\/wallet(?:\/|$)/.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "walletBackfill" });
  }
  if (pathname === "/wallet/recharge-offers" || /^\/admin\/offers(?:\/|$)/.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "walletOffers" });
  }
  if (/^\/wallet\/recharge(?:\/|$)/.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "walletRecharge" });
  }
  if (pathname === "/wallet" || /^\/wallet\//.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "walletRead" });
  }
  if (pathname === "/test-razorpay") {
    return Object.freeze({ target: "cloudflare-primary", family: "razorpayProbe" });
  }
  if (pathname === "/appointment-booking" ||
      pathname === "/customer/appointments" ||
      /^\/customer\/appointments\//.test(pathname) ||
      pathname === "/astrologer/appointments" ||
      /^\/astrologer\/appointments\//.test(pathname) ||
      pathname === "/astrologer/availability") {
    return Object.freeze({ target: "cloudflare-primary", family: "booking" });
  }
  if (pathname === "/astrologer/change-payout" || pathname === "/admin/payout-change-status") {
    return Object.freeze({ target: "cloudflare-primary", family: "payout" });
  }
  if (pathname === "/admin/android-app/upload") {
    return Object.freeze({ target: "cloudflare-primary", family: "apkRelease" });
  }
  if (/^\/live\/push(?:\/|$)/.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "liveNotifications" });
  }
  if (/^\/live(?:\/|$)/.test(pathname) || /^\/admin\/live(?:\/|$)/.test(pathname) ||
      pathname === "/astrologer/earnings" || pathname === "/astrologer/withdrawal-request" ||
      pathname === "/admin/withdrawals-data" || pathname === "/admin/withdrawal-mark-paid" ||
      /^\/admin\/withdrawal-payout\//.test(pathname)) {
    return Object.freeze({ target: "cloudflare-primary", family: "live" });
  }

  return Object.freeze({ target: "render-primary", family: "ordinary" });
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
  const coreRoutesReady =
    readiness.identityProfileBackfillRoutesRegistered === true &&
    readiness.walletBackfillRoutesRegistered === true;

  switch (family) {
    case "ordinary":
    case "booking":
    case "payout":
    case "apkRelease":
    case "liveNotifications":
      return coreRoutesReady;
    case "walletBackfill":
      return readiness.walletBackfillRoutesRegistered === true &&
        readiness.walletBackfillToolsEnabled === true;
    case "walletRead":
      return readiness.walletReadRoutesEnabled === true;
    case "walletOffers":
      return readiness.walletOfferRoutesEnabled === true;
    case "walletRecharge":
      return readiness.walletRechargeRoutesEnabled === true &&
        readiness.razorpayCredentialsConfigured === true &&
        readiness.razorpayMode === "test";
    case "razorpayProbe":
      return readiness.razorpayCredentialsConfigured === true &&
        readiness.razorpayMode === "test";
    case "live":
      return readiness.liveCallChatRoutesEnabled === true;
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

    const classification = classifyStagingBackendRoute(path);
    if (classification.target === "cloudflare-primary") {
      const readiness = await getReadiness();
      if (!isCloudflareRouteFamilyReady(classification.family, readiness)) {
        throw routeUnavailable(classification.family);
      }
      // No Render fallback for Wallet, payments, payouts, bookings or Live requests.
      return fetchImpl(cloudflareBase + path, init);
    }

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

    // Only idempotent GET/HEAD reads may fail over. Never replay a write.
    try {
      const readiness = await getReadiness();
      if (!isCloudflareRouteFamilyReady("ordinary", readiness)) {
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
