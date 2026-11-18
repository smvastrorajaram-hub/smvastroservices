import {getSwe} from './offline/wasm-provider.mjs';
import {offsetMinutesAt} from './offline/places/timezone.mjs';
import {calculateSwiss,calculateSunMoon,calculateLahiriContextAt} from './offline/swiss_vedic.browser.mjs';
import {panchang,transit,calendarTamil,solarNoaa,tamilSolarDate,nextSolarIngress,nakshatraIntervalsForLocalDay,thyajyamIntervalsForLocalDay,calculateAhasRatriPramana,calculateDinantham} from './offline/transit_panchang.browser.mjs';
import {getTamilDayYoga} from './tamil-day-classifications.mjs';
import {meanObliquityAtJulianDay,calculateSolarSignRasiMana,calculateRemainingSolarSignRasiMana} from './offline/rasi-mana.browser.mjs';
import {getChandrashtamaRasiIndex,getChandrashtamaPadaSegments,normalizeSiderealLongitude} from './calendar-chandrashtama.mjs';
import {getPushkaraNavamsa,classifyDocument50MarriageMuhurtham} from './calendar-muhurta-activities.mjs';
const norm=n=>(n%360+360)%360;
const cache=new Map();
const sampleCache=new Map();
async function sample(input,time){
 const key=[Number(input.lat).toFixed(5),Number(input.lon).toFixed(5),Number(input.utcOffsetMinutes),input.date,time].join('|');
 let pendingSample=sampleCache.get(key);
 if(!pendingSample){
  pendingSample=calculateSunMoon({...input,time}).then(({sunLongitude:sun,moonLongitude:moon})=>({
   tithi:Math.floor(norm(moon-sun)/12)+1,
   star:Math.floor(norm(moon)/(360/27))+1,
   moon:Math.floor(norm(moon)/30),
   solar:Math.floor(norm(sun)/30),
   sunStar:Math.floor(norm(sun)/(360/27)) + 1
  }));
  sampleCache.set(key,pendingSample);
  if(sampleCache.size>4096)sampleCache.delete(sampleCache.keys().next().value);
 }
 try{return await pendingSample;}
 catch(error){if(sampleCache.get(key)===pendingSample)sampleCache.delete(key);throw error;}
}
function minute(t){return +t.slice(0,2)*60+ +t.slice(3,5)}
function clock(n){n=(Math.round(n)%1440+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}

function localPartsFromTs(ts,offset){
 const d=new Date(Number(ts)+Number(offset??330)*60000);
 return {
  date:String(d.getUTCFullYear())+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'),
  time:String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+':'+String(d.getUTCSeconds()).padStart(2,'0')
 };
}


// Exact Rasi-based Chandrashtama windows.
// The Moon's geocentric sidereal Lahiri longitude is sampled locally, then
// every 3°20' boundary inside the 8th Rasi is refined to the nearest second.
function localWallParts(date, secondsAfterMidnight){
 const base=Date.parse(String(date)+'T00:00:00Z');
 if(!Number.isFinite(base))throw new Error('Invalid local civil date for Pushkara calculation.');
 const d=new Date(base+Number(secondsAfterMidnight)*1000);
 return {
  date:String(d.getUTCFullYear()).padStart(4,'0')+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'),
  time:String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0')+':'+String(d.getUTCSeconds()).padStart(2,'0')
 };
}
function clockWithSeconds(seconds){
 const value=Math.max(0,Math.min(86400,Math.round(Number(seconds))));
 if(value===86400)return '24:00:00';
 return String(Math.floor(value/3600)).padStart(2,'0')+':'+String(Math.floor(value%3600/60)).padStart(2,'0')+':'+String(value%60).padStart(2,'0');
}

function pushkaraTimezoneSegments(date,startSeconds,endSeconds,timezone,defaultOffset){
 if(!timezone)return [{start:startSeconds,end:endSeconds+1,offset:Number(defaultOffset)}];
 const offsetAt=seconds=>{
  const wall=localWallParts(date,seconds);
  const value=Number(offsetMinutesAt(timezone,wall.date,wall.time.slice(0,5)));
  if(!Number.isFinite(value)||value < -720||value > 840)throw new Error('Timezone offset is invalid for '+timezone+' at '+wall.date+' '+wall.time);
  return value;
 };
 const segments=[];
 const checkpointSeconds=15*60;
 let segmentStart=startSeconds;
 let previousCheckpoint=startSeconds;
 let currentOffset=offsetAt(startSeconds);
 for(let checkpoint=startSeconds+checkpointSeconds;checkpoint<=endSeconds;checkpoint+=checkpointSeconds){
  const checkpointOffset=offsetAt(checkpoint);
  if(checkpointOffset!==currentOffset){
   // Resolve the minute at which the local civil-time offset changes.
   // Checkpoint sampling avoids constructing Intl formatters per 30-second Lagna sample.
   let lo=previousCheckpoint,hi=checkpoint;
   while(hi-lo>60){
    let mid=Math.floor(((lo+hi)/2)/60)*60;
    if(mid<=lo)mid=lo+60;
    if(mid>=hi)break;
    if(offsetAt(mid)===currentOffset)lo=mid;else hi=mid;
   }
   const boundary=hi;
   segments.push({start:segmentStart,end:boundary,offset:currentOffset});
   segmentStart=boundary;
   currentOffset=offsetAt(boundary);
  }
  previousCheckpoint=checkpoint;
 }
 segments.push({start:segmentStart,end:endSeconds+1,offset:currentOffset});
 return segments;
}
function pushkaraOffsetAt(segments,seconds){
 for(let i=segments.length-1;i>=0;i--){
  if(seconds>=segments[i].start)return segments[i].offset;
 }
 throw new Error('Local timezone segment could not be resolved for Pushkara calculation.');
}
async function calculateDocument50PushkaraWindows(input){
 const date=String(input?.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('Pushkara calculation needs a valid local date.');
 const parsed=new Date(date+'T12:00:00Z');
 if(Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==date)throw new Error('Pushkara calculation date is invalid.');
 const annualDate=classifyDocument50MarriageMuhurtham({date});
 if(!annualDate.available||annualDate.listed!==true)return {available:true,listed:false,date,reason:'Thali Pushkara timings are shown only for the 2026–2027 and 2027–2028 Document 50 listed dates',intervalCount:0,intervals:[]};
 const janmaRasiIndex=Number(input.janmaRasiIndex);
 const chandrashtamaRasiIndex=getChandrashtamaRasiIndex(janmaRasiIndex);
 if(chandrashtamaRasiIndex===null)throw new Error('A valid selected Janma Rasi is required for the Chandrashtama check.');
 const lat=Number(input.lat),lon=Number(input.lon),defaultOffset=Number(input.utcOffsetMinutes);
 if(!Number.isFinite(lat)||lat < -89||lat > 89||!Number.isFinite(lon)||lon < -180||lon > 180)throw new Error('Valid latitude and longitude are required for Pushkara calculation.');
 if(!Number.isFinite(defaultOffset)||defaultOffset < -720||defaultOffset > 840)throw new Error('A valid local UTC offset is required for Pushkara calculation.');
 const timezone=String(input.timezone||'').trim();
 const startOfScan=3*3600,endOfScan=12*3600,step=30;
 const timezoneSegments=pushkaraTimezoneSegments(date,startOfScan,endOfScan,timezone,defaultOffset);
 const swe=await getSwe();
 swe.setSiderealLahiri();
 const samples=new Map();
 const lagnaAt=seconds=>{
  const s=Math.max(0,Math.min(86400,Math.round(seconds)));
  if(samples.has(s))return samples.get(s);
  const wall=localWallParts(date,s);
  const offset=pushkaraOffsetAt(timezoneSegments,s);
  if(!Number.isFinite(Number(offset))||Number(offset)<-720||Number(offset)>840)throw new Error('Timezone offset is invalid for '+wall.date+' '+wall.time);
  const utcMs=Date.parse(wall.date+'T'+wall.time+'Z')-Number(offset)*60000;
  const utc=new Date(utcMs);
  const jd=swe.utcToJd(
   utc.getUTCFullYear(),utc.getUTCMonth()+1,utc.getUTCDate(),
   utc.getUTCHours(),utc.getUTCMinutes(),utc.getUTCSeconds()
  );
  if(!jd||!Number.isFinite(Number(jd.ut)))throw new Error('Swiss Ephemeris could not calculate the local UTC Julian day.');
  const houses=swe.houses(Number(jd.ut),lat,lon,'S');
  const ascendant=Number(houses?.ascendant);
  if(!Number.isFinite(ascendant))throw new Error('Swiss Ephemeris returned an invalid Lahiri Lagna at '+wall.date+' '+wall.time);
  const result=norm(ascendant);
  samples.set(s,result);
  return result;
 };
 const isPushkara=seconds=>getPushkaraNavamsa(lagnaAt(seconds)).isPushkaraNavamsa===true;
 const refine=async(lo,hi,target)=>{
  while(hi-lo>1){
   const mid=Math.floor((lo+hi)/2);
   if(isPushkara(mid)===target)hi=mid;else lo=mid;
  }
  return hi;
 };
 // Document 50's table is explicitly a morning Pushkara-Lagna table.
 // Scan 03:00–12:00 local time and refine each crossing to one second.
 let previousSecond=startOfScan;
 let previousInside=isPushkara(previousSecond);
 let openStart=previousInside?startOfScan:null;
 const intervals=[];
 for(let second=startOfScan+step;second<=endOfScan;second+=step){
  const currentInside=isPushkara(second);
  if(!previousInside&&currentInside){
   openStart=await refine(previousSecond,second,true);
  }else if(previousInside&&!currentInside&&openStart!==null){
   const close=await refine(previousSecond,second,false);
   const mid=Math.floor((openStart+close)/2);
   const midpoint=getPushkaraNavamsa(lagnaAt(mid));
   if(midpoint.available&&midpoint.isPushkaraNavamsa){
    intervals.push({
     startSeconds:openStart,endSeconds:close,durationSeconds:close-openStart,
     startTime:clockWithSeconds(openStart),endTime:clockWithSeconds(close),
     lagnaSignEn:midpoint.signEn,lagnaSignTa:midpoint.signTa,
     lagnaDegree:midpoint.degreeText,
     navamsaSignEn:midpoint.navamsaSignEn,navamsaSignTa:midpoint.navamsaSignTa,
     navamsaPart:midpoint.navamsaPart,
     pushkaraStart:midpoint.pushkaraInterval?.start||null,
     pushkaraEnd:midpoint.pushkaraInterval?.end||null
    });
   }
   openStart=null;
  }
  previousSecond=second;
  previousInside=currentInside;
 }
 if(previousInside&&openStart!==null){
  const midpoint=getPushkaraNavamsa(lagnaAt(Math.floor((openStart+endOfScan)/2)));
  if(midpoint.available&&midpoint.isPushkaraNavamsa){
   intervals.push({
    startSeconds:openStart,endSeconds:endOfScan,durationSeconds:endOfScan-openStart,
    startTime:clockWithSeconds(openStart),endTime:clockWithSeconds(endOfScan),
    lagnaSignEn:midpoint.signEn,lagnaSignTa:midpoint.signTa,
    lagnaDegree:midpoint.degreeText,
    navamsaSignEn:midpoint.navamsaSignEn,navamsaSignTa:midpoint.navamsaSignTa,
    navamsaPart:midpoint.navamsaPart,
    pushkaraStart:midpoint.pushkaraInterval?.start||null,
    pushkaraEnd:midpoint.pushkaraInterval?.end||null
   });
  }
 }
 for(const interval of intervals){
  const midpointSeconds=Math.floor((interval.startSeconds+interval.endSeconds)/2);
  const midpointTime=clockWithSeconds(midpointSeconds).slice(0,5);
  const midpointOffset=pushkaraOffsetAt(timezoneSegments,midpointSeconds);
  const moon=await sample({...input,utcOffsetMinutes:midpointOffset},midpointTime);
  interval.transitMoonSignIndex=Number(moon.moon);
  interval.chandrashtamaRasiIndex=chandrashtamaRasiIndex;
  interval.chandrashtama=interval.transitMoonSignIndex===chandrashtamaRasiIndex;
  interval.chandrashtamaEvaluatedAt=midpointTime;
 }
 return {
  available:true,listed:true,date,janmaRasiIndex,chandrashtamaRasiIndex,latitude:lat,longitude:lon,timezone:timezone||null,
  utcOffsetMinutes:defaultOffset,houseSystem:'Sripati',
  zodiac:'Sidereal Lahiri',engine:'Local Swiss Ephemeris WASM',
  scanStart:'03:00:00',scanEnd:'12:00:00',scanStepSeconds:step,
  boundaryPrecisionSeconds:1,intervalCount:intervals.length,intervals
 };
}


function chandrashtamaLocalParts(timestamp,input){
 const ts=Math.round(Number(timestamp)/1000)*1000;
 if(input.timezone){
  const formatter=new Intl.DateTimeFormat('en-CA',{
   timeZone:String(input.timezone),year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
  });
  const parts=Object.fromEntries(formatter.formatToParts(new Date(ts))
   .filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
  const date=parts.year+'-'+parts.month+'-'+parts.day;
  const time=parts.hour+':'+parts.minute+':'+parts.second;
  // Derive the offset from this absolute instant, so repeated DST clock hours
  // cannot accidentally resolve to the earlier occurrence of the same wall time.
  const localWallAsUtc=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),
   Number(parts.hour),Number(parts.minute),Number(parts.second));
  const utcOffsetMinutes=(localWallAsUtc-ts)/60000;
  return {date,time,utcOffsetMinutes};
 }
 return {...localPartsFromTs(ts,input.utcOffsetMinutes),utcOffsetMinutes:Number(input.utcOffsetMinutes??330)};
}

function chandrashtamaStartTimestamp(input){
 const date=String(input.date||''),time=String(input.time||'12:00');
 const match=time.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!match)throw new Error('சந்திராஷ்டமக் கணக்கிற்கு தேதி / நேரம் சரியாக இல்லை.');
 const offset= input.timezone
  ? offsetMinutesAt(input.timezone,date,match[1].padStart(2,'0')+':'+match[2])
  : Number(input.utcOffsetMinutes??330);
 return Date.UTC(
  Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8,10)),
  Number(match[1]),Number(match[2]),Number(match[3]||0)
 )-offset*60000;
}

