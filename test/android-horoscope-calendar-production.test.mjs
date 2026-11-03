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
