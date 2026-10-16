/* SMV ASTRO — canonical ordered horoscope-life-engine.js; no source version in path. */

/* ---- d1-relationships.js (preserves original execution order) ---- */
/* SMV ASTRO V274 — Parashari D1 relational evidence (offline, deterministic).
   D1 only: house ownership, sign dignity, directional planetary friendship,
   temporary and compound friendship, classical aspects, conjunction, cross-houses.
   No invented nodal drishti, certainty of disease/death, remote calls or cache.
   Exact moolatrikona and deep-exaltation require a real longitude; otherwise unknown.
*/
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1Relationships=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const PN=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 const NAMES={Sun:['சூரியன்','Sun'],Moon:['சந்திரன்','Moon'],Mars:['செவ்வாய்','Mars'],Mercury:['புதன்','Mercury'],Jupiter:['குரு','Jupiter'],Venus:['சுக்கிரன்','Venus'],Saturn:['சனி','Saturn'],Rahu:['ராகு','Rahu'],Ketu:['கேது','Ketu']};
 const Z=[['மேஷம்','Aries'],['ரிஷபம்','Taurus'],['மிதுனம்','Gemini'],['கடகம்','Cancer'],['சிம்மம்','Leo'],['கன்னி','Virgo'],['துலாம்','Libra'],['விருச்சிகம்','Scorpio'],['தனுசு','Sagittarius'],['மகரம்','Capricorn'],['கும்பம்','Aquarius'],['மீனம்','Pisces']];
 const EX={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const DE={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
 const OWN={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 // Sign index, degree ranges. Moolatrikona practices vary by school: chosen Parashari convention.
 const MOOLA={Sun:[4,0,20],Moon:[1,4,30],Mars:[0,0,12],Mercury:[5,16,20],Jupiter:[8,0,10],Venus:[6,0,15],Saturn:[10,0,20]};
 const DEEP_EX={Sun:10,Moon:3,Mars:28,Mercury:15,Jupiter:5,Venus:27,Saturn:20};
 const DR={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10],Rahu:[],Ketu:[]};
 const NATURAL={Sun:{friend:['Moon','Mars','Jupiter'],enemy:['Venus','Saturn']},Moon:{friend:['Sun','Mercury'],enemy:[]},Mars:{friend:['Sun','Moon','Jupiter'],enemy:['Mercury']},Mercury:{friend:['Sun','Venus'],enemy:['Moon']},Jupiter:{friend:['Sun','Moon','Mars'],enemy:['Mercury','Venus']},Venus:{friend:['Mercury','Saturn'],enemy:['Sun','Moon']},Saturn:{friend:['Mercury','Venus'],enemy:['Sun','Moon','Mars']}};
 const HOUSE_TA=['உடல், குணம், தன்முனைப்பு','பேச்சு, குடும்பச் சேமிப்பு','முயற்சி, திறமை, உடன்பிறப்பு','வீடு, மனநிம்மதி, தாயார்','கல்வி, அறிவு, குழந்தைகள்','சேவை, போட்டி, கடன்','உறவு, துணைவர், ஒப்பந்தம்','திடீர் மாற்றம், ஆயுள் ஆய்வு','வழிகாட்டுதல், நம்பிக்கை, கல்வி','தொழில், கடமை, அதிகாரம்','ஆதாயம், தொடர்புகள், இலக்கு','செலவு, தனிமை, ஓய்வு'];
 const HOUSE_EN=['body, identity and initiative','family speech and savings','effort, skills and siblings','home, emotional ease and mother','study, judgement and children','service, competition and debt','relationships and agreements','change and longevity factors','mentorship, principles and study','career, duties and authority','gains, networks and aims','spending, privacy and rest'];
 const PLANET_TA={Sun:'அதிகாரம், அடையாளம், தலைமை',Moon:'உணர்வுகள், பராமரிப்பு, மனநிலை',Mars:'துணிவு, தசை ஆற்றல், செயல்வேகம்',Mercury:'பேச்சு, வணிகம், கணக்கு',Jupiter:'அறிவு, வழிகாட்டுதல், விவேகம்',Venus:'உறவு, கலை, வசதி',Saturn:'ஒழுங்கு, பொறுமை, கடமை',Rahu:'புதுமை மற்றும் வழக்கமற்ற முயற்சி',Ketu:'ஆழ்ந்த ஆய்வு மற்றும் விலகல்'};
 const PLANET_EN={Sun:'authority, identity and leadership',Moon:'emotion, care and responsiveness',Mars:'courage, physical effort and initiative',Mercury:'speech, commerce and detail checking',Jupiter:'knowledge, mentoring and judgement',Venus:'relationship skills, art and comfort',Saturn:'discipline, patience and duties',Rahu:'novel approaches and unconventional interests',Ketu:'discernment and detachment'};
 const OUTCOME_TA=[
 ['சுயமாக முடிவெடுக்கும் பண்பும் உடல் செயல்வேகமும்','அளவுக்கு மீறிய உறுதியால் பிறர் ஆலோசனையைப் புறக்கணிக்கும் போக்கும்'],
 ['வரவு–செலவை குடும்பத்துடன் தெளிவாகப் பகிர்ந்து சேமிப்பை அமைக்கும் திறனும்','பேச்சின் கடுமையால் பணம் அல்லது குடும்பம் சார்ந்த முரண்பாடும்'],
 ['சிக்கலான வேலைகளைத் தானே முயன்று திறனாக மாற்றும் இயல்பும்','ஒத்துழைப்பு இல்லாதபோது முயற்சியில் ஏற்படும் அவசரமும்'],
 ['வீட்டிற்குத் தேவையான பாதுகாப்பு, சொத்து திட்டமிடலில் ஈடுபாடும்','வெளிப் பொறுப்பை வீட்டிற்குள் கொண்டுவருவதால் ஏற்படும் கருத்து வேறுபாடும்'],
 ['கற்றதை நடைமுறையில் பயன்படுத்தி சிந்தனையைத் தெளிவாக்கும் விருப்பமும்','படிப்பு அல்லது குழந்தைகள் சார்ந்த முடிவுகளில் அதிகக் கட்டுப்பாடும்'],
 ['போட்டிகளை ஒழுங்காகச் சமாளித்து அன்றாடக் கடமையை முடிக்கும் வலிமையும்','வேலைச்சுமை அல்லது கடன் பொறுப்பை அளவுக்கு மீறி ஏற்றுக்கொள்ளும் நிலையும்'],
 ['துணைவர் மற்றும் கூட்டாளியுடன் பொறுப்பைப் பகிரும் திறனும்','ஒருவரின் முடிவை மற்றவர் கட்டாயம் ஏற்க வேண்டும் என்ற எதிர்பார்ப்பும்'],
 ['திடீர் மாற்றத்தில் வழிமாற்றைக் கண்டறியும் முயற்சியும்','தகவல் முழுமையில்லாமல் அபாயமான முடிவுக்கு விரையும் போக்கும்'],
 ['வழிகாட்டுதல், ஆராய்ச்சி, கொள்கை சார்ந்த முயற்சியும்','தன்னுடைய நம்பிக்கையில் பிறர் கருத்துக்கு இடம் தராத போக்கும்'],
 ['தொழிலில் பொறுப்பு ஏற்று திட்டத்தைச் செயல்படுத்தும் திறனும்','அதிகாரப் போட்டி அல்லது ஓய்வற்ற வேலைச்சுமையும்'],
 ['திறமைக்கேற்ற வருமான வழிகளையும் நம்பகமான தொடர்புகளையும் உருவாக்கும் முயற்சியும்','ஆதாயத்தை மட்டுமே நோக்கி கூடுதல் பொறுப்பை ஏற்கும் போக்கும்'],
 ['ஓய்வு, தனிநேரம் மற்றும் செலவுத் திட்டத்தைச் சீரமைக்கும் முயற்சியும்','வேலை அல்லது கவலையைத் தனிநேரத்திலும் சுமக்கும் பழக்கமும்']
 ];
 const OUTCOME_EN=[
 ['self-direction and willingness to act','ignoring advice through excessive certainty'],['clear family money decisions and saving habits','harsh speech over money or relatives'],['initiative in mastering hard skills','impatience with collaborators'],['planned home and property responsibilities','bringing work demands into the home'],['practical learning and thoughtful guidance','controlling study or child-related choices'],['organised handling of duties and competition','overwork and excessive borrowing'],['cooperation and shared commitments','insisting on unilateral decisions'],['adaptability in difficult transitions','rushing a decision without enough evidence'],['investigation, mentorship and principled learning','rigidity in beliefs'],['responsible leadership and project completion','power struggles and exhaustion'],['dependable networks and income goals','taking risks purely for gains'],['planned rest and spending','continuing to carry workplace worries in private']
 ];
 const LAGNA_STYLE_TA=[
  'மேஷத்தின் சர நெருப்புத் தன்மை முன்வந்து செயல்படும் வேகத்தைக் குறிக்கிறது.',
  'ரிஷபத்தின் நிலையான பூமித் தன்மை மெதுவாகத் தீர்மானித்து நீண்டகாலம் காத்திருக்கும் முயற்சியைக் குறிக்கிறது.',
  'மிதுனத்தின் உபய காற்றுத் தன்மை தகவலைப் பரிமாறி மாற்று வழிகளை ஆராயும் பாங்கைக் குறிக்கிறது.',
  'கடகத்தின் சர நீர்த் தன்மை குடும்பம், பாதுகாப்பு, உணர்ச்சிப் பதிலை மையப்படுத்துகிறது.',
  'சிம்மத்தின் நிலையான நெருப்புத் தன்மை தன்மானம் மற்றும் தலைமைப் பொறுப்பை வலுப்படுத்துகிறது.',
  'கன்னியின் உபய பூமித் தன்மை விவரப் பரிசோதனை, பயிற்சி, ஒழுங்கை முதன்மைப்படுத்துகிறது.',
  'துலாத்தின் சர காற்றுத் தன்மை கருத்துப் பரிமாற்றம், சமரசம், கூட்டுறவை முன்வைக்கிறது.',
  'விருச்சிகத்தின் நிலையான நீர்த் தன்மை ஆழம், நெருக்கடி எதிர்கொள்ளுதல், தனிப்பட்ட கட்டுப்பாட்டைக் குறிக்கிறது.',
  'தனுசின் உபய நெருப்புத் தன்மை தேடல், கல்வி, நம்பிக்கையோடு செயல்படுதலைக் குறிக்கிறது.',
  'மகரத்தின் சர பூமித் தன்மை கட்டமைப்பு, கடமை, நீண்டகால முயற்சியை முன்வைக்கிறது.',
  'கும்பத்தின் நிலையான காற்றுத் தன்மை சமூக நோக்கம், தனிப்பட்ட கோட்பாடு, திட்டமிடலைக் குறிக்கிறது.',
  'மீனத்தின் உபய நீர்த் தன்மை கற்பனை, இரக்கம், ஆழ்ந்த சிந்தனையை முன்வைக்கிறது.'
 ];
 const LAGNA_STYLE_EN=[
  'Cardinal fire Aries emphasises initiative and quick engagement.',
  'Fixed earth Taurus emphasises consistency and patient commitment.',
  'Mutable air Gemini favours information exchange and alternative routes.',
  'Cardinal water Cancer foregrounds security, family and emotional response.',
  'Fixed fire Leo emphasises dignity and responsible leadership.',
  'Mutable earth Virgo favours detail checking, training and order.',
  'Cardinal air Libra foregrounds cooperation and negotiation.',
  'Fixed water Scorpio emphasises depth, resilience and self-control.',
  'Mutable fire Sagittarius emphasises learning and the search for principles.',
  'Cardinal earth Capricorn emphasises structure, duties and sustained effort.',
  'Fixed air Aquarius values shared goals, independence and systems.',
  'Mutable water Pisces emphasises imagination, empathy and introspection.'
 ];
 const LABEL_TA={exalted:'உச்சம்',debilitated:'நீசம்',moolatrikona:'மூலத்திரிகோணம்',own:'ஆட்சி',friend:'நட்பு ராசி',enemy:'பகை ராசி',neutral:'சம ராசி',undetermined:'கணிக்கப்படாத ராசிபலம்'};
 const LABEL_EN={exalted:'exalted',debilitated:'debilitated',moolatrikona:'moolatrikona',own:'own sign',friend:'friendly sign',enemy:'inimical sign',neutral:'neutral sign',undetermined:'undetermined sign dignity'};
 const C_REL_TA={'great-friend':'அதிநட்பு',friend:'நட்பு',neutral:'சமம்',enemy:'பகை','great-enemy':'அதிபகை',unknown:'கணிக்க இயலாது'};
 const C_REL_EN={'great-friend':'great friendship',friend:'friendship',neutral:'neutrality',enemy:'enmity','great-enemy':'great enmity',unknown:'unknown'};
 const n=(a,b)=>(((a-b)%12)+12)%12+1;
 function natural(a,b){const r=NATURAL[a];if(!r||!NATURAL[b])return 'unknown';return r.friend.includes(b)?'friend':r.enemy.includes(b)?'enemy':'neutral';}
 function temporary(d,a,b){if(!d.planets[a]||!d.planets[b])return 'unknown';return [2,3,4,10,11,12].includes(n(d.planets[b].sign,d.planets[a].sign))?'friend':'enemy';}
 function compound(x,y){if(x==='unknown'||y==='unknown')return 'unknown';const v={friend:1,neutral:0,enemy:-1}[x]+(y==='friend'?1:-1);return ({2:'great-friend',1:'friend',0:'neutral','-1':'enemy','-2':'great-enemy'})[v];}
 function relation(d,a,b){const nat=natural(a,b),temp=temporary(d,a,b);return {natural:nat,temporary:temp,compound:compound(nat,temp)};}
 function absoluteDegree(p){return Number.isFinite(p?.longitude)&&p.longitude>=0&&p.longitude<360?p.longitude%30:null;}
 function dignity(d,p){if(!p||!OWN[p.key])return {state:'undetermined',degreeKnown:false,signLord:null};const s=p.sign,deg=absoluteDegree(p),owner=PN[s];const rule=MOOLA[p.key];let state;
 if(deg!==null&&rule[0]===s&&deg>=rule[1]&&deg<rule[2])state='moolatrikona';
 else if(EX[p.key]===s)state='exalted';
 else if(DE[p.key]===s)state='debilitated';
 else if(OWN[p.key].includes(s))state='own';
 else state=natural(p.key,owner);const exact=state==='exalted'&&deg!==null&&Math.abs(deg-DEEP_EX[p.key])<0.5;
 return {state,signLord:owner,degreeKnown:deg!==null,degreeInSign:deg,deepExaltation:exact,dispositorFriendship:relation(d,p.key,owner)};}
 function ownership(d,k){if(!d.planets[k])return [];return d.houses.filter(h=>h.lord===k).map(h=>h.no);}
 function groups(h){const out=[];if([1,4,7,10].includes(h))out.push('kendra');if([1,5,9].includes(h))out.push('trikona');if([6,8,12].includes(h))out.push('dusthana');if([3,6,10,11].includes(h))out.push('upachaya');if([2,11].includes(h))out.push('wealth');if([3,7,11].includes(h))out.push('effort-partnership-gains');return out;}
 function touches(d,a,b){const p=d.planets[a];if(!p||!d.planets[b])return [];const x=d.planets[b],v=[];if(p.house===x.house&&a!==b)v.push('conjunction');for(const dist of DR[a]||[])if((p.house+dist-2)%12+1===x.house)v.push('aspect');return v;}
 function aspectHouse(d,a,h){const p=d.planets[a];return p?DR[a]?.some(dist=>(p.house+dist-2)%12+1===h):false;}
 function analyze(d,focus){if(!d||!Array.isArray(d.houses)||!d.planets||!Number.isInteger(focus)||focus<1||focus>12)throw Error('D1 12-house positions required.');const house=d.houses[focus-1],lord=d.planets[house.lord];if(!lord)throw Error('Missing lord '+house.lord);const owners=ownership(d,house.lord),lordState=dignity(d,lord);
 const contacts=Object.values(d.planets).filter(p=>p.key!==lord.key&&NATURAL[p.key]).flatMap(p=>{
 const hit=[];if(p.house===focus)hit.push('in-house');if(aspectHouse(d,p.key,focus))hit.push('house-aspect');hit.push(...touches(d,p.key,lord.key).map(s=>s==='aspect'?'lord-aspect':'lord-conjunction'));
 if(!hit.length)return [];const from=ownership(d,p.key),pr=relation(d,p.key,lord.key);return [{planet:p.key,planetHouse:p.house,sourceHouses:from,dignity:dignity(d,p),relationship:pr,reciprocal:relation(d,lord.key,p.key),hits:[...new Set(hit)],groups:[...new Set(from.flatMap(groups))]}];}).sort((a,b)=>{const rank=x=>x.hits.includes('lord-aspect')?7:x.hits.includes('lord-conjunction')?7:x.hits.includes('house-aspect')?6:4;const dg=x=>({exalted:3,moolatrikona:2,own:2,debilitated:-2}[x.dignity.state]||0);return (rank(b)+dg(b))-(rank(a)+dg(a))||a.planet.localeCompare(b.planet);});
 const lordAspects=[];for(let h=1;h<=12;h++)if(aspectHouse(d,lord.key,h))lordAspects.push(h);
 const crossGroups=[];
 for(const [key,need] of [['wealth',[2,11]],['effort-partnership-gains',[3,7,11]],['difficult',[6,8,12]],['kendra-trikona',[1,4,5,7,9,10]]]){
  const connected=need.filter(h=>h!==focus&&(lord.house===h||lordAspects.includes(h)||contacts.some(c=>c.sourceHouses.includes(h))));if(connected.length)crossGroups.push({key,houses:connected});
 }
 return {focus,house,owner:house.lord,ownerPosition:lord.house,ownerSign:lord.sign,ownerOwnership:owners,ownerDignity:lordState,ownerAspects:lordAspects,contacts,crossGroups,houseClasses:groups(focus),planetNature:lord.key};
 }
 const extraMarsAries={
  1:{ta:'மேஷ லக்னத்தின் நெருப்புத் தன்மையும், அதன் அதிபதி செவ்வாயின் தசை இயக்கம்–துணிவுக் காரகத்துவமும், மகர உச்சத்தின் ஒழுங்கும் இங்கே ஒன்றாகின்றன. பத்தாம் பாவத்திலிருந்து செவ்வாய் நான்காம் பார்வையால் லக்னத்தைத் தொடுவதால் உடல் முயற்சியில் உறுதி, நிமிர்ந்த செயல்பாடு, நீடித்த பயிற்சியை விரும்பும் மனநிலை ஆகியவை பாரம்பரிய வாசிப்பில் முன்னிலைப்படும். செயல்வேகத்துடன் பிடிவாதம் அல்லது அளவுக்கு மீறிய உழைப்பும் இணைந்திருக்கலாம். லக்னமும் எட்டாம் பாவமும் ஒரே செவ்வாயின் ஆட்சியில் இருப்பது ஆயுள் ஆய்வில் ஒரு ஆதாரம்; இதனால் நோய் எதிர்ப்புச் சக்தி, இளமையான தோற்றம் அல்லது நீண்ட ஆயுள் உறுதி என்று முடிவு செய்ய முடியாது.',en:'Aries initiates and Mars signifies muscular effort and courage; exaltation in Capricorn adds discipline. From the tenth house Mars casts its fourth aspect on the ascendant, giving traditional grounds to discuss sustained physical initiative and a purposeful bearing, alongside overwork or inflexibility. Mars rules both first and eighth houses, so longevity analysis must consider both roles; this placement cannot establish physical immunity, youthful appearance or lifespan.'},
  4:{ta:'மகரச் செவ்வாயின் ஏழாம் பார்வை கடகமான நான்காம் பாவத்தைத் தொடுவதால் தொழிலில் காட்டும் செயல்வேகமும் வீட்டில் ஏற்பாடு–பாதுகாப்பு பற்றிய தீர்மானங்களும் இணைகின்றன. சொத்து அல்லது வீட்டுப் பணிகளை முன்வந்து நடத்தும் விருப்பம் இருக்கலாம்; அதே அதிகாரப் பாணியை குடும்ப உரையாடலிலும் பயன்படுத்தினால் மன அமைதி குறையக்கூடும். சந்திரனின் நிலை தெரியாமல் தாயாரின் உடல்நிலை பற்றி முடிவு செய்யக் கூடாது.',en:'Mars in Capricorn directly aspects Cancer, the fourth house. Practical drive may shape property and home arrangements, while a controlling tone carried over from work may disturb domestic ease. The mother’s health cannot be inferred without separate evidence.'},
  5:{ta:'உச்ச செவ்வாயின் எட்டாம் பார்வை சிம்மமான ஐந்தாம் பாவத்தைத் தொடுகிறது. செய்முறை அறிவு, போட்டிப் பயிற்சி, திட்டமிட்டு கற்றதைப் பயன்படுத்துதல் போன்ற வழிகளில் முயற்சி வெளிப்படலாம்; அதே உறுதியால் கல்வி அல்லது குழந்தைகள் சார்ந்த முடிவுகளில் தேவைக்கு அதிகக் கட்டுப்பாடு உருவாகலாம். குழந்தைப்பேறு பற்றிய உறுதியான முடிவு இப்பார்வையால் மட்டும் வராது.',en:'Exalted Mars aspects Leo, the fifth, by its eighth aspect: applied learning, competitive training and problem-solving may be emphasised, with a risk of imposing excessive control over study or children. This does not establish fertility outcomes.'},
  10:{ta:'மேஷத்தின் லக்னாதிபதியும் எட்டாம் அதிபதியுமான செவ்வாய் பத்தாம் கேந்திரத்தில் மகர உச்சம் பெறுகிறார். ருசக மகாபுருஷ யோகமும் பத்தாம் பாவத் திக்பலமும் செயல்–பொறுப்பை முன்னிலைப்படுத்துகின்றன; தொழிலில் கடின வேலையையும் நெருக்கடியையும் கையாளும் விருப்பமாகப் படிக்கலாம். ஆனால் எட்டாம் ஆதிபத்தியத்தையும், மகர அதிபதி சனியின் தனிப்பட்ட நிலையையும் பார்க்காமல் பதவி அல்லது தொழில் வெற்றி நிச்சயம் என்று கூறக்கூடாது.',en:'As ruler of Aries and Scorpio, Mars in exalted Capricorn occupies the tenth, forming a Ruchaka mahapurusha-yoga condition and gaining directional strength. Responsibility and crisis-handling may become salient, but its eighth-house rulership and the unknown Saturn dispositor mean no promotion or guaranteed career outcome can be claimed.'}
 };
 function specialMars(d,focus){return d.lagna===0&&d.planets.Mars?.sign===9&&d.planets.Mars?.house===10&&aspectHouse(d,'Mars',1)&&extraMarsAries[focus]||null;}
 function narration(d,focus,lang='ta',{onlyPlanet=null,brief=false}={}){const ta=lang!=='en',a=analyze(d,focus),lord=a.owner,lc=a.ownerDignity,sign=Z[a.ownerSign][ta?0:1],p=NAMES[lord][ta?0:1],strength=(ta?LABEL_TA:LABEL_EN)[lc.state],thing=(ta?HOUSE_TA:HOUSE_EN)[focus-1],owners=a.ownerOwnership.join(', '),contact=a.contacts.find(c=>!onlyPlanet||c.planet===onlyPlanet);
 const special=(!onlyPlanet&&specialMars(d,focus));
 if(special){if(brief)return {text:special[ta?'ta':'en'],evidence:a};const c=contact;return {text:special[ta?'ta':'en']+(c?' '+contactLine(d,a,c,ta):''),evidence:a};}
 const positive=ta?OUTCOME_TA[focus-1][0]:OUTCOME_EN[focus-1][0],caution=ta?OUTCOME_TA[focus-1][1]:OUTCOME_EN[focus-1][1];
 const lordFact=ta?`${focus}-ஆம் பாவத்தின் அதிபதி ${p} ${sign} ராசியில் ${a.ownerPosition}-ஆம் பாவத்தில் ${strength} நிலையில் உள்ளார். இவர் ${a.ownerOwnership.map(h=>h+"-ஆம்").join(", ")} பாவங்களுக்கு அதிபதி.`:`House ${focus} ruler ${p} occupies ${sign}, house ${a.ownerPosition}, with ${strength} dignity and rules houses ${owners}.`;
 const angle=a.ownerPosition===focus?'root':a.ownerAspects.includes(focus)?'aspect':'other';
 const con=angle==='aspect'?(ta?'பாவாதிபதி தன் பாவத்தை நேரடியாகப் பார்ப்பதால் அதன் செயல்விளைவுக்கான ஜோதிடத் தொடர்பு வலுவாகிறது.':'The ruler directly aspects its own house, strengthening this traditional link.'):
 angle==='root'?(ta?'பாவாதிபதி அதே பாவத்தில் இருப்பதால் அதன் காரகத்துவங்கள் நேரடியாக வெளிப்படலாம்.':'The ruler occupies its own house, making its themes more immediate.'):(ta?'இந்த நிலையை மட்டுமே வைத்து குறிப்பிட்ட நிகழ்வை முடிவு செய்ய இயலாது.':'This alone does not establish a particular event.');
 const dignityPositive=['exalted','moolatrikona','own','friend'].includes(lc.state);
 const result=ta?`${dignityPositive?positive:caution} என்ற போக்கு தொடர்புபடலாம்; ${dignityPositive?caution:positive} என்ற மறுபக்கத்தையும் புறக்கணிக்கக் கூடாது.`:`Consider ${dignityPositive?positive:caution}, while also allowing for ${dignityPositive?caution:positive}.`;
 const group=a.ownerOwnership.filter(h=>[6,8,12].includes(h)).length?(ta?'அதிபத்தியத்தில் 6, 8 அல்லது 12ஆம் பாவமும் இடம்பெற்றிருப்பதால் சவால், மாற்றம் அல்லது செலவு சார்ந்த காரகத்துவங்களை ஒரே நேரத்தில் ஆராய வேண்டும்.':'Rulership also includes a sixth, eighth or twelfth house: duty, change or expense themes must not be erased by dignity.'):'';
 const ctext=contact?contactLine(d,a,contact,ta):'';
 const x=focus===2||focus===11?a.crossGroups.find(g=>g.key==='wealth'&&g.houses.includes(focus===2?11:2)):
  [3,7,11].includes(focus)?a.crossGroups.find(g=>g.key==='effort-partnership-gains'&&g.houses.some(h=>[3,7,11].includes(h))):
  [6,8,12].includes(focus)?a.crossGroups.find(g=>g.key==='difficult'&&g.houses.some(h=>[6,8,12].includes(h))):
  [1,4,5,9,10].includes(focus)?a.crossGroups.find(g=>g.key==='kendra-trikona'&&g.houses.some(h=>[1,4,5,7,9,10].includes(h))):null;
 const connected=x?(ta?`இந்தப் பாவாதிபதியின் இருப்பிடம் அல்லது பார்வையால் ${x.houses.join(', ')}-ஆம் பாவங்களுடனும் உண்மையான தொடர்பு அமைகிறது; ${x.key==='wealth'?'வருமானம் மற்றும் சேமிப்பை தனித்தனியாக ஆராய வேண்டும்':x.key==='effort-partnership-gains'?'முயற்சி, கூட்டுறவு, ஆதாயம் மூன்றையும் ஒன்றெனக் கருதாமல் இணைத்துப் பார்க்க வேண்டும்':x.key==='difficult'?'தடைகளைச் சமாளிக்கும் திறனுடன் சவால்களும் சேர்ந்து வரலாம்':'கேந்திரம்–திரிகோணத் தொடர்பின் நோக்கத்தையும் பாவாதிபத்தியத்தின் மற்ற காரகங்களையும் ஒன்றிணைக்க வேண்டும்'}.`:
 `This ruler has an actual placement/aspect connection to houses ${x.houses.join(', ')}; read their functions together without assuming uniformly favourable or unfavourable results.`):'';
 const txt=brief?[lordFact,contact?(ta?`${NAMES[contact.planet][0]} ${contact.planetHouse}-ஆம் பாவத்தில் ${(LABEL_TA)[contact.dignity.state]} நிலையில் இருந்து தொடர்பு பெறுகிறார்; அவர் ${contact.sourceHouses.join(', ')}-ஆம் பாவாதிபதி.`:`${contact.planet} from house ${contact.planetHouse}, ${(LABEL_EN)[contact.dignity.state]}, ruling houses ${contact.sourceHouses.join(', ')}, has a natal contact.`):''].filter(Boolean).join(' '):[focus===1?(ta?LAGNA_STYLE_TA:LAGNA_STYLE_EN)[d.lagna]:'',lordFact,con,result,group,ctext,connected].filter(Boolean).join(' ');
 return {text:txt,evidence:a};}
 const MARS_TENTH_TA={
  Jupiter:'ஒன்பதாம் அதிபதியான குருவின் அறிவு–வழிகாட்டுதல் செவ்வாயின் செயல்வேகத்துடன் சேர்ந்தால் இலக்கை நிதானமாக அணுகும் திறன் உருவாகலாம்; ஆனால் குரு பன்னிரண்டாம் அதிபதியும் என்பதால் ஆலோசனை, கல்வி அல்லது முயற்சிக்கான செலவைத் தனியாகக் கவனிக்க வேண்டும்.',
  Mercury:'மூன்று மற்றும் ஆறாம் அதிபதியான புதனின் பேச்சு, தகவல், ஆவணங்களின் தேவை செவ்வாயின் விரைவான முடிவுடன் மோதக்கூடும். வேலை ஒப்பந்தம், கணக்கு, போட்டித் தேர்வு போன்றவற்றில் தவறைத் திருத்தும் திறனும் விவரங்களை விட்டுவிடும் அவசரமும் ஒன்றாக ஆராயப்பட வேண்டும்.',
  Saturn:'பத்து மற்றும் பதினொன்றாம் அதிபதியான சனியின் கட்டுப்பாடு–ஆதாயக் கணக்கு, செவ்வாயின் விரைவான செயலுடன் மோதவோ அதை ஒழுங்குபடுத்தவோ கூடும். எந்தப் பாவத்தில் இருந்து சனி பார்க்கிறார் என்பதன்படி தொழில் தாமதம், வீடு–வேலை சமநிலை, எதிர்பாராத பொறுப்பு போன்ற அம்சங்களைப் பிரிக்க வேண்டும்.',
  Sun:'ஐந்தாம் அதிபதியான சூரியனின் அதிகாரமும் அறிவுத் திட்டமிடலும் செவ்வாயின் செயல்வேகத்துடன் தொடர்புபெறுகின்றன; திறனைச் செயலாக்கலாம், ஆனால் தன்மான மோதலைத் தவிர்க்க வேண்டும்.',
  Moon:'நான்காம் அதிபதியான சந்திரனின் குடும்ப உணர்வும் மனநிம்மதியும் செவ்வாயின் பொறுப்பு–முயற்சியுடன் இணைகின்றன; வீட்டாரின் தேவைகளைத் தொழில் முடிவிலிருந்து முற்றிலும் பிரிக்க முடியாமல் போகலாம்.',
  Venus:'இரண்டு மற்றும் ஏழாம் அதிபதியான சுக்கிரனின் பேச்சு, சேமிப்பு, கூட்டுறவு ஆகியவை செவ்வாயின் வேகத்தில் கலந்து வருகின்றன; பிறருடன் ஆலோசிக்காமல் எடுத்த பொருளாதார முடிவு உறவு வாதமாக மாறக்கூடும்.'
 };
 const MARS_TENTH_EN={
  Jupiter:'Jupiter rules the ninth and twelfth: advice can temper initiative, while learning costs and commitments still matter.',
  Mercury:'Mercury rules the third and sixth: checking contracts, calculations and communication may clash with rapid action, yet improve error correction.',
  Saturn:'Saturn rules the tenth and eleventh: career constraints, patient organisation and gains can curb or refine Mars’s drive, depending on the actual source house.',
  Sun:'The fifth ruler Sun links strategic learning and authority to initiative, potentially blending competence with pride.',
  Moon:'The fourth ruler Moon links family security and emotional needs to the native’s work-driven initiative.',
  Venus:'The second and seventh ruler Venus links savings, speech and partnership to initiative; unilateral choices can create tension.'
 };
 function interactionConsequences(d,a,c,ta){
  if(d.lagna===0&&a.owner==='Mars'&&a.ownerPosition===10&&c.hits.some(x=>x==='lord-aspect'||x==='lord-conjunction')){
   const direct=(ta?MARS_TENTH_TA:MARS_TENTH_EN)[c.planet];if(direct)return direct;
  }
  const state=c.dignity.state,planet=c.planet,positive=['exalted','moolatrikona','own','friend'].includes(state),friction=['enemy','great-enemy'].includes(c.relationship.compound);
  const nature=ta?PLANET_TA[planet]:PLANET_EN[planet];
  if(ta)return positive&&!friction?`${nature} சார்ந்த திறன் ${HOUSE_TA[a.focus-1]} பற்றிய முடிவில் உதவலாம். ஆனால் பாவாதிபத்தியத்தைப் பொறுத்து அதை முழுவதும் நன்மை என்று கூறக்கூடாது.`:
   `${nature} சார்ந்த வேகம் அல்லது எதிர்பார்ப்பு ${HOUSE_TA[a.focus-1]} விஷயத்தில் முரண்படலாம்; அதே தொடர்பு குறைகளை உணர்த்தி மாற்றுத் திட்டம் அமைக்கவும் உதவலாம்.`;
  return positive&&!friction?`${nature} can support choices about ${HOUSE_EN[a.focus-1]}, subject to its actual house rulership.`:
   `${nature} can create tension around ${HOUSE_EN[a.focus-1]}, but may also expose problems that need correction.`;
 }
 function contactLine(d,a,c,ta){const label=NAMES[c.planet][ta?0:1],cl=(ta?LABEL_TA:LABEL_EN)[c.dignity.state],rel=(ta?C_REL_TA:C_REL_EN)[c.relationship.compound],rev=(ta?C_REL_TA:C_REL_EN)[c.reciprocal.compound],h=c.sourceHouses.join(', '),kind=c.hits.some(x=>x.includes('aspect'))?(ta?'பார்வை':'aspect'):c.hits.includes('lord-conjunction')?(ta?'சேர்க்கை':'conjunction'):(ta?'இருப்பிட':'placement');const mind=ta?PLANET_TA[c.planet]:PLANET_EN[c.planet];
 const hint=ta?`${label} ${c.planetHouse}-ஆம் பாவத்தில் ${cl} நிலையில் இருந்து ${kind}த் தொடர்பு கொள்கிறார். அவர் ${h}-ஆம் பாவங்களுக்கு அதிபதி; அவரிடமிருந்து பாவாதிபதிக்கான பஞ்சதா உறவு ${rel}, எதிர்த்திசை உறவு ${rev}. ${mind} சார்ந்த தாக்கம் பலனை மாற்றலாம்; நட்பு மட்டுமே நன்மையையோ பகை மட்டுமே தீமையையோ உறுதி செய்யாது.`:
 `${label} in house ${c.planetHouse} has ${cl} dignity and a ${kind} link; it rules houses ${h}. Compound friendship is ${rel} toward the house ruler and ${rev} in return. Its ${mind} themes modify the reading; friendship is not automatically favourable, nor enmity automatically harmful.`;
 return hint+' '+interactionConsequences(d,a,c,ta);}
 return Object.freeze({natural,temporary,compound,relation,dignity,ownership,groups,analyze,narration,aspectHouse,touches,version:'274-parashari-evidence'});
});

;

/* ---- d1-karaka-functional.js (preserves original execution order) ---- */
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
   f.kind==='lagna-primary'?(ta?(f.houses.includes(8)?'லக்னாதிபத்தியம் முதன்மை; எட்டாம் ஆதிபத்தியத்தால் வரும் மாற்றங்களையும் சேர்த்து ஆராய வேண்டும்.':'லக்னாதிபத்தியம் முதன்மையானது; உடல் மற்றும் சொந்த முயற்சிக்கான ஆதரவை இந்தப் பாவத் தொடர்புடன் ஒப்பிட வேண்டும்.'):(f.houses.includes(8)?'Ascendant rulership is primary; include eighth-house changes only because this planet rules the eighth.':'Ascendant rulership is primary; link personal initiative to this activated house.')):
   f.kind==='trinal-with-other-ownership'?(ta?'திரிகோண தொடர்பு வலிமையைத் தரக்கூடும்; மற்ற ஆதிபத்தியத்தின் செலவு அல்லது பொறுப்பும் கணக்கில் வரும்.':'Trinal support coexists with obligations of its other house.'):
   (ta?'இந்தக் கிரகத்தின் மற்ற பாவாதிபத்தியத்தையும் தனியாகப் பரிசீலிக்க வேண்டும்.':'Consider both signs it rules.');
  const health=teen&&[6,8,12].some(h=>f.houses.includes(h))?(ta?'குழந்தைப் பருவத்தில் இதை பெற்றோர் கவனிக்கும் பழக்கம், பாதுகாப்பு மற்றும் கற்றல் சார்ந்து மட்டுமே வாசிக்க வேண்டும்.':'For a child read this as caregiver routines, safety and learning, not adult life events.'):' ';
  const escape=ex.ownedD.length&&f.debilitated?(ta?'நீசத்தால் துஷ்டானப் பிரச்சினை நீங்கிவிட்டதாகக் கருத முடியாது.':'Debility does not automatically remove dusthana difficulties.'):
   ex.candidate?(ta?'விபரீத அமைப்புக்கான ஆரம்பச் சாத்தியம் மட்டுமே; உறுதியான ராஜயோகமாக அறிவிக்கக் கூடாது.':'Only a preliminary viparita candidate, not a confirmed rajayoga.'):' ';
  return {text:[fact,role,health,escape].filter(s=>s.trim()).join(' '),evidence:{f,ex,focus,source:'d1-functional-period'}};
 }
 return Object.freeze({HOUSE_KARAKA,GRAHA_HOUSES,MATTERS,functional,dusthanaException,karaka,description,periodNote,version:'275-karaka-functional'});
});

;

