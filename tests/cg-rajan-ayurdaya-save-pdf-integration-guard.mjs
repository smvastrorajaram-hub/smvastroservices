/**
 * Source-level guard for the Saved Report and print/PDF path.
 * Save/Print removes the RETIRED .integrated-predictions subtree.
 * The Rajan appendix must live INSIDE the actual Advanced Analysis
 * I / Chart Analysis content at the end (and never have print suppression).
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cgRajanAyurdayaReportHtml as html}
 from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
let count=0;
const check=(cond,msg)=>{assert.ok(cond,msg);count++};
const horoscope=readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const predictions=readFileSync(new URL('../public/horoscope/horoscope-predictions.js',import.meta.url),'utf8');
const saver=readFileSync(new URL('../public/horoscope/report-store.mjs',import.meta.url),'utf8');
const printer=readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
const form=readFileSync(new URL('../public/horoscope/horoscope-form.js',import.meta.url),'utf8');
check(saver.includes("'.integrated-predictions,"),
 'Save explicitly strips legacy integrated subtree');
check(printer.includes("'.integrated-predictions,"),
 'PDF explicitly strips legacy integrated subtree');
check(horoscope.includes("sectionI.insertAdjacentHTML('beforeend',html)"),
 'Rajan appendix is inside I / Chart Analysis, not retired integrated subtree');
check(horoscope.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'Main renderer waits for source-specific arithmetic before report-ready event');
check(horoscope.includes("sectionI.querySelectorAll('[data-smv-cg-rajan-ayurdaya]').forEach(node=>node.remove())"),
 'Duplicate report append prevented');
check(!predictions.includes("predictionSection.insertAdjacentHTML('afterend',"),
 'Retired predictions insertion is not re-enabled');
check(form.includes("const buildViews=async()=>"),'Bilingual save snapshot handler present');
const chart=[
 ['சூரியன்',167+2/60],['சந்திரன்',118+10/60],
 ['செவ்வாய்',206.5],['புதன்',191+52/60],
 ['குரு',28+17/60],['சுக்கிரன்',204+32/60],
 ['சனி',230+27/60]
].map(([name,longitude])=>({name,longitude}));
for(const language of ['ta','en']){
 const result=html({planets:chart,language});
 check(result.startsWith('<section class="smv-cg-rajan-ayurdaya"'),
  'Standalone printable section '+language);
 check(!result.includes('data-print-technical="1"'),
  'Do not mark as hidden appendix '+language);
 check(result.includes('data-smv-cg-rajan-ayurdaya="1"'),
  'Stable report section marker '+language);
 check((result.match(/<tr\b/g)||[]).length===10,
  'Header + seven grahas + total + average rows '+language);
 check((result.includes('Pinda Ayurdaya')&&result.includes('Naisargika Ayurdaya')&&result.includes('Amsa Ayurdaya'))||
       (result.includes('பிண்ட ஆயுள்')&&result.includes('நைசர்க்கிக ஆயுள்')&&result.includes('அம்ச ஆயுள்')),
  'Three-method table columns '+language);
 check(result.includes('Average Ayurdaya')||result.includes('சராசரி ஆயுள்'),
  'Three-total mean row '+language);
 check(!result.includes('<script')&&!result.includes('onload='),
  'Safe snapshot HTML '+language);
}
console.log(JSON.stringify({pass:true,checks:count,
 visibleLiveHoroscope:true,preservedSavedPdfInsidePartI:true,
 birthDeathPrediction:false,fullEightMethodCertified:false}));
