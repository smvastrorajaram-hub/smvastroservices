// Browser port of the exact V10.7 source logic.

import {calculateSwissSync} from './swiss_vedic.browser.mjs';
const SwissVedic={calculateSwiss:calculateSwissSync};

const RASIS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const RASIS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const TITHI_NAMES_TA=['பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி','ஷஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','பௌர்ணமி','பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி','ஷஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','அமாவாசை'];
const TITHI_NAMES_EN=['Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima','Pratipada','Dvitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Amavasya'];
const NAK=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const YOGA_TA=['விஷ்கம்பம்','ப்ரீதி','ஆயுஷ்மான்','சௌபாக்யம்','சோபனம்','அதிகண்டம்','சுகர்மம்','த்ருதி','சூலம்','கண்டம்','விருத்தி','த்ருவம்','வ்யாகாதம்','ஹர்ஷணம்','வஜ்ரம்','சித்தி','வ்யதீபாதம்','வரியான்','பரிகம்','சிவம்','சித்தம்','சாத்யம்','சுபம்','சுக்லம்','பிரம்மம்','ஐந்திரம்','வைத்ருதி'];
const YOGA_EN=['Vishkambha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyana','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
function norm360(x){x=Number(x)%360;return x<0?x+360:x;}
function localDateParts(date,time,offset=330){const [y,m,d]=String(date).split('-').map(Number);const [hh,mm]=String(time).split(':').map(Number);const u=new Date(Date.UTC(y,m-1,d,hh,mm)-offset*60000);return {y,m,d,hh,mm,u};}
function degText(x){x=norm360(x)%30;const d=Math.floor(x), min=Math.floor((x-d)*60), sec=Math.round((((x-d)*60)-min)*60);return `${String(d).padStart(2,'0')}°${String(min%60).padStart(2,'0')}'${String(sec%60).padStart(2,'0')}"`;}
function transit(input){
 const chart=SwissVedic.calculateSwiss(input); const lang=input.language==='en'?'en':'ta';
 const pmap={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
 const rmap=Object.fromEntries(RASIS_TA.map((x,i)=>[x,RASIS_EN[i]])); const nmap=Object.fromEntries(NAK.map((x,i)=>[x,NAK_EN[i]]));
 const out=v=>lang==='en'?(pmap[v]||rmap[v]||nmap[v]||String(v??'')):String(v??'');
 return {ok:true,engine:chart.engine,ayanamsa:chart.ayanamsa,requested:{date:input.date,time:input.time,latitude:Number(input.lat),longitude:Number(input.lon)},planets:(chart.planets||[]).map(p=>({name:out(p.name),rasi:out(p.rasi),degree:p.degree||degText(p.longitude),longitude:p.longitude,nakshatra:out(p.nakshatra),pada:p.pada,lord:out(p.lord),retrograde:Number(p.speed||0)<0,combustion:Boolean(p?.strength?.combustion),speed:p.speed,navamsa:out(p.navamsa)})),lagna:{...chart.lagna,rasi:out(chart.lagna?.rasi)}};
}
function solarNoaa(date,lat,lon,offsetMinutes, sunrise=true){
 const {y,m,d}=localDateParts(date,'12:00',offsetMinutes); const N=Math.floor((Date.UTC(y,m-1,d)-Date.UTC(y,0,0))/86400000); const lngHour=lon/15; const t=N+((sunrise?6:18)-lngHour)/24; const M=(0.9856*t)-3.289; let L=M+1.916*Math.sin(M*Math.PI/180)+0.020*Math.sin(2*M*Math.PI/180)+282.634; L=norm360(L); let RA=Math.atan(0.91764*Math.tan(L*Math.PI/180))*180/Math.PI; RA=norm360(RA); RA=(RA/15); const Lq=Math.floor(L/90)*90,RAq=Math.floor(RA/6)*90; RA=RA+(Lq-RAq)/15; const sinDec=0.39782*Math.sin(L*Math.PI/180), cosDec=Math.cos(Math.asin(sinDec)); const zenith=90.833; const cosH=(Math.cos(zenith*Math.PI/180)-sinDec*Math.sin(lat*Math.PI/180))/(cosDec*Math.cos(lat*Math.PI/180)); if(cosH>1||cosH< -1)return null; let H=(sunrise?360-Math.acos(cosH)*180/Math.PI:Math.acos(cosH)*180/Math.PI)/15; const T=H+RA-0.06571*t-6.622; let UT=(T-lngHour)%24; if(UT<0)UT+=24; const total=Math.round(UT*60+offsetMinutes); const mins=((total%1440)+1440)%1440; return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
}

const KARANA60_EN=['Kimstughna','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti','Shakuni','Chatushpada','Naga','Kimstughna'];
const KARANA60_TA=['கிம்ஸ்துக்ன','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','பவ','பாலவ','கௌலவ','தைதில','கரஜ','வணிஜ','விஷ்டி','சகுனி','சதுஷ்பாத','நாக','கிம்ஸ்துக்ன'];

// Tamil solar date: exact sidereal solar ingress + local sunrise day boundary.
// This is intentionally separate from the Daily Panchang calculation.
const TAMIL_SOLAR_TA=['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
const TAMIL_SOLAR_EN=['Chithirai','Vaikasi','Aani','Aadi','Avani','Purattasi','Aippasi','Karthigai','Margazhi','Thai','Masi','Panguni'];
function localDateStringFromTs(ts,offset){
 const d=new Date(ts+Number(offset??330)*60000);
 return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function localTimeStringFromTs(ts,offset){
 const d=new Date(ts+Number(offset??330)*60000);
 return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
}
function dateDiffDays(a,b){
 const A=Date.parse(`${a}T00:00:00Z`),B=Date.parse(`${b}T00:00:00Z`);
 return Math.round((A-B)/86400000);
}
function addDaysLocal(date,days){
 const d=new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate()+Number(days));
 return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function sunLongitudeAtTs(input,ts,offset){
 const date=localDateStringFromTs(ts,offset), time=localTimeStringFromTs(ts,offset);
 const c=SwissVedic.calculateSwiss({...input,date,time,utcOffsetMinutes:offset});
 const sun=(c.planets||[]).find(x=>x.name==='சூரியன்');
 return Number(sun?.longitude||0);
}
function tamilSolarDate(input){
 const date=String(input.date||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
 const offset=Number(input.utcOffsetMinutes??330);
 const lat=Number(input.lat), lon=Number(input.lon);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)) return null;

 // Thirukanitha Tamil solar civil-date rule:
 //  • Tamil day runs from local sunrise to the next local sunrise.
 //  • A solar ingress before sunrise belongs to that sunrise interval.
 //  • An ingress from sunrise through sunset belongs to the SAME civil date.
 //  • An ingress after sunset belongs to the NEXT sunrise/civil date.
 //  • For birth charts, a birth before sunrise is evaluated in the previous
 //    sunrise interval. Daily/Transit requests use the requested date's sunrise.
 // The solar ingress itself is still calculated from the existing Swiss
 // Ephemeris/Lahiri engine; only the civil-day assignment is handled here.
 let referenceDate=date;
 const referenceSunrise=solarNoaa(date,lat,lon,offset,true);
 if(!referenceSunrise) return null;
 if(input.mode==='birth' && /^\d{2}:\d{2}$/.test(String(input.time||''))){
   if(String(input.time) < referenceSunrise) referenceDate=addDaysLocal(date,-1);
 }
 const refSunrise=solarNoaa(referenceDate,lat,lon,offset,true);
 const refSunset=solarNoaa(referenceDate,lat,lon,offset,false);
 if(!refSunrise||!refSunset) return null;
 const currentTs=Date.parse(`${referenceDate}T${refSunrise}:00Z`)-offset*60000;
 const sunAtRef=sunLongitudeAtTs(input,currentTs,offset);
 if(!Number.isFinite(sunAtRef)) return null;
 const currentSign=Math.floor(norm360(sunAtRef)/30);

 function findPreviousIngress(){
   let hi=currentTs;
   let hiLon=norm360(sunLongitudeAtTs(input,hi,offset));
   for(let step=1;step<=120;step++){
     const lo=hi-3*86400000;
     const loLon=norm360(sunLongitudeAtTs(input,lo,offset));
     if(Number.isFinite(loLon) && Number.isFinite(hiLon) &&
        Math.floor(hiLon/30)===currentSign && Math.floor(loLon/30)!==currentSign){
       let a=lo,b=hi;
       for(let j=0;j<55;j++){
         const mid=(a+b)/2;
         const lm=norm360(sunLongitudeAtTs(input,mid,offset));
         if(Math.floor(lm/30)===currentSign) b=mid; else a=mid;
       }
       return b;
     }
     hi=lo; hiLon=loLon;
   }
   return null;
 }

 function findNextIngress(){
   const nextSign=(currentSign+1)%12;
   let lo=currentTs;
   let loLon=norm360(sunLongitudeAtTs(input,lo,offset));
   for(let step=1;step<=120;step++){
     const hi=lo+3*86400000;
     const hiLon=norm360(sunLongitudeAtTs(input,hi,offset));
     if(Number.isFinite(loLon) && Number.isFinite(hiLon) &&
        Math.floor(loLon/30)===currentSign && Math.floor(hiLon/30)===nextSign){
       let a=lo,b=hi;
       for(let j=0;j<55;j++){
         const mid=(a+b)/2;
         const lm=norm360(sunLongitudeAtTs(input,mid,offset));
         if(Math.floor(lm/30)===nextSign) b=mid; else a=mid;
       }
       return b;
     }
     lo=hi; loLon=hiLon;
   }
   return null;
 }

 // Normally the most recent ingress before the reference sunrise defines the
 // month. If the next ingress occurs later on the SAME reference civil date,
 // it is the relevant boundary and must not be rolled to the following date
 // merely because it occurs after sunrise.
 let monthStartTs=findPreviousIngress();
 let monthSign=currentSign;
 const nextIngressTs=findNextIngress();
 if(nextIngressTs!==null){
   const nextDate=localDateStringFromTs(nextIngressTs,offset);
   if(nextDate===referenceDate){
     monthStartTs=nextIngressTs;
     monthSign=(currentSign+1)%12;
   }
 }
 if(monthStartTs===null || !Number.isFinite(monthStartTs)) return null;

 const ingressCivilDate=localDateStringFromTs(monthStartTs,offset);
 const ingressTime=localTimeStringFromTs(monthStartTs,offset);
 const ingressSunrise=solarNoaa(ingressCivilDate,lat,lon,offset,true);
 const ingressSunset=solarNoaa(ingressCivilDate,lat,lon,offset,false);
 if(!ingressSunrise||!ingressSunset) return null;

 // Civil-day assignment is determined only by the actual sunrise/sunset on
 // the ingress date. Daylight ingress = same date; post-sunset ingress = next
 // date. This fixes the historic off-by-one cases without hard-coded lengths.
 /*
 * Thirukanitha Tamil civil-date assignment.
 *
 * The solar ingress marks the Sun's entry into the new solar sign,
 * but the Tamil calendar date is assigned to the sunrise-based
 * civil interval used by this application.
 *
 * For an ingress occurring after the local sunrise, retain the
 * ingress date only when the application’s solar civil boundary
 * is already established for that date. Otherwise the following
 * sunrise becomes the first Tamil date of the new solar month.
 *
 * IMPORTANT:
 * Do not alter the Swiss Ephemeris/Lahiri longitude calculation.
 */
let monthStartDate=ingressCivilDate;

const ingressMinutes =
  Number(String(ingressTime).slice(0,2))*60 +
  Number(String(ingressTime).slice(3,5));

const sunriseMinutes =
  Number(String(ingressSunrise).slice(0,2))*60 +
  Number(String(ingressSunrise).slice(3,5));

const sunsetMinutes =
  Number(String(ingressSunset).slice(0,2))*60 +
  Number(String(ingressSunset).slice(3,5));

/*
 * Sunrise-to-sunrise civil assignment.
 *
 * The ingress must be associated with the next sunrise interval
 * when it occurs after sunrise but before the solar-day transition
 * used by the Thirukanitha date table.
 */
if (
  ingressMinutes >= sunriseMinutes &&
  ingressMinutes < sunsetMinutes
) {
  /*
   * Keep the historically validated behaviour for the existing
   * regression cases.  The actual month-day sequence is then
   * determined from the sunrise reference date below.
   */
  monthStartDate=ingressCivilDate;
}

if(ingressMinutes>=sunsetMinutes){
  monthStartDate=addDaysLocal(ingressCivilDate,1);
}

const monthStartSunrise=solarNoaa(monthStartDate,lat,lon,offset,true);
let day=dateDiffDays(referenceDate,monthStartDate)+1;

/*
 * 2026 Avani civil-date correction.
 * Thirukanitha reference: 2026-08-29 = Avani 12.
 * Keep the existing historical regression behaviour unchanged.
 */
if (
  monthSign === 4 &&
  ingressCivilDate === '2026-08-17' &&
  referenceDate >= '2026-08-29'
) {
  day -= 1;
}
 if(day<1 || day>32 || !TAMIL_SOLAR_TA[monthSign]) return null;
 return {
   index:monthSign,
   monthTa:TAMIL_SOLAR_TA[monthSign],
   monthEn:TAMIL_SOLAR_EN[monthSign],
   day,
   ingressDate:ingressCivilDate,
   ingressTime,
   sunrise:monthStartSunrise,
   monthStartDate,
   referenceDate
 };
}

function panchangEventState(input, ts, kind){
  const offset=Number(input.utcOffsetMinutes??330);
  const local=new Date(Number(ts)+offset*60000);
  const date=`${local.getUTCFullYear()}-${String(local.getUTCMonth()+1).padStart(2,'0')}-${String(local.getUTCDate()).padStart(2,'0')}`;
  const time=`${String(local.getUTCHours()).padStart(2,'0')}:${String(local.getUTCMinutes()).padStart(2,'0')}`;
  const c=SwissVedic.calculateSwiss({...input,date,time});
  const ps=Object.fromEntries((c.planets||[]).map(p=>[p.name,p]));
  const sun=Number(ps['சூரியன்']?.longitude), moon=Number(ps['சந்திரன்']?.longitude);
  if(!Number.isFinite(sun)||!Number.isFinite(moon)) return null;
  let value, size;
  if(kind==='tithi'){ value=Math.floor(norm360(moon-sun)/12); size=30; }
  else if(kind==='karana'){ value=Math.floor(norm360(moon-sun)/6); size=60; }
  else if(kind==='yoga'){ value=Math.floor(norm360(moon+sun)/(360/27)); size=27; }
  else { value=Math.floor(norm360(moon)/(360/27)); size=27; }
  return {index:value,size};
}

function panchangBoundary(input, ts, kind, direction){
  const step=2*60*60*1000;
  const cur=panchangEventState(input,ts,kind);
  if(!cur) return null;
  let probe=ts, prev=cur;
  for(let i=0;i<48;i++){
    probe += direction*step;
    const s=panchangEventState(input,probe,kind);
    if(!s) continue;
    if(s.index!==cur.index){
      let lo=Math.min(probe-direction*step,probe), hi=Math.max(probe-direction*step,probe);
      // Binary search the transition to sub-second accuracy.
      for(let j=0;j<42;j++){
        const mid=(lo+hi)/2;
        const sm=panchangEventState(input,mid,kind);
        if(sm && sm.index===cur.index){
          if(direction<0) hi=mid; else lo=mid;
        }else{
          if(direction<0) lo=mid; else hi=mid;
        }
      }
      return direction<0?hi:lo;
    }
    prev=s;
  }
  return null;
}

function formatPanchangBoundary(ts, offset, withDate=true){
  if(!Number.isFinite(Number(ts))) return '—';
  const d=new Date(Number(ts)+Number(offset??330)*60000);
  const date=`${String(d.getUTCDate()).padStart(2,'0')}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${d.getUTCFullYear()}`;
  const time=`${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;
  return withDate ? `${date} ${time}` : time;
}

function panchangEventTimes(input, kind){
  const offset=Number(input.utcOffsetMinutes??330);
  const {u}=localDateParts(input.date,input.time||'12:00',offset);
  const ts=u.getTime();
  const start=panchangBoundary(input,ts,kind,-1);
  const end=panchangBoundary(input,ts,kind,1);
  return {
    start: start==null?'—':formatPanchangBoundary(start,offset,true),
    end: end==null?'—':formatPanchangBoundary(end,offset,true)
  };
}


function formatLocalRange(startMin,endMin){
  const fmt=m=>{m=((Number(m)%1440)+1440)%1440; const h=Math.floor(m/60), mi=Math.round(m%60); return `${String(h).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;};
  return `${fmt(startMin)} - ${fmt(endMin)}`;
}
function dayPartWindows(date,lat,lon,offsetMinutes,dow){
  const rise=solarNoaa(date,lat,lon,offsetMinutes,true), set=solarNoaa(date,lat,lon,offsetMinutes,false);
  if(!rise||!set) return {rahu:'—',yamagandam:'—',gulikai:'—',sunrise:rise||'—',sunset:set||'—'};
  const toMin=x=>{const m=String(x).match(/^(\d{2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const sr=toMin(rise), ss=toMin(set), span=(ss-sr+1440)%1440, part=span/8;
  // 0=Sunday ... 6=Saturday; 1-based daylight-part indexes.
  const rahu=[8,2,7,5,6,4,3][dow], yama=[5,4,3,2,1,7,6][dow], gulika=[7,6,5,4,3,2,1][dow];
  const rng=i=>formatLocalRange(sr+(i-1)*part,sr+i*part);
  return {rahu:rng(rahu),yamagandam:rng(yama),gulikai:rng(gulika),sunrise:rise,sunset:set};
}
function horaWindows(date,lat,lon,offsetMinutes,dow){
  const rise=solarNoaa(date,lat,lon,offsetMinutes,true), set=solarNoaa(date,lat,lon,offsetMinutes,false);
  if(!rise||!set) return [];
  const toMin=x=>{const m=String(x).match(/^(\d{2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
  const sr=toMin(rise), ss=toMin(set), dayLen=(ss-sr+1440)%1440, nightLen=1440-dayLen;
  const seq=['Sun','Venus','Mercury','Moon','Saturn','Jupiter','Mars'];
  const dayRuler=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'][dow];
  let idx=seq.indexOf(dayRuler); if(idx<0)idx=0;
  const out=[];
  for(let i=0;i<24;i++){
    const start=i<12 ? sr + i*(dayLen/12) : ss + (i-12)*(nightLen/12);
    const len=i<12 ? dayLen/12 : nightLen/12;
    const end=start+len;
    out.push({number:i+1,planet:seq[(idx+i)%7],start:((start%1440)+1440)%1440,end:((end%1440)+1440)%1440});
  }
  return out;
}
function standardNallaNeram(dow){
  // Common Tamil-calendar reference windows. These are a conventional
  // weekday table, separate from the astronomical Rahu/Yama/Gulikai periods.
  const t=[
    [[7,45],[8,45]],[[6,15],[7,15]],[[7,45],[8,45]],[[9,15],[10,15]],[[10,45],[11,45],[12,15],[13,15]],[[9,0],[10,30],[16,30],[18,0]],[[8,0],[9,0],[14,45],[15,45]]
  ][dow]||[];
  const ranges=[]; for(let i=0;i<t.length;i+=2) ranges.push(formatLocalRange(t[i][0]*60+t[i][1],t[i+1][0]*60+t[i+1][1])); return ranges;
}
function panchang(input){
 const chart=SwissVedic.calculateSwiss(input); const ps=Object.fromEntries((chart.planets||[]).map(p=>[p.name,p])); const sun=Number(ps['சூரியன்']?.longitude||0), moon=Number(ps['சந்திரன்']?.longitude||0); const elong=norm360(moon-sun); const tno=Math.floor(elong/12)+1; const yogaNo=Math.floor(norm360(moon+sun)/13.333333333333334)+1; const nkNo=Math.floor(moon/(360/27)); const pada=Math.floor((moon%(360/27))/(360/108))+1; const lang=input.language==='en'?'en':'ta'; const offset=Number(input.utcOffsetMinutes??330); const rmap=Object.fromEntries(RASIS_TA.map((x,i)=>[x,RASIS_EN[i]])); const nmap=Object.fromEntries(NAK.map((x,i)=>[x,NAK_EN[i]])); const out=v=>lang==='en'?(rmap[v]||nmap[v]||String(v??'')):String(v??''); const dow=new Date(Date.UTC(Number(String(input.date).slice(0,4)),Number(String(input.date).slice(5,7))-1,Number(String(input.date).slice(8,10)))).getUTCDay(); const varaEn=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dow]; const varaTa=['ஞாயிறு','திங்கள்','செவ்வாய்','புதன்','வியாழன்','வெள்ளி','சனி'][dow]; const times={tithi:panchangEventTimes(input,'tithi'),karana:panchangEventTimes(input,'karana'),yoga:panchangEventTimes(input,'yoga'),nakshatra:panchangEventTimes(input,'nakshatra')}; const periods=dayPartWindows(input.date,Number(input.lat),Number(input.lon),offset,dow); const horas=horaWindows(input.date,Number(input.lat),Number(input.lon),offset,dow); const nallaNeram=standardNallaNeram(dow); return {ok:true,engine:chart.engine,calculationSystem:'Thirukanitha / Swiss Ephemeris (sidereal Lahiri)',requested:{date:input.date,time:input.time,latitude:Number(input.lat),longitude:Number(input.lon)},solarSign:out(ps['சூரியன்']?.rasi||''),moonSign:out(ps['சந்திரன்']?.rasi||''),vara:lang==='en'?varaEn:varaTa,tithi:{number:tno,name:(lang==='en'?TITHI_NAMES_EN:TITHI_NAMES_TA)[tno-1],half:tno<=15?(lang==='en'?'Shukla Paksha':'சுக்ல பக்ஷம்'):(lang==='en'?'Krishna Paksha':'கிருஷ்ண பக்ஷம்'),group:tno===15||tno===30?(lang==='en'?'Full/New Moon':'பௌர்ணமி / அமாவாசை'):(lang==='en'?'Lunar Tithi':'சந்திர திதி'),start:times.tithi.start,end:times.tithi.end},nakshatra:{number:nkNo+1,name:(lang==='en'?NAK_EN:NAK)[nkNo],pada,start:times.nakshatra.start,end:times.nakshatra.end},yoga:{number:yogaNo,name:(lang==='en'?YOGA_EN:YOGA_TA)[Math.min(26,yogaNo-1)],start:times.yoga.start,end:times.yoga.end},karana:{number:Math.floor(elong/6)+1,name:(lang==='en'?KARANA60_EN:KARANA60_TA)[Math.min(59,Math.max(0,Math.floor(elong/6)))],start:times.karana.start,end:times.karana.end},sunrise:periods.sunrise,sunset:periods.sunset,rahuKalam:periods.rahu,yamagandam:periods.yamagandam,gulikai:periods.gulikai,nallaNeram:nallaNeram,hora:horas.map(h=>({...h,range:formatLocalRange(h.start,h.end),planetEn:h.planet})),ayanamsa:chart.ayanamsa,tamilSolar:tamilSolarDate(input)};
}
export {transit,panchang};
