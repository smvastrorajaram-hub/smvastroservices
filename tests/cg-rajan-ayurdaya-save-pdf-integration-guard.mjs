/**
 * Source-level guard for the Saved Report and print/PDF path.
 * Old cleanHtml removes .integrated-predictions. The Rajan appendix
 * must be inserted NEXT TO that subtree, not under it, and must not
 * carry the technical-only print suppression marker.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cgRajanAyurdayaReportHtml as html}
 from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
let count=0;
const check=(cond,msg)=>{assert.ok(cond,msg);count++};
const predictions=readFileSync(new URL('../public/horoscope/horoscope-predictions.js',import.meta.url),'utf8');
const saver=readFileSync(new URL('../public/horoscope/report-store.mjs',import.meta.url),'utf8');
const printer=readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
const form=readFileSync(new URL('../public/horoscope/horoscope-form.js',import.meta.url),'utf8');
check(saver.includes("'.integrated-predictions,"),
 'Save explicitly strips legacy integrated subtree');
check(printer.includes("'.integrated-predictions,"),
 'PDF explicitly strips legacy integrated subtree');
check(predictions.includes("predictionSection.insertAdjacentHTML('afterend',"),
 'Rajan appendix is a sibling, not a descendant of removed tree');
check(predictions.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'Report waits to compute the research appendix');
check(predictions.includes("root.querySelector('[data-smv-cg-rajan-ayurdaya]')"),
 'Duplicate report append prevented');
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
 check((result.match(/<tr>/g)||[]).length===8,
  'Seven grahas in a standalone table '+language);
 check(!result.includes('<script')&&!result.includes('onload='),
  'Safe snapshot HTML '+language);
}
console.log(JSON.stringify({pass:true,checks:count,
 visibleLiveHoroscope:true,preservedSavedPdfBySibling:true,
 birthDeathPrediction:false,fullEightMethodCertified:false}));