async function calculateChandrashtamaWindows(input){
 const janmaRasiIndex=Number(input.janmaRasiIndex);
 const chandrashtamaRasiIndex=getChandrashtamaRasiIndex(janmaRasiIndex);
 const horizonDays=Math.max(30,Math.min(180,Math.floor(Number(input.horizonDays)||90)));
 const latitude=Number(input.lat),longitude=Number(input.lon);
 const fallbackOffset=Number(input.utcOffsetMinutes??330);
 if(chandrashtamaRasiIndex===null||!Number.isFinite(latitude)||latitude<-90||latitude>90||
    !Number.isFinite(longitude)||longitude<-180||longitude>180||
    !Number.isFinite(fallbackOffset)||fallbackOffset < -720||fallbackOffset>840){
  return {available:false,reason:'ஜன்ம ராசி, இடக் கோடுகள் அல்லது நேர மண்டலத் தகவல் சரியாக இல்லை.'};
 }
 const requestedStart=chandrashtamaStartTimestamp(input);
 const horizonEnd=requestedStart+horizonDays*86400000;
 // Three days of look-back ensure a window already in progress is complete.
 const scanStart=requestedStart-3*86400000;
 const stepMilliseconds=2*60*60*1000;
 const sampleCacheLocal=new Map();
 async function moonAt(timestamp){
  const ts=Math.round(Number(timestamp)/1000)*1000;
  if(sampleCacheLocal.has(ts))return sampleCacheLocal.get(ts);
  const pending=Promise.resolve().then(async()=>{
   const local=chandrashtamaLocalParts(ts,input);
   const result=await calculateSunMoon({
    ...input,date:local.date,time:local.time,utcOffsetMinutes:local.utcOffsetMinutes
   });
   const value=normalizeSiderealLongitude(result?.moonLongitude);
   if(value===null)throw new Error('Swiss Ephemeris சந்திர தீர்க்கரேகை கிடைக்கவில்லை.');
   return value;
  });
  sampleCacheLocal.set(ts,pending);
  if(sampleCacheLocal.size>6000)sampleCacheLocal.delete(sampleCacheLocal.keys().next().value);
  try{return await pending;}
  catch(error){if(sampleCacheLocal.get(ts)===pending)sampleCacheLocal.delete(ts);throw error;}
 }
 function signedLongitudeDistance(value,target){
  return ((normalizeSiderealLongitude(value)-normalizeSiderealLongitude(target)+540)%360)-180;
 }
 async function refineBoundary(loValue,hiValue,targetLongitude){
  let lo=Number(loValue),hi=Number(hiValue);
  for(let iteration=0;iteration<24&&hi-lo>1000;iteration++){
   const mid=Math.floor((lo+hi)/2);
   const value=await moonAt(mid);
   if(signedLongitudeDistance(value,targetLongitude)>=0)hi=mid;
   else lo=mid;
  }
  return Math.round(hi/1000)*1000;
 }
 const signStart=chandrashtamaRasiIndex*30;
 const crossings=new Map();
 let previousTimestamp=scanStart;
 let previousLongitude=await moonAt(previousTimestamp);
 let previousUnwrapped=previousLongitude;
 const firstCycle=Math.floor(previousUnwrapped/360)-1;
 let lastCycle=firstCycle;
 const scanEnd=horizonEnd;
 for(let nextTimestamp=Math.min(scanStart+stepMilliseconds,scanEnd);;){
  const currentLongitude=await moonAt(nextTimestamp);
  const delta=normalizeSiderealLongitude(currentLongitude-previousLongitude);
  if(delta>180)throw new Error('சந்திரனின் தொடர்ச்சியான தீர்க்கரேகை மாற்றம் சரிபார்க்க முடியவில்லை.');
  const currentUnwrapped=previousUnwrapped+delta;
  const lowCycle=Math.floor(previousUnwrapped/360)-1;
  const highCycle=Math.floor(currentUnwrapped/360)+1;
  for(let cycle=lowCycle;cycle<=highCycle;cycle++){
   for(let padaBoundary=0;padaBoundary<=9;padaBoundary++){
    const target=signStart+cycle*360+padaBoundary*(30/9);
    if(target>previousUnwrapped+1e-9&&target<=currentUnwrapped+1e-8){
     const crossingKey=cycle+':'+padaBoundary;
     if(!crossings.has(crossingKey)){
      crossings.set(crossingKey,await refineBoundary(previousTimestamp,nextTimestamp,target));
     }
    }
   }
  }
  lastCycle=Math.max(lastCycle,Math.floor(currentUnwrapped/360)+1);
  previousTimestamp=nextTimestamp;
  previousLongitude=currentLongitude;
  previousUnwrapped=currentUnwrapped;
  if(nextTimestamp>=horizonEnd)break;
  nextTimestamp=Math.min(nextTimestamp+stepMilliseconds,horizonEnd);
 }
 const localCache=new Map();
 function localAt(timestamp){
  const ts=Math.round(Number(timestamp)/1000)*1000;
  if(!localCache.has(ts))localCache.set(ts,chandrashtamaLocalParts(ts,input));
  return localCache.get(ts);
 }
 const templates=getChandrashtamaPadaSegments(chandrashtamaRasiIndex);
 const windows=[];
 for(let cycle=firstCycle;cycle<=lastCycle;cycle++){
  const boundaries=Array.from({length:10},(_,index)=>crossings.get(cycle+':'+index));
  if(boundaries.some(value=>!Number.isFinite(value)))continue;
  const startTimestamp=boundaries[0],endTimestamp=boundaries[9];
  if(endTimestamp<=requestedStart||startTimestamp>=horizonEnd)continue;
  const segments=templates.map((template,index)=>{
   const startTimestamp=boundaries[index],endTimestamp=boundaries[index+1];
   const start=localAt(startTimestamp),end=localAt(endTimestamp);
   return {
    ...template,startTimestamp,endTimestamp,
    startDate:start.date,startTime:start.time,
    endDate:end.date,endTime:end.time
   };
  });
  const start=localAt(startTimestamp),end=localAt(endTimestamp);
  windows.push({
   startTimestamp,endTimestamp,
   startDate:start.date,startTime:start.time,
   endDate:end.date,endTime:end.time,
   durationMinutes:Math.round((endTimestamp-startTimestamp)/60000),
   active:startTimestamp<=requestedStart&&requestedStart<endTimestamp,
   segments
  });
 }
 windows.sort((a,b)=>a.startTimestamp-b.startTimestamp);
 return {
  available:true,
  method:'Rasi-based Chandrashtama: transiting Moon in the eighth sidereal Rasi from Janma Rasi',
  engine:'SMV Swiss Ephemeris WASM · geocentric sidereal Lahiri',
  janmaRasiIndex,chandrashtamaRasiIndex,horizonDays,
  requestedStartTimestamp:requestedStart,
  windows
 };
}

