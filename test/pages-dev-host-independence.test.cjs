'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const helper = read('public/pages-dev-host-independence.js');

function element(tag, attributes = {}, textContent = '') {
  const attrs = new Map(Object.entries(attributes));
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    childElementCount: 0,
    textContent,
    dataset: {},
    hidden: false,
    style: { display: '' },
    rel: attrs.get('rel') || '',
    hasAttribute(name) { return attrs.has(name); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name === 'rel') this.rel = String(value);
    },
    removeAttribute(name) {
      attrs.delete(name);
      if (name === 'rel') this.rel = '';
    },
    matches(selector) {
      return selector === 'script[type="application/ld+json"]' &&
        this.tagName === 'SCRIPT' &&
        attrs.get('type') === 'application/ld+json';
    }
  };
}

function runHelper(hostname, elements) {
  const document = {
    getElementById(id) { return elements.find(item => item.getAttribute('id') === id) || null; },
    querySelector(selector) {
      if (!selector.startsWith('#')) return null;
      return elements.find(item => item.getAttribute('id') === selector.slice(1)) || null;
    },
    documentElement: {
      nodeType: 9,
      querySelectorAll() { return elements; }
    }
  };
  const window = {
    location: {
      hostname,
      origin: 'https://' + hostname,
      href: 'https://' + hostname + '/'
    }
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; }
    observe() {}
  }
  vm.runInNewContext(helper, { window, document, URL, MutationObserver });
  return elements;
}


test('Pages.dev hides all three Android APK download cards while .in keeps them visible', () => {
  const ids = ['smvPermanentAndroidAppSection','smvHoroscopeAndroidApkSection','smvCalendarAndroidApkSection'];
  const makeSection = id => element('section', { id });
  const pagesSections = ids.map(makeSection);
  runHelper('smvastroservices.pages.dev', pagesSections);
  for (const section of pagesSections) {
    assert.equal(section.hidden, true);
    assert.equal(section.hasAttribute('hidden'), true);
    assert.equal(section.getAttribute('aria-hidden'), 'true');
    assert.equal(section.style.display, 'none');
  }

  const legacySections = ids.map(makeSection);
  runHelper('smvastroservices.in', legacySections);
  for (const section of legacySections) {
    assert.equal(section.hidden, false);
    assert.equal(section.hasAttribute('hidden'), false);
    assert.equal(section.hasAttribute('aria-hidden'), false);
    assert.equal(section.style.display, '');
  }

  assert.match(read('public/interface.js'), /beforeinstallprompt/);
  assert.match(read('public/horoscope/pwa.js'), /beforeinstallprompt/);
  assert.match(read('public/horoscope/calendar/calendar-pwa.mjs'), /beforeinstallprompt/);
});

test('Pages.dev rewrites all three website domains to the matching Pages.dev routes', () => {
  const rootLink = element('a', {
    href: 'https://www.smvastroservices.in/privacy.html?from=footer#data',
    target: '_blank'
  });
  const horoscopeLink = element('a', {
    href: 'https://horoscope.smvastroservices.in/?lang=ta&admin=1',
    target: '_blank'
  });
  const calendarLink = element('a', {
    href: 'https://calendar.smvastroservices.in/'
  });
  const calendarModule = element('script', {
    src: 'https://calendar.smvastroservices.in/calendar-rasi-palan.mjs?v=7'
  });
  const calendarAsset = element('img', {
    src: 'https://calendar.smvastroservices.in/assets/smv-calendar-website.webp'
  });

  runHelper('smvastroservices.pages.dev', [
    rootLink, horoscopeLink, calendarLink, calendarModule, calendarAsset
  ]);

  assert.equal(rootLink.getAttribute('href'),
    'https://smvastroservices.pages.dev/privacy.html?from=footer#data');
  assert.equal(horoscopeLink.getAttribute('href'),
    'https://smvastroservices.pages.dev/horoscope/?lang=ta&admin=1');
  assert.equal(calendarLink.getAttribute('href'),
    'https://smvastroservices.pages.dev/horoscope/calendar/');
  assert.equal(calendarModule.getAttribute('src'),
    'https://smvastroservices.pages.dev/horoscope/calendar-rasi-palan.mjs?v=7');
  assert.equal(calendarAsset.getAttribute('src'),
    'https://smvastroservices.pages.dev/horoscope/assets/smv-calendar-website.webp');
  assert.equal(rootLink.getAttribute('target'), null,
    'Internal Pages.dev navigation must not open an external .in tab');
  assert.equal(rootLink.rel, 'noopener');
});

