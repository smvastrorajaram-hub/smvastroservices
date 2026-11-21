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
assert.ok(transitRenderer.includes('planet-line transit-lagna-line'),'Transit Lagna is emitted inside the same planet-flow as the scaled planet rows.');
assert.ok(transitRenderer.includes('data-transit-lagna="true"'),'Transit Lagna is rendered as a normal planet-short label instead of a fixed-size standalone node.');
assert.ok(chartStyleJs.includes("const DEVANAGARI_SIGNS=['१','२','३','४','५','६','७','८','९','१०','११','१२'];"),'North Indian charts use a complete Devanagari 1–12 sign sequence.');
assert.ok(chartStyleJs.includes("if(style==='north'&&['d1','d9','transit','bhava'].includes(kind))"),'North Indian Rasi, Navamsa, Transit and Bhava display Rasi-based Devanagari sign numbers.');
assert.ok(chartStyleJs.includes("if(!chart.closest('#tamilHoroscopeResult'))return;"),'Only the Tamil South Bhava result normalizes legacy house labels; English remains untouched.');
assert.ok(chartStyleJs.includes("if(house===1&&kind!=='transit')"),'Alternate layouts must not add a second Lagna outside the source Transit planet-flow.');

assert.ok(chartStyleJs.includes("const kind=chart.id==='bhavaChart'?'bhava':chart.id==='navamsaChart'?'d9':chart.id==='rasiChart'?'d1':'transit';"));
assert.ok(chartStyleJs.includes("const houseNumber=value=>"),'Bhava house parsing accepts both 1–12 and I–XII source labels.');
assert.ok(chartStyleJs.includes("if(/^\\d{1,2}$/.test(raw))"),'Numeric Bhava labels 1–12 are recognized before Roman conversion.');
assert.ok(chartStyleJs.includes("normalizeSouthBhavaHouseLabels(chart)"),'South Bhava display normalizes Arabic house values to Roman numerals without changing source calculations.');
assert.ok(chartStyleJs.includes('function observeTamilBhavaLabels(root){'),'Tamil Bhava labels have a DOM-boundary guard for reports restored after page startup.');
assert.ok(chartStyleJs.includes("observer.observe(root,{subtree:true,childList:true,characterData:true});"),'Late saved-report DOM insertion and text replacement are watched without changing calculation data.');
assert.ok(chartStyleJs.includes('observeTamilBhavaLabels(r);'),'The Tamil/English result roots install the label guard when the chart presentation module starts.');
assert.ok(chartStyleJs.includes('if(label.textContent.trim()!==roman)label.textContent=roman;'),'The Roman normalizer avoids writing unchanged labels and cannot self-trigger indefinitely.');

