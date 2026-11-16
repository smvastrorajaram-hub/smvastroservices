// Place-based Rasi Mana using Oblique Ascension (OA).
// All longitudes entering this module are ecliptic longitudes in the tropical
// frame. Nirayana sign boundaries are converted with the selected Lahiri ayanamsa.
const DEG=Math.PI/180;
const RAD=180/Math.PI;
const TOTAL_VIGHATI=3600;
const SECONDS_PER_OA_DEGREE=240;
const VIGHATI_PER_OA_DEGREE=10;

export function normalizeDegrees(value){
  const n=Number(value)%360;
  return n<0?n+360:n;
}

const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// IAU/Meeus mean obliquity polynomial, adequate for rising-time intervals.
// JD must be UT and is supplied by the same Swiss Ephemeris instant as Lagna.
export function meanObliquityAtJulianDay(julianDayUt){
  const jd=Number(julianDayUt);
  if(!Number.isFinite(jd))throw new TypeError('A finite UT Julian Day is required.');
  const t=(jd-2451545)/36525;
  const arcSeconds=84381.448-46.8150*t-0.00059*t*t+0.001813*t*t*t;
  return arcSeconds/3600;
}

// Oblique Ascension = Right Ascension - Ascensional Difference.
// A null result means this ecliptic point is circumpolar and does not rise
// at the supplied latitude.
export function obliqueAscension(tropicalLongitude,latitude,obliquityDegrees){
  const lambda=Number(tropicalLongitude),phi=Number(latitude),epsilon=Number(obliquityDegrees);
  if(!Number.isFinite(lambda)||!Number.isFinite(phi)||Math.abs(phi)>=90||
     !Number.isFinite(epsilon)||epsilon<=0||epsilon>=90)return null;
  const l=normalizeDegrees(lambda)*DEG,p=phi*DEG,e=epsilon*DEG;
  const sinDeclination=Math.sin(e)*Math.sin(l);
  const declination=Math.asin(clamp(sinDeclination,-1,1));
  const ascensionalTerm=Math.tan(p)*Math.tan(declination);
  if(Math.abs(ascensionalTerm)>1+1e-12)return null;
  const ascensionalDifference=Math.asin(clamp(ascensionalTerm,-1,1));
  let rightAscension=Math.atan2(Math.sin(l)*Math.cos(e),Math.cos(l))*RAD;
  if(rightAscension<0)rightAscension+=360;
  return normalizeDegrees(rightAscension-ascensionalDifference*RAD);
}


// Integrate the OA change along the ecliptic arc instead of trusting only its
// endpoints. This detects a circumpolar gap inside a sign at high latitudes.
function risingArcDegrees(startLongitude,endLongitude,latitude,obliquityDegrees){
  const start=normalizeDegrees(startLongitude),span=normalizeDegrees(endLongitude-start);
  if(!(span>1e-10&&span<=30+1e-10))return null;
  const segments=Math.max(1,Math.ceil(span*2));
  let previous=obliqueAscension(start,latitude,obliquityDegrees);
  if(previous===null)return null;
  let total=0;
  for(let index=1;index<=segments;index++){
    const longitude=start+span*index/segments;
    const current=obliqueAscension(longitude,latitude,obliquityDegrees);
    if(current===null)return null;
    const step=normalizeDegrees(current-previous);
    if(!(step>1e-10&&step<=15))return null;
    total+=step;
    previous=current;
  }
  return total>0&&total<=60?total:null;
}

function allocateWholeVighati(rows){
  // Largest-remainder allocation keeps the rounded 12-sign table at exactly
  // 3,600 vighati (60 nazhigai) without biasing one particular sign.
  const base=rows.map(row=>Math.floor(row.exactVighati+1e-10));
  let remaining=TOTAL_VIGHATI-base.reduce((sum,value)=>sum+value,0);
  const order=rows.map((row,index)=>({index,fraction:row.exactVighati-base[index]}))
    .sort((a,b)=>b.fraction-a.fraction||a.index-b.index);
  for(let i=0;i<remaining&&i<order.length;i++)base[order[i].index]++;
  return base;
}

