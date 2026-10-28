import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = read('../public/smvastro.css');
const sharedCss = read('../public/smv-ui.css');
const html = read('../public/index.html');
const publicContent = read('../public/public-content.mjs');
const appSource = read('../public/smvastro.mjs');

function luminance(hex) {
  const channels = hex.replace('#','').match(/.{2}/g).map((value) => parseInt(value,16)/255)
    .map((value) => value <= 0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
  return 0.2126*channels[0]+0.7152*channels[1]+0.0722*channels[2];
}
function contrastRatio(foreground, background) {
  const pair=[luminance(foreground),luminance(background)].sort((a,b)=>b-a);
  return (pair[0]+0.05)/(pair[1]+0.05);
}

test('cream palette keeps core foreground text readable', () => {
  assert.ok(contrastRatio('#30251b','#fff8e7') >= 7);
  assert.ok(contrastRatio('#6b4b1e','#fff8e7') >= 6);
  assert.ok(contrastRatio('#6b6257','#fff8e7') >= 4.5);
});

test('homepage sections, footer and header use the cream surface with readable text', () => {
  assert.match(css, /html body:where\(\:not\(\.smv-css-island,\.smv-css-island \*\)\)\{line-height:1\.65;background:#fff8e7!important;color:#30251b!important\}/);
  assert.match(css, /#smv-products-store-section h2\{[^}]*color:#6b4b1e/i);
  assert.match(css, /\.smv-products-store-description\{[^}]*color:#6b6257/i);
  assert.match(css, /#askNowSection\.smv-new-asknow\{[^}]*background:#fff8e7/i);
  assert.match(css, /\.smv-master-footer:where\(\:not\(\.smv-css-island,\.smv-css-island \*\)\)\{[^}]*background:#fff8e7!important/i);
  assert.match(css, /\.smv-master-footer p:where\([^}]*color:#30251b!important/i);
  assert.match(css, /#smvPremiumHeaderV9:where\(\:not\(\.hidden\)\)\{[^}]*background:#fff8e7/i);
  assert.doesNotMatch(css, /#smvPremiumHeaderV9 \.smv9-menu > a\.active,\s*html body\.smv-v12-theme #smvPremiumHeaderV9 \.smv9-menu > \.smv-nav-current\{[^}]*color:#fff8e7/i);
});

test('shared forms and dynamic booking dialogs use cream surfaces', () => {
  assert.match(sharedCss, /--smv207-form-surface:#fffaf0/);
  assert.match(sharedCss, /--smv207-form-ink:#30251b/);
  assert.match(publicContent, /dialogSurface\.style\.background='#fff8e7'/);
  assert.match(publicContent, /actions\.style\.background='#fff8e7'/);
  assert.match(publicContent, /class="profile-dialog smv-call-booking-dialog"[^>]*background:#fff8e7;color:#30251b/i);
  assert.doesNotMatch(publicContent, /dialogSurface\.style\.background='#24103F'/);
  assert.doesNotMatch(publicContent, /class="profile-dialog smv-call-booking-dialog"[^>]*background:#24103F/i);
  assert.doesNotMatch(publicContent, /background:#fff;border:1px solid #b9a17b/);
});

test('live call/chat panel and inputs no longer force low-contrast purple text on cream', () => {
  const start=appSource.indexOf('function smvLivePanelHtml(s,incoming){');
  const end=appSource.indexOf('async function smvLivePrintReceipt(session){',start);
  assert.ok(start>=0 && end>start, 'live session source bounds should exist');
  const panel=appSource.slice(start,end);
  assert.match(panel, /background:#fff8e7;color:#30251b/);
  assert.match(panel, /background:#fffaf0;color:#30251b/);
  assert.doesNotMatch(panel, /background:#24103F/);
  assert.doesNotMatch(panel, /color:#ffffff;-webkit-text-fill-color:#ffffff/);
  assert.doesNotMatch(panel, /color:#e4d8f5/);
});

test('main page cache versions point to the audited theme assets', () => {
  assert.match(html, /smvastro\.css\?v=20261028-cream-background-v2/);
  assert.match(html, /smv-ui\.css\?v=20261028-cream-background-v2/);
  assert.match(html, /smvastro\.mjs\?v=20261028-cream-theme-audit-v1/);
  assert.match(html, /public-content\.mjs\?v=20261028-cream-theme-audit-v1/);
});
