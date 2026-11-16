// Provisional day-level Subha Muhurtham classifier for SMV CALENDAR.
// This is an explainable, weighted Panchanga screening rule, not a certification
// of an exact Vivaha / Griha Pravesha muhurta. Time-specific doshas remain warnings.
// Kept separate from tamil-day-classifications.mjs: Siddha / Amirtha / Marana yoga
// display and lookup are intentionally not read or modified here.

export const SUBHA_MUHURTHA_RULE_VERSION = 'panchanga-weighted-v1';

const GOOD_TITHIS = new Set([2, 3, 5, 7, 10, 11, 12, 13, 17, 18, 20, 22, 23, 25, 26, 27, 28]);
const RIKTA_TITHIS = new Set([4, 9, 14, 19, 24, 29]);
const GOOD_NAKSHATRAS = new Set([4, 5, 7, 8, 12, 13, 15, 17, 20, 21, 22, 23, 26, 27]);
const NAKSHATRA_CAUTIONS = new Set([9, 10, 18, 19]);
const GOOD_WEEKDAYS = new Set([1, 3, 4, 5]); // Monday, Wednesday, Thursday, Friday.
const CAUTION_WEEKDAYS = new Set([2, 6]); // Tuesday and Saturday.
const GOOD_KARANAS = new Set(['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija']);
const VISHTI_KARANAS = new Set([8, 15, 22, 29, 36, 43, 50, 57]);
const FIXED_UNFAVOURABLE_KARANAS = new Set([58, 59, 60]);
const GOOD_NITYA_YOGAS = new Set([2, 3, 4, 5, 7, 8, 11, 12, 14, 16, 18, 20, 21, 22, 23, 24, 25, 26]);
const CAUTION_NITYA_YOGAS = new Set([1, 6, 9, 10, 13, 15, 17, 19, 27]);

const TITHI_TA = [
  '', 'பிரதமை', 'துவிதியை', 'திரிதியை', 'சதுர்த்தி', 'பஞ்சமி', 'ஷஷ்டி',
  'சப்தமி', 'அஷ்டமி', 'நவமி', 'தசமி', 'ஏகாதசி', 'துவாதசி',
  'திரயோதசி', 'சதுர்த்தசி', 'பௌர்ணமி', 'பிரதமை', 'துவிதியை',
  'திரிதியை', 'சதுர்த்தி', 'பஞ்சமி', 'ஷஷ்டி', 'சப்தமி', 'அஷ்டமி',
  'நவமி', 'தசமி', 'ஏகாதசி', 'துவாதசி', 'திரயோதசி', 'சதுர்த்தசி', 'அமாவாசை'
];
const NAKSHATRA_TA = [
  '', 'அஸ்வினி', 'பரணி', 'கார்த்திகை', 'ரோகிணி', 'மிருகசீரிஷம்',
  'திருவாதிரை', 'புனர்பூசம்', 'பூசம்', 'ஆயில்யம்', 'மகம்', 'பூரம்',
  'உத்திரம்', 'ஹஸ்தம்', 'சித்திரை', 'சுவாதி', 'விசாகம்', 'அனுஷம்',
  'கேட்டை', 'மூலம்', 'பூராடம்', 'உத்திராடம்', 'திருவோணம்', 'அவிட்டம்',
  'சதயம்', 'பூரட்டாதி', 'உத்திரட்டாதி', 'ரேவதி'
];
const YOGA_TA = [
  '', 'விஷ்கம்பம்', 'ப்ரீதி', 'ஆயுஷ்மான்', 'சௌபாக்யம்', 'சோபனம்',
  'அதிகண்டம்', 'சுகர்மம்', 'த்ருதி', 'சூலம்', 'கண்டம்', 'விருத்தி',
  'த்ருவம்', 'வ்யாகாதம்', 'ஹர்ஷணம்', 'வஜ்ரம்', 'சித்தி', 'வ்யதீபாதம்',
  'வரியான்', 'பரிகம்', 'சிவம்', 'சித்தம்', 'சாத்யம்', 'சுபம்',
  'சுக்லம்', 'பிரம்மம்', 'ஐந்திரம்', 'வைத்ருதி'
];
const WEEKDAY_TA = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const MOVING_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'];
const KARANA_TA = {
  Kimstughna: 'கிம்ஸ்துக்னம்', Bava: 'பவம்', Balava: 'பாலவம்',
  Kaulava: 'கௌலவம்', Taitila: 'தைதிலம்', Garaja: 'கரஜம்',
  Vanija: 'வணிஜம்', Vishti: 'விஷ்டி / பத்ரை',
  Shakuni: 'சகுனி', Chatushpada: 'சதுஷ்பாதம்', Naga: 'நாகம்'
};

