import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const policy = read("public/horoscope/config.js");
const auth = read("public/horoscope/horoscope-auth.mjs");
const store = read("public/horoscope/report-store.mjs");
const matching = read("public/horoscope/marriage-matching.js");
const horoscopeForm = read("public/horoscope/horoscope-form.js");
const workers = [
  read("public/sw.js"),
  read("public/horoscope/sw.js"),
  read("public/horoscope/calendar/sw.js")
];

function between(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, "Missing source section: " + start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, "Missing source section end: " + end);
  return source.slice(from, to);
}

test("Full Horoscope payment index contains all ten detailed Advanced Analysis benefits", () => {
  const index = between(auth, "function featureIndex(feature)", "function renderFeatureLock");
  const sections = [...index.matchAll(/flowText\('(I|II|III|IV|V|VI|VII|VIII|IX|X)\./g)].map(x => x[1]);
  assert.deepEqual(sections, ["I","II","III","IV","V","VI","VII","VIII","IX","X"]);
  assert.match(index, /D1, planetary positions, houses, lords and aspects/);
  assert.match(index, /D2, D7, D9, D10 and supporting Vargas/);
  assert.match(index, /Pushkara, Vargottama, Graha Yuddha/);
  assert.match(index, /Ashtakavarga and Shadbala/);
  assert.match(index, /Vimshottari MD\/AD\/PD/);
  assert.match(index, /Tajaka/);
  assert.match(index, /Transit/);
  assert.match(index, /Panchang & Annual Timing/);
  assert.match(index, /Remedies & Numerology/);
  assert.match(index, /Complete Life Predictions/);
});

test("Admin ON with a positive price keeps the same benefits and price panel before and after Customer login until paid", () => {
  assert.match(policy, /const entitled=loggedIn \? await paidEntitled\(feature\) : false/);
  assert.match(policy, /if\(state\.mode!=='paid'\|\|Number\(state\.actualPrice\|\|0\)<1\|\|state\.entitled\)/);
  assert.match(policy, /renderPolicyLock\(\s*'advanced_analysis',\s*root,[\s\S]{0,450}state\s*\)/);
  assert.match(policy, /mode:'paid'[\s\S]{0,180}loggedIn,entitled,fullAllowed:entitled/);
  assert.match(auth, /Full Report Payment/);
  assert.match(policy, /Login to Pay/);
});

test("Clicking the pre-login payment action opens Customer Login before payment", () => {
  assert.match(auth, /if\(!state\.user\)\{showAuthForm\('login'\);throw Error\(flowText\('Login first, then continue to payment\.'/);
  assert.match(auth, /data-smv-unlock/);
  assert.match(auth, /await payForFeature\(feature\)/);
});

test("Admin OFF plus ₹0 grants the full result after login but marks it no-export", () => {
  assert.match(policy, /mode:loggedIn\?'off_free_full_no_export':'off_free_full'/);
  assert.match(policy, /entitled:true,fullAllowed:true,exportAllowed:false/);
  const noExport = between(
    policy,
    "else if(mode==='off_free_full_no_export'){",
    "  }\n\n  if(event.detail?.noSavePrint)"
  );
  assert.match(noExport, /event\.detail\.noSavePrint=true/);
  assert.doesNotMatch(noExport, /basicOnly/);
});

test("No-export policy is capture-phase and report storage does not mount Save/Print", () => {
  assert.match(policy, /window\.addEventListener\('smv:report-ready',event=>\{[\s\S]{0,1100}\},true\);/);
  assert.match(store, /window\.addEventListener\('smv:report-ready',e=>\{if\(owner\(\)&&!e\.detail\?\.basicOnly&&!e\.detail\?\.noSavePrint\)attach\(e\.detail\);\}\);/);
  assert.match(store, /function attach\(detail\)[\s\S]{0,600}smv-manual-save-actions/);
});

test("The same no-export report policy covers both Horoscope and Marriage Matching results", () => {
  assert.match(horoscopeForm, /feature:'advanced_analysis',root:/);
  assert.match(matching, /feature:'marriage_matching',root:/);
  assert.match(policy, /const feature=event\?\.detail\?\.feature;\s*if\(!FEATURES\.has\(feature\)\)return;/);
});

test("All three apps use one synchronized cache release; Horoscope runtime revision is bumped", () => {
  const expected = "20261106-horoscope-benefits-export-policy-v1";
  const versions = workers.map(source => /const SMV_CACHE_RELEASE='([^']+)'/.exec(source)?.[1]);
  assert.deepEqual(versions, [expected, expected, expected]);
  const runtime = /const RUNTIME_REVISION='([^']+)'/.exec(workers[1])?.[1];
  assert.equal(runtime, "v266-horoscope-benefits-export-policy-20261106");
});

test("No origin-wide browser data or Cache API clearing is introduced", () => {
  assert.doesNotMatch(policy, /localStorage\.clear\(/);
  assert.doesNotMatch(policy, /caches\.delete\(/);
  assert.doesNotMatch(store, /indexedDB\.deleteDatabase/);
});
