import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WALLET_RECHARGE_OFFER_TYPE,
  classifyRechargeIntent,\n  offerDateMilliseconds,
  parseRupeesToPaise,
  rechargeOfferMatches,
  selectRechargeBonusOffer,
  walletRechargeId
} from '../../../shared/backend-platform/wallet-recharge-domain.mjs';

const offer=(id,priority,bonus,overrides={})=>({
  id,offerType:WALLET_RECHARGE_OFFER_TYPE,enabled:true,
  minimumRechargeAmountPaise:1000,bonusMinutes:bonus,
  perCustomerLimit:2,totalUsageLimit:10,usedCount:0,
  priority,name:id,...overrides
});

test('Rupee parsing uses integer paise and rejects over-precision or unsafe amounts',()=>{
  assert.equal(parseRupeesToPaise('1'),100);
  assert.equal(parseRupeesToPaise('12.3'),1230);
  assert.equal(parseRupeesToPaise('12.34'),1234);
  assert.equal(parseRupeesToPaise('0'),null);
  assert.equal(parseRupeesToPaise('0.50'),50);
  assert.equal(parseRupeesToPaise('12.345'),null);
  assert.equal(parseRupeesToPaise('-1'),null);
  assert.equal(parseRupeesToPaise('9007199254740992'),null);
});

test('Recharge intent classification protects idempotency against changed amount and duplicate order creation',()=>{
  assert.equal(classifyRechargeIntent({status:'order_created',storedAmountPaise:5000,requestedAmountPaise:5000}),'reuse_order');
  assert.equal(classifyRechargeIntent({status:'paid',storedAmountPaise:5000,requestedAmountPaise:5000}),'already_paid');
  assert.equal(classifyRechargeIntent({status:'failed',storedAmountPaise:5000,requestedAmountPaise:5000}),'retry_failed');
  assert.equal(classifyRechargeIntent({status:'order_created',storedAmountPaise:5000,requestedAmountPaise:6000}),'amount_conflict');
});

test('Recharge offer eligibility checks minimum amount, start/end time and usage limits',()=>{
  const base=offer('offer-1',10,5,{startAt:1000,endAt:2000});
  assert.equal(rechargeOfferMatches(base,{amountPaise:5000,nowMs:1500,redemptionCount:0}),true);
  assert.equal(rechargeOfferMatches(base,{amountPaise:500,nowMs:1500,redemptionCount:0}),false);
  assert.equal(rechargeOfferMatches(base,{amountPaise:5000,nowMs:999,redemptionCount:0}),false);
  assert.equal(rechargeOfferMatches(base,{amountPaise:5000,nowMs:2000,redemptionCount:0}),false);
  assert.equal(rechargeOfferMatches(offer('total',1,2,{usedCount:10,totalUsageLimit:10}),{amountPaise:5000}),false);
  assert.equal(rechargeOfferMatches(offer('customer',1,2,{perCustomerLimit:1}),{amountPaise:5000,redemptionCount:1}),false);
});

test('Offer selection follows Admin priority then bonus minutes then stable name ordering',()=>{
  const selected=selectRechargeBonusOffer({
    offers:[
      offer('low',1,10),
      offer('high-priority',5,2),
      offer('high-bonus',5,8),
      offer('not-eligible',9,99,{minimumRechargeAmountPaise:999999})
    ],
    amountPaise:5000,
    nowMs:2000
  });
  assert.equal(selected.id,'high-bonus');
});

test('Recharge IDs are stable per UID and idempotency key and isolated across owners',async()=>{
  const cryptoImpl={subtle:{async digest(_algorithm,data){
    const bytes=new Uint8Array(data);
    let value=0;
    for(const byte of bytes)value=(value*33+byte)>>>0;
    const output=new Uint8Array(32);
    for(let i=0;i<32;i++)output[i]=(value+i*17)&255;
    return output.buffer;
  }}};
  const first=await walletRechargeId('customer-1','recharge-key-123',cryptoImpl);
  const same=await walletRechargeId('customer-1','recharge-key-123',cryptoImpl);
  const other=await walletRechargeId('customer-2','recharge-key-123',cryptoImpl);
  assert.equal(first,same);
  assert.notEqual(first,other);
  await assert.rejects(walletRechargeId('customer-1','short',cryptoImpl),error=>error.code==='WALLET_IDEMPOTENCY_KEY_INVALID');
});

test('Offer date parsing preserves legacy India Standard Time for datetime-local values', () => {
  assert.equal(offerDateMilliseconds('2026-10-31T10:00'), Date.parse('2026-10-31T10:00:00+05:30'));
  assert.equal(offerDateMilliseconds('2026-10-31T10:00:00'), Date.parse('2026-10-31T10:00:00+05:30'));
  assert.equal(offerDateMilliseconds('2026-10-31T10:00:00Z'), Date.parse('2026-10-31T10:00:00Z'));
  assert.equal(offerDateMilliseconds(new Date('2026-10-31T10:00:00Z')), Date.parse('2026-10-31T10:00:00Z'));
});
