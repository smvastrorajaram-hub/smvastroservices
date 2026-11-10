'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const desktopRoot = path.join(repoRoot, 'desktop', 'windows');
const read = (relativePath) => fs.readFileSync(path.join(desktopRoot, relativePath), 'utf8');

test('Windows desktop package builds an x64 NSIS installer', () => {
  const manifest = JSON.parse(read('package.json'));
  assert.equal(manifest.productName, 'SMV ASTRO');
  assert.equal(manifest.build.appId, 'in.smvastroservices.desktop');
  assert.equal(manifest.build.win.target[0].target, 'nsis');
  assert.deepEqual(manifest.build.win.target[0].arch, ['x64']);
  assert.equal(manifest.build.nsis.oneClick, false);
  assert.equal(manifest.scripts['dist:win'], 'electron-builder --win nsis --x64');
});

test('desktop navigation is limited to the three existing SMV service origins', () => {
  const main = read('main.cjs');
  assert.match(main, /https:\/\/smvastroservices\.in\//);
  assert.match(main, /https:\/\/horoscope\.smvastroservices\.in\//);
  assert.match(main, /https:\/\/calendar\.smvastroservices\.in\//);
  assert.match(main, /Object\.prototype\.hasOwnProperty\.call\(MODULES, moduleId\)/);
  assert.match(main, /new WebContentsView\(/);
});

test('local and remote renderers use isolation, sandboxing and no Node integration', () => {
  const main = read('main.cjs');
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /webSecurity:\s*true/);
  assert.doesNotMatch(main, /nodeIntegration:\s*true/);
});

test('desktop IPC rejects requests from remote website frames', () => {
  const main = read('main.cjs');
  assert.match(main, /function isHubRenderer\(event\)/);
  assert.match(main, /event\.sender !== mainWindow\.webContents/);
  assert.match(main, /frameUrl\.protocol === 'file:'/);
  assert.match(main, /if \(!isHubRenderer\(event\)\) throw new Error/);
});

test('permissions are restricted to SMV first-party origins and user-facing capabilities', () => {
  const main = read('main.cjs');
  assert.match(main, /setPermissionRequestHandler/);
  assert.match(main, /setPermissionCheckHandler/);
  assert.match(main, /new Set\(\['media', 'notifications', 'geolocation'\]\)/);
  assert.match(main, /TRUSTED_SMV_HOSTS/);
});

test('external navigation and popup windows must use HTTPS', () => {
  const main = read('main.cjs');
  assert.match(main, /function isSecureUrl\(value\)/);
  assert.match(main, /if \(!isSecureUrl\(url\)\) return \{ action: 'deny' \}/);
  assert.match(main, /if \(!isSecureUrl\(url\)\) event\.preventDefault\(\)/);
});

test('launcher provides navigation to all three services and states cloud/offline boundaries', () => {
  const html = read('ui/index.html');
  const docs = read('README.md');
  for (const id of ['astro', 'horoscope', 'calendar']) {
    assert.match(html, new RegExp('data-module="' + id + '"'));
  }
  assert.match(docs, /Login, identity verification, cloud dashboards/);
  assert.match(docs, /may provide supported screens/);
  assert.match(docs, /not code-signed/);
});

test('Windows executable icon is reproducibly generated from the checked-in ICO asset', () => {
  const encoded = read('assets/smv-astro-icon.base64').replace(/\s+/g, '');
  const icon = Buffer.from(encoded, 'base64');
  assert.ok(icon.length > 512);
  assert.deepEqual([...icon.subarray(0, 4)], [0, 0, 1, 0]);
  assert.match(read('scripts/prepare-icon.cjs'), /writeFileSync\(iconPath, icon\)/);
});
