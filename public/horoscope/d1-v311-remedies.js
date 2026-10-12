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
const WORSHIP={Sun:['சூரிய வழிபாடு','Sun prayer'],Moon:['சிவ வழிபாடு','Shiva prayer'],Mars:['முருகன் வழிபாடு','Murugan prayer'],Mercury:['பெருமாள் வழிபாடு','Vishnu prayer'],Jupiter:['குரு வழிபாடு','Guru prayer'],Venus:['மகாலட்சுமி வழிபாடு','Lakshmi prayer'],Saturn:['சனீஸ்வரர் வழிபாடு','Saturn prayer'],Rahu:['துர்க்கை வழிபாடு','Durga prayer'],Ketu:['விநாயகர் வழிபாடு','Vinayagar prayer']};
function select(c,lang,used){const ta=lang!=='en';const structural=c.negative.filter(x=>['lord','occupies','aspects'].includes(x.relation)).sort((a,b)=>a.delta-b.delta);
 const risk=structural[0];if(!risk||risk.delta>-.48||c.conclusion==='support'||used.size>=3)return [];
 const key=`${c.house}:${risk.planet}`;if(used.has(key))return [];
 used.add(key);
 const planet=ta?g.SMVD311Judgement.NTA[risk.planet]:risk.planet;
 const reason=ta?`${c.house}-ஆம் பாவத்துடன் ${planet} பெறும் பாதகமான பிறப்புத் தொடர்பை ஒட்டி`:`In response to the restrictive natal ${risk.planet} link with house ${c.house}`;
 const practical={kind:'practical',planet:risk.planet,house:c.house,reason:risk.relation,score:risk.delta,text:ta?`${reason}, ${ADVICE[c.house-1][0]}`:`${reason}, ${ADVICE[c.house-1][1]}.`};
 if(c.ageUnder18)return [{...practical,text:ta?`பெற்றோர் அல்லது ஆசிரியர் உதவியுடன் ${ADVICE[c.house-1][0]}`:`With parent or teacher support: ${ADVICE[c.house-1][1]}.`}];
 const result=[practical];
 if(used.size<=2&&WORSHIP[risk.planet])result.push({kind:'traditional_optional',planet:risk.planet,house:c.house,reason:risk.relation,text:ta?`மனநிம்மதிக்காக விரும்பினால் ${WORSHIP[risk.planet][0]} அல்லது தன்னார்வச் சேவையைச் செய்யலாம்.`:`For personal reflection, optional ${WORSHIP[risk.planet][1]} or volunteer service may be chosen.`});
 return result;
}
return Object.freeze({select});
});
