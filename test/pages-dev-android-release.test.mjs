import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');

test('Pages.dev Android variants have three independent permanent package identities', () => {
  const settings = read('settings.gradle');
  const gradle = read('smvpagesandroid/build.gradle');
  assert.match(settings, /include\([\s\S]*:smvpagesandroid/);
  for (const [flavor, packageName, url, label] of [
    ['astro', 'in.smvastroservices.pages.astro', 'https://smvastroservices.pages.dev/', 'SMV ASTRO'],
    ['horoscope', 'in.smvastroservices.pages.horoscope', 'https://smvastroservices.pages.dev/horoscope/', 'SMV HOROSCOPE'],
    ['calendar', 'in.smvastroservices.pages.calendar', 'https://smvastroservices.pages.dev/horoscope/calendar/', 'SMV CALENDAR']
  ]) {
    assert.match(gradle, new RegExp(flavor + '\\s*\\{[\\s\\S]*?applicationId "' + packageName.replaceAll('.', '\\.') + '"'));
    assert.ok(gradle.includes(url), flavor + ' must open its exact Pages.dev route');
    assert.ok(read('smvpagesandroid/src/' + flavor + '/res/values/strings.xml')
      .includes('<string name="app_name">' + label + '</string>'));
  }
  assert.match(gradle, /SMV_ANDROID_KEYSTORE_PATH/);
  assert.match(gradle, /SMV_ANDROID_KEY_ALIAS/);
  assert.match(gradle, /storeType = "PKCS12"/);
});

test('Existing .in production package IDs and their original signing workflows remain unchanged', () => {
  assert.match(read('smvastroproduction/build.gradle'), /applicationId "in\.smvastroservices\.smvastro"/);
  assert.match(read('smvhoroscopeproduction/build.gradle'), /applicationId "in\.smvastroservices\.horoscope"/);
  assert.match(read('smvcalendarproduction/build.gradle'), /applicationId "in\.smvastroservices\.calendar"/);
  assert.ok(fs.existsSync('.github/workflows/build-smv-astro-production-apk.yml'));
  assert.ok(fs.existsSync('.github/workflows/build-smv-horoscope-calendar-production-apks.yml'));
});

test('Pages.dev Android WebViews preserve Service Worker cache and do not delete user data', () => {
  const main = read('smvpagesandroid/src/main/java/in/smvastroservices/pages/MainActivity.java');
  assert.ok(main.includes('smvastroservices.pages.dev'));
  assert.ok(main.includes('WebSettings.LOAD_DEFAULT'));
  assert.ok(main.includes('swSettings.setCacheMode(WebSettings.LOAD_DEFAULT)'));
  assert.doesNotMatch(main, /clearCache\s*\(|localStorage\.clear|sessionStorage\.clear|caches\.delete|deleteDatabase/);
  assert.ok(main.includes('SMV_PDF_PATH'));
  assert.ok(main.includes('RESOURCE_AUDIO_CAPTURE'));
});

test('ASTRO native Google sign-in is scoped only to Pages.dev, not the .in Firebase FCM package', () => {
  const bridge = read('smvpagesandroid/src/main/java/in/smvastroservices/pages/NativeWebBridge.java');
  const gradle = read('smvpagesandroid/build.gradle');
  assert.ok(bridge.includes('https://smvastroservices.pages.dev'));
  assert.ok(bridge.includes('if (!isMainFrame || !isTrustedOrigin(sourceOrigin)) return;'));
  assert.ok(bridge.includes('smv:native-google-token'));
  assert.ok(bridge.includes('smv:native-google-error'));
  assert.ok(gradle.includes('SMV_GOOGLE_WEB_CLIENT_ID'));
  assert.equal(fs.existsSync('smvpagesandroid/src/main/java/in/smvastroservices/pages/NativePushMessagingService.java'), false);
});

test('Permanent Pages.dev workflow compiles Release variants on PRs and verifies the shared certificate on publication', () => {
  const workflow = read('.github/workflows/build-pages-dev-android-apks.yml');
  assert.match(workflow, /:smvpagesandroid:assembleAstroRelease/);
  assert.match(workflow, /:smvpagesandroid:assembleHoroscopeRelease/);
  assert.match(workflow, /:smvpagesandroid:assembleCalendarRelease/);
  assert.match(workflow, /apksigner/);
  assert.match(workflow, /7a3be159218a38083986dec117c0bd281b3ef42bda65f2bb7b8c9946b5293401/);
  assert.match(workflow, /softprops\/action-gh-release/);
  assert.ok(workflow.includes('SMV-ASTRO-PAGES-DEV'));
  assert.ok(workflow.includes('SMV-HOROSCOPE-PAGES-DEV'));
  assert.ok(workflow.includes('SMV-CALENDAR-PAGES-DEV'));
});

test('Each Pages.dev app uses its product-specific original icon source', () => {
  const script = read('prepare-pages-dev-android-icons.sh');
  for (const [icon, flavor] of [
    ['icon/astro_512.png', 'astro'],
    ['icon/horoscope_512.png', 'horoscope'],
    ['icon/calendar_512.png', 'calendar']
  ]) {
    assert.ok(script.includes('"' + icon + '"'));
    assert.ok(script.includes(' ' + flavor + '\n'));
    assert.ok(fs.existsSync('smvpagesandroid/src/' + flavor + '/res/values/strings.xml'));
  }
});
