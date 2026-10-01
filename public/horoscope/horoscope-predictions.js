/* SMV V52 — Global Specific Outcome + 5-Year Dasha/Transit Report. V51 strongest-window logic preserved. Integrated full-life predictions. Domain × actual planet role × varga × transit synthesis. */
(()=>{'use strict';
const EN={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
const TA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const P=x=>EN[String(x||'')]||String(x||''), esc=x=>String(x??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=x=>((Number(x)%360)+360)%360, sign=x=>Math.floor(norm(x)/30), house=(s,l)=>((s-l+12)%12)+1;
const lords=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
const asp={Mars:[4,7,8],Jupiter:[5,7,9],Saturn:[3,7,10],Sun:[7],Moon:[7],Mercury:[7],Venus:[7]};
const domains={
career:{ta:'தொழில், வேலை மற்றும் பதவி முன்னேற்றம்',en:'Career, employment and advancement',h:10,rel:[2,6,10,11],kar:['Sun','Saturn','Mercury','Jupiter'],v:10},
jobchange:{ta:'வேலை மாற்றம், பதவி உயர்வு மற்றும் புதிய பொறுப்பு',en:'Job change, promotion and new responsibility',h:10,rel:[6,10,11],kar:['Sun','Saturn','Mars','Mercury','Rahu'],v:10},
skills:{ta:'திறமைகள், தொடர்புத்திறன் மற்றும் தனிப்பட்ட முயற்சி',en:'Skills, communication and personal initiative',h:3,rel:[3,5,10,11],kar:['Mercury','Mars','Jupiter'],v:0},
turning:{ta:'வாழ்க்கைத் திருப்பங்கள், தடைகள் மற்றும் மீள்வளர்ச்சி',en:'Life turning points, obstacles and recovery',h:8,rel:[1,6,8,9,11,12],kar:['Saturn','Mars','Jupiter','Rahu','Ketu'],v:0},
business:{ta:'வியாபாரம் மற்றும் சுயதொழில்',en:'Business and self-employment',h:7,rel:[2,3,7,10,11],kar:['Mercury','Mars','Saturn'],v:10},
finance:{ta:'வருமானம், சேமிப்பு மற்றும் செல்வம்',en:'Income, savings and wealth',h:2,rel:[2,5,9,10,11],kar:['Jupiter','Venus','Mercury'],v:0},
marriage:{ta:'திருமணம் மற்றும் உறவு வாழ்க்கை',en:'Marriage and relationship life',h:7,rel:[2,7,8,11],kar:['Venus','Jupiter'],v:9},
children:{ta:'குழந்தை மற்றும் புத்திர பலன்',en:'Children and progeny',h:5,rel:[2,5,9,11],kar:['Jupiter'],v:7},
education:{ta:'கல்வி மற்றும் உயர்கல்வி',en:'Education and higher studies',h:4,rel:[2,4,5,9],kar:['Mercury','Jupiter'],v:0},
property:{ta:'வீடு, நிலம், சொத்து மற்றும் வாகனம்',en:'Home, land, property and vehicle',h:4,rel:[4,11],kar:['Mars','Venus'],v:0},
debt:{ta:'கடன், வழக்கு, போட்டி மற்றும் எதிரிகள்',en:'Debt, litigation, competition and opponents',h:6,rel:[6,8,12],kar:['Mars','Saturn'],v:0},
health:{ta:'உடல் சக்தி மற்றும் உடல்நலக் கவனம்',en:'Vitality and health attention',h:1,rel:[1,6,8,12],kar:['Sun','Moon'],v:0},
family:{ta:'குடும்பம் மற்றும் இல்லறம்',en:'Family and domestic life',h:2,rel:[2,4,7],kar:['Moon','Venus','Jupiter'],v:0},
parents:{ta:'தாய், தந்தை மற்றும் குடும்ப ஆதரவு',en:'Parents and family support',h:4,rel:[4,9,10],kar:['Sun','Moon'],v:0},
siblings:{ta:'சகோதரர்கள் மற்றும் முயற்சி',en:'Siblings and personal effort',h:3,rel:[3,11],kar:['Mars','Mercury'],v:0},
travel:{ta:'பயணம், இடமாற்றம் மற்றும் வெளிநாட்டு தொடர்பு',en:'Travel, relocation and foreign links',h:12,rel:[3,9,12],kar:['Rahu','Saturn'],v:0},
status:{ta:'புகழ், சமூக நிலை மற்றும் பொறுப்பு',en:'Recognition, social standing and responsibility',h:10,rel:[9,10,11],kar:['Sun','Jupiter','Saturn'],v:10},
fortune:{ta:'அதிர்ஷ்டம், வாய்ப்புகள் மற்றும் வாழ்க்கை முன்னேற்றம்',en:'Fortune, opportunity and life progress',h:9,rel:[5,9,11],kar:['Jupiter','Sun'],v:0},
spiritual:{ta:'ஆன்மிகம் மற்றும் உள்ளார்ந்த வளர்ச்சி',en:'Spiritual and inner growth',h:9,rel:[5,9,12],kar:['Jupiter','Ketu'],v:0},
remedy:{ta:'கவனிக்க வேண்டிய கிரகத் தாக்கங்கள் மற்றும் பரிகார வழிகாட்டல்',en:'Residual planetary pressures and remedial guidance',h:1,rel:[1,6,8,12],kar:[],v:0}
}
function pm(c){return Object.fromEntries((c?.planets||[]).map(x=>[P(x.name),x]))} function ls(c){return sign(c?.lagna?.longitude??0)}
function hof(c,pn){const q=typeof pn==='string'?pm(c)[pn]:pn;if(!q)return null;return Number(q.bhava)||house(sign(q.longitude),ls(c))}
function aspects(c,pn,h){const q=pm(c)[pn];if(!q||!asp[pn])return false;const ph=hof(c,q);return asp[pn].some(n=>((ph+n-2)%12)+1===h)}
function division(data,n){const pools=[data?.advanced?.vargas,data?.vargas,data?.advancedData?.vargas].filter(Array.isArray);for(const a of pools){const hit=a.find(v=>{const m=String(v?.division??v?.div??v?.name??'').match(/(7|9|10)/);return m&&Number(m[1])===n});if(hit)return hit}return null}
function periods(c){const out=[];for(const md of c?.dashas?.periods||[])for(const ad of md.antardashas||[])for(const pd of ad.pratyantars||[])out.push({md:P(md.lord),ad:P(ad.lord),pd:P(pd.lord),start:pd.start,end:pd.end});return out}
function dt(x,end=false){const d=new Date(String(x||'')+(String(x||'').includes('T')?'':end?'T23:59:59Z':'T00:00:00Z'));return Number.isFinite(+d)?d:null}
function relScore(c,pn,d){const q=domains[d],h=hof(c,pn);let s=q.rel.includes(h)?2:0;const owned=[];lords.forEach((x,i)=>{if(x===pn)owned.push(house(i,ls(c)))});if(owned.some(x=>q.rel.includes(x)))s+=2;if(q.kar.includes(pn))s+=2;return s}
function natal(c,d){const q=domains[d],lord=lords[(ls(c)+q.h-1)%12],m=pm(c);let plus=[],minus=[];if(m[lord])plus.push(lord);for(const k of q.kar)if(m[k])plus.push(k);for(const b of ['Jupiter','Venus'])if(aspects(c,b,q.h))plus.push(b);for(const x of ['Saturn','Mars','Rahu','Ketu'])if(m[x]&&(hof(c,x)===q.h||aspects(c,x,q.h)))minus.push(x);return {lord,plus:[...new Set(plus)],minus:[...new Set(minus)]}}
function langPlanet(x,l){return l==='ta'?(TA[x]||x):x} function dashaText(w,l){return l==='ta'?`${langPlanet(w.md,l)} மகாதசை – ${langPlanet(w.ad,l)} புக்தி – ${langPlanet(w.pd,l)} அந்தரம்`:`${w.md} Mahadasha – ${w.ad} Bhukti – ${w.pd} Antaram`}
function classify(c,d,payload){
 const all=periods(c),now=new Date(),birth=dt(payload?.date),age85=birth?new Date(birth.getFullYear()+85,birth.getMonth(),birth.getDate()):new Date(now.getFullYear()+60,0,1),futureEnd=new Date(Math.min(+age85,+new Date(now.getFullYear()+15,now.getMonth(),now.getDate())));
 const scored=all.map(w=>({...w,s:relScore(c,w.md,d)+relScore(c,w.ad,d)+relScore(c,w.pd,d),a:dt(w.start),b:dt(w.end,true)})).filter(w=>w.a&&w.b);
 const strong=scored.filter(w=>w.s>=3);
 const historical=scored.filter(w=>w.b<now && (!birth || w.b>=birth));
 const pickPast=a=>a.sort((x,y)=>y.s-x.s||y.b-x.b).slice(0,3).sort((x,y)=>x.a-y.a);
 const pickFuture=a=>a.sort((x,y)=>x.a-y.a||y.s-x.s).slice(0,4);
 let current=strong.filter(w=>w.a<=now&&w.b>=now).sort((a,b)=>b.s-a.s).slice(0,1);
 let past=pickPast(strong.filter(w=>w.b<now && (!birth || w.b>=birth)));
 let future=pickFuture(strong.filter(w=>w.a>now&&w.a<=futureEnd));
 // Past must use the whole available life history, not an arbitrary 15-year cut-off.
 // If no strict hit exists, choose the strongest actual historical windows.
 if(!past.length) past=pickPast(historical).map(w=>({...w,fallback:true}));
 if(!current.length) current=scored.filter(w=>w.a<=now&&w.b>=now).sort((a,b)=>b.s-a.s).slice(0,1).map(w=>({...w,fallback:true}));
 if(!future.length) future=pickFuture(scored.filter(w=>w.a>now&&w.a<=futureEnd)).map(w=>({...w,fallback:true}));
 return {past,current,future}
}
function careerFields(c,l){const m=pm(c),scores={};const add=(k,n)=>scores[k]=(scores[k]||0)+n;const H=n=>hof(c,n);for(const n of Object.keys(m)){const h=H(n);if(![2,6,10,11].includes(h))continue;if(['Sun','Mars','Saturn'].includes(n))add('admin',2);if(['Mercury','Rahu'].includes(n))add('tech',2);if(['Mercury','Jupiter'].includes(n))add('finance',2);if(['Jupiter','Mercury'].includes(n))add('education',2);if(['Mars','Saturn'].includes(n))add('engineering',2);if(['Venus','Moon'].includes(n))add('creative',2);if(['Rahu','Saturn'].includes(n))add('foreign',1);if(['Mars','Moon'].includes(n))add('land',1)}const map=l==='ta'?{admin:'நிர்வாகம் / அரசு சார்ந்த பொறுப்பு',tech:'தொழில்நுட்பம் / தகவல் தொடர்பு',finance:'கணக்கு / நிதி / ஆலோசனை',education:'கல்வி / பயிற்சி / அறிவுசார் பணி',engineering:'பொறியியல் / தொழில்நுட்ப செயல்பாடு',creative:'படைப்புத் துறை / சேவைத் துறை',foreign:'வெளிநாட்டு / பெரிய நிறுவனத் தொடர்பு',land:'நிலம் / கட்டிடம் / செயல்பாட்டு துறை'}:{admin:'administration / public responsibility',tech:'technology / communications',finance:'accounts / finance / advisory',education:'education / training / knowledge work',engineering:'engineering / technical operations',creative:'creative / service work',foreign:'foreign-linked / large organisations',land:'land / construction / operations'};return Object.entries(scores).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>map[k])}
function evidence(c,data,d,l){
 const q=domains[d],m=pm(c),lag=ls(c),lord=lords[(lag+q.h-1)%12],lordP=m[lord],lordH=lordP?hof(c,lordP):null;
 const occupants=Object.keys(m).filter(x=>hof(c,x)===q.h), supporters=[],pressures=[];
 for(const x of ['Jupiter','Venus','Mercury','Moon']) if(m[x]&&(hof(c,x)===q.h||aspects(c,x,q.h))) supporters.push(x);
 for(const x of ['Saturn','Mars','Rahu','Ketu']) if(m[x]&&(hof(c,x)===q.h||aspects(c,x,q.h))) pressures.push(x);
 const varga=q.v?division(data,q.v):null;
 return {q,lord,lordH,occupants:[...new Set(occupants)],supporters:[...new Set(supporters)],pressures:[...new Set(pressures)],varga};
}

function advRoot(data){return data?.advanced||data?.advancedData||data?.analysis?.advanced||null}


// V138 — Functional lordship + advanced timing confirmation.
// Natural benefic/malefic nature is only a secondary modifier.  The ascendant-based
// functional role, ownership, dignity and strength are given priority.
function v138OwnedHouses(c,pn){const lag=ls(c),out=[];lords.forEach((x,i)=>{if(P(x)===P(pn)){const h=house(i,lag);if(!out.includes(h))out.push(h)}});return out}
function v138FunctionalNature(c,pn){
 pn=P(pn); if(['Rahu','Ketu'].includes(pn))return {score:0,label:'node',owned:[]};
 const owned=v138OwnedHouses(c,pn);let score=0;
 for(const h of owned){if([5,9].includes(h))score+=3;else if(h===1)score+=2;else if([4,7,10].includes(h))score+=1;else if([3,6,11].includes(h))score-=2;else if(h===8)score-=2;else if(h===12)score-=1;else if(h===2)score-=0.5}
 // Yogakaraka-like kendra+trikona ownership deserves extra support.
 if(owned.some(h=>[5,9].includes(h))&&owned.some(h=>[1,4,7,10].includes(h)))score+=2;
 return {score,label:score>=2?'functional-benefic':score<=-2?'functional-malefic':'mixed',owned};
}
function v138InfluenceWeight(c,pn){
 const f=v138FunctionalNature(c,pn);if(f.score>=2)return 2;if(f.score<=-2)return -2;
 const natural=['Jupiter','Venus'].includes(P(pn))?1:['Saturn','Mars','Rahu','Ketu'].includes(P(pn))?-1:0;
 return natural;
}
function v138FunctionalText(c,pn,l){const f=v138FunctionalNature(c,pn),hs=f.owned.join(', ');if(!hs)return '';if(l==='ta')return `${langPlanet(pn,l)} ${hs} பாவங்களுக்கு அதிபதியாக இருந்து ${f.score>=2?'செயல்பாட்டு ஆதரவு':f.score<=-2?'செயல்பாட்டு அழுத்தம்':'கலப்பு செயல்பாடு'} தருகிறது.`;return `${pn} owns houses ${hs} and acts as a ${f.score>=2?'functional support':f.score<=-2?'functional pressure':'mixed functional'} factor.`}
function v138SameSignConjunctions(c,pn){const m=pm(c),p=m[P(pn)];if(!p)return[];const s=sign(Number(p.longitude));return Object.keys(m).filter(x=>P(x)!==P(pn)&&sign(Number(m[x]?.longitude))===s)}
function v138SahamNames(d){return ({career:['Karma Saham','Rajya Saham','Yasas Saham','Karyasiddhi Saham'],jobchange:['Karma Saham','Karyasiddhi Saham'],business:['Vyapara Saham','Vanik Saham','Labha Saham'],finance:['Artha Saham','Labha Saham'],marriage:['Vivaha Saham','Paradara Saham'],children:['Putra Saham'],education:['Vidya Saham','Sastra Saham'],property:['Bandhu Saham'],health:['Roga Saham','Jeeva Saham'],travel:['Paradesa Saham'],status:['Yasas Saham','Rajya Saham','Gaurava Saham'],fortune:['Punya Saham'],spiritual:['Punya Saham','Sraddha Saham']})[d]||[]}
function v138TimingSystems(data,d,l){
 const a=advRoot(data);if(!a)return[];const out=[];
 const taj=a.tajaka;if(taj&&typeof taj==='object'){
  const ri=taj.returnInfo||{},mun= taj.muntha||{},yl=taj.yearLord||'';
  if(yl||mun.house)out.push(l==='ta'?`தாஜக ஆண்டு உறுதிப்படுத்தல்: வருடாதிபதி ${yl||'—'}; முன்தா ${mun.house||'—'}-ஆம் பாவத்தில் உள்ளது.`:`Tajaka annual confirmation: year lord ${yl||'—'}; Muntha is in house ${mun.house||'—'}.`);
  const yog=Array.isArray(taj.yogas)?taj.yogas:[];if(yog.length)out.push(l==='ta'?`தாஜகத்தில் ${yog.length} யோக/இணைவு சுட்டிகள் உள்ளன; அவை தனி பிறப்பு வாக்குறுதியாக அல்ல, ஆண்டு timing confirmation ஆக மட்டும் பயன்படுத்தப்படுகின்றன.`:`Tajaka contains ${yog.length} yoga/configuration indicators; they are used only as annual timing confirmation, not as natal promise.`)
 }
 const sh=a?.v5?.sahams?.items||[];const wanted=v138SahamNames(d),taAlias={'Karma Saham':'கர்ம சஹம்','Rajya Saham':'ராஜ்ய சஹம்','Yasas Saham':'யசஸ் சஹம்','Karyasiddhi Saham':'கார்யசித்தி சஹம்','Vyapara Saham':'வ்யாபார சஹம்','Vanik Saham':'வணிக் சஹம்','Labha Saham':'லாப சஹம்','Artha Saham':'அர்த்த சஹம்','Vivaha Saham':'விவாஹ சஹம்','Paradara Saham':'பரதார சஹம்','Putra Saham':'புத்ர சஹம்','Vidya Saham':'வித்யா சஹம்','Sastra Saham':'சாஸ்திர சஹம்','Bandhu Saham':'பந்து சஹம்','Roga Saham':'ரோக சஹம்','Jeeva Saham':'ஜீவ சஹம்','Paradesa Saham':'பரதேச சஹம்','Gaurava Saham':'கௌரவ சஹம்','Punya Saham':'புண்ய சஹம்','Sraddha Saham':'ஸ்ரத்தா சஹம்'};const wantedAll=new Set(wanted.flatMap(n=>[n,taAlias[n]].filter(Boolean)));const hits=sh.filter(x=>wantedAll.has(String(x.name||'')));if(hits.length){const txt=hits.slice(0,4).map(x=>`${x.name}: ${x.rasi||x.sign||''}${x.degree!=null?' '+x.degree:''}`).join('; ');out.push(l==='ta'?`சஹம் timing ஆதாரம்: ${txt}.`:`Saham timing evidence: ${txt}.`)}
 const sb=a.sarvatobhadra;if(sb?.centerNakshatra)out.push(l==='ta'?`சர்வதோபத்ர மைய ஜன்ம நட்சத்திரம் ${sb.centerNakshatra}; கோச்சார நட்சத்திரத் தாக்கங்கள் இதனுடன் timing confirmation ஆக ஒப்பிடப்படுகின்றன.`:`Sarvatobhadra centres on natal Nakshatra ${sb.centerNakshatra}; transit Nakshatra contacts are compared as timing confirmation.`);
 const su=a.sudarshana;if(Array.isArray(su?.rings)&&su.rings.length)out.push(l==='ta'?`சுதர்சன சக்கரத்தின் லக்ன–சந்திர–சூரிய மூன்று reference-களும் கோச்சார பாவச் செயல்பாட்டை cross-check செய்ய பயன்படுகின்றன.`:`Sudarshana's Lagna–Moon–Sun three-reference rings are used to cross-check transit house activation.`);
 return out;
}
function v138TransitNakshatraContacts(data,tr,l){const a=advRoot(data),sb=a?.sarvatobhadra,ps=v39TransitPlanets(tr);if(!sb||!ps.length)return'';const natal=String(sb.centerNakshatra||'').trim();if(!natal)return'';const hits=ps.filter(p=>String(p.nakshatra||'').trim()===natal);if(!hits.length)return l==='ta'?`சர்வதோபத்ர நேரடி ஜன்ம-நட்சத்திர கோச்சார தொடுதல் இந்த sample தேதியில் இல்லை.`:`No direct Sarvatobhadra natal-Nakshatra transit contact occurs on this sample date.`;const names=hits.map(p=>langPlanet(P(p.name||p.planet),l)).join(', ');return l==='ta'?`சர்வதோபத்ர timing: ${names} ஜன்ம நட்சத்திரத்தை நேரடியாகத் தொடுகிறது.`:`Sarvatobhadra timing: ${names} directly contacts the natal Nakshatra.`}
function v138SudarshanaTransit(c,tr,l){const ps=v39TransitPlanets(tr);if(!ps.length)return'';const m=pm(c),moon=m.Moon,sun=m.Sun;if(!moon||!sun)return'';const bases=[['Lagna',ls(c)],['Moon',sign(Number(moon.longitude))],['Sun',sign(Number(sun.longitude))]];const slow=['Jupiter','Saturn','Rahu','Ketu'];const parts=[];for(const [nm,b] of bases){const hs=ps.filter(p=>slow.includes(P(p.name||p.planet))).map(p=>{const si=Number.isFinite(Number(p.longitude))?sign(Number(p.longitude)):Number(p.rasiIndex);return Number.isFinite(si)?house(si,b):null}).filter(Boolean);if(hs.length)parts.push(`${nm}: ${hs.join('/')}`)}if(!parts.length)return'';return l==='ta'?`சுதர்சன கோச்சார cross-check (குரு/சனி/ராகு/கேது பாவங்கள்): ${parts.join('; ')}.`:`Sudarshana transit cross-check (Jupiter/Saturn/Rahu/Ketu houses): ${parts.join('; ')}.`}

function smvAdvancedEvidence(c,data,d,l){
 const a=advRoot(data),q=domains[d],m=pm(c),lag=ls(c),lord=lords[(lag+q.h-1)%12],lp=m[lord],out=[],score={support:0,pressure:0};
 if(!a)return {out,score,available:false};
 const say=(ta,en,n=0)=>{out.push(l==='ta'?ta:en);if(n>0)score.support+=n;else if(n<0)score.pressure+=-n};
 // Reuse the planetary-state calculation already attached by SMV core (do not recalculate longitude/dignity).
 if(lp?.strength3?.available){const r=Number(lp.strength3.ratio||lp.strength3.rupaRatio||0);if(Number.isFinite(r)&&r>0){if(r>=1)say(`${langPlanet(lord,l)} Shadbala தேவையை பூர்த்தி செய்கிறது (ratio ${r.toFixed(2)}).`,`${lord} meets its Shadbala requirement (ratio ${r.toFixed(2)}).`,2);else say(`${langPlanet(lord,l)} Shadbala தேவைக்கு கீழே உள்ளது (ratio ${r.toFixed(2)}).`,`${lord} is below its Shadbala requirement (ratio ${r.toFixed(2)}).`,-2)}}
 if(lp?.strength){const st=lp.strength, h=hof(c,lp);if(st.exalted||st.ownSign||st.moolatrikona)say(`${langPlanet(lord,l)} வலுவான ராசி நிலையில் உள்ளது.`,`${lord} is in a strong dignity.`,2);if(st.debilitated)say(`${langPlanet(lord,l)} நீச நிலையில் உள்ளது.`,`${lord} is debilitated.`,-2);if(st.combustion)say(`${langPlanet(lord,l)} அஸ்தங்கத அழுத்தம் பெறுகிறது.`,`${lord} is under combustion pressure.`,-1);if(st.relationship==='நட்பு')say(`${langPlanet(lord,l)} நட்பு ராசி ஆதரவு பெறுகிறது.`,`${lord} is in a friendly sign.`,1);if(st.relationship==='பகை')say(`${langPlanet(lord,l)} பகை ராசியில் உள்ளது.`,`${lord} is in an inimical sign.`,-1);if([6,8,12].includes(h))say(`${langPlanet(lord,l)} ${h}-ஆம் துஷ்டான பாவத்தில் உள்ளது.`,`${lord} occupies dusthana house ${h}.`,-1);if([1,4,5,7,9,10].includes(h))say(`${langPlanet(lord,l)} கேந்திர/திரிகோண ஆதரவு பெறுகிறது.`,`${lord} has kendra/trikona placement support.`,1)}
 // Reuse exact Graha Drishti/Rasi Drishti/Argala objects from Advanced Analysis I.
 const ph=a?.v5?.phase1||{}; const targetSign=(lag+q.h-1)%12;
 const signNamesEn=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const signNamesTa=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const targetNames=new Set([signNamesEn[targetSign],signNamesTa[targetSign]]);
 const gd=ph?.grahaDrishti?.items||[];for(const row of gd){if((row.aspects||[]).some(z=>String(z?.rasi||'')===signNamesEn[targetSign])){const pn=P(row.planet),w=v138InfluenceWeight(c,pn);say(`${langPlanet(pn,l)} கிரக பார்வை இந்தப் பாவத்தைத் தாக்குகிறது. ${v138FunctionalText(c,pn,l)}`,`${pn} casts Graha Drishti on this house. ${v138FunctionalText(c,pn,l)}`,w)}}
 const rd=ph?.rasiDrishti?.items||[];for(const row of rd){if((row.aspects||[]).some(z=>targetNames.has(String(z)))){const pn=P(row.planet),w=v138InfluenceWeight(c,pn);say(`ராசி பார்வை மூலம் ${esc(row.planet)} தொடர்பு உள்ளது. ${v138FunctionalText(c,pn,l)}`,`Rasi Drishti from ${esc(row.planet)} reaches the target sign. ${v138FunctionalText(c,pn,l)}`,w)}}
 const ar=ph?.argala?.items||[];const ari=ar.find(x=>targetNames.has(String(x.targetSign)));if(ari){const ac=(ari.argala||[]).reduce((n,x)=>n+(x.planets||[]).length,0),vc=(ari.virodhargala||[]).reduce((n,x)=>n+(x.planets||[]).length,0);if(ac)say(`அர்கலா ஆதரவு ${ac} கிரகத் தொடர்புகளால் உள்ளது.`,`Argala support has ${ac} planetary links.`,Math.min(2,ac));if(vc)say(`விரோதார்கலா ${vc} தடுப்பு தொடர்புகளை காட்டுகிறது.`,`Virodhargala shows ${vc} obstructing links.`,-Math.min(2,vc))}
 // Reuse BAV/SAV. SAV is sign-level support, not an event by itself.
 const av=a?.ashtakavarga;if(Array.isArray(av?.sarva)){const bindu=Number(av.sarva[targetSign]);if(Number.isFinite(bindu)){if(bindu>=30)say(`இந்த பாவ ராசிக்கு SAV ${bindu}; அஷ்டகவர்க்க ஆதரவு வலுவாக உள்ளது.`,`SAV is ${bindu} for the house sign, giving strong Ashtakavarga support.`,2);else if(bindu<=24)say(`இந்த பாவ ராசிக்கு SAV ${bindu}; அஷ்டகவர்க்க ஆதரவு குறைவாக உள்ளது.`,`SAV is ${bindu} for the house sign, so Ashtakavarga support is lower.`,-1);else say(`இந்த பாவ ராசிக்கு SAV ${bindu}; மிதமான அஷ்டகவர்க்க நிலை.`,`SAV is ${bindu} for the house sign, a moderate Ashtakavarga level.`,0)}}
 // Reuse compound planet relationship for the house lord and relevant karakas.
 const rel=a?.planetRelations?.rows||[];for(const k of q.kar){const r=rel.find(x=>P(x.from)===lord&&P(x.to)===k);if(!r)continue;const cp=String(r.compound||'');if(['adhimitra','mitra'].includes(cp))say(`${langPlanet(lord,l)}–${langPlanet(k,l)} கிரக உறவு ஆதரவானது.`,`${lord}–${k} compound relationship is supportive.`,1);else if(['satru','adhisatru'].includes(cp))say(`${langPlanet(lord,l)}–${langPlanet(k,l)} கிரக உறவு அழுத்தமானது.`,`${lord}–${k} compound relationship is adverse.`,-1)}
 // Functional lordship and conjunctions are weighed before the final balance.
 const lf=v138FunctionalNature(c,lord);if(lf.score>=2)say(v138FunctionalText(c,lord,l),v138FunctionalText(c,lord,l),1);else if(lf.score<=-2)say(v138FunctionalText(c,lord,l),v138FunctionalText(c,lord,l),-1);
 for(const pn of v138SameSignConjunctions(c,lord)){const w=v138InfluenceWeight(c,pn);say(`${langPlanet(lord,l)} உடன் ${langPlanet(pn,l)} சேர்க்கை உள்ளது. ${v138FunctionalText(c,pn,l)}`,`${lord} is conjunct ${pn}. ${v138FunctionalText(c,pn,l)}`,w)}
 for(const t of v138TimingSystems(data,d,l))say(t,t,0);
 // Divisional chart is confirmation, never a replacement for D1.
 if(q.v&&division(data,q.v))say(`${q.v===9?'D9 நவாம்சம்':q.v===10?'D10 தசாம்சம்':'D7 சப்தாம்சம்'} உறுதிப்படுத்தலுக்கு கிடைக்கிறது.`,`D${q.v} is available as divisional confirmation.`,0);
 return {out,score,available:true};
}
function advancedBalanceText(c,data,d,l){const z=smvAdvancedEvidence(c,data,d,l);if(!z.available||!z.out.length)return '';const s=z.score.support,p=z.score.pressure;const verdict=s>p?(l==='ta'?'மேம்பட்ட கணக்கீட்டில் பாதுகாப்பு/ஆதரவு காரணிகள் மேலோங்குகின்றன.':'Advanced calculations show stronger protective/supportive factors.'):p>s?(l==='ta'?'மேம்பட்ட கணக்கீட்டில் அழுத்த காரணிகள் அதிகம்; ஆனால் cancellation/mitigation காரணிகள் இருந்தால் அவை இறுதி பலனை மாற்றும்.':'Advanced calculations show more pressure; cancellation/mitigation can still modify the final outcome.'):(l==='ta'?'மேம்பட்ட கணக்கீட்டில் ஆதரவும் அழுத்தமும் சமநிலையில் உள்ளன.':'Advanced calculations show a mixed balance of support and pressure.');return `${verdict} ${z.out.slice(0,6).join(' ')}`}

function houseName(n,l){return l==='ta'?`${n}-ஆம் பாவம்`:`house ${n}`}
function listPlanets(a,l){return a.map(x=>langPlanet(x,l)).join(l==='ta'?'、':', ')}
function placementMeaningTa(h){return ({1:'தன்னம்பிக்கை, உடல் சக்தி மற்றும் தனிப்பட்ட முடிவுகள்',2:'குடும்பம், பேச்சு, சேமிப்பு மற்றும் வருமானம்',3:'முயற்சி, தொடர்பு, திறமை மற்றும் சகோதரர்கள்',4:'வீடு, மனஅமைதி, சொத்து மற்றும் அடிப்படை கல்வி',5:'அறிவு, படைப்பாற்றல், குழந்தை மற்றும் திட்டமிடல்',6:'வேலைச் சேவை, போட்டி, கடன் மற்றும் சவால்களை சமாளித்தல்',7:'திருமணம், கூட்டாண்மை, வாடிக்கையாளர் மற்றும் பொது தொடர்பு',8:'மாற்றம், கூட்டு வளம், மறைமுக சிக்கல் மற்றும் மீள்வளர்ச்சி',9:'உயர்கல்வி, தர்மம், வழிகாட்டல், நீண்ட பயணம் மற்றும் வாய்ப்பு',10:'தொழில், பதவி, பொறுப்பு மற்றும் சமூகச் செயல்',11:'லாபம், வலையமைப்பு, ஆசை நிறைவேற்றம் மற்றும் அங்கீகாரம்',12:'செலவு, வெளிநாடு, தனிமை, விடுபாடு மற்றும் ஆன்மிகம்'})[h]||`${h}-ஆம் பாவ விஷயங்கள்`}
function placementMeaningEn(h){return ({1:'identity, vitality and personal decisions',2:'family, speech, savings and income',3:'initiative, communication, skills and siblings',4:'home, emotional foundation, property and basic education',5:'intelligence, creativity, children and planning',6:'service, competition, debt and overcoming obstacles',7:'marriage, partnership, clients and public dealings',8:'transformation, shared resources, hidden complications and recovery',9:'higher learning, guidance, long journeys and opportunity',10:'career, rank, responsibility and public action',11:'gains, networks, fulfilment and recognition',12:'expense, foreign residence, withdrawal, release and spirituality'})[h]||`house ${h} matters`}
function roleTa(d){return ({career:'தொழில் பாதை',jobchange:'வேலை மாற்றம் மற்றும் பதவி உயர்வு',skills:'திறமை மற்றும் முயற்சி',turning:'வாழ்க்கைத் திருப்பம்',business:'வியாபார வளர்ச்சி',finance:'பணம் மற்றும் சேமிப்பு',marriage:'திருமண வாழ்க்கை',children:'குழந்தை வாய்ப்பு',education:'கல்வி வளர்ச்சி',property:'சொத்து மற்றும் வாகன வாய்ப்பு',debt:'கடன்/போட்டி நிலை',health:'உடல் சக்தி',family:'குடும்ப வாழ்க்கை',parents:'பெற்றோர் ஆதரவு',siblings:'சகோதர உறவு மற்றும் முயற்சி',travel:'பயணம்/இடமாற்றம்',status:'சமூக அங்கீகாரம்',fortune:'வாழ்க்கை வாய்ப்புகள்',spiritual:'ஆன்மிக வளர்ச்சி',remedy:'பரிகாரத் தேவை'})[d]}
function planetEffectTa(p,d){const x={Sun:'அதிகாரம், தலைமை, சுயமரியாதை மற்றும் வெளிப்படையான பொறுப்பு',Moon:'மனம், பொதுமக்கள் தொடர்பு, பராமரிப்பு மற்றும் மாற்றத்துக்கு ஏற்ப ஒத்துப்போகும் தன்மை',Mars:'செயல் வேகம், போட்டி, தொழில்நுட்பத் திறன், துணிவு மற்றும் சில நேரங்களில் அவசரம்',Mercury:'கணக்கு, வாணிபம், தொடர்பு, பகுப்பாய்வு மற்றும் கற்றல்',Jupiter:'விரிவு, அறிவுரை, நெறி, பாதுகாப்பு மற்றும் நீண்டகால வளர்ச்சி',Venus:'ஒத்துழைப்பு, உறவு, வசதி, கலை/வடிவமைப்பு மற்றும் நிதி நுணுக்கம்',Saturn:'ஒழுங்கு, பொறுப்பு, நீண்ட முயற்சி, கட்டமைப்பு மற்றும் மெதுவாக நிலைபெறும் பலன்',Rahu:'புதுமை, வெளிநாட்டு/தொழில்நுட்ப தொடர்பு, வழக்கத்திற்கு மாறான பாதை மற்றும் பெரிய ஆசை',Ketu:'பிரிவு உணர்வு, உள்ளார்ந்த தேடல், திடீர் திசைமாற்றம் மற்றும் நுண்ணறிவு'};return x[p]||p}
function lifeState(c,data,d,l){
 const e=evidence(c,data,d,l), mixed=e.supporters.length&&e.pressures.length, strong=e.supporters.length>e.pressures.length, pressured=e.pressures.length>e.supporters.length;
 return {e,mixed,strong,pressured,lordH:e.lordH||0,occ:e.occupants.length,sup:e.supporters.length,pre:e.pressures.length};
}
function specificTa(c,data,d){
 const x=lifeState(c,data,d,'ta'), h=x.lordH, out=[];
 const add=t=>{if(t&&!out.includes(t))out.push(t)};
 const balance=x.mixed?'ஆதரவும் சவாலும் கலந்து இருப்பதால் முடிவுகள் படிப்படியாக நிலைபெறும் தன்மை உள்ளது.':x.strong?'மொத்த அமைப்பில் முன்னேற்றத்தை பயன்படுத்திக்கொள்ளும் ஆதரவு மேலோங்குகிறது.':x.pressured?'முயற்சி, ஒழுங்கு மற்றும் சரியான நேரத் தேர்வு இருந்தால் தடைகளை கடந்து பலனை நிலைப்படுத்த வேண்டிய அமைப்பு உள்ளது.':'பலன் ஒரே காரணியால் அல்லாமல் செயல்படும் தசை மற்றும் சூழலின் அடிப்படையில் வெளிப்படும்.';
 const map={
 career:()=>{const f=careerFields(c,'ta');add(`தொழில் வாழ்க்கையில் பொறுப்பு ஏற்று முன்னேறும் திறன் உள்ளது${h===12?', ஆனால் வெளிநாடு, தொலைதூரப் பணி, பின்னணி வேலை அல்லது செலவு அதிகமான பணிச்சூழல் போன்ற மாற்றுப்பாதைகள் முக்கியமாகலாம்':''}. ${balance}`);if(f.length)add(`வேலைத் திசைகளில் ${f.join('、')} ஆகியவை ஜாதகத்தில் மீண்டும் மீண்டும் ஆதரவு பெறுகின்றன. ஒரே வேலைப்பெயரை நிர்ணயிப்பதை விட இத்துறைகளில் திறன் பயன்படுத்தும் பணிகள் பொருத்தமாக இருக்கலாம்.`)},
 jobchange:()=>add(`வேலை மாற்றம் அல்லது பதவி உயர்வு திடீரென மட்டும் அல்லாமல் பொறுப்பு மாறுதல், புதிய குழு/இடம், அல்லது பணியின் தன்மை மாறுதல் வழியாக வரக்கூடும். ${balance}`),
 skills:()=>add(`தனிப்பட்ட முயற்சி, கற்றதை நடைமுறையில் பயன்படுத்துதல் மற்றும் தொடர்புத்திறன் வளர்த்தல் வாழ்க்கை முன்னேற்றத்தில் நேரடி பலன் தரும். திறமை தொடர்ந்து பயன்படுத்தப்படும் போது அது தொழில் அல்லது வருமான வாய்ப்பாக மாறும் அமைப்பு உள்ளது.`),
 turning:()=>add(`வாழ்க்கையில் சில கட்டங்களில் பழைய பாதையை விடுத்து புதிய திசைக்கு மாற வேண்டிய சூழல் வரலாம். அந்த மாற்றங்கள் முதலில் சிரமமாகத் தோன்றினாலும் அனுபவத்துக்குப் பிறகு மீள்வளர்ச்சி மற்றும் புதிய வாய்ப்பை உருவாக்கும் தன்மை உள்ளது.`),
 business:()=>add(`வியாபாரத்தில் வாடிக்கையாளர் தொடர்பு, ஒப்பந்தம், தொடர்ச்சியான முயற்சி மற்றும் பணப்புழக்க கட்டுப்பாடு முக்கியம். ${x.strong?'சரியான திட்டமிடலுடன் வளர்ச்சி பெறும் ஆதரவு உள்ளது.':x.pressured?'விற்பனை இருந்தாலும் செலவு/பணம் தங்குதல் தனியாகக் கவனிக்கப்பட வேண்டும்.':'சுயதொழிலும் கூட்டாண்மையும் செயல்படும் தசையின் தன்மைக்கு ஏற்ப மாறுபடும்.'}`),
 finance:()=>add(`வருமானம் ஈட்டும் திறனையும் பணத்தை வைத்திருக்கும் திறனையும் தனித்தனியாக பார்க்க வேண்டும். ${x.strong?'வருமானத்தை சேமிப்பு மற்றும் சொத்து வளர்ச்சியாக மாற்றும் வாய்ப்பு உள்ளது.':x.pressured?'வருமானத்துடன் செலவு அல்லது பொறுப்பும் கூடக்கூடும்; சேமிப்பு ஒழுங்கு முக்கியம்.':'வருமானம் நிலைபெறும் காலமும் செலவு அதிகரிக்கும் காலமும் மாறிமாறி வரலாம்.'}`),
 marriage:()=>{const d9=!!division(data,9);add(`திருமண வாய்ப்பு உறவு உருவாகுவது மட்டும் அல்ல; குடும்ப ஒத்துழைப்பு, துணைவர் தொடர்பு மற்றும் திருமணத்திற்குப் பிந்தைய நிலைத்தன்மை ஒன்றாகச் சேர்ந்தே மதிப்பிடப்படுகிறது. ${x.mixed?'ஈர்ப்பும் ஆதரவும் இருந்தாலும் சில கட்டங்களில் கருத்து வேறுபாடு அல்லது பொறுப்பு சார்ந்த சோதனை வரலாம்.':x.strong?'உறவை நிலைப்படுத்தும் ஆதரவு மேலோங்குகிறது.':x.pressured?'துணைவர் தேர்வு மற்றும் திருமண நேரத்தை கவனமாக அணுக வேண்டிய அமைப்பு உள்ளது.':'செயல்படும் தசை காலத்தில் திருமண வாய்ப்பு தெளிவாக வலுப்படும்.'} ${d9?'நவாம்ச ஆதாரம் கிடைப்பதால் திருமண காலத்தை D1 மற்றும் D9 இரண்டின் ஒத்த செயல்பாட்டுடன் வாசிக்கப்படுகிறது.':'நவாம்சத் தரவு இல்லாததால் திருமண நேரத்தில் கூடுதல் உறுதிப்படுத்தல் தேவைப்படும்.'}`)},
 children:()=>{const d7=!!division(data,7);add(`${x.strong?'குழந்தைப் பேறு மற்றும் குடும்ப விரிவை ஆதரிக்கும் காரணிகள் மேலோங்குகின்றன.':x.pressured?'குழந்தை தொடர்பான விஷயங்களில் பொறுமை, திட்டமிடல் மற்றும் சரியான காலத் தேர்வு முக்கியமாகிறது.':'குழந்தை தொடர்பான பலன் கலப்பு நிலையில் இருப்பதால் செயல்படும் தசை காலம் முக்கிய தீர்மானியாகிறது.'} ${d7?'சப்தாம்ச ஆதாரம் கிடைப்பதால் பிறப்பு ஜாதகத்தின் 5-ஆம் பாவ நிலையை அதனுடன் இணைத்தே காலப் பலன் வாசிக்கப்படுகிறது.':'சப்தாம்சத் தரவு இல்லாததால் பிறப்பு ஜாதகத்தின் 5-ஆம் பாவம் மற்றும் குரு தொடர்பை மையமாகக் கொண்டு பலன் வாசிக்கப்படுகிறது.'} இது குழந்தை ஏற்கனவே பிறந்தது என்ற உறுதிப்படுத்தல் அல்ல; வாய்ப்பு மற்றும் செயல்பாட்டு காலத்தைக் குறிக்கும் ஜோதிட மதிப்பீடு.`)},
 education:()=>add(`கற்றல் திறன் அனுபவத்துடன் வளரக்கூடியது. அடிப்படை கல்வியைத் தொடர்ந்து திறன் பயிற்சி, தொழில்முறை அறிவு அல்லது உயர்கல்வி வழியாக முன்னேற்றம் பெறும் வாய்ப்பு உள்ளது. ${x.pressured?'படிப்பில் இடைவேளை ஏற்பட்டாலும் மீண்டும் தொடங்கும் திறனை குறைத்து மதிப்பிடக்கூடாது.':''}`),
 property:()=>add(`வீடு, நிலம் அல்லது வாகனம் தொடர்பான முடிவுகள் குடும்பத் தேவையும் பணத்திறனும் ஒன்றாகச் சேர்ந்தபோது நடைமுறைக்கு வரும். ${x.strong?'சொத்து உருவாக்கத்தை நிலையான முதலீடாக மாற்றும் ஆதரவு உள்ளது.':x.pressured?'கடன், ஆவணம், செலவு மற்றும் நேரத் தேர்வை கவனமாக பார்க்க வேண்டும்.':'சரியான தசை காலத்தில் சொத்து முடிவு வலுப்படும்.'}`),
 debt:()=>add(`கடன் அல்லது போட்டி சூழல் வந்தாலும் அதை சமாளிக்கும் திறன் தனியாக உள்ளது. ${x.pressured?'புதிய கடன் எடுக்கும் முன் திருப்பிச் செலுத்தும் திறன் மற்றும் எதிர்பாராத செலவை கணக்கிடுவது அவசியம்.':'ஒழுங்கான பணநிர்வாகம் மூலம் கடன் சுமையை கட்டுப்படுத்தும் வாய்ப்பு உள்ளது.'}`),
 health:()=>add(`உடல் சக்தி மற்றும் ஓய்வு சமநிலையை பராமரிப்பது முக்கியம். வேலைப்பளு, தூக்கம், உணவு மற்றும் மனஅழுத்த ஒழுங்கு குலையும் காலங்களில் உடல் சோர்வு அதிகமாக உணரப்படலாம். இது பாரம்பரிய ஜோதிடக் குறிப்பு மட்டுமே; மருத்துவ அறிகுறிகளுக்கு மருத்துவ மதிப்பீடே முதன்மை.`),
 family:()=>add(`குடும்பத்தில் பொறுப்பு ஏற்றுக்கொள்வதும் பேசித் தீர்ப்பதும் இல்லற அமைதிக்கு முக்கியமாகும். ${x.mixed?'அன்பும் ஆதரவும் இருந்தாலும் கருத்து வேறுபாடுகள் சில நேரங்களில் மனஅழுத்தத்தை உருவாக்கலாம்.':'குடும்ப உறவுகளை நிலைப்படுத்தும் திறன் உள்ளது.'}`),
 parents:()=>add(`பெற்றோர் மற்றும் குடும்பத்திலிருந்து கிடைக்கும் ஆதரவு வாழ்க்கையின் எல்லா கட்டங்களிலும் ஒரே மாதிரியாக இருக்காது. ${x.pressured?'வீடு, வசிப்பிடம், குடும்பப் பொறுப்பு அல்லது தலைமுறை வேறுபாடு காரணமாக சில காலங்களில் இடைவெளி அல்லது கூடுதல் பொறுப்பு ஏற்படலாம்.':'தேவையான நேரத்தில் குடும்ப வழிகாட்டல் மற்றும் ஆதரவைப் பெறும் வாய்ப்பு உள்ளது.'} வயது அதிகரிக்கும்போது பெற்றோர்/வீட்டு பொறுப்பை நீங்களே அதிகமாக ஏற்றுக்கொள்ளும் நிலை உருவாகலாம்.`),
 siblings:()=>add(`சகோதரர்கள் மற்றும் நெருங்கிய வலையமைப்புடன் உறவு முயற்சி மற்றும் தொடர்பின் தரத்தைப் பொறுத்து மாறும். இணைந்து செயல்படும் போது உதவி கிடைக்கலாம்; கருத்து வேறுபாடு வந்தால் நேரடியான தொடர்பு பிரச்சினையை குறைக்கும்.`),
 travel:()=>add(`பயணம் வாழ்க்கையில் வேலை, கல்வி, குடும்பத் தேவை அல்லது புதிய வாய்ப்பு காரணமாக முக்கியமாகலாம். ${x.pressured?'இடமாற்றம் ஆரம்பத்தில் சிரமம் அல்லது செலவு தரினும் பின்னர் புதிய அனுபவம்/வாய்ப்பைத் திறக்கலாம்.':'தூரப் பயணம் அல்லது இடமாற்றம் முன்னேற்றத்துடன் இணையும் வாய்ப்பு உள்ளது.'}`),
 status:()=>add(`சமூக அங்கீகாரம் உடனடியாக கிடைப்பதை விட பொறுப்பு, தொடர்ந்து செய்த வேலை மற்றும் நம்பகத்தன்மை மூலம் உருவாகும். ${x.strong?'பதவி அல்லது பொது மதிப்பு படிப்படியாக உயர வாய்ப்பு உள்ளது.':x.pressured?'அங்கீகாரம் தாமதமாக வந்தாலும் நிலையான உழைப்பால் மதிப்பு உருவாக்க முடியும்.':'செயல்படும் காலங்களில் பொறுப்புடன் சேர்ந்து அங்கீகாரமும் அதிகரிக்கலாம்.'}`),
 fortune:()=>add(`வாழ்க்கை முன்னேற்றம் வெறும் அதிர்ஷ்டமாக அல்லாமல் சரியான நேரத்தில் கிடைக்கும் வாய்ப்பை பயன்படுத்தும் திறன் மூலம் வெளிப்படும். வழிகாட்டல், கல்வி, தொடர்புகள் அல்லது நீண்ட பயணம் சில முக்கிய கதவுகளைத் திறக்கக்கூடும்.`),
 spiritual:()=>add(`ஆன்மிகம் வாழ்க்கையில் அனுபவத்துடன் ஆழமடையும் தன்மை கொண்டது. வழிபாடு, தியானம், குரு/மூத்தவர் வழிகாட்டல் அல்லது தனிமையில் சிந்திக்கும் காலங்கள் மனத் தெளிவை அதிகரிக்க உதவலாம்; இது உலக வாழ்க்கையை விட்டு விலக வேண்டும் என்பதைக் குறிக்காது.`),
 remedy:()=>add(x.pre?`பரிகாரம் காரணமில்லாமல் நிரந்தர பட்டியலாக காட்டப்படக்கூடாது. தற்போதைய ஜாதகத்தில் மீதமுள்ள சவால்களுக்கு முதலில் வாழ்க்கை ஒழுங்கு, பொறுப்பு, செலவு/உறவு கட்டுப்பாடு போன்ற நடைமுறை திருத்தங்களே முன்னுரிமை; குறிப்பிட்ட தோஷம் உறுதியாக மீதமிருந்தால் மட்டுமே அதற்குரிய பாரம்பரிய வழிபாடு சேர்க்கப்பட வேண்டும்.`:`தனிப்பட்ட மீதமுள்ள தோஷம் உறுதியாக இல்லாதபோது கட்டாய பரிகாரம் தேவையில்லை; காரணமில்லாத நிலையான பரிகாரப் பட்டியல் காட்டப்படாது.`)
 };
 (map[d]||(()=>add(balance)))();
 return out.filter(Boolean).join(' ');
}
function specificEn(c,data,d){
 const x=lifeState(c,data,d,'en');
 const balance=x.mixed?'Support and challenge coexist, so results tend to stabilise gradually.':x.strong?'Constructive support is stronger overall.':x.pressured?'Progress is possible, but it depends more on discipline, timing and sustained effort.':'Results become clearer when the relevant dasha is active.';
 const f=careerFields(c,'en');
 const map={career:`Career develops through responsibility and practical use of skills. ${balance}${f.length?` The repeatedly supported work directions are ${f.join(', ')}.`:''}`,jobchange:`Job change or promotion may arrive through a change of role, team, location or responsibility rather than only through a new employer. ${balance}`,skills:'Initiative, communication and repeated use of learned skills can convert ability into career or income opportunities.',turning:'Some phases require leaving an old pattern and rebuilding in a new direction; difficult transitions can later become recovery and growth.',business:`Business depends on clients, execution and cash-flow discipline. ${balance}`,finance:`Earning and retaining money must be read separately. ${balance}`,marriage:`Marriage is read as a combination of partnership, family formation and long-term stability. ${balance}`,children:`Children-related outcomes are tied to family expansion, responsibility and timing. ${balance}`,education:'Learning can deepen through skill training, professional study or higher education; interruptions do not automatically cancel later progress.',property:`Property and vehicle decisions become practical when family need and financial capacity align. ${balance}`,debt:'Debt and competition can be managed more effectively through repayment discipline and control of unexpected outflow.',health:'Vitality benefits from balance in workload, sleep, food and stress. This is traditional astrological context, not medical diagnosis.',family:`Family stability depends strongly on communication and shared responsibility. ${balance}`,parents:`Parental and family support may not look the same at every stage of life. ${balance} Responsibility for home or parents can increase with age.`,siblings:'Sibling and close-network support improves when communication and initiative are maintained.',travel:`Travel or relocation may become important through work, study, family needs or opportunity. ${balance}`,status:`Recognition grows more reliably through responsibility, consistent work and trust than through instant visibility. ${balance}`,fortune:'Progress is more likely to come from using timely opportunities, guidance, education and networks than from effortless luck.',spiritual:'Inner development can deepen through worship, reflection, guidance or periods of solitude without implying withdrawal from ordinary life.',remedy:x.pre?'Remedies should be conditional: practical correction comes first, and a traditional remedy is added only when a specific residual affliction remains after mitigation is checked.':'No fixed remedy should be prescribed when no specific residual affliction is established.'};
 return map[d]||balance;
}
function sentence(c,data,d,l){const base=l==='ta'?specificTa(c,data,d):specificEn(c,data,d);const adv=advancedBalanceText(c,data,d,l);return [base,adv].filter(Boolean).join(' ')}

function periodEvidence(c,d,w,l){
 const q=domains[d], parts=[], seen=new Set();
 for(const pn of [w.md,w.ad,w.pd]){
  if(seen.has(pn)) continue; seen.add(pn);
  const h=hof(c,pn), sc=relScore(c,pn,d); if(sc<=0) continue;
  const owns=[]; lords.forEach((x,i)=>{if(x===pn){const oh=house(i,ls(c));if(q.rel.includes(oh)&&!owns.includes(oh))owns.push(oh)}});
  if(l==='ta'){
   let why=h?`${langPlanet(pn,l)} ${houseName(h,l)}-இல் உள்ளது`:`${langPlanet(pn,l)} செயல்படுகிறது`;
   if(owns.length) why+=`; மேலும் ${owns.map(x=>houseName(x,l)).join(' மற்றும் ')} அதிபதித் தொடர்பு உள்ளது`;
   else if(q.rel.includes(h)) why+=`; இது இந்தப் பலனுக்குரிய பாவத்தை நேரடியாகச் செயல்படுத்துகிறது`;
   else why+=`; காரகத் தொடர்பு இந்தப் பலனில் பங்கேற்கிறது`;
   parts.push(why+'.');
  }else{
   let why=h?`${pn} is placed in house ${h}`:`${pn} is active`;
   if(owns.length) why+=` and rules relevant house${owns.length>1?'s':''} ${owns.join(', ')}`;
   else if(q.rel.includes(h)) why+=`, directly activating a relevant house`;
   else why+=`, contributing through its significator role`;
   parts.push(why+'.');
  }
 }
 return parts.join(' ');
}
function phaseMeaning(d,pn,l){
 const planetTa={Sun:'முடிவு, அதிகாரம் மற்றும் வெளிப்படையான பொறுப்பை முன்னிலைப்படுத்தும்',Moon:'மனநிலை, குடும்பத் தேவைகள் மற்றும் மாற்றத்துக்கு ஏற்ப ஒத்துப்போக வேண்டிய சூழலை முன்னிலைப்படுத்தும்',Mars:'வேகமான செயல், துணிவு மற்றும் உடனடி முடிவைத் தூண்டும்; அவசரத்தை கட்டுப்படுத்த வேண்டிய கட்டமாகும்',Mercury:'பேச்சுவார்த்தை, தகவல் பரிமாற்றம், ஆவணம் மற்றும் முடிவு எடுப்பை முன்னிலைப்படுத்தும்',Jupiter:'விரிவு, ஒப்புதல், வழிகாட்டல் மற்றும் நிலையான வளர்ச்சிக்கு ஆதரவு தரும்',Venus:'ஒத்துழைப்பு, சமரசம், உறவு நெருக்கம் மற்றும் வசதியை முன்னிலைப்படுத்தும்',Saturn:'பொறுப்பு, நடைமுறை சோதனை, உறுதி மற்றும் நீண்டகால நிலைத்தன்மையை முன்னிலைப்படுத்தும்',Rahu:'எதிர்பாராத திருப்பம், புதிய தொடர்பு அல்லது வழக்கத்திற்கு மாறான வாய்ப்பைத் தூண்டும்',Ketu:'மறுபரிசீலனை, பற்றின்மை அல்லது பழைய முறையை விடுத்து தெளிவு பெற வேண்டிய கட்டமாகும்'};
 const planetEn={Sun:'emphasises decisions, authority and visible responsibility',Moon:'emphasises emotional needs, family considerations and adjustment',Mars:'pushes action and courage but requires control of haste',Mercury:'emphasises discussion, communication, paperwork and decisions',Jupiter:'supports expansion, approval, guidance and sustainable growth',Venus:'emphasises cooperation, harmony, closeness and comfort',Saturn:'emphasises responsibility, practical testing, commitment and durability',Rahu:'can bring an unexpected turn, new contact or unconventional opening',Ketu:'favours reassessment, detachment and clarity through letting go of an old pattern'};
 const ta={
  career:{Sun:'பதவி, மேலதிகாரி தொடர்பு அல்லது பொறுப்பு தெளிவாகும்',Moon:'பணிச்சூழல் அல்லது குழு தேவைகளுக்கு ஏற்ப மாற்றம் செய்ய வேண்டி வரும்',Mars:'புதிய செயல், போட்டி அல்லது வேகமான வேலை மாற்ற முயற்சி அதிகரிக்கும்',Mercury:'நேர்காணல், ஒப்பந்தம், தகவல் தொடர்பு அல்லது திறன் சார்ந்த வேலை வாய்ப்பு முன்னிலையாகும்',Jupiter:'வளர்ச்சி, பதவி உயர்வு, வழிகாட்டல் அல்லது நல்ல வாய்ப்பை ஏற்கும் சூழல் வலுப்படும்',Venus:'குழு ஒத்துழைப்பு, வாடிக்கையாளர் தொடர்பு மற்றும் பணிச்சூழல் வசதி மேம்படும்',Saturn:'பொறுப்பு அதிகரித்து, நிலையான பதவி அல்லது நீண்டகால வேலை அமைப்பு சோதிக்கப்படும்',Rahu:'புதிய தொழில்நுட்பம், வெளிநாட்டு தொடர்பு அல்லது வழக்கத்திற்கு மாறான வேலை வாய்ப்பு தோன்றலாம்',Ketu:'பழைய வேலையின் அர்த்தத்தை மறுபரிசீலித்து திசைமாற்றம் செய்யும் எண்ணம் அதிகரிக்கலாம்'},
  marriage:{Sun:'உறவை அதிகாரப்பூர்வமாக்குவது, குடும்ப முடிவு அல்லது சுயமரியாதை சார்ந்த பேச்சு முன்னிலையாகலாம்',Moon:'உணர்ச்சி பாதுகாப்பு, குடும்ப ஒப்புதல் மற்றும் இல்லறத் தேவைகள் முக்கியமாகும்',Mars:'ஈர்ப்பு மற்றும் முடிவு வேகம் அதிகரிக்கலாம்; கோபம் அல்லது அவசர முடிவை கட்டுப்படுத்த வேண்டும்',Mercury:'திருமண பேச்சு, தகவல் பரிமாற்றம், சந்திப்பு அல்லது ஒப்புதல் தொடர்பான முடிவுகள் முன்னேறலாம்',Jupiter:'குடும்ப ஒப்புதல், நல்ல வழிகாட்டல் மற்றும் உறவை நிலைப்படுத்தும் வாய்ப்பு வலுப்படலாம்',Venus:'ஈர்ப்பு, சமரசம், துணைவர் நெருக்கம் மற்றும் திருமண உறவை உருவாக்கும் சக்தி அதிகரிக்கலாம்',Saturn:'உறவின் பொறுப்பு, நீண்டகால பொருத்தம் மற்றும் உறுதிப்பாடு நடைமுறையில் சோதிக்கப்படும்',Rahu:'எதிர்பாராத அறிமுகம், வேறுபட்ட பின்னணி அல்லது வழக்கத்திற்கு மாறான உறவு சூழல் உருவாகலாம்',Ketu:'உறவை மறுபரிசீலனை செய்வது, இடைவெளி தேவைப்படுவது அல்லது பழைய எதிர்பார்ப்புகளை விடுவது முக்கியமாகலாம்'},
  children:{Sun:'குழந்தை தொடர்பான குடும்ப முடிவு மற்றும் பொறுப்பு தெளிவாகும்',Moon:'பராமரிப்பு, குடும்ப மனநிலை மற்றும் குழந்தை தொடர்பான உணர்ச்சி தேவைகள் முன்னிலையாகும்',Mars:'குழந்தை தொடர்பான திட்டத்தில் வேகமான செயல் அல்லது மருத்துவ ஆலோசனை தேடும் முயற்சி அதிகரிக்கலாம்',Mercury:'திட்டமிடல், ஆலோசனை, கல்வி அல்லது குழந்தை தொடர்பான நடைமுறை முடிவுகள் முன்னிலையாகும்',Jupiter:'புத்திர காரக ஆதரவு செயல்பட்டு குடும்ப விரிவு அல்லது குழந்தை தொடர்பான நல்ல முன்னேற்றத்திற்கு ஏற்ற கட்டமாக அமையலாம்',Venus:'குடும்ப ஒற்றுமை, தம்பதி ஒத்துழைப்பு மற்றும் குழந்தை திட்டமிடலுக்கான ஆதரவு அதிகரிக்கலாம்',Saturn:'பொறுப்பு மற்றும் பொறுமை அதிகம் தேவைப்படும்; தாமதம் இருந்தால் திட்டமிட்ட அணுகுமுறை முக்கியமாகும்',Rahu:'வழக்கத்திற்கு மாறான திட்டமிடல் அல்லது எதிர்பாராத மாற்றம் ஏற்படலாம்; முடிவை அவசரப்படுத்த வேண்டாம்',Ketu:'குழந்தை தொடர்பான எதிர்பார்ப்புகளை மறுபரிசீலித்து தெளிவான திட்டம் அமைக்க வேண்டிய கட்டமாகலாம்'}
 };
 const en={
  marriage:{Sun:'can bring formal decisions, family involvement or questions of pride to the foreground',Moon:'brings emotional security, family acceptance and domestic needs into focus',Mars:'increases attraction and decisiveness but requires control of conflict or haste',Mercury:'favours discussion, meetings, communication and practical agreement',Jupiter:'can strengthen approval, guidance and the ability to stabilise a relationship',Venus:'strengthens attraction, harmony, closeness and relationship formation',Saturn:'tests responsibility, commitment and long-term compatibility in practical terms',Rahu:'can introduce an unexpected contact, different background or unconventional relationship setting',Ketu:'can trigger reassessment, distance or release of an old expectation'},
  children:{Jupiter:'activates the natural significator for children and can strengthen family-expansion support',Saturn:'asks for patience, responsibility and structured planning if delays exist',Venus:'supports couple cooperation and family harmony around children-related planning',Mercury:'favours planning, consultation, education and practical decisions',Mars:'pushes action and may increase the need for prompt practical or medical consultation',Moon:'emphasises care, family emotions and nurturing needs'},
  career:{Sun:'highlights rank, authority and visible responsibility',Mercury:'favours interviews, contracts, communication and skill-based work',Jupiter:'supports growth, promotion, guidance or a constructive opportunity',Saturn:'tests responsibility and the durability of the work structure',Mars:'pushes action, competition and rapid work decisions',Rahu:'can bring technology, foreign links or an unconventional opportunity'}
 };
 const special=(l==='ta'?ta:en)[d]?.[pn];
 if(special)return special;
 const base=phaseMeaningBase(d,l);
 return l==='ta'?`${base}; ${planetTa[pn]||''}`:`${base}; ${planetEn[pn]||''}`;
}
function phaseMeaningBase(d,l){
 const ta={career:'தொழில் நிலை மாற்றம்',jobchange:'வேலை மாற்றம் அல்லது புதிய பொறுப்பு',skills:'திறன் பயன்பாடு மற்றும் முயற்சி',turning:'வாழ்க்கைத் திருப்பம் மற்றும் மீள்வளர்ச்சி',business:'வியாபார செயல்பாடு மற்றும் கூட்டாண்மை',finance:'வருமானம், லாபம் மற்றும் சேமிப்பு',marriage:'திருமணம் மற்றும் உறவு நிலை',children:'குழந்தை மற்றும் குடும்ப விரிவு',education:'கல்வி மற்றும் பயிற்சி',property:'வீடு, நிலம் அல்லது சொத்து முடிவு',debt:'கடன், போட்டி அல்லது திருப்பிச் செலுத்தல்',health:'உடல் சக்தி மற்றும் ஓய்வு ஒழுங்கு',family:'குடும்ப ஒத்துழைப்பு',parents:'பெற்றோர் மற்றும் வீட்டு பொறுப்பு',siblings:'சகோதர உறவு மற்றும் முயற்சி',travel:'பயணம் அல்லது இடமாற்றம்',status:'பொறுப்பு மற்றும் அங்கீகாரம்',fortune:'வாய்ப்பு மற்றும் முன்னேற்றம்',spiritual:'ஆன்மிக ஈடுபாடு மற்றும் உள்ளார்ந்த மாற்றம்',remedy:'நடைமுறை திருத்தம் மற்றும் சமநிலை'};
 const en={career:'career conditions',jobchange:'job change or new responsibility',skills:'skills and initiative',turning:'turning points and recovery',business:'business and partnership',finance:'income, gains and savings',marriage:'marriage and relationship conditions',children:'children and family expansion',education:'education and training',property:'property decisions',debt:'debt and competition',health:'vitality and health routines',family:'family cooperation',parents:'parents and home responsibility',siblings:'siblings and initiative',travel:'travel or relocation',status:'responsibility and recognition',fortune:'opportunity and progress',spiritual:'spiritual engagement and inner change',remedy:'practical correction and balance'};
 return (l==='ta'?ta:en)[d]||'';
}
function periodLine(c,d,w,l,kind){
 if(!w)return '';
 const dates=`${w.start} → ${w.end}`, why=periodEvidence(c,d,w,l), theme=phaseMeaning(d,w.pd,l);
 if(l==='ta'){
  const k=kind==='past'?'கடந்தகால செயல்பாட்டு காலம்':kind==='current'?'தற்போது செயல்படும் காலம்':'செயல்படும் காலம்';
  const lead=kind==='past'?`இந்தக் காலத்தில் ${theme} தொடர்பான செயல்பாடு அதிகரித்திருக்கக்கூடிய ஜோதிட அமைப்பு உள்ளது.`:kind==='current'?`இந்தக் காலத்தில் ${theme} முக்கியமாக செயல்படும் அமைப்பு உள்ளது.`:`இந்தக் கட்டத்தில் ${theme} முன்னிலைக்கு வரக்கூடிய அமைப்பு உள்ளது.`;
  return `${k}: ${dates}. ${dashaText(w,l)}. ${lead} ${why}`;
 }
 const k=kind==='past'?'Past activation':kind==='current'?'Current activation':'Activation period';
 const lead=kind==='past'?`This period could have activated ${theme}.`:kind==='current'?`This period is actively emphasizing ${theme}.`:`This phase can emphasize ${theme}.`;
 return `${k}: ${dates}. ${dashaText(w,l)}. ${lead} ${why}`;
}
function groupFuture(c,d,arr,l){
 if(!arr.length)return '';
 const groups=[];
 for(const w of arr){
  const g=groups.at(-1), gap=g?Math.abs(+w.a-+g.end):Infinity;
  if(g && gap<=86400000*30 && g.md===w.md && g.ad===w.ad){g.items.push(w);g.end=w.b;g.endText=w.end}
  else groups.push({md:w.md,ad:w.ad,start:w.a,end:w.b,startText:w.start,endText:w.end,items:[w]});
 }
 return groups.map(g=>{
  if(g.items.length===1)return periodLine(c,d,g.items[0],l,'future');
  if(l==='ta'){
   const phases=g.items.map(w=>`${w.start} → ${w.end}: ${langPlanet(w.pd,l)} அந்தரத்தில் ${phaseMeaning(d,w.pd,l)}.`).join(' ');
   return `அருகிலுள்ள எதிர்காலத்தின் முக்கிய காலவரிசை: ${g.startText} → ${g.endText}. ${langPlanet(g.md,l)} மகாதசை – ${langPlanet(g.ad,l)} புக்திக்குள் பலன் ஒரே மாதிரியாக இருக்காது. ${phases}`;
  }
  const phases=g.items.map(w=>`${w.start} → ${w.end}: ${w.pd} Antaram ${phaseMeaning(d,w.pd,l)}.`).join(' ');
  return `Key near-future sequence: ${g.startText} → ${g.endText}. Results are not treated as identical throughout ${g.md} Mahadasha – ${g.ad} Bhukti. ${phases}`;
 }).join(' ')
}
function renderDomain(c,data,d,l,payload){
 const q=domains[d],x=classify(c,d,payload);
 const past=x.past.map(w=>periodLine(c,d,w,l,'past')).filter(Boolean).join(' ');
 const current=x.current.map(w=>periodLine(c,d,w,l,'current')).filter(Boolean).join(' ');
 const future=groupFuture(c,d,x.future,l);
 const pastSafe=past||(l==='ta'?'இந்த ஜாதகத்தில் கிடைத்த தசா வரலாற்றில் இந்தப் பலனுக்குரிய தனிப்பட்ட கடந்தகால காலத்தை கணக்கிட போதுமான காலத் தரவு இல்லை.':'The available dasha history does not contain enough historical period data to calculate a separate past activation for this domain.');
 const currentSafe=current||(l==='ta'?'தற்போதைய தசா காலத் தரவு கிடைக்கவில்லை.':'Current dasha-period data is unavailable.');
 const futureSafe=future||(l==='ta'?'அருகிலுள்ள எதிர்கால தசா காலத் தரவு கிடைக்கவில்லை.':'Near-future dasha-period data is unavailable.');
 const ae=smvAdvancedEvidence(c,data,d,l), evidenceHtml=ae.out.length?`<details class="smv-pred-evidence"><summary>${l==='ta'?'ஆதாரம் / Advanced Evidence':'Evidence / Advanced Analysis'}</summary><ul>${ae.out.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></details>`:'';
 return `<section class="smv-pred-domain"><h4>${esc(l==='ta'?q.ta:q.en)}</h4><p>${esc(sentence(c,data,d,l))}</p>${evidenceHtml}<div class="smv-pred-time"><b>${l==='ta'?'கடந்தகால ஆய்வு':'Past review'}</b><p>${esc(pastSafe)}</p><b>${l==='ta'?'தற்போதைய பலன்':'Current outlook'}</b><p>${esc(currentSafe)}</p><b>${l==='ta'?'அருகிலுள்ள எதிர்காலம்':'Near future'}</b><p>${esc(futureSafe)}</p></div></section>`
}
async function render(ev){const {full,payload,lang='en',rootId}=ev.detail||{},root=document.getElementById(rootId);if(!root||!full?.chart)return;const target=root.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');if(!target)return;const c=full.chart;const order=['career','jobchange','skills','turning','business','finance','marriage','children','education','property','debt','health','family','parents','siblings','travel','status','fortune','spiritual','remedy'];let html=`<div class="adv-section"><h3>🔭 ${lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${lang==='ta'?'பிறப்பு ஜாதகம், பாவம்–பாவாதிபதி, கிரக இருப்பு, இணைவு மற்றும் பார்வைகள், இயற்கை மற்றும் செயல்பாட்டு சுப–பாபத் தாக்கங்கள், தொடர்புடைய பிரிவு ஜாதகங்கள், தசை–புக்தி–அந்தரம் ஆகியவை ஒன்றிணைத்து கீழுள்ள விரிவான பலன்கள் வழங்கப்படுகின்றன. கடந்தகாலக் காலப்பகுதி ஒரு ஜோதிடச் செயல்பாட்டு சுட்டி மட்டுமே; நிகழ்வு நடந்ததற்கான உறுதி அல்ல.':'The following synthesis combines the natal chart, houses and lords, placements and aspects, relevant divisional charts, and Vimshottari periods. Past periods indicate astrological activation, not proof that an event occurred. Tajaka, Sarvatobhadra Chakra and Sudarshana Chakra remain available as separate timing/confirmation layers and are not misused as natal promise.'}</p>`;for(const d of order)html+=renderDomain(c,full,d,lang,payload);html+='</div>';target.innerHTML=html;}

// V39 LEGACY ROOT: domain-specific life-result synthesis + actual D7/D9/D10 placement signals + dated transit convergence.
const V39_LIFE_BASE_TA={career:'தொழில் வாழ்க்கையில் பொறுப்பை ஏற்று திறனை தொடர்ந்து பயன்படுத்தும் போது நிலையான முன்னேற்றம் உருவாகும்; பதவி மற்றும் பணியின் திசை காலத்தோடு தெளிவாகும்.',jobchange:'வேலை மாற்றம் வெறும் நிறுவன மாற்றமாக மட்டும் அல்லாமல் பதவி, குழு, இடம் அல்லது பொறுப்பு மாறுவதன் மூலமும் வெளிப்படலாம்.',skills:'தொடர்பு, கற்றல் மற்றும் சுயமுயற்சியை தொடர்ந்து பயன்படுத்தினால் திறமை நேரடியாக வேலை அல்லது வருமான வாய்ப்பாக மாறும்.',turning:'சில வாழ்க்கைக் கட்டங்கள் பழைய அமைப்பை உடைத்து புதிய பாதையை உருவாக்கும்; ஆரம்ப சிரமத்திற்குப் பிறகு மீள்வளர்ச்சி சாத்தியம்.',business:'வியாபார பலன் வாடிக்கையாளர் தொடர்பு, ஒப்பந்தத் தெளிவு, பணப்புழக்கம் மற்றும் தினசரி செயலாக்கத்தை கட்டுப்படுத்தும் திறனைப் பொறுத்து வளர்கிறது.',finance:'பணம் சம்பாதிக்கும் திறனும் அதை சேமித்து வைத்திருக்கும் திறனும் தனித்தனியாக செயல்படுகின்றன; வருமான உயர்வுடன் செலவு ஒழுங்கும் அவசியம்.',marriage:'திருமண பலன் ஈர்ப்பை மட்டும் சாராது; துணைவர் தேர்வு, குடும்ப ஒப்புதல், பரஸ்பர பொறுப்பு மற்றும் திருமணத்திற்குப் பிந்தைய நிலைத்தன்மை ஒன்றாக செயல்படுகின்றன.',children:'குழந்தை சார்ந்த பலன் குடும்ப விருப்பம், தம்பதி ஒத்துழைப்பு, உடல்/நடைமுறை தயாரிப்பு மற்றும் சரியான காலச் செயல்பாட்டின் கூட்டுப் பலனாக வெளிப்படும்.',education:'கல்வி ஒரே தொடர்ச்சியான பாதையாக இல்லாவிட்டாலும் திறன் பயிற்சி, தொழில்முறை படிப்பு அல்லது உயர்கல்வி வழியாக மீண்டும் முன்னேற முடியும்.',property:'வீடு, நிலம் அல்லது வாகன முடிவு குடும்பத் தேவை, வசிப்பிட மாற்றம் மற்றும் நிதித் திறன் ஒன்றாகப் பொருந்தும் காலத்தில் நடைமுறைக்கு வரும்.',debt:'கடன் மற்றும் போட்டி நிலை கட்டுப்பாடற்ற செலவை குறைத்து திருப்பிச் செலுத்தும் ஒழுங்கை வைத்தால் சமாளிக்கக்கூடியதாக மாறும்; வழக்கு/எதிர்ப்பு விஷயங்களில் ஆவணத் தெளிவு முக்கியம்.',health:'உடல் சக்தி வேலைச்சுமை, தூக்கம், உணவு மற்றும் மனஅழுத்த ஒழுங்குடன் நெருக்கமாக இணைகிறது; இது மருத்துவ diagnosis அல்ல, பாரம்பரிய ஜோதிடச் சுட்டி.',family:'குடும்ப அமைதி ஒருவரின் ஆதரவை மட்டும் சாராமல் பேச்சு, பொறுப்பு பகிர்வு மற்றும் பண/வீட்டு முடிவுகளை தெளிவாக நடத்துவதால் நிலைபெறும்.',parents:'பெற்றோர் ஆதரவு வாழ்க்கையின் எல்லா கட்டங்களிலும் ஒரே வடிவில் இருக்காது; வயது அதிகரிக்கும்போது வீடு அல்லது பெற்றோர் சார்ந்த பொறுப்பை நீங்களே ஏற்கும் நிலை அதிகரிக்கலாம்.',siblings:'சகோதர உறவு மற்றும் நெருங்கிய வலையமைப்பில் தொடர்பைத் தொடர்ந்து வைத்திருப்பதும் தேவையான நேரத்தில் முன்வந்து உதவுவதும் ஆதரவை வலுப்படுத்தும்.',travel:'பயணம் அல்லது இடமாற்றம் வேலை, கல்வி, குடும்பத் தேவை அல்லது புதிய வாய்ப்புடன் இணைந்து வாழ்க்கைத் திசையை மாற்றக்கூடும்.',status:'அங்கீகாரம் திடீர் புகழைவிட தொடர்ந்து ஏற்ற பொறுப்பு, நம்பகத்தன்மை மற்றும் செய்த வேலையின் விளைவு மூலம் நிலையாக வளரக்கூடும்.',fortune:'வாழ்க்கை முன்னேற்றம் முயற்சியில்லா அதிர்ஷ்டத்தைவிட சரியான வாய்ப்பை அடையாளம் கண்டு பயன்படுத்துதல், வழிகாட்டல் மற்றும் வலையமைப்பின் மூலம் அதிகமாக வெளிப்படும்.',spiritual:'ஆன்மிக வளர்ச்சி வழிபாடு, தியானம், குரு வழிகாட்டல் அல்லது தனிமையில் சிந்திக்கும் காலங்கள் மூலம் ஆழமடையலாம்; இது உலக வாழ்க்கையிலிருந்து விலக வேண்டும் என்பதல்ல.',remedy:'பரிகாரம் எல்லோருக்கும் ஒரே மாதிரி வழங்கப்படாது; மீதமுள்ள குறிப்பிட்ட கிரக/பாவ சவால் உறுதியாக இருந்தால் முதலில் நடைமுறை திருத்தம், பின்னர் தேவையான பாரம்பரிய வழிபாடு மட்டும் பரிந்துரைக்கப்படும்.'};
const V39_LIFE_BASE_EN={career:'Career becomes steadier when responsibility and usable skill are sustained; rank and direction become clearer over time.',jobchange:'A job change may appear through a new employer, but also through a change of role, team, location or responsibility.',skills:'Communication, learning and initiative can turn ability directly into work or income opportunity when used consistently.',turning:'Some phases break an old structure and force a new direction; recovery and growth can follow the initial disruption.',business:'Business growth depends on client handling, clear agreements, cash-flow discipline and daily execution.',finance:'The ability to earn and the ability to retain money operate separately; expense discipline matters even when income improves.',marriage:'Marriage is not read from attraction alone; partner choice, family acceptance, shared responsibility and post-marriage stability must work together.',children:'Children-related outcomes arise from the combination of family intention, couple cooperation, practical readiness and timing.',education:'Even when education is not continuous, progress can resume through skill training, professional study or higher learning.',property:'Home, land or vehicle decisions become practical when family need, relocation factors and financial capacity align.',debt:'Debt and competition become more manageable through expense control, repayment discipline and clear documentation in disputes.',health:'Vitality is closely linked with workload, sleep, food and stress routines; this is traditional astrological context, not a medical diagnosis.',family:'Domestic stability grows through clear communication, shared responsibility and orderly financial/home decisions.',parents:'Parental support need not look the same at every stage; responsibility for home or parents can increase with age.',siblings:'Sibling and close-network support strengthens when communication is maintained and help is offered at the right time.',travel:'Travel or relocation can alter life direction when linked with work, study, family need or a new opportunity.',status:'Recognition is more likely to become durable through responsibility, reliability and visible results than through sudden fame alone.',fortune:'Progress comes more through recognising and using timely opportunity, guidance and networks than through effortless luck.',spiritual:'Spiritual growth can deepen through worship, reflection, guidance or periods of solitude without requiring withdrawal from ordinary life.',remedy:'Remedies are not fixed for everyone; a traditional practice is added only when a specific residual planetary/house difficulty remains after practical correction.'};
const V39_DOMAIN_ACTION_EN={career:'work responsibility, rank, direction and career progress',jobchange:'job change, promotion, team/location change and new responsibility',skills:'skill use, communication, initiative and practical application of learning',turning:'changing an old pattern, overcoming an obstacle and rebuilding in a new direction',business:'clients, partnership, sales, cash flow and self-employment decisions',finance:'income, gains, savings and control of expenditure',marriage:'marriage discussions, partner contact, family approval and relationship stability',children:'children-related planning, family expansion, care and responsibility',education:'study, examinations, training, higher education and continuity of learning',property:'home, land, vehicle, purchase/change and residence decisions',debt:'borrowing/repayment, competition, litigation and handling opposition',health:'vitality, rest, workload and daily health routines',family:'family cooperation, domestic responsibility, communication and peace',parents:'parental support, home responsibility, elder guidance and family duty',siblings:'sibling relations, communication, support and initiative',travel:'travel, relocation, foreign links and distant opportunities',status:'recognition, social standing, responsibility and earned trust',fortune:'using opportunity, guidance, higher learning/long travel and life progress',spiritual:'worship, reflection, inner clarity, guidance and spiritual discipline',remedy:'balancing residual difficulty through practical correction, discipline and only when warranted a traditional remedy'};
function v39VargaSignal(data,d,l){const q=domains[d];if(!q.v)return '';const v=division(data,q.v);if(!v||!Array.isArray(v.planets)||!v.planets.length)return '';
 const rows=v.planets.map(x=>({p:P(x.planet||x.name),r:String(x.rasi||'')}));const rel=rows.filter(x=>q.kar.includes(x.p));if(!rel.length)return '';
 const groups={};for(const x of rows)(groups[x.r]||(groups[x.r]=[])).push(x.p);const contacts=[];for(const x of rel){const mates=(groups[x.r]||[]).filter(p=>p!==x.p);if(mates.length)contacts.push({p:x.p,r:x.r,m:mates});}
 const names=rel.slice(0,3).map(x=>`${langPlanet(x.p,l)}–${x.r}`).join(l==='ta'?'、':', ');const c=contacts.slice(0,2).map(x=>`${langPlanet(x.p,l)} + ${x.m.map(p=>langPlanet(p,l)).join('/')}`).join(l==='ta'?'、':', ');let pos=0,neg=0;for(const z of contacts)for(const m of z.m){if(['Jupiter','Venus','Mercury','Moon'].includes(m))pos++;if(['Saturn','Mars','Rahu','Ketu'].includes(m))neg++;}
 if(l==='ta')return `${q.v===7?'சப்தாம்சம்':q.v===9?'நவாம்சம்':'தசாம்சம்'} கணக்கில் தொடர்புடைய கிரக நிலைகள் ${names}${c?`; ஒரே ராசித் தொடர்பு ${c}`:''}. ${pos>neg?'இந்தப் பிரிவு ஜாதகத்தில் ஆதரவு தொடர்புகள் மேலோங்குவதால் பிறப்பு ஜாதக வாக்குறுதியை வலுப்படுத்துகிறது.':neg>pos?'இந்தப் பிரிவு ஜாதகத்தில் சவால் தொடர்புகள் மேலோங்குவதால் பலன் கிடைக்கும் முறையில் கூடுதல் சோதனை/தாமதத்தை சேர்க்கலாம்.':'இந்தப் பிரிவு ஜாதகத்தில் ஆதரவும் சவாலும் கலந்ததால் பிறப்பு ஜாதக வாக்குறுதியை முழுமையாக மறுக்காமல் அதன் வெளிப்பாட்டை மாற்றுகிறது.'}`;
 return `In D${q.v}, the relevant placements are ${names}${c?`; same-sign contacts: ${c}`:''}. ${pos>neg?'Supportive contacts are stronger, reinforcing the natal promise.':neg>pos?'Pressure contacts are stronger, adding tests or delay to how the natal promise manifests.':'Support and pressure are mixed, modifying rather than cancelling the natal promise.'}`;}
function v39LifeSentence(c,data,d,l){const x=evidence(c,data,d,l),sup=x.supporters.length,pre=x.pressures.length;let core=(l==='ta'?V39_LIFE_BASE_TA:V39_LIFE_BASE_EN)[d]||'';
 if(l==='ta'){if(sup>pre)core+=' இந்த ஜாதகத்தில் பாதுகாப்பு/ஆதரவு காரணிகள் சவால்களை விட மேலோங்குகின்றன.';else if(pre>sup)core+=' இந்த ஜாதகத்தில் சவால் காரணிகள் அதிகமாக இருப்பதால் முடிவை பெற முயற்சி, திருத்தம் மற்றும் சரியான நேரத் தேர்வு முக்கியம்; இது முழுமையான மறுப்பு அல்ல.';else core+=' ஆதரவும் சவாலும் சமமாக இருப்பதால் செயல்படும் தசை மற்றும் கோச்சார காலமே எந்தப் பக்கம் மேலெழும் என்பதை தீர்மானிக்கும்.';}else{if(sup>pre)core+=' Protective/supportive factors are stronger than pressure factors in this chart.';else if(pre>sup)core+=' Pressure factors are stronger, so effort, correction and timing matter; this is not a denial by itself.';else core+=' Support and pressure are balanced, making dasha and transit activation especially important.';}
 const vg=v39VargaSignal(data,d,l);return vg?`${core} ${vg}`:core;}
function v39TransitPlanets(tr){return Array.isArray(tr?.planets)?tr.planets:[];}
function v39TransitHouse(c,p){let s=null;if(Number.isFinite(Number(p?.longitude)))s=sign(Number(p.longitude));else if(Number.isFinite(Number(p?.rasiIndex)))s=Number(p.rasiIndex);if(s==null)return null;return house(s,ls(c));}
function v39TransitInsight(c,d,tr,l){const ps=v39TransitPlanets(tr);if(!ps.length)return '';const q=domains[d],hits=[];for(const p of ps){const pn=P(p.name||p.planet),h=v39TransitHouse(c,p);if(h&&q.rel.includes(h))hits.push({pn,h});}if(!hits.length)return l==='ta'?'அந்த தேதியின் கோச்சாரத்தில் இந்தப் பலனுக்குரிய முக்கிய பாவங்களில் பெரிய நேரடி செயல்பாடு குறைவாக உள்ளது.':'On that date, direct transit activation of the principal houses for this domain is limited.';
 const good=hits.filter(x=>['Jupiter','Venus','Mercury','Moon'].includes(x.pn)), hard=hits.filter(x=>['Saturn','Mars','Rahu','Ketu'].includes(x.pn));const show=hits.slice(0,4).map(x=>`${langPlanet(x.pn,l)} ${houseName(x.h,l)}`).join(l==='ta'?'、':', ');
 if(l==='ta')return `அந்த தேதியின் கோச்சார ஒத்திசைவு: ${show}. ${good.length>hard.length?'செயல்பாட்டை முன்னேற்றும் ஆதரவு அதிகம்.':hard.length>good.length?'முடிவை அவசரப்படுத்தாமல் சவாலை நிர்வகிக்க வேண்டிய தாக்கம் அதிகம்.':'ஆதரவும் சோதனையும் ஒன்றாக இருப்பதால் தசைப் பலனின் தரம் நடைமுறைச் சூழலைப் பொறுத்து வெளிப்படும்.'}`;
 return `Transit convergence on that date: ${show}. ${good.length>hard.length?'Supportive activation is stronger.':hard.length>good.length?'Pressure is stronger, so the result needs careful handling rather than haste.':'Support and pressure are mixed, so the dasha result depends on practical circumstances.'}`;}
const V39_TRANSIT_CACHE=new Map();
function v39MidDate(w){const a=dt(w.start),b=dt(w.end,true);const x=a&&b?new Date((+a+ +b)/2):a;return x?`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`:String(w.start||'').slice(0,10);}
let v70TransitModules;
async function v39TransitFor(payload,date,lang,full){
 const lat=Number(payload?.lat),lon=Number(payload?.lon),offset=Number(payload?.utcOffsetMinutes??330),day=date instanceof Date?v54DateKey(date):String(date).slice(0,10);
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Invalid transit date or coordinates.');
 const key=JSON.stringify([day,lat,lon,offset]);if(V39_TRANSIT_CACHE.has(key))return V39_TRANSIT_CACHE.get(key);
 // The bundled Swiss engine uses the same ephemeris/formulas in both connection modes.
 // V97 root fix: a rejected dynamic-import Promise must never poison all later
 // Dasha/Transit retries for the lifetime of the page.  V94/V95 sync work did not
 // change the prediction engine, but a transient WASM/module load failure was cached
 // here forever, so "Reopen to retry" could never really retry.
 if(!v70TransitModules){
  v70TransitModules=Promise.all([import('./offline/swiss_vedic.browser.mjs'),import('./offline/transit_panchang.browser.mjs')]);
 }
 let transitModules;
 try{transitModules=await v70TransitModules;}catch(err){v70TransitModules=null;throw err;}
 const [sw]=transitModules,input={date:day,time:'12:00',lat,lon,language:'en',utcOffsetMinutes:offset};
 // Root fix: do not call transit_panchang.browser.mjs' synchronous Swiss wrapper here.
 // This path is lazy-loaded while preparing the paid report and the synchronous wrapper
 // can run before its own WASM binding is ready. The awaited Swiss calculation below is
 // already the authoritative transit chart needed by the prediction layer.
 const chart=await sw.calculateSwiss(input);
 const enPlanet={'சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu'};
 const out={ok:true,engine:chart?.engine,ayanamsa:chart?.ayanamsa,requested:{date:day,time:'12:00',latitude:lat,longitude:lon},planets:(chart?.planets||[]).map(p=>({...p,name:enPlanet[p.name]||p.name}))};
 if(!v39TransitPlanets(out).length)throw Error('Transit calculation did not complete.');V39_TRANSIT_CACHE.set(key,out);return out;
}

// V40 ROOT: no planet-dictionary suffix. The Antaram sentence is derived from the
// planet's actual natal role in THIS domain (placement, ownership, aspect/karaka),
// then qualified by divisional evidence and dated transit convergence.
function v40PlanetRole(c,d,pn){
 const q=domains[d], h=hof(c,pn), owned=[];
 lords.forEach((x,i)=>{if(x===pn){const oh=house(i,ls(c));if(!owned.includes(oh))owned.push(oh)}});
 const relevantOwned=owned.filter(x=>q.rel.includes(x));
 const inRelevant=!!h&&q.rel.includes(h), inFocus=h===q.h, aspectFocus=aspects(c,pn,q.h), karaka=q.kar.includes(pn);
 let support=0, pressure=0;
 if(inFocus) support+=2; else if(inRelevant) support+=1;
 support+=relevantOwned.length*2+(aspectFocus?1:0)+(karaka?1:0);
 if(['Jupiter','Venus','Mercury','Moon'].includes(pn)) support+=1;
 if(['Saturn','Mars','Rahu','Ketu'].includes(pn)){ pressure+=1; if(inFocus||aspectFocus)pressure+=1; }
 return {h,owned,relevantOwned,inRelevant,inFocus,aspectFocus,karaka,support,pressure};
}
const V40_DOMAIN_RESULT_TA={
 career:{support:'வேலைப் பொறுப்பு அல்லது பதவியில் முன்னேற்றத்தை நடைமுறைக்கு கொண்டு வர உதவும்',pressure:'வேலைச் சுமை அல்லது மாற்றத் தேவையை அதிகரித்து, அடுத்த தொழில் முடிவை கவனமாக எடுக்கச் செய்யும்',mixed:'வேலை வாய்ப்புடன் கூடுதல் பொறுப்பும் சேர்ந்து வரக்கூடிய'},
 jobchange:{support:'பதவி, குழு, இடம் அல்லது வேலை அமைப்பில் பயனுள்ள மாற்றத்தை முன்னெடுக்க உதவும்',pressure:'வேலை மாற்றத்தை அவசரப்படுத்தாமல் நிபந்தனைகள் மற்றும் நிலைத்தன்மையை சரிபார்க்க வேண்டிய',mixed:'மாற்ற வாய்ப்பு கிடைத்தாலும் பழைய பொறுப்பை முடித்து புதிய அமைப்பை ஏற்க வேண்டிய'},
 skills:{support:'கற்ற திறனை நடைமுறை வேலை, தொடர்பு அல்லது வருமான வாய்ப்பாக மாற்ற உதவும்',pressure:'திறன் இருந்தும் அதை வெளிப்படுத்தும் முறையை திருத்தி தொடர்ந்து பயிற்சி செய்ய வேண்டிய',mixed:'திறன் பயன்பாட்டுக்கு வாய்ப்பு கிடைத்தாலும் தொடர்பு மற்றும் செயலாக்கத்தில் துல்லியம் தேவைப்படும்'},
 turning:{support:'பழைய தடையை கடந்து புதிய வாழ்க்கைத் திசையை நிலைப்படுத்த உதவும்',pressure:'பழைய அமைப்பை விட வேண்டிய கட்டாயத்தை உருவாக்கி மாற்றத்தை படிப்படியாகச் செய்ய வேண்டிய',mixed:'ஒரு தடையை முடித்தபின் புதிய பாதை திறக்கக்கூடிய'},
 business:{support:'வாடிக்கையாளர், ஒப்பந்தம் அல்லது பணப்புழக்கத்தில் முன்னேற்றத்தை உருவாக்க உதவும்',pressure:'வியாபார முடிவில் செலவு, கூட்டாண்மை அல்லது ஒப்பந்த அபாயத்தை கட்டுப்படுத்த வேண்டிய',mixed:'வியாபார வாய்ப்புடன் பணப்புழக்கம் மற்றும் கூட்டாண்மை நிபந்தனைகளை ஒரே நேரத்தில் கவனிக்க வேண்டிய'},
 finance:{support:'வருமானம் அல்லது லாபத்தை சேமிப்பாக மாற்றும் வாய்ப்பை வலுப்படுத்தும்',pressure:'செலவு அல்லது பணப்புழக்க அழுத்தத்தை கட்டுப்படுத்தி சேமிப்பை பாதுகாக்க வேண்டிய',mixed:'வருமான வாய்ப்பு இருந்தாலும் செலவு ஒழுங்கு முடிவை தீர்மானிக்கக்கூடிய'},
 marriage:{support:'திருமண பேச்சு, குடும்ப ஒப்புதல் அல்லது உறவை நிலைப்படுத்தும் முடிவுக்கு ஆதரவு தரும்',pressure:'உறவில் பொறுப்பு, கருத்து வேறுபாடு அல்லது நேரத் தேர்வை கவனமாக கையாள வேண்டிய',mixed:'திருமண வாய்ப்பு செயல்பட்டாலும் உறுதி பெற பேச்சு மற்றும் குடும்ப ஒத்திசைவு தேவைப்படும்'},
 children:{support:'குழந்தை தொடர்பான திட்டம், குடும்ப விரிவு அல்லது பராமரிப்பு முடிவை முன்னெடுக்க ஆதரவு தரும்',pressure:'குழந்தை தொடர்பான திட்டத்தில் பொறுமை, திட்டமிடல் மற்றும் தேவையான ஆலோசனையை முன்னிலைப்படுத்தும்',mixed:'குடும்ப விரிவு தொடர்பான எண்ணம் செயல்பட்டாலும் நடைமுறைத் தயாரிப்பை உறுதிப்படுத்த வேண்டிய'},
 education:{support:'படிப்பு, தேர்வு, திறன் பயிற்சி அல்லது உயர்கல்வியில் முன்னேற்றத்தை ஆதரிக்கும்',pressure:'கல்வித் தொடர்ச்சியில் கவனம் சிதறாமல் திட்டம் மற்றும் நேர ஒழுங்கை கடைப்பிடிக்க வேண்டிய',mixed:'கல்வி வாய்ப்பு கிடைத்தாலும் முயற்சி மற்றும் திட்டமிடலால் அதை நிலைப்படுத்த வேண்டிய'},
 property:{support:'வீடு, நிலம் அல்லது வாகன முடிவை நடைமுறைக்கு கொண்டு வர உதவும்',pressure:'சொத்து முடிவில் கடன், ஆவணம், செலவு அல்லது குடும்பத் தேவையை மீண்டும் சரிபார்க்க வேண்டிய',mixed:'சொத்து வாய்ப்பு இருந்தாலும் நிதி மற்றும் ஆவணத் தெளிவு முடிவை தீர்மானிக்கக்கூடிய'},
 debt:{support:'கடன் குறைத்தல், போட்டியை சமாளித்தல் அல்லது நிலுவை விஷயத்தை ஒழுங்குபடுத்த உதவும்',pressure:'புதிய கடன், வழக்கு அல்லது எதிர்ப்பில் கூடுதல் கட்டுப்பாடு மற்றும் ஆவணத் தெளிவு தேவைப்படும்',mixed:'கடன்/போட்டி பிரச்சினையை முன்னேற்றமாக மாற்ற ஒழுங்கான திருப்பிச் செலுத்தல் மற்றும் ஆவணம் தேவைப்படும்'},
 health:{support:'ஓய்வு, தினசரி ஒழுங்கு மற்றும் உடல் சக்தியை சீர்படுத்தும் முயற்சிக்கு ஆதரவு தரும்',pressure:'வேலைச்சுமை, தூக்கம் மற்றும் மனஅழுத்த ஒழுங்கை புறக்கணிக்காமல் கவனிக்க வேண்டிய',mixed:'உடல் சக்தியை காக்க வேலை–ஓய்வு சமநிலையை திட்டமிட்டு வைத்திருக்க வேண்டிய'},
 family:{support:'குடும்ப பேச்சு, பொறுப்பு பகிர்வு மற்றும் இல்லற அமைதியை மேம்படுத்த உதவும்',pressure:'குடும்பப் பொறுப்பு அல்லது கருத்து வேறுபாட்டை அமைதியாகத் தீர்க்க வேண்டிய',mixed:'குடும்ப ஆதரவு இருந்தாலும் பொறுப்பு பகிர்வு மற்றும் தெளிவான பேச்சு முக்கியமாகும்'},
 parents:{support:'பெற்றோர் ஆதரவு, வீட்டு பொறுப்பு அல்லது மூத்தோரின் வழிகாட்டலை பயனுள்ளதாக பயன்படுத்த உதவும்',pressure:'பெற்றோர் அல்லது வீட்டு பொறுப்பில் கூடுதல் நேரம், செலவு அல்லது கவனம் தேவைப்படும்',mixed:'பெற்றோர் ஆதரவுடன் அவர்களுக்கான பொறுப்பையும் ஏற்க வேண்டிய'},
 siblings:{support:'சகோதரர்கள் அல்லது நெருங்கிய வலையமைப்பின் உதவியை முயற்சியுடன் இணைக்க உதவும்',pressure:'சகோதர உறவில் தவறான புரிதலைத் தவிர்த்து தொடர்பை தெளிவாக வைத்திருக்க வேண்டிய',mixed:'உதவி கிடைத்தாலும் தனிப்பட்ட முயற்சியை குறைக்காமல் தொடர வேண்டிய'},
 travel:{support:'பயணம், இடமாற்றம் அல்லது வெளிநாட்டு இணைப்பை முன்னேற்ற வாய்ப்பாக மாற்ற உதவும்',pressure:'பயணம் அல்லது இடமாற்றத்தில் செலவு, ஆவணம் மற்றும் நேரத் தேர்வை கவனிக்க வேண்டிய',mixed:'இடமாற்ற வாய்ப்பு இருந்தாலும் அதன் நடைமுறைச் செலவு மற்றும் பொறுப்பை சமநிலைப்படுத்த வேண்டிய'},
 status:{support:'பொறுப்பு மற்றும் செய்த வேலையின் மூலம் அங்கீகாரம் அல்லது சமூக நம்பிக்கையை உயர்த்த உதவும்',pressure:'அங்கீகாரம் பெற அதிக பொறுப்பு ஏற்று தொடர்ச்சியான செயல்திறனை நிரூபிக்க வேண்டிய',mixed:'பொறுப்பு அதிகரிப்புடன் அங்கீகாரமும் படிப்படியாக வளரக்கூடிய'},
 fortune:{support:'கிடைக்கும் வாய்ப்பு, வழிகாட்டல் அல்லது நீண்டகால முன்னேற்றப் பாதையை பயனுள்ளதாக பயன்படுத்த உதவும்',pressure:'வாய்ப்பை அதிர்ஷ்டம் என்று மட்டும் நம்பாமல் திட்டமிட்டு செயல்பட வேண்டிய',mixed:'வாய்ப்பு திறந்தாலும் அதை நிலையான முன்னேற்றமாக மாற்ற முயற்சி தேவைப்படும்'},
 spiritual:{support:'வழிபாடு, தியானம் அல்லது வழிகாட்டலின் மூலம் உள்ளார்ந்த தெளிவை ஆழப்படுத்த உதவும்',pressure:'உள்ளார்ந்த குழப்பத்தை தவிர்க்க ஒழுங்கான ஆன்மிகப் பயிற்சி மற்றும் சிந்தனை தேவைப்படும்',mixed:'வெளிப்புற பொறுப்புகளுடன் ஆன்மிக ஒழுக்கத்தையும் சமநிலைப்படுத்த வேண்டிய'},
 remedy:{support:'மீதமுள்ள சவாலை நடைமுறை திருத்தத்தால் குறைக்க உதவும்',pressure:'காரணத்தைத் தெளிவுபடுத்தி நடைமுறை திருத்தத்தை முதலில் செய்ய வேண்டிய',mixed:'நடைமுறை திருத்தத்திற்குப் பிறகே தேவையான பாரம்பரிய பரிகாரத்தை தேர்வு செய்ய வேண்டிய'}
};
const V40_DOMAIN_RESULT_EN=Object.fromEntries(Object.keys(V40_DOMAIN_RESULT_TA).map(k=>[k,{support:`supports constructive progress in ${domains[k].en.toLowerCase()}`,pressure:`requires careful management of pressure in ${domains[k].en.toLowerCase()}`,mixed:`brings opportunity together with practical responsibility in ${domains[k].en.toLowerCase()}`} ]));
function v40VargaPlanetRole(data,d,pn,l){const q=domains[d];if(!q.v)return '';const v=division(data,q.v);if(!v||!Array.isArray(v.planets))return '';const row=v.planets.find(x=>P(x.planet||x.name)===pn);if(!row)return '';const r=String(row.rasi||'');const same=v.planets.filter(x=>x!==row&&String(x.rasi||'')===r).map(x=>P(x.planet||x.name));if(l==='ta')return `${q.v===7?'சப்தாம்ச':q.v===9?'நவாம்ச':'தசாம்ச'} நிலையில் ${langPlanet(pn,l)}${r?' '+r+' ராசியில்':''}${same.length?' '+same.map(x=>langPlanet(x,l)).join('/')+' தொடர்புடன்':''} செயல்படுகிறது`;
 return `In D${q.v}, ${pn}${r?' is in '+r:''}${same.length?' with '+same.join('/') :''}`;}

// V42 ROOT: Kala-Desa-Patra is an event-selection gate, not explanatory prose.
// Pipeline: chart evidence -> candidate manifestations -> exact age/life stage ->
// remove inappropriate events -> rank remaining manifestations -> D-chart -> dasha/transit -> natural result.
function v42BirthDate(payload){return dt(payload?.date||payload?.dob||payload?.birthDate||payload?.birth_date)}
function v42AgeInfo(payload,date){const b=v42BirthDate(payload),x=dt(date);if(!b||!x)return null;let months=(x.getFullYear()-b.getFullYear())*12+(x.getMonth()-b.getMonth());if(x.getDate()<b.getDate())months--;months=Math.max(0,months);return {months,years:Math.floor(months/12),rem:months%12}}
function v42Stage(ai){const a=ai?.years;if(a==null)return 'unknown';if(a<=5)return 'early_child';if(a<=12)return 'child';if(a<=18)return 'teen';if(a<=24)return 'young';if(a<=39)return 'family';if(a<=49)return 'mid';if(a<=59)return 'mature';if(a<=69)return 'senior';return 'elder'}
function v42KnownContext(payload){const marital=String(payload?.maritalStatus||payload?.marital_status||payload?.relationshipStatus||'').toLowerCase();const n=Number(payload?.childrenCount??payload?.children_count??payload?.childrenBorn);const occupation=String(payload?.occupationStatus||payload?.occupation_status||payload?.employmentStatus||'').toLowerCase();return {marital,children:Number.isFinite(n)?n:null,occupation}}
function v42Mode(c,d,pn){const r=v40PlanetRole(c,d,pn);return r.pressure>r.support?'pressure':r.support>r.pressure?'support':'mixed'}
function v42Event(d,mode,l,ai,payload,pn){const st=v42Stage(ai),ta=l==='ta',ctx=v42KnownContext(payload),P=(a,b)=>ta?a:b;const married=/married|திருமண/.test(ctx.marital)&&!/unmarried|never/.test(ctx.marital);const hasKids=ctx.children!=null&&ctx.children>0;
 const support=mode==='support', pressure=mode==='pressure';
 if(d==='children'){
  if(st==='early_child')return P(pressure?'விளையாட்டு, மொழி/நினைவாற்றல் மற்றும் படைப்பாற்றல் வளர்ச்சியில் மெதுவான முன்னேற்றத்தையும் பெற்றோர் பொறுமையையும் முன்னிலைப்படுத்தும்':'மொழி, நினைவாற்றல், விளையாட்டு, ஆர்வம் மற்றும் படைப்பாற்றல் இயல்பாக வளர உதவும்','supports age-appropriate language, memory, play, interests and creativity');
  if(st==='child')return P(pressure?'படிப்பு, கவனம், படைப்பாற்றல் மற்றும் போட்டித் திறனை ஒழுங்காக வளர்க்க வேண்டிய':'படிப்பு, படைப்பாற்றல், போட்டி/விளையாட்டு மற்றும் அறிவுத்திறனை வெளிப்படுத்த உதவும்','supports study, creativity, sport/competition and intellectual expression');
  if(st==='teen'||st==='young')return P(pressure?'கல்வி, படைப்புத் திறன், திட்டமிடல் மற்றும் பொறுப்புணர்வில் அவசரத்தை தவிர்க்க வேண்டிய':'கல்வி, படைப்புத் திறன், திட்டமிடல் மற்றும் பொறுப்புணர்வை வளர்க்கும்','supports education, creativity, planning and responsibility');
  if(hasKids||st==='mature'||st==='senior'||st==='elder')return P(pressure?'குழந்தைகள்/குடும்ப இளையோரின் கல்வி, வேலை, திருமணம் அல்லது பராமரிப்பில் கூடுதல் கவனம் தேவைப்படும்':'குழந்தைகள்/குடும்ப இளையோரின் கல்வி, வேலை, திருமணம் அல்லது முன்னேற்றத்தில் மகிழ்ச்சி மற்றும் பொறுப்பை அதிகரிக்கும்','concerns progress, education, career, marriage or care of children/younger family members');
  return P(pressure?'குடும்ப விரிவு தொடர்பான முடிவுகளில் பொறுமை, உடல்/குடும்பத் தயாரிப்பு மற்றும் சரியான நேரத் தேர்வு தேவைப்படும்':'குடும்ப விரிவு அல்லது குழந்தை தொடர்பான திட்டத்தை முன்னெடுக்க ஏற்ற ஆதரவு உருவாகலாம்','can support age-appropriate family-expansion or children-related planning');
 }
 if(d==='marriage'){
  if(st==='early_child'||st==='child'||st==='teen')return P(pressure?'குடும்பம் மற்றும் நண்பர்களுடன் பழகும் முறையில் எல்லை, பகிர்வு மற்றும் ஒத்துழைப்பை கற்றுக்கொள்ள வேண்டிய':'குடும்ப/நண்பர் உறவுகளில் ஒத்துழைப்பு, பகிர்வு மற்றும் சமூகப் பழக்கத்தை வளர்க்கும்','supports cooperation, sharing and social maturity in family/peer relationships');
  if(married||st==='mature'||st==='senior'||st==='elder')return P(pressure?'துணைவர் தொடர்பு, குடும்ப ஒத்திசைவு மற்றும் பரஸ்பர பொறுப்புகளை கவனமாக கையாள வேண்டிய':'துணைவர் உறவு, பரஸ்பர ஆதரவு மற்றும் குடும்ப ஒத்திசைவை வலுப்படுத்தும்','supports partner communication, mutual support and family coordination');
  return P(pressure?'உறவு/திருமண முடிவில் அவசரத்தை தவிர்த்து குடும்ப ஒத்திசைவு மற்றும் துணைவர் பொருத்தத்தை ஆராய வேண்டிய':'புதிய உறவு, திருமண பேச்சு அல்லது உறவை நிலைப்படுத்தும் முடிவுகள் முன்னேறக்கூடிய','can support relationship formation, marriage discussions or commitment');
 }
 if(['career','jobchange','business'].includes(d)){
  if(st==='early_child'||st==='child')return P(pressure?'ஒழுங்கு, முயற்சி, கற்றல் பழக்கம் மற்றும் சிறு பொறுப்புகளை மெதுவாக கட்டமைக்க வேண்டிய':'ஆர்வம், கற்றல் பழக்கம், செயல்திறன் மற்றும் பொறுப்புணர்வை வளர்க்கும்','builds interests, learning habits, initiative and responsibility');
  if(st==='teen')return P(pressure?'பாடத் தேர்வு, திறன் வளர்ச்சி மற்றும் எதிர்கால தொழில் ஆர்வத்தில் தெளிவு தேவைப்படும்':'திறன், தலைமை, செயல்திறன் மற்றும் எதிர்கால தொழில் விருப்பங்களை தெளிவாக்கும்','develops skills, leadership and future vocational interests');
  if(st==='elder')return P(pressure?'புதிய வேலை மாற்றத்தை விட அனுபவப் பகிர்வு, ஆலோசனை மற்றும் குடும்ப/சமூகப் பொறுப்பை சமநிலைப்படுத்த வேண்டிய':'அனுபவப் பகிர்வு, ஆலோசனை, வழிகாட்டல் அல்லது விருப்பப் பணிகளில் பயன் தரும்','favours mentoring, advisory work, guidance or purposeful activity');
 }
 if(d==='education'){
  if(st==='early_child')return P(pressure?'மொழி, நினைவாற்றல், கவனம் மற்றும் அடிப்படை கற்றல் பழக்கத்தை அழுத்தமின்றி வளர்க்க வேண்டிய':'மொழி, நினைவாற்றல், கவனம், ஆர்வம் மற்றும் அடிப்படை கற்றல் திறனை இயல்பாக வளர்க்கும்','supports language, memory, attention, curiosity and early learning');
  if(st==='child')return P(pressure?'பாடப் புரிதல், கவனம் மற்றும் படிப்பு ஒழுங்கில் தொடர்ந்து வழிகாட்டல் தேவைப்படும்':'பாடப் புரிதல், நினைவாற்றல், திறன் பயிற்சி மற்றும் ஆர்வக் கற்றலில் முன்னேற்றம் தரும்','supports school learning, memory, skills and curiosity');
  if(st==='teen')return P(pressure?'தேர்வு, பாடத் தேர்வு மற்றும் உயர்கல்வி திட்டத்தில் கவனச்சிதறலை கட்டுப்படுத்த வேண்டிய':'தேர்வு, பாடத் தேர்வு, திறன் பயிற்சி மற்றும் உயர்கல்விக்கான அடித்தளத்தை வலுப்படுத்தும்','supports examinations, subject choice, skills and preparation for higher study');
  if(st==='mature'||st==='senior'||st==='elder')return P(pressure?'முறையான படிப்பை விட புதிய அறிவு, திறன் புதுப்பிப்பு அல்லது அனுபவக் கற்றலில் ஒழுங்கு தேவைப்படும்':'வாசிப்பு, புதிய அறிவு, திறன் புதுப்பிப்பு, பயிற்சி அல்லது ஆன்மிக/அனுபவக் கற்றலை விரிவாக்கும்','favours continuing learning, skill renewal, reading, training or experiential learning');
 }
 if(d==='property'&&(st==='early_child'||st==='child'||st==='teen'))return P(pressure?'தனிப்பட்ட வாங்குதலாக அல்ல; குடும்ப வீடு, வசிப்பிடம் அல்லது இடமாற்றத்தில் கவனம் தேவைப்படும்':'குடும்ப வீடு, வசிப்பிடம், வசதி அல்லது இடமாற்றத்தில் சாதக மாற்றத்தை காட்டும்','relates to the family home, residence, comfort or relocation');
 if(d==='debt'&&(st==='early_child'||st==='child'||st==='teen'))return P('தனிப்பட்ட கடனாக அல்ல; குடும்ப வளம், போட்டி, ஒழுங்கு மற்றும் பொறுப்பை கற்றுக்கொள்ளும் சூழலாக வெளிப்படும்','concerns family resources, competition, discipline and learning responsibility rather than personal borrowing');
 if(d==='finance'&&(st==='early_child'||st==='child'||st==='teen'))return P('தனிப்பட்ட வருமானமாக அல்ல; குடும்ப வளம், சேமிப்பு பழக்கம், மதிப்புணர்வு மற்றும் வளங்களைப் பயன்படுத்தும் முறையுடன் தொடர்பாக வெளிப்படும்','concerns family resources, saving habits, values and use of resources rather than personal income');
 if(d==='skills'&&(st==='early_child'||st==='child'))return P(pressure?'பேச்சு, கைதிறன், முயற்சி மற்றும் கற்றதைப் பயன்படுத்தும் பழக்கத்தில் தொடர்ந்து ஊக்கம் தேவைப்படும்':'பேச்சு, கைதிறன், முயற்சி, ஆர்வம் மற்றும் கற்றதை நடைமுறையில் பயன்படுத்தும் திறனை வளர்க்கும்','develops communication, dexterity, initiative, curiosity and practical use of learning');
 if(d==='parents'&&(st==='senior'||st==='elder'))return P('குடும்ப மரபு, மூத்தோர் வழிகாட்டலின் நினைவு மற்றும் அடுத்த தலைமுறைக்கு பொறுப்பை பகிரும் நிலையாக வெளிப்படும்','relates to family legacy, elder guidance/memory and passing responsibility to the next generation');
 if(st==='early_child'||st==='child'){
  const child={turning:['சூழல் மாற்றம், புதிய பழக்கம் மற்றும் வளர்ச்சிக் கட்ட மாற்றங்களுக்கு மெதுவாக ஏற்றுக்கொள்ளும் திறனை வளர்க்கும்','concerns adjustment to changes in routine, environment and developmental stages'],health:['தூக்கம், உணவு, உடல் இயக்கம் மற்றும் தினசரி ஒழுங்கை வயதுக்கேற்ற முறையில் கவனிக்க வேண்டிய','concerns age-appropriate sleep, food, physical activity and daily routine'],family:['குடும்ப பாதுகாப்பு, அன்பு, தொடர்பு மற்றும் வீட்டுச் சூழல் குழந்தையின் வளர்ச்சியில் முக்கியமாக செயல்படும்','emphasises family security, affection, communication and the home environment'],parents:['பெற்றோர் பராமரிப்பு, வழிகாட்டல் மற்றும் வீட்டுச் சூழலின் ஆதரவு வளர்ச்சியை வடிவமைக்கும்','emphasises parental care, guidance and the home environment'],siblings:['சகோதரர்கள்/சமவயதினருடன் பகிர்வு, தொடர்பு மற்றும் ஒத்துழைப்பை கற்றுக்கொள்ள உதவும்','supports sharing, communication and cooperation with siblings/peers'],travel:['குடும்பத்துடன் பயணம், வசிப்பிட மாற்றம் அல்லது புதிய சூழலுக்கு பழகுதல் வழியாக அனுபவம் விரிவடையும்','concerns family travel, residence change or adapting to a new environment'],status:['பள்ளி/குடும்ப சூழலில் பாராட்டு, பொறுப்புணர்வு மற்றும் தன்னம்பிக்கை வளர்ச்சியாக வெளிப்படும்','appears as confidence, recognition and responsibility in family/school settings'],fortune:['பெற்றோர் வழிகாட்டல், நல்ல கற்றல் சூழல் மற்றும் கிடைக்கும் வாய்ப்புகளைப் பயன்படுத்தும் வளர்ச்சியாக வெளிப்படும்','appears through guidance, a supportive learning environment and age-appropriate opportunities'],spiritual:['குடும்ப வழிபாடு, நல்ல பழக்கங்கள், கருணை மற்றும் மதிப்புணர்வு வளர்ச்சியாக வெளிப்படும்','appears through family traditions, good habits, compassion and values'],remedy:['குழந்தைக்கு கடுமையான பரிகார மொழியை பயன்படுத்தாமல், முதலில் ஒழுங்கான பராமரிப்பு, நல்ல பழக்கம் மற்றும் குடும்ப ஆதரவை முன்னிலைப்படுத்த வேண்டும்','avoids heavy remedial claims for a child and prioritises routine care, good habits and family support']};if(child[d])return P(child[d][0],child[d][1]);
 }
 return null;
}
function v42DynamicHeading(d,l,ai,payload){const st=v42Stage(ai),ta=l==='ta';if(d==='children'){if(st==='early_child'||st==='child')return ta?'குழந்தைப் பருவ வளர்ச்சி மற்றும் படைப்பாற்றல்':'Childhood development and creativity';if(st==='teen'||st==='young')return ta?'படைப்பாற்றல், திட்டமிடல் மற்றும் எதிர்கால குடும்பப் பொறுப்பு':'Creativity, planning and future family responsibility';if(st==='mature'||st==='senior'||st==='elder')return ta?'குழந்தைகள் மற்றும் குடும்பத் தொடர்ச்சி':'Children and family continuity';}if(d==='education'&&st==='early_child')return ta?'ஆரம்பக் கற்றல் மற்றும் அறிவுத்திறன் வளர்ச்சி':'Early learning and intellectual development';return ta?domains[d].ta:domains[d].en}
function v42BasePrediction(c,data,d,l,payload,ai){const mode=(()=>{const x=classify(c,d,payload);return x.pre?'pressure':x.pos>x.neg?'support':x.neg>x.pos?'pressure':'mixed'})();const contextual=v42Event(d,mode,l,ai,payload,null);if(contextual){const ta=l==='ta';const follow=ta?(mode==='pressure'?'இங்கு பலன் மறுக்கப்படுவதில்லை; வயதிற்கும் வாழ்க்கைச் சூழலுக்கும் பொருத்தமான முறையில் பொறுமை மற்றும் சரியான வழிகாட்டல் முக்கியம்.':'இந்த ஆதரவு வயதிற்கும் வாழ்க்கைச் சூழலுக்கும் ஏற்ற செயல்பாடுகள் வழியாக வெளிப்படும்.'):(mode==='pressure'?'This does not deny the domain; patient, age-appropriate guidance matters.':'This support is expected to express through age-appropriate activity.');return `${contextual}. ${follow}`}
 return v39LifeSentence(c,data,d,l);
}
function v42VargaEvidence(data,d,pn,l){const q=domains[d];if(!q.v)return '';const v=division(data,q.v);if(!v||!Array.isArray(v.planets))return '';const row=v.planets.find(x=>P(x.planet||x.name)===pn);if(!row)return '';const same=v.planets.filter(x=>x!==row&&String(row.rasi||row.sign||'')!==''&&String(x.rasi||x.sign||'')===String(row.rasi||row.sign||'')).map(x=>P(x.planet||x.name));if(l==='ta'){if(same.length)return `${q.v===7?'சப்தாம்ச':q.v===9?'நவாம்ச':'தசாம்ச'} ஆதாரமும் இந்தக் காலத்தில் ${same.map(x=>langPlanet(x,l)).join('/')} தொடர்பால் பலனை மாற்றியமைக்கிறது`;return `${q.v===7?'சப்தாம்ச':q.v===9?'நவாம்ச':'தசாம்ச'} ஆதாரம் இந்தக் காலத்தின் பலனை உறுதிப்படுத்த பயன்படுத்தப்படுகிறது`;}return `D${q.v} evidence is used to confirm and qualify this period${same.length?' through its contact with '+same.join('/'):''}`}
function v42PhaseMeaning(c,data,d,pn,l,tr,ai,payload){const role=v40PlanetRole(c,d,pn),q=domains[d],mode=v42Mode(c,d,pn);let main=v42Event(d,mode,l,ai,payload,pn)||(l==='ta'?V40_DOMAIN_RESULT_TA[d]?.[mode]:V40_DOMAIN_RESULT_EN[d]?.[mode])||'';const go=v39TransitInsight(c,d,tr,l);const vg=v42VargaEvidence(data,d,pn,l);if(l==='ta'){const lead=`${langPlanet(pn,l)} அந்தரம்`;const causal=role.relevantOwned.length||role.inFocus||role.aspectFocus||role.inRelevant||role.karaka?'இந்த ஜாதகத்தில் அந்த கிரகம் இந்த வாழ்க்கைப் பகுதியுடன் நேரடி தொடர்பு கொண்டிருப்பதால் ':'';return `${lead}: ${causal}${main}.${vg?' '+vg+'.':''}${go?' '+go:''}`.replace(/\s+/g,' ').trim();}return `${pn} Antaram: ${main}.${vg?' '+vg+'.':''}${go?' '+go:''}`.replace(/\s+/g,' ').trim()}
function v42PeriodLine(c,data,d,w,l,kind,tr,payload){const s=String(w?.start||'').trim(),e=String(w?.end||'').trim(),dateText=s&&e?`${s} → ${e}`:s||e;const ai=v42AgeInfo(payload,v39MidDate(w));const theme=v42PhaseMeaning(c,data,d,w.pd,l,tr,ai,payload);const dasha=dashaText(w,l);if(l==='ta'){const prefix=kind==='past'?'கடந்தகாலத்தில்':kind==='current'?'தற்போது':'அருகிலுள்ள எதிர்காலத்தில்';return `${prefix}${dateText?' '+dateText+' காலத்தில்':''} ${dasha}. ${theme}${kind==='past'?' இது அந்த வாழ்க்கைப் பகுதி செயல்பட்ட காலச் சுட்டி; நிகழ்வு நடந்ததற்கான தனி உறுதிப்படுத்தல் அல்ல.':''}`.replace(/\s+/g,' ').trim();}const prefix=kind==='past'?'In the past':kind==='current'?'Currently':'In the near future';return `${prefix}${dateText?' ('+dateText+')':''}: ${dasha}. ${theme}${kind==='past'?' This is an activation window, not independent proof that an event occurred.':''}`.replace(/\s+/g,' ').trim()}
async function v42RenderDomain(c,data,d,l,payload,full,cls){const x=cls||classify(c,d,payload),today=new Date(),nowAI=v42AgeInfo(payload,today);const make=async(arr,kind)=>{const out=[];for(const w of arr){const tr=await v39TransitFor(payload,v39MidDate(w),l,full);out.push(v42PeriodLine(c,data,d,w,l,kind,tr,payload));}return out.join(' ')};const past=await make(x.past,'past'),current=await make(x.current,'current'),future=await make(x.future,'future');const pastSafe=past||(l==='ta'?'கிடைக்கும் தசா வரலாற்றில் இந்த வாழ்க்கைப் பகுதிக்கான தனி கடந்தகால செயல்பாட்டு காலம் இல்லை.':'No separate past activation for this life area appears in the available dasha history.');const curSafe=current||(l==='ta'?'தற்போதைய தசா காலத் தரவு கிடைக்கவில்லை.':'Current dasha-period data is unavailable.');const futSafe=future||(l==='ta'?'அருகிலுள்ள எதிர்கால தசா காலத் தரவு கிடைக்கவில்லை.':'Near-future dasha-period data is unavailable.');return `<section class="smv-pred-domain"><h4>${esc(v42DynamicHeading(d,l,nowAI,payload))}</h4><p>${esc(v42BasePrediction(c,data,d,l,payload,nowAI))}</p><div class="smv-pred-time"><b>${l==='ta'?'கடந்தகால ஆய்வு':'Past review'}</b><p>${esc(pastSafe)}</p><b>${l==='ta'?'தற்போதைய பலன்':'Current outlook'}</b><p>${esc(curSafe)}</p><b>${l==='ta'?'அருகிலுள்ள எதிர்காலம்':'Near future'}</b><p>${esc(futSafe)}</p></div></section>`}
async function renderV42(ev){const {full,payload,lang='en',rootId}=ev.detail||{},root=document.getElementById(rootId);if(!root||!full?.chart)return;const target=root.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');if(!target)return;const c=full.chart,order=['career','jobchange','skills','turning','business','finance','marriage','children','education','property','debt','health','family','parents','siblings','travel','status','fortune','spiritual','remedy'];const classes=Object.fromEntries(order.map(d=>[d,classify(c,d,payload)]));let html=`<div class="adv-section"><h3>🔭 ${lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${lang==='ta'?'பிறப்பு ஜாதக ஆதாரம் முதலில் சாத்தியமான பலன்களாக மதிப்பிடப்பட்டு, அந்தக் காலத்தின் வயது/வாழ்க்கைக் கட்டத்திற்கு பொருந்தாத நிகழ்வுகள் நீக்கப்பட்ட பிறகே பிரிவு ஜாதகம், தசை மற்றும் கோச்சார உறுதிப்படுத்தலுடன் இயல்பான வாழ்க்கைப் பலனாக வழங்கப்படுகிறது.':'Natal evidence is first converted to candidate manifestations; age/life-stage-inappropriate events are removed before divisional, dasha and transit confirmation is translated into a natural life result.'}</p>`;for(const d of order)html+=await v42RenderDomain(c,full,d,lang,payload,full,classes[d]);html+='</div>';target.innerHTML=html}

// V43 ROOT — Evidence Matrix -> Resolver -> Kala/Desa/Patra -> Event selection -> Narrative.
// The renderer no longer exposes raw planet/varga/transit dumps as the prediction itself.
function v43EvidenceMatrix(c,data,d,pn,tr,payload,date){
 const q=domains[d], nr=natal(c,d), pr=v40PlanetRole(c,d,pn), ai=v42AgeInfo(payload,date), stage=v42Stage(ai);
 const v=q.v?division(data,q.v):null; let vSupport=0,vPressure=0,vContacts=[];
 if(v&&Array.isArray(v.planets)){
  const row=v.planets.find(x=>P(x.planet||x.name)===pn);
  if(row){const same=v.planets.filter(x=>x!==row&&String(row.rasi||row.sign||'')!==''&&String(x.rasi||x.sign||'')===String(row.rasi||row.sign||'')).map(x=>P(x.planet||x.name));vContacts=same;
   for(const x of same){if(['Jupiter','Venus','Mercury','Moon'].includes(x))vSupport++;if(['Saturn','Mars','Rahu','Ketu'].includes(x))vPressure++;}
  }
 }
 const tps=v39TransitPlanets(tr);let tSupport=0,tPressure=0,tHits=[];
 for(const p of tps){const name=P(p.name||p.planet),h=v39TransitHouse(c,p);if(h&&q.rel.includes(h)){tHits.push({name,h});if(['Jupiter','Venus','Mercury','Moon'].includes(name))tSupport++;if(['Saturn','Mars','Rahu','Ketu'].includes(name))tPressure++;}}
 const natalSupport=nr.plus.length+pr.support, natalPressure=nr.minus.length+pr.pressure;
 const dashaActivation=relScore(c,pn,d);
 const support=natalSupport+vSupport+tSupport+dashaActivation;
 const pressure=natalPressure+vPressure+tPressure;
 const convergence=(natalSupport>natalPressure?1:-1)+(vSupport>vPressure?1:vPressure>vSupport?-1:0)+(tSupport>tPressure?1:tPressure>tSupport?-1:0)+(dashaActivation>=2?1:0);
 const verdict=convergence>=2?'support':convergence<=-1?'pressure':'mixed';
 return {q,pn,ai,stage,nr,pr,vSupport,vPressure,vContacts,tSupport,tPressure,tHits,dashaActivation,support,pressure,convergence,verdict};
}
const V43_OUTCOME_TA={
 career:{support:['பொறுப்பு அதிகரிப்பை பதவி அல்லது நிலையான தொழில் முன்னேற்றமாக மாற்றும் வாய்ப்பு உருவாகும்','செய்த வேலையின் மதிப்பு தெளிவாகத் தெரியத் தொடங்கி தொழில் நிலை உறுதியாகும்'],pressure:['வேலைச்சுமை அல்லது அமைப்பு மாற்றம் பழைய பணிமுறையை திருத்த வேண்டிய நிலையை உருவாக்கும்','பதவி அல்லது வேலை மாற்ற முடிவில் அவசரத்தை விட நிலைத்தன்மையை முன்னிலைப்படுத்த வேண்டும்'],mixed:['வாய்ப்பும் கூடுதல் பொறுப்பும் ஒன்றாக வரும்; தேர்ந்தெடுக்கும் பாதையின் நீடித்த தன்மையே முக்கியமாகும்']},
 jobchange:{support:['புதிய பொறுப்பு, குழு அல்லது பணியிட மாற்றம் முன்னேற்றத்திற்கான கதவைத் திறக்கலாம்','தற்போதைய திறனை வேறு பொறுப்பில் பயன்படுத்தும் வாய்ப்பு உருவாகலாம்'],pressure:['மாற்றம் தேவைப்பட்டாலும் புதிய நிபந்தனைகள், சம்பளம் மற்றும் நிலைத்தன்மையை ஒப்பிட்டு முடிவு செய்ய வேண்டும்'],mixed:['மாற்ற வாய்ப்பு திறக்கும்; ஆனால் பழைய பொறுப்பை முடித்து புதிய அமைப்பை ஏற்கும் இடைக்காலம் இருக்கும்']},
 skills:{support:['கற்ற திறன் நடைமுறைப் பயன்பாட்டில் தெளிவாகத் தெரியத் தொடங்கும்','தொடர்பு, கைதிறன் அல்லது அறிவுத் திறனை பயனுள்ள செயலாக மாற்றும் வாய்ப்பு அதிகரிக்கும்'],pressure:['திறன் இருந்தாலும் அதை வெளிப்படுத்தும் முறை மற்றும் தொடர்ச்சியான பயிற்சி திருத்தப்பட வேண்டும்'],mixed:['திறன் வளர்ச்சி இருக்கும்; அதன் பலன் தொடர்ந்து பயன்படுத்தும் அளவுக்கு ஏற்ப வெளிப்படும்']},
 turning:{support:['முன்பு நின்றிருந்த விஷயத்தை புதிய முறையில் மீண்டும் கட்டமைக்கும் வாய்ப்பு கிடைக்கும்'],pressure:['பழைய அமைப்பை பிடித்துக் கொள்வதை விட தேவையான மாற்றத்தை படிப்படியாக ஏற்க வேண்டிய கட்டம் இது'],mixed:['ஒரு தடையின் முடிவு அடுத்த பாதையின் தொடக்கமாக மாறக்கூடிய இடைக்காலம் இது']},
 business:{support:['வாடிக்கையாளர், ஒப்பந்தம் அல்லது வருவாய் ஓட்டத்தில் நடைமுறை முன்னேற்றம் உருவாகலாம்'],pressure:['ஒப்பந்தம், செலவு மற்றும் கூட்டாண்மை நிபந்தனைகளை தெளிவுபடுத்தாமல் விரிவாக்கம் செய்யக் கூடாது'],mixed:['வியாபார வாய்ப்பு இருக்கும்; பணப்புழக்கம் மற்றும் கூட்டாண்மை ஒழுங்கே அதன் தரத்தை தீர்மானிக்கும்']},
 finance:{support:['வருமான வாய்ப்பை சேமிப்பு அல்லது நீடித்த நிதி முன்னேற்றமாக மாற்ற ஏற்ற சூழல் உருவாகும்'],pressure:['வருமானம் இருந்தாலும் செலவு அல்லது நிலுவை பொறுப்புகள் சேமிப்பை குறைக்கலாம்'],mixed:['பணம் வருவதும் செலவாகுவதும் ஒன்றாக செயல்படும்; கையில் தங்கும் தொகையை உயர்த்துவதே முக்கியம்']},
 marriage:{support:['உறவை தெளிவுபடுத்துதல், குடும்ப ஒப்புதல் அல்லது உறுதிப்பாட்டை நோக்கி நகரும் வாய்ப்பு வலுப்படும்'],pressure:['உறவு முடிவில் உணர்ச்சி மட்டும் அல்லாமல் பொருத்தம், பொறுப்பு மற்றும் குடும்ப சூழலை ஆராய வேண்டும்'],mixed:['உறவு செயல்பாடு இருக்கும்; உறுதிப்பாடு பெற உரையாடலும் நடைமுறை ஒத்திசைவும் தேவைப்படும்']},
 children:{support:['வயதிற்கும் குடும்பச் சூழலுக்கும் பொருத்தமான குழந்தை/படைப்பாற்றல் சார்ந்த முன்னேற்றம் வலுப்படும்'],pressure:['குழந்தை அல்லது வளர்ச்சி சார்ந்த விஷயத்தில் பொறுமை, திட்டமிடல் மற்றும் சரியான ஆதரவு முக்கியமாகும்'],mixed:['வளர்ச்சி வாய்ப்பு உள்ளது; அதன் வெளிப்பாடு வயது மற்றும் குடும்பச் சூழலுக்கு ஏற்ப மாறும்']},
 education:{support:['கற்றல் திறன் அடுத்த நிலைக்கு நகர உதவும்; புரிதல் மற்றும் பயன்பாடு ஒன்றாக வளரக்கூடும்'],pressure:['கவனம் சிதறாமல் அடிப்படைத் திறனை உறுதிப்படுத்தி பின்னர் அடுத்த கட்டத்திற்கு செல்ல வேண்டும்'],mixed:['கற்றல் முன்னேறும்; சரியான முறை மற்றும் தொடர்ச்சியே வேகத்தை தீர்மானிக்கும்']},
 property:{support:['வீடு அல்லது சொத்து சார்ந்த முடிவை நடைமுறைக்கு கொண்டு வர ஏற்ற ஒத்திசைவு உருவாகலாம்'],pressure:['சொத்து முடிவில் நிதி, ஆவணம் மற்றும் குடும்பத் தேவையை முழுமையாகச் சரிபார்க்க வேண்டும்'],mixed:['சொத்து வாய்ப்பு இருக்கும்; செலவு மற்றும் பயன்பாட்டு தேவையின் சமநிலை முக்கியம்']},
 debt:{support:['நிலுவை கடன் அல்லது போட்டி அழுத்தத்தை ஒழுங்குபடுத்தும் வாய்ப்பு உருவாகும்'],pressure:['புதிய கடன் அல்லது வழக்கு சார்ந்த முடிவில் கட்டுப்பாடும் ஆவணத் தெளிவும் அவசியம்'],mixed:['அழுத்தம் குறையலாம்; ஆனால் திருப்பிச் செலுத்தல் மற்றும் செலவு ஒழுங்கை தொடர்ந்து வைத்திருக்க வேண்டும்']},
 health:{support:['தினசரி ஒழுங்கு, ஓய்வு மற்றும் உடல் சக்தியை சீர்படுத்தும் முயற்சிக்கு நல்ல பதில் கிடைக்கலாம்'],pressure:['தூக்கம், உணவு, ஓய்வு மற்றும் வேலைச்சுமையை புறக்கணிக்காமல் கவனிக்க வேண்டும்'],mixed:['உடல் சக்தி மாறுபடலாம்; ஒழுங்கான பழக்கமே நிலைத்தன்மையை தரும்']},
 family:{support:['குடும்பப் பேச்சு மற்றும் பொறுப்பு பகிர்வு இல்லற அமைதியை மேம்படுத்தும்'],pressure:['குடும்ப கருத்து வேறுபாட்டை நீட்டிக்காமல் பொறுப்பு மற்றும் எதிர்பார்ப்பை தெளிவுபடுத்த வேண்டும்'],mixed:['ஆதரவும் பொறுப்பும் ஒன்றாக இருக்கும்; தெளிவான தொடர்பே சமநிலையை தரும்']},
 parents:{support:['பெற்றோர் அல்லது மூத்தோரின் ஆதரவு/வழிகாட்டல் பயனுள்ள முடிவாக மாறலாம்'],pressure:['பெற்றோர் அல்லது வீட்டு பொறுப்புக்கு கூடுதல் நேரம் மற்றும் கவனம் தேவைப்படலாம்'],mixed:['ஆதரவு கிடைத்தாலும் குடும்பப் பொறுப்பை பகிர்ந்து ஏற்க வேண்டிய நிலை இருக்கும்']},
 siblings:{support:['சகோதரர் அல்லது நெருங்கிய வலையமைப்பின் ஒத்துழைப்பு முயற்சியை முன்னேற்ற உதவும்'],pressure:['தவறான புரிதலைத் தவிர்க்க நேரடியான தொடர்பு தேவைப்படும்'],mixed:['உதவி கிடைக்கும்; அதே நேரத்தில் தனிப்பட்ட முயற்சியும் தொடர வேண்டும்']},
 travel:{support:['பயணம் அல்லது இடமாற்றம் புதிய அனுபவம் அல்லது வாய்ப்பைத் திறக்கலாம்'],pressure:['பயணம்/இடமாற்றத்தில் செலவு, ஆவணம் மற்றும் நேரத்தை கவனமாக திட்டமிட வேண்டும்'],mixed:['இடமாற்ற வாய்ப்பு இருக்கும்; அதன் நடைமுறைச் சுமையையும் கணக்கில் கொள்ள வேண்டும்']},
 status:{support:['தொடர்ச்சியான செயல்திறன் மூலம் நம்பிக்கை மற்றும் அங்கீகாரம் உயரக்கூடும்'],pressure:['அங்கீகாரம் பெற கூடுதல் பொறுப்பை நிரூபிக்க வேண்டிய காலம்'],mixed:['பொறுப்பு அதிகரிப்புடன் அங்கீகாரமும் படிப்படியாக உருவாகும்']},
 fortune:{support:['கிடைக்கும் வாய்ப்பை சரியான நேரத்தில் பயன்படுத்தினால் வாழ்க்கை முன்னேற்றமாக மாற்ற முடியும்'],pressure:['வாய்ப்பை அதிர்ஷ்டம் என்று மட்டும் நம்பாமல் தயாரிப்புடன் அணுக வேண்டும்'],mixed:['வாய்ப்பு திறக்கும்; அதை நிலையான முன்னேற்றமாக்க முயற்சி தேவைப்படும்']},
 spiritual:{support:['உள்ளார்ந்த தெளிவு, வழிபாடு அல்லது சிந்தனை வாழ்க்கை முடிவுகளில் அமைதியை அதிகரிக்கலாம்'],pressure:['குழப்பமான காலத்தில் ஒழுங்கான சிந்தனை/ஆன்மிகப் பழக்கம் மனநிலையை நிலைப்படுத்த உதவும்'],mixed:['வெளிப்புற பொறுப்புகளுடன் உள்ளார்ந்த ஒழுக்கத்தையும் சமநிலைப்படுத்த வேண்டிய காலம்']},
 remedy:{support:['மீதமுள்ள சவாலை நடைமுறை மாற்றத்தால் குறைக்கும் வாய்ப்பு உள்ளது'],pressure:['பரிகாரத்திற்கு முன் காரணமான பழக்கம், செலவு, உறவு அல்லது பொறுப்பு பிரச்சினையைத் திருத்த வேண்டும்'],mixed:['நடைமுறை திருத்தம் முதலில்; அதன் பிறகே தேவையான பாரம்பரிய பரிகாரத்தை தேர்வு செய்ய வேண்டும்']}
};
function v43Pick(arr,seed){if(!arr||!arr.length)return '';let n=0;for(const c of String(seed||''))n=(n*31+c.charCodeAt(0))>>>0;return arr[n%arr.length]}
function v43ContextOutcome(c,data,d,l,m,payload,date){const ta=l==='ta',base=v42Event(d,m.verdict,l,m.ai,payload,m.pn);if(base)return base; if(ta)return v43Pick(V43_OUTCOME_TA[d]?.[m.verdict]||[],`${d}|${m.pn}|${date}`);const x=V40_DOMAIN_RESULT_EN[d]?.[m.verdict];return x||''}
function v43Confidence(m){const layers=[m.nr.plus.length||m.nr.minus.length,m.dashaActivation>0,m.vSupport||m.vPressure,m.tSupport||m.tPressure].filter(Boolean).length;return layers>=4?'high':layers>=3?'medium':'limited'}
function v43NaturalPhase(c,data,d,w,l,tr,payload){const date=v39MidDate(w),m=v43EvidenceMatrix(c,data,d,w.pd,tr,payload,date),out=v43ContextOutcome(c,data,d,l,m,payload,date),ta=l==='ta';
 const conf=v43Confidence(m);let qualifier='';
 if(ta){if(conf==='high')qualifier=m.verdict==='support'?'பிறப்பு அமைப்பு, தசை மற்றும் துணை ஆதாரங்கள் ஒரே திசையில் இருப்பதால் இந்தக் காலம் மற்ற காலங்களை விட குறிப்பிடத்தக்கது.':m.verdict==='pressure'?'பல அடுக்குகளில் அழுத்தச் சுட்டிகள் ஒன்றாக இருப்பதால் அவசர முடிவைத் தவிர்ப்பது நல்லது.':'பல அடுக்குகள் செயல்பட்டாலும் ஆதரவும் சோதனையும் கலந்துள்ளதால் முடிவு நடைமுறைச் சூழலைப் பொறுத்தது.';else if(conf==='medium')qualifier='தசைச் செயல்பாட்டுக்கு கூடுதல் ஆதாரம் உள்ளது; ஆனால் இதை தனியாக உறுதியான நிகழ்வு என்று எடுத்துக்கொள்ளக்கூடாது.';else qualifier='இது ஒரு செயல்பாட்டு சுட்டி மட்டுமே; மற்ற உறுதிப்படுத்தல்கள் குறைவாக உள்ளன.';
 }else qualifier=conf==='high'?'Multiple layers converge in this period, making it more significant than an isolated indication.':conf==='medium'?'The dasha has additional support, but this is not independent proof of an event.':'This is an activation indication with limited independent confirmation.';
 return `${out}. ${qualifier}`.replace(/\.\s*\./g,'.').replace(/\s+/g,' ').trim();
}
function v43Base(c,data,d,l,payload,ai){const q=domains[d],nr=natal(c,d),ta=l==='ta';let verdict=nr.plus.length>nr.minus.length?'support':nr.minus.length>nr.plus.length?'pressure':'mixed';const fake={verdict,ai,pn:null};let out=v43ContextOutcome(c,data,d,l,fake,payload,new Date());
 if(!out)out=ta?(V43_OUTCOME_TA[d]?.[verdict]?.[0]||'இந்த வாழ்க்கைப் பகுதி கலந்த ஆதாரங்களுடன் செயல்படுகிறது'):(V40_DOMAIN_RESULT_EN[d]?.[verdict]||'This life area has mixed indications');
 const suffix=ta?(verdict==='support'?'பிறப்பு ஜாதகத்தில் ஆதரவு காரணிகள் மேலோங்குவதால் இதன் அடிப்படை வாய்ப்பு பாதுகாக்கப்படுகிறது.':verdict==='pressure'?'பிறப்பு ஜாதகத்தில் சவால் காரணிகள் இருப்பதால் நேரத் தேர்வும் நடைமுறை அணுகுமுறையும் முக்கியம்; இது தனியாக முழு மறுப்பு அல்ல.':'பிறப்பு ஜாதகத்தில் ஆதரவும் சவாலும் கலந்துள்ளதால் செயல்படும் காலங்களின் ஒத்திசைவு முக்கியம்.'):(verdict==='support'?'Natal support is stronger, preserving the underlying promise.':verdict==='pressure'?'Natal pressure makes timing and practical handling important; this is not a denial by itself.':'Natal support and pressure are mixed, so convergent timing matters.');
 return `${out}. ${suffix}`;
}
function v43PeriodLine(c,data,d,w,l,kind,tr,payload){const s=String(w?.start||'').trim(),e=String(w?.end||'').trim(),dateText=s&&e?`${s} → ${e}`:s||e,ai=v42AgeInfo(payload,v39MidDate(w));const stage=v42Stage(ai);const dasha=dashaText(w,l),natural=v43NaturalPhase(c,data,d,w,l,tr,payload);if(l==='ta'){const prefix=kind==='past'?'கடந்தகாலத்தில்':kind==='current'?'தற்போது':'அருகிலுள்ள எதிர்காலத்தில்';const retrospective=kind==='past'?' இது அந்தக் காலத்தில் செயல்பட்ட ஜோதிடச் சுட்டி; நடந்த நிகழ்வை நிரூபிப்பதாக எடுத்துக்கொள்ளப்படவில்லை.':'';return `${prefix}${dateText?' '+dateText+' காலத்தில்':''} ${dasha}. ${natural}${retrospective}`.replace(/\s+/g,' ').trim();}const prefix=kind==='past'?'In the past':kind==='current'?'Currently':'In the near future';return `${prefix}${dateText?' ('+dateText+')':''}: ${dasha}. ${natural}${kind==='past'?' This is an activation indicator, not proof that an event occurred.':''}`.replace(/\s+/g,' ').trim()}
async function v43RenderDomain(c,data,d,l,payload,full,cls){const x=cls||classify(c,d,payload),nowAI=v42AgeInfo(payload,new Date());const make=async(arr,kind)=>{const out=[];for(const w of arr){const tr=await v39TransitFor(payload,v39MidDate(w),l,full);out.push(v43PeriodLine(c,data,d,w,l,kind,tr,payload));}return out.join(' ')};const past=await make(x.past,'past'),current=await make(x.current,'current'),future=await make(x.future,'future');const safe=(v,kind)=>v||(l==='ta'?(kind==='past'?'கிடைக்கும் தசா வரலாற்றில் இந்த வாழ்க்கைப் பகுதிக்கான தெளிவான தனி செயல்பாட்டு காலம் இல்லை.':kind==='current'?'தற்போதைய தசா காலத் தரவு கிடைக்கவில்லை.':'அருகிலுள்ள எதிர்கால தசா காலத் தரவு கிடைக்கவில்லை.'):(kind==='past'?'No distinct past activation appears in the available dasha history.':kind==='current'?'Current dasha data is unavailable.':'Near-future dasha data is unavailable.'));return `<section class="smv-pred-domain"><h4>${esc(v42DynamicHeading(d,l,nowAI,payload))}</h4><p>${esc(v43Base(c,data,d,l,payload,nowAI))}</p><div class="smv-pred-time"><b>${l==='ta'?'கடந்தகால ஆய்வு':'Past review'}</b><p>${esc(safe(past,'past'))}</p><b>${l==='ta'?'தற்போதைய பலன்':'Current outlook'}</b><p>${esc(safe(current,'current'))}</p><b>${l==='ta'?'அருகிலுள்ள எதிர்காலம்':'Near future'}</b><p>${esc(safe(future,'future'))}</p></div></section>`}
async function renderV43(ev){const {full,payload,lang='en',rootId}=ev.detail||{},root=document.getElementById(rootId);if(!root||!full?.chart)return;const target=root.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');if(!target)return;const c=full.chart,order=['career','jobchange','skills','turning','business','finance','marriage','children','education','property','debt','health','family','parents','siblings','travel','status','fortune','spiritual','remedy'];const classes=Object.fromEntries(order.map(d=>[d,classify(c,d,payload)]));let html=`<div class="adv-section"><h3>🔭 ${lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${lang==='ta'?'SMV Basic + Advanced Analysis-ல் ஏற்கனவே கணக்கிடப்பட்ட பாவம்–பாவாதிபதி, dignity/strength, கிரக/ராசி பார்வை, அர்கலா–விரோதார்கலா, அஷ்டகவர்க்கம், கிரக உறவுகள் மற்றும் D7/D9/D10 ஆதாரங்கள் மீண்டும் கணக்கிடாமல் இங்கு synthesis செய்யப்படுகின்றன. தாஜக, சஹம்கள், சர்வதோபத்ர மற்றும் சுதர்சன சக்கரங்கள் இப்போது பிறப்பு வாக்குறுதியை மாற்றாமல் timing/transit confirmation layer ஆக பயன்படுத்தப்படுகின்றன.':'Existing SMV Basic + Advanced Analysis outputs—house/lord, dignity/strength, Graha/Rasi Drishti, Argala/Virodhargala, Ashtakavarga, planet relations and D7/D9/D10—are synthesised here without recalculating them. Tajaka, Sahams, Sarvatobhadra and Sudarshana are now used as timing/transit confirmation layers without overriding natal promise.'}</p>`;for(const d of order)html+=await v43RenderDomain(c,full,d,lang,payload,full,classes[d]);html+='</div>';target.innerHTML=html}


// V49 ROOT — Book-informed Event Candidate + Evidence Scorer V2.
// Rules are stored as structured candidates; book prose is never copied into predictions.
const V49_EVENTS={
 career:[['career_progress',16,[2,6,10,11],'தொழில் நிலை மற்றும் பொறுப்பு முன்னேற்றம்','career progress and responsibility'],['first_job',16,[2,6,10,11],'வேலை வாய்ப்பு அல்லது தொழில் தொடக்கம்','employment or career entry'],['career_stability',18,[2,6,10,11],'தொழில் நிலைத்தன்மை','career stability']],
 jobchange:[['promotion',18,[6,10,11],'பதவி உயர்வு அல்லது பொறுப்பு உயர்வு','promotion or higher responsibility'],['job_change',18,[3,6,10,12],'வேலை/பணி அமைப்பு மாற்றம்','job or work-setting change'],['role_change',18,[6,10,11],'புதிய பொறுப்பு அல்லது குழு மாற்றம்','new responsibility or team change']],
 skills:[['skill_growth',5,[3,5,10,11],'திறன் வளர்ச்சி மற்றும் நடைமுறைப் பயன்பாடு','skill growth and practical use'],['communication',5,[2,3,5],'தொடர்பு மற்றும் கற்ற திறன் வளர்ச்சி','communication and learning-skill growth']],
 turning:[['recovery',8,[1,6,8,11],'தடையை கடந்து மீள்வளர்ச்சி','recovery after an obstacle'],['restructure',12,[8,10,12],'பழைய அமைப்பை மாற்றி புதிய பாதை அமைத்தல்','restructuring an old pattern']],
 business:[['business_start',18,[2,3,7,10,11],'சுயதொழில் அல்லது வியாபார முயற்சி','business or self-employment initiative'],['business_growth',18,[2,7,10,11],'வாடிக்கையாளர் மற்றும் வியாபார வளர்ச்சி','client and business growth'],['partnership',18,[7,10,11],'கூட்டாண்மை வாய்ப்பு','partnership opportunity']],
 finance:[['income',16,[2,10,11],'வருமான வாய்ப்பு மற்றும் வரவு வளர்ச்சி','income opportunity and growth'],['savings',18,[2,11],'சேமிப்பு மற்றும் நிதி நிலைத்தன்மை','savings and financial stability'],['gain',18,[2,5,9,11],'லாப வாய்ப்பு','gain opportunity']],
 marriage:[['relationship',18,[5,7,11],'உறவு உருவாகுதல் அல்லது தெளிவுபடுத்துதல்','relationship development or clarification'],['proposal',20,[2,7,11],'திருமண பேச்சு அல்லது குடும்ப ஒப்புதல்','marriage discussion or family approval'],['marriage',21,[2,7,11],'திருமண உறுதிப்பாடு','marriage commitment']],
 children:[['child_development',0,[5,9],'குழந்தைப் பருவ வளர்ச்சி, கற்றல் அல்லது படைப்பாற்றல்','childhood development, learning or creativity'],['child_planning',21,[2,5,9,11],'குழந்தை தொடர்பான திட்டமிடல்','child-related planning'],['family_expansion',21,[2,5,9,11],'குடும்ப விரிவாக்க வாய்ப்பு','family-expansion opportunity']],
 education:[['school_learning',4,[2,4,5],'அடிப்படை கல்வி மற்றும் கற்றல் முன்னேற்றம்','school learning and progress'],['higher_education',16,[4,5,9],'உயர்கல்வி அல்லது சிறப்பு படிப்பு','higher or specialised education'],['training',14,[3,5,9,10],'திறன் பயிற்சி அல்லது தொழில்முறை கற்றல்','skill or professional training'],['restart_study',16,[4,5,9,11],'இடைநிறுத்தத்திற்குப் பிறகு கல்வி தொடர்ச்சி','resumption of studies']],
 property:[['home_change',18,[4,12],'வீடு அல்லது வசிப்பிட மாற்றம்','home or residence change'],['property_purchase',21,[2,4,11],'சொத்து/வீடு வாங்கும் திட்டம்','property or home purchase planning'],['vehicle',18,[4,11],'வாகன வசதி தொடர்பான முடிவு','vehicle-related decision']],
 debt:[['repayment',18,[2,6,11],'கடன் ஒழுங்குபடுத்தல் அல்லது திருப்பிச் செலுத்தல்','debt management or repayment'],['competition',14,[3,6,11],'போட்டி மற்றும் எதிர்ப்பை சமாளித்தல்','handling competition and opposition'],['litigation',18,[6,8,12],'வழக்கு/ஆவண சிக்கலை ஒழுங்குபடுத்தல்','handling litigation or documentation issues']],
 health:[['vitality',0,[1,6],'உடல் சக்தி மற்றும் தினசரி ஒழுங்கு','vitality and daily routine'],['recovery_routine',0,[1,6,8,12],'ஓய்வு, தூக்கம் மற்றும் உடல் பராமரிப்பு','rest, sleep and physical care']],
 family:[['family_support',0,[2,4,7],'குடும்ப ஆதரவு மற்றும் இல்லற ஒத்திசைவு','family support and domestic coordination'],['family_duty',12,[2,4,10],'குடும்பப் பொறுப்பு அதிகரித்தல்','increased family responsibility']],
 parents:[['parent_support',0,[4,9],'பெற்றோர்/மூத்தோர் ஆதரவு மற்றும் வழிகாட்டல்','parental or elder support and guidance'],['parent_duty',16,[4,9,10],'பெற்றோர் அல்லது வீட்டு பொறுப்பு','responsibility toward parents or home']],
 siblings:[['sibling_support',0,[3,11],'சகோதரர்/நெருங்கிய வலையமைப்பு ஆதரவு','sibling or close-network support'],['initiative',8,[3,10,11],'தனிப்பட்ட முயற்சி மற்றும் தொடர்பு வளர்ச்சி','initiative and communication growth']],
 travel:[['travel',5,[3,9,12],'பயணம் அல்லது தூரத் தொடர்பு','travel or distant connection'],['relocation',18,[3,9,12],'இடமாற்றம் அல்லது வெளிநாட்டு தொடர்பு','relocation or foreign link']],
 status:[['recognition',16,[9,10,11],'அங்கீகாரம் மற்றும் சமூகப் பொறுப்பு உயர்வு','recognition and social responsibility'],['leadership',18,[1,9,10,11],'வழிநடத்தல் அல்லது பொறுப்பு நிலை','leadership or responsibility']],
 fortune:[['opportunity',8,[5,9,11],'வாய்ப்பு மற்றும் முன்னேற்றம்','opportunity and progress'],['guidance',5,[5,9],'வழிகாட்டல், அறிவு மற்றும் நல்ல வாய்ப்பு','guidance, learning and opportunity']],
 spiritual:[['inner_growth',8,[5,9,12],'ஆன்மிக/உள்ளார்ந்த வளர்ச்சி','spiritual or inner growth'],['practice',8,[5,9,12],'வழிபாடு, சிந்தனை அல்லது ஆன்மிக ஒழுக்கம்','worship, reflection or spiritual discipline']],
 remedy:[['practical_correction',0,[1,6,8,12],'நடைமுறை திருத்தம் மற்றும் ஒழுக்கம்','practical correction and discipline'],['traditional_remedy',12,[1,6,8,12],'தேவையானபோது மட்டும் பாரம்பரிய பரிகார வழிகாட்டல்','traditional remedial guidance only when warranted']]
};
function v49Age(payload,date){const b=dt(payload?.date),x=date instanceof Date?date:dt(date);if(!b||!x)return null;let a=x.getFullYear()-b.getFullYear();if(x.getMonth()<b.getMonth()||(x.getMonth()===b.getMonth()&&x.getDate()<b.getDate()))a--;return Math.max(0,a)}
function v49Mid(w){const a=dt(w.start),b=dt(w.end,true);return a&&b?new Date((+a+ +b)/2):(a||b||new Date())}
const V50_AGE_BOUNDS={
  first_job:[16,45],school_learning:[4,17],child_development:[0,17],
  higher_education:[16,35],training:[12,65],restart_study:[16,65],
  relationship:[18,70],proposal:[20,70],marriage:[21,70],
  child_planning:[21,50],family_expansion:[21,50],
  business_start:[18,65],business_growth:[18,75],partnership:[18,75],
  income:[16,75],savings:[18,85],gain:[18,85],
  promotion:[18,65],job_change:[18,65],role_change:[18,70],career_progress:[16,70],career_stability:[18,75],
  property_purchase:[21,85],vehicle:[18,85],home_change:[0,95],repayment:[18,90],litigation:[18,90],
  recognition:[12,95],leadership:[18,85],relocation:[18,85]
};
function v50AgeEligible(id,minAge,age){if(age==null)return true;const b=V50_AGE_BOUNDS[id]||[minAge,Infinity];return age>=Math.max(minAge,b[0])&&age<=b[1]}
function v49CandidateScore(c,data,d,w,tr,payload,e){const [id,minAge,hs]=e,age=v49Age(payload,v49Mid(w));if(!v50AgeEligible(id,minAge,age))return {eligible:false,score:-999,age};const m=v43EvidenceMatrix(c,data,d,w.pd,tr,payload,v49Mid(w));let score=m.support-m.pressure+m.dashaActivation*2;const roles=[w.md,w.ad,w.pd].map(p=>v40PlanetRole(c,d,p));for(const r of roles){if(r.h&&hs.includes(r.h))score+=2;if(r.relevantOwned.some(h=>hs.includes(h)))score+=2;if(r.aspectFocus)score+=1;}if(domains[d].v){score+=m.vSupport*2-m.vPressure;}score+=m.tSupport-m.tPressure;return {eligible:true,score,age,m,id}}
function v49Select(c,data,d,w,tr,payload){const all=(V49_EVENTS[d]||[]).map(e=>({e,...v49CandidateScore(c,data,d,w,tr,payload,e)})).filter(x=>x.eligible).sort((a,b)=>b.score-a.score);return all[0]||null}
function v49AgeContext(age,l){if(age==null)return '';if(l==='ta'){if(age<5)return 'குழந்தைப் பருவத்தின் ஆரம்ப கட்டத்திற்கு பொருத்தமாக';if(age<13)return 'பள்ளிப் பருவத்திற்கு பொருத்தமாக';if(age<18)return 'இளமைக் கல்வி/திறன் வளர்ச்சி கட்டத்திற்கு பொருத்தமாக';if(age<25)return 'கல்வி–தொழில் தொடக்க வாழ்க்கைக் கட்டத்திற்கு பொருத்தமாக';if(age<40)return 'வயது வந்த குடும்ப/தொழில் வாழ்க்கைக் கட்டத்திற்கு பொருத்தமாக';if(age<60)return 'நடுத்தர வாழ்க்கை பொறுப்பு மற்றும் நிலைத்தன்மைக் கட்டத்திற்கு பொருத்தமாக';return 'மூத்த வாழ்க்கைக் கட்டத்தின் தேவைகள் மற்றும் பொறுப்புகளுக்கு பொருத்தமாக'}if(age<5)return 'in an early-childhood form';if(age<13)return 'in a school-age form';if(age<18)return 'in an adolescent learning/skill-development form';if(age<25)return 'in an education-to-career transition form';if(age<40)return 'in an adult family/career form';if(age<60)return 'in a mid-life responsibility and stability form';return 'in a later-life form appropriate to current responsibilities'}
function v49Narrative(c,data,d,w,l,tr,payload,kind){
 const pick=v49Select(c,data,d,w,tr,payload);
 if(!pick)return l==='ta'?'இந்தக் காலத்தின் வயது மற்றும் வாழ்க்கைக் கட்டத்துடன் பொருந்தும் முக்கிய நிகழ்வு இந்த ஆதாரங்களில் இருந்து தேர்வு செய்யப்படவில்லை.':'The available evidence does not select a major event appropriate to this age and life stage.';
 const [id,minAge,hs,ta,en]=pick.e,age=pick.age,m=pick.m,event=l==='ta'?ta:en,pd=langPlanet(w.pd,l);
 const evidence=[];
 if(domains[d].v&&m.vSupport>m.vPressure)evidence.push(l==='ta'?`D${domains[d].v} துணை ஜாதகமும் இதே திசையை உறுதிப்படுத்துகிறது`:`D${domains[d].v} confirms the same direction`);
 if(m.tSupport>m.tPressure)evidence.push(l==='ta'?`${domains[d].ta} தொடர்பான கோச்சார ஆதரவும் இந்தக் காலத்துடன் இணைகிறது`:`transit support relevant to ${domains[d].en.toLowerCase()} also converges with this period`);
 if(m.pressure>m.support)evidence.push(l==='ta'?'எதிர்மறைச் சுட்டிகள் இருப்பதால் நடைமுறையில் தாமதம் அல்லது திருத்தம் தேவைப்படலாம்':'counter-signals can bring delay or adjustment');
 const ctx=(age!=null&&(age<18||age>=60))?v49AgeContext(age,l):'';
 if(l==='ta'){
   const action={past:'இந்தக் காலத்தில் வெளிப்பட்டிருக்கக்கூடிய முக்கிய வடிவம்',current:'இந்தக் காலத்தில் முன்னிலையாகும் முக்கிய வாய்ப்பு',future:'இந்தக் காலத்தில் கவனிக்க வேண்டிய முக்கிய வளர்ச்சி'}[kind]||'முக்கிய வெளிப்பாடு';
   let s=`${ctx ? ctx+' ' : ''}${action} ${event}.`;
   if(evidence.length)s+=` ${evidence.slice(0,2).join('; ')}.`;
   if(pick.score<4)s+=` ${domains[d].ta} தொடர்பான மற்ற உறுதிப்படுத்தல்கள் குறைவாக இருப்பதால் இது முதன்மை முடிவாக அல்ல, சாத்தியமான திசையாக வாசிக்கப்படுகிறது.`;
   else if(pick.score<8&&m.pressure>0)s+=` ${domains[d].ta} தொடர்பான எதிர்ச் சுட்டிகளும் இருப்பதால் வெளிப்படும் நேரம் அல்லது வடிவம் மாறலாம்.`;
   return s.replace(/\s+/g,' ').trim();
 }
 const action={past:'A notable manifestation in this period was',current:'The main active possibility in this period is',future:'A key development to watch in this period is'}[kind]||'A likely manifestation is';
 let s=`${ctx ? ctx+', ' : ''}${action} ${event}.`;
 if(evidence.length)s+=` ${evidence.slice(0,2).join('; ')}.`;
 if(pick.score<4)s+=' Evidence is limited, so this should be read as a possible direction rather than a certain event.';
 else if(pick.score<8&&m.pressure>0)s+=' Support exists, although practical conditions can alter the pace.';
 return s.replace(/\s+/g,' ').trim();
}
function v49Base(c,data,d,l,payload){const q=domains[d],nr=natal(c,d),ta=l==='ta';const lord=langPlanet(nr.lord,l),h=hof(c,nr.lord);if(ta){let s=`${q.ta} தொடர்பான பிறப்பு வாக்குறுதி ${q.h}-ஆம் பாவம், அதன் அதிபதி ${lord}${h?' '+h+'-ஆம் பாவத்தில் இருப்பது':''} மற்றும் தொடர்புடைய காரக/பார்வை ஆதாரங்களின் சேர்க்கையால் மதிப்பிடப்படுகிறது.`;if(domains[d].v)s+=` இந்தத் துறையின் நிகழ்வு D${domains[d].v} உறுதிப்படுத்தலுக்குப் பிறகே வலுப்படுத்தப்படுகிறது.`;return s}let s=`The natal promise for ${q.en.toLowerCase()} is assessed from house ${q.h}, its lord ${lord}${h?' in house '+h:''}, and the relevant significator/aspect evidence.`;if(domains[d].v)s+=` Event strength is upgraded only after D${domains[d].v} confirmation.`;return s}
// V51 — strongest meaningful window selector. Rank by domain evidence first; display by date only after selection.
function v51PeriodPool(c,d,payload,kind){
 const now=new Date(),birth=dt(payload?.date),all=periods(c).map(w=>({...w,s:relScore(c,w.md,d)+relScore(c,w.ad,d)+relScore(c,w.pd,d),a:dt(w.start),b:dt(w.end,true)})).filter(w=>w.a&&w.b);
 const age85=birth?new Date(birth.getFullYear()+85,birth.getMonth(),birth.getDate()):new Date(now.getFullYear()+60,0,1);
 const futureEnd=new Date(Math.min(+age85,+new Date(now.getFullYear()+15,now.getMonth(),now.getDate())));
 if(kind==='past')return all.filter(w=>w.b<now&&(!birth||w.b>=birth));
 if(kind==='current')return all.filter(w=>w.a<=now&&w.b>=now);
 return all.filter(w=>w.a>now&&w.a<=futureEnd);
}
function v51HasEligibleEvent(d,w,payload){const age=v49Age(payload,v49Mid(w));return (V49_EVENTS[d]||[]).some(e=>v50AgeEligible(e[0],e[1],age))}
async function v51RankWindows(c,data,d,l,payload,full,kind){
 let pool=v51PeriodPool(c,d,payload,kind).filter(w=>v51HasEligibleEvent(d,w,payload));
 if(!pool.length)return [];
 // Cheap domain/Dasha pre-rank keeps transit work bounded without using chronology as the selector.
 pool.sort((a,b)=>b.s-a.s||(+b.b-+a.b));
 const cap=kind==='current'?3:Math.min(18,pool.length);
 pool=pool.slice(0,cap);
 const ranked=[];
 for(const w of pool){
   const tr=await v39TransitFor(payload,v49Mid(w),l,full);
   const pick=v49Select(c,data,d,w,tr,payload);
   if(!pick)continue;
   // Candidate evidence is primary; Dasha relevance is a tie-strengthener, not a chronological shortcut.
   ranked.push({w,tr,pick,total:pick.score+(w.s*0.35)});
 }
 ranked.sort((a,b)=>b.total-a.total||b.pick.score-a.pick.score||b.w.s-a.w.s||(+a.w.a-+b.w.a));
 const take=kind==='current'?1:kind==='past'?3:3;
 const selected=ranked.slice(0,take);
 // Human display remains chronological after strongest windows have been selected.
 selected.sort((a,b)=>+a.w.a-+b.w.a);
 return selected;
}
async function v51RenderDomain(c,data,d,l,payload,full){
 const nowAI=v42AgeInfo(payload,new Date());
 const make=async(kind)=>{const selected=await v51RankWindows(c,data,d,l,payload,full,kind),out=[];for(const z of selected){const w=z.w,s=String(w.start||''),e=String(w.end||''),prefix=l==='ta'?(kind==='past'?'கடந்தகாலத்தில்':kind==='current'?'தற்போது':'அருகிலுள்ள எதிர்காலத்தில்'):(kind==='past'?'In the past':kind==='current'?'Currently':'In the near future');out.push(`${prefix} ${s}${e?' → '+e:''}: ${dashaText(w,l)}. ${v49Narrative(c,data,d,w,l,z.tr,payload,kind)}`)}return out.join(' ')};
 const past=await make('past'),current=await make('current'),future=await make('future');
 const none=l==='ta'?'இந்த வாழ்க்கைப் பகுதிக்கான வயதிற்கு பொருத்தமான வலுவான தனி நிகழ்வு இந்தக் காலத் தொகுப்பில் தேர்வு செய்யப்படவில்லை.':'No strong age-appropriate separate event was selected in this period set.';
 return `<section class="smv-pred-domain"><h4>${esc(v42DynamicHeading(d,l,nowAI,payload))}</h4><p>${esc(v49Base(c,data,d,l,payload))}</p><div class="smv-pred-time"><b>${l==='ta'?'கடந்தகால ஆய்வு':'Past review'}</b><p>${esc(past||none)}</p><b>${l==='ta'?'தற்போதைய பலன்':'Current outlook'}</b><p>${esc(current||none)}</p><b>${l==='ta'?'அருகிலுள்ள எதிர்காலம்':'Near future'}</b><p>${esc(future||none)}</p></div></section>`;
}

// V55 — main horoscope flow untouched; X/XI/XII attach only after full-ready.
const V53_ORDER=['career','jobchange','skills','turning','business','finance','marriage','children','education','property','debt','health','family','parents','siblings','travel','status','fortune','spiritual','remedy'];
function v53NatalOutcomeScore(c,data,d,e){const [id,minAge,hs]=e,m=pm(c);let score=0;for(const n of Object.keys(m)){const h=hof(c,n),owns=lords.flatMap((lord,i)=>lord===n?[house(i,ls(c))]:[]);if(h&&hs.includes(h))score+=2;if(owns.some(x=>hs.includes(x)))score+=2;if(domains[d]?.kar?.includes(n))score+=1;}if(domains[d]?.v&&division(data,domains[d].v))score+=2;return {id,score,e};}
function v53SpecificProfile(c,data,d,l,payload){const ranked=(V49_EVENTS[d]||[]).map(e=>v53NatalOutcomeScore(c,data,d,e)).sort((a,b)=>b.score-a.score),top=ranked.filter(x=>x.score>0).slice(0,3);if(!top.length)return l==='ta'?'இந்தத் துறையில் ஒரு குறிப்பிட்ட முடிவைத் தேர்வு செய்ய போதுமான பிறப்பு ஜாதக ஆதாரம் இல்லை.':'The natal chart does not provide enough evidence to select a specific outcome in this domain.';const names=top.map(x=>l==='ta'?x.e[3]:x.e[4]);let extra='';if(d==='career'){const f=careerFields(c,l);if(f.length)extra=l==='ta'?` தொழில் இயல்பில் ${f.join('、')} ஆகிய திசைகள் அதிகமாகத் தெரிகின்றன.`:` The stronger occupational directions are ${f.join(', ')}.`;}return (l==='ta'?`வாழ்க்கை முழு சாத்தியத்தில் முதன்மையாக ${names.join('、')} ஆகிய வெளிப்பாடுகள் ஆதரிக்கப்படுகின்றன.`:`Across the life-course, the better-supported outcomes are ${names.join(', ')}.`)+extra;}
function v53RenderDomain(c,data,d,l,payload){const nowAI=v42AgeInfo(payload,new Date());return `<section class="smv-pred-domain"><h4>${esc(v42DynamicHeading(d,l,nowAI,payload))}</h4><p>${esc(v49Base(c,data,d,l,payload))}</p><b>${l==='ta'?'குறிப்பிட்ட வாழ்க்கை முடிவு':'Specific life-course outcome'}</b><p>${esc(v53SpecificProfile(c,data,d,l,payload))}</p></section>`;}
function v53FifteenYearPeriods(c,referenceDate){const now=new Date((referenceDate||new Date().toISOString().slice(0,10))+'T00:00:00Z'),end=new Date(now);end.setUTCFullYear(end.getUTCFullYear()+15);return periods(c).map(w=>({...w,a:dt(w.start),b:dt(w.end,true)})).filter(w=>w.a&&w.b&&w.b>now&&w.a<end).map(w=>{const a=new Date(Math.max(+w.a,+now)),b=new Date(Math.min(+w.b,+end));return {...w,a,b,start:a.toISOString().slice(0,10),end:b.toISOString().slice(0,10)};}).sort((x,y)=>+x.a-+y.a);}
function v54DateKey(x){const d=x instanceof Date?x:dt(x);return d?`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`:'';}
async function v53PeriodBest(c,data,w,l,payload,full){const mid=v49Mid(w),tr=await v39TransitFor(payload,v54DateKey(mid),l,full),picks=[];for(const d of V53_ORDER){if(!v51HasEligibleEvent(d,w,payload))continue;const pick=v49Select(c,data,d,w,tr,payload);if(!pick)continue;const ds=relScore(c,w.md,d)+relScore(c,w.ad,d)+relScore(c,w.pd,d),total=pick.score+ds*.35;if(total>0)picks.push({d,pick,total});}picks.sort((a,b)=>b.total-a.total);const samples=await Promise.all([w.start,v54DateKey(mid),w.end].map(async date=>({date,transit:await v39TransitFor(payload,date,l,full)})));return {w,tr,samples,picks:picks.slice(0,3)};}
function v53DomainName(d,l){const ta={career:'தொழில்',jobchange:'வேலை மாற்றம் / பதவி உயர்வு',skills:'திறன் மற்றும் தொடர்பு',turning:'வாழ்க்கை திருப்பம்',business:'வியாபாரம்',finance:'வருமானம் / நிதி',marriage:'திருமணம்',children:'குழந்தை / புத்திர பலன்',education:'கல்வி',property:'சொத்து / வீடு',debt:'கடன் / போட்டி',health:'உடல்நல கவனம்',family:'குடும்பம்',parents:'தாய் / தந்தை',siblings:'சகோதரர்கள்',travel:'பயணம் / இடமாற்றம்',status:'புகழ் / சமூக நிலை',fortune:'அதிர்ஷ்டம் / வாய்ப்புகள்',spiritual:'ஆன்மிக வளர்ச்சி',remedy:'கவனிக்க வேண்டிய அழுத்தங்கள்'},en={career:'Career',jobchange:'Job change / promotion',skills:'Skills / communication',turning:'Turning points',business:'Business',finance:'Finance / income',marriage:'Marriage',children:'Children',education:'Education',property:'Property / home',debt:'Debt / competition',health:'Health attention',family:'Family',parents:'Parents',siblings:'Siblings',travel:'Travel / relocation',status:'Status / recognition',fortune:'Fortune / opportunities',spiritual:'Spiritual growth',remedy:'Pressure / remedial attention'};return (l==='ta'?ta:en)[d]||d;}
function v53DashaRow(c,z,l,payload){const {w,picks}=z,ai=v42AgeInfo(payload,v49Mid(w)),age=ai?.years,ageText=age==null?'':(l==='ta'?`வயது சுமார் ${age}`:`approx. age ${age}`);if(!picks.length)return '';const outcomes=picks.map(x=>`${v53DomainName(x.d,l)} — ${l==='ta'?x.pick.e[3]:x.pick.e[4]}`).join(l==='ta'?'；':'; ');return `<div class="smv-pred-period"><b>${esc(w.start)} → ${esc(w.end)}</b><p>${esc(dashaText(w,l))}${ageText?' · '+esc(ageText):''}. ${l==='ta'?'இந்தக் காலத்தில் அதிக ஆதாரம் பெறும் வெளிப்பாடுகள்':'Better-supported manifestations in this period'}: ${esc(outcomes)}.</p></div>`;}
function v53TransitRow(z,l){const {w,picks}=z;if(!picks.length)return '';const parts=picks.map(x=>{const m=x.pick.m||{},s=m.tSupport||0,p=m.tPressure||0,event=l==='ta'?x.pick.e[3]:x.pick.e[4];let state;if(l==='ta')state=s>p?'கோச்சார ஆதரவு அதிகம்':p>s?'கோச்சார அழுத்தம் அதிகம்':'கோச்சார ஆதரவு/அழுத்தம் சமநிலை';else state=s>p?'transit support is stronger':p>s?'transit pressure is stronger':'transit support and pressure are balanced';return `${v53DomainName(x.d,l)} — ${event} (${state})`;}).join(l==='ta'?'；':'; ');return `<div class="smv-pred-period"><b>${esc(w.start)} → ${esc(w.end)}</b><p>${esc(parts)}.</p></div>`;}
function v58Yield(){return new Promise(resolve=>setTimeout(resolve,0));}
async function v58PeriodRows(c,data,l,payload,full,onRow){
 const rows=[],ws=v53FifteenYearPeriods(c,payload?.referenceDate);
 for(let i=0;i<ws.length;i++){
  const w=ws[i];
  try{const z=await v53PeriodBest(c,data,w,l,payload,full);if(z?.picks?.length){rows.push(z);if(onRow)onRow(z,rows.length,ws.length);}}
  catch(err){throw Error('Detailed period '+w.start+' could not complete: '+err.message);}
  // Mobile root fix: return control to browser after every period.
  await v58Yield();
 }
 return rows;
}
function v58EnsureStandalonePart(root,after,cls,en,ta,roman,lang,onFirstOpen){
 let part=root.querySelector('.smv-advanced-part.'+cls);
 if(part){const content=part.querySelector('.smv-advanced-part-content');if(onFirstOpen&&!part.__smvLazyBound){part.__smvLazyBound=true;part.querySelector('.smv-advanced-part-title')?.addEventListener('click',()=>{if(part.dataset.smvOpen==='1')onFirstOpen(content,part);});}return content;}
 const base=after?.closest?.('.smv-advanced-part');if(!base||!base.parentNode)return null;
 part=document.createElement('section');part.className='smv-advanced-part '+cls+' smv-advanced-part-ready';part.dataset.smvAccordion='1';part.dataset.smvOpen='0';part.id='smv-'+cls+'-panel';
 const head=document.createElement('div');head.className='smv-advanced-part-title smv-accordion-trigger';head.setAttribute('role','button');head.setAttribute('tabindex','0');head.setAttribute('aria-expanded','false');head.setAttribute('aria-controls',part.id+'-content');
 head.innerHTML=`<span class="smv-part-medallion" aria-hidden="true">${roman}</span><span class="smv-part-heading"><h3>${lang==='ta'?ta:en}</h3><span class="smv-part-tap">☝ ${lang==='ta'?'தொடுவதன் மூலம் பார்க்கவும்':'Tap to view'}</span></span><span class="smv-part-chevron" aria-hidden="true">⌄</span>`;
 const content=document.createElement('div');content.className='smv-advanced-part-content';content.id=part.id+'-content';content.hidden=true;part.append(head,content);
 const toggle=()=>{const open=part.dataset.smvOpen!=='1';part.dataset.smvOpen=open?'1':'0';head.setAttribute('aria-expanded',open?'true':'false');content.hidden=!open;part.classList.toggle('is-expanded',open);if(open&&onFirstOpen&&!part.__smvLazyStarted){part.__smvLazyStarted=true;setTimeout(()=>onFirstOpen(content,part),0);}};
 head.addEventListener('click',toggle);head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 base.parentNode.insertBefore(part,base.nextSibling);return content;
}
function v58Loading(content,l,kind){if(!content)return;content.innerHTML=`<div class="adv-section"><p class="small">${l==='ta'?(kind==='dasha'?'15 ஆண்டு தசா–புக்தி–அந்தரம் பலன்கள் கணக்கிடப்படுகின்றன…':'15 ஆண்டு கோச்சார பலன்கள் கணக்கிடப்படுகின்றன…'):(kind==='dasha'?'Calculating 15-year Dasha–Bhukti–Antaram results…':'Calculating 15-year transit results…')}</p><div class="smv-v58-progress"></div></div>`;}
async function renderV58(ev){
 const {full,payload,lang='en',rootId}=ev.detail||{},root=document.getElementById(rootId);if(!root||!full?.chart)return;const c=full.chart;
 const x=root.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');if(!x)return;const xPart=x.closest('.smv-advanced-part');
 // X is lightweight and renders after main horoscope only.
 let html=`<div class="adv-section"><h3>🔭 ${lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${lang==='ta'?'SMV Basic + Advanced Analysis-ல் ஏற்கனவே கணக்கிடப்பட்ட பாவம்–பாவாதிபதி, dignity/strength, கிரக/ராசி பார்வை, அர்கலா–விரோதார்கலா, அஷ்டகவர்க்கம், கிரக உறவுகள் மற்றும் D7/D9/D10 ஆதாரங்கள் மீண்டும் கணக்கிடாமல் இங்கு synthesis செய்யப்படுகின்றன. தாஜக, சஹம்கள், சர்வதோபத்ர மற்றும் சுதர்சன சக்கரங்கள் இப்போது பிறப்பு வாக்குறுதியை மாற்றாமல் timing/transit confirmation layer ஆக பயன்படுத்தப்படுகின்றன.':'Existing SMV Basic + Advanced Analysis outputs—house/lord, dignity/strength, Graha/Rasi Drishti, Argala/Virodhargala, Ashtakavarga, planet relations and D7/D9/D10—are synthesised here without recalculating them. Tajaka, Sahams, Sarvatobhadra and Sudarshana are now used as timing/transit confirmation layers without overriding natal promise.'}</p>`;
 for(const d of V53_ORDER){try{html+=v53RenderDomain(c,full,d,lang,payload);}catch(err){console.warn('V58 domain skipped',d,err);}}
 html+='</div>';x.innerHTML=html;
 const context=document.createElement('p');context.className='small';context.textContent=lang==='ta'?'ஆய்வு வரம்பு: அடுத்த 15 ஆண்டுகள். தேதியிட்ட மூன்று கோச்சார மாதிரிகள் லக்னத்திலிருந்து பாவங்களைக் காட்டுகின்றன; இடைப்பட்ட பெயர்ச்சி நேரங்களை இவை குறிக்கவில்லை. விரைவாக நகரும் கிரகங்கள் நடுப்பகுதி தேதிக்கே பொருந்தும். வயது, பிறந்த இடம் மற்றும் நேர வேறுபாடு பயன்படுத்தப்படுகின்றன; வாழும் நாடு, தொழில் அல்லது குடும்ப நிலை ஊகிக்கப்படவில்லை.':'Scope: the next 15 years. Three dated transit samples show houses from the natal ascendant; these are not exact ingress times. Fast-moving planets apply to the midpoint date only. Age, birth coordinates and UTC offset are used; current residence, occupation and family circumstances are not inferred.';x.prepend(context);
 let sharedRows=null,sharedPromise=null;
 const getRows=(onRow)=>{if(sharedRows)return Promise.resolve(sharedRows);if(!sharedPromise)sharedPromise=v58PeriodRows(c,full,lang,payload,full,onRow).then(r=>(sharedRows=r,r));return sharedPromise;};
 const xi=v58EnsureStandalonePart(root,x,'detailed-dasha-predictions','DETAILED DASHA–BHUKTI RESULTS — NEXT 15 YEARS','விரிவான தசா–புக்தி பலன்கள் — அடுத்த 15 ஆண்டுகள்','XI',lang,async(content)=>{
  v58Loading(content,lang,'dasha');const box=content.querySelector('.smv-v58-progress');
  const rows=await getRows(z=>{if(box)box.insertAdjacentHTML('beforeend',v53DashaRow(c,z,lang,payload));});
  if(box&&!box.innerHTML)box.innerHTML=`<p>${lang==='ta'?'வயதிற்கு பொருத்தமான தனி தசா செயல்பாடு தேர்வு செய்யப்படவில்லை.':'No age-appropriate dasha activation was selected.'}</p>`;
 });
 const xii=v58EnsureStandalonePart(root,xi||x,'detailed-transit-predictions','DETAILED TRANSIT RESULTS — NEXT 15 YEARS','விரிவான கோச்சார பலன்கள் — அடுத்த 15 ஆண்டுகள்','XII',lang,async(content)=>{
  v58Loading(content,lang,'transit');const box=content.querySelector('.smv-v58-progress');
  const rows=await getRows();for(let i=0;i<rows.length;i++){if(box)box.insertAdjacentHTML('beforeend',v53TransitRow(rows[i],lang));await v58Yield();}
  if(box&&!box.innerHTML)box.innerHTML=`<p>${lang==='ta'?'தனியாகக் காட்ட வேண்டிய கோச்சார உறுதிப்படுத்தல் தேர்வு செய்யப்படவில்லை.':'No separate transit confirmation was selected.'}</p>`;
 });
 if(xPart&&xi){const p=xi.closest('.smv-advanced-part');if(p&&p.previousElementSibling!==xPart)xPart.after(p);}if(xii&&xi){const a=xi.closest('.smv-advanced-part'),b=xii.closest('.smv-advanced-part');if(a&&b&&b.previousElementSibling!==a)a.after(b);}
}


// V59 ROOT — evidence-first, domain-specific natural narration.
// V58 lazy/chunked mobile scheduling is preserved; only the prediction/narration layer changes.
function v59HouseRole(c,d,pn,l){
 const r=v40PlanetRole(c,d,pn), ta=l==='ta', bits=[];
 if(r.h)bits.push(ta?`${langPlanet(pn,l)} ${r.h}-ஆம் பாவத்தில்`:`${langPlanet(pn,l)} in house ${r.h}`);
 if(r.relevantOwned?.length)bits.push(ta?`${r.relevantOwned.join(' மற்றும் ')}-ஆம் பாவ அதிபதித் தொடர்புடன்`:`ruling relevant house(s) ${r.relevantOwned.join(', ')}`);
 if(r.aspectFocus)bits.push(ta?`${domains[d].h}-ஆம் பாவத்தை பார்வையிட்டு`:`aspecting house ${domains[d].h}`);
 if(r.karaka)bits.push(ta?'இத்துறையின் காரகப் பங்குடன்':'acting as a significator for this domain');
 return bits.join(ta?'、':', ');
}
function v59DChartEvidence(data,d,pn,l){
 const q=domains[d]; if(!q?.v)return '';
 const v=division(data,q.v); if(!v?.planets)return '';
 const row=v.planets.find(x=>P(x.planet||x.name)===pn); if(!row)return '';
 const mates=v.planets.filter(x=>x!==row&&String(row.rasi||row.sign||'')!==''&&String(x.rasi||x.sign||'')===String(row.rasi||row.sign||'')).map(x=>langPlanet(P(x.planet||x.name),l)).filter(Boolean);
 const signName=String(row.rasi||row.sign||'').trim();
 if(l==='ta')return `${q.v===10?'தசாம்ச':q.v===9?'நவாம்ச':q.v===7?'சப்தாம்ச':`D${q.v}`}த்தில் ${langPlanet(pn,l)}${signName?' '+signName+' ராசியில்':''}${mates.length?' '+mates.join('、')+' தொடர்புடன்':''}`;
 return `In D${q.v}, ${langPlanet(pn,l)}${signName?' is in '+signName:''}${mates.length?' with '+mates.join(', '):''}`;
}
function v59TransitEvidence(c,d,tr,l){
 const q=domains[d], hits=[];
 for(const p of v39TransitPlanets(tr)){
  const pn=P(p.name||p.planet),h=v39TransitHouse(c,p);
  if(h&&q.rel.includes(h))hits.push({pn,h});
 }
 if(!hits.length)return l==='ta'?'இந்த காலத்தின் நடுப்பகுதியில் முக்கிய பாவங்களுக்கு நேரடி பெரிய கோச்சாரத் தொடுதல் குறைவாக உள்ளது.':'At the midpoint of this period, direct transit contact with the principal houses is limited.';
 const txt=hits.slice(0,5).map(x=>l==='ta'?`${langPlanet(x.pn,l)} ${x.h}-ஆம் பாவத்தில்`:`${langPlanet(x.pn,l)} through house ${x.h}`).join(l==='ta'?'、':', ');
 const extra=[v138TransitNakshatraContacts(window.__smvV138Full||{},tr,l),v138SudarshanaTransit(c,tr,l)].filter(Boolean).join(' ');return (l==='ta'?`கோச்சாரத்தில் ${txt} செயல்படுகிறது.`:`Transit shows ${txt}.`)+(extra?' '+extra:'');
}
function v59OutcomeText(x,l){return l==='ta'?x.pick.e[3]:x.pick.e[4]}
function v59DashaNarrative(c,data,z,x,l,payload){
 const w=z.w,ta=l==='ta', event=v59OutcomeText(x,l),ai=v42AgeInfo(payload,v49Mid(w)),age=ai?.years;
 const layers=[[w.md,'mahadasha'],[w.ad,'bhukti'],[w.pd,'antaram']].map(([planet,level])=>({planet,level,role:v59HouseRole(c,x.d,planet,l)}));
 const dc=v59DChartEvidence(data,x.d,w.pd,l)||v59DChartEvidence(data,x.d,w.ad,l)||v59DChartEvidence(data,x.d,w.md,l);
 const verdict=x.pick?.m?.verdict||'mixed';
 const timing=ta?`இந்த ${verdict==='support'?'ஆதரவான':verdict==='pressure'?'கவனத்துக்குரிய':'கலப்பு'} காலத்தில் ${event} தொடர்பான வாய்ப்பு ஆய்வுக்கு வருகிறது.`:`During this ${verdict==='support'?'supportive':verdict==='pressure'?'cautious':'mixed'} period, the chart highlights ${event}.`;
 const grouped=new Map();for(const v of layers){if(!v.role)continue;if(!grouped.has(v.planet))grouped.set(v.planet,{role:v.role,levels:[]});grouped.get(v.planet).levels.push(ta?({mahadasha:'மகாதசை',bhukti:'புக்தி',antaram:'அந்தரம்'}[v.level]):v.level);}const roles=[...grouped.values()].map(v=>`${v.levels.join(ta?' / ':' / ')}: ${v.role}`);
 const evidence=roles.length?(ta?`இதற்கான பிறப்பு ஜாதக ஆதாரம்: ${roles.join('; ')}.`:`Natal timing evidence: ${roles.join('; ')}.`):'';
 const divisional=dc?(ta?`${dc} என்ற துணைச் சுட்டியும் சேர்த்து பார்க்கப்படுகிறது.`:`The divisional-chart factor is ${dc}.`):'';
 return [age!=null?(ta?`இந்த இடைவெளியில் வயது சுமார் ${age}.`:`Approximate age in this interval: ${age}.`):'',timing,evidence,divisional].filter(Boolean).join(' ');
}
function v59DashaRow(c,data,z,l,payload){
 const {w,picks}=z;if(!picks.length)return '';
 const body=picks.map((x,i)=>`<p><b>${esc(v53DomainName(x.d,l))}${picks.length>1?' '+(i+1):''}</b> — ${esc(v59DashaNarrative(c,data,z,x,l,payload))}</p>`).join('');
 return `<div class="smv-pred-period"><b>${esc(w.start)} → ${esc(w.end)} · ${esc(dashaText(w,l))}</b>${body}</div>`;
}
const V70_ACTION={
 career:['பணிப் பொறுப்புகள், திறன் தேவைகள், மேலாளர் கருத்து ஆகியவற்றை இணைத்து முன்னேற்றத் திட்டம் அமைக்கலாம்.','Review responsibilities, required skills and feedback when planning career progress.'],
 jobchange:['புதிய பணியின் நிபந்தனைகள் மற்றும் தற்போதைய பணியின் நிலைத்தன்மையை ஒப்பிட்டு முடிவு செய்யலாம்.','Compare the new role’s terms with the stability of the current position.'],
 skills:['பயிற்சியில் கற்றதை நடைமுறைப் பணியில் பயன்படுத்தும் வாய்ப்புகளைத் தேர்வு செய்யலாம்.','Choose opportunities to apply new learning in practical work.'],
 business:['வாடிக்கையாளர் தேவை, ஒப்பந்த நிபந்தனைகள் மற்றும் பணப்புழக்கத்தை ஆய்வு செய்யலாம்.','Review customer demand, contract terms and cash flow.'],
 finance:['வருமான ஆதாரங்களையும் நிலையான செலவுகளையும் ஒப்பிட்டு சேமிப்புத் திட்டத்தை மதிப்பிடலாம்.','Compare income sources with recurring expenses when reviewing savings.'],
 marriage:['வயது, விருப்பம், குடும்பச் சூழல் மற்றும் இருவரின் சம்மதத்துடன் உறவு தொடர்பான உரையாடலை முன்னெடுக்கலாம்.','Consider age, preferences, family context and mutual consent in relationship discussions.'],
 children:['குடும்பத் திட்டம், பராமரிப்பு வசதி மற்றும் வயதுக்கேற்ற கல்விச் சூழலை நடைமுறையில் மதிப்பிடலாம்.','Review family plans, caregiving capacity and age-appropriate educational needs.'],
 education:['பாடத் தேர்வு, பயிற்சி நேரம் மற்றும் செயல்திறன் மதிப்பீட்டை இணைத்து கல்வித் திட்டத்தை அமைக்கலாம்.','Plan study choices, practice time and assessment together.'],
 property:['இடத்தின் பயன்பாடு, ஆவணங்கள், செலவுத் திறன் ஆகியவற்றைச் சரிபார்க்கலாம்.','Check the property’s intended use, documentation and affordability.'],
 debt:['திருப்பிச் செலுத்தும் அட்டவணை மற்றும் ஒப்பந்தக் கடமைகளைத் தெளிவாக மதிப்பிடலாம்.','Review repayment schedules and contractual obligations.'],
 health:['தினசரி ஒழுங்கை கவனிக்கலாம்; உடல் அறிகுறிகளுக்கான மதிப்பீட்டை மருத்துவப் பரிசோதனையின் அடிப்படையில் செய்ய வேண்டும்.','Attend to daily routines; assess symptoms through appropriate medical care.'],
 family:['பொறுப்புப் பகிர்வு மற்றும் எதிர்பார்ப்புகளைத் தெளிவாகப் பேசலாம்.','Discuss shared responsibilities and expectations clearly.'],
 parents:['பெற்றோரின் தேவைகள் மற்றும் பராமரிப்பில் குடும்ப உறுப்பினர்களின் பங்களிப்பைச் சீரமைக்கலாம்.','Coordinate parental needs and family caregiving responsibilities.'],
 siblings:['உதவி, பொறுப்பு மற்றும் தனிப்பட்ட எல்லைகள் குறித்து நேரடியாகப் பேசலாம்.','Discuss support, responsibilities and personal boundaries directly.'],
 travel:['பயண நோக்கம், அனுமதிகள் மற்றும் தங்கும் வசதிகளை முன்கூட்டியே சரிபார்க்கலாம்.','Check travel purpose, permissions and accommodation in advance.'],
 status:['செய்த பணிக்கான ஆதாரங்களையும் பொதுத் தொடர்புகளையும் ஒழுங்குபடுத்தலாம்.','Document completed work and review public communications.'],
 fortune:['கிடைக்கும் வாய்ப்பின் தகுதி நிபந்தனைகளையும் காலக்கெடுவையும் சரிபார்க்கலாம்.','Check opportunity requirements and deadlines.'],
 spiritual:['நம்பிக்கைக்கு ஏற்ற ஒழுங்கான வழிபாடு அல்லது சுயபரிசீலனை நேரத்தை அமைக்கலாம்.','Set aside regular time for personally meaningful worship or reflection.'],
 turning:['மாற்றத்திற்கு முன் தற்போதைய சூழல், ஆதரவுகள் மற்றும் மாற்று வழிகளை ஒப்பிடலாம்.','Compare the present situation, available support and alternatives before a transition.'],
 remedy:['அழுத்தம் ஏற்படும் பொறுப்புகளை முன்னுரிமைப்படுத்தி நடைமுறை ஆதரவை நாடலாம்.','Prioritize demanding responsibilities and seek practical support.']};
function v59TransitRow(c,z,l){
 const {w,picks,samples=[]}=z;if(!picks.length)return '';const ta=l==='ta';
 const slow=['Jupiter','Saturn','Rahu','Ketu'],rows=slow.map(pn=>{const hs=samples.map(s=>{const p=v39TransitPlanets(s.transit).find(p=>P(p.name||p.planet)===pn);return p?v39TransitHouse(c,p):null;});if(hs.some(h=>!h))return '';return `<tr><td>${esc(langPlanet(pn,l))}</td>${hs.map(h=>`<td>${h}</td>`).join('')}</tr>`;}).join('');
 const body=picks.map(x=>{const m=x.pick.m||{},s=Number(m.tSupport||0),p=Number(m.tPressure||0),event=v59OutcomeText(x,l),role=[...new Set([w.md,w.ad,w.pd])].map(n=>v59HouseRole(c,x.d,n,l)).filter(Boolean).join('; '),hits=v59TransitEvidence(c,x.d,z.tr,l),action=V70_ACTION[x.d]?.[ta?0:1]||'';
 const assessment=ta?(s>p?`${event} தொடர்பில் ஆதரவு சுட்டிகள் அதிகம்; நடைமுறை முயற்சிக்கான காலமாக ஆய்வு செய்யலாம்.`:p>s?`${event} தொடர்பில் அழுத்தச் சுட்டிகள் அதிகம்; எதிர்பார்ப்பு மற்றும் செயல்திட்டத்தை மறுமதிப்பிடுவது பொருத்தமானது.`:`${event} தொடர்பில் கலப்பு சுட்டிகள் உள்ளன; தனி நிகழ்வாக உறுதிப்படுத்தும் ஆதாரம் போதாது.`):(s>p?`Support indicators are stronger for ${event}; this can be reviewed as a period for practical effort.`:p>s?`Pressure indicators are stronger for ${event}; reassess expectations and the action plan.`:`Indicators for ${event} are mixed; they do not establish a specific event.`);
 return `<section class="smv-transit-domain"><h4>${esc(v53DomainName(x.d,l))}</h4><p>${esc(assessment)}</p><p>${esc(hits)} ${esc(role)}</p><p>${esc(action)}</p></section>`;}).join('');
 return `<div class="smv-pred-period"><b>${esc(w.start)} → ${esc(w.end)} · ${esc(dashaText(w,l))}</b><table><thead><tr><th>${ta?'மெதுவான கிரகம்':'Slow planet'}</th>${samples.map(s=>`<th>${esc(s.date)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${body}</div>`;
}
function v59SpecificProfile(c,data,d,l,payload){
 const ranked=(V49_EVENTS[d]||[]).map(e=>v53NatalOutcomeScore(c,data,d,e)).sort((a,b)=>b.score-a.score).filter(x=>x.score>0).slice(0,3);
 if(!ranked.length)return l==='ta'?'இந்தத் துறையில் ஒரு குறிப்பிட்ட முடிவைத் தேர்வு செய்ய போதுமான பிறப்பு ஜாதக ஆதாரம் இல்லை.':'There is not enough natal evidence to select a specific outcome in this domain.';
 const q=domains[d],lord=lords[(ls(c)+q.h-1)%12],lordH=hof(c,lord),occ=Object.keys(pm(c)).filter(n=>hof(c,n)===q.h);
 const names=ranked.map(x=>l==='ta'?x.e[3]:x.e[4]);
 if(l==='ta')return `${q.h}-ஆம் பாவத்தின் அதிபதி ${langPlanet(lord,l)} ${lordH?lordH+'-ஆம் பாவத்தில் ':''}செயல்படுகிறது${occ.length?`; ${q.h}-ஆம் பாவத்தில் ${occ.map(n=>langPlanet(n,l)).join('、')} இருப்பதும் சேர்ந்து பார்க்கப்படுகிறது`:''}. இந்த பிறப்பு அமைப்பில் அதிக மதிப்பெண் பெறும் வாழ்க்கை வெளிப்பாடுகள்: ${names.join('；')}. இவை காலம் வந்தவுடன் கட்டாயமாக நடக்கும் பட்டியல் அல்ல; தசை மற்றும் கோச்சார ஒத்திசைவு கிடைக்கும் காலங்களில்தான் நிகழ்வு-நிலைக்கு உயர்த்தப்பட வேண்டும்.`;
 return `The lord of house ${q.h}, ${langPlanet(lord,l)}, operates from house ${lordH||'—'}${occ.length?`; occupants of the focus house include ${occ.map(n=>langPlanet(n,l)).join(', ')}`:''}. The higher-scoring life-course candidates are ${names.join('; ')}. These are natal potentials, not guaranteed events; Dasha and transit timing must converge before they are promoted to event-level predictions.`;
}
function v135DomainEvidence(c,data,d,l){
 const q=domains[d], lord=lords[(ls(c)+q.h-1)%12], lordH=hof(c,lord);
 const occ=Object.keys(pm(c)).filter(n=>hof(c,n)===q.h);
 const kar=(q.kar||[]).map(pn=>v59HouseRole(c,d,pn,l)).filter(Boolean).slice(0,2);
 const varga=(q.v&&q.kar?.length)?(q.kar.map(pn=>v59DChartEvidence(data,d,pn,l)).find(Boolean)||''):'';
 if(l==='ta'){
  const bits=[`${q.h}-ஆம் பாவ அதிபதி ${langPlanet(lord,l)}${lordH?` ${lordH}-ஆம் பாவத்தில்`:''}`];
  if(occ.length)bits.push(`${q.h}-ஆம் பாவத்தில் ${occ.map(n=>langPlanet(n,l)).join('、')}`);
  if(kar.length)bits.push(kar.join('；'));
  if(varga)bits.push(varga);
  return bits.join('；')+' ஆகியவை இந்தப் பலனின் முதன்மை ஜாதக ஆதாரங்கள்.';
 }
 const bits=[`The lord of house ${q.h}, ${langPlanet(lord,l)}${lordH?`, is placed in house ${lordH}`:''}`];
 if(occ.length)bits.push(`house ${q.h} contains ${occ.map(n=>langPlanet(n,l)).join(', ')}`);
 if(kar.length)bits.push(kar.join('; '));
 if(varga)bits.push(varga);
 return bits.join('; ')+'. These are the principal chart factors used for this interpretation.';
}

// V136 — chronology-aware Reality Prediction + on-demand Online Prediction.
// Calculation/scoring remains untouched. This layer changes event interpretation only.
const V136_MIN_AGE={marriage:18,children:18,career:16,jobchange:18,business:18,finance:18,property:18,debt:18,status:16,education:5,skills:5,health:0,family:0,parents:0,siblings:0,travel:5,fortune:0,spiritual:10,turning:0,remedy:0};
function v136Birth(payload){const d=dt(payload?.date);return d&&Number.isFinite(+d)?d:null}
function v136AgeOn(payload,date){const b=v136Birth(payload),x=date instanceof Date?date:dt(date);if(!b||!x)return null;let a=x.getFullYear()-b.getFullYear();if(x.getMonth()<b.getMonth()||(x.getMonth()===b.getMonth()&&x.getDate()<b.getDate()))a--;return a}
function v136Chronology(c,d,payload){
 const now=new Date(),birth=v136Birth(payload),min=V136_MIN_AGE[d]??0;
 const start=birth?new Date(birth.getFullYear()+min,birth.getMonth(),birth.getDate()):null;
 const rows=periods(c).map(w=>({...w,a:dt(w.start),b:dt(w.end,true),score:relScore(c,w.md,d)+relScore(c,w.ad,d)+relScore(c,w.pd,d)})).filter(w=>w.a&&w.b&&(!start||w.b>=start));
 const rank=a=>a.slice().sort((x,y)=>y.score-x.score||+y.b-+x.b);
 const past=rank(rows.filter(w=>w.b<now)).slice(0,3).sort((x,y)=>x.a-y.a);
 const current=rank(rows.filter(w=>w.a<=now&&w.b>=now)).slice(0,1);
 const future=rows.filter(w=>w.a>now).sort((x,y)=>+x.a-+y.a||y.score-x.score).slice(0,4);
 return {past,current,future,start,now};
}
function v136Window(w,l){if(!w)return l==='ta'?'தனி காலம் கிடைக்கவில்லை':'No distinct window found';const age=v136AgeOn(window.__smvV136Payload||{},w.a);const per=dashaText(w,l);return `${String(w.start||'').slice(0,10)} → ${String(w.end||'').slice(0,10)}${age!=null?(l==='ta'?` (வயது ${age})`:` (age ${age})`):''} · ${per}`}
function v136Nature(c,l){const m=pm(c),lag=ls(c),moon=hof(c,'Moon'),mars=hof(c,'Mars'),sat=hof(c,'Saturn');if(l==='ta'){let a=[];a.push(['Mars','Sun'].includes(lords[lag])?'நேரடியாக முடிவு எடுத்து செயல்படும் மனப்பான்மை':'சூழலை கவனித்து முடிவு எடுக்கும் மனப்பான்மை');if([2,4,5].includes(moon))a.push('குடும்பம், நிலைத்தன்மை மற்றும் மனநிம்மதிக்கு முக்கியத்துவம்');if([1,4,7,10].includes(mars))a.push('செயலில் வேகம் மற்றும் தன் கருத்தை நிலைநிறுத்தும் தன்மை');if([1,4,7,10,12].includes(sat))a.push('பொறுப்பை உள்ளுக்குள் சுமந்து மெதுவாக முதிரும் இயல்பு');return `இந்த ஜாதக அமைப்பு ${a.join('、')} ஆகியவற்றை முன்னிறுத்துகிறது. நடைமுறையில் இவர் மரியாதை, தனிப்பட்ட இடம் மற்றும் நம்பகத்தன்மையை மதிப்பவர்; அழுத்தம் அதிகரிக்கும் போது பிடிவாதம் அல்லது உள்ளார்ந்த கவலை வெளிப்படலாம்.`}return `This chart points to a practical personality that values respect, personal space and reliability. Decision-making can be direct when conviction is strong, while pressure may show as stubbornness or private worry rather than constant outward conflict.`}
function v136LifeInterpretation(c,data,d,l,payload){
 const x=evidence(c,data,d,l),adv=smvAdvancedEvidence(c,data,d,l),sup=x.supporters.length+adv.score.support,pre=x.pressures.length+adv.score.pressure,ta=l==='ta',balance=sup>pre?'support':pre>sup?'pressure':'mixed';
 const textTA={career:'தொழிலில் வெறும் routine பணியை விட பொறுப்பு, முடிவு எடுக்கும் வாய்ப்பு, மக்கள்/வாடிக்கையாளர் தொடர்பு அல்லது அறிவைப் பயன்படுத்தும் பணி அதிக திருப்தி தரும். காலப்போக்கில் தனக்கென ஒரு professional identity உருவாக்கும் முயற்சி வலுப்படும்.',jobchange:'வேலை மாற்றம் திடீர் ஆசையால் மட்டும் அல்லாமல் பொறுப்பு, சூழல் அல்லது முன்னேற்றத் தேவையால் உருவாகும். சரியான காலத்தில் பதவி/குழு/இட மாற்றம் புதிய வளர்ச்சிக்கான கதவாக அமையலாம்.',business:'சுயதொழில் அல்லது வியாபாரம் சாத்தியமான துறையாக இருந்தாலும் கூட்டாண்மை, வாடிக்கையாளர் நம்பிக்கை மற்றும் cash-flow கட்டுப்பாடு வெற்றியை நிர்ணயிக்கும்.',finance:'வருமானம் கிடைப்பதோடு அதை நிலையான சேமிப்பாக மாற்றும் ஒழுக்கமே செல்வ வளர்ச்சியை தீர்மானிக்கும். வாய்ப்பு கிடைக்கும் காலங்களில் திட்டமிட்ட சேமிப்பு/முதலீடு அதிக பலன் தரும்.',marriage:'திருமணம் வாழ்க்கையின் முக்கிய உறவு மற்றும் பொறுப்பு மாற்றமாக அமையும் அமைப்பு உள்ளது. துணைவருடன் communication, பரஸ்பர மரியாதை மற்றும் எதிர்பார்ப்புகளை தெளிவாகப் பகிர்வது திருமணத் தரத்தை நிர்ணயிக்கும்; ஒரு தனி கிரக காலம் மட்டும் திருமணம் நடந்தே தீரும் என்று பொருள் கொள்ளப்படாது.',children:'குழந்தை தொடர்பான பலன் குடும்ப விரிவாக்கம் மட்டுமல்ல; திட்டமிடல், பராமரிப்பு மற்றும் பொறுப்பு அதிகரிக்கும் வாழ்க்கைக் கட்டமாக வெளிப்படும். D7 மற்றும் கால ஒத்திசைவு இல்லாமல் குறிப்பிட்ட பிறப்பு காலம் கூறப்படாது.',property:'வீடு/நிலம்/வாகனம் தொடர்பான முடிவு வசதிக்காக மட்டும் அல்லாமல் குடும்ப நிலைத்தன்மை மற்றும் நீண்டகால பாதுகாப்புடன் இணைந்து வரும். வாங்குதல் அல்லது இடமாற்றம் சரியான தசை–கோச்சார காலத்தில் வலுப்படும்.',education:'கற்றதை நடைமுறையில் பயன்படுத்தும் போது கல்வி பலன் அதிகம். தொடர்ந்த பயிற்சி அல்லது உயர்கல்வி தொழில் திசையை மாற்றும் கருவியாக அமையலாம்.',health:'உடல் சக்தியை விட வேலைச்சுமை, ஓய்வு மற்றும் தினசரி ஒழுங்கை சமநிலைப்படுத்துவது முக்கியம். இது மருத்துவ diagnosis அல்ல; உடல்நலக் கவலை இருந்தால் மருத்துவர் மதிப்பீடு அவசியம்.',family:'குடும்பத்தில் பொறுப்பை ஏற்றுக்கொள்ளும் நிலை அதிகம்; தெளிவான communication இல்லாதபோது சிறிய விஷயங்களும் மனஅழுத்தமாக மாறலாம்.',travel:'பயணம்/இடமாற்றம் அனுபவம், வேலை அல்லது புதிய வாய்ப்புகளுடன் இணைந்து வாழ்க்கை நோக்கை விரிவாக்கலாம்.',status:'மெதுவாக கிடைக்கும் நம்பிக்கை, பொறுப்பு மற்றும் தொடர்ந்து காட்டும் செயல்திறன் சமூக மதிப்பை உருவாக்கும்.',fortune:'அதிர்ஷ்டம் காத்திருப்பதை விட சரியான நேரத்தில் கிடைக்கும் வாய்ப்பு, வழிகாட்டல் மற்றும் தொடர்புகளைப் பயன்படுத்தும் போது முன்னேற்றம் அதிகம்.',spiritual:'ஆன்மிகம் வாழ்க்கையிலிருந்து விலகுதல் அல்ல; அனுபவம், சிந்தனை, வழிபாடு அல்லது தனிமையான நேரம் மூலம் உள்ளார்ந்த தெளிவு வளரக்கூடும்.',turning:'சவால்கள் பழைய நடைமுறையை மாற்றச் செய்து புதிய திசையில் மீண்டும் கட்டமைக்கும் turning point ஆக மாறலாம்.',skills:'தொடர்பு, கற்றல் மற்றும் தனிப்பட்ட முயற்சி இணையும் போது திறமை தெளிவாக வெளிப்படும்.',debt:'கடன்/போட்டி/வழக்கு போன்ற விஷயங்களில் வேகமான முடிவை விட ஆவண ஒழுங்கு, கட்டுப்பாடு மற்றும் காலத்துக்கு ஏற்ற நடவடிக்கை பாதுகாப்பானது.',parents:'பெற்றோர்/மூத்தோர் தொடர்பான பொறுப்பு வாழ்க்கை முடிவுகளில் முக்கிய இடம் பெறலாம்.',siblings:'சகோதரர்கள் அல்லது நெருங்கிய உறவுகளில் உதவி மற்றும் கருத்து வேறுபாடு இரண்டும் காலகட்டத்துக்கு ஏற்ப மாறலாம்.',remedy:'மீதமுள்ள சவாலுக்கு முதலில் நடைமுறை திருத்தம், ஒழுக்கம் மற்றும் உறவு/நிதி/வேலை சார்ந்த செயல் மாற்றமே முன்னுரிமை; பாரம்பரிய பரிகாரம் துணை வழியாக மட்டும் பார்க்கப்படுகிறது.'};
 const textEN={career:'Work is likely to feel more meaningful when it includes responsibility, decision-making, client/people contact or applied knowledge rather than only repetitive routine. A distinct professional identity can strengthen with experience.',marriage:'Marriage is treated as a major relationship and responsibility transition. Communication, mutual respect and realistic expectations matter more than any single planetary period; one Venus or seventh-house activation is never treated as proof that marriage must occur.',children:'Children-related indications are read as family expansion, care and responsibility, and are timed only after D7 and period/transit convergence.',finance:'Income growth matters most when it is converted into disciplined saving and sustainable financial decisions.',property:'Home/property indications are read as a search for stability and long-term security, with purchase or relocation promoted only when timing converges.',health:'The practical focus is balancing workload, rest and routine. This is not a medical diagnosis; health concerns require clinical evaluation.'};
 let s=ta?(textTA[d]||v39LifeSentence(c,data,d,l)):(textEN[d]||v39LifeSentence(c,data,d,l));
 if(ta){if(balance==='support')s+=' இந்தத் துறையில் ஆதரவு காரணிகள் சவால்களை விட மேலோங்குகின்றன.';else if(balance==='pressure')s+=' சவால் காரணிகள் இருப்பதால் பலன் தாமதம்/முயற்சி/திருத்தம் வழியாக வெளிப்படலாம்; இது முழுமையான மறுப்பு அல்ல.';else s+=' ஆதரவும் சவாலும் கலந்ததால் சரியான கால ஒத்திசைவு முக்கியம்.'}else{if(balance==='support')s+=' Supportive factors are stronger than pressure factors.';else if(balance==='pressure')s+=' Pressure can make the result slower or effort-dependent; it is not a denial by itself.';else s+=' Support and pressure are mixed, so timing convergence matters.'}
 return s;
}
function v136DomainEvidence(c,data,d,l){const base=v135DomainEvidence? v135DomainEvidence(c,data,d,l):v59SpecificProfile(c,data,d,l,{});const adv=smvAdvancedEvidence(c,data,d,l);return [base,adv.out.length?(l==='ta'?'SMV Advanced Analysis ஒருங்கிணைப்பு: ':'SMV Advanced Analysis synthesis: ')+adv.out.join(' '):''].filter(Boolean).join(' ')}
function v136Timing(c,d,l,payload){window.__smvV136Payload=payload;const x=v136Chronology(c,d,payload),ta=l==='ta';const past=x.past.length?v136Window(x.past.slice().sort((a,b)=>b.score-a.score)[0],l):(ta?'தெளிவான கடந்தகால window இல்லை':'No distinct past window');const cur=x.current[0]?v136Window(x.current[0],l):(ta?'தற்போதைய தனி activation இல்லை':'No distinct current activation');const fut=x.future.length?v136Window(x.future.slice().sort((a,b)=>b.score-a.score)[0],l):(ta?'அடுத்த window கிடைக்கவில்லை':'No future window available');return ta?`கடந்தகால முக்கிய செயல்பாடு: ${past}. தற்போதைய நிலை: ${cur}. அடுத்த prospective செயல்பாடு: ${fut}. இவை நிகழ்வு நடந்ததற்கான ஆதாரம் அல்ல; வயது மற்றும் வாழ்க்கை வரலாற்றுடன் சேர்த்து மட்டுமே பொருள் கொள்ள வேண்டும்.`:`Strongest past activation: ${past}. Current: ${cur}. Next prospective activation: ${fut}. These are timing activations, not proof that an event occurred, and must be read with age and life history.`}
function v136MarriagePromise(c,data,l){const e=evidence(c,data,'marriage',l),a=smvAdvancedEvidence(c,data,'marriage',l),score=e.supporters.length+a.score.support-e.pressures.length-a.score.pressure+(e.occupants.length?1:0);if(l==='ta')return score>=1?'திருமண வாக்குறுதி: ஆதரவு காரணிகள் காணப்படுகின்றன; ஒரு தனி placement அடிப்படையில் திருமண மறுப்பு கூறப்படவில்லை.':score<=-2?'திருமண வாக்குறுதி: தாமதம்/உறவு அழுத்தம் தரும் காரணிகள் வலுவாக உள்ளன; இருந்தாலும் இதை முழுமையான திருமண மறுப்பாக எடுத்துக்கொள்ள முடியாது.':'திருமண வாக்குறுதி: ஆதரவும் சவாலும் கலந்த அமைப்பு; D9 மற்றும் கால ஒத்திசைவு முக்கியம்.';return score>=1?'Marriage promise: supportive factors are present; no denial is inferred from a single placement.':score<=-2?'Marriage promise: delay/relationship-pressure factors are strong, but this is not treated as absolute denial.':'Marriage promise: mixed support and pressure; D9 and timing convergence are important.'}
function v136RenderDomain(c,data,d,l,payload){const ta=l==='ta',nowAI=v42AgeInfo(payload,new Date());return `<section class="smv-pred-domain smv-v135-evidence"><h4>${esc(v42DynamicHeading(d,l,nowAI,payload))}</h4><div class="smv-v135-reason-row"><b>${ta?'ஆதாரம்':'Evidence'}</b><p>${esc(v136DomainEvidence(c,data,d,l))}</p></div><div class="smv-v135-reason-row"><b>${ta?'காலச் சுட்டி':'Timing'}</b><p>${esc(v136Timing(c,d,l,payload))}</p></div><div class="smv-v135-reason-row"><b>${ta?'வாழ்க்கைப் பலன்':'Reality prediction'}</b><p>${esc((d==='marriage'?v136MarriagePromise(c,data,l)+' ':'')+v136LifeInterpretation(c,data,d,l,payload))}</p></div></section>`}
const V136_Q={marriage:['திருமணம் எப்போது?','When will I get married?'],career:['வேலை / தொழில் முன்னேற்றம் எப்போது?','When will my career improve?'],jobchange:['வேலை மாற்றம் எப்போது?','When is a job change likely?'],children:['குழந்தை பாக்கியம் எப்போது?','When is a children-related period?'],property:['சொத்து / வீடு வாங்கும் காலம்?','When is a property/home period?'],finance:['பணம் எப்போது மேம்படும்?','When can finances improve?'],family:['திருமண வாழ்க்கை எப்படி இருக்கும்?','How is married/family life?'],remedy:['எனக்கு என்ன தோஷம் / மீதமுள்ள அழுத்தம்?','What dosha or residual pressure is shown?']};
function v136OnlineAnswer(c,data,d,l,payload){const ta=l==='ta',x=v136Chronology(c,d,payload);window.__smvV136Payload=payload;const bestPast=x.past.slice().sort((a,b)=>b.score-a.score)[0],bestFuture=x.future.slice().sort((a,b)=>b.score-a.score)[0];let out=[];if(d==='marriage')out.push(v136MarriagePromise(c,data,l));out.push(v136LifeInterpretation(c,data,d,l,payload));if(bestPast)out.push((ta?'கடந்தகால முக்கிய activation: ':'Strongest past activation: ')+v136Window(bestPast,l)+'.');if(bestFuture){if(d==='marriage')out.push(ta?`திருமண நிலை குறிப்பிடப்படவில்லை. திருமணம் ஆகாதவராக இருந்தால் அடுத்த prospective window: ${v136Window(bestFuture,l)}. ஏற்கனவே திருமணம் ஆனவராக இருந்தால் இதை புதிய திருமணம் என்று எடுத்துக்கொள்ளாமல் spouse/relationship தொடர்பான முக்கிய காலமாக ஆய்வு செய்ய வேண்டும்.`:`Marital status is not assumed. If unmarried, the next prospective window is ${v136Window(bestFuture,l)}. If already married, this is not labelled another marriage; it is reviewed as a spouse/relationship period.`);else out.push((ta?'அடுத்த prospective window: ':'Next prospective window: ')+v136Window(bestFuture,l)+'.');}out.push(ta?'குறிப்பு: இது ஜோதிட காலச் சுட்டி; நிகழ்வு உறுதி அல்ல.':'Note: this is an astrological timing indication, not a guaranteed event.');return out.join(' ')}
function v136OnlineUI(c,data,l,payload){const ta=l==='ta',opts=Object.entries(V136_Q).map(([k,v])=>`<option value="${k}">${esc(v[ta?0:1])}</option>`).join('');return `<section class="smv-v136-online"><h3>🌐 ${ta?'ஆன்லைன் பலன்கள்':'Online Prediction'}</h3><p class="small">${ta?'கேள்விக்கு தேவையான prediction domain மட்டும் on-demand ஆக ஆய்வு செய்யப்படும்.':'Only the prediction domain needed for the selected question is analysed on demand.'}</p><select data-v136-q>${opts}</select><button type="button" data-v136-go>${ta?'பலன் காண்க':'Show prediction'}</button><div data-v136-answer></div></section>`}
function v136BindOnline(root,c,data,l,payload){const box=root.querySelector('.smv-v136-online');if(!box)return;box.querySelector('[data-v136-go]')?.addEventListener('click',()=>{const d=box.querySelector('[data-v136-q]')?.value||'marriage',a=box.querySelector('[data-v136-answer]');if(!a)return;a.innerHTML=`<div class="smv-v135-reason-row"><b>${l==='ta'?'பதில்':'Answer'}</b><p>${esc(v136OnlineAnswer(c,data,d,l,payload))}</p></div><details><summary>${l==='ta'?'ஆதாரம் பார்க்க':'View evidence'}</summary><p>${esc(v136DomainEvidence(c,data,d,l))}</p></details>`;});}
async function renderV59(ev){
 const {full,payload,lang='en',rootId}=ev.detail||{},root=document.getElementById(rootId);if(!root||!full?.chart)return;
 const x=root.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');if(!x)return;const c=full.chart;window.__smvV138Full=full;
 let html=`<div class="adv-section"><h3>🔭 ${lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${lang==='ta'?'SMV Basic + Advanced Analysis-ல் ஏற்கனவே கணக்கிடப்பட்ட பாவம்–பாவாதிபதி, dignity/strength, கிரக/ராசி பார்வை, அர்கலா–விரோதார்கலா, அஷ்டகவர்க்கம், கிரக உறவுகள் மற்றும் D7/D9/D10 ஆதாரங்கள் மீண்டும் கணக்கிடாமல் இங்கு synthesis செய்யப்படுகின்றன. தாஜக, சஹம்கள், சர்வதோபத்ர மற்றும் சுதர்சன சக்கரங்கள் இப்போது பிறப்பு வாக்குறுதியை மாற்றாமல் timing/transit confirmation layer ஆக பயன்படுத்தப்படுகின்றன.':'Existing SMV Basic + Advanced Analysis outputs—house/lord, dignity/strength, Graha/Rasi Drishti, Argala/Virodhargala, Ashtakavarga, planet relations and D7/D9/D10—are synthesised here without recalculating them. Tajaka, Sahams, Sarvatobhadra and Sudarshana are now used as timing/transit confirmation layers without overriding natal promise.'}</p>`;
 for(const d of V53_ORDER){try{html+=v136RenderDomain(c,full,d,lang,payload);}catch(err){console.warn('V59 domain skipped',d,err);}}
 html+=v136OnlineUI(c,full,lang,payload);
 html+=`<div class="smv-v61-detail-tools"><details class="smv-v61-sub" data-smv-v61-kind="dasha"><summary><b>${lang==='ta'?'1. விரிவான தசா–புக்தி பலன்கள் — அடுத்த 15 ஆண்டுகள்':'1. Detailed Dasha–Bhukti Results — Next 15 Years'}</b></summary><div class="smv-v61-sub-body" data-smv-v61-body="dasha"></div></details><details class="smv-v61-sub" data-smv-v61-kind="transit"><summary><b>${lang==='ta'?'2. விரிவான கோச்சார பலன்கள் — அடுத்த 15 ஆண்டுகள்':'2. Detailed Transit Results — Next 15 Years'}</b></summary><div class="smv-v61-sub-body" data-smv-v61-body="transit"></div></details></div></div>`;
 x.innerHTML=html;
 v136BindOnline(x,c,full,lang,payload);
 if(!root.querySelector('#smv-v135-prediction-style')){const st=document.createElement('style');st.id='smv-v135-prediction-style';st.textContent='.smv-v135-evidence .smv-v135-reason-row{margin:10px 0;padding:10px 12px;border-left:3px solid currentColor;background:rgba(255,255,255,.55);border-radius:6px}.smv-v135-evidence .smv-v135-reason-row>b{display:block;margin-bottom:4px}.smv-v135-evidence .smv-v135-reason-row p{margin:0;line-height:1.65}.smv-v136-online{margin:18px 0;padding:14px;border:1px solid currentColor;border-radius:10px}.smv-v136-online select,.smv-v136-online button{width:100%;margin:6px 0;padding:11px;font:inherit}.smv-v136-online [data-v136-answer]{margin-top:10px}';root.appendChild(st);}
 const context=document.createElement('p');context.className='small';context.textContent=lang==='ta'?'ஆய்வு வரம்பு: அடுத்த 15 ஆண்டுகள். தேதியிட்ட மூன்று கோச்சார மாதிரிகள் லக்னத்திலிருந்து பாவங்களைக் காட்டுகின்றன; இடைப்பட்ட பெயர்ச்சி நேரங்களை இவை குறிக்கவில்லை. விரைவாக நகரும் கிரகங்கள் நடுப்பகுதி தேதிக்கே பொருந்தும். வயது, பிறந்த இடம் மற்றும் நேர வேறுபாடு பயன்படுத்தப்படுகின்றன; வாழும் நாடு, தொழில் அல்லது குடும்ப நிலை ஊகிக்கப்படவில்லை.':'Scope: the next 15 years. Three dated transit samples show houses from the natal ascendant; these are not exact ingress times. Fast-moving planets apply to the midpoint date only. Age, birth coordinates and UTC offset are used; current residence, occupation and family circumstances are not inferred.';x.prepend(context);
 // Remove old standalone XI/XII from V58/V59. Main Advanced Analysis remains exactly I–X.
 root.querySelectorAll('.smv-advanced-part.detailed-dasha-predictions,.smv-advanced-part.detailed-transit-predictions').forEach(n=>n.remove());
 let rowsPromise=null;
 // V98 recovery rule: only a successful 15-year calculation may remain cached.
 // A temporary network/WASM/module failure must not poison the current page.
 // Closing/reopening the detail, or refreshing/reopening the entitled horoscope,
 // must start a fresh calculation without requiring another payment.
 const getRows=async(onRow)=>{
  if(rowsPromise){
   try{const rows=await rowsPromise;if(onRow)for(const z of rows){onRow(z);await v58Yield();}return rows;}
   catch(err){rowsPromise=null;throw err;}
  }
  rowsPromise=(async()=>v58PeriodRows(c,full,lang,payload,full,z=>{if(onRow)onRow(z);}))();
  try{return await rowsPromise;}catch(err){rowsPromise=null;throw err;}
 };
 const dasha=x.querySelector('[data-smv-v61-kind="dasha"]'), transit=x.querySelector('[data-smv-v61-kind="transit"]');
 const loaders=new Map();
 const bind=(el,kind,runner)=>{
  if(!el)return;let pending=null;
  const load=async()=>{if(el.dataset.loaded==='1')return;if(pending)return pending;const body=el.querySelector(`[data-smv-v61-body="${kind}"]`);v58Loading(body,lang,kind);el.dataset.loading='1';pending=(async()=>{await runner(body);body.querySelector('.adv-section > p.small')?.remove();el.dataset.loaded='1';})().finally(()=>{delete el.dataset.loading;pending=null;});return pending;};
  loaders.set(kind,load);el.addEventListener('toggle',()=>{if(el.open)load().catch(e=>{console.warn('Detailed report failed',e);const body=el.querySelector(`[data-smv-v61-body="${kind}"]`);const reason=String(e?.message||e||'').replace(/^Detailed period\s+/,'').trim();body.textContent=(lang==='ta'?'கணக்கீடு நிறைவடையவில்லை. மீண்டும் திறந்து முயற்சிக்கவும்.':'Calculation did not finish. Reopen to retry.')+(reason?' ['+reason+']':'');});});
 };
 bind(dasha,'dasha',async body=>{const box=body.querySelector('.smv-v58-progress');const rows=await getRows();for(const z of rows){box.insertAdjacentHTML('beforeend',v59DashaRow(c,full,z,lang,payload));await v58Yield();}if(!box.innerHTML)box.innerHTML=`<p>${lang==='ta'?'கிடைத்த தரவில் தனி தசா செயல்பாடு தேர்வு செய்யப்படவில்லை.':'No distinct dasha activation was selected from the available data.'}</p>`;});
 bind(transit,'transit',async body=>{const box=body.querySelector('.smv-v58-progress');const rows=await getRows();for(const z of rows){box.insertAdjacentHTML('beforeend',v59TransitRow(c,z,lang));await v58Yield();}if(!box.innerHTML)box.innerHTML=`<p>${lang==='ta'?'தனியான கோச்சார உறுதிப்படுத்தல் தேர்வு செய்யப்படவில்லை.':'No separate transit confirmation was selected.'}</p>`;});
 const report=root.closest('#englishHoroscopeResult,#tamilHoroscopeResult');
 if(report)report.__smvPrepareReport=async()=>{await loaders.get('dasha')?.();await loaders.get('transit')?.();};

}

window.addEventListener('smv:horoscope-full-ready',ev=>{
  // V56 ROOT FIX: the full-ready event is dispatched before horoscope-form.js
  // performs its strict 10-section acceptance check. V55 inserted XI/XII synchronously
  // inside this event listener, temporarily changing the count from 10 to 12 and making
  // the otherwise-complete horoscope fail at the top level. Defer every prediction DOM
  // mutation to the next task, after the main horoscope promise and 10-section gate finish.
  const detail=ev.detail||{};
  window.__smvPredictionRenderPromise=new Promise(resolve=>{
    setTimeout(()=>{
      Promise.resolve(renderV59({detail})).catch(err=>{
        console.error('Integrated predictions failed:',err);
        const d=detail, root=document.getElementById(d.rootId);
        const target=root?.querySelector('.smv-advanced-part.integrated-predictions .smv-advanced-part-content');
        if(target) target.innerHTML=`<div class="adv-section"><h3>🔭 ${d.lang==='ta'?'ஒருங்கிணைந்த முழு வாழ்க்கைப் பலன்கள்':'Integrated Full-Life Predictions'}</h3><p class="small">${d.lang==='ta'?'ஒரு துணைப் பலன் கணக்கீட்டில் பிழை ஏற்பட்டது. மற்ற ஜாதகக் கணக்கீடுகள் பாதிக்கப்படவில்லை.':'One prediction subsection could not be calculated. The rest of the horoscope remains unaffected.'}</p></div>`;
        return null;
      }).then(resolve);
    },0);
  });
});
})();
