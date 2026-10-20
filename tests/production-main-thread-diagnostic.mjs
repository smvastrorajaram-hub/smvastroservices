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
const HOROSCOPE_URL=BASE+'/horoscope/';
const OUT=new URL('../artifacts/production-main-thread-diagnostic.json',import.meta.url);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const safeUrl=value=>{try{const u=new URL(value);return {origin:u.origin,path:u.pathname};}catch{return {origin:'unknown',path:'/'};}};

async function run(){
 const report={
  generatedAt:new Date().toISOString(),
  target:safeUrl(HOROSCOPE_URL),
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
  cdp.on('Debugger.scriptParsed',e=>frames.set(String(e.scriptId),{url:String(e.url||''),hash:e.hash||null,executionContextId:e.executionContextId??null,startLine:e.startLine??0,startColumn:e.startColumn??0,endLine:e.endLine??null,endColumn:e.endColumn??null}));
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
  cdp.on('Debugger.paused',event=>{
   report.debugger.paused=true;
   report.debugger.reason=event.reason||'unknown';
   report.debugger.hitBreakpoints=event.hitBreakpoints||[];
   report.debugger.topFrames=(event.callFrames||[]).slice(0,12).map(f=>{
    const id=String(f.location?.scriptId||'');
    const meta=frames.get(id)||{};
    return {functionName:(f.functionName||'(anonymous)').slice(0,120),url:safeUrl(f.url||meta.url||''),sourceUrl:meta.url||'(inline-or-eval)',scriptHash:meta.hash||null,scriptId:id,lineNumber:Number(f.location?.lineNumber??-1)+1,columnNumber:Number(f.location?.columnNumber??-1)+1,scriptLength:null,sourceExcerpt:null};
   });
   void (async()=>{
    for(const frame of report.debugger.topFrames.slice(0,4)){
     if(!frame.scriptId)continue;
     try{
      const result=await cdp.send('Debugger.getScriptSource',{scriptId:frame.scriptId});
      const source=String(result.scriptSource||'');
      const lines=source.split(/\r?\n/);
      const line=Math.max(0,frame.lineNumber-1);
      const lineText=lines[line]||'';
      const pos=Math.min(Math.max(0,frame.columnNumber-1),lineText.length);
      let excerpt=lineText.slice(Math.max(0,pos-350),Math.min(lineText.length,pos+350));
      excerpt=excerpt.replace(/AIza[0-9A-Za-z_-]{20,}/g,'[redacted-api-key]').replace(/Bearer\s+[A-Za-z0-9._~-]{12,}/g,'Bearer [redacted]');
      frame.scriptLength=source.length;
      frame.sourceExcerpt=excerpt;
     }catch(e){frame.sourceFetchError=String(e?.message||e).slice(0,120);}
    }
    resolvePaused();
   })();
  });
  let navError=null;
  const started=Date.now();
  try{
   const response=await page.goto(HOROSCOPE_URL,{waitUntil:'domcontentloaded',timeout:30000});
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
  const pauseSend=cdp.send('Debugger.pause').then(()=>({sent:true}),e=>({error:String(e?.message||e).slice(0,250)}));
  const pauseDispatch=await Promise.race([pauseSend,sleep(6500).then(()=>({timeout:true}))]);
  if(pauseDispatch.timeout)pauseError='Debugger.pause command did not return within 6500ms';
  else if(pauseDispatch.error)pauseError=pauseDispatch.error;
  if(!report.debugger.paused){
   const pauseResult=await Promise.race([pausedPromise.then(()=>({paused:true})),sleep(6500).then(()=>({timeout:true}))]);
   if(pauseResult.timeout)report.debugger.pauseWaitTimedOut=true;
  }
  report.debugger.pauseCommandError=pauseError;
  report.debugger.waitedAfterNavigationMs=Date.now()-started;
  report.navigation.failedDocuments=report.navigation.failedDocuments.slice(-10);
  const sortedDurations=durations.slice().sort((a,b)=>a-b);
  report.network.p50DurationMs=sortedDurations.length?+sortedDurations[Math.floor((sortedDurations.length-1)*.5)].toFixed(1):null;
  report.network.p95DurationMs=sortedDurations.length?+sortedDurations[Math.min(sortedDurations.length-1,Math.ceil(sortedDurations.length*.95)-1)].toFixed(1):null;
  if(report.debugger.paused){
   const top=report.debugger.topFrames[0];
   report.verdict=top&&top.url.path!=='/'?'PAUSED_IN_JAVASCRIPT':'PAUSED_WITHOUT_SOURCE_FRAME';
  }else if(navError){
   report.verdict='NAVIGATION_DID_NOT_REACH_DOM_CONTENT_LOADED';
  }else if(pauseError||report.debugger.pauseWaitTimedOut){
   report.verdict='DEBUGGER_UNRESPONSIVE_OR_RENDERER_BUSY';
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
