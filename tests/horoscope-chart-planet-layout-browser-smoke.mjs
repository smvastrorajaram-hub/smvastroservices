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
function cell(sign, kind) {
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
      '<div class="bhava-cusp"><span class="bhava-house-no" data-bhava-house="' + house + '">' + String(house) + '</span></div>'
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
                const number = kind==='transit' ? cell.querySelector('[data-transit-lagna]') : (style==='north' ? null : (cell.querySelector('.lagna,.smv-v342-asc') || cell.querySelector('.dynamic-rasi-number,.bhava-house-no,.smv-v342-house-number')));
                const displayNumber = number || (style==='north' ? cell.querySelector('.smv-v342-sign-number') : null);
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
                  numberText:displayNumber?.textContent.trim()||'',
                  numberBackgroundColor:displayNumber?getComputedStyle(displayNumber).backgroundColor:null,
                  numberZIndex:displayNumber?getComputedStyle(displayNumber).zIndex:null,
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
                .map(cell=>cell.querySelector('.smv-v342-sign-number,.smv-v342-house-number')).filter(Boolean);
              const crowdedTriangleNumbers = crowdedLabelNodes.map(number=>{
                const rect=number.getBoundingClientRect();
                const overlappingGlyphs=[...(number.closest('.smv-v342-cell')?.querySelectorAll('.smv-v342-planets .planet-glyph')||[])].flatMap(glyph=>{
                  const other=glyph.getBoundingClientRect();
                  const overlaps=rect.width>0&&rect.height>0&&other.width>0&&other.height>0&&
                    rect.left<other.right-0.5&&rect.right>other.left+0.5&&
                    rect.top<other.bottom-0.5&&rect.bottom>other.top+0.5;
                  return overlaps?[{text:glyph.textContent.trim(),left:other.left,right:other.right,top:other.top,bottom:other.bottom}]:[];
                });
                const computed=getComputedStyle(number),cell=number.closest('.smv-v342-cell');
                return {
                  text:number.textContent.trim(),house:cell?.dataset.house||'',sign:cell?.dataset.sign||'',
                  left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
                  backgroundColor:computed.backgroundColor,
                  zIndex:computed.zIndex,
                  position:computed.position,
                  color:computed.color,
                  overlapsPlanet:overlappingGlyphs.length>0,overlappingGlyphs
                };
              });
              const emptyCells = cells.filter(cell=>cellCount(cell) === 0);
              const emptyDash = emptyCells.some(cell=>!!cell.querySelector('.smv-v342-empty'));
              const numericLabels = cells.reduce((count,cell)=>count+cell.querySelectorAll('.smv-v342-sign-number,.smv-v342-house-number').length,0);
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
              const northSignNumbers = style!=='north'?[]:cells.map(cell=>{
                const node=cell.querySelector('.smv-v342-sign-number');
                return {
                  house:Number(cell.dataset.house||0),
                  sign:Number(cell.dataset.sign||0),
                  text:node?.textContent.trim()||'',
                  labelDetails:node?describeBhavaLabel(node,Number(cell.dataset.sign||0)-1,Number(cell.dataset.house||0)).labelDetails:[]
                };
              });
              const bhavaHouseLabels = kind!=='bhava'?[]:style==='south'
                ? cells.map((cell,index)=>{
                    const nodes=[...cell.querySelectorAll('.bhava-house-no')];
                    return {
                      sign:signOrder[index],house:0,
                      houseIds:nodes.map(el=>Number(el.dataset.bhavaHouse||0)).filter(Boolean),
                      labels:nodes.map(el=>el.textContent.trim()),
                      labelDetails:nodes.flatMap(el=>describeBhavaLabel(el,signOrder[index]).labelDetails)
                    };
                  })
                : style==='north'
                  ? cells.map(cell=>{
                      const entry=describeBhavaLabel(
                        cell.querySelector('.smv-v342-sign-number'),
                        Number(cell.dataset.sign||0)-1,
                        Number(cell.dataset.house||0)
                      );
                      return {...entry,houseIds:[Number(cell.dataset.house||0)].filter(Boolean)};
                    })
                  : cells.map(cell=>{
                      const node=cell.querySelector('.smv-v342-house-number');
                      const entry=describeBhavaLabel(node,Number(cell.dataset.sign||0)-1,0);
                      return {...entry,houseIds:(node?.dataset.bhavaHouses||'').split(',').map(Number).filter(Boolean)};
                    });
              reports.push({rootId,kind,cells:cells.length,chartClass:chart.className,numericLabels,northSignNumbers,picked,emptyDash,bhavaHouseLabels,cellBoundsOutside,compartmentOutside,triangleCells:cells.filter(cell=>cell.classList.contains('smv-v342-triangle-cell')).length,planetGlyphColors,crowdedTriangleNumbers});

            }
          }
          return {viewport:innerWidth,language,reports};
        },{style,language,signOrder,compartmentPolygons});
        if(style==='north'){
          const debug=state.reports.filter(item=>item.rootId==='tamilHoroscopeResult'&&item.kind==='rasi').flatMap(item=>item.crowdedTriangleNumbers.filter(number=>number.overlapsPlanet));
          console.log('NORTH SIGN NUMBER OVERLAP DEBUG',JSON.stringify(debug));
          const debugImage=join(outputDir,'debug-north-'+language+'-'+width+'.png');
          await page.screenshot({path:debugImage,fullPage:true});
        }
        for (const item of state.reports) {
          if(item.kind==='bhava')console.log('BHAVA HOUSE DISPLAY',JSON.stringify({rootId:item.rootId,style,labels:item.bhavaHouseLabels}));
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
          if(style==='east'&&item.kind==='bhava'){
            assert.ok(item.crowdedTriangleNumbers.length>0,item.rootId+' East Bhava: crowded triangle fixtures include in-cell house IDs.');
            for(const number of item.crowdedTriangleNumbers){
              assert.equal(number.backgroundColor,'rgb(255, 253, 247)',item.rootId+' East Bhava: label has an opaque chart-colour backing ('+number.text+').');
              assert.equal(number.position,'static',item.rootId+' East Bhava: house IDs remain in normal cell flow ('+number.text+').');
              assert.equal(number.color,'rgb(111, 77, 44)',item.rootId+' East Bhava: house ID keeps high contrast ('+number.text+').');
              assert.equal(number.overlapsPlanet,false,item.rootId+' East Bhava: label never covers a planet name ('+number.text+').');
            }
          }else if(style==='north'&&item.kind==='bhava'){
            assert.ok(item.crowdedTriangleNumbers.length>0,item.rootId+' North Bhava: mapped sign-number labels appear in crowded triangle fixtures.');
            for(const number of item.crowdedTriangleNumbers){
              assert.equal(number.overlapsPlanet,false,item.rootId+' North Bhava: Devanagari Rasi number never covers a planet name ('+number.text+').');
            }
          }else if(style==='east'){
            assert.equal(item.crowdedTriangleNumbers.length,0,item.rootId+' East '+item.kind+': no Bhava house-number labels are added to non-Bhava charts.');
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
            if(style==='north'){
              assert.equal(item.numericLabels,12,item.rootId+' '+item.kind+' North: all twelve fixed houses carry exactly one Devanagari Rasi number.');
              assert.equal(item.northSignNumbers.length,12,item.rootId+' '+item.kind+' North: all twelve houses expose their mapped Rasi number.');
              for(const entry of item.northSignNumbers){
                assert.ok(entry.house>=1&&entry.house<=12,item.rootId+' '+item.kind+' North: fixed house slot remains 1–12.');
                assert.equal(entry.text,String(entry.sign).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]),item.rootId+' '+item.kind+' North: sign '+entry.sign+' is rendered in Devanagari digits.');
                assert.equal(entry.labelDetails.length,1,item.rootId+' '+item.kind+' North: each house has one visible Rasi number node.');
                assert.ok(entry.labelDetails[0].visible,item.rootId+' '+item.kind+' North: Devanagari sign number is visibly rendered.');
                assert.equal(entry.labelDetails[0].overlapsPlanet,false,item.rootId+' '+item.kind+' North: Devanagari sign number does not cover a planet.');
              }
            }else if(item.kind==='bhava'){
              assert.equal(item.numericLabels,11,item.rootId+' East Bhava: house IDs are grouped into the eleven occupied Sphuta Rasi cells in this fixture.');
            }else{
              assert.equal(item.numericLabels,0,item.rootId+' '+item.kind+' East: no extra fixed sign numbers or Bhava numbers are added.');
            }
          }
          if(item.kind==='bhava'){
            const labels=item.bhavaHouseLabels;
            const expectedAll=[1,2,3,4,5,6,7,8,9,10,11,12];
            const allHouseIds=labels.flatMap(entry=>entry.houseIds);
            assert.deepEqual([...allHouseIds].sort((a,b)=>a-b),expectedAll,
              item.rootId+' '+style+' Bhava must preserve each house ID I–XII exactly once with no missing or duplicate IDs.');
            for(const entry of labels){
              for(const detail of entry.labelDetails){
                assert.ok(detail.visible,item.rootId+' '+style+' Bhava number '+detail.text+' has a visible, non-zero display box.');
                assert.equal(detail.overlapsPlanet,false,item.rootId+' '+style+' Bhava number '+detail.text+' never covers a planet short-name.');
                assert.ok(detail.insideChart,item.rootId+' '+style+' Bhava number '+detail.text+' remains inside chart bounds.');
                if(style==='east'){
                  assert.equal(detail.color,'rgb(111, 77, 44)',item.rootId+' East Bhava ID keeps the high-contrast house-label colour.');
                  assert.equal(detail.backgroundColor,'rgb(255, 253, 247)',item.rootId+' East Bhava ID has an opaque backing.');
                  assert.equal(detail.position,'static',item.rootId+' East Bhava ID remains in normal cell flow.');
                }
              }
            }
            if(style==='south'){
              const tamil=language==='ta';
              for(const entry of labels){
                const expectedIds=bhavaHousesBySign[entry.sign];
                const expectedLabels=expectedIds.map(house=>tamil?roman[house-1]:String(house));
                assert.deepEqual(entry.houseIds,expectedIds,item.rootId+' South Bhava house IDs stay with their calculated Sphuta Rasi.');
                assert.deepEqual(entry.labels,expectedLabels,item.rootId+' South Bhava uses Roman numerals only for Tamil; English uses Arabic 1–12.');
              }
            }else if(style==='north'){
              assert.equal(labels.length,12,item.rootId+' North Bhava keeps all twelve fixed house slots.');
              for(const entry of labels){
                assert.ok(entry.house>=1&&entry.house<=12,item.rootId+' North Bhava fixed slot must remain 1–12.');
                assert.deepEqual(entry.houseIds,[entry.house],item.rootId+' North Bhava fixed slot identity remains unique.');
                assert.equal(entry.sign,bhavaHouseSigns[entry.house-1],item.rootId+' North Bhava slot uses its Bhava Table Sphuta Rasi.');
                const hindiSign=String(entry.sign+1).replace(/[0-9]/g,d=>'०१२३४५६७८९'[Number(d)]);
                assert.deepEqual(entry.labels,[hindiSign],item.rootId+' North Bhava shows the mapped Sphuta Rasi number in Devanagari, not the Bhava house ID.');
              }
            }else{
              for(const entry of labels){
                const expectedIds=bhavaHousesBySign[entry.sign];
                assert.deepEqual(entry.houseIds,expectedIds,item.rootId+' East Bhava keeps all distinct house IDs grouped only under their mapped Sphuta Rasi.');
                assert.deepEqual(entry.labels,expectedIds.map(String),item.rootId+' East Bhava uses Arabic house IDs in both Tamil and English reports.');
              }
              assert.deepEqual(labels.find(entry=>entry.sign===0)?.houseIds,[1,2],
                item.rootId+' East Bhava groups two houses in one sign only when their Bhava Madhya maps to that Sphuta Rasi.');
              assert.deepEqual(labels.find(entry=>entry.sign===0)?.labels,['1','2'],
                item.rootId+' East Bhava clearly shows both grouped house IDs without Roman numerals.');
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
