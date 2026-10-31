'use strict';

import express from 'express';
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { createFirebaseIdTokenVerifier } from '../../../shared/backend-platform/firebase-id-token.mjs';
import { createFirebaseFirestoreRestClient } from '../../../shared/backend-platform/firebase-firestore-rest.mjs';
import { resolveFirebaseAuthorization } from '../../../shared/backend-platform/firebase-authorization.mjs';
import { createFirestoreAdminRestClient } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createFirebaseIdentityService } from '../../../shared/backend-platform/firebase-identity-service.mjs';
import { registerWalletReadRoutes, isWalletReadRouteGateOpen } from './wallet-read-routes.mjs';
import { isLegacyBackendPath, LEGACY_BACKEND_ROUTE_INVENTORY } from '../../../shared/backend-platform/legacy-backend-route-inventory.mjs';

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
    const [profileDocument, adminDocument] = await Promise.all([
      firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_users/' + uid,
        idToken: match[1]
      }),
      firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_admins/' + uid,
        idToken: match[1]
      })
    ]);
    let astrologerDocument = { exists: false, id: uid, data: null };
    if (profileDocument.exists &&
        String(profileDocument.data?.role || '').trim().toLowerCase() === 'astrologer') {
      astrologerDocument = await firebaseFirestore.getDocument({
        projectId: identity.projectId,
        documentPath: 'smv_astrologers/' + uid,
        idToken: match[1]
      });
    }

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


const walletReadRouteGateOpen = isWalletReadRouteGateOpen(env);
let walletReadRoutesRegistered = false;
let walletDomainSchemaReady = false;

function walletFirebaseServiceAccount() {
  const raw = String(env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    const credentials = JSON.parse(raw);
    if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials)) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON must contain a service-account object.');
    }
    return credentials;
  }
  return {
    project_id: String(env.FIREBASE_PROJECT_ID || '').trim(),
    client_email: String(env.FIREBASE_CLIENT_EMAIL || '').trim(),
    private_key: String(env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n').trim()
  };
}

// Read-only Wallet endpoints are registered only after explicit domain backfill
// and cutover gates. A second per-request D1 schema check remains fail-closed.
if (walletReadRouteGateOpen && env.DB && typeof env.DB.prepare === 'function') {
  const credentials = walletFirebaseServiceAccount();
  const projectId = String(env.FIREBASE_PROJECT_ID || credentials.project_id || '').trim();
  const configuredProjectIds = String(env.FIREBASE_AUTH_PROJECT_IDS || projectId)
    .split(',').map(value => value.trim()).filter(Boolean);
  if (!projectId || !configuredProjectIds.includes(projectId)) {
    throw new Error('Wallet identity project must be included in FIREBASE_AUTH_PROJECT_IDS.');
  }
  const firestoreAdmin = createFirestoreAdminRestClient({
    projectId,
    allowedProjectIds: [projectId],
    credentials
  });
  const walletIdentity = createFirebaseIdentityService({
    verifyIdToken: verifyFirebaseIdToken,
    firestore: firestoreAdmin,
    projectIds: [projectId],
    adminUids: [env.ADMIN_UID || '', ...String(env.ADMIN_UIDS || '').split(',')],
    adminEmails: String(env.ADMIN_AUTH_EMAILS || '').split(',')
  });
  const walletAdapter = createD1WalletAdapter({ db: env.DB });
  const walletSchemaReady = async () => {
    try {
      const row = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('shared-domain').first();
      const ready = row?.schema_version === '0002_shared_domain_repository';
      walletDomainSchemaReady = ready;
      return ready;
    } catch {
      walletDomainSchemaReady = false;
      return false;
    }
  };
  registerWalletReadRoutes({
    app,
    identityService: walletIdentity,
    walletAdapter,
    adminWalletUid: String(env.ADMIN_WALLET_UID || env.ADMIN_UID || ''),
    isReady: walletSchemaReady
  });
  walletReadRoutesRegistered = true;
}

app.get('/healthz', (_req, res) => {
  return res.set(JSON_HEADERS).json({
    ok: true,
    service: 'smvastro-backend-api',
    runtime: 'cloudflare-workers-express-http-bridge',
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive: String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true',
    walletReadRoutesRegistered,
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
    let domainSchemaVersion = null;
    try {
      const domain = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('shared-domain').first();
      domainSchemaVersion = domain?.schema_version || null;
      walletDomainSchemaReady = domainSchemaVersion === '0002_shared_domain_repository';
    } catch {
      walletDomainSchemaReady = false;
    }
    const walletReadEnabled = walletReadRoutesRegistered &&
      walletReadRouteGateOpen && walletDomainSchemaReady;
    return res.status(ready ? 200 : 503).set(JSON_HEADERS).json({
      ok: ready,
      ready,
      schemaVersion: row?.schema_version || null,
      sharedDomainSchemaVersion: domainSchemaVersion,
      checks: {
        expressRuntime: true, d1Binding: true, walletSchema: ready,
        sharedDomainSchema: walletDomainSchemaReady
      },
      firebaseConnected: false,
      razorpayConnected: false,
      walletReadRoutesEnabled: walletReadEnabled,
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
    legacyRouteInventory: LEGACY_BACKEND_ROUTE_INVENTORY.length,
    legacyServerLoaded: false,
    firebaseIdTokenVerification: true,
    firebaseUserScopedFirestoreRestAdapter: true,
    firebaseAdminUserManagementConnected: false,
    firestoreConnected: false,
    razorpayConnected: false,
    walletReadRoutesEnabled: walletReadRoutesRegistered && walletReadRouteGateOpen && walletDomainSchemaReady,
    walletBusinessRoutesEnabled: false,
    callChatRoutesEnabled: false,
    renderDependency: false,
    productionTrafficEnabled: false,
    nextGate: 'firebase-auth-and-firestore-adapter-tests'
  });
});

// Do not let an unfinished legacy endpoint masquerade as a working backend route.
// Known legacy paths are explicitly fail-closed until each business family is
// ported and passes its Cloudflare conformance suite. Unknown non-API paths stay 404.
app.use((req, res) => {
  const legacyPath = isLegacyBackendPath(req.path);
  const apiPath = req.path === '/api' || req.path.startsWith('/api/');
  if (legacyPath || apiPath) {
    return res.status(503).set(JSON_HEADERS).json({
      ok: false,
      code: 'BACKEND_MIGRATION_NOT_CUT_OVER',
      error: 'This API route is not enabled in the Cloudflare staging runtime yet.'
    });
  }
  return res.status(404).set(JSON_HEADERS).json({ ok: false, code: 'NOT_FOUND' });
});

app.use((error, _req, res, _next) => {
  const status = Number(error?.status);
  return res.status(status >= 400 && status < 500 ? status : 500)
    .set(JSON_HEADERS)
    .json({ ok: false, code: 'REQUEST_FAILED' });
});

app.listen(3000);
export { LiveSessionCoordinator, LiveUserEventHub } from './live-session-coordinator.mjs';
export default httpServerHandler({ port: 3000 });
