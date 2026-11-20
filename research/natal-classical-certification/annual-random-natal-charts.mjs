#!/usr/bin/env node
/**
 * One reproducible seeded-random full natal chart per year, 1800–2399.
 *
 * Every sample chooses a valid random Gregorian birth date and wall-clock time
 * within that year, plus a random Indian city from the checked-in place pool.
 * The city's historical IANA UTC offset is resolved for that exact date/time.
 *
 * This is a 600-chart calculation/coverage regression, not a historical
 * astronomical accuracy certificate. All classical flags must remain false.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  full
} from '../../public/horoscope/offline/offline-engine.mjs';
import { offsetMinutesAt } from '../../public/horoscope/offline/places/timezone.mjs';
import {
  sauraBijaCorrectedTrueLongitudeResearch
} from '../../research/saura-bija/saura-bija-mean-motion.mjs';
import { CLASSICAL_NATAL_SCOPE } from './evidence-gates.mjs';
import { BV_RAMAN_SHADBALA_SOURCE } from '../../public/horoscope/offline/bv-raman-shadbala.browser.mjs';

const SEED = 0x534d5641; // "SMVA"; deterministic seeded-random audit corpus
const EXPECTED_CHARTS = CLASSICAL_NATAL_SCOPE.endYear -
  CLASSICAL_NATAL_SCOPE.startYear + 1;
const GRAHAS = Object.freeze([
  'சூரியன்', 'சந்திரன்', 'செவ்வாய்', 'புதன்',
  'குரு', 'சுக்கிரன்', 'சனி'
]);
const FIVE_PLANETS = Object.freeze([
  ['செவ்வாய்', 'Mars'],
  ['புதன்', 'Mercury'],
  ['குரு', 'Jupiter'],
  ['சுக்கிரன்', 'Venus'],
  ['சனி', 'Saturn']
]);

// Curated India place pool. The coordinates are used in the natal calculation;
// the IANA zone is then evaluated at each selected historical birth instant.
const PLACES = Object.freeze([
  ['Perambalur',11.232,78.880],
  ['Chennai',13.0827,80.2707],
  ['Coimbatore',11.0168,76.9558],
  ['Madurai',9.9252,78.1198],
  ['Tiruchirappalli',10.7905,78.7047],
  ['Salem',11.6643,78.1460],
  ['Thanjavur',10.7870,79.1378],
  ['Tirunelveli',8.7139,77.7567],
  ['Bengaluru',12.9716,77.5946],
  ['Mysuru',12.2958,76.6394],
  ['Hyderabad',17.3850,78.4867],
  ['Vijayawada',16.5062,80.6480],
  ['Visakhapatnam',17.6868,83.2185],
  ['Mumbai',19.0760,72.8777],
  ['Pune',18.5204,73.8567],
  ['Ahmedabad',23.0225,72.5714],
  ['Jaipur',26.9124,75.7873],
  ['New Delhi',28.6139,77.2090],
  ['Lucknow',26.8467,80.9462],
  ['Varanasi',25.3176,82.9739],
  ['Bhopal',23.2599,77.4126],
  ['Indore',22.7196,75.8577],
  ['Kolkata',22.5726,88.3639],
  ['Bhubaneswar',20.2961,85.8245],
  ['Patna',25.5941,85.1376],
  ['Ranchi',23.3441,85.3096],
  ['Guwahati',26.1445,91.7362],
  ['Shillong',25.5788,91.8933],
  ['Imphal',24.8170,93.9368],
  ['Agartala',23.8315,91.2868],
  ['Srinagar',34.0837,74.7973],
  ['Jammu',32.7266,74.8570],
  ['Shimla',31.1048,77.1734],
  ['Dehradun',30.3165,78.0322],
  ['Amritsar',31.6340,74.8723],
  ['Chandigarh',30.7333,76.7794],
  ['Jodhpur',26.2389,73.0243],
  ['Udaipur',24.5854,73.7125],
  ['Panaji',15.4909,73.8278],
  ['Kochi',9.9312,76.2673],
  ['Thiruvananthapuram',8.5241,76.9366],
  ['Kozhikode',11.2588,75.7804],
  ['Mangaluru',12.9141,74.8560],
  ['Raipur',21.2514,81.6296],
  ['Nagpur',21.1458,79.0882],
  ['Surat',21.1702,72.8311],
  ['Kanpur',26.4499,80.3319],
  ['Agra',27.1767,78.0081],
  ['Gwalior',26.2183,78.1828],
  ['Nashik',19.9975,73.7898]
].map(([name,lat,lon]) => Object.freeze({
  name, lat, lon, timeZone:'Asia/Kolkata', country:'India'
})));

let randomState = SEED >>> 0;
function random() {
  randomState ^= randomState << 13;
  randomState ^= randomState >>> 17;
  randomState ^= randomState << 5;
  return (randomState >>> 0) / 4294967296;
}
const pick = values => values[Math.floor(random() * values.length)];
const pad2 = value => String(value).padStart(2,'0');
const EPOCH_MS = Date.UTC(1970,0,1);
const JD_UNIX_EPOCH = 2440587.5;

function makeBirth(year) {
  const month = Math.floor(random() * 12);
  const daysInMonth = new Date(Date.UTC(year,month+1,0)).getUTCDate();
  // The India local-mean-time offset can place 1800-01-01 local births
  // just before the Saura research module's 1800-01-01 UTC lower bound.
  // Keep the first 1800 sample random while avoiding only that boundary day.
  const firstAllowedDay = year === 1800 && month === 0 ? 2 : 1;
  const day = firstAllowedDay +
    Math.floor(random() * (daysInMonth - firstAllowedDay + 1));
  const hour = Math.floor(random() * 24);
  const minute = Math.floor(random() * 60);
  const date = year + '-' + pad2(month+1) + '-' + pad2(day);
  const time = pad2(hour) + ':' + pad2(minute);
  const place = pick(PLACES);
  const utcOffsetMinutes = offsetMinutesAt(place.timeZone,date,time);
  const wallClockAsUtcMs = Date.UTC(year,month,day,hour,minute,0);
  const utcInstantMs = wallClockAsUtcMs - utcOffsetMinutes * 60000;
  const jdUt = (utcInstantMs - EPOCH_MS) / 86400000 + JD_UNIX_EPOCH;
  return {
    year,date,time,place:place.name,country:place.country,
    lat:place.lat,lon:place.lon,timeZone:place.timeZone,
    utcOffsetMinutes,jdUt,
    epochId:'RANDOM_NATAL_' + year + '_' + date + '_' + time.replace(':','') +
      '_' + place.name.toUpperCase().replace(/[^A-Z0-9]+/g,'_')
  };
}

const records = [];
const placeCounts = new Map();
let successfulCharts = 0;
let missingGrahaRows = 0;
let unavailableStrength6Rows = 0;
let missingBalaComponentRows = 0;
let totalReconciliationFailures = 0;
let withheldTotalRows = 0;
let falseClassicalFlags = 0;
let sauraResearchRows = 0;
let minSampleYear = Infinity;
let maxSampleYear = -Infinity;
const aggregate = {
  charts:0,grahas:0,balaComponentValues:0,
  finiteTotals:0,withheldTotals:0,
  grahasMeetingRupaMinimum:0,
  classicalCertifiedTrue:0,
  sauraInputs:0,
  uniquePlaces:0
};
const aggregateYuddha = {
  evaluatedPairs:0,
  noWarPairs:0,
  resolvedWars:0,
  unresolvedPairs:0,
  chartsWithYuddha:0,
  chartsWithUnresolvedYuddha:0
};

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

for (let year = CLASSICAL_NATAL_SCOPE.startYear;
     year <= CLASSICAL_NATAL_SCOPE.endYear; year++) {
  const birth = makeBirth(year);
  assert.equal(birth.year,year,'exactly one selected chart for year '+year);
  assert.ok(birth.date.startsWith(String(year)+'-'),'selected date remains in its assigned year');
  assert.ok(birth.lat >= -90 && birth.lat <= 90 && birth.lon >= -180 && birth.lon <= 180,
    birth.place+' coordinates are valid');
  placeCounts.set(birth.place,(placeCounts.get(birth.place)||0)+1);
  minSampleYear = Math.min(minSampleYear,year);
  maxSampleYear = Math.max(maxSampleYear,year);

  const result = await full({
    date:birth.date,
    time:birth.time,
    lat:birth.lat,
    lon:birth.lon,
    height:0,
    utcOffsetMinutes:birth.utcOffsetMinutes,
    language:'en',
    name:'Annual random natal research sample',
    basicOnly:true
  });
  assert.equal(result?.ok,true,'full natal engine succeeds for '+birth.epochId);
  const chart = result.chart;
  assert.ok(chart && Array.isArray(chart.planets),'chart planets are present for '+birth.epochId);
  const chartGrahas = chart.planets.filter(planet => GRAHAS.includes(planet.name));
  assert.equal(chartGrahas.length,7,'seven classical grahas for '+birth.epochId);

  // Audit every one of the ten possible eligible five-planet pairs. The
  // engine's warEvidence.pairs contains only pairs inside the strict <1°
  // threshold; every remaining pair must therefore be explicitly NO_WAR.
  const eligibleTamil = ['செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
  const grahaByName = new Map(chartGrahas.map(planet => [planet.name,planet]));
  const warEvidence = chartGrahas[0]?.strength6?.warEvidence;
  assert.ok(warEvidence && typeof warEvidence.resolved === 'boolean',
    birth.epochId+' Raman Yuddha evidence object is present');
  assert.ok(Array.isArray(warEvidence.pairs) && Array.isArray(warEvidence.unresolved),
    birth.epochId+' Raman Yuddha pair and unresolved arrays are present');
  const discDiameters = BV_RAMAN_SHADBALA_SOURCE.yuddhaDiscDiameterArcsec;
  assert.ok(discDiameters && typeof discDiameters === 'object',
    birth.epochId+' audited Raman planetary disc-diameter source constants are present');
  assert.ok(typeof warEvidence.source === 'string' && warEvidence.source.includes('B.V. Raman'),
    birth.epochId+' Raman Yuddha source provenance is present');

  const normalizedPair = (a,b) => [a,b].sort().join('|');
  const warCandidates = new Map(warEvidence.pairs.map(pair =>
    [normalizedPair(pair.a,pair.b),pair]));
  const unresolvedPairs = new Map(warEvidence.unresolved.map(pair =>
    [normalizedPair(pair.a,pair.b),pair]));
  assert.equal(warCandidates.size,warEvidence.pairs.length,
    birth.epochId+' Yuddha candidate pairs are unique');
  assert.equal(unresolvedPairs.size,warEvidence.unresolved.length,
    birth.epochId+' Yuddha unresolved pairs are unique');

  const angleDistance = (a,b) => {
    const x=((a%360)+360)%360,y=((b%360)+360)%360;
    const d=Math.abs(x-y);
    return Math.min(d,360-d);
  };
  const natalYuddhaPairs = [];
  const unresolvedGrahas = new Set();
  for (const pair of warEvidence.unresolved) {
    unresolvedGrahas.add(pair.a);
    unresolvedGrahas.add(pair.b);
  }
  for (let i=0;i<eligibleTamil.length;i++) {
    for (let j=i+1;j<eligibleTamil.length;j++) {
      const a=eligibleTamil[i],b=eligibleTamil[j];
      const first=grahaByName.get(a),second=grahaByName.get(b);
      assert.ok(first&&second,birth.epochId+' both Yuddha grahas are present: '+a+'/'+b);
      const separation=angleDistance(first.longitude,second.longitude);
      const key=normalizedPair(a,b);
      const candidate=warCandidates.get(key);
      const unresolved=unresolvedPairs.get(key);
      let outcome='NO_WAR',winner=null,loser=null,magnitude=null,diameterDifferenceArcsec=null;

      if(separation>=1) {
        assert.equal(candidate,undefined,
          birth.epochId+' '+a+'/'+b+' at or above 1° is not a Yuddha candidate');
        assert.equal(unresolved,undefined,
          birth.epochId+' '+a+'/'+b+' at or above 1° is not unresolved');
        aggregateYuddha.noWarPairs++;
      } else {
        assert.ok(candidate,
          birth.epochId+' '+a+'/'+b+' below 1° appears in the Raman war-candidate evidence');
        if(unresolved) {
          outcome='UNRESOLVED';
          aggregateYuddha.unresolvedPairs++;
        } else {
          outcome='WAR';
          const firstLongitude=((first.longitude%360)+360)%360;
          const secondLongitude=((second.longitude%360)+360)%360;
          winner=firstLongitude<secondLongitude?a:b;
          loser=winner===a?b:a;
          const winnerGraha=grahaByName.get(winner);
          const loserGraha=grahaByName.get(loser);
          const winnerTrace=winnerGraha.strength6.components.kala.yuddhaTrace||[];
          const loserTrace=loserGraha.strength6.components.kala.yuddhaTrace||[];
          const win=winnerTrace.find(row=>row.against===loser&&row.result==='winner');
          const lose=loserTrace.find(row=>row.against===winner&&row.result==='loser');
          assert.ok(win&&lose,birth.epochId+' '+a+'/'+b+' winner and loser Kala traces exist');
          assert.ok(finite(win.magnitude)&&finite(lose.magnitude),
            birth.epochId+' '+a+'/'+b+' both Yuddha adjustment magnitudes are finite');
          assert.ok(Math.abs(win.magnitude-lose.magnitude)<=0.001,
            birth.epochId+' '+a+'/'+b+' winner/loser adjustment magnitudes are equal');
          magnitude=win.magnitude;
          const da=discDiameters[a],db=discDiameters[b];
          diameterDifferenceArcsec=Math.abs(da-db);
          assert.ok(finite(da)&&finite(db)&&diameterDifferenceArcsec>0,
            birth.epochId+' '+a+'/'+b+' source disc-diameter difference is positive');
          assert.ok(Math.abs(win.diameterDifferenceArcsec-diameterDifferenceArcsec)<1e-9,
            birth.epochId+' '+a+'/'+b+' applied adjustment uses the source disc-diameter difference');
          assert.ok(Math.abs(lose.diameterDifferenceArcsec-diameterDifferenceArcsec)<1e-9,
            birth.epochId+' '+a+'/'+b+' loser uses the same disc-diameter difference');
          aggregateYuddha.resolvedWars++;
        }
      }
      natalYuddhaPairs.push({
        planetA:a,planetB:b,separationDegrees:separation,outcome,
        winner,loser,magnitude,diameterDifferenceArcsec,
        source:warEvidence.source
      });
    }
  }
  assert.equal(natalYuddhaPairs.length,10,
    birth.epochId+' all ten eligible five-planet Yuddha pairs are classified');
  if(warEvidence.resolved) {
    assert.equal(warEvidence.unresolved.length,0,
      birth.epochId+' resolved Yuddha evidence has no unresolved pair');
  } else {
    assert.ok(warEvidence.unresolved.length>0,
      birth.epochId+' unresolved Yuddha state carries explicit unresolved pairs');
    aggregateYuddha.chartsWithUnresolvedYuddha++;
  }
  for(const grahaName of eligibleTamil) {
    const row=grahaByName.get(grahaName);
    if(unresolvedGrahas.has(grahaName)) {
      assert.equal(row.strength6.totalVirupa,null,
        birth.epochId+' '+grahaName+' aggregate withheld because its Yuddha pair is unresolved');
      assert.equal(row.strength6.totalRupa,null,
        birth.epochId+' '+grahaName+' Rupa withheld because its Yuddha pair is unresolved');
    }
  }
  aggregateYuddha.evaluatedPairs+=natalYuddhaPairs.length;
  aggregateYuddha.chartsWithYuddha+=natalYuddhaPairs.some(pair=>pair.outcome==='WAR')?1:0;
  successfulCharts++;
  aggregate.charts++;

  const grahaRows = [];
  for (const grahaName of GRAHAS) {
    const graha = chartGrahas.find(planet => planet.name === grahaName);
    if (!graha) {
      missingGrahaRows++;
      continue;
    }
    aggregate.grahas++;
    const strength = graha.strength6;
    assert.equal(strength?.available,true,
      birth.epochId+' '+grahaName+' sixfold Shadbala object available');
    if (strength?.available !== true) {
      unavailableStrength6Rows++;
      continue;
    }
    if (strength.classicalCertified === true) {
      falseClassicalFlags++;
      aggregate.classicalCertifiedTrue++;
    }
    assert.equal(strength.classicalCertified,false,
      birth.epochId+' '+grahaName+' remains uncertified without complete independent evidence');

    const components = strength.components || {};
    const values = {
      sthana:components.sthana?.total,
      dig:components.dig,
      kala:components.kala?.total,
      cheshta:components.cheshta,
      naisargika:components.naisargika,
      drik:components.drik
    };
    const componentStatus = Object.fromEntries(
      Object.entries(values).map(([key,value]) => [key,finite(value)])
    );
    const finiteCount = Object.values(componentStatus).filter(Boolean).length;
    aggregate.balaComponentValues += finiteCount;
    if (finiteCount !== 6) missingBalaComponentRows++;

    let kalaReconciles = false;
    if (components.kala && finite(components.kala.total)) {
      const kalaSum = Object.entries(components.kala)
        .filter(([key,value]) =>
          !['total','warPreTotal','yuddhaTrace'].includes(key) && finite(value))
        .reduce((sum,[,value]) => sum + value,0);
      kalaReconciles = Math.abs(kalaSum-components.kala.total) <= 0.005;
      if (!kalaReconciles) totalReconciliationFailures++;
    }

    const sixBalaSum = Object.values(values).every(finite)
      ? values.sthana + values.dig + values.kala + values.cheshta + values.naisargika + values.drik
      : null;
    let totalReconciles = false;
    if (finite(strength.totalVirupa)) {
      aggregate.finiteTotals++;
      totalReconciles = finite(sixBalaSum) &&
        Math.abs(sixBalaSum-strength.totalVirupa) <= 0.01 &&
        finite(strength.totalRupa) &&
        Math.abs(strength.totalRupa-strength.totalVirupa/60) <= 0.002;
      if (!totalReconciles) totalReconciliationFailures++;
      if (strength.isStrong === true) aggregate.grahasMeetingRupaMinimum++;
    } else {
      aggregate.withheldTotals++;
      withheldTotalRows++;
      assert.equal(strength.totalRupa,null,
        birth.epochId+' '+grahaName+' withholds both total and Rupa when final total is unresolved');
    }

    grahaRows.push({
      graha:grahaName,
      longitude:graha.longitude,
      componentVirupas:values,
      componentStatus,
      balaComponentCount:finiteCount,
      kalaReconciles,
      totalVirupa:finite(strength.totalVirupa)?strength.totalVirupa:null,
      totalRupa:finite(strength.totalRupa)?strength.totalRupa:null,
      totalReconciles,
      isStrong:strength.isStrong===true,
      classicalCertified:strength.classicalCertified===true,
      unresolvedOrWithheld:!finite(strength.totalVirupa),
      yuddhaEvidence:strength.warEvidence ?? null
    });
  }

  const fivePlanetResearch = [];
  for (const [tamilName,planet] of FIVE_PLANETS) {
    const row = sauraBijaCorrectedTrueLongitudeResearch(birth.jdUt,planet);
    assert.ok([row.meanLongitude,row.sheeghrocca,row.mandocca,row.trueLongitude]
      .every(finite),birth.epochId+' '+planet+' Saura candidate longitudes are finite');
    assert.equal(row.frame,'traditional-Saura-nirayana',
      birth.epochId+' '+planet+' Saura candidate frame is declared');
    assert.equal(row.productionEligible,false,
      birth.epochId+' '+planet+' Saura output remains research-only');
    assert.equal(row.independentHistoricalOracleVerified,false,
      birth.epochId+' '+planet+' historical oracle remains unverified');
    fivePlanetResearch.push({
      graha:tamilName,planet,
      meanLongitude:row.meanLongitude,
      trueLongitude:row.trueLongitude,
      sheeghroccheya:row.sheeghrocca,
      mandocca:row.mandocca,
      frame:row.frame,
      trueLongitudeMethod:row.trueLongitudeMethod,
      independentHistoricalOracleVerified:false,
      productionEligible:false
    });
    sauraResearchRows++;
  }

  records.push({
    year,
    date:birth.date,
    localTime:birth.time,
    place:birth.place,
    country:birth.country,
    latitude:birth.lat,
    longitude:birth.lon,
    timeZone:birth.timeZone,
    historicalUtcOffsetMinutes:birth.utcOffsetMinutes,
    julianDayUT:birth.jdUt,
    epochId:birth.epochId,
    chartOk:true,
    classicalCertified:false,
    grahas:grahaRows,
    yuddha:{resolved:warEvidence.resolved,pairs:natalYuddhaPairs,unresolved:warEvidence.unresolved},
    fivePlanetHistoricalLongitudeResearch:fivePlanetResearch
  });
}

assert.equal(records.length,EXPECTED_CHARTS,'one natal chart per year from 1800–2399');
assert.equal(successfulCharts,600,'all 600 random natal charts calculate');
assert.equal(aggregate.grahas,600*7,'all 4,200 graha rows inspected');
assert.equal(aggregateYuddha.evaluatedPairs,600*10,'all 6,000 eligible Yuddha pair outcomes are classified');
assert.equal(sauraResearchRows,600*5,'all 3,000 five-planet historical candidate rows inspected');
assert.equal(missingGrahaRows,0,'no missing graha rows');
assert.equal(unavailableStrength6Rows,0,'all 4,200 strength6 objects available');
assert.equal(missingBalaComponentRows,0,'all 25,200 six-Bala component values are finite');
assert.equal(falseClassicalFlags,0,'no unsupported classicalCertified:true flags');
assert.equal(aggregate.classicalCertifiedTrue,0,'all 600 charts remain research-only');
assert.equal(totalReconciliationFailures,0,'all finite Kala/total/Rupa recompositions pass');
assert.equal(minSampleYear,1800,'first sample year');
assert.equal(maxSampleYear,2399,'last sample year');

aggregate.uniquePlaces = placeCounts.size;
const report = {
  pass:true,
  status:'PASS_600_RANDOM_NATAL_CHARTS_RESEARCH_ONLY',
  seed:'0x'+SEED.toString(16).toUpperCase(),
  randomization:'xorshift32; deterministic/reproducible; sampling with replacement',
  scope:'exactly one random full natal chart per civil year, 1800–2399',
  dateSelection:'uniform random valid Gregorian month/day within each assigned year',
  timeSelection:'uniform random minute of day (00:00–23:59)',
  placeSelection:'uniform random city from a fixed 50-place India pool',
  timeZone:'Asia/Kolkata; historical IANA offset resolved for each exact local date/time',
  totals:{
    ...aggregate,
    yuddha:aggregateYuddha,
    expectedCharts:600,
    expectedGrahaRows:4200,
    expectedBalaComponentValues:25200,
    expectedFivePlanetResearchRows:3000,
    missingGrahaRows,
    unavailableStrength6Rows,
    missingBalaComponentRows,
    totalReconciliationFailures,
    withheldTotals:withheldTotalRows,
    falseClassicalFlags
  },
  annualPlaceDistribution:Object.fromEntries([...placeCounts.entries()].sort((a,b)=>a[0].localeCompare(b[0]))),
  certification:{
    classicalCertified:false,
    independentHistoricalOracleVerifiedRows:0,
    status:'NOT_CERTIFIED',
    note:'600 random charts validate annual calculation coverage and six-Bala arithmetic only; they do not independently verify historical Saura inputs at arbitrary birth epochs.'
  },
  records
};

const artifactDir = new URL('../../artifacts/',import.meta.url);
mkdirSync(artifactDir,{recursive:true});
writeFileSync(
  new URL('natal-classical-random-600-charts-1800-2399.json',artifactDir),
  JSON.stringify(report,null,2)+'\n'
);
console.log(JSON.stringify({
  pass:report.pass,
  status:report.status,
  seed:report.seed,
  charts:successfulCharts,
  grahaRows:aggregate.grahas,
  sixBalaValues:aggregate.balaComponentValues,
  fivePlanetResearchRows:sauraResearchRows,
  uniqueIndianPlaces:aggregate.uniquePlaces,
  missingBalaComponentRows,
  totalReconciliationFailures,
  withheldTotals:withheldTotalRows,
  classicalCertifiedCharts:aggregate.classicalCertifiedTrue,
  artifact:'artifacts/natal-classical-random-600-charts-1800-2399.json'
}));
