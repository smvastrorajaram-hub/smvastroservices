'use strict';

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8' });
const ALLOWED_METHODS = 'GET, POST, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type, Idempotency-Key';
const SERVICE_NAME = 'smvastro-wallet-api';

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, 'Cache-Control': 'no-store', ...headers }
  });
}

function configuredOrigins(raw) {
  return new Set(String(raw || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        const parsed = new URL(value);
        if (parsed.origin !== value.replace(/\/$/, '')) return '';
        return parsed.origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean));
}

function corsDecision(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin) return { allowed: true, headers: {} };

  if (!configuredOrigins(env.ALLOWED_ORIGINS).has(origin)) {
    return { allowed: false, headers: {} };
  }

  return {
    allowed: true,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': ALLOWED_METHODS,
      'Access-Control-Allow-Headers': ALLOWED_HEADERS,
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    }
  };
}

async function schemaReadiness(env) {
  if (!env.DB || typeof env.DB.prepare !== 'function') {
    return {
      status: 503,
      body: {
        ok: false,
        service: SERVICE_NAME,
        ready: false,
        checks: { d1Binding: false, schema: false },
        walletDomainActive: false,
        businessRoutesEnabled: false
      }
    };
  }

  try {
    const row = await env.DB.prepare(
      'SELECT schema_version FROM smv_wallet_schema_meta WHERE id = ? LIMIT 1'
    ).bind('primary').first();

    if (!row || typeof row.schema_version !== 'string' || !row.schema_version) {
      return {
        status: 503,
        body: {
          ok: false,
          service: SERVICE_NAME,
          ready: false,
          checks: { d1Binding: true, schema: false },
          walletDomainActive: false,
          businessRoutesEnabled: false
        }
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        service: SERVICE_NAME,
        ready: true,
        schemaVersion: row.schema_version,
        checks: { d1Binding: true, schema: true },
        walletDomainActive: false,
        businessRoutesEnabled: false
      }
    };
  } catch {
    // Never expose D1 statements, database metadata, or internal errors in HTTP responses.
    return {
      status: 503,
      body: {
        ok: false,
        service: SERVICE_NAME,
        ready: false,
        checks: { d1Binding: true, schema: false },
        walletDomainActive: false,
        businessRoutesEnabled: false
      }
    };
  }
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const cors = corsDecision(request, env);

  if (!cors.allowed) {
    return jsonResponse(403, { ok: false, error: 'Origin is not allowed.' });
  }
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers });
  }

  if (url.pathname === '/healthz') {
    if (method !== 'GET') {
      return jsonResponse(405, { ok: false, error: 'Method not allowed.' }, {
        Allow: 'GET, OPTIONS',
        ...cors.headers
      });
    }
    return jsonResponse(200, {
      ok: true,
      service: SERVICE_NAME,
      runtime: 'cloudflare-workers',
      walletDomainActive: false,
      businessRoutesEnabled: false
    }, cors.headers);
  }

  if (url.pathname === '/api/wallet/v1/readiness') {
    if (method !== 'GET') {
      return jsonResponse(405, { ok: false, error: 'Method not allowed.' }, {
        Allow: 'GET, OPTIONS',
        ...cors.headers
      });
    }
    const result = await schemaReadiness(env);
    return jsonResponse(result.status, result.body, cors.headers);
  }

  if (url.pathname.startsWith('/api/wallet/v1/')) {
    // Deliberately fail closed. No financial route is implemented or enabled in this
    // infrastructure-only phase. Later phases must add verified Firebase identity,
    // profile/role checks, idempotency and atomic settlement before cutover.
    return jsonResponse(503, {
      ok: false,
      code: 'WALLET_DOMAIN_NOT_CUT_OVER',
      error: 'Wallet and live-session routes are disabled until migration, reconciliation, security tests, and an explicit cutover review are complete.'
    }, cors.headers);
  }

  return jsonResponse(404, { ok: false, error: 'Not found.' }, cors.headers);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
