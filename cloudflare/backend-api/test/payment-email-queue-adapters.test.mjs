import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1NotificationQueueConsumer } from '../../../shared/backend-platform/d1-notification-queue-consumer.mjs';
import { createRazorpayRestClient } from '../../../shared/backend-platform/razorpay-rest-adapter.mjs';
import { createResendEmailClient } from '../../../shared/backend-platform/resend-email-client.mjs';
import { createD1OutboxRepository } from '../../../shared/backend-platform/d1-outbox-adapter.mjs';

class FakeD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      sql, values: [],
      bind(...values) { this.values = values; return this; },
      async run() { return db.run(this.sql, this.values); },
      async first() { return db.first(this.sql, this.values); }
    };
  }
  async run(sql, v) {
    if (sql.includes('INSERT OR IGNORE INTO smv_domain_notification_inbox')) {
      if (this.rows.has(v[0])) return { meta: { changes: 0 } };
      this.rows.set(v[0], { event_id:v[0], event_type:v[1], state:'pending', attempt_count:0, lease_until_ms:0, created_at_ms:v[2], updated_at_ms:v[3] });
      return { meta: { changes: 1 } };
    }
    if (sql.includes("SET state='processing'")) {
      const row=this.rows.get(v[2]);
      if (!row || row.event_type!==v[3] || !(['pending','failed'].includes(row.state) || (row.state==='processing'&&row.lease_until_ms<=v[4]))) return {meta:{changes:0}};
      row.state='processing';row.attempt_count+=1;row.lease_until_ms=v[0];row.updated_at_ms=v[1];
      return {meta:{changes:1}};
    }
    if (sql.includes("SET state='sent'")) {
      const row=this.rows.get(v[3]);
      if (!row || row.state!=='processing' || row.lease_until_ms!==v[4]) return {meta:{changes:0}};
      row.state='sent';row.lease_until_ms=0;row.result_json=v[0];row.last_error=null;row.sent_at_ms=v[1];row.updated_at_ms=v[2];
      return {meta:{changes:1}};
    }
    if (sql.includes('SET state=?, lease_until_ms=0')) {
      const row=this.rows.get(v[3]);
      if (!row || row.state!=='processing' || row.lease_until_ms!==v[4]) return {meta:{changes:0}};
      row.state=v[0];row.lease_until_ms=0;row.last_error=v[1];row.updated_at_ms=v[2];
      return {meta:{changes:1}};
    }
    throw new Error('Unknown FakeD1 write: '+sql);
  }
  async first(sql,v) {
    if (sql.includes('SELECT state, attempt_count, lease_until_ms')) {
      const row=this.rows.get(v[0]);
      return row ? {...row} : null;
    }
    throw new Error('Unknown FakeD1 read: '+sql);
  }
}

function queueMessage(body) {
  const state={acked:false,retries:[]};
  return {
    state, body,
    ack(){state.acked=true;},
    retry(options){state.retries.push(options);}
  };
}

test('FCM queue event is delivered once and marked sent in the inbox', async () => {
  const db=new FakeD1();let sent=0;
  const consumer=createD1NotificationQueueConsumer({
    db,messaging:{async send(message){sent+=1;assert.equal(message.data.eventId,'evt-1');return {name:'fcm-message-1'};}},
    now:()=>1000
  });
  const first=queueMessage({eventId:'evt-1',eventType:'fcm.send',payload:{message:{token:'device-1',data:{type:'live_call'}}}});
  assert.equal((await consumer.processMessage(first)).status,'sent');
  assert.equal(first.state.acked,true);
  assert.equal(sent,1);
  assert.equal(db.rows.get('evt-1').state,'sent');

  const duplicate=queueMessage({eventId:'evt-1',eventType:'fcm.send',payload:{message:{token:'device-1'}}});
  assert.equal((await consumer.processMessage(duplicate)).status,'duplicate_acknowledged');
  assert.equal(duplicate.state.acked,true);
  assert.equal(sent,1);
});

test('provider failure records retry state with bounded exponential backoff', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({
    db,messaging:{async send(){throw Object.assign(new Error('temporarily unavailable'),{code:'FCM_UPSTREAM_UNAVAILABLE'});}},
    now:()=>2000
  });
  const message=queueMessage({eventId:'evt-2',eventType:'fcm.send',payload:{message:{token:'device-2'}}});
  assert.equal((await consumer.processMessage(message)).status,'retry');
  assert.equal(db.rows.get('evt-2').state,'failed');
  assert.equal(message.state.acked,false);
  assert.deepEqual(message.state.retries,[{delaySeconds:5}]);
});

