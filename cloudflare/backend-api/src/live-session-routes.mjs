import {
  parseRupeesToPaise,
  splitLiveCommission,
  LIVE_RING_TIMEOUT_MS,
  LIVE_PREPARATION_DURATION_MS,
  LIVE_CALL_CONNECT_TIMEOUT_MS,
  LIVE_CHAT_CONNECT_TIMEOUT_MS,
  LIVE_BOOKING_EXPIRY_MS
} from '../../../shared/backend-platform/live-session-domain.mjs';

function httpError(code,message,status=400) {
  return Object.assign(new Error(message),{code,httpStatus:status});
}
function replyError(res,error,fallback) {
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,
    error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'LIVE_SESSION_ERROR'),
    ...(error?.details&&typeof error.details==='object'?{details:error.details}:{})
  });
}
function uniqueEventId(type,id,stamp) {
  return String(type)+':'+String(id)+':'+String(stamp);
}
function deadline(type,atMs,id,generation=0) {
  return {type,atMs,deadlineId:String(id),generation};
}

export function registerD1LiveSessionRoutes({
  app,identityService,liveService,env,isReady=async()=>false,
  routesEnabled=false,environment='unknown',sourceProjectId=''
}={}) {
  if(!app||typeof app.get!=='function'||typeof app.post!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'||
     !liveService||typeof liveService.createRequest!=='function'||
     !env?.LIVE_SESSION_COORDINATOR||!env?.LIVE_USER_EVENT_HUB) {
    throw new TypeError('Live Session routes require an Admin identity service, D1 Live service and both Durable Object bindings.');
  }

  async function requireRole(req,allowed) {
    const user=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(!allowed.includes(String(user.role||''))) {
      throw httpError('LIVE_ROLE_FORBIDDEN','This action is not allowed for your SMV ASTRO role.',403);
    }
    return user;
  }
  async function assertReady() {
    if(routesEnabled!==true||environment!=='staging'||sourceProjectId!=='smv-astro-staging') {
      throw httpError('LIVE_ROUTES_DISABLED','Live Call/Chat routes are restricted to the isolated staging environment.',503);
    }
    if(!(await isReady())) throw httpError('LIVE_SCHEMA_NOT_READY','D1 Live Session schema 0006 is not ready.',503);
  }
  function coordinator(id) {
    const namespace=env.LIVE_SESSION_COORDINATOR;
    return namespace.get(namespace.idFromName(String(id)));
  }
  async function schedule(id,state,deadlines) {
    const response=await coordinator(id).fetch('https://live-session.internal/schedule',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId:String(id),state,deadlines})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true) {
      throw httpError('LIVE_TIMER_SCHEDULE_FAILED','The durable Live Session timer could not be scheduled. The Wallet reserve will be released.',503);
    }
    return result;
  }
  async function cancel(id,type) {
    try {
      await coordinator(id).fetch('https://live-session.internal/cancel-deadline',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({type})
      });
    } catch(error) {
      console.warn('[Live Session] Timer cancellation deferred:',error?.message||error);
    }
  }
  async function cancelAll(id) {
    for(const type of [
      'ring_timeout','preparation_timeout','call_connect_timeout','chat_accept_timeout',
      'disconnect_grace','session_duration','scheduled_start_deadline','booking_expiry'
    ]) await cancel(id,type);
  }
  async function publish(uid,type,id,data) {
    const recipient=String(uid||'').trim();
    if(!recipient) return;
    const stamp=Date.now();
    try {
      const stub=env.LIVE_USER_EVENT_HUB.get(env.LIVE_USER_EVENT_HUB.idFromName(recipient));
      const response=await stub.fetch('https://live-user-hub.internal/publish',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-smv-internal-caller':'smv-backend'},
        body:JSON.stringify({
          targetUid:recipient,eventId:uniqueEventId(type,id,stamp),
          type,data
        })
      });
      if(!response.ok) console.warn('[Live Session] User event fan-out returned',response.status);
    } catch(error) {
      console.warn('[Live Session] User event fan-out deferred:',error?.message||error);
    }
  }
  async function publishSession(session,type='live.session.updated') {
    if(!session) return;
    await Promise.all([
      publish(session.customerUid,type,session.id,{session}),
      publish(session.astrologerUid,type,session.id,{session})
    ]);
  }
  async function schedulePreparation(session) {
    await cancel(session.id,'ring_timeout');
    await schedule(session.id,session.state,[
      deadline('preparation_timeout',Number(session.preparationUntil?Date.parse(session.preparationUntil):session.preparationUntilMs), 'preparation:'+session.id)
    ]);
  }
  async function failClosedTimer(sessionId) {
    try {
      const result=await liveService.endSession({sessionId,reason:'server_ended',system:true});
      await publishSession(result.session);
    } catch(error) {
      console.error('[Live Session] Unable to release reserve after timer schedule failure:',error?.message||error);
    }
  }
  async function streamUserEvents(req,res,user) {
    const uid=String(user.uid||'');
    const stub=env.LIVE_USER_EVENT_HUB.get(env.LIVE_USER_EVENT_HUB.idFromName(uid));
    const response=await stub.fetch('https://live-user-hub.internal/events?uid='+encodeURIComponent(uid),{
      method:'GET',headers:{'x-smv-internal-uid':uid,'x-smv-internal-role':String(user.role||'')}
    });
    if(!response.ok||!response.body) {
      return res.status(response.status||503).set('Cache-Control','no-store').json({success:false,code:'LIVE_EVENT_STREAM_UNAVAILABLE'});
    }
    res.status(200).set({
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive',
      'X-Accel-Buffering':'no'
    });
    res.flushHeaders?.();
    const reader=response.body.getReader();
    const decoder=new TextDecoder();
    let closed=false;
    req.on('close',()=>{closed=true;reader.cancel().catch(()=>{});});
    try {
      while(!closed) {
        const chunk=await reader.read();
        if(chunk.done) break;
        if(chunk.value&&!res.write(decoder.decode(chunk.value,{stream:true}))) {
          await new Promise(resolve=>res.once('drain',resolve));
        }
      }
    } catch(error) {
      if(!closed) console.warn('[Live Session] SSE stream closed:',error?.message||error);
    } finally {
      if(!res.writableEnded) res.end();
    }
  }

  app.get('/live/pricing',async(_req,res)=>{
    try {
      await assertReady();
      const p=await liveService.getPricing();
      return res.set('Cache-Control','no-store').json({
        success:true,callRatePaise:p.callRatePaise,chatRatePaise:p.chatRatePaise,
        callRatePerMinute:p.callRatePaise/100,chatRatePerMinute:p.chatRatePaise/100,
        maxConcurrentSessions:p.maxConcurrentSessions,currency:'INR',updatedAt:p.updatedAtMs?new Date(p.updatedAtMs).toISOString():null
      });
    } catch(error) { return replyError(res,error,'Unable to load Live Call / Chat prices.'); }
  });

  app.get('/live/ice-config',async(req,res)=>{
    try {
      await assertReady();
      await requireRole(req,['customer','astrologer']);
      const iceServers=[{urls:'stun:stun.l.google.com:19302'}];
      const urls=String(env.LIVE_TURN_URLS||env.LIVE_TURN_URL||'')
        .split(',').map(value=>value.trim()).filter(value=>/^turns?:/i.test(value));
      const secret=String(env.LIVE_TURN_SHARED_SECRET||'');
      let turnConfigured=false;
      if(urls.length&&secret) {
        const expiry=Math.floor(Date.now()/1000)+600;
        const uid=String((await identityService.authenticateAuthorization(req.get('Authorization'))).uid);
        const username=expiry+':'+uid;
        const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-1'},false,['sign']);
        const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(username));
        const credential=btoa(String.fromCharCode(...new Uint8Array(signature)));
        iceServers.push({urls,username,credential});
        turnConfigured=true;
      }
      return res.set('Cache-Control','no-store').json({success:true,iceServers,turnConfigured,credentialLifetimeSeconds:turnConfigured?600:0});
    } catch(error) { return replyError(res,error,'Unable to prepare Live voice connection settings.'); }
  });

  app.get('/live/events',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      return await streamUserEvents(req,res,user);
    } catch(error) { return replyError(res,error,'Unable to connect Live event stream.'); }
  });

  app.post('/live/requests',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer']);
      const result=await liveService.createRequest({
        customerUid:user.uid,astrologerId:req.body?.astrologerId,
        mode:req.body?.mode,minutes:req.body?.minutes,requestId:req.body?.requestId,
        customerName:req.body?.customerName,birthDetails:req.body?.birthDetails
      });
      if(result.kind==='session'&&result.session) {
        const created=Date.parse(result.session.createdAt||'')||Date.now();
        try {
          await schedule(result.session.id,'ringing',[
            deadline('ring_timeout',created+LIVE_RING_TIMEOUT_MS,'ring:'+result.session.id)
          ]);
        } catch(error) {
          await failClosedTimer(result.session.id);
          throw error;
        }
        await publish(result.session.astrologerUid,'live.session.request',result.session.id,{session:result.session});
        await publish(result.session.customerUid,'live.session.updated',result.session.id,{session:result.session});
      } else if(result.kind==='booking'&&result.booking) {
        const expiresAt=Date.parse(result.booking.expiresAt||'')||Date.now()+LIVE_BOOKING_EXPIRY_MS;
        try {
          await schedule(result.booking.id,'booking_pending',[
            deadline('booking_expiry',expiresAt,'booking:'+result.booking.id)
          ]);
        } catch(error) {
          await liveService.expireBooking(result.booking.id,{force:true}).catch(releaseError=>
            console.error('[Live Session] Booking timer failure release deferred:',releaseError?.message||releaseError));
          throw error;
        }
        await publish(result.booking.astrologerUid,'live.booking.updated',result.booking.id,{booking:result.booking});
        await publish(result.booking.customerUid,'live.booking.updated',result.booking.id,{booking:result.booking});
      }
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) { return replyError(res,error,'Unable to create the Live Call / Chat request.'); }
  });

  app.get('/live/sessions',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const sessions=await liveService.listSessions({uid:user.uid,role:user.role});
      return res.set('Cache-Control','no-store').json({success:true,sessions});
    } catch(error) { return replyError(res,error,'Unable to load Live Sessions.'); }
  });

  app.get('/live/bookings/pending',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['astrologer']);
      const bookings=await liveService.listBookings({astrologerUid:user.uid});
      return res.set('Cache-Control','no-store').json({success:true,bookings});
    } catch(error) { return replyError(res,error,'Unable to load pending Live bookings.'); }
  });

  app.get('/live/bookings/mine',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer']);
      const bookings=await liveService.listCustomerBookings({customerUid:user.uid});
      return res.set('Cache-Control','no-store').json({success:true,bookings});
    } catch(error) { return replyError(res,error,'Unable to load your Live bookings.'); }
  });

  app.post('/live/bookings/:id/accept',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['astrologer']);
      const result=await liveService.acceptBooking({bookingId:req.params.id,astrologerUid:user.uid});
      try { await schedule(result.session.id,'preparing',[
        deadline('preparation_timeout',Date.parse(result.session.preparationUntil),'preparation:'+result.session.id)
      ]); } catch(error) { await failClosedTimer(result.session.id); throw error; }
      await publishSession(result.session,'live.session.request');
      await publishSession(result.session,'live.session.updated');
      await publish(result.session.customerUid,'live.booking.updated',result.session.id,{booking:{id:result.session.id,status:'accepted',sessionId:result.session.id}});
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) { return replyError(res,error,'Unable to accept the Live booking.'); }
  });

  app.post('/live/bookings/:id/reject',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['astrologer']);
      const result=await liveService.rejectBooking({bookingId:req.params.id,astrologerUid:user.uid});
      await cancel(req.params.id,'booking_expiry');
      if(result.booking) {
        await publish(result.booking.customerUid,'live.booking.updated',req.params.id,{booking:result.booking});
        await publish(user.uid,'live.booking.updated',req.params.id,{booking:result.booking});
      }
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) { return replyError(res,error,'Unable to reject this Live booking.'); }
  });

  app.post('/live/bookings/:id/cancel',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer']);
      const result=await liveService.cancelBooking({bookingId:req.params.id,customerUid:user.uid});
      await cancel(req.params.id,'booking_expiry');
      if(result.booking) await publish(result.booking.astrologerUid,'live.booking.updated',req.params.id,{booking:result.booking});
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) { return replyError(res,error,'Unable to cancel the Live booking.'); }
  });

  app.post('/live/sessions/:id/accept',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['astrologer']);
      const result=await liveService.acceptSession({sessionId:req.params.id,astrologerUid:user.uid});
      try { await schedule(req.params.id,'preparing',[
        deadline('preparation_timeout',Date.parse(result.session.preparationUntil),'preparation:'+req.params.id)
      ]); } catch(error) { await failClosedTimer(req.params.id); throw error; }
      await publishSession(result.session);
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) { return replyError(res,error,'Unable to accept the incoming Live request.'); }
  });

  app.post('/live/sessions/:id/reject',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['astrologer']);
      const result=await liveService.endSession({sessionId:req.params.id,actorUid:user.uid,reason:'rejected',system:true});
      await cancelAll(req.params.id);
      await publishSession(result.session);
      return res.set('Cache-Control','no-store').json({success:true,alreadyProcessed:result.alreadyProcessed,session:result.session});
    } catch(error) { return replyError(res,error,'Unable to reject this Live request.'); }
  });

  app.post('/live/sessions/:id/end',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const result=await liveService.endSession({
        sessionId:req.params.id,actorUid:user.uid,
        reason:String(req.body?.reason||'participant_ended').slice(0,80),system:false
      });
      await cancelAll(req.params.id);
      await publishSession(result.session);
      const response={success:true,alreadyProcessed:result.alreadyProcessed,session:result.session};
      if(result.session?.customerUid===user.uid) response.wallet=result.wallet;
      return res.set('Cache-Control','no-store').json(response);
    } catch(error) { return replyError(res,error,'Unable to end the Live Session safely.'); }
  });

  app.post('/live/sessions/:id/ready',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const result=await liveService.readySession({
        sessionId:req.params.id,uid:user.uid,mediaConnected:req.body?.mediaConnected===true
      });
      if(result.session?.state==='active') {
        await cancel(req.params.id,'call_connect_timeout');
        await cancel(req.params.id,'chat_accept_timeout');
        await schedule(req.params.id,'active',[
          deadline('session_duration',Date.parse(result.session.startedAt)+Number(result.session.minutes)*60_000,'duration:'+req.params.id)
        ]);
      } else {
        const startAt=Date.parse(result.session?.connectingAt||'')||Date.now();
        const timeout=result.session?.mode==='chat'?LIVE_CHAT_CONNECT_TIMEOUT_MS:LIVE_CALL_CONNECT_TIMEOUT_MS;
        await schedule(req.params.id,'connecting',[
          deadline(result.session?.mode==='chat'?'chat_accept_timeout':'call_connect_timeout',
            startAt+timeout,'connect:'+req.params.id)
        ]);
      }
      await publishSession(result.session);
      return res.set('Cache-Control','no-store').json(result);
    } catch(error) {
      if(error?.code==='LIVE_TIMER_SCHEDULE_FAILED') await failClosedTimer(req.params.id);
      return replyError(res,error,'Unable to confirm the Live Session connection.');
    }
  });

  app.post('/live/sessions/:id/messages',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const result=await liveService.sendMessage({sessionId:req.params.id,senderUid:user.uid,text:req.body?.text});
      await publish(result.recipientUid,'live.chat.message',result.message.id,{message:result.message});
      await publish(user.uid,'live.chat.message',result.message.id,{message:result.message});
      return res.set('Cache-Control','no-store').json({success:true,message:result.message});
    } catch(error) { return replyError(res,error,'Unable to send the Live Chat message.'); }
  });

  app.get('/live/sessions/:id/messages',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const messages=await liveService.listMessages({
        sessionId:req.params.id,uid:user.uid,afterMs:req.query?.afterMs,limit:req.query?.limit
      });
      return res.set('Cache-Control','no-store').json({success:true,messages});
    } catch(error) { return replyError(res,error,'Unable to load Live Chat messages.'); }
  });

  app.post('/live/sessions/:id/signal',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const result=await liveService.signal({
        sessionId:req.params.id,senderUid:user.uid,type:req.body?.type,payload:req.body?.payload
      });
      await publish(result.recipientUid,'live.call.signal',result.signalId,{signal:{
        id:result.signalId,sessionId:req.params.id,senderUid:user.uid,type:req.body?.type,payload:req.body?.payload
      }});
      return res.set('Cache-Control','no-store').json({success:true,signalId:result.signalId});
    } catch(error) { return replyError(res,error,'Unable to relay the WebRTC signal.'); }
  });

  app.get('/live/sessions/:id/signals',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['customer','astrologer']);
      const signals=await liveService.listSignals({
        sessionId:req.params.id,uid:user.uid,afterMs:req.query?.afterMs,limit:req.query?.limit
      });
      return res.set('Cache-Control','no-store').json({success:true,signals});
    } catch(error) { return replyError(res,error,'Unable to load WebRTC signals.'); }
  });

  app.post('/admin/live/pricing',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['admin']);
      const current=await liveService.getPricing();
      const body=req.body||{};
      const hasCall=Object.prototype.hasOwnProperty.call(body,'callRatePerMinute');
      const hasChat=Object.prototype.hasOwnProperty.call(body,'chatRatePerMinute');
      const callRate=hasCall?parseRupeesToPaise(body.callRatePerMinute):current.callRatePaise;
      const chatRate=hasChat?parseRupeesToPaise(body.chatRatePerMinute):current.chatRatePaise;
      const maximum=Number(body.maxConcurrentSessions??current.maxConcurrentSessions);
      if((hasCall&&(callRate===null||callRate<100||callRate>1_000_000))||
         (hasChat&&(chatRate===null||chatRate<100||chatRate>1_000_000))) {
        throw httpError('LIVE_PRICE_INVALID','Legacy global Call/Chat display rates must be from ₹1.00 to ₹10,000.00 per minute.',400);
      }
      if(!Number.isSafeInteger(maximum)||maximum<1||maximum>3) throw httpError('LIVE_CONCURRENCY_INVALID','Maximum concurrent sessions must be from 1 to 3.',400);
      const saved=await liveService.saveSetting('liveSessionPricing',{
        ...current,callRatePaise:callRate,chatRatePaise:chatRate,maxConcurrentSessions:maximum,currency:'INR'
      },user.uid);
      return res.set('Cache-Control','no-store').json({
        success:true,callRatePaise:saved.callRatePaise,chatRatePaise:saved.chatRatePaise,
        callRatePerMinute:saved.callRatePaise/100,chatRatePerMinute:saved.chatRatePaise/100,
        maxConcurrentSessions:saved.maxConcurrentSessions
      });
    } catch(error) { return replyError(res,error,'Unable to save Live Call / Chat prices.'); }
  });

  app.post('/admin/live/commission',async(req,res)=>{
    try {
      await assertReady();
      const user=await requireRole(req,['admin']);
      const astroPercent=Number(req.body?.astroPercent);
      const adminPercent=Number(req.body?.adminPercent);
      try { splitLiveCommission(0,{astroPercent,adminPercent}); }
      catch { throw httpError('LIVE_COMMISSION_INVALID','Astrologer and Admin commissions must each be 0–100% and add up to 100%.',400); }
      const saved=await liveService.saveSetting('commission',{astroPercent,adminPercent},user.uid);
      return res.set('Cache-Control','no-store').json({success:true,...saved});
    } catch(error) { return replyError(res,error,'Unable to save Live / Booking commission settings.'); }
  });

  return Object.freeze({paths:Object.freeze([
    'GET /live/pricing','GET /live/ice-config','GET /live/events',
    'POST /live/requests','GET /live/sessions','GET /live/bookings/pending','GET /live/bookings/mine',
    'POST /live/bookings/:id/accept','POST /live/bookings/:id/reject','POST /live/bookings/:id/cancel',
    'POST /live/sessions/:id/accept','POST /live/sessions/:id/reject','POST /live/sessions/:id/end',
    'POST /live/sessions/:id/ready','POST /live/sessions/:id/messages','GET /live/sessions/:id/messages',
    'POST /live/sessions/:id/signal','GET /live/sessions/:id/signals',
    'POST /admin/live/pricing','POST /admin/live/commission'
  ])});
}
