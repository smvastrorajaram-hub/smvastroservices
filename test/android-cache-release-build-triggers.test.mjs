import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const astro = read('.github/workflows/build-smv-astro-production-apk.yml');
const horoscopeCalendar = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');

function section(source, name, next) {
  const start = source.indexOf('  ' + name + ':');
  assert.notEqual(start, -1, 'Missing workflow trigger section: ' + name);
  const end = next ? source.indexOf('  ' + next + ':', start + 1) : source.length;
  return source.slice(start, end < 0 ? source.length : end);
}

test('SMV ASTRO production APK rebuilds when its root UI cache or location search changes', () => {
  for (const trigger of ['pull_request', 'push']) {
    const block = section(astro, trigger, trigger === 'pull_request' ? 'push' : 'permissions');
    for (const file of [
      'public/sw.js',
      'public/main-location-search.js',
      'scripts/next-android-release-version.mjs',
      'test/android-release-version-resolution.test.mjs',
      'test/android-cache-release-build-triggers.test.mjs'
    ]) {
      assert.ok(block.includes('"' + file + '"'), trigger + ' must build a new SMV ASTRO APK when ' + file + ' changes.');
    }
  }
});

test('SMV HOROSCOPE and SMV CALENDAR production APKs rebuild when either scoped UI cache or GeoNames loader changes', () => {
  for (const trigger of ['pull_request', 'push']) {
    const block = section(horoscopeCalendar, trigger, trigger === 'pull_request' ? 'push' : 'permissions');
    for (const file of [
      'public/horoscope/sw.js',
      'public/horoscope/calendar/sw.js',
      'public/horoscope/location-search-online-offline.js',
      'scripts/next-android-release-version.mjs',
      'test/android-release-version-resolution.test.mjs',
      'test/android-cache-release-build-triggers.test.mjs'
    ]) {
      assert.ok(block.includes('"' + file + '"'), trigger + ' must build HOROSCOPE/CALENDAR APKs when ' + file + ' changes.');
    }
  }
});
