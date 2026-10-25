/* SMV CALENDAR — independent Calendar Rasi Palan Admin authentication.
 * Reuses the current Firebase project and the existing Firestore-protected Admin gate.
 * No new account, Firebase project, backend, or server secret is created here.
 */
import { mountCalendarRasiPalanAdmin } from '../calendar-rasi-palan-admin.mjs';

const toggle = document.getElementById('smvCalendarAdminToggle');
const panel = document.getElementById('smvCalendarAdminArea');
const mount = document.getElementById('smvCalendarAdminMount');
const firebaseConfig = {
  apiKey: 'AIzaSyCKXyfZ9sjGmej7ygxHpZHNcNysMXHuvSs',
  authDomain: (location.hostname === 'smvastroservices.pages.dev' || location.hostname.endsWith('.smvastroservices.pages.dev'))
    ? 'smv-astro.firebaseapp.com' : 'auth.smvastroservices.in',
  projectId: 'smv-astro',
  storageBucket: 'smv-astro.firebasestorage.app',
  messagingSenderId: '299081899217',
  appId: '1:299081899217:web:8d558df08e86037ea539f0'
};
let appModule = null;
let authModule = null;
let firestoreModule = null;
let auth = null;
let db = null;
let opening = null;
let authorizedUid = '';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const status = (message, bad = false) => {
  const target = panel && panel.querySelector('[data-calendar-admin-status]');
  if (target) {
    target.textContent = message || '';
    target.dataset.error = bad ? '1' : '0';
  }
};

async function ensureFirebase() {
  if (auth && db) return;
  [appModule, authModule, firestoreModule] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
  ]);
  const app = appModule.getApps().find(item => item.name === 'smv-horoscope-local') ||
    appModule.initializeApp(firebaseConfig, 'smv-horoscope-local');
  auth = authModule.getAuth(app);
  await authModule.setPersistence(auth, authModule.browserLocalPersistence);
  if (auth.authStateReady) await auth.authStateReady();
  db = firestoreModule.getFirestore(app);
}

async function verifyCalendarAdmin(user) {
  if (!user) throw new Error('Calendar Admin login தேவை. / Calendar Admin login is required.');
  await user.reload();
  if (!user.emailVerified) {
    throw new Error('Admin email verification முடிந்த பிறகு மீண்டும் உள்நுழையவும். / Verify the Admin email before signing in.');
  }
  await user.getIdToken(true);
  // Firestore security rules—not a client-side email list—decide whether this user is an Admin.
  await firestoreModule.getDocFromServer(
    firestoreModule.doc(db, 'smv_settings', 'prediction_editor_access')
  );
  if (!auth.currentUser || auth.currentUser.uid !== user.uid) {
    throw new Error('Admin session மாறிவிட்டது. மீண்டும் உள்நுழையவும். / Admin session changed; sign in again.');
  }
  authorizedUid = user.uid;
}

function renderLogin(message = '') {
  if (!mount) return;
  mount.innerHTML = '<section class="calendar-admin-login" aria-labelledby="calendarAdminLoginTitle">' +
    '<h2 id="calendarAdminLoginTitle">Calendar Rasi Palan Admin / காலண்டர் ராசி பலன் நிர்வாகம்</h2>' +
    '<p>தினசரி, வார, மாத, தமிழ்/ஆங்கில வருட மற்றும் கிரகப் பெயர்ச்சி ராசி பலன் Rules மட்டும் இங்கு நிர்வகிக்கப்படும். / Manage Calendar prediction rules only.</p>' +
    '<form id="calendarAdminLoginForm"><label for="calendarAdminEmail">Admin Email</label>' +
    '<input id="calendarAdminEmail" name="email" type="email" autocomplete="username" required maxlength="254">' +
    '<label for="calendarAdminPassword">Password</label>' +
    '<input id="calendarAdminPassword" name="password" type="password" autocomplete="current-password" required>' +
    '<div class="calendar-admin-actions"><button type="submit" id="calendarAdminLoginButton">Login to Calendar Admin / உள்நுழை</button></div></form>' +
    '<p data-calendar-admin-status role="status" aria-live="polite"></p></section>';
  if (message) status(message, true);
  const form = mount.querySelector('#calendarAdminLoginForm');
  form && form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = mount.querySelector('#calendarAdminLoginButton');
    button.disabled = true;
    status('Admin அனுமதி சரிபார்க்கப்படுகிறது… / Verifying Calendar Admin access…');
    try {
      await ensureFirebase();
      const credentials = await authModule.signInWithEmailAndPassword(
        auth,
        mount.querySelector('#calendarAdminEmail').value.trim(),
        mount.querySelector('#calendarAdminPassword').value
      );
      try { await verifyCalendarAdmin(credentials.user); }
      catch (error) {
        try { await authModule.signOut(auth); } catch (_) {}
        throw error;
      }
      renderEditor();
    } catch (error) {
      const code = String(error && error.code || '');
      const detail = code === 'auth/unauthorized-domain'
        ? 'இந்த website domain Firebase Authentication authorized domains பட்டியலில் இல்லை. / This website domain is not authorized in Firebase Authentication.'
        : code === 'permission-denied' || code === 'unauthenticated'
          ? 'இந்தக் கணக்கிற்கு Calendar Admin அனுமதி இல்லை. / This account is not authorized as an Admin.'
          : (error && error.message || String(error));
      status(detail + (code ? ' (' + code + ')' : ''), true);
    } finally {
      button.disabled = false;
    }
  });
}

function renderEditor() {
  if (!mount || !auth || !auth.currentUser || auth.currentUser.uid !== authorizedUid) {
    renderLogin('Admin session இல்லை. மீண்டும் உள்நுழையவும். / Admin session is not available.');
    return;
  }
  const email = escapeHTML(auth.currentUser.email || '');
  mount.innerHTML = '<div class="calendar-admin-session"><div class="calendar-admin-session-head">' +
    '<p>Calendar Admin: <strong>' + email + '</strong></p>' +
    '<button type="button" class="calendar-admin-logout" id="calendarAdminLogout">Logout / வெளியேறு</button>' +
    '</div><div id="calendarAdminEditor"></div></div>';
  mountCalendarRasiPalanAdmin(mount.querySelector('#calendarAdminEditor'), auth);
  const logout = mount.querySelector('#calendarAdminLogout');
  logout && logout.addEventListener('click', async () => {
    try { await authModule.signOut(auth); } catch (_) {}
    authorizedUid = '';
    renderLogin('Admin வெளியேறிவிட்டார். / Signed out of Calendar Admin.');
  });
}

async function openPanel() {
  if (opening) return opening;
  opening = (async () => {
    panel.hidden = false;
    toggle && toggle.setAttribute('aria-expanded', 'true');
    if (mount) mount.innerHTML = '<p data-calendar-admin-status role="status">Calendar Admin அணுகல் சரிபார்க்கப்படுகிறது… / Checking Calendar Admin access…</p>';
    try {
      await ensureFirebase();
      if (!auth.currentUser) {
        renderLogin();
      } else {
        try {
          await verifyCalendarAdmin(auth.currentUser);
          renderEditor();
        } catch (error) {
          try { await authModule.signOut(auth); } catch (_) {}
          renderLogin(error && error.message || String(error));
        }
      }
    } catch (error) {
      renderLogin(error && error.message || String(error));
    }
    try { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
  })();
  try { await opening; } finally { opening = null; }
}

toggle && toggle.addEventListener('click', () => {
  if (!panel || panel.hidden) openPanel();
  else {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }
});
if (new URLSearchParams(location.search).get('admin') === '1') openPanel();
