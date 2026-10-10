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
 const lordFact=ta?`${focus}-ஆம் பாவத்தின் அதிபதி ${p} ${sign} ராசியில் ${a.ownerPosition}-ஆம் பாவத்தில் ${strength} நிலையில் உள்ளார். இவர் ${owners} பாவங்களுக்கும் அதிபதி.`:`House ${focus} ruler ${p} occupies ${sign}, house ${a.ownerPosition}, with ${strength} dignity and rules houses ${owners}.`;
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
