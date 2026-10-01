'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const chromiumModule = require('@sparticuz/chromium');
// @sparticuz/chromium v153 can be exposed through a CJS default wrapper on Node 26.
// Normalize both module shapes once instead of mutating the imported namespace.
const chromium = chromiumModule?.default || chromiumModule;

function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function safeReportHtml(html=''){
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,'')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi,'')
    .replace(/<embed\b[^>]*>/gi,'')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'')
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*(?:javascript:|https?:\/\/)[\s\S]*?\1/gi,'');
}
function preprocessReportHtml(html=''){
  const source=String(html).replace(/\p{Extended_Pictographic}|\uFE0F/gu,'');
  // Pure string preprocessing: make collapsible report content printable before Chromium.
  // This avoids a huge page.evaluate()/CDP Runtime.callFunctionOn traversal.
  return safeReportHtml(source)
    .replace(/<img\b([^>]*)src=(['\"])assets\/vinayagar-report\.png\2([^>]*)>/gi,(m,a,q,b)=>ganeshaData?`<img ${a}src=${q}${ganeshaData}${q}${b}>`:'')
    .replace(/<img\b[^>]*>/gi,'')
    .replace(/<details\b([^>]*)>/gi,(m,a)=>/\bopen(?:\s|=|>|$)/i.test(a)?m:`<details open${a}>`)
    .replace(/\shidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi,'')
    .replace(/style\s*=\s*(["'])([\s\S]*?)\1/gi,(m,q,css)=>{
      const cleaned=css
        .replace(/(?:display\s*:\s*none|max-height\s*:\s*0(?:px)?|overflow\s*:\s*hidden|visibility\s*:\s*hidden)\s*;?/gi,'')
        .trim();
      return cleaned?`style=${q}${cleaned}${q}`:'';
    });
}
const tamilFontPath=path.join(__dirname,'public','horoscope','fonts','noto-sans-tamil.ttf');
const tamilFontUrl=fs.existsSync(tamilFontPath)?pathToFileURL(tamilFontPath).href:'';
const ganeshaPath=path.join(__dirname,'public','horoscope','assets','vinayagar-report.png');
const ganeshaData=fs.existsSync(ganeshaPath)?`data:image/png;base64,${fs.readFileSync(ganeshaPath).toString('base64')}`:'';
let renderTail=Promise.resolve();
async function singleFlight(fn){
 const previous=renderTail;
 let release;
 renderTail=new Promise(resolve=>{release=resolve});
 await previous.catch(()=>{});
 try{return await fn();}finally{release();}
}
function documentHtml({title,language,html}){
 const lang=language==='ta'?'ta':'en';
 return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
 ${tamilFontUrl?`@font-face{font-family:"SMVTamil";src:url("${tamilFontUrl}") format("truetype");font-weight:400 700;font-style:normal;font-display:block}`:''}
 @page{size:A4;margin:12mm 11mm 14mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff!important;color:#000!important;-webkit-print-color-adjust:economy!important;print-color-adjust:economy!important}body{font-family:${lang==='ta'?`"SMVTamil","Noto Sans Tamil",sans-serif`:`Arial,"Noto Sans",sans-serif`};font-size:9pt;line-height:1.34}#report{width:100%;max-width:none}.smv-print-brand{font-size:9pt;font-weight:700;text-align:center;letter-spacing:.2px;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:5px}.smv-print-title{font-size:14pt;text-align:center;margin:5px 0 10px;padding:0;border:0!important}h1,h2{font-size:11.5pt;margin:10px 0 4px;padding:0 0 2px;border:0!important;border-bottom:1px solid #000!important;break-after:avoid-page}h3,h4,h5,h6,.dasha-head,.smv-advanced-part-title{font-size:9.6pt;margin:7px 0 3px;padding:0;border:0!important;break-after:avoid-page}p{margin:2px 0 4px;orphans:3;widows:3}table{width:100%!important;border-collapse:collapse!important;table-layout:auto!important;margin:4px 0 7px;font-size:7.8pt;break-inside:auto!important}thead{display:table-header-group}tr{break-inside:avoid-page!important}th,td{border:1px solid #000!important;padding:2.5px 3px!important;vertical-align:top!important;white-space:normal!important;overflow-wrap:anywhere!important;background:#fff!important;background-image:none!important;color:#000!important;text-shadow:none!important;box-shadow:none!important}th{font-weight:700!important;text-align:center}.south-indian-chart{width:78mm!important;height:78mm!important;max-width:100%!important;margin:5px auto 7px!important;display:grid!important;break-inside:avoid-page!important}.print-chart,.chart-wrap,.chart-container,[class*="chart"]{break-inside:avoid-page!important;box-shadow:none!important;background:#fff!important;background-image:none!important;color:#000!important}.smv-advanced-part-content,.dasha-node>.dasha-body,.dasha-node .dasha-content{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important}.smv-advanced-part{break-inside:auto!important}details>summary{font-weight:700;margin:4px 0}.card,.section,.result-section,[class*="section"],[class*="card"]{background:#fff!important;background-image:none!important;color:#000!important;box-shadow:none!important;text-shadow:none!important;border-color:#000!important;filter:none!important}.card:before,.card:after,[class*="section"]:before,[class*="section"]:after{display:none!important}button,input,select,textarea,.horoscope-export-actions,.smv-horoscope-pay-gate,.no-print{display:none!important}img{display:none!important}svg,canvas{max-width:100%!important;height:auto!important;filter:grayscale(1)!important;break-inside:avoid-page}.smv-summary-grid,.smv-year-grid,.birth-panchang-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:0!important;border-top:1px solid #bbb;border-left:1px solid #bbb;margin:4px 0 7px}.smv-summary-grid>div,.smv-year-grid>div,.birth-panchang-grid>div,.mm-facts>div,.kota-name-details>div,.adv-detail-grid>div{display:grid!important;grid-template-columns:minmax(34%,42%) 1fr!important;column-gap:8px!important;align-items:start!important;border-right:1px solid #bbb;border-bottom:1px solid #bbb;padding:3px 5px!important;min-width:0}.smv-summary-grid b,.smv-year-grid b,.birth-panchang-grid b,.mm-facts b,.kota-name-details b,.adv-detail-grid b{display:grid!important;grid-template-columns:1fr auto;gap:5px;min-width:0}.smv-summary-grid b:after,.smv-year-grid b:after,.birth-panchang-grid b:after,.mm-facts b:after,.kota-name-details b:after,.adv-detail-grid b:after{content:":";font-weight:400}.smv-summary-grid span,.smv-year-grid span,.birth-panchang-grid span{min-width:0}.south-rasi-cell{border:1px solid #000!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;text-align:center!important;padding:3px!important;min-width:0!important;overflow:hidden!important;background:#fff!important}.south-rasi-cell .sign{font-weight:700!important;font-size:10pt!important;line-height:1.1!important;margin:0 0 2px!important}.south-rasi-cell .planet-line{display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;gap:2px!important;align-items:center!important;justify-content:center!important;width:100%!important;font-size:8pt!important;line-height:1.1!important}.south-rasi-cell .planet-degree{font-size:7pt!important;white-space:nowrap!important}.south-chart-center{grid-area:2/2/4/4!important;display:flex!important;align-items:center!important;justify-content:center!important;border:1px solid #000!important;background:#fff!important;color:#000!important;font-size:12pt!important;text-align:center!important}.smv-ganesha-prayer{text-align:center!important}.smv-ganesha-img{display:block!important;width:22mm!important;height:auto!important;margin:0 auto 3mm!important;filter:grayscale(1)!important}.smv-print-footer{display:none!important}@media print{a{color:#000!important;text-decoration:none!important}}
 </style></head><body><div class="smv-print-brand">SMV ASTRO SERVICES</div><h1 class="smv-print-title">${escapeHtml(title)}</h1><main id="report">${preprocessReportHtml(html)}</main></body></html>`;
}
async function renderHtmlPdf(opts={}){
 return singleFlight(async()=>{
  const executablePathFn = typeof chromium?.executablePath === 'function'
    ? chromium.executablePath.bind(chromium)
    : (typeof chromiumModule?.executablePath === 'function' ? chromiumModule.executablePath.bind(chromiumModule) : null);
  if(!executablePathFn)throw new Error('Bundled Chromium API is incompatible: executablePath() is unavailable.');
  const executablePath=await executablePathFn();
  if(!executablePath)throw new Error('Bundled Chromium executable could not be resolved.');
  const chromiumArgs=Array.isArray(chromium?.args)?chromium.args:(Array.isArray(chromiumModule?.args)?chromiumModule.args:[]);
  if(!chromiumArgs.length)throw new Error('Bundled Chromium API is incompatible: launch args are unavailable.');
  const extra=['--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--metrics-recording-only','--no-first-run','--no-zygote','--single-process','--renderer-process-limit=1','--allow-file-access-from-files','--js-flags=--max-old-space-size=80','--disable-features=Translate,BackForwardCache,MediaRouter,OptimizationHints'];
  const args=[...new Set([...chromiumArgs,...extra])];
  let browser=null,page=null;
  try{
   browser=await puppeteer.launch({headless:'shell',executablePath,args,protocolTimeout:45000,defaultViewport:{width:760,height:640,deviceScaleFactor:1}});
   page=await browser.newPage();
   await page.setJavaScriptEnabled(false);
   await page.setRequestInterception(true);
   page.on('request',req=>{
    const u=req.url();
    if(u.startsWith('file:')||u.startsWith('data:')||u==='about:blank')req.continue().catch(()=>{});
    else req.abort().catch(()=>{});
   });
   await page.setContent(documentHtml(opts),{waitUntil:'domcontentloaded',timeout:30000});
   // IMPORTANT: PDF HTML is preprocessed on the Node side in documentHtml().
   // Do not traverse/mutate the full report DOM through Runtime.callFunctionOn;
   // large horoscope reports can exceed Puppeteer's protocol timeout.
   // JavaScript stays disabled and Chromium only performs layout + print.
   return await page.pdf({format:'A4',printBackground:false,preferCSSPageSize:true,displayHeaderFooter:false,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
  } finally {
   if(page)await page.close().catch(()=>{});
   if(browser){
    const proc=browser.process?.();
    await browser.close().catch(()=>{});
    if(proc&&!proc.killed){await new Promise(r=>setTimeout(r,150));try{proc.kill('SIGKILL')}catch(_){}}
   }
  }
 });
}
module.exports={renderHtmlPdf,documentHtml};
