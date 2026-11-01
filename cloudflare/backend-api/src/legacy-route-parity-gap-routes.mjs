import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

const IDENTITY_TOOLKIT_ROOT = 'https://identitytoolkit.googleapis.com/v1';
const FCM_ROOT = 'https://fcm.googleapis.com/v1/projects/';
const PHONE_VERIFICATION_MODE_DEFAULT = 'email_unique';
const MAX_SESSION_MINUTES = 1440;

function routeError(code, message, status = 400) {
  return Object.assign(new Error(message || code), { code, httpStatus: status });
}
function noStore(res) { return res.set('Cache-Control', 'no-store'); }
function replyError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return noStore(res).status(status).json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'LEGACY_ROUTE_FAILED')
  });
}
function safeUid(value) {
  const uid = String(value || '').trim();
  if (!/^[A-Za-z0-9:_-]{1,160}$/.test(uid)) throw routeError('AUTH_UID_INVALID', 'Authenticated account ID is invalid.', 401);
  return uid;
}
function safeDocId(value, max = 200) {
  const id = String(value || '').trim();
  if (!id || id.length > max || id.includes('/') || id === '.' || id === '..') return '';
  return id;
}
function randomHex(bytes = 16) {
  const data = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(data);
  return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
}
function randomCompactId(prefix) {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return String(prefix) + '-' + String(10000 + (values[0] % 90000));
}
async function sha256Hex(value) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function normalizeLoginId(value, expectedType = '') {
  const raw = String(value || '').trim();
  const type = String(expectedType || '').toLowerCase();
  const current = /^(smvcr|smvar)-\d{5}$/i.exec(raw);
  if (current) {
    const actual = current[1].toLowerCase() === 'smvar' ? 'ast' : 'cus';
    return !type || actual === type ? raw.toLowerCase() : '';
  }
  const compact = /^smv-(cus|ast)-\d{4,5}$/i.exec(raw);
  if (compact && (!type || compact[1].toLowerCase() === type)) return raw.toLowerCase();
  const random = /^smv-(cus|ast)-[2-9a-hj-km-np-z]{8,32}$/i.exec(raw);
  if (random && (!type || random[1].toLowerCase() === type)) return raw.toLowerCase();
  const dated = /^SMV-(CUS|AST)-\d{8}-\d{2,}$/i.exec(raw);
  if (dated && (!type || dated[1].toLowerCase() === type)) return raw.toUpperCase();
  return '';
}
function normalizeRegistrationPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1);
  else if (digits.length === 10) digits = '91' + digits;
  if (digits.length < 8 || digits.length > 15) return null;
  return { digits, e164: '+' + digits, hash: '' };
}
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '')) && String(value).length <= 254;
}
function parseLanguages(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(/[,;|]/);
  return [...new Set(raw.map(item => String(item || '').trim().replace(/\s+/g, ' ')).filter(Boolean))];
}
function normalizePhoneMode(env) {
  const configured = String(env?.PHONE_VERIFICATION_MODE || PHONE_VERIFICATION_MODE_DEFAULT).trim().toLowerCase();
  if (configured !== 'whatsapp') return PHONE_VERIFICATION_MODE_DEFAULT;
  return String(env?.WHATSAPP_OTP_PROVIDER || '').trim() ? 'whatsapp' : PHONE_VERIFICATION_MODE_DEFAULT;
}
function timestampMillis(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value.toMillis === 'function') return Number(value.toMillis()) || 0;
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
function newestActivity(item = {}) {
  return Math.max(
    timestampMillis(item.updatedAt), timestampMillis(item.createdAt),
    timestampMillis(item.paidAt), timestampMillis(item.requestedAt)
  );
}
function publicAstrologerView(id, value = {}) {
  const rawLanguages = value.languages ?? value.spokenLanguages ?? value.language ?? [];
  const languages = Array.isArray(rawLanguages)
    ? rawLanguages.map(item => String(item || '').trim()).filter(Boolean)
    : String(rawLanguages || '').split(/[,;|]/).map(item => item.trim()).filter(Boolean);
  const callRate = [value.callPricePerMinute, value.pricePerMinute, value.callRatePerMinute]
    .map(Number).find(rate => Number.isFinite(rate) && rate > 0);
  const chatRate = [value.chatPricePerMinute, value.liveChatPricePerMinute, value.chatRatePerMinute]
    .map(Number).find(rate => Number.isFinite(rate) && rate > 0);
  const active = Number.isSafeInteger(Number(value.activeSessionCount)) && Number(value.activeSessionCount) > 0
    ? Number(value.activeSessionCount) : 0;
  const callEnabled = value.liveCallEnabled === true;
  const chatEnabled = value.liveChatEnabled === true;
  const rawStatus = String(value.availabilityStatus || value.onlineStatus || 'offline').toLowerCase();
  const availability = active > 0 ? 'busy' :
    (callEnabled || chatEnabled) && ['online', 'busy', 'offline'].includes(rawStatus) ? rawStatus : 'offline';
  return {
    id,
    name: String(value.name || 'Astrologer'),
    expertise: String(value.expertise || value.specialization || 'Astrology'),
    specialization: String(value.specialization || value.expertise || 'Astrology'),
    experience: Number(value.experience || 0),
    profileDescription: String(value.profileDescription || value.bio || value.about || ''),
    bio: String(value.profileDescription || value.bio || value.about || ''),
    about: String(value.profileDescription || value.about || value.bio || ''),
    photoData: String(value.photoData || value.photoURL || value.photoUrl || ''),
    rating: value.rating || value.averageRating || 'New',
    publicId: String(value.publicId || ''),
    languages,
    availabilityStatus: availability,
    liveCallEnabled: callEnabled,
    liveChatEnabled: chatEnabled,
    callPricePerMinute: callRate ?? null,
    chatPricePerMinute: chatRate ?? null,
    chatPrice: Number(value.pricePerQuestion || 0),
    status: String(value.status || '')
  };
}
function emailSafeUser(account) {
  return {
    uid: String(account?.localId || account?.uid || ''),
    email: String(account?.email || ''),
    emailVerified: account?.emailVerified === true,
    disabled: account?.disabled === true
  };
}
function bodyLimitString(value, max) {
  const result = String(value ?? '').trim();
  return result.length <= max ? result : '';
}
function cleanContentPatch(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw routeError('CONTENT_PAYLOAD_INVALID', 'A valid content payload is required.', 400);
  }
  const allowed = [
    'kind', 'title', 'summary', 'language', 'bodyUrl', 'bodyPublicId', 'bodySize',
    'coverUrl', 'coverPath', 'published', 'description', 'mediaType', 'url',
    'storagePath', 'cloudinaryPublicId', 'size', 'mimeType', 'fileName'
  ];
  const patch = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) patch[key] = input[key];
  }
  if (patch.language !== undefined && patch.language !== 'en') {
    throw routeError('CONTENT_LANGUAGE_UNSUPPORTED', 'Only English content can be managed here.', 400);
  }
  if (patch.kind !== undefined && !['blog', 'media'].includes(String(patch.kind))) {
    throw routeError('CONTENT_KIND_UNSUPPORTED', 'Unsupported content type.', 400);
  }
  if (patch.title !== undefined &&
      (typeof patch.title !== 'string' || !patch.title.trim() || patch.title.length > 240)) {
    throw routeError('CONTENT_TITLE_INVALID', 'Content title is required and must be 240 characters or less.', 400);
  }
  if (patch.published !== undefined && typeof patch.published !== 'boolean') {
    throw routeError('CONTENT_PUBLISHED_INVALID', 'Published must be true or false.', 400);
  }
  for (const key of ['summary', 'description', 'bodyUrl', 'bodyPublicId', 'coverUrl', 'coverPath',
    'mediaType', 'url', 'storagePath', 'cloudinaryPublicId', 'mimeType', 'fileName']) {
    if (patch[key] !== undefined && (typeof patch[key] !== 'string' || patch[key].length > 4000)) {
      throw routeError('CONTENT_FIELD_INVALID', 'A content field is invalid or too long.', 400);
    }
  }
  for (const key of ['bodySize', 'size']) {
    if (patch[key] !== undefined && (!Number.isSafeInteger(Number(patch[key])) || Number(patch[key]) < 0)) {
      throw routeError('CONTENT_SIZE_INVALID', 'Content size must be a non-negative whole number.', 400);
    }
  }
  return patch;
}
function sendAuthError(res, error) {
  const status = Number(error?.httpStatus) || 401;
  return noStore(res).status(status).json({
    success: false,
    error: status >= 500 ? 'Account permissions are temporarily unavailable.' : String(error?.message || 'Login is required.'),
    code: String(error?.code || 'AUTH_REQUIRED')
  });
}
function roleError(user, allowed) {
  if (user?.isAdmin === true && allowed.includes('admin')) return null;
  const role = String(user?.role || '').toLowerCase();
  return allowed.includes(role) ? null : routeError('ROLE_FORBIDDEN', 'This action is not allowed for your SMV ASTRO role.', 403);
}

