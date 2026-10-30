'use strict';

const JSON_HEADERS = Object.freeze({ 'Content-Type': 'application/json; charset=utf-8' });
const ALLOWED_METHODS = 'GET, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';
const MAX_SEARCH_LENGTH = 100;
const MAX_ROWS = 70;
const SEARCH_CACHE_SECONDS = 4 * 60 * 60;
const TIMEZONE_CACHE_SECONDS = 14 * 24 * 60 * 60;

function jsonResponse(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers }
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

  const allowed = configuredOrigins(env.ALLOWED_ORIGINS);
  if (!allowed.has(origin)) return { allowed: false, headers: {} };

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

function validCoordinates(latitude, longitude) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90
    && longitude >= -180 && longitude <= 180;
}

function createCacheKey(request) {
  const url = new URL(request.url);
  // Cache keys deliberately contain only public request inputs. The GeoNames
  // account name is never added to the request URL or cache key.
  return new Request(url.toString(), { method: 'GET' });
}

async function cachedJson(request, env, ctx, ttlSeconds, loader, cacheOverride) {
  const cache = cacheOverride || globalThis.caches?.default;
  const key = createCacheKey(request);

  if (cache && typeof cache.match === 'function') {
    try {
      const hit = await cache.match(key);
      if (hit) return hit;
    } catch {
      // Cache failure must not make the location provider unavailable.
    }
  }

  const result = await loader();
  const response = jsonResponse(200, result.body, {
    'Cache-Control': `public, max-age=120, s-maxage=${ttlSeconds}`
  });

  if (cache && typeof cache.put === 'function') {
    const write = Promise.resolve().then(() => cache.put(key, response.clone())).catch(() => {});
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(write);
    else await write;
  }
  return response;
}

async function geonamesJson(endpoint, params, username, fetchImpl) {
  const upstreamUrl = new URL(`https://secure.geonames.org/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    upstreamUrl.searchParams.set(key, String(value));
  }
  upstreamUrl.searchParams.set('username', username);

  const response = await fetchImpl(upstreamUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(8500)
  });
  if (!response.ok) throw new Error(`GeoNames HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.status) throw new Error('GeoNames upstream rejected request');
  return payload;
}

function addHeaders(response, headers) {
  if (!Object.keys(headers).length) return response;
  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === 'vary' && merged.has('Vary')) {
      const current = merged.get('Vary');
      if (!current.split(',').map(x => x.trim().toLowerCase()).includes(value.toLowerCase())) {
        merged.set('Vary', `${current}, ${value}`);
      }
    } else {
      merged.set(key, value);
    }
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
}

