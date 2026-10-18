import assert from 'node:assert/strict';
import { full } from '../public/horoscope/offline/offline-engine.mjs';
import { cgRajanSelectAyurdayaMethod } from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';

const body = {
  date: '2026-10-31',
  time: '02:57',
  lat: 11.232,
  lon: 78.88,
  utcOffsetMinutes: 330,
  name: 'Ayurdaya selector regression — Perambalur'
};
const result = await full(body);
assert.equal(result.ok, true, 'Chart engine should calculate the requested birth date');
const chart = result.chart;
const selection = cgRajanSelectAyurdayaMethod({
  planets: chart.planets,
  lagna: chart.lagna
});
const sign = Math.floor((((chart.lagna.longitude % 360) + 360) % 360) / 30);
const signNames = ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const lordBySign = ['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
const lagnaLord = lordBySign[sign];
const wantedNames = ['சூரியன்','சந்திரன்',lagnaLord];
const strengths = Object.fromEntries(wantedNames.map(name => {
  const p = chart.planets.find(x => x.name === name);
  return [name, {
    available: p?.strength6?.available === true,
    totalVirupa: p?.strength6?.totalVirupa ?? null,
    components: p?.strength6?.components ?? null,
    classicalCertified: p?.strength6?.classicalCertified ?? false
  }];
}));
const available = Object.entries(strengths).filter(([,v]) => v.available && Number.isFinite(v.totalVirupa));
const max = available.length ? Math.max(...available.map(([,v]) => v.totalVirupa)) : null;
const winners = available.filter(([,v]) => Math.abs(v.totalVirupa - max) <= 1e-7).map(([name]) => name);
const expectedRole = winners.length !== 1 ? 'unavailable' :
  winners[0] === 'சூரியன்' ? 'sun' :
  winners[0] === 'சந்திரன்' ? 'moon' : 'lagnaLord';
const expectedMethod = expectedRole === 'sun' ? 'pinda' :
  expectedRole === 'moon' ? 'natural' :
  expectedRole === 'lagnaLord' ? 'amsa' : null;

// This regression checks the real chart's selection contract, not a manually
// fabricated set of Shadbala values. If it fails, report winner and selector.
assert.equal(selection.referenceRole || 'unavailable', expectedRole,
  'Selected Ayurdaya must follow the greatest actual strength6 Virupa among Sun, Moon and Lagna lord.');

console.log(JSON.stringify({
  case: body,
  lagna: { longitude: chart.lagna.longitude, signIndex: sign, sign: signNames[sign], lord: lagnaLord },
  comparedStrength6: strengths,
  computedWinnerNames: winners,
  expectedRole,
  expectedMethod,
  selector: {
    available: selection.available,
    selectedMethod: selection.selectedMethod,
    referenceRole: selection.referenceRole,
    referencePlanet: selection.referencePlanet,
    scoreVirupa: selection.scoreVirupa,
    lagnaLordPlanet: selection.lagnaLordPlanet,
    lagnaSignIndex: selection.lagnaSignIndex,
    reasonCode: selection.reasonCode
  }
}, null, 2));
