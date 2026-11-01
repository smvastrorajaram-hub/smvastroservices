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
import { createD1IdentityService } from '../../../shared/backend-platform/d1-identity-service.mjs';
import { createD1IdentityAuthorizationGate } from '../../../shared/backend-platform/d1-identity-authorization-gate.mjs';
import { registerWalletReadRoutes, isWalletReadRouteGateOpen } from './wallet-read-routes.mjs';
import { registerWalletRechargeRoutes } from './wallet-recharge-routes.mjs';
import { resolveRazorpayMode } from '../../../shared/backend-platform/razorpay-mode-policy.mjs';
import { registerAccountRoleRoute, registerAdminAccessRoute, registerPublicRuntimeReadRoutes } from './core-read-routes.mjs';
import { registerWalletOfferRoutes } from './wallet-offer-routes.mjs';
import { createWalletDomainBackfillService } from '../../../shared/backend-platform/d1-wallet-domain-backfill.mjs';
import { registerWalletDomainBackfillRoutes } from './wallet-domain-backfill-routes.mjs';
import { createIdentityProfileBackfillService } from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';
import { registerIdentityProfileBackfillRoutes } from './identity-profile-backfill-routes.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';
import { createD1WithdrawalService } from '../../../shared/backend-platform/d1-live-withdrawal-service.mjs';
import { registerD1LiveSessionRoutes } from './live-session-routes.mjs';
import { createRazorpayRestClient } from '../../../shared/backend-platform/razorpay-rest-adapter.mjs';
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

const jsonBodyParser = express.json({ limit: '1mb', strict: true });
const walletWebhookRawParser = express.raw({ type: 'application/json', limit: '1mb' });
app.use((req, res, next) => {
  if (req.path === '/wallet/recharge/webhook') return walletWebhookRawParser(req, res, next);
  return jsonBodyParser(req, res, next);
});

registerPublicRuntimeReadRoutes({ app, env });

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
  if (identityProfileD1AuthorizationOpen) {
    if (!d1IdentityAuthorizationService) {
      return res.status(503).set(JSON_HEADERS).json({
        ok: false, code: 'IDENTITY_D1_AUTHORIZATION_NOT_READY'
      });
    }
    try {
      const authorizationState = await d1IdentityAuthorizationService.authenticateAuthorization(authorization);
      d1IdentityAuthorizationReady = true;
      return res.set(JSON_HEADERS).json({
        ok: true,
        ...authorizationState,
        firebaseProjectId: authorizationState.firebaseProjectId || authorizationState.projectId,
        signInProvider: authorizationState.signInProvider || ''
      });
    } catch (error) {
      if (error?.code === 'IDENTITY_D1_AUTHORIZATION_NOT_READY') d1IdentityAuthorizationReady = false;
      const status = error?.httpStatus === 401 ? 401 : error?.httpStatus === 403 ? 403 : 503;
      return res.status(status).set(JSON_HEADERS).json({
        ok: false, code: String(error?.code || 'IDENTITY_D1_AUTHORIZATION_UNAVAILABLE')
      });
    }
  }
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
let walletRechargeSchemaReady = false;
let walletRechargeRoutesRegistered = false;
let walletRechargeMode = 'disabled';
let walletOfferRoutesRegistered = false;
let walletBackfillRoutesRegistered = false;
let identityProfileBackfillRoutesRegistered = false;
let liveSessionRoutesRegistered = false;
let liveSessionSchemaReady = false;
const walletBackfillToolsOpen = String(env.SMV_WALLET_BACKFILL_TOOLS_ENABLED || '').toLowerCase() === 'true';
const identityProfileBackfillToolsOpen = String(env.SMV_IDENTITY_PROFILE_BACKFILL_ENABLED || '').toLowerCase() === 'true';
const identityProfileBackfillPreviewOnly = String(env.SMV_IDENTITY_PROFILE_BACKFILL_PREVIEW_ONLY || 'true').toLowerCase() !== 'false';
const identityProfileD1AuthorizationOpen = String(env.SMV_IDENTITY_PROFILE_D1_AUTHORIZATION_ENABLED || '').toLowerCase() === 'true';
const liveSessionRoutesOpen = String(env.SMV_LIVE_SESSION_ROUTES_ENABLED || '').toLowerCase() === 'true';
let sharedWalletAdapter = null;
let walletIdentityService = null;
let firebaseIdentityService = null;
let d1IdentityAuthorizationService = null;
let d1IdentityAuthorizationReady = false;

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
// and cutover gates. D1 Identity/Profile authorization is separately opt-in and
// remains fail-closed until its full staging import is attested.
const requiresFirestoreAdmin = walletReadRouteGateOpen || walletBackfillToolsOpen ||
  identityProfileBackfillToolsOpen || liveSessionRoutesOpen;
