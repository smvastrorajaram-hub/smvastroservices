'use strict';

import express from 'express';
import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';
import { createFirebaseIdTokenVerifier } from '../../../shared/backend-platform/firebase-id-token.mjs';
import { resolveFirebaseAuthProjectIds, isD1IdentityAuthorizationAllowed } from '../../../shared/backend-platform/firebase-environment-policy.mjs';
import { createFirebaseFirestoreRestClient } from '../../../shared/backend-platform/firebase-firestore-rest.mjs';
import { resolveFirebaseAuthorization } from '../../../shared/backend-platform/firebase-authorization.mjs';
import { createFirestoreAdminRestClient } from '../../../shared/backend-platform/firestore-admin-rest.mjs';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createFirebaseIdentityService } from '../../../shared/backend-platform/firebase-identity-service.mjs';
import { createD1IdentityService } from '../../../shared/backend-platform/d1-identity-service.mjs';
import { createD1IdentityAuthorizationGate } from '../../../shared/backend-platform/d1-identity-authorization-gate.mjs';
import { registerWalletReadRoutes, isWalletReadRouteGateOpen } from './wallet-read-routes.mjs';
import { registerWalletRechargeRoutes } from './wallet-recharge-routes.mjs';
import { registerLegacyRazorpayRoutes } from './legacy-razorpay-routes.mjs';
import { registerPrivateChatRoutes } from './private-chat-routes.mjs';
import { resolveRazorpayMode } from '../../../shared/backend-platform/razorpay-mode-policy.mjs';
import { registerAccountRoleRoute, registerAdminAccessRoute, registerPublicRuntimeReadRoutes } from './core-read-routes.mjs';
import { registerWalletOfferRoutes } from './wallet-offer-routes.mjs';
import { createWalletDomainBackfillService } from '../../../shared/backend-platform/d1-wallet-domain-backfill.mjs';
import { registerWalletDomainBackfillRoutes } from './wallet-domain-backfill-routes.mjs';
import { createIdentityProfileBackfillService } from '../../../shared/backend-platform/d1-identity-profile-backfill.mjs';
import { registerIdentityProfileBackfillRoutes } from './identity-profile-backfill-routes.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';
import { createD1WithdrawalService } from '../../../shared/backend-platform/d1-live-withdrawal-service.mjs';
import { validatePayoutEncryptionConfiguration } from '../../../shared/backend-platform/payout-encryption.mjs';
import { registerD1LiveSessionRoutes } from './live-session-routes.mjs';
import { createRazorpayRestClient } from '../../../shared/backend-platform/razorpay-rest-adapter.mjs';
import { isLegacyBackendPath, LEGACY_BACKEND_ROUTE_INVENTORY } from '../../../shared/backend-platform/legacy-backend-route-inventory.mjs';
import { registerGeoNamesRoutes } from './geonames-location-routes.mjs';
import { registerPublicLegacyRoutes } from './public-legacy-routes.mjs';
import { registerRazorpayConnectivityRoute } from './razorpay-connectivity-routes.mjs';
import { createRazorpayProviderVerificationProbe } from './razorpay-connectivity-probe.mjs';
import { registerRootRuntimeRoute } from './root-runtime-route.mjs';
import { registerLegacyReadRoutes } from './legacy-read-routes.mjs';
import { registerLegacyDashboardReadRoutes } from './legacy-dashboard-read-routes.mjs';
import { registerLegacyQuizReadRoutes } from './legacy-quiz-read-routes.mjs';
import { registerLegacyBusinessRoutes } from './legacy-business-routes.mjs';
import { registerAdminAstrologerProfileRoutes } from './admin-astrologer-profile-routes.mjs';
import { registerLegacyQuizWriteRoutes } from './legacy-quiz-write-routes.mjs';
import { registerAstrologerAnswerEditRoute } from './astrologer-answer-edit-route.mjs';
import { registerAdminAstrologerCatalogRoutes } from './admin-astrologer-catalog-routes.mjs';
import { registerLegacyQuestionWorkflowRoutes } from './legacy-question-workflow-routes.mjs';
import { registerAppointmentBookingRoute } from './appointment-booking-route.mjs';
import { registerAdminDashboardRoutes } from './admin-dashboard-routes.mjs';
import { registerLegacyAstrologerApprovalRoutes } from './legacy-astrologer-approval-routes.mjs';
import { registerLegacyQuestionActionRoutes } from './legacy-question-action-routes.mjs';
import { createResendEmailClient } from '../../../shared/backend-platform/resend-email-adapter.mjs';
import { registerLegacyEmailRoutes } from './legacy-email-routes.mjs';
import { registerAstrologerSubmitAnswerRoute } from './astrologer-submit-answer-route.mjs';
import { registerLegacyAppointmentReadAndResponseRoutes } from './legacy-appointment-read-response-routes.mjs';
import { registerCustomerAnswerCreditRoute } from './customer-answer-credit-route.mjs';
import { createGoogleServiceAccountTokenProvider } from '../../../shared/backend-platform/google-service-account-token.mjs';
import { createFirebaseAuthAdminClient, createFcmSender, registerLegacyRouteParityGapRoutes } from './legacy-route-parity-gap-routes.mjs';
import { createFirebaseConnectivityProbe } from './firebase-connectivity-probe.mjs';
import { createBackendSchemaInspector, registerBackendReadinessRoute } from './backend-readiness.mjs';
import { resolveConfiguredAdminUids, resolveConfiguredAdminWalletUid } from './admin-identity-configuration.mjs';
import { isProductionFinancialTrafficRoutingEnabled } from './production-financial-traffic-readiness.mjs';

