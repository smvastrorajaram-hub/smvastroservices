
(function(){
  const BACKEND_URL=(window.SMV_BACKEND_URL||'');
  const $=id=>document.getElementById(id);

  function setupLocation(prefix){
    const place=$(prefix+'BirthPlace'),lat=$(prefix+'Lat'),lon=$(prefix+'Lon');
    if(!place||!lat||!lon||place.dataset.smvLocationBound==='1')return;
    place.dataset.smvLocationBound='1';
    const parent=place.parentElement; parent.classList.add('smv-location-wrap');
    const list=document.createElement('div'); list.className='smv-location-suggestions'; list.setAttribute('role','listbox'); parent.appendChild(list);
    const status=document.createElement('div'); status.className='smv-location-status'; parent.appendChild(status);
    let timer=null,controller=null,lastQuery='';
    function clear(){list.innerHTML='';list.classList.remove('show');}
    function statusText(t,c){status.textContent=t||'';status.className='smv-location-status'+(c?' '+c:'');}
    function choose(x){place.value=x.place||'';lat.value=Number(x.latitude).toFixed(6);lon.value=Number(x.longitude).toFixed(6);if($('birthUtcOffset'))$('birthUtcOffset').value='5.5';place.dataset.locationSelected='1';place.dataset.latitude=String(x.latitude);place.dataset.longitude=String(x.longitude);clear();statusText('');}
    function render(items){clear();if(!items.length){statusText(text('No matching location found. Please type a little more.','பொருத்தமான இடம் கிடைக்கவில்லை. மேலும் சில எழுத்துகளை உள்ளிடவும்.'),'err');return;}items.forEach(x=>{const b=document.createElement('button');b.type='button';b.className='smv-location-suggestion';b.setAttribute('role','option');b.textContent=x.place;b.addEventListener('click',()=>choose(x));list.appendChild(b);});list.classList.add('show');statusText(text('Select your exact place from the list.','பட்டியலிலிருந்து சரியான இடத்தைத் தேர்ந்தெடுக்கவும்.'),'');}
    async function search(q){if(q.length<2){clear();statusText('','');return;}if(q===lastQuery)return;lastQuery=q;if(controller)controller.abort();controller=new AbortController();statusText(text('Searching location…','இடம் தேடப்படுகிறது…'),'');try{const r=await fetch((window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||''))+'/api/geocode?q='+encodeURIComponent(q),{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Location search failed');render(Array.isArray(data.results)?data.results:[]);}catch(e){if(e.name==='AbortError')return;clear();statusText(text('Unable to search location. Enter coordinates manually.','இடத்தைத் தேட முடியவில்லை. அட்சரேகை, தீர்க்கரேகையை உள்ளிடவும்.'),'err');}}
    place.addEventListener('input',()=>{place.dataset.locationSelected='0';lat.value='';lon.value='';lastQuery='';clearTimeout(timer);timer=setTimeout(()=>search(place.value.trim()),500);});
    place.addEventListener('focus',()=>{if(place.value.trim().length>=2&&list.children.length)list.classList.add('show');});
    document.addEventListener('click',e=>{if(!parent.contains(e.target))clear();});
  }
  setupLocation('english');
  const text=(en,ta)=>document.documentElement.lang==='ta'?ta:en;
  let busy=false;
  window.__smvHoroscopeIsBusy=()=>busy||window.__smvSnapshotBusy;

  $('generateEnglishHoroscope')?.addEventListener('click',async()=>{
    if(busy)return;
    const lang=document.documentElement.lang==='ta'?'ta':'en';
    // V90: lock the language at Generate click. Payment/PDF/save must use this immutable generation language.
    const generationLanguage=lang;
    try{await window.SMVEngineReady;}catch{alert(text('Offline engine could not start. Reopen with internet to download the app files.','இணையமில்லா கணிப்பு இயங்கவில்லை. கோப்புகளைப் பதிவிறக்க இணைய இணைப்புடன் மீண்டும் திறக்கவும்.'));return;}
    const date=$('englishDob')?.value||'',time=$('englishTob')?.value||'',place=$('englishBirthPlace')?.value.trim()||'',lat=$('englishLat')?.value||'',lon=$('englishLon')?.value||'';
    if(Number(date.slice(0,4))<1800||Number(date.slice(0,4))>2399){alert(text('Supported birth years: 1800–2399.','ஆதரிக்கப்படும் பிறந்த ஆண்டுகள்: 1800–2399.'));return;}
    const off=$('birthUtcOffset');if(!off.value||!Number.isFinite(Number(off.value))||Number(off.value)<-12||Number(off.value)>14){alert(text('Enter a valid UTC offset from −12 to +14 hours.','−12 முதல் +14 மணி வரை சரியான நேர வேறுபாட்டை உள்ளிடவும்.'));return;}
    if(!date||!time){alert(text('Enter the date and time of birth.','பிறந்த தேதி மற்றும் நேரத்தை உள்ளிடவும்.'));return;}
    if(!place||place.length<2){
  alert(text('Enter your Place of Birth.','பிறந்த இடத்தை உள்ளிடவும்.'));
  return;
}

if(lat===''||lon===''){
  alert(text('If the location is not available in the search list, enter Place of Birth, Latitude and Longitude manually.','பட்டியலில் இடம் கிடைக்காவிட்டால் பிறந்த இடம், அட்சரேகை, தீர்க்கரேகையை நேரடியாக உள்ளிடவும்.'));
  return;
}
    // The existing, tested Swiss-Ephemeris renderer is reused as the calculation engine.
    // Its output is then translated into English; no second astronomical engine is introduced.
    const copy=(a,b)=>{if($(a)&&$(b))$(b).value=$(a).value;};
    copy('englishAstroName','tamilAstroName');copy('englishDob','tamilDob');copy('englishTob','tamilTob');copy('englishBirthPlace','tamilBirthPlace');copy('englishLat','tamilLat');copy('englishLon','tamilLon');copy('englishNakshatra','tamilNakshatra');
    const rmap=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
    const emap=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ei=emap.indexOf($('englishRasi')?.value||'Aries');if($('tamilRasi'))$('tamilRasi').value=rmap[Math.max(0,ei)];
    const tplace=$('tamilBirthPlace');tplace.dataset.locationSelected='1';tplace.dataset.latitude=$('englishLat').value;tplace.dataset.longitude=$('englishLon').value;
    try{localStorage.setItem('smvLanguage',lang);}catch(_e){}
    busy=true;document.querySelectorAll('.smv-language-buttons button,#clearEnglishHoroscope').forEach(b=>b.disabled=true);
    const englishResult=$('englishHoroscopeResult');
    // FINAL HOROSCOPE RELEASE RULE: do not open/show the horoscope result while
    // any calculation is still running. The Create Horoscope button is the only
    // loading indicator; chart + all new features are released together.
    if(englishResult){
      englishResult.classList.add('hidden');
      englishResult.setAttribute('aria-busy','true');
      englishResult.innerHTML='';
    }
    const btn=$('generateEnglishHoroscope');
    if(btn){btn.disabled=true;btn.textContent=text('⏳ Creating Horoscope…','⏳ ஜாதகம் உருவாகிறது…');}
    let englishProgress=$('englishHoroscopeProgress'); if(!englishProgress&&btn){englishProgress=document.createElement('div');englishProgress.id='englishHoroscopeProgress';englishProgress.className='smv-horoscope-progress';englishProgress.innerHTML='<span class="spin"></span><span>'+text('Creating Horoscope… Preparing all calculations and features…','ஜாதகம் உருவாகிறது… அனைத்துக் கணக்கீடுகளும் தயாராகின்றன…')+'</span>';btn.insertAdjacentElement('afterend',englishProgress);}
    try{
      const normalizeHoroscopeTime=value=>{
        const s=String(value||'').trim();
        let m=s.match(/^(\d{1,2}):([0-5]\d)$/);
        if(m){const h=Number(m[1]);if(h>=0&&h<=23)return `${String(h).padStart(2,'0')}:${m[2]}`;}
        m=s.match(/^(\d{1,2})[.:]([0-5]\d)\s*(AM|PM)$/i);
        if(m){let h=Number(m[1]);const ap=m[3].toUpperCase();if(h<1||h>12)return '';if(ap==='AM')h=h===12?0:h;else h=h===12?12:h+12;return `${String(h).padStart(2,'0')}:${m[2]}`;}
        return '';
      };
      const normalizedTime=normalizeHoroscopeTime(time);
      if(!normalizedTime)throw new Error('Enter a valid birth time, for example 22:05 (10:05 PM).');
      if(typeof window.__smvGenerateHoroscopeEngine!=='function')throw new Error('Horoscope engine is not ready. Please refresh the page.');
      // ENGLISH FLOW REPAIR:
      // Do NOT start a second Advanced request against the Tamil DOM and do NOT copy
      // a partially populated Advanced tree. First build the core chart, copy only
      // that stable core result, rename the containers, then run ONE complete
      // /api/horoscope/full request directly into the English Advanced root.
      window.__smvSetReportContext?.('advanced_analysis',{date,time:normalizedTime,lat,lon,utcOffsetMinutes:Number($('birthUtcOffset')?.value??5.5)*60,language:generationLanguage});
      if(await window.__smvOpenMatchingSavedReport?.('advanced_analysis',window.__smvGetReportContext('advanced_analysis')))return;
      const generated=await window.__smvGenerateHoroscopeEngine(false);
      const source=$('tamilHoroscopeResult'),target=$('englishHoroscopeResult');
      if(source&&target&&source.innerHTML.trim()){
        target.innerHTML=source.innerHTML;
        source.innerHTML=''; // One live result tree; no duplicate result IDs or stale handlers.
        const copiedAdv=target.querySelector('#tamilAdvancedAstrology');
        if(copiedAdv){ copiedAdv.id='englishAdvancedAstrology'; copiedAdv.classList.add('hidden'); }
        const copiedTransitSlot=target.querySelector('#tamilDailyTransitPanchangSlot');
        if(copiedTransitSlot) copiedTransitSlot.id='englishDailyTransitPanchangSlot';

        target.classList.add('hidden');target.setAttribute('aria-busy','true');
        source.classList.add('hidden');

        if(typeof window.__smvApplyEnglishToHoroscope!=='function') throw new Error('English horoscope translator is not ready. Please refresh the page.');
        if(typeof window.__smvBindHoroscopeInteractions!=='function') throw new Error('English horoscope interactions are not ready. Please refresh the page.');
        if(lang==='en')window.__smvApplyEnglishToHoroscope(target);
        window.__smvBindHoroscopeInteractions(target,generated||{},$('englishAstroName')?.value?.trim()||'User',lang);

        await window.__smvLoadBasicPanchang({...window.__smvGetReportContext('advanced_analysis'),language:lang},target);
        const originalBirth=window.__smvGetReportContext('advanced_analysis'),basicSnapshot=target.__smvBasicData,reportName=($('englishAstroName')?.value||'Horoscope').trim();
        let completedFull=null;
        window.__smvSwitchHoroscopeLanguage=async(next,quiet=false)=>{
          if(busy)return;busy=true;
          try{
            await target.__smvPrepareReport?.();
            window.__smvRenderCachedCore(generated);target.innerHTML=source.innerHTML;source.innerHTML='';source.classList.add('hidden');
            const adv=target.querySelector('#tamilAdvancedAstrology');if(adv)adv.id='englishAdvancedAstrology';
            const tr=target.querySelector('#tamilDailyTransitPanchangSlot');if(tr)tr.id='englishDailyTransitPanchangSlot';
            window.__smvRenderBasicSnapshot(basicSnapshot,target,next,originalBirth);
            if(next==='en')window.__smvApplyEnglishToHoroscope(target);
            window.__smvBindHoroscopeInteractions(target,generated,reportName,next);
            if(completedFull)await window.__smvLoadAdvancedAstrology({...originalBirth,lang:next,rootId:'englishAdvancedAstrology',name:reportName,chart:generated,generationId:window.__smvHoroscopeGenerationId,cachedFull:completedFull,cachedBasic:basicSnapshot});
            else if(adv){adv.classList.remove('hidden');await window.__smvRequireHoroscopeFeatureAccess('advanced_analysis',adv,()=>{window.__smvSwitchHoroscopeLanguage=null;$('generateEnglishHoroscope').click();});}
            await window.__smvPredictionRenderPromise;
            window.__smvLocalizeTamilResult?.(target,next);target.dataset.resultLanguage=next;target.dataset.generationLanguage=next;target.classList.remove('hidden');target.setAttribute('aria-busy','false');
            // V92: a paid report may be rendered later in the other language from the already-cached
            // calculation. Save/generate ONLY that language now; never recalculate or build both languages.
            if(completedFull){
              window.__smvSetReportContext?.('advanced_analysis',{...originalBirth,language:next});
              window.dispatchEvent(new CustomEvent('smv:report-ready',{detail:{feature:'advanced_analysis',root:target,generationLanguage:next,birthIdentity:window.__smvGetReportContext('advanced_analysis')||originalBirth,name:reportName,calculation:completedFull}}));
            }
          }finally{busy=false;}
        };

        const buildViews=async()=>{
          // V92: snapshot only the language currently on screen. Building the alternate language here
          // caused the old EN -> TA -> EN delay and could start an unwanted second PDF save.
          const current=target.dataset.resultLanguage||generationLanguage,views={};
          await target.__smvPrepareReport?.();
          if(current==='en')window.__smvApplyEnglishToHoroscope(target);
          window.__smvLocalizeTamilResult?.(target,current);
          views[current]=target.innerHTML;
          return views;
        };
        const englishAdvancedRoot=$('englishAdvancedAstrology');
        if(!englishAdvancedRoot || typeof window.__smvLoadAdvancedAstrology!=='function'){
          throw new Error('English Advanced Astrology container is not ready.');
        }
        // V62 ROOT: core horoscope is free and rendered first. Advanced Analysis is
        // never calculated behind the paywall. Admin OFF hides it; ₹0 continues free;
        // ₹Price waits for a server-verified Razorpay payment before calculation.
        if(typeof window.__smvRequireHoroscopeFeatureAccess==='function'){
          target.classList.remove('hidden'); target.setAttribute('aria-busy','false');
          englishAdvancedRoot.classList.remove('hidden');
          const runEnglishAdvanced=async()=>{
            target.classList.add('hidden'); target.setAttribute('aria-busy','true');
            englishAdvancedRoot.innerHTML='';
            await window.__smvLoadAdvancedAstrology({date,time:normalizedTime,lat,lon,lang,rootId:'englishAdvancedAstrology',name:($('englishAstroName')?.value||'').trim(),chart:generated||null,generationId:window.__smvHoroscopeGenerationId,cachedBasic:basicSnapshot});
            await window.__smvPredictionRenderPromise;
            completedFull=window.__smvLastFullReport;
            window.__smvLocalizeTamilResult?.(target,generationLanguage);target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
            target.classList.remove('hidden'); target.setAttribute('aria-busy','false');
            window.dispatchEvent(new CustomEvent('smv:report-ready',{detail:{feature:'advanced_analysis',root:target,generationLanguage,prepareViews:buildViews,birthIdentity:window.__smvGetReportContext('advanced_analysis'),name:($('englishAstroName')?.value||'Horoscope').trim(),calculation:window.__smvLastFullReport||generated}}));
          };
          const allowed=await window.__smvRequireHoroscopeFeatureAccess('advanced_analysis',englishAdvancedRoot,runEnglishAdvanced);
          if(!allowed){
            target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
            // Basic/free result must use the same final language renderer as the paid result.
            if(generationLanguage==='en')window.__smvApplyEnglishToHoroscope?.(target);
            window.__smvLocalizeTamilResult?.(target,generationLanguage);
            window.dispatchEvent(new CustomEvent('smv:report-ready',{detail:{feature:'advanced_analysis',root:target,generationLanguage,prepareViews:buildViews,birthIdentity:window.__smvGetReportContext('advanced_analysis'),name:($('englishAstroName')?.value||'Horoscope').trim(),calculation:generated,basicOnly:true}}));
            target.scrollIntoView({behavior:'smooth',block:'start'});
            return;
          }
          await runEnglishAdvanced();
        }else{
          throw new Error('Payment access check is not ready. Reload and try again.');
        }

        /* SINGLE ENGLISH RELEASE: the complete core + Advanced + Panchang +
           Transit + Dasa batch is now ready. */
        if(lang==='en'&&typeof window.__smvForceEnglishRahuRetrograde==='function'){
          window.__smvForceEnglishRahuRetrograde(target);
        }
        const parts=[...target.querySelectorAll('.smv-advanced-part')];
        if(parts.length!==10||parts.slice(0,9).some(p=>!p.querySelector('.smv-advanced-part-content')?.textContent.trim()))throw new Error(text('The core Advanced Analysis sections are incomplete. Please retry.','முக்கிய மேம்பட்ட பகுப்பாய்வு பகுதிகள் முழுமையாக வரவில்லை. மீண்டும் முயற்சிக்கவும்.'));
        if(generationLanguage==='en')window.__smvApplyEnglishToHoroscope?.(target);
        window.__smvLocalizeTamilResult?.(target,generationLanguage);
        target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
        target.classList.remove('hidden');
        target.setAttribute('aria-busy','false');
        if(lang==='en'&&typeof window.__smvFixEnglishBhavaHeaders==='function') window.__smvFixEnglishBhavaHeaders();
        target.scrollIntoView({behavior:'smooth',block:'start'});
      }else throw new Error('Horoscope result was not returned.');
    }catch(e){
      if(englishResult){englishResult.setAttribute('aria-busy','false');englishResult.classList.add('hidden');englishResult.innerHTML='';}
      console.error(e);alert(text('Horoscope could not be completed. Check the birth details and downloaded app files.','ஜாதகத்தை முழுமையாக உருவாக்க முடியவில்லை. பிறப்பு விவரங்களையும் செயலிக் கோப்புகளையும் சரிபார்க்கவும்.'));
    }
    finally{
      if(englishResult) englishResult.setAttribute('aria-busy','false');
      if(btn){btn.disabled=false;btn.textContent=text('Create Horoscope','ஜாதகம் உருவாக்குக');}
      if(englishProgress) englishProgress.remove();
      busy=false;document.querySelectorAll('.smv-language-buttons button,#clearEnglishHoroscope').forEach(b=>b.disabled=false);
    }
  });
  $('clearEnglishHoroscope')?.addEventListener('click',()=>{['englishAstroName','englishDob','englishTob','englishBirthPlace','englishNakshatra','englishLat','englishLon'].forEach(id=>{if($(id))$(id).value='';});if($('englishRasi'))$('englishRasi').value='Aries';if($('englishBirthPlace')){$('englishBirthPlace').dataset.locationSelected='0';$('englishBirthPlace').dataset.latitude='';$('englishBirthPlace').dataset.longitude='';}if($('englishHoroscopeResult')){$('englishHoroscopeResult').classList.add('hidden');$('englishHoroscopeResult').innerHTML='';}});
document.querySelectorAll('a[href="#english-horoscope"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const section=$('english-horoscope');section?.classList.remove('hidden');section?.scrollIntoView({behavior:'smooth',block:'start'});history.replaceState(null,'','#english-horoscope');}));
})();