if ((requiresFirestoreAdmin || identityProfileD1AuthorizationOpen) && env.DB && typeof env.DB.prepare === 'function') {
  let credentials = null;
  let projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const configuredProjectIds = String(env.FIREBASE_AUTH_PROJECT_IDS || projectId)
    .split(',').map(value => value.trim()).filter(Boolean);
  let firestoreAdmin = null;

  if (requiresFirestoreAdmin) {
    credentials = walletFirebaseServiceAccount();
    projectId = String(projectId || credentials.project_id || '').trim();
    if (!projectId || !configuredProjectIds.includes(projectId)) {
      throw new Error('Wallet identity project must be included in FIREBASE_AUTH_PROJECT_IDS.');
    }
    firestoreAdmin = createFirestoreAdminRestClient({
      projectId,
      allowedProjectIds: [projectId],
      credentials
    });
    firebaseIdentityService = createFirebaseIdentityService({
      verifyIdToken: verifyFirebaseIdToken,
      firestore: firestoreAdmin,
      projectIds: [projectId],
      adminUids: [env.ADMIN_UID || '', ...String(env.ADMIN_UIDS || '').split(',')],
      adminEmails: String(env.ADMIN_AUTH_EMAILS || '').split(',')
    });
    walletIdentityService = firebaseIdentityService;
    sharedWalletAdapter = createD1WalletAdapter({ db: env.DB });
    registerAdminAccessRoute({ app, identityService: walletIdentityService });
    registerAccountRoleRoute({ app, identityService: walletIdentityService, firestore: firestoreAdmin });
  }
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

  const checkWalletRechargeSchemaReady = async () => {
    if (!(await walletSchemaReady())) return false;
    try {
      const row = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('wallet-recharges').first();
      walletRechargeSchemaReady = row?.schema_version === '0005_legacy_wallet_backfill';
      return walletRechargeSchemaReady;
    } catch {
      walletRechargeSchemaReady = false;
      return false;
    }
  };
  const checkWalletBackfillSchemaReady = async () => {
    if (!(await walletSchemaReady())) return false;
    try {
      const row = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('wallet-recharges').first();
      return row?.schema_version === '0005_legacy_wallet_backfill';
    } catch {
      return false;
    }
  };

  const checkIdentityProfileBackfillSchemaReady = async () => {
    try {
      const row = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('identity-profiles').first();
      return row?.schema_version === '0008_identity_profile_backfill_audit';
    } catch {
      return false;
    }
  };

  const checkLiveSessionSchemaReady = async () => {
    if (!(await walletSchemaReady())) return false;
    try {
      const row = await env.DB.prepare(
        'SELECT schema_version FROM smv_domain_schema_meta WHERE schema_key = ? LIMIT 1'
      ).bind('live-sessions').first();
      liveSessionSchemaReady = row?.schema_version === '0006_d1_live_wallet_settlement';
      return liveSessionSchemaReady;
    } catch {
      liveSessionSchemaReady = false;
      return false;
    }
  };

  if (walletBackfillToolsOpen) {
    const backfillService = createWalletDomainBackfillService({
      db: env.DB,
      firestore: firestoreAdmin,
      payoutEncryptionKey: String(env.SMV_WALLET_PAYOUT_ENCRYPTION_KEY || ''),
      payoutKeyVersion: String(env.SMV_WALLET_PAYOUT_KEY_VERSION || 'v1'),
      sourceProjectId: projectId
    });
    registerWalletDomainBackfillRoutes({
      app,
      identityService: walletIdentityService,
      backfillService,
      firestore: firestoreAdmin,
      toolsEnabled: walletBackfillToolsOpen,
      environment: String(env.SMV_ENVIRONMENT || ''),
      sourceProjectId: projectId,
      quiesced: String(env.SMV_WALLET_DOMAIN_QUIESCED || '').toLowerCase() === 'true',
      cutoverComplete: String(env.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE || '').toLowerCase() === 'true',
      backendActive: String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || '').toLowerCase() === 'true',
      isReady: checkWalletBackfillSchemaReady
    });
    walletBackfillRoutesRegistered = true;
  }

  if (identityProfileBackfillToolsOpen) {
    const identityBackfillService = createIdentityProfileBackfillService({
      db: env.DB,
      firestore: firestoreAdmin,
      sourceProjectId: projectId,
      environment: String(env.SMV_ENVIRONMENT || ''),
      payoutEncryptionKey: String(env.SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY || ''),
      payoutKeyVersion: String(env.SMV_IDENTITY_PAYOUT_KEY_VERSION || 'v1')
    });
    registerIdentityProfileBackfillRoutes({
      app,
      identityService: firebaseIdentityService || walletIdentityService,
      backfillService: identityBackfillService,
      toolsEnabled: identityProfileBackfillToolsOpen,
      previewOnly: identityProfileBackfillPreviewOnly,
      environment: String(env.SMV_ENVIRONMENT || ''),
      sourceProjectId: projectId,
      cutoverComplete: String(env.SMV_IDENTITY_PROFILE_CUTOVER_COMPLETE || '').toLowerCase() === 'true',
      isReady: checkIdentityProfileBackfillSchemaReady
    });
    identityProfileBackfillRoutesRegistered = true;
  }

  if (liveSessionRoutesOpen) {
    const adminWalletUid = String(env.ADMIN_WALLET_UID || env.ADMIN_UID || '');
    const liveService = createD1LiveSessionService({
      db: env.DB,
      walletAdapter: sharedWalletAdapter,
      firestore: firestoreAdmin,
      adminWalletUid
    });
    const withdrawalService = createD1WithdrawalService({
      db: env.DB,
      firestore: firestoreAdmin
    });
    registerD1LiveSessionRoutes({
      app,
      identityService: walletIdentityService,
      liveService,
      withdrawalService,
      env,
      routesEnabled: liveSessionRoutesOpen,
      environment: String(env.SMV_ENVIRONMENT || ''),
      sourceProjectId: projectId,
      isReady: checkLiveSessionSchemaReady
    });
    liveSessionRoutesRegistered = true;
  }

  if (walletReadRouteGateOpen) {
    registerWalletOfferRoutes({
      app,
      identityService: walletIdentityService,
      walletAdapter: sharedWalletAdapter,
      isReady: checkWalletRechargeSchemaReady
    });
    walletOfferRoutesRegistered = true;
    registerWalletReadRoutes({
      app,
      identityService: walletIdentityService,
      walletAdapter: sharedWalletAdapter,
      adminWalletUid: String(env.ADMIN_WALLET_UID || env.ADMIN_UID || ''),
      isReady: walletSchemaReady
    });
    walletReadRoutesRegistered = true;
    const razorpayKeyId = String(env.RAZORPAY_KEY_ID || '').trim();
    const razorpayKeySecret = String(env.RAZORPAY_KEY_SECRET || '').trim();
    const razorpayWebhookSecret = String(env.RAZORPAY_WEBHOOK_SECRET || '');
    const razorpayPolicy = resolveRazorpayMode({
      environment: String(env.SMV_ENVIRONMENT || ''),
      keyId: razorpayKeyId,
      keySecret: razorpayKeySecret,
      webhookSecret: razorpayWebhookSecret,
      allowProductionLive:
        String(env.SMV_RAZORPAY_LIVE_MODE_ENABLED || '').toLowerCase() === 'true' &&
        String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || '').toLowerCase() === 'true',
      allowProductionTest:
        String(env.SMV_RAZORPAY_TEST_MODE_ENABLED || '').toLowerCase() === 'true'
    });
    walletRechargeMode = razorpayPolicy.mode;
    if (razorpayPolicy.enabled) {
      const razorpay = createRazorpayRestClient({ keyId: razorpayKeyId, keySecret: razorpayKeySecret });
      registerWalletRechargeRoutes({
        app,
        identityService: walletIdentityService,
        walletAdapter: sharedWalletAdapter,
        razorpay,
        razorpayKeyId,
        razorpayWebhookSecret,
        razorpayMode: razorpayPolicy.mode,
        isReady: checkWalletRechargeSchemaReady
      });
      walletRechargeRoutesRegistered = true;
    }
  }

  if (identityProfileD1AuthorizationOpen) {
    const identityProjectId = String(projectId ||
      (configuredProjectIds.length === 1 ? configuredProjectIds[0] : '')).trim();
    if (configuredProjectIds.length > 0) {
      const projectScopedAdminEntries = items => items.map(value => {
        const item = String(value || '').trim();
        if (!item) return '';
        return item.includes(':') ? item : identityProjectId + ':' + item;
      });
      const d1IdentityService = createD1IdentityService({
        verifyIdToken: verifyFirebaseIdToken,
        db: env.DB,
        projectIds: configuredProjectIds,
        adminUids: projectScopedAdminEntries([env.ADMIN_UID || '', ...String(env.ADMIN_UIDS || '').split(',')]),
        adminEmails: projectScopedAdminEntries(String(env.ADMIN_AUTH_EMAILS || '').split(','))
      });
      d1IdentityAuthorizationService = createD1IdentityAuthorizationGate({
        identityService: d1IdentityService,
        db: env.DB,
        enabled: true,
        environment: String(env.SMV_ENVIRONMENT || ''),
        sourceProjectId: identityProjectId,
        projectIds: configuredProjectIds
      });
      walletIdentityService = d1IdentityAuthorizationService;
    }
  }
}

