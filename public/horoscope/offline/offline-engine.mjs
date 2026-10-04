import {calculateVedicChart,findTajakaAnnualChart} from './server-v107-wrapper.browser.mjs';
import {advanced} from './astro_advanced.browser.mjs';
import {phase4Dasa} from './dasa_engine.browser.mjs';
import {panchang,transit} from './transit_panchang.browser.mjs';
export async function full(body){
 // Phase 4: the Horoscope UI already calculated this natal chart once for the
 // core result. Reuse that same-generation chart for Advanced Analysis instead
 // of running Swiss/WASM natal calculation a second time. Other callers (for
 // example Marriage Matching) do not provide this internal field and retain
 // the original calculation path.
 const reusable=body?.__smvPrecomputedChart;
 const chart=(reusable&&Array.isArray(reusable.planets)&&reusable.lagna)?reusable:await calculateVedicChart(body);
 chart.nativeName=String(body.name||body.nativeName||'');
 chart.nameInitial=String(body.nameInitial||body.nativeNameInitial||'');
 if(!chart.nameInitial&&chart.nativeName){try{const seg=new Intl.Segmenter(undefined,{granularity:'grapheme'});chart.nameInitial=seg.segment(chart.nativeName)[Symbol.iterator]().next().value?.segment||Array.from(chart.nativeName)[0]||'';}catch{chart.nameInitial=Array.from(chart.nativeName)[0]||'';}}
 // Phase 3: Nakshatra-only public matching needs the natal chart/Moon only.
 // Skip Tajaka, Advanced, Panchang, Transit and Dasa work for this explicit path.
 if(body?.basicOnly===true)return{ok:true,meta:{complete:false,basicOnly:true,version:'SMV-basic-1'},chart};
 try{const targetYear=Number(body?.tajakaYear)||new Date().getFullYear();chart.tajakaAnnual=await findTajakaAnnualChart(body,targetYear);}catch(e){chart.tajakaAnnualError=String(e?.message||e);}
 const lang=body.language==='en'?'en':'ta';
 const adv=advanced(chart,lang);
 const cachedBasic=body?.__smvPrecomputedBasic;
 const cacheLanguage=!cachedBasic?.language||cachedBasic.language===lang;
 const birthPanchang=cacheLanguage&&cachedBasic?.birthPanchang?cachedBasic.birthPanchang:panchang({...body,date:body.date,time:body.time});
 const dailyDate=String(body.dailyDate||body.date||''),dailyTime=String(body.dailyTime||body.time||'');
 const sameDaily=cacheLanguage&&String(cachedBasic?.referenceDate||'')===dailyDate&&String(cachedBasic?.referenceTime||'')===dailyTime;
 const dailyPanchang=sameDaily&&cachedBasic?.dailyPanchang?cachedBasic.dailyPanchang:panchang({...body,date:dailyDate,time:dailyTime});
 const tr=sameDaily&&cachedBasic?.transit?cachedBasic.transit:transit({...body,date:dailyDate,time:dailyTime});
 const phase4=phase4Dasa(chart);
 return{ok:true,meta:{complete:true,version:'SMV-full-1'},chart,advanced:adv,birthPanchang,dailyPanchang,transit:tr,phase4};
}
globalThis.SMVOfflineEngine={full};
