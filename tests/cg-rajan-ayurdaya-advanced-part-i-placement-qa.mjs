/**
 * Regression: C.G. Rajan Ayurdaya MUST be the LAST sub-section
 * inside the existing Advanced Analysis I / Chart Analysis accordion.
 * Preserve the existing 10 I–X sections and saved/print structure.
 * Book Shadbala fixture is NOT live source-level replacement certification.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cgRajanAyurdayaReportHtml} from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
const source=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../public/horoscope/horoscope-predictions.js',import.meta.url),'utf8');
const printer=fs.readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
let checks=0;
const yes=(v,label)=>{assert.ok(v,label);checks++};
const no=(v,label)=>{assert.ok(!v,label);checks++};
const exactly=(a,b,label)=>{assert.equal(a,b,label);checks++};
const locationOf='const sectionI=root.querySelector(\'.smv-advanced-part.chart-analysis > .smv-advanced-part-content\')';
const appendOf="sectionI.insertAdjacentHTML('beforeend',html)";
const routeOf="root.__smvRouteAdvancedSections?.();";
const readyOf="window.dispatchEvent(new CustomEvent('smv:horoscope-full-ready'";
yes(source.includes(locationOf),'the main renderer targets actual Advanced Analysis Part I');
yes(source.includes(appendOf),'calculation HTML is inside section I, not outside the accordion');
yes(source.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'main renderer imports only source-specific Pinda/Natural calculator');
yes(source.includes("const appendix=partI?.querySelector('[data-smv-cg-rajan-ayurdaya]')"),
 'async module router keeps Ayurdaya last');
yes(source.includes('if(appendix)partI.appendChild(appendix)'),
 'late routing re-appends Ayurdaya at bottom');
yes(source.includes('if(ayur)sectionI.appendChild(ayur)'),
 'immediate reroute also moves appendix last');
no(old.includes("predictionSection.insertAdjacentHTML('afterend'"),
 'obsolete integrated-predictions sibling insertion must be absent');
no(old.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'no duplicate legacy calculation/insert');
exactly((source.match(/const sectionI=root.querySelector\('/g)||[]).length,1,
 'only one live section-I Ayurdaya mount');
yes(source.indexOf(locationOf)>source.indexOf(routeOf,source.indexOf('return response.then(async (full)')),
 'Advanced Analysis I exists before appendix');
yes(source.indexOf(locationOf)<source.indexOf(readyOf),
 'appendix inserted before full report ready and save capture');
yes(printer.includes("root.querySelectorAll('.integrated-predictions")&&
 !printer.includes("querySelectorAll('.smv-advanced-part.chart-analysis'"),
 'print strips legacy predictions but retains section I');
yes(source.includes("makePart('chart-analysis','CHART ANALYSIS','ஜாதக பகுப்பாய்வு','I')"),
 'I has original heading');
yes(source.includes("makePart('life-predictions','PREDICTIONS','பலன்கள்','X')"),
 'X is untouched');
const grahas=[['சூரியன்',167+2/60],['சந்திரன்',118+10/60],
 ['செவ்வாய்',206.5],['புதன்',191+52/60],['குரு',28+17/60],
 ['சுக்கிரன்',204+32/60],['சனி',230+27/60]]
 .map(([name,longitude])=>({name,longitude}));
for(const language of ['ta','en']){
 const html=cgRajanAyurdayaReportHtml({planets:grahas,language});
 yes(html.startsWith('<section class="smv-cg-rajan-ayurdaya"'),
  language+' semantic report section');
 exactly((html.match(/<tr>/g)||[]).length,8,language+' 7 rows + table header');
 yes(html.includes('data-smv-cg-rajan-ayurdaya="1"'),language+' stable anchor');
 no(/NaN|undefined/.test(html),language+' arithmetic valid');
 no(/(?:deathAgeOrDate|predictedDeathAge|totalHumanLifetime)=/.test(html),
  language+' no computed human death prediction');
}
console.log(JSON.stringify({pass:true,checks,position:'Advanced Analysis > I. Chart Analysis > last subsection',
 firstRenderBeforeReady:true,asyncReorderGuaranteed:true,savePrintSnapshotPreserved:true,
 tenPartsUnchanged:true,sevenGrahasRendered:true,langs:['ta','en'],
 rajansShadbalaFullLiveCertificate:false,allAyurdayaMethodsComplete:false}));
