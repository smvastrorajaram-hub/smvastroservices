import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';
import { createD1LiveSessionService } from '../../../shared/backend-platform/d1-live-session-service.mjs';

function makeD1Binding(sqlite) {
  return {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async run() {
          const result = sqlite.prepare(sql).run(...values);
          return { success: true, meta: { changes: Number(result.changes || 0) } };
        },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...values) }; }
      };
      return statement;
    },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };
}

const sqlite = new DatabaseSync(workerData.dbPath);
try {
  sqlite.exec('PRAGMA busy_timeout=15000');
  if (workerData.action === 'capacity-insert') {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const { customerUid, astrologerUid, sessionId, amountPaise, nowMs } = workerData;
      const ledgerId = 'local-cap-ledger-' + sessionId;
      const payload = JSON.stringify({
        id: sessionId, sessionId, origin: 'direct', customerUid, astrologerUid,
        mode: 'call', minutes: 1, ratePerMinutePaise: amountPaise,
        reservedAmountPaise: amountPaise, reservedBonusMinutes: 0,
        createdAtMs: nowMs, updatedAtMs: nowMs
      });
      sqlite.prepare(
        `INSERT INTO smv_domain_wallet_ledger
         (ledger_id,owner_uid,owner_role,currency,type,direction,amount_paise,
          available_delta_paise,reserved_delta_paise,bonus_minutes_delta,reserved_bonus_minutes_delta,
          idempotency_key,reference_type,reference_id,note,metadata_json,status,source,created_at_ms)
         VALUES (?,?,'customer','INR','live_session_reserve','reserve',?, ?, ?,0,0,?,
                 'live_session',?,'capacity worker fixture','{}','posted','local_d1_test',?)`
      ).run(ledgerId,customerUid,amountPaise,-amountPaise,amountPaise,'cap-reserve:'+sessionId,sessionId,nowMs);
      sqlite.prepare(
        `INSERT INTO smv_domain_live_sessions
         (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
          reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
          started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
         VALUES (?,?,?,'call','ringing',NULL,?,0,0,NULL,NULL,NULL,?,?,?)`
      ).run(sessionId,customerUid,astrologerUid,amountPaise,payload,nowMs,nowMs);
      sqlite.exec('COMMIT');
      parentPort.postMessage({ ok: true, inserted: true, customerUid });
    } catch (error) {
      try { sqlite.exec('ROLLBACK'); } catch {}
      parentPort.postMessage({ ok: true, inserted: false, customerUid: workerData.customerUid, error: String(error?.message || error) });
    }
  } else if (workerData.action === 'end-live-session') {
    const db = makeD1Binding(sqlite);
    const walletAdapter = createD1WalletAdapter({ db, now: () => workerData.nowMs, cryptoImpl: webcrypto });
    const firestore = { async getDocument() { return { exists: false, data: {} }; } };
    const service = createD1LiveSessionService({
      db, walletAdapter, firestore, adminWalletUid: workerData.adminUid,
      cryptoImpl: webcrypto, now: () => workerData.nowMs
    });
    const result = await service.endSession({
      sessionId: workerData.sessionId, reason: 'participant_ended', system: true
    });
    parentPort.postMessage({ ok: true, result });
  } else {
    throw new Error('Unsupported local Live invariant worker action.');
  }
} catch (error) {
  parentPort.postMessage({ ok: false, error: String(error?.stack || error) });
} finally {
  sqlite.close();
}
