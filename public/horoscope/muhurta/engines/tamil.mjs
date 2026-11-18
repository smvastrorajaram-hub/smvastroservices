import {TAMIL_ACTIVITIES} from '../activities.mjs';

const RULES = Object.freeze([
  {
    id:'TML_VM02_MARRIAGE_TITHI_5',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===5,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் பஞ்சமி திருமணச் செயலுக்குச் சிறப்பாகக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Pañcamī as favourable for a marriage-related undertaking.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'Chapter 2 also treats Ṣaṣṭhī as pakṣa-chidra in both fortnights with a starting nāḻikai exclusion; other verses give conflicting general tithi schemes. Keep pending until the entire chapter and 3rd chapter are reconciled.'
  },
  {
    id:'TML_VM02_MARRIAGE_TITHI_7',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===7,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் சப்தமி திருமணத்திற்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 also names Saptamī for marriage.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'The same chapter includes a view that Saptamī is not selected for bright work. Keep this activity-specific verse and the differing view side-by-side until reconciled.'
  },
  {
    id:'TML_VM02_MARRIAGE_TITHI_13',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===13,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் திரயோதசி திருமணத்திற்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Trayodaśī among marriage-related auspicious tithis.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'Preference only; the full chapter 3 yoga and activity exclusions are not yet applied.'
  },
  {
    id:'TML_VM02_VASTU_YATRA_TITHI_6',
    activity:['vastu','griharambha','yatra'],kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===6,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் ஷஷ்டி வாஸ்து / பயணச் செயல்களுக்குக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Ṣaṣṭhī for Vāstu and journey-related work.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'Ṣaṣṭhī is also named among pakṣa-chidra tithis; its permitted remainder depends on a start-of-tithi nāḻikai exclusion. Not safe as an all-day preference.'
  },
  {
    id:'TML_VM02_GRIHAPRAVESHA_PURNA_TITHI',
    activity:'grihapravesha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===15,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் பௌர்ணமி வீடு புகுதல் சார்ந்த நற்செயலுக்குக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Pūrṇimā for house-entry-related auspicious work.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'Pūrṇimā is described as suitable for house-entry, but local month, star, lagna and other defects are not yet reconciled.'
  },
  {
    id:'TML_VM02_VEHICLE_TRAYODASHI',
    activity:'vehicle',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===13,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் திரயோதசி வாகனச் செயலுக்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Trayodaśī for vehicle-related work.',
    reviewStatus:'pending-parallel-rule-collation',enabled:false,
    exceptions:'The chapter has activity-specific and pakṣa-wide constraints. Vehicle purchase, mounting, first use and pūjā must not be treated as one identical act.'
  },
  {
    id:'TML_VM25_VIVaha_LAGNA_SHUDDHI',
    activity:'vivaha',kind:'REQUIRED',factor:'house-purity',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 25, Echchavinai, marriage lagna-shuddhi note',
    condition:f=>Array.isArray(f.houseOccupants)&&f.houseOccupants[6]?.length===0,
    reasonTa:'திருமண முகூர்த்தத்தில் ஏழாம் பாவச் சுத்தி எனும் விதி மூலத்தில் குறிப்பிடப்படுகிறது.',
    reasonEn:'The source records a seventh-house purity condition for marriage election.',
    reviewStatus:'pending-edition-collation',enabled:false,
    exceptions:'The exact meaning of shuddhi (empty house vs. malefic exclusion) must be checked against the printed Tamil commentary.'
  },
  {
    id:'TML_VM25_YATRA_5TH_HOUSE_SHUDDHI',
    activity:'yatra',kind:'REQUIRED',factor:'house-purity',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 25, Echchavinai, journey lagna-shuddhi note',
    condition:f=>Array.isArray(f.houseOccupants)&&f.houseOccupants[4]?.length===0,
    reasonTa:'பயண முகூர்த்தத்தில் ஐந்தாம் பாவச் சுத்தி எனும் விதி ஆதாரத்தில் உள்ளது.',
    reasonEn:'The source records a fifth-house purity condition for journey election.',
    reviewStatus:'pending-edition-collation',enabled:false,
    exceptions:'Not enforced until the exact technical meaning and exception are checked.'
  },
  {
    id:'TML_VM25_GRIHAPRAVESHA_HOUSE_SHUDDHI',
    activity:'grihapravesha',kind:'REQUIRED',factor:'house-purity',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 25, Echchavinai, house-entry lagna-shuddhi note',
    condition:f=>Array.isArray(f.houseOccupants)&&[6,7,11].every(i=>f.houseOccupants[i]?.length===0),
    reasonTa:'கிரகப்பிரவேசத்தில் ஏழு, எட்டு, பன்னிரண்டாம் பாவச் சுத்தி எனும் குறிப்பு உள்ளது.',
    reasonEn:'The source records seventh, eighth and twelfth-house purity for house entry.',
    reviewStatus:'pending-edition-collation',enabled:false,
    exceptions:'Not enforced until exact commentary establishes whether all occupants or only malefics are excluded.'
  },
  {
    id:'TML_VM02_PAKSHA_CHIDRA_START_NAZHIGAI',
    activity:['vivaha','nichayathartham','pumsavana','seemantham','namakaranam','cradle','annaprashana','karnavedha','chaula','vidyarambha','upanayana','vastu','griharambha','grihapravesha','yatra','vehicle','agriculture','business','deity_installation'],
    kind:'PROHIBITED',factor:'tithi-start-nazhigai',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, “Pakṣa-chidra” verses and tithi-prasangam',
    condition:()=>null,
    reasonTa:'பக்ஷச்சித்ர திதிகளின் தொடக்க நாழிகைகளை நீக்கிய பின்னரே சில செயல்களுக்கு தகுதி உண்டு என மூல விளக்கம் கூறுகிறது.',
    reasonEn:'The source excludes specified opening nāḻikais of pakṣa-chidra tithis before the remainder can be considered.',
    reviewStatus:'pending-boundary-timing-and-commentary',enabled:false,
    exceptions:'The verse names Caturthī, Navamī, Ṣaṣṭhī, Aṣṭamī, Dvādaśī and Caturdaśī in both fortnights and gives opening exclusions of 9, 25, 9, 14, 10 and 5 nāḻikais respectively. Exact tithi-start timing and the commentary must be reconciled before enforcement.'
  },
  {
    id:'TML_VM02_GENERAL_PAKSHA_TITHI_VARIANTS',
    activity:['vivaha','nichayathartham','pumsavana','seemantham','namakaranam','cradle','annaprashana','karnavedha','chaula','vidyarambha','upanayana','vastu','griharambha','grihapravesha','yatra','vehicle','agriculture','business','deity_installation'],
    kind:'CONDITIONAL',factor:'paksha-tithi-variant',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, general auspicious-tithi verses',
    condition:()=>null,
    reasonTa:'வளர்பிறை / தேய்பிறை திதிகளுக்கான பொதுவிதிகளிலும், வேறுபட்ட ஆசிரியர் கருத்துகளிலும் முரண்பாடுகள் உள்ளன.',
    reasonEn:'The source records differing general schemes for waxing/waning fortnight tithis and divergent opinions.',
    reviewStatus:'pending-variant-modelling',enabled:false,
    exceptions:'The text calls waxing fortnight best, waning middling, excludes bright-half first five and dark-half last five in one view (with a footnote exception), and later records other odd/even and bright-work views. Never collapse these into one global list.'
  },
  {
    id:'TML_VM16_ANNAPRASHANA',
    activity:'annaprashana',kind:'CONDITIONAL',factor:'monthly-and-nakshatra',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 16, Maintharvinai, annaprāśana verse',
    condition:()=>null,
    reasonTa:'அன்னப்பிராசனத்திற்கு மாதம் மற்றும் நட்சத்திரம் சார்ந்த தனி விதி உள்ளது.',
    reasonEn:'Annaprāśana has a separate month and nakshatra rule in the source.',
    reviewStatus:'pending-exact-rule-transcription',enabled:false,
    exceptions:'Sex-specific variants are intentionally not implemented; obtain exact non-discriminatory, edition-verified rule.'
  }
]);

