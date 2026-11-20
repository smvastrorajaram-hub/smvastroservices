import { solarNoaa, tamilSolarDate, nakshatraIntervalsForLocalDay, thyajyamIntervalsForLocalDay, calculateAhasRatriPramana } from './offline/transit_panchang.browser.mjs';
import { getTamilDayYoga } from './tamil-day-classifications.mjs';
import { offsetMinutesAt } from './offline/places/timezone.mjs';
import { formatOfflineIndiaAdministrativeAreas } from './offline/places/place-display.mjs';

const TA_CYCLE = ['பிரபவ','விபவ','சுக்ல','பிரமோதூத','பிரசோற்பத்தி','ஆங்கீரச','ஸ்ரீமுக','பவ','யுவ','தாது','ஈஸ்வர','வெகுதானிய','பிரமாதி','விக்கிரம','விஷு','சித்திரபானு','சுபானு','தாரண','பார்த்திப','விய','சர்வஜித்','சர்வதாரி','விரோதி','விகிருதி','கர','நந்தன','விஜய','ஜய','மன்மத','துன்முகி','ஹேவிளம்பி','விளம்பி','விகாரி','சார்வரி','பிலவ','சுபகிருது','சோபகிருது','குரோதி','விசுவாவசு','பராபவ','பிலவங்க','கீலக','சௌமிய','சாதாரண','விரோதிகிருது','பரிதாபி','பிரமாதீச','ஆனந்த','ராட்சச','நள','பிங்கள','காளயுக்தி','சித்தார்த்தி','ரௌத்திரி','துன்மதி','துந்துபி','ருத்ரோத்காரி','ரக்தாட்சி','குரோதன','அட்சய'];
const EN_CYCLE = ['Prabhava','Vibhava','Shukla','Pramodoota','Prajotpatti','Angirasa','Srimukha','Bhava','Yuva','Dhata','Ishvara','Bahudhanya','Pramadi','Vikrama','Vrisha','Chitrabhanu','Svabhanu','Tarana','Parthiva','Vyaya','Sarvajit','Sarvadhari','Virodhi','Vikruti','Khara','Nandana','Vijaya','Jaya','Manmatha','Durmukhi','Hevilambi','Vilambi','Vikari','Sharvari','Plava','Shubhakrit','Shobhakrit','Krodhi','Vishvavasu','Parabhava','Plavanga','Kilaka','Saumya','Sadharana','Virodhikrit','Paridhavi','Pramadicha','Ananda','Rakshasa','Nala','Pingala','Kalayukti','Siddharthi','Raudri','Durmati','Dundubhi','Rudhirodgari','Raktakshi','Krodhana','Akshaya'];
const MONTH_TA = ['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
const MONTH_EN = ['Chithirai','Vaikasi','Aani','Aadi','Avani','Purattasi','Aippasi','Karthigai','Margazhi','Thai','Masi','Panguni'];
const VARA_TA = ['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'];
const VARA_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const VARA_SA = ['சூரியவாரம்','சோமவாரம்','செவ்வாய்வாரம்','புதன்வாரம்','குருவாரம்','சுக்ரவாரம்','சனிவாரம்'];
const VARA_TA_DAY = ['ஞாயிற்றுக்கிழமை','திங்கட்கிழமை','செவ்வாய்க்கிழமை','புதன்கிழமை','வியாழக்கிழமை','வெள்ளிக்கிழமை','சனிக்கிழமை'];
const VARA_SA_EN = ['Ravivara','Somavara','Mangalavara','Budhavara','Guruvara','Shukravara','Shanivara'];
const RITU_TA = ['வசந்த','வசந்த','கிரீஷ்ம','கிரீஷ்ம','வர்ஷ','வர்ஷ','சரத்','சரத்','ஹேமந்த','ஹேமந்த','சிசிர','சிசிர'];
const RITU_EN = ['Vasanta','Vasanta','Grishma','Grishma','Varsha','Varsha','Sharad','Sharad','Hemanta','Hemanta','Shishira','Shishira'];
const AYANA_TA = ['உத்தராயண','உத்தராயண','உத்தராயண','தட்சிணாயன','தட்சிணாயன','தட்சிணாயன','தட்சிணாயன','தட்சிணாயன','தட்சிணாயன','உத்தராயண','உத்தராயண','உத்தராயண'];
const AYANA_EN = ['Uttarayana','Uttarayana','Uttarayana','Dakshinayana','Dakshinayana','Dakshinayana','Dakshinayana','Dakshinayana','Dakshinayana','Uttarayana','Uttarayana','Uttarayana'];
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateAdd = (date,n) => { const d = new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); };
const dayOf = date => new Date(date+'T12:00:00Z').getUTCDay();
const mins = time => { const m=String(time||'').match(/^(\d{1,2}):([0-5]\d)$/); return m?Number(m[1])*60+Number(m[2]):null; };
const stamp = (date,time,zone) => Date.parse(date+'T'+time+':00Z')-offsetMinutesAt(zone,date,time)*60000;
const time12 = time => { const m=String(time||'').match(/^(\d{1,2}):([0-5]\d)$/); if(!m)return '—'; const h=Number(m[1]); return String(h%12||12).padStart(2,'0')+':'+m[2]+' '+(h>=12?'PM':'AM'); };
const ghati = (v,ta) => { if(!Number.isFinite(v)||v<0)return '—'; const total=Math.round(v),n=Math.floor(total/60),r=String(total%60).padStart(2,'0'); return ta?n+' நாழிகை '+r+' விநாழிகை':n+' Nazhigai '+r+' Vinazhigai'; };
const solarInfo = (date,lat,lon,zone) => {
  const offset=offsetMinutesAt(zone,date,'12:00');
  let rise=solarNoaa(date,lat,lon,offset,true),set=solarNoaa(date,lat,lon,offset,false);
  if(!rise||!set)return null;
  rise=solarNoaa(date,lat,lon,offsetMinutesAt(zone,date,rise),true);
  set=solarNoaa(date,lat,lon,offsetMinutesAt(zone,date,set),false);
  if(!rise||!set)return null;
  return {date,rise,set,riseTs:stamp(date,rise,zone),setTs:stamp(date,set,zone)};
};
const parsePoint = raw => { const m=String(raw||'').match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/); return m?{date:m[3]+'-'+m[2]+'-'+m[1],time:m[4]+':'+m[5]}:null; };
const pointText = (point,baseDate,lat,lon,zone,ta) => {
  if(!point)return '';
  const info=solarInfo(point.date,lat,lon,zone); if(!info)return '';
  const anchorDate=mins(point.time)<mins(info.rise)?dateAdd(point.date,-1):point.date;
  const anchor=solarInfo(anchorDate,lat,lon,zone); if(!anchor)return '';
  const elapsed=stamp(point.date,point.time,zone)-anchor.riseTs; if(elapsed<0)return '';
  const relation=anchorDate<baseDate?(ta?'முந்தைய நாள் ':'Previous day '):anchorDate>baseDate?(ta?'மறுநாள் ':'Following day '):(ta?'அன்றைய ':'That day ');
  const t=mins(point.time),part=t<mins(info.rise)?(ta?'இரவு':'night'):t<720?(ta?'காலை':'morning'):t<960?(ta?'பகல்':'day'):t<1080?(ta?'மாலை':'evening'):(ta?'இரவு':'night');
  return relation+part+' '+ghati(elapsed/24000,ta)+' ('+time12(point.time)+')';
};
const rangeText = (obj,date,lat,lon,zone,ta) => {
  const a=pointText(parsePoint(obj?.start),date,lat,lon,zone,ta),b=pointText(parsePoint(obj?.end),date,lat,lon,zone,ta);
  return a&&b?a+(ta?' முதல் ':' to ')+b+(ta?' வரையும்':''):'';
};
const yogaName = (y,ta) => !y||y.key==='unknown'?(ta?'கிடைக்கவில்லை':'Unavailable'):(ta?y.ta:y.en);

