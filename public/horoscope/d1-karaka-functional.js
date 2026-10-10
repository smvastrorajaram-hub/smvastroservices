/* SMV ASTRO V275 — D1 functional rulership + graha-reference evidence.
 * Traditional interpretative heuristics, not event/health/lifespan prediction.
 * Primary natural karakas: user's Vedic Astrology: An Integrated Approach
 * screenshots, Table 15 (pp.83-84); reference houses: Table 12 (p.73).
 * Planetary topics: Table 16 (pp.83-84). Does not claim these tables are
 * a full/unique account of classical Parashari/Jaimini karakatwas.
 * Important: reference-house arithmetic is NOT a graha-drishthi calculation.
 * Works on already normalized D1. No API/AI/DB/network or recalculation.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1KarakaFunctional=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const REL=typeof module==='object'&&module.exports?require('./d1-relationships.js'):globalThis.SMVD1Relationships;
 // Screenshots of Table 15: primary (one reference per bhava).
 const HOUSE_KARAKA=Object.freeze(['Sun','Jupiter','Mars','Moon','Jupiter','Mars','Venus','Saturn','Jupiter','Mercury','Jupiter','Saturn']);
 // Screenshot Table 12: graha reference houses *from the planet*, not aspect.
 const GRAHA_HOUSES=Object.freeze({Sun:[9,10,11],Moon:[4,1,2,11,9],Mars:[3],Mercury:[6],Jupiter:[5],Venus:[7],Saturn:[8,12]});
 // Table 16 screenshot planet -> specific matters. Not a claim that all matters are exclusively signified by one graha.
 const MATTERS=Object.freeze({
  Sun:{ta:'சுயம், உயிர்சக்தி, தந்தை, தலைமை, புகழ், தொழில் சாதனை',en:'self, vitality, father, authority, recognition and work achievement'},
  Moon:{ta:'மனம், தாய், வீட்டமைதி, உறவுகள், நண்பர்கள்',en:'mind, mother, home comfort, relatives and friends'},
  Mars:{ta:'இளைய சகோதரர், துணிவு, நிலம், போட்டி, கடன்',en:'younger siblings, courage, land, competition and debt'},
  Mercury:{ta:'பேச்சு, நினைவாற்றல், கல்வி, தொழில்நுட்பம், தொழில்',en:'speech, memory, learning, detail work and career'},
  Jupiter:{ta:'குடும்பச் செல்வம், அறிவு, குழந்தைகள், ஆசிரியர், வழிகாட்டுதல்',en:'family resources, knowledge, children, teachers and guidance'},
  Venus:{ta:'வாகனம், வீடு சார்ந்த வசதி, திருமணம், உறவுகள்',en:'vehicles, domestic comforts, marriage and partnerships'},
  Saturn:{ta:'நீண்டகாலப் பொறுப்பு, உழைப்பு, எட்டாம் பாவ ஆய்வு, இழப்புகள்',en:'long-term duties, sustained labour, eighth-house themes and losses'},
  Rahu:{ta:'வழக்கமற்ற ஆய்வு, வெளிநாட்டு அனுபவம்',en:'unconventional study and foreign experiences'},
  Ketu:{ta:'ஆழ்ந்த அறிவு, ஆன்மிகத் தேடல், பற்றின்மை',en:'inward research, spirituality and detachment'}
 });
 const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const SIGN_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const SIGN_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const DIGN_TA={exalted:'உச்சம்',debilitated:'நீசம்',own:'ஆட்சி',moolatrikona:'மூலத்திரிகோணம்',friend:'நட்பு ராசி',enemy:'பகை ராசி',neutral:'சம ராசி',undetermined:'கணிக்கப்படாத பலம்'};
 const TA_TOPICS=['உடல் இயல்பும் முயற்சியும்','குடும்ப வளமும் பேச்சும்','துணிவும் உடன்பிறந்த உறவும்','தாய், வீடு, மன அமைதி','கல்வி, அறிவு, இளையோர் வளர்ச்சி','போட்டி, கடன், அன்றாடக் கடமை','திருமணம், கூட்டுறவு, ஒப்பந்தம்','மாற்றங்கள் மற்றும் நீண்டகால வாழ்க்கைத் திட்டம்','கல்வி, ஆசிரியர், வாழ்வியல் கொள்கை','தொழில் மற்றும் பொறுப்பு','மூத்த உடன்பிறப்பு, ஆதாயம், நண்பர்கள்','ஓய்வு, செலவு, தனிமை'];
 const EN_TOPICS=['physical initiative','family resources and speech','courage and siblings','mother, home and comfort','learning and younger family','competition, debt and duties','partnerships','changes and long-term planning','education and guidance','career and responsibility','elder siblings, gains and friends','rest, spending and retreat'];
 // House-specific practical interpretation, each linked to documented source
 // matters, not a universal "exalted=good / debilitated=bad" score.
 const LIFE_OUTCOME_TA=[
  ['தன்னுடைய உடல் முயற்சியை ஒழுங்கான பழக்கமாக மாற்றுவது','உடலின் இயல்பை மீறி இடைவிடாமல் உழைப்பது'],
  ['குடும்ப வரவைச் சேமிப்போடு இணைத்துப் பேசுவது','பேச்சின் அவசரத்தால் சேமிப்பு முடிவில் குழப்பம்'],
  ['இளைய உடன்பிறப்புகளுடன் இணைந்து ஒரு திறனை வளர்த்தல்','தன்னுடைய முயற்சியை அனைவரும் அதே வேகத்தில் பின்பற்ற வேண்டும் என எதிர்பார்த்தல்'],
  ['வீட்டு அமைதி மற்றும் தாயாரின் தேவைகளைப் புரிந்துகொண்டு ஏற்பாடு செய்தல்','வெளியுலகப் பொறுப்புகளை வீட்டிலும் கட்டாயப்படுத்துதல்'],
  ['படித்ததைப் பயிற்சியாக மாற்றி இளையோருக்கு விளக்குதல்','கற்றலில் உடனடி முடிவைக் கோரி அழுத்தம் தருதல்'],
  ['போட்டிக்கு உரிய பயிற்சி, பணிப்பகிர்வு, செலவுக் கணக்கு வைத்தல்','வேலைச் சுமையுடன் கடன் பொறுப்பையும் தேவையின்றி அதிகரித்தல்'],
  ['உறவு அல்லது கூட்டுறவு முடிவில் இருவருடைய எதிர்பார்ப்பையும் கேட்பது','தனி முடிவைப் பொதுவான ஒப்பந்தமாகத் திணித்தல்'],
  ['நிச்சயமில்லாத மாற்றங்களுக்கு மாற்று ஏற்பாடுகளைத் தயாரித்தல்','போதிய ஆதாரமின்றி அபாயத்தை எதிர்கொள்வது'],
  ['ஆசிரியர் அல்லது அனுபவசாலியின் வழிகாட்டுதலை நடைமுறையுடன் ஒப்பிடுதல்','சுயநம்பிக்கை காரணமாக வேறுபட்ட கருத்தை முற்றிலும் மறுத்தல்'],
  ['தொழில் பொறுப்பைத் திட்டம், திறன் மற்றும் அளவான அதிகாரத்துடன் நடத்துதல்','அங்கீகார விருப்பத்தில் ஓய்வின்றி வேலை செய்வது'],
  ['உறுதியான தொடர்புகள் மூலம் வாய்ப்புகளை அடைந்து வரவைப் பரிசீலித்தல்','கிடைக்காத ஆதாயத்தை முன்கூட்டியே செலவுத் திட்டத்தில் சேர்த்தல்'],
  ['தனிநேரம், ஓய்வு மற்றும் செலவை முன்னரே வகுத்துக்கொள்ளுதல்','அனைத்து மனச்சுமையையும் தனியாகச் சுமந்து ஓய்வை ஒத்திவைத்தல்']
 ];
 const LIFE_OUTCOME_EN=[
  ['turning effort into a sustainable physical routine','overworking without recovery'],
  ['balancing family spending and savings through clear discussion','rushed words unsettling money decisions'],
  ['building skills collaboratively with younger siblings','expecting everyone to work at the same pace'],
  ['arranging a supportive home while attending to a mother’s needs','imposing workplace controls at home'],
  ['turning study into practice and explaining it to younger people','demanding immediate results from learning'],
  ['preparing for competition with work and debt budgets','taking on more duties and debts than needed'],
  ['making agreements after hearing both sides','imposing individual choices as joint decisions'],
  ['making backup plans for uncertain changes','taking risks without adequate evidence'],
  ['weighing teachers’ guidance against lived experience','rejecting different viewpoints out of certainty'],
  ['planning career tasks with proportionate authority','overworking to gain recognition'],
  ['evaluating income opportunities through dependable networks','spending income before it materialises'],
  ['setting aside time and resources for rest','carrying every burden alone']
 ];
 function insist(d){if(!d||!Number.isInteger(d.lagna)||d.lagna<0||d.lagna>11||!Array.isArray(d.houses)||d.houses.length!==12||!d.planets)throw Error('Complete normalized D1 required');}
 function owned(d,name){insist(d);if(!d.planets[name])return [];return REL.ownership(d,name);}
 function functional(d,name){insist(d);const p=d.planets[name];if(!p)return {planet:name,houses:[],kind:'unknown',flags:[],reason:'missing-planet'};
  const houses=owned(d,name),is=h=>houses.includes(h);const flags=[];
  if(is(1))flags.push('lagna-lord');if(is(5)||is(9))flags.push('trinal-ruler');
  if(houses.some(h=>[4,7,10].includes(h)))flags.push('angular-ruler');
  if(is(3))flags.push('third-ruler');if(is(6))flags.push('sixth-ruler');
  if(is(8))flags.push('eighth-ruler');if(is(12))flags.push('twelfth-ruler');
  if(is(2)||is(7))flags.push('maraka-house-lord');
  let kind='mixed-context-dependent';
  if(is(1))kind='lagna-primary';
  else if((is(5)||is(9))&&houses.some(h=>[4,7,10].includes(h)))kind='yogakaraka-candidate';
  else if(is(5)||is(9))kind='trinal-with-other-ownership';
  else if(is(3)&&is(6))kind='functional-challenging';
  else if(is(6))kind='functional-challenging';
  else if(is(8)||is(12))kind='dusthana-mixed';
  // Explicitly preserve the user's Aries examples; never misclassify
  // Mercury's 3+6 as a guaranteed bad dasha, or Mars 1+8 as purely bad.
  if(d.lagna===0&&name==='Mercury')kind='functional-challenging';
  if(d.lagna===0&&name==='Mars')kind='lagna-primary';
  if(d.lagna===0&&name==='Jupiter')kind='trinal-with-other-ownership';
  return {planet:name,houses,kind,flags,dignity:REL.dignity(d,p).state,
   // weakness is a separate observation; in a dusthana it is NEVER
   // automatically treated as a promise of relief or of a Viparita yoga.
   debilitated:REL.dignity(d,p).state==='debilitated'};
 }
 function dusthanaException(d,name){const f=functional(d,name),p=d.planets[name];if(!p)return {candidate:false,reason:'missing-planet'};
  const ownedD=f.houses.filter(h=>[6,8,12].includes(h));
  const otherGood=f.houses.filter(h=>[1,5,9].includes(h));
  const occupiesD=[6,8,12].includes(p.house),isWeak=f.debilitated;
  const viparitaPattern=ownedD.some(h=>occupiesD&&h!==p.house);
  const labels=ownedD.map(h=>({6:'Harsha',8:'Sarala',12:'Vimala'})[h]);
  return {planet:name,ownedD,otherGood,occupiesD,position:p.house,isWeak,
   // House placement is a preliminary *candidate*, not certification of a yoga.
   candidate:viparitaPattern,labels:viparitaPattern?labels:[],
   protectedOtherLordship:otherGood.length>0,
   degreeAndCancellationAuditNeeded:isWeak,
   reasons:[...(!ownedD.length?['not-a-6-8-12-lord']:[]),...(isWeak?['debilitation-does-not-by-itself-prove-benefit']:[]),...(viparitaPattern?['dusthana-lord-in-a-different-dusthana-only-preliminary']:[]),...(otherGood.length?['auspicious-co-rulership-must-not-be-ignored']:[])]};
 }
 function karaka(d,focus){insist(d);if(!Number.isInteger(focus)||focus<1||focus>12)throw Error('focus 1..12');
  const planet=HOUSE_KARAKA[focus-1],p=d.planets[planet],lordName=d.houses[focus-1].lord,lp=d.planets[lordName];
  if(!p||!lp)throw Error('Missing required D1 karaka/lord');
  const referencedSign=(p.sign+focus-1)%12;
  const referencedHouse=((referencedSign-d.lagna+12)%12)+1;
  const referenceLord=d.houses[referencedHouse-1]?.lord||null;
  const naturalStrength=REL.dignity(d,p).state,lordStrength=REL.dignity(d,lp).state;
  return {focus,planet,planetHouse:p.house,planetSign:p.sign,topicLord:lordName,topicLordHouse:lp.house,
   topicLordStrength:lordStrength,karakaStrength:naturalStrength,
   // The house counted FROM karaka is independent of any planet drishti.
   referenceFromPlanet:focus,referencedSign,referencedHouse,referenceLord,
   referenceLordStrength:referenceLord&&d.planets[referenceLord]?REL.dignity(d,d.planets[referenceLord]).state:null,
   sameReferenceAsLagna:referencedHouse===focus,planetaryMatters:MATTERS[planet]};
 }
 function description(d,focus,lang='ta',{compact=false}={}){const k=karaka(d,focus),f=functional(d,k.topicLord),ex=dusthanaException(d,k.topicLord),ta=lang!=='en';
  const nm=x=>ta?PN[x]:x,theme=ta?TA_TOPICS[focus-1]:EN_TOPICS[focus-1];
  const head=ta?`${theme} குறித்து ${focus}-ஆம் பாவாதிபதி ${nm(k.topicLord)} ${SIGN_TA[d.planets[k.topicLord].sign]} ராசியில் ${k.topicLordHouse}-ஆம் பாவத்தில் ${DIGN_TA[k.topicLordStrength]} நிலையில் உள்ளார்; இந்தத் துறையின் இயற்கைக் காரகன் ${nm(k.planet)} ${SIGN_TA[k.planetSign]} ராசியில் ${k.planetHouse}-ஆம் பாவத்தில் ${DIGN_TA[k.karakaStrength]} நிலையில் உள்ளார்.`:
   `For ${theme}, house ${focus} is ruled by ${nm(k.topicLord)} in ${SIGN_EN[d.planets[k.topicLord].sign]}, house ${k.topicLordHouse} (${k.topicLordStrength}); primary natural karaka ${nm(k.planet)} is in ${SIGN_EN[k.planetSign]}, house ${k.planetHouse} (${k.karakaStrength}).`;
  const ref=ta?`${nm(k.planet)} இருக்கும் இடத்திலிருந்து ${focus}-ஆம் ராசியை எண்ணினால் ${k.referencedHouse}-ஆம் பிறப்புப் பாவம் வருகிறது; அதிபதி ${nm(k.referenceLord)} (${DIGN_TA[k.referenceLordStrength]}).`:
   `Counting ${focus} signs from ${nm(k.planet)} leads to natal house ${k.referencedHouse}, whose ruler ${nm(k.referenceLord)} has ${k.referenceLordStrength} dignity.`;
  const strong=x=>['own','moolatrikona','exalted','friend'].includes(x);
  const duo=strong(k.topicLordStrength)&&strong(k.karakaStrength)?'two-strong':
   strong(k.topicLordStrength)!==strong(k.karakaStrength)?'mixed':'requires-context';
  const pair=(ta?LIFE_OUTCOME_TA:LIFE_OUTCOME_EN)[focus-1];
  const outcome=ta?(duo==='two-strong'?`இரு முக்கிய ஆதாரங்களும் ஒத்துழைக்கும் நிலையில் ${pair[0]} போன்ற அணுகுமுறையை ஆராயலாம்; அதே நேரத்தில் ${pair[1]} என்ற மறுபக்கமும் கவனிக்கத்தக்கது.`:
   duo==='mixed'?`பாவாதிபதியின் பலமும் காரகனின் பலமும் வேறுபடுவதால் ${pair[0]} என்ற வாய்ப்போடு ${pair[1]} என்ற சவாலும் கலந்து வரலாம்.`:
   `இரு ஆதாரங்களின் வலிமை மட்டுமே முடிவை உறுதி செய்யாததால் ${pair[1]} என்ற குறையை அளவாகக் கவனித்து ${pair[0]} என்ற செயல்முறையையும் ஆராய வேண்டும்.`):
   (duo==='two-strong'?`Both indicators can support ${pair[0]}, while ${pair[1]} remains possible.`:
    duo==='mixed'?`Unequal dignity calls for balancing ${pair[0]} against ${pair[1]}.`:
    `The two indicators alone cannot establish an outcome; consider ${pair[0]} and the contrary risk of ${pair[1]}.`);
  const independence=k.topicLord===k.planet?(ta?'பாவாதிபதியும் இயற்கைக் காரகனும் ஒரே கிரகம் என்பதால் இவ்விரண்டையும் தனித்தனி ஆதாரங்களாக இரட்டித்து எண்ணக்கூடாது.':'The house lord and natural karaka are the same planet, so this is not two independent confirmations.'):
   k.referenceLord===k.topicLord?(ta?'காரக இடத்தின் அதிபதியும் முதன்மைப் பாவாதிபதியே என்பதால் ஒரே ஆதாரத்துக்கு கூடுதல் வாக்குறுதி வழங்கக்கூடாது.':'The reference and topic share a ruler; do not double count it.') : '';

  const overlap=f.kind==='lagna-primary'?(ta?'லக்னாதிபத்தியம் முதன்மை; எட்டாம் ஆதிபத்தியம் இருந்தாலும் அதை மட்டும் வைத்து அசுபமென முடிவு செய்ய முடியாது.':'Ascendant ownership is primary even when eighth-house co-rulership exists.'):
   f.kind==='functional-challenging'?(ta?'இந்தப் பாவாதிபதிக்கு செயல்பாட்டு சவால் அளிக்கும் ஆதிபத்தியம் இருப்பதால் சாதகமான திறனோடு போட்டி, பொறுப்பு அல்லது எதிர்ப்பையும் ஆராய வேண்டும். இது நிச்சயமான தீய தசை என்று பொருளல்ல.':'Challenging functional rulership calls for both skill and difficulty; it is not a guaranteed adverse period.'):
   f.kind==='trinal-with-other-ownership'?(ta?'திரிகோண ஆதிபத்தியம் சாதக ஆதாரமாக இருந்தாலும், அதன் மற்ற பாவக் காரகத்துவத்தை நீக்கிவிடக் கூடாது.':'Trinal rulership can provide support without erasing the co-ruled house.'):
   f.kind==='yogakaraka-candidate'?(ta?'கேந்திர–திரிகோண இரட்டை ஆதிபத்தியம் யோகத்திற்கான ஆதாரமாக இருக்கலாம்; கிரகத்தின் முழு நிலையைக் கணிக்க வேண்டும்.':'Rulership of both an angle and trine can support a yoga, subject to the whole chart.'):
   (ta?'பாவாதிபத்தியத்தையும் இயற்கைக் காரகத்துவத்தையும் தனித்த ஆதாரங்களாகச் சேர்த்துப் பார்க்க வேண்டும்.':'Judge functional rulership and natural karakatwa separately.');
  const caveat=ex.ownedD.length?(ta?`இக்கிரகம் ${ex.ownedD.join(', ')}-ஆம் துஷ்டான பாவத்திற்கும் அதிபதி. ${ex.isWeak?'நீசம் மட்டும் அந்தப் பாவத்தின் தீமையைக் குறைக்கும் உறுதி அல்ல. ':''}${ex.candidate?'வேறொரு துஷ்டானத்தில் இருப்பது விபரீத யோகத்துக்கான ஆரம்பக் குறிப்பு மட்டுமே; யோகத்தை உறுதி செய்யவில்லை. ':''}${ex.protectedOtherLordship?'லக்னம்/திரிகோண ஆதிபத்தியமும் இருப்பதால் அதனைப் புறக்கணிக்கக் கூடாது.':''}`:
   `This planet also rules dusthana house(s) ${ex.ownedD.join(', ')}. Debility alone does not guarantee relief; a placement-based viparita pattern is only a candidate.`):'';
  // Concise mode allows the time engine to insert a non-repeated evidence
  // line only for the actually operating MD/AD; not for every planet.
  const msg=(compact?[head,overlap,caveat]:[head,ref,outcome,independence,overlap,caveat]).filter(Boolean).join(' ');
  return {text:msg,evidence:{...k,functional:f,exception:ex,source:'d1-nature-and-graha-reference'},mode:compact?'compact':'full'};
 }
 function periodNote(d,name,lang='ta',focus=null,age=null){const f=functional(d,name),ex=dusthanaException(d,name),ta=lang!=='en';if(!f.houses.length)return {text:'',evidence:{f,ex}};
  const p=d.planets[name],active=focus==null||f.houses.includes(focus)||p.house===focus||REL.aspectHouse(d,name,focus);
  if(!active)return {text:'',evidence:{f,ex}};
  const teen=typeof age==='number'&&age<18;
  const label=ta?PN[name]:name;
  const fact=ta?`${label} ${f.houses.join(', ')}-ஆம் பாவாதிபதி; ${p.house}-ஆம் பாவத்தில் ${f.dignity==='debilitated'?'நீசம்':f.dignity==='exalted'?'உச்சம்':f.dignity==='own'?'ஆட்சி':f.dignity==='moolatrikona'?'மூலத்திரிகோணம்':'மற்ற ராசிபலத்தில்'} உள்ளார்.`:
   `${label} rules houses ${f.houses.join(', ')} and occupies house ${p.house} (${f.dignity}).`;
  const role=f.kind==='functional-challenging'?(ta?'அன்றாடப் பயிற்சி, போட்டி அல்லது பொறுப்பு அதிகரிக்கக்கூடிய பாரம்பரியத் தொடர்பு; அனைத்துக் காலங்களும் தீயவை அல்ல.':'A traditionally challenging functional ruler; not every period is adverse.'):
   f.kind==='lagna-primary'?(ta?'லக்னாதிபத்தியத்தை முதலில் எடுத்துக் கொள்ள வேண்டும்; எட்டாம் ஆதிபத்தியம் இருந்தால் மாற்றங்களையும் சேர்த்து ஆராய வேண்டும்.':'Give ascendant lordship priority; if it also rules the eighth, include changes.'):
   f.kind==='trinal-with-other-ownership'?(ta?'திரிகோண தொடர்பு வலிமையைத் தரக்கூடும்; மற்ற ஆதிபத்தியத்தின் செலவு அல்லது பொறுப்பும் கணக்கில் வரும்.':'Trinal support coexists with obligations of its other house.'):
   (ta?'இந்தக் கிரகத்தின் மற்ற பாவாதிபத்தியத்தையும் தனியாகப் பரிசீலிக்க வேண்டும்.':'Consider both signs it rules.');
  const health=teen&&[6,8,12].some(h=>f.houses.includes(h))?(ta?'குழந்தைப் பருவத்தில் இதை பெற்றோர் கவனிக்கும் பழக்கம், பாதுகாப்பு மற்றும் கற்றல் சார்ந்து மட்டுமே வாசிக்க வேண்டும்.':'For a child read this as caregiver routines, safety and learning, not adult life events.'):' ';
  const escape=ex.ownedD.length&&f.debilitated?(ta?'நீசத்தால் துஷ்டானப் பிரச்சினை நீங்கிவிட்டதாகக் கருத முடியாது.':'Debility does not automatically remove dusthana difficulties.'):
   ex.candidate?(ta?'விபரீத அமைப்புக்கான ஆரம்பச் சாத்தியம் மட்டுமே; உறுதியான ராஜயோகமாக அறிவிக்கக் கூடாது.':'Only a preliminary viparita candidate, not a confirmed rajayoga.'):' ';
  return {text:[fact,role,health,escape].filter(s=>s.trim()).join(' '),evidence:{f,ex,focus,source:'d1-functional-period'}};
 }
 return Object.freeze({HOUSE_KARAKA,GRAHA_HOUSES,MATTERS,functional,dusthanaException,karaka,description,periodNote,version:'275-karaka-functional'});
});
