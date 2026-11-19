import assert from 'node:assert/strict';
import {mkdir, writeFile, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const outputDir = fileURLToPath(new URL('../horoscope-chart-planet-layout-smoke-output/', import.meta.url));
const fixture = new URL('../public/horoscope/__horoscope_chart_planet_layout_fixture.html', import.meta.url);
await mkdir(outputDir, {recursive:true});

const signOrder = [11,0,1,2,10,3,9,4,8,7,6,5];
const zodiac = ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const shortNames = ['சூ','சந்','செ','பு'];
const fullNames = ['சூரியன்','சந்திரன்','செவ்வாய்','புதன்'];

function countForSign(sign) {
  if (sign === 0) return 2;
  if (sign === 1) return 3;
  if (sign === 2) return 4;
  return 0;
}
function planetRow(index, withState) {
  let state = '';
  if (withState) {
    state = '<span class="rasi-status-marker status-c">(அ)</span>' +
      '<span class="rasi-status-marker status-r">(வ)</span>' +
      '<span class="rasi-degree transit-degree">18°</span>';
  }
  return '<div class="planet-line"><span class="planet-glyph"><span class="planet-short">' +
    shortNames[index % shortNames.length] + '</span>' + state + '</span></div>';
}
function cell(sign, kind) {
  const count = countForSign(sign);
  const bhava = kind === 'bhava';
  const transit = kind === 'transit';
  const classes = ['south-rasi-cell'];
  if (bhava) classes.push('bhava-rasi-cell');
  if (count >= 3) classes.push('smv-chart-cell-compact');
  if (transit && count >= 3) classes.push('south-rasi-cell-compact');
  let label = '';
  if (bhava) {
    label = '<div class="bhava-cusp"><span class="bhava-house-no">' + roman[sign] + '</span></div>';
  } else {
    label = '<div class="dynamic-rasi-number">' + (sign === 0 ? '' : String(sign + 1)) + '</div>';
  }
  const lagna = !bhava && sign === 0 ? '<div class="lagna">ல</div>' : '';
  const rows = Array.from({length:count}, (_,i)=>planetRow(i,kind === 'rasi' || transit)).join('');
  return '<div class="' + classes.join(' ') + '" data-chart-planet-count="' + count +
    '" data-transit-planet-count="' + count + '">' + label + lagna +
    (transit ? '<div class="transit-cell-planets">' + rows + '</div>' : rows) + '</div>';
}
function chart(id, kind) {
  const classes = kind === 'transit' ? 'south-indian-chart transit-chart' : 'south-indian-chart';
  const wrapper = kind === 'transit' ? 'transit-card' : '';
  return '<section class="' + wrapper + '">' +
    '<div id="' + id + '" class="' + classes + '">' +
    signOrder.map(sign=>cell(sign,kind)).join('') +
    '</div></section>';
}
function bhavaTable() {
  const rows = Array.from({length:12},(_,i)=>{
    const count = countForSign(i);
    const names = fullNames.slice(0,count).join(',');
    return '<tr><td>' + (i+1) + '</td><td>—</td><td>—</td><td>—</td><td>' +
      zodiac[i] + '</td><td>' + (names || '—') + '</td></tr>';
  }).join('');
  return '<table class="bhava-table"><tbody>' + rows + '</tbody></table>';
}
function resultRoot(id) {
  return '<section id="' + id + '">' +
    chart('rasiChart','rasi') +
    chart('navamsaChart','navamsa') +
    chart('transitChart','transit') +
    chart('bhavaChart','bhava') +
    bhavaTable() +
    '</section>';
}
const html = [
  '<!doctype html><html lang="ta"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link rel="stylesheet" href="horoscope.css">',
  '<link rel="stylesheet" href="chart-style.css">',
  '<script defer src="chart-style.js"></script>',
  '</head><body class="smv-v12-theme"><main>',
  resultRoot('tamilHoroscopeResult'),
  resultRoot('englishHoroscopeResult'),
  '</main></body></html>'
].join('');
await writeFile(fixture,html,'utf8');

const browser = await puppeteer.launch({
  args:chromium.args,
  executablePath:await chromium.executablePath(),
  headless:true
});
try {
  const page = await browser.newPage();
  for (const width of [390,768,1280]) {
    await page.setViewport({width,height:1000,deviceScaleFactor:1});
    await page.goto(fixture.href,{waitUntil:'load'});
    for (const language of ['ta','en']) {
      await page.evaluate(lang=>{document.documentElement.lang=lang;},language);
      for (const style of ['south','north','east']) {
        await page.evaluate(value=>{
          if (!window.SMVChartPresentationV342) throw new Error('Horoscope chart presentation module did not load.');
          window.SMVChartPresentationV342.setStyle(value);
        },style);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const state = await page.evaluate(({style,language})=>{
          const reports = [];
          const kinds = ['rasi','navamsa','transit','bhava'];
          for (const rootId of ['tamilHoroscopeResult','englishHoroscopeResult']) {
            const root = document.getElementById(rootId);
            for (const kind of kinds) {
              const chartId = kind === 'transit' ? 'transitChart' : kind + 'Chart';
              const chart = root.querySelector('#' + chartId);
              const selector = style === 'south' ? ':scope > .south-rasi-cell' : ':scope > .smv-v342-cell';
              const cells = [...chart.querySelectorAll(selector)];
              const cellCount = node => Number(node.getAttribute('data-chart-planet-count') || 0);
              const picked = {};
              for (const target of [2,3,4]) {
                const cell = cells.find(node=>cellCount(node) === target);
                if (!cell) {
                  picked[target] = {missing:true};
                  continue;
                }
                const line = cell.querySelector(style === 'south' ? '.planet-line' : '.smv-v342-planets .planet-line');
                const glyph = cell.querySelector(style === 'south' ? '.planet-glyph' : '.smv-v342-planets .planet-glyph');
                const number = cell.querySelector('.dynamic-rasi-number,.bhava-house-no,.smv-v342-house-number,.smv-v342-sign-number,.smv-v342-asc,.lagna');
                const degree = cell.querySelector('.planet-degree,.rasi-degree,.transit-degree');
                const marker = cell.querySelector('.rasi-status-marker,.status-c,.status-r');
                const px = element => element ? parseFloat(getComputedStyle(element).fontSize) : null;
                const cellRect = cell.getBoundingClientRect();
                const watched = [...cell.querySelectorAll('.planet-line,.planet-glyph,.rasi-status-marker,.planet-degree,.rasi-degree,.transit-degree,.dynamic-rasi-number,.bhava-house-no,.smv-v342-sign-number,.smv-v342-house-number,.smv-v342-asc')];
                const outside = watched.filter(element=>{
                  const rect = element.getBoundingClientRect();
                  return rect.width > 0 && (rect.left < cellRect.left - 1 || rect.right > cellRect.right + 1);
                }).map(element=>{
                  const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
                  return {
                    tag:element.tagName,classes:element.className,text:element.textContent.trim(),
                    left:Math.round(rect.left*10)/10,right:Math.round(rect.right*10)/10,width:Math.round(rect.width*10)/10,
                    cellLeft:Math.round(cellRect.left*10)/10,cellRight:Math.round(cellRect.right*10)/10,cellWidth:Math.round(cellRect.width*10)/10,
                    display:style.display,whiteSpace:style.whiteSpace,fontSize:style.fontSize,
                    widthStyle:style.width,minWidth:style.minWidth,maxWidth:style.maxWidth,
                    overflowWrap:style.overflowWrap,wordBreak:style.wordBreak,flexShrink:style.flexShrink
                  };
                });
                const sizes = [line,glyph,number,degree,marker].filter(Boolean).map(px);
                const colors = [...cell.querySelectorAll('.planet-glyph')].map(element=>getComputedStyle(element).color);
                picked[target] = {
                  compact:cell.classList.contains('smv-chart-cell-compact'),
                  lineSize:px(line),
                  glyphSize:px(glyph),
                  numberSize:px(number),
                  degreeSize:px(degree),
                  markerSize:px(marker),
                  equalSizes:sizes.length < 2 || Math.max(...sizes)-Math.min(...sizes) < 0.6,
                  names:[...cell.querySelectorAll('.planet-glyph')].map(element=>element.textContent.trim()),
                  colors,
                  outside,
                  scrollWidth:cell.scrollWidth,
                  clientWidth:cell.clientWidth,
                  scrollHeight:cell.scrollHeight,
                  clientHeight:cell.clientHeight
                };
              }
              const emptyCells = cells.filter(cell=>cellCount(cell) === 0);
              const emptyDash = emptyCells.some(cell=>!!cell.querySelector('.smv-v342-empty'));
              const eastHouseNumbers = style==='east' ? cells.map(cell=>({
                house:Number(cell.dataset.house||0),
                displayed:cell.querySelector('.smv-v342-house-number')?.textContent.trim()||'',
                fixedSignNumber:!!cell.querySelector('.smv-v342-sign-number')
              })) : [];
              reports.push({rootId,kind,style,cells:cells.length,picked,emptyDash,eastHouseNumbers});
            }
          }
          return {viewport:innerWidth,language,reports};
        },{style,language});
        for (const item of state.reports) {
          assert.equal(item.cells,12,item.rootId+' '+item.kind+' '+style+': all twelve chart boxes must remain present.');
          const two = item.picked[2];
          const three = item.picked[3];
          const four = item.picked[4];
          for (const entry of [[2,two],[3,three],[4,four]]) {
            const count = entry[0];
            const value = entry[1];
            assert.ok(!value.missing,item.rootId+' '+item.kind+' '+style+': '+count+' planet test cell must exist.');
            assert.equal(value.names.length,count,item.rootId+' '+item.kind+' '+style+': planet rows/names remain intact for '+count+' planets.');
            assert.ok(value.colors.every(color=>color && color!=='rgba(0, 0, 0, 0)'),item.rootId+' '+item.kind+' '+style+': planet colours remain visible.');
            assert.equal(value.outside.length,0,item.rootId+' '+item.kind+' '+style+': chart text stays inside its box: '+JSON.stringify(value.outside));
          }
          assert.equal(two.compact,false,item.rootId+' '+item.kind+' '+style+': a two-planet cell keeps normal sizing.');
          assert.equal(three.compact,true,item.rootId+' '+item.kind+' '+style+': a three-planet cell compacts locally.');
          assert.equal(four.compact,true,item.rootId+' '+item.kind+' '+style+': a four-planet cell compacts locally.');
          assert.ok(three.lineSize < two.lineSize,item.rootId+' '+item.kind+' '+style+': three-planet rows are smaller than two-planet rows.');
          assert.ok(four.lineSize < three.lineSize,item.rootId+' '+item.kind+' '+style+': four-planet rows shrink further than three-planet rows.');
          assert.equal(three.equalSizes,true,item.rootId+' '+item.kind+' '+style+': planet, number, degree and status labels share one cell size.');
          assert.equal(four.equalSizes,true,item.rootId+' '+item.kind+' '+style+': all crowded-cell labels share one cell size.');
          if (item.kind==='navamsa' || item.kind==='bhava') {
            assert.equal(item.emptyDash,false,item.rootId+' '+item.kind+' '+style+': empty planet cells stay blank.');
          } else if (style!=='south') {
            assert.equal(item.emptyDash,true,item.rootId+' '+item.kind+' '+style+': Rasi and Transit retain their alternate-layout empty dash.');
          }
          if(style==='east'&&item.kind==='bhava'){
            assert.equal(item.eastHouseNumbers.length,12,item.rootId+' East Bhava must show all twelve house numbers.');
            for(const number of item.eastHouseNumbers){
              assert.ok(number.house>=1&&number.house<=12,item.rootId+' East Bhava cell must have a Lagna-based house number.');
              assert.equal(number.displayed,String(number.house),item.rootId+' East Bhava must display Arabic 1–12 based on Lagna.');
              assert.equal(number.fixedSignNumber,false,item.rootId+' East Bhava must not add a duplicate fixed sign number.');
            }
          }
          if(style==='east'&&item.kind!=='bhava'){
            assert.ok(item.eastHouseNumbers.every(number=>number.displayed===String(number.house)),item.rootId+' East '+item.kind+' must retain its existing Lagna-based house numbers.');
            assert.ok(item.eastHouseNumbers.every(number=>number.fixedSignNumber),item.rootId+' East '+item.kind+' must retain its existing sign-number labels unchanged.');
          }
        }
        const image = join(outputDir,'horoscope-'+style+'-'+language+'-'+width+'.png');
        await page.screenshot({path:image,fullPage:true});
        console.log('HOROSCOPE CHART SIZING',JSON.stringify({viewport:width,language,style,checks:state.reports.length}));
      }
    }
  }
} finally {
  await browser.close();
  await unlink(fixture).catch(()=>{});
}
console.log('Horoscope South/North/East four-chart responsive sizing and containment: PASS');
