import {
  WALLET_DOMAIN_BACKFILL_COLLECTIONS,
  mapLegacyWalletDomainDocument
} from './wallet-domain-backfill.mjs';

function backfillError(code, message, status = 400) {
  return Object.assign(new Error(message || code), { code, httpStatus: status });
}

function stable(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    if (Number.isFinite(Number(value.seconds ?? value._seconds)) &&
        Number.isFinite(Number(value.nanoseconds ?? value._nanoseconds ?? 0)) &&
        Object.keys(value).some(key => key === 'seconds' || key === '_seconds')) {
      const ms = Number(value.seconds ?? value._seconds) * 1000 +
        Number(value.nanoseconds ?? value._nanoseconds ?? 0) / 1_000_000;
      return new Date(ms).toISOString();
    }
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stable(value ?? {}));
}

async function sha256(value, cryptoImpl) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(String(value)));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeParentId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9_-]{1,180}$/.test(id) ? id : '';
}

function sourceCollectionPath(key, parentId = '') {
  const definition = WALLET_DOMAIN_BACKFILL_COLLECTIONS[key];
  if (!definition) throw backfillError('BACKFILL_COLLECTION_UNSUPPORTED', 'The requested migration collection is not supported.');
  if (definition.child) {
    const parent = safeParentId(parentId);
    if (!parent) throw backfillError('BACKFILL_PARENT_REQUIRED', 'A valid Live Session ID is required for its messages/signals.');
    return definition.path + '/' + parent + '/' + definition.child;
  }
  if (definition.named) throw backfillError('BACKFILL_NAMED_COLLECTION', 'Billing settings are read one document at a time.');
  return definition.path;
}

function filterDocuments(key, documents) {
  const filter = WALLET_DOMAIN_BACKFILL_COLLECTIONS[key]?.filter;
  return filter ? documents.filter(document => filter(document.data || {})) : documents;
}

function mappedTargetPath(key, document, parentId = '') {
  const data = document.data || {};
  const id = String(document.id || '');
  switch (key) {
    case 'wallets': return { table:'smv_domain_wallets', sql:'SELECT owner_uid FROM smv_domain_wallets WHERE owner_uid=?', values:[String(data.ownerUid || id)] };
    case 'walletTransactions': return { table:'smv_domain_legacy_wallet_transactions', sql:'SELECT source_document_id FROM smv_domain_legacy_wallet_transactions WHERE source_document_id=?', values:[id] };
    case 'walletRecharges': return { table:'smv_domain_legacy_wallet_recharges', sql:'SELECT recharge_id FROM smv_domain_legacy_wallet_recharges WHERE recharge_id=?', values:[id] };
    case 'walletRechargeOffers': return { table:'smv_domain_wallet_offers', sql:'SELECT offer_id FROM smv_domain_wallet_offers WHERE offer_id=?', values:[id] };
    case 'walletOfferUsageCounters': return { table:'smv_domain_wallet_offer_redemption_usage', sql:'SELECT offer_id FROM smv_domain_wallet_offer_redemption_usage WHERE offer_id=? AND customer_uid=?', values:[String(data.offerId || ''),String(data.customerUid || data.customerId || '')] };
    case 'liveSessions': return { table:'smv_domain_live_sessions', sql:'SELECT session_id FROM smv_domain_live_sessions WHERE session_id=?', values:[id] };
    case 'liveBookings': return { table:'smv_domain_live_bookings', sql:'SELECT booking_id FROM smv_domain_live_bookings WHERE booking_id=?', values:[id] };
    case 'liveSessionMessages': return { table:'smv_domain_live_messages', sql:'SELECT message_id FROM smv_domain_live_messages WHERE session_id=? AND message_id=?', values:[parentId,id] };
    case 'liveSessionSignals': return { table:'smv_domain_live_signals', sql:'SELECT signal_id FROM smv_domain_live_signals WHERE session_id=? AND signal_id=?', values:[parentId,id] };
    case 'scheduledCallChatAppointments': return { table:'smv_domain_scheduled_appointments', sql:'SELECT appointment_id FROM smv_domain_scheduled_appointments WHERE appointment_id=?', values:[id] };
    case 'liveSessionEarnings': return { table:'smv_domain_earnings', sql:'SELECT earning_id FROM smv_domain_earnings WHERE earning_id=?', values:[id] };
    case 'withdrawals': return { table:'smv_domain_withdrawals', sql:'SELECT withdrawal_id FROM smv_domain_withdrawals WHERE withdrawal_id=?', values:[id] };
    case 'withdrawalPayouts': return { table:'smv_domain_withdrawal_payouts', sql:'SELECT withdrawal_id FROM smv_domain_withdrawal_payouts WHERE withdrawal_id=?', values:[id] };
    case 'razorpayWebhookEvents': return { table:'smv_domain_razorpay_webhook_events', sql:'SELECT event_key FROM smv_domain_razorpay_webhook_events WHERE event_key=?', values:[id] };
    case 'billingSettings': return { table:'smv_domain_settings', sql:'SELECT setting_id FROM smv_domain_settings WHERE setting_id=?', values:[id] };
    default: return null;
  }
}

