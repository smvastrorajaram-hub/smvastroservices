'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('main site does not clear origin-wide local/session storage or all Cache API entries', () => {
  const html = read('public/index.html');
  assert.doesNotMatch(html, /localStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /sessionStorage\.clear\s*\(/);
  assert.doesNotMatch(html, /caches\.keys\(\)\.then\(keys=>Promise\.all\(keys\.map\(k=>caches\.delete\(k\)\)\)\)/);
  assert.match(html, /smv-v223-scoped-storage-policy/);
});

test('main Service Worker does not force-reload open tabs and preserves offline place cache', () => {
  const sw = read('public/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_PLACE_CACHE='smv-astro-offline-places'/);
  assert.match(sw, /k!==OFFLINE_PLACE_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});

test('Horoscope Service Worker does not force-reload open report/form tabs and preserves offline cache', () => {
  const sw = read('public/horoscope/sw.js');
  assert.doesNotMatch(sw, /client\.navigate\s*\(\s*client\.url\s*\)/);
  assert.match(sw, /OFFLINE_CACHE='smv-horoscope-offline'/);
  assert.match(sw, /k!==OFFLINE_CACHE/);
  assert.match(sw, /await self\.clients\.claim\(\)/);
});
