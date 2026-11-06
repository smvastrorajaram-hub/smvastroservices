import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const matching=readFileSync(new URL('../public/horoscope/marriage-matching.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../public/horoscope/config.js',import.meta.url),'utf8');
const form=readFileSync(new URL('../public/horoscope/horoscope-form.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../public/horoscope/index.html',import.meta.url),'utf8');
const workers=[
 readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),
 readFileSync(new URL('../public/horoscope/sw.js',import.meta.url),'utf8'),
 readFileSync(new URL('../public/horoscope/calendar/sw.js',import.meta.url),'utf8')
];
let checks=0;
const yes=(value,message)=>{assert.ok(value,message);checks++;};
const no=(value,message)=>{assert.equal(value,false,message);checks++;};

function policyHarness({enabled,price,loggedIn=false,entitled=false,responses=null}){
 let requests=0;
 const sequence=responses||[{status:200,body:{
  advanced_analysis:{enabled,price},marriage_matching:{enabled,price}
 }}];
 const sandbox={
  console,URL,Headers,Response,Promise,Date,
  location:{href:'https://horoscope.smvastroservices.in/'},
  document:{
   documentElement:{lang:'ta'},
   body:{classList:{contains:()=>false}},
   addEventListener(){},
   getElementById(){return null},
   querySelector(){return null}
  },
  localStorage:{removeItem(){}},
  setTimeout(callback){callback();return 0;},
  queueMicrotask(callback){callback();},
  addEventListener(){},
  fetch:async()=>{
   const item=sequence[Math.min(requests,sequence.length-1)];
   requests++;
   return new Response(JSON.stringify(item.body||{}),{
    status:item.status,
    headers:{'Content-Type':'application/json',...(item.headers||{})}
   });
  },
  __smvEnsureHoroscopeAuthReady:async()=>true,
  __smvHoroscopeLoggedIn:()=>loggedIn,
  __smvHasPaidFeatureAccess:async()=>entitled
 };
 sandbox.window=sandbox;
 vm.runInNewContext(policy,sandbox,{filename:'public/horoscope/config.js'});
 return {state:()=>sandbox.__smvFeatureState('advanced_analysis'),requestCount:()=>requests};
}

// Admin OFF + Rs.0: public Full access before Login; signed-in Full remains no-export.
for(const loggedIn of [false,true]){
 const h=policyHarness({enabled:false,price:0,loggedIn});
 const state=await h.state();
 yes(state.mode===(loggedIn?'off_free_full_no_export':'off_free_full'),'Admin OFF + Rs.0 selects the correct public/signed-in Full mode');
 yes(state.fullAllowed===true&&state.entitled===true,'Admin OFF + Rs.0 grants Full Horoscope and Advanced Analysis');
 yes(state.loggedIn===loggedIn,'Admin OFF + Rs.0 preserves the actual Login state');
 yes(state.exportAllowed===false,'Admin OFF + Rs.0 never enables Save/Print');
}

// Admin OFF + Rs.1: Basic remains public; verified Customer Login unlocks Full free.
{
 const guest=await policyHarness({enabled:false,price:1}).state();
 yes(guest.mode==='off_public_basic'&&guest.fullAllowed===false,'Admin OFF + Rs.1 remains Basic before Login');
 const member=await policyHarness({enabled:false,price:1,loggedIn:true}).state();
 yes(member.mode==='off_full_export'&&member.fullAllowed===true,'Admin OFF + Rs.1 grants free Full after Login');
 yes(member.actualPrice===1&&member.exportAllowed===true,'OFF + Rs.1 preserves the stored Admin price and export path');
}

// Admin ON + Rs.1: Basic is free; Full requires payment even after Login.
{
 const guest=await policyHarness({enabled:true,price:1}).state();
 yes(guest.mode==='paid'&&guest.fullAllowed===false,'Admin ON + Rs.1 keeps Full locked before Login');
 const member=await policyHarness({enabled:true,price:1,loggedIn:true,entitled:false}).state();
 yes(member.mode==='paid'&&member.fullAllowed===false,'Admin ON + Rs.1 requires verified payment after Login');
 const paid=await policyHarness({enabled:true,price:1,loggedIn:true,entitled:true}).state();
 yes(paid.fullAllowed===true&&paid.entitled===true,'Verified Admin ON + Rs.1 entitlement unlocks Full');
}

// A Render cold-start 503 is retried. If it still fails, the access policy is fail-closed.
{
 const h=policyHarness({
  enabled:true,price:1,
  responses:[
   {status:503,body:{error:'Service is starting'}},
   {status:200,body:{advanced_analysis:{enabled:true,price:1},marriage_matching:{enabled:true,price:1}}}
  ]
 });
 const state=await h.state();
 yes(h.requestCount()===2,'A transient Render 503 is retried before resolving Admin settings');
 yes(state.mode==='paid','The successful retry uses the current Admin paid mode');
}

