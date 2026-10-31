/* Public Android APK download/update presentation.
 * Reuses the existing PWA icon/card: no second Android app icon or duplicate card.
 * Cloudflare D1 publishes the release pointer and R2 serves the signed APK bytes. */
(function () {
  'use strict';

  const section = document.getElementById('smvInstallAppSection');
  const button = document.getElementById('smvInstallAppBtn');
  const heading = section?.querySelector('.smv-install-app-copy h2');
  const description = section?.querySelector('.smv-install-app-copy > p');
  const status = document.getElementById('smvInstallAppHelp');
  const nativeApp = !!(window.SMVNativeCalls &&
    typeof window.SMVNativeCalls.isNativeApp === 'function' &&
    window.SMVNativeCalls.isNativeApp());

  const LEGACY_BUCKETS = new Set([
    'smv-astro.firebasestorage.app',
    'smv-astro-staging.firebasestorage.app'
  ]);

  function hide(element) {
    if (!element) return;
    element.hidden = true;
    element.setAttribute('aria-hidden', 'true');
    element.style.display = 'none';
  }

  if (nativeApp) {
    hide(section);
    hide(document.getElementById('adminGroupAppManagement'));
    return;
  }
  if (!section || !button || !heading || !description || !status) return;
  if (!/android/i.test(navigator.userAgent || '')) return;

  const backend = window.SMV_BACKEND_URL ||
    (location.hostname.includes('phase1-staging')
      ? 'https://smv-astro-phase1-staging.onrender.com'
      : 'https://smvastroservices.onrender.com');
  const packageId = 'in.smvastroservices.smvastro';

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
        // Keep the existing public release endpoint as a compatibility fallback.
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
      if (!Array.isArray(installed)) return { supported: false, app: null };
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
      if (url.origin !== source.base || !/^\/(?:api\/android-app\/)?download\/[1-9][0-9]{2,9}$/.test(url.pathname) ||
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

    // Mark the existing PWA banner as the APK release surface. Its original
    // icon is retained; the separate APK icon/card is deliberately not used.
    section.classList.add('smv-apk-release-active');
    section.hidden = false;
    section.removeAttribute('aria-hidden');
    section.style.display = '';
    document.documentElement.classList.remove('smv-v354-no-root-install-offer');

    const app = installed.app;
    const installedCode = app
      ? versionCode(app.versionCode || app.version || app.versionName)
      : null;

    button.disabled = false;
    button.dataset.smvApkReleaseAction = '';
    button.dataset.smvApkDownloadUrl = '';

    if (app && installedCode !== null && installedCode >= latestCode) {
      status.textContent = 'Using Latest Version';
      button.hidden = true;
      button.removeAttribute('aria-label');
      return;
    }

    if (app && installedCode === null) {
      // The browser confirmed the package is installed but did not expose a
      // readable version. Never offer a duplicate Download/Update guess.
      status.textContent = 'Installed app version could not be verified';
      button.hidden = true;
      button.removeAttribute('aria-label');
      return;
    }

    const action = app ? 'UPDATE' : 'DOWNLOAD APK';
    button.textContent = action;
    button.hidden = false;
    button.dataset.smvApkReleaseAction = action;
    button.dataset.smvApkDownloadUrl = release.downloadUrl;
    button.setAttribute('aria-label', action + ' SMV ASTRO ' + latestName);
    status.textContent = '';
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
          typeof release.downloadUrl !== 'string') return;

      const url = trustedDownloadUrl(release.downloadUrl, source);
      if (!url) throw new Error('The Android APK download URL is not a trusted SMV ASTRO release.');
      release.downloadUrl = url.href;
      const installed = await installedNativeApp();
      showRelease({ release, installed, source });
    } catch (error) {
      console.warn('SMV ASTRO APK availability could not be checked:', error?.message || error);
    }
  }

  initialize();
}());
