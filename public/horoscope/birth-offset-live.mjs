/* SMV ASTRO — live historical UTC-offset display for Horoscope input forms.
 * A verified IANA timezone is resolved from the chosen place; the browser's
 * IANA rules calculate the offset for the actual birth date and local time.
 * No current-day DST value or fixed India offset is used as a fallback.
 */
import {offsetMinutesAt} from './offline/places/timezone.mjs';

export function calculatedOffsetHours(zone,date,time){
  if(!String(zone||'').trim()||!date||!time)return null;
  return offsetMinutesAt(String(zone).trim(),date,time)/60;
}

export function bindBirthOffsetUI(root){
  const get=id=>root.getElementById(id);
  const field=get('birthUtcOffset');
  if(!field)return null;
  const status=get('smvBirthOffsetStatus');
  const local=(en,ta)=>/^ta(?:-|$)/i.test(root.documentElement?.lang||'')?ta:en;
  let activePrefix='english';
  function refresh(prefix=activePrefix){
    if(prefix!=='english'&&prefix!=='tamil')return null;
    activePrefix=prefix;
    const date=String(get(prefix+'Dob')?.value||'').trim();
    const time=String(get(prefix+'Tob')?.value||'').trim();
    const zone=String(get(prefix+'BirthTimezone')?.value||'').trim();
    field.value='';
    field.dataset.offsetVerified='0';
    if(!date||!time||!zone){
      if(status)status.textContent=local(
        'Select a birth place, date and time to calculate the historical UTC offset.',
        'பிறந்த இடம், தேதி, நேரம் தேர்வு செய்தவுடன் அன்றைய UTC நேர வேறுபாடு கணக்கிடப்படும்.'
      );
      return null;
    }
    try{
      const hours=calculatedOffsetHours(zone,date,time);
      if(hours===null)return null;
      field.value=String(hours);
      field.dataset.offsetVerified='1';
      if(status)status.textContent=local(
        'Calculated for the selected birth date and time (including historical DST).',
        'தேர்ந்தெடுத்த பிறந்த தேதி, நேரத்திற்கு ஏற்ற பழைய DST விதிகளுடன் கணக்கிடப்பட்டது.'
      );
      return hours;
    }catch(error){
      if(status)status.textContent=local(
        'Cannot calculate this local time: '+String(error.message||error),
        'இந்த உள்ளூர் நேரத்திற்குக் கணக்கிட இயலவில்லை: '+String(error.message||error)
      );
      return null;
    }
  }
  for(const prefix of ['english','tamil']){
    for(const suffix of ['Dob','Tob','BirthTimezone','BirthPlace']){
      const node=get(prefix+suffix);
      node?.addEventListener('input',()=>refresh(prefix));
      node?.addEventListener('change',()=>refresh(prefix));
    }
    const clear=get(prefix==='english'?'clearEnglishHoroscope':'clearTamilHoroscope');
    clear?.addEventListener('click',()=>refresh(prefix));
  }
  if(typeof window!=='undefined')window.__smvUpdateBirthOffset=refresh;
  refresh('english');
  return {refresh};
}

if(typeof document!=='undefined'){
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>bindBirthOffsetUI(document),{once:true});
  }else{
    bindBirthOffsetUI(document);
  }
}
