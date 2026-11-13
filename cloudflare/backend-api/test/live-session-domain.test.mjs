import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';
import {
  parseRupeesToPaise,
  billableMinutesForElapsedMs,
  calculateLiveSessionCharge,
  reserveLiveWallet,
  splitLiveCommission,
  commissionFromPayload,
  astrologerRatePaise,
  astrologerAvailabilityStatus,
  liveRequestCanStartNow,
  validateLiveBirthDetails,
  scheduledAppointmentStartAtMs,
  calculateLiveSettlement,
  mapLiveBookingRow
} from '../../../shared/backend-platform/live-session-domain.mjs';

test('Rupee prices convert to exact integer paise and reject malformed prices',()=>{
  assert.equal(parseRupeesToPaise('10'),1000);
  assert.equal(parseRupeesToPaise('12.50'),1250);
  assert.equal(parseRupeesToPaise('0.99'),99);
  for(const value of ['',null,'-1','1.001','1e3','abc','  ']) assert.equal(parseRupeesToPaise(value),null);
});

test('started-minute billing has exact disconnect boundaries and respects selected duration',()=>{
  assert.equal(billableMinutesForElapsedMs(0,10),0);
  assert.equal(billableMinutesForElapsedMs(1,10),1);
  assert.equal(billableMinutesForElapsedMs(59999,10),1);
  assert.equal(billableMinutesForElapsedMs(60000,10),1);
  assert.equal(billableMinutesForElapsedMs(60001,10),2);
  assert.equal(billableMinutesForElapsedMs(119999,10),2);
  assert.equal(billableMinutesForElapsedMs(120000,10),2);
  assert.equal(billableMinutesForElapsedMs(120001,10),3);
  assert.equal(billableMinutesForElapsedMs(900000,2),2);
});

test('started-minute billing bills the full service time without Free Minutes offsets',()=>{
  const at59=calculateLiveSessionCharge({elapsedMs:59999,ratePerMinutePaise:1000,maximumMinutes:5});
  assert.deepEqual(at59,{elapsedMs:59999,billableMinutes:1,totalBillableMinutes:1,amountPaise:1000});
  const at120=calculateLiveSessionCharge({elapsedMs:120000,ratePerMinutePaise:1200,maximumMinutes:5});
  assert.equal(at120.totalBillableMinutes,2);
  assert.equal(at120.billableMinutes,2);
  assert.equal(at120.amountPaise,2400);
});

test('Wallet reserve applies Bonus Credit first and keeps the cash remainder separate',()=>{
  const result=reserveLiveWallet({
    wallet:{availableBalancePaise:5000,reservedBalancePaise:0,bonusCreditBalancePaise:3000,reservedBonusCreditPaise:0},
    minutes:5,ratePerMinutePaise:1000
  });
  assert.equal(result.grossRequiredPaise,5000);
  assert.equal(result.reservedBonusCreditPaise,3000);
  assert.equal(result.reservedAmountPaise,2000);
  assert.equal(result.availableBalanceAfterPaise,3000);
  assert.equal(result.reservedBalanceAfterPaise,2000);
  assert.equal(result.bonusCreditBalanceAfterPaise,0);
  assert.equal(result.reservedBonusCreditAfterPaise,3000);
  assert.throws(()=>reserveLiveWallet({
    wallet:{availableBalancePaise:1000,bonusCreditBalancePaise:0},
    minutes:2,ratePerMinutePaise:1000
  }),error=>error.code==='WALLET_INSUFFICIENT_BALANCE');
});

test('commission shares always reconcile to the exact gross paise amount',()=>{
  assert.deepEqual(splitLiveCommission(5000,{astroPercent:20,adminPercent:80}),{
    astroPercent:20,adminPercent:80,astrologerAmountPaise:1000,adminAmountPaise:4000
  });
  assert.deepEqual(splitLiveCommission(1001,{astroPercent:50,adminPercent:50}),{
    astroPercent:50,adminPercent:50,astrologerAmountPaise:501,adminAmountPaise:500
  });
  assert.throws(()=>commissionFromPayload({}),error=>error.code==='LIVE_COMMISSION_NOT_CONFIGURED');
  assert.deepEqual(commissionFromPayload({astroPercent:35}),{astroPercent:35,adminPercent:65});
  assert.deepEqual(commissionFromPayload({adminPercent:65}),{astroPercent:35,adminPercent:65});
  assert.throws(()=>splitLiveCommission(1000,{astroPercent:80,adminPercent:80}),error=>error.code==='LIVE_COMMISSION_INVALID');
});

