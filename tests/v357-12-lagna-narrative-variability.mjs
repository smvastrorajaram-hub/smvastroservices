// V357: 12 ascendants × 2 independent planetary placements × TA/EN
// Non-repetition and context sensitivity of the existing D1 human narrative.
// Structural output oracle; human astrologer quality is NOT certified.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {render}=require('../public/horoscope/d1-human-narrative.js');
const LORD=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const P=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const signOf=(n)=>(n%12+12)%12;
const make=(lagna,variant)=>{
 const planets={};
 for(const [i,key] of P.entries()){
  const sign=signOf((variant===0?[4,3,0,2,8,6,10,5,11][i]:[6,10,4,7,1,9,3,11,5][i])+lagna);
  planets[key]={key,sign,house:signOf(sign-lagna)+1,dignity:'neutral',combust:false};
 }
 const houses=Array.from({length:12},(_,idx)=>{
  const sign=signOf(lagna+idx);
  const no=idx+1;
  return {no,sign,lord:LORD[sign],occupants:P.filter(x=>planets[x].house===no),aspects:[]};
 });
 return {lagna,planets,houses};
};
let assertions=0;
const ok=(val,msg)=>{assert.ok(val,msg);assertions++};
const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);assertions++};
const fingerprint=report=>report.topics.map(x=>x.paragraphs.map(p=>p.text).join(' ')).join('\n');
const leadFingerprints={ta:new Set(),en:new Set()};
const samples=[];
for(const language of ['ta','en']){
 for(let lagna=0;lagna<12;lagna++){
  const charts=[make(lagna,0),make(lagna,1)];
  for(const d of charts){
   const out=render(d,language);
   eq(out.topics.length,12,language+' '+lagna+' all 12 houses');
   eq(out.topics.map(x=>x.evidence.houseLord),d.houses.map(x=>x.lord),language+' '+lagna+' correct sign ownership');
   for(const [j,topic] of out.topics.entries()){
    eq(topic.number,j+1,language+' '+lagna+' numbering');
    ok(topic.paragraphs.length>0,language+' '+lagna+' house '+(j+1)+' contains report text');
    ok(topic.paragraphs.every(p=>typeof p.text==='string'&&p.text.length>40),language+' '+lagna+' complete prose not broken');
   }
  }
  const a=render(charts[0],language),b=render(charts[1],language);
  ok(fingerprint(a)!==fingerprint(b),language+' '+lagna+' different graha placements must alter report');
  ok(a.topics[0].paragraphs[0].text!==b.topics[0].paragraphs[0].text,language+' '+lagna+' Lagna lord changed => altered character evidence');
  const first=a.topics[0].paragraphs[0].text;
  ok(!leadFingerprints[language].has(first),language+' '+lagna+' ascendant-specific lead, not name substitution');
  leadFingerprints[language].add(first);
  samples.push({language,lagna,houseCount:a.topics.length,firstLeadChars:first.length});
 }
 eq(leadFingerprints[language].size,12,'12 distinct '+language+' ascendant opening readings');
}
console.log(JSON.stringify({pass:true,assertions,ascendants:12,chartVariantsPerAscendant:2,languages:['ta','en'],testedNarratives:48,scope:'D1 narrative distinctness and house-lord ownership; NOT qualitative or timed dasha certification',shodhana:'SKIPPED',samples:samples.slice(0,4)}));