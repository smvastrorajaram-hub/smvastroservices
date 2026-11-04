import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createD1WithdrawalService } from '../../../shared/backend-platform/d1-live-withdrawal-service.mjs';

const TEST_PAYOUT_KEY=Buffer.from('01234567890123456789012345678901').toString('base64');
function fixture({now=Date.parse('2026-10-31T10:00:00Z'),payoutEncryptionKey=TEST_PAYOUT_KEY}={}) {
  const snapshots=new Map(),withdrawals=new Map(),payouts=new Map(),legacyPayouts=new Map();
  let idCounter=0;
  const testCrypto={
    randomUUID:()=>('uuid-'+(++idCounter)),
    getRandomValues:webcrypto.getRandomValues.bind(webcrypto),
    subtle:webcrypto.subtle
  };
  const firestore={
    async runQuery(query) {
      if(query.collectionPath==='smv_questions') return [
        {id:'q-1',data:{astrologerCommissionAmount:150,status:'answered',commissionStatus:'credited'}},
        {id:'q-2',data:{commissionAmount:50,status:'answered',commissionStatus:'credited'}}
      ];
      if(query.collectionPath==='smv_private_consultations') return [
        {id:'pc-1',data:{astrologerCreditedAmount:100,commissionStatus:'credited'}}
      ];
      return [];
    },
    async getDocument(path) {
      if(path==='smv_users/astro-1') return {exists:true,data:{role:'customer',name:'Test Astrologer'}};
      if(path==='smv_astrologers/astro-1') return {exists:true,data:{uid:'astro-1',status:'approved'}};
      if(path==='smv_payouts/astro-1') return {exists:true,data:{
        status:'approved',bankName:'SBI',accountName:'Test Astrologer',
        accountNumber:'123456789',ifsc:'SBIN0001234',upi:'astro@upi'
      }};
      return {exists:false,data:null};
    }
  };
  const db={
    prepare(sql) {
      let values=[];
      return {
        sql,
        get values(){return values;},
        bind(...input){values=input;return this;},
        async run() {
          if(sql.includes('INSERT INTO smv_domain_legacy_earning_snapshots')) {
            snapshots.set(String(values[0]),{
              astrologer_uid:String(values[0]),total_earned_paise:Number(values[1]),
              question_count:Number(values[2]),private_consultation_count:Number(values[3]),
              source_update_time_ms:Number(values[4]),updated_at_ms:Number(values[5])
            });
            return {success:true,meta:{changes:1}};
          }
          if(sql.includes("UPDATE smv_domain_withdrawals SET status='processing'")) {
            const row=withdrawals.get(String(values[2]));
            if(row&&row.status==='pending') {row.status='processing';row.payload_json=String(values[0]);row.updated_at_ms=Number(values[1]);}
            return {success:true,meta:{changes:row?1:0}};
          }
          if(sql.includes("UPDATE smv_domain_withdrawals SET status='rejected'")) {
            const row=withdrawals.get(String(values[2]));
            if(row&&row.status==='pending') {row.status='rejected';row.payload_json=String(values[0]);row.updated_at_ms=Number(values[1]);}
            return {success:true,meta:{changes:row?1:0}};
          }
          if(sql.includes("UPDATE smv_domain_withdrawals SET status='paid'")) {
            const row=withdrawals.get(String(values[2]));
            if(row&&['processing','paid'].includes(row.status)) {row.status='paid';row.payload_json=String(values[0]);row.updated_at_ms=Number(values[1]);}
            return {success:true,meta:{changes:row?1:0}};
          }
          return {success:true,meta:{changes:1}};
        },
        async first() {
          if(sql.includes('SUM(astrologer_amount_paise)')) return {amount:50000};
          if(sql.includes('FROM smv_domain_legacy_earning_snapshots')) return snapshots.get(String(values[0]))||null;
          if(sql.includes("json_extract(payload_json, '$.withdrawalId')")) {
            return [...withdrawals.values()].find(row=>{try{return JSON.parse(row.payload_json).withdrawalId===String(values[0]);}catch{return false;}})||null;
          }
          if(sql.includes("json_extract(payload_json, '$.adminPaymentId')")) {
            return [...withdrawals.values()].find(row=>{try{return JSON.parse(row.payload_json).adminPaymentId===String(values[0]);}catch{return false;}})||null;
          }
          if(sql.includes('FROM smv_domain_withdrawals WHERE withdrawal_id')) return withdrawals.get(String(values[0]))||null;
          if(sql.includes('FROM smv_domain_withdrawal_payouts_encrypted WHERE withdrawal_id')) return payouts.get(String(values[0]))||null;
          if(sql.includes('FROM smv_domain_withdrawal_payouts WHERE withdrawal_id')) return legacyPayouts.get(String(values[0]))||null;
          return null;
        },
        async all() {
          if(sql.includes('FROM smv_domain_withdrawals')) {
            const rows=[...withdrawals.values()].filter(row=>!values.length||row.status===values[0]).map(row=>{
              const encrypted=payouts.get(row.withdrawal_id)||{};
              const legacy=legacyPayouts.get(row.withdrawal_id)||{};
              return {...row,
                payout_encrypted_withdrawal_id:encrypted.withdrawal_id||null,
                payout_algorithm:encrypted.algorithm||null,
                payout_key_version:encrypted.key_version||null,
                payout_nonce_hex:encrypted.nonce_hex||null,
                payout_ciphertext_hex:encrypted.ciphertext_hex||null,
                payout_auth_tag_hex:encrypted.auth_tag_hex||null,
                payout_source_payload_sha256:encrypted.source_payload_sha256||null,
                legacy_private_payout_json:legacy.private_payout_json||null
              };
            });
            return {results:rows};
          }
          if(sql.includes('FROM smv_domain_earnings')) return {results:[{
            earning_id:'live-1',reference_id:'session-1',source_type:'live_session',
            astrologer_amount_paise:10000,created_at_ms:now,payload_json:'{"mode":"call"}'
          }]};
          return {results:[]};
        }
      };
    },
    async batch(statements) {
      for(const item of statements) {
        const sql=item.sql,values=item.values;
        if(sql.includes('INSERT INTO smv_domain_withdrawals')) {
          const id=String(values[0]),uid=String(values[1]),amount=Number(values[2]),created=Number(values[4]);
          if(amount<30000) throw Object.assign(new Error('WITHDRAWAL_MINIMUM_NOT_MET'),{code:'WITHDRAWAL_MINIMUM_NOT_MET'});
          const reserved=[...withdrawals.values()].filter(row=>row.astrologer_uid===uid&&['pending','processing','paid'].includes(row.status)).reduce((sum,row)=>sum+row.amount_paise,0);
          const legacy=snapshots.get(uid)?.total_earned_paise||0;
          const earned=50000+legacy;
          if(amount+reserved>earned) throw Object.assign(new Error('WITHDRAWAL_EARNINGS_INSUFFICIENT'),{code:'WITHDRAWAL_EARNINGS_INSUFFICIENT'});
          const latest=[...withdrawals.values()].filter(row=>row.astrologer_uid===uid&&['pending','processing','paid'].includes(row.status)).reduce((max,row)=>Math.max(max,row.created_at_ms),0);
          if(latest&&created-latest<604800000) throw Object.assign(new Error('WITHDRAWAL_SEVEN_DAY_COOLDOWN'),{code:'WITHDRAWAL_SEVEN_DAY_COOLDOWN'});
          withdrawals.set(id,{
            withdrawal_id:id,astrologer_uid:uid,amount_paise:amount,status:'pending',
            available_at_ms:null,payload_json:String(values[3]),created_at_ms:created,updated_at_ms:Number(values[5])
          });
        } else if(sql.includes('INSERT INTO smv_domain_withdrawal_payouts_encrypted')) {
          payouts.set(String(values[0]),{
            withdrawal_id:String(values[0]),algorithm:String(values[1]),key_version:String(values[2]),
            nonce_hex:String(values[3]),ciphertext_hex:String(values[4]),auth_tag_hex:String(values[5]),
            source_payload_sha256:String(values[6]),created_at_ms:Number(values[7]),updated_at_ms:Number(values[8])
          });
        } else if(sql.includes('INSERT INTO smv_domain_withdrawal_payouts')) {
          throw new Error('New withdrawal payout snapshots must never be written to the legacy plaintext table.');
        }
      }
      return statements.map(()=>({success:true}));
    }
  };
  return {service:createD1WithdrawalService({db,firestore,now:()=>now,cryptoImpl:testCrypto,payoutEncryptionKey, payoutKeyVersion:'v1',sourceProjectId:'smv-astro'}),snapshots,withdrawals,payouts,legacyPayouts,db,firestore};
}

