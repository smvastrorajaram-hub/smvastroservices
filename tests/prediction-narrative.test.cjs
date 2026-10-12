'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
require('../public/horoscope/d1-v311-judgement.js');
const Narrative = require('../public/horoscope/d1-v311-narrative.js');

function claim(house = 10, conclusion = 'qualified', minor = false, evidence = 'both') {
  const positive = ['positive', 'both'].includes(evidence)
    ? [{ planet: 'Jupiter', relation: 'aspects', delta: 0.3 }] : [];
  const negative = ['negative', 'both'].includes(evidence)
    ? [{ planet: 'Saturn', relation: 'aspects', delta: -0.3 }] : [];
  return {
    house, lord: 'Mercury', location: (house + 5) % 12 + 1,
    otherLordships: [(house + 3) % 12 + 1], positive, negative,
    all: [{ planet: 'Mercury', relation: 'lord', delta: 0.2 }, ...positive, ...negative],
    conclusion, ageUnder18: minor, division: null
  };
}

test('All twelve Tamil topics explain the supplied facts without changing them', () => {
  for (const minor of [false, true]) {
    for (const conclusion of ['support', 'strain', 'qualified']) {
      for (let house = 1; house <= 12; house++) {
        for (const evidence of ['none', 'positive', 'negative', 'both']) {
          const c = claim(house, conclusion, minor, evidence);
          const before = JSON.stringify(c);
          const paragraphs = Narrative.natal(c, 'ta');
          assert.ok(paragraphs.length >= 3 && paragraphs.length <= 4);
          assert.ok(paragraphs.every(p => typeof p === 'string' && p.trim()));
          assert.ok(paragraphs.join(' ').includes('புதன்'), 'Keep the actual house ruler');
          assert.ok(!/undefined|NaN|\bnull\b/.test(paragraphs.join(' ')));
          assert.equal(JSON.stringify(c), before);
        }
      }
    }
  }
});

test('Mixed judgement alone cannot invent supportive or opposing planets', () => {
  for (let house = 1; house <= 12; house++) {
    const prose = Narrative.natal(claim(house, 'qualified', false, 'none'), 'ta').join(' ');
    assert.ok(!prose.includes('குரு'));
    assert.ok(!prose.includes('சனி'));
    assert.ok(!prose.includes('தடைக்கான'));
  }
});

test('One-sided and opposing evidence retain only the planets actually supplied', () => {
  for (let house = 1; house <= 12; house++) {
    const positive = Narrative.natal(claim(house, 'support', false, 'positive'), 'ta').join(' ');
    assert.ok(positive.includes('குரு'));
    assert.ok(!positive.includes('சனி'));
    const negative = Narrative.natal(claim(house, 'strain', false, 'negative'), 'ta').join(' ');
    assert.ok(negative.includes('சனி'));
    assert.ok(!negative.includes('குரு'));
    const both = Narrative.natal(claim(house), 'ta').join(' ');
    assert.ok(both.includes('குரு') && both.includes('சனி'));
  }
});

test('Child topics use family, learning and peer meanings throughout the report', () => {
  for (let house = 1; house <= 12; house++) {
    const prose = Narrative.natal(claim(house, 'qualified', true), 'ta').join(' ');
    assert.ok(!/திருமண|துணைவர்|கடன்|வருமான|வியாபார|தொழில்|பதவி/.test(prose));
  }
});

test('Relevant divisional detail is shown only when a non-neutral division is supplied', () => {
  const c = claim();
  assert.ok(!Narrative.natal(c, 'ta').join(' ').includes('D-10'));
  c.division = { division: 'D-10', planet: 'Saturn', dignity: 'neutral' };
  assert.ok(!Narrative.natal(c, 'ta').join(' ').includes('D-10'));
  c.division.dignity = 'strong';
  assert.ok(Narrative.natal(c, 'ta').join(' ').includes('D-10'));
  assert.ok(Narrative.natal(c, 'ta').join(' ').includes('ஆட்சி அல்லது உச்ச'));
  c.division.dignity = 'weak';
  assert.ok(Narrative.natal(c, 'ta').join(' ').includes('நீச'));
});

test('The existing English career reading remains unchanged', () => {
  const c = claim();
  c.otherLordships = [2];
  assert.deepEqual(Narrative.natal(c, 'en'), [
    'Recognition may lag behind work completed. In practice, housing and parental needs cannot be separated from the decision.',
    'Mercury owns house 10 and occupies house 4; this links career and public duties with housing and family support. The same ruler also governs money and family communication, joining decisions across these areas. A supportive Jupiter contact is offset by restrictive Saturn evidence; the result depends on how the competing circumstances are handled.'
  ]);
});

test('Natal prose does not invent a date or dasha when timing was not supplied', () => {
  for (let house = 1; house <= 12; house++) {
    const prose = Narrative.natal(claim(house), 'ta').join(' ');
    assert.ok(!/\d{4}-\d{2}-\d{2}|மகாதசை|புக்தி/.test(prose));
  }
});

test('Period prose retains actual rulers, dates and the computed transit observation', () => {
  const c = claim();
  const p = { from: '2030-01-01', to: '2031-01-01', md: 'Saturn', ad: 'Mercury', age: 40 };
  const prose = Narrative.period({
    period: p, transit: { planet: 'Jupiter', observedOn: '2030-05-01' }
  }, c, 'ta');
  for (const fact of ['2030-01-01', '2031-01-01', '2030-05-01', 'சனி', 'புதன்', 'குரு']) {
    assert.ok(prose.includes(fact));
  }
});
