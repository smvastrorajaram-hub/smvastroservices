import {getSwe} from './offline/wasm-provider.mjs';
import {calculateSwiss} from './offline/swiss_vedic.browser.mjs';
import {panchang,transit,calendarTamil,solarNoaa} from './offline/transit_panchang.browser.mjs';
const norm=n=>(n%360+360)%360;
const cache=new Map();
async function sample(input,time){const c=await calculateSwiss({...input,time});const ps=c.planets;const moon=ps.find(x=>x.name==='சந்திரன்').longitude,sun=ps.find(x=>x.name==='சூரியன்').longitude;return {tithi:Math.floor(norm(moon-sun)/12)+1,star:Math.floor(norm(moon)/(360/27))+1,moon:Math.floor(norm(moon)/30),solar:Math.floor(norm(sun)/30)};}
function minute(t){return +t.slice(0,2)*60+ +t.slice(3,5)}
function clock(n){n=(Math.round(n)%1440+1440)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
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
 const r=await sample(input,rise),mid=await sample(input,'12:00'),s=await sample(input,set),night=await sample(input,'23:50');
 const ev=[];const add=(en,ta,basis)=>ev.push({name:[en,ta],basis});
 if([11,26].includes(r.tithi))add('Ekadashi','ஏகாதசி','sunrise');
 if(r.tithi===6)add('Shashti','சஷ்டி','sunrise');
 if(r.tithi===4||mid.tithi===4)add('Shukla Chathurthi','வளர்பிறை சதுர்த்தி','midday');
 if(mid.tithi===30)add('Amavasya','அமாவாசை','midday');
 if(s.tithi===15)add('Pournami','பௌர்ணமி','sunset');
 // Pradosha is Trayodashi overlapping the post-sunset period, not noon tithi.
 const later=await sample(input,clock(minute(set)+90));
 if([13,28].includes(s.tithi)||[13,28].includes(later.tithi))add('Pradosham','பிரதோஷம்','sunset');
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
self.onmessage=async({data})=>{const {id,kind,input}=data;try{const key=JSON.stringify([kind,input]);if(cache.has(key)){self.postMessage({id,result:cache.get(key)});return}let result;
 if(kind==='month'){const [y,m]=input.date.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate();result=[];for(let d=1;d<=days;d++){result.push(await events({...input,date:`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}));}}
 else {await calculateSwiss(input);const p=panchang(input),t=transit(input);const ev=await events(input);const beforeSunrise=minute(input.time)<minute(p.sunrise);let previousNight=null;if(beforeSunrise){const yesterday=new Date(Date.parse(input.date+'T12:00:00Z')-86400000).toISOString().slice(0,10);previousNight=panchang({...input,date:yesterday,time:'12:00'});}result={en:{p,t,previousNight},ta:{p:calendarTamil(p),t:calendarTamil(t)},events:ev.events};}
 cache.set(key,result);if(cache.size>36)cache.delete(cache.keys().next().value);self.postMessage({id,result});
 }catch(e){self.postMessage({id,error:e.message})}};
