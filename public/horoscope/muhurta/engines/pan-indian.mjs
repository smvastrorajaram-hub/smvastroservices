import {PAN_INDIAN_ACTIVITIES} from '../activities.mjs';

const RULES = Object.freeze([
  {
    id:'PAN_MC01_22_GRIHAPRAVESHA_TUESDAY_ASHWINI',
    activity:'grihapravesha',kind:'PROHIBITED',factor:'weekday-nakshatra',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Śubhāśubha-prakaraṇa 1.22',
    condition:f=>f.weekdayIndex===2&&f.nakshatraNumber===1,
    reasonTa:'முஹூர்த்த சிந்தாமணி 1.22: செவ்வாய்க்கிழமை அசுவினி நட்சத்திரம் கிரகப்பிரவேசத்திற்கு விலக்கப்படுகிறது.',
    reasonEn:'Muhūrta Cintāmaṇi 1.22 rejects Aśvinī on Tuesday for house-entry.',
    reviewStatus:'verified-transcription',enabled:true,
    exceptions:'General yoga-cancellation rules elsewhere in the chapter are not assumed to cancel this specific activity rule without an edition-checked exception.'
  },
  {
    id:'PAN_MC01_22_YATRA_SATURDAY_ROHINI',
    activity:'yatra',kind:'PROHIBITED',factor:'weekday-nakshatra',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Śubhāśubha-prakaraṇa 1.22',
    condition:f=>f.weekdayIndex===6&&f.nakshatraNumber===4,
    reasonTa:'முஹூர்த்த சிந்தாமணி 1.22: சனிக்கிழமை ரோகிணி (பிரஹ்ம) நட்சத்திரம் பயணத்திற்கு விலக்கப்படுகிறது.',
    reasonEn:'Muhūrta Cintāmaṇi 1.22 rejects Rohiṇī (Brāhma) on Saturday for a journey.',
    reviewStatus:'verified-transcription',enabled:true,
    exceptions:'General yoga-cancellation rules elsewhere in the chapter are not assumed to cancel this specific activity rule without an edition-checked exception.'
  },
  {
    id:'PAN_MC01_22_VIVAHA_THURSDAY_PUSHYA',
    activity:'vivaha',kind:'PROHIBITED',factor:'weekday-nakshatra',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Śubhāśubha-prakaraṇa 1.22',
    condition:f=>f.weekdayIndex===4&&f.nakshatraNumber===8,
    reasonTa:'முஹூர்த்த சிந்தாமணி 1.22: வியாழக்கிழமை பூசம் நட்சத்திரம் திருமணத்திற்கு விலக்கப்படுகிறது.',
    reasonEn:'Muhūrta Cintāmaṇi 1.22 rejects Puṣya on Thursday for marriage.',
    reviewStatus:'verified-transcription',enabled:true,
    exceptions:'Marriage chapter 6 supplies additional constraints which are not yet fully implemented.'
  },
  {
    id:'PAN_MC01_42_GENERAL_YOGA_EXCEPTION',
    activity:['samskara','jatakarma','annaprashana','chaula','upanayana','vidyarambha','vivaha','vadhupravesha','dviragamanam','agnyadhana','rajyabhisheka','yatra','vastu','grihapravesha'],
    kind:'CONDITIONAL',factor:'exception',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Śubhāśubha-prakaraṇa 1.42',
    condition:()=>null,
    reasonTa:'அத்தியாயம் 1.42 சில பொதுவான குறைகளை நல்ல யோகம் நீக்கும் விதிவிலக்கை விவரிக்கிறது.',
    reasonEn:'Chapter 1.42 describes a general auspicious-yoga exception for some ordinary defects.',
    reviewStatus:'pending-exception-mapping',enabled:false,
    exceptions:'The exact defects neutralized by this verse and whether it applies to 1.22 activity-specific exclusions require printed-edition collation.'
  },
  {
    id:'PAN_MC05_11_JATAKARMA_DAY_AND_PANCHANGA',
    activity:'jatakarma',kind:'REQUIRED',factor:'post-birth-day-and-panchanga',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Saṃskāra-prakaraṇa 5.11',
    condition:f=>[11,12].includes(Number(f.dayAfterBirth)),
    reasonTa:'5.11-ஆம் சுலோகம் ஜாதகர்மம் உள்ளிட்ட குழந்தைச் சடங்குகளுக்கு 11/12-ஆம் நாள் சார்ந்த விதியைத் தருகிறது.',
    reasonEn:'Verse 5.11 gives an 11th/12th-day condition for Jātakarma and related infant rites.',
    reviewStatus:'pending-full-verse-collation',enabled:false,
    exceptions:'Tithi, parvan and nakshatra qualifications in the same verse must be implemented before this can be used.'
  },
  {
    id:'PAN_MC05_17_VIDYARAMBHA_LAGNA',
    activity:'vidyarambha',kind:'REQUIRED',factor:'tithi-nakshatra-lagna',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Saṃskāra-prakaraṇa 5.17–5.18',
    condition:()=>null,
    reasonTa:'5.17–5.18 கல்வி தொடக்கத்திற்குத் திதி, நட்சத்திரம், லக்னம் மற்றும் கிரக நிலைகளை இணைக்கிறது.',
    reasonEn:'Verses 5.17–5.18 combine tithi, nakshatra, lagna and planetary conditions for the learning rite.',
    reviewStatus:'pending-rule-transcription',enabled:false,
    exceptions:'No single star or weekday is inferred from the damaged/OCR text.'
  },
  {
    id:'PAN_MC06_VIVAHA_LAGNA_AND_DOSHA',
    activity:'vivaha',kind:'REQUIRED',factor:'lagna-and-dosha',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Vivāha-prakaraṇa 6; compare printed 1945 edition',
    condition:()=>null,
    reasonTa:'திருமண அத்தியாயம் தனிப்பட்ட லக்னம், கிரக அமைப்பு மற்றும் முகூர்த்த தோஷங்களைச் சோதிக்கிறது.',
    reasonEn:'The Vivāha chapter has separate lagna, planetary and muhurta-defect conditions.',
    reviewStatus:'pending-complete-chapter-transcription',enabled:false,
    exceptions:'Do not replace the complete marriage chapter with a few general tithi or nakshatra shortcuts.'
  },
  {
    id:'PAN_MC11_YATRA_TITHI_DIK_AND_LAGNA',
    activity:'yatra',kind:'REQUIRED',factor:'tithi-direction-lagna',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Yātrā-prakaraṇa 11.8–11.12 and 11.111–11.112',
    condition:()=>null,
    reasonTa:'பயண அத்தியாயம் திதி, திசை, வாரம், நட்சத்திரம், லக்னம் ஆகியவற்றை இணைக்கிறது.',
    reasonEn:'The travel chapter combines tithi, direction, weekday, nakshatra and lagna.',
    reviewStatus:'pending-translation-and-exception-check',enabled:false,
    exceptions:'The travel chapter contains journey/direction and personal-chart conditions; these must not be flattened into one universal block list.'
  },
  {
    id:'PAN_MC12_VASTU_SITE_RULES',
    activity:'vastu',kind:'CONDITIONAL',factor:'site-selection',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Vāstu-prakaraṇa 12.1–12.26',
    condition:()=>null,
    reasonTa:'வாஸ்து அத்தியாயத்தில் நிலம், திசை, கட்டிட அமைப்பு மற்றும் தளத் தேர்வு விதிகள் உள்ளன.',
    reasonEn:'The Vāstu chapter contains plot, direction, structure and site-selection rules.',
    reviewStatus:'not-a-date-rule-pending-separation',enabled:false,
    exceptions:'Site geometry and construction design are not treated as date/time eligibility.'
  },
  {
    id:'PAN_MC13_GRIHAPRAVESHA_MONTH_NAKSHATRA_LAGNA',
    activity:'grihapravesha',kind:'REQUIRED',factor:'month-nakshatra-lagna',
    sourceId:'PAN_MUHURTA_CINTAMANI_MUM',reference:'Gṛhapraveśa-prakaraṇa 13.1–13.7',
    condition:()=>null,
    reasonTa:'கிரகப்பிரவேச அத்தியாயம் அயனம், மாதம், நட்சத்திரம், லக்னம் ஆகியவற்றுக்குத் தனி நிபந்தனைகள் தருகிறது.',
    reasonEn:'The house-entry chapter has separate ayana, month, nakshatra and lagna conditions.',
    reviewStatus:'pending-printed-edition-collation',enabled:false,
    exceptions:'The available scan OCR is imperfect; exact readings and regional variants must be checked before implementation.'
  }
]);

