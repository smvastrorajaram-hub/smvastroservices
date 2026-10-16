// V359 Chromium geometry test for narrow/wide screens.
// Synthetic fixture only, not production screenshot acceptance.
import assert from 'node:assert/strict';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
const dir=new URL('../v359-layout-smoke-output/',import.meta.url);
await mkdir(dir,{recursive:true});
const fixture=new URL('../public/horoscope/__v359_symmetric_gutters_fixture.html',import.meta.url);
const html=[
'<!doctype html><html lang="ta"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
...['horoscope.css','chart-style.css','marriage-basic-report.css','horoscope-readings.css','smv-ui.css','header-layout.css','v358-result-layout.css','v359-symmetric-gutters.css'].map(x=>'<link rel="stylesheet" href="'+x+'">'),
'</head><body class="smv-v12-theme"><main>',
'<section class="feature-section" id="english-horoscope"><div class="card">',
'<h2>ஜாதகம் கணித்தல்</h2><div class="grid"><label>பெயர்<input value="Perambalur"></label></div>',
'<div id="englishHoroscopeResult"><article class="card"><h3>Horoscope Result</h3>',
'<div class="adv-section"><h4>Advanced Result</h4><div class="smv-advanced-shell"><div class="smv-advanced-part">',
'<div class="smv-advanced-part-content">பாவம் மற்றும் கிரக பலன்கள். நன்றாகப் படிக்கக்கூடிய முடிவு.</div>',
'</div></div></div><table><tbody><tr><td>Table</td><td>Value</td></tr></tbody></table>',
'</article></div></div></section>',
'<section class="feature-section" id="tamil-horoscope"><div class="card">',
'<div id="tamilHoroscopeResult"><div class="card"><div class="adv-section">தமிழ் ஜாதக பலன்</div></div></div>',
'</div></section>',
'<section id="smvMarriageMatching"><h2>முழு ஜாதக திருமண பொருத்தம்</h2>',
'<p class="mm-note">இரண்டு ஜாதகங்களுக்கும் திருமணப் பொருத்தம்.</p>',
'<div id="mmNakshatraGate"><section class="mm-person-result mm-benefits">',
'<h3>நட்சத்திரப் பொருத்தத்தின் பயன்கள்</h3><ul><li>நட்சத்திரப் பொருத்தம் காட்டும்.</li><li>தெளிவான ஆய்வு.</li></ul>',
'</section></div><div id="mmPublicChoice"><div class="mm-choice-row"><label><input type="radio">பிறந்த தேதி</label></div></div>',
'<div id="mmFullEntry"><div class="mm-grid mm-birth-grid"><fieldset><legend>பெண்</legend><label>பிறந்த தேதி<input type="date"></label></fieldset><fieldset><legend>ஆண்</legend><label>பிறந்த தேதி<input type="date"></label></fieldset></div></div>',
'<div id="mmManualEntry"><div class="mm-birth-grid"><fieldset><legend>நட்சத்திரம்</legend><select><option>மகம்</option></select></fieldset></div></div>',
'<div class="mm-results"><div class="mm-full-results mm-v281-results">',
'<section class="mm-front-porutham"><h3>பத்து பொருத்தம்</h3><div class="mm-front-porutham-row">பொருத்தமான பலன்கள்</div></section>',
'<section class="mm-v281-topic-book"><h3>இரு ஜாதகங்களின் வாழ்க்கை ஆய்வு</h3>',
'<div class="mm-v281-people"><section>பெண் ஜாதகம்</section><section>ஆண் ஜாதகம்</section></div></section>',
'<div class="mm-basic-report"><div class="mm-base-scroll" style="max-width:100%;overflow-x:auto">',
'<table class="mm-base-table" style="width:900px!important;min-width:900px!important"><tbody><tr>',
'<th>ராசி</th><td>சந்திரன்</td><td>செவ்வாய்</td><td>புதன்</td><td>சுக்கிரன்</td>',
'</tr></tbody></table></div></div></div></div></section>',
'</main></body></html>'
].join('');
await writeFile(fixture,html);
const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
const rows=[];
try{
 const page=await browser.newPage();
 for(const width of [360,390,768,1280]){
  await page.setViewport({width,height:900,deviceScaleFactor:1});
  await page.goto(fixture.href,{waitUntil:'load'});
  const r=await page.evaluate(()=>{
   const get=s=>document.querySelector(s);
   const rect=s=>{const r=get(s)?.getBoundingClientRect();return r?{x:r.x,width:r.width,right:r.right}:null};
   const style=s=>getComputedStyle(get(s));
   const host=style('#smvMarriageMatching'),ben=style('#mmNakshatraGate>.mm-benefits'),hor=style('#englishHoroscopeResult .card'),advanced=style('#englishHoroscopeResult .adv-section'),topic=style('.mm-v281-topic-book');
   const scroll=get('.mm-base-scroll');
   return {
    viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
    matching:rect('#smvMarriageMatching'),input:rect('#english-horoscope>.card'),tamilInput:rect('#tamil-horoscope>.card'),matchingInput:rect('#mmFullEntry'),matchingManual:rect('#mmManualEntry'),
    borders:[parseFloat(host.borderLeftWidth),parseFloat(host.borderRightWidth)],
    benefits:{border:parseFloat(ben.borderLeftWidth),paddingLeft:parseFloat(ben.paddingLeft),bg:ben.backgroundColor},
    horoscopeInnerBorder:parseFloat(hor.borderLeftWidth),
    advancedBorder:parseFloat(advanced.borderLeftWidth),
    topicBorder:parseFloat(topic.borderLeftWidth),
    tableBorder:parseFloat(style('.mm-base-table th').borderTopWidth),
    scrollWidth:scroll.scrollWidth,scrollClient:scroll.clientWidth
   };
  });
  rows.push(r);
  console.log('V359 geometry',JSON.stringify(r));
  assert.ok(r.documentWidth<=width+2,'Unexpected horizontal page overflow at '+width+': '+JSON.stringify(r));
  assert.ok(r.matching.x>=0&&r.matching.right<=width+1,'Both matching sides visible at '+width);
  const expectedLeft=width>1192?(width-1180)/2:6;
  const expectedRight=width-expectedLeft;
  for(const [name,b] of [['Marriage',r.matching],['Horoscope',r.input],['Tamil',r.tamilInput]]){
    assert.ok(Math.abs(b.x-expectedLeft)<=1,'Unequal left gutter '+name+' at '+width+' -> '+JSON.stringify(b));
    assert.ok(Math.abs(b.right-expectedRight)<=1,'Unequal right gutter '+name+' at '+width+' -> '+JSON.stringify(b));
    assert.ok(Math.abs(b.x-(width-b.right))<=1,'Screen gutters are asymmetric for '+name+' at '+width);
  }
  assert.ok(r.matchingInput.x>=r.matching.x+1&&r.matchingInput.right<=r.matching.right-1,'Matching birth inputs stay within parent on both sides');
  assert.ok(r.matchingManual.x>=r.matching.x+1&&r.matchingManual.right<=r.matching.right-1,'Nakshatra manual input stays within parent on both sides');
  assert.ok(r.matching.width>width*.82 || width>1000,'Matching is nearly full-width at '+width);
  assert.ok(Math.abs(r.borders[0]-r.borders[1])<.1&&r.borders[0]>=.9,'Matching frame has complete symmetric border at '+width);
  assert.equal(r.benefits.border,0,'Nakshatra benefits must be unboxed');
  assert.equal(r.horoscopeInnerBorder,0,'Horoscope output nested shell removed');
  assert.equal(r.advancedBorder,0,'Advanced output nested shell removed');
  assert.equal(r.topicBorder,0,'Full marriage inner topic border removed');
  assert.ok(r.tableBorder>0,'Table rules still present');
  assert.ok(r.scrollWidth>r.scrollClient,'Wide tables remain horizontally scrollable');
  if(width===360||width===1280) await page.screenshot({path:new URL('layout-'+width+'.png',dir).pathname,fullPage:true});
 }
 console.log(JSON.stringify({pass:true,viewports:rows,scope:'Chromium screen widths; saved and printed PDF are not modified'}));
}finally{
 await browser.close();
 await unlink(fixture);
}