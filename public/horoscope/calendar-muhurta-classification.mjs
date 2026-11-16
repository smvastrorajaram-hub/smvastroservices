// SMV CALENDAR — annual Tamil Subha Muhurtham list.
// Source of truth: Tamil Calendar App's published 2026 / 2027 annual
// Muhurtham tables (including separate Valarpirai / Theipirai entries).
// No score, rule inference, or Panchanga limb override is used here.
// Years without a published/imported list deliberately return unavailable.
export const MUHURTHAM_LIST_SOURCE =
  'https://tamilcalendarapp.com/subha-muhurtham-dates/';
export const MUHURTHAM_LIST_SOURCE_NAME = 'Tamil Calendar App — annual Subha Muhurtham list';

const ANNUAL_LISTS = Object.freeze({
  2026: Object.freeze({
    valarpirai: Object.freeze([
      '2026-01-28',
      '2026-02-20',
      '2026-03-25',
      '2026-04-20', '2026-04-23', '2026-04-30',
      '2026-05-18', '2026-05-28', '2026-05-29',
      '2026-06-17', '2026-06-18', '2026-06-24', '2026-06-25',
      '2026-08-23',
      '2026-09-13', '2026-09-17',
      '2026-10-25',
      '2026-11-11', '2026-11-13', '2026-11-15', '2026-11-16', '2026-11-20',
      '2026-12-10', '2026-12-13', '2026-12-14'
    ]),
    theipirai: Object.freeze([
      '2026-02-06', '2026-02-08', '2026-02-13', '2026-02-15', '2026-02-16',
      '2026-03-05', '2026-03-06', '2026-03-08', '2026-03-15', '2026-03-16',
      '2026-04-06', '2026-04-12', '2026-04-13', '2026-04-16',
      '2026-05-08', '2026-05-13', '2026-05-14',
      '2026-06-04', '2026-06-07',
      '2026-07-02', '2026-07-05', '2026-07-12',
      '2026-08-30', '2026-08-31',
      '2026-09-07',
      '2026-10-30', '2026-11-01', '2026-11-29',
      '2026-12-04', '2026-12-06'
    ]),
    publishedCount: 55
  }),
  2027: Object.freeze({
    valarpirai: Object.freeze([
      '2027-01-20',
      '2027-02-08', '2027-02-10', '2027-02-11', '2027-02-12', '2027-02-18',
      '2027-03-10', '2027-03-11', '2027-03-12', '2027-03-15', '2027-03-17', '2027-03-18',
      '2027-04-08', '2027-04-11', '2027-04-12', '2027-04-18',
      '2027-05-09', '2027-05-12', '2027-05-16', '2027-05-17', '2027-05-19',
      '2027-06-06', '2027-06-07', '2027-06-10', '2027-06-13', '2027-06-14', '2027-06-17',
      '2027-07-05', '2027-07-08', '2027-07-09', '2027-07-14',
      '2027-08-04', '2027-08-06', '2027-08-08', '2027-08-11', '2027-08-13', '2027-08-15', '2027-08-16',
      '2027-09-03', '2027-09-05', '2027-09-12', '2027-09-13',
      '2027-10-01', '2027-10-04', '2027-10-10', '2027-10-11', '2027-10-14',
      '2027-11-01', '2027-11-05', '2027-11-08', '2027-11-10', '2027-11-11', '2027-11-12',
      '2027-12-02', '2027-12-08', '2027-12-09', '2027-12-10'
    ]),
    theipirai: Object.freeze([
      '2027-01-04', '2027-01-28',
      '2027-02-01', '2027-02-05', '2027-02-25', '2027-02-26',
      '2027-03-04', '2027-03-24', '2027-03-25',
      '2027-04-01', '2027-04-04', '2027-04-23', '2027-04-26',
      '2027-05-03', '2027-05-23', '2027-05-26', '2027-05-27',
      '2027-06-24', '2027-06-25',
      '2027-07-25', '2027-07-30',
      '2027-08-01', '2027-08-20', '2027-08-23', '2027-08-27', '2027-08-29',
      '2027-09-17', '2027-09-19', '2027-09-22',
      '2027-10-20', '2027-10-22', '2027-10-27', '2027-10-28',
      '2027-11-18', '2027-11-25',
      '2027-12-16'
    ]),
    publishedCount: 93
  })
});

function supportedDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const parsed = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Exact annual-list lookup. A year is negative only when its complete annual
 * list is included in ANNUAL_LISTS. Unlisted years are never guessed.
 */
export function classifySubhaMuhurtham({ date } = {}) {
  if (!supportedDate(date)) {
    return {
      available: false, isSubhaMuhurtham: null, paksha: null,
      year: null, publishedCount: null,
      source: MUHURTHAM_LIST_SOURCE
    };
  }
  const year = Number(date.slice(0, 4));
  const annual = ANNUAL_LISTS[year];
  if (!annual) {
    return {
      available: false, isSubhaMuhurtham: null, paksha: null,
      year, publishedCount: null,
      source: MUHURTHAM_LIST_SOURCE
    };
  }
  if (annual.valarpirai.includes(date)) {
    return {
      available: true, isSubhaMuhurtham: true, paksha: 'valarpirai',
      pakshaTa: 'வளர்பிறை', year, publishedCount: annual.publishedCount,
      source: MUHURTHAM_LIST_SOURCE
    };
  }
  if (annual.theipirai.includes(date)) {
    return {
      available: true, isSubhaMuhurtham: true, paksha: 'theipirai',
      pakshaTa: 'தேய்பிறை', year, publishedCount: annual.publishedCount,
      source: MUHURTHAM_LIST_SOURCE
    };
  }
  return {
    available: true, isSubhaMuhurtham: false, paksha: null,
    pakshaTa: null, year, publishedCount: annual.publishedCount,
    source: MUHURTHAM_LIST_SOURCE
  };
}

export function getSubhaMuhurthamListSummary(year) {
  const annual = ANNUAL_LISTS[Number(year)];
  if (!annual) return null;
  return {
    year: Number(year),
    valarpiraiCount: annual.valarpirai.length,
    theipiraiCount: annual.theipirai.length,
    totalCount: annual.valarpirai.length + annual.theipirai.length,
    publishedCount: annual.publishedCount,
    source: MUHURTHAM_LIST_SOURCE
  };
}
