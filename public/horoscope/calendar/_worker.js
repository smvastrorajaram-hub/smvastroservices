// SMV CALENDAR custom-host asset router.
 // Deployed with the independent Calendar Pages project (root: public/horoscope/calendar).
 // Keep browser-visible requests same-origin so the Calendar Service Worker can
 // cache the canonical shared Horoscope modules and /offline/ dependency tree.
const CANONICAL_PAGES_ORIGIN = 'https://smvastroservices.pages.dev';
const CANONICAL_CALENDAR_ROOT = '/horoscope/calendar';

export function mapCalendarHostAssetPath(pathname) {
  const path = String(pathname || '/');
  if (path === '/' || path === '/index.html') return CANONICAL_CALENDAR_ROOT + '/index.html';
  if ([
    '/admin.html',
    '/sw.js',
    '/calendar-pwa.mjs',
    '/rasi-palan-periods.mjs',
    '/manifest-en.webmanifest',
    '/manifest-ta.webmanifest'
  ].includes(path)) return CANONICAL_CALENDAR_ROOT + path;
  // Calendar's existing assets are stored under public/horoscope/assets.
  if (path.startsWith('/assets/')) return '/horoscope' + path;
  // Explicit canonical paths may also be requested by compatibility fallbacks.
  if (path.startsWith('/horoscope/')) return path;
  // Shared forecast modules, the existing /horoscope/offline source tree,
  // daily-calendar assets and the Calendar calculation worker all keep their
  // familiar root-relative paths on this separate origin.
  return '/horoscope' + path;
}

async function customHostManifest(response) {
  const manifest = await response.clone().json();
  const originalStart = new URL(String(manifest.start_url || '/'), CANONICAL_PAGES_ORIGIN);
  manifest.id = '/';
  manifest.scope = '/';
  manifest.start_url = '/' + originalStart.search + originalStart.hash;
  manifest.icons = (Array.isArray(manifest.icons) ? manifest.icons : []).map(icon => ({
    ...icon,
    src: String(icon.src || '').replace(/^\/horoscope(?=\/)/, '')
  }));
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'application/manifest+json; charset=utf-8');
  headers.set('Cache-Control', 'public, max-age=300');
  return new Response(JSON.stringify(manifest), {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return env.ASSETS.fetch(request);
    }

    const canonicalPath = mapCalendarHostAssetPath(incoming.pathname);
    const upstreamUrl = new URL(canonicalPath + incoming.search, CANONICAL_PAGES_ORIGIN);
    try {
      const upstreamRequest = new Request(upstreamUrl.toString(), request);
      const upstream = await fetch(upstreamRequest);
      if (upstream.ok) {
        if (request.method === 'HEAD') {
          return new Response(null, { status: upstream.status, statusText: upstream.statusText, headers: upstream.headers });
        }
        if (incoming.pathname === '/manifest-en.webmanifest' || incoming.pathname === '/manifest-ta.webmanifest') {
          return await customHostManifest(upstream);
        }
        const headers = new Headers(upstream.headers);
        headers.set('X-SMV-Calendar-Asset-Source', 'canonical-pages');
        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers
        });
      }
    } catch (error) {
      // A locally available custom-host asset may still be served below.
    }
    return env.ASSETS.fetch(request);
  }
};
