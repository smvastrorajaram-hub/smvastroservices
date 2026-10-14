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
/* Inter-domain outcomes: require observed lord-placement and/or distinct ownership.
 * BVR How to Judge I PDF pp.30-31 and The Art and Science II pp.225-226:
 * a house lord carries the meanings of BOTH houses; dignity, occupants,
 * contradictory varga evidence all qualify the outcome. Not literal aphorisms. */
function domainConsequences(c,ta){
 const owned=(c.otherLordships||[]),n=c.house,h=c.location,k=actor(c.lord,ta);
 const dual=owned[0]||null,neg=c.negative?.[0],pos=c.positive?.[0];
 const actual=ta?`${k} ${n}-ஆம் பாவத்தின் அதிபதியாகி ${h}-ஆம் பாவத்தில் இருப்பதால்`:
 `${k}, lord of house ${n}, occupies house ${h};`;
 const cross=(n===10&&h===2)?(owned.includes(11)?
 ['தொழிலில் ஏற்கும் கூடுதல் வேலை குடும்பத்திற்குக் கிடைக்கும் வருவாயுடன் இணைகிறது; வருமானம் பெறுதல், சேமிக்க முடிதல் இரண்டும் ஒன்றல்ல.',
 'Additional career work may affect household income, but actual receipts and accumulated savings require separate assessment.']:
 owned.includes(9)?['தொழில் வருவாயை உயர்த்த ஆசிரியர் ஆலோசனை, உயர்கல்வி அல்லது பயிற்சி முக்கிய பங்கு பெறலாம்; அதற்கான செலவு மற்றும் குடும்பத் தேவை சமநிலையில் இருக்க வேண்டும்.',
 'Mentorship and learning may shape career income; training costs and family obligations need a separate decision.']:null):
 n===7&&[8,12].includes(h)?['உறவில் இணையும் செலவு, தனிநேரம் அல்லது பகிர்ந்த ஆவணங்கள் பற்றிய தெளிவு இல்லாவிட்டால் ஒப்பந்தம் நீளலாம்; இதை திருமணத் தடையாக மட்டும் முடிவு செய்ய முடியாது.',
 'Shared spending, time away or records may need negotiation; this alone does not prove a marriage delay.']:
 n===5&&h===8?['கல்வித் திட்டம் அல்லது குழந்தைகள் தொடர்பான பொறுப்பு மாற்றமடையும் போது உடனடி முடிவைக் காட்டிலும் ஆவணம், பயிற்சி மற்றும் குடும்ப ஆதரவைச் சரிபார்க்க வேண்டியிருக்கும்.',
 'Study or child-related responsibilities may be reorganized; training, documentation and support matter before a definite conclusion.']:
 n===4&&[7,10,12].includes(h)?['வீடு குறித்த முடிவில் தொழிலின் நேரம், கூட்டு உடன்பாடு அல்லது வெளியூர் வசிப்பு சேர்ந்திருக்கும்; சொத்துப் பலனை தனியாகப் பிரித்து உறுதிசெய்ய முடியாது.',
 'Home decisions may intersect work, agreements or time away; property results cannot be read in isolation.']:
 n===2&&[8,11].includes(h)?['வருமானம் மற்றும் கையில் தங்கும் தொகைக்கு இடையில் பகிர்ந்த கடமை அல்லது உறுதியாகக் கிடைக்கும் பணத்தின் வேறுபாடு இருக்கும்; இதை முன்கூட்டியே கணக்கில் கொள்ள வேண்டும்.',
 'Income and retained savings may diverge through shared commitments or timing of actual receipts.']:
 n===10&&h===6?['போட்டி, பழுதைச் சரிசெய்தல் அல்லது பிறர் சிக்கலைத் தீர்ப்பது தொழிலில் பெயர் கிடைக்கும் வழியாகலாம்; வேலைப்பளு தாங்கும் நேரம் முக்கியம்.',
 'Competition and solving others’ problems may become a career channel; available time and capacity remain limiting factors.']:null;
 const interference=(neg&&pos)?(ta?`இங்கு ${actor(neg.planet,true)}-ன் பாதகத் தொடர்பு இருந்தாலும் ${actor(pos.planet,true)} வழங்கும் சாதகத் தொடர்பையும் சேர்த்து மதிப்பிட வேண்டும்.`:
 `Restrictive ${neg.planet} evidence must be weighed with constructive ${pos.planet} evidence.`):'';
 if(!cross&&!dual)return [];
 const text=cross?(ta?`${actual}, ${cross[0]} ${interference}`:`${actual} ${cross[1]} ${interference}`):'';
 const dualText=(dual&&dual!==n)?(ta?
 `${k} ${dual}-ஆம் பாவத்திற்கும் அதிபதியாக இருப்பதால், இரண்டு துறைகளிலும் ஒரே கிரகத்தின் வலிமை செயல்படுகிறது; ${AREA_TA[dual-1]} சார்ந்த முடிவுகள் ${AREA_TA[n-1]} பற்றிய முடிவை மாற்றக்கூடும்.`:
 `The same ${k} also rules house ${dual} (${AREA_EN[dual-1]}), so its actual natal condition affects both that area and ${AREA_EN[n-1]}.`):'';
 return [text].filter(Boolean);
}
function relevantVargaContrast(c,ta){
 const info=c.divisionEvidence||[];
 const unique=info.filter((x,i)=>info.findIndex(y=>y.division===x.division&&y.planet===x.planet)===i);
 if(!unique.length)return '';
 const lord=unique.filter(x=>x.planet===c.lord),reverse=lord.find(x=>x.dignity==='weak'),lift=lord.find(x=>x.dignity==='strong');
 const sep=(unique.map(x=>`${x.division} ${actor(x.planet,ta)}`)).join(ta?' மற்றும் ':', ');
 if(reverse&&lift)return ta?`${sep} பதிவுகளில் ஒரே பாவாதிபதிக்கு பலவீனமும் வலிமையும் வேறு வர்க்கங்களில் தெரிகின்றன. ${c.house}-ஆம் பாவத்தின் வாழ்க்கைத் துறையை ஒரே வர்க்கத்தை வைத்து உறுதி செய்ய முடியாது.`:
 `${sep} show differing conditions of the same lord across supplied divisions; the result cannot be reduced to one placement.`;
 if(reverse)return ta?`${reverse.division} கட்டத்தில் ${actor(reverse.planet,true)} நீசநிலை பெறுவது ${c.house}-ஆம் பாவத்தின் தீர்ப்பில் மறுபரிசீலனைக்குரிய எதிர் ஆதாரம். D1 ஆதாரம் இல்லாமல் இதைத் தனியாக தோஷம் எனக் கூற முடியாது.`:
 `${reverse.planet} is debilitated in supplied ${reverse.division}; that qualifies the house reading, without creating an independent dosha.`;
 if(lift)return ta?`${lift.division} கட்டத்தில் ${actor(lift.planet,true)} ${lift.reason==='own'?'ஆட்சி':'உச்ச'} பலம் பெற்றிருப்பது ${c.house}-ஆம் பாவத்தில் கிடைக்கும் ஆதரவிற்கான துணைச் சுட்டு. ஆனால் பிறப்புப் பாவத்தின் தடையை அது தனியே நீக்காது.`:
 `${lift.planet} gains ${lift.reason==='own'?'own-sign':'exaltation'} dignity in supplied ${lift.division}, a corroborating factor rather than automatic cancellation.`;
 return '';
}
/* House lord and independent natural karaka are separate witnesses.
 * Raman I PDF pp.30-31, not a rule that a karaka alone proves an event. */
function karakaWitness(c,ta){
 const entries=(c.all||[]).filter(x=>x.relation==='karaka'&&x.planet!==c.lord&&Number.isInteger(x.planetHouse)&&Math.abs(x.delta)>=.06);
 const a=entries.sort((x,y)=>Math.abs(y.delta)-Math.abs(x.delta))[0];if(!a)return '';
 const ruler=actor(c.lord,ta),ind=actor(a.planet,ta),subject=ta?AREA_TA[c.house-1]:AREA_EN[c.house-1];
 const domain=ta?AREA_TA[a.planetHouse-1]:AREA_EN[a.planetHouse-1];
 const status=a.delta<0?(ta?'துணைச் சுட்டில் கட்டுப்பாடு தென்படுகிறது':'the second witness is restrictive'):
 (ta?'துணைச் சுட்டில் சாதகத் தொடர்பு தென்படுகிறது':'the second witness is supportive');
 const opposition=c.positive.length>0&&c.negative.length>0;
 return ta?`இந்தப் பலனுக்கு ${ruler} என்ற பாவாதிபதி மட்டுமல்ல, இயற்கைக் காரகரான ${ind} பிறப்பில் ${a.planetHouse}-ஆம் இடத்தில் இருப்பதும் தனி ஆதாரம். அதனால் ${subject} பற்றிய முடிவு ${domain} சம்பந்தமான சூழலால் பாதிக்கப்படலாம்; ${status}. ${opposition?'சாதகமும் பாதகமும் இரண்டும் இருப்பதால் ஒரே முடிவை முன்கூட்டியே உறுதிசெய்ய முடியாது.':''}`:
 `The ruler ${ruler} is not the only witness for ${subject}. Its distinct natural significator ${ind} occupies natal house ${a.planetHouse} (${domain}); ${status}. ${opposition?'Both supportive and adverse factors qualify the interpretation.':''}`;
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
 return [scene,[cross,balance,division,ruleText].filter(Boolean).join(' '),karakaWitness(c,ta),...domainConsequences(c,ta)].filter(Boolean);
}
/* A different AD is a different operative planet. The report must explain
 * that planet's observed house and its relationship to the D1 topic instead
 * of recycling a generic house-level event sentence for every sub-period. */
