'use strict';
const {phase4Dasa}=require('./dasa_engine');
const RASIS=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const EN_RASIS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const P7=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const ALL=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி','ராகு','கேது'];
const own={சூரியன்:[4],சந்திரன்:[3],செவ்வாய்:[0,7],புதன்:[2,5],குரு:[8,11],சுக்கிரன்:[1,6],சனி:[9,10]};
const exalt={சூரியன்:0,சந்திரன்:1,செவ்வாய்:9,புதன்:5,குரு:3,சுக்கிரன்:11,சனி:6};
const SIGN_LORDS=['சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
function phase1LordForSign(sign,chart){
  const s=norm(Number(sign));
  if(s===7){
    const candidates=['செவ்வாய்','கேது'];
    return candidates.sort((a,b)=>{const pa=planetMap(chart)[a],pb=planetMap(chart)[b];const score=p=>p?((own[p.name]||[]).includes(s)?2:0)+(exalt[p.name]===s?5:0)+((chart.planets||[]).filter(x=>rasi(x.longitude)===rasi(p.longitude)).length):0;return score(pb)-score(pa);})[0]||'செவ்வாய்';
  }
  if(s===10){
    const candidates=['சனி','ராகு'];
    return candidates.sort((a,b)=>{const pa=planetMap(chart)[a],pb=planetMap(chart)[b];const score=p=>p?((own[p.name]||[]).includes(s)?2:0)+(exalt[p.name]===s?5:0)+((chart.planets||[]).filter(x=>rasi(x.longitude)===rasi(p.longitude)).length):0;return score(pb)-score(pa);})[0]||'சனி';
  }
  return SIGN_LORDS[s];
}
const BAV_TABLES={சூரியன்:[[1,0,1,0,0,0,1,0],[1,0,1,0,0,0,1,0],[0,1,0,1,0,0,0,1],[1,0,1,0,0,0,1,1],[0,0,0,1,1,0,0,0],[0,1,0,1,1,1,0,1],[1,0,1,0,0,1,1,0],[1,0,1,0,0,0,1,0],[1,0,1,1,1,0,1,0],[1,1,1,1,0,0,1,1],[1,1,1,1,1,0,1,1],[0,0,0,1,0,1,0,1]],சந்திரன்:[[0,1,0,1,1,0,0,0],[0,0,1,0,1,0,0,0],[1,1,1,1,0,1,1,1],[0,0,0,1,1,1,0,0],[0,0,1,1,0,1,1,0],[1,1,1,0,0,0,1,1],[1,1,0,1,1,1,0,0],[1,0,0,1,1,0,0,0],[0,1,0,0,0,1,0,0],[1,1,1,1,1,1,0,1],[1,1,1,1,1,1,1,1],[0,0,0,0,0,0,0,0]],செவ்வாய்:[[0,0,1,0,0,0,1,1],[0,0,1,0,0,0,0,0],[1,1,0,1,0,0,0,1],[0,0,1,0,0,0,1,0],[1,0,0,1,0,0,0,0],[1,1,0,1,1,1,0,1],[0,0,1,0,0,0,1,0],[0,0,1,0,0,1,1,0],[0,0,0,0,0,0,1,0],[1,0,1,0,1,0,1,1],[1,1,1,1,1,1,1,1],[0,0,0,0,1,1,0,0]],புதன்:[[0,0,1,1,0,1,1,1],[0,1,1,0,0,1,1,1],[0,0,0,1,0,1,0,0],[0,1,1,0,0,1,1,1],[1,0,0,1,0,1,0,0],[1,1,0,1,1,0,0,1],[0,0,1,0,0,0,1,0],[0,1,1,0,1,1,1,1],[1,0,1,1,0,1,1,0],[0,1,1,1,0,0,1,1],[1,1,1,1,1,1,1,1],[1,0,0,1,1,0,0,0]],குரு:[[1,0,1,1,1,0,0,1],[1,1,1,1,1,1,0,1],[1,0,0,0,1,0,1,0],[1,0,1,1,1,0,0,1],[0,1,0,1,0,1,1,1],[0,0,0,1,0,1,1,1],[1,1,1,0,1,0,0,1],[1,0,1,0,1,0,0,0],[1,1,0,1,0,1,0,1],[1,0,1,1,1,1,0,1],[1,1,1,1,1,1,0,1],[0,0,0,0,0,0,1,0]],சுக்கிரன்:[[0,1,0,0,0,1,0,1],[0,1,0,0,0,1,0,1],[0,1,1,1,0,1,1,1],[0,1,1,0,0,1,1,1],[0,1,0,1,1,1,1,1],[0,0,1,1,0,0,0,0],[0,0,0,0,0,0,0,0],[1,1,0,0,1,1,1,1],[0,1,1,1,1,1,1,1],[0,0,0,0,1,1,1,0],[1,1,1,1,1,1,1,1],[1,1,1,0,0,0,0,0]],சனி:[[1,0,0,0,0,0,0,1],[1,0,0,0,0,0,0,0],[0,1,1,0,0,0,1,1],[1,0,0,0,0,0,0,1],[0,0,1,0,1,0,1,0],[0,1,1,1,1,1,1,1],[1,0,0,0,0,0,0,0],[1,0,0,1,0,0,0,0],[0,0,0,1,0,0,0,0],[1,0,1,1,0,0,0,1],[1,1,1,1,1,1,1,1],[0,0,1,1,1,1,0,0]],லக்கினம்:[[0,0,1,1,1,1,1,0],[0,0,0,1,1,1,0,0],[1,1,1,0,0,1,1,1],[1,0,0,1,1,1,1,0],[0,0,0,0,1,1,0,0],[1,1,1,1,1,0,1,1],[0,0,0,0,1,0,0,0],[0,0,0,1,0,1,0,0],[0,0,0,0,1,1,0,0],[1,1,1,1,1,0,1,1],[1,1,1,1,1,1,1,1],[1,1,0,0,0,0,0,0]]};
const SAV_RULES=BAV_TABLES;
const NAK=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const NAK_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const KOTA_28_EN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Abhijit','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
const KOTA_28_TA=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','அபிஜித்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
const KOTA_PALA_BY_PADA={
 Ashwini:['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்'],
 Bharani:['சூரியன்','புதன்','செவ்வாய்','சனி'],
 Krittika:['குரு','சுக்கிரன்','சனி','சந்திரன்'],
 Rohini:['புதன்','செவ்வாய்','சூரியன்','சுக்கிரன்'],
 Mrigashira:['செவ்வாய்','குரு','புதன்','சுக்கிரன்'],
 Ardra:['சனி','குரு','சூரியன்','செவ்வாய்'],
 Punarvasu:['புதன்','சந்திரன்','சுக்கிரன்','குரு'],
 Pushya:['சனி','சூரியன்','செவ்வாய்','சந்திரன்'],
 Ashlesha:['புதன்','சுக்கிரன்','சனி','குரு'],
 Magha:['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்'],
 'Purva Phalguni':['சூரியன்','புதன்','செவ்வாய்','சனி'],
 'Uttara Phalguni':['குரு','சுக்கிரன்','சனி','சந்திரன்'],
 Hasta:['புதன்','செவ்வாய்','சூரியன்','சுக்கிரன்'],
 Chitra:['செவ்வாய்','குரு','புதன்','சுக்கிரன்'],
 Swati:['சனி','குரு','சூரியன்','செவ்வாய்'],
 Vishakha:['புதன்','சந்திரன்','சுக்கிரன்','குரு'],
 Anuradha:['சனி','சூரியன்','செவ்வாய்','சந்திரன்'],
 Jyeshtha:['புதன்','சுக்கிரன்','சனி','குரு'],
 Mula:['செவ்வாய்','சுக்கிரன்','புதன்','சந்திரன்'],
 'Purva Ashadha':['சூரியன்','புதன்','செவ்வாய்','சனி'],
 'Uttara Ashadha':['குரு','சுக்கிரன்','சனி','சந்திரன்'],
 Shravana:['புதன்','செவ்வாய்','சூரியன்','சுக்கிரன்'],
 Dhanishtha:['செவ்வாய்','குரு','புதன்','சுக்கிரன்'],
 Shatabhisha:['சனி','குரு','சூரியன்','செவ்வாய்'],
 'Purva Bhadrapada':['புதன்','சந்திரன்','சுக்கிரன்','குரு'],
 'Uttara Bhadrapada':['சனி','சூரியன்','செவ்வாய்','சந்திரன்'],
 Revati:['புதன்','சுக்கிரன்','சனி','குரு'],
 Abhijit:['சுக்கிரன்','சுக்கிரன்','சுக்கிரன்','சுக்கிரன்']
};
const NAME_SYLLABLE_PLANET={
 sun:['a','aa','i','ee','u','oo','e','ai','அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ'],
 mars:['k','kh','g','gh','ng','க','க்ஹ','க','க','ங'],
 venus:['ch','c','j','jh','ச','ஜ','ஞ'],
 mercury:['t','th','d','dh','n','ட','த','த','த','ந'],
 jupiter:['t','th','d','dh','n','த','த','த','த','ந'],
 saturn:['p','ph','b','bh','m','ப','ப','ப','ப','ம'],
 moon:['y','r','l','v','ய','ர','ல','வ']
};

function kotaNamePlanet(syllable){
 const x=String(syllable||'').toLowerCase();
 const groups=[
  [['a','aa','i','ee','u','oo','e','ai','அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ'],'சூரியன்'],
  [['k','kh','g','gh','ng','chcha','க','ங','க்','க்ஹ'],'செவ்வாய்'],
  [['ch','c','j','jh','ச','ஜ','ஞ'],'சுக்கிரன்'],
  [['t','th','d','dh','n','ட','த','ந'],'புதன்'],
  [['p','ph','b','bh','m','ப','ம'],'சனி'],
  [['y','r','l','v','ய','ர','ல','வ'],'சந்திரன்'],
  [['thee','thuu','thay','thou','தி','தூ','தே','தோ'],'குரு']
 ];
 for(const [arr,pl] of groups) if(arr.some(a=>x===a || x.startsWith(a))) return pl;
 // Traditional Avakahada sound-group fallback: य र ल व are Moon's group.
 if(/^[yrlv]|^[யரலவ]/.test(x)) return 'சந்திரன்';
 return '';
}
function normalizeNameForKota(name){return String(name||'').trim().toLowerCase().replace(/[^a-z\u0B80-\u0BFF]/g,'');}

// Exact 27×4 Avakahada/name-syllable table supplied by the user.
// Matching uses only the opening 1–3 characters of the native name.
const NAME_NAK_TABLE={
 Ashwini:['Chu','Che','Cho','La'], Bharani:['Li','Lu','Ley','Lo'], Krittika:['Aa','Ee','U','A'],
 Rohini:['O','Va','Vee','Vo'], Mrigashira:['Vay','Vo','Ka','Kee'], Ardra:['Koo','Ghaa','Jna','Chcha'],
 Punarvasu:['Kay','Ko','Ha','Hee'], Pushya:['Hoo','Hay','Ho','Daa'], Ashlesha:['Dee','Doo','Day','Do'],
 Magha:['Maa','Mee','Moo','May'], 'Purva Phalguni':['Mo','Taa','Tee','Too'], 'Uttara Phalguni':['Tay','To','Paa','Pee'],
 Hasta:['Pu','Shaa','Na','Thaa'], Chitra:['Pay','Po','Raa','Re'], Swati:['Ru','Ray','Pa','Ta'],
 Vishakha:['Thee','Thuu','Thay','Thou'], Anuradha:['Naa','Nee','Nou','Nay'], Jyeshtha:['No','Ya','Yee','You'],
 Mula:['Yay','Yo','Baa','Bee'], 'Purva Ashadha':['By','Dha','Bha','Dha'], 'Uttara Ashadha':['Bay','Bo','Jaa','Jee'],
 Shravana:['Ju','Jay','Jo','Gha'], Dhanishtha:['Gaa','Gee','Goo','Gay'], Shatabhisha:['Go','Sa','See','Sou'],
 'Purva Bhadrapada':['Say','So','Daa','Dee'], 'Uttara Bhadrapada':['Du','Tha','Aa','Jna'], Revati:['De','Do','Chaa','Chee']
};
const NAME_NAK_TABLE_TA={
 Ashwini:['சு','செ','சோ','ல'], Bharani:['லி','லு','லே','லோ'], Krittika:['ஆ','ஈ','ஊ','ஏ'], Rohini:['ஓ','வா','வீ','வோ'],
 Mrigashira:['வே','வோ','கா','கீ'], Ardra:['கூ','கா','ஞ','ச்ச'], Punarvasu:['கே','கோ','ஹ','ஹீ'], Pushya:['ஹூ','ஹே','ஹோ','டா'],
 Ashlesha:['டீ','டூ','டே','டோ'], Magha:['மா','மீ','மூ','மே'], 'Purva Phalguni':['மோ','டா','டீ','டூ'], 'Uttara Phalguni':['டே','டோ','பா','பீ'],
 Hasta:['பூ','ஷா','ந','தா'], Chitra:['பே','போ','ரா','ரே'], Swati:['ரூ','ரே','ப','த'], Vishakha:['தீ','தூ','தே','தோ'],
 Anuradha:['நா','நீ','நௌ','நே'], Jyeshtha:['நோ','ய','யீ','யூ'], Mula:['யே','யோ','பா','பீ'], 'Purva Ashadha':['பூ','தா','பா','தா'],
 'Uttara Ashadha':['பே','போ','ஜா','ஜீ'], Shravana:['ஜு','ஜே','ஜோ','க'], Dhanishtha:['கா','கீ','கூ','கே'], Shatabhisha:['கோ','சா','ஸீ','சௌ'],
 'Purva Bhadrapada':['சே','சோ','தா','தீ'], 'Uttara Bhadrapada':['து','த','ஆ','ஞ'], Revati:['தே','தோ','சா','சீ']
};
function compactLatin(s){return String(s||'').toLowerCase().replace(/[^a-z]/g,'');}
function compactTamil(s){return String(s||'').replace(/[\s\-]/g,'');}
function normalizeKotaInitial(name,lang){
 const raw=String(name||'').trim();
 if(lang==='en') return raw.toLowerCase().replace(/[^a-z]/g,'').slice(0,3);
 return raw.replace(/[\s\-]/g,'').slice(0,3);
}
function syllableCandidates(name,lang){
 const raw=normalizeKotaInitial(name,lang);
 if(!raw)return [];
 const out=[raw];
 if(lang==='en'){
   // The supplied Avakahada table is phonetic. Treat common long-vowel spellings
   // such as May/Me and Raa/Ra as the same opening sound for the 1–3 character test.
   const phonetic=raw.replace(/^may/,'me').replace(/^mee/,'me').replace(/^raa/,'ra').replace(/^ree/,'re').replace(/^vee/,'ve').replace(/^kee/,'ke').replace(/^chh/,'ch').replace(/^sh/,'s');
   if(!out.includes(phonetic))out.push(phonetic);
   if(raw.length>=2 && !out.includes(raw.slice(0,2)))out.push(raw.slice(0,2));
   if(raw.length>=1 && !out.includes(raw.slice(0,1)))out.push(raw.slice(0,1));
 }else{
   if(raw.length>=2 && !out.includes(raw.slice(0,2)))out.push(raw.slice(0,2));
   if(raw.length>=1 && !out.includes(raw.slice(0,1)))out.push(raw.slice(0,1));
 }
 return out;
}
function syllableMatches(initial,syllable,lang){
 const a=lang==='en'?compactLatin(initial):compactTamil(initial);
 const b=lang==='en'?compactLatin(syllable):compactTamil(syllable);
 if(!a||!b)return false;
 if(a===b || a.startsWith(b) || b.startsWith(a))return true;
 if(lang==='en'){
   const norm=v=>String(v).replace(/^may/,'me').replace(/^mee/,'me').replace(/^raa/,'ra').replace(/^ree/,'re').replace(/^vee/,'ve').replace(/^kee/,'ke').replace(/^chh/,'ch').replace(/^sh/,'s');
   const na=norm(a), nb=norm(b);
   return na===nb || na.startsWith(nb) || nb.startsWith(na);
 }
 return false;
}
function findNameSoundInTable(name,lang){
 const initial=normalizeKotaInitial(name,lang);
 const candidates=syllableCandidates(name,lang);
 if(!initial)return null;
 const source=lang==='en'?NAME_NAK_TABLE:NAME_NAK_TABLE_TA;
 // Prefer the longest/most specific supplied name opening (up to three characters).
 for(const wanted of candidates.sort((a,b)=>b.length-a.length)){
   for(const [nak,arr] of Object.entries(source)){
     for(let i=0;i<4;i++){
       if(syllableMatches(wanted,arr[i],lang)) return {nakshatra:nak,pada:i+1,syllable:arr[i],initial:initial};
     }
   }
 }
 return null;
}
function findJanmaSoundMatch(janmaNak,janmaPada,name,lang){
 const source=lang==='en'?NAME_NAK_TABLE:NAME_NAK_TABLE_TA;
 const arr=source[janmaNak];
 if(!arr || !arr[janmaPada-1])return null;
 const syllable=arr[janmaPada-1];
 const candidates=syllableCandidates(name,lang);
 if(candidates.some(c=>syllableMatches(c,syllable,lang))) return {nakshatra:janmaNak,pada:janmaPada,syllable,initial:normalizeKotaInitial(name,lang)};
 return null;
}
function detectKotaNameLang(name){
 const raw=String(name||'');
 if(/[\u0B80-\u0BFF]/.test(raw)) return 'ta';
 if(/[A-Za-z]/.test(raw)) return 'en';
 return 'en';
}
function nameNakshatraFromName(name,lang,janmaNak='',janmaPada=null){
 // Name-sound lookup is independent of horoscope UI language. This allows
 // Tamil names in the English horoscope and English names in the Tamil horoscope.
 const nameLang=detectKotaNameLang(name);
 const direct=findJanmaSoundMatch(janmaNak,janmaPada,name,nameLang);
 if(direct){direct.matchType='Janma Nakshatra Pada initial match';direct.nameLang=nameLang;return direct;}
 const fallback=findNameSoundInTable(name,nameLang);
 if(fallback){fallback.matchType='Native-name initial match';fallback.nameLang=nameLang;return fallback;}
 return null;
}

function norm(n){n%=12;return n<0?n+12:n;}
function normLon(n){n=Number(n)%360;return n<0?n+360:n;}
function rasi(lon){return Math.floor((((Number(lon)%360)+360)%360)/30);}
function degIn(lon){return (((Number(lon)%30)+30)%30);}
function dms(deg){const x=((Number(deg)%30)+30)%30; const d=Math.floor(x); const mFloat=(x-d)*60; const m=Math.floor(mFloat); const sec=Math.round((mFloat-m)*60); if(sec>=60)return `${d}°${String(m+1).padStart(2,'0')}′00″`; return `${d}°${String(m).padStart(2,'0')}′${String(sec).padStart(2,'0')}″`; }
function lonDms(lon){const x=((Number(lon)%360)+360)%360; const d=Math.floor(x); const mFloat=(x-d)*60; const m=Math.floor(mFloat); const sec=Math.round((mFloat-m)*60); if(sec>=60)return `${d+1}°00′00″`; return `${d}°${String(m).padStart(2,'0')}′${String(sec).padStart(2,'0')}″`; }
function solarDayNight(chart){const b=chart?.birth||{}; const date=String(b.date||''); const time=String(b.time||''); const lat=Number(b.latitude), lon=Number(b.longitude), off=Number(b.utcOffsetMinutes??330); if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{1,2}:\d{2}$/.test(time)||!Number.isFinite(lat)||!Number.isFinite(lon)) return true; const [Y,M,D]=date.split('-').map(Number), [hh,mm]=time.split(':').map(Number); const N=Math.floor((Date.UTC(Y,M-1,D)-Date.UTC(Y,0,1))/86400000)+1; const g=2*Math.PI/365*(N-1+(12-12)/24); const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g)); const decl=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g); const phi=lat*Math.PI/180; const zen=90.833*Math.PI/180; const cosH=(Math.cos(zen)/(Math.cos(phi)*Math.cos(decl))-Math.tan(phi)*Math.tan(decl)); if(cosH>=1)return false; if(cosH<=-1)return true; const H=Math.acos(cosH)*180/Math.PI; const noon=(720-4*lon-eq+off*60); const rise=noon-4*H, set=noon+4*H, local=hh*60+mm; return local>=rise && local<=set; }
function signName(i,lang){return (lang==='en'?EN_RASIS:RASIS)[norm(i)];}
function planetMap(chart){return Object.fromEntries((Array.isArray(chart?.planets)?chart.planets:[]).map(p=>[p.name,p]));}
function vargaSign(lon,d){const r=rasi(lon),x=degIn(lon),odd=r%2===0;if(d===1)return r;if(d===2)return (odd?[4,3]:[3,4])[Math.min(1,Math.floor(x/15))];if(d===3)return norm(r+[0,4,8][Math.min(2,Math.floor(x/10))]);if(d===4)return norm(r+[0,3,6,9][Math.min(3,Math.floor(x/7.5))]);if(d===7){let p=Math.min(6,Math.floor(x/(30/7)));return norm((odd?r:r+6)+p);}if(d===9){let p=Math.min(8,Math.floor(x/(30/9)));let st=r%3===0?r:r%3===1?norm(r+8):norm(r+4);return norm(st+p);}if(d===10){let p=Math.min(9,Math.floor(x/3));return norm((odd?r:norm(r+8))+p);}if(d===12)return norm(r+Math.min(11,Math.floor(x/2.5)));if(d===16){let p=Math.min(15,Math.floor(x/(30/16)));let st=odd?[0,4,8,0]:[4,8,0,4];return norm(st[Math.floor(p/4)]+(p%4)*3);}if(d===20){let p=Math.min(19,Math.floor(x/(30/20)));let st=r%4===0?0:r%4===1?8:r%4===2?4:0;return norm(st+p);}if(d===24){let p=Math.min(23,Math.floor(x/(30/24)));return norm((odd?4:3)+p);}if(d===27){let p=Math.min(26,Math.floor(x/(30/27)));return norm([0,3,6,9][Math.floor(r/3)]+p);}if(d===30){if(odd){if(x<5)return 0;if(x<10)return 10;if(x<18)return 8;if(x<25)return 2;return 1;}else{if(x<5)return 1;if(x<12)return 2;if(x<20)return 8;if(x<25)return 10;return 0;}}if(d===40)return norm((odd?0:6)+Math.min(39,Math.floor(x/.75)));if(d===45)return norm((odd?0:6)+Math.min(44,Math.floor(x/(2/3))));if(d===60){let p=Math.min(59,Math.floor(x/.5));return norm(odd?p:11-p);}return r;}
function nakshatraInfoFromLongitude(lon,lang='en'){
  const q=normLon(lon), span=360/27, padaSpan=span/4;
  const idx=Math.min(26,Math.floor(q/span));
  const within=q-idx*span;
  const pada=Math.min(4,Math.floor(within/padaSpan)+1);
  return {index:idx+1,nakshatra:lang==='en'?(NAK_EN[idx]||'—'):(NAK[idx]||'—'),pada};
}

// Convert the natal longitude into the actual longitude represented inside
// the selected Varga.  A Varga is not merely a new sign label: the selected
// subdivision is expanded to a complete 30° sign, so Nakshatra/Pada must be
// recalculated from that transformed longitude.  The old implementation
// incorrectly copied the D1 Nakshatra/Pada into every divisional chart.
function vargaLongitude(lon,d){
  const q=normLon(lon), r=rasi(q), x=degIn(q);
  if(d===1) return q;

  // D-30 uses unequal Parashari segments: 5°, 5°, 8°, 7°, 5°.
  if(d===30){
    const odd=r%2===0;
    const parts=odd
      ? [{end:5,sign:0},{end:10,sign:10},{end:18,sign:8},{end:25,sign:2},{end:30,sign:1}]
      : [{end:5,sign:1},{end:12,sign:2},{end:20,sign:8},{end:25,sign:10},{end:30,sign:0}];
    let start=0;
    for(const part of parts){
      if(x < part.end || (part.end===30 && x<=30)){
        const width=part.end-start;
        const local=((x-start)/width)*30;
        return normLon(part.sign*30+local);
      }
      start=part.end;
    }
  }

  // All other supported Parashari Vargas in this application use equal
  // subdivisions.  The selected part is expanded from 30/d to 30 degrees.
  const partSize=30/d;
  const part=Math.min(d-1,Math.floor(x/partSize));
  const local=(x-part*partSize)*d;
  return normLon(vargaSign(q,d)*30+local);
}

function buildVargas(chart,lang){
  const ds=[1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60];
  const names={1:'Rasi',2:'Hora',3:'Drekkana',4:'Chaturthamsa',7:'Saptamsa',9:'Navamsa',10:'Dasamsa',12:'Dwadasamsa',16:'Shodasamsa',20:'Vimsamsa',24:'Chaturvimsamsa',27:'Bhamsa',30:'Trimsamsa',40:'Khavedamsa',45:'Akshavedamsa',60:'Shashtiamsa'};
  return ds.map(d=>({
    division:`D-${d}`,
    name:names[d],
    planets:(chart.planets||[]).map(p=>{
      const vLon=vargaLongitude(p.longitude,d);
      const nk=nakshatraInfoFromLongitude(vLon,lang);
      return {
        planet:p.name,
        rasi:signName(vargaSign(p.longitude,d),lang),
        longitude:vLon,
        degree:dms(vLon),
        nakshatra:nk.nakshatra,
        pada:nk.pada,
        natalLongitude:p.longitude,
        natalDegree:p.degree,
        natalNakshatra:p.nakshatra,
        natalPada:p.pada
      };
    })
  }));
}
function ashtakavarga(chart,lang){const pm=planetMap(chart),refs=[...P7,'லக்கினம்'];const refLon=Object.fromEntries(P7.map(x=>[x,Number(pm[x]?.longitude??0)]));refLon['லக்கினம்']=Number(chart?.lagna?.longitude??0);const rows=[];for(const target of P7){const table=BAV_TABLES[target]||[];const bindus=Array(12).fill(0),prastara=Array.from({length:12},()=>Array(8).fill(0));for(let h=1;h<=12;h++)for(let j=0;j<8;j++)if(table[h-1]?.[j]){const sign=norm(rasi(refLon[refs[j]])+h-1);bindus[sign]++;prastara[sign][j]=1;}const total=bindus.reduce((a,b)=>a+b,0);rows.push({planet:target,sign:signName(rasi(pm[target]?.longitude??0),lang),bindus,total,classification:bindus.map(v=>v>=5?'favorable':v===4?'neutral':'unfavorable'),referencePositions:refs.map(s=>({source:s,rasi:signName(rasi(refLon[s]),lang)})),prastara});}const sarva=Array.from({length:12},(_,i)=>rows.reduce((n,x)=>n+x.bindus[i],0)),totals=Object.fromEntries(rows.map(x=>[x.planet,x.total])),expected={சூரியன்:48,சந்திரன்:49,செவ்வாய்:39,புதன்:54,குரு:56,சுக்கிரன்:52,சனி:39},checks=Object.fromEntries(Object.entries(expected).map(([p,e])=>[p,{expected:e,actual:totals[p],ok:totals[p]===e}])),savTotal=sarva.reduce((a,b)=>a+b,0),kL=['சனி','குரு','செவ்வாய்','சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','லக்கினம்'];const kakshyas=(chart.planets||[]).filter(Boolean).map(p=>{const idx=Math.min(7,Math.floor(degIn(p.longitude||0)/3.75)),sign=rasi(p.longitude||0),row=rows.find(x=>x.planet===p.name);return {planet:p.name,rasi:signName(sign,lang),degree:degIn(p.longitude||0),kakshyaIndex:idx+1,lord:lang==='en'?(LORD_EN[kL[idx]]||kL[idx]):kL[idx],hasRekha:!!row?.prastara?.[sign]?.[idx]};});return {bhinna:rows,sarva,sarvaTotal:savTotal,planetTotals:totals,referencePoints:refs,validation:{expectedBavTotals:expected,checks,expectedSavTotal:337,actualSavTotal:savTotal,ok:savTotal===337,note:'Textbook Tables 19-26 validation: BAV 5-8 favorable, 4 neutral, 0-3 unfavorable; SAV 30+ is a strong sign in the supplied examples.'},kakshya:{lords:kL,items:kakshyas},method:'Phase 3 classical Ashtakavarga using supplied textbook Tables 19-26 plus BAV/SAV and Kakshya diagnostics.'};}
function avastha(chart,lang){
  const pm=planetMap(chart);
  return P7.map(name=>{const p=pm[name],d=degIn(p?.longitude||0),idx=Math.min(4,Math.floor(d/6)),labels=['Bala','Kumara','Yuva','Vriddha','Mrita'];const r=rasi(p?.longitude||0);return {planet:name,rasi:signName(r,lang),degree:p?.degree||'',balaAvastha:labels[idx],dignity:r===exalt[name]?'Exalted':((own[name]||[]).includes(r)?'Own sign':'Other sign'),nakshatra:p?.nakshatra||'',pada:p?.pada||''};});
}

