import assert from 'node:assert/strict';
import test from 'node:test';
import { classifySubhaMuhurtham, SUBHA_MUHURTHA_RULE_VERSION } from '../public/horoscope/calendar-muhurta-classification.mjs';

test('11 Nov 2026 is a waxing candidate from sunrise Panchanga limbs', () => {
  const result = classifySubhaMuhurtham({
    date: '2026-11-11', // Wednesday
    sunrisePanchang: { tithi: 2, star: 17, yoga: 6, karana: 4 },
    middayPanchang: { tithi: 2, star: 18, yoga: 6, karana: 4 }
  });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'shukla');
  assert.ok(result.favourableFactors.some(x => x.includes('துவிதியை')));
  assert.ok(result.favourableFactors.some(x => x.includes('அனுஷம்')));
  assert.ok(result.cautions.some(x => x.includes('அதிகண்டம்')));
});

test('13 Nov 2026 remains a mixed waxing candidate and exposes Chaturthi, Mula and Bhadra cautions', () => {
  const result = classifySubhaMuhurtham({
    date: '2026-11-13', // Friday
    sunrisePanchang: { tithi: 4, star: 19, yoga: 8, karana: 7 },
    middayPanchang: { tithi: 4, star: 19, yoga: 8, karana: 8 }
  });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'shukla');
  assert.ok(result.cautions.some(x => x.includes('சதுர்த்தி')));
  assert.ok(result.cautions.some(x => x.includes('மூலம்')));
  assert.ok(result.cautions.some(x => x.includes('விஷ்டி')));
});

test('waning-paksha candidates are labelled separately from waxing-paksha candidates', () => {
  const result = classifySubhaMuhurtham({
    date: '2026-11-29', // Sunday
    sunrisePanchang: { tithi: 23, star: 4, yoga: 12, karana: 5 },
    middayPanchang: { tithi: 23, star: 4, yoga: 12, karana: 5 }
  });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'krishna');
  assert.equal(result.pakshaTa, 'தேய்பிறை');
});

test('missing astronomical limbs never become an automatic auspicious result', () => {
  const result = classifySubhaMuhurtham({
    date: '2026-11-11',
    sunrisePanchang: { tithi: 2, star: 17, yoga: null, karana: 4 }
  });
  assert.equal(result.available, false);
  assert.equal(result.isSubhaMuhurtham, null);
});

test('classification remains a separate rule module version', () => {
  assert.equal(SUBHA_MUHURTHA_RULE_VERSION, 'panchanga-weighted-v1');
});