const app = express();
const inspectSchema = createBackendSchemaInspector({ db: env.DB, ttlMs: 30_000, errorTtlMs: 30_000 });
const verifyFirebaseIdToken = createFirebaseIdTokenVerifier();
const firebaseFirestore = createFirebaseFirestoreRestClient();
let firebaseConnectivityProbe = async () => false;
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
  if (req.path === '/wallet/recharge/webhook' || req.path === '/razorpay/webhook') return walletWebhookRawParser(req, res, next);
  return jsonBodyParser(req, res, next);
});

registerPublicRuntimeReadRoutes({ app, env });
registerRootRuntimeRoute({ app, env });
registerGeoNamesRoutes({ app, env });
registerPublicLegacyRoutes({ app, env });

app.get('/api/auth/session', async (req, res) => {
  const authorization = String(req.get('Authorization') || '');
  const match = /^Bearer ([A-Za-z0-9._~-]+)$/.exec(authorization);
  if (!match) {
    return res.status(401).set(JSON_HEADERS).json({ ok: false, code: 'AUTH_REQUIRED' });
  }

  const projectIds = resolveFirebaseAuthProjectIds(env);
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

  const projectIds = resolveFirebaseAuthProjectIds(env);

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
      adminUids: resolveConfiguredAdminUids(env),
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
const walletPayoutEncryptionConfigured = validatePayoutEncryptionConfiguration({
  payoutEncryptionKey: String(env.SMV_WALLET_PAYOUT_ENCRYPTION_KEY || ''),
  payoutKeyVersion: String(env.SMV_WALLET_PAYOUT_KEY_VERSION || 'v1')
});
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
let legacyRazorpayRoutesRegistered = false;
let walletReadRoutesRegistered = false;
let walletDomainSchemaReady = false;
let walletRechargeSchemaReady = false;
let walletRechargeRoutesRegistered = false;
let walletRechargeMode = razorpayPolicy.mode;
let sharedRazorpayClient = null;
let getRazorpayProviderVerification = async () => ({
  connected: false,
  connectionVerified: false,
  mode: String(razorpayPolicy.mode || 'disabled'),
  operation: 'GET /orders?count=1',
  checkedAt: null,
  ordersVisible: null,
  code: 'RAZORPAY_CREDENTIALS_NOT_CONFIGURED'
});
let walletOfferRoutesRegistered = false;
let walletBackfillRoutesRegistered = false;
let identityProfileBackfillRoutesRegistered = false;
let liveSessionRoutesRegistered = false;
let liveSessionSchemaReady = false;
const walletBackfillToolsOpen = String(env.SMV_WALLET_BACKFILL_TOOLS_ENABLED || '').toLowerCase() === 'true';
const identityProfileBackfillToolsOpen = String(env.SMV_IDENTITY_PROFILE_BACKFILL_ENABLED || '').toLowerCase() === 'true';
const identityProfileBackfillPreviewOnly = String(env.SMV_IDENTITY_PROFILE_BACKFILL_PREVIEW_ONLY || 'true').toLowerCase() !== 'false';
const identityProfileD1AuthorizationOpen = isD1IdentityAuthorizationAllowed(env);
const configuredAdminWalletUid = resolveConfiguredAdminWalletUid(env);
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
  identityProfileBackfillToolsOpen || liveSessionRoutesOpen || razorpayPolicy.enabled;
if ((requiresFirestoreAdmin || identityProfileD1AuthorizationOpen) && env.DB && typeof env.DB.prepare === 'function') {
  let credentials = null;
  let projectId = String(env.FIREBASE_PROJECT_ID || '').trim();
  const configuredProjectIds = resolveFirebaseAuthProjectIds(env);
  let firestoreAdmin = null;
  let gapLiveService = null;

  if (requiresFirestoreAdmin) {
    credentials = walletFirebaseServiceAccount();
    projectId = String(projectId || credentials.project_id || '').trim();
    if (!projectId || !configuredProjectIds.includes(projectId)) {
      throw new Error('Wallet identity project must be included in FIREBASE_AUTH_PROJECT_IDS.');
    }
    if (String(credentials.project_id || '').trim() !== projectId) {
      throw new Error('Firebase service-account project must match the selected Firebase identity project.');
    }
    firestoreAdmin = createFirestoreAdminRestClient({
      projectId,
      allowedProjectIds: [projectId],
      credentials
    });
    firebaseConnectivityProbe = createFirebaseConnectivityProbe({
      firestore: firestoreAdmin,
      documentPath: 'smv_runtime/readiness',
      ttlMs: 30000
    });
    firebaseIdentityService = createFirebaseIdentityService({
      verifyIdToken: verifyFirebaseIdToken,
      firestore: firestoreAdmin,
      projectIds: [projectId],
      adminUids: resolveConfiguredAdminUids(env),
      adminEmails: String(env.ADMIN_AUTH_EMAILS || '').split(',')
    });
    walletIdentityService = firebaseIdentityService;
    sharedWalletAdapter = createD1WalletAdapter({ db: env.DB });
    if (razorpayPolicy.enabled) {
      sharedRazorpayClient = createRazorpayRestClient({ keyId: razorpayKeyId, keySecret: razorpayKeySecret });
      getRazorpayProviderVerification = createRazorpayProviderVerificationProbe({
        razorpay: sharedRazorpayClient,
        mode: razorpayPolicy.mode,
        credentialsConfigured: true
      });
    }
    registerAdminAccessRoute({ app, identityService: walletIdentityService });
    registerAccountRoleRoute({ app, identityService: walletIdentityService, firestore: firestoreAdmin });
    registerLegacyReadRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService, androidPackageName: String(env.SMV_ANDROID_PACKAGE || 'in.smvastroservices.smvastro') });
    registerLegacyQuizReadRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    gapLiveService = env.DB && sharedWalletAdapter
      ? createD1LiveSessionService({
          db: env.DB,
          walletAdapter: sharedWalletAdapter,
          firestore: firestoreAdmin,
          adminWalletUid: configuredAdminWalletUid
        })
      : null;
    registerLegacyDashboardReadRoutes({
      app, firestore: firestoreAdmin, identityService: walletIdentityService,
      liveService: liveSessionRoutesOpen ? gapLiveService : null,
      isLiveReady: async () => {
        const schema = await inspectSchema();
        return schema.checks.liveSessionSchema === true && schema.checks.walletSecuritySchema === true &&
          schema.checks.liveSessionQueryIndexes === true;
      }
    });
    registerLegacyBusinessRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService, liveService: gapLiveService });
    registerAdminAstrologerProfileRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerLegacyQuizWriteRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerAstrologerAnswerEditRoute({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerAdminAstrologerCatalogRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerLegacyQuestionWorkflowRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerAppointmentBookingRoute({ app, firestore: firestoreAdmin, identityService: walletIdentityService, reminderCoordinator: env.LIVE_SESSION_COORDINATOR || null });
    registerAdminDashboardRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerLegacyAstrologerApprovalRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService, db: env.DB, projectId });
    registerLegacyQuestionActionRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
    registerLegacyAppointmentReadAndResponseRoutes({ app, firestore: firestoreAdmin, identityService: walletIdentityService, reminderCoordinator: env.LIVE_SESSION_COORDINATOR || null });
    const resendEmailClient = env.RESEND_API_KEY && env.RESEND_FROM
      ? createResendEmailClient({
          apiKey: String(env.RESEND_API_KEY),
          from: String(env.RESEND_FROM)
        })
      : null;
    registerLegacyEmailRoutes({
      app,
      firestore: firestoreAdmin,
      identityService: walletIdentityService,
      emailClient: resendEmailClient,
      adminEmail: String(env.ADMIN_EMAIL || '')
    });

    registerAstrologerSubmitAnswerRoute({
      app, firestore: firestoreAdmin, identityService: walletIdentityService,
      emailClient: resendEmailClient, adminEmail: String(env.ADMIN_EMAIL || ''),
      siteUrl: String(env.PUBLIC_SITE_URL || 'https://smvastroservices.in')
    });    registerCustomerAnswerCreditRoute({ app, firestore: firestoreAdmin, identityService: walletIdentityService });
  }
  const walletSchemaReady = async () => {
    try {
      const schema = await inspectSchema();
      const ready = schema.checks.walletSchema === true &&
        schema.checks.bonusCreditWalletSchema === true;
      walletDomainSchemaReady = ready;
      return ready;
    } catch {
      walletDomainSchemaReady = false;
      return false;
    }
  };

  const checkWalletRechargeSchemaReady = async () => {
    const schema = await inspectSchema();
    walletRechargeSchemaReady = schema.checks.walletRechargeSchema === true;
    return walletRechargeSchemaReady;
  };
  const checkWalletBackfillSchemaReady = async () => {
    const schema = await inspectSchema();
    return schema.checks.walletRechargeSchema === true;
  };

  const checkIdentityProfileBackfillSchemaReady = async () => {
    const schema = await inspectSchema();
    return schema.checks.identityProfileSchema === true;
  };

  const checkLiveSessionSchemaReady = async () => {
    const schema = await inspectSchema();
    liveSessionSchemaReady = schema.checks.liveSessionSchema === true &&
      schema.checks.walletSecuritySchema === true && schema.checks.liveSessionQueryIndexes === true;
    return liveSessionSchemaReady;
  };

  // Register the remaining active legacy API contracts only after the staging
  // Firebase Admin/Firestore transport and D1 repositories have been constructed.
  // Credentials are used only to mint short-lived scoped OAuth tokens; no key
  // material is stored in source or returned to callers.
  const firebaseAdminOAuth = createGoogleServiceAccountTokenProvider({
    credentials,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase.messaging'
  });
  const firebaseAuthAdmin = createFirebaseAuthAdminClient({
    projectId,
    tokenProvider: firebaseAdminOAuth
  });
  const fcmSender = createFcmSender({
    projectId,
    tokenProvider: firebaseAdminOAuth
  });
  registerLegacyRouteParityGapRoutes({
    app,
    firestore: firestoreAdmin,
    identityService: walletIdentityService,
    projectId,
    authAdmin: firebaseAuthAdmin,
    walletAdapter: sharedWalletAdapter,
    db: env.DB,
    isWalletReady: walletSchemaReady,
    isWalletBackfillReady: checkWalletBackfillSchemaReady,
    fcmSender,
    env,
    apkReleaseService: env.APK_RELEASE_WORKER || null,
    rawUploadParser: express.raw({
      type: 'application/vnd.android.package-archive',
      limit: 100 * 1024 * 1024
    }),
    liveService: gapLiveService,
    isLiveReady: checkLiveSessionSchemaReady,
    contentMirrorFirestore: null
  });

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
    const adminWalletUid = configuredAdminWalletUid;
    const liveService = createD1LiveSessionService({
      db: env.DB,
      walletAdapter: sharedWalletAdapter,
      firestore: firestoreAdmin,
      adminWalletUid
    });
    const withdrawalService = createD1WithdrawalService({
      db: env.DB,
      firestore: firestoreAdmin,
      payoutEncryptionKey: String(env.SMV_WALLET_PAYOUT_ENCRYPTION_KEY || ''),
      payoutKeyVersion: String(env.SMV_WALLET_PAYOUT_KEY_VERSION || 'v1'),
      sourceProjectId: projectId
    });
    registerD1LiveSessionRoutes({
      app,
      identityService: walletIdentityService,
      liveService,
      withdrawalService,
      firestore: firestoreAdmin,
      fcmSender,
      env,
      routesEnabled: liveSessionRoutesOpen,
      environment: String(env.SMV_ENVIRONMENT || ''),
      sourceProjectId: projectId,
      isReady: checkLiveSessionSchemaReady
    });
    liveSessionRoutesRegistered = true;
  }

  if (razorpayPolicy.enabled && sharedRazorpayClient && firestoreAdmin && walletIdentityService) {
    registerRazorpayConnectivityRoute({
      app,
      identityService: walletIdentityService,
      razorpay: sharedRazorpayClient,
      mode: razorpayPolicy.mode,
      keyId: razorpayKeyId,
      credentialsConfigured: true,
      getVerification: getRazorpayProviderVerification
    });
    const legacyRazorpayRoutes = registerLegacyRazorpayRoutes({
      app,
      identityService: walletIdentityService,
      firestore: firestoreAdmin,
      walletAdapter: sharedWalletAdapter,
      razorpay: sharedRazorpayClient,
      razorpayKeyId,
      razorpayKeySecretPresent: !!razorpayKeySecret,
      razorpayWebhookSecret,
      razorpayMode: razorpayPolicy.mode,
      // Retired Public Questions and legacy Private Consultation entry points
      // remain closed. The new Private Chat service is independently registered.
      enablePrivateConsultation: false,
      allowNewQuestions: false,
      isD1Ready: checkWalletRechargeSchemaReady
    });
    registerPrivateChatRoutes({
      app,
      identityService: walletIdentityService,
      firestore: firestoreAdmin,
      razorpay: sharedRazorpayClient,
      razorpayKeyId,
      paymentDetails: legacyRazorpayRoutes.paymentDetails,
      recordQuestionPayment: legacyRazorpayRoutes.recordQuestionPayment,
      refundPrivateChatQuestion: legacyRazorpayRoutes.refundPrivateChatQuestion
    });
    legacyRazorpayRoutesRegistered = true;
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
      adminWalletUid: configuredAdminWalletUid,
      isReady: walletSchemaReady
    });
    walletReadRoutesRegistered = true;
    if (razorpayPolicy.enabled && sharedRazorpayClient) {
      registerWalletRechargeRoutes({
        app,
        identityService: walletIdentityService,
        walletAdapter: sharedWalletAdapter,
        razorpay: sharedRazorpayClient,
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
        adminUids: projectScopedAdminEntries(resolveConfiguredAdminUids(env)),
        adminEmails: projectScopedAdminEntries(String(env.ADMIN_AUTH_EMAILS || '').split(','))
      });
      d1IdentityAuthorizationService = createD1IdentityAuthorizationGate({
        identityService: d1IdentityService,
        db: env.DB,
        enabled: true,
        environment: String(env.SMV_ENVIRONMENT || ''),
        sourceProjectId: identityProjectId,
        projectIds: configuredProjectIds,
        productionApproved: String(env.SMV_IDENTITY_PROFILE_PRODUCTION_AUTHORIZATION_APPROVED || '').trim().toLowerCase() === 'true',
        freshStartApproved: String(env.SMV_IDENTITY_PROFILE_FRESH_START_APPROVED || '').trim().toLowerCase() === 'true'
      });
      walletIdentityService = d1IdentityAuthorizationService;
    }
  }
}

