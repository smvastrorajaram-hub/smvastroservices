'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const express = require('express');
const { createCorsMiddleware, createRequestBodyParser, createRouteRateLimiter } = require('../api-security');

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const address = server.address();
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

function createTestApp() {
  const app = express();
  app.use(createCorsMiddleware());
  app.use(createRouteRateLimiter());
  app.use(createRequestBodyParser(express));
  app.post('/contact-query', (req, res) => res.status(202).json({ ok: true }));
  app.post('/register-astrologer-profile', (req, res) => res.status(201).json({ ok: true, photoChars: String(req.body?.photo || '').length }));
  const webhookSecret = 'test-webhook-signing-secret';
  app.post('/razorpay/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.get('X-Razorpay-Signature');
    if (!signature) return res.status(400).send('Missing signature');
    const expected = crypto.createHmac('sha256', webhookSecret).update(req.body).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).send('Invalid signature');
    try { JSON.parse(req.body.toString('utf8')); } catch (_) { return res.status(400).send('Invalid JSON'); }
    return res.status(200).json({ ok: true, rawBody: Buffer.isBuffer(req.body) });
  });
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'Payload too large' });
    return next(err);
  });
  return { app, webhookSecret };
}

test('actual HTTP parser enforces the contact endpoint 20 KB limit with 413', async () => {
  const { app } = createTestApp();
  await withServer(app, async base => {
    const response = await fetch(`${base}/contact-query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'x'.repeat(22 * 1024) }) });
    assert.equal(response.status, 413);
  });
});

test('astrologer registration accepts payloads larger than the default 1 MB limit', async () => {
  const { app } = createTestApp();
  await withServer(app, async base => {
    const response = await fetch(`${base}/register-astrologer-profile`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photo: 'p'.repeat(1_100_000) }) });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).photoChars, 1_100_000);
  });
});

test('CORS preflight returns 204 for an approved origin and rejects an unknown origin', async () => {
  const previous = process.env.ALLOWED_ORIGINS; process.env.ALLOWED_ORIGINS = 'https://partner.example';
  try {
    const { app } = createTestApp();
    await withServer(app, async base => {
      const allowed = await fetch(`${base}/contact-query`, { method: 'OPTIONS', headers: { Origin: 'https://partner.example', 'Access-Control-Request-Method': 'POST' } });
      assert.equal(allowed.status, 204); assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://partner.example');
      const denied = await fetch(`${base}/contact-query`, { method: 'OPTIONS', headers: { Origin: 'https://not-approved.example', 'Access-Control-Request-Method': 'POST' } });
      assert.equal(denied.status, 403); assert.equal(denied.headers.get('access-control-allow-origin'), null);
    });
  } finally { if (previous === undefined) delete process.env.ALLOWED_ORIGINS; else process.env.ALLOWED_ORIGINS = previous; }
});

test('Razorpay webhook preserves raw bytes for HMAC and rejects an invalid signature', async () => {
  const { app, webhookSecret } = createTestApp();
  const body = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_test' } } } }));
  const valid = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
  await withServer(app, async base => {
    const accepted = await fetch(`${base}/razorpay/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Razorpay-Signature': valid }, body });
    assert.equal(accepted.status, 200); assert.deepEqual(await accepted.json(), { ok: true, rawBody: true });
    const rejected = await fetch(`${base}/razorpay/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Razorpay-Signature': '00'.repeat(32) }, body });
    assert.equal(rejected.status, 401);
  });
});

test('route limiter returns actual HTTP 429 after 20 public-form requests per window', async () => {
  const { app } = createTestApp();
  await withServer(app, async base => {
    const request = () => fetch(`${base}/contact-query`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: 'hello' }) });
    for (let i = 0; i < 20; i++) assert.equal((await request()).status, 202);
    const blocked = await request(); assert.equal(blocked.status, 429); assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });
});

test('production server retains Express raw-body Razorpay HMAC signature verification', () => {
  const source = fs.readFileSync(require.resolve('../server.js'), 'utf8');
  assert.match(source, /app\.post\("\/razorpay\/webhook",\s*express\.raw\(\s*\{\s*type:\s*"application\/json"\s*\}\s*\)/);
  assert.match(source, /crypto\.createHmac\("sha256",\s*secret\)\.update\(req\.body\)\.digest\("hex"\)/);
});
