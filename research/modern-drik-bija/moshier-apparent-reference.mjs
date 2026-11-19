/**
 * Explicit Swiss Ephemeris Moshier (MOSEPH) apparent-geocentric reference.
 * This adapter is isolated under research/ and does not change the production
 * guarded Swiss Ephemeris provider.
 */
import Swisseph from '../../public/horoscope/offline/vendor/wasm/swisseph.mjs';

const MOSEPH = 4;
const GREGORIAN = 1;
const BODY_IDS = Object.freeze({
  Mercury: 2,
  Venus: 3,
  Mars: 4,
  Jupiter: 5,
  Saturn: 6
});

export async function createModernMoshierReference() {
  const M = await Swisseph({
    locateFile: path => {
      const url = new URL('../../public/horoscope/offline/vendor/wasm/' + path, import.meta.url);
      return typeof process !== 'undefined' && process.versions?.node
        ? decodeURIComponent(url.pathname)
        : url.href;
    }
  });
  M.ccall('swe_set_ephe_path', 'void', ['string'], ['/sweph']);

  function utcJanuaryFirstToEt(year) {
    if (!Number.isInteger(year) || year < 1800 || year >= 2400) {
      throw new RangeError('Moshier annual reference accepts years 1800 through 2399');
    }
    const pointer = M._malloc(16);
    if (!pointer) throw new Error('Swiss WASM could not allocate UTC-to-JD output memory');
    try {
      M.ccall('swe_utc_to_jd', 'void',
        ['number','number','number','number','number','number','number','pointer'],
        [year, 1, 1, 0, 0, 0, GREGORIAN, pointer]);
      const et = M.HEAPF64[pointer >> 3];
      if (!Number.isFinite(et)) {
        throw new Error('Swiss WASM returned invalid ET Julian day for ' + year);
      }
      return et;
    } finally {
      M._free(pointer);
    }
  }

  function apparentTropicalLongitudeAtJd(jdEt, planet) {
    const bodyId = BODY_IDS[planet];
    if (!bodyId) throw new RangeError('Unsupported Moshier planet: ' + planet);
    if (!Number.isFinite(jdEt)) throw new TypeError('A finite TT/ET Julian day is required');
    
    const valuesPointer = M._malloc(48);
    const errorPointer = M._malloc(256);
    if (!valuesPointer || !errorPointer) {
      if (valuesPointer) M._free(valuesPointer);
      if (errorPointer) M._free(errorPointer);
      throw new Error('Swiss WASM could not allocate calculation buffers');
    }
    try {
      const retFlag = M.ccall('swe_calc', 'number',
        ['number','number','number','pointer','pointer'],
        [jdEt, bodyId, MOSEPH, valuesPointer, errorPointer]);
      const message = M.UTF8ToString(errorPointer);
      if (retFlag < 0) throw new Error(message || 'Moshier calculation failed');
      if (retFlag !== MOSEPH) {
        throw new Error('Expected explicit MOSEPH flag 4; received ' + retFlag);
      }
      const longitude = M.HEAPF64[valuesPointer >> 3];
      if (!Number.isFinite(longitude) || longitude < 0 || longitude >= 360) {
        throw new Error('Moshier returned an invalid tropical longitude for ' + planet + ' ' + year);
      }
      return Object.freeze({
        jdEt,
        planet,
        longitude,
        ephemeris: 'MOSEPH',
        retFlag,
        frame: 'geocentric apparent tropical ecliptic-of-date'
      });
    } finally {
      M._free(valuesPointer);
      M._free(errorPointer);
    }
  }

  function apparentTropicalLongitude(year, planet) {
    return apparentTropicalLongitudeAtJd(utcJanuaryFirstToEt(year), planet);
  }

  return Object.freeze({
    provider: 'Swiss Ephemeris 2.10.03 Moshier',
    ephemeris: 'MOSEPH',
    apparentTropicalLongitude,
    apparentTropicalLongitudeAtJd,
    close() {
      M.ccall('swe_close', 'void', [], []);
    }
  });
}
