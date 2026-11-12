import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const html = read("public/horoscope/index.html");
const policy = read("public/horoscope/config.js");
const auth = read("public/horoscope/horoscope-auth.mjs");
const form = read("public/horoscope/horoscope-form.js");
const horoscope = read("public/horoscope/horoscope.js");
const css = read("public/horoscope/horoscope.css");
const store = read("public/horoscope/report-store.mjs");
const workers = [
  read("public/sw.js"),
  read("public/horoscope/sw.js"),
  read("public/horoscope/calendar/sw.js")
];

test("The quick-payment box is added below each Generate button without replacing the existing benefits box", () => {
  const enButton = html.indexOf('id="generateEnglishHoroscope"');
  const enQuick = html.indexOf('id="smvHoroscopeQuickPaidEntryEnglish"');
  const enBenefits = html.indexOf('id="smvHoroscopePaidEntryEnglish"');
  const taButton = html.indexOf('id="generateTamilHoroscope"');
  const taQuick = html.indexOf('id="smvHoroscopeQuickPaidEntryTamil"');
  const taBenefits = html.indexOf('id="smvHoroscopePaidEntryTamil"');
  assert.ok(enButton >= 0 && enButton < enQuick && enQuick < enBenefits);
  assert.ok(taButton >= 0 && taButton < taQuick && taQuick < taBenefits);
  assert.match(policy, /smvHoroscopePaidEntryEnglish/);
  assert.match(policy, /smvHoroscopePaidEntryTamil/);
});