function numeric(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}
function weekdayOf(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return null;
  const d = new Date(date + 'T12:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}
function karanaName(number) {
  const n = numeric(number);
  if (n === null || n < 1 || n > 60) return null;
  if (n === 1 || n === 60) return 'Kimstughna';
  if (n === 58) return 'Shakuni';
  if (n === 59) return 'Chatushpada';
  if (n === 60) return 'Naga';
  return MOVING_KARANAS[(n - 2) % 7] || null;
}

/**
 * Returns an explainable provisional day-level assessment.
 * Inputs are the local-sunrise Panchanga limbs and a noon sample from the
 * existing offline Swiss Ephemeris worker. No hard-coded date list is used.
 */
export function classifySubhaMuhurtham({ date, sunrisePanchang, middayPanchang } = {}) {
  const tithi = numeric(sunrisePanchang?.tithi);
  const nakshatra = numeric(sunrisePanchang?.star ?? sunrisePanchang?.nakshatra);
  const yoga = numeric(sunrisePanchang?.yoga);
  const sunriseKaranaNumber = numeric(sunrisePanchang?.karana);
  const middayKaranaNumber = numeric(middayPanchang?.karana);
  const weekday = weekdayOf(date);

  if (tithi === null || tithi < 1 || tithi > 30 ||
      nakshatra === null || nakshatra < 1 || nakshatra > 27 ||
      yoga === null || yoga < 1 || yoga > 27 ||
      sunriseKaranaNumber === null || sunriseKaranaNumber < 1 || sunriseKaranaNumber > 60 ||
      weekday === null) {
    return {
      available: false, isSubhaMuhurtham: null, paksha: null, score: null,
      favourableCount: 0, favourableFactors: [], cautions: [],
      ruleVersion: SUBHA_MUHURTHA_RULE_VERSION
    };
  }

  const paksha = tithi <= 15 ? 'shukla' : 'krishna';
  const sunriseKarana = karanaName(sunriseKaranaNumber);
  const middayKarana = karanaName(middayKaranaNumber);
  let score = 0;
  let favourableCount = 0;
  const favourableFactors = [];
  const cautions = [];

  const addFavourable = (label, points) => {
    score += points;
    favourableCount++;
    favourableFactors.push(label);
  };
  const addCaution = (label, points = -1) => {
    score += points;
    cautions.push(label);
  };

  if (paksha === 'shukla') addFavourable('வளர்பிறை', 1);

  if (GOOD_TITHIS.has(tithi)) {
    addFavourable((TITHI_TA[tithi] || 'சுப திதி') + ' திதி', 2);
  } else if (RIKTA_TITHIS.has(tithi)) {
    addCaution((TITHI_TA[tithi] || 'ரிக்த') + ' ரிக்த திதி', -2);
  } else if (tithi === 15 || tithi === 30) {
    addCaution((TITHI_TA[tithi] || 'பௌர்ணமி / அமாவாசை') + ' — தனி விதி தேவை', -1);
  }

  if (GOOD_NAKSHATRAS.has(nakshatra)) {
    addFavourable((NAKSHATRA_TA[nakshatra] || 'சுப நட்சத்திரம்') + ' நட்சத்திரம்', 2);
  } else if (NAKSHATRA_CAUTIONS.has(nakshatra)) {
    addCaution((NAKSHATRA_TA[nakshatra] || 'நட்சத்திரம்') + ' — நிகழ்ச்சி சார்ந்த கவனம்', -1);
  }

  if (GOOD_WEEKDAYS.has(weekday)) {
    addFavourable(WEEKDAY_TA[weekday] + ' கிழமை', 1);
  } else if (CAUTION_WEEKDAYS.has(weekday)) {
    addCaution(WEEKDAY_TA[weekday] + ' கிழமை — பாரம்பரியக் கவனம்', -1);
  }

  if (GOOD_KARANAS.has(sunriseKarana)) {
    addFavourable(KARANA_TA[sunriseKarana] + ' கரணம் (சூ.உதயம்)', 1);
  } else if (VISHTI_KARANAS.has(sunriseKaranaNumber)) {
    addCaution('சூ.உதயத்தில் விஷ்டி / பத்ரை கரணம்', -2);
  } else if (FIXED_UNFAVOURABLE_KARANAS.has(sunriseKaranaNumber)) {
    addCaution((KARANA_TA[sunriseKarana] || 'நிலைக் கரணம்') + ' — சுப தொடக்கத்திற்கு கவனம்', -1);
  }

  if (GOOD_NITYA_YOGAS.has(yoga)) {
    addFavourable((YOGA_TA[yoga] || 'சுப யோகம்') + ' நித்ய யோகம்', 1);
  } else if (CAUTION_NITYA_YOGAS.has(yoga)) {
    addCaution((YOGA_TA[yoga] || 'யோகம்') + ' நித்ய யோகம் — கவனம்', -1);
  }

  // Vishti / Bhadra is a time-bound restriction. It warns against the affected
  // interval without automatically cancelling an otherwise suitable day.
  if (middayKaranaNumber !== null && VISHTI_KARANAS.has(middayKaranaNumber) &&
      !VISHTI_KARANAS.has(sunriseKaranaNumber)) {
    cautions.push('பகல் நேரத்தில் விஷ்டி / பத்ரை கரணம் வரும் நேரத்தைத் தவிர்க்கவும்');
  }

  // Require several independent positive limbs and a positive net score.
  // This deliberately preserves mixed days as candidates with explicit cautions.
  const isSubhaMuhurtham = score >= 1 && favourableCount >= 3;
  return {
    available: true,
    isSubhaMuhurtham,
    paksha,
    pakshaTa: paksha === 'shukla' ? 'வளர்பிறை' : 'தேய்பிறை',
    sunrisePanchanga: { tithi, nakshatra, yoga, karana: sunriseKarana, weekday },
    middayKarana,
    score,
    favourableCount,
    favourableFactors,
    cautions,
    ruleVersion: SUBHA_MUHURTHA_RULE_VERSION
  };
}
