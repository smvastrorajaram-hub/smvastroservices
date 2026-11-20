import {calculateSwiss, calculateSwissSync,enrichPlanetaryStatesForTruePositions,enrichPhase2ForTruePositions} from './swiss_vedic.browser.mjs';
import {createTrueBphsShadbalaEngine} from './true-bphs-naelos-engine.browser.bundle.mjs';
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
const DAY_MS=86400000;
// SMV's selected Vimshottari civil-date convention: a 365.2422-day solar year.
// Keep this separate from source-specific Savana-year rules in other Dasa systems.
const VIMSHOTTARI_YEAR_DAYS=365.2422;
function addVimshottariYears(date, years){ return new Date(date.getTime()+Number(years||0)*VIMSHOTTARI_YEAR_DAYS*DAY_MS); }
function vimshottariYearsBetween(start,end){ return (end.getTime()-start.getTime())/(VIMSHOTTARI_YEAR_DAYS*DAY_MS); }
function isoDate(date){ return date.toISOString().slice(0,10); }
function sequenceFromLord(lord){
  const i=DASHA_ORDER.indexOf(lord);
  if(i<0) throw new Error(`Unknown Vimshottari lord: ${lord}`);
  return DASHA_ORDER.slice(i).concat(DASHA_ORDER.slice(0,i));
}
function buildSubPeriods(parentLord, parentStart, parentEnd, level){
  const seq=sequenceFromLord(parentLord), parentYears=vimshottariYearsBetween(parentStart,parentEnd);
  return seq.map(lord=>{
    const years=parentYears*(DASHA_YEARS[lord]/120);
    const durationDays=years*VIMSHOTTARI_YEAR_DAYS;
    return {lord,years,fullYears:years,startDate:null,endDate:null,durationDays};
  }).reduce((acc,x)=>{
    const prev=acc.length?acc[acc.length-1].endDate:parentStart;
    const start=prev, end=new Date(start.getTime()+x.durationDays*DAY_MS);
    acc.push({...x,startDate:start,endDate:end}); return acc;
  },[]).map(x=>({...x,start:isoDate(x.startDate),end:isoDate(x.endDate)}));
}
function buildPratyantar(antarLord, startDate, endDate, birthDate){
  return buildSubPeriods(antarLord,startDate,endDate,3)
    .filter(p=>!birthDate||p.endDate>birthDate)
    .map(p=>{
      const visibleStart=birthDate&&p.startDate<birthDate?birthDate:p.startDate;
      return {...p,years:vimshottariYearsBetween(visibleStart,p.endDate),start:isoDate(visibleStart),end:isoDate(p.endDate)};
    })
    .map(p=>({lord:p.lord,years:p.years,fullYears:p.fullYears,start:p.start,end:p.end}));
}
function buildAntardasha(mdLord, fullStart, fullEnd, birthDate){
  return buildSubPeriods(mdLord,fullStart,fullEnd,2)
    .filter(x=>x.endDate>birthDate)
    .map(x=>{
      const visibleStart=x.startDate<birthDate?birthDate:x.startDate;
      const visibleEnd=x.endDate;
      return {
        lord:x.lord,
        years:vimshottariYearsBetween(visibleStart,visibleEnd),
        fullYears:x.fullYears,
        start:isoDate(visibleStart),
        end:isoDate(visibleEnd),
        pratyantars:buildPratyantar(x.lord,x.startDate,x.endDate,birthDate)
      };
    });
}

