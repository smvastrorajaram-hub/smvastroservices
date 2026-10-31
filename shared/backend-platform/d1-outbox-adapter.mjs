const MAX_ATTEMPTS = 12;
const BACKOFF_BASE_MS = 5000;
const BACKOFF_MAX_MS = 15 * 60 * 1000;

function validEvent(input) {
  const type = String(input?.eventType || '').trim();
  const key = String(input?.eventKey || '').trim();
  const id = String(input?.outboxId || '').trim();
  if (!/^[a-z][a-z0-9._-]{1,79}$/.test(type) ||
      !/^[A-Za-z0-9:_-]{1,240}$/.test(key) ||
      !/^[A-Za-z0-9:_-]{1,240}$/.test(id)) {
    throw new TypeError('Outbox event identity is invalid.');
  }
  const payload = input?.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Outbox payload must be an object.');
  const serialized = JSON.stringify(payload);
  if (serialized.length > 128 * 1024) throw Object.assign(new Error('Outbox payload is too large.'), { code: 'OUTBOX_PAYLOAD_TOO_LARGE' });
  return { eventType: type, eventKey: key, outboxId: id, payloadJson: serialized };
}

/**
 * D1 transactional outbox repository. Domain code can insert into this table in
 * the same db.batch() as its state mutation; dispatch itself is explicitly
 * at-least-once and consumers must be idempotent by eventKey.
 */
export function createD1OutboxRepository({ db, now = Date.now } = {}) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('A D1 database binding is required.');
  const statement = (sql, values = []) => db.prepare(sql).bind(...values);

  async function enqueue(input) {
    const event = validEvent(input);
    const timestamp = Number(now());
    await statement(
      `INSERT OR IGNORE INTO smv_domain_outbox
       (outbox_id, event_type, event_key, payload_json, status, attempt_count,
        next_attempt_at_ms, created_at_ms, updated_at_ms)
       VALUES (?, ?, ?, ?, 'pending', 0, ?, ?, ?)`,
      [event.outboxId, event.eventType, event.eventKey, event.payloadJson, timestamp, timestamp, timestamp]
    ).run();
    const row = await statement(
      'SELECT outbox_id, status FROM smv_domain_outbox WHERE event_type = ? AND event_key = ? LIMIT 1',
      [event.eventType, event.eventKey]
    ).first();
    return { success: true, alreadyEnqueued: row?.outbox_id !== event.outboxId, outboxId: row?.outbox_id || event.outboxId, status: row?.status || 'pending' };
  }

  async function dispatchPending(queue, { limit = 50 } = {}) {
    if (!queue || typeof queue.send !== 'function') throw new TypeError('A Cloudflare Queue producer binding is required.');
    const max = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
    const timestamp = Number(now());
    const page = await statement(
      `SELECT outbox_id, event_type, event_key, payload_json, attempt_count
       FROM smv_domain_outbox
       WHERE status IN ('pending','failed') AND next_attempt_at_ms <= ?
       ORDER BY created_at_ms ASC, outbox_id ASC LIMIT ?`,
      [timestamp, max]
    ).all();
    let sent = 0, failed = 0;
    for (const row of page?.results || []) {
      let payload;
      try { payload = JSON.parse(String(row.payload_json || '{}')); }
      catch {
        await statement(
          "UPDATE smv_domain_outbox SET status='dead', last_error=?, updated_at_ms=? WHERE outbox_id=?",
          ['OUTBOX_PAYLOAD_INVALID', Number(now()), row.outbox_id]
        ).run();
        failed += 1;
        continue;
      }
      const message = { eventId: String(row.event_key), eventType: String(row.event_type), payload };
      try {
        await queue.send(message);
        await statement(
          "UPDATE smv_domain_outbox SET status='sent', attempt_count=attempt_count+1, updated_at_ms=? WHERE outbox_id=? AND status IN ('pending','failed')",
          [Number(now()), row.outbox_id]
        ).run();
        sent += 1;
      } catch {
        const attempts = Number(row.attempt_count || 0) + 1;
        const dead = attempts >= MAX_ATTEMPTS;
        const delay = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * (2 ** Math.min(attempts - 1, 8)));
        await statement(
          "UPDATE smv_domain_outbox SET status=?, attempt_count=?, next_attempt_at_ms=?, last_error=?, updated_at_ms=? WHERE outbox_id=?",
          [dead ? 'dead' : 'failed', attempts, Number(now()) + delay, 'QUEUE_SEND_FAILED', Number(now()), row.outbox_id]
        ).run();
        failed += 1;
      }
    }
    return { scanned: page?.results?.length || 0, sent, failed };
  }

  return Object.freeze({ enqueue, dispatchPending });
}
