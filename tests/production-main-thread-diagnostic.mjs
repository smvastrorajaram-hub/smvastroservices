/**
 * Diagnoses a non-responsive deployed Horoscope page without evaluating page JS.
 * Chromium Debugger.pause interrupts the renderer at its current instruction and
 * records source URL / line / function names. Captures network bytes and reloads,
 * but no page data, cookies, credentials or request bodies.
 */
import fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const BASE=String(process.env.SMV_PRODUCTION_BASE_URL||'https://smvastroservices.pages.dev').replace(/\/+$/,'');
const URL=BASE+'/horoscope/';
const OUT=new URL('../artifacts/production-main-thread-diagnostic.json',import.meta.url);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safeUrl=value=>{try{const u=new URL(value);return {origin:u.origin,path:u.pathname};}catch{return {origin:'unknown',path:'/'};}};

async function run(){
 const report={
  generatedAt:new Date().toISOString(),
  target:safeUrl(URL),
  environment:{node:process.version,platform:process.platform,browser:null},
  navigation:{status:null,events:[],failedDocuments:[]},
  network:{completedRequests:0,transferredBytes:0,resources:{},p50DurationMs:null,p95DurationMs:null},
  debugger:{pauseRequested:false,paused:false,reason:null,topFrames:[],hitBreakpoints:[]},
  verdict:'INCONCLUSIVE'
 };
 const browser=await puppeteer.launch({
  args:chromium.args,
  executablePath:await chromium.executablePath(),
  headless:chromium.headless,
  defaultViewport:chromium.defaultViewport,
  dumpio:true,
  protocolTimeout:60000
 });
 report.environment.browser=await browser.version();
 try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
  const cdp=await page.target().createCDPSession();
  await Promise.all([cdp.send('Page.enable'),cdp.send('Runtime.enable'),cdp.send('Debugger.enable'),cdp.send('Network.enable')]);
  const pending=new Map(),durations=[],frames=new Map();
  let resolvePaused;
  const pausedPromise=new Promise(resolve=>{resolvePaused=resolve;});
  cdp.on('Page.frameNavigated',e=>{
   if(!e.frame.parentId)report.navigation.events.push({kind:'main-frame-navigation',url:safeUrl(e.frame.url),at:Date.now()});
  });
  cdp.on('Network.requestWillBeSent',e=>{
   pending.set(e.requestId,{url:e.request.url,type:e.type||'Other',method:e.request.method||'GET',startedAt:e.timestamp});
  });
  cdp.on('Network.responseReceived',e=>{
   const r=pending.get(e.requestId);if(r)r.status=Number(e.response?.status||0);
  });
  cdp.on('Network.loadingFinished',e=>{
   const r=pending.get(e.requestId);if(!r)return;
   r.bytes=Math.max(0,Number(e.encodedDataLength||0));
   r.durationMs=Math.max(0,(e.timestamp-r.startedAt)*1000);
   report.network.completedRequests++;
   report.network.transferredBytes+=r.bytes;
   report.network.resources[r.type]=(report.network.resources[r.type]||0)+r.bytes;
   durations.push(r.durationMs);pending.delete(e.requestId);
  });
  cdp.on('Network.loadingFailed',e=>{
   const r=pending.get(e.requestId);if(!r)return;
   if(r.type==='Document')report.navigation.failedDocuments.push({url:safeUrl(r.url),error:String(e.errorText||'').slice(0,100)});
   pending.delete(e.requestId);
  });
  cdp.on('Debugger.paused',async event=>{
   report.debugger.paused=true;
   report.debugger.reason=event.reason||'unknown';
   report.debugger.topFrames=(event.callFrames||[]).slice(0,20).map(f=>({
    functionName:(f.functionName||'(anonymous)').slice(0,120),
    url:safeUrl(f.url||''),
    lineNumber:Number(f.location?.lineNumber??-1)+1,
    columnNumber:Number(f.location?.columnNumber??-1)+1,
    scriptId:f.location?.scriptId||null
   }));
   report.debugger.hitBreakpoints=event.hitBreakpoints||[];
   resolvePaused();
  });
  let navError=null;
  const started=Date.now();
  try{
   const response=await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000});
   report.navigation.status=response?.status()??null;
   report.navigation.domContentLoadedWallMs=Date.now()-started;
  }catch(e){
   navError=String(e?.message||e).slice(0,250);
   report.navigation.error=navError;
  }
  // Wait for any service-worker activation reload and a short settle window
  // before interrupting the live renderer; never call page.evaluate.
  await sleep(2500);
  report.debugger.pauseRequested=true;
  let pauseError=null;
  try{
   await cdp.send('Debugger.pause');
   await Promise.race([pausedPromise,sleep(8000)]);
  }catch(e){pauseError=String(e?.message||e).slice(0,250);}
  report.debugger.pauseCommandError=pauseError;
  report.debugger.waitedAfterNavigationMs=Date.now()-started;
  report.navigation.failedDocuments=report.navigation.failedDocuments.slice(-10);
  report.network.p50DurationMs=durations.length?+durations.sort((a,b)=>a-b)[Math.floor((durations.length-1)*.5)].toFixed(1):null;
  report.network.p95DurationMs=durations.length?+durations[Math.min(durations.length-1,Math.ceil(durations.length*.95)-1)].toFixed(1):null;
  if(report.debugger.paused){
   const top=report.debugger.topFrames[0];
   report.verdict=top&&top.url.path!=='/'?'PAUSED_IN_JAVASCRIPT':'PAUSED_WITHOUT_SOURCE_FRAME';
  }else if(navError){
   report.verdict='NAVIGATION_DID_NOT_REACH_DOM_CONTENT_LOADED';
  }else{
   report.verdict='NO_DEBUGGER_PAUSE_CAPTURED';
  }
  console.log('SMV_PRODUCTION_MAIN_THREAD_DIAGNOSTIC='+JSON.stringify(report));
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  await writeFile(OUT,JSON.stringify(report,null,2)+'\n','utf8');
  try{await cdp.send('Debugger.resume');}catch{}
  await cdp.detach().catch(()=>{});
  await page.close().catch(()=>{});
 }finally{await browser.close();}
}
run().catch(async e=>{
 const failure={generatedAt:new Date().toISOString(),verdict:'DIAGNOSTIC_HARNESS_FAILED',error:{name:String(e?.name||'Error'),message:String(e?.message||e).slice(0,400)}};
 try{await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(OUT,JSON.stringify(failure,null,2)+'\n','utf8');}catch{}
 console.error(JSON.stringify(failure));process.exitCode=1;
});
