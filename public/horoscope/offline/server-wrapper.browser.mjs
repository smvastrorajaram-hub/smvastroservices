import {calculateSwiss, calculateSwissSync} from './swiss_vedic.browser.mjs';
const NAKSHATRAS = ["அஸ்வினி","பரணி","கார்த்திகை","ரோகிணி","மிருகசீரிடம்","திருவாதிரை","புனர்பூசம்","பூசம்","ஆயில்யம்","மகம்","பூரம்","உத்திரம்","ஹஸ்தம்","சித்திரை","சுவாதி","விசாகம்","அனுஷம்","கேட்டை","மூலம்","பூராடம்","உத்திராடம்","திருவோணம்","அவிட்டம்","சதயம்","பூரட்டாதி","உத்திரட்டாதி","ரேவதி"];
const NAK_LORDS = ["கேது","சுக்கிரன்","சூரியன்","சந்திரன்","செவ்வாய்","ராகு","குரு","சனி","புதன்"];
const DASHA_YEARS = {"கேது":7,"சுக்கிரன்":20,"சூரியன்":6,"சந்திரன்":10,"செவ்வாய்":7,"ராகு":18,"குரு":16,"சனி":19,"புதன்":17};

const DASHA_ORDER = ["கேது","சுக்கிரன்","சூரியன்","சந்திரன்","செவ்வாய்","ராகு","குரு","சனி","புதன்"];
const PLANETS = [
  ["சூரியன்", "Sun"], ["சந்திரன்", "Moon"], ["செவ்வாய்", "Mars"], ["புதன்", "Mercury"],
  ["குரு", "Jupiter"], ["சுக்கிரன்", "Venus"], ["சனி", "Saturn"], ["ராகு", "NorthNode"], ["கேது", "SouthNode"]
];
const BODY_MAP = { Sun: "Sun", Moon: "Moon", Mars: "Mars", Mercury: "Mercury", Jupiter: "Jupiter", Venus: "Venus", Saturn: "Saturn" };
function norm360(x){ x%=360; return x<0?x+360:x; }
function clampNum(v,min,max){ const n=Number(v); return Number.isFinite(n)&&n>=min&&n<=max?n:null; }
function parseBirthDateTime(date,time){
  const ds=String(date||"").trim();
  const ts=String(time||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return null;
  let hh, mm;
  // Accept the native mobile <input type="time"> value (HH:mm), plus
  // human-entered 12-hour values such as "10:05 PM" / "10.05 PM".
  let m=ts.match(/^(\d{1,2})[:.](\d{2})$/);
  if(m){ hh=Number(m[1]); mm=Number(m[2]); }
  else {
    m=ts.match(/^(\d{1,2})[:.](\d{2})\s*(AM|PM)$/i);
    if(!m) return null;
    hh=Number(m[1]); mm=Number(m[2]);
    const ap=m[3].toUpperCase();
    if(hh<1||hh>12) return null;
    if(ap==='AM') hh=hh===12?0:hh;
    else hh=hh===12?12:hh+12;
  }
  if(!Number.isInteger(hh)||!Number.isInteger(mm)||hh<0||hh>23||mm<0||mm>59) return null;
  const [y,mo,d]=ds.split("-").map(Number);
  const check=new Date(Date.UTC(y,mo-1,d));
  if(check.getUTCFullYear()!==y || check.getUTCMonth()!==mo-1 || check.getUTCDate()!==d) return null;
  // Project currently targets India; the frontend timezone is Asia/Kolkata.
  // Build the UTC instant explicitly. Never rely on parsing a locale/time string.
  const utcMillis = Date.UTC(y, mo - 1, d, hh, mm, 0, 0) - (330 * 60 * 1000);
  const dt = new Date(utcMillis);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
}
function lahiriAyanamsa(date){
  const y=date.getUTCFullYear()+((date.getUTCMonth()+0.5)/12);
  const years=y-2000;
  return 23.85675 + years*(50.290966/3600); // Lahiri-style linearized value near modern dates.
}
function siderealLon(tropical,date){ return norm360(tropical-lahiriAyanamsa(date)); }
function zodiac(longitude){ const lon=norm360(longitude), idx=Math.floor(lon/30), deg=lon-idx*30; return {index:idx, sign:VEDIC_RASIS[idx], degree:deg}; }
function degText(d) {
  const x = norm360(Number(d));
  const withinSign = x % 30;

  let deg = Math.floor(withinSign);

  const minuteFloat = (withinSign - deg) * 60;
  let min = Math.floor(minuteFloat);

  let sec = Math.round((minuteFloat - min) * 60);

  // 59'60" வந்தால் அடுத்த minute-க்கு மாற்றவும்
  if (sec >= 60) {
    sec = 0;
    min += 1;
  }

  // 29°60' வந்தால் அடுத்த degree-க்கு மாற்றவும்
  if (min >= 60) {
    min = 0;
    deg += 1;
  }

  return `${String(deg).padStart(2, "0")}°${String(min).padStart(2, "0")}'${String(sec).padStart(2, "0")}"`;
}
function julianDay(date){ return date.getTime()/86400000 + 2440587.5; }
function meanSiderealTime(date,lon){
  // Use Astronomy Engine's sidereal-time implementation (GAST) and add
  // geographic longitude. This avoids mixing a hand-rolled GMST formula
  // with an apparent/sidereal ascendant calculation.
  const gstHours = (typeof Astronomy.SiderealTime === "function")
    ? Astronomy.SiderealTime(date)
    : null;
  if (Number.isFinite(gstHours)) return norm360(gstHours * 15 + lon);
  const jd=julianDay(date), T=(jd-2451545.0)/36525;
  const gmst=280.46061837 + 360.98564736629*(jd-2451545.0) + 0.000387933*T*T - T*T*T/38710000;
  return norm360(gmst+lon);
}
function ascendantLongitude(date,lat,lon){
  // Eastern horizon intersection using the standard atan2 form.
  // Local sidereal time depends on UTC date/time AND geographic longitude;
  // latitude enters the horizon/ecliptic intersection.
  const T=(julianDay(date)-2451545.0)/36525;
  const eps=(23.439291111 - 0.013004167*T - 0.000000164*T*T + 0.000000504*T*T*T);
  const theta=meanSiderealTime(date,lon)*Math.PI/180;
  const phi=lat*Math.PI/180, e=eps*Math.PI/180;
  const tropical=norm360(Math.atan2(Math.cos(theta), -(Math.sin(theta)*Math.cos(e)+Math.tan(phi)*Math.sin(e)))*180/Math.PI);
  return tropical;
}
function navamsaSignIndex(siderealLon){
  const lon=norm360(siderealLon);
  const rasi=Math.floor(lon/30), part=Math.floor((lon%30)/(30/9));
  // Navamsa starts: movable=1st sign, fixed=9th, dual=5th; then proceeds sequentially.
  const mode=rasi%3;
  const start=mode===0 ? rasi : mode===1 ? (rasi+8)%12 : (rasi+4)%12;
  return (start+part)%12;
}
function navamsaData(lon){
  const idx=navamsaSignIndex(lon);
  const part=Math.floor((norm360(lon)%30)/(30/9))+1;
  return {rasi:VEDIC_RASIS[idx],pada:part};
}
function bhavaCuspsEqual(ascLon){
  // Equal-house bhava sphuta: each cusp is exactly 30° from the Ascendant.
  return Array.from({length:12},(_,i)=>norm360(ascLon+i*30));
}
function houseFromCusp(lon,ascLon){
  return Math.floor(norm360(lon-ascLon)/30)+1;
}
function nodeLongitudes(date){
  const T=(julianDay(date)-2451545.0)/36525;
  const omega=125.04452 - 1934.136261*T + 0.0020708*T*T + (T*T*T)/450000 - (T*T*T*T)/56250;
  const rahu=siderealLon(omega,date); return {rahu,ketu:norm360(rahu+180)};
}
function bodyTropicalLongitude(body,date,observer){
  if(body==="Sun") return Astronomy.SunPosition(date).elon;
  if(body==="Moon") return Astronomy.EclipticGeoMoon(date).lon;
  const vec=Astronomy.GeoVector(Astronomy.Body[body],date,true);
  return Astronomy.Ecliptic(vec).elon;
}
function nakshatraInfo(lon){
  const span=360/27, padaSpan=span/4, idx=Math.floor(norm360(lon)/span), within=norm360(lon)-idx*span;
  return {index:idx,name:NAKSHATRAS[idx],pada:Math.floor(within/padaSpan)+1,lord:NAK_LORDS[idx%9]};
}
function addDays(date, days){ return new Date(date.getTime()+days*365.2425*86400000); }
function isoDate(date){ return date.toISOString().slice(0,10); }
function sequenceFromLord(lord){
  const i=DASHA_ORDER.indexOf(lord);
  if(i<0) throw new Error(`Unknown Vimshottari lord: ${lord}`);
  return DASHA_ORDER.slice(i).concat(DASHA_ORDER.slice(0,i));
}
function buildSubPeriods(parentLord, parentStart, parentEnd, level){
  const seq=sequenceFromLord(parentLord), parentDays=(parentEnd.getTime()-parentStart.getTime())/86400000;
  return seq.map(lord=>{
    const years=DASHA_YEARS[lord];
    // Proportional rule: sub-period = full parent duration * lord years / 120.
    const durationDays=parentDays*(years/120);
    return {lord, years:Number((durationDays/365.2425).toFixed(4)), startDate:null, endDate:null, durationDays};
  }).reduce((acc,x)=>{
    const prev=acc.length?acc[acc.length-1].endDate:parentStart;
    const start=prev, end=new Date(start.getTime()+x.durationDays*86400000);
    acc.push({...x,startDate:start,endDate:end}); return acc;
  },[]).map(x=>({...x,start:isoDate(x.startDate),end:isoDate(x.endDate)}));
}
function buildPratyantar(antarLord, startDate, endDate){
  return buildSubPeriods(antarLord,startDate,endDate,3).map(x=>({lord:x.lord,years:x.years,start:x.start,end:x.end}));
}
function buildAntardasha(mdLord, fullStart, fullEnd, birthDate){
  return buildSubPeriods(mdLord,fullStart,fullEnd,2).map(x=>{
    const visibleStart=x.startDate<birthDate?birthDate:x.startDate;
    const visibleEnd=x.endDate;
    return {
      lord:x.lord,
      years:x.years,
      start:isoDate(visibleStart),
      end:isoDate(visibleEnd),
      hiddenBeforeBirth:x.endDate<=birthDate,
      pratyantars: buildPratyantar(x.lord,x.startDate,x.endDate)
        .filter(p=>new Date(p.end+'T23:59:59')>=birthDate)
        .map(p=>({...p,start:p.start<isoDate(birthDate)?isoDate(birthDate):p.start}))
    };
  }).filter(x=>!x.hiddenBeforeBirth);
}
function dashaAtBirth(moonSiderealLon,date,referenceDate,offsetMinutes=330){
  const n=nakshatraInfo(moonSiderealLon), span=360/27, progressed=(norm360(moonSiderealLon)%span)/span;
  const lord=n.lord, total=DASHA_YEARS[lord], balance=total*(1-progressed);
  if (!lord || !Number.isFinite(total) || !Number.isFinite(balance)) throw new Error("Unable to calculate Vimshottari Dasha from Moon longitude.");
  const idx=DASHA_ORDER.indexOf(lord), elapsed=total-balance;
  let fullStart=addDays(date,-elapsed), start=fullStart;
  const periods=[];
  for(let i=0;i<9;i++){
    const name=DASHA_ORDER[(idx+i)%9], years=DASHA_YEARS[name];
    const end=addDays(start,years);
    if(end>date){
      const visibleStart=start<date?date:start;
      periods.push({lord:name,years:Number(years.toFixed(2)),start:isoDate(visibleStart),end:isoDate(end),antardashas:buildAntardasha(name,start,end,date)});
    }
    start=end;
  }
  // A current period is always relative to the report reference date, never the birth date.
  // The last boundary is exclusive. Do not manufacture a lord outside the computed range.
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(String(referenceDate||''))
    ? String(referenceDate) : isoDate(new Date(Date.now()+Number(offsetMinutes||330)*60000));
  const inRange = row => row && row.start <= asOf && asOf < row.end;
  const md = periods.find(inRange);
  const ad = md?.antardashas?.find(inRange);
  const pd = ad?.pratyantars?.find(inRange);
  return {
    balanceYears:Number(balance.toFixed(2)),
    order:DASHA_ORDER,
    periods,
    current:{referenceDate:asOf,
      mahadasha: md ? {lord:md.lord,start:md.start,end:md.end} : null,
      antardasha: ad ? {lord:ad.lord,start:ad.start,end:ad.end} : null,
      pratyantardasha: pd ? {lord:pd.lord,start:pd.start,end:pd.end} : null}
  };
}

function circularLonDiff(a,b){ return ((Number(a)-Number(b)+540)%360)-180; }
function localDateFromJd(jdUt, offsetMinutes){
  const ms=(Number(jdUt)-2440587.5)*86400000 + Number(offsetMinutes||330)*60000;
  const d=new Date(ms); return {date:d.toISOString().slice(0,10),time:d.toISOString().slice(11,19).slice(0,5)};
}

async function findTajakaAnnualChart(input,targetYear){
  const birthDate=String(input?.date||'');
  const bm=birthDate.match(/^(\d{4})-(\d{2})-(\d{2})$/); if(!bm)return null;
  const y=Number(targetYear), month=Number(bm[2]), day=Number(bm[3]);
  const natal=await calculateSwiss(input); const natalSun=natal.planets.find(p=>p.name==='சூரியன்')?.longitude; if(!Number.isFinite(natalSun))return null;
  const offset=Number(input?.utcOffsetMinutes??330), base=new Date(Date.UTC(y,month-1,day,12,0,0));
  const sample=[]; for(let h=-120;h<=120;h+=3){const d=new Date(base.getTime()+h*3600000);const local=new Date(d.getTime()+offset*60000);const ds=local.toISOString().slice(0,10),ts=local.toISOString().slice(11,16);try{const c=calculateSwissSync({...input,date:ds,time:ts});const sl=c.planets.find(p=>p.name==='சூரியன்')?.longitude;sample.push({t:d.getTime(),diff:circularLonDiff(sl,natalSun)});}catch{}}
  let lo=null,hi=null; for(let i=1;i<sample.length;i++){if(sample[i-1].diff<=0&&sample[i].diff>=0){lo=sample[i-1].t;hi=sample[i].t;break;} if(sample[i-1].diff>=0&&sample[i].diff<=0){lo=sample[i].t;hi=sample[i-1].t;break;}}
  if(lo==null){sample.sort((a,b)=>Math.abs(a.diff)-Math.abs(b.diff));const best=sample[0];lo=best.t-6*3600000;hi=best.t+6*3600000;}
  for(let i=0;i<42;i++){const mid=(lo+hi)/2;const d=new Date(mid),local=new Date(d.getTime()+offset*60000),ds=local.toISOString().slice(0,10),ts=local.toISOString().slice(11,16);const c=calculateSwissSync({...input,date:ds,time:ts});const sl=c.planets.find(p=>p.name==='சூரியன்')?.longitude;const diff=circularLonDiff(sl,natalSun);const dl=new Date(lo),ll=new Date(dl.getTime()+offset*60000),lds=ll.toISOString().slice(0,10),lts=ll.toISOString().slice(11,16);const cl=calculateSwissSync({...input,date:lds,time:lts});const ld=circularLonDiff(cl.planets.find(p=>p.name==='சூரியன்')?.longitude,natalSun);if((ld<=0&&diff>=0)||(ld>=0&&diff<=0))hi=mid;else lo=mid;}
  const ret=new Date((lo+hi)/2), local=new Date(ret.getTime()+offset*60000), ds=local.toISOString().slice(0,10), ts=local.toISOString().slice(11,16);
  const annual=calculateSwissSync({...input,date:ds,time:ts});
  annual.tajakaReturn={targetYear:y,returnDate:ds,returnTime:ts,natalSunLongitude:natalSun};
  return annual;
}

export async function calculateVedicChart(input){
  const chart=await calculateSwiss(input);
  chart.birthName=String(input?.name||'').trim(); chart.birthDate=String(input?.date||'').trim(); chart.birthTime=String(input?.time||'').trim(); chart.birthLat=Number(input?.lat||0); chart.birthLon=Number(input?.lon||0);
  if(Array.isArray(chart.planets)) chart.planets=chart.planets.map(p=>({...p,degree:Number.isFinite(Number(p.longitude))?degText(Number(p.longitude)):p.degree}));
  if(chart.lagna&&Number.isFinite(Number(chart.lagna.longitude))) chart.lagna={...chart.lagna,degree:degText(Number(chart.lagna.longitude))};
  const moon=chart.planets.find(p=>p.name==='சந்திரன்');
  chart.dashas=dashaAtBirth(moon.longitude,new Date(chart.birth.utc_jd?(chart.birth.utc_jd-2440587.5)*86400000:Date.parse(chart.birth.date+'T'+chart.birth.time+':00+05:30')),input?.referenceDate||input?.reportDate,input?.utcOffsetMinutes);
  return chart;
}
export {findTajakaAnnualChart};
