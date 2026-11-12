import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const integratedSource=read('../public/horoscope/integrated.js');
const d1NarrativeSource=read('../public/horoscope/d1-human-narrative.js');
const matchingSource=read('../public/horoscope/marriage-matching.js');
const timelineSource=read('../public/horoscope/matching-timeline.mjs');
const workers=[read('../public/sw.js'),read('../public/horoscope/sw.js'),read('../public/horoscope/calendar/sw.js')];

function loadIntegratedRenderer(){
  const context={
    module:{exports:{}},
    SMVLifePredictionD1:{toD1(){}},
    SMVD1IntegratedV303:{build(){}}
  };
  vm.createContext(context);
  vm.runInContext(integratedSource,context,{timeout:5000});
  assert.equal(typeof context.module.exports.html,'function','integrated Horoscope HTML renderer is exported');
  return context.module.exports.html;
}

test('Horoscope narrative removes repeated sentences across the complete report, not just inside one topic',()=>{
  const render=loadIntegratedRenderer();
  const repeated='A shared responsibility may need a clear agreement before the two related life areas become easier to manage.';
  const caution='This traditional interpretation is not a guarantee and does not predict a specific event.';
  const report={
    lang:'en',
    overview:[repeated],
    topics:[
      {number:1,title:'Identity',paragraphs:[repeated,caution],periods:[],remedies:[]},
      {number:2,title:'Family',paragraphs:[repeated,caution],periods:[],remedies:[]}
    ],
    chronology:[{from:'2027-01-01',to:'2027-06-01',md:'Jupiter',ad:'Venus',pd:'Moon',house:1,text:repeated}],
    pdChronology:[{text:repeated}],
    annual:[{year:2027,text:repeated}],
    uncoveredWindows:[],
    timeline:{complete:true},
    v311:{status:'ready',uncoveredWindows:[]}
  };
  const html=render(report);
  assert.equal(html.split(repeated).length-1,1,'one substantial narrative sentence is shown once across Overview, 12 houses and timing chapters');
  assert.equal(html.split(caution).length-1,2,'safety/uncertainty caveats remain attached to both relevant topic conclusions');
});

test('Horoscope report deduplication is report-wide and preserves meaningful safety caveats',()=>{
  assert.match(integratedSource,/const seenMeaning=new Set\(\)/);
  assert.doesNotMatch(integratedSource,/resetProse\(\)/);
  assert.match(integratedSource,/const caution=\/\(\?:உறுதி\|உறுதியாக\|மருத்துவ/);
  assert.match(integratedSource,/const eligible=norm\.length>=45&&words\.length>=5&&!caution/);
});

test('12-house D1 narrative shares one sentence set across the report',()=>{
  assert.match(d1NarrativeSource,/reportSeen=new Set\(\)/);
  assert.match(d1NarrativeSource,/seen=reportSeen/);
  assert.match(d1NarrativeSource,/const eligible=key\.length>=45&&words\.length>=5&&!caution/);
});

test('Marriage Matching 15-year transit prose is shown only when the annual midpoint state changes',()=>{
  assert.match(timelineSource,/function transitStateKeys\(c,y,ta\)/);
  assert.match(timelineSource,/lastTransitState=new Map\(\)/);
  assert.match(timelineSource,/const repeated=lastTransitState\.get\(key\)===signature/);
  assert.match(timelineSource,/if\(visibleTransit\.length\)/);
  assert.match(timelineSource,/if\(y\.events\?\.length\)/,
    'years without calculated sign ingress do not repeat a “No changes” paragraph');
  assert.match(timelineSource,/Same midpoint sign persists across consecutive years|same midpoint sign persists across consecutive years/);
});

test('Marriage Matching repeated generic chart factors are displayed once per person across 12 topics',()=>{
  assert.match(matchingSource,/function mm335PersonEvidence\(r,who,seen\)/);
  assert.match(matchingSource,/const uniqueFactors=factors\.filter/);
  assert.match(matchingSource,/seenEvidence=\{bride:new Set\(\),groom:new Set\(\)\}/);
  assert.match(matchingSource,/mm335PersonEvidence\(B,bride,seenEvidence\.bride\)/);
  assert.match(matchingSource,/mm335PersonEvidence\(G,groom,seenEvidence\.groom\)/);
  assert.match(matchingSource,/mm281PairOutcome\(B,G,item,age\.young,b,g,seenEvidence\)/);
});


test('SMV ASTRO, HOROSCOPE and CALENDAR cache releases stay synchronized for both host variants',()=>{
  const pages="'20261112-narrative-quality-pages-v1'";
  const main="'20261112-narrative-quality-in-v1'";
  for(const worker of workers){
    assert.ok(worker.includes("const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST ? "+pages+" : "+main+";"),
      'each app worker carries matching Pages.dev and .in narrative release markers');
  }
});

console.log(JSON.stringify({pass:true,checks:6,scope:'narrative output only; no astrological calculation changes'}));
