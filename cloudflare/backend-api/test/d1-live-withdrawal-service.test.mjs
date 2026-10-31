import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1WithdrawalService } from '../../../shared/backend-platform/d1-live-withdrawal-service.mjs';

function fixture({now=Date.parse('2026-10-31T10:00:00Z')}={}) {
  const snapshots=new Map(),withdrawals=new Map(),payouts=new Map();
  let idCounter=0;
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
          if(sql.includes('FROM smv_domain_withdrawals WHERE withdrawal_id')) return withdrawals.get(String(values[0]))||null;
          return null;
        },
        async all() {
          if(sql.includes('FROM smv_domain_withdrawals')) {
            const rows=[...withdrawals.values()].filter(row=>!values.length||row.status===values[0]);
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
          if(amount<30000) throw new Error('WITHDRAWAL_MINIMUM_NOT_MET');
          const reserved=[...withdrawals.values()].filter(row=>row.astrologer_uid===uid&&['pending','processing','paid'].includes(row.status)).reduce((sum,row)=>sum+row.amount_paise,0);
          const legacy=snapshots.get(uid)?.total_earned_paise||0;
          const earned=50000+legacy;
          if(amount+reserved>earned) throw new Error('WITHDRAWAL_EARNINGS_INSUFFICIENT');
          const latest=[...withdrawals.values()].filter(row=>row.astrologer_uid===uid&&['pending','processing','paid'].includes(row.status)).reduce((max,row)=>Math.max(max,row.created_at_ms),0);
          if(latest&&created-latest<604800000) throw new Error('WITHDRAWAL_SEVEN_DAY_COOLDOWN');
          withdrawals.set(id,{
            withdrawal_id:id,astrologer_uid:uid,amount_paise:amount,status:'pending',
            available_at_ms:null,payload_json:String(values[3]),created_at_ms:created,updated_at_ms:Number(values[5])
          });
        } else if(sql.includes('INSERT INTO smv_domain_withdrawal_payouts')) {
          payouts.set(String(values[0]),String(values[1]));
        }
      }
      return statements.map(()=>({success:true}));
    }
  };
  return {service:createD1WithdrawalService({db,firestore,now:()=>now,cryptoImpl:{randomUUID:()=>('uuid-'+(++idCounter))}}),snapshots,withdrawals,payouts};
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
  assert.equal(result.availableAfter,500);
  assert.equal(f.withdrawals.size,1);
  const payout=JSON.parse(f.payouts.get('uuid-1'));
  assert.equal(payout.accountNumber,'123456789');
  assert.equal(payout.ifsc,'SBIN0001234');
});

test('withdrawal blocks below ₹300, over-available amounts and a second request inside seven days',async()=>{
  const f=fixture();
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:29999}),error=>error.code==='WITHDRAWAL_MINIMUM_NOT_MET');
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:90000}),error=>error.code==='WITHDRAWAL_EARNINGS_INSUFFICIENT');
  await f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000});
  await assert.rejects(()=>f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000}),error=>error.code==='WITHDRAWAL_SEVEN_DAY_COOLDOWN');
});

test('Admin can process, pay and safely retry a withdrawal; payout snapshot remains private',async()=>{
  const f=fixture();
  const created=await f.service.createRequest({astrologerUid:'astro-1',amountPaise:30000});
  const processing=await f.service.markProcessing({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(processing.withdrawal.status,'processing');
  const paid=await f.service.markPaid({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(paid.paymentId,'SMV-PMT-uuid-1');
  assert.equal(paid.withdrawal.status,'paid');
  const retry=await f.service.markPaid({withdrawalId:'uuid-1',adminUid:'admin-1'});
  assert.equal(retry.alreadyProcessed,true);
  const details=await f.service.getPrivatePayout('uuid-1');
  assert.equal(details.payout.accountNumber,'123456789');
  assert.equal(created.withdrawalId,'SMV-WD-uuid-1');
});