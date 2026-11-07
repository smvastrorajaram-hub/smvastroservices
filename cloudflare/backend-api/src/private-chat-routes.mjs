import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

const QUESTION_COLLECTION='smv_questions';
const ORDER_COLLECTION='razorpay_orders';
const SETTINGS_PATH='smv_settings/privateChat';
const CURRENCY='INR';

function apiError(code,message,httpStatus=409){
  return Object.assign(new Error(message),{code,httpStatus});
}
function safeId(value,max=200){
  const id=String(value||'').trim();
  return id&&id.length<=max&&/^[A-Za-z0-9_-]+$/.test(id)?id:'';
}
function rupeesToPaise(value){
  const amount=Number(value);
  if(!Number.isFinite(amount)||amount<0)return null;
  const paise=Math.round(amount*100);
  return Number.isSafeInteger(paise)&&Math.abs(amount*100-paise)<0.000001?paise:null;
}
function millis(value){
  if(!value)return 0;
  if(typeof value.toMillis==='function')return Number(value.toMillis())||0;
  if(typeof value.toDate==='function')return value.toDate().getTime()||0;
  if(value instanceof Date)return value.getTime()||0;
  if(typeof value==='object'){
    const seconds=Number(value.seconds??value._seconds);
    const nanos=Number(value.nanoseconds??value._nanoseconds??0);
    if(Number.isFinite(seconds))return seconds*1000+(Number.isFinite(nanos)?nanos:0)/1e6;
  }
  const parsed=typeof value==='number'?value:Date.parse(String(value||''));
  return Number.isFinite(parsed)?parsed:0;
}
const CUSTOMER_FIELDS=[
  'questionId','questionType','privateChat','customerName','question','amount',
  'status','paymentStatus','allocationStatus','customerPaymentId','astrologerId',
  'astrologerName','answer','answerSubmittedAt','answerAvailableAt','createdAt',
  'updatedAt','refundStatus','refundId','refundAmount','refundRrn'
];
const ASTROLOGER_FIELDS=[
  'questionId','questionType','privateChat','customerName','birthDetails',
  'birthDate','birthTime','birthPlace','birthGender','question','amount',
  'status','paymentStatus','allocationStatus','customerPaymentId',
  'astrologerId','astrologerName','answer','answerMinWords','answerSubmittedAt',
  'answerAvailableAt','answerRejectionReason','createdAt','updatedAt'
];
const ADMIN_FIELDS=[
  ...ASTROLOGER_FIELDS,'requestedAstrologerId','requestedAstrologerName','refundStatus','refundId','refundAmount','refundReason',
  'adminQuestionRejectedAt','commissionStatus','commissionPercent',
  'astrologerCommissionAmount','adminCommissionAmount'
];
function selectFields(record,fields){
  const output={};
  for(const key of fields)if(record?.[key]!==undefined)output[key]=record[key];
  return output;
}
function sendError(res,error,fallback){
  const status=Number(error?.httpStatus)||500;
  return res.status(status).set('Cache-Control','no-store').json({
    success:false,
    error:status>=500?fallback:String(error?.message||fallback),
    code:String(error?.code||'PRIVATE_CHAT_FAILED')
  });
}
function randomPublicId(prefix,cryptoImpl){
  if(!cryptoImpl||typeof cryptoImpl.getRandomValues!=='function')throw apiError('SECURE_RANDOM_UNAVAILABLE','Secure ID generation is unavailable.',503);
  const bytes=new Uint32Array(1);
  cryptoImpl.getRandomValues(bytes);
  return prefix+String(100000+(bytes[0]%900000));
}
function validBirthDate(value,now){
  const date=String(value||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const parsed=new Date(date+'T00:00:00Z');
  return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===date&&date<=new Date(Number(now())).toISOString().slice(0,10);
}

export function registerPrivateChatRoutes({
  app,firestore,identityService,razorpay,razorpayKeyId,
  paymentDetails,recordQuestionPayment,refundPrivateChatQuestion,cryptoImpl=globalThis.crypto,now=Date.now
}={}){
  if(!app||typeof app.get!=='function'||typeof app.post!=='function'||
     typeof firestore?.getDocument!=='function'||typeof firestore?.setDocument!=='function'||
     typeof firestore?.runQuery!=='function'||typeof firestore?.runTransaction!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'||
     !razorpay||typeof razorpay.createOrder!=='function'||typeof razorpay.fetchOrder!=='function'||
     typeof razorpay.verifyPaymentSignature!=='function'||
     typeof paymentDetails!=='function'||typeof recordQuestionPayment!=='function'||
     typeof refundPrivateChatQuestion!=='function'){
    throw new TypeError('Private Chat routes require verified identity, Firestore transactions and Razorpay payment helpers.');
  }

  async function authenticate(req,roles=['customer']){
    const user=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(!roles.includes(String(user.role||'').toLowerCase())){
      throw apiError('AUTH_ROLE_REQUIRED','This account does not have permission for this Private Chat operation.',403);
    }
    return user;
  }
  async function requireAdmin(req){
    const user=await identityService.authenticateAuthorization(req.get('Authorization'));
    if(user.isAdmin!==true&&String(user.role||'').toLowerCase()!=='admin'){
      throw apiError('ADMIN_REQUIRED','Admin access denied.',403);
    }
    return user;
  }
  async function readSettings(){
    const [snapshot,legacyAnswerSettings]=await Promise.all([
      firestore.getDocument(SETTINGS_PATH),
      firestore.getDocument('smv_settings/answer').catch(()=>({exists:false,data:null}))
    ]);
    const data=snapshot.exists?(snapshot.data||{}):{};
    const price=Number(data.price||0);
    const configuredWords=data.minimumAnswerWords??legacyAnswerSettings.data?.minimumWords??150;
    const minimumAnswerWords=Math.max(1,Math.min(10000,Math.floor(Number(configuredWords)||150)));
    const astrologerCommissionPercent=data.astrologerCommissionPercent==null||String(data.astrologerCommissionPercent).trim()===''?null:Number(data.astrologerCommissionPercent);
    const adminCommissionPercent=data.adminCommissionPercent==null||String(data.adminCommissionPercent).trim()===''?null:Number(data.adminCommissionPercent);
    const commissionConfigured=Number.isFinite(astrologerCommissionPercent)&&astrologerCommissionPercent>=0&&astrologerCommissionPercent<=100&&
      Number.isFinite(adminCommissionPercent)&&adminCommissionPercent>=0&&adminCommissionPercent<=100&&
      Math.abs(astrologerCommissionPercent+adminCommissionPercent-100)<0.000001;
    const assignmentMode=['direct_selected','open_to_all'].includes(data.assignmentMode)?'direct_selected':'admin_assigned';
    const configuredEnabled=data.enabled===true;
    return {
      enabled:configuredEnabled&&Number.isFinite(price)&&price>=1&&commissionConfigured,
      configuredEnabled,commissionConfigured,assignmentMode,
      astrologerCommissionPercent:Number.isFinite(astrologerCommissionPercent)?astrologerCommissionPercent:null,
      adminCommissionPercent:Number.isFinite(adminCommissionPercent)?adminCommissionPercent:null,
      price:Number.isFinite(price)&&price>=0?Math.round(price*100)/100:0,
      minimumAnswerWords,turnaround:'24–48 hours'
    };
  }
  async function loadOwnedPrivateQuestion(questionId,customerId){
    const snapshot=await firestore.getDocument(QUESTION_COLLECTION+'/'+questionId);
    if(!snapshot.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
    const question=snapshot.data||{};
    if(question.privateChat!==true||String(question.questionType||'')!=='private_chat'){
      throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
    }
    if(String(question.customerId||'')!==String(customerId||'')){
      throw apiError('PRIVATE_CHAT_OWNER_MISMATCH','You do not own this Private Chat question.',403);
    }
    return question;
  }

  async function createOrReuseOrder(questionId,question,user){
    if(String(question.paymentStatus||'')==='paid'){
      return {
        success:true,alreadyPaid:true,questionId,
        customerPaymentId:String(question.customerPaymentId||''),
        razorpayPaymentId:String(question.razorpayPaymentId||''),
        amount:rupeesToPaise(question.amount)||0
      };
    }
    const amountPaise=rupeesToPaise(question.amount);
    if(amountPaise===null||amountPaise<100)throw apiError('PRIVATE_CHAT_AMOUNT_INVALID','The saved Private Chat price is invalid.',409);
    if(question.razorpayOrderId&&['order_created','verification_failed','failed'].includes(String(question.paymentStatus||''))){
      const existing=await razorpay.fetchOrder(String(question.razorpayOrderId)).catch(()=>null);
      if(existing){
        if(String(existing.status||'').toLowerCase()==='paid'){
          throw apiError('PRIVATE_CHAT_PAYMENT_PENDING_RECONCILIATION','Razorpay shows a paid order. Refresh your Customer Dashboard before trying again.',409);
        }
        if(Number(existing.amount)===amountPaise&&String(existing.currency||'').toUpperCase()===CURRENCY){
          return {success:true,questionId,orderId:existing.id,keyId:String(razorpayKeyId||''),amount:amountPaise,currency:CURRENCY,reused:true};
        }
        throw apiError('PRIVATE_CHAT_ORDER_MISMATCH','The previous Razorpay order does not match the saved Private Chat price. No duplicate order was created.',409);
      }
    }
    const receipt=('SMVPC_'+questionId.replace(/[^A-Za-z0-9]/g,'').slice(-24)).slice(0,40);
    const recovered=typeof razorpay.findOrderByReceipt==='function'
      ?await razorpay.findOrderByReceipt(receipt,{amountPaise,currency:CURRENCY}).catch(()=>null):null;
    const order=recovered||await razorpay.createOrder({
      amountPaise,currency:CURRENCY,receipt,
      notes:{questionId,customerId:user.uid,requestedAstrologerId:String(question.requestedAstrologerId||''),serviceName:'Private Chat'}
    });
    await firestore.setDocument(QUESTION_COLLECTION+'/'+questionId,{
      razorpayOrderId:order.id,paymentCurrency:CURRENCY,paymentStatus:'order_created',
      paymentUpdatedAt:FirestoreFieldValue.serverTimestamp(),updatedAt:FirestoreFieldValue.serverTimestamp()
    },{merge:true});
    await firestore.setDocument(ORDER_COLLECTION+'/'+order.id,{
      razorpayOrderId:order.id,questionId,questionType:'private_chat',privateChat:true,
      amount:order.amount,currency:order.currency,firebaseUid:user.uid,
      customerEmail:user.email||null,requestedAstrologerId:String(question.requestedAstrologerId||''),
      serviceName:'SMV ASTRO Private Chat',status:'created',createdAt:FirestoreFieldValue.serverTimestamp()
    },{merge:true});
    return {
      success:true,questionId,orderId:order.id,keyId:String(razorpayKeyId||''),
      amount:order.amount,currency:order.currency,originalAmount:Number(question.amount||0)
    };
  }

  app.get('/private-chat/settings',async(_req,res)=>{
    try{
      const settings=await readSettings();
      return res.set('Cache-Control','no-store').json({success:true,enabled:settings.enabled,price:settings.price,minimumAnswerWords:settings.minimumAnswerWords,turnaround:settings.turnaround});
    }catch(error){return sendError(res,error,'Private Chat price is temporarily unavailable.');}
  });

  app.get('/admin/private-chat/settings',async(req,res)=>{
    try{
      await requireAdmin(req);
      const settings=await readSettings();
      return res.set('Cache-Control','no-store').json({success:true,...settings});
    }catch(error){return sendError(res,error,'Unable to load Private Chat settings.');}
  });

  app.post('/admin/private-chat/settings',async(req,res)=>{
    try{
      const actor=await requireAdmin(req);
      const enabled=req.body?.enabled===true;
      const price=Number(req.body?.price);
      const minimumAnswerWords=Number(req.body?.minimumAnswerWords);
      const parsePercent=value=>value==null||String(value).trim()===''?null:Number(value);
      const astrologerCommissionPercent=parsePercent(req.body?.astrologerCommissionPercent);
      const adminCommissionPercent=parsePercent(req.body?.adminCommissionPercent);
      const assignmentMode=['direct_selected','open_to_all'].includes(req.body?.assignmentMode)?'direct_selected':'admin_assigned';
      const commissionProvided=astrologerCommissionPercent!==null||adminCommissionPercent!==null;
      const commissionConfigured=astrologerCommissionPercent!==null&&adminCommissionPercent!==null&&
        Number.isFinite(astrologerCommissionPercent)&&Number.isFinite(adminCommissionPercent)&&
        astrologerCommissionPercent>=0&&astrologerCommissionPercent<=100&&adminCommissionPercent>=0&&adminCommissionPercent<=100&&
        Math.abs(astrologerCommissionPercent*100-Math.round(astrologerCommissionPercent*100))<0.000001&&
        Math.abs(adminCommissionPercent*100-Math.round(adminCommissionPercent*100))<0.000001&&
        Math.abs(astrologerCommissionPercent+adminCommissionPercent-100)<0.000001;
      if(!Number.isFinite(price)||price<0||price>100000||Math.abs(price*100-Math.round(price*100))>0.000001)throw apiError('PRIVATE_CHAT_PRICE_INVALID','Enter a valid Private Chat price between ₹0 and ₹1,00,000.',400);
      if(enabled&&price<1)throw apiError('PRIVATE_CHAT_PRICE_REQUIRED','Set a Private Chat price of at least ₹1 before enabling the feature.',400);
      if(!Number.isInteger(minimumAnswerWords)||minimumAnswerWords<1||minimumAnswerWords>10000)throw apiError('PRIVATE_CHAT_WORD_LIMIT_INVALID','Set the Astrologer minimum answer limit between 1 and 10,000 words.',400);
      if(commissionProvided&&!commissionConfigured)throw apiError('PRIVATE_CHAT_COMMISSION_SPLIT_INVALID','Astrologer and Admin commission percentages must both be valid and total exactly 100%.',400);
      if(enabled&&!commissionConfigured)throw apiError('PRIVATE_CHAT_COMMISSION_REQUIRED','Set the separate Private Chat Astrologer and Admin commission percentages so they total 100% before enabling Private Chat.',400);
      const saved={
        enabled,price:Math.round(price*100)/100,minimumAnswerWords,
        astrologerCommissionPercent:commissionConfigured?astrologerCommissionPercent:null,
        adminCommissionPercent:commissionConfigured?adminCommissionPercent:null,
        assignmentMode,
        updatedAt:FirestoreFieldValue.serverTimestamp(),updatedBy:String(actor.uid||'')
      };
      await firestore.setDocument(SETTINGS_PATH,saved,{merge:true});
      return res.set('Cache-Control','no-store').json({success:true,enabled:enabled&&price>=1&&commissionConfigured,configuredEnabled:enabled,commissionConfigured,price:saved.price,minimumAnswerWords,astrologerCommissionPercent:saved.astrologerCommissionPercent,adminCommissionPercent:saved.adminCommissionPercent,assignmentMode,turnaround:'24–48 hours'});
    }catch(error){return sendError(res,error,'Unable to save Private Chat settings.');}
  });

  app.post('/private-chat/create-order',async(req,res)=>{
    try{
      const user=await authenticate(req,['customer']);
      const settings=await readSettings();
      if(!settings.enabled)throw apiError('PRIVATE_CHAT_DISABLED','Private Chat is not currently available. Please try again later.',409);
      const astrologerId=safeId(req.body?.astrologerId,160);
      const customerName=String(req.body?.customerName||'').trim();
      const birth=req.body?.birthDetails||{};
      const birthTime=String(birth.birthTime||'').trim();
      const birthPlace=String(birth.birthPlace||'').trim();
      const gender=String(birth.birthGender||'').trim();
      const questionText=String(req.body?.question||'').trim();
      const requestId=safeId(req.body?.requestId,100);
      if(!astrologerId||customerName.length<2||customerName.length>120||
         !validBirthDate(birth.birthDate,now)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(birthTime)||
         !birthPlace||birthPlace.length>200||!gender||!['Male','Female','Other'].includes(gender)||
         !questionText||questionText.length>10000||!requestId){
        throw apiError('PRIVATE_CHAT_FORM_INVALID','Complete your name, date/time/place of birth and question before continuing.',400);
      }
      const astrologerSnapshot=await firestore.getDocument('smv_astrologers/'+astrologerId);
      if(!astrologerSnapshot.exists||String(astrologerSnapshot.data?.status||'').toLowerCase()!=='approved'){
        throw apiError('PRIVATE_CHAT_ASTROLOGER_UNAVAILABLE','The selected Astrologer is not currently approved.',409);
      }
      const astrologer=astrologerSnapshot.data||{};
      if(!settings.commissionConfigured)throw apiError('PRIVATE_CHAT_COMMISSION_REQUIRED','Private Chat commission percentages are not configured. Ask Admin to set the separate Astrologer and Admin split to 100%.',409);
      const commissionPercent=Number(settings.astrologerCommissionPercent);
      const adminCommissionPercent=Number(settings.adminCommissionPercent);
      const answerMinWords=settings.minimumAnswerWords;
      const markerId=(String(user.uid).replace(/[^A-Za-z0-9_-]/g,'_')+'_'+requestId).slice(0,200);
      const markerPath='smv_private_chat_requests/'+markerId;
      let questionId='';
      let question={};
      for(let attempt=0;attempt<8;attempt++){
        const candidate=randomPublicId('smvqt-',cryptoImpl);
        try{
          const outcome=await firestore.runTransaction(async tx=>{
            const marker=await tx.getDocument(markerPath);
            if(marker.exists){
              const previousId=safeId(marker.data?.questionId);
              if(!previousId)throw apiError('PRIVATE_CHAT_REQUEST_CORRUPT','Your previous Private Chat request needs Admin review.',409);
              const previous=await tx.getDocument(QUESTION_COLLECTION+'/'+previousId);
              if(!previous.exists)throw apiError('PRIVATE_CHAT_REQUEST_CORRUPT','Your previous Private Chat request could not be recovered.',409);
              return {questionId:previousId,question:previous.data||{}};
            }
            const path=QUESTION_COLLECTION+'/'+candidate;
            const collision=await tx.getDocument(path);
            if(collision.exists)throw apiError('PRIVATE_CHAT_QUESTION_ID_COLLISION','Please retry the Private Chat submission.',409);
            const amount=settings.price;
            const amountPaise=rupeesToPaise(amount);
            if(amountPaise===null||amountPaise<100)throw apiError('PRIVATE_CHAT_AMOUNT_INVALID','The saved Private Chat price is invalid.',409);
            const astrologerCommissionPaise=Math.round(amountPaise*commissionPercent/100);
            const astroAmount=astrologerCommissionPaise/100;
            const adminAmount=(amountPaise-astrologerCommissionPaise)/100;
            const record={
              id:candidate,questionId:candidate,questionType:'private_chat',privateChat:true,
              customerId:user.uid,customerEmail:user.email||null,customerName,birthName:customerName,
              question:questionText,amount,originalAmount:amount,
              requestedAstrologerId:astrologerId,requestedAstrologerName:String(astrologer.name||'Astrologer'),
              astrologerId:'',astrologerName:'',assignmentMode:settings.assignmentMode,
              commissionPercent,commissionRate:commissionPercent,adminCommissionPercent,
              astrologerCommissionAmount:astroAmount,adminCommissionAmount:adminAmount,
              answerMinWords,birthDetails:{
                name:customerName,birthDate:String(birth.birthDate),birthTime,birthPlace,
                birthGender:gender,timezone:'Asia/Kolkata',utcOffsetMinutes:330
              },
              birthDate:String(birth.birthDate),birthTime,birthPlace,birthGender:gender,
              status:'awaiting_payment',paymentStatus:'pending',allocationStatus:'awaiting_payment',
              clientRequestId:requestId,createdAt:FirestoreFieldValue.serverTimestamp(),
              updatedAt:FirestoreFieldValue.serverTimestamp()
            };
            tx.create(path,record);
            tx.create(markerPath,{
              customerId:user.uid,questionId:candidate,createdAt:FirestoreFieldValue.serverTimestamp()
            });
            return {questionId:candidate,question:record};
          });
          questionId=outcome.questionId;question=outcome.question;break;
        }catch(error){
          if(error?.code==='PRIVATE_CHAT_QUESTION_ID_COLLISION')continue;
          throw error;
        }
      }
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_UNAVAILABLE','A secure Question ID could not be created. Please retry.',503);
      // Reload the canonical question after an idempotent request-marker hit so
      // an interrupted first response reuses its existing Razorpay order.
      const canonicalQuestion=await firestore.getDocument(QUESTION_COLLECTION+'/'+questionId);
      if(!canonicalQuestion.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found after creation.',404);
      question=canonicalQuestion.data||question;
      const result=await createOrReuseOrder(questionId,question,user);
      return res.set('Cache-Control','no-store').json(result);
    }catch(error){return sendError(res,error,'Unable to create the Private Chat payment.');}
  });

  app.post('/private-chat/retry-payment',async(req,res)=>{
    try{
      const user=await authenticate(req,['customer']);
      const questionId=safeId(req.body?.questionId);
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_REQUIRED','Question ID is required.',400);
      const question=await loadOwnedPrivateQuestion(questionId,user.uid);
      if(question.refundId||['question_rejected','admin_rejected'].includes(String(question.status||''))){
        throw apiError('PRIVATE_CHAT_CLOSED','This Private Chat request has been rejected or refunded.',409);
      }
      return res.set('Cache-Control','no-store').json(await createOrReuseOrder(questionId,question,user));
    }catch(error){return sendError(res,error,'Unable to retry Private Chat payment.');}
  });

  app.post('/private-chat/verify-payment',async(req,res)=>{
    try{
      const user=await authenticate(req,['customer']);
      const questionId=safeId(req.body?.questionId);
      const orderId=safeId(req.body?.razorpay_order_id);
      const paymentId=safeId(req.body?.razorpay_payment_id);
      const signature=String(req.body?.razorpay_signature||'').trim();
      if(!questionId||!orderId||!paymentId||!signature)throw apiError('PRIVATE_CHAT_PAYMENT_DATA_REQUIRED','Payment verification data is incomplete.',400);
      const question=await loadOwnedPrivateQuestion(questionId,user.uid);
      if(String(question.razorpayOrderId||'')!==orderId)throw apiError('RAZORPAY_ORDER_MISMATCH','Payment order does not match this Private Chat question.',409);
      if(!await razorpay.verifyPaymentSignature({orderId,paymentId,signature})){
        throw apiError('RAZORPAY_SIGNATURE_INVALID','Razorpay payment signature could not be verified.',401);
      }
      const amountPaise=rupeesToPaise(question.amount);
      if(amountPaise===null)throw apiError('PRIVATE_CHAT_AMOUNT_INVALID','Saved Private Chat price is invalid.',409);
      await paymentDetails(paymentId,orderId,amountPaise);
      const recorded=await recordQuestionPayment({
        questionId,orderId,paymentId,signature,source:'private_chat_checkout_verification'
      });
      await firestore.setDocument(ORDER_COLLECTION+'/'+orderId,{
        razorpayPaymentId:paymentId,status:'verified',questionId,questionType:'private_chat',
        verifiedAt:FirestoreFieldValue.serverTimestamp()
      },{merge:true});
      return res.set('Cache-Control','no-store').json({
        success:true,verified:true,questionId,
        customerPaymentId:recorded.customerPaymentId||null,
        paymentId:recorded.customerPaymentId||null,
        razorpayPaymentId:paymentId,alreadyProcessed:recorded.already===true,
        status:recorded.status||'private_chat_assigned',
        amount:recorded.amount||Number(question.amount||0)
      });
    }catch(error){return sendError(res,error,'Private Chat payment verification failed.');}
  });

  app.get('/customer/private-chat/questions',async(req,res)=>{
    try{
      const user=await authenticate(req,['customer']);
      const documents=await firestore.runQuery({
        collectionPath:QUESTION_COLLECTION,
        filters:[{field:'customerId',op:'==',value:user.uid}],
        limit:1000
      });
      const questions=documents
        .filter(document=>document.data?.privateChat===true&&String(document.data?.questionType||'')==='private_chat')
        .map(document=>{
          const selected=selectFields(document.data,CUSTOMER_FIELDS);
          if(String(document.data?.status||'')!=='answered')delete selected.answer;
          return {id:document.id,...selected};
        })
        .sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,100);
      return res.set('Cache-Control','no-store').json({success:true,questions});
    }catch(error){return sendError(res,error,'Unable to load your Private Chat questions.');}
  });

  app.get('/astrologer/private-chat/questions',async(req,res)=>{
    try{
      const user=await authenticate(req,['astrologer']);
      const astro=await firestore.getDocument('smv_astrologers/'+String(user.uid||''));
      if(!astro.exists||String(astro.data?.status||'').toLowerCase()!=='approved'){
        throw apiError('ASTROLOGER_NOT_APPROVED','Your Astrologer profile is not approved.',403);
      }
      const settings=await readSettings();
      const documents=await firestore.runQuery({collectionPath:QUESTION_COLLECTION,limit:1000});
      const questions=documents
        .filter(document=>{
          const q=document.data||{};
          if(q.privateChat!==true||String(q.questionType||'')!=='private_chat'||q.paymentStatus!=='paid')return false;
          return String(q.astrologerId||'')===String(user.uid)||
            (settings.assignmentMode==='open_to_all'&&String(q.status||'')==='private_chat_available_to_astrologers'&&!q.astrologerId);
        })
        .map(document=>{
          const q=selectFields(document.data,ASTROLOGER_FIELDS);
          return {id:document.id,...q,canClaim:settings.assignmentMode==='open_to_all'&&String(q.status||'')==='private_chat_available_to_astrologers'&&!q.astrologerId};
        })
        .sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,100);
      return res.set('Cache-Control','no-store').json({success:true,assignmentMode:settings.assignmentMode,questions});
    }catch(error){return sendError(res,error,'Unable to load assigned Private Chat questions.');}
  });

  app.post('/admin/private-chat/approve-question',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId),astrologerId=safeId(req.body?.astrologerId,160);
      if(!questionId||!astrologerId)throw apiError('PRIVATE_CHAT_ASSIGNMENT_REQUIRED','Select the question and an approved Astrologer.',400);
      const astroSnapshot=await firestore.getDocument('smv_astrologers/'+astrologerId);
      if(!astroSnapshot.exists||String(astroSnapshot.data?.status||'').toLowerCase()!=='approved')throw apiError('PRIVATE_CHAT_ASTROLOGER_UNAVAILABLE','The selected Astrologer is not approved.',409);
      const astroName=String(astroSnapshot.data?.name||'Astrologer');
      const saved=await firestore.runTransaction(async tx=>{
        const snapshot=await tx.getDocument(QUESTION_COLLECTION+'/'+questionId);
        if(!snapshot.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        const q=snapshot.data||{};
        if(q.privateChat!==true||String(q.questionType||'')!=='private_chat'||String(q.paymentStatus||'')!=='paid')throw apiError('PRIVATE_CHAT_NOT_PAID','Only a paid Private Chat question can be allocated.',409);
        if(q.refundId||['question_rejected','admin_rejected'].includes(String(q.status||'')))throw apiError('PRIVATE_CHAT_CLOSED','Refunded or rejected questions cannot be allocated.',409);
        if(String(q.status||'')!=='private_chat_pending_admin'||String(q.astrologerId||''))throw apiError('PRIVATE_CHAT_NOT_AWAITING_ADMIN','This question is no longer waiting for Admin allocation.',409);
        const timestamp=FirestoreFieldValue.serverTimestamp();
        tx.update(QUESTION_COLLECTION+'/'+questionId,{
          astrologerId,astrologerName:astroName,status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',
          assignmentMode:'admin_assigned',adminQuestionApprovedAt:timestamp,adminQuestionApprovedBy:String(actor.uid||''),
          commissionStatus:'allocated_pending_answer',updatedAt:timestamp
        });
        return {customerId:String(q.customerId||'')};
      });
      await firestore.setDocument('smv_notifications/private_chat_assigned_'+questionId,{
        userId:astrologerId,type:'private_chat_assigned',title:'New Paid Private Chat Question',
        message:'Admin assigned a paid Private Chat question to you. Submit your answer within 24–48 hours.',
        questionId,createdAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      if(saved.customerId)await firestore.setDocument('smv_notifications/'+saved.customerId+'_private_chat_allocated_'+questionId,{
        userId:saved.customerId,type:'private_chat_allocated',title:'Private Chat Astrologer Assigned',
        message:astroName+' has been assigned to your Private Chat question. Answer expected within 24–48 hours.',
        questionId,astrologerId,astrologerName:astroName,createdAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      return res.set('Cache-Control','no-store').json({success:true,questionId,astrologerId,astrologerName:astroName,status:'private_chat_assigned'});
    }catch(error){return sendError(res,error,'Unable to approve and allocate the Private Chat question.');}
  });

  app.post('/astrologer/private-chat/claim',async(req,res)=>{
    try{
      const user=await authenticate(req,['astrologer']),questionId=safeId(req.body?.questionId);
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_REQUIRED','Question ID is required.',400);
      const [astroSnapshot,settings]=await Promise.all([firestore.getDocument('smv_astrologers/'+String(user.uid||'')),readSettings()]);
      if(!astroSnapshot.exists||String(astroSnapshot.data?.status||'').toLowerCase()!=='approved')throw apiError('ASTROLOGER_NOT_APPROVED','Your Astrologer profile is not approved.',403);
      if(settings.assignmentMode!=='open_to_all')throw apiError('PRIVATE_CHAT_CLAIM_DISABLED','Admin currently assigns Private Chat questions to a specified Astrologer.',409);
      const astroName=String(astroSnapshot.data?.name||'Astrologer');
      const saved=await firestore.runTransaction(async tx=>{
        const snapshot=await tx.getDocument(QUESTION_COLLECTION+'/'+questionId);
        if(!snapshot.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        const q=snapshot.data||{};
        if(q.privateChat!==true||String(q.questionType||'')!=='private_chat'||String(q.paymentStatus||'')!=='paid')throw apiError('PRIVATE_CHAT_NOT_PAID','Only a paid Private Chat question can be claimed.',409);
        if(String(q.status||'')!=='private_chat_available_to_astrologers'||String(q.astrologerId||''))throw apiError('PRIVATE_CHAT_ALREADY_CLAIMED','Another Astrologer has already claimed this question or Admin has allocated it.',409);
        tx.update(QUESTION_COLLECTION+'/'+questionId,{
          astrologerId:String(user.uid),astrologerName:astroName,status:'private_chat_assigned',allocationStatus:'assigned_to_astrologer',
          claimedAt:FirestoreFieldValue.serverTimestamp(),commissionStatus:'allocated_pending_answer',updatedAt:FirestoreFieldValue.serverTimestamp()
        });
        return {customerId:String(q.customerId||'')};
      });
      if(saved.customerId)await firestore.setDocument('smv_notifications/'+saved.customerId+'_private_chat_allocated_'+questionId,{
        userId:saved.customerId,type:'private_chat_allocated',title:'Private Chat Astrologer Assigned',
        message:astroName+' has claimed your Private Chat question. Answer expected within 24–48 hours.',
        questionId,astrologerId:String(user.uid),astrologerName:astroName,createdAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      return res.set('Cache-Control','no-store').json({success:true,questionId,astrologerId:String(user.uid),astrologerName:astroName,status:'private_chat_assigned'});
    }catch(error){return sendError(res,error,'Unable to claim the Private Chat question.');}
  });

  app.post('/admin/private-chat/approve-answer',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId);
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_REQUIRED','Question ID is required.',400);
      const saved=await firestore.runTransaction(async tx=>{
        const snapshot=await tx.getDocument(QUESTION_COLLECTION+'/'+questionId);
        if(!snapshot.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        const q=snapshot.data||{};
        if(q.privateChat!==true||String(q.questionType||'')!=='private_chat')throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        if(String(q.paymentStatus||'')!=='paid'||String(q.status||'')!=='processing'||!String(q.answer||'').trim())throw apiError('PRIVATE_CHAT_ANSWER_NOT_PENDING','Only a submitted Astrologer answer can be approved.',409);
        const timestamp=FirestoreFieldValue.serverTimestamp();
        tx.update(QUESTION_COLLECTION+'/'+questionId,{
          status:'answered',astrologerAnswerStatus:'approved',answerAvailableAt:timestamp,answerApprovedAt:timestamp,
          adminAnswerApprovedAt:timestamp,answerApprovedBy:String(actor.uid||''),commissionStatus:'pending_customer_view',
          commissionCreditedAt:FirestoreFieldValue.delete(),updatedAt:timestamp
        });
        return {customerId:String(q.customerId||''),astrologerId:String(q.astrologerId||''),astrologerName:String(q.astrologerName||'Astrologer')};
      });
      if(saved.customerId)await firestore.setDocument('smv_notifications/'+saved.customerId+'_answer_submitted_'+questionId,{
        userId:saved.customerId,type:'answer_ready',title:'Private Chat Answer Ready',
        message:saved.astrologerName+' has answered your Private Chat question. The answer is available in Customer Dashboard.',
        questionId,astrologerId:saved.astrologerId,astrologerName:saved.astrologerName,createdAt:FirestoreFieldValue.serverTimestamp(),updatedAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      if(saved.astrologerId)await firestore.setDocument('smv_notifications/astro_private_chat_answer_approved_'+questionId,{
        userId:saved.astrologerId,type:'answer_approved',title:'Private Chat Answer Approved',
        message:'Admin approved your answer. Your commission will be credited after the Customer opens it.',
        questionId,createdAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      return res.set('Cache-Control','no-store').json({success:true,questionId,status:'answered'});
    }catch(error){return sendError(res,error,'Unable to approve the Astrologer answer.');}
  });

  app.post('/admin/private-chat/reject-answer',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId),reason=String(req.body?.reason||'').trim().slice(0,1000);
      if(!questionId||!reason)throw apiError('PRIVATE_CHAT_REJECTION_REASON_REQUIRED','Question ID and rejection reason are required.',400);
      const saved=await firestore.runTransaction(async tx=>{
        const snapshot=await tx.getDocument(QUESTION_COLLECTION+'/'+questionId);
        if(!snapshot.exists)throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        const q=snapshot.data||{};
        if(q.privateChat!==true||String(q.questionType||'')!=='private_chat')throw apiError('PRIVATE_CHAT_NOT_FOUND','Private Chat question was not found.',404);
        if(String(q.status||'')!=='processing'||!String(q.answer||'').trim())throw apiError('PRIVATE_CHAT_ANSWER_NOT_PENDING','Only an answer awaiting Admin approval can be rejected.',409);
        const timestamp=FirestoreFieldValue.serverTimestamp();
        tx.update(QUESTION_COLLECTION+'/'+questionId,{
          answer:FirestoreFieldValue.delete(),answerWordCount:0,answerSubmittedAt:FirestoreFieldValue.delete(),
          answerAvailableAt:FirestoreFieldValue.delete(),answerApprovedAt:FirestoreFieldValue.delete(),
          astrologerAnswerStatus:'revision_required',answerRejectionReason:reason,status:'private_chat_assigned',
          commissionStatus:'allocated_pending_answer',commissionCreditedAt:FirestoreFieldValue.delete(),updatedAt:timestamp,
          lastAnswerRejectedAt:timestamp,lastAnswerRejectedBy:String(actor.uid||'')
        });
        return {astrologerId:String(q.astrologerId||'')};
      });
      if(saved.astrologerId)await firestore.setDocument('smv_notifications/astro_private_chat_answer_rejected_'+questionId+'_'+String(Date.now()),{
        userId:saved.astrologerId,type:'answer_revision_required',title:'Private Chat Answer Needs Revision',
        message:'Admin requested a revision: '+reason,questionId,createdAt:FirestoreFieldValue.serverTimestamp(),read:false
      },{merge:true}).catch(()=>{});
      return res.set('Cache-Control','no-store').json({success:true,questionId,status:'private_chat_assigned',reason});
    }catch(error){return sendError(res,error,'Unable to reject the Astrologer answer.');}
  });

  app.post('/admin/private-chat/reject-question',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId),reason=String(req.body?.reason||'').trim().slice(0,1000);
      if(!questionId||!reason)throw apiError('PRIVATE_CHAT_REJECTION_REASON_REQUIRED','Question ID and refund reason are required.',400);
      const result=await refundPrivateChatQuestion({questionId,reason,actorUid:String(actor.uid||''),retry:false});
      return res.set('Cache-Control','no-store').json({success:true,...result});
    }catch(error){return sendError(res,error,'Unable to reject the question and request its refund.');}
  });

  app.post('/admin/private-chat/retry-refund',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId);
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_REQUIRED','Question ID is required.',400);
      const result=await refundPrivateChatQuestion({questionId,actorUid:String(actor.uid||''),retry:true});
      return res.set('Cache-Control','no-store').json({success:true,...result});
    }catch(error){return sendError(res,error,'Unable to retry the Private Chat refund.');}
  });

  app.post('/admin/private-chat/sync-refund',async(req,res)=>{
    try{
      const actor=await requireAdmin(req),questionId=safeId(req.body?.questionId);
      if(!questionId)throw apiError('PRIVATE_CHAT_ID_REQUIRED','Question ID is required.',400);
      const result=await refundPrivateChatQuestion({questionId,actorUid:String(actor.uid||''),sync:true});
      return res.set('Cache-Control','no-store').json({success:true,...result});
    }catch(error){return sendError(res,error,'Unable to sync the Private Chat refund.');}
  });

  app.get('/admin/private-chat/questions',async(req,res)=>{
    try{
      await requireAdmin(req);
      const [documents,astrologers,settings]=await Promise.all([
        firestore.runQuery({collectionPath:QUESTION_COLLECTION,limit:1000}),
        firestore.runQuery({collectionPath:'smv_astrologers',filters:[{field:'status',op:'==',value:'approved'}],limit:1000}),
        readSettings()
      ]);
      const questions=documents
        .filter(document=>document.data?.privateChat===true&&String(document.data?.questionType||'')==='private_chat')
        .map(document=>({id:document.id,...selectFields(document.data,ADMIN_FIELDS)}))
        .sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,200);
      return res.set('Cache-Control','no-store').json({
        success:true,questions,assignmentMode:settings.assignmentMode,
        astrologers:astrologers.map(item=>({id:item.id,name:String(item.data?.name||'Astrologer')}))
      });
    }catch(error){return sendError(res,error,'Unable to load the Private Chat Admin queue.');}
  });

  return Object.freeze({paths:Object.freeze([
    'GET /private-chat/settings','GET /admin/private-chat/settings','POST /admin/private-chat/settings',
    'POST /private-chat/create-order','POST /private-chat/retry-payment','POST /private-chat/verify-payment',
    'GET /customer/private-chat/questions','GET /astrologer/private-chat/questions','GET /admin/private-chat/questions',
    'POST /admin/private-chat/approve-question','POST /astrologer/private-chat/claim',
    'POST /admin/private-chat/approve-answer','POST /admin/private-chat/reject-answer',
    'POST /admin/private-chat/reject-question','POST /admin/private-chat/retry-refund','POST /admin/private-chat/sync-refund'
  ])});
}
