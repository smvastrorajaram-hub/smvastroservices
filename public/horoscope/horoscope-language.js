/* Bilingual presentation only. Calculation data is never translated or mutated. */
(()=>{
 const $=id=>document.getElementById(id);
 const labels={
'SMV HOROSCOPE':'SMV ஜாதகம்','Sri Maduraveerayah Horoscope':'ஸ்ரீ மதுரை வீரையா ஜாதகம்','Horoscope interpretations are for reflection and personal guidance.':'ஜாதக விளக்கங்கள் சிந்தனைக்கும் தனிப்பட்ட வழிகாட்டலுக்கும் உரியவை.','UTC offset (hours)':'உலக நேர வேறுபாடு (மணி)','Use the birth location offset on the birth date, including daylight saving.':'பிறந்த நாளில் அந்த இடத்திற்கு உரிய நேர வேறுபாட்டை உள்ளிடவும்; கோடைக்கால நேர மாற்றத்தையும் சேர்க்கவும்.',
  'Create Horoscope':'ஜாதகம் உருவாக்குக','ENGLISH HOROSCOPE':'தமிழ் ஜாதகம்',
  'Enter birth date, birth time and select the exact birth place.':'பிறந்த தேதி, நேரம் மற்றும் சரியான பிறந்த இடத்தை உள்ளிடவும்.',
  Name:'பெயர்',Rasi:'ராசி','Date of Birth':'பிறந்த தேதி','Time of Birth':'பிறந்த நேரம்','Place of Birth':'பிறந்த இடம்',Latitude:'அட்சரேகை',Longitude:'தீர்க்கரேகை','Nakshatra (Optional)':'நட்சத்திரம் (விருப்பம்)',Reset:'மீட்டமை',
  'Your name':'உங்கள் பெயர்','City, State or City, State, Country':'நகரம், மாநிலம், நாடு','e.g. Rohini':'எ.கா. ரோகிணி',
  'Traditional Wisdom.':'பாரம்பரிய ஞானம்.','Personal Guidance.':'வாழ்விற்கு வழிகாட்டல்.',
  'Rooted in Tradition.':'பாரம்பரியத்தின் அடிப்படையில்.','Guidance for Life.':'வாழ்விற்கு வழிகாட்டல்.',
  'Explore your birth chart, planetary positions and traditional Vedic horoscope insights.':'உங்கள் பிறப்பு ஜாதகம், கிரக நிலைகள் மற்றும் பாரம்பரிய வேத ஜோதிட விவரங்களை அறியுங்கள்.',
  'Enter your birth details to create your personal horoscope.':'உங்கள் ஜாதகத்தை உருவாக்க பிறப்பு விவரங்களை உள்ளிடவும்.',
  'At Sri Maduraveerayah Horoscope, explore your birth chart, understand planetary influences and discover perspectives rooted in traditional Vedic astrology.':'ஸ்ரீ மதுரை வீரையா ஜாதக சேவையில், பிறப்பு ஜாதகம் மற்றும் கிரக நிலைகளைப் பாரம்பரிய வேத ஜோதிடத்தின் அடிப்படையில் அறியுங்கள்.',
  'Create your detailed horoscope with planetary positions, charts, Dasha periods and Panchang using your birth date, time and place.':'பிறந்த தேதி, நேரம், இடத்தைக் கொண்டு கிரக நிலைகள், ஜாதகக் கட்டங்கள், தசா காலங்கள் மற்றும் பஞ்சாங்கத்துடன் விரிவான ஜாதகத்தை உருவாக்குங்கள்.',
  'Private & Secure':'தனியுரிமை மற்றும் பாதுகாப்பு','Traditional Vedic Guidance':'பாரம்பரிய வேத ஜோதிட வழிகாட்டல்'
 };
 const extra={
  'Lord Vinayakar Prayer':'விநாயகர் பிரார்த்தனை','Daily Life Mantras':'தினசரி வாழ்க்கை மந்திரங்கள்','Meaning:':'பொருள்:',
  'O Lord Ganesha, with the curved trunk and mighty form, shining like a crore suns, remove all obstacles from all our endeavors and bless us with success always.':'வளைந்த துதிக்கையும் பெரிய உருவமும் கொண்ட, கோடி சூரியர்களைப் போல ஒளிரும் விநாயகரே, எங்கள் அனைத்துச் செயல்களிலும் தடைகளை நீக்கி எப்போதும் வெற்றி அருள்வாயாக.',
  'Om Gam Ganapataye Namah':'ஓம் கம் கணபதயே நமஹ',
  'Vakratunda Mahakaya':'வக்ரதுண்ட மஹாகாய',
  'Surya Koti Samaprabha':'சூர்ய கோடி சமப்ரபா',
  'Nirvighnam Kurume Deva':'நிர்விக்னம் குருமே தேவ',
  'Sarva Karyeshu Sarvada':'ஸர்வ கார்யேஷு ஸர்வதா',
  'Ruby':'மாணிக்கம்','Pearl':'முத்து','Red coral':'சிவப்புப் பவளம்','Emerald':'மரகதம்','Yellow sapphire':'கனக புஷ்பராகம்','Diamond':'வைரம்','Blue sapphire':'நீலக்கல்','Hessonite':'கோமேதகம்','Cat’s eye':'வைடூரியம்','Gold':'தங்கம்','Silver':'வெள்ளி','Copper':'செம்பு','Iron':'இரும்பு','Panchaloha':'பஞ்சலோகம்','Meditation':'தியானம்','Fasting':'விரதம்','Charity':'தானம்','Prayer':'பிரார்த்தனை',
  'Print / Save as PDF':'அச்சிடு / PDF ஆகச் சேமி','Copy Text':'உரையை நகலெடு','Tap to view':'தொட்டு பார்க்கவும்',

  'DAILY LIFE MANTRAS':'தினசரி வாழ்க்கை மந்திரங்கள்','ADHIDEVATAS':'அதிதேவதைகள்','ADVANCED ANALYSIS':'மேம்பட்ட பகுப்பாய்வு',
  '27 Nakshatras – Adhidevatas':'27 நட்சத்திரங்கள் — அதிதேவதைகள்','Tithis – Adhidevatas':'திதிகள் — அதிதேவதைகள்','Yogas – Adhidevatas':'யோகங்கள் — அதிதேவதைகள்','Karanas – Adhidevatas':'கரணங்கள் — அதிதேவதைகள்',
  'Adhidevata / Worship Deity':'அதிதேவதை / வழிபாட்டுத் தெய்வம்','Adhidevata / Deity':'அதிதேவதை / தெய்வம்',
  'A fixed reference of the associated deities for Nakshatra, Tithi, Yoga and Karana.':'நட்சத்திரம், திதி, யோகம், கரணம் தொடர்பான தெய்வங்களின் நிலையான குறிப்புப் பட்டியல்.',
  'Section VII is fixed and is shown identically for every horoscope.':'ஏழாவது பகுதி அனைத்து ஜாதகங்களுக்கும் பொதுவான நிலையான மந்திரத் தொகுப்பு.',
  'Section VIII is fixed and is shown identically for every horoscope.':'எட்டாவது பகுதி அனைத்து ஜாதகங்களுக்கும் பொதுவான நிலையான தெய்வக் குறிப்புப் பட்டியல்.',
  'For recovery from illness':'உடல்நலம் வேண்டி சொல்லும் மந்திரம்','Sri Sudarshana Mala Mantra for success in undertakings':'காரிய வெற்றிக்கான ஸ்ரீ சுதர்சன மாலா மந்திரம்','Sri Santana Gopala Mantra for child blessing':'சந்தான பாக்கியத்திற்கான ஸ்ரீ சந்தான கோபால மந்திரம்',
  'Sri Ashta Lakshmi Mala Mantra':'ஸ்ரீ அஷ்ட லட்சுமி மாலா மந்திரம்','Lakshmi Hayagriva Mantra for education and knowledge':'கல்வி, ஞானத்திற்கான லட்சுமி ஹயக்ரீவ மந்திரம்','Swayamvara Parvati Mantra for marriage':'திருமணத்திற்கான சுயம்வர பார்வதி மந்திரம்','Mahalakshmi Moola Mantra':'மகாலட்சுமி மூல மந்திரம்','Mahalakshmi Gayatri':'மகாலட்சுமி காயத்ரி','Panchamukha Hanuman Mala Mantra':'பஞ்சமுக அனுமன் மாலா மந்திரம்','Sri Narasimha Maha Mantra':'ஸ்ரீ நரசிம்ம மகா மந்திரம்','Maha Mrityunjaya Mantra':'மகா மிருத்யுஞ்சய மந்திரம்',
  'Shukla Paksha':'வளர்பிறை','Krishna Paksha':'தேய்பிறை','Special Dasa System':'சிறப்புத் தசா முறைகள்',
  'Sri Saraswati Devi':'ஸ்ரீ சரஸ்வதி தேவி','Sri Durga Devi (Ashtabhuja)':'ஸ்ரீ துர்க்கை தேவி (அஷ்டபுஜம்)','Sri Saravanabhava / Lord Muruga':'ஸ்ரீ சரவணபவ / முருகன்','Sri Chandra Choodeshwara / Shiva':'ஸ்ரீ சந்திரசூடேஸ்வரர் / சிவன்','Sri Dakshinamurti / Shiva':'ஸ்ரீ தட்சிணாமூர்த்தி / சிவன்','Sri Adishesha / Naga Devi':'ஸ்ரீ ஆதிசேஷன் / நாகதேவி','Surya Bhagavan / Surya Narayana':'சூரிய பகவான் / சூரிய நாராயணர்','Sri Andal Devi':'ஸ்ரீ ஆண்டாள்','Sri Mahalakshmi Devi':'ஸ்ரீ மகாலட்சுமி','Sri Gayatri Devi':'ஸ்ரீ காயத்ரி தேவி','Sri Chakrathazhwar':'ஸ்ரீ சக்கரத்தாழ்வார்','Sri Lakshmi Narayana':'ஸ்ரீ லட்சுமி நாராயணர்','Sri Varaha Perumal / Hayagriva':'ஸ்ரீ வராகப் பெருமாள் / ஹயக்ரீவர்','Sri Anjaneya':'ஸ்ரீ ஆஞ்சநேயர்','Sri Jambukeshwara / Shiva':'ஸ்ரீ ஜம்புகேஸ்வரர் / சிவன்','Sri Anantha Sayana Perumal / Vishnu':'ஸ்ரீ அனந்தசயனப் பெருமாள் / விஷ்ணு','Sri Mrityunjayeshwara / Shiva':'ஸ்ரீ மிருத்யுஞ்சயேஸ்வரர் / சிவன்','Sri Ekapada / Shiva':'ஸ்ரீ ஏகபாதர் / சிவன்','Sri Maha Ishwara / Shiva':'ஸ்ரீ மகேஸ்வரர் / சிவன்','Sri Ranganatha':'ஸ்ரீ ரங்கநாதர்',
  'Dhanishtha':'அவிட்டம்','Pratipada':'பிரதமை','Dwitiya':'துவிதியை','Tritiya':'திருதியை','Chaturthi':'சதுர்த்தி','Panchami':'பஞ்சமி','Shashti':'சஷ்டி','Saptami':'சப்தமி','Ashtami':'அஷ்டமி','Navami':'நவமி','Dashami':'தசமி','Ekadashi':'ஏகாதசி','Dwadashi':'துவாதசி','Trayodashi':'திரயோதசி','Chaturdashi':'சதுர்த்தசி','Purnima':'பௌர்ணமி','Amavasya':'அமாவாசை',
  'Shiva':'சிவன்','Vishnu':'விஷ்ணு','Rama':'ராமர்','Krishna':'கிருஷ்ணர்','Lakshmi':'லட்சுமி','Ganesha':'விநாயகர்','Vinayaka':'விநாயகர்','Narasimha':'நரசிம்மர்','Hayagriva':'ஹயக்ரீவர்','Muruga':'முருகன்','Durga':'துர்க்கை','Parvati':'பார்வதி','Gauri Mata':'கௌரி அன்னை','Brahma':'பிரம்மா','Kubera':'குபேரன்','Yama':'எமன்','Agni':'அக்னி','Vayu':'வாயு','Indra':'இந்திரன்','Saraswati':'சரஸ்வதி','Rudra':'ருத்ரன்','Kali':'காளி','Nandi':'நந்தி','Pitrs':'பித்ருக்கள்','Tripurasundari':'திரிபுரசுந்தரி','Kala Bhairava':'கால பைரவர்','Veerabhadra':'வீரபத்திரர்','Dharmaraja':'தர்மராஜர்','Manmatha':'மன்மதன்','Naga Devata':'நாகதேவதை','Lord':'இறைவன்','Sri':'ஸ்ரீ','Maha':'மகா','and':'மற்றும்',
  'Nakshatra':'நட்சத்திரம்','Tithi':'திதி','Yoga':'யோகம்','Karana':'கரணம்','Deity':'தெய்வம்','Basis':'அடிப்படை','Result':'முடிவு','Planet':'கிரகம்','Sign':'ராசி','House':'வீடு','Benefic':'சுப கிரகம்','Malefic':'பாப கிரகம்','Direct':'நேர்கதி','Retrograde':'வக்கிரம்',
  'Monday':'திங்கள்','Tuesday':'செவ்வாய்','Wednesday':'புதன்','Thursday':'வியாழன்','Friday':'வெள்ளி','Saturday':'சனி','Sunday':'ஞாயிறு'
 };
 const originals=new WeakMap();
 function ui(lang){
  document.title=lang==='ta'?'SMV ஜாதகம் — ஸ்ரீ மதுரை வீரையா ஜாதகம்':'SMV HOROSCOPE — Sri Maduraveerayah Horoscope';
  document.querySelector('.temple-hero img').alt=lang==='ta'?'மதுரை வீரன்':'Madurai Veeran';
  for(const root of [$('templeHeader'),$('home'),$('english-horoscope'),$('siteFooter')]){
   const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
   while(n=walk.nextNode()){
    if(n.parentElement.closest('#englishHoroscopeResult,.smv-language-buttons,#installApp,#installStatus'))continue;
    if(!originals.has(n))originals.set(n,n.nodeValue);
    const en=originals.get(n),t=en.trim();n.nodeValue=lang==='ta'&&labels[t]?en.replace(t,labels[t]):en;
   }
  }
  document.querySelectorAll('#english-horoscope input[placeholder]').forEach(n=>{if(!n.dataset.englishPlaceholder)n.dataset.englishPlaceholder=n.placeholder;n.placeholder=lang==='ta'?(labels[n.dataset.englishPlaceholder]||n.dataset.englishPlaceholder):n.dataset.englishPlaceholder;});
  const signs=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
  [...$('englishRasi').options].forEach((o,i)=>{if(!o.dataset.en){o.dataset.en=o.textContent;o.value=o.textContent;}o.textContent=lang==='ta'?signs[i]:o.dataset.en;});
 }
 window.__smvLocalizeTamilResult=(root,lang)=>{
  if(lang!=='ta'){
   const map={'இளம்நீலம்':'Light Blue','காபிகலர்':'Coffee Brown','ஆகமன':'Aagamana','ஆகம':'Aagama','உபவேசன':'Upavesana','கமன':'Gamana','கௌதுக':'Kautuka','சபா':'Sabhaa','சயன':'Sayana','நித்ரா':'Nidraa','நேத்ரபாணி':'Netrapaani','ந்ருத்யலிப்ஸா':'Nrityalipsaa','பிரகாசன':'Prakaasana','போஜன':'Bhojana'};
   const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=walk.nextNode()){if(n.parentElement.closest('script,style'))continue;for(const [ta,en]of Object.entries(map))n.nodeValue=n.nodeValue.split(ta).join(en);}return;
  }
  const map={};for(const [ta,en]of Object.entries(window.__smvHoroscopeEnglishDictionary||{}))if(!map[en])map[en]=ta;
  Object.assign(map,window.SMVSourceTamilDictionary||{},extra,window.SMVAdditionalTamil||{},{'Yuga':'யுக','English name sound':'ஆங்கிலப் பெயர் ஒலி','Tamil name sound':'தமிழ்ப் பெயர் ஒலி','Pratipada':'பிரதமை','Dvitiya':'துவிதியை','Tritiya':'திரிதியை','Chaturthi':'சதுர்த்தி','Panchami':'பஞ்சமி','Shashthi':'ஷஷ்டி','Saptami':'சப்தமி','Ashtami':'அஷ்டமி','Navami':'நவமி','Dashami':'தசமி','Ekadashi':'ஏகாதசி','Dwadashi':'துவாதசி','Trayodashi':'திரயோதசி','Chaturdashi':'சதுர்த்தசி','Purnima':'பௌர்ணமி','Amavasya':'அமாவாசை','Garaja':'கரசை','Vanija':'வணிசை','Vishti':'பத்திரை','Bava':'பவம்','Balava':'பாலவம்','Kaulava':'கௌலவம்','Taitila':'தைதுலம்','Shakuni':'சகுனி','Chatushpada':'சதுஷ்பாதம்','Naga':'நாகவம்','Kimstughna':'கிம்ஸ்துக்னம்'});
  const keys=Object.keys(map).filter(k=>/[A-Za-z]/.test(k)).sort((a,b)=>b.length-a.length);
  const re=new RegExp('(?<![A-Za-z])(?:'+keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')(?![A-Za-z])','g');
  const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;
  while(n=walk.nextNode()){
   if(n.parentElement.closest('script,style'))continue;
   if([$('englishAstroName').value,$('englishBirthPlace').value].includes(n.nodeValue.trim()))continue;
   for(let pass=0;pass<3;pass++){const v=n.nodeValue.replace(re,x=>map[x]||x);if(v===n.nodeValue)break;n.nodeValue=v;}
  }
 };
 async function select(lang){
  if(window.__smvHoroscopeIsBusy?.())return;
  const old=document.documentElement.lang;document.documentElement.lang=lang;ui(lang);window.dispatchEvent(new CustomEvent('smv-language',{detail:lang}));
  $('languageTamil').setAttribute('aria-pressed',String(lang==='ta'));$('languageEnglish').setAttribute('aria-pressed',String(lang==='en'));
  try{localStorage.setItem('smvHoroscopeLanguage',lang);}catch{}
  const result=$('englishHoroscopeResult');
  if(old!==lang&&result.dataset.resultLanguage&&!result.classList.contains('hidden'))await window.__smvSwitchHoroscopeLanguage?.(lang);
 }
 $('languageTamil').onclick=()=>select('ta');$('languageEnglish').onclick=()=>select('en');
 let lang='en';try{lang=localStorage.getItem('smvHoroscopeLanguage')==='ta'?'ta':'en';}catch{}const requested=new URLSearchParams(location.search).get('lang');if(['ta','en'].includes(requested))lang=requested;select(lang);
})();