const AD_ROLE_TA={
 Sun:'அதிகாரமும் பொறுப்பும் தொடர்பான முடிவில் தெளிவைப் பெற வேண்டியிருக்கும்',
 Moon:'குடும்பத்தவரின் உணர்வுகளையும் அன்றாட நிம்மதியையும் கருத்தில் கொள்ள நேரிடும்',
 Mars:'அவசரத் தீர்மானத்தைத் தவிர்த்து தன்னுடைய செயல் வேகத்தை ஒழுங்குபடுத்த வேண்டியிருக்கும்',
 Mercury:'ஆவணங்கள், பேச்சுவார்த்தை, கணக்குகள் ஆகியவற்றின் துல்லியம் முக்கியமாகும்',
 Jupiter:'பெரியோர் ஆலோசனை, கற்றல் மற்றும் நீண்டகால நன்மை ஆகியவற்றை ஒப்பிட வேண்டியிருக்கும்',
 Venus:'உறவு, ஒப்புதல், வசதிக்கான செலவு ஆகியவற்றில் சமநிலை தேவைப்படும்',
 Saturn:'நீடிக்கும் கடமை, வேலை நேரம் மற்றும் பொறுமைக்கான சோதனை முக்கியமாகும்',
 Rahu:'வழக்கத்திலில்லாத யோசனை அல்லது புதிய தொடர்பின் நம்பகத்தன்மையை ஆராய வேண்டியிருக்கும்',
 Ketu:'பழையதை விட்டு மாறும் எண்ணத்துக்கு முன் நிறைவேறாத பொறுப்பைச் சரிபார்க்க வேண்டியிருக்கும்'
};
const AD_ROLE_EN={
 Sun:'questions of authority and responsibility become prominent',Moon:'family needs and emotional steadiness require attention',
 Mars:'the pace of decisions and practical follow-through matters',Mercury:'accuracy in records and negotiations matters',
 Jupiter:'learning, counsel and long-term benefit need comparison',Venus:'relationship expectations and discretionary costs need balance',
 Saturn:'enduring obligations and sustainable work routines matter',Rahu:'unusual opportunities require careful independent verification',
 Ketu:'plans to withdraw or change course require a review of unfinished duties'
};
const AD_ROLE_CHILD_TA={Sun:'ஆசிரியரிடம் பொறுப்பை ஏற்று முடிப்பதில் நிதானம் தேவைப்படும்',Moon:'குடும்ப ஆதரவும் அன்றாடக் கற்றல் பழக்கமும் முக்கியமாகும்',Mars:'விளையாட்டிலும் பயிற்சியிலும் அவசரத்தை விட ஒழுங்கு முக்கியம்',Mercury:'பாடக் குறிப்பும் தகவல்தொடர்பும் தெளிவாக இருக்க வேண்டும்',Jupiter:'ஆசிரியர் வழிகாட்டலும் பாடத்தில் ஆர்வமும் துணையாகும்',Venus:'நண்பர்களுடன் ஒத்துழைக்கும் பழக்கமும் படைப்புப் பயிற்சியும் முக்கியமாகும்',Saturn:'வீட்டுப்பாடம் மற்றும் ஒழுங்கான பயிற்சியில் பொறுமை தேவைப்படும்',Rahu:'புதிய தகவலை ஆசிரியர் அல்லது பெற்றோருடன் சரிபார்க்க வேண்டும்',Ketu:'தனித்து முடிவு செய்யும் முன் பெரியோரிடம் ஆலோசனை கேட்க வேண்டும்'};
const AD_ROLE_CHILD_EN={Sun:'assigned school responsibilities need careful follow-through',Moon:'family support and everyday learning routines matter',Mars:'safe play and steady practice matter more than haste',Mercury:'accurate class notes and communication are important',Jupiter:'teacher guidance and curiosity in learning are relevant',Venus:'peer cooperation and creative practice matter',Saturn:'patience with homework and routines is needed',Rahu:'new information should be verified with teachers or parents',Ketu:'caregiver advice matters before withdrawing from activities'};
const CHILD_PERIOD_TA=[
 ['ஒரு பொறுப்பைத் தானே செய்து முடிக்கும் திறன் வளரலாம்','தனிப்பட்ட விருப்பத்தை பெற்றோருடன் பேசி ஒழுங்குபடுத்த நேரலாம்','திறமை வளர்ச்சிக்கும் ஓய்வுக்கும் நேரம் பகிர வேண்டியிருக்கும்'],
 ['கல்வித் தேவைகளைப் பெற்றோரிடம் தெளிவாகப் பகிரக் கற்றுக் கொள்ளலாம்','பள்ளிச் செலவோ வீட்டுத் தேவையோ பெற்றோர் திட்டத்தை மாற்றக் கூடும்','கல்வி வளங்களையும் குடும்பப் பழக்கங்களையும் சமப்படுத்த வேண்டும்'],
 ['பயிற்சியில் தொடர்ந்து முயற்சி செய்து முன்னேற்றம் காணலாம்','நண்பர்கள் அல்லது உடன்பிறந்தோருடன் ஒத்துழைப்புக்குக் கூடுதல் பயிற்சி தேவைப்படலாம்','புதிய திறனைப் பயிற்சி செய்வதற்கான நேரத்தை அமைக்க நேரிடும்'],
 ['வீட்டில் படிப்புக்குத் தேவையான ஆதரவு மேம்படலாம்','வீட்டுச் சூழலில் ஏற்படும் மாற்றம் படிப்பு ஒழுங்கை பாதிக்கலாம்','பெற்றோரின் உதவியுடன் தினசரி பழக்கத்தை மாற்ற நேரலாம்'],
 ['கற்றல் திறனை அடுத்த கட்டத்திற்குக் கொண்டு செல்ல முடியும்','பாடத்தில் கவனம் வைப்பதற்கான முறை மாற வேண்டியிருக்கும்','படைப்புப் பயிற்சிக்கும் பள்ளிப் பணிக்கும் நேரம் பகிர வேண்டும்'],
 ['ஒழுங்கான வீட்டுப்பாடப் பழக்கத்தால் நம்பிக்கை உருவாகலாம்','அதிகப் பயிற்சியால் ஓய்வு குறையாமல் கவனிக்க வேண்டியிருக்கும்','உணவு, ஓய்வு, பள்ளிப் பொறுப்புகளைச் சீரமைக்க வேண்டியிருக்கும்'],
 ['வகுப்புத் தோழர்களுடன் கூட்டாகச் செயல்படக் கற்றுக்கொள்ளலாம்','நண்பர்களுக்குள் கருத்து வேறுபாட்டைப் பேசித் தீர்க்கப் பயிற்சி தேவைப்படலாம்','குழு வேலைகளில் பொறுப்புகளைச் சமமாகப் பகிர வேண்டியிருக்கும்'],
 ['பாதுகாப்பு வழிமுறைகளைப் புரிந்து பெரியோருடன் செயல்படலாம்','திடீர் மாற்றம் வந்தால் பெற்றோரின் உதவி முக்கியமாகும்','புதிய சூழலுக்கேற்ற பாதுகாப்புப் பழக்கம் கற்றுக்கொள்ளலாம்'],
 ['ஆசிரியர் வழிகாட்டலால் புதிய பாடத்தில் ஆர்வம் வளரலாம்','கற்றல் முறை அல்லது வகுப்புச் சூழலில் மாற்றம் தேவைப்படலாம்','பெரியோரின் ஆலோசனையையும் தன் ஆர்வத்தையும் இணைக்கலாம்'],
 ['பள்ளியில் ஒப்படைக்கப்பட்ட பணியை முடித்து நம்பிக்கை பெறலாம்','பயிற்சியின் அளவு அதிகரித்தால் பணியைச் சிறிய பகுதிகளாகப் பிரிக்க வேண்டும்','பள்ளிப் பொறுப்புக்கும் விளையாட்டுக்கும் நேரம் ஒதுக்க வேண்டும்'],
 ['குழுவாகக் கற்கும் வாய்ப்புகள் அதிகரிக்கலாம்','நண்பர் வட்டத்தால் கவனம் சிதறாமல் பெரியோர் துணை தேவைப்படலாம்','குழு முயற்சிக்கும் தனிப்பட்ட படிப்புக்கும் சமநிலை தேவைப்படும்'],
 ['தினசரி ஓய்வு மற்றும் வீட்டுப் பழக்கத்தில் ஒழுங்கு மேம்படலாம்','பயணம் அல்லது வீட்டுச் சூழல் மாற்றம் உறக்கத்தை பாதிக்கலாம்','ஓய்வு மற்றும் பள்ளிப் பணியின் நேரத்தை மறுஅமைக்க நேரிடும்']
];
const CHILD_PERIOD_EN=[
 ['independent habits may improve','personal choices may require caregiver guidance','rest and training need balancing'],
 ['school needs may be communicated better','household changes may affect school resources','learning supplies and family needs require balance'],
 ['regular practice may strengthen skills','peer and sibling cooperation may need support','time is needed for training'],
 ['study support at home may improve','home changes may disrupt school routines','caregivers can help revise daily habits'],
 ['learning may advance','study routines may need adjustment','creative work and homework need balancing'],
 ['steady homework habits may improve','overtraining and lost rest should be avoided','food, sleep and schoolwork need planning'],
 ['cooperation with peers may improve','disagreements with classmates may need mediation','group duties should be shared fairly'],
 ['safety habits can be developed','unexpected changes require caregiver support','new settings require practical safety awareness'],
 ['teachers may encourage new learning','study methods may need revision','personal interests can be balanced with guidance'],
 ['school assignments may build trust','tasks may need to be broken into steps','play and study should share the schedule'],
 ['group learning may help','peer distractions may need support','team activities need balancing with study'],
 ['rest routines may improve','travel or household changes may interrupt sleep','rest and homework may need rescheduling']
];
const CHILD_AREA_TA=['சொந்த பழக்கமும் வளர்ச்சியும்','குடும்ப உரையாடலும் கல்வித் தேவைகளும்','பள்ளிப் பயிற்சியும் உடன்பிறந்தோர் ஒத்துழைப்பும்','வீடும் பெற்றோர் ஆதரவும்','படிப்பும் படைப்பாற்றலும்','வீட்டுப்பாடமும் தினசரி பழக்கமும்','நண்பர்களுடன் ஒத்துழைப்பும்','பாதுகாப்புப் பழக்கமும் பெரியோர் உதவியும்','ஆசிரியர் வழிகாட்டலும் மேற்பயிற்சியும்','பள்ளிப் பொறுப்பும் மதிப்பீடும்','குழுவாகக் கற்கும் சூழலும்','உறக்கமும் குடும்பப் பயணமும்'];
const CHILD_AREA_EN=['self-development and habits','family conversations and schooling needs','practice and sibling cooperation','home and caregiver support','education and creative learning','homework and everyday routines','cooperation with peers','safety habits and adult guidance','mentors and training','school responsibilities','teamwork and peers','sleep and family travel'];
const CHILD_CHANNEL_TA=['சொந்த பழக்கமும் வளர்ச்சியும்','குடும்ப உரையாடலும் கல்வித் தேவைகளும்','பயிற்சியும் நண்பர் அல்லது உடன்பிறந்தோர் ஒத்துழைப்பும்','வீடும் பெற்றோர் ஆதரவும்','பள்ளிக் கற்றலும் விளையாட்டும்','வீட்டுப்பாடமும் அன்றாட ஒழுங்கும்','வகுப்புத் தோழர் ஒத்துழைப்பும்','பாதுகாப்புப் பழக்கமும் பெற்றோர் வழிகாட்டலும்','ஆசிரியர் அறிவுரையும் பயிற்சியும்','பள்ளிப் பொறுப்பும் கற்றல் முன்னேற்றமும்','குழு நடவடிக்கைகளும் நட்பும்','உறக்கமும் பயணப் பழக்கமும்'];
function period(win,c,lang,opts){const ta=lang!=='en',p=win?.period,d=J().decide(c);
 if(!p?.md||!p?.ad||!d||!win?.links?.length||win.weight<2.4)return '';
 const age=p.age,child=age!==null&&age<18,senior=age!==null&&age>=65;
 const md=actor(p.md,ta),ad=actor(p.ad,ta),pd=p.pd?actor(p.pd,ta):null;
 const ph=win.periodPlanetHouses||{};const mdHouse=ph.md,adHouse=ph.ad;
 const mdLink=roleOf(p.md,c,ta),adLink=roleOf(p.ad,c,ta);
 const isAdDirect=p.ad===c.lord||c.houseOccupants.includes(p.ad)||c.houseAspects.includes(p.ad);
 const domain=ta?(child?CHILD_AREA_TA[c.house-1]:AREA_TA[c.house-1]):(child?CHILD_AREA_EN[c.house-1]:AREA_EN[c.house-1]);
 const dest=Number.isInteger(adHouse)?(ta?(child?CHILD_CHANNEL_TA[adHouse-1]:CHANNEL_TA[adHouse-1]):AREA_EN[adHouse-1]):null;
 const stage=d.stage==='support'?0:d.stage==='strain'?1:2;
 const ageText=child?(ta?({7:'இந்த வயதில் இது திருமணம் அல்ல; வகுப்புத் தோழர்களுடன் ஒத்துழைக்கக் கற்றுக் கொள்வதோடு தொடர்புடையது',10:'பள்ளிப் பயிற்சி மற்றும் கல்விப் பொறுப்பின் வழியே இந்தத் தொடர்பை வாசிக்க வேண்டும்',11:'குழுக் கற்றலும் நண்பர் வட்டமும் பிரதானமானவை'})[c.house]||'இங்கு குழந்தையின் படிப்பு, பழக்கம், குடும்ப ஆதரவு ஆகியவற்றையே முன்னிலைப்படுத்த வேண்டும்':
 'At this age the focus is on school, peers and family support rather than adult events'):
 senior?(ta?'இந்த வயதில் பணியிடப் போட்டியை மட்டுமே மையப்படுத்தாமல் அனுபவப் பகிர்வு, ஓய்வு, குடும்பப் பொறுப்புகளுக்கும் இடம் கொடுக்க வேண்டும்.':
 'At this age mentoring, rest and family priorities should be weighed alongside paid work.') : '';
 // The differentiated result is a synthesis of MD vs AD roles, AD house, and natal judgement.
 const opening=ta?`${p.from} முதல் ${p.to} வரையிலான ${md} மகாதசை – ${ad} புக்தியில் ${domain} முக்கியமாகும்.`:
 `From ${p.from} to ${p.to}, the ${md} major period and ${ad} sub-period bring attention to ${domain}.`;
 const ruler=ta?`${md} மகாதசை அதிபதிக்கும் இந்தத் துறைக்கும் உள்ள தொடர்பு ${mdLink}; ${ad} புக்தி ${adLink} மூலம் செயல்படுகிறது.`:
 `The major-period lord ${md} has ${mdLink} to this subject; the sub-period lord ${ad} contributes ${adLink}.`;
 const houseSentence=ta? (child?`${dest} பற்றிய முடிவுகளில் பெற்றோர் அல்லது ஆசிரியரின் உதவி முக்கியமாகும்.`:`${dest}.`):
    `${dest||'The operative natal house'} is a separate channel for this sub-period.`;
 const adDetail=ta?`${ad} பிறப்பு ஜாதகத்தில் ${Number.isInteger(adHouse)?adHouse+'-ஆம் பாவத்தில் இருப்பதால், ':''}${isAdDirect?'இந்தத் துறையை நேரடியாக இயக்குகிறார். ':'இந்தத் துறையுடன் துணைத் தொடர்பு பெறுகிறார். '}${dest?houseSentence+' ':''}${(child?AD_ROLE_CHILD_TA:AD_ROLE_TA)[p.ad]||''}.`:
    `${ad} ${Number.isInteger(adHouse)?'occupies natal house '+adHouse+', ':''}${isAdDirect?'directly activating this life area':'providing a secondary natal connection'}. ${dest?houseSentence+' ':''}${(child?AD_ROLE_CHILD_EN:AD_ROLE_EN)[p.ad]||''}.`;
 const pos=c.positive.find(x=>['lord','occupies','aspects'].includes(x.relation));
 const neg=c.negative.find(x=>['lord','occupies','aspects'].includes(x.relation));
 const supportText=pos?(ta?`${relationTA(pos,c)} சாதகத் துணை அளிக்கிறது`:`${relationEN(pos,c)} provides natal support`):'';
 const riskText=neg?(ta?`${relationTA(neg,c)} கடினத்தை உணர்த்துகிறது`:`${relationEN(neg,c)} signals a constraint`):'';
 const balance=ta?`${[supportText,riskText].filter(Boolean).join('; ')}${pos||neg?' என்ற ஆதாரங்களின் அடிப்படையில், ':''}${md}–${ad} காலத்தில் இந்தத் துறையைப் பற்றிய முடிவுகளை ${d.stage==='strain'?'பொறுமையுடனும் முன் தயாரிப்புடனும்':d.stage==='support'?'கிடைத்த ஆதரவைப் பயன்படுத்தி':'சாதக–பாதக நிலைகளை ஒப்பிட்டு'} மேற்கொள்ளலாம்.`:
   `${[supportText,riskText].filter(Boolean).join('; ')}. This places the ${ad} sub-period in a ${d.stage==='strain'?'more restrictive':d.stage==='support'?'supportive':'qualified'} natal context rather than predicting a certain event.`;
 const sampled=win.transit?(ta?`${actor(win.transit.planet,true)} பெயர்ச்சி ${win.transit.observedOn} அன்று கணிக்கப்பட்ட இந்தப் புக்திக்குள் வருகிறது; `:
 `A computed ${win.transit.planet} transit sample dated ${win.transit.observedOn} lies inside this sub-period.`):'';
 const trace=opts?.seen;const fresh=(key,text)=>{if(!trace)return text;if(trace.has(key))return '';trace.add(key);return text;};
 const uniqueRuler=fresh(`md:${p.md}:${c.house}:${mdLink}`,ruler);
 const uniqueAdDetail=fresh(`ad:${p.ad}:${adHouse}:${isAdDirect}:${c.house}`,adDetail);
 const uniqueBalance=fresh(`balance:${c.house}:${c.lord}:${c.location}:${pos?.planet||''}:${neg?.planet||''}`,balance);
 const pdLine=pd?(ta?`${pd} அந்தரத்தின் பெயர் தரப்பட்டுள்ளது; தனியான தொடக்கம்–முடிவு வழங்கப்படாவிட்டால் அந்தர நிகழ்வு தேதியை உருவாக்க முடியாது.`:
 `The ${pd} pratyantara name was supplied; no new sub-sub-period dates are inferred.`):'';
 return [opening,uniqueRuler,uniqueAdDetail,uniqueBalance,ageText,sampled,pdLine].filter(Boolean).join(' ');
}
function year(group,lang){if(group?.kind==='insufficient'||!group?.claim||!group?.period||!group?.transit)return '';
 const ta=lang!=='en',c=group.claim,d=J().decide(c),p=group.period;if(!d)return '';
 const md=actor(p.md,ta),ad=actor(p.ad,ta),tr=actor(group.transit.planet,ta);
 const age=group.age,child=age!==null&&age<18,subject=ta?(child?CHILD_AREA_TA:AREA_TA)[c.house-1]:(child?CHILD_AREA_EN:AREA_EN)[c.house-1];
 const signal=Number(group.transit.signal),reading=signal>0?(ta?'துணைச் சுட்டாக':'supportive context'):signal<0?(ta?'மறு ஆய்வுக்குரிய சுட்டாக':'reason for review'):(ta?'கலந்த சுட்டாக':'mixed context');
 const link=ta?`${actor(c.lord,true)} ${c.house}-ஆம் இடத்தின் அதிபதியாகி ${c.location}-ஆம் பாவத்தில் இருப்பது`:
  `${c.lord} ruling house ${c.house} from natal house ${c.location}`;
 const stage=ta?d.stage==='strain'?'உடனடி முடிவைவிடத் திட்டத்தின் பாதுகாப்பைக் கவனிப்பது பொருத்தமாகலாம்':d.stage==='support'?'ஆதரவு உள்ள இடத்தில் பொருத்தமான வாய்ப்பைத் திட்டமிட்டு பயன்படுத்தலாம்':'நன்மையும் தடையும் இணைந்திருப்பதால் ஒரே தீர்ப்பு கொடுக்க இயலாது':
  d.stage==='strain'?'the natal constraints make cautious planning important':d.stage==='support'?'the natal supports invite well-planned action':'the natal evidence remains mixed';
 const years=group.recurrences?.length?(ta?`தொடர்புடைய மற்ற கணிக்கப்பட்ட இடைவெளிகள் ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`:
  `Other related computed intervals: ${group.recurrences.map(x=>x.from+'–'+x.to).join(', ')}.`):'';
 return ta?`${group.from} – ${group.to}: ${tr} பெயர்ச்சியின் ${group.transit.observedOn} கணிக்கப்பட்ட நிலை, ${md}–${ad} காலத்தில் ${subject} தொடர்பாக ${reading} வருகிறது; ஏனெனில் ${link}. இதனால் ${stage}.${child?' பள்ளி, நண்பர் மற்றும் பெற்றோர் சூழலுக்கேற்ப இதை வாசிக்கவும்.':''} ${years}`.trim():
  `${group.from} – ${group.to}: the ${tr} transit observation on ${group.transit.observedOn} falls in ${md}/${ad} as ${reading} for ${subject}, considering ${link}; ${stage}. ${child?'Interpret this through schooling, peer groups and caregiver support.':''} ${years}`.trim();
}
function summary(s,lang){if(!s?.main)return [];
 const ta=lang!=='en',main=J().decide(s.main),counter=J().decide(s.counter);if(!main)return [];
 const first=ta?`ஜாதகத்தில் முன்னிலைப்படும் வாழ்க்கைத் துறையில் ${main.completedTA} ${actor(main.lord,true)} ${main.house}-ஆம் பாவத்தை ஆண்டு, ${main.location}-ஆம் இடத்தில் அமர்ந்திருப்பதால் ${main.linkTA} தொடர்பான முடிவுகளும் உடன் வருகின்றன.`:
  `The chart's leading life theme is ${main.leadEN}. ${main.lord}, ruling house ${main.house}, occupies house ${main.location} and links it with ${main.linkEN}.`;
 const other=counter&&counter.house!==main.house?(ta?`${AREA_TA[counter.house-1]} சார்ந்த விஷயத்தில் ${counter.completedTA} இதற்கு ${actor(counter.lord,true)} ${counter.location}-ஆம் பாவத்தில் இருக்கும் அமைப்பும் தொடர்புடையதாகும்.`:
  `Another indicator concerns ${counter.leadEN} in ${AREA_EN[counter.house-1]}; the two areas have different evidence.`):'';
 return [first,other].filter(Boolean);
}
/* LONG-FORM lived-outcome layer (V311). Independent graha/nakshatra rule evidence
 * is computed in Judgement and consumed here; birth calculations stay untouched.
 * Each matter has a distinct human outcome, not a relabelled chart-position line.
 */
