import { RASI_PALAN_PLANETS, readingKey } from '../calendar-rasi-palan-rules.mjs';
import { signs } from '../calendar-data.mjs';

const $ = id => document.getElementById(id);
const allowedModes = ['automatic', 'manual', 'hybrid'];
const types = {
  tamilNewYear: { label: 'தமிழ் வருடப் பிறப்பு ராசி பலன்கள்', kind: 'year' },
  englishNewYear: { label: 'ஆங்கில வருடப் பிறப்பு ராசி பலன்கள்', kind: 'year' },
  jupiterTransit: { label: 'குரு பெயர்ச்சி பலன்கள்', kind: 'transit', planets: ['Jupiter'] },
  saturnTransit: { label: 'சனி பெயர்ச்சி பலன்கள்', kind: 'transit', planets: ['Saturn'] },
  rahuKetuTransit: { label: 'ராகு–கேது பெயர்ச்சி பலன்கள்', kind: 'transit', planets: ['Rahu', 'Ketu'] }
};
const firebaseConfig = {
  apiKey: 'AIzaSyCKXyfZ9sjGmej7ygxHpZHNcNysMXHuvSs',
  authDomain: 'smv-astro.firebaseapp.com',
  projectId: 'smv-astro',
  storageBucket: 'smv-astro.firebasestorage.app',
  messagingSenderId: '299081899217',
  appId: '1:299081899217:web:8d558df08e86037ea539f0'
};
let firebase = null;
let auth = null;
let db = null;
let fsApi = null;
let authApi = null;
let verified = false;
let workingEntries = {};
let publishedMode = 'hybrid';
let localDraft = {};
const rootLoginPanel = $('loginForm').closest('.panel');
const todayLocal = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
$('year').value = Number(todayLocal().slice(0, 4));
$('eventDate').value = todayLocal();