test('in-flight notification lease prevents concurrent duplicate sending', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({
    db,messaging:{async send(){await new Promise(resolve=>setTimeout(resolve,10));return {name:'ok'};}},
    now:()=>3000
  });
  const body={eventId:'evt-3',eventType:'fcm.send',payload:{message:{token:'device-3'}}};
  const first=queueMessage(body), second=queueMessage(body);
  const [a,b]=await Promise.all([consumer.processMessage(first),consumer.processMessage(second)]);
  assert.equal(a.status,'sent');
  assert.equal(b.status,'lease_busy_retry');
  assert.equal(second.state.acked,false);
  assert.ok(second.state.retries.length===1);
  const replay=queueMessage(body);
  assert.equal((await consumer.processMessage(replay)).status,'duplicate_acknowledged');
  assert.equal(replay.state.acked,true);
});

test('malformed messages are acknowledged instead of retrying poison payloads forever', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({db,messaging:{async send(){}},now:()=>4000});
  const message=queueMessage({eventId:'../unsafe',eventType:'fcm.send',payload:{}});
  assert.equal((await consumer.processMessage(message)).status,'invalid_acknowledged');
  assert.equal(message.state.acked,true);
  assert.equal(db.rows.size,0);
});

test('unsupported event types are acknowledged as poison messages without provider delivery', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({db,messaging:{async send(){}},now:()=>5000});
  const message=queueMessage({eventId:'evt-5',eventType:'unknown.exec',payload:{}});
  assert.equal((await consumer.processMessage(message)).status,'invalid_acknowledged');
  assert.equal(message.state.acked,true);
});

async function hmacHex(secret, value) {
  const key = await globalThis.crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const bytes = new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

test('Razorpay adapter creates INR orders using Basic auth and exact integer paise', async () => {
  let captured;
  const client = createRazorpayRestClient({
    keyId: 'rzp_test_key', keySecret: 'test_secret',
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({
        id: 'order_123', amount: 1250, currency: 'INR', status: 'created', receipt: 'smv_123'
      }), { status: 200 });
    }
  });
  const order = await client.createOrder({ amountPaise: 1250, receipt: 'smv_123' });
  assert.equal(order.id, 'order_123');
  assert.equal(captured.body.amount, 1250);
  assert.equal(captured.body.currency, 'INR');
  assert.equal(captured.options.headers.Authorization.startsWith('Basic '), true);
  await assert.rejects(client.createOrder({ amountPaise: 12.5, receipt: 'smv_124' }), error => error.code === 'RAZORPAY_ORDER_INVALID');
});

test('Razorpay adapter verifies payment and webhook HMAC signatures', async () => {
  const client = createRazorpayRestClient({
    keyId: 'rzp_test_key', keySecret: 'test_secret',
    fetchImpl: async () => new Response('{}', { status: 200 })
  });
  const paymentSignature = await hmacHex('test_secret', 'order_1|pay_1');
  assert.equal(await client.verifyPaymentSignature({
    orderId: 'order_1', paymentId: 'pay_1', signature: paymentSignature
  }), true);
  assert.equal(await client.verifyPaymentSignature({
    orderId: 'order_1', paymentId: 'pay_1', signature: '0'.repeat(64)
  }), false);

  const rawBody = '{"event":"payment.captured","payload":{}}';
  const webhookSecret = 'test_webhook_secret';
  const webhookSignature = await hmacHex(webhookSecret, rawBody);
  assert.equal(await client.verifyWebhookSignature({ rawBody, signature: webhookSignature, webhookSecret }), true);
  assert.equal(await client.verifyWebhookSignature({ rawBody, signature: webhookSignature, webhookSecret: 'wrong' }), false);
});

test('Razorpay refund adapter sends a stable idempotency header', async () => {
  let captured;
  const client = createRazorpayRestClient({
    keyId: 'rzp_test_key', keySecret: 'test_secret',
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: 'rfnd_123', payment_id: 'pay_123', amount: 500, status: 'created' }), { status: 200 });
    }
  });
  const refund = await client.refundPayment('pay_123', {
    amountPaise: 500, receipt: 'smv_rfnd_1', idempotencyKey: 'refund:question-1'
  });
  assert.equal(refund.id, 'rfnd_123');
  assert.equal(captured.options.headers['X-Refund-Idempotency'], 'refund:question-1');
  assert.equal(captured.body.amount, 500);
});

