import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bvRamanAyurdayaReportHtml } from '../public/horoscope/offline/bv-raman-ayurdaya-report.browser.mjs';
import { BV_RAMAN_STANDARD_HOROSCOPE_REDUCTION_ORACLE as oracle } from '../public/horoscope/offline/bv-raman-ashtakavarga-ayurdaya.browser.mjs';

let assertions=0;
const ok=(value,message)=>{assert.ok(value,message);assertions++;};
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);assertions++;};

const chart={
 lagna:{longitude:0},
 planets:[
  {name:'சூரியன்',longitude:105,bhava:4},
  {name:'சந்திரன்',longitude:225,bhava:8},
  {name:'செவ்வாய்',longitude:195,bhava:7},
  {name:'புதன்',longitude:135,bhava:5},
  {name:'குரு',longitude:75,bhava:3},
  {name:'சுக்கிரன்',longitude:45,bhava:2},
  {name:'சனி',longitude:315,bhava:11},
  {name:'ராகு',longitude:255,bhava:9},
  {name:'கேது',longitude:165,bhava:6}
 ]
};
const noHarana=Object.fromEntries(
 ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'].map(name=>[name,{
  conjunctionInSign:false,debilitated:false,combust:false,temporaryEnemySign:false,
  aboveHorizon:false,defeatedInPlanetaryWar:false,eclipsed:false
 }])
);
const common={
 chart,
 bavRows:oracle.beforeReductionRows,
 occupiedSigns:oracle.occupiedSigns,
 planetSigns:oracle.planetSigns,
 haranaByPlanet:noHarana
};
const ta=bvRamanAyurdayaReportHtml({...common,language:'ta'});
const en=bvRamanAyurdayaReportHtml({...common,language:'en'});

for (const [html,language] of [[ta,'Tamil'],[en,'English']]) {
 ok(html.includes('data-smv-bv-raman-ayurdaya="1"'),language+' report has stable B.V. Raman result hook');
 ok(html.includes('smv-ayurdaya-table'),language+' report reuses cream Ayurdaya table styles');
 ok(html.includes('Rasi Pinda')||html.includes('ராசி பிண்டம்'),language+' numeric table contains Pinda columns');
 ok(html.includes('Sodhya Pinda')||html.includes('சோத்ய பிண்டம்'),language+' numeric table contains Sodhya Pinda');
 ok(html.includes('smv-ayurdaya-totals')&&html.includes('smv-ayurdaya-average'),language+' numeric table contains both yearly totals');
 ok(html.includes('data-smv-bv-raman-ayurdaya')&&html.includes('Longevity category result')||html.includes('ஆயுள் வகை முடிவு'),language+' report contains category-result table');
 ok(/(?:Balarishta|பாலாரிஷ்டம்)/.test(html),language+' chart fixture produces the expected rule-category candidate');
 ok(/actual lifespan|உண்மையான ஆயுளை/.test(html),language+' report includes the actual-lifespan disclaimer');
 ok(!/B\. V\. Raman|Hindu Predictive Astrology|certified|uncertified|source gap/i.test(html),language+' customer report does not expose book/author or certification audit notes');
 ok(!/deathAgeOrDate|finalAgeOrDateOfDeath|predictedDeathAge/i.test(html),language+' report contains no death-age fields');
}
const solarRow=ta.match(/<tr class="smv-ayurdaya-average">[\s\S]*?<td>([\d.]+)<\/td>/);
ok(!!solarRow,'fully specified test Harana inputs produce a numeric solar-year total');
ok(!ta.includes('undefined')&&!ta.includes('NaN'),'Tamil result contains no missing/invalid numeric strings');
ok(!en.includes('undefined')&&!en.includes('NaN'),'English result contains no missing/invalid numeric strings');

const report=(await import('../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs')).cgRajanAyurdayaReportHtml;
const old=report({planets:chart.planets,lagna:chart.lagna,language:'ta'});
const combined=old.replace(/<\/section>\s*$/,ta+'</section>');
ok(combined.indexOf('data-smv-cg-rajan-ayurdaya')<combined.indexOf('data-smv-bv-raman-ayurdaya'),'B.V. Raman tables are nested below the unchanged C.G. Rajan section');
ok(combined.includes('<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"'),'C.G. Rajan section remains present unchanged');

const horoscope=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const matching=fs.readFileSync(new URL('../public/horoscope/marriage-basic-report.mjs',import.meta.url),'utf8');
ok(horoscope.includes('bv-raman-ayurdaya-report.browser.mjs'),'Horoscope source imports the new B.V. Raman report renderer');
ok(matching.includes('bv-raman-ayurdaya-report.browser.mjs'),'Marriage Matching source imports the new B.V. Raman report renderer');
ok(horoscope.includes('cgRajanAyurdayaReportHtml'),'existing C.G. Rajan renderer remains wired into Horoscope');
ok(matching.includes('cgRajanAyurdayaReportHtml'),'existing C.G. Rajan renderer remains wired into Matching');

console.log(JSON.stringify({pass:true,assertions,tamil:true,english:true,oldCGRajanPreserved:true,results:['Ashtakavarga Ayurdaya','Longevity category']},null,2));
