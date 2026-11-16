import {getSwe} from './offline/wasm-provider.mjs';
import {calculateSwiss,calculateSunMoon,calculateAscendantAt} from './offline/swiss_vedic.browser.mjs';
import {panchang,transit,calendarTamil,solarNoaa,tamilSolarDate,nextSolarIngress} from './offline/transit_panchang.browser.mjs';
import {meanObliquityAtJulianDay,calculateLagnaBalanceFromRasiMana} from './offline/rasi-mana.browser.mjs';
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
   solar:Math.floor(norm(sun)/30)
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
const ingressLagnaCache=new Map();
async function calculateIngressLagnaBalance(input){
 // Initialize the Swiss adapter before precise solar-ingress and Lagna sampling.
 await calculateSunMoon({...input,time:String(input.time||'12:00')});
 const ingress=nextSolarIngress(input);
 if(!ingress||!Number.isFinite(ingress.timestamp))return null;
 const cacheKey=[Number(input.lat).toFixed(5),Number(input.lon).toFixed(5),Number(input.utcOffsetMinutes),ingress.timestamp].join('|');
 if(ingressLagnaCache.has(cacheKey))return ingressLagnaCache.get(cacheKey);
 const local=localPartsFromTs(ingress.timestamp,input.utcOffsetMinutes);
 const ascendant=await calculateAscendantAt({...input,date:local.date,time:local.time,houseSystem:'S'});
 const obliquityDegrees=meanObliquityAtJulianDay(ascendant.julianDayUt);
 const balance=calculateLagnaBalanceFromRasiMana({
  siderealLongitude:ascendant.longitude,
  latitude:input.lat,
  ayanamsaDegrees:ascendant.ayanamsa,
  obliquityDegrees
 });
 if(!balance.available)return null;
 const totalVighati=Math.max(0,Math.round(balance.balanceSeconds/24));
 const result={
  sunSignIndex:ingress.signIndex,
  ingressDate:ingress.date,
  ingressTime:ingress.time,
  ingressSunLongitude:ingress.sunLongitude,
  lagnaSignIndex:balance.signIndex,
  lagnaLongitude:ascendant.longitude,
  ayanamsaDegrees:ascendant.ayanamsa,
  obliquityDegrees,
  balanceSeconds:balance.balanceSeconds,
  balanceNazhigai:Math.floor(totalVighati/60),
  balanceVinazhigai:totalVighati%60,
  rasiMana:balance.rasiMana.rows,
  rasiManaAvailable:balance.rasiMana.available,
  sunrise:solarNoaa(input.date,input.lat,input.lon,input.utcOffsetMinutes,true),
  method:balance.method
 };
 ingressLagnaCache.set(cacheKey,result);
 if(ingressLagnaCache.size>12)ingressLagnaCache.delete(ingressLagnaCache.keys().next().value);
 return result;
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
 return {date:input.date,events:ev,moon:r.moon,star:r.star};
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
 if(kind==='lagna-balance'){result=await calculateIngressLagnaBalance(input);}
 else if(kind==='month'){const [y,m]=input.date.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();result=[];for(let d=1;d<=days;d++){result.push(await events({...input,date:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}));}result=await attachTamilSolarDates(input,result);}
 else {const chart=await calculateSwiss(input);const p=panchang(input,chart),t=transit(input,chart);const ev=await events(input);const beforeSunrise=minute(input.time)<minute(p.sunrise);let previousNight=null;if(beforeSunrise){const yesterday=new Date(Date.parse(input.date+'T12:00:00Z')-86400000).toISOString().slice(0,10);previousNight=panchang({...input,date:yesterday,time:'12:00'});}const previousDate=new Date(Date.parse(input.date+'T12:00:00Z')-86400000).toISOString().slice(0,10);const previousSunset=solarNoaa(previousDate,input.lat,input.lon,input.utcOffsetMinutes,false);result={en:{p,t,previousNight},ta:{p:calendarTamil(p),t:calendarTamil(t)},events:ev.events,dayStar:ev.star,previousSunset};}
 cache.set(key,result);if(cache.size>36)cache.delete(cache.keys().next().value);self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:e.message})}};