test('Astrologer Call and Chat prices are read independently from profile fields',()=>{
  assert.equal(astrologerRatePaise({callPricePerMinute:'10.00',chatPricePerMinute:'12.50'},'call'),1000);
  assert.equal(astrologerRatePaise({callPricePerMinute:'10.00',chatPricePerMinute:'12.50'},'chat'),1250);
  assert.equal(astrologerRatePaise({callPricePerMinute:'0.50'},'call'),null);
});

test('Live request start ignores stale availability text and uses enabled mode plus authoritative capacity',()=>{
  assert.equal(liveRequestCanStartNow({availabilityStatus:'offline',liveCallEnabled:true},'call',0,1),true);
  assert.equal(liveRequestCanStartNow({availabilityStatus:'offline',liveChatEnabled:true},'chat',0,1),true);
  assert.equal(liveRequestCanStartNow({availabilityStatus:'online',liveCallEnabled:false,liveChatEnabled:true},'call',0,1),false);
  assert.equal(liveRequestCanStartNow({liveCallEnabled:true},'call',1,1),false);
  assert.equal(liveRequestCanStartNow({liveCallEnabled:true},'call',1,2),true);
  assert.equal(liveRequestCanStartNow({liveCallEnabled:true},'video',0,1),false);
});

test('Busy display uses started sessions only while request admission retains capacity limits',()=>{
  assert.equal(astrologerAvailabilityStatus({manualAvailabilityStatus:'busy',liveCallEnabled:true},0),'online');
  assert.equal(astrologerAvailabilityStatus({liveCallEnabled:true},1),'busy');
  assert.equal(liveRequestCanStartNow({manualAvailabilityStatus:'busy',liveCallEnabled:true},'call',0,2),true);
  assert.equal(liveRequestCanStartNow({availabilityStatus:'busy',liveSessionBusyManaged:true,liveCallEnabled:true},'call',1,2),true);
  assert.equal(liveRequestCanStartNow({availabilityStatus:'busy',liveSessionBusyManaged:true,liveCallEnabled:true},'call',2,2),false);
});

test('birth details validate Tamil-local customer date and coordinate boundaries',()=>{
  const valid=validateLiveBirthDetails({
    birthDate:'2000-02-29',birthTime:'23:59',birthPlace:'Madurai',birthGender:'Other',
    birthLatitude:'9.9252',birthLongitude:'78.1198',birthTimezone:'Asia/Kolkata'
  },Date.parse('2026-10-31T00:00:00Z'));
  assert.equal(valid.birthDate,'2000-02-29');
  assert.equal(valid.birthGender,'Other');
  assert.equal(valid.birthLatitude,9.9252);
  assert.throws(()=>validateLiveBirthDetails({birthDate:'2026-11-01',birthTime:'12:00',birthPlace:'Madurai',birthGender:'Male'},Date.parse('2026-10-31T00:00:00Z')),error=>error.code==='LIVE_BIRTH_DATE_FUTURE');
  assert.throws(()=>validateLiveBirthDetails({birthDate:'2000-01-01',birthTime:'24:00',birthPlace:'Madurai',birthGender:'Male'}),error=>error.code==='LIVE_BIRTH_TIME_INVALID');
  assert.throws(()=>validateLiveBirthDetails({birthDate:'2000-01-01',birthTime:'10:00',birthPlace:'Madurai',birthGender:'Invalid'}),error=>error.code==='LIVE_BIRTH_GENDER_INVALID');
});

test('legacy scheduled appointment date/time remains interpreted as India Standard Time',()=>{
  assert.equal(
    scheduledAppointmentStartAtMs({preferredDate:'2026-10-31',preferredTime:'10:30'}),
    Date.parse('2026-10-31T10:30:00+05:30')
  );
  assert.equal(scheduledAppointmentStartAtMs({preferredDate:'2026-02-30',preferredTime:'10:30'}),0);
});

