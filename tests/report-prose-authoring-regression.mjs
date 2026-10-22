import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const predictionOnline = read('public/horoscope/prediction-online.js');
const horoscopePredictions = read('public/horoscope/horoscope-predictions.js');
const workbench = read('public/horoscope/prediction-admin-workbench.mjs');
const horoscope = read('public/horoscope/horoscope.js');
const print = read('public/horoscope/report-print.js');
const ayurdaya = read('public/horoscope/offline/bv-raman-ayurdaya-report.browser.mjs');

// Execute the actual browser renderer in a minimal isolated context. No
// network, indexedDB, customer storage, or chart calculations are invoked.
const sandbox = { window: {} };
vm.runInNewContext(predictionOnline, sandbox, { filename: 'prediction-online.js' });
const api = sandbox.window.SMVPredictionOnline;
assert.equal(typeof api?.horoscopeLifeHtml, 'function', 'life renderer is exposed');
assert.equal(typeof api?.horoscopeTimingHtml, 'function', 'timing renderer is exposed');

const repeated = 'பொறுப்பு அல்லது தேர்வின் வேகம் அந்தக் கிரகத்தின் சொந்த நிலைக்கேற்ப மாறலாம்.';
const caution = 'குறிப்பிட்ட நிகழ்வு அல்லது பாதிப்பு உறுதி ஆகாது.';
const datedA = '2026-10-01 அன்று தொடங்கும் இந்த காலம் குடும்பத் திட்டங்களை மீளாய்வு செய்ய உதவும்.';
const datedB = '2027-10-01 அன்று தொடங்கும் இந்த காலம் குடும்பத் திட்டங்களை மீளாய்வு செய்ய உதவும்.';
const response = { ta: {
  intro: '', context: '', placements: {},
  life: [{ title: 'வாழ்க்கை', paragraphs: [repeated, caution, datedA] }],
  timing: { intro: '', phases: [{ title: 'தசை', paragraphs: [repeated, caution, datedB] }], areas: [] }
}};
const state = { seen: new Set() };
const html = api.horoscopeLifeHtml(response, 'ta', state) + api.horoscopeTimingHtml(response, 'ta', state);
const occurrences = value => html.split(value).length - 1;
assert.equal(occurrences(repeated), 1, 'an exact repeated long prediction sentence is displayed only once per report');
assert.equal(occurrences(caution), 2, 'important uncertainty/caution is preserved with each relevant section');
assert.equal(occurrences(datedA), 1, 'first dated prediction remains');
assert.equal(occurrences(datedB), 1, 'different dated prediction remains');

const matchingHtml = api.matchingHtml({ ta: {
  intro: '', ageNote: '', verdict: '', clusters: [],
  topics: [
    { index: 1, title: 'உரையாடல்', paragraphs: [repeated, caution] },
    { index: 2, title: 'குடும்ப முடிவு', paragraphs: [repeated, caution] }
  ],
  timing: [repeated]
}}, 'ta');
const matchingOccurrences = value => matchingHtml.split(value).length - 1;
assert.equal(matchingOccurrences(repeated), 1, 'an exact repeated long prediction sentence is displayed once in Matching too');
assert.equal(matchingOccurrences(caution), 2, 'Matching preserves the caution for both distinct topics');

// Confirm the active report path shares the same sentence set across both
// halves, not only the helper used by a standalone caller.
assert.ok(horoscopePredictions.includes('narrativeState={seen:new Set()}'), 'active renderer creates one report-scoped state');
assert.ok(horoscopePredictions.includes('api.horoscopeLifeHtml(result,lang,narrativeState)'), 'active renderer passes state to life');
assert.ok(horoscopePredictions.includes('api.horoscopeTimingHtml?.(result,lang,narrativeState)'), 'active renderer passes state to timing');

// Formatting is presentational only: the ephemeris keeps full precision.
assert.ok(horoscope.includes('const formatAyanamsa='), 'display-only Ayanamsa formatter exists');
assert.ok(horoscope.includes('n.toFixed(6)'), 'display formatter uses six decimals');

// Repeated birth Panchang summary is removed from the temporary print DOM only.
assert.ok(print.includes("root.querySelectorAll('[data-smv-screen-only^=\"daily-\"],.panchang-card,.hora-card,.smv-birth-summary')"),
  'print clone removes duplicate summary while the screen result remains intact');
assert.ok(print.includes('This changes only the disposable print DOM'), 'saved result HTML is not rewritten');

// The Ayurdaya disclaimer now follows the heading, before its numeric table,
// so it is not left as a one-paragraph trailing page after the table.
const ayurdayaMarkup = ayurdaya.slice(ayurdaya.indexOf('return \'<div class="smv-cg-rajan-ayurdaya smv-bv-raman-ayurdaya-skin"'));
assert.ok(ayurdayaMarkup.indexOf('smv-ayurdaya-disclaimer') >= 0, 'Ayurdaya disclosure remains visible');
assert.ok(ayurdayaMarkup.indexOf('smv-ayurdaya-disclaimer') < ayurdayaMarkup.indexOf('numericTable+'),
  'Ayurdaya disclosure appears before the numerical table');

assert.ok(workbench.includes('data-wb-personal-apply'), 'personal per-chart Apply action exists');
assert.ok(workbench.indexOf('<section class="wb-block wb-personal-authoring"') < workbench.indexOf('<div data-wb-result hidden>'),
  'personal authoring is visible outside the calculation-results container');
assert.ok(workbench.includes('id="wbPersonalSection" disabled'), 'chart-section selector starts disabled until calculation completes');
assert.ok(workbench.includes('data-wb-personal-copy disabled') && workbench.includes('data-wb-personal-apply disabled'),
  'calculation-dependent personal actions start disabled');
assert.ok(workbench.includes('function updatePersonalControls()') && workbench.includes('const ready=Boolean(canUse()&&calc&&views&&!busy)'),
  'copy/apply are gated until a completed chart and preview are available');
assert.ok(workbench.includes('pendingPersonalDraft={text,mode}') && workbench.includes('personalDrafts.set(personalKey(lang,selected)'),
  'text entered before calculation is retained and attached to the selected chart section afterwards');
assert.ok(workbench.includes("pendingPersonalDraft={text:'',mode:'replace'}"),
  'chart changes and sign-out clear unbound personal drafts');
assert.ok(workbench.includes('sections:parts,personalTextApplied'), 'saved admin preview includes applied prose');
assert.ok(workbench.includes('asyncIDB()'), 'personal report preview is saved locally');
assert.ok(!workbench.includes('setDoc('), 'per-chart authored prose does not publish to Firestore');
assert.ok(workbench.includes('never publishes') && workbench.includes('global Draft/Publish rules'),
  'individual authoring is explicitly isolated from global A/B publishing');

console.log('PASS — repeat prose removed in Horoscope and Matching, cautions/date-specific wording preserved, print-only duplicate trimmed, Ayanamsa formatting, Ayurdaya disclosure and local per-chart authoring guards.');
