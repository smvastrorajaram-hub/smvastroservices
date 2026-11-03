import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function millis(value){
  if(value&&typeof value.toMillis==='function')return Number(value.toMillis())||0;
  if(value&&typeof value.toDate==='function')return value.toDate().getTime()||0;
  if(value instanceof Date)return value.getTime()||0;
  if(value&&typeof value==='object'&&(value.seconds??value._seconds)!=null)return Number(value.seconds??value._seconds)*1000;
  const result=typeof value==='number'?value:Date.parse(String(value||''));
  return Number.isFinite(result)?result:0;
}
function activity(item={}){return Math.max(millis(item.paymentRecordedAt),millis(item.paidAt),millis(item.updatedAt),millis(item.createdAt),millis(item.submittedAt));}
function startDeadline(appointment){
  const date=String(appointment?.preferredDate||'');
  const time=String(appointment?.preferredTime||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))return 0;
  const [year,month,day]=date.split('-').map(Number);
  const [hour,minute]=time.split(':').map(Number);
  const base=Date.parse(date+'T'+time+':00+05:30');
  if(!Number.isFinite(base))return 0;
  const check=new Date(Date.UTC(year,month-1,day,hour,minute));
  if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)return 0;
  return base+2*60_000;
}
function sendError(res,error,fallback){
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'APPOINTMENT_ACTION_FAILED')
  });
}

/** Customer-scoped consultation history and UID-verified scheduled booking responses. */
export function registerLegacyAppointmentReadAndResponseRoutes({app,firestore,identityService,now=Date.now}={}){
  if(!app||typeof app.get!=='function'||typeof app.post!=='function'||
     typeof firestore?.runQuery!=='function'||typeof firestore?.getDocument!=='function'||
     typeof firestore?.runTransaction!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'){
    throw new TypeError('Appointment routes require Firestore Admin reads/transactions and verified identity.');
  }

  app.get('/customer/consultations',async(req,res)=>{
    try{
      const user=await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid=String(user.uid||'').trim();
      if(!uid)return res.status(401).set('Cache-Control','no-store').json({success:false,error:'Authentication required.'});
      const documents=await firestore.runQuery({
        collectionPath:'smv_questions',
        filters:[{field:'customerId',op:'==',value:uid}],
        orderBy:[{field:'createdAt',direction:'desc'}],
        limit:100
      });
      const questions=documents.map(document=>({id:document.id,...(document.data||{}),questionId:document.id}))
        .sort((a,b)=>activity(b)-activity(a));
      return res.set('Cache-Control','no-store').json({success:true,customerId:uid,questions});
    }catch(error){
      return sendError(res,error,'Unable to load customer consultations.');
    }
  });

  app.post('/astrologer/appointments/:id/respond',async(req,res)=>{
    try{
      const user=await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid=String(user.uid||'').trim();
      const id=String(req.params?.id||'').trim();
      const action=String(req.body?.action||'').trim().toLowerCase();
      if(!uid)return res.status(401).set('Cache-Control','no-store').json({success:false,error:'Authentication required.'});
      if(!id||id.length>200||id.includes('/'))return res.status(400).set('Cache-Control','no-store').json({success:false,error:'A valid booking ID is required.'});
      if(!['accept','reject'].includes(action))return res.status(400).set('Cache-Control','no-store').json({success:false,error:'Choose Accept or Reject.'});
      const [userSnapshot,astroSnapshot]=await Promise.all([
        firestore.getDocument('smv_users/'+uid),
        firestore.getDocument('smv_astrologers/'+uid)
      ]);
      const userProfile=userSnapshot.data||{};
      const astro=astroSnapshot.data||{};
      if(String(userProfile.role||'').toLowerCase()!=='astrologer'&&String(astro.role||'').toLowerCase()!=='astrologer'){
        return res.status(403).set('Cache-Control','no-store').json({success:false,error:'Astrologer access required.'});
      }
      const outcome=await firestore.runTransaction(async tx=>{
        const path='smv_appointments/'+id;
        const snapshot=await tx.getDocument(path);
        if(!snapshot.exists)return{errorStatus:404,error:'Scheduled booking not found.'};
        const appointment=snapshot.data||{};
        if(String(appointment.astrologerUid||'')!==uid)return{errorStatus:403,error:'This booking belongs to another Astrologer.'};
        if(!['scheduled_call_request','scheduled_chat_request'].includes(String(appointment.bookingKind||''))){
          return{errorStatus:400,error:'This record is not a scheduled Call/Chat booking.'};
        }
        const current=String(appointment.bookingStatus||'requested').toLowerCase();
        const target=action==='accept'?'accepted':'rejected';
        const deadline=startDeadline(appointment);
        if(action==='accept'&&current==='requested'&&!appointment.liveSessionId&&deadline>0&&now()>=deadline){
          tx.update(path,{
            bookingStatus:'missed_by_astrologer',status:'missed',
            missedReason:'astrologer_not_connected_within_grace',
            missedAt:FirestoreFieldValue.serverTimestamp(),
            updatedAt:FirestoreFieldValue.serverTimestamp()
          });
          return{errorStatus:409,error:'The 2-minute window after the scheduled time has passed. This booking is marked as missed.',bookingStatus:'missed_by_astrologer'};
        }
        if(current===target)return{success:true,alreadyProcessed:true,appointmentId:id,bookingStatus:target};
        if(current!=='requested')return{errorStatus:409,error:'This booking is already '+current.replaceAll('_',' ')+'.',bookingStatus:current};
        tx.update(path,{
          bookingStatus:target,status:target,
          respondedAt:FirestoreFieldValue.serverTimestamp(),
          respondedBy:uid,updatedAt:FirestoreFieldValue.serverTimestamp()
        });
        return{success:true,alreadyProcessed:false,appointmentId:id,bookingStatus:target};
      });
      if(outcome.errorStatus)return res.status(outcome.errorStatus).set('Cache-Control','no-store').json({success:false,error:outcome.error,bookingStatus:outcome.bookingStatus});
      return res.set('Cache-Control','no-store').json(outcome);
    }catch(error){
      return sendError(res,error,'Unable to update this scheduled booking.');
    }
  });

  return Object.freeze({paths:Object.freeze(['/customer/consultations','/astrologer/appointments/:id/respond'])});
}
