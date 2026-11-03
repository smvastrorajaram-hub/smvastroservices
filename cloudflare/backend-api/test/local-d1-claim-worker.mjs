import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync } from 'node:sqlite';
import { createD1WalletAdapter } from '../../../shared/backend-platform/d1-wallet-adapter.mjs';

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
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        sqlite.exec('COMMIT');
        return result;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    }
  };
}

const sqlite = new DatabaseSync(workerData.dbPath);
try {
  sqlite.exec('PRAGMA busy_timeout=10000');
  const adapter = createD1WalletAdapter({
    db: makeD1Binding(sqlite),
    now: () => workerData.nowMs
  });
  const result = await adapter.recordWebhookEvent(workerData.input);
  parentPort.postMessage({ ok: true, result });
} catch (error) {
  parentPort.postMessage({ ok: false, error: String(error?.stack || error) });
  process.exitCode = 1;
} finally {
  sqlite.close();
}