test('Auth and Verify remain intentional .in services; backend provider URLs are not rewritten', () => {
  const auth = element('a', {
    href: 'https://auth.smvastroservices.in/auth/action.html?mode=verifyEmail&code=one-time'
  });
  const verify = element('a', {
    href: 'https://verify.smvastroservices.in/auth/action.html?mode=resetPassword&code=one-time'
  });
  const render = element('a', {
    href: 'https://smvastroservices.onrender.com/auth/send-password-reset-email'
  });
  const cloudflare = element('a', {
    href: 'https://smvastroservices.astroservices.workers.dev/api/wallet'
  });

  runHelper('smvastroservices.pages.dev', [auth, verify, render, cloudflare]);

  assert.equal(auth.getAttribute('href'),
    'https://auth.smvastroservices.in/auth/action.html?mode=verifyEmail&code=one-time');
  assert.equal(verify.getAttribute('href'),
    'https://verify.smvastroservices.in/auth/action.html?mode=resetPassword&code=one-time');
  assert.equal(render.getAttribute('href'),
    'https://smvastroservices.onrender.com/auth/send-password-reset-email');
  assert.equal(cloudflare.getAttribute('href'),
    'https://smvastroservices.astroservices.workers.dev/api/wallet');
});

test('The helper is a strict no-op on all .in hosts', () => {
  const elements = [
    element('a', { href: 'https://horoscope.smvastroservices.in/?lang=en', target: '_blank' }),
    element('img', { src: 'https://smvastroservices.in/assets/smv-home-logo.webp' }),
    element('meta', { content: 'https://calendar.smvastroservices.in/' })
  ];
  runHelper('smvastroservices.in', elements);
  assert.equal(elements[0].getAttribute('href'), 'https://horoscope.smvastroservices.in/?lang=en');
  assert.equal(elements[0].getAttribute('target'), '_blank');
  assert.equal(elements[1].getAttribute('src'), 'https://smvastroservices.in/assets/smv-home-logo.webp');
  assert.equal(elements[2].getAttribute('content'), 'https://calendar.smvastroservices.in/');
});

test('Pages.dev rewrites social metadata, JSON-LD URLs and the report-cover host label', () => {
  const meta = element('meta', {
    property: 'og:image',
    content: 'https://smvastroservices.in/assets/smv-home-logo.webp'
  });
  const structuredData = element('script', {
    type: 'application/ld+json'
  }, JSON.stringify({
    url: 'https://horoscope.smvastroservices.in/',
    isPartOf: { url: 'https://smvastroservices.in/' }
  }));
  const coverLabel = element('b', {}, 'www.smvastroservices.in');

  runHelper('smvastroservices.pages.dev', [meta, structuredData, coverLabel]);

  assert.equal(meta.getAttribute('content'),
    'https://smvastroservices.pages.dev/assets/smv-home-logo.webp');
  const data = JSON.parse(structuredData.textContent);
  assert.equal(data.url, 'https://smvastroservices.pages.dev/horoscope/');
  assert.equal(data.isPartOf.url, 'https://smvastroservices.pages.dev/');
  assert.equal(coverLabel.textContent, 'www.smvastroservices.pages.dev');
});