// The Free Render service may take longer to wake: use all five bounded attempts,
// honour a Retry-After response, and fail closed only after the retry budget is exhausted.
{
 const h=policyHarness({
  enabled:true,price:1,
  responses:[
   {status:503,headers:{'Retry-After':'1'},body:{error:'Service is starting'}},
   {status:503,body:{error:'Service is starting'}},
   {status:503,body:{error:'Service is starting'}},
   {status:503,body:{error:'Service is starting'}},
   {status:200,body:{advanced_analysis:{enabled:true,price:1},marriage_matching:{enabled:true,price:1}}}
  ]
 });
 const state=await h.state();
 yes(h.requestCount()===5,'Render Admin settings retry through the fifth bounded request');
 yes(state.mode==='paid','The fifth successful response applies the current Admin paid mode');
}
{
 const h=policyHarness({
  enabled:true,price:1,
  responses:Array.from({length:5},()=>({status:503,body:{error:'Service is still starting'}}))
 });
 const state=await h.state();
 yes(h.requestCount()===5,'A persistent Render 503 stops at the five-attempt retry limit');
 yes(state.mode==='online_unavailable'&&state.fullAllowed===false,'Persistent Admin settings failure remains fail-closed');
}

// Horoscope still uses the canonical access guard and does not bypass its complete report check.
yes(form.includes("__smvRequireHoroscopeFeatureAccess('advanced_analysis',englishAdvancedRoot,runEnglishAdvanced)"),'Horoscope uses the shared policy before Advanced Analysis');
yes(form.includes('verifyCompleteAdvanced();'),'Horoscope retains the complete report validation guard');
yes(form.includes("target.classList.remove('hidden');target.setAttribute('aria-busy','false');"),'The Basic result is explicitly released when Full access is denied');

// Marriage follows the canonical Full decision and uses one birth-details form.
yes(matching.includes('mmFullAccess=state.fullAllowed===true;'),'Matching uses the canonical Full-access decision');
yes(matching.includes("btn.dataset.publicPoruthamOnly=mmFullAccess?'0':'1';"),'A public free Full mode starts Full Matching before Login');
yes(matching.includes("T('View Full Marriage Matching','முழு நட்சத்திரப் பொருத்தம் காண்க')"),'The public free Full CTA is shown before Login');
yes(matching.indexOf('id="mmManualSection"')<matching.indexOf('id="mmFullMatchingSection"'),'Basic Rasi/Nakshatra entry is mounted above Full Marriage Matching');
yes(matching.includes("const adminOnPositive=state.mode==='paid'&&actualAmount>=1;")&&matching.includes("const adminOffPositive=state.mode==='off_public_basic'&&actualAmount>=1;")&&matching.includes("const adminOffZero=state.mode==='off_free_full'&&actualAmount<1;"),'Admin ON paid, Admin OFF paid and Admin OFF free modes are distinguished by canonical policy state');
yes(matching.includes("const showBasicManual=adminOnPositive||(visitor&&(adminOffPositive||adminOffZero));"),'Basic input is shown for Admin ON paid modes and the two requested Admin OFF guest modes');
yes(matching.includes("const hideBirthBasedForm=visitor&&(adminOnPositive||adminOffPositive);"),'Full DOB entry is hidden only for pre-login positive-price states');
yes(matching.includes("if(fullSection)fullSection.hidden=visitor&&adminOffPositive;"),'Admin OFF + positive price guests see Basic matching without the Full Matching form');
yes(matching.includes("},'mmManualResult');")&&matching.includes('id="mmManualResult"'),'Basic result has its own output area and does not overwrite the Full result');
yes(matching.includes("state.mode==='paid'&&cfg.enabled&&cfg.price>0"),'A pre-login paid benefit box appears only for Admin ON + positive price');
no(matching.includes("preview.querySelector('[data-smv-unlock]')?.remove();"),'The pre-login Matching Login/Pay CTA is retained');
no(matching.includes('#smvMarriageMatching #mmPaidFeaturePreview button{display:none!important}'),'The pre-login Matching CTA is not hidden by CSS');

// Both paid-entry experiences are visible before Login; actual payment remains report-specific.
yes(policy.includes("T('Login to Pay','Login செய்து கட்டணம் செலுத்தவும்')"),'The paid CTA clearly indicates Login and payment');
yes(policy.includes('function syncHoroscopePaidEntry()'),'Horoscope has a pre-calculation paid-benefit panel');
yes(html.includes('id="smvHoroscopePaidEntryEnglish"')&&html.includes('id="smvHoroscopePaidEntryTamil"'),'Both Horoscope language forms host the pre-login benefit panel');
yes(html.includes('config.js?v=20261107-horoscope-report-mirror-v2'),'Access config uses its cache-busted URL');
yes(html.includes('horoscope-form.js?v=20261107-horoscope-report-mirror-v2'),'Horoscope form uses its cache-busted URL');
yes(html.includes('marriage-matching.js?v=20261106-basic-nakshatra-input-v1'),'Marriage Matching uses its cache-busted URL');

// All three products share the marker. Existing offline/user data is not cleared.
const marker='20261107-horoscope-report-mirror-v2';
yes(workers.every(source=>source.includes(marker)),'All three Service Workers share the synchronized cache release');
no(policy.includes('localStorage.clear('),'The policy does not clear origin-wide localStorage');
no(policy.includes('caches.delete('),'The policy does not clear Cache Storage');

console.log(JSON.stringify({pass:true,checks,scope:'Admin OFF 0/1, Admin ON paid flow, Render retry, Horoscope/Matching visibility, pre-login paid CTAs, manual matching section, three-app cache markers'}));
