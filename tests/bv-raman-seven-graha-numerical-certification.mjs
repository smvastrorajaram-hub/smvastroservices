import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { calculateBVRamanShadbala as calculateBrowser } from '../public/horoscope/offline/bv-raman-shadbala.browser.mjs';
const require=createRequire(import.meta.url);
const nodeRaman=require('../bv-raman-shadbala.cjs');
const names=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
let assertions=0;
const ok=(v,m)=>{assert.ok(v,m);assertions++};
const eq=(a,b,m)=>{assert.equal(a,b,m);assertions++};
const near=(a,b,t,m)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=t,m+' actual='+a+' expected='+b+' tolerance='+t);assertions++};
const planets=[
 {name:'சூரியன்',longitude:180+53/60+55/3600,bhava:9},
 {name:'சந்திரன்',longitude:311+17/60+19/3600,bhava:1},
 {name:'செவ்வாய்',longitude:229+30/60+34/3600,bhava:10},
 {name:'புதன்',longitude:181+31/60+34/3600,bhava:6},
 {name:'குரு',longitude:84+0/60+49/3600,bhava:9},
 {name:'சுக்கிரன்',longitude:171+9/60+56/3600,bhava:7},
 {name:'சனி',longitude:124+22/60+41/3600,bhava:11}
];
const frame='BV_RAMAN_PRINTED_STANDARD_HOROSCOPE_CHAPTER_VI';
const provenance='B.V. Raman, Graha and Bhava Balas, 13th ed., Chapter VI, Examples 49–51, printed Standard Horoscope';
const chesta={
 'செவ்வாய்':{meanLongitude:266.34,trueLongitude:229.50,sheeghroccaLongitude:181.23},
 'புதன்':{meanLongitude:181.23,trueLongitude:181.52,sheeghroccaLongitude:174.49},
 'குரு':{meanLongitude:66.91,trueLongitude:84.01,sheeghroccaLongitude:181.23},
 'சுக்கிரன்':{meanLongitude:181.23,trueLongitude:171.16,sheeghroccaLongitude:158.35},
 'சனி':{meanLongitude:111.23,trueLongitude:124.39,sheeghroccaLongitude:181.23}
};
for(const input of Object.values(chesta)){
 input.referenceFrames={mean:frame,true:frame,sheeghrocca:frame};
 input.sourceProvenance=provenance;
}
const args={
 planets,bhavas:[],ascendantLongitude:298+27/60,midheavenLongitude:216+30/60,
 apparentSolarHour:14.336,
 temporal:{abdaLord:'சனி',masaLord:'புதன்',dinaLord:'புதன்',horaLord:'சந்திரன்',tribhagaLord:'சனி',solarTimeMethod:'independent standard-chart fixture'},
 declinations:{'சூரியன்':-8.75,'சந்திரன்':-10.75,'செவ்வாய்':-22.528,'புதன்':-9,'குரு':23.5,'சுக்கிரன்':-4.96,'சனி':13},
 jdUt:Date.UTC(1918,9,16,14,6,16)/86400000+2440587.5,
 ayanamsa:(202+10/60)-(180+53/60+55/3600),classicalChestaInputs:chesta
};
const browser=calculateBrowser(args),node=nodeRaman.calculateBVRamanShadbala(args);
eq(browser.classicalCertified,false,'standard worked example does not certify arbitrary natal inputs');
eq(node.classicalCertified,false,'Node standard worked example does not certify arbitrary natal inputs');
eq(Object.keys(browser.planets).length,7,'browser result includes all seven grahas');
eq(Object.keys(node.planets).length,7,'Node result includes all seven grahas');
const oracle={
 'சூரியன்':{sthana:198,dig:48.10,kala:102.98,cheshta:0,naisargika:60,drik:15.86,required:300,total:424.94},
 'சந்திரன்':{sthana:126.50,dig:31.56,kala:202.04,cheshta:0,naisargika:51.43,drik:-21.73,required:360,total:389.80},
 'செவ்வாய்':{sthana:172.06,dig:55.70,kala:30.06,cheshta:22.23,naisargika:17.14,drik:0.95,required:300,total:298.14},
 'புதன்':{sthana:279.50,dig:21.09,kala:192.79,cheshta:2.30,naisargika:25.70,drik:15.64,required:420,total:537.02},
 'குரு':{sthana:157.58,dig:11.50,kala:211.18,cheshta:35.26,naisargika:34.28,drik:-16.04,required:390,total:433.76},
 'சுக்கிரன்':{sthana:178.20,dig:15.15,kala:115.53,cheshta:5.95,naisargika:42.85,drik:18.47,required:330,total:376.15},
 'சனி':{sthana:177.30,dig:58.02,kala:116.97,cheshta:21.14,naisargika:8.57,drik:7.21,required:300,total:389.21}
};
const expectedWholePercent={'சூரியன்':142,'சந்திரன்':108,'செவ்வாய்':99,'புதன்':128,'குரு':111,'சுக்கிரன்':114,'சனி':130};
const results=[];
for(const name of names){
 const r=browser.planets[name],n=node.planets[name],c=r.components,e=oracle[name];
 ok(r.available===true&&r.complete===true,name+' worked example has all six Bala inputs');
 near(c.sthana.total,e.sthana,0.06,name+' printed Sthana value');
 near(c.dig,e.dig,name==='புதன்'?0.08:0.06,name+' printed Dig value');
 near(c.kala.total,e.kala,0.08,name+' printed Kala value');
 near(c.cheshta,e.cheshta,0.02,name+' printed Cheshta value');
 near(c.naisargika,e.naisargika,0.001,name+' printed Naisargika value');
 near(c.drik,e.drik,0.08,name+' printed Drig value');
 const sixTermSum=[c.sthana.total,c.dig,c.kala.total,c.cheshta,c.naisargika,c.drik].reduce((a,b)=>a+b,0);
 near(r.totalVirupa,sixTermSum,1e-9,name+' full Virupa equals independently assembled six-term sum');
 near(r.totalVirupa,e.total,0.25,name+' full Virupa reconciles with printed component arithmetic');
 near(r.totalRupa,Number((r.totalVirupa/60).toFixed(3)),1e-9,name+' Rupa conversion equals Virupa divided by 60 rounded to three decimals');
 near(r.requiredVirupa,e.required,0,name+' source-required Virupa');
 const ratio=r.totalVirupa/e.required;
 near(r.ratio,ratio,0.0005,name+' ratio equals total Virupa divided by required Virupa');
 eq(r.isStrong,r.totalVirupa>=e.required,name+' threshold uses the unrounded total');
 eq(Math.round(ratio*100),expectedWholePercent[name],name+' displayed rounded percentage');
 near(n.totalVirupa,r.totalVirupa,1e-9,name+' Node/browser total parity');
 near(n.totalRupa,r.totalRupa,1e-9,name+' Node/browser Rupa parity');
 near(n.ratio,r.ratio,1e-9,name+' Node/browser ratio parity');
 eq(n.isStrong,r.isStrong,name+' Node/browser threshold parity');
 results.push({planet:name,totalVirupa:+r.totalVirupa.toFixed(3),totalRupa:+r.totalRupa.toFixed(3),
  requiredRupa:+(r.requiredVirupa/60).toFixed(2),ratioPercent:+(ratio*100).toFixed(3),
  displayPercent:Math.round(ratio*100),meetsMinimum:r.isStrong});
}
const rankOrder=[...results].sort((a,b)=>b.totalVirupa-a.totalVirupa).map(x=>x.planet);
eq(rankOrder.join(','),['புதன்','குரு','சூரியன்','சந்திரன்','சனி','சுக்கிரன்','செவ்வாய்'].join(','),
 'independent total-based seven-graha ranking');
eq(results.find(x=>x.planet==='செவ்வாய்').meetsMinimum,false,
 'Mars is below the five-Rupa minimum in this printed worked example');
const rankByName=new Map(rankOrder.map((name,index)=>[name,index+1]));
console.log(JSON.stringify({pass:true,assertions,scope:'B.V. Raman printed Standard Horoscope worked-example numerical arithmetic only',
 source:provenance,results:results.map(r=>({...r,rank:rankByName.get(r.planet)})),
 fullArbitraryNatalCertification:false,historicalNatalTrueLongitudeCertified:false}));
