import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const html = readFileSync(new URL('../public/horoscope/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/horoscope/horoscope.css', import.meta.url), 'utf8');
const language = readFileSync(new URL('../public/horoscope/horoscope-language.js', import.meta.url), 'utf8');
const pwa = readFileSync(new URL('../public/horoscope/pwa.js', import.meta.url), 'utf8');

assert.doesNotMatch(html, /class="site-header"|class="site-footer"|class="temple-hero"|id="home"|assets\/hero-(?:desktop|mobile)\.png/);
assert.doesNotMatch(css, /\.site-header|\.site-footer|\.temple-hero|\.temple-copy|assets\/temple-frame\.png|#siteFooter/);
assert.doesNotMatch(language, /document\.querySelector\('\.temple-hero img'\)\.alt/);
assert.match(language, /\$\('smvHoroscopeControls'\)/);
assert.doesNotMatch(pwa, /#siteFooter/);
assert.match(pwa, /getElementById\('smvHoroscopeInstallArea'\)/);
for (const id of ['smvHoroscopeControls', 'smvHoroscopeAuth', 'languageTamil', 'languageEnglish',
  'english-horoscope', 'tamil-horoscope', 'smvMarriageMatching', 'smvHoroscopeInstallArea',
  'installApp', 'installStatus']) assert.ok(html.includes('id="' + id + '"'), 'missing preserved feature/control: ' + id);
for (const file of ['public/horoscope/header-layout.css', 'public/horoscope/assets/hero-desktop.png',
  'public/horoscope/assets/hero-mobile.png', 'public/horoscope/assets/temple-frame.png']) {
  assert.equal(existsSync(new URL('../' + file, import.meta.url)), false, 'obsolete chrome asset/file remains: ' + file);
}
console.log('SMV HOROSCOPE page chrome removal regression: PASS');
