'use strict';

import express from 'express';
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { createFirebaseIdTokenVerifier } from '../../../shared/backend-platform/firebase-id-token.mjs';
import { createFirebaseFirestoreRestClient } from '../../../shared/backend-platform/firebase-firestore-rest.mjs';
import { resolveFirebaseAuthorization } from '../../../shared/backend-platform/firebase-authorization.mjs';

const app = express();
const verifyFirebaseIdToken = createFirebaseIdTokenVerifier();
const firebaseFirestore = createFirebaseFirestoreRestClient();
const JSON_HEADERS = Object.freeze({ 'Cache-Control': 'no-store' });
const ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type, Idempotency-Key';

app.disable('x-powered-by');

function allowedOrigins() {
  return new Set(String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean));
}

app.use((req, res, next) => {
  const origin = String(req.get('Origin') || '');
  if (!origin) return next();

  if (!allowedOrigins().has(origin)) {
    return res.status(403).json({ ok: false, code: 'ORIGIN_NOT_ALLOWED' });
  }

  res.set({
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  });

  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
});

app.use(express.json({ limit: '1mb', strict: true }));

app.get('/api/auth/session', async (req, res) => {
  const authorization = String(req.get('Authorization') || '');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) {
    return res.status(401).set(JSON_HEADERS).json({ ok: false, code: 'AUTH_REQUIRED' });
  }

  const projectIds = String(env.FIREBASE_AUTH_PROJECT_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  if (projectIds.length === 0) {
    return res.status(503).set(JSON_HEADERS).json({
      ok: false,
      code: 'AUTH_PROJECT_ALLOWLIST_NOT_CONFIGURED'
    });
  }

  try {
    const identity = await verifyFirebaseIdToken(match[1], projectIds);
    return res.set(JSON_HEADERS).json({
      ok: true,
      uid: identity.uid,
      firebaseProjectId: identity.projectId,
      emailVerified: identity.emailVerified,
      signInProvider: identity.signInProvider
    });
  } catch (_error) {
    return res.status(401).set(JSON_HEADERS).json({
      ok: false,
      code: 'AUTH_TOKEN_INVALID'
    });
  }
});

app.get('/api/auth/authorization', async (req, res) => {
  const authorization = String(req.get('Authorization') || '');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) {
    return res.status(401).set(JSON_HEADERS).json({ ok: false, code: 'AUTH_REQUIRED' });
  }

  const projectIds = String(env.FIREBASE_AUTH_PROJECT_IDS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  let identity;
  try {
    identity = await verifyFirebaseIdToken(match[1], projectIds);
  } catch (_error) {
    return res.status(401).set(JSON_HEADERS).json({ ok: false, code: 'AUTH_TOKEN_INVALID' });
  }

  try {
    const uid = identity.uid;
    const [profileDocument, adminDocument, astrologerDocument] = await Promise.all([
      firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_users/' + uid,
        idToken: match[1]
      }),
      firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_admins/' + uid,
        idToken: match[1]
      }),
      firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_astrologers/' + uid,
        idToken: match[1]
      })
    ]);

    const authorizationState = resolveFirebaseAuthorization({
      identity,
      profileDocument,
      adminDocument,
      astrologerDocument,
      adminUids: String(env.ADMIN_UIDS || '').split(','),
      adminEmails: String(env.ADMIN_AUTH_EMAILS || '').split(',')
    });

    return res.set(JSON_HEADERS).json({
      ok: true,
      ...authorizationState,
      firebaseProjectId: identity.projectId,
      signInProvider: identity.signInProvider
    });
  } catch (error) {
    const status = error?.httpStatus === 401 || error?.httpStatus === 403 ? 403 : 503;
    return res.status(status).set(JSON_HEADERS).json({
      ok: false,
      code: status === 403 ? 'FIRESTORE_PROFILE_ACCESS_DENIED' : 'FIRESTORE_AUTHORIZATION_UNAVAILABLE'
    });
  }
});

app.get('/healthz', (_req, res) => {
  return res.set(JSON_HEADERS).json({
    ok: true,
    service: 'smvastro-backend-api',
    runtime: 'cloudflare-workers-express-http-bridge',
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive: String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true',
    productionTrafficEnabled: false
  });
});

app.get('/api/backend/readiness', async (_req, res) => {
  if (!env.DB || typeof env.DB.prepare !== 'function') {
    return res.status(503).set(JSON_HEADERS).json({
      ok: false,
      ready: false,
      checks: { expressRuntime: true, d1Binding: false, walletSchema: false }
    });
  }

  try {
    const row = await env.DB.prepare(
      'SELECT schema_version FROM smv_wallet_schema_meta WHERE id = ? LIMIT 1'
    ).bind('primary').first();

    const ready = row?.schema_version === '0001_wallet_live_domain';
    return res.status(ready ? 200 : 503).set(JSON_HEADERS).json({
      ok: ready,
      ready,
      schemaVersion: row?.schema_version || null,
      checks: { expressRuntime: true, d1Binding: true, walletSchema: ready },
      firebaseConnected: false,
      razorpayConnected: false,
      walletBusinessRoutesEnabled: false,
      liveCallChatRoutesEnabled: false
    });
  } catch (_error) {
    return res.status(503).set(JSON_HEADERS).json({
      ok: false,
      ready: false,
      checks: { expressRuntime: true, d1Binding: true, walletSchema: false }
    });
  }
});

app.get('/api/backend/migration-status', (_req, res) => {
  return res.set(JSON_HEADERS).json({
    ok: true,
    phase: 'cloudflare-runtime-foundation',
    legacyRouteInventory: 117,
    legacyServerLoaded: false,
    firebaseIdTokenVerification: true,
    firebaseUserScopedFirestoreRestAdapter: true,
    firebaseAdminUserManagementConnected: false,
    firestoreConnected: false,
    razorpayConnected: false,
    walletBusinessRoutesEnabled: false,
    callChatRoutesEnabled: false,
    renderDependency: false,
    productionTrafficEnabled: false,
    nextGate: 'firebase-auth-and-firestore-adapter-tests'
  });
});

// Do not let an unfinished endpoint masquerade as a working backend route.
// Route families are enabled only after their Cloudflare implementation and
// security/conformance tests have been reviewed in a later staging phase.
app.all(/^\/api(?:\/.*)?$/, (_req, res) => {
  return res.status(503).set(JSON_HEADERS).json({
    ok: false,
    code: 'BACKEND_MIGRATION_NOT_CUT_OVER',
    error: 'This API route is not enabled in the Cloudflare staging runtime yet.'
  });
});

app.use((_req, res) => {
  return res.status(404).set(JSON_HEADERS).json({ ok: false, code: 'NOT_FOUND' });
});

app.use((error, _req, res, _next) => {
  const status = Number(error?.status);
  return res.status(status >= 400 && status < 500 ? status : 500)
    .set(JSON_HEADERS)
    .json({ ok: false, code: 'REQUEST_FAILED' });
});

app.listen(3000);
export default httpServerHandler({ port: 3000 });
