import {
  safePaise,
  safeMinutes,
  walletError
} from './wallet-domain.mjs';
import { inspectMessageText } from './chat-moderation.mjs';
import {
  calculateLiveSettlement,
  reserveLiveWallet,
  astrologerRatePaise,
  validateLiveBirthDetails,
  splitLiveCommission,
  commissionFromPayload,
  mapLiveSessionRow,
  mapLiveBookingRow,
  LIVE_RING_TIMEOUT_MS,
  LIVE_PREPARATION_DURATION_MS,
  LIVE_CALL_CONNECT_TIMEOUT_MS,
  LIVE_CHAT_CONNECT_TIMEOUT_MS,
  LIVE_BOOKING_EXPIRY_MS,
  LIVE_DISCONNECT_GRACE_MS
} from './live-session-domain.mjs';

const SESSION_TABLE='smv_domain_live_sessions';
const BOOKING_TABLE='smv_domain_live_bookings';
const WALLET_TABLE='smv_domain_wallets';
const LEDGER_TABLE='smv_domain_wallet_ledger';
const ACTIVE_STATES=['ringing','preparing','connecting','active'];
const END_REASONS=new Set([
  'duration_complete','no_answer','connection_failed','network_disconnect',
  'low_wallet_balance','rejected','booking_expired','scheduled_connection_timeout','participant_ended','server_ended'
]);

function parseJson(value) {
  try { return JSON.parse(String(value||'{}')); } catch { return {}; }
}
function iso(ms) {
  const value=Number(ms||0);
  return Number.isFinite(value)&&value>0?new Date(value).toISOString():null;
}
function safeName(...values) {
  for(const value of values) {
    const name=String(value||'').trim().replace(/\s+/g,' ');
    if(name&&name.length<=120&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) return name;
  }
  return '';
}
function liveError(code,message,status=409,details={}) {
  return walletError(code,message,status,details);
}
function checkUid(value) {
  const uid=String(value||'').trim();
  return /^[A-Za-z0-9_-]{1,160}$/.test(uid)?uid:'';
}
function checkSessionId(value) {
  const id=String(value||'').trim();
  return /^[A-Za-z0-9_-]{1,180}$/.test(id)?id:'';
}

