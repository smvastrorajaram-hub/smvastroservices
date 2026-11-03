'use strict';

export const IDENTITY_PROFILE_SOURCE_COLLECTIONS = Object.freeze({
  users: 'smv_users',
  astrologers: 'smv_astrologers',
  legacyAstrologers: 'smv_astrologer',
  admins: 'smv_admins',
  phones: 'smv_phone_registry',
  publicIds: 'smv_public_ids',
  payouts: 'smv_payouts'
});

function error(code, message, httpStatus = 400) {
  return Object.assign(new Error(message || code), { code, httpStatus });
}
const str = value => String(value ?? '').trim();
const lower = value => str(value).toLowerCase();

function millis(value, fallback) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : fallback;
  if (value && typeof value.toMillis === 'function') {
    const n = Number(value.toMillis()); return Number.isFinite(n) ? Math.trunc(n) : fallback;
  }
  if (value && typeof value === 'object' && Number.isFinite(Number(value.seconds ?? value._seconds))) {
    return Math.trunc(Number(value.seconds ?? value._seconds) * 1000 +
      Number(value.nanoseconds ?? value._nanoseconds ?? 0) / 1e6);
  }
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (value) {
    const raw = str(value);
    const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw);
    const parsed = Date.parse(local ? raw + '+05:30' : raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function stable(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    if (Number.isFinite(Number(value.seconds ?? value._seconds)) &&
        Object.keys(value).some(key => key === 'seconds' || key === '_seconds')) {
      return new Date(millis(value, 0)).toISOString();
    }
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}
const stableJson = value => JSON.stringify(stable(value ?? {}));

function canonicalJsonValue(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object') return null;
    return JSON.stringify(stable(parsed));
  } catch {
    return null;
  }
}

function sameJsonValue(left, right) {
  const canonicalLeft = canonicalJsonValue(left);
  const canonicalRight = canonicalJsonValue(right);
  return canonicalLeft !== null && canonicalRight !== null && canonicalLeft === canonicalRight;
}

function safeProfileJson(value) {
  const blocked = /password|passwd|token|secret|private.?key|bank|account|ifsc|upi|payout/i;
  function clean(node, depth = 0) {
    if (depth > 16) return null;
    if (Array.isArray(node)) return node.slice(0, 1000).map(item => clean(item, depth + 1));
    if (!node || typeof node !== 'object' || node instanceof Date) {
      return node instanceof Date ? node.toISOString() : node;
    }
    const result = {};
    for (const [key, item] of Object.entries(node)) {
      if (item !== undefined && !blocked.test(key.replace(/[^A-Za-z0-9]/g, ''))) {
        result[key] = clean(item, depth + 1);
      }
    }
    return result;
  }
  return JSON.stringify(clean(value || {}));
}

export function normalizeIdentityPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1);
  else if (digits.length === 10) digits = '91' + digits;
  return digits.length >= 8 && digits.length <= 15 ? { digits, e164: '+' + digits } : null;
}
async function sha256(value, cryptoImpl) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + 0x8000)));
  }
  return btoa(binary);
}
function validId(value, max = 160) {
  const id = str(value);
  return id && id.length <= max && /^[A-Za-z0-9_-]+$/.test(id) ? id : '';
}
function rowUid(document) { return str(document?.data?.uid) || str(document?.id); }
function roleOf(value) {
  const role = lower(value);
  return role === 'customer' || role === 'astrologer' ? role : 'unknown';
}
function warningsSummary(items) {
  const counts = {};
  for (const item of items) for (const code of item.warnings) counts[code] = (counts[code] || 0) + 1;
  return Object.entries(counts).map(([code, count]) => ({ code, count }));
}

/**
 * Import and reconcile selected staging Identity/Profile collections into D1.
 * This module only calls Firestore listDocuments (read) and D1 batch (write).
 * It never manages Firebase Auth users or returns profile/payout values.
 */
