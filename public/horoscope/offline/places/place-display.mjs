/* SMV ASTRO V333 / 2F — offline India place display only.
 * GeoNames shards are immutable: IDs, aliases, lat/lon, timezone and ranking
 * must never be changed by locale rendering. No inferred translations of
 * unknown localities: use a COMPLETE English display instead of mixed scripts.
 */
const cleanEn=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').replace(/ı/g,'i').replace(/\s+/g,' ').trim();
const key=value=>cleanEn(value).toLowerCase();
const asState=value=>cleanEn(value).replace(/^(?:State of|Union Territory of)\s+/i,'');
const asDistrict=value=>cleanEn(value).replace(/\s+district$/i,'');
const isTamil=value=>/^[\u0B80-\u0BFF\u200c\u200d .\-()]+$/u.test(value)&&/[\u0B80-\u0BFF]/u.test(value);
const CURRENT=()=>typeof document!=='undefined'&&/^ta(?:-|$)/i.test(document.documentElement?.lang||'')?'ta':'en';
export const offlinePlaceLanguage=CURRENT;
const states={
  'tamil nadu':'தமிழ்நாடு', 'kerala':'கேரளா', 'karnataka':'கர்நாடகம்',
  'andhra pradesh':'ஆந்திரப் பிரதேசம்','telangana':'தெலங்கானா',
  'maharashtra':'மகாராஷ்டிரா', 'puducherry':'புதுச்சேரி',
  'uttar pradesh':'உத்தரப் பிரதேசம்','madhya pradesh':'மத்தியப் பிரதேசம்',
  'bihar':'பீகார்','west bengal':'மேற்கு வங்காளம்','odisha':'ஒடிசா',
  'jharkhand':'ஜார்கண்ட்','chhattisgarh':'சத்தீஸ்கர்',
  'gujarat':'குஜராத்','rajasthan':'ராஜஸ்தான்','goa':'கோவா',
  'punjab':'பஞ்சாப்','haryana':'அரியானா','uttarakhand':'உத்தராகண்ட்',
  'himachal pradesh':'இமாச்சலப் பிரதேசம்',
  'jammu and kashmir':'ஜம்மு மற்றும் காஷ்மீர்',
  'national capital territory of delhi':'டெல்லி','delhi':'டெல்லி',
  'assam':'அசாம்','arunachal pradesh':'அருணாசலப் பிரதேசம்',
  'meghalaya':'மேகாலயா','nagaland':'நாகாலாந்து','manipur':'மணிப்பூர்',
  'mizoram':'மிசோரம்','tripura':'திரிபுரா','sikkim':'சிக்கிம்',
  'ladakh':'லடாக்','chandigarh':'சண்டிகர்','lakshadweep':'லட்சத்தீவு',
  'andaman and nicobar islands':'அந்தமான் மற்றும் நிக்கோபார் தீவுகள்',
  'dadra and nagar haveli and daman and diu':'தாத்ரா நகர் ஹவேலி, டாமன் மற்றும் டையூ'
};
// GeoNames district spellings include legacy or abbreviated labels. This map
// is deliberately scoped to Tamil Nadu, so districts with the same name in
// another state cannot accidentally acquire a Tamil Nadu administrative label.
const tnDistricts={
  'ariyalur':'அரியலூர்','chengalpattu':'செங்கல்பட்டு','chennai':'சென்னை',
  'coimbatore':'கோயம்புத்தூர்','cuddalore':'கடலூர்','dharmapuri':'தருமபுரி',
  'dindigul':'திண்டுக்கல்','erode':'ஈரோடு','kallakurichi':'கள்ளக்குறிச்சி',
  'kancheepuram':'காஞ்சிபுரம்','kanchipuram':'காஞ்சிபுரம்',
  'kanniyakumari':'கன்னியாகுமரி','kanyakumari':'கன்னியாகுமரி',
  'karur':'கரூர்','krishnagiri':'கிருஷ்ணகிரி','madurai':'மதுரை',
  'mayiladuthurai':'மயிலாடுதுறை','nagapattinam':'நாகப்பட்டினம்',
  'namakkal':'நாமக்கல்','nilgiris':'நீலகிரி','perambalur':'பெரம்பலூர்',
  'pudukkottai':'புதுக்கோட்டை','ramanathapuram':'இராமநாதபுரம்',
  'ranipet':'ராணிப்பேட்டை','salem':'சேலம்','sivaganga':'சிவகங்கை',
  'tenkasi':'தென்காசி','thanjavur':'தஞ்சாவூர்','theni':'தேனி',
  'thiruvallur':'திருவள்ளூர்','tiruvallur':'திருவள்ளூர்',
  'thiruvarur':'திருவாரூர்','tiruvarur':'திருவாரூர்',
  'thoothukkudi':'தூத்துக்குடி','thoothukudi':'தூத்துக்குடி',
  'tiruchirappalli':'திருச்சிராப்பள்ளி','tirunelveli kattabo':'திருநெல்வேலி',
  'tirunelveli':'திருநெல்வேலி','tirupattur':'திருப்பத்தூர்',
  'tiruppur':'திருப்பூர்','tiruvannamalai':'திருவண்ணாமலை',
  'vellore':'வேலூர்','villupuram':'விழுப்புரம்','virudhunagar':'விருதுநகர்'
};
// Only verified common-name equivalents. For lesser-known villages prefer the
// Tamil alternate name supplied in GeoNames, or a coherent English fallback.
const tnLocalities={
  'perungudi':'பெருங்குடி','perundurai':'பெருந்துறை',
  'perambalur':'பெரம்பலூர்','perambur':'பெரம்பூர்',
  'chengalpattu':'செங்கல்பட்டு','coimbatore':'கோயம்புத்தூர்',
  'chennai':'சென்னை','madurai':'மதுரை','tiruchirappalli':'திருச்சிராப்பள்ளி',
  'thiruvallur':'திருவள்ளூர்','tiruvallur':'திருவள்ளூர்',
  'kancheepuram':'காஞ்சிபுரம்','kanchipuram':'காஞ்சிபுரம்',
  'thanjavur':'தஞ்சாவூர்','thiruvarur':'திருவாரூர்',
  'tiruvannamalai':'திருவண்ணாமலை','tirunelveli':'திருநெல்வேலி',
  'kanyakumari':'கன்னியாகுமரி','kanniyakumari':'கன்னியாகுமரி',
  'erode':'ஈரோடு','salem':'சேலம்','tiruppur':'திருப்பூர்',
  'pudukkottai':'புதுக்கோட்டை','ramanathapuram':'இராமநாதபுரம்',
  'rameswaram':'இராமேஸ்வரம்','theni':'தேனி','dindigul':'திண்டுக்கல்',
  'karur':'கரூர்','namakkal':'நாமக்கல்','tirupattur':'திருப்பத்தூர்',
  'vellore':'வேலூர்','mayiladuthurai':'மயிலாடுதுறை','sivaganga':'சிவகங்கை'
};
const unique=parts=>{const seen=new Set();return parts.filter(part=>{
  if(!part)return false;const k=part.normalize('NFC').toLowerCase();
  if(seen.has(k))return false;seen.add(k);return true;
}).join(', ');};
export function formatOfflineIndiaPlace(row,language=CURRENT()){
  if(!Array.isArray(row))return {place:'',name:'',admin2:'',admin1:'',country:'India'};
  const nameEn=cleanEn(row[1]),districtEn=asDistrict(row[3]),stateEn=asState(row[2]);
  const placeEn=unique([nameEn,districtEn,stateEn,'India']);
  const en={place:placeEn,name:nameEn,admin2:districtEn,admin1:stateEn,country:'India'};
  if(!/^ta(?:-|$)/i.test(String(language)))return en;
  const tamilState=states[key(stateEn)]||'';
  const isTN=key(stateEn)==='tamil nadu';
  const tamilDistrict=!districtEn?'':isTN?(tnDistricts[key(districtEn)]||''):'';
  const aliases=Array.isArray(row[8])?row[8]:[];
  const tamilName=(isTN?tnLocalities[key(nameEn)]:'')||aliases.find(isTamil)||'';
  // Never concatenate Tamil and English segments in a selected place name.
  // If any required component is not locally verified, show the full English
  // name. Do not guess unknown villages or modify their coordinates.
  if(!tamilState||!tamilName||(districtEn&&!tamilDistrict))return en;
  return {place:unique([tamilName,tamilDistrict,tamilState,'இந்தியா']),
    name:tamilName,admin2:tamilDistrict,admin1:tamilState,country:'இந்தியா'};
}
