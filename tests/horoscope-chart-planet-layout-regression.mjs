import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const horoscopeCss = read('public/horoscope/horoscope.css');
const chartStyleCss = read('public/horoscope/chart-style.css');
const horoscopeJs = read('public/horoscope/horoscope.js');
const chartStyleJs = read('public/horoscope/chart-style.js');

const planetLineRule = horoscopeCss.match(/\.south-rasi-cell \.planet-line\{([^}]*)\}/);
assert.ok(planetLineRule, 'The shared South chart planet-row source rule must exist.');
assert.doesNotMatch(planetLineRule[1], /border-(?:bottom|top)\s*:/i);
assert.equal(horoscopeCss.includes('.south-rasi-cell .planet-line:last-child{border-bottom:0px}'), false);

const rasiStart = horoscopeJs.indexOf("const chart=result.querySelector('#rasiChart')");
const navStart = horoscopeJs.indexOf("const navChart=result.querySelector('#navamsaChart')");
const bhavaStart = horoscopeJs.indexOf("const bhChart=result.querySelector('#bhavaChart')");
const nextSection = horoscopeJs.indexOf('const dashaTree=result.querySelector', bhavaStart);
assert.ok(rasiStart >= 0 && navStart > rasiStart && bhavaStart > navStart && nextSection > bhavaStart);
const rasiRenderer = horoscopeJs.slice(rasiStart, navStart);
const navamsaRenderer = horoscopeJs.slice(navStart, bhavaStart);
const bhavaRenderer = horoscopeJs.slice(bhavaStart, nextSection);

assert.match(rasiRenderer, /const rasiPlanetCount=items\.length;/);
assert.match(rasiRenderer, /rasiPlanetCount>=3/);
assert.match(rasiRenderer, /data-chart-planet-count="\$\{rasiPlanetCount\}"/);
assert.match(navamsaRenderer, /const navamsaPlanetCount=bySign\[si\]\.length;/);
assert.match(navamsaRenderer, /navamsaPlanetCount>=3/);
assert.match(navamsaRenderer, /data-chart-planet-count="\$\{navamsaPlanetCount\}"/);
assert.match(navamsaRenderer, /\$\{ps\}<\/div>/);
assert.doesNotMatch(navamsaRenderer, /<div class="small">—<\/div>/);
assert.match(bhavaRenderer, /const bhavaPlanetCount=planetsByBhavaSign\[si\]\.length;/);
assert.match(bhavaRenderer, /bhavaPlanetCount>=3/);
assert.match(bhavaRenderer, /data-chart-planet-count="\$\{bhavaPlanetCount\}"/);
assert.match(bhavaRenderer, /\$\{houseLabels\}\$\{ps\}<\/div>/);
assert.doesNotMatch(bhavaRenderer, /<div class="small">—<\/div>/);

const transitStart = horoscopeJs.indexOf('const maxPlanetsPerSign=');
const transitEnd = horoscopeJs.indexOf('const dms=v=>', transitStart);
const transitRenderer = horoscopeJs.slice(transitStart, transitEnd);
assert.match(transitRenderer, /const transitPlanetCount=bySign\[si\]\.length;/);
assert.match(transitRenderer, /transitPlanetCount>=3/);
assert.match(transitRenderer, /data-chart-planet-count="\$\{transitPlanetCount\}"/);