/* ---- d1-derived-matters.js (preserves original execution order) ---- */
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
  const detail=ta?`${PN[lead.planet]} இந்தச் செய்திக்குரிய பாவம்/காரகத் தொடர்பில் (${lead.why.map(x=>x==='ruler-or-karaka'?'பாவாதிபதி அல்லது காரகன்':x.startsWith('occupies-')?x.slice(9)+'-ஆம் பாவ இருப்பிடம்':x.startsWith('aspects-')?x.slice(8)+'-ஆம் பாவப் பார்வை':x).join(', ')}) இருப்பதால் ${area} சார்ந்த குடும்ப முடிவுகளை பரிசீலிக்கும் மரபுவழிக் குறிப்பு உள்ளது.`:
   `${lead.planet} actually links to ${area} (${lead.why.join(', ')}); this is a traditional contextual signal, not a predicted event.`;
  const safety=minor?(ta?'சிறுவர் வயதில் இதை பெற்றோர் மேற்கொள்ளும் பராமரிப்பு மற்றும் நிதித் திட்டங்களுக்குரியதாக மட்டுமே கொள்ள வேண்டும்.':'For a minor this applies to caregiver planning, not adult finances or marriage.'):
   key==='native_health'?(ta?'இதன்மூலம் நோய், நீண்டகால பாதிப்பு அல்லது ஆயுள் காலத்தை உறுதியாகக் கணிக்க முடியாது.':'No disease, chronic diagnosis or lifespan can be inferred.'):
   key!=='native_wealth'?(ta?'உறவினரின் உண்மையான செல்வத்தை இதனால் உறுதி செய்ய முடியாது.':'The relative’s actual finances are not established.') : '';
  return {text:[detail,safety].filter(Boolean).join(' '),activated:true,evidence:{...a,hits,source:'d1-derived-period'}};
 }
 return Object.freeze({MATTERS,PER_FOCUS,countFrom,analyze,reading,forFocus,periodNote,version:'276-derived-relative-wealth-health'});
});

;

/* ---- d1-evidence.js (preserves original execution order) ---- */
/* SMV ASTRO V301 — offline, D1-specific natal/Nakshatra/dasha/transit synthesis.
 * Consumes computed natal/period/transit data; no APIs, Firebase or chart recalc.
 * House + dispositor + star ruler are separate levels, not interchangeable.
 * Interpretations are traditional symbolism, never clinical disease forecasts.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1V301Evidence=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const ORDER=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const normalize=x=>PN[x]?x:Object.keys(PN).find(k=>PN[k]===x)||x;
const RASI_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const RASI_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const HOUSES_TA=['சுயநம்பிக்கையும் உடல் ஆற்றலும்','குடும்பப் பேச்சும் வரவு செலவும்','முயற்சியும் சிறு பயணமும்','வீடும் தாய்வழி உறவும் மன அமைதியும்','கல்வியும் ஆராய்ச்சியும் குழந்தைகள் சார்ந்த பொறுப்பும்','பணிப் போட்டியும் கடனும் உடல் ஒழுங்கும்','திருமண உறவும் கூட்டுச் செயல்களும்','திடீர் மாற்றமும் பொறுப்பு மாற்றமும்','உயர்கல்வியும் தந்தை/ஆசிரியர் வழிகாட்டுதலும்','தொழில் நிலையும் பொதுச் செயல்களும்','வருமானமும் நட்பு வட்டமும்','தனிநேரமும் ஓய்வும் வெளியிடச் செலவும்'];
const HOUSES_EN=['personal confidence and daily energy','family speech and finances','initiative and shorter journeys','home, maternal ties and peace of mind','learning, research and responsibilities involving children','workload, debt and day-to-day bodily routine','partnerships and cooperation','unplanned changes and reorganised duties','higher learning and guidance','career direction and practical duties','earnings and networks','privacy, rest and outgoings'];
const LIFE_TA={1:['தன்னுடைய வரம்பை அறிந்து வேலைப் பொறுப்பைப் பகிர்ந்தால் செயல்திறன் நீடிக்கும்.','அடுத்தடுத்து பொறுப்பு ஏற்றுக்கொண்டால் தனிப்பட்ட ஓய்வு பின்தங்கலாம்.'],2:['வரவு வருவது மட்டுமல்ல, குடும்பத்துக்காக எவ்வாறு செலவிடப்படுகிறது என்பதையும் முன்கூட்டியே ஒழுங்குபடுத்தும் வாய்ப்பு உண்டு.','உணர்ச்சி வேகத்தில் கொடுக்கப்படும் பண உறுதிகள் பிற்காலத்தில் சுமையாக மாறலாம்.'],3:['பழைய தவறைத் திருத்தி ஒரு செயல்முறையில் தேர்ச்சி பெறும் முயற்சி பலன் தரலாம்.','ஒவ்வொரு சிறிய திருத்தத்துக்கும் வேலையைத் தொடக்கத்திலிருந்து செய்தால் முக்கிய இலக்கு தள்ளிப் போகலாம்.'],4:['வீட்டின் நடைமுறை வசதியும் அமைதியான தனி வேலை இடமும் ஒரே நேரத்தில் தேவைப்படலாம்.','வீட்டு மாற்றம் அல்லது சொத்துச் செலவு குறித்து முடிவெடுப்பதில் குடும்பத்தினரின் ஒப்புதல் முக்கியம்.'],5:['கற்ற விவரத்தைக் களத்தில் பயன்படுத்தி, பிறருக்கும் புரியும் முறையில் மாற்றி அமைக்கும் திறன் வளரும்.','அறிவைப் பெருக்கிக்கொண்டே அதன் பயனை வெளியிடாமல் தாமதப்படுத்தும் போக்கு கூடலாம்.'],6:['பிறரால் முடிக்கப்படாத கடினமான பணியைப் பிரித்து ஆராய்ந்து தீர்வுகாண முடியும்.','அந்த வேலையையே தொடர்ந்து நினைத்தால் உணவும் உறக்கமும் ஒழுங்கிழக்கலாம்.'],7:['வேலைப் பங்கீடு, வாக்குறுதி, ஆலோசனை ஆகியவற்றில் தெளிவான உரையாடல் ஒத்துழைப்பைக் காக்கும்.','சொல்லப்படாத எதிர்பார்ப்பால் சிறிய கருத்து வேறுபாடு நீளலாம்.'],8:['முன்பிருந்த முறையின் மறைந்த குறைகளை அறிந்து பொருத்தமான மாற்றத்தை உருவாக்கக்கூடும்.','சரிபார்க்காத முடிவிற்காகப் பாதுகாக்க வேண்டிய அமைப்பை உடைத்துவிட வேண்டாம்.'],9:['நூலறிவை அனுபவத்தில் சோதித்துப் பார்த்து வழிகாட்டும் நபர்களிடம் இருந்து பயன்படும் கருத்தைத் தேர்ந்தெடுக்கலாம்.','ஒரே கருத்தில் பிடிவாதமாக இருந்தால் புதிய பயனுள்ள தகவலைத் தவறவிடலாம்.'],10:['செய்து முடித்த பணியின் தரமும் தொடர்ந்து வழங்கும் சேவையுமே நல்ல பெயரை உருவாக்கும்.','ஒவ்வொரு பொறுப்பையும் ஒருவரே ஏற்றால் முன்னேற்றத்துடன் சோர்வும் சேரக்கூடும்.'],11:['நம்பிக்கையான தொடர்புகளால் படிப்படியான வருமான வாய்ப்பு உருவாகலாம்.','உறுதியாகாத வருமானத்திற்காகச் செலவு செய்வதைத் தவிர்க்க வேண்டும்.'],12:['தொழிலுக்குத் தேவையான செலவும் தேவையற்ற செலவும் தனித்துக் கணக்கிட்டால் சேமிப்பு பாதுகாக்கப்படும்.','ஓய்வு நேரத்தை வேலைக்காக விட்டுக்கொடுத்தால் பிற முயற்சிகளிலும் கவனம் குறையலாம்.']};
const LIFE_EN={1:['Sharing responsibilities while recognising limits makes personal effort sustainable.','Too many new obligations may crowd out personal rest.'],2:['An intentional plan for family expenditure can be more valuable than income alone.','Financial promises made in haste can become a burden.'],3:['Revisiting a flawed process can develop a useful skill.','Repeating minor corrections may delay the central objective.'],4:['A comfortable home and a quiet area for focused work may both matter.','Family agreement matters before making costly changes to living arrangements.'],5:['The value of learning grows when it is turned into clear practical guidance.','Endless refinement can delay sharing useful work.'],6:['Complex work becomes manageable when broken into smaller problems.','Carrying unfinished tasks into meal and sleep time causes strain.'],7:['Clear expectations about roles and promises protect collaboration.','Unspoken expectations can prolong minor disagreements.'],8:['Revising an old system can reveal problems that were previously hidden.','Do not dismantle useful safeguards without verification.'],9:['Testing what mentors and texts teach helps identify dependable guidance.','A fixed opinion can obscure better evidence.'],10:['Completed work and dependable service contribute more to a reputation than publicity alone.','Taking every task personally can bring fatigue along with progress.'],11:['Trustworthy connections may gradually widen earning opportunities.','Do not spend income that has not yet been received.'],12:['Separating useful operating costs from avoidable spending protects reserves.','Sacrificing rest for work can reduce effectiveness elsewhere.']};
const HEALTH={
 vision:{ta:['கண்களை நீண்ட நேரம் ஒரே வேலையில் வைத்திருப்பதால் கண் சோர்வு, ஒளியில் அசௌகரியம் போன்ற உபாதைகள் தோன்றலாம்.','கண் சோர்வு அல்லது ஒளி உணர்வில் மாறுபாடு போன்றவை இப்பகுதிக்கான மரபுக் கவனப் பொருளாக இருக்கலாம்.'],en:['Eye fatigue or discomfort with bright light may be a traditional theme when activity is prolonged.','Visual comfort and light sensitivity are the conventional symbolic themes.']},
 digestion:{ta:['உணவு நேரம் மாறினால் அஜீரணம், வயிற்றெரிச்சல், வயிறு உப்புசம் போன்ற உபாதைகள் வெளிப்படக்கூடும்.','செரிமான ஒழுங்கு, வயிறு உப்புசம் போன்ற இடையிடை அசௌகரியங்களை மரபுக் குறியீடாக வாசிக்கலாம்.'],en:['Irregular meals may coincide with indigestion, burning discomfort or bloating in a traditional reading.','Digestive comfort and occasional bloating are the traditional themes.']},
 metabolism:{ta:['பசி நேரம் மாறுதல், உடல் சதைப்பற்று ஏற்ற இறக்கம் ஆகியவை மரபுவழி உடல் காரகத்துவமாகக் கருதப்படலாம்.','உணவின் அளவும் உடல் பழக்கமும் மாறுவதைக் குறிக்கும் மரபுக் குறிப்புகள் உள்ளன.'],en:['Changes in appetite timing and body fullness form the traditional association.','Traditional symbols concern food regularity and body proportions.']},
 bones:{ta:['முழங்கால் அல்லது மூட்டுகளில் இறுக்கம், நீண்ட உடலுழைப்புக்குப் பின் தசை வலி போன்ற அசௌகரியங்கள் மரபு வாசிப்பில் இடம் பெறலாம்.','மூட்டு இயக்கம் மற்றும் உடலுழைப்புக்குப் பிந்தைய ஓய்வு மரபுக் கவனப் பொருள்கள்.'],en:['Stiff joints or muscle discomfort after extended effort may be mentioned symbolically.','Joint movement and recovery after exertion are the traditional themes.']},
 breath:{ta:['மார்பு இறுக்கம், சளி சார்ந்த அசௌகரியம் அல்லது சுவாசப்பாதை எரிச்சல் போன்றவை மரபு ஜோதிடத்தில் இப்பகுதியுடன் இணைக்கப்படுகின்றன.','மார்பு சுகமும் சுவாச ஒழுங்கும் மரபு வாசிப்பில் கவனிக்கப்படும்.'],en:['Chest tightness, congestion and airway irritation appear in older symbolic correspondences.','Chest comfort and breathing patterns are the traditional symbolic focus.']},
 skin:{ta:['தோல் உலர்வு, அரிப்பு அல்லது வெளிப்புற எரிச்சல் போன்ற அசௌகரியங்களை மரபு காரகத்துவத்தில் ஆராயலாம்.','தோல் மென்மை மற்றும் வெளிப்புற மாற்றங்கள் மரபுக் கவனப் பொருளாக இருக்கலாம்.'],en:['Dry or irritated skin is an older symbolic association, rather than a specific disease.','Skin comfort and outward variation are traditional themes.']},
 reproductive:{ta:['கீழ்வயிறு அல்லது இடுப்புப் பகுதியில் இடையிடை அசௌகரியங்களை மரபுப் பாவக் காரகத்துவம் விவரிக்கலாம்.','இடுப்புப் பகுதியின் அன்றாட சுகமும் ஓய்வும் மரபு வாசிப்பில் இடம் பெறுகின்றன.'],en:['Pelvic or lower-abdominal discomfort is sometimes mentioned in traditional analogies.','Pelvic comfort and rest are the traditional symbolic focus.']},
 sleep:{ta:['அதிக சிந்தனையால் தூங்கத் தாமதித்தல், இடையில் விழித்தல், ஓய்வுக் குறைவு போன்ற உபாதைகள் ஏற்படக்கூடும்.','உறக்க நேரம் மாறுதல் மற்றும் தனிநேரம் குறைதல் போன்ற பழக்கங்கள் மரபுக் கவனப் பொருள்கள்.'],en:['Delayed sleep, interrupted rest and a changing sleep routine are traditional themes.','Sleep schedule and sufficient private rest are the main themes.']}
};
const validHouse=h=>Number.isInteger(h)&&h>=1&&h<=12;
const planet=(d,k)=>d?.planets?.[k]||null;
const owners=(d,k)=>Array.isArray(d?.houses)?d.houses.filter(h=>h.lord===k&&validHouse(h.no)).map(h=>h.no):[];
function starOf(d,k){const p=planet(d,k);if(!p||p.longitude===null||p.longitude===undefined||p.longitude==='')return null;const v=Number(p.longitude);if(!Number.isFinite(v))return null;const i=Math.floor((((v%360)+360)%360)/(360/27));return {index:i,lord:ORDER[i%9]};}
function points(d,md,ad){const score=new Map(),reasons=new Map();const put=(h,w,why)=>{if(!validHouse(h))return;score.set(h,(score.get(h)||0)+w);(reasons.get(h)||[]).push(why);};
 const root=(k,w,label)=>{const p=planet(d,k);if(!p)return;put(p.house,w*1.5,label+'-placement');for(const h of owners(d,k))put(h,w,label+'-lord');};
 root(md,2.2,'MD');root(ad,3.0,'AD');
 if(planet(d,md)&&planet(d,ad)&&md!==ad&&planet(d,md).house===planet(d,ad).house)put(planet(d,ad).house,1.5,'MD-AD-conjunction');
 // Nakshatra dispositor gets less weight; repeatedly visited planet is NOT counted again.
 const chain=[];for(const [from,mult] of [[md,1.35],[ad,1.5]]){const seen=new Set([from]);let cur=from;for(let depth=0;depth<3;depth++){const st=starOf(d,cur);if(!st||seen.has(st.lord))break;seen.add(st.lord);chain.push({from:cur,to:st.lord,depth});root(st.lord,mult*Math.pow(.57,depth),'star'+(depth+1));cur=st.lord;}}
 const ranked=[...score].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map(([house,weight])=>({house,weight:Math.round(weight*100)/100,reasons:reasons.get(house)}));
 return {ranked,chain,md,ad};
}
function evidenceClause(d,k,ta){const p=planet(d,k);if(!p)return '';const owned=owners(d,k).map(x=>ta?`${x}-ஆம்`:`${x}`);return ta?`${PN[k]||k} ${owned.length?owned.join(', ')+' பாவ அதிபதியாக ':''}${p.house}-ஆம் பாவத்தில் இருக்கிறார்`:`${k} rules ${owned.join(' and ')||'no classical house'} and occupies house ${p.house}`;}
function enhanceLife(d,topics,lang){if(!Array.isArray(topics))return topics;const ta=lang!=='en';return topics.map(t=>{const n=Number(t.number),house=d.houses?.[n-1],p=planet(d,house?.lord);if(!p||!validHouse(n))return t;
 // A natal supplement is justified by a cross-house linkage, not a stock paragraph for every house.
 const exchange=planet(d,d.houses?.[p.house-1]?.lord),hasMutual=!!exchange&&exchange.house===n&&p.house!==n;
 const interlocked=p.house!==n&&(d.houses[p.house-1]?.lord&&d.houses[p.house-1].lord!==house.lord)||hasMutual;
 const occupied=house.occupants?.length>0;
 if(!interlocked&&!occupied)return t;
 const others=(house.occupants||[]).filter(k=>k!==house.lord), lead=others[0]||house.lord;
 const base=(ta?LIFE_TA:LIFE_EN)[n]||[];
 const start=ta?`${n}-ஆம் பாவத்தின் ${HOUSES_TA[n-1]} தொடர்பான வாழ்வில் ${evidenceClause(d,house.lord,true)}. ${p.house!==n?`அதனால் ${p.house}-ஆம் பாவத்திற்குரிய ${HOUSES_TA[p.house-1]} சார்ந்த சூழலும் இங்கு இணைகிறது.`:''}`:`${evidenceClause(d,house.lord,false)}. ${p.house!==n?`This links ${HOUSES_EN[n-1]} with ${HOUSES_EN[p.house-1]}.`:''}`;
 const add=others.length?(ta?`${PN[lead]} இப்பாவத்தில் இருப்பதால் நடைமுறையில் ${base[0]} ${base[1]}`:`With ${lead} occupying this house, ${base[0]} ${base[1]}`):(ta?`${base[0]} ${base[1]}`:`${base[0]} ${base[1]}`);
 const item={text:`${start} ${add}`,evidence:{source:'v301-life-cross-house',house:n,lord:house.lord,lordHouse:p.house,planet:lead,planetSign:planet(d,lead)?.sign}};
 return {...t,paragraphs:[...(t.paragraphs||[]),item]};});}
function enhancePhysical(d,n,lang){const h=d.houses?.[n-1];if(!h)return null;const lord=planet(d,h.lord),ta=lang!=='en';if(!lord)return null;
 // Bring bodily routine together with actual chart configuration, no new diagnosis.
 if(![1,3,4,5,6,10,12].includes(n)||(!h.occupants?.length&&lord.house===n))return null;
 return {text:ta?`${n}-ஆம் பாவத்தின் உடல் உருவகத்துடன் ${PN[h.lord]} ${lord.house}-ஆம் பாவத்தில் இருப்பதையும் சேர்த்து வாசிக்க வேண்டும். ${lord.house!==n?`அன்றாட வாழ்க்கையில் ${HOUSES_TA[lord.house-1]} காரணமாக வேலை, உணவு அல்லது ஓய்வு நேரங்களைச் சீரமைக்க வேண்டிய தருணங்கள் உருவாகலாம்.`:`அதே பாவத்தில் திரளும் கிரகத் தொடர்புகள் ஓய்வு மற்றும் உடல் இயக்கத்தின் ஒழுங்கை அதிகம் கவனிக்கச் செய்கின்றன.`}`:`The ruler ${h.lord} occupies house ${lord.house}; consider this alongside the body symbolism of house ${n}. Routines connected with ${HOUSES_EN[lord.house-1]} may influence when work and rest are taken.`,evidence:{source:'v301-physical-ruler-context',house:n,lord:h.lord,lordHouse:lord.house}};
}
function enhanceMedical(d,spec,side,adverse,supports,lang){const ta=lang!=='en',type=side==='traditional-concern'?0:1,desc=HEALTH[spec.id];if(!desc)return null;const active=Array.isArray(adverse)&&adverse.length>0;
 const phrase=(ta?desc.ta:desc.en)[active?type:1],p=d.houses?.[spec.houses[0]-1],l=planet(d,p?.lord);
 const bound=l&&l.house!==spec.houses[0]?(ta?`இவற்றின் பாவாதிபதி ${PN[p.lord]} ${l.house}-ஆம் வீட்டில் இருப்பதால் ${HOUSES_TA[l.house-1]} தொடர்பான வாழ்க்கைச் சூழலையும் சேர்த்து இந்த வாசிப்பை ஆராயலாம்.`:`The house ruler ${p.lord} occupies house ${l.house}, linking this theme with ${HOUSES_EN[l.house-1]}.`):'';
 return {text:`${phrase} ${bound}`,evidence:{source:'v301-body-period-distinction',houses:spec.houses,houseLord:p?.lord,lordHouse:l?.house,category:side,contactCount:(adverse||[]).length,mitigationCount:(supports||[]).length,notClinical:true}};
}
function periodInsight(d,period,lang='ta'){const md=normalize(period?.md),ad=normalize(period?.ad),ta=lang!=='en';if(!planet(d,md)||!planet(d,ad))return null;
 const a=points(d,md,ad),focused=a.ranked.slice(0,5),main=focused.slice(0,3);
 const detail=main.map(x=>ta?`${x.house}-ஆம் பாவம் (${HOUSES_TA[x.house-1]})`:`house ${x.house} (${HOUSES_EN[x.house-1]})`);
 const starMd=starOf(d,md),starAd=starOf(d,ad),periodName=ta?`${PN[md]} தசை–${PN[ad]} புக்தி`:`${md} major period – ${ad} sub-period`;
 const explanation=ta?`${periodName} காலத்தில் ${evidenceClause(d,md,true)}; புக்திநாதரான ${evidenceClause(d,ad,true)}. ${PN[md]} பிறப்பு நட்சத்திர அதிபதி ${starMd?PN[starMd.lord]:'கணக்கிடப்படவில்லை'}; ${PN[ad]} பிறப்பு நட்சத்திர அதிபதி ${starAd?PN[starAd.lord]:'கணக்கிடப்படவில்லை'}. எனவே ${detail.join(', ')} ஆகியவை முதன்மையாக இயங்குகின்றன.`:
 `${periodName}: ${evidenceClause(d,md,false)}; ${evidenceClause(d,ad,false)}. Their natal star rulers are ${starMd?.lord||'not resolved'} and ${starAd?.lord||'not resolved'}. The leading activated themes are ${detail.join(', ')}.`;
 const lead=main[0]?.house,practical=lead?(ta?LIFE_TA[lead]:LIFE_EN[lead]):null;
 const next=practical?(ta?`நல்ல பக்கத்தில் ${practical[0]} அதே அமைப்பின் சிரமமான பக்கத்தில் ${practical[1]} குடும்பம், தொழில், உடலுழைப்பு ஆகியவற்றில் எந்தத் துறை உண்மையில் முன்னிலை பெறுகிறது என்பதை நடப்பு கோச்சாரத்துடன் இணைத்தே காலமாகத் தீர்மானிக்க வேண்டும்.`:`Constructive possibility: ${practical[0]} Counterweight: ${practical[1]} The actual timing depends on intersecting transits, not this period alone.`):'';
 const starExtras=[...new Set(a.chain.map(x=>x.to))].filter(x=>x!==md&&x!==ad).slice(0,3);
 const secondary=a.ranked.slice(3,7).map(x=>ta?`${x.house}-ஆம் (${HOUSES_TA[x.house-1]})`:`house ${x.house} (${HOUSES_EN[x.house-1]})`);
 const network=starExtras.length?(ta?`மேலும் நட்சத்திர அதிபதிகள் வழியாக ${starExtras.map(k=>evidenceClause(d,k,true)).join('; ')}. இதனால் ${secondary.join(', ')} ஆகிய துணைப் பாவப் பலன்களும் இணையலாம். ஆனால் இவை நேரடித் தசை–புக்தி முதன்மைப் பாவங்களை விட குறைந்த முன்னுரிமை கொண்டவை; அனைத்தும் ஒரே நாளில் நிகழும் என்று எடுத்துக்கொள்ளக் கூடாது.`:
 `The nakshatra-ruler chain also connects ${starExtras.map(k=>evidenceClause(d,k,false)).join('; ')}. Secondary themes include ${secondary.join(', ')}; these should not outrank the direct period houses or be treated as simultaneous events.`):'';
 const sun=planet(d,'Sun'),moon=planet(d,'Moon');let moonNote='';
 if((md==='Moon'||ad==='Moon')&&Number.isFinite(sun?.longitude)&&Number.isFinite(moon?.longitude)){
  const angle=((moon.longitude-sun.longitude)%360+360)%360,strong=angle>=48&&angle<228;
  const bornWithJupiter=planet(d,'Jupiter')?.house===moon.house;
  moonNote=ta?(strong?`பிறப்புச் சந்திரன் பௌர்ணமி நோக்கிய அல்லது பௌர்ணமிக்குப் பின்பட்ட முதற்பகுதி பலத்தில் இருப்பதால், சந்திரன் சார்ந்த மனநிறைவு மற்றும் குடும்ப ஆதரவு அம்சங்களைத் தக்க சுபக் கிரகத் தொடர்புகளுடன் சேர்த்து வாசிக்க வேண்டும்.`:
   `பிறப்புச் சந்திரன் வளர்பிறை பஞ்சமிக்கு முந்தைய அல்லது தேய்பிறை பஞ்சமிக்குப் பிந்தைய குறைந்த ஒளிப் பலத்தில் இருக்கிறார். எனவே சந்திர தசையை முழுச் சுபபலமாக மட்டும் கருத முடியாது; சிந்தனை, குடும்பம், வேலை மற்றும் ஓய்வு இடையிலான ஏற்றத்தாழ்வையும் பார்க்க வேண்டும்.${bornWithJupiter?' அதே வீட்டிலுள்ள குரு ஒரு தணிக்கும் தொடர்பாக அமைவதால் அனைத்தையும் கடினமான பலனாகக் கூறுவதும் சரியல்ல.':''}`):
  (strong?'The natal Moon has relatively brighter phase strength; weigh that with benefic and functional house links.':`The natal Moon is outside the bright fifth-tithi-to-fifth-tithi interval. Read emotional and work-rest fluctuations alongside other dignity, aspect and lordship factors.${bornWithJupiter?' Natal Jupiter shares the Moon’s house and may moderate the traditional reading.':''}`);
 }
 return {ranked:a.ranked,chain:a.chain,paragraphs:[explanation,network,moonNote,next].filter(Boolean),houses:main.map(x=>x.house),mdStar:starMd?.lord||null,adStar:starAd?.lord||null};
}
function transitInsight(d,period,snapshot,lang='ta'){const ta=lang!=='en',md=normalize(period?.md),ad=normalize(period?.ad);
 if(!planet(d,md)||!planet(d,ad)||!snapshot?.pos)return null;
 const active=points(d,md,ad),selected=active.ranked.slice(0,3),baseDate=snapshot.date||period?.from||'';
 const lLord=d.houses?.[0]?.lord,mLord=d.houses?.[planet(d,'Moon')?.house-1]?.lord;const priorities=[lLord,mLord,md,ad,'Jupiter','Saturn','Rahu','Ketu'].filter(Boolean);
 const distinct=[...new Set(priorities)];const checked=distinct.map(k=>{const t=snapshot.pos[k];if(!t||!Number.isInteger(t.sign))return null;return {key:k,sign:t.sign,house:((t.sign-d.lagna+12)%12)+1};}).filter(Boolean);
 const slow=checked.filter(x=>['Jupiter','Saturn','Rahu','Ketu'].includes(x.key));
 const high=checked.map(x=>({...x,match:selected.find(a=>a.house===x.house)})).filter(x=>x.match).sort((a,b)=>(b.match.weight-a.match.weight)||priorities.indexOf(a.key)-priorities.indexOf(b.key));
 const labels=checked.filter(x=>[lLord,mLord,md,ad].includes(x.key)).slice(0,4).map(x=>ta?`${PN[x.key]} ${RASI_TA[x.sign]} (${x.house}-ஆம் பாவம்)`:`${x.key} in ${RASI_EN[x.sign]} (house ${x.house})`);
 const slowLabels=slow.map(x=>ta?`${PN[x.key]} ${x.house}-ஆம் பாவத்தில்`:`${x.key} in house ${x.house}`);
 const main=high.slice(0,2),lead=main[0],out=[];
 out.push(ta?`${baseDate} அன்று கணிக்கப்பட்ட கோச்சார நிலையில், லக்னாதிபதி ${PN[lLord]||lLord}, ராசி அதிபதி ${PN[mLord]||mLord}, தசாநாதன் ${PN[md]}, புக்திநாதன் ${PN[ad]} ஆகியோரின் கிடைக்கப்பெற்ற நிலைகள்: ${labels.join('; ')||'முழுமையான கிரகத் தரவு இல்லை'}. ${slowLabels.join('; ')} என்ற மெதுவான பெயர்ச்சிகளையும் தனியாகக் கவனிக்க வேண்டும்.`:
 `At the ${baseDate} calculated snapshot, available ascendant ruler, Moon-sign ruler, period lord and sub-period lord transits are: ${labels.join('; ')||'not all fast-planet positions available'}. Separately, the slow transits are ${slowLabels.join('; ')}.`);
 if(lead){const house=lead.house,base=(ta?LIFE_TA:LIFE_EN)[house], who=ta?PN[lead.key]:lead.key, opp=(high[1]&&high[1].key!==lead.key)?(ta?PN[high[1].key]:high[1].key):'';
 out.push(ta?`இந்தத் தேதியில் ${who} பெயர்ச்சி, செயல்படும் ${house}-ஆம் பாவத்துடன் நேரடியாகக் கூடுகிறது${opp?`; ${opp} பெயர்ச்சியும் தொடர்பு பெறுகிறது`:''}. அதனால் ${base[0]} சிரமத்தின் பக்கத்தில் ${base[1]} இந்த இடைவெளியில் ${HOUSES_TA[house-1]} முதன்மைப் பொருளாகும்; கோச்சார ராசி மாறினால் மறுமதிப்பீடு செய்ய வேண்டும்.`:
 `The transit of ${who}${opp?' and '+opp:''} directly meets activated house ${house}. ${base[0]} In the counter-case, ${base[1]} Reassess after the next sign change.`);
 }else out.push(ta?'இந்தத் தேதியின் கோச்சாரத்தில் தசை–புக்தி முதன்மைப் பாவத்துடன் நேரடி ராசி இட ஒற்றுமை இல்லை. ஆகவே கோச்சாரம் மட்டும் வைத்து தனித்த நிகழ்ச்சியோ நோயோ கூறப்படவில்லை.':'This snapshot has no direct same-house convergence with the leading period houses; no isolated event is inferred.');
 const extra=planet(d,'Moon');if(extra&&(['Moon','Ketu'].includes(md)||['Moon','Ketu'].includes(ad))){
  const body=selected.filter(x=>[4,5,6,8,12].includes(x.house));if(body.length&&main.some(x=>body.some(b=>b.house===x.house)))out.push(ta?`உடல் சார்ந்த மரபு வாசிப்பில் ${body.map(b=>b.house+'-ஆம்').join(', ')} பாவங்கள் செயல்பட்டாலும், இதனால் பிறவிக் குறைபாடோ குறிப்பிட்ட நோயோ நிரூபிக்கப்படுவதில்லை. வேலை–உணவு–ஓய்வு ஒழுங்கில் தோன்றும் தற்காலிக அசௌகரியங்களையும் நல்ல மாற்றங்களையும் அந்தந்த நடப்பு சூழலில் மட்டும் வாசிக்க வேண்டும்.`:`Houses ${body.map(x=>x.house).join(', ')} can raise traditional bodily themes, but neither congenital conditions nor particular diseases follow. Read temporary routine concerns and improvements only in their real-life context.`);
 }
 return {paragraphs:out,checked,primaryHouses:selected.map(x=>x.house),matchingTransits:high.map(x=>x.key)};
}
function snapshotFromTransit(transit,date){
 const out={};
 for(const p of transit?.planets||[]){
  const k=normalize(String(p.name??p.planet??''));if(!PN[k])continue;
  let sign=-1;const lon=Number(p.longitude);
  if(p.longitude!==null&&p.longitude!==undefined&&p.longitude!==''&&Number.isFinite(lon))sign=Math.floor((((lon%360)+360)%360)/30);
  else{const raw=String(p.rasi||p.sign||'').trim().replace(/ம்$/,'');sign=RASI_EN.findIndex(x=>x.toLowerCase()===raw.toLowerCase());if(sign<0)sign=RASI_TA.findIndex(x=>x.replace(/ம்$/,'')===raw);}
  if(sign>=0&&sign<12)out[k]={sign,retrograde:!!p.retrograde};
 }
 return {date,pos:out};
}
return Object.freeze({starOf,points,snapshotFromTransit,enhanceLife,enhancePhysical,enhanceMedical,periodInsight,transitInsight,version:'301-natal-period-transit-evidence'});
});

;

/* ---- d1-dominance-narrative.js (preserves original execution order) ---- */
/* SMV ASTRO V295: outcome-first D1 reader. This is a traditional symbolic
 * interpretation, NOT a validated personality/medical prediction.
 * Every displayed house result is selected from planet+polarity+house-specific
 * consequences, verified natal relations and the house lord's actual location.
 * Pure functions: no network, DB, observers, DOM, randomness, or recalculation.
 */
