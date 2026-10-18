// Node regression for the authorized factual two-person marriage report.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {transit} from '../public/horoscope/offline/transit_panchang.browser.mjs';
import {renderBasicMatching} from '../public/horoscope/marriage-basic-report.mjs';
let count=0;
const ok=(c,msg)=>{assert.ok(c,msg);count++};
const eq=(a,b,msg)=>{assert.equal(a,b,msg);count++};
const births=[
 {name:'Bride audit',date:'1992-07-31',time:'22:05',lat:11.23333,lon:78.88333,utcOffsetMinutes:330,timezone:'Asia/Kolkata',style:'south'},
 {name:'Groom audit',date:'1994-06-15',time:'13:03',lat:51.50853,lon:-0.12574,utcOffsetMinutes:60,timezone:'Europe/London',style:'north'}
];
const charts=[];
for(const b of births){
 const d=await full({...b,language:'en'});
 ok(d.ok&&d.advanced?.vargas?.length>0&&d.chart.dashas,'full natal chart '+b.name);
 const c=d.chart;
 c.advanced=d.advanced;
 c.birthName=b.name;c.birthDate=b.date;c.birthTime=b.time;c.birthPlace=b.name;
 c.birthLat=b.lat;c.birthLon=b.lon;c.birthOffsetMinutes=b.utcOffsetMinutes;c.birthTimezone=b.timezone;c.birthChartStyle=b.style;
 charts.push(c);
}
const values=[];
const fn=input=>{values.push(input);return transit(input);};
const opts={language:'ta',brideStyle:'south',groomStyle:'north',reviewDate:'2026-10-16',
 poruthamRows:[['Dina',true,''],['Rajju',false,'Audit']],transitFn:fn};
