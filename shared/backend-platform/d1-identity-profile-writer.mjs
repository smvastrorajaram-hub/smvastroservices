'use strict';

function clean(value, max = 200) {
  return String(value ?? '').trim().slice(0, max);
}
function validUid(value) {
  const uid = clean(value, 160);
  return /^[A-Za-z0-9:_-]{1,160}$/.test(uid) ? uid : '';
}
function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1);
  else if (digits.length === 10) digits = '91' + digits;
  return digits.length >= 8 && digits.length <= 15 ? { digits, e164: '+' + digits } : null;
}
async function hashPhone(value, cryptoImpl) {
  const phone = normalizePhone(value);
  if (!phone) return null;
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(phone.digits));
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return { ...phone, hash };
}
function safeProfile(value = {}) {
  const allowed = ['displayName', 'language', 'languages', 'spokenLanguages', 'specialization', 'expertise', 'experience', 'bio', 'about'];
  const profile = {};
  for (const key of allowed) {
    const item = value[key];
    if (typeof item === 'string') profile[key] = item.slice(0, key === 'bio' || key === 'about' ? 5000 : 240);
    else if (Array.isArray(item)) profile[key] = item.slice(0, 12).map(entry => clean(entry, 40)).filter(Boolean);
    else if (key === 'experience' && Number.isFinite(Number(item))) profile[key] = Math.max(0, Math.min(80, Number(item)));
  }
  return JSON.stringify(profile);
}

