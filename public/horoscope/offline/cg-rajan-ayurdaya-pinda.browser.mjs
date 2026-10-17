/**
 * SMV ASTRO — C. G. Rajan Jathaka Kanitham I, source-specific arithmetic.
 * Pinda: printed pp.249–254; Naisargika component: pp.242–243;
 * Amsa raw component: printed pp.255–256 (PDF pp.277–278).
 *
 * The output sums seven graha components in a common traditional unit.
 * It is not a medical life-expectancy or death-age prediction. The classical
 * source's separate condition/house reductions are not silently inferred here;
 * see the visible method note in cgRajanAyurdayaReportHtml().
 */
const GRAHAS = Object.freeze([
  {ta:'சூரியன்', en:'Sun', pindaMax:19, exaltation:10, naisargikaMax:20},
  {ta:'சந்திரன்', en:'Moon', pindaMax:25, exaltation:33, naisargikaMax:1},
  {ta:'செவ்வாய்', en:'Mars', pindaMax:15, exaltation:298, naisargikaMax:2},
  {ta:'புதன்', en:'Mercury', pindaMax:12, exaltation:165, naisargikaMax:9},
  {ta:'குரு', en:'Jupiter', pindaMax:15, exaltation:95, naisargikaMax:18},
  {ta:'சுக்கிரன்', en:'Venus', pindaMax:21, exaltation:357, naisargikaMax:20},
  {ta:'சனி', en:'Saturn', pindaMax:20, exaltation:200, naisargikaMax:50}
]);
const BY_NAME = new Map(GRAHAS.flatMap(g => [[g.ta,g],[g.en.toLowerCase(),g]]));
const NAZHIGAI_PER_DAY = 60;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
const NAZHIGAI_PER_MONTH = NAZHIGAI_PER_DAY * DAYS_PER_MONTH;
const NAZHIGAI_PER_YEAR = NAZHIGAI_PER_MONTH * MONTHS_PER_YEAR;
const finiteNumber = value => value !== null && value !== undefined && String(value).trim() !== '' && Number.isFinite(Number(value));
const norm360 = value => ((value % 360) + 360) % 360;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function fromNazhi(total) {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError('Expected nonnegative integer nazhigai');
  let left = total;
  const years = Math.floor(left / NAZHIGAI_PER_YEAR); left %= NAZHIGAI_PER_YEAR;
  const months = Math.floor(left / NAZHIGAI_PER_MONTH); left %= NAZHIGAI_PER_MONTH;
  const days = Math.floor(left / NAZHIGAI_PER_DAY); left %= NAZHIGAI_PER_DAY;
  return Object.freeze({years, months, days, nazhigai:left, totalNazhigai:total});
}
function toNazhi(value) {
  const keys = ['years','months','days','nazhigai'];
  if (!value || !keys.every(k => Number.isSafeInteger(value[k]) && value[k] >= 0) ||
      value.months >= 12 || value.days >= 30 || value.nazhigai >= 60) {
    throw new RangeError('Ayurdhaya components must use normalized years/months/days/nazhigai');
  }
  const result = value.years * NAZHIGAI_PER_YEAR + value.months * NAZHIGAI_PER_MONTH + value.days * NAZHIGAI_PER_DAY + value.nazhigai;
  if (!Number.isSafeInteger(result)) throw new RangeError('Ayurdhaya value exceeds safe integer range');
  return result;
}
const roundNazhi = value => fromNazhi(Math.round(value));
const fmt = (value, ta) => ta
  ? `${value.years} வருடம் ${value.months} மாதம் ${value.days} நாள் ${value.nazhigai} நாழிகை`
  : `${value.years} years ${value.months} months ${value.days} days ${value.nazhigai} nazhigai`;
const fmtDegrees = value => {
  let whole = Math.floor(value + 1e-10);
  let minutes = Math.round((value - whole) * 60);
  if (minutes === 60) { whole += 1; minutes = 0; }
  return `${whole}°${String(minutes).padStart(2,'0')}′`;
};
function pindaComponent(graha, longitude) {
  const raw = norm360(graha.exaltation - norm360(longitude));
  const remainingArc = raw < 180 ? 360 - raw : raw;
  const exactNazhi = remainingArc / 360 * graha.pindaMax * NAZHIGAI_PER_YEAR;
  return Object.freeze({value:roundNazhi(exactNazhi), arc:remainingArc, maximumYears:graha.pindaMax, exactNazhi});
}
function naisargikaComponent(graha, longitude) {
  const raw = norm360(graha.exaltation - norm360(longitude));
  const remainingArc = raw < 180 ? 360 - raw : raw;
  const exactNazhi = remainingArc / 360 * graha.naisargikaMax * NAZHIGAI_PER_YEAR;
  return Object.freeze({value:roundNazhi(exactNazhi), arc:remainingArc, maximumYears:graha.naisargikaMax, exactNazhi});
}
function amsaComponent(longitude) {
  const normalizedLongitude = norm360(longitude);
  const remainder = normalizedLongitude % 40;
  // Rajan's example: 24°48′ × 0.3 year/degree = 7y 5m 8d 24n.
  const exactNazhi = remainder * 0.3 * NAZHIGAI_PER_YEAR;
  return Object.freeze({value:roundNazhi(exactNazhi), longitude:normalizedLongitude, remainder, yearsPerDegree:0.3, exactNazhi});
}
function findGraha(chartPlanets, spec) {
  const p = chartPlanets.find(x => {
    const key = String(x?.name ?? x?.planet ?? '').trim();
    const canonical = BY_NAME.get(key) || BY_NAME.get(key.toLowerCase());
    return canonical?.en === spec.en;
  });
  if (!p || !finiteNumber(p.longitude)) throw new TypeError(`Missing true chart longitude for ${spec.en}`);
  return Number(p.longitude);
}

/** Build the transparent, common-unit result from the already-computed chart. */
export function cgRajanCompareGrahas({planets=[]}={}) {
  if (!Array.isArray(planets)) throw new TypeError('chart planets must be an array');
  const entries = GRAHAS.map(g => {
    const longitude = findGraha(planets, g);
    return Object.freeze({
      name:g.ta, english:g.en, longitude,
      pinda:pindaComponent(g, longitude),
      natural:naisargikaComponent(g, longitude),
      amsa:amsaComponent(longitude)
    });
  });
  const totalFor = key => fromNazhi(entries.reduce((sum, e) => sum + toNazhi(e[key].value), 0));
  const totals = Object.freeze({pinda:totalFor('pinda'), naisargika:totalFor('natural'), amsa:totalFor('amsa')});
  const sumNazhi = toNazhi(totals.pinda) + toNazhi(totals.naisargika) + toNazhi(totals.amsa);
  const average = fromNazhi(Math.round(sumNazhi / 3));
  return Object.freeze({
    entries:Object.freeze(entries), totals, average,
    averageExactNazhi:sumNazhi / 3,
    averageSource:'Arithmetic mean of the three seven-graha component totals, expressed in 12-month/30-day/60-nazhigai units',
    finalClassicalReductionsApplied:false,
    includesLagnaComponent:false,
    source:'C. G. Rajan, Jathaka Kanitham I, Pinda pp.249–254; Naisargika pp.242–243; Amsa pp.255–256'
  });
}

export function cgRajanAyurdayaReportHtml({planets, language='ta'}={}) {
  const ta = language === 'ta';
  const result = cgRajanCompareGrahas({planets});
  const degree = value => esc(fmtDegrees(value));
  const cell = (component, formula) => `<td class="smv-ayurdaya-value"><span class="smv-ayurdaya-units">${esc(fmt(component.value,ta))}</span><small class="smv-ayurdaya-formula">${formula}</small></td>`;
  const rows = result.entries.map(g => `<tr>
    <th scope="row" class="smv-ayurdaya-graha">${esc(ta?g.name:g.english)}</th>
    ${cell(g.pinda,`${ta?'வளைவு':'Arc'} ${degree(g.pinda.arc)} ÷ 360 × ${g.pinda.maximumYears}`)}
    ${cell(g.natural,`${ta?'வளைவு':'Arc'} ${degree(g.natural.arc)} ÷ 360 × ${g.natural.maximumYears}`)}
    ${cell(g.amsa,`${ta?'மீதி':'Remainder'} ${degree(g.amsa.remainder)} × 0.3`)}
  </tr>`).join('');
  const headers = ta
    ? ['கிரகம்','பிண்ட ஆயுர்த்தாயம்','நைசர்க்கிக ஆயுர்த்தாயம்','அம்ச ஆயுர்த்தாயம்']
    : ['Planet','Pinda Ayurdhaya','Naisargika Ayurdhaya','Amsa Ayurdhaya'];
  const totalLabel = ta ? 'ஏழு கிரக மொத்தம்' : '7-graha total';
  const averageLabel = ta ? 'மூன்று முறைகளின் சராசரி ஆயுட்காலக் கணக்கு' : 'Average Longevity (three-method arithmetic result)';
  const note = ta
    ? 'மூலக் கணக்கு: 1 வருடம் = 12 மாதம்; 1 மாதம் = 30 நாள்; 1 நாள் = 60 நாழிகை. இங்கு ஏழு கிரகங்களின் அடிப்படைப் பங்குகள் மட்டுமே கூட்டப்பட்டுள்ளன. நூலில் தனியாகக் கூறப்படும் பாவ/நிலை சார்ந்த அரணக் குறைப்புகள் மற்றும் லக்னப் பங்கு இம்மொத்தத்தில் சேர்க்கப்படவில்லை; எனவே இதை முழுமையாகத் திருத்திய இறுதி ஆயுட்காலக் கணிப்பாகக் கருத வேண்டாம். இது மருத்துவ வாழ்நாள் கணிப்போ மரண வயது கணிப்போ அல்ல.'
    : 'Unit basis: 1 year = 12 months, 1 month = 30 days, 1 day = 60 nazhigai. This sums the displayed base components for the seven grahas only. Source-specific house/condition reductions and the Lagna component are not included, so this is not a fully reduced final classical longevity calculation, a medical life-expectancy estimate, or a death-age prediction.';
  const averageFormula = ta
    ? `(${fmt(result.totals.pinda,true)} + ${fmt(result.totals.naisargika,true)} + ${fmt(result.totals.amsa,true)}) ÷ 3 = ${fmt(result.average,true)}`
    : `(${fmt(result.totals.pinda,false)} + ${fmt(result.totals.naisargika,false)} + ${fmt(result.totals.amsa,false)}) ÷ 3 = ${fmt(result.average,false)}`;
  return `<section class="smv-cg-rajan-ayurdaya" data-smv-cg-rajan-ayurdaya="1">
    <h3>${ta?'பாரம்பரிய ஆயுர்த்தாயக் கணக்கீடு':'Traditional Ayurdhaya Calculation'}</h3>
    <p class="small smv-ayurdaya-method-note">${esc(note)}</p>
    <div class="smv-cg-rajan-ayurdaya-table-wrap" role="region" tabindex="0" aria-label="${ta?'ஆயுர்த்தாய அட்டவணை; கிடைமட்டமாக உருட்டலாம்':'Ayurdhaya table; scroll horizontally'}">
      <table class="smv-cg-rajan-ayurdaya-table">
        <thead><tr>${headers.map((v,i)=>`<th scope="col" class="${i===0?'smv-ayurdaya-graha-head':''}">${esc(v)}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr class="smv-ayurdaya-total-row"><th scope="row">${esc(totalLabel)}</th>
          <td><b>${esc(fmt(result.totals.pinda,ta))}</b></td>
          <td><b>${esc(fmt(result.totals.naisargika,ta))}</b></td>
          <td><b>${esc(fmt(result.totals.amsa,ta))}</b></td>
        </tr></tfoot>
      </table>
    </div>
    <div class="smv-ayurdaya-average" aria-live="polite">
      <h4>${esc(averageLabel)}</h4>
      <p class="smv-ayurdaya-average-formula">${esc(averageFormula)}</p>
      <p class="smv-ayurdaya-average-result"><b>${esc(fmt(result.average,ta))}</b></p>
    </div>
    <p class="small smv-ayurdaya-unit-note">${ta?'சராசரியை கணக்கிட, மூன்று மொத்தங்களும் முதலில் நாழிகையாக மாற்றப்பட்டு கூட்டப்பட்டு 3-ஆல் வகுக்கப்பட்டன; இறுதி சராசரியில் அருகிலுள்ள ஒரு நாழிகைக்கு மட்டும் வட்டமிடப்பட்டது.':'For the mean, all three totals are converted to nazhigai, added, and divided by 3; only the final average is rounded to the nearest nazhigai.'}</p>
  </section>`;
}
