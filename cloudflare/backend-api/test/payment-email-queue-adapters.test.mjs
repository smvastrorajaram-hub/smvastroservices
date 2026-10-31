import test from 'node:test';
import assert from 'node:assert/strict';
import { createD1NotificationQueueConsumer } from '../../../shared/backend-platform/d1-notification-queue-consumer.mjs';

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
  assert.equal(b.status,'duplicate_acknowledged');
});

test('malformed messages are acknowledged instead of retrying poison payloads forever', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({db,messaging:{async send(){}},now:()=>4000});
  const message=queueMessage({eventId:'../unsafe',eventType:'fcm.send',payload:{}});
  assert.equal((await consumer.processMessage(message)).status,'invalid_acknowledged');
  assert.equal(message.state.acked,true);
  assert.equal(db.rows.size,0);
});

test('unsupported event is marked failed and retried, never sent to an arbitrary target', async () => {
  const db=new FakeD1();
  const consumer=createD1NotificationQueueConsumer({db,messaging:{async send(){}},now:()=>5000});
  const message=queueMessage({eventId:'evt-5',eventType:'unknown.exec',payload:{}});
  assert.equal((await consumer.processMessage(message)).status,'invalid_acknowledged');
  assert.equal(message.state.acked,true);
});