(function(root,factory){const api=factory();/* bundled helper: preserve core CommonJS export */if(root)root.SMVD1LivedResultsV293=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const PLANETS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const PN={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const SIGNS_TA=['மேஷ','ரிஷப','மிதுன','கடக','சிம்ம','கன்னி','துலா','விருச்சிக','தனுசு','மகர','கும்ப','மீன'];
const SIGNS_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const ASC_TA=['எதிலும் முன்னின்று செயல்படும் துணிவு','நிலைத்த முயற்சியும் சுகவாழ்வின் மீது அக்கறையும்','தகவல் தேடலும் பேசித் தெளிவுபடுத்தும் ஆர்வமும்','உறவுகளைப் பாதுகாக்கும் அக்கறை','தன்மானம் மற்றும் வழிநடத்தும் மனநிலை','தவறுகளைக் கண்டுபிடித்து சரிசெய்யும் துல்லியம்','இரு தரப்பையும் கேட்கும் சமநிலை உணர்வு','மறைந்த காரணங்களை ஆராயும் கூர்மை','நம்பிக்கையும் புதியவற்றைக் கற்கும் ஆர்வமும்','கடமை உணர்வும் நீண்ட முயற்சியும்','தனித்த சிந்தனையும் புதிய வழிகளைத் தேடுதலும்','இரக்கமும் ஆன்மிகச் சிந்தனையும்'];
const ASC_EN=['quick initiative and courage','steady commitment and practical comfort','curiosity and verbal agility','protective warmth in relationships','personal dignity and leadership','careful analysis and precision','fairness and cooperation','depth and scrutiny','faith and discovery','patience and duty','independent ideas and experimentation','compassion and reflection'];
const NAK_TA=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','அஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TONE_TA=['முன்னின்று முயற்சித்தல்','கடமையை உறுதியாகப் பிடித்தல்','நேரடியாகத் தீர்மானித்தல்','நம்பியவரைப் பாதுகாத்தல்','மீண்டும் கேட்டு அறிதல்','கடினமான உண்மையையும் எதிர்கொள்ளுதல்','தோல்விக்குப் பிறகு புதிய வழி தேடுதல்','குடும்பப் பொறுப்பை ஏற்றல்','உள்ளுணர்வை வெளிக்காட்டாமல் வைத்தல்','கௌரவத்தையும் குடும்ப மரபையும் மதித்தல்','அன்பையும் நல்ல சூழலையும் நாடுதல்','முக்கியப் பொறுப்பை ஏற்றல்','திறமையில் நுட்பம் தேடுதல்','அழகையும் துல்லியத்தையும் ரசித்தல்','தன்னிச்சையான முடிவு','கூட்டாக இலக்கை அடைதல்','உறவின் நம்பிக்கையைப் பேணுதல்','பெற்ற உரிமையைப் பாதுகாத்தல்','அடிப்படை காரணம் தேடுதல்','கொள்கையில் நிலைத்திருத்தல்','நீண்ட இலக்கில் விடாமுயற்சி','கவனமாகக் கேட்டு நடைமுறைப்படுத்தல்','கால ஒழுங்கைப் பேணுதல்','புதிய தீர்வைச் சோதித்தல்','கடின உழைப்பைத் தொடர்தல்','உள்ளார்ந்த சிந்தனையும் கடமையும்','உதவும் மனப்பான்மை'];
const TITLES_TA=['ஜாதகரின் குணநலன்கள்','பேச்சு, குடும்பம், சேமிப்பு மற்றும் பொருளாதாரம்','முயற்சி, துணிவு, திறமை மற்றும் உடன்பிறப்புகள்','தாய், வீடு, மனநிம்மதி மற்றும் சொத்து','கல்வி, அறிவு, சிந்தனை மற்றும் குழந்தைகள்','வேலை, போட்டி, கடன் மற்றும் அன்றாடப் பொறுப்புகள்','திருமணம், துணைவர் மற்றும் கூட்டாண்மை','மாற்றங்கள், ரகசியங்கள் மற்றும் நீடித்த சவால்கள்','தந்தை, ஆசிரியர், நம்பிக்கை மற்றும் வழிகாட்டுதல்','தொழில், பொறுப்பு மற்றும் சமூக நிலை','வருமானம், ஆதாயம், நண்பர்கள் மற்றும் இலக்குகள்','செலவு, தனிநேரம், உறக்கம் மற்றும் மன அமைதி'];
const TITLES_EN=['Personal character and temperament','Speech, family, savings and money','Effort, skill, courage and siblings','Mother, home, peace and property','Education, discernment and children','Work, competition, debt and duties','Marriage, spouse and partnerships','Changes, secrets and long challenges','Father, mentors, beliefs and guidance','Career, responsibilities and reputation','Income, gains, friends and goals','Expenses, privacy, sleep and reflection'];
// For each house: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu.
// Each cell is an independently edited lived outcome for SUPPORT | PRESSURE.
const TA=[
[
'முன்னின்று பொறுப்பை ஏற்று முடிவு செய்வீர்கள்; உங்களை நம்பியவர் சிரமத்தில் இருந்தால் ஒதுங்க மாட்டீர்கள்.|தன்னுடைய மரியாதை கேள்விக்குள்ளானவுடன் பதிலளிக்கும் வேகம் அதிகம்; விமர்சனத்தைத் தனிப்பட்ட எதிர்ப்பாக எடுத்துக்கொள்வீர்கள்.',
'மற்றவரின் கஷ்டத்தைக் கேட்டதும் உதவிசெய்ய முன்வருவீர்கள்; நெருங்கியவர்களின் மனநிலையை எளிதில் உணர்வீர்கள்.|அன்பு வைத்தவரிடமிருந்து எதிர்பாராத வார்த்தை வந்தால் உணர்ச்சிவசப்பட்டுப் பேசுவீர்கள்; பிறகு நடந்ததை மீண்டும் நினைப்பீர்கள்.',
'தடை வந்த வேலையை நிறுத்தாமல் உடனடியாக வேறு வழி முயல்வீர்கள்; அநியாயத்தைப் பார்த்தால் எதிர்ப்பீர்கள்.|ஒருவர் தவறு செய்கிறார் என்று தோன்றியதும் முழு விளக்கத்தைக் கேட்குமுன் கடுமையாகப் பதிலளிப்பீர்கள்.',
'பிறர் சொல்வதைக் கண்மூடித்தனமாக ஏற்காமல் காரணத்தைச் சரிபார்ப்பீர்கள்; சிறிய தவறும் உங்கள் கவனத்திலிருந்து தப்பாது.|எல்லாத் தகவலும் சரியாக இருக்க வேண்டும் என்ற பிடிப்பால் ஒரு முடிவை மீண்டும் மீண்டும் மாற்றுவீர்கள்.',
'உதவி கேட்பவரிடம் நியாயமான காரணத்துடன் பேசுவீர்கள்; பிறருக்கு விளக்கிச் சொல்லி வழிநடத்துவீர்கள்.|தன்னுடைய ஆலோசனையே சரி என்ற எண்ணத்தால் பிறருடைய வேறுபட்ட அனுபவத்தைக் குறைவாக மதிப்பீர்கள்.',
'அன்பையும் மரியாதையையும் ஒருங்கே எதிர்பார்ப்பீர்கள்; கருத்து மாறினாலும் உறவைப் பேண முயல்வீர்கள்.|உறவைச் சீராக வைத்திருக்கச் சொல்லாமல் விட்ட குறை பின்னர் மனவருத்தமாக வெளிப்படும்.',
'எடுத்த பணியை முடித்தே தீரவேண்டும் என்ற உறுதி உண்டு; சிறிய குறையை விட்டுச் செல்ல விரும்பமாட்டீர்கள்.|ஒருவரை நம்புவதற்குமுன் அவரை அதிகமாகச் சோதிப்பீர்கள்; பிடிவாதத்தால் சாதாரண விவாதம் நீளும்.',
'புதிய முறைகளைத் தானே சோதிப்பீர்கள்; வழக்கமான தீர்வை விட மாற்று வழி தேடுவீர்கள்.|முடிவை விரைவாகக் காணவேண்டும் என்ற ஏக்கம் தேவையற்ற அவசரத்தையும் மாற்றத்தையும் உருவாக்கும்.',
'தேவையில்லாத வெளிப்பாட்டைத் தவிர்த்து அமைதியாகச் சிந்திப்பீர்கள்; தனியாகக் கற்றவற்றைச் செயலில் காட்டுவீர்கள்.|மனம் காயமடைந்தால் காரணத்தைத் திறந்துபேசாமல் விலகுவீர்கள்; மற்றவரின் உதவியை மறுத்துவிடுவீர்கள்.'
],
[
'குடும்பத்துக்கான பணப் பொறுப்பை முன்வந்து ஏற்றுக்கொள்வீர்கள்; செலவுக்கு முன் முக்கியத் தேவையைத் தீர்மானிப்பீர்கள்.|தனது வார்த்தை மதிக்கப்படவில்லை என்றால் குடும்பப் பேச்சு கடுமையாகும்; தன்மானத்திற்காகத் தேவையற்ற செலவும் செய்வீர்கள்.',
'வீட்டில் ஒருவர் சிரமப்பட்டால் சேமித்த பணத்தையும் உதவிக்குப் பயன்படுத்துவீர்கள்; அன்பான பேச்சால் சமாதானப்படுத்துவீர்கள்.|மனவருத்தம் ஏற்பட்ட நேரத்தில் செலவு அல்லது பண உறுதி கொடுத்துவிட்டு பின்னர் வருத்தப்படுவீர்கள்.',
'மனதில் பட்டதை நேராகக் கூறுவீர்கள்; சம்பாதிப்பதற்குப் பிறர் உதவியை விடத் தன் முயற்சியை நம்புவீர்கள்.|தவறைச் சுட்டிக்காட்டும் நேரத்தில் வார்த்தை கூர்மையாகும்; திடீர் முடிவுகள் கையிருப்பைக் குறைக்கும்.',
'வாங்கும் முன் விலை, தரம், பயன் அனைத்தையும் ஒப்பிடுவீர்கள்; குடும்பப் பேச்சிலும் ஆதாரம் கேட்பீர்கள்.|கணக்குகளை மீண்டும் மீண்டும் மாற்றுவதால் நிதித் தீர்மானம் தாமதமாகும்; சொற்களை அதிகம் ஆராய்ந்து வாக்குவாதம் நீளும்.',
'பணத்தைத் தேவைக்கு ஏற்பப் பிரித்து வைத்துப் பயன்படுத்துவீர்கள்; குடும்பத்தினருக்குப் பொருள் புரியும்படி விளக்குவீர்கள்.|உதவி கேட்ட அனைவருக்கும் அளவுக்கு மீறி உறுதி கொடுத்து, தன் செலவிற்கே நெருக்கடி ஏற்படுத்துவீர்கள்.',
'குடும்பத் தேவையையும் வாழ்க்கை வசதியையும் இணைத்து நிதி ஒழுங்கை விரும்புவீர்கள்; இனிமையாகப் பேசுவீர்கள்.|அமைதி குலையக்கூடாது என்று பணப் பிரச்சினையைத் தள்ளிப்போட்டு அது பெரிதான பிறகு பேசுவீர்கள்.',
'கிடைக்கும் வருமானத்தை உடனே செலவிடாமல் பாதுகாப்பீர்கள்; கடமைகளுக்கு முன்னுரிமை கொடுப்பீர்கள்.|செலவுக்கான சிறிய விஷயத்திலும் அதிகம் சந்தேகித்து வீட்டில் கடுமையாகப் பேசுவீர்கள்.',
'புதிய வருமான வாய்ப்பைப் பற்றி முதலில் அறிந்து முயல்வீர்கள்; பேச்சால் தொடர்புகளை உருவாக்குவீர்கள்.|உறுதியாகாத வருமானத்தை நம்பி செலவுக்குத் திட்டமிடுவதால் பின்னர் கணக்கு தவறும்.',
'தனிப்பட்ட செலவுகளைப் பிறரிடம் கூறாமல் கையாள்வீர்கள்; தேவையற்ற ஆடம்பரத்தை ஒதுக்குவீர்கள்.|பண விஷயத்தைத் திறந்துபேசாமல் தனியாகச் சுமப்பதால் குடும்பத்தில் புரிதல் குறையும்.'
],
[
'புதிய முயற்சியைத் துவக்குவதில் தயங்கமாட்டீர்கள்; சகோதரருக்குத் தேவையான நேரத்தில் பொறுப்பெடுப்பீர்கள்.|உடன்பிறந்தவர்களின் ஆலோசனையைத் தன் முயற்சிக்கான தடையாகக் கருதி வாக்குவாதம் செய்வீர்கள்.',
'உடன்பிறந்தவரின் தேவையை அறிந்து உதவுவீர்கள்; அனுபவத்தில் கற்ற திறமையைப் பகிர்வீர்கள்.|ஒரு சிறிய கருத்து வேறுபாட்டையே மனதில் சுமந்து ஒத்துழைப்பைத் தற்காலிகமாகக் குறைப்பீர்கள்.',
'புதிதாகக் கற்ற வேலையை உடனே தானே முயல்வீர்கள்; சிரமம் வந்தாலும் மறுபடியும் செய்து முடிப்பீர்கள்.|ஒரு பணியில் முழுக் காரணம் அறியுமுன் செயலில் இறங்குவதால் திருத்தவேண்டிய வேலை அதிகரிக்கும்.',
'தொழில்நுட்பச் சிறு விவரங்களையும் சோதித்து திறமையை உயர்த்துவீர்கள்; மற்றவருக்கு முறையாகக் கற்றுக் கொடுப்பீர்கள்.|திறமையில் சிறு குறை கண்டால் மீண்டும் தொடங்கி நேரத்தைச் செலவிடுவீர்கள்; உடன்பிறந்தவரை அதிகம் விமர்சிப்பீர்கள்.',
'அனுபவத்தில் கற்றதை விளக்கிச் சொல்லுவீர்கள்; ஒருவரின் முயற்சிக்கு சரியான வழி காட்டுவீர்கள்.|தெரிந்த வழியே சிறந்தது என்ற உறுதியால் வேறு முயற்சியைத் தேவையின்றித் தள்ளிவிடுவீர்கள்.',
'கைத்திறன், அலங்காரம் அல்லது வடிவமைப்பு போன்ற முயற்சிகளில் அக்கறையுடன் செயல்படுவீர்கள்; கூட்டு வேலையில் இணக்கம் காப்பீர்கள்.|மற்றவர் வேகம் பொருந்தாததால் வேலையைத் தானே செய்ய முற்பட்டு அவர்களுடன் இடைவெளி உருவாக்குவீர்கள்.',
'ஒரு திறமையை நாள்தோறும் பயிற்சி செய்து கற்றுக்கொள்வீர்கள்; மெதுவான முன்னேற்றத்தையும் கைவிடமாட்டீர்கள்.|முதலில் கடினமாகத் தோன்றும் முயற்சியை அளவுக்கு அதிகமாகத் தயங்கி தாமதப்படுத்துவீர்கள்.',
'புதிய கருவி, புதிய முறை அல்லது புதிய தொடர்பு வழியாக முயற்சிக்குத் தொடக்கம் காண்பீர்கள்.|திடீரென முறையை மாற்றிக்கொண்டே இருப்பதால் பழைய முயற்சியின் பலன் முழுமையடையாது.',
'அமைதியாகத் தனித்துப் பயிற்சி செய்து தேர்ச்சி பெறுவீர்கள்; பலரின் கவனத்தைத் தேடமாட்டீர்கள்.|உடன்பிறந்தவரிடம் உதவி கேட்டால் பலவீனம் என்று எண்ணித் தனியாகச் சிரமப்படுவீர்கள்.'
],
[
'வீட்டின் முக்கிய முடிவுகளைத் தானே ஒழுங்குபடுத்துவீர்கள்; தாயாரின் தேவையைப் பொறுப்பாகக் கவனிப்பீர்கள்.|வீட்டு விஷயங்களில் தன்னுடைய வார்த்தையே இறுதி முடிவாக இருக்க வேண்டும் என்ற பிடிப்பு உருவாகும்.',
'வீட்டில் யாருக்காவது கவலை இருந்தால் முதலில் உணர்ந்து சமாதானப்படுத்துவீர்கள்; உறவுகளுக்கு நேரம் ஒதுக்குவீர்கள்.|குடும்பத்தில் சிறிய மனவருத்தமும் வீட்டின் அமைதியை குலைத்ததாக உணர்ந்து நீண்ட நேரம் வருந்துவீர்கள்.',
'வீட்டில் பழுதான பொருளை உடனே சரிசெய்ய விரும்புவீர்கள்; சொத்தைப் பராமரிப்பதில் முன்னின்று செயல்படுவீர்கள்.|பழுதைச் சரிசெய்யும் அவசரத்தில் வீட்டாரின் கருத்தைக் கேட்காமல் செலவையோ மாற்றத்தையோ மேற்கொள்வீர்கள்.',
'வீடு அல்லது வாகனத் தேர்வில் பயன்பாடு, பராமரிப்பு, செலவு அனைத்தையும் ஒப்பிடுவீர்கள்.|வீட்டில் ஒவ்வொரு குறையையும் சுட்டிக்காட்டுவதால் அங்கிருப்பவர்களுக்கு நெருக்கடி ஏற்படும்.',
'தாயாரும் வீட்டாரும் எதை எதிர்பார்க்கிறார்கள் என்று கேட்டுத் திட்டமிடுவீர்கள்; சொத்துத் தீர்மானத்தில் நீண்டகாலப் பயனைப் பார்ப்பீர்கள்.|தனது நல்ல ஆலோசனை ஏற்கப்படாதால் மனதில் குறையை வைத்துக்கொண்டு அதை மீண்டும் பேசுவீர்கள்.',
'வீட்டின் வசதி, அழகு, அமைதி ஆகியவற்றை ஒருங்கே பேணுவீர்கள்; உறவினர் வந்தால் வரவேற்க விரும்புவீர்கள்.|அமைதி குலையக்கூடாது என்பதற்காக வீட்டு பிரச்சினையை நேரத்தில் பேசாமல் விட்டுவிடுவீர்கள்.',
'வீடு வாங்குதல் அல்லது பராமரிப்பில் அவசரப்படாமல் படிப்படியாக ஏற்பாடு செய்வீர்கள்; சொத்து ஆவணங்களைப் பாதுகாப்பீர்கள்.|குடும்ப உறுப்பினரின் சிறிய பிழையைக் கூட மறக்காமல் கூறிக்கொண்டிருப்பதால் வீட்டுச் சுகம் குறையும்.',
'வழக்கமான வீட்டமைப்பிலிருந்து மாறுபட்ட வசதிகளைத் தேடுவீர்கள்; புதிய இடம் பற்றித் தகவல் சேர்ப்பீர்கள்.|வீட்டையோ இருப்பிடத்தையோ அடிக்கடி மாற்றவேண்டும் என்ற எண்ணம் குடும்பத்தினருக்குச் சிரமம் தரும்.',
'வீட்டில் அமைதியான தனி இடம் வைத்துக் கொள்ள விரும்புவீர்கள்; தேவைக்கு மட்டும் செலவு செய்வீர்கள்.|தாயாரோ உறவினரோ புரிந்துகொள்ளவில்லை என்ற எண்ணத்தில் பேசாமல் விலகுவீர்கள்.'
],
[
'கற்ற அறிவை மற்றவர்களுக்கு எடுத்துரைப்பீர்கள்; குழந்தைகளின் கேள்விக்கு நேரம் ஒதுக்கி விளக்குவீர்கள்.|தான் கற்ற முறையை மற்றவரும் பின்பற்ற வேண்டும் என்று வற்புறுத்தி குழந்தைகளிடம் கடுமையாக நடப்பீர்கள்.',
'குழந்தைகள் மற்றும் இளையோரின் மனநிலையைப் புரிந்து கற்பிப்பீர்கள்; படித்ததை அனுபவத்துடன் இணைப்பீர்கள்.|கல்வியில் ஒரு தோல்வியையே அதிகமாக மனதில் வைத்து தன் திறமையைத் தானே சந்தேகிப்பீர்கள்.',
'படிப்பில் கடினமான பகுதியை நேரடியாகச் செய்து கற்றுக்கொள்வீர்கள்; போட்டியில் சோர்வடையமாட்டீர்கள்.|பதில் உடனே வராதபோது கோபம் கொண்டு படிப்பை இடைநிறுத்துவீர்கள்; இளையோரிடம் பொறுமை குறையும்.',
'கேட்ட செய்தியைத் தானே ஆராய்ந்து உறுதிப்படுத்துவீர்கள்; தவறுகளைத் திருத்துவதால் நுட்பமான அறிவு வளரும்.|ஒரு சிறிய குறையைத் திருத்திக்கொண்டே இருப்பதால் பெரிய இலக்குக்கான நேரம் குறையும்.',
'கற்ற அறிவின் காரணத்தையும் பயன்பாட்டையும் புரிந்து பிறருக்கு வழிகாட்டுவீர்கள்; ஆசிரியரிடமும் கேள்வி கேட்பீர்கள்.|தன் கருத்து நியாயமானது என்ற உறுதியில் புதிதாக வந்த ஆதாரத்தை ஏற்கத் தயங்குவீர்கள்.',
'கலை, கற்பனை, வடிவமைப்பு ஆகியவற்றைக் கற்றலுடன் இணைப்பீர்கள்; குழந்தைகளிடம் மென்மையாகப் பழகுவீர்கள்.|அனைத்தும் அழகாகவும் சரியாகவும் இருக்க வேண்டும் என்ற எதிர்பார்ப்பு குழந்தைகள் மீது அழுத்தம் தரும்.',
'கடினமான பாடத்தையும் தொடர்ந்து பயிற்சி செய்து தேர்ச்சி பெறுவீர்கள்; படிப்பில் ஒழுங்கு காப்பீர்கள்.|முடிவெடுப்பதில் தாமதமும் தன்னைத்தானே அதிகமாக விமர்சிப்பதும் கற்றல் ஆர்வத்தைத் தணிக்கும்.',
'புதிய பாடம் அல்லது தொழில்நுட்பத்தை விரைவில் கற்று வேறு முறையில் பயன்படுத்துவீர்கள்.|ஒரே நேரத்தில் பல விஷயங்களைத் தொடங்குவதால் ஒன்றில் ஆழம் பெறத் தாமதமாகும்.',
'தனியாகப் படித்து அரிய விவரங்களை அறிந்து கொள்வீர்கள்; சாதாரணமாகத் தெரியாத காரணத்தை கண்டுபிடிப்பீர்கள்.|பிறர் உதவியைத் தவிர்த்துத் தனியாகக் கற்கும்போது தேவையற்ற தடையை உருவாக்குவீர்கள்.'
],
[
'வேலையில் முக்கியப் பொறுப்பை ஏற்றுப் போட்டியை எதிர்கொள்வீர்கள்; கடனுக்கான கணக்கையும் காலவரிசையையும் அமைப்பீர்கள்.|தன் திறனை நிரூபிக்கவேண்டும் என்ற வேகத்தில் கூடுதல் கடமைகளை ஏற்று ஓய்வை இழப்பீர்கள்.',
'உடன் பணியாற்றுபவரின் சிரமத்தை உணர்ந்து உதவுவீர்கள்; பணிப் பிரச்சினையில் சமரசம் தேடுவீர்கள்.|வேலைக்குள் ஏற்பட்ட மனவருத்தத்தை வீட்டிலும் சுமப்பீர்கள்; தேவைப்பட்ட உதவியைக் கேட்கத் தயங்குவீர்கள்.',
'போட்டியாளரை நேரடியாகச் சந்திப்பீர்கள்; சிரமமான வேலையையும் தள்ளிவைக்காமல் செய்து முடிப்பீர்கள்.|வேகமாக முடிக்கவேண்டும் என்ற முயற்சியில் ஆவணங்களையும் கடன் நிபந்தனைகளையும் முழுவதும் படிக்காமல் முடிவெடுப்பீர்கள்.',
'வேலையின் கணக்கு, ஆவணம், ஒழுங்கு ஆகியவற்றைச் சரியாகப் பார்த்து பிழைகளைத் தவிர்ப்பீர்கள்.|ஒவ்வொரு சிறு பிழையையும் சரிசெய்யும் பிடிப்பால் வேலை முடியும் நேரம் தள்ளிப்போகும்.',
'பிரச்சினையைத் துண்டுகளாகப் பிரித்து தீர்வு தருவீர்கள்; மற்றவரும் கற்றுக்கொள்ளும் வகையில் விளக்குவீர்கள்.|அனைவருடைய சுமையையும் தானே சுமக்க வேண்டும் என்ற எண்ணத்தால் கடமைகள் பெருகும்.',
'பணியிடத்தில் நல்லுறவு பேணுவீர்கள்; கருத்து வேறுபாட்டை சமரசமாக்க முயல்வீர்கள்.|இணக்கம் குலையக்கூடாது என்று கடன் அல்லது ஒப்பந்தச் சிக்கலைத் தாமதமாக எதிர்கொள்வீர்கள்.',
'நாள்தோறும் கடமையை ஒழுங்காகச் செய்து படிப்படியாக உயர்வீர்கள்; சிரமத்திற்கு மத்தியில் தொடர்வீர்கள்.|பணிச்சுமை அதிகமாகும்போது மற்றவரிடம் வேலையைப் பகிராமல் தானே செய்து சோர்வடைவீர்கள்.',
'போட்டியில் தனித்த வழி தேடுவீர்கள்; வழக்கமான வேலை முறையை மேம்படுத்த முயல்வீர்கள்.|உடனடி வெற்றிக்காக உறுதியாகாத வேலை வாய்ப்பையோ கடனையோ ஏற்றுக்கொள்வீர்கள்.',
'மறைமுகமாக உள்ள பிரச்சினையைத் தனியாகக் கண்டுபிடித்து சரிசெய்வீர்கள்; பாராட்டைத் தேடமாட்டீர்கள்.|உதவி கேட்காமல் நீண்ட நேரம் வேலை செய்து தனிமையில் சுமையை அதிகப்படுத்துவீர்கள்.'
],
[
'நெருக்கமான உறவில் மற்றவரின் கருத்தைக் கேட்டு முக்கிய முடிவில் பொறுப்பெடுப்பீர்கள்; உறவுக்குத் தக்க பாதுகாப்பளிப்பீர்கள்.|துணைவர் தன் முடிவை ஏற்க வேண்டும் என்று எதிர்பார்த்தால் விவாதம் நீளும்.',
'துணைவரின் மனநிலையை உடனே உணர்ந்து அக்கறையுடன் பழகுவீர்கள்; சிறிய உதவியையும் நினைவில் வைத்திருப்பீர்கள்.|எதிர்பார்த்த அன்பு கிடைக்காதபோது சொல்லாமல் மனவருத்தம் வைத்துக்கொள்வீர்கள்.',
'கூட்டாகச் செய்யும் பணியில் விரைவாக முன்வந்து முடிவெடுப்பீர்கள்; உறவைப் பாதுகாக்கத் துணிவுடன் நிற்பீர்கள்.|கோபம் வந்த உடனே பதிலளிப்பதால் தீர்க்கக்கூடிய கருத்து வேறுபாடும் தீவிரமாகும்.',
'பிரச்சினையைத் திறந்துபேசி காரணம் கண்டுபிடிப்பீர்கள்; கூட்டு முடிவில் ஒப்பந்த நிபந்தனைகளை ஆராய்வீர்கள்.|உறவில் ஒவ்வொரு வார்த்தைக்கும் விளக்கம் தேடி இயல்பான உரையாடலைச் சிக்கலாக்குவீர்கள்.',
'துணைவருக்கு நியாயமான ஆலோசனை கூறுவீர்கள்; நீடித்த குடும்பத் திட்டத்தில் பொறுப்பாக இருப்பீர்கள்.|தானே சிறந்த வழிகாட்டி என்ற எண்ணத்தில் துணைவரின் விருப்பத்திற்கு இடம் குறைவாகத் தருவீர்கள்.',
'பாசத்தையும் சமரசத்தையும் வெளிப்படுத்துவீர்கள்; சிறிய நல்ல அனுபவங்களால் உறவை வளர்ப்பீர்கள்.|பிரச்சினையைக் நேரடியாகச் சொல்லாமல் தவிர்ப்பதால் பின்னர் மனக்கசப்பு பெருகும்.',
'உறுதியான உறவைப் படிப்படியாக வளர்ப்பீர்கள்; ஒருமுறை கொடுத்த வாக்கைக் காப்பீர்கள்.|முந்தைய தவறைத் தொடர்ந்து நினைத்து நெருக்கமான உறவில் மற்றவரை மீண்டும் மீண்டும் சந்தேகிப்பீர்கள்.',
'வழக்கத்திற்கு மாறான பின்னணி அல்லது கருத்துடையவர்களுடன் ஒத்துழைப்பீர்கள்; புதுமையான தீர்வு தேடுவீர்கள்.|உறவில் உடனடித் திருப்தி வேண்டும் என்ற அவசரம் பரஸ்பர புரிதலைக் குறைக்கும்.',
'துணைவரின் தனிநேரத்தை மதிப்பீர்கள்; உறவின் உள்ளார்ந்த அர்த்தத்தைப் புரிந்துகொள்வீர்கள்.|மனவருத்தமானபோது ஒன்றும் பேசாமல் விலகுவதால் துணைவருக்கு குழப்பம் ஏற்படும்.'
],
[
'திடீர் மாற்றம் வந்தாலும் முக்கியக் கடமையைத் தள்ளாமல் செயலில் இறங்குவீர்கள்; தகவலைச் சேமிப்பீர்கள்.|எதிர்பாராத மாற்றத்தைத் தனது மரியாதைக்கு வந்த சவாலாக எடுத்துக்கொண்டு உடனடியாக எதிர்ப்பீர்கள்.',
'திடீர் சிக்கலில் பிறர் எவ்வாறு பாதிக்கப்படுகிறார்கள் என்று கவனித்து உதவுவீர்கள்.|முன்பு ஏற்பட்ட பாதிப்பை நீண்ட நேரம் நினைத்து அடுத்த முடிவிலும் அதற்குப் பயப்படுவீர்கள்.',
'சூழல் மாறும்போது வேறு வழி தேடி விரைந்து தொடங்குவீர்கள்; கடினமான வேலையைத் தவிர்க்கமாட்டீர்கள்.|முழு விவரம் அறியாமல் உடனடி நடவடிக்கை எடுப்பதால் மீண்டும் திருத்த வேண்டியிருக்கும்.',
'மறைக்கப்பட்ட தகவலைத் தேடி உண்மையை அறிந்து கொள்ளுவீர்கள்; ஆவணங்களைச் சரிபார்ப்பீர்கள்.|எல்லாவற்றிலும் சந்தேகம் தேடுவதால் சாதாரண மாற்றமும் பெரும் பிரச்சினையாகத் தோன்றும்.',
'கஷ்டமான சூழலிலிருந்து அறிந்ததைப் பிறருக்கு விளக்குவீர்கள்; நீண்டகாலத் திட்டத்தை மறுசீரமைப்பீர்கள்.|தனது பழைய நம்பிக்கையை மாற்ற மறுத்து புதிய சூழலுக்கு ஏற்ப பழகத் தாமதிப்பீர்கள்.',
'உறவு பாதிக்காமல் மாற்றத்தைக் கையாளுவீர்கள்; பழைய உடன்பாட்டைத் திருத்திப் பேசி புதிய ஒப்புதல் பெறுவீர்கள்.|அமைதி காக்க வேண்டும் என்பதற்காக அவசியமான உண்மையைத் தாமதமாகப் பகிர்வீர்கள்.',
'நீண்ட சவாலில் முறையை மாற்றாமல் ஒழுங்காகத் தொடர்வீர்கள்; பாதுகாப்பான மாற்றுத் திட்டம் வைத்திருப்பீர்கள்.|மாற்றத்தை மனதில் ஏற்கத் தாமதித்து காலத்தால் தீர்க்கக்கூடிய சிக்கலையும் பெரிதாக்குவீர்கள்.',
'நெருக்கடியிலிருந்து புதுமையான வழியைத் தேடி மீள்வீர்கள்; வழக்கமற்ற தகவல்களையும் ஆராய்வீர்கள்.|ஆதாரம் முழுமையில்லாத செய்தியை நம்பி தேவையற்ற அச்சம் அடைவீர்கள்.',
'தனியாக ஆராய்ச்சி செய்து மறைந்த காரணத்தைத் தெரிந்துகொள்வீர்கள்; ரகசியத்தைப் பாதுகாப்பீர்கள்.|பிரச்சினையை பிறருடன் பகிராமல் தனியே சுமந்து தீர்வு தாமதமாகும்.'
],
[
'பெரியோர் அறிவுரையை நடைமுறையில் நிறைவேற்றுவீர்கள்; தர்மம் சார்ந்த கடமைகளில் முன்னின்று செயல்படுவீர்கள்.|ஆசிரியரின் கருத்து தன் நம்பிக்கையுடன் பொருந்தாதபோது உரையாடலைக் கடுமையாக்குவீர்கள்.',
'தந்தை அல்லது வழிகாட்டியின் தேவைக்கு உணர்வோடு பதிலளிப்பீர்கள்; குடும்ப மரபை மதிப்பீர்கள்.|பெரியவர் சொன்ன ஒரு கடுமையான வார்த்தையை நீண்டகாலம் மனதில் வைத்துக்கொள்வீர்கள்.',
'நம்பிய கொள்கைக்காக உழைப்பீர்கள்; வழிகாட்டுதலைக் கேட்டு செயலில் இறங்குவீர்கள்.|முழுமையாக அறியுமுன் ஒரு கருத்தை எதிர்ப்பதால் நல்ல ஆலோசனையைத் தவறவிடுவீர்கள்.',
'ஆசிரியர் கொடுத்த தகவலைச் சோதித்து உண்மையைத் தேர்ந்தெடுப்பீர்கள்; அறிந்ததை மற்றவருக்குக் கற்பிப்பீர்கள்.|சிறிய முரண்பாடுகளையே பெரிதாக்கி முக்கியமான அறிவுரையைப் பின்பற்றத் தாமதிப்பீர்கள்.',
'அனுபவத்துடன் அறநெறியை இணைத்து முடிவெடுப்பீர்கள்; பிறருக்கு வழிகாட்டும்போது நீதியைக் காப்பீர்கள்.|தனது கொள்கை மட்டுமே சரி என்ற பிடிப்பு வேறு அனுபவங்களை ஏற்க விடாமல் தடுக்கும்.',
'பெரியோருடன் இணக்கமாகப் பழகி குடும்ப மரபுகளைப் பேணுவீர்கள்; வழிபாடு, கலை தொடர்பில் ஈடுபடுவீர்கள்.|மற்றவரை வருத்தக்கூடாது என்று முக்கியமான கருத்து வேறுபாட்டை வெளிப்படுத்தாமல் இருப்பீர்கள்.',
'நம்பிய வழியை பொறுமையாகப் பின்பற்றுவீர்கள்; முன்னோர்களின் அனுபவத்தை கடமையாகக் கருதுவீர்கள்.|முன்பு பெற்ற வழிமுறையை மாற்றத் தயங்குவதால் புதிய பயனுள்ள ஆலோசனையைத் தாமதமாக ஏற்றுக்கொள்வீர்கள்.',
'வழக்கத்திற்கு மாறான அறிவைத் தேடுவீர்கள்; வேறு மரபுகளிலிருந்தும் பயன்பாட்டை அறிந்து கொள்வீர்கள்.|உடனடி முடிவு அளிக்கும் புதிய நம்பிக்கையைச் சோதிக்காமல் பின்பற்றுவீர்கள்.',
'தனியாகத் தியானித்து அல்லது படித்து கொள்கையை உருவாக்குவீர்கள்; வெளிப்பாட்டைவிட அர்த்தத்திற்கு மதிப்பளிப்பீர்கள்.|பிறர் கொடுத்த ஆலோசனையை மனதுக்குள் வைத்துக்கொண்டு தெளிவு கேட்காமல் தவறாகப் புரிந்துகொள்வீர்கள்.'
],
[
'பொறுப்பான வேலையை முன்னின்று ஏற்றுச் செய்வீர்கள்; செய்து முடித்த பணியால் பிறரின் நம்பிக்கையைப் பெறுவீர்கள்.|பதவி அல்லது மதிப்பில் ஏற்பட்ட சிறு எதிர்ப்பையும் பெரிதாக எடுத்துக்கொண்டு பணியில் கடுமையாக நடப்பீர்கள்.',
'உடன் பணியாற்றுபவரின் தேவையைப் புரிந்து ஒத்துழைப்பீர்கள்; வாடிக்கையாளரின் மனநிலையைக் கவனிப்பீர்கள்.|தொழிலில் ஒருவர் கூறிய விமர்சனத்தை மனதில் வைத்து முடிவெடுக்கும் வேகம் குறையும்.',
'தொழிலில் புதிய முயற்சியைத் தொடங்குவீர்கள்; சிக்கலான வேலையைத் நேரடியாகச் செய்து முடிப்பீர்கள்.|வேலை முடிவை விரைவாகக் காணவேண்டும் என்று ஒரே நேரத்தில் பல திட்டங்களைத் தொடங்குவீர்கள்.',
'தொழிலின் சிறிய பிழையையும் கண்டுபிடித்து திருத்துவீர்கள்; முறையையும் ஆவணங்களையும் தெளிவாக்குவீர்கள்.|தொடர்ந்து திருத்திக்கொண்டே இருப்பதால் வேலை நேரத்தில் முடிவதிலும் ஒப்படைப்பதிலும் தாமதம் ஏற்படும்.',
'வாடிக்கையாளர் அல்லது பணியாளர் பிரச்சினைக்கு காரணம் கண்டுபிடித்து விளக்குவீர்கள்; நம்பிக்கையை நிலைப்படுத்துவீர்கள்.|பிறருடைய வேலைக்கும் தானே தீர்வு சொல்ல வேண்டும் என்ற எண்ணம் கூடுதல் பொறுப்பை உருவாக்கும்.',
'உறவுகளையும் திறமையையும் இணைத்துத் தொழிலில் வாய்ப்பை உருவாக்குவீர்கள்; பேச்சுவார்த்தையில் இணக்கம் காண்பீர்கள்.|ஒப்பந்தத்தில் மறுபக்கம் வருந்தக்கூடாது என்பதற்காக தன் நிபந்தனையைத் தெளிவாகக் கூறாமல் விடுவீர்கள்.',
'ஒரே தொழிலில் தொடர்ந்து உழைத்து தரமான பணியால் நம்பிக்கை பெறுவீர்கள்; முடிவுகளுக்குப் பொறுப்பெடுப்பீர்கள்.|மற்றவரை நம்பாமல் எல்லாப் பணியையும் தானே சுமந்து முன்னேற்ற வேகம் குறையும்.',
'புதிய தொழில்நுட்பம் அல்லது வழக்கமற்ற சேவை முறையை முயல்வீர்கள்; புதுமை மூலம் கவனம் பெறுவீர்கள்.|விரைவான வளர்ச்சிக்காகப் பல புதிய முயற்சிகளை ஒன்றாகத் தொடங்கிப் பழைய பணியை முடிக்காமல் விடுவீர்கள்.',
'தொழிலின் ஆழமான விவரத்தைத் தனியாகக் கற்று நிபுணத்துவம் பெறுவீர்கள்; விளம்பரத்தை விடத் திறமையை நம்புவீர்கள்.|தன்னுடைய வேலையை மற்றவருக்குக் காட்டாமல் வைத்துக்கொள்வதால் அங்கீகாரம் பெறத் தாமதமாகும்.'
],
[
'முக்கியத் தொடர்புகளைப் பேணி வருமானத்திற்கான வாய்ப்பை உருவாக்குவீர்கள்; குழுவில் பொறுப்புடன் செயல்படுவீர்கள்.|அங்கீகாரத்தின் பேரில் நண்பரிடம் தேவையற்ற நிதி உறுதி அளிப்பீர்கள்.',
'நண்பரின் தேவையை அறிந்து உதவுவீர்கள்; பழைய தொடர்பை அக்கறையுடன் பேணுவீர்கள்.|அன்புக்காகச் சேமிப்பை மிகையாகப் பயன்படுத்தி பின்னர் குறை உணர்வீர்கள்.',
'வாய்ப்பைக் கண்டவுடன் முயற்சியில் இறங்குவீர்கள்; கூட்டுத் திட்டத்தை முன்னெடுத்து ஆதாயம் தேடுவீர்கள்.|ஆதாயம் உறுதியாகுமுன் அடுத்த செலவு அல்லது திட்டத்திற்குச் செல்லும் அவசரம் உண்டு.',
'கிடைக்கும் வருமானத்தை ஒப்பிட்டுப் பதிவு செய்வீர்கள்; எதிர்கால இலக்கிற்குக் கணக்கு வைத்திருப்பீர்கள்.|கணக்குகளைத் தொடர்ந்து மாற்றிக் கொண்டிருப்பதால் முதலீடு அல்லது சேமிப்பு முடிவு தாமதமாகும்.',
'நல்ல வழிகாட்டுதலால் வாய்ப்பை அறிந்துகொள்வீர்கள்; கிடைத்த ஆதாயத்தில் ஒரு பகுதியைப் பாதுகாப்பீர்கள்.|எல்லாருக்கும் உதவ வேண்டும் என்ற எண்ணத்தில் தனது நீண்டகாலச் சேமிப்பைக் குறைப்பீர்கள்.',
'நண்பர்களுடன் இணைந்து பயன் தரும் தொடர்பை வளர்ப்பீர்கள்; கலை அல்லது சேவை வழி ஆதாயம் தேடுவீர்கள்.|நல்லுறவு காப்பதற்காக நிதி தொடர்பான தெளிவான எல்லை வைக்கத் தயங்குவீர்கள்.',
'மெதுவாக வந்த வருமானத்தையும் பாதுகாத்து நீடித்த சேமிப்பாக மாற்றுவீர்கள்; பல ஆண்டுகளுக்கான இலக்கு அமைப்பீர்கள்.|வாய்ப்பைப் பற்றி அதிகமாகச் சந்தேகித்துத் தேவையான முடிவையும் தாமதப்படுத்துவீர்கள்.',
'புதிய சந்தையோ வலையமைப்போ வழியாக வருமான வாய்ப்பைத் தேடுவீர்கள்; புதுமையில் ஈடுபடுவீர்கள்.|வராத வருமானத்தைக் கணக்கில் சேர்த்து முன்கூட்டியே செலவு செய்வீர்கள்.',
'சிறிய வட்டத்திலிருந்தும் நம்பகமான தொடர்பைப் பேணுவீர்கள்; தனித்த முயற்சியின் ஆதாயத்தை அமைதியாகச் சேமிப்பீர்கள்.|நண்பரிடம் உதவி கேட்க விரும்பாமல் தனியாக முயன்று சில வாய்ப்புகளைத் தவறவிடுவீர்கள்.'
],
[
'தனிநேரத்திலும் பொறுப்பைச் சீராகப் பகிர்வீர்கள்; பயனற்ற செலவை வெட்டித் திட்டமிடுவீர்கள்.|மரியாதைக்காகத் தேவைக்கு அதிகமாகச் செலவு செய்து ஓய்வையும் குறைப்பீர்கள்.',
'தனிமையில் மனதை அமைதிப்படுத்துவீர்கள்; நெருக்கமானவருக்குத் தெரியாமல் உதவி செய்வீர்கள்.|உணர்ச்சிக் கவலையை உள்ளுக்குள் வைத்துப் படுக்கும்போதும் அதையே நினைத்துக்கொண்டிருப்பீர்கள்.',
'தேவையான வேலையை விரைவாக முடித்துத் தனிநேரத்தைப் பாதுகாப்பீர்கள்; திட்டமிட்ட பயணத்தில் ஈடுபடுவீர்கள்.|தீராத வேலையை உடனே முடிக்க வேண்டும் என்று இரவு ஓய்வையும் குறைத்துக்கொள்வீர்கள்.',
'செலவுகளைத் தெளிவாகப் பிரித்து எழுதுவீர்கள்; தனிமையில் இருந்து புதிய விஷயத்தைக் கற்பீர்கள்.|சிறிய செலவையும் தொடர்ந்து கணக்கிடுவதால் ஓய்வுக்குரிய நேரத்திலும் மனம் செயல்பட்டுக் கொண்டிருக்கும்.',
'தனியாகச் சிந்தித்துப் பெரிய முடிவுக்கு வழி காண்பீர்கள்; கல்வி அல்லது உதவிக்குத் திட்டமிட்டுச் செலவு செய்வீர்கள்.|பிறருக்காக எல்லா நேரத்தையும் செலவிட்டு தனக்குத் தேவையான ஓய்வைத் தள்ளுவீர்கள்.',
'கலை, பக்தி அல்லது அமைதியான பொழுதுபோக்குக்குத் தனிநேரம் தருவீர்கள்; செலவில் அளவு காப்பீர்கள்.|தற்காலிக மனநிம்மதிக்காகத் தேவைக்கு அதிகமாகச் செலவிட்டு பின்னர் கணக்கில் நெருக்கடி ஏற்படும்.',
'ஓய்வுக்கான நேரத்தை ஒழுங்காக நிர்ணயிப்பீர்கள்; தனியாக நீண்ட முயற்சியைப் பொறுமையாகச் செய்வீர்கள்.|முடிக்காத கடமையை நினைத்து ஓய்வைத் தள்ளுவதால் அன்றாட உறக்க நேரம் குறையும்.',
'புதிய அனுபவத்திற்கும் தூர இடங்களுக்குமான செலவைத் திட்டமிடுவீர்கள்; அமைதியான ஆய்வில் ஈடுபடுவீர்கள்.|உறுதியாகாத தகவலின் பேரில் செலவு செய்து பின்னர் திட்டம் மாற்றுவீர்கள்.',
'அமைதியான தனிநேரத்தில் ஆழ்ந்து படிப்பீர்கள்; வேண்டாத பொருட்செலவைத் தவிர்ப்பீர்கள்.|எண்ணங்களைப் பிறரிடம் பகிராமல் தனியாகப் போராடுவதால் உறவுகளின் உதவி கிடைக்காமல் போகும்.'
]
];
const EN=[
['You take the lead when someone needs a decision.|Criticism of your standing sparks a sharp reply.','You readily comfort someone in distress.|A hurtful remark from a loved one stays on your mind.','You confront an obstacle without waiting for help.|You answer a perceived wrong before hearing the whole account.','You verify what others tell you.|You keep checking minor details long after a decision is due.','You offer guidance with clear reasons.|You find it hard to hear an alternative to your advice.','You try to preserve affection during disagreements.|You avoid saying what bothers you until resentment grows.','You finish a duty even when it takes longer.|You distrust others and prolong minor disagreements.','You test a new solution rather than follow routine.|Impatience for a quick result disrupts a sound plan.','You work out your thoughts privately.|You withdraw instead of asking for needed assistance.'],
['You assume family financial responsibility.|Your pride turns money discussions into disputes.','You put savings toward a relative who needs help.|Emotion leads you to promise money too soon.','You speak plainly and try to earn by your own effort.|Sharp words strain family ties and impulsive spending reduces savings.','You check prices and household figures before deciding.|Repeated recalculation delays an important financial decision.','You budget essentials and explain choices patiently.|Over-generous commitments cut into your own reserves.','You combine comfort with orderly family spending.|You postpone an uncomfortable budget conversation.','You preserve hard-earned money for future duties.|Excessive caution turns minor purchases into arguments.','You notice unusual ways to increase income.|You spend against earnings that are not yet secured.','You keep personal expenses modest.|Keeping all money concerns private causes misunderstanding.'],
['You begin difficult work without waiting for others.|Siblings or collaborators feel overruled by your initiative.','You share practical skills and help siblings.|You carry a small hurt into later discussions.','You learn a skill by trying it directly.|You rush into work before understanding what needs checking.','You improve a skill through repeated testing.|You revise an already workable solution too often.','You explain what experience has taught you.|You reject another useful method because your own seems superior.','You take care with design and collaborative skills.|You take over others’ work when their pace differs.','You practise steadily until a skill becomes reliable.|You put off a difficult first attempt for too long.','You experiment with unfamiliar tools and methods.|Frequent changes prevent a useful method from maturing.','You develop expertise quietly and independently.|You refuse help that would save time.'],
['You organise household obligations and care for relatives.|You expect the family to accept your final decision.','You notice distress at home and offer reassurance.|A small household conflict lingers in your mind.','You repair household problems promptly.|Hasty repair or spending choices bypass the family.','You compare upkeep, cost and utility before buying.|Repeated criticism of household details unsettles others.','You plan property decisions for lasting benefit.|You repeatedly revisit advice that others declined.','You maintain an inviting and comfortable home.|You avoid speaking about an issue until tension accumulates.','You make slow, methodical property decisions.|You keep reminding relatives of earlier mistakes.','You explore new living arrangements and amenities.|Frequent changes of plan disturb domestic stability.','You maintain a quiet private area at home.|You retreat rather than resolve a family disagreement.'],
['You share knowledge and answer younger people’s questions.|You expect children or students to follow your way.','You adjust teaching to a child’s feelings.|One academic setback makes you question your ability.','You learn difficult material through hands-on effort.|Impatience disrupts teaching and study.','You challenge information and correct small errors.|Perfectionism keeps you revising completed work.','You explain both the reason and purpose of what you learn.|Certainty in your own opinion blocks new evidence.','You combine creativity with patient instruction.|Expecting perfect results puts strain on children.','You practise a demanding subject until it becomes clear.|Excessive self-criticism slows the learning process.','You rapidly adopt unfamiliar technology or subjects.|Too many interests prevent sustained progress.','You discover overlooked details by studying alone.|Avoiding assistance creates unnecessary obstacles.'],
['You take ownership of a difficult assignment.|You assume too many duties to prove yourself.','You help coworkers through stressful periods.|Workplace hurt follows you into private time.','You challenge competitors and finish difficult tasks.|You act on a debt or agreement before checking its terms.','You keep records and rectify mistakes at work.|Checking every small error delays delivery.','You explain complicated problems to coworkers.|You take responsibility for everyone’s difficulties.','You preserve cooperation in a demanding workplace.|You postpone discussing difficult contractual terms.','You sustain steady work through pressure.|You carry every duty alone and tire yourself.','You look for unconventional solutions to competition.|You accept uncertain jobs or debts too quickly.','You quietly detect hidden problems.|You work in isolation instead of seeking help.'],
['You shoulder your share of a partnership.|You demand that your partner endorse your decisions.','You notice your partner’s feelings and show care.|Unspoken disappointment becomes resentment.','You act promptly to protect a shared commitment.|Angry words turn a manageable dispute into a larger one.','You discuss the reasoning behind an agreement.|Questioning every phrase complicates ordinary conversation.','You give thoughtful guidance and plan for the long term.|You leave too little room for your partner’s preferences.','You show affection and make room for compromise.|Avoiding a difficult discussion allows resentment to grow.','You honour long-term commitments.|You repeatedly revisit an old mistake and become distrustful.','You discover creative ways to cooperate.|Expecting quick satisfaction weakens mutual understanding.','You respect private space within a relationship.|You withdraw without explaining your distress.'],
['You take charge when circumstances change.|You interpret an unexpected change as a challenge to your status.','You support people affected by sudden disruption.|Past disappointments colour a new decision.','You act quickly to find an alternative plan.|You rush into a change before checking the facts.','You investigate hidden causes and examine documents.|You turn ordinary uncertainty into an extensive suspicion.','You learn from hard circumstances and reorganise plans.|You cling to an old explanation despite changed facts.','You renegotiate commitments while preserving relationships.|You put off sharing information that needs discussion.','You keep working through a drawn-out difficulty.|You resist necessary change and prolong the strain.','You find unconventional routes out of a setback.|Unverified information magnifies worry.','You carry out quiet research and protect confidences.|You carry a problem alone rather than discuss it.'],
['You put respected guidance into practice.|You argue strongly when an elder questions your beliefs.','You show gratitude and care toward mentors.|A harsh remark from an elder remains on your mind.','You work for a principle you consider important.|You challenge advice before hearing it fully.','You verify what a teacher says and share what you learn.|Small inconsistencies eclipse the central lesson.','You connect ethical principles with lived experience.|Strong conviction prevents you hearing different experience.','You preserve family traditions with kindness.|You conceal an important disagreement to keep the peace.','You follow a long-held principle consistently.|You hesitate to reconsider advice learned years earlier.','You seek knowledge beyond familiar traditions.|You accept a promising new claim too quickly.','You study a belief in private before expressing it.|You misunderstand advice instead of asking for clarity.'],
['You take visible responsibility and finish difficult work.|Concern for status makes workplace criticism feel personal.','You understand clients and help colleagues cooperate.|A critical remark slows your professional decisions.','You begin challenging professional work with energy.|You start too many projects before finishing the first.','You find technical flaws and document solutions.|Continuous revision delays delivery and handover.','You explain the reasons behind sound work and earn trust.|You take on other people’s responsibilities unnecessarily.','You establish trust through effective collaboration.|Avoiding an awkward negotiation weakens your terms.','You earn regard by steady reliable work.|You do too much alone because delegation feels risky.','You experiment with new services and technology.|Hurrying toward quick growth leaves unfinished work.','You develop specialist skill through quiet study.|Keeping your work unseen postpones recognition.'],
['You build useful contacts through shared responsibility.|You promise financial help to win recognition.','You sustain caring friendships over time.|Generosity cuts into necessary savings.','You act quickly when a genuine opportunity arrives.|You plan expenses before earnings are confirmed.','You track actual gains against longer goals.|Endless recalculation delays a saving decision.','You learn about opportunities from knowledgeable people.|Helping everyone reduces your long-term reserves.','You build alliances through service and goodwill.|Avoiding clear money boundaries complicates friendships.','You steadily preserve slow-earned gains.|You become so cautious that worthwhile decisions are postponed.','You find new networks and markets.|You treat expected earnings as certain money.','You preserve a small reliable network.|Reluctance to ask friends for help costs you opportunities.'],
['You arrange private time and cut needless spending.|You spend to defend appearances and sacrifice rest.','You gain quiet relief from caring and reflection.|Unspoken worries follow you into bedtime.','You finish essential tasks promptly and reserve quiet hours.|Unfinished work drives you to cut sleep.','You budget private expenses and study independently.|Minor financial calculations consume time meant for rest.','You reflect on long-term choices and spend on learning.|Helping others leaves too little room for your own recovery.','You enjoy art and quiet recreation within a budget.|Short-lived comforts turn into excessive spending.','You protect rest through a steady routine.|Duty continues to occupy your thoughts long after work.','You make plans for travel or novel experiences.|Unverified expectations lead to wasteful spending.','You use solitude to study and think deeply.|You withhold concerns and miss help from those close to you.']
];
const ENDING_TA=[
['நியாயமான காரணம் புரிந்த பிறகு எடுத்த முடிவை உறுதியாக நிறைவேற்றுவீர்கள்.','எதிர்க்கும் முன் முழுக் காரணத்தையும் கேட்டால் தேவையற்ற உரசல் குறையும்.'],
['குடும்பத் தேவைக்கான பணத்தையும் விருப்பச் செலவையும் தனித்தனியாக வைத்துச் செயல்படுவீர்கள்.','வார்த்தையின் வேகத்தையும் பண உறுதிகளையும் கட்டுப்படுத்தாவிட்டால் உறவில் இடைவெளி உருவாகும்.'],
['ஒரு முறையைத் தேர்ந்தெடுத்து தொடர்ந்து பயிற்சி செய்வதன் மூலம் தனித்திறனை நிலைப்படுத்துவீர்கள்.','ஒரே வேலையைத் திரும்பத் திரும்பத் தொடங்குவதற்குப் பதிலாக முடித்துக் கொடுப்பதில் கவனம் தேவை.'],
['வீட்டாரின் தேவையையும் பராமரிப்புச் செலவையும் இணைத்துச் சிறந்த முடிவை எடுப்பீர்கள்.','வீட்டைச் சீராக வைத்திருக்க முயலும்போது அங்கே வாழ்பவர்களின் கருத்து புறக்கணிக்கப்படக்கூடாது.'],
['ஆராய்ந்த அறிவை நடைமுறைப் பயன்பாட்டிற்கு கொண்டு வருவது உங்கள் கற்றலின் சிறந்த வெளிப்பாடு.','எல்லாம் குறையின்றி இருக்க வேண்டும் என்ற எதிர்பார்ப்பு இளையோருக்கு அதிக அழுத்தம் தரும்.'],
['பொறுப்புகளை முன்னுரிமைப்படுத்தினால் சிரமமான பணியையும் முடித்து நம்பிக்கை பெறுவீர்கள்.','எல்லாவற்றையும் தனியாக ஏற்கும் முயற்சி உங்கள் நேரத்தையும் மன ஆற்றலையும் குறைக்கும்.'],
['துணைவருடன் கருத்தைத் தெளிவுபடுத்தி இருவருக்கும் பொருந்தும் முடிவை உருவாக்குவீர்கள்.','ஒரே முடிவை வற்புறுத்துவதால் எளிதில் தீரக்கூடிய கருத்து வேறுபாடும் நீளும்.'],
['பழைய அனுபவத்தைக் கொண்டு மாற்றுத் திட்டம் உருவாக்குவது உங்கள் முக்கியமான பதில் ஆகும்.','உண்மையைச் சரிபார்க்கும் பழக்கம் அளவுக்கு மீறிச் சந்தேகமாக மாறினால் முடிவு தாமதப்படும்.'],
['கேட்ட அறிவுரையைச் செயலில் சோதித்து உங்களுக்கு ஏற்ற நல்ல வழியைத் தேர்ந்தெடுப்பீர்கள்.','தன் கொள்கையைப் பாதுகாப்பதற்காகப் புதிய சரியான ஆதாரத்தை நிராகரிக்க வேண்டாம்.'],
['முடித்த பணியின் தரமே உங்களுடைய தொழில் மதிப்பை உருவாக்கும்.','தொடங்கிய முயற்சிகளை முழுமைப்படுத்தாமல் அடுத்த முயற்சிக்குச் செல்வது நம்பிக்கையைக் குறைக்கும்.'],
['உறுதியான வருமானத்தில் ஒரு பகுதியைப் பாதுகாப்பதால் நீண்டகால இலக்கு நிலைபெறும்.','வரப்போகும் ஆதாயத்தை வருமானம் என்று எண்ணி முன்கூட்டியே கடமை ஏற்காதீர்கள்.'],
['அமைதியான நேரத்தைப் பாதுகாத்தால் பிற பொறுப்புகளையும் தெளிவாகக் கையாள்வீர்கள்.','முடிக்காத வேலைகளுக்காக உறக்க நேரத்தை அடிக்கடி ஒதுக்குவது வாழ்க்கை ஒழுங்கைக் குலைக்கும்.']
];
const ENDING_EN=[
['You act consistently once the facts are clear.','Hearing the full story before answering reduces needless friction.'],
['You separate household essentials from optional spending.','Sharp words and premature promises strain trust at home.'],
['Continued practice turns an initial effort into a dependable skill.','Finishing a chosen method matters more than restarting it.'],
['You balance upkeep costs against the needs of those at home.','A well-ordered home also needs room for others’ preferences.'],
['You apply knowledge rather than simply collecting it.','Demanding flawless work puts excessive pressure on younger people.'],
['You gain confidence by prioritising and completing duties.','Carrying everything alone consumes the time needed to recover.'],
['You make space for joint choices and plain discussion.','Insisting on one answer needlessly prolongs disagreement.'],
['Past experience helps you prepare an alternative plan.','An endless search for certainty postpones necessary action.'],
['You test advice in practice before adopting it.','New evidence deserves a hearing even when conviction runs strong.'],
['Completed work, not quick promises, earns your professional regard.','Leaving projects unfinished weakens others’ confidence.'],
['You preserve a portion of reliable income for later needs.','Projected gains should not be spent like money already earned.'],
['Protecting quiet time improves how you handle other obligations.','Letting unfinished tasks consume sleep disrupts daily routines.']
];

/* V295: evaluated ruler-house -> lived consequence. Avoid generic route filler. */
const LORD_ROUTE_LIVED_TA=[["தன் முடிவைச் செயல்படுத்தும் முன் அதன் நுணுக்கங்களைத் தானே கற்றுத் தெளிவுபடுத்துவீர்கள். எதிர்பார்த்த பலன் கிடைக்காதபோது வேறு முறையைச் சோதித்து மீண்டும் தொடங்குவீர்கள்.","குடும்பத்தின் பொருளாதார நிலையும் வீட்டாரின் எதிர்பார்ப்பும் உங்கள் தனிப்பட்ட முடிவுகளில் இடம் பெறும். பிறருக்காக எடுத்த பொறுப்பை முடித்த பிறகே சொந்தத் திட்டத்திற்குத் திரும்புவீர்கள்.","ஒரு சிக்கலைத் தீர்ப்பதற்காகத் தன் நேரத்தை அதிகம் செலவழிப்பீர்கள். வெளியே அமைதியாகத் தெரிந்தாலும் முடிக்காத வேலை மனத்தில் தொடர்ந்து ஓடும்.","நீங்கள் எடுக்கும் முடிவுகள் மற்றவர்களுடன் இணைந்து வேலை செய்வதிலும் வெளிப்படையாகப் பொறுப்பேற்பதிலும் பிரதிபலிக்கும். கருத்து வேறுபாடு ஏற்பட்டாலும் உங்கள் காரணத்தை விளக்காமல் விலகமாட்டீர்கள்."],["கற்ற திறமை அல்லது தனிப்பட்ட முயற்சிக்காக வீட்டின் வரவு செலவைக் கணக்கிட்டுப் பயன்படுத்துவீர்கள். ஒரு செலவு பயன் தருமா என்பதை அறியாமல் பணம் ஒதுக்க விரும்பமாட்டீர்கள்.","வீட்டுத் தேவையும் சேமிப்பும் ஒன்றோடொன்று போட்டியிடும். குடும்பத்தாரின் அவசரத் தேவைக்குப் பணம் செலவிட்ட பிறகு மீண்டும் சேமிப்பைச் சீரமைப்பீர்கள்.","வேலை அல்லது தவிர்க்க முடியாத கடமைகளின் காரணமாகச் சேமிப்புத் திட்டத்தில் இடைவெளி ஏற்படும். அவசரச் செலவைச் சந்தித்த பின்னர் செலவுப் பழக்கத்தைத் திருத்துவீர்கள்.","கூட்டு ஒப்பந்தங்கள் அல்லது பிறருடன் செய்யும் பணியின் மூலம் பணம் தொடர்பான முடிவுகள் உருவாகும். ஒப்புக்கொண்ட தொகையும் உண்மையில் கிடைக்கும் தொகையும் பொருந்துகிறதா என்று கவனிப்பீர்கள்."],["புதிய திறமையைக் கற்ற பிறகு அதைத் தனியாக முயன்று பார்க்கிறீர்கள். கற்றது செயல்படவில்லை என்றால் வேறு கருவியையோ அணுகுமுறையையோ தேர்ந்தெடுப்பீர்கள்.","உடன்பிறந்தவர்கள் அல்லது குடும்பத்தாரின் தேவையை நிறைவேற்றுவதற்காக நேரமும் முயற்சியும் செலவிடுவீர்கள். அவர்களிடம் எதிர்பார்த்த உதவி கிடைக்காவிட்டால் வேலையைத் தானே முடிப்பீர்கள்.","போட்டி அல்லது அன்றாடப் பொறுப்பின் நடுவே புதிய திறமையை வளர்க்க வேண்டியிருக்கும். நீண்ட முயற்சிக்குப் பிறகு செய்த தவறுகளைத் திருத்திக் கொள்ளும் அனுபவம் பெருகும்.","மற்றவருடன் இணைந்து செய்யும் திட்டத்தில் உங்கள் திறமை வெளிப்படும். வேலைப் பங்கீடு தெளிவில்லாதபோது அவர்களுடைய வேலையையும் உங்கள் பொறுப்பாக எடுத்துக்கொள்வீர்கள்."],["வீட்டில் ஒரு மாற்றம் செய்வதற்கு முன் அதன் செலவு, பயன், பராமரிப்பு ஆகியவற்றைக் கற்றுத் தீர்மானிப்பீர்கள். வீட்டாரின் தேவையை நிறைவேற்றுவதிலும் திட்டமிடுவதிலும் நீங்களே முன்னின்று செயல்படுவீர்கள்.","வீட்டுக்கான பொருட்கள், சொத்துப் பராமரிப்பு, குடும்பச் சேமிப்பு ஆகியவற்றுக்குள் பணத்தை ஒதுக்க வேண்டியிருக்கும். ஒரு வசதிக்காகச் செலவிட்ட பிறகு மற்ற தேவையைச் சிறிது தள்ளி வைப்பீர்கள்.","வீட்டு அமைதியைப் பாதிக்கும் அன்றாடச் சுமைகளைத் தனியாகத் தீர்க்க முயற்சிப்பீர்கள். வேலைச் சிரமம் வீட்டிற்குள் தொடர்ந்தால் தனிநேரத்தைத் தேடுவீர்கள்.","வீட்டுச் சொத்து அல்லது குடியிருப்பு பற்றிய முடிவுகளில் மற்றவரின் ஒப்புதலும் பொதுப் பொறுப்பும் முக்கியமாகும். ஒருவரே முடிவெடுப்பதைவிட ஆவணங்களையும் நிபந்தனைகளையும் தெளிவுபடுத்துவீர்கள்."],["ஒரு பாடத்தை அப்படியே மனப்பாடம் செய்வதைவிட அதைச் செய்து பார்த்தே புரிந்துகொள்வீர்கள். கற்ற முறையில் குறை தெரிந்தால் திருத்திப் புதிய முறையை உருவாக்குவீர்கள்.","குடும்பச் சூழலும் கிடைக்கும் வசதிகளும் கற்றல் முறையைத் தீர்மானிக்கும். வீட்டில் இருக்கும் கருவிகளையும் வாய்ப்புகளையும் பயன்படுத்தித் திறமையை மேம்படுத்துவீர்கள்.","தினசரி வேலைச் சுமை அல்லது சவால்களுக்கு இடையிலும் படிப்பை விடமாட்டீர்கள். சிரமமான பாடத்தை சிறு பகுதிகளாகப் பிரித்துப் பயிற்சி செய்வீர்கள்.","கூட்டாகக் கற்கும்போது உங்கள் கருத்தை விளக்கி மற்றவர்களிடமும் விளக்கம் கேட்பீர்கள். வேறுபட்ட முறையில் கற்பவர்களுடன் பணிபுரிவது உங்கள் புரிதலை விரிவுபடுத்தும்."],["சிக்கலான பணியைக் கற்றுத் தீர்வு கண்ட பிறகு அதை மற்றவரும் செய்யும் வகையில் விளக்குவீர்கள். அனுபவத்தில் கிடைத்த முறையையே அடுத்த சவாலுக்குப் பயன்படுத்துவீர்கள்.","பணப் பொறுப்போ குடும்பத் தேவையோ அதிகரித்தால் அன்றாட வேலையை நேரம் பிரித்துச் செய்வீர்கள். செலவு குறைக்க வேண்டிய நேரத்தில் சில வசதிகளைத் தற்காலிகமாகக் கட்டுப்படுத்துவீர்கள்.","ஒரே நேரத்தில் பல வேலைகள் வந்தாலும் முதலிலே எதை முடிக்க வேண்டும் என்று பட்டியலிடுவீர்கள். வேலை நீளும்போது ஓய்வுக்கான நேரம் குறைவதே சிரமமாக இருக்கும்.","கூட்டுப் பணியில் மற்றவர் செய்ய வேண்டிய பொறுப்பும் உங்களிடம் வந்து சேரும். ஒப்பந்தம் மற்றும் வேலைப் பங்கீட்டைத் தெளிவுபடுத்தினால் கருத்து வேறுபாடு குறையும்."],["நெருங்கிய உறவில் ஒருவரையொருவர் புரிந்துகொள்ள நேரம் செலவிடுவீர்கள். ஏன் ஒரு முடிவு எடுக்கிறீர்கள் என்பதை விளக்கிய பிறகே மற்றவர் சம்மதத்தை எதிர்பார்ப்பீர்கள்.","குடும்பத்தின் தேவைகள் அல்லது பணச் செலவுகள் உறவில் விவாதத்திற்கு வரும். ஒரு தேவைக்காகச் செலவு செய்யும் முன் மற்றவரின் முன்னுரிமையையும் கேட்டுக் கொள்வீர்கள்.","வேலைச் சுமை, நேரப் பற்றாக்குறை ஆகியவை இருவரும் பேசிக் கொள்ளும் நேரத்தைக் குறைக்கலாம். மனவருத்தத்தை மறைத்துவைப்பதைவிட வேலையையும் நேரத்தையும் பகிர்வதில் மாற்றம் செய்வீர்கள்.","கூட்டு முடிவெடுப்பதில் தன்னுடைய கருத்தைத் தெளிவாகக் கூறுவீர்கள்; மற்றவர் கருத்தும் பொருந்தும் வரை விவாதம் நீளும். பொறுப்பைச் சரியாகப் பகிர்ந்துகொண்டாலே உறவில் நம்பிக்கை வளரும்."],["திடீரென மாறிய சூழலை முதலில் ஆராய்ந்து அதன் அடிப்படைக் காரணத்தைத் தேடுவீர்கள். நேரம் எடுத்தாலும் புரிந்துகொண்ட பிறகு அதற்கான மாற்று ஏற்பாட்டைத் தேர்ந்தெடுப்பீர்கள்.","குடும்பப் பணம் அல்லது சொத்துச் சிக்கல் காரணமாக முன்பே திட்டமிட்ட செயலை மாற்ற வேண்டியிருக்கும். எதிர்பாராத செலவுக்கு ஏற்றாற்போல் திட்டத்தைச் சுருக்குவீர்கள்.","முடிக்கப்படாத வேலை அல்லது மறைக்கப்பட்ட தகவல் வெளிவந்தால் அதைத் தீர்ப்பதில் நேரம் செலவிடுவீர்கள். ஒரு தவறிலிருந்து கற்றதை அடுத்தமுறை பாதுகாப்பு முறையாக மாற்றுவீர்கள்.","பிறருடன் செய்த ஒப்பந்தத்தில் புதிய விவரம் தெரியவரும்போது அதைத் திறந்துபேசி மாற்றுவீர்கள். முழுப் பொறுப்பையும் தனியாக ஏற்காமல் தொடர்புடையவர்களிடமிருந்து தெளிவு பெறுவீர்கள்."],["கற்ற அறிவைத் தனியாகச் சோதித்துப் பார்த்த பிறகே வழிகாட்டும் ஒருவரின் ஆலோசனையை ஏற்றுக்கொள்வீர்கள். அனுபவத்துடன் பொருந்தும் ஆலோசனையையே தொடர்ந்து பின்பற்றுவீர்கள்.","குடும்பத்தின் பழக்கங்களும் பெரியோர் அளித்த வழிகாட்டுதலும் உங்கள் நம்பிக்கைகளை வடிவமைக்கும். தேவைகள் மாறும்போது அந்த வழிமுறைகளில் பயன்படும் பகுதியை மட்டும் காப்பாற்றுவீர்கள்.","ஒரு சிரமமான அனுபவத்திலிருந்து பெற்ற பாடத்தை அடுத்த முடிவில் பயன்படுத்துவீர்கள். கஷ்டம் வந்த நேரத்தில் கிடைக்கும் ஆலோசனையைச் செயலில் சோதித்துப் பார்ப்பீர்கள்.","ஆசிரியர், பெரியோர் அல்லது பொதுப் பொறுப்பில் இருப்பவர்களுடன் கருத்துப் பரிமாற்றம் நடைபெறும். கேள்வி கேட்கத் தயங்காததால் உறவின் அடிப்படை தெளிவாகும்."],["தனியாகக் கற்ற திறனை வெளியில் பயன்படும் வேலையாக மாற்ற முயற்சிப்பீர்கள். புதிய பொறுப்பை ஏற்ற பிறகு அதற்கான முறைகளைத் தொடர்ந்து மேம்படுத்துவீர்கள்.","வேலை பற்றிய முடிவுகளை எடுக்கும்போது குடும்பச் செலவுகளையும் நீண்டகாலப் பாதுகாப்பையும் கணக்கில் எடுப்பீர்கள். உடனடி வருமானத்திற்காகத் திட்டமிட்ட வேலையை விட்டுவிடத் தயங்குவீர்கள்.","சிரமமான வேலை மற்றும் பிறர் தவிர்க்கும் பொறுப்புகளைக் கையாளும் வாய்ப்பு அதிகம். ஆனால் ஒரே நேரத்தில் பல சிக்கல்களைத் தீர்க்க முயன்றால் ஒரு வேலையின் நிறைவு தள்ளிப்போகும்.","கூட்டாளிகள் அல்லது வாடிக்கையாளர்களுடன் நேரடியாகப் பேசித் தீர்வு காணும் பணியில் உங்கள் திறமை வெளிப்படும். நம்பிக்கையைப் பெறுவதற்கு வாக்குறுதியைவிட முடித்த பணியின் தரத்திற்கே முக்கியத்துவம் அளிப்பீர்கள்."],["தனக்கான புதிய திறனோ தனிப்பட்ட முயற்சியோ மூலமாகத் தொடர்புகளை வளர்த்துக் கொள்வீர்கள். கிடைத்த ஆதாயத்தை அடுத்த இலக்கிற்காகச் சேமிப்பீர்கள்.","குடும்பத் தேவைகளுக்கும் சொந்த இலக்குகளுக்கும் சேமிப்பை ஒதுக்க முயற்சிப்பீர்கள். நண்பர்களுக்காகச் செலவு செய்தாலும் அடிப்படைத் தேவையை விட்டுக்கொடுக்க விரும்பமாட்டீர்கள்.","நீண்டகால முயற்சிக்குப் பிறகே சில ஆதாயங்கள் கைக்கு வரும். எதிர்பார்த்த தொகை தாமதமானால் செலவைக் குறைத்து பழைய திட்டத்தைச் சீரமைப்பீர்கள்.","கூட்டுத் தொடர்புகள் வழியாக புதிய முயற்சிகளைக் கேள்விப்படுவீர்கள். யார் பொறுப்பேற்கிறார், ஆதாயம் எப்படிப் பகிரப்படுகிறது என்பதை அறிந்த பிறகே முழுமையாக இணைவீர்கள்."],["படிப்புக்கும் தனிப்பட்ட ஆராய்ச்சிக்கும் அமைதியான நேரத்தைத் தேடுவீர்கள். மனதில் தோன்றிய புதிய திட்டத்தை இரவு நேரமெல்லாம் சிந்திப்பதால் ஓய்வைத் தள்ளிவைக்கும் பழக்கம் உருவாகும்.","குடும்பத்தாருக்கான செலவும் தனிப்பட்ட தேவையும் மோதும்போது அவசியமானதைத் தேர்ந்தெடுப்பீர்கள். சேமிப்பைச் செலவழித்த பிறகு மீண்டும் ஒழுங்குபடுத்துவீர்கள்.","சிக்கலான பணியை முடிக்காமல் ஓய்வெடுப்பது உங்களுக்குச் சிரமமாக இருக்கும். வேலை முடிந்ததும் அமைதியாகத் தனிநேரம் எடுத்துக் கொண்டுதான் அடுத்த செயலில் ஈடுபடுவீர்கள்.","பிறருடன் இணைந்து செய்யும் பணிக்காகப் பயணமோ தனிநேர ஒதுக்கீடோ தேவைப்படும். இந்தப் பொறுப்புகளுக்கிடையில் தனக்கு ஓய்வான நேரம் வேண்டும் என்பதைத் தெளிவாகச் சொல்வீர்கள்."]];
const LORD_ROUTE_LIVED_EN=[["You learn the details behind a decision before putting it into practice. If it fails, you test another approach rather than abandon the aim.","Household needs and financial security enter your personal choices. You often finish a responsibility for someone close before returning to your own plans.","You devote substantial private time to solving a stubborn problem. Even when you appear calm, unfinished duties can continue occupying your thoughts.","Personal choices become visible through work with others and public responsibilities. You explain your reasons rather than simply walk away from a disagreement."],["You use savings to improve a skill or independent effort, checking its practical value before committing money.","Household costs compete with saving. After an urgent family expense, you work to restore the buffer.","Work obligations interrupt a savings plan; unexpected costs lead you to revise your spending habits.","Joint work or agreements shape money decisions. You check whether the promised amount matches what is actually received."],["You learn a practical skill and quickly try it for yourself. When one method fails, you test a different tool or approach.","You spend time and effort supporting siblings or household members. If expected help does not arrive, you finish the task independently.","Daily responsibilities make you practise a skill under pressure. Mistakes become practical lessons that gradually improve the method.","You demonstrate ability in shared projects. When duties are unclear, you can end up completing someone else's share too."],["Before changing the home, you learn about cost, usefulness and maintenance. You take an active role in planning what your household needs.","Housing expenses, upkeep and savings compete for the same funds. A new convenience can mean delaying another necessary purchase.","You try to solve the daily burdens that disturb home life. When work troubles follow you home, you look for quiet personal time.","Housing and property choices require other people's agreement. You clarify documents and conditions instead of relying on one person's preference."],["You understand a lesson by testing it, not only memorizing it. An identified flaw prompts a revised and more useful method.","Resources at home influence how you learn. You make effective use of available tools and opportunities to develop skills.","You keep practising even when study has to fit around demanding daily responsibilities. Difficult subjects are broken into manageable steps.","Working with peers allows you to explain your approach and hear theirs. Different learning styles broaden your understanding."],["You learn a solution to a difficult task and then explain it so others can repeat it. A tested method helps you tackle the next challenge.","Family needs or financial duties make you schedule daily tasks carefully. You temporarily cut conveniences to meet necessary expenses.","When several tasks arrive at once, you rank them by urgency. Prolonged work can leave too little time for rest.","Shared work often leaves you carrying another person's duties. Clear terms and responsibilities reduce avoidable conflict."],["You invest time in understanding another person's point of view. You explain why you made a choice before seeking agreement.","Family expenses become subjects of joint discussion. You ask what matters most to the other person before making a commitment.","Workload and limited time reduce opportunities to talk. Sharing practical duties helps address resentment before it grows.","You state your position clearly during joint decisions. Trust grows when each participant can take responsibility for a fair share."],["Unexpected changes lead you to look for the underlying cause. Once the reason becomes clearer, you plan a workable alternative.","A family expense or property problem forces you to revise an earlier plan. You narrow the plan to meet the unexpected cost.","Unfinished work or new confidential information requires extra attention. You turn lessons from a difficult episode into safeguards.","New information in a shared agreement prompts discussion and revision. You seek clarification instead of assuming the whole burden alone."],["You test what you have learned before fully accepting guidance. Advice that holds up in practice becomes part of your habits.","Family customs and the example of elders shape your beliefs. As circumstances change, you retain what remains useful.","Lessons from difficult experiences guide later decisions. Guidance received in a crisis is tested against practical results.","You exchange ideas with teachers, elders or people in authority. Asking clear questions helps establish mutual understanding."],["A skill developed privately becomes the basis for visible work. After taking on a new responsibility, you keep improving your methods.","You consider family costs and long-term security when choosing work. An immediate reward does not automatically displace a larger plan.","You take on difficult duties that others avoid. Trying to solve too many problems at once, however, delays completion.","Client and colleague conversations bring your skill into view. Finished work earns more trust than promises alone."],["New skills and independent effort help you develop useful connections. You save part of a confirmed gain for a future goal.","You divide savings between family needs and personal plans. Helping friends does not have to consume your essentials.","Some gains arrive only after sustained effort. When payment is delayed, you reduce spending and revise the plan.","Joint contacts introduce new opportunities. You check who is responsible and how rewards will be shared before joining fully."],["You seek private hours for study and reflection. A new idea can keep you thinking late into the night and reduce rest.","Family expenses and personal needs compete. You pay the essentials first and then rebuild your savings.","Stopping before a difficult task is complete can be hard. Once it is finished, you need quiet time before starting again.","Joint work can require travel or personal time. You explain your need for rest while fulfilling shared responsibilities."]];
const LORD_ROUTE_GROUP=[0,1,0,1,0,2,3,2,0,3,1,2];

const ASC_LORD_DEST_TA=["லக்னாதிபதி முதல் வீட்டிலேயே இருப்பதால் உங்கள் முடிவுகளைப் பிறரிடம் ஒப்படைக்காமல் முன்னின்று செயல்படுத்துவீர்கள். செய்யத் தொடங்கிய காரியம் உங்களுடைய தனிப்பட்ட பொறுப்பாகவே மாறும்.", "லக்னாதிபதி இரண்டாம் வீட்டுடன் இணைவதால் குடும்பத்தின் பொருளாதாரத் தேவைகளையும் தன்மானத்தையும் ஒன்றாகக் கருதுவீர்கள். பணம் பற்றிய முடிவில் வீட்டாரின் கருத்தை எளிதில் புறக்கணிக்க மாட்டீர்கள்.", "லக்னாதிபதி மூன்றாம் வீட்டில் இருப்பதால் ஒரு திறமையை மற்றவர் கற்பிப்பதற்காகக் காத்திருக்காமல் தானே முயற்சி செய்வீர்கள். செய்யும்போது ஏற்படும் தவறைத் திருத்தித்தான் அதில் நம்பிக்கை பெறுவீர்கள்.", "லக்னாதிபதி நான்காம் வீட்டில் இருப்பதால் வீட்டின் அமைதிக்கும் தாயார், குடும்பத் தேவைகளுக்கும் அதிக நேரம் ஒதுக்குவீர்கள். வீட்டுச் சிக்கல்களை வெளியே விடாமல் நீங்களே தீர்க்க முற்படுவீர்கள்.", "லக்னாதிபதி ஐந்தாம் வீட்டில் இருப்பதால் புதிதாகக் கற்றதைச் செயலில் சோதித்து அதன் காரணத்தைப் புரிந்துகொள்ளும் ஆர்வம் முன்னிலையாகும். புதிய அறிவைப் பகிர்ந்துகொள்ளும் வாய்ப்புகளைத் தேடுவீர்கள்.", "லக்னாதிபதி ஆறாம் வீட்டில் இருப்பதால் அன்றாடப் பிரச்சினையைக் கண்டுபிடித்துத் தீர்ப்பதில் உங்கள் நேரம் அதிகம் செலவாகும். எதிர்ப்பு வந்தாலும் காரணத்தை விளக்கிச் சரிசெய்யும் முயற்சியைக் கைவிடமாட்டீர்கள்.", "லக்னாதிபதி ஏழாம் வீட்டில் இருப்பதால் உங்கள் முடிவுகள் நெருக்கமான உறவுகளுடனும் கூட்டுச் செயல்களுடனும் தொடர்ந்து இணைந்திருக்கும். மற்றவர் ஒப்புதல் இல்லாமல் எதையும் முழுமையாக முடித்ததாக உணர மாட்டீர்கள்.", "லக்னாதிபதி எட்டாம் வீட்டில் இருப்பதால் எதிர்பாராத மாற்றமோ மறைக்கப்பட்ட தகவலோ வெளிவந்தால் அதன் பின்னணி என்ன என்பதைத் தெரிந்துகொள்வதில் தீவிரம் காட்டுவீர்கள். ஒரு சம்பவம் முடிந்த பின்னரும் அதன் காரணத்தை மீண்டும் ஆராய்வீர்கள்.", "லக்னாதிபதி ஒன்பதாம் வீட்டில் இருப்பதால் பெற்ற அறிவுரையை அனுபவத்தில் சோதித்தே ஏற்றுக்கொள்வீர்கள். பெரியோரின் கருத்தை மதித்தாலும் சொந்தமாகச் சரியான வழியை உறுதிப்படுத்த விரும்புவீர்கள்.", "லக்னாதிபதி பத்தாம் வீட்டில் இருப்பதால் உங்களுடைய அடையாளம் நீங்கள் ஏற்றுப் பூர்த்தி செய்த பொறுப்புகளுடன் இணைந்து நிற்கும். முடித்த வேலையின் தரத்தால் மதிப்பைப் பெற விரும்புவீர்கள்.", "லக்னாதிபதி பதினொன்றாம் வீட்டில் இருப்பதால் நீண்டகால இலக்கை அடைவதற்கான தொடர்புகளையும் முயற்சிகளையும் தொடர்ந்து வளர்ப்பீர்கள். உடனடிப் பலனைக் காட்டிலும் படிப்படியாக உருவாகும் ஆதாயத்தைப் பாதுகாக்க விரும்புவீர்கள்.", "லக்னாதிபதி பன்னிரண்டாம் வீட்டில் இருப்பதால் தனியாகச் சிந்திக்கும் நேரத்திற்கும் பிறருக்குச் செய்யும் உதவிக்கும் முக்கியத்துவம் அளிப்பீர்கள். எல்லோரிடமும் பகிராத கவலைகளை அமைதியாகத் தீர்க்க முயல்வீர்கள்."];
const ASC_LORD_DEST_EN=["With the ascendant lord in the first house, you take direct responsibility for important choices rather than delegate them. Once started, an undertaking feels personally yours to complete.", "The ascendant lord in the second connects identity with family security. You weigh money decisions against the needs and opinions of those at home.", "With the ascendant lord in the third, you try a practical skill instead of waiting for an instructor. Confidence grows as you identify and correct mistakes yourself.", "With the ascendant lord in the fourth, you give attention to domestic peace and the needs of family members. You try to settle a home problem personally before taking it outside.", "The ascendant lord in the fifth encourages you to test what you learn and understand why it works. You look for opportunities to share new knowledge.", "With the ascendant lord in the sixth, considerable energy goes into identifying and resolving everyday problems. Even when challenged, you try to explain the reason for a correction.", "The ascendant lord in the seventh ties personal decisions closely to partners and shared efforts. Agreement with the other person matters before you consider a task complete.", "With the ascendant lord in the eighth, unexpected changes prompt questions about hidden causes. You keep reviewing what happened even after the immediate episode ends.", "The ascendant lord in the ninth leads you to test advice against experience. You respect guidance but still want to verify the right course for yourself.", "The ascendant lord in the tenth makes your identity closely connected with responsibilities you complete. Quality of finished work becomes important to your sense of recognition.", "With the ascendant lord in the eleventh, you cultivate connections that support long-term goals. You value gains built over time more than quick promises.", "The ascendant lord in the twelfth connects identity with private reflection and help given quietly. You prefer to resolve some worries before sharing them widely."];
function hasAspect(d,planet,house){return d.houses[house-1].aspects.includes(planet)}
function joinOthers(d,key){return PLANETS.filter(p=>p!==key&&d.planets[p].house===d.planets[key].house);}
function create(d,n,lang='ta',core,opts={}){
 if(!core||typeof core.influence!=='function')throw Error('V293 requires evaluated D1 influence');
 const ta=lang!=='en',h=d.houses[n-1],lord=d.planets[h.lord],e=core.influence(d,n,opts),pos=e.positive,neg=e.negative;
 const choose=(e.dominantSide==='support'?pos:neg)||e.rows[0];
 const modify=(choose.score>=0?neg:pos)||e.rows.find(x=>x.key!==choose.key)||null;
 const idx=PLANETS.indexOf(choose.key),mid=modify?PLANETS.indexOf(modify.key):-1;
 const text=(k,sign)=>{const j=PLANETS.indexOf(k);const s=(ta?TA:EN)[n-1][j].split('|');return s[sign>=0?0:1];};
 const list=[],add=(t,key,actors)=>{if(t&&!list.some(p=>p.text===t))list.push({house:n,text:t,evidence:{source:key,actors:actors||[]}})};
 if(n===1){let mq=d.planets.Moon.longitude;const nk=Number.isFinite(mq)?Math.floor((((mq%360)+360)%360)/(360/27)):null,pada=Number.isFinite(mq)?Math.floor(((((mq%360)+360)%360)%(360/27))/(360/108))+1:null;
 if(ta)add(`${SIGNS_TA[d.lagna]} லக்னத்தின் ${ASC_TA[d.lagna]} என்ற பொதுவான பண்புடன், ${SIGNS_TA[d.planets.Moon.sign]} ராசியின் ${ASC_TA[d.planets.Moon.sign]} என்ற மனப்பாங்கு கலந்துள்ளது.${nk!==null?' '+NAK_TA[nk]+' '+pada+'-ஆம் பாதத்தின் '+NAK_TONE_TA[nk]+' என்ற இயல்பும் இணைகிறது.':''}`, 'lagna-rasi-nakshatra',['Moon',h.lord]);
 else add(`A ${SIGNS_EN[d.lagna]} ascendant brings ${ASC_EN[d.lagna]}, while the ${SIGNS_EN[d.planets.Moon.sign]} Moon adds ${ASC_EN[d.planets.Moon.sign]}. ${nk!==null?'The Moon is in '+NAK_EN[nk]+' pada '+pada+'.':''} These differing tendencies affect close relationships and decisive moments.`, 'lagna-rasi-nakshatra',['Moon',h.lord]);}
 const first=text(choose.key,choose.score),second=modify?text(modify.key,modify.score):'';
 // Only natal connections (not an arbitrary global personality paragraph) may enter text.
 const context=choose.tags.includes('occupant')?'occupant':choose.tags.includes('aspect')?'aspect':choose.tags.includes('house-lord')?'house-lord':choose.tags.includes('lord-conjunction')?'lord-conjunction':choose.tags.includes('lord-aspect')?'lord-aspect':'linked';
 if(!(n===1&&choose.key==='Saturn'&&hasAspect(d,'Saturn',1)))add(ta?`${first}`:`${first}`,'leading-lived-outcome',[choose.key]);
 if(modify)add(ta?`${second}`:`${second}`,'counter-lived-outcome',[modify.key]);
 // The house ruler belongs to the FOCUS house. Occupants/aspects of the focus
 // house must never be described as occupying the ruler's separate house.
 // Pass 2: the ruler's *actual* house determines a distinct consequence
 // in the current life domain. No global sign traits are pasted here.
 const lordHouse=d.houses[lord.house-1],joined=joinOthers(d,h.lord),lordAspects=lordHouse.aspects;
 const routeGroup=LORD_ROUTE_GROUP[lord.house-1];
 const routeSentence=n===1?(ta?ASC_LORD_DEST_TA:ASC_LORD_DEST_EN)[lord.house-1]:(ta?LORD_ROUTE_LIVED_TA:LORD_ROUTE_LIVED_EN)[n-1][routeGroup];
 // House-lord influence is a separate source of evidence even if a different
 // planet happens to lead the focus-house aspect scores.
 add(routeSentence,'actual-house-lord-lived-consequence',[h.lord,...joined,...lordAspects]);
 // A third *directly contacting* planet can add a distinct consequence,
 // but never by reusing another house's stock text or restating the leading one.
 const third=e.rows.find(r=>r.key!==choose.key&&r.key!==modify?.key&&
   (r.tags.includes('occupant')||r.tags.includes('aspect'))&&
   Math.sign(r.score)===Math.sign(choose.score)&&Math.abs(r.score)>=Math.abs(choose.score)*0.5);
 if(third)add(ta?`${text(third.key,third.score)}`:`${text(third.key,third.score)}`,'third-direct-contact-result',[third.key]);
 if(n===1){
  if(e.moon?.known&&d.houses[d.planets.Moon.house-1].aspects.includes('Mars'))add(ta?'சந்திரனின் உணர்ச்சிப் பிரதிபலிப்பில் செவ்வாயின் வேகம் கலப்பதால், அநியாயம் நடந்ததாக நினைக்கும் நேரத்தில் உடனே எதிர்த்துப் பேசுவீர்கள். சம்பவம் முடிந்த பிறகு காரணத்தை மீண்டும் ஆராய்வது அந்த வேகத்தைச் சீரமைக்கிறது.':'Mars aspecting the Moon adds rapid reactions when something seems unjust. After the moment passes, re-examining the reasons helps settle the response.','moon-mars-conditional',['Moon','Mars']);
  if(hasAspect(d,'Saturn',1)){const s=d.planets.Saturn;add(ta?`${s.dignity==='own'?'சொந்த ராசியில் உள்ள ':''}${s.retrograde?'வக்கிர ':''}சனி லக்னத்தைப் பார்ப்பதால் ஒருவரை நம்புவதற்கு முன் பலமுறை சோதிப்பீர்கள். நீங்கள் கவனித்த தவற்றை அப்படியே விட்டுச் செல்லாமல் திருத்துவீர்கள்; ஆனால் அதே பழக்கம் சாதாரண விவாதத்தையும் நீட்டிக்கும்.`:`${s.dignity==='own'?'Strong ':' '}${s.retrograde?'retrograde ':''}Saturn aspecting the ascendant brings persistence and scrutiny. You correct overlooked errors, but the same resolve can prolong an ordinary disagreement.`,'saturn-asc-conditional',['Saturn']);}
  if(e.moon?.known&&d.planets.Moon.house===d.planets.Jupiter.house&&d.houses[d.planets.Moon.house-1].aspects.includes('Mars')){add(ta?'குருவின் இரக்கமும் நியாய உணர்வும் சந்திரனின் உணர்ச்சியுடன் இணைந்துள்ளன; அதே இடத்தைச் செவ்வாய் பார்ப்பதால் அன்பு வைத்தவரின் தவறையும் உடனடியாகக் கேள்வி கேட்பீர்கள். கோபத்திற்குப் பிறகு தன் பங்கில் தவறு இருந்ததா என்று சிந்தித்து சரிசெய்யும் குணமும் இதனுடன் கலந்து நிற்கிறது.':'Jupiter and Moon together under Mars’s aspect join compassion to a forceful reaction against perceived wrongs. On reflection, you examine your own part and look for a correction.','jupiter-moon-mars-conditional',['Jupiter','Moon','Mars']);}
  // Lunar tithi modifies influence scores; generic Moon-phase filler is not printed.
 }
 if(n===2&&h.lord==='Mars'&&lord.house===3&&hasAspect(d,'Jupiter',2))add(ta?'மனதில் தோன்றிய கருத்தைச் சுற்றிவளைத்துப் பேசாமல் நேரடியாகச் சொல்வீர்கள். தவறைச் சுட்டிக்காட்டும்போது அதன் காரணத்தையும் விளக்குவீர்கள்; ஆனால் வார்த்தையின் வேகம் குடும்பத்தினருக்குக் கடுமையாகத் தோன்றும். எதைச் சொல்கிறீர்கள் என்பதோடு எப்போது சொல்கிறீர்கள் என்பதும் உறவை மாற்றுகிறது.':'With Mars ruling speech from the third house and Jupiter aspecting the second, you speak plainly and explain the reason behind a correction. The timing and sharpness of the words, however, can strain family conversations.','mars-2nd-lord-jupiter-conditional',['Mars','Jupiter']);
 if(n===5&&h.occupants.includes('Mercury')&&h.aspects.includes('Saturn'))add(ta?'கேட்ட தகவலைச் சோதிக்காமல் ஏற்க மாட்டீர்கள். ஏற்கெனவே முடிந்த செயலிலும் சிறிய குறை தெரிந்தால் மறுபடியும் திருத்துவீர்கள்; அந்தத் துல்லியமே கற்றலில் நன்மையாகவும் நேரச் செலவில் தடையாகவும் செயல்படுகிறது.':'Mercury in the fifth under Saturn’s aspect supports checking information and refining work, though repeated revisions can consume the time meant for completion.','mercury-saturn-5th-conditional',['Mercury','Saturn']);
 if(n===10&&h.occupants.includes('Rahu')&&h.aspects.includes('Mars')&&h.aspects.includes('Jupiter'))add(ta?'தொழிலில் புதிய முறையைத் தேர்ந்தெடுத்து முயற்சி செய்வீர்கள். குறைக்கான காரணத்தைக் கண்டுபிடித்து மாற்றும் வேகம் அதிகம்; பல முயற்சிகளைத் தொடங்கும் போதும் ஒன்றை முழுமையாக முடித்துக் காட்டுவதில்தான் உங்கள் மதிப்பு உருவாகிறது.':'Rahu in the tenth, with Mars and Jupiter aspects, combines experimentation and initiative with the need to complete an undertaking and demonstrate its quality.','rahu-mars-jupiter-10th-conditional',['Rahu','Mars','Jupiter']);
 if(list.length<3)add((ta?ENDING_TA:ENDING_EN)[n-1][e.dominantSide==='support'?0:1],'minimum-evidenced-outcome',[choose.key,h.lord]);
 return {number:n,title:(ta?TITLES_TA:TITLES_EN)[n-1],paragraphs:list,evidence:{method:'V295-planet-outcome-and-ruler-placement',focusHouse:n,houseLord:h.lord,actualLordHouse:lord.house,actualLordSign:lord.sign,leadingPlanet:choose.key,leadingScore:choose.score,relation:context,opposingPlanet:modify?.key||null,directOccupants:h.occupants,directAspects:h.aspects,lordHouseOccupants:joined,lordHouseAspects:lordAspects,balance:e.balance,contacts:e.rows,moon:e.moon}};
}
return Object.freeze({create,version:'295-house-specific-ruler-consequence'});
});


/* SMV ASTRO V292 — lean D1 evidence evaluator and output orchestrator.
 * Former V289–V291 stock-prose libraries and unused compilers are not shipped.
 * Pure local calculations; no Firebase, requests, timers or DOM observers.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1HumanNarrative=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const KEYS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
const KARAKA=['Sun','Jupiter','Mars','Moon','Jupiter','Mars','Venus','Saturn','Jupiter','Mercury','Jupiter','Saturn'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const dec=n=>Number.isFinite(n)?Math.round(n*1000)/1000:null;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const dedupe=arr=>[...new Set(arr)];
function lunar(d){const moon=d?.planets?.Moon,sun=d?.planets?.Sun;
 if(!finite(moon?.longitude)||!finite(sun?.longitude))return {known:false,reason:'requires Sun and Moon absolute longitudes',phase:'unknown',strength:null,nature:null};
 const angle=((moon.longitude-sun.longitude)%360+360)%360;
 const strength=1-Math.abs(180-angle)/180; // 0 new, 1 full, 0 next new
 const waxing=angle<180,bright=angle>=48&&angle<228;
 const tithi=Math.floor(angle/12)+1;
 return {known:true,elongation:dec(angle),tithi,phase:angle<180?'waxing':'waning',relativeIllumination:dec((1-Math.cos(angle*Math.PI/180))/2),strength:dec(strength),nature:bright?'benefic':'malefic',threshold:'fifth-tithi user rule',newMoonEquivalent:angle<6||angle>=354?'Saturn/Rahu strength analogy':null,fullMoonEquivalent:Math.abs(180-angle)<6?'Jupiter strength analogy':null};
}
function contactsWith(d,k){const p=d.planets[k];if(!p)return [];return KEYS.filter(x=>x!==k&&d.planets[x]&&p.house===d.planets[x].house);}
function basicNature(k,moon){if(k==='Moon')return moon.known?(moon.nature==='benefic'?0.45+0.85*moon.strength:-1.30*(1-moon.strength*.30)):0;return ({Jupiter:1.3,Venus:1.05,Mercury:0.6,Sun:-0.62,Mars:-0.95,Saturn:-1.22,Rahu:-1.35,Ketu:-1.08})[k]||0;}
function mercuryNature(d,moon){const together=contactsWith(d,'Mercury');const mal=together.filter(k=>basicNature(k,moon)<-0.15),good=together.filter(k=>basicNature(k,moon)>0.15);
 // Do not turn Mercury entirely good merely because Venus shares a sign with a combust Sun.
 const burn=!!d.planets.Mercury.combust;
 const raw=clamp(0.65+good.reduce((s,k)=>s+0.22*Math.abs(basicNature(k,moon)),0)-mal.reduce((s,k)=>s+0.44*Math.abs(basicNature(k,moon)),0)-(burn?.35:0),-1.25,1.25);
 // The configured rule classifies Mercury as malefic upon conjunction with a malefic.
 // Benefic conjunction still mitigates severity, rather than flipping classification.
 const value=mal.length?Math.min(-0.24,raw-(burn?.27:0)):raw;
 return {value,raw,maleficAssociates:mal,beneficAssociates:good,combust:burn};
}
function functional(d,k){const owned=d.houses.filter(h=>h.lord===k).map(h=>h.no);if(!owned.length)return 0;
 let score=0;for(const h of owned){score+=({1:1.05,2:0,3:-0.42,4:0.12,5:0.83,6:-0.72,7:0,8:-0.68,9:0.9,10:0.26,11:-0.3,12:-0.55})[h]||0;}
 return clamp(score,-1.1,1.4);
}
const dignityScore={exalted:1.7,moolatrikona:1.55,own:1.48,friend:1.15,neutral:1,enemy:.87,debilitated:.65,undetermined:1};
function grade(d,k,moon,options){const p=d.planets[k];const dign=options.planetDignity?options.planetDignity(d,p):null;
 const state=dign?.state&&dign.state!=='undetermined'?dign.state:p.dignity;
 let power=dignityScore[state]||1;
 if(p.combust&&k!=='Sun')power*=.8;
 // retrograde can intensify expression/reassessment; no universal 'retrograde is evil' rule.
 if(p.retrograde&&!['Rahu','Ketu'].includes(k))power*=1.10;
 let nat=k==='Mercury'?mercuryNature(d,moon).value:basicNature(k,moon);
 const fn=functional(d,k);
 let val=clamp(nat+.42*fn,-1.8,1.8);
 if(k==='Moon'&&!moon.known)val=.05; // no inferred birth tithi from rasi alone
 if(k==='Moon'&&moon.known){power*=moon.nature==='benefic'?(0.65+.5*moon.strength):(1.25-.3*moon.strength);}
 return {key:k,sign:p.sign,house:p.house,retrograde:!!p.retrograde,combust:!!p.combust,dignity:state,power:dec(power),natural:dec(nat),functional:dec(fn),direction:dec(val),mercury:k==='Mercury'?mercuryNature(d,moon):undefined};
}
function influence(d,focus,options={}){
 const h=d.houses[focus-1],lord=d.planets[h.lord],moon=lunar(d),influences=new Map();
 const take=(key,kind,weight)=>{if(!d.planets[key])return;const old=influences.get(key)||{key,weight:0,tags:[]};old.weight=Math.max(old.weight,weight);old.tags.push(kind);influences.set(key,old);};
 take(h.lord,'house-lord',1.6);
 for(const k of h.occupants)take(k,'occupant',1.55);
 for(const k of h.aspects)take(k,'aspect',1.13);
 for(const k of contactsWith(d,h.lord))take(k,'lord-conjunction',.78);
 for(const p of Object.values(d.planets))if(p.key!==h.lord&&d.houses[lord.house-1].aspects.includes(p.key))take(p.key,'lord-aspect',.80);
 const dispositor=d.houses.find(x=>x.sign===lord.sign)?.lord;if(dispositor&&dispositor!==h.lord)take(dispositor,'lord-dispositor',.48);
 // Primary karaka is independent only if a different graha; never double-count same root.
 take(KARAKA[focus-1],'karaka',.42);
 const rows=[...influences.values()].map(x=>{const g=grade(d,x.key,moon,options);let adjustment=0;
  // In an upachaya house, persistent malefic discipline can have constructive effort effects.
  if([3,6,10,11].includes(focus)&&['Saturn','Mars'].includes(x.key)&&x.tags.includes('occupant'))adjustment=.28*g.power;
  const scalar=g.direction*g.power*x.weight+adjustment;
  return {...g,tags:dedupe(x.tags),weight:x.weight,score:dec(scalar),abs:Math.abs(scalar)};
 }).sort((a,b)=>b.abs-a.abs||KEYS.indexOf(a.key)-KEYS.indexOf(b.key));
 const good=rows.filter(x=>x.score>0).reduce((s,x)=>s+x.score,0),bad=-rows.filter(x=>x.score<0).reduce((s,x)=>s+x.score,0);
 const balance=(good-bad)/(good+bad||1),dominant=balance>.13?'support':balance<-.13?'pressure':'mixed';
 const pos=rows.filter(x=>x.score>0).sort((a,b)=>b.score-a.score)[0]||null;
 const neg=rows.filter(x=>x.score<0).sort((a,b)=>a.score-b.score)[0]||null;
 return {house:focus,houseLord:h.lord,lordHouse:lord.house,lordSign:lord.sign,moon,good:dec(good),bad:dec(bad),balance:dec(balance),dominant,dominantSide:balance>=0?'support':'pressure',rows,positive:pos,negative:neg,allNinePlanetsReviewed:KEYS.length,relatedHouses:dedupe(rows.map(x=>x.house)).sort((a,b)=>a-b)};
}
function render(d,lang='ta',options={}){
 if(!Number.isInteger(d?.lagna)||!Array.isArray(d?.houses)||d.houses.length!==12||KEYS.some(k=>!d?.planets?.[k]))throw Error('Complete normalized D1 with all nine planets required');
 const locale=lang==='en'?'en':'ta';
 const livedApi=(typeof globalThis!=='undefined'&&globalThis.SMVD1LivedResultsV293)||((typeof module==='object'&&module.exports)?globalThis.SMVD1LivedResultsV293:null);
 if(!livedApi||typeof livedApi.create!=='function')throw Error('V293 lived-result module not loaded');
 const physicalApi=(typeof globalThis!=='undefined'&&globalThis.SMVD1PhysicalMedical)||((typeof module==='object'&&module.exports)?require('./d1-physical-medical.js'):null);
 if(!physicalApi||typeof physicalApi.physical!=='function'||typeof physicalApi.medical!=='function')throw Error('V291 physical/medical reader not loaded');
 const natalTopics=Array.from({length:12},(_,i)=>livedApi.create(d,i+1,locale,{influence},options));
 const v301=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)||null;
 return {lang:locale,lagnaSign:d.lagna,
 topics:v301?.enhanceLife?v301.enhanceLife(d,natalTopics,locale):natalTopics,
 physicalTopics:Array.from({length:12},(_,i)=>physicalApi.physical(d,i+1,locale,{influence},options)),
 medicalTopics:physicalApi.medical(d,locale,{influence},options),
 lunarEvidence:lunar(d),source:'D1-only',method:'V295 contextual house outcomes + V293 physical/medical'};
}
return Object.freeze({render,lunar,influence,grade,version:'295-lagba-evidence-outcome'});
});

;

/* ---- d1-physical-medical.js (preserves original execution order) ---- */
/* SMV ASTRO V293 — house-conditioned constitution and traditional medical symbolism.
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

/* V300: Kalapurusha body signs and 12 house-specific physical readings.
 * The classic sources describe symbolic correspondences, not validated
 * clinical predictions. Do not classify a human as diseased or disabled.
 * BPHS ch.3 (planetary constitution), ch.12 (body), ch.17 (sixth house);
 * Brihat Jataka ch.1 & ch.20 (body/sign and placements).
 * Preserve normalized natal D1 and existing life's report unchanged.
 */
const IMPORTANT=['Saturn','Mars','Rahu','Ketu'];
const CONDITIONS={
 1:{ta:{standard:'தலை முதல் தோள் வரை உயர்ந்து நிற்கும் உடல் நிலைப்பாட்டில் உறுதியும், முக அமைப்பில் தெளிவான வெளிப்பாடும் என்ற மரபு வாசிப்பு கிடைக்கிறது.',strain:'தலை–கழுத்துப் பகுதியில் இறுக்கமான உடல் நிலைப்பாடு, நீண்டு மெலிந்த தேகத் தோற்றம் என்ற மரபுச் சித்திரம் மேலோங்குகிறது.',mixed:'தலையின் வெளிப்பாட்டில் உறுதியும் மெலிவும் கலந்த தேக அமைப்பு என்ற மரபு வாசிப்பு கிடைக்கிறது.'},en:{standard:'Traditional symbolism favours a composed posture with a defined head and facial bearing.',strain:'The classic physical analogy is a leaner frame with a more rigid head-and-neck posture.',mixed:'A combination of a defined posture and leaner frame appears in this symbolic reading.'}},
 2:{ta:{standard:'முகத்தின் வட்டம், தாடை மற்றும் புன்னகையின் வெளிப்பாட்டில் மென்மையான சமச்சீர் தோற்றத்தை மரபு குறிப்பிடுகிறது.',strain:'முக எலும்புகள் தெளிவாகத் தெரியும், தாடை–கன்னம் பகுதியில் இறுக்கமான தோற்றம் என்ற சித்திரம் மேலோங்குகிறது.',mixed:'முகத்தில் மென்மையான வெளிப்பாட்டுடன் தாடை–கன்னம் பகுதியில் உறுதியான கோடும் இணையும் மரபு வாசிப்பு கிடைக்கிறது.'},en:{standard:'The face is symbolically read as soft and balanced around the jaw and cheeks.',strain:'Classical appearance symbolism emphasizes a sharper jaw and cheek contour.',mixed:'A softer expression and a more defined jawline are combined in the traditional picture.'}},
 3:{ta:{standard:'தோள் விரிப்பு, கை நீட்டல் மற்றும் விரல்களின் நுண்ணிய அசைவில் சீரான இயக்கத்தை மரபு சித்தரிக்கிறது.',strain:'தோள்–முழங்கை அசைவில் இறுக்கமான பாணியும், சிறு கைவேலையில் அதிக கவனத்துடன் செயல்படும் தோற்றமும் முன்னிலை பெறுகின்றன.',mixed:'கைகளில் சுறுசுறுப்புடன் தோள் இயக்கத்தில் அளவான கட்டுப்பாடு என்ற இரட்டை அமைப்பு காணப்படுகிறது.'},en:{standard:'The shoulder span and fine hand movements are portrayed as smooth and composed.',strain:'Tighter shoulder-and-elbow motion is the traditional analogy.',mixed:'Agile hands with more measured shoulder movement form the mixed physical reading.'}},
 4:{ta:{standard:'மார்பின் வெளிப்புற விரிப்பும் தோள்களின் இயல்பான நிலைப்பாடும் சீரானதாகச் சித்தரிக்கப்படுகின்றன.',strain:'மார்பின் வெளிப்புறத் தோற்றத்தில் குறுகிய, இறுக்கமான நிலைப்பாட்டை மரபு உருவகப்படுத்துகிறது.',mixed:'மார்பில் ஒழுங்கான நிலைப்பாட்டுடன் தோள் சுற்றில் ஓரளவு இறுக்கம் என்ற கலப்பு சித்திரம் கிடைக்கிறது.'},en:{standard:'The outward chest and shoulder carriage are symbolized as open and balanced.',strain:'A narrow or restrained chest posture appears in traditional physical symbolism.',mixed:'The imagery combines an open chest posture with more measured shoulders.'}},
 5:{ta:{standard:'மேல்வயிற்றின் வெளிப்புற வளைவும் முதுகின் மேற்பகுதியும் சமச்சீராக அமையும் உடற்கட்டு மரபு வாசிப்பில் முன்னிலை பெறுகிறது.',strain:'மேல்வயிற்றில் தனித்த சதைப்பற்று அல்லது உடல் நடுப்பகுதியில் மற்ற பகுதிகளைவிட வேறுபட்ட அளவு என்ற மரபு உருவகம் காணப்படுகிறது.',mixed:'தோள் பகுதியோடு ஒப்பிடும்போது மேல்வயிற்றின் அளவில் மிதமான வேறுபாடு வெளிப்படும் மரபுச் சித்திரம் கிடைக்கிறது.'},en:{standard:'The upper-abdomen and upper-back proportions are described as balanced.',strain:'Classical symbolism contrasts upper-abdominal fullness against the rest of the frame.',mixed:'A moderate contrast between the midsection and shoulder proportions is suggested.'}},
 6:{ta:{standard:'வயிற்றின் கீழ்நடு பகுதி மற்றும் இடை வளைவில் மென்மையான, சீரான வெளிப்புற அமைப்பை மரபு சுட்டுகிறது.',strain:'கீழ்வயிற்றுப் பகுதியில் இறுக்கமான இடைவளைவு அல்லது மாறுபட்ட சதைப் பரவல் என்ற மரபுக் குறிப்பே முன்னிலை பெறுகிறது.',mixed:'கீழ்வயிறு மென்மையாகவும் இடை வளைவு கட்டுப்பட்டதாகவும் இருக்கும் கலப்பு வெளிப்புறத் தோற்றம் சித்தரிக்கப்படுகிறது.'},en:{standard:'The lower abdominal outline is traditionally pictured as even and soft.',strain:'A tighter waistline or contrasting lower-abdominal proportions appear in the symbolism.',mixed:'A softer lower abdomen and a more restrained waistline are combined.'}},
 7:{ta:{standard:'இடுப்பின் அகலமும் இடுப்பு–முதுகு இணையும் வெளிப்புற அமைப்பும் சமநிலையாகக் குறிப்பிடப்படுகின்றன.',strain:'இடுப்பு வளைவில் இறுக்கமான தோற்றமும் உடல் எடையை மாற்றும் நிலைப்பாட்டில் அளவான அசைவும் மரபுக் குறிப்பாக வருகிறது.',mixed:'இடுப்பு அகலத்திலும் வளைவிலும் மென்மையும் கட்டுப்பாடும் கலந்த தோற்றம் மரபு வாசிப்பில் இடம்பெறுகிறது.'},en:{standard:'The hip-to-waist outline is symbolically balanced.',strain:'A restrained waist contour and measured weight-shifting posture are emphasized.',mixed:'Both softness and a defined waist contour appear in the traditional analogy.'}},
 8:{ta:{standard:'கீழ்வயிற்றுக்கும் இடுப்புக்கும் இடையிலான வெளிப்புறத் தேக அமைப்பு சீரானதாக மரபு குறிப்பிடுகிறது.',strain:'கீழ்வயிற்றின் வடிவமும் இடுப்பு வளைவும் மற்ற உடற்பகுதிகளிலிருந்து மாறுபடுகின்றன என்ற மரபுக் குறிப்பு கிடைக்கிறது.',mixed:'கீழ்வயிற்றின் மென்மையும் இடுப்பு வளையின் உறுதியும் ஒருங்கிணைந்த தோற்றமாக வாசிக்கப்படுகின்றன.'},en:{standard:'Traditional symbolism describes balanced lower-torso contours.',strain:'Different proportions around the lower torso are emphasized symbolically.',mixed:'The lower-torso imagery combines softness and a firm waist contour.'}},
 9:{ta:{standard:'தொடையின் வெளிப்புறத் தசைவிரிப்பும் நடை வேகத்தில் சீரான அழுத்தமும் மரபுச் சித்திரத்தில் இடம்பெறுகின்றன.',strain:'தொடை எலும்பின் கோடு தெளிவாகத் தெரியும் மெலிந்த தோற்றமும் நீளமான நடை பாணியும் சுட்டப்படுகின்றன.',mixed:'தொடையின் மென்மையான தசை அமைப்போடு உறுதியான நடை பாணியும் கலந்த தோற்றம் குறிப்பிடப்படுகிறது.'},en:{standard:'Thigh contours and gait are pictured with even movement.',strain:'A lean thigh outline and long, measured stride are traditional associations.',mixed:'A softer thigh contour with a firmer walking rhythm forms the mixed description.'}},
 10:{ta:{standard:'முழங்காலின் வெளிப்புற வடிவம் மற்றும் காலின் மடக்குமிடத்து நிலைப்பாட்டில் சீரான தோற்றம் மரபுக் குறிப்பாக உள்ளது.',strain:'முழங்கால் எலும்புக் கோடு தெளிவாகக் காட்டும் ஒல்லியான தோற்றம் என்ற மரபுச் சின்னம் மேலோங்குகிறது.',mixed:'முழங்காலின் உறுதியான வெளிப்புற வடிவத்துடன் மிதமான மெலிவு சேரும் பாரம்பரிய சித்திரம் கிடைக்கிறது.'},en:{standard:'An even outward knee contour is the symbolic description.',strain:'A defined, lean knee outline is the classical association.',mixed:'A firm knee contour with moderate leanness forms the mixed picture.'}},
 11:{ta:{standard:'கெண்டைக்காலின் சதைப்பற்றும் கணுக்கால் வரையிலான வெளிப்புற விகிதமும் சீராக இருப்பதாக மரபு சித்தரிக்கிறது.',strain:'கெண்டைக்கால் ஒல்லியாகவும் கணுக்காலின் எலும்புக் கோடு தெளிவாகவும் தோன்றும் சித்திரம் கிடைக்கிறது.',mixed:'கெண்டைக்கால் விகிதத்தில் மென்மையும் கணுக்கால் பகுதியில் கூர்மையான வெளிப்புற வடிவமும் இணைகின்றன.'},en:{standard:'Lower-leg and ankle proportions are pictured as balanced.',strain:'A thinner calf and defined ankle outline are traditional analogies.',mixed:'Softer calves with more defined ankles are combined symbolically.'}},
 12:{ta:{standard:'பாதத்தின் வெளிப்புற வடிவம், குதிகால் மற்றும் விரல்களின் நிலைப்பாடு ஒழுங்கானதாக மரபு சித்தரிக்கிறது.',strain:'குதிகால்–பாத விரிப்பு மெலிந்ததாகவும் விரல்களின் நிலைப்பாடு இறுக்கமானதாகவும் சித்தரிக்கப்படுகிறது.',mixed:'பாத விரிப்பில் மென்மையும் குதிகால் சுற்றில் உறுதியான வடிவமும் சேர்ந்த மரபு உருவகம் கிடைக்கிறது.'},en:{standard:'Feet, heels and toe posture are symbolized as even and composed.',strain:'Narrow feet and restrained toe posture are classical appearance analogies.',mixed:'Softer foot contours and a defined heel shape are combined symbolically.'}}
};
const PLANET_BODY={
 Saturn:{ta:'சனி தொடர்பு எலும்புக் கோடுகள் தெளிவாகத் தெரியும் மெலிவு அல்லது கட்டுப்பட்ட நிலைப்பாட்டை மரபில் குறிப்பதாகும்.',en:'Saturn traditionally contributes a leaner outline and more defined bone structure.'},
 Jupiter:{ta:'குரு தொடர்பு சதைப்பற்றும் வட்டமான உடல்விகிதமும் சேரும் வெளிப்புறத் தோற்றத்தை மரபில் குறிக்கிறது.',en:'Jupiter contributes fuller contours and rounded bodily proportions in the traditional picture.'},
 Mars:{ta:'செவ்வாய் தொடர்பு உறுதியான தசை வெளிப்பாட்டையும் சுறுசுறுப்பான உடல் நிலைப்பாட்டையும் சித்தரிக்கிறது.',en:'Mars symbolically adds firmer muscle definition and energetic posture.'},
 Venus:{ta:'சுக்கிரன் தொடர்பு மென்மையான தோல் வெளிப்பாட்டையும் வளைவுகளின் சமச்சீரையும் சித்தரிக்கிறது.',en:'Venus is associated with softer outward contours and symmetry.'},
 Moon:{ta:'சந்திரன் தொடர்பு மென்மையான தோற்றமும் வட்டமான தேக வெளிப்பாடும் தரும் மரபுச் சின்னமாக உள்ளது.',en:'The Moon gives the traditional imagery of softness and rounded contours.'},
 Mercury:{ta:'புதன் தொடர்பு மெலிந்த, நுட்பமான உடலமைப்பையும் கைவிரல் இயக்கத்தின் துல்லியத்தையும் குறிக்கும் உருவகம்.',en:'Mercury is traditionally linked with finer proportions and nimble gestures.'},
 Sun:{ta:'சூரியன் தொடர்பு தலை நிமிர்ந்த உறுதியான வெளிப்பாட்டை உருவகப்படுத்துகிறது.',en:'The Sun symbolizes an upright, firm bearing.'},
 Rahu:{ta:'ராகு தொடர்பு வழக்கமான உடல்விகிதத்திலிருந்து வேறுபட்ட வெளிப்புற அமைப்பை மரபில் சுட்டுகிறது.',en:'Rahu symbolizes a more unusual contrast in outward proportions.'},
 Ketu:{ta:'கேது தொடர்பு அடக்கமான, வெளிப்புற அசைவுகள் குறைவான உடல் நிலைப்பாட்டை உருவகப்படுத்துகிறது.',en:'Ketu is symbolically linked with a reserved and quiet posture.'}
};
const EXAMPLES={
 vision:{ta:'கண் சோர்வு, ஒளியில் அசௌகரியம், பார்வைத் தெளிவு குறைவது போன்ற கண் தொடர்பான மரபுச் சுட்டீடுகள்',en:'eye fatigue, light discomfort and uncertain clarity of vision'},
 digestion:{ta:'அஜீரணம், வயிற்று எரிச்சல், வயிற்றுப் பூரிப்பு போன்ற செரிமானத் தொந்தரவு வகைகள்',en:'indigestion, abdominal discomfort and bloating'},
 metabolism:{ta:'பசி ஒழுங்கு மாறுதல், சதைப்பற்று மற்றும் உணவின் உடல் எதிர்வினை பற்றிய மரபுச் சுட்டீடுகள்',en:'appetite patterns, body fullness and traditional food-response symbolism'},
 bones:{ta:'மூட்டு இறுக்கம், எலும்பு–தசைப் பகுதியில் அசௌகரியம், இயக்கத்தில் வரம்பு போன்ற மரபுச் சுட்டீடுகள்',en:'stiff joints, musculoskeletal discomfort and restrained movement'},
 breath:{ta:'சளி சார்ந்த மார்பு அசௌகரியம், மூச்சுச் சீரின்மை என்று பழைய நூல்களில் இணைக்கப்படும் வகைகள்',en:'chest congestion and irregular breathing comfort in older texts'},
 skin:{ta:'தோல் உலர்வு, எரிச்சல், நிறம்/வெளித்தோற்ற மாறுபாடு போன்ற மரபுச் சுட்டீடுகள்',en:'dryness, irritation and changes in outward skin appearance'},
 reproductive:{ta:'கீழ்வயிறு மற்றும் இடுப்புப் பகுதியின் சுகம் தொடர்பான மரபுச் சுட்டீடுகள்',en:'traditional pelvic-comfort symbolism'},
 sleep:{ta:'ஓய்வின் ஒழுங்கு மாறுதல், தூங்குவதில் சிரமம், இரவில் இடையிடையே விழித்தல் போன்றவை',en:'irregular rest, difficulty settling to sleep and interrupted sleep'}
};
const MEDICAL_OUTCOME_TA={
 vision:{
  'traditional-concern':'கண் பார்வை தொடர்பான பாரம்பரிய விதிகளில் ஒளிச்சகிப்பு குறைவு, கண் சோர்வு, பார்வைத் தெளிவு தொடர்பான சிரமம் என்ற வகைச் சுட்டீடுகள் முன்னிலை பெறுகின்றன. இது கண் நோய் அல்லது கண்ணாடி தேவைப்படும் என்ற உறுதியான கணிப்பு அல்ல.',
  mixed:'கண்களின் ஒளிச்சகிப்பு, கண் சோர்வு போன்ற மரபுக் குறிப்புகளுக்கு எதிராகத் தணிக்கும் கிரக ஆதாரங்களும் உள்ளன. எனவே ஒரே வகைப் பார்வைக் குறைபாட்டை இந்தக் கட்டமைப்பில் முடிவுசெய்ய முடியாது.',
  'traditional-support':'கண் காரகத்துவத்தில் குறுக்கிடும் கிரகத் தொடர்பு தனியாக மேலோங்கவில்லை. பாரம்பரியத்தில் முகம் மற்றும் கண்களின் வெளிப்புற அமைப்பிற்குச் சாதகமான குறிப்பு முன்னிலை பெறுகிறது; கண் நோய் இல்லை என்பதற்கான பரிசோதனை இது அல்ல.'},
 digestion:{
  'traditional-concern':'உணவுக்குப் பிறகு வயிற்று எரிச்சல், அஜீரணம், வயிற்றுப் பூரிப்பு போன்ற செரிமான அசௌகரிய வகைகளை மரபுவழி விதிகள் இங்கு சுட்டுகின்றன. அவை இந்த ஜாதகருக்கு உண்மையில் இருப்பதாக உறுதிப்படுத்தப்படவில்லை.',
  mixed:'வயிற்று எரிச்சல், அஜீரணம் போன்ற பழைய நூல்களின் செரிமான ஒப்புமைகளும் அதைத் தணிக்கும் கிரகத் தொடர்பும் ஒரே நேரத்தில் காணப்படுகின்றன. தனித்த வயிற்று நோய் வரப்போகிறது என்று இதிலிருந்து முடிவுசெய்ய முடியாது.',
  'traditional-support':'வயிற்றுச் சுகக் காரகத்துவத்தில் பலமான பாதகச் சேர்க்கை முன்னிலை பெறாததால் மரபு வாசிப்பில் நடுப்பகுதியின் சீரான உடல்விகிதம் மற்றும் உணவு சார்ந்த சுகக் குறிப்பு வலுப்பெறுகிறது; மருத்துவ ரீதியான செரிமானச் சான்று அல்ல.'},
 metabolism:{
  'traditional-concern':'உடல் நடுப்பகுதியின் சதைப்பற்று, பசியின் நேர ஒழுங்கு, உணவுக்குப் பிறகான உடல் உணர்வு போன்ற வளர்சிதை மாற்றச் சின்னங்களை மரபு இங்கு முதன்மைப்படுத்துகிறது. சர்க்கரை நோய் ஏற்படும் என்பதற்கான நம்பகமான சுட்டீடாக இதைக் கொள்ள முடியாது.',
  mixed:'சதைப்பற்று மற்றும் உணவு ஒழுங்கு பற்றிய மரபுக் குறிப்புகள் இருக்கின்றன; அவற்றைக் கட்டுப்படுத்தும் சுபக் கிரக நிலைகளும் இருக்கின்றன. இதன் அடிப்படையில் நீரிழிவு அல்லது வேறு வளர்சிதை மாற்ற நோயை முன்னறிவிக்க முடியாது.',
  'traditional-support':'உணவு–உடல்விகிதக் காரகத்துவத்தில் கடினமான கலப்பு முன்னிலை பெறவில்லை. இந்தப் பகுதியின் மரபு வாசிப்பு சீரான தேக விகிதத்தை மட்டுமே விவரிக்கிறது; ரத்தச் சர்க்கரை இயல்பானதென்ற தகவல் இதில் இல்லை.'},
 bones:{
  'traditional-concern':'எலும்பு மற்றும் மூட்டு காரகத்துவங்களில் சனியுடன் தொடர்புடைய மூட்டு இறுக்கம், நீண்ட உழைப்புக்குப் பிறகான உடல் அசௌகரியம் ஆகிய வரலாற்றுச் சின்னங்கள் வலியுறுகின்றன. நடை மாற்றுத்திறன் அல்லது மூட்டு நோய் உறுதியாக வரும் என்பதல்ல.',
  mixed:'சனியின் இறுக்கச் சின்னமும் செவ்வாயின் உடல் இயக்கச் சின்னமும் எதிரெதிர் தொடர்புகளைப் பெறுகின்றன. முழங்கால், மூட்டு இயக்கம் போன்றவற்றின் மரபு வாசிப்பில் முரண்பட்ட குறிப்புகள் இருப்பதால் உடல் குறைபாட்டைத் தீர்மானிக்க முடியாது.',
  'traditional-support':'எலும்பு, கால் இயக்கச் சின்னங்களில் பாதகத் தொடர்பு மேலாதிக்கம் பெறவில்லை. சீரான உடல் நிலைப்பாடு மற்றும் மூட்டின் வெளிப்புறக் கட்டமைப்பு என்ற பாரம்பரிய விளக்கமே முன்னிலை பெறுகிறது.'},
 breath:{
  'traditional-concern':'மார்பு–சுவாசக் காரகத்துவங்களில் சளி தேக்கம், குளிர்ச்சியின்போது மார்பு அசௌகரியம் போன்ற வரலாற்று விளக்கங்கள் குறிப்பிடப்படுகின்றன. ஆஸ்துமா அல்லது நுரையீரல் நோய் உறுதியானது எனப் பொருள் கொள்ளக் கூடாது.',
  mixed:'மார்புச் சின்னத்தை கடினமாக்கும் கிரகங்களுடன் அதைத் தணிக்கும் தொடர்புகளும் உள்ளன. அதனால் சளி, மூச்சில் அசௌகரியம் என்ற மரபுக் குறிப்புகளைத் தனிப்பட்ட சுவாச நோயாக மாற்றிக் கூற முடியாது.',
  'traditional-support':'மார்புப் பகுதியின் வெளிப்புற அமைப்பில் சீரான விரிப்பு என்ற மரபு வாசிப்பே முன்னிலை பெறுகிறது. நுரையீரல் செயல்பாடு இயல்பாக இருக்கிறது என்பதைக் கணிக்க முடியாது.'},
 skin:{
  'traditional-concern':'தோல் உலர்வு, அரிப்பு, வெளித்தோற்றத்தில் நிறமாற்றம் ஆகியவற்றை இணைத்துக் கூறும் மரபுவழி காரகத்துவம் செயல்படுகிறது. தோல் நோய் கண்டறிதலாக இதைக் கூற இயலாது.',
  mixed:'சனியின் உலர்வு சார்ந்த சின்னத்திற்கு எதிராக சுக்கிரனின் மென்மை சார்ந்த தொடர்பும் இருப்பதால் தோலின் வெளிப்புறக் காரகத்துவம் கலப்பாக உள்ளது. எந்தத் தோல் நோயும் இங்கு உறுதியாகத் தீர்மானிக்கப்படவில்லை.',
  'traditional-support':'தோலின் வெளிப்புற அமைப்பில் மென்மையும் சீரான தோற்றமும் என்ற பாரம்பரிய ஒப்புமை மேலோங்குகிறது. தோல் பரிசோதனை செய்யாமல் மருத்துவ முடிவு சொல்ல இயலாது.'},
 reproductive:{
  'traditional-concern':'கீழ்வயிறு–இடுப்பு பகுதி சுகத்தைச் சுற்றிய மரபுக் காரகத்துவங்கள் கடினமான தொடர்பைப் பெறுகின்றன. குறிப்பிட்ட இனப்பெருக்க நோய், மலட்டுத்தன்மை அல்லது எதிர்காலக் குழந்தைப்பேறு குறித்து இதிலிருந்து தீர்மானிக்க முடியாது.',
  mixed:'கீழ்வயிறு மற்றும் இடுப்பு சார்ந்த சுகக் காரகத்துவத்தில் சுப–பாபத் தொடர்புகள் ஒன்றோடொன்று கலக்கின்றன. இதற்கு தனித்த மருத்துவ நோய் பெயர் வழங்குவதற்கான ஆதாரம் ஜாதகத்தில் இல்லை.',
  'traditional-support':'கீழ்வயிற்றின் வெளிப்புறச் சமநிலை மற்றும் இடுப்பு சார்ந்த பாரம்பரியச் சுகக் காரகத்துவம் முன்னிலை பெறுகிறது. இனப்பெருக்க உறுப்பின் செயல்பாடு குறித்த மருத்துவ மதிப்பீடு இதல்ல.'},
 sleep:{
  'traditional-concern':'ஓய்வைப் பின்னுக்கு தள்ளுவது, இரவில் இடையிடையே விழிப்பு, தூக்கம் தொடங்கத் தாமதம் ஆகியவற்றை பழைய நூல்களின் சந்திர–சனி சின்னங்கள் இணைக்கின்றன. இது உறக்கக் கோளாறு கண்டறியும் கணிப்பு அல்ல.',
  mixed:'தூக்க நேரம் மாறுதல் மற்றும் ஓய்வின் தொடர்ச்சி பற்றிய மரபுச் சின்னங்கள் இருவிதமாக உள்ளன. மனநோய் அல்லது உறக்கக் கோளாறு உள்ளது என்று இந்தக் கிரகக் கலப்பால் தீர்மானிக்க முடியாது.',
  'traditional-support':'ஓய்வு, தனிநேரம் சார்ந்த சின்னங்களில் சீரான ஒழுங்கு என்ற பாரம்பரியக் குறிப்பு மேலோங்குகிறது. ஒருவரின் உண்மையான உறக்கத் தரத்தை இது அளவிடவில்லை.'}
};
const MEDICAL_OUTCOME_EN={
 vision:{'traditional-concern':'The classical association concerns eye fatigue, discomfort in bright light, and blurred clarity; it cannot predict eye disease or a need for glasses.',mixed:'Traditional eye-fatigue and light-sensitivity symbolism is counterbalanced by mitigating contacts; no specific eye condition follows.', 'traditional-support':'Traditional associations favour a regular facial and visual bearing. This cannot establish normal eyesight.'},
 digestion:{'traditional-concern':'Classical analogies mention indigestion, abdominal burning and bloating, not an established diagnosis for this person.',mixed:'Digestive-discomfort symbolism is accompanied by mitigating factors and cannot identify a personal stomach disease.', 'traditional-support':'The reading depicts balanced abdominal contours and ordinary dietary symbolism, not proven digestive health.'},
 metabolism:{'traditional-concern':'Traditional symbolism concerns midsection proportions, appetite timing and dietary responses. It cannot predict diabetes or metabolic disease.',mixed:'Mixed symbolic influences concern appetite and fullness, not a valid prediction of diabetes.', 'traditional-support':'Balanced body-proportion symbolism predominates; it does not imply measured normal blood glucose.'},
 bones:{'traditional-concern':'Traditional texts connect Saturn with stiffness and skeletal concerns, but this does not identify disability or disease.',mixed:'The mixed reading contrasts Saturn-like stiffness with other movement symbolism and cannot identify a joint disease.', 'traditional-support':'Traditional interpretation favours an even skeletal bearing, not certified joint health.'},
 breath:{'traditional-concern':'Older interpretations mention congestion and chest discomfort; they cannot predict asthma or lung disease.',mixed:'Chest-congestion symbolism is tempered by other planetary influences; it is not a lung diagnosis.', 'traditional-support':'Open outward chest posture is the classical analogy, not an assessment of breathing function.'},
 skin:{'traditional-concern':'The traditional imagery mentions dry skin, irritation and outward changes without identifying a skin disease.',mixed:'Dryness symbolism is balanced by softer Venus-associated imagery; no specific skin disease is indicated clinically.', 'traditional-support':'Softer outward skin contours predominate as symbolic imagery, not as a medical skin finding.'},
 reproductive:{'traditional-concern':'Traditional pelvic associations cannot predict reproductive disease, infertility or future childbearing.',mixed:'Pelvic-comfort symbolism is mixed and supplies no clinical reproductive diagnosis.', 'traditional-support':'Balanced pelvic structure is a traditional external analogy, not a measure of reproductive function.'},
 sleep:{'traditional-concern':'Moon–Saturn imagery may mention delayed or interrupted rest, not a diagnosed sleep disorder.',mixed:'Mixed symbolism about sleep timing cannot establish a sleep or mental-health condition.', 'traditional-support':'Even rest routines appear in the traditional interpretation, not a measured sleep outcome.'}
};

const STRONG=new Set(['own','exalted','moolatrikona']);
function countDirect(d,houses,keys){
 const matches=[];
 for(const n of houses){const h=d.houses[n-1];for(const k of keys){if(h.occupants.includes(k))matches.push({house:n,key:k,mode:'occupant'});else if(h.aspects.includes(k))matches.push({house:n,key:k,mode:'aspect'});}}
 return matches;
}
function beneficContact(d,k,moon){
 if(k==='Mercury'){const h=d.houses[d.planets.Mercury.house-1];return ![...h.occupants,...h.aspects].some(p=>p!=='Mercury'&&IMPORTANT.includes(p));}
 if(k==='Moon')return !!moon?.known&&moon.nature==='benefic';
 return k==='Jupiter'||k==='Venus';
}
function protect(d,houses){return houses.some(n=>{const p=d.planets[d.houses[n-1].lord];return p&&STRONG.has(p.dignity)})||countDirect(d,houses,['Jupiter','Venus']).length>0;}
function asName(k,ta){return ta?(PN[k]||k):k;}
function gram(h,ta){const sign=Number.isInteger(h.sign)?h.sign:-1;return sign>=0?(ta?SIGN_BODY_TA[sign]:SIGN_BODY_EN[sign]):(ta?'அந்தப் பகுதி':'that body region');}
function contactText(contact,ta){if(!contact)return '';return ta?`${asName(contact.key,true)} ${contact.house}-ஆம் பாவத்தில் ${contact.mode==='occupant'?'இருப்பதால்':'பார்வை செலுத்துவதால்'}`:`${contact.key} ${contact.mode==='occupant'?'occupies':'aspects'} house ${contact.house}`;}
function makePhysical(d,n,lang,core,opts={}){
 const ta=lang!=='en',h=d.houses[n-1],ruler=d.planets[h.lord],evaluation=core.influence(d,n,opts);
 const adverse=countDirect(d,[n],IMPORTANT),help=countDirect(d,[n],['Jupiter','Venus','Mercury','Moon']).filter(x=>beneficContact(d,x.key,evaluation.moon));
 const favorable=protect(d,[n])||evaluation.dominantSide==='support';
 const mix=adverse.length&&favorable,category=adverse.length&&!favorable?'strain':mix?'mixed':'standard';
 const text=CONDITIONS[n][ta?'ta':'en'][category];
 // Lagna-specific frame reading is intentionally confined to body section 1.
 const extras=[];
 if(n===1){const ss=countDirect(d,[1],['Saturn']).length,js=countDirect(d,[1],['Jupiter']).length;const lord=d.planets[h.lord];
  if(ss&&js)extras.push(ta?'லக்னத்தில் சனி–குரு இருவரின் நேரடித் தொடர்பும் இருப்பதால் மெலிவுக்கும் சதைப்பற்றுக்கும் இடையே கலந்த உடற்கட்டு என்ற பாரம்பரிய வாசிப்பு முன்னிலை பெறுகிறது.':'Both Saturn and Jupiter contact the ascendant, creating a mixed lean/full-body analogy.');
  else if(ss)extras.push(ta?'லக்னத்துடனான சனியின் நேரடித் தொடர்பு மெலிவையும் எலும்புக் கோடு வெளிப்பாட்டையும் வலுப்படுத்தும் மரபுக் குறியாக உள்ளது.':'Saturn directly contacting the ascendant is traditionally read as a leaner frame.');
  else if(js)extras.push(ta?'லக்னத்துடனான குருவின் நேரடித் தொடர்பு நிரம்பிய உடல்விகிதத்தையும் மிதமான சதைப்பற்றையும் சித்தரிக்கிறது.':'Jupiter directly contacting the ascendant points to fuller body proportions symbolically.');
  if(lord&&lord.house!==1)extras.push(ta?`லக்னாதிபதி ${PN[h.lord]} ${lord.house}-ஆம் பாவத்தில் இருப்பதால் மொத்த தேக அமைப்பை லக்னத்தில் உள்ள கிரகங்களை மட்டும் வைத்து முடிவுசெய்யாமல் இந்தக் கலப்பையும் சேர்த்து வாசிக்கிறது.`:`The ascendant ruler ${h.lord} in house ${lord.house} modifies this whole-body analogy.`);
 }
 const contacts=countDirect(d,[n],['Saturn','Jupiter','Mars','Venus','Moon','Mercury','Sun','Rahu','Ketu']);
 const featured=contacts.find(x=>x.mode==='occupant')||contacts.find(x=>x.mode==='aspect'&&[3,4,10,11,12].includes(n));
 if(featured&&n!==1) extras.push(ta?`${contactText(featured,true)}, ${BODIES[n-1].ta} சார்ந்த வெளிப்புற அமைப்பில் ${PLANET_BODY[featured.key].ta}`:`${contactText(featured,false)}; ${BODIES[n-1].en} symbolism is modified: ${PLANET_BODY[featured.key].en}`);
 const v301=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)||null;
 const supplement=v301?.enhancePhysical?.(d,n,lang)||null;
 const lines=[text,...extras,...(supplement?[supplement.text]:[])];
 return {number:n,title:ta?`${n}-ஆம் பாவம் — ${BODIES[n-1].ta}`:`House ${n} — ${BODIES[n-1].en}`,
  paragraphs:lines.map((t,i)=>({house:n,text:t,evidence:{source:'v300-classical-constitution',house:n,sign:h.sign,lord:h.lord,rulerHouse:ruler?.house,category,directAdverse:adverse,directSupport:help,featured:featured||null,paragraph:i}})),
  evidence:{house:n,sign:h.sign,signBodySymbolism:gram(h,ta),lord:h.lord,category,adverse,help,houseInfluence:evaluation.dominantSide,notMedicalDiagnosis:true}};
}
function makeMedical(d,lang,core,opts={}){
 const ta=lang!=='en';return ROOTS.map((spec,i)=>{
  const adverse=countDirect(d,spec.houses,IMPORTANT);
  const moon=core.influence(d,spec.houses[0],opts).moon;
  const supports=countDirect(d,spec.houses,['Jupiter','Venus','Mercury','Moon']).filter(x=>beneficContact(d,x.key,moon));
  const distressedActors=spec.actors.filter(k=>{const p=d.planets[k];return p&&((p.combust&&k!=='Sun')||p.dignity==='debilitated'||countDirect(d,[p.house],IMPORTANT.filter(z=>z!==k)).length>0);});
  const strengthenedActors=spec.actors.filter(k=>STRONG.has(d.planets[k]?.dignity));
  const protector=protect(d,spec.houses);
  // Do not assign clinical risk, probability, certainty, diagnosis, or disease status.
  // A concern is only a named historical correspondence, gated by more than one
  // *independent* feature: house adversity plus an afflicted karaka.
  const distinctAdverse=new Set(adverse.map(x=>x.key)).size;
  const side=(distinctAdverse>=2&&distressedActors.length>=1&&!protector)?'traditional-concern':
    (!adverse.length&& (supports.length||strengthenedActors.length))?'traditional-support':'mixed';
  const top=adverse[0]||supports[0]||null;
  const example=EXAMPLES[spec.id][ta?'ta':'en'];
  const title=ta?spec.ta:spec.en;
  const signPart=ta?spec.ta:spec.en;
  const conclusion=(ta?MEDICAL_OUTCOME_TA:MEDICAL_OUTCOME_EN)[spec.id][side];
  const evidencePieces=[];
  if(top)evidencePieces.push(ta?`${contactText(top,true)} ${title} தொடர்புடைய மரபுப் பாவக் குறி செயல்படுகிறது.`:`${contactText(top,false)} in the traditional domain of ${title}.`);
  if(distressedActors.length)evidencePieces.push(ta?`${distressedActors.slice(0,2).map(x=>PN[x]).join(' மற்றும் ')} ஆகிய காரகக் கிரகங்களில் பாபத் தொடர்பு அல்லது பலக்குறைவு இருப்பதால் எதிர்மறை மரபுக் குறிப்பையும் கணக்கில் எடுக்கிறது.`:`${distressedActors.slice(0,2).join(' and ')} show historically challenging karaka contacts.`);
  if(supports.length||strengthenedActors.length)evidencePieces.push(ta?`${(supports[0]?.key&&PN[supports[0].key])||(strengthenedActors[0]&&PN[strengthenedActors[0]])} தரும் சுப/ஆட்சி தொடர்பும் இருப்பதால் அதைத் தவிர்த்து ஒருதலைப்பட்சமாக நோய் முடிவைச் சொல்லக்கூடாது.`:`A supportive or dignified planet counterbalances the adverse symbolism.`);
  if(!evidencePieces.length)evidencePieces.push(ta?`${spec.houses.join(', ')}-ஆம் பாவங்களும் ${spec.actors.map(x=>PN[x]).join(', ')} கிரகக் காரகத்துவங்களும் ஆராயப்பட்டன; குறிப்பிட்ட பாதக கூட்டமைப்பு காணப்படவில்லை.`:`Houses ${spec.houses.join(', ')} and related karakas were reviewed without an active adverse combination.`);
  const v301=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)||null;
  const supplement=v301?.enhanceMedical?.(d,spec,side,adverse,supports,lang)||null;
  const paragraphs=[...evidencePieces.slice(0,2),supplement?.text||conclusion].map((text,j)=>({text,evidence:{source:j===2&&supplement?'v301-body-period-distinction':'classical-medical-symbolism-only',houses:spec.houses,actors:spec.actors,adverse,protective:supports,distressedActors,category:side,paragraph:j}}));
  return {number:i+1,id:spec.id,title,paragraphs,
   evidence:{classification:side,houseSet:spec.houses,planetKeys:spec.actors,directAdverse:adverse,directSupport:supports,distressedActors,strengthenedActors,sourceTexts:['BPHS 3,12,17','Brihat Jataka 1,20'],traditionalCorrespondence:example},notMedicalRisk:true};
 });
}
return Object.freeze({physical:makePhysical,medical:makeMedical,version:'300-classical-physical-and-nondiagnostic-medical'});
});

