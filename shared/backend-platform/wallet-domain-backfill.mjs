import { WALLET_OFFER_THEMES } from './wallet-recharge-domain.mjs';

export const WALLET_DOMAIN_BACKFILL_COLLECTIONS = Object.freeze({
  wallets: Object.freeze({ path: 'smv_wallets' }),
  walletTransactions: Object.freeze({ path: 'smv_wallet_transactions' }),
  walletRecharges: Object.freeze({ path: 'smv_wallet_recharges' }),
  walletRechargeOffers: Object.freeze({ path: 'smv_offers', filter: data => data.offerType === 'wallet_recharge_bonus_minutes' }),
  walletOfferAudit: Object.freeze({ path: 'smv_offer_audit', filter: data => data.service === 'wallet_recharge' }),
  walletOfferUsageCounters: Object.freeze({ path: 'smv_offer_usage_counters' }),
  liveSessions: Object.freeze({ path: 'smv_live_sessions' }),
  liveBookings: Object.freeze({ path: 'smv_live_bookings' }),
  liveSessionMessages: Object.freeze({ path: 'smv_live_sessions', child: 'messages' }),
  liveSessionSignals: Object.freeze({ path: 'smv_live_sessions', child: 'signals' }),
  scheduledCallChatAppointments: Object.freeze({
    path: 'smv_appointments',
    filter: data => ['scheduled_call_request', 'scheduled_chat_request'].includes(String(data.bookingKind || ''))
  }),
  liveSessionEarnings: Object.freeze({ path: 'smv_payments', filter: data => data.source === 'live_session' }),
  withdrawals: Object.freeze({ path: 'smv_withdrawals' }),
  withdrawalPayouts: Object.freeze({ path: 'smv_withdrawal_payouts' }),
  walletRechargeOrders: Object.freeze({ path: 'razorpay_orders', filter: data => data.serviceName === 'SMV ASTRO Wallet Recharge' }),
  razorpayWebhookEvents: Object.freeze({ path: 'razorpay_webhook_events' }),
  billingSettings: Object.freeze({ path: 'smv_settings', named: ['liveSessionPricing', 'commission'] })
});

const THEMES = new Set(WALLET_OFFER_THEMES);

