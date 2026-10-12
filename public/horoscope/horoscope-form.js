
(function(){
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
    async function search(q){if(q.length<2){controller?.abort();controller=null;clear();statusText('','');return;}if(q===lastQuery)return;lastQuery=q;controller?.abort();controller=new AbortController();statusText(text('Searching location…','இடம் தேடப்படுகிறது…'),'');try{if(typeof window.__smvSearchPlacesOnlineOffline!=='function')throw new Error('Location search module is not ready.');const rows=await window.__smvSearchPlacesOnlineOffline(q,50,controller.signal);render(rows);}catch(e){if(e?.name==='AbortError')return;clear();statusText(text('Location search is unavailable. Enter coordinates manually.','இடத் தேடல் கிடைக்கவில்லை. அட்சரேகை, தீர்க்கரேகையை உள்ளிடவும்.'),'err');}}
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
    // V90: lock the language at Generate click. The generated report language remains immutable for this calculation.
    const generationLanguage=lang;
    let phase='startup';
    try{await window.SMVEngineReady;}catch{alert(text('Offline engine could not start. Reopen with internet to download the app files.','இணையமில்லா கணிப்பு இயங்கவில்லை. கோப்புகளைப் பதிவிறக்க இணைய இணைப்புடன் மீண்டும் திறக்கவும்.'));return;}
    const date=$('englishDob')?.value||'',time=$('englishTob')?.value||'',place=$('englishBirthPlace')?.value.trim()||'',lat=$('englishLat')?.value||'',lon=$('englishLon')?.value||'',currentWork=$('englishCurrentWork')?.value||'',maritalStatus=$('englishMaritalStatus')?.value||'',currentResidence=$('englishCurrentResidence')?.value?.trim()||'';
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
    copy('englishAstroName','tamilAstroName');copy('englishDob','tamilDob');copy('englishTob','tamilTob');copy('englishBirthPlace','tamilBirthPlace');copy('englishLat','tamilLat');copy('englishLon','tamilLon');copy('englishNakshatra','tamilNakshatra');copy('englishCurrentWork','tamilCurrentWork');copy('englishMaritalStatus','tamilMaritalStatus');copy('englishCurrentResidence','tamilCurrentResidence');
    const rmap=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
    const emap=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const ei=emap.indexOf($('englishRasi')?.value||'Aries');if($('tamilRasi'))$('tamilRasi').value=rmap[Math.max(0,ei)];
    const tplace=$('tamilBirthPlace');tplace.dataset.locationSelected='1';tplace.dataset.latitude=$('englishLat').value;tplace.dataset.longitude=$('englishLon').value;
    try{localStorage.setItem('smvLanguage',lang);}catch(_e){}
    busy=true;document.querySelectorAll('.smv-language-buttons button,#clearEnglishHoroscope').forEach(b=>b.disabled=true);
    const englishResult=$('englishHoroscopeResult');
    // Clear only the previous, user-visible diagnostic. No automatic re-fetch or retry.
    $('smvHoroscopeGenerationError')?.remove();
    // FINAL HOROSCOPE RELEASE RULE: do not open/show the horoscope result while
    // any calculation is still running. The Create Horoscope button is the only
    // loading indicator; chart + all new features are released together.
    if(englishResult){
      englishResult.classList.add('hidden');
      englishResult.setAttribute('aria-busy','true');
      englishResult.removeAttribute('data-smv-report-incomplete');
      englishResult.innerHTML='';
    }
    // V298: Hide the previous on-screen context interpretation while a new chart is computed.
    const oldContextPreview=$('englishLifeContextPreview');
    if(oldContextPreview){oldContextPreview.hidden=true;oldContextPreview.replaceChildren();}
    window.__smvLastFullReport=null; // New user-triggered calculation must not inherit an older full report.
    const btn=$('generateEnglishHoroscope');
    if(btn){btn.disabled=true;btn.textContent=text('⏳ Creating Horoscope…','⏳ ஜாதகம் உருவாகிறது…');}
    let englishProgress=$('englishHoroscopeProgress'); if(!englishProgress&&btn){englishProgress=document.createElement('div');englishProgress.id='englishHoroscopeProgress';englishProgress.className='smv-horoscope-progress';englishProgress.innerHTML='<span class="spin"></span><span>'+text('Creating Horoscope… Preparing all calculations and features…','ஜாதகம் உருவாகிறது… அனைத்துக் கணக்கீடுகளும் தயாராகின்றன…')+'</span>';btn.insertAdjacentElement('afterend',englishProgress);}
    try{
      phase='birth-details';
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
      // Full calculation is routed directly to the bundled offline engine.
      window.__smvSetReportContext?.('advanced_analysis',{date,time:normalizedTime,lat,lon,birthPlace:place,currentWork,maritalStatus,currentResidence,utcOffsetMinutes:Number($('birthUtcOffset')?.value??5.5)*60,language:generationLanguage});
      phase='core-calculation';
      const generated=await window.__smvGenerateHoroscopeEngine(false);
      if(!generated || !Array.isArray(generated.planets)) throw new Error('Birth chart did not finish: no valid D1 planet data was returned.');
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

        phase='panchang-and-transit';
        await window.__smvLoadBasicPanchang({...window.__smvGetReportContext('advanced_analysis'),language:lang},target);
        const originalBirth=window.__smvGetReportContext('advanced_analysis'),basicSnapshot=target.__smvBasicData,reportName=($('englishAstroName')?.value||'Horoscope').trim();
        let completedFull=null;
        window.__smvSwitchHoroscopeLanguage=async(next,quiet=false)=>{
          if(busy)return;busy=true;
          try{
            window.__smvRenderCachedCore(generated);target.innerHTML=source.innerHTML;source.innerHTML='';source.classList.add('hidden');
            const adv=target.querySelector('#tamilAdvancedAstrology');if(adv)adv.id='englishAdvancedAstrology';
            const tr=target.querySelector('#tamilDailyTransitPanchangSlot');if(tr)tr.id='englishDailyTransitPanchangSlot';
            window.__smvRenderBasicSnapshot(basicSnapshot,target,next,originalBirth);
            if(next==='en')window.__smvApplyEnglishToHoroscope(target);
            window.__smvBindHoroscopeInteractions(target,generated,reportName,next);
            if(completedFull){
              await window.__smvLoadAdvancedAstrology({...originalBirth,lang:next,rootId:'englishAdvancedAstrology',name:reportName,chart:generated,generationId:window.__smvHoroscopeGenerationId,cachedFull:completedFull,cachedBasic:basicSnapshot});
              // Wait for Section X's integrated 15-year evidence on language
              // switches before the next snapshot can be announced as ready.
              await ensureLongPredictionComplete(target.querySelector('#englishAdvancedAstrology'));
            }
            else if(adv){adv.classList.remove('hidden');await window.__smvRequireHoroscopeFeatureAccess('advanced_analysis',adv,()=>{window.__smvSwitchHoroscopeLanguage=null;$('generateEnglishHoroscope').click();});}
            window.__smvLocalizeTamilResult?.(target,next);target.dataset.resultLanguage=next;target.dataset.generationLanguage=next;target.classList.remove('hidden');target.setAttribute('aria-busy','false');
            // V92: the report may be rendered later in the other language from the already-cached
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
          if(current==='en')window.__smvApplyEnglishToHoroscope(target);
          window.__smvLocalizeTamilResult?.(target,current);
          views[current]=target.innerHTML;
          return views;
        };
        const englishAdvancedRoot=$('englishAdvancedAstrology');
        if(!englishAdvancedRoot || typeof window.__smvLoadAdvancedAstrology!=='function'){
          throw new Error('English Advanced Astrology container is not ready.');
        }
        const verifyCompleteAdvanced=()=>{
          const parts=[...englishAdvancedRoot.querySelectorAll('.smv-advanced-part')];
          const names=['I. Chart','II. Dasha','III. Tajaka','IV. Transit','V. Remedies','VI. Numerology','VII. Mantras','VIII. Adhidevatas','IX. Deities','X. Predictions'];
          const missing=parts.map((part,i)=>({name:names[i]||'Other',content:part.querySelector('.smv-advanced-part-content')}))
            .filter(entry=>!entry.content?.textContent.trim()).map(entry=>entry.name);
          if(parts.length!==10||missing.length){
            const namesMissing=missing.join(', ') || ('Expected 10 sections; got '+parts.length);
            throw new Error('Full report section(s) missing: '+namesMissing+(missing.includes('IX. Deities')?' (horoscope-details.js must load successfully)':''));
          }
        };
        // V304: Section X now contains exactly twelve integrated house readings.
        // Validate the completed 15-year timeline, NOT removed age-80 DOM sections.
        // Wait on the existing local computation Promise; do not issue any new
        // API, Firebase, Swiss or rendering request. Keep Save/Print guarded.
        const ensureLongPredictionComplete=async advancedRoot=>{
          if(!advancedRoot)return;
          const x=advancedRoot.querySelector('.smv-advanced-part.life-predictions');
          if(!x)return; // Genuine Basic-only flow intentionally has no Section X.
          const pending=advancedRoot.__smvLongTimelineReady;
          if(pending)await pending;
          const integrated=x.querySelector('.smv-v303-integrated[data-smv-integrated="12"]');
          const topics=integrated?.querySelectorAll('.smv-v303-house[data-d1-topic]')||[];
          const failure=x.querySelector('.smv-v302-unavailable')?.textContent?.trim()||'';
          const ids=new Set(Array.from(topics,t=>Number(t.getAttribute('data-d1-topic'))));
          const twelve=topics.length===12&&Array.from({length:12},(_,i)=>i+1).every(i=>ids.has(i));
          if(!integrated||!twelve||integrated.getAttribute('data-smv-15-year-ready')!=='1'||failure){
            throw new Error('Section X integrated 15-year reading is incomplete. '+(failure||'12 house chapters or 15-year Swiss/Dasha result missing.').slice(0,210));
          }
        };
        // Core + Advanced Analysis are calculated locally in the browser.
        if(typeof window.__smvRequireHoroscopeFeatureAccess==='function'){
          target.classList.remove('hidden'); target.setAttribute('aria-busy','false');
          englishAdvancedRoot.classList.remove('hidden');
          const runEnglishAdvanced=async()=>{
            target.classList.add('hidden'); target.setAttribute('aria-busy','true');
            englishAdvancedRoot.innerHTML='';
            phase='full-advanced-calculation';
            await window.__smvLoadAdvancedAstrology({date,time:normalizedTime,lat,lon,lang,rootId:'englishAdvancedAstrology',name:($('englishAstroName')?.value||'').trim(),chart:generated||null,generationId:window.__smvHoroscopeGenerationId,cachedBasic:basicSnapshot,birthPlace:place,currentWork,maritalStatus,currentResidence});
            // V304: do not publish any partial 12-house/15-year report.
            phase='full-integrated-15-year-predictions';
            await ensureLongPredictionComplete(englishAdvancedRoot);
            // Validate ALL sections BEFORE signalling report-ready / Save / Print.
            // The old flow notified report-store first and rejected missing IX later.
            phase='advanced-content-validation';
            verifyCompleteAdvanced();
            completedFull=window.__smvLastFullReport;
            window.__smvLocalizeTamilResult?.(target,generationLanguage);target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
            target.classList.remove('hidden'); target.setAttribute('aria-busy','false');
            window.dispatchEvent(new CustomEvent('smv:report-ready',{detail:{feature:'advanced_analysis',root:target,generationLanguage,prepareViews:buildViews,birthIdentity:window.__smvGetReportContext('advanced_analysis'),name:($('englishAstroName')?.value||'Horoscope').trim(),calculation:window.__smvLastFullReport||generated}}));
          };
          const allowed=await window.__smvRequireHoroscopeFeatureAccess('advanced_analysis',englishAdvancedRoot,runEnglishAdvanced);
          if(!allowed){
            target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
            // Basic result uses the same final language renderer.
            if(generationLanguage==='en')window.__smvApplyEnglishToHoroscope?.(target);
            window.__smvLocalizeTamilResult?.(target,generationLanguage);
            window.dispatchEvent(new CustomEvent('smv:report-ready',{detail:{feature:'advanced_analysis',root:target,generationLanguage,prepareViews:buildViews,birthIdentity:window.__smvGetReportContext('advanced_analysis'),name:($('englishAstroName')?.value||'Horoscope').trim(),calculation:generated,basicOnly:true}}));
            target.scrollIntoView({behavior:'auto',block:'start'});
            return;
          }
          await runEnglishAdvanced();
        }else{
          throw new Error('Offline Advanced Analysis access is not ready. Reload and try again.');
        }

        /* SINGLE ENGLISH RELEASE: the complete core + Advanced + Panchang +
           Transit + Dasa batch is now ready. */
        if(lang==='en'&&typeof window.__smvForceEnglishRahuRetrograde==='function'){
          window.__smvForceEnglishRahuRetrograde(target);
        }
        verifyCompleteAdvanced(); // Recheck the final mounted tree, without another engine call.
        if(generationLanguage==='en')window.__smvApplyEnglishToHoroscope?.(target);
        window.__smvLocalizeTamilResult?.(target,generationLanguage);
        target.dataset.resultLanguage=generationLanguage;target.dataset.generationLanguage=generationLanguage;
        target.classList.remove('hidden');
        target.setAttribute('aria-busy','false');
        if(lang==='en'&&typeof window.__smvFixEnglishBhavaHeaders==='function') window.__smvFixEnglishBhavaHeaders();
        target.scrollIntoView({behavior:'auto',block:'start'});
      }else throw new Error('Horoscope result was not returned.');
    }catch(e){
      // V277: never erase a successfully computed D1 chart because an Advanced
      // renderer, optional deity script, transit or a report-section check failed.
      // Do not expose an incomplete full report as a finished Paid/Free report.
      console.error('[SMV Horoscope generation]',{phase,error:e});
      window.__smvLastFullReport=null; // Never expose a partially rendered Full report as the latest successful one.
      const message=String(e?.message||e||'Unknown error').slice(0,350);
      if(englishResult){
        englishResult.setAttribute('aria-busy','false');
        const advanced=englishResult.querySelector('#englishAdvancedAstrology');
        if(advanced){advanced.innerHTML='';advanced.classList.add('hidden');}
        if(englishResult.querySelector('.horoscope-result') || englishResult.textContent.trim().length>100){
          // Basic chart remains readable; no report-ready is dispatched here.
          englishResult.classList.remove('hidden');
          englishResult.dataset.smvReportIncomplete='1';
          englishResult.querySelectorAll('[data-print],[data-save]').forEach(el=>{el.hidden=true;});
        }else{
          englishResult.classList.add('hidden');
          englishResult.innerHTML='';
        }
      }
      const warning=document.createElement('div');warning.id='smvHoroscopeGenerationError';
      warning.className='error';warning.setAttribute('role','alert');
      warning.style.cssText='margin:12px 0;padding:14px;border:1px solid #b83b43;border-radius:10px;white-space:normal;overflow-wrap:anywhere';
      const title=document.createElement('b');
      title.textContent=text('Full horoscope could not be completed; the birth-chart calculation is preserved if available.','முழு ஜாதக அறிக்கை நிறைவடையவில்லை. கணக்கிடப்பட்ட அடிப்படை ஜாதகம் இருந்தால் அது பாதுகாக்கப்பட்டுள்ளது.');
      const detail=document.createElement('p');detail.className='small';
      detail.textContent=text('Failed stage: ','பிழை ஏற்பட்ட பகுதி: ')+phase+' — '+message;
      const advice=document.createElement('p');advice.className='small';
      advice.textContent=text('Retry after verifying that the latest horoscope files are deployed. No payment or report has been saved for this incomplete generation.','புதிய Horoscope கோப்புகள் முழுமையாக Deploy ஆனதை உறுதி செய்து மீண்டும் முயற்சிக்கவும். நிறைவடையாத அறிக்கை முழு அறிக்கையாகச் சேமிக்கப்படாது.');
      warning.append(title,detail,advice);
      (englishResult?.parentElement||btn?.parentElement||document.body).insertBefore(warning,englishResult||null);
    }
    finally{
      if(englishResult) englishResult.setAttribute('aria-busy','false');
      if(btn){btn.disabled=false;btn.textContent=text('Create Horoscope','ஜாதகம் உருவாக்குக');}
      if(englishProgress) englishProgress.remove();
      busy=false;document.querySelectorAll('.smv-language-buttons button,#clearEnglishHoroscope').forEach(b=>b.disabled=false);
    }
  });
  $('clearEnglishHoroscope')?.addEventListener('click',()=>{['englishAstroName','englishDob','englishTob','englishBirthPlace','englishNakshatra','englishLat','englishLon','englishCurrentResidence'].forEach(id=>{if($(id))$(id).value='';});if($('englishRasi'))$('englishRasi').value='Aries';if($('englishCurrentWork'))$('englishCurrentWork').value='';if($('englishMaritalStatus'))$('englishMaritalStatus').value='';if($('englishBirthPlace')){$('englishBirthPlace').dataset.locationSelected='0';$('englishBirthPlace').dataset.latitude='';$('englishBirthPlace').dataset.longitude='';}if($('englishHoroscopeResult')){$('englishHoroscopeResult').classList.add('hidden');$('englishHoroscopeResult').innerHTML='';}});
