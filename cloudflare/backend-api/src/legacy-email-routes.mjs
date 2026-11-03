import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function escapeText(value){return String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function safeId(value){const id=String(value||'').trim();return id&&id.length<=200&&!id.includes('/')?id:'';}
function sendError(res,error,fallback){
 const status=Number(error?.httpStatus)||500;
 return res.status(status).set('Cache-Control','no-store').json({
  success:false,error:status>=500?fallback:String(error?.message||fallback),
  code:String(error?.code||'EMAIL_ROUTE_FAILED')
 });
}
function eventDocId(event,questionId){return (String(event)+'_'+String(questionId)).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,180);}

export function registerLegacyEmailRoutes({app,firestore,identityService,emailClient,adminEmail='',randomId=()=>globalThis.crypto.randomUUID()}={}){
 if(!app||typeof app.post!=='function'||typeof firestore?.getDocument!=='function'||
    typeof firestore?.runTransaction!=='function'||typeof firestore?.updateDocument!=='function'||
    !identityService||typeof identityService.authenticateAuthorization!=='function'){
  throw new TypeError('Email routes require Firestore transactions and verified identity.');
 }
 async function sendIdempotent(key,options){
  const eventPath='smv_email_events/'+key;
  const claimed=await firestore.runTransaction(async tx=>{
   const existing=await tx.getDocument(eventPath);
   if(existing.exists&&['sending','sent'].includes(String(existing.data?.state||'')))return false;
   tx.set(eventPath,{
    eventKey:key,state:'sending',subject:options.subject,
    recipients:Array.isArray(options.to)?options.to:[options.to],
    updatedAt:FirestoreFieldValue.serverTimestamp(),
    createdAt:existing.exists?(existing.data?.createdAt||FirestoreFieldValue.serverTimestamp()):FirestoreFieldValue.serverTimestamp()
   },{merge:true});
   return true;
  });
  if(!claimed)return{duplicate:true};
  try{
   const sent=await emailClient.send({...options,idempotencyKey:key});
   await firestore.updateDocument(eventPath,{
    state:'sent',providerMessageId:sent.id,sentAt:FirestoreFieldValue.serverTimestamp(),
    updatedAt:FirestoreFieldValue.serverTimestamp()
   });
   return sent;
  }catch(error){
   await firestore.updateDocument(eventPath,{
    state:'failed',errorCode:String(error?.code||'EMAIL_FAILED'),
    updatedAt:FirestoreFieldValue.serverTimestamp()
   }).catch(()=>{});
   throw error;
  }
 }

 app.post('/contact-query',async(req,res)=>{
  try{
   if(!emailClient||!adminEmail)return res.status(503).set('Cache-Control','no-store').json({success:false,error:'Contact email service is not configured.'});
   const body=req.body||{};
   const name=String(body.name||'').trim();
   const email=String(body.email||'').trim();
   const place=String(body.place||'').trim();
   const mobile=String(body.mobile||'').trim();
   const query=String(body.query||'').trim();
   if(!name||!email||!place||!mobile||!query)return res.status(400).set('Cache-Control','no-store').json({error:'Please fill all required fields.'});
   if(name.length>100||email.length>160||place.length>120||mobile.length>20||query.length>3000)return res.status(400).set('Cache-Control','no-store').json({error:'One or more fields are too long.'});
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).set('Cache-Control','no-store').json({error:'Please enter a valid email address.'});
   const queryId=String(randomId()).replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);
   if(!queryId)return res.status(500).set('Cache-Control','no-store').json({error:'Unable to create contact query.'});
   await firestore.runTransaction(async tx=>{
    tx.create('contactQueries/'+queryId,{
     name,email,place,mobile,query,status:'new',
     createdAt:FirestoreFieldValue.serverTimestamp(),
     source:'website-contact-form'
    });
   });
   const text=[
    'SMV ASTRO QUERY','', 'Name: '+name,'Email: '+email,'Place: '+place,
    'Mobile: '+mobile,'','Query:',query,'','Query ID: '+queryId
   ].join('\n');
   const html='<div><h2>SMV ASTRO QUERY</h2><p><b>Name:</b> '+escapeText(name)+'</p><p><b>Email:</b> '+escapeText(email)+'</p><p><b>Place:</b> '+escapeText(place)+'</p><p><b>Mobile:</b> '+escapeText(mobile)+'</p><p><b>Query:</b></p><div style="white-space:pre-wrap">'+escapeText(query)+'</div><p>Query ID: '+escapeText(queryId)+'</p></div>';
   await sendIdempotent('smv-contact-'+queryId,{to:adminEmail,replyTo:email,subject:'SMV ASTRO Query',text,html});
   await firestore.updateDocument('contactQueries/'+queryId,{emailStatus:'sent',emailSentAt:FirestoreFieldValue.serverTimestamp()});
   return res.set('Cache-Control','no-store').json({ok:true,queryId});
  }catch(error){
   return sendError(res,error,'Unable to send your query right now. Please try again later.');
  }
 });

 app.post('/question-notify',async(req,res)=>{
  try{
   if(!emailClient||!adminEmail)return res.status(503).set('Cache-Control','no-store').json({error:'Email notification service is not configured.'});
   const user=await identityService.authenticateAuthorization(req.get('Authorization'));
   const questionId=safeId(req.body?.questionId);
   const event=String(req.body?.event||'').trim();
   const reason=String(req.body?.reason||'').trim();
   const allowed=['payment_verified','question_approved','question_rejected','answer_submitted','answer_approved','answer_rejected'];
   if(!questionId||!allowed.includes(event))return res.status(400).set('Cache-Control','no-store').json({error:'Invalid question notification request.'});
   const snapshot=await firestore.getDocument('smv_questions/'+questionId);
   if(!snapshot.exists)return res.status(404).set('Cache-Control','no-store').json({error:'Question not found.'});
   const question=snapshot.data||{};
   const isAdmin=user.isAdmin===true||String(user.role||'').toLowerCase()==='admin';
   const isCustomer=String(question.customerId||'')===String(user.uid||'');
   const isAstrologer=String(question.astrologerId||'')===String(user.uid||'');
   if(event==='payment_verified'&&!isCustomer)return res.status(403).set('Cache-Control','no-store').json({error:'Only the question owner can send this notification.'});
   if(['question_approved','question_rejected','answer_approved','answer_rejected'].includes(event)&&!isAdmin)return res.status(403).set('Cache-Control','no-store').json({error:'Admin access required for this notification.'});
   if(event==='answer_submitted'&&!isAstrologer)return res.status(403).set('Cache-Control','no-store').json({error:'Only the assigned Astrologer can send this notification.'});

   const customerId=String(question.customerId||'');
   const astrologerId=String(question.astrologerId||'');
   const [customerProfile,astroProfile]=await Promise.all([
    customerId?firestore.getDocument('smv_users/'+customerId):Promise.resolve({exists:false,data:null}),
    astrologerId?firestore.getDocument('smv_users/'+astrologerId):Promise.resolve({exists:false,data:null})
   ]);
   const customerEmail=String(question.customerEmail||question.email||customerProfile.data?.email||'').trim();
   const astrologerEmail=String(question.astrologerEmail||astroProfile.data?.email||'').trim();
   const customerName=String(question.customerName||question.birthName||'Customer');
   const astrologerName=String(question.astrologerName||'Astrologer');
   let recipients=[],subject='',text='';
   switch(event){
    case 'payment_verified':
     recipients=customerEmail?[customerEmail]:[];subject='SMV ASTRO — Question payment received';
     text='Dear '+customerName+',\n\nYour payment for your astrology question has been successfully verified. Your question is now waiting for Admin approval.\n\nQuestion: '+String(question.question||'')+'\nQuestion ID: '+questionId+'\n\nRegards,\nSMV ASTRO';break;
    case 'question_approved':
     recipients=customerEmail?[customerEmail]:[];subject='SMV ASTRO — Your question has been approved';
     text='Dear '+customerName+',\n\nYour paid astrology question has been approved by Admin and assigned to an approved Astrologer.\n\nQuestion: '+String(question.question||'')+'\nQuestion ID: '+questionId+'\n\nRegards,\nSMV ASTRO';break;
    case 'question_rejected':
     recipients=customerEmail?[customerEmail]:[];subject='SMV ASTRO — Question update';
     text='Dear '+customerName+',\n\nYour astrology question was not approved by Admin.\n\nReason: '+(reason||'Please contact SMV ASTRO.')+'\nQuestion ID: '+questionId+'\n\nRegards,\nSMV ASTRO';break;
    case 'answer_submitted':
     recipients=[customerEmail,adminEmail].filter(Boolean);subject='SMV ASTRO — Astrologer answer submitted';
     text='Dear '+customerName+',\n\n'+astrologerName+' has submitted an answer to your astrology question. It is now waiting for Admin review.\n\nQuestion: '+String(question.question||'')+'\nQuestion ID: '+questionId+'\n\nRegards,\nSMV ASTRO';break;
    case 'answer_approved':
     recipients=customerEmail?[customerEmail]:[];subject='Your Astrology Consultation Answer is Ready | SMV ASTRO';
     text='Dear '+customerName+',\n\n'+astrologerName+' has answered your consultation.\n\nQuestion: '+String(question.question||'')+'\nQuestion ID: '+questionId+'\n\nAnswer:\n'+String(question.answer||'')+'\n\nRegards,\nSMV ASTRO';break;
    case 'answer_rejected':
     recipients=astrologerEmail?[astrologerEmail]:[];subject='SMV ASTRO — Answer revision required';
     text='Dear '+astrologerName+',\n\nYour submitted answer requires revision.\n\nReason: '+(reason||'Please review and resubmit the answer.')+'\nQuestion ID: '+questionId+'\n\nRegards,\nSMV ASTRO';break;
   }
   if(!recipients.length)return res.status(400).set('Cache-Control','no-store').json({error:'No recipient email address is available for this update.'});
   const key='smv-question-'+event+'-'+questionId;
   const sent=await sendIdempotent(key,{to:recipients,replyTo:adminEmail,subject,text});
   return res.set('Cache-Control','no-store').json({ok:true,recipients:recipients.length,event,duplicate:sent.duplicate===true});
  }catch(error){
   return sendError(res,error,'Unable to send question update email right now.');
  }
 });

 return Object.freeze({paths:Object.freeze(['/contact-query','/question-notify'])});
}
