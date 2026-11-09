import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const astro = read('.github/workflows/build-smv-astro-production-apk.yml');
const horoscopeCalendar = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');

function section(source, name) {
  const start = source.indexOf('  ' + name + ':');
  assert.notEqual(start, -1, 'Missing workflow trigger section: ' + name);
  const endMarker = name === 'pull_request' ? '\n  push:' : '\npermissions:';
  const end = source.indexOf(endMarker, start + 1);
  assert.notEqual(end, -1, 'Missing end of workflow trigger section: ' + name);
  return source.slice(start, end);
}

test('SMV ASTRO production APK rebuilds when its module launcher asset, root UI cache or location search changes', () => {
  for (const trigger of ['pull_request', 'push']) {
    const block = section(astro, trigger);
    for (const file of [
      'smvastroproduction/launcher/icon-master.jpg',
      'tools/SmvProductLauncherIconGenerator.java',
      'public/sw.js',
      'public/main-location-search.js',
      'public/question-place-search.mjs',
      'public/horoscope/offline/places/place-search.mjs',
      'public/horoscope/offline/places/india-manifest.json',
      'scripts/next-android-release-version.mjs',
      'test/android-release-version-resolution.test.mjs',
      'test/android-cache-release-build-triggers.test.mjs'
    ]) {
      assert.ok(block.includes('"' + file + '"'), trigger + ' must build a new SMV ASTRO APK when ' + file + ' changes.');
    }
  }
});

test('SMV HOROSCOPE and SMV CALENDAR production APKs rebuild when their module launcher assets, scoped UI cache or GeoNames loader changes', () => {
  for (const trigger of ['pull_request', 'push']) {
    const block = section(horoscopeCalendar, trigger);
    for (const file of [
      'smvhoroscopeproduction/launcher/icon-master.jpg',
      'smvcalendarproduction/launcher/icon-master.jpg',
      'tools/SmvProductLauncherIconGenerator.java',
      'public/horoscope/sw.js',
      'public/horoscope/calendar/sw.js',
      'public/horoscope/location-search-online-offline.js',
      'public/question-place-search.mjs',
      'public/horoscope/offline/places/place-search.mjs',
      'public/horoscope/offline/places/india-manifest.json',
      'scripts/next-android-release-version.mjs',
      'test/android-release-version-resolution.test.mjs',
      'test/android-cache-release-build-triggers.test.mjs'
    ]) {
      assert.ok(block.includes('"' + file + '"'), trigger + ' must build HOROSCOPE/CALENDAR APKs when ' + file + ' changes.');
    }
  }
});

test('Only signed production builds publish raw APK files as direct-download GitHub release assets', () => {
  assert.ok(astro.includes('contents: write'));
  assert.ok(horoscopeCalendar.includes('contents: write'));
  assert.ok(astro.includes("Publish raw signed SMV ASTRO APK direct-download release asset"));
  assert.ok(horoscopeCalendar.includes("Publish raw signed HOROSCOPE and CALENDAR APK direct-download release assets"));
  assert.ok(astro.includes('softprops/action-gh-release@v2'));
  assert.ok(horoscopeCalendar.includes('softprops/action-gh-release@v2'));
  assert.ok(astro.includes("if: ${{ env.SMV_SIGNED_RELEASE == 'true' }}"));
  assert.ok(horoscopeCalendar.includes("if: ${{ env.SMV_SIGNED_RELEASE == 'true' }}"));
  assert.ok(astro.includes('SMV-ASTRO-${{ env.SMV_ANDROID_VERSION_NAME }}.apk'));
  assert.ok(horoscopeCalendar.includes('SMV-HOROSCOPE-${{ env.SMV_HOROSCOPE_ANDROID_VERSION_NAME }}.apk'));
  assert.ok(horoscopeCalendar.includes('SMV-CALENDAR-${{ env.SMV_CALENDAR_ANDROID_VERSION_NAME }}.apk'));
  assert.ok(astro.includes('-run-${{ github.run_number }}'));
  assert.ok(horoscopeCalendar.includes('-run-${{ github.run_number }}'));
});
