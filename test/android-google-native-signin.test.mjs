import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Production APK uses the supplied public Google OAuth Web Client ID and stable Credential Manager dependencies', () => {
  const gradle = read('smvastroproduction/build.gradle');
  assert.ok(gradle.includes('299081899217-ht47n60l8t2c7gbo07nd4lpm8i51jk3m.apps.googleusercontent.com'));
  assert.ok(gradle.includes('SMV_GOOGLE_WEB_CLIENT_ID'));
  assert.ok(gradle.includes('setServerClientId') === false, 'The server Client ID is consumed in the native Java request');
  assert.match(gradle, /credentials:1\.3\.0/);
  assert.match(gradle, /credentials-play-services-auth:1\.3\.0/);
  assert.match(gradle, /googleid:1\.1\.1/);
  assert.match(gradle, /versionCode appVersionCode/);
  assert.match(gradle, /\.orElse\("v1\.2"\)/);
  assert.doesNotMatch(gradle, /client[_-]?secret/i);
});

test('Native Credential Manager obtains a Google ID token without opening an embedded OAuth browser', () => {
  const native = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/NativeGoogleSignIn.java');
  assert.ok(native.includes('CredentialManager.create(activity)'));
  assert.ok(native.includes('getCredentialAsync('));
  assert.ok(native.includes('setServerClientId(BuildConfig.SMV_GOOGLE_WEB_CLIENT_ID)'));
  assert.ok(native.includes('setFilterByAuthorizedAccounts(false)'));
  assert.ok(native.includes('GoogleIdTokenCredential.createFrom'));
  assert.ok(native.includes('googleCredential.getIdToken()'));
  assert.ok(native.includes('GetCredentialCancellationException'));
  assert.ok(native.includes('SIGN_IN_IN_PROGRESS'));
  assert.ok(native.includes('postToken(replyProxy, requestId, idToken)'));
  assert.equal(/Log\.[a-z]+\([^\n]*idToken/.test(native), false, 'The raw Google ID token must never be logged');
  assert.equal(native.includes('signInWithPopup'), false);
  assert.equal(native.includes('signInWithRedirect'), false);
});

test('Native WebMessage bridge restricts Google tokens to the trusted SMV ASTRO main frame', () => {
  const bridge = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/NativeWebBridge.java');
  assert.ok(bridge.includes('https://smvastroservices.in'));
  assert.ok(bridge.includes('https://www.smvastroservices.in'));
  assert.ok(bridge.includes('if (!isMainFrame || !isTrustedOrigin(sourceOrigin)) return;'));
  assert.ok(bridge.includes('"googleSignIn".equals(action)'));
  assert.ok(bridge.includes('NativeGoogleSignIn.start'));
  assert.ok(bridge.includes('requestId'));
  assert.ok(bridge.includes('smv:native-google-token'));
  assert.ok(bridge.includes('smv:native-google-error'));
  assert.ok(bridge.includes('requestTokenRefresh'), 'Existing FCM bridge remains available');
  assert.ok(bridge.includes('send(\'getToken\')'), 'Existing FCM token bootstrap remains available');
});

test('Android Google login reuses Firebase Web Auth and preserves the existing role checks', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes('signInWithCredential'));
  assert.ok(frontend.includes('GoogleAuthProvider.credential(idToken)'));
  assert.ok(frontend.includes('smvRequestNativeGoogleIdToken'));
  assert.ok(frontend.includes('window.SMVNativeCalls?.isNativeApp?.()===true'));
  assert.ok(frontend.includes('signInWithPopup(auth,provider)'), 'Browser/PWA popup behavior remains available');
  assert.ok(frontend.includes('async function finishGoogleRoleLogin(googleUser)'));
  assert.ok(frontend.includes('resolveSmvRole(googleUser,profile)'));
  assert.ok(frontend.includes('["customer","astrologer","admin"].includes(role)'));
  assert.ok(frontend.includes('loadDashboard(resolvedRole)'));
  assert.equal(frontend.includes('signInWithRedirect'), false);
});

test('v1.2 Android build and CI validate the native sign-in sources without changing signing identity', () => {
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  const gradle = read('smvastroproduction/build.gradle');
  const androidTest = read('test/android-permanent-release.test.mjs');

  assert.ok(workflow.includes('default: "v1.2"'));
  assert.ok(workflow.includes("vars.SMV_ANDROID_VERSION_NAME || 'v1.2'"));
  assert.ok(workflow.includes('test/android-google-native-signin.test.mjs'));
  assert.ok(workflow.includes('public/smvastro.mjs'));
  assert.ok(workflow.includes(':smvastroproduction:assembleDebug'));
  assert.ok(workflow.includes(':smvastroproduction:assembleRelease'));
  assert.ok(gradle.includes('SMV_ANDROID_KEYSTORE_PATH'));
  assert.ok(gradle.includes('signingConfig signingConfigs.release'));
  assert.ok(androidTest.includes('SMV_RELEASE_CERT_SHA256'));
});