;

/* ---- d1-life-reading.js (preserves original execution order) ---- */
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
  return `<section class="smv-d1-life-reading" data-smv-d1-life="1" lang="${rep.lang}"><h2>${ta?'I. ஜாதகரின் முழு வாழ்க்கை பலன்கள்':'I. Complete Life Predictions'}</h2>${content}<section class="smv-d1-body-reading"><h2>${ta?'உடல் காரகத்துவ அமைப்பின் பாரம்பரியப் பலன்கள்':'Traditional Physical Significations'}</h2>${body}</section><section class="smv-d1-medical-reading"><h2>${ta?'பாரம்பரிய மருத்துவ ஜோதிடக் காரகத்துவங்கள்':'Traditional Medical Astrology Associations'}</h2><p class="smv-d1-life-paragraph">${ta?'இங்கே கூறப்படும் உறுப்புகள் மற்றும் உபாதை வகைகள் பிறப்பு ஜாதகத்தின் பாரம்பரியக் காரகத்துவங்கள். பிறவிக் குறைபாடு இருக்கிறது என்றோ, குறிப்பிட்ட நோய் உறுதியாக வரும் என்றோ இவற்றிலிருந்து முடிவெடுக்கவில்லை. எந்தக் காலத்தில் அந்தக் காரகத்துவம் அதிகம் செயல்படும் என்பதை தசை–புக்தி, நட்சத்திர அதிபதி மற்றும் கணிக்கப்பட்ட கோச்சாரத்துடன் தனியாக இணைத்து வாசிக்க வேண்டும். உண்மையான அறிகுறிகள் இருந்தால் மருத்துவரின் மதிப்பீடே உரியது.':'These are symbolic traditional associations, not clinical findings, predictions of illness, or an assessment of organ function.'}</p>${medical}</section></section>`;
 }
 return Object.freeze({render,html,toD1,houseScore,scorePlanet,links,lens,sanitizeContext,THEMES,DRISHTI,version:'293-lived-results-reader'});
});