test("Only one Horoscope paid-entry synchronizer exists; a legacy duplicate must not shadow the mirrored UI", () => {
  const declarations = [...policy.matchAll(/function\s+syncHoroscopePaidEntry\s*\(/g)];
  assert.equal(declarations.length, 1, "Exactly one syncHoroscopePaidEntry declaration must remain.");
  assert.match(policy, /const paidCustomerMode=state\.mode==='paid'&&state\.loggedIn===true&&Number\(state\.actualPrice\|\|0\)>=1/);
  assert.doesNotMatch(policy, /const active=state\.mode==='paid'&&state\.loggedIn===true&&Number\(state\.actualPrice\|\|0\)===1/);
  assert.doesNotMatch(policy, /renderQuickHoroscopePayment\(/);
});

test("The mirrored Full Report box appears only for Admin ON + Rs.1 or above + logged-in unpaid Customer", () => {
  assert.match(policy, /const paidCustomerMode=state\.mode==='paid'&&state\.loggedIn===true&&Number\(state\.actualPrice\|\|0\)>=1/);
  assert.match(policy, /const showPaymentMirror=paidCustomerMode&&state\.entitled!==true/);
  assert.match(policy, /if\(!showPaymentMirror\)\{clearGate\(item\.root\);continue;\}/);
  assert.match(policy, /renderHoroscopePaymentMirror\(item,state,allPaymentRoots\)/);
  assert.match(policy, /setPaidModeGenerateLabels\(paidCustomerMode\)/);
});

test("After login the single paid INDEX/CTA stays below Calculate Basic; the duplicate lower Benefits copy is cleared", () => {
  assert.match(policy, /for\(const item of quickRoots\)[\s\S]{0,300}renderHoroscopePaymentMirror\(item,state,allPaymentRoots\)/);
  assert.match(policy, /for\(const item of benefitsRoots\)\{\s*if\(state\.mode!=='paid'\|\|Number\(state\.actualPrice\|\|0\)<1\|\|state\.entitled\|\|state\.loggedIn===true\)\{\s*clearGate\(item\.root\);/);
  assert.doesNotMatch(policy, /for\(const item of benefitsRoots\)\{[\s\S]{0,700}renderHoroscopePaymentMirror/);
  assert.match(policy, /Preserve the original pre-login Login-to-Pay behavior unchanged/);
  assert.match(policy, /renderPolicyLock\(\s*'advanced_analysis',\s*item\.root/);
});

test("The new mirror reuses the original ten-section INDEX, exact configured price and existing Razorpay payment window", () => {
  assert.match(policy, /function renderHoroscopePaymentMirror\(item,state,paymentRoots\)/);
  assert.match(policy, /renderPolicyLock\(\s*'advanced_analysis',\s*item\.root,\s*\{enabled:true,price:state\.actualPrice\}/);
  assert.doesNotMatch(policy, /function renderQuickHoroscopePayment/);
  assert.match(auth, /function featureIndex\(feature\)/);
  assert.match(auth, /Full Report Payment/);
  assert.match(auth, /Unlock Full Report — ₹/);
  assert.match(auth, /<ul>\$\{featureIndex\(feature\)\.map/);
  assert.match(auth, /await payForFeature\(feature\)/);
  assert.match(auth, /horoscope-payment\/create-order/);
  assert.match(auth, /horoscope-payment\/verify/);
});

test("The Full Horoscope and Marriage Matching lock card uses the matching white, cream-border and red-heading palette", () => {
  assert.ok(css.includes("border:1px solid var(--smv207-line,#e4d7bf)!important"));
  assert.ok(css.includes("background:#fff!important"));
  assert.ok(css.includes("color:var(--smv207-red,#8b1717)!important"));
  assert.ok(css.includes("background:linear-gradient(135deg,var(--smv207-red,#8b1717),var(--smv207-red-soft,#a52a23))!important"));
  assert.match(auth, /முழு ஜாதக அறிக்கை/);
  assert.match(auth, /முழு திருமணப் பொருத்த அறிக்கை/);
});

test("Successful payment clears the paid-entry hosts and explicitly launches the full report", () => {
  assert.match(policy, /for\(const root of paymentRoots\)clearGate\(root\)/);
  assert.match(policy, /__smvGenerateHoroscopeFromCurrentFields\(item\.language,\{fullReport:true\}\)/);
});

test("Generate button label changes only under the logged-in paid Admin policy; all other modes restore the existing label", () => {
  assert.match(policy, /window\.__smvAdminPaidQuickMode=!!active/);
  assert.match(policy, /T\('Calculate Basic Horoscope','அடிப்படை ஜாதகம் கணிக்க'\)/);
  assert.match(policy, /T\('Create Horoscope','ஜாதகம் உருவாக்குக'\)/);
  assert.match(horoscope, /window\.__smvAdminPaidQuickMode\s*\?\s*\(ta\?'அடிப்படை ஜாதகம் கணிக்க':'Calculate Basic Horoscope'\)/);
  assert.match(horoscope, /window\.__smvAdminPaidQuickMode\?'அடிப்படை ஜாதகம் கணிக்க':'தமிழில் ஜாதகம் உருவாக்குக'/);
});

test("Birth details are prepared from the existing English or Tamil inputs, including historical IANA timezone offset", () => {
  assert.match(form, /window\.__smvPrepareHoroscopePaymentContext=async\(language='en'\)/);
  assert.match(form, /prefix=tamil\?'tamil':'english'/);
  assert.match(form, /normalizePaymentBirthTime/);
  assert.match(form, /offsetMinutesAt\(zone,date,time\)/);
  assert.match(form, /window\.__smvSetReportContext\('advanced_analysis',context\)/);
  assert.match(form, /currentWork,maritalStatus,currentResidence,utcOffsetMinutes:historicalOffset/);
  assert.match(auth, /async function reportKey\(feature\)\{const ctx=contexts\.get\(feature\)/);
  assert.match(auth, /window\.__smvPayForHoroscopeFeature=payForFeature/);
});

test("After verified payment the same selected form opens the full result; birth details are not re-entered", () => {
  assert.match(policy, /await window\.__smvPrepareHoroscopePaymentContext\(item\.language\)/);
  assert.match(policy, /window\.__smvGenerateHoroscopeFromCurrentFields\(item\.language,\{fullReport:true\}\)/);
  assert.match(form, /window\.__smvGenerateHoroscopeFromCurrentFields=\(language='en',options=\{\}\)=>/);
  assert.match(form, /button\.click\(\);\s*return true/);
  assert.match(auth, /rememberPaidAccess\(feature,key\)/);
});

test("Basic Generate remains Basic-only even after payment; only the payment mirror may launch the full report", () => {
  assert.match(policy, /state\.mode==='paid'&&state\.loggedIn===true&&[\s\S]{0,140}Number\(state\.actualPrice\|\|0\)>=1&&!paidFullReportLaunch/);
  assert.match(form, /options\?\.fullReport===true\)button\.dataset\.smvFullReportLaunch='1'/);
  assert.match(form, /const fullReportLaunch=generateButton\?\.dataset\.smvFullReportLaunch==='1'/);
  assert.match(form, /window\.__smvPaidFullReportLaunch=fullReportLaunch/);
  assert.match(horoscope, /const fullReportLaunch=button\?\.dataset\.smvFullReportLaunch==='1'/);
  assert.match(horoscope, /generate\(true,fullReportLaunch\)/);
  assert.match(form, /window\.__smvAdminPaidQuickMode\?text\('Calculate Basic Horoscope','அடிப்படை ஜாதகம் கணிக்க'\)/);
});

test("English and Tamil Horoscope generators both enforce the same paid access policy", () => {
  assert.match(form, /__smvRequireHoroscopeFeatureAccess\('advanced_analysis',englishAdvancedRoot,runEnglishAdvanced\)/);
  assert.match(horoscope, /__smvRequireHoroscopeFeatureAccess\('advanced_analysis',advRoot,runAdvancedAfterAccess\)/);
  assert.match(horoscope, /window\.dispatchEvent\(new CustomEvent\('smv:report-ready'/);
  assert.match(horoscope, /calculation:window\.__smvLastFullReport\|\|d/);
});

test("Verified full Horoscope report continues through existing Save and PDF/Print actions", () => {
  assert.match(store, /window\.addEventListener\('smv:report-ready',e=>\{if\(owner\(\)&&!e\.detail\?\.basicOnly&&!e\.detail\?\.noSavePrint\)attach\(e\.detail\);\}\);/);
  assert.match(store, /async function saveAndPrint\(detail\)/);
  assert.match(store, /function attach\(detail\)[\s\S]{0,700}data-print/);
});

test("All three apps use one synchronized cache release; Horoscope runtime revision is bumped", () => {
  const versions = workers.map(source => /const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/.exec(source));
  assert.ok(versions.every(Boolean));
  assert.deepEqual(versions.map(match => match[1]), [
    "20261112-bonus-credit-direct-award-pages-v1",
    "20261112-bonus-credit-direct-award-pages-v1",
    "20261112-bonus-credit-direct-award-pages-v1"
  ]);
  assert.deepEqual(versions.map(match => match[2]), [
    "20261112-bonus-credit-direct-award-in-v1",
    "20261112-bonus-credit-direct-award-in-v1",
    "20261112-bonus-credit-direct-award-in-v1"
  ]);
  const runtime = /const RUNTIME_REVISION\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/.exec(workers[1]);
  assert.ok(runtime);
  assert.equal(runtime[1], "v280-pages-dev-guides-sitemap-20261111");
  assert.equal(runtime[2], "v275-in-guides-home-hide-20261111");
});

test("No origin-wide local storage, Cache API or IndexedDB deletion is introduced", () => {
  assert.doesNotMatch(policy, /localStorage\.clear\(/);
  assert.doesNotMatch(policy, /caches\.delete\(/);
  assert.doesNotMatch(form, /localStorage\.clear\(/);
  assert.doesNotMatch(store, /indexedDB\.deleteDatabase/);
});