export function createFirebaseAuthAdminClient({ projectId, tokenProvider, fetchImpl = globalThis.fetch } = {}) {
  const project = String(projectId || '').trim();
  if (!project || !/^[a-z0-9][a-z0-9-]{4,29}$/.test(project) ||
      !tokenProvider || typeof tokenProvider.getAccessToken !== 'function' ||
      typeof fetchImpl !== 'function') {
    throw new TypeError('Firebase Auth Admin lookup requires a project ID and Google OAuth token provider.');
  }
  async function lookupByUid(uid) {
    const targetUid = safeUid(uid);
    const token = await tokenProvider.getAccessToken();
    let response;
    try {
      response = await fetchImpl(IDENTITY_TOOLKIT_ROOT + '/projects/' + encodeURIComponent(project) + '/accounts:lookup', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ localId: [targetUid] }),
        signal: AbortSignal.timeout(10000)
      });
    } catch {
      throw routeError('FIREBASE_AUTH_ADMIN_UNAVAILABLE', 'Firebase Auth Admin is temporarily unavailable.', 503);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw routeError(
        response.status === 403 ? 'FIREBASE_AUTH_ADMIN_FORBIDDEN' : 'FIREBASE_AUTH_ADMIN_LOOKUP_FAILED',
        'Firebase Auth Admin account lookup failed.',
        response.status >= 500 ? 503 : response.status === 403 ? 503 : 502
      );
    }
    const row = Array.isArray(payload.users) ? payload.users.find(item => String(item.localId || '') === targetUid) : null;
    return row ? emailSafeUser(row) : null;
  }
  return Object.freeze({ lookupByUid });
}

export function createFcmSender({ projectId, tokenProvider, fetchImpl = globalThis.fetch } = {}) {
  const project = String(projectId || '').trim();
  if (!project || !tokenProvider || typeof tokenProvider.getAccessToken !== 'function' ||
      typeof fetchImpl !== 'function') {
    return null;
  }
  return Object.freeze({
    async send(token, payload = {}) {
      const deviceToken = String(token || '').trim();
      if (deviceToken.length < 30 || deviceToken.length > 8192 || /\s/.test(deviceToken)) {
        throw routeError('FCM_TOKEN_INVALID', 'The registered background-alert token is invalid.', 400);
      }
      const accessToken = await tokenProvider.getAccessToken();
      let response;
      try {
        response = await fetchImpl(FCM_ROOT + encodeURIComponent(project) + '/messages:send', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            message: {
              token: deviceToken,
              notification: {
                title: String(payload.title || 'SMV ASTRO').slice(0, 100),
                body: String(payload.body || '').slice(0, 300)
              },
              data: Object.fromEntries(Object.entries(payload.data || {}).map(([key, value]) =>
                [String(key).slice(0, 80), String(value).slice(0, 500)]))
            }
          }),
          signal: AbortSignal.timeout(12000)
        });
      } catch {
        throw routeError('FCM_PROVIDER_UNAVAILABLE', 'The background-alert provider is unavailable.', 503);
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.name) {
        const status = response.status === 404 || response.status === 400 ? 503 : response.status >= 500 ? 503 : 502;
        throw routeError('FCM_SEND_FAILED', 'The push service did not accept the test alert.', status);
      }
      return result.name;
    }
  });
}

/**
 * Restores only active legacy route contracts. All data mutations use privileged
 * Firestore REST transactions; Wallet reads are SELECT-only; provider routes fail
 * closed when the corresponding service binding or credentials are absent.
 */
