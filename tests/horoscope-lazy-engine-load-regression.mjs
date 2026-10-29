import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/horoscope/index.html', import.meta.url), 'utf8');

test('large prediction engines are not eagerly loaded by Horoscope HTML', () => {
  for (const file of [
    'horoscope-life-engine.js',
    'horoscope-judgement-engine.js',
    'integrated.js',
    'd1-time-reading.js',
    'prediction-synthesis.js'
  ]) {
    assert.equal(html.includes('<script src="' + file + '"></script>'), false, file + ' must be deferred');
  }
  assert.match(html, /smv-v260-lazy-calculation-engines/);
  assert.match(html, /__smvEnsureCalculationNarrativeEngines/);
});

test('lazy engines load in dependency order and verify their expected global exports', () => {
  const files = [
    'horoscope-life-engine.js?v=20261029-lazy-engines-v1',
    'horoscope-judgement-engine.js?v=20261029-lazy-engines-v1',
    'integrated.js?v=20261029-lazy-engines-v1',
    'd1-time-reading.js?v=20261029-lazy-engines-v1',
    'prediction-synthesis.js?v=20261029-lazy-engines-v1'
  ];
  const indexes = files.map(file => html.indexOf(file));
  assert.ok(indexes.every(index => index >= 0));
  assert.deepEqual([...indexes].sort((a,b)=>a-b), indexes);
  for (const globalName of ['SMVLifePredictionD1','SMVD311Judgement','SMVD1IntegratedV303','SMVTimePredictionD1','SMVPredictionSynthesis']) {
    assert.ok(html.includes(globalName), 'missing readiness check for ' + globalName);
  }
});

test('generation, Admin and Matching entry points wait for deferred engines', () => {
  assert.match(html, /#generateEnglishHoroscope,#generateTamilHoroscope,#smvAdminOpenTools/);
  assert.match(html, /await window\.__smvEnsureCalculationNarrativeEngines/);
  assert.match(html, /window\.addEventListener\('hashchange'/);
  assert.match(html, /io\.observe\(target\)/);
  assert.match(html, /sc\.src='marriage-matching\.js\?v=20261019-ayurdaya-rules-duration-v253'/);
});