test('withdrawal overview merges credited legacy earnings and D1 Live earnings',async()=>{
  const f=fixture();
  const summary=await f.service.overview('astro-1');
  assert.equal(summary.totalEarningsPaise,80000);
  assert.equal(summary.totalEarnings,800);
  assert.equal(summary.availableToWithdraw,800);
  assert.equal(summary.minimumWithdrawal,300);
  assert.equal(summary.withdrawalEligible,true);
  assert.equal(f.snapshots.get('astro-1').question_count,2);
  assert.equal(f.snapshots.get('astro-1').private_consultation_count,1);
});

test('withdrawal request preserves approved payout snapshot and exact ₹300 minimum',async()=>{
  const f=fixture();
  const result=await f.service.createRequest({astrologerUid:'astro-1',astrologerName:'Test Astrologer',amountPaise:30000});
  assert.equal(result.success,true);
  assert.equal(result.amount,300);
  assert.match(result.withdrawalId,/^smvwt-\\d{6}$/);
  assert.equal(result.availableAfter,500);
  assert.equal(f.withdrawals.size,1);
  const encrypted=f.payouts.get('uuid-1');
  assert.equal(encrypted.algorithm,'AES-256-GCM');
  assert.equal(encrypted.key_version,'v1');
  assert.ok(encrypted.ciphertext_hex.length>0);
  assert.equal(f.legacyPayouts.size,0,'new bank details must not be stored in plaintext D1');
  const payoutDetails=await f.service.getPrivatePayout('uuid-1');
  assert.equal(payoutDetails.source,'withdrawal_snapshot_encrypted');
  assert.equal(payoutDetails.payout.accountNumber,'123456789');
  assert.equal(payoutDetails.payout.ifsc,'SBIN0001234');
  const listed=await f.service.listAdminWithdrawals();
  assert.equal(listed[0].payout.accountNumber,'123456789');
});

