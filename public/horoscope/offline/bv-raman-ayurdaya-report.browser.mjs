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

// Display decimal year fractions as traditional year/month/day/nazhi units.
// This is a representation only: 1 year = 12 months, 1 month = 30 days,
// and 1 day = 60 nazhi. The numeric computation remains unrounded internally.
function fmtDuration(value, ta) {
  if (!finite(value) || value < 0) return '—';
  const totalNazhi = Math.round(value * 12 * 30 * 60);
  const years = Math.floor(totalNazhi / (12 * 30 * 60));
  const remYear = totalNazhi % (12 * 30 * 60);
  const months = Math.floor(remYear / (30 * 60));
  const remMonth = remYear % (30 * 60);
  const days = Math.floor(remMonth / 60);
  const nazhi = remMonth % 60;
  return ta
    ? years+' வருடம் '+months+' மாதம் '+days+' நாள் '+nazhi+' நாழிகை'
    : years+' y '+months+' mo '+days+' d '+nazhi+' nazhi';
}

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

const RULE_CATEGORY_LABELS = Object.freeze({
  Balarishta:{ta:'பாலாரிஷ்டம் — பொருந்திய விதிகள்',en:'Balarishta rules'},
  Antidote:{ta:'பாலாரிஷ்டம் தொடர்பான நிவர்த்தி விதிகள்',en:'Balarishta mitigating rules'},
  Alpayu:{ta:'அல்பாயுள் விதிகள்',en:'Alpayu rules'},
  Madhyayu:{ta:'மத்தியாயுள் விதிகள்',en:'Madhyayu rules'},
  Purnayu:{ta:'பூர்ணாயுள் விதிகள்',en:'Purnayu rules'}
});
const RULE_LABELS_TA = Object.freeze({
  'XIV-BAL-01':'பாபக் கிரகம் ராசியின் இறுதி நவாம்சத்தில் அமைதல்',
  'XIV-BAL-02':'சந்திரன் கேந்திரத்தில் பாபக் கிரகத்துடன் இருத்தல்',
  'XIV-BAL-03':'சந்திரன் 7, 8 அல்லது 12-ஆம் பாவத்தில் பாபக் கிரகத்துடன் இருந்து சுபப் பார்வையின்றி இருத்தல்',
  'XIV-BAL-04':'சூரிய உதயத்திற்கு 48 நிமிடங்களுக்கு முன் அல்லது அஸ்தமனத்திற்கு 48 நிமிடங்களுக்குப் பின் பிறப்பு; சந்திர ஹோரை உயர்வதுடன், பாப ராசிகளின் நவாம்சங்களில் பாபக் கிரகங்கள் அமைதல்',
  'XIV-BAL-05':'2, 6, 8, 12-ஆம் பாவங்களில் பாபக் கிரகங்கள் அமைதல்',
  'XIV-BAL-06':'பலமற்ற சந்திரன் 1 அல்லது 8-ஆம் பாவத்தில் இருந்து, கேந்திரங்களில் பாபக் கிரகங்கள் இருத்தல்',
  'XIV-BAL-07':'சந்திரன் லக்னத்தில், செவ்வாய் 8-ஆம், சூரியன் 9-ஆம், சனி 12-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-08':'பலமற்ற சந்திரன் லக்னத்தில் இருந்து 5, 8, 12-ஆம் பாவங்களுக்கு பாபப் பார்வை இருத்தல்',
  'XIV-BAL-09':'சந்திரன் 8-ஆம், செவ்வாய் 7-ஆம், ராகு 9-ஆம், குரு 3-ஆம் பாவங்களில் இருத்தல்',
  'XIV-BAL-10':'பிறப்புத் தசை அதிபதி பல பாபக் கிரகங்களுடன் சேர்ந்து இருத்தல்',
  'XIV-BAL-11':'பிறப்பின்போது சூரியன் உதய நிலையில்; கேந்திரம்/திரிகோணங்களில் பாபர்கள்; சுக்கிரன் 6 அல்லது 12-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-12':'லக்னாதிபதி பகை ராசி அல்லது 8/9-ஆம் பாவத்தில் இருத்தல்; அல்லது 5 மற்றும் 9-ஆம் பாவ அதிபதிகள் இருவரும் தத்தமது பகை ராசி அல்லது 8/9-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-13':'கேது 4-ஆம் பாவத்தில் பாபக் கிரகத்துடன் அல்லது பாபப் பார்வையில் இருத்தல்',
  'XIV-BAL-14':'ராகு 7-ஆம் பாவத்தில் இருந்து சூரியன் மற்றும் சந்திரனின் பார்வை பெறுதல்',
  'XIV-BAL-15':'பிறப்பில் லக்னாதிபதி அல்லது 8-ஆம் பாவ அதிபதியின் தசை; அல்லது லக்னாதிபதியின் தசையில் 8-ஆம் அதிபதியின் புக்தி, அதற்குப் புரட்டாக உள்ள தொடர்பு',
  'XIV-BAL-16':'லக்னாதிபதி, நவாம்ச லக்னாதிபதி, சந்திர ராசி அதிபதி ஆகியோர் சூரியனுடன் சேர்ந்து இருத்தல்',
  'XIV-BAL-17':'லக்னம் மற்றும் சந்திர ராசியிலிருந்து 8-ஆம் இடம் பாபப் பார்வை பெறுதல்',
  'XIV-BAL-18':'சந்திரன் 8-ஆம், செவ்வாய் 7-ஆம், சனி லக்னத்தில் இருத்தல்',
  'XIV-BAL-19':'சனி தனது 3-ஆம் பார்வையைச் சந்திரன் மீது செலுத்துதல்',
  'XIV-BAL-20':'சந்திரன் 6 அல்லது 8-ஆம் பாவத்தில் இருந்து எந்தக் கிரகப் பார்வையும் பெறாமை',
  'XIV-BAL-21':'சந்திரன் லக்னத்தில் பாபக் கிரகத்துடன் இருந்து சுபப் பார்வையின்றி இருத்தல்',
  'XIV-BAL-22':'சந்திரன் லக்னத்தில்; ராகு மற்றும் செவ்வாய் 8-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-23':'சூரியன் மற்றும் சனி லக்னத்தில்; ராகு மற்றும் செவ்வாய் 8-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-24':'5, 8, 9-ஆம் பாவங்களில் பாபர்கள்; சூரியன் அல்லது சந்திரன் லக்னத்தில் சுபப் பாதுகாப்பின்றி இருத்தல்',
  'XIV-BAL-25':'சனி 12-ஆம், சூரியன் 9-ஆம், சந்திரன் லக்னத்தில், செவ்வாய் 8-ஆம் பாவங்களில்; குரு இவற்றில் எதையும் பார்க்காமை (குரு 5-ஆம் பாவத்தில் இருந்தால் விதி ரத்தாகும்)',
  'XIV-BAL-26':'சனி, செவ்வாய் 1, 8 அல்லது 7-ஆம் பாவங்களில் சுபப் பார்வையின்றி இருத்தல்',
  'XIV-BAL-27':'சந்திரன் மிருத்யுபாகப் பாகையில் (மேஷம் 26°, ரிஷபம் 12°, மிதுனம் 13°, கடகம் 25°, சிம்மம் 24°, கன்னி 11°, துலாம் 26°, விருச்சிகம் 14°, தனுசு 13°, மகரம் 25°, கும்பம் 5°, மீனம் 12°) இருந்து கேந்திரம் அல்லது 8-ஆம் பாவத்தில் இருத்தல்',
  'XIV-BAL-28':'லக்னாதிபதி அல்லது சந்திர ராசி அதிபதி பலமின்றி, பாதிக்கப்பட்ட நிலையில் இருத்தல்',
  'XIV-BAL-29':'சந்திரன் 6 அல்லது 8-ஆம் பாவத்தில் இருந்து பாப மற்றும் சுபப் பார்வை இரண்டையும் பெறுதல்',
  'XIV-BAL-30':'சந்திரன் 6 அல்லது 8-ஆம் பாவத்தில் சுபப் பார்வை மட்டும் பெறுதல்',
  'XIV-ANT-01':'வலிமையான குரு லக்னத்தில் இருத்தல்',
  'XIV-ANT-02':'வலிமையான லக்னாதிபதி சுபப் பார்வை பெறுதல்',
  'XIV-ANT-03':'8-ஆம் பாவச் சந்திரன் புதன், குரு அல்லது சுக்கிரனின் திரேக்காணத்தில் அமைதல்',
  'XIV-ANT-04':'பூர்ண சந்திரன் சுப ராசியில் இருந்து நல்ல பார்வைகள் பெறுதல்',
  'XIV-ANT-05':'புதன், சுக்கிரன் அல்லது குருவில் குறைந்தது ஒருவர் வலிமையாக இருத்தல்',
  'XIV-ANT-06':'6-ஆம் பாவச் சந்திரன் குரு, சுக்கிரன் அல்லது புதனின் திரேக்காணத்தில் அமைதல்',
  'XIV-ANT-07':'பூர்ண சந்திரன் இரண்டு சுபக் கிரகங்களுக்கு இடையில் இருத்தல்',
  'XIV-ANT-08':'பௌர்ணமி இரவில் பிறப்பு; சந்திரன் 6 அல்லது 8-ஆம் பாவத்தில் இருத்தல்',
  'XIV-ANT-09':'பூர்ண சந்திரன் லக்னத்தைப் பார்க்க, குரு கேந்திரத்தில் இருத்தல்',
  'XIV-ANT-10':'பாபக் கிரகங்கள் சுப ஷட்வர்க்கங்களில் அமைந்து, சுப நவாம்சங்களில் உள்ள சுபக் கிரகங்களின் பார்வை பெறுதல்',
  'XIV-ALP-01':'சனி 8-ஆம், செவ்வாய் 5-ஆம், கேது லக்னத்தில் இருத்தல்',
  'XIV-ALP-02':'6, 8, 12-ஆம் பாவங்களில் பாபக் கிரகத் தாக்கம் இருத்தல்',
  'XIV-ALP-03':'சனி லக்னத்தில்; சூரியன், சந்திரன், செவ்வாய் 7-ஆம் பாவத்தில் இருத்தல்',
  'XIV-ALP-04':'8-ஆம் பாவ அதிபதி கேதுவுடன் லக்னத்தில் இருத்தல்',
  'XIV-ALP-05':'லக்னத்தில் பாபக் கிரகங்கள்; சந்திரன் பாபக் கிரகங்களுடன் சேர்ந்து இருத்தல்',
  'XIV-ALP-06':'8-ஆம் பாவ அதிபதி லக்னத்தில் இருந்து லக்னாதிபதி வலிமையின்றி இருத்தல்',
  'XIV-ALP-07':'விருச்சிக லக்னத்தில் சூரியன், குரு; 8-ஆம் அதிபதி கேந்திரத்தில் இருத்தல்',
  'XIV-ALP-08':'ராகு 7-ஆம், சந்திரன் 8-ஆம், குரு லக்னத்தில் இருத்தல்',
  'XIV-ALP-09':'பாபக் கிரகம் அதிபதியாகும் ராசியில் லக்னம் இருந்து, அந்த லக்னத்தில் சனி அமைதல்; 3, 6, 9, 12-ஆம் பாவங்களில் சுபர்கள் அமைதல்',
  'XIV-ALP-10':'லக்னாதிபதி மற்றும் 8-ஆம் அதிபதி பாபர்களுடன் 8-ஆம் பாவத்தில் சுபப் பார்வையின்றி இருத்தல்',
  'XIV-ALP-11':'1, 2, 8-ஆம் பாவங்களில் பாபர்கள்; சுபர்கள் கேந்திரங்களுக்கு வெளியே இருத்தல்',
  'XIV-ALP-12':'பலமற்ற லக்னாதிபதியுடன் 8-ஆம் அதிபதி கேந்திரத்தில் இருத்தல்',
  'XIV-ALP-13':'லக்னாதிபதி மற்றும் 8-ஆம் அதிபதி கேந்திரங்களில்; 8-ஆம் பாவத்தில் கிரகம்; மற்ற கிரகங்கள் கேந்திரங்களில் இல்லாமை',
  'XIV-ALP-14':'வலிமையான பாபக் கிரகங்கள் கேந்திரங்களில் சுபப் பார்வையின்றி இருத்தல்',
  'XIV-ALP-15':'லக்னமும் சந்திரனும் உபய ராசிகளில் இருத்தல்',
  'XIV-MAD-01':'3 அல்லது 6-ஆம் பாவ அதிபதி கேந்திரத்தில் இருத்தல்',
  'XIV-MAD-02':'8, 11, லக்னம், 10-ஆம் பாவ அதிபதிகளில் குறைந்தது இருவர் வலிமையாக இருத்தல்',
  'XIV-MAD-03':'புதன், குரு, சுக்கிரன் 2, 3, 11-ஆம் பாவங்களில் அமைதல்',
  'XIV-MAD-04':'அனைத்துக் கிரகங்களும் லக்னத்திலிருந்து நடுப்பகுதியிலுள்ள நான்கு பாவங்களில் இருத்தல்',
  'XIV-MAD-05':'சூரியன் லக்னத்தில் பகை ராசியில், பாபர்களுக்கு இடையில், வலிமையின்றி சுபப் பார்வையின்றி இருத்தல்',
  'XIV-MAD-06':'லக்னாதிபதி 6 அல்லது 8-ஆம் பாவத்தில் பாபத் தொடர்புடன் சுபப் பார்வையின்றி இருத்தல்',
  'XIV-MAD-07':'சனி லக்னத்தில்; சந்திரன் 8 அல்லது 12-ஆம் பாவத்தில்; மற்ற கிரகங்கள் 11-ஆம் பாவத்தில் இருத்தல்',
  'XIV-MAD-08':'விருச்சிக லக்னத்தில் குரு; செவ்வாய் மற்றும் ராகு 8-ஆம் பாவத்தில் இருத்தல்',
  'XIV-MAD-09':'8-ஆம் பாவ அதிபதி 7-ஆம் பாவத்தில்; சந்திரன் பாபத் தாக்கத்தில் இருத்தல்',
  'XIV-MAD-10':'மேஷ லக்னத்தில் குரு 8-ஆம் பாவத்தில்; கேந்திரங்களில் பாபர்கள் இருத்தல்',
  'XIV-MAD-11':'சனி லக்னத்தில்; சந்திரன் 4-ஆம், செவ்வாய் 7-ஆம், ராகு 10-ஆம் பாவங்களில்; குரு, சுக்கிரன், புதன் சாதகமற்ற பாவங்களில் அமைதல்',
  'XIV-MAD-12':'செவ்வாய் மற்றும் புதன் கேந்திரங்களில்; சுக்கிரன் லக்னத்தில்; 3 அல்லது 11-ஆம் பாவத்தில் உச்சக் கிரகங்கள்',
  'XIV-MAD-13':'கேந்திரங்களில் சுபர்கள் லக்னத்தைப் பார்க்காமல்; லக்னாதிபதி பாபப் பார்வை பெறுதல்',
  'XIV-MAD-14':'செவ்வாய் 5-ஆம், சூரியன் 7-ஆம் பாவத்தில்; சனி நீசத்தில் இருத்தல்',
  'XIV-MAD-15':'கேந்திரம்/திரிகோணங்களில் சுபர்கள்; சனி வலிமையாக இருத்தல்',
  'XIV-PUR-01':'லக்னத்தை லக்னாதிபதியும் 8-ஆம் பாவத்தை அதன் அதிபதியும் பார்க்க; குரு கேந்திரத்தில் இருத்தல்',
  'XIV-PUR-02':'முதல் ஆறு பாவங்களில் சுபர்கள்; கடைசி ஆறு பாவங்களில் பாபர்கள் இருத்தல்',
  'XIV-PUR-03':'லக்னாதிபதியிலிருந்து குரு கேந்திரத்தில்; கேந்திரங்களில் பாபர்கள் இல்லாமை',
  'XIV-PUR-04':'கடக லக்னத்தில் குரு; குறைந்தது ஒரு உச்சக் கிரகம் இருத்தல்',
  'XIV-PUR-05':'லக்னாதிபதியும் சூரியனும் 10-ஆம்; சனி லக்னத்தில்; குரு 4-ஆம் பாவத்தில் இருத்தல்',
  'XIV-PUR-06':'குரு லக்னத்தில்; சுக்கிரன் 4-ஆம்; சனி மற்றும் சந்திரன் 10-ஆம் பாவத்தில் இருத்தல்'
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
  // A missing/partial BAV payload must never suppress the existing C.G. Rajan
  // appendix; render placeholders for this new section instead.
  let result;
  try { result = resultFor(options); }
  catch { result = {chapterXXVI:null,chapterXIV:null}; }
  const calc = result.chapterXXVI;
  const planetLabels = PLANETS.filter(p=>!['Rahu','Ketu'].includes(p)).map(p=>[
    p, (ta?PLANETS_TA:PLANETS_EN)[p]
  ]);
  const header = ta
    ? ['கிரகம்','ராசி பிண்டம்','கிரக பிண்டம்','சோத்ய பிண்டம்','ஆயுர்த்தாயம் (சந்திர ஆண்டு: வருடம்/மாதம்/நாள்/நாழிகை)']
    : ['Planet','Rasi Pinda','Graha Pinda','Sodhya Pinda','Ayurdaya (lunar-year units: y/mo/d/nazhi)'];
  const planetRows = calc ? planetLabels.map(([key,label]) => {
    const item = calc.planets?.[key];
    return '<tr><th scope="row">'+esc(label)+'</th>'+
      '<td>'+esc(item?.rasiPinda ?? '—')+'</td>'+
      '<td>'+esc(item?.grahaPinda ?? '—')+'</td>'+
      '<td>'+esc(item?.sodyaPinda ?? '—')+'</td>'+
      '<td>'+esc(fmtDuration(item?.harana?.unroundedNetLunarYears,ta))+'</td></tr>';
  }).join('') : '<tr><td colspan="5">'+esc(ta?'கணக்கீடு கிடைக்கவில்லை':'Calculation unavailable')+'</td></tr>';
  const totalLunar = calc?.netLunarYears;
  const totalSolar = calc?.solarYearsCandidate;
  const totalRows =
    '<tr class="smv-ayurdaya-totals"><th scope="row" colspan="4">'+esc(ta?'மொத்த சந்திர ஆண்டு':'Total lunar years')+'</th><td>'+esc(fmtDuration(totalLunar,ta))+'</td></tr>'+
    '<tr class="smv-ayurdaya-average"><th scope="row" colspan="4">'+esc(ta?'ஆயுர்த்தாய மொத்தம் — சூரிய ஆண்டு (334/365 மாற்றம்)':'Ayurdaya total — solar years (334/365 conversion)')+'</th><td>'+esc(fmtDuration(totalSolar,ta))+'</td></tr>';
  const matchedRules = (result.chapterXIV?.rules || []).filter(rule => rule?.status === 'MATCHED');
  const ruleOrder = ['Balarishta','Antidote','Alpayu','Madhyayu','Purnayu'];
  const ruleRows = ruleOrder.flatMap(category => matchedRules
    .filter(rule => rule.category === category)
    .map(rule => '<tr><th scope="row">'+esc(RULE_CATEGORY_LABELS[category]?.[ta?'ta':'en'] || category)+'</th><td>'+
      esc(ta ? (RULE_LABELS_TA[rule.id] || 'ஜாதகத்தில் பொருந்திய விதி') : (rule.title || rule.sourceDescription || 'Matched horoscope rule'))+
      '</td></tr>'));
  const categoryTable = '<div class="adv-table-wrap smv-viii-table-scroll smv-ayurdaya-scroll"><table class="smv-ayurdaya-table smv-bv-raman-ayurdaya-table"><thead><tr><th>'+
    esc(ta?'வகை':'Category')+'</th><th>'+esc(ta?'ஜாதகத்தில் பொருந்திய ஜோதிட விதி':'Astrological rule matched in the horoscope')+
    '</th></tr></thead><tbody>'+(ruleRows.length ? ruleRows.join('') :
      '<tr><td colspan="2">'+esc(ta?'கிடைத்த ஜாதகத் தரவிலிருந்து எந்த விதியையும் உறுதியாகப் பொருத்த முடியவில்லை':'No rule could be confirmed from the available horoscope inputs')+'</td></tr>')+
    '</tbody></table></div>';
  const numericTable = '<div class="adv-table-wrap smv-viii-table-scroll smv-ayurdaya-scroll"><table class="smv-ayurdaya-table smv-bv-raman-ayurdaya-table"><thead><tr>'+
    header.map(v=>'<th>'+esc(v)+'</th>').join('')+'</tr></thead><tbody>'+planetRows+totalRows+'</tbody></table></div>';
  const disclaimer = ta
    ? 'இவை பாரம்பரிய ஆயுர்த்தாய முறையின் கணக்கீட்டு மதிப்பீடுகள் மட்டுமே; உண்மையான ஆயுளையோ மரண நேரத்தையோ உறுதியாகக் கூறுபவை அல்ல.'
    : 'This is a traditional Ayurdaya calculation only; it does not establish actual lifespan or predict the time of death.';
  return '<div class="smv-cg-rajan-ayurdaya smv-bv-raman-ayurdaya-skin" data-smv-bv-raman-ayurdaya-section="1">'+
    '<section class="smv-bv-raman-ayurdaya" data-smv-bv-raman-ayurdaya="1">'+
    '<h3>'+esc(ta?'அஷ்டகவர்க்க ஆயுர்த்தாயம்':'Ashtakavarga Ayurdaya')+'</h3>'+
    numericTable+
    '<h4>'+esc(ta?'ஆயுள் வகைக்கான பொருந்திய ஜோதிட விதிகள்':'Matched horoscope rules for longevity categories')+'</h4>'+
    categoryTable+
    '</section>'+
    '<p class="small smv-ayurdaya-disclaimer">'+esc(disclaimer)+'</p>'+
    '</div>';
}