export function registerLegacyRouteParityGapRoutes({
  app,
  firestore,
  identityService,
  projectId,
  authAdmin,
  walletAdapter,
  db,
  isWalletReady = async () => false,
  isWalletBackfillReady = async () => false,
  fcmSender = null,
  env = {},
  apkReleaseService = null,
  rawUploadParser = null,
  liveService = null,
  isLiveReady = async () => false,
  fetchImpl = globalThis.fetch,
  contentMirrorFirestore = null
} = {}) {
  if (!app || typeof app.get !== 'function' || typeof app.post !== 'function' ||
      !firestore || typeof firestore.getDocument !== 'function' ||
      typeof firestore.runQuery !== 'function' || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Legacy parity routes require an HTTP app, privileged Firestore adapter and Firebase identity.');
  }

  async function authenticate(req) {
    try {
      return await identityService.authenticateAuthorization(req.get('Authorization'));
    } catch (error) {
      throw Object.assign(error, { httpStatus: Number(error?.httpStatus) || 401 });
    }
  }
  async function requireAdmin(req) {
    const actor = await authenticate(req);
    if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
      throw routeError('ADMIN_REQUIRED', 'Admin access denied.', 403);
    }
    return actor;
  }
  async function queryByPublicId(publicId) {
    const matches = await firestore.runQuery({
      collectionPath: 'smv_users',
      filters: [{ field: 'publicId', op: '==', value: publicId }],
      limit: 2
    });
    if (matches.length > 1) throw routeError('PUBLIC_ID_NOT_UNIQUE', 'The login ID is not unique. Admin repair is required.', 409);
    return matches[0] || null;
  }
  async function preflightPhone(phone, uid) {
    const registry = await firestore.getDocument('smv_phone_registry/' + phone.hash);
    if (registry.exists) {
      const ownerUid = String(registry.data?.uid || '');
      return ownerUid && ownerUid !== uid;
    }
    const variants = new Set([phone.e164, phone.digits, phone.digits.startsWith('91') ? phone.digits.slice(2) : phone.digits]);
    const fields = ['phoneNormalized', 'phone', 'mobile'];
    for (const field of fields) {
      for (const value of variants) {
        const matches = await firestore.runQuery({
          collectionPath: 'smv_users',
          filters: [{ field, op: '==', value }],
          limit: 20
        });
        if (matches.some(row => row.id !== uid)) return true;
      }
    }
    return false;
  }
  async function requirePhoneClaim(tx, phone, uid, role) {
    const path = 'smv_phone_registry/' + phone.hash;
    const existing = await tx.getDocument(path);
    const ownerUid = String(existing.data?.uid || '');
    if (existing.exists && ownerUid && ownerUid !== uid) {
      throw routeError('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please use another mobile number.', 409);
    }
    tx.set(path, {
      uid, role, phoneNormalized: phone.e164,
      verificationMode: normalizePhoneMode(env),
      createdAt: existing.exists ? (existing.data?.createdAt || FirestoreFieldValue.serverTimestamp()) : FirestoreFieldValue.serverTimestamp(),
      updatedAt: FirestoreFieldValue.serverTimestamp()
    }, { merge: true });
  }
  async function writeAdminAudit(tx, action, targetId, actorUid, details = {}) {
    tx.create('smv_admin_audit/' + randomHex(16), {
      action, questionId: targetId || null, actorUid: actorUid || null,
      details, createdAt: FirestoreFieldValue.serverTimestamp()
    });
  }
  function contentStore() {
    if (String(env.SMV_CONTENT_BACKFILL_COMPLETE || '').toLowerCase() === 'true') {
      if (!contentMirrorFirestore) throw routeError('CONTENT_ARCHIVE_NOT_READY', 'The content archive Firestore binding is not configured.', 503);
      return contentMirrorFirestore;
    }
    return firestore;
  }

  // 1. Login by Customer ID. Firebase Auth Admin lookup uses OAuth, not an end-user
  // ID token, so it can safely retrieve another account's email without revealing UID.
  app.post('/lookup-customer-login', async (req, res) => {
    try {
      const customerId = normalizeLoginId(req.body?.customerId, 'cus');
      if (!customerId) return res.status(400).json({ error: 'Enter a valid Customer ID, for example smvcr-48372.' });
      const row = await queryByPublicId(customerId);
      if (!row) return res.status(404).json({ error: 'Customer ID was not found. Please check your Customer ID.' });
      if (String(row.data?.role || '').toLowerCase() !== 'customer') {
        return res.status(403).json({ error: 'This ID is not a customer login ID.' });
      }
      if (!authAdmin) return res.status(503).json({ error: 'Firebase Auth Admin lookup is not configured.', code: 'FIREBASE_AUTH_ADMIN_NOT_READY' });
      const account = await authAdmin.lookupByUid(String(row.data?.uid || row.id));
      if (!account || account.disabled || !account.email) {
        return res.status(400).json({ error: 'This Customer account has no active login email configured.' });
      }
      return res.set('Cache-Control', 'no-store').json({ ok: true, email: account.email, customerId });
    } catch (error) {
      return replyError(res, error, 'Customer ID login lookup failed. Please try again.');
    }
  });

  // 2. Login by a legacy/current Customer or Astrologer public ID.
  app.post('/lookup-id-login', async (req, res) => {
    try {
      const publicId = normalizeLoginId(req.body?.publicId);
      if (!publicId) return res.status(400).json({ error: 'Enter a valid Customer or Astrologer ID.' });
      const row = await queryByPublicId(publicId);
      if (!row) return res.status(404).json({ error: 'This ID was not found. Please check the ID and try again.' });
      const expectedRole = /^(smvar-|smv-ast-)/i.test(publicId) ? 'astrologer' : 'customer';
      if (String(row.data?.role || '').toLowerCase() !== expectedRole) {
        return res.status(403).json({ error: 'This ID is not valid for this login type.' });
      }
      if (!authAdmin) return res.status(503).json({ error: 'Firebase Auth Admin lookup is not configured.', code: 'FIREBASE_AUTH_ADMIN_NOT_READY' });
      const account = await authAdmin.lookupByUid(String(row.data?.uid || row.id));
      if (!account || account.disabled || !account.email) {
        return res.status(400).json({ error: 'This account has no active login email configured.' });
      }
      return res.set('Cache-Control', 'no-store').json({ ok: true, email: account.email, publicId, role: expectedRole });
    } catch (error) {
      return replyError(res, error, 'ID login lookup failed. Please try again.');
    }
  });

  // 3. Customer registration. The wallet is initialized in Firestore only until
  // the explicit D1 Wallet cutover attestation is complete; after cutover D1
  // lazily creates it in the live Wallet domain.
  app.post('/register-customer-profile', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user.uid);
      const name = String(req.body?.name || '').trim();
      const phone = normalizeRegistrationPhone(req.body?.phone);
      if (!name || name.length > 120) return res.status(400).json({ error: 'A valid customer name is required.' });
      if (!phone) return res.status(400).json({ error: 'Enter a valid mobile number.' });
      phone.hash = await sha256Hex(phone.digits);
      const userPath = 'smv_users/' + uid;
      const existing = await firestore.getDocument(userPath);
      const existingRole = String(existing.data?.role || '').toLowerCase();
      if (existing.exists && existingRole && existingRole !== 'customer') {
        return res.status(409).json({ error: 'This Firebase account already belongs to a different SMV ASTRO role. Please use the correct account.' });
      }
      if (existing.exists && existingRole === 'customer' && existing.data?.publicId) {
        await firestore.setDocument(userPath, {
          name, fullName: name, displayName: name, updatedAt: FirestoreFieldValue.serverTimestamp()
        }, { merge: true });
        return res.json({ ok: true, alreadyRegistered: true, publicId: existing.data.publicId });
      }
      if (await preflightPhone(phone, uid)) return res.status(409).json({
        error: req.body?.language === 'ta'
          ? 'இந்த மொபைல் எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு மொபைல் எண்ணைப் பயன்படுத்தவும்.'
          : 'This mobile number is already registered. Please use another mobile number.',
        code: 'PHONE_ALREADY_REGISTERED'
      });
      const cutover = String(env.SMV_WALLET_DOMAIN_CUTOVER_COMPLETE || '').toLowerCase() === 'true';
      for (let attempt = 0; attempt < 20; attempt++) {
        const publicId = randomCompactId('smvcr');
        try {
          await firestore.runTransaction(async tx => {
            const [latestUser, idDocument, phoneDocument] = await Promise.all([
              tx.getDocument(userPath),
              tx.getDocument('smv_public_ids/' + publicId),
              tx.getDocument('smv_phone_registry/' + phone.hash)
            ]);
            const latestRole = String(latestUser.data?.role || '').toLowerCase();
            if (latestUser.exists && latestRole && latestRole !== 'customer') {
              throw routeError('PROFILE_ROLE_CONFLICT', 'This Firebase account already belongs to a different SMV ASTRO role.', 409);
            }
            if (idDocument.exists) throw routeError('PUBLIC_ID_COLLISION', 'Public ID collision.', 409);
            if (phoneDocument.exists && phoneDocument.data?.uid && String(phoneDocument.data.uid) !== uid) {
              throw routeError('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please use another mobile number.', 409);
            }
            await requirePhoneClaim(tx, phone, uid, 'customer');
            tx.create('smv_public_ids/' + publicId, {
              publicId, uid, role: 'customer', createdAt: FirestoreFieldValue.serverTimestamp()
            });
            tx.set(userPath, {
              uid, name, phone: phone.e164, mobile: phone.e164, phoneNormalized: phone.e164,
              email: String(user.email || ''),
              role: 'customer', status: 'active', publicId, customerId: publicId,
              emailVerificationRequired: true,
              phoneVerificationRequired: normalizePhoneMode(env) === 'whatsapp',
              phoneVerified: false,
              verificationMethod: normalizePhoneMode(env) === 'whatsapp' ? 'whatsapp' : 'email',
              createdAt: latestUser.exists ? (latestUser.data?.createdAt || FirestoreFieldValue.serverTimestamp()) : FirestoreFieldValue.serverTimestamp(),
              updatedAt: FirestoreFieldValue.serverTimestamp()
            }, { merge: true });
            if (!cutover) {
              const wallet = await tx.getDocument('smv_wallets/' + uid);
              if (!wallet.exists) tx.create('smv_wallets/' + uid, {
                ownerUid: uid, ownerRole: 'customer', currency: 'INR',
                availableBalancePaise: 0, reservedBalancePaise: 0,
                bonusMinutesBalance: 0, reservedBonusMinutes: 0, version: 1,
                createdAt: FirestoreFieldValue.serverTimestamp(), updatedAt: FirestoreFieldValue.serverTimestamp()
              });
            }
          });
          return res.set('Cache-Control', 'no-store').json({
            ok: true, publicId, phone: phone.e164, phoneVerificationMode: normalizePhoneMode(env)
          });
        } catch (error) {
          if (error?.code === 'PUBLIC_ID_COLLISION') continue;
          throw error;
        }
      }
      throw routeError('PUBLIC_ID_ALLOCATION_FAILED', 'Unable to allocate a unique Customer ID. Please try again.', 503);
    } catch (error) {
      return replyError(res, error, 'Customer profile setup failed on the server. Please try again.');
    }
  });

  // 4. Astrologer registration. Bank payout details remain pending Admin review.
  app.post('/register-astrologer-profile', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user.uid);
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const mobile = String(body.mobile || '').trim();
      const specialization = String(body.specialization || '').trim();
      const experience = Number(body.experience || 0);
      const bio = String(body.bio || '').trim();
      const languages = parseLanguages(body.languages);
      const bankName = String(body.bankName || '').trim();
      const accountName = String(body.accountName || '').trim();
      const accountNumber = String(body.accountNumber || '').trim();
      const ifsc = String(body.ifsc || '').trim().toUpperCase();
      const upi = String(body.upi || '').trim();
      const photoData = String(body.photoData || '');
      const phone = normalizeRegistrationPhone(mobile);
      if (!name || name.length > 120 || !mobile || !specialization || specialization.length > 160 ||
          !bio || bio.length > 5000 || !bankName || !accountName || !accountNumber || !ifsc || !photoData) {
        return res.status(400).json({ error: 'Please complete all required astrologer registration details.' });
      }
      if (!Number.isFinite(experience) || experience < 0 || experience > 80) return res.status(400).json({ error: 'Invalid experience.' });
      if (!phone) return res.status(400).json({ error: 'Enter a valid mobile number.' });
      if (!languages.length || languages.length > 12 || languages.some(item => item.length > 40) ||
          languages.join(', ').length > 240) {
        return res.status(400).json({ error: 'Enter 1–12 spoken languages, each up to 40 characters.' });
      }
      if (bankName.length > 120 || accountName.length > 120 || accountNumber.length > 40 ||
          accountNumber.length < 6 || ifsc.length < 4 || ifsc.length > 20 || upi.length > 120 ||
          photoData.length > 2_000_000) return res.status(400).json({ error: 'Payout or profile image details are invalid or too long.' });
      phone.hash = await sha256Hex(phone.digits);
      const userPath = 'smv_users/' + uid;
      const astroPath = 'smv_astrologers/' + uid;
      const existing = await firestore.getDocument(userPath);
      const existingRole = String(existing.data?.role || '').toLowerCase();
      if (existing.exists && existingRole && existingRole !== 'astrologer') {
        return res.status(409).json({ error: 'This Firebase account already belongs to a different SMV ASTRO role. Please use the correct account.' });
      }
      if (existing.exists && existingRole === 'astrologer' && existing.data?.publicId) {
        const [userSave, astroSave] = [
          firestore.setDocument(userPath, {
            name, fullName: name, displayName: name, languages, spokenLanguages: languages,
            updatedAt: FirestoreFieldValue.serverTimestamp()
          }, { merge: true }),
          firestore.setDocument(astroPath, {
            uid, name, fullName: name, displayName: name, specialization, expertise: specialization,
            experience, experienceYears: experience, languages, spokenLanguages: languages,
            bio, about: bio, updatedAt: FirestoreFieldValue.serverTimestamp()
          }, { merge: true })
        ];
        await Promise.all([userSave, astroSave]);
        return res.json({ ok: true, alreadyRegistered: true, publicId: existing.data.publicId, name, languages });
      }
      if (await preflightPhone(phone, uid)) return res.status(409).json({
        error: body.language === 'ta'
          ? 'இந்த மொபைல் எண் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. வேறு மொபைல் எண்ணைப் பயன்படுத்தவும்.'
          : 'This mobile number is already registered. Please use another mobile number.',
        code: 'PHONE_ALREADY_REGISTERED'
      });
      const notificationId = uid + '_registration_' + randomHex(8);
      for (let attempt = 0; attempt < 20; attempt++) {
        const publicId = randomCompactId('smvar');
        try {
          await firestore.runTransaction(async tx => {
            const [latestUser, latestAstro, idDocument, phoneDocument] = await Promise.all([
              tx.getDocument(userPath), tx.getDocument(astroPath),
              tx.getDocument('smv_public_ids/' + publicId),
              tx.getDocument('smv_phone_registry/' + phone.hash)
            ]);
            const latestRole = String(latestUser.data?.role || '').toLowerCase();
            if (latestUser.exists && latestRole && latestRole !== 'astrologer') {
              throw routeError('PROFILE_ROLE_CONFLICT', 'This Firebase account already belongs to a different SMV ASTRO role.', 409);
            }
            if (idDocument.exists) throw routeError('PUBLIC_ID_COLLISION', 'Public ID collision.', 409);
            if (phoneDocument.exists && phoneDocument.data?.uid && String(phoneDocument.data.uid) !== uid) {
              throw routeError('PHONE_ALREADY_REGISTERED', 'This mobile number is already registered. Please use another mobile number.', 409);
            }
            await requirePhoneClaim(tx, phone, uid, 'astrologer');
            tx.create('smv_public_ids/' + publicId, {
              publicId, uid, role: 'astrologer', createdAt: FirestoreFieldValue.serverTimestamp()
            });
            tx.set(userPath, {
              uid, name, phone: phone.e164, mobile: phone.e164, phoneNormalized: phone.e164,
              email: String(user.email || ''), publicId, role: 'astrologer', status: 'pending',
              languages, spokenLanguages: languages, emailVerificationRequired: true,
              phoneVerificationRequired: normalizePhoneMode(env) === 'whatsapp',
              phoneVerified: false,
              verificationMethod: normalizePhoneMode(env) === 'whatsapp' ? 'whatsapp' : 'email',
              createdAt: FirestoreFieldValue.serverTimestamp(), updatedAt: FirestoreFieldValue.serverTimestamp()
            }, { merge: true });
            tx.set(astroPath, {
              uid, name, publicId, specialization, expertise: specialization, experience,
              languages, spokenLanguages: languages, about: bio, bio, photoData,
              status: 'pending', role: 'astrologer', createdAt: FirestoreFieldValue.serverTimestamp()
            }, { merge: true });
            tx.set('smv_payouts/' + uid, {
              uid, bankName, accountName, accountNumber, ifsc, upi,
              updatedAt: FirestoreFieldValue.serverTimestamp(), status: 'pending_admin_review'
            }, { merge: true });
            tx.create('smv_notifications/' + notificationId, {
              userId: uid, type: 'registration', title: 'Registration submitted',
              message: 'Your astrologer application is pending Admin approval.',
              createdAt: FirestoreFieldValue.serverTimestamp(), read: false
            });
          });
          return res.set('Cache-Control', 'no-store').json({
            ok: true, publicId, phone: phone.e164, phoneVerificationMode: normalizePhoneMode(env)
          });
        } catch (error) {
          if (error?.code === 'PUBLIC_ID_COLLISION') continue;
          throw error;
        }
      }
      throw routeError('PUBLIC_ID_ALLOCATION_FAILED', 'Unable to allocate a unique Astrologer ID. Please try again.', 503);
    } catch (error) {
      return replyError(res, error, 'Astrologer profile setup failed on the server. Please try again.');
    }
  });

  // 5. Public approved Astrologers; Firebase Auth email verification is checked
  // through the IAM-protected projects.accounts:lookup endpoint.
  let publicAstrologersCache = { expiresAt: 0, items: null };
  app.get('/public/astrologers', async (_req, res) => {
    try {
      const now = Date.now();
      if (publicAstrologersCache.items && publicAstrologersCache.expiresAt > now) {
        return res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
          .json({ success: true, astrologers: publicAstrologersCache.items, cached: true });
      }
      if (!authAdmin) return res.status(503).set('Cache-Control', 'no-store').json({
        success: false, error: 'Firebase Auth Admin verification is not configured.'
      });
      const rows = await firestore.runQuery({
        collectionPath: 'smv_astrologers',
        filters: [{ field: 'status', op: '==', value: 'approved' }],
        limit: 200
      });
      const valid = [];
      for (let offset = 0; offset < rows.length; offset += 10) {
        const batch = rows.slice(offset, offset + 10);
        const checked = await Promise.all(batch.map(async row => {
          const account = await authAdmin.lookupByUid(row.id);
          if (!account || account.disabled || account.emailVerified !== true) return null;
          return publicAstrologerView(row.id, row.data || {});
        }));
        valid.push(...checked.filter(Boolean));
      }
      publicAstrologersCache = { expiresAt: now + 60000, items: valid };
      return res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
        .json({ success: true, astrologers: valid });
    } catch (error) {
      return replyError(res, error, 'Unable to load approved Astrologers.');
    }
  });

  // 6. Astrologer payout change. Existing bank details are never returned by this route.
  app.post('/astrologer/change-payout', async (req, res) => {
    try {
      const user = await authenticate(req);
      const uid = safeUid(user.uid);
      const bankName = String(req.body?.bankName || '').trim();
      const accountName = String(req.body?.accountName || '').trim();
      const accountNumber = String(req.body?.accountNumber || '').trim();
      const ifsc = String(req.body?.ifsc || '').trim().toUpperCase();
      const upi = String(req.body?.upi || '').trim();
      if (!bankName || !accountName || !accountNumber || !ifsc) {
        return res.status(400).json({ error: 'Please complete all required payment details.' });
      }
      if (bankName.length > 120 || accountName.length > 120 || accountNumber.length > 40 ||
          ifsc.length > 20 || upi.length > 120) return res.status(400).json({ error: 'Payment details are too long.' });
      if (accountNumber.length < 6 || ifsc.length < 4) return res.status(400).json({ error: 'Enter valid bank account and IFSC details.' });
      const payoutPath = 'smv_payouts/' + uid;
      const astroPath = 'smv_astrologers/' + uid;
      await firestore.runTransaction(async tx => {
        const [profile, astro] = await Promise.all([tx.getDocument('smv_users/' + uid), tx.getDocument(astroPath)]);
        if (String(profile.data?.role || '').toLowerCase() !== 'astrologer' ||
            String(astro.data?.status || '').toLowerCase() !== 'approved') {
          throw routeError('APPROVED_ASTROLOGER_REQUIRED', 'Only an approved Astrologer can change the payment method.', 403);
        }
        const existing = await tx.getDocument(payoutPath);
        const now = FirestoreFieldValue.serverTimestamp();
        tx.set(payoutPath, {
          uid, bankName, accountName, accountNumber, ifsc, upi,
          status: 'pending_admin_review', requestedAt: now, updatedAt: now,
          approvedAt: FirestoreFieldValue.delete(), rejectedAt: FirestoreFieldValue.delete(),
          rejectionReason: FirestoreFieldValue.delete()
        }, { merge: true });
        tx.create('smv_notifications/' + uid + '_payout_' + randomHex(6), {
          userId: uid, type: 'payment_method', title: 'Payment Method Submitted',
          message: 'Your new payment method is waiting for Admin approval.',
          createdAt: now, read: false
        });
        const adminUid = String(env.ADMIN_UID || '').trim();
        if (adminUid) tx.create('smv_notifications/' + adminUid + '_payout_review_' + randomHex(6), {
          userId: adminUid, type: 'payment_method_review',
          title: 'Astrologer Payment Method Approval Required',
          message: 'An approved Astrologer submitted a payment method for Admin review.',
          astrologerId: uid, createdAt: now, read: false
        });
        void existing;
      });
      return noStore(res).json({ success: true, status: 'pending_admin_review' });
    } catch (error) {
      return replyError(res, error, 'Unable to submit payment method change right now. Please try again.');
    }
  });

  // 7. Admin approves/rejects only the still-pending payout request; update,
  // notification and audit event are committed in one Firestore transaction.
  app.post('/admin/payout-change-status', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const astrologerId = safeDocId(req.body?.astrologerId, 160);
      const status = String(req.body?.status || '').trim();
      const reason = String(req.body?.reason || '').trim();
      if (!astrologerId || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid payment method approval request.' });
      }
      if (status === 'rejected' && (!reason || reason.length > 1000)) {
        return res.status(400).json({ error: 'Enter a valid rejection reason.' });
      }
      await firestore.runTransaction(async tx => {
        const path = 'smv_payouts/' + astrologerId;
        const snapshot = await tx.getDocument(path);
        if (!snapshot.exists) throw routeError('PAYOUT_REQUEST_NOT_FOUND', 'Payment method request not found.', 404);
        if (String(snapshot.data?.status || '') !== 'pending_admin_review') {
          throw routeError('PAYOUT_REQUEST_NOT_PENDING', 'This payment method request is no longer pending.', 409);
        }
        const now = FirestoreFieldValue.serverTimestamp();
        const patch = { status, reviewedAt: now, reviewedBy: actor.uid, updatedAt: now };
        if (status === 'approved') patch.approvedAt = now;
        else { patch.rejectedAt = now; patch.rejectionReason = reason; }
        tx.set(path, patch, { merge: true });
        const message = status === 'approved'
          ? 'Your new payment method has been approved by Admin.'
          : 'Your new payment method was rejected by Admin. Reason: ' + reason;
        tx.create('smv_notifications/' + astrologerId + '_payout_reviewed_' + randomHex(6), {
          userId: astrologerId, type: 'payment_method',
          title: status === 'approved' ? 'Payment Method Approved' : 'Payment Method Rejected',
          message, createdAt: now, read: false
        });
        await writeAdminAudit(tx, 'PAYMENT_METHOD_' + status.toUpperCase(), astrologerId, actor.uid, { astrologerId });
      });
      return noStore(res).json({ success: true, status });
    } catch (error) {
      return replyError(res, error, 'Unable to update payment method approval.');
    }
  });

  // 8. APK upload is delegated to the dedicated Cloudflare APK-release Worker.
  // The separate Worker owns binary inspection, permanent-signing-certificate
  // verification, R2 storage and D1 version sequencing. Missing binding = 503.
  app.post('/admin/android-app/upload', ...(rawUploadParser ? [rawUploadParser] : []), async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const contentType = String(req.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (contentType !== 'application/vnd.android.package-archive' || !req.body) {
        return res.status(415).json({ success: false, error: 'Upload the APK as application/vnd.android.package-archive.' });
      }
      if (!apkReleaseService || typeof apkReleaseService.fetch !== 'function') {
        return res.status(503).json({
          success: false,
          error: 'The Cloudflare Android APK-release service binding is not provisioned.',
          code: 'APK_RELEASE_SERVICE_NOT_READY'
        });
      }
      const bytes = req.body instanceof Uint8Array ? req.body : new Uint8Array(req.body);
      if (bytes.byteLength < 1024 || bytes.byteLength > 100 * 1024 * 1024) {
        return res.status(400).json({ success: false, error: 'Upload a valid SMV ASTRO APK between 1 KB and 100 MB.' });
      }
      const upstream = await apkReleaseService.fetch(new Request('https://apk-release.internal/api/android-app/upload', {
        method: 'POST',
        headers: {
          Authorization: String(req.get('Authorization') || ''),
          'Content-Type': 'application/vnd.android.package-archive'
        },
        body: bytes
      }));
      const body = await upstream.text();
      let payload;
      try { payload = JSON.parse(body); } catch { payload = { success: false, error: 'Android APK-release service returned an invalid response.' }; }
      return noStore(res).status(upstream.status).json(payload);
    } catch (error) {
      return replyError(res, error, 'The APK could not be published by the Cloudflare APK-release service.');
    }
  });

  // 9. Admin saves only the legacy content manager's allowlisted English fields.
  app.post('/admin/content/save', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const id = safeDocId(req.body?.id, 200);
      if (!id) return res.status(400).json({ success: false, error: 'A valid content ID and content payload are required.' });
      const patch = cleanContentPatch(req.body?.data);
      const now = FirestoreFieldValue.serverTimestamp();
      const store = contentStore();
      await store.runTransaction(async tx => {
        const path = 'smv_content/' + id;
        const old = await tx.getDocument(path);
        const update = { ...patch, updatedAt: now, updatedBy: actor.uid };
        if (!old.exists) {
          update.createdAt = now;
          update.authorUid = actor.uid;
          if (update.published === true) update.publishedAt = now;
        } else if (update.published === true) update.publishedAt = now;
        tx.set(path, update, { merge: true });
      });
      if (contentMirrorFirestore && contentMirrorFirestore !== store &&
          String(env.SMV_CONTENT_MIRROR_WRITES_ENABLED || '').toLowerCase() === 'true' &&
          String(env.SMV_CONTENT_BACKFILL_COMPLETE || '').toLowerCase() !== 'true') {
        await contentMirrorFirestore.setDocument('smv_content/' + id, { ...patch, updatedAt: now, updatedBy: actor.uid }, { merge: true });
      }
      return noStore(res).json({ success: true, id });
    } catch (error) {
      return replyError(res, error, 'Unable to save Admin content.');
    }
  });

  // 10. Publish state changes require an existing content document.
  app.post('/admin/content/toggle', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const id = safeDocId(req.body?.id, 200);
      if (!id || typeof req.body?.published !== 'boolean') {
        return res.status(400).json({ success: false, error: 'Content ID and publish state are required.' });
      }
      const store = contentStore();
      await store.runTransaction(async tx => {
        const path = 'smv_content/' + id;
        const snapshot = await tx.getDocument(path);
        if (!snapshot.exists) throw routeError('CONTENT_NOT_FOUND', 'Content not found.', 404);
        const now = FirestoreFieldValue.serverTimestamp();
        tx.set(path, {
          published: req.body.published,
          publishedAt: now,
          updatedAt: now,
          updatedBy: actor.uid
        }, { merge: true });
      });
      if (contentMirrorFirestore && contentMirrorFirestore !== store &&
          String(env.SMV_CONTENT_MIRROR_WRITES_ENABLED || '').toLowerCase() === 'true' &&
          String(env.SMV_CONTENT_BACKFILL_COMPLETE || '').toLowerCase() !== 'true') {
        await contentMirrorFirestore.setDocument('smv_content/' + id, {
          published: req.body.published, publishedAt: FirestoreFieldValue.serverTimestamp(),
          updatedAt: FirestoreFieldValue.serverTimestamp(), updatedBy: actor.uid
        }, { merge: true });
      }
      return res.json({ success: true, id, published: req.body.published });
    } catch (error) {
      return replyError(res, error, 'Unable to update Admin content.');
    }
  });

  // 11. Delete is performed against the selected primary/archive content store.
  app.post('/admin/content/delete', async (req, res) => {
    try {
      await requireAdmin(req);
      const id = safeDocId(req.body?.id, 200);
      if (!id) return res.status(400).json({ success: false, error: 'A valid content ID is required.' });
      await contentStore().deleteDocument('smv_content/' + id);
      if (contentMirrorFirestore && String(env.SMV_CONTENT_MIRROR_WRITES_ENABLED || '').toLowerCase() === 'true' &&
          String(env.SMV_CONTENT_BACKFILL_COMPLETE || '').toLowerCase() !== 'true') {
        await contentMirrorFirestore.deleteDocument('smv_content/' + id).catch(() => {});
      }
      return res.json({ success: true, id });
    } catch (error) {
      return replyError(res, error, 'Unable to delete Admin content.');
    }
  });

  // 12. Admin UI writes made directly by the dashboard still bump a lightweight
  // realtime version document; no broad collection scan or cache mutation occurs.
  app.post('/admin/dashboard-touch', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      await firestore.runTransaction(async tx => {
        tx.set('smv_settings/dashboardChange', {
          version: FirestoreFieldValue.increment(1),
          updatedAt: FirestoreFieldValue.serverTimestamp(),
          path: '/admin/dashboard-touch',
          category: 'admin_direct_write'
        }, { merge: true });
        await writeAdminAudit(tx, 'ADMIN_DASHBOARD_TOUCH', 'dashboardChange', actor.uid, {});
      });
      return noStore(res).json({ success: true });
    } catch (error) {
      return replyError(res, error, 'Unable to notify the Admin dashboard.');
    }
  });

  // 13. Read-only Admin Wallet ledger. This route never calls ensureWallet,
  // creates rows, or mutates legacy/cutover data.
  app.get('/admin/wallet/transactions', async (req, res) => {
    try {
      await requireAdmin(req);
      if (!db || typeof db.prepare !== 'function' || !(await isWalletReady()) || !(await isWalletBackfillReady())) {
        return res.status(503).set('Cache-Control', 'no-store').json({
          success: false, error: 'Wallet transaction storage is not ready.', code: 'WALLET_SCHEMA_NOT_READY'
        });
      }
      const rawLimit = Number(req.query?.limit || 50);
      const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
      const ownerUid = String(req.query?.ownerUid || '').trim().slice(0, 160);
      const filterSql = ownerUid ? ' WHERE owner_uid = ?' : '';
      const current = await db.prepare(
        'SELECT ledger_id, owner_uid, owner_role, type, direction, amount_paise, balance_after_paise, ' +
        'reserved_balance_after_paise, idempotency_key, reference_type, reference_id, note, status, source, created_at_ms ' +
        'FROM smv_domain_wallet_ledger' + filterSql + ' ORDER BY created_at_ms DESC, ledger_id DESC LIMIT ?'
      ).bind(...(ownerUid ? [ownerUid, limit] : [limit])).all();
      const legacy = await db.prepare(
        'SELECT source_document_id, owner_uid, owner_role, type, direction, amount_paise, balance_after_paise, ' +
        'reserved_balance_after_paise, idempotency_key, reference_type, reference_id, note, status, created_at_ms, metadata_json ' +
        'FROM smv_domain_legacy_wallet_transactions' + filterSql + ' ORDER BY created_at_ms DESC, source_document_id DESC LIMIT ?'
      ).bind(...(ownerUid ? [ownerUid, limit] : [limit])).all();
      const items = (current.results || []).map(row => ({
        id: String(row.ledger_id), ownerUid: String(row.owner_uid), ownerRole: String(row.owner_role),
        type: String(row.type), direction: String(row.direction), amountPaise: Number(row.amount_paise || 0),
        balanceAfterPaise: Number(row.balance_after_paise || 0),
        reservedBalanceAfterPaise: Number(row.reserved_balance_after_paise || 0),
        idempotencyKey: String(row.idempotency_key || ''), referenceType: row.reference_type || '',
        referenceId: row.reference_id || '', note: String(row.note || ''), status: String(row.status || ''),
        source: String(row.source || ''), createdAt: Number(row.created_at_ms || 0)
      })).concat((legacy.results || []).map(row => ({
        id: String(row.source_document_id), ownerUid: String(row.owner_uid), ownerRole: String(row.owner_role || ''),
        type: String(row.type || ''), direction: String(row.direction || ''), amountPaise: Number(row.amount_paise || 0),
        balanceAfterPaise: Number(row.balance_after_paise || 0),
        reservedBalanceAfterPaise: Number(row.reserved_balance_after_paise || 0),
        idempotencyKey: String(row.idempotency_key || ''), referenceType: row.reference_type || '',
        referenceId: row.reference_id || '', note: String(row.note || ''), status: String(row.status || ''),
        source: 'legacy_firestore', createdAt: Number(row.created_at_ms || 0)
      }))).sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id)).slice(0, limit);
      const pageTotals = items.reduce((total, item) => {
        total.transactionCount += 1;
        total[item.direction === 'credit' ? 'creditPaise' : item.direction === 'debit' ? 'debitPaise' : 'otherPaise'] += item.amountPaise;
        total.byType[item.type] = (total.byType[item.type] || 0) + 1;
        return total;
      }, { transactionCount: 0, creditPaise: 0, debitPaise: 0, otherPaise: 0, byType: {} });
      let wallet = null;
      if (ownerUid && walletAdapter && typeof walletAdapter.getWallet === 'function') {
        const walletSnapshot = await walletAdapter.getWallet(ownerUid);
        if (walletSnapshot) wallet = {
          ownerUid, ownerRole: String(walletSnapshot.ownerRole || ''),
          availableBalancePaise: Number(walletSnapshot.availableBalancePaise || 0),
          reservedBalancePaise: Number(walletSnapshot.reservedBalancePaise || 0),
          updatedAt: walletSnapshot.updatedAt || null
        };
      }
      return noStore(res).json({ success: true, sampled: true, limit, ownerUid: ownerUid || null, transactions: items, pageTotals, wallet });
    } catch (error) {
      return replyError(res, error, 'Unable to load Wallet transaction audit.');
    }
  });

  // 14-17. Push token management is Astrologer-only and stores the token under a
  // SHA-256 document ID. Token ownership is checked in every transaction.
  app.get('/live/push/status', async (req, res) => {
    try {
      const user = await authenticate(req);
      if (roleError(user, ['astrologer'])) throw routeError('ASTROLOGER_REQUIRED', 'Astrologer account required.', 403);
      const rows = await firestore.runQuery({
        collectionPath: 'smv_push_tokens',
        filters: [{ field: 'uid', op: '==', value: user.uid }],
        limit: 25
      });
      return noStore(res).json({ success: true, supported: true, registeredDevices: rows.length });
    } catch (error) {
      return replyError(res, error, 'Unable to check Background Alert status.');
    }
  });

  app.post('/live/push/register', async (req, res) => {
    try {
      const user = await authenticate(req);
      if (roleError(user, ['astrologer'])) throw routeError('ASTROLOGER_REQUIRED', 'Astrologer account required.', 403);
      const token = String(req.body?.token || '').trim();
      if (token.length < 30 || token.length > 8192 || /\s/.test(token)) {
        return res.status(400).json({ success: false, error: 'The browser push token is invalid. Enable Background Alerts again.' });
      }
      const platform = String(req.body?.platform || 'web').trim().toLowerCase();
      if (!['web', 'native-android'].includes(platform)) return res.status(400).json({
        success: false, error: 'Unsupported background alert platform.'
      });
      const id = await sha256Hex(token);
      await firestore.runTransaction(async tx => {
        const path = 'smv_push_tokens/' + id;
        const existing = await tx.getDocument(path);
        const owner = String(existing.data?.uid || '');
        if (existing.exists && owner && owner !== user.uid) {
          throw routeError('PUSH_TOKEN_OWNED_BY_OTHER', 'This device token is already registered to another account.', 403);
        }
        tx.set(path, {
          uid: user.uid, token, platform,
          userAgent: String(req.body?.userAgent || '').slice(0, 500),
          updatedAt: FirestoreFieldValue.serverTimestamp()
        }, { merge: true });
      });
      return noStore(res).json({ success: true, registered: true });
    } catch (error) {
      return replyError(res, error, 'Unable to register this device for Background Alerts.');
    }
  });

  app.post('/live/push/unregister', async (req, res) => {
    try {
      const user = await authenticate(req);
      if (roleError(user, ['astrologer'])) throw routeError('ASTROLOGER_REQUIRED', 'Astrologer account required.', 403);
      const token = String(req.body?.token || '').trim();
      if (token.length < 30 || token.length > 8192 || /\s/.test(token)) {
        return res.status(400).json({ success: false, error: 'The browser push token is invalid.' });
      }
      const id = await sha256Hex(token);
      await firestore.runTransaction(async tx => {
        const path = 'smv_push_tokens/' + id;
        const existing = await tx.getDocument(path);
        if (!existing.exists) return;
        if (String(existing.data?.uid || '') !== user.uid) {
          throw routeError('PUSH_TOKEN_OWNED_BY_OTHER', 'This device token belongs to another account.', 403);
        }
        tx.delete(path);
      });
      return noStore(res).json({ success: true, unregistered: true });
    } catch (error) {
      return replyError(res, error, 'Unable to disable Background Alerts for this device.');
    }
  });

  app.post('/live/push/test', async (req, res) => {
    try {
      const user = await authenticate(req);
      if (roleError(user, ['astrologer'])) throw routeError('ASTROLOGER_REQUIRED', 'Astrologer account required.', 403);
      if (!fcmSender || typeof fcmSender.send !== 'function') {
        return res.status(503).json({ success: false, error: 'Firebase Cloud Messaging is not configured.', code: 'FCM_NOT_READY' });
      }
      const rows = await firestore.runQuery({
        collectionPath: 'smv_push_tokens',
        filters: [{ field: 'uid', op: '==', value: user.uid }],
        limit: 25
      });
      if (!rows.length) return res.status(503).json({ success: false, error: 'No device is registered yet. Tap ENABLE BACKGROUND ALERTS first.' });
      let sent = 0;
      for (const row of rows) {
        const token = String(row.data?.token || '');
        if (!token) continue;
        try {
          await fcmSender.send(token, {
            title: 'SMV ASTRO Test Alert',
            body: 'Background Alerts are enabled on this device. Push delivery reached SMV ASTRO.',
            data: { type: 'push_test', tag: 'smv-push-test-' + Date.now() }
          });
          sent += 1;
        } catch (error) {
          console.warn('[SMV ASTRO] FCM test send failed for one token:', error?.code || error?.message || error);
        }
      }
      if (!sent) return res.status(503).json({
        success: false, error: 'The push service did not accept the test alert. Re-enable Background Alerts and try again.'
      });
      return noStore(res).json({ success: true, sent });
    } catch (error) {
      return replyError(res, error, 'Unable to send a test Background Alert.');
    }
  });

  // 18. Starting an accepted scheduled Call/Chat requires the D1 Live service,
  // both Durable Objects and schema 0006. It reuses the old India-time/grace
  // contract; if any resource is missing, the route fails closed before reserve.
  app.post('/live/scheduled-appointments/:id/start', async (req, res) => {
    let createdSessionId = '';
    try {
      const user = await authenticate(req);
      if (roleError(user, ['astrologer'])) throw routeError('ASTROLOGER_REQUIRED', 'Astrologer account required.', 403);
      const uid = safeUid(user.uid);
      if (!liveService || typeof liveService.createRequest !== 'function' ||
          typeof liveService.acceptSession !== 'function' || typeof liveService.endSession !== 'function' ||
          !env?.LIVE_SESSION_COORDINATOR || !env?.LIVE_USER_EVENT_HUB || !(await isLiveReady())) {
        return res.status(503).json({ success: false, error: 'Scheduled Live Call/Chat infrastructure is not ready.', code: 'LIVE_SCHEMA_NOT_READY' });
      }
      const appointmentId = safeDocId(req.params?.id, 180);
      if (!appointmentId) return res.status(400).json({ success: false, error: 'Scheduled booking ID is required.' });
      const path = 'smv_appointments/' + appointmentId;
      const appointmentSnapshot = await firestore.getDocument(path);
      if (!appointmentSnapshot.exists) return res.status(404).json({ success: false, error: 'Scheduled Call/Chat booking was not found.' });
      const appointment = appointmentSnapshot.data || {};
      if (String(appointment.astrologerUid || '') !== uid) return res.status(403).json({ success: false, error: 'This scheduled booking belongs to another Astrologer.' });
      if (!['scheduled_call_request', 'scheduled_chat_request'].includes(String(appointment.bookingKind || ''))) {
        return res.status(400).json({ success: false, error: 'This record is not a scheduled Call/Chat booking.' });
      }
      const currentStatus = String(appointment.bookingStatus || 'requested').toLowerCase();
      if (!['accepted', 'in_progress', 'waiting_for_online'].includes(currentStatus)) {
        return res.status(409).json({ success: false, error: 'Accept this booking in the Astrologer dashboard before starting it.' });
      }
      if (currentStatus === 'in_progress' && appointment.liveSessionId) {
        const existing = await liveService.listSessions(uid, 'astrologer');
        const session = (existing || []).find(item => String(item.id) === String(appointment.liveSessionId));
        if (session) return noStore(res).json({ success: true, alreadyProcessed: true, kind: 'session', session });
      }
      const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(appointment.preferredDate || ''));
      const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(appointment.preferredTime || ''));
      if (!dateMatch || !timeMatch) return res.status(409).json({ success: false, error: 'This booking has an invalid scheduled date/time. Ask the Customer to submit it again.' });
      const [year, month, day] = dateMatch.slice(1).map(Number);
      const [hour, minute] = timeMatch.slice(1).map(Number);
      const utc = Date.UTC(year, month - 1, day, hour, minute);
      const roundTrip = new Date(utc);
      if (roundTrip.getUTCFullYear() !== year || roundTrip.getUTCMonth() !== month - 1 ||
          roundTrip.getUTCDate() !== day) return res.status(409).json({ success: false, error: 'This booking has an invalid scheduled date/time.' });
      const scheduledAt = utc - 330 * 60 * 1000;
      const startDeadline = scheduledAt + 2 * 60 * 1000;
      if (Date.now() < scheduledAt && currentStatus !== 'in_progress') {
        return res.status(409).json({ success: false, error: 'The scheduled time has not arrived yet. The Start button becomes available at the booked time.' });
      }
      if (currentStatus === 'accepted' && !appointment.liveSessionId && Date.now() >= startDeadline) {
        await firestore.runTransaction(async tx => {
          const latest = await tx.getDocument(path);
          if (!latest.exists || String(latest.data?.bookingStatus || '') !== 'accepted' || latest.data?.liveSessionId) return;
          tx.set(path, {
            bookingStatus: 'missed_by_astrologer', status: 'missed',
            missedReason: 'astrologer_not_connected_within_grace',
            missedAt: FirestoreFieldValue.serverTimestamp(), updatedAt: FirestoreFieldValue.serverTimestamp()
          }, { merge: true });
        });
        return res.status(409).json({
          success: false, code: 'SCHEDULED_START_WINDOW_EXPIRED',
          bookingStatus: 'missed_by_astrologer',
          error: 'The 2-minute start window after the scheduled time has passed. This booking is marked as missed because the Astrologer did not start the session in time.'
        });
      }
      const [astro, pricing, currentSessions] = await Promise.all([
        firestore.getDocument('smv_astrologers/' + uid),
        liveService.getPricing(),
        liveService.listSessions(uid, 'astrologer')
      ]);
      if (!astro.exists) return res.status(404).json({ success: false, error: 'Astrologer profile was not found.' });
      const astroData = astro.data || {};
      if (String(astroData.availabilityStatus || astroData.onlineStatus || 'offline').toLowerCase() !== 'online') {
        return res.status(409).json({ success: false, error: 'Set your Astrologer Availability to Online before starting the scheduled Call/Chat. The Customer Wallet will not be reserved until you start.' });
      }
      const capacity = Math.max(1, Math.min(3, Number(pricing.maxConcurrentSessions || 1)));
      const active = (currentSessions || []).filter(session => !['ended', 'cancelled'].includes(String(session.state || session.status || '').toLowerCase())).length;
      if (!Number.isSafeInteger(active) || active >= capacity) {
        return res.status(409).json({ success: false, error: 'Your Live Session limit is currently full. Finish another session and retry the scheduled Start button.' });
      }
      const minutes = Number(appointment.scheduledMinutes || 5);
      if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > MAX_SESSION_MINUTES) {
        return res.status(409).json({ success: false, error: 'The scheduled session duration is invalid. Ask the Customer to rebook.' });
      }
      const mode = appointment.bookingKind === 'scheduled_chat_request' ? 'chat' : 'call';
      const requestId = 'smv-scheduled-' + appointmentId;
      const result = await liveService.createRequest({
        customerUid: String(appointment.customerUid || ''),
        astrologerId: uid,
        mode, minutes, requestId,
        customerName: String(appointment.name || ''),
        birthDetails: appointment.birthDetails || {},
        appointmentId
      });
      let finalResult = result;
      let session = result.session || null;
      if (result.kind === 'session' && session) {
        createdSessionId = String(session.id);
        const accepted = await liveService.acceptSession({ sessionId: createdSessionId, astrologerUid: uid });
        session = accepted.session;
        finalResult = { ...result, session };
        const until = timestampMillis(session.preparationUntil || session.preparationUntilMs) ||
          Date.now() + 3 * 60 * 1000;
        const stub = env.LIVE_SESSION_COORDINATOR.get(env.LIVE_SESSION_COORDINATOR.idFromName(createdSessionId));
        const timerResponse = await stub.fetch('https://live-session.internal/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: createdSessionId,
            state: 'preparing',
            deadlines: [{ type: 'preparation_timeout', atMs: until, deadlineId: 'preparation:' + createdSessionId, generation: 0 }]
          })
        });
        const timer = await timerResponse.json().catch(() => ({}));
        if (!timerResponse.ok || timer.ok !== true) throw routeError('LIVE_TIMER_SCHEDULE_FAILED', 'The durable Live Session timer could not be scheduled.', 503);
        for (const recipient of [String(session.customerUid || ''), String(session.astrologerUid || '')]) {
          if (!recipient) continue;
          try {
            const hub = env.LIVE_USER_EVENT_HUB.get(env.LIVE_USER_EVENT_HUB.idFromName(recipient));
            await hub.fetch('https://live-user-hub.internal/publish', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-smv-internal-caller': 'smv-backend' },
              body: JSON.stringify({
                targetUid: recipient, eventId: 'scheduled-start:' + createdSessionId + ':' + Date.now(),
                type: 'live.session.updated', data: { session }
              })
            });
          } catch { /* realtime event is best-effort after the D1 state is committed */ }
        }
      }
      const isSession = result.kind === 'session' && !!session;
      const appointmentPatch = {
        bookingStatus: isSession ? 'in_progress' : 'waiting_for_online',
        status: isSession ? 'in_progress' : 'accepted',
        liveSessionId: String(session?.id || result.booking?.id || ''),
        liveBookingId: String(result.booking?.id || ''),
        liveRequestId: requestId,
        scheduledStartedAt: isSession ? FirestoreFieldValue.serverTimestamp() : null,
        updatedAt: FirestoreFieldValue.serverTimestamp()
      };
      await firestore.runTransaction(async tx => {
        const latest = await tx.getDocument(path);
        if (!latest.exists) throw routeError('APPOINTMENT_NOT_FOUND', 'Scheduled Call/Chat booking was not found.', 404);
        if (String(latest.data?.astrologerUid || '') !== uid) throw routeError('APPOINTMENT_OWNER_CHANGED', 'This scheduled booking belongs to another Astrologer.', 403);
        const latestStatus = String(latest.data?.bookingStatus || 'requested').toLowerCase();
        if (latestStatus === 'in_progress' && latest.data?.liveSessionId) return;
        if (!['accepted', 'waiting_for_online'].includes(latestStatus)) {
          throw routeError('APPOINTMENT_STATE_CHANGED', 'The scheduled booking changed while Start was processing.', 409);
        }
        tx.set(path, appointmentPatch, { merge: true });
      });
      return noStore(res).json(finalResult);
    } catch (error) {
      if (createdSessionId && liveService?.endSession) {
        await liveService.endSession({ sessionId: createdSessionId, reason: 'server_ended', system: true }).catch(() => {});
      }
      return replyError(res, error, 'Unable to start this scheduled Call/Chat.');
    }
  });

  return Object.freeze({
    paths: Object.freeze([
      'POST /lookup-customer-login', 'POST /lookup-id-login',
      'POST /register-customer-profile', 'POST /register-astrologer-profile',
      'GET /public/astrologers', 'POST /astrologer/change-payout',
      'POST /admin/payout-change-status', 'POST /admin/android-app/upload',
      'POST /admin/content/save', 'POST /admin/content/toggle',
      'POST /admin/content/delete', 'POST /admin/dashboard-touch',
      'GET /admin/wallet/transactions', 'GET /live/push/status',
      'POST /live/push/register', 'POST /live/push/unregister',
      'POST /live/push/test', 'POST /live/scheduled-appointments/:id/start'
    ])
  });
}
