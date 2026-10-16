// Browser and A4 Print QA: all 3 styles, real two-person Swiss/Varga/BAV data.
import assert from 'node:assert/strict';
import {mkdir,writeFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {full} from '../public/horoscope/offline/offline-engine.mjs';
import {transit} from '../public/horoscope/offline/transit_panchang.browser.mjs';
import {renderBasicMatching} from '../public/horoscope/marriage-basic-report.mjs';
const root=new URL('../public/horoscope/',import.meta.url),output=new URL('../marriage-print-smoke-output/',import.meta.url);
await mkdir(output,{recursive:true});
const people=[];
for(const [name,date,time,lat,lon,zone,utc] of [
 ['Bride audit','1992-07-31','22:05',11.232,78.88,'Asia/Kolkata',330],
 ['Groom audit','1994-06-15','13:03',51.5074,-.1278,'Europe/London',60]]){
 const r=await full({name,date,time,lat,lon,utcOffsetMinutes:utc,language:'ta'});
 assert.ok(r.ok&&r.advanced,'complete Swiss natal and classical calculations');
 Object.assign(r.chart,{advanced:r.advanced,birthName:name,birthDate:date,birthTime:time,birthPlace:name,birthLat:lat,birthLon:lon,birthTimezone:zone,birthOffsetMinutes:utc});
 people.push(r.chart);
}
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
  const fixture=new URL('__matching_print_smoke_temp.html',root);
  const document='<html lang="ta"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="marriage-basic-report.css"></head><body><main id="printReport">'+html+'</main></body></html>';
  await writeFile(fixture,document);
  await page.setViewport({width:360,height:800,deviceScaleFactor:1});
  await page.goto(fixture.href,{waitUntil:'load'});
  const mobile=await page.evaluate(()=>{
   const charts=[...document.querySelectorAll('.mm-base-chart')];
   const tables=[...document.querySelectorAll('.mm-base-table')];
   const first=charts[0],groom=charts[4],rectangle=first?.getBoundingClientRect();
   const cell0=first?.querySelector('.mm-base-pos-0')?.getBoundingClientRect();
   const cell11=first?.querySelector('.mm-base-pos-11')?.getBoundingClientRect();
   const wrap=document.querySelector('.mm-base-shad-components')?.closest('.mm-base-scroll');
   const td=document.querySelector('.mm-base-shad-components td');
   const extra=charts.map(c=>c.innerText).join(' ');
   const allPlanets=[...document.querySelectorAll('.mm-base-planet')].map(c=>c.textContent);
   return {
    charts:charts.length,tables:tables.length,firstStyle:first?.dataset.chartStyle,groomStyle:groom?.dataset.chartStyle,
    rectWidth:rectangle?.width||0,
    firstCell:{left:cell0?.left-rectangle?.left,top:cell0?.top-rectangle?.top},
    lastCell:{left:cell11?.left-rectangle?.left,top:cell11?.top-rectangle?.top},
    whiteSpace:td&&getComputedStyle(td).whiteSpace,
    scrollWidth:wrap?.scrollWidth,clientWidth:wrap?.clientWidth,
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
  assert.ok(mobile.rectWidth>=250&&mobile.rectWidth<=360,'Chart mobile size: '+style);
  assert.equal(mobile.whiteSpace,'nowrap','No split words in Shadbala mobile table: '+style);
  assert.ok(mobile.scrollWidth>mobile.clientWidth,'Wide tables must scroll on mobile: '+style);
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
  const print=await page.evaluate(()=>{
   const first=document.querySelector('.mm-base-chart'),groom=document.querySelectorAll('.mm-base-chart')[4],css=getComputedStyle(first),rect=first.getBoundingClientRect();
   return {style:first.dataset.chartStyle,groomStyle:groom.dataset.chartStyle,width:rect.width,height:rect.height,display:css.display,planets:[...first.querySelectorAll('.mm-base-planet')].length};
  });
  assert.ok(print.width>180&&print.height>180,'Print chart not blank: '+style);
  assert.equal(print.style,style,'Print bride style changed unexpectedly');
  assert.equal(print.groomStyle,groomStyle,'Print groom style changed unexpectedly');
  results.push({style:testName,pdfBytes:size,mobile,print});
  await page.emulateMediaType('screen');
 }
 console.log(JSON.stringify({pass:true,styles:results.map(x=>x.style),pdfBytes:results.map(x=>x.pdfBytes),charts:8,tables:results[0].mobile.tables,mobileAndPrint:true}));
}finally{await browser.close();}