assert.ok(chartStyleJs.includes("const kind=chart.id==='bhavaChart'?'bhava':chart.id==='navamsaChart'?'d9':chart.id==='rasiChart'?'d1':'transit';"));
assert.ok(chartStyleJs.includes('const planetCount=items.length;'));
assert.ok(chartStyleJs.includes('cell.dataset.chartPlanetCount=String(planetCount);'));
assert.ok(chartStyleJs.includes("if(planetCount>=3)cell.classList.add('smv-chart-cell-compact')"));
assert.match(chartStyleJs, /else if\(kind!=='d9'&&kind!=='bhava'\)\{/);
assert.ok(chartStyleJs.includes("m.className='smv-v342-empty';m.textContent='—'"));
assert.ok(chartStyleJs.includes("if(kind!=='bhava'&&style!=='east')cell.append(number);"), 'East Rasi, Navamsa and Transit suppress fixed zodiac-sign numbers; South and North retain their existing numbering.');
assert.ok(chartStyleJs.includes("const bhavaRows=kind==='bhava'?readBhavaTable(chart,isTa()):null;"), 'North and East both read the same authoritative Bhava Table mapping.');
assert.ok(chartStyleJs.includes('const bhavaHousesBySign=Array.from({length:12},()=>[]);'));
assert.ok(chartStyleJs.includes('bhavaHousesBySign[row.sign].push(h);'), 'Each Bhava house is placed under its Bhava Madhya/Sphuta Rasi.');
assert.ok(chartStyleJs.includes("h.textContent=style==='north'?romanHouse(house):String(bhavaHouseLabel||'');"), 'North displays its actual house number and East groups the mapped house labels by sign.');
assert.ok(chartStyleJs.includes("const bhavaLabel=kind==='bhava'?bhavaHousesBySign[sign].map(romanHouse).join('/'):'';"), 'East does not substitute ordinary Lagna-based Rasi house numbers for Bhava numbers.');
assert.ok(chartStyleJs.includes("h.textContent=house>=1&&house<=12?String(house):'';"), 'East Rasi, Navamsa and Transit retain their existing Lagna-derived house numbers unchanged.');

const horoscopeCountRules = horoscopeCss.split('\n').filter(line=>/^\.south-rasi-cell\[data-chart-planet-count="\d+"\]\{/.test(line.trim()));
assert.equal(horoscopeCountRules.length,20,'South-chart count rules exist at desktop and mobile widths for each 3–12 planet stack.');
for (const line of horoscopeCountRules) {
  const count=Number(/data-chart-planet-count="(\d+)"/.exec(line)[1]);
  assert.ok(line.includes('--smv-chart-compact-white-space:normal'),'Planet rows wrap inside the fixed box at '+count+' planets.');
  assert.equal(line.includes('--smv-chart-compact-font-size:'),count>=5,'Only 5+ planet South-chart cells receive the reduced font-size variable.');
}
const chartStyleCountRules=chartStyleCss.split('\n').filter(line=>/^\.smv-v342-cell\[data-chart-planet-count="\d+"\]\{/.test(line.trim()));
assert.equal(chartStyleCountRules.length,16,'North/East chart sizing has desktop and mobile reduced-size rules for 5–12 planets only.');
assert.ok(chartStyleCountRules.every(line=>Number(/data-chart-planet-count="(\d+)"/.exec(line)[1])>=5&&line.includes('--smv-chart-compact-font-size:')),'North/East font reduction starts only at five planets.');
assert.ok(horoscopeCss.includes('.south-rasi-cell.smv-chart-cell-compact .planet-line'));
assert.ok(horoscopeCss.includes('.south-rasi-cell:not(.smv-chart-cell-compact) .planet-line'), 'The 701–900px baseline font-size rule must not override cells with 3+ planets.');
assert.ok(horoscopeCss.includes('.south-rasi-cell{border:1px solid rgb(143, 112, 79);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;text-align:center;padding:7px 4px;min-width:0px;overflow:hidden;'),'The South-chart Rasi box remains clipped to its own boundary.');
assert.ok(chartStyleCss.includes('.smv-v342-cell.smv-chart-cell-compact .smv-v342-planets'));
assert.ok(chartStyleCss.includes('overflow:hidden;display:flex;flex-direction:column;'));
assert.ok(chartStyleCss.includes('width:22%;max-height:26%;min-width:0;overflow:hidden;'),'North/East cells remain width/height constrained and cannot escape the chart box.');
assert.ok(chartStyleCss.includes('.smv-v342-cell{font-size:var(--smv-chart-compact-font-size,'));
assert.ok(horoscopeCss.includes('.rasi-status-marker:where(:not(.smv-css-island,.smv-css-island *)){font-weight:900!important;font-size:var(--smv-chart-compact-font-size,'),'Tamil/English அ and வ markers inherit the five-plus cell size.');
assert.ok(horoscopeCss.includes('#tamilHoroscopeResult .south-rasi-cell .planet-degree, #englishHoroscopeResult .south-rasi-cell .planet-degree{font-size:var(--smv-chart-compact-font-size,'),'Degree labels in Tamil and English inherit the five-plus cell size.');
assert.ok(horoscopeCss.includes('#tamilHoroscopeResult .dynamic-rasi-number, #englishHoroscopeResult .dynamic-rasi-number{font-size:var(--smv-chart-compact-font-size,'),'Rasi house Number in Tamil and English inherits the five-plus cell size.');
assert.ok(horoscopeJs.includes("calendarPresentation&&ta?'அ':'C'"),'Tamil transit combustion marker uses அ.');
assert.ok(horoscopeJs.includes("calendarPresentation&&ta?'வ':'R'"),'Tamil transit retrograde marker uses வ.');
assert.ok(horoscopeJs.includes('class="status-combust"'),'Horoscope Rasi renderer retains its combustion marker element for inherited five-plus sizing.');
assert.ok(horoscopeJs.includes('class="status-retro"'),'Horoscope Rasi renderer retains its retrograde marker element for inherited five-plus sizing.');
assert.ok(horoscopeCss.includes('#tamilHoroscopeResult .status-combust, #englishHoroscopeResult .status-combust{'),'Tamil/English combustion marker styling remains attached to the marker text.');
assert.ok(horoscopeCss.includes('#tamilHoroscopeResult .status-retro, #englishHoroscopeResult .status-retro{'),'Tamil/English retrograde marker styling remains attached to the marker text.');

assert.ok(horoscopeJs.includes('planetDisplayName(p,chartLang)'));
assert.ok(horoscopeJs.includes('shortPlanetName(p.name,chartLang)'));
assert.ok(horoscopeJs.includes('transitPlanetEn(x.name)'));
assert.ok(horoscopeCss.includes('.south-rasi-cell .planet-glyph{font-weight:900;color:rgb(138, 75, 22)}'));
assert.ok(horoscopeCss.includes('color:rgb(224, 0, 0)!important;font-weight:900!important'));
assert.ok(!rasiRenderer.includes('rasiPlanetCount>=2'));
assert.ok(!navamsaRenderer.includes('navamsaPlanetCount>=2'));
assert.ok(!bhavaRenderer.includes('bhavaPlanetCount>=2'));
assert.ok(!transitRenderer.includes('transitPlanetCount>=2'));

console.log('Horoscope four-chart, three-plus planet sizing and empty-cell regression: PASS');