;

/* ---- d1-integrated-foundation.js (preserves original execution order) ---- */
/* SMV ASTRO V302 — ONE full-life reading in TWELVE house headings, not three competing reports.
 * Native D1 facts + physical associations + 15-y actual computed Dasha/Bhukti
 * + actual slow-planet Swiss snapshots. Never forecasts a clinical diagnosis.
 * All output built from already-loaded/derived reports; no independent API call.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1IntegratedV302=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const TA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const EN=Object.fromEntries(Object.entries(TA).map(([a,b])=>[b,a]));
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const planet=(name,ta)=>ta?(TA[name]||name):(EN[name]||name);
const validISO=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''));
const SIGN_TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const SIGN_EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
// Each paragraph tells an actual house-specific outcome, not an interchangeable house definition.
const LIFE_TA=[
 ['நீங்கள் ஒரு முடிவை எடுப்பதற்கு முன் அதன் நடைமுறை விளைவுகளை அறிய முயல்வீர்கள். ஒருமுறை பொறுப்பை ஏற்றுக்கொண்டால் முழுமையாகச் செய்ய வேண்டும் என்ற எண்ணம் மேலோங்கும். ஆனால் பிறருக்காக எல்லாவற்றையும் தானே செய்து முடிக்க முயல்வது உங்கள் நேரத்தையும் ஓய்வையும் குறைக்கலாம்.', 'உங்கள் முன்னேற்றத்தின் அளவு வேகம் மட்டுமல்ல; நீண்ட நாள் ஒரே முறையைப் பின்பற்றும் ஒழுங்கும் ஆகும். தனிப்பட்ட பழக்கங்களில் சிறிய மாற்றங்கள் ஏற்பட்டாலே பணியிலும் உறவுகளிலும் அதன் பயன் உணரப்படும்.'],
 ['பொருளாதாரத்தில் ஒரு தொகையைச் சம்பாதிப்பதைவிட அது எதற்குச் செலவாகிறது என்பதை அறிந்திருப்பது முக்கியமாக அமையும். குடும்பத்தாருக்காக செலவு செய்வதிலும் எதிர்காலச் சேமிப்பிற்காக வைத்திருப்பதிலும் அவ்வப்போது கருத்து வேறுபாடு வரலாம்.', 'பேச்சில் நேர்மையை விரும்பினாலும், எதிரிலிருப்பவரின் மனநிலையை அறியாமல் உடனடியாகப் பதில் கூறுவது சிறிய குடும்பப் பிரச்சினையைப் பெரிதாக்கலாம். உறவுகளிடம் பணம் மற்றும் பொறுப்பு பற்றிய எதிர்பார்ப்பை முன்கூட்டியே தெளிவுபடுத்துவது பயனளிக்கும்.'],
 ['ஒரே முயற்சியில் முடிவு வரவில்லை என்பதற்காக அதை விட்டுவிடாமல் வேறொரு வழியைத் தேடும் குணம் உண்டு. எழுத்து, தொழில்நுட்பம், கற்றல், தகவல் பரிமாற்றம் அல்லது சிறு பயணங்களின் மூலம் புதிய வாய்ப்புகள் உருவாகலாம்.', 'உடன்பிறந்தவர்கள் அல்லது நெருங்கியவர்களுடன் ஒத்துழைக்கும்போது யார் எந்தப் பொறுப்பை ஏற்கிறார் என்பதைத் தெளிவாக வைத்தால் தேவையற்ற மனக்கசப்பைத் தவிர்க்கலாம். அவசரமாகச் செய்த ஒரு முயற்சியை மீண்டும் திருத்த வேண்டிய சூழலும் வரலாம்.'],
 ['வீடு என்பது உங்களுக்கு வசிப்பதற்கான இடம் மட்டுமல்ல; மனஅமைதியுடன் சிந்திக்கவும் வேலை செய்யவும் இடம் தேவைப்படும். வீட்டில் செய்யப்படும் ஒரு மாற்றம் உங்கள் அன்றாடப் பணியையும் குடும்ப நேரத்தையும் மாற்றக்கூடும்.', 'தாயார் மற்றும் குடும்பத்தாரின் நலனில் அக்கறை இருந்தாலும், உங்கள் தனிப்பட்ட முடிவுகளை எல்லோரும் உடனே ஏற்றுக்கொள்ள வேண்டும் என எதிர்பார்க்கும்போது கருத்து வேறுபாடு வரலாம். வீடு, வாகனம் அல்லது சொத்து தொடர்பான செலவில் பயன்பாடும் பராமரிப்பும் முதலில் பார்க்கப்பட வேண்டும்.'],
 ['கற்றதை அப்படியே ஏற்றுக்கொள்வதைவிட ஏன் அப்படி இருக்கிறது என்று ஆராயும்போது உங்கள் அறிவு சிறப்பாகச் செயல்படும். பிழையைத் திருத்தும் திறன் உங்களுக்கு சாதகமாக இருந்தாலும், முடிவில்லாத திருத்தங்கள் ஒரு நல்ல முயற்சியை வெளியிடுவதில் தாமதம் தரலாம்.', 'குழந்தைகள் அல்லது மாணவர்கள் தொடர்பான விஷயங்களில் எதிர்பார்ப்பை மட்டும் வலியுறுத்தாமல் அவர்களின் தனித்த திறனுக்கும் இடம் கொடுப்பது உறவை வலுப்படுத்தும். கல்வி, ஆலோசனை, ஆய்வு, கணக்கீடு, படைப்புத் தொழில் போன்றவற்றில் ஆழ்ந்து ஈடுபடும் வாய்ப்பு உண்டு.'],
 ['உங்கள் வேலை ஒரு பிரச்சினையை அடையாளம் காண்பதுடன் நின்றுவிடாமல் அதற்கான தீர்வைத் தேடும் வகையில் அமையலாம். கடினமான பொறுப்பை ஏற்றுக்கொண்டு அதைச் சரிசெய்தபோது கிடைக்கும் நம்பிக்கையே அடுத்த வாய்ப்புக்கு அடித்தளமாகும்.', 'வேலையில் போட்டி, கடன் அல்லது பிறரது அவசரத் தேவைகள் அதிகரிக்கும்போது உணவு, உறக்கம், ஓய்வு ஆகியவற்றை பின்னுக்குத் தள்ளாதிருப்பது முக்கியம். ஒரு வேலை முடிவதற்குள் அடுத்ததை ஏற்றுக்கொண்டால் உழைப்பு கூடினாலும் பலன் தெளிவாகத் தெரியாமல் போகலாம்.'],
 ['துணைவர் அல்லது கூட்டாளியுடன் வாழும் போது ஒரே கருத்து இருப்பதைவிட கருத்து வேறுபாட்டைச் சமாளிக்கும் முறை முக்கியமாகும். குடும்ப அமைதி, குழந்தைகள், செலவுகள், தொழில் நேரம் போன்ற நடைமுறை விஷயங்களே உறவின் தரத்தை முடிவு செய்யக்கூடும்.', 'மற்றவர் சொன்ன ஒரு வார்த்தையை மீண்டும் மீண்டும் நினைத்து வருந்துவதற்குப் பதிலாக அப்போது இருந்த சூழலைத் தெளிவுபடுத்திப் பேசுவது நல்ல மாற்றம் தரும். உறுதியளித்த பொறுப்புகளைச் சரியான நேரத்தில் நிறைவேற்றுவது நம்பிக்கையை வளர்க்கும்.'],
 ['திடீரென வரும் மாற்றங்களை நீங்கள் பெரும்பாலும் அதன் உண்மையான காரணத்தை அறிந்த பிறகே ஏற்றுக்கொள்வீர்கள். பழைய நடைமுறை வேலை செய்யாவிட்டால் அதைக் கவனமாக மாற்றுவதன் மூலம் பெரிய இழப்பைத் தவிர்க்க முடியும்.', 'காப்பீடு, ஆவணங்கள், ஒப்பந்தங்கள், சொத்து அல்லது மறைமுகச் செலவுகள் போன்ற விஷயங்களைப் புரிந்துகொள்ளாமல் ஒப்புதல் தர வேண்டாம். எதிர்பாராத மாற்றம் எப்போதும் தீமையாகவே முடியாது; பழைய சுமையிலிருந்து விடுபடும் வழியாகவும் மாறலாம்.'],
 ['உங்கள் அறிவை வளர்ப்பதில் புத்தகங்கள் மட்டுமல்ல; அனுபவமுள்ளவர்களுடன் உரையாடுவது, சொந்த முயற்சி, பயணம் ஆகியவையும் பங்கு வகிக்கலாம். ஒரு கருத்து நடைமுறையில் பொருந்துகிறதா என்று ஆராய்ந்த பிறகே அதை ஏற்றுக்கொள்வீர்கள்.', 'தந்தை, ஆசிரியர், மூத்தவர் அல்லது வழிகாட்டியுடன் கருத்து வேறுபாடு ஏற்பட்டாலும் அதிலிருந்து பயன்படும் அறிவைப் பிரித்தெடுக்கும் திறன் வளர வேண்டும். நீண்ட பயணம் அல்லது உயர்கல்வி தொடர்பான முடிவுகளில் உடனடிப் பலனைவிட நீண்டகாலப் பயனைப் பார்க்க வேண்டும்.'],
 ['உங்களுக்கு மரியாதையைத் தருவது பதவிப் பெயர் மட்டுமல்ல; பிறரால் முடியாத ஒரு பணியை ஒழுங்காக முடிப்பதே ஆகும். அறிவு, கணக்கீடு, ஆலோசனை, சேவை அல்லது தொழில்நுட்பம் போன்ற துறைகளில் அடிக்கடி தீர்வு தேடும் பொறுப்புகள் வரலாம்.', 'புதிய வழிமுறைகளில் ஆர்வம் இருந்தாலும் சோதிக்காத ஒன்றை உடனடியாக அனைவருக்கும் வழங்குவதால் நம்பிக்கைக்குச் சிரமம் வரலாம். உங்கள் வேலை மற்றவருக்குப் புரியும் வகையில் ஆவணப்படுத்தப்பட்டால் அந்த அனுபவமே தொழிலின் வளர்ச்சியாக மாறும்.'],
 ['வருமானம் ஒரே நாளில் மிகப் பெரிதாக உயர்வதைவிட ஒழுங்கான உழைப்பும் நம்பகமான தொடர்புகளும் மூலம் படிப்படியாக வளர்வது உங்களுக்கு பொருத்தமாக அமையலாம். நண்பர்கள், வாடிக்கையாளர்கள் அல்லது தொழில் வட்டம் வழியாக வாய்ப்புகள் உருவாகலாம்.', 'எதிர்பார்க்கப்படும் வருமானத்தையும் கைக்கு வந்த பணத்தையும் ஒன்றாகக் கணக்கிடாமல் இருந்தால் குடும்பத்திற்கும் தொழிலுக்கும் பாதுகாப்பு கிடைக்கும். மற்றவர்களுக்கு உதவுவது நல்லதே என்றாலும் அதற்காகத் தனிப்பட்ட தேவைகள் பாதிக்கப்படக் கூடாது.'],
 ['தனியாகச் சிந்திக்க நேரம் கிடைத்தால் பல சிக்கல்களுக்குத் தீர்வு காண முடியும். ஆனால் அதே தனிமை நீண்ட நேரம் வேலை செய்வதோடு இணைந்துவிட்டால் ஓய்வுக்குரிய நேரமும் வேலைக்கே போய்விடலாம்.', 'பயணம், ஆன்மிக ஆர்வம், தானம், கல்வி, குடும்பத் தேவைகள் ஆகியவற்றிற்குச் செலவுகள் வரலாம். எது தேவையான செலவு, எது தள்ளிப்போடக்கூடியது என்று பிரித்து வைத்தால் பொருளாதாரமும் மனநிம்மதியும் ஒரே நேரத்தில் காக்கப்படும்.']
];
const LIFE_EN=[
 ['You approach decisions by examining their practical consequences. Once a responsibility is yours, you tend to see it through, yet carrying everybody else’s work can quietly crowd out rest.','Your progress benefits more from steady habits than from speed alone. A small change in how you plan your day can make both work and family life easier.'],
 ['You may earn well at times yet feel the real question is where the money goes. Family needs and future reserves will occasionally pull in different directions.','You prefer speaking plainly, but an immediate reply can turn a small disagreement into a larger one. Agreeing on financial responsibilities before spending protects both savings and relationships.'],
 ['When an approach fails, you are likely to try another rather than give up. Writing, technology, communication, new skills and short journeys can open useful possibilities.','Sibling and peer relationships benefit from explicit responsibilities. An initiative launched in haste may require a second round of careful work.'],
 ['Home is not simply where you live; you need enough peace to think and work well. Changes to the household may therefore affect your daily productivity as well as family time.','Concern for your mother and relatives may coexist with disagreements about your own decisions. For property, vehicles and renovations, weigh upkeep and usefulness against initial excitement.'],
 ['Your learning grows when you can investigate why something works. Finding errors is a strength, but endless revisions can delay sharing a valuable result.','With children or students, leave room for individual strengths rather than insisting on one standard. Research, teaching, calculation and problem-solving may be meaningful outlets.'],
 ['You are drawn to solving difficult tasks, not merely spotting faults. Completing a demanding responsibility can build the trust that brings the next opportunity.','Competition, debt or urgent requests from others can consume meal, sleep and rest time. Taking on the next task before closing the last may leave you busy without a clear outcome.'],
 ['In a partnership, how you resolve a disagreement matters more than never disagreeing. The ordinary questions of money, work hours, home and children can shape the relationship.','Instead of revisiting a difficult remark in isolation, discuss what each person understood and needs. Reliability in small commitments builds lasting trust.'],
 ['When circumstances change unexpectedly, you often need to understand the cause before accepting them. Thoughtfully replacing an ineffective method may prevent a greater loss.','Review insurance, agreements, records and hidden expenses before making commitments. A surprise need not be a defeat; it may also remove an unhelpful burden.'],
 ['Learning from experienced people, travel and independent effort can matter as much as books. You may test a principle in real life before adopting it.','Differences with teachers, elders or mentors can still produce useful insight. For higher study and distant travel, weigh long-term value over immediate reward.'],
 ['Your standing grows through dependable results, not titles alone. Work involving knowledge, calculations, advice, service or technology can repeatedly demand practical solutions.','An experimental idea should be checked before being shared at scale. Clear documentation turns hard-won experience into a lasting professional asset.'],
 ['Income may grow more steadily through reliable work and trustworthy networks than through sudden windfalls. Clients, colleagues and acquaintances may bring opportunities.','Do not confuse hoped-for income with money already received. Helping others should not come at the expense of essential family commitments.'],
 ['Quiet time can lead to useful solutions, but when solitude turns into late-night work it can consume the rest it was meant to provide.','Travel, study, charity, spiritual interests and family needs may all compete for resources. Distinguishing essential costs from avoidable ones protects both finances and peace of mind.']
];
// These lines are not medical diagnoses; each house has its OWN time-specific lived consequence.
const WINDOW_TA=[
 ['சொந்த முடிவுகளைப் பற்றிய தெளிவு அதிகரித்து, முன்னுரிமைகளை மாற்றியமைக்கும் முயற்சி வரலாம்.','எல்லா பொறுப்பையும் ஒரே நேரத்தில் ஏற்கும் போது உடல் ஓய்வும் குடும்ப நேரமும் குறையலாம்.'],
 ['சேமிப்பு, குடும்பப் பொறுப்பு அல்லது செலவுத் திட்டத்தில் குறிப்பிடத்தக்க திருத்தம் செய்ய நேரிடலாம்.','பணம் தருவதாகத் தெரிவித்த வாய்ப்பை உண்மையான வரவாக எண்ணி செலவிட வேண்டாம்.'],
 ['புதிய திறன் பயிற்சி, எழுதுதல், தகவல் பரிமாற்றம் அல்லது சுயமுயற்சி மூலம் முன்னேற்றம் பெறலாம்.','அவசரமாகப் பயணம் செய்வதையோ ஆய்வு செய்யாமல் ஒப்பந்தம் செய்வதையோ தவிர்க்க வேண்டும்.'],
 ['வீட்டில் வேலை செய்யும் இடத்தை மாற்றுதல், குடும்ப ஒழுங்கை மேம்படுத்துதல் அல்லது சொத்துத் திட்டமிடல் முக்கியமாகலாம்.','குடும்பத்தாரின் கருத்தைக் கேட்காமல் பெரிய செலவு செய்யும்போது மனக்கசப்பு ஏற்படலாம்.'],
 ['கற்றல், ஆலோசனை, தொழில்நுட்பப் படைப்பு அல்லது குழந்தைகளின் கல்வியைச் சார்ந்த முயற்சி முன்னேறலாம்.','செய்ததை மீண்டும் மீண்டும் திருத்துவது நல்ல முடிவை வெளியிடுவதில் தாமதம் தரலாம்.'],
 ['நீண்ட நாளாக நிலுவையில் இருந்த வேலை அல்லது கடன் ஒழுங்கைத் தீர்க்க முயல்வீர்கள்.','உணவு, தூக்கம் மற்றும் உடல் ஓய்வை விட்டுக்கொடுத்து வேலை செய்தால் அசௌகரியம் அதிகமாக உணரப்படலாம்.'],
 ['துணைவர் அல்லது கூட்டாளியுடன் பகிர்ந்து செய்ய வேண்டிய பொறுப்புகளில் தெளிவு ஏற்படலாம்.','திட்டத்தைப் பகிராமல் தனியாக முடிவு எடுத்தால் கருத்து வேறுபாடு நீளலாம்.'],
 ['மறந்துபோன ஆவணம் அல்லது பழைய பொறுப்பை ஒழுங்குபடுத்துவது பின்னர் உதவியாகலாம்.','எதிர்பாராத செலவுக்கு முன்கூட்டியே ஒரு மாற்று ஏற்பாடு வைத்திருப்பது நல்லது.'],
 ['ஒரு வழிகாட்டியின் ஆலோசனையால் அல்லது சொந்தப் பயிற்சியால் அடுத்த நிலைக்குச் செல்ல வாய்ப்பு வரலாம்.','புதிய கருத்தை உடனே நிராகரிக்காமல் அதன் நடைமுறை மதிப்பைக் காண வேண்டும்.'],
 ['முன்பு தொடங்கிய பணியின் தரத்தை உயர்த்துவதன் மூலம் புதிய பொறுப்போ நல்ல பெயரோ கிடைக்கலாம்.','மிக அதிகமான திட்டங்களை ஒரே நேரத்தில் தொடங்குவது முடிவுகளைத் தாமதப்படுத்தலாம்.'],
 ['பழைய தொடர்புகள் வழியாகப் புதிய வாடிக்கையாளர் அல்லது வருமான வாய்ப்பு கிடைக்கலாம்.','கிடைக்காத வருவாயை அடிப்படையாகக் கொண்டு செலவுகளை உயர்த்த வேண்டாம்.'],
 ['தேவையற்ற செலவுகளைக் குறைத்து ஓய்வு நேரத்தை மீட்டெடுக்க ஏற்ற மாற்றம் வரலாம்.','வேலை முடிந்த பின்னரும் அதைப் பற்றிச் சிந்தித்துக்கொண்டிருந்தால் உறக்க ஒழுங்கு பாதிக்கப்படலாம்.']
];
const WINDOW_EN=[
 ['You may reconsider priorities and gain clarity about choices that were previously postponed.','Carrying too many obligations at once can reduce rest and time with family.'],
 ['This may be a time to reorganize savings, family responsibilities and the household budget.','Do not spend in advance of income that has not actually arrived.'],
 ['Progress can come through a practical new skill, writing, communication or self-directed effort.','Avoid hurried travel and agreements made without checking the details.'],
 ['Changes to the home workspace, family routines or property planning may become important.','Major spending without household discussion can prolong resentment.'],
 ['Study, advice, technical creation or matters concerning children’s learning may advance.','Repeated revisions can delay publishing something already useful.'],
 ['This can bring an opportunity to resolve unfinished work or reorganize obligations and debt.','Working at the expense of meals, sleep and recovery may make discomfort more noticeable.'],
 ['Shared responsibilities with a spouse or partner may become clearer.','A unilateral decision can prolong an avoidable disagreement.'],
 ['Organizing an old record or obligation now can prevent later confusion.','Leave room for an unexpected expense instead of assuming every plan will hold.'],
 ['Guidance or deliberate practice may help move learning to a new level.','Consider the practical value of unfamiliar advice before rejecting it.'],
 ['Improving the quality of earlier work may build responsibility and reputation.','Starting several projects simultaneously can delay a visible result.'],
 ['An existing network may bring clients or earning opportunities.','Avoid increasing expenses against income that has not been received.'],
 ['Simplifying costs and making room for rest may improve daily balance.','Unfinished work carried into the night can disturb sleep habits.']
];
const BODY_LINK_TA={vision:'கண் களைப்பு, ஒளி உணர்வு',digestion:'வயிற்று உப்புசம், செரிமான அசௌகரியம்',metabolism:'உணவுப் பழக்கமும் உடல் எடை மாற்றமும்',bones:'மூட்டு மற்றும் தசை இறுக்கம்',breath:'மார்பு அல்லது சுவாசப்பாதை அசௌகரியம்',skin:'தோல் உலர்வு அல்லது அரிப்பு',reproductive:'இடுப்பு மற்றும் கீழ்வயிற்றுப் பகுதி அசௌகரியம்',sleep:'தூக்க நேர மாறுதல், ஓய்வுக் குறைவு'};
const BODY_LINK_EN={vision:'eye strain or sensitivity to light',digestion:'bloating or digestive discomfort',metabolism:'changes in appetite or body weight',bones:'joint or muscular stiffness',breath:'chest or airway discomfort',skin:'dryness or irritation of the skin',reproductive:'pelvic or lower-abdominal discomfort',sleep:'irregular sleep and insufficient rest'};
const MEDICAL_PRIMARY={vision:2,digestion:5,metabolism:6,bones:11,breath:4,skin:1,reproductive:8,sleep:12};
const MEDICAL_SECONDARY={vision:12,digestion:6,metabolism:8,bones:10,breath:3,skin:6,reproductive:7,sleep:4};
const PLANET_MOD_TA={Jupiter:'அனுபவமுள்ளவர்களின் ஆலோசனையும் கற்றலும் துணை நிற்கலாம்',Saturn:'முடிவுகள் மெதுவாக வந்தாலும் ஒழுங்கை நிலைநிறுத்துவது பலனளிக்கும்',Rahu:'புதிய வழியைச் சோதிப்பதற்கு முன் அதன் நம்பகத்தன்மையை ஆராய வேண்டும்',Ketu:'பயன் தராத பழைய சுமையைக் குறைப்பது முன்னேற்றத்துக்கு இடமளிக்கலாம்'};
const PLANET_MOD_EN={Jupiter:'guidance and learning may offer support',Saturn:'discipline matters even when progress is slow',Rahu:'check the reliability of an unfamiliar solution before adopting it',Ketu:'removing unnecessary commitments can create room for progress'};
function cleanedParagraphs(topic){return (topic?.paragraphs||[]).map(x=>typeof x==='string'?x:x?.text).filter(x=>typeof x==='string'&&x.trim());}
function chooseBaseline(topic){const arr=cleanedParagraphs(topic);const seen=new Set();return arr.filter(s=>{const k=s.toLocaleLowerCase().replace(/\s+/g,' ').slice(0,120);if(seen.has(k))return false;seen.add(k);return s.length>70;}).sort((a,b)=>b.length-a.length).slice(0,2);}
function physicalByHouse(report,n,lang){
 const item=report?.physicalTopics?.[n-1],rows=cleanedParagraphs(item);if(!rows.length)return "";
 // One body-constitution sentence INSIDE the relevant house, never a duplicate block.
 const chosen=rows.find(x=>x.length>70)||rows[0];return chosen;
}
function medicalByHouse(report,n,lang){const ta=lang!=='en',notes=[];for(const m of report.medicalTopics||[]){const h=MEDICAL_PRIMARY[m.id];if(h!==n)continue;const category=m.evidence?.classification;if(category!=='traditional-concern'&&category!=='mixed')continue;const sym=(ta?BODY_LINK_TA:BODY_LINK_EN)[m.id];if(!sym)continue;
 // One standalone house sentence with no health subheading, and no claim of a congenital defect.
 notes.push(ta?`இந்தப் பாவத்திற்கான உடல் சார்ந்த பாரம்பரியக் குறியீடுகளில் ${sym} போன்ற அசௌகரியங்கள் தொடர்புபடுத்தப்படுகின்றன. இந்தச் சின்னம் வாழ்நாள் முழுவதும் ஒரு நோய் இருக்கும் என்று சொல்வதில்லை; வேலை–உணவு–ஓய்வு சூழலும் தொடர்புடைய காலப்பலனும் ஒன்றாக வரும்போது கவனிக்கப்படும் விஷயமாகும்.`:`The traditional body correspondence for this house includes ${sym}. That does not mean a lifelong illness or a confirmed congenital condition; the theme is considered alongside changing routines and period evidence.`);
 }return notes.slice(0,2);}
function relation(natal,n,lang){if(!natal?.houses?.[n-1])return '';const h=natal.houses[n-1],l=natal.planets?.[h.lord];if(!l||!Number.isInteger(l.house))return '';const ta=lang!=='en',loc=l.house;const occ=(h.occupants||[]).filter(x=>x!==h.lord);
 // Relationships are causal provenance: practical narrative follows separately.
 return ta?`${n}-ஆம் பாவத்திற்கு அதிபதியான ${planet(h.lord,true)} ${loc}-ஆம் வீட்டில் இருப்பதால் இரு பாவங்களின் வாழ்க்கைச் சூழல்களும் தொடர்புபடுகின்றன.${occ.length?' இந்த வீட்டில் '+occ.map(x=>planet(x,true)).join(', ')+' இருப்பதும் பலனை மாற்றுகிறது.':''}`:
 `The ruler of house ${n}, ${planet(h.lord,false)}, occupies house ${loc}, linking those areas of life.${occ.length?' The presence of '+occ.map(x=>planet(x,false)).join(', ')+' modifies the outcome.':''}`;
}
function starThread(natal,timeline,n,lang){
 const first=timeline?.dasha?.[0];if(!first||!natal?.planets)return '';
 const ev=globalThis.SMVD1V301Evidence;if(!ev?.points||!ev?.starOf)return '';
 const md=EN[first.md]||first.md,ad=EN[first.ad]||first.ad;
 if(!natal.planets[md]||!natal.planets[ad])return '';
 const weighted=ev.points(natal,md,ad)?.ranked||[];
 if(!weighted.slice(0,5).some(x=>x.house===n))return '';
 const m=natal.planets[md],a=natal.planets[ad],ms=ev.starOf(natal,md),as=ev.starOf(natal,ad);
 const nm=lang!=='en',ln=x=>planet(x,nm);
 return nm?`நடப்பு ${ln(md)} தசையில் ${ln(ad)} புக்தி செயல்படும் போது, பிறப்பில் ${ln(md)} ${m.house}-ஆம் வீட்டிலிருந்தும் அதன் நட்சத்திர அதிபதி ${ln(ms?.lord||md)} வழியாகவும் பலன் தருகிறார். ${ln(ad)} ${a.house}-ஆம் வீட்டிலிருந்து ${ln(as?.lord||ad)} சாரத்தையும் இணைக்கிறார். அந்தத் தொடர்புகள் இந்த ${n}-ஆம் பாவத்தையும் முன்னிலைப்படுத்துவதால், ஒரே கிரகத்தின் இருப்பிடத்தை மட்டும் வைத்து நல்லது அல்லது கெட்டது என்று முடிவு செய்ய முடியாது.`:
 `During ${ln(md)} major period and ${ln(ad)} sub-period, the natal ${ln(md)} in house ${m.house} works through its star ruler ${ln(ms?.lord||md)}, while ${ln(ad)} in house ${a.house} links to ${ln(as?.lord||ad)}. Their weighted connections activate house ${n}, so no single placement should be treated as an isolated promise or setback.`;
}
function periodOverlap(a,b){return validISO(a?.from)&&validISO(b?.from)&&a.from<b.to&&b.from<a.to;}
function candidates(report,n){if(!report)return [];
 const dashas=(report.dasha||[]).flatMap((p,i)=>(p.topics||[]).filter(t=>t.number===n).map(t=>({type:'period',from:p.from,to:p.to,period:p,activation:t.activation||0,rank:(t.activation||0)+(i===0?4:0),topic:t})));
 const transits=(report.transitYears||[]).flatMap((y,i)=>(y.notes||[]).filter(x=>x.focus===n).map(note=>({type:'transit',from:y.from,to:y.to,year:y,note,activation:0,rank:(i===0?3:0)+1})));
 // Pair *real* period and local midpoint observation; never invent an ingress date.
 for(const c of dashas){const hits=transits.filter(t=>periodOverlap(c,t)).sort((a,b)=>b.rank-a.rank);if(hits.length){c.hit=hits[0];c.rank+=3;}}
 // Prefer immediate/major-lord variation as well as strong house activation; do not repeat every monthly snapshot.
 const sorted=[...dashas,...transits.filter(t=>!dashas.some(d=>periodOverlap(d,t)))].sort((a,b)=>b.rank-a.rank||a.from.localeCompare(b.from));
 const selected=[],signatures=new Set();for(const c of sorted){if(selected.length>=5)break;const sig=c.type==='period'?`${c.period.md}:${c.period.ad}`:`transit:${c.note.planet}:${c.from.slice(0,4)}`;
 if(signatures.has(sig))continue;if(selected.some(x=>periodOverlap(x,c)))continue;selected.push(c);signatures.add(sig);}
 // Guarantee a near-term item when genuinely relevant.
 const first=dashas.find(x=>x.from===report.referenceDate);if(first&&!selected.some(x=>periodOverlap(x,first))){selected.pop();selected.unshift(first);}
 return selected.sort((a,b)=>a.from.localeCompare(b.from));
}
function timedParagraph(c,n,lang){const ta=lang!=='en',scene=(ta?WINDOW_TA:WINDOW_EN)[n-1],period=c.type==='period'?c.period:null;
 const title=period?(ta?`${planet(period.md,true)} தசையில் ${planet(period.ad,true)} புக்தி`:`${planet(period.md,false)} major period and ${planet(period.ad,false)} sub-period`):'';
 const d=ta?`${c.from} முதல் ${c.to} வரை`:`From ${c.from} to ${c.to}`;
 const msg=c.rank>=6?scene[0]:scene[1];let s=period?(ta?`${d} ${title} செயல்படுவதால் ${msg}`:`${d}, with ${title}, ${msg}`):(ta?`${d} கோச்சாரத் தொடர்பு வலுப்பெறும் போது ${scene[0]}`:`${d}, as the transit contacts this area, ${scene[0]}`);
 const transit=c.hit|| (c.type==='transit'?c:null);if(transit?.note){const pname=transit.note.planet,dt=transit.year?.date||transit.from;
 s+=ta?` ${dt} அன்று கணிக்கப்பட்ட ${planet(pname,true)} பெயர்ச்சியும் இந்தப் பாவத்துடன் தொடர்பு பெறுகிறது; ${PLANET_MOD_TA[pname]||'அந்தப் பெயர்ச்சியின் வலிமையை மற்ற கிரகங்களுடன் சேர்த்து வாசிக்க வேண்டும்'}.`:
 ` A calculated ${planet(pname,false)} transit snapshot on ${dt} also connects to this house; ${PLANET_MOD_EN[pname]||'it should be weighed alongside the other factors'}.`;
 }
 return s;}
function build(chart,lang='ta',context={},timeline=null){const reader=globalThis.SMVLifePredictionD1;if(!reader?.render||!reader?.toD1)throw Error('D1 life reader is required');
 const rep=reader.render(chart,lang,context),natal=reader.toD1(chart);if(rep.topics?.length!==12)throw Error('12 D1 life topics required');
 const topics=rep.topics.map((t,i)=>{const n=i+1,ta=lang!=='en';const base=chooseBaseline(t);const scene=(ta?LIFE_TA:LIFE_EN)[i];const evidence=relation(natal,n,lang);const para=[];if(base[0])para.push(base[0]);para.push(scene[0]);if(base[1]&&base[1]!==base[0])para.push(base[1]);para.push(scene[1]);if(evidence)para.push(evidence);const star=starThread(natal,timeline,n,lang);if(star)para.push(star);
 const physical=physicalByHouse(rep,n,lang);if(physical)para.push(physical);const medical=medicalByHouse(rep,n,lang);para.push(...medical);
 const times=candidates(timeline,n);para.push(...times.map(c=>timedParagraph(c,n,lang)));
 return {number:n,title:t.title,paragraphs:para,timedWindows:times.length,medicalAssociations:medical.length};});
 return {topics,lang:lang==='en'?'en':'ta',timeline:timeline?{from:timeline.referenceDate,to:timeline.end,years:timeline.meta?.forecastHorizonYears??15}:null};}
function html(report){const ta=report.lang!=='en';const span=report.timeline?`${report.timeline.from} – ${report.timeline.to}`:(ta?'கணிக்கப்படுகிறது':'being calculated');
 return `<section class="smv-d1-life-reading smv-v302-integrated" data-smv-d1-life="1" data-smv-integrated="12" lang="${report.lang}"><h2>${ta?'முழு வாழ்க்கைப் பலன்கள்':'Complete Life Predictions'}</h2><p class="smv-v302-intro">${ta?`பிறப்பு ஜாதகம், கிரக பலம், நட்சத்திரத் தொடர்பு, உடல் சார்ந்த பாரம்பரியக் காரகங்கள், தசை–புக்தி மற்றும் பெயர்ச்சிகள் அனைத்தும் பன்னிரண்டு வாழ்க்கைத் தலைப்புகளுக்குள்ளேயே இணைக்கப்பட்டுள்ளன. காலப்பார்வை: ${esc(span)}. எந்த உடல் உபாதையும் ஜாதகத்தால் மருத்துவ ரீதியாக உறுதிப்படுத்தப்படுவதில்லை.`:`The twelve life topics integrate natal evidence, traditional bodily associations, Dasha–Bhukti and calculated transits. Forward window: ${esc(span)}. A horoscope does not diagnose disease or congenital conditions.`}</p>${report.topics.map(t=>`<section class="smv-d1-life-topic smv-v302-house" data-d1-topic="${t.number}"><h3>${t.number}. ${esc(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${esc(p)}</p>`).join('')}</section>`).join('')}</section>`;}
return Object.freeze({build,html,candidates,medicalByHouse,version:'302-one-12-house-15-year-integrated'});
});

;

/* ---- d1-strength.js (preserves original execution order) ---- */
/* SMV ASTRO V303 — independent, offline, inspectable traditional strength model.
 * Distances 15/8/3 degrees are USER-REQUESTED MODEL BANDS, not a quotation
 * or an empirically validated probability scale. Never diagnosis or gender prediction.
 * READS existing Swiss-derived longitude/sign data; no network/database access.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1StrengthV303=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const KEYS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const ASPECT={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const COMBUST={Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15};
 const FRIENDS={Sun:['Moon','Mars','Jupiter'],Moon:['Sun','Mercury'],Mars:['Sun','Moon','Jupiter'],Mercury:['Sun','Venus'],Jupiter:['Sun','Moon','Mars'],Venus:['Mercury','Saturn'],Saturn:['Mercury','Venus']};
 const ENEMIES={Sun:['Venus','Saturn'],Moon:[],Mars:['Mercury'],Mercury:['Moon'],Jupiter:['Mercury','Venus'],Venus:['Sun','Moon'],Saturn:['Sun','Moon','Mars']};
 const SIGN_LORDS=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 function naturalDignity(k,p){if(!p||!SIGN_LORDS[p.sign]||!FRIENDS[k])return 'neutral';
  if(EXALTED[k]===p.sign)return 'exalted';if((OWNS[k]||[]).includes(p.sign))return 'own';
  if(({Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0})[k]===p.sign)return 'debilitated';
  const host=SIGN_LORDS[p.sign];return FRIENDS[k].includes(host)?'friend':ENEMIES[k].includes(host)?'enemy':'neutral';}
 const KARAKA={children:['Jupiter'],wealth:['Jupiter'],marriage:['Venus'],home:['Moon','Venus'],profession:['Sun','Saturn','Mercury','Jupiter'],health:['Sun'],learning:['Jupiter','Mercury']};
 const EXALTED={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const mod=x=>((x%360)+360)%360;
 const angle=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return null;let d=Math.abs(mod(a)-mod(b));return Math.min(d,360-d);};
 const lon=p=>p&&Number.isFinite(p.longitude)?mod(p.longitude):null;
 const band=d=>d===null?'unknown':d<=3?'within-3':d<=8?'within-8':d<=15?'within-15':'beyond-15';
 const weight=d=>d===null?0.40:d<=3?1:d<=8?0.76:d<=15?0.44:0.09;
 function phase(d){const sun=lon(d?.planets?.Sun),moon=lon(d?.planets?.Moon);if(sun===null||moon===null)return null;
  const separation=mod(moon-sun),light=clamp((1-Math.cos(separation*Math.PI/180))/2);return {separation,light,brightFifthWindow:separation>=48&&separation<=240,waxing:separation<180,
   phaseClass:separation>=48&&separation<=240?'strong-window':'weak-window',
   tithiIndex:Math.min(30,Math.floor(separation/12)+1)};}
 function navamsaSign(p){const L=lon(p);if(L===null)return null;const sign=Math.floor(L/30),degree=L%30,part=Math.min(8,Math.floor(degree/(30/9)));
  const kind=sign%3,start=kind===0?sign:kind===1?(sign+8)%12:(sign+4)%12;return (start+part)%12;}
 function vargottama(p){return p&&navamsaSign(p)===p.sign&&navamsaSign(p)!==null;}
 function digBalaHouse(k){return {Jupiter:1,Mercury:1,Moon:4,Venus:4,Saturn:7,Sun:10,Mars:10}[k]??null;}
 function proximity(d,k1,k2){const a=d?.planets?.[k1],b=d?.planets?.[k2],dist=angle(lon(a),lon(b));return {a:k1,b:k2,degrees:dist,band:band(dist),weight:weight(dist),sameSign:!!a&&!!b&&a.sign===b.sign};}
 function conjunction(d,a,b){const p=proximity(d,a,b);return p.sameSign?p:{...p,weight:0};}
 function aspect(d,from,to){const a=d?.planets?.[from],b=d?.planets?.[to];if(!a||!b)return null;
  const step=((b.house-a.house+12)%12)+1;if(!(ASPECT[from]||[]).includes(step))return null;
  const delta=angle(lon(b),lon(a)===null?null:mod(lon(a)+(step-1)*30));return {from,to,step,degrees:delta,band:band(delta),weight:weight(delta)};}
 function combust(d,k){if(k==='Sun'||!COMBUST[k])return {combust:false,orb:null,near:false,relief:[]};const p=d?.planets?.[k],sun=d?.planets?.Sun;if(!p||!sun)return {combust:false,orb:null,near:false,relief:[]};
  const orb=angle(lon(p),lon(sun)),limit=k==='Venus'&&p.retrograde?8:k==='Mercury'&&p.retrograde?12:COMBUST[k],isCombust=orb!==null&&orb<=limit,relief=[];
  if(vargottama(p))relief.push('vargottama');if(p.house===digBalaHouse(k))relief.push('directional-house');
  const lordName=d.houses?.[p.house-1]?.lord,owner=d?.planets?.[lordName];if(owner?.house===p.house)relief.push('dispositor-present');
  return {combust:isCombust,orb,limit,near:orb!==null&&orb<=3,relief};}
 function nodes(d,k){if(!['Rahu','Ketu'].includes(k))throw Error('Node required');const p=d.planets[k],signLord=d.houses?.[p.house-1]?.lord;const co=(d.houses?.[p.house-1]?.occupants||[]).filter(x=>x!==k),asps=KEYS.filter(x=>x!==k&&x!=='Rahu'&&x!=='Ketu'&&aspect(d,x,k)),kendra=KEYS.filter(x=>x!==k&&d.planets[x]&&[1,4,7,10].includes(((d.planets[x].house-p.house+12)%12)+1));
  // Nakshatra ruler is recorded by the older V301 reader, but ranks after the sign lord,
  // conjunction, direct aspects and Kendra links in Adithya Guruji's node hierarchy.
  const E=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)?.starOf;const star=E?E(d,k)?.lord:null;
  return {key:k,house:p.house,signLord,conjunctions:co.map(x=>conjunction(d,k,x)),aspects:asps.map(x=>aspect(d,x,k)),kendra,starLord:star,hierarchy:['sign-lord','close-conjunction','direct-aspect','kendra-contacts','star-lord'],starsLast:true};}
 function eclipse(d){const sc=proximity(d,'Sun','Moon'),out=[];for(const k of ['Rahu','Ketu']){const so=proximity(d,'Sun',k),mo=proximity(d,'Moon',k);
  // A node-close Sun/Moon alone is NOT a solar/lunar eclipse: syzygy is necessary.
  if(so.degrees!==null&&so.degrees<=15&&sc.degrees!==null&&sc.degrees<=12)out.push({kind:'solar-configuration',node:k,orb:so.degrees});
  if(mo.degrees!==null&&mo.degrees<=15&&sc.degrees!==null&&Math.abs(sc.degrees-180)<=12)out.push({kind:'lunar-configuration',node:k,orb:mo.degrees});
 }return out;}
 function assess(d,k){const p=d?.planets?.[k];if(!p)return null;const partners=[],aspectedBy=[];for(const x of KEYS){if(x===k||!d.planets[x])continue;if(d.planets[x].house===p.house)partners.push(conjunction(d,k,x));const a=aspect(d,x,k);if(a)aspectedBy.push(a);}
  const dignity=naturalDignity(k,p);let support=dignity==='exalted'?0.88:dignity==='own'?0.82:dignity==='friend'?0.64:dignity==='enemy'?0.43:dignity==='debilitated'?0.22:0.55;
  if(p.retrograde)support+=0.07; // prominence, NOT universal beneficence or exaltation
  if(vargottama(p))support+=0.09;if(p.house===digBalaHouse(k))support+=0.07;
  const burning=combust(d,k);if(burning.combust)support-=0.13*(burning.relief.length?0.45:1);
  const moon=phase(d);if(k==='Moon'&&moon)support=0.7*support+0.3*moon.light;
  let stress=0,benefit=0;for(const c of partners.concat(aspectedBy)){if(!c.weight)continue;const other=c.a===k?c.b:c.from||c.b;if(other==='Rahu')stress+=0.43*c.weight;else if(other==='Ketu'){if(['Sun','Moon'].includes(k))stress+=0.32*c.weight;else if(['Mars','Saturn'].includes(k))benefit+=0.12*c.weight;else benefit+=0.09*c.weight;}
   else if(['Saturn','Mars','Sun'].includes(other))stress+=0.15*c.weight;else if(['Jupiter','Venus'].includes(other))benefit+=0.17*c.weight;else if(other==='Moon'&&moon)benefit+=0.12*moon.light*c.weight;
  }
  const score=clamp(support+benefit-stress);return {planet:k,score,dignity,retrograde:!!p.retrograde,combust:burning,vargottama:vargottama(p),directional:p.house===digBalaHouse(k),partners,aspectedBy,moonPhase:k==='Moon'?moon:undefined,stress:clamp(stress),support:clamp(benefit)};
 }
 function matter(d,key){const defs={children:{house:5,karaka:'Jupiter'},wealth:{house:2,karaka:'Jupiter'},marriage:{house:7,karaka:'Venus'},home:{house:4,karaka:'Moon'},profession:{house:10,karaka:'Sun'},learning:{house:5,karaka:'Mercury'},health:{house:1,karaka:'Sun'}};
  const f=defs[key];if(!f)throw Error('Unknown matter');const h=d.houses[f.house-1],p=d.planets[h.lord],c=d.planets[f.karaka];if(!p||!c)return null;
  const lord=assess(d,h.lord),karaka=assess(d,f.karaka),occupied=h.occupants.map(x=>assess(d,x)),incoming=h.aspects.map(x=>assess(d,x));
  const source=0.3*(lord?.score||0)+0.3*(karaka?.score||0)+0.16*clamp((occupied.reduce((s,x)=>s+(x?.score||0),0)/(occupied.length||1)))+0.12*clamp((incoming.reduce((s,x)=>s+(x?.score||0),0)/(incoming.length||1)))+0.12;
  return {key,house:f.house,houseLord:h.lord,karaka:f.karaka,lord,karakaStatus:karaka,occupants:occupied,incoming,score:clamp(source),blockedCompletely:false};
 }
 return Object.freeze({angle,band,weight,phase,navamsaSign,vargottama,combust,proximity,conjunction,aspect,assess,matter,nodes,eclipse,KARAKA,version:'303-evidence-degree-bands-user-model'});
});

;

/* ---- d1-integrated-reading.js (preserves original execution order) ---- */
/* SMV ASTRO V306 — source-anchored 12-house predictions, 15-year age-aware periods.
 * Pure reading only; no Firestore, API, recomputation or browser observation.
 * IMPORTANT: never import narration from another natal chart or static sample.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1IntegratedV303=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const K={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const TA={1:'தனித்தன்மை, உடல்நலம் மற்றும் குணநலன்கள்',2:'குடும்பம், பேச்சு மற்றும் பொருளாதாரப் பாதுகாப்பு',3:'முயற்சி, உடன்பிறப்புகள் மற்றும் தகவல் தொடர்பு',4:'தாய், வீடு, கல்விச் சூழல் மற்றும் குடும்ப அமைதி',5:'அறிவுத்திறன், கல்வி, புத்திரம் மற்றும் படைப்பாற்றல்',6:'தினசரி பொறுப்புகள், போட்டி, உடல் ஒழுங்கு',7:'உறவுகள், ஒத்துழைப்பு மற்றும் திருமண வாழ்க்கை',8:'மாற்றங்கள், பாதுகாப்பு மற்றும் மறைபொருள் ஆய்வு',9:'தந்தை, ஆசிரியர்கள், உயர்கல்வி மற்றும் பாக்கியம்',10:'தொழில், கடமை மற்றும் சமூக அங்கீகாரம்',11:'ஆதாயம், நண்பர்கள் மற்றும் எதிர்கால இலக்குகள்',12:'ஓய்வு, செலவுகள், தனிமை மற்றும் அந்நியத் தொடர்புகள்'};
const EN={1:'Character, constitution and confidence',2:'Family, speech and financial security',3:'Initiative, siblings and communication',4:'Mother, home and learning environment',5:'Learning, creativity and children',6:'Routine, challenges and wellbeing',7:'Relationships and cooperation',8:'Changes, safety and deeper inquiry',9:'Father, mentors and higher learning',10:'Work, responsibility and recognition',11:'Gains, networks and aspirations',12:'Rest, expenditure and private life'};
const HM={1:['தன்னம்பிக்கை','உடலின் வளர்ச்சி','தினசரி ஒழுங்கு'],2:['குடும்பப் பொருளாதாரம்','பேச்சுத்திறன்','சேமிப்பு'],3:['முயற்சி','தகவல் பரிமாற்றம்','உடன்பிறப்பு உறவு'],4:['வீட்டு வசதி','தாய்வழி ஆதரவு','அடிப்படைக் கல்வி'],5:['கல்வி','படைப்பாற்றல்','குழந்தைகள்'],6:['தினசரி பொறுப்பு','போட்டி','உடல் ஒழுங்கு'],7:['உறவுகளில் ஒத்துழைப்பு','கருத்துப் பரிமாற்றம்','கூட்டுப்பொறுப்பு'],8:['மாற்றங்களைச் சமாளித்தல்','பாதுகாப்பு','ஆழமான ஆய்வு'],9:['ஆசிரியர் வழிகாட்டல்','பாக்கியம்','நீண்டகாலக் கல்வி'],10:['தொழில்திறன்','பொறுப்பை நிறைவேற்றுதல்','சமூக அங்கீகாரம்'],11:['ஆதாயம்','நண்பர் வட்டம்','இலக்குகள்'],12:['ஓய்வு','செலவுகள்','தனிப்பட்ட சிந்தனை']};
const HE={1:['confidence','physical development','daily routine'],2:['family resources','communication','savings'],3:['initiative','communication','sibling ties'],4:['home comforts','maternal support','early learning'],5:['education','creativity','children'],6:['daily responsibilities','competition','wellbeing'],7:['cooperation','communication in relationships','shared obligations'],8:['managing change','safety','research'],9:['mentoring','opportunity','further learning'],10:['competence','responsibility','recognition'],11:['gains','friendships','goals'],12:['rest','spending','quiet reflection']};
const EARLY_TA=[
 'இந்த வயதில் பெற்றோரின் பராமரிப்பு, உறக்க நேரம், உடல் அசைவுகள் மற்றும் சுற்றியுள்ளவர்களின் அன்பு தான் தன்னம்பிக்கையின் அடித்தளமாக அமையும்.',
 'குழந்தையின் சொந்த வருமானம் அல்ல; குடும்பம் வழங்கும் உணவு, பராமரிப்பு, பேச்சை உணரும் திறன் மற்றும் பாதுகாப்பான சூழலே இப்பாவத்தின் பலனாக வெளிப்படும்.',
 'கைகளால் பொருட்களைத் தொட்டு அறிதல், ஒலி மற்றும் சைகைகளுக்கு எதிர்வினை, அருகிலுள்ள குழந்தைகள் அல்லது உடன்பிறப்புகளுடனான தொடர்பு முக்கியமாகும்.',
 'தாயின் அரவணைப்பும் வீட்டின் அமைதியும் குழந்தையின் உறக்கம், விளையாட்டு, ஆரம்பக் கற்றல் ஆகியவற்றுக்கு ஆதரவாக அமையும்.',
 'புதிய ஒலிகளைப் புரிந்துகொள்வது, விளையாட்டின் மூலம் கற்பது, நினைவுத்திறன் வளர்வது போன்ற ஆரம்ப அறிவு வளர்ச்சிக்கே இங்கு முக்கியத்துவம்.',
 'உணவு, உறக்கம், சுகாதாரம், பராமரிப்பாளர்களின் ஒழுங்கு ஆகியவை வயதுக்கேற்ற அன்றாடப் பொறுப்பாகும்; தொழில் அல்லது கடன் என வாசிக்கக்கூடாது.',
 'குழந்தை பெற்றோர், பராமரிப்பாளர்கள் மற்றும் அருகிலுள்ளவர்களின் அன்புக்கு எவ்வாறு பதிலளிக்கிறது என்பதே உறவுகளின் முதன்மைப் பலனாகும்.',
 'இடமாற்றம், பழக்கத்தில் மாற்றம், புதிய சூழலுடன் பழகுதல் போன்ற சிறிய வாழ்க்கை மாற்றங்களில் குடும்ப ஆதரவு முக்கியம்.',
 'தந்தை மற்றும் மூத்தோரின் பராமரிப்பு, வழிகாட்டும் வார்த்தைகள், ஆரம்ப அறிமுகங்கள் இப்பாவத்தில் முன்னிலை பெறுகின்றன.',
 'இது குழந்தைக்கான வேலைவாய்ப்பு அல்லது பதவி அல்ல; சிறிய பழக்கங்களைப் பயில்வதும் பொறுப்பை உணர்வதற்கான அடித்தளமும் வளரலாம்.',
 'குடும்பம் வழங்கும் ஆதரவு, விளையாட்டுக் கூட்டம், பிற குழந்தைகளோடு பழகும் ஆரம்ப வாய்ப்பு ஆகியவையே ஆதாயப் பலன்கள்.',
 'குழந்தையின் உறக்கம், பாதுகாப்பு, பெற்றோர் செலவுகள் மற்றும் மாற்றிய சூழலில் ஓய்வெடுக்கும் வழக்கம் முக்கியமாகும்.'
];
const SCHOOL_TA=[
 'பள்ளி வாழ்க்கையில் தன்னம்பிக்கை, ஒழுக்கம், விளையாட்டு மற்றும் தன்னுடைய திறமையை வெளிப்படுத்தும் முறைகள் உருவாகலாம்.',
 'குடும்பத்தின் பொருளாதார ஆதரவும் பேசும் திறனும் வாசிப்பு, எழுத்து மற்றும் ஆரம்பக் கணக்கியல் வளர்ச்சியில் பிரதிபலிக்கலாம்.',
 'உடன்பிறப்புகள், நண்பர்கள், எழுத்துப் பயிற்சி, இணையப் பயன்பாடு மற்றும் புதிய திறன்களைப் பயிலும் முயற்சி முக்கியமாகலாம்.',
 'வீட்டில் படிக்க ஏற்ற இடம், பெற்றோரின் வழிகாட்டல், பள்ளி மாற்றம் அல்லது பயிற்சிக்கான வசதி முக்கியத்துவம் பெறலாம்.',
 'படிப்பு, நினைவுத்திறன், கணிதம், கலை, போட்டிகள், படைப்பாற்றல் ஆகியவற்றில் ஆர்வம் வெளிப்படலாம்.',
 'பள்ளிப் போட்டிகள், பயிற்சி நேரம், உணவு–உறக்க ஒழுங்கு, உடற்பயிற்சிக்கான பொறுப்பு முக்கியமாகும்.',
 'சக மாணவர்கள், நண்பர்கள், ஆசிரியர்கள் ஆகியோருடன் இணைந்து செயல்படுவதும் கருத்து வேறுபாடுகளைப் பேசித் தீர்ப்பதும் வளரலாம்.',
 'பாடத்திட்டம், வகுப்பு, பள்ளிச் சூழல் மாறுதல் போன்றவற்றைச் சமாளிக்கும் திறனும் பாதுகாப்புப் பழக்கங்களும் வளரலாம்.',
 'தந்தை, ஆசிரியர் வழிகாட்டல், புதிய பாடங்களை அறிதல், கல்விப் பயணங்கள் ஆகியவை முன்னிலை பெறலாம்.',
 'எதிர்கால வேலை அல்ல; பொறுப்புணர்வு, பள்ளியில் ஒப்படைக்கப்படும் பணிகள், திறமைக்குக் கிடைக்கும் பாராட்டு ஆகியவை பொருத்தமான பலன்கள்.',
 'நண்பர் வட்டம், குழுச் செயல்பாடுகள், திறமைக்கான அங்கீகாரம், படிப்பு இலக்குகள் ஆகியவை வளரலாம்.',
 'பள்ளிச் செலவுகள், படிப்புக்கான சாதனங்கள், தனிப்பட்ட ஓய்வு, இணையப் பயன்பாட்டில் ஒழுங்கு ஆகியவற்றில் குடும்ப வழிகாட்டல் தேவைப்படலாம்.'
];
const ADULT_TA=[
 'சொந்த முடிவுகள், பணிமுறை, உடல் சக்தி மற்றும் பொறுப்பின் அளவை அறிந்துகொள்ளும் அனுபவங்கள் வாழ்க்கைப் போக்கை வடிவமைக்கும்.',
 'குடும்ப வருமானம், பேச்சால் உருவாகும் நம்பிக்கை, சேமிப்பின் நிலைத்தன்மை, பொறுப்புகளுக்கான நிதித் திட்டம் முன்னிலை பெறலாம்.',
 'சுயமுயற்சி, எழுதுதல், தொடர்புத் திறன், தொழில்நுட்பப் பயிற்சி, சகோதர உறவுகள் வழியாக முன்னேற்றம் உருவாகலாம்.',
 'வீடு, தாயின் தேவைகள், வசிப்பிடம், சொத்து மற்றும் குடும்பத்திற்குச் செலவிடும் நேரம் பற்றிய முடிவுகள் முக்கியமாகலாம்.',
 'ஆழமான கல்வி, படைப்பாற்றல், மாணவர்களுக்கு வழிகாட்டுதல், குழந்தைகள் தொடர்பான பொறுப்புகள் ஆகியவை இணைந்து வரலாம்.',
 'வேலைப்பளு, போட்டி, கடன் ஒழுங்கு, பிரச்சினைகளைத் தீர்க்கும் திறன், உணவு மற்றும் ஓய்வு நேரத்தின் சமநிலை முக்கியமாகும்.',
 'வாழ்க்கைத்துணை அல்லது தொழில் கூட்டாளியுடன் உரையாடல், வாக்குறுதி, பணப்பகிர்வு, பொறுப்பைப் பகிர்தல் ஆகியவை உறவின் தரத்தை மாற்றலாம்.',
 'எதிர்பாராத செலவுகள், பழைய பொறுப்புகளைத் திருத்துதல், ஆவணப் பாதுகாப்பு, மறைந்த விவரங்களை அறிதல் ஆகியவை முக்கியமாகலாம்.',
 'தந்தை, ஆசிரியர் அல்லது அனுபவமுள்ளவர்களின் வழிகாட்டல்; உயர்கல்வி, நீண்ட பயணம், நூலறிவைச் செயல்படுத்துதல் ஆகியவை முன்னேறலாம்.',
 'தொழிலில் ஏற்றுக் கொள்ளும் கடினமான பணி, பதவி, வாடிக்கையாளர் நம்பிக்கை, சமூக அங்கீகாரம் ஆகியவை முக்கியமாகலாம்.',
 'வருமான வளர்ச்சி, தொழில் தொடர்புகள், நண்பர்களின் ஆதரவு, நீண்டகால இலக்குகள் ஆகியவற்றை ஒழுங்காக அமைக்கலாம்.',
 'கல்வி, வீடு, பயணம், தொழில் ஆகியவற்றிற்கான செலவுகளையும், உறக்கத்தையும், தனிப்பட்ட ஓய்வையும் திட்டமிட வேண்டியிருக்கலாம்.'
];
const EARLY_EN=['Caregivers, sleep rhythm and physical exploration shape early confidence.','Care, nutrition and family security matter here, not personal earnings.','Hand coordination, language sounds and sibling interaction develop.','Motherly support, a calm home and early play matter.','Learning through play, sounds and memory is the relevant expression.','Daily care and nourishment matter, not employment or debt.','Bonding with caregivers shapes cooperation.','Family support helps a child adjust to new settings.','Parents and elders provide early guidance.','Early habits and small age-appropriate tasks matter, not a career.','Family support, play and early social bonds matter.','Sleep, care and family spending dominate this topic.'];
const SCHOOL_EN=['Confidence, exercise and school routines come to the fore.','Family support, language and elementary numeracy grow.','Siblings, peers, writing and skills practice become important.','A calm home and reliable learning setting support progress.','School, memory, arts and analytical subjects provide opportunities.','School competition, activity, nutrition and rest need balance.','Friendships and teamwork require communication.','School changes and unfamiliar routines invite adaptation.','Parents, teachers and educational journeys guide learning.','Tasks, discipline and school recognition matter, not employment.','Friendships, clubs and achievable goals matter.','Study expenses, privacy, screen time and rest need balance.'];
const ADULT_EN=['Decision-making, personal habits and boundaries set the tone.','Family finances, speech, savings and responsibilities matter.','Independent effort, writing, skill and sibling relationships can advance.','Home, mother, property and family time require planning.','Learning, creativity, mentoring and matters relating to children may develop.','Workload, competition, obligations and daily wellbeing need balance.','Marriage or partnerships depend on communication and shared responsibilities.','Reorganisation, unexpected costs and careful records become important.','Mentors, higher study and travel broaden experience.','Career responsibilities, reliability and recognition come into focus.','Income, networks and realistic long-term goals develop.','Travel, study, costs, sleep and private time require balance.'];
const BODY_TA={1:'உடலின் பொதுவான வளர்ச்சி, தலைப்பகுதி மற்றும் சகிப்புத்தன்மை',2:'வாய், பற்கள், பேச்சுறுப்பு மற்றும் உணவு முறை',3:'கைகள், தோள்கள், இயக்கத் திறன்',4:'மார்பு, சுவாச இயக்கம் மற்றும் வீட்டு அமைதியுடன் தொடர்பான ஓய்வு',5:'வயிற்றுப் பகுதி மற்றும் செரிமானப் பழக்கம்',6:'குடல் பகுதி, உணவுமுறை மற்றும் உடல் ஒழுங்கு',7:'இடுப்பு மற்றும் கீழ்வயிற்றுப் பகுதி',8:'கீழ்வயிறு மற்றும் வெளியேற்ற உறுப்புகள்',9:'தொடைகள் மற்றும் நடை இயக்கம்',10:'முழங்கால் மற்றும் கால்களின் இயக்கம்',11:'கெண்டைக்கால் மற்றும் கால்தசைகள்',12:'பாதங்கள் மற்றும் உறக்கம்'};
const BODY_EN={1:'general constitution and head',2:'mouth, teeth, speech and diet',3:'arms and shoulders',4:'chest and breathing comfort',5:'upper abdomen and digestion',6:'intestinal and daily eating routines',7:'pelvic region',8:'lower abdominal region',9:'thighs and walking',10:'knees and movement',11:'lower legs and calves',12:'feet and sleep'};
const GROW_TA={exalted:'உச்ச பலம் பெற்றிருப்பது வளர்ச்சிக்கான ஆதரவை அதிகரிக்கலாம்',own:'சொந்த ராசிப் பலம் தொடர்ந்து முயல்வதற்கு ஆதரவாகும்',friend:'நட்பு ராசி அமைப்பு பலன்களை வெளிப்படுத்த உதவலாம்',neutral:'சமநிலை அமைப்பில் முடிவைச் சேர்க்கைகளும் பார்வைகளும் அதிகமாக மாற்றலாம்',enemy:'பகை ராசியின் சிரமத்தால் நன்மைக்கு கூடுதல் முயற்சி தேவைப்படலாம்',debilitated:'நீச நிலையில் திறனை வெளிப்படுத்தக் கூடுதல் ஆதரவு அல்லது காலம் தேவைப்படலாம்'};
const GROW_EN={exalted:'exaltation supports the theme',own:'own-sign strength provides steadiness',friend:'a friendly sign supports expression',neutral:'aspects and contacts modify this neutral placement',enemy:'an inimical sign may require extra effort',debilitated:'debilitation may call for compensating support'};
const NODE_TA={Rahu:'வழக்கத்திற்கு மாறான முயற்சி, புதிய அறிமுகம் அல்லது கவனத்தைத் திருப்பும் அனுபவங்கள் வரலாம்',Ketu:'ஏற்கெனவே பயன்படாத முறையிலிருந்து விலகி முக்கியமானதைத் தேர்ந்தெடுக்க வேண்டியிருக்கலாம்'};
const NODE_EN={Rahu:'unconventional routes and unfamiliar situations may become prominent',Ketu:'a change in priorities or letting go of an older routine may become relevant'};
const TTRANS_TA={Jupiter:'கல்வி, வழிகாட்டுதல் அல்லது சீரான வளர்ச்சிக்கான ஆதரவு அதிகரிக்கலாம்',Saturn:'தாமதத்தைச் சமாளித்து ஒழுங்கையும் பொறுமையையும் கட்டமைக்க வேண்டியிருக்கலாம்',Rahu:'புதிதாக வரும் வாய்ப்பின் நம்பகத்தன்மையைச் சோதித்துப் பயன்படுத்த வேண்டும்',Ketu:'பலனளிக்காத பழக்கங்களை மாற்றி முன்னுரிமையை மறுசீரமைக்கலாம்'};
const TTRANS_EN={Jupiter:'learning or guidance may support progress',Saturn:'sustained routines may be more valuable than immediate speed',Rahu:'unfamiliar opportunities require checking',Ketu:'reworking priorities can be useful'};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const canonical=k=>K[k]?k:(Object.keys(K).find(key=>K[key]===k)||k);
const label=(k,ta)=>ta?(K[canonical(k)]||k):canonical(k);
const iso=v=>/^\d{4}-\d\d-\d\d$/.test(String(v||''));
function age(birth,date){if(!iso(birth)||!iso(date))return null;const b=new Date(birth+'T00:00:00Z'),d=new Date(date+'T00:00:00Z');if(!Number.isFinite(+b)||!Number.isFinite(+d))return null;let n=d.getUTCFullYear()-b.getUTCFullYear();if((d.getUTCMonth()*100+d.getUTCDate())<(b.getUTCMonth()*100+b.getUTCDate()))n--;return Math.max(0,n);}
const stage=n=>n===null?'adult':n<5?'infant':n<18?'school':'adult';
function focus(n,years,ta){if(stage(years)==='adult')return (ta?HM:HE)[n][0];const young=ta?{2:'குடும்பப் பாதுகாப்பு',5:'சொந்தக் கல்வி',6:'உணவு–உறக்க ஒழுங்கு',7:'அன்பான உறவுகள்',8:'மாறும் சூழலுக்குப் பழகுதல்',10:'பொறுப்புணர்வு',11:'குடும்ப ஆதரவு',12:'ஓய்வு நேரம்'}:{2:'family security',5:'learning',6:'daily routine',7:'caring relationships',8:'adjusting to change',10:'early responsibility',11:'family support',12:'rest'};return young[n]||(ta?HM:HE)[n][0];}
function scene(n,years,ta){let st=stage(years),idx=n-1;return ta?(st==='infant'?EARLY_TA:st==='school'?SCHOOL_TA:ADULT_TA)[idx]:(st==='infant'?EARLY_EN:st==='school'?SCHOOL_EN:ADULT_EN)[idx];}
function periodName(p,ta){return ta?`${label(p.md,true)} தசை – ${label(p.ad,true)} புக்தி`:`${label(p.md,false)} major period – ${label(p.ad,false)} sub-period`;}
function relationText(d,s,n,ta,years){const h=d.houses[n-1],p=d.planets[h.lord],st=s.assess(d,h.lord);if(!p||!st)return '';const loc=p.house,linked=focus(loc,years,ta),base=focus(n,years,ta);const coloc=d.houses[loc-1].occupants.filter(k=>k!==h.lord),looks=h.aspects.filter(k=>k!==h.lord);
 const owners=d.houses.filter(x=>x.lord===h.lord).map(x=>x.no).filter(x=>x!==n);
 if(ta){let str=`${n}-ஆம் பாவத்தின் அதிபதியான ${label(h.lord,true)} ${loc}-ஆம் பாவத்தில் இருப்பதால் ${base} தொடர்பான பலன், ${linked} சம்பந்தப்பட்ட நிகழ்வுகளுடன் இணைகிறது. ${GROW_TA[st.dignity]||GROW_TA.neutral}.`;
 if(owners.length)str+=` அதே கிரகம் ${owners.join(', ')}-ஆம் பாவத்திற்கும் அதிபதி என்பதால் அந்தப் பொறுப்புகளும் இணைந்து செயல்படும்.`;
 if(coloc.length)str+=` ${loc}-ஆம் இடத்தில் ${coloc.map(k=>label(k,true)).join(', ')} உடன் இருக்கும் தொடர்பு காரணமாக அவர்களின் இயற்கைக் காரகத்துவங்களும் சம்பந்தப்பட்ட தசைகளில் வெளிப்படலாம்.`;
 if(looks.length)str+=` இந்தப் பாவத்தை ${looks.map(k=>label(k,true)).join(', ')} பார்ப்பதால் நல்ல வளர்ச்சிக்கும் கூடுதல் பொறுப்புக்கும் இடையிலான அளவு அந்தக் கிரகங்களின் பலத்துக்கேற்ப மாறும்.`;
 if(st.retrograde)str+=` வக்ரம் அதன் செயல்பாட்டைத் தீவிரப்படுத்தலாம்; அதை உச்ச நிலையாகப் பொருள் கொள்ளவில்லை.`;
 return str;
 }
 let str=`Ruler ${label(h.lord,false)} of house ${n} occupies house ${loc}, connecting ${base} with ${linked}. ${GROW_EN[st.dignity]||GROW_EN.neutral}.`;
 if(owners.length)str+=` It also rules house ${owners.join(', ')}.`;
 if(coloc.length)str+=` It shares the house with ${coloc.join(', ')}.`;
 if(looks.length)str+=` Aspects from ${looks.join(', ')} modify the balance of support and responsibility.`;
 if(st.retrograde)str+=' Retrogression can increase prominence; it is not exaltation.';
 return str;
}
function occupantText(d,s,n,ta,yrs){const h=d.houses[n-1],nodes=h.occupants.filter(k=>k==='Rahu'||k==='Ketu'),others=h.occupants.filter(k=>k!=='Rahu'&&k!=='Ketu');if(!h.occupants.length&&!h.aspects.length)return '';
 if(ta){const s1=others.length?`${others.map(k=>label(k,true)).join(', ')} ${n}-ஆம் பாவத்தில் இருப்பதால் ${HM[n][0]}, ${HM[n][1]} போன்றவற்றின் வெளிப்பாடு இந்தக் கிரகங்களின் ஆதிபத்தியத்துடன் இணைகிறது. `:'';
 const s2=nodes.map(k=>`${label(k,true)} இந்தப் பாவத்தில் இருப்பதால் ${NODE_TA[k]}. அதன் ராசியாதிபதி ${label(s.nodes(d,k).signLord,true)} இருக்கும் பாவத்தையும் சேர்த்து வாசிக்க வேண்டும்.`).join(' ');
 return s1+s2;
 }
 return `${others.length?`${others.join(', ')} occupy house ${n}, linking it to the lords they rule. `:''}${nodes.map(k=>`${k} occupies this house; ${NODE_EN[k]}.`).join(' ')}`;
}
function karakaText(d,s,n,ta){const k=({1:'Sun',2:'Jupiter',3:'Mars',4:'Moon',5:'Jupiter',6:'Saturn',7:'Venus',8:'Saturn',9:'Jupiter',10:'Sun',11:'Jupiter',12:'Saturn'})[n],p=d.planets[k],q=s.assess(d,k);const h=d.houses[n-1],lord=d.planets[h.lord];if(!p||!q||!lord)return '';
 if(n===5){const j=d.planets.Jupiter;if(stage(age(d.birthDate,d.referenceDate))!=='adult')return ta?`இந்த வயதில் ஐந்தாம் பாவத்தின் முக்கிய வெளிப்பாடு கல்வி, விளையாட்டின் மூலம் கற்றல், நினைவுத்திறன் மற்றும் படைப்பாற்றல். ஐந்தாம் அதிபதி ${label(h.lord,true)} ${lord.house}-ஆம் இடத்திலும், கல்வி–அறிவு காரகனான குரு ${j.house}-ஆம் இடத்திலும் இருப்பதால் அவற்றின் பலத்தை இணைத்துப் பார்க்க வேண்டும்.`:`At this age house five concerns learning, memory and creativity, not becoming a parent. Its ruler is in house ${lord.house} and Jupiter in house ${j.house}.`;return ta?`குழந்தைகள் தொடர்பான மரபு ஆய்வில் ஐந்தாம் பாவம், அதன் அதிபதி ${label(h.lord,true)} (${lord.house}-ஆம் பாவம்), புத்திர காரகனான குரு (${j.house}-ஆம் பாவம்) ஆகிய மூன்றையும் இணைத்தே வாசிக்கிறோம். இந்த மூன்றில் ஒரு தொடர்புக்கு சனி பார்வை இருப்பதற்காக புத்திர பாக்கியம் முழுமையாக மறுக்கப்படாது; குழந்தையின் பாலினமும் இதிலிருந்து கணிக்கப்படாது. ${stage(age(d.birthDate,d.referenceDate))==='school'?'இளவயதுக்கான பலனில் இது முதலில் சொந்தக் கல்வி மற்றும் படைப்புத்திறனாக வெளிப்படும்.':''}`:`Children are considered through house five, its ruler in house ${lord.house} and Jupiter in house ${j.house}. A Saturn aspect is not a categorical denial, nor a means to identify a child’s sex.`;}
 if(ta)return `${HM[n][0]} குறித்து இயற்கைக் காரகனான ${label(k,true)} ${p.house}-ஆம் பாவத்தில் இருக்கிறார். அதனால் ${HM[p.house][0]} சம்பந்தப்பட்ட உதவியும் சவாலும் இங்கு கலக்கின்றன. ${GROW_TA[q.dignity]||GROW_TA.neutral}.`;
 return `Natural significator ${k} occupies house ${p.house}; this connects the matter to ${HE[p.house][0]}. ${GROW_EN[q.dignity]||GROW_EN.neutral}.`;
}
function bodyText(n,ta,yrs){return ta?`உடல் சார்ந்த பாரம்பரியக் காரகத்தில் ${BODY_TA[n]} இந்தப் பாவத்துடன் தொடர்புடையவை. ${stage(yrs)==='infant'?'இளங்குழந்தைக்கு உடல் வளர்ச்சியிலும் பராமரிப்பிலும் வயதுக்கேற்ற இயல்பான மாற்றங்களுக்கே முன்னுரிமை தர வேண்டும்.':stage(yrs)==='school'?'படிப்பு, விளையாட்டு, உணவு மற்றும் ஓய்வின் ஒழுங்குடன் இந்த உடல் காரகத்துவத்தை இணைத்து வாசிக்கலாம்.':'வேலை, உணவு, உடற்பயிற்சி மற்றும் ஓய்வு ஆகியவற்றின் சமநிலையுடன் இதைப் பொருத்திப் பார்க்கலாம்.'}`:`Traditionally this house corresponds to ${BODY_EN[n]}. At this age the emphasis belongs on ${stage(yrs)==='infant'?'development and care':stage(yrs)==='school'?'school, activity and adequate rest':'routine and wellbeing'}, considered as traditional symbolism.`;}
function coreEffects(d,s,n,ta){const h=d.houses[n-1],out=[];const E=globalThis.SMVD1V301Evidence;for(const k of h.occupants){if(k!=='Rahu'&&k!=='Ketu')continue;const c=s.nodes(d,k);for(const co of c.conjunctions){if(co.degrees===null)continue;out.push(ta?`${label(k,true)} உடன் ${label(co.b,true)} ${co.degrees.toFixed(1)}° தூரத்தில் இருப்பதால் ${co.band==='within-3'?'மிக நெருக்கமான':co.band==='within-8'?'நெருக்கமான':co.band==='within-15'?'குறிப்பிடத்தக்க':'தளர்வான'} கிரகத் தொடர்பு கிடைக்கிறது; அதன் பலன் இரண்டு கிரகங்களின் காரகத்துவத்தையும் ஆதிபத்தியத்தையும் பொறுத்து மாறும்.`:`${k} and ${co.b} are ${co.degrees.toFixed(1)}° apart; closeness modifies the combined traditional reading.`);}}
 if(h.occupants.includes('Moon')&&h.occupants.includes('Jupiter')){const c=s.conjunction(d,'Moon','Jupiter'),p=s.phase(d);if(c.degrees!==null)out.push(ta?`சந்திரன்–குரு இருவரும் ${c.degrees.toFixed(1)}° இடைவெளியில் உள்ளதால் தசைநாதன் சந்திரனின் இயற்கைக் காரகத்துவத்துடன் குருவின் ${d.houses.filter(x=>x.lord==='Jupiter').map(x=>x.no).join(', ')}-ஆம் ஆதிபத்தியங்களும் கலக்கின்றன. ${p?.light<0.5?'சந்திரனின் ஒளிப் பலம் குறைவாக இருப்பதால் நல்ல பலனை மிகைப்படுத்தாமல் சேர்க்கையின் ஆதரவையும் மதிப்பிட வேண்டும்.':'சந்திரனின் ஒளிப்பலமும் இந்தக் கூட்டுறவின் அளவை மாற்றும்.'}`:`Moon–Jupiter separation is ${c.degrees.toFixed(1)}°. Moon phase and Jupiter's lordships modify this conjunction.`);}
 if(h.aspects.includes('Saturn')){const sat=s.assess(d,'Saturn');out.push(ta?`சனி ${d.planets.Saturn.house}-ஆம் இடத்திலிருந்து ${HM[n][0]} சார்ந்த முயற்சிகளைப் பார்க்கிறார். ${sat?.dignity==='own'||sat?.dignity==='exalted'?'சனிக்கு ராசி பலம் இருப்பதால் கட்டுப்பாடு, பொறுமை, நீண்டகால முயற்சி போன்றவை முன்னேற்றத்திற்கு ஆதரவாகவும் அமையலாம்.':'சனியின் பார்வை காரணமாக கூடுதல் பொறுப்பு அல்லது தாமதம் முக்கியமாகலாம்.'} ${sat?.retrograde?'வக்ரநிலை செயல்பாட்டைத் தீவிரப்படுத்தலாம்; உச்சநிலைக்கு இணையானது அல்ல.':''} பாவாதிபதி, இயற்கைக் காரகன் ஆகியோரின் ஆதரவைக் குறைத்துக் கணக்கிடாமல் நல்லதும் சிரமமும் இணைந்தே பலன் உருவாக்கப்படுகிறது.`:`Saturn aspects this house from natal house ${d.planets.Saturn.house}. Its ${sat?.dignity||'mixed'} sign strength and ${sat?.retrograde?'retrograde prominence':'movement'} must be weighed with the lord and natural significator.`);}
 if(h.occupants.includes('Venus')&&h.occupants.includes('Sun')){const cv=s.combust(d,'Venus'),orb=cv.orb;
  if(Number.isFinite(orb))out.push(ta?`சூரியன்–சுக்கிரன் இடைவெளி ${orb.toFixed(1)}°. ${cv.combust?'அஸ்தங்க நெருக்கம் உள்ளதால் சுக்கிரனின் வசதி, கலை, உறவுகள் போன்ற காரகத்துவங்கள் தாமதமாகவோ மாற்றத்துடனோ வெளிப்படலாம்.':'நெருக்கமான அஸ்தங்க வரம்பில் இல்லாததால் சுக்கிரனின் காரகத்துவம் முழுமையாக மறைக்கப்பட்டதாகக் கருதவில்லை.'} ${cv.relief.length?'வர்க்கோத்தமம் அல்லது திக் தொடர்பு போன்ற துணை வலிமைகள் இருப்பதால் அதன் பயனை முழுவதும் குறைத்து விடவில்லை.':''}`:`Sun–Venus distance: ${orb.toFixed(1)}°. ${cv.combust?'Combustion proximity qualifies Venus’s indications; mitigating strengths still matter.':'Venus is outside the configured combustion proximity.'}`);}
 if(h.aspects.includes('Moon')){const phase=s.phase(d);if(phase)out.push(ta?`சந்திரனின் ஏழாம் பார்வை இப்பாவத்திற்குக் கிடைக்கிறது. பிறப்பில் சந்திர ஒளிப்பலம் ${(100*phase.light).toFixed(0)}% என்ற வானியல் ஒளியளவுக்கான தோராயக் குறியீட்டில் உள்ளது; வளர்பிறை–தேய்பிறைப் பலத்தை, சந்திரன் சேர்ந்திருக்கும் கிரகங்களின் ஆதரவுடன் சேர்த்தே இந்தப் பாவத்தின் ${HM[n][0]} பலனில் மதிப்பிட வேண்டும்.`:`Moon aspects this house. Its approximate illumination is ${(100*phase.light).toFixed(0)}%; waxing/waning strength is read together with its natal contacts.`);}
 return out.slice(0,4);
}
function active(d,period,n){const score=period.topics?.find(x=>x.number===n)?.activation??0;const evidence=globalThis.SMVD1V301Evidence?.points?.(d,canonical(period.md),canonical(period.ad));return {score,extra:evidence?.ranked?.find(x=>x.house===n)?.weight??0};}
function selectedPeriods(d,timeline,n){const all=(timeline?.dasha||[]).filter(p=>iso(p.from)&&iso(p.to));if(!all.length)return [];
 const ranked=all.map(p=>({p,...active(d,p,n)})).filter(x=>x.score>=2||x.extra>=1.3).sort((a,b)=>(b.score+b.extra*.35)-(a.score+a.extra*.35)||a.p.from.localeCompare(b.p.from));
 const chosen=[],seen=new Set();for(const {p} of ranked){const key=`${p.md}:${p.ad}`;if(seen.has(key))continue;seen.add(key);chosen.push(p);if(chosen.length>=4)break;}return chosen.sort((a,b)=>a.from.localeCompare(b.from));}
function periodText(d,p,n,ta,birth,first=false){const yr=age(birth,p.from),mdKey=canonical(p.md),adKey=canonical(p.ad),md=d.planets[mdKey],ad=d.planets[adKey],E=globalThis.SMVD1V301Evidence;if(!md||!ad)return '';
 const mstar=E?.starOf?.(d,mdKey)?.lord,astar=E?.starOf?.(d,adKey)?.lord,ml=d.houses.filter(h=>h.lord===mdKey).map(h=>h.no),al=d.houses.filter(h=>h.lord===adKey).map(h=>h.no);
 const pre=ta?`${p.from} முதல் ${p.to} வரை (${yr===null?'':`சுமார் ${yr} வயது; `}${periodName(p,true)})`:`${p.from} to ${p.to} (about age ${yr??'—'}, ${periodName(p,false)})`;
 const ns=first?scene(n,yr,ta):'',isActive=active(d,p,n).score>0,topic=focus(n,yr,ta);
 if(ta)return `${pre}: ${ns} பிறப்பில் ${label(p.md,true)} ${md.house}-ஆம் பாவத்திலும் ${label(p.ad,true)} ${ad.house}-ஆம் பாவத்திலும் இருப்பதால் ${HM[md.house][0]} மற்றும் ${HM[ad.house][0]} தொடர்பான காரணங்கள் ${topic} பலனைத் தூண்டக்கூடும். ${mstar?`${label(p.md,true)}-ன் நட்சத்திர அதிபதி ${label(mstar,true)} (${d.planets[mstar]?.house}-ஆம் வீடு)`+'; ':''}${astar?`${label(p.ad,true)}-ன் நட்சத்திர அதிபதி ${label(astar,true)} (${d.planets[astar]?.house}-ஆம் வீடு) வழியாகவும்`:''} காலத்திற்கேற்ற தொடர்புகள் மாறுகின்றன. ${isActive?'இந்தப் பாவத்துடன் நேரடியான தசைத் தொடர்பு இருப்பதால் இதற்கு முன்னுரிமை உண்டு.':''}`;
 return `${pre}: ${ns} ${p.md} sits in natal house ${md.house} (ruling ${ml.join(',')||'none'}); ${p.ad} in house ${ad.house} (ruling ${al.join(',')||'none'}). Their distinct star rulers and actual period contacts change the emphasis on ${topic}.`;
}
function transitText(timeline,n,ta,birth){const ts=(timeline?.transitYears||[]).flatMap(y=>(y.notes||[]).filter(t=>t.focus===n&&['Jupiter','Saturn','Rahu','Ketu'].includes(t.planet)).map(t=>({y,t})));const out=[],seen=new Set();for(const {y,t} of ts){const sign=t.planet+':'+y.from.slice(0,4);if(seen.has(sign))continue;seen.add(sign);const yrs=age(birth,y.from);const intro=focus(n,yrs,ta);out.push(ta?`${y.from} முதல் ${y.to} வரையிலான கணிக்கப்பட்ட கோச்சாரக் காலத்தில் ${label(t.planet,true)} ${n}-ஆம் பாவத்தின் ${HM[n][0]} தொடர்பை இயக்குகிறார். இந்த வயதில் ${intro} குறித்து ${TTRANS_TA[t.planet]}. இந்தக் குறிப்பிட்ட காலம் முழுவதும் ஒரே பலம் நீடிக்கும் என்று பொருள் அல்ல.`:`For calculated transit interval ${y.from}–${y.to}, ${t.planet} connects with ${HE[n][0]}. At this age ${intro}: ${TTRANS_EN[t.planet]}.`);if(out.length>=2)break;}return out;}
function birthOf(chart,timeline){const src=chart?.chart||chart;return timeline?.birth||src?.birthDate||src?.birth?.date||null;}
function build(chart,lang='ta',context={},timeline=null){const rdr=globalThis.SMVLifePredictionD1,s=globalThis.SMVD1StrengthV303;if(!rdr?.toD1||!s?.assess||!s?.nodes)throw Error('V306 requires D1 reader and strength');const d=rdr.toD1(chart),ta=lang!=='en',birth=birthOf(chart,timeline),ref=timeline?.referenceDate||new Date().toISOString().slice(0,10),yrs=age(birth,ref);d.birthDate=birth;d.referenceDate=ref;
 const topics=[];for(let n=1;n<=12;n++){const parts=[];parts.push(scene(n,yrs,ta));parts.push(relationText(d,s,n,ta,yrs));const occ=occupantText(d,s,n,ta,yrs);if(occ)parts.push(occ);parts.push(karakaText(d,s,n,ta));parts.push(...coreEffects(d,s,n,ta));parts.push(bodyText(n,ta,yrs));if(timeline){for(const [ix,p] of selectedPeriods(d,timeline,n).entries()){const x=periodText(d,p,n,ta,birth,ix===0);if(x)parts.push(x);}parts.push(...transitText(timeline,n,ta,birth));}topics.push({number:n,title:(ta?TA:EN)[n],paragraphs:parts.filter(Boolean)});}
 const complete=!!(timeline&&timeline.meta?.forecastHorizonYears===15&&timeline.meta?.fromReportDate===timeline.referenceDate&&timeline.meta?.throughDate===timeline.end&&Array.isArray(timeline.dasha)&&timeline.dasha.length>0&&Array.isArray(timeline.transitYears)&&timeline.transitYears.length>0&&Number(timeline.meta?.samplesChecked)>0);
 return {topics,lang:ta?'ta':'en',birth,ageAtReport:yrs,timeline:timeline?{from:timeline.referenceDate,to:timeline.end,years:15,complete}:null};}
function html(report){const ta=report.lang!=='en';const interval=report.timeline?`${report.timeline.from} – ${report.timeline.to}`:(ta?'பிறப்பு ஜாதக அமைப்பு':'Natal chart');return `<section class="smv-d1-life-reading smv-v303-integrated smv-v306-source-anchored" data-smv-d1-life="1" data-smv-integrated="12" data-smv-15-year-ready="${report.timeline?.complete?'1':'0'}" lang="${report.lang}"><h2>${ta?'முழு வாழ்க்கைப் பலன்கள்':'Complete Life Predictions'}</h2><p class="smv-v303-intro">${ta?'கணிக்கப்பட்ட பிறப்புக் கிரகநிலைகள், பாவாதிபதி, காரகன், பார்வை, நட்சத்திரத் தொடர்பு, வயது, தசை–புக்தி மற்றும் கோச்சாரத்தின் அடிப்படையில் 12 வாழ்க்கைத் தலைப்புகள்.':'Twelve chart-specific life matters combining real natal evidence, age, calculated periods and transits.'} ${safe(interval)}.</p>${report.topics.map(t=>`<section class="smv-d1-life-topic smv-v303-house" data-d1-topic="${t.number}"><h3>${t.number}. ${safe(t.title)}</h3>${t.paragraphs.map(p=>`<p class="smv-d1-life-paragraph">${safe(p)}</p>`).join('')}</section>`).join('')}</section><p class="smv-v306-medical-note">${ta?'உடல் உறுப்புக் குறிப்புகள் பாரம்பரிய ஜோதிடத்தின் விளக்கங்களே; மருத்துவ நோயறிதல் அல்ல.':'Body associations are traditional symbolism, not clinical diagnoses.'}</p></section>`;}
return Object.freeze({build,html,age,version:'306-natal-only-age-sensitive-integrated-12'});
});

;
