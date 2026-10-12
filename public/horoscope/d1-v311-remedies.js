/* V311 corrected: selected difficulties only; no universal planet remedies.
 * No cure or event-prevention claims. Every choice records its evidence.
 */
(function(g,f){'use strict';const api=f(g);g.SMVD311Remedies=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(g){'use strict';
const ADVICE=[
 ['ஒரே நேரத்தில் பல உறுதிமொழிகளை ஏற்காமல் முடிக்கக்கூடிய பொறுப்பை மட்டும் தேர்ந்தெடுக்கவும்','Select one manageable commitment at a time'],
 ['வருமானம், குடும்பச் செலவு, கடன், சேமிப்பு ஆகியவற்றுக்குத் தனித்தனி பதிவுகள் வைத்திருக்கவும்','Keep separate records for earnings, debts, needs and savings'],
 ['முயற்சியை மாற்றும் முன் செய்த பயிற்சியின் பலனைச் சரிபார்த்து, நிறைவு செய்தவற்றைப் பதிவு செய்யவும்','Review completed practice before changing direction'],
 ['சொத்து அல்லது வீடு தொடர்பான ஆவணங்களைத் தகுதி பெற்ற நிபுணரிடம் சரிபார்க்கவும்','Have housing or property documents independently checked'],
 ['படிப்பு அல்லது பயிற்சிக்கு ஒரு சிறிய தொடர்ச்சியான அட்டவணை வகுக்கவும்','Establish a sustainable learning and rest routine'],
 ['வேலைப் பொறுப்பையும் ஓய்வையும் திட்டமிடவும்; கடன் தொடர்பான முடிவில் கணக்கை முதலில் உறுதிசெய்யவும்','Plan workload and rest; verify finances before borrowing'],
 ['கூட்டாளி அல்லது துணைவருடன் செலவு, நேரம், பொறுப்பு பற்றிய தெளிவான உடன்பாடு அமைக்கவும்','Agree on responsibilities and expenses with a partner'],
 ['காப்பீடு, வாரிசு, கூட்டுச் சொத்து ஆவணங்களை நிபுணர் உதவியுடன் பரிசோதிக்கவும்','Review insurance and joint records with appropriate professionals'],
 ['மேற்படிப்பு அல்லது பயணம் தொடர்பான திட்டத்தில் செலவும் நம்பகமான வழிகாட்டலும் உறுதி செய்யவும்','Verify study and travel costs with a trusted mentor'],
 ['வேலையில் செய்த பங்களிப்பை எழுதி வைத்துப் பொறுப்பும் அங்கீகாரமும் பற்றி முறையாக உரையாடவும்','Document work achievements and discuss responsibilities clearly'],
 ['வரும் என்று எதிர்பார்க்கும் தொகையைப் பெறப்பட்ட வருமானமாகக் கணக்கிட வேண்டாம்','Do not spend anticipated receipts as secured income'],
 ['உறக்க நேரத்தை ஒதுக்கி, பயணச் செலவிற்கு தனி வரம்பு வைக்கவும்','Protect sleep and set a separate travel budget']
];
const PLANET_PRACTICE={
 Sun:['தினசரி முடிவுகளுக்கும் வேலை–ஓய்வு நேரத்துக்கும் நிலையான ஒழுங்கு அமைக்கவும்','Set clear daily decision-making and work/rest boundaries','சூரிய வழிபாடு அல்லது பொதுநலச் சேவை','Sun devotion or community service'],
 Moon:['உறக்க நேரம், குடும்ப உரையாடல், மனஅழுத்தத்தைக் குறைக்கும் பழக்கங்களுக்கு முக்கியத்துவம் கொடுக்கவும்','Protect sleep, family conversations and stress-reducing habits','சிவ வழிபாடு அல்லது அன்னதானம்','Shiva devotion or food charity'],
 Mars:['கோபத்தில் பதிலளிப்பதற்கு முன் இடைவெளி விட்டு, உடற்பயிற்சியைப் பாதுகாப்பாகத் தொடரவும்','Allow time before reacting in anger and exercise safely','முருகன் வழிபாடு அல்லது உடல் உழைப்பில் பிறருக்கு உதவி','Murugan worship or volunteering with practical work'],
 Mercury:['எழுத்துப்பூர்வ ஒப்பந்தம், கற்றல், பணக்கணக்கை மீண்டும் சரிபார்க்கவும்','Check written agreements, learning plans and financial records','பெருமாள் வழிபாடு அல்லது மாணவர்களுக்கு கல்வி உதவி','Vishnu devotion or learning support'],
 Jupiter:['ஆலோசனை கூறுபவரின் தகுதியைச் சரிபார்த்து குடும்பம்–கல்வித் தீர்மானத்தில் நிதானம் காக்கவும்','Check the reliability of advisers and review family/education decisions','குரு வழிபாடு அல்லது ஆசிரியர்களுக்குச் சேவை','Guru devotion or support for teachers'],
 Venus:['உறவுகளின் எதிர்பார்ப்புகளையும் வரவு–செலவையும் வெளிப்படையாகப் பேசவும்','Discuss relationship expectations and spending openly','மகாலட்சுமி வழிபாடு அல்லது பெண்கள் கல்விக்கு உதவி','Lakshmi devotion or support for education'],
 Saturn:['கடமைகளுக்கான செயல்பாட்டு அட்டவணை வகுத்து ஓய்வையும் கணக்கிடவும்','Set a sustainable task schedule including rest','சனீஸ்வரர் வழிபாடு அல்லது முதியோருக்கு உதவி','Saturn devotion or elder assistance'],
 Rahu:['புதிய ஒப்பந்தம், ஆன்லைன் தகவல் மற்றும் முதலீட்டு வாக்குறுதிகளைச் சரிபார்க்கவும்','Verify novel claims, online information and proposed agreements','துர்க்கை வழிபாடு அல்லது தன்னார்வத் தொண்டு','Durga devotion or volunteer service'],
 Ketu:['அவசரமாகத் தனிமைப்படாமல் தேவையான தகவலைச் சேகரித்து முடிவெடுக்கவும்','Gather relevant facts before withdrawing or changing a plan','விநாயகர் வழிபாடு அல்லது கல்வி சார்ந்த சேவை','Vinayagar devotion or educational service']
};
function select(c,lang,used,windows=[]){const ta=lang!=='en';const structural=c.negative.filter(x=>['lord','occupies','aspects'].includes(x.relation)).sort((a,b)=>a.delta-b.delta);
 const risk=structural[0];if(!risk||risk.delta>-.65||c.conclusion==='support'||[...used].filter(k=>k.includes(':')).length>=5)return [];
 const key=`${c.house}:${risk.planet}`;if(used.has(key))return [];
 const mitigate=(c.classical||[]).some(x=>x.key==='GURU_COUNTER_ASPECT');
 const vargaRelief=(c.divisionEvidence||[]).some(x=>x.planet===c.lord&&x.dignity==='strong');
 const item=PLANET_PRACTICE[risk.planet];if(!item)return [];
 used.add(key);
 const pname=ta?g.SMVD311Judgement.NTA[risk.planet]:risk.planet;
 const reason=ta?`${c.house}-ஆம் பாவத்தின் ${risk.relation==='lord'?'அதிபதி':risk.relation==='occupies'?'இருப்பிடம்':'பார்வை'} தொடர்பில் ${pname} சார்ந்த எதிர் ஆதாரம் இருப்பதால்`:
 `With an observed restrictive ${risk.planet} ${risk.relation} connection to house ${c.house}`;
 const main=(ta?ADVICE[c.house-1][0]:ADVICE[c.house-1][1]);
 const support=ta?item[0]:item[1];
 const period=(windows||[]).find(w=>(w?.period?.md===risk.planet||w?.period?.ad===risk.planet)&&w?.weight>=2.4);
 const timing=period?`${period.period.from}–${period.period.to}`:null;
 const qualifier=mitigate||vargaRelief?(ta?'கிடைத்த பிறப்புத் துணை ஆதாரம் இருப்பதால் இதை உறுதியான தீய பலனாக எடுத்துக்கொள்ளாமல், முன்னெச்சரிக்கை வழிமுறையாகப் பயன்படுத்தலாம்.':'A balancing natal or divisional factor is also present; this is preventive support, not a definite adverse prediction.'):'';
 const action={kind:'practical',planet:risk.planet,house:c.house,reason:risk.relation,score:risk.delta,
  mitigation:mitigate,vargaRelief,period:timing,sourceKey:`H${c.house}:${risk.relation}:${risk.planet}:${risk.delta.toFixed(2)}`,
  text:ta?`${reason}, ${c.ageUnder18?'பெற்றோர் அல்லது ஆசிரியர் துணையுடன் ':''}${main} ${c.ageUnder18?'':support} ${timing?'இது குறிப்பாக '+timing+' காலத்தில் தொடர்புடைய செயல்முறை.':''} ${qualifier}`.trim():
  `${reason}, ${c.ageUnder18?'with help from a parent or teacher, ':''}${main}. ${c.ageUnder18?'':support+'.'} ${timing?'The connected period is '+timing+'.':''} ${qualifier}`.trim()};
 if(c.ageUnder18)return [action];
 if(used.has(risk.planet))return [action];
 used.add(risk.planet);
 const ritual={kind:'traditional_optional',planet:risk.planet,house:c.house,reason:risk.relation,
  sourceKey:action.sourceKey,period:timing,text:ta?`${c.house}-ஆம் பாவத்தின் ${pname} தொடர்பான இச்சூழலில், விருப்பமிருந்தால் ${item[2]}. வாழ்க்கை, சிகிச்சை அல்லது நிதி முடிவுகளுக்குப் பதிலாக இதைப் பயன்படுத்த வேண்டியதில்லை.`:
 `For the observed ${risk.planet} connection to house ${c.house}, an optional tradition is ${item[3]}. Do not use it instead of professional advice.`};
 return [action,ritual];
}

return Object.freeze({select});
});
