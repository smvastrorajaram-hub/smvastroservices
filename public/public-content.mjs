
(function(){
  const IS_SMV_PHASE1_STAGING=["smv-astro-phase1-browser-staging.onrender.com","smv-astro-phase1-browser-isolated.onrender.com"].includes(location.hostname);
  const BACKEND=IS_SMV_PHASE1_STAGING?"https://smv-astro-phase1-staging.onrender.com":"https://smvastroservices.onrender.com";
  const FBCONFIG=IS_SMV_PHASE1_STAGING
    ? {apiKey:"AIzaSyD9LzJ-7OKZMaVVf5kXa9aABBECS6kE8mA",authDomain:"smv-astro-staging.firebaseapp.com",projectId:"smv-astro-staging",storageBucket:"smv-astro-staging.firebasestorage.app",messagingSenderId:"73946216796",appId:"1:73946216796:web:09500761bec02699a4e999"}
    : {apiKey:"AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs",authDomain:(location.hostname==='smvastroservices.pages.dev'||location.hostname.endsWith('.smvastroservices.pages.dev')?'smv-astro.firebaseapp.com':'auth.smvastroservices.in'),projectId:"smv-astro",storageBucket:"smv-astro.firebasestorage.app",messagingSenderId:"299081899217",appId:"1:299081899217:web:8d558df08e86037ea539f0"};
  let db=null,auth=null;
  const show=id=>document.getElementById(id)?.classList.remove('hidden');
  const closeModal=()=>document.getElementById('modal')?.classList.add('hidden');
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let fbApi=null;
  function withTimeout(promise,ms=15000){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Firebase did not respond within 15 seconds.')),ms))]);}
  const SMV_MAX_LIVE_MINUTES=1440;
  let smvLiveWalletCache=null;
  function smvLiveRatePaise(astrologer,mode){
    const astro=astrologer||{};
    const value=mode==='call'
      ? (astro.callPricePerMinute??astro.pricePerMinute??astro.callRatePerMinute)
      : (astro.chatPricePerMinute??astro.liveChatPricePerMinute??astro.chatRatePerMinute);
    const rupees=Number(value);
    if(!Number.isFinite(rupees)||rupees<1||rupees>10000||Math.abs(rupees*100-Math.round(rupees*100))>1e-7)return null;
    return Math.round(rupees*100);
  }
  async function smvFetchLiveWallet(force=false){
    const user=auth?.currentUser;
    if(!user)return null;
    if(!force&&smvLiveWalletCache&&smvLiveWalletCache.userUid===user.uid&&Date.now()-smvLiveWalletCache.loadedAt<8000)return smvLiveWalletCache;
    const token=await user.getIdToken();
    const response=await fetch(BACKEND+'/wallet',{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+token,Accept:'application/json'}});
    let data={};try{data=await response.json();}catch(_){}
    if(!response.ok||data.success!==true||!data.wallet)throw new Error(data.error||'Unable to read your current Wallet balance.');
    if(auth?.currentUser?.uid!==user.uid)throw new Error('Login changed while checking Wallet. Please try again.');
    smvLiveWalletCache={...data.wallet,userUid:user.uid,loadedAt:Date.now()};
    return smvLiveWalletCache;
  }
  async function smvRefreshLiveMinuteLimits(force=true){
    const rows=[...document.querySelectorAll('#privateConsultationAstrologers .smv-private-consult-row')];
    if(!rows.length)return;
    let wallet=null, walletError='';
    try{await fb();if(auth?.currentUser)wallet=await smvFetchLiveWallet(force);}
    catch(error){walletError=String(error?.message||error);}
    const isCustomer=!!auth?.currentUser&&wallet?.ownerRole==='customer'&&wallet.userUid===auth.currentUser.uid;
    const knownNonCustomer=!!auth?.currentUser&&!!wallet&&wallet.userUid===auth.currentUser.uid&&wallet.ownerRole!=='customer';
    for(const row of rows){
      const balance=isCustomer?Number(wallet.availableBalancePaise||0):null;
      const bonusMinutes=isCustomer?Math.max(0,Math.floor(Number(wallet.bonusMinutesBalance||0))):0;
      for(const mode of ['call','chat']){
        const input=row.querySelector('[data-live-minutes="'+mode+'"]');
        const button=row.querySelector('[data-live-action="'+mode+'"]');
        const note=row.querySelector('[data-live-limit="'+mode+'"]');
        if(!input||!button||!note)continue;
        const rate=Number(row.dataset[mode+'RatePaise']||0);
        const goodRate=Number.isSafeInteger(rate)&&rate>=100&&rate<=1000000;
        const max=isCustomer&&goodRate?Math.min(SMV_MAX_LIVE_MINUTES,Math.floor(balance/rate)+bonusMinutes):0;
        input.max=String(isCustomer?Math.max(0,max):SMV_MAX_LIVE_MINUTES);
        input.dataset.maximumMinutes=String(max);
        if(!goodRate||knownNonCustomer||(isCustomer&&max<1)){
          input.disabled=true;
          button.disabled=true;
        }else{
          input.disabled=false;
          button.disabled=false;
        }
        if(!goodRate){
          note.textContent=(mode==='call'?'Call':'Chat')+' price per minute is not configured for this Astrologer.';
        }else if(knownNonCustomer){
          note.textContent='Please sign in with a Customer account to use Live Call / Live Chat.';
        }else if(!auth?.currentUser){
          note.textContent='Login as a Customer to check Wallet balance and the maximum affordable minutes.';
        }else if(!isCustomer){
          note.textContent=walletError||'Customer login is required to calculate Live duration.';
        }else if(max<1){
          note.textContent='No balance for '+(mode==='call'?'Call':'Chat')+' at '+smvLiveMoney(rate)+'/minute. Available Wallet: '+smvLiveMoney(balance)+'.';
        }else{
          note.textContent='Available Wallet: '+smvLiveMoney(balance)+'. '+(bonusMinutes?bonusMinutes+' promotional free minute(s). ':'')+'Maximum '+max+' minute(s) at '+smvLiveMoney(rate)+'/minute.';
          const entered=Number(input.value);
          if(input.value!==''&&(!Number.isSafeInteger(entered)||entered<1||entered>max)){
            note.textContent+=' Enter a whole number from 1 to '+max+'.';
          }
        }
      }
    }
  }
  function smvLiveMoney(paise){
    const n=Number(paise);
    return '₹'+((Number.isSafeInteger(n)&&n>=0?n:0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function smvOpenLiveBirthDetails(astrologer,mode,minutes,button,feedback){
    if(!auth?.currentUser){alert('Please login with a Customer account to use Live Call / Live Chat.');document.getElementById('authBtn')?.click();return;}
    const kind=String(mode||'').toLowerCase()==='chat'?'chat':'call';
    const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
    const maxDate=today.toISOString().slice(0,10);
    const currentName=String(window.__smvCustomerProfileName||auth.currentUser.displayName||'').trim();
    const customerName=currentName&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentName)?currentName:'';
    showPublicProfileModal('<div class="profile-dialog smv-live-birth-dialog" style="width:100%;max-width:720px;max-height:calc(100dvh - 16px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:8px 10px 8px;background:#fffaf0;color:#2d1919;-webkit-text-fill-color:#2d1919;text-align:left">'+
      '<h2 style="color:#751515;-webkit-text-fill-color:#751515;padding-right:34px">Live '+(kind==='chat'?'Chat':'Call')+' — '+esc(astrologer?.name||'Astrologer')+'</h2>'+
      '<p style="color:#2d1919;-webkit-text-fill-color:#2d1919">Enter the Customer birth details. The Astrologer gets 3 minutes to prepare the horoscope before the Call / Chat request continues.</p>'+
      '<form id="smvLiveBirthForm" style="display:grid;gap:7px">'+
      '<label style="display:grid;gap:3px;color:#2d1919"><b>Customer Name</b><input id="smvLiveBirthCustomerName" maxlength="100" required value="'+esc(customerName)+'" style="width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>'+
      '<label style="display:grid;gap:6px;color:#2d1919"><b>Date of Birth</b><input id="smvLiveBirthDate" type="date" max="'+maxDate+'" required style="width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>'+
      '<label style="display:grid;gap:6px;color:#2d1919"><b>Time of Birth</b><input id="smvLiveBirthTime" type="time" required style="width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>'+
      '<label style="display:grid;gap:6px;color:#2d1919"><b>Birth Place</b><input id="smvLiveBirthPlace" type="text" maxlength="200" autocomplete="off" inputmode="search" placeholder="Search city, town or place" required style="width:100%;box-sizing:border-box;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>'+
      '<input id="smvLiveBirthLatitude" type="hidden"><input id="smvLiveBirthLongitude" type="hidden">'+
      '<p class="small" style="margin:0;color:#62483b;-webkit-text-fill-color:#62483b">Choose a place from the suggestions when available. If online search is unavailable, you can enter the place manually.</p>'+
      '<div id="smvLiveBirthMessage" class="small" role="status" aria-live="polite"></div>'+
      '<div class="smv-booking-actions" style="position:sticky;bottom:0;z-index:10;display:flex;justify-content:center;align-items:center;gap:8px;margin-top:auto;padding:7px 0 calc(7px + env(safe-area-inset-bottom));background:#24103F;border-top:1px solid #d4af37"><button id="smvLiveBirthSubmit" class="btn" type="submit" style="flex:0 1 260px;width:100%;min-width:0;min-height:38px;margin:0 auto;background:#5b2a86;color:#fff;-webkit-text-fill-color:#fff;border:1px solid #d4af37;white-space:normal;overflow-wrap:anywhere;text-align:center">CONTINUE</button></div>'+
      '</form></div>');
    const place=$('smvLiveBirthPlace'),lat=$('smvLiveBirthLatitude'),lon=$('smvLiveBirthLongitude'),message=$('smvLiveBirthMessage'),submit=$('smvLiveBirthSubmit');
    place?.addEventListener('input',()=>{if(lat)lat.value='';if(lon)lon.value='';if(place){delete place.dataset.latitude;delete place.dataset.longitude;delete place.dataset.timezone;}});
    import('./question-place-search.mjs').then(({bindQuestionPlaceSearch})=>bindQuestionPlaceSearch(place,{latId:'smvLiveBirthLatitude',lonId:'smvLiveBirthLongitude'})).catch(error=>console.warn('Live Session birth-place search is unavailable:',error));
    $('smvLiveBirthForm').onsubmit=async event=>{
      event.preventDefault();
      const birthDetails={birthDate:String($('smvLiveBirthDate')?.value||''),birthTime:String($('smvLiveBirthTime')?.value||''),birthPlace:String(place?.value||'').trim(),birthLatitude:String(lat?.value||place?.dataset.latitude||''),birthLongitude:String(lon?.value||place?.dataset.longitude||''),birthTimezone:String(place?.dataset.timezone||'')};
      const customerName=String($('smvLiveBirthCustomerName')?.value||'').trim();
      if(!customerName||!birthDetails.birthDate||!birthDetails.birthTime||!birthDetails.birthPlace){if(message)message.textContent='Enter Customer name, date/time of birth and birth place to continue.';return;}
      if(birthDetails.birthDate>maxDate){if(message)message.textContent='Date of Birth cannot be in the future.';return;}
      if(submit){submit.disabled=true;submit.textContent='SAVING DETAILS…';}
      if(message)message.textContent='Saving birth details securely…';
      closeModal();
      await smvCreateLiveRequest(astrologer,kind,minutes,button,feedback,{...birthDetails,customerName});
    };
  }
  async function smvCreateLiveRequest(astrologer,mode,minutes,button,feedback,birthDetails){
    if(!auth?.currentUser){
      alert('Please login with a Customer account to use Live Call / Live Chat.');
      document.getElementById('authBtn')?.click();return;
    }
    const user=auth.currentUser;
    try{
      const kind=String(mode||'').toLowerCase();
      const ratePaise=smvLiveRatePaise(astrologer,kind);
      const length=Number(minutes);
      if(!ratePaise)throw new Error((kind==='call'?'Call':'Chat')+' price per minute is not configured for this Astrologer.');
      if(!Number.isSafeInteger(length)||length<1||length>SMV_MAX_LIVE_MINUTES){
        throw new Error('Enter a whole number of minutes from 1 to '+SMV_MAX_LIVE_MINUTES+'.');
      }
      if(button){button.disabled=true;button.textContent='CHECKING WALLET…';}
      if(feedback)feedback.textContent='Checking this Astrologer’s rate and your current Wallet balance…';
      const wallet=await smvFetchLiveWallet(true);
      if(!wallet||wallet.ownerRole!=='customer'||wallet.userUid!==user.uid)throw new Error('Please sign in with a Customer account to use Live Call / Live Chat.');
      const available=Number(wallet.availableBalancePaise||0);
      const bonusMinutes=Math.max(0,Math.floor(Number(wallet.bonusMinutesBalance||0)));
      const max=Math.min(SMV_MAX_LIVE_MINUTES,Math.floor(available/ratePaise)+bonusMinutes);
      if(max<1)throw new Error('No cash or promotional minutes available for '+(kind==='call'?'Call':'Chat')+' at '+smvLiveMoney(ratePaise)+'/minute. Available Wallet: '+smvLiveMoney(available)+'.');
      if(length>max)throw new Error('Maximum affordable duration for this Astrologer’s '+kind.toUpperCase()+' is '+max+' minute(s), including '+bonusMinutes+' promotional free minute(s). At '+smvLiveMoney(ratePaise)+'/minute, your Wallet has '+smvLiveMoney(available)+'.');
      const token=await user.getIdToken();
      const requestId=(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():('live-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
      const response=await fetch(BACKEND+'/live/requests',{
        method:'POST',cache:'no-store',
        headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify({astrologerId:String(astrologer.id||''),mode:kind,minutes:length,requestId,customerName:String(birthDetails?.customerName||user.displayName||'').trim(),birthDetails:{birthDate:String(birthDetails?.birthDate||''),birthTime:String(birthDetails?.birthTime||''),birthPlace:String(birthDetails?.birthPlace||'').trim(),birthLatitude:String(birthDetails?.birthLatitude||''),birthLongitude:String(birthDetails?.birthLongitude||''),birthTimezone:String(birthDetails?.birthTimezone||'')}})
      });
      let result={};try{result=await response.json();}catch(_){}
      if(!response.ok||result.success!==true){
        const details=result.details||{};
        if(result.code==='WALLET_INSUFFICIENT_BALANCE'){
          const required=Number(details.requiredBalancePaise||0),balance=Number(details.availableBalancePaise||0),shortfall=Number(details.shortfallPaise||Math.max(0,required-balance));
          throw new Error('Insufficient Wallet balance for '+length+' minute(s). Required '+smvLiveMoney(required)+'; available '+smvLiveMoney(balance)+'; add '+smvLiveMoney(shortfall)+' more.');
        }
        throw new Error(result.error||'The server did not accept this Live request.');
      }
      if(result.kind==='session'&&result.session){
        if(feedback)feedback.textContent='Live '+kind.toUpperCase()+' request sent. Cash reserved: '+smvLiveMoney(Number(result.session.reservedAmountPaise??0))+'. Promotional minutes reserved: '+String(Number(result.session.reservedBonusMinutes||0))+'. Waiting for the Astrologer to accept.';
        window.dispatchEvent(new Event('smv:wallet-updated'));
        window.__smvStartLiveEvents?.();
        window.__smvOpenLiveSession?.(result.session);
      }else if(result.kind==='booking'&&result.booking){
        if(feedback)feedback.textContent='Booking queued for '+String(astrologer.name||'Astrologer')+'. Wallet cash and promotional minutes are reserved until the Astrologer accepts or the booking is cancelled, rejected, or expires.';
        window.dispatchEvent(new Event('smv:wallet-updated'));
        alert('Live '+kind.toUpperCase()+' booking created. Reserved cash: '+smvLiveMoney(Number(result.booking.reservedAmountPaise??0))+'. Promotional minutes reserved: '+String(Number(result.booking.reservedBonusMinutes||0))+'. Unused reserves are returned if the booking is cancelled, rejected, or expires.');
      }else{
        throw new Error('The backend returned an unknown Live request status. Please refresh the directory.');
      }
    }catch(error){
      console.error('Live request failed:',error);
      if(feedback)feedback.textContent=error?.message||String(error);
      else alert(error?.message||String(error));
    }finally{
      if(button){button.disabled=false;button.textContent=String(button.dataset.defaultLabel||button.textContent||'START');}
      smvRefreshLiveMinuteLimits(true).catch(()=>{});
    }
  }
  async function fb(){
    if(db&&auth&&fbApi) return fbApi;
    const {getApps,initializeApp}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js');
    const fs=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const {getFirestore}=fs;
    const {getAuth}=await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js');
    const defaultApp=getApps().find(candidate=>candidate.name==='[DEFAULT]');
    if(defaultApp&&String(defaultApp.options?.projectId||'')!==String(FBCONFIG.projectId)){
      throw new Error('Firebase project mismatch: this page is configured for '+FBCONFIG.projectId+' but the existing default app targets '+String(defaultApp.options?.projectId||'unknown')+'. Refusing to access another project.');
    }
    const app=defaultApp||initializeApp(FBCONFIG);
    if(String(app.options?.projectId||'')!==String(FBCONFIG.projectId)){
      throw new Error('Firebase project mismatch. Refusing to continue with a non-staging project on the staging website.');
    }
    db=getFirestore(app);
    auth=getAuth(app); // Main app owns auth persistence; do not override it from this secondary module.
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
    const initialDialog=contentEl.querySelector('.profile-dialog');
    const usesPurpleTheme=!!initialDialog&&(initialDialog.classList.contains('smv-call-booking-dialog')||initialDialog.classList.contains('smv-live-birth-dialog'));
    modalEl.style.overflowY='hidden';
    modalEl.style.overflowX='hidden';
    modalEl.style.padding=usesPurpleTheme?'8px 8px calc(8px + env(safe-area-inset-bottom))':'12px';
    modalEl.style.alignItems='start';
    const modalBox=modalEl.querySelector('.modalbox');
    if(modalBox){
      modalBox.style.width=usesPurpleTheme?'min(100%, 720px)':'';
      modalBox.style.maxWidth=usesPurpleTheme?'720px':'';
      modalBox.style.height='auto';
      modalBox.style.maxHeight='calc(100dvh - 8px - env(safe-area-inset-bottom))';
      modalBox.style.minHeight='0';
      modalBox.style.overflow=usesPurpleTheme?'hidden':'auto';
      modalBox.style.overflowX='hidden';
      modalBox.style.display='flex';
      modalBox.style.flexDirection='column';
      modalBox.style.boxSizing='border-box';
    }
    contentEl.style.minWidth='0';
    contentEl.style.width='100%';
    contentEl.style.display='flex';
    contentEl.style.flex='1 1 auto';
    contentEl.style.flexDirection='column';
    contentEl.style.minHeight='0';
    const dialogSurface=contentEl.querySelector('.profile-dialog');
    if(dialogSurface){
      const purpleTheme=dialogSurface.classList.contains('smv-call-booking-dialog')||dialogSurface.classList.contains('smv-live-birth-dialog');
      const foreground=purpleTheme?'#ffffff':'#2d1919';
      dialogSurface.style.color=foreground;
      dialogSurface.style.webkitTextFillColor=foreground;
      if(purpleTheme){dialogSurface.style.background='#24103F';dialogSurface.style.border='1px solid #d4af37';dialogSurface.style.borderRadius='14px';}
      dialogSurface.style.opacity='1';
      dialogSurface.style.height=purpleTheme?'calc(100dvh - 64px - env(safe-area-inset-bottom))':'auto';
      dialogSurface.style.maxHeight=purpleTheme?'calc(100dvh - 32px - env(safe-area-inset-bottom))':'calc(100dvh - 52px)';
      dialogSurface.style.minHeight='0';
      dialogSurface.style.flex='1 1 auto';
      dialogSurface.style.display='flex';
      dialogSurface.style.flexDirection='column';
      dialogSurface.style.overflow=purpleTheme?'hidden':'auto';
      dialogSurface.style.overflowX='hidden';
      dialogSurface.style.overscrollBehavior='contain';
      dialogSurface.style.boxSizing='border-box';
      const dialogForm=dialogSurface.querySelector('form');
      if(purpleTheme&&dialogForm){
        dialogForm.style.display='flex';
        dialogForm.style.flexDirection='column';
        dialogForm.style.flex='1 1 auto';
        dialogForm.style.minHeight='0';
        dialogForm.style.minWidth='0';
        dialogForm.style.width='100%';
        dialogForm.style.overflowY='auto';
        dialogForm.style.overflowX='hidden';
        dialogForm.style.overscrollBehavior='contain';
        dialogForm.style.boxSizing='border-box';
        dialogForm.querySelectorAll('label').forEach(label=>{
          label.style.display='grid';
          label.style.gap='6px';
          label.style.width='100%';
          label.style.minWidth='0';
          label.style.margin='0';
          label.style.boxSizing='border-box';
        });
        const actions=dialogForm.querySelector('.smv-booking-actions');
        if(actions){
          actions.style.position='sticky';
          actions.style.bottom='0';
          actions.style.zIndex='10';
          actions.style.flex='0 0 auto';
          actions.style.marginTop='auto';
          actions.style.background='#24103F';
          actions.style.borderTop='1px solid #d4af37';
          actions.style.padding='10px 0 calc(10px + env(safe-area-inset-bottom))';
        }
      }
      dialogSurface.querySelectorAll('h1,h2,h3,h4,p,b,strong,label,small,.small,.empty').forEach(node=>{
        node.style.opacity='1';
        node.style.color=purpleTheme?'#ffffff':(/^H[1-4]$/.test(node.tagName)?'#751515':'#2d1919');
        node.style.webkitTextFillColor=node.style.color;
      });
      dialogSurface.querySelectorAll('button,input,select,textarea').forEach(control=>{
        control.style.opacity='1';
        if(control.matches('input,select,textarea')){
          control.style.color='#2d1919';
          control.style.webkitTextFillColor='#2d1919';
          control.style.caretColor='#2d1919';
          control.style.background='#ffffff';
          control.style.borderColor='#c9b8e4';
          control.style.borderRadius='8px';
          if(control.type!=='hidden'){control.style.minHeight='36px';control.style.padding='6px 8px';control.style.fontSize='14px';control.style.lineHeight='1.2';}
        } else {
          if(purpleTheme){
            const primary=control.id==='smvCallBookingSubmit'||control.id==='smvLiveBirthSubmit';
            control.style.minHeight='42px';control.style.whiteSpace='normal';control.style.overflowWrap='anywhere';control.style.borderRadius='8px';
            if(primary){control.style.background='#5b2a86';control.style.color='#ffffff';control.style.webkitTextFillColor='#ffffff';control.style.border='1px solid #d4af37';}
            else{control.style.background='#ffffff';control.style.color='#24103F';control.style.webkitTextFillColor='#24103F';control.style.border='1px solid #c9b8e4';}
          }else{const computedColor=window.getComputedStyle(control).color;if(computedColor)control.style.webkitTextFillColor=computedColor;}
        }
      });
    }
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
  async function openAstrologerCallBooking(a,mode='call'){
    const bookingMode=mode==='chat'?'chat':'call';
    const bookingLabel=bookingMode==='chat'?'Chat':'Call';
    const rate=Number(bookingMode==='chat'?(a?.chatPricePerMinute??a?.liveChatPricePerMinute??a?.chatRatePerMinute):(a?.callPricePerMinute??a?.pricePerMinute??a?.callRatePerMinute));
    const user=window.__smvFirebaseCurrentUser||null;
    const customerDisplayName=String(window.__smvCustomerProfileName||user?.displayName||'').trim();
    if(!user){
      alert('Customer Login Required — please log in with a Customer account to book a '+bookingLabel.toLowerCase()+'.');
      $('authBtn')?.click();
      return;
    }
    if(!Number.isFinite(rate)||rate<=0){
      showPublicProfileModal(`<div class="profile-dialog"><h2 style="padding-right:42px;line-height:1.35">Book ${bookingLabel} — ${esc(a?.name||'Astrologer')}</h2><div class="empty error">${bookingLabel} Price per minute has not been configured for this Astrologer. Admin must set the ${bookingLabel} Price in Astrologer Profile Management before this booking request can be submitted.</div><button class="btn gray" id="smvCallBookingClose" type="button">CLOSE</button></div>`);
        return;
    }
    const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
    const minDate=today.toISOString().slice(0,10);
    const notesOrQuestionField=bookingMode==='chat'
      ? '<label style="display:block;min-width:0;color:#2d1919"><b>Question / Chat Topic</b><textarea id="smvCallBookingQuestion" name="question" maxlength="4000" rows="4" required placeholder="What would you like to discuss with the astrologer?" style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:6px;min-height:110px;padding:10px 12px;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px;resize:vertical;overflow-y:auto;line-height:1.5"></textarea></label>'
      : '<label style="display:block;min-width:0;color:#2d1919"><b>Notes (optional)</b><textarea id="smvCallBookingNotes" name="notes" maxlength="2000" rows="4" placeholder="Preferred time window or brief details" style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:6px;min-height:100px;padding:10px 12px;color:#2d1919;-webkit-text-fill-color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px;resize:vertical;overflow-y:auto;line-height:1.5"></textarea></label>';
    const bookingSubmitLabel=bookingMode==='chat'?'REQUEST CHAT BOOKING':'REQUEST CALL BOOKING';
    showPublicProfileModal(`<div class="profile-dialog smv-call-booking-dialog" style="position:relative;max-height:calc(100dvh - 8px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;width:100%;max-width:100%;min-width:0;padding:8px 10px 8px;background:#24103F;color:#ffffff;-webkit-text-fill-color:#ffffff;border:1px solid #d4af37;border-radius:14px;overflow-wrap:anywhere">
      <h2 style="padding-right:36px;line-height:1.2;font-size:18px;margin:0 0 4px">Book ${bookingLabel} — ${esc(a?.name||'Astrologer')}</h2>
      <p style="margin:3px 0;line-height:1.25;font-size:13px"><b>${bookingLabel} rate:</b> ₹${rate.toFixed(2)} per minute</p>
      <p class="small">Booking request only. The Astrologer must accept it. At the scheduled time, the Astrologer starts the Call/Chat; Wallet funds are reserved when the session starts.</p>
      <form id="smvCallBookingForm" style="display:flex;flex-direction:column;gap:6px;width:100%;min-width:0;min-height:0">
        <label><b>Your name</b><input id="smvCallBookingName" name="name" maxlength="100" value="${esc(customerDisplayName)}" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        <label><b>Email</b><input id="smvCallBookingEmail" name="email" type="email" maxlength="160" value="${esc(user.email||'')}" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        <label style="display:block;min-width:0;color:#2d1919"><b>Mobile Number</b><input id="smvCallBookingMobile" name="mobile" type="tel" maxlength="20" autocomplete="tel" inputmode="tel" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        <div class="grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;min-width:0">
          <label style="display:block;min-width:0;color:#2d1919"><b>Date of Birth</b><input id="smvCallBookingBirthDate" name="birthDate" type="date" max="${minDate}" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
          <label style="display:block;min-width:0;color:#2d1919"><b>Time of Birth</b><input id="smvCallBookingBirthTime" name="birthTime" type="time" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        </div>
        <label style="display:block;min-width:0;color:#2d1919"><b>Birth Place (search and select)</b><input id="smvCallBookingBirthPlace" name="birthPlace" type="text" maxlength="200" autocomplete="off" inputmode="search" placeholder="Search city, town or place" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        <input id="smvCallBookingBirthLatitude" type="hidden" value="">
        <input id="smvCallBookingBirthLongitude" type="hidden" value="">
        <p class="small" style="color:#e4d8f5;-webkit-text-fill-color:#e4d8f5;margin:0">Type at least two characters and choose a place from the suggestions. If location search is unavailable, enter the place manually.</p>
        <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px;min-width:0">
          <label><b>Preferred Date</b><input id="smvCallBookingDate" name="preferredDate" type="date" min="${minDate}" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
          <label><b>Preferred Time</b><input id="smvCallBookingTime" name="preferredTime" type="time" required style="display:block;width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin-top:2px;min-height:36px;padding:6px 8px;font-size:14px;line-height:1.2;color:#2d1919;background:#fff;border:1px solid #b9a17b;border-radius:8px"></label>
        </div>
        ${notesOrQuestionField}
        <div id="smvCallBookingMessage" class="small" role="status" aria-live="polite"></div>
        <div class="smv-booking-actions" style="position:sticky;bottom:0;z-index:10;display:flex;justify-content:center;align-items:center;gap:8px;margin-top:auto;padding:7px 0 calc(7px + env(safe-area-inset-bottom));background:#24103F;border-top:1px solid #d4af37">
          <button class="btn" id="smvCallBookingSubmit" type="submit" style="flex:0 1 280px;width:100%;min-width:0;min-height:38px;margin:0 auto;white-space:normal;overflow-wrap:anywhere;background:#5b2a86;color:#ffffff;-webkit-text-fill-color:#ffffff;border:1px solid #d4af37;text-align:center">${bookingSubmitLabel}</button>
        </div>
      </form>
    </div>`);
    const birthPlaceInput=$('smvCallBookingBirthPlace');
    if(birthPlaceInput){
      birthPlaceInput.addEventListener('input',()=>{
        const lat=$('smvCallBookingBirthLatitude'),lon=$('smvCallBookingBirthLongitude');
        if(lat)lat.value='';if(lon)lon.value='';
      });
      import('./question-place-search.mjs').then(({bindQuestionPlaceSearch})=>bindQuestionPlaceSearch(birthPlaceInput,{latId:'smvCallBookingBirthLatitude',lonId:'smvCallBookingBirthLongitude'})).catch(error=>console.warn('Book a Call birth-place search is unavailable:',error));
    }
    const form=$('smvCallBookingForm');
    form.onsubmit=async event=>{
      event.preventDefault();
      const submit=$('smvCallBookingSubmit'),message=$('smvCallBookingMessage');
      if(submit){submit.disabled=true;submit.textContent='SUBMITTING…';}
      if(message)message.textContent='Submitting your '+bookingLabel+' Booking request…';
      try{
        const token=await user.getIdToken();
        const response=await fetch(BACKEND+'/appointment-booking',{
          method:'POST',cache:'no-store',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
          body:JSON.stringify({
            name:String($('smvCallBookingName')?.value||'').trim(),
            email:String($('smvCallBookingEmail')?.value||'').trim(),
            mobile:String($('smvCallBookingMobile')?.value||'').trim(),
            birthDate:String($('smvCallBookingBirthDate')?.value||''),
            birthTime:String($('smvCallBookingBirthTime')?.value||''),
            birthPlace:String($('smvCallBookingBirthPlace')?.value||'').trim(),
            birthLatitude:String($('smvCallBookingBirthLatitude')?.value||birthPlaceInput?.dataset.latitude||''),
            birthLongitude:String($('smvCallBookingBirthLongitude')?.value||birthPlaceInput?.dataset.longitude||''),
            birthTimezone:String(birthPlaceInput?.dataset.timezone||''),
            type:bookingMode==='chat'?'Chat Consultation':'Call Consultation',
            question:bookingMode==='chat'?String($('smvCallBookingQuestion')?.value||'').trim():'',
            preferredDate:String($('smvCallBookingDate')?.value||''),
            preferredTime:String($('smvCallBookingTime')?.value||''),
            notes:bookingMode==='call'?String($('smvCallBookingNotes')?.value||'').trim():'',
            astrologerId:String(a.id||'')
          })
        });
        const result=await response.json().catch(()=>({}));
        if(!response.ok||result.ok!==true)throw new Error(result.error||'The backend did not confirm the Call Booking request.');
        if(message)message.innerHTML='<span class="success">'+bookingLabel+' booking request submitted. Booking ID: '+esc(result.bookingId||'')+'. The request is awaiting confirmation; no Wallet charge has been made.</span>';
        if(submit){submit.textContent=bookingMode==='chat'?'CHAT BOOKING SUBMITTED':'CALL BOOKING SUBMITTED';}
      }catch(error){
        if(message)message.innerHTML='<span class="error">'+esc(error?.message||String(error))+'</span>';
        if(submit){submit.disabled=false;submit.textContent=bookingSubmitLabel;}
      }
    };
  }
  window.__smvOpenPublicAstrologerProfile=openPublicAstrologerProfile;
  let publicReviewsRequest=null,publicReviewsLoaded=false;
  async function loadReviews(){
    const box=$('publicReviews');if(!box)return;
    if(publicReviewsLoaded)return;
    if(publicReviewsRequest)return publicReviewsRequest;
    publicReviewsRequest=(async()=>{
      try{
        const f=await fb();
        const [snap,astrologers]=await Promise.all([
          f.getDocs(f.query(f.collection(db,'smv_reviews'),f.where('approved','==',true),f.limit(12))),
          window.__smvGetPublicAstrologersOnce?.().catch(()=>[])||Promise.resolve([])
        ]);
        if(snap.empty){box.innerHTML='<div class="empty">No public reviews yet. Be the first verified customer to share your experience.</div>';publicReviewsLoaded=true;return;}
        const astroMap=new Map((Array.isArray(astrologers)?astrologers:[]).map(a=>[String(a.id||''),a]));
        const reviews=snap.docs.map(d=>{
          const r=d.data()||{},astro=astroMap.get(String(r.astrologerId||''))||{};
          const stars='★'.repeat(Math.max(0,Math.min(5,Number(r.rating||0))))+'☆'.repeat(5-Math.max(0,Math.min(5,Number(r.rating||0))));
          const astroName=astro.name||r.astrologerName||'SMV ASTRO Astrologer';
          const astroPhoto=astro.photoData||astro.photoURL||astro.photoUrl||'';
          const customerName=r.customerName||r.name||'Verified Customer';
          const photo=astroPhoto?`<img src="${esc(astroPhoto)}" alt="${esc(astroName)}" loading="lazy" decoding="async" style="width:58px;height:58px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);">`:`<div style="width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:#f7df9b;color:#7b1e1e;font-weight:800;font-size:22px;border:2px solid var(--gold);">${esc(String(astroName).charAt(0).toUpperCase())}</div>`;
          return `<div class="card review-card"><div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">${photo}<div><div style="font-weight:800;font-size:18px">${esc(astroName)}</div><div class="small">Astrologer</div></div></div><div class="stars">${stars}</div><p style="white-space:pre-wrap">“${esc(r.review||'Verified customer review')}”</p><p class="small"><b>Customer: ${esc(customerName)}</b></p></div>`;
        });
        box.innerHTML=reviews.join('');publicReviewsLoaded=true;
      }catch(e){console.error('Public reviews load failed',e);box.innerHTML='<div class="empty">Reviews are temporarily unavailable.</div>';}
      finally{publicReviewsRequest=null;}
    })();
    return publicReviewsRequest;
  }
  function armPublicReviewsLazyLoad(){
    const box=$('publicReviews');if(!box)return;
    box.innerHTML='<div class="empty">Reviews load when this section is viewed.</div>';
    if(!('IntersectionObserver' in window)){return;}
    const io=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){io.disconnect();loadReviews().catch(()=>{});}
    },{rootMargin:'300px 0px'});
    io.observe(box);
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
      box.innerHTML=items.map(a=>{const current=String(a.status||'new').toLowerCase(),birth=a.birthDetails||{};return `<div style="padding:14px 0;border-bottom:1px solid #eee"><b>${esc(a.name||'Customer')}</b> · <b>${esc(a.type||'Consultation')}</b><div class="small">${esc(a.email||'')} · ${esc(a.mobile||'')}</div>${birth.birthDate||birth.birthTime||birth.birthPlace?'<div class="small">Birth details: DOB '+esc(birth.birthDate||'-')+' · Time '+esc(birth.birthTime||'-')+' · Place '+esc(birth.birthPlace||'-')+'</div>':''}<div class="small">Preferred: <b>${esc(a.preferredDate||'-')}</b> ${esc(a.preferredTime||'')}</div><div class="small" style="white-space:pre-wrap;overflow-wrap:anywhere">${esc(a.notes||'No notes')}</div><div class="small" style="margin-top:6px">Status: <b>${esc(current.toUpperCase())}</b></div><div class="action-row">${['new','confirmed','completed','cancelled'].map(st=>`<button type="button" class="btn ${st==='cancelled'?'gray':''}" data-apstatus="${esc(a.id)}" data-status="${st}" ${st===current?'disabled style="opacity:.65;cursor:default"':''}>${st===current?'✓ ':''}${st.toUpperCase()}</button>`).join('')}</div></div>`;}).join('');
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
  const privateRating=v=>Math.max(0,Math.min(5,Number(v)||0));
  const privateStars=v=>{const n=privateRating(v);return `<span class="smv-rating-stars" aria-label="${n.toFixed(1)} out of 5">${[0,1,2,3,4].map(i=>`<span class="smv-rating-star" style="--fill:${Math.max(0,Math.min(1,n-i))*100}%">★</span>`).join('')}</span>`;};
  const privateSummary=v=>{const n=privateRating(v);return n?`${privateStars(n)} <strong>${Number(n.toFixed(1))}/5</strong>`:'<span class="smv-rating-none">No ratings yet</span>';};
  let privateListRequest=null,privateListLoadedAt=0;
  async function loadPrivateAstrologers(){
    const host=$('privateConsultationAstrologers');if(!host)return;
    if(privateListRequest)return privateListRequest;
    if(privateListLoadedAt)return;
    if(!window.__smvGetPublicAstrologersOnce)return;
    host.innerHTML='<div class="empty">Loading approved astrologers...</div>';
    privateListRequest=(async()=>{
      try{
        const items=await window.__smvGetPublicAstrologersOnce();
        try{await fb();}catch(authError){console.warn('Firebase auth not ready for Wallet-based duration limits:',authError?.message||authError);}
        host.innerHTML='';
        for(const a of items){
          const row=document.createElement('article');row.className='smv-private-consult-row';
          const photo=a.photoData||a.photoURL||a.photoUrl||'';
          const rawLanguages=a.languages??a.spokenLanguages??a.language??[];
          const languages=Array.isArray(rawLanguages)?rawLanguages.map(v=>String(v||'').trim()).filter(Boolean):String(rawLanguages||'').split(/[,;|]/).map(v=>v.trim()).filter(Boolean);
          const availability=['online','busy','offline'].includes(String(a.availabilityStatus||'').toLowerCase())?String(a.availabilityStatus).toLowerCase():'offline';
          const callPrice=Number(a.callPricePerMinute),chatPricePerMinute=Number(a.chatPricePerMinute);
          const availabilityLabel=availability==='online'?'Online':availability==='busy'?'Busy':'Offline';
          row.innerHTML=`<div class="smv-private-consult-head">${photo?`<img class="smv-private-consult-photo" loading="lazy" decoding="async" src="${esc(photo)}" alt="${esc(a.name)}">`:''}<div class="smv-private-consult-meta"><h3>${esc(a.name||'Astrologer')}</h3><p>${esc(a.expertise||'Astrology')} · ${esc(a.experience||0)} years experience</p></div></div><div class="smv-private-rating-summary">${privateSummary(a.rating||a.averageRating)}</div><p class="smv-private-consult-description">${esc(a.profileDescription||a.bio||'Professional astrologer')}</p><p class="small"><b>Languages:</b> ${esc(languages.length?languages.join(', '):'Not specified')}</p><p class="small"><b>Availability:</b> <span>${availabilityLabel}</span></p><p><b>Call -</b> ${Number.isFinite(callPrice)&&callPrice>0?'₹'+callPrice.toFixed(2)+'/minute':'Price not configured'}</p><p><b>Chat -</b> ${Number.isFinite(chatPricePerMinute)&&chatPricePerMinute>0?'₹'+chatPricePerMinute.toFixed(2)+'/minute':'Price not configured'}</p><div class="smv-live-choice" style="margin:10px 0;padding:12px;border:1px solid var(--border,#ddd);border-radius:10px"><p class="small">Enter the duration in minutes (suggested: 1, 2, 5, 10, 15, 20, 25, 30…). The maximum is calculated from your Wallet balance and this Astrologer’s rate.</p><div class="smv-live-duration-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px"><div><label class="small"><b>Call duration (minutes)</b><input data-live-minutes="call" aria-label="Call duration in minutes" type="number" min="1" max="1440" step="1" inputmode="numeric" placeholder="Enter minutes" style="display:block;width:100%;box-sizing:border-box;margin-top:6px"></label><p class="small" data-live-limit="call">Checking Wallet…</p><button type="button" class="smv-compact-control" data-live-action="call">${availability==='online'?'CALL NOW':'REQUEST LIVE CALL'}</button></div><div><label class="small"><b>Chat duration (minutes)</b><input data-live-minutes="chat" aria-label="Chat duration in minutes" type="number" min="1" max="1440" step="1" inputmode="numeric" placeholder="Enter minutes" style="display:block;width:100%;box-sizing:border-box;margin-top:6px"></label><p class="small" data-live-limit="chat">Checking Wallet…</p><button type="button" class="smv-compact-control" data-live-action="chat">${availability==='online'?'CHAT NOW':'REQUEST LIVE CHAT'}</button></div></div><p class="small" data-live-message role="status" aria-live="polite"></p></div><div class="smv-astro-booking-actions" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px;align-items:stretch"><button type="button" class="smv-compact-control" data-book-call style="display:flex;width:100%;min-width:0;min-height:44px;box-sizing:border-box;align-items:center;justify-content:center;text-align:center;white-space:normal;overflow-wrap:anywhere;padding:8px 4px">BOOK CALL</button><button type="button" class="smv-compact-control" data-book-chat style="display:flex;width:100%;min-width:0;min-height:44px;box-sizing:border-box;align-items:center;justify-content:center;text-align:center;white-space:normal;overflow-wrap:anywhere;padding:8px 4px">BOOK CHAT</button><button type="button" class="smv-compact-control" data-reviews aria-expanded="false" style="display:flex;width:100%;min-width:0;min-height:44px;box-sizing:border-box;align-items:center;justify-content:center;text-align:center;white-space:normal;overflow-wrap:anywhere;padding:8px 4px">REVIEWS</button></div><div class="smv-inline-reviews hidden"></div>`;
          row.dataset.callRatePaise=String(smvLiveRatePaise(a,'call')||'');
          row.dataset.chatRatePaise=String(smvLiveRatePaise(a,'chat')||'');
          const liveMessage=row.querySelector('[data-live-message]');
          row.querySelectorAll('[data-live-minutes]').forEach(input=>{
            input.addEventListener('input',()=>smvRefreshLiveMinuteLimits(false).catch(()=>{}));
            input.addEventListener('change',()=>smvRefreshLiveMinuteLimits(false).catch(()=>{}));
          });
          row.querySelectorAll('[data-live-action]').forEach(liveButton=>{
            liveButton.dataset.defaultLabel=liveButton.textContent;
            const mode=liveButton.dataset.liveAction,input=row.querySelector('[data-live-minutes="'+mode+'"]');
            liveButton.onclick=()=>smvOpenLiveBirthDetails(a,mode,input?.value,liveButton,liveMessage);
          });
          const bookCall=row.querySelector('[data-book-call]'),bookChat=row.querySelector('[data-book-chat]');
          if(bookCall)bookCall.onclick=()=>openAstrologerCallBooking(a,'call').catch(err=>{console.error('Call booking request failed:',err);alert(err.message||String(err));});
          if(bookChat)bookChat.onclick=()=>openAstrologerCallBooking(a,'chat').catch(err=>{console.error('Chat booking request failed:',err);alert(err.message||String(err));});
          const button=row.querySelector('[data-reviews]'),reviews=row.querySelector('.smv-inline-reviews');
          button.onclick=async()=>{
            const open=reviews.classList.contains('hidden');reviews.classList.toggle('hidden',!open);button.setAttribute('aria-expanded',String(open));
            if(!open||reviews.dataset.loaded)return;
            reviews.textContent='Loading reviews...';
            try{const data=await window.__smvGetPublicReviewsOnce(a);const rated=data.filter(r=>privateRating(r.rating)>0);row.querySelector('.smv-private-rating-summary').innerHTML=privateSummary(rated.length?rated.reduce((n,r)=>n+privateRating(r.rating),0)/rated.length:0);reviews.innerHTML=data.length?data.map(r=>`<div class="smv-private-sub-review">${privateStars(r.rating)}<span class="smv-review-customer">${esc(r.customerName||r.name||'Verified customer')}</span><p>${esc(r.review||'Verified customer review')}</p></div>`).join(''):'No approved reviews yet.';reviews.dataset.loaded='1';}
            catch(e){reviews.textContent='Reviews are temporarily unavailable. Close and reopen to retry.';}
          };
          host.append(row);
        }
        if(!items.length)host.innerHTML='<div class="empty">No approved astrologers available yet.</div>';
        privateListLoadedAt=Date.now();
        smvRefreshLiveMinuteLimits(true).catch(()=>{});
      }catch(e){
        host.innerHTML='<div class="empty error">Unable to load approved astrologers. Please try again.</div><button type="button" class="smv-compact-control">TRY AGAIN</button>';
        host.querySelector('button').onclick=()=>loadPrivateAstrologers();
      }finally{privateListRequest=null;}
    })();return privateListRequest;
  }
  function openPrivateList(){if(!$('private-consultation')?.classList.contains('hidden'))loadPrivateAstrologers();}
  window.addEventListener('smv:private-consultation-open',openPrivateList);
  window.addEventListener('smv:app-ready',openPrivateList);
  window.addEventListener('smv:astrologer-availability-changed',()=>{
    privateListLoadedAt=0;
    if(!$('private-consultation')?.classList.contains('hidden')){
      if(!privateListRequest)loadPrivateAstrologers();
    }
  });
  window.addEventListener('smv:astrologer-pricing-changed',()=>{
    privateListLoadedAt=0;
    smvLiveWalletCache=null;
    if(!$('private-consultation')?.classList.contains('hidden')&&!privateListRequest)loadPrivateAstrologers();
  });
  window.addEventListener('smv:auth-user',()=>{
    smvLiveWalletCache=null;
    smvRefreshLiveMinuteLimits(true).catch(()=>{});
  });
  window.addEventListener('smv:logged-out',()=>{
    smvLiveWalletCache=null;
    smvRefreshLiveMinuteLimits(false).catch(()=>{});
  });
  openPrivateList();
  window.addEventListener('smv:logged-out',()=>{
    window.__smvSelectedPrivateConsultAstrologer=null;
    walletBookingRequestId=null;walletBookingRequestOwner='';
    $('privateConsultationQuestionForm')?.reset();
    $('privateConsultationQuestionCard')?.classList.add('hidden');
  });
  async function refreshPrivateOfferQuote(showInvalid=false){
    const astro=window.__smvSelectedPrivateConsultAstrologer;
    const summary=$('privateConsultPaymentSummary'),msg=$('privateConsultOfferMsg');
    if(!astro?.id||Number(astro.chatPrice)<1)return null;
    const u=window.__smvFirebaseCurrentUser;
    if(!u||String(window.__smvCurrentRole||'').toLowerCase()!=='customer')return null;
    const code=String($('privateConsultPromoCode')?.value||'').trim();
    try{
      const token=await u.getIdToken();
      const r=await fetch(BACKEND+'/offers/quote',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({service:'private_consultation',originalAmount:Number(astro.chatPrice),promoCode:code}),cache:'no-store'});
      const q=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(q.error||`Offer service returned HTTP ${r.status}.`);
      if(q.offerId){
        if(summary){summary.innerHTML=`Private Consultation Chat Price: <s>₹${Number(q.originalAmount).toFixed(2)}</s> <b>₹${Number(q.finalAmount).toFixed(2)}</b>`;summary.dataset.smvOfferFinal=String(q.finalAmount);summary.dataset.smvOfferOriginal=String(q.originalAmount);}
        if(msg)msg.innerHTML=`<span class="success">${esc(q.bannerText||q.offerName||'Offer applied')}</span>`;
      }else{
        if(summary){summary.textContent='Private Consultation Chat Price: ₹'+Number(astro.chatPrice).toFixed(2);delete summary.dataset.smvOfferFinal;delete summary.dataset.smvOfferOriginal;}
        if(msg)msg.innerHTML=code&&showInvalid?'<span class="error">Promotion code is not valid or not eligible for this account.</span>':'';
      }
      return q;
    }catch(err){if(msg&&showInvalid)msg.innerHTML='<span class="error">'+esc(err.message||String(err))+'</span>';return null;}
  }
  $('privateConsultApplyPromo')?.addEventListener('click',()=>refreshPrivateOfferQuote(true));

  async function selectPrivateAstrologer(astro,button){
    let user=window.__smvFirebaseCurrentUser||null;
    if(!user){
      alert('Customer Login Required — Please login with a Customer account to select an astrologer.');
      $('authBtn')?.click();
      return;
    }
    let role=String(window.__smvCurrentRole||'').toLowerCase();
    // Fresh/cold reopen intentionally leaves the role unresolved so Home stays
    // fresh without a profile read. Resolve it only now, on this explicit action.
    if(role!=='customer' && typeof window.__smvEnsureCustomerSession==='function'){
      const originalText=button?.textContent||'SELECT ASTROLOGER';
      if(button){button.disabled=true;button.textContent='CHECKING SESSION…';}
      try{
        const session=await window.__smvEnsureCustomerSession();
        user=session?.user||window.__smvFirebaseCurrentUser||null;
        role=String(session?.role||window.__smvCurrentRole||'').toLowerCase();
      }catch(err){
        console.warn('Private Consultation session check failed:',err);
      }finally{
        if(button){button.disabled=false;button.textContent=originalText;}
      }
    }
    if(!user){
      alert('Customer Login Required — Please login with a Customer account to select an astrologer.');
      $('authBtn')?.click();
      return;
    }
    if(role!=='customer'){
      alert('Private Consultation is available only for Customer accounts. Please use a Customer login.');
      return;
    }
    if(window.__smvSelectedPrivateConsultAstrologer?.id===astro.id){$('privateConsultationQuestionCard')?.classList.remove('hidden');$('privateConsultationQuestionCard')?.scrollIntoView({behavior:'smooth',block:'start'});return;}
    $('smvPrivateAutomaticOffer')?.remove();
    if(window.__smvSelectedPrivateConsultAstrologer?.id!==astro.id){walletBookingRequestId=null;walletBookingRequestOwner='';}
    window.__smvSelectedPrivateConsultAstrologer={id:astro.id,name:astro.name||'Astrologer',chatPrice:Number(astro.chatPrice||0)};
    document.querySelectorAll('.smv-private-consult-select').forEach(el=>{el.textContent=el===button?'SELECTED':'SELECT ASTROLOGER';});
    $('privateConsultationSelected').textContent='Selected Astrologer: '+astro.name;
    const summary=$('privateConsultPaymentSummary');
    summary.textContent='Private Consultation Chat Price: ₹'+Number(astro.chatPrice).toFixed(2);
    delete summary.dataset.smvOfferFinal;delete summary.dataset.smvOfferOriginal;
    $('privateConsultationQuestionCard')?.classList.remove('hidden');
    refreshPrivateOfferQuote(false).catch(()=>{});
    $('privateConsultationQuestionCard')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  window.__smvSelectPrivateAstrologer=selectPrivateAstrologer;

  let checkoutRequest=null;
  function ensurePrivateCheckout(){
    if(typeof window.Razorpay==='function')return Promise.resolve();
    if(checkoutRequest)return checkoutRequest;
    checkoutRequest=new Promise((resolve,reject)=>{
      let script=document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      const timer=setTimeout(()=>finish(new Error('Payment checkout timed out. Please retry.')),15000);
      function finish(error){clearTimeout(timer);script?.removeEventListener('load',loaded);script?.removeEventListener('error',failed);if(error){script?.remove();reject(error);}else resolve();}
      function loaded(){finish(typeof window.Razorpay==='function'?null:new Error('Payment checkout unavailable.'));}
      function failed(){finish(new Error('Payment checkout could not load. Please retry.'));}
      if(!script){script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';document.head.append(script);}
      script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});
    }).finally(()=>checkoutRequest=null);return checkoutRequest;
  }
  let privateConsultSubmitting=false;
  let walletBookingRequestId=null,walletBookingRequestOwner='';
  async function submitPrivateConsultation(e){
    e.preventDefault();
    if(privateConsultSubmitting)return;
    const astro=window.__smvSelectedPrivateConsultAstrologer;
    const paymentMethod=String(e.submitter?.value||'razorpay').toLowerCase()==='wallet'?'wallet':'razorpay';
    const msg=$('privateConsultMsg'),btn=paymentMethod==='wallet'? $('privateConsultWalletPayBtn'):$('privateConsultPayBtn');
    const actionButtons=[$('privateConsultWalletPayBtn'),$('privateConsultPayBtn')].filter(Boolean);
    const enableButtons=()=>actionButtons.forEach(button=>{button.disabled=false;});
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
    const originalLabel=btn?.textContent||(paymentMethod==='wallet'?'PAY WITH WALLET':'PAY WITH RAZORPAY');
    let paymentFlow=null,checkoutReadyPromise=null;
    if(paymentMethod==='razorpay'){
      paymentFlow=window.__smvStartPaymentWindow?.('private')||null;
      checkoutReadyPromise=(paymentFlow
        ? paymentFlow.ensureRazorpay()
        : ensurePrivateCheckout().then(()=>window))
        .then(value=>({value}),error=>({error}));
    }
    privateConsultSubmitting=true;actionButtons.forEach(button=>{button.disabled=true;});
    if(btn)btn.textContent=paymentMethod==='wallet'?'PROCESSING WALLET PAYMENT…':'PREPARING PAYMENT…';
    if(paymentMethod==='razorpay')paymentFlow?.status?.('Preparing secure payment…');
    try{
      const u=window.__smvFirebaseCurrentUser;
      if(!u || String(window.__smvCurrentRole||'').toLowerCase()!=='customer')throw new Error('Please login with your Customer account before payment.');
      const token=await u.getIdToken();
      const api=async(path,body)=>{
        const started=performance.now();
        const r=await fetch(BACKEND+path,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body),cache:'no-store'});
        const d=await r.json().catch(()=>({}));window.__smvRecordTiming?.(path,performance.now()-started,r.ok);if(!r.ok)throw new Error(d.error||`Service returned HTTP ${r.status}.`);return d;
      };
      const requestPayload={...payload,paymentMethod};
      if(paymentMethod==='wallet'){
        const owner=String(u.uid)+':'+String(astro.id);
        if(walletBookingRequestOwner!==owner||!walletBookingRequestId){
          walletBookingRequestOwner=owner;
          walletBookingRequestId=(window.crypto&&typeof window.crypto.randomUUID==='function')?window.crypto.randomUUID():('pcw-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
        }
        requestPayload.requestId=walletBookingRequestId;
      }
      const order=await api('/private-consultation/create-order',requestPayload);
      if(paymentMethod==='wallet'){
        if(!order?.verified||!order?.walletPaid||!order?.consultationId||!String(order?.customerPaymentId||order?.paymentId||'')){
          throw new Error(order?.error||'The backend did not confirm the Wallet debit and consultation booking. No payment success is shown.');
        }
        const paymentId=String(order.customerPaymentId||order.paymentId);
        walletBookingRequestId=null;walletBookingRequestOwner='';
        privateConsultSubmitting=false;
        if(msg)msg.textContent='';
        if(btn)btn.textContent='WALLET PAYMENT DONE ✓';
        try{
          if(typeof window.__smvShowVerifiedPayment==='function'){
            await window.__smvShowVerifiedPayment({...order,verified:true,paymentId},'private',null);
          }else{
            const dashboardButton=$('dashLink');
            if(dashboardButton)dashboardButton.click();
            if(msg){msg.className='small success';msg.textContent='Wallet payment confirmed. Your chat booking is saved. Open Customer Dashboard to view it. Do not pay again.';}
          }
        }catch(receiptError){
          console.error('Wallet payment was confirmed, but receipt navigation failed:',receiptError);
          if(msg){msg.className='small success';msg.textContent='Wallet payment confirmed and booking saved. Do not pay again. Open Customer Dashboard to view the booking.';}
          $('dashLink')?.click();
        }
        return;
      }
      paymentFlow?.status?.('Private Consultation ID created. Opening secure Payment Gateway…');
      const checkoutReady=await checkoutReadyPromise;
      if(checkoutReady?.error)throw checkoutReady.error;
      const checkoutWindow=checkoutReady?.value;
      const RazorpayCtor=checkoutWindow?.Razorpay||window.Razorpay;
      if(!order?.orderId||!order?.keyId||!order?.consultationId)throw new Error('Private consultation payment order was not created correctly.');
      if(order?.offerId&&msg)msg.innerHTML='<span class="success">'+esc(order.offerBannerText||order.offerName||'Offer applied')+' — Pay ₹'+(Number(order.amount||0)/100).toFixed(2)+'</span>';
      if(typeof RazorpayCtor!=='function')throw new Error('Payment checkout is not ready. Please refresh and try again.');
      const options={
        key:order.keyId,amount:order.amount,currency:order.currency||'INR',name:'SMV ASTRO SERVICES',
        description:'Private Astrology Consultation',order_id:order.orderId,
        prefill:{email:u.email||''},notes:{consultationId:order.consultationId,astrologerId:String(astro.id)},
        theme:{color:'#6b21a8'},
        handler:async response=>{
          paymentFlow?.status?.('Payment received. Verifying Payment and creating Payment ID…');
          try{
            const vr=await api('/private-consultation/verify-payment',{
              consultationId:order.consultationId,razorpay_order_id:response.razorpay_order_id,
              razorpay_payment_id:response.razorpay_payment_id,razorpay_signature:response.razorpay_signature
            });
            if(!vr?.verified)throw new Error(vr?.error||'Payment verification failed.');
            const paymentId=String(vr.paymentId||vr.razorpayPaymentId||response.razorpay_payment_id||'').trim();
            if(!paymentId)throw new Error('Verified payment did not return Payment ID. Do not pay again; check Customer Dashboard.');
            if(msg)msg.innerHTML='';
            if(btn)btn.textContent='PAYMENT DONE ✓';
            privateConsultSubmitting=false;
            try{
              await window.__smvShowVerifiedPayment?.({...vr,verified:true,consultationId:vr.consultationId||order.consultationId,paymentId},'private',paymentFlow);
            }catch(receiptError){
              console.error('Razorpay payment was verified, but receipt navigation failed:',receiptError);
              if(msg)msg.innerHTML='<span class="success">Payment verified and booking saved. Do not pay again. Open Customer Dashboard to view the booking.</span>';
              $('dashLink')?.click();
            }
          }catch(err){paymentFlow?.error?.('Payment received, but verification could not finish: '+(err.message||String(err)));if(msg)msg.innerHTML='<span class="error">Payment received, but verification could not finish. Do not pay again; check Customer Dashboard / support.<br>'+esc(err.message||String(err))+'</span>';privateConsultSubmitting=false;if(btn)btn.textContent=originalLabel;enableButtons();}
        },
        modal:{ondismiss:()=>{privateConsultSubmitting=false;paymentFlow?.error?.('Payment window closed. No payment was confirmed.');setTimeout(()=>paymentFlow?.close?.(),1400);if(btn)btn.textContent=originalLabel;enableButtons();}}
      };
      const rzp=new RazorpayCtor(options);
      rzp.on?.('payment.failed',resp=>{privateConsultSubmitting=false;paymentFlow?.error?.('Payment failed: '+(resp?.error?.description||'Please retry.'));setTimeout(()=>paymentFlow?.close?.(),1800);if(msg)msg.innerHTML='<span class="error">'+esc(resp?.error?.description||'Payment failed. Please retry.')+'</span>';if(btn)btn.textContent=originalLabel;enableButtons();});
      if(btn)btn.textContent='PAYMENT WINDOW OPEN';
      rzp.open();
    }catch(err){
      privateConsultSubmitting=false;
      paymentFlow?.error?.('Payment could not be started: '+(err.message||String(err)));setTimeout(()=>paymentFlow?.close?.(),1800);
      if(msg)msg.innerHTML='<span class="error">'+esc(err.message||String(err))+'</span>';
      if(btn)btn.textContent=originalLabel;
      enableButtons();
    }
  }

  function setupAsk(){
  const privateForm=$('privateConsultationQuestionForm');
  privateForm?.addEventListener('submit',submitPrivateConsultation);
  ['input','change'].forEach(eventName=>privateForm?.addEventListener(eventName,()=>{
    if(!privateConsultSubmitting){walletBookingRequestId=null;walletBookingRequestOwner='';}
  }));
  $('privateConsultationQuestionClose')?.addEventListener('click',()=>{
    $('privateConsultationQuestionCard')?.classList.add('hidden');
    window.__smvSelectedPrivateConsultAstrologer=null;
    document.querySelectorAll('[data-private-consult-astro]').forEach(b=>{b.textContent='SELECT ASTROLOGER';b.disabled=false;});
    const selected=$('privateConsultationSelected'),summary=$('privateConsultPaymentSummary'),msg=$('privateConsultMsg');
    walletBookingRequestId=null;walletBookingRequestOwner='';
    if(selected)selected.textContent='';
    if(summary)summary.textContent='';
    if(msg)msg.textContent='';
    if($('privateConsultOfferMsg'))$('privateConsultOfferMsg').textContent='';
    $('privateConsultationQuestionForm')?.reset();
    $('privateConsultationAstrologers')?.scrollIntoView({behavior:'smooth',block:'start'});
  });
  // Legacy fixed-price question submission remains for saved-history compatibility,
  // but new consultation entry points use the per-minute Live Call / Live Chat directory.
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
  setupBooking();setupAsk();if($('publicQuestionPrice'))loadQuestionPrice().catch(()=>{});hookAdmin();armPublicReviewsLazyLoad();
  // Admin data loaders are triggered explicitly after Admin authentication.
})();
  document.getElementById("contactNav")?.addEventListener("click",e=>{e.preventDefault();document.getElementById("contact")?.classList.remove("hidden");document.getElementById("contact")?.scrollIntoView({behavior:"smooth",block:"start"});});
