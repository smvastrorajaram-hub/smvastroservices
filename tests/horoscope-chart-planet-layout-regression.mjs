import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const horoscopeCss = read('public/horoscope/horoscope.css');
const horoscopeJs = read('public/horoscope/horoscope.js');
const chartStyleJs = read('public/horoscope/chart-style.js');

const planetLineRule = horoscopeCss.match(/\.south-rasi-cell \.planet-line\{([^}]*)\}/);
assert.ok(planetLineRule, 'The shared South chart planet-row source rule must exist.');
assert.doesNotMatch(planetLineRule[1], /border-(?:bottom|top)\s*:/i,
  'Planet rows must not draw a horizontal separator.');
assert.equal(horoscopeCss.includes('.south-rasi-cell .planet-line:last-child{border-bottom:0px}'), false,
  'The old last-row-only border exception must not remain.');

const navStart = horoscopeJs.indexOf("const navChart=result.querySelector('#navamsaChart')");
const bhavaStart = horoscopeJs.indexOf("const bhChart=result.querySelector('#bhavaChart')");
const nextSection = horoscopeJs.indexOf('const dashaTree=result.querySelector', bhavaStart);
assert.ok(navStart >= 0 && bhavaStart > navStart && nextSection > bhavaStart,
  'Navamsa and Bhava renderers must remain in their expected presentation section.');
const navamsaRenderer = horoscopeJs.slice(navStart, bhavaStart);
const bhavaRenderer = horoscopeJs.slice(bhavaStart, nextSection);
assert.match(navamsaRenderer, /\$\{ps\}<\/div><\/div>/,
  'Navamsa renders its planet stack directly and leaves an empty stack blank.');
assert.match(bhavaRenderer, /\$\{houseLabels\}\$\{ps\}<\/div>/,
  'Bhava retains cusp labels and leaves an empty planet stack blank.');
assert.doesNotMatch(navamsaRenderer, /<div class="small">—<\/div>/,
  'Navamsa must not emit a dash in a planet-empty Rasi cell.');
assert.doesNotMatch(bhavaRenderer, /<div class="small">—<\/div>/,
  'Bhava must not emit a dash in a planet-empty Rasi cell.');

assert.ok(chartStyleJs.includes("const kind=chart.id==='bhavaChart'?'bhava':chart.id==='navamsaChart'?'d9':chart.id==='rasiChart'?'d1':'transit';"),
  'Alternate chart layouts must identify all four chart kinds correctly.');
assert.match(chartStyleJs, /else if\(kind!=='d9'&&kind!=='bhava'\)\{/,
  'North/East chart layouts must omit empty placeholders only in Navamsa and Bhava.');
assert.ok(chartStyleJs.includes("m.className='smv-v342-empty';m.textContent='—'"),
  'North/East Rasi and Transit layouts retain their previous empty-cell dash.');

for (const selector of ['#rasiChart', '#navamsaChart', '#bhavaChart', '.south-indian-chart.transit-chart']) {
  assert.ok(chartStyleJs.includes(selector), 'Chart style presentation must include ' + selector);
}

assert.ok(horoscopeJs.includes('planetDisplayName(p,chartLang)'), 'Rasi planet names remain rendered.');
assert.ok(horoscopeJs.includes('shortPlanetName(p.name,chartLang)'), 'Navamsa and Bhava planet names remain rendered.');
assert.ok(horoscopeJs.includes('transitPlanetEn(x.name)'), 'Transit planet names remain rendered.');
assert.ok(horoscopeCss.includes('.south-rasi-cell .planet-glyph{font-weight:900;color:rgb(138, 75, 22)}'),
  'The base planet-glyph colour declaration must remain unchanged.');
assert.ok(horoscopeCss.includes('color:rgb(224, 0, 0)!important;font-weight:900!important'),
  'The existing Horoscope planet text colour declaration must remain present.');

console.log('Horoscope four-chart planet separator and empty-cell regression: PASS');