test('Resend email adapter validates recipients and sends through the HTTPS API', async () => {
  let captured;
  const client = createResendEmailClient({
    apiKey: 're_test_key',
    from: 'SMV ASTRO <noreply@smvastroservices.in>',
    fetchImpl: async (url, options) => {
      captured = { url, options, body: JSON.parse(options.body) };
      return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
    }
  });
  const result = await client.send({
    to: 'customer@example.com', subject: 'SMV ASTRO update',
    text: 'Your update is ready.', replyTo: 'support@example.com'
  });
  assert.equal(result.id, 'email_123');
  assert.equal(captured.options.headers.Authorization, 'Bearer re_test_key');
  assert.equal(captured.body.reply_to[0], 'support@example.com');
  await assert.rejects(client.send({ to: 'bad-address', subject: 'Test', text: 'Hello' }), /recipients are invalid/);
  await assert.rejects(client.send({ to: 'user@example.com', subject: 'bad\r\nheader', text: 'Hello' }), /header value is invalid/);
});

class FakeOutboxD1 {
  constructor() { this.rows = new Map(); }
  prepare(sql) {
    const db = this;
    return {
      sql, values: [],
      bind(...values) { this.values = values; return this; },
      async run() { return db.run(this.sql, this.values); },
      async first() { return db.first(this.sql, this.values); },
      async all() { return db.all(this.sql, this.values); }
    };
  }
  async run(sql, v) {
    if (sql.includes('INSERT OR IGNORE INTO smv_domain_event_outbox')) {
      const [id,type,key,payload,at,created,updated] = v;
      if ([...this.rows.values()].some(row => row.event_type === type && row.event_key === key)) return { meta:{changes:0} };
      this.rows.set(id,{outbox_id:id,event_type:type,event_key:key,payload_json:payload,status:'pending',attempt_count:0,next_attempt_at_ms:at,created_at_ms:created,updated_at_ms:updated});
      return {meta:{changes:1}};
    }
    if (sql.includes("SET status='sent'")) {
      const row=this.rows.get(v[1]);
      if(row){row.status='sent';row.attempt_count+=1;row.updated_at_ms=v[0];}
      return {meta:{changes:row?1:0}};
    }
    if (sql.includes('SET status=?, attempt_count=?')) {
      const row=this.rows.get(v[5]);
      if(row){row.status=v[0];row.attempt_count=v[1];row.next_attempt_at_ms=v[2];row.last_error=v[3];row.updated_at_ms=v[4];}
      return {meta:{changes:row?1:0}};
    }
    if (sql.includes("SET status='dead'")) {
      const row=this.rows.get(v[2]);
      if(row){row.status='dead';row.last_error=v[0];row.updated_at_ms=v[1];}
      return {meta:{changes:row?1:0}};
    }
    throw new Error('Unknown outbox write: '+sql);
  }
  async first(sql,v) {
    if(sql.includes('WHERE event_type = ? AND event_key = ?')){
      return [...this.rows.values()].find(row=>row.event_type===v[0]&&row.event_key===v[1])||null;
    }
    throw new Error('Unknown outbox first: '+sql);
  }
  async all(sql,v) {
    if(sql.includes('FROM smv_domain_event_outbox')){
      return {results:[...this.rows.values()].filter(row=>['pending','failed'].includes(row.status)&&row.next_attempt_at_ms<=v[0])
        .sort((a,b)=>a.created_at_ms-b.created_at_ms).slice(0,v[1]).map(row=>({...row}))};
    }
    throw new Error('Unknown outbox query: '+sql);
  }
}

test('D1 outbox enqueue is idempotent and queue dispatch is at-least-once shaped', async () => {
  const db=new FakeOutboxD1();
  const outbox=createD1OutboxRepository({db,now:()=>1000});
  const first=await outbox.enqueue({
    outboxId:'outbox-1',eventType:'fcm.send',eventKey:'session:1:incoming',
    payload:{message:{token:'device-1'}}
  });
  assert.equal(first.alreadyEnqueued,false);
  const duplicate=await outbox.enqueue({
    outboxId:'outbox-2',eventType:'fcm.send',eventKey:'session:1:incoming',
    payload:{message:{token:'device-1'}}
  });
  assert.equal(duplicate.alreadyEnqueued,true);
  const messages=[];
  const dispatched=await outbox.dispatchPending({async send(message){messages.push(message);}});
  assert.deepEqual(dispatched,{scanned:1,sent:1,failed:0});
  assert.equal(messages[0].eventId,'session:1:incoming');
  assert.equal(db.rows.get('outbox-1').status,'sent');
});
