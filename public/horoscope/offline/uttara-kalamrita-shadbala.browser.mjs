/**
 * Uttara Kalamrita (P. S. Sastri translation), Chapter II, printed pp. 41, 45.
 * Supplemental, auditable Shadbala rules; does not replace BPHS sthana/dig/kala
 * or infer the unavailable mean/sheeghra ephemerides for Cheshta.
 *
 * The commentary presents TWO planetary-war rectifications: a disc-diameter
 * quotient (p.41) and a one-Rupa winner/loser change (p.45).
 * This independent channel uses ONLY the explicit p.45 one-Rupa instruction,
 * labels that choice, and does not claim that the contradictory formula is
 * reconciled or that full classical Shadbala is certified.
 */
const WAR_PLANETS=Object.freeze(['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']);
const WAR_SET=new Set(WAR_PLANETS);
const normalized=x=>((x%360)+360)%360;
const separation=(a,b)=>{const d=Math.abs(normalized(a)-normalized(b));return Math.min(d,360-d);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);

/**
 * Accepted input is the existing seven-graha output, augmented with Swiss
 * geocentric ecliptic latitude. A war requires SAME bhava and longitude
 * LONGITUDES AGREE TO THE DEGREE AND MINUTE (same DMS minute bin),
 * NOT a loose <=1 degree orbit. Northern ecliptic latitude wins (UK II.16½–17½).
 * E.g. 100°00′09″ and 100°00′59″ match, 100°00′59″ and 100°01′00″ do not.
 * Ambiguous overlaps, exact latitude ties and missing data yield NO guessed
 * winner. Sun, Moon and lunar nodes never participate.
 */
export function uttaraKalamritaGrahaYuddha(planets){
  if(!Array.isArray(planets))throw new TypeError('planets must be an array');
  const eligible=planets.filter(p=>WAR_SET.has(p?.name));
  if(new Set(eligible.map(p=>p.name)).size!==eligible.length)
    throw new RangeError('duplicate graha in yuddha inputs');
  const virupaByPlanet=Object.fromEntries(WAR_PLANETS.map(p=>[p,0]));
  const candidates=[],unresolved=[];
  for(let i=0;i<eligible.length;i++)for(let j=i+1;j<eligible.length;j++){
    const a=eligible[i],b=eligible[j];
    if(!finite(a.longitude)||!finite(b.longitude)){
      unresolved.push({grahas:[a.name,b.name],reason:'missing-longitude'});continue;
    }
    // UK II.16½–17½ explicitly requires agreement in DEGREE AND MINUTE.
    // Compare the full 0..21599 arcminute index (degree plus whole minute),
    // rather than the previously used 1° proximity approximation.
    // Never fold a 359°59′/0°00′ boundary into the same longitude minute.
    const minuteA=Math.floor(normalized(a.longitude)*60);
    const minuteB=Math.floor(normalized(b.longitude)*60);
    if(minuteA!==minuteB)continue;
    const degrees=separation(a.longitude,b.longitude);
    if(!Number.isInteger(a.bhava)||!Number.isInteger(b.bhava)){
      unresolved.push({grahas:[a.name,b.name],reason:'missing-bhava',degrees});continue;
    }
    if(a.bhava!==b.bhava)continue;
    if(!finite(a.eclipticLatitude)||!finite(b.eclipticLatitude)){
      unresolved.push({grahas:[a.name,b.name],reason:'missing-ecliptic-latitude',degrees});continue;
    }
    if(Math.abs(a.eclipticLatitude-b.eclipticLatitude)<1e-9){
      unresolved.push({grahas:[a.name,b.name],reason:'equal-north-latitude',degrees});continue;
    }
    const winner=a.eclipticLatitude>b.eclipticLatitude?a.name:b.name;
    const loser=winner===a.name?b.name:a.name;
    candidates.push({grahas:[a.name,b.name],winner,loser,degrees});
  }
  const count=Object.create(null);
  for(const c of candidates)for(const g of c.grahas)count[g]=(count[g]||0)+1;
  const encounters=[];
  for(const c of candidates){
    if(c.grahas.some(g=>count[g]>1 || unresolved.some(u=>u.grahas.includes(g)))){
      unresolved.push({grahas:c.grahas,reason:'overlapping-or-ambiguous-war',degrees:c.degrees});
      continue;
    }
    virupaByPlanet[c.winner]+=60;
    virupaByPlanet[c.loser]-=60;
    encounters.push({...c,winnerVirupa:60,loserVirupa:-60});
  }
  return {virupaByPlanet,encounters,unresolved,
    reference:'Uttara Kalamrita Chapter II printed p.45, one-Rupa rectification',
    variant:'one-rupa-north-wins',
    certified:false,
    note:'Printed p.41 also gives disc-diameter quotient; not silently equated with p.45'};
}

/** Independent numerical cross-check for UK Chapter II p.45 summary table. */
export function uttaraKalamritaRectifiedTotal(priorFourRupas,naisargikaRupas,drigRupas,yuddhaRupas=0){
  if(![priorFourRupas,naisargikaRupas,drigRupas,yuddhaRupas].every(finite))
    throw new TypeError('all Rupas must be finite numbers');
  return priorFourRupas+naisargikaRupas+drigRupas+yuddhaRupas;
}
