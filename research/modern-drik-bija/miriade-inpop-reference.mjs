/**
 * Independent IMCCE Miriade / INPOP apparent geocentric ecliptic reference.
 * Research-only. It does not use JPL Horizons or Swiss Ephemeris.
 *
 * API constraints are checked in code:
 * - INPOP theory, geocentre, apparent-of-date, ecliptic plane, TT
 * - nbd <= 5000 for regular time grids
 * - <= 1000 epochs per uploaded event list
 */
const API = 'https://ssp.imcce.fr/webservices/miriade/api/ephemcc.php';
const PLANET_NAMES = Object.freeze(['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Sun']);
const DAILY_LIMIT = 5000;
const EVENT_EPOCH_LIMIT = 1000;

function isoUtc(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return y + '-' + m + '-' + d + 'T' + hh + ':' + mm + ':' + ss;
}

function dateFromApiRow(row) {
  const value = row.Date ?? row.date ?? row.epoch ?? row.Epoch;
  if (typeof value !== 'string') throw new Error('INPOP row has no ISO date field');
  const date = new Date(value.endsWith('Z') ? value : value + 'Z');
  if (!Number.isFinite(date.getTime())) throw new Error('INPOP returned an invalid date: ' + value);
  return date;
}

function firstFinite(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function sexagesimalToDecimal(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^([+-]?)(\d{1,3}):([0-5]?\d):([0-5]?\d(?:\.\d*)?)$/);
  if (!match) return Number.isFinite(Number(value)) ? Number(value) : null;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) + Number(match[3]) / 60 + Number(match[4]) / 3600);
}

function longitudeFromRow(row, payload) {
  // Miriade rectangular ephemcc JSON names the vector components px/py/pz.
  const x = firstFinite(row, ['px', 'PX', 'X', 'x', 'Xcoord', 'xcoord']);
  const y = firstFinite(row, ['py', 'PY', 'Y', 'y', 'Ycoord', 'ycoord']);
  const z = firstFinite(row, ['pz', 'PZ', 'Z', 'z', 'Zcoord', 'zcoord']);
  if (x !== null && y !== null && z !== null) {
    return ((Math.atan2(y, x) * 180 / Math.PI) % 360 + 360) % 360;
  }

  const key = ['ELON', 'elon', 'EclipticLongitude', 'ecliptic_longitude', 'RA', 'ra']
    .find(name => row[name] !== undefined);
  if (!key) throw new Error('INPOP apparent ecliptic longitude is missing from row: ' + JSON.stringify(row).slice(0, 500));
  const raw = sexagesimalToDecimal(row[key]);
  if (!Number.isFinite(raw)) throw new Error('INPOP longitude could not be parsed from ' + key);
  const unit = payload.unit?.[key] ?? payload.unit?.[key.toUpperCase()] ?? '';
  const degrees = String(unit).toLowerCase() === 'h' || key.toLowerCase() === 'ra'
    ? raw * 15
    : raw;
  return ((degrees % 360) + 360) % 360;
}

function validateMetadata(payload, planet) {
  if (!payload || !Array.isArray(payload.data) || payload.data.length === 0) {
    throw new Error('Miriade INPOP returned no data rows for ' + planet);
  }
  const eph = payload.ephemeris || {};
  const theory = String(eph.planetary_theory || '').toUpperCase();
  if (!theory.startsWith('INPOP')) throw new Error('Reference theory is not INPOP for ' + planet + ': ' + theory);
  if (String(eph.time_scale || '').toUpperCase() !== 'TT') {
    throw new Error('INPOP time scale must be TT; received ' + eph.time_scale);
  }
  const frame = eph.reference_frame || {};
  if (!String(frame.center || '').toLowerCase().includes('geo')) {
    throw new Error('INPOP reference centre must be geocentric; received ' + frame.center);
  }
  if (!String(frame.plane || '').toLowerCase().includes('ecliptic')) {
    throw new Error('INPOP reference plane must be ecliptic; received ' + frame.plane);
  }
  if (!String(frame.type || '').toLowerCase().includes('apparent')) {
    throw new Error('INPOP ephemeris must be apparent-of-date; received ' + frame.type);
  }
  return theory;
}