test('Bonus Credit settlement uses promotional value first, charges only the cash remainder, and commissions the full service',()=>{
  const session={
    billingModel:'bonus_credit_v1',minutes:3,ratePerMinutePaise:1000,
    reservedAmountPaise:1000,reservedBonusCreditPaise:2000,startedAtMs:1000,
    astrologerCommissionPercent:20,adminCommissionPercent:80
  };
  const firstMinute=calculateLiveSettlement({session,nowMs:61000});
  assert.equal(firstMinute.grossServiceAmountPaise,1000);
  assert.equal(firstMinute.bonusCreditUsedPaise,1000);
  assert.equal(firstMinute.bonusCreditReleasedPaise,1000);
  assert.equal(firstMinute.chargedAmountPaise,0);
  assert.equal(firstMinute.releasedAmountPaise,1000);
  assert.equal(firstMinute.astrologerAmountPaise,200);
  assert.equal(firstMinute.adminAmountPaise,800);

  const secondMinute=calculateLiveSettlement({session,nowMs:121000});
  assert.equal(secondMinute.grossServiceAmountPaise,2000);
  assert.equal(secondMinute.bonusCreditUsedPaise,2000);
  assert.equal(secondMinute.bonusCreditReleasedPaise,0);
  assert.equal(secondMinute.chargedAmountPaise,0);
  assert.equal(secondMinute.releasedAmountPaise,1000);
  assert.equal(secondMinute.astrologerAmountPaise+secondMinute.adminAmountPaise,2000);

  const thirdMinute=calculateLiveSettlement({session,nowMs:181000});
  assert.equal(thirdMinute.grossServiceAmountPaise,3000);
  assert.equal(thirdMinute.bonusCreditUsedPaise,2000);
  assert.equal(thirdMinute.chargedAmountPaise,1000);
  assert.equal(thirdMinute.releasedAmountPaise,0);
  assert.equal(thirdMinute.astrologerAmountPaise+thirdMinute.adminAmountPaise,3000);
  assert.equal(thirdMinute.astrologerAmountPaise,600);
  assert.equal(thirdMinute.adminAmountPaise,2400);
});

test('Bonus Credit reserves are released when a Live session never connects',()=>{
  const result=calculateLiveSettlement({
    session:{
      billingModel:'bonus_credit_v1',minutes:5,ratePerMinutePaise:1000,
      reservedAmountPaise:2000,reservedBonusCreditPaise:3000
    },
    nowMs:2000
  });
  assert.equal(result.chargedAmountPaise,0);
  assert.equal(result.releasedAmountPaise,2000);
  assert.equal(result.bonusCreditUsedPaise,0);
  assert.equal(result.bonusCreditReleasedPaise,3000);
  assert.equal(result.astrologerAmountPaise,0);
  assert.equal(result.adminAmountPaise,0);
});

test('session settlement releases Bonus Credit and cash before connection, then charges only remaining cash',()=>{
  const pending=calculateLiveSettlement({
    session:{billingModel:'bonus_credit_v1',minutes:5,ratePerMinutePaise:1000,
      reservedAmountPaise:4000,reservedBonusCreditPaise:1000},
    nowMs:2000
  });
  assert.equal(pending.chargedAmountPaise,0);
  assert.equal(pending.releasedAmountPaise,4000);
  assert.equal(pending.bonusCreditUsedPaise,0);
  assert.equal(pending.bonusCreditReleasedPaise,1000);

  const started=calculateLiveSettlement({
    session:{billingModel:'bonus_credit_v1',minutes:5,ratePerMinutePaise:1000,
      reservedAmountPaise:4000,reservedBonusCreditPaise:1000,startedAtMs:1000,
      astrologerCommissionPercent:20,adminCommissionPercent:80},
    nowMs:61000
  });
  assert.equal(started.totalBillableMinutes,1);
  assert.equal(started.grossServiceAmountPaise,1000);
  assert.equal(started.bonusCreditUsedPaise,1000);
  assert.equal(started.chargedAmountPaise,0);
  assert.equal(started.releasedAmountPaise,4000);
  assert.equal(started.bonusCreditReleasedPaise,0);

  const longer=calculateLiveSettlement({
    session:{billingModel:'bonus_credit_v1',minutes:5,ratePerMinutePaise:1000,
      reservedAmountPaise:4000,reservedBonusCreditPaise:1000,startedAtMs:1000,
      astrologerCommissionPercent:20,adminCommissionPercent:80},
    nowMs:121001
  });
  assert.equal(longer.totalBillableMinutes,3);
  assert.equal(longer.grossServiceAmountPaise,3000);
  assert.equal(longer.bonusCreditUsedPaise,1000);
  assert.equal(longer.chargedAmountPaise,2000);
  assert.equal(longer.releasedAmountPaise,2000);
  assert.equal(longer.astrologerAmountPaise,600);
  assert.equal(longer.adminAmountPaise,2400);
});

