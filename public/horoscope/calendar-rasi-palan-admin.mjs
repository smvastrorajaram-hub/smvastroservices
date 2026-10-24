import { RASI_PALAN_PLANETS, readingKey } from './calendar-rasi-palan-rules.mjs';
import { signs } from './calendar-data.mjs';
import { periodReference } from './calendar/rasi-palan-periods.mjs';

const MODES = ['automatic', 'manual', 'hybrid'];
const TYPES = {
  daily: { kind: 'period', ta: 'தினசரி ராசி பலன்', en: 'Daily Rasi Palan' },
  weekly: { kind: 'period', ta: 'வார ராசி பலன்', en: 'Weekly Rasi Palan' },
  monthly: { kind: 'period', ta: 'மாத ராசி பலன்', en: 'Monthly Rasi Palan' },
  tamilNewYear: { kind: 'year', ta: 'தமிழ் வருடப் பிறப்பு ராசி பலன்கள்', en: 'Tamil New Year Rasi Palan' },
  englishNewYear: { kind: 'year', ta: 'ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்', en: 'English New Year Rasi Palan' },
  jupiterTransit: { kind: 'transit', ta: 'குரு பெயர்ச்சி பலன்கள்', en: 'Jupiter Transit Predictions', planets: ['Jupiter'] },
  saturnTransit: { kind: 'transit', ta: 'சனி பெயர்ச்சி பலன்கள்', en: 'Saturn Transit Predictions', planets: ['Saturn'] },
  rahuKetuTransit: { kind: 'transit', ta: 'ராகு–கேது பெயர்ச்சி பலன்கள்', en: 'Rahu–Ketu Transit Predictions', planets: ['Rahu', 'Ketu'] }
};
const PLANET_TA = {
  Moon: 'சந்திரன்', Sun: 'சூரியன்', Mars: 'செவ்வாய்', Mercury: 'புதன்',
  Jupiter: 'குரு', Venus: 'சுக்கிரன்', Saturn: 'சனி', Rahu: 'ராகு', Ketu: 'கேது'
};
const DRAFT_KEY = 'smv-calendar-rasi-palan-admin-draft-v1';

function localToday() {
  let offset = 330;
  try {
    const settings = JSON.parse(localStorage.getItem('smv-calendar-settings') || '{}');
    if (Number.isFinite(Number(settings.offset))) offset = Number(settings.offset);
  } catch (_) {}
  return new Date(Date.now() + offset * 60000).toISOString().slice(0, 10);
}
function readDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) { return {}; }
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const d = new Date(value + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function escaped(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function mountCalendarRasiPalanAdmin(container, adminAuth) {
  if (!container || container.querySelector('#smvCalendarRasiPalanAdmin')) return;
  const root = document.createElement('section');
  root.id = 'smvCalendarRasiPalanAdmin';
  root.className = 'wb-inline-section';
  root.innerHTML = `
    <style>
      #smvCalendarRasiPalanAdmin{margin:18px 0;padding:0;border:0;border-radius:0;background:transparent;color:#292328}
      #smvCalendarRasiPalanAdmin *{box-sizing:border-box}
      #smvCalendarRasiPalanAdmin h4{margin:0 0 7px;color:#7c1936}
      #smvCalendarRasiPalanAdmin .crpa-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      #smvCalendarRasiPalanAdmin label{display:block;margin:0 0 9px;font-size:14px;font-weight:650}
      #smvCalendarRasiPalanAdmin input,#smvCalendarRasiPalanAdmin select,#smvCalendarRasiPalanAdmin textarea{display:block;width:100%;min-width:0;min-height:42px;margin-top:5px;padding:8px 9px;border:1px solid #ccb9a5;border-radius:6px;background:#fff;color:#292328;font:inherit}
      #smvCalendarRasiPalanAdmin textarea{min-height:130px;line-height:1.7;resize:vertical}
      #smvCalendarRasiPalanAdmin .crpa-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
      #smvCalendarRasiPalanAdmin button{border:0;border-radius:7px;background:#7c1f35;color:#fff;padding:9px 12px;min-height:40px;font:inherit;cursor:pointer}
      #smvCalendarRasiPalanAdmin button.crpa-secondary{background:#ece5d9;color:#392a2d}
      #smvCalendarRasiPalanAdmin button:disabled{opacity:.6;cursor:not-allowed}
      #smvCalendarRasiPalanAdmin .crpa-hint{margin:6px 0 12px;font-size:13px;line-height:1.65;color:#665b59}
      #smvCalendarRasiPalanAdmin .crpa-status{min-height:24px;margin:8px 0 0;white-space:pre-wrap;font-size:13px;line-height:1.6;color:#155a37}
      #smvCalendarRasiPalanAdmin .crpa-status[data-error="1"]{color:#a41020}
      #smvCalendarRasiPalanAdmin [hidden]{display:none}
      @media(max-width:680px){#smvCalendarRasiPalanAdmin{padding:10px}#smvCalendarRasiPalanAdmin .crpa-grid{grid-template-columns:1fr 1fr}#smvCalendarRasiPalanAdmin .crpa-actions button{flex:1 1 100%}}
      @media(max-width:380px){#smvCalendarRasiPalanAdmin .crpa-grid{grid-template-columns:1fr}}
    </style>
    <h4>ராசி பலன்கள் & கிரக கோச்சார நிர்வாகம்</h4>
    <p class="crpa-hint">இது SMV HOROSCOPE-இன் ஏற்கெனவே உள்ள Admin அனுமதிக்குள் இணைக்கப்பட்டுள்ளது. தினசரி / வார / மாத / தமிழ் வருட / ஆங்கில வருட பலன்களுக்கு சந்திரன் உட்பட ஒன்பது கிரகங்களின் தமிழ், ஆங்கில உரைகளைத் திருத்தலாம். குரு, சனி, ராகு–கேது பெயர்ச்சி பதிவுகளும் இதே இடத்தில் நிர்வகிக்கப்படும்.</p>
    <div class="crpa-grid">
      <label>பலன் வகை / Prediction type<select id="crpaType"></select></label>
      <label id="crpaDateWrap">தேதி / Week / Month reference date<input id="crpaDate" type="date" min="1800-01-01" max="2399-12-31"></label>
      <label id="crpaYearWrap" hidden>வருடம் / Year<input id="crpaYear" type="number" min="1800" max="2399" step="1"></label>
      <label id="crpaEventDateWrap" hidden>பெயர்ச்சி தேதி / Ingress date<input id="crpaEventDate" type="date" min="1800-01-01" max="2399-12-31"></label>
      <label>ராசி / Rasi<select id="crpaRasi"></select></label>
      <label>கிரகம் / Planet<select id="crpaPlanet"></select></label>
      <label>மொழி / Language<select id="crpaLanguage"><option value="ta">தமிழ்</option><option value="en">English</option></select></label>
      <label>பலன் முறை / Prediction mode<select id="crpaMode"><option value="automatic">Automatic</option><option value="manual">Manual only</option><option value="hybrid">Hybrid · Manual first</option></select></label>
    </div>
    <label>கையேடு ராசி பலன் / Manual prediction<textarea id="crpaPrediction" maxlength="4000" rows="6" spellcheck="true" placeholder="தேர்ந்தெடுத்த காலம், ராசி, கிரகம், மொழிக்கான பலனை எழுதவும்."></textarea></label>
    <p id="crpaEntryKey" class="crpa-hint"></p>
    <div class="crpa-actions">
      <button type="button" class="crpa-secondary" id="crpaSaveDraft">Save local draft</button>
      <button type="button" class="crpa-secondary" id="crpaRemoveEntry">Remove selected entry</button>
      <button type="button" id="crpaPublish">Publish forecasts</button>
    </div>
    <p class="crpa-hint">கையேடு உரை கிடைக்கும் இடங்களில் Hybrid முறை அதை முதலில் காட்டும்; உரை இல்லாத இடங்களில் தானியங்கி Swiss Ephemeris பலன் தொடரும். Publish செய்வது பொதுக் Calendar-ல் ஆன்லைனில் கிடைக்கும் பதிவை மட்டும் புதுப்பிக்கும்.</p>
    <p id="crpaStatus" class="crpa-status" role="status" aria-live="polite">Admin உரிமைச் சரிபார்ப்பு தயாராகிறது…</p>`;
  container.appendChild(root);

  const $ = id => root.querySelector('#' + id);
  let fsApi = null;
  let db = null;
  let workingEntries = {};
  let publishedMode = 'hybrid';
  let remoteData = {};
  let busy = false;
  const status = (message, error = false) => {
    const el = $('crpaStatus');
    if (el) { el.textContent = message || ''; el.dataset.error = error ? '1' : '0'; }
  };
  const selectedType = () => $('crpaType').value;
  const typeInfo = () => TYPES[selectedType()] || TYPES.daily;
  function saveLocalDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        mode: $('crpaMode').value,
        targetDate: $('crpaDate').value,
        targetYear: Number($('crpaYear').value),
        targetType: selectedType(),
        targetEventDate: $('crpaEventDate').value,
        rasiIndex: Number($('crpaRasi').value),
        planet: $('crpaPlanet').value,
        language: $('crpaLanguage').value,
        entries: workingEntries
      }));
      return true;
    } catch (_) { return false; }
  }
  function allowedPlanets() {
    return typeInfo().planets || ['Moon', ...RASI_PALAN_PLANETS.map(p => p.key)];
  }
  function updatePlanetOptions() {
    const previous = $('crpaPlanet').value;
    const available = allowedPlanets();
    $('crpaPlanet').innerHTML = available.map(key =>
      '<option value="' + escaped(key) + '">' +
      escaped($('crpaLanguage').value === 'ta' ? (PLANET_TA[key] || key) : key) + '</option>'
    ).join('');
    $('crpaPlanet').value = available.includes(previous) ? previous : (available[0] || 'Moon');
  }
  function updateRasiOptions() {
    const selected = $('crpaRasi').value;
    $('crpaRasi').innerHTML = signs.map((sign, index) =>
      '<option value="' + index + '">' + escaped(sign[$('crpaLanguage').value === 'ta' ? 1 : 0]) + '</option>'
    ).join('');
    if (selected !== '') $('crpaRasi').value = selected;
  }
  function updateTypeControls() {
    const kind = typeInfo().kind;
    $('crpaDateWrap').hidden = kind !== 'period';
    $('crpaYearWrap').hidden = kind !== 'year';
    $('crpaEventDateWrap').hidden = kind !== 'transit';
    updatePlanetOptions();
    refreshEntry();
  }
  function currentKey() {
    const type = selectedType();
    let periodKey;
    if (typeInfo().kind === 'period') {
      const date = $('crpaDate').value;
      if (!validDate(date)) throw new Error('1800–2399 வரம்புக்குள் செல்லுபடியாகும் தேதியைத் தேர்ந்தெடுக்கவும்.');
      periodKey = periodReference(type, date).key;
    } else if (typeInfo().kind === 'year') {
      const year = Number($('crpaYear').value);
      if (!Number.isInteger(year) || year < 1800 || year > 2399) throw new Error('1800–2399 வரம்புக்குள் வருடத்தைத் தேர்ந்தெடுக்கவும்.');
      periodKey = String(year);
    } else {
      periodKey = $('crpaEventDate').value;
      if (!validDate(periodKey)) throw new Error('கணக்கிடப்பட்ட பெயர்ச்சி நிகழ்வு தேதியைத் தேர்ந்தெடுக்கவும்.');
    }
    const rasi = Number($('crpaRasi').value);
    if (!Number.isInteger(rasi) || rasi < 0 || rasi >= signs.length) throw new Error('ராசியைத் தேர்ந்தெடுக்கவும்.');
    return readingKey(type, periodKey, rasi, $('crpaPlanet').value, $('crpaLanguage').value);
  }
  function refreshEntry() {
    if (!root.isConnected) return;
    updatePlanetOptions();
    try {
      const key = currentKey();
      $('crpaEntryKey').textContent = 'Entry key: ' + key + (Object.hasOwn(workingEntries, key) ? ' · பதிவு உள்ளது / saved' : ' · புதிய பதிவு / new entry');
      $('crpaPrediction').value = String(workingEntries[key] || '');
    } catch (error) {
      $('crpaEntryKey').textContent = error.message || String(error);
      $('crpaPrediction').value = '';
    }
  }
  function commit(remove = false) {
    const key = currentKey();
    if (remove) delete workingEntries[key];
    else {
      const prediction = String($('crpaPrediction').value || '').trim();
      if (!prediction) throw new Error('முதலில் பலன் உரையை எழுதவும்.');
      if (prediction.length > 4000) throw new Error('பலன் உரை 4000 எழுத்துகளுக்குள் இருக்க வேண்டும்.');
      workingEntries[key] = prediction;
    }
    if (!saveLocalDraft()) throw new Error('Local draft சேமிக்கப்படவில்லை. Browser storage-ஐச் சரிபார்க்கவும்.');
    refreshEntry();
    return key;
  }
  async function initialize() {
    try {
      if (!adminAuth?.currentUser) throw new Error('SMV HOROSCOPE Admin session இல்லை. Admin-ல் மீண்டும் உள்நுழையவும்.');
      const [appModule, firestoreModule] = await Promise.all([
        import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
      ]);
      const app = appModule.getApps().find(x => x.name === 'smv-prediction-admin-auth');
      if (!app) throw new Error('ஏற்கெனவே உள்ள SMV HOROSCOPE Admin Firebase session கிடைக்கவில்லை.');
      fsApi = firestoreModule;
      db = firestoreModule.getFirestore(app);
      // Reconfirm the same server-enforced role gate before reading or publishing Calendar data.
      await fsApi.getDocFromServer(fsApi.doc(db, 'smv_settings', 'prediction_editor_access'));
      const snap = await fsApi.getDocFromServer(fsApi.doc(db, 'smv_content', 'calendar_rasi_palan_v1'));
      if (adminAuth.currentUser == null) throw new Error('Admin session முடிந்துவிட்டது. மீண்டும் உள்நுழையவும்.');
      if (snap.exists()) {
        remoteData = snap.data() || {};
        const entries = remoteData.entries;
        workingEntries = entries && typeof entries === 'object' && !Array.isArray(entries) ? { ...entries } : {};
        publishedMode = MODES.includes(remoteData.mode) ? remoteData.mode : 'hybrid';
      }
      const draft = readDraft();
      if (draft.entries && typeof draft.entries === 'object' && !Array.isArray(draft.entries)) {
        workingEntries = { ...workingEntries, ...draft.entries };
      }
      $('crpaType').innerHTML = Object.entries(TYPES).map(([key, item]) =>
        '<option value="' + key + '">' + escaped(item.ta + ' / ' + item.en) + '</option>'
      ).join('');
      $('crpaRasi').innerHTML = signs.map((sign, index) =>
        '<option value="' + index + '">' + escaped(sign[1] + ' / ' + sign[0]) + '</option>'
      ).join('');
      $('crpaDate').value = validDate(draft.targetDate) ? draft.targetDate : localToday();
      $('crpaYear').value = Number.isInteger(Number(draft.targetYear)) && Number(draft.targetYear) >= 1800 && Number(draft.targetYear) <= 2399
        ? Number(draft.targetYear) : Number(localToday().slice(0, 4));
      $('crpaEventDate').value = validDate(draft.targetEventDate) ? draft.targetEventDate : localToday();
      if (Object.hasOwn(TYPES, draft.targetType)) $('crpaType').value = draft.targetType;
      $('crpaMode').value = MODES.includes(draft.mode) ? draft.mode : publishedMode;
      updateRasiOptions();
      updateTypeControls();
      if (Number.isInteger(Number(draft.rasiIndex)) && Number(draft.rasiIndex) >= 0 && Number(draft.rasiIndex) < signs.length) $('crpaRasi').value = String(draft.rasiIndex);
      if (typeof draft.planet === 'string') $('crpaPlanet').value = draft.planet;
      if (draft.language === 'en' || draft.language === 'ta') $('crpaLanguage').value = draft.language;
      updatePlanetOptions();
      refreshEntry();
      status('Calendar editor தயாராக உள்ளது. தமிழிலும் ஆங்கிலத்திலும் தனித்தனி பதிவுகளைச் சேமிக்கவும்.');
    } catch (error) {
      status('Calendar Admin: ' + (error?.message || String(error)), true);
      root.querySelectorAll('button').forEach(button => { button.disabled = true; });
    }
  }
  async function publish() {
    if (busy) return;
    const button = $('crpaPublish');
    busy = true;
    button.disabled = true;
    try {
      if (!adminAuth?.currentUser) throw new Error('Admin session இல்லை. மீண்டும் உள்நுழையவும்.');
      await fsApi.getDocFromServer(fsApi.doc(db, 'smv_settings', 'prediction_editor_access'));
      if (String($('crpaPrediction').value || '').trim()) commit(false);
      const type = selectedType();
      const year = typeInfo().kind === 'year' ? Number($('crpaYear').value)
        : typeInfo().kind === 'period' ? Number($('crpaDate').value.slice(0, 4))
        : Number($('crpaEventDate').value.slice(0, 4));
      const payload = {
        schemaVersion: 1,
        published: true,
        mode: MODES.includes($('crpaMode').value) ? $('crpaMode').value : 'hybrid',
        targetYear: year,
        targetType: type,
        targetEventDate: typeInfo().kind === 'transit' ? $('crpaEventDate').value : null,
        entries: workingEntries,
        updatedBy: adminAuth.currentUser.uid,
        updatedAt: fsApi.serverTimestamp()
      };
      await fsApi.setDoc(fsApi.doc(db, 'smv_content', 'calendar_rasi_palan_v1'), payload);
      remoteData = payload;
      publishedMode = payload.mode;
      if (!saveLocalDraft()) status('வெளியிட்டது; ஆனால் local draft சேமிக்க முடியவில்லை.', true);
      else status('Calendar ராசி பலன்கள் / கோச்சார உரைகள் வெளியிடப்பட்டன.', false);
    } catch (error) {
      status(error?.message || String(error), true);
    } finally {
      busy = false;
      button.disabled = false;
    }
  }
  $('crpaType').addEventListener('change', updateTypeControls);
  $('crpaDate').addEventListener('change', refreshEntry);
  $('crpaYear').addEventListener('change', refreshEntry);
  $('crpaEventDate').addEventListener('change', refreshEntry);
  $('crpaRasi').addEventListener('change', () => {
    const draft = readDraft(); draft.rasiIndex = Number($('crpaRasi').value); saveLocalDraft();
    refreshEntry();
  });
  $('crpaPlanet').addEventListener('change', refreshEntry);
  $('crpaLanguage').addEventListener('change', () => { updateRasiOptions(); updatePlanetOptions(); refreshEntry(); });
  $('crpaMode').addEventListener('change', () => { if (saveLocalDraft()) status('பலன் முறை local draft-ல் சேமிக்கப்பட்டது.'); else status('Local draft சேமிக்கப்படவில்லை.', true); });
  $('crpaSaveDraft').addEventListener('click', () => {
    try {
      const key = commit(false);
      const draft = readDraft();
      draft.targetDate = $('crpaDate').value;
      draft.targetYear = Number($('crpaYear').value);
      draft.targetType = selectedType();
      draft.targetEventDate = $('crpaEventDate').value;
      draft.rasiIndex = Number($('crpaRasi').value);
      draft.planet = $('crpaPlanet').value;
      draft.language = $('crpaLanguage').value;
      saveLocalDraft();
      status('Local draft சேமிக்கப்பட்டது: ' + key);
    } catch (error) { status(error?.message || String(error), true); }
  });
  $('crpaRemoveEntry').addEventListener('click', () => {
    try {
      const key = commit(true);
      status('Local draft-இலிருந்து நீக்கப்பட்டது: ' + key + '. நிரந்தரமாக நீக்க Publish செய்யவும்.');
    } catch (error) { status(error?.message || String(error), true); }
  });
  $('crpaPublish').addEventListener('click', publish);
  initialize();
}
