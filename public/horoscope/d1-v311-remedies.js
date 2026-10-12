/* V311 / 4 of 4: reason-linked practical and OPTIONAL traditional guidance.
 * No remedies for unsupported risk, no gems, fasting, causal cure or guaranteed outcome.
 */
(function(g,f){const v=f(g);g.SMVD311Remedies=v;if(typeof module==='object'&&module.exports)module.exports=v;})(typeof window==='object'?window:globalThis,function(g){'use strict';
const PRACTICAL_TA=[
 'ஒரே நேரத்தில் பல முடிவுகளை எடுக்காமல் அவசியமானதைத் தேர்ந்தெடுத்து முடிக்கவும்',
 'வீட்டுச் செலவு, கடன் மற்றும் மாதச் சேமிப்பிற்கு தனித்தனி பதிவு வைத்திருக்கவும்',
 'திறன் பயிற்சிக்கு நிலையான நேரம் வைத்து தொடங்கிய முயற்சிகளை முடிக்கவும்',
 'வீடு அல்லது சொத்து ஆவணங்களைத் தகுந்த நிபுணரிடம் சரிபார்க்கவும்',
 'பயிற்சிக்கும் ஓய்வுக்கும் ஒரே அளவிலான இடத்தைத் தரவும்',
 'வேலைப்பங்கீடு, ஓய்வு நேரம் மற்றும் கடன் செலுத்தும் ஒழுங்கை எழுதி வைத்திருக்கவும்',
 'உறவிலும் ஒப்பந்தத்திலும் எதிர்பார்ப்புகளையும் எல்லைகளையும் இரு தரப்பும் பேசி முடிக்கவும்',
 'காப்பீடு, வாரிசு, கூட்டுச் சொத்து ஆவணங்களின் நிலையை முறையாகச் சரிபார்க்கவும்',
 'நம்பகமான ஆசிரியர் அல்லது வழிகாட்டியிடம் கல்வி மற்றும் பயணத் திட்டத்தை உறுதிசெய்யவும்',
 'செய்த வேலைகள், திறன்கள் மற்றும் பொறுப்புகளின் பதிவுகளைப் பராமரிக்கவும்',
 'உறுதியாக வந்த வருவாயையும் எதிர்பார்க்கப்படும் வருவாயையும் தனித்தனியாகக் கணக்கிடவும்',
 'உறக்கத்திற்கும் தேவையான செலவிற்கும் முன்னுரிமை அளித்து தேவையற்ற சுமையைக் குறைக்கவும்'
];
const PRACTICAL_EN=[
 'choose and complete the highest-priority decision before taking on another','separate household spending, debts and savings in a written budget','reserve a repeatable practice schedule and finish ongoing work','have property or housing paperwork reviewed by a qualified professional','protect a balanced routine for learning, play and rest','document duties, repayment schedules and recovery time','agree on expectations and boundaries openly with the other party','review insurance, inheritance and shared documentation carefully','check study or travel plans with a trusted mentor','keep records of completed work, skills and responsibilities','distinguish secured receipts from projected income','protect sleep and set limits for discretionary spending'
];
const WORSHIP={Sun:['சூரிய நமஸ்கார வழிபாடு','voluntary Sun prayer'],Moon:['சிவ வழிபாடு','optional Shiva worship'],Mars:['முருகன் வழிபாடு','optional Murugan worship'],Mercury:['விஷ்ணு வழிபாடு','optional Vishnu worship'],Jupiter:['குரு வழிபாடு','optional Guru worship'],Venus:['மகாலட்சுமி வழிபாடு','optional Lakshmi worship'],Saturn:['சனீஸ்வரர் வழிபாடு','optional Saturn worship'],Rahu:['துர்க்கை வழிபாடு','optional Durga worship'],Ketu:['விநாயகர் வழிபாடு','optional Vinayagar worship']};
const HELP={Sun:['முதியவர்களுக்குத் தேவையான உதவி','support for older people'],Moon:['குடும்பப் பராமரிப்பில் சேவை','family-care assistance'],Mars:['படிப்பு அல்லது பயிற்சி உதவி','practical training support'],Mercury:['மாணவர்களுக்கு எழுது பொருட்கள்','educational materials'],Jupiter:['கல்வி உதவி','educational assistance'],Venus:['உணவு அல்லது கலைப் பயிற்சி உதவி','food or arts-related support'],Saturn:['உழைக்கும் மக்களுக்கு உதவி','support for workers'],Rahu:['சமூகப் பொறுப்பு சார்ந்த சேவை','community assistance'],Ketu:['அமைதியான தன்னார்வச் சேவை','quiet volunteering']};
function select(claim,lang,used){const ta=lang!=='en',risk=claim.negative.find(x=>['lord','aspects','occupies'].includes(x.relation));
 if(!risk||claim.conclusion==='support')return [];
 const message=ta?PRACTICAL_TA[claim.house-1]:PRACTICAL_EN[claim.house-1];
 if(claim.ageUnder18)return [{kind:'practical',planet:risk.planet,reason:risk.relation,text:ta?`பெற்றோர் அல்லது ஆசிரியர் ஆதரவுடன்: ${message}.`:`With the help of a parent or teacher: ${message}.`}];
 const arr=[{kind:'practical',planet:risk.planet,reason:risk.relation,text:ta?`இத்துறையில் அழுத்தம் தரும் ${g.SMVD311Judgement.NTA[risk.planet]} தொடர்பை முன்னிட்டு ${message}.`:`Because the natal evidence includes a challenging ${risk.planet} contact, ${message}.`}];
 if(!used.has(risk.planet)&&WORSHIP[risk.planet]){used.add(risk.planet);arr.push({kind:'traditional_optional',planet:risk.planet,reason:risk.relation,text:ta?`விருப்பமிருந்தால் ${WORSHIP[risk.planet][0]} அல்லது ${HELP[risk.planet][0]} போன்ற பாரம்பரியச் சேவையில் ஈடுபடலாம்; இது நிகழ்வை உறுதியாக மாற்றும் செயல் அல்ல.`:`Optional tradition: ${WORSHIP[risk.planet][1]} or ${HELP[risk.planet][1]}. These are not guaranteed to alter future events.`});}
 return arr;}
return Object.freeze({select});
});
