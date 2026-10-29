import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/horoscope/index.html', import.meta.url), 'utf8');
const tags = [...html.matchAll(/<script\b([^>]*)>/gi)].map(match => match[1]);
const source = attrs => (attrs.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/i) || [])[1] || null;
const modules = attrs => /\btype\s*=\s*['"]module['"]/i.test(attrs);
const asyncScript = attrs => /\basync\b/i.test(attrs);
const deferred = attrs => /\bdefer\b/i.test(attrs);

test('external classic scripts no longer block HTML parsing', () => {
  const blocking = tags.filter(attrs => source(attrs) && !modules(attrs) && !asyncScript(attrs) && !deferred(attrs)).map(source);
  assert.deepEqual(blocking, []);
  assert.ok(tags.some(attrs => source(attrs)?.includes('adsbygoogle.js') && asyncScript(attrs)), 'AdSense must remain async');
});

test('legacy scripts retain document order when deferred', () => {
  const expected = [
    'chart-style.js', 'config.js', 'report-identity.js', 'boot.mjs', 'horoscope-auth.mjs', 'report-store.mjs',
    'd9-reading.js', 'prediction-rules-published.js', 'prediction-rule-engine.js', 'prediction-rules-sync.mjs',
    'prediction-admin.mjs', 'prediction-admin-workbench.mjs', 'horoscope.js?v=20261019-ayurdaya-rules-duration-v253',
    'prediction-online.js', 'horoscope-translations.js', 'horoscope-language.js', './location-search-online-offline.js',
    'horoscope-details.js', 'horoscope-form.js', './birth-offset-live.mjs', 'pwa.js'
  ];
  const indexes = expected.map(file => html.indexOf(`src="${file}"`));
  assert.ok(indexes.every(index => index >= 0), 'all existing entry scripts must remain present');
  assert.deepEqual([...indexes].sort((a,b) => a-b), indexes, 'external script source order must remain unchanged');
});

test('calculation-engine lazy loading and marriage-matching on-demand loading remain intact', () => {
  assert.match(html, /smv-v260-lazy-calculation-engines/);
  assert.match(html, /__smvEnsureCalculationNarrativeEngines/);
  assert.match(html, /smvMarriageMatching/);
  assert.match(html, /IntersectionObserver/);
});
