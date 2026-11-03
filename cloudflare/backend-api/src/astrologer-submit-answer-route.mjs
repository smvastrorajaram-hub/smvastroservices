import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function escapeHtml(value){return String(value??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function safeId(value){const id=String(value||'').trim();return id&&id.length<=200&&!id.includes('/')?id:'';}
function error(res,err,fallback){
 const status=Number(err?.httpStatus)||500;
 return res.status(status).set('Cache-Control','no-store').json({
  success:false,error:status>=500?fallback:String(err?.message||fallback),
  code:String(err?.code||'ANSWER_SUBMISSION_FAILED')
 });
}

export function registerAstrologerSubmitAnswerRoute({app,firestore,identityService,emailClient=null,adminEmail='',siteUrl='https://smvastroservices.in',randomId=()=>globalThis.crypto.randomUUID()}={}){
 if(!app||typeof app.post!=='function'||typeof firestore?.getDocument!=='function'||
    typeof firestore?.runTransaction!=='function'||
    !identityService||typeof identityService.authenticateAuthorization!=='function'){
  throw new TypeError('Answer submission route requires Firestore transactions and verified identity.');
 }
 async function sendEmailOnce(eventKey,options){
  if(!emailClient)return{skipped:true,reason:'email_not_configured'};
  const eventId=eventKey.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,180);
  const path='smv_email_events/'+eventId;
  const claimed=await firestore.runTransaction(async tx=>{
   const previous=await tx.getDocument(path);
   if(previous.exists&&['sending','sent'].includes(String(previous.data?.state||'')))return false;
   tx.set(path,{eventKey,state:'sending',subject:options.subject,updatedAt:FirestoreFieldValue.serverTimestamp()},{merge:true});
   return true;
  });
  if(!claimed)return{duplicate:true};
  try{
   const result=await emailClient.send({...options,idempotencyKey:eventKey});
   await firestore.updateDocument(path,{state:'sent',providerMessageId:result.id,sentAt:FirestoreFieldValue.serverTimestamp(),updatedAt:FirestoreFieldValue.serverTimestamp()});
   return result;
  }catch(err){
   await firestore.updateDocument(path,{state:'failed',errorCode:String(err?.code||'EMAIL_FAILED'),updatedAt:FirestoreFieldValue.serverTimestamp()}).catch(()=>{});
   return{failed:true};
  }
 }

 app.post('/submit-answer',async(req,res)=>{
  try{
   const user=await identityService.authenticateAuthorization(req.get('Authorization'));
   const uid=String(user.uid||'').trim();
   const questionId=safeId(req.body?.questionId);
   const answer=String(req.body?.answer||'').trim();
   if(!questionId||!answer)return res.status(400).set('Cache-Control','no-store').json({error:'Question ID and answer are required.'});
   if(answer.length>50000)return res.status(400).set('Cache-Control','no-store').json({error:'Answer is too long.'});

   const outcome=await firestore.runTransaction(async tx=>{
    const questionPath='smv_questions/'+questionId;
    const [snapshot,workflowSnapshot]=await Promise.all([
     tx.getDocument(questionPath),
     tx.getDocument('smv_settings/workflow')
    ]);
    if(!snapshot.exists)throw Object.assign(new Error('Question not found.'),{code:'QUESTION_NOT_FOUND',httpStatus:404});
    const q=snapshot.data||{};
    const workflow=workflowSnapshot.data||{};
    if(String(q.astrologerId||'')!==uid)throw Object.assign(new Error('This question is not assigned to you.'),{code:'QUESTION_NOT_ASSIGNED',httpStatus:403});
    const bypass=workflow.allowWithoutAdminApproval===true&&q.adminApprovalBypassed!==false;
    const editable=['admin_approved','revision_required','processing','admin_review'];
    if(bypass&&String(q.status||'')==='answered'&&(q.customerAnswerViewedAt||String(q.commissionStatus||'')==='credited')){
     throw Object.assign(new Error('The customer has already viewed this answer. It can no longer be edited.'),{code:'ANSWER_ALREADY_VIEWED',httpStatus:409});
    }
    if(!editable.includes(String(q.status||''))&&!(bypass&&String(q.status||'')==='answered')){
     throw Object.assign(new Error('This answer can no longer be edited.'),{code:'ANSWER_NOT_EDITABLE',httpStatus:409});
    }
    const minWords=Math.max(1,Number(q.answerMinWords||150));
    const wordCount=answer.split(/\s+/).filter(Boolean).length;
    if(!Number.isFinite(minWords)||wordCount<minWords){
     throw Object.assign(new Error('Please write at least '+minWords+' words.'),{code:'ANSWER_MINIMUM_WORDS',httpStatus:400});
    }
    const percent=Number(q.commissionPercent||q.commissionRate||20);
    const amount=Number(q.amount||0);
    if(!Number.isFinite(percent)||percent<0||percent>100||!Number.isFinite(amount)||amount<0){
     throw Object.assign(new Error('Saved commission details are invalid.'),{code:'ANSWER_COMMISSION_INVALID',httpStatus:409});
    }
    const commission=Math.round(amount*percent)/100;
    const timestamp=FirestoreFieldValue.serverTimestamp();
    const patch={
     answer,
     answerWordCount:wordCount,
     answerSubmittedAt:timestamp,
     astrologerAnswerStatus:bypass?'approved':'submitted',
     astrologerEditMode:false,
     status:bypass?'answered':'processing',
     answerAvailableAt:bypass?(q.answerAvailableAt||q.answerApprovedAt||timestamp):FirestoreFieldValue.delete(),
     answerApprovedAt:bypass?timestamp:FirestoreFieldValue.delete(),
     adminAnswerApprovedAt:bypass?timestamp:FirestoreFieldValue.delete(),
     customerAnswerViewedAt:bypass?FirestoreFieldValue.delete():(q.customerAnswerViewedAt||FirestoreFieldValue.delete()),
     astrologerCommissionAmount:commission,
     commissionPercent:percent,
     commissionRate:percent,
     commissionStatus:bypass?'pending_customer_view':'pending_admin_approval',
     commissionCreditedAt:FirestoreFieldValue.delete(),
     answerEmailStatus:{state:bypass?'pending':'awaiting_admin_approval',updatedAt:timestamp},
     updatedAt:timestamp
    };
    tx.update(questionPath,patch);
    const auditId=String(randomId()).replace(/[^A-Za-z0-9_-]/g,'').slice(0,100);
    tx.create('smv_admin_audit/ANSWER_SUBMITTED_'+questionId+'_'+(auditId||'event'),{
     action:'ASTROLOGER_ANSWER_SUBMITTED',questionId,actorUid:uid,
     details:{wordCount,previousStatus:String(q.status||''),nextStatus:bypass?'answered':'processing',bypassApproval:bypass},
     createdAt:timestamp
    });
    tx.set('smv_notifications/astro-answer-submitted-'+questionId+'-'+uid,{
     userId:uid,type:bypass?'answer_auto_released':'answer_submitted',
     title:bypass?'Answer submitted and released':'Answer submitted',
     message:bypass?'Your answer was released to the customer.':'Your answer is waiting for Admin approval.',
     questionId,createdAt:timestamp,read:false
    },{merge:true});
    if(q.customerId){
     tx.set('smv_notifications/'+String(q.customerId)+'_answer_submitted_'+questionId,{
      userId:String(q.customerId),
      type:bypass?'answer_ready':'astrologer_answer_submitted',
      title:bypass?'Answer Ready':'Astrologer Answer Submitted',
      message:bypass?'Your astrologer answer is ready to view.':'Your Astrologer submitted an answer. It is waiting for Admin approval.',
      questionId,customerPaymentId:String(q.customerPaymentId||''),
      astrologerId:uid,astrologerName:String(q.astrologerName||'Astrologer'),
      createdAt:timestamp,updatedAt:timestamp,read:false
     },{merge:true});
    }
    return{question:q,questionId,wordCount,bypass,commission};
   });

   const q=outcome.question;
   const [customerProfile,astroProfile]=await Promise.all([
    q.customerId?firestore.getDocument('smv_users/'+String(q.customerId)):Promise.resolve({exists:false,data:null}),
    firestore.getDocument('smv_users/'+uid)
   ]);
   const customerEmail=String(q.customerEmail||q.email||customerProfile.data?.email||'').trim();
   const astrologerEmail=String(user.email||astroProfile.data?.email||'').trim();
   const customerName=String(q.customerName||q.birthName||'Customer');
   const astrologerName=String(q.astrologerName||'Astrologer');
   const statusLabel=outcome.bypass?'Released automatically to customer':'Waiting for Admin approval';
   if(emailClient&&adminEmail){
    const body='Astrologer '+astrologerName+' submitted an answer for '+customerName+'.\n\nQuestion ID: '+questionId+'\nStatus: '+statusLabel+'.';
    await sendEmailOnce('smv-answer-admin-'+questionId+'-'+outcome.wordCount,{
     to:adminEmail,subject:outcome.bypass?'SMV ASTRO — Answer Submitted & Released':'SMV ASTRO — Answer Waiting for Approval',text:body,replyTo:adminEmail
    });
    if(astrologerEmail){
     await sendEmailOnce('smv-answer-astro-'+questionId+'-'+outcome.wordCount,{
      to:astrologerEmail,subject:outcome.bypass?'SMV ASTRO — Your Answer Was Released':'SMV ASTRO — Answer Submitted for Review',
      text:'Your answer for Question ID '+questionId+' was submitted successfully. '+statusLabel+'.',replyTo:adminEmail
     });
    }
    if(outcome.bypass&&customerEmail){
     const cleanAnswer=String(req.body?.answer||'').replace(/\r\n/g,'\n').trim();
     const text='Dear '+customerName+',\n\n'+astrologerName+' has answered your astrology consultation.\n\nQuestion: '+String(q.question||'')+'\nQuestion ID: '+questionId+'\n\nAstrologer Answer:\n'+cleanAnswer+'\n\n'+String(siteUrl).replace(/\/$/,'')+'/#dashboard\n\nRegards,\nSMV ASTRO';
     const html='<div><h2>Your Astrology Consultation Answer is Ready</h2><p>Dear '+escapeHtml(customerName)+',</p><p>'+escapeHtml(astrologerName)+' has answered your consultation.</p><p><b>Question ID:</b> '+escapeHtml(questionId)+'</p><div style="white-space:pre-wrap">'+escapeHtml(cleanAnswer)+'</div><p><a href="'+escapeHtml(String(siteUrl).replace(/\/$/,'')+'/#dashboard')+'">Open Customer Dashboard</a></p></div>';
     await sendEmailOnce('smv-answer-customer-'+questionId+'-'+outcome.wordCount,{to:customerEmail,subject:'Your Astrology Consultation Answer is Ready | SMV ASTRO',text,html,replyTo:adminEmail});
    }
   }

   if(emailClient){
    await firestore.updateDocument('smv_questions/'+questionId,{
     answerEmailStatus:{state:emailClient?'attempted':'pending',updatedAt:FirestoreFieldValue.serverTimestamp()}
    }).catch(()=>{});
   }
   return res.set('Cache-Control','no-store').json({
    success:true,ok:true,answerSaved:true,status:outcome.bypass?'answered':'processing',
    questionId,wordCount:outcome.wordCount
   });
  }catch(err){
   return error(res,err,'Unable to submit answer.');
  }
 });
 return Object.freeze({paths:Object.freeze(['/submit-answer'])});
}