async function fetchJson(url, options, context) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(120000) });
      const body = await response.text();
      if (!response.ok) {
        throw new Error('Miriade HTTP ' + response.status + ': ' + body.slice(0, 500));
      }
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        throw new Error('Miriade returned non-JSON content: ' + body.slice(0, 500));
      }
      if (payload.flag !== undefined && Number(payload.flag) <= 0) {
        throw new Error('Miriade error flag ' + payload.flag + ': ' + String(payload.result || '').slice(0, 500));
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (attempt === 5) break;
      const delay = Math.min(30000, 1000 * (2 ** attempt));
      console.warn('Retrying INPOP request', context, 'attempt', attempt + 2, 'after', String(error));
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('INPOP request failed after 6 attempts (' + context + '): ' + String(lastError));
}

function baseParameters(planet) {
  const params = new URLSearchParams();
  params.set('-name', 'p:' + planet);
  params.set('-from', 'SMVASTRO_MODERN_DRIK_BIJA_QA');
  params.set('-tscale', 'TT');
  params.set('-observer', '500');
  params.set('-theory', 'INPOP');
  params.set('-teph', '2');
  params.set('-tcoor', '2');
  params.set('-rplane', '2');
  params.set('-mime', 'json');
  params.set('-output', '--iso');
  return params;
}

function decodePayload(payload, planet, expectedCount) {
  const theory = validateMetadata(payload, planet);
  if (payload.data.length !== expectedCount) {
    throw new Error(planet + ' INPOP sample count mismatch: expected ' +
      expectedCount + ', got ' + payload.data.length);
  }
  const rows = payload.data.map(row => ({
    date: dateFromApiRow(row),
    longitude: longitudeFromRow(row, payload)
  }));
  for (let index = 1; index < rows.length; index++) {
    if (!(rows[index].date > rows[index - 1].date)) {
      throw new Error(planet + ' INPOP epochs are not strictly ascending');
    }
  }
  return { planet, theory, rows };
}

/**
 * Fetch a sorted explicit epoch list from IMCCE INPOP.
 * Miriade's documented HTTP POST contract requires a plain-text file field
 * named "epochs", with -ep, -nbd and -step omitted from the query.
 */
export async function fetchInpopEpochList(planet, epochs) {
  if (!PLANET_NAMES.includes(planet)) throw new RangeError('Unsupported INPOP body: ' + planet);
  if (!Array.isArray(epochs) || epochs.length < 1 || epochs.length > EVENT_EPOCH_LIMIT) {
    throw new RangeError('INPOP epoch list must contain 1..1000 entries per request');
  }
  const dates = epochs.map(value => value instanceof Date ? value : new Date(value));
  for (const date of dates) {
    if (!Number.isFinite(date.getTime())) throw new TypeError('Invalid INPOP epoch');
  }
  for (let i = 1; i < dates.length; i++) {
    if (!(dates[i] > dates[i - 1])) {
      throw new Error('INPOP epoch-list dates must be strictly ascending');
    }
  }

  const lines = dates.map(isoUtc);
  const params = baseParameters(planet);
  const form = new FormData();
  form.set('epochs', new Blob([lines.join('\\n') + '\\n'], { type: 'text/plain' }), 'epochs.txt');
  const payload = await fetchJson(API + '?' + params.toString(), {
    method: 'POST',
    body: form
  }, planet + ' epoch-list count=' + epochs.length);
  const decoded = decodePayload(payload, planet, epochs.length);
  for (let i = 0; i < dates.length; i++) {
    if (Math.abs(decoded.rows[i].date.getTime() - dates[i].getTime()) > 1000) {
      throw new Error(planet + ' INPOP epoch-list order/date mismatch at index ' + i);
    }
  }
  return decoded;
}

export const INPOP_EVENT_EPOCH_LIMIT = EVENT_EPOCH_LIMIT;
export const INPOP_PLANETS = PLANET_NAMES;