const SIGN_GENERAL_TA=[
 ['மேஷம்','முயற்சியைத் தொடங்குவதில் தயங்காத தன்மை இவ்வகை லக்னத்தின் பாரம்பரியக் குணமாகக் கூறப்படுகிறது. வேலை தொடங்கிய பின்னரே அதன் சவாலை முழுமையாகப் புரிந்து கொள்வது இவர்களிடம் காணப்படும் அணுகுமுறை. உடனடியாகக் கிடைக்கும் வெற்றியைவிடத் தனியாக முடிவெடுக்க முடிவதையே முக்கியமாகக் கருதலாம்.'],
 ['ரிஷபம்','வாழ்க்கையில் நிலையான அடித்தளத்தை உருவாக்கி அதன்மேல் முன்னேற விரும்பும் இயல்பு முன்வைக்கப்படுகிறது. சாப்பாடு, இருப்பிடம், பொருளாதாரப் பாதுகாப்பு போன்ற நடைமுறை தேவைகளுக்கு முன்னுரிமை கொடுக்கும் மனப்போக்கு இருக்கலாம். பழகிய சூழலை உடனடியாக மாற்றுவதற்கு முன் அதன் நன்மைகளைச் சீர்தூக்கிப் பார்க்க விரும்புவர்.'],
 ['மிதுனம்','ஒன்றைப் பற்றிய தகவலைக் கேட்டறிந்து மற்றொரு தகவலுடன் ஒப்பிடும் ஆர்வம் இவ்வகை லக்னத்தின் இயல்பாகக் கூறப்படுகிறது. உரையாடல், எழுத்து, பரிமாற்றம் வழியாகத் தன் உலகை விரிவுபடுத்த முயல்வர். ஒரே வேலையில் மட்டும் நிலைக்காமல் புதிய திறன்களை இணைத்துக் கொள்ளும் விருப்பமும் இருக்கலாம்.'],
 ['கடகம்','நெருக்கமான உறவுகள், நினைவுகள், குடும்பத்தைப் பாதுகாக்கும் விருப்பம் ஆகியவை வாழ்க்கை முடிவுகளில் இடம் பெறலாம். சூழலின் உணர்ச்சி மாற்றங்களை உடனே உணரும் திறன் இருப்பதாகப் பாரம்பரியமாக விளக்கப்படுகிறது. மற்றவர்களுக்கு ஆதரவளிக்கும்போது தமக்கான ஓய்வையும் பாதுகாப்பையும் தேடுவார்கள்.'],
 ['சிம்மம்','ஒரு பணியைத் தன் பொறுப்பாக எடுத்தால் அதன் முடிவில் தனக்கான பங்கு தெளிவாகத் தெரிய வேண்டும் என்று விரும்புவர். மரியாதை, வெளிப்படையான நடத்தை, முன்மாதிரியாக இருப்பது ஆகியவற்றைக் கருத்தில் கொள்ளும் இயல்பு உண்டு. பாராட்டை விரும்புவதோடு தமக்குப் பொருத்தமான வழியில் பிறரை ஊக்குவிக்கும் போக்கும் சொல்லப்படுகிறது.'],
 ['கன்னி','வேலையின் குறைகளை முன்கூட்டியே கண்டறிந்து திருத்துவதில் கவனம் செலுத்தும் இயல்பு இவ்வகை லக்னத்துடன் இணைக்கப்படுகிறது. ஒரு பொறுப்பின் சிறிய விவரம்கூட முடிவை மாற்றக்கூடும் என்று எண்ணுவர். பிறருக்கு உதவுவது என்பது அவர்களுக்குப் பல நேரங்களில் ஒழுங்காகச் செய்து கொடுப்பதைக் குறிக்கலாம்.'],
 ['துலாம்','ஒரே விஷயத்தை இரு தரப்பின் பார்வையிலிருந்து புரிந்துகொள்ளும் முயற்சி வாழ்க்கை அணுகுமுறையின் மையமாக இருக்கலாம். உறவு, ஒப்பந்தம், நேர்மை மற்றும் அழகுணர்வு போன்றவற்றை மதிப்பர். தனக்கான முடிவையும் மற்றவரின் தேவையையும் சமப்படுத்துவதில் அதிக மனநேரம் செலவிடலாம்.'],
 ['விருச்சிகம்','வெளியில் உடனே வெளிப்படுத்தாத எண்ணங்களை உள்ளுக்குள் ஆராய்ந்து முடிவெடுக்கும் இயல்பு குறிப்பிடப்படுகிறது. நம்பிக்கையைப் பெற நேரம் எடுத்துக்கொள்வதுடன், ஏற்றுக் கொண்ட உறவுகளில் ஆழமான ஈடுபாடும் இருக்கலாம். தடைகளை எதிர்கொள்ளும்போது பழைய முறையை மாற்றிப் புதிய வழி தேடும் மனப்பாங்கு காணப்படலாம்.'],
 ['தனுசு','ஒரு செயலுக்குப் பின்னால் இருக்கும் நோக்கம் என்ன என்பதைப் புரிந்துகொள்ள விரும்பும் மனப்போக்கு இருக்கலாம். கல்வி, பயணம், தத்துவம், வழிகாட்டல் போன்றவற்றில் பெரிய படத்தைப் பார்க்கும் ஆர்வம் முன்வைக்கப்படுகிறது. தாம் சரி என்று நம்புவதை வெளிப்படையாகக் கூறும் விருப்பமும் இருக்கலாம்.'],
 ['மகரம்','நீண்டகால முயற்சியில் சிறுசிறு படிகளைத் தொடர்ச்சியாக எடுத்து வைப்பதே வளர்ச்சிப் பாதையாகக் கருதப்படலாம். விதிமுறை, நேரம், பொறுப்பு ஆகியவற்றைக் கைவிட விரும்பாத குணம் முன்வைக்கப்படுகிறது. தன் சாதனைகளை உடனடியாக வெளிப்படுத்தாமல் செயலில் நிரூபிப்பது இவர்களுக்கு இயல்பாக இருக்கலாம்.'],
 ['கும்பம்','வழக்கமாக அனைவரும் பின்பற்றும் முறையையே ஏற்காமல் வேறொரு சாத்தியத்தைப் பற்றி சிந்திக்கும் ஆர்வம் இருக்கலாம். குழுவின் நன்மை, அறிவுப் பரிமாற்றம், தனித்த கண்ணோட்டம் ஆகியவை முக்கியம் பெறலாம். நெருக்கமான உறவுகளிலும் தனக்கான சுதந்திரமான சிந்தனையைப் பாதுகாக்க விரும்புவர்.'],
 ['மீனம்','மற்றவர்களின் நிலையை உணர்ந்து அதற்கேற்பப் பதிலளிக்கும் மென்மையான அணுகுமுறை இவ்வகை லக்னத்தின் அடிப்படைக் குணமாகக் கூறப்படுகிறது. கற்பனை, நம்பிக்கை, கலை மற்றும் சேவை மனப்பான்மை ஆகியவற்றுக்கு இடம் அளிக்கலாம். வெளிப்புறப் பொறுப்புக்கும் உள்ளுணர்வுக்கும் இடையில் சமநிலை தேடும் இயல்பும் இருக்கலாம்.']
];
const MOON_GENERAL_TA=[
 'மனம் ஒரு விஷயத்தில் ஆர்வம் கொண்டவுடன் உடனே முயற்சி செய்ய விரும்பும் சுறுசுறுப்பு முன்வைக்கப்படுகிறது. உணர்ச்சிகளை நீண்ட நேரம் மறைத்து வைத்திருக்காமல் வெளிப்படுத்தும் இயல்பு சொல்லப்படுகிறது.',
 'மன நிம்மதிக்கு நம்பகமான அன்றாட ஒழுங்கும் பழக்கமான மனிதர்களும் முக்கியமாக இருக்கலாம். விருப்பமான சூழல் உறுதியான பிறகே பெரிய மாற்றத்தை ஏற்கும் போக்கு குறிப்பிடப்படுகிறது.',
 'பல விஷயங்களைப் பற்றிக் கேட்கவும் பேசவும் அறியவும் மனம் விரும்பலாம். ஒரே எண்ணத்தை விட புதிய தகவல் கிடைக்கும்போது நிலைப்பாட்டை மாற்றும் நெகிழ்வுத்தன்மை சொல்லப்படுகிறது.',
 'குடும்ப உறுப்பினர்களின் உணர்ச்சிகளையும் வீட்டின் சூழலையும் மனம் அதிகமாகப் பிரதிபலிக்கலாம். பழைய நினைவுகளுக்கு வழங்கும் முக்கியத்துவம் உறவுகளைத் தேர்வதிலும் தோன்றலாம்.',
 'மனதிற்கு மரியாதையும் பாராட்டும் தேவைப்படலாம்; தன் அன்பையும் நேரடியாக வெளிப்படுத்த விரும்பலாம். பிறரின் நம்பிக்கையைப் பெற்றபின் முன்நின்று பொறுப்பு ஏற்கும் ஆர்வம் இருக்கலாம்.',
 'சிறிய தவறுகளையும் கவனிக்கும் மனப்பாங்கு காரணமாக வேலை முறையாக இருக்க வேண்டும் என்ற எண்ணம் எழலாம். தன்னிடமும் பிறரிடமும் அளவுக்கு மீறிய எதிர்பார்ப்பு வைத்துக்கொள்ளாமல் பழகுவது உதவலாம்.',
 'நெருங்கிய உறவுகளில் சுமுகத்தன்மையும் பரஸ்பர மரியாதையும் மனதிற்கு முக்கியம் பெறலாம். விவாதத்தின் இரு தரப்பையும் புரிந்து கொள்ள நேரம் எடுத்துக்கொள்ளும் அணுகுமுறை உண்டு.',
 'அறிந்த மனிதர்களிடமும் எல்லா உணர்ச்சிகளையும் உடனே பகிராத தன்மை முன்வைக்கப்படுகிறது. நம்பிக்கை உருவானபின் உறவிற்கு முழு ஈடுபாடு அளிக்கும் ஆழமான மனப்போக்கு இருக்கலாம்.',
 'மனதிற்கு புதிய கருத்து, வாசிப்பு, தூர இடங்கள் அல்லது பெரிய இலக்கு பற்றிய சிந்தனை உற்சாகம் அளிக்கலாம். சிறிய தடையிலும் மொத்தப் பயணத்தின் பொருளைப் பார்க்க விரும்புவர்.',
 'பொறுப்பை நிறைவேற்றிய பிறகே முழுமையாக ஓய்வெடுக்கத் தகுதி கிடைத்ததாக எண்ணும் மனநிலை இருக்கலாம். உணர்ச்சியை வெளிப்படுத்துவதற்கு மாற்றாகப் பயனுள்ள செயலைச் செய்வது வழக்கமாக இருக்கலாம்.',
 'தனிப்பட்ட எண்ணங்களுக்கு இடம் வேண்டும் என்ற மன விருப்பம் முன்வைக்கப்படுகிறது. நண்பர்கள் அல்லது குழுவுடன் இணைந்தாலும் ஒவ்வொருவருக்கும் தனித்த கண்ணோட்டம் இருப்பதை மதிக்கலாம்.',
 'கற்பனையும் பரிவும் அதிகம் இடம் பெறும் மனப்பாங்கு கூறப்படுகிறது. இசை, அமைதி, ஆன்மிகச் சிந்தனை போன்றவற்றின் மூலம் உள்ளுணர்வை ஒழுங்குபடுத்த விரும்பலாம்.'
];
const NAK_TRAITS_TA=[
 'புதிய முயற்சிக்கு முதல் அடி எடுப்பதில் ஈடுபாடு; வேகத்திற்கும் பொறுப்பிற்கும் சரியான இடம் தேடும் பழக்கம்.',
 'ஒரு கடமையை ஏற்றுக்கொண்டால் அதன் கட்டுப்பாட்டையும் விளைவையும் மனதில் வைத்துச் செயல்படுதல்.',
 'தெளிவாக வேறுபடுத்திப் பார்க்கும் ஆர்வம்; பொருத்தமற்றதைத் திருத்தும் மன உறுதி.',
 'வளர்ச்சியை மெதுவாகப் பேணுதல்; உறவுகளிலும் பொருட்களிலும் பராமரிப்புக்கு முக்கியத்துவம்.',
 'புதிய அறிவைத் தொடர்ந்து தேடுதல்; முடிவெடுப்பதற்கு முன் பல வாய்ப்புகளை ஆராய்தல்.',
 'சவாலுக்குப் பின்னால் உள்ள காரணத்தை அறிய முயற்சித்தல்; பழைய கருத்தைத் துணிந்து மறுபரிசீலனை செய்தல்.',
 'மாறிய சூழலில் மீண்டும் தொடங்கும் நம்பிக்கை; உடைந்த இணைப்பைச் சீரமைக்கும் முனைப்பு.',
 'ஒழுங்காகப் பாதுகாக்கும் பொறுப்பு; தேவையுடையவருக்கு நம்பகமான ஆதரவாக இருத்தல்.',
 'விஷயத்தின் நுணுக்கத்தைத் தேடி அறியும் தன்மை; மறைமுகக் காரணங்களைப் புரிந்துகொள்ளும் ஆர்வம்.',
 'முன்னோர் மரபு மற்றும் குடும்ப அடையாளத்திற்கு வழங்கும் மரியாதை; தகுந்த இடத்தில் தலைமை ஏற்கும் விருப்பம்.',
 'கலை, உறவு, ஓய்வு ஆகியவற்றில் மன நிறைவை நாடுதல்; பிறரை இணைக்கும் திறனைப் பேணுதல்.',
 'ஒப்புக்கொண்ட பொறுப்பை நிறைவேற்றித் தனித்தன்மையை நிரூபித்தல்; செயலில் நம்பகத்தன்மை தேடுதல்.',
 'கைகளால் செய்வதிலும் சூழலைக் கவனிப்பதிலும் நுணுக்கம்; சிறிய செயலையும் பயனாக மாற்ற முயற்சித்தல்.',
 'புதிய வடிவங்களை உருவாக்கும் ஆர்வம்; அழகுணர்வையும் தொழில்நுட்பத்தையும் இணைத்துப் பார்க்கும் திறன்.',
 'தன் வழியைத் தேர்ந்தெடுக்க விரும்புதல்; வெவ்வேறு சூழல்களுக்கு விரைவாக ஏற்படக்கூடிய நெகிழ்வு.',
 'பல நோக்கங்களை ஒரே இலக்கில் இணைக்கும் துணிவு; வெற்றி வரை தொடர்ந்து முயல்வதில் ஈடுபாடு.',
 'உறவின் நிலைத்தன்மைக்கும் நட்பின் நம்பிக்கைக்கும் முன்னுரிமை; தொடர்ச்சியான முயற்சியை மதித்தல்.',
 'சிக்கலின் மையத்தைத் துல்லியமாக அறிய விரும்புதல்; தன் எல்லைகளைக் காத்து முடிவெடுத்தல்.',
 'ஒரு பழைய அமைப்பின் அடிப்படையை ஆராய்தல்; தேவையற்றதை விலக்கி புதிய தொடக்கம் தேடுதல்.',
 'படிப்படியாக முன்னேறும்போதும் உயர்ந்த நோக்கத்தை விடாமல் இருப்பது; அனுபவத்திலிருந்து நம்பிக்கை பெறுதல்.',
 'முழுமையான பொறுப்பைச் சுமப்பதற்குத் தயாராகும் மனப்பாங்கு; நிலையான பெயரை உருவாக்க விரும்புதல்.',
 'கவனமாகக் கேட்டு அறிவைப் பெருக்கும் விருப்பம்; உரையாடல் மற்றும் வழிகாட்டுதலுக்கு மதிப்பு.',
 'குழுவில் பங்களிப்பை ஒழுங்கமைக்கும் திறன்; ஒற்றுமைக்குப் பின்னால் இருக்கும் உழைப்பைப் புரிதல்.',
 'பழைய விதிகளைச் சோதித்துப் புதிய தீர்வு தேடுதல்; தனிப்பட்ட ஆராய்ச்சியைத் தொடர விருப்பம்.',
 'பொறுப்பையும் கொள்கையையும் இணைக்க முயற்சித்தல்; வேறுபட்ட கருத்துகளுக்கிடையே சமநிலை தேடுதல்.',
 'ஆழ்ந்து சிந்தித்த பின்னரே கருத்தை உறுதிப்படுத்தும் தன்மை; கடினமான பொறுப்பை அமைதியாக ஏற்றுக்கொள்ளல்.',
 'ஒரு பயணத்தை நிறைவு செய்து அடுத்த திசையைத் தேர்ந்தெடுக்க விரும்புதல்; பிறருக்கு வழி காட்டும் மென்மை.'
];
const MATTER_TA=[
 [
 ['Sun','உடல் நடவடிக்கை','தினசரி நடவடிக்கைகளில் தன்னம்பிக்கை வளர்ந்தாலும் ஓய்வையும் அளவாகப் பகிர்ந்துகொள்ளும் வழி உருவாகலாம்.','உடல் செயல்பாட்டிற்காகத் தேவையான நேரத்தை ஒதுக்காமல் பொறுப்புகளைத் தொடர்ந்து ஏற்கும்போது சோர்வு மேலோங்கக்கூடும்.'],
 ['Moon','மனநிலை','உணர்ச்சிகளைப் புரிந்துகொண்டு பேசும் திறன் தனிப்பட்ட உறவுகளை நெருக்கமாக்க உதவலாம்.','மற்றவர்களின் உணர்ச்சியைத் தனக்குள் எடுத்துக்கொள்வதால் முடிவுகளில் தேவையற்ற மன அழுத்தம் சேரலாம்.'],
 ['Sun','முகமும் வெளிப்பாடும்','மக்களைச் சந்திக்கும் சூழலில் தன்னுடைய கருத்தை உறுதியுடனும் மரியாதையுடனும் வெளிப்படுத்தும் முயற்சி வளரலாம்.','உள்ளுக்குள் இருக்கும் பதற்றம் முகபாவனையிலும் உரையாடும் வேகத்திலும் வெளிப்படுவதால் தவறாகப் புரிந்துகொள்ளப்படும் தருணங்கள் இருக்கலாம்.'],
 ['Saturn','நிலைத்த குணம்','அவசர வெற்றியை விட நம்பகமான செயல் முறையால் மதிப்பைப் பெறும் வழி உருவாகலாம்.','தன்னிடம் மிகுந்த கட்டுப்பாடு எதிர்பார்ப்பது மகிழ்ச்சியுடன் செய்யக்கூடிய செயலையும் கடமையாக மாற்றிவிடலாம்.'],
 ['Mars','எதிர்வினையும் துணிவும்','திடீர் சிக்கலில் விரைந்து உதவும் மன உறுதி வெளிப்படலாம்; செயலுக்கு முன் சூழலை அளவிடும் திறனும் வளர்க்கலாம்.','விரைவான எதிர்வினையை மற்றவர்கள் கடுமையான அணுகுமுறையாகப் புரிந்துகொள்ள வாய்ப்புள்ளதால் உரையாடலின் இடைவெளி முக்கியம்.']
 ],
 [
 ['Jupiter','தனச் சேர்க்கை','சம்பாதிப்பில் ஒரு பகுதியைத் திட்டமிட்டுச் சேமிப்பாக மாற்றும் திறன் வளரலாம்; குடும்பத்தின் நீண்டகாலத் தேவைகளை முன்கூட்டியே அறிந்து பணத்தை ஒதுக்க விரும்பலாம்.','வரவிற்கு இணையாகக் குடும்பத் தேவைகளும் பெருகுவதால் கையில் தங்கும் தொகை எதிர்பார்த்த அளவாக இருக்காமல் போகலாம்; சேமிப்பைத் தனியே பாதுகாக்க வேண்டியிருக்கும்.'],
 ['Jupiter','குடும்ப உறுப்பினர்கள்','குடும்பத்தினர் இடையே கருத்து வேறுபாடு வந்தபோதும் ஒருவருடைய தேவையை மற்றவருக்கு எடுத்துச் சொல்லும் பொறுப்பு உருவாகலாம்; பெரியோரின் ஆலோசனை இடம் பெறலாம்.','உறவினரின் செலவு அல்லது பொறுப்பைத் தனியாக ஏற்றுக்கொள்ளும் சூழல் சுமையாகலாம்; உதவிக்கு எல்லை அமைப்பதே உறவைப் பாதுகாக்கும் வழியாக இருக்கும்.'],
 ['Mercury','வாக்கால் வாழ்வாதாரம்','பேச்சுவார்த்தை, தகவல் பரிமாற்றம், கணக்கு அல்லது வாடிக்கையாளருடன் பழகும் திறன் சம்பாதிப்பிற்கான துணை வழியாக அமையலாம்.','சொன்ன வாக்குறுதிக்கும் எழுதப்பட்ட ஒப்பந்தத்திற்கும் வேறுபாடு ஏற்பட்டால் வருமானம் பாதிக்கப்படலாம்; தகவலை உறுதிப்படுத்தும் பழக்கம் தேவைப்படும்.'],
 ['Mercury','பேச்சின் பாங்கு','சூழலுக்கேற்ப சொற்களைத் தேர்ந்தெடுப்பதன் மூலம் எதிர்ப்புக் கருத்தையும் விளக்கிச் சொல்லும் திறன் வளரலாம்; நேர்த்தியான உரையாடல் ஒரு பலமாக அமையலாம்.','கோபத்தில் வேகமாகப் பேசுவது அல்லது குறையைச் சுட்டிக்காட்டும் முறை கடுமையாகத் தோன்றுவது உறவுகளில் இடைவெளியை உருவாக்கலாம்.'],
 ['Moon','உணவுப் பழக்கம்','உடலுக்கு ஏற்ற நேரத்தையும் அளவையும் கவனித்துச் சாப்பிடும் ஒழுங்கு நீண்டகால நலனுக்குத் துணையாகலாம்.','வேலைப்பளு அல்லது மனச் சோர்விற்கு ஏற்ப உணவு நேரம் மாறும்போது பழக்கத்தைத் திரும்ப ஒழுங்குபடுத்த வேண்டியிருக்கும்.'],
 ['Venus','திருமணத்திற்குப் பின் குடும்பம்','இரு குடும்பங்களின் தேவைகளைக் கேட்டறிந்து செலவையும் பொறுப்பையும் பகிர்வதில் புதிய உடன்பாடு உருவாக்கும் திறன் இருக்கலாம்.','திருமணத்திற்கு முன் பழகிய குடும்பச் செலவு முறையும் பின்னர் உருவாகும் தேவைகளும் மாறுபட்டால் உரையாடலின் மூலம் ஒழுங்கமைக்க வேண்டியிருக்கும்.'],
 ['Sun','முகம், வாய், பற்கள்','தனிப்பட்ட தோற்றத்தையும் வாய்ச் சுகாதார ஒழுங்கையும் பராமரிப்பதில் கவனம் செலுத்துவது அன்றாட நம்பிக்கைக்கு உதவலாம்.','பணி நேரம் சீரற்றபோது உணவு, பற்கள் பராமரிப்பு போன்ற அடிப்படைப் பழக்கங்கள் பின்தங்காமல் பார்த்துக்கொள்ள வேண்டியிருக்கும்.'],
 ['Mars','உணவு, புகை, மது பற்றிய முடிவுகள்','உணவுச் சுவை மற்றும் தனிப்பட்ட பழக்கங்களைச் சுயமாகத் தேர்வுசெய்ய விரும்பும் சூழல் இருக்கலாம்; உடல் நலத்திற்கு ஏற்ற முடிவைத் தானே பரிசீலிப்பது முக்கியம்.','ஒரு கிரக அமைப்பை மட்டும் வைத்து மாமிச உணவு, புகை அல்லது மதுப் பழக்கம் இருப்பதாக முடிவு செய்ய முடியாது; பழக்கம் இருந்தால் அதன் நடைமுறை விளைவையே கருத்தில் கொள்ள வேண்டும்.']
 ],
 [
 ['Mars','தனித்த முயற்சி','சிறிய பணியைத் தொடர்ந்து பயிற்சி செய்து பிறர் உதவியில்லாமல் முடிக்கும் திறன் வளரலாம்.','அடிக்கடி திட்டத்தை மாற்றுவதால் முடிக்கப்பட்ட வேலைகளை விடத் தொடங்கிய வேலைகள் அதிகமாகிவிடலாம்.'],
 ['Mercury','எழுத்தும் தகவலும்','வழிகாட்டும் குறிப்புகள், தகவல் பதிவு, செய்தி பரிமாற்றம் போன்ற வழிகளில் திறமையை வெளிப்படுத்தலாம்.','சொல்ல வந்த கருத்தைச் சரியாகப் பதிவு செய்யாததால் புரிதல் பிழைகள் ஏற்படும் சூழலைக் குறைக்க வேண்டியிருக்கும்.'],
 ['Mars','உடன்பிறப்புகளுடன் உறவு','பரஸ்பரம் உதவும் வேலைகளின் மூலம் சகோதர உறவுகள் நெருக்கமாகப் பேணப்படலாம்.','ஒரே குடும்பப் பொறுப்பை யார் ஏற்க வேண்டும் என்ற விவாதம் நீளும்போது தனிப்பட்ட எல்லைகள் உதவக்கூடும்.'],
 ['Sun','தைரியமும் நிலைப்பாடும்','தக்க சமயத்தில் தன் கருத்தை வெளியிடும் துணிவு புதிய வாயில்களைத் திறக்கலாம்.','ஆர்வத்தில் உடனடி உறுதி அளித்த பிறகு நேரமும் வளமும் குறைவாக இருப்பது தெரியவரலாம்.'],
 ['Mars','கைகள், தோள்கள், இயக்கம்','செயல்பாட்டு பயிற்சி, கைத்திறன் அல்லது விளையாட்டு வழியாக இயங்கும் திறனை மேம்படுத்த ஆர்வம் தோன்றலாம்.','அவசர அசைவுகளிலும் அதிகப் பயிற்சியிலும் உடலின் சௌகரிய எல்லையை மதிப்பது முக்கியம்.']
 ],
 [
 ['Moon','தாயாருடன் உறவு','வீட்டில் பரஸ்பரம் கேட்டு முடிவெடுக்கும் நடைமுறை குடும்பத்தினருக்குப் பாதுகாப்பு உணர்வை அளிக்கலாம்.','குடும்பத்தினரின் உணர்ச்சிப் பாரத்தை ஒருவரே சுமப்பதால் சொந்த மன ஓய்வு குறையலாம்.'],
 ['Venus','வீடு மற்றும் வசதி','வாழும் இடத்தை வசதியாகவும் பராமரிக்க எளிமையாகவும் அமைத்துக்கொள்வதில் மகிழ்ச்சி கிடைக்கலாம்.','அழகுக்கான செலவுகளும் அத்தியாவசிய வீட்டு செலவுகளும் கலந்துவிட்டால் திட்டமிட்ட செலவு வரம்பு உதவும்.'],
 ['Mars','நிலம், சொத்து, ஆவணம்','சொத்து தொடர்பான ஆவணங்களைச் சரிபார்த்து நீண்டகாலத் திட்டத்தை வகுப்பதில் உறுதி வளரலாம்.','கையொப்பம், பங்கீடு அல்லது பழைய பதிவுகள் தெளிவாக இல்லாவிட்டால் பெரிய முடிவைத் தாமதித்து உறுதிப்படுத்த வேண்டியிருக்கும்.'],
 ['Moon','மன அமைதி','வீட்டில் தனக்கான அமைதியான நேரத்தை உருவாக்கிக்கொள்வது பிற பொறுப்புகளையும் தெளிவாகக் கையாள உதவலாம்.','வீட்டுப் பிரச்சினையை வேலை நேரத்திற்கும் கொண்டு சென்றால் இரண்டிலும் கவனம் சிதற வாய்ப்புள்ளது.'],
 ['Mercury','அடிப்படைக் கல்வி','பழக்கமான சூழலில் முறையான குறிப்பெடுக்கும் பயிற்சி புதிய அறிவைக் கற்றுக்கொள்வதை எளிதாக்கலாம்.','ஒரே நேரத்தில் பல பணிகள் சேரும்போது அடிப்படைப் பயிற்சிக்கு இடைவெளி ஏற்பட்டு மீண்டும் தொடங்க வேண்டியிருக்கும்.']
 ],
 [
 ['Jupiter','கல்வி, கருத்தறிவு','படித்ததைத் தனக்கான புரிதலுடன் இணைத்து மற்றவருக்கும் விளக்கிச் சொல்லும் திறன் வளரலாம்.','திறன் இருந்தபோதும் எந்தத் துறையில் ஆழப்பட வேண்டும் என்ற குழப்பத்தால் பயிற்சி திசை மாறலாம்.'],
 ['Mercury','நினைவுத் திறன்','குறிப்புகள், மறுபயிற்சி மற்றும் நடைமுறை எடுத்துக்காட்டுகள் வழியாகக் கற்றதை நினைவில் நிலைநிறுத்த முடியும்.','பெரிய அளவில் தகவல் சேரும்போது முன்னுரிமைப்படுத்தி மீண்டும் படிக்கும் முறை தேவைப்படும்.'],
 ['Jupiter','குழந்தைகள் மற்றும் வழிகாட்டல்','குழந்தைகள் அல்லது இளையோரின் கேள்விகளுக்கு பொறுமையாகப் பதிலளித்து அவர்களின் முயற்சிக்கு ஆதரவளிக்க விருப்பம் இருக்கலாம்.','குழந்தைகளிடம் தன் எதிர்பார்ப்பை அப்படியே அமல்படுத்தும்போது அவர்களது தனித்த ஆர்வத்துடன் முரண்பாடு தோன்றலாம்.'],
 ['Venus','படைப்பாற்றல்','கலை, இசை, வடிவமைப்பு அல்லது தனித்த விருப்பப் பயிற்சியில் நேரம் செலவிடுவது மனநிறைவாக மாறலாம்.','படைப்புப் பணியின் முடிவை விரைவில் மதிப்பிடுவதால் தொடர்ச்சியான பயிற்சிக்கு இடையூறு நேரலாம்.'],
 ['Mercury','ஆலோசனை, திட்டமிடல்','ஒரு யோசனையைச் சிறிய முயற்சியாகச் சோதித்து அதன் பயனை அறிந்த பின்னரே விரிவாக்க விரும்பலாம்.','திடீர் ஆதாயம் கிடைக்கும் என்ற எதிர்பார்ப்பில் பரிசீலிக்காத செலவை ஏற்காமல் இருப்பது உதவும்.']
 ],
 [
 ['Mars','சவால் மற்றும் போட்டி','கடினமான பிரச்சினையைக் கட்டங்களாகப் பிரித்து சரிசெய்யும் முயற்சியில் பணித் திறன் வெளிப்படலாம்.','மற்றவரின் தவறுக்கான பொறுப்பையும் தனியே ஏற்றுக்கொள்ளும்போது வேலைப்பளு அளவுக்கு மீறலாம்.'],
 ['Saturn','பணி ஒழுங்கு','தொடர்ச்சியாக முடிக்கும் சிறிய பொறுப்புகள் நீண்டகால நம்பகத்தன்மையாக உருவாகலாம்.','ஓய்வு நேரத்தை கணக்கில் கொள்ளாமல் கடமைகளை ஏற்றால் வேலைத் தரம் மாறுபடலாம்.'],
 ['Mars','கடன், செலுத்துதல்','கட்டணத் தேதிகளையும் தேவையான செலவுகளையும் முன்கூட்டியே ஒழுங்கமைப்பதன் மூலம் நிதிச் சுமையைக் கட்டுப்படுத்த முடியும்.','சரிபார்க்கப்படாத நிபந்தனை அல்லது திடீர் கடன் குடும்பத் திட்டத்தையும் பாதிக்கக்கூடும்.'],
 ['Mercury','வேலை தொடர்பான வாதம்','ஆவணங்கள் மற்றும் தெளிவான தகவல் பரிமாற்றம் மூலம் கருத்து வேறுபாட்டை நடைமுறைத் தீர்விற்கு அழைத்துச் செல்லலாம்.','தவறாகப் புரிந்துகொள்ளப்பட்ட வார்த்தையால் நீண்ட விவாதம் உருவாக வாய்ப்புள்ளதால் பதிவு பாதுகாப்பு உதவும்.'],
 ['Sun','உடல்நல ஒழுங்கு','உறக்கம், இயங்கும் நேரம், உணவு ஆகியவற்றை முறையாக வைத்துக்கொள்வது நாளாந்தச் செயல்திறனைத் தாங்கலாம்.','அறிகுறிகளை கிரகநிலையால் மட்டும் விளக்காமல் உண்மையான உடல்நலத் தேவைக்கான நேரடி மருத்துவ ஆலோசனை அவசியம்.']
 ],
 [
 ['Venus','திருமணத்தில் புரிதல்','தன் விருப்பத்தையும் துணைவரின் தேவையையும் வெளிப்படையாகப் பகிர்வது நம்பிக்கை வளர்க்கும் வழியாக அமையலாம்.','உரையாடாமல் எதிர்பார்ப்புகளை உள்ளுக்குள் வைத்துக்கொள்வதால் சிறிய வேறுபாடு பெரிய மனக்கசப்பாக மாறலாம்.'],
 ['Jupiter','துணைவர் குடும்பத் தொடர்பு','இரு குடும்பங்களின் பழக்கங்களை மதித்து ஒற்றுமைக்கான நடைமுறையை உருவாக்க முடியும்.','குடும்பத்தினரின் தலையீட்டிற்கும் தம்பதிகளின் தனி முடிவிற்கும் எல்லை தேவைப்படலாம்.'],
 ['Mercury','கூட்டுத் தொழில் ஒப்பந்தம்','வேலைப் பங்கு, வரவு பகிர்வு மற்றும் பொறுப்புகளை எழுதிப் பதியும்போது கூட்டுறவு தெளிவடையலாம்.','வாய்வழி ஒப்பந்தங்கள் மாறுபட்டால் பணமும் நம்பிக்கையும் பாதிக்கப்படும் வாய்ப்பு இருக்கும்.'],
 ['Venus','அன்பும் நேரமும்','ஒன்றாகச் செலவிடும் சிறிய நேரங்களே நெருக்கத்தைப் பேணும் முக்கியமான பழக்கமாக மாறலாம்.','வேலை நேரமும் தனிப்பட்ட ஓய்வும் தொடர்ந்து மோதினால் உறவிற்கு உரிய நேரம் ஒதுக்க வேண்டியிருக்கும்.'],
 ['Sun','பொதுவெளி தொடர்பு','மற்றவர்களின் முன்னிலையில் சமமான மரியாதையுடன் செயல்படுவது குடும்பத்திற்கும் தொழிலுக்கும் நற்பெயரை வளர்க்கலாம்.','வெளியில் காட்டும் உறுதியான கருத்து வீட்டிற்குள் கட்டளையாகத் தோன்றாமல் பார்க்க வேண்டியிருக்கும்.']
 ],
 [
 ['Saturn','எதிர்பாராத மாற்றங்கள்','பழைய ஏற்பாடு பலனளிக்காதபோது அதை நிதானமாகச் சீரமைக்கும் திறன் வளரலாம்.','திடீரென வரும் புதிய பொறுப்பு ஏற்கெனவே உள்ள திட்டத்தை மாற்ற வேண்டிய சூழலைத் தரலாம்.'],
 ['Jupiter','பகிர்ந்த பணமும் சொத்தும்','பங்கீடு, காப்பீடு, பரம்பரை ஆவணங்கள் போன்றவற்றில் தெளிவான பதிவுகள் வைத்திருப்பது பாதுகாப்பான நடைமுறையாகலாம்.','பிறரின் தகவலை நம்பி உறுதி அளிப்பதற்கு முன் உரிமை மற்றும் பொறுப்பைச் சரிபார்க்க வேண்டியிருக்கும்.'],
 ['Mercury','ஆய்வு, ரகசியத் தகவல்','ஆழமாகத் தேடிப் புரிந்து கொள்வதற்கான ஆர்வம் தொழில்திறன் அல்லது தனிப்பட்ட அறிவாக மாறலாம்.','போதுமான சான்று இல்லாத சந்தேகத்தை முடிவாக ஏற்றுக்கொண்டால் தேவையற்ற மனசுமை சேரலாம்.'],
 ['Moon','உள்மாற்றம்','கடந்து வந்த சவால்களின் அனுபவத்தைப் புதிய வாழ்க்கைத் திட்டத்திற்கு பயன்படுத்தலாம்.','முடிவடைந்த நிகழ்வை மனதில் மீண்டும் மீண்டும் நிகழ்த்துவதால் அடுத்த வாய்ப்பைக் காணாமல் போகலாம்.'],
 ['Saturn','நீடித்த உடல் பராமரிப்பு','நீண்டகால நலனுக்கான சீரான பழக்கம் முக்கியம் பெறலாம்; சிறிய மாற்றத்தைத் தொடர்ந்து பேணுவது பயனுள்ளதாக இருக்கும்.','நோய் அல்லது ஆயுள் குறித்து உறுதியான ஜோதிடத் தீர்ப்பை எழுதாமல், உண்மையான உடல்நல மதிப்பீட்டையே அடிப்படையாகக் கொள்ள வேண்டும்.']
 ],
 [
 ['Jupiter','தந்தை, பெரியோர்','வழிகாட்டியோரின் அனுபவத்திலிருந்து தன் வாழ்க்கைக்கு ஏற்ற பகுதியைத் தேர்ந்தெடுக்கலாம்.','பெரியோர் கூறிய பாதையும் சொந்த விருப்பமும் மாறுபட்டால் மரியாதையுடன் கருத்தை விளக்க வேண்டியிருக்கும்.'],
 ['Jupiter','உயர்கல்வி','புதிய துறை கற்றல் அல்லது சான்றிதழ் பெறும் முயற்சியை வாழ்க்கைப் பொறுப்புடன் இணைக்க முடியும்.','பயிற்சிக்கான நேரமும் செலவும் சரியாக அமைக்கப்படாவிட்டால் கற்றல் நீளலாம்.'],
 ['Sun','நீதி, கொள்கை','சொந்த முடிவுகளில் நேர்மையைப் பேணுவது மற்றவர்களின் நம்பிக்கையை வளர்க்கலாம்.','கொள்கையில் மிகுந்த கடுமை காட்டும்போது வேறுபட்ட சூழலுக்குத் தேவையான நெகிழ்ச்சி குறையலாம்.'],
 ['Rahu','தொலைதூர வாய்ப்புகள்','புதிய இடம் அல்லது வேறுபட்ட மனிதர்களுடன் பழகுவதன் மூலம் புதிய அறிவைப் பெறலாம்.','பயண ஏற்பாடு அல்லது வெளியூர் வாய்ப்பை முழுமையாகச் சரிபார்க்காமல் நிதிப் பொறுப்பை ஏற்க வேண்டாம்.'],
 ['Jupiter','நம்பிக்கை, ஆன்மிகம்','வாழ்க்கையின் நோக்கத்தைப் பற்றி சிந்தித்துப் பிறருக்குப் பயன்படும் பணியில் ஈடுபட விருப்பம் இருக்கலாம்.','பழக்கமான நம்பிக்கையைப் பற்றிய கருத்து வேறுபாடு உறவுகளை பாதிக்காத வகையில் மரியாதை பேணுவது நல்லது.']
 ],
 [
 ['Mercury','தொழிலின் தன்மை','தகவல், கணக்கு, எழுத்து, வாடிக்கையாளர் அல்லது ஒருங்கிணைப்பு சார்ந்த திறன்களைப் பயன்படுத்தும் வாய்ப்புகளில் நன்மை காணலாம்.','பணித் திட்டம் தெளிவாக இல்லாமல் பல பொறுப்புகளை ஏற்றால் முடித்த வேலைக்கான அங்கீகாரம் தாமதிக்கலாம்.'],
 ['Sun','பொறுப்பு, அதிகாரம்','முடிவின் பொறுப்பை ஏற்று பிறருக்கு வழிகாட்டும் பணியில் நம்பிக்கை பெறலாம்.','அதிகார எல்லையும் பொறுப்பின் அளவும் தெளிவில்லாவிட்டால் பணியிடத்தில் கருத்து வேறுபாடு உண்டாகலாம்.'],
 ['Saturn','நீண்டகாலத் தொழில் வளர்ச்சி','தொடர்ச்சியான செயல்பாடும் தரமான வேலைப்பழக்கமும் நிலையான பெயரை உருவாக்க உதவலாம்.','உடனடியாகப் பலன் தெரியாத உழைப்பால் மனச்சோர்வு வந்தால் இலக்கை இடைநிலைப் படிகளாக மாற்றுவது உதவும்.'],
 ['Mars','செயல்பாட்டுத் திறன்','சிக்கலான பணியில் உடனடி செயல் திட்டத்தை உருவாக்கி அணியுடன் செயல்படுத்தும் திறன் வெளிப்படலாம்.','அவசர முடிவால் மற்றவர்களின் வேலை நேரத்தை பாதிக்காதவாறு செயல் வரிசையைத் திட்டமிட வேண்டியிருக்கும்.'],
 ['Jupiter','பணிநிலை, மதிப்பு','அனுபவத்தைப் பகிர்ந்து பயிற்சி அளிப்பது தனிப்பட்ட மதிப்பையும் தொழில் வாய்ப்பையும் வளர்க்கலாம்.','மற்றவரின் உயர்வுக்கு உதவும்போது சொந்தத் திறன் வளர்ச்சிக்கான நேரத்தையும் ஒதுக்க வேண்டியிருக்கும்.']
 ],
 [
 ['Jupiter','வருமான வளர்ச்சி','ஒரு வேலை மூலமான வருமானத்துடன் கற்ற திறன்கள் அல்லது நம்பகமான தொடர்புகள் துணை வழியாக அமையலாம்.','வரவேண்டிய தொகையும் உண்மையில் பெறப்பட்ட தொகையும் வேறுபடும்போது செலவுத் திட்டம் சிரமப்படலாம்.'],
 ['Mercury','வாடிக்கையாளர், வலையமைப்பு','பழைய தொடர்புகளைப் பேணி புதியவர்களுடன் தெளிவாகப் பேசுவதன் மூலம் வாய்ப்புகளை விரிவுபடுத்தலாம்.','ஒரே சமயத்தில் பல வாக்குறுதிகளை அளிப்பதால் நம்பிக்கை பாதிக்கப்படாமல் கால அளவை முன்பே தீர்மானிக்க வேண்டும்.'],
 ['Jupiter','மூத்த உடன்பிறந்தோர்','அனுபவம் வாய்ந்த உறவினருடன் பேசி அவரவர் தேவைக்கேற்ப உதவியைப் பகிர்ந்து கொள்ளலாம்.','ஒவ்வொருவரின் தனிப்பட்ட பணப் பொறுப்பையும் தெளிவுபடுத்தாவிட்டால் உறவில் அழுத்தம் உருவாகலாம்.'],
 ['Moon','நண்பர்கள்','நம்பிக்கையுடன் பகிரக்கூடிய நட்பு வட்டம் மன உறுதியையும் புதிய அறிவையும் அளிக்கலாம்.','அனைவரின் எதிர்பார்ப்பையும் நிறைவேற்ற நினைப்பதால் சொந்தத் திட்டம் பின்னுக்குத் தள்ளப்படலாம்.'],
 ['Sun','நீண்டகால இலக்கு','அடைய வேண்டிய இலக்கைத் தெளிவாகக் குறித்துச் சிறிய முன்னேற்றங்களைப் பதிவுசெய்வது உற்சாகம் அளிக்கலாம்.','வெளிப்படையான அங்கீகாரத்தை மட்டுமே வெற்றியாகக் கருதினால் பயனுள்ள இடைநிலை வளர்ச்சியைத் தவறவிடலாம்.']
 ],
 [
 ['Saturn','செலவுக் கட்டுப்பாடு','அத்தியாவசியம், விருப்பம், எதிர்பாராத தேவை எனச் செலவைப் பிரிப்பதால் நிதியில் தெளிவு உருவாகலாம்.','சிறுசிறு செலவுகள் சேர்ந்து அதிகமாகும் நிலையைக் கண்காணிக்காவிட்டால் சேமிப்பு சுருங்கலாம்.'],
 ['Moon','உறக்கம், ஓய்வு','நாளின் முடிவில் அமைதியான நேரத்தை ஒதுக்குவது வேலைக்கும் குடும்பத்திற்கும் புத்துணர்வைத் தரலாம்.','பணி நினைவுகளையும் முடிக்காத வேலைகளையும் ஓய்வு நேரத்திற்குக் கொண்டு வருவது மனநிம்மதியைக் குறைக்கலாம்.'],
 ['Rahu','அந்நியத் தொடர்பு','வேறுபட்ட மொழி அல்லது சூழலைக் கற்றுக்கொள்வது வெளியூர் தொடர்புகளில் பயன்படலாம்.','புதிய இடத்தில் கிடைக்கும் வாய்ப்பை ஏற்கும் முன் ஒப்பந்தம், செலவு, குடும்பச் சூழலை ஒப்பிட்டுப் பார்க்க வேண்டும்.'],
 ['Venus','தனிநேரம், உறவுச் சமநிலை','தனிப்பட்ட விருப்பங்களுக்காக அளவான நேரம் வைத்திருப்பது நெருங்கிய உறவுகளிலும் பொறுமையை வளர்க்கலாம்.','தனிமைக்கான தேவை பற்றி திறந்துபேசாவிட்டால் மற்றவர்கள் அதைத் தவிர்க்கும் மனப்பான்மையாகப் புரிந்துகொள்ளலாம்.'],
 ['Saturn','சேவை, மன அமைதி','மற்றவருக்குச் செய்யும் உதவியைத் தன் திறன் வரம்பிற்குள் தொடர்ந்து செய்வது உள்ளார்ந்த நிறைவைக் கொடுக்கலாம்.','அளவுக்கு மீறிய சேவைப்பொறுப்பால் தன்னுடைய தேவைகள் புறக்கணிக்கப்படாமல் கவனிக்க வேண்டியிருக்கும்.']
 ]
];
const MATTER_EN=[
 ['body and everyday energy','emotional response','outward expression','reliable conduct','reaction to challenges'],
 ['wealth and savings','family duties','earnings through speech','tone of speech','food routines','family after marriage','mouth and dental care','personal choices around food or substances'],
 ['practical initiative','writing and information','siblings','courage','arms and movement'],
 ['mother and caregiving','home comfort','property decisions','peace of mind','foundational learning'],
 ['education','memory','children and mentoring','creativity','planning'],
 ['competitive work','discipline','loans and repayment','disputes','wellbeing routines'],
 ['marital understanding','in-laws and family ties','business agreements','affection and time','public cooperation'],
 ['restructuring','shared finances','research','emotional resilience','long-term physical care'],
 ['parents and mentors','higher learning','principles','long-distance opportunities','belief and service'],
 ['job skills','authority','career sustainability','execution','professional standing'],
 ['income growth','clients','elder siblings','friendships','long-term aims'],
 ['spending','sleep','overseas connections','private time','voluntary service']
];
const TA_DEST=['தனிப்பட்ட தேர்வுகள்','குடும்பச் செலவுகள்','எழுத்து மற்றும் முயற்சி','வசிப்பிடமும் பராமரிப்பும்','கல்வி மற்றும் இளையோர்','வேலைப் போட்டி','கூட்டாக எடுக்கும் முடிவு','பகிர்ந்த ஆவணங்கள்','வழிகாட்டலும் பயணமும்','பணி மற்றும் பொதுப் பொறுப்பு','நட்பு மற்றும் வரவு','செலவும் தனிநேரமும்'];
const EN_DEST=['personal initiative','household finances','written communication','home responsibilities','learning and children','work pressure','agreements','shared records','study and distance','career duties','income and contacts','spending and rest'];
function matterSupport(c,karaka){const a=(c.all||[]).find(x=>x.relation==='karaka'&&x.planet===karaka)||(c.all||[]).find(x=>x.planet===karaka);
const measured=a?Number(a.delta):0;return c.conclusion==='support'&&measured>=-.15?'support':c.conclusion==='strain'||measured<-.30?'strain':'mixed';}
function paragraphNoCalc(c,entry,idx,lang,star){const ta=lang!=='en',typ=matterSupport(c,entry[0]),chosen=typ==='support'?entry[2]:typ==='strain'?entry[3]:idx%2?entry[3]:entry[2];
 if(ta)return chosen;
 const domain=MATTER_EN[c.house-1][idx]||'this matter';const move=typ==='support'?'can be developed with practical support':typ==='strain'?'may require deliberate safeguards':'can change according to responsibilities and available support';
 const cross=star?.houses?.[c.house]?.lordStar?.rulerHouse;
 return `In ${domain}, the chart's traditional reading suggests a pattern that ${move}${cross&&cross!==c.house?`, especially where ${EN_DEST[cross-1]} intersect with it`:''}. The concrete outcome depends on choices and circumstances rather than a fixed event.`;
}
const GRAHA_MIND_TA={
 Sun:'தன்னுடைய முடிவு வெளியில் எவ்வாறு மதிக்கப்படும் என்ற விழிப்புணர்வும் தன்மானமும் பொறுப்புணர்வோடு கலக்கலாம்',
 Moon:'தனக்கான அமைதியையும் பிறருடைய மனநிலையையும் ஒரே நேரத்தில் கவனிக்க வேண்டியிருக்கும்',
 Mars:'விரைந்து செயலில் இறங்கும் உந்துதலை நீண்டகாலத் திட்டத்துடன் ஒத்திசைக்க முயற்சிப்பார்',
 Mercury:'கேள்வி கேட்டு உறுதி செய்யும் அறிவு, கணக்கு, சொற்களின் துல்லியம் ஆகியவற்றில் ஈடுபாடு உயரலாம்',
 Jupiter:'முடிவின் நியாயத்தையும் நீண்டகாலப் பயனையும் முதலில் மதிப்பிடும் இயல்பு மேலோங்கலாம்',
 Venus:'உறவின் ஒற்றுமையையும் வசதியையும் இழக்காமல் கடமையை நிறைவேற்ற முயற்சிப்பார்',
 Saturn:'தன் கடமையை ஏற்ற பிறகே உரிமையை கோரும் பொறுமையும் நீண்டகால நினைப்பும் செயல்படலாம்',
 Rahu:'வழக்கமில்லாத வாய்ப்பை ஏற்கும் முன் அதன் விளைவுகளைப் பரிசீலிக்க வேண்டும் என்ற தேடல் எழலாம்',
 Ketu:'வெளிப்படையான வெற்றியைவிடத் தனக்குப் பொருள் உள்ள பணியைத் தேர்வது முக்கியமாகலாம்'
};
const GRAHA_LIFE_EN={
 Sun:'recognition, leadership and personal accountability',Moon:'emotional steadiness and family needs',
 Mars:'initiative and the pace of decisions',Mercury:'speech, study, writing and practical accounting',
 Jupiter:'mentoring, learning and long-term judgement',Venus:'relationships and agreements',
 Saturn:'enduring obligations and patience',Rahu:'unfamiliar opportunities and critical verification',
 Ketu:'simplification and obligations that should be completed'
};
const GRAHA_MIND_EN={
 Sun:'attention to how responsibility is recognized',Moon:'awareness of the emotional needs of close people',
 Mars:'urgency to turn an idea into action',Mercury:'the habit of questioning and checking information',
 Jupiter:'the wish to understand the purpose of a decision',Venus:'sensitivity to harmony and consent',
 Saturn:'preference for durable commitments over quick recognition',Rahu:'interest in unconventional solutions',
 Ketu:'the inclination to withdraw from distractions'
};
function aspectLife(a,ta,domain){
 if(!a)return '';
 const qualifier=a.combust||a.closeRahu;
 const near=a.orb!==null&&a.orb<=5;
 if(ta){
  const implication=GRAHA_MIND_TA[a.from]||'';
  const base=qualifier?`${actor(a.from,true)} தொடர்பு இருந்தாலும் அந்தக் கிரகத்தின் அஸ்தமனம் அல்லது ராகு நெருக்கம் காரணமாக அதன் தாக்கத்தை முழு வலிமையுடன் எடுத்துக்கொள்ள இயலாது. ${implication}`:
  `${actor(a.from,true)} வழங்கும் தொடர்பின் வழியாக ${implication}`;
  return near&&!qualifier?`${base}. பாகை நெருக்கமும் அதிகம் என்பதால் இந்தத் தன்மை குறிப்பாகக் கணக்கில் எடுத்துக்கொள்ளப்படுகிறது.`:`${base}.`;
 }
 return `${GRAHA_LIFE_EN[a.from]||a.from} color ${domain}${qualifier?' but the source planet is combust or closely associated with Rahu, so this influence is qualified':''}${near&&!qualifier?'; the verified angular proximity makes it a closer witness':''}.`;
}
function ascendantStarReading(star,ta){const l=star?.lagna,who=l?.star;if(!who)return [];
 const planet=ta?actor(l.starRuler,true):l.starRuler;
 const focus=ta?TA_DEST[(l.rulerHouse||1)-1]:EN_DEST[(l.rulerHouse||1)-1];
 const own=['own','exalted'].includes(l.rulerDignity),weak=l.rulerDignity==='debilitated';
 const result=[];
 if(ta){
  result.push(`லக்னப்புள்ளி ${who.ta} ${who.pada||'?'}-ஆம் பாதத்தின் பாரம்பரிய இயல்புடன் சேர்ந்துள்ளது. அதன் நட்சத்திரநாதனான ${planet} வழியாக ${focus} தொடர்பான வாழ்க்கை அனுபவங்களைத் தனித்தன்மையுடன் அணுகும் எண்ணம் உருவாகலாம்; உடனடியாகப் பலனை மட்டுமே தேடுவதற்குப் பதிலாகச் செயல் முறையைத் தானே தீர்மானிக்க விரும்பலாம்.`);
  result.push(own?`இந்த நட்சத்திரநாதனின் சொந்த/உச்ச ராசி ஆதரவு காரணமாக, பொறுப்பு ஏற்ற முடிவைத் தொடர்ந்து கொண்டு செல்லும் உறுதி உருவாகலாம். ${l.rulerRetrograde?'வக்ரநிலை இருப்பதால் தொடங்கிய முயற்சியின் நோக்கத்தையே மீண்டும் ஆராய்ந்து பழைய அனுபவத்தைப் பயன்படுத்தும் இயல்பும் இணைகிறது.':'முன்னர் வகுத்த திட்டத்தையும் நடைமுறைச் சூழலையும் ஒப்பிட்டு முன்னேறுவது முக்கியமாகலாம்.'}`:
   weak?`நட்சத்திரநாதனின் நீசநிலை காரணமாக மனம் விரும்பியதை நடைமுறைப்படுத்துவதற்கு முன் வெளிப்புற உதவி அல்லது திட்டமிடல் தேவைப்படலாம். ஒரே தடையைத் தனிப்பட்ட தோல்வியாகக் கருதாமல் வழிமுறையை மாற்றிக்கொள்ளும் போக்கு முக்கியமாகும்.`:
   `நட்சத்திரநாதனின் இருப்பிடம் தொடர்புடைய பல்வேறு பொறுப்புகள் முடிவெடுக்கும் முறையை மாற்றக்கூடும். ${l.rulerRetrograde?'முன்னர் நிறுத்திய முயற்சியை மீண்டும் தொடங்குவதற்கான உள்ளார்ந்த ஆய்வு கூடலாம்.':'மற்றவர்களின் எதிர்பார்ப்பைக் கேட்டபின் சொந்த முடிவிற்கு வர முயல்வார்.'}`);
 }else{
  result.push(`The ascendant falls in ${who.en}, pada ${who.pada||'unknown'}; its stellar ruler is ${planet}. The native may approach personal choices through the practical demands of ${focus}.`);
  result.push(own?'The stellar ruler has a strong sign dignity, pointing to a traditional preference for consistency and ownership of commitments.':weak?'Weak sign dignity of this ruler calls for a more qualified reading of initiative and self-assurance.':'The ruler has neither verified own/exalted nor debilitated sign dignity, so other natal influences must modify the reading.');
  if(l.rulerRetrograde)result.push('Retrograde motion may be read traditionally as a tendency to reconsider an earlier decision rather than move forward unquestioningly.');
 }
 const strong=(l.rulerAspects||[]).filter(a=>!a.qualified),weakAspects=(l.rulerAspects||[]).filter(a=>a.qualified);
 // Every aspect first passes the graha-drishti sign test. Degree orb is a separate refinement.
 if(strong.length)result.push((ta?'நட்சத்திரநாதனைப் பார்க்கும் கிரகங்களின் செயல்படும் குணங்கள்: ':'Stellar ruler aspects: ')+strong.slice(0,3).map(a=>aspectLife(a,ta,'decisions')).join(' '));
 if(weakAspects.length)result.push((ta?'முழு வலிமையுடன் கருத முடியாத தொடர்பு: ':'Qualified aspects: ')+weakAspects.slice(0,2).map(a=>aspectLife(a,ta,'decisions')).join(' '));
 return result.filter(Boolean);
}
function lagnaBodyMindReading(star,lang){const l=star?.lagna;if(!l?.lord)return [];
 const ta=lang!=='en',p=l.lord,planet=ta?actor(p,true):p,scene=l.lordHouse?TA_DEST[l.lordHouse-1]:null;
 const occupants=(l.occupants||[]),conj=(l.lordConjunctions||[]),aspects=(l.lordAspects||[]);
 const all=[];
 if(ta){
   const theme={Sun:'தன்னம்பிக்கையை வெளிக்காட்டும் விதமும் மற்றவர் அளிக்கும் மதிப்பும்',Moon:'மனதின் ஏற்றத்தாழ்வையும் நெருங்கியோரின் தேவைகளையும் சமாளிக்கும் பாங்கும்',Mars:'விரைவாகச் செயல்படும் வேகத்திற்கும் பொறுமைக்கும் உள்ள சமநிலையும்',Mercury:'தகவலைக் கேட்டறிந்து முடிவெடுக்கும் நுணுக்கமும்',Jupiter:'நியாயம், நம்பிக்கை மற்றும் அறிவைப் பகிரும் மனப்பான்மையும்',Venus:'உறவுகளோடு இசைந்து தன் விருப்பத்தைப் பாதுகாக்கும் குணமும்',Saturn:'கடமைக்கு முன்னுரிமை தரும் அமைதியான உறுதியும்'}[p]||'சுய முடிவுகளும்';
   all.push(`லக்னாதிபதியின் பிறப்பு நிலையால் ${theme} வாழ்க்கைத் தேர்வுகளில் பிரதிபலிக்கலாம். ${scene?scene+' வழியாக அனுபவம் சேரும்போது இந்தப் பழக்கம் வெளியில் தெரியலாம்.':''}`);
   if(occupants.length)all.push(`லக்னத்தில் நேரடியாகக் கிரகங்கள் இருப்பதால் தனிப்பட்ட செயல்பாட்டில் ${occupants.map(x=>GRAHA_MIND_TA[x]).filter(Boolean).join('; ')}. இந்தத் தன்மைகளைப் பிறப்பு லக்னம் மட்டுமே தரும் பொதுப் பலனுடன் கலக்காமல் தனியாகக் கவனிக்க வேண்டும்.`);
   if(l.aspects?.length)all.push(`லக்னத்தின் மீது உள்ள பார்வைத் தொடர்பு காரணமாக ${l.aspects.map(x=>aspectLife(x,true,'self')).join(' ')} இது குணநலன் மட்டும் அல்லாமல் முடிவு எடுக்கும் வேகம், செயலில் காட்டும் பொறுமை, பிறரிடம் பேசும் முறையிலும் வெளிப்படலாம்.`);
   if(conj.length)all.push(`லக்னாதிபதியோடு அதே ராசியில் அமைந்துள்ள ${conj.map(x=>actor(x.planet,true)).join(', ')}-ன் இயல்புகளும் இணைவதால் ${conj.map(x=>GRAHA_MIND_TA[x.planet]).filter(Boolean).join('; ')}. இதனால் ஒரே சூழலில் அறிவும் உணர்ச்சியும் ஒரே வேகத்தில் செயல்பட வேண்டியதில்லை.`);
   if(aspects.length)all.push(`லக்னாதிபதியைப் பார்க்கும் கிரகங்களின் வழியாக ${aspects.map(x=>aspectLife(x,true,'the self')).join(' ')} இவ்வாறு கிடைக்கும் பார்வைகள் எதுவும் தனியாக ஒரு முடிவை உறுதி செய்யாது; அவற்றின் சாதக–பாதக நிலைகளைச் சேர்த்தே உடல் மற்றும் மனச் செயல்பாட்டைப் புரிந்துகொள்ள வேண்டும்.`);
 }else{
   all.push(`The ascendant ruler ${planet} is linked to ${l.lordHouse?EN_DEST[l.lordHouse-1]:'the natal chart'}. Its natural themes enter the way the native acts and adjusts to responsibility.`);
   if(l.aspects?.length)all.push(l.aspects.map(x=>aspectLife(x,false,'self-directed decisions')).join(' '));
   if(conj.length)all.push(`Other planets sharing the ascendant ruler's sign: ${conj.map(x=>x.planet).join(', ')}. This brings ${conj.map(x=>GRAHA_LIFE_EN[x.planet]).join(' and ')} into the assessment.`);
   if(aspects.length)all.push(aspects.map(x=>aspectLife(x,false,'the ascendant ruler')).join(' '));
 }
 return all.filter(Boolean);
}

