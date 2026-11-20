import {solarNoaa,calculateAhasRatriPramana,nakshatraIntervalsForLocalDay,thyajyamIntervalsForLocalDay} from './offline/transit_panchang.browser.mjs';
import {getTamilDayYoga} from './tamil-day-classifications.mjs';
import {offsetMinutesAt} from './offline/places/timezone.mjs';
const pad=value=>String(value).padStart(2,'0');
const addDays=(date,amount)=>{const d=new Date(String(date)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+Number(amount));return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate());};
const minutes=value=>{const m=/^(\d{1,2}):([0-5]\d)$/.exec(String(value||''));return m?Number(m[1])*60+Number(m[2]):null;};
const localTimestamp=(date,time,offset)=>Date.parse(String(date)+'T'+String(time).slice(0,5)+':00Z')-Number(offset)*60000;
const dateDiff=(a,b)=>Math.round((Date.parse(String(a)+'T00:00:00Z')-Date.parse(String(b)+'T00:00:00Z'))/86400000);
const clock12=value=>{const n=minutes(value);if(n==null)return String(value||'—');const h=Math.floor(n/60),m=n%60;return pad((h%12)||12)+':'+pad(m)+(h<12?' AM':' PM');};
const ghatiFromSeconds=seconds=>{if(!Number.isFinite(seconds)||seconds<0)return null;const v=Math.round(seconds/24);return {nazhigai:Math.floor(v/60),vinazhigai:v%60,totalVighati:v};};
const parseBoundary=value=>{const m=/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2})$/.exec(String(value||'').trim());return m?{date:m[3]+'-'+m[2]+'-'+m[1],time:m[4]+':'+m[5]}:null;};
const showGhati=value=>value?{nazhigai:value.nazhigai,vinazhigai:value.vinazhigai,totalTharparai:value.totalTharparai}:null;
const WEEKDAY_TA=['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'];
const WEEKDAY_EN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export async function buildSubhaJananaData(input,birthPanchang){
 const date=String(input?.date||birthPanchang?.requested?.date||''),time=String(input?.time||birthPanchang?.requested?.time||'');
 const lat=Number(input?.lat??birthPanchang?.requested?.latitude),lon=Number(input?.lon??birthPanchang?.requested?.longitude),birthOffset=Number(input?.utcOffsetMinutes??330);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(birthOffset))return {available:false,reason:'invalid-birth-input'};
 const zone=String(input?.timezone||input?.birthTimezone||'').trim();
 const offsetAt=(day,clock='12:00')=>{if(!zone)return birthOffset;try{return offsetMinutesAt(zone,day,clock);}catch{return birthOffset;}};
 const civilOffset=offsetAt(date,time),civilSunrise=solarNoaa(date,lat,lon,offsetAt(date),true);
 if(!civilSunrise)return {available:false,reason:'sunrise-unavailable'};
 // A birth before sunrise belongs to the previous sunrise-based Panchang day.
 const referenceDate=time<civilSunrise?addDays(date,-1):date;
 const referenceOffset=offsetAt(referenceDate),nextDate=addDays(referenceDate,1),nextOffset=offsetAt(nextDate);
 const sunrise=solarNoaa(referenceDate,lat,lon,referenceOffset,true),sunset=solarNoaa(referenceDate,lat,lon,referenceOffset,false),nextSunrise=solarNoaa(nextDate,lat,lon,nextOffset,true);
 if(!sunrise||!sunset||!nextSunrise)return {available:false,reason:'solar-boundary-unavailable'};
 const sunriseTs=localTimestamp(referenceDate,sunrise,referenceOffset),sunsetTs=localTimestamp(referenceDate,sunset,referenceOffset),nextSunriseTs=localTimestamp(nextDate,nextSunrise,nextOffset),birthTs=localTimestamp(date,time,civilOffset);
 const daySeconds=(sunsetTs-sunriseTs)/1000,nightSeconds=(nextSunriseTs-sunsetTs)/1000;
 const measures=calculateAhasRatriPramana(sunrise,sunset,nextSunrise,daySeconds,nightSeconds);
 if(!measures.available)return {available:false,reason:'ahas-ratri-unavailable'};
 const timelineInput={...input,date:referenceDate,time:sunrise,lat,lon,utcOffsetMinutes:referenceOffset};
 const timeline=nakshatraIntervalsForLocalDay(timelineInput);
 const sunriseNakshatraNumber=timeline.available?Number(timeline.intervals?.[0]?.nakshatraNumber):NaN;
 const weekday=new Date(referenceDate+'T12:00:00Z').getUTCDay();
 const dayAmirthadiYoga=getTamilDayYoga(weekday,sunriseNakshatraNumber);
 const birthAmirthadiYoga=getTamilDayYoga(weekday,Number(birthPanchang?.nakshatra?.number));
 const thyajyam=thyajyamIntervalsForLocalDay(timelineInput,timeline);
 const formatBoundary=async raw=>{
  const point=typeof raw==='string'?parseBoundary(raw):raw;if(!point?.date||!point?.time)return null;
  const pointOffset=offsetAt(point.date,point.time),pointTs=localTimestamp(point.date,point.time,pointOffset);
  const pointRise=solarNoaa(point.date,lat,lon,offsetAt(point.date),true);if(!pointRise)return null;
  const ghatiDate=point.time<pointRise?addDays(point.date,-1):point.date,ghatiOffset=offsetAt(ghatiDate),ghatiRise=solarNoaa(ghatiDate,lat,lon,ghatiOffset,true);
  if(!ghatiRise)return null;
  const elapsed=ghatiFromSeconds(pointTs-localTimestamp(ghatiDate,ghatiRise,ghatiOffset));if(!elapsed)return null;
  const relation=dateDiff(point.date,date);
  const relative=relation===-1?'முந்தைய நாள்':relation===0?'அன்றைய நாள்':relation===1?'மறுநாள்':point.date.split('-').reverse().join('/');
  const relativeEn=relation===-1?'previous day':relation===0?'that day':relation===1?'next day':point.date;
  const min=minutes(point.time),riseMin=minutes(pointRise)??360,setMin=minutes(solarNoaa(point.date,lat,lon,offsetAt(point.date),false))??1080;
  const period=min<riseMin?'இரவு':min<720?'காலை':min<setMin?(min<960?'பிற்பகல்':'மாலை'):'இரவு';
  const periodEn=min<riseMin||min>=setMin?'night':min<720?'morning':min<960?'afternoon':'evening';
  return {date:point.date,time:point.time,relative,relativeEn,period,periodEn,nazhigai:elapsed.nazhigai,vinazhigai:elapsed.vinazhigai,clock12:clock12(point.time)};
 };
 const ranges={};
 for(const key of ['tithi','nakshatra','yoga','karana']){const item=birthPanchang?.[key]||{};ranges[key]={start:await formatBoundary(item.start),end:await formatBoundary(item.end)};}
 const thyajyamIntervals=[];
 if(thyajyam.available){for(const item of thyajyam.intervals||[]){const start=await formatBoundary(item.start),end=await formatBoundary(item.end);if(!start||!end)continue;thyajyamIntervals.push({start,end,startTimestamp:localTimestamp(start.date,start.time,offsetAt(start.date,start.time)),endTimestamp:localTimestamp(end.date,end.time,offsetAt(end.date,end.time))});}}
 const birthInsideThyajyam=thyajyamIntervals.some(item=>birthTs>=item.startTimestamp&&birthTs<item.endTimestamp);
 const elapsedSinceSunrise=ghatiFromSeconds(birthTs-sunriseTs),ahas=showGhati(measures.ahasNazhigai),ratri=showGhati(measures.ratriNazhigai);
 const available=Boolean(elapsedSinceSunrise&&ahas&&ratri&&timeline.available);
 return {available,reason:available?'':'birth-day-auxiliary-data-unavailable',date,time,referenceDate,sunrise,sunset,nextSunrise,ahas,ratri,elapsedSinceSunrise,sunriseNakshatraNumber,dayAmirthadiYoga,birthAmirthadiYoga,varaTa:WEEKDAY_TA[weekday],varaEn:WEEKDAY_EN[weekday],ranges,thyajyamAvailable:thyajyam.available,thyajyamIntervals,birthInsideThyajyam,auspicious:Boolean(dayAmirthadiYoga&&birthAmirthadiYoga&&!dayAmirthadiYoga.bad&&!birthAmirthadiYoga.bad&&!birthInsideThyajyam),tamilSolar:birthPanchang?.tamilSolar||null};
}
