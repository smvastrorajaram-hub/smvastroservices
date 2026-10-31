import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('Production Android uses the configured public Web OAuth Client ID with stable Credential Manager dependencies', () => {
  const gradle = read('smvastroproduction/build.gradle');
  assert.ok(gradle.includes('299081899217-ht47n60l8t2c7gbo07nd4lpm8i51jk3m.apps.googleusercontent.com'));
  assert.ok(gradle.includes('SMV_GOOGLE_WEB_CLIENT_ID'));
  assert.ok(gradle.includes('buildConfigField "String", "SMV_GOOGLE_WEB_CLIENT_ID"'));
  assert.ok(gradle.includes('androidx.credentials:credentials:1.6.0'));
  assert.ok(gradle.includes('androidx.credentials:credentials-play-services-auth:1.6.0'));
  assert.ok(gradle.includes('com.google.android.libraries.identity.googleid:googleid:1.1.1'));
  assert.equal(gradle.includes('credentials:1.7.0-alpha'), false, 'production uses stable Credential Manager');
  assert.equal(gradle.includes('googleWebClientSecret'), false, 'no OAuth client secret is configured');
});

test('Native WebView Google login uses Credential Manager and the Web Client ID, not embedded Web OAuth', () => {
  const bridge = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/NativeWebBridge.java');
  assert.ok(bridge.includes('CredentialManager.create(activity)'));
  assert.ok(bridge.includes('new GetGoogleIdOption.Builder()'));
  assert.ok(bridge.includes('.setServerClientId(BuildConfig.SMV_GOOGLE_WEB_CLIENT_ID)'));
  assert.ok(bridge.includes('.setFilterByAuthorizedAccounts(false)'));
  assert.ok(bridge.includes('GoogleIdTokenCredential.createFrom'));
  assert.ok(bridge.includes('googleCredential.getIdToken()'));
  assert.ok(bridge.includes('"googleSignInResult"'));
  assert.ok(bridge.includes('isMainFrame || !isTrustedOrigin(sourceOrigin)'));
  assert.ok(bridge.includes('"https://smvastroservices.in"'));
  assert.ok(bridge.includes('"https://www.smvastroservices.in"'));
  assert.equal(/Log\.[divew]\([^\n]*(?:idToken|googleCredential)/i.test(bridge), false, 'Google ID tokens are never logged');
  assert.equal(bridge.includes('WebView.addJavascriptInterface'), false, 'native bridge uses origin-restricted WebMessageListener');
});

test('Website Firebase SDK exchanges native Google ID token while preserving browser popup and role verification', () => {
  const frontend = read('public/smvastro.mjs');
  assert.ok(frontend.includes('signInWithCredential } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"'));
  assert.ok(frontend.includes('window.SMVNativeCalls?.isNativeApp?.()===true'));
  assert.ok(frontend.includes('window.SMVNativeCalls.signInWithGoogle()'));
  assert.ok(frontend.includes('GoogleAuthProvider.credential(idToken)'));
  assert.ok(frontend.includes('signInWithCredential(auth,firebaseCredential)'));
  assert.ok(frontend.includes('signInWithPopup(auth,provider)'), 'regular browsers retain the existing popup flow');
  assert.ok(frontend.includes('await finishGoogleRoleLogin(result?.user)'), 'all Google accounts still pass through registered-role verification');
  assert.equal(frontend.includes('signInWithRedirect('), false, 'Firebase redirect flow is not introduced');
});

test('Android APK workflow runs the native Google login regression test for source changes', () => {
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  assert.equal((workflow.match(/test\/android-google-credential-manager\.test\.mjs/g) || []).length >= 3, true,
    'test is included in both path filters and the Node test command');
  assert.ok(workflow.includes('node --test test/android-permanent-release.test.mjs test/android-google-credential-manager.test.mjs'));
  assert.ok(workflow.includes(':smvastroproduction:assembleDebug'));
  assert.ok(workflow.includes(':smvastroproduction:assembleRelease'));
});
