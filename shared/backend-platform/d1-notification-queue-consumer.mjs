const DEFAULT_LEASE_MS = 30000;
const MAX_ATTEMPTS = 12;
const MAX_RETRY_SECONDS = 900;

function safeEventId(value) {
  const id = String(value || '').trim();
  return /^[A-Za-z0-9:_-]{1,240}$/.test(id) ? id : '';
}

function safeEventType(value) {
  const type = String(value || '').trim();
  return ['fcm.send', 'email.send'].includes(type) ? type : '';
}

function retrySeconds(attempt) {
  return Math.min(MAX_RETRY_SECONDS, 5 * (2 ** Math.min(Math.max(0, attempt - 1), 8)));
}

/**
 * At-least-once D1 Queue consumer for side effects.
 * The inbox lease prevents concurrent duplicate consumers; eventId is propagated
 * to FCM data for client-side de-duplication. Email/FCM cannot be made exactly-once
 * across a provider-success / D1-ack crash window, so consumers and clients must
 * tolerate a replay of the same eventId.
 */
export function createD1NotificationQueueConsumer({ db, messaging, email, now = Date.now, leaseMs = DEFAULT_LEASE_MS } = {}) {
  if (!db || typeof db.prepare !== 'function') throw new TypeError('A D1 database binding is required.');
  const lease = Math.max(5000, Math.min(120000, Number(leaseMs) || DEFAULT_LEASE_MS));
  const statement = (sql, values = []) => db.prepare(sql).bind(...values);

  async function claim(eventId, eventType) {
    const timestamp = Number(now());
    const leaseUntil = timestamp + lease;
    const inserted = await statement(
      `INSERT OR IGNORE INTO smv_domain_notification_inbox
       (event_id, event_type, state, attempt_count, lease_until_ms, created_at_ms, updated_at_ms)
       VALUES (?, ?, 'pending', 0, 0, ?, ?)`,
      [eventId, eventType, timestamp, timestamp]
    ).run();
    const claimed = await statement(
      `UPDATE smv_domain_notification_inbox
       SET state='processing', attempt_count=attempt_count+1, lease_until_ms=?, updated_at_ms=?
       WHERE event_id=? AND event_type=? AND (
         state IN ('pending','failed') OR (state='processing' AND lease_until_ms<=?)
       )`,
      [leaseUntil, timestamp, eventId, eventType, timestamp]
    ).run();
    const row = await statement(
      'SELECT state, attempt_count, lease_until_ms FROM smv_domain_notification_inbox WHERE event_id=? LIMIT 1',
      [eventId]
    ).first();
    return {
      inserted: Number(inserted?.meta?.changes || 0) > 0,
      claimed: Number(claimed?.meta?.changes || 0) > 0,
      row: row || null,
      leaseUntil
    };
  }

  async function markSent(eventId, leaseUntil, result) {
    const timestamp = Number(now());
    const responseJson = JSON.stringify(result || {});
    const updated = await statement(
      `UPDATE smv_domain_notification_inbox
       SET state='sent', lease_until_ms=0, result_json=?, last_error=NULL,
           sent_at_ms=?, updated_at_ms=?
       WHERE event_id=? AND state='processing' AND lease_until_ms=?`,
      [responseJson, timestamp, timestamp, eventId, leaseUntil]
    ).run();
    return Number(updated?.meta?.changes || 0) === 1;
  }

  async function markFailed(eventId, leaseUntil, error, dead = false) {
    const timestamp = Number(now());
    await statement(
      `UPDATE smv_domain_notification_inbox
       SET state=?, lease_until_ms=0, last_error=?, updated_at_ms=?
       WHERE event_id=? AND state='processing' AND lease_until_ms=?`,
      [dead ? 'dead' : 'failed', String(error?.code || error?.message || 'DELIVERY_FAILED').slice(0, 240), timestamp, eventId, leaseUntil]
    ).run();
  }

  async function deliver(eventType, eventId, payload) {
    if (eventType === 'fcm.send') {
      if (!messaging || typeof messaging.send !== 'function') throw Object.assign(new Error('FCM adapter is not configured.'), { code: 'FCM_ADAPTER_UNAVAILABLE' });
      const message = payload?.message;
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw Object.assign(new Error('FCM outbox payload is invalid.'), { code: 'FCM_PAYLOAD_INVALID' });
      const data = message.data && typeof message.data === 'object' && !Array.isArray(message.data) ? message.data : {};
      const result = await messaging.send({ ...message, data: { ...data, eventId } });
      return { provider: 'fcm', name: String(result?.name || '') };
    }
    if (eventType === 'email.send') {
      if (!email || typeof email.send !== 'function') throw Object.assign(new Error('Email adapter is not configured.'), { code: 'EMAIL_ADAPTER_UNAVAILABLE' });
      const result = await email.send(payload?.message || {});
      return { provider: 'email', id: String(result?.id || '') };
    }
    throw Object.assign(new Error('Unsupported notification event.'), { code: 'NOTIFICATION_EVENT_UNSUPPORTED' });
  }

  async function processMessage(message) {
    const body = message?.body;
    const eventId = safeEventId(body?.eventId);
    const eventType = safeEventType(body?.eventType);
    if (!eventId || !eventType || !body?.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
      try { message?.ack?.(); } catch {}
      return { status: 'invalid_acknowledged' };
    }

    const leaseState = await claim(eventId, eventType);
    if (!leaseState.claimed) {
      const row = leaseState.row;
      if (row?.state === 'sent' || row?.state === 'dead') {
        try { message.ack(); } catch {}
        return { status: row.state === 'sent' ? 'duplicate_acknowledged' : 'dead_acknowledged' };
      }
      const remaining = Math.max(1, Math.ceil((Number(row?.lease_until_ms || 0) - Number(now())) / 1000));
      try { message.retry({ delaySeconds: Math.min(MAX_RETRY_SECONDS, remaining) }); } catch {}
      return { status: 'lease_busy_retry' };
    }

    const attempt = Number(leaseState.row?.attempt_count || 1);
    try {
      const result = await deliver(eventType, eventId, body.payload);
      const saved = await markSent(eventId, leaseState.leaseUntil, result);
      if (!saved) {
        try { message.retry({ delaySeconds: 5 }); } catch {}
        return { status: 'lease_lost_retry' };
      }
      try { message.ack(); } catch {}
      return { status: 'sent', eventId };
    } catch (error) {
      const dead = attempt >= MAX_ATTEMPTS;
      await markFailed(eventId, leaseState.leaseUntil, error, dead);
      if (dead) {
        try { message.ack(); } catch {}
        return { status: 'dead', eventId };
      }
      try { message.retry({ delaySeconds: retrySeconds(attempt) }); } catch {}
      return { status: 'retry', eventId, attempt };
    }
  }

  async function processBatch(batch) {
    if (!Array.isArray(batch?.messages)) throw new TypeError('A Cloudflare Queue batch is required.');
    const results = [];
    for (const message of batch.messages) results.push(await processMessage(message));
    return results;
  }

  return Object.freeze({ processMessage, processBatch, retrySeconds });
}
