'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Judgement = require('../public/horoscope/d1-v311-judgement.js');
const Narrative = require('../public/horoscope/d1-v311-narrative.js');

// Synthetic claims verify evidence fidelity and presentation, not forecast accuracy.
function claim(house = 10, conclusion = 'qualified', minor = false, evidence = 'both') {
  const positive = ['positive', 'both'].includes(evidence)
    ? [{ planet: 'Jupiter', relation: 'aspects', delta: 0.3 }] : [];
  const negative = ['negative', 'both'].includes(evidence)
    ? [{ planet: 'Saturn', relation: 'aspects', delta: -0.3 }] : [];
  const ruler = { planet: 'Mercury', relation: 'lord', delta: 0.2 };
  return {
    house, lord: 'Mercury', location: (house + 5) % 12 + 1,
    otherLordships: [], positive, negative, all: [ruler, ...positive, ...negative],
    dominant: positive[0] || negative[0] || ruler, conclusion,
    relativeScore: conclusion === 'support' ? 0.5 : conclusion === 'strain' ? -0.5 : 0,
    ageUnder18: minor, houseOccupants: [],
    houseAspects: [...positive, ...negative].map(x => x.planet),
    topicTA: Judgement.T[house - 1], topicEN: Judgement.E[house - 1],
    classical: [], division: null, divisionEvidence: []
  };
}
function joined(value) {
  return Array.isArray(value) ? value.join(' ') : String(value || '');
}
const genericTamil = /இந்த(?:த்)?\s*துறை|இந்த(?:ப்)?\s*பகுதி|இத்துறையில்|இவ்விஷயம்|இம்முயற்சி|வாசிப்பில்|மதிப்பீட்டிற்குத் துணை ஆதாரம்|பிறப்புத் தொடர்பு:/;
function readableTamil(value) {
  const prose = joined(value);
  assert.ok(prose.trim(), 'Return a meaningful supplied-evidence reading');
  assert.doesNotMatch(prose, /undefined|NaN|\bnull\b/);
  assert.doesNotMatch(prose, genericTamil, 'Name the actual life subject');
  return prose;
}
function windowFor(c, age = 40) {
  return {
    period: { from: '2030-01-01', to: '2031-01-01', md: 'Saturn', ad: 'Mercury', age },
    links: [{ planet: 'Mercury', relation: 'lord' }], weight: 3,
    transit: { planet: 'Jupiter', observedOn: '2030-05-01' }
  };
}
function annualFor(c, age = 40) {
  const w = windowFor(c, age);
  return {
    kind: 'event', claim: c, period: w.period, transit: w.transit, age,
    from: '2030-01-01', to: '2031-01-01', recurrences: []
  };
}
function assertFacts(prose, facts) {
  for (const fact of facts) assert.ok(prose.includes(fact), 'Keep supplied fact: ' + fact);
}
test('All twelve Tamil topics retain the current decisions and input facts', () => {
  for (const minor of [false, true])
    for (const conclusion of ['support', 'strain', 'qualified'])
      for (let house = 1; house <= 12; house++)
        for (const evidence of ['none', 'positive', 'negative', 'both']) {
          const c = claim(house, conclusion, minor, evidence);
          const before = JSON.stringify(c);
          const prose = readableTamil(Narrative.natal(c, 'ta'));
          assertFacts(prose, ['புதன்', Judgement.decide(c).completedTA]);
          assert.equal(JSON.stringify(c), before, 'Narrative must not alter chart evidence');
        }
});
test('A mixed conclusion cannot invent supportive or opposing planets', () => {
  for (let house = 1; house <= 12; house++)
    assert.doesNotMatch(
      readableTamil(Narrative.natal(claim(house, 'qualified', false, 'none'), 'ta')),
      /குரு|சனி|சுக்கிரன்|செவ்வாய்|சூரியன்|சந்திரன்|ராகு|கேது/
    );
});
test('Only actually supplied supporting and opposing planets are named', () => {
  for (let house = 1; house <= 12; house++) {
    const positive = readableTamil(Narrative.natal(claim(house, 'support', false, 'positive'), 'ta'));
    assert.ok(positive.includes('குரு'));
    assert.ok(!positive.includes('சனி'));
    const negative = readableTamil(Narrative.natal(claim(house, 'strain', false, 'negative'), 'ta'));
    assert.ok(negative.includes('சனி'));
    assert.ok(!negative.includes('குரு'));
    assertFacts(readableTamil(Narrative.natal(claim(house), 'ta')), ['குரு', 'சனி']);
  }
});
test('Chart-specific completed decisions take priority over general house wording', () => {
  for (const [house, location, otherLordships] of [
    [10, 6, []], [10, 2, [11]], [10, 2, [9]], [7, 12, []],
    [4, 4, []], [5, 8, []], [2, 3, []], [11, 11, []]
  ]) {
    const c = { ...claim(house), location, otherLordships };
    assert.ok(readableTamil(Narrative.natal(c, 'ta')).includes(Judgement.decide(c).completedTA));
  }
});
test('Youth natal, period, annual and summary subjects stay age appropriate', () => {
  for (const house of [2, 5, 7, 10, 11]) {
    const c = { ...claim(house, 'qualified', true), location: 4 };
    const outputs = [
      Narrative.natal(c, 'ta'), Narrative.period(windowFor(c, 14), c, 'ta'),
      Narrative.year(annualFor(c, 14), 'ta'),
      Narrative.summary({ main: c, counter: { ...claim(7, 'qualified', true), location: 4 } }, 'ta')
    ];
    for (const output of outputs)
      assert.doesNotMatch(readableTamil(output), /திருமண|துணைவர்|வியாபார|தொழில்|பதவி|வருமான/);
    assert.ok(joined(outputs[0]).includes(Judgement.decide(c).completedTA));
  }
});
test('Future periods use future age and retain report age when timing age is unknown', () => {
  const c = claim(10, 'qualified', true);
  const before = JSON.stringify(c);
  for (const age of [17, 18, 19, null, undefined, NaN]) {
    const win = windowFor(c);
    win.period.age = age;
    const annual = annualFor(c);
    annual.age = age;
    for (const prose of [
      readableTamil(Narrative.period(win, c, 'ta')),
      readableTamil(Narrative.year(annual, 'ta'))
    ]) {
      if (Number.isFinite(age) && age >= 18) {
        assert.doesNotMatch(prose, /பள்ளி|குழுக் கற்றல்/);
        assert.match(prose, /வேலை|தொழில்/);
      } else {
        assert.match(prose, /பள்ளி/);
        assert.doesNotMatch(prose, /தொழில்|வேலையின்/);
      }
      assertFacts(prose, ['2030-01-01', '2031-01-01', '2030-05-01']);
    }
  }
  assert.equal(JSON.stringify(c), before);
});
test('Unavailable and neutral divisions do not become invented divisional findings', () => {
  const c = claim();
  assert.doesNotMatch(readableTamil(Narrative.natal(c, 'ta')), /D-?9|D-?10/);
  c.divisionEvidence = [{ division: 'D-10', planet: 'Mercury', dignity: 'neutral', reason: null }];
  assert.doesNotMatch(readableTamil(Narrative.natal(c, 'ta')), /D-?10/);
});
test('Supplied strong, weak and opposing divisions retain their actual properties', () => {
  for (const [dignity, reason, label] of [
    ['strong', 'own', 'சொந்த ராசி'], ['strong', 'exalted', 'உச்ச'], ['weak', 'debilitated', 'நீச']
  ]) {
    const c = claim();
    c.divisionEvidence = [{ division: 'D-10', planet: 'Mercury', dignity, reason }];
    const before = JSON.stringify(c);
    assertFacts(readableTamil(Narrative.natal(c, 'ta')), ['D-10', 'புதன்', label]);
    assert.equal(JSON.stringify(c), before);
  }
  const c = claim();
  c.divisionEvidence = [
    { division: 'D-10', planet: 'Mercury', dignity: 'strong', reason: 'own' },
    { division: 'D-10', planet: 'Saturn', dignity: 'weak', reason: 'debilitated' }
  ];
  assertFacts(readableTamil(Narrative.natal(c, 'ta')), ['D-10', 'புதன்', 'சனி']);
});
test('The current English career reading remains unchanged', () => {
  const c = claim();
  c.otherLordships = [2];
  assert.deepEqual(Narrative.natal(c, 'en'), [
    'The central theme is balancing workload with recognition. Mercury rules house 10 and occupies natal house 4. It is therefore linked with housing and care duties.',
    'The same ruler also governs money and family communication, so these life themes are connected. Jupiter aspects this house provides supporting evidence, while Saturn aspects this house provides an opposing factor. Neither one alone establishes a certain outcome.'
  ]);
});
test('Natal prose does not invent dates or dasha periods', () => {
  for (let house = 1; house <= 12; house++)
    assert.doesNotMatch(readableTamil(Narrative.natal(claim(house), 'ta')), /\d{4}-\d{2}-\d{2}|மகாதசை|புக்தி|அந்தரம்/);
});
test('Supported period and annual prose retain actual rulers and observation dates', () => {
  const c = claim(), win = windowFor(c);
  win.period.pd = 'Venus';
  const before = JSON.stringify(win);
  assertFacts(readableTamil(Narrative.period(win, c, 'ta')), [
    '2030-01-01', '2031-01-01', '2030-05-01', 'சனி', 'புதன்', 'குரு', 'சுக்கிரன்'
  ]);
  assert.equal(JSON.stringify(win), before);
  assert.ok(!readableTamil(Narrative.period(windowFor(c), c, 'ta')).includes('சுக்கிரன்'));
  const year = annualFor(c);
  year.recurrences = [{ from: '2033-01-01', to: '2034-01-01' }];
  assertFacts(readableTamil(Narrative.year(year, 'ta')), [
    '2030-01-01', '2031-01-01', '2030-05-01', '2033-01-01', '2034-01-01', 'சனி', 'புதன்', 'குரு'
  ]);
  assert.ok(!joined(Narrative.year(year, 'ta')).includes('சுக்கிரன்'));
  readableTamil(Narrative.summary({ main: c, counter: claim(4) }, 'ta'));
});
test('Insufficient timing evidence remains suppressed', () => {
  const c = claim();
  assert.equal(Narrative.period({ ...windowFor(c), links: [] }, c, 'ta'), '');
  assert.equal(Narrative.period({ ...windowFor(c), weight: 2.39 }, c, 'ta'), '');
  assert.equal(Narrative.period({ ...windowFor(c), period: { ...windowFor(c).period, ad: null } }, c, 'ta'), '');
  assert.equal(Narrative.year({ ...annualFor(c), kind: 'insufficient' }, 'ta'), '');
  assert.equal(Narrative.year({ ...annualFor(c), transit: null }, 'ta'), '');
});