const solarSignRasiManaCache=new Map();
async function calculateSolarSignRasiManaForIngress(input){
 // The solar sign is selected from the exact local-sunrise interval.
 await calculateSunMoon({...input,time:String(input.time||'12:00')});
 const ingress=nextSolarIngress(input);
 if(!ingress||!Number.isFinite(ingress.timestamp))return null;
 const cacheKey=[Number(input.lat).toFixed(5),Number(input.lon).toFixed(5),Number(input.utcOffsetMinutes),ingress.timestamp].join('|');
 let base=solarSignRasiManaCache.get(cacheKey);
 if(!base){
  const local=localPartsFromTs(ingress.timestamp,input.utcOffsetMinutes);
  const epoch=await calculateLahiriContextAt({
   ...input,date:local.date,time:local.time
  });
  const obliquityDegrees=meanObliquityAtJulianDay(epoch.julianDayUt);
  const rasi=calculateSolarSignRasiMana({
   solarSignIndex:ingress.signIndex,
   latitude:input.lat,
   ayanamsaDegrees:epoch.ayanamsaDegrees,
   obliquityDegrees
  });
  if(!rasi.available)return null;
  base={
   sunSignIndex:ingress.signIndex,
   rasiManaSignIndex:rasi.signIndex,
   ingressDate:ingress.date,
   ingressTime:ingress.time,
   ingressSunLongitude:ingress.sunLongitude,
   ayanamsaDegrees:epoch.ayanamsaDegrees,
   obliquityDegrees,
   fullBalanceSeconds:rasi.balanceSeconds,
   fullBalanceVighati:rasi.totalVighati,
   fullBalanceNazhigai:rasi.nazhigai,
   fullBalanceVinazhigai:rasi.vinazhigai,
   selectedRasiMana:rasi.selectedRasiMana,
   rasiMana:rasi.rasiMana.rows,
   rasiManaAvailable:rasi.rasiMana.available,
   method:rasi.method
  };
  solarSignRasiManaCache.set(cacheKey,base);
  if(solarSignRasiManaCache.size>12)solarSignRasiManaCache.delete(solarSignRasiManaCache.keys().next().value);
 }
 // The solar sign is fixed by the selected local-sunrise interval. Resolve
 // the Sun's exact sidereal longitude at this sunrise and integrate only the
 // remaining OA arc from that longitude to the end of the solar sign.
 const sunrise=solarNoaa(input.date,input.lat,input.lon,input.utcOffsetMinutes,true);
 if(!sunrise)return null;
 const sunriseSun=await calculateSunMoon({...input,time:sunrise});
 const sunriseSunLongitude=Number(sunriseSun.sunLongitude);
 const sunriseSunSignIndex=Math.floor(norm(sunriseSunLongitude)/30);
 // A same-day daytime ingress is assigned to this Tamil civil date by the
 // existing sunrise/sunset boundary rule. Treat that date as month-day 1 (0°)
 // for this date-level Rasi Mana snapshot; an after-sunset ingress is already
 // assigned to the following date by nextSolarIngress().
 const rasiLongitudeAtSunrise=sunriseSunSignIndex===base.sunSignIndex
  ?sunriseSunLongitude:base.sunSignIndex*30;
 const remaining=calculateRemainingSolarSignRasiMana({
  solarLongitude:rasiLongitudeAtSunrise,
  solarSignIndex:base.sunSignIndex,
  latitude:input.lat,
  ayanamsaDegrees:base.ayanamsaDegrees,
  obliquityDegrees:base.obliquityDegrees,
  fullBalanceVighati:base.fullBalanceVighati
 });
 if(!remaining.available)return null;
 return {
  ...base,
  sunrise,
  selectedTime:sunrise,
  sunriseSunLongitude,
  sunriseSunSignIndex,
  sunriseSunDegreeInSign:norm(sunriseSunLongitude)%30,
  sunDegreeInSign:remaining.degreeInSign,
  sunriseMonthBoundaryApplied:sunriseSunSignIndex!==base.sunSignIndex,
  remainingSignDegrees:remaining.remainingSignDegrees,
  remainingOADegrees:remaining.remainingOADegrees,
  remainingExactVighati:remaining.remainingExactVighati,
  remainingSeconds:remaining.remainingSeconds,
  remainingVighati:remaining.remainingVighati,
  balanceSeconds:remaining.balanceSeconds,
  balanceNazhigai:remaining.balanceNazhigai,
  balanceVinazhigai:remaining.balanceVinazhigai
 };
}

