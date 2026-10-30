/* Public Android APK download/update UI.
 * Installed-app detection is privacy-preserving and available only in supporting
 * Android Chrome browsers after Digital Asset Links verification. */
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
  const androidDevice = /android/i.test(navigator.userAgent || '');
  if (!androidDevice || location.hostname.includes('phase1-staging')) {
    hide(section);
    return;
  }

  const backend = window.SMV_BACKEND_URL ||
    (location.hostname.includes('phase1-staging') ? 'https://smv-astro-phase1-staging.onrender.com' : 'https://smvastroservices.onrender.com');
  const packageId = 'in.smvastroservices.smvastro';

  function versionCode(value) {
    const text = String(value == null ? '' : value).trim();
    if (/^[1-9][0-9]{2,9}$/.test(text)) return Number(text);
    const match = /^v?([1-9][0-9]*)\.([0-9]{1,3})$/i.exec(text);
    if (!match) return null;
    const code = Number(match[1]) * 1000 + Number(match[2]);
    return Number.isSafeInteger(code) && code > 0 ? code : null;
  }

  async function installedNativeApp() {
    if (typeof navigator.getInstalledRelatedApps !== 'function') return null;
    try {
      const installed = await navigator.getInstalledRelatedApps();
      if (!Array.isArray(installed)) return null;
      return installed.find(app => app && app.platform === 'play' && app.id === packageId) || null;
    } catch (error) {
      console.info('SMV ASTRO installed app check is unavailable in this browser:', error?.message || error);
      return null;
    }
  }

  async function initialize() {
    try {
      const response = await fetch(backend + '/public/android-app', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
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

      const url = new URL(release.downloadUrl);
      const versionName = String(release.versionName || '');
      const releaseTag = 'smv-astro-' + versionName;
      const fileName = 'SMV-ASTRO-' + versionName + '.apk';
      const expectedPath = '/smvastrorajaram-hub/smvastroservices/releases/download/' +
        releaseTag + '/' + fileName;
      if (url.protocol !== 'https:' || url.hostname !== 'github.com' ||
          url.port || url.username || url.password || url.search || url.hash ||
          url.pathname !== expectedPath ||
          versionCode(versionName) !== Number(release.versionCode)) {
        throw new Error('The Android APK download URL is not a trusted SMV ASTRO GitHub Release asset.');
      }

      const installed = await installedNativeApp();
      if (installed) {
        const installedCode = versionCode(installed.versionCode || installed.version || installed.versionName);
        if (installedCode != null && installedCode >= Number(release.versionCode)) {
          hide(pwaSection);
          hide(section);
          return;
        }
        hide(pwaSection);
        heading.textContent = 'SMV ASTRO UPDATE AVAILABLE';
        description.textContent = 'A newer permanent SMV ASTRO version is available. Update without uninstalling your current app.';
        download.textContent = 'UPDATE APP';
        status.textContent = 'Installed version: ' + (installed.version || 'older version') +
          ' · Latest version: ' + String(release.versionName || 'New version');
      } else {
        hide(pwaSection);
        heading.textContent = 'SMV ASTRO ANDROID APP';
        description.textContent = 'Download the official SMV ASTRO Android app and install it on your phone.';
        download.textContent = 'DOWNLOAD APP';
        status.textContent = 'Latest version: ' + String(release.versionName || 'Available');
      }
      download.href = url.href;
      download.hidden = false;
      section.hidden = false;
      section.removeAttribute('aria-hidden');
      section.style.display = '';
    } catch (error) {
      console.warn('SMV ASTRO APK availability could not be checked:', error?.message || error);
      hide(section);
    }
  }

  initialize();
}());