test('Live booking row preserves the Customer birth details for the assigned Astrologer',()=>{
  const booking=mapLiveBookingRow({
    booking_id:'live-booking-1',customer_uid:'customer-1',astrologer_uid:'astro-1',
    mode:'chat',status:'pending',wallet_reservation_state:'reserved',
    reserved_amount_paise:2500,reserved_bonus_minutes:0,reserved_bonus_credit_paise:0,
    expires_at_ms:2000,created_at_ms:1000,updated_at_ms:1000,
    payload_json:JSON.stringify({
      customerName:'Customer One',
      birthDetails:{birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'}
    })
  });
  assert.equal(booking.customerName,'Customer One');
  assert.deepEqual(booking.birthDetails,{
    birthDate:'1990-01-02',birthTime:'08:30',birthPlace:'Perambalur',birthGender:'Female'
  });
});


test('D1 completed appointment lookup is participant-scoped and only returns connected ended sessions',async()=>{
  const calls=[];
  const sessionRows=[
    {
      session_id:'live-chat-session-1',customer_uid:'customer-1',astrologer_uid:'astro-1',
      mode:'chat',state:'ended',appointment_id:'appointment-chat-1',
      reserved_amount_paise:500,reserved_bonus_minutes:0,reserved_bonus_credit_paise:0,
      actual_charge_paise:500,started_at_ms:1000,ended_at_ms:2000,
      created_at_ms:900,updated_at_ms:2000,payload_json:JSON.stringify({minutes:1,ratePerMinutePaise:500})
    },
    {
      session_id:'live-call-session-1',customer_uid:'customer-1',astrologer_uid:'astro-1',
      mode:'call',state:'ended',appointment_id:'appointment-call-1',
      reserved_amount_paise:800,reserved_bonus_minutes:0,reserved_bonus_credit_paise:0,
      actual_charge_paise:800,started_at_ms:3000,ended_at_ms:4000,
      created_at_ms:2900,updated_at_ms:4000,payload_json:JSON.stringify({minutes:1,ratePerMinutePaise:800})
    }
  ];
  const db={
    prepare(sql){
      return {bind(...values){
        return {
          async all(){calls.push({sql,values});return {results:sessionRows};},
          async first(){return null;},
          async run(){return {meta:{changes:1}};}
        };
      }};
    },
    async batch(){return {success:true};}
  };
  const service=createD1LiveSessionService({
    db,
    walletAdapter:{async ensureWallet(){return {};},async getWallet(){return {}; }},
    firestore:{async getDocument(){return {exists:false,data:null};}},
    cryptoImpl:globalThis.crypto
  });
  const sessions=await service.listEndedSessionsForAppointments({
    appointmentIds:['appointment-chat-1','appointment-call-1','not-owned'],
    uid:'customer-1',role:'customer'
  });
  assert.deepEqual(Object.keys(sessions).sort(),['appointment-call-1','appointment-chat-1']);
  assert.equal(sessions['appointment-chat-1'].id,'live-chat-session-1');
  assert.equal(sessions['appointment-chat-1'].state,'ended');
  assert.equal(sessions['appointment-call-1'].id,'live-call-session-1');
  assert.equal(calls.length,1);
  assert.match(calls[0].sql,/customer_uid=\?/);
  assert.match(calls[0].sql,/state='ended'/);
  assert.match(calls[0].sql,/started_at_ms IS NOT NULL AND started_at_ms>0/);
  assert.match(calls[0].sql,/appointment_id IN \(\?,\?,\?\)/);
  assert.equal(calls[0].values[0],'customer-1');
  assert.deepEqual(calls[0].values.slice(1),['appointment-chat-1','appointment-call-1','not-owned']);
  await assert.rejects(
    service.listEndedSessionsForAppointments({appointmentIds:['appointment-chat-1'],uid:'customer-1',role:'admin'}),
    /valid signed-in Customer or Astrologer/
  );
});

 
test('Live status query is participant-scoped, bounded and excludes old ended history',async()=>{
  const calls=[];
  const db={
    prepare(sql){return{bind(...values){return{
      async all(){calls.push({sql,values});return{results:[]};},
      async first(){return null;},
      async run(){return{meta:{changes:1}};}
    };}};},
    async batch(){return{success:true};}
  };
  const service=createD1LiveSessionService({
    db,
    walletAdapter:{async ensureWallet(){return{};},async getWallet(){return{};}},
    firestore:{async getDocument(){return{exists:false,data:null};}},
    cryptoImpl:globalThis.crypto,
    now:()=>1_800_000_000_000
  });
  const sessions=await service.listSessionStatus({uid:'customer-1',role:'customer'});
  assert.deepEqual(sessions,[]);
  assert.equal(calls.length,1);
  assert.match(calls[0].sql,/customer_uid=\?/);
  assert.match(calls[0].sql,/state IN \('ringing','preparing','connecting','active'\)/);
  assert.match(calls[0].sql,/state='ended' AND updated_at_ms>=\?/);
  assert.match(calls[0].sql,/ORDER BY updated_at_ms DESC LIMIT 50/);
  assert.deepEqual(calls[0].values,['customer-1','customer-1',1_799_913_600_000]);
  await assert.rejects(service.listSessionStatus({uid:'customer-1',role:'admin'}),/Live Session login is required/);
});


test('Participant-facing D1 session view preserves gross charged value when Bonus Credit makes the cash debit zero',async()=>{
  const now=Date.now();
  const row={
    session_id:'bonus-receipt-session',
    customer_uid:'customer-1',
    astrologer_uid:'astro-1',
    mode:'call',
    state:'ended',
    appointment_id:'',
    reserved_amount_paise:0,
    reserved_bonus_credit_paise:1000,
    actual_charge_paise:0,
    started_at_ms:now-60_000,
    ended_at_ms:now,
    created_at_ms:now-60_000,
    updated_at_ms:now,
    payload_json:JSON.stringify({
      minutes:1,ratePerMinutePaise:1000,billableMinutes:1,
      actualServiceAmountPaise:1000,bonusCreditUsedPaise:1000,
      bonusCreditReleasedPaise:0,releasedAmountPaise:0
    })
  };
  const db={
    prepare(sql){return{bind(){return{
      async first(){return sql.includes('SELECT * FROM smv_domain_live_sessions')?row:null;},
      async all(){return{results:[]};},
      async run(){return{success:true,meta:{changes:1}};}
    };}};},
    async batch(){return[];}
  };
  const service=createD1LiveSessionService({
    db,
    walletAdapter:{async ensureWallet(){return{};},async getWallet(){return{};}},
    firestore:{async getDocument(){return{exists:false,data:null};}},
    cryptoImpl:globalThis.crypto
  });
  const session=await service.getSessionForParticipant({sessionId:row.session_id,uid:'customer-1'});
  assert.equal(session.state,'ended');
  assert.equal(session.actualChargePaise,0,'Cash Wallet debit remains zero when Bonus Credit paid the service');
  assert.equal(session.actualServiceAmountPaise,1000,'Receipt API exposes the full service value separately from the cash debit');
  assert.equal(session.bonusCreditUsedPaise,1000);
  assert.equal(session.bonusCreditReleasedPaise,0);
});
