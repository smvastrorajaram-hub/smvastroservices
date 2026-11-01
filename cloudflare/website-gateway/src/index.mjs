const RETRYABLE_ORIGIN_STATUSES = new Set([408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 525, 526, 527, 530]);
const STAGING_RENDER_ORIGIN = "https://smv-astro-phase1-browser-staging-v2.onrender.com";

function validatedOrigin(env) {
  const configured = String(env?.RENDER_WEBSITE_ORIGIN || STAGING_RENDER_ORIGIN).trim();
  const parsed = new URL(configured);
  if (parsed.protocol !== "https:" || parsed.origin !== STAGING_RENDER_ORIGIN ||
      parsed.pathname !== "/" || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error("The Staging website origin is invalid or not allowlisted.");
  }
  return parsed.origin;
}

async function rewriteStagingHtml(response, publicOrigin, HTMLRewriterImpl = globalThis.HTMLRewriter) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.body || !/text\/html(?:;|$)/i.test(contentType) || typeof HTMLRewriterImpl !== "function") {
    return response;
  }
  return await new HTMLRewriterImpl()
    .on('link[rel="canonical"]', {
      element(element) { element.setAttribute("href", publicOrigin + "/"); }
    })
    .on('meta[property="og:url"]', {
      element(element) { element.setAttribute("content", publicOrigin + "/"); }
    })
    .on("#smvPermanentAndroidAppSection", {
      element(element) { element.remove(); }
    })
    .on("#adminGroupAppManagement", {
      element(element) { element.remove(); }
    })
    .on("#askNowHeading", {
      element(element) { element.setInnerContent("Live Call & Chat Booking"); }
    })
    .on("#askNowButton .asknow-label", {
      element(element) { element.setInnerContent("VIEW CALL & CHAT OPTIONS"); }
    })
    .on('a[data-smv-route="private-consultation"]', {
      element(element) {
        element.setAttribute("aria-label", "Live Call and Chat");
        element.setInnerContent("Live Call & Chat");
      }
    })
    .transform(response);
}

function withSource(response, source, extraHeaders = {}) {
  const headers = new Headers(response.headers);
  headers.set("X-SMV-Website-Source", source);
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, String(value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function unavailable(status = 503, code = "WEBSITE_FALLBACK_UNAVAILABLE") {
  return new Response(JSON.stringify({
    success: false, code,
    error: "The Staging website origin is unavailable and the Cloudflare static snapshot could not be served."
  }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-SMV-Website-Source": "gateway-error" }
  });
}

async function serveStaticSnapshot(request, env, originStatus, HTMLRewriterImpl) {
  if (!env?.ASSETS || typeof env.ASSETS.fetch !== "function") {
    return unavailable(503, "WEBSITE_STATIC_ASSETS_NOT_BOUND");
  }
  try {
    const method = request.method.toUpperCase();
    const assetRequest = new Request(request.url, { method, headers: request.headers, redirect: "manual" });
    const response = await env.ASSETS.fetch(assetRequest);
    const rewritten = await rewriteStagingHtml(response, new URL(request.url).origin, HTMLRewriterImpl);
    return withSource(rewritten, "cloudflare-static-fallback", {
      "X-SMV-Website-Origin-Status": originStatus || "network-error"
    });
  } catch (_error) {
    return unavailable();
  }
}

export async function handleWebsiteRequest(request, env, fetchImpl = globalThis.fetch, HTMLRewriterImpl = globalThis.HTMLRewriter) {
  if (!request || typeof request.url !== "string" || typeof fetchImpl !== "function") {
    throw new TypeError("A Fetch Request and upstream fetch implementation are required.");
  }
  const method = String(request.method || "GET").toUpperCase();
  const requestUrl = new URL(request.url);

  if (requestUrl.pathname === "/__smv_gateway_health" && (method === "GET" || method === "HEAD")) {
    return new Response(JSON.stringify({
      success: true,
      service: "smvastro-website-staging",
      renderOriginConfigured: true,
      staticAssetsBound: !!env?.ASSETS,
      productionTrafficEnabled: false
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-SMV-Website-Source": "cloudflare-gateway" }
    });
  }

  if (method !== "GET" && method !== "HEAD") {
    // Mutations are proxied to Render only. They are never retried against static assets.
    try {
      const origin = validatedOrigin(env);
      const target = new URL(requestUrl.pathname + requestUrl.search, origin);
      const upstream = await fetchImpl(new Request(target, request));
      return withSource(upstream, "render");
    } catch (_error) {
      return unavailable(502, "RENDER_ORIGIN_UNAVAILABLE");
    }
  }

  let originStatus = "network-error";
  try {
    const origin = validatedOrigin(env);
    const target = new URL(requestUrl.pathname + requestUrl.search, origin);
    const originRequest = new Request(target, { method, headers: request.headers, redirect: "manual" });
    const upstream = await fetchImpl(originRequest);
    originStatus = upstream.status;
    if (!RETRYABLE_ORIGIN_STATUSES.has(upstream.status)) {
      const rewritten = await rewriteStagingHtml(upstream, requestUrl.origin, HTMLRewriterImpl);
      return withSource(rewritten, "render");
    }
  } catch (_error) {
    // An origin outage or Render build/deploy failure falls through to the last
    // successfully deployed Cloudflare static snapshot. Only GET and HEAD qualify.
  }
  return serveStaticSnapshot(request, env, originStatus, HTMLRewriterImpl);
}

export default { fetch(request, env) { return handleWebsiteRequest(request, env); } };