app.get('/healthz', async (_req, res) => {
  const schema = await inspectSchema();
  walletDomainSchemaReady = schema.checks.walletSchema;
  walletRechargeSchemaReady = schema.checks.walletRechargeSchema;
  liveSessionSchemaReady = schema.checks.liveSessionSchema && schema.checks.walletSecuritySchema && schema.checks.liveSessionQueryIndexes === true;
  const firebaseConnected = await firebaseConnectivityProbe();
  const razorpayVerification = await getRazorpayProviderVerification();
  const identityGate = d1IdentityAuthorizationService
    ? await d1IdentityAuthorizationService.readiness()
    : { enabled: identityProfileD1AuthorizationOpen, ready: false,
        reason: identityProfileD1AuthorizationOpen ? 'identity_runtime_unavailable' : 'disabled' };
  d1IdentityAuthorizationReady = identityGate.ready === true;
  const backendActive = String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true';
  const walletReadRoutesEnabled = walletReadRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletSchema;
  const walletRechargeRoutesEnabled = walletRechargeRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletRechargeSchema;
  const walletOfferRoutesEnabled = walletOfferRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletRechargeSchema;
  const liveCallChatRoutesEnabled = liveSessionRoutesRegistered && liveSessionRoutesOpen &&
    schema.checks.liveSessionSchema && schema.checks.walletSecuritySchema && schema.checks.liveSessionQueryIndexes === true;
  const razorpayCredentialsConfigured = razorpayPolicy.enabled && !!razorpayKeyId && !!razorpayKeySecret && !!razorpayWebhookSecret;
  const productionFinancialTrafficRoutingEnabled = isProductionFinancialTrafficRoutingEnabled({
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive,
    schemaReady: schema.ready,
    firebaseConnected,
    walletReadRoutesEnabled,
    walletRechargeRoutesEnabled,
    walletRechargeMode,
    walletOfferRoutesEnabled,
    liveCallChatRoutesEnabled,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
    razorpayMode: razorpayPolicy.mode,
    razorpayCredentialsConfigured,
    razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true
  });
  return res.set(JSON_HEADERS).json({
    ok: true,
    service: 'smvastro-backend-api',
    runtime: 'cloudflare-workers-express-http-bridge',
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    schemaReady: schema.ready,
    d1Binding: schema.d1Binding,
    schemaQuerySucceeded: schema.querySucceeded,
    bonusCreditSchemaQuerySucceeded: schema.bonusCreditSchemaQuerySucceeded,
    schemaMigrations: schema.schemaMigrations,
    backendActive,
    firebaseConnected,
    firestoreConnected: firebaseConnected,
    razorpayConnected: razorpayVerification.connected === true,
    razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true,
    razorpayProviderConnectionCheckedAt: razorpayVerification.checkedAt || null,
    walletReadRoutesRegistered,
    walletReadRoutesEnabled,
    walletRechargeRoutesRegistered,
    walletRechargeRoutesEnabled,
    walletRechargeMode,
    walletOfferRoutesRegistered,
    walletOfferRoutesEnabled,
    liveSessionRoutesRegistered,
    liveCallChatRoutesEnabled,
    liveSessionSchemaReady,
    liveSessionQueryIndexesReady: schema.checks.liveSessionQueryIndexes === true,
    walletPayoutEncryptionConfigured,
    razorpayMode: razorpayPolicy.mode,
    razorpayCredentialsConfigured,
    identityProfileBackfillRoutesRegistered,
    identityProfileBackfillToolsEnabled: identityProfileBackfillToolsOpen,
    identityProfileBackfillPreviewOnly,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
    productionTrafficEnabled: false,
    productionFinancialTrafficRoutingEnabled
  });
});

