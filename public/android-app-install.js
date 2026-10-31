/* Public Android APK version and download/update card for SMV ASTRO.
 * The Homepage uses a dedicated Android application icon and release card.
 * D1 is the release pointer; the Cloudflare Worker streams the APK from R2. */
(function () {
  'use strict';

  const section = document.getElementById('smvPermanentAndroidAppSection');
  const heading = document.getElementById('smvPermanentAndroidApkHeading');
  const description = document.getElementById('smvPermanentApkDescription');
  const status = document.getElementById('smvPermanentApkStatus');
  const download = document.getElementById('smvPermanentApkDownload');
  const nativeApp = !!(window.SMVNativeCalls &&
    typeof window.SMVNativeCalls.isNativeApp === 'function' &&
    window.SMVNativeCalls.isNativeApp());

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
  }

  if (nativeApp) {
    hide(section);
    return;
  }
  if (!section || !heading || !description || !status || !download) return;
  if (!/android/i.test(navigator.userAgent || '')) {
    hide(section);
    return;
  }

  const backend = window.SMV_BACKEND_URL ||
    (location.hostname.includes('phase1-staging')
      ? 'https://smv-astro-phase1-staging.onrender.com'
      : 'https://smvastroservices.onrender.com');
  const packageId = 'in.smvastroservices.smvastro';
  const LEGACY_BUCKETS = new Set([
    'smv-astro.firebasestorage.app',
    'smv-astro-staging.firebasestorage.app'
  ]);

  function versionCode(value) {
    const text = String(value == null ? '' : value).trim();
    if (/^[1-9][0-9]{2,9}$/.test(text)) return Number(text);
    const match = /^v?([1-9][0-9]*)\.([0-9]{1,3})$/i.exec(text);
    if (!match) return null;
    const code = Number(match[1]) * 1000 + Number(match[2]);
    return Number.isSafeInteger(code) && code > 0 ? code : null;
  }

  function workerBase() {
    if (location.hostname.includes('phase1-staging') ||
        location.hostname.includes('phase1-browser')) return null;
    const configured = String(window.SMV_APK_RELEASE_API_URL || '').trim();
    if (!configured) return null;
    try {
      const url = new URL(configured);
      if (url.protocol !== 'https:' || url.username || url.password ||
          url.pathname !== '/' || url.search || url.hash) return null;
      return url.origin;
    } catch (_) {
      return null;
    }
  }

  async function releaseSource() {
    const candidate = workerBase();
    if (candidate) {
      try {
        const response = await fetch(candidate + '/health', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(3000)
        });
        const health = response.ok ? await response.json() : null;
        if (health?.success === true && health.ready === true) {
          return { base: candidate, cloudflare: true };
        }
      } catch (_) {
        // Compatibility fallback is retained if the dedicated Worker is unavailable.
      }
    }
    return { base: backend, cloudflare: false };
  }

  async function installedNativeApp() {
    if (typeof navigator.getInstalledRelatedApps !== 'function') {
      return { supported: false, app: null };
    }
    try {
      const installed = await navigator.getInstalledRelatedApps();
      if (!Array.isArray(installed)) return { supported: true, app: null };
      return {
        supported: true,
        app: installed.find(app => app && app.platform === 'play' && app.id === packageId) || null
      };
    } catch (error) {
      console.info('SMV ASTRO installed-app check is unavailable in this browser:', error?.message || error);
      return { supported: false, app: null };
    }
  }

  function trustedDownloadUrl(value, source) {
    let url;
    try { url = new URL(String(value || '')); } catch (_) { return null; }
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;

    if (source.cloudflare) {
      if (url.origin !== source.base ||
          !/^\/(?:api\/android-app\/)?download\/[1-9][0-9]{2,9}$/.test(url.pathname) ||
          url.search) return null;
      return url;
    }

    if (url.hostname !== 'firebasestorage.googleapis.com') return null;
    const path = decodeURIComponent(url.pathname);
    const match = /^\/v0\/b\/([^/]+)\/o\/smv-astro\/android\/releases\/[1-9][0-9]*\/[^/]+\.apk$/.exec(path);
    if (!match || !LEGACY_BUCKETS.has(match[1]) ||
        url.searchParams.get('alt') !== 'media' || !url.searchParams.get('token')) return null;
    return url;
  }

  function uploadedAtLabel(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return 'Release date unavailable';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Release date unavailable';
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }).format(date).replace(/\u202f/g, ' ');
  }

  function showRelease({ release, installed, source }) {
    const latestCode = Number(release.versionCode);
    const latestName = String(release.versionName || 'Current');
    const storage = String(release.storageProvider || (source.cloudflare ? 'r2' : 'firebase')).toLowerCase();

    heading.textContent = 'SMV ASTRO ' + latestName + ' · code ' + String(latestCode);
    description.textContent = uploadedAtLabel(release.uploadedAt) + ' · ' + storage;
    section.hidden = false;
    section.removeAttribute('aria-hidden');
    section.style.display = '';

    if (!installed.supported) {
      // This browser cannot inspect installed-app state. Keep the already validated
      // release URL available rather than hiding the APK download action.
      status.textContent = '';
      download.textContent = 'DOWNLOAD APK';
      download.href = release.downloadUrl;
      download.hidden = false;
      download.setAttribute('aria-label', 'Download APK SMV ASTRO ' + latestName);
      return;
    }

    const app = installed.app;
    const installedCode = app
      ? versionCode(app.versionCode || app.version || app.versionName)
      : null;

    if (app && installedCode !== null && installedCode >= latestCode) {
      status.textContent = 'Using Latest Version';
      download.hidden = true;
      download.removeAttribute('href');
      return;
    }

    if (app && installedCode === null) {
      status.textContent = 'Installed app version could not be verified';
      download.hidden = true;
      download.removeAttribute('href');
      return;
    }

    status.textContent = '';
    download.textContent = app ? 'UPDATE' : 'DOWNLOAD APK';
    download.href = release.downloadUrl;
    download.hidden = false;
    download.setAttribute('aria-label', (app ? 'Update' : 'Download APK') + ' SMV ASTRO ' + latestName);
  }

  async function initialize() {
    try {
      const source = await releaseSource();
      const response = await fetch(source.base + '/public/android-app', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) throw new Error('Android app release lookup returned HTTP ' + response.status + '.');
      const release = await response.json();
      if (release?.success !== true || release.available !== true ||
          release.packageName !== packageId ||
          !Number.isSafeInteger(Number(release.versionCode)) ||
          Number(release.versionCode) < 1 ||
          typeof release.downloadUrl !== 'string') {
        hide(section);
        return;
      }

      const url = trustedDownloadUrl(release.downloadUrl, source);
      if (!url) throw new Error('The Android APK download URL is not a trusted SMV ASTRO release.');
      release.downloadUrl = url.href;
      const installed = await installedNativeApp();
      showRelease({ release, installed, source });
    } catch (error) {
      console.warn('SMV ASTRO APK availability could not be checked:', error?.message || error);
      hide(section);
    }
  }

  initialize();
}());