// Geocentric lunar rise threshold (mean refraction + horizontal parallax).
// Five-minute bracketing followed by bisection; local civil day, no timezone guessing.
async function moonrise(input){
 const swe=await getSwe(),rad=Math.PI/180,base=Date.parse(input.date+'T00:00:00Z')-input.utcOffsetMinutes*60000;
 const altitude=m=>{const d=new Date(base+m*60000),jd=swe.utcToJd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds());const q=swe.calc(jd.et,1,2|256|2048),T=(jd.ut-2451545)/36525,gmst=280.46061837+360.98564736629*(jd.ut-2451545)+.000387933*T*T-T*T*T/38710000,H=norm(gmst+input.lon-q.longitude)*rad,lat=input.lat*rad,dec=q.latitude*rad;return Math.asin(Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(H))/rad-.125;};
 let last=altitude(0);for(let m=10;m<=1440;m+=10){const a=altitude(m);if(last<0&&a>=0){let lo=m-10,hi=m;for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(altitude(mid)>=0)hi=mid;else lo=mid;}return clock((lo+hi)/2)}last=a;}return null;
}
async function events(input){
 const rise=solarNoaa(input.date,input.lat,input.lon,input.utcOffsetMinutes,true),set=solarNoaa(input.date,input.lat,input.lon,input.utcOffsetMinutes,false);
 if(!rise||!set)return {date:input.date,events:[],unavailable:true};
 const [r,mid,s,night]=await Promise.all([sample(input,rise),sample(input,'12:00'),sample(input,set),sample(input,'23:50')]);
 const ev=[];const add=(en,ta,basis)=>ev.push({name:[en,ta],basis});
 if([11,26].includes(r.tithi))add('Ekadashi','ஏகாதசி','sunrise');
 if(r.tithi===6)add('Shashti','சஷ்டி','sunrise');
 if(r.tithi===4||mid.tithi===4)add('Shukla Chathurthi','வளர்பிறை சதுர்த்தி','midday');
 if(mid.tithi===30)add('Amavasya','அமாவாசை','midday');
 if(s.tithi===15)add('Pournami','பௌர்ணமி','sunset');
 // Pradosha is Trayodashi overlapping the post-sunset period, not noon tithi.
 const later=[13,28].includes(s.tithi)?null:await sample(input,clock(minute(set)+90));
 if([13,28].includes(s.tithi)||(later&&[13,28].includes(later.tithi)))add('Pradosham','பிரதோஷம்','sunset');
 if(night.tithi===29)add('Monthly Shivaratri','மாத சிவராத்திரி','night');
 if(r.star===3)add('Krittika Vrat','கார்த்திகை விரதம்','sunrise');
 if(r.star===8&&r.solar===9)add('Thai Poosam','தைப்பூசம்','sunrise');
 if(r.star===12&&r.solar===11)add('Panguni Uthiram','பங்குனி உத்திரம்','sunrise');
 if(r.star===16&&r.solar===1)add('Vaikasi Visakam','வைகாசி விசாகம்','sunrise');
 if(r.star===11&&r.solar===3)add('Aadi Pooram','ஆடிப்பூரம்','sunrise');
 if(r.star===3&&r.solar===7)add('Karthigai Deepam','கார்த்திகை தீபம்','sunrise');
 if([r.tithi,mid.tithi,s.tithi,night.tithi].includes(19)){const riseMoon=await moonrise(input);if(riseMoon&&(await sample(input,riseMoon)).tithi===19)add('Sankatahara Chathurthi','சங்கடஹர சதுர்த்தி','moonrise '+riseMoon);}
 if(r.solar===3&&mid.tithi===30)add('Aadi Amavasya','ஆடி அமாவாசை','midday');
 if(r.solar===9&&mid.tithi===30)add('Thai Amavasya','தை அமாவாசை','midday');
 if(r.solar===5&&mid.tithi===30)add('Mahalaya Amavasya','மகாளய அமாவாசை','midday');
 return {date:input.date,events:ev,moon:r.moon,star:r.star,sunStar:r.sunStar};
}