/* Additional independent sign/nakshatra portraits. These three blocks are
 * sign/star-only: no natal graha aspect, house occupant or dasha is consulted. */
const ASC_GENERAL_MORE_TA=[
 ['ஒரு சூழல் உறுதியற்றதாக இருந்தாலும் தொடக்க முயற்சியைத் தாமதிக்காமல் செய்து பார்க்கும் இயல்பு பாரம்பரியமாகக் கூறப்படுகிறது.','முயற்சியில் தன்னுடைய தேர்வு முக்கியமானதாக இருப்பதால், நீண்ட ஆலோசனையை விட நேரடி அனுபவத்திற்கே மதிப்பு அளிக்கலாம்.'],
 ['பழகிய உறவின் நிலைத்தன்மையும் அடிக்கடி மாறாத வாழ்க்கை வழக்கமும் மனதிற்கு உறுதுணையாக இருக்கலாம்.','கடின உழைப்பின் சிறிய பலன்களையும் பாதுகாத்து வைத்தால் அவை பிற்காலத் திட்டங்களுக்கு அடிப்படையாகும் என்று எண்ணலாம்.'],
 ['ஒரே கருத்துக்கு பல விளக்கங்கள் இருப்பதை விரைவில் புரிந்துகொண்டு உரையாடலின் திசையை மாற்றும் திறன் இருக்கலாம்.','புதிய மனிதர்களையும் முறைகளையும் அறியும் ஆர்வத்தால் வாழ்வின் வெவ்வேறு துறைகளுக்கிடையே அறிவைப் பரிமாற விரும்பலாம்.'],
 ['ஒரு இடத்தோடு அல்லது மனிதரோடு உருவான நெருக்கத்தை உடனே கைவிடாமல் காத்துக் கொள்ளும் இயல்பு கூறப்படுகிறது.','தனக்குப் பாதுகாப்பளித்த அனுபவங்களை நினைவில் வைத்துக்கொண்டு அடுத்த தலைமுறைக்கும் அதே ஆதரவை அளிக்க விரும்பலாம்.'],
 ['தனது பங்களிப்பு அங்கீகரிக்கப்பட்டால் இன்னும் உற்சாகமாகச் செயல்படும் மனப்பாங்கு இருக்கலாம்.','தன்னிடம் எதிர்பார்ப்பு வைத்தவர்களை ஏமாற்றாமல் இருப்பதற்காக இயல்பாகவே சில பொறுப்புகளை முன்வந்து ஏற்கலாம்.'],
 ['ஒரு வேலை முடிந்ததாகக் கூறுவதற்கு முன் அதன் சிறிய குறைகளையும் திருத்த வேண்டும் என்ற எண்ணம் இருக்கலாம்.','பெரிய இலக்கைவிட அன்றாடம் சரியாகச் செய்யப்படும் முயற்சிகள் நம்பகத்தன்மையை உருவாக்கும் என்று மதிக்கலாம்.'],
 ['நேரடியாக மோதுவதற்குப் பதிலாக இரு தரப்புக்கும் ஏற்ற வழியை விவாதித்து அறிய விரும்பலாம்.','உறவின் மரியாதை நிலைநிற்க வேண்டும் என்பதற்காக சொந்த விருப்பத்தை வெளிப்படுத்தும் முறையிலும் கவனம் செலுத்தலாம்.'],
 ['ஒரு மாற்றத்தை ஏற்கும் முன் அதன் மறைந்துள்ள காரணத்தையும் நீண்டகால விளைவையும் ஆராயும் தன்மை இருக்கலாம்.','அன்பைப் பொதுவெளியில் அதிகம் காட்டாவிட்டாலும் நம்பியவர்களுக்கான உதவியில் உறுதியாக இருக்க விரும்பலாம்.'],
 ['அறிவைப் பெற்றுக் கொள்வதோடு மற்றவருடன் பகிர்ந்தால்தான் அது முழுமை பெறும் என்ற சிந்தனை இருக்கலாம்.','ஒரே இடத்தில் நிலைப்பதைவிட வாழ்க்கைப் பார்வையை விரிவாக்கும் அனுபவங்கள் முக்கியமானவை என்று கருதலாம்.'],
 ['உறுதியான அடித்தளம் கிடைத்த பிறகே பெரிய பொறுப்பை ஏற்கும் பழக்கம் கூறப்படுகிறது.','தொடர்ச்சியான சிறிய முயற்சிகளின் கணக்கை மனதில் வைத்திருப்பதால் காலம் எடுக்கும் சாதனைகளையும் மதிக்கலாம்.'],
 ['பழக்கமான முறையில் தீர்வு இல்லாத இடத்தில் குழுவோடு சேர்ந்து மாற்று வழி கண்டுபிடிக்க விரும்பலாம்.','தனிப்பட்ட சுதந்திரத்தைப் பாதுகாத்தபடியே பெரிய சமூக நோக்கில் பங்கெடுப்பது மன நிறைவை அளிக்கலாம்.'],
 ['ஒருவரின் சொல்லை மட்டுமல்ல, அந்தச் சொல்லுக்குப் பின்னால் இருக்கும் உணர்வையும் கவனிக்கும் இயல்பு கூறப்படுகிறது.','கற்பனையான இலக்கை அன்றாடத்தில் நடைமுறைப்படுத்தும் அமைதியான முயற்சியை மேற்கொள்ள விரும்பலாம்.']
];
const MOON_GENERAL_MORE_TA=[
 ['மனதில் எழும் ஆர்வத்திற்கு உடனடியான பதில் தேவைப்படலாம்; காத்திருக்கும் நேரம் நீண்டதாகத் தோன்றும்.', 'அன்றாடச் சம்பவத்தை விரைவாக மறந்து அடுத்த பணிக்குத் திரும்பும் இயல்பு கூறப்படுகிறது.'],
 ['மன அமைதியை ஒரே நாளில் உருவாக்க முடியாது; பழகிய சூழலும் நம்பிக்கையான உறவுகளும் அதை வளர்க்கும் என்று கருதலாம்.','மாற்றத்தின் மதிப்பை அறிந்தாலும் பழைய வழக்கம் வழங்கும் நிம்மதியை எளிதில் விட விரும்பமாட்டார்கள்.'],
 ['மனதிற்கு உரையாடலும் புதிய தகவலும் ஓய்வைப் போலவே தேவைப்படலாம்.','ஒரே எண்ணத்தில் சிறிது நேரம் இருந்தாலும் அடுத்த கேள்வி தோன்றும்போது புதிய சிந்தனையில் ஈடுபடலாம்.'],
 ['ஒரு பழைய நினைவு இன்றைய முடிவையும் பாதிக்கும் அளவுக்கு மனதில் பதிந்திருக்கலாம்.','நெருங்கியோரின் நலனுக்காகத் தன் வசதியைத் தள்ளிப்போட வேண்டுமா என மனதில் மீண்டும் மீண்டும் சீர்தூக்கலாம்.'],
 ['பிறர் தன்னிடம் வைத்துள்ள நம்பிக்கை உந்துதலாக மாறலாம்.','அன்பு செலுத்துவதிலும் கருத்தை வெளிப்படுத்துவதிலும் மறைமுகத்தைவிட நேரடியான மனப்போக்கு இருக்கலாம்.'],
 ['தவறு ஏற்படுமுன் கண்டறிய வேண்டும் என்ற கவனம் மனதை அடிக்கடி சுறுசுறுப்பாக வைத்திருக்கலாம்.','முழுமை தேடும் எண்ணம் மன ஓய்வுக்கு இடையூறாகாமல் இருக்க சிலவற்றை விட்டுவிடவும் பழகலாம்.'],
 ['சுற்றியிருப்போரின் கருத்துகள் மாறுபடும்போது சமநிலையைத் தேடிக் கொண்டிருப்பது மன உழைப்பாகலாம்.','ஒற்றுமை காக்கும் முயற்சியிலும் தனக்குத் தேவையான நேரத்தைக் கைவிடாமல் இருக்க விரும்பலாம்.'],
 ['ஒரு அனுபவத்தின் வெளிப்புறச் சம்பவத்தைவிட உள்ளார்ந்த காரணத்தை நினைவில் வைத்திருக்கலாம்.','நம்பிக்கைக்கு முறிவு ஏற்பட்டால் மீண்டும் அணுகுவதற்கு உரையாடலைவிட நீண்டகால நடத்தையே முக்கியமாகலாம்.'],
 ['நாளைய வாய்ப்பைப் பற்றிய எண்ணம் அன்றாடக் கட்டுப்பாடுகளுக்குள் சிக்காமல் இருக்க உதவலாம்.','புதிய கருத்துடன் நேரடியாகப் பழகும்போது பழைய நம்பிக்கையை திருத்திக் கொள்ளவும் முன்வரலாம்.'],
 ['மனக்கவலையை வார்த்தைகளால் காட்டாமல் வேலை செய்து முடிப்பதன் மூலம் சமாளிக்கலாம்.','சொந்தத் தேவைகளுக்கும் பொறுப்பிற்கும் உரிய நேரத்தை ஒதுக்க வேண்டும் என்ற உணர்வு மெதுவாக வலுப்பெறலாம்.'],
 ['வேறுபட்ட மனிதர்களிடம் தனித்த கண்ணோட்டத்தை அறிந்து கொள்ளும் ஆர்வம் மனதை ஈர்க்கலாம்.','தனியாக சிந்திக்கும் நேரமும் பொருத்தமான குழுவில் பங்கேற்கும் நேரமும் இரண்டும் முக்கியமானவையாகலாம்.'],
 ['இசை, கதை, அமைதியான இடம் போன்றவை மனப்போராட்டத்திற்கு ஓர் இடைவெளி வழங்கலாம்.','பிறர் உணர்வை உணர முடிந்தாலும் அதற்கெல்லாம் தனிப்பட்ட பொறுப்பு ஏற்க வேண்டுமா என்ற எல்லை தேவைப்படலாம்.']
];
const NAK_GENERAL_MORE_TA=[
 'புதிய தொடக்கத்தில் துணைநிற்கும் மனம் இருந்தாலும் முடிக்கும் பொறுப்பையும் தனியே பார்க்க விரும்பலாம்.',
 'விருப்பத்தை ஒழுங்குக்குள் கொண்டு வருவதில் மன உறுதி தேவைப்படுவதாகப் பாரம்பரியம் எடுத்துரைக்கிறது.',
 'தேவையானதைத் தேர்ந்தெடுத்து தேவையற்றதை விலக்கும் துல்லியமான அணுகுமுறை முன்வைக்கப்படுகிறது.',
 'வளர்ச்சி என்றால் பராமரிப்பும் தொடர்ச்சியும் முக்கியம் என்ற நம்பிக்கை வெளிப்படலாம்.',
 'அறிந்த பதிலை விட புதிய கேள்வியைத் தேடும் மன ஆர்வம் வாழ்க்கை முழுவதும் தொடரலாம்.',
 'அனுபவத்தில் வந்த மாற்றத்தை மறைத்து வைக்காமல் அதிலிருந்து புதிய புரிதல் பெற முயல்வர்.',
 'இடையூறுக்குப் பிறகும் மீண்டு எழும் எண்ணம் புதிய உறவுகளையும் முயற்சிகளையும் தேடலாம்.',
 'பிறருக்குப் பாதுகாப்பு வழங்கும்போது கடமையைத் தெளிவாகப் பிரித்து நிறைவேற்ற விரும்பலாம்.',
 'காரணத்தின் பின்னணியை அறியும் ஆழமான ஆர்வம் எல்லோரிடமும் உடனடியாக வெளிப்படாமல் இருக்கலாம்.',
 'குடும்ப மரபின் அனுபவத்தை மதித்தாலும் தனக்கான மதிப்பைத் தனியே நிரூபிக்க விரும்பலாம்.',
 'அழகு, நட்பு, நெருக்கம் ஆகியவற்றின் வழியாக வாழ்வின் சுவையை அறிய விருப்பம் இருக்கலாம்.',
 'ஒப்புக்கொண்ட பணியை முடித்த பிறகு வரும் நம்பகத்தன்மையை வெளிப்படையான பாராட்டைவிட மதிக்கலாம்.',
 'கண்களுக்கு நேரடியாகத் தெரியும் சின்னச் சின்ன வேறுபாடுகளையும் பயன்படுத்தும் நுணுக்கம் இருக்கலாம்.',
 'வடிவமைப்பிலும் செய்முறையிலும் புதுமையை உருவாக்கும் ஆர்வம் பழைய முறையைக் கேள்வி கேட்கச் செய்யலாம்.',
 'சுதந்திரமாகத் தேர்ந்தெடுத்த பாதையை அனுபவத்தின் அடிப்படையில் மாற்றிக்கொள்ளும் நெகிழ்வு இருக்கலாம்.',
 'ஒரே இலக்குக்காகப் பல ஆற்றல்களை இணைக்கும் முயற்சியில் நீண்டகால ஈடுபாடு இருக்கலாம்.',
 'காலத்தால் சோதிக்கப்பட்ட உறவுகளில் பொறுப்பை விடாமல் காப்பதே நம்பிக்கைக்கான அடையாளமாகலாம்.',
 'நுணுக்கமான ஆய்வில் நேரத்தைச் செலவிட்டாலும் முடிவிற்கான காரணம் தெளிவாக வேண்டும் என்று எண்ணலாம்.',
 'பழைய கட்டமைப்பைச் சீரமைத்து புதிய அடித்தளத்தை அமைக்கும் எண்ணம் அடிக்கடி தோன்றலாம்.',
 'பெரிய இலக்கை நோக்கிய முன்னேற்றத்தில் கிடைக்கும் சிறிய படிகளைத் தொடர்ந்து போற்றலாம்.',
 'ஒரு வேலைக்கு முழுப் பொறுப்பு அளிக்கப்பட்டால் அதன் நடைமுறையைத் தானே வகுத்துக்கொள்ள விரும்பலாம்.',
 'கவனமாகக் கேட்டு கொண்டிருக்கும் தகவலை அடுத்தவரின் நன்மைக்கு மாற்றுவது மனநிறைவாக இருக்கலாம்.',
 'குழு ஒற்றுமையைப் பேணுவதில் வெளியில் தெரியாத உழைப்பையும் மதிக்கும் இயல்பு இருக்கலாம்.',
 'தனிமையில் ஆய்ந்த கருத்தை பலருடன் பகிரும் போது அவர்களின் எதிர்ப்பையும் திறந்த மனத்துடன் ஆராயலாம்.',
 'கொள்கையில் தெளிவையும் மனிதர்களிடம் நெகிழ்வையும் ஒரே நேரத்தில் காக்க முயலலாம்.',
 'ஆழமான உறுதியுடன் செயல்படும் முன் முழுச் சூழலையும் அமைதியாகக் கவனிக்க விரும்பலாம்.',
 'முடிவை ஏற்றுக்கொண்டு அடுத்த தொடக்கத்திற்கான பாதையைத் தேர்ந்தெடுக்கும் மென்மையான அணுகுமுறை இருக்கலாம்.'
];
function introTraits(star,lang){if(!star)return [];const ta=lang!=='en',lag=star.lagnaSign,moon=star.moonSign,birth=star.planets?.Moon?.star,txt=[];
 if(Number.isInteger(lag)&&SIGN_GENERAL_TA[lag]){
  txt.push(ta?`லக்னத்தின் பொதுக் குணநலன் — ${SIGN_GENERAL_TA[lag][0]}: ${SIGN_GENERAL_TA[lag][1]}`:`Ascendant sign — ${SIGN_GENERAL_TA[lag][0]}: a traditional sign-only temperament portrait.`);
  if(ta)txt.push(...ASC_GENERAL_MORE_TA[lag]);
 }
 if(Number.isInteger(moon)&&MOON_GENERAL_TA[moon]){
  txt.push(ta?`சந்திர ராசியின் பொதுக் குணநலன் — ${SIGN_GENERAL_TA[moon][0]}: ${MOON_GENERAL_TA[moon]}`:`Moon sign — ${SIGN_GENERAL_TA[moon][0]}: the sign-only outlook of the mind.`);
  if(ta)txt.push(...MOON_GENERAL_MORE_TA[moon]);
 }
 if(birth?.index!==undefined){
  txt.push(ta?`பிறந்த நட்சத்திரத்தின் பொதுக் குணநலன் — ${birth.ta}: ${NAK_TRAITS_TA[birth.index]}`:`Birth nakshatra — ${birth.en}: traditional constellation-specific traits.`);
  if(ta&&NAK_GENERAL_MORE_TA[birth.index])txt.push(NAK_GENERAL_MORE_TA[birth.index]);
 }
 return txt;
}
function starLordLife(c,star,lang){const d=star?.houses?.[c.house],s=d?.lordStar;if(!s?.star||!s?.starRuler||!s.rulerHouse)return '';
 const ta=lang!=='en',core=TA_DEST[s.rulerHouse-1],domain=TA_DEST[c.house-1];if(c.house===s.rulerHouse)return '';
 const stable=['own','exalted'].includes(s.rulerDignity),retro=s.rulerRetrograde;
 if(ta)return `${domain} பற்றிய முக்கிய முடிவுகளைச் செயல்படுத்தும்போது ${core} சார்ந்த சூழல் துணைப் பாதையாக அமையலாம். ${stable?'நிலையான ஆதரவு இருந்தால் இரு பொறுப்புகளையும் ஒரே திட்டத்தில் இணைக்க முடியும்.':retro?'முன்பு முயன்ற ஏற்பாட்டை மீண்டும் திருத்திப் பயனுள்ள வழியாக மாற்றும் எண்ணம் எழலாம்.':'ஒரு துறையில் முன்னேற்றம் வரும்போது மற்றத் துறையின் நேரம் அல்லது பணத் தேவையை ஒப்பிட்டுப் பார்க்க வேண்டியிருக்கும்.'}`;
 return `Progress in ${EN_DEST[c.house-1]} intersects with ${EN_DEST[s.rulerHouse-1]}; ${stable?'steady effort may join the two':'the two commitments may need renewed planning'}.`;
}
function wealthFamilySpeechReading(c,star,lang){if(c.house!==2)return [];
 const h=star?.houses?.[2],ta=lang!=='en';if(!h)return [];
 const lord=c.lord,karJ=h.karakas?.find(x=>x.planet==='Jupiter'),karM=h.karakas?.find(x=>x.planet==='Mercury');
 const lordP=h.lordStar,loc=c.location,lordDrive=TA_DEST[(loc||2)-1],income=karJ?.rulerHouse?TA_DEST[karJ.rulerHouse-1]:null,speech=karM?.rulerHouse?TA_DEST[karM.rulerHouse-1]:null;
 const lordStrong=c.positive?.some(x=>x.planet===lord&&x.delta>.2),lordWeak=c.negative?.some(x=>x.planet===lord&&x.delta<-.2);
 const jWeak=c.negative?.some(x=>x.planet==='Jupiter'&&x.delta<-.2),mWeak=c.negative?.some(x=>x.planet==='Mercury'&&x.delta<-.2);
 const mj=lordP?.starRuler, jj=karJ?.starRuler, mm=karM?.starRuler;
 if(ta){
  const r=[];
  r.push(`சம்பாத்தியத்தின் இயல்பைப் பார்க்கும்போது இரண்டாம் பாவத்தின் வாழ்வாதாரத் திறனுடன் அதன் அதிபதியின் ${lordDrive} சார்ந்த செயற்பாடும் இணைகிறது. ${lordStrong?'சொந்த உழைப்பின் பலனைப் பாதுகாத்துச் சேமிப்பாக்கும் முயற்சி வளரலாம்.':lordWeak?'வருவாய் கிடைத்தாலும் அன்றாடப் பொறுப்புகளால் சேமிப்பு சீராக வளராத காலங்களை அனுபவிக்கலாம்.':'சம்பாதிக்கும் வழியும் கையில் பணம் தங்கும் முறையும் ஒரே மாதிரியாக இருக்காமல் மாறக்கூடும்.'} ${income&&income!==lordDrive?income+' தொடர்பு இதற்குத் துணையான தனி வழியாக செயல்படலாம்.':''}`);
  if(mj&&jj)r.push(`குடும்பச் செல்வத்தை வளர்ப்பதில் வேகமான முடிவை விடத் திட்டமிட்ட ஒப்பந்தம் பயனுள்ளதாக அமையலாம். குடும்பத்திற்கான செலவு, பெரியோரின் தேவை, தொழில் முதலீடு ஆகியவற்றில் ஒன்றை முன்னிலைப்படுத்தும்போது மற்றதற்கான பாதுகாப்பை விட்டுக்கொடுக்கக் கூடாது. ${jWeak?'குடும்ப வளத்தைக் குறிக்கும் குருவின் பாதக ஆதாரம் காரணமாக உதவிக்கான எல்லையை நிதானமாக நிர்ணயிப்பது முக்கியமாகலாம்.':'குடும்பத்தினரின் நீண்டகால ஒத்துழைப்பை ஒழுங்கமைப்பதால் சேமிப்பைத் தொடர்ந்து பாதுகாக்கும் நடைமுறை உருவாகலாம்.'}`);
  r.push(`வாக்கு வழியாகப் பயன்படும் திறன் தனம் சேர்க்கும் வழியோடு தொடர்புபடுமா என்பதைத் தனியே பார்க்க வேண்டும். ${speech?speech+' குறித்த அனுபவத்தைச் சொற்களாக எடுத்துரைப்பது வாடிக்கையாளர் தொடர்பு, கற்பித்தல், கணக்கு அல்லது விளக்கப் பணிகளில் மதிப்பைப் பெற உதவலாம்.':'பேச்சுத் திறன் எந்தத் தொழிலில் வருமானமாக மாறுகிறது என்பதைத் தனிப்பட்ட தொழில் ஆதாரங்களுடன் ஒப்பிட வேண்டும்.'} ${mWeak?'புதனின் கட்டுப்படுத்தும் தொடர்பினால் கடிதம், கணக்கு, வாய்மொழி உறுதி ஆகியவற்றை மறுபடியும் சரிபார்ப்பது தேவைப்படலாம்.':'சொன்ன கருத்தை எதிராளி புரிந்துகொண்டாரா என்று உறுதிப்படுத்துவது வேலை உறவை வலுப்படுத்தலாம்.'}`);
  r.push(`குடும்பத்தை வழிநடத்துவதில் பணத்தை மட்டுமே அளவுகோலாக்காமல், உறுப்பினர்கள் ஏற்கும் பொறுப்பு மற்றும் உரையாடும் விதத்தை இணைப்பது முக்கியமாகலாம். ${lordWeak?'தனியாகச் செலவுச் சுமையை ஏற்றுக்கொள்ளும் எண்ணத்தைக் குறைத்து குடும்பக் கூட்டுத் திட்டம் அமைப்பது உதவலாம்.':'நேரம் தவறாமல் தேவைகளை அறிந்து உதவுவதால் குடும்பத்தின் நம்பிக்கையைப் பெறலாம்.'}`);
  // Habit, alcohol, smoking, meat and taste cannot be diagnosed from a natal chart. Do not claim factual use.
  r.push(`உணவின் சுவை, வகை மற்றும் நேரத்தைப் பற்றிய விருப்பங்கள் ஒரே மாதிரி இல்லாமல் வேலைப்பளு, வீட்டுப் பழக்கம், உடலின் தேவையுடன் மாறலாம். புகை, மது, மாமிச உணவு அல்லது குறிப்பிட்ட நோயின் இருப்பை கிரகநிலை மட்டும் கொண்டு உறுதியாகச் சொல்ல இயலாது; நடைமுறைப் பழக்கத்திற்கான ஆதாரம் இருந்தால்தான் தனிப்பட்ட முடிவு தர வேண்டும்.`);
  return r;
 }
 return [
   `Earnings and family wealth should be distinguished: the second-house ruler ${lord} directs attention to ${EN_DEST[(loc||2)-1]}, while Jupiter contributes a separate family-and-resources judgement${income?' through '+EN_DEST[karJ.rulerHouse-1]:''}.`,
   `Speech deserves its own assessment. Mercury's natal and stellar links${speech?' with '+EN_DEST[karM.rulerHouse-1]:''} may become important in communication-heavy work; any gain from speaking must be corroborated by career and income indicators.`,
   `Financial support to relatives, household obligations, and plans after partnership are distinct questions. Strong communication is not the same as reliable savings, and neither alone proves prosperity.`,
   `A natal chart cannot establish whether someone actually consumes alcohol, smokes, eats meat, or has a specific health condition. Those habits require real-world information.`
 ];
}
const STAR_LORD_DOMAIN_TA=[
 'தன்னுடைய கருத்தைப் பிறரிடம் கொண்டு செல்லும் வேகத்தையும் பொறுப்பையும் புதிய சூழலுக்கேற்ப மாற்றலாம்',
 'வரவு, குடும்பச் செலவு, பேச்சால் கிடைக்கும் தொழில் வாய்ப்பு ஆகியவற்றில் எது நிலைத்த பயன் தருகிறது என்பதைப் பிரித்தறியலாம்',
 'தான் கற்றுத் தேர்ந்த திறனைக் கொண்டு உடன்பிறப்புகளுடனும் சுற்றத்தாருடனும் இணையும் புதிய வேலை அமைந்திடலாம்',
 'வசிப்பிட அமைதியும் சொத்து பற்றிய நீண்டகாலத் திட்டமும் ஒரே நேரத்தில் கவனத்திற்கு வரலாம்',
 'கல்வி, கற்பிக்கும் பொறுப்பு, குழந்தைகளை வழிநடத்தும் செயல்முறை ஆகியவற்றில் முயற்சியின் வடிவம் மாறலாம்',
 'பணியில் எழும் போட்டியையும் கடன் அல்லது உடல்நல ஒழுங்கையும் தனித்தனி செயல் திட்டமாக அணுகலாம்',
 'உறவு, கூட்டுத் தொழில், பொது ஒப்பந்தம் ஆகியவற்றில் உள்ள ஒப்புதல்களைச் சமநிலைப்படுத்த புதிய உரையாடல் தேவைப்படலாம்',
 'கூட்டுச் சொத்து, மாற்றம், மறைந்திருந்த செலவு போன்றவற்றை ஆய்வு செய்து பாதுகாப்பான ஏற்பாட்டுக்குத் திரும்பலாம்',
 'தந்தை அல்லது வழிகாட்டியிடம் பெற்ற அறிவைச் சொந்தப் பயிற்சியாக மாற்றிக் கொள்ளும் புதிய வழி உருவாகலாம்',
 'தொழிலின் செய்முறையை மாற்றுவதா அல்லது இருக்கும் பணியில் பொறுப்பை வளர்ப்பதா என்ற இரு பாதைகள் முன்னிலைக்கு வரலாம்',
 'வருவாய் மற்றும் நம்பகமான நண்பர் வட்டத்திற்கிடையே நீண்டகால உறுதியான ஒப்பந்தங்கள் உருவாகலாம்',
 'வெளியூர் தொடர்புகள், அத்தியாவசியச் செலவு, தனிப்பட்ட ஓய்வு ஆகியவற்றிற்கு வெளிப்படையான வரம்புகள் தேவைப்படலாம்'
];
const TRANSIT_DOMAIN_CHANGE_TA=[
 'முன்னர் தன் முடிவைத் தள்ளிப்போட்டிருந்தால் அதைச் செயலாக்கும் முறையைத் திருத்திக் கொள்ளலாம்',
 'கிடைக்கும் வரவு நேரத்தையும் குடும்பம் ஏற்கும் செலவையும் மீண்டும் பொருத்திப் பார்க்கலாம்',
 'எழுத்து, குறும்பயணம் அல்லது திறன் பயிற்சி வழியாகத் தொடங்கிய முயற்சியை முடிக்க கவனம் செலுத்தலாம்',
 'வீட்டிலுள்ள ஒருவரின் தேவையும் வசிப்பிடம் பற்றிய திட்டமும் ஒன்றோடொன்று பின்னிப் பிணையலாம்',
 'படிப்பு, படைப்புத் திறன் அல்லது இளையவருக்கான பொறுப்பில் புதிய கட்டம் தொடங்கலாம்',
 'வேலைப்பளு அதிகரிக்குமுன் கடன், போட்டி, உடல்நல ஒழுங்கு ஆகியவற்றின் முன்னுரிமையை மாற்றலாம்',
 'துணைவர் அல்லது கூட்டாளியுடனான ஒப்புதல் புதிய நிபந்தனைகளைத் தேடலாம்',
 'பழைய ஆவணங்கள், பகிர்ந்த நிதி, எதிர்பாராத பொறுப்பு ஆகியவற்றின் நிலையை உறுதிப்படுத்தலாம்',
 'வழிகாட்டல், உயர் கல்வி அல்லது தொலைதூர முயற்சியில் இருந்து பயனான புதிய திட்டம் உருவாகலாம்',
 'வேலை முடிவுகளுக்கான அங்கீகாரமும் பணியிடம் கோரும் கடமையும் ஒரே நேரத்தில் முன்னிலை பெறலாம்',
 'வாடிக்கையாளர்கள் அல்லது தொடர்புகள் மூலம் வந்த வாய்ப்பை உண்மையான வருமானமாக மாற்றுவதற்கான நிபந்தனைகளைத் தீர்மானிக்கலாம்',
 'பயணம், சேவை, தனிநேரம் சார்ந்த செலவுகளை நீண்டகால வருமானத்திற்கு ஏற்றவாறு மாற்றலாம்'
];
function detailedStarRulerReading(c,star,lang,seen){const row=star?.houses?.[c.house];if(!row)return [];
 const s=row.lordStar,house=c.house,ta=lang!=='en';if(!s?.star||!s?.starRuler)return [];
 const domain=ta?TA_DEST[house-1]:EN_DEST[house-1],station=s.rulerHouse?ta?TA_DEST[s.rulerHouse-1]:EN_DEST[s.rulerHouse-1]:null;
 const isOwn=['own','exalted'].includes(s.rulerDignity),isWeak=s.rulerDignity==='debilitated';
 const first=ta?`${STAR_LORD_DOMAIN_TA[house-1]} ${station&&station!==domain?`இந்த வாய்ப்பு அல்லது பொறுப்பு ${station} சார்ந்த வாழ்க்கைத் தேவையையும் இணைக்கலாம். `:''}${isOwn?'நீண்டகாலத் திட்டத்தை முடிக்கும் பொறுமைக்கு நட்சத்திரநாதனின் வலிமை துணையாகலாம்.':isWeak?'திட்டத்தின் ஒரு பகுதியை மீண்டும் அமைக்க நேர்ந்தால் உடனடி முடிவை விட உறுதியான உதவியுடன் நிறைவேற்றுவது பயனாகலாம்.':'எந்த முடிவிலும் மற்றொரு முக்கியத் தேவைக்கான இடத்தை விட்டுவிடாமல் செயல்படுவது பொருத்தமாகலாம்.'}`:
 `The stellar ruler of the natal house lord ties ${domain} to ${station||'a second life theme'}; ${isOwn?'the stronger ruler may support persistence':isWeak?'the weaker ruler may require another practical route':'the relative pressure should be assessed rather than assumed'}.`;
 const aspects=(s.rulerAspects||[]).slice(0,2);const aspectKey='nakshatra-ruler-aspects:'+s.starRuler+':'+aspects.map(x=>x.from+'/'+x.aspectHouse+'/'+x.qualified).join('|');const allowAspect=aspects.length&&(!seen||!seen.has(aspectKey));if(allowAspect)seen?.add(aspectKey);const extra=allowAspect?(ta?`அந்த நட்சத்திரநாதனுக்குக் கிடைக்கும் கிரகத் தொடர்புகளால் ${aspects.map(x=>aspectLife(x,true,'a life-domain')).join(' ')}`:aspects.map(x=>aspectLife(x,false,'its stellar ruler')).join(' ')):'';
 return [first,extra].filter(Boolean);
}
function lifeNatal(c,lang,star,seen){if(!c)return [];const ta=lang!=='en',rows=[];
 if(c.house===1){rows.push(...introTraits(star,lang),...ascendantStarReading(star,ta),...lagnaBodyMindReading(star,lang));}
 const slots=MATTER_TA[c.house-1]||[];
 for(let i=0;i<slots.length;i++){
  const entry=slots[i];const adult=c.ageUnder18&&[2,5,7,10,11].includes(c.house);
  if(adult&&([2,5].includes(c.house)&&['திருமணத்திற்குப் பின் குடும்பம்','குழந்தைகள் மற்றும் வழிகாட்டல்'].includes(entry[1])||c.house===7&&['திருமணத்தில் புரிதல்','துணைவர் குடும்பத் தொடர்பு','அன்பும் நேரமும்'].includes(entry[1])))continue;
  const content=paragraphNoCalc(c,entry,i,lang,star);const p=ta?`${entry[1]} — ${content}`:`${MATTER_EN[c.house-1]?.[i]||'Daily life'} — ${content}`;
  const norm=p.replace(/\s+/g,' ').trim();if(!seen||!seen.has(norm)){rows.push(p);seen?.add(norm);}
 }
 const role=starLordLife(c,star,lang);if(role)rows.push(role);
 rows.push(...wealthFamilySpeechReading(c,star,lang),...detailedStarRulerReading(c,star,lang,seen));
 return rows.filter(t=>{const k='paragraph:'+t.replace(/\s+/g,' ').trim();if(seen?.has(k))return false;seen?.add(k);return true;});
}
const PERIOD_TA_LIVED={
 Sun:'பொறுப்பு ஏற்று மற்றவர்களின் நம்பிக்கையைப் பெறுவது',Moon:'குடும்பத்தினரின் தேவையையும் மனநிம்மதியையும் ஒருங்கிணைப்பது',Mars:'தொடங்கிய பணியைச் செயலில் நிறைவேற்றுவது',Mercury:'தகவலையும் பேச்சுவார்த்தையையும் நடைமுறை முடிவாக்குவது',Jupiter:'கற்ற அறிவையும் பெரியோர் அனுபவத்தையும் பயன்படுத்துவது',Venus:'உறவின் ஒப்புதலையும் வசதிகளுக்கான செலவையும் சமப்படுத்துவது',Saturn:'நீடிக்கும் கடமையைப் படிப்படியாக முடிப்பது',Rahu:'புதிய முறையின் பலனையும் அதன் நம்பகத்தன்மையையும் ஆராய்வது',Ketu:'முடிவடைய வேண்டிய பழைய ஏற்பாட்டைத் தெளிவுபடுத்துவது'
};
const TRANSIT_LIVED={Jupiter:'கற்றல், ஒப்பந்த விரிவாக்கம் மற்றும் வழிகாட்டுதலுக்கான வாய்ப்புகள்',Saturn:'நீடித்த பொறுப்பின் சுமை மற்றும் அதைப் பராமரிக்கும் ஒழுங்கு',Rahu:'பழக்கமில்லாத வாய்ப்பு அல்லது தகவலைச் சோதிக்கும் தேவை',Ketu:'பழைய செயல்முறையைச் சுருக்கி அத்தியாவசியத்தைப் பாதுகாக்கும் விருப்பம்'};
function lifePeriod(win,c,lang,star){const p=win?.period;if(!p?.from||!p?.to||!p?.md||!p?.ad||!c||!win?.links?.length)return '';
 const ta=lang!=='en',focus=TA_DEST[c.house-1],md=PERIOD_TA_LIVED[p.md],ad=PERIOD_TA_LIVED[p.ad],mdS=star?.planets?.[p.md],adS=star?.planets?.[p.ad],src=mdS?.rulerHouse?TA_DEST[mdS.rulerHouse-1]:null,dst=adS?.rulerHouse?TA_DEST[adS.rulerHouse-1]:null;
 const caution=c.conclusion==='strain'?'திடீரென பெரிய பொறுப்பை ஏற்காமல் ஏற்கெனவே உள்ள திட்டத்தின் நிலைத்தன்மையை முதலில் உறுதிப்படுத்த வேண்டியிருக்கும்.':c.conclusion==='support'?'முன்னேற்றம் கிடைக்கும் இடத்தில் பொறுப்பையும் அதற்கான நேரத்தையும் முன்கூட்டியே ஒழுங்கமைத்தால் பயன் அதிகமாகலாம்.':'சாதகமும் கட்டுப்பாடும் கலந்திருப்பதால் இரண்டுக்கும் இடையே பொருத்தமான வழியைத் தேர்வு செய்ய வேண்டியிருக்கும்.';
 if(ta){
 const mdStar=mdS?.star?.ta,adStar=adS?.star?.ta;
 const starDetail=mdStar&&adStar?`${actor(p.md,true)} செயல்படும் வழி ${src||'பிறப்பில் காட்டப்பட்ட நிலை'} சார்ந்த முயற்சிகளில் தொடங்கலாம்; ${actor(p.ad,true)} புக்தியின் நட்சத்திரநாதன் தொடர்புபடும் ${dst||'வாழ்க்கைப் பொறுப்பில்'} அது வேறுவிதமாக வெளிப்படலாம்.`:'';
 const operative=({Sun:'தலைமைப் பொறுப்பு அல்லது மேலதிகாரியிடம் தரும் பதில் மாறலாம்',Moon:'வீட்டாரின் உணர்ச்சி தேவையும் திட்டமிட்ட நேரமும் சமப்படுத்தப்படும்',Mars:'செயலுக்குத் தேவையான நேரம், போட்டி, உழைப்பு அதிக கவனம் பெறலாம்',Mercury:'எழுத்துப் பதிவு, கணக்கு, தகவல் சரிபார்ப்பு முக்கியமாகலாம்',Jupiter:'கல்வி, ஆலோசனை, ஒழுக்கம் சார்ந்த முடிவு முன்னிலை பெறலாம்',Venus:'உறவுகள், ஒப்புதல் அல்லது வசதி செலவுகள் தேர்வில் இடம் பெறலாம்',Saturn:'நீடித்த கடமை, வேலை நேரம், பொறுமை ஆகியவை சோதிக்கப்படலாம்',Rahu:'புதிய வாய்ப்பு அல்லது வெளி தொடர்பைச் சரிபார்ப்பது முக்கியமாகலாம்',Ketu:'பழைய ஏற்பாட்டை முடித்து அத்தியாவசியத்தைச் சீரமைக்க வேண்டியிருக்கலாம்'})[p.ad]||'';
 return `${p.from} முதல் ${p.to} வரை ${focus} தொடர்பில் ${md||'நீண்டகால முயற்சி'} முக்கியமாகலாம். ${operative}. ${starDetail} ${src&&dst&&src!==dst?`${src} மற்றும் ${dst} ஒரே நேரத்தில் கவனம் பெறும்போது முன்னுரிமைகளைப் பிரித்து நிர்ணயிக்க வேண்டியிருக்கலாம். `:dst&&dst!==focus?`${dst} வழியாகத் துணைப் பொறுப்பு வந்தால் அதன் பயனைத் தனியே மதிப்பிடலாம். `:''}${caution}`;
 }
 return `${p.from} to ${p.to}: decisions in ${EN_DEST[c.house-1]} interact with the ${p.md} major and ${p.ad} sub-period life themes. ${src&&dst&&src!==dst?'Their star-ruler paths connect different personal responsibilities. ':'The result depends on the operative natal conditions.'}`;
}
function lifePD(win,lang,star){const p=win?.period,c=win?.claim;if(!p?.pd||!p?.from||!p?.to||!c)return '';
 const starP=star?.planets?.[p.pd],rulerH=starP?.rulerHouse,kar=TA_DEST[rulerH-1];const ta=lang!=='en',md=PERIOD_TA_LIVED[p.md]||'',ad=PERIOD_TA_LIVED[p.ad]||'',third=PERIOD_TA_LIVED[p.pd]||'';
 if(ta){
 const starName=starP?.star?.ta||null,owner=starP?.starRuler||null;
 const distinct=owner?`இந்த அந்தரநாதரின் நட்சத்திரநாதனான ${actor(owner,true)} பிறப்பில் தொடர்பு கொண்டிருக்கும் ${kar||'பாவப் பொறுப்பு'} சார்ந்த வேறு செயலையும் கவனிக்கச் செய்யலாம்.`:'';
 const target={1:'சுய முடிவுக்கான நேர ஒதுக்கீடு',2:'குடும்பத்தின் பணத் தேவையைத் தனியே கணக்கிடுதல்',3:'கற்ற திறனைச் செயல்முறையாக மாற்றுதல்',4:'வீட்டு வசதி, குடும்பச் செலவைக் கட்டுப்படுத்துதல்',5:'கல்வி அல்லது குழந்தைகள் தொடர்பான பயிற்சி',6:'வேலைச் சுமையையும் ஓய்வையும் ஒழுங்குபடுத்துதல்',7:'பொறுப்புகளைத் துணைவரோடு அல்லது கூட்டாளியோடு பகிர்தல்',8:'முன்னர் செய்யப்பட்ட ஒப்பந்தம் அல்லது ஆவணத்தை உறுதிப்படுத்துதல்',9:'மேற்படிப்பு அல்லது வழிகாட்டலை நடைமுறைப்படுத்துதல்',10:'செய்த பணியின் தரத்திற்கும் பொறுப்பிற்கும் ஒழுங்கு அமைத்தல்',11:'உறுதியான வரவையும் எதிர்பார்த்த வரவையும் பிரித்தறிதல்',12:'செலவும் ஓய்வும் தனியாகத் திட்டமிடுதல்'}[c.house];
 return `${p.from} – ${p.to} காலத்தில் ${TA_DEST[c.house-1]} சார்ந்த ${target} முக்கியமாகலாம். ${actor(p.pd,true)} அந்தரத்தில் ${third} எனும் உந்துதல் ${actor(p.ad,true)} புக்தியின் நடவடிக்கையுடன் சந்திக்கலாம். ${distinct} ${c.conclusion==='strain'?'ஆரம்பித்த வேலையை அவசரமாக முடிப்பதைவிடத் தேவையான உறுதிப்பாட்டைப் பெறுவது உதவலாம்.':c.conclusion==='support'?'கிடைக்கும் ஒத்துழைப்பைப் பயன்படுத்தி ஒரு குறிப்பிட்ட முயற்சியை நிறைவு செய்யலாம்.':'சாதகமும் எதிர்ப்பும் கலந்திருந்தால் இரு பொறுப்புகளையும் ஒரே நாளில் நிறைவேற்ற முயலாமல் நேரம் ஒதுக்கலாம்.'}`;
 }
 return `${p.from}–${p.to}: the ${p.pd} third-level period may bring an additional practical decision in ${EN_DEST[c.house-1]} beyond the ${p.md}/${p.ad} themes${rulerH?' through '+EN_DEST[rulerH-1]:''}.`;
}
function lifeYear(group,lang,star){if(!group?.claim||!group.period||!group.transit||!group.from||!group.to)return '';
 const c=group.claim,ta=lang!=='en',tr=group.transit.planet,txt=TRANSIT_LIVED[tr]||'',s=star?.planets?.[group.period.ad],detail=s?.rulerHouse?TA_DEST[s.rulerHouse-1]:null;
 const support=Number(group.transit.signal)>0?(ta?'முன்னேற்றத்திற்கு உதவும் சூழலாக இருக்கலாம்':'can support deliberate progress'):Number(group.transit.signal)<0?(ta?'முன்னர் உருவாக்கிய திட்டத்தைத் திருத்த வேண்டிய சூழலாக இருக்கலாம்':'may require adjustment to existing plans'):(ta?'கலந்த ஆதாரங்களைக் கொண்ட காலச்சூழலாக இருக்கலாம்':'shows mixed traditional indicators');
 if(ta){
 const md=star?.planets?.[group.period.md],ad=star?.planets?.[group.period.ad];
 const mdChannel=md?.rulerHouse?TA_DEST[md.rulerHouse-1]:null;
 const adChannel=ad?.rulerHouse?TA_DEST[ad.rulerHouse-1]:null;
 const starInteraction=mdChannel&&adChannel&&mdChannel!==adChannel?`${mdChannel} சார்ந்த நீண்டகால நோக்கம் ${adChannel} சார்ந்த அன்றாடத் தேர்வோடு சந்திக்கும்போது இவ்விரண்டுக்கும் தனித்தனி நேரம் ஒதுக்க வேண்டியிருக்கும்.`:adChannel&&adChannel!==TA_DEST[c.house-1]?`${adChannel} வழியாக உருவாகும் நடைமுறையும் இந்தத் துறையில் உள்ள முடிவும் ஒன்றோடொன்று தொடர்புபடலாம்.`:'';
 return `${group.from} – ${group.to} காலத்தில் ${TRANSIT_DOMAIN_CHANGE_TA[c.house-1]} ${txt} ${support}. ${starInteraction} ${detail&&detail!==TA_DEST[c.house-1]?`${detail} பற்றிய முன்பிருந்த ஏற்பாட்டையும் இதனுடன் இணைத்துப் பார்க்கலாம்.`:''}`;
 }
 return `${group.from}–${group.to}: ${TRANSIT_LIVED[tr]||tr} interact with ${EN_DEST[c.house-1]} under the measured ${group.period.md}/${group.period.ad} and transit sample. This is a conditional period reading, not a fixed event.`;
}
function lifeOverview(s,star,lang){if(!s?.main)return [];
 const lead=TA_DEST[s.main.house-1],counter=s.counter&&s.counter.house!==s.main.house?TA_DEST[s.counter.house-1]:null;
 return lang!=='en'?[
  `வாழ்க்கையின் ஒரு முக்கியமான முன்னுரிமையாக ${lead} முன்வரலாம்; அதன் விளைவுகள் அன்றாடத் தேர்வுகள், பொறுப்புகள், உறவுகள் வழியே மெல்ல வெளிப்படும்.`,
  ...(counter?[`${counter} சார்ந்த தேவைகளையும் இதனுடன் சமப்படுத்தும்போது வாழ்க்கையின் திட்டங்கள் தெளிவாகும்; இரு துறைகளும் எப்போதும் ஒரே வேகத்தில் முன்னேற வேண்டியதில்லை.`]:[])
 ]:[`A leading life theme concerns ${EN_DEST[s.main.house-1]}; decisions in this area interact with real responsibilities rather than guaranteeing a predetermined event.`];
}

return Object.freeze({natal,period,year,summary,lifeNatal,lifePeriod,lifePD,lifeYear,lifeOverview,introTraits});
});
