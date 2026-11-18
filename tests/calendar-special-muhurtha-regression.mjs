import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPushkaraArcIndex,
  classifyPanchaka,
  getPanchakaActivityResults,
  getSpecialTamilYear,
  shouldShowSpecialMuhurtha,
  getVastuDay,
  isMoudhyaScopeDate
} from '../public/horoscope/calendar-special-muhurtha.mjs';

test('only Parabhava and Plavanga Tamil-year dates are in scope', () => {
  assert.equal(getSpecialTamilYear('2026-04-13'), null);
  assert.equal(getSpecialTamilYear('2026-04-14')?.nameTa, 'பராபவ');
  assert.equal(getSpecialTamilYear('2027-04-13')?.nameTa, 'பராபவ');
  assert.equal(getSpecialTamilYear('2027-04-14')?.nameTa, 'பிலவங்க');
  assert.equal(getSpecialTamilYear('2028-04-13')?.nameTa, 'பிலவங்க');
  assert.equal(getSpecialTamilYear('2028-04-14'), null);
});

test('Pushkara and Panchaka cards require a date in the published Subha Muhurtham list', () => {
  const published = { available: true, isSubhaMuhurtham: true };
  const notPublished = { available: true, isSubhaMuhurtham: false };
  const unavailable = { available: false, isSubhaMuhurtham: null };
  assert.equal(shouldShowSpecialMuhurtha('2026-11-11', published), true);
  assert.equal(shouldShowSpecialMuhurtha('2026-11-12', notPublished), false);
  assert.equal(shouldShowSpecialMuhurtha('2026-11-11', unavailable), false);
  assert.equal(shouldShowSpecialMuhurtha('2027-04-14', published), true);
  assert.equal(shouldShowSpecialMuhurtha('2028-04-14', published), false);
});

test('the 24 Pushkara Navamsa arcs have distinct interval identities and exact endpoints', () => {
  assert.equal(getPushkaraArcIndex(20), 0);                // Aries 20° inclusive
  assert.equal(getPushkaraArcIndex(23 + 1 / 3), null);    // Aries first arc end
  assert.equal(getPushkaraArcIndex(26 + 2 / 3), 1);       // Aries second arc
  assert.equal(getPushkaraArcIndex(36 + 2 / 3), 2);       // Taurus first arc
  assert.equal(getPushkaraArcIndex(60 + 16 + 2 / 3), 4);  // Gemini first arc
  assert.equal(getPushkaraArcIndex(90), 6);               // Cancer first arc
  assert.equal(getPushkaraArcIndex(330), 22);             // Pisces first arc
  assert.equal(getPushkaraArcIndex(336 + 2 / 3), 23);     // Pisces second arc
  assert.equal(getPushkaraArcIndex(30), null);            // Taurus begins outside Pushkara
  assert.equal(getPushkaraArcIndex(Number.NaN), null);
});

function panchakaForRemainder(remainder) {
  const base = { tithi: 1, weekday: 1, nakshatra: 1, lagna: 1 };
  const total = 3 + base.lagna;
  base.lagna += ((remainder - total) % 9 + 9) % 9;
  if (base.lagna > 12) {
    base.tithi = 2;
    base.lagna = 12;
  }
  return classifyPanchaka(base);
}

test('Panchaka outcomes are activity-specific and expose no calculation operands', () => {
  assert.equal(panchakaForRemainder(0).labelTa, 'உத்தமம்');
  assert.equal(panchakaForRemainder(1).key, 'mrityu');
  assert.equal(panchakaForRemainder(2).key, 'agni');
  assert.equal(panchakaForRemainder(4).key, 'raja');
  assert.equal(panchakaForRemainder(6).key, 'chora');
  assert.equal(panchakaForRemainder(8).key, 'roga');

  const raja = panchakaForRemainder(4);
  const activities = getPanchakaActivityResults(raja);
  assert.equal(activities.find(item => item.key === 'business').suitableByPanchaka, false);
  assert.equal(activities.find(item => item.key === 'house').suitableByPanchaka, false);
  assert.equal(activities.find(item => item.key === 'travel').suitableByPanchaka, true);
  assert.equal(activities.find(item => item.key === 'marriage').suitableByPanchaka, true);

  const rahita = getPanchakaActivityResults(panchakaForRemainder(0));
  assert.ok(rahita.every(item => item.suitableByPanchaka));
  const publicResult = panchakaForRemainder(2);
  for (const key of ['tithi', 'weekday', 'nakshatra', 'lagna', 'remainder', 'sum']) {
    assert.equal(Object.hasOwn(publicResult, key), false);
  }
});

test('Vastu days are listed separately for the 2026 and 2027 calendar years', () => {
  assert.deepEqual(getVastuDay('2026-04-23'), {
    date: '2026-04-23', monthTa: 'சித்திரை', tamilDay: 10
  });
  assert.deepEqual(getVastuDay('2027-11-24'), {
    date: '2027-11-24', monthTa: 'கார்த்திகை', tamilDay: 8
  });
  assert.equal(getVastuDay('2026-04-24'), null);
});

test('Moudhya scope never spills outside the two requested Tamil years', () => {
  assert.equal(isMoudhyaScopeDate('2026-04-14'), true);
  assert.equal(isMoudhyaScopeDate('2027-04-14'), true);
  assert.equal(isMoudhyaScopeDate('2028-04-13'), true);
  assert.equal(isMoudhyaScopeDate('2028-04-14'), false);
});
