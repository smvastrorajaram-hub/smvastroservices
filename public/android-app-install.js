/* Public Android APK download/update UI.
 * The Cloudflare release API becomes authoritative only after R2 + D1 are ready
 * and Admin publishing has explicitly been enabled. Otherwise keep the current
 * Render/Firebase release route as a compatibility fallback. */
(function () {
  'use strict';
  const pwaSection = document.getElementById('smvInstallAppSection');
  const section = document.getElementById('smvPermanentAndroidAppSection');
  const download = document.getElementById('smvPermanentApkDownload');
  const heading = document.getElementById('smvPermanentAndroidApkHeading');
  const description = document.getElementById('smvPermanentApkDescription');
  const status = document.getElementById('smvPermanentApkStatus');
  const nativeApp = !!(window.SMVNativeCalls &&
    typeof window.SMVNativeCalls.isNativeApp === 'function' &&
    window.SMVNativeCalls.isNativeApp());

  const DEFAULT_WORKER_BASE = 'https://smv-astro-apk-release-api.smvastro.workers.dev';
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
    hide(pwaSection);
    hide(section);
    hide(document.getElementById('adminGroupAppManagement'));
    return;
  }
  if (!section || !download || !heading || !description || !status) return;
  if (!/android/i.test(navigator.userAgent || '')) {
    hide(section);
    return;
  }

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
    const configured = String(window.SMV_APK_RELEASE_API_URL || DEFAULT_WORKER_BASE).trim();
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
        if (health?.success === true && health.ready === true &&
            health.uploadsEnabled === true) {
          return { base: candidate, cloudflare: true };
        }
      } catch (_) {
        // Not ready/deployed: keep the existing release endpoint.
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

  function setDownloadState({ release, installed, source }) {
    const latestCode = Number(release.versionCode);
    if (installed.supported && installed.app) {
      const installedCode = versionCode(installed.app.versionCode || installed.app.version || installed.app.versionName);
      if (installedCode != null && installedCode >= latestCode) {
        heading.textContent = 'SMV ASTRO IS UP TO DATE';
        description.textContent = 'The latest SMV ASTRO Android version is already installed on this device.';
        status.textContent = 'Installed version: ' + String(installed.app.version || release.versionName) +
          ' · Latest version: ' + String(release.versionName || 'Current');
        download.hidden = true;
        download.removeAttribute('href');
        section.hidden = false;
        section.removeAttribute('aria-hidden');
        section.style.display = '';
        hide(pwaSection);
        return;
      }
      heading.textContent = 'SMV ASTRO UPDATE AVAILABLE';
      description.textContent = 'A newer permanent SMV ASTRO version is available. Download and install it over the existing app; do not uninstall first.';
      download.textContent = 'UPDATE APP';
      status.textContent = 'Installed version: ' +
        String(installed.app.version || installed.app.versionName || 'Older version') +
        ' · Latest version: ' + String(release.versionName || 'New version');
    } else if (installed.supported) {
      heading.textContent = 'SMV ASTRO ANDROID APP';
      description.textContent = 'Install the official SMV ASTRO Android application on this device.';
      download.textContent = 'INSTALL APP';
      status.textContent = 'Latest version: ' + String(release.versionName || 'Available');
    } else {
      heading.textContent = 'SMV ASTRO ANDROID APP';
      description.textContent = 'Download the latest official Android APK. This browser cannot confirm whether an older version is installed.';
      download.textContent = 'DOWNLOAD / UPDATE APP';
      status.textContent = 'Latest version: ' + String(release.versionName || 'Available') +
        ' · Installed version check is not supported in this browser.';
    }
    download.href = source.cloudflare
      ? (new URL(release.downloadUrl)).href
      : release.downloadUrl;
    download.hidden = false;
    section.hidden = false;
    section.removeAttribute('aria-hidden');
    section.style.display = '';
    hide(pwaSection);
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
      setDownloadState({ release, installed, source });
    } catch (error) {
      console.warn('SMV ASTRO APK availability could not be checked:', error?.message || error);
      hide(section);
    }
  }

  initialize();
}());
