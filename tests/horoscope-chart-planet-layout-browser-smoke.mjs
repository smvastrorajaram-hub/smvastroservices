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
const devanagari = ['१','२','३','४','५','६','७','८','९','१०','११','१२'];
const compartmentPolygons = {
  north: {
    1:[[50,0],[75,25],[50,50],[25,25]], 2:[[0,0],[50,0],[25,25]], 3:[[0,0],[0,50],[25,25]],
    4:[[0,50],[25,25],[50,50],[25,75]], 5:[[0,50],[0,100],[25,75]], 6:[[0,100],[50,100],[25,75]],
    7:[[50,50],[75,75],[50,100],[25,75]], 8:[[50,100],[100,100],[75,75]], 9:[[100,100],[100,50],[75,75]],
    10:[[50,50],[75,25],[100,50],[75,75]], 11:[[100,0],[100,50],[75,25]], 12:[[50,0],[100,0],[75,25]]
  },
  east: {
    1:[[33.333,0],[66.667,0],[66.667,33.333],[33.333,33.333]],
    2:[[0,0],[33.333,0],[33.333,33.333]], 3:[[0,0],[0,33.333],[33.333,33.333]],
    4:[[0,33.333],[33.333,33.333],[33.333,66.667],[0,66.667]],
    5:[[0,66.667],[0,100],[33.333,66.667]], 6:[[0,100],[33.333,100],[33.333,66.667]],
    7:[[33.333,66.667],[66.667,66.667],[66.667,100],[33.333,100]],
    8:[[66.667,66.667],[100,100],[66.667,100]], 9:[[100,66.667],[100,100],[66.667,66.667]],
    10:[[66.667,33.333],[100,33.333],[100,66.667],[66.667,66.667]],
    11:[[100,0],[100,33.333],[66.667,33.333]], 12:[[66.667,0],[100,0],[66.667,33.333]]
  }
};
const shortNames = ['சூ','சந்','செ','பு','கு','சு','ச','ரா'];
const fullNames = ['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு'];

const bhavaHouseSigns = [0,0,1,2,3,4,5,6,7,8,9,10];
const bhavaPlanetCounts = [2,0,3,4,5,0,0,0,0,0,0,0];
const bhavaHousesBySign = Array.from({length:12},()=>[]);
const bhavaPlanetCountsBySign = Array(12).fill(0);
bhavaHouseSigns.forEach((sign,index)=>{
  bhavaHousesBySign[sign].push(index+1);
  bhavaPlanetCountsBySign[sign] += bhavaPlanetCounts[index];
});
function countForSign(sign) {
  // Put the five-planet fixture in Lagna so the Transit "ல" marker is
  // exercised against the exact same five-plus cell font scale.
  if (sign === 0) return 5;
  if (sign === 1) return 2;
  if (sign === 2) return 3;
  if (sign === 3) return 4;
  return 0;
}
function planetRow(index, withState, bhavaHouse = null) {
  let state = '';
  if (withState) {
    const combustion = index === 0 ? '<span class="status-combust rasi-status-marker status-c">(அ)</span>' : '';
    const retrograde = index === 1 ? '<span class="status-retro rasi-status-marker status-r">(வ)</span>' : '';
    state = combustion + retrograde + '<span class="rasi-degree transit-degree">18°</span>';
  }
  const houseAttribute = bhavaHouse === null ? '' : ' data-bhava-house="' + bhavaHouse + '"';
  return '<div class="planet-line"' + houseAttribute + '><span class="planet-glyph"><span class="planet-short"' + (index === 4 ? ' style="color:rgb(0, 0, 200)"' : '') + '>' +
    shortNames[index % shortNames.length] + '</span>' + state + '</span></div>';
}
function cell(sign, kind, rootId) {
  const bhava = kind === 'bhava';
  const count = bhava ? bhavaPlanetCountsBySign[sign] : countForSign(sign);
  const transit = kind === 'transit';
  const classes = ['south-rasi-cell'];
  if (bhava) classes.push('bhava-rasi-cell');
  if (count >= 3) classes.push('smv-chart-cell-compact');
  if (transit && count >= 3) classes.push('south-rasi-cell-compact');
  let label = '';
  if (bhava) {
    label = bhavaHousesBySign[sign].map(house=>
      '<div class="bhava-cusp"><span class="bhava-house-no" data-bhava-house="' + house + '">' + (rootId === 'tamilHoroscopeResult' ? String(house) : roman[house-1]) + '</span></div>'
    ).join('');
  } else {
    label = '<div class="dynamic-rasi-number">' + (sign === 0 ? '' : String(sign + 1)) + '</div>';
  }
  const lagna = !bhava && sign === 0 ? '<div class="lagna">ல</div>' : '';
  const transitLagna = transit && sign === 0
    ? '<div class="planet-line transit-lagna-line"><span class="planet-glyph"><span class="planet-short" data-transit-lagna="true">ல</span></span></div>'
    : '';
  const rows = bhava
    ? bhavaHousesBySign[sign].reduce((items,house,index)=>{
        const planetCount=bhavaPlanetCounts[house-1];
        items.push(...Array.from({length:planetCount},(_,i)=>planetRow(i,false,house)));
        return items;
      },[]).join('')
    : Array.from({length:count}, (_,i)=>planetRow(i,kind === 'rasi' || transit)).join('');
  return '<div class="' + classes.join(' ') + '" data-chart-planet-count="' + count +
    '" data-transit-planet-count="' + count + '">' + label + (transit ? '<div class="transit-cell-planets">' + transitLagna + rows + '</div>' : lagna + rows) + '</div>';
}
function chart(id, kind, rootId) {
  const classes = kind === 'transit' ? 'south-indian-chart transit-chart' : 'south-indian-chart';
  const wrapper = kind === 'transit' ? 'transit-card' : '';
  return '<section class="' + wrapper + '">' +
    '<div id="' + id + '" class="' + classes + '">' +
    signOrder.map(sign=>cell(sign,kind,rootId)).join('') +
    '</div></section>';
}
function bhavaTable() {
  const rows = Array.from({length:12},(_,i)=>{
    const sign = bhavaHouseSigns[i];
    const count = bhavaPlanetCounts[i];
    const names = fullNames.slice(0,count).join(',');
    return '<tr><td>' + (i+1) + '</td><td>—</td><td>—</td><td>—</td><td>' +
      zodiac[sign] + '</td><td>' + (names || '—') + '</td></tr>';
  }).join('');
  return '<table class="bhava-table"><tbody>' + rows + '</tbody></table>';
}
function resultRoot(id) {
  return '<section id="' + id + '">' +
    chart('rasiChart','rasi') +
    chart('navamsaChart','navamsa') +
    chart('transitChart','transit') +
    chart('bhavaChart','bhava') +
    (id === 'tamilHoroscopeResult' ? bhavaTable() : '') +
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
        const state = await page.evaluate(({style,language,signOrder,compartmentPolygons})=>{
          const reports = [];
          const kinds = ['rasi','navamsa','transit','bhava'];
          for (const rootId of ['tamilHoroscopeResult','englishHoroscopeResult']) {
            const root = document.getElementById(rootId);
            for (const kind of kinds) {
              const chartId = kind === 'transit' ? 'transitChart' : kind + 'Chart';
              const chart = root.querySelector('#' + chartId);
              const selector = style === 'south' ? ':scope > .south-rasi-cell' : ':scope > .smv-v342-cell';
              const cells = [...chart.querySelectorAll(selector)];
              const chartRect = chart.getBoundingClientRect();
              const cellBoundsOutside = cells.filter(cell=>{const rect=cell.getBoundingClientRect();return rect.left<chartRect.left-1||rect.right>chartRect.right+1||rect.top<chartRect.top-1||rect.bottom>chartRect.bottom+1;}).map(cell=>{const rect=cell.getBoundingClientRect();return {className:cell.className,house:cell.dataset.house||'',sign:cell.dataset.sign||'',left:Math.round(rect.left*10)/10,right:Math.round(rect.right*10)/10,top:Math.round(rect.top*10)/10,bottom:Math.round(rect.bottom*10)/10,chartLeft:Math.round(chartRect.left*10)/10,chartRight:Math.round(chartRect.right*10)/10,chartTop:Math.round(chartRect.top*10)/10,chartBottom:Math.round(chartRect.bottom*10)/10,chartWidth:Math.round(chartRect.width*10)/10,chartHeight:Math.round(chartRect.height*10)/10};});

              const compartmentOutside = style==='south' ? [] : cells.flatMap(cell=>{
                const compartment=style==='north'?Number(cell.dataset.house||0):Number(cell.dataset.sign||0);
                const polygon=compartmentPolygons[style]?.[compartment];
                if(!polygon)return [{compartment,reason:'missing polygon'}];
                const area=polygon.reduce((sum,[x1,y1],index)=>{
                  const [x2,y2]=polygon[(index+1)%polygon.length];return sum+x1*y2-x2*y1;
                },0);
                const orientation=Math.sign(area)||1;
                const inside=point=>polygon.every(([x1,y1],index)=>{
                  const [x2,y2]=polygon[(index+1)%polygon.length];
                  const cross=(x2-x1)*(point[1]-y1)-(y2-y1)*(point[0]-x1);
                  return orientation>0?cross>=-0.8:cross<=0.8;
                });
                const watched=[...cell.querySelectorAll('.planet-line,.planet-glyph,.rasi-status-marker,.planet-degree,.rasi-degree,.transit-degree,.smv-v342-sign-number,.smv-v342-house-number,.smv-v342-asc')];
                return watched.flatMap(element=>{
                  const rect=element.getBoundingClientRect();
                  if(!rect.width||!rect.height)return [];
                  const corners=[[rect.left,rect.top],[rect.right,rect.top],[rect.left,rect.bottom],[rect.right,rect.bottom]]
                    .map(([x,y])=>[(x-chartRect.left)/chartRect.width*100,(y-chartRect.top)/chartRect.height*100]);
                  const outside=corners.filter(point=>!inside(point));
                  return outside.length?[{compartment,cellClass:cell.className,tag:element.tagName,classes:element.className,text:element.textContent.trim(),outsideCorners:outside.map(p=>p.map(v=>Math.round(v*10)/10))}]:[];
                });
              });

              const cellCount = node => Number(node.getAttribute('data-chart-planet-count') || 0);
              const picked = {};
              for (const target of [2,3,4,5]) {
                const cell = cells.find(node=>cellCount(node) === target);
                if (!cell) {
                  picked[target] = {missing:true};
                  continue;
                }
                const line = cell.querySelector(style === 'south' ? '.planet-line' : '.smv-v342-planets .planet-line');
                const glyph = cell.querySelector(style === 'south' ? '.planet-glyph' : '.smv-v342-planets .planet-glyph');
                const number = kind==='transit' ? cell.querySelector('[data-transit-lagna]') : style==='north' ? (cell.querySelector('.smv-v342-sign-number,.smv-v342-house-number') || cell.querySelector('.lagna,.smv-v342-asc,.dynamic-rasi-number,.bhava-house-no')) : (cell.querySelector('.lagna,.smv-v342-asc') || cell.querySelector('.dynamic-rasi-number,.bhava-house-no'));
                const degree = cell.querySelector('.planet-degree,.rasi-degree,.transit-degree');
                const marker = cell.querySelector('.status-combust,.rasi-status-marker.status-c,.status-c');
                const retroMarker = cell.querySelector('.status-retro,.rasi-status-marker.status-r,.status-r');
                const px = element => element ? parseFloat(getComputedStyle(element).fontSize) : null;
                const cellRect = cell.getBoundingClientRect();
                const watched = [...cell.querySelectorAll('.planet-line,.planet-glyph,.rasi-status-marker,.planet-degree,.rasi-degree,.transit-degree,.dynamic-rasi-number,.bhava-house-no,.smv-v342-sign-number,.smv-v342-house-number,.smv-v342-asc')];
                const outside = watched.filter(element=>{
                  const rect = element.getBoundingClientRect();
                  return rect.width > 0 && (rect.left < cellRect.left - 1 || rect.right > cellRect.right + 1);
                }).map(element=>{
                  const rect=element.getBoundingClientRect(),style=getComputedStyle(element);
                  return {
                    tag:element.tagName,classes:element.className,text:element.textContent.trim(),cellClass:cell.className,glyphMatchesCompact:element.matches('.smv-v342-cell.smv-chart-cell-compact .smv-v342-planets .planet-glyph'),ancestors:[element.parentElement?.className,element.parentElement?.parentElement?.className,element.parentElement?.parentElement?.parentElement?.className],
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
                  cellFontSize:px(cell),
                  lineSize:px(line),
                  glyphSize:px(glyph),
                  numberSize:px(number),
                  degreeSize:px(degree),
                  markerSize:px(marker),
                  retroMarkerSize:px(retroMarker),
                  markerText:marker?.textContent.trim()||'',
                  retroMarkerText:retroMarker?.textContent.trim()||'',
                  degreeText:degree?.textContent.trim()||'',
                  numberText:number?.textContent.trim()||'',
                  numberBackgroundColor:number?getComputedStyle(number).backgroundColor:null,
                  numberZIndex:number?getComputedStyle(number).zIndex:null,
                  equalSizes:sizes.length < 2 || Math.max(...sizes)-Math.min(...sizes) < 0.6,
                  names:[...cell.querySelectorAll('.planet-glyph')].filter(element=>!element.querySelector('[data-transit-lagna]')).map(element=>element.textContent.trim()),
                  colors,
                  outside,
                  scrollWidth:cell.scrollWidth,
                  clientWidth:cell.clientWidth,
                  scrollHeight:cell.scrollHeight,
                  clientHeight:cell.clientHeight
                };
              }
              const planetGlyphColors = [...chart.querySelectorAll(style==='south'?'.planet-glyph':'.smv-v342-planets .planet-glyph')].map(glyph=>({
                text:glyph.textContent.trim(),
                marked:glyph.classList.contains('smv-v342-black-planet-text'),
                glyphColor:getComputedStyle(glyph).color,
                visibleTextColor:getComputedStyle(glyph.querySelector('.planet-short')||glyph).color
              }));
              const crowdedLabelNodes = cells
                .filter(cell=>cell.classList.contains('smv-v342-triangle-cell')&&cell.classList.contains('smv-chart-cell-compact'))
                .map(cell=>cell.querySelector('.smv-v342-house-number')).filter(Boolean);
              const crowdedTriangleNumbers = crowdedLabelNodes.map(number=>{
                const rect=number.getBoundingClientRect();
                const overlapsPlanet=[...(number.closest('.smv-v342-cell')?.querySelectorAll('.smv-v342-planets .planet-glyph')||[])].some(glyph=>{
                  const other=glyph.getBoundingClientRect();
                  return rect.width>0&&rect.height>0&&other.width>0&&other.height>0&&
                    rect.left<other.right-0.5&&rect.right>other.left+0.5&&
                    rect.top<other.bottom-0.5&&rect.bottom>other.top+0.5;
                });
                const computed=getComputedStyle(number);
                return {
                  text:number.textContent.trim(),
                  backgroundColor:computed.backgroundColor,
                  zIndex:computed.zIndex,
                  position:computed.position,
                  color:computed.color,
                  overlapsPlanet
                };
              });
              const emptyCells = cells.filter(cell=>cellCount(cell) === 0);
              const emptyDash = emptyCells.some(cell=>!!cell.querySelector('.smv-v342-empty'));
              const numericLabels = cells.reduce((count,cell)=>count+cell.querySelectorAll('.smv-v342-sign-number,.smv-v342-house-number').length,0);
              const signNumberLabels = style==='north'&&kind!=='bhava' ? cells.map(cell=>{
                const el=cell.querySelector('.smv-v342-sign-number');
                if(!el)return {missing:true,sign:Number(cell.dataset.sign||0)};
                const rect=el.getBoundingClientRect(),chartRect=chart.getBoundingClientRect();
                const cellRect=cell.getBoundingClientRect();
                const overlapsPlanet=[...cell.querySelectorAll('.smv-v342-planets .planet-glyph')].some(glyph=>{
                  const other=glyph.getBoundingClientRect();
                  return rect.width>0&&rect.height>0&&other.width>0&&other.height>0&&rect.left<other.right-0.5&&rect.right>other.left+0.5&&rect.top<other.bottom-0.5&&rect.bottom>other.top+0.5;
                });
                const computed=getComputedStyle(el);
                return {sign:Number(cell.dataset.sign||0),text:el.textContent.trim(),fontSize:parseFloat(computed.fontSize),visible:rect.width>0&&rect.height>0&&computed.display!=='none'&&computed.visibility!=='hidden',insideCell:rect.left>=cellRect.left-1&&rect.right<=cellRect.right+1&&rect.top>=cellRect.top-1&&rect.bottom<=cellRect.bottom+1,insideChart:rect.left>=chartRect.left-1&&rect.right<=chartRect.right+1&&rect.top>=chartRect.top-1&&rect.bottom<=chartRect.bottom+1,overlapsPlanet};
              }) : [];
              const describeBhavaLabel=(el,sign,house=0)=>{
                if(!el)return {sign,house,labels:[],labelDetails:[]};
                const rect=el.getBoundingClientRect(),computed=getComputedStyle(el);
                const chartRect=chart.getBoundingClientRect();
                const cell=el.closest('.smv-v342-cell');
                const overlapsPlanet=[...(cell?.querySelectorAll('.smv-v342-planets .planet-glyph')||[])].some(glyph=>{
                  const other=glyph.getBoundingClientRect();
                  return rect.width>0&&rect.height>0&&other.width>0&&other.height>0&&
                    rect.left<other.right-0.5&&rect.right>other.left+0.5&&
                    rect.top<other.bottom-0.5&&rect.bottom>other.top+0.5;
                });
                return {
                  sign,house,labels:el.textContent.trim().split('/').map(label=>label.trim()).filter(Boolean),
                  labelDetails:[{
                    text:el.textContent.trim(),width:rect.width,height:rect.height,
                    visible:rect.width>0&&rect.height>0&&computed.display!=='none'&&computed.visibility!=='hidden'&&Number(computed.opacity)>0,
                    color:computed.color,zIndex:computed.zIndex,backgroundColor:computed.backgroundColor,
                    position:computed.position,overlapsPlanet,
                    insideChart:rect.left>=chartRect.left-1&&rect.right<=chartRect.right+1&&rect.top>=chartRect.top-1&&rect.bottom<=chartRect.bottom+1,
                    left:Math.round(rect.left*10)/10,right:Math.round(rect.right*10)/10,
                    top:Math.round(rect.top*10)/10,bottom:Math.round(rect.bottom*10)/10
                  }]
                };
              };
              const bhavaHouseLabels = kind!=='bhava'?[]:style==='south'
                ? cells.map((cell,index)=>{
                    const nodes=[...cell.querySelectorAll('.bhava-house-no')];
                    const raw=nodes.map(el=>el.textContent.trim());
                    return {
                      sign:signOrder[index],house:0,
                      labels:raw.flatMap(value=>value.split('/').map(label=>label.trim()).filter(Boolean)),
                      labelDetails:nodes.flatMap(el=>describeBhavaLabel(el,signOrder[index]).labelDetails)
                    };
                  })
                : cells.map(cell=>describeBhavaLabel(
                    cell.querySelector('.smv-v342-house-number'),
                    Number(cell.dataset.sign||0)-1,
                    Number(cell.dataset.house||0)
                  ));
              reports.push({rootId,kind,cells:cells.length,chartClass:chart.className,numericLabels,picked,emptyDash,bhavaHouseLabels,cellBoundsOutside,compartmentOutside,triangleCells:cells.filter(cell=>cell.classList.contains('smv-v342-triangle-cell')).length,planetGlyphColors,crowdedTriangleNumbers,signNumberLabels});

            }
          }
          return {viewport:innerWidth,language,reports};
        },{style,language,signOrder,compartmentPolygons});
        for (const item of state.reports) {
          if(item.kind==='bhava')console.log('BHAVA ROMAN DISPLAY',JSON.stringify({rootId:item.rootId,style,labels:item.bhavaHouseLabels}));
          assert.equal(item.cells,12,item.rootId+' '+item.kind+' '+style+': all twelve chart boxes must remain present.');
          const two = item.picked[2];
          const three = item.picked[3];
          const four = item.picked[4];
          const five = item.picked[5];
          for (const entry of [[2,two],[3,three],[4,four],[5,five]]) {
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
          assert.equal(five.compact,true,item.rootId+' '+item.kind+' '+style+': five-planet cells keep the wrapping/containment class.');
          for (const value of [three,four]) {
            assert.ok(Math.abs(value.lineSize-two.lineSize)<0.6,item.rootId+' '+item.kind+' '+style+': three- and four-planet rows keep normal font size.');
            assert.ok(Math.abs(value.glyphSize-two.glyphSize)<0.6,item.rootId+' '+item.kind+' '+style+': three- and four-planet names are not reduced.');
            if(style!=='south'&&value.numberSize!==null)assert.ok(value.numberSize>=9&&value.numberSize<=12,item.rootId+' '+item.kind+' '+style+': in-cell house label retains its dedicated readable 9–12px size.');
          }
          assert.ok(five.lineSize<four.lineSize,item.rootId+' '+item.kind+' '+style+': five-planet rows reduce their font size.');
          assert.ok(five.glyphSize<four.glyphSize,item.rootId+' '+item.kind+' '+style+': five-planet planet names reduce their font size.');
          if(style!=='south'&&five.numberSize!==null&&four.numberSize!==null){
            assert.ok(five.numberSize>=9&&five.numberSize<=12,item.rootId+' '+item.kind+' '+style+': five-planet house label remains readable at its dedicated 9–12px size.');
            assert.ok(Math.abs(five.numberSize-four.numberSize)<0.6,item.rootId+' '+item.kind+' '+style+': house label size is independent of planet-density compaction.');
          }
          if(five.degreeSize!==null&&four.degreeSize!==null)assert.ok(five.degreeSize<four.degreeSize,item.rootId+' '+item.kind+' '+style+': Degree labels reduce only at five planets.');
          if(five.markerSize!==null&&four.markerSize!==null)assert.ok(five.markerSize<four.markerSize,item.rootId+' '+item.kind+' '+style+': combust marker (அ/C) reduces only at five planets.');
          if(five.retroMarkerSize!==null&&four.retroMarkerSize!==null)assert.ok(five.retroMarkerSize<four.retroMarkerSize,item.rootId+' '+item.kind+' '+style+': retrograde marker (வ/R) reduces only at five planets.');
          if(item.kind==='transit'){
            assert.ok(five.numberText==='ல'||five.numberText==='As',item.rootId+' Transit five-planet Lagna cell exposes its Lagna marker.');
            assert.ok(Math.abs(five.numberSize-five.glyphSize)<0.6,item.rootId+' '+style+' Transit Lagna marker uses exactly the same font-size as the planet glyph.');
            assert.ok(five.glyphSize<four.glyphSize,item.rootId+' '+style+' Transit Lagna glyph uses the five-plus planet-flow font size.');
          }
          if(language==='ta'&&['rasi','transit'].includes(item.kind)){
            assert.equal(five.markerText,'(அ)',item.rootId+' Tamil combust marker remains அ.');
            assert.equal(five.retroMarkerText,'(வ)',item.rootId+' Tamil retrograde marker remains வ.');
            assert.equal(five.degreeText,'18°',item.rootId+' Tamil test Degree remains present.');
            assert.ok(five.numberText,item.rootId+' Tamil chart Number remains present.');
          }
          assert.equal(item.cellBoundsOutside.length,0,item.rootId+' '+item.kind+' '+style+': every chart box remains inside the chart boundary: '+JSON.stringify(item.cellBoundsOutside));
          if(style==='south')assert.ok(item.planetGlyphColors.every(glyph=>!glyph.marked),item.rootId+' '+item.kind+': South chart planet colours remain untouched.');
          if(style!=='south'){
            if(['rasi','navamsa','bhava'].includes(item.kind)){
              assert.ok(item.planetGlyphColors.length>0,item.rootId+' '+item.kind+' '+style+': planet glyph color fixtures exist.');
              assert.ok(item.planetGlyphColors.every(glyph=>glyph.marked&&glyph.glyphColor==='rgb(224, 0, 0)'),item.rootId+' '+item.kind+' '+style+': black planet names are turned red.');
              if(['rasi','navamsa'].includes(item.kind)){
                const preserved=item.planetGlyphColors.filter(glyph=>glyph.visibleTextColor==='rgb(0, 0, 200)');
                assert.ok(preserved.length>0,item.rootId+' '+item.kind+' '+style+': an already-coloured planet label keeps its original blue colour.');
              }
            }else{
              assert.ok(item.planetGlyphColors.every(glyph=>!glyph.marked),item.rootId+' '+item.kind+' '+style+': Transit is outside this colour change.');
            }
            assert.equal(item.triangleCells,8,item.rootId+' '+item.kind+' '+style+': exactly the eight corner compartments use triangle-aware layout.');
          if(style!=='south'&&item.kind==='bhava'){
            assert.ok(item.crowdedTriangleNumbers.length>0,item.rootId+' Bhava '+style+': crowded triangle fixtures include a Roman house label.');
            for(const number of item.crowdedTriangleNumbers){
              assert.equal(number.backgroundColor,'rgb(255, 253, 247)',item.rootId+' Bhava '+style+': crowded triangle label has an opaque chart-colour backing ('+number.text+').');
              assert.equal(number.position,'static',item.rootId+' Bhava '+style+': Roman label is an in-cell row, not a floating overlay ('+number.text+').');
              assert.equal(number.color,'rgb(111, 77, 44)',item.rootId+' Bhava '+style+': Roman label keeps high contrast ('+number.text+').');
              assert.equal(number.overlapsPlanet,false,item.rootId+' Bhava '+style+': Roman label never covers a planet name ('+number.text+').');
            }
          }else if(style!=='south'){
            assert.equal(item.crowdedTriangleNumbers.length,0,item.rootId+' '+item.kind+' '+style+': Rasi, Navamsa and Transit have no Bhava-house labels.');
          }
            assert.equal(item.compartmentOutside.length,0,item.rootId+' '+item.kind+' '+style+': planet names, markers, Degrees and numbers remain inside their actual compartment polygons: '+JSON.stringify(item.compartmentOutside));
          }
          if (item.kind==='navamsa' || item.kind==='bhava' || (style!=='south'&&item.kind==='rasi')) {
            assert.equal(item.emptyDash,false,item.rootId+' '+item.kind+' '+style+': empty planet cells stay blank.');
          } else if (style!=='south'&&item.kind==='transit') {
            assert.equal(item.emptyDash,true,item.rootId+' Transit '+style+': existing alternate-layout empty dash is retained.');
          }
          if(style!=='south'){
            assert.ok(item.chartClass.includes('smv-v342-'+style),item.rootId+' '+item.kind+' '+style+': requested alternate layout is actually rendered, not left in South geometry.');
          if(style==='north'&&['rasi','navamsa','transit'].includes(item.kind)){
            assert.equal(item.signNumberLabels.length,12,item.rootId+' '+item.kind+': every sign has one Devanagari label.');
            const sortedSignLabels=[...item.signNumberLabels].sort((a,b)=>a.sign-b.sign);
            assert.deepEqual(sortedSignLabels.map(label=>label.text),devanagari,item.rootId+' '+item.kind+': sign digits follow the actual Rasi numbers 1–12.');
            assert.ok(sortedSignLabels.every(label=>!label.missing&&label.visible&&label.insideCell&&label.insideChart&&!label.overlapsPlanet),item.rootId+' '+item.kind+': sign numbers remain visible, inside their cells and clear of all planet names.');
            const sizes=sortedSignLabels.map(label=>label.fontSize);
            assert.ok(Math.max(...sizes)-Math.min(...sizes)<0.6,item.rootId+' '+item.kind+': all twelve Hindi sign numbers use one consistent font size.');
          }
            if(['rasi','navamsa','transit'].includes(item.kind))assert.equal(item.numericLabels,style==='north'?12:0,item.rootId+' '+item.kind+' '+style+': North has exactly twelve sign labels and East has none.');
          }
          if(item.kind==='bhava'){
            const labels=item.bhavaHouseLabels;
            const allLabels=labels.flatMap(entry=>entry.labels);
            assert.deepEqual([...allLabels].sort((a,b)=>roman.indexOf(a)-roman.indexOf(b)),roman,
              item.rootId+' '+style+' Bhava must display every house I–XII exactly once.');
            for(const entry of labels){
              assert.ok(entry.labelDetails.length>0||entry.labels.length===0,item.rootId+' '+style+' Bhava label nodes exist for every mapped cell.');
              for(const detail of entry.labelDetails){
                assert.ok(detail.visible,item.rootId+' '+style+' Bhava Roman label '+detail.text+' has a visible, non-zero display box.');
                if(style!=='south'){
                  assert.equal(detail.color,'rgb(111, 77, 44)',item.rootId+' '+style+' Bhava Roman label '+detail.text+' uses the high-contrast house-label colour.');
                  assert.equal(detail.backgroundColor,'rgb(255, 253, 247)',item.rootId+' '+style+' Bhava Roman label '+detail.text+' has an opaque backing.');
                  assert.equal(detail.position,'static',item.rootId+' '+style+' Bhava Roman label '+detail.text+' remains in normal cell flow.');
                  assert.equal(detail.overlapsPlanet,false,item.rootId+' '+style+' Bhava Roman label '+detail.text+' does not cover a planet short-name.');
                  assert.ok(detail.insideChart,item.rootId+' '+style+' Bhava Roman label '+detail.text+' remains inside chart bounds.');
                }
              }
            }
            if(style==='south'){
              for(const entry of labels){
                const expected=bhavaHousesBySign[entry.sign].map(house=>roman[house-1]);
                assert.deepEqual(entry.labels,expected,item.rootId+' South Bhava converts displayed 1–12 house values to Roman numerals without changing the Rasi mapping.');
              }
            }else if(style==='north'){
              assert.equal(labels.length,12,item.rootId+' North Bhava keeps twelve in-cell Roman house labels.');
              for(const entry of labels){
                assert.ok(entry.house>=1&&entry.house<=12,item.rootId+' North Bhava cell must retain its actual house slot.');
                assert.deepEqual(entry.labels,[roman[entry.house-1]],item.rootId+' North Bhava labels must follow the Bhava Table house number.');
                assert.equal(entry.sign,bhavaHouseSigns[entry.house-1],item.rootId+' North Bhava sign placement must follow Bhava Sphuta Rasi.');
              }
            }else{
              for(const entry of labels){
                const expected=bhavaHousesBySign[entry.sign].map(house=>roman[house-1]);
                assert.deepEqual(entry.labels,expected,item.rootId+' '+style+' Bhava house labels must follow the same sign mapping as the Bhava Table.');
              }
              assert.deepEqual(labels.find(entry=>entry.sign===0)?.labels,['I','II'],
                item.rootId+' '+style+' Bhava groups two distinct cusp houses in one sign only when the Bhava Table maps both there.');
            }
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