export function createIdentityProfileBackfillService({
  db, firestore, sourceProjectId, environment = 'unknown',
  payoutEncryptionKey = '', payoutKeyVersion = 'v1',
  now = Date.now, cryptoImpl = globalThis.crypto
} = {}) {
  const project = str(sourceProjectId);
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function') {
    throw new TypeError('D1 is required for Identity/Profile backfill.');
  }
  if (!firestore || typeof firestore.listDocuments !== 'function' || typeof firestore.projectId !== 'string') {
    throw new TypeError('Firestore Admin REST listDocuments is required.');
  }
  if (environment !== 'staging' || project !== 'smv-astro-staging' || firestore.projectId !== project) {
    throw new TypeError('Identity/Profile backfill accepts only the isolated smv-astro-staging project.');
  }
  if (typeof cryptoImpl?.subtle?.digest !== 'function') throw new TypeError('Web Crypto SHA-256 is required.');

  const statement = (sql, values = []) => db.prepare(sql).bind(...values);
  let payoutKeyPromise = null;
  async function getPayoutKey() {
    const encoded = str(payoutEncryptionKey);
    if (!encoded) return null;
    if (!payoutKeyPromise) {
      payoutKeyPromise = (async () => {
        let binary;
        try {
          const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
          binary = atob(normalized);
        } catch {
          throw new TypeError('SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY must be base64-encoded 32-byte key material.');
        }
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        if (bytes.length !== 32) throw new TypeError('SMV_IDENTITY_PAYOUT_ENCRYPTION_KEY must decode to exactly 32 bytes.');
        return cryptoImpl.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      })();
    }
    return payoutKeyPromise;
  }
  async function encryptPayoutPayload(data, uid) {
    const key = await getPayoutKey();
    if (!key) return null;
    const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
    const additionalData = new TextEncoder().encode(project + ':' + uid);
    const plaintext = new TextEncoder().encode(stableJson(data));
    const ciphertext = await cryptoImpl.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, plaintext
    );
    return JSON.stringify({
      version: 1, algorithm: 'A256GCM', keyVersion: str(payoutKeyVersion) || 'v1',
      iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext))
    });
  }
  async function decryptPayoutPayload(envelopeValue, uid) {
    const key = await getPayoutKey();
    if (!key) return null;
    try {
      const envelope = JSON.parse(str(envelopeValue));
      if (envelope?.version !== 1 || envelope?.algorithm !== 'A256GCM' ||
          envelope?.keyVersion !== (str(payoutKeyVersion) || 'v1')) return null;
      const iv = Uint8Array.from(atob(str(envelope.iv)), character => character.charCodeAt(0));
      const ciphertext = Uint8Array.from(atob(str(envelope.ciphertext)), character => character.charCodeAt(0));
      if (iv.length !== 12 || !ciphertext.length) return null;
      const plaintext = await cryptoImpl.subtle.decrypt({
        name: 'AES-GCM', iv,
        additionalData: new TextEncoder().encode(project + ':' + uid),
        tagLength: 128
      }, key, ciphertext);
      return JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      return null;
    }
  }

  async function readPage({ collection, pageToken = '', pageSize = 20 } = {}) {
    const path = IDENTITY_PROFILE_SOURCE_COLLECTIONS[collection];
    if (!path) throw error('IDENTITY_BACKFILL_COLLECTION_UNSUPPORTED', 'Unsupported Identity/Profile collection.');
    if (str(pageToken).length > 4096) throw error('IDENTITY_BACKFILL_PAGE_TOKEN_INVALID', 'Invalid source page token.');
    const size = Number(pageSize);
    if (!Number.isSafeInteger(size) || size < 1 || size > 25) {
      throw error('IDENTITY_BACKFILL_PAGE_SIZE_INVALID', 'Page size must be a whole number from 1 to 25.');
    }
    const page = await firestore.listDocuments(path, { pageSize: size, pageToken: str(pageToken) });
    return { sourceCollection: path, documents: Array.isArray(page.documents) ? page.documents : [],
      nextPageToken: str(page.nextPageToken) };
  }

  async function prepare(collection, document) {
    const data = document?.data && typeof document.data === 'object' ? document.data : {};
    const id = str(document?.id);
    const uid = rowUid(document);
    const warnings = [];
    const statements = [];
    if (!id || id.length > 1500) return { id, uid, warnings: ['SOURCE_DOCUMENT_ID_INVALID'], statements, hash: '' };
    const nowMs = Number(now());
    const createdAt = millis(data.createdAt, millis(document.createTime, nowMs));
    const updatedAt = Math.max(createdAt, millis(data.updatedAt, millis(document.updateTime, nowMs)));
    const sourceUpdateTime = document.updateTime instanceof Date
      ? document.updateTime.toISOString() : new Date(updatedAt).toISOString();
    const hash = await sha256(stableJson(data), cryptoImpl);

    function addPublicId(value, owner, role) {
      const publicId = validId(value, 100);
      if (!publicId) { if (str(value)) warnings.push('PUBLIC_ID_INVALID'); return; }
      if (!owner || !['customer', 'astrologer'].includes(role)) {
        warnings.push('PUBLIC_ID_OWNER_OR_ROLE_INVALID'); return;
      }
      statements.push({
        kind: 'public_id',
        sql: `INSERT INTO smv_domain_identity_public_ids
          (public_id,firebase_project_id,uid,role,created_at_ms) VALUES (?,?,?,?,?)
          ON CONFLICT(public_id) DO UPDATE SET
            firebase_project_id=excluded.firebase_project_id,uid=excluded.uid,role=excluded.role
          WHERE smv_domain_identity_public_ids.firebase_project_id=excluded.firebase_project_id
            AND smv_domain_identity_public_ids.uid=excluded.uid
            AND smv_domain_identity_public_ids.role=excluded.role`,
        values: [publicId, project, owner, role, createdAt]
      });
    }

    async function addPhone(value, owner, role, mode, verified) {
      if (!str(value)) return;
      const phone = normalizeIdentityPhone(value);
      if (!phone) { warnings.push('PHONE_FORMAT_UNSUPPORTED'); return; }
      if (!owner || !['customer', 'astrologer'].includes(role)) {
        warnings.push('PHONE_OWNER_OR_ROLE_INVALID'); return;
      }
      const phoneHash = await sha256(phone.digits, cryptoImpl);
      statements.push({
        kind: 'phone',
        sql: `INSERT INTO smv_domain_identity_phones
          (phone_hash,firebase_project_id,uid,phone_e164,role,verification_mode,phone_verified,created_at_ms,updated_at_ms)
          VALUES (?,?,?,?,?,?,?,?,?)
          ON CONFLICT(phone_hash) DO UPDATE SET
            phone_e164=CASE WHEN excluded.updated_at_ms>=smv_domain_identity_phones.updated_at_ms THEN excluded.phone_e164 ELSE smv_domain_identity_phones.phone_e164 END,
            role=CASE WHEN excluded.updated_at_ms>=smv_domain_identity_phones.updated_at_ms THEN excluded.role ELSE smv_domain_identity_phones.role END,
            verification_mode=CASE WHEN excluded.updated_at_ms>=smv_domain_identity_phones.updated_at_ms THEN excluded.verification_mode ELSE smv_domain_identity_phones.verification_mode END,
            phone_verified=CASE WHEN excluded.updated_at_ms>=smv_domain_identity_phones.updated_at_ms THEN excluded.phone_verified ELSE smv_domain_identity_phones.phone_verified END,
            updated_at_ms=MAX(smv_domain_identity_phones.updated_at_ms,excluded.updated_at_ms)
          WHERE smv_domain_identity_phones.firebase_project_id=excluded.firebase_project_id
            AND smv_domain_identity_phones.uid=excluded.uid`,
        values: [phoneHash, project, owner, phone.e164, role, str(mode) || 'email_unique',
          verified === true ? 1 : 0, createdAt, updatedAt]
      });
    }

    if (collection === 'users') {
      if (!validId(uid)) warnings.push('USER_UID_INVALID');
      else {
        const role = roleOf(data.role);
        const rawPhone = data.phoneNormalized || data.phone || data.mobile || '';
        const phone = normalizeIdentityPhone(rawPhone);
        const phoneHash = phone ? await sha256(phone.digits, cryptoImpl) : null;
        const publicId = str(data.publicId || data.customerId);
        statements.push({
          kind: 'user',
          sql: `INSERT INTO smv_domain_identity_users
            (firebase_project_id,uid,email,role,status,public_id,name,phone_e164,phone_hash,email_verified,profile_json,created_at_ms,updated_at_ms)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(firebase_project_id,uid) DO UPDATE SET
              email=excluded.email,role=excluded.role,status=excluded.status,
              public_id=excluded.public_id,name=excluded.name,phone_e164=excluded.phone_e164,
              phone_hash=excluded.phone_hash,email_verified=excluded.email_verified,
              profile_json=excluded.profile_json,
              updated_at_ms=MAX(smv_domain_identity_users.updated_at_ms,excluded.updated_at_ms)
            WHERE excluded.updated_at_ms>=smv_domain_identity_users.updated_at_ms`,
          values: [project, uid, str(data.email), role, lower(data.status) || 'pending',
            publicId || null, str(data.name || data.fullName || data.displayName).slice(0, 160),
            phone?.e164 || null, phoneHash,
            data.emailVerified === true || data.email_verified === true ? 1 : 0,
            safeProfileJson(data), createdAt, updatedAt]
        });
        if (publicId) addPublicId(publicId, uid, role);
        await addPhone(rawPhone, uid, role,
          data.verificationMethod === 'whatsapp' ? 'whatsapp' : 'email_unique',
          data.phoneVerified === true);
      }
    } else if (collection === 'astrologers' || collection === 'legacyAstrologers') {
      if (!validId(uid)) warnings.push('ASTROLOGER_UID_INVALID');
      else {
        const publicId = str(data.publicId);
        statements.push({
          kind: 'astrologer',
          sql: `INSERT INTO smv_domain_identity_astrologers
            (firebase_project_id,uid,public_id,status,profile_json,created_at_ms,updated_at_ms)
            VALUES (?,?,?,?,?,?,?)
            ON CONFLICT(firebase_project_id,uid) DO UPDATE SET
              public_id=excluded.public_id,status=excluded.status,profile_json=excluded.profile_json,
              updated_at_ms=MAX(smv_domain_identity_astrologers.updated_at_ms,excluded.updated_at_ms)
            WHERE excluded.updated_at_ms>=smv_domain_identity_astrologers.updated_at_ms`,
          values: [project, uid, publicId, lower(data.status) || 'pending',
            safeProfileJson(data), createdAt, updatedAt]
        });
        if (publicId) addPublicId(publicId, uid, 'astrologer');
      }
    } else if (collection === 'admins') {
      if (!validId(uid)) warnings.push('ADMIN_UID_INVALID');
      else statements.push({
        kind: 'admin',
        sql: `INSERT INTO smv_domain_identity_admins
          (firebase_project_id,uid,source,created_at_ms,updated_at_ms) VALUES (?,?,?,?,?)
          ON CONFLICT(firebase_project_id,uid) DO UPDATE SET
            updated_at_ms=MAX(smv_domain_identity_admins.updated_at_ms,excluded.updated_at_ms)`,
        values: [project, uid, 'migrated_admin_allowlist', createdAt, updatedAt]
      });
    } else if (collection === 'phones') {
      const owner = validId(data.uid);
      const role = roleOf(data.role);
      const rawPhone = data.phoneNormalized || data.phone || data.mobile || '';
      const phone = normalizeIdentityPhone(rawPhone);
      if (!owner || !phone || !['customer', 'astrologer'].includes(role)) {
        warnings.push('PHONE_REGISTRY_RECORD_INVALID');
      } else if (await sha256(phone.digits, cryptoImpl) !== id) {
        warnings.push('PHONE_REGISTRY_HASH_MISMATCH');
      } else {
        await addPhone(rawPhone, owner, role,
          data.verificationMode === 'whatsapp' ? 'whatsapp' : 'email_unique',
          data.phoneVerified === true);
      }
    } else if (collection === 'publicIds') {
      const publicId = validId(data.publicId || id, 100);
      const owner = validId(data.uid);
      const role = roleOf(data.role);
      if (!publicId || !owner || !['customer', 'astrologer'].includes(role) ||
          (str(data.publicId) && str(data.publicId) !== id)) {
        warnings.push('PUBLIC_ID_SOURCE_RECORD_INVALID');
      } else addPublicId(publicId, owner, role);
    } else if (collection === 'payouts') {
      if (!validId(uid)) warnings.push('PAYOUT_UID_INVALID');
      else {
        const encryptedPayload = await encryptPayoutPayload(data, uid);
        if (!encryptedPayload) warnings.push('PAYOUT_ENCRYPTION_KEY_MISSING');
        else statements.push({
          kind: 'payout',
          sql: `INSERT INTO smv_domain_identity_payout_profiles
            (firebase_project_id,uid,payload_json,created_at_ms,updated_at_ms) VALUES (?,?,?,?,?)
            ON CONFLICT(firebase_project_id,uid) DO UPDATE SET
              payload_json=excluded.payload_json,
              updated_at_ms=MAX(smv_domain_identity_payout_profiles.updated_at_ms,excluded.updated_at_ms)
            WHERE excluded.updated_at_ms>=smv_domain_identity_payout_profiles.updated_at_ms`,
          values: [project, uid, encryptedPayload, createdAt, updatedAt]
        });
      }
    }

    statements.push({
      kind: 'audit',
      sql: `INSERT INTO smv_domain_identity_import_audit
        (source_project_id,source_collection,document_id,uid,source_update_time,source_payload_sha256,mapping_status,warning_codes,imported_at_ms)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(source_project_id,source_collection,document_id) DO UPDATE SET
          uid=excluded.uid,source_update_time=excluded.source_update_time,
          source_payload_sha256=excluded.source_payload_sha256,
          mapping_status=excluded.mapping_status,warning_codes=excluded.warning_codes,
          imported_at_ms=excluded.imported_at_ms`,
      values: [project, IDENTITY_PROFILE_SOURCE_COLLECTIONS[collection], id, uid || null,
        sourceUpdateTime, hash, warnings.length ? 'warning' : 'mapped',
        JSON.stringify([...new Set(warnings)].sort()), Number(now())]
    });
    return { id, uid, hash, statements, warnings: [...new Set(warnings)], sourceData: data };
  }

  async function preparePage(options) {
    const page = await readPage(options);
    const items = [];
    for (const document of page.documents) items.push(await prepare(options.collection, document));
    return { ...page, items };
  }

  async function previewPage(options = {}) {
    const page = await preparePage(options);
    return {
      sourceProjectId: project, collection: options.collection,
      sourceCollection: page.sourceCollection, sourceDocuments: page.items.length,
      plannedD1Statements: page.items.reduce((n, item) => n + item.statements.length, 0),
      mappableDocuments: page.items.filter(item => !item.warnings.length).length,
      warningCounts: warningsSummary(page.items), nextPageToken: page.nextPageToken,
      writesPerformed: 0, personalDataReturned: false, sourceDataDeleted: false
    };
  }

  async function applyPage(options = {}) {
    const page = await preparePage(options);
    if (page.items.some(item => item.warnings.length)) {
      throw error('IDENTITY_BACKFILL_SOURCE_WARNINGS',
        'This page contains invalid or conflicting source records. Resolve preview warnings first.', 409);
    }
    const batch = page.items.flatMap(item => item.statements.map(entry => statement(entry.sql, entry.values)));
    if (batch.length > 400) throw error('IDENTITY_BACKFILL_PAGE_TOO_LARGE', 'Reduce page size before applying.', 400);
    if (batch.length) {
      const result = await db.batch(batch);
      if (!Array.isArray(result) || result.length !== batch.length || result.some(row => row?.success === false)) {
        throw error('IDENTITY_BACKFILL_BATCH_INCOMPLETE', 'D1 did not confirm every import statement.', 503);
      }
    }
    return {
      sourceProjectId: project, collection: options.collection,
      sourceCollection: page.sourceCollection, sourceDocuments: page.items.length,
      importedDocuments: page.items.length, nextPageToken: page.nextPageToken,
      writesPerformed: batch.length, personalDataReturned: false, sourceDataDeleted: false
    };
  }

  async function reconcilePage(options = {}) {
    const page = await preparePage(options);
    let auditMissing = 0, payloadMismatches = 0, targetMappingsMissing = 0;
    let targetMappingMismatches = 0, warningCount = 0;
    const samples = {
      auditMissing: [], payloadMismatches: [], targetMappingsMissing: [],
      targetMappingMismatches: [], warnings: []
    };

    function recordSample(key, value) {
      if (samples[key].length < 10) samples[key].push(value);
    }

    for (const item of page.items) {
      const audit = await statement(
        `SELECT source_payload_sha256,mapping_status FROM smv_domain_identity_import_audit
          WHERE source_project_id=? AND source_collection=? AND document_id=? LIMIT 1`,
        [project, page.sourceCollection, item.id]
      ).first();
      if (!audit) {
        auditMissing += 1;
        recordSample('auditMissing', item.id);
      } else {
        if (str(audit.source_payload_sha256) !== item.hash) {
          payloadMismatches += 1;
          recordSample('payloadMismatches', item.id);
        }
        if (str(audit.mapping_status) !== 'mapped') warningCount += 1;
      }

      if (item.warnings.length) {
        warningCount += item.warnings.length;
        for (const warning of item.warnings) recordSample('warnings', warning);
      }

      for (const entry of item.statements.filter(value => value.kind !== 'audit')) {
        const specs = {
          user: {
            sql: 'SELECT email,role,status,public_id,name,phone_e164,phone_hash,email_verified,profile_json ' +
              'FROM smv_domain_identity_users WHERE firebase_project_id=? AND uid=? LIMIT 1',
            values: [project, item.uid]
          },
          astrologer: {
            sql: 'SELECT public_id,status,profile_json FROM smv_domain_identity_astrologers ' +
              'WHERE firebase_project_id=? AND uid=? LIMIT 1',
            values: [project, item.uid]
          },
          admin: {
            sql: 'SELECT source FROM smv_domain_identity_admins WHERE firebase_project_id=? AND uid=? LIMIT 1',
            values: [project, item.uid]
          },
          payout: {
            sql: 'SELECT payload_json FROM smv_domain_identity_payout_profiles ' +
              'WHERE firebase_project_id=? AND uid=? LIMIT 1',
            values: [project, item.uid]
          },
          phone: {
            sql: 'SELECT firebase_project_id,uid,phone_e164,role,verification_mode,phone_verified ' +
              'FROM smv_domain_identity_phones WHERE phone_hash=? LIMIT 1',
            values: [entry.values[0]]
          },
          public_id: {
            sql: 'SELECT firebase_project_id,uid,role FROM smv_domain_identity_public_ids WHERE public_id=? LIMIT 1',
            values: [entry.values[0]]
          }
        }[entry.kind];
        if (!specs) continue;
        const row = await statement(specs.sql, specs.values).first();
        if (!row) {
          targetMappingsMissing += 1;
          recordSample('targetMappingsMissing', entry.kind);
          continue;
        }

        let ownerMismatch = false;
        if (entry.kind === 'phone' || entry.kind === 'public_id') {
          ownerMismatch = str(row.uid) !== str(entry.values[2]) ||
            str(row.firebase_project_id) !== project;
        }
        if (ownerMismatch) {
          targetMappingsMissing += 1;
          recordSample('targetMappingsMissing', entry.kind + ':owner');
          continue;
        }

        let matches = true;
        let mismatchFields = [];
        if (entry.kind === 'user') {
          const v = entry.values;
          const checks = [
            ['email', str(row.email) === str(v[2])],
            ['role', str(row.role) === str(v[3])],
            ['status', str(row.status) === str(v[4])],
            ['public_id', str(row.public_id || '') === str(v[5] || '')],
            ['name', str(row.name) === str(v[6])],
            ['phone_e164', str(row.phone_e164 || '') === str(v[7] || '')],
            ['phone_hash', str(row.phone_hash || '') === str(v[8] || '')],
            ['email_verified', Number(row.email_verified) === Number(v[9])],
            ['profile_json', sameJsonValue(row.profile_json, v[10])]
          ];
          mismatchFields = checks.filter(([, equal]) => !equal).map(([field]) => field);
          matches = mismatchFields.length === 0;
        } else if (entry.kind === 'astrologer') {
          const v = entry.values;
          const checks = [
            ['public_id', str(row.public_id || '') === str(v[2] || '')],
            ['status', str(row.status) === str(v[3])],
            ['profile_json', sameJsonValue(row.profile_json, v[4])]
          ];
          mismatchFields = checks.filter(([, equal]) => !equal).map(([field]) => field);
          matches = mismatchFields.length === 0;
        } else if (entry.kind === 'admin') {
          matches = str(row.source) === str(entry.values[2]);
          if (!matches) mismatchFields = ['source'];
        } else if (entry.kind === 'payout') {
          const restored = await decryptPayoutPayload(row.payload_json, item.uid);
          matches = !!restored && stableJson(restored) === stableJson(item.sourceData);
          if (!matches) mismatchFields = ['encrypted_payload'];
        } else if (entry.kind === 'phone') {
          const v = entry.values;
          const checks = [
            ['phone_e164', str(row.phone_e164) === str(v[3])],
            ['role', str(row.role) === str(v[4])],
            ['verification_mode', str(row.verification_mode) === str(v[5])],
            ['phone_verified', Number(row.phone_verified) === Number(v[6])]
          ];
          mismatchFields = checks.filter(([, equal]) => !equal).map(([field]) => field);
          matches = mismatchFields.length === 0;
        } else if (entry.kind === 'public_id') {
          const v = entry.values;
          matches = str(row.role) === str(v[3]);
          if (!matches) mismatchFields = ['role'];
        }

        if (!matches) {
          targetMappingMismatches += 1;
          recordSample('targetMappingMismatches',
            entry.kind + ':' + mismatchFields.join(','));
        }
      }
    }

    return {
      sourceProjectId: project, collection: options.collection, sourceCollection: page.sourceCollection,
      sourceDocuments: page.items.length, auditMissing, payloadMismatches,
      targetMappingsMissing, targetMappingMismatches, warningCount, samples,
      nextPageToken: page.nextPageToken,
      writesPerformed: 0, personalDataReturned: false, sourceDataDeleted: false, cutoverSafe: false
    };
  }

  async function status() {
    const rows = await statement(
      `SELECT source_collection,COUNT(*) AS imported_documents,
        SUM(CASE WHEN mapping_status='warning' THEN 1 ELSE 0 END) AS warning_documents,
        MAX(imported_at_ms) AS latest_import_at_ms
        FROM smv_domain_identity_import_audit WHERE source_project_id=?
        GROUP BY source_collection ORDER BY source_collection`,
      [project]
    ).all();
    const meta = await statement(
      'SELECT inventory_complete,reconciliation_complete,source_quiesced FROM smv_domain_identity_migration_meta WHERE source_project_id=? LIMIT 1',
      [project]
    ).first();
    return {
      sourceProjectId: project, sourceCollections: rows?.results || [],
      migrationFlags: meta || { inventory_complete: 0, reconciliation_complete: 0, source_quiesced: 0 },
      personalDataReturned: false, cutoverSafe: false
    };
  }

  return Object.freeze({ readPage, previewPage, applyPage, reconcilePage, status });
}