app.get('/healthz', async (_req, res) => {
  const identityGate = d1IdentityAuthorizationService
    ? await d1IdentityAuthorizationService.readiness()
    : { enabled: identityProfileD1AuthorizationOpen, ready: false,
        reason: identityProfileD1AuthorizationOpen ? 'identity_runtime_unavailable' : 'disabled' };
  d1IdentityAuthorizationReady = identityGate.ready === true;
  return res.set(JSON_HEADERS).json({
    ok: true,
    service: 'smvastro-backend-api',
    runtime: 'cloudflare-workers-express-http-bridge',
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive: String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true',
    walletReadRoutesRegistered,
    walletRechargeRoutesRegistered,
    walletRechargeMode,
    walletOfferRoutesRegistered,
    liveSessionRoutesRegistered,
    liveSessionSchemaReady,
    identityProfileBackfillRoutesRegistered,
    identityProfileBackfillToolsEnabled: identityProfileBackfillToolsOpen,
    identityProfileBackfillPreviewOnly,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
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
    const identityGate = d1IdentityAuthorizationService
      ? await d1IdentityAuthorizationService.readiness()
      : { enabled: identityProfileD1AuthorizationOpen, ready: false,
          reason: identityProfileD1AuthorizationOpen ? 'identity_runtime_unavailable' : 'disabled' };
    d1IdentityAuthorizationReady = identityGate.ready === true;
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
      walletRechargeRoutesEnabled: walletRechargeRoutesRegistered && walletReadRouteGateOpen && walletRechargeSchemaReady,
      walletRechargeMode,
      walletOfferRoutesEnabled: walletOfferRoutesRegistered && walletReadRouteGateOpen && walletRechargeSchemaReady,
      walletBackfillRoutesRegistered,
      walletBackfillToolsEnabled: walletBackfillToolsOpen,
      identityProfileBackfillRoutesRegistered,
      identityProfileBackfillToolsEnabled: identityProfileBackfillToolsOpen,
      identityProfileBackfillPreviewOnly,
      identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
      identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
      identityProfileD1AuthorizationReason: identityGate.reason,
      walletBusinessRoutesEnabled: false,
      liveCallChatRoutesEnabled: liveSessionRoutesRegistered && liveSessionRoutesOpen && liveSessionSchemaReady
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
    walletRechargeRoutesEnabled: walletRechargeRoutesRegistered && walletReadRouteGateOpen && walletRechargeSchemaReady,
    walletRechargeMode,
    walletOfferRoutesEnabled: walletOfferRoutesRegistered && walletReadRouteGateOpen && walletRechargeSchemaReady,
    walletBackfillRoutesRegistered,
    walletBackfillToolsEnabled: walletBackfillToolsOpen,
    identityProfileBackfillRoutesRegistered,
    identityProfileBackfillToolsEnabled: identityProfileBackfillToolsOpen,
    identityProfileBackfillPreviewOnly,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
    walletBusinessRoutesEnabled: false,
    callChatRoutesEnabled: liveSessionRoutesRegistered && liveSessionRoutesOpen && liveSessionSchemaReady,
    liveSessionRoutesEnabled: liveSessionRoutesRegistered && liveSessionRoutesOpen && liveSessionSchemaReady,
    renderDependency: false,
    productionTrafficEnabled: false,
    nextGate: identityProfileBackfillRoutesRegistered ? 'identity-profile-staging-preview-and-reconciliation' : liveSessionRoutesRegistered ? 'live-call-chat-conformance-and-session-timer-tests' : walletBackfillRoutesRegistered ? 'enable-staging-live-session-routes' : 'enable-staging-wallet-backfill-tools'
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
