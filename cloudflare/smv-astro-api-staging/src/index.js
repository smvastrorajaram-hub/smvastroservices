const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8788",
  "http://127.0.0.1:8788",
];
const MAX_PROBE_BODY_BYTES = 2048;

function allowedOrigins(env) {
  const configured = typeof env.CORS_ALLOWED_ORIGINS === "string"
    ? env.CORS_ALLOWED_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean)
    : [];
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function jsonResponse(body, status = 200, origin = null, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Vary": "Origin",
    ...extraHeaders,
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  return new Response(JSON.stringify(body), { status, headers });
}

function errorResponse(code, status, origin = null) {
  return jsonResponse({ ok: false, error: { code } }, status, origin);
}

function constantTimeEqual(left, right) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

async function readLimitedText(request, maxBytes) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) return { tooLarge: true, text: "" };
  if (!request.body) return { tooLarge: false, text: "" };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { tooLarge: true, text: "" };
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch { /* stream already cancelled */ }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { tooLarge: false, text: new TextDecoder().decode(bytes) };
}

function validProbeName(value) {
  return typeof value === "string" && /^[a-z0-9][a-z0-9._-]{0,39}$/i.test(value);
}

async function handleProbe(request, env, origin) {
  const token = env.STAGING_ADMIN_TOKEN;
  if (typeof token !== "string" || token.length < 32) {
    return errorResponse("STAGING_TOKEN_NOT_CONFIGURED", 503, origin);
  }
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return errorResponse("UNAUTHORIZED", 401, origin);
  if (!constantTimeEqual(authorization.slice(7), token)) {
    return errorResponse("UNAUTHORIZED", 401, origin);
  }
  if (!env.DB || typeof env.DB.prepare !== "function") {
    return errorResponse("STAGING_DATABASE_NOT_CONFIGURED", 503, origin);
  }

  const bodyResult = await readLimitedText(request, MAX_PROBE_BODY_BYTES);
  if (bodyResult.tooLarge) return errorResponse("REQUEST_BODY_TOO_LARGE", 413, origin);
  let body;
  try { body = JSON.parse(bodyResult.text); }
  catch { return errorResponse("INVALID_JSON", 400, origin); }
  if (!body || typeof body !== "object" || Array.isArray(body) || !validProbeName(body.probeName)) {
    return errorResponse("INVALID_PROBE_NAME", 400, origin);
  }

  try {
    const id = crypto.randomUUID();
    const createdAt = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO staging_probe_events (id, probe_name, created_at) VALUES (?1, ?2, ?3)",
    ).bind(id, body.probeName, createdAt).run();
    return jsonResponse({ ok: true, environment: "staging", id, probeName: body.probeName }, 201, origin);
  } catch {
    return errorResponse("STAGING_DB_WRITE_FAILED", 503, origin);
  }
}

export default {
  async fetch(request, env) {
    // Fail closed: the scaffold cannot run without an explicit staging marker.
    if (env.APP_ENV !== "staging") return errorResponse("STAGING_ONLY", 503);

    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins(env);
    if (origin && !allowed.has(origin)) return errorResponse("ORIGIN_NOT_ALLOWED", 403);
    const corsOrigin = origin && allowed.has(origin) ? origin : null;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
          "Vary": "Origin",
          ...(corsOrigin ? {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Authorization, Content-Type",
            "Access-Control-Max-Age": "600",
          } : {}),
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname === "/healthz" && request.method === "GET") {
      return jsonResponse({
        ok: true,
        service: "smv-astro-api-staging",
        environment: "staging",
        version: env.STAGING_BUILD_VERSION || "0.1.0",
        productionDataAccess: false,
      }, 200, corsOrigin);
    }

    if (url.pathname === "/api/v1/staging/manifest" && request.method === "GET") {
      return jsonResponse({
        ok: true,
        environment: "staging",
        status: "scaffold-only",
        productionDataAccess: false,
        enabled: ["health", "staging-manifest", "staging-db-check", "authenticated-staging-probe"],
        deliberatelyDisabled: [
          "firebase-auth", "wallet", "razorpay", "live-call", "live-chat",
          "horoscope-calculation", "pdf-rendering",
        ],
      }, 200, corsOrigin);
    }

    if (url.pathname === "/api/v1/staging/db-check" && request.method === "GET") {
      if (!env.DB || typeof env.DB.prepare !== "function") {
        return errorResponse("STAGING_DATABASE_NOT_CONFIGURED", 503, corsOrigin);
      }
      try {
        const row = await env.DB.prepare("SELECT 1 AS alive").first();
        if (!row || Number(row.alive) !== 1) return errorResponse("STAGING_DATABASE_CHECK_FAILED", 503, corsOrigin);
        return jsonResponse({ ok: true, environment: "staging", database: "reachable" }, 200, corsOrigin);
      } catch {
        return errorResponse("STAGING_DATABASE_CHECK_FAILED", 503, corsOrigin);
      }
    }

    if (url.pathname === "/api/v1/staging/probe" && request.method === "POST") {
      return handleProbe(request, env, corsOrigin);
    }
    if (url.pathname === "/api/v1/staging/probe") {
      return errorResponse("METHOD_NOT_ALLOWED", 405, corsOrigin);
    }
    return errorResponse("NOT_FOUND", 404, corsOrigin);
  },
};
