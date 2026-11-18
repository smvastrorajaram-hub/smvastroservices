const SIGNS = Object.freeze([
  ['Aries','மேஷம்'],['Taurus','ரிஷபம்'],['Gemini','மிதுனம்'],['Cancer','கடகம்'],
  ['Leo','சிம்மம்'],['Virgo','கன்னி'],['Libra','துலாம்'],['Scorpio','விருச்சிகம்'],
  ['Sagittarius','தனுசு'],['Capricorn','மகரம்'],['Aquarius','கும்பம்'],['Pisces','மீனம்']
]);

function signIndex(value){
  const name=String(value??'').trim();
  return SIGNS.findIndex(pair=>pair.includes(name));
}
function safeInteger(value,min,max){
  const n=Number(value);
  return Number.isInteger(n)&&n>=min&&n<=max?n:null;
}

/**
 * Build the one neutral fact packet shared by both traditions.
 * All astronomical values are copied from the existing Calendar worker's
 * Thirukanitha/Lahiri + Swiss Ephemeris result; this module does not calculate
 * planetary positions, Panchanga, local sunrise, or timezone offsets.
 */
export function toAstronomyFacts(daily,input={}){
  const p=daily?.en?.p;
  const t=daily?.en?.t;
  if(!p||!t)throw new Error('Muhurta requires an existing Calendar Panchanga and transit result.');
  const requested=t.requested||p.requested||{};
  const lagnaIndex=signIndex(t?.lagna?.rasi);
  const planets=(Array.isArray(t?.planets)?t.planets:[]).map(planet=>({
    name:String(planet?.name??''),
    signIndex:signIndex(planet?.rasi),
    longitude:Number.isFinite(Number(planet?.longitude))?Number(planet.longitude):null,
    retrograde:Boolean(planet?.retrograde),
    combust:Boolean(planet?.combustion)
  }));
  const houseOccupants=Array.from({length:12},(_,index)=>[]);
  if(lagnaIndex>=0){
    for(const planet of planets){
      if(planet.signIndex<0)continue;
      const house=((planet.signIndex-lagnaIndex+12)%12)+1;
      houseOccupants[house-1].push(planet.name);
    }
  }
  const date=String(requested.date||input.date||'');
  const weekdayIndex=/^\d{4}-\d{2}-\d{2}$/.test(date)
    ?new Date(Date.UTC(Number(date.slice(0,4)),Number(date.slice(5,7))-1,Number(date.slice(8,10)))).getUTCDay()
    :null;
  return Object.freeze({
    schema:'smv.muhurta.astronomy-facts.v1',
    sourceEngine:'existing-smv-swiss-ephemeris-thirukanitha',
    date,
    time:String(requested.time||input.time||''),
    latitude:Number(requested.latitude??input.lat),
    longitude:Number(requested.longitude??input.lon),
    timezone:String(input.timezone||''),
    utcOffsetMinutes:Number(input.utcOffsetMinutes??330),
    weekdayIndex,
    tithiNumber:safeInteger(p?.tithi?.number,1,30),
    tithiName:String(p?.tithi?.name??''),
    paksha:String(p?.tithi?.half??''),
    nakshatraNumber:safeInteger(p?.nakshatra?.number,1,27),
    nakshatraName:String(p?.nakshatra?.name??''),
    nakshatraPada:safeInteger(p?.nakshatra?.pada,1,4),
    yogaNumber:safeInteger(p?.yoga?.number,1,27),
    yogaName:String(p?.yoga?.name??''),
    karanaNumber:safeInteger(p?.karana?.number,1,60),
    karanaName:String(p?.karana?.name??''),
    sunrise:String(p?.sunrise??''),
    sunset:String(p?.sunset??''),
    rahuKalam:String(p?.rahuKalam??''),
    yamagandam:String(p?.yamagandam??''),
    gulikai:String(p?.gulikai??''),
    lagnaSignIndex:lagnaIndex>=0?lagnaIndex:null,
    lagnaName:String(t?.lagna?.rasi??''),
    planets:Object.freeze(planets),
    houseOccupants:Object.freeze(houseOccupants.map(list=>Object.freeze(list))),
    panchangaBoundaries:Object.freeze({
      tithi:Object.freeze({start:String(p?.tithi?.start??''),end:String(p?.tithi?.end??'')}),
      nakshatra:Object.freeze({start:String(p?.nakshatra?.start??''),end:String(p?.nakshatra?.end??'')}),
      yoga:Object.freeze({start:String(p?.yoga?.start??''),end:String(p?.yoga?.end??'')}),
      karana:Object.freeze({start:String(p?.karana?.start??''),end:String(p?.karana?.end??'')})
    })
  });
}
