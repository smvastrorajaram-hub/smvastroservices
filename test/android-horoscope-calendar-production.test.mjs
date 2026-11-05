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

test('Public Horoscope and Calendar APK cards point to the verified Cloudflare release Worker', () => {
  const controller = read('public/horoscope/android-apk-download.mjs');
  const horoscopeHtml = read('public/horoscope/index.html');
  const calendarHtml = read('public/horoscope/calendar/index.html');
  const publicApiConfig = '<script id="smv-apk-release-api-config">window.SMV_APK_RELEASE_API_URL = window.SMV_APK_RELEASE_API_URL || "https://smv-astro-apk-release-api.astroservices.workers.dev";</script>';

  assert.ok(controller.includes("window.SMV_APK_RELEASE_API_URL || ''"));
  assert.ok(controller.includes('if (!configured) return null'));
  assert.ok(controller.includes("allowedWorkerOrigin = 'https://smv-astro-apk-release-api.astroservices.workers.dev'"));
  assert.ok(horoscopeHtml.includes(publicApiConfig), 'Horoscope must configure the public APK release Worker');
  assert.ok(calendarHtml.includes(publicApiConfig), 'Calendar must configure the public APK release Worker');
  assert.ok(horoscopeHtml.indexOf(publicApiConfig) < horoscopeHtml.indexOf('./android-apk-download.mjs'));
  assert.ok(calendarHtml.indexOf(publicApiConfig) < calendarHtml.indexOf('../android-apk-download.mjs'));
  assert.ok(horoscopeHtml.includes('smvHoroscopeAndroidApkSection'));
  assert.ok(calendarHtml.includes('smvCalendarAndroidApkSection'));
  assert.ok(!horoscopeHtml.includes('id="smvHoroscopeInstallArea"') && !horoscopeHtml.includes('id="installApp"'));
  assert.ok(!calendarHtml.includes('id="smvCalendarInstallArea"') && !calendarHtml.includes('id="calInstall"'));
  assert.ok(horoscopeHtml.includes('rel="manifest"'));
  assert.ok(horoscopeHtml.includes('pwa.js'));
  assert.ok(calendarHtml.includes('calendar-pwa.mjs'));
});

test('The production release workflow compiles both apps, signs with the existing certificate and publishes separate artifacts', () => {
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  assert.match(workflow, /:smvhoroscopeproduction:assembleRelease/);
  assert.match(workflow, /:smvcalendarproduction:assembleRelease/);
  assert.match(workflow, /SMV_ANDROID_KEYSTORE_BASE64/);
  const signedBuildStep = workflow.split('- name: Build both permanently signed Release APKs')[1].split('- name: Verify v2 signature and permanent certificate on both APKs')[0];
  assert.ok(signedBuildStep.includes('SMV_ANDROID_KEYSTORE_PASSWORD: ${{ secrets.SMV_ANDROID_KEYSTORE_PASSWORD }}'));
  assert.ok(signedBuildStep.includes('SMV_ANDROID_KEY_ALIAS: ${{ secrets.SMV_ANDROID_KEY_ALIAS }}'));
  assert.ok(signedBuildStep.includes('SMV_ANDROID_KEY_PASSWORD: ${{ secrets.SMV_ANDROID_KEY_PASSWORD }}'));
  assert.match(workflow, /smvastro-release/);
  assert.ok(workflow.includes("github.ref == 'refs/heads/main'"));
  assert.match(workflow, /SMV_HOROSCOPE_ANDROID_VERSION_NAME/);
  assert.match(workflow, /SMV_CALENDAR_ANDROID_VERSION_NAME/);
  assert.ok(workflow.includes('inputs.horoscope_version_name'));
  assert.ok(workflow.includes('inputs.calendar_version_name'));
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

test('Horoscope and Calendar bottom Android app cards reuse the SMV ASTRO icon-card presentation', () => {
  const horoscope = read('public/horoscope/index.html');
  const calendar = read('public/horoscope/calendar/index.html');
  const sharedStyles = read('public/horoscope/horoscope.css');
  const calendarTheme = read('public/horoscope/calendar-theme.css');

  assert.ok(horoscope.includes('class="smv-android-apk-section"'));
  assert.ok(calendar.includes('class="smv-android-apk-section"'));
  assert.ok(horoscope.includes('src="assets/icon-192.png"'));
  assert.ok(calendar.includes('src="../assets/calendar-192.png"'));
  for (const html of [horoscope, calendar]) {
    assert.ok(html.includes('class="smv-android-apk-icon-wrap"'));
    assert.ok(html.includes('class="smv-android-apk-copy"'));
    assert.ok(html.includes('class="smv-android-apk-actions"'));
    assert.ok(html.includes('class="smv-android-apk-download"'));
    assert.ok(html.includes('data-apk-version'));
    assert.ok(html.includes('data-apk-status'));
    assert.ok(html.includes('data-apk-download'));
  }
  assert.ok(sharedStyles.includes('.smv-android-apk-icon-wrap'));
  assert.ok(sharedStyles.includes('.smv-android-apk-copy h2'));
  assert.ok(sharedStyles.includes('.smv-android-apk-download'));
  assert.match(calendarTheme, /cal-download-app-link \.cal-app-badge\{display:none\}/);
  assert.ok(read('public/horoscope/daily-calendar.mjs').includes("'#smvCalendarAndroidApkSection'"));
  assert.equal(JSON.parse(read('public/horoscope/manifest-en.webmanifest')).scope, '/horoscope/');
  assert.equal(JSON.parse(read('public/horoscope/calendar/manifest-en.webmanifest')).scope, '/horoscope/calendar/');
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


test('All three production Android WebViews use network-first Service Worker cache mode without clearing user data', () => {
  const products = [
    'smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java',
    'smvhoroscopeproduction/src/main/java/in/smvastroservices/horoscope/MainActivity.java',
    'smvcalendarproduction/src/main/java/in/smvastroservices/calendar/MainActivity.java'
  ];
  for (const path of products) {
    const activity = read(path);
    assert.ok(activity.includes('import android.webkit.ServiceWorkerController;'), path + ' must enable the platform Service Worker controller');
    assert.ok(activity.includes('import android.webkit.ServiceWorkerWebSettings;'), path + ' must configure Service Worker cache policy');
    assert.ok(activity.includes('settings.setCacheMode(WebSettings.LOAD_DEFAULT);'), path + ' must retain normal online-first WebView HTTP cache');
    assert.ok(activity.includes('ServiceWorkerController.getInstance().getServiceWorkerWebSettings()'), path + ' must configure the Service Worker runtime');
    assert.ok(activity.includes('serviceWorkerSettings.setCacheMode(WebSettings.LOAD_DEFAULT);'), path + ' must keep Service Worker requests online-first');
    assert.ok(activity.includes('serviceWorkerSettings.setBlockNetworkLoads(false);'), path + ' must allow online refresh');
    assert.doesNotMatch(activity, /(?:webView|WebView)\.clearCache\s*\(/, path + ' must not clear WebView storage on launch');
    assert.doesNotMatch(activity, /localStorage\.clear|sessionStorage\.clear|caches\.delete/, path + ' must not clear web app or customer data');
  }
});