test('Only Pages.dev HTML entry points load the host helper; Firebase account action pages are untouched', () => {
  const pages = [
    'public/index.html',
    'public/horoscope/index.html',
    'public/horoscope/calendar/index.html',
    'public/horoscope/calendar/admin.html',
    'public/sitemap.html',
    'public/tamil-horoscope/index.html',
    'public/marriage-matching/index.html',
    'public/astrology-services/index.html',
    'public/customer-registration/index.html',
    'public/astrologer-registration/index.html',
    'public/privacy.html',
    'public/terms.html'
  ];
  for (const file of pages) {
    const html = read(file);
    assert.match(html, /if\(location\.hostname==='smvastroservices\.pages\.dev'\|\|location\.hostname\.endsWith\('\.smvastroservices\.pages\.dev'\)\)/,
      file + ' must load the cross-domain helper only on Pages.dev');
    assert.match(html, /pages-dev-host-independence\.js/);
  }
  assert.doesNotMatch(read('public/auth/action.html'), /pages-dev-host-independence/);
  assert.doesNotMatch(read('public/horoscope/report-print.html'), /pages-dev-host-independence/);
});

test('Pages.dev printed Horoscope PDFs use the Pages.dev website host without changing .in output', () => {
  const printScript = read('public/horoscope/report-print.js');
  assert.match(printScript, /if\(location\.hostname==='smvastroservices\.pages\.dev'\)/);
  assert.match(printScript, /websiteLabel\.textContent='www\.smvastroservices\.pages\.dev'/);
  assert.match(read('public/horoscope/report-print.html'), /www\.smvastroservices\.in/);
});

test('Existing Firebase Auth and Verify email handler domains remain the dedicated .in services', () => {
  const action = read('public/auth/action.mjs');
  const verification = read('verification-email.js');
  assert.match(action, /authDomain:\s*"auth\.smvastroservices\.in"/);
  assert.match(verification, /https:\/\/verify\.smvastroservices\.in\/auth\/action\.html/);
  assert.match(verification, /parsed\.origin !== 'https:\/\/verify\.smvastroservices\.in'/);
});

test('Each PWA uses synchronized Pages.dev and .in cache releases for public content updates', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  for (const source of workers) {
    assert.match(source, /const IS_PAGES_DEV_HOST\s*=/);
    assert.match(source, /'20261112-wallet-offer-white-background-pages-v1'\s*:\s*'20261112-wallet-offer-white-background-in-v1'/);
    assert.match(source, /PAGES_DEV_HELPER_FILES\s*=\s*IS_PAGES_DEV_HOST/);
  }
  const horoscope = workers[1];
  assert.match(horoscope, /'v280-pages-dev-guides-sitemap-20261111'\s*:\s*'v275-in-guides-home-hide-20261111'/);
});

