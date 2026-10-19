/**
 * B.V. Raman Ayurdaya report rows for the existing cream-colour report tables.
 * This is presentation glue for the two separate result tracks. It never
 * estimates a person's actual lifespan or a death age/date.
 */
import { bvRamanIntegratedAyurdayaResearch } from './bv-raman-hpa-ayurdaya-combined.browser.mjs';

const PLANETS = Object.freeze(['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu']);
const PLANETS_EN = Object.freeze({Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu'});
const PLANETS_TA = Object.freeze({Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'});
const ALIASES = Object.freeze({
  Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu',
  'சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu'
});
const SIGN_LORDS = Object.freeze(['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']);
const DEBILITATION_SIGN = Object.freeze({Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0});
const TEMPORARY_FRIEND_HOUSES = new Set([2,3,4,10,11,12]);
const WAR_GRAHAS = new Set(['Mars','Mercury','Jupiter','Venus','Saturn']);

const finite = value => typeof value === 'number' && Number.isFinite(value);
const norm360 = value => ((value % 360) + 360) % 360;
const signIndex = longitude => finite(longitude) ? Math.floor(norm360(longitude) / 30) : null;
const distance = (a,b) => Math.abs(((norm360(a)-norm360(b)+540)%360)-180);
const esc = value => String(value ?? '—').replace(/[&<>"']/g, ch => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
})[ch]);
const nameOf = value => ALIASES[String(value ?? '')] || String(value ?? '');
const firstBoolean = values => {
  for (const value of values) if (typeof value === 'boolean') return value;
  return null;
};
const fmt = value => finite(value) ? value.toFixed(2) : '—';

function chartFacts(chart) {
  const raw = Array.isArray(chart?.planets) ? chart.planets : [];
  const planets = raw.map(p => {
    const name = nameOf(p?.name ?? p?.planet);
    const longitude = finite(p?.longitude) ? norm360(p.longitude) : null;
    return {raw:p,name,longitude,sign:longitude===null?null:signIndex(longitude)};
  }).filter(p => PLANETS.includes(p.name));
  const byName = new Map(planets.map(p => [p.name,p]));
  const lagnaLongitude = chart?.lagna?.longitude ?? chart?.ascendantLongitude ?? chart?.lagnaLongitude;
  const lagnaSign = signIndex(lagnaLongitude);
  const houseOf = p => {
    const supplied = Number(p?.raw?.bhava ?? p?.raw?.house);
    if (Number.isInteger(supplied) && supplied >= 1 && supplied <= 12) return supplied;
    if (p.sign === null || lagnaSign === null) return null;
    return (p.sign - lagnaSign + 12) % 12 + 1;
  };
  return {planets,byName,lagnaLongitude,lagnaSign,houseOf};
}

function planetaryWarState(planet,facts) {
  const p = facts.byName.get(planet);
  if (!p) return null;
  const explicit = firstBoolean([
    p.raw?.defeatedInPlanetaryWar,p.raw?.planetaryWarLost,p.raw?.warLost,
    p.raw?.planetaryWar?.defeated,p.raw?.planetaryWar?.lost,p.raw?.yuddha?.lost,
    p.raw?.strength?.defeatedInPlanetaryWar,p.raw?.strength?.planetaryWarLost
  ]);
  if (explicit !== null) return explicit;
  if (!WAR_GRAHAS.has(planet) || p.longitude === null) return false;
  const opponents = [...facts.byName.values()].filter(q =>
    q.name !== planet && WAR_GRAHAS.has(q.name) && q.longitude !== null && distance(p.longitude,q.longitude) <= 1);
  if (!opponents.length) return false;
  // A close war exists, but the chart payload does not identify the defeated graha.
  return null;
}

function eclipseState(planet,facts) {
  const p = facts.byName.get(planet);
  const explicit = firstBoolean([
    p?.raw?.eclipsed,p?.raw?.isEclipsed,p?.raw?.strength?.eclipsed
  ]);
  if (explicit !== null) return explicit;
  if (planet !== 'Sun' && planet !== 'Moon') return false;
  const sun = facts.byName.get('Sun'), moon = facts.byName.get('Moon');
  const rahu = facts.byName.get('Rahu'), ketu = facts.byName.get('Ketu');
  if (![sun,moon,rahu,ketu].every(x => x && x.longitude !== null)) return null;
  const phase = distance(sun.longitude,moon.longitude);
  if (planet === 'Sun') {
    const nearNode = Math.min(distance(sun.longitude,rahu.longitude),distance(sun.longitude,ketu.longitude));
    if (phase > 15 || nearNode > 18) return false;
    return phase <= 10 && nearNode <= 10 ? true : null;
  }
  const nearNode = Math.min(distance(moon.longitude,rahu.longitude),distance(moon.longitude,ketu.longitude));
  const opposition = Math.abs(180-phase);
  if (opposition > 15 || nearNode > 18) return false;
  return opposition <= 10 && nearNode <= 10 ? true : null;
}

function haranaInputs(chart) {
  const facts = chartFacts(chart);
  return Object.fromEntries(PLANETS.filter(name => !['Rahu','Ketu'].includes(name)).map(name => {
    const p = facts.byName.get(name);
    if (!p || p.sign === null || p.longitude === null) return [name,{}];
    const sameSign = [...facts.byName.values()].filter(q => q.name !== name && q.sign === p.sign);
    const allSignKnown = facts.planets.length === 9 && facts.planets.every(q => q.sign !== null);
    const conjunctionInSign = sameSign.length ? true : allSignKnown ? false : null;
    const debilitation = firstBoolean([p.raw?.strength?.debilitated,p.raw?.debilitated]);
    const debilitated = debilitation !== null ? debilitation : p.sign === DEBILITATION_SIGN[name];
    const combustion = firstBoolean([
      p.raw?.strength?.combustion,p.raw?.combustion,
      finite(p.raw?.strength?.sunDistance) && finite(p.raw?.strength?.combustionLimit)
        ? p.raw.strength.sunDistance <= p.raw.strength.combustionLimit : null
    ]);
    const lord = SIGN_LORDS[p.sign], lordSign = facts.byName.get(lord)?.sign;
    const temporaryEnemySign = name === lord ? false : lordSign === undefined || lordSign === null
      ? null
      : !TEMPORARY_FRIEND_HOUSES.has((lordSign-p.sign+12)%12+1);
    const house = facts.houseOf(p);
    const aboveHorizon = house === null ? null : house >= 7 && house <= 12;
    const defeatedInPlanetaryWar = planetaryWarState(name,facts);
    const eclipsed = eclipseState(name,facts);
    return [name,{
      conjunctionInSign,
      debilitated,
      combust:combustion,
      temporaryEnemySign,
      aboveHorizon,
      defeatedInPlanetaryWar,
      eclipsed
    }];
  }));
}

const CATEGORY_LABELS = Object.freeze({
  Balarishta:{ta:'பாலாரிஷ்டம்',en:'Balarishta'},
  Alpayu:{ta:'அல்பாயுள்',en:'Alpayu'},
  Madhyayu:{ta:'மத்தியாயுள்',en:'Madhya ayu'},
  Purnayu:{ta:'பூர்ணாயுள்',en:'Poorna ayu'}
});

function resultFor({chart,bavRows,language='ta',evidence,occupiedSigns,planetSigns,haranaByPlanet}={}) {
  const facts = chartFacts(chart);
  const derivedSigns = Object.fromEntries(facts.planets.filter(p=>!['Rahu','Ketu'].includes(p.name) && p.sign!==null)
    .map(p=>[p.name,p.sign]));
  const signsComplete = ['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn']
    .every(name=>Number.isInteger(derivedSigns[name]));
  const signs = planetSigns || (signsComplete ? derivedSigns : null);
  const occupied = occupiedSigns || [...new Set(facts.planets.filter(p=>p.sign!==null).map(p=>p.sign))];
  const explicitEvidence = evidence || {};
  const selectedHarana = haranaByPlanet || haranaInputs(chart);
  return bvRamanIntegratedAyurdayaResearch({
    chart,
    evidence:explicitEvidence,
    bavRows:bavRows ?? chart?.advanced?.ashtakavarga?.bhinna ?? chart?.ashtakavarga?.bhinna,
    occupiedSigns:occupied,
    planetSigns:signs,
    haranaByPlanet:selectedHarana
  });
}

/**
 * Add the Ashtakavarga numeric table and the longevity-category table beneath
 * the existing C.G. Rajan section, using its existing semantic table classes.
 * Book/author and internal audit metadata are intentionally not rendered.
 */
export function bvRamanAyurdayaReportHtml(options={}) {
  const ta = options.language !== 'en';
  const result = resultFor(options);
  const calc = result.chapterXXVI;
  const planetLabels = PLANETS.filter(p=>!['Rahu','Ketu'].includes(p)).map(p=>[
    p, (ta?PLANETS_TA:PLANETS_EN)[p]
  ]);
  const header = ta
    ? ['கிரகம்','ராசி பிண்டம்','கிரக பிண்டம்','சோத்ய பிண்டம்','ஆயுர்த்தாயம் (சந்திர ஆண்டு)']
    : ['Planet','Rasi Pinda','Graha Pinda','Sodhya Pinda','Ayurdaya (lunar years)'];
  const planetRows = calc ? planetLabels.map(([key,label]) => {
    const item = calc.planets?.[key];
    return '<tr><th scope="row">'+esc(label)+'</th>'+
      '<td>'+esc(item?.rasiPinda ?? '—')+'</td>'+
      '<td>'+esc(item?.grahaPinda ?? '—')+'</td>'+
      '<td>'+esc(item?.sodyaPinda ?? '—')+'</td>'+
      '<td>'+esc(fmt(item?.harana?.roundedNetLunarYears))+'</td></tr>';
  }).join('') : '<tr><td colspan="5">'+esc(ta?'கணக்கீடு கிடைக்கவில்லை':'Calculation unavailable')+'</td></tr>';
  const totalLunar = calc?.netLunarYearsRounded;
  const totalSolar = calc?.solarYearsCandidateRounded;
  const totalRows =
    '<tr class="smv-ayurdaya-totals"><th scope="row" colspan="4">'+esc(ta?'மொத்த சந்திர ஆண்டு':'Total lunar years')+'</th><td>'+esc(fmt(totalLunar))+'</td></tr>'+
    '<tr class="smv-ayurdaya-average"><th scope="row" colspan="4">'+esc(ta?'மொத்த சூரிய ஆண்டு':'Total solar years')+'</th><td>'+esc(fmt(totalSolar))+'</td></tr>';
  const categories = result.chapterXIV?.categoryCandidates || [];
  const matched = categories.map(key => CATEGORY_LABELS[key]?.[ta?'ta':'en']).filter(Boolean);
  const noCategory = ta ? 'வகை முடிவு இல்லை' : 'No category result';
  const categoryTable = '<div class="adv-table-wrap smv-viii-table-scroll smv-ayurdaya-scroll"><table class="smv-ayurdaya-table"><thead><tr><th>'+
    esc(ta?'விவரம்':'Details')+'</th><th>'+esc(ta?'முடிவு':'Result')+'</th></tr></thead><tbody><tr><th scope="row">'+
    esc(ta?'ஆயுள் வகை':'Longevity category')+'</th><td>'+esc(matched.length?matched.join(' / '):noCategory)+'</td></tr></tbody></table></div>';
  const numericTable = '<div class="adv-table-wrap smv-viii-table-scroll smv-ayurdaya-scroll"><table class="smv-ayurdaya-table"><thead><tr>'+
    header.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+planetRows+totalRows+'</tbody></table></div>';
  const disclaimer = ta
    ? 'இவை பாரம்பரிய ஆயுர்த்தாயக் கணக்கீட்டு முடிவுகள் மட்டுமே; உண்மையான ஆயுளை உறுதிப்படுத்தவோ மரண நேரத்தைக் கணிக்கவோ இவை பயன்படாது.'
    : 'These are traditional Ayurdaya calculation results only; they do not establish actual lifespan or predict the time of death.';
  return '<div class="smv-bv-raman-ayurdaya" data-smv-bv-raman-ayurdaya="1">'+
    '<h4>'+esc(ta?'அஷ்டகவர்க்க ஆயுர்த்தாயம்':'Ashtakavarga Ayurdaya')+'</h4>'+
    numericTable+
    '<h4>'+esc(ta?'ஆயுள் வகை முடிவு':'Longevity category result')+'</h4>'+
    categoryTable+
    '<p class="small smv-ayurdaya-disclaimer">'+esc(disclaimer)+'</p>'+
    '</div>';
}
