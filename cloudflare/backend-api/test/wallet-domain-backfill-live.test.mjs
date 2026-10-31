import test from 'node:test';
import assert from 'node:assert/strict';
import { mapLegacyWalletDomainDocument } from '../../../shared/backend-platform/wallet-domain-backfill.mjs';

test('legacy live earnings convert rupees to paise without dropping Astrologer/Admin shares',()=>{
  const mapped=mapLegacyWalletDomainDocument('liveSessionEarnings',{
    id:'live-payment-1',
    data:{
      source:'live_session',astrologerId:'astro-1',customerId:'customer-1',
      grossAmount:100,earningAmount:20,commissionAmount:20,adminCommissionAmount:80,
      status:'credited',sessionId:'session-1',
      createdAt:new Date('2026-10-01T00:00:00Z')
    }
  });
  assert.equal(mapped.warning,'');
  assert.equal(mapped.mapped,true);
  const entry=mapped.statements.find(item=>item.kind==='live_session_earning');
  assert.ok(entry);
  assert.deepEqual(entry.values.slice(0,8),[
    'live-payment-1','astro-1','customer-1','live_session','session-1',10000,2000,8000
  ]);
});

test('legacy live earnings preserve explicit paise fields and derive a missing Admin remainder safely',()=>{
  const mapped=mapLegacyWalletDomainDocument('liveSessionEarnings',{
    id:'live-payment-2',
    data:{
      source:'live_session',astrologerUid:'astro-1',grossAmountPaise:999,
      astrologerAmountPaise:500,status:'credited'
    }
  });
  const entry=mapped.statements.find(item=>item.kind==='live_session_earning');
  assert.ok(entry);
  assert.deepEqual(entry.values.slice(4,8),['live-payment-2',999,500,499]);
});

test('legacy withdrawal rupee amounts become integer paise while new paise values remain unchanged',()=>{
  const rupees=mapLegacyWalletDomainDocument('withdrawals',{
    id:'withdrawal-legacy-1',
    data:{astrologerId:'astro-1',amount:300,status:'pending',createdAt:new Date('2026-10-01T00:00:00Z')}
  });
  const rupeeEntry=rupees.statements.find(item=>item.kind==='withdrawal');
  assert.ok(rupeeEntry);
  assert.equal(rupeeEntry.values[2],30000);

  const paise=mapLegacyWalletDomainDocument('withdrawals',{
    id:'withdrawal-legacy-2',
    data:{astrologerUid:'astro-1',amountPaise:45000,status:'paid'}
  });
  assert.equal(paise.statements.find(item=>item.kind==='withdrawal').values[2],45000);
});

test('single-statement domain mappings are counted as normalized records during reconciliation',()=>{
  const mapped=mapLegacyWalletDomainDocument('liveSessions',{
    id:'session-1',
    data:{
      customerUid:'customer-1',astrologerUid:'astro-1',mode:'call',
      state:'ended',actualChargePaise:1000
    }
  });
  assert.equal(mapped.statements.filter(item=>item.kind==='live_session').length,1);
  assert.equal(mapped.statements.filter(item=>item.kind==='legacy_document_archive').length,1);
  assert.equal(mapped.mapped,true);
});
