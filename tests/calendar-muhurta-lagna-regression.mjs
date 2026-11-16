import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifySubhaMuhurtham,
  getSubhaMuhurthamListSummary,
  MUHURTHAM_LIST_SOURCE
} from '../public/horoscope/calendar-muhurta-classification.mjs';

test('11 Nov 2026 is included in the published Valarpirai Muhurtham list', () => {
  const result = classifySubhaMuhurtham({ date: '2026-11-11' });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'valarpirai');
  assert.equal(result.pakshaTa, 'வளர்பிறை');
});

test('13 Nov 2026 is included in the published Valarpirai Muhurtham list', () => {
  const result = classifySubhaMuhurtham({ date: '2026-11-13' });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'valarpirai');
  assert.equal(result.pakshaTa, 'வளர்பிறை');
});

test('29 Nov 2026 is included in the published Theipirai Muhurtham list', () => {
  const result = classifySubhaMuhurtham({ date: '2026-11-29' });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, true);
  assert.equal(result.paksha, 'theipirai');
  assert.equal(result.pakshaTa, 'தேய்பிறை');
});

test('a date absent from a covered annual list is explicitly not a Muhurtham day', () => {
  const result = classifySubhaMuhurtham({ date: '2026-11-12' });
  assert.equal(result.available, true);
  assert.equal(result.isSubhaMuhurtham, false);
  assert.equal(result.paksha, null);
});

test('the full 2026 and 2027 annual lists match the source published counts', () => {
  const list2026 = getSubhaMuhurthamListSummary(2026);
  const list2027 = getSubhaMuhurthamListSummary(2027);
  assert.deepEqual(
    { valarpirai: list2026.valarpiraiCount, theipirai: list2026.theipiraiCount, total: list2026.totalCount },
    { valarpirai: 25, theipirai: 30, total: 55 }
  );
  assert.deepEqual(
    { valarpirai: list2027.valarpiraiCount, theipirai: list2027.theipiraiCount, total: list2027.totalCount },
    { valarpirai: 57, theipirai: 36, total: 93 }
  );
  assert.equal(list2026.publishedCount, 55);
  assert.equal(list2027.publishedCount, 93);
  assert.equal(MUHURTHAM_LIST_SOURCE, 'https://tamilcalendarapp.com/subha-muhurtham-dates/');
});

test('unpublished years remain unavailable and are not guessed as non-Muhurtham', () => {
  const result = classifySubhaMuhurtham({ date: '2028-11-11' });
  assert.equal(result.available, false);
  assert.equal(result.isSubhaMuhurtham, null);
  assert.equal(result.paksha, null);
});
