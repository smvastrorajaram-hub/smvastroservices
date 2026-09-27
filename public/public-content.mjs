
(function(){
  const BACKEND="https://smv-astro-1fco.onrender.com";
  const FBCONFIG={apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:"smv-astro.firebaseapp.com",projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
  let db=null,auth=null;
  const show=id=>document.getElementById(id)?.classList.remove('hidden');
  const closeModal=()=>document.getElementById('modal')?.classList.add('hidden');
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let fbApi=null;
  function withTimeout(promise,ms=15000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Firebase did not respond within 15 seconds.')),ms))]);}
  async function fb(){
    if(db&&auth&&fbApi) return fbApi;
    const {getApps,initializeApp}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const fs=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const {getFirestore}=fs;
    const {getAuth,setPersistence,browserSessionPersistence}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const app=getApps().length?getApps()[0]:initializeApp(FBCONFIG);
    db=getFirestore(app);
    auth=getAuth(app);await setPersistence(auth,browserSessionPersistence);
    fbApi={
      collection:fs.collection,getDocs:fs.getDocs,query:fs.query,where:fs.where,orderBy:fs.orderBy,limit:fs.limit,
      doc:fs.doc,getDoc:fs.getDoc,addDoc:fs.addDoc,updateDoc:fs.updateDoc,deleteDoc:fs.deleteDoc,
      setDoc:fs.setDoc,serverTimestamp:fs.serverTimestamp
    };
    return fbApi;
  }
  async function loadQuestionPrice(){try{const f=await fb();const snap=await f.getDoc(f.doc(db,'smv_settings','question'));if(!snap.exists())throw new Error('Question price is not configured.');const price=Number(snap.data()?.price);if(!Number.isFinite(price)||price<1)throw new Error('Invalid question price.');if($('publicQuestionPrice'))$('publicQuestionPrice').textContent='₹'+price.toFixed(2);}catch(e){console.warn('Public question price unavailable:',e);if($('publicQuestionPrice'))$('publicQuestionPrice').textContent='Price unavailable';}}
  function showPublicProfileModal(html){
    const modalEl=document.getElementById('modal');
    const contentEl=document.getElementById('modalContent');
    if(!modalEl||!contentEl) throw new Error('Profile dialog is unavailable.');
    contentEl.innerHTML=html;
    modalEl.classList.add('profile-modal-active');
    modalEl.classList.remove('hidden');
    return modalEl;
  }
  async function openPublicAstrologerProfile(a){
    const name=a?.name||'Astrologer';
    try{
      /* Build the profile from the already-loaded astrologer card first.
         Do NOT wait for Firebase before opening the profile. */
      const stars=n=>'★'.repeat(Math.max(0,Math.min(5,Number(n||0))))+'☆'.repeat(5-Math.max(0,Math.min(5,Number(n||0))));
      const photo=a?.photoData||a?.photoURL||a?.photoUrl||'';
      showPublicProfileModal(`<div class="profile-dialog">${photo?`<img class="profile-photo" src="${esc(photo)}" alt="${esc(name)}">`:''}<h2 class="profile-title">${esc(name)}</h2><p class="profile-expertise">${esc(a?.expertise||a?.specialization||'Astrology')}</p><p class="profile-experience">⭐ ${esc(a?.experience||'Experienced')} years experience</p><p class="profile-bio">${esc(a?.profileDescription||a?.bio||a?.about||'Professional astrologer')}</p><h3 class="profile-reviews-title">Verified Reviews</h3><div id="publicProfileReviews"><div class="empty">Loading reviews...</div></div><button class="btn gray" id="profileCloseBtn">CLOSE</button></div>`);
      $('profileCloseBtn').onclick=closeModal;

      const reviews=await window.__smvGetPublicReviewsOnce(a);
      const reviewBox=$('publicProfileReviews');
      if(!reviewBox)return;
      reviewBox.innerHTML=reviews.length?reviews.map(r=>`<div class="card" style="margin:10px 0"><div class="stars">${stars(r.rating)}</div><p style="white-space:pre-wrap">“${esc(r.review||'Verified customer review')}”</p><p class="small">Verified customer</p></div>`).join(''):'<div class="empty">No approved reviews for this astrologer yet.</div>';
    }catch(e){
      console.error('Public astrologer profile open failed:',e);
      const m=document.getElementById('modal'),c=document.getElementById('modalContent');
      if(m&&c){c.innerHTML=`<h2>${esc(name)}</h2><div class="empty error">Unable to load this astrologer profile right now.</div><button class="btn gray" id="profileRetryBtn">TRY AGAIN</button><button class="btn gray" id="profileCloseBtn">CLOSE</button>`;m.classList.remove('hidden');document.getElementById('profileRetryBtn')?.addEventListener('click',()=>{m.classList.add('hidden');openPublicAstrologerProfile(a);},{once:true});document.getElementById('profileCloseBtn')?.addEventListener('click',closeModal,{once:true});}
    }
  }
  window.__smvOpenPublicAstrologerProfile=openPublicAstrologerProfile;
  async function loadReviews(){
    const box=$('publicReviews');if(!box)return;
    try{
      const f=await fb();
      const snap=await f.getDocs(f.query(f.collection(db,'smv_reviews'),f.where('approved','==',true),f.limit(12)));
      if(snap.empty){box.innerHTML='<div class="empty">No public reviews yet. Be the first verified customer to share your experience.</div>';return;}
      const reviews=await Promise.all(snap.docs.map(async d=>{
        const r=d.data();
        let astro={}; let customer={};
        try{if(r.astrologerId){const a=await f.getDoc(f.doc(db,'smv_astrologers',r.astrologerId));if(a.exists())astro=a.data()||{};}}catch(e){console.warn('Astrologer profile lookup failed',e);}
        try{if(r.customerId){const c=await f.getDoc(f.doc(db,'smv_users',r.customerId));if(c.exists())customer=c.data()||{};}}catch(e){console.warn('Customer profile lookup failed',e);}
        const stars='★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))))+'☆'.repeat(5-Math.max(0,Math.min(5,Number(r.rating||0))));
        const astroName=astro.name||r.astrologerName||'SMV ASTRO Astrologer';
        const astroPhoto=astro.photoData||astro.photoURL||astro.photoUrl||'';
        const customerName=customer.name||customer.displayName||r.customerName||'Verified Customer';
        const photo=astroPhoto?`<img src="${esc(astroPhoto)}" alt="${esc(astroName)}" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);">`:`<div style="width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#f7df9b;color:#7b1e1e;font-weight:800;font-size:22px;border:2px solid var(--gold);">${esc(String(astroName).charAt(0).toUpperCase())}</div>`;
        return `<div class="card review-card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${photo}<div><div style="font-weight:800;font-size:18px">${esc(astroName)}</div><div class="small">Astrologer</div></div></div><div class="stars">${stars}</div><p style="white-space:pre-wrap">“${esc(r.review||'Verified customer review')}”</p><p class="small"><b>Customer: ${esc(customerName)}</b></p></div>`;
      }));
      box.innerHTML=reviews.join('');
    }catch(e){console.error('Public reviews load failed',e);box.innerHTML='<div class="empty">Reviews are temporarily unavailable.</div>';}
  }
  async function authHeaders(){await fb();const u=auth?.currentUser;if(!u)throw new Error('Please login as Admin to use this feature.');return {Authorization:'Bearer '+await u.getIdToken()};}
  // Admin question actions are owned by admin-workflows.mjs.
  async function loadAdminAppointments(){
    const box=$('adminAppointments'); if(!box||adminAppointmentsLoading)return;
    adminAppointmentsLoading=true; box.innerHTML='<div class="empty">Loading appointment requests...</div>';
    try{
      await fb(); const u=auth?.currentUser; if(!u)throw new Error('Please login as Admin.');
      const token=await u.getIdToken();
      const r=await withTimeout(fetch(BACKEND+'/admin/appointments',{headers:{Authorization:'Bearer '+token},cache:'no-store'}),12000);
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||`Appointment service returned HTTP ${r.status}.`);
      const items=Array.isArray(d.appointments)?d.appointments:[];
      if(!items.length){box.innerHTML='<div class="empty">No appointment requests.</div>';return;}
      box.innerHTML=items.map(a=>{const current=String(a.status||'new').toLowerCase();return `<div style="padding:14px 0;border-bottom:1px solid #eee"><b>${esc(a.name||'Customer')}</b> · <b>${esc(a.type||'Consultation')}</b><div class="small">${esc(a.email||'')} · ${esc(a.mobile||'')}</div><div class="small">Preferred: <b>${esc(a.preferredDate||'-')}</b> ${esc(a.preferredTime||'')}</div><div class="small">${esc(a.notes||'No notes')}</div><div class="small" style="margin-top:6px">Status: <b>${esc(current.toUpperCase())}</b></div><div class="action-row">${['new','confirmed','completed','cancelled'].map(st=>`<button type="button" class="btn ${st==='cancelled'?'gray':''}" data-apstatus="${esc(a.id)}" data-status="${st}" ${st===current?'disabled style="opacity:.65;cursor:default"':''}>${st===current?'✓ ':''}${st.toUpperCase()}</button>`).join('')}</div></div>`;}).join('');
      box.querySelectorAll('[data-apstatus]').forEach(b=>b.onclick=()=>updateAppointment(b.dataset.apstatus,b.dataset.status,b));
    }catch(e){console.error('ADMIN APPOINTMENT ERROR:',e);box.innerHTML='<div class="empty error">Appointment loading failed: '+esc(e?.message||String(e))+'</div>';}finally{adminAppointmentsLoading=false;}
  }
  let appointmentUpdating=false;
  async function updateAppointment(id,status,button){
    if(appointmentUpdating)return; appointmentUpdating=true;
    const buttons=[...document.querySelectorAll('[data-apstatus]')]; buttons.forEach(x=>x.disabled=true);
    try{await fb();const u=auth?.currentUser;if(!u)throw new Error('Please login as Admin.');const token=await u.getIdToken();const r=await fetch(BACKEND+'/admin/appointment-status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id,status}),cache:'no-store'});const d=await r.json().catch(()=>({}));window.__smvRecordTiming?.(path,performance.now()-started,r.ok);if(!r.ok)throw new Error(d.error||`Appointment update returned HTTP ${r.status}.`);await loadAdminAppointments();}catch(e){console.error('Appointment update error:',e);alert(e?.message||String(e));buttons.forEach(x=>x.disabled=false);}finally{appointmentUpdating=false;}
  }

  window.__smvSetupLanguage=()=>{document.documentElement.lang='en';};
  window.__smvNotifyQuestionUpdate=async function(questionId,event,reason){
    try{
      const u=auth?.currentUser;
      if(!u||!questionId)return;
      const token=await u.getIdToken();
      const r=await fetch(BACKEND+'/question-notify',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({questionId,event,reason:reason||''})});
      if(!r.ok){const d=await r.json().catch(()=>({}));console.warn('Question email notification failed:',d.error||r.status);}
    }catch(e){console.warn('Question email notification failed:',e);}
  }
  let bookingSubmitting=false;
  function setupBooking(){
    document.querySelectorAll('[data-open-booking]').forEach(b=>b.onclick=()=>{show("appointment");if($('apType'))$('apType').value=b.dataset.openBooking;location.hash='appointment';$('apName')?.focus();});
    const f=$('appointmentForm');if(!f)return;
    if(f.dataset.smvBookingBound==='1')return;
    f.dataset.smvBookingBound='1';
    f.addEventListener('submit',async e=>{
      e.preventDefault();
      if(bookingSubmitting)return;
      const btn=$('appointmentSubmit'),msg=$('appointmentMsg');
      bookingSubmitting=true;btn.disabled=true;btn.textContent='SENDING...';
      try{
        await fb();
        const u=auth?.currentUser;
        if(!u)throw new Error('Please login before booking.');
        await u.reload();
        const freshUser=auth.currentUser;
        if(!freshUser)throw new Error('Please login before booking.');
        if(!freshUser.emailVerified)throw new Error('Please verify your email before booking.');
        const payload={
          name:$('apName')?.value.trim()||'',email:$('apEmail')?.value.trim()||freshUser.email||'',mobile:$('apMobile')?.value.trim()||'',
          type:$('apType')?.value||'',preferredDate:$('apDate')?.value||'',preferredTime:$('apTime')?.value||'',notes:$('apNotes')?.value.trim()||'',
          customerId:freshUser.uid,status:'new'
        };
        if(!payload.name)throw new Error('Please enter your name.');
        if(!payload.mobile)throw new Error('Please enter your mobile number.');
        if(!payload.type)throw new Error('Please select Chat or Call.');
        if(!payload.preferredDate)throw new Error('Please select your preferred date.');
        if(!payload.preferredTime)throw new Error('Please select your preferred time.');
        const token=await freshUser.getIdToken();
        const r=await fetch(BACKEND+'/appointment-booking',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(payload),cache:'no-store'});
        const d=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(d.error||`Booking request returned HTTP ${r.status}.`);
        console.log('Booking created:',d.bookingId);
        msg.innerHTML='<span class="success">✓ Booking request submitted.<br><b>Booking ID:</b> '+esc(d.bookingId||'')+'<br>Admin will confirm your consultation.</span>';
        f.reset();
      }catch(err){console.error('Appointment booking error:',err);msg.innerHTML='<span class="error">'+esc(err.message||String(err))+'</span>';}
      finally{bookingSubmitting=false;btn.disabled=false;btn.textContent='REQUEST APPOINTMENT';}
    });
  }
  function selectPrivateAstrologer(astro,button){
    const user=window.__smvFirebaseCurrentUser;
    if(!user || window.__smvCurrentRole!=='customer'){
      alert('Customer Login Required — Please login with a Customer account to select an astrologer.');
      if(!user)$('authBtn')?.click();return;
    }
    if(window.__smvSelectedPrivateConsultAstrologer?.id===astro.id){$('privateConsultationQuestionCard')?.classList.remove('hidden');$('privateConsultationQuestionCard')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    $('smvPrivateAutomaticOffer')?.remove();
    window.__smvSelectedPrivateConsultAstrologer={id:astro.id,name:astro.name||'Astrologer',chatPrice:Number(astro.chatPrice||0)};
    document.querySelectorAll('.smv-private-consult-select').forEach(el=>{el.textContent=el===button?'SELECTED':'SELECT ASTROLOGER';});
    $('privateConsultationSelected').textContent='Selected Astrologer: '+astro.name;
    const summary=$('privateConsultPaymentSummary');
    summary.textContent='Private Consultation Chat Price: ₹'+Number(astro.chatPrice).toFixed(2);
    delete summary.dataset.smvOfferFinal;delete summary.dataset.smvOfferOriginal;
    $('privateConsultationQuestionCard')?.classList.remove('hidden');
    $('privateConsultationQuestionCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  window.__smvSelectPrivateAstrologer=selectPrivateAstrologer;

  let privateConsultSubmitting=false;
  async function submitPrivateConsultation(e){
    e.preventDefault();
    if(privateConsultSubmitting)return;
    const astro=window.__smvSelectedPrivateConsultAstrologer;
    const msg=$('privateConsultMsg'),btn=$('privateConsultPayBtn');
    if(!astro?.id||Number(astro.chatPrice)<1){if(msg)msg.innerHTML='<span class="error">Please select an available astrologer first.</span>';return;}
    const payload={
      astrologerId:String(astro.id),
      promoCode:String($('privateConsultPromoCode')?.value||'').trim(),
      customerName:String($('privateConsultName')?.value||'').trim(),
      question:String($('privateConsultQuestion')?.value||'').trim(),
      birthDetails:{
        name:String($('privateConsultName')?.value||'').trim(),
        birthDate:String($('privateConsultBirthDate')?.value||''),
        birthTime:String($('privateConsultBirthTime')?.value||''),
        birthPlace:String($('privateConsultBirthPlace')?.value||'').trim(),
        birthGender:String($('privateConsultGender')?.value||''),
        timezone:'Asia/Kolkata',utcOffsetMinutes:330
      }
    };
    if(!payload.customerName||!payload.question||!payload.birthDetails.birthDate||!payload.birthDetails.birthTime||!payload.birthDetails.birthPlace){
      if(msg)msg.innerHTML='<span class="error">Please complete all birth details and your question.</span>';return;
    }
    privateConsultSubmitting=true;if(btn){btn.disabled=true;btn.textContent='CREATING PAYMENT...';}
    try{
      const u=window.__smvFirebaseCurrentUser;
      if(!u || String(window.__smvCurrentRole||'').toLowerCase()!=='customer')throw new Error('Please login with your Customer account before payment.');
      const token=await u.getIdToken();
      const api=async(path,body)=>{
        const started=performance.now();
        const r=await fetch(BACKEND+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body),cache:'no-store'});
        const d=await r.json().catch(()=>({}));window.__smvRecordTiming?.(path,performance.now()-started,r.ok);if(!r.ok)throw new Error(d.error||`Service returned HTTP ${r.status}.`);return d;
      };
      const [order]=await Promise.all([api('/private-consultation/create-order',payload),window.__smvEnsureCheckout()]);
      if(!order?.orderId||!order?.keyId||!order?.consultationId)throw new Error('Private consultation payment order was not created correctly.');
      if(order?.offerId&&msg)msg.innerHTML='<span class="success">'+esc(order.offerBannerText||order.offerName||'Offer applied')+' — Pay ₹'+(Number(order.amount||0)/100).toFixed(2)+'</span>';
      if(typeof window.Razorpay!=='function')throw new Error('Payment checkout is not ready. Please refresh and try again.');
      const options={
        key:order.keyId,amount:order.amount,currency:order.currency||'INR',name:'SMV ASTRO SERVICES',
        description:'Private Astrology Consultation',order_id:order.orderId,
        prefill:{email:u.email||''},notes:{consultationId:order.consultationId,astrologerId:String(astro.id)},
        theme:{color:'#6b21a8'},
        handler:async response=>{
          if(btn){btn.disabled=true;btn.textContent='CONFIRMING PAYMENT...';}
          try{
            const vr=await api('/private-consultation/verify-payment',{
              consultationId:order.consultationId,razorpay_order_id:response.razorpay_order_id,
              razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature
            });
            if(!vr?.verified)throw new Error(vr?.error||'Payment verification failed.');
            if(msg)msg.innerHTML='<span class="success">Payment successful. Your private consultation is waiting for Admin approval.</span>';
            if(btn){btn.textContent='PAYMENT DONE ✓';}
            privateConsultSubmitting=false;
            window.__smvShowVerifiedPayment({...vr,paymentId:vr.paymentId||response.razorpay_payment_id},'private');
          }catch(err){if(msg)msg.innerHTML='<span class="error">'+esc(err.message||String(err))+'</span>';if(btn){btn.disabled=false;btn.textContent='PAY & SUBMIT';}}
        },
        modal:{ondismiss:()=>{privateConsultSubmitting=false;if(btn){btn.disabled=false;btn.textContent='PAY & SUBMIT';}}}
      };
      const rzp=new window.Razorpay(options);
      rzp.on('payment.failed',resp=>{privateConsultSubmitting=false;if(msg)msg.innerHTML='<span class="error">'+esc(resp?.error?.description||'Payment failed. Please retry.')+'</span>';if(btn){btn.disabled=false;btn.textContent='PAY & SUBMIT';}});
      if(btn){btn.disabled=false;btn.textContent='PAY & SUBMIT';}
      rzp.open();
    }catch(err){
      privateConsultSubmitting=false;
      if(msg)msg.innerHTML='<span class="error">'+esc(err.message||String(err))+'</span>';
      if(btn){btn.disabled=false;btn.textContent='PAY & SUBMIT';}
    }
  }

  function setupAsk(){
  $('privateConsultationQuestionForm')?.addEventListener('submit',submitPrivateConsultation);
  $('privateConsultationQuestionClose')?.addEventListener('click',()=>{
    $('privateConsultationQuestionCard')?.classList.add('hidden');
    window.__smvSelectedPrivateConsultAstrologer=null;
    document.querySelectorAll('[data-private-consult-astro]').forEach(b=>{b.textContent='SELECT ASTROLOGER';b.disabled=false;});
    const selected=$('privateConsultationSelected'),summary=$('privateConsultPaymentSummary'),msg=$('privateConsultMsg');
    if(selected)selected.textContent='';
    if(summary)summary.textContent='';
    if(msg)msg.textContent='';
    $('privateConsultationQuestionForm')?.reset();
    $('privateConsultationAstrologers')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  // IMPORTANT: this script is a separate ES module from the main app module.
  // openQuestionService() is therefore not in this module's lexical scope.
  // Always cross the module boundary through the explicit window bridge.
  document.querySelectorAll('[data-open-booking]').forEach(b=>{
    b.onclick=()=>{
      show('appointment');
      if($('apType')) $('apType').value=b.dataset.openBooking;
      $('appointment')?.scrollIntoView({behavior:'smooth',block:'start'});
      $('apName')?.focus();
    };
  });
}
  let adminRefreshRunning=false;
  async function refreshAdminSections(){
    if($('admin')?.classList.contains('hidden'))return;
    if(adminRefreshRunning)return;
    adminRefreshRunning=true;
    try{
      await loadAdminAppointments();
    }finally{adminRefreshRunning=false;}
  }
  function hookAdmin(){
    if(window.__SMV_ADMIN_HOOKED)return;
    window.__SMV_ADMIN_HOOKED=true;
    window.__smvRefreshAdminSections=refreshAdminSections;
  }
  setupBooking();setupAsk();if($('publicQuestionPrice'))loadQuestionPrice().catch(()=>{});if(window.__smvReloadAstrologers)window.__smvReloadAstrologers().catch(()=>{});else window.addEventListener('smv:app-ready',()=>window.__smvReloadAstrologers?.().catch(()=>{}),{once:true});hookAdmin();loadReviews().catch(()=>{});
  // Admin data loaders are triggered explicitly after Admin authentication.
})();
  document.getElementById("contactNav")?.addEventListener("click",e=>{e.preventDefault();document.getElementById("contact")?.classList.remove("hidden");document.getElementById("contact")?.scrollIntoView({behavior:"smooth",block:"start"});});