export async function buildSubhaJanana(p,chart,meta={},lang='ta'){
  const ta=lang!=='en',date=String(meta.date||p?.requested?.date||''),time=String(meta.time||p?.requested?.time||'');
  const lat=Number(meta.lat??p?.requested?.latitude),lon=Number(meta.lon??p?.requested?.longitude),zone=String(meta.timezone||'Asia/Kolkata');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||mins(time)===null||!Number.isFinite(lat)||!Number.isFinite(lon)||!['male','female'].includes(String(meta.gender||'').toLowerCase()))return '';
  const requested=solarInfo(date,lat,lon,zone); if(!requested)return '';
  const solarDate=mins(time)<mins(requested.rise)?dateAdd(date,-1):date;
  const solar=solarInfo(solarDate,lat,lon,zone),next=solarInfo(dateAdd(solarDate,1),lat,lon,zone); if(!solar||!next)return '';
  const daySeconds=(solar.setTs-solar.riseTs)/1000,nightSeconds=(next.riseTs-solar.setTs)/1000;
  const pramana=calculateAhasRatriPramana(solar.rise,solar.set,next.rise,daySeconds,nightSeconds);
  const dayInput={date:solarDate,time:solar.rise,lat,lon,timezone:zone,utcOffsetMinutes:offsetMinutesAt(zone,solarDate,solar.rise),language:lang};
  const timeline=nakshatraIntervalsForLocalDay(dayInput),tya=thyajyamIntervalsForLocalDay(dayInput,timeline),weekday=dayOf(solarDate);
  const segments=timeline.available?timeline.intervals.map(x=>({...x,yoga:getTamilDayYoga(weekday,x.nakshatraNumber)})):[];
  const birthTs=stamp(date,time,zone),dayYoga=segments[0]?.yoga||null,birthYoga=segments.find(x=>birthTs>=x.startTimestamp&&birthTs<x.endTimestamp)?.yoga||null;
  const solarDateInfo=tamilSolarDate({date,time,lat,lon,utcOffsetMinutes:offsetMinutesAt(zone,date,time),timezone:zone,mode:'birth'})||p?.tamilSolar||{};
  const monthIndex=Number(solarDateInfo.index);
  // Keep the exact same April 14 Tamil-year boundary used by the existing
  // Traditional Year Reckoning table in renderBirthTimePanchang().
  const birthYear=Number(date.slice(0,4)),birthMonth=Number(date.slice(5,7)),birthDay=Number(date.slice(8,10));
  const startYear=(birthMonth>4||(birthMonth===4&&birthDay>=14))?birthYear:birthYear-1;
  const cycleIndex=((startYear-1987)%60+60)%60,samvatsara=(ta?TA_CYCLE:EN_CYCLE)[cycleIndex]||'—';
  const monthName=(ta?solarDateInfo.monthTa:solarDateInfo.monthEn)||(ta?MONTH_TA:MONTH_EN)[monthIndex]||'—';
  const monthDay=solarDateInfo.day||'—',ayana=(ta?AYANA_TA:AYANA_EN)[monthIndex]||'—',ritu=(ta?RITU_TA:RITU_EN)[monthIndex]||'—';
  const birthVighati=Math.round((birthTs-solar.riseTs)/24000);
  const thyajyam=(tya.available?tya.intervals:[]).map(w=>{
    const localize=ts=>{
      let offset=offsetMinutesAt(zone,solarDate,'12:00'),d=new Date(ts+offset*60000),dt=d.toISOString().slice(0,10);
      let tm=String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');
      offset=offsetMinutesAt(zone,dt,tm);d=new Date(ts+offset*60000);dt=d.toISOString().slice(0,10);
      tm=String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0');
      return {date:dt,time:tm};
    };
    return {start:localize(w.startTimestamp),end:localize(w.endTimestamp),startTimestamp:w.startTimestamp,endTimestamp:w.endTimestamp};
  });
  const inTyajyam=thyajyam.some(w=>birthTs>=w.startTimestamp&&birthTs<w.endTimestamp);
  const tyajyamText=thyajyam.map(w=>pointText(w.start,solarDate,lat,lon,zone,ta)+' '+(ta?'முதல்':'to')+' '+pointText(w.end,solarDate,lat,lon,zone,ta)).filter(Boolean).join('; ');
  const placeParts=[];
  const administrativeAreas=formatOfflineIndiaAdministrativeAreas(meta.state,meta.district,ta?'ta':'en');
  const placeName=String(meta.placeName||'').trim();
  if(placeName&&placeName.toLocaleLowerCase()!==String(administrativeAreas.admin2||'').toLocaleLowerCase())placeParts.push(placeName);
  if(administrativeAreas.admin2)placeParts.push(ta?administrativeAreas.admin2+' மாவட்டம்':administrativeAreas.admin2+' District');
  if(meta.village)placeParts.push(ta?meta.village+' கிராமம்':meta.village+' Village');
  if(administrativeAreas.admin1)placeParts.push(ta?administrativeAreas.admin1+' மாநிலம்':administrativeAreas.admin1+' State');
  if(!placeParts.length&&meta.birthPlace)placeParts.push(meta.birthPlace);
  if(meta.country&&String(meta.country).toLowerCase()!=='india')placeParts.push(meta.country);
  const place=placeParts.map(esc).join(', ')||'—';
  const gender=String(meta.gender).toLowerCase(),father=String(meta.fatherName||'').trim(),mother=String(meta.motherName||'').trim(),name=String(meta.name||'').trim();
  const parentText=father&&mother?(ta?'திரு. '+esc(father)+' அவர்களுக்கும், தர்மபத்தினி சௌபாக்கியவதி திருமதி. '+esc(mother)+' அவர்களுக்கும்':'to Mr. '+esc(father)+' and his wife Mrs. '+esc(mother)):father?(ta?'திரு. '+esc(father)+' அவர்களுக்கும்':'to Mr. '+esc(father)):mother?(ta?'திருமதி. '+esc(mother)+' அவர்களுக்கும்':'to Mrs. '+esc(mother)):'';
  const lagna=chart?.lagna?.rasi||chart?.lagna?.sign||'—',moon=p?.moonSign||chart?.planets?.find(x=>['சந்திரன்','Moon'].includes(x?.name))?.rasi||'—';
  const paksha=/shukla|சுக்ல|வளர்பிறை/i.test(String(p?.tithi?.half||''))?(ta?'சுக்ல பட்சத்து (வளர்பிறை)':'Shukla Paksha (waxing Moon)'):(ta?'கிருஷ்ண பட்சத்து (தேய்பிறை)':'Krishna Paksha (waning Moon)');
  const dayYogaName=yogaName(dayYoga,ta),birthYogaName=yogaName(birthYoga,ta);
  const amirthadi=ta?dayYogaName+' (பிறந்த நேர அமிர்தாதி யோகம்: '+birthYogaName+')':dayYogaName+' (Amirthadi Yoga at birth: '+birthYogaName+')';
  const ranges=[rangeText(p?.tithi,date,lat,lon,zone,ta),rangeText(p?.nakshatra,date,lat,lon,zone,ta),rangeText(p?.yoga,date,lat,lon,zone,ta),rangeText(p?.karana,date,lat,lon,zone,ta)];
  const dayLabel=ta?VARA_TA_DAY[weekday]+' ('+VARA_SA[weekday]+')':VARA_EN[weekday]+' ('+VARA_SA_EN[weekday]+')';
  const sunRise=ta?solar.rise:time12(solar.rise),sunSet=ta?solar.set:time12(solar.set),ahas=ghati(pramana?.ahasNazhigai?.totalVighati,ta),ratri=ghati(pramana?.ratriNazhigai?.totalVighati,ta);
  const tyaLine=tyajyamText?(ta?'தியாஜ்யம்: '+tyajyamText+' ':'Thyajyam: '+tyajyamText+' '):'';
  const auspicious=inTyajyam?(ta?'(பிறந்த நேரம் தியாஜ்ய காலத்துடன் பொருந்துகிறது)':'(birth time overlaps Thyajyam)'):(ta?'(தியாஜ்யம் நீங்கிய சுப வேளையில்)':'(outside the Thyajyam interval)');
  const tithi=String(p?.tithi?.name||p?.tithi?.group||'—'),nak=String(p?.nakshatra?.name||'—'),yoga=String(p?.yoga?.name||'—'),karana=String(p?.karana?.name||'—');
  const birthTimeGhati=ghati(birthVighati,ta),birthClockTa=(mins(time)>=18*60||mins(time)<5*60?'இரவு':mins(time)<12*60?'காலை':mins(time)<17*60?'பகல்':'மாலை')+' '+time12(time).replace(/ (AM|PM)$/,''),birthClockEn=time12(time);
  const child=ta?(gender==='female'?'புத்திரி பாக்கியமாக பெண் குழந்தை சுபஜெனனம் நிகழ்ந்தது.':'புத்திர பாக்கியமாக ஆண் குழந்தை சுபஜெனனம் நிகழ்ந்தது.'):(gender==='female'?'A baby girl was born as a blessed daughter.':'A baby boy was born as a blessed son.');
  const naming=name?(ta?'பெற்றோரால் இக்குழந்தைக்கு '+esc(name)+' எனத் திருநாமம் சூட்டப்பெற்றது.':'The child was given the auspicious name '+esc(name)+' by the parents.'):'';
  const blessing=ta?'இந்நன்னாளில் பிறந்த இக்குழந்தை சகல சௌபாக்கியங்களும், தீர்க்காயுளும், நிறைந்த கல்வியும், செல்வமும் பெற்று சீரும் சிறப்புமாக வாழ எல்லாம் வல்ல இறைவன் அருள் புரிவாராக!':'May the Almighty bless this child with every prosperity, long life, abundant learning and wealth, and a life of dignity and fulfilment.';
  const text=ta
    ? 'நிகழும் மங்களகரமான '+samvatsara+' நாம சம்வத்ஸரம், '+ayana+' புண்ணிய காலமும் '+ritu+' ருதுவும் '+monthName+' மாதம் '+monthDay+'-ஆம் நாள் '+dayLabel+' கூடிய சுபயோக சுப தினத்தில் சூரிய உதயம் காலை '+sunRise+' மணியும் அஸ்தமனம் மாலை '+sunSet+' மணியும் அகஸ் (பகல் அளவு) '+ahas+' (இரவு அளவு: '+ratri+') கொண்ட நன்னாளில் '+paksha+' '+tithi+' திதி — '+ranges[0]+'; '+nak+' நட்சத்திரம் ('+(p?.nakshatra?.pada||'—')+'-ஆம் பாதம்) — '+ranges[1]+'; '+yoga+' யோகம் — '+ranges[2]+'; '+karana+' கரணம் — '+ranges[3]+'. '+tyaLine+auspicious+' '+amirthadi+'. சூரிய உதயாதி '+birthTimeGhati+'க்கு (சரியாக '+birthClockTa+' மணிக்கு), '+lagna+' லக்னத்தில், '+moon+' ராசியில், '+place+' திருத்தலத்தில்; '+(parentText?parentText+' ':'')+child+' '+naming+' '+blessing
    : 'In the auspicious '+samvatsara+' Samvatsara, during '+ayana+' and the '+ritu+' season, on day '+monthDay+' of '+monthName+', '+dayLabel+', sunrise '+sunRise+', sunset '+sunSet+', Ahas '+ahas+' and Ratri '+ratri+'. '+paksha+', '+tithi+' Tithi — '+ranges[0]+'; '+nak+' Nakshatra (Pada '+(p?.nakshatra?.pada||'—')+') — '+ranges[1]+'; '+yoga+' Yoga — '+ranges[2]+'; '+karana+' Karana — '+ranges[3]+'. '+tyaLine+auspicious+' '+amirthadi+'. At '+birthTimeGhati+' after sunrise (exactly '+birthClockEn+'), under '+(chart?.lagna?.rasi||chart?.lagna?.sign||'—')+' Lagna and '+moon+' Moon Rasi, at '+place+'; '+(parentText?parentText+' ':'')+child+' '+naming+' '+blessing;
  return '<div class="smv-subha-janana"><h3>'+(ta?'ஸ்ரீமத் சுபஜெனன வாக்கியம்':'Sri Math Subha Janana Statement')+'</h3><p>'+text+'</p></div>';
}
