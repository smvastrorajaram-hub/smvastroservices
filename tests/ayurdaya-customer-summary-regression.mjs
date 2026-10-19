import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ayurdayaCustomerSummaryHtml as render } from '../public/horoscope/offline/ayurdaya-customer-summary.browser.mjs';

const categories = [
  ['balarishta', 'பாலாரிஷ்டம்', 'Balarishta'],
  ['alpayu', 'அல்பாயுள்', 'Alpayu'],
  ['madhyayu', 'மத்தியாயுள்', 'Madhya ayu'],
  ['poornayu', 'பூர்ணாயுள்', 'Poorna ayu']
];
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
const equal = (actual, expected, message) => { assert.equal(actual, expected, message); assertions++; };

for (const [category, tamil, english] of categories) {
  const approved = { category, certified: true, customerDisplayAllowed: true };
  const ta = render({ classification: approved, language: 'ta' });
  const en = render({ classification: approved, language: 'en' });
  check(ta.includes(tamil), 'Tamil category label: ' + category);
  check(en.includes(english), 'English category label: ' + category);
  equal((ta.match(/<p\b/g) || []).length, 1, 'one result line only: ' + category);
  equal((en.match(/<p\b/g) || []).length, 1, 'one English result line only: ' + category);
  for (const html of [ta, en]) {
    check(html.includes('data-smv-ayurdaya-customer-summary="1"'), 'stable result section: ' + category);
    check(!/Pinda|Harana|graha|planet|Lagna|house|Sun|Moon|Rasi|Shadbala|data-raw|×|Raw:/i.test(html),
      'no rule, intermediate calculation, graha row or technical metadata: ' + category);
    check(!/death|மரணம்|\d{2,}/i.test(html), 'no age/date or fatalistic wording: ' + category);
  }
}

equal(render(), '', 'no category means no result is guessed');
equal(render({ classification: { category: 'alpayu', certified: false, customerDisplayAllowed: true } }), '',
  'uncertified category is suppressed');
equal(render({ classification: { category: 'alpayu', certified: true, customerDisplayAllowed: false } }), '',
  'category without explicit customer approval is suppressed');
equal(render({ classification: { category: 'invented', certified: true, customerDisplayAllowed: true } }), '',
  'unknown category is suppressed');
equal(render({ classification: { category: '<script>', certified: true, customerDisplayAllowed: true } }), '',
  'untrusted category text is never inserted into HTML');

const horoscope = fs.readFileSync(new URL('../public/horoscope/horoscope.js', import.meta.url), 'utf8');
const matching = fs.readFileSync(new URL('../public/horoscope/marriage-basic-report.mjs', import.meta.url), 'utf8');
check(horoscope.includes('ayurdaya-customer-summary.browser.mjs'), 'Horoscope uses category-only renderer');
check(matching.includes('ayurdaya-customer-summary.browser.mjs'), 'Marriage Matching uses category-only renderer');
check(!horoscope.includes('cgRajanAyurdayaReportHtml'), 'Horoscope does not insert calculation table into customer UI');
check(!matching.includes('cgRajanAyurdayaReportHtml'), 'Matching does not insert calculation table into customer report');

console.log(JSON.stringify({
  pass: true,
  assertions,
  categories,
  calculationDetailsExposed: false,
  unsupportedCategoryGuessed: false
}));
