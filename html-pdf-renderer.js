'use strict';
const fs = require('fs');
const path = require('path');
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
const tamilFontPath=path.join(__dirname,'public','horoscope','fonts','noto-sans-tamil.ttf');
let tamilFontData='';
try{tamilFontData=fs.readFileSync(tamilFontPath).toString('base64');}catch(e){console.warn('[PDF-FONT] bundled Tamil font unavailable:',e?.message||e);}
function documentHtml({title,language,html}){
 const lang=language==='ta'?'ta':'en';
 return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
 ${tamilFontData?`@font-face{font-family:"SMVTamil";src:url(data:font/ttf;base64,${tamilFontData}) format("truetype");font-weight:100 900;font-style:normal;font-display:block}`:''}
 @page{size:A4;margin:10mm 10mm 12mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#fff;color:#000;font-family:${lang==='ta'?'"SMVTamil","Noto Sans Tamil",sans-serif':'Arial,"Noto Sans",sans-serif'};font-size:9.4pt;line-height:1.35}#report{width:100%;max-width:none}.smv-print-brand{font-weight:700;color:#000;font-size:10pt;border-bottom:1px solid #000;padding:0 0 4px;margin:0 0 7px}.smv-print-title{text-align:center;color:#000;font-size:15pt;margin:4px 0 10px}h1,h2{color:#000;font-size:12.5pt;line-height:1.25;margin:11px 0 5px;border-bottom:1px solid #000;padding-bottom:2px;break-after:avoid-page}h3,h4,h5,h6,.dasha-head,.smv-advanced-part-title{color:#000;font-size:10.3pt;line-height:1.3;margin:8px 0 4px;break-after:avoid-page}p{margin:3px 0 5px;orphans:3;widows:3}table{width:100%!important;border-collapse:collapse!important;table-layout:auto!important;margin:5px 0 8px;font-size:8.1pt;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid-page}th,td{border:1px solid #000!important;padding:3px 4px!important;vertical-align:top!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important;background:#fff!important;color:#000!important}th{font-weight:700!important;text-align:center}.south-indian-chart{width:92mm!important;height:92mm!important;max-width:100%!important;margin:6px auto 9px!important;display:grid!important;break-inside:avoid-page!important}.print-chart,.chart-wrap,.chart-container{break-inside:avoid-page!important}img,svg,canvas{max-width:100%!important;height:auto!important;break-inside:avoid-page}.smv-advanced-part-content{display:block!important;height:auto!important;max-height:none!important;overflow:visible!important}.smv-advanced-part{break-inside:auto!important}.dasha-node>.dasha-body,.dasha-node .dasha-content{display:block!important;max-height:none!important;overflow:visible!important}details>summary{font-weight:700;margin:5px 0}button,input,select,textarea,.horoscope-export-actions,.smv-horoscope-pay-gate{display:none!important}.card,.section,.result-section,[class*="section"]{box-shadow:none!important;max-width:100%!important;background:#fff!important;color:#000!important;border-color:#000!important}.smv-print-footer{position:fixed;bottom:-8mm;left:0;right:0;font-size:7pt;color:#333;text-align:center}@media print{a{color:inherit;text-decoration:none}}
 </style></head><body><div class="smv-print-brand">SMV ASTRO SERVICES</div><h1 class="smv-print-title">${escapeHtml(title)}</h1><main id="report">${safeReportHtml(html)}</main><div class="smv-print-footer">smvastroservices.in</div></body></html>`;
}
async function renderHtmlPdf(opts={}){
 // V104: @sparticuz/chromium exports a read-only module namespace in this runtime.
 // Do not mutate setGraphicsMode; use the supported args + executablePath API only.
 const executablePathFn = typeof chromium?.executablePath === 'function'
   ? chromium.executablePath.bind(chromium)
   : (typeof chromiumModule?.executablePath === 'function' ? chromiumModule.executablePath.bind(chromiumModule) : null);
 if(!executablePathFn){
   const exported=[...new Set([...Object.keys(chromiumModule||{}),...Object.keys(chromium||{})])].join(',');
   throw new Error('Bundled Chromium API is incompatible: executablePath() is unavailable. Exports: '+exported);
 }
 const executablePath=await executablePathFn();
 if(!executablePath)throw new Error('Bundled Chromium executable could not be resolved.');
 const chromiumArgs=Array.isArray(chromium?.args)?chromium.args:(Array.isArray(chromiumModule?.args)?chromiumModule.args:[]);
 if(!chromiumArgs.length)throw new Error('Bundled Chromium API is incompatible: launch args are unavailable.');
 const headless='shell';
 const args=[...chromiumArgs,'--disable-dev-shm-usage'];
 const browser=await puppeteer.launch({headless,executablePath,args,defaultViewport:{width:1280,height:900,deviceScaleFactor:1,isMobile:false,hasTouch:false,isLandscape:false}});
 try{
  const page=await browser.newPage();
  await page.setContent(documentHtml(opts),{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{document.querySelectorAll('.smv-advanced-part-content').forEach(el=>{el.hidden=false;el.removeAttribute('hidden');el.style.display='block';el.style.maxHeight='none';el.style.overflow='visible';});document.querySelectorAll('.smv-advanced-part').forEach(el=>{el.dataset.smvOpen='1';el.classList.add('is-expanded');});document.querySelectorAll('.dasha-node').forEach(el=>el.classList.add('open'));document.querySelectorAll('details').forEach(d=>d.open=true);if(document.fonts?.ready)await document.fonts.ready;});
  return await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
 } finally { await browser.close().catch(()=>{}); }
}
module.exports={renderHtmlPdf,documentHtml};
