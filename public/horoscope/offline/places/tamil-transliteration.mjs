// Offline-only script conversion for Tamil proper names and place labels.
// Names are transliterated, not semantically translated. Existing target-script
// text is kept exactly as entered. Known common names/places use verified forms.
const TAMIL_RE=/[\u0B80-\u0BFF]/u;
const LATIN_RE=/[A-Za-z]/u;
const COMMON_EN_TO_TA=Object.freeze({
  'rajaram':'ராஜாராம்','raja ram':'ராஜா ராம்','raja':'ராஜா','raj':'ராஜ்',
  'rajendran':'ராஜேந்திரன்','annapoorani':'அன்னபூரணி','annapoorna':'அன்னபூர்ணா',
  'rajesh':'ராஜேஷ்','balaji':'பாலாஜி','raman':'ராமன்','ram':'ராம்',
  'siva':'சிவா','shiva':'சிவா','sivakumar':'சிவகுமார்','sivaram':'சிவராம்',
  'kumar':'குமார்','kumaran':'குமரன்','ramesh':'ரமேஷ்','suresh':'சுரேஷ்',
  'mahesh':'மகேஷ்','ganesh':'கணேஷ்','ganesan':'கணேசன்','murugan':'முருகன்',
  'lakshmi':'லட்சுமி','lakshmidevi':'லட்சுமிதேவி','saraswathi':'சரஸ்வதி',
  'meenakshi':'மீனாட்சி','karthik':'கார்த்திக்','karthikeyan':'கார்த்திகேயன்',
  'vijay':'விஜய்','vijaya':'விஜயா','priya':'பிரியா','kavitha':'கவிதா',
  'anitha':'அனிதா','anitha':'அனிதா','selvi':'செல்வி','malar':'மலர்',
  'perambalur':'பெரம்பலூர்','perambur':'பெரம்பூர்','madurai':'மதுரை',
  'chennai':'சென்னை','karur':'கரூர்','coimbatore':'கோயம்புத்தூர்',
  'tiruchirappalli':'திருச்சிராப்பள்ளி','trichy':'திருச்சி','thanjavur':'தஞ்சாவூர்','tanjore':'தஞ்சாவூர்','erode':'ஈரோடு','salem':'சேலம்','vellore':'வேலூர்','dindigul':'திண்டுக்கல்','theni':'தேனி','tiruppur':'திருப்பூர்','tirunelveli':'திருநெல்வேலி','kanyakumari':'கன்னியாகுமரி','rameswaram':'இராமேஸ்வரம்',
  'tiruchirappalli':'திருச்சிராப்பள்ளி','trichy':'திருச்சி',
  'thanjavur':'தஞ்சாவூர்','tanjore':'தஞ்சாவூர்','erode':'ஈரோடு',
  'salem':'சேலம்','vellore':'வேலூர்','dindigul':'திண்டுக்கல்',
  'theni':'தேனி','tiruppur':'திருப்பூர்','tirunelveli':'திருநெல்வேலி',
  'kanyakumari':'கன்னியாகுமரி','rameswaram':'இராமேஸ்வரம்',
  'pudukkottai':'புதுக்கோட்டை','namakkal':'நாமக்கல்','sivaganga':'சிவகங்கை',
  'india':'இந்தியா','tamil nadu':'தமிழ்நாடு','kerala':'கேரளம்',
  'karnataka':'கர்நாடகம்','andhra pradesh':'ஆந்திரப் பிரதேசம்',
  'telangana':'தெலங்கானா','maharashtra':'மகாராஷ்டிரம்',
  'united kingdom':'ஐக்கிய இராச்சியம்','united states':'அமெரிக்க ஐக்கிய நாடுகள்',
  'usa':'அமெரிக்கா','uk':'ஐக்கிய இராச்சியம்','sri lanka':'இலங்கை'
});
const COMMON_TA_TO_EN=Object.freeze(Object.fromEntries(Object.entries(COMMON_EN_TO_TA).map(([en,ta])=>[ta,en])));
const LATIN_CONSONANTS=[
  ['zh','ழ'],['ng','ங'],['nj','ஞ'],['ny','ஞ'],['sh','ஷ'],['ch','ச'],
  ['th','த'],['dh','த'],['ph','ப'],['bh','ப'],['kh','க'],['gh','க'],
  ['ck','க்'],['qu','கு'],['c','க'],['k','க'],['g','க'],['j','ஜ'],
  ['t','ட'],['d','ட'],['n','ன'],['p','ப'],['b','ப'],['m','ம'],
  ['y','ய'],['r','ர'],['l','ல'],['v','வ'],['w','வ'],['s','ஸ'],
  ['h','ஹ'],['f','ஃப'],['x','க்ஸ'],['z','ஸ']
];
const VOWELS=[
  ['aa','ா'],['ii','ீ'],['ee','ே'],['uu','ூ'],['oo','ோ'],
  ['ai','ை'],['au','ௌ'],['ē','ே'],['ei','ே'],['ō','ோ'],
  ['a',''],['i','ி'],['u','ு'],['e','ெ'],['o','ொ']
];
const INDEPENDENT={a:'அ',aa:'ஆ',i:'இ',ii:'ஈ',ee:'ஏ',u:'உ',uu:'ஊ',oo:'ஓ',e:'எ',ē:'ஏ',ai:'ஐ',o:'ஒ',ō:'ஓ',au:'ஔ'};
const normalizeLatin=value=>String(value??'').normalize('NFC').toLowerCase()
  .replace(/[āá]/g,'aa').replace(/[īí]/g,'ii').replace(/[ūú]/g,'uu')
  .replace(/[ēé]/g,'ee').replace(/[ōó]/g,'oo').replace(/ṃ/g,'m').replace(/ñ/g,'ny')
  .replace(/[ṛṟ]/g,'r').replace(/ḷ/g,'l').replace(/ṇ/g,'n').replace(/ṅ/g,'ng');
const isWordChar=c=>/[A-Za-z\u0B80-\u0BFF]/u.test(c||'');
const titleCase=value=>String(value).split(/(\s+)/).map(part=>/^[A-Za-z]/.test(part)?part[0].toUpperCase()+part.slice(1).toLowerCase():part).join('');

export function tamilToLatin(value){
  const text=String(value??'').normalize('NFC');
  const independent={'அ':'a','ஆ':'aa','இ':'i','ஈ':'ii','உ':'u','ஊ':'uu','எ':'e','ஏ':'ee','ஐ':'ai','ஒ':'o','ஓ':'oo','ஔ':'au'};
  const consonants={'க':'k','ங':'ng','ச':'ch','ஞ':'nj','ட':'T','ண':'N','த':'th','ந':'n','ப':'p','ம':'m','ய':'y','ர':'r','ல':'l','வ':'v','ழ':'zh','ள':'L','ற':'R','ன':'n','ஜ':'j','ஷ':'sh','ஸ':'s','ஹ':'h','ஃ':'h'};
  const signs={'ா':'aa','ி':'i','ீ':'ii','ு':'u','ூ':'uu','ெ':'e','ே':'ee','ை':'ai','ொ':'o','ோ':'oo','ௌ':'au'};
  let out='';
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(independent[c]){out+=independent[c];continue;}
    if(consonants[c]){
      out+=consonants[c];
      const next=text[i+1]||'';
      if(next==='்'){i++;continue;}
      if(signs[next]){out+=signs[next];i++;continue;}
      out+='a';
      continue;
    }
    if(/[A-Za-z0-9]/.test(c))out+=c;
    else out+=c;
  }
  return titleCase(out.replace(/([TRLN])/g,'$1'));
}
function matchVowel(text,index){
  for(const [key,mark] of VOWELS.slice().sort((a,b)=>b[0].length-a[0].length)){
    if(text.startsWith(key,index))return {key,mark,length:key.length};
  }
  return null;
}
function matchConsonant(text,index){
  for(const [key,value] of LATIN_CONSONANTS){
    if(text.startsWith(key,index))return {key,value,length:key.length};
  }
  return null;
}
function latinWordToTamil(word){
  const normalized=normalizeLatin(word);
  let out='',i=0;
  while(i<normalized.length){
    const vowel=matchVowel(normalized,i);
    if(vowel){
      out+=INDEPENDENT[vowel.key]||({'a':'அ','aa':'ஆ','i':'இ','ii':'ஈ','ee':'ஈ','u':'உ','uu':'ஊ','oo':'ஊ','e':'எ','ai':'ஐ','o':'ஒ','au':'ஔ'}[vowel.key]||'');
      i+=vowel.length;continue;
    }
    const consonant=matchConsonant(normalized,i);
    if(!consonant){out+=normalized[i];i++;continue;}
    i+=consonant.length;
    const nextVowel=matchVowel(normalized,i);
    if(nextVowel){
      out+=consonant.value+nextVowel.mark;
      i+=nextVowel.length;
    }else{
      out+=consonant.value+'்';
    }
  }
  return out;
}
const escapeRegExp=value=>String(value).replace(/[.*+?^\${}()|[\]\\]/g,'\\$&');
function replaceKnownPhrases(value,dictionary){
  let result=String(value);
  const entries=Object.entries(dictionary).sort((a,b)=>b[0].length-a[0].length);
  for(const [source,target] of entries){
    const re=new RegExp('(?<![\\p{L}\\p{M}])'+escapeRegExp(source)+'(?![\\p{L}\\p{M}])','giu');
    result=result.replace(re,target);
  }
  return result;
}
export function latinToTamil(value){
  const input=String(value??'').normalize('NFC').trim();
  if(!input||TAMIL_RE.test(input)&&!LATIN_RE.test(input))return input;
  const phrases=replaceKnownPhrases(input,COMMON_EN_TO_TA);
  const words=phrases.split(/([^\\p{L}\\p{M}]+)/u);
  return words.map(word=>/[A-Za-z]/u.test(word)?latinWordToTamil(word):word).join('');
}
export function localizeTamilText(value,language='ta'){
  const input=String(value??'').normalize('NFC');
  if(!input)return '';
  if(language==='ta'){
    if(TAMIL_RE.test(input)&&!LATIN_RE.test(input))return input;
    return latinToTamil(input);
  }
  if(LATIN_RE.test(input)&&!TAMIL_RE.test(input))return input;
  const phrases=replaceKnownPhrases(input,COMMON_TA_TO_EN);
  const words=phrases.split(/([^\\p{L}\\p{M}]+)/u);
  return words.map(word=>TAMIL_RE.test(word)?tamilToLatin(word):word).join('');
}
export function hasTamilScript(value){return TAMIL_RE.test(String(value??''));}
