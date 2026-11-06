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

test("Quick payment appears only for Admin ON + positive price + an authenticated Customer", () => {
  assert.match(policy, /const active=state\.mode==='paid'&&state\.loggedIn===true&&Number\(state\.actualPrice\|\|0\)>=1/);
  assert.match(policy, /if\(!active\)\{clearGate\(item\.root\);continue;\}/);
  assert.match(policy, /renderQuickHoroscopePayment\(item\.root,state,item\.language\)/);
});

test("The existing full ten-section benefits box stays in place and receives logged-in before-pay and after-pay callbacks", () => {
  assert.match(policy, /renderPolicyLock\(\s*'advanced_analysis',\s*item\.root/);
  assert.match(policy, /const beforePay=state\.loggedIn===true\s*\? \(\)=>window\.__smvPrepareHoroscopePaymentContext\?\.\(item\.language\)/);
  assert.match(policy, /const onUnlock=state\.loggedIn===true\s*\? \(\)=>window\.__smvGenerateHoroscopeFromCurrentFields\?\.\(item\.language\)/);
  assert.match(policy, /root,\s*\{enabled:true,price:state\.actualPrice\},\s*onUnlock,\s*beforePay,\s*state/);
});

test("The new compact payment card reuses the existing Horoscope payment flow and opens the full result from current fields", () => {
  assert.match(policy, /class="smv-horoscope-pay-gate smv-horoscope-quick-pay-gate"/);
  assert.match(policy, /__smvPrepareHoroscopePaymentContext\(language\)/);
  assert.match(policy, /__smvPayForHoroscopeFeature\('advanced_analysis'\)/);
  assert.match(policy, /__smvGenerateHoroscopeFromCurrentFields\(language\)/);
  assert.match(policy, /birth details already entered/i);
  assert.match(css, /\.smv-horoscope-quick-pay-gate/);
  assert.match(css, /\.smv-horoscope-quick-pay-gate button\{display:block;width:100%/);
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
  assert.match(form, /const prefix=tamil\?'tamil':'english'/);
  assert.match(form, /normalizePaymentBirthTime/);
  assert.match(form, /offsetMinutesAt\(zone,date,time\)/);
  assert.match(form, /window\.__smvSetReportContext\('advanced_analysis',context\)/);
  assert.match(form, /currentWork,maritalStatus,currentResidence,utcOffsetMinutes:historicalOffset/);
  assert.match(auth, /async function reportKey\(feature\)\{const ctx=contexts\.get\(feature\)/);
  assert.match(auth, /window\.__smvPayForHoroscopeFeature=payForFeature/);
});

test("After verified payment the same selected form is used; the user is not asked to re-enter birth details", () => {
  assert.match(form, /window\.__smvGenerateHoroscopeFromCurrentFields=\(language='en'\)=>/);
  assert.match(form, /button\.click\(\);\s*return true/);
  assert.match(policy, /await window\.__smvPrepareHoroscopePaymentContext\(item\.language\)/);
  assert.match(policy, /await window\.__smvPayForHoroscopeFeature\('advanced_analysis'\)/);
  assert.match(auth, /rememberPaidAccess\(feature,key\)/);
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
  assert.match(horoscope, /noSavePrint|smv:report-ready/);
});

test("Only Horoscope payment UI and cache markers change; all three app cache releases remain synchronized", () => {
  const expected = "20261107-horoscope-quick-payment-v1";
  const versions = workers.map(source => /const SMV_CACHE_RELEASE='([^']+)'/.exec(source)?.[1]);
  assert.deepEqual(versions, [expected, expected, expected]);
  const runtime = /const RUNTIME_REVISION='([^']+)'/.exec(workers[1])?.[1];
  assert.equal(runtime, "v267-horoscope-quick-payment-20261107");
});

test("No origin-wide local storage, Cache API or IndexedDB deletion is introduced", () => {
  assert.doesNotMatch(policy, /localStorage\.clear\(/);
  assert.doesNotMatch(policy, /caches\.delete\(/);
  assert.doesNotMatch(form, /localStorage\.clear\(/);
  assert.doesNotMatch(store, /indexedDB\.deleteDatabase/);
});
