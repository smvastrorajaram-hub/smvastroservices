import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const INSTALL_SCRIPT = await readFile(
  new URL('../public/android-app-install.js', import.meta.url),
  'utf8'
);

const APK_WORKER = 'https://apk.example.workers.dev';
const DOWNLOAD_URL = APK_WORKER + '/download/1001';
const RELEASE = {
  success: true,
  available: true,
  packageName: 'in.smvastroservices.smvastro',
  versionName: 'v1.1',
  versionCode: 1001,
  uploadedAt: 1793457000000,
  storageProvider: 'r2',
  downloadUrl: DOWNLOAD_URL
};

function makeElement() {
  const attributes = new Map();
  return {
    hidden: true,
    textContent: '',
    href: '',
    style: { display: 'none' },
    attributes,
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === 'href') this.href = '';
    }
  };
}

async function renderCard({ installedApi = 'missing', apps = [] } = {}) {
  const elements = new Map([
    ['smvPermanentAndroidAppSection', makeElement()],
    ['smvPermanentAndroidApkHeading', makeElement()],
    ['smvPermanentApkDescription', makeElement()],
    ['smvPermanentApkStatus', makeElement()],
    ['smvPermanentApkDownload', makeElement()]
  ]);

  const requested = [];
  const navigator = {
    userAgent: 'Mozilla/5.0 (Linux; Android 10; SMV ASTRO browser test)'
  };
  if (installedApi === 'supported') {
    navigator.getInstalledRelatedApps = async () => apps;
  } else if (installedApi === 'throws') {
    navigator.getInstalledRelatedApps = async () => {
      throw new Error('Installed-app detection is unavailable');
    };
  }

  const context = {
    window: { SMV_APK_RELEASE_API_URL: APK_WORKER },
    navigator,
    document: { getElementById: id => elements.get(id) || null },
    location: { hostname: 'smvastroservices.in' },
    fetch: async input => {
      const url = new URL(String(input));
      requested.push(url.href);
      if (url.pathname === '/health') {
        return { ok: true, json: async () => ({ success: true, ready: true }) };
      }
      if (url.pathname === '/public/android-app') {
        return { ok: true, json: async () => ({ ...RELEASE }) };
      }
      throw new Error('Unexpected URL: ' + url.href);
    },
    AbortSignal,
    console: { info() {}, warn() {} }
  };

  runInNewContext(INSTALL_SCRIPT, context, { filename: 'android-app-install.js' });
  await new Promise(resolve => setTimeout(resolve, 0));

  return {
    section: elements.get('smvPermanentAndroidAppSection'),
    status: elements.get('smvPermanentApkStatus'),
    download: elements.get('smvPermanentApkDownload'),
    requested
  };
}

test('unsupported Android browser shows only the validated DOWNLOAD APK action', async () => {
  const ui = await renderCard({ installedApi: 'missing' });

  assert.equal(ui.section.hidden, false);
  assert.equal(ui.status.textContent, '');
  assert.equal(ui.download.hidden, false);
  assert.equal(ui.download.textContent, 'DOWNLOAD APK');
  assert.equal(ui.download.href, DOWNLOAD_URL);
  assert.equal(
    ui.download.attributes.get('aria-label'),
    'Download APK SMV ASTRO v1.1'
  );
});

test('Android browser whose installed-app check rejects still shows DOWNLOAD APK only', async () => {
  const ui = await renderCard({ installedApi: 'throws' });

  assert.equal(ui.section.hidden, false);
  assert.equal(ui.status.textContent, '');
  assert.equal(ui.download.hidden, false);
  assert.equal(ui.download.textContent, 'DOWNLOAD APK');
  assert.equal(ui.download.href, DOWNLOAD_URL);
});

test('Chrome-compatible browser with no related app keeps DOWNLOAD APK', async () => {
  const ui = await renderCard({ installedApi: 'supported', apps: [] });

  assert.equal(ui.status.textContent, '');
  assert.equal(ui.download.hidden, false);
  assert.equal(ui.download.textContent, 'DOWNLOAD APK');
  assert.equal(ui.download.href, DOWNLOAD_URL);
});

test('Chrome-compatible browser with an older installed app keeps UPDATE', async () => {
  const ui = await renderCard({
    installedApi: 'supported',
    apps: [{ platform: 'play', id: 'in.smvastroservices.smvastro', versionCode: 1000 }]
  });

  assert.equal(ui.status.textContent, '');
  assert.equal(ui.download.hidden, false);
  assert.equal(ui.download.textContent, 'UPDATE');
  assert.equal(ui.download.href, DOWNLOAD_URL);
});

test('Chrome-compatible browser with the current app keeps Using Latest Version and hides download', async () => {
  const ui = await renderCard({
    installedApi: 'supported',
    apps: [{ platform: 'play', id: 'in.smvastroservices.smvastro', versionCode: 1001 }]
  });

  assert.equal(ui.status.textContent, 'Using Latest Version');
  assert.equal(ui.download.hidden, true);
  assert.equal(ui.download.href, '');
});

test('Chrome-compatible browser with installed version unknown keeps download hidden', async () => {
  const ui = await renderCard({
    installedApi: 'supported',
    apps: [{ platform: 'play', id: 'in.smvastroservices.smvastro', versionName: 'unknown' }]
  });

  assert.equal(ui.status.textContent, 'Installed app version could not be verified');
  assert.equal(ui.download.hidden, true);
  assert.equal(ui.download.href, '');
});