function status(message, bad = false, id = 'status') {
  const el = $(id);
  if (!el) return;
  el.textContent = message || '';
  el.classList.toggle('error', !!bad);
}
function readLocalDraft() {
  try {
    const value = JSON.parse(localStorage.getItem('smv-calendar-rasi-palan-admin-draft-v1') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) { return {}; }
}
function writeLocalDraft() {
  try {
    localStorage.setItem('smv-calendar-rasi-palan-admin-draft-v1', JSON.stringify({
      mode: $('mode').value,
      targetYear: Number($('year').value),
      entries: workingEntries
    }));
    return true;
  } catch (_) { return false; }
}
function modeValue(value) {
  return allowedModes.includes(value) ? value : 'hybrid';
}
async function initFirebase() {
  if (firebase) return firebase;
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
  ]);
  const app = appModule.getApps().find(x => x.name === 'smv-calendar-admin-auth') ||
    appModule.initializeApp(firebaseConfig, 'smv-calendar-admin-auth');
  authApi = authModule;
  fsApi = firestoreModule;
  auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserSessionPersistence);
  if (auth.authStateReady) await auth.authStateReady();
  db = firestoreModule.getFirestore(app);
  firebase = { appModule, authModule, firestoreModule };
  return firebase;
}
async function verifyAdmin() {
  if (!auth?.currentUser) return false;
  try {
    await fsApi.getDocFromServer(fsApi.doc(db, 'smv_settings', 'prediction_editor_access'));
    return true;
  } catch (error) {
    if (error?.code === 'permission-denied' || error?.code === 'unauthenticated') return false;
    throw error;
  }
}
function setSignOptions() {
  $('rasi').innerHTML = signs.map((sign, index) =>
    '<option value="' + index + '">' + sign[$('language').value === 'ta' ? 1 : 0] + '</option>'
  ).join('');
}
function permittedPlanets(type) {
  return types[type]?.planets || RASI_PALAN_PLANETS.map(p => p.key);
}
function setPlanetOptions(keepCurrent = true) {
  const type = $('type').value;
  const available = permittedPlanets(type);
  const current = keepCurrent ? $('planet').value : '';
  $('planet').innerHTML = available.map(key => {
    const item = RASI_PALAN_PLANETS.find(p => p.key === key);
    const label = item ? ( $('language').value === 'ta' ? item.ta : item.key ) : key;
    return '<option value="' + key + '">' + label + '</option>';
  }).join('');
  if (available.includes(current)) $('planet').value = current;
}
function selectedKey() {
  const type = $('type').value;
  const year = Number($('year').value);
  if (!Number.isInteger(year) || year < 1800 || year > 2399) throw new Error('1800–2399 வரம்புக்குள் வருடத்தைத் தேர்ந்தெடுக்கவும்.');
  let periodKey = String(year);
  if (types[type]?.kind === 'transit') {
    periodKey = $('eventDate').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodKey)) throw new Error('கணக்கிடப்பட்ட பெயர்ச்சி நிகழ்வு தேதியைத் தேர்ந்தெடுக்கவும்.');
  }
  return readingKey(type, periodKey, Number($('rasi').value), $('planet').value, $('language').value);
}
function refreshEntry() {
  const transit = types[$('type').value]?.kind === 'transit';
  $('eventDateWrap').hidden = !transit;
  setPlanetOptions(true);
  try {
    const key = selectedKey();
    $('entryKey').textContent = 'Entry key: ' + key + (Object.hasOwn(workingEntries, key) ? ' · பதிவு உள்ளது' : ' · புதிய பதிவு');
    $('prediction').value = String(workingEntries[key] || '');
  } catch (error) {
    $('entryKey').textContent = error.message;
    $('prediction').value = '';
  }
}
async function loadExistingEntries() {
  workingEntries = {};
  publishedMode = 'hybrid';
  try {
    const snap = await fsApi.getDocFromServer(fsApi.doc(db, 'smv_content', 'calendar_rasi_palan_v1'));
    if (snap.exists()) {
      const data = snap.data() || {};
      if (data.entries && typeof data.entries === 'object' && !Array.isArray(data.entries)) {
        workingEntries = { ...data.entries };
      }
      publishedMode = modeValue(data.mode);
    }
  } catch (error) {
    if (error?.code !== 'permission-denied' && error?.code !== 'not-found') throw error;
    // A new document may not exist yet. Admin authorization was verified above.
  }
  localDraft = readLocalDraft();
  if (localDraft.entries && typeof localDraft.entries === 'object' && !Array.isArray(localDraft.entries)) {
    workingEntries = { ...workingEntries, ...localDraft.entries };
  }
  $('mode').value = modeValue(localDraft.mode || publishedMode);
  refreshEntry();
}
function syncLanguageLabels() {
  setSignOptions();
  setPlanetOptions(true);
  refreshEntry();
}
function commitCurrentPrediction(remove = false) {
  const key = selectedKey();
  const text = String($('prediction').value || '').trim();
  if (remove) {
    delete workingEntries[key];
  } else {
    if (!text) throw new Error('பலனை எழுதவும். பதிவை நீக்க வேண்டுமெனில் Remove selected entry பயன்படுத்தவும்.');
    if (text.length > 4000) throw new Error('பலன் 4000 எழுத்துகளுக்குள் இருக்க வேண்டும்.');
    workingEntries[key] = text;
  }
  if (!writeLocalDraft()) throw new Error('உள்ளூர் வரைவைச் சேமிக்க முடியவில்லை; browser storage-ஐச் சரிபார்க்கவும்.');
  refreshEntry();
  return key;
}
async function login(event) {
  event.preventDefault();
  const button = $('loginButton');
  button.disabled = true;
  status('Admin உரிமை சரிபார்க்கப்படுகிறது…');
  try {
    await initFirebase();
    await authApi.signInWithEmailAndPassword(auth, $('adminEmail').value.trim(), $('adminPassword').value);
    if (!await verifyAdmin()) {
      await authApi.signOut(auth);
      throw new Error('இந்தக் கணக்கிற்கு Admin அனுமதி இல்லை.');
    }
    verified = true;
    await loadExistingEntries();
    rootLoginPanel.hidden = true;
    $('editor').hidden = false;
    status('Admin அணுகல் உறுதிப்படுத்தப்பட்டது.', false, 'publishStatus');
  } catch (error) {
    status(error?.message || String(error), true);
  } finally {
    button.disabled = false;
  }
}
async function logout() {
  try { if (auth && authApi) await authApi.signOut(auth); } catch (_) {}
  verified = false;
  $('editor').hidden = true;
  rootLoginPanel.hidden = false;
  $('adminPassword').value = '';
  status('Admin வெளியேறிவிட்டார்.');
}
async function publish() {
  if (!verified || !await verifyAdmin()) {
    verified = false;
    status('Admin session இல்லை. மீண்டும் உள்நுழையவும்.', true, 'publishStatus');
    return;
  }
  const button = $('publish');
  button.disabled = true;
  try {
    // Publishing also saves the text currently being edited.
    commitCurrentPrediction(false);
    const type = $('type').value;
    const payload = {
      schemaVersion: 1,
      published: true,
      mode: modeValue($('mode').value),
      targetYear: Number($('year').value),
      targetType: type,
      targetEventDate: types[type]?.kind === 'transit' ? $('eventDate').value : null,
      entries: workingEntries,
      updatedBy: auth.currentUser.uid,
      updatedAt: fsApi.serverTimestamp()
    };
    await fsApi.setDoc(fsApi.doc(db, 'smv_content', 'calendar_rasi_palan_v1'), payload);
    publishedMode = payload.mode;
    if (!writeLocalDraft()) status('வெளியிட்டது; ஆனால் local draft copy சேமிக்கவில்லை.', true, 'publishStatus');
    else status('Admin பலன்கள் SMV CALENDAR-க்கு வெற்றிகரமாக வெளியிடப்பட்டன.', false, 'publishStatus');
  } catch (error) {
    status(error?.message || String(error), true, 'publishStatus');
  } finally {
    button.disabled = false;
  }
}
$('loginForm').addEventListener('submit', login);
$('logoutButton').addEventListener('click', logout);
$('type').addEventListener('change', () => { setPlanetOptions(false); refreshEntry(); });
$('year').addEventListener('change', refreshEntry);
$('eventDate').addEventListener('change', refreshEntry);
$('rasi').addEventListener('change', refreshEntry);
$('planet').addEventListener('change', refreshEntry);
$('language').addEventListener('change', syncLanguageLabels);
$('mode').addEventListener('change', () => {
  if (!writeLocalDraft()) status('Mode சேமிக்க முடியவில்லை.', true, 'publishStatus');
  else status('பலன் முறை உள்ளூர் வரைவு அமைப்பில் சேமிக்கப்பட்டது.', false, 'publishStatus');
});
$('saveDraft').addEventListener('click', () => {
  try {
    const key = commitCurrentPrediction(false);
    status('Local draft சேமிக்கப்பட்டது: ' + key, false, 'publishStatus');
  } catch (error) {
    status(error?.message || String(error), true, 'publishStatus');
  }
});
$('removeEntry').addEventListener('click', () => {
  try {
    const key = commitCurrentPrediction(true);
    status('தேர்ந்தெடுத்த பதிவு உள்ளூர் வரைவு பட்டியலிலிருந்து நீக்கப்பட்டது: ' + key + '. நிரந்தரமாக நீக்க வெளியிடவும்.', false, 'publishStatus');
  } catch (error) {
    status(error?.message || String(error), true, 'publishStatus');
  }
});
$('publish').addEventListener('click', publish);
setSignOptions();
setPlanetOptions(false);
refreshEntry();
