// Headless Chrome browser-native PDF smoke for the two-person calculation report.
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
for(const [name,date,time,lat,lon,zone,utc,style] of [
 ['Bride audit','1992-07-31','22:05',11.232,78.88,'Asia/Kolkata',330,'south'],
 ['Groom audit','1994-06-15','13:03',51.5074,-.1278,'Europe/London',60,'north']]){
 const r=await full({name,date,time,lat,lon,utcOffsetMinutes:utc,language:'ta'});
 assert.ok(r.ok&&r.advanced,'natal/advanced complete');
 Object.assign(r.chart,{advanced:r.advanced,birthName:name,birthDate:date,birthTime:time,birthPlace:name,birthLat:lat,birthLon:lon,birthTimezone:zone,birthOffsetMinutes:utc,birthChartStyle:style});
 people.push(r.chart);
}
const content=await renderBasicMatching(people[0],people[1],{
 language:'ta',brideStyle:'south',groomStyle:'north',reviewDate:'2026-10-16',
 transitFn:input=>transit(input),poruthamRows:[['தினம்',true,''],['ரஜ்ஜு',false,'']]
});
const template='<html lang="ta"><head><meta charset="utf-8"><link rel="stylesheet" href="marriage-basic-report.css"></head><body><main id="printReport">'+content+'</main></body></html>';
const fixture=new URL('__matching_print_smoke_temp.html',root);
await writeFile(fixture,template);
const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
try{
 const page=await browser.newPage();
 await page.setViewport({width:1100,height:850,deviceScaleFactor:1});
 await page.goto(fixture.href,{waitUntil:'load'});
 const computed=await page.evaluate(()=>{
  const cells=[...document.querySelectorAll('.mm-base-chart')];
  const tables=[...document.querySelectorAll('.mm-base-table')];
  return {charts:cells.length,tables:tables.length,
   width:cells[0]?.getBoundingClientRect().width,
   cssDisplay:cells[0]&&getComputedStyle(cells[0]).display,
   firstText:document.body.textContent.slice(0,140),
   svg:document.querySelectorAll('.mm-base-geometry').length,
   missingImages:document.querySelectorAll('img:not([src])').length};
 });
 assert.ok(computed.charts>=8,'Both person Rasi/D9/Bhava and transit charts are rendered');
 assert.ok(computed.tables>=15,'Calculation tables present for both people');
 assert.ok(computed.width>100&&computed.cssDisplay==='grid','Layout CSS applied to South chart');
 assert.ok(computed.svg>=2,'North Indian diamond drawing exists');
 await page.screenshot({path:fileURLToPath(new URL('matching-report-screen.png',output)),fullPage:false});
 await page.pdf({path:fileURLToPath(new URL('matching-report.pdf',output)),format:'A4',printBackground:true,preferCSSPageSize:true});
 const {size}=await stat(new URL('matching-report.pdf',output));
 assert.ok(size>25000,'PDF contains meaningful content');
 console.log(JSON.stringify({pass:true,pdfBytes:size,...computed}));
}finally{await browser.close();}
