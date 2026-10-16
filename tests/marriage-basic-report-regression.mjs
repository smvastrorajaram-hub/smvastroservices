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
ok(ta.includes('திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை'),'Tamil title');
ok(ta.includes('mm-base-south')&&ta.includes('mm-base-north'),'Independent South and North charts');
for(const needle of ['ராசிக் கட்டம் D1','நவாம்சக் கட்டம் D9','பாவக் கட்டம்','D2','D7','D9','D10','நட்சத்திரம்','பாதம்','பின்னாஷ்டகவர்க்கம்','சர்வாஷ்டகவர்க்கம்','ஷட்பலம்','விம்சோத்தரி தசா','கோச்சாரக் கட்டம்'])ok(ta.includes(needle),'Tamil report missing '+needle);
ok(ta.includes('Bride audit')&&ta.includes('Groom audit'),'Both birth names appear');
ok(ta.includes('Asia/Kolkata')&&ta.includes('Europe/London'),'Separate IANA zones');
ok(ta.includes('<table')&&ta.includes('<thead')&&ta.includes('<tbody'),'Native print-safe table HTML');
ok(!ta.includes('<script')&&!ta.includes('onclick=')&&!ta.includes('<style'),'Snapshot has no executable or inline styles');
eq(values.length,2,'Transit independently calculated for both people');
eq(values[0].utcOffsetMinutes,330,'India review-date offset 330');
eq(values[1].utcOffsetMinutes,60,'London October-16 DST offset 60');
eq(values[0].language,'en','One language-neutral transit calculation per person');
const en=await renderBasicMatching(charts[0],charts[1],{...opts,language:'en',brideStyle:'east',groomStyle:'north'});
ok(en.includes('Marriage Matching — Basic Calculation Report'),'English title');
ok(en.includes('mm-base-east')&&en.includes('mm-base-north'),'East and North combinations');
ok(en.includes('Shadbala')&&en.includes('Sarvashtakavarga')&&en.includes('Nakshatra')&&en.includes('Bhukti'),'English labels');
ok(!en.includes('திருமணப் பொருத்தம் — அடிப்படைக் கணக்கீட்டு அறிக்கை'),'No Tamil title in English');
eq(values.length,2,'TA and EN views reuse both earlier transit results without recomputation');
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const matching=read('public/horoscope/marriage-matching.js');
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
ok(matching.includes('mm281Report(b,g,pr,ks,sync,gochar,bf,gf,ds,timing,v)'),'Original full relationship report is restored');
ok(matching.includes("out.insertAdjacentHTML('beforeend',basicHtml)"),'Factual appendix is additive, not a full-report replacement');
ok(matching.includes('mm308Timing(b,g,out)'),'Original 15-year human prediction is retained');
ok(matching.includes('fullVerdict(pr,ks,ds,bf,gf,sync,b,g)'),'Original match verdict is retained');
ok(matching.includes('mmFrontPoruthamPanel(pr,false)'),'Original 10 Porutham explanation is available');
const css=read('public/horoscope/marriage-basic-report.css');
ok(css.includes('white-space:nowrap!important')&&css.includes('overflow-x:auto!important'),'Mobile technical tables cannot split Tamil words into glyphs');
ok(css.includes('.mm-base-south>.mm-base-pos-11')&&css.includes('.mm-base-north>.mm-base-pos-0')&&css.includes('.mm-base-east>.mm-base-pos-0'),'All chart-layout coordinates defined');
ok(ta.includes('mm-base-shad-components')&&ta.includes('mm-base-shad-total'),'Shadbala split into readable components and totals');
const chartBodies=[...ta.matchAll(/<div class="mm-base-chart mm-base-[a-z]+"[^>]*>([\s\S]*?)<\/div><\/div>/g)].map(x=>x[1]);
ok(ta.includes('mm-base-planet')&&ta.includes('mm-base-geometry'),'Charts use compact planet codes and full SVG geometry');

console.log(JSON.stringify({pass:true,assertions:count,persons:2,styles:['south','north','east'],languages:['ta','en'],matchingBirthOffsets:true,reportSnapshot:true,transit:true}));
