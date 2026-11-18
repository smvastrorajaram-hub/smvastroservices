import {TAMIL_ACTIVITIES} from '../activities.mjs';

const RULES = Object.freeze([
  {
    id:'TML_VM02_MARRIAGE_TITHI_5',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===5,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் பஞ்சமி திருமணச் செயலுக்குச் சிறப்பாகக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Pañcamī as favourable for a marriage-related undertaking.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'A preferred tithi is not an all-purpose pass; chapter 3 yogas and chapter 11 marriage rules remain to be collated.'
  },
  {
    id:'TML_VM02_MARRIAGE_TITHI_7',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===7,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் சப்தமி திருமணத்திற்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 also names Saptamī for marriage.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'Preference only; no exclusive eligible-tithi list is inferred.'
  },
  {
    id:'TML_VM02_MARRIAGE_TITHI_13',
    activity:'vivaha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===13,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் திரயோதசி திருமணத்திற்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Trayodaśī among marriage-related auspicious tithis.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'Preference only; the full chapter 3 yoga and activity exclusions are not yet applied.'
  },
  {
    id:'TML_VM02_VASTU_YATRA_TITHI_6',
    activity:['vastu','griharambha','yatra'],kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===6,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் ஷஷ்டி வாஸ்து / பயணச் செயல்களுக்குக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Ṣaṣṭhī for Vāstu and journey-related work.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'A preference, not a complete Vāstu or travel election.'
  },
  {
    id:'TML_VM02_GRIHAPRAVESHA_PURNA_TITHI',
    activity:'grihapravesha',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===15,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் பௌர்ணமி வீடு புகுதல் சார்ந்த நற்செயலுக்குக் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Pūrṇimā for house-entry-related auspicious work.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'Needs confirmation against the exact 1900 printed page and chapter 25 house-entry shuddhi.'
  },
  {
    id:'TML_VM02_VEHICLE_TRAYODASHI',
    activity:'vehicle',kind:'PREFERRED',factor:'tithi',
    sourceId:'TML_VIDHANAMALAI_1900',reference:'Chapter 2, Pañcāṅkam, verse-level Tamil transcript',
    condition:f=>f.tithiNumber===13,
    reasonTa:'விதானமாலை அத்தியாயம் 2-ல் திரயோதசி வாகனச் செயலுக்கும் குறிப்பிடப்படுகிறது.',
    reasonEn:'Vidhānamālai chapter 2 names Trayodaśī for vehicle-related work.',
    reviewStatus:'source-text-captured',enabled:true,
    exceptions:'Preference only; vehicle purchase, first use and pūjā need separate comparison.'
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
