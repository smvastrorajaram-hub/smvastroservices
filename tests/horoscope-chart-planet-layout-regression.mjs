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

for (let count=3;count<=12;count++) {
  assert.ok(horoscopeCss.includes('.south-rasi-cell[data-chart-planet-count="' + count + '"]'));
  assert.ok(chartStyleCss.includes('.smv-v342-cell[data-chart-planet-count="' + count + '"]'));
}
assert.ok(horoscopeCss.includes('--smv-chart-compact-font-size'));
assert.ok(horoscopeCss.includes('--smv-chart-compact-white-space'));
assert.ok(horoscopeCss.includes('.south-rasi-cell.smv-chart-cell-compact .planet-line'));
assert.ok(chartStyleCss.includes('.smv-v342-cell.smv-chart-cell-compact .smv-v342-planets'));
assert.ok(chartStyleCss.includes('overflow:hidden;display:flex;flex-direction:column;'));
assert.ok(chartStyleCss.includes('.smv-v342-cell{font-size:var(--smv-chart-compact-font-size,'));

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
