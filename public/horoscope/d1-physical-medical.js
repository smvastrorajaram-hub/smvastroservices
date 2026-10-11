/* SMV ASTRO V291 — house-conditioned constitution and traditional medical symbolism.
 * Deliberately NOT a diagnostic model, disease forecast, medical risk score,
 * estimate of organ functioning, or reason for using spectacles. Works offline.
 * Input is the already normalized natal D1; no I/O, observers, caches, API calls.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1PhysicalMedical=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
// Sign correspondences are Kalapurusha symbolism; house themes are different.
const SIGN_TA=['மேஷ','ரிஷப','மிதுன','கடக','சிம்ம','கன்னி','துலா','விருச்சிக','தனுசு','மகர','கும்ப','மீன'];
const BODIES=[
 {ta:'தலை, முகத்தோற்றம் மற்றும் தேக அமைப்பு',en:'Head, appearance and constitution',
  robustTA:'தலை–முக வெளிப்பாட்டில் உறுதியான தோற்றமும் உடல் இயக்கத்தில் ஒழுங்கும் முன்னிலை பெறுகின்றன.',fragileTA:'தலை–முக வெளிப்பாட்டில் இறுக்கமான தோற்றமும் அன்றாட இயக்கத்தில் சோர்வைக் கவனிக்கும் பழக்கமும் முன்னிலை பெறுகின்றன.',
  robustEN:'The traditional reading favours a firm bearing and deliberate physical carriage.',fragileEN:'The traditional reading emphasizes a restrained bearing and fluctuating physical pace.'},
 {ta:'முகம், பற்கள், வாய் மற்றும் கண் குறியீடுகள்',en:'Face, teeth, mouth and vision symbolism',robustTA:'முகத்தில் தெளிவான வெளிப்பாடும் பேச்சின் போது கட்டுப்பட்ட முக அசைவுகளும் வலுப்பெறுகின்றன.',fragileTA:'முகத்திலும் வாயிலும் இறுக்கமான வெளிப்பாடும் உணவு மற்றும் பேச்சு ஒழுங்கைத் தொடர்ந்து மாற்றும் போக்கும் மேலோங்குகின்றன.',robustEN:'Clear expression and controlled facial movement take prominence.',fragileEN:'A restrained facial expression and changing routines are emphasized.'},
 {ta:'தோள், கை மற்றும் உடலுழைப்பின் இயக்கம்',en:'Shoulders, hands and physical exertion',robustTA:'கைகளால் செயலைத் தொடங்கும் சுறுசுறுப்பும் தொடர்ந்து பயிற்சி செய்யும் ஒழுங்கும் இணைகின்றன.',fragileTA:'கைச் செயல்களில் முதலில் வேகமும் பின்னர் தாமதமாக நிறைவு செய்யும் பழக்கமும் வெளிப்படுகின்றன.',robustEN:'Initiative with the hands is combined with repeatable practice.',fragileEN:'A fast start followed by uneven pacing is emphasized.'},
 {ta:'மார்பு, ஓய்வு மற்றும் உடல் சுகம்',en:'Chest, rest and physical comfort',robustTA:'வீட்டில் ஓய்வை ஒழுங்குபடுத்திக் கொள்ளும் பழக்கமும் உடல் சுகத்தைக் காப்பாற்றும் விருப்பமும் இணைகின்றன.',fragileTA:'வீட்டுக் கடமைகளை முடிக்க முயல்வதால் ஓய்வு நேரத்தைத் தள்ளிவைக்கும் பழக்கம் முன்னிலைப்படுகிறது.',robustEN:'Regular home rest and attention to comfort are traditional themes.',fragileEN:'Putting home duties before rest is the prevailing routine theme.'},
 {ta:'மேல்வயிறு மற்றும் உடல் நடுப்பகுதி',en:'Upper abdomen and midsection',robustTA:'உடல் நடுப்பகுதியில் சீரான தோற்றமும் உணவு ஒழுங்கைப் பேணும் பழக்கமும் முன்னிலை பெறுகின்றன.',fragileTA:'உடல் நடுப்பகுதியில் சதைப்பற்று மற்றும் ஒழுங்கற்ற நேர உணவுப் பழக்கத்தின் மாறுபாடு குறிப்பிடத்தக்கதாகிறது.',robustEN:'Balanced midsection symbolism and orderly meals are emphasized.',fragileEN:'Fuller midsection symbolism and irregular eating routines take focus.'},
 {ta:'வயிற்றின் கீழ்ப்பகுதி மற்றும் அன்றாட உழைப்பு',en:'Lower abdomen and daily exertion',robustTA:'பணிச்சுமையைப் பகுதிகளாகப் பிரித்து செய்யும் ஒழுங்கு உடற்பழக்கத்திலும் பிரதிபலிக்கிறது.',fragileTA:'பணியை முழுவதும் முடிக்க வேண்டும் என்ற பிடிப்பால் உணவு, ஓய்வு நேரங்கள் மாறும் பழக்கம் மேலோங்குகிறது.',robustEN:'The emphasis is on an organised rhythm of daily activity.',fragileEN:'Work demands tend to displace regular food and rest routines.'},
 {ta:'இடுப்பு மற்றும் உடல் சமநிலை',en:'Waist and physical balance',robustTA:'இடுப்பின் இயக்கத்தில் சமநிலையைக் காக்கும் ஒழுக்கமும் மெதுவான தொடர்ச்சியும் முன்னிலைப்படுகின்றன.',fragileTA:'நீண்ட நேரம் ஒரே வேலையில் ஈடுபடுவதால் உடற்பயிற்சிக்கும் இடைவெளிக்கும் இடையே ஒழுங்கின்மை முன்னிலைப்படுகிறது.',robustEN:'A measured approach to balance and sustained movement is highlighted.',fragileEN:'Long uninterrupted tasks challenge routine movement breaks.'},
 {ta:'நீண்டகால உடல் மாற்றங்கள்',en:'Long-term bodily transitions',robustTA:'உடல் பழக்கங்களை அனுபவத்துக்கு ஏற்றபடி மாற்றிக் கொள்ளும் திறன் முன்னிலைப்படுகிறது.',fragileTA:'உடல் நிலைமாற்றங்களைப் பற்றி அதிகம் சிந்தித்து பழக்கங்களை அடிக்கடி மாற்றும் போக்கு மேலோங்குகிறது.',robustEN:'Adapting habits over time is the stronger theme.',fragileEN:'Repeated adjustment of routines becomes the traditional theme.'},
 {ta:'தொடை, நடையியல் மற்றும் நீண்ட பயணம்',en:'Thighs, gait and extended travel',robustTA:'நீண்டநேரப் பயணத்திலும் அன்றாட நடையிலும் சீரான வேகத்தைப் பேணும் பழக்கம் முன்னிலைப்படுகிறது.',fragileTA:'அவசரத்தில் பயணத்தைத் தொடங்கி நடுவில் வேகத்தைக் குறைக்கும் மாறுபாடு மேலோங்குகிறது.',robustEN:'A steady pace is emphasized in sustained walking and travel.',fragileEN:'Changing pace across long activities is more prominent.'},
 {ta:'முழங்கால், எலும்பு மற்றும் வேலைத் திறன்',en:'Knees, skeletal symbolism and workload',robustTA:'உடல் இயக்கத்தை மெதுவாகவும் ஒழுங்காகவும் தொடரும் கட்டுப்பாடு முன்னிலை பெறுகிறது.',fragileTA:'உழைப்பைக் குறைவான இடைவெளியில் நீட்டிப்பதால் உடலுக்கான ஓய்வை மறுக்கும் பழக்கம் மேலோங்குகிறது.',robustEN:'Steady pacing and disciplined activity are emphasized.',fragileEN:'Extended work without sufficient breaks is the dominant routine theme.'},
 {ta:'காலின் கீழ்ப்பகுதி மற்றும் நீடித்த முயற்சி',en:'Lower legs and repeated effort',robustTA:'ஒரு உடற்பழக்கத்தைத் தொடர்ந்து செய்வதற்கான கட்டுப்பாடு வெளிப்படுகிறது.',fragileTA:'ஒரே நாளில் அதிகம் செய்துவிட்டு பின்பு இடைவெளி விடும் பழக்கம் முன்னிலைப்படுகிறது.',robustEN:'Consistency in repeated movement is emphasized.',fragileEN:'Bursts of activity alternating with long gaps are emphasized.'},
 {ta:'பாதங்கள், உறக்கம் மற்றும் ஓய்வு',en:'Feet, sleep and restorative routines',robustTA:'தனிமை மற்றும் ஓய்வுக்கான நேரத்தை ஒதுக்கும் பழக்கம் முன்னிலை பெறுகிறது.',fragileTA:'முடிக்காத வேலைகளை நினைத்துப் படுக்கும் நேரத்தைத் தள்ளிவைக்கும் பழக்கம் முன்னிலை பெறுகிறது.',robustEN:'Time for sleep and private rest is protected.',fragileEN:'Unfinished work tends to displace the hours set aside for rest.'}
];
const PHYSICAL_GRAHA_TA={Sun:'உடல் மொழியில் தன்னம்பிக்கை, நடையில் உறுதி',Moon:'அன்றாட அசைவுகளில் மென்மை, ஓய்வின் தேவைக்கேற்ப வேக மாற்றம்',Mars:'விரைவான இயக்கம், ஒரு செயலில் உடனே ஈடுபடும் துடிப்பு',Mercury:'கைகளின் நுட்பமான இயக்கம், செயல்களைச் சீரமைக்கும் ஒழுங்கு',Jupiter:'உடலமைப்பில் சதைப்பற்று, செயல்பாட்டில் விரிவு',Venus:'உடல் வெளிப்பாட்டில் மென்மை, சமச்சீரான தோற்றத்தை நாடுதல்',Saturn:'மெலிந்த தோற்றம், அசைவில் கட்டுப்பாடு, தொடர்ந்து செய்யும் விடாமுயற்சி',Rahu:'இயக்க வேகத்தில் மாறுபாடு, புதிய பழக்கங்களை விரைந்து முயற்சி செய்தல்',Ketu:'அமைதியான உடல் மொழி, தனித்துப் பணியாற்றும் பழக்கம்'};
const PHYSICAL_GRAHA_EN={Sun:'a firm and confident bearing',Moon:'gentler movement with changing pace',Mars:'rapid initiation of physical tasks',Mercury:'precision and coordination of fine movements',Jupiter:'fuller-build symbolism and expansive movement',Venus:'softness and symmetry in bodily expression',Saturn:'restrained movement and a leaner-build indication',Rahu:'variable pacing and experimentation with routines',Ketu:'reserved physical expression and independent routines'};
const SIGN_BODY_TA=['தலைப்பகுதி','முகமும் கழுத்தும்','தோளும் கைகளும்','மார்புப் பகுதி','மேல்வயிறும் முதுகின் மேல்பகுதியும்','வயிற்றின் நடுப்பகுதி','இடுப்பு','கீழ்வயிறு','தொடை','முழங்கால்','காலின் கீழ்ப்பகுதி','பாதம்'];
const SIGN_BODY_EN=['head','face and neck','shoulders and arms','chest','upper abdomen and upper back','mid-abdomen','waist','lower abdomen','thighs','knees','lower legs','feet'];
const ROOTS=[
 {id:'vision',houses:[2,12],actors:['Sun','Moon','Venus'],ta:'கண் பார்வை மற்றும் ஒளி உணர்வு',en:'Vision and light sensitivity',assocTA:'கண் பார்வை குறைவு மற்றும் பார்வைச் சுகம் சார்ந்த பாரம்பரியக் காரகத்துவங்கள்',assocEN:'traditional associations with visual comfort and sight'},
 {id:'digestion',houses:[5,6],actors:['Jupiter','Moon','Mars'],ta:'வயிறு மற்றும் செரிமானக் காரகத்துவம்',en:'Digestive symbolism',assocTA:'வயிற்றுச் சுகம், செரிமான ஒழுங்கு தொடர்பான பாரம்பரிய நோய்க் குறியீடுகள்',assocEN:'traditional digestive comfort and irregularity themes'},
 {id:'metabolism',houses:[6,8],actors:['Jupiter','Venus','Moon'],ta:'சர்க்கரை மற்றும் வளர்சிதை மாற்றக் காரகத்துவம்',en:'Metabolic and sugar symbolism',assocTA:'உடல் திசு, சதைப்பற்று மற்றும் வளர்சிதை மாற்றம் சார்ந்த பாரம்பரியக் குறியீடுகள்',assocEN:'traditional symbolism related to sugar, body fat and metabolism'},
 {id:'bones',houses:[1,10,11],actors:['Saturn','Mars'],ta:'எலும்புகள், மூட்டுகள் மற்றும் உடல் இயக்கம்',en:'Bones, joints and movement',assocTA:'மூட்டு இறுக்கம், உடல் இயக்க ஒழுங்கு தொடர்பான பாரம்பரியக் குறியீடுகள்',assocEN:'traditional joint stiffness and motion themes'},
 {id:'breath',houses:[3,4],actors:['Moon','Mercury'],ta:'மார்பு மற்றும் சுவாசக் காரகத்துவம்',en:'Chest and breathing symbolism',assocTA:'மார்பு சுகம், சுவாச ஒழுங்கு தொடர்பான பாரம்பரியக் குறியீடுகள்',assocEN:'traditional chest-comfort and breathing themes'},
 {id:'skin',houses:[1,6],actors:['Mercury','Saturn','Venus'],ta:'தோல் மற்றும் வெளித்தோற்றக் காரகத்துவம்',en:'Skin and appearance symbolism',assocTA:'தோல் சுகம், வெளிப்புற உடல் தோற்ற மாற்றங்கள் பற்றிய பாரம்பரியக் குறியீடுகள்',assocEN:'traditional themes of skin and outward appearance'},
 {id:'reproductive',houses:[7,8],actors:['Venus','Mars'],ta:'இனப்பெருக்க உறுப்புகளின் காரகத்துவம்',en:'Reproductive symbolism',assocTA:'இனப்பெருக்க உறுப்புகளுடன் தொடர்புபடுத்தப்படும் பாரம்பரிய உடல் காரகத்துவங்கள்',assocEN:'traditional reproductive-organ themes'},
 {id:'sleep',houses:[12,4],actors:['Moon','Saturn'],ta:'உறக்கம் மற்றும் ஓய்வின் காரகத்துவம்',en:'Sleep and rest symbolism',assocTA:'உறக்கம், ஓய்வு மற்றும் அன்றாட அழுத்தம் குறித்த பாரம்பரியக் குறியீடுகள்',assocEN:'traditional rest and sleep themes'}
];
const round=n=>Math.round(n*1000)/1000;
function makePhysical(d,n,lang,core,opts={}){
 const ta=lang!=='en',h=d.houses[n-1],lord=d.planets[h.lord],e=core.influence(d,n,opts),spec=BODIES[n-1];
 const main=(e.dominantSide==='support'?e.positive:e.negative)||e.rows[0];const counter=e.dominantSide==='support'?e.negative:e.positive;
 const sat=h.aspects.includes('Saturn')||h.occupants.includes('Saturn'),jup=!!d.planets.Jupiter;
 const paras=[];const add=(s,why,planets)=>paras.push({house:n,text:s,evidence:{source:why,actors:planets}});
 if(n===1){
  const satStrong=sat&&['own','exalted','moolatrikona'].includes(d.planets.Saturn.dignity);const ju=d.planets.Jupiter;
  if(ta){
   if(sat&&h.lord==='Jupiter'&&ju.sign===4)
    add(`${satStrong?'ஆட்சி அல்லது உச்ச பலமுடைய சனியின்':'சனியின்'} லக்னத் தொடர்பால் மெலிந்த அல்லது நடுத்தரமான உடற்கட்டு முதன்மை பெறுகிறது. லக்னாதிபதியான குரு சிம்மத்தில் அமைந்திருப்பதால் உடல் முழுதும் ஒரே அளவில் சதை கூடுவதற்குப் பதிலாக வயிற்றின் மேற்பகுதியிலும் இடைப்பகுதியிலும் சதைப்பற்று திரள்வது என்ற மாறுபட்ட பாரம்பரிய உடலமைப்பு வாசிப்பு கிடைக்கிறது.`,'saturn-jupiter-leo-body',['Saturn','Jupiter']);
   else if(sat)add(`${satStrong?'வலிமையான ':' '}சனியின் லக்னத் தொடர்பு மெலிந்த, எலும்புக் கட்டமைப்பு தெளிவாகத் தெரியும் தோற்றத்தை முன்னிலைப்படுத்துகிறது. லக்னாதிபதியான ${PN[h.lord]} ${SIGN_TA[lord.sign]}த்தில் இருப்பதால் அதன் உடலமைப்புக் காரகத்துவமும் இணைந்து, முழுவதும் ஒரே மாதிரியான மெலிவாக அல்லாமல் கலந்த தேக அமைப்பாக வாசிக்கப்படுகிறது.`,'saturn-body',['Saturn',h.lord]);
   else add(`${SIGN_TA[d.lagna]} லக்னத்தின் தோற்றத்துடன் ${PN[h.lord]} ${SIGN_TA[lord.sign]} ராசியில் இருப்பதன் உடல் காரகத்துவம் இணைகிறது. ${e.dominantSide==='support'?'உடல் இயக்கத்தில் கட்டுப்பாடும் சீரான தேக வெளிப்பாடும் முன்னிலை பெறுகின்றன.':'தேக வெளிப்பாட்டில் இறுக்கமும் உடல் இயக்கத்தில் வேக மாறுபாடும் முன்னிலை பெறுகின்றன.'}`,'lagna-constitution',[h.lord,main.key]);
  }else if(sat&&h.lord==='Jupiter'&&ju.sign===4)add('Saturn influencing the ascendant traditionally favours a leaner or medium frame. Jupiter in Leo adds a contrasting fuller-midsection indication, rather than suggesting uniformly full body proportions.','saturn-jupiter-leo-body',['Saturn','Jupiter']);
  else add(`${sat?'Saturn affecting the ascendant favours a more restrained or lean build.':'The rising sign and its ruler together shape the traditional constitution reading.'} The position of ${h.lord} in ${SIGN_BODY_EN[lord.sign]} symbolism modifies the overall pattern.`,'lagna-constitution',[h.lord,main.key]);
 }
 // Physical output: body language/constitution, NOT organ-function diagnoses.
 // Avoid repeated explanatory house-ruler prose and identical 'pace changes' lines.
 const movement=ta?PHYSICAL_GRAHA_TA[main.key]:PHYSICAL_GRAHA_EN[main.key];
 if(ta){
   if(n===1){
     add(`${e.dominantSide==='support'?spec.robustTA:spec.fragileTA} உடல் மொழியில் ${movement} என்ற தன்மையும் சேர்ந்துள்ளது.`,'body-lagna-lived-expression',[main.key,h.lord]);
   }else{
     add(`${e.dominantSide==='support'?spec.robustTA:spec.fragileTA} ${spec.ta} தொடர்பான வெளிப்புற உடல் மொழியில் ${movement} என்ற இயல்பு வெளிப்படுகிறது.`,'body-house-lived-expression',[main.key,h.lord]);
   }
 }else{
   if(n===1)add(`${e.dominantSide==='support'?spec.robustEN:spec.fragileEN} The visible manner of movement is traditionally associated with ${movement}.`,'body-lagna-lived-expression',[main.key,h.lord]);
   else add(`${e.dominantSide==='support'?spec.robustEN:spec.fragileEN} The outward physical manner for ${spec.en.toLowerCase()} is described through ${movement}.`,'body-house-lived-expression',[main.key,h.lord]);
 }
 if(n!==1&&counter&&Math.abs(counter.score)>Math.abs(main.score)*.6){
   const modifier=ta?PHYSICAL_GRAHA_TA[counter.key]:PHYSICAL_GRAHA_EN[counter.key];
   add(ta?`${PN[counter.key]} தரும் ${modifier} என்ற மாறுபட்ட பண்பும் சேர்ந்துள்ளதால், ஒரே கிரகத்தின் தோற்றத்தை மட்டும் இங்கே எடுத்துக்கொள்ள முடியாது.`:`${counter.key} adds a distinct traditional indication of ${modifier}; the physical description is not based on one planet alone.`, 'body-counterbalance',[main.key,counter.key]);
 }
 return {number:n,title:ta?`${n}-ஆம் பாவம் — ${spec.ta}`:`House ${n} — ${spec.en}`,paragraphs:paras,evidence:{house:n,sign:h.sign,lord:h.lord,dominant:e.dominantSide,contacts:e.rows}};
}
function makeMedical(d,lang,core,opts={}){
 const ta=lang!=='en';return ROOTS.map((spec,i)=>{
  const ev=spec.houses.map(h=>core.influence(d,h,opts));
  const relevant=new Set([...spec.actors,...spec.houses.map(h=>d.houses[h-1].lord)]);
  const hits=new Map();for(const v of ev)for(const row of v.rows){if(!relevant.has(row.key)&&!row.tags.some(k=>['occupant','aspect'].includes(k)))continue;
   const old=hits.get(row.key);if(!old||Math.abs(row.score)>Math.abs(old.score))hits.set(row.key,row);}
  const contacts=[...hits.values()].sort((a,b)=>Math.abs(b.score)-Math.abs(a.score));
  const support=contacts.filter(r=>r.score>0).reduce((a,x)=>a+x.score,0),strain=contacts.filter(r=>r.score<0).reduce((a,x)=>a-x.score,0);
  // NO severity/health-risk probability inferred from general planetary polarity.
  // A narrower symbolic concern requires distinct house and karaka afflictions;
  // protection can prevent the category from being used at all.
  const harder=new Set(['Mars','Saturn','Rahu','Ketu']);
  const protective=new Set(['Jupiter','Venus']);
  const directStress=spec.houses.reduce((s,h)=>s+[...d.houses[h-1].occupants,...d.houses[h-1].aspects].filter(k=>harder.has(k)).length,0);
  const directSupport=spec.houses.reduce((s,h)=>s+[...d.houses[h-1].occupants,...d.houses[h-1].aspects].filter(k=>protective.has(k)).length,0);
  const karakaStress=spec.actors.filter(k=>{const p=d.planets[k];return p&&((p.combust&&k!=='Sun')||p.dignity==='debilitated'||d.houses[p.house-1].aspects.some(x=>harder.has(x)&&x!==k));}).length;
  const relief=spec.houses.some(h=>['own','exalted'].includes(d.planets[d.houses[h-1].lord].dignity));
  const side=(directStress>=2&&karakaStress>=1&&directSupport===0&&!relief)?'traditional-concern':(directSupport>directStress||relief&&directStress<2)?'traditional-support':'mixed';
  const primary=contacts[0],counter=contacts.find(r=>primary&&r.key!==primary.key&&Math.sign(r.score)!==Math.sign(primary.score));
  const part=ta?spec.ta:spec.en;
  const markers=ta?(side==='traditional-concern'?`இப்பகுதியில் ${spec.assocTA} முக்கியமான பாரம்பரிய எச்சரிக்கைக் காரகமாக இடம்பெறுகின்றன. இது அந்த நோய் இருப்பதாகவோ வரப்போகிறது என்றோ கூறுவதில்லை.`:side==='traditional-support'?`இப்பகுதியில் பாவாதிபதியின் பலம் அல்லது சுபர் தொடர்பு சில கடினமான குறிகாட்டிகளைத் தணிக்கிறது. ${spec.assocTA} இருந்தாலும் அதிலிருந்து குறிப்பிட்ட உறுப்பில் குறை உள்ளது என்ற முடிவை எடுக்க முடியாது.`:`இந்தப் பகுதியில் நல்லதும் கடினமானதுமான கிரகத் தொடர்புகள் கலந்துள்ளன. ${spec.assocTA} இங்கு விவாதிக்கப்படுகின்றன; ஒரு குறிப்பிட்ட நோயைக் கண்டறியும் முடிவு அல்ல.`):(side==='traditional-concern'?`Traditionally adverse associations with ${spec.assocEN} are emphasized here; this does not mean a disease is present or will develop.`:side==='traditional-support'?`The dignity of the house ruler or a benefic connection mitigates some challenging symbols; it cannot establish healthy organ function or rule out disease.`:`Mixed traditional indicators offer no reliable disease conclusion.`);
  const fact=ta?`${spec.houses.map(h=>h+'-ஆம் பாவம்').join(', ')} மற்றும் ${spec.actors.map(k=>PN[k]).join(', ')} சார்ந்த காரகத்துவங்களில் ${primary?PN[primary.key]+' முக்கியத் தொடர்பாகவும் ':''}${counter?PN[counter.key]+' மாறுபட்ட தொடர்பாகவும் ':''}அமைகின்றன.`:`Traditional references to houses ${spec.houses.join(', ')} and ${spec.actors.join(', ')} include ${primary?primary.key+' as the leading influence':''}${counter?' and '+counter.key+' as a counterweight':''}.`;
  return {number:i+1,id:spec.id,title:part,paragraphs:[{text:fact+' '+markers,evidence:{source:'medical-symbolic-only',actors:contacts.map(x=>x.key),houses:spec.houses}}],evidence:{classification:side,traditionalBalance:round(support-strain),directStress,directSupport,karakaStress,houseSet:spec.houses,planetKeys:contacts.map(x=>x.key)},notMedicalRisk:true};
 });
}
return Object.freeze({physical:makePhysical,medical:makeMedical,version:'292-repetition-trimmed-physical-symbolism'});
});
