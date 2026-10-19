/**
 * Regression: only a gated Ayurdaya category summary may appear as the LAST
 * sub-section inside the existing Advanced Analysis I / Chart Analysis accordion.
 * Internal C.G. Rajan arithmetic remains unit-tested separately, not customer-rendered.
 * Book Shadbala fixture is NOT live source-level replacement certification.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cgRajanAyurdayaReportHtml} from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
const source=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const old=fs.readFileSync(new URL('../public/horoscope/horoscope-predictions.js',import.meta.url),'utf8');
const printer=fs.readFileSync(new URL('../public/horoscope/report-print.js',import.meta.url),'utf8');
const astro=fs.readFileSync(new URL('../public/horoscope/offline/astro_advanced.browser.mjs',import.meta.url),'utf8');
let checks=0;
const yes=(v,label)=>{assert.ok(v,label);checks++};
const no=(v,label)=>{assert.ok(!v,label);checks++};
const exactly=(a,b,label)=>{assert.equal(a,b,label);checks++};
const locationOf='const sectionI=root.querySelector(\'.smv-advanced-part.chart-analysis > .smv-advanced-part-content\')';
const appendOf="sectionI.insertAdjacentHTML('beforeend',html)";
const routeOf="root.__smvRouteAdvancedSections?.();";
const readyOf="window.dispatchEvent(new CustomEvent('smv:horoscope-full-ready'";
yes(source.includes(locationOf),'the main renderer targets actual Advanced Analysis Part I');
yes(source.includes(appendOf),'category result is inside section I, not outside the accordion');
yes(/await import\('\.\/offline\/ayurdaya-customer-summary\.browser\.mjs\?v=[^']+'\)/.test(source),
 'main renderer imports the gated category-only result component');
yes(source.includes("const appendix=partI?.querySelector('[data-smv-ayurdaya-customer-summary]')"),
 'async module router keeps the result last');
yes(source.includes('if(appendix)partI.appendChild(appendix)'),
 'late routing re-appends the result at bottom');
yes(source.includes('if(ayur)sectionI.appendChild(ayur)'),
 'immediate reroute also moves result last');
no(old.includes("predictionSection.insertAdjacentHTML('afterend'"),
 'obsolete integrated-predictions sibling insertion must be absent');
no(old.includes("await import('./offline/cg-rajan-ayurdaya-pinda.browser.mjs')"),
 'no duplicate legacy calculation/insert');
no(source.includes('cgRajanAyurdayaReportHtml'),'customer renderer does not call the raw calculation-table builder');
exactly((source.match(/const sectionI=root.querySelector\('/g)||[]).length,1,
 'only one live section-I Ayurdaya mount');
yes(source.indexOf(locationOf)>source.indexOf(routeOf,source.indexOf('return response.then(async (full)')),
 'Advanced Analysis I exists before appendix');
yes(source.indexOf(locationOf)<source.indexOf(readyOf),
 'appendix inserted before full report ready and save capture');
yes(printer.includes("root.querySelectorAll('.integrated-predictions")&&
 !printer.includes("querySelectorAll('.smv-advanced-part.chart-analysis'"),
 'print strips legacy predictions but retains section I');
yes(printer.includes("const dashaTree=root.querySelector('#dashaTree')")&&printer.includes('dasha-head-print')&&!printer.includes('rawDasha.remove()'),
 'Vimshottari tree is preserved in native PDF');
yes(source.includes("makePart('chart-analysis','CHART ANALYSIS','ஜாதக பகுப்பாய்வு','I')"),
 'I has original heading');
yes(source.includes("makePart('life-predictions','PREDICTIONS','பலன்கள்','X')"),
 'X is untouched');
yes(astro.includes("const arudhaLabel=h===1?'AL':h===12?'UL':`A${h}`;"),
 '12 arudha rows label the first AL, middle A2–A11, final UL');
yes(source.includes("p1Title('Arudha Padas','ஆரூட பாதங்கள்')")&&!source.includes('Arudha Padas (A1–A12)')&&!source.includes('ஆரூட பாதங்கள் (A1–A12)'),
 'Arudha section heading omits the A1–A12 suffix');
yes(source.includes('p1ArudhaLabel(x,i)')&&source.includes('const p1ArudhaLabel=(x,i=0)=>{const h=Number(x?.house);'),
 'Arudha first column explicitly renders AL, A2-A11 and UL from house number');
no(source.includes("<th>#</th><th>${p1Title('Arudha','ஆரூடம்')}"),
 'redundant numeric ordinal column removed; label is the first column');
const grahas=[['சூரியன்',167+2/60],['சந்திரன்',118+10/60],
 ['செவ்வாய்',206.5],['புதன்',191+52/60],['குரு',28+17/60],
 ['சுக்கிரன்',204+32/60],['சனி',230+27/60]]
 .map(([name,longitude],i)=>{
  const totalVirupa=[700,600,500,400,300,200,100][i];
  return {name,longitude,bhava:i+1,strength6:{
   available:true,components:{sthana:{total:totalVirupa},dig:0,kala:{total:0},cheshta:0,naisargika:0,drik:0},
   totalVirupa,classicalCertified:false
  }};
 });
const lagna={longitude:5};
for(const language of ['ta','en']){
 const html=cgRajanAyurdayaReportHtml({planets:grahas,lagna,language});
 yes(html.startsWith('<section class="smv-cg-rajan-ayurdaya"'),
  language+' semantic report section');
 exactly((html.match(/<tr\b/g)||[]).length,9,language+' one method: header + seven grahas + selected total');
 const pindaLabel=language==='ta'?'பிண்ட ஆயுள்':'Pinda Ayurdaya';
 const naturalLabel=language==='ta'?'நைசர்க்கிக ஆயுள்':'Naisargika Ayurdaya';
 const amsaLabel=language==='ta'?'அம்ச ஆயுர்த்தாயம்':'Amsa Ayurdaya';
 yes(html.includes(pindaLabel)&&!html.includes(naturalLabel)&&!html.includes(amsaLabel),
  language+' only strongest-Sun Pinda method is visible');
 no(html.includes('Average Ayurdaya')||html.includes('சராசரி ஆயுர்த்தாயம்'),
  language+' customer report excludes mean/average');
 const totalRow=html.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
 exactly((totalRow.match(/<strong>/g)||[]).length,1,language+' selected total is the only bold total');
 no(html.includes('data-natural-harana=')||html.includes('data-amsa-harana='),
  language+' unselected natural/Amsa graha rows are not exposed');
 yes(html.includes('data-smv-cg-rajan-ayurdaya="1"'),language+' stable anchor');
 exactly((html.match(/data-pinda-harana="raw-unadjusted"/g)||[]).length,7,
  language+' all seven selected Pinda terms are clearly marked raw when Harana evidence is missing');
 no(html.includes('data-natural-harana=')||html.includes('data-amsa-harana='),
  language+' unselected method rows are not leaked into customer HTML');
 yes(html.includes(language==='ta'?'மூல மதிப்பு: ':'Raw: '),
  language+' unresolved selected-method values are explicitly labelled');
 yes(html.includes('data-selected-total="raw-unadjusted"'),
  language+' includes the selected method raw sum when Harana remains unresolved');
 yes(html.includes(language==='ta'?'இது இறுதி ஆயுர்த்தாய மொத்தம் அல்ல':'this is not the final Ayurdaya total'),
  language+' distinguishes the raw sum from the unverified final total');
  no(/NaN|undefined/.test(html),language+' arithmetic valid');
 no(/(?:deathAgeOrDate|predictedDeathAge|totalHumanLifetime)=/.test(html),
  language+' no computed human death prediction');
}
console.log(JSON.stringify({pass:true,checks,position:'Advanced Analysis > I. Chart Analysis > last subsection',
 firstRenderBeforeReady:true,asyncReorderGuaranteed:true,savePrintSnapshotPreserved:true,
 tenPartsUnchanged:true,internalCalculationTraceRegression:true,langs:['ta','en'],
 rajansShadbalaFullLiveCertificate:false,allAyurdayaMethodsComplete:false}));
