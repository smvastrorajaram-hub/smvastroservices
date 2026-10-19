/**
 * P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach.
 * Research-only rules from printed pp. 180-185 and Sodhya-Pinda transit
 * timing from pp. 337-341. No death date/age or certified lifespan is emitted.
 * The source expressly says Sodhya-Pinda timing is inconsistent and open to research.
 */
import { classicalShodhana } from './classical-shodhana.browser.mjs';

const EN=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const TA=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const NAK_TA=['அசுவினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிடம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','அஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const P=[
 {en:'Sun',ta:'சூரியன்',house:9,topic:'Father',topicTa:'தந்தை'},
 {en:'Moon',ta:'சந்திரன்',house:4,topic:'Mother',topicTa:'தாய்'},
 {en:'Mars',ta:'செவ்வாய்',house:3,topic:'Siblings',topicTa:'உடன்பிறந்தோர்'},
 {en:'Mercury',ta:'புதன்',house:10,topic:'Profession',topicTa:'தொழில்'},
 {en:'Jupiter',ta:'குரு',house:5,topic:'Children',topicTa:'குழந்தைகள்'},
 {en:'Venus',ta:'சுக்கிரன்',house:7,topic:'Marriage',topicTa:'திருமணம்'},
 {en:'Saturn',ta:'சனி',house:8,topic:'Longevity',topicTa:'ஆயுள்'}
];
const ALIAS={'Sun':'Sun','Moon':'Moon','Mars':'Mars','Mercury':'Mercury','Jupiter':'Jupiter','Venus':'Venus','Saturn':'Saturn','Rahu':'Rahu','Ketu':'Ketu','சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','புதன்':'Mercury','குரு':'Jupiter','சுக்கிரன்':'Venus','சனி':'Saturn','ராகு':'Rahu','கேது':'Ketu'};
const TABLE32=[7,2,9,8,3,10,1,8,3,2,9,4]; // PVR Table 32, printed p.182
const KIND=['movable','fixed','dual','movable','fixed','dual','movable','fixed','dual','movable','fixed','dual'];
const LORDS=[['Mars'],['Venus'],['Mercury'],['Moon'],['Sun'],['Mercury'],['Venus'],['Mars','Ketu'],['Jupiter'],['Saturn'],['Saturn','Rahu'],['Jupiter']];
const EXALT={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
const DEBIL={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
const PAR={short:{short:32,middle:64,long:96},middle:{short:36,middle:72,long:108},long:{short:40,middle:80,long:120}};
const mod=(n,m)=>((n%m)+m)%m;
function sign(lon){const n=Number(lon);return Number.isFinite(n)?mod(Math.floor(mod(n,360)/30),12):null;}
function getPlanets(chart){const r={};for(const q of chart?.planets||[]){const k=ALIAS[String(q?.name||'')],s=sign(q?.longitude);if(k&&s!==null)r[k]={...q,sign:s,degree:mod(Number(q.longitude),30)};}return r;}
function countAt(s,ps){return Object.values(ps).filter(x=>x.sign===s).length;}
function lord(s,ps){
 const owners=LORDS[mod(s,12)];if(owners.length===1)return owners[0];
 const score=n=>{const x=ps[n];if(!x)return 0;return 1+(EXALT[n]===x.sign?3:0)-(DEBIL[n]===x.sign?2:0)+([0,2,4,6,8,10].includes(x.sign)?0.25:0);};
 return [...owners].sort((a,b)=>score(b)-score(a))[0];
}
function signStrength(s,ps){const l=lord(s,ps),x=ps[l];let n=countAt(s,ps)*10;if(x)n+=5+(EXALT[l]===x.sign?20:0)-(DEBIL[l]===x.sign?10:0)+Math.max(0,15-(x.degree||0))/15;return n+(s===4?1:0);}
function stronger(a,b,ps){if(a==null)return b;if(b==null)return a;const x=signStrength(a,ps),y=signStrength(b,ps);return Math.abs(x-y)>1e-9?(x>y?a:b):(countAt(a,ps)>=countAt(b,ps)?a:b);}
function pair(a,b){if(a==null||b==null)return null;const k=[KIND[a],KIND[b]].sort().join('+');return ({'movable+movable':'long','dual+fixed':'long','dual+dual':'middle','fixed+movable':'middle','dual+movable':'short','fixed+fixed':'short'})[k]||null;}
function catFromHouse(h){return [1,4,7,10].includes(h)?'long':[2,5,8,11].includes(h)?'middle':'short';}
function horaSign(adv){const rows=adv?.v5?.phase1?.specialLagnas?.items;if(!Array.isArray(rows))return null;const h=rows.find(x=>x?.englishName==='Hora Lagna'||x?.name==='ஹோரா லக்னம்');return sign(h?.longitude);}

export function resolveSodhyaPindaTarget(product){
 const n=Number(product);if(!Number.isSafeInteger(n)||n<0)throw new RangeError('product must be a non-negative safe integer');
 const nn=(n%27)||27,rr=(n%12)||12,ni=nn-1,ri=rr-1;
 return Object.freeze({product:n,nakshatraNumber:nn,nakshatraIndex:ni,nakshatra:NAK_EN[ni],nakshatraTamil:NAK_TA[ni],rasiNumber:rr,rasiIndex:ri,rasi:EN[ri],rasiTamil:TA[ri],
  relatedVimshottariNakshatras:Object.freeze([((ni+9)%27),((ni+18)%27)].map(i=>({number:i+1,name:NAK_EN[i]})))});
}

export function pvrLongevitySodhyaTiming(chart,adv){
 const ps=getPlanets(chart),lagna=sign(chart?.lagna?.longitude),moon=ps.Moon?.sign,saturn=ps.Saturn?.sign,hora=horaSign(adv);
 const bav=adv?.ashtakavarga?.bhinna,raw={};
 if(Array.isArray(bav))for(const p of P){const r=bav.find(x=>x?.planet===p.ta||ALIAS[String(x?.planet||'')]===p.en);if(Array.isArray(r?.bindus)&&r.bindus.length===12&&r.bindus.every(n=>Number.isSafeInteger(n)&&n>=0&&n<=8))raw[p.en]=r.bindus.slice();}
 const grahaSigns={},occupied=[...new Set(Object.values(ps).map(x=>x.sign))],pindaRows=[],timingRows=[],missing=[];
 for(const p of P){if(ps[p.en])grahaSigns[p.ta]=ps[p.en].sign;else missing.push(p.en+' natal sign');if(!raw[p.en])missing.push(p.en+' BAV row');}
 for(const p of P){
  const row=raw[p.en],natal=ps[p.en];if(!row||!natal)continue;
  let sh;try{sh=classicalShodhana(row,occupied,grahaSigns);}catch(e){missing.push(p.en+' Shodhana: '+String(e?.message||e));continue;}
  const yoga=Number(sh?.pinda?.yogaPinda);
  pindaRows.push({planet:p.en,planetTamil:p.ta,rawBav:row,reducedBav:sh.ekadhipatya.values,rasiPinda:sh.pinda.rasiPinda,grahaPinda:sh.pinda.grahaPinda,sodhyaPinda:yoga,ruleConvention:sh.ruleConvention,certified:false});
  const targetSign=mod(natal.sign+p.house-1,12),rekhas=row[targetSign],product=rekhas*yoga,t=resolveSodhyaPindaTarget(product);
  timingRows.push({planet:p.en,planetTamil:p.ta,houseFromPlanet:p.house,topic:p.topic,topicTamil:p.topicTa,natalPlanetSign:EN[natal.sign],targetSignFromPlanet:EN[targetSign],targetSignFromPlanetTamil:TA[targetSign],rawBavRekhas:rekhas,sodhyaPinda:yoga,product,targetNakshatraNumber:t.nakshatraNumber,targetNakshatra:t.nakshatra,targetNakshatraTamil:t.nakshatraTamil,targetRasiNumber:t.rasiNumber,targetRasi:t.rasi,targetRasiTamil:t.rasiTamil,relatedVimshottariNakshatras:t.relatedVimshottariNakshatras,certified:false});
 }
 const pairRows=[];
 if(lagna!==null&&moon!==null&&saturn!==null&&hora!==null){
  const e8=TABLE32[lagna],ll=lord(lagna,ps),el=lord(e8,ps);
  pairRows.push({key:'lagnaLordEighthLord',label:'Lagna lord + 8th lord (Table 32)',category:pair(ps[ll]?.sign,ps[el]?.sign),lords:[ll,el],signs:[ps[ll]?.sign??null,ps[el]?.sign??null]},
   {key:'moonSaturn',label:'Moon + Saturn',category:pair(moon,saturn),signs:[moon,saturn]},
   {key:'lagnaHoraLagna',label:'Lagna + Hora Lagna',category:pair(lagna,hora),signs:[lagna,hora]});
 }
 const cats=pairRows.map(x=>x.category);let combined=null,parama=null,selection=null;
 if(cats.length===3&&cats.every(Boolean)){
  if(cats[0]===cats[1]&&cats[1]===cats[2]){combined=cats[0];selection='All three pairs agree.';}
  else {const cnt=cats.reduce((o,c)=>(o[c]=(o[c]||0)+1,o),{}),major=Object.keys(cnt).find(c=>cnt[c]>=2);
   if(major){combined=major;const third=cats.find(c=>c!==major);parama=third?PAR[third][major]:null;selection='Two-pair majority; Table 34 used where the third pair differs.';}
   else {const moonInLagnaOr7=moon===lagna||moon===mod(lagna+6,12);combined=moonInLagnaOr7?cats[1]:cats[2];selection=moonInLagnaOr7?'Three-way tie: prefer Moon-Saturn because Moon is in Lagna/7th.':'Three-way tie: prefer Lagna-Hora Lagna.';}
  }
 }
 let eighthLordMethod=null;
 if(lagna!==null){const ref=stronger(lagna,mod(lagna+6,12),ps),e8=TABLE32[ref],el=lord(e8,ps),ls=ps[el]?.sign;
  if(ls!==undefined){const h=mod(ls-ref,12)+1;eighthLordMethod={referenceSign:EN[ref],referenceSignTamil:TA[ref],strengthBasis:'SMV approximate sign-strength heuristic; not a complete textbook strength audit.',eighthSign:EN[e8],eighthLord:el,eighthLordSign:EN[ls],relativeHouse:h,category:catFromHouse(h),rule:'Quadrant = long; Panaphara = middle; Apoklima = short.',certified:false};}
 }
 return Object.freeze({
  source:{book:'P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach',longevityPages:'180–185',dasaPages:'226–289',sodhyaPindaPages:'337–341'},
  longevity:{available:pairRows.length===3,pairs:pairRows,combinedCategory:combined,paramaayushYears:parama,selectionRule:selection,eighthLordMethod,
   additionalRules:[
    'Maraka houses: 2nd and 7th; vitality/longevity houses: 3rd and 8th. Check relevant lords and Dasa/transit links only as corroborating indicators.',
    'Rudra: compare lords of the special 8th houses from Lagna and 7th using Table 32 and source-specific strength/affliction exceptions.',
    'Trishoola: three signs trinal to Rudra; compare with the provisional longevity category in Niryaana Shoola Dasa.',
    'Maheswara: 8th lord from Atmakaraka, subject to the exceptions in §14.3.'
   ],researchOnly:true,certified:false,caution:'The book says longevity-category methods are not infallible; no life-span age or death date is produced.'},
  sodhyaPindaEventTiming:{available:timingRows.length===7,method:'Raw BAV rekhas in the specified house from the planet × that planet’s PVR/Parasara Sodhya Pinda. Divide by 27 for nakshatra and by 12 for rasi; zero remainder means 27th nakshatra/12th rasi.',rows:timingRows,pindaRows,missingInputs:missing,researchOnly:true,certified:false,caution:'The author says this timing method is inconsistent and open to research. Transit indications are not certain event dates.'}
 });
}
