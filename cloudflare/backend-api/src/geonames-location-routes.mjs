/**
 * Cloudflare Worker GeoNames proxy.
 *
 * The GeoNames username stays server-side. India offline location lookup
 * remains a frontend fallback when the online provider is unavailable.
 */
export function registerGeoNamesRoutes({ app, env = {}, fetchImpl = globalThis.fetch, now = Date.now } = {}) {
  if (!app || typeof app.get !== 'function' || typeof fetchImpl !== 'function') {
    throw new TypeError('GeoNames routes require an HTTP app and fetch implementation.');
  }

  const username = String(env.GEONAMES_USERNAME || '').trim();
  const configured = username.length > 0 && username.toLowerCase() !== 'demo';
  const cache = new Map();
  const pending = new Map();
  const MAX_CACHE_ENTRIES = 400;

  function validCoordinates(latitude, longitude) {
    return Number.isFinite(latitude) && Number.isFinite(longitude) &&
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  function cacheValue(key, value, ttlMs) {
    if (cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(key, { expiresAt: now() + ttlMs, value });
    return value;
  }

  async function requestGeoNames(endpoint, parameters, cacheKey, ttlMs) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > now()) return cached.value;
    if (pending.has(cacheKey)) return pending.get(cacheKey);

    const task = (async () => {
      const url = new URL('https://secure.geonames.org/' + endpoint);
      for (const [key, value] of Object.entries(parameters)) {
        url.searchParams.set(key, String(value));
      }
      url.searchParams.set('username', username);

      const options = { headers: { Accept: 'application/json' } };
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        options.signal = AbortSignal.timeout(8500);
      }
      const response = await fetchImpl(url.toString(), options);
      if (!response || response.ok !== true) throw new Error('GeoNames upstream request failed.');
      const payload = await response.json();
      if (!payload || typeof payload !== 'object' || payload.status) {
        throw new Error('GeoNames upstream rejected the request.');
      }
      return cacheValue(cacheKey, payload, ttlMs);
    })();

    pending.set(cacheKey, task);
    try {
      return await task;
    } finally {
      pending.delete(cacheKey);
    }
  }

  function unavailable(res) {
    return res.status(503).set('Cache-Control', 'no-store').json({
      ok: false,
      error: 'GeoNames location provider is not configured.',
      configured: false
    });
  }

  function upstreamFailure(res) {
    return res.status(502).set('Cache-Control', 'no-store').json({
      ok: false,
      error: 'GeoNames location provider is temporarily unavailable.',
      code: 'GEONAMES_UPSTREAM'
    });
  }

  app.get('/api/locations/status', (_req, res) => {
    return res.set('Cache-Control', 'no-store').json({
      ok: true,
      configured,
      provider: 'GeoNames',
      timezone: 'timezoneJSON'
    });
  });

  app.get('/api/locations/search', async (req, res) => {
    if (!configured) return unavailable(res);

    const query = String(req.query?.q || '').trim();
    const limitValue = Number(req.query?.limit);
    const limit = Math.max(1, Math.min(70, Number.isFinite(limitValue) && limitValue > 0
      ? Math.trunc(limitValue) : 70));
    const language = req.query?.lang === 'ta' ? 'ta' : 'en';
    const hasControlCharacters = Array.from(query).some(character => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    });

    if (query.length < 2 || query.length > 100 || hasControlCharacters) {
      return res.status(400).set('Cache-Control', 'no-store').json({
        ok: false,
        error: 'Search requires 2–100 characters.'
      });
    }

    try {
      const payload = await requestGeoNames('searchJSON', {
        name: query,
        name_startsWith: query,
        featureClass: 'P',
        maxRows: limit,
        orderby: 'population',
        style: 'FULL',
        lang: language
      }, 'search|' + language + '|' + query.toLocaleLowerCase() + '|' + limit, 4 * 60 * 60 * 1000);

      const places = Array.isArray(payload.geonames) ? payload.geonames : [];
      const rows = places.map(place => {
        const latitude = Number(place.lat);
        const longitude = Number(place.lng);
        if (!validCoordinates(latitude, longitude)) return null;

        const name = String(place.name || place.toponymName || '').slice(0, 180);
        const admin1 = String(place.adminName1 || '').slice(0, 140);
        const country = String(place.countryName || '').slice(0, 140);
        if (!name) return null;

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

      return res.set('Cache-Control', 'public, max-age=120').json({
        ok: true,
        provider: 'GeoNames',
        rows
      });
    } catch {
      return upstreamFailure(res);
    }
  });

  app.get('/api/locations/timezone', async (req, res) => {
    if (!configured) return unavailable(res);

    const latitude = Number(req.query?.lat);
    const longitude = Number(req.query?.lng);
    if (req.query?.lat == null || req.query?.lng == null ||
        String(req.query.lat).trim() === '' || String(req.query.lng).trim() === '' ||
        !validCoordinates(latitude, longitude)) {
      return res.status(400).set('Cache-Control', 'no-store').json({
        ok: false,
        error: 'Valid latitude/longitude required.'
      });
    }

    try {
      const key = 'timezone|' + latitude.toFixed(6) + '|' + longitude.toFixed(6);
      const payload = await requestGeoNames('timezoneJSON', {
        lat: latitude,
        lng: longitude
      }, key, 14 * 24 * 60 * 60 * 1000);

      const zone = String(payload.timezoneId || '').trim();
      const zoneParts = zone.split('/');
      const validZone = zone.length <= 100 && zoneParts.length >= 2 &&
        zoneParts.every(segment => segment.length > 0 && /^[A-Za-z0-9_+-]+$/.test(segment));
      if (!validZone) {
        return res.status(502).set('Cache-Control', 'no-store').json({
          ok: false,
          error: 'GeoNames did not return a valid timezoneId.',
          code: 'GEONAMES_INVALID_TIMEZONE'
        });
      }

      // GeoNames rawOffset/dstOffset are current values, not historical birth-time offsets.
      return res.set('Cache-Control', 'public, max-age=3600').json({
        ok: true,
        timezoneId: zone,
        timezone: zone,
        timezoneSource: 'geonames-timezoneJSON',
        countryCode: String(payload.countryCode || '').slice(0, 2)
      });
    } catch {
      return upstreamFailure(res);
    }
  });

  return Object.freeze({
    configured,
    paths: Object.freeze([
      '/api/locations/status',
      '/api/locations/search',
      '/api/locations/timezone'
    ])
  });
}