export function createWalletDomainBackfillService({ db, firestore, now = Date.now, cryptoImpl = globalThis.crypto } = {}) {
  if (!db || typeof db.prepare !== 'function' || typeof db.batch !== 'function' ||
      !firestore || typeof firestore.listDocuments !== 'function' ||
      typeof firestore.getDocument !== 'function' ||
      typeof cryptoImpl?.subtle?.digest !== 'function') {
    throw new TypeError('D1, Firestore Admin REST and Web Crypto are required for Wallet backfill.');
  }

  function statement(sql, values = []) {
    return db.prepare(sql).bind(...values);
  }

  async function readPage({ collection, pageToken = '', parentId = '', pageSize = 40 } = {}) {
    const definition = WALLET_DOMAIN_BACKFILL_COLLECTIONS[collection];
    if (!definition) throw backfillError('BACKFILL_COLLECTION_UNSUPPORTED', 'The requested migration collection is not supported.');
    const size = Math.max(1, Math.min(100, Math.floor(Number(pageSize) || 40)));
    if (definition.named) {
      const names = definition.named;
      const index = Math.max(0, Math.min(names.length, Number(pageToken) || 0));
      if (index >= names.length) return { documents:[], nextPageToken:'', sourceCollection:definition.path };
      const id = names[index];
      const doc = await firestore.getDocument(definition.path + '/' + id);
      return {
        documents: doc.exists ? [{ ...doc, id, data:doc.data || {} }] : [],
        nextPageToken: index + 1 < names.length ? String(index + 1) : '',
        sourceCollection:definition.path
      };
    }
    const path = sourceCollectionPath(collection,parentId);
    const page = await firestore.listDocuments(path,{pageSize:size,pageToken:String(pageToken || '')});
    return {
      documents:filterDocuments(collection,page.documents || []),
      nextPageToken:String(page.nextPageToken || ''),
      sourceCollection:path
    };
  }

  async function preparePageDocuments({ collection, pageToken = '', parentId = '', pageSize = 40 } = {}) {
    const page = await readPage({collection,pageToken,parentId,pageSize});
    const items = [];
    for (const document of page.documents) {
      const canonical = stableJson(document.data || {});
      const digest = await sha256(canonical,cryptoImpl);
      const prepared = { ...document, payloadSha256:digest };
      const mapped = mapLegacyWalletDomainDocument(collection,prepared,{parentId,nowMs:Number(now())});
      items.push({ document:prepared, mapped, canonical });
    }
    return { ...page, items };
  }

  async function previewPage(options = {}) {
    const page = await preparePageDocuments(options);
    const warnings = page.items.filter(item => item.mapped.warning).map(item => ({
      documentId:item.document.id, code:item.mapped.warning
    }));
    return {
      collection:options.collection,
      sourceCollection:page.sourceCollection,
      sourceDocuments:page.items.length,
      domainMapped:page.items.filter(item => item.mapped.mapped).length,
      rawArchiveOnly:page.items.filter(item => !item.mapped.mapped && !item.mapped.warning).length,
      warnings:warnings.slice(0,20),
      nextPageToken:page.nextPageToken,
      writesPerformed:0
    };
  }

  async function applyPage(options = {}) {
    const page = await preparePageDocuments(options);
    const statements = page.items.flatMap(item => item.mapped.statements.map(entry =>
      statement(entry.sql,entry.values)
    ));
    if (statements.length > 350) {
      throw backfillError('BACKFILL_PAGE_TOO_LARGE','Reduce pageSize before applying this page.',400);
    }
    if (statements.length) {
      const results = await db.batch(statements);
      if (!Array.isArray(results) || results.length !== statements.length ||
          results.some(result => result?.success === false)) {
        throw backfillError('BACKFILL_BATCH_INCOMPLETE','The D1 page import did not complete atomically.',503);
      }
    }
    const byKind = {};
    for (const item of page.items) {
      for (const entry of item.mapped.statements) byKind[entry.kind] = (byKind[entry.kind] || 0) + 1;
    }
    return {
      collection:options.collection,
      sourceCollection:page.sourceCollection,
      sourceDocuments:page.items.length,
      targetStatements:statements.length,
      domainMapped:page.items.filter(item => item.mapped.mapped).length,
      rawArchiveOnly:page.items.filter(item => !item.mapped.mapped && !item.mapped.warning).length,
      warnings:page.items.filter(item => item.mapped.warning).map(item=>({documentId:item.document.id,code:item.mapped.warning})).slice(0,20),
      statementCounts:byKind,
      nextPageToken:page.nextPageToken,
      writesPerformed:statements.length
    };
  }

  async function reconcilePage(options = {}) {
    const page = await preparePageDocuments(options);
    const ids = page.items.map(item=>item.document.id);
    const sourcePath = page.sourceCollection;
    let archived = new Map();
    if (ids.length) {
      const placeholders = ids.map(()=>'?').join(',');
      const result = await statement(
        `SELECT document_id,payload_sha256 FROM smv_domain_legacy_documents
         WHERE source_collection=? AND document_id IN (${placeholders})`,
        [sourcePath,...ids]
      ).all();
      archived = new Map((result?.results || []).map(row=>[String(row.document_id),String(row.payload_sha256 || '')]));
    }
    const missing = [], mismatched = [], mappingMissing = [], warnings = [];
    for (const item of page.items) {
      const id = item.document.id;
      const sourceHash = item.document.payloadSha256;
      const targetHash = archived.get(id);
      if (!targetHash) missing.push(id);
      else if (targetHash !== sourceHash) mismatched.push(id);
      const target = mappedTargetPath(options.collection,item.document,options.parentId);
      if (item.mapped.warning) warnings.push({documentId:id,code:item.mapped.warning});
      if (target && item.mapped.mapped) {
        const row = await statement(target.sql,target.values).first();
        if (!row) mappingMissing.push({documentId:id,table:target.table});
      }
    }
    return {
      collection:options.collection,
      sourceCollection:sourcePath,
      sourceDocuments:page.items.length,
      archivedMatches:page.items.length-missing.length-mismatched.length,
      missingInD1Archive:missing.length,
      payloadMismatches:mismatched.length,
      normalizedMappingsMissing:mappingMissing.length,
      warningCount:warnings.length,
      samples:{
        missingInD1Archive:missing.slice(0,20),
        payloadMismatches:mismatched.slice(0,20),
        normalizedMappingsMissing:mappingMissing.slice(0,20),
        warnings:warnings.slice(0,20)
      },
      nextPageToken:page.nextPageToken,
      writesPerformed:0,
      sourceDataDeleted:false
    };
  }

  async function assertSourceQuiescent() {
    if (typeof firestore.runQuery !== 'function') {
      throw backfillError('BACKFILL_PREFLIGHT_UNAVAILABLE','Firestore query support is required for the cutover preflight.',503);
    }
    const [activeSessions,pendingBookings,reservedBookings,pendingRecharges] = await Promise.all([
      firestore.runQuery({collectionPath:'smv_live_sessions',filters:[{field:'state',op:'in',value:['ringing','preparing','connecting','active']}],limit:1}),
      firestore.runQuery({collectionPath:'smv_live_bookings',filters:[{field:'status',op:'==',value:'pending'}],limit:1}),
      firestore.runQuery({collectionPath:'smv_live_bookings',filters:[{field:'walletReservationState',op:'==',value:'reserved'}],limit:1}),
      firestore.runQuery({collectionPath:'smv_wallet_recharges',filters:[{field:'status',op:'in',value:['creating','order_created','payment_pending','created','pending','processing']}],limit:1})
    ]);
    const blockers = [];
    if (activeSessions.length) blockers.push('active_or_connecting_live_session');
    if (pendingBookings.length) blockers.push('pending_live_booking');
    if (reservedBookings.length) blockers.push('wallet_reserved_live_booking');
    if (pendingRecharges.length) blockers.push('non_terminal_wallet_recharge');
    return { ok:blockers.length===0,blockers };
  }

  async function status() {
    const result = await statement(
      `SELECT source_collection,COUNT(*) AS imported_documents,MAX(imported_at_ms) AS latest_import_at_ms
       FROM smv_domain_legacy_documents GROUP BY source_collection ORDER BY source_collection`
    ).all();
    const target = await statement(
      `SELECT
        (SELECT COUNT(*) FROM smv_domain_wallets) AS wallets,
        (SELECT COUNT(*) FROM smv_domain_legacy_wallet_transactions) AS legacy_wallet_transactions,
        (SELECT COUNT(*) FROM smv_domain_legacy_wallet_recharges) AS legacy_wallet_recharges,
        (SELECT COUNT(*) FROM smv_domain_wallet_offers) AS wallet_offers,
        (SELECT COUNT(*) FROM smv_domain_live_sessions) AS live_sessions,
        (SELECT COUNT(*) FROM smv_domain_live_bookings) AS live_bookings,
        (SELECT COUNT(*) FROM smv_domain_legacy_documents) AS archived_documents`
    ).first();
    return { collections:result?.results || [], target:target || {} };
  }

  return Object.freeze({ readPage,previewPage,applyPage,reconcilePage,assertSourceQuiescent,status });
}
