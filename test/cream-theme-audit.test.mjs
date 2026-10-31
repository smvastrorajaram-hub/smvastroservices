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
  assert.match(css, /html :is\(#smv-v15-header-root, body\.smv-v12-theme\) #smvPremiumHeaderV9 \.smv9-menu > :is\(a, button[^}]*color:#30251b!important/i);
  assert.match(css, /#smv24-footer a\{color:#30251b;text-decoration:none\}/);
  assert.match(css, /html body #smv24-footer \.smv26-links a\{[^}]*color:#30251b!important[^}]*font:600 16px/i);
  assert.match(css, /html body #smv24-footer \.smv24-brand p\{[^}]*color:#30251b!important/i);
  assert.match(css, /html body #smv24-footer \.smv24-contact a\{[^}]*color:#30251b!important/i);
  assert.match(css, /html body #smv24-footer \.smv24-social a\{[^}]*color:#30251b!important/i);
  assert.doesNotMatch(css, /[^{}]*#smv24-footer[^{}]*\{[^{}]*color:rgba\(255,248,231,\.(?:94|96)\)/i);
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

test('Astrology Insights, Blogs, Media, hero kicker and footer tagline use high-contrast text', () => {
  assert.match(css, /#approved-astrologers h2\{color:#6b4b1e!important;-webkit-text-fill-color:#6b4b1e!important;font-weight:900!important\}/);
  assert.match(css, /#smv-content-hub h2\{color:#20170f!important;-webkit-text-fill-color:#20170f!important;font-weight:900!important;opacity:1!important;filter:none!important;text-shadow:none!important\}/);
  assert.match(css, /#publicBlogs \.blog-card > h3, #blogs \.blog-card > h3, #blogList \.blog-card > h3\{[^}]*font-weight:900!important[^}]*color:#6b4b1e!important[^}]*-webkit-text-fill-color:#6b4b1e!important/i);
  assert.match(css, /#publicBlogs \.blog-card > p\.small, #blogs \.blog-card > p\.small, #blogList \.blog-card > p\.small\{[^}]*color:#30251b!important[^}]*-webkit-text-fill-color:#30251b!important/i);
  assert.match(css, /#publicBlogs \.blog-card \.blog-content, #blogs \.blog-card \.blog-content, #blogList \.blog-card \.blog-content\{[^}]*color:#30251b!important[^}]*-webkit-text-fill-color:#30251b!important/i);
  assert.match(css, /#publicMedia \.media-card > h3\{[^}]*font-weight:900!important[^}]*color:#6b4b1e!important[^}]*-webkit-text-fill-color:#6b4b1e!important/i);
  assert.match(css, /#publicMedia \.media-card > p\.small\{[^}]*color:#30251b!important[^}]*-webkit-text-fill-color:#30251b!important/i);
  assert.match(css, /#smv-content-hub #publicMedia \.smv-media-type-title\{[^}]*color:#6b4b1e!important[^}]*-webkit-text-fill-color:#6b4b1e!important/i);
  assert.match(css, /html body\.smv-v12-theme #home \.smv33-kicker\{margin:0 0 13px;color:#20170f!important;-webkit-text-fill-color:#20170f!important;font-size:clamp\(13px,1vw,15px\);font-weight:900!important/i);
  assert.match(css, /html body\.smv-v12-theme #home \.smv33-kicker\{margin:0 0 11px;color:#20170f!important;-webkit-text-fill-color:#20170f!important[^}]*font-size:clamp\(13px,3vw,15px\);line-height:1\.35;font-weight:900!important/i);
  assert.match(css, /html body #smv24-footer \.smv24-brand em\{[^}]*font-weight:900!important;[^}]*color:#30251b!important;[^}]*-webkit-text-fill-color:#30251b!important/i);
  assert.match(css, /html body\.smv-v12-theme #smv-content-hub#smv-content-hub \.smv-v173-subhead\{[^}]*font-weight:900!important/i);
  assert.match(css, /html body\.smv-v12-theme #smv-content-hub#smv-content-hub \.smv-v173-subhead > span\{[^}]*font-weight:900!important/i);
  assert.match(css, /\.smv24-brand em\{display:block;font:italic 25px \/ 1\.5 Georgia, serif;font-weight:900;color:#30251b/);
  assert.match(css, /html body\.smv-v12-theme #home \.smv33-kicker\{margin:0 0 13px;color:#20170f!important;-webkit-text-fill-color:#20170f!important[^}]*font-weight:900!important/i);
  assert.match(css, /html body\.smv-v12-theme #home \.smv33-kicker\{margin:0 0 11px;color:#20170f!important;-webkit-text-fill-color:#20170f!important[^}]*font-weight:900!important/i);
  assert.ok(contrastRatio('#20170f','#fff8e7') >= 15, 'hero and Astrology Insights heading must use near-black contrast');
  assert.ok(contrastRatio('#30251b','#fff8e7') >= 7, 'general footer text must meet strong contrast');
  assert.ok(contrastRatio('#6b4b1e','#fff8e7') >= 6, 'content headings must remain strongly readable');
});

test('customer Wallet transaction amounts use readable red/green bold styling', () => {
  const start=appSource.indexOf('const transactions=Array.isArray(transactionResult?.transactions)?');
  assert.ok(start>=0, 'customer Wallet transaction rendering should exist');
  const block=appSource.slice(start,start+3000);
  assert.ok(block.includes(`class="smv-wallet-transaction-amount '+(credit?'success':'error')+'" style="white-space:nowrap"`));
  assert.match(css, /#smvWalletTransactions \.smv-wallet-transaction-amount\.success\{[^}]*color:#166534!important[^}]*-webkit-text-fill-color:#166534!important[^}]*font-weight:900!important/i);
  assert.match(css, /#smvWalletTransactions \.smv-wallet-transaction-amount\.error\{[^}]*color:#b91c1c!important[^}]*-webkit-text-fill-color:#b91c1c!important[^}]*font-weight:900!important/i);
  assert.ok(contrastRatio('#166534','#fff8e7') >= 4.5, 'green credits must meet WCAG AA contrast');
  assert.ok(contrastRatio('#b91c1c','#fff8e7') >= 4.5, 'red debits must meet WCAG AA contrast');
});

test('shared UI stylesheet must not override hero and content headings with pale gold', () => {
  const checks = [
    {
      selector: 'html body.smv-v12-theme #smv-content-hub .feature-top h2{',
      required: ['font-weight:900!important', 'color:#20170f!important', '-webkit-text-fill-color:#20170f!important', 'opacity:1!important'],
    },
    {
      selector: 'html body.smv-v12-theme #home .smv33-mobile-head .smv33-kicker{',
      required: ['color:#20170f!important', '-webkit-text-fill-color:#20170f!important', 'font-weight:900!important', 'opacity:1!important'],
    },
    {
      selector: 'html body.smv-v12-theme #smv-content-hub .smv-v173-subhead{',
      required: ['color:#6b4b1e!important', '-webkit-text-fill-color:#6b4b1e!important', 'font-weight:900!important'],
    },
    {
      selector: 'html body.smv-v12-theme #smv-content-hub .smv-v173-sub-collapse{',
      required: ['color:#6b4b1e!important', '-webkit-text-fill-color:#6b4b1e!important'],
    },
  ];
  for (const check of checks) {
    const start = sharedCss.indexOf(check.selector);
    assert.ok(start >= 0, 'expected shared UI selector: ' + check.selector);
    const end = sharedCss.indexOf('}', start);
    const rule = sharedCss.slice(start, end + 1);
    for (const expected of check.required) {
      assert.ok(rule.includes(expected), 'selector ' + check.selector + ' must include ' + expected);
    }
    assert.ok(!rule.includes('#f3d99b'), 'selector ' + check.selector + ' must not force pale-gold text');
  }
  assert.ok(contrastRatio('#20170f','#fff8e7') >= 15, 'hero and content heading contrast must exceed WCAG AA');
});

test('main page cache versions point to the audited theme assets', () => {
  assert.match(html, /smvastro\.css\?v=20261028-cream-content-contrast-v6/);
  assert.match(html, /smv-ui\.css\?v=20261031-apk-pwa-card-v1/);
  assert.match(html, /smvastro\.mjs\?v=20261031-cloudflare-r2-apk-release-v3-admin-worker-route/);
  assert.match(html, /public-content-loader\.js\?v=20261029-consult-module-lazy-v1/);
  assert.doesNotMatch(html, /<script[^>]+src=["'][^"']*public-content\.mjs/);
  const lazyLoader = read('../public/public-content-loader.js');
  assert.match(lazyLoader, /public-content\.mjs\?v=20261029-consult-module-lazy-v1/);
});