const ACTIVITY_BY_ID = new Map(TAMIL_ACTIVITIES.map(item=>[item.id,item]));

function applies(rule,activity){
  return Array.isArray(rule.activity)?rule.activity.includes(activity):rule.activity===activity;
}
function evaluateRule(rule,facts){
  if(!rule.enabled)return {id:rule.id,kind:rule.kind,state:'pending',reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
  const result=rule.condition(facts);
  if(result===null||result===undefined)return {id:rule.id,kind:rule.kind,state:'unknown',reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
  const match=Boolean(result);
  let state='not-applicable';
  if(rule.kind==='PREFERRED')state=match?'preferred':'not-preferred';
  else if(rule.kind==='PROHIBITED')state=match?'prohibited':'clear';
  else if(rule.kind==='REQUIRED')state=match?'satisfied':'failed';
  else state='conditional';
  return {id:rule.id,kind:rule.kind,state,reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
}

export function evaluateTamilMuhurta(activityId,facts){
  if(!ACTIVITY_BY_ID.has(activityId)){
    return {tradition:'tamil',activityId,status:'NOT_VERIFIED',complete:false,reason:'Unknown Tamil-tradition activity.',rules:[]};
  }
  if(!facts||facts.schema!=='smv.muhurta.astronomy-facts.v1'||facts.tithiNumber==null||facts.weekdayIndex==null){
    return {tradition:'tamil',activityId,status:'NOT_VERIFIED',complete:false,reason:'Required astronomical facts are unavailable.',rules:[]};
  }
  const matching=RULES.filter(rule=>applies(rule,activityId));
  const evaluated=matching.map(rule=>evaluateRule(rule,facts));
  const failures=evaluated.filter(rule=>rule.state==='failed'||rule.state==='prohibited');
  const preferences=evaluated.filter(rule=>rule.state==='preferred');
  const unresolved=evaluated.some(rule=>['pending','unknown','conditional'].includes(rule.state));
  const complete=false; // Source coverage for all activities remains partial.
  const status=failures.length?'REJECTED':(preferences.length||unresolved?'CONDITIONAL':'NOT_VERIFIED');
  return {
    tradition:'tamil',activityId,activityLabel:ACTIVITY_BY_ID.get(activityId).labelTa,
    status,complete,decisionScope:'selected-instant-only',
    reason:failures.length?'A source-registered required/prohibited condition is triggered.':'Only partial source coverage is available; this is not a final muhurta certification.',
    preferredFactors:preferences.map(rule=>rule.id),
    rules:evaluated,
    sourceCoverage:ACTIVITY_BY_ID.get(activityId).sourceStatus
  };
}

export function listTamilMuhurtaRules(activityId=null){
  return RULES.filter(rule=>!activityId||applies(rule,activityId)).map(({condition,...rule})=>({...rule}));
}