registerBackendReadinessRoute({
  app,
  db: env.DB,
  inspectSchema,
  firebaseConnectivityProbe,
  getRazorpayVerification: () => getRazorpayProviderVerification(),
  getRuntimeState: () => ({
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive: String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true',
    razorpayPolicy,
    razorpayKeyId,
    razorpayKeySecret,
    razorpayWebhookSecret,
    legacyRazorpayRoutesRegistered,
    walletReadRoutesRegistered,
    walletRechargeRoutesRegistered,
    walletRechargeMode,
    walletOfferRoutesRegistered,
    walletBackfillRoutesRegistered,
    walletBackfillToolsOpen,
    identityProfileBackfillRoutesRegistered,
    identityProfileBackfillToolsOpen,
    identityProfileBackfillPreviewOnly,
    identityProfileD1AuthorizationOpen,
    walletReadRouteGateOpen,
    liveSessionRoutesRegistered,
    liveSessionRoutesOpen,
    walletPayoutEncryptionConfigured
  }),
  getIdentityGate: async () => {
    const identityGate = d1IdentityAuthorizationService
      ? await d1IdentityAuthorizationService.readiness()
      : { enabled: identityProfileD1AuthorizationOpen, ready: false,
          reason: identityProfileD1AuthorizationOpen ? 'identity_runtime_unavailable' : 'disabled' };
    d1IdentityAuthorizationReady = identityGate.ready === true;
    return identityGate;
  }
});