function dateDistance(date,reference){
 const current=Date.parse(String(date)+'T00:00:00Z'),base=Date.parse(String(reference)+'T00:00:00Z');
 return Number.isFinite(current)&&Number.isFinite(base)?Math.round((current-base)/86400000):0;
}
async function attachTamilSolarDates(input,entries){
 if(!entries.length)return entries;
 const firstDate=entries[0].date;
 const dateDistance=(date,reference)=>{
  const current=Date.parse(String(date)+'T00:00:00Z'),base=Date.parse(String(reference)+'T00:00:00Z');
  return Number.isFinite(current)&&Number.isFinite(base)?Math.round((current-base)/86400000):0;
 };
 const describe=(solar,date)=>{
  if(!solar||!Number.isFinite(Number(solar.day)))return null;
  const offset=Number(solar.day)-dateDistance(date,firstDate);
  return {
   index:solar.index,monthTa:solar.monthTa,monthEn:solar.monthEn,
   monthStartDate:solar.monthStartDate,offset,
   signature:[solar.index,solar.monthStartDate,offset].join('|')
  };
 };
 // Three evenly spaced probes keep each interval under 16 days, shorter than
 // the minimum interval between consecutive sidereal solar ingresses.
 const probeIndexes=[...new Set([0,Math.floor((entries.length-1)/2),entries.length-1].filter(i=>i>=0&&i<entries.length))].sort((a,b)=>a-b);
 const probes=[];
 for(const index of probeIndexes){
  const date=entries[index].date;
  const solar=await tamilSolarDate({...input,date});
  probes.push({index,date,solar,state:describe(solar,date)});
 }
 if(probes.some(probe=>!probe.state)){
  for(const entry of entries)entry.tamilSolar=null;
  return entries;
 }
 const boundaries=[{index:0,state:probes[0].state}];
 for(let p=0;p<probes.length-1;p++){
  const left=probes[p],right=probes[p+1];
  if(left.state.signature===right.state.signature)continue;
  let lo=left.index+1,hi=right.index;
  while(lo<hi){
   const mid=Math.floor((lo+hi)/2),date=entries[mid].date;
   const solar=await tamilSolarDate({...input,date});
   const state=describe(solar,date);
   if(state&&state.signature===left.state.signature)lo=mid+1;else hi=mid;
  }
  const date=entries[lo].date;
  const solar=await tamilSolarDate({...input,date});
  const state=describe(solar,date);
  if(!state){
   for(const entry of entries)entry.tamilSolar=null;
   return entries;
  }
  boundaries.push({index:lo,state});
 }
 let active=0;
 for(let i=0;i<entries.length;i++){
  while(active+1<boundaries.length&&i>=boundaries[active+1].index)active++;
  const state=boundaries[active].state;
  entries[i].tamilSolar={
   index:state.index,monthTa:state.monthTa,monthEn:state.monthEn,
   day:state.offset+dateDistance(entries[i].date,firstDate),
   monthStartDate:state.monthStartDate
  };
 }
 return entries;
}

