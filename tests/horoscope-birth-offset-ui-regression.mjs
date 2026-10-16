// Run: node tests/horoscope-birth-offset-ui-regression.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculatedOffsetHours,bindBirthOffsetUI} from '../public/horoscope/birth-offset-live.mjs';

let assertions=0;
function eq(actual,expected,note){assert.equal(actual,expected,note);assertions++;}
function contains(value,fragment,note){assert.ok(String(value).includes(fragment),note);assertions++;}
class FakeNode{
  constructor(value=''){this.value=value;this.dataset={};this.listeners={};this.textContent='';}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  emit(type){for(const fn of this.listeners[type]||[])fn();}
}
const ids=[
  'birthUtcOffset','smvBirthOffsetStatus',
  ...['english','tamil'].flatMap(p=>[p+'Dob',p+'Tob',p+'BirthTimezone',p+'BirthPlace']),
  'clearEnglishHoroscope','clearTamilHoroscope'
];
const nodes=Object.fromEntries(ids.map(k=>[k,new FakeNode()]));
const root={documentElement:{lang:'en'},getElementById:k=>nodes[k]??null};
const ui=bindBirthOffsetUI(root);
const out=nodes.birthUtcOffset;
eq(out.value,'','No misleading India default on incomplete form');
eq(out.dataset.offsetVerified,'0','No false verification on incomplete form');
function fill(prefix,date,time,zone){
  for(const [suffix,value] of [['Dob',date],['Tob',time],['BirthTimezone',zone]]){
    nodes[prefix+suffix].value=value;
    nodes[prefix+suffix].emit('input');
  }
}
fill('english','2026-01-15','12:00','Europe/London');
eq(out.value,'0','London January uses GMT +0, not India +5.5');
eq(out.dataset.offsetVerified,'1','London offset verified');
nodes.englishDob.value='2026-07-15';nodes.englishDob.emit('change');
eq(out.value,'1','London summer British Summer Time +1');
nodes.englishTob.value='10:05';nodes.englishTob.emit('input');
eq(out.value,'1','Changing birth time recomputes offset');
nodes.englishDob.value='2026-03-29';
nodes.englishTob.value='01:30';
nodes.englishDob.emit('change');
eq(out.value,'','Nonexistent DST-forward London local time must not show an offset');
eq(out.dataset.offsetVerified,'0','DST gap not marked verified');
contains(nodes.smvBirthOffsetStatus.textContent,'did not exist','DST gap error visible');
nodes.englishDob.value='2026-10-25';
nodes.englishTob.value='01:30';
nodes.englishDob.emit('change');
eq(out.value,'1','London repeated local hour chooses first occurrence');
fill('english','2025-01-15','12:00','America/New_York');
eq(out.value,'-5','New York winter EST');
nodes.englishDob.value='2025-07-15';nodes.englishDob.emit('input');
eq(out.value,'-4','New York summer EDT');
fill('tamil','2025-01-15','12:00','Australia/Sydney');
eq(out.value,'11','Tamil form Sydney summer DST');
nodes.tamilDob.value='2025-07-15';nodes.tamilDob.emit('change');
eq(out.value,'10','Tamil form Sydney winter non-DST');
root.documentElement.lang='ta';
fill('tamil','1992-07-31','22:05','Asia/Kolkata');
eq(out.value,'5.5','India historical fixed +5:30');
fill('tamil','2025-07-15','12:00','Asia/Kathmandu');
eq(out.value,'5.75','Nepal quarter-hour zone');
fill('english','2025-07-15','12:00','Asia/Dubai');
eq(out.value,'4','Dubai UTC +4');
fill('english','2025-07-15','12:00','Australia/Lord_Howe');
eq(out.value,'10.5','Lord Howe winter +10:30');
nodes.englishBirthTimezone.value='';
nodes.englishBirthTimezone.emit('change');
eq(out.value,'','Clearing IANA zone clears previously displayed value');
eq(out.dataset.offsetVerified,'0','No stale verified state after clearing zone');
nodes.englishBirthTimezone.value='Invalid/Zone';
nodes.englishBirthTimezone.emit('input');
eq(out.value,'','Invalid IANA zone cannot display old offset');
nodes.clearEnglishHoroscope.emit('click');
eq(out.value,'','Clear button resets calculated offset');
const file=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=file('public/horoscope/index.html');
contains(html,'src="./birth-offset-live.mjs"','UI module included');
contains(html,'id="birthUtcOffset" type="number" min="-12" max="14" step="any" value=""','No India default hidden in HTML');
contains(html,'id="smvBirthOffsetStatus"','Live error status included');
const form=file('public/horoscope/horoscope-form.js');
contains(form,'window.__smvUpdateBirthOffset?.(prefix)','Location selection recalculates live offset');
contains(form,'const historicalOffset=offsetMinutesAt(birthZone,date,normalizedTime)','Birth-time calculation recomputes exact offset');
const tamil=file('public/horoscope/horoscope.js');
contains(tamil,'const historicalOffset=offsetMinutesAt(zone,date,normalizedTime)','Tamil birth-time calculation recomputes exact offset');
console.log(JSON.stringify({pass:true,assertions,liveInput:true,seasonalDST:true}));