document.querySelectorAll('a[href="#english-horoscope"]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();const section=$('english-horoscope');section?.classList.remove('hidden');section?.scrollIntoView({behavior:'auto',block:'start'});history.replaceState(null,'','#english-horoscope');}));
})();


/* SMV-LIFE-CONTEXT-V299 — voluntary, local, chart-anchored reading.
 * No extra calculation, Firestore, payment, network, MutationObserver, storage or print injection.
 * Natal/dasha/transit evidence is READ ONLY from the completed, access-authorized report.
 * Accessibility/wellbeing selection is never inferred or saved. */
(function(root){'use strict';
 const $=id=>document.getElementById(id);
 const has= (object,key)=>Object.prototype.hasOwnProperty.call(object,key);
 const WORK={
  employed:{houses:[10,6,11],ta:['தற்போதைய வேலை மற்றும் பொறுப்புகள்','ஏற்கெனவே பணியில் இருப்பதை அடிப்படையாகக் கொண்டு பதவி, பணிச்சுமை, சக ஊழியர்களுடன் ஒத்துழைப்பு மற்றும் வருமான நிர்வாகத்தை தனித்தனியாகப் பாருங்கள். தொழில் பலனில் வேலை கிடைக்கும் என்ற வாசகத்தை நிகழாத புதிய வேலைவாய்ப்பாகப் படிக்க வேண்டாம்.'],en:['Existing job and responsibilities','As you are already employed, relate career themes to current duties, workplace cooperation, changing skills and income management. Do not interpret a generic “getting a job” theme as a new event.']},
  business:{houses:[10,7,11],ta:['சுயதொழில் மற்றும் வணிக முடிவுகள்','தொழில் தொடர்பை வாடிக்கையாளர் உறவுகள், ஒப்பந்தங்கள், கையிருப்புப் பணம் மற்றும் வணிக முடிவுகளில் பயன்படுத்துங்கள். வணிகம் வளர்வதைப் பற்றிய உறுதியான முடிவை ஜாதகம் மட்டும் வழங்காது.'],en:['Self-employment and business','Read career themes through customers, contracts, cash flow and business decisions. The chart alone cannot establish whether a business will grow.']},
  student:{houses:[5,3,9],ta:['கல்வி மற்றும் திறன் வளர்ச்சி','தற்போதைய நிலைக்கு வேலைப் பதவி பலனைத் திணிக்காமல் பாடப்பயிற்சி, கற்றல் முறை, தேர்வுகள், ஆசிரியர் வழிகாட்டுதல் மற்றும் திறனை வளர்க்கும் பயிற்சிக்கு முன்னுரிமை கொடுங்கள்.'],en:['Education and skills','Prioritize study, learning methods, exams, mentoring and skill-building rather than treating a career position as a present fact.']},
  homemaker:{houses:[4,6,2],ta:['இல்லப் பொறுப்புகள் மற்றும் தனிப்பட்ட திறன்கள்','இல்லத்தை நிர்வகித்தல் ஒரு முக்கியப் பொறுப்பு. குடும்பச் செலவுத் திட்டம், வீட்டில் மேற்கொள்ளும் வேலைகள், சொந்தத் திறன் வளர்ச்சி மற்றும் விரும்பினால் பிற பணிகளுக்கு மாறும் வாய்ப்பு ஆகியவற்றைத் தனித்தனியாகப் புரிந்துகொள்ளுங்கள்.'],en:['Home responsibilities and personal skills','Running a home is substantial work. Consider household budgets, caregiving or management tasks, personal skills and any work transition the person chooses.']},
  unemployed:{houses:[10,3,11],ta:['தற்போதைய வேலைத் தேடலும் திறன்களும்','தற்போது வேலை இல்லாத சூழலில் ஏற்கெனவே நிரந்தரப் பணியில் இருப்பதாகக் கருத வேண்டாம். திறனைப் புதுப்பித்தல், நேர்முகத் தேர்வு, தொடர்புகள், ஆதாரபூர்வமான வேலை வாய்ப்புத் தேடல் ஆகியவற்றைப் பொருத்திப் பாருங்கள்; வேலை கிடைக்கும் தேதியை ஜாதகம் உறுதி செய்யாது.'],en:['Current job search and skills','Do not assume existing employment. Focus on upskilling, applications, interviews, professional contacts and practical options; a birth chart cannot guarantee a hiring date.']},
  retired:{houses:[11,4,12],ta:['ஓய்வுக்குப் பிந்தைய வாழ்க்கை','புதிய நிரந்தர வேலை கிடைக்கும் என்ற வாசகத்தை முன்வைக்காமல் விருப்பச் செயல்பாடுகள், குடும்பத்துடனான நேரம், அனுபவத்தைப் பகிர்தல், சேமிப்புத் திட்டம் மற்றும் ஓய்வின் ஒழுங்கை முன்னிலைப்படுத்துங்கள்.'],en:['Life after retirement','Emphasize chosen activities, family time, mentoring, financial planning and rest rather than assuming a new full-time job.']},
  other:{houses:[10,3,4],ta:['தனிப்பட்ட பணி மற்றும் வாழ்க்கைத் தேர்வு','தற்போதைய செயலைக் குறிப்பிட்ட தொழிலாக ஊகிக்காமல் திறன், பொறுப்புகள், நேர ஒழுங்கு மற்றும் விருப்பமான அடுத்த நடவடிக்கை ஆகியவற்றுடன் தொடர்புபடுத்திப் பாருங்கள்.'],en:['Your chosen role and activities','Avoid assuming a particular job. Relate the reading to skills, actual responsibilities, time management and chosen next steps.']}
 };
 const MARITAL={
  unmarried:{houses:[7,5,2],ta:['தற்போதைய திருமண நிலை — திருமணமாகாதவர்','தற்போது துணை இருப்பதாகக் கருதாமல் குடும்ப ஆதரவு, உறவுகளைத் தேர்ந்தெடுக்கும் சுதந்திரம், எதிர்கால இணக்கமான உறவிற்கான எதிர்பார்ப்புகள் ஆகியவற்றைப் பாருங்கள். திருமணத் தேதியை ஜாதகத்திலிருந்து உறுதிப்படுத்த முடியாது.'],en:['Current status — unmarried','Do not assume an existing spouse. Consider family support, personal choice and expectations for a potential relationship. The chart cannot guarantee a wedding date.']},
  married:{houses:[7,4,2],ta:['தற்போதைய திருமண வாழ்க்கை','ஏற்கெனவே திருமணமானவர் என்பதால் திருமணம் புதிதாக நடைபெறும் என்ற பலனை நிகழ்வாகக் காட்ட வேண்டாம். உரையாடல், குடும்பப் பொறுப்பைப் பகிர்தல், ஒருங்கிணைந்த முடிவுகள் மற்றும் உறவின் தற்போதைய நிலையை முன்னிலைப்படுத்துங்கள்.'],en:['Existing marriage','Do not portray marriage as an upcoming first event. Discuss communication, shared responsibilities and present relationship concerns instead.']},
  separated:{houses:[7,4,12],ta:['பிரிந்து வாழும் சூழல்','துணையுடன் தற்போது ஒரே வீட்டில் இருப்பதாக ஊகிக்காமல் தனிப்பட்ட முடிவுகள், பாதுகாப்பான தொடர்பு எல்லைகள், தனி வீட்டுப் பொறுப்புகள் மற்றும் தேவையான ஆதரவுடன் சூழலைப் புரிந்துகொள்ளுங்கள். மீண்டும் இணைதலை ஜாதகம் உறுதி செய்யாது.'],en:['Living separately','Do not assume cohabitation. Consider personal agency, communication boundaries, independent household responsibilities and relevant support. Reconciliation cannot be guaranteed from a chart.']},
  divorced:{houses:[7,2,11],ta:['விவாகரத்திற்குப் பிந்தைய வாழ்க்கை','முந்தைய திருமணம் தற்போதும் நீடிக்கிறது என்று எழுத வேண்டாம். குடும்ப, சமூக ஆதரவு, பொருளாதாரத் திட்டங்கள், புதிய உறவு வேண்டுமா என்ற சொந்த விருப்பம் ஆகியவற்றிற்கு இடம் கொடுங்கள்; மறுமணம் கட்டாயம் என்ற முடிவைத் தவிருங்கள்.'],en:['Life after divorce','Do not describe a past marriage as ongoing. Consider support networks, financial plans and personal choice about future relationships without assuming remarriage.']},
  widowed:{houses:[7,4,11],ta:['துணையை இழந்த பிந்தைய வாழ்க்கை','துணை தற்போது இருக்கிறார் எனக் கருதாமல் துக்கத்தை அனுபவிக்கும் தனிப்பட்ட நடை, உறவினர் அல்லது நண்பர் ஆதரவு, அன்றாடத் திட்டங்கள் மற்றும் சுயமுடிவுகளுக்கு மதிப்பளியுங்கள். புதிய உறவை எதிர்பார்க்க வேண்டும் என்று கூற வேண்டாம்.'],en:['Life after bereavement','Do not refer to the partner as living. Respect the person’s pace of grief, trusted support, everyday plans and autonomy without assuming a new relationship.']}
 };
 const SUPPORT={
  mobility:{houses:[3,10,4],ta:['நடமாட்டம் / அணுகல் உதவி','படிப்பு, பணியிடம் மற்றும் பயணச் சூழலில் தடையற்ற அணுகல், போக்குவரத்து மற்றும் உதவித் தொழில்நுட்பத்தை ஜாதகர் விருப்பப்படி தேர்ந்தெடுக்கலாம். உடல் இயக்கத்தில் சிரமம் இருப்பது திறமை குறைவாக இருப்பதைக் குறிக்காது.'],en:['Mobility / physical access','Accessible learning, transport, workplaces and assistive tools may be important according to the person’s preferences. Mobility needs do not imply a lack of ability.']},
  vision:{houses:[5,10,3],ta:['பார்வை சார்ந்த அணுகல்','கல்வி, தொழில் மற்றும் தொடர்பில் திரைவாசிப்பான், ஒலி வடிவம், பெரிய எழுத்து அல்லது விருப்பமான அணுகல் முறையைப் பயன்படுத்தலாம். பார்வைச் சவாலை ஜாதகம் கண்டுபிடித்ததாகக் கூறவில்லை.'],en:['Vision access','Screen readers, audio, large text or other preferred formats can support study, work and communication. The chart did not detect a vision condition.']},
  hearing:{houses:[3,7,10],ta:['கேள்வி / தகவல் தொடர்பு அணுகல்','எழுத்துப்பூர்வ தகவல், வசன வரிகள், சைகை மொழி அல்லது பிற விருப்பமான தொடர்பு முறைகள் உறவுகளிலும் பணியிலும் பயன்படும். ஒருவர் எவ்வாறு தொடர்பு கொள்கிறார் என்பதே அவரின் திறனை வரையறுப்பதில்லை.'],en:['Hearing / communication access','Captions, written instructions, sign language or preferred communication methods can aid work and relationships. A communication preference does not define capacity.']},
  wellbeing:{houses:[4,5,12],ta:['உணர்ச்சி நலவாழ்வு ஆதரவு','கல்வி, பணிச்சுமை மற்றும் உறவுகளுக்கான முடிவுகளை ஏற்ற நேர ஒழுங்கு, ஆதரவான சூழல், ஓய்வு மற்றும் விருப்பமான நிபுணர் உதவியுடன் இணைத்துப் பாருங்கள். மனநல நிலையை ஜாதகத்திலிருந்து தீர்மானிக்கவில்லை.'],en:['Emotional-wellbeing support','Consider manageable schedules, supportive environments, rest and optional professional support alongside study, work and relationships. Mental-health diagnoses are not inferred from a horoscope.']},
  learning:{houses:[5,3,10],ta:['கற்றல் ஆதரவு','படிப்படியான வழிமுறை, செயல்முறைப் பயிற்சி, பொருத்தமான நேரம் மற்றும் தெளிவான தகவல் ஆகியவற்றுடன் கல்வி மற்றும் திறன் வளர்ச்சி பலனைப் புரிந்துகொள்ளுங்கள். கற்றலில் உதவி தேவைப்படுவது அறிவாற்றலைக் குறைத்து மதிப்பிடக் காரணமல்ல.'],en:['Learning support','Use step-by-step explanations, practical exercises, suitable timing and clear information when considering education and skills. Learning support does not imply low intelligence.']}
 };
 function computeAge(date){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
   const [y,m,d]=date.split('-').map(Number),b=new Date(y,m-1,d),now=new Date();
   if(b.getFullYear()!==y||b.getMonth()!==m-1||b.getDate()!==d||b>now)return null;
   let a=now.getFullYear()-y; if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d))a--;
   return a;
 }
 function choice(kind,value,age,lang){
   const table=kind==='work'?WORK:kind==='marital'?MARITAL:kind==='support'?SUPPORT:null;
   if(!table||!has(table,value))return null;
   const result=table[value],ta=lang!=='en';
   let houses=[...result.houses];let body=result[ta?'ta':'en'][1];
   if(age!==null&&age<18){
     if(kind==='marital')return null; // Never assume adult marriage for minors.
     if(kind==='work'&&value!=='student'){
       houses=[5,3,4];body=ta?'குழந்தை அல்லது பதின்ம வயதில் வேலைப் பதவி அல்லது தொழில் நிகழ்வைப் பலனாகக் காட்டாமல் பள்ளி, திறன், நண்பர்கள் மற்றும் பராமரிப்பாளர் ஆதரவையே முன்னிலைப்படுத்துங்கள்.':'For a child or teen, prioritize school, skills, friendships and trusted caregivers rather than adult employment outcomes.';
     }
   }
   if(age!==null&&age>=65&&kind==='work'&&value==='student'){
     houses=[5,9,11];body=ta?'இந்த வயதில் கல்வி அல்லது பயிற்சியை வாழ்நாள் கற்றல், விருப்பமான பாடம், ஆர்வக் குழுக்கள் மற்றும் அனுபவத்தைப் பகிரும் முயற்சியாகப் புரிந்துகொள்ளுங்கள்.':'At this age, read studying as lifelong learning, chosen classes, communities and sharing experience.';
   }
   return {key:kind+':'+value,houses,title:age!==null&&age<18&&kind==='work'&&value!=='student'?(ta?'வயதுக்கேற்ற கல்வி மற்றும் பாதுகாப்பான திறன் வளர்ச்சி':'Age-appropriate study and skills'):result[ta?'ta':'en'][0],body};
 }
 function clean(value){return String(value||'').replace(/\s+/g,' ').trim();}
 function excerpt(value,limit=550){
  const s=clean(value);if(s.length<=limit)return s;
  const cut=s.slice(0,limit),ends=[...cut.matchAll(/[.!?।]\s/g)].map(m=>m.index+1),last=ends[ends.length-1];
  if(last&&last>=Math.floor(limit*.45))return s.slice(0,last).trim();
  const space=cut.lastIndexOf(' ');return s.slice(0,space>=limit-80?space:limit).trim()+'…';
 }
 function plainPlace(value){return clean(value).toLowerCase().replace(/[.,\-]/g,' ').replace(/\s+/g,' ');}
 function selection({work='',marital='',residence='',birthPlace='',need='',consent=false,age=null,lang='ta'}={}){
   const ta=lang!=='en',out=[];
   const w=choice('work',work,age,lang);if(w)out.push(w);
   const m=choice('marital',marital,age,lang);if(m)out.push(m);
   if(clean(residence)&&plainPlace(residence)!==plainPlace(birthPlace))out.push({key:'residence',houses:[4,3,9,12],title:ta?'தற்போதைய வசிப்பிடம் மற்றும் வீட்டு வாழ்க்கை':'Current residence and home life',body:ta?'பிறந்த இடமும் தற்போதைய வசிப்பிடமும் வேறுபடுவதாகத் தெரிவித்துள்ளீர்கள். குடும்ப உறவுகள், தற்போதைய வீட்டு வசதிகள், இடத்துக்கேற்ற கல்வி அல்லது பணி வாய்ப்புகள், பயணச் செலவு ஆகியவற்றை நிகழ்காலச் சூழலில் வாசிக்க வேண்டும். நகரம் அல்லது நாடு மாறியதால் புதிய லக்னம் கணிக்கப்பட்டதாக இதைக் கருத வேண்டாம்.':'You provided a residence different from the birthplace. Relate home, family, accessible local opportunities, commuting and cost of living to the present setting; this does not recalculate a relocated ascendant.'});
   const n=consent?choice('support',need,age,lang):null;if(n)out.push(n);
   return out;
 }
 function p(body,cls=''){const el=document.createElement('p');if(cls)el.className=cls;el.textContent=body;return el;}
 function oneTopic(root,houses,used=new Set()){
   for(const n of houses.filter(h=>!used.has(h))){const topic=root.querySelector('[data-d1-topic="'+n+'"]');
    if(!topic)continue;
    const paragraphs=[...topic.querySelectorAll('.smv-d1-life-paragraph')].map(x=>clean(x.textContent)).filter(Boolean);
    const distinct=[...new Set(paragraphs)].slice(0,2); // An outcome and its counterweight, when present.
    if(distinct.length)return {house:n,title:clean(topic.querySelector('h3,h4')?.textContent||''),text:distinct.join(' ')};
   }return null;
 }
 function oneWindow(root,attr,houses,used=new Set()){
   const base=root.querySelector('['+attr+'="1"]');if(!base)return null;
   const first=base.querySelector('.smv-80-window');if(!first)return null;
   const sections=first.querySelectorAll('.smv-80-topic');
   for(const h of houses.filter(x=>!used.has(x))){for(const section of sections){
    const n=Number(section.getAttribute(attr==='data-long-dasha'?'data-period-topic':'data-focus-house'));
    if(n!==h)continue;
    const par=[...section.querySelectorAll('p')].find(x=>clean(x.textContent));
    if(!par)continue;
    return {house:h,period:clean(first.querySelector('summary')?.textContent),planet:section.dataset.transitPlanet||'',text:clean(par.textContent)};
   }}return null;
 }
 function renderArea(box,row,result,lang,used){
   const ta=lang!=='en';const section=document.createElement('section');section.className='smv-context-segment';
   const h=document.createElement('h4');h.textContent=row.title;section.append(h);
   const natal=oneTopic(result,row.houses,used.natal);if(natal)used.natal.add(natal.house);
   if(natal){
     section.append(p((ta?'D1 · பாவம் ':'D1 · House ')+natal.house+' — '+excerpt(natal.text),'smv-context-natal'));
   }else section.append(p(ta?'இந்தத் தலைப்புக்கு முழு D1 பாவ வாசிப்பு கிடைக்கவில்லை.':'No complete D1 reading is available for this topic.','small'));
   section.append(p(row.body,'smv-context-applied'));
   const period=oneWindow(result,'data-long-dasha',row.houses,used.dasha);if(period)used.dasha.add(period.house);
   if(period)section.append(p((ta?'தசா–புக்தி · ':'Dasha/Bhukti · ')+period.period+': '+excerpt(period.text,430),'smv-context-period'));
   const transit=oneWindow(result,'data-long-transit',row.houses,used.transit);if(transit)used.transit.add(transit.house);
   if(transit)section.append(p((ta?'கோச்சார ஆண்டு · ':'Transit year · ')+transit.period+': '+excerpt(transit.text,430),'smv-context-transit'));
   box.append(section);
 }
 function language(){return document.documentElement.lang==='ta'?'ta':'en';}
 function localize(){
  // Robust on the active English form: this is what the site's EN/TA toggle actually displays.
  const sel=$('englishLifeContextNeed'),parent=sel?.closest('.smv-life-context-control');
  if(!parent||sel.options.length!==6)return;
  const ta=language()==='ta';
  const title=parent.querySelector('.smv-life-context-heading b'),consent=parent.querySelector('.smv-life-context-consent span');
  if(title)title.textContent=ta?'விருப்ப வாழ்க்கைச் சூழல் — அணுகல் / நலவாழ்வு ஆதரவு (ஜாதகத்திலிருந்து கண்டறியப்படுவதல்ல)':'Optional life context — accessibility / wellbeing support (not inferred from the horoscope)';
  if(consent)consent.textContent=ta?'நான் தேர்ந்தெடுத்த ஆதரவை இந்தத் திரை வாசிப்பில் மட்டும் பயன்படுத்த ஒப்புக்கொள்கிறேன்; சேமிக்கவோ அனுப்பவோ வேண்டாம்.':'Use my selected support only in this on-screen reading; do not save or send it.';
  const opts=ta?['குறிப்பிடவில்லை','நடமாட்டம் / உடல் அணுகல் உதவி','பார்வைக்கான அணுகல் உதவி','கேள்வி / தொடர்பு உதவி','உணர்ச்சி நலவாழ்வு ஆதரவு','கற்றல் உதவி']:['Not specified','Mobility / physical access support','Vision access support','Hearing / communication access support','Emotional wellbeing support','Learning support'];
  [...sel.options].forEach((o,i)=>o.textContent=opts[i]);parent.lang=ta?'ta':'en';
 }
 const stale={english:false,tamil:false};
 const appliedContext={english:null,tamil:null};
 const liveContext=prefix=>({work:$(prefix+'CurrentWork')?.value||'',marital:$(prefix+'MaritalStatus')?.value||'',residence:plainPlace($(prefix+'CurrentResidence')?.value||'')});
 const contextChanged=prefix=>{const was=appliedContext[prefix];if(!was)return false;const now=liveContext(prefix);return Object.keys(now).some(k=>now[k]!==was[k]);};
 // Capture optional fields on an explicit Generate click, not on every keystroke.
 document.addEventListener('click',ev=>{
  const id=ev.target?.closest?.('button')?.id||ev.target?.id||'';
  const prefix=id==='generateEnglishHoroscope'?'english':id==='generateTamilHoroscope'?'tamil':null;
  if(prefix)appliedContext[prefix]=liveContext(prefix);
 },true);
 function buildPanel(prefix,lang){
   const box=$(prefix+'LifeContextPreview'),result=$(prefix+'HoroscopeResult');if(!box||!result)return;
   const complete=!stale[prefix]&&result.querySelector('[data-smv-d1-life="1"]')&&!result.classList.contains('hidden')&&result.dataset.smvReportIncomplete!=='1';
   if(!complete){box.replaceChildren();box.hidden=true;return;}
   const age=computeAge($(prefix+'Dob')?.value);
   const segments=selection({work:$(prefix+'CurrentWork')?.value,marital:$(prefix+'MaritalStatus')?.value,residence:$(prefix+'CurrentResidence')?.value,birthPlace:$(prefix+'BirthPlace')?.value,need:$(prefix+'LifeContextNeed')?.value,consent:!!$(prefix+'LifeContextConsent')?.checked,age,lang});
   if(!segments.length){box.replaceChildren();box.hidden=true;return;}
   box.replaceChildren();box.hidden=false;box.classList.add('smv-context-v298');
   const heading=document.createElement('h3');heading.textContent=lang==='ta'?'வாழ்க்கைச் சூழலுடன் இணைந்த ஜாதக வாசிப்பு':'Horoscope reading in your current life context';box.append(heading);
   if(contextChanged(prefix)){
    box.append(p(lang==='ta'?'தேர்ந்தெடுத்த தொழில் / திருமண / வசிப்பிட விவரங்கள் இந்த ஜாதகம் உருவானபோது இருந்தவற்றிலிருந்து மாறியுள்ளன. கீழே திரைக்கான சூழல் வாசிப்பு மட்டும் புதுப்பிக்கப்பட்டுள்ளது; முழு D1/தசா/கோச்சார அறிக்கையில் இம்மாற்றம் பிரதிபலிக்க மீண்டும் «ஜாதகம் உருவாக்குக» அழுத்தவும்.':'Work, relationship or residence details have changed since this chart was generated. Only the on-screen contextual reading below has updated; press Create Horoscope again to apply these choices to the full report.','smv-context-rebuild-note'));
   }
   const used={natal:new Set(),dasha:new Set(),transit:new Set()};for(const row of segments)renderArea(box,row,result,lang,used);
   box.append(p(lang==='ta'?'D1, தசா–புக்தி, கோச்சாரத்தில் ஏற்கெனவே கணிக்கப்பட்ட தொடர்புடைய பகுதிகளிலிருந்து இந்தத் திரை வாசிப்பு உருவாகிறது. புதிய கிரகக் கணக்கீடு செய்யவில்லை; காலப்பலன் குறிப்பிடப்படாவிட்டால் அந்தப் பகுதியில் நேரடித் தொடர்புள்ள வாசிப்பு கிடைக்கவில்லை. ஆதரவுத் தேவை ஜாதகத்திலிருந்து கண்டறியப்படவில்லை. இந்தத் தனித் திரைப் பகுதி PDF/சேமிப்பில் சேராது.':'This on-screen reading uses already calculated D1 and available period/transit sections. It performs no new astrology calculation or diagnosis. Missing period notes are not invented; support needs are never inferred. This separate panel is not included in PDF/saved reports.','small smv-context-note'));
 }
 function refresh(){localize();buildPanel('english',language());buildPanel('tamil','ta');}
 function guidance({need,consent,age=null,work='',lang='ta'}={}){
   if(!consent||!has(SUPPORT,need))return null;
   const row=choice('support',need,age,lang);
   return row?{ageGroup:age!==null&&age<18?'minor':age!==null&&age>=60?'senior':'adult',lang,title:row.title,headings:[row.title],paragraphs:[row.body],houses:row.houses}:null;
 }
 if(typeof document!=='undefined'){
  const relevant=/^(english|tamil)(CurrentWork|MaritalStatus|CurrentResidence|LifeContextNeed|LifeContextConsent)$/;
  document.addEventListener('change',ev=>{
    const id=ev.target?.id||'';if(!relevant.test(id))return;
    const match=/^(english|tamil)LifeContextNeed$/.exec(id);
    if(match){const consent=$(match[1]+'LifeContextConsent');if(consent)consent.checked=false;}
    refresh();
  });
  document.addEventListener('input',ev=>{if(/^(english|tamil)CurrentResidence$/.test(ev.target?.id||''))refresh();});
  window.addEventListener('smv-language',()=>queueMicrotask(refresh));
  window.addEventListener('smv:horoscope-full-ready',()=>{stale.english=false;stale.tamil=false;queueMicrotask(refresh);});
  window.addEventListener('smv:report-ready',()=>{stale.english=false;stale.tamil=false;queueMicrotask(refresh);});
  document.addEventListener('click',ev=>{if(['clearEnglishHoroscope','clearTamilHoroscope'].includes(ev.target?.id)){
    const prefix=ev.target.id==='clearEnglishHoroscope'?'english':'tamil';const need=$(prefix+'LifeContextNeed'),consent=$(prefix+'LifeContextConsent');
    if(need)need.value='';if(consent)consent.checked=false;appliedContext[prefix]=null;
    const panel=$(prefix+'LifeContextPreview');if(panel){panel.hidden=true;panel.replaceChildren();}
  }});
  // Do not let another person's disclosed support category survive birth-record edits.
  let used={english:false,tamil:false};
  const mark=()=>{for(const prefix of ['english','tamil']){if($(prefix+'LifeContextPreview')&&!$(prefix+'LifeContextPreview').hidden)used[prefix]=true;}};
  window.addEventListener('smv:horoscope-full-ready',()=>queueMicrotask(mark));
  window.addEventListener('smv:report-ready',()=>queueMicrotask(mark));
  document.addEventListener('input',ev=>{
    const m=/^(english|tamil)(AstroName|Dob|Tob|BirthPlace|Lat|Lon)$/.exec(ev.target?.id||'');if(!m)return;
    const prefix=m[1];stale[prefix]=true;appliedContext[prefix]=null;
    // Clear cached adaptations on any change of natal identity; no stale forecasts.
    const panel=$(prefix+'LifeContextPreview');if(panel){panel.hidden=true;panel.replaceChildren();}
    if(used[prefix]||($(prefix+'LifeContextConsent')?.checked)){
      const need=$(prefix+'LifeContextNeed'),consent=$(prefix+'LifeContextConsent');if(need)need.value='';if(consent)consent.checked=false;used[prefix]=false;
    }
  });
  queueMicrotask(localize);
 }
 root.SMVLifeContextV299=Object.freeze({guidance,computeAge,choice,selection,refresh,version:'299-four-context-consistent'});
 root.SMVLifeContextV298=root.SMVLifeContextV299;
 root.SMVLifeContextV294=root.SMVLifeContextV299; // keep older integration tests/callers harmlessly compatible
})(typeof window!=='undefined'?window:globalThis);
