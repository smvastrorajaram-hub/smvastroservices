import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [html,rootWorker,horoscopeWorker,calendarWorker]=await Promise.all([
  read('../public/horoscope/index.html'),
  read('../public/sw.js'),
  read('../public/horoscope/sw.js'),
  read('../public/horoscope/calendar/sw.js')
]);
const release='20261112-horoscope-result-styles-lazy-v1';
const deferred=[
  'chart-style.css',
  'horoscope-readings.css',
  'v358-result-layout.css',
  'marriage-basic-report.css'
];

test('result-only styles do not block the initial Horoscope document render',()=>{
  const eager=[...html.matchAll(/<link\\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map(x=>x[0]);
  for(const file of deferred){
    assert.equal(eager.some(link=>link.includes(file)),false,file+' must not be an eager stylesheet link');
  }
  assert.ok(html.includes('const resultStyles = ['),'result styles have an explicit lazy-load manifest');
  assert.ok(html.includes('const matchingStyles = ['),'Marriage Matching has a separate lazy style manifest');
});

test('Horoscope styles are ready before the chart generation click is replayed',()=>{
  const start=html.indexOf('<script id="smv-v260-lazy-calculation-engines">');
  const end=html.indexOf('</script>',start);
  assert.ok(start>=0&&end>start,'lazy calculation loader exists');
  const loader=html.slice(start,end);
  for(const file of deferred.filter(x=>x!=='marriage-basic-report.css')){
    assert.ok(loader.includes(file),'missing lazy style '+file);
  }
  assert.match(loader,/link\.rel = 'stylesheet'/);
  assert.match(loader,/link\.dataset\.smvLazyStyle = file/);
  assert.match(loader,/link\.addEventListener\('load'/);
  assert.match(loader,/link\.addEventListener\('error'/);
  const styleReady=loader.indexOf('await window.__smvEnsureHoroscopeResultStyles()');
  const engines=loader.indexOf('await window.__smvEnsureCalculationNarrativeEngines()');
  const replay=loader.indexOf('button.click()');
  assert.ok(styleReady>=0&&engines>styleReady&&replay>engines,
    'report CSS loads before engines finish and before the original click is replayed');
  assert.match(loader,/stylePromises\.delete\(file\)/,'failed CSS loads can be retried');
});

test('Marriage Matching loads its report CSS before the matching script',()=>{
  const start=html.indexOf("const load=()=>{if(loaded)return promise||Promise.resolve();loaded=true;");
  assert.ok(start>=0,'Marriage Matching lazy entry point exists');
  const loader=html.slice(start,start+2600);
  const styleReady=loader.indexOf('window.__smvEnsureMarriageReportStyles?.()');
  const matchingScript=loader.indexOf("sc.src='marriage-matching.js");
  assert.ok(styleReady>=0&&matchingScript>styleReady,
    'matching styles and calculation engines are awaited before appending the matching script');
  assert.match(loader,/io\.observe\(target\)/,'intersection lazy loading remains enabled');
  assert.match(loader,/location\.hash==='#smvMarriageMatching'/,'direct hash navigation still loads the module');
});

test('all deferred styles remain pre-cached and required for offline Horoscope reports',()=>{
  for(const file of deferred){
    assert.ok(horoscopeWorker.includes("'./"+file+"'"),file+' remains in the Horoscope shell precache');
  }
  for(const file of deferred){
    assert.ok(horoscopeWorker.includes("'./"+file+"'"),file+' remains in the offline-required assets');
  }
  assert.match(horoscopeWorker,/cache\.match\(req,\{ignoreSearch:true\}\)/,
    'versioned lazy CSS URLs can reuse the query-independent offline precache');
});

test('Astro, Horoscope and Calendar service workers share the synchronized cache release',()=>{
  for(const [name,worker] of [['Astro',rootWorker],['Horoscope',horoscopeWorker],['Calendar',calendarWorker]]){
    assert.ok(worker.includes("'"+release+"'"),name+' Pages.dev cache release is synchronized');
    assert.ok(worker.includes("'"+release+"'"),name+' .in cache release is synchronized');
  }
  assert.match(rootWorker,/const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST \? '20261112-horoscope-result-styles-lazy-v1' : '20261112-horoscope-result-styles-lazy-v1'/);
  assert.match(horoscopeWorker,/const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST \? '20261112-horoscope-result-styles-lazy-v1' : '20261112-horoscope-result-styles-lazy-v1'/);
  assert.match(calendarWorker,/const SMV_CACHE_RELEASE = IS_PAGES_DEV_HOST \? '20261112-horoscope-result-styles-lazy-v1' : '20261112-horoscope-result-styles-lazy-v1'/);
});
