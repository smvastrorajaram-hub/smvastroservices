// Server-side change signals. Full records remain behind existing authorized APIs.
module.exports=function registerDashboardEvents(app,{db,requireUser,isAdminUser}){
 // Share identical listeners across tabs/connections in this server process.
 // Keys include the role/user query scope; never share records across users.
 const listeners=new Map();
 function listen(key,ref,next,error){
  let entry=listeners.get(key);
  if(!entry){
   entry={subscribers:new Set(),snapshot:null,stop:null};listeners.set(key,entry);
   entry.stop=ref.onSnapshot(snapshot=>{
    entry.snapshot=snapshot;for(const sub of [...entry.subscribers])sub.next(snapshot);
   },err=>{for(const sub of [...entry.subscribers])sub.error(err);listeners.delete(key);});
  }
  const subscriber={next,error};entry.subscribers.add(subscriber);
  if(entry.snapshot)queueMicrotask(()=>{if(entry.subscribers.has(subscriber))next(entry.snapshot);});
  return ()=>{entry.subscribers.delete(subscriber);if(!entry.subscribers.size){entry.stop?.();if(listeners.get(key)===entry)listeners.delete(key);}};
 }

 app.get('/dashboard/events',async(req,res)=>{
  const user=await requireUser(req,res);if(!user)return;
  let stopped=false,heartbeat,expiry,debounce;const unsubs=[];
  function stop(){if(stopped)return;stopped=true;clearInterval(heartbeat);clearTimeout(expiry);clearTimeout(debounce);unsubs.forEach(fn=>fn());if(!res.writableEnded)res.end();}
  res.on('close',stop);
  try{
   const [adminUser,profile]=await Promise.all([isAdminUser(user),db.collection('smv_users').doc(user.uid).get()]);
   if(stopped)return;
   const role=adminUser?'admin':String(profile.data()?.role||'customer');
   res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
   res.flushHeaders();
   const send=(event,data={})=>{if(!stopped)res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);};
   const dirty=new Set();
   const changed=kind=>{dirty.add(kind||'dashboard');clearTimeout(debounce);debounce=setTimeout(()=>{const kinds=[...dirty];dirty.clear();send('change',{kinds});},100);};
   const refs=[{ref:db.collection('smv_users').doc(user.uid),kind:'profile'}];
   if(role==='admin'){
    // V48 READ HARDENING: never attach whole-collection listeners for Admin.
    // All successful backend mutations bump this single lightweight document.
    refs.push({ref:db.collection('smv_settings').doc('dashboardChange'),kind:'admin_signal'});
   }else if(role==='astrologer'){
    // Keep the Astrologer's own profile live, but avoid a second profile read
    // and all history/workflow listeners just to invalidate the Dashboard.
    // Current session/booking changes arrive through the Live Session SSE stream.
    refs.push(
     {ref:db.collection('smv_astrologers').doc(user.uid),kind:'profile'},
     {ref:db.collection('smv_settings').doc('dashboardChange'),kind:'dashboard_signal'}
    );
   }else{
    // Customer dashboard no longer has public/private question history. Keep only
    // the newest relevant notification records for Call, Chat, booking, Wallet and withdrawals.
    refs.push({
     ref:db.collection('smv_notifications').where('userId','==',user.uid).orderBy('createdAt','desc').limit(50),
     kind:'notifications'
    });
   }
   let waiting=refs.length;
   refs.forEach((entry,index)=>{
    const ref=entry.ref,kind=entry.kind;
    let first=true;
    const sharedKey=ref.path||[role,user.uid,kind].join(':');
    unsubs.push(listen(sharedKey,ref,snap=>{
     if(first){first=false;if(--waiting===0)send('ready');return;}
     // Recheck access at reconnect after own role/approval changes.
     if(index===0 || (role==='astrologer'&&kind==='profile')){send('change',{kinds:['profile']});stop();return;}
     if(role==='admin'&&kind==='admin_signal'){
      const signal=snap.data?.()||{};
      const path=String(signal.path||''),category=String(signal.category||'');
      send('change',{kinds:['admin_signal'],path,category});
      return;
     }
     if(role==='astrologer'&&kind==='dashboard_signal'){
      const category=String(snap.data?.()?.category||'');
      // Ignore writes from retired question workflows and unrelated site content.
      if(!['withdrawals_payouts','financial','astrologers','astrologer_settings','settings','reviews'].includes(category))return;
      send('change',{kinds:['dashboard_signal'],category});
      return;
     }
     changed(kind);
    },err=>{console.warn('Dashboard stream listener failed:',err.code||err.message);stop();}));
   });
   heartbeat=setInterval(()=>{if(!stopped)res.write(': heartbeat\n\n');},20000);
   // Reauthenticate on reconnect; never outlive the verified ID token.
   expiry=setTimeout(stop,Math.max(1000,Math.min(25*60*1000,(Number(user.exp)*1000||Date.now()+25*60*1000)-Date.now())));
  }catch(e){if(!res.headersSent){res.status(500).json({error:'Live updates temporarily unavailable.'});}stop();}
 });
};
