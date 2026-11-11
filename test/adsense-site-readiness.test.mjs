import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = path => readFileSync(resolve(process.cwd(), path), 'utf8');
const clientId = 'ca-pub-8603281557754018';
const guideSlugs = [
  'birth-chart-basics',
  'twelve-houses',
  '27-nakshatras',
  'panchangam',
  'lahiri-thirukanitham',
  'marriage-porutham',
  'dasha-bhukti',
  'graha-drishti'
];

test('AdSense homepage loader is restricted to the submitted .in website', () => {
  const html = read('public/index.html');
  assert.match(html, new RegExp('<meta\\s+name="google-adsense-account"\\s+content="' + clientId + '"'));
  assert.match(html, /id="smv-adsense-site-loader"/);
  assert.match(html, /host==='smvastroservices\.in'\s*\|\|\s*host==='www\.smvastroservices\.in'/);
  assert.match(html, /if\(!isPrimarySite\)return/);
  assert.match(html, /document\.createElement\('script'\)/);
  assert.match(html, /pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-8603281557754018/);
  assert.match(html, /script\.async=true/);
  assert.match(html, /script\.crossOrigin='anonymous'/);
  assert.match(html, /document\.head\.appendChild\(script\)/);
  assert.doesNotMatch(html, /if\(location\.hostname!=='smvastroservices\.pages\.dev'\)return/);
  assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g) || []).length, 1);
});

test('ads.txt, robots.txt and XML sitemap expose the expected public discovery records', () => {
  const ads = read('public/ads.txt');
  assert.ok(ads.split(/\r?\n/).includes('google.com, pub-8603281557754018, DIRECT, f08c47fec0942fa0'));

  const robots = read('public/robots.txt');
  assert.match(robots, /User-agent:\s*\*\s*Allow:\s*\//);
  assert.match(robots, /Sitemap:\s*https:\/\/smvastroservices\.in\/sitemap\.xml/);

  const sitemap = read('public/sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.ok(urls.length >= 17, 'Sitemap should include the guides and all public information pages.');
  assert.equal(new Set(urls).size, urls.length, 'Sitemap URLs must be unique.');
  for (const url of [
    'https://smvastroservices.in/',
    'https://smvastroservices.in/astrology-guides/',
    'https://smvastroservices.in/astrology-services/',
    'https://smvastroservices.in/tamil-horoscope/',
    'https://smvastroservices.in/marriage-matching/',
    'https://smvastroservices.in/customer-registration/',
    'https://smvastroservices.in/astrologer-registration/',
    'https://smvastroservices.in/privacy.html',
    'https://smvastroservices.in/terms.html',
    'https://smvastroservices.in/sitemap.html'
  ]) assert.ok(urls.includes(url), 'Missing public sitemap URL: ' + url);
  for (const slug of guideSlugs) {
    assert.ok(urls.includes('https://smvastroservices.in/astrology-guides/' + slug + '/'), 'Missing guide in XML sitemap: ' + slug);
  }
});

test('Every guide is a substantial standalone HTML article with metadata and internal navigation', () => {
  const directory = read('public/astrology-guides/index.html');
  assert.match(directory, /<title>Astrology Guides and Learning Library/);
  assert.match(directory, /CollectionPage/);
  assert.match(directory, /ItemList/);
  for (const slug of guideSlugs) {
    const path = 'public/astrology-guides/' + slug + '/index.html';
    const html = read(path);
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title && title.includes('SMV ASTRO SERVICES'), path + ' must have a page title.');
    assert.match(html, /<h1>/, path + ' must have a visible H1.');
    assert.match(html, /rel="canonical"/, path + ' must declare a canonical URL.');
    assert.match(html, /"@type":"Article"/, path + ' must include Article structured data.');
    assert.match(html, /"@type":"BreadcrumbList"/, path + ' must include breadcrumb structured data.');
    assert.match(html, new RegExp('name="google-adsense-account" content="' + clientId + '"'));
    assert.match(html, /adsbygoogle\.js\?client=ca-pub-8603281557754018/);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(?:nbsp|amp|lt|gt|quot);/g, ' ');
    const wordCount = (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’–-]*/gu) || []).length;
    assert.ok(wordCount >= 300, path + ' should contain substantive human-readable content; found ' + wordCount + ' words.');
    assert.doesNotMatch(html, /Loading article|No published blogs yet|Lorem ipsum/i, path + ' must not depend on an empty dynamic-content placeholder.');
    assert.match(html, /href="\/astrology-guides\//, path + ' must link to related guide pages.');
  }
});

test('All three app service workers use synchronized new cache releases without clearing user storage', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  for (const source of workers) {
    assert.match(source, /20261111-pages-dev-adsense-content-review-v1/);
    assert.match(source, /20261111-in-adsense-content-review-v1/);
    assert.doesNotMatch(source, /localStorage\.clear\(|sessionStorage\.clear\(|WebView\.clearCache\(/);
  }
  const releases = workers.map(source => source.match(/SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/));
  assert.ok(releases.every(Boolean));
  assert.deepEqual(releases.map(match => match[1]), Array(3).fill('20261111-pages-dev-adsense-content-review-v1'));
  assert.deepEqual(releases.map(match => match[2]), Array(3).fill('20261111-in-adsense-content-review-v1'));
});