const ACTIVITY_BY_ID=new Map(PAN_INDIAN_ACTIVITIES.map(item=>[item.id,item]));
function applies(rule,activity){
  return Array.isArray(rule.activity)?rule.activity.includes(activity):rule.activity===activity;
}
function evaluateRule(rule,facts){
  if(!rule.enabled)return {id:rule.id,kind:rule.kind,state:'pending',reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
  const result=rule.condition(facts);
  if(result===null||result===undefined)return {id:rule.id,kind:rule.kind,state:'unknown',reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
  const match=Boolean(result);
  const state=rule.kind==='PROHIBITED'?(match?'prohibited':'clear')
    :rule.kind==='REQUIRED'?(match?'satisfied':'failed')
    :rule.kind==='PREFERRED'?(match?'preferred':'not-preferred'):'conditional';
  return {id:rule.id,kind:rule.kind,state,reasonTa:rule.reasonTa,reasonEn:rule.reasonEn,sourceId:rule.sourceId,reference:rule.reference,reviewStatus:rule.reviewStatus,exceptions:rule.exceptions};
}

export function evaluatePanIndianMuhurta(activityId,facts,options={}){
  if(!ACTIVITY_BY_ID.has(activityId)){
    return {tradition:'panIndian',activityId,status:'NOT_VERIFIED',complete:false,reason:'Unknown Pan-Indian activity.',rules:[]};
  }
  if(!facts||facts.schema!=='smv.muhurta.astronomy-facts.v1'||facts.tithiNumber==null||facts.weekdayIndex==null){
    return {tradition:'panIndian',activityId,status:'NOT_VERIFIED',complete:false,reason:'Required astronomical facts are unavailable.',rules:[]};
  }
  const applicableRules=RULES.filter(rule=>applies(rule,activityId));
  const evaluated=applicableRules.map(rule=>evaluateRule(rule,facts));
  const segments=Array.isArray(options.nakshatraSegments)?options.nakshatraSegments:[];
  const restrictedWindows=[];
  for(const rule of applicableRules.filter(item=>item.enabled&&item.kind==='PROHIBITED')){
    for(const segment of segments){
      const star=Number(segment?.nakshatraNumber);
      if(!Number.isInteger(star)||!rule.condition({...facts,nakshatraNumber:star}))continue;
      const start=String(segment.start??'');
      const end=String(segment.end??'');
      if(!start||!end)continue;
      restrictedWindows.push({
        ruleId:rule.id,
        start,end,
        startTimestamp:Number.isFinite(Number(segment.startTimestamp))?Number(segment.startTimestamp):null,
        endTimestamp:Number.isFinite(Number(segment.endTimestamp))?Number(segment.endTimestamp):null,
        nakshatraNumber:star,
        sourceId:rule.sourceId,
        reference:rule.reference
      });
    }
  }
  const failures=evaluated.filter(rule=>rule.state==='failed'||rule.state==='prohibited');
  const pending=evaluated.some(rule=>['pending','unknown','conditional'].includes(rule.state));
  return {
    tradition:'panIndian',activityId,activityLabel:ACTIVITY_BY_ID.get(activityId).labelTa,
    status:failures.length?'REJECTED':(pending?'CONDITIONAL':'NOT_VERIFIED'),
    complete:false,decisionScope:'selected-instant-only',
    reason:failures.length?'A source-registered activity-specific prohibition is triggered.':'The checked source passages are only a subset of the full activity rules; no final muhurta certification is available.',
    rules:evaluated,
    sourceCoverage:ACTIVITY_BY_ID.get(activityId).sourceStatus
  };
}

export function listPanIndianMuhurtaRules(activityId=null){
  return RULES.filter(rule=>!activityId||applies(rule,activityId)).map(({condition,...rule})=>({...rule}));
}
