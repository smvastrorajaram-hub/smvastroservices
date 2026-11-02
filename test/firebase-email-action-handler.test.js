'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/auth/action.html'), 'utf8');
const moduleSource = fs.readFileSync(path.join(root, 'public/auth/action.mjs'), 'utf8');

test('custom Firebase action page is a standalone, no-index page on the main production domain', () => {
  assert.match(html, /name="robots" content="noindex,nofollow"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /src="\/auth\/action\.mjs"/);
  assert.match(html, /id="reset-form"/);
  assert.match(moduleSource, /https:\/\/smvastroservices\.in\//);
  assert.match(moduleSource, /authDomain: "auth\.smvastroservices\.in"/);
  assert.match(moduleSource, /projectId: "smv-astro"/);
});

test('handler supports every Firebase action type supported by the custom email handler setting', () => {
  for (const mode of ['verifyEmail', 'resetPassword', 'recoverEmail']) {
    assert.ok(moduleSource.includes(`"${mode}"`), `Missing ${mode} handler`);
  }
  assert.match(moduleSource, /applyActionCode\(auth, actionCode\)/);
  assert.match(moduleSource, /verifyPasswordResetCode\(auth, actionCode\)/);
  assert.match(moduleSource, /confirmPasswordReset\(auth, actionCode, newPassword\)/);
  assert.match(moduleSource, /checkActionCode\(auth, actionCode\)/);
});

test('one-time action code is removed from the address bar and never logged', () => {
  assert.match(moduleSource, /history\.replaceState\(\{\}, document\.title, window\.location\.pathname\)/);
  assert.doesNotMatch(moduleSource, /console\.(?:log|info|debug|warn|error)\([^\n]*(?:actionCode|oobCode)/i);
  assert.doesNotMatch(moduleSource, /localStorage|sessionStorage/);
});

test('validates action codes against the fixed production project without rejecting a link-key mismatch locally', () => {
  // The link's apiKey query parameter is metadata, not trusted Firebase config.
  // Firebase must validate the oobCode and return the authoritative error.
  assert.match(moduleSource, /const linkApiKey = params\.get\("apiKey"\) \|\| ""/);
  assert.match(moduleSource, /!actionCode \|\| !linkApiKey/);
  assert.doesNotMatch(moduleSource, /linkApiKey\s*!==\s*FIREBASE_CONFIG\.apiKey/);
  assert.match(moduleSource, /auth\/api-key-not-valid/);
  assert.match(moduleSource, /projectId: "smv-astro"/);
});

test('continue URLs are restricted to HTTPS production SMV domains', () => {
  assert.match(moduleSource, /candidate\.protocol === "https:"/);
  assert.match(moduleSource, /ALLOWED_CONTINUE_ORIGINS\.has\(candidate\.origin\)/);
  assert.match(moduleSource, /!candidate\.username && !candidate\.password/);
  assert.match(moduleSource, /return "https:\/\/smvastroservices\.in\//);
});

test('user-controlled values are written as text, not parsed as HTML', () => {
  assert.doesNotMatch(moduleSource, /\.innerHTML\s*=/);
  assert.match(moduleSource, /detailNode\.textContent = t\.resetReady\(email\)/);
  assert.match(moduleSource, /t\.emailLabel\(restoredEmail\)/);
});


test('diagnostic parses only the native Production Firebase action URL', async () => {
  const { parseFirebaseActionLink } = await import('../public/auth/oob-code-diagnostic.mjs');
  const parsed = parseFirebaseActionLink('https://smv-astro.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=sample&apiKey=key');
  assert.equal(parsed.mode, 'resetPassword');
  assert.equal(parsed.oobCode, 'sample');
  assert.equal(parsed.apiKey, 'key');
  assert.throws(
    () => parseFirebaseActionLink('https://smvastroservices.in/auth/action.html?mode=resetPassword&oobCode=x&apiKey=y'),
    /expected SMV ASTRO Firebase native action link/
  );
});

test('diagnostic validates verification codes with checkActionCode only', async () => {
  const { inspectFirebaseActionCode } = await import('../public/auth/oob-code-diagnostic.mjs');
  const calls = [];
  const sdk = {
    checkActionCode: async (_auth, code) => {
      calls.push(['checkActionCode', code]);
      return { operation: 'VERIFY_EMAIL', data: { email: 'private@example.com' } };
    },
    applyActionCode: async () => { throw new Error('must not be called'); }
  };
  const checked = await inspectFirebaseActionCode({ auth: {}, mode: 'verifyEmail', oobCode: 'verify-code', sdk });
  assert.deepEqual(checked, { valid: true, operation: 'VERIFY_EMAIL' });
  assert.deepEqual(calls, [['checkActionCode', 'verify-code']]);
  assert.equal(JSON.stringify(checked).includes('@'), false);
});

test('diagnostic validates password reset codes without confirming a reset', async () => {
  const { inspectFirebaseActionCode } = await import('../public/auth/oob-code-diagnostic.mjs');
  const calls = [];
  const sdk = {
    verifyPasswordResetCode: async (_auth, code) => {
      calls.push(['verifyPasswordResetCode', code]);
      return 'private@example.com';
    },
    confirmPasswordReset: async () => { throw new Error('must not be called'); }
  };
  const checked = await inspectFirebaseActionCode({ auth: {}, mode: 'resetPassword', oobCode: 'reset-code', sdk });
  assert.deepEqual(checked, { valid: true, operation: 'PASSWORD_RESET' });
  assert.deepEqual(calls, [['verifyPasswordResetCode', 'reset-code']]);
  assert.equal(JSON.stringify(checked).includes('@'), false);
});

test('diagnostic preserves Firebase expired-action-code errors', async () => {
  const { inspectFirebaseActionCode } = await import('../public/auth/oob-code-diagnostic.mjs');
  const sdk = {
    verifyPasswordResetCode: async () => {
      const error = new Error('expired');
      error.code = 'auth/expired-action-code';
      throw error;
    }
  };
  await assert.rejects(
    inspectFirebaseActionCode({ auth: {}, mode: 'resetPassword', oobCode: 'expired-code', sdk }),
    error => error.code === 'auth/expired-action-code'
  );
});

test('diagnostic page never applies action codes, changes passwords, or submits link data to an app server', async () => {
  const diagnosticHtml = fs.readFileSync(path.join(root, 'public/auth/oob-diagnostic.html'), 'utf8');
  const diagnosticModule = fs.readFileSync(path.join(root, 'public/auth/oob-code-diagnostic.mjs'), 'utf8');
  assert.match(diagnosticHtml, /checkActionCode, verifyPasswordResetCode/);
  assert.doesNotMatch(diagnosticHtml + diagnosticModule, /applyActionCode|confirmPasswordReset|sendEmailVerification|sendPasswordResetEmail|localStorage|sessionStorage|fetch\s*\(/);
  assert.match(diagnosticHtml, /input\.value = ""/);
  assert.match(diagnosticHtml, /name="referrer" content="no-referrer"/);
});
