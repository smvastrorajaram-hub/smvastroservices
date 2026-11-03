import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Production Horoscope and Calendar use their own stable Play Store application IDs', () => {
  const settings = read('settings.gradle');
  assert.match(settings, /include\(["'].*:smvhoroscopeproduction.*:smvcalendarproduction.*["']\)/);

  const products = [
    {
      module: 'smvhoroscopeproduction',
      packageName: 'in.smvastroservices.horoscope',
      host: 'horoscope.smvastroservices.in',
      label: 'SMV HOROSCOPE'
    },
    {
      module: 'smvcalendarproduction',
      packageName: 'in.smvastroservices.calendar',
      host: 'calendar.smvastroservices.in',
      label: 'SMV CALENDAR'
    }
  ];

  for (const product of products) {
    const gradle = read(product.module + '/build.gradle');
    const manifest = read(product.module + '/src/main/AndroidManifest.xml');
    const activityPath = product.module === 'smvhoroscopeproduction'
      ? 'smvhoroscopeproduction/src/main/java/in/smvastroservices/horoscope/MainActivity.java'
      : 'smvcalendarproduction/src/main/java/in/smvastroservices/calendar/MainActivity.java';
    const activity = read(activityPath);
    const strings = read(product.module + '/src/main/res/values/strings.xml');
    assert.match(gradle, new RegExp('namespace "' + product.packageName.replaceAll('.', '\\.') + '"'));
    assert.match(gradle, new RegExp('applicationId "' + product.packageName.replaceAll('.', '\\.') + '"'));
    assert.match(gradle, /SMV_ANDROID_KEYSTORE_PATH/);
    assert.match(gradle, /SMV_ANDROID_KEYSTORE_PASSWORD/);
    assert.match(gradle, /SMV_ANDROID_KEY_ALIAS/);
    assert.match(gradle, /SMV_ANDROID_KEY_PASSWORD/);
    assert.match(gradle, /versionName appVersionName/);
    assert.match(gradle, /versionCode appVersionCode/);
    assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
    assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
    assert.match(manifest, /android:name=".MainActivity"/);
    assert.match(activity, new RegExp('package ' + product.packageName.replaceAll('.', '\\.') + ';'));
    assert.ok(activity.includes('https://' + product.host + '/?lang=en&source=android-production'));
    assert.ok(activity.includes('in.smvastroservices.smvastro'));
    assert.ok(activity.includes('in.smvastroservices.horoscope'));
    assert.ok(activity.includes('in.smvastroservices.calendar'));
    assert.ok(strings.includes('<string name="app_name">' + product.label + '</string>'));
    assert.doesNotMatch(activity, /android-test-standalone/);
  }
});

test('SMV ASTRO Production launches the matching new production Horoscope or Calendar APK when installed', () => {
  const astroMain = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java');
  assert.ok(astroMain.includes('return "in.smvastroservices.horoscope";'));
  assert.ok(astroMain.includes('return "in.smvastroservices.calendar";'));
  assert.ok(astroMain.includes('getLaunchIntentForPackage(packageName)'));
  assert.equal(astroMain.includes('in.smvastroservices.horoscope.test'), false);
  assert.equal(astroMain.includes('in.smvastroservices.calendar.test'), false);
});

test('Existing Horoscope and Calendar QA APK modules remain test-only and keep their package IDs', () => {
  assert.match(read('smvhoroscope/build.gradle'), /applicationId "in\.smvastr[o]services\.horoscope\.test"/);
  assert.match(read('smvcalendar/build.gradle'), /applicationId "in\.smvastr[o]services\.calendar\.test"/);
});

test('The approved PWA artwork is reused only as launcher input for the new production modules', () => {
  const script = read('prepare-smv-horoscope-calendar-production-icons.sh');
  assert.match(script, /bash prepare-icons\.sh/);
  assert.match(script, /copy_product_icon smvhoroscope smvhoroscopeproduction/);
  assert.match(script, /copy_product_icon smvcalendar smvcalendarproduction/);
  assert.match(script, /mipmap-nodpi\/ic_launcher\.png/);
  assert.doesNotMatch(script, /public\/(horoscope|assets)\/.*(write|rm|delete)/i);
});

test('The production release workflow compiles both apps, signs with the existing certificate and publishes separate artifacts', () => {
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  assert.match(workflow, /:smvhoroscopeproduction:assembleRelease/);
  assert.match(workflow, /:smvcalendarproduction:assembleRelease/);
  assert.match(workflow, /SMV_ANDROID_KEYSTORE_BASE64/);
  assert.match(workflow, /smvastro-release/);
  assert.match(workflow, /APK Signature Scheme v2/);
  assert.match(workflow, /7a3be159218a38083986dec117c0bd281b3ef42bda65f2bb7b8c9946b5293401/);
  assert.match(workflow, /SMV-HOROSCOPE-PERMANENT-RELEASE-APK/);
  assert.match(workflow, /SMV-CALENDAR-PERMANENT-RELEASE-APK/);
  assert.match(workflow, /if-no-files-found: error/);
});

test('Admin Dashboard exposes separate upload, version history, refresh and delete managers for all three signed apps', () => {
  const html = read('public/index.html');
  const frontend = read('public/smvastro.mjs');
  for (const id of [
    'adminAndroidAppUpload', 'adminAndroidAppHistory',
    'adminHoroscopeAndroidAppUpload', 'adminHoroscopeAndroidAppHistory',
    'adminCalendarAndroidAppUpload', 'adminCalendarAndroidAppHistory'
  ]) assert.ok(html.includes('id="' + id + '"'), 'missing Admin APK manager control: ' + id);
  assert.match(frontend, /SMV_ADMIN_ANDROID_APPS/);
  assert.match(frontend, /loadAdminAndroidAppReleaseFor/);
  assert.match(frontend, /uploadAdminAndroidAppFor/);
  assert.match(frontend, /deleteAdminAndroidAppVersionFor/);
  assert.match(frontend, /admin\/android-apps\/horoscope/);
  assert.match(frontend, /admin\/android-apps\/calendar/);
  assert.match(frontend, /DELETE OLD APK/);
  assert.match(frontend, /current published version cannot be deleted/i);
});

test('Horoscope and Calendar public pages use signed APK downloads instead of PWA install buttons', () => {
  const horoscope = read('public/horoscope/index.html');
  const calendar = read('public/horoscope/calendar/index.html');
  const daily = read('public/horoscope/daily-calendar.mjs');
  const apkController = read('public/horoscope/android-apk-download.mjs');
  const horoscopePwa = read('public/horoscope/pwa.js');
  const calendarPwa = read('public/horoscope/calendar/calendar-pwa.mjs');

  assert.ok(horoscope.includes('id="smvHoroscopeAndroidApkSection"'));
  assert.ok(calendar.includes('id="smvCalendarAndroidApkSection"'));
  assert.ok(horoscope.includes('android-apk-download.mjs'));
  assert.ok(calendar.includes('../android-apk-download.mjs'));
  assert.equal(horoscope.includes('id="smvHoroscopeInstallArea"'), false);
  assert.equal(horoscope.includes('id="installApp"'), false);
  assert.equal(calendar.includes('id="smvCalendarInstallArea"'), false);
  assert.equal(calendar.includes('id="calInstall"'), false);
  assert.doesNotMatch(daily, /class="cal-app-link"/);
  assert.match(daily, /cal-download-app-link/);
  assert.match(daily, /smvCalendarAndroidApkSection/);
  assert.match(apkController, /public\/android-apps\/\' \+ appId/);
  assert.match(apkController, /in\.smvastroservices\.horoscope/);
  assert.match(apkController, /in\.smvastroservices\.calendar/);
  assert.match(apkController, /downloadUrl/);
  assert.match(horoscopePwa, /serviceWorker\.register/);
  assert.match(calendarPwa, /serviceWorker\.register/);
  assert.ok(horoscope.includes('rel="manifest"'));
  assert.ok(calendar.includes('rel="manifest"'));
  assert.ok(calendar.includes('calendarManifest'));
});

test('Public APK download controller accepts only signed metadata from the dedicated APK Worker origin', () => {
  const controller = read('public/horoscope/android-apk-download.mjs');
  assert.match(controller, /credentials: 'omit'/);
  assert.match(controller, /mode: 'cors'/);
  assert.match(controller, /expectedPackage/);
  assert.match(controller, /release\.appId !== appId/);
  assert.match(controller, /release\.packageName !== expectedPackage/);
  assert.match(controller, /url\.origin !== origin/);
  assert.match(controller, /url\.pathname !== expectedPath/);
  assert.match(controller, /window\.SMV_APK_RELEASE_API_URL/);
  assert.match(controller, /AbortSignal\.timeout/);
});

test('Admin has three separate signed APK managers with version history refresh and protected archive deletion controls', () => {
  const html = read('public/index.html');
  const manager = read('public/smvastro.mjs');
  const worker = read('cloudflare/android-apk-release/worker.mjs');
  for (const app of ['astro', 'horoscope', 'calendar']) {
    const prefix = app === 'astro' ? 'adminAndroidApp' : app === 'horoscope' ? 'adminHoroscopeAndroidApp' : 'adminCalendarAndroidApp';
    assert.ok(html.includes('id="' + prefix + 'File"'));
    assert.ok(html.includes('id="' + prefix + 'Upload"'));
    assert.ok(html.includes('id="' + prefix + 'Refresh"'));
    assert.ok(html.includes('id="' + prefix + 'History"'));
    assert.ok(manager.includes("appId==='astro'?'/admin/android-app/upload':app.workerPath+'/upload'") || app === 'astro');
  }
  assert.ok(html.includes('id="adminGroupAppManagement"'));
  assert.ok(html.includes('id="adminHoroscopeAndroidAppManagementCard"'));
  assert.ok(html.includes('id="adminCalendarAndroidAppManagementCard"'));
  assert.ok(manager.includes("method:'DELETE'"));
  assert.ok(manager.includes('DELETE OLD APK'));
  assert.ok(worker.includes('ALLOW_APK_DELETES'));
  assert.ok(worker.includes('The current published APK is protected and cannot be deleted.'));
  assert.ok(worker.includes("row.storage_provider !== 'r2'"));
  assert.ok(worker.includes('DELETE FROM android_app_releases WHERE app_id = ?'));
});

test('Horoscope and Calendar public areas show app-specific APK downloads while retaining the offline PWA shell', () => {
  const horoscope = read('public/horoscope/index.html');
  const horoscopePwa = read('public/horoscope/pwa.js');
  const calendar = read('public/horoscope/calendar/index.html');
  const calendarPwa = read('public/horoscope/calendar/calendar-pwa.mjs');
  const calendarContent = read('public/horoscope/daily-calendar.mjs');
  const apkController = read('public/horoscope/android-apk-download.mjs');

  assert.ok(horoscope.includes('id="smvHoroscopeAndroidApkSection"'));
  assert.ok(horoscope.includes('./android-apk-download.mjs'));
  assert.equal(horoscope.includes('id="smvHoroscopeInstallArea"'), false);
  assert.equal(horoscope.includes('id="installApp"'), false);
  assert.ok(horoscope.includes('rel="manifest"'));
  assert.ok(horoscope.includes('pwa.js'));
  assert.ok(horoscopePwa.includes("navigator.serviceWorker.register('./sw.js'"));
  
  assert.ok(calendar.includes('id="smvCalendarAndroidApkSection"'));
  assert.ok(calendar.includes('../android-apk-download.mjs'));
  assert.equal(calendar.includes('id="smvCalendarInstallArea"'), false);
  assert.equal(calendar.includes('id="calInstall"'), false);
  assert.ok(calendar.includes('id="calendarManifest"'));
  assert.ok(calendar.includes('calendar-pwa.mjs'));
  assert.ok(calendarPwa.includes("navigator.serviceWorker.register('./sw.js'"));
  assert.ok(calendarContent.includes('cal-download-app-link'));
  assert.ok(calendarContent.includes('#smvCalendarAndroidApkSection'));
  assert.ok(apkController.includes('/public/android-apps/'));
  assert.ok(apkController.includes('credentials: \'omit\''));
  assert.ok(apkController.includes('in.smvastroservices.horoscope'));
  assert.ok(apkController.includes('in.smvastroservices.calendar'));
});

test('APK download controller validates app identity and exact Worker origin before showing download', () => {
  const controller = read('public/horoscope/android-apk-download.mjs');
  assert.ok(controller.includes("release.appId !== appId"));
  assert.ok(controller.includes("release.packageName !== expectedPackage"));
  assert.ok(controller.includes("url.origin !== origin"));
  assert.ok(controller.includes("url.pathname !== expectedPath"));
  assert.ok(controller.includes("credentials: 'omit'"));
  assert.ok(controller.includes("mode: 'cors'"));
  assert.ok(controller.includes("url.protocol !== 'https:'"));
});