self.onmessage=async({data})=>{const {id,kind,input}=data;try{const key=JSON.stringify([kind,input]);if(cache.has(key)){self.postMessage({id,result:cache.get(key)});return}let result;
 if(kind==='thali-pushkara-windows'){result=await calculateDocument50PushkaraWindows(input);}
 else if(kind==='solar-sign-rasi-mana'){result=await calculateSolarSignRasiManaForIngress(input);}
 else if(kind==='chandrashtama-windows'){result=await calculateChandrashtamaWindows(input);}
 else if(kind==='month'){const [y,m]=input.date.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();result=[];for(let d=1;d<=days;d++){result.push(await events({...input,date:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}));}result=await attachTamilSolarDates(input,result);}
 else {const chart=await calculateSwiss(input);const p=panchang(input,chart),t=transit(input,chart);const ev=await events(input);const beforeSunrise=minute(input.time)<minute(p.sunrise);let previousNight=null;if(beforeSunrise){const yesterday=new Date(Date.parse(input.date+'T12:00:00Z')-86400000).toISOString().slice(0,10);previousNight=panchang({...input,date:yesterday,time:'12:00'});}const previousDate=new Date(Date.parse(input.date+'T12:00:00Z')-86400000).toISOString().slice(0,10);const previousSunset=solarNoaa(previousDate,input.lat,input.lon,input.utcOffsetMinutes,false);const weekday=new Date(input.date+'T12:00:00Z').getUTCDay();const nakshatraTimeline=nakshatraIntervalsForLocalDay(input);const amirthadiYogaSegments=nakshatraTimeline.available?nakshatraTimeline.intervals.map(interval=>({...interval,...getTamilDayYoga(weekday,interval.nakshatraNumber)})):[];const thyajyam=thyajyamIntervalsForLocalDay(input,nakshatraTimeline);const nextDate=new Date(Date.parse(input.date+'T12:00:00Z')+86400000).toISOString().slice(0,10);
 let nextOffset=Number(input.utcOffsetMinutes??330);
 if(input.timezone){
  try{nextOffset=offsetMinutesAt(input.timezone,nextDate,'12:00');}
  catch(error){nextOffset=Number(input.utcOffsetMinutes??330);}
 }
 const nextSunrise=solarNoaa(nextDate,input.lat,input.lon,nextOffset,true);
 let ahasNazhigai={available:false},ratriNazhigai={available:false},dinantham={available:false};
 if(p.sunrise&&p.sunset&&nextSunrise){
  const sunriseTimestamp=Date.parse(input.date+'T'+p.sunrise+':00Z')-Number(input.utcOffsetMinutes??330)*60000;
  const sunsetTimestamp=Date.parse(input.date+'T'+p.sunset+':00Z')-Number(input.utcOffsetMinutes??330)*60000;
  const nextSunriseTimestamp=Date.parse(nextDate+'T'+nextSunrise+':00Z')-nextOffset*60000;
  const actualDaySeconds=(sunsetTimestamp-sunriseTimestamp)/1000;
  const actualNightSeconds=(nextSunriseTimestamp-sunsetTimestamp)/1000;
  const actualNightMinutes=actualNightSeconds/60;
  const pramana=calculateAhasRatriPramana(p.sunrise,p.sunset,nextSunrise,actualDaySeconds,actualNightSeconds);
  ahasNazhigai=pramana.ahasNazhigai;
  ratriNazhigai=pramana.ratriNazhigai;
  if(Number.isFinite(actualNightMinutes)&&actualNightMinutes>0&&actualNightMinutes<1440){
   dinantham=calculateDinantham(p.sunset,nextSunrise,actualNightMinutes);
   if(dinantham.available){
    const dinanthamTimestamp=sunsetTimestamp+Math.round(actualNightMinutes*5/8)*60000;
    let dinanthamLocal=localPartsFromTs(dinanthamTimestamp,input.utcOffsetMinutes);
    if(input.timezone){
     try{
      const dinanthamOffset=offsetMinutesAt(input.timezone,dinanthamLocal.date,dinanthamLocal.time.slice(0,5));
      dinanthamLocal=localPartsFromTs(dinanthamTimestamp,dinanthamOffset);
     }catch(error){}
    }
    dinantham={...dinantham,time:dinanthamLocal.time.slice(0,5),date:dinanthamLocal.date};
   }
  }
 }
 result={en:{p,t,previousNight},ta:{p:calendarTamil(p),t:calendarTamil(t)},events:ev.events,dayStar:ev.star,sunStar:ev.sunStar,nextSunrise,ratriNazhigai,dinantham,amirthadiYogaAvailable:nakshatraTimeline.available,amirthadiYogaSegments,thyajyamAvailable:thyajyam.available,thyajyamIntervals:thyajyam.intervals,ahasNazhigai,previousSunset};}
 cache.set(key,result);if(cache.size>36)cache.delete(cache.keys().next().value);self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:e.message})}};
