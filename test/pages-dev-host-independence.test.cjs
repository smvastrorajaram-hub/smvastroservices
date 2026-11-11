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

test('Existing Firebase Auth and Verify email handler domains remain the dedicated .in services', () => {
  const action = read('public/auth/action.mjs');
  const verification = read('verification-email.js');
  assert.match(action, /authDomain:\s*"auth\.smvastroservices\.in"/);
  assert.match(verification, /https:\/\/verify\.smvastroservices\.in\/auth\/action\.html/);
  assert.match(verification, /parsed\.origin !== 'https:\/\/verify\.smvastroservices\.in'/);
});

test('Each PWA gives Pages.dev a new cache release while preserving the exact existing .in cache release', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  for (const source of workers) {
    assert.match(source, /const IS_PAGES_DEV_HOST\s*=/);
    assert.match(source, /'20261111-pages-dev-domain-independence-v1'\s*:\s*'20261111-pages-horoscope-header-css-v1'/);
    assert.match(source, /PAGES_DEV_HELPER_FILES\s*=\s*IS_PAGES_DEV_HOST/);
  }
  const horoscope = workers[1];
  assert.match(horoscope, /'v273-pages-dev-domain-independence-20261111'\s*:\s*'v272-pages-horoscope-header-css-20261111'/);
});

test('The Pages.dev helper is cached only in Pages.dev worker scopes', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  assert.ok(workers[0].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['./pages-dev-host-independence.js']:[]"));
  assert.ok(workers[1].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['../pages-dev-host-independence.js']:[]"));
  assert.ok(workers[2].includes("PAGES_DEV_HELPER_FILES=IS_PAGES_DEV_HOST?['../../pages-dev-host-independence.js']:[]"));
});

test('The origin isolation change does not clear user data or origin-wide browser caches', () => {
  const helperAndPages = helper + read('public/index.html') +
    read('public/horoscope/index.html') + read('public/horoscope/calendar/index.html');
  assert.doesNotMatch(helperAndPages, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(helperAndPages, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(helperAndPages, /indexedDB\.deleteDatabase\s*\(/);
  assert.doesNotMatch(helperAndPages, /caches\.delete\s*\(/);
});