const TRUE_BPHS_RASIS=Object.freeze(['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']);
const TRUE_BPHS_FRAME='NAELOS_TRUE_ECLIPTIC_OF_DATE_EFFECTIVE_LAHIRI_V1';
let trueBphsEnginePromise=null;
async function getTrueBphsEngine(){
  if(!trueBphsEnginePromise){
    trueBphsEnginePromise=createTrueBphsShadbalaEngine().catch(error=>{
      trueBphsEnginePromise=null;
      throw error;
    });
  }
  return trueBphsEnginePromise;
}
function trueBphsRasi(longitude){return Math.floor(norm360(longitude)/30);}
function trueBphsNavamsa(longitude){
  const value=norm360(longitude),rasi=Math.floor(value/30);
  const part=Math.min(8,Math.floor((value%30)/(30/9)));
  const mode=rasi%3;
  const start=mode===0?rasi:mode===1?(rasi+8)%12:(rasi+4)%12;
  return {rasi:TRUE_BPHS_RASIS[(start+part)%12],pada:part+1};
}
function trueBphsHousePlacement(longitude,arambha){
  const value=norm360(longitude),epsilon=1e-7;
  for(let i=0;i<12;i++){
    const boundary=norm360(arambha[i]);
    const distance=Math.abs(((value-boundary+540)%360)-180);
    if(distance<=epsilon)return {house:null,bhavaSandhi:{
      cuspIndex:i+1,longitude:Number(boundary.toFixed(8)),
      precedingHouse:i===0?12:i,followingHouse:i+1
    }};
  }
  for(let i=0;i<12;i++){
    const start=norm360(arambha[i]),end=norm360(arambha[(i+1)%12]);
    const span=norm360(end-start),position=norm360(value-start);
    if(position<(span===0?360:span))return {house:i+1,bhavaSandhi:null};
  }
  return {house:null,bhavaSandhi:null};
}
function trueBphsStrength6(row,frameId){
  return {
    available:row.available===true,
    method:'TRUE_BPHS_SHADBALA_NAELOS_DE440',
    source:'Brihat Parashara Hora Shastra I, Chapter 27; Chapter 26 Sputa Drishti',
    components:row.components,
    totalVirupa:row.totalVirupa,
    totalRupa:row.totalRupa,
    requiredVirupa:row.requiredVirupa,
    requiredRupa:row.requiredVirupa/60,
    ratio:row.ratio,
    isStrong:row.isStrong,
    provisional:true,
    classicalCertified:false,
    referenceFrameId:frameId,
    ishtaKashta:row.ishtaKashta,
    warEvidence:row.warEvidence,
    note:'PAC 2026 is a seven-graha numerical cross-check; it does not independently certify every historical natal epoch.'
  };
}
function applyTrueBphsResultToChart(chart,result){
  if(result?.available!==true||result?.classicalCertified!==false||
     result?.referenceFrameId!==TRUE_BPHS_FRAME||
     !Array.isArray(result.planetaryPositions)||!result.planets||!result.bhava)
    throw new Error('TRUE BPHS NAELOS returned an incomplete or mismatched Effective Lahiri chart result.');
  const byName=new Map(result.planetaryPositions.map(row=>[row.name,row]));
  for(const name of ['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது']){
    if(!byName.has(name))throw new Error('TRUE BPHS NAELOS planetary longitude is missing: '+name);
  }
  const arambha=result.bhava.arambha;
  const updatedRaw=chart.planets.map(original=>{
    const position=byName.get(original.name);
    if(!position)return original;
    const longitude=norm360(position.longitude);
    const rasiIndex=trueBphsRasi(longitude);
    const nak=nakshatraInfo(longitude);
    const placement=trueBphsHousePlacement(longitude,arambha);
    return {
      ...original,
      longitude:Number(longitude.toFixed(8)),
      degree:degText(longitude),
      rasi:TRUE_BPHS_RASIS[rasiIndex],
      nakshatra:nak.name,pada:nak.pada,lord:nak.lord,
      navamsa:trueBphsNavamsa(longitude),
      bhava:position.bhava??placement.house,
      bhavaSandhi:placement.bhavaSandhi,
      speed:Number(position.speed.toFixed(8)),
      retrograde:position.speed<0,
      eclipticLatitude:Number(position.eclipticLatitude.toFixed(8)),
      referenceFrameId:TRUE_BPHS_FRAME,
      longitudeFrameId:TRUE_BPHS_FRAME,
      speedFrameId:TRUE_BPHS_FRAME,
      positionSource:'NAELOS Ephemeris 0.1.3 / NASA-JPL DE440 apparent geocentric True Longitude'
    };
  });
  const stateful=enrichPlanetaryStatesForTruePositions(updatedRaw);
  const withPhase2=enrichPhase2ForTruePositions(stateful,result.birth.utcJd);
  chart.planets=withPhase2.map(planet=>{
    const bala=result.planets[planet.name];
    if(!bala)return {...planet,strength6:{
      available:false,classicalCertified:false,
      reason:'Rahu/Ketu are excluded from the seven-graha BPHS Shadbala model',
      referenceFrameId:TRUE_BPHS_FRAME
    }};
    return {...planet,strength6:trueBphsStrength6(bala,TRUE_BPHS_FRAME)};
  });
  const ascendant=norm360(result.bhava.ascendant);
  const ascNak=nakshatraInfo(ascendant);
  const ascNavamsa=trueBphsNavamsa(ascendant);
  const ascRasi=trueBphsRasi(ascendant);
  const midheaven=norm360(result.bhava.midheaven);
  chart.lagna={
    ...(chart.lagna||{}),
    longitude:Number(ascendant.toFixed(8)),degree:degText(ascendant),
    rasi:TRUE_BPHS_RASIS[ascRasi],
    nakshatra:ascNak.name,pada:ascNak.pada,
    navamsa:ascNavamsa,mc:Number(midheaven.toFixed(8)),
    referenceFrameId:TRUE_BPHS_FRAME
  };
  chart.bhavas=result.bhava.madhya.map((madhyaValue,index)=>{
    const arambhaLongitude=norm360(arambha[index]);
    const madhya=norm360(madhyaValue);
    const antya=norm360(arambha[(index+1)%12]);
    const nak=nakshatraInfo(madhya),rasiIndex=trueBphsRasi(madhya);
    return {
      house:index+1,
      arambhaLongitude:Number(arambhaLongitude.toFixed(8)),
      arambha:degText(arambhaLongitude),
      longitude:Number(arambhaLongitude.toFixed(8)),
      degree:degText(arambhaLongitude),
      madhyaLongitude:Number(madhya.toFixed(8)),
      madhya:degText(madhya),
      rasi:TRUE_BPHS_RASIS[rasiIndex],rasiIndex,
      nakshatra:nak.name,
      antyaLongitude:Number(antya.toFixed(8)),
      antya:degText(antya),
      referenceFrameId:TRUE_BPHS_FRAME,
      cuspKind:'NAELOS_DE440_EFFECTIVE_LAHIRI_SRIPATI'
    };
  });
  chart.navamsa={
    lagna:ascNavamsa,
    planets:[
      {name:'லக்னம்',longitude:Number(ascendant.toFixed(8)),degree:degText(ascendant),
       rasi:TRUE_BPHS_RASIS[ascRasi],navamsa:ascNavamsa,bhava:1},
      ...chart.planets.map(planet=>({
        name:planet.name,longitude:planet.longitude,degree:planet.degree,
        rasi:planet.rasi,nakshatra:planet.nakshatra,pada:planet.pada,
        navamsa:planet.navamsa,bhava:planet.bhava
      }))
    ]
  };
  const moon=chart.planets.find(planet=>planet.name==='சந்திரன்');
  if(!moon||!Number.isFinite(moon.longitude))throw new Error('TRUE BPHS NAELOS Moon longitude is unavailable for Vimshottari Dasha.');
  chart.moonRasi=moon.rasi;chart.moonNakshatra=moon.nakshatra;chart.moonPada=moon.pada;
  chart.ayanamsa=Number(result.astronomy.lahiriAyanamsaDegrees);
  chart.ayanamsaName='Effective Lahiri';
  chart.engine='NAELOS Ephemeris 0.1.3 / NASA-JPL DE440';
  chart.engineVersion='TRUE_BPHS_SHADBALA_NAELOS_DE440 1.2.0-effective-lahiri';
  chart.ephemerisMode='NAELOS_DE440';
  chart.zodiac='Sidereal';chart.houseSystem='Sripati';
  chart.referenceFrameId=TRUE_BPHS_FRAME;
  chart.classicalCertified=false;
  chart.shadbalaMethod='TRUE_BPHS_SHADBALA_NAELOS_DE440';
  chart.ishtaKashtaMethod='TRUE_BPHS_CH28_RASMI_ISHTA_KASHTA';
  chart.naelosValidation={
    source:'NASA/JPL DE440 via NAELOS Ephemeris 0.1.3',
    referenceFrameId:TRUE_BPHS_FRAME,
    tableIntegrityVerified:result.tableIntegrityVerified===true,
    loadedTableFiles:result.astronomy.loadedTableFiles,
    epochJdUt:result.epochJdUt,epochJdTt:result.birth.ttJd,
    effectiveLahiriOffsetDegrees:result.astronomy.effectiveLahiriOffsetDegrees,
    pac2026Comparison:{
      status:'PASS_PAC_NAELOS_SEVEN_GRAHA_EFFECTIVE_LAHIRI_2555',
      maxAbsoluteResidualArcseconds:0.27813725,
      rmsResidualArcseconds:0.13981181457377317,gateArcseconds:0.36,
      ayanamsaConvention:'Effective Lahiri inferred from PAC numeric comparison; not explicitly named in PAC PDFs'
    },
    classicalCertified:false
  };
  delete chart.swissValidation;
  return chart;
}

function dashaAtBirth(moonSiderealLon,date,referenceDate,offsetMinutes=330){
  const n=nakshatraInfo(moonSiderealLon),span=360/27,progressed=(norm360(moonSiderealLon)%span)/span;
  const lord=n.lord,total=DASHA_YEARS[lord],balance=total*(1-progressed);
  if(!lord||!Number.isFinite(total)||!Number.isFinite(balance))throw new Error("Unable to calculate Vimshottari Dasha from Moon longitude.");
  const idx=DASHA_ORDER.indexOf(lord),elapsed=total-balance;
  let start=addVimshottariYears(date,-elapsed);
  const periods=[];
  for(let i=0;i<9;i++){
   const name=DASHA_ORDER[(idx+i)%9],fullYears=DASHA_YEARS[name],end=addVimshottariYears(start,fullYears);
   if(end>date){
    const visibleStart=start<date?date:start;
    periods.push({lord:name,years:vimshottariYearsBetween(visibleStart,end),fullYears,start:isoDate(visibleStart),end:isoDate(end),antardashas:buildAntardasha(name,start,end,date)});
   }
   start=end;
  }
  const asOf=/^\d{4}-\d{2}-\d{2}$/.test(String(referenceDate||''))?String(referenceDate):isoDate(new Date(Date.now()+Number(offsetMinutes??330)*60000));
  const inRange=row=>row&&row.start<=asOf&&asOf<row.end;
  const md=periods.find(inRange),ad=md?.antardashas?.find(inRange),pd=ad?.pratyantars?.find(inRange);
  return {balanceYears:Number(balance.toFixed(5)),yearLengthDays:VIMSHOTTARI_YEAR_DAYS,yearConvention:'solar year (365.2422 days)',order:DASHA_ORDER,periods,current:{referenceDate:asOf,mahadasha:md?{lord:md.lord,start:md.start,end:md.end}:null,antardasha:ad?{lord:ad.lord,start:ad.start,end:ad.end}:null,pratyantardasha:pd?{lord:pd.lord,start:pd.start,end:pd.end}:null}};
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
  // Keep the established chart shell for non-BPHS auxiliary fields. All
  // customer-facing D1 longitudes, Lagna, Sripati cusps, Shadbala and Ishta/
  // Kashta are replaced from one same-epoch NAELOS Effective Lahiri result.
  const chart=await calculateSwiss(input);
  const engine=await getTrueBphsEngine();
  const naelos=await engine.calculate({
    date:String(input?.date||''),time:String(input?.time||''),
    latitude:Number(input?.lat),longitude:Number(input?.lon),
    timeZone:String(input?.timeZone||input?.timezone||'Asia/Kolkata'),
    utcOffsetMinutes:Number(input?.utcOffsetMinutes??330)
  });
  applyTrueBphsResultToChart(chart,naelos);
  chart.birthName=String(input?.name||'').trim();
  chart.birthDate=String(input?.date||'').trim();
  chart.birthTime=String(input?.time||'').trim();
  chart.birthLat=Number(input?.lat||0);chart.birthLon=Number(input?.lon||0);
  chart.birth={
    ...(chart.birth||{}),
    date:naelos.birth.date,time:naelos.birth.time,
    timezone:naelos.birth.timeZone||input?.timeZone||input?.timezone||'Asia/Kolkata',
    utcOffsetMinutes:naelos.birth.utcOffsetMinutes,
    utc_jd:naelos.birth.utcJd,et_jd:naelos.birth.ttJd,
    latitude:naelos.birth.latitude,longitude:naelos.birth.longitude
  };
  const moon=chart.planets.find(p=>p.name==='சந்திரன்');
  chart.dashas=dashaAtBirth(
    moon.longitude,new Date((naelos.birth.utcJd-2440587.5)*86400000),
    input?.referenceDate||input?.reportDate,input?.utcOffsetMinutes
  );
  return chart;
}
export {findTajakaAnnualChart};
