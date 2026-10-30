'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('server exposes a small health endpoint and environment-based Oracle backend URL', () => {
  const server = read('server.js');
  assert.ok(server.includes("app.get('/healthz'"));
  assert.ok(server.includes('PUBLIC_BACKEND_URL'));
  assert.ok(server.includes('LISTEN_HOST'));
  assert.ok(server.includes('app.listen(PORT, LISTEN_HOST'));
  assert.ok(!server.includes('smvastroservices.onrender.com'));
});

test('browser API references use Oracle hostnames and keep staging isolated', () => {
  const files = [
    'main-location-search.js',
    'smvastro.mjs',
    'public/main-location-search.js',
    'public/question-place-search.mjs',
    'public/public-content.mjs',
    'public/smvastro.mjs',
    'public/index.html',
    'public/sw.js',
    'public/android-app-install.js',
    'public/horoscope/config.js',
    'public/horoscope/horoscope-auth.mjs',
    'public/horoscope/location-search-online-offline.js',
    'public/horoscope/saved-compat.mjs'
  ];
  for (const name of files) {
    const source = read(name);
    assert.ok(!source.includes('.onrender.com'), name + ' must no longer call a Render API/browser host');
  }
  assert.ok(read('public/smvastro.mjs').includes('https://api-staging.smvastroservices.in'));
  assert.ok(read('public/smvastro.mjs').includes('https://api.smvastroservices.in'));
  assert.ok(read('public/horoscope/location-search-online-offline.js').includes("offlineUrl"));
  assert.ok(read('public/horoscope/location-search-online-offline.js').includes("api-staging.smvastroservices.in"));
});

test('Oracle deployment preserves offline/ephemeris files and avoids unsafe destructive cleanups', () => {
  const deploy = read('ops/oracle/deploy-backend.sh');
  const bootstrap = read('ops/oracle/bootstrap-ubuntu.sh');
  assert.ok(deploy.includes('--package-lock=false --omit=dev'));
  assert.ok(deploy.includes('/healthz'));
  assert.ok(!deploy.includes('git clean'));
  assert.ok(!deploy.includes('rsync --delete'));
  assert.ok(!deploy.includes('rm -rf'));
  assert.ok(bootstrap.includes('/opt/smvastroservices/shared/ephe'));
  assert.ok(!bootstrap.includes('ufw --force enable'));
});

test('Oracle Nginx proxies privately to separate production/staging backends', () => {
  const nginx = read('ops/oracle/nginx/smvastro-oci.conf');
  assert.ok(nginx.includes('127.0.0.1:10000'));
  assert.ok(nginx.includes('127.0.0.1:10001'));
  assert.ok(nginx.includes('api.smvastroservices.in'));
  assert.ok(nginx.includes('api-staging.smvastroservices.in'));
  assert.ok(nginx.includes('staging.smvastroservices.in'));
  assert.ok(!nginx.includes('listen 10000'));
  assert.ok(!nginx.includes('listen 10001'));
  assert.ok(nginx.includes('proxy_buffering off'));
  assert.ok(nginx.includes('client_max_body_size 110m'));
});

test('staging env stays on isolated Firebase project and Razorpay Test Mode', () => {
  const env = read('ops/oracle/staging.env.example');
  assert.ok(env.includes('FIREBASE_PROJECT_ID=smv-astro-staging'));
  assert.ok(env.includes('RAZORPAY_KEY_ID=rzp_test_REPLACE_ME'));
  assert.ok(env.includes('PORT=10001'));
  assert.ok(env.includes('HOST=127.0.0.1'));
});
