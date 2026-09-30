'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs');

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
function documentHtml({title,language,html}){
 const lang=language==='ta'?'ta':'en';
 return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
 @page{size:A4;margin:11mm 10mm 13mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#fff;color:#202020;font-family:"Noto Sans Tamil","Noto Sans",Arial,sans-serif;font-size:10.2pt;line-height:1.42}#report{width:100%;max-width:none}.smv-print-brand{font-weight:800;color:#8b0000;font-size:12pt;border-bottom:1px solid #c9ad69;padding:0 0 5px;margin:0 0 9px}.smv-print-title{text-align:center;color:#7d0909;font-size:17pt;margin:5px 0 12px}h1,h2{color:#8b0000;font-size:14pt;line-height:1.25;margin:14px 0 7px;break-after:avoid-page}h3,h4,h5,h6,.dasha-head,.smv-advanced-part-title{color:#7d0909;font-size:11.2pt;line-height:1.3;margin:10px 0 5px;break-after:avoid-page}p{margin:4px 0 7px;orphans:3;widows:3}table{width:100%!important;border-collapse:collapse!important;table-layout:auto!important;margin:7px 0 11px;font-size:8.7pt;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid-page}th,td{border:1px solid #d7c899!important;padding:4px 5px!important;vertical-align:top!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:normal!important}th{background:#8b0000!important;color:#fff!important;font-weight:700!important;text-align:center}.south-indian-chart{width:104mm!important;height:104mm!important;max-width:100%!important;margin:8px auto 12px!important;display:grid!important;break-inside:avoid-page!important}.print-chart,.chart-wrap,.chart-container{break-inside:avoid-page!important}img,svg,canvas{max-width:100%!important;height:auto!important;break-inside:avoid-page}button,input,select,textarea,.horoscope-export-actions,.smv-horoscope-pay-gate{display:none!important}.card,.section,.result-section,[class*="section"]{box-shadow:none!important;max-width:100%!important}.smv-print-footer{position:fixed;bottom:-9mm;left:0;right:0;font-size:7pt;color:#777;text-align:center} @media print{a{color:inherit;text-decoration:none}}
 </style></head><body><div class="smv-print-brand">SMV ASTRO SERVICES</div><h1 class="smv-print-title">${escapeHtml(title)}</h1><main id="report">${safeReportHtml(html)}</main><div class="smv-print-footer">smvastroservices.in</div></body></html>`;
}
async function renderHtmlPdf(opts={}){
 const executablePath = puppeteer.executablePath();
 if (!executablePath || !fs.existsSync(executablePath)) {
  throw new Error('Chromium executable is missing. Render build must run npm install/postinstall before npm start.');
 }
 const browser=await puppeteer.launch({headless:true,executablePath,args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
  await page.setContent(documentHtml(opts),{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready;document.querySelectorAll('details').forEach(d=>d.open=true);});
  return await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false,margin:{top:'0',right:'0',bottom:'0',left:'0'}});
 } finally { await browser.close().catch(()=>{}); }
}
module.exports={renderHtmlPdf,documentHtml};
