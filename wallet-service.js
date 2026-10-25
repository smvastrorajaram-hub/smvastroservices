'use strict';

const crypto = require('node:crypto');

const WALLET_COLLECTION = 'smv_wallets';
const TRANSACTION_COLLECTION = 'smv_wallet_transactions';
const RECHARGE_COLLECTION = 'smv_wallet_recharges';
const CUSTOMER_WELCOME_CREDIT_PAISE = 2500;

function parseRupeesToPaise(value, { allowZero = false } = {}) {
  const raw = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ''] = raw.split('.');
  const paise = Number(whole) * 100 + Number((fraction + '00').slice(0, 2));
  if (!Number.isSafeInteger(paise) || paise < 0 || (!allowZero && paise === 0)) return null;
  return paise;
}

function paiseToRupees(value) {
  const paise = Number(value);
  if (!Number.isSafeInteger(paise)) return null;
  return paise / 100;
}

function safePaise(value) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 ? n : 0;
}

function safeMinutes(value) {
  const n = Number(value ?? 0);
  return Number.isSafeInteger(n) && n >= 0 && n <= 1_000_000 ? n : 0;
}

function offerTimeMillis(value) {
  try {
    if (value && typeof value.toMillis === 'function') return value.toMillis();
    if (value && typeof value.toDate === 'function') return value.toDate().getTime();
    if (value instanceof Date) return value.getTime();
    const raw = String(value || '').trim();
    if (!raw) return null;
    const local = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(?::\\d{2})?$/.test(raw);
    const parsed = Date.parse(local ? raw + '+05:30' : raw);
    return Number.isFinite(parsed) ? parsed : null;
  } catch (_) { return null; }
}

function walletLedgerDocId(type, key) {
  return crypto.createHash('sha256').update(String(type) + ':' + String(key)).digest('hex');
}

function calculateStartedMinuteCharge({ connectedSeconds, freeSeconds = 0, ratePerMinutePaise }) {
  const connected = Number(connectedSeconds);
  const free = Number(freeSeconds);
  const rate = Number(ratePerMinutePaise);
  if (!Number.isFinite(connected) || connected < 0 || !Number.isFinite(free) || free < 0 ||
      !Number.isSafeInteger(rate) || rate < 0) return null;
  const connectedWhole = Math.floor(connected);
  const freeWhole = Math.min(connectedWhole, Math.floor(free));
  const billableSeconds = Math.max(0, connectedWhole - freeWhole);
  const billableMinutes = Math.ceil(billableSeconds / 60);
  const amountPaise = billableMinutes * rate;
  if (!Number.isSafeInteger(amountPaise)) return null;
  return { connectedSeconds: connectedWhole, freeSeconds: freeWhole, billableSeconds, billableMinutes, amountPaise };
}

function httpError(status, message, code) {
  return Object.assign(new Error(message), { httpStatus: status, code });
}

function timestampIso(value) {
  try {
    if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string' && value) {
      const n = Date.parse(value);
      return Number.isFinite(n) ? new Date(n).toISOString() : null;
    }
  } catch (_) {}
  return null;
}