assert.ok(chartStyleJs.includes("houseNumber(label.dataset.bhavaHouse)||houseNumber(label.textContent)"),'North/East mapping recognizes the original calculated house ID and legacy Roman labels.');
assert.ok(chartStyleJs.includes("const explicitSign=Number(label.dataset.bhavaSign);"),'North/East mapping reads the original calculated Sphuta Rasi for each house.');
assert.ok(chartStyleJs.includes("const bhavaLabel=kind==='bhava'?bhavaHousesBySign[sign].map(romanHouse).join(' / '):'';"),'Every East Bhava house label is grouped by its Sphuta Rasi.');
assert.ok(chartStyleJs.includes("const mapped=new Set(from.cusp.flat())"),'North Bhava validates complete source house coverage rather than requiring one cusp per Rasi.');
assert.ok(chartStyleJs.includes("line.hasAttribute('data-bhava-house')"),'North Bhava fallback preserves each source planet’s already-calculated Bhava assignment.');
assert.ok(horoscopeJs.includes('data-bhava-house="${n}" data-bhava-sign="${si+1}"'),'Bhava rendering preserves its already-calculated house and Sphuta Rasi as display metadata only.');
assert.match(chartStyleJs,/kind==='bhava'\s*\?\s*signByBhavaHouse\.get\(house\)/,'North Bhava sign numbers come from the calculated Sphuta Rasi in each house cell, not from Lagna-relative numbering.');
assert.ok(chartStyleJs.includes("roots().forEach(r=>{")&&chartStyleJs.includes("apply(r,choice);")&&chartStyleJs.includes("observeTamilBhavaLabels(r);"),'Existing saved result markup is presented and Tamil Bhava Roman protection is installed when the chart module starts.');
assert.ok(/render\(d\);[\s\S]{0,500}?window\.SMVChartPresentationV342\?\.apply\(resultBox\);/.test(horoscopeJs),'Every core/basic horoscope render immediately applies chart presentation; comments between the render and apply calls do not weaken this requirement.');
assert.ok(chartStyleJs.includes("chart.classList.contains('transit-chart')"),'Transit detection also covers production charts without a fixture ID.');
assert.ok(chartStyleJs.includes("arr.out[si]?.querySelector('[data-transit-lagna]')"),'North/East chart conversion locates Transit Lagna from its source graha-flow row.');
assert.ok(chartStyleJs.includes("const planetCount=kind==='transit'?items.filter(item=>!item.querySelector('[data-transit-lagna]')).length:items.length;"),'Transit Lagna is excluded from the graha count used for density thresholds.');
assert.ok(chartStyleJs.includes("const triangleCell=style==='north'?[2,3,5,6,8,9,11,12].includes(house):style==='east'?[2,3,5,6,8,9,11,12].includes(sign+1):false;"));
assert.ok(chartStyleJs.includes("if(triangleCell)cell.classList.add('smv-v342-triangle-cell');"));
assert.ok(chartStyleJs.includes("if(!['north','east'].includes(style)||!['d1','d9','bhava'].includes(kind))return;"));
assert.ok(chartStyleJs.includes("if(isBlack(getComputedStyle(glyph).color))glyph.classList.add('smv-v342-black-planet-text');"));
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-north .smv-v342-planets .planet-glyph.smv-v342-black-planet-text'));
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-east .smv-v342-planets .planet-glyph.smv-v342-black-planet-text'));
assert.ok(chartStyleCss.includes('color:rgb(224,0,0)!important;'));
assert.doesNotMatch(chartStyleCss,/smv-v342-black-planet-text[^{]*\{[^}]*-webkit-text-fill-color/s,'Explicit child planet colours must remain intact.');
assert.ok(chartStyleJs.includes('cell.dataset.chartPlanetCount=String(planetCount);'));
assert.ok(chartStyleJs.includes("if(planetCount>=3)cell.classList.add('smv-chart-cell-compact')"));
assert.ok(chartStyleJs.includes("else if(kind==='transit'){"), 'Only North/East Transit empty cells keep the dash; Rasi cells stay blank.');
assert.ok(chartStyleJs.includes("m.className='smv-v342-empty';m.textContent='—'"));
assert.ok(chartStyleJs.includes("if(kind==='bhava'){"), 'Only Bhava alternate layouts render house labels.');
assert.ok(!chartStyleJs.includes("function appendBhavaHouseLabels(chart,style,housesBySign){"), 'Bhava house numbers are not chart-level floating overlays.');
assert.ok(!chartStyleJs.includes("smv-v342-bhava-house-label"), 'No floating label layer can cover a planet name.');
assert.ok(chartStyleJs.includes("if(kind==='bhava')cell.classList.add('smv-v342-bhava-cell');"), 'North/East Bhava cells carry a presentation-only label class.');
assert.ok(chartStyleJs.includes("if(kind==='bhava'&&String(bhavaHouseLabel||'').trim()){"), 'Each Bhava house label is inserted inside its own chart cell.');
assert.ok(chartStyleJs.includes("label.className='smv-v342-house-number';"), 'Roman house labels use the normal in-cell number row.');
assert.ok(chartStyleJs.includes("label.dataset.bhavaRoman=label.textContent;"), 'Original Roman labels are stored before the translation dictionary runs.');
assert.ok(chartStyleJs.includes('roots().forEach(restoreRomanBhavaLabels);'), 'Original Roman labels are restored after a result-language toggle.');
assert.ok(chartStyleJs.includes('function restoreRomanBhavaLabels(root){'), 'Live and saved Bhava labels have a dedicated language-safe restore path.');
assert.ok(chartStyleJs.includes("const bhavaLabel=kind==='bhava'?bhavaHousesBySign[sign].map(romanHouse).join(' / '):'';"), 'East Bhava renders every house mapped to a Sphuta Rasi inside that sign cell.');
assert.ok(chartStyleCss.includes('.smv-v342-cell.smv-v342-bhava-cell.smv-v342-triangle-cell .smv-v342-house-number{'));
assert.ok(chartStyleCss.includes('position:static!important;transform:none!important;'), 'Bhava Roman labels stay in normal cell flow and cannot float over planet rows.');
assert.ok(chartStyleCss.includes('color:#6f4d2c!important;'), 'Bhava Roman labels use readable high-contrast text.');
assert.ok(chartStyleJs.includes("const lagna=kind==='bhava'?-1:ascSign(chart,from);"), 'Bhava alternate layouts do not depend on a Lagna lookup to render.');
assert.ok(chartStyleJs.includes("const sign=kind==='bhava'?(bhavaSignByHouse[house]>=0?bhavaSignByHouse[house]:(bhava?.sign??-1)):(lagna+house-1)%12;"), 'North Bhava maps all twelve house slots through the already-calculated Sphuta Rasi metadata.');
assert.ok(chartStyleJs.includes("const explicit=from.bhavaSignByHouse?.[house];"), 'North/East layout prioritizes the source Bhava-house-to-Rasi mapping.');
assert.ok(chartStyleJs.includes("const bhavaSignByHouse=Array(13).fill(-1);"), 'The mapping retains one explicit destination sign for every Bhava house.');
assert.ok(chartStyleJs.includes("const house=kind==='bhava'?0:(sign-lagna+12)%12+1;"), 'East Bhava positioning is independent of Lagna.');
assert.ok(!chartStyleJs.includes("if(kind!=='bhava'&&style!=='east')cell.append(number);"), 'North/East Rasi, Navamsa and Transit do not render numeric sign labels.');
assert.ok(chartStyleJs.includes("const bhavaRows=kind==='bhava'?readBhavaTable(chart,isTa()):null;"), 'North and East both read the same authoritative Bhava Table mapping.');
assert.ok(chartStyleJs.includes('const bhavaHousesBySign=Array.from({length:12},()=>[]);'));
assert.ok(chartStyleJs.includes('bhavaHousesBySign[mapped].push(house);'), 'Each Bhava Roman numeral is placed in its mapped Sphuta Rasi cell.');
assert.ok(!chartStyleJs.includes("h.textContent=house>=1&&house<=12?String(house):'';"), 'East Rasi, Navamsa and Transit do not render numeric house labels.');

const horoscopeCountRules = horoscopeCss.split('\n').filter(line=>/^#tamilHoroscopeResult \.south-rasi-cell\[data-chart-planet-count="\d+"\],#englishHoroscopeResult \.south-rasi-cell\[data-chart-planet-count="\d+"\]\{/.test(line.trim()));
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
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-north .smv-v342-cell.smv-v342-triangle-cell{width:20%!important;max-height:18%!important}'));
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-east .smv-v342-cell.smv-v342-triangle-cell{width:18%!important;max-height:20%!important}'));
assert.ok(chartStyleCss.includes('.smv-v342-cell.smv-v342-triangle-cell .smv-v342-planets .planet-line{'));
assert.ok(chartStyleCss.includes('.smv-v342-cell.smv-v342-triangle-cell .smv-v342-planets .planet-glyph{'));
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-north .smv-v342-cell.smv-chart-cell-compact .smv-v342-planets .planet-line,'));
assert.ok(chartStyleCss.includes('.south-indian-chart.smv-v342-east .smv-v342-cell.smv-chart-cell-compact .smv-v342-planets .planet-glyph *{'));
assert.ok(chartStyleCss.includes('white-space:nowrap!important;max-width:none!important;'));
assert.ok(chartStyleCss.includes('min-height:0!important;height:auto!important;padding:0!important;margin:0!important;gap:0!important;font-size:inherit!important;'));
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

const inCellBhavaLabels = chartStyleCss.slice(
  chartStyleCss.indexOf('/* Bhava-only Roman labels are the first in-cell row'),
);
assert.ok(inCellBhavaLabels.includes('.south-indian-chart.smv-v342-north .smv-v342-cell.smv-v342-bhava-cell.smv-v342-triangle-cell .smv-v342-house-number'));
assert.ok(inCellBhavaLabels.includes('.south-indian-chart.smv-v342-east .smv-v342-cell.smv-v342-bhava-cell.smv-v342-triangle-cell .smv-v342-house-number'));
assert.ok(inCellBhavaLabels.includes('position:static!important;transform:none!important;'),
  'Bhava labels stay in the normal cell flow and cannot overlap planet names.');
assert.ok(inCellBhavaLabels.includes('color:#6f4d2c!important;background:#fffdf7!important;'),
  'Roman labels keep high contrast and a readable background inside the Bhava cell.');
assert.ok(inCellBhavaLabels.includes('font-weight:900!important;line-height:1.05!important;'));

assert.ok(horoscopeJs.includes("ta?'பாவகக் கட்டம்':'Bhava Chart'"),'Bhava chart heading follows the selected report language.');
assert.ok(horoscopeJs.includes("ta?'📋 பாவ அட்டவணை':'📋 Bhava Table'"),'Bhava table heading follows the selected report language.');
assert.ok(horoscopeJs.includes("cuspLabel(b.arambhaLongitude,b.arambha)")&&horoscopeJs.includes("cuspLabel(b.antyaLongitude,b.antya)"),'Bhava boundaries display the sign belonging to each full cusp longitude, preventing same-degree ambiguity across adjacent signs.');
assert.ok(horoscopeJs.includes("ta?'ஆரம்பம்':'Start'")&&horoscopeJs.includes("ta?'கிரகங்கள்':'Planets'"),'Bhava table column headings follow the selected report language.');
assert.ok(chartStyleCss.includes('V348: keep dense North-Indian Bhava labels and grahas in separate, bounded rows.'),'North Bhava dense-cell collision fix is present.');

console.log('Horoscope four-chart, three-plus planet sizing and empty-cell regression: PASS');