export function legacyTimestampMilliseconds(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value?.toMillis === 'function') {
    const result = Number(value.toMillis());
    return Number.isFinite(result) ? result : null;
  }
  if (typeof value === 'object' && Number.isFinite(Number(value.seconds ?? value._seconds))) {
    const seconds = Number(value.seconds ?? value._seconds);
    const nanos = Number(value.nanoseconds ?? value._nanoseconds ?? 0);
    const result = seconds * 1000 + nanos / 1_000_000;
    return Number.isFinite(result) ? result : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  const raw = String(value).trim();
  if (!raw) return null;
  const localIst = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(raw);
  const parsed = Date.parse(localIst ? raw + '+05:30' : raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function json(value) {
  try { return JSON.stringify(value ?? {}); }
  catch { return '{}'; }
}

function nonNegativeInteger(value, fallback = 0) {
  const n = Number(value ?? fallback);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}

function string(value) {
  return String(value ?? '').trim();
}

function dateField(data, ...keys) {
  for (const key of keys) {
    const value = legacyTimestampMilliseconds(data?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function moneyFromRupees(value) {
  if(value===null||value===undefined||String(value).trim()==='') return null;
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0) return null;
  const paise=Math.round(amount*100);
  return Number.isSafeInteger(paise)?paise:null;
}
function paiseField(data,paiseKeys,rupeeKeys=[]) {
  for(const key of paiseKeys) {
    if(data?.[key]===null||data?.[key]===undefined||String(data[key]).trim()==='') continue;
    return nonNegativeInteger(data[key]);
  }
  for(const key of rupeeKeys) {
    if(data?.[key]===null||data?.[key]===undefined||String(data[key]).trim()==='') continue;
    return moneyFromRupees(data[key]);
  }
  return null;
}

function result(statements = [], warning = '') {
  return { statements, mapped: statements.length > 0, warning };
}

function insertLegacyWallet(data, id) {
  const ownerUid = string(data.ownerUid || id);
  const ownerRole = string(data.ownerRole).toLowerCase();
  const cash = nonNegativeInteger(data.availableBalancePaise);
  const reserved = nonNegativeInteger(data.reservedBalancePaise);
  const bonus = nonNegativeInteger(data.bonusMinutesBalance);
  const reservedBonus = nonNegativeInteger(data.reservedBonusMinutes);
  const version = nonNegativeInteger(data.version, 1);
  if (!ownerUid || !['customer', 'astrologer', 'admin'].includes(ownerRole) ||
      cash === null || reserved === null || bonus === null || reservedBonus === null ||
      version === null || bonus > 1_000_000 || reservedBonus > 1_000_000) {
    return result([], 'WALLET_SNAPSHOT_INVALID');
  }
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  return result([{
    kind: 'wallet_snapshot',
    sql: `INSERT INTO smv_domain_wallets
      (owner_uid,owner_role,currency,available_balance_paise,reserved_balance_paise,
       bonus_minutes_balance,reserved_bonus_minutes,version,created_at_ms,updated_at_ms)
      VALUES (?,?, 'INR', ?,?,?,?,?,?,?)
      ON CONFLICT(owner_uid) DO UPDATE SET
        owner_role=excluded.owner_role,currency=excluded.currency,
        available_balance_paise=excluded.available_balance_paise,
        reserved_balance_paise=excluded.reserved_balance_paise,
        bonus_minutes_balance=excluded.bonus_minutes_balance,
        reserved_bonus_minutes=excluded.reserved_bonus_minutes,
        version=excluded.version,created_at_ms=excluded.created_at_ms,updated_at_ms=excluded.updated_at_ms
      WHERE NOT EXISTS (SELECT 1 FROM smv_domain_wallet_ledger l WHERE l.owner_uid=excluded.owner_uid)`,
    values: [ownerUid, ownerRole, cash, reserved, bonus, reservedBonus, Math.max(1, version), created, updated]
  }], '');
}

function insertLegacyWalletTransaction(data, id) {
  const ownerUid = string(data.ownerUid);
  const ownerRole = string(data.ownerRole).toLowerCase();
  const type = string(data.type) || 'legacy_transaction';
  const direction = string(data.direction).toLowerCase();
  const amount = nonNegativeInteger(data.amountPaise);
  const balance = nonNegativeInteger(data.balanceAfterPaise);
  const reserved = nonNegativeInteger(data.reservedBalanceAfterPaise);
  const bonus = nonNegativeInteger(data.bonusMinutes);
  const bonusCredited = nonNegativeInteger(data.bonusMinutesCredited);
  const bonusAfter = nonNegativeInteger(data.bonusMinutesBalanceAfter);
  const reservedBonusAfter = nonNegativeInteger(data.reservedBonusMinutesAfter);
  if (!ownerUid || !['customer','astrologer','admin'].includes(ownerRole) ||
      !['credit','debit','reserve','release'].includes(direction) ||
      amount === null || balance === null || reserved === null ||
      bonus === null || bonusCredited === null || bonusAfter === null || reservedBonusAfter === null) {
    return result([], 'WALLET_TRANSACTION_INVALID');
  }
  const created = dateField(data, 'createdAt', 'updatedAt') ?? 0;
  return result([{
    kind: 'legacy_wallet_transaction',
    sql: `INSERT OR IGNORE INTO smv_domain_legacy_wallet_transactions
      (source_document_id,owner_uid,owner_role,type,direction,amount_paise,balance_after_paise,
       reserved_balance_after_paise,bonus_minutes,bonus_minutes_credited,bonus_minutes_balance_after,
       reserved_bonus_minutes_after,idempotency_key,reference_type,reference_id,note,metadata_json,
       status,created_at_ms,payload_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`,
    values: [id,ownerUid,ownerRole,type,direction,amount,balance,reserved,bonus,bonusCredited,
      bonusAfter,reservedBonusAfter,string(data.idempotencyKey),
      data.referenceType == null ? null : string(data.referenceType),
      data.referenceId == null ? null : string(data.referenceId),
      string(data.note).slice(0,240),json(data.metadata),string(data.status || 'posted'),
      created,json(data)]
  }]);
}

function insertLegacyRecharge(data, id) {
  const customerUid = string(data.customerUid);
  const amount = nonNegativeInteger(data.amountPaise);
  const status = string(data.status).toLowerCase() || 'unknown';
  if (!customerUid || amount === null) return result([], 'WALLET_RECHARGE_INVALID');
  const orderId = string(data.razorpayOrderId) || null;
  const paymentId = string(data.razorpayPaymentId) || null;
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  const paidAt = dateField(data, 'paidAt');
  const paidAmount = nonNegativeInteger(data.paidAmountPaise ?? (status === 'paid' ? amount : 0));
  const statements = [{
    kind: 'legacy_wallet_recharge',
    sql: `INSERT INTO smv_domain_legacy_wallet_recharges
      (recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,
       razorpay_payment_id,paid_amount_paise,paid_at_ms,created_at_ms,updated_at_ms,payload_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(recharge_id) DO UPDATE SET
       customer_uid=excluded.customer_uid,amount_paise=excluded.amount_paise,currency=excluded.currency,
       status=excluded.status,razorpay_order_id=excluded.razorpay_order_id,
       razorpay_payment_id=excluded.razorpay_payment_id,paid_amount_paise=excluded.paid_amount_paise,
       paid_at_ms=excluded.paid_at_ms,created_at_ms=excluded.created_at_ms,
       updated_at_ms=excluded.updated_at_ms,payload_json=excluded.payload_json`,
    values: [id,customerUid,amount,string(data.currency || 'INR'),status,orderId,paymentId,
      paidAmount,paidAt,created,updated,json(data)]
  }];
  // Only terminal, fully linked paid recharges enter the active lookup table.
  // They carry no new ledger credits: the imported Wallet snapshot is authoritative.
  if (status === 'paid' && orderId && paymentId && amount > 0) {
    statements.push({
      kind: 'paid_legacy_recharge_lookup',
      sql: `INSERT OR IGNORE INTO smv_domain_wallet_recharges
        (recharge_id,customer_uid,amount_paise,currency,status,razorpay_order_id,
         razorpay_payment_id,paid_at_ms,payload_json,created_at_ms,updated_at_ms)
        VALUES (?,?,?,'INR','paid',?,?,?,?,?,?)`,
      values: [id,customerUid,amount,orderId,paymentId,paidAt,json({
        bonusMinutesCredited: nonNegativeInteger(data.bonusMinutesCredited) ?? 0,
        offerId: data.offerId || null, offerName: data.offerName || null,
        paymentSource: 'legacy_firestore_backfill'
      }),created,updated]
    });
  }
  return result(statements);
}

function insertLegacyOffer(data, id) {
  if (data.offerType !== 'wallet_recharge_bonus_minutes') return result([], 'NOT_WALLET_RECHARGE_OFFER');
  const name = string(data.name);
  const bonus = nonNegativeInteger(data.bonusMinutes);
  const minimum = nonNegativeInteger(data.minimumRechargeAmountPaise);
  const perCustomer = nonNegativeInteger(data.perCustomerLimit ?? 1);
  const totalLimit = nonNegativeInteger(data.totalUsageLimit);
  const used = nonNegativeInteger(data.usedCount);
  const priority = Number(data.priority ?? 0);
  const start = legacyTimestampMilliseconds(data.startAt);
  const end = legacyTimestampMilliseconds(data.endAt);
  const theme = THEMES.has(string(data.bannerTheme)) ? string(data.bannerTheme) : 'auto';
  if (!name || bonus === null || bonus < 1 || bonus > 1440 || minimum === null ||
      perCustomer === null || totalLimit === null || used === null ||
      !Number.isSafeInteger(priority) || priority < -1000 || priority > 1000 ||
      (start !== null && end !== null && start >= end)) {
    return result([], 'WALLET_OFFER_INVALID');
  }
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  const successful = nonNegativeInteger(data.successfulRedemptions ?? used) ?? used;
  const totalBonus = nonNegativeInteger(data.totalBonusMinutesAwarded) ?? 0;
  return result([{
    kind: 'wallet_offer',
    sql: `INSERT INTO smv_domain_wallet_offers
      (offer_id,enabled,minimum_recharge_paise,bonus_minutes,per_customer_limit,total_usage_limit,
       used_count,priority,start_at_ms,end_at_ms,payload_json,created_at_ms,updated_at_ms,
       legacy_successful_redemptions,legacy_total_bonus_minutes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(offer_id) DO UPDATE SET
       enabled=excluded.enabled,minimum_recharge_paise=excluded.minimum_recharge_paise,
       bonus_minutes=excluded.bonus_minutes,per_customer_limit=excluded.per_customer_limit,
       total_usage_limit=excluded.total_usage_limit,used_count=MAX(smv_domain_wallet_offers.used_count,excluded.used_count),
       priority=excluded.priority,start_at_ms=excluded.start_at_ms,end_at_ms=excluded.end_at_ms,
       payload_json=excluded.payload_json,updated_at_ms=excluded.updated_at_ms,
       legacy_successful_redemptions=MAX(smv_domain_wallet_offers.legacy_successful_redemptions,excluded.legacy_successful_redemptions),
       legacy_total_bonus_minutes=MAX(smv_domain_wallet_offers.legacy_total_bonus_minutes,excluded.legacy_total_bonus_minutes)
      WHERE NOT EXISTS (SELECT 1 FROM smv_domain_offer_redemptions r WHERE r.offer_id=excluded.offer_id)`,
    values: [id,data.enabled === true ? 1 : 0,minimum,bonus,Math.max(0,perCustomer),totalLimit,
      used,priority,start,end,json({ ...data, name, bannerTheme: theme }),created,updated,successful,totalBonus]
  }]);
}

function insertOfferUsage(data, id) {
  const offerId = string(data.offerId);
  const customerUid = string(data.customerUid || data.customerId);
  const count = nonNegativeInteger(data.redemptionCount ?? data.usedCount);
  if (!offerId || !customerUid || count === null) return result([], 'OFFER_USAGE_COUNTER_INVALID');
  const updated = dateField(data, 'updatedAt', 'createdAt') ?? 0;
  return result([{
    kind: 'offer_usage_counter',
    sql: `INSERT INTO smv_domain_wallet_offer_redemption_usage
      (offer_id,customer_uid,redemption_count,last_recharge_id,updated_at_ms)
      VALUES (?,?,?,?,?)
      ON CONFLICT(offer_id,customer_uid) DO UPDATE SET
        redemption_count=MAX(smv_domain_wallet_offer_redemption_usage.redemption_count,excluded.redemption_count),
        last_recharge_id=COALESCE(excluded.last_recharge_id,smv_domain_wallet_offer_redemption_usage.last_recharge_id),
        updated_at_ms=MAX(smv_domain_wallet_offer_redemption_usage.updated_at_ms,excluded.updated_at_ms)`,
    values: [offerId,customerUid,count,string(data.lastRechargeId) || null,updated]
  }]);
}

function insertLiveSession(data, id) {
  const customerUid = string(data.customerUid);
  const astrologerUid = string(data.astrologerUid || data.astrologerId);
  const mode = string(data.mode).toLowerCase();
  if (!customerUid || !astrologerUid || !['call','chat'].includes(mode)) return result([], 'LIVE_SESSION_IDENTITY_INVALID');
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  const started = dateField(data, 'startedAt');
  const ended = dateField(data, 'endedAt');
  return result([{
    kind: 'live_session',
    sql: `INSERT OR IGNORE INTO smv_domain_live_sessions
      (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,reserved_amount_paise,
       reserved_bonus_minutes,actual_charge_paise,started_at_ms,ended_at_ms,payload_json,created_at_ms,updated_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    values: [id,customerUid,astrologerUid,mode,string(data.state || data.status || 'unknown'),
      string(data.appointmentId) || null,nonNegativeInteger(data.reservedAmountPaise) ?? 0,
      nonNegativeInteger(data.reservedBonusMinutes) ?? 0,nonNegativeInteger(data.actualChargePaise) ?? 0,
      started,ended,json({...data,origin:'legacy_import',migrationSource:'legacy_import',legacyOrigin:string(data.origin)||null}),created,updated]
  }]);
}

function insertLiveBooking(data, id) {
  const customerUid = string(data.customerUid);
  const astrologerUid = string(data.astrologerUid || data.astrologerId);
  const mode = string(data.mode).toLowerCase();
  if (!customerUid || !astrologerUid || !['call','chat'].includes(mode)) return result([], 'LIVE_BOOKING_IDENTITY_INVALID');
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  return result([{
    kind: 'live_booking',
    sql: `INSERT OR IGNORE INTO smv_domain_live_bookings
      (booking_id,customer_uid,astrologer_uid,mode,status,wallet_reservation_state,reserved_amount_paise,
       reserved_bonus_minutes,expires_at_ms,payload_json,created_at_ms,updated_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    values: [id,customerUid,astrologerUid,mode,string(data.status || 'unknown'),
      string(data.walletReservationState || 'none'),
      nonNegativeInteger(data.reservedAmountPaise) ?? 0,nonNegativeInteger(data.reservedBonusMinutes) ?? 0,
      dateField(data,'expiresAt'),json({...data,origin:'legacy_import',migrationSource:'legacy_import',legacyOrigin:string(data.origin)||null}),created,updated]
  }]);
}

function insertSessionMessage(data, id, parentId) {
  const senderUid = string(data.senderUid || data.uid);
  const message = string(data.text || data.message);
  const created = dateField(data, 'createdAt') ?? 0;
  if (!parentId || !senderUid || !message || message.length > 4000) return result([], 'LIVE_SESSION_MESSAGE_INVALID');
  return result([{
    kind: 'live_session_message',
    sql: `INSERT OR IGNORE INTO smv_domain_live_messages(session_id,message_id,sender_uid,text,created_at_ms)
      VALUES (?,?,?,?,?)`,
    values: [parentId,id,senderUid,message,created]
  }]);
}

function insertSessionSignal(data, id, parentId) {
  const senderUid = string(data.senderUid || data.uid);
  const signalType = string(data.signalType || data.type).toLowerCase();
  const payload = json(data.payload || data);
  if (!parentId || !senderUid || !['offer','answer','ice'].includes(signalType) || payload.length > 100000) {
    return result([], 'LIVE_SESSION_SIGNAL_INVALID');
  }
  return result([{
    kind: 'live_session_signal',
    sql: `INSERT OR IGNORE INTO smv_domain_live_signals(session_id,signal_id,sender_uid,signal_type,payload_json,created_at_ms)
      VALUES (?,?,?,?,?,?)`,
    values: [parentId,id,senderUid,signalType,payload,dateField(data,'createdAt') ?? 0]
  }]);
}

function appointmentTimeMilliseconds(data) {
  const direct = dateField(data, 'preferredAt', 'preferredAtMs');
  if (direct !== null) return direct;
  const date = string(data.preferredDate);
  const time = string(data.preferredTime);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [year,month,day] = date.split('-').map(Number);
  const [hour,minute] = time.split(':').map(Number);
  const value = Date.UTC(year,month-1,day,hour,minute) - 330*60*1000;
  return Number.isFinite(value) ? value : null;
}

function insertScheduledAppointment(data, id) {
  const kind = string(data.bookingKind);
  if (!['scheduled_call_request','scheduled_chat_request'].includes(kind)) return result([], 'NOT_SCHEDULED_CALL_CHAT');
  const customerUid = string(data.customerUid);
  const astrologerUid = string(data.astrologerUid || data.astrologerId);
  if (!customerUid || !astrologerUid) return result([], 'SCHEDULED_APPOINTMENT_IDENTITY_INVALID');
  const created = dateField(data, 'createdAt') ?? 0;
  const updated = dateField(data, 'updatedAt') ?? created;
  return result([{
    kind: 'scheduled_appointment',
    sql: `INSERT OR IGNORE INTO smv_domain_scheduled_appointments
      (appointment_id,customer_uid,astrologer_uid,booking_kind,booking_status,preferred_at_ms,
       live_session_id,payload_json,created_at_ms,updated_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
    values: [id,customerUid,astrologerUid,kind,string(data.status || data.bookingStatus || 'unknown'),
      appointmentTimeMilliseconds(data),string(data.liveSessionId || data.sessionId) || null,
      json(data),created,updated]
  }]);
}

function insertLiveEarning(data, id) {
  if (data.source !== 'live_session') return result([], 'NOT_LIVE_SESSION_EARNING');
  const astrologerUid = string(data.astrologerUid || data.astrologerId);
  const referenceId = string(data.referenceId || data.sessionId || id);
  if (!astrologerUid) return result([], 'LIVE_EARNING_ASTROLOGER_MISSING');
  const astro = paiseField(
    data,
    ['astrologerAmountPaise','astroAmountPaise','earningAmountPaise','commissionAmountPaise'],
    ['earningAmount','commissionAmount','astrologerCommissionAmount','astrologerAmount']
  );
  let admin = paiseField(data,['adminAmountPaise'],['adminCommissionAmount','adminAmount']);
  let gross = paiseField(data,['grossAmountPaise','amountPaise'],['grossAmount','amount']);
  if(gross===null&&astro!==null&&admin!==null) gross=astro+admin;
  if(admin===null&&gross!==null&&astro!==null&&gross>=astro) admin=gross-astro;
  if(gross===null||astro===null||admin===null||gross!==astro+admin) {
    return result([], 'LIVE_EARNING_AMOUNT_INVALID');
  }
  const created = dateField(data,'createdAt') ?? 0;
  const updated = dateField(data,'updatedAt') ?? created;
  return result([{
    kind: 'live_session_earning',
    sql: `INSERT OR IGNORE INTO smv_domain_earnings
      (earning_id,astrologer_uid,customer_uid,source_type,reference_id,gross_amount_paise,
       astrologer_amount_paise,admin_amount_paise,status,payload_json,created_at_ms,updated_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    values: [id,astrologerUid,string(data.customerUid || data.customerId) || null,'live_session',
      referenceId,gross,astro,admin,string(data.status || 'completed'),json({...data,migrationSource:'legacy_import'}),created,updated]
  }]);
}

function insertWithdrawal(data, id) {
  const uid = string(data.astrologerUid || data.astrologerId);
  const amount = paiseField(data,['amountPaise'],['amount']);
  if (!uid || amount === null || amount <= 0) return result([], 'WITHDRAWAL_INVALID');
  const created = dateField(data,'createdAt') ?? 0;
  const updated = dateField(data,'updatedAt') ?? created;
  return result([{
    kind: 'withdrawal',
    sql: `INSERT OR IGNORE INTO smv_domain_withdrawals
      (withdrawal_id,astrologer_uid,amount_paise,status,available_at_ms,payload_json,created_at_ms,updated_at_ms)
      VALUES (?,?,?,?,?,?,?,?)`,
    values: [id,uid,amount,string(data.status || 'pending'),dateField(data,'availableAt'),json({...data,migrationSource:'legacy_import'}),created,updated]
  }]);
}

function insertWithdrawalPayout(data, id) {
  return result([{
    kind: 'withdrawal_payout',
    sql: `INSERT OR IGNORE INTO smv_domain_withdrawal_payouts
      (withdrawal_id,private_payout_json,created_at_ms,updated_at_ms) VALUES (?,?,?,?)`,
    values: [id,json(data),dateField(data,'createdAt') ?? 0,dateField(data,'updatedAt') ?? dateField(data,'createdAt') ?? 0]
  }]);
}

function insertWebhookEvent(data, id) {
  const eventType = string(data.event || data.eventType || 'unknown').slice(0,100);
  const processed = data.processed === true ? 1 : 0;
  const received = dateField(data,'receivedAt') ?? 0;
  const processedAt = dateField(data,'processedAt');
  return result([{
    kind: 'razorpay_webhook_event',
    sql: `INSERT INTO smv_domain_razorpay_webhook_events
      (event_key,event_type,payment_id,order_id,processed,retry_count,payload_json,received_at_ms,processed_at_ms)
      VALUES (?,?,?,?,?,?,?,?,?)
      ON CONFLICT(event_key) DO UPDATE SET
        processed=MAX(smv_domain_razorpay_webhook_events.processed,excluded.processed),
        retry_count=MAX(smv_domain_razorpay_webhook_events.retry_count,excluded.retry_count),
        processed_at_ms=COALESCE(smv_domain_razorpay_webhook_events.processed_at_ms,excluded.processed_at_ms),
        payment_id=COALESCE(smv_domain_razorpay_webhook_events.payment_id,excluded.payment_id),
        order_id=COALESCE(smv_domain_razorpay_webhook_events.order_id,excluded.order_id)`,
    values: [id,eventType,string(data.razorpayPaymentId || data.paymentId) || null,
      string(data.razorpayOrderId || data.orderId) || null,processed,
      nonNegativeInteger(data.retryCount) ?? 0,json(data),received,processedAt]
  }]);
}

function insertSetting(data, id) {
  if (!['liveSessionPricing','commission'].includes(id)) return result([], 'UNSUPPORTED_BILLING_SETTING');
  return result([{
    kind: 'billing_setting',
    sql: `INSERT INTO smv_domain_settings(setting_id,payload_json,source_update_time_ms,updated_at_ms)
      VALUES (?,?,?,?)
      ON CONFLICT(setting_id) DO UPDATE SET
        payload_json=excluded.payload_json,source_update_time_ms=excluded.source_update_time_ms,
        updated_at_ms=excluded.updated_at_ms`,
    values: [id,json(data),dateField({ updatedAt: data.updatedAt },'updatedAt'),dateField({updatedAt:data.updatedAt},'updatedAt') ?? 0]
  }]);
}

export function mapLegacyWalletDomainDocument(collectionKey, document, { parentId = '', nowMs = Date.now() } = {}) {
  const id = string(document?.id);
  const data = document?.data && typeof document.data === 'object' ? document.data : {};
  if (!id) return { statements: [], mapped: false, warning: 'DOCUMENT_ID_MISSING' };
  let mapped;
  switch (collectionKey) {
    case 'wallets': mapped = insertLegacyWallet(data,id); break;
    case 'walletTransactions': mapped = insertLegacyWalletTransaction(data,id); break;
    case 'walletRecharges': mapped = insertLegacyRecharge(data,id); break;
    case 'walletRechargeOffers': mapped = insertLegacyOffer(data,id); break;
    case 'walletOfferUsageCounters': mapped = insertOfferUsage(data,id); break;
    case 'liveSessions': mapped = insertLiveSession(data,id); break;
    case 'liveBookings': mapped = insertLiveBooking(data,id); break;
    case 'liveSessionMessages': mapped = insertSessionMessage(data,id,parentId); break;
    case 'liveSessionSignals': mapped = insertSessionSignal(data,id,parentId); break;
    case 'scheduledCallChatAppointments': mapped = insertScheduledAppointment(data,id); break;
    case 'liveSessionEarnings': mapped = insertLiveEarning(data,id); break;
    case 'withdrawals': mapped = insertWithdrawal(data,id); break;
    case 'withdrawalPayouts': mapped = insertWithdrawalPayout(data,id); break;
    case 'razorpayWebhookEvents': mapped = insertWebhookEvent(data,id); break;
    case 'billingSettings': mapped = insertSetting(data,id); break;
    case 'walletOfferAudit':
    case 'walletRechargeOrders':
      mapped = result([], 'RAW_ARCHIVE_ONLY');
      break;
    default:
      return { statements: [], mapped: false, warning: 'BACKFILL_COLLECTION_UNSUPPORTED' };
  }
  const raw = json(data);
  const sourceUpdated = legacyTimestampMilliseconds(document.updateTime) ?? dateField(data,'updatedAt');
  const digestPlaceholder = string(document.payloadSha256) || '';
  const rawStatement = {
    kind: 'legacy_document_archive',
    sql: `INSERT INTO smv_domain_legacy_documents
      (source_collection,document_id,source_update_time_ms,payload_sha256,payload_json,imported_at_ms)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(source_collection,document_id) DO UPDATE SET
        source_update_time_ms=excluded.source_update_time_ms,payload_sha256=excluded.payload_sha256,
        payload_json=excluded.payload_json,imported_at_ms=excluded.imported_at_ms
      WHERE COALESCE(smv_domain_legacy_documents.source_update_time_ms,0)<=COALESCE(excluded.source_update_time_ms,0)`,
    values: [collectionKey === 'liveSessionMessages' || collectionKey === 'liveSessionSignals'
      ? 'smv_live_sessions/' + parentId + '/' + (collectionKey === 'liveSessionMessages' ? 'messages' : 'signals')
      : WALLET_DOMAIN_BACKFILL_COLLECTIONS[collectionKey]?.path || collectionKey,
      id,sourceUpdated,digestPlaceholder,raw,Number(nowMs)]
  };
  const statements = mapped.statements.slice();
  statements.push(rawStatement);
  return { statements, mapped: mapped.statements.length > 0, warning: mapped.warning || '' };
}
