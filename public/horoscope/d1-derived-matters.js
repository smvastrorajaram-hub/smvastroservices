/* SMV ASTRO V276 — derived houses (bhavat-bhavam) and topic-specific evidence.
 * Sources: user-provided Vedic Astrology: An Integrated Approach screenshots:
 * primary naisargika karakas (Table 15), graha lagnas (Table 12) and
 * matter-specific planetary karakatwas (Table 16). Derived houses and
 * supplementary significators are explicitly labelled interpretive rules.
 * Applies to computed natal D1 only; no API, no PII or saved-report mutations.
 * A relative's finances, illness or lifespan cannot be established from the
 * native's horoscope, and are NEVER asserted as personal facts.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1DerivedMatters=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const REL=typeof module==='object'&&module.exports?require('./d1-relationships.js'):globalThis.SMVD1Relationships;
 const KF=typeof module==='object'&&module.exports?require('./d1-karaka-functional.js'):globalThis.SMVD1KarakaFunctional;
 if(!REL||!KF)throw Error('Load d1-relationships.js and d1-karaka-functional.js before d1-derived-matters.js');
 const SIGN=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
 const EN_SIGN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
 const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
 const DG={exalted:'உச்சம்',debilitated:'நீசம்',own:'ஆட்சி',moolatrikona:'மூலத்திரிகோணம்',friend:'நட்பு ராசி',enemy:'பகை ராசி',neutral:'சம ராசி',undetermined:'தெரியாத ராசிபலம்'};
 const MATTERS=Object.freeze({
  native_wealth:{anchor:2,offset:1,reference:11,karakas:['Jupiter'],focus:[2],ta:'குடும்பச் செல்வம், வருமானம் மற்றும் சேமிப்பு',en:'family wealth, income and savings',taGood:'வருமானத்தைக் குடும்பச் சேமிப்பாக மாற்றும் அணுகுமுறை',enGood:'turning income into family savings',taRisk:'வரவு இருந்தும் சேமிப்பு நிலைக்காத இடைவெளி',enRisk:'a gap between gains and savings'},
  father_wealth:{anchor:9,offset:2,reference:10,karakas:['Sun','Jupiter'],focus:[9],ta:'தந்தையின் பொருளாதாரப் பின்னணி',en:'father-related financial circumstances',taGood:'தந்தை சார்ந்த பொருளாதாரப் பாதுகாப்பைப் பற்றிய குடும்ப அனுபவம்',enGood:'the native’s experience of father-related family resources',taRisk:'தந்தை சார்ந்த பொறுப்பு மற்றும் செலவு பற்றிய அழுத்தம்',enRisk:'pressure around father-related family obligations'},
  mother_wealth:{anchor:4,offset:2,reference:5,karakas:['Moon','Jupiter'],focus:[4],ta:'தாயார் சார்ந்த குடும்ப வளம்',en:'mother-related family resources',taGood:'தாயார் சார்ந்த உதவி மற்றும் குடும்ப வசதி',enGood:'the experience of mother-related resources and family support',taRisk:'வீட்டு வசதிக்கும் செலவுக்கும் இடையிலான சுமை',enRisk:'tension between domestic comfort and expenses'},
  younger_sibling_wealth:{anchor:3,offset:2,reference:4,karakas:['Mars','Jupiter'],focus:[3],ta:'இளைய உடன்பிறப்பின் வள நிலை',en:'younger sibling-related resources',taGood:'இளைய உடன்பிறப்புடன் பகிரும் குடும்பப் பொறுப்புகள்',enGood:'shared responsibilities involving a younger sibling',taRisk:'உடன்பிறப்புகளுக்கிடையிலான பணம் பற்றிய எதிர்பார்ப்பு',enRisk:'money expectations among siblings'},
  child_wealth:{anchor:5,offset:2,reference:6,karakas:['Jupiter'],focus:[5],ta:'குழந்தைகள் தொடர்பான வளமும் பொறுப்பும்',en:'children-related resources and duties',taGood:'குழந்தைகளுக்கான கல்வி மற்றும் வளங்களைத் திட்டமிடுதல்',enGood:'planning education and resources for children',taRisk:'கல்வி மற்றும் பராமரிப்புச் செலவுகள் குறித்த அழுத்தம்',enRisk:'pressure involving educational and care expenses'},
  spouse_wealth:{anchor:7,offset:2,reference:8,karakas:['Venus','Jupiter'],focus:[7],ta:'துணைவர் சார்ந்த பொருளாதாரத் தொடர்பு',en:'spouse-related financial arrangements',taGood:'கூட்டு செலவு மற்றும் பகிரப்பட்ட பொருளாதார முடிவுகள்',enGood:'joint spending and shared financial choices',taRisk:'ஒப்பந்தமும் குடும்பச் செலவும் தெளிவில்லாமல் இருப்பது',enRisk:'unclear agreements and family spending'},
  elder_sibling_wealth:{anchor:11,offset:2,reference:12,karakas:['Jupiter'],focus:[11],ta:'மூத்த உடன்பிறப்பின் வள நிலை',en:'elder sibling-related resources',taGood:'மூத்த உடன்பிறப்புடன் பகிரும் பொறுப்புகள்',enGood:'shared commitments with an elder sibling',taRisk:'உறவினர் உதவியை வருமானமாகக் கணக்கிடுதல்',enRisk:'counting on family assistance as income'},
  native_health:{anchor:1,offset:1,reference:6,karakas:['Sun','Mars','Saturn'],focus:[1,6,8],ta:'உடல்நலம் மற்றும் நீண்டகாலப் பராமரிப்பு',en:'health and long-term care',taGood:'உடலின் இயல்புக்கு ஏற்ற தினசரிப் பராமரிப்பு',enGood:'age-appropriate day-to-day care',taRisk:'தேவையான மருத்துவ ஆலோசனையைத் தள்ளிவைப்பது',enRisk:'delaying appropriate clinical advice'}
 });
 const PER_FOCUS=Object.freeze({2:['native_wealth'],3:['younger_sibling_wealth'],4:['mother_wealth'],5:['child_wealth'],6:['native_health'],7:['spouse_wealth'],9:['father_wealth'],11:['elder_sibling_wealth']});
 function countFrom(base,offset){if(!Number.isInteger(base)||base<1||base>12||!Number.isInteger(offset)||offset<1||offset>12)throw Error('Houses must be 1..12');return ((base+offset-2)%12)+1;}
 function valid(d){if(!d||!Number.isInteger(d.lagna)||d.lagna<0||d.lagna>11||!Array.isArray(d.houses)||d.houses.length!==12||!d.planets)throw Error('Complete natal D1 required');}
 function planetInfo(d,key){const p=d.planets[key];if(!p)return null;return {planet:key,house:p.house,sign:p.sign,dignity:REL.dignity(d,p).state,owns:REL.ownership(d,key),functional:KF.functional(d,key).kind,retrograde:p.retrograde,combust:p.combust};}
 function houseInfo(d,num){const h=d.houses[num-1];if(!h||!d.planets[h.lord])throw Error('Missing D1 house lord '+num);const occupants=[...new Set(h.occupants||[])].filter(p=>d.planets[p]);const aspects=[...new Set(h.aspects||[])].filter(p=>d.planets[p]);const lordPlanet=d.planets[h.lord];const touches=Object.values(d.planets).filter(p=>p.key!==h.lord&&(p.house===lordPlanet.house||REL.aspectHouse(d,p.key,lordPlanet.house))).map(p=>({planet:p.key,kind:p.house===lordPlanet.house?'conjunction':'lord-house-aspect'}));
  return {house:num,sign:h.sign,lord:h.lord,lordInfo:planetInfo(d,h.lord),occupants,aspects,conjunctOrAspectToLord:touches};
 }
 function influence(d,h){return [...h.occupants.map(p=>({planet:p,kind:'occupies',target:h.house})),...h.aspects.map(p=>({planet:p,kind:'aspects',target:h.house})),...h.conjunctOrAspectToLord.map(c=>({...c,target:h.house}))].map(c=>({...c,nature:c.planet==='Rahu'||c.planet==='Ketu'?'nonstandard-nodal':c.planet==='Jupiter'||c.planet==='Venus'?'benefic-tradition':c.planet==='Mars'||c.planet==='Saturn'||c.planet==='Sun'?'malefic-tradition':'context-dependent',detail:planetInfo(d,c.planet),relative:c.planet===h.lord?'self':REL.relation(d,c.planet,h.lord).compound}));}
 function analyze(d,key){valid(d);const spec=MATTERS[key];if(!spec)throw Error('Unknown derived matter '+key);
  const primary=houseInfo(d,spec.anchor),derivedNum=key==='native_health'||key==='native_wealth'?spec.reference:countFrom(spec.anchor,spec.offset),derived=houseInfo(d,derivedNum);
  if(derivedNum!==spec.reference)throw Error('Bad derived-house configuration for '+key);
  const relatives=[];const uses=key==='native_health'?[1,6,8,12]:key==='native_wealth'?[2,11]:[spec.anchor,derivedNum];
  for(const n of uses)if(n!==primary.house&&n!==derived.house)relatives.push(houseInfo(d,n));
  const karakas=spec.karakas.map(k=>planetInfo(d,k)).filter(Boolean);
  const evidenceHouses=[primary,derived,...relatives.filter(h=>h.house!==primary.house&&h.house!==derived.house)];
  const roots=[...new Set([...evidenceHouses.map(h=>h.lord),...karakas.map(k=>k.planet)])];
  return {key,anchor:spec.anchor,offset:spec.offset,derivedHouse:derivedNum,labelTA:spec.ta,labelEN:spec.en,primary,derived,secondary:relatives,karakas,roots,houseInfluences:evidenceHouses.map(h=>({house:h.house,contacts:influence(d,h)})),source:'natal-D1-bhavat-bhavam-and-naisargika-karaka',caution:key==='native_health'?'no-diagnosis-no-lifespan':key==='native_wealth'?'no-guarantee-of-wealth':'native-chart-does-not-prove-third-party-outcomes'};
 }
 function tag(d,p,ta){const a=planetInfo(d,p),dn=ta?PN[p]:p,hi=a?.house||0,di=ta?(DG[a?.dignity]||'கணிக்கப்படாத நிலை'):a?.dignity,txt=ta?`${dn} ${hi}-ஆம் பாவத்தில் ${di} நிலையில்`:`${dn} in house ${hi} (${di})`;return txt;}
 function contactText(e,ta){const h=e.house,arr=e.contacts.filter(c=>c.kind==='occupies'||c.kind==='aspects').sort((a,b)=>a.kind.localeCompare(b.kind)||a.planet.localeCompare(b.planet));if(!arr.length)return ta?`${h}-ஆம் பாவத்தில் நேரடியாக அமர்ந்த கிரகமோ கணக்கிடப்பட்ட பராசரப் பார்வையோ இல்லை`:`No occupant or computed Parashari aspect on house ${h}`;
  const list=arr.slice(0,3).map(c=>{const name=ta?PN[c.planet]:c.planet,verb=ta?(c.kind==='occupies'?'அமர்ந்திருப்பதும்':'பார்ப்பதும்'):(c.kind==='occupies'?'occupies':'aspects');return ta?`${name} ${verb}`:`${name} ${verb}`;}).join(ta?' / ':', ');
  return ta?`${h}-ஆம் பாவத்தில் ${list} ${arr.length===1?'நேரடித் தொடர்பு அளிக்கிறது':'நேரடித் தொடர்பு அளிக்கின்றன'}`:`House ${h}: ${list}`;
 }
 // A directly occupying/aspecting planet modifies the house assessment
 // according to what it owns here, not simply "benefic=good / malefic=bad".
 const IMPL_TA={Sun:'அதிகாரம், தொழில் பொறுப்பு மற்றும் தந்தை சார்ந்த தேவைகள்',Moon:'குடும்பப் பாதுகாப்பு, உணர்வு மற்றும் வீட்டு தேவைகள்',Mars:'நிலம், செயல்வேகம், உழைப்பு மற்றும் போட்டிச் சூழல்',Mercury:'கணக்கு, ஆவணம், பேச்சு மற்றும் சேவை',Jupiter:'அறிவு, ஆலோசனை, குடும்ப வளம் மற்றும் கல்வி',Venus:'வசதி, கூட்டுறவு, திருமணச் செலவு மற்றும் உறவு',Saturn:'நீண்டகாலப் பொறுப்பு, ஒழுங்கு மற்றும் தாமதம்',Rahu:'வழக்கத்திற்கு மாறான வழிகள் மற்றும் மாற்றம்',Ketu:'ஆராய்ச்சி, விலகல் மற்றும் மறுபரிசீலனை'};
 const IMPL_EN={Sun:'authority and responsibilities',Moon:'family security and home needs',Mars:'land, effort and competition',Mercury:'accounts, documents and services',Jupiter:'knowledge, guidance and resources',Venus:'comfort, partnerships and shared costs',Saturn:'long-term duty, discipline and delays',Rahu:'unconventional approaches',Ketu:'research and withdrawal'};
 function directModifiers(d,house,lang){const ta=lang!=='en',seen=new Set(),arr=influence(d,house).filter(c=>['occupies','aspects'].includes(c.kind)).sort((a,b)=>Number(b.kind==='occupies')-Number(a.kind==='occupies')||a.planet.localeCompare(b.planet));
  const output=[];for(const c of arr){if(seen.has(c.planet))continue;seen.add(c.planet);
   const p=c.planet,detail=c.detail;if(!detail)continue;
   const ruler=detail.owns.join(', ')||'—',func=detail.functional;
   const condition=func==='functional-challenging'?(ta?'செயல்பாட்டு சவாலான ஆதிபத்தியத்துடன்':'with functionally challenging rulership'):
     func==='yogakaraka-candidate'?(ta?'கேந்திர–திரிகோண ஆதிபத்தியத்துடன்':'with a possible angle-trine combination'):
     func==='lagna-primary'?(ta?'லக்னாதிபத்தியத் தொடர்புடன்':'with ascendant rulership'):
     ta?'தனது பாவாதிபத்தியங்களுடன்':'through its natal rulership';
   const nature=['Mars','Saturn','Sun','Rahu','Ketu'].includes(p)?(ta?'இயற்கைப் பாபக் கிரகமாக':'as a naturally challenging graha'):['Jupiter','Venus'].includes(p)?(ta?'இயற்கைச் சுபக் கிரகமாக':'as a natural benefic'):ta?'கலவையான இயற்கைத் தன்மையுடன்':'of context-dependent natural status';
   const move=ta?(c.kind==='occupies'?'இந்தப் பாவத்தில் அமர்ந்து':'இந்தப் பாவத்தைப் பார்த்து'):(c.kind==='occupies'?'occupies this house':'aspects this house');
   output.push(ta?`${PN[p]} ${detail.house}-ஆம் பாவத்திலிருந்து ${move}, ${ruler}-ஆம் பாவங்களின் அதிபதியாக ${nature}, ${condition} ${IMPL_TA[p]} என்ற அம்சத்தைச் சேர்க்கிறார்; ${DG[detail.dignity]} என்ற ராசிபலமும் கணக்கில் வருகிறது.`:
    `${p} ${move} from house ${detail.house}; it rules houses ${ruler}, has ${detail.dignity} dignity and contributes ${IMPL_EN[p]} ${condition}, ${nature}.`);
   if(output.length===2)break;
  }
  return output;
 }
 function reading(d,key,lang='ta',{age=null,compact=false}={}){const ta=lang!=='en',a=analyze(d,key),cfg=MATTERS[key],q=x=>ta?PN[x]:x;
  const site=a.derived.house,primary=a.primary,related=a.derived;
  const intro=key==='native_health'?ta?`உடல்நலம் குறித்து லக்னம் (1), நோய்சார் ஆறாம் பாவம், நீடிக்கும் சவால்களுக்கான எட்டாம் பாவம், பராமரிப்புச் செலவுக்கான பன்னிரண்டாம் பாவம் ஆகியவற்றை தனித்தனியாக ஒப்பிடுகிறோம்.`:`For health, compare the first house (body), sixth (illness themes), eighth (prolonged difficulty) and twelfth (care expenses), rather than inferring a diagnosis.`:
   key==='native_wealth'?ta?`செல்வத்தை மதிப்பிட 2-ஆம் பாவத்தின் சேமிப்பையும் 11-ஆம் பாவத்தின் ஆதாயத்தையும் தனித்தனியாக ஆராய வேண்டும்; குரு இயற்கைச் செல்வக் காரகன்.`:`Financial reading separates second-house resources and savings from eleventh-house gains and uses Jupiter as wealth karaka.`:
   ta?`${cfg.ta} என்பது ${a.anchor}-ஆம் பாவத்தால் குறிக்கப்படும் உறவிலிருந்து இரண்டாம் பாவத்தை எண்ணும் பாவாத்-பாவ முறையில் ${site}-ஆம் பாவமாகிறது; இது ஜாதகரின் அனுபவத்தைக் குறிக்கும் மரபுவழிப் பார்வையே தவிர அந்த உறவினரின் உண்மையான சொத்து மதிப்பல்ல.`:
   `${cfg.en} uses the second counted from relative-house ${a.anchor}, i.e., native house ${site}. This is a traditional family-context reference, not evidence of the relative's actual financial status.`;
  const facts=ta?`${primary.house}-ஆம் பாவாதிபதி ${q(primary.lord)} ${primary.lordInfo.house}-ஆம் பாவத்தில் ${DG[primary.lordInfo.dignity]}; ${related.house}-ஆம் பாவாதிபதி ${q(related.lord)} ${related.lordInfo.house}-ஆம் பாவத்தில் ${DG[related.lordInfo.dignity]}.`:
   `House ${primary.house} ruler ${tag(d,primary.lord,false)}; house ${related.house} ruler ${tag(d,related.lord,false)}.`;
  const ka=a.karakas.map(k=>tag(d,k.planet,ta)).join(ta?'; ':', ');
  const kText=ta?`இயற்கைக் காரகக் குறிப்புகள்: ${ka}.`:`Natural significators considered: ${ka}.`;
  const exposure=contactText({house:a.derived.house,contacts:influence(d,a.derived)},ta),baseContact=contactText({house:a.primary.house,contacts:influence(d,a.primary)},ta);
  const contacts=ta?`${baseContact}; ${related.house!==primary.house?exposure:''}.`:`${baseContact}; ${related.house!==primary.house?exposure:''}.`;
  const specialHealth=key==='native_health'?(ta?`எட்டாம் பாவாதிபதி ${PN[d.houses[7].lord]} ${d.planets[d.houses[7].lord].house}-ஆம் பாவத்தில் ${DG[REL.dignity(d,d.planets[d.houses[7].lord]).state]} நிலையில் உள்ளார்; பன்னிரண்டாம் பாவாதிபதி ${PN[d.houses[11].lord]} ${d.planets[d.houses[11].lord].house}-ஆம் பாவத்தில் உள்ளார். ${contactText({house:8,contacts:influence(d,houseInfo(d,8))},ta)}.`:
    `Eighth ruler ${tag(d,d.houses[7].lord,false)}; twelfth ruler ${tag(d,d.houses[11].lord,false)}. ${contactText({house:8,contacts:influence(d,houseInfo(d,8))},ta)}.`):'';
  const direct=directModifiers(d,related,lang);
  const differentiated= key==='native_wealth'?ta?`ஒரு பாவம் வலிமையாகவும் மற்றது பலவீனமாகவும் இருந்தால் வருமானம் வருவதையும் அதைச் சேமிப்பதையும் ஒரே பலனாகச் சொல்லக் கூடாது.`:`The ability to gain income and preserve savings are not identical outcomes.`:
    key==='native_health'?ta?`ஆறாம் பாவத்தின் சவால், எட்டாம் பாவத்தின் நீடிக்கும் பிரச்சினை, பன்னிரண்டாம் பாவத்தின் பராமரிப்புச் செலவு ஆகியவை ஒன்றல்ல. இவை நோய் ஏற்படும் என்று நிரூபிப்பதில்லை; அறிகுறிகளுக்கு மருத்துவரே சரியான வழி.`:`Sixth-house challenges, eighth-house long-running concerns and twelfth-house expenses differ. They cannot diagnose disease; seek clinical assessment for symptoms.`:
    ta?`இந்தக் குறிப்பு ${cfg.ta} பற்றிய நேரடி உறுதிமொழியல்ல; தனிநபரின் செல்வத்தை அறிய அவருடைய சொந்தத் தரவுகள் தேவை.`:`This does not establish another person's wealth; their own real-world circumstances are needed.`;
  // Conditional synthesis: distinct support/strain readings from actual
  // house-lord and karaka dignity. This is NOT a life-outcome prediction.
  const good=new Set(['exalted','own','moolatrikona','friend']);
  const bad=new Set(['debilitated','enemy']);
  const primaryGood=good.has(primary.lordInfo.dignity),derivedGood=good.has(related.lordInfo.dignity);
  const primaryWeak=bad.has(primary.lordInfo.dignity),derivedWeak=bad.has(related.lordInfo.dignity);
  const karakaGood=a.karakas.some(k=>good.has(k.dignity));
  let comparison='';
  if(key==='native_health'){
   comparison=ta?`லக்னாதிபதி ${primaryGood?'ராசி அடிப்படையில் வலிமையான நிலையில்':'முழு வலிமை நிர்ணயிக்கப்படாத நிலையில்'} இருக்கிறார்; ஆறாம் அதிபதி ${derivedGood?'தன் செயல்பாட்டை வலுவாக வெளிப்படுத்தும் நிலையில்':derivedWeak?'ராசிப் பலத்தில் சவாலான நிலையில்':'கலவையான ராசிபலத்தில்'} இருப்பது நோய் உறுதிப்பாடாகவோ முழு பாதுகாப்பாகவோ கருதப்படாது.`:
   `The ascendant lord is ${primaryGood?'strong by sign':'not confirmed strong by sign'} and the sixth ruler is ${derivedGood?'strong by sign':derivedWeak?'in a challenging sign':'of mixed sign status'}; neither establishes illness or immunity.`;
  }else if(primaryGood&&derivedGood&&karakaGood){
   comparison=ta?`${primary.house}, ${related.house} பாவாதிபதிகளும் குறைந்தது ஒரு இயற்கைக் காரகனும் ராசி அடிப்படையில் ஆதரவான நிலையில் உள்ளதால் ${cfg.taGood} என்ற வாசிப்புக்கு பல தொடர்புகள் இருக்கின்றன. ஆனால் இவை தனித்த சான்றுகளா என்பதையும் பார்க்க வேண்டும்.`:
    `The two house rulers and at least one karaka have supportive sign dignity, offering multiple traditional links to ${cfg.enGood}, subject to shared-root checking.`;
  }else if(primaryGood&&derivedWeak){
   comparison=ta?`${primary.house}-ஆம் பாவாதிபதியின் ராசிபலம் ஆதரவாக இருந்தாலும் ${related.house}-ஆம் பாவாதிபதி சவாலான ராசியில் இருப்பதால் ${cfg.taRisk} என்ற முரண்பாட்டைத் தவிர்த்து நேரடி செல்வ உறுதிமொழி கூற முடியாது.`:
    `The primary ruler has supportive sign dignity, but the derived ruler is challenged: consider ${cfg.enRisk} rather than promising financial strength.`;
  }else if(primaryWeak&&derivedGood){
   comparison=ta?`${primary.house}-ஆம் பாவாதிபதி சவாலான ராசியில் இருந்தாலும் ${related.house}-ஆம் அதிபதி ஆதரவாக இருக்கிறார்; உறவு/குடும்பப் பொறுப்பும் வள நிர்வாகமும் ஒன்றே எனக் கருதக்கூடாது.`:
    `The primary ruler is challenged while the derived ruler is supported; the relationship context and resource management need distinct readings.`;
  }else if(primaryWeak&&derivedWeak){
   comparison=ta?`இரு பாவாதிபதிகளின் ராசிபலமும் சவாலான நிலையில் இருப்பதால் ${cfg.taRisk} என்ற நடைமுறைச் சுமையைச் சோதிக்கலாம்; இதனால் இழப்பு நிச்சயம் என்று பொருளல்ல.`:
    `Both rulers have challenging sign dignity; examine ${cfg.enRisk} without predicting certain loss.`;
  }else {
   comparison=ta?`பாவாதிபதிகளின் ராசிபலம் மட்டும் ஒன்றுபட்ட முடிவு தராததால் ${cfg.taGood} மற்றும் ${cfg.taRisk} இரண்டையும் சூழலுக்கேற்ப மதிப்பிட வேண்டும்.`:
    `The two rulers do not give a uniform sign-strength result; examine ${cfg.enGood} alongside ${cfg.enRisk}.`;
  }
  const lifeStage=['spouse_wealth','child_wealth'].includes(key)?(ta?'இந்தக் காரகத்துவம் ஜாதகரின் வாழ்க்கையில் தொடர்புடைய உறவு அல்லது பொறுப்பு உண்மையில் உருவாகும்போதுதான் பொருத்திப் பார்க்கப்பட வேண்டும்.':'Apply this topic only when the relationship or responsibility is actually part of the native’s life.') : '';
  const stage=Number.isFinite(age)&&age<18?(ta?'ஜாதகர் சிறுவர் என்பதால் இதை தற்போதைய தனிப்பட்ட வருமானம், திருமணம் அல்லது குழந்தைகள் பற்றிய நிகழ்வாகப் படிக்காமல் குடும்பத்தின் பராமரிப்பு மற்றும் எதிர்காலத் திட்டமாகக் கொள்ள வேண்டும்.':'As the native is a minor, this concerns caregiver arrangements and future planning, not current earnings, marriage or parenthood.') : '';
  const possible=ta?`ஆதரவான வாசிப்பில் ${cfg.taGood} முன்னிலையாகலாம்; சவாலான வாசிப்பில் ${cfg.taRisk} கவனிக்கத்தக்கது. கிரகநிலை மட்டும் நிகழ்வை உறுதி செய்யாது.`:
   `A possible supportive theme is ${cfg.enGood}; a competing caution is ${cfg.enRisk}. These placements do not guarantee events.`;
  // Avoid overstating duplicate evidence: a lord who is also the natural
  // significator is one root, not two independent confirmations.
  const repeat=ta&&a.karakas.some(k=>k.planet===primary.lord||k.planet===related.lord)?'பாவாதிபதியும் காரகனும் ஒரே கிரகமாக இருந்தால் அதை இரு தனித்த ஆதாரமாக எண்ணக்கூடாது.':!ta&&a.karakas.some(k=>k.planet===primary.lord||k.planet===related.lord)?'A ruler who is also a karaka is not an independent second confirmation.':'';
  const para=[intro,facts,kText,contacts,specialHealth,...(!compact?[...direct,comparison,possible,differentiated,repeat,lifeStage,stage]:[lifeStage,stage])].filter(Boolean).join(' ');
  return {text:para,evidence:a,source:'d1-derived-matters'};
 }
 function forFocus(d,focus,lang='ta',opts={}){return (PER_FOCUS[focus]||[]).map(k=>reading(d,k,lang,opts));}
 function periodNote(d,key,active,lang='ta',age=null){const a=analyze(d,key),ta=lang!=='en',ops=[...new Set(Array.isArray(active)?active:[active])].filter(x=>d.planets[x]);if(!ops.length)return {text:'',activated:false,source:'d1-derived-period'};
  const relevant=[...new Set([a.primary.house,a.derived.house,...a.secondary.map(h=>h.house)])];
  const hits=ops.map(k=>({planet:k,why:[...(a.roots.includes(k)?['ruler-or-karaka']:[]),...(relevant.filter(h=>d.planets[k].house===h).map(h=>'occupies-'+h)),...(relevant.filter(h=>REL.aspectHouse(d,k,h)).map(h=>'aspects-'+h))]})).filter(z=>z.why.length);
  if(!hits.length)return {text:'',activated:false,evidence:a,source:'d1-derived-period'};
  // Age guard: do not introduce spouse's income or children's finances as
  // an active life event in a minor's dasha/transit merely via karaka.
  if(Number.isFinite(age)&&age<18&&['spouse_wealth','child_wealth'].includes(key))
   return {text:'',activated:false,evidence:a,reason:'minor-no-adult-family-events'};
  const lead=hits[0],area=ta?MATTERS[key].ta:MATTERS[key].en;
  const minor=Number.isFinite(age)&&age<18;
  const detail=ta?`${PN[lead.planet]} இந்தச் செய்திக்குரிய பாவம்/காரகத் தொடர்பில் (${lead.why.join(', ')}) இருப்பதால் ${area} சார்ந்த குடும்ப முடிவுகளை பரிசீலிக்கும் மரபுவழிக் குறிப்பு உள்ளது.`:
   `${lead.planet} actually links to ${area} (${lead.why.join(', ')}); this is a traditional contextual signal, not a predicted event.`;
  const safety=minor?(ta?'சிறுவர் வயதில் இதை பெற்றோர் மேற்கொள்ளும் பராமரிப்பு மற்றும் நிதித் திட்டங்களுக்குரியதாக மட்டுமே கொள்ள வேண்டும்.':'For a minor this applies to caregiver planning, not adult finances or marriage.'):
   key==='native_health'?(ta?'இதன்மூலம் நோய், நீண்டகால பாதிப்பு அல்லது ஆயுள் காலத்தை உறுதியாகக் கணிக்க முடியாது.':'No disease, chronic diagnosis or lifespan can be inferred.'):
   key!=='native_wealth'?(ta?'உறவினரின் உண்மையான செல்வத்தை இதனால் உறுதி செய்ய முடியாது.':'The relative’s actual finances are not established.') : '';
  return {text:[detail,safety].filter(Boolean).join(' '),activated:true,evidence:{...a,hits,source:'d1-derived-period'}};
 }
 return Object.freeze({MATTERS,PER_FOCUS,countFrom,analyze,reading,forFocus,periodNote,version:'276-derived-relative-wealth-health'});
});
