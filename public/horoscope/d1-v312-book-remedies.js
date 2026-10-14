/* Optional, sourced devotional practices. No purchases, fasting, cures or event promises. */
(function(g,f){const a=f();g.SMVBookRemediesV312=a;if(typeof module==='object'&&module.exports)module.exports=a;})(typeof window==='object'?window:globalThis,function(){'use strict';
const T={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const H=['சொந்த முடிவுகள்','குடும்பப் பணமும் பேச்சும்','முயற்சியும் பயிற்சியும்','வீடும் குடும்ப ஆதரவும்','கல்வியும் படைப்பாற்றலும்','வேலைப் பழக்கமும் போட்டியும்','கூட்டு உடன்பாடுகள்','பகிர்ந்த சொத்தும் பாதுகாப்பும்','பெரியோர் வழிகாட்டலும் மேற்படிப்பும்','தொழிலும் பொறுப்புகளும்','வருமானமும் நட்பு வட்டமும்','செலவுகளும் ஓய்வும்'];
const A={Sun:[377,'ஞாயிற்றுக்கிழமை சிவ வழிபாடு அல்லது ஆதித்ய ஹிருதயப் பாராயணத்தை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் கோதுமை உணவு உதவி செய்யலாம்','Optional Sunday Shiva devotion or Aditya Hridayam, and feasible wheat-food charity'],
Moon:[377,'திங்கட்கிழமை கௌரி அல்லது அன்னபூரணி வழிபாட்டை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் அரிசி உணவு உதவி செய்யலாம்','Optional Monday Gauri or Annapurna devotion and feasible rice-food charity'],
Mars:[378,'செவ்வாய்க்கிழமை முருகன் அல்லது சிவ வழிபாட்டை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் சிவப்பு மசூர் பருப்பு உணவு உதவி செய்யலாம்','Optional Tuesday Murugan or Shiva devotion and feasible red-lentil food charity'],
Mercury:[378,'புதன்கிழமை விஷ்ணு வழிபாட்டை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் உளுந்து உணவு உதவி செய்யலாம்','Optional Wednesday Vishnu devotion and feasible urad-food charity'],
Jupiter:[379,'வியாழக்கிழமை சிவ வழிபாடு அல்லது பழக்கமான ருத்ரப் பாராயணத்தை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் மஞ்சள் அல்லது சர்க்கரை உதவி செய்யலாம்','Optional Thursday Shiva devotion or familiar Rudram recitation, and feasible turmeric or sugar charity'],
Venus:[379,'வெள்ளிக்கிழமை அம்மன் வழிபாடு அல்லது பழக்கமான ஸ்ரீ சூக்தப் பாராயணத்தை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; தேவையுள்ளவருக்கு ஆடை உதவி செய்யலாம்','Optional Friday Devi devotion or familiar Sri Sukta recitation, and feasible clothing charity'],
Saturn:[380,'சனிக்கிழமை அனுமன் வழிபாட்டை விருப்பத்திற்கேற்ப தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் எள் உணவு உதவி செய்யலாம்','Optional Saturday Hanuman devotion and feasible sesame-food charity'],
Rahu:[380,'சனிக்கிழமை பைரவர், சிவன் அல்லது துர்க்கை வழிபாட்டில் விருப்பமான ஒன்றைத் தேர்ந்தெடுக்கலாம்; இயன்ற அளவில் உளுந்து அல்லது தேங்காய் உணவு உதவி செய்யலாம்','Optional Saturday Bhairava, Shiva or Durga devotion and feasible urad or coconut food charity'],
Ketu:[381,'விருப்பமிருந்தால் விநாயகர் வழிபாட்டை எளிய குடும்பப் பிரார்த்தனையாக மேற்கொள்ளலாம்','Optional Ganesh devotion as a simple family prayer']};
const hashes={lakshmi:'afa26860de5a2e8e9cc359098bb6627fc9bf9242e54df9a0c9d8b4fb80a558fa',remedies:'86b83fa88563be99d3fe3d62be195447cda74e770df6e8879518eb9690c7e8a3'};
const ref=(bookId,pdfPages)=>({bookId,pdfPages:pdfPages.slice(),sha256:hashes[bookId],verification:'text-reviewed'});
const copy=x=>Array.isArray(x)?x.map(copy):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copy(v)])):x;
function valid(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number),leap=y%4===0&&(y%100!==0||y%400===0);return y>0&&m>0&&m<13&&d>0&&d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];}
function select(c,d1,periodRows=[],lang='ta',used=new Set(),context={}){
 if(!c||!Number.isInteger(c.house)||c.house<1||c.house>12)return [];
 const d=d1||{},h=(d.houses||[]).find(x=>x?.no===c.house),out=[],seen=new Set(used||[]),eligible=[];
 const related=(k,rel)=>{const p=d.planets?.[k];if(!h||!p||!Number.isInteger(p.house)||p.house<1||p.house>12)return false;
 return rel==='lord'?h.lord===k:rel==='occupies'?p.house===c.house:rel==='aspects'?Array.isArray(h.aspects)&&h.aspects.includes(k):h.lord===k||p.house===c.house||Array.isArray(h.aspects)&&h.aspects.includes(k);};
 for(const r of c.negative||[])if(r&&Number.isFinite(r.delta)&&r.delta<0&&related(r.planet,r.relation))eligible.push({planet:r.planet,basis:'natal',relation:r.relation,period:null});
 for(const raw of Array.isArray(periodRows)?periodRows:[]){const p=raw?.period||raw;if(!p||!valid(p.from)||!valid(p.to)||p.from>=p.to||!T[p.md]||!T[p.ad])continue;
  if(context.at!==undefined&&(!valid(context.at)||context.at<p.from||context.at>=p.to))continue;
  for(const k of [...new Set([p.md,p.ad])])if(related(k))eligible.push({planet:k,basis:'period',period:copy(p)});
 }
 for(const e of eligible){if(out.length>=2)break;const k=e.planet,a=A[k],key='book-remedy:'+k;if(!a||seen.has(key)||context.allowTraditions===false)continue;
  const age=e.period?.age,child=typeof age==='number'&&Number.isFinite(age)&&age>=0?age<18:!!c.ageUnder18;
  const time=e.period?(lang==='en'?' During '+e.period.from+' until the start of '+e.period.to+'.':' '+e.period.from+' முதல் '+e.period.to+' தொடங்கும் வரை செயல்படும் தசை–புக்தியுடன் இந்த வழக்கம் தொடர்புடையது.'):'';
  const text=child?(lang==='en'?'If the family wishes, choose a short familiar prayer with a caregiver.':'குடும்பத்தினருக்கு விருப்பமிருந்தால் பெரியோருடன் சேர்ந்து பழக்கமான ஒரு சிறிய பிரார்த்தனையைத் தேர்ந்தெடுக்கலாம்.'):(lang==='en'?k+': '+a[2]+'.':T[k]+' தொடர்பில் '+H[c.house-1]+' சார்ந்த மனப்பக்குவத்திற்கு '+a[1]+'.');
  out.push({planet:k,house:c.house,text:text+time,kind:'book-optional',optional:true,dedupKey:key,period:copy(e.period),relevance:{...copy(e),ageUnder18:child},sourceRefs:child?[ref('remedies',[11])]:[ref('lakshmi',[a[0]]),ref('remedies',[11])]});seen.add(key);
 }
 if(context.includeReflection===true&&eligible.length&&out.length<2&&!seen.has('book-remedy:attention'))out.push({house:c.house,text:lang==='en'?'If useful, spend a few quiet minutes with unforced natural breathing or a familiar prayer, returning attention gently.':'விருப்பமிருந்தால் சில நிமிடங்கள் அமைதியாக அமர்ந்து இயல்பான சுவாசத்தையோ பழக்கமான பிரார்த்தனையையோ கவனிக்கலாம்; மனம் விலகும்போது மெதுவாக மீண்டும் கவனத்தைத் திருப்பலாம்.',kind:'book-optional',optional:true,dedupKey:'book-remedy:attention',sourceRefs:[ref('remedies',[258,261,262])]});
 return out;
}
return Object.freeze({select});});