export function createD1LiveSessionService({
  db,walletAdapter,firestore,adminWalletUid='',cryptoImpl=globalThis.crypto,now=Date.now
}={}) {
  if(!db||typeof db.prepare!=='function'||typeof db.batch!=='function'||
     !walletAdapter||typeof walletAdapter.ensureWallet!=='function'||
     typeof walletAdapter.getWallet!=='function'||
     !firestore||typeof firestore.getDocument!=='function'||
     !cryptoImpl?.subtle?.digest) {
    throw new TypeError('D1 Live Session service requires D1, Wallet adapter, Firestore Admin REST and Web Crypto.');
  }

  function statement(sql,values=[]) { return db.prepare(sql).bind(...values); }
  async function first(sql,values=[]) { return statement(sql,values).first(); }
  async function all(sql,values=[]) { return statement(sql,values).all(); }
  async function batch(statements) {
    if(!statements.length) return [];
    const result=await db.batch(statements);
    if(!Array.isArray(result)||result.length!==statements.length||
       result.some(item=>item?.success===false)) {
      throw liveError('LIVE_D1_BATCH_INCOMPLETE','The Live Wallet transaction did not complete.',503);
    }
    return result;
  }
  async function sha256(value) {
    const digest=await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(String(value)));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function getSession(id) {
    const row=await first('SELECT * FROM '+SESSION_TABLE+' WHERE session_id=? LIMIT 1',[id]);
    return mapLiveSessionRow(row);
  }
  async function getBooking(id) {
    const row=await first('SELECT * FROM '+BOOKING_TABLE+' WHERE booking_id=? LIMIT 1',[id]);
    return mapLiveBookingRow(row);
  }
  async function getSetting(id) {
    const row=await first('SELECT payload_json,updated_at_ms FROM smv_domain_settings WHERE setting_id=? LIMIT 1',[id]);
    return row?{...parseJson(row.payload_json),updatedAtMs:Number(row.updated_at_ms||0)}:null;
  }
  async function saveSetting(id,payload,actorUid) {
    const timestamp=Number(now());
    const stored={...payload,updatedBy:String(actorUid||''),updatedAtMs:timestamp};
    await statement(
      `INSERT INTO smv_domain_settings(setting_id,payload_json,source_update_time_ms,updated_at_ms)
       VALUES (?,?,?,?)
       ON CONFLICT(setting_id) DO UPDATE SET
         payload_json=excluded.payload_json,
         source_update_time_ms=excluded.source_update_time_ms,
         updated_at_ms=excluded.updated_at_ms`,
      [id,JSON.stringify(stored),timestamp,timestamp]
    ).run();
    return stored;
  }
  async function getPricing() {
    const stored=await getSetting('liveSessionPricing');
    return {
      maxConcurrentSessions:Number.isSafeInteger(Number(stored?.maxConcurrentSessions))&&
        Number(stored.maxConcurrentSessions)>=1&&Number(stored.maxConcurrentSessions)<=3
        ?Number(stored.maxConcurrentSessions):1,
      callRatePaise:safePaise(stored?.callRatePaise??1000),
      chatRatePaise:safePaise(stored?.chatRatePaise??1000),
      updatedAtMs:Number(stored?.updatedAtMs||0)
    };
  }
  async function getCommission() {
    return commissionFromPayload((await getSetting('commission'))||{});
  }
  async function isApprovedAstrologer(uid) {
    const actor=checkUid(uid);
    if(!actor) return false;
    const profile=await firestore.getDocument('smv_astrologers/'+actor);
    if(!profile.exists) return false;
    const data=profile.data||{};
    const status=String(data.status||'').trim().toLowerCase();
    return (!data.uid||String(data.uid)===actor)&&['approved','active'].includes(status);
  }

  async function getProfiles(customerUid,astrologerUid) {
    const [customer,astroUser,astroProfile]=await Promise.all([
      firestore.getDocument('smv_users/'+customerUid),
      firestore.getDocument('smv_users/'+astrologerUid),
      firestore.getDocument('smv_astrologers/'+astrologerUid)
    ]);
    if(!customer.exists||String(customer.data?.role||'').toLowerCase()!=='customer') {
      throw liveError('LIVE_CUSTOMER_REQUIRED','Customer login is required to start a Live Session.',403);
    }
    if(!astroProfile.exists) throw liveError('LIVE_ASTROLOGER_NOT_FOUND','The selected Astrologer was not found.',404);
    const astro=astroProfile.data||{};
    if(!['approved','active'].includes(String(astro.status||'').toLowerCase())||
       (astro.uid&&String(astro.uid)!==astrologerUid)) {
      throw liveError('LIVE_ASTROLOGER_NOT_APPROVED','This Astrologer profile is not approved or does not belong to the requested account.',409);
    }
    return {
      customer:customer.data||{},
      astroUser:astroUser.exists?(astroUser.data||{}):{},
      astro
    };
  }
  async function activeSessionCount(astrologerUid) {
    const row=await first(
      `SELECT COUNT(*) AS total FROM ${SESSION_TABLE}
       WHERE astrologer_uid=? AND state IN ('ringing','preparing','connecting','active')`,
      [astrologerUid]
    );
    return safePaise(row?.total);
  }

  async function syncAstrologerAvailability(astrologerUid) {
    const uid=checkUid(astrologerUid);
    if(!uid||typeof firestore.setDocument!=='function') return {skipped:true};
    const count=await activeSessionCount(uid);
    const profile=await firestore.getDocument('smv_astrologers/'+uid);
    if(!profile.exists) return {skipped:true};
    const astro=profile.data||{};
    const availability=count>0?'busy':
      (astro.liveCallEnabled===true||astro.liveChatEnabled===true?'online':'offline');
    await firestore.setDocument('smv_astrologers/'+uid,{
      activeSessionCount:count,
      availabilityStatus:availability,
      liveSessionBusyManaged:count>0
    },{merge:true});
    return {activeSessionCount:count,availabilityStatus:availability};
  }
  async function buildLedger({
    ownerUid,ownerRole='customer',type,direction,amountPaise=0,
    availableDeltaPaise=0,reservedDeltaPaise=0,bonusMinutesDelta=0,
    reservedBonusMinutesDelta=0,idempotencyKey,referenceType,referenceId,note=''
  }) {
    const timestamp=Number(now());
    const ledgerId=await sha256(type+':'+ownerUid+':'+idempotencyKey);
    return statement(
      `INSERT INTO ${LEDGER_TABLE}
       (ledger_id,owner_uid,owner_role,currency,type,direction,amount_paise,
        available_delta_paise,reserved_delta_paise,bonus_minutes_delta,reserved_bonus_minutes_delta,
        idempotency_key,reference_type,reference_id,note,metadata_json,status,source,created_at_ms)
       VALUES (?,?,?,'INR',?,?,?,?,?,?,?,?,?,?,?,'{}','posted','cloudflare_live_session',?)`,
      [ledgerId,ownerUid,ownerRole,type,direction,amountPaise,availableDeltaPaise,
        reservedDeltaPaise,bonusMinutesDelta,reservedBonusMinutesDelta,
        idempotencyKey,referenceType,referenceId,String(note||'').slice(0,240),timestamp]
    );
  }
  async function reserveLedger({uid,sessionId,booking,mode,reserve}) {
    const reservationType=booking?'live_booking':'live_session';
    return buildLedger({
      ownerUid:uid,
      type:booking?'live_booking_reserve':'live_session_reserve',
      direction:'reserve',
      amountPaise:reserve.reservedAmountPaise,
      availableDeltaPaise:-reserve.reservedAmountPaise,
      reservedDeltaPaise:reserve.reservedAmountPaise,
      bonusMinutesDelta:-reserve.reservedBonusMinutes,
      reservedBonusMinutesDelta:reserve.reservedBonusMinutes,
      idempotencyKey:(booking?'live-booking:':'live-session:')+sessionId,
      referenceType:reservationType,
      referenceId:sessionId,
      note:'Wallet reserve for '+(booking?'booked Live ':'Live ')+mode+
        (reserve.reservedBonusMinutes?'; '+reserve.reservedBonusMinutes+' promotional free minute(s)':'')
    });
  }
  function livePayload(data) {
    return JSON.stringify(data);
  }
  async function createRequest({
    customerUid,astrologerId,mode,minutes,requestId,customerName,birthDetails,appointmentId=''
  }={}) {
    const uid=checkUid(customerUid),astroUid=checkUid(astrologerId);
    const kind=String(mode||'').trim().toLowerCase();
    const length=Number(minutes);
    const reqId=String(requestId||'').trim();
    const appointment=String(appointmentId||'').trim();
    const name=String(customerName||'').trim();
    if(appointment.length>180) throw liveError('LIVE_APPOINTMENT_ID_INVALID','Scheduled booking ID is invalid.',400);
    if(!uid||!astroUid) throw liveError('LIVE_ASTROLOGER_REQUIRED','Select an Astrologer to continue.',400);
    if(!['call','chat'].includes(kind)) throw liveError('LIVE_MODE_INVALID','Choose Call or Chat.',400);
    if(!Number.isSafeInteger(length)||length<1||length>1440) throw liveError('LIVE_DURATION_INVALID','Enter a whole duration from 1 to 1440 minutes.',400);
    if(reqId.length<8||reqId.length>128) throw liveError('LIVE_REQUEST_ID_INVALID','A valid request ID is required.',400);
    if(!name||name.length>100||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(name)) throw liveError('LIVE_CUSTOMER_NAME_INVALID','Enter the Customer name (not an email address).',400);
    const birth=validateLiveBirthDetails(birthDetails||{},Number(now()));
    const id=await sha256(uid+':'+reqId);
    const fingerprint=await sha256(JSON.stringify({
      customerUid:uid,astrologerId:astroUid,mode:kind,minutes:length,customerName:name,birthDetails:birth,appointmentId:appointment
    }));
    const [oldSession,oldBooking]=await Promise.all([getSession(id),getBooking(id)]);
    const existing=oldSession||oldBooking;
    if(existing) {
      if(existing.payloadFingerprint!==fingerprint||existing.customerUid!==uid||existing.astrologerUid!==astroUid) {
        throw liveError('LIVE_IDEMPOTENCY_CONFLICT','This request ID was already used for different session details.',409);
      }
      return oldSession
        ?{success:true,kind:'session',alreadyProcessed:true,session:sessionView(oldSession)}
        :{success:true,kind:'booking',alreadyProcessed:true,booking:bookingView(oldBooking)};
    }
    const profiles=await getProfiles(uid,astroUid);
    const astro=profiles.astro;
    const enabled=kind==='call'?astro.liveCallEnabled===true:astro.liveChatEnabled===true;
    if(!enabled) throw liveError('LIVE_MODE_DISABLED','This Astrologer has not enabled Live '+kind.toUpperCase()+'.',409);
    const rate=astrologerRatePaise(astro,kind);
    if(!rate) throw liveError('LIVE_PRICE_UNAVAILABLE',(kind==='call'?'Call':'Chat')+' price per minute is not configured for this Astrologer.',409);
    const [wallet,count,pricing,commission]=await Promise.all([
      walletAdapter.ensureWallet(uid,'customer'),
      activeSessionCount(astroUid),
      getPricing(),
      getCommission()
    ]);
    const reserve=reserveLiveWallet({wallet,minutes:length,ratePerMinutePaise:rate});
    // Match the legacy rule: the Astrologer is considered Online only when the
    // selected live mode is enabled and no other Live Session is active.
    const profileAvailability=String(astro.availabilityStatus||astro.onlineStatus||'offline').trim().toLowerCase();
    const availability=count>0?'busy':profileAvailability;
    const canStartNow=availability==='online'&&count<pricing.maxConcurrentSessions;
    const timestamp=Number(now());
    const common={
      sessionId:id,customerUid:uid,astrologerUid:astroUid,astrologerId:astroUid,
      appointmentId:String(appointmentId||''),customerName:name,
      astrologerName:safeName(astro.name,astro.fullName,astro.displayName,astro.astrologerName,
        profiles.astroUser.name,profiles.astroUser.fullName,profiles.astroUser.displayName)||'Astrologer',
      birthDetails:birth,mode:kind,minutes:length,ratePerMinutePaise:rate,
      reservedAmountPaise:reserve.reservedAmountPaise,
      reservedBonusMinutes:reserve.reservedBonusMinutes,
      astrologerCommissionPercent:commission.astroPercent,
      adminCommissionPercent:commission.adminPercent,
      payloadFingerprint:fingerprint,createdAtMs:timestamp,updatedAtMs:timestamp,
      customerReady:false,astrologerReady:false,actualChargePaise:0,
      releasedAmountPaise:0,freeMinutesUsed:0,origin:canStartNow?'direct':'offline_queue'
    };
    const ledger=await reserveLedger({uid,sessionId:id,booking:!canStartNow,mode:kind,reserve});
    if(canStartNow) {
      const session={...common,state:'ringing'};
      try {
        await batch([
          ledger,
          statement(
            `INSERT INTO ${SESSION_TABLE}
             (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
              reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
              started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
             VALUES (?,?,?,?,'ringing',?,?,?,0,NULL,NULL,NULL,?,?,?)`,
            [id,uid,astroUid,kind,appointment||null,reserve.reservedAmountPaise,reserve.reservedBonusMinutes,
              livePayload(session),timestamp,timestamp]
          )
        ]);
      } catch(error) {
        const again=await getSession(id);
        if(again&&again.payloadFingerprint===fingerprint) return {success:true,kind:'session',alreadyProcessed:true,session:sessionView(again)};
        if(String(error?.message||'').includes('LIVE_ASTROLOGER_BUSY')) throw liveError('LIVE_ASTROLOGER_BUSY','This Astrologer is currently busy. Choose a booking instead.',409);
        throw mapLiveD1Error(error);
      }
      const created=await getSession(id);
      await syncAstrologerAvailability(astroUid).catch(error=>console.warn('[Live Session] Astrologer availability sync deferred:',error?.message||error));
      return {success:true,kind:'session',alreadyProcessed:false,session:sessionView(created),wallet:await walletAdapter.getWallet(uid)};
    }
    const expiresAt=timestamp+LIVE_BOOKING_EXPIRY_MS;
    const booking={
      ...common,state:'pending',status:'pending',walletReservationState:'reserved',
      expiresAtMs:expiresAt
    };
    try {
      await batch([
        ledger,
        statement(
          `INSERT INTO ${BOOKING_TABLE}
           (booking_id,customer_uid,astrologer_uid,mode,status,wallet_reservation_state,
            reserved_amount_paise,reserved_bonus_minutes,expires_at_ms,payload_json,created_at_ms,updated_at_ms)
           VALUES (?,?,?,?,'pending','reserved',?,?,?,?,?,?)`,
          [id,uid,astroUid,kind,reserve.reservedAmountPaise,reserve.reservedBonusMinutes,
            expiresAt,livePayload(booking),timestamp,timestamp]
        )
      ]);
    } catch(error) {
      const again=await getBooking(id);
      if(again&&again.payloadFingerprint===fingerprint) return {success:true,kind:'booking',alreadyProcessed:true,booking:bookingView(again)};
      throw mapLiveD1Error(error);
    }
    const created=await getBooking(id);
    return {success:true,kind:'booking',alreadyProcessed:false,booking:bookingView(created),wallet:await walletAdapter.getWallet(uid)};
  }

  async function acceptBooking({bookingId,astrologerUid}={}) {
    const id=checkSessionId(bookingId),uid=checkUid(astrologerUid);
    if(!id||!uid) throw liveError('LIVE_BOOKING_ID_REQUIRED','Booking ID is required.',400);
    const booking=await getBooking(id);
    if(!booking) throw liveError('LIVE_BOOKING_NOT_FOUND','Pending Live booking was not found.',404);
    if(booking.astrologerUid!==uid) throw liveError('LIVE_BOOKING_FORBIDDEN','This booking belongs to another Astrologer.',403);
    const existing=await getSession(id);
    if(booking.status==='accepted'&&existing) return {success:true,alreadyProcessed:true,session:sessionView(existing)};
    if(booking.status!=='pending') throw liveError('LIVE_BOOKING_NOT_PENDING','This booking is no longer pending.',409);
    const timestamp=Number(now());
    const expiry=Number(booking.expiresAtMs||booking.createdAtMs+LIVE_BOOKING_EXPIRY_MS);
    if(expiry&&timestamp>=expiry) {
      await releaseBooking({bookingId:id,status:'expired',endReason:'booking_expired'});
      throw liveError('LIVE_BOOKING_EXPIRED','This booking has expired.',410);
    }
    const profiles=await getProfiles(booking.customerUid,uid);
    const astro=profiles.astro;
    if(String(booking.walletReservationState||'')!=='reserved') throw liveError('LIVE_BOOKING_WALLET_RESERVE_MISMATCH','The booking Wallet reserve is not available.',409);
    const enabled=booking.mode==='call'?astro.liveCallEnabled===true:astro.liveChatEnabled===true;
    if(!enabled) throw liveError('LIVE_MODE_DISABLED','Enable Live '+String(booking.mode||'').toUpperCase()+' before accepting this booking.',409);
    const availability=String(astro.availabilityStatus||astro.onlineStatus||'').toLowerCase();
    const active=await activeSessionCount(uid);
    const pricing=await getPricing();
    if(availability!=='online'||active>=pricing.maxConcurrentSessions) {
      throw liveError('LIVE_ASTROLOGER_BUSY','Set your Astrologer status to Online and finish any active session before accepting this booking.',409);
    }
    const commission=commissionFromPayload({
      astroPercent:booking.astrologerCommissionPercent,
      adminPercent:booking.adminCommissionPercent
    });
    const session={
      ...booking,
      state:'preparing',origin:'accepted_booking',
      astrologerName:safeName(astro.name,astro.fullName,astro.displayName,profiles.astroUser.name)||booking.astrologerName||'Astrologer',
      ratePerMinutePaise:safePaise(booking.ratePerMinutePaise)||astrologerRatePaise(astro,booking.mode),
      acceptedAtMs:timestamp,preparationStartedAtMs:timestamp,
      preparationUntilMs:timestamp+LIVE_PREPARATION_DURATION_MS,
      preparationCompletedAtMs:0,connectingAtMs:0,
      customerReady:false,astrologerReady:false,
      astrologerCommissionPercent:commission.astroPercent,
      adminCommissionPercent:commission.adminPercent,
      updatedAtMs:timestamp
    };
    if(!session.ratePerMinutePaise) throw liveError('LIVE_PRICE_UNAVAILABLE','This Astrologer no longer has a configured per-minute rate for this booking.',409);
    try {
      await batch([
        statement(
          `INSERT INTO ${SESSION_TABLE}
           (session_id,customer_uid,astrologer_uid,mode,state,appointment_id,
            reserved_amount_paise,reserved_bonus_minutes,actual_charge_paise,
            started_at_ms,ended_at_ms,settlement_operation_id,payload_json,created_at_ms,updated_at_ms)
           VALUES (?,?,?,?,'preparing',?,?,?,0,NULL,NULL,NULL,?,?,?)`,
          [id,booking.customerUid,uid,booking.mode,booking.appointmentId||null,
            booking.reservedAmountPaise,booking.reservedBonusMinutes,livePayload(session),
            Number(booking.createdAtMs||timestamp),timestamp]
        ),
        statement(
          `UPDATE ${BOOKING_TABLE}
           SET status='accepted',wallet_reservation_state='transferred',
               payload_json=?,updated_at_ms=?
           WHERE booking_id=? AND status='pending' AND wallet_reservation_state='reserved'`,
          [livePayload({...booking,status:'accepted',walletReservationState:'transferred',sessionId:id,acceptedAtMs:timestamp}),timestamp,id]
        )
      ]);
    } catch(error) {
      const current=await getSession(id);
      if(current) return {success:true,alreadyProcessed:true,session:sessionView(current)};
      throw mapLiveD1Error(error);
    }
    await syncAstrologerAvailability(uid).catch(error=>console.warn('[Live Session] Astrologer availability sync deferred:',error?.message||error));
    return {success:true,alreadyProcessed:false,session:sessionView(await getSession(id)),wallet:await walletAdapter.getWallet(booking.customerUid)};
  }

  async function acceptSession({sessionId,astrologerUid}={}) {
    const id=checkSessionId(sessionId),uid=checkUid(astrologerUid);
    if(!id||!uid) throw liveError('LIVE_SESSION_ID_REQUIRED','Live Session ID is required.',400);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.astrologerUid!==uid) throw liveError('LIVE_SESSION_FORBIDDEN','This request belongs to another Astrologer.',403);
    if(['connecting','active'].includes(session.state)||(session.state==='preparing'&&session.acceptedAtMs)) {
      return {success:true,alreadyProcessed:true,session:sessionView(session)};
    }
    if(session.state!=='ringing') throw liveError('LIVE_SESSION_NOT_RINGING','This request is no longer ringing.',409);
    const timestamp=Number(now());
    const updated={
      ...session,state:'preparing',acceptedAtMs:timestamp,
      preparationStartedAtMs:timestamp,preparationUntilMs:timestamp+LIVE_PREPARATION_DURATION_MS,
      preparationCompletedAtMs:0,connectingAtMs:0,
      customerReady:false,astrologerReady:false,updatedAtMs:timestamp
    };
    const result=await statement(
      `UPDATE ${SESSION_TABLE} SET state='preparing',payload_json=?,updated_at_ms=?
       WHERE session_id=? AND state='ringing'`,
      [livePayload(updated),timestamp,id]
    ).run();
    if(Number(result?.meta?.changes||0)!==1) {
      const latest=await getSession(id);
      if(latest&&['preparing','connecting','active'].includes(latest.state)) return {success:true,alreadyProcessed:true,session:sessionView(latest)};
      throw liveError('LIVE_SESSION_NOT_RINGING','This request is no longer ringing.',409);
    }
    return {success:true,alreadyProcessed:false,session:sessionView(await getSession(id))};
  }

  async function rejectSession({sessionId,astrologerUid}={}) {
    const id=checkSessionId(sessionId),uid=checkUid(astrologerUid);
    if(!id||!uid) throw liveError('LIVE_SESSION_ID_REQUIRED','Live Session ID is required.',400);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.astrologerUid!==uid) throw liveError('LIVE_SESSION_FORBIDDEN','This request belongs to another Astrologer.',403);
    if(session.state!=='ringing') throw liveError('LIVE_SESSION_NOT_RINGING','Only a ringing Live request can be rejected.',409);
    return endSession({sessionId:id,actorUid:uid,reason:'rejected',system:true});
  }

  async function readySession({sessionId,uid,mediaConnected=false}={}) {
    const id=checkSessionId(sessionId),actor=checkUid(uid);
    if(!id||!actor) throw liveError('LIVE_SESSION_ID_REQUIRED','Live Session ID is required.',400);
    for(let attempt=0;attempt<3;attempt++) {
      const session=await getSession(id);
      if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
      if(session.customerUid!==actor&&session.astrologerUid!==actor) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
      if(session.state==='ended') throw liveError('LIVE_SESSION_ENDED','This Live Session has already ended.',409);
      if(!['connecting','active'].includes(session.state)) throw liveError('LIVE_SESSION_NOT_ACCEPTED','The other participant has not accepted this session yet.',409);
      if(session.mode==='call'&&mediaConnected!==true) throw liveError('LIVE_CALL_NOT_CONNECTED','Voice Call must be connected before billing starts.',400);
      const field=session.customerUid===actor?'customerReady':'astrologerReady';
      const next={...session,[field]:true,updatedAtMs:Number(now())};
      const customerReady=field==='customerReady'?true:session.customerReady===true;
      const astrologerReady=field==='astrologerReady'?true:session.astrologerReady===true;
      const started=!['active'].includes(session.state)&&customerReady&&astrologerReady;
      if(started) {
        next.state='active';next.startedAtMs=Number(now());next.startConfirmedByServer=true;
      }
      const updated=await statement(
        `UPDATE ${SESSION_TABLE}
         SET state=?,started_at_ms=?,payload_json=?,updated_at_ms=?
         WHERE session_id=? AND state=? AND updated_at_ms=?`,
        [started?'active':session.state,started?next.startedAtMs:session.startedAtMs||null,
          livePayload(next),next.updatedAtMs,id,session.state,session.updatedAtMs]
      ).run();
      if(Number(updated?.meta?.changes||0)===1) {
        return {success:true,started,session:sessionView(await getSession(id))};
      }
    }
    const latest=await getSession(id);
    if(latest?.state==='active') return {success:true,started:true,session:sessionView(latest)};
    throw liveError('LIVE_SESSION_CONCURRENT_UPDATE','The Live Session changed while confirming connection. Retry.',409);
  }

  async function endSession({sessionId,actorUid='',reason='participant_ended',system=false,connectionGuard=null}={}) {
    const id=checkSessionId(sessionId),actor=checkUid(actorUid)||'';
    if(!id) throw liveError('LIVE_SESSION_ID_REQUIRED','Live Session ID is required.',400);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(!system&&session.customerUid!==actor&&session.astrologerUid!==actor) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    if(session.state==='ended') return {success:true,alreadyProcessed:true,session:sessionView(session),wallet:await walletAdapter.getWallet(session.customerUid)};
    const timestamp=Number(now());
    const settlement=calculateLiveSettlement({session,nowMs:timestamp});
    const wallet=await walletAdapter.getWallet(session.customerUid);
    if(!wallet||wallet.reservedBalancePaise<settlement.reservedAmountPaise||
       wallet.reservedBonusMinutes<settlement.reservedBonusMinutes) {
      throw liveError('LIVE_WALLET_RESERVE_MISMATCH','Wallet cash or promotional reserve does not reconcile with this Live Session. It was not silently settled.',409);
    }
    const origin=String(session.origin||'direct');
    const referenceType=origin==='accepted_booking'?'live_booking':'live_session';
    const finalReason=system
      ? (END_REASONS.has(String(reason).toLowerCase())?String(reason).toLowerCase():'server_ended')
      : (['participant_ended','connection_failed'].includes(String(reason).toLowerCase())?String(reason).toLowerCase():'participant_ended');
    const finalSession={
      ...session,state:'ended',endedAtMs:timestamp,updatedAtMs:timestamp,
      endedByUid:actor||'server',endReason:finalReason,
      connectedDurationMs:settlement.elapsedMs,
      billableMinutes:settlement.billableMinutes,
      totalBillableMinutes:settlement.totalBillableMinutes,
      freeMinutesUsed:settlement.freeMinutesUsed,
      actualChargePaise:settlement.chargedAmountPaise,
      releasedAmountPaise:settlement.releasedAmountPaise,
      bonusMinutesReleased:settlement.bonusMinutesReleased,
      commissionStatus:settlement.chargedAmountPaise>0?'credited':'not_applicable',
      astrologerCommissionPercent:settlement.astroPercent,
      adminCommissionPercent:settlement.adminPercent,
      astrologerCommissionPaise:settlement.astrologerAmountPaise,
      adminCommissionPaise:settlement.adminAmountPaise,
      astrologerCommissionAmount:settlement.astrologerAmountPaise/100,
      adminCommissionAmount:settlement.adminAmountPaise/100,
      availableBalanceAfterPaise:safePaise(wallet.availableBalancePaise)+settlement.releasedAmountPaise,
      reservedBalanceAfterPaise:safePaise(wallet.reservedBalancePaise)-settlement.reservedAmountPaise,
      ...(connectionGuard?{
        settlementConnectionUid:String(connectionGuard.uid||''),
        settlementConnectionGeneration:Number(connectionGuard.generation||0),
        settlementDeadlineAtMs:Number(connectionGuard.deadlineAtMs||0)
      }:{})
    };
    const ledger=[];
    const adminUid=String(adminWalletUid||'').trim();
    if(settlement.chargedAmountPaise>0) {
      if(settlement.astrologerAmountPaise>0) {
        await walletAdapter.ensureWallet(session.astrologerUid,'astrologer');
        ledger.push(await buildLedger({
          ownerUid:session.astrologerUid,ownerRole:'astrologer',
          type:'live_session_earning',direction:'credit',
          amountPaise:settlement.astrologerAmountPaise,
          availableDeltaPaise:settlement.astrologerAmountPaise,
          idempotencyKey:'live-session-earning:'+id,
          referenceType:'live_session',referenceId:id,
          note:'Astrologer commission for Live '+session.mode
        }));
      }
      if(settlement.adminAmountPaise>0) {
        if(!adminUid||adminUid===session.customerUid||adminUid===session.astrologerUid) {
          throw liveError('LIVE_ADMIN_WALLET_NOT_CONFIGURED','The Admin Wallet UID is not configured separately from the Live participants. Settlement was not posted.',503);
        }
        await walletAdapter.ensureWallet(adminUid,'admin');
        ledger.push(await buildLedger({
          ownerUid:adminUid,ownerRole:'admin',
          type:'live_session_admin_commission',direction:'credit',
          amountPaise:settlement.adminAmountPaise,
          availableDeltaPaise:settlement.adminAmountPaise,
          idempotencyKey:'live-session-admin-commission:'+id,
          referenceType:'live_session',referenceId:id,
          note:'Admin commission for Live '+session.mode
        }));
      }
    }
    if(settlement.chargedAmountPaise>0) ledger.unshift(await buildLedger({
      ownerUid:session.customerUid,type:'live_session_usage',direction:'debit',
      amountPaise:settlement.chargedAmountPaise,reservedDeltaPaise:-settlement.chargedAmountPaise,
      idempotencyKey:'live-session-usage:'+id,referenceType,referenceId:id,
      note:'Live '+session.mode+' used '+settlement.billableMinutes+' paid started minute(s)'
    }));
    if(settlement.freeMinutesUsed>0) ledger.push(await buildLedger({
      ownerUid:session.customerUid,type:'live_session_bonus_minutes',direction:'debit',
      amountPaise:0,reservedBonusMinutesDelta:-settlement.freeMinutesUsed,
      idempotencyKey:'live-session-bonus-used:'+id,referenceType,referenceId:id,
      note:settlement.freeMinutesUsed+' promotional free minute(s) used for Live '+session.mode
    }));
    if(settlement.bonusMinutesReleased>0) ledger.push(await buildLedger({
      ownerUid:session.customerUid,type:'live_session_bonus_minutes_release',direction:'credit',
      amountPaise:0,bonusMinutesDelta:settlement.bonusMinutesReleased,
      reservedBonusMinutesDelta:-settlement.bonusMinutesReleased,
      idempotencyKey:'live-session-bonus-release:'+id,referenceType,referenceId:id,
      note:settlement.bonusMinutesReleased+' unused promotional free minute(s) returned to Wallet'
    }));
    if(settlement.releasedAmountPaise>0) ledger.push(await buildLedger({
      ownerUid:session.customerUid,type:'live_session_unused_release',direction:'credit',
      amountPaise:settlement.releasedAmountPaise,availableDeltaPaise:settlement.releasedAmountPaise,
      reservedDeltaPaise:-settlement.releasedAmountPaise,
      idempotencyKey:'live-session-release:'+id,referenceType,referenceId:id,
      note:'Unused Live '+session.mode+' Wallet reserve released'
    }));
    // First move the session into a transaction-local settling state. SQLite
    // triggers verify a pending disconnect generation here, and the full D1 batch
    // rolls back this state if any ledger/earning write fails.
    const statements=[statement(
      `UPDATE ${SESSION_TABLE}
       SET state='settling',payload_json=?,updated_at_ms=?
       WHERE session_id=? AND state<>'ended'`,
      [livePayload(finalSession),timestamp,id]
    ),...ledger];
    if(!ledger.length) {
      statements.push(await buildLedger({
        ownerUid:session.customerUid,type:'live_session_settlement_marker',direction:'credit',
        amountPaise:0,idempotencyKey:'live-session-settlement-marker:'+id,
        referenceType,referenceId:id,note:'Live Session settlement marker'
      }));
    }
    statements.push(statement(
      `UPDATE ${SESSION_TABLE}
       SET state='ended',ended_at_ms=?,actual_charge_paise=?,settlement_operation_id=?,
           payload_json=?,updated_at_ms=?
       WHERE session_id=? AND state='settling'`,
      [timestamp,settlement.chargedAmountPaise,'live-session-settle:'+id,
        livePayload(finalSession),timestamp,id]
    ));
    if(settlement.chargedAmountPaise>0) {
      statements.push(statement(
        `INSERT INTO smv_domain_earnings
         (earning_id,astrologer_uid,customer_uid,source_type,reference_id,gross_amount_paise,
          astrologer_amount_paise,admin_amount_paise,status,payload_json,created_at_ms,updated_at_ms)
         VALUES (?,?,?,'live_session',?,?,?,?, 'credited',?,?,?)`,
        ['SMV-LIVE-EARN-'+id,session.astrologerUid,session.customerUid,id,
          settlement.chargedAmountPaise,settlement.astrologerAmountPaise,
          settlement.adminAmountPaise,livePayload({
            sessionId:id,bookingId:origin==='accepted_booking'?id:null,
            mode:session.mode,minutes:session.minutes,ratePerMinutePaise:session.ratePerMinutePaise,
            commissionPercent:settlement.astroPercent,adminCommissionPercent:settlement.adminPercent,
            paymentStatus:'pending_withdrawal'
          }),timestamp,timestamp]
      ));
    }
    statements.push(statement(
      `UPDATE ${BOOKING_TABLE}
       SET status=?,wallet_reservation_state='settled',payload_json=?,updated_at_ms=?
       WHERE booking_id=? AND status='accepted'`,
      [session.startedAtMs?'completed':(finalReason==='rejected'?'rejected':'cancelled'),
        livePayload({...session,status:session.startedAtMs?'completed':'cancelled',
          walletReservationState:'settled',actualChargePaise:settlement.chargedAmountPaise,
          releasedAmountPaise:settlement.releasedAmountPaise,endReason:finalReason}),timestamp,id]
    ));
    if(session.appointmentId) {
      statements.push(statement(
        `UPDATE smv_domain_scheduled_appointments
         SET booking_status=?,payload_json=json_set(CASE WHEN json_valid(payload_json) THEN payload_json ELSE '{}' END,
           '$.liveSessionId',?,'$.liveEndedAtMs',?),updated_at_ms=?
         WHERE appointment_id=?`,
        [appointmentEndedStatus(finalSession),id,timestamp,timestamp,session.appointmentId]
      ));
    }
    try {
      await batch(statements);
    } catch(error) {
      const latest=await getSession(id);
      if(latest?.state==='ended') return {success:true,alreadyProcessed:true,session:sessionView(latest),wallet:await walletAdapter.getWallet(session.customerUid)};
      throw mapLiveD1Error(error);
    }
    const settledSession=await getSession(id);
    await syncAstrologerAvailability(session.astrologerUid).catch(error=>console.warn('[Live Session] Astrologer availability sync deferred:',error?.message||error));
    return {success:true,alreadyProcessed:false,session:sessionView(settledSession),wallet:await walletAdapter.getWallet(session.customerUid)};
  }

  async function releaseBooking({bookingId,status='cancelled',endReason='cancelled',actorUid=''}={}) {
    const id=checkSessionId(bookingId);
    if(!id) throw liveError('LIVE_BOOKING_ID_REQUIRED','Booking ID is required.',400);
    const booking=await getBooking(id);
    if(!booking) throw liveError('LIVE_BOOKING_NOT_FOUND','Live booking was not found.',404);
    if(booking.status!=='pending') {
      if(['cancelled','rejected','expired'].includes(booking.status)) return {success:true,alreadyProcessed:true,booking:bookingView(booking)};
      throw liveError('LIVE_BOOKING_NOT_PENDING','Only pending Live bookings can be released.',409);
    }
    if(booking.walletReservationState!=='reserved') throw liveError('LIVE_BOOKING_WALLET_RESERVE_MISMATCH','Booking Wallet reserve is not in a releasable state.',409);
    const wallet=await walletAdapter.getWallet(booking.customerUid);
    if(!wallet||wallet.reservedBalancePaise<booking.reservedAmountPaise||
       wallet.reservedBonusMinutes<booking.reservedBonusMinutes) {
      throw liveError('LIVE_BOOKING_WALLET_RESERVE_MISMATCH','Wallet reserve for this booking does not reconcile.',409);
    }
    const timestamp=Number(now());
    const ledger=[];
    if(booking.reservedAmountPaise>0) ledger.push(await buildLedger({
      ownerUid:booking.customerUid,type:'live_booking_unused_release',direction:'credit',
      amountPaise:booking.reservedAmountPaise,availableDeltaPaise:booking.reservedAmountPaise,
      reservedDeltaPaise:-booking.reservedAmountPaise,
      idempotencyKey:'live-booking-release:'+id,referenceType:'live_booking',referenceId:id,
      note:'Unused Wallet reserve released for Live '+booking.mode+' booking'
    }));
    if(booking.reservedBonusMinutes>0) ledger.push(await buildLedger({
      ownerUid:booking.customerUid,type:'live_booking_bonus_release',direction:'credit',
      amountPaise:0,bonusMinutesDelta:booking.reservedBonusMinutes,
      reservedBonusMinutesDelta:-booking.reservedBonusMinutes,
      idempotencyKey:'live-booking-bonus-release:'+id,referenceType:'live_booking',referenceId:id,
      note:'Unused promotional minutes released for Live '+booking.mode+' booking'
    }));
    const finalStatus=['cancelled','rejected','expired'].includes(status)?status:'cancelled';
    const updatedBooking={
      ...booking,status:finalStatus,walletReservationState:'released',
      releasedAmountPaise:booking.reservedAmountPaise,
      bonusMinutesReleased:booking.reservedBonusMinutes,
      endReason,updatedAtMs:timestamp
    };
    const statements=[...ledger,statement(
      `UPDATE ${BOOKING_TABLE}
       SET status=?,wallet_reservation_state='released',payload_json=?,updated_at_ms=?
       WHERE booking_id=? AND status='pending' AND wallet_reservation_state='reserved'`,
      [finalStatus,livePayload(updatedBooking),timestamp,id]
    )];
    try { await batch(statements); }
    catch(error) {
      const latest=await getBooking(id);
      if(latest&&latest.walletReservationState==='released') return {success:true,alreadyProcessed:true,booking:bookingView(latest)};
      throw mapLiveD1Error(error);
    }
    return {success:true,alreadyProcessed:false,booking:bookingView(await getBooking(id)),
      wallet:await walletAdapter.getWallet(booking.customerUid)};
  }

  async function rejectBooking({bookingId,astrologerUid}={}) {
    const booking=await getBooking(checkSessionId(bookingId));
    if(!booking) throw liveError('LIVE_BOOKING_NOT_FOUND','Live booking was not found.',404);
    if(booking.astrologerUid!==String(astrologerUid||'')) throw liveError('LIVE_BOOKING_FORBIDDEN','This booking belongs to another Astrologer.',403);
    const expires=booking.expiresAtMs||booking.createdAtMs+LIVE_BOOKING_EXPIRY_MS;
    if(expires&&Number(now())>=expires) return releaseBooking({bookingId,status:'expired',endReason:'booking_expired'});
    return releaseBooking({bookingId,status:'rejected',endReason:'rejected_by_astrologer'});
  }
  async function cancelBooking({bookingId,customerUid}={}) {
    const booking=await getBooking(checkSessionId(bookingId));
    if(!booking) throw liveError('LIVE_BOOKING_NOT_FOUND','Live booking was not found.',404);
    if(booking.customerUid!==String(customerUid||'')) throw liveError('LIVE_BOOKING_FORBIDDEN','This booking belongs to another Customer.',403);
    return releaseBooking({bookingId,status:'cancelled',endReason:'customer_cancelled'});
  }

  async function completePreparation(sessionId) {
    const id=checkSessionId(sessionId);
    const session=await getSession(id);
    if(!session||session.state!=='preparing') return {success:true,skipped:true,session:session?sessionView(session):null};
    const timestamp=Number(now());
    const next={...session,state:'connecting',preparationCompletedAtMs:timestamp,
      connectingAtMs:timestamp,updatedAtMs:timestamp};
    const result=await statement(
      `UPDATE ${SESSION_TABLE} SET state='connecting',payload_json=?,updated_at_ms=?
       WHERE session_id=? AND state='preparing' AND updated_at_ms=?`,
      [livePayload(next),timestamp,id,session.updatedAtMs]
    ).run();
    if(Number(result?.meta?.changes||0)!==1) return {success:true,skipped:true,session:sessionView(await getSession(id))};
    return {
      success:true,session:sessionView(await getSession(id)),
      nextDeadline:{
        type:session.mode==='chat'?'chat_accept_timeout':'call_connect_timeout',
        atMs:timestamp+(session.mode==='chat'?LIVE_CHAT_CONNECT_TIMEOUT_MS:LIVE_CALL_CONNECT_TIMEOUT_MS),
        deadlineId:(session.mode==='chat'?'chat-connect:':'call-connect:')+id
      }
    };
  }

  async function setConnection({sessionId,uid,connected}={}) {
    const id=checkSessionId(sessionId),actor=checkUid(uid);
    if(!id||!actor||typeof connected!=='boolean') {
      throw liveError('LIVE_CONNECTION_INVALID','Live Session connection state is invalid.',400);
    }
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.customerUid!==actor&&session.astrologerUid!==actor) {
      throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    }
    if(!['connecting','active'].includes(session.state)) {
      throw liveError('LIVE_SESSION_NOT_CONNECTING','Connection changes are accepted only while the Live Session is connecting or active.',409);
    }
    const timestamp=Number(now());
    const deadlineAtMs=connected?null:timestamp+LIVE_DISCONNECT_GRACE_MS;
    await statement(
      `INSERT INTO smv_domain_live_connections
       (session_id,uid,connected,generation,deadline_at_ms,updated_at_ms)
       VALUES (?,?,?,1,?,?)
       ON CONFLICT(session_id,uid) DO UPDATE SET
         connected=excluded.connected,
         generation=smv_domain_live_connections.generation+1,
         deadline_at_ms=excluded.deadline_at_ms,
         updated_at_ms=excluded.updated_at_ms`,
      [id,actor,connected?1:0,deadlineAtMs,timestamp]
    ).run();
    const row=await first(
      'SELECT connected,generation,deadline_at_ms,updated_at_ms FROM smv_domain_live_connections WHERE session_id=? AND uid=? LIMIT 1',
      [id,actor]
    );
    return {
      success:true,sessionId:id,uid:actor,connected:row?.connected===1,
      generation:Number(row?.generation||0),
      deadlineAtMs:Number(row?.deadline_at_ms||0),
      graceMs:connected?0:LIVE_DISCONNECT_GRACE_MS
    };
  }

  async function processDeadline({sessionId,deadlineType,deadlineAtMs,participantUid='',generation=0}={}) {
    const id=checkSessionId(sessionId);
    const type=String(deadlineType||'').trim();
    const deadline=Number(deadlineAtMs);
    if(!id||!type||!Number.isSafeInteger(deadline)) throw liveError('LIVE_DEADLINE_INVALID','Live deadline event is invalid.',400);
    if(type==='preparation_timeout') {
      const current=await getSession(id);
      if(!current||current.state!=='preparing'||Number(current.preparationUntilMs||0)>deadline) return {success:true,skipped:true};
      return completePreparation(id);
    }
    if(type==='booking_expiry') {
      const booking=await getBooking(id);
      if(!booking||booking.status!=='pending') return {success:true,skipped:true};
      if(booking.expiresAtMs&&Number(now())<booking.expiresAtMs) return {success:true,skipped:true};
      return releaseBooking({bookingId:id,status:'expired',endReason:'booking_expired'});
    }
    const reason=({
      ring_timeout:'no_answer',
      call_connect_timeout:'connection_failed',
      chat_accept_timeout:'connection_failed',
      disconnect_grace:'network_disconnect',
      session_duration:'duration_complete',
      scheduled_start_deadline:'scheduled_connection_timeout'
    })[type];
    if(!reason) throw liveError('LIVE_DEADLINE_TYPE_INVALID','Unsupported Live deadline type.',400);
    const session=await getSession(id);
    if(!session||session.state==='ended') return {success:true,skipped:true};
    if(type==='ring_timeout'&&(session.state!=='ringing'||deadline<session.createdAtMs+LIVE_RING_TIMEOUT_MS)) return {success:true,skipped:true};
    if(type==='call_connect_timeout'||type==='chat_accept_timeout') {
      if(session.state!=='connecting'||deadline<Number(session.connectingAtMs||0)+
        (type==='chat_accept_timeout'?LIVE_CHAT_CONNECT_TIMEOUT_MS:LIVE_CALL_CONNECT_TIMEOUT_MS)) return {success:true,skipped:true};
    }
    if(type==='session_duration'&&(session.state!=='active'||deadline<session.startedAtMs+Number(session.minutes||1)*60_000)) return {success:true,skipped:true};
    if(type==='disconnect_grace') {
      if(!['connecting','active'].includes(session.state)) return {success:true,skipped:true};
      const uid=checkUid(participantUid);
      if(!uid) return {success:true,skipped:true};
      const connection=await first(
        'SELECT connected,generation,deadline_at_ms FROM smv_domain_live_connections WHERE session_id=? AND uid=? LIMIT 1',
        [id,uid]
      );
      if(!connection||Number(connection.connected)!==0||
         Number(connection.generation)!==Number(generation)||
         Number(connection.deadline_at_ms)!==deadline||
         Number(now())<Number(connection.deadline_at_ms)) {
        return {success:true,skipped:true};
      }
      return endSession({
        sessionId:id,reason,system:true,
        connectionGuard:{uid,generation:Number(generation),deadlineAtMs:deadline}
      });
    }
    return endSession({sessionId:id,reason,system:true});
  }

  async function sendMessage({sessionId,senderUid,text}={}) {
    const id=checkSessionId(sessionId),uid=checkUid(senderUid),body=String(text||'').trim();
    if(!id||!uid||!body||body.length>4000) throw liveError('LIVE_MESSAGE_INVALID','Enter a message of up to 4,000 characters.',400);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.customerUid!==uid&&session.astrologerUid!==uid) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    if(session.mode!=='chat') throw liveError('LIVE_MODE_MISMATCH','Text messages are available only in a Live Chat session.',409);
    if(session.state!=='active') throw liveError('LIVE_SESSION_NOT_ACTIVE','Messages can only be sent during an active Live Chat.',409);
    const timestamp=Number(now());
    if(!session.startedAtMs||timestamp>=session.startedAtMs+Number(session.minutes||1)*60_000) {
      await endSession({sessionId:id,reason:'duration_complete',system:true});
      throw liveError('LIVE_SESSION_ENDED','The Live Chat duration has ended.',409);
    }
    const moderation=inspectMessageText(body);
    if(!moderation.allowed) {
      throw liveError(
        moderation.reason==='empty'?'LIVE_MESSAGE_INVALID':'LIVE_MESSAGE_ABUSIVE_LANGUAGE',
        moderation.message,400
      );
    }
    const messageId=cryptoImpl.randomUUID();
    await statement(
      'INSERT INTO smv_domain_live_messages(session_id,message_id,sender_uid,text,created_at_ms) VALUES (?,?,?,?,?)',
      [id,messageId,uid,body,timestamp]
    ).run();
    return {success:true,message:{id:messageId,sessionId:id,senderUid:uid,text:body,createdAt:iso(timestamp)},
      recipientUid:uid===session.customerUid?session.astrologerUid:session.customerUid};
  }

  async function listMessages({sessionId,uid,afterMs=0,limit=100}={}) {
    const id=checkSessionId(sessionId),actor=checkUid(uid);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.customerUid!==actor&&session.astrologerUid!==actor) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    if(session.mode!=='chat') throw liveError('LIVE_MODE_MISMATCH','Messages are available only in Live Chat.',409);
    const max=Math.max(1,Math.min(100,Math.floor(Number(limit)||100)));
    const since=Math.max(0,Number(afterMs)||0);
    const rows=await all(
      `SELECT message_id,sender_uid,text,created_at_ms FROM smv_domain_live_messages
       WHERE session_id=? AND created_at_ms>=? ORDER BY created_at_ms ASC,message_id ASC LIMIT ?`,
      [id,since,max]
    );
    return (rows.results||[]).map(row=>({id:String(row.message_id),sessionId:id,
      senderUid:String(row.sender_uid),text:String(row.text),createdAt:iso(row.created_at_ms)}));
  }

  async function signal({sessionId,senderUid,type,payload}={}) {
    const id=checkSessionId(sessionId),uid=checkUid(senderUid),kind=String(type||'').trim().toLowerCase();
    if(!id||!uid||!['offer','answer','ice'].includes(kind)||!payload||typeof payload!=='object') {
      throw liveError('LIVE_SIGNAL_INVALID','WebRTC signal is invalid.',400);
    }
    const serialized=JSON.stringify(payload);
    if(serialized.length>100000) throw liveError('LIVE_SIGNAL_TOO_LARGE','WebRTC signal is too large.',413);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.customerUid!==uid&&session.astrologerUid!==uid) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    if(session.mode!=='call') throw liveError('LIVE_MODE_MISMATCH','WebRTC signals are only available for voice calls.',409);
    if(!['connecting','active'].includes(session.state)) throw liveError('LIVE_SESSION_NOT_CONNECTING','The Live Call is not connecting.',409);
    if(kind==='offer'&&session.customerUid!==uid) throw liveError('LIVE_SIGNAL_ROLE_FORBIDDEN','Only the Customer can initiate the WebRTC offer.',403);
    if(kind==='answer'&&session.astrologerUid!==uid) throw liveError('LIVE_SIGNAL_ROLE_FORBIDDEN','Only the Astrologer can answer this WebRTC offer.',403);
    const timestamp=Number(now());
    if(session.state==='active'&&session.startedAtMs&&timestamp>=session.startedAtMs+Number(session.minutes||1)*60_000) {
      await endSession({sessionId:id,reason:'duration_complete',system:true});
      throw liveError('LIVE_SESSION_ENDED','The Live Call duration has ended.',409);
    }
    const signalId=cryptoImpl.randomUUID();
    await statement(
      'INSERT INTO smv_domain_live_signals(session_id,signal_id,sender_uid,signal_type,payload_json,created_at_ms) VALUES (?,?,?,?,?,?)',
      [id,signalId,uid,kind,serialized,timestamp]
    ).run();
    return {success:true,signalId,recipientUid:uid===session.customerUid?session.astrologerUid:session.customerUid};
  }

  async function listSignals({sessionId,uid,afterMs=0,limit=50}={}) {
    const id=checkSessionId(sessionId),actor=checkUid(uid);
    const session=await getSession(id);
    if(!session) throw liveError('LIVE_SESSION_NOT_FOUND','Live session was not found.',404);
    if(session.customerUid!==actor&&session.astrologerUid!==actor) throw liveError('LIVE_SESSION_FORBIDDEN','This Live Session belongs to another account.',403);
    if(session.mode!=='call') throw liveError('LIVE_MODE_MISMATCH','WebRTC signals are available only for voice calls.',409);
    const max=Math.max(1,Math.min(100,Math.floor(Number(limit)||50)));
    const since=Math.max(0,Number(afterMs)||0);
    const rows=await all(
      `SELECT signal_id,sender_uid,signal_type,payload_json,created_at_ms FROM smv_domain_live_signals
       WHERE session_id=? AND created_at_ms>=? ORDER BY created_at_ms ASC,signal_id ASC LIMIT ?`,
      [id,since,max]
    );
    return (rows.results||[]).map(row=>({id:String(row.signal_id),sessionId:id,
      senderUid:String(row.sender_uid),type:String(row.signal_type),payload:parseJson(row.payload_json),
      createdAt:iso(row.created_at_ms)}));
  }

  async function listSessions({uid,role}={}) {
    const actor=checkUid(uid);
    if(!actor) throw liveError('LIVE_ROLE_REQUIRED','Live Session login is required.',403);
    const field=role==='astrologer'?'astrologer_uid':'customer_uid';
    const rows=await all(
      `SELECT * FROM ${SESSION_TABLE} WHERE ${field}=? ORDER BY created_at_ms DESC LIMIT 100`,
      [actor]
    );
    return (rows.results||[]).map(row=>sessionView(mapLiveSessionRow(row)));
  }
  async function listBookings({astrologerUid}={}) {
    const uid=checkUid(astrologerUid);
    const rows=await all(
      `SELECT * FROM ${BOOKING_TABLE} WHERE astrologer_uid=? AND status='pending'
       ORDER BY created_at_ms DESC LIMIT 100`,
      [uid]
    );
    const bookings=[];
    for(const row of rows.results||[]) {
      const booking=mapLiveBookingRow(row);
      if(booking.expiresAtMs&&Number(now())>=booking.expiresAtMs) {
        await releaseBooking({bookingId:booking.id,status:'expired',endReason:'booking_expired'}).catch(()=>{});
      } else bookings.push(bookingView(booking));
    }
    return bookings;
  }
  async function listCustomerBookings({customerUid}={}) {
    const uid=checkUid(customerUid);
    const rows=await all(
      `SELECT * FROM ${BOOKING_TABLE} WHERE customer_uid=?
       ORDER BY created_at_ms DESC LIMIT 30`,
      [uid]
    );
    return (rows.results||[]).map(row=>bookingView(mapLiveBookingRow(row)));
  }

  async function expireBooking(bookingId,{force=false}={}) {
    const booking=await getBooking(checkSessionId(bookingId));
    if(!booking||booking.status!=='pending') return {success:true,skipped:true};
    if(!force&&booking.expiresAtMs&&Number(now())<booking.expiresAtMs) return {success:true,skipped:true};
    return releaseBooking({bookingId,status:'expired',endReason:force?'timer_schedule_failed':'booking_expired'});
  }

  return Object.freeze({
    createRequest,acceptBooking,acceptSession,rejectSession,readySession,endSession,setConnection,isApprovedAstrologer,
    rejectBooking,cancelBooking,sendMessage,listMessages,signal,listSignals,
    listSessions,listBookings,listCustomerBookings,processDeadline,expireBooking,
    getPricing,getCommission,saveSetting
  });
}