test('withdrawal blocks below ₹300, over-available amounts and a second request inside seven days',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:29999}),error=>error.code==='WITHDRAWAL_MINIMUM_NOT_MET');
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:90000}),error=>error.code==='WITHDRAWAL_EARNINGS_INSUFFICIENT');
  await f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000});
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000}),error=>error.code==='WITHDRAWAL_SEVEN_DAY_COOLDOWN');
});

test('new withdrawal payout snapshots use AES-256-GCM and are readable only through the decrypting service',async()=>{
  const f=fixture();
  await f.service.createRequest({astrologerUid:'astro-1',astrologerName:'Test Astrologer',amountPaise:30000});
  const record=f.payouts.get('uuid-1');
  assert.equal(record.algorithm,'AES-256-GCM');
  assert.notEqual(record.ciphertext_hex,Buffer.from('123456789').toString('hex'));
  assert.equal(f.legacyPayouts.has('uuid-1'),false);
  const read=await f.service.getPrivatePayout('uuid-1');
  assert.equal(read.payout.accountNumber,'123456789');
  const withoutKey=fixture({payoutEncryptionKey:''});
  await assert.rejects(()=>withoutKey.service.createRequest({astrologerUid:'astro-1',amountPaise:30000}),error=>error.code==='WITHDRAWAL_PAYOUT_ENCRYPTION_NOT_CONFIGURED');
  assert.equal(withoutKey.withdrawals.size,0);
});

test('Admin rejection updates the D1 withdrawal row and preserves encrypted payout compatibility for legacy records',async()=>{
  const f=fixture();
  await f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000});
  const rejected=await f.service.rejectWithdrawal({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(rejected.withdrawal.status,'rejected');
  const retry=await f.service.rejectWithdrawal({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(retry.alreadyProcessed,true);
  const encrypted=f.payouts.get('uuid-1');
  f.payouts.delete('uuid-1');
  f.legacyPayouts.set('uuid-1',{private_payout_json:JSON.stringify({
    withdrawalDocId:'uuid-1',withdrawalId:'SMV-WD-uuid-1',
    bankName:'SBI',accountName:'Test Astrologer',accountNumber:'123456789',
    ifsc:'SBIN0001234',upi:'astro@upi'
  })});
  const legacy=await f.service.getPrivatePayout('uuid-1');
  assert.equal(legacy.source,'withdrawal_snapshot_legacy');
  assert.equal(legacy.payout.accountNumber,'123456789');
  f.payouts.set('uuid-1',{...encrypted,ciphertext_hex:'00'.repeat(40)});
  await assert.rejects(()=>f.service.getPrivatePayout('uuid-1'),error=>error.code==='WITHDRAWAL_PAYOUT_DECRYPT_FAILED');
});

test('Admin can process, pay and safely retry a withdrawal; payout snapshot remains private',async()=>{
  const f=fixture();
  const created=await f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000});
  const processing=await f.service.markProcessing({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(processing.withdrawal.status,'processing');
  const paid=await f.service.markPaid({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.match(paid.paymentId,/^smvpt-\\d{6}$/);
  assert.equal(paid.withdrawal.status,'paid');
  const retry=await f.service.markPaid({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(retry.alreadyProcessed,true);
  assert.equal(retry.paymentId,paid.paymentId);
  const details=await f.service.getPrivatePayout('uuid-1');
  assert.equal(details.payout.accountNumber,'123456789');
  assert.match(created.withdrawalId,/^smvwt-\\d{6}$/);
});