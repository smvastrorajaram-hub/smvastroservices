/**
 * Save/Print guard: customer snapshots may contain only an explicitly approved
 * Ayurdaya category label, never a visible calculation table or rule trace.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ayurdayaCustomerSummaryHtml as summary}
 from '../public/horoscope/offline/ayurdaya-customer-summary.browser.mjs';

let count=0;
const check=(cond,msg)=>{assert.ok(cond,msg);count++};
const horoscope=readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const matching=readFileSync(new URL('../public/horoscope/marriage-basic-report.mjs',import.meta.url),'utf8');
const predictions=readFileSync(new URL('../public/horoscope/horoscope-predictions.js',import.meta.url),'utf8');
const saver=readFileSync(new URL('../public/horoscope/report-store.mjs',import.meta.url),'utf8');
const printer=readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
const form=readFileSync(new URL('../public/horoscope/horoscope-form.js',import.meta.url),'utf8');

check(saver.includes("'.integrated-predictions,"),'Save explicitly strips retired integrated subtree');
check(printer.includes("'.integrated-predictions,"),'PDF explicitly strips retired integrated subtree');
check(printer.includes("const dashaTree=root.querySelector('#dashaTree')")&&printer.includes('dasha-head-print')&&!printer.includes('rawDasha.remove()'),
  'PDF print transform retains full Dasa/Bhukti/Antaram hierarchy');
check(horoscope.includes("sectionI.insertAdjacentHTML('beforeend',html)"),
  'approved category result is inserted inside Advanced Analysis I');
check(/await import\('\.\/offline\/ayurdaya-customer-summary\.browser\.mjs\?v=[^']+'\)/.test(horoscope),
  'Horoscope uses category-only renderer');
check(matching.includes('ayurdayaCustomerSummaryHtml({classification:c.ayurdayaClassification,language})'),
  'Marriage Matching uses the same category-only renderer');
check(!horoscope.includes('cgRajanAyurdayaReportHtml'),'Horoscope never inserts the raw C.G. Rajan calculation table');
check(!matching.includes('cgRajanAyurdayaReportHtml'),'Matching never inserts the raw C.G. Rajan calculation table');
check(horoscope.includes("const appendix=partI?.querySelector('[data-smv-ayurdaya-customer-summary]')"),
  'late module routing preserves the new summary anchor');
check(horoscope.includes("sectionI.querySelectorAll('[data-smv-ayurdaya-customer-summary]').forEach(node=>node.remove())"),
  'duplicate summary result is prevented');
check(!horoscope.includes('data-smv-cg-rajan-ayurdaya'),'old detailed calculation anchor is not customer-mounted');
check(!predictions.includes("predictionSection.insertAdjacentHTML('afterend',"),
  'retired predictions insertion is not re-enabled');
check(form.includes('const buildViews=async()=>'),'Bilingual save snapshot handler remains present');

for(const language of ['ta','en']){
  const approved=summary({classification:{category:'alpayu',certified:true,customerDisplayAllowed:true},language});
  check(approved.includes(language==='ta'?'அல்பாயுள்':'Alpayu'),'approved result label is printable '+language);
  check(!/Pinda|Harana|graha|planet|Lagna|house|Sun|Moon|Rasi|Shadbala|data-raw|Raw:/i.test(approved),
    'saved/printed result contains no calculation details '+language);
  check(summary({classification:{category:'alpayu',certified:false,customerDisplayAllowed:true},language})==='',
    'uncertified classification is excluded from saved/printed report '+language);
}

console.log(JSON.stringify({pass:true,checks:count,
  customerCalculationDetailsExposed:false,
  uncertifiedCategoriesPublished:false,
  savedReportAndNativePrintPipelinePreserved:true}));