function sessionView(session) {
  if(!session) return null;
  const d=session;
  return {
    id:String(d.id),customerUid:String(d.customerUid),astrologerUid:String(d.astrologerUid),
    astrologerId:String(d.astrologerId||d.astrologerUid),
    astrologerName:safeName(d.astrologerName)||'Astrologer',
    customerName:safeName(d.customerName)||'Customer',
    appointmentId:String(d.appointmentId||''),
    birthDetails:d.birthDetails&&typeof d.birthDetails==='object'?d.birthDetails:null,
    preparationUntil:iso(d.preparationUntilMs),
    preparationCompletedAt:iso(d.preparationCompletedAtMs),
    connectingAt:iso(d.connectingAtMs),
    mode:String(d.mode),minutes:Number(d.minutes||0),
    ratePerMinutePaise:safePaise(d.ratePerMinutePaise),
    reservedAmountPaise:safePaise(d.reservedAmountPaise),
    reservedBonusMinutes:safeMinutes(d.reservedBonusMinutes),
    freeMinutesUsed:safeMinutes(d.freeMinutesUsed),
    status:String(d.state||''),state:String(d.state||''),
    createdAt:iso(d.createdAtMs),acceptedAt:iso(d.acceptedAtMs),
    startedAt:iso(d.startedAtMs),endedAt:iso(d.endedAtMs),
    actualChargePaise:safePaise(d.actualChargePaise),
    billableMinutes:safeMinutes(d.billableMinutes),
    releasedAmountPaise:safePaise(d.releasedAmountPaise),
    endReason:String(d.endReason||''),
    customerReady:d.customerReady===true,astrologerReady:d.astrologerReady===true
  };
}
function bookingView(booking) {
  if(!booking) return null;
  const d=booking;
  return {
    id:String(d.id),mode:String(d.mode),minutes:Number(d.minutes||0),
    status:String(d.status||''),astrologerName:safeName(d.astrologerName)||'Astrologer',
    ratePerMinutePaise:safePaise(d.ratePerMinutePaise),
    reservedAmountPaise:safePaise(d.reservedAmountPaise),
    reservedBonusMinutes:safeMinutes(d.reservedBonusMinutes),
    walletReservationState:String(d.walletReservationState||''),
    actualChargePaise:safePaise(d.actualChargePaise),
    releasedAmountPaise:safePaise(d.releasedAmountPaise),
    endReason:String(d.endReason||''),sessionId:String(d.sessionId||''),
    createdAt:iso(d.createdAtMs),acceptedAt:iso(d.acceptedAtMs),
    expiresAt:iso(d.expiresAtMs),endedAt:iso(d.endedAtMs),
    customerUid:String(d.customerUid||'')
  };
}
function appointmentEndedStatus(session) {
  return session.startedAtMs?'completed':scheduledAppointmentStatusForEndedSession(session);
}
function scheduledAppointmentStatusForEndedSession(session) {
  if(session.startedAtMs) return 'completed';
  if(['rejected','rejected_by_astrologer'].includes(String(session.endReason||''))) return 'rejected';
  if(['connection_failed','no_answer','missed_by_astrologer','scheduled_connection_timeout'].includes(String(session.endReason||''))) return 'missed_by_astrologer';
  return 'cancelled';
}
function mapLiveD1Error(error) {
  const message=String(error?.message||error||'');
  if(message.includes('WALLET_INSUFFICIENT_BALANCE')) return liveError('WALLET_INSUFFICIENT_BALANCE','Insufficient Wallet balance.',409);
  if(message.includes('LIVE_ASTROLOGER_BUSY')) return liveError('LIVE_ASTROLOGER_BUSY','This Astrologer is currently busy. Choose a booking instead.',409);
  if(message.includes('LIVE_SESSION_RESERVE_MISSING')) return liveError('LIVE_SESSION_RESERVE_MISSING','Live Session Wallet reserve could not be verified.',409);
  if(message.includes('LIVE_BOOKING_RESERVE_MISSING')) return liveError('LIVE_BOOKING_RESERVE_MISSING','Live booking Wallet reserve could not be verified.',409);
  if(message.includes('LIVE_SESSION_CASH_RESERVE_NOT_SETTLED')||message.includes('LIVE_SESSION_BONUS_RESERVE_NOT_SETTLED')) return liveError('LIVE_WALLET_RESERVE_MISMATCH','Live Session Wallet reserve did not reconcile.',409);
  if(message.includes('LIVE_BOOKING_CASH_RESERVE_NOT_RELEASED')||message.includes('LIVE_BOOKING_BONUS_RESERVE_NOT_RELEASED')) return liveError('LIVE_BOOKING_WALLET_RESERVE_MISMATCH','Booking Wallet reserve did not reconcile.',409);
  if(message.includes('LIVE_EARNING_SESSION_SETTLEMENT_MISMATCH')||message.includes('LIVE_EARNING_COMMISSION_MISMATCH')) return liveError('LIVE_EARNING_SETTLEMENT_MISMATCH','The Astrologer/Admin earning split did not match the final Live Wallet settlement.',409);
  return error;
}
