/* Local diagnostics only. No telemetry, credentials, payment IDs or Firebase access. */
(function(){
 const samples=[];
 window.__smvRecordTiming=(stage,ms,ok=true)=>{samples.push({stage:String(stage).split('?')[0],milliseconds:Math.round(ms),ok:!!ok,at:new Date().toISOString()});if(samples.length>60)samples.shift();};
 window.SMVPaymentTiming={report:()=>samples.map(x=>({...x})),clear:()=>{samples.length=0;}};
})();