export function calculateRasiManaForLocation({
  latitude,ayanamsaDegrees,obliquityDegrees
}){
  const lat=Number(latitude),ayanamsa=Number(ayanamsaDegrees),obliquity=Number(obliquityDegrees);
  if(!Number.isFinite(lat)||lat < -90||lat > 90||
     !Number.isFinite(ayanamsa)||!Number.isFinite(obliquity)){
    throw new TypeError('Valid latitude, Lahiri ayanamsa and obliquity are required.');
  }
  const rows=Array.from({length:12},(_,signIndex)=>{
    const siderealStart=signIndex*30;
    const durationDegrees=risingArcDegrees(
      siderealStart+ayanamsa,siderealStart+30+ayanamsa,lat,obliquity
    );
    if(durationDegrees===null){
      return {signIndex,available:false,reason:'circumpolar-or-invalid-rising-arc',durationDegrees:null,durationSeconds:null,exactVighati:null};
    }
    return {
      signIndex,available:true,
      durationDegrees,
      durationSeconds:durationDegrees*SECONDS_PER_OA_DEGREE,
      exactVighati:durationDegrees*VIGHATI_PER_OA_DEGREE
    };
  });
  const allRise=rows.every(row=>row.available);
  if(allRise){
    const allocated=allocateWholeVighati(rows);
    for(let i=0;i<rows.length;i++){
      const total=allocated[i];
      rows[i].totalVighati=total;
      rows[i].nazhigai=Math.floor(total/60);
      rows[i].vinazhigai=total%60;
    }
  }else{
    for(const row of rows){
      row.totalVighati=null;
      row.nazhigai=null;
      row.vinazhigai=null;
    }
  }
  return {
    available:allRise,
    latitude:lat,
    ayanamsaDegrees:ayanamsa,
    obliquityDegrees:obliquity,
    totalVighati:allRise?TOTAL_VIGHATI:null,
    totalSeconds:allRise?86400:null,
    rows
  };
}

export function calculateLagnaBalanceFromRasiMana({
  siderealLongitude,latitude,ayanamsaDegrees,obliquityDegrees,armcDegrees
}){
  const longitude=normalizeDegrees(siderealLongitude);
  const lat=Number(latitude),ayanamsa=Number(ayanamsaDegrees),obliquity=Number(obliquityDegrees);
  if(!Number.isFinite(longitude)||!Number.isFinite(lat)||Math.abs(lat)>=90||
     !Number.isFinite(ayanamsa)||!Number.isFinite(obliquity)){
    throw new TypeError('Valid Lagna longitude and place-based astronomy values are required.');
  }
  const signIndex=Math.floor(longitude/30);
  const tropicalSignEnd=normalizeDegrees((signIndex+1)*30+ayanamsa);
  const armc=Number(armcDegrees);
  // At the rising horizon, local sidereal time (ARMC) plus 90 degrees is
  // the current oblique ascension. Use the same Swiss horizon solution that
  // supplied the Lagna, rather than reconstructing it from rounded sidereal
  // longitude and ayanamsa.
  const currentOA=Number.isFinite(armc)
    ? normalizeDegrees(armc+90)
    : obliqueAscension(normalizeDegrees(longitude+ayanamsa),lat,obliquity);
  const endOA=obliqueAscension(tropicalSignEnd,lat,obliquity);
  if(currentOA===null||endOA===null){
    return {available:false,reason:'circumpolar-or-invalid-rising-arc',signIndex,longitude};
  }
  const remainingDegrees=normalizeDegrees(endOA-currentOA);
  if(!(remainingDegrees>0&&remainingDegrees<=60)){
    return {available:false,reason:'invalid-remaining-oblique-arc',signIndex,longitude};
  }
  const balanceSecondsExact=remainingDegrees*SECONDS_PER_OA_DEGREE;
  const balanceVighati=Math.max(0,Math.round(remainingDegrees*VIGHATI_PER_OA_DEGREE));
  const mana=calculateRasiManaForLocation({latitude:lat,ayanamsaDegrees:ayanamsa,obliquityDegrees:obliquity});
  return {
    available:true,
    method:'oblique-ascension',
    signIndex,
    siderealLongitude:longitude,
    degreeWithinSign:longitude-signIndex*30,
    remainingObliqueDegrees:remainingDegrees,
    currentObliqueAscension:currentOA,
    armcDegrees:Number.isFinite(armc)?normalizeDegrees(armc):null,
    balanceSeconds:Math.round(balanceSecondsExact),
    balanceNazhigai:Math.floor(balanceVighati/60),
    balanceVinazhigai:balanceVighati%60,
    rasiMana:mana
  };
}