test('The Pages.dev helper is cached only in Pages.dev worker scopes', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  assert.ok(workers[0].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['./pages-dev-host-independence.js','./pages-dev-apk-pwa-icons.js']:[]"));
  assert.ok(workers[1].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['../pages-dev-host-independence.js','../pages-dev-apk-pwa-icons.js']:[]"));
  assert.ok(workers[2].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['../../pages-dev-host-independence.js','../../pages-dev-apk-pwa-icons.js']:[]"));
});

test('The origin isolation change does not clear user data or origin-wide browser caches', () => {
  const homepage = read('public/index.html');
  assert.equal(homepage.includes('href="/astrology-guides/"'), false, 'The shared homepage must not expose the Guides card on .in or Pages.dev.');
  const helperAndPages = helper + read('public/index.html') +
    read('public/horoscope/index.html') + read('public/horoscope/calendar/index.html');
  assert.doesNotMatch(helperAndPages, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(helperAndPages, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(helperAndPages, /indexedDB\.deleteDatabase\s*\(/);
  assert.doesNotMatch(helperAndPages, /caches\.delete\s*\(/);
});


test('Cloudflare Pages serves Pages.dev-only robots and sitemap while leaving .in on its original static files', async () => {
  const workerSource = read('public/_worker.js');
  const workerModuleUrl = 'data:text/javascript;base64,' +
    Buffer.from(workerSource, 'utf8').toString('base64');
  const { default: worker } = await import(workerModuleUrl);
  const assetRequests = [];
  const env = {
    ASSETS: {
      async fetch(request) {
        assetRequests.push(new URL(request.url).origin + new URL(request.url).pathname);
        return new Response('STATIC:' + new URL(request.url).pathname, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  };

  const pagesRobots = await worker.fetch(
    new Request('https://smvastroservices.pages.dev/robots.txt'), env
  );
  const pagesRobotsText = await pagesRobots.text();
  assert.equal(pagesRobots.status, 200);
  assert.match(pagesRobots.headers.get('content-type'), /text\/plain/);
  assert.match(pagesRobotsText, /Sitemap: https:\/\/smvastroservices\.pages\.dev\/sitemap\.xml/);
  assert.doesNotMatch(pagesRobotsText, /smvastroservices\.in/);

  const pagesAds = await worker.fetch(
    new Request('https://smvastroservices.pages.dev/ads.txt'), env
  );
  const pagesAdsText = await pagesAds.text();
  assert.equal(pagesAds.status, 200);
  assert.equal(pagesAdsText, 'google.com, pub-8603281557754018, DIRECT, f08c47fec0942fa0\n');
  assert.doesNotMatch(pagesAdsText, /smvastroservices\\.in/);

  const pagesSitemap = await worker.fetch(
    new Request('https://smvastroservices.pages.dev/sitemap.xml'), env
  );
  const pagesSitemapText = await pagesSitemap.text();
  assert.equal(pagesSitemap.status, 200);
  assert.match(pagesSitemap.headers.get('content-type'), /application\/xml/);
  assert.match(pagesSitemapText, /https:\/\/smvastroservices\.pages\.dev\//);
  assert.doesNotMatch(pagesSitemapText, /smvastroservices\.in/);
  for (const route of [
    '/',
    '/horoscope/',
    '/horoscope/calendar/',
    '/astrology-guides/',
    '/astrology-guides/birth-chart-basics/',
    '/astrology-guides/twelve-houses/',
    '/astrology-guides/27-nakshatras/',
    '/astrology-guides/panchangam/',
    '/astrology-guides/lahiri-thirukanitham/',
    '/astrology-guides/marriage-porutham/',
    '/astrology-guides/dasha-bhukti/',
    '/astrology-guides/graha-drishti/',
    '/astrology-guides/calculation-method/',
    '/privacy.html',
    '/terms.html'
  ]) {
    assert.ok(pagesSitemapText.includes('https://smvastroservices.pages.dev' + route),
      'Pages.dev sitemap must include ' + route);
  }

  const inRobots = await worker.fetch(
    new Request('https://smvastroservices.in/robots.txt'), env
  );
  assert.equal(await inRobots.text(), 'STATIC:/robots.txt');
  const inAds = await worker.fetch(
    new Request('https://smvastroservices.in/ads.txt'), env
  );
  assert.equal(await inAds.text(), 'STATIC:/ads.txt');

  const inSitemap = await worker.fetch(
    new Request('https://smvastroservices.in/sitemap.xml'), env
  );
  assert.equal(await inSitemap.text(), 'STATIC:/sitemap.xml');
  assert.ok(assetRequests.includes('https://smvastroservices.in/robots.txt'));
  assert.ok(assetRequests.includes('https://smvastroservices.in/sitemap.xml'));

  const pagesHead = await worker.fetch(
    new Request('https://smvastroservices.pages.dev/robots.txt', { method: 'HEAD' }), env
  );
  assert.equal(pagesHead.status, 200);
  assert.equal(await pagesHead.text(), '');
});


test('Pages.dev APK download cards use the corresponding 512px PWA manifest icon while .in retains native APK icons', () => {
  const source = read('public/pages-dev-apk-pwa-icons.js');
  const cards = [
    {
      selector: '#smvPermanentAndroidAppSection .smv-android-apk-icon-wrap img',
      page: 'public/index.html',
      native: './assets/android-app-icon-astro-source.png?v=20261110-icon-png-v3',
      src: '/assets/pwa-astro-512.png',
      manifests: [['public/manifest.webmanifest', '/manifest.webmanifest']]
    },
    {
      selector: '#smvHoroscopeAndroidApkSection .smv-android-apk-icon-wrap img',
      page: 'public/horoscope/index.html',
      native: 'assets/android-app-icon-horoscope-source.png?v=20261110-icon-png-v3',
      src: '/horoscope/assets/pwa-horoscope-512.png',
      manifests: [
        ['public/horoscope/manifest-en.webmanifest', '/horoscope/manifest-en.webmanifest'],
        ['public/horoscope/manifest-ta.webmanifest', '/horoscope/manifest-ta.webmanifest']
      ]
    },
    {
      selector: '#smvCalendarAndroidApkSection .smv-android-apk-icon-wrap img',
      page: 'public/horoscope/calendar/index.html',
      native: '../assets/android-app-icon-calendar-source.png?v=20261110-icon-png-v3',
      src: '/horoscope/assets/pwa-calendar-512.png',
      manifests: [
        ['public/horoscope/calendar/manifest-en.webmanifest', '/horoscope/calendar/manifest-en.webmanifest'],
        ['public/horoscope/calendar/manifest-ta.webmanifest', '/horoscope/calendar/manifest-ta.webmanifest']
      ]
    }
  ];

  const makeImage = native => ({
    src: native,
    alt: 'Native Android application icon',
    srcset: 'native-1x.png 1x',
    dataset: {},
    setAttribute(name, value) { this[name] = String(value); },
    removeAttribute(name) { if (name === 'srcset') this.srcset = ''; }
  });

  const pagesImages = new Map(cards.map(card => [card.selector, makeImage(card.native)]));
  vm.runInNewContext(source, {
    window: { location: { hostname: 'smvastroservices.pages.dev' } },
    document: { querySelector: selector => pagesImages.get(selector) || null }
  });

  const legacyImages = new Map(cards.map(card => [card.selector, makeImage(card.native)]));
  vm.runInNewContext(source, {
    window: { location: { hostname: 'smvastroservices.in' } },
    document: { querySelector: selector => legacyImages.get(selector) || null }
  });

  for (const card of cards) {
    const image = pagesImages.get(card.selector);
    assert.equal(image.src, card.src, card.page + ' must use its PWA manifest icon on Pages.dev');
    assert.equal(image.dataset.smvPagesDevPwaIcon, '1');
    assert.equal(image.alt.includes('PWA'), true);
    assert.equal(image.srcset, '', 'A native srcset must not override the PWA icon');

    const legacy = legacyImages.get(card.selector);
    assert.equal(legacy.src, card.native, card.page + ' must retain the original native APK icon on .in');
    assert.equal(legacy.dataset.smvPagesDevPwaIcon, undefined);

    const html = read(card.page);
    assert.ok(html.includes('id="smv-pages-dev-pwa-apk-icon-loader"'));
    assert.ok(html.includes("if(location.hostname==='smvastroservices.pages.dev')"));
    assert.ok(html.includes('src="' + card.native + '"'), 'Source HTML must keep the original native APK icon.');

    for (const [manifestFile, manifestPath] of card.manifests) {
      const manifest = JSON.parse(read(manifestFile));
      const icon = manifest.icons.find(item => item.sizes === '512x512' && item.purpose === 'any');
      assert.ok(icon, manifestFile + ' must expose its 512px any-purpose PWA icon');
      const actualPath = new URL(icon.src, new URL(manifestPath, 'https://smvastroservices.pages.dev')).pathname;
      assert.equal(actualPath, card.src, manifestFile + ' icon must match the APK card PWA icon.');
    }
  }
});
