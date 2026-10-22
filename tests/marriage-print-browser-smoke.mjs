// Browser and A4 Print QA: all 3 styles, real two-person Swiss/Varga/BAV data.
import assert from 'node:assert/strict';
import {mkdir,writeFile,stat,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const cgMethodTable=section=>section.match(/<table class="smv-ayurdaya-table(?: smv-css-island)?">[\s\S]*?<\/table>/)?.[0]||'';
function assertNoSparsePrintPages(pdfPath,label){
 // A disclaimer-only page is technically valid PDF, but a layout regression.
 // Inspect text from the actual Chromium PDF, not just the source DOM.
 const extracted=execFileSync('pdftotext',['-layout',pdfPath,'-'],{encoding:'utf8',maxBuffer:64*1024*1024});
 const pages=extracted.split('\f');
 if(pages.length && !pages.at(-1).trim()) pages.pop();
 const sparse=[];
 for(let i=1;i<pages.length;i++){
  const compact=pages[i].replace(/\s/gu,'');
  if(compact.length<140)sparse.push({page:i+1,characters:compact.length,preview:pages[i].trim().replace(/\s+/gu,' ').slice(0,180)});
 }
 assert.equal(sparse.length,0,label+': near-empty/orphaned PDF page(s): '+JSON.stringify(sparse));
 return pages.length;
}

import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {transit} from '../public/horoscope/offline/transit_panchang.browser.mjs';
import {renderBasicMatching} from '../public/horoscope/marriage-basic-report.mjs';
import {cgRajanSelectAyurdayaMethod as selectMethod} from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';
const root=new URL('../public/horoscope/',import.meta.url),output=new URL('../marriage-print-smoke-output/',import.meta.url);
const rootPath=resolve(fileURLToPath(root));
await mkdir(output,{recursive:true});
// Serve the fixtures over a same-origin loopback HTTP server. A file:// page
// can report a CSS FontFace as loaded while Chromium refuses to embed its local
// WOFF2 resource in the printed PDF; production uses ordinary HTTP(S).
const mimeTypes={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url||'/', 'http://127.0.0.1').pathname);
  const filePath=resolve(rootPath,'.'+pathname);
  if(filePath!==rootPath&&!filePath.startsWith(rootPath+sep)){res.writeHead(403);res.end('Forbidden');return;}
  const bytes=await readFile(filePath);
  res.writeHead(200,{'Content-Type':mimeTypes[extname(filePath)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(bytes);
 }catch(_){res.writeHead(404);res.end('Not found');}
});
await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolvePromise);});
const origin=`http://127.0.0.1:${server.address().port}/`;
const people=[];
for(const [name,date,time,lat,lon,zone,utc] of [
 ['Bride audit','1992-07-31','22:05',11.232,78.88,'Asia/Kolkata',330],
 ['Groom audit','1994-06-15','13:03',51.5074,-.1278,'Europe/London',60]]){
 const r=await full({name,date,time,lat,lon,utcOffsetMinutes:utc,language:'ta'});
 assert.ok(r.ok&&r.advanced,'complete Swiss natal and classical calculations');
 Object.assign(r.chart,{advanced:r.advanced,birthName:name,birthDate:date,birthTime:time,birthPlace:name,birthLat:lat,birthLon:lon,birthTimezone:zone,birthOffsetMinutes:utc});
 people.push(r.chart);
}
const ayurdayaSelections=people.map(p=>selectMethod({planets:p.planets,lagna:p.lagna}));
const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
const results=[];
try{
 const page=await browser.newPage();
 for(const [style,groomStyle] of [['south','south'],['north','north'],['east','east'],['north','east']]){
  const testName=style===groomStyle?style:style+'-'+groomStyle;
  const html=await renderBasicMatching(people[0],people[1],{
   language:'ta',brideStyle:style,groomStyle,reviewDate:'2026-10-16',
   transitFn:input=>transit(input),poruthamRows:[['தினம்',true,''],['ரஜ்ஜு',false,'']]
  });
  assert.ok(html.includes('அந்தரம்')&&html.includes('மகாதசை')&&html.includes('புக்தி'), 'Native report HTML contains Mahadasha/Bhukti/Antaram rows: '+testName);
  assert.ok(!html.includes('Uttara Kalamrita இடைக்காலக் கூறுகள்')&&!html.includes('யுத்தம் (UK)'), 'No foreign-method note or separate Yuddha column: '+testName);
  assert.ok(html.includes('mm-base-shad-components')&&html.includes('மொத்த ஷட்பலம் (விரூபம்)')&&html.includes('மொத்த ரூபா')&&html.includes('தேவையான ரூபா')&&html.includes('தரவரிசை')&&html.includes('வலிமை நிலை'),
   'Six Bala components, final total, Rupa, required Rupa, rank and strength status render in Tamil: '+testName);
  assert.ok(html.includes('smv-shadbala-section'),'Shadbala heading and table are inside one print-break wrapper: '+testName);
  assert.ok(!html.includes('smv-shadbala-method-note'),'Matching print output omits the internal Shadbala validation note: '+testName);
  const ayurdayaSections=[...html.matchAll(/<section class="smv-cg-rajan-ayurdaya"[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]);
  assert.equal(ayurdayaSections.length,2,'Both bride and groom Ayurdaya appendices are present: '+testName);
  const methodLabels={pinda:'பிண்ட ஆயுள்',natural:'நைசர்க்கிக ஆயுள்',amsa:'அம்ச ஆயுர்த்தாயம்'};
  for(const [i,section] of ayurdayaSections.entries()){
   const selection=ayurdayaSelections[i];
   if(selection.available){
    assert.ok(section.includes(methodLabels[selection.selectedMethod]),'Only the Shadbala-selected method is present for person '+(i+1)+': '+testName);
    for(const [method,label] of Object.entries(methodLabels))if(method!==selection.selectedMethod)
     assert.ok(!section.includes(label),'Unselected Ayurdaya method '+method+' is hidden: '+testName);
    assert.equal((cgMethodTable(section).match(/<tr\b/g)||[]).length,9,'One selected method renders seven grahas plus total: '+testName);
    assert.ok(section.includes('smv-ayurdaya-method-selection'),'Selected-method basis is visible: '+testName);
    const totalRow=section.match(/<tr class="smv-ayurdaya-totals">[\s\S]*?<\/tr>/)?.[0]||'';
    assert.equal((totalRow.match(/<strong>/g)||[]).length,1,'One selected method total is emphasized: '+testName);
   }else if(selection.reasonCode==='shadbala-tie'){
    assert.ok(section.includes('data-ayurdaya-selection="shadbala-tie"'),'Tied methods are shown side by side: '+testName);
    assert.equal((cgMethodTable(section).match(/<tr\b/g)||[]).length,9,'Tie table has header + seven grahas + totals: '+testName);
    for(const candidate of selection.tiedCandidates){
     assert.ok(section.includes(methodLabels[candidate.method]),'Tied method is shown '+candidate.method+': '+testName);
     assert.equal((section.match(new RegExp('data-tied-method="'+candidate.method+'"','g'))||[]).length,8,
      'Every tied method shows seven graha cells plus its total '+candidate.method+': '+testName);
    }
    assert.equal((section.match(/data-tied-total=/g)||[]).length,selection.tiedCandidates.length,
     'Each tied method has a separate total: '+testName);
   }else{
    assert.equal((cgMethodTable(section).match(/<tr\b/g)||[]).length,0,'No method is selected when Shadbala reference data is missing: '+testName);
    assert.ok(section.includes('data-ayurdaya-selection="unavailable"'),'Missing method inputs are explicit: '+testName);
   }
  }
  assert.ok(!html.includes('சராசரி ஆயுர்த்தாயம்')&&!html.includes('Average Ayurdaya')&&!html.includes('smv-ayurdaya-average-basis'),
   'Matching HTML omits all competing-method averages: '+testName);
  assert.ok(!html.includes('AMSA AYURDAYAM'),'The rejected uppercase heading is absent: '+testName);
  const fixture=new URL('__matching_print_smoke_temp.html',root);
  const document='<html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="horoscope.css?v=20261019-ayurdaya-selected-total-v251"><link rel="stylesheet" href="chart-style.css"><link rel="stylesheet" href="marriage-basic-report.css?v=20261019-ayurdaya-selected-total-v251"><link rel="stylesheet" href="horoscope-readings.css"><link rel="stylesheet" href="smv-ui.css"><link rel="stylesheet" href="header-layout.css"><link rel="stylesheet" href="v358-result-layout.css"><link rel="stylesheet" href="v359-symmetric-gutters.css"><link rel="stylesheet" href="report-print.css" media="print"></head><body class="smv-v12-theme"><div id="smvMarriageMatching"><main class="mm-full-results mm-v281-results mm-v308-results" id="printReport">'+html+'</main></div></body></html>';
  await writeFile(fixture,document);
  await page.setViewport({width:360,height:800,deviceScaleFactor:1});
  await page.goto(new URL('__matching_print_smoke_temp.html',origin).href,{waitUntil:'load'});
  const mobile=await page.evaluate(()=>{
   const charts=[...document.querySelectorAll('.mm-base-chart')];
   const tables=[...document.querySelectorAll('.mm-base-table')];
   const ayurdayaTables=[...document.querySelectorAll('.smv-cg-rajan-ayurdaya .smv-ayurdaya-table:not(.smv-bv-raman-ayurdaya-table)')];
   const ayurdayaHeader=ayurdayaTables[0]?.querySelector('thead th');
   const ayurdayaTotal=ayurdayaTables[0]?.querySelector('tbody .smv-ayurdaya-totals td');
   const ayurdayaTotalStyle=ayurdayaTotal?{background:getComputedStyle(ayurdayaTotal).backgroundColor,color:getComputedStyle(ayurdayaTotal).color,weight:parseInt(getComputedStyle(ayurdayaTotal).fontWeight,10)||400}:null;
   const ayurdayaPlanet=ayurdayaTables[0]?.querySelector('tbody tr:not(.smv-ayurdaya-totals) th');
   const ayurdayaHeaderStyle=ayurdayaHeader?{color:getComputedStyle(ayurdayaHeader).color,background:getComputedStyle(ayurdayaHeader).backgroundColor,weight:parseInt(getComputedStyle(ayurdayaHeader).fontWeight,10)||400}:null;
   const ayurdayaPlanetStyle=ayurdayaPlanet?{text:ayurdayaPlanet.textContent.trim(),color:getComputedStyle(ayurdayaPlanet).color,background:getComputedStyle(ayurdayaPlanet).backgroundColor,weight:parseInt(getComputedStyle(ayurdayaPlanet).fontWeight,10)||400}:null;
   const first=charts[0],groom=charts[4],rectangle=first?.getBoundingClientRect();
   const cell0=first?.querySelector('.mm-base-pos-0')?.getBoundingClientRect();
   const cell11=first?.querySelector('.mm-base-pos-11')?.getBoundingClientRect();
   const wrap=document.querySelector('.mm-base-shad-components')?.closest('.mm-base-scroll');
   const shadTable=document.querySelector('.mm-base-shad-components');
   const td=document.querySelector('.mm-base-shad-components td');
   const extra=charts.map(c=>c.innerText).join(' ');
   const allPlanets=[...document.querySelectorAll('.mm-base-planet')].map(c=>c.textContent);
   return {
    charts:charts.length,tables:tables.length,ayurdayaTables:ayurdayaTables.length,ayurdayaHeaderStyle,ayurdayaTotalStyle,ayurdayaPlanetStyle,firstStyle:first?.dataset.chartStyle,groomStyle:groom?.dataset.chartStyle,
    rectWidth:rectangle?.width||0,
    firstCell:{left:cell0?.left-rectangle?.left,top:cell0?.top-rectangle?.top},
    lastCell:{left:cell11?.left-rectangle?.left,top:cell11?.top-rectangle?.top},
    whiteSpace:td&&getComputedStyle(td).whiteSpace,
    scrollWidth:wrap?.scrollWidth,clientWidth:wrap?.clientWidth,
    shadbalaHeaders:[...(shadTable?.querySelectorAll('thead th')||[])].map(th=>th.textContent.trim()),
    lineCount:allPlanets.length,
    splitNames:/மேஷம்|ரிஷபம்|மிதுனம்|கடகம்|சிம்மம்|கன்னி|துலாம்|விருச்சிகம்|தனுசு|மகரம்|கும்பம்|மீனம்/.test(extra),
    longPlanet:allPlanets.some(x=>x.length>5),
    svgPath:first?.querySelector('.mm-base-geometry path')?.getAttribute('d')||''
   };
  });
  assert.equal(mobile.firstStyle,style,'Incorrect bride selected style: '+style);
  assert.equal(mobile.groomStyle,groomStyle,'Incorrect groom selected style: '+groomStyle);
  assert.ok(mobile.charts===8,'D1/D9/Bhava/Gochara for both users: '+style);
  assert.ok(mobile.tables>=20,'Full technical tables for both users: '+style);
  assert.equal(mobile.ayurdayaTables,ayurdayaSelections.filter(s=>s.available).length,'Only Shadbala-selected Ayurdaya tables appear on mobile: '+style);
  if(mobile.ayurdayaTables>0){
   assert.ok(mobile.ayurdayaHeaderStyle&&mobile.ayurdayaHeaderStyle.color==='rgb(74, 53, 45)'&&mobile.ayurdayaHeaderStyle.background==='rgb(255, 247, 232)'&&mobile.ayurdayaHeaderStyle.weight>=700,'Matching Ayurdaya heading matches the exact Shadbala header palette: '+style+' '+JSON.stringify(mobile.ayurdayaHeaderStyle));
   assert.ok(mobile.ayurdayaTotalStyle&&mobile.ayurdayaTotalStyle.background==='rgb(250, 242, 228)'&&mobile.ayurdayaTotalStyle.weight>=700,'Selected Ayurdaya total row uses the approved cream palette: '+style);
   assert.ok(mobile.ayurdayaPlanetStyle&&mobile.ayurdayaPlanetStyle.text.length>0&&mobile.ayurdayaPlanetStyle.color==='rgb(48, 39, 34)'&&mobile.ayurdayaPlanetStyle.background==='rgb(255, 255, 255)'&&mobile.ayurdayaPlanetStyle.weight>=700,'Matching Ayurdaya planet names are black bold on a pure-white cell: '+style);
  }
  assert.ok(mobile.rectWidth>=250&&mobile.rectWidth<=360,'Chart mobile size: '+style);
  assert.equal(mobile.whiteSpace,'nowrap','No split words in Shadbala mobile table: '+style);
  assert.ok(mobile.scrollWidth>mobile.clientWidth,'Wide tables must scroll on mobile: '+style);
  assert.ok(mobile.shadbalaHeaders.length===12&&mobile.shadbalaHeaders.some(x=>x.includes('மொத்த ஷட்பலம்'))&&mobile.shadbalaHeaders.includes('தரவரிசை'),
    'Scrollable Tamil Matching Shadbala has all twelve columns: '+style);
  assert.ok(!mobile.splitNames&&!mobile.longPlanet,'Charts must contain only short planet codes without sign names: '+style);
  assert.ok(mobile.lineCount>25,'All planet codes present: '+style);
  if(style==='south'){
   assert.ok(mobile.lastCell.left<5&&mobile.lastCell.top<5,'Pisces sign remains top-left in South chart');
   assert.ok(mobile.firstCell.top<5&&mobile.firstCell.left>mobile.rectWidth*.2,'Aries is at top second cell');
   assert.ok(mobile.svgPath.includes('M0 50H25'),'True blank central South box exists');
  }else if(style==='north'){
   assert.ok(mobile.svgPath.includes('M0 0L100 100'),'North diamond chart geometry');
  }else{
   assert.ok(mobile.svgPath.includes('M33.333 0V100'),'East Bengal style geometry');
  }
  await page.screenshot({path:fileURLToPath(new URL('matching-mobile-'+testName+'.png',output)),fullPage:true});
  await page.emulateMediaType('print');
  const pdfPath=new URL('matching-print-'+testName+'.pdf',output);
  await page.pdf({path:fileURLToPath(pdfPath),format:'A4',printBackground:true,preferCSSPageSize:true});
  const {size}=await stat(pdfPath);
  assert.ok(size>25000,'PDF is not empty: '+style);
  const pageCount=assertNoSparsePrintPages(fileURLToPath(pdfPath),'Matching '+testName);
  assert.ok(pageCount>=2,'Matching report should paginate to multiple pages: '+testName);
  const print=await page.evaluate(async()=>{
   const first=document.querySelector('.mm-base-chart'),groom=document.querySelectorAll('.mm-base-chart')[4],css=getComputedStyle(first),rect=first.getBoundingClientRect();
   const methodSelections=[...document.querySelectorAll('.smv-ayurdaya-method-selection')].map(node=>({display:getComputedStyle(node).display,fontSize:parseFloat(getComputedStyle(node).fontSize),fontWeight:parseInt(getComputedStyle(node).fontWeight,10)||400,backgroundColor:getComputedStyle(node).backgroundColor,visibility:getComputedStyle(node).visibility,text:node.textContent.trim()}));
   const shadbalaSection=document.querySelector('.smv-shadbala-section');
   const shadbalaBreakInside=shadbalaSection?getComputedStyle(shadbalaSection).breakInside:'missing';
   await document.fonts.ready;
   const tamilFonts=await document.fonts.load('8pt SMVTamil','ஷட்பலத்தின் அடிப்படையில் தேர்வு');
   const tamilFontReady=tamilFonts.some(face=>face.family.replace(/["']/g,'').includes('SMVTamil'))&&document.fonts.check('8pt SMVTamil','ஷட்பலத்தின் அடிப்படையில் தேர்வு');
   return {style:first.dataset.chartStyle,groomStyle:groom.dataset.chartStyle,width:rect.width,height:rect.height,display:css.display,planets:[...first.querySelectorAll('.mm-base-planet')].length,ayurdayaTables:document.querySelectorAll('.smv-cg-rajan-ayurdaya .smv-ayurdaya-table:not(.smv-bv-raman-ayurdaya-table)').length,bvRamanTables:document.querySelectorAll('.smv-bv-raman-ayurdaya-table').length,methodSelections,tamilFontReady,shadbalaBreakInside};
  });
  assert.ok(print.width>180&&print.height>180,'Print chart not blank: '+style);
  assert.equal(print.style,style,'Print bride style changed unexpectedly');
  assert.equal(print.groomStyle,groomStyle,'Print groom style changed unexpectedly');
  assert.equal(print.ayurdayaTables,ayurdayaSelections.filter(s=>s.available).length,'Only chosen Ayurdaya method tables remain in print DOM: '+style);
  assert.equal(print.bvRamanTables,4,'Both B.V. Raman result tables render for each matching person: '+style);
  const expectedMethodSelectionCount=ayurdayaSelections.filter(s=>s.available).length;
  assert.ok(print.methodSelections.length===expectedMethodSelectionCount&&print.methodSelections.every(x=>x.display!=='none'&&x.visibility!=='hidden'&&x.text.length>0&&x.fontSize>=7&&x.fontWeight>=700),
    'The selected-method Shadbala explanation remains readable/visible in print: '+style+' '+JSON.stringify({expectedMethodSelectionCount,actual:print.methodSelections}));
  assert.equal(print.tamilFontReady,true,'Noto Tamil font is loaded for native PDF rendering: '+style);
  assert.equal(print.shadbalaBreakInside,'avoid','Shadbala heading and full table stay together in PDF: '+style);
  const printText=await page.evaluate(()=>document.querySelector('#printReport')?.innerText||'');
  assert.ok(printText.includes('அந்தரம்')&&(!ayurdayaSelections.some(s=>s.available)||printText.includes('மொத்தம் (7 கிரகங்கள்)'))&&!printText.includes('சராசரி ஆயுர்த்தாயம்')&&!printText.includes('Average Ayurdaya'), 'Native print DOM preserves Antaram and selected Ayurdaya total without a mean: '+style);
  results.push({style:testName,pdfBytes:size,mobile,print});
  await page.emulateMediaType('screen');
 }
 // Verify the real Saved/Print cover CSS, not just a calculation-only PDF.
 // The matching emblem must have zero shifted X offset while Horoscope keeps
 // its previously approved V331 layout. Both use the same Print-page stylesheet.
 const coverFile=new URL('__matching_cover_print_smoke_temp.html',root);
 const coverHtml=matching=>'<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="report-print.css"></head><body><section id="smvPrintCover" class="smv-print-cover smv-vector-cover smv-cover-v19'+(matching?' smv-cover-matching':'')+'"><div class="smv-cover-frame"><div class="smv-cover-emblem"><img src="'+(matching?'assets/smv-marriage-shiva-parvati.webp':'assets/smv-ganesha-approved.webp')+'"></div></div></section></body></html>';
 const coverMeasurements=[];
 for(const matching of [true,false]){
  await writeFile(coverFile,coverHtml(matching));
  await page.setViewport({width:390,height:830,deviceScaleFactor:1});
  await page.goto(new URL('__matching_cover_print_smoke_temp.html',origin).href,{waitUntil:'load'});
  await page.emulateMediaType('print');
  const m=await page.evaluate(()=>{
    const cover=document.querySelector('#smvPrintCover'),
      frame=cover.querySelector('.smv-cover-frame'),
      emblem=cover.querySelector('.smv-cover-emblem'),
      img=emblem.querySelector('img');
    const box=e=>e.getBoundingClientRect();
    const b=box(emblem),i=box(img),p=box(frame);
    return {
      loaded:img.complete&&img.naturalWidth>0,
      coverMatching:cover.classList.contains('smv-cover-matching'),
      frameCenter:p.left+p.width/2,
      emblemCenter:b.left+b.width/2,
      imageCenter:i.left+i.width/2,
      imageTransform:getComputedStyle(img).transform,
      imageTranslate:getComputedStyle(img).translate
    };
  });
  console.log('COVER_GEOMETRY',JSON.stringify(m));
  assert.equal(m.loaded,true,'Actual cover image must load');
  if(matching)assert.ok(Math.abs(m.imageCenter-m.emblemCenter)<1.5,'Matching cover image centered within its container');
  assert.ok(Math.abs(m.emblemCenter-m.frameCenter)<1.5,'Emblem centered on the A4 cover frame');
  if(matching)assert.equal(m.imageTransform,'none','Matching cover photo must not have horizontal V331 offset');
  else assert.notEqual(m.imageTransform,'none','Horoscope cover keeps previous V331 offset');
  if(matching){
   const coverPdf=new URL('matching-cover-centered.pdf',output);
   await page.pdf({path:fileURLToPath(coverPdf),format:'A4',printBackground:true,preferCSSPageSize:true});
   assert.ok((await stat(coverPdf)).size>10000,'Matching cover PDF created');
   await page.screenshot({path:fileURLToPath(new URL('matching-cover-centered.png',output)),fullPage:false});
  }
  coverMeasurements.push(m);
 }
 // Both Nakshatra form modes and both user fieldsets share one layer.
 const inputFile=new URL('__matching_input_layer_smoke_temp.html',root);
 const inputHtml='<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="smv-ui.css"></head><body class="smv-v12-theme"><div id="smvMarriageMatching"><div id="mmPublicChoice">Mode</div><div id="mmFullEntry"><div class="mm-grid mm-birth-grid"><fieldset><legend>Bride</legend><label>Date<input type="date"></label></fieldset><fieldset><legend>Groom</legend><label>Date<input type="date"></label></fieldset></div></div><div id="mmManualEntry"><div class="mm-grid mm-birth-grid"><fieldset><legend>Bride</legend><label>Rasi<select><option>Aries</option></select></label></fieldset><fieldset><legend>Groom</legend><label>Rasi<select><option>Taurus</option></select></label></fieldset></div></div></div></body></html>';
 await writeFile(inputFile,inputHtml);
 await page.goto(new URL('__matching_input_layer_smoke_temp.html',origin).href,{waitUntil:'load'});
 await page.emulateMediaType('screen');
 const form=await page.evaluate(()=>[...document.querySelectorAll('#mmFullEntry fieldset,#mmManualEntry fieldset')].map(x=>{
    const c=getComputedStyle(x);
    return {border:c.borderTopWidth,shadow:c.boxShadow,background:c.backgroundColor};
 }));
 assert.equal(form.length,4,'Two DOB and two Rasi/Nakshatra fieldsets present');
 assert.ok(form.every(x=>x.border==='0px'&&x.shadow==='none'),'No nested fieldset cards in either Nakshatra mode');

 // End-to-end standalone Horoscope snapshot -> report-print.html -> Chromium PDF.
 // This exercises the same cached-core renderer and saved-report printer used by
 // customer Horoscope, not a hand-written duplicate Shadbala table.
 const sameOrigin=new URL(origin).origin;
 const horoscopePageErrors=[],horoscopeConsoleErrors=[],horoscopeFailedRequests=[];
 page.on('pageerror',error=>horoscopePageErrors.push(String(error?.stack||error)));
 page.on('console',msg=>{if(msg.type()==='error')horoscopeConsoleErrors.push(msg.text());});
 page.on('requestfailed',req=>{if(req.url().startsWith(sameOrigin))horoscopeFailedRequests.push(req.url()+': '+(req.failure()?.errorText||'failed'));});
 await page.setRequestInterception(true);
 page.on('request',req=>{
  try{if(new URL(req.url()).origin===sameOrigin)req.continue();else req.abort();}
  catch{req.abort();}
 });
 const actualIndexHtml=await readFile(new URL('index.html',root),'utf8');
 const rendererOnlyHtml=actualIndexHtml.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(block,attrs)=>
  /\bsrc=["'][^"']*horoscope\.js(?:\?[^"']*)?["']/i.test(attrs)?block:'');
 const rendererFixture=new URL('__horoscope_pdf_smoke_temp.html',root);
 await writeFile(rendererFixture,rendererOnlyHtml,'utf8');
 await page.goto(new URL('__horoscope_pdf_smoke_temp.html',origin).href,{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>typeof window.__smvRenderCachedCore==='function',{timeout:15000}).catch(async error=>{
  const dom=await page.evaluate(()=>({url:location.href,readyState:document.readyState,hook:typeof window.__smvRenderCachedCore,
   scriptLoads:[...document.scripts].map(x=>({src:x.src,readyState:x.readyState})).filter(x=>x.src.includes('horoscope.js')),
   resultExists:!!document.getElementById('tamilHoroscopeResult')}));
  throw new Error('Primary Horoscope renderer hook unavailable: '+JSON.stringify({dom,pageErrors:horoscopePageErrors.slice(-6),consoleErrors:horoscopeConsoleErrors.slice(-8),failedRequests:horoscopeFailedRequests.slice(-8)})+'; cause='+error.message);
 });
 const horoscopeChart={...people[0]};
 delete horoscopeChart.advanced;
 const horoscopeRender=await page.evaluate(data=>{
  document.documentElement.lang='ta';
  try{localStorage.setItem('smvLanguage','ta');}catch{}
  const name=document.getElementById('tamilAstroName');if(name)name.value='B.V. Raman Horoscope PDF QA';
  const place=document.getElementById('tamilBirthPlace');if(place)place.value='Perambalur';
  window.__smvRenderCachedCore(data);
  const root=document.getElementById('tamilHoroscopeResult');
  const rows=[...root.querySelectorAll('.smv-shadbala-table tbody tr')].map(tr=>({
   name:tr.cells[0]?.innerText.trim(),components:[...tr.cells].slice(1,7).map(td=>td.innerText.trim()),
   total:tr.cells[7]?.innerText.trim(),rupa:tr.cells[8]?.innerText.trim(),
   required:tr.cells[9]?.innerText.trim(),rank:tr.cells[10]?.innerText.trim()
  }));
  return {html:root.innerHTML,rows,expected:data.planets.filter(p=>p?.strength6?.available&&p.strength6.components).map(p=>({name:p.name,total:Number.isFinite(p.strength6.totalVirupa)?p.strength6.totalVirupa:null}))};
 },horoscopeChart);
 assert.ok(horoscopeRender.html.includes('மொத்த ஷட்பலம் (விரூபம்)')&&horoscopeRender.html.includes('சேஷ்டா பலம்')&&horoscopeRender.html.includes('த்ரிக் பலம்'),
  'Primary Horoscope renderer creates all six Bala columns in Tamil');
 assert.equal(horoscopeRender.rows.length,7,'Primary Horoscope renderer produces seven graha rows');
 for(const row of horoscopeRender.rows){
  const expected=horoscopeRender.expected.find(p=>p.name===row.name);
  assert.ok(expected&&expected.total!==null,'Primary Horoscope row has live strength6 total: '+row.name);
  assert.equal(row.total,Number(expected.total).toFixed(1),'Primary Horoscope printed Virupa matches strength6: '+row.name);
 }
 const horoscopeReportKey='smv-strength6-horoscope-pdf-smoke';
 const horoscopeSelection={key:horoscopeReportKey,owner:'smv-pdf-smoke-user',language:'ta',mode:'view',createdAt:Date.now()};
 await page.evaluate(async({html,selection,birth})=>{
  const db=await new Promise((resolve,reject)=>{
   const q=indexedDB.open('smv-reports-v2',3);
   q.onupgradeneeded=()=>{
    const d=q.result;
    let st;
    if(!d.objectStoreNames.contains('reports'))st=d.createObjectStore('reports',{keyPath:'key'});
    else st=q.transaction.objectStore('reports');
    if(!st.indexNames.contains('owner'))st.createIndex('owner','owner',{unique:false});
    if(!st.indexNames.contains('updatedAt'))st.createIndex('updatedAt','updatedAt',{unique:false});
   };
   q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error);
  });
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('reports','readwrite');
   tx.objectStore('reports').put({
    key:selection.key,owner:selection.owner,feature:'advanced_analysis',name:'B.V. Raman Horoscope PDF QA',
    language:'ta',html,views:{ta:html},identity:{date:birth?.date||'1992-07-31',time:birth?.time||'22:05',birthPlace:'Perambalur'},
    calculation:{birth:birth||{},birthPlace:'Perambalur'},cover:{person:{name:'B.V. Raman Horoscope PDF QA',place:'Perambalur'}},
    createdAt:Date.now(),updatedAt:Date.now(),deleted:false
   });
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
  db.close();
  sessionStorage.setItem('smv-print-report',JSON.stringify(selection));
 },{html:horoscopeRender.html,selection:horoscopeSelection,birth:horoscopeChart.birth||{}});
 await page.goto(new URL('report-print.html?mode=view',origin).href,{waitUntil:'load',timeout:45000});
 await page.waitForFunction(()=>document.querySelectorAll('#printReport .smv-shadbala-table tbody tr').length===7,{timeout:30000});
 const horoscopePrint=await page.evaluate(async()=>{
  await document.fonts.ready;
  const root=document.getElementById('printReport'),table=root.querySelector('.smv-shadbala-table'),section=table?.closest('.smv-shadbala-section');
  return {
   rows:[...table.querySelectorAll('tbody tr')].map(tr=>({name:tr.cells[0]?.innerText.trim(),total:tr.cells[7]?.innerText.trim()})),
   headers:[...table.querySelectorAll('thead th')].map(th=>th.innerText.trim()),
   shadbalaBreakInside:section?getComputedStyle(section).breakInside:'missing',
   headingInsideSameSection:!!section?.querySelector('.base-shadbala'),
   tableRowsInSection:section?.querySelectorAll('.smv-shadbala-table tbody tr').length||0,
   tamilFontReady:document.fonts.check('8pt SMVTamil','சராசரி ஆயுர்த்தாயம்'),
   title:document.title,ready:document.getElementById('printStatus')?.innerText||''
  };
 });
 assert.equal(horoscopePrint.rows.length,7,'Saved Horoscope print DOM preserves all seven Shadbala rows');
 assert.equal(horoscopePrint.shadbalaBreakInside,'avoid','Horoscope Shadbala title and table are kept together during pagination');
 assert.equal(horoscopePrint.headingInsideSameSection,true,'Horoscope Shadbala heading and table share a pagination wrapper');
 assert.equal(horoscopePrint.tableRowsInSection,7,'Pagination wrapper contains all seven final Shadbala rows');
 assert.ok(horoscopePrint.headers.includes('ஸ்தான பலம்')&&horoscopePrint.headers.includes('திக் பலம்')&&horoscopePrint.headers.includes('கால பலம்')&&horoscopePrint.headers.includes('சேஷ்டா பலம்')&&horoscopePrint.headers.includes('நைசர்கிக பலம்')&&horoscopePrint.headers.includes('த்ரிக் பலம்')&&horoscopePrint.headers.includes('மொத்த ஷட்பலம் (விரூபம்)'),
  'Saved Horoscope print DOM preserves all six Bala columns and final total');
 assert.equal(horoscopePrint.tamilFontReady,true,'Saved Horoscope print DOM loads embedded Tamil font');
 for(const row of horoscopePrint.rows){
  const expected=horoscopeRender.rows.find(p=>p.name===row.name);
  assert.equal(row.total,expected.total,'Saved Horoscope print total matches visible Horoscope result: '+row.name);
 }
 const horoscopePdf=new URL('horoscope-print-strength6.pdf',output);
 await page.pdf({path:fileURLToPath(horoscopePdf),format:'A4',printBackground:true,preferCSSPageSize:true});
 assert.ok((await stat(horoscopePdf)).size>25000,'Standalone Horoscope Shadbala PDF is generated');
 const horoscopePdfPages=assertNoSparsePrintPages(fileURLToPath(horoscopePdf),'Standalone Horoscope');
 assert.ok(horoscopePdfPages>=2,'Standalone Horoscope should paginate to multiple pages');
 await page.screenshot({path:fileURLToPath(new URL('horoscope-print-strength6.png',output)),fullPage:false});

 console.log(JSON.stringify({pass:true,styles:results.map(x=>x.style),pdfBytes:results.map(x=>x.pdfBytes),charts:8,tables:results[0].mobile.tables,mobileAndPrint:true,coverCenters:coverMeasurements,formLayers:form.length,horoscopePdf:true,horoscopePdfRows:horoscopePrint.rows.length,horoscopePdfHeaders:horoscopePrint.headers,tamilFontReady:horoscopePrint.tamilFontReady}));

}finally{await browser.close();await new Promise(resolvePromise=>server.close(resolvePromise));}
