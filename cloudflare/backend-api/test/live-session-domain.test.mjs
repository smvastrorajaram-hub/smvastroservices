import test from 'node:test';
import assert from 'node:assert/strict';
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
  calculateLiveSettlement
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

test('promotional minutes are used before cash minutes and only paid started minutes are charged',()=>{
  const at59=calculateLiveSessionCharge({elapsedMs:59999,ratePerMinutePaise:1000,maximumMinutes:5,freeMinutes:1});
  assert.deepEqual(at59,{elapsedMs:59999,billableMinutes:0,totalBillableMinutes:1,freeMinutesUsed:1,amountPaise:0});
  const at120=calculateLiveSessionCharge({elapsedMs:120000,ratePerMinutePaise:1200,maximumMinutes:5,freeMinutes:1});
  assert.equal(at120.totalBillableMinutes,2);
  assert.equal(at120.freeMinutesUsed,1);
  assert.equal(at120.billableMinutes,1);
  assert.equal(at120.amountPaise,1200);
});

test('Wallet reserve uses Bonus Credit first and leaves legacy Free Minutes untouched',()=>{
  const result=reserveLiveWallet({
    wallet:{
      availableBalancePaise:5000,reservedBalancePaise:0,
      bonusCreditBalancePaise:3000,reservedBonusCreditPaise:0,
      bonusMinutesBalance:25,reservedBonusMinutes:0
    },
    minutes:5,ratePerMinutePaise:1000
  });
  assert.equal(result.grossRequiredPaise,5000);
  assert.equal(result.reservedBonusCreditPaise,3000);
  assert.equal(result.reservedAmountPaise,2000);
  assert.equal(result.reservedBonusMinutes,0);
  assert.equal(result.bonusMinutesBalanceAfter,25);
  assert.equal(result.availableBalanceAfterPaise,3000);
  assert.equal(result.reservedBalanceAfterPaise,2000);
  assert.equal(result.bonusCreditBalanceAfterPaise,0);
  assert.equal(result.reservedBonusCreditAfterPaise,3000);
  assert.throws(()=>reserveLiveWallet({
    wallet:{availableBalancePaise:1000,bonusCreditBalancePaise:0,bonusMinutesBalance:100},
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
    birthDate:'2000-02-29',birthTime:'23:59',birthPlace:'Madurai',
    birthLatitude:'9.9252',birthLongitude:'78.1198',birthTimezone:'Asia/Kolkata'
  },Date.parse('2026-10-31T00:00:00Z'));
  assert.equal(valid.birthDate,'2000-02-29');
  assert.equal(valid.birthLatitude,9.9252);
  assert.throws(()=>validateLiveBirthDetails({birthDate:'2026-11-01',birthTime:'12:00',birthPlace:'Madurai'},Date.parse('2026-10-31T00:00:00Z')),error=>error.code==='LIVE_BIRTH_DATE_FUTURE');
  assert.throws(()=>validateLiveBirthDetails({birthDate:'2000-01-01',birthTime:'24:00',birthPlace:'Madurai'}),error=>error.code==='LIVE_BIRTH_TIME_INVALID');
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
      reservedAmountPaise:2000,reservedBonusCreditPaise:3000,
      astrologerCommissionPercent:20,adminCommissionPercent:80
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

test('session settlement releases all reserve before connection and rounds connected time upward',()=>{
  const pending=calculateLiveSettlement({
    session:{minutes:5,ratePerMinutePaise:1000,reservedAmountPaise:4000,reservedBonusMinutes:1},
    nowMs:2000
  });
  assert.equal(pending.chargedAmountPaise,0);
  assert.equal(pending.releasedAmountPaise,4000);
  assert.equal(pending.bonusMinutesReleased,1);
  const started=calculateLiveSettlement({
    session:{minutes:5,ratePerMinutePaise:1000,reservedAmountPaise:4000,reservedBonusMinutes:1,startedAtMs:1000,astrologerCommissionPercent:20,adminCommissionPercent:80},
    nowMs:61000
  });
  assert.equal(started.totalBillableMinutes,1);
  assert.equal(started.freeMinutesUsed,1);
  assert.equal(started.chargedAmountPaise,0);
  assert.equal(started.releasedAmountPaise,4000);
  const longer=calculateLiveSettlement({
    session:{minutes:5,ratePerMinutePaise:1000,reservedAmountPaise:4000,reservedBonusMinutes:1,startedAtMs:1000,astrologerCommissionPercent:20,adminCommissionPercent:80},
    nowMs:121001
  });
  assert.equal(longer.totalBillableMinutes,3);
  assert.equal(longer.freeMinutesUsed,1);
  assert.equal(longer.chargedAmountPaise,2000);
  assert.equal(longer.releasedAmountPaise,2000);
  assert.equal(longer.astrologerAmountPaise,400);
  assert.equal(longer.adminAmountPaise,1600);
});
