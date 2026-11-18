import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ui=read('public/horoscope/daily-calendar.mjs');
const calSw=read('public/horoscope/calendar/sw.js');
const rootSw=read('public/sw.js');
const horoscopeSw=read('public/horoscope/sw.js');

assert.match(ui,/from '\.\/muhurta\/index\.mjs'/);
assert.match(ui,/function renderMuhurtaEngineControls\(\)/);
assert.match(ui,/function renderMuhurtaEngineResult\(\)/);
assert.match(ui,/evaluateTamilMuhurta\(muhurtaActivity,facts\)/);
assert.match(ui,/evaluatePanIndianMuhurta\(muhurtaActivity,facts/);
assert.match(ui,/calMuhurtaTradition/);
assert.match(ui,/calMuhurtaActivity/);
assert.match(ui,/Pending rules are not treated as approvals/);
assert.match(ui,/classifySubhaMuhurtham\(\{date:selected\}\)/,
  'legacy annual published list feature remains separate and intact');

for(const file of ['public/sw.js','public/horoscope/sw.js','public/horoscope/calendar/sw.js']){
  const src=file==='public/sw.js'?rootSw:file==='public/horoscope/sw.js'?horoscopeSw:calSw;
  assert.match(src,/20261119-muhurta-engines-v19/,'cache release missing in '+file);
}
for(const path of [
  '../muhurta/index.mjs','../muhurta/activities.mjs','../muhurta/source-registry.mjs',
  '../muhurta/core/astronomy-facts.mjs','../muhurta/engines/tamil.mjs','../muhurta/engines/pan-indian.mjs'
]){
  assert.ok(calSw.includes(path),'Calendar service worker must cache '+path);
}
assert.match(calSw,/REQUIRED_CORE = new Set/);
assert.match(calSw,/smv-calendar-forecast-assets-/);
assert.ok(rootSw.includes('20261119-muhurta-engines-v19'));
assert.ok(horoscopeSw.includes('20261119-muhurta-engines-v19'));

console.log('Muhurta Calendar integration, legacy-list isolation and three-app cache release checks passed.');