// Book §15.4.2–15.4.4. §15.4.1 is intentionally left to the existing Avastha module.
const AV_ALERT_EN={Jaagrita:'Awake — full results',Swapna:'Dreaming — medium results',Sushupta:'Sleeping — negligible results'};
const AV_ALERT_TA={Jaagrita:'ஜாக்ரித — விழிப்பு; முழுப் பலன்',Swapna:'ஸ்வப்ன — கனவு நிலை; மிதமான பலன்',Sushupta:'சுஷுப்த — உறக்க நிலை; மிகக் குறைந்த பலன்'};
const AV_ACTIVITY=['Sayana','Upavesana','Netrapaani','Prakaasana','Gamana','Aagamana','Sabhaa','Aagama','Bhojana','Nrityalipsaa','Kautuka','Nidraa'];
const AV_ACTIVITY_TA=['சயன','உபவேசன','நேத்ரபாணி','பிரகாசன','கமன','ஆகமன','சபா','ஆகம','போஜன','ந்ருத்யலிப்ஸா','கௌதுக','நித்ரா'];
const AV_ACTIVITY_MEANING={
 Sayana:['Lying down / resting','படுத்திருத்தல் / ஓய்வு'],Upavesana:['Sitting down','அமர்ந்திருத்தல்'],Netrapaani:['Eyes and hands','கண்கள் மற்றும் கைகள்'],Prakaasana:['Shining','பிரகாசித்தல்'],Gamana:['Going / on the move','செல்வது / இயக்கம்'],Aagamana:['Coming / returning','வருதல் / திரும்புதல்'],Sabhaa:['Being at an assembly','சபை / கூடத்தில் இருப்பது'],Aagama:['Coming / acquiring','வருதல் / பெறுதல்'],Bhojana:['Eating','உண்ணுதல்'],Nrityalipsaa:['Longing to dance','நடன விருப்பம்'],Kautuka:['Being eager','ஆர்வம்'],Nidraa:['Sleeping','தூங்குதல்']
};
const AV_PLANET_INDEX={சூரியன்:1,சந்திரன்:2,செவ்வாய்:3,புதன்:4,குரு:5,சுக்கிரன்:6,சனி:7,ராகு:8,கேது:9};
const AV_ADJ={சூரியன்:5,குரு:5,சந்திரன்:2,செவ்வாய்:2,புதன்:3,சுக்கிரன்:3,சனி:3,ராகு:4,கேது:4};
const AV_SOUND_GROUPS={1:['a','aa','i','ee','u','oo','e','ai','ka','k','chh','d','dh','bh','v','அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','க','ச்','ட','த','ப','வ'],2:['i','kh','j','n','m','s','sh','க்ஹ','ஜ','ந','ம','ச','ஷ'],3:['u','g','jh','t','p','y','sh','உ','க','ஜ','த','ப','ய','ழ'],4:['e','gh','th','ph','r','s','எ','க','த','ப','ர','ச'],5:['o','ch','th','d','b','l','h','ஒ','ச','த','ட','ப','ல','ஹ']};
function avSoundNumber(initial){
  let x=String(initial||'').trim().toLowerCase(); if(!x)return null;
  for(const [n,arr] of Object.entries(AV_SOUND_GROUPS)){if(arr.some(a=>x===a||x.startsWith(a)))return Number(n);}
  const c=x[0]; if('aiueo'.includes(c))return 1;
  if('kchtdbv'.includes(c))return 1; if('gjmn s'.replace(/ /g,'').includes(c))return 2; if('upy'.includes(c))return 3; if('egrs'.includes(c))return 4; if('ocdlh'.includes(c))return 5;
  return null;
}
function avNativeInitial(chart){const supplied=String(chart?.nameInitial||chart?.kota?.nameInitial||chart?.nativeInitial||'').trim();if(supplied)return supplied;const name=String(chart?.nativeName||chart?.name||chart?.kota?.nativeName||'').trim();if(!name)return '';try{const seg=new Intl.Segmenter(undefined,{granularity:'grapheme'});return seg.segment(name)[Symbol.iterator]().next().value?.segment||Array.from(name)[0]||'';}catch(e){return Array.from(name)[0]||'';}}
function avNakIndex(p){const x=Number(p?.nakshatraIndex);if(Number.isFinite(x)&&x>=1&&x<=27)return Math.floor(x);const lon=Number(p?.longitude);return Number.isFinite(lon)?Math.floor((((lon%360)+360)%360)/(360/27))+1:null;}
function avAmsaInRasi(p){const d=degIn(Number(p?.longitude)||0);return Math.min(9,Math.floor(d/(30/9))+1);}
function avGhati(chart){const ref=chart?.specialLagnaReference;const elapsed=Number(ref?.elapsedMinutes);if(Number.isFinite(elapsed)&&elapsed>=0)return Math.floor(elapsed/24)+1;const b=chart?.birth||{};const t=String(b.time||'').match(/^(\d{1,2}):(\d{2})/);const rise=Number(ref?.sunriseMinutes);if(t&&Number.isFinite(rise)){let mins=Number(t[1])*60+Number(t[2])-rise;if(mins<0)mins+=1440;return Math.floor(mins/24)+1;}return null;}
const AV_RESULTS={
Sayana:{சூரியன்:'Digestive and heart-related troubles, stout legs, bile/piles themes.',சந்திரன்:'Honour with sluggishness and sensuality; financial waste.',செவ்வாய்:'Troubles, wounds, ulcers and itching.',புதன்:'Pleasure-seeking, excessive appetite and licentious tendencies.',குரு:'Strong but weak voice; tawny complexion; fear of enemies.',சுக்கிரன்:'Strong yet dental trouble, temper, poverty or sensual excess.',சனி:'Hunger/thirst and childhood disease themes; wealth later.',ராகு:'Many miseries; in Aries/Taurus/Gemini/Virgo, wealth can arise.',கேது:'Many diseases; in Aries/Taurus/Gemini/Virgo, wealth can arise.'},
Upavesana:{சூரியன்:'Poor, quarrelsome, hard-hearted; loss of money.',சந்திரன்:'Disease, poor judgment, poverty and harmful actions.',செவ்வாய்:'Strong, wealthy and eminent but sinful or untruthful tendencies.',புதன்:'Character and wealth depend strongly on benefic/malefic influence.',குரு:'Talkative; conflicts with enemies/authority; foot or hand ulcers.',சுக்கிரன்:'Gems, gold, royal honour, happiness and victory over enemies.',சனி:'Self-respect with dangers, enemies and ulcer themes.',ராகு:'Royal contacts and honour mixed with ulcer and financial troubles.',கேது:'Enemy/snake/thief troubles with windy diseases.'},
Netrapaani:{சூரியன்:'Happiness, wisdom, strength, wealth and support from authorities.',சந்திரன்:'Disease, excessive talk and harmful actions.',செவ்வாய்:'In Lagna poverty; elsewhere authority over a town.',புதன்:'Honour but limited wisdom/learning; in 5th, strain around spouse/children.',குரு:'Health/wealth weakness with sensuality and unusual social associations.',சுக்கிரன்:'In Lagna/7th/10th, eye and wealth troubles; elsewhere a large home.',சனி:'Learned, intelligent, good speech, arts, friends and royal favour.',ராகு:'Eye troubles, financial loss and trouble from wicked people/snakes/thieves.',கேது:'Eye troubles and conflict with wicked people, thieves or rulers.'},
Prakaasana:{சூரியன்:'Charitable, wealthy, strong, good-looking and persuasive.',சந்திரன்:'Fame, virtue, patronage, luxuries, ornaments and shrine visits.',செவ்வாய்:'Virtuous and honoured; in 5th, child-loss indications are stated in the text.',புதன்:'Charitable, kind, learned, wise and able to defeat wicked groups.',குரு:'Virtuous, comfortable, splendid and spiritually inclined; exaltation gives exceptional fame/opulence.',சுக்கிரன்:'When exalted/own/friendly, king-like dignity with poetry, arts and music.',சனி:'Virtuous, intelligent, opulent, kind and spiritually inclined.',ராகு:'Foreign prosperity, high position, wealth and virtuous conduct.',கேது:'Wealth, righteousness, foreign residence, enthusiasm and service to authority.'},
Gamana:{சூரியன்:'Foreign residence, fear, anger, laziness and poverty themes.',சந்திரன்:'Waning Moon: cruelty/eye troubles; waxing Moon: fear-related troubles.',செவ்வாய்:'Wandering, boils/itching, quarrels and wounds.',புதன்:'Frequent court/authority contacts and wealth.',குரு:'Brave, many friends, learned and wealthy.',சுக்கிரன்:'Separation from mother/people and fear from enemies.',சனி:'Rich, good sons, learning at court; may seize others’ land.',ராகு:'Many children, learning, wealth, charity and honour.',கேது:'Many children, learning, wealth, charity, virtue and greatness.'},
Aagamana:{சூரியன்:'Improper relationships, abandonment, travel, deceit and impurity.',சந்திரன்:'Honour mixed with foot disease, hidden wrongdoing, poverty and sadness.',செவ்வாய்:'Good character, gems, weapons and victory over enemies.',புதன்:'Frequent court/authority contacts and wealth.',குரு:'Servants, excellent women, wealth and a prosperous home.',சுக்கிரன்:'Wealth, holy visits and enthusiasm; hand/foot disease themes.',சனி:'Family separation, foolishness, wandering and misery.',ராகு:'Irritable, unintelligent, poor, wicked, miserly and sensual.',கேது:'Disease, loss of wealth, tale-bearing and harming others.'},
Sabhaa:{சூரியன்:'Helps others; wealth, gems, lands, virtue, strength and kindness.',சந்திரன்:'Eminence, honour, sensual enjoyment and good character.',செவ்வாய்:'Scholarship, wealth, honour and charity; exaltation improves success and dharma.',புதன்:'Wealth, good deeds, authority/ministry and spiritual devotion; exaltation strengthens.',குரு:'Excellent speech, wealth/gems, royal insignia and deep learning.',சுக்கிரன்:'Eminence at court, virtue, victory over enemies, wealth and charity.',சனி:'Judicial knowledge, wealth/gems and brilliance in assemblies.',ராகு:'Learning, virtues, wealth and happiness, with some miserliness.',கேது:'Talkative, proud, miserly, sensual and skilled in difficult subjects.'},
Aagama:{சூரியன்:'Enemies, fickle mind, deceit and failure to follow good dharma/karma.',சந்திரன்:'Waxing: talkative/virtuous; waning: relationship, illness and deceit themes.',செவ்வாய்:'Bad character/deeds, ear trouble, timidity and evil company.',புதன்:'Money through service; family/children can bring reputation.',குரு:'Vehicles, comforts, honour, servants, progeny, learning and noble path.',சுக்கிரன்:'Lack of wealth, enemies, child separation, disease and marital unhappiness.',சனி:'Disease, reduced skill and little royal patronage.',ராகு:'Financial loss, litigation fear, separation and manipulative tendencies.',கேது:'Notoriety, sin, litigation, disease and enemies.'},
Bhojana:{சூரியன்:'Joint pains, wealth loss through opposite sex, weakness, headaches and falsehood.',சந்திரன்:'Waxing Moon: status, honour, vehicles, wife/daughters and servants; waning weakens these.',செவ்வாய்:'If strong, pleasant food; if weak, dishonourable actions.',புதன்:'Litigation losses, authority conflict and marital unhappiness.',குரு:'Excellent food, wealth and royal insignia.',சுக்கிரன்:'If debilitated, some wealth/respect; otherwise hunger, disease and enemy fear.',சனி:'Weak sight, delusion and enjoyment of tasty food.',ராகு:'Little happiness from spouse/children and poor food; timid.',கேது:'Hungry, sick, wandering and poor.'},
Nrityalipsaa:{சூரியன்:'Learned, poetic discussion and respected by authorities.',சந்திரன்:'Waxing: strength, poetry, music and arts; waning: sinful tendencies.',செவ்வாய்:'Wealth through royal connections; gold, diamonds and coral.',புதன்:'Honour, vehicles, gems, courage, friends, progeny and learning; malefic sign may add licentiousness.',குரு:'Royal honour, wealth, dharma/tantra learning and scholarly respect.',சுக்கிரன்:'Literature, arts, music, merit and opulence.',சனி:'Righteous, opulent, honoured and brave in conflict.',ராகு:'Disease, eye problems, enemy fear and financial loss.',கேது:'Disease, eye troubles, wicked/sinful tendencies.'},
Kautuka:{சூரியன்:'Happy, learned, ritual-minded, connected with palaces/authority and poetry.',சந்திரன்:'Power/wealth and skill in sensual matters.',செவ்வாய்:'Curious, friends and children; exaltation adds honour and virtue.',புதன்:'Music in Lagna; 7th/8th can indicate courtesan attachment; 9th supports good deeds.',குரு:'Curious, kind, happy, honoured, children and fame.',சுக்கிரன்:'Opulent, learned, famous and respected in assemblies.',சனி:'Lands, wealth, happiness, pleasures, poetry and arts.',ராகு:'Wandering, pursuit of others’ spouses and theft themes.',கேது:'Courtesan attachment, professional losses, sin and wandering.'},
Nidraa:{சூரியன்:'Drowsiness, foreign residence and trouble to wife.',சந்திரன்:'With Jupiter, eminence; without Jupiter, financial/relationship troubles.',செவ்வாய்:'Anger, poor judgment, poverty, sickness and loss of virtue.',புதன்:'Uncomfortable sleep, neck trouble, misery, litigation and wealth loss.',குரு:'Poverty, poor judgment and weak righteous action.',சுக்கிரன்:'Servitude, criticism, talkativeness and wandering.',சனி:'Rich, charming, good character, brave and able to defeat enemies.',ராகு:'Virtuous, good spouse/children, happy, proud, bold and wealthy.',கேது:'Virtuous, wealth/agricultural gains and entertainment.'}
};
function avPlanetRelation(planet,sign){
  const lord=SIGN_LORDS[sign]; if(!lord)return 'neutral';
  const rel={சூரியன்:{சந்திரன்:'friend',செவ்வாய்:'friend',குரு:'friend',சுக்கிரன்:'enemy',சனி:'enemy',புதன்:'neutral'},சந்திரன்:{சூரியன்:'friend',புதன்:'friend',செவ்வாய்:'neutral',குரு:'friend',சுக்கிரன்:'neutral',சனி:'neutral'},செவ்வாய்:{சூரியன்:'friend',சந்திரன்:'friend',குரு:'friend',புதன்:'enemy',சுக்கிரன்:'neutral',சனி:'neutral'},புதன்:{சூரியன்:'friend',சுக்கிரன்:'friend',சந்திரன்:'enemy',செவ்வாய்:'neutral',குரு:'neutral',சனி:'neutral'},குரு:{சூரியன்:'friend',சந்திரன்:'friend',செவ்வாய்:'friend',புதன்:'enemy',சுக்கிரன்:'enemy',சனி:'neutral'},சுக்கிரன்:{புதன்:'friend',சனி:'friend',சூரியன்:'enemy',சந்திரன்:'neutral',செவ்வாய்:'neutral',குரு:'enemy'},சனி:{புதன்:'friend',சுக்கிரன்:'friend',சூரியன்:'enemy',சந்திரன்:'enemy',செவ்வாய்:'enemy',குரு:'neutral'}};
  return rel[planet]?.[lord]||'neutral';
}
function avAlertState(planet,sign){if(exalt[planet]===sign || (own[planet]||[]).includes(sign))return 'Jaagrita';const rel=avPlanetRelation(planet,sign);return rel==='friend'||rel==='neutral'?'Swapna':'Sushupta';}
function avMoodState(planet,sign,chart,p){
  if(exalt[planet]===sign)return 'Deepta'; if((own[planet]||[]).includes(sign))return 'Svastha';
  const rel=avPlanetRelation(planet,sign); if(rel==='friend')return 'Saanta'; if(rel==='enemy')return 'Duhkhita';
  const ps=chart?.planets||[]; const same=ps.filter(x=>x!==p&&rasi(x.longitude)===sign); const mal=['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'];
  if(same.some(x=>mal.includes(x.name))){if(sign===rasi(Number(chart?.lagna?.longitude)||0)+4 && planet!=='சூரியன்')return 'Lajjita'; return 'Vikala';}
  if(same.some(x=>x.name==='சூரியன்'&&Math.abs((((x.longitude-p.longitude+540)%360)-180))<8))return 'Kopita';
  return 'Deena';
}
function avActivity(chart,lang){
  const pm=planetMap(chart), moon=pm['சந்திரன்']; const M=avNakIndex(moon); const G=avGhati(chart); const L=Number.isFinite(Number(chart?.lagna?.longitude))?rasi(chart.lagna.longitude)+1:null; const initial=avNativeInitial(chart), sound=avSoundNumber(initial);
  return ALL.map(name=>{const p=pm[name];if(!p||!Number.isFinite(Number(p.longitude))||!M||!G||L==null)return {planet:name,error:'Required data unavailable'};const C=avNakIndex(p),P=AV_PLANET_INDEX[name],A=avAmsaInRasi(p);const raw=(C*P*A)+M+G+L;const index=((raw%12)+12)%12||12;const state=AV_ACTIVITY[index-1];let activityStrength='—',strengthCode=null;if(sound){const v=((index*index+sound)%12+12)%12;const q=v+AV_ADJ[name];const rem=q%3;strengthCode=rem===0?3:rem;activityStrength=rem===2?'Cheshta':rem===1?'Drishti':'Vicheshta';}
    return {planet:name,C,P,A,M,G,L,formula:`(${C} × ${P} × ${A}) + ${M} + ${G} + ${L} = ${raw}`,index,state,stateTa:AV_ACTIVITY_TA[index-1],meaning:AV_ACTIVITY_MEANING[state]?.[lang==='ta'?1:0]||'',initial,sound,activityStrength,strengthCode,resultLevel:strengthCode===2?'Full':strengthCode===1?'Medium':strengthCode===3?'Very little':'—',prediction:AV_RESULTS[state]?.[name]||'—',house:(Number.isFinite(Number(p.bhava))?p.bhava:(chart?.bhavas||[]).findIndex(b=>{const lo=Number(b?.arambha??b?.longitude);return Number.isFinite(lo)&&rasi(p.longitude)===rasi(lo)})+1)||'—'};
  });
}
function avastha154(chart,lang){
  const pm=planetMap(chart),activity=avActivity(chart,lang); const name=avNativeInitial(chart); const sound=avSoundNumber(name); const ps=ALL.map(name=>{const p=pm[name];if(!p||!Number.isFinite(Number(p.longitude)))return null;const s=rasi(p.longitude);return {planet:name,alertState:avAlertState(name,s),moodState:avMoodState(name,s,chart,p)};}).filter(Boolean);
  return {nativeInitial:name,soundNumber:sound,alertness:ps,activity,method:'Book §15.4.2–15.4.4; §15.4.4 uses C×P×A+M+G+L, then avastha² + name-sound number, remainder 12, planetary adjustment, remainder 3.',note:'§15.4.1 is intentionally not duplicated because the project already provides the age-related Avastha.'};
}
function avakhada(chart,lang){return {rows:(chart.planets||[]).map((p,i)=>({planet:p.name,nakshatra:p.nakshatra,pada:p.pada,starIndex:Number((p.nakshatraIndex??Math.floor((((p.longitude%360)+360)%360)/(360/27)))+1),rasi:p.rasi,degree:p.degree,longitude:p.longitude,speed:p.speed,retrograde:Number(p.speed||0)<0})),method:'Nakshatra-based Avakhada detail table'};}
function kota(chart,lang){
  const pm=planetMap(chart), moon=pm['சந்திரன்'];
  const center=rasi(moon?.longitude||0);
  const moonSignLord={0:'செவ்வாய்',1:'சுக்கிரன்',2:'புதன்',3:'சந்திரன்',4:'சூரியன்',5:'புதன்',6:'சுக்கிரன்',7:'செவ்வாய்',8:'குரு',9:'சனி',10:'சனி',11:'குரு'}[center]||'';
  const ps=Array.isArray(chart?.planets)?chart.planets:[];
  // Janma Nakshatra/Pada comes from the natal Moon. Prefer the already-calculated
  // planet values so the Kota Paala comparison uses the same chart data shown to the user.
  let janmaNakEn='';
  if(moon?.nakshatra){
    janmaNakEn=NAK_EN.includes(moon.nakshatra)?moon.nakshatra:(NAK.indexOf(moon.nakshatra)>=0?NAK_EN[NAK.indexOf(moon.nakshatra)]:'');
  }
  if(!janmaNakEn) janmaNakEn=NAK_EN[Math.max(0,Math.min(26,Math.floor((Number(moon?.longitude)||0)/13.333333333333334)))]||'';
  const janmaPada=Number(moon?.pada||0)||((Math.floor(((((Number(moon?.longitude)||0)%13.333333333333334)+13.333333333333334)%13.333333333333334)/(13.333333333333334/4))+1));
  const name=chart.birthName||chart.name||'';

  // KOTA PAALA MUST BE BIRTH-CHART BASED ONLY.
  // The native-name sound is calculated separately for display/comparison and must
  // never change Kota Paala. Therefore Tamil/English/mixed-script names all return
  // the same Kota Paala for the same Janma Nakshatra and Pada.
  const nameInfo=name?nameNakshatraFromName(name,lang,janmaNakEn,janmaPada):null;
  const kotaPalaName=KOTA_PALA_BY_PADA[janmaNakEn]?.[janmaPada-1]||'';

  const refIndex=Math.max(0,KOTA_28_EN.indexOf(janmaNakEn));
  const zoneOf={};
  [4,11,18,25].forEach(i=>zoneOf[i]='Stambha');
  [3,5,10,12,17,19,24,26].forEach(i=>zoneOf[i]='Durgantara / Madhya');
  [2,6,9,13,16,20,23,27].forEach(i=>zoneOf[i]='Prakaara');
  [1,7,8,14,15,21,22,28].forEach(i=>zoneOf[i]='Bahya');
  const nakshatras=KOTA_28_EN.map((baseName,i)=>{
    const rel=((i-refIndex+28)%28)+1;
    return {relative:rel,nakshatra:lang==='en'?baseName:KOTA_28_TA[i],zone:zoneOf[rel],isJanma:rel===1};
  }).sort((a,b)=>a.relative-b.relative);
  const planets=ps.map(p=>{
    const idx=Math.max(0,Math.min(26,Math.floor((((Number(p.longitude)||0)%360+360)%360)/13.333333333333334)));
    const baseNak=NAK_EN[idx]||'';
    const within=((Number(p.longitude)||0)%13.333333333333334+13.333333333333334)%13.333333333333334;
    const base28=baseNak==='Uttara Ashadha' && within>=10 ? 'Abhijit' : baseNak;
    const actualIdx=KOTA_28_EN.indexOf(base28);
    const rel=actualIdx>=0?((actualIdx-refIndex+28)%28)+1:null;
    return {planet:p.name,rasi:signName(rasi(p.longitude),lang),nakshatra:lang==='en'?base28:(KOTA_28_TA[Math.max(0,actualIdx)]||p.nakshatra),pada:p.pada,degree:p.degree,longitude:p.longitude,speed:p.speed,retrograde:Number(p.speed||0)<0,relativeNakshatra:rel,zone:zoneOf[rel]||'—'};
  });
  const englishPlanets={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
  const kpDisplay=lang==='en'?(englishPlanets[kotaPalaName]||kotaPalaName):kotaPalaName;
  return {
    moonRasi:signName(center,lang),
    janmaNakshatra:lang==='en'?janmaNakEn:(KOTA_28_TA[KOTA_28_EN.indexOf(janmaNakEn)]||janmaNakEn),
    janmaNakshatraPada:janmaPada,
    janmaNakshatraSound:(NAME_NAK_TABLE[janmaNakEn]||[])[janmaPada-1]||'—',
    nativeName:name,
    nameInitial:nameInfo?.initial||normalizeKotaInitial(name,detectKotaNameLang(name))||'—',
    nameInitialTA:nameInfo?.nameLang==='ta'?(nameInfo?.initial||'—'):'—',
    nameInitialEN:nameInfo?.nameLang==='en'?(nameInfo?.initial||'—'):'—',
    nameNakshatra:nameInfo?(lang==='en'?nameInfo.nakshatra:(KOTA_28_TA[KOTA_28_EN.indexOf(nameInfo.nakshatra)]||nameInfo.nakshatra)):'—',
    nameNakshatraTA:nameInfo?(KOTA_28_TA[KOTA_28_EN.indexOf(nameInfo.nakshatra)]||nameInfo.nakshatra):'—',
    nameNakshatraEN:nameInfo?.nakshatra||'—',
    nameNakshatraPada:nameInfo?.pada||'—',
    nameSyllable:nameInfo?.syllable||'—',
    nameSyllableTA:nameInfo?.nameLang==='ta'?(nameInfo?.syllable||'—'):'—',
    nameSyllableEN:nameInfo?.nameLang==='en'?(nameInfo?.syllable||'—'):'—',
    nameMatchType:nameInfo?.matchType||'No native-name match',
    kotaSwami:{planet:lang==='en'?(englishPlanets[moonSignLord]||moonSignLord):moonSignLord,basis:lang==='en'?'Lord of the Rashi occupied by the natal Moon (Janma Rashi).':'ஜன்ம சந்திரன் இருக்கும் ராசியின் அதிபதி.'},
    kotaPala:{planet:kpDisplay,basis:lang==='en'?'Determined only from the natal Moon Janma Nakshatra and Pada (Avakahada/Kota Paala matrix). The native name does not alter Kota Paala.':'ஜன்ம சந்திரனின் நட்சத்திரம் மற்றும் பாதம் (அவகஹடா/கோட்டா பாலா அட்டவணை) மட்டுமே கோட்டா பாலாவை நிர்ணயிக்கும். பெயர் கோட்டா பாலாவை மாற்றாது.'},
    sectors:[],nakshatras,entryPath:['NE','SE','SW','NW'],exitPath:['E','S','W','N'],planets,allPlanets:planets,
    method:lang==='en'?'Kota Paala = Janma Nakshatra + Pada only. Native-name Nakshatra is calculated separately for reference and may differ without changing Kota Paala.':'கோட்டா பாலா = ஜன்ம நட்சத்திரம் + பாதம் மட்டும். பெயர் நட்சத்திரம் தனியாக குறிப்புக்காக கணக்கிடப்படும்; அது வேறுபட்டாலும் கோட்டா பாலா மாறாது.'
  };
}
function sudarshana(chart,lang){const ps=chart.planets||[],asc=rasi(chart.lagna?.longitude||0),moon=rasi(planetMap(chart)['சந்திரன்']?.longitude||0),sun=rasi(planetMap(chart)['சூரியன்']?.longitude||0);const make=(name,base)=>({name,center:signName(base,lang),houses:Array.from({length:12},(_,i)=>{const si=norm(base+i),occ=ps.filter(p=>rasi(p.longitude)===si);return {house:i+1,rasi:signName(si,lang),planets:occ.map(p=>p.name),planetDetails:occ.map(p=>({planet:p.name,degree:p.degree,nakshatra:p.nakshatra,pada:p.pada}))};})});return {rings:[make('Lagna Chakra',asc),make('Chandra Chakra',moon),make('Surya Chakra',sun)],allPlanets:ps.map(p=>({planet:p.name,rasi:p.rasi,degree:p.degree,nakshatra:p.nakshatra,pada:p.pada})),method:'Three-reference Sudarshana Chakra detail'};}
function sbcStaticGrid(lang){
  const en=[
    ['ī','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati','Ashwini','Bharani','a'],
    ['Shravana','ṛ','g','s','d','ch','l','u','Krittika'],
    ['Abhijit','kh','ai','Aquarius','Pisces','Aries','lri','a','Rohini'],
    ['Uttara Ashadha','j','Capricorn','aha','Rikta','o','Taurus','v','Mrigashira'],
    ['Purva Ashadha','bh','Sagittarius','Jaya','Purna','Nanda','Gemini','k','Ardra'],
    ['Mula','y','Scorpio','am','Bhadra','au','Cancer','h','Punarvasu'],
    ['Jyeshtha','n','e','Libra','Virgo','Leo','lri','d','Pushya'],
    ['Anuradha','ṛ','t','r','p','ṭ','m','ū','Ashlesha'],
    ['i','Vishakha','Swati','Chitra','Hasta','Uttara Phalguni','Purva Phalguni','Magha','aa']
  ];
  const ta=[
    ['ஈ','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி','அஸ்வினி','பரணி','அ'],
    ['திருவோணம்','஋','க','ஸ்','த்','ச்','ல்','உ','கார்த்திகை'],
    ['அபிஜித்','க்','ஐ','கும்பம்','மீனம்','மேஷம்','ளி','அ','ரோகிணி'],
    ['உத்திராடம்','ஜ','மகரம்','அஃ','ரிக்தா','ஓ','ரிஷபம்','வ','மிருகசீரிஷம்'],
    ['பூராடம்','ப்ஹ','தனுசு','ஜயா','பூர்ணா','நந்தா','மிதுனம்','க','திருவாதிரை'],
    ['மூலம்','ய','விருச்சிகம்','அம்','பத்ரா','ஔ','கடகம்','ஹ','புனர்பூசம்'],
    ['கேட்டை','ந','எ','துலாம்','கன்னி','சிம்மம்','ளி','ட','பூசம்'],
    ['அனுஷம்','஋','த','ர','ப','ட்','ம','ஊ','ஆயில்யம்'],
    ['இ','விசாகம்','சுவாதி','சித்திரை','ஹஸ்தம்','உத்திரம்','பூரம்','மகம்','ஆ']
  ];
  const rows=lang==='en'?en:ta;
  const nakSet=new Set(lang==='en'?NAK_EN.concat(['Abhijit']):NAK.concat(['அபிஜித்']));
  const rasiSet=new Set(lang==='en'?EN_RASIS:RASIS);
  const tithiSet=new Set(lang==='en'?['Nanda','Bhadra','Jaya','Rikta','Purna']:['நந்தா','பத்ரா','ஜயா','ரிக்தா','பூர்ணா']);
  const vowelSet=new Set(lang==='en'?['a','aa','i','ī','u','ū','e','ai','o','au','r','ṛ','ri','lri','lrii','am','aha']:['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஐ','ஒ','ஔ','஋','௠','ளி','ளீ','அம்','அஃ']);
  return rows.map((row,r)=>row.map((label,c)=>{let type='consonant';if(nakSet.has(label))type='nakshatra';else if(rasiSet.has(label))type='rasi';else if(tithiSet.has(label))type='tithi';else if(vowelSet.has(label))type='vowel';return {r,c,label,type};}));
}
function sbcNakPositions(){
  const names=['Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Abhijit','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati','Ashwini','Bharani'];
  const pos=[];
  for(let r=1;r<=7;r++)pos.push([r,8]);
  pos.push([8,7],[8,6],[8,5],[8,4],[8,3],[8,2],[8,1]);
  for(let r=7;r>=1;r--)pos.push([r,0]);
  pos.push([0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7]);
  return Object.fromEntries(names.map((n,i)=>[n,{r:pos[i][0],c:pos[i][1],index:i+1}]));
}
function sbcNakInfo(p){
  const lon=((Number(p?.longitude||0)%360)+360)%360;
  // In the supplied Sarvatobhadra convention, Abhijit is the last quarter of Uttara Ashadha.
  if(lon>=276.6666666667 && lon<280.0) return {index:20,nakshatra:'Abhijit',pada:4};
  const idx=Math.floor(lon/(360/27))+1;
  return {index:idx,nakshatra:NAK_EN[Math.max(0,idx-1)]||p?.nakshatra||'',pada:p?.pada};
}
function sbcNakIndex(p){return sbcNakInfo(p).index;}
function sbcVedhaCells(r,c){
  const out=[]; const add=(rr,cc)=>{if(rr>=0&&rr<9&&cc>=0&&cc<9)out.push([rr,cc]);};
  // Three classical vedha lines from the occupied nakshatra: one orthogonal and two diagonals.
  for(let cc=0;cc<9;cc++)add(r,cc);
  for(let rr=0;rr<9;rr++)add(rr,c);
  for(let d=-8;d<=8;d++){add(r+d,c+d);add(r+d,c-d);}
  return [...new Map(out.map(x=>[x.join(','),x])).values()];
}
function sarvatobhadra(chart,lang){
  const ps=chart.planets||[]; const rows=sbcStaticGrid(lang); const pos=sbcNakPositions();
  const planetMarks=[]; const vedha={};
  for(const p of ps){
    const info=sbcNakInfo(p); const idx=info.index; const nak=lang==='en'?info.nakshatra:(info.nakshatra==='Abhijit'?'அபிஜித்':(NAK[Math.max(0,idx-1)]||p.nakshatra||''));
    const at=pos[nak]||pos[NAK_EN[Math.max(0,idx-1)]];
    if(at){
      const cells=sbcVedhaCells(at.r,at.c);
      for(const [r,c] of cells){const k=`${r},${c}`;(vedha[k] ||= []).push({planet:p.name,retrograde:Number(p.speed||0)<0});}
    }
    planetMarks.push({planet:p.name,nakshatra:nak,nakshatraIndex:at?.index||idx,pada:(info.nakshatra==='Abhijit'?4:p.pada),rasi:signName(rasi(p.longitude),lang),degree:p.degree,retrograde:Number(p.speed||0)<0,cell:at||null});
  }
  const grid=rows.map(row=>row.map(cell=>({...cell,planets:planetMarks.filter(p=>p.cell&&p.cell.r===cell.r&&p.cell.c===cell.c).map(p=>p.planet),vedha:vedha[`${cell.r},${cell.c}`]||[]})));
  const tithiGroups=lang==='en'?[
    {name:'Nanda',tithis:'1, 6, 11, 16, 21, 26',weekdays:'Sunday, Tuesday'},
    {name:'Bhadra',tithis:'2, 7, 12, 17, 22, 27',weekdays:'Monday, Wednesday'},
    {name:'Jaya',tithis:'3, 8, 13, 18, 23, 28',weekdays:'Thursday'},
    {name:'Rikta',tithis:'4, 9, 14, 19, 24, 29',weekdays:'Friday'},
    {name:'Purna',tithis:'5, 10, 15, 20, 25, 30',weekdays:'Saturday'}
  ]:[
    {name:'நந்தா',tithis:'1, 6, 11, 16, 21, 26',weekdays:'ஞாயிறு, செவ்வாய்'},
    {name:'பத்ரா',tithis:'2, 7, 12, 17, 22, 27',weekdays:'திங்கள், புதன்'},
    {name:'ஜயா',tithis:'3, 8, 13, 18, 23, 28',weekdays:'வியாழன்'},
    {name:'ரிக்தா',tithis:'4, 9, 14, 19, 24, 29',weekdays:'வெள்ளி'},
    {name:'பூர்ணா',tithis:'5, 10, 15, 20, 25, 30',weekdays:'சனி'}
  ];
  const natalMoon=planetMap(chart)['சந்திரன்']||planetMap(chart)['Moon']||{};
  // Always derive Janma Nakshatra from the natal Moon longitude. Do not trust
  // a stale/display-only moonNakshatra field, which can cause the SBC center
  // to show the wrong Janma Nakshatra.
  const natalMoonInfo=sbcNakInfo(natalMoon);
  const centerNakshatra=lang==='en'
    ? natalMoonInfo.nakshatra
    : (natalMoonInfo.nakshatra==='Abhijit'?'அபிஜித்':(NAK[Math.max(0,natalMoonInfo.index-1)]||''));
  return {grid,planetMarks,centerNakshatra,tithiGroups,layout:{rows:9,columns:9,cells:81,outerNakshatras:28,abhijitIncluded:true,rasis:12,vowels:16,consonants:20,tithiWeekdayGroups:5,directions:['North','South','East','West']},vedhaRules:{lines:'From an occupied Nakshatra, one horizontal or vertical line and two crossward diagonal lines identify Vedha contents.',special:'Corner vowels, paired vowels, specified consonant Vedha pairs, and the Abhijit placement are retained from the supplied traditional specification.'},traditional:{outerRing:'28 Nakshatras including Abhijit; four corners are vowels.',aksharaRing:'20 consonant/name-sound cells plus corner vowels.',rashiRing:'12 Rasis plus corner vowels.',tithiRing:'Nanda, Bhadra, Jaya, Rikta and Poorna; weekdays are associated with these five groups.',center:'Poorna',planetPlacement:'Each planet is placed in the cell corresponding to its occupied Nakshatra; its Pada remains in the detail table.',planetShortNames:['Su','Mo','Ma','Me','Ju','Ve','Sa','Ra','Ke']},method:'Traditional 9x9 Sarvatobhadra layout based on the supplied 81-varga specification.'};
}

// V5 traditional astrology extensions. These are intentionally isolated so one
// optional module cannot prevent the core horoscope from rendering.
const J_NAMES=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const J_TA=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி'];
const LORD_EN={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
const LORD_TA={சூரியன்:'சூரியன்',சந்திரன்:'சந்திரன்',செவ்வாய்:'செவ்வாய்',புதன்:'புதன்',குரு:'குரு',சுக்கிரன்:'சுக்கிரன்',சனி:'சனி',ராகு:'ராகு',கேது:'கேது'};
function v5planet(chart,name){return planetMap(chart)[name]||{};}

// Special Lagnas — implemented from the supplied P.V.R. Narasimha Rao textbook
// (Chapter 5).  The book explicitly defines Bhava, Hora, Ghati and Sree Lagna.
// Indu Lagna is calculated using the user's supplied Kala/remainder method.
const INDU_KALA={சூரியன்:30,சந்திரன்:16,செவ்வாய்:6,புதன்:8,குரு:10,சுக்கிரன்:12,சனி:1};
function specialLagnaSunriseReference(chart){
  const ref=chart?.specialLagnaReference||{};
  return {
    sunriseMinutes:Number(ref.sunriseMinutes),
    sunriseDate:String(ref.sunriseDate||chart?.birth?.date||''),
    sunLongitudeAtSunrise:Number(ref.sunLongitudeAtSunrise),
    elapsedMinutes:Number(ref.elapsedMinutes)
  };
}
function specialLagnaRow(name,lon,purpose,lang,extra={}){
  const L=normLon(lon), ri=rasi(L), nk=Math.floor(L/(360/27)), within=L%(360/27), pada=Math.floor(within/((360/27)/4))+1;
  return {name,englishName:extra.englishName||name,longitude:Number(L.toFixed(8)),rasi:signName(ri,lang),degree:dms(L),nakshatra:lang==='en'?(NAK_EN[nk]||'—'):(NAK[nk]||'—'),pada,purpose,...extra};
}

function rasiNameToIndex(name){
  const s=String(name||'');
  let i=RASIS.indexOf(s); if(i>=0) return i;
  i=EN_RASIS.indexOf(s); return i>=0?i:null;
}
function specialArudhaSign(sourceSign, chart){
  const s=norm(Number(sourceSign));
  const lord=phase1LordForSign(s,chart);
  const lp=planetMap(chart)[lord];
  if(!lp || !Number.isFinite(Number(lp.longitude))) return null;
  const ls=rasi(lp.longitude);
  let result=norm(ls + norm(ls-s));
  // Classical Arudha exceptions: if the computed pada is the source sign
  // or its 7th, use the 10th/4th respectively from the source sign.
  if(result===s) result=norm(s+9);
  else if(result===norm(s+6)) result=norm(s+3);
  return {sign:result,lord,lordSign:ls};
}
function varnadaSign(lagnaSign,horaSign){
  const odd=s=>[0,2,4,6,8,10].includes(norm(s));
  const count=s=>odd(s)?norm(s)+1:12-norm(s);
  const a=count(lagnaSign), b=count(horaSign);
  const combined=odd(lagnaSign)===odd(horaSign)?a+b:Math.abs(a-b);
  const n=((combined-1)%12+12)%12;
  return odd(lagnaSign)?n:norm(11-n);
}
function phase1SpecialLagnas(chart,lang='ta'){
  const ta=lang!=='en';
  const asc=Number(chart?.lagna?.longitude), moon=Number(v5planet(chart,'சந்திரன்')?.longitude);
  if(!Number.isFinite(asc)||!Number.isFinite(moon)) throw new Error(ta?'லக்னம்/சந்திரன் நீளவியல் தரவு இல்லை.':'Lagna/Moon longitude is unavailable.');
  const ref=specialLagnaSunriseReference(chart);
  const sunRise=Number(ref.sunLongitudeAtSunrise), elapsed=Number(ref.elapsedMinutes);
  if(!Number.isFinite(sunRise)||!Number.isFinite(elapsed)) throw new Error(ta?'சூரிய உதய நேரம் அல்லது உதய சூரிய நீளவியல் இல்லை.':'Sunrise reference or sunrise Sun longitude is unavailable.');

  // Book Chapter 5.2–5.4: BL + 1°/4 min, HL + 1°/2 min, GL + 5°/4 min.
  const bl=normLon(sunRise+elapsed/4);
  const hl=normLon(sunRise+elapsed/2);
  const gl=normLon(sunRise+elapsed*5/4);
  // Vighati Lagna: one rasi per vighati (24 seconds), i.e. 75°/minute.
  const vl=normLon(sunRise+elapsed*75);

  // Chapter 5.7: fraction of Moon's current 13°20' nakshatra traversed × 360°,
  // then added to natal Lagna.
  const span=360/27;
  const moonWithin=((moon%span)+span)%span;
  const sl=normLon(asc+(moonWithin/span)*360);

  // Indu Lagna (user requested): 9th lords from Lagna and Moon, their Kala sum,
  // then count the remainder from Moon.
  const lagna9=norm(rasi(asc)+8), moon9=norm(rasi(moon)+8);
  const lords9=[SIGN_LORDS[lagna9],SIGN_LORDS[moon9]];
  const kalaSum=(INDU_KALA[lords9[0]]||0)+(INDU_KALA[lords9[1]]||0);
  const induRemainder=((kalaSum % 12) + 12) % 12;
  // REQUIRED Indu Lagna rule: count the remainder from Chandra Lagna.
  // Remainder 1 = Moon sign; 2 = 2nd from Moon; ...; remainder 11 = 11th from Moon.
  // Remainder 0 means 12, therefore use the 12th sign from Moon (Moon + 11 signs).
  const moonSign=rasi(moon);
  const induOffset=(induRemainder===0 ? 11 : induRemainder-1);
  const induSign=norm(moonSign+induOffset);
  const indu=normLon(induSign*30+degIn(moon));

  // Varnada Lagna is a sign-level calculation using Lagna and Hora parity.
  const varnada=varnadaSign(rasi(asc),rasi(hl));

  // Pranapada: sunrise Sun longitude + Sun-sign correction + elapsed time × 5°/minute.
  const sunSign=rasi(sunRise);
  const pranapadaCorrection=[0,1,2,3,4,5,6,7,8,9,10,11].includes(sunSign)
    ? ([0,3,6,9].includes(sunSign)?0:([1,4,7,10].includes(sunSign)?240:120)) : 0;
  const pranapada=normLon(sunRise+pranapadaCorrection+elapsed*5);

  // Arudha Lagna (A1) and Upapada (A12) are sign-based references.
  const al=specialArudhaSign(rasi(asc),chart);
  const ul=specialArudhaSign(norm(rasi(asc)+11),chart);

  // Karakamsa = Navamsa sign occupied by the Atmakaraka (highest degree among 7 classical planets).
  const classical=(chart.planets||[]).filter(p=>P7.includes(p.name)&&Number.isFinite(Number(p.longitude)));
  const ak=classical.sort((a,b)=>degIn(b.longitude)-degIn(a.longitude))[0];
  const karakamshaSign=ak?((ak.navamsa&&ak.navamsa.rasi)?rasiNameToIndex(ak.navamsa.rasi):rasi(vargaSign(ak.longitude,9))):null;

  const items=[
    specialLagnaRow(ta?'லக்னம்':'Lagna',asc,ta?'சுயம் / உடல் / வாழ்க்கையின் அடிப்படை':'Self, body and primary chart reference',lang,{englishName:'Lagna',source:'Natal ascendant'}),
    specialLagnaRow(ta?'பாவ லக்னம்':'Bhava Lagna',bl,ta?'பாவ / உடல் சார்ந்த குறிப்புப் புள்ளி':'Bhava reference; textbook defines it as Sun at sunrise advancing 1° per 4 minutes',lang,{englishName:'Bhava Lagna',source:'Chapter 5.2'}),
    specialLagnaRow(ta?'ஹோரா லக்னம்':'Hora Lagna',hl,ta?'செல்வம், பணம், வளம்':'Wealth, money and prosperity',lang,{englishName:'Hora Lagna',source:'Chapter 5.3'}),
    specialLagnaRow(ta?'கதி லக்னம்':'Ghati Lagna',gl,ta?'புகழ், அதிகாரம், ஆட்சி':'Fame, power and authority',lang,{englishName:'Ghati Lagna',source:'Chapter 5.4'}),
    specialLagnaRow(ta?'விகதி லக்னம்':'Vighati Lagna',vl,ta?'மிக நுணுக்கமான நேரக் குறிப்பு':'Fine-grained time-sensitive reference',lang,{englishName:'Vighati Lagna',source:'Vighati = 24 seconds; sign per vighati'}),
    specialLagnaRow(ta?'வர்ணத லக்னம்':'Varnada Lagna',varnada*30,ta?'சமூக நிலை / தொழில் சார்ந்த குறிப்பு':'Social/professional reference; sign-level calculation',lang,{englishName:'Varnada Lagna',source:'Parasara odd/even sign-count method',signOnly:true}),
    specialLagnaRow(ta?'ஸ்ரீ லக்னம்':'Sree Lagna',sl,ta?'செழிப்பு / வளம்':'Prosperity and wealth',lang,{englishName:'Sree Lagna',source:'Chapter 5.7'}),
    specialLagnaRow(ta?'இந்து லக்னம்':'Indu Lagna',indu,ta?'செல்வம் மற்றும் வளம் சார்ந்த சிறப்பு லக்னம்':'Special wealth/prosperity reference',lang,{englishName:'Indu Lagna',source:'User-supplied Kala/remainder method',ninthLords:lords9,kalaValues:lords9.map(x=>INDU_KALA[x]||0),kalaSum,kalaRemainder:kalaSum%12}),
    {name:ta?'ஆரூட லக்னம் (A1)':'Arudha Lagna (A1)',englishName:'Arudha Lagna (A1)',longitude:null,rasi:al?signName(al.sign,lang):'—',degree:'—',nakshatra:'—',pada:'—',purpose:ta?'உலகப் பார்வை / வெளிப்படையான உருவம்':'Public image / manifest perception',signOnly:true,source:'Arudha Pada A1'},
    specialLagnaRow(ta?'பிராணபத லக்னம்':'Pranapada Lagna',pranapada,ta?'உயிர்சக்தி / பிறப்பு நேர நுணுக்கம்':'Life-force and fine birth-time reference',lang,{englishName:'Pranapada Lagna',source:'Sunrise Sun + sign correction + 5°/minute elapsed-time method'}),
    {name:ta?'காரகாம்ச லக்னம்':'Karakamsa Lagna',englishName:'Karakamsa Lagna',longitude:null,rasi:karakamshaSign==null?'—':signName(karakamshaSign,lang),degree:'—',nakshatra:'—',pada:'—',purpose:ta?'ஜைமினி / ஆத்மகாரக ஆய்வு':'Jaimini / Atmakaraka reference',signOnly:true,source:'Navamsa sign of Atmakaraka'},
    {name:ta?'உபபத லக்னம் (A12)':'Upapada Lagna (A12)',englishName:'Upapada Lagna (A12)',longitude:null,rasi:ul?signName(ul.sign,lang):'—',degree:'—',nakshatra:'—',pada:'—',purpose:ta?'திருமணம் / துணை சார்ந்த ஆய்வு':'Marriage / spouse reference',signOnly:true,source:'Arudha of the 12th house'},
    // Textbook Chapter 7.3.5: Paaka Lagna = sign occupied by Lagna lord.
    (()=>{const lagnaSign=rasi(asc), lagnaLord=SIGN_LORDS[lagnaSign], lp=v5planet(chart,lagnaLord), sign=Number.isFinite(Number(lp?.longitude))?rasi(lp.longitude):null; return {name:ta?'பாக லக்னம்':'Paaka Lagna',englishName:'Paaka Lagna',longitude:null,rasi:sign===null?'—':signName(sign,lang),degree:'—',nakshatra:'—',pada:'—',purpose:ta?'உடல் / பௌதிக சுயத்தின் குறிப்பு':'Physical self reference',signOnly:true,source:'Textbook Chapter 7.3.5',lagnaLord:lagnaLord};})(),
    // Textbook Chapter 7.3.2: Chandra Lagna = Moon taken as reference.
    (()=>{const sign=rasi(moon); return {name:ta?'சந்திர லக்னம்':'Chandra Lagna',englishName:'Chandra Lagna',longitude:null,rasi:signName(sign,lang),degree:'—',nakshatra:'—',pada:'—',purpose:ta?'மனம் / மனப்பாங்கின் குறிப்பு':'Mind / mental perspective reference',signOnly:true,source:'Textbook Chapter 7.3.2'};})(),
    // Textbook Chapter 7.3.3: Ravi Lagna = Sun taken as reference.
    (()=>{const sun=v5planet(chart,'சூரியன்'), sign=rasi(Number(sun?.longitude)||0); return {name:ta?'ரவி லக்னம்':'Ravi Lagna',englishName:'Ravi Lagna',longitude:null,rasi:signName(sign,lang),degree:'—',nakshatra:'—',pada:'—',purpose:ta?'ஆத்மா / உடல் உயிர்சக்தியின் குறிப்பு':'Soul / physical vitality reference',signOnly:true,source:'Textbook Chapter 7.3.3'};})()
  ];
  const induKalas=ta?[
    ['சூரியன்',30],['சந்திரன்',16],['செவ்வாய்',6],['புதன்',8],['குரு',10],['சுக்கிரன்',12],['சனி',1]
  ]:[
    ['Sun',30],['Moon',16],['Mars',6],['Mercury',8],['Jupiter',10],['Venus',12],['Saturn',1]
  ];
  const induSteps=ta?[
    'லக்னத்திலிருந்து 9-ம் அதிபதியையும், சந்திரனிலிருந்து 9-ம் அதிபதியையும் எடுத்துக்கொள்ளவும்.',
    'இந்த இரண்டு கிரகங்களின் கலா (Kalas) / root numbers-ஐ கூட்டவும்.',
    'மொத்தத்தை 12-ஆல் வகுக்கவும்.',
    'கிடைக்கும் மீதியை சந்திர லக்னத்திலிருந்து எண்ணவும். அதுவே இந்து லக்னம் (தன லக்னம்).',
    'மீதி 0 என்றால் சந்திரனிலிருந்து 12-ம் ராசியை இந்து லக்னமாக எடுத்துக்கொள்ளவும்.'
  ]:[
    'Take the lords of the 9th from Lagna and from the Moon.',
    'Add the Kala/root numbers of these two planets.',
    'Divide the total by 12.',
    'Count the remainder from Chandra Lagna (the natal Moon sign). That sign is Indu Lagna (Dhana Lagna).',
    'When the remainder is 0, take the 12th sign from the Moon as Indu Lagna.'
  ];
  const induResults=ta?[
    'இந்து லக்னத்தில் குரு, சுக்கிரன், புதன் போன்ற சுப கிரகங்கள் இருப்பது அல்லது பார்ப்பது — மிகுந்த செல்வ வளம்.',
    'குரு, சுக்கிரன் அல்லது புதன் இந்து லக்னத்தைப் பார்த்து, எந்த பாப கிரகத் தொடர்பும் இல்லாவிட்டால் — மிதமான செல்வ வளம்.',
    'இந்து லக்னத்தில் பாப கிரகங்கள் மட்டும் இருந்தால் — மிதமான செல்வ வளம்.',
    'பாப கிரகம் உச்சத்தில் இருந்தால் — ஆரம்பத்தில் மிதமான செல்வம்; பின்னர் வாழ்க்கையில் கணிசமான செல்வம்.',
    'இந்து லக்னத்தில் சுபமும் பாபமும் சேர்ந்திருந்தால், அல்லது அத்தகைய பார்வை இருந்தால் — மிதமான செல்வ வளம்.'
  ]:[
    'Benefics such as Jupiter, Venus and Mercury occupying or aspecting Indu Lagna indicate very high wealth.',
    'If Jupiter, Venus or Mercury aspect Indu Lagna and there is no malefic influence by aspect or conjunction, wealth is moderate.',
    'If only malefics occupy Indu Lagna, wealth is moderate.',
    'If the malefic is exalted, wealth may be moderate in the beginning but considerable later in life.',
    'If a benefic and a malefic occupy or aspect Indu Lagna, wealth is moderate.'
  ];
  return {items,method:'',induKalas,induSteps,induResults,sunrise:{source:'Swiss Ephemeris solar-rise reference using the same local date/location/UTC offset; previous sunrise is used for a pre-sunrise birth.',date:ref.sunriseDate,minutes:ref.sunriseMinutes,sunLongitudeAtSunrise:Number(sunRise.toFixed(8)),elapsedMinutes:Number(elapsed.toFixed(4))},indu:{ninthLords:lords9,kalaValues:lords9.map(x=>INDU_KALA[x]||0),kalaSum,kalaRemainder:induRemainder,moonSign:moonSign,resultSign:induSign,offset:induOffset},varnada:{sign:varnada},pranapada:{longitude:pranapada},arudha:{A1:al?.sign??null,A12:ul?.sign??null},karakamsha:{sign:karakamshaSign,atmakaraka:ak?.name||null}};
}
function v5weekday(date){const d=new Date(String(date||'')+'T00:00:00Z');return Number.isNaN(d.getTime())?0:d.getUTCDay();}
function v5parseTime(t){const m=String(t||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])+Number(m[2])/60:12;}
function upagrahas(chart,lang){
 const ta=lang!=='en';
 const sun=Number(v5planet(chart,'சூரியன்')?.longitude);
 if(!Number.isFinite(sun)) return {error:ta?'சூரியன் நீளவியல் தரவு இல்லை.':'Sun longitude is unavailable.'};
 const normLon=x=>((x%360)+360)%360;
 // Classical solar-derived Upagrahas: Dhooma, Vyatipata, Parivesha, Indrachapa and Upaketu.
 const specs=[
   ['Dhooma','தூம',sun+133+20/60],
   ['Vyatipata','வ்யதீபாத',360-(sun+133+20/60)],
   ['Parivesha','பரிவேஷ',360-(360-(sun+133+20/60))+180],
   ['Indrachapa','இந்திரசாப',360-(360-(sun+133+20/60)+180)],
   ['Upaketu','உபகேது',360-(360-(360-(sun+133+20/60)+180))+30]
 ];
 const rows=specs.map(([en,taName,lon])=>{
   const L=normLon(lon), ri=rasi(L), ni=Math.floor(L/(360/27)), within=L%(360/27), pada=Math.floor(within/((360/27)/4))+1;
   return {name:ta?taName:en,englishName:en,longitude:Number(L.toFixed(8)),rasi:signName(ri,lang),degree:Math.floor(L%30)+'°',nakshatra:lang==='en'?NAK_EN[ni]:NAK[ni],pada};
 });
 return {items:rows,method:''};
}

function jaimini(chart,lang){
 const ta=lang!=='en', ps=(chart.planets||[]).filter(p=>P7.includes(p.name));
 const ranked=ps.map(p=>({planet:p.name,degreeInSign:degIn(p.longitude),degreeInSignDms:dms(degIn(p.longitude)),rasi:signName(rasi(p.longitude),lang),longitude:p.longitude})).sort((a,b)=>b.degreeInSign-a.degreeInSign);
 const karakaNames=ta?['ஆத்மகாரக','அமாத்யகாரக','ப்ராத்ருகாரக','மாத்ருகாரக','புத்ரகாரக','ஞாதிகாரக','தாரகாரக']:['Atmakaraka','Amatyakaraka','Bhratrukaraka','Matrukaraka','Putrakaraka','Gnatikaraka','Darakaraka'];
 return {charaKarakas:ranked.map((x,i)=>({...x,degreeInSignDms:dms(x.degreeInSign),karaka:karakaNames[i]})),karakamsha:ranked[0]?ranked[0].rasi:'—',arudhaLagna:signName(norm(rasi(chart.lagna?.longitude||0)+Math.max(1,Math.abs(rasi(chart.lagna?.longitude||0)-rasi(v5planet(chart,'சூரியன்').longitude||0)))),lang),method:ta?'ஜைமினி சர காரக வரிசை மற்றும் முக்கிய ராசி குறிப்புகள்.':'Jaimini framework: Chara Karaka ranking and key rasi reference points.'};
}
function sodhyaPinda(chart,lang){
 const ta=lang!=='en', av=ashtakavarga(chart,lang), signs=av.sarva||Array(12).fill(0), pinda=signs.map((b,i)=>({rasi:signName(i,lang),bindus:b,signPinda:b*(i+1)}));
 const total=pinda.reduce((a,x)=>a+x.signPinda,0); const graha=(av.bhinna||[]).map(x=>({planet:ta?x.planet:(LORD_EN[x.planet]||x.planet),bindus:x.total,pinda:x.total*(rasi(v5planet(chart,x.planet).longitude||0)+1)}));
 return {rasiPinda:pinda,grahaPinda:graha,total,benefits:ta?'சர்வாஷ்டகவர்க்க பிந்துக்களின் ஒப்பீட்டு வலிமை/பலன் குறிப்பு.':'Comparative strength/benefit indicators derived from SAV bindu distribution.',method:'Sodhya Pinda presentation using the calculated SAV distribution; tradition-specific weighting should be verified against the chosen classical school.'};
}
function sahams(chart,lang){
 const ta=lang!=='en'; const ascLon=Number(chart?.lagna?.longitude||0); const pm=planetMap(chart); const day=solarDayNight(chart);
 const pl=n=>Number(pm[n]?.longitude); const house=h=>Number(chart?.bhavas?.[h-1]?.longitude ?? norm(ascLon+h-1));
 const signLord=(lon)=>{const s=rasi(lon); for(const [k,rs] of Object.entries(own)) if(rs.includes(s)) return k; return null;};
 const lordHouse=h=>{const l=signLord(house(h)); return pl(l);};
 const sunSignLord=signLord(pl('சூரியன்')); const moonSignLord=signLord(pl('சந்திரன்'));
 const between=(B,A,C)=>{B=normLon(B);A=normLon(A);C=normLon(C); const span=normLon(A-B); const pos=normLon(C-B); return pos<=span;};
 const calc=(name,A,B,C,opts={})=>{A=Number(A);B=Number(B);C=Number(C); if(![A,B,C].every(Number.isFinite)) return {name,longitude:null,rasi:'—',degree:'—',degreeDms:'—'}; let aa=A,bb=B; if(!day && !opts.sameDayNight){aa=B;bb=A;} let lon=normLon(aa-bb+C); if(!between(bb,aa,C)) lon=normLon(lon+30); return {name,longitude:Number(lon.toFixed(8)),rasi:signName(rasi(lon),lang),degree:Math.floor(degIn(lon))+'°',degreeDms:dms(degIn(lon)),longitudeDms:lonDms(lon)};};
 const L=(n)=>pl(n); const lagnaLord=signLord(ascLon); const specs=[];
 const add=(name,a,b,c,same=false)=>specs.push(calc(ta?name.ta:name.en,a,b,c,{sameDayNight:same}));
 add({en:'Punya Saham',ta:'புண்ய சஹம்'},L('சந்திரன்'),L('சூரியன்'),ascLon);
 add({en:'Vidya Saham',ta:'வித்யா சஹம்'},L('சூரியன்'),L('சந்திரன்'),ascLon);
 const punya=()=>specs[0]?.longitude; add({en:'Yasas Saham',ta:'யசஸ் சஹம்'},L('குரு'),punya(),ascLon); add({en:'Mitra Saham',ta:'மித்ர சஹம்'},L('குரு'),punya(),L('சுக்கிரன்')); add({en:'Mahatmya Saham',ta:'மஹாத்ம்ய சஹம்'},punya(),L('செவ்வாய்'),ascLon); add({en:'Asha Saham',ta:'ஆசா சஹம்'},L('சனி'),L('செவ்வாய்'),ascLon);
 const samA=lagnaLord==='செவ்வாய்'?L('குரு'):L('செவ்வாய்'); const samB=lagnaLord==='செவ்வாய்'?L('செவ்வாய்'):L(lagnaLord); add({en:'Samartha Saham',ta:'ஸமர்த்த சஹம்'},samA,samB,ascLon);
 add({en:'Bhratri Saham',ta:'ப்ராத்ரி சஹம்'},L('குரு'),L('சனி'),ascLon,true); add({en:'Gaurava Saham',ta:'கௌரவ சஹம்'},L('குரு'),L('சந்திரன்'),L('சூரியன்')); add({en:'Pitri Saham',ta:'பித்ரு சஹம்'},L('சனி'),L('சூரியன்'),ascLon); add({en:'Rajya Saham',ta:'ராஜ்ய சஹம்'},L('சனி'),L('சூரியன்'),ascLon); add({en:'Matri Saham',ta:'மாத்ரி சஹம்'},L('சந்திரன்'),L('சுக்கிரன்'),ascLon); add({en:'Putra Saham',ta:'புத்ர சஹம்'},L('குரு'),L('சந்திரன்'),ascLon); add({en:'Jeeva Saham',ta:'ஜீவ சஹம்'},L('சனி'),L('குரு'),ascLon); add({en:'Karma Saham',ta:'கர்ம சஹம்'},L('செவ்வாய்'),L('புதன்'),ascLon); add({en:'Roga Saham',ta:'ரோக சஹம்'},ascLon,L('சந்திரன்'),ascLon); add({en:'Kali Saham',ta:'கலி சஹம்'},L('குரு'),L('செவ்வாய்'),ascLon); add({en:'Sastra Saham',ta:'சாஸ்திர சஹம்'},L('குரு'),L('சனி'),L('புதன்')); add({en:'Bandhu Saham',ta:'பந்து சஹம்'},L('புதன்'),L('சந்திரன்'),ascLon); add({en:'Mrityu Saham',ta:'ம்ருத்யு சஹம்'},house(8),L('சந்திரன்'),ascLon,true); add({en:'Paradesa Saham',ta:'பரதேச சஹம்'},house(9),lordHouse(9),ascLon,true); add({en:'Artha Saham',ta:'அர்த்த சஹம்'},house(2),lordHouse(2),ascLon,true); add({en:'Paradara Saham',ta:'பரதார சஹம்'},L('சுக்கிரன்'),L('சூரியன்'),ascLon); add({en:'Vanik Saham',ta:'வணிக் சஹம்'},L('சந்திரன்'),L('புதன்'),ascLon);
 const sunSign=pl('சூரியன்'), moonSign=pl('சந்திரன்'); const lordSun=pl(sunSignLord), lordMoon=pl(moonSignLord); add({en:'Karyasiddhi Saham',ta:'கார்யசித்தி சஹம்'},L('சனி'),day?L('சூரியன்'):L('சந்திரன்'),day?lordSun:lordMoon); add({en:'Vivaha Saham',ta:'விவாஹ சஹம்'},L('சுக்கிரன்'),L('சனி'),ascLon); add({en:'Santapa Saham',ta:'ஸந்தாப சஹம்'},L('சனி'),L('சந்திரன்'),house(6)); add({en:'Sraddha Saham',ta:'ஸ்ரத்தா சஹம்'},L('சுக்கிரன்'),L('செவ்வாய்'),ascLon);
 const sastra=specs.find(x=>x.name===(ta?'சாஸ்திர சஹம்':'Sastra Saham'))?.longitude; add({en:'Preeti Saham',ta:'ப்ரீதி சஹம்'},sastra,punya(),ascLon); add({en:'Jadya Saham',ta:'ஜாட்ய சஹம்'},L('செவ்வாய்'),L('சனி'),L('புதன்')); add({en:'Vyapara Saham',ta:'வ்யாபார சஹம்'},L('செவ்வாய்'),L('சனி'),ascLon,true); add({en:'Satru Saham',ta:'சத்ரு சஹம்'},L('செவ்வாய்'),L('சனி'),ascLon); add({en:'Jalapatana Saham',ta:'ஜலபாதன சஹம்'},norm(3*30+15),L('சனி'),ascLon); add({en:'Bandhana Saham',ta:'பந்தன சஹம்'},punya(),L('சனி'),ascLon); add({en:'Apamrityu Saham',ta:'அபம்ருத்யு சஹம்'},house(8),L('செவ்வாய்'),ascLon); add({en:'Labha Saham',ta:'லாப சஹம்'},house(11),lordHouse(11),ascLon,true);
 return {items:specs,daytime:day,referenceRasis:{asc:signName(rasi(ascLon),lang),sun:signName(rasi(sunSign),lang),moon:signName(rasi(moonSign),lang)},method:ta?'பாடநூலின் Table 74-ல் கொடுக்கப்பட்ட 36 முக்கிய சஹம்கள்; A−B+C விதி, பகல்/இரவு மாற்றம் மற்றும் தேவையான இடங்களில் 30° correction பயன்படுத்தப்படுகிறது.':'36 important Sahams from textbook Table 74 using the A−B+C rule, day/night reversal and the prescribed 30° correction where applicable.'};
}
function tajaka(chart,lang){
 const ta=lang!=='en'; const A=chart?.tajakaAnnual||chart; const natal=chart?.tajakaAnnual?chart:chart; const pm=planetMap(A),asc=Number(A?.lagna?.longitude||0),natalAsc=Number(natal?.lagna?.longitude||asc);
 const pnames=['சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']; const lons=n=>Number(pm[n]?.longitude); const speedOrder=['சனி','ராகு','கேது','குரு','செவ்வாய்','சூரியன்','சுக்கிரன்','புதன்','சந்திரன்']; const orb={'சூரியன்':15,'சந்திரன்':12,'செவ்வாய்':8,'புதன்':7,'குரு':9,'சுக்கிரன்':7,'சனி':9}; const lordNames=['சூரியன்','சுக்கிரன்','புதன்','சந்திரன்','சூரியன்','புதன்','சுக்கிரன்','செவ்வாய்','குரு','சனி','சனி','குரு'];
 const H=n=>pm[n]?norm(rasi(pm[n].longitude)-rasi(asc)+1):null; const S=n=>pm[n]?rasi(pm[n].longitude):null; const adv=n=>Number.isFinite(Number(pm[n]?.longitude))?degIn(pm[n].longitude):NaN; const st=n=>{const q=pm[n]?.strength||{};return{strong:!!(q.ownSign||q.exalted),weak:!!(q.debilitated||q.combustion),retro:!!q.retrograde};};
 const aspect=(a,b)=>{const pa=pm[a],pb=pm[b];if(!pa||!pb)return null;const diff=Math.abs(((pa.longitude-pb.longitude+540)%360)-180);let best=null;for(const t of [{n:'Semi-sextile',a:30},{n:'Sextile',a:60},{n:'Square',a:90},{n:'Trine',a:120},{n:'Opposition',a:180}]){const delta=Math.abs(diff-t.a),allow=Math.min(orb[a]||7,orb[b]||7);if(delta<=allow&&(!best||delta<best.delta))best={type:t.n,delta};}return best;};
 const faster=(a,b)=>speedOrder.indexOf(a)<speedOrder.indexOf(b); const ith=(a,b)=>{if(!aspect(a,b))return false;const fa=faster(a,b)?a:b,sl=fa===a?b:a,aa=adv(fa),bb=adv(sl);return Number.isFinite(aa)&&Number.isFinite(bb)&&(st(fa).retro?aa>bb:aa<bb);};
 const pairs=[];for(let i=0;i<pnames.length;i++)for(let j=i+1;j<pnames.length;j++){const a=pnames[i],b=pnames[j],as=aspect(a,b);if(as)pairs.push({a,b,aspect:as.type,ithasala:ith(a,b),eesarpha:!ith(a,b),aDegree:adv(a),bDegree:adv(b)});}
 const bd=String(natal?.birth?.date||'');const ay=Number(A?.tajakaReturn?.targetYear||new Date().getFullYear());const by=Number(bd.slice(0,4));const age=Math.max(0,ay-by);const munthaSign=norm(rasi(natalAsc)+age);const munthaHouse=norm(munthaSign-rasi(asc)+1);const trDay=['சூரியன்','சுக்கிரன்','சனி','சுக்கிரன்','குரு','சந்திரன்','புதன்','செவ்வாய்','சனி','செவ்வாய்','குரு','சந்திரன்'];const trNight=['குரு','சந்திரன்','புதன்','செவ்வாய்','சூரியன்','சுக்கிரன்','சனி','சுக்கிரன்','சனி','செவ்வாய்','குரு','சந்திரன்'];const day=solarDayNight(A),trLord=(day?trDay:trNight)[rasi(asc)];
 const candidates=[lordNames[rasi(lons('சூரியன்'))],lordNames[rasi(lons('சந்திரன்'))],lordNames[munthaSign],lordNames[rasi(asc)],trLord].filter(Boolean);const unique=[...new Set(candidates)];
 const yogas=[];const add=(name,c,reason,meaning)=>{if(c)yogas.push({name:ta?name.ta:name.en,reason:ta?reason.ta:reason.en,meaning:ta?meaning.ta:meaning.en});};const allIn=hs=>pnames.every(n=>hs.includes(H(n)));
 add({en:'Ishkavala Yoga',ta:'இஷ்கவல யோகம்'},allIn([1,2,4,5,7,8,10,11]),{en:'All planets are in kendras/panapharas and apoklimas are empty.',ta:'அனைத்து கிரகங்களும் கேந்திர/பணபரங்களில்; அபோக்ளிமங்கள் காலியாக உள்ளன.'},{en:'Wealth, happiness and good fortune.',ta:'செல்வம், மகிழ்ச்சி மற்றும் நல்ல அதிர்ஷ்டம்.'});
 add({en:'Induvara Yoga',ta:'இந்துவர யோகம்'},allIn([3,6,9,12]),{en:'All planets are in apoklimas.',ta:'அனைத்து கிரகங்களும் அபோக்ளிமங்களில் உள்ளன.'},{en:'Disappointments, worries and illness indications.',ta:'ஏமாற்றம், கவலை மற்றும் உடல்நல சிரமக் குறிப்பு.'});
 pairs.filter(x=>x.ithasala).forEach(x=>add({en:'Ithasala Yoga',ta:'இத்தசால யோகம்'},true,{en:`${x.a} + ${x.b} — applying ${x.aspect}.`,ta:`${x.a} + ${x.b} — applying ${x.aspect}.`},{en:'Fulfillment of matters represented by the planets.',ta:'சம்பந்தப்பட்ட விஷயங்கள் நிறைவேறும் என்ற குறிப்பு.'}));
 pairs.filter(x=>x.eesarpha).forEach(x=>add({en:'Eesarpha Yoga',ta:'ஈஸர்ப யோகம்'},true,{en:`${x.a} + ${x.b} — separating ${x.aspect}.`,ta:`${x.a} + ${x.b} — separating ${x.aspect}.`},{en:'Failures and disappointments.',ta:'தோல்வி மற்றும் ஏமாற்றம்.'}));
 for(const x of pairs.filter(p=>!p.ithasala&&!p.eesarpha))for(const c of pnames)if(c!==x.a&&c!==x.b&&ith(c,x.a)&&ith(c,x.b)){add({en:'Nakta Yoga',ta:'நக்த யோகம்'},true,{en:`${c} connects ${x.a} and ${x.b} through applying aspects.`,ta:`${c}, ${x.a} மற்றும் ${x.b}-ஐ applying தொடர்பால் இணைக்கிறது.`},{en:'Fulfillment with help from the third planet.',ta:'மூன்றாவது கிரகத்தின் உதவியுடன் நிறைவேற்றம்.'});break;}
 for(const x of pairs.filter(p=>!p.ithasala&&!p.eesarpha))for(const c of pnames)if(c!==x.a&&c!==x.b&&ith(c,x.a)&&ith(c,x.b)&&!faster(c,x.a)&&!faster(c,x.b)){add({en:'Yamaya Yoga',ta:'யமய யோகம்'},true,{en:`${c} is the slower helper in the relationship.`,ta:`${c} மெதுவான உதவி கிரகமாக உள்ளது.`},{en:'Fulfillment after obstacles or delay.',ta:'தடை/தாமதத்திற்குப் பின் நிறைவேற்றம்.'});break;}
 pairs.filter(x=>x.ithasala).forEach(x=>{const fa=faster(x.a,x.b)?x.a:x.b;if(pnames.some(n=>['செவ்வாய்','சனி'].includes(n)&&S(n)===S(fa)&&Math.abs(adv(n)-adv(fa))<=(orb[fa]||7)))add({en:'Manahoo Yoga',ta:'மனாஹூ யோகம்'},true,{en:'Mars/Saturn conjuncts the faster planet within deeptaamsa.',ta:'செவ்வாய்/சனி வேகமான கிரகத்துடன் தீப்தாம்சத்தில் இணைந்துள்ளது.'},{en:'The Ithasala is cancelled; adverse results are indicated.',ta:'இத்தசால பலன் ரத்து/குறைந்து எதிர்மறை விளைவுகள் குறிக்கப்படுகின்றன.'});});
 pairs.filter(x=>x.ithasala).forEach(x=>{const other=x.a==='சந்திரன்'?x.b:x.b==='சந்திரன்'?x.a:null;if(other&&ith('சந்திரன்',other))add({en:'Kamboola Yoga',ta:'கம்பூல யோகம்'},true,{en:'Moon also forms Ithasala with a planet in the pair.',ta:'ஜோடியில் உள்ள கிரகத்துடன் சந்திரனும் இத்தசாலில் உள்ளது.'},{en:'Adds power to the Ithasala.',ta:'இத்தசாலுக்கு கூடுதல் வலிமை.'});});
 pairs.filter(x=>x.ithasala).forEach(x=>{if(st(x.a).weak||st(x.b).weak)add({en:'Radda Yoga',ta:'ரத்த யோகம்'},true,{en:'Ithasala involves a weak planet.',ta:'இத்தசாலில் பலவீனமான கிரகம் உள்ளது.'},{en:'Ithasala is negated.',ta:'இத்தசால பலன் குறைகிறது.'});});
 pairs.filter(x=>x.ithasala).forEach(x=>{const fa=faster(x.a,x.b)?x.a:x.b,sl=fa===x.a?x.b:x.a;if(st(fa).strong&&!st(sl).strong)add({en:'Duhphali-Kutta Yoga',ta:'துஃபலீ-குத்த யோகம்'},true,{en:`Faster planet ${fa} is strong and slower planet ${sl} is weak.`,ta:`வேகமான ${fa} வலுவாகவும் மெதுவான ${sl} பலவீனமாகவும் உள்ளது.`},{en:'Realization of ambitions and dreams.',ta:'ஆசைகள் மற்றும் கனவுகள் நிறைவேறும் குறிப்பு.'});});
 const harsha=pnames.map(n=>{let u=0,h=H(n);const pres={சூரியன்:9,சந்திரன்:3,செவ்வாய்:6,புதன்:1,குரு:11,சுக்கிரன்:5,சனி:12};if(h===pres[n])u+=5;if(st(n).strong)u+=5;const fem=['சந்திரன்','புதன்','சுக்கிரன்','சனி'].includes(n);if((fem&&[1,2,3,7,8,9].includes(h))||(!fem&&[4,5,6,10,11,12].includes(h)))u+=5;if(day&&!fem)u+=5;if(!day&&fem)u+=5;return{planet:n,units:u};});
 return {returnInfo:A?.tajakaReturn||null,muntha:{rasi:signName(munthaSign,lang),house:munthaHouse,degree:degIn(natalAsc)+'°'},yearLord:unique[0]||'—',candidates:unique,trirasiLord:trLord,harshaBala:harsha,aspects:pairs,yogas,annualDasas:{patyayini:patyayiniAnnual(A,lang)},method:''};
}
function patyayiniAnnual(a,lang='ta'){const ta=lang!=='en'; const names=ta?['லக்னம்','சூரியன்','சந்திரன்','செவ்வாய்','புதன்','குரு','சுக்கிரன்','சனி']:['Lagna','Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];const canonical={Lagna:'லக்னம்',Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி'}; const map={'லக்னம்':a.lagna,...Object.fromEntries((a.planets||[]).map(p=>[p.name,p]))}; if(lang==='en'){for(const [en,taName] of Object.entries(canonical)){if(map[taName])map[en]=map[taName];}}const rows=names.map(n=>{const p=map[n];return{name:n,krisamsa:Number.isFinite(Number(p?.longitude))?degIn(p.longitude):NaN};}).filter(x=>Number.isFinite(x.krisamsa)).sort((a,b)=>a.krisamsa-b.krisamsa);let prev=0;rows.forEach((x,i)=>{x.patyamsa=i?x.krisamsa-prev:x.krisamsa;prev=x.krisamsa;});const total=rows.at(-1)?.krisamsa||1;let cur=new Date(String(a.tajakaReturn?.returnDate||a.birth?.date)+'T00:00:00Z');return rows.map(x=>{const days=365.2425*x.patyamsa/total,st=new Date(cur),en=new Date(cur.getTime()+days*86400000);cur=en;return{name:x.name,krisamsa:dms(x.krisamsa),patyamsa:dms(x.patyamsa),days:Number(days.toFixed(3)),start:st.toISOString().slice(0,10),end:en.toISOString().slice(0,10)};});}


// Part 1 Chart Analysis: expose the existing classical reference calculations
// to the frontend renderer. This is additive; core horoscope calculations are untouched.
function phase1ChartAnalysis(chart,lang='ta'){
  const ta=lang!=='en';
  const pm=planetMap(chart);
  const planets=Array.isArray(chart?.planets)?chart.planets:[];
  const names=ALL;
  const signLabel=s=>signName(norm(s),lang);
  const occupied=(s)=>planets.filter(p=>Number.isFinite(Number(p.longitude))&&rasi(p.longitude)===norm(s));
  const lordFor=s=>phase1LordForSign(norm(s),chart);
  const padaFor=(sourceSign)=>specialArudhaSign(sourceSign,chart);
  const arudhaItems=[];
  for(let h=1;h<=12;h++){
    const source=norm(rasi(chart?.lagna?.longitude||0)+h-1);
    const a=padaFor(source);
    arudhaItems.push({house:h,name:ta?`A${h} ஆரூடம்`:`A${h}`,sourceSign:signLabel(source),lord:a?.lord||'—',lordSign:a?signLabel(a.lordSign):'—',rasi:a?signLabel(a.sign):'—'});
  }
  const grahaArudhaItems=names.map(n=>{
    const p=pm[n]; if(!p||!Number.isFinite(Number(p.longitude))) return {planet:ta?(LORD_TA[n]||n):n,sourceSign:'—',lord:'—',arudha:'—'};
    const source=rasi(p.longitude), a=padaFor(source);
    return {planet:ta?(LORD_TA[n]||n):n,sourceSign:signLabel(source),lord:a?.lord||'—',arudha:a?signLabel(a.sign):'—'};
  });
  // Graha Drishti: 7th for all planets; Mars 4/8, Jupiter 5/9, Saturn 3/10.
  const grahaDrishtiItems=names.map(n=>{
    const p=pm[n]; if(!p||!Number.isFinite(Number(p.longitude))) return {planet:ta?(LORD_TA[n]||n):n,from:'—',aspects:[]};
    const s=rasi(p.longitude), offs=[7];
    if(n==='செவ்வாய்') offs.push(4,8);
    if(n==='குரு') offs.push(5,9);
    if(n==='சனி') offs.push(3,10);
    return {planet:ta?(LORD_TA[n]||n):n,from:signLabel(s),aspects:offs.map(o=>({house:o,rasi:signLabel(norm(s+o-1))}))};
  });
  // Jaimini Rasi Drishti: movable signs aspect fixed signs (except adjacent fixed),
  // fixed signs aspect movable signs (except adjacent movable), dual signs aspect other dual signs.
  const rasiDrishtiItems=names.map(n=>{
    const p=pm[n]; if(!p||!Number.isFinite(Number(p.longitude))) return {planet:ta?(LORD_TA[n]||n):n,from:'—',type:'—',aspects:[]};
    const s=rasi(p.longitude), group=s%3;
    let targets=[];
    if(group===0) targets=[1,4,7,10].filter(x=>x!==norm(s+1));
    else if(group===1) targets=[0,3,6,9].filter(x=>x!==norm(s-1));
    else targets=[2,5,8,11].filter(x=>x!==s);
    return {planet:ta?(LORD_TA[n]||n):n,from:signLabel(s),type:group===0?(ta?'சர ராசி':'Movable'):group===1?(ta?'ஸ்திர ராசி':'Fixed'):(ta?'உபய ராசி':'Dual'),aspects:targets.map(signLabel)};
  });
  const argalaItems=[];
  for(let s=0;s<12;s++){
    const src=[2,4,11].map(pos=>norm(s+pos-1));
    const blocks=[12,10,3].map(pos=>norm(s+pos-1));
    argalaItems.push({targetSign:signLabel(s),argala:src.map((x,i)=>({position:[2,4,11][i],sourceSign:signLabel(x),planets:occupied(x).map(p=>ta?(LORD_TA[p.name]||p.name):p.name)})).filter(x=>x.planets.length),virodhargala:blocks.map((x,i)=>({blocksPosition:[12,10,3][i],sourceSign:signLabel(x),planets:occupied(x).map(p=>ta?(LORD_TA[p.name]||p.name):p.name)})).filter(x=>x.planets.length),ketuReversed:false});
  }
  return {
    arudhas:{items:arudhaItems,method:''},
    grahaArudhas:{items:grahaArudhaItems,method:''},
    grahaDrishti:{items:grahaDrishtiItems,method:''},
    rasiDrishti:{items:rasiDrishtiItems,method:''},
    argala:{items:argalaItems,method:''}
  };
}

function v5Extras(chart,lang){
 const safe=(fn)=>{try{return fn()}catch(e){return {error:String(e?.message||e)}}};
 return {phase1:safe(()=>Object.assign({specialLagnas:phase1SpecialLagnas(chart,lang)},phase1ChartAnalysis(chart,lang))),upagrahas:safe(()=>upagrahas(chart,lang)),bookUpagrahas:chart?.upagrahas||null,jaimini:safe(()=>jaimini(chart,lang)),sodhyaPinda:safe(()=>sodhyaPinda(chart,lang)),sahams:safe(()=>sahams(chart,lang)),kalaChakraDasa:safe(()=>kalaChakraDasa(chart,lang))};
}


// Yoga Engine + stronger Jaimini/Karakamsa reporting.
function p2Pos(chart,name){const p=v5planet(chart,name);return p&&Number.isFinite(Number(p.longitude))?p:null;}
function p2Sign(chart,name){const p=p2Pos(chart,name);return p?rasi(p.longitude):null;}
function p2House(chart,name,asc){const s=p2Sign(chart,name);return s==null?null:norm(s-asc+1);}
function p2Lord(chart,house,asc){return phase1LordForSign(norm(asc+house-1),chart);}
function p2PlanetAtHouse(chart,name,house,asc){return p2House(chart,name,asc)===house;}
function p2AnyAtHouse(chart,house,asc,names){return names.some(n=>p2PlanetAtHouse(chart,n,house,asc));}
function p2AllAtHouses(chart,houses,asc,names){return names.every(n=>houses.includes(p2House(chart,n,asc)));}
function p2KendraFrom(a,b){return [1,4,7,10].includes(norm(b-a+1));}
function p2TrineFrom(a,b){return [1,5,9].includes(norm(b-a+1));}
function p2Strength(chart,name){const s=p2Sign(chart,name); if(s==null)return false; return (own[name]||[]).includes(s)||exalt[name]===s;}
function p2TogetherOrOpp(chart,a,b){const x=p2Sign(chart,a),y=p2Sign(chart,b);return x!=null&&y!=null&&([0,6].includes(norm(y-x)));}
function p2Yoga(name,category,condition,reason,en,ta){return condition?{name:ta?name.ta:name.en,category,matched:true,reason:ta?reason.ta:reason.en,meaning:ta?en.ta:en.en}:null;}
function p2YogaEngine(chart,lang){
 const ta=lang!=='en', asc=rasi(chart?.lagna?.longitude||0), ps=chart.planets||[], pm=planetMap(chart);
 const H=n=>p2House(chart,n,asc), S=n=>p2Sign(chart,n), lord=h=>p2Lord(chart,h,asc), ls=h=>{const q=lord(h);return q?S(q):null};
 const benef=['சந்திரன்','புதன்','குரு','சுக்கிரன்']; const malef=['சூரியன்','செவ்வாய்','சனி','ராகு','கேது'];
 const p2JupiterStrong=()=>{const p=p2Pos(chart,'குரு'),s=p?.strength||{};return !!p&&!s.debilitated&&!s.combustion&&(s.ownSign||s.exalted||s.relationship==='நட்பு');};
 const out=[]; const add=(n,cat,c,r,e,t)=>{ if(c&&typeof c==='object'){t=e;e=r;r=c;c=Boolean(ta?c.ta:c.en);} if(c)out.push({name:typeof n==='string'?n:(ta?n.ta:n.en),category:cat,matched:true,reason:ta?(r?.ta??r?.en??''): (r?.en??r?.ta??''),meaning:ta?((t??e)?.ta??(t??e)?.en??''):((t??e)?.en??(t??e)?.ta??'')}); };
 // PDF Naabhasa/Sankhya: seven classical planets only.
 const seven=P7.map(n=>S(n)).filter(x=>x!=null), distinct=new Set(seven).size;
 const sank={7:'Veenaa Yoga',6:'Daama Yoga',5:'Paasa Yoga',4:'Kedaara Yoga',3:'Soola Yoga',2:'Yuga Yoga',1:'Gola Yoga'};
 if(sank[distinct]) add(sank[distinct], 'Naabhasa / Sankhya', true,{en:`Seven classical planets occupy exactly ${distinct} distinct signs.`,ta:`ஏழு பாரம்பரிய கிரகங்கள் ${distinct} தனித்த ராசிகளில் உள்ளன.`},{en:'Sankhya Yoga classification from the supplied textbook.',ta:'வழங்கப்பட்ட பாடநூலின் Sankhya Yoga வகைப்பாடு.'},{en:'Classical Sankhya classification; interpret with the other chart factors.',ta:'பிற ஜாதக காரணிகளுடன் இணைத்து விளக்க வேண்டிய பாரம்பரிய Sankhya வகைப்பாடு.'});
 // Other popular yogas explicitly defined in the PDF.
 add('Subha Yoga','Protective',{en:(p2AnyAtHouse(chart,1,asc,benef)|| (p2AnyAtHouse(chart,12,asc,benef)&&p2AnyAtHouse(chart,2,asc,benef))),ta:(p2AnyAtHouse(chart,1,asc,benef)|| (p2AnyAtHouse(chart,12,asc,benef)&&p2AnyAtHouse(chart,2,asc,benef)))},{en:'Benefic in Lagna or benefics in 12th and 2nd.',ta:'லக்னத்தில் சுப கிரகம் அல்லது 12/2-ல் சுப கிரகங்கள்.'},{en:'Eloquence, good looks and character.',ta:'பேச்சுத்திறன், நல்ல தோற்றம், நற்குணம்.'});
 add('Asubha Yoga','Protective',{en:(p2AnyAtHouse(chart,1,asc,malef)|| (p2AnyAtHouse(chart,12,asc,malef)&&p2AnyAtHouse(chart,2,asc,malef))),ta:(p2AnyAtHouse(chart,1,asc,malef)|| (p2AnyAtHouse(chart,12,asc,malef)&&p2AnyAtHouse(chart,2,asc,malef)))},{en:'Malefic in Lagna or malefics in 12th and 2nd.',ta:'லக்னத்தில் பாப கிரகம் அல்லது 12/2-ல் பாப கிரகங்கள்.'},{en:'A cautionary kartari pattern.',ta:'கவனிக்க வேண்டிய கார்த்தரி அமைப்பு.'});
 const moon=S('சந்திரன்'), jup=S('குரு');
 const beneficSupports=(target)=>['சந்திரன்','புதன்','குரு','சுக்கிரன்'].some(n=>{if(n==='குரு')return false;const a=S(n),b=S(target);if(a==null||b==null)return false;const d=norm(b-a+1);return a===b||d===7||(n==='செவ்வாய்'&&[4,8].includes(d))||(n==='குரு'&&[5,9].includes(d))||(n==='சனி'&&[3,10].includes(d));});
 add('Gaja-Kesari Yoga','Popular',{en:jup!=null&&moon!=null&&p2KendraFrom(moon,jup)&&p2JupiterStrong()&&beneficSupports('குரு') ,ta:jup!=null&&moon!=null&&p2KendraFrom(moon,jup)&&p2JupiterStrong()&&p2AnyAtHouse(chart,H('குரு'),asc,['சுக்கிரன்','புதன்','சந்திரன்'])},{en:'Jupiter is in a quadrant from Moon and is strong with benefic support.',ta:'சந்திரனிலிருந்து கேந்திரத்தில் வலுவான குருவுக்கு சுப ஆதரவு உள்ளது.'},{en:'Fame, wealth, intelligence and character.',ta:'புகழ், செல்வம், அறிவு மற்றும் நற்குணம்.'});
 add('Guru-Mangala Yoga','Popular',p2TogetherOrOpp(chart,'குரு','செவ்வாய்'),{en:'Jupiter and Mars are together or 7th from each other.',ta:'குரு மற்றும் செவ்வாய் சேர்ந்து அல்லது 7-ம் பார்வை உறவில் உள்ளனர்.'},{en:'Righteous and energetic tendencies.',ta:'தர்ம சார்ந்த செயல் மற்றும் ஆற்றல்.'});
 for(const base of ['லக்னம்','சந்திரன்']){const a=base==='லக்னம்'?asc:moon;if(a==null)continue; const tenth=norm(a+9); const onlyBen=ps.filter(p=>rasi(p.longitude)===tenth).every(p=>benef.includes(p.name)); if(ps.some(p=>rasi(p.longitude)===tenth)&&onlyBen)add('Amala Yoga','Popular',true,{en:`Only natural benefics occupy the 10th from ${base==='லக்னம்'?'Lagna':'Moon'}.`,ta:`${base==='லக்னம்'?'லக்னம்':'சந்திரன்'}-இலிருந்து 10-ம் பாவத்தில் சுப கிரகங்கள் மட்டும் உள்ளன.`},{en:'Pure conduct and lasting reputation.',ta:'நல்ல சமூகப் பெயர் மற்றும் தூய நடத்தை.'});}
 // Raja Yoga: quadrant lord associated by conjunction, mutual graha drishti or exchange with trine lord.
 const grahaAspect=(a,b)=>{const sa=S(a),sb=S(b);if(sa==null||sb==null)return false;const d=norm(sb-sa+12)+1;const rev=norm(sa-sb+12)+1;return [7].includes(d)||[7].includes(rev)||(a==='செவ்வாய்'&&[4,8].includes(d))||(b==='செவ்வாய்'&&[4,8].includes(rev))||(a==='குரு'&&[5,9].includes(d))||(b==='குரு'&&[5,9].includes(rev))||(a==='சனி'&&[3,10].includes(d))||(b==='சனி'&&[3,10].includes(rev));};
 for(const q of [1,4,7,10])for(const t of [1,5,9]){const a=lord(q),b=lord(t);if(a&&b&&a!==b&&(S(a)===S(b)||grahaAspect(a,b)|| (S(a)===norm(asc+t-1)&&S(b)===norm(asc+q-1)))) add('Raaja Yoga','Raja Yoga',true,{en:`House ${q} lord ${a} is associated with house ${t} lord ${b}.`,ta:`${q}-ம் பாவ அதிபதி ${a}, ${t}-ம் பாவ அதிபதி ${b}-உடன் தொடர்பில் உள்ளார்.`},{en:'Power and prosperity combination.',ta:'அதிகாரம் மற்றும் வளம் சார்ந்த சேர்க்கை.'});}
 const dh9=lord(9),dh10=lord(10); if(dh9&&dh10&&(S(dh9)===S(dh10)||grahaAspect(dh9,dh10)))add('Dharma-Karmadhipati Yoga','Raja Yoga',true,{en:'9th and 10th lords are associated.',ta:'9 மற்றும் 10-ம் பாவ அதிபதிகள் தொடர்பில் உள்ளனர்.'},{en:'A particularly important Raja Yoga.',ta:'முக்கியமான ராஜயோக அமைப்பு.'});
 const dust=[6,8,12]; if(dust.some(a=>dust.some(b=>a!==b&&ls(a)!=null&&dust.includes(H(ls(a))))))add('Vipareeta Raaja Yoga','Raja Yoga',true,{en:'A dusthana lord occupies another dusthana.',ta:'துஷ்டான அதிபதி மற்றொரு துஷ்டானத்தில் உள்ளது.'},{en:'Success after initial struggle.',ta:'ஆரம்ப சிரமத்திற்குப் பின் முன்னேற்றம்.'});
 if(ls(6)===asc||H(lord(6))===6)add('Harsha Yoga','Special',true,{en:'6th lord occupies the 6th house.',ta:'6-ம் பாவ அதிபதி 6-ம் பாவத்தில்.'},{en:'Strength in dealing with difficulties.',ta:'சிரமங்களை சமாளிக்கும் வலிமை.'});
 if(ls(8)===asc||H(lord(8))===8)add('Sarala Yoga','Special',true,{en:'8th lord occupies the 8th house.',ta:'8-ம் பாவ அதிபதி 8-ம் பாவத்தில்.'},{en:'Fearlessness and resilience.',ta:'அச்சமின்மை மற்றும் தாங்கும் திறன்.'});
 if(ls(12)===asc||H(lord(12))===12)add('Vimala Yoga','Special',true,{en:'12th lord occupies the 12th house.',ta:'12-ம் பாவ அதிபதி 12-ம் பாவத்தில்.'},{en:'Independence and frugality.',ta:'சுயநிலை மற்றும் சிக்கனம்.'});
 const inKendra=s=>[1,4,7,10].includes(H(s)); const inKT=s=>[1,4,5,7,9,10].includes(H(s));
 add('Saraswathi Yoga','Knowledge', ['புதன்','குரு','சுக்கிரன்'].every(n=>inKT(n)||H(n)===2)&&p2JupiterStrong(),{en:'Mercury, Jupiter and Venus occupy kendras/trines/2nd and Jupiter is strong.',ta:'புதன், குரு, சுக்கிரன் கேந்திரம்/திரிகோணம்/2-ல் இருந்து குரு வலுவாக உள்ளது.'},{en:'Learning, skill, intelligence and reputation.',ta:'கல்வி, திறமை, அறிவு மற்றும் புகழ்.'});
 add('Amsaavatara Yoga','Raja Yoga',inKendra('குரு')&&inKendra('சுக்கிரன்')&&H('சனி')!=null&&exalt['சனி']===S('சனி'),{en:'Jupiter and Venus are in quadrants and Saturn is exalted.',ta:'குரு, சுக்கிரன் கேந்திரங்களில்; சனி உச்சத்தில்.'},{en:'Learning, pleasure and high status.',ta:'கல்வி, வளம் மற்றும் உயர்ந்த நிலை.'});
 add('Indra Yoga','Raja Yoga',H(lord(5))===11&&H(lord(11))===5&&H('சந்திரன்')===5,{en:'5th/11th lords exchange and Moon is in 5th.',ta:'5/11 அதிபதிகள் பரிவர்த்தனை செய்து சந்திரன் 5-ல் உள்ளது.'},{en:'Leadership, fame and boldness.',ta:'தலைமை, புகழ் மற்றும் துணிவு.'});
 add('Ravi Yoga','Special',H('சூரியன்')===10&&H(lord(10))===3&&H('சனி')===3,{en:'Sun is in 10th and 10th lord is in 3rd with Saturn.',ta:'சூரியன் 10-ல்; 10-ம் அதிபதி சனியுடன் 3-ல்.'},{en:'Recognition and learned/active expression.',ta:'மரியாதை மற்றும் செயற்பாட்டு திறன்.'});
 add('Bhaaskara Yoga','Special',moon!=null&&S('சூரியன்')!=null&&norm(moon-S('சூரியன்')+12)===11&&norm(S('புதன்')-S('சூரியன்')+12)===2&&[5,9].includes(norm(S('குரு')-moon+12)+1),{en:'Moon 12th from Sun, Mercury 2nd from Sun and Jupiter 5th/9th from Moon.',ta:'சந்திரன் சூரியனுக்கு 12-ம்; புதன் 2-ம்; குரு சந்திரனுக்கு 5/9-ல்.'},{en:'Wealth, learning and refinement.',ta:'செல்வம், கல்வி மற்றும் மேம்பட்ட திறன்.'});
 add('Vasumati Yoga','Wealth', [3,6,10,11].every(h=>ps.filter(p=>H(p.name)===h).every(p=>benef.includes(p.name))&&ps.some(p=>H(p.name)===h)),{en:'Benefics occupy the upachayas.',ta:'உபசய பாவங்களில் சுப கிரகங்கள் உள்ளன.'},{en:'Abundant wealth potential.',ta:'செல்வ வளத்திற்கான சாத்தியம்.'});
 add('Lakshmi Yoga','Wealth',H(lord(9))!=null&&p2Strength(chart,lord(9))&&[1,4,7,10].includes(H(lord(9)))&&p2Strength(chart,lord(1)),{en:'9th lord is strong in own/exaltation and a quadrant; Lagna lord is strong.',ta:'9-ம் அதிபதி ஆட்சி/உச்சத்தில் கேந்திரத்தில்; லக்ன அதிபதி வலுவாக உள்ளது.'},{en:'Prosperity, character and fortune.',ta:'வளம், நற்குணம் மற்றும் அதிர்ஷ்டம்.'});
 // Jaimini: Atmakaraka + Karakamsa, using the existing D9 varga calculation.
 const ranked=P7.map(n=>{const p=p2Pos(chart,n);return p?{planet:n,deg:degIn(p.longitude)}:null}).filter(Boolean).sort((a,b)=>b.deg-a.deg); const ak=ranked[0];
 const d9=buildVargas(chart,'en').find(x=>x.division==='D-9'); let karakamsha=null; if(ak&&d9){const q=d9.planets.find(p=>p.planet===ak.planet);karakamsha=q?.rasi||null;}
 return {items:out,summary:{count:out.length,sevenPlanetDistinctSigns:distinct},charaKarakas:ranked.map((x,i)=>({planet:x.planet,degreeInSign:x.deg,degreeInSignDms:dms(x.deg),karaka:['Atmakaraka','Amatyakaraka','Bhratrukaraka','Matrukaraka','Putrakaraka','Gnatikaraka','Darakaraka'][i]})),karakamsha,method:''};
}
function phase2StrengthAndJaimini(chart,lang){const y=p2YogaEngine(chart,lang);return {yogas:y,charaKarakas:y.charaKarakas,karakamsha:y.karakamsha};}



// Book-based planetary relationships: natural (Naisargika), temporary (Tatkaala), and
// compound/Panchadha relationship. The supplied book defines temporary friends as the
// 2nd, 3rd, 4th, 10th, 11th and 12th signs from a planet; all others are temporary
// enemies, then combines this with the natural relationship using Table 8.
const NAT_REL={
 'சூரியன்':{'சந்திரன்':'friend','செவ்வாய்':'friend','குரு':'friend','புதன்':'neutral','சுக்கிரன்':'enemy','சனி':'enemy'},
 'சந்திரன்':{'சூரியன்':'friend','புதன்':'friend','செவ்வாய்':'neutral','குரு':'neutral','சுக்கிரன்':'neutral','சனி':'neutral'},
 'செவ்வாய்':{'சூரியன்':'friend','சந்திரன்':'friend','குரு':'friend','சுக்கிரன்':'neutral','சனி':'neutral','புதன்':'enemy'},
 'புதன்':{'சூரியன்':'friend','சுக்கிரன்':'friend','செவ்வாய்':'neutral','குரு':'neutral','சனி':'neutral','சந்திரன்':'enemy'},
 'குரு':{'சூரியன்':'friend','சந்திரன்':'friend','செவ்வாய்':'friend','சனி':'neutral','புதன்':'enemy','சுக்கிரன்':'enemy'},
 'சுக்கிரன்':{'புதன்':'friend','சனி':'friend','செவ்வாய்':'neutral','குரு':'neutral','சூரியன்':'enemy','சந்திரன்':'enemy'},
 'சனி':{'புதன்':'friend','சுக்கிரன்':'friend','குரு':'neutral','சூரியன்':'enemy','சந்திரன்':'enemy','செவ்வாய்':'enemy'}
};
const REL_EN={friend:'Friend',neutral:'Neutral',enemy:'Enemy',adhimitra:'Adhimitra',mitra:'Mitra',sama:'Sama',satru:'Satru',adhisatru:'Adhisatru'};
const REL_TA={friend:'நட்பு',neutral:'சமம்',enemy:'பகை',adhimitra:'அதிமித்திரம்',mitra:'மித்திரம்',sama:'சமம்',satru:'சத்ரு',adhisatru:'அதிசத்ரு'};
function planetRelations(chart,lang='ta'){
 const ta=lang!=='en', pm=planetMap(chart), rows=[];
 const names=P7.filter(n=>pm[n]&&Number.isFinite(Number(pm[n].longitude)));
 const tempFriends=[2,3,4,10,11,12];
 for(const a of names){
   const sa=rasi(pm[a].longitude);
   for(const b of names){ if(a===b) continue;
     const sb=rasi(pm[b].longitude); const house=norm(sb-sa+1);
     const temp=tempFriends.includes(house)?'friend':'enemy';
     const natural=NAT_REL[a]?.[b]||'neutral';
     let compound;
     if(natural==='friend'&&temp==='friend')compound='adhimitra';
     else if(natural==='friend'&&temp==='enemy')compound='sama';
     else if(natural==='neutral'&&temp==='friend')compound='mitra';
     else if(natural==='neutral'&&temp==='enemy')compound='satru';
     else if(natural==='enemy'&&temp==='friend')compound='sama';
     else compound='adhisatru';
     rows.push({from:a,to:b,temporary:temp,natural,compound,houseFrom:house});
   }
 }
 return {planets:names,rows,method:''};
}
function bookRemedies(chart,lang='ta'){
 const ta=lang!=='en';
 const rows=[
  ['சூரியன்','Ruby','Gold','Temple service / temple donation','Wheat','Shiva / Rama'],
  ['சந்திரன்','White pearl','Gold','Music institute support / help a fair lady','Rice','Gauri / Lalita / Saraswati / Krishna'],
  ['செவ்வாய்','Red coral','Copper','Physical exercise / support a school gym','Toor daal','Hanuman / Rudra / Kartikeya / Narasimha'],
  ['புதன்','Emerald','Silver / Platinum','Support scholars / seek a scholar’s blessing','Moong daal','Vishnu / Narayana / Buddha'],
  ['குரு','Yellow sapphire','Gold','Respect/support a learned Brahmin or priest','Chick peas','Hayagreeva / Vishnu / Parameswara / Dattatreya / Guru'],
  ['சுக்கிரன்','Diamond','Silver / Platinum','Read poetry / help a poet','Whitish grain','Lakshmi / Parvati'],
  ['சனி','Blue sapphire','Iron / Silver','Physical labour / help manual workers','Sesame seeds','Vishnu / Brahma'],
  ['ராகு','Hessonite (Gomedh)','Silver','Support research / pilgrimage','Black gram daal','Durga / Narasimha'],
  ['கேது','Cat’s eye','Silver','Meditation','—','Ganesha']
 ].map(r=>({planet:r[0],gemstone:r[1],metal:r[2],goodDeed:r[3],grain:r[4],deity:r[5]}));
 const guidance={};
 return {rows,guidance};
}

function advanced(chart,lang='ta'){const c=chart?.tajakaAnnual?{...chart.tajakaAnnual,tajakaNatal:chart}:chart; return {ashtakavarga:ashtakavarga(chart,lang),vargas:buildVargas(chart,lang),avastha:avastha(chart,lang),avastha154:avastha154(chart,lang),avakhada:avakhada(chart,lang),kota:kota(chart,lang),sudarshana:sudarshana(chart,lang),sarvatobhadra:sarvatobhadra(chart,lang),v5:v5Extras(chart,lang),planetRelations:planetRelations(chart,lang),remedies:bookRemedies(chart,lang),phase2:phase2StrengthAndJaimini(chart,lang),tajaka:tajaka(c,lang)};}
module.exports={advanced};
