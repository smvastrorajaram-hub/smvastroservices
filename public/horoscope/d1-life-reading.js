/* SMV ASTRO — D1 life interpretation, source-clean narrative edition.
   Every topic examines all 12 houses; only evidenced links become prose.
   Belief-based traditional interpretations, not verifiable personality diagnoses.
   No remote service, cache mutation, or chart recalculation. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVLifePredictionD1=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const REL=(typeof module==='object'&&module.exports)?require('./d1-relationships.js'):globalThis.SMVD1Relationships;
 const KARA=(typeof module==='object'&&module.exports)?require('./d1-karaka-functional.js'):globalThis.SMVD1KarakaFunctional;
 const DERIVED=(typeof module==='object'&&module.exports)?require('./d1-derived-matters.js'):globalThis.SMVD1DerivedMatters;
 if(!DERIVED||typeof DERIVED.forFocus!=='function')throw Error('Load d1-derived-matters.js before d1-life-reading.js');
 if(!REL||typeof REL.analyze!=='function')throw Error('Load d1-relationships.js before d1-life-reading.js');
 const SIGNS_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const PN=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 const TA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const ALIASES={};for(const [en,ta] of Object.entries(TA)){ALIASES[en.toLowerCase()]=en;ALIASES[ta]=en;}
 Object.assign(ALIASES,{surya:'Sun',chandra:'Moon',kuja:'Mars',mangal:'Mars',budha:'Mercury',guru:'Jupiter',brihaspati:'Jupiter',shukra:'Venus',sukra:'Venus',shani:'Saturn',sani:'Saturn',rahu:'Rahu',ketu:'Ketu'});
 const EXALTED={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const DEBILITATED={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
 const OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 const DRISHTI={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const THEMES=[
 ['ஜாதகரின் குணநலன்கள்','Character and personality'],
 ['குடும்பம், பேச்சு, சேமிப்பு மற்றும் பொருளாதார அணுகுமுறை','Family, speech and financial habits'],
 ['முயற்சி, துணிவு, திறமை மற்றும் சகோதர உறவுகள்','Initiative, skills and siblings'],
 ['வீடு, தாயார், மனநிம்மதி மற்றும் சொத்து','Home, mother, peace and property'],
 ['அறிவுத்திறன், கல்வி, சிந்தனை மற்றும் குழந்தைகள்','Learning, thinking and children'],
 ['அன்றாட வேலை, போட்டி, கடன் மற்றும் உடல்நல ஒழுங்கு','Daily work, competition and wellbeing'],
 ['திருமண வாழ்க்கை, துணைவர் மற்றும் கூட்டுறவு','Marriage and partnerships'],
 ['திடீர் மாற்றங்கள், மறைமுக விஷயங்கள் மற்றும் சவால்','Change, resilience and confidential matters'],
 ['தந்தை, வழிகாட்டுதல், நம்பிக்கை மற்றும் தர்மம்','Elders, mentoring and principles'],
 ['தொழில், பொறுப்பு, அதிகாரம் மற்றும் சமூக நிலை','Career, duties and reputation'],
 ['வருமானம், ஆதாயங்கள், நண்பர்கள் மற்றும் இலக்குகள்','Income, friends and aims'],
 ['செலவுகள், ஓய்வு, தனிமை மற்றும் உள்மன வாழ்க்கை','Expenses, rest and private life']];
 // Each topic has its own lived consequence. Conditional use depends on measured D1 contacts.
 // V286 removes stock DOMAINS phrases that caused identical outputs.
 // V287: removed static cross-house prose matrix; two-pass rendering does not use it.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function signIndex(v){if(Number.isInteger(v)&&v>=0&&v<12)return v;if(typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<360)return Math.floor(v/30);const s=String(v??'').trim();const ta=SIGNS_TA.indexOf(s),en=SIGNS_EN.findIndex(x=>x.toLowerCase()===s.toLowerCase());return ta>=0?ta:en;}
 function planetName(v){return ALIASES[String(v??'').trim()]||ALIASES[String(v??'').trim().toLowerCase()]||null;}
 function dignity(p){const n=p.key,s=p.sign;if(n==='Rahu'||n==='Ketu')return 'neutral';if(EXALTED[n]===s)return 'exalted';if(DEBILITATED[n]===s)return 'debilitated';if((OWNS[n]||[]).includes(s))return 'own';return 'neutral';}
 function toD1(chart){const source=chart?.chart&&chart.chart.lagna?chart.chart:chart;const lagna=signIndex(source?.lagna?.rasi??source?.lagna?.longitude);if(lagna<0)throw Error('D1 Lagna is required; no default sign.');const planets={};for(const p of source?.planets||[]){const key=planetName(p?.name||p?.planet);if(!key)continue;const sign=signIndex(p?.rasi??p?.longitude);if(sign<0)continue;planets[key]={key,sign,longitude:(Number.isFinite(Number(p?.longitude))&&p?.longitude!==null&&p?.longitude!==''&&Math.floor((((Number(p.longitude)%360)+360)%360)/30)===sign)?(((Number(p.longitude)%360)+360)%360):null,house:(sign-lagna+12)%12+1,retrograde:Boolean(p?.strength?.retrograde||p?.retrograde),combust:Boolean(p?.strength?.combustion),dignity:null};}
  if(Object.keys(TA).some(x=>!planets[x]))throw Error('Nine valid D1 planetary signs required.');const houses=Array.from({length:12},(_,i)=>({no:i+1,sign:(lagna+i)%12,lord:PN[(lagna+i)%12],occupants:[],aspects:[]}));for(const p of Object.values(planets)){p.dignity=dignity(p);houses[p.house-1].occupants.push(p.key);for(const step of DRISHTI[p.key]||[]){houses[(p.house+step-2)%12].aspects.push(p.key);}}for(const h of houses){h.aspects=[...new Set(h.aspects)];h.occupants=[...new Set(h.occupants)];}return {lagna,planets,houses};}
 function scorePlanet(d,p){if(!p)return 0;let n={exalted:3,own:2,neutral:0,debilitated:-3}[p.dignity]||0;if(p.combust&&p.key!=='Sun')n--;for(const k of d.houses[p.house-1].aspects){if(['Jupiter','Venus'].includes(k))n++;if(['Saturn','Mars'].includes(k))n--;}return Math.max(-4,Math.min(4,n));}
 function houseScore(d,h){let n=scorePlanet(d,d.planets[h.lord]);for(const k of h.occupants){if(['Jupiter','Venus','Mercury'].includes(k))n++;if(['Saturn','Mars','Rahu','Ketu'].includes(k))n--;}for(const k of h.aspects){if(['Jupiter','Venus'].includes(k))n++;if(['Saturn','Mars'].includes(k))n--;}return Math.max(-4,Math.min(4,n));}
 function links(d,focus,other){const f=d.houses[focus-1],o=d.houses[other-1],fp=d.planets[f.lord],op=d.planets[o.lord],out=[];if(fp.house===other)out.push('focus-lord-in-related');if(op.house===focus)out.push('related-lord-in-focus');if(fp.house===op.house&&f.lord!==o.lord)out.push('lords-conjunct');if(o.aspects.includes(f.lord))out.push('focus-lord-aspects-related');if(f.aspects.includes(o.lord))out.push('related-lord-aspects-focus');if(o.occupants.some(k=>f.occupants.includes(k)))out.push('common-occupant');if(fp.house===other&&op.house===focus)out.push('mutual-exchange');return [...new Set(out)];}
 function dominant(d,focus,other){const f=d.houses[focus-1],o=d.houses[other-1];const a=[f.lord,...f.occupants,...o.occupants,...o.aspects,o.lord];return [...new Set(a)].sort((x,y)=>Math.abs(scorePlanet(d,d.planets[y]))-Math.abs(scorePlanet(d,d.planets[x]))||a.indexOf(x)-a.indexOf(y))[0];}
 function lens(d,focus,related){const f=d.houses[focus-1],h=d.houses[related-1],rel=links(d,focus,related),p=dominant(d,focus,related);const score=houseScore(d,h)+Math.round(scorePlanet(d,d.planets[f.lord])/2);const relevance=(related===focus?7:0)+rel.length*3+(d.planets[f.lord].house===related?4:0)+(h.occupants.length?1:0)+(h.aspects.includes(f.lord)?2:0);return {focusHouse:focus,relatedHouse:related,focusLord:f.lord,focusLordHouse:d.planets[f.lord].house,relatedLord:h.lord,occupants:h.occupants,aspects:h.aspects,links:rel,planet:p,score,relevance};}
 // User-provided context only: geography must not be used to infer character, caste, income or status.
 function sanitizeContext(c){return {currentWork:String(c?.currentWork||'').trim().slice(0,120),maritalStatus:String(c?.maritalStatus||'').trim().slice(0,80),currentResidence:String(c?.currentResidence||'').trim().slice(0,120),birthPlace:String(c?.birthPlace||'').trim().slice(0,120)};}
 function situation(topic,ctx,ta){if(!ctx)return '';const t=String(ctx.currentWork||'').toLowerCase(),m=String(ctx.maritalStatus||'').toLowerCase();if(topic===10&&t){const student=/student|studying|படிப்பு|மாணவ|கல்வி/.test(t),retired=/retired|pension|ஓய்வு/.test(t),business=/business|self.employed|வியாபாரம்|தொழில்முனை/.test(t);return ta?(student?'நீங்கள் தற்போது படிப்பில் இருப்பதாகத் தெரிவித்துள்ளதால் இதை வேலை உயர்வாக அல்ல, கற்றல் மற்றும் பயிற்சித் திறனாகப் பார்க்க வேண்டும்.':retired?'நீங்கள் ஓய்வுபெற்றிருப்பதாகத் தெரிவித்துள்ளதால் புதிய பதவியை அல்ல, அனுபவப் பகிர்வையும் அன்றாட ஒழுங்கையும் மையமாக்க வேண்டும்.':business?'நீங்கள் சொந்தத் தொழில் செய்வதாகத் தெரிவித்துள்ளதால் இத்தொடர்பு வாடிக்கையாளர், முடிவு மற்றும் பொறுப்புப் பகிர்வில் பார்க்கப்படுகிறது.':'நீங்கள் தெரிவித்த தற்போதைய பணிச்சூழலுடன் இந்த இயல்பை ஒப்பிட்டுப் பார்ப்பது பொருத்தமானது.'):(student?'As you report studying, read this as learning and training, not a job promotion.':retired?'As you report retirement, apply this to mentoring and daily routines rather than new posts.':business?'As you report self-employment, apply this to clients, decisions and shared duties.':'Relate this tendency to the current work situation you described.');}
  if(topic===7&&m){const single=/unmarried|single|திருமணமாகவில்லை|மணமாகாத/.test(m);const married=/married|திருமணமான|திருமணம் ஆன/.test(m);if(single)return ta?'நீங்கள் திருமணமாகவில்லை என்று தெரிவித்துள்ளதால் இப்பலனை இப்போதுள்ள நெருங்கிய உறவுகளிலும் எதிர்காலத் துணைத் தேர்விலும் பொருத்திப் பார்க்கலாம்.':'As you report being unmarried, consider close relationships and future partner preferences, not an existing spouse.';if(married)return ta?'நீங்கள் திருமணமானவர் என்று தெரிவித்துள்ளதால் இப்பலன் நடைமுறையில் பொறுப்புகளைப் பகிர்வதிலும் கருத்துப் பரிமாற்றத்திலும் பார்க்கப்படுகிறது.':'As you report being married, interpret this through current communication and shared responsibilities.';}
  if(topic===4&&ctx.currentResidence&&ctx.birthPlace&&ctx.currentResidence.trim().toLowerCase()!==ctx.birthPlace.trim().toLowerCase())return ta?'தற்போதைய வசிப்பிடம் பிறப்பிடத்திலிருந்து வேறுபடுவதாக நீங்கள் தெரிவித்துள்ளீர்கள்; குடும்பத் தொடர்பு, பயணம் மற்றும் தனிப்பட்ட நேரத்தை அதன் நடைமுறைச் சூழலுடன் இணைத்துப் பார்க்கலாம்.':'You report living somewhere other than your birthplace; interpret home ties and travel within that practical setting.';return '';}
 // V286: an identical stock personality paragraph was rendered for completely
 // different charts whenever houseScore fell in the neutral band.  No stock
 // personality statement may be the first or sole evidence of a D1 forecast.
 // All statements below are conditional on the actual natal ruler/house/aspects.
 // V287: removed unused generic planet/house prose; the compiler now emits lived outcomes.
 // V271: narrative assembly is based on the most relevant *distinct* natal
 // connections. D1 facts never become an unsupported factual diagnosis.
 // Narrative V287: retain the trusted natal normalizer, but render prose from a
 // two-pass compiler rather than the 144 stock cross-house sentences.
 function render(chart,lang='ta',context={}){
   const n=(typeof globalThis!=='undefined'&&globalThis.SMVD1HumanNarrative)
     ||((typeof module==='object'&&module.exports)?require('./d1-dominance-narrative.js'):null);
   if(!n||typeof n.render!=='function')throw Error('D1 dominance narrative script is missing: d1-dominance-narrative.js');
   const d=toD1(chart);
   const report=n.render(d,lang,{houseScore,links,planetDignity:REL.dignity,functional:KARA.functional});
   // Technical evidence is retained as hidden metadata, never printed to readers.
   const ctx=sanitizeContext(context);
   for(const topic of report.topics){const note=situation(topic.number,ctx,lang!=='en');
     if(note)topic.paragraphs.push({house:topic.number,text:note,evidence:{source:'user-declared-context'}});
   }
   return report;
 }
 function html(chart,lang='ta',context={}){
  const rep=render(chart,lang,context),ta=rep.lang==='ta';
  const content=rep.topics.map(t=>`<section class="smv-d1-life-topic" data-d1-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph" data-d1-related-house="${p.house}">${esc(p.text)}</p>`).join('')}</section>`).join('');
  const body=(rep.physicalTopics||[]).map(t=>`<section class="smv-d1-life-topic smv-d1-body-topic" data-d1-body-topic="${t.number}"><h3>${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${esc(p.text)}</p>`).join('')}</section>`).join('');
  const medical=(rep.medicalTopics||[]).map(t=>`<section class="smv-d1-life-topic smv-d1-medical-topic" data-d1-medical-topic="${t.id}"><h3>${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${esc(p.text)}</p>`).join('')}</section>`).join('');
  return `<section class="smv-d1-life-reading" data-smv-d1-life="1" lang="${rep.lang}"><h2>${ta?'I. ஜாதகரின் முழு வாழ்க்கை பலன்கள்':'I. Complete Life Predictions'}</h2>${content}<section class="smv-d1-body-reading"><h2>${ta?'உடல் காரகத்துவ அமைப்பின் பாரம்பரியப் பலன்கள்':'Traditional Physical Significations'}</h2>${body}</section><section class="smv-d1-medical-reading"><h2>${ta?'பாரம்பரிய மருத்துவ ஜோதிடக் காரகத்துவங்கள்':'Traditional Medical Astrology Associations'}</h2><p class="smv-d1-life-paragraph">${ta?'இவை உடல் உறுப்புகள் நன்றாக இயங்குகின்றனவா அல்லது எந்த நோய் வருமா என்று கண்டறியும் மருத்துவச் சோதனை அல்ல; ஜாதக மரபின் குறியீட்டு விளக்கங்கள்.':'These are symbolic traditional associations, not clinical findings, predictions of illness, or an assessment of organ function.'}</p>${medical}</section></section>`;
 }
 return Object.freeze({render,html,toD1,houseScore,scorePlanet,links,lens,sanitizeContext,THEMES,DRISHTI,version:'292-lived-results-reader'});
});
