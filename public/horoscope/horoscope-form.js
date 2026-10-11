
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
              // Wait for Section X's complete report-date-to-age-80 reading on language
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
        // The Section X long-range engine is asynchronous. The full horoscope
        // must NOT be declared ready, printed or saved while its Dasha/Bhukti
        // and transit windows are still being generated. This is a readiness
        // check only; it does not issue Firestore reads, repeat natal calculation
        // or modify payment/access rules.
        const ensureLongPredictionComplete=async advancedRoot=>{
          if(!advancedRoot)return;
          const x=advancedRoot.querySelector('.smv-advanced-part.life-predictions');
          if(!x)return; // In a genuine Basic-only flow Section X is absent.
          const pending=advancedRoot.__smvLongTimelineReady;
          if(pending)await pending;
          const dasha=x.querySelector('[data-smv-long-range="dasha"]');
          const transit=x.querySelector('[data-smv-long-range="transit"]');
          if(!dasha||!transit||!transit.querySelector('[data-smv-full-timeline-complete="1"]')){
            const error=x.querySelector('.smv-80-status')?.textContent||'';
            throw new Error('Section X forecast through age 80 is incomplete. '+error.slice(0,200));
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
            // V283: do not publish a partial PDF when Section X's separate
            // asynchronous 80th-birthday timeline has not yet been added.
            phase='full-age80-timeline';
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


/* SMV-LIFE-CONTEXT-V294
 * User-chosen, optional, ephemeral accessibility/wellbeing guidance.
 * It NEVER detects disability or mental-health conditions from a chart,
 * alters planetary calculation, sends data, or becomes a saved PDF/report.
 * Deliberately attaches preview *outside* english/tamilHoroscopeResult.
 * Does not use MutationObserver, network, IndexedDB or localStorage. */
(function(root){'use strict';
 const NEEDS=new Set(['mobility','vision','hearing','wellbeing','learning']);
 const $=id=>document.getElementById(id);
 const DATA={
  mobility:{
   ta:['கல்வி மற்றும் திறன் வளர்ச்சிக்கான பலனை அணுகக்கூடிய வகுப்பறை, பயிற்சி இடம், போக்குவரத்து வசதிகளுடன் பொருத்தி திட்டமிடுங்கள். உடல் இயக்க உதவி தேவைப்படுவது அறிவாற்றலையோ படைப்புத்திறனையோ குறிக்கவில்லை.','பணி அல்லது வருமானத்திற்கான பலனைத் தொலைதூரப் பணி, அணுகலுள்ள பணியிடம், உதவித் தொழில்நுட்பம் மற்றும் வேலைப் பொறுப்பின் தன்மை ஆகியவற்றோடு இணைத்துப் பயன்படுத்துங்கள்.','குடும்பம், நண்பர்கள் மற்றும் சுயசார்பில் தேவையான அணுகல் வசதிகளைத் தேர்ந்தெடுக்கும் உரிமையும் தனிப்பட்ட முடிவுகளும் முக்கியம்.'],
   en:['Apply learning and skill themes to accessible classrooms, training spaces and transport. Mobility support does not imply reduced understanding or creativity.','Read career and income themes alongside accessible workplaces, remote work, suitable duties and assistive tools.','Preserve personal decisions and autonomy in family and social life; support and accessibility are not a measure of worth.']},
  vision:{
   ta:['கல்விப் பலனைத் திரைவாசிப்பான், ஒலிப்புத்தகம், பெரிய எழுத்து அல்லது பிற விருப்பமான வாசிப்பு முறைகளுடன் இணைத்துப் பயன்படுத்துங்கள்.','பணிசார் திறன்களை அணுகக்கூடிய மென்பொருள், பேசும் கருவிகள், மாற்று வாசிப்பு வடிவங்கள் ஆகியவற்றின் உதவியுடன் நடைமுறைப்படுத்தலாம்.','அன்றாடப் பயணம், செய்திகள், உறவுகளின் தகவல் பரிமாற்றம் ஆகியவற்றில் நீங்கள் தேர்ந்தெடுக்கும் அணுகல் முறைகள் முக்கியம்.'],
   en:['Read education themes together with screen readers, audio, large text or whichever reading format is suitable.','Apply career themes with accessible software, spoken tools and adaptable document formats.','Independent travel, information and relationships benefit from access methods chosen by the person.']},
  hearing:{
   ta:['கல்வி மற்றும் பயிற்சியில் எழுத்துப்பூர்வ விளக்கம், வசன வரிகள் அல்லது விருப்பமான சைகை மொழி உதவி போன்றவற்றைச் சேர்த்துக் கொள்ளுங்கள்.','பணியிடம் அல்லது வியாபாரத்தில் கூட்டக் குறிப்புகள், எழுதப்பட்ட தகவல், காட்சியமைப்பு அறிவிப்புகள் ஆகியவை தகவல் சமநிலைக்கு உதவும்.','உறவுகளிலும் நண்பர்களுடனும் உரையாடும் முறையை இணக்கமாகத் தேர்ந்தெடுப்பதால் முடிவுகள் தெளிவாகப் பகிரப்படுகின்றன.'],
   en:['Apply learning themes using captions, written guidance or preferred sign-language support.','Work and business communication can use meeting notes, clear written instructions and visual alerts.','In relationships, agreeing on accessible communication helps everyone understand decisions.']},
  wellbeing:{
   ta:['உணர்ச்சி நலவாழ்வுக்கான ஆதரவு இருப்பதாலேயே அறிவாற்றலையோ தீர்மானத் திறனையோ குறைவாக மதிப்பிடக்கூடாது; கல்வி, ஆர்வம், திறமையைத் தனியே அணுகுங்கள்.','பணிச்சுமை, அட்டவணை, ஆதரவான உறவுகள், தேவையான இடைவெளி ஆகியவற்றைத் திட்டமிடுதல் தொழில் சார்ந்த பலன்களின் நடைமுறைப் பகுதி.','குடும்பம் அல்லது நண்பர்களிடம் உதவி கேட்பது, பொருத்தமான தொழில்முறை ஆதரவை அணுகுவது ஆகியவை தனிப்பட்ட விருப்பங்களும் உரிமைகளும்; ஜாதகம் நோயைக் கண்டறியாது.'],
   en:['Emotional-wellbeing support does not imply reduced intelligence or decision-making ability; consider learning and skills on their own merits.','Translate work themes into manageable schedules, supportive relationships and appropriate breaks.','Seeking support from trusted people or qualified professionals is a personal choice; the horoscope does not diagnose a mental-health condition.']},
  learning:{
   ta:['கற்றலுக்கான உதவி தேவைப்படுவதால் திறமை இல்லை என்ற முடிவு வராது; காட்சிப் பயிற்சி, செயல்முறைப் பயிற்சி, கூடுதல் நேரம் போன்ற ஏற்ற வழிகளைத் தேர்ந்தெடுங்கள்.','தொழில் அல்லது திறன் வளர்ச்சிப் பலன்களைத் தெளிவான சிறு பணிகள், படிப்படியான விளக்கம், பொருத்தமான உதவிக் கருவிகளுடன் செயல்படுத்துங்கள்.','உறவுகள் மற்றும் சுயமுடிவுகளில் அந்த நபரின் விருப்பமும் புரிதலுக்கேற்ற தகவல் வழங்கலும் முன்னுரிமை பெறுகின்றன.'],
   en:['Learning support does not mean a lack of ability; consider visual instruction, hands-on practice and appropriate time.','Apply skills and work themes through clear steps, suitable instructions and assistive tools.','Communication and personal decisions should respect the person’s preferences and access to understandable information.']}
 };
 function computeAge(date){
   if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
   const [y,m,d]=date.split('-').map(Number),b=new Date(y,m-1,d),now=new Date();
   if(b.getFullYear()!==y||b.getMonth()!==m-1||b.getDate()!==d||b>now)return null;
   let a=now.getFullYear()-y; if(now.getMonth()+1<m||(now.getMonth()+1===m&&now.getDate()<d))a--;
   return a;
 }
 function guidance({need,consent,age,work='',lang='ta'}={}){
   if(!consent||!NEEDS.has(need))return null;
   const ta=lang!=='en';const b=DATA[need][ta?'ta':'en'];const minor=age!==null&&age!==undefined&&age<18;
   const senior=age!==null&&age!==undefined&&age>=60;
   const student=work==='student'||minor;
   const headings=ta?['கல்வி / திறன்','தொழில் / பொறுப்பு','உறவு / அன்றாட வாழ்க்கை']:['Education / skills','Work / responsibilities','Relationships / daily life'];
   const applied=[...b];
   if(minor){
      applied[1]=ta?'இந்த வயதில் தொழில் அல்லது திருமண நிகழ்வைக் கணிக்காமல் பள்ளி, பயிற்சி, பாதுகாப்பான பயணம் மற்றும் பெற்றோர்/பராமரிப்பாளர் வழங்கும் நடைமுறை உதவிகளுக்கு முன்னுரிமை கொடுக்க வேண்டும்.':'At this age, focus on school, accessible activities, safe travel and practical support from trusted adults rather than adult employment or marriage outcomes.';
   }else if(student){
      applied[1]=ta?'தற்போதைய கல்வியிலிருந்து திறனை வளர்க்கும் பயிற்சி மற்றும் அணுகக்கூடிய எதிர்காலப் பணிமுறைகளைத் தேர்ந்தெடுப்பதே இப்போது பொருத்தமான வாழ்க்கைத் திட்டம்.':'The present focus is on accessible learning-to-work routes, training and skill development rather than an assumed current job.';
   }else if(senior){
      applied[1]=ta?'இந்த வயதில் வேலைப் பதவி அல்லது புதிய தொழில் பற்றிய பொதுவான முடிவை விட சுயமுடிவு, விருப்பமான செயல்பாடுகள், அணுகல் வசதிகள் மற்றும் அன்றாட ஆதரவை முன்னிலைப்படுத்துங்கள்.':'At this age, emphasize autonomy, chosen activities, access and everyday support rather than assuming a new full-time career.';
   }
   return {ageGroup:minor?'minor':senior?'senior':'adult',lang:ta?'ta':'en',headings,paragraphs:applied,
      title:ta?'விருப்ப வாழ்க்கைச் சூழலுக்கு ஏற்ற நடைமுறை வாசிப்பு':'Optional life-context guidance',
      note:ta?'இது நீங்கள் விருப்பமாகத் தேர்ந்தெடுத்த அணுகல்/நலவாழ்வு சூழலைப் பயன்படுத்தும் கூடுதல் வழிகாட்டுதல். ஜாதகத்தால் மாற்றுத்திறனையோ மனநல நிலையையோ கண்டறியவில்லை. இந்த உரை திரையில் மட்டுமே தோன்றும்; சேமிக்கப்பட்ட அறிக்கை அல்லது PDF-இல் இடம்பெறாது.':'This additional guidance uses a context you voluntarily selected. No disability or mental-health condition has been inferred from the chart. It appears only on screen, not in saved reports or PDFs.'};
 }
 function buildPanel(prefix,lang){
   const box=$(prefix+'LifeContextPreview'),result=$(prefix+'HoroscopeResult');if(!box||!result)return;
   const consent=!!$(prefix+'LifeContextConsent')?.checked;
   const need=$(prefix+'LifeContextNeed')?.value||'';
   const age=computeAge($(prefix+'Dob')?.value),work=$(prefix+'CurrentWork')?.value||'';
   const content=guidance({need,consent,age,work,lang});
   // Only display with an actually generated FULL D1 result, never the public Basic gate.
   if(!content||!result.querySelector('[data-smv-d1-life="1"]')){box.hidden=true;box.replaceChildren();return;}
   box.replaceChildren();box.hidden=false;
   box.style.cssText='margin:14px 0;padding:14px;border:1px solid #bdb5a2;border-radius:9px;background:#fff';
   const heading=document.createElement('h3');heading.textContent=content.title;box.append(heading);
   // Each context view is anchored to the *already generated* D1 report.
   // Never recalculate a chart, infer a diagnosis, or invent a new natal outcome.
   const minor=content.ageGroup==='minor',senior=content.ageGroup==='senior';
   const focus=minor?[5,3,4]:senior?[5,11,12]:work==='student'?[5,3,11]:need==='wellbeing'?[4,10,12]:[5,10,7];
   content.paragraphs.forEach((paragraph,i)=>{
    const sub=document.createElement('h4');sub.textContent=content.headings[i];box.append(sub);
    const source=result.querySelector('[data-d1-topic="'+focus[i]+'"] .smv-d1-life-paragraph');
    if(source&&source.textContent.trim()){
     const evidence=document.createElement('p');evidence.className='smv-context-evidence';
     evidence.textContent=(lang==='en'?'Existing D1 reading: ':'ஏற்கெனவே கணிக்கப்பட்ட D1 பலன்: ')+source.textContent.trim();
     box.append(evidence);
    }
    const p=document.createElement('p');p.textContent=paragraph;box.append(p);
   });
   const note=document.createElement('p');note.className='small';note.textContent=content.note;box.append(note);
 }
 function refresh(){const lang=document.documentElement.lang==='ta'?'ta':'en';
  // Rebuilds from on-screen user selections only. No network, chart recalc, or storage.
  buildPanel('english',lang);buildPanel('tamil','ta');
 }
 if(typeof document!=='undefined'){
  document.addEventListener('change',ev=>{if(/^(english|tamil)LifeContext(?:Need|Consent)$/.test(ev.target?.id||''))refresh();});
  window.addEventListener('smv:horoscope-full-ready',()=>queueMicrotask(refresh));
  window.addEventListener('smv:report-ready',()=>queueMicrotask(refresh));
  document.addEventListener('click',ev=>{if(['clearEnglishHoroscope','clearTamilHoroscope'].includes(ev.target?.id)){
   const p=ev.target.id==='clearEnglishHoroscope'?'english':'tamil';
   const consent=$(p+'LifeContextConsent'),need=$(p+'LifeContextNeed');if(consent)consent.checked=false;if(need)need.value='';
   const panel=$(p+'LifeContextPreview');if(panel){panel.hidden=true;panel.replaceChildren();}
  }});
  // Protect against accidentally carrying one person's selected support context
  // into another birth record. Only clear it after a preview was actually used.
  const used={english:false,tamil:false};
  window.addEventListener('smv:horoscope-full-ready',()=>queueMicrotask(()=>{
   for(const p of ['english','tamil']){const preview=$(p+'LifeContextPreview');if(preview&&!preview.hidden)used[p]=true;}
  }));
  document.addEventListener('input',ev=>{
   const match=/^(english|tamil)(AstroName|Dob|Tob|BirthPlace|Lat|Lon)$/.exec(ev.target?.id||'');
   if(!match||!used[match[1]])return;
   const p=match[1];used[p]=false;
   const consent=$(p+'LifeContextConsent'),need=$(p+'LifeContextNeed');
   if(consent)consent.checked=false;if(need)need.value='';
   const panel=$(p+'LifeContextPreview');if(panel){panel.hidden=true;panel.replaceChildren();}
  });
 }
 root.SMVLifeContextV294=Object.freeze({guidance,computeAge,refresh,version:'294-consent-only-ephemeral'});
})(typeof window!=='undefined'?window:globalThis);