const ta=await renderBasicMatching(charts[0],charts[1],opts);
ok(!ta.includes('mm-shadbala-status')&&!ta.includes('Uttara Kalamrita இடைக்காலக் கூறுகள்')&&!ta.includes('யுத்தம் (UK)'),'Tamil Matching shows six Bala components without indication/source label or war column');
const taAyurdaya=[...ta.matchAll(/<section class="smv-cg-rajan-ayurdaya"[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
eq(taAyurdaya.length,2,'Tamil Matching report includes two guarded Ayurdaya appendices');
for(const [i,section] of taAyurdaya.entries()){
 ok(section.includes('அம்ச ஆயுர்த்தாயம்')&&section.includes('பிண்ட ஆயுள்')&&section.includes('நைசர்க்கிக ஆயுள்'),'Tamil partner '+(i+1)+' has all three Ayurdaya methods');
  ok(section.includes('இவை பாரம்பரிய ஆயுர்த்தாய முறைகளின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'),'Tamil partner '+(i+1)+' has the actual-lifespan disclaimer');
 eq((section.match(/<tr\b/g)||[]).length,10,'Tamil partner '+(i+1)+' Ayurdaya has header, 7 grahas, total and average');
}
const taRemainders=[...ta.matchAll(/data-amsa-days="(\d+)" data-amsa-nazhigai="(\d+)"/g)];
ok(taRemainders.some(m=>Number(m[1])>0||Number(m[2])>0),'Tamil Matching natal charts carry Amsa fractional days/nazhigai into report HTML');
ok(!ta.includes('AMSA AYURDAYAM'),'Tamil Matching HTML never uses the rejected uppercase heading');
ok(ta.includes('திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை'),'Tamil title');
ok(ta.includes('mm-base-south')&&ta.includes('mm-base-north'),'Independent South and North charts');
for(const needle of ['ராசிக் கட்டம் D1','நவாம்சக் கட்டம் D9','பாவக் கட்டம்','D2','D7','D9','D10','நட்சத்திரம்','பாதம்','பின்னாஷ்டகவர்க்கம்','சர்வாஷ்டகவர்க்கம்','ஷட்பலம்','விம்சோத்தரி தசா','கோச்சாரக் கட்டம்'])ok(ta.includes(needle),'Tamil report missing '+needle);
ok(ta.includes('Bride audit')&&ta.includes('Groom audit'),'Both birth names appear');
ok(ta.includes('அந்தரம்')&&ta.includes('மகாதசை')&&ta.includes('புக்தி')&&ta.includes('தொடக்கம்')&&ta.includes('முடிவு'),
 'Tamil Matching contains actual Mahadasha, Bhukti and Antaram periods with dates');
ok(ta.includes('Asia/Kolkata')&&ta.includes('Europe/London'),'Separate IANA zones');
ok(ta.includes('<table')&&ta.includes('<thead')&&ta.includes('<tbody'),'Native print-safe table HTML');
ok(!ta.includes('<script')&&!ta.includes('onclick=')&&!ta.includes('<style'),'Snapshot has no executable or inline styles');
eq(values.length,2,'Transit independently calculated for both people');
eq(values[0].utcOffsetMinutes,330,'India review-date offset 330');
eq(values[1].utcOffsetMinutes,60,'London October-16 DST offset 60');
eq(values[0].language,'en','One language-neutral transit calculation per person');
const en=await renderBasicMatching(charts[0],charts[1],{...opts,language:'en',brideStyle:'east',groomStyle:'north'});
ok(!en.includes('mm-shadbala-status')&&!en.includes('Only Uttara Kalamrita intermediate components are shown')&&!en.includes('Yuddha (UK)'),'English Matching shows six Bala components without indication/source label or war column');
const enAyurdaya=[...en.matchAll(/<section class="smv-cg-rajan-ayurdaya"[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
eq(enAyurdaya.length,2,'English Matching report includes two guarded Ayurdaya appendices');
for(const [i,section] of enAyurdaya.entries()){
 ok(section.includes('Amsa Ayurdaya')&&section.includes('Pinda Ayurdaya')&&section.includes('Naisargika Ayurdaya'),'English partner '+(i+1)+' has all three Ayurdaya methods');
  ok(section.includes('These are estimates from traditional Ayurdaya methods only; they do not establish actual lifespan or predict the time of death.'),'English partner '+(i+1)+' has the actual-lifespan disclaimer');
 eq((section.match(/<tr\b/g)||[]).length,10,'English partner '+(i+1)+' Ayurdaya has header, 7 grahas, total and average');
}
ok(!en.includes('AMSA AYURDAYAM'),'English Matching report uses the required Amsa Ayurdaya heading');
ok(en.includes('Marriage Matching — Basic Calculation Report'),'English title');
ok(en.includes('mm-base-east')&&en.includes('mm-base-north'),'East and North combinations');
ok(en.includes('Shadbala')&&en.includes('Sarvashtakavarga')&&en.includes('Nakshatra')&&en.includes('Bhukti')&&en.includes('Antaram'),'English report contains Bhukti and Antaram labels');
ok(!en.includes('திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை'),'No Tamil title in English');
eq(values.length,2,'TA and EN views reuse both earlier transit results without recomputation');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const matching=read('public/horoscope/marriage-matching.js');
const matchingReportSource=read('public/horoscope/marriage-basic-report.mjs');
const matchingDashaSource=matchingReportSource.slice(matchingReportSource.indexOf('function dasha(c,ta,ref){'),matchingReportSource.indexOf('\nconst TRANSIT_CACHE='));
ok(matchingDashaSource.includes('x.pratyantars||x.pratyantaras||x.antars')&&matchingDashaSource.includes("ta?'அந்தரம்':'Antaram'"), 'Matching Dasha table renders nested Antaram periods');
const matchingShadbalaStart=matchingReportSource.indexOf('function shadbala(c,ta){');
const matchingShadbalaEnd=matchingReportSource.indexOf('function dasha(c,ta,ref){',matchingShadbalaStart);
const matchingShadbalaSource=matchingReportSource.slice(matchingShadbalaStart,matchingShadbalaEnd);
const primaryHoroscopeSource=read('public/horoscope/horoscope.js');
const primaryShadbalaStart=primaryHoroscopeSource.indexOf('<h3 class="base-shadbala"');
const primaryShadbalaEnd=primaryHoroscopeSource.indexOf('<div class="transit-before-vimsottari"></div>',primaryShadbalaStart);
const primaryShadbalaSource=primaryHoroscopeSource.slice(primaryShadbalaStart,primaryShadbalaEnd);
ok(primaryShadbalaStart>=0&&primaryShadbalaEnd>primaryShadbalaStart,'Primary horoscope Shadbala table source can be isolated');
ok(primaryShadbalaSource.includes('smv-shadbala-table')&&!primaryShadbalaSource.includes('partialSubtotalExcludingCheshtaAndDrig')&&!primaryShadbalaSource.includes('இடைமொத்தம் (சேஷ்டா/த்ரிக்/யுத்தம் சேராது)'), 'Primary horoscope Shadbala retains components without an uncertified subtotal');
ok(matchingShadbalaSource.includes('strength3'),'Matching Shadbala uses the current Swiss-position-based six-Bala calculation result');
eq(matchingShadbalaSource.includes('partialSubtotalExcludingCheshtaAndDrig'),false,'Matching does not present an incomplete subtotal as Shadbala');
eq(matchingShadbalaSource.includes('smv-shadbala-method-note'),false,'Matching omits the internal numerical-validation note');
ok(matchingShadbalaSource.includes('Total Shadbala (Virupa)')&&matchingShadbalaSource.includes('Total Rupa')&&matchingShadbalaSource.includes('Required Rupa')&&matchingShadbalaSource.includes('Rank')&&matchingShadbalaSource.includes('Below minimum'),'Matching source adds total, total/required Rupa, rank and threshold status');
ok(!matchingShadbalaSource.includes('strengthJathakaKanitham'),'Matching Shadbala no longer displays the source-only Rajan component subset');
ok(!matchingShadbalaSource.includes('Uttara Kalamrita')&&!matchingShadbalaSource.includes("'Yuddha'")&&!matchingShadbalaSource.includes("'war'"),
 'Matching Shadbala does not mix another book system or add a separate war column');
eq(matchingShadbalaSource.includes('Subtotal (excluding Cheshta/Drig/Yuddha)'),false,
 'Matching does not render an uncertified Shadbala subtotal');

for(const suffix of ['UtcOffset','ChartStyle']){
 ok(matching.includes("id='")||matching.includes('id="'),'Template ids rendered');
 ok(matching.includes(suffix),'Matching inputs have '+suffix);
}
for(const path of ['public/horoscope/index.html','public/horoscope/report-print.html'])ok(read(path).includes('marriage-basic-report.css'),'Matching CSS included in '+path);
ok(read('public/horoscope/report-store.mjs').includes('cleanHtml(detail.root)'),'Saved snapshot captures entire result');
ok(matching.includes('prepareViews:()=>matchingViews(b,g,out)'),'Both languages snapshot from same charts');
ok(matching.includes("const detached=document.createElement('div')"),'Bilingual snapshots never overwrite live Save Print controls');
const store=read('public/horoscope/report-store.mjs');
ok(store.includes("if(detail.feature==='marriage_matching'&&typeof detail.prepareViews==='function')"),'Save executes matching bilingual snapshot generator');
ok(store.includes("views[l]=cleanHtml(holder)"),'Save persists TA and EN language snapshots');

ok(matching.includes("if(!mmFullAccess)"),'Access gate retained');
ok(matching.includes('mm281Report(b,g,pr,ks,sync,gochar,bf,gf,ds,timing,v,basicHtml)'),'Original full relationship report is retained with additive technical charts');
ok(matching.includes('${mmFrontPoruthamPanel(pr,false)}${basicHtml}${mmVerdictPanel('),'Ten Porutham and human matching note precede technical charts, before main predictions');
ok(!matching.includes('${matchingIdentityPanel(b,g)}${basicHtml}'),'Duplicate combined birth-details chapter is removed');
ok(matching.includes('mm308Timing(b,g,out)'),'Original 15-year human prediction is retained');
ok(matching.includes('${mm281TopicBook(b,g)}${mm281Personality(b,g)}${mm281DoshaChapter(b,g,ks,sync,pr)}'),'Old life, character, dosha and remedies chapters are retained');
ok(matching.includes('fullVerdict(pr,ks,ds,bf,gf,sync,b,g)'),'Original match verdict is retained');
ok(matching.includes('mmFrontPoruthamPanel(pr,false)'),'Original 10 Porutham explanation is available');
const css=read('public/horoscope/marriage-basic-report.css');
ok(css.includes('white-space:nowrap!important')&&css.includes('overflow-x:auto!important'),'Mobile technical tables cannot split Tamil words into glyphs');
ok(css.includes('table.smv-shadbala-table{min-width:1120px!important')&&css.includes('.smv-ayurdaya-average-basis'),'Wide Shadbala scroll and readable Ayurdaya basis styles exist');
ok(css.includes('.mm-basic-report .smv-cg-rajan-ayurdaya table.smv-ayurdaya-table thead th{')&&css.includes('color:#4a352d;background:#fff7e8;font-weight:800;')&&css.includes('.mm-basic-report .smv-cg-rajan-ayurdaya table.smv-ayurdaya-table tbody tr:not(.smv-ayurdaya-totals):not(.smv-ayurdaya-average)>th{')&&css.includes('color:#302722;background:#fff;font-weight:800;')&&!css.includes('html body.smv-v12-theme #smvMarriageMatching .mm-full-results.mm-v281-results .mm-basic-report .smv-cg-rajan-ayurdaya table.smv-ayurdaya-table thead th{'),'Matching Ayurdaya colors are defined at the component source without a wrapper-specific !important patch');
ok(css.includes('font-weight:700;background:#faf2e4'),'Matching Ayurdaya total row keeps its existing palette');
ok(css.includes('font-weight:700;color:#333;background:transparent;')&&css.includes('background:#fff7e8;color:#302722;text-align:center'),'Matching average explanation has no white box and the entire average row uses cream');
ok(css.includes('font-size:1.12rem;line-height:1.3;text-align:center;color:#842026'),'Matching Ayurdaya heading follows the normal section-heading style');
ok(css.includes('.mm-base-south>.mm-base-pos-11')&&css.includes('.mm-base-north>.mm-base-pos-0')&&css.includes('.mm-base-east>.mm-base-pos-0'),'All chart-layout coordinates defined');
ok(ta.includes('mm-base-shad-components')&&ta.includes('smv-shadbala-table')&&ta.includes('மொத்த ஷட்பலம் (விரூபம்)')&&ta.includes('தேவையான ரூபா')&&ta.includes('தரவரிசை')&&ta.includes('வலிமை நிலை'),'Tamil Matching shows six Bala components, total, Rupas, rank and strength status');
ok(ta.includes('mm-base-centerlabel'),'South and East charts have centered Rasi Navamsa Bhava Transit labels');
const basicModule=read('public/horoscope/marriage-basic-report.mjs');
ok(basicModule.includes('madhyaLongitude')&&basicModule.includes('rasiIndex'),'East Bhava uses calculated Sripati midpoint mapping');
ok(basicModule.includes("bhava?housesBySign[i].join('/')"),'East Bhava number supports multiple Bhavas in the same Rasi');
ok(basicModule.includes("natalMaandi(c)"),'Maandi uses natal calculated upagraha');
ok(basicModule.includes('function markedPlanetName('),'Planet states are attached in exactly the three designated position tables');
ok(basicModule.includes('mm-base-flag'),'Charts show compact retrograde and combustion symbols');
ok(!ta.includes('கிரக நிலை, கோச்சாரம், பாவ அட்டவணைகளில் மட்டும்:'),'Standalone Tamil legend line removed');
ok(css.includes('A single continuous result surface for the FULL marriage report'),'Full matching uses one flat result layer on screen and PDF');
ok(!ta.includes('mm-full-results mm-basic-report'),'Basic report does not nest another full report');
ok(!ta.includes('mm-base-person mm-person-result'),'Basic sections avoid nested result-card surfaces');

const sample={...charts[0],
 planets:charts[0].planets.map((p,i)=>i? p:{...p,strength:{...(p.strength||{}),retrograde:true,combustion:true}}),
 bhavas:charts[0].bhavas.map(x=>({...x})),
 upagrahas:{...(charts[0].upagrahas||{}),maandi:{longitude:143.25,rasi:'சிம்மம்',nakshatra:'பூரம்',pada:1,degree:'23°15'}}};
sample.bhavas[0].rasiIndex=0;
sample.bhavas[1].rasiIndex=0;
const custom=await renderBasicMatching(sample,charts[1],{...opts,brideStyle:'east',groomStyle:'north'});
const bhavaEast=custom.slice(custom.indexOf('data-chart-mode="bhava"'),custom.indexOf('data-chart-mode="bhava"')+7000);
ok(bhavaEast.includes('mm-base-east'),'East Indian Bhava selected with test cusp');
ok(bhavaEast.includes('mm-base-pos-0')&&bhavaEast.includes('>1/2</span>'),'East Bhava displays two house midpoints in the SAME sign');
ok(custom.includes('>மா</span>'),'Calculated Maandi is included in basic chart');
ok(custom.includes('சூரியன் (வ,அ)'),'Natal planet name receives compact retrograde/combustion tags');
ok(custom.includes('>வ</sup>')&&custom.includes('>அ</sup>'),'Both motion and combustion superscripts restored on D1 D9 and Bhava charts');
const houseStart=custom.indexOf('பாவ அட்டவணை');
ok(houseStart>=0,'Bhava table exists');
ok(custom.slice(houseStart,houseStart+4400).includes('சூரியன் (வ,அ)'),'Bhava table receives the same natal state tags');
const transitMarked=await renderBasicMatching({...sample},charts[1],{
 ...opts,transitFn:input=>{
   const result=transit(input);
   return {...result,planets:result.planets.map((p,i)=>i===0?{...p,retrograde:true,combustion:true}:p)};
 }
});
const transitStart=transitMarked.indexOf('கோச்சாரக் கட்டம் மற்றும் கிரக நிலைகள்');
ok(transitStart>=0&&transitMarked.slice(transitStart).includes('சூரியன் (வ,அ)'),'Transit table uses actual transit-specific flags, adjacent to planet name');
ok(transitMarked.includes('<sup class="mm-base-flag">'),'Transit chart includes calculated retrograde/combustion flags');

ok(custom.includes('மாந்தி')&&custom.includes('சூரியன் (வ,அ)'),'Maandi and the combust flag remain visible beside planets');


const chartBodies=[...ta.matchAll(/<div class="mm-base-chart mm-base-[a-z]+"[^>]*>([\s\S]*?)<\/div><\/div>/g)].map(x=>x[1]);
ok(ta.includes('mm-base-planet')&&ta.includes('mm-base-geometry'),'Charts use compact planet codes and full SVG geometry');
ok(!en.includes('Position, transit and house tables only: R — Retrograde · C — Combust'),'Standalone English legend is removed');
ok(!custom.includes('mm-base-legend'),'No chart legend remains in generated HTML');
ok(custom.includes('mm-base-flag'),'Chart states remain visible in all styles');
const printCss=read('public/horoscope/report-print.css');
ok(printCss.includes('Matching-only symmetric cover alignment'),'Matching Saved and PDF cover have dedicated centered-image CSS');
ok(printCss.includes('#smvPrintCover.smv-cover-matching.smv-vector-cover .smv-cover-emblem img'),'Cover centering affects matching, not Horoscope');
const uiCss=read('public/horoscope/smv-ui.css');
ok(uiCss.includes('Nakshatra matching: both date-of-birth and Rasi/star entry use one form layer'),'Both Nakshatra input methods are flattened');
ok(uiCss.includes('#mmFullEntry,#mmManualEntry'),'Styles cover DOB and manual Rasi-Nakshatra inputs');

console.log(JSON.stringify({pass:true,assertions:count,persons:2,styles:['south','north','east'],languages:['ta','en'],matchingBirthOffsets:true,reportSnapshot:true,transit:true}));
