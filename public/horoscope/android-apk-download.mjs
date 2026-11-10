/* Independent release cards for SMV HOROSCOPE and SMV CALENDAR.
 * Each card reads only its own public APK release pointer. */
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
  const heading = card.querySelector('.smv-android-apk-copy h2');
  const details = card.querySelector('[data-apk-version]');
  const download = card.querySelector('[data-apk-download]');
  const allowedWorkerOrigin = 'https://smv-astro-apk-release-api.astroservices.workers.dev';

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

  const uploadedAtLabel = value => {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date).replace(/\u202f/g, ' ');
  };

  if (download) download.hidden = true;
  if (details) details.textContent = '';

  async function loadRelease() {
    const origin = workerOrigin();
    if (!origin) return;
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
        if (heading) heading.textContent = appName;
        if (details) details.textContent = '';
        return;
      }

      const code = Number(release.versionCode);
      const version = String(release.versionName || '');
      const expectedPath = '/download/' + appId + '/' + String(code);
      let url;
      try { url = new URL(String(release.downloadUrl || '')); } catch (_) { url = null; }
      if (!/^v[1-9][0-9]*\.[0-9]{1,3}$/.test(version) ||
          !Number.isSafeInteger(code) || code < 1000 ||
          release.appId !== appId ||
          release.packageName !== expectedPackage ||
          !url || url.protocol !== 'https:' || url.origin !== origin ||
          url.pathname !== expectedPath || url.search || url.hash || url.username || url.password) {
        throw new Error('APK metadata validation failed.');
      }

      if (heading) heading.textContent = appName + ' ' + version + ' · code ' + String(code);
      const dateLabel = uploadedAtLabel(release.uploadedAt);
      const storage = String(release.storageProvider || '').toLowerCase();
      if (!['r2', 'firebase'].includes(storage)) throw new Error('APK storage metadata is unavailable.');
      if (details) details.textContent = dateLabel ? dateLabel + ' · ' + storage : storage;
      if (download) {
        download.href = url.href;
        download.download = '';
        download.textContent = 'DOWNLOAD APK';
        download.hidden = false;
      }
    } catch (error) {
      if (heading) heading.textContent = appName;
      if (details) details.textContent = '';
      if (download) {
        download.hidden = true;
        download.removeAttribute('href');
      }
    }
  }

  loadRelease();
})();