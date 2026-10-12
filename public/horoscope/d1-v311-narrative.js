/* V311 corrected: a resolved chart decision is input; prose is output only.
 * No placeholder paragraphs, invented event dates or generic annual filler.
 * Each sentence is grounded in a supplied D1/D9/dasha/transit property.
 */
(function(root,factory){'use strict';const api=factory(root);root.SMVD311Narrative=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(g){'use strict';
const J=()=>g.SMVD311Judgement;
const AREA_TA=['தனிப்பட்ட முடிவுகள்','பணம் மற்றும் குடும்பப் பேச்சு','முயற்சியும் உடன்பிறப்புகளும்','வீடும் தாய்வழிப் பொறுப்பும்','கல்வியும் படைப்பாற்றலும்','சேவையும் பணிப் போட்டியும்','திருமணமும் கூட்டு உடன்பாடும்','கூட்டுச் சொத்தும் எதிர்பாராத மாற்றமும்','பாக்கியமும் பெரியோர் வழிகாட்டலும்','தொழிலும் பொதுப் பொறுப்பும்','வருமானமும் நட்பும்','செலவுகளும் ஓய்வும்'];
const AREA_EN=['independent choices','money and family communication','initiative and siblings','housing and family support','education and creative efforts','service and competition','marriage and partnership','shared assets and change','mentoring and long-distance plans','career and public duties','earnings and networks','expenses and recovery'];
/* Destination = concrete channel. Not a second prediction, but a link from
 * house lord's actual natal occupancy to the selected life issue. */
const CHANNEL_TA=[
 'தன் முடிவுகளையும் உடல் உழைப்பையும் நம்பியே இதற்கான நடவடிக்கை ஆரம்பிக்கும்',
 'கையில் இருக்கும் பணம், குடும்பத்தினருடன் நடக்கும் உரையாடல் ஆகியவை முக்கியமாகின்றன',
 'பயிற்சியும் தொடர் முயற்சியும், உடன்பிறந்தோருடனான தொடர்பும் இடையில் வருகின்றன',
 'வீட்டு வசதி அல்லது பெற்றோரின் தேவையை ஒதுக்கிவிட்டு முடிவெடுக்க இயலாது',
 'கல்வி, குழந்தைகள், படைப்புத்திறன் தொடர்பான தேர்வுகள் வழி திறக்கின்றன',
 'பணிச்சுமை, போட்டி அல்லது கடனைச் சமாளிக்கும் விதமே முன்னேற்றத்தின் வேகத்தை நிர்ணயிக்கும்',
 'துணைவர் அல்லது கூட்டாளியின் ஒப்புதல், தெளிவான பொறுப்புப் பங்கீடு தேவைப்படும்',
 'கூட்டுப் பணம், மறுசீரமைப்பு அல்லது எதிர்பாராத செலவு கணக்கில் எடுத்துக்கொள்ளப்படும்',
 'ஆசிரியர் அல்லது மூத்தவரின் வழிகாட்டலும் தொலைதூரத் தொடர்பும் முடிவை மாற்றுகின்றன',
 'வேலையின் தன்மை, பதவி அல்லது நிர்வாகப் பொறுப்பு வழியாக இது வெளிப்படும்',
 'நண்பர் வட்டம், வாடிக்கையாளர் தொடர்பு அல்லது கிடைக்கும் ஆதாயம் இதற்குத் துணையாகும்',
 'வெளியூர், தனிமையான உழைப்பு, ஓய்வு அல்லது கூடுதல் செலவின் வழியாக இதன் தாக்கம் தெரியும்'
];
// House-specific implications of a ruler governing more than one life domain.
// The underlying co-lordship is verified in the judgement object.
const CROSS_TA={
 1:'சொந்த முடிவுகளிலும் உடலுழைப்பிலும் அதன் விளைவு தெரியலாம்',
 2:'குடும்ப வரவும் சேமிப்புக்கான முடிவுகளும் அதோடு இணையும்',
 3:'உடன்பிறந்தோர் தொடர்பு, பயிற்சி அல்லது சொந்த முயற்சி அதன் வழியாக வெளிப்படும்',
 4:'வீட்டுப் பொறுப்பு, பெற்றோர் தேவைகள் மற்றும் வசிப்பிட ஏற்பாட்டிலும் அது பிரதிபலிக்கும்',
 5:'கல்வி, குழந்தைகள் அல்லது படைப்புப் பயிற்சிக்கான நேர ஒதுக்கீட்டிலும் அதன் பங்கு இருக்கும்',
 6:'வேலைப்பளு, போட்டி அல்லது கடன் ஒழுங்கைச் சீர்படுத்தும் தேவையும் அதோடு வரும்',
 7:'துணைவர் அல்லது தொழில் கூட்டாளியுடன் பொறுப்பைப் பகிர்வதிலும் அதன் விளைவு தெரியும்',
 8:'கூட்டுச் சொத்து, ஆவணம் அல்லது எதிர்பாராத செலவு சார்ந்த முடிவிலும் அதன் பங்கு இருக்கும்',
 9:'மேற்படிப்பு, பெரியோர் ஆலோசனை அல்லது தொலைதூர முயற்சிக்கு அது வழிகாட்டலாம்',
 10:'தொழில் முடிவு, பதவி மற்றும் பணிப் பொறுப்பில் அது தெளிவாக வெளிப்படும்',
 11:'நண்பர், வாடிக்கையாளர் தொடர்பு அல்லது வருமான வாய்ப்புக்கும் அது பரவக்கூடும்',
 12:'தூரத்திலுள்ள கடமை, செலவு மற்றும் ஓய்வுக்கான நேரத்திலும் அது தாக்கம் செலுத்தலாம்'
};
/* Distinct observed-life translations for natal condition versus MD/AD versus
 * sampled transit. A single house judgement must not be pasted three times. */
const PERIOD_TA=[
 ['தன் முடிவை நடைமுறையாக்கும் பொறுப்பு உயரலாம்','முடிவு எடுப்பதற்கு முன் பிறர் கோரிக்கைகளைச் சீர்செய்ய நேரலாம்','சொந்த திட்டமும் குடும்பத் தேவையும் ஒரே நேரத்தில் கவனம் பெறலாம்'],
 ['வருமானத்தைச் சேமிப்பாக ஒதுக்கும் முடிவுகள் முன்னேறலாம்','குடும்பச் செலவும் முன் ஒப்புக்கொண்ட தொகையும் சேமிப்பில் அழுத்தம் தரலாம்','பேச்சு மற்றும் செலவுப் பொறுப்புகளைச் சரிபார்க்க வேண்டியிருக்கும்'],
 ['ஒரு திறனைத் தொடர்ந்து பயன்படுத்தும் வாய்ப்பு கிடைக்கலாம்','செய்யத் தொடங்கிய வேலையின் முறையை மாற்ற நேரலாம்','பயிற்சி மற்றும் உடன்பிறப்புகளுக்கான நேரத்தைப் பகிர நேரலாம்'],
 ['வீடு அல்லது குடும்பப் பராமரிப்பிற்கான ஏற்பாடு வளரலாம்','வீட்டுச் செலவோ பெற்றோர் தேவையோ திட்டத்தைத் தாமதப்படுத்தலாம்','வசிப்பிட முடிவு மற்றும் அன்றாட பொறுப்புகளை இணைக்க நேரலாம்'],
 ['கற்றல் அல்லது படைப்புப் பயிற்சியில் முன்னேற்றம் அமையலாம்','படிப்பில் இடைவெளி ஏற்பட்டால் பழைய திட்டத்தைத் திருத்த நேரலாம்','கல்வியும் குழந்தைகள் சார்ந்த கடமையும் சமநிலைப்படுத்தப்படலாம்'],
 ['பணிச்சிக்கலைத் தீர்க்கும் திறன் மதிக்கப்படலாம்','போட்டியும் வேலைப்பளுவும் அன்றாட ஒழுங்கை மாற்றலாம்','உழைப்பிற்கும் ஓய்விற்கும் தனித்த எல்லை அமைக்க வேண்டியிருக்கும்'],
 ['கூட்டாளியுடன் உடன்பாட்டை உறுதிசெய்ய வாய்ப்பு அமையலாம்','கருத்து வேறுபாடு ஏற்பட்டு பொறுப்பைப் புதிதாகப் பகிர நேரலாம்','உறவில் நேரம், செலவு, கடமையைத் தெளிவாக்க வேண்டியிருக்கும்'],
 ['பழைய ஆவணங்களையும் பகிர்ந்த சொத்தையும் சீர்செய்ய வாய்ப்பு கிடைக்கலாம்','மறுசீரமைப்பு அல்லது கூடுதல் பொறுப்பு காரணமாகத் திட்டம் மாறலாம்','பாதுகாப்புக்கும் புதிய முயற்சிக்கும் இடையில் முடிவு செய்ய நேரலாம்'],
 ['கற்றவரின் ஆலோசனை நடைமுறை வாய்ப்பாக மாறலாம்','மேற்படிப்பு அல்லது தூர முயற்சிக்கான காலத் திட்டம் மாறலாம்','ஆலோசனையைச் சொந்த அனுபவத்துடன் ஒப்பிட வேண்டியிருக்கும்'],
 ['பணியில் செய்த பங்களிப்புக்குப் பொறுப்பும் அங்கீகாரமும் கூடலாம்','வேலைப் பாதை அல்லது பொறுப்பில் மாற்றம் அவசியமாகலாம்','வேலையின் அளவும் அதன் பலனும் ஒப்பிட்டுப் பார்க்கப்படும்'],
 ['தொடர்புகளின் மூலம் ஆதாய வாய்ப்புகள் உருவாகலாம்','எதிர்பார்த்த பண வரவு தாமதமாகலாம்','முடிவடைந்த வரவுக்கும் உறுதிப்படாத வரவுக்கும் வேறுபாடு தேவைப்படும்'],
 ['செலவு திட்டமிட்டதாகவும் ஓய்வு ஒழுங்கானதாகவும் மாறலாம்','வெளியூர் அல்லது குடும்பத் தேவையால் புதிய செலவுகள் சேரலாம்','தூரக் கடமைகளும் உறக்க நேரமும் மறுசீரமைக்கப்படலாம்']
];
const PERIOD_EN=[
 ['personal initiative may carry greater responsibility','other people’s expectations may delay a personal choice','personal aims and family needs may need balancing'],
 ['a regular saving decision may become possible','household commitments may press against available savings','cash flow and spending promises may require review'],
 ['practical skills may find repeated use','an initiative may need restructuring','practice and sibling obligations may compete for time'],
 ['a home arrangement may become easier to sustain','care and housing costs may defer a planned move','home arrangements may need adjusting to daily duties'],
 ['education or creative practice may advance','a study plan may have to change after disruption','learning and younger-family responsibilities may need balancing'],
 ['difficult duties may build professional trust','competition may force a change in working routines','work and recovery may require firmer boundaries'],
 ['a shared agreement may become more stable','a partner may request a different distribution of responsibilities','terms of time and spending may need clarification'],
 ['joint records and long-standing agreements may be improved','unexpected restructuring may change agreed priorities','security and change may need balancing'],
 ['mentorship may support an important choice','travel or advanced study could be delayed','advice may have to be reconciled with personal experience'],
 ['sustained work may bring responsibility and recognition','a role or working practice could require revision','workload may need to be compared with its actual reward'],
 ['useful networks may open an income route','an expected payment may arrive later','received income should be distinguished from projections'],
 ['planned expenses may leave more room for rest','distance and care obligations may increase costs','private time and long-distance demands may need readjusting']
];
function classicSentence(c,d,ta,seen){
 // Only a demonstrated relationship may add a classical-style inference.
 // Mention the two actual planets and the current life topic, not a yoga label
 // that the simple association cannot conclusively establish.
 const rules=d.classical||[],first=(keys)=>keys.map(k=>rules.find(r=>r.key===k)).find(Boolean);
 const r=first(['PARIVARTANA','DHANA_2_11_LINK','GURU_COUNTER_ASPECT','KENDRA_TRIKONA_LINK','DUSTHANA_LORD_LINK']);
 if(!r||seen?.has(r.key))return [];
 if(seen)seen.add(r.key);
 const names=r.planets.map(k=>actor(k,ta)).join(ta?'–':' and ');
 const subject=ta?`இந்த ${c.house}-ஆம் பாவத்தின் ${c.topicTA[0]} விஷயத்தில்`:`For house ${c.house} (${c.topicEN[0]})`;
 const note={
 PARIVARTANA:[`${names} இடையே உண்மையான அதிபதி–பாவ இடமாற்றம் இருப்பதால், இரு துறைகளின் பரஸ்பர பொறுப்பை ஒப்பிட்டு முடிவெடுக்க வேண்டும்.`,`${names} mutually exchange house rulership positions. Both connected life areas need to be considered together.`],
 DHANA_2_11_LINK:[`${names} அதிபதிகளின் நேரடித் தொடர்பு வருமானம் கிடைப்பதற்கும் அதைச் சேமிப்பதற்கும் உள்ள வேறுபாட்டைக் காட்டுகிறது.`,`${names} link income sources to savings decisions, rather than proving wealth.`],
 GURU_COUNTER_ASPECT:[`குருவின் பார்வையுடன் கட்டுப்படுத்தும் பார்வையும் சேர்ந்திருப்பதால் சாதக–பாதகக் காரணங்களைத் தனித்தனியாக அளவிட வேண்டியுள்ளது.`,`A Jupiter aspect coincides with a restrictive aspect; neither automatically cancels the other.`],
 KENDRA_TRIKONA_LINK:[`${names} அதிபதிகள் இணைந்திருப்பது வாய்ப்பு உருவாகும் தொடர்பாகும்; இந்தத் தொடர்பை மட்டும் முழு ராஜயோகம் என நிர்ணயிக்கவில்லை.`,`The observed connection between ${names}, angular and trinal rulers, is supportive, not proof of an unqualified royal yoga.`],
 DUSTHANA_LORD_LINK:[`ஆறு/எட்டு/பன்னிரண்டு இடங்களில் அதிபதித் தொடர்பு இருப்பினும், தனியே விபரீத ராஜயோகம் என உறுதிப்படுத்த முடியாது.`,`The difficult-house ruler's placement does not, by itself, confirm Viparita Raja Yoga.`]
 }[r.key];
 if(!note)return [];
 return [ta?`${subject}, ${note[0]}`:`${subject}, ${note[1]}`];
}
function divisionSentence(c,d,ta){const div=d.divisionEvidence||[],lord=div.find(v=>v.planet===c.lord),karaka=div.find(v=>v.planet!==c.lord);if(!lord&&!karaka)return '';
 const label=(x)=>`${x.division} ${actor(x.planet,ta)}`;
 if(lord&&karaka&&lord.dignity!==karaka.dignity&&lord.dignity!=='neutral'&&karaka.dignity!=='neutral')return ta?`${label(lord)} வலிமை ${lord.dignity==='strong'?'உயர்ந்தாலும்':'குறைந்தாலும்'}, ${label(karaka)} அதற்கு மாறான நிலை கொண்டிருப்பதால், இத்துறையில் ஒரே பக்கத் தீர்ப்பு வழங்கப்படவில்லை.`:`${label(lord)} and ${label(karaka)} have opposing dignities; the division does not justify a one-sided conclusion.`;
 return div.filter(x=>x.dignity!=='neutral').map(x=>ta?`${label(x)} ${x.reason==='own'?'சொந்த ராசியில்':x.reason==='exalted'?'உச்ச ராசியில்':'நீச ராசியில்'} இருப்பது பிறப்புப் பாவத்தின் மதிப்பீட்டிற்குத் துணை ஆதாரம்; தனியாக நிகழ்வு உறுதி அல்ல.`:`${label(x)} is ${x.reason} in the supplied divisional chart, providing secondary context rather than an event guarantee.`).join(' ');
}
function actor(k,ta){return ta?(J().NTA[k]||k):k;}
/* A result is selected by Judgement.decide() BEFORE any text is rendered.
 * Natural language here is deterministic. No random template choice, no
 * fabricated dates, no vacant phrases presented as chart evidence.
 */
function evidenceName(v,ta){return actor(v.planet,ta);}
function relationTA(v,c){const n=evidenceName(v,true);
 return v.relation==='lord'?`${n} ${c.house}-ஆம் பாவத்திற்கு அதிபதியாக இருப்பது`:
 v.relation==='occupies'?`${n} இந்தப் பாவத்தில் அமர்ந்திருப்பது`:
 v.relation==='aspects'?`${n} இந்தப் பாவத்தைப் பார்ப்பது`:`${n} காரகத் தொடர்பு பெறுவது`;
}
function relationEN(v,c){const n=v.planet;
 return v.relation==='lord'?`${n} rules the ${c.house} house`:
 v.relation==='occupies'?`${n} occupies this house`:
 v.relation==='aspects'?`${n} aspects this house`:`${n} is a relevant significator`;
}
function roleOf(p,c,ta){const owner=(p===c.lord),occ=c.houseOccupants.includes(p),asp=c.houseAspects.includes(p);
 if(ta)return owner?'அதிபதித் தொடர்பு':occ?'நேரடி இருப்பிடம்':asp?'பார்வைத் தொடர்பு':'தொடர்புடைய பிறப்பு நிலை';
 return owner?'rulership':occ?'occupation':asp?'aspect':'natal association';}
function natal(c,lang,seenClassical){const ta=lang!=='en',d=J().decide(c);if(!d)return [];
 const primary=ta?d.leadTA:d.leadEN,link=ta?d.linkTA:d.linkEN,lord=actor(d.lord,ta);
 const ownership=ta?`${c.house}-ஆம் பாவத்தை ஆளும் ${lord}, பிறப்பில் ${c.location}-ஆம் பாவத்தில் அமர்ந்திருக்கிறார்.`:
  `${lord} rules house ${c.house} and occupies natal house ${c.location}.`;
 const scene=ta?`${d.completedTA} ${ownership}`:
  `The central theme is ${primary}. ${ownership} It is therefore linked with ${link}.`;
 const other=d.otherLordships.filter(x=>x!==c.house);
 const cross=other.length?(ta?`${lord} ${other.map(x=>x+'-ஆம்').join(', ')} பாவத்திற்கும் அதிபதியாக இருப்பதால், ${other.map(x=>CROSS_TA[x]).filter(Boolean).join('; ')}.`:
  `The same ruler also governs ${other.map(x=>AREA_EN[x-1]).join(' and ')}, so these life themes are connected.`):'';
 const pos=d.positive.find(x=>x.delta>=.16),neg=d.negative.find(x=>x.delta<=-.16);
 let balance='';
 if(pos&&neg)balance=ta?`${relationTA(pos,c)} சாதகமாக உள்ளது; அதே நேரத்தில் ${relationTA(neg,c)} காரணமாக இம்முயற்சி தடையின்றி நிறைவேறும் என்று சொல்ல இயலாது.`:
 `${relationEN(pos,c)} provides supporting evidence, while ${relationEN(neg,c)} provides an opposing factor. Neither one alone establishes a certain outcome.`;
 else if(neg)balance=ta?`${relationTA(neg,c)} இந்த முயற்சியில் தாமதம் அல்லது கூடுதல் பொறுப்பைக் காட்டுகிறது. அதைக் குறைக்கும் தனி சாதகத் தொடர்பு கணிக்கப்பட்ட இந்தப் பாவ விவரங்களில் இல்லை.`:
 `${relationEN(neg,c)} is a restrictive indicator, so this theme may involve delay or revision. There is no separate counter-indicator in the available inputs.`;
 else if(pos)balance=ta?`${relationTA(pos,c)} இவ்விஷயத்தில் சாதகமாக இருக்கிறது; குறிப்பாக ${link} தொடர்புடைய வாழ்க்கைச் சூழல் அதன் பயனை வெளிப்படுத்தக்கூடும்.`:
 `${relationEN(pos,c)} reinforces the reading through ${link}; it does not establish that an event has already occurred.`;
 const division=divisionSentence(c,d,ta);const ruleText=classicSentence(c,d,ta,seenClassical).join(' ');
 return [scene,[cross,balance,division,ruleText].filter(Boolean).join(' ')].filter(Boolean);
}
function period(win,c,lang){const ta=lang!=='en',p=win.period,d=J().decide(c);if(!p||!p.md||!p.ad||!d)return '';
 if((win.links||[]).length===0 || win.weight<2.4)return ''; // no weak fallback prediction
 const age=p.age,child=age!==null&&age<18;
 const theme=child?(ta?({7:'நண்பர்களுடன் பழகும் முறையில் பொறுப்பு உருவாவது',10:'பள்ளி மற்றும் பயிற்சியில் ஒப்படைக்கப்படும் பொறுப்பை முடிப்பது',11:'குழுவாகக் கற்கவும் செயல்படவும் வாய்ப்பு உருவாவது'})[c.house]||d.leadTA:
 ({7:'learning cooperation with peers',10:'finishing assigned study and training',11:'group learning and peer support'})[c.house]||d.leadEN):ta?d.leadTA:d.leadEN;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),pd=p.pd?actor(p.pd,ta):null;
 const direct=[p.md,p.ad,p.pd].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).filter(k=>k===c.lord||c.houseOccupants.includes(k)||c.houseAspects.includes(k));
 const ties=direct.map(k=>`${actor(k,ta)} (${roleOf(k,c,ta)})`).join(', ');
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const isSenior=age!==null&&age>=65;
 const effect=(isSenior&&c.house===10)?(ta?'பணி அனுபவத்தைப் பகிர்வதும் பொறுப்பை மறுஒதுக்குவதும் முன்னிலைப்படலாம்':'mentoring and reassessing work commitments may take priority'):
  (child&&[7,10,11].includes(c.house))?(ta?({7:'நண்பர்கள் மற்றும் ஆசிரியர்களுடன் பொறுப்பைப் பகிர்ந்துகொள்ளும் பழக்கம் வளரலாம்',10:'பள்ளிப் பயிற்சியில் ஒப்படைக்கப்பட்ட பணியை முடிக்கும் திறன் வளரலாம்',11:'குழுக் கற்றலிலும் நண்பர்கள் உறவிலும் புதிய அனுபவம் பெறலாம்'})[c.house]:({7:'cooperation with classmates and teachers may improve',10:'completing study commitments may become easier',11:'group learning and peer skills may develop'})[c.house]):(ta?PERIOD_TA:PERIOD_EN)[c.house-1][stage];
 const started=ta?`${p.from} முதல் ${p.to} வரையிலான ${md}–${ad} காலத்தில் ${effect}`:
  `During ${p.from}–${p.to} (${md}/${ad}), ${effect}.`;
 const why=ta?`இதற்கான பிறப்புத் தொடர்பு: ${ties||'கால அதிபதிகளின் நேரடித் தொடர்பு'}; ${c.house}-ஆம் பாவாதிபதி ${actor(c.lord,true)} ${c.location}-ஆம் பாவத்தில் இருப்பதும் முடிவை மாற்றுகிறது${pd?'; '+pd+' அந்தரத் தரவும் வழங்கப்பட்டுள்ளது':''}.`:
  `The ${md} major period and ${ad} sub-period${pd?' / '+pd+' sub-sub-period':''} have natal links with this house: ${ties||'computed natal links'}.`;
 const overlap=win.transit?(ta?`${actor(win.transit.planet,true)} பெயர்ச்சியின் ${win.transit.observedOn} மாதிரிக் கணிப்பும் இந்தப் புக்தியுடன் தொடர்பு பெறுகிறது.`:
  `The ${win.transit.planet} transit sampled on ${win.transit.observedOn} also falls within this sub-period.`):'';
 return [started,why,overlap].filter(Boolean).join(' ');
}
function year(group,lang){if(!group||group.kind==='insufficient'||!group.claim||!group.period||!group.transit)return '';
 const ta=lang!=='en',c=group.claim,d=J().decide(c);if(!d)return '';
 const p=group.period,age=group.age,child=age!==null&&age<18;
 const subject=child?(ta?({5:'பாடங்களில் ஆழ்ந்து திறனை மேம்படுத்துதல்',7:'நண்பர்களுடன் இணைந்து செயல்படுதல்',10:'பள்ளிப் பொறுப்பை முடித்தல்',11:'குழுவினருடன் பயிற்சி பெறுதல்'})[c.house]||d.leadTA:
  ({5:'developing a learning skill',7:'working with peers',10:'carrying out school responsibilities',11:'learning with peers'})[c.house]||d.leadEN):ta?d.leadTA:d.leadEN;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),planet=actor(group.transit.planet,ta);
 const matches=[p.md,p.ad].filter((k,i,a)=>a.indexOf(k)===i).filter(k=>k===c.lord||c.houseOccupants.includes(k)||c.houseAspects.includes(k));
 const link=ta?'':`The natal ruler of house ${c.house} occupies house ${c.location}.`;
 const fact=ta?`${md} தசை–${ad} புக்தியில் ${matches.map(x=>actor(x,true)).join(' மற்றும் ')||actor(c.lord,true)} இந்தப் பாவத்துடன் பிறப்புத் தொடர்பில் உள்ளது. ${planet} பெயர்ச்சியின் ${group.transit.observedOn} கணிக்கப்பட்ட நிலையுடன் இவை இணைகின்றன.`:
  `In the ${md}/${ad} sub-period, ${matches.join(' and ')||c.lord} has a natal link to this area; the sampled ${planet} transit falls on ${group.transit.observedOn}.`;
 const continuity=group.recurrences?.length?(ta?`அதே கருப்பொருளுடன் தொடர்புடைய பிற கணிக்கப்பட்ட காலங்கள்: ${group.recurrences.map(x=>x.from+'–'+x.to).join('; ')}.`:
  `Other sampled windows for the same theme: ${group.recurrences.map(x=>x.from+'–'+x.to).join('; ')}.`):'';
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const effect=(child&&[7,10,11].includes(c.house))?subject:(ta?PERIOD_TA:PERIOD_EN)[c.house-1][stage];
 return (ta?`${group.from} – ${group.to}: ${effect}. ${fact}`:
  `${group.from} – ${group.to}: ${effect}. ${link} ${fact}`)+(continuity?' '+continuity:'');
}
function summary(s,lang){if(!s?.main)return [];
 const ta=lang!=='en',main=J().decide(s.main),counter=J().decide(s.counter);if(!main)return [];
 const first=ta?`ஜாதகத்தில் முன்னிலைப்படும் வாழ்க்கைத் துறையில் ${main.completedTA} ${actor(main.lord,true)} ${main.house}-ஆம் பாவத்தை ஆண்டு, ${main.location}-ஆம் இடத்தில் அமர்ந்திருப்பதால் ${main.linkTA} தொடர்பான முடிவுகளும் உடன் வருகின்றன.`:
  `The chart's leading life theme is ${main.leadEN}. ${main.lord}, ruling house ${main.house}, occupies house ${main.location} and links it with ${main.linkEN}.`;
 const other=counter&&counter.house!==main.house?(ta?`${AREA_TA[counter.house-1]} சார்ந்த விஷயத்தில் ${counter.completedTA} இதற்கு ${actor(counter.lord,true)} ${counter.location}-ஆம் பாவத்தில் இருக்கும் அமைப்பும் தொடர்புடையதாகும்.`:
  `Another indicator concerns ${counter.leadEN} in ${AREA_EN[counter.house-1]}; the two areas have different evidence.`):'';
 return [first,other].filter(Boolean);
}
return Object.freeze({natal,period,year,summary});
});
