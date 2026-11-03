/* Public Android APK download cards for the independent SMV HOROSCOPE and SMV CALENDAR apps.
 * Reads only the public metadata endpoint; it never requests Admin tokens or upload routes.
 */
(() => {
  'use strict';
  const horoscopeCard = document.getElementById('smvHoroscopeAndroidApkSection');
  const calendarCard = document.getElementById('smvCalendarAndroidApkSection');
  const card = horoscopeCard || calendarCard;
  if (!card) return;

  const appId = horoscopeCard ? 'horoscope' : 'calendar';
  const appName = appId === 'horoscope' ? 'SMV HOROSCOPE' : 'SMV CALENDAR';
  const expectedPackage = appId === 'horoscope'
    ? 'in.smvastroservices.horoscope'
    : 'in.smvastroservices.calendar';
  const status = card.querySelector('[data-apk-status]');
  const details = card.querySelector('[data-apk-version]');
  const download = card.querySelector('[data-apk-download]');
  const allowedWorkerOrigin = 'https://smv-astro-apk-release-api.astroservices.workers.dev';

  const language = () => document.documentElement.lang === 'ta' ? 'ta' : 'en';
  const message = (en, ta) => language() === 'ta' ? ta : en;
  const setStatus = value => { if (status) status.textContent = value; };
  const workerOrigin = () => {
    const configured = String(window.SMV_APK_RELEASE_API_URL || '').trim();
    if (!configured) return null;
    try {
      const url = new URL(configured);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
      if (url.origin !== allowedWorkerOrigin) return null;
      return url.origin;
    } catch (_) {
      return null;
    }
  };

  if (download) download.hidden = true;
  setStatus(message(
    'Checking the latest signed Android APK…',
    'சமீபத்திய கையொப்பமிட்ட Android APK-ஐச் சரிபார்க்கிறது…'
  ));

  async function loadRelease() {
    const origin = workerOrigin();
    if (!origin) {
      setStatus(message(
        'Android APK download service is not configured yet.',
        'Android APK பதிவிறக்க சேவை இன்னும் அமைக்கப்படவில்லை.'
      ));
      return;
    }
    try {
      const response = await fetch(origin + '/public/android-apps/' + appId, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(7000)
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const release = await response.json();
      if (release?.success !== true || release.available !== true) {
        setStatus(message(
          appName + ' Android APK is being prepared. Please check again later.',
          appName + ' Android APK தயாராகிக் கொண்டிருக்கிறது. பின்னர் மீண்டும் பார்க்கவும்.'
        ));
        if (details) details.textContent = '';
        return;
      }
      const code = Number(release.versionCode);
      const expectedPath = '/download/' + appId + '/' + String(code);
      let url;
      try { url = new URL(String(release.downloadUrl || '')); } catch (_) { url = null; }
      if (!Number.isSafeInteger(code) || code < 1000 ||
          release.appId !== appId ||
          release.packageName !== expectedPackage ||
          !url || url.protocol !== 'https:' || url.origin !== origin ||
          url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) {
        throw new Error('APK metadata validation failed.');
      }
      if (download) {
        download.href = url.href;
        download.download = '';
        download.hidden = false;
        download.textContent = message('DOWNLOAD ' + appName + ' APK', appName + ' APK பதிவிறக்கம்');
      }
      if (details) {
        const version = String(release.versionName || '');
        const size = Number(release.size || 0);
        details.textContent = version
          ? message('Latest version: ' + version + (size > 0 ? ' · ' + (size / 1048576).toFixed(2) + ' MB' : ''),
                    'சமீபத்திய பதிப்பு: ' + version + (size > 0 ? ' · ' + (size / 1048576).toFixed(2) + ' MB' : ''))
          : '';
      }
      setStatus(message(
        'Signed Android app is available. Download and install it on your Android device.',
        'கையொப்பமிட்ட Android App கிடைக்கிறது. உங்கள் Android சாதனத்தில் பதிவிறக்கி நிறுவவும்.'
      ));
    } catch (error) {
      if (details) details.textContent = '';
      setStatus(message(
        'The latest APK could not be checked right now. Refresh this page and try again.',
        'சமீபத்திய APK-ஐ இப்போது சரிபார்க்க முடியவில்லை. பக்கத்தை Refresh செய்து மீண்டும் முயற்சிக்கவும்.'
      ));
    }
  }

  loadRelease();
  window.addEventListener('smv-language', loadRelease);
})();
