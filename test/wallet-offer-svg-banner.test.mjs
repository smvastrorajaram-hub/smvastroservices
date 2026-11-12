import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = relative => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
const frontend = read('../public/smvastro.mjs');
const html = read('../public/index.html');
const css = read('../public/smvastro.css');
const worker = read('../public/sw.js');
const horoscopeWorker = read('../public/horoscope/sw.js');
const calendarWorker = read('../public/horoscope/calendar/sw.js');

test('existing Home Wallet offer cards remain intact with SVG banners mounted above them', () => {
  const svgMount = html.indexOf('id="smvWalletOfferSvgBanners"');
  const existingCards = html.indexOf('id="smvWalletOfferBannerItems"');
  assert.ok(svgMount >= 0 && existingCards > svgMount, 'SVG banner mount must precede the existing Offer cards');
  assert.ok(frontend.includes("'<article class=\"smv-wallet-offer-card\""), 'Existing offer-card renderer remains present');
  assert.ok(frontend.includes("const targets=['smvWalletOfferSvgBanners','smvCustomerWalletOfferBanners']"));
  assert.ok(frontend.includes("smvRenderWalletOfferSvgBanners(offers,themeLabels)"));
});

test('Customer Wallet displays the same offer SVG banner before Bonus Credit and recharge', () => {
  const start = frontend.indexOf('function smvWalletDashboardCardHtml()');
  const end = frontend.indexOf('function smvRenderFastDashboardShell', start);
  assert.ok(start >= 0 && end > start, 'Customer Wallet card renderer exists');
  const walletCard = frontend.slice(start, end);
  assert.ok(walletCard.includes('id="smvCustomerWalletOfferBanners"'));
  assert.ok(walletCard.indexOf('smvCustomerWalletOfferBanners') < walletCard.indexOf('smv-wallet-bonus-summary'));
  assert.ok(walletCard.indexOf('smvCustomerWalletOfferBanners') < walletCard.indexOf('smvWalletRechargeForm'));
  const shellStart = frontend.indexOf('function smvRenderFastDashboardShell');
  const shellEnd = frontend.indexOf('function smvWalletMoney', shellStart);
  const customerShell = frontend.slice(shellStart, shellEnd);
  assert.ok(customerShell.includes('void smvLoadHomeWalletRechargeOffers().catch(()=>{})'), 'Dashboard shell refreshes current active offers after it mounts its banner');
});

test('SVG offer banners navigate to Customer login or Wallet recharge amount without auto-payment', () => {
  const start = frontend.indexOf('function smvOpenWalletRechargeDestination()');
  const end = frontend.indexOf("document.addEventListener('click'", start);
  assert.ok(start >= 0 && end > start, 'Banner click navigation handler exists');
  const navigation = frontend.slice(start, end);
  assert.ok(navigation.includes("openAuth('login')"), 'Logged-out users are asked to sign in');
  assert.ok(navigation.includes("dashboardButton.click()"), 'Signed-in users are routed through Dashboard');
  assert.ok(navigation.includes("role!=='customer'"), 'Astrologer/Admin accounts are not routed into Customer Wallet');
  const focusStart = frontend.indexOf('function smvFocusWalletRecharge()');
  const focusEnd = frontend.indexOf('function smvCompleteWalletRechargeNavigation', focusStart);
  const focus = frontend.slice(focusStart, focusEnd);
  assert.ok(focus.includes("$('smvWalletRechargeAmount')"));
  assert.ok(focus.includes('amount.focus('));
  assert.ok(focus.includes('form.scrollIntoView('));
  assert.equal(/requestSubmit\(|\.submit\(\)|smvStartRazorpayCheckout\(/.test(navigation + focus), false,
    'Tapping a banner must not start a Razorpay payment');
});

test('Customer Wallet no longer renders Legacy Free Minutes UI', () => {
  const start = frontend.indexOf('function smvWalletDashboardCardHtml()');
  const end = frontend.indexOf('function smvRenderFastDashboardShell', start);
  const walletCard = frontend.slice(start, end);
  assert.equal(frontend.includes('smvWalletLegacyMinutes'), false);
  assert.equal(frontend.includes('Legacy Free Minutes preserved separately'), false);
  assert.equal(walletCard.includes('bonusMinutesBalance'), false);
  assert.ok(walletCard.includes('smvWalletBonusCredit'));
  assert.ok(html.includes('smv-wallet-offers-how'));
});

test('existing offer SVG assets are precached across the synchronized SMV app releases', () => {
  const themes = [
    'generic','pongal','diwali','navaratri','dasara','ayudha_pooja','shivaratri',
    'tamil_new_year','vinayagar_chaturthi','karthigai_deepam','thaipusam',
    'new_year','onam','christmas','eid'
  ];
  for (const theme of themes) {
    assert.ok(worker.includes("'./assets/offers/" + theme + ".svg'"), theme + ' SVG must be part of the main app cache');
  }
  const release = '20261112-customer-dashboard-source-ui-';
  assert.ok(worker.includes(release + 'pages-v2') && worker.includes(release + 'in-v2'));
  assert.ok(horoscopeWorker.includes(release + 'pages-v2') && horoscopeWorker.includes(release + 'in-v2'));
  assert.ok(calendarWorker.includes(release + 'pages-v2') && calendarWorker.includes(release + 'in-v2'));
  assert.ok(css.includes('.smv-wallet-offer-svg-banner'));
});
test('Homepage and Customer Wallet SVG offer banners share a clean white background', () => {
  assert.ok(css.includes('#dashboardContent button:not(.smv-wallet-offer-svg-banner):where('), 'dashboard theme button colours exclude the special offer button');
  assert.ok(css.includes('#dashboard button:not(.smv-wallet-offer-svg-banner):where('), 'dashboard theme button styles exclude the special offer button');
  assert.ok(css.includes('html body :is(#admin, #dashboard) button:not(.smv-wallet-offer-svg-banner):where('), 'the later high-specificity Dashboard colour rule also excludes the Offer banner');
  const bannerStart = css.indexOf('.smv-wallet-offer-svg-banner{');
  const bannerEnd = css.indexOf('}', bannerStart);
  assert.ok(bannerStart >= 0 && bannerEnd > bannerStart, 'Shared SVG banner style exists');
  const bannerRule = css.slice(bannerStart, bannerEnd);
  assert.ok(bannerRule.includes('background:#fff;'), 'SVG offer banner card uses a white background');
  assert.ok(!bannerRule.includes('linear-gradient('), 'The previous tinted gradient is not used');
  const artStart = css.indexOf('.smv-wallet-offer-svg-banner-art{');
  const artEnd = css.indexOf('}', artStart);
  assert.ok(artStart >= 0 && artEnd > artStart);
  assert.ok(css.slice(artStart, artEnd).includes('background:#fff;'), 'SVG artwork surface is also white');
});
