import test from 'node:test';
import assert from 'node:assert/strict';
import { createWalletDomainBackfillService } from '../../../shared/backend-platform/d1-wallet-domain-backfill.mjs';

function makeFixture({ documents = [], nextPageToken = '', blocker = false } = {}) {
  const archive = new Map();
  const wallets = new Map();
  const normalized = new Map();
  let batchCount = 0;
  let writes = 0;
  const firestore = {
    async listDocuments(path, options = {}) {
      return { documents:documents.slice(0,options.pageSize||40), nextPageToken };
    },
    async getDocument(path) {
      return { exists:false, id:path.split('/').pop(), data:null };
    },
    async runQuery(options) {
      const field=options.filters?.[0]?.field;
      return blocker && field==='state' ? [{id:'active-session',data:{state:'active'}}] : [];
    }
  };
  const db = {
    prepare(sql) {
      let values=[];
      return {
        sql,
        get values() { return values; },
        bind(...input) { values=input; return this; },
        async run() { writes++; return {success:true,meta:{changes:1}}; },
        async all() {
          if (sql.includes('FROM smv_domain_legacy_documents')) {
            const source=String(values[0]||'');
            const ids=new Set(values.slice(1).map(String));
            return {results:[...archive.values()].filter(row=>row.source_collection===source&&ids.has(row.document_id))};
          }
          if (sql.includes('GROUP BY source_collection')) return {results:[]};
          return {results:[]};
        },
        async first() {
          if (sql.includes('FROM smv_domain_legacy_documents')) return null;
          if (sql.includes('FROM smv_domain_wallets')) {
            return wallets.get(String(values[0]||'')) || null;
          }
          if (sql.includes('FROM smv_domain_legacy_wallet_transactions')) return normalized.get('ledger:'+String(values[0]||'')) || null;
          if (sql.includes('FROM smv_domain_legacy_wallet_recharges')) return normalized.get('recharge:'+String(values[0]||'')) || null;
          return { wallets:wallets.size, legacy_wallet_transactions:0, legacy_wallet_recharges:0,
            wallet_offers:0, live_sessions:0, live_bookings:0, archived_documents:archive.size };
        }
      };
    },
    async batch(statements) {
      batchCount++;
      const results=[];
      for (const statement of statements) {
        const sql=statement.sql;
        const values=statement.values;
        if (sql.includes('INSERT INTO smv_domain_legacy_documents')) {
          archive.set(String(values[0])+':'+String(values[1]),{
            source_collection:String(values[0]),document_id:String(values[1]),payload_sha256:String(values[3])
          });
        } else if (sql.includes('INSERT INTO smv_domain_wallets')) {
          wallets.set(String(values[0]),{owner_uid:String(values[0])});
        } else if (sql.includes('INSERT INTO smv_domain_legacy_wallet_transactions')) {
          normalized.set('ledger:'+String(values[0]),{source_document_id:String(values[0])});
        } else if (sql.includes('INSERT INTO smv_domain_legacy_wallet_recharges')) {
          normalized.set('recharge:'+String(values[0]),{recharge_id:String(values[0])});
        }
        results.push({success:true});
      }
      return results;
    }
  };
  return {
    service:createWalletDomainBackfillService({db,firestore,now:()=>Date.parse('2026-10-31T00:00:00Z')}),
    get batchCount(){return batchCount;},
    get writes(){return writes;},
    archive,wallets
  };
}

const walletDocument = {
  id:'customer-1',
  data:{
    ownerUid:'customer-1',ownerRole:'customer',availableBalancePaise:7500,
    reservedBalancePaise:0,bonusMinutesBalance:5,reservedBonusMinutes:0,
    version:4,createdAt:new Date('2026-01-01T00:00:00Z'),
    updatedAt:new Date('2026-10-30T00:00:00Z')
  },
  updateTime:new Date('2026-10-30T00:00:00Z')
};

test('preview is paginated and read-only', async () => {
  const f=makeFixture({documents:[walletDocument],nextPageToken:'page-2'});
  const result=await f.service.previewPage({collection:'wallets',pageSize:10});
  assert.equal(result.sourceDocuments,1);
  assert.equal(result.domainMapped,1);
  assert.equal(result.writesPerformed,0);
  assert.equal(result.nextPageToken,'page-2');
  assert.equal(f.batchCount,0);
  assert.equal(f.writes,0);
});

test('apply imports Wallet snapshot and raw archive in one resumable D1 batch', async () => {
  const f=makeFixture({documents:[walletDocument]});
  const result=await f.service.applyPage({collection:'wallets',pageSize:10});
  assert.equal(result.sourceDocuments,1);
  assert.equal(result.domainMapped,1);
  assert.equal(result.targetStatements,2);
  assert.equal(result.writesPerformed,2);
  assert.equal(f.batchCount,1);
  assert.equal(f.archive.size,1);
  assert.equal(f.wallets.get('customer-1').owner_uid,'customer-1');
});

test('read-only reconciliation confirms archived payload digest and normalized Wallet mapping', async () => {
  const f=makeFixture({documents:[walletDocument]});
  await f.service.applyPage({collection:'wallets'});
  const result=await f.service.reconcilePage({collection:'wallets'});
  assert.equal(result.archivedMatches,1);
  assert.equal(result.missingInD1Archive,0);
  assert.equal(result.payloadMismatches,0);
  assert.equal(result.normalizedMappingsMissing,0);
  assert.equal(result.writesPerformed,0);
});

test('source quiescence preflight detects active Live Sessions', async () => {
  const f=makeFixture({blocker:true});
  const result=await f.service.assertSourceQuiescent();
  assert.equal(result.ok,false);
  assert.ok(result.blockers.includes('active_or_connecting_live_session'));
});

test('source quiescence preflight passes when no active sessions, reservations or pending recharges exist', async () => {
  const f=makeFixture();
  const result=await f.service.assertSourceQuiescent();
  assert.deepEqual(result,{ok:true,blockers:[]});
});