app.get('/api/backend/migration-status', async (_req, res) => {
  const schema = await inspectSchema();
  walletDomainSchemaReady = schema.checks.walletSchema;
  walletRechargeSchemaReady = schema.checks.walletRechargeSchema;
  liveSessionSchemaReady = schema.checks.liveSessionSchema && schema.checks.walletSecuritySchema && schema.checks.liveSessionQueryIndexes === true;
  const firebaseConnected = await firebaseConnectivityProbe();
  const razorpayVerification = await getRazorpayProviderVerification();
  const identityGate = d1IdentityAuthorizationService
    ? await d1IdentityAuthorizationService.readiness()
    : { enabled: identityProfileD1AuthorizationOpen, ready: false,
        reason: identityProfileD1AuthorizationOpen ? 'identity_runtime_unavailable' : 'disabled' };
  d1IdentityAuthorizationReady = identityGate.ready === true;
  const backendActive = String(env.SMV_BACKEND_CLOUDFLARE_ACTIVE || 'false') === 'true';
  const walletReadRoutesEnabled = walletReadRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletSchema;
  const walletRechargeRoutesEnabled = walletRechargeRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletRechargeSchema;
  const walletOfferRoutesEnabled = walletOfferRoutesRegistered && walletReadRouteGateOpen && schema.checks.walletRechargeSchema;
  const liveSessionRoutesEnabled = liveSessionRoutesRegistered && liveSessionRoutesOpen &&
    schema.checks.liveSessionSchema && schema.checks.walletSecuritySchema &&
    schema.checks.liveSessionQueryIndexes;
  const razorpayCredentialsConfigured = razorpayPolicy.enabled && !!razorpayKeyId && !!razorpayKeySecret && !!razorpayWebhookSecret;
  const productionFinancialTrafficRoutingEnabled = isProductionFinancialTrafficRoutingEnabled({
    environment: String(env.SMV_ENVIRONMENT || 'unknown'),
    backendActive,
    schemaReady: schema.ready,
    firebaseConnected,
    walletReadRoutesEnabled,
    walletRechargeRoutesEnabled,
    walletRechargeMode,
    walletOfferRoutesEnabled,
    liveCallChatRoutesEnabled: liveSessionRoutesEnabled,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
    razorpayMode: razorpayPolicy.mode,
    razorpayCredentialsConfigured,
    razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true
  });
  return res.set(JSON_HEADERS).json({
    ok: true,
    phase: 'cloudflare-runtime-foundation',
    schemaReady: schema.ready,
    d1Binding: schema.d1Binding,
    schemaQuerySucceeded: schema.querySucceeded,
    bonusCreditSchemaQuerySucceeded: schema.bonusCreditSchemaQuerySucceeded,
    schemaVersion: schema.schemaVersion,
    sharedDomainSchemaVersion: schema.sharedDomainSchemaVersion,
    migrationStatus: schema.migrationStatus,
    schemaMigrations: schema.schemaMigrations,
    legacyRouteInventory: LEGACY_BACKEND_ROUTE_INVENTORY.length,
    legacyServerLoaded: false,
    firebaseIdTokenVerification: true,
    firebaseUserScopedFirestoreRestAdapter: true,
    firebaseAdminUserManagementConnected: false,
    firebaseConnected,
    firestoreConnected: firebaseConnected,
    razorpayConnected: razorpayVerification.connected === true,
    razorpayCredentialsConfigured,
    razorpayProviderConnectionVerified: razorpayVerification.connectionVerified === true,
    razorpayProviderConnectionCheckedAt: razorpayVerification.checkedAt || null,
    razorpayMode: razorpayPolicy.mode,
    razorpayPolicyReason: razorpayPolicy.reason,
    legacyRazorpayRoutesRegistered,
    legacyPrivateConsultationRoutesEnabled: false,
    walletReadRoutesEnabled,
    walletRechargeRoutesEnabled,
    walletRechargeMode,
    walletOfferRoutesEnabled,
    walletBackfillRoutesRegistered,
    walletBackfillToolsEnabled: walletBackfillToolsOpen,
    identityProfileBackfillRoutesRegistered,
    identityProfileBackfillToolsEnabled: identityProfileBackfillToolsOpen,
    identityProfileBackfillPreviewOnly,
    identityProfileD1AuthorizationEnabled: identityProfileD1AuthorizationOpen,
    identityProfileD1AuthorizationReady: d1IdentityAuthorizationReady,
    walletBusinessRoutesEnabled: false,
    callChatRoutesEnabled: liveSessionRoutesEnabled,
    liveSessionRoutesEnabled,
    liveSessionQueryIndexesReady: schema.checks.liveSessionQueryIndexes === true,
    walletPayoutEncryptionConfigured,
    renderDependency: false,
    productionTrafficEnabled: false,
    productionFinancialTrafficRoutingEnabled,
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
