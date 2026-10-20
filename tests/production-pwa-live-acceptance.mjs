/**
 * Low-volume live production acceptance measurements.
 * The application page itself is NEVER evaluated: its main thread may be busy
 * during first service-worker activation; navigation/resource timing is CDP-only.
 * A separate clean same-origin page runs the actual location-search and rules modules.
 * No user/auth data, request bodies, tokens, emails, or cookies are reported.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const BASE=String(process.env.SMV_PRODUCTION_BASE_URL||'https://smvastroservices.pages.dev').replace(/\/+$/,'');
const HOROSCOPE=BASE+'/horoscope/';
const CALENDAR=BASE+'/horoscope/calendar/';
const OUT=new URL('../artifacts/production-pwa-network-firebase-profile.json',import.meta.url);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const safeUrl=value=>{try{const u=new URL(value);return {origin:u.origin,path:u.pathname};}catch{return {origin:'unknown',path:'/'};}};
const isShard=value=>/\/offline\/places\/india\/[^/]+\.json$/i.test(safeUrl(value).path)&&!/india-manifest\.json$/i.test(safeUrl(value).path);
const rpcClass=value=>{
 const u=safeUrl(value),p=u.path;
 if(u.origin==='https://firestore.googleapis.com'){
  if(/documents:batchGet/i.test(p))return 'Firestore documents:batchGet';
  if(/documents:runQuery/i.test(p))return 'Firestore documents:runQuery';
  if(/documents:commit/i.test(p))return 'Firestore documents:commit';
  if(/Firestore\/Listen\/channel/i.test(p))return 'Firestore Listen channel';
  if(/\/documents\//i.test(p))return 'Firestore document endpoint';
  return 'Firestore other';
 }
 if(u.origin==='https://identitytoolkit.googleapis.com')return 'Firebase Auth identity toolkit';
 if(u.origin==='https://securetoken.googleapis.com')return 'Firebase Auth secure token';
 if(u.origin==='https://smvastroservices.onrender.com')return 'SMV Render backend';
 return null;
};
const clean=x=>({targetType:x.targetType,origin:safeUrl(x.url).origin,path:safeUrl(x.url).path.replace(/\/documents\/.*/,'/documents/[redacted]'),method:x.method,type:x.type,status:x.status??null,durationMs:x.durationMs==null?null:+x.durationMs.toFixed(1),transferredBytes:x.bytes??null,failure:x.failure||null,fromServiceWorker:!!x.fromServiceWorker});
function collector(browser){
 const rows=[],attached=new WeakSet(),byPage=new WeakMap();
 async function attach(target){
  if(attached.has(target)||!['page','service_worker','worker','shared_worker','iframe'].includes(target.type()))return;
  attached.add(target);
  let cdp;try{cdp=await target.createCDPSession();await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});}catch{return;}
  const targetType=target.type(),pending=new Map();
  byPage.set(target,{cdp});
  cdp.on('Network.requestWillBeSent',e=>{
   const previous=pending.get(e.requestId);
   if(previous){previous.failure='redirected';rows.push(previous);}
   pending.set(e.requestId,{targetType,url:e.request.url||'',method:e.request.method||'GET',type:e.type||'Other',start:e.timestamp,status:null,bytes:null,durationMs:null,failure:null,fromServiceWorker:false});
  });
  cdp.on('Network.responseReceived',e=>{const x=pending.get(e.requestId);if(x){x.status=Number(e.response?.status||0);x.fromServiceWorker=!!e.response?.fromServiceWorker;}});
  cdp.on('Network.loadingFinished',e=>{
   const x=pending.get(e.requestId);if(!x)return;
   x.bytes=Math.max(0,Number(e.encodedDataLength||0));x.durationMs=Math.max(0,(e.timestamp-x.start)*1000);rows.push(x);pending.delete(e.requestId);
  });
  cdp.on('Network.loadingFailed',e=>{
   const x=pending.get(e.requestId);if(!x)return;
   x.failure=String(e.errorText||'network failure').slice(0,100);rows.push(x);pending.delete(e.requestId);
  });
 }
 browser.on('targetcreated',target=>{void attach(target);});
 return {
  attach,rows,
  mark:()=>({index:rows.length,time:Date.now()}),
  since:m=>rows.slice(m.index).filter(x=>x.startedAt==null||true),
  countFrom:m=>rows.slice(m.index),
  sessions:byPage
 };
}
function summary(rows){
 const completed=rows.filter(x=>x.bytes!=null);
 const measured=completed.filter(x=>x.targetType==='service_worker'||x.targetType==='worker'||(x.targetType==='page'&&!x.fromServiceWorker));
 const sorted=measured.map(x=>x.durationMs).filter(Number.isFinite).sort((a,b)=>a-b);
 const bytesByType={},origins={};
 for(const x of measured){
  const kind=String(x.type||'Other').toLowerCase();bytesByType[kind]=(bytesByType[kind]||0)+Number(x.bytes||0);
  const host=safeUrl(x.url).origin;if(!origins[host])origins[host]={requests:0,transferredBytes:0};origins[host].requests++;origins[host].transferredBytes+=Number(x.bytes||0);
 }
 return {
  requestEvents:rows.length,completedRequests:completed.length,
  failedRequests:rows.filter(x=>x.failure&&x.failure!=='redirected').map(clean).slice(0,15),
  wireRequests:measured.length,transferredBytes:measured.reduce((a,x)=>a+Number(x.bytes||0),0),
  resourceBytes:bytesByType,
  durationMs:{p50:sorted.length?+sorted[Math.floor((sorted.length-1)*.5)].toFixed(1):null,p95:sorted.length?+sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.95)-1)].toFixed(1):null,max:sorted.length?+Math.max(...sorted).toFixed(1):null},
  byOrigin:origins
 };
}
function summarizeRpc(rows,prefix){
 const relevant=rows.filter(x=>String(rpcClass(x.url)||'').startsWith(prefix)),byClass={};
 for(const x of relevant){const k=rpcClass(x.url);if(!byClass[k])byClass[k]={requests:0,statuses:{}};byClass[k].requests++;const s=x.status==null?'no-response':String(x.status);byClass[k].statuses[s]=(byClass[k].statuses[s]||0)+1;}
 return {requests:relevant.length,byClass,rows:relevant.map(clean).slice(0,25)};
}
async function fetchManifest(path){
 const url=BASE+path;const started=Date.now();
 try{
  const res=await fetch(url,{cache:'no-store'});
  let data=null;try{data=await res.json();}catch{}
  return {path,status:res.status,elapsedMs:Date.now()-started,name:data?.name||null,scope:data?.scope||null,start_url:data?.start_url||null,icons:(data?.icons||[]).map(i=>({src:i.src,sizes:i.sizes,purpose:i.purpose||'any'}))};
 }catch(e){return {path,status:null,elapsedMs:Date.now()-started,error:String(e?.message||e).slice(0,150),icons:[]};}
}
async function capturePage(browser,net,url,label){
 const page=await browser.newPage();
 await page.setViewport({width:390,height:844,deviceScaleFactor:3,isMobile:true,hasTouch:true});
 await page.setUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
 await net.attach(page.target());
 const mark=net.mark(),started=Date.now(),navs=[];
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navs.push({at:Date.now(),path:safeUrl(frame.url()).path});});
 let response=null,error=null;
 try{response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});}catch(e){error=String(e?.message||e).slice(0,200);}
 // Never execute page JS for this measurement. Observe the browser/CDP lifecycle only.
 await Promise.race([new Promise(resolve=>page.once('load',resolve)),sleep(3000)]);
 const rows=net.countFrom(mark);
 return {page,label,url:safeUrl(url),httpStatus:response?.status()??null,error,wallClockToDOMContentLoadedMs:response?Date.now()-started:null,mainFrameNavigationEvents:navs.length,navigations:navs.slice(0,5),network:summary(rows),requestEvents:rows};
}
async function serviceWorkerTargets(browser,needle){
 const started=Date.now();let found=[];
 while(Date.now()-started<9000){
  found=browser.targets().filter(t=>t.type()==='service_worker'&&safeUrl(t.url()).path.endsWith(needle)).map(t=>({type:t.type(),url:safeUrl(t.url())}));
  if(found.length)return {observed:true,targets:found,waitMs:Date.now()-started};
  await sleep(300);
 }
 return {observed:false,targets:found,waitMs:Date.now()-started};
}
async function cleanSameOriginHarness(browser,net,path,label){
 const page=await browser.newPage();
 await net.attach(page.target());
 const response=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:30000});
 // document.open() replaces the page contents while preserving the same origin.
 await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="audit-harness"></main></body></html>');
 return {page,status:response?.status()??null,label};
}
async function cacheShardRows(page){
 return page.evaluate(async()=>{
  const out=[];
  for(const n of await caches.keys()){
   const c=await caches.open(n);
   for(const req of await c.keys())if(/\/offline\/places\/india\/[^/]+\.json$/i.test(new URL(req.url).pathname)&&!/india-manifest\.json$/i.test(new URL(req.url).pathname))out.push({cache:n,path:new URL(req.url).pathname});
  }
  return {cacheNames:await caches.keys(),placeShards:out};
 });
}
async function installAndSearchCalendar(browser,net,report){
 const pwa=await capturePage(browser,net,CALENDAR,'Calendar PWA cold navigation');
 const manifest=await fetchManifest('/horoscope/calendar/manifest-en.webmanifest');
 const preTargets=await serviceWorkerTargets(browser,'/horoscope/calendar/sw.js');
 const installShardRequests=pwa.requestEvents.filter(x=>isShard(x.url));
 report.checks.calendarColdStart={httpStatus:pwa.httpStatus,pageLoadMs:pwa.wallClockToDOMContentLoadedMs,network:pwa.network,manifest,serviceWorkerTarget:preTargets,shardRequestsDuringInstall:installShardRequests.length};
 assert.equal(pwa.httpStatus,200,'Calendar PWA homepage must return HTTP 200');
 assert.equal(manifest.status,200,'Calendar manifest HTTP 200');
 assert.equal(installShardRequests.length,0,'Calendar install must not download any location shard');
 assert.ok(manifest.icons.some(i=>i.sizes==='192x192')&&manifest.icons.some(i=>i.sizes==='512x512'),'Calendar manifest must list 192/512 icons');
 // Create an empty, same-origin document under the Calendar URL; do not load the
 // Calendar app's UI scripts into this query harness.
 const harness=await cleanSameOriginHarness(browser,net,'/horoscope/calendar/manifest-en.webmanifest','Calendar clean same-origin search harness');
 const page=harness.page;
 const before=await cacheShardRows(page);
 assert.equal(before.placeShards.length,0,'fresh install must have zero location shards before the first search');
 const mark=net.mark(),started=Date.now();
 const search=await page.evaluate(async()=>{
  const mod=await import('/horoscope/offline/places/place-search.mjs');
  const rows=await mod.searchPlaces('Perambalur',12);
  return {query:'Perambalur',count:rows.length,matched:rows.some(r=>JSON.stringify(r).toLowerCase().includes('perambalur')),sample:rows.slice(0,2)};
 });
 const searchMs=Date.now()-started;
 await sleep(500);
 const after=await cacheShardRows(page);
 const downloaded=net.countFrom(mark).filter(x=>isShard(x.url));
 assert.ok(search.count>0&&search.matched,'Perambalur should return a real place row');
 assert.ok(after.placeShards.length>0,'first query should cache location parts');
 // Worker-target requests can race CDP session attachment; CacheStorage row deltas are the durable proof of on-demand fetch/cache.
 report.checks.calendarLazyPlaceCache={pass:true,beforeSearch:before,afterSearch:after,firstSearch:{query:search.query,results:search.count,matched:search.matched,elapsedMs:searchMs,networkShardEventsSeen:downloaded.length,cachedShardPaths:after.placeShards.map(x=>x.path)}};
 await page.close();
 return pwa;
}
async function firebaseQuotaProfile(browser,net,report){
 const harness=await cleanSameOriginHarness(browser,net,'/horoscope/manifest-en.webmanifest','Firebase clean same-origin rules harness');
 const page=harness.page;
 await page.addScriptTag({url:BASE+'/horoscope/prediction-rules-published.js'});
 await page.addScriptTag({url:BASE+'/horoscope/prediction-rule-engine.js'});
 await page.addScriptTag({type:'module',url:BASE+'/horoscope/prediction-rules-sync.mjs'});
 const apiReady=await page.evaluate(()=>!!window.SMVPredictionRulesSync?.ensureReady);
 assert.ok(apiReady,'Published prediction rules sync module must load in clean same-origin harness');
 const idleMark=net.mark();
 await page.evaluate(()=>{
  const root=document.getElementById('audit-harness');
  for(let i=0;i<20;i++){const n=document.createElement('p');n.textContent='safe mutation '+i;root.appendChild(n);}
  root.querySelectorAll('p').forEach(n=>n.remove());
  window.dispatchEvent(new CustomEvent('smv-language',{detail:'ta'}));
  window.dispatchEvent(new CustomEvent('smv-language',{detail:'en'}));
  window.scrollTo(0,document.body.scrollHeight);window.scrollTo(0,0);
 });
 await sleep(700);
 const idleRequests=net.countFrom(idleMark),idleFirestore=summarizeRpc(idleRequests,'Firestore '),idleRender=summarizeRpc(idleRequests,'SMV Render backend');
 assert.equal(idleFirestore.requests,0,'DOM mutations, scroll and language events before a report must not read Firestore');
 const rulesMark=net.mark(),readStarted=Date.now();
 const first=await page.evaluate(async()=>{
  try{await window.SMVPredictionRulesSync.ensureReady();return {available:true,settled:true};}
  catch(e){return {available:true,settled:false,error:String(e?.message||e).slice(0,120)};}
 });
 await sleep(900);
 const firstRows=net.countFrom(rulesMark),firstFirestore=summarizeRpc(firstRows,'Firestore '),elapsed=Date.now()-readStarted;
 const repeatMark=net.mark();
 const repeat=await page.evaluate(async()=>{
  try{await window.SMVPredictionRulesSync.ensureReady();return {settled:true};}
  catch(e){return {settled:false,error:String(e?.message||e).slice(0,120)};}
 });
 await sleep(600);
 const repeatRows=net.countFrom(repeatMark),repeatFirestore=summarizeRpc(repeatRows,'Firestore ');
 assert.equal(repeatFirestore.requests,0,'a repeat ensureReady call must not issue a second Firestore read');
 report.firebaseProfile={scope:'clean same-origin module harness; anonymous/read-only; no writes or auth',
  staticSourceGuard:true,idle:{requests:idleRequests.length,firestore:idleFirestore,render:idleRender,scenarios:['20 benign DOM insert/remove cycles','language event ta/en','scroll to bottom/top'],pass:idleFirestore.requests===0},
  explicitPublishedRulesRead:{outcome:first,elapsedMs:elapsed,firestore:firstFirestore,readObserved:firstFirestore.requests>0,interpretation:'Firestore transport count is reported as observed; an unobserved transport may mean static fallback/permission/network failure.'},
  repeatEnsureReady:{outcome:repeat,firestore:repeatFirestore,pass:repeatFirestore.requests===0}};
 assert.equal(idleFirestore.requests,0,'idle client path has zero Firestore reads');
 assert.equal(repeatFirestore.requests,0,'repeat rules call is cached/in-flight');
 await page.close();
}
async function run(){
 const report={generatedAt:new Date().toISOString(),environment:{node:process.version,platform:process.platform,base:safeUrl(BASE).origin,browser:null},
  methodology:{mainHoroscope:'CDP only; no JavaScript evaluation of potentially unresponsive production UI',httpCache:'disabled in every attached target',firebase:'anonymous, one read-only published rule fetch, no writes',android:'Android-sized Chromium, not physical Android launcher install'},
  checks:{},networkTrials:[],firebaseProfile:{},androidDeviceValidation:{status:'NOT_RUN',reason:'No attached physical Android device/ADB or home-screen launcher UI in this runner.'}};
 const ruleSync=(await (await import('node:fs/promises')).readFile(new URL('../public/horoscope/prediction-rules-sync.mjs',import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 const reportStore=(await (await import('node:fs/promises')).readFile(new URL('../public/horoscope/report-store.mjs',import.meta.url),'utf8')).replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.ok(ruleSync.includes('getDocFromServer')&&ruleSync.includes('if(initial)return initial'),'published rules use one coalesced lazy read');
 assert.ok(!/\b(onSnapshot|setInterval|MutationObserver)\b/.test(ruleSync),'rules sync has no listeners/polling/DOM reader');
 assert.ok(!/\b(onSnapshot|setInterval|MutationObserver)\b/.test(reportStore),'saved-report sync has no realtime listener/poll timer/DOM reader');
 report.checks.staticQuotaGuard={pass:true,publishedRules:'first explicit report/Admin entry only; single-flight promise',savedReports:'no realtime listener, interval or MutationObserver reader'};
 const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:chromium.headless,defaultViewport:chromium.defaultViewport,protocolTimeout:60000});
 report.environment.browser=await browser.version();
 const net=collector(browser);
 try{
  console.log('[acceptance] live Horoscope cold navigation');
  const first=await capturePage(browser,net,HOROSCOPE,'Horoscope PWA cold navigation');
  const manifest=await fetchManifest('/horoscope/manifest-en.webmanifest');
  const worker=await serviceWorkerTargets(browser,'/horoscope/sw.js');
  report.networkTrials.push({label:'Horoscope PWA cold navigation',httpStatus:first.httpStatus,wallClockToDOMContentLoadedMs:first.wallClockToDOMContentLoadedMs,network:first.network,mainFrameNavigationEvents:first.mainFrameNavigationEvents});
  report.checks.horoscopeColdStart={httpStatus:first.httpStatus,pageLoadMs:first.wallClockToDOMContentLoadedMs,manifest,serviceWorkerTarget:worker,network:first.network};
  assert.equal(first.httpStatus,200,'Horoscope homepage HTTP 200');
  assert.equal(manifest.status,200,'Horoscope manifest HTTP 200');
  assert.ok(manifest.icons.some(i=>i.sizes==='192x192')&&manifest.icons.some(i=>i.sizes==='512x512'),'Horoscope manifest must list 192/512 icons');
  console.log('[acceptance] simulate origin data purge/reinstall');
  const cdp=await first.page.target().createCDPSession();
  await cdp.send('Storage.clearDataForOrigin',{origin:BASE,storageTypes:'all'});
  await cdp.send('Network.clearBrowserCache').catch(()=>{});
  await browser.defaultBrowserContext().clearCookies().catch(()=>{});
  const afterPurge=await capturePage(browser,net,HOROSCOPE,'Horoscope after origin storage purge / reinstall simulation');
  const restoredManifest=await fetchManifest('/horoscope/manifest-en.webmanifest');
  const restoredWorker=await serviceWorkerTargets(browser,'/horoscope/sw.js');
  report.checks.horoscopeReinstallSimulation={pass:afterPurge.httpStatus===200&&restoredManifest.status===200,storagePurgeCommandSucceeded:true,afterPurge:{httpStatus:afterPurge.httpStatus,manifestStatus:restoredManifest.status,serviceWorkerTarget:restoredWorker,network:afterPurge.network,mainFrameNavigationEvents:afterPurge.mainFrameNavigationEvents},note:'This is browser origin storage purge/reload. Android launcher shortcut removal/reinstallation remains physical-device NOT_RUN.'};
  report.networkTrials.push({label:'Horoscope after origin storage purge / reinstall simulation',httpStatus:afterPurge.httpStatus,wallClockToDOMContentLoadedMs:afterPurge.wallClockToDOMContentLoadedMs,network:afterPurge.network,mainFrameNavigationEvents:afterPurge.mainFrameNavigationEvents});
  assert.equal(afterPurge.httpStatus,200,'Horoscope remains online after simulated reinstall');
  assert.equal(restoredManifest.status,200,'Horoscope manifest must be restored after purge');
  await first.page.close().catch(()=>{});await afterPurge.page.close().catch(()=>{});
  console.log('[acceptance] Calendar lazy shard cache');
  await installAndSearchCalendar(browser,net,report);
  console.log('[acceptance] Firebase lazy rules read and idle guard');
  await firebaseQuotaProfile(browser,net,report);
  const all=net.rows;
  report.firebaseProfile.totalObservedFirestore=summarizeRpc(all,'Firestore ');
  report.firebaseProfile.totalObservedRenderBackend=summarizeRpc(all,'SMV Render backend');
  report.networkSummary={trials:report.networkTrials,totalCapturedRequestEvents:all.length,wire:summary(all),note:'Network transfer bytes and resource timings are Chromium CDP encodedDataLength and timestamps from live production HTTP requests.'};
  report.checks.pass=true;
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  await writeFile(OUT,JSON.stringify(report,null,2)+'\n','utf8');
  console.log('SMV_PRODUCTION_PWA_FIREBASE_PROFILE='+JSON.stringify(report));
 }finally{await browser.close();}
}
run().catch(async e=>{
 const failure={generatedAt:new Date().toISOString(),status:'FAILED_BEFORE_PROFILE_COMPLETION',error:{name:String(e?.name||'Error'),message:String(e?.message||e).slice(0,400),stack:String(e?.stack||'').split(/\r?\n/).slice(0,8).join('\n')},androidDeviceValidation:{status:'NOT_RUN',reason:'No physical Android device/ADB in runner.'}};
 try{await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(OUT,JSON.stringify(failure,null,2)+'\n','utf8');}catch{}
 console.error(JSON.stringify(failure));process.exitCode=1;
});