export async function handleRequest(request, env = {}, ctx = {}, dependencies = {}) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const cors = corsDecision(request, env);

  if (!cors.allowed) {
    return jsonResponse(403, { ok: false, error: 'Origin is not allowed.' });
  }
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors.headers });
  }
  if (method !== 'GET') {
    return jsonResponse(405, { ok: false, error: 'Method not allowed.' }, { Allow: ALLOWED_METHODS, ...cors.headers });
  }

  if (url.pathname === '/healthz') {
    return jsonResponse(200, {
      ok: true,
      service: 'smvastro-cloudflare-api',
      runtime: 'cloudflare-workers'
    }, { 'Cache-Control': 'no-store', ...cors.headers });
  }

  const isLocationRoute = [
    '/api/locations/status',
    '/api/locations/search',
    '/api/locations/timezone'
  ].includes(url.pathname);
  if (!isLocationRoute) {
    return jsonResponse(404, { ok: false, error: 'Not found.' }, cors.headers);
  }

  const username = String(env.GEONAMES_USERNAME || '').trim();
  const configured = !!username && username.toLowerCase() !== 'demo';
  if (url.pathname === '/api/locations/status') {
    return jsonResponse(200, {
      ok: true,
      configured,
      provider: 'GeoNames',
      timezone: 'timezoneJSON'
    }, { 'Cache-Control': 'no-store', ...cors.headers });
  }

  if (!configured) {
    return jsonResponse(503, {
      ok: false,
      error: 'GeoNames backend is not configured: set GEONAMES_USERNAME in Cloudflare Worker secrets.',
      configured: false
    }, cors.headers);
  }

  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const cache = dependencies.cache;

  if (url.pathname === '/api/locations/search') {
    const query = String(url.searchParams.get('q') || '').trim();
    const numericLimit = Math.trunc(Number(url.searchParams.get('limit')));
    const limit = Math.max(1, Math.min(MAX_ROWS, numericLimit || MAX_ROWS));
    const language = url.searchParams.get('lang') === 'ta' ? 'ta' : 'en';

    if (query.length < 2 || query.length > MAX_SEARCH_LENGTH || /[\u0000-\u001f]/.test(query)) {
      return jsonResponse(400, { ok: false, error: 'Search requires 2–100 characters.' }, cors.headers);
    }

    try {
      const response = await cachedJson(request, env, ctx, SEARCH_CACHE_SECONDS, async () => {
        const payload = await geonamesJson('searchJSON', {
          name: query,
          name_startsWith: query,
          featureClass: 'P',
          maxRows: limit,
          orderby: 'population',
          style: 'FULL',
          lang: language
        }, username, fetchImpl);
        const places = Array.isArray(payload?.geonames) ? payload.geonames : [];
        const rows = places.map(place => {
          const latitude = Number(place.lat);
          const longitude = Number(place.lng);
          if (!validCoordinates(latitude, longitude)) return null;
          const name = String(place.name || place.toponymName || '').slice(0, 180);
          const admin1 = String(place.adminName1 || '').slice(0, 140);
          const country = String(place.countryName || '').slice(0, 140);
          return {
            place: [name, admin1, country].filter(Boolean).join(', '),
            name,
            admin1,
            country,
            latitude,
            longitude,
            countryCode: String(place.countryCode || '').slice(0, 2),
            geonameId: Number(place.geonameId) || null,
            timezone: '',
            timezoneSource: 'geonames-pending'
          };
        }).filter(Boolean).slice(0, limit);
        return { body: { ok: true, provider: 'GeoNames', rows } };
      }, cache);
      return addHeaders(response, cors.headers);
    } catch {
      return jsonResponse(502, {
        ok: false,
        error: 'GeoNames location provider temporarily unavailable.',
        code: 'GEONAMES_UPSTREAM'
      }, cors.headers);
    }
  }

  if (url.pathname === '/api/locations/timezone') {
    const rawLatitude = url.searchParams.get('lat');
    const rawLongitude = url.searchParams.get('lng');
    const latitude = Number(rawLatitude);
    const longitude = Number(rawLongitude);
    if (rawLatitude == null || rawLongitude == null || rawLatitude.trim() === '' || rawLongitude.trim() === ''
      || !validCoordinates(latitude, longitude)) {
      return jsonResponse(400, { ok: false, error: 'Valid latitude/longitude required.' }, cors.headers);
    }

    try {
      const response = await cachedJson(request, env, ctx, TIMEZONE_CACHE_SECONDS, async () => {
        const payload = await geonamesJson('timezoneJSON', { lat: latitude, lng: longitude }, username, fetchImpl);
        const timezoneId = String(payload?.timezoneId || '').trim();
        if (!timezoneId || timezoneId.length > 100 || !/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/.test(timezoneId)) {
          throw new Error('GeoNames did not return a valid timezoneId.');
        }
        return {
          body: {
            ok: true,
            timezoneId,
            timezone: timezoneId,
            timezoneSource: 'geonames-timezoneJSON',
            countryCode: String(payload.countryCode || '').slice(0, 2)
          }
        };
      }, cache);
      return addHeaders(response, cors.headers);
    } catch {
      return jsonResponse(502, {
        ok: false,
        error: 'GeoNames location provider temporarily unavailable.',
        code: 'GEONAMES_UPSTREAM'
      }, cors.headers);
    }
  }

  return jsonResponse(404, { ok: false, error: 'Not found.' }, cors.headers);
}

export default {
  async fetch(request, env, ctx) {
    return handleRequest(request, env, ctx);
  }
};
