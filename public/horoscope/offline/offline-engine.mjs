import {calculateVedicChart,findTajakaAnnualChart} from './server-v107-wrapper.browser.mjs';
import {advanced} from './astro_advanced.browser.mjs';
import {phase4Dasa} from './dasa_engine.browser.mjs';
import {panchang,transit} from './transit_panchang.browser.mjs';
export async function full(body){
 const chart=await calculateVedicChart(body);
 chart.nativeName=String(body.name||body.nativeName||'');
 chart.nameInitial=String(body.nameInitial||body.nativeNameInitial||'');
 if(!chart.nameInitial&&chart.nativeName){try{const seg=new Intl.Segmenter(undefined,{granularity:'grapheme'});chart.nameInitial=seg.segment(chart.nativeName)[Symbol.iterator]().next().value?.segment||Array.from(chart.nativeName)[0]||'';}catch{chart.nameInitial=Array.from(chart.nativeName)[0]||'';}}
 try{const targetYear=Number(body?.tajakaYear)||new Date().getFullYear();chart.tajakaAnnual=await findTajakaAnnualChart(body,targetYear);}catch(e){chart.tajakaAnnualError=String(e?.message||e);}
 const lang=body.language==='en'?'en':'ta';
 const adv=advanced(chart,lang);
 const birthPanchang=panchang({...body,date:body.date,time:body.time});
 const dailyDate=String(body.dailyDate||body.date||''),dailyTime=String(body.dailyTime||body.time||'');
 const dailyPanchang=panchang({...body,date:dailyDate,time:dailyTime});
 const tr=transit({...body,date:dailyDate,time:dailyTime});
 const phase4=phase4Dasa(chart);
 return{ok:true,meta:{complete:true,version:'SMV-full-1'},chart,advanced:adv,birthPanchang,dailyPanchang,transit:tr,phase4};
}
globalThis.SMVOfflineEngine={full};