function createWalletService({ db, FieldValue }) {
  if (!db || !FieldValue) throw new Error('Wallet service requires Firestore and FieldValue.');

  function welcomeLedgerId(uid) {
    return walletLedgerDocId('welcome_credit', uid);
  }

  async function ensureWallet(ownerUid, ownerRole) {
    const uid = String(ownerUid || '').trim();
    const role = String(ownerRole || '').trim().toLowerCase();
    if (!uid || !['customer', 'astrologer', 'admin'].includes(role)) throw httpError(400, 'Invalid Wallet owner.', 'WALLET_OWNER_INVALID');
    const ref = db.collection(WALLET_COLLECTION).doc(uid);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) return;
      tx.set(ref, {
        ownerUid: uid, ownerRole: role, currency: 'INR',
        availableBalancePaise: 0, reservedBalancePaise: 0,
        bonusMinutesBalance: 0, reservedBonusMinutes: 0, version: 1,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
    });
    const snap = await ref.get();
    const data = snap.data() || {};
    return {
      ownerUid: uid, ownerRole: role, currency: 'INR',
      availableBalancePaise: safePaise(data.availableBalancePaise),
      reservedBalancePaise: safePaise(data.reservedBalancePaise),
      bonusMinutesBalance: safeMinutes(data.bonusMinutesBalance),
      reservedBonusMinutes: safeMinutes(data.reservedBonusMinutes),
      version: safePaise(data.version), createdAt: data.createdAt || null, updatedAt: data.updatedAt || null
    };
  }

  async function postWalletEntry({
    ownerUid, ownerRole, type, amountPaise, direction = 'credit', idempotencyKey,
    referenceType = null, referenceId = null, note = '', metadata = {}
  }) {
    const uid = String(ownerUid || '').trim();
    const role = String(ownerRole || '').trim().toLowerCase();
    const amount = Number(amountPaise);
    const kind = String(type || '').trim();
    const key = String(idempotencyKey || '').trim();
    if (!uid || !['customer', 'astrologer', 'admin'].includes(role)) throw httpError(400, 'Invalid Wallet owner.', 'WALLET_OWNER_INVALID');
    if (!Number.isSafeInteger(amount) || amount <= 0) throw httpError(400, 'Wallet amount must be a positive paise value.', 'WALLET_AMOUNT_INVALID');
    if (!kind || kind.length > 80 || !key || key.length > 240) throw httpError(400, 'Wallet transaction type and idempotency key are required.', 'WALLET_TRANSACTION_INVALID');
    if (!['credit', 'debit'].includes(direction)) throw httpError(400, 'Invalid Wallet ledger direction.', 'WALLET_DIRECTION_INVALID');

    const walletRef = db.collection(WALLET_COLLECTION).doc(uid);
    const ledgerRef = db.collection(TRANSACTION_COLLECTION).doc(walletLedgerDocId(kind, uid + ':' + key));
    return db.runTransaction(async tx => {
      const [walletSnap, ledgerSnap] = await Promise.all([tx.get(walletRef), tx.get(ledgerRef)]);
      const wallet = walletSnap.exists ? (walletSnap.data() || {}) : {};
      const available = safePaise(wallet.availableBalancePaise);
      const reserved = safePaise(wallet.reservedBalancePaise);
      if (ledgerSnap.exists) {
        return { success: true, alreadyProcessed: true, transactionId: ledgerRef.id, availableBalancePaise: available, reservedBalancePaise: reserved };
      }
      if (direction === 'debit' && available < amount) throw httpError(409, 'Insufficient Wallet balance.', 'WALLET_INSUFFICIENT_BALANCE');
      const nextAvailable = direction === 'credit' ? available + amount : available - amount;
      if (!Number.isSafeInteger(nextAvailable)) throw httpError(409, 'Wallet balance exceeds the supported range.', 'WALLET_BALANCE_OVERFLOW');
      const now = FieldValue.serverTimestamp();
      tx.set(walletRef, {
        ownerUid: uid, ownerRole: role, currency: 'INR',
        availableBalancePaise: nextAvailable, reservedBalancePaise: reserved,
        version: safePaise(wallet.version) + 1, createdAt: wallet.createdAt || now, updatedAt: now
      }, { merge: true });
      tx.create(ledgerRef, {
        ownerUid: uid, ownerRole: role, currency: 'INR', type: kind, direction, amountPaise: amount,
        balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: reserved,
        idempotencyKey: key, referenceType, referenceId, note: String(note || '').slice(0, 240),
        metadata: metadata && typeof metadata === 'object' ? metadata : {},
        status: 'posted', createdAt: now
      });
      return { success: true, alreadyProcessed: false, transactionId: ledgerRef.id, availableBalancePaise: nextAvailable, reservedBalancePaise: reserved };
    });
  }

  async function finalizeRecharge({ rechargeId, orderId, paymentId, amountPaise, currency = 'INR', source = 'payment_verification' }) {
    const rid = String(rechargeId || '').trim();
    const oid = String(orderId || '').trim();
    const pid = String(paymentId || '').trim();
    const amount = Number(amountPaise);
    if (!rid || !oid || !pid || !Number.isSafeInteger(amount) || amount <= 0 || String(currency).toUpperCase() !== 'INR') {
      throw httpError(400, 'Wallet recharge verification data is incomplete or invalid.', 'WALLET_RECHARGE_INVALID');
    }
    const rechargeRef = db.collection(RECHARGE_COLLECTION).doc(rid);
    const rechargeInitial = await rechargeRef.get();
    if (!rechargeInitial.exists) throw httpError(404, 'Wallet recharge record was not found.', 'WALLET_RECHARGE_NOT_FOUND');
    const initial = rechargeInitial.data() || {};
    if (String(initial.razorpayOrderId || '') !== oid) throw httpError(409, 'Razorpay order does not match this Wallet recharge.', 'WALLET_ORDER_MISMATCH');
    if (String(initial.customerUid || '') === '') throw httpError(409, 'Wallet recharge has no Customer owner.', 'WALLET_RECHARGE_OWNER_MISSING');
    if (safePaise(initial.amountPaise) !== amount) throw httpError(409, 'Razorpay amount does not match this Wallet recharge.', 'WALLET_AMOUNT_MISMATCH');

    const uid = String(initial.customerUid);
    const walletRef = db.collection(WALLET_COLLECTION).doc(uid);
    const ledgerRef = db.collection(TRANSACTION_COLLECTION).doc(walletLedgerDocId('recharge', uid + ':' + pid));
    const orderRef = db.collection('razorpay_orders').doc(oid);
    const quotedBonusMinutes = safeMinutes(initial.bonusFreeMinutes);
    const quotedOfferId = String(initial.bonusOfferId || '').trim();
    const bonusAuditRef = quotedBonusMinutes > 0 ? db.collection('smv_offer_audit').doc('wallet_recharge_' + rid) : null;
    const bonusOfferRef = quotedBonusMinutes > 0 && quotedOfferId ? db.collection('smv_offers').doc(quotedOfferId) : null;
    return db.runTransaction(async tx => {
      const refs = [rechargeRef, walletRef, ledgerRef, orderRef];
      if (bonusAuditRef) refs.push(bonusAuditRef);
      if (bonusOfferRef) refs.push(bonusOfferRef);
      const snapshots = await Promise.all(refs.map(ref => tx.get(ref)));
      const [rechargeSnap, walletSnap, ledgerSnap, orderSnap] = snapshots;
      let snapshotIndex = 4;
      const bonusAuditSnap = bonusAuditRef ? snapshots[snapshotIndex++] : null;
      const bonusOfferSnap = bonusOfferRef ? snapshots[snapshotIndex] : null;
      if (!rechargeSnap.exists) throw httpError(404, 'Wallet recharge record was not found.', 'WALLET_RECHARGE_NOT_FOUND');
      const recharge = rechargeSnap.data() || {};
      if (String(recharge.razorpayOrderId || '') !== oid || String(recharge.customerUid || '') !== uid) {
        throw httpError(409, 'Wallet recharge ownership or order mismatch.', 'WALLET_ORDER_MISMATCH');
      }
      if (safePaise(recharge.amountPaise) !== amount) throw httpError(409, 'Razorpay amount does not match this Wallet recharge.', 'WALLET_AMOUNT_MISMATCH');
      if (String(recharge.status || '') === 'paid') {
        if (String(recharge.razorpayPaymentId || '') !== pid) throw httpError(409, 'This Wallet recharge was paid with a different payment.', 'WALLET_RECHARGE_ALREADY_PAID');
        const existingWallet = walletSnap.exists ? walletSnap.data() || {} : {};
        return { success: true, alreadyProcessed: true, rechargeId: rid, paymentId: pid, amountPaise: amount,
          availableBalancePaise: safePaise(existingWallet.availableBalancePaise),
          bonusMinutesCredited: safeMinutes(recharge.bonusMinutesCredited),
          bonusMinutesBalance: safeMinutes(existingWallet.bonusMinutesBalance) };
      }
      if (!['order_created', 'payment_pending'].includes(String(recharge.status || ''))) {
        throw httpError(409, 'This Wallet recharge is not ready to be credited.', 'WALLET_RECHARGE_NOT_READY');
      }
      if (ledgerSnap.exists) {
        throw httpError(409, 'A ledger entry already exists for this payment; manual reconciliation is required.', 'WALLET_LEDGER_CONFLICT');
      }
      const wallet = walletSnap.exists ? walletSnap.data() || {} : {};
      const available = safePaise(wallet.availableBalancePaise);
      const reserved = safePaise(wallet.reservedBalancePaise);
      const bonusBalance = safeMinutes(wallet.bonusMinutesBalance);
      const reservedBonus = safeMinutes(wallet.reservedBonusMinutes);
      const awardBonus = quotedBonusMinutes > 0 && !(bonusAuditSnap && bonusAuditSnap.exists) ? quotedBonusMinutes : 0;
      const nextAvailable = available + amount;
      const nextBonusBalance = bonusBalance + awardBonus;
      if (!Number.isSafeInteger(nextAvailable) || !Number.isSafeInteger(nextBonusBalance)) throw httpError(409, 'Wallet balance exceeds the supported range.', 'WALLET_BALANCE_OVERFLOW');
      const now = FieldValue.serverTimestamp();
      tx.set(walletRef, {
        ownerUid: uid, ownerRole: 'customer', currency: 'INR',
        availableBalancePaise: nextAvailable, reservedBalancePaise: reserved,
        bonusMinutesBalance: nextBonusBalance, reservedBonusMinutes: reservedBonus,
        version: safePaise(wallet.version) + 1, createdAt: wallet.createdAt || now, updatedAt: now
      }, { merge: true });
      tx.create(ledgerRef, {
        ownerUid: uid, ownerRole: 'customer', currency: 'INR', type: 'recharge', direction: 'credit',
        amountPaise: amount, balanceAfterPaise: nextAvailable, reservedBalanceAfterPaise: reserved,
        bonusMinutesCredited: awardBonus, bonusMinutesBalanceAfter: nextBonusBalance,
        bonusOfferId: awardBonus ? quotedOfferId : null, bonusOfferName: awardBonus ? String(recharge.bonusOfferName || '') : null,
        idempotencyKey: 'recharge:' + pid, referenceType: 'razorpay_payment', referenceId: pid,
        note: 'Wallet recharge successful' + (awardBonus ? '; +' + awardBonus + ' promotional free minutes' : ''),
        status: 'posted', source, razorpayOrderId: oid, razorpayPaymentId: pid, createdAt: now
      });
      if (awardBonus > 0 && bonusAuditRef && !(bonusAuditSnap && bonusAuditSnap.exists)) {
        tx.create(bonusAuditRef, {
          customerId: uid, service: 'wallet_recharge', referenceId: rid, paymentId: pid,
          offerId: quotedOfferId, offerName: String(recharge.bonusOfferName || ''),
          originalAmount: amount / 100, finalAmount: amount / 100, discountAmount: 0,
          bonusFreeMinutes: awardBonus, status: 'used', usedAt: now, createdAt: now
        });
        if (bonusOfferRef && bonusOfferSnap && bonusOfferSnap.exists) {
          tx.set(bonusOfferRef, { usedCount: FieldValue.increment(1), successfulPayments: FieldValue.increment(1), updatedAt: now }, { merge: true });
        }
      }
      tx.set(rechargeRef, {
        status: 'paid', razorpayPaymentId: pid, paidAmountPaise: amount, currency: 'INR',
        bonusMinutesCredited: awardBonus, bonusMinutesBalanceAfter: nextBonusBalance,
        paymentSource: source, paidAt: now, updatedAt: now
      }, { merge: true });
      tx.set(orderRef, { status: 'paid', razorpayPaymentId: pid, updatedAt: now }, { merge: true });
      return { success: true, alreadyProcessed: false, rechargeId: rid, paymentId: pid, amountPaise: amount,
        availableBalancePaise: nextAvailable, bonusMinutesCredited: awardBonus, bonusMinutesBalance: nextBonusBalance };
    });
  }

  return {
    welcomeLedgerId,
    ensureWallet,
    postWalletEntry,
    finalizeRecharge,
    async getTransactions(ownerUid, limit = 30) {
      const uid = String(ownerUid || '').trim();
      if (!uid) throw httpError(400, 'Wallet owner is required.', 'WALLET_OWNER_INVALID');
      const max = Math.min(100, Math.max(1, Math.floor(Number(limit) || 30)));
      const collection = db.collection(TRANSACTION_COLLECTION);
      let snap;
      try {
        snap = await collection.where('ownerUid', '==', uid).orderBy('createdAt', 'desc').limit(max).get();
      } catch (error) {
        const code = String(error?.code || '').toLowerCase();
        const missingCompositeIndex = code === '9' || code === 'failed-precondition' || /requires an index|create_composite/i.test(String(error?.message || ''));
        if (!missingCompositeIndex) throw error;
        // Staging indexes may not have been deployed yet. Keep Wallet balance usable
        // and provide recent history from a bounded owner-only query until the index exists.
        const fallbackLimit = Math.min(1000, Math.max(max, max * 20));
        snap = await collection.where('ownerUid', '==', uid).limit(fallbackLimit).get();
      }
      const timestampMillis = value => {
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value && Number.isFinite(Number(value.seconds ?? value._seconds))) return Number(value.seconds ?? value._seconds) * 1000;
        const parsed = Date.parse(value);
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const docs = snap.docs.slice().sort((left, right) =>
        timestampMillis(right.data()?.createdAt) - timestampMillis(left.data()?.createdAt)
      ).slice(0, max);
      return docs.map(doc => {
        const d = doc.data() || {};
        return {
          id: doc.id, type: d.type || '', direction: d.direction || '', status: d.status || '',
          amountPaise: safePaise(d.amountPaise), amount: paiseToRupees(safePaise(d.amountPaise)),
          balanceAfterPaise: safePaise(d.balanceAfterPaise), balanceAfter: paiseToRupees(safePaise(d.balanceAfterPaise)),
          reservedBalanceAfterPaise: safePaise(d.reservedBalanceAfterPaise),
          bonusMinutes: safeMinutes(d.bonusMinutes), bonusMinutesCredited: safeMinutes(d.bonusMinutesCredited),
          bonusMinutesBalanceAfter: safeMinutes(d.bonusMinutesBalanceAfter),
          note: d.note || '', referenceType: d.referenceType || '', referenceId: d.referenceId || '',
          createdAt: timestampIso(d.createdAt)
        };
      });
    }
  };
}

