const PAGES_DEV_HOST = 'smvastroservices.pages.dev';

const SITEMAP_PATHS = Object.freeze([
  '/',
  '/horoscope/',
  '/horoscope/calendar/',
  '/tamil-horoscope/',
  '/marriage-matching/',
  '/astrology-services/',
  '/customer-registration/',
  '/astrologer-registration/',
  '/privacy.html',
  '/terms.html',
  '/sitemap.html'
]);

function pagesRobots() {
  return new Response(
    'User-agent: *\nAllow: /\n\nSitemap: https://' + PAGES_DEV_HOST + '/sitemap.xml\n',
    {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

function pagesAds() {
  return new Response('google.com, pub-8603281557754018, DIRECT, f08c47fec0942fa0\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function pagesSitemap() {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = SITEMAP_PATHS.map(path =>
    '  <url><loc>https://' + PAGES_DEV_HOST + path + '</loc><lastmod>' + lastmod + '</lastmod></url>'
  ).join('\n');
  return new Response(
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls + '\n</urlset>\n',
    {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff'
      }
    }
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === PAGES_DEV_HOST &&
        (request.method === 'GET' || request.method === 'HEAD')) {
      let response = null;
      if (url.pathname === '/robots.txt') response = pagesRobots();
      else if (url.pathname === '/sitemap.xml') response = pagesSitemap();
      else if (url.pathname === '/ads.txt') response = pagesAds();
      if (response) {
        if (request.method === 'HEAD') {
          return new Response(null, { status: response.status, headers: response.headers });
        }
        return response;
      }
    }
    return env.ASSETS.fetch(request);
  }
};
