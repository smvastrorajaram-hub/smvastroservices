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
  paymentDetails,recordQuestionPayment,cryptoImpl=globalThis.crypto,now=Date.now
}={}){
  if(!app||typeof app.get!=='function'||typeof app.post!=='function'||
     typeof firestore?.getDocument!=='function'||typeof firestore?.setDocument!=='function'||
     typeof firestore?.runQuery!=='function'||typeof firestore?.runTransaction!=='function'||
     !identityService||typeof identityService.authenticateAuthorization!=='function'||
     !razorpay||typeof razorpay.createOrder!=='function'||typeof razorpay.fetchOrder!=='function'||
     typeof razorpay.verifyPaymentSignature!=='function'||
     typeof paymentDetails!=='function'||typeof recordQuestionPayment!=='function'){
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
    const snapshot=await firestore.getDocument(SETTINGS_PATH);
    const data=snapshot.exists?(snapshot.data||{}):{};
    const price=Number(data.price||0);
    return {
      enabled:data.enabled===true&&Number.isFinite(price)&&price>=1,
      price:Number.isFinite(price)&&price>=0?Math.round(price*100)/100:0,
      turnaround:'24–48 hours'
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
      notes:{questionId,customerId:user.uid,astrologerId:String(question.astrologerId||''),serviceName:'Private Chat'}
    });
    await firestore.setDocument(QUESTION_COLLECTION+'/'+questionId,{
      razorpayOrderId:order.id,paymentCurrency:CURRENCY,paymentStatus:'order_created',
      paymentUpdatedAt:FirestoreFieldValue.serverTimestamp(),updatedAt:FirestoreFieldValue.serverTimestamp()
    },{merge:true});
    await firestore.setDocument(ORDER_COLLECTION+'/'+order.id,{
      razorpayOrderId:order.id,questionId,questionType:'private_chat',privateChat:true,
      amount:order.amount,currency:order.currency,firebaseUid:user.uid,
      customerEmail:user.email||null,astrologerId:String(question.astrologerId||''),
      serviceName:'SMV ASTRO Private Chat',status:'created',createdAt:FirestoreFieldValue.serverTimestamp()
    },{merge:true});
    return {
      success:true,questionId,orderId:order.id,keyId:String(razorpayKeyId||''),
      amount:order.amount,currency:order.currency,originalAmount:Number(question.amount||0)
    };
  }

  app.get('/private-chat/settings',async(_req,res)=>{
    try{return res.set('Cache-Control','no-store').json({success:true,...await readSettings()});}
    catch(error){return sendError(res,error,'Private Chat price is temporarily unavailable.');}
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
      if(!Number.isFinite(price)||price<0||price>100000||Math.abs(price*100-Math.round(price*100))>0.000001){
        throw apiError('PRIVATE_CHAT_PRICE_INVALID','Enter a valid Private Chat price between ₹0 and ₹1,00,000.',400);
      }
      if(enabled&&price<1)throw apiError('PRIVATE_CHAT_PRICE_REQUIRED','Set a Private Chat price of at least ₹1 before enabling the feature.',400);
      const saved={
        enabled,price:Math.round(price*100)/100,
        updatedAt:FirestoreFieldValue.serverTimestamp(),updatedBy:String(actor.uid||'')
      };
      await firestore.setDocument(SETTINGS_PATH,saved,{merge:true});
      return res.set('Cache-Control','no-store').json({success:true,enabled,price:saved.price,turnaround:'24–48 hours'});
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
         !birthPlace||birthPlace.length>200||!questionText||questionText.length>10000||
         !requestId||!['','Male','Female','Other'].includes(gender)){
        throw apiError('PRIVATE_CHAT_FORM_INVALID','Complete your name, date/time/place of birth and question before continuing.',400);
      }
      const astrologerSnapshot=await firestore.getDocument('smv_astrologers/'+astrologerId);
      if(!astrologerSnapshot.exists||String(astrologerSnapshot.data?.status||'').toLowerCase()!=='approved'){
        throw apiError('PRIVATE_CHAT_ASTROLOGER_UNAVAILABLE','The selected Astrologer is not currently approved.',409);
      }
      const astrologer=astrologerSnapshot.data||{};
      const commissionSnapshot=await firestore.getDocument('smv_settings/commission').catch(()=>({exists:false,data:null}));
      const configuredRate=Number(commissionSnapshot.data?.astroPercent??20);
      const commissionPercent=Number.isFinite(configuredRate)&&configuredRate>=0&&configuredRate<=100?configuredRate:20;
      const answerSettings=await firestore.getDocument('smv_settings/answer').catch(()=>({exists:false,data:null}));
      const answerMinWords=Math.max(1,Math.min(10000,Math.floor(Number(answerSettings.data?.minimumWords||150))));
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
            const astroAmount=Math.round(amount*commissionPercent)/100;
            const record={
              id:candidate,questionId:candidate,questionType:'private_chat',privateChat:true,
              customerId:user.uid,customerEmail:user.email||null,customerName,birthName:customerName,
              question:questionText,amount,originalAmount:amount,
              astrologerId,astrologerName:String(astrologer.name||'Astrologer'),
              commissionPercent,commissionRate:commissionPercent,
              astrologerCommissionAmount:astroAmount,adminCommissionAmount:Math.round((amount-astroAmount)*100)/100,
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
      const questions=documents.map(document=>({id:document.id,...(document.data||{})}))
        .filter(question=>question.privateChat===true&&String(question.questionType||'')==='private_chat')
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
      const documents=await firestore.runQuery({
        collectionPath:QUESTION_COLLECTION,
        filters:[{field:'astrologerId',op:'==',value:user.uid}],
        limit:1000
      });
      const questions=documents.map(document=>({id:document.id,...(document.data||{})}))
        .filter(question=>question.privateChat===true&&String(question.questionType||'')==='private_chat'&&question.paymentStatus==='paid')
        .sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,100);
      return res.set('Cache-Control','no-store').json({success:true,questions});
    }catch(error){return sendError(res,error,'Unable to load assigned Private Chat questions.');}
  });

  app.get('/admin/private-chat/questions',async(req,res)=>{
    try{
      await requireAdmin(req);
      const documents=await firestore.runQuery({collectionPath:QUESTION_COLLECTION,limit:1000});
      const questions=documents.map(document=>({id:document.id,...(document.data||{})}))
        .filter(question=>question.privateChat===true&&String(question.questionType||'')==='private_chat')
        .sort((a,b)=>millis(b.createdAt)-millis(a.createdAt)).slice(0,200);
      return res.set('Cache-Control','no-store').json({success:true,questions});
    }catch(error){return sendError(res,error,'Unable to load the Private Chat Admin queue.');}
  });

  return Object.freeze({paths:Object.freeze([
    'GET /private-chat/settings','GET /admin/private-chat/settings','POST /admin/private-chat/settings',
    'POST /private-chat/create-order','POST /private-chat/retry-payment','POST /private-chat/verify-payment',
    'GET /customer/private-chat/questions','GET /astrologer/private-chat/questions','GET /admin/private-chat/questions'
  ])});
}
