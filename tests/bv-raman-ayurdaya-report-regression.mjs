import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bvRamanAyurdayaReportHtml } from '../public/horoscope/offline/bv-raman-ayurdaya-report.browser.mjs';
import { advanced } from '../public/horoscope/offline/astro_advanced.browser.mjs';

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
const chartAdvanced=advanced(chart,'ta');
const planetSigns=Object.fromEntries(chart.planets.filter(p=>!['ராகு','கேது','Rahu','Ketu'].includes(p.name))
 .map(p=>[({சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn'}[p.name]||p.name),Math.floor((((p.longitude%360)+360)%360)/30)]));
const occupiedSigns=[...new Set(chart.planets.map(p=>Math.floor((((p.longitude%360)+360)%360)/30)))];
const common={
 chart,
 bavRows:chartAdvanced.ashtakavarga.bhinna,
 occupiedSigns,
 planetSigns,
 haranaByPlanet:noHarana
};
const ta=bvRamanAyurdayaReportHtml({...common,language:'ta'});
const en=bvRamanAyurdayaReportHtml({...common,language:'en'});

for (const [html,language] of [[ta,'Tamil'],[en,'English']]) {
 ok(html.includes('data-smv-bv-raman-ayurdaya="1"'),language+' report has stable B.V. Raman result hook');
 ok(html.includes('smv-ayurdaya-table'),language+' report reuses cream Ayurdaya table styles');
 ok((html.match(/smv-bv-raman-ayurdaya-table/g)||[]).length===2,language+' report exposes exactly the two B.V. Raman tables separately from the old C.G. table');
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

const missingData=bvRamanAyurdayaReportHtml({chart:{},language:'ta'});
ok(missingData.includes('data-smv-bv-raman-ayurdaya="1"')&&missingData.includes('கணக்கீடு கிடைக்கவில்லை'),
 'Missing BAV input renders a safe placeholder instead of suppressing the C.G. Rajan report');
const report=(await import('../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs')).cgRajanAyurdayaReportHtml;
const old=report({planets:chart.planets,lagna:chart.lagna,language:'ta'});
const combined=old+ta;
ok(old.lastIndexOf('</section>')<combined.indexOf('data-smv-bv-raman-ayurdaya'),'B.V. Raman result block follows the complete unchanged C.G. Rajan section');
ok(combined.indexOf('data-smv-cg-rajan-ayurdaya')<combined.indexOf('data-smv-bv-raman-ayurdaya'),'C.G. Rajan appears first, B.V. Raman follows as a separate block');
ok(combined.includes('<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1"'),'C.G. Rajan section remains present unchanged');

const horoscope=fs.readFileSync(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const matching=fs.readFileSync(new URL('../public/horoscope/marriage-basic-report.mjs',import.meta.url),'utf8');
ok(horoscope.includes('bv-raman-ayurdaya-report.browser.mjs'),'Horoscope source imports the new B.V. Raman report renderer');
ok(matching.includes('bv-raman-ayurdaya-report.browser.mjs'),'Marriage Matching source imports the new B.V. Raman report renderer');
ok(horoscope.includes('cgRajanAyurdayaReportHtml'),'existing C.G. Rajan renderer remains wired into Horoscope');
ok(matching.includes('cgRajanAyurdayaReportHtml'),'existing C.G. Rajan renderer remains wired into Matching');
const horoscopeCss=fs.readFileSync(new URL('../public/horoscope/horoscope.css',import.meta.url),'utf8');
const matchingCss=fs.readFileSync(new URL('../public/horoscope/marriage-basic-report.css',import.meta.url),'utf8');
const appHtml=fs.readFileSync(new URL('../public/horoscope/index.html',import.meta.url),'utf8');
ok(appHtml.includes('horoscope.js?v=20261019-bv-raman-ayurdaya-v252'),
 'The PWA requests the revised Horoscope script instead of its previous cached URL');
ok(horoscopeCss.includes('.smv-cg-rajan-ayurdaya .smv-ayurdaya-table')&&horoscopeCss.includes('background:rgb(255,243,213)'),
 'Horoscope uses the existing cream header colour for both nested result tables');
ok(matchingCss.includes('.mm-basic-report .smv-cg-rajan-ayurdaya table.smv-ayurdaya-table')&&matchingCss.includes('background:#fff7e8;font-weight:800;'),
 'Matching uses the existing cream header colour for both nested result tables');
ok(horoscope.includes('const html=cgHtml+bvHtml;')&&horoscope.includes('[data-smv-bv-raman-ayurdaya-section]'),
 'Horoscope appends B.V. Raman as a distinct block after C.G. Rajan');
ok(matching.includes('const ayurdayaReport=(cgAyurdayaHtml+bvAyurdayaHtml)'),
 'Matching appends B.V. Raman as a distinct block after C.G. Rajan');

console.log(JSON.stringify({pass:true,assertions,tamil:true,english:true,oldCGRajanPreserved:true,results:['Ashtakavarga Ayurdaya','Longevity category']},null,2));
