/**
 * BPHS I Santhanam Chapter 26 pp.257-258 independent angular oracle,
 * Chapter 27 verse 19 quarter signed Pinda + full Mercury/Jupiter.
 */
import assert from 'node:assert/strict';
import {bphsSputaDrishtiVirupa as sputa,bphsSputaDrishtiDetail as detail} from '../public/horoscope/offline/bphs-sputa-drishti.browser.mjs';
import {drikBalaClassical,drigAspectorBenefic} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
let checks=0;
const near=(a,b,label)=>{assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.000001,label+' actual '+a+' expected '+b);checks++};
const yes=(a,label)=>{assert.ok(a,label);checks++};
const ordinary=[
 [0,0],[15,0],[30,0],[45,7.5],[60,15],[75,30],[90,45],
 [105,37.5],[120,30],[135,15],[150,0],[165,30],[180,60],
 [195,52.5],[210,45],[225,37.5],[240,30],[255,22.5],
 [270,15],[285,7.5],[300,0],[330,0]
];
for(const [angle,expected] of ordinary)
 near(sputa(angle,'சூரியன்'),expected,'BPHS general '+angle);
const specials=[
 ['செவ்வாய்',90,60],['செவ்வாய்',105,52.5],['செவ்வாய்',119,45.5],
 ['செவ்வாய்',210,60],['செவ்வாய்',225,52.5],['செவ்வாய்',239,45.5],
 ['குரு',120,60],['குரு',135,45],['குரு',149,31],
 ['குரு',240,60],['குரு',255,52.5],['குரு',269,45.5],
 ['சனி',60,60],['சனி',75,60],['சனி',89,60],
 ['சனி',270,60],['சனி',285,52.5],['சனி',299,45.5]
];
for(const [name,angle,expected] of specials)
 near(sputa(angle,name),expected,'BPHS special '+name+' '+angle);
for(const a of [-360,-270,-90,0,90,180,270,360,450])
 for(const name of ['சூரியன்','செவ்வாய்','குரு','சனி'])
 near(sputa(a,name),sputa(((a%360)+360)%360,name),'wrap '+name+' '+a);
for(const name of ['செவ்வாய்','குரு','சனி'])
 for(let angle=0;angle<360;angle+=1.5){
  const virupa=sputa(angle,name);
  yes(virupa>=0&&virupa<=60,'Virupa bound');
 }
near(detail(90,'செவ்வாய்').ordinaryVirupa,45,'Mars base fourth aspect');
near(detail(90,'செவ்வாய்').specialAddedVirupa,15,'Mars extra fourth aspect');
near(detail(120,'குரு').specialAddedVirupa,30,'Jupiter extra fifth aspect');
near(detail(60,'சனி').specialAddedVirupa,45,'Saturn extra third aspect');
assert.throws(()=>sputa(NaN,'சனி'),TypeError);checks++;
assert.throws(()=>sputa(Infinity,'குரு'),TypeError);checks++;
// Independent linear-interpolation oracle using published breakpoints instead
// of production's if/else ordinary aspect branches.
const knots=[[30,0],[60,15],[90,45],[120,30],[150,0],[180,60],[300,0]];
function oracle(angle,name){
 const a=((angle%360)+360)%360;
 let base=0;
 for(let i=0;i<knots.length-1;i++){
   const [begin,y0]=knots[i],[end,y1]=knots[i+1];
   if(a>=begin&&a<end){base=y0+(y1-y0)*(a-begin)/(end-begin);break;}
 }
 let extra=0;
 if(name==='செவ்வாய்'&&((a>=90&&a<120)||(a>=210&&a<240)))extra=15;
 if(name==='குரு'&&((a>=120&&a<150)||(a>=240&&a<270)))extra=30;
 if(name==='சனி'&&((a>=60&&a<90)||(a>=270&&a<300)))extra=45;
 return Math.max(0,Math.min(60,base+extra));
}
for(const name of ['சூரியன்','செவ்வாய்','குரு','சனி'])
 for(let a=0;a<360;a+=1.125)
  near(sputa(a,name),oracle(a,name),'independent BPHS speculum '+a);
const births=[['1971-05-04','05:05'],['1974-01-11','16:04'],
 ['1992-07-31','22:05'],['1994-06-15','13:03'],['2015-09-06','09:30']];
const seven=new Set(['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']);
let grahaTests=0;const totals=[];
for(const [date,time] of births){
 const r=await full({date,time,lat:11.232,lon:78.88,
   utcOffsetMinutes:330,referenceDate:'2026-10-17',name:'BPHS Drig QA'});
 yes(r.ok,'chart generated '+date);
 const ps=r.chart.planets,row={date,virupa:{}};
 for(const receiver of ps.filter(p=>seven.has(p.name))){
  let quarter=0,extra=0;
  for(const p of ps.filter(q=>seven.has(q.name)&&q.name!==receiver.name)){
   const angle=((receiver.longitude-p.longitude)%360+360)%360;
   const v=oracle(angle,p.name),sign=drigAspectorBenefic(p.name,ps)?1:-1;
   quarter+=sign*v/4;
   if(p.name==='குரு'||p.name==='புதன்')extra+=sign*v;
  }
  const independent=quarter+extra;
  near(drikBalaClassical(receiver.name,ps),independent,date+' raw BPHS Drig '+receiver.name);
  near(receiver.strength3.components.drik,Number(independent.toFixed(3)),date+' Phase3 Drig '+receiver.name);
  yes(receiver.strength3.classicalCertified===false,date+' not false whole Shadbala certificate');
  row.virupa[receiver.name]=Number(independent.toFixed(3));grahaTests++;
 }
 totals.push(row);
}
yes(grahaTests===35,'35 seven-graha Drig computations');
console.log(JSON.stringify({pass:true,checks,verified35NatalDrig:true,
  bpHsSource:'Santhanam Chapter 26 pp257-258 and Chapter 27 v19',
  sourceLevelFix:true,fullSixBalaCertified:false,results:totals}));