function registerWalletRoutes({ app, db, FieldValue, crypto, razorpay, razorpayKeyId, razorpayKeySecret, adminUid, requireUser, isAdminUser }) {
  const service = createWalletService({ db, FieldValue });
  async function readRole(user) {
    if (await isAdminUser(user)) return 'admin';
    const snap = await db.collection('smv_users').doc(user.uid).get();
    const role = String(snap.data()?.role || user.role || '').toLowerCase();
    return ['customer', 'astrologer'].includes(role) ? role : '';
  }
  function ownerFor(user, role) {
    return role === 'admin' ? String(adminUid || user.uid) : String(user.uid);
  }
  async function customerRoleOnly(user, res) {
    const role = await readRole(user);
    if (role !== 'customer') {
      res.status(403).json({ error: 'Customer login is required for Wallet recharge.' });
      return false;
    }
    return true;
  }
  function sendWalletError(res, error, fallback) {
    const status = Number(error?.httpStatus) || 500;
    if (status >= 500) console.error('[Wallet]', error?.stack || error);
    return res.status(status).json({ error: status >= 500 ? fallback : (error?.message || fallback), code: error?.code || 'WALLET_ERROR' });
  }

  async function resolveRechargeBonus({ uid, amountPaise, promoCode }) {
    const code = String(promoCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const amount = Number(amountPaise) / 100;
    const now = Date.now();
    const offers = await db.collection('smv_offers').where('enabled', '==', true).limit(100).get();
    const priorRecharges = await db.collection(RECHARGE_COLLECTION).where('customerUid', '==', String(uid)).where('status', '==', 'paid').limit(1).get();
    const hasPriorRecharge = !priorRecharges.empty;
    const eligible = [];
    for (const doc of offers.docs) {
      const offer = { id: doc.id, ...doc.data() };
      const services = Array.isArray(offer.appliesTo) ? offer.appliesTo : [String(offer.appliesTo || '')];
      if (!services.includes('wallet_recharge')) continue;
      const minutes = safeMinutes(offer.bonusFreeMinutes);
      if (minutes < 1) continue;
      const start = offerTimeMillis(offer.startAt), end = offerTimeMillis(offer.endAt);
      if (start !== null && now < start) continue;
      if (end !== null && now > end) continue;
      if (Number(offer.minimumAmount || 0) > amount) continue;
      const totalLimit = Math.max(0, Math.floor(Number(offer.totalUsageLimit || 0)));
      if (totalLimit > 0 && safeMinutes(offer.usedCount) >= totalLimit) continue;
      const eligibility = String(offer.eligibility || 'all');
      if (eligibility === 'new_customer' && hasPriorRecharge) continue;
      if (eligibility === 'existing_customer' && !hasPriorRecharge) continue;
      const automatic = offer.automatic === true;
      const offerCode = String(offer.promoCode || '').trim().toUpperCase();
      if (!automatic && (!offerCode || !code || code !== offerCode)) continue;
      const perLimit = Math.max(0, Math.floor(Number(offer.perCustomerLimit || 0)));
      if (perLimit > 0) {
        const used = await db.collection('smv_offer_audit').where('customerId', '==', String(uid)).where('offerId', '==', offer.id).where('status', '==', 'used').limit(perLimit).get();
        if (used.size >= perLimit) continue;
      }
      eligible.push({ id: offer.id, name: String(offer.name || 'Wallet Recharge Bonus'), minutes, priority: Number(offer.priority || 0) });
    }
    eligible.sort((a, b) => b.priority - a.priority || b.minutes - a.minutes);
    return eligible[0] || { id: '', name: '', minutes: 0 };
  }

  app.get('/wallet', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const role = await readRole(user);
      if (!role) return res.status(403).json({ error: 'Customer, Astrologer, or Admin login is required for Wallet.' });
      const ownerUid = ownerFor(user, role);
      const wallet = await service.ensureWallet(ownerUid, role);
      return res.set('Cache-Control', 'no-store').json({
        success: true, wallet: {
          ownerRole: role, currency: 'INR',
          availableBalancePaise: wallet.availableBalancePaise,
          availableBalance: paiseToRupees(wallet.availableBalancePaise),
          reservedBalancePaise: wallet.reservedBalancePaise,
          reservedBalance: paiseToRupees(wallet.reservedBalancePaise),
          bonusMinutesBalance: wallet.bonusMinutesBalance, reservedBonusMinutes: wallet.reservedBonusMinutes,
          totalBalancePaise: wallet.availableBalancePaise + wallet.reservedBalancePaise,
          totalBalance: paiseToRupees(wallet.availableBalancePaise + wallet.reservedBalancePaise),
          updatedAt: timestampIso(wallet.updatedAt)
        }
      });
    } catch (e) { return sendWalletError(res, e, 'Unable to load Wallet.'); }
  });

  app.get('/wallet/transactions', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      const role = await readRole(user);
      if (!role) return res.status(403).json({ error: 'Customer, Astrologer, or Admin login is required for Wallet.' });
      const ownerUid = ownerFor(user, role);
      const [wallet, transactions] = await Promise.all([service.ensureWallet(ownerUid, role), service.getTransactions(ownerUid, req.query?.limit)]);
      return res.set('Cache-Control', 'no-store').json({
        success: true,
        wallet: { availableBalancePaise: wallet.availableBalancePaise, availableBalance: paiseToRupees(wallet.availableBalancePaise), reservedBalancePaise: wallet.reservedBalancePaise, reservedBalance: paiseToRupees(wallet.reservedBalancePaise), bonusMinutesBalance: wallet.bonusMinutesBalance, reservedBonusMinutes: wallet.reservedBonusMinutes },
        transactions
      });
    } catch (e) { return sendWalletError(res, e, 'Unable to load Wallet transactions.'); }
  });

  app.post('/wallet/recharge/create-order', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      if (!(await customerRoleOnly(user, res))) return;
      const amountPaise = parseRupeesToPaise(req.body?.amount);
      if (amountPaise === null || amountPaise < 100) return res.status(400).json({ error: 'Enter a recharge amount of at least ₹1.00.', code: 'WALLET_RECHARGE_AMOUNT_INVALID' });
      if (!razorpayKeyId || !razorpayKeySecret) return res.status(503).json({ error: 'Wallet recharge is temporarily unavailable. Payment configuration is missing.' });
      const clientKey = String(req.body?.idempotencyKey || '').trim();
      if (clientKey && (clientKey.length < 8 || clientKey.length > 128)) return res.status(400).json({ error: 'Invalid recharge request key.' });
      const idempotencyKey = clientKey || crypto.randomUUID();
      const bonusQuote = await resolveRechargeBonus({ uid: user.uid, amountPaise, promoCode: req.body?.promoCode });
      const rechargeId = crypto.createHash('sha256').update('wallet-recharge:' + user.uid + ':' + idempotencyKey).digest('hex');
      const rechargeRef = db.collection(RECHARGE_COLLECTION).doc(rechargeId);
      const intent = await db.runTransaction(async tx => {
        const snap = await tx.get(rechargeRef);
        if (snap.exists) return { existing: true, data: snap.data() || {} };
        tx.create(rechargeRef, {
          customerUid: user.uid, amountPaise, currency: 'INR', idempotencyKey,
          bonusFreeMinutes: safeMinutes(bonusQuote.minutes), bonusOfferId: bonusQuote.id || null, bonusOfferName: bonusQuote.name || null,
          status: 'creating', createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
        });
        return { existing: false, data: null };
      });
      if (intent.existing) {
        const old = intent.data || {};
        if (safePaise(old.amountPaise) !== amountPaise) return res.status(409).json({ error: 'This recharge request key was already used for a different amount. Start a new recharge.', code: 'WALLET_IDEMPOTENCY_CONFLICT' });
        if (old.status === 'paid') return res.json({ success: true, alreadyPaid: true, rechargeId, amount: paiseToRupees(amountPaise) });
        if (old.status === 'order_created') return res.json({ success: true, rechargeId, orderId: old.razorpayOrderId, keyId: razorpayKeyId, amount: amountPaise, currency: 'INR', amountRupees: paiseToRupees(amountPaise), bonusFreeMinutes: safeMinutes(old.bonusFreeMinutes), bonusOfferName: String(old.bonusOfferName || ''), reusedOrder: true });
        return res.status(409).json({ error: 'This recharge request is already being processed or failed. Retry with a new request key.', code: 'WALLET_RECHARGE_IN_PROGRESS' });
      }
      try {
        const order = await razorpay.orders.create({
          amount: amountPaise, currency: 'INR',
          receipt: 'SMV_WR_' + rechargeId.slice(0, 24),
          notes: { walletRechargeId: rechargeId, customerUid: user.uid }
        });
        // Keep the recharge lookup and the existing webhook order registry atomic.
        const orderBatch = db.batch();
        orderBatch.set(rechargeRef, { razorpayOrderId: order.id, status: 'order_created', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        orderBatch.set(db.collection('razorpay_orders').doc(order.id), {
          razorpayOrderId: order.id, walletRechargeId: rechargeId, firebaseUid: user.uid,
          customerEmail: user.email || null, amount: amountPaise, currency: 'INR',
          serviceName: 'SMV ASTRO Wallet Recharge', status: 'created',
          createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        await orderBatch.commit();
        return res.json({ success: true, rechargeId, orderId: order.id, keyId: razorpayKeyId, amount: amountPaise, amountRupees: paiseToRupees(amountPaise), currency: 'INR', bonusFreeMinutes: safeMinutes(bonusQuote.minutes), bonusOfferName: String(bonusQuote.name || '') });
      } catch (e) {
        await rechargeRef.set({ status: 'failed', failureReason: String(e?.message || 'Order creation failed').slice(0, 200), updatedAt: FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
        return sendWalletError(res, e, 'Unable to create Wallet recharge order.');
      }
    } catch (e) { return sendWalletError(res, e, 'Unable to create Wallet recharge order.'); }
  });

  app.post('/wallet/recharge/verify', async (req, res) => {
    const user = await requireUser(req, res);
    if (!user) return;
    try {
      if (!(await customerRoleOnly(user, res))) return;
      const rechargeId = String(req.body?.rechargeId || '').trim();
      const orderId = String(req.body?.razorpay_order_id || req.body?.orderId || '').trim();
      const paymentId = String(req.body?.razorpay_payment_id || req.body?.paymentId || '').trim();
      const signature = String(req.body?.razorpay_signature || req.body?.signature || '').trim();
      if (!rechargeId || !orderId || !paymentId || !signature) return res.status(400).json({ error: 'Wallet recharge verification data is incomplete.' });
      const rechargeRef = db.collection(RECHARGE_COLLECTION).doc(rechargeId);
      const rechargeSnap = await rechargeRef.get();
      if (!rechargeSnap.exists) return res.status(404).json({ error: 'Wallet recharge record was not found.' });
      const recharge = rechargeSnap.data() || {};
      if (String(recharge.customerUid || '') !== String(user.uid)) return res.status(403).json({ error: 'You do not own this Wallet recharge.' });
      if (String(recharge.razorpayOrderId || '') !== orderId) return res.status(409).json({ error: 'Razorpay order does not match this Wallet recharge.' });
      if (recharge.status === 'paid') return res.json({ success: true, verified: true, alreadyCredited: true, rechargeId, amount: paiseToRupees(safePaise(recharge.paidAmountPaise || recharge.amountPaise)) });
      const expected = crypto.createHmac('sha256', razorpayKeySecret).update(orderId + '|' + paymentId).digest('hex');
      const expectedBuffer = Buffer.from(expected);
      const actualBuffer = Buffer.from(signature);
      if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) return res.status(400).json({ error: 'Wallet recharge payment signature verification failed.' });
      let payment = await razorpay.payments.fetch(paymentId);
      if (String(payment.order_id || '') !== orderId || Number(payment.amount) !== safePaise(recharge.amountPaise) || String(payment.currency || '') !== 'INR') {
        return res.status(409).json({ error: 'Razorpay payment details do not match the Wallet recharge.' });
      }
      if (payment.status === 'authorized') {
        try { payment = await razorpay.payments.capture(paymentId, safePaise(recharge.amountPaise), 'INR'); }
        catch (_) { payment = await razorpay.payments.fetch(paymentId); }
      }
      if (payment.status !== 'captured') return res.status(409).json({ error: 'Payment capture is pending. Reopen Wallet and verify the recharge again.' });
      const credited = await service.finalizeRecharge({ rechargeId, orderId, paymentId, amountPaise: Number(payment.amount), currency: payment.currency, source: 'payment_verification' });
      return res.json({ success: true, verified: true, alreadyCredited: credited.alreadyProcessed, rechargeId, paymentId, amount: paiseToRupees(credited.amountPaise || Number(payment.amount)), availableBalance: paiseToRupees(credited.availableBalancePaise), bonusMinutesCredited: safeMinutes(credited.bonusMinutesCredited), bonusMinutesBalance: safeMinutes(credited.bonusMinutesBalance) });
    } catch (e) { return sendWalletError(res, e, 'Unable to verify Wallet recharge.'); }
  });

  return Object.assign(service, {
    handleCapturedWebhook: async ({ rechargeId, orderId, paymentId, amountPaise, currency = 'INR' }) => {
      if (!rechargeId || !paymentId || !orderId) return { success: false, skipped: true };
      return service.finalizeRecharge({ rechargeId, orderId, paymentId, amountPaise, currency, source: 'razorpay_webhook' });
    }
  });
}

module.exports = {
  CUSTOMER_WELCOME_CREDIT_PAISE,
  parseRupeesToPaise,
  paiseToRupees,
  calculateStartedMinuteCharge,
  walletLedgerDocId,
  createWalletService,
  registerWalletRoutes
};
