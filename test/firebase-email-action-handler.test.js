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
