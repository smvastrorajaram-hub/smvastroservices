import { safePaise, walletError } from './wallet-domain.mjs';
import { encryptPayoutSnapshot, decryptPayoutSnapshot } from './payout-encryption.mjs';
import { createUniqueNumericReference } from './public-reference-id.mjs';

const SEVEN_DAYS_MS=7*24*60*60*1000;
const MINIMUM_WITHDRAWAL_PAISE=30000;

function readJson(value) {
  try { return JSON.parse(String(value||'{}')); } catch { return {}; }
}
function moneyPaise(value) {
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0) return 0;
  const paise=Math.round(amount*100);
  return Number.isSafeInteger(paise)?paise:0;
}
function withdrawalError(code,message,status=409) {
  return walletError(code,message,status);
}
function safePersonName(...values) {
  for(const value of values) {
    const text=String(value||'').trim().replace(/\s+/g,' ');
    if(text&&text.length<=120&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return text;
  }
  return 'Astrologer';
}
function mapWithdrawal(row) {
  if(!row) return null;
  const payload=readJson(row.payload_json);
  return {
    id:String(row.withdrawal_id),
    withdrawalId:String(payload.withdrawalId||row.withdrawal_id),
    astrologerUid:String(row.astrologer_uid),
    astrologerName:safePersonName(payload.astrologerName),
    amountPaise:safePaise(row.amount_paise),
    amount:safePaise(row.amount_paise)/100,
    status:String(row.status||'pending'),
    createdAtMs:Number(row.created_at_ms||0),
    updatedAtMs:Number(row.updated_at_ms||0),
    adminPaymentId:String(payload.adminPaymentId||'')
  };
}

export function createD1WithdrawalService({db,firestore,now=Date.now,cryptoImpl=globalThis.crypto,payoutEncryptionKey='',payoutKeyVersion='v1',sourceProjectId='smv-astro-staging'}={}) {
  if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function'||
     !firestore||typeof firestore.getDocument!=='function'||
     typeof firestore.runQuery!=='function'||!cryptoImpl?.randomUUID) {
    throw new TypeError('D1 withdrawal service requires D1, Firestore Admin REST and Web Crypto.');
  }
  function statement(sql,values=[]) { return db.prepare(sql).bind(...values); }
  async function first(sql,values=[]) { return statement(sql,values).first(); }
  async function all(sql,values=[]) { return statement(sql,values).all(); }
  const payoutKey=String(payoutEncryptionKey||'').trim();
  const payoutVersion=String(payoutKeyVersion||'v1').trim()||'v1';
  const payoutProject=String(sourceProjectId||'smv-astro-staging').trim();

  async function readEncryptedPayout(row) {
    if(!row||!row.payout_encrypted_withdrawal_id) return null;
    try {
      return await decryptPayoutSnapshot({
        record:{
          withdrawal_id:row.payout_encrypted_withdrawal_id,
          algorithm:row.payout_algorithm,
          key_version:row.payout_key_version,
          nonce_hex:row.payout_nonce_hex,
          ciphertext_hex:row.payout_ciphertext_hex,
          auth_tag_hex:row.payout_auth_tag_hex,
          source_payload_sha256:row.payout_source_payload_sha256
        },
        payoutEncryptionKey:payoutKey,
        sourceProjectId:payoutProject,
        cryptoImpl
      });
    } catch {
      throw withdrawalError(
        'WITHDRAWAL_PAYOUT_DECRYPT_FAILED',
        'The saved withdrawal payout snapshot could not be decrypted. Admin payout details are unavailable; do not use current bank details as a substitute.',
        503
      );
    }
  }

  function readLegacyPayout(row) {
    const raw=row?.legacy_private_payout_json;
    if(!raw) return null;
    const value=readJson(raw);
    return Object.keys(value).length?value:null;
  }

  function safePayoutView(value) {
    const payload=value&&typeof value==='object'?value:{};
    const payout={
      bankName:String(payload.bankName||'').trim(),
      accountName:String(payload.accountName||'').trim(),
      accountNumber:String(payload.accountNumber||'').trim(),
      ifsc:String(payload.ifsc||'').trim().toUpperCase(),
      upi:String(payload.upi||'').trim()
    };
    payout.available=!!(payout.bankName||payout.accountName||payout.accountNumber||payout.ifsc||payout.upi);
    return payout;
  }

  async function queryLegacyEarnings(uid) {
    const [questions,privateConsultations]=await Promise.all([
      firestore.runQuery({
        collectionPath:'smv_questions',
        filters:[
          {field:'astrologerId',op:'==',value:uid},
          {field:'status',op:'==',value:'answered'},
          {field:'commissionStatus',op:'==',value:'credited'}
        ],
        limit:1000
      }),
      firestore.runQuery({
        collectionPath:'smv_private_consultations',
        filters:[
          {field:'astrologerId',op:'==',value:uid},
          {field:'commissionStatus',op:'==',value:'credited'}
        ],
        limit:1000
      })
    ]);
    if(questions.length>=1000||privateConsultations.length>=1000) {
      throw withdrawalError(
        'WITHDRAWAL_LEGACY_EARNINGS_PAGE_LIMIT',
        'Historical earnings exceed one safe Firestore query page. Complete the legacy earnings backfill before requesting a withdrawal.',
        503
      );
    }
    let questionPaise=0,privatePaise=0;
    for(const row of questions) {
      const data=row.data||{};
      questionPaise+=moneyPaise(data.astrologerCommissionAmount??data.commissionAmount??0);
    }
    for(const row of privateConsultations) {
      const data=row.data||{};
      privatePaise+=moneyPaise(data.astrologerCreditedAmount??data.astrologerAmount??0);
    }
    const totalEarnedPaise=questionPaise+privatePaise;
    if(!Number.isSafeInteger(totalEarnedPaise)) throw withdrawalError('WITHDRAWAL_EARNINGS_INVALID','Historical earnings total is outside the supported range.',503);
    const timestamp=Number(now());
    await statement(
      `INSERT INTO smv_domain_legacy_earning_snapshots
       (astrologer_uid,total_earned_paise,question_count,private_consultation_count,source_update_time_ms,updated_at_ms)
       VALUES (?,?,?,?,?,?)
       ON CONFLICT(astrologer_uid) DO UPDATE SET
         total_earned_paise=excluded.total_earned_paise,
         question_count=excluded.question_count,
         private_consultation_count=excluded.private_consultation_count,
         source_update_time_ms=excluded.source_update_time_ms,
         updated_at_ms=excluded.updated_at_ms`,
      [uid,totalEarnedPaise,questions.length,privateConsultations.length,timestamp,timestamp]
    ).run();
    return {questionPaise,privatePaise,questionCount:questions.length,privateConsultationCount:privateConsultations.length,totalEarnedPaise};
  }

  async function overview(uid,{refreshLegacy=true}={}) {
    const owner=String(uid||'').trim();
    if(!/^[A-Za-z0-9_-]{1,160}$/.test(owner)) throw withdrawalError('WITHDRAWAL_ASTROLOGER_REQUIRED','Astrologer ID is required.',400);
    const legacy=refreshLegacy?await queryLegacyEarnings(owner):null;
    const [earned,withdrawals,snapshot]=await Promise.all([
      first(
        `SELECT COALESCE(SUM(astrologer_amount_paise),0) AS amount
         FROM smv_domain_earnings WHERE astrologer_uid=? AND status='credited'`,
        [owner]
      ),
      all(
        `SELECT * FROM smv_domain_withdrawals WHERE astrologer_uid=? ORDER BY created_at_ms DESC LIMIT 1000`,
        [owner]
      ),
      first('SELECT total_earned_paise FROM smv_domain_legacy_earning_snapshots WHERE astrologer_uid=?',[owner])
    ]);
    const d1Earned=safePaise(earned?.amount);
    const legacyEarned=safePaise(snapshot?.total_earned_paise);
    const totalEarned=d1Earned+legacyEarned;
    const rows=(withdrawals?.results||[]).map(mapWithdrawal);
    let reserved=0,latestWithdrawalMs=0;
    for(const row of rows) {
      if(['pending','processing','paid'].includes(row.status.toLowerCase())) {
        reserved+=row.amountPaise;
        latestWithdrawalMs=Math.max(latestWithdrawalMs,row.createdAtMs);
      }
    }
    const available=Math.max(0,totalEarned-reserved);
    const timestamp=Number(now());
    const cooldownUntil=latestWithdrawalMs?latestWithdrawalMs+SEVEN_DAYS_MS:0;
    const cooldownActive=!!latestWithdrawalMs&&timestamp<cooldownUntil;
    return {
      totalEarningsPaise:totalEarned,
      totalEarnings:totalEarned/100,
      totalWithdrawalsPaise:reserved,
      totalWithdrawals:reserved/100,
      availableToWithdrawPaise:available,
      availableToWithdraw:available/100,
      minimumWithdrawalPaise:MINIMUM_WITHDRAWAL_PAISE,
      minimumWithdrawal:MINIMUM_WITHDRAWAL_PAISE/100,
      withdrawalCooldownActive:cooldownActive,
      withdrawalCooldownEndsAt:cooldownActive?cooldownUntil:null,
      withdrawalEligible:available>=MINIMUM_WITHDRAWAL_PAISE&&!cooldownActive,
      latestWithdrawalAt:latestWithdrawalMs||null,
      legacyEarnings:legacy||null,
      withdrawals:rows.slice(0,100)
    };
  }

  async function createRequest({astrologerUid,astrologerName='',amountPaise}={}) {
    const uid=String(astrologerUid||'').trim();
    if(!/^[A-Za-z0-9_-]{1,160}$/.test(uid)) throw withdrawalError('WITHDRAWAL_ASTROLOGER_REQUIRED','Astrologer ID is required.',400);
    const amount=Number(amountPaise);
    if(!Number.isSafeInteger(amount)||amount<MINIMUM_WITHDRAWAL_PAISE) {
      throw withdrawalError('WITHDRAWAL_MINIMUM_NOT_MET','Minimum withdrawal is ₹300.',400);
    }
    if(!payoutKey) {
      throw withdrawalError(
        'WITHDRAWAL_PAYOUT_ENCRYPTION_NOT_CONFIGURED',
        'Secure payout encryption is not configured. The withdrawal request was not created. Please contact Admin.',
        503
      );
    }
    const [profile,astroProfile,summary]=await Promise.all([
      firestore.getDocument('smv_users/'+uid),
      firestore.getDocument('smv_astrologers/'+uid),
      overview(uid)
    ]);
    const profileRole=String(profile.data?.role||'').toLowerCase();
    const astro=astroProfile.data||{};
    const approvedAstrologer=astroProfile.exists&&
      (!astro.uid||String(astro.uid)===uid)&&
      ['approved','active'].includes(String(astro.status||'').toLowerCase());
    if((!profile.exists||profileRole!=='astrologer')&&!approvedAstrologer) {
      throw withdrawalError('WITHDRAWAL_ASTROLOGER_REQUIRED','Only an approved Astrologer account can request a withdrawal.',403);
    }
    if(amount>summary.availableToWithdrawPaise) {
      throw withdrawalError('WITHDRAWAL_EARNINGS_INSUFFICIENT',
        'Withdrawal amount cannot exceed available earnings of ₹'+summary.availableToWithdraw.toFixed(2)+'.',400);
    }
    if(summary.withdrawalCooldownActive) {
      throw withdrawalError('WITHDRAWAL_SEVEN_DAY_COOLDOWN',
        'Withdrawal is blocked for 7 days after the last withdrawal request. Available again at '+new Date(summary.withdrawalCooldownEndsAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+'.',400);
    }
    const payoutSnapshot=await firestore.getDocument('smv_payouts/'+uid);
    const payout=payoutSnapshot.exists?(payoutSnapshot.data||{}):{};
    const payoutStatus=String(payout.status||'').toLowerCase();
    if(!payoutSnapshot.exists||!['approved','pending_admin_review'].includes(payoutStatus)) {
      throw withdrawalError('WITHDRAWAL_PAYOUT_METHOD_UNAVAILABLE','Your bank/UPI payment method is not available for withdrawal. Please contact Admin.',400);
    }
    const required=['bankName','accountName','accountNumber','ifsc'];
    if(required.some(key=>!String(payout[key]||'').trim())) {
      throw withdrawalError('WITHDRAWAL_PAYOUT_DETAILS_INCOMPLETE','Your approved bank payment details are incomplete. Please contact Admin.',400);
    }
    const timestamp=Number(now());
    const id=cryptoImpl.randomUUID();
    const withdrawalId=await createUniqueNumericReference({
      prefix:'smvwt',cryptoImpl,
      exists:async candidate=>Boolean(await first(
        "SELECT withdrawal_id FROM smv_domain_withdrawals WHERE json_extract(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END, '$.withdrawalId') = ? LIMIT 1",
        [candidate]
      ))
    });
    const name=safePersonName(astrologerName,profile.data?.name);
    const payload={
      withdrawalId,astrologerName:name,
      requestedAtMs:timestamp,
      paymentStatus:'pending'
    };
    const privatePayout={
      withdrawalDocId:id,withdrawalId,astrologerId:uid,astrologerName:name,
      bankName:String(payout.bankName||'').trim(),
      accountName:String(payout.accountName||'').trim(),
      accountNumber:String(payout.accountNumber||'').trim(),
      ifsc:String(payout.ifsc||'').trim().toUpperCase(),
      upi:String(payout.upi||'').trim(),
      payoutStatus,createdAtMs:timestamp
    };
    let encryptedPayout;
    try {
      encryptedPayout=await encryptPayoutSnapshot({
        payload:privatePayout,
        withdrawalId:id,
        payoutEncryptionKey:payoutKey,
        payoutKeyVersion:payoutVersion,
        sourceProjectId:payoutProject,
        nowMs:timestamp,
        cryptoImpl
      });
    } catch {
      throw withdrawalError(
        'WITHDRAWAL_PAYOUT_ENCRYPTION_FAILED',
        'The payout snapshot could not be securely encrypted. The withdrawal request was not created.',
        503
      );
    }
    const results=await db.batch([
      statement(
        `INSERT INTO smv_domain_withdrawals
         (withdrawal_id,astrologer_uid,amount_paise,status,available_at_ms,payload_json,created_at_ms,updated_at_ms)
         VALUES (?,?,?,'pending',NULL,?,?,?)`,
        [id,uid,amount,JSON.stringify(payload),timestamp,timestamp]
      ),
      statement(
        `INSERT INTO smv_domain_withdrawal_payouts_encrypted
         (withdrawal_id,algorithm,key_version,nonce_hex,ciphertext_hex,auth_tag_hex,
          source_payload_sha256,created_at_ms,updated_at_ms)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [
          encryptedPayout.withdrawalId,encryptedPayout.algorithm,encryptedPayout.keyVersion,
          encryptedPayout.nonceHex,encryptedPayout.ciphertextHex,encryptedPayout.authTagHex,
          encryptedPayout.sourcePayloadSha256,encryptedPayout.createdAtMs,encryptedPayout.updatedAtMs
        ]
      )
    ]);
    if(!Array.isArray(results)||results.length!==2||results.some(row=>row?.success===false)) {
      throw withdrawalError('WITHDRAWAL_CREATE_FAILED','The withdrawal request could not be recorded atomically.',503);
    }
    return {
      success:true,withdrawalId,paymentId:withdrawalId,
      amount:amount/100,amountPaise:amount,
      availableAfterPaise:Math.max(0,summary.availableToWithdrawPaise-amount),
      availableAfter:Math.max(0,summary.availableToWithdrawPaise-amount)/100
    };
  }

  async function getEarningsDashboard(uid) {
    const summary=await overview(uid);
    const [liveRows,withdrawalRows]=await Promise.all([
      all(
        `SELECT * FROM smv_domain_earnings
         WHERE astrologer_uid=? AND source_type='live_session' AND status='credited'
         ORDER BY created_at_ms DESC LIMIT 50`,
        [String(uid)]
      ),
      all(
        `SELECT * FROM smv_domain_withdrawals
         WHERE astrologer_uid=? ORDER BY created_at_ms DESC LIMIT 100`,
        [String(uid)]
      )
    ]);
    const ledger=(liveRows.results||[]).map(row=>{
      const payload=readJson(row.payload_json);
      return {
        id:String(payload.sessionId||row.reference_id||row.earning_id),
        question:String(payload.question||('Live '+String(payload.mode||'chat').toUpperCase())),
        commission:safePaise(row.astrologer_amount_paise)/100,
        date:Number(row.created_at_ms||0)?new Date(Number(row.created_at_ms)).toISOString():null
      };
    });
    const withdrawals=(withdrawalRows.results||[]).map(row=>{
      const item=mapWithdrawal(row);
      const payload=readJson(row.payload_json);
      return {
        id:item.id,withdrawalId:item.withdrawalId,astrologerId:item.astrologerUid,
        astrologerName:item.astrologerName,amount:item.amount,status:item.status,
        adminPaymentId:item.adminPaymentId,
        createdAt:new Date(item.createdAtMs).toISOString(),
        requestedAt:new Date(item.createdAtMs).toISOString(),
        paidAt:payload.paidAtMs?new Date(Number(payload.paidAtMs)).toISOString():null
      };
    });
    return {
      success:true,totalEarnings:summary.totalEarnings,
      totalWithdrawals:summary.totalWithdrawals,
      availableToWithdraw:summary.availableToWithdraw,
      minimumWithdrawal:summary.minimumWithdrawal,
      withdrawalCooldownActive:summary.withdrawalCooldownActive,
      withdrawalCooldownEndsAt:summary.withdrawalCooldownEndsAt,
      withdrawalEligible:summary.withdrawalEligible,
      ledger,withdrawals
    };
  }

  async function listAdminWithdrawals({status=''}={}) {
    const where=String(status||'').trim().toLowerCase();
    const valid=['pending','processing','paid','rejected'];
    if(where&&!valid.includes(where)) throw withdrawalError('WITHDRAWAL_STATUS_INVALID','Unsupported withdrawal status.',400);
    const result=await all(
      `SELECT w.*,
        e.withdrawal_id AS payout_encrypted_withdrawal_id,
        e.algorithm AS payout_algorithm,
        e.key_version AS payout_key_version,
        e.nonce_hex AS payout_nonce_hex,
        e.ciphertext_hex AS payout_ciphertext_hex,
        e.auth_tag_hex AS payout_auth_tag_hex,
        e.source_payload_sha256 AS payout_source_payload_sha256,
        p.private_payout_json AS legacy_private_payout_json
       FROM smv_domain_withdrawals w
       LEFT JOIN smv_domain_withdrawal_payouts_encrypted e ON e.withdrawal_id=w.withdrawal_id
       LEFT JOIN smv_domain_withdrawal_payouts p ON p.withdrawal_id=w.withdrawal_id
       ${where?'WHERE w.status=?':''}
       ORDER BY w.created_at_ms DESC LIMIT 50`,
      where?[where]:[]
    );
    const output=[];
    for(const row of result.results||[]) {
      const item=mapWithdrawal(row);
      const encrypted=await readEncryptedPayout(row);
      const legacy=encrypted?null:readLegacyPayout(row);
      const payout=safePayoutView(encrypted||legacy);
      const data=readJson(row.payload_json);
      output.push({
        id:item.id,withdrawalId:item.withdrawalId,
        astrologerId:item.astrologerUid,astrologerUid:item.astrologerUid,
        astrologerName:item.astrologerName,amount:item.amount,status:item.status,
        adminPaymentId:item.adminPaymentId,
        createdAt:new Date(item.createdAtMs).toISOString(),
        requestedAt:new Date(item.createdAtMs).toISOString(),
        paidAt:data.paidAtMs?new Date(Number(data.paidAtMs)).toISOString():null,
        payout
      });
    }
    return output;
  }

  async function getPrivatePayout(withdrawalId) {
    const id=String(withdrawalId||'').trim();
    const row=await first(
      'SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=? LIMIT 1',[id]
    );
    if(!row) throw withdrawalError('WITHDRAWAL_NOT_FOUND','Withdrawal request was not found.',404);
    const encrypted=await first(
      'SELECT * FROM smv_domain_withdrawal_payouts_encrypted WHERE withdrawal_id=? LIMIT 1',[id]
    );
    if(encrypted) {
      const payout=await decryptPayoutSnapshot({
        record:encrypted,payoutEncryptionKey:payoutKey,
        sourceProjectId:payoutProject,cryptoImpl
      }).catch(()=>{throw withdrawalError(
        'WITHDRAWAL_PAYOUT_DECRYPT_FAILED',
        'The saved withdrawal payout snapshot could not be decrypted. Do not substitute the current bank details.',
        503
      );});
      return {withdrawal:mapWithdrawal(row),payout,source:'withdrawal_snapshot_encrypted'};
    }
    const legacy=await first(
      'SELECT private_payout_json FROM smv_domain_withdrawal_payouts WHERE withdrawal_id=? LIMIT 1',[id]
    );
    if(legacy) {
      return {
        withdrawal:mapWithdrawal(row),
        payout:readJson(legacy.private_payout_json),
        source:'withdrawal_snapshot_legacy'
      };
    }
    const current=await firestore.getDocument('smv_payouts/'+String(row.astrologer_uid));
    const payout=current.exists?(current.data||{}):{};
    return {withdrawal:mapWithdrawal(row),payout,source:'current_payout_method'};
  }

  async function markProcessing({withdrawalId,adminUid}={}) {
    const id=String(withdrawalId||'').trim(),actor=String(adminUid||'').trim();
    if(!id||!actor) throw withdrawalError('WITHDRAWAL_ID_REQUIRED','Withdrawal ID is required.',400);
    const row=await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=? LIMIT 1',[id]);
    if(!row) throw withdrawalError('WITHDRAWAL_NOT_FOUND','Withdrawal request was not found.',404);
    if(row.status==='processing') return {success:true,alreadyProcessed:true,withdrawal:mapWithdrawal(row)};
    if(row.status!=='pending') throw withdrawalError('WITHDRAWAL_STATUS_INVALID','Only a pending withdrawal can move to processing.',409);
    const payload={...readJson(row.payload_json),processingBy:actor,processingAtMs:Number(now())};
    await statement(
      `UPDATE smv_domain_withdrawals SET status='processing',payload_json=?,updated_at_ms=?
       WHERE withdrawal_id=? AND status='pending'`,
      [JSON.stringify(payload),Number(now()),id]
    ).run();
    const updated=await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=?',[id]);
    return {success:true,alreadyProcessed:false,withdrawal:mapWithdrawal(updated)};
  }

  async function rejectWithdrawal({withdrawalId,adminUid}={}) {
    const id=String(withdrawalId||'').trim(),actor=String(adminUid||'').trim();
    if(!id||!actor) throw withdrawalError('WITHDRAWAL_ID_REQUIRED','Withdrawal ID is required.',400);
    const row=await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=? LIMIT 1',[id]);
    if(!row) throw withdrawalError('WITHDRAWAL_NOT_FOUND','Withdrawal request was not found.',404);
    if(row.status==='rejected') return {success:true,alreadyProcessed:true,withdrawal:mapWithdrawal(row)};
    if(row.status!=='pending') throw withdrawalError('WITHDRAWAL_STATUS_INVALID','Only a pending withdrawal can be rejected.',409);
    const timestamp=Number(now()),payload=readJson(row.payload_json);
    await statement(
      `UPDATE smv_domain_withdrawals SET status='rejected',
       payload_json=?,updated_at_ms=? WHERE withdrawal_id=? AND status='pending'`,
      [JSON.stringify({...payload,rejectedAtMs:timestamp,rejectedBy:actor}),timestamp,id]
    ).run();
    return {success:true,alreadyProcessed:false,withdrawal:mapWithdrawal(await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=?',[id]))};
  }

  async function markPaid({withdrawalId,adminUid}={}) {
    const id=String(withdrawalId||'').trim(),actor=String(adminUid||'').trim();
    if(!id||!actor) throw withdrawalError('WITHDRAWAL_ID_REQUIRED','Withdrawal ID is required.',400);
    const row=await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=? LIMIT 1',[id]);
    if(!row) throw withdrawalError('WITHDRAWAL_NOT_FOUND','Withdrawal request was not found.',404);
    const payload=readJson(row.payload_json);
    const existingPaymentId=String(payload.adminPaymentId||payload.paymentId||'').trim();
    if(row.status==='paid'&&/^(?:smvpt-|smv-pmt-)/i.test(existingPaymentId)) {
      return {success:true,alreadyProcessed:true,paymentId:existingPaymentId,withdrawal:mapWithdrawal(row)};
    }
    if(!['processing','paid'].includes(String(row.status||''))) {
      throw withdrawalError('WITHDRAWAL_STATUS_INVALID','Only a processing withdrawal can be marked as paid.',409);
    }
    const paymentId=await createUniqueNumericReference({
      prefix:'smvpt',cryptoImpl,
      exists:async candidate=>Boolean(await first(
        "SELECT withdrawal_id FROM smv_domain_withdrawals WHERE json_extract(payload_json, '$.adminPaymentId') = ? LIMIT 1",
        [candidate]
      ))
    });
    const timestamp=Number(now());
    const updatedPayload={...payload,adminPaymentId:paymentId,paymentId,paidAtMs:payload.paidAtMs||timestamp,updatedBy:actor};
    await statement(
      `UPDATE smv_domain_withdrawals SET status='paid',payload_json=?,updated_at_ms=?
       WHERE withdrawal_id=? AND status IN ('processing','paid')
         AND (json_extract(payload_json, '$.adminPaymentId') IS NULL
              OR json_extract(payload_json, '$.adminPaymentId')='')`,
      [JSON.stringify(updatedPayload),timestamp,id]
    ).run();
    const updated=await first('SELECT * FROM smv_domain_withdrawals WHERE withdrawal_id=?',[id]);
    const finalPayload=readJson(updated?.payload_json);
    const finalPaymentId=String(finalPayload.adminPaymentId||finalPayload.paymentId||'').trim();
    if(!updated||updated.status!=='paid'||!/^smvpt-[0-9]{6}$/i.test(finalPaymentId)) {
      throw withdrawalError('WITHDRAWAL_PAYMENT_REFERENCE_FAILED','The Admin Payment ID could not be confirmed safely.',503);
    }
    return {
      success:true,alreadyProcessed:finalPaymentId!==paymentId,
      paymentId:finalPaymentId,withdrawal:mapWithdrawal(updated)
    };
  }

  return Object.freeze({overview,getEarningsDashboard,createRequest,listAdminWithdrawals,getPrivatePayout,markProcessing,rejectWithdrawal,markPaid});
}