/** D1 application identity writes for newly completed Firebase registrations. */
export function createD1IdentityProfileWriter({ db, projectId, now = Date.now, cryptoImpl = globalThis.crypto } = {}) {
  const project = clean(projectId, 64);
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('D1 identity profile writer requires a D1 database binding.');
  }
  if (!/^[a-z0-9][a-z0-9-]{4,29}$/.test(project)) throw new TypeError('A valid Firebase project ID is required.');
  if (typeof cryptoImpl?.subtle?.digest !== 'function') throw new TypeError('Web Crypto SHA-256 is required.');

  async function commit(statements) {
    if (!statements.length) return;
    const results = await db.batch(statements);
    if (!Array.isArray(results) || results.length !== statements.length ||
        results.some(result => result?.success === false)) {
      throw Object.assign(new Error('D1 identity profile write was not fully confirmed.'), {
        code: 'IDENTITY_PROFILE_D1_WRITE_FAILED', httpStatus: 503
      });
    }
  }
  function publicIdStatement(publicId, uid, role, createdAt) {
    const id = clean(publicId, 100);
    if (!id) return null;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) throw Object.assign(
      new Error('Identity public ID is invalid.'), { code: 'IDENTITY_PUBLIC_ID_INVALID', httpStatus: 400 }
    );
    return db.prepare(
      'INSERT INTO smv_domain_identity_public_ids ' +
      '(public_id,firebase_project_id,uid,role,created_at_ms) VALUES (?,?,?,?,?) ' +
      'ON CONFLICT(public_id) DO UPDATE SET firebase_project_id=excluded.firebase_project_id,uid=excluded.uid,role=excluded.role ' +
      'WHERE smv_domain_identity_public_ids.firebase_project_id=excluded.firebase_project_id ' +
      'AND smv_domain_identity_public_ids.uid=excluded.uid AND smv_domain_identity_public_ids.role=excluded.role'
    ).bind(id, project, uid, role, createdAt);
  }
  async function phoneStatement(phoneValue, uid, role, verificationMode, phoneVerified, createdAt, updatedAt) {
    const phone = await hashPhone(phoneValue, cryptoImpl);
    if (!phone) return null;
    return db.prepare(
      'INSERT INTO smv_domain_identity_phones ' +
      '(phone_hash,firebase_project_id,uid,phone_e164,role,verification_mode,phone_verified,created_at_ms,updated_at_ms) ' +
      'VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(phone_hash) DO UPDATE SET ' +
      'phone_e164=excluded.phone_e164,role=excluded.role,verification_mode=excluded.verification_mode,' +
      'phone_verified=excluded.phone_verified,updated_at_ms=MAX(smv_domain_identity_phones.updated_at_ms,excluded.updated_at_ms) ' +
      'WHERE smv_domain_identity_phones.firebase_project_id=excluded.firebase_project_id AND smv_domain_identity_phones.uid=excluded.uid'
    ).bind(phone.hash, project, uid, phone.e164, role, clean(verificationMode, 32) || 'email_unique',
      phoneVerified === true ? 1 : 0, createdAt, updatedAt);
  }

  async function upsertCustomerProfile({
    uid: rawUid, email = '', name = '', phone = '', publicId = '', emailVerified = false,
    phoneVerified = false, verificationMode = 'email_unique', language = 'en', createdAtMs
  } = {}) {
    const uid = validUid(rawUid);
    if (!uid) throw Object.assign(new Error('A valid Firebase UID is required.'), { code: 'AUTH_UID_INVALID', httpStatus: 400 });
    const timestamp = Math.max(1, Math.trunc(Number(now()) || 1));
    const createdAt = Math.max(1, Math.trunc(Number(createdAtMs) || timestamp));
    const phoneInfo = await hashPhone(phone, cryptoImpl);
    const statements = [
      db.prepare(
        'INSERT INTO smv_domain_identity_users ' +
        '(firebase_project_id,uid,email,role,status,public_id,name,phone_e164,phone_hash,email_verified,profile_json,created_at_ms,updated_at_ms) ' +
        "VALUES (?,?,?,'customer','active',?,?,?,?,?,?,?,?) " +
        'ON CONFLICT(firebase_project_id,uid) DO UPDATE SET email=excluded.email,role=excluded.role,status=excluded.status,' +
        'public_id=excluded.public_id,name=excluded.name,phone_e164=excluded.phone_e164,phone_hash=excluded.phone_hash,' +
        'email_verified=excluded.email_verified,profile_json=excluded.profile_json,' +
        'updated_at_ms=MAX(smv_domain_identity_users.updated_at_ms,excluded.updated_at_ms)'
      ).bind(project, uid, clean(email, 254), clean(publicId, 100) || null, clean(name, 160),
        phoneInfo?.e164 || null, phoneInfo?.hash || null, emailVerified === true ? 1 : 0,
        safeProfile({ displayName: clean(name, 160), language: clean(language, 12) }), createdAt, timestamp)
    ];
    const idWrite = publicIdStatement(publicId, uid, 'customer', createdAt);
    if (idWrite) statements.push(idWrite);
    const phoneWrite = await phoneStatement(phone, uid, 'customer', verificationMode, phoneVerified, createdAt, timestamp);
    if (phoneWrite) statements.push(phoneWrite);
    await commit(statements);
    return Object.freeze({ uid, role: 'customer', status: 'active', publicId: clean(publicId, 100) });
  }

  async function upsertAstrologerProfile({
    uid: rawUid, email = '', name = '', phone = '', publicId = '', status = 'pending',
    specialization = '', experience = 0, bio = '', languages = [], emailVerified = false,
    phoneVerified = false, verificationMode = 'email_unique', createdAtMs
  } = {}) {
    const uid = validUid(rawUid);
    if (!uid) throw Object.assign(new Error('A valid Firebase UID is required.'), { code: 'AUTH_UID_INVALID', httpStatus: 400 });
    const normalizedStatus = ['pending', 'approved', 'rejected', 'suspended', 'disabled'].includes(clean(status, 24).toLowerCase())
      ? clean(status, 24).toLowerCase() : 'pending';
    const userStatus = normalizedStatus === 'approved' ? 'active' : normalizedStatus;
    const timestamp = Math.max(1, Math.trunc(Number(now()) || 1));
    const createdAt = Math.max(1, Math.trunc(Number(createdAtMs) || timestamp));
    const phoneInfo = await hashPhone(phone, cryptoImpl);
    const safeLanguages = Array.isArray(languages) ? languages.slice(0, 12).map(item => clean(item, 40)).filter(Boolean) : [];
    const profileJson = safeProfile({
      displayName: clean(name, 160), specialization: clean(specialization, 160),
      experience: Number(experience), bio: clean(bio, 5000), languages: safeLanguages
    });
    const statements = [
      db.prepare(
        'INSERT INTO smv_domain_identity_users ' +
        '(firebase_project_id,uid,email,role,status,public_id,name,phone_e164,phone_hash,email_verified,profile_json,created_at_ms,updated_at_ms) ' +
        "VALUES (?,?,?,'astrologer',?,?,?,?,?,?,?,?,?) " +
        'ON CONFLICT(firebase_project_id,uid) DO UPDATE SET email=excluded.email,role=excluded.role,' +
        'status=excluded.status,public_id=excluded.public_id,name=excluded.name,phone_e164=excluded.phone_e164,' +
        'phone_hash=excluded.phone_hash,email_verified=excluded.email_verified,profile_json=excluded.profile_json,' +
        'updated_at_ms=MAX(smv_domain_identity_users.updated_at_ms,excluded.updated_at_ms)'
      ).bind(project, uid, clean(email, 254), userStatus, clean(publicId, 100) || null,
        clean(name, 160), phoneInfo?.e164 || null, phoneInfo?.hash || null, emailVerified === true ? 1 : 0,
        profileJson, createdAt, timestamp),
      db.prepare(
        'INSERT INTO smv_domain_identity_astrologers ' +
        '(firebase_project_id,uid,public_id,status,profile_json,created_at_ms,updated_at_ms) VALUES (?,?,?,?,?,?,?) ' +
        'ON CONFLICT(firebase_project_id,uid) DO UPDATE SET public_id=excluded.public_id,status=excluded.status,' +
        'profile_json=excluded.profile_json,updated_at_ms=MAX(smv_domain_identity_astrologers.updated_at_ms,excluded.updated_at_ms)'
      ).bind(project, uid, clean(publicId, 100), normalizedStatus, profileJson, createdAt, timestamp)
    ];
    const idWrite = publicIdStatement(publicId, uid, 'astrologer', createdAt);
    if (idWrite) statements.push(idWrite);
    const phoneWrite = await phoneStatement(phone, uid, 'astrologer', verificationMode, phoneVerified, createdAt, timestamp);
    if (phoneWrite) statements.push(phoneWrite);
    await commit(statements);
    return Object.freeze({ uid, role: 'astrologer', status: normalizedStatus, publicId: clean(publicId, 100) });
  }
  return Object.freeze({ upsertCustomerProfile, upsertAstrologerProfile });
}
