
/* Tamil Horoscope Generator - V121: server-side astronomical calculation engine. */
(function(){
  const BACKEND_URL=(window.SMV_BACKEND_URL||'');
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rasiList=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
  const rasiIndex=r=>rasiList.indexOf(r);
  const signIcon=['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const PLANET_SHORT_TA={'சூரியன்':'சூ','சந்திரன்':'சந்','செவ்வாய்':'செ','புதன்':'பு','குரு':'கு','சுக்கிரன்':'சு','சனி':'ச','ராகு':'ரா','கேது':'கே','லக்னம்':'லக்'};
  const PLANET_SHORT_EN={'சூரியன்':'Su','சந்திரன்':'Mo','செவ்வாய்':'Ma','புதன்':'Me','குரு':'Ju','சுக்கிரன்':'Ve','சனி':'Sa','ராகு':'Ra','கேது':'Ke','லக்னம்':'Asc'};
  function shortPlanetName(name,lang){return (lang==='en'?PLANET_SHORT_EN:PLANET_SHORT_TA)[name]||name;}
  const RASI_SHORT_EN=['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'];
  const RASI_SHORT_TA=['மே','ரி','மி','க','சி','க','து','வி','த','ம','கு','மீ'];
  function compactRasiName(name,lang){
    const i=rasiIndex(name);
    if(i<0) return name||'';
    return (lang==='en'?RASI_SHORT_EN:RASI_SHORT_TA)[i];
  }
  function getHoroscopeLang(){return document.documentElement.lang==='ta'?'ta':'en';}
  const EN={
    'மேஷம்':'Aries','ரிஷபம்':'Taurus','மிதுனம்':'Gemini','கடகம்':'Cancer','சிம்மம்':'Leo','கன்னி':'Virgo','துலாம்':'Libra','விருச்சிகம்':'Scorpio','தனுசு':'Sagittarius','மகரம்':'Capricorn','கும்பம்':'Aquarius','மீனம்':'Pisces',
    'கேது':'Ketu','சுக்கிரன்':'Venus','சூரியன்':'Sun','சந்திரன்':'Moon','செவ்வாய்':'Mars','ராகு':'Rahu','குரு':'Jupiter','சனி':'Saturn','புதன்':'Mercury','லக்னம்':'Ascendant',
    'அஸ்வினி':'Ashwini','பரணி':'Bharani','கார்த்திகை':'Krittika','ரோகிணி':'Rohini','மிருகசீரிடம்':'Mrigashira','திருவாதிரை':'Ardra','புனர்பூசம்':'Punarvasu','பூசம்':'Pushya','ஆயில்யம்':'Ashlesha','மகம்':'Magha','பூரம்':'Purva Phalguni','உத்திரம்':'Uttara Phalguni','ஹஸ்தம்':'Hasta','சித்திரை':'Chitra','சுவாதி':'Swati','விசாகம்':'Vishakha','அனுஷம்':'Anuradha','கேட்டை':'Jyeshtha','மூலம்':'Mula','பூராடம்':'Purva Ashadha','உத்திராடம்':'Uttara Ashadha','திருவோணம்':'Shravana','அவிட்டம்':'Dhanishta','சதயம்':'Shatabhisha','பூரட்டாதி':'Purva Bhadrapada','உத்திரட்டாதி':'Uttara Bhadrapada','ரேவதி':'Revati',
    'பாதம்':'Pada','பிறந்த தேதி':'Date of Birth','நேரம்':'Time','பிறந்த இடம்':'Place of Birth','ராசி':'Rasi','நட்சத்திரம்':'Nakshatra','நெடுவரை':'Longitude','சந்திர ராசி':'Moon Rasi','அயனாம்சம்':'Ayanamsa','பாவம்':'Bhava','பாவக':'Bhava','கட்டம்':'Chart','ஆரம்பம்':'Arambha','மத்தியம்':'Madhya','முடிவு':'Antya','ஸ்புடம்':'Sphuta','ஸ்புட ராசி':'Sphuta Rasi','கிரகங்கள்':'Planets','கிரகம்':'Planet','பாகை':'Degree','நவாம்சம்':'Navamsa','நவாம்ச பாதம்':'Navamsa Pada','நவாம்ச நிலைகள்':'Navamsa Positions','பிறப்பு விவரங்கள்':'Birth Details','கிரக நிலைகள்':'Planetary Positions','விம்சோத்தரி தசா':'Vimshottari Dasha','தற்போதைய / அடுத்த தசா':'Current / Next Dasha','அடுத்தது':'Next','அடுத்த புக்தி':'Next Bhukti','அடுத்த அந்தரம்':'Next Antara','மகாதசை':'Mahadasha','புக்தி':'Bhukti','அந்தர்தசை':'Antardasha','அந்தரம்':'Antara','பிரத்யந்தர்தசை':'Pratyantara Dasha','தொடக்கம்':'Start','முடிவு':'End','அடுத்த நிலை தகவல் இல்லை.':'No next-level information.','புக்தி தகவல் இல்லை.':'No Bhukti information.','அந்தர காலங்கள் இல்லை.':'No Antara periods.','9 துணைக் காலங்கள்':'9 sub-periods',
    'தமிழ் ஜாதக கணக்கீடு':'Horoscope Calculation','D-1 ராசி':'Rasi Chart (D-1)','நவாம்ச கட்டம் (D9)':'Navamsa Chart ( D-9)','ஒவ்வொரு கிரகத்தின் D9 நவாம்ச ராசி, லக்ன நவாம்சம் உட்பட.':'D9 Navamsa sign for each planet, including the Navamsa Ascendant.','பாவக கட்டம்':'Bhava Chart','பாவக கட்டம் (Bhava Table)':'Bhava Chart','நவாம்ச நிலைகள்':'Navamsa Positions','சரிபார்க்கப்பட்ட ஜாதகத் தரவை AI விளக்குகிறது...':'AI is interpreting the verified horoscope data...','AI எதிர்கால பலன்':'AI Future Insights','AI எதிர்கால பலன் உருவாக்குக':'Generate AI Future Insights','AI பலன் உருவாக்கப்படுகிறது...':'Generating AI Future Insights...','குறிப்பு':'Note','ஜாதக கணக்கீட்டு உரை நகலெடுக்கப்பட்டது.':'Horoscope calculation text copied.','நகலெடுக்க முடியவில்லை.':'Unable to copy.','மீட்டமை':'Reset','தமிழில் ஜாதகம் உருவாக்குக':'Create Horoscope in Tamil','தமிழ் ஜாதகம்':'Tamil Horoscope','தமிழ் ஜோதிட வழிகாட்டி':'Tamil Astrology Guide',
    'உங்கள் பெயர்':'Your name','நகரம், மாநிலம்':'City, State','எ.கா. 13.0827':'e.g. 13.0827','எ.கா. 80.2707':'e.g. 80.2707','எ.கா. ரோகிணி':'e.g. Rohini','நட்சத்திரம் (விருப்பம்)':'Nakshatra (Optional)','பெயர்':'Name','பிறந்த தேதி':'Date of Birth','பிறந்த நேரம்':'Birth Time','பிறந்த இடம்':'Birth Place','ராசி':'Rasi',
    'பிறந்த நேரம் சரியாக உள்ளிடவும். உதாரணம்: 22:05 (10:05 PM).':'Enter the birth time correctly. Example: 22:05 (10:05 PM).','பிறந்த தேதி மற்றும் பிறந்த நேரத்தை உள்ளிடவும்.':'Enter the date and time of birth.','முதலில் Birth Place-ல் காட்டப்படும் location suggestion-ஐ தேர்வு செய்யவும். Latitude மற்றும் Longitude தானாக நிரப்பப்படும்.':'First select the location suggestion shown for Birth Place. Latitude and Longitude will be filled automatically.','Birth Place-ஐ தேர்வு செய்யவும்; Latitude மற்றும் Longitude தானாக நிரப்பப்படும்.':'Select the Birth Place; Latitude and Longitude will be filled automatically.',
    'ஒவ்வொரு கிரகமும் தனி வரியில்: ராசி · பாகை · நட்சத்திரம் · பாதம்.':'Each planet is shown on a separate row: Rasi · Degree · Nakshatra · Pada.','மகாதசையை touch செய்தால்':'Tap a Mahadasha to open','புக்தியை touch செய்தால்':'Tap a Bhukti to open','பிறந்த நேர சந்திரனின் நட்சத்திரத்தை அடிப்படையாகக் கொண்ட ஆரம்ப மகாதசா balance':'Initial Mahadasha balance based on the Moon’s birth Nakshatra','ஆண்டுகள்':'years',
    'Phase 2 — மேம்பட்ட கிரக வலிமை':'Phase 2 — Advanced Planetary Strength','நிலை, திசை, காலம், இயக்கம், இயற்கை மற்றும் பார்வை ஆகிய 6 வெளிப்படையான strength indicators.':'Six transparent strength indicators: positional, directional, temporal, motion, natural and aspect strength.','இது ஒரு SMV composite index; பாரம்பரிய Shadbala-வாகக் கருத வேண்டாம்.':'This is an SMV composite index; it should not be treated as classical Shadbala.','ஸ்தானம் / திசை':'Sthana / Dig','காலம் / இயக்கம்':'Kala / Cheshta','இயற்கை / பார்வை':'Naisargika / Drik','மொத்தம்':'Total','Phase 3 — Classical Parashari Shadbala':'Phase 3 — Classical Parashari Shadbala','ஸ்தான பலம்':'Sthana Bala','திக் பலம்':'Dig Bala','கால பலம்':'Kala Bala','சேஷ்டா பலம்':'Cheshta Bala','நைசர்கிக பலம்':'Naisargika Bala','த்ரிக் பலம்':'Drik Bala','தேவையானது':'Required','உச்ச':'Uccha','வர்க':'Saptavargaja','நாதோ':'Nathonnatha','பக்ஷ':'Paksha','அயன':'Ayana','வலிமை':'Strong','தேவையான அளவுக்கு குறைவு':'Below required','குறிப்பு':'Note','Classical-style Shadbala கணக்கீடு':'Classical-style Shadbala calculation','சூரியன் முதல் சனி வரை 7 கிரகங்களுக்கு':'For the seven classical planets from Sun through Saturn','Rahu/Ketu இந்த classical Shadbala total-ல் சேர்க்கப்படவில்லை.':'Rahu/Ketu are excluded from the classical Shadbala total.','இது ஒரு astronomical ephemeris அடிப்படையிலான கணக்கீட்டு layer.':'This is an astronomical ephemeris-based calculation layer.','பாரம்பரிய ஜோதிட பலன்கள் விளக்க/நம்பிக்கை சார்ந்தவை; முக்கிய வாழ்க்கை முடிவுகளுக்கு இதை ஒரே ஆதாரமாக பயன்படுத்த வேண்டாம்.':'Traditional astrology interpretations are belief-based; do not use them as the sole basis for important life decisions.',
    'உங்கள் சரிபார்க்கப்பட்ட ஜாதகக் கணக்கீட்டுத் தரவை மட்டும் அடிப்படையாகக் கொண்டு தமிழ் AI விளக்கத்தை உருவாக்கலாம். AI கணக்கீட்டுத் தரவை மாற்றாது; எதிர்காலத்தை உறுதி செய்யாது.':'AI can generate an interpretation using only your verified horoscope calculation data. AI does not alter the calculation data and does not guarantee the future.',
    'உங்கள் சரிபார்க்கப்பட்ட ஜாதகக் கணக்கீட்டு தரவை மட்டும் அடிப்படையாகக் கொண்டு தமிழ் AI விளக்கத்தை உருவாக்கலாம். AI கணக்கீட்டு தரவை மாற்றாது; எதிர்காலத்தை உறுதி செய்யாது.':'AI can generate an interpretation using only your verified horoscope calculation data. AI does not alter the calculation data and does not guarantee the future.',
    'இங்கு பாவ ஸ்புடம்':'Here Bhava Sphuta'
  };
  // V160: complete English-language cleanup for the English horoscope result.
  // The English result is rendered from the Tamil calculation DOM, so every
  // calculation label/value that can originate in Tamil must be translated.
  Object.assign(EN,{
    'ராசி நிலை':'Rasi Status',
    'கிரக வலிமை & நிலை':'Planetary Strength & Status',
    'கிரக நிலைகள்':'Planetary Positions',
    'கிரகம்':'Planet',
    'கிரகங்கள்':'Planets',
    'பாகை':'Degree',
    'வக்கிரம்':'Retrograde',
    'அஸ்தமனம்':'Combustion',
    'சூரிய தூரம்':'Sun Distance',
    'ஆம்':'Yes',
    'இல்லை':'No',
    'உச்சம்':'Exaltation',
    'நீசம்':'Debilitation',
    'உச்ச ராசி':'Exalted Sign',
    'நீச ராசி':'Debilitated Sign',
    'சுய ராசி':'Own Sign',
    'மூலத்திரிகோணம்':'Moolatrikona',
    'நட்பு':'Friend',
    'பகை':'Enemy',
    'நடுநிலை':'Neutral',
    'ஸ்தானம்':'Sthana',
    'திசை':'Direction',
    'காலம்':'Kala',
    'இயக்கம்':'Cheshta',
    'இயற்கை':'Naisargika',
    'பார்வை':'Drik',
    'கிரக வலிமை':'Planetary Strength',
    'நிலை':'Status',
    'உச்சம்/நீசம்':'Exaltation/Debilitation',
    'பாரம்பரிய':'Classical',
    'சூரியன் முதல் சனி வரை 7 கிரகங்களுக்கு':'For the seven classical planets from Sun through Saturn',
    'ஸ்தான பலம்':'Sthana Bala',
    'திக் பலம்':'Dig Bala',
    'கால பலம்':'Kala Bala',
    'சேஷ்டா பலம்':'Cheshta Bala',
    'நைசர்கிக பலம்':'Naisargika Bala',
    'த்ரிக் பலம்':'Drik Bala',
    'மொத்தம் / தேவையானது':'Total / Required',
    'தேவையான அளவுக்கு குறைவு':'Below Required',
    'வலிமை':'Strong',
    'குறிப்பு':'Note',
    'உச்ச':'Uccha',
    'வர்க':'Saptavargaja',
    'நாதோ':'Nathonnatha',
    'பக்ஷ':'Paksha',
    'அயன':'Ayana',
    'விம்சோத்தரி தசா':'Vimshottari Dasha',
    'மகாதசையை touch செய்தால்':'Tap a Mahadasha to open',
    'புக்தியை touch செய்தால்':'Tap a Bhukti to open',
    'புக்தி / அந்தர்தசை':'Bhukti / Antardasha',
    'அந்தரம்':'Antara',
    'அந்தர காலங்கள் இல்லை.':'No Antara periods.',
    'புக்தி தகவல் இல்லை.':'No Bhukti information.',
    'அடுத்த நிலை தகவல் இல்லை.':'No next-level information.',
    'தொடக்கம்':'Start',
    'முடிவு':'End',
    'ராசி':'Rasi',
    'பாதம்':'Pada',
    'நட்சத்திரம்':'Nakshatra',
    'பிறந்த தேதி':'Date of Birth',
    'பிறந்த நேரம்':'Birth Time',
    'பிறந்த இடம்':'Birth Place',
    'அயனாம்சம்':'Ayanamsa',
    'பாவம்':'Bhava',
    'பாவக':'Bhava',
    'கட்டம்':'Chart',
    'ஆரம்பம்':'Arambha',
    'மத்தியம்':'Madhya',
    'ஸ்புடம்':'Sphuta',
    'முடிவு':'Antya',
    'ஸ்புட ராசி':'Sphuta Rasi',
    'நவாம்ச நிலைகள்':'Navamsa Positions',
    'நவாம்ச பாதம்':'Navamsa Pada',
    'நவாம்சம்':'Navamsa',
    'நவாம்ச கட்டம் (D9)':'Navamsa Chart ( D-9)',
    'பாவக கட்டம்':'Bhava Chart',
    'பாவக கட்டம் (Bhava Table)':'Bhava Chart',
    'ராசி நிலை':'Rasi Status',
    'சூரியன் முதல் சனி வரை':'Sun through Saturn',
    'சுய ராசி மற்றும் மூலத்திரிகோணம்':'own sign and Moolatrikona',
    'அடிப்படை நிலைகள்':'basic status indicators'
  });


  // V28: English Horoscope — remove the remaining Tamil labels/text that
  // can appear in the calculation result, including mobile table headers
  // and Dasha labels. Tamil Horoscope remains unchanged.
  Object.assign(EN,{
    'பாவம்':'Bhava',
    'ஆரம்பம்':'Start',
    'மத்தியம்':'Middle',
    'முடிவு':'End',
    'ராசி':'Rasi',
    'கிரகங்கள்':'Planets',
    'கிரகம்':'Planet',
    'D1 ராசி':'D1 Rasi',
    'D9 நவாம்ச ராசி':'D9 Navamsa Rasi',
    'நவாம்ச ராசி':'Navamsa Rasi',
    'நவாம்ச பாதம்':'Navamsa Pada',
    'பாவக கட்டம்':'Bhava Chart',
    'பாவக':'Bhava',
    'கட்டம்':'Chart',
    'நவாம்ச நிலைகள்':'Navamsa Positions',
    'விம்சோத்தரி தசா':'Vimshottari Dasha',
    'மகாதசை':'Mahadasha',
    'புக்தி':'Bhukti',
    'அந்தர்தசை':'Antardasha',
    'அந்தரம்':'Antara',
    'பிரத்யந்தர்தசை':'Pratyantara Dasha',
    'புக்தி / அந்தர்தசை':'Bhukti / Antardasha',
    'அந்தரம் / பிரத்யந்தரம்':'Antara / Pratyantara',
    'தொடக்கம்':'Start',
    'முடிவு':'End',
    '9 துணைக் காலங்கள்':'9 sub-periods',
    'அடுத்த நிலை தகவல் இல்லை.':'No next-level information.',
    'புக்தி தகவல் இல்லை.':'No Bhukti information.',
    'அந்தர காலங்கள் இல்லை.':'No Antara periods.',
    'திறக்கும்.':'opens.',
    'பிறந்த நேர சந்திரனின் நட்சத்திரத்தை அடிப்படையாகக் கொண்ட ஆரம்ப மகாதசா balance':'Initial Mahadasha balance based on the Moon’s birth Nakshatra',
    'ஆண்டுகள்':'years',
    'சூரியன் முதல் சனி வரை 7 கிரகங்களுக்கு':'For the seven classical planets from Sun through Saturn',
    'இந்த classical Shadbala total-ல் சேர்க்கப்படவில்லை.':'are excluded from the classical Shadbala total.',
    'Phase 3-ல்':'In Phase 3,',
    'ஆறு classical components தனித்தனியாகக் கணக்கிடப்படுகின்றன.':'six classical components are calculated separately.',
    'காலக் கணக்கீட்டில் பயன்படுத்தப்படும் சில':'Some conventions used in time calculation',
    'மற்றும்':'and',
    'ஆகிய':'the',
    'Cheshta/காலக் கணக்கீட்டில் பயன்படுத்தப்படும் சில time/mean-motion conventions lineage-க்கு ஏற்ப மாறக்கூடும்; ஆகவே இதை reference-grade software parity என்று கூறவில்லை.':'Some time/mean-motion conventions used in Cheshta/Kala calculations may vary by lineage; therefore this should not be considered reference-grade software parity.',
    'இது astronomical ephemeris அடிப்படையிலான கணக்கீட்டு layer.':'This is an astronomical ephemeris-based calculation layer.',
    'பாரம்பரிய ஜோதிட பலன்கள் விளக்க/நம்பிக்கை சார்ந்தவை; முக்கிய வாழ்க்கை முடிவுகளுக்கு இதை ஒரே ஆதாரமாக பயன்படுத்த வேண்டாம்.':'Traditional astrology interpretations are belief-based; do not use them as the sole basis for important life decisions.',
    'வக்கிரம்':'Retrograde',
    'அஸ்தமனம்':'Combustion',
    'சூரிய தூரம்':'Sun Distance',
    'ராசி நிலை':'Rasi Status',
    'ஆம்':'Yes',
    'இல்லை':'No',
    'சூரிய தூரம்':'Sun Distance',
    'வலிமை':'Strong',
    'தேவையான அளவுக்கு குறைவு':'Below Required',
    'உச்சம்':'Exaltation',
    'நீசம்':'Debilitation',
    'சுய ராசி':'Own Sign',
    'நட்பு':'Friend',
    'பகை':'Enemy',
    'நடுநிலை':'Neutral',
    'பிறந்த தேதி':'Date of Birth',
    'பிறந்த நேரம்':'Birth Time',
    'பிறந்த இடம்':'Birth Place',
    'நட்சத்திரம்':'Nakshatra',
    'பாதம்':'Pada',
    'அயனாம்சம்':'Ayanamsa',
    'பாகை':'Degree',
    'நெடுவரை':'Longitude',
    'சந்திர ராசி':'Moon Rasi',
    'ஸ்புடம்':'Sphuta',
    'ஸ்புட ராசி':'Sphuta Rasi',
    'நிலை':'Status',
    'கிரக வலிமை & நிலை':'Planetary Strength & Status',
    'ஒவ்வொரு கிரகமும் தனி வரியில்: ராசி · பாகை · நட்சத்திரம் · பாதம்.':'Each planet is shown on a separate row: Rasi · Degree · Nakshatra · Pada.',
    'வக்கிரம், அஸ்தமனம் (Combustion), உச்சம்/நீசம், சுய ராசி மற்றும் மூலத்திரிகோணம் ஆகிய அடிப்படை நிலைகள்.':'Basic status indicators: Retrograde, Combustion, Exaltation/Debilitation, Own Sign and Moolatrikona.',
    'மகாதசையை touch செய்தால்':'Tap a Mahadasha to open',
    'புக்தியை touch செய்தால்':'Tap a Bhukti to open',
    'பிறந்த நேர சந்திரனின் நட்சத்திரத்தை அடிப்படையாகக் கொண்ட ஆரம்ப மகாதசா balance:':'Initial Mahadasha balance based on the Moon’s birth Nakshatra:',
    'குறிப்பு':'Note',
    'சேஷ்டா பலம்':'Cheshta Bala',
    'நைசர்கிக பலம்':'Naisargika Bala',
    'த்ரிக் பலம்':'Drik Bala',
    'ஸ்தான பலம்':'Sthana Bala',
    'திக் பலம்':'Dig Bala',
    'கால பலம்':'Kala Bala',
    'மொத்தம் / தேவையானது':'Total / Required',
    'தேவையானது':'Required',
    'உச்ச':'Uccha',
    'வர்க':'Saptavargaja',
    'நாதோ':'Nathonnatha',
    'பக்ஷ':'Paksha',
    'அயன':'Ayana'
  });

  function fmtDate(v){if(!v)return '—';try{return new Date(v+'T00:00:00').toLocaleDateString(getHoroscopeLang()==='ta'?'ta-IN':'en-IN',{day:'2-digit',month:'long',year:'numeric'});}catch{return v;}}
  function englishTextNode(text){
    let out=String(text||'');
    Object.keys(EN).sort((a,b)=>b.length-a.length).forEach(k=>{out=out.split(k).join(EN[k]);});
    out=out.replace(/(\d+)-ம் பாவம்/g,(_,n)=>{const ord=n==='1'?'1st':n==='2'?'2nd':n==='3'?'3rd':n+'th';return ord+' Bhava';});
    out=out.replace(/பா\.(\d+)/g,'Bhava $1');
    out=out.replace(/உறவு/g,'Rasi Status').replace(/ராசி நிலை/g,'Rasi Status').replace(/வக்கிரம்/g,'Retrograde').replace(/அஸ்தமனம்/g,'Combustion').replace(/சூரிய தூரம்/g,'Sun Distance').replace(/ஆம்/g,'Yes').replace(/இல்லை/g,'No');
    return out;
  }
  function applyEnglishToHoroscope(root){
    if(!root)return;
    root.classList.add('english-horoscope');
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let n; while(n=walker.nextNode()){ if(!n.nodeValue.trim()||n.parentElement?.closest('script,style'))continue; n.nodeValue=englishTextNode(n.nodeValue); }
    root.querySelectorAll('th,button,[aria-label]').forEach(el=>{
      if(el.childNodes.length===1&&el.firstChild.nodeType===3)el.firstChild.nodeValue=englishTextNode(el.firstChild.nodeValue);
      if(el.hasAttribute('aria-label'))el.setAttribute('aria-label',englishTextNode(el.getAttribute('aria-label')));
    });
  }
  function applyHoroscopeLanguage(lang){
    const ta=lang!=='en';
    const heading=document.querySelector('#tamil-horoscope h2');
    const sectionRule=document.querySelector('#tamil-horoscope .home-rule span:nth-child(2)');
    const btn=$('generateTamilHoroscope'), clear=$('clearTamilHoroscope');
    const labels=[...document.querySelectorAll('#tamil-horoscope label b')];
    const texts=ta?['பெயர்','ராசி','பிறந்த தேதி','பிறந்த நேரம்','பிறந்த இடம்','','','நட்சத்திரம் (விருப்பம்)']:['Name','Rasi','Date of Birth','Birth Time','Birth Place','','','Nakshatra (Optional)'];
    labels.forEach((el,i)=>{if(texts[i])el.textContent=texts[i];});
    if(heading)heading.textContent=ta?'தமிழில் ஜாதகம் உருவாக்குக':'Create Horoscope';
    if(sectionRule)sectionRule.textContent=ta?'தமிழ் ஜோதிட வழிகாட்டி':'Horoscope';
    if(btn){btn.textContent=ta?'தமிழில் ஜாதகம் உருவாக்குக':'Create Horoscope';}
    if(clear)clear.textContent=ta?'மீட்டமை':'Reset';
    const fields={tamilAstroName:ta?'உங்கள் பெயர்':'Your name',tamilBirthPlace:ta?'நகரம், மாநிலம்':'City, State',tamilNakshatra:ta?'எ.கா. ரோகிணி':'e.g. Rohini',tamilLat:ta?'எ.கா. 13.0827':'e.g. 13.0827',tamilLon:ta?'எ.கா. 80.2707':'e.g. 80.2707'};
    Object.entries(fields).forEach(([id,v])=>{const el=$(id);if(el)el.placeholder=v;});
    const r=$('tamilRasi');
    if(r){
      const vals=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
      [...r.options].forEach((o,i)=>o.textContent=ta?vals[i]:EN[vals[i]]);
    }
    const result=$('tamilHoroscopeResult');
    if(result){
      if(lang==='en') applyEnglishToHoroscope(result);
      else result.classList.remove('english-horoscope');
    }
    window.__smvApplyHoroscopeLanguage=applyHoroscopeLanguage;
  }
  function degreeOnly(p){
    const lon=Number(p?.longitude);
    if(Number.isFinite(lon)) return `<span class="rasi-degree">${Math.floor((((lon%30)+30)%30))}°</span>`;
    const m=String(p?.degree||'').match(/(\d+)/); return m?`<span class="rasi-degree">${Number(m[1])}°</span>`:'—';
  }
  function fullDms(v){
    const lon=Number(v?.longitude);
    if(Number.isFinite(lon)){ let x=((lon%30)+30)%30,d=Math.floor(x),mf=(x-d)*60,m=Math.floor(mf),sec=Math.round((mf-m)*60); if(sec>=60){sec=0;m++;} if(m>=60){m=0;d++;} return `${d}°${String(m).padStart(2,'0')}'${String(sec).padStart(2,'0')}\"`; }
    const raw=String(v?.degree??'').trim(), nums=raw.match(/\d+(?:\.\d+)?/g)||[];
    if(nums.length>=3)return `${Math.floor(Number(nums[0]))}°${String(Math.floor(Number(nums[1]))).padStart(2,'0')}'${String(Math.round(Number(nums[2]))).padStart(2,'0')}\"`;
    if(nums.length===2)return `${Math.floor(Number(nums[0]))}°${String(Math.round(Number(nums[1]))).padStart(2,'0')}'00\"`;
    return nums.length?`${Math.floor(Number(nums[0]))}°00'00\"`:'—';
  }
  function statusMarks(p){ const s=p?.strength||{}; return `${s.combustion?'<span class="status-combust">(C)</span>':''}${s.retrograde?'<span class="status-retro">(R)</span>':''}`; }
  function planetDisplayName(p,lang){return `${esc(shortPlanetName(p.name,lang))}${statusMarks(p)}`;}
  function rows(items,lagna,maandi){
    const asc=lagna?{...lagna,name:'லக்னம்',rasi:lagna.rasi,longitude:lagna.longitude,degree:lagna.degree,nakshatra:lagna.nakshatra,pada:lagna.pada,strength:{}}:null;
    const md=maandi?{...maandi,name:'மாந்தி',displayShort:'Md',rasi:maandi.rasi,longitude:maandi.longitude,degree:maandi.degree,nakshatra:maandi.nakshatra,pada:maandi.pada,strength:{}}:null;
    const all=[...(asc?[asc]:[]),...(items||[]),...(md?[md]:[])]; const lang=getHoroscopeLang();
    return all.map(x=>`<tr><td><b>${x.displayShort?esc(lang==='en'?'Maandi':x.displayShort):planetDisplayName(x,lang)}</b></td><td>${esc(x.rasi||'—')}</td><td class="full-degree">${fullDms(x)}</td><td>${esc(x.nakshatra||'—')}</td><td>${x.pada??'—'}</td></tr>`).join('');
  }

  function buildBhavaSpecialFeatures(d,birthPanchang=null){
    const ta = getHoroscopeLang() !== 'en';
    const escv = v => esc(String(v ?? '—'));
    const ps = Array.isArray(d?.planets) ? d.planets : [];
    const enR = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const taR = ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
    const rmap = {மேஷம்:'Aries',ரிஷபம்:'Taurus',மிதுனம்:'Gemini',கடகம்:'Cancer',சிம்மம்:'Leo',கன்னி:'Virgo',துலாம்:'Libra',விருச்சிகம்:'Scorpio',தனுசு:'Sagittarius',மகரம்:'Capricorn',கும்பம்:'Aquarius',மீனம்:'Pisces'};
    const planetEN={Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu',சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
    const planetTA={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
    const nakEN=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
    const nakTA=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];
    const nakLordEN=['Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury','Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury'];
    const lordEN=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
    const signIndex=r=>{const q=rmap[String(r)]||String(r);return enR.indexOf(q);};
    const canonSign=i=>ta?taR[((i%12)+12)%12]:enR[((i%12)+12)%12];
    const pName=p=>{const en=planetEN[String(p?.name??p??'')];return ta?(planetTA[en]||en||'—'):(en||'—');};
    const pByEN=en=>ps.find(p=>planetEN[String(p?.name||'')]===en);
    const lon=p=>Number(p?.longitude);
    const signOfLon=L=>Number.isFinite(L)?Math.floor((((L%360)+360)%360)/30):-1;
    const nakIndexOfLon=L=>Number.isFinite(L)?Math.max(0,Math.min(26,Math.floor((((L%360)+360)%360)/(360/27)))):-1;
    const nakName=i=>i>=0?(ta?nakTA[i]:nakEN[i]):'—';
    const uniqJoin=a=>[...new Set(a.filter(Boolean))].join(', ')||'—';

    // Pushkara Navamsa is determined from the exact D1 longitude, not by
    // trusting a possibly missing/stale D9 field.  Two 3°20′ zones occur in
    // every sign.  This follows the user's supplied table: Fire→Libra/Sagittarius,
    // Earth→Pisces/Taurus, Air→Pisces/Taurus, Water→Cancer/Virgo.
    const pushZones={
      Aries:[[20,23+20/60,'Libra'],[26+40/60,30,'Sagittarius']],
      Leo:[[20,23+20/60,'Libra'],[26+40/60,30,'Sagittarius']],
      Sagittarius:[[20,23+20/60,'Libra'],[26+40/60,30,'Sagittarius']],
      Taurus:[[6+40/60,10,'Pisces'],[13+20/60,16+40/60,'Taurus']],
      Virgo:[[6+40/60,10,'Pisces'],[13+20/60,16+40/60,'Taurus']],
      Capricorn:[[6+40/60,10,'Pisces'],[13+20/60,16+40/60,'Taurus']],
      Gemini:[[16+40/60,20,'Pisces'],[23+20/60,26+40/60,'Taurus']],
      Libra:[[16+40/60,20,'Pisces'],[23+20/60,26+40/60,'Taurus']],
      Aquarius:[[16+40/60,20,'Pisces'],[23+20/60,26+40/60,'Taurus']],
      Cancer:[[0,3+20/60,'Cancer'],[6+40/60,10,'Virgo']],
      Scorpio:[[0,3+20/60,'Cancer'],[6+40/60,10,'Virgo']],
      Pisces:[[0,3+20/60,'Cancer'],[6+40/60,10,'Virgo']]
    };
    const push=ps.filter(p=>{
      const L=lon(p), si=signOfLon(L); if(si<0)return false;
      const a=enR[si], deg=((L%30)+30)%30; return (pushZones[a]||[]).some(z=>deg>=z[0] && deg<z[1]);
    }).map(p=>{
      const L=lon(p),si=signOfLon(L),deg=((L%30)+30)%30,zone=(pushZones[enR[si]]||[]).find(z=>deg>=z[0]&&deg<z[1]);
      return `${pName(p)} (${zone?.[2]||'—'} Navamsa)`;
    });
    const vargo=ps.filter(p=>{const a=signIndex(p.rasi),b=signIndex(p.navamsa?.rasi);return a>=0&&a===b;}).map(pName);

    // Graha Yutha is restricted to the five Tara-grahas requested by the user:
    // Mars, Mercury, Jupiter, Venus and Saturn. Sun, Moon, Rahu and Ketu are excluded.
    const tara=['Mars','Mercury','Jupiter','Venus','Saturn'];
    const yuthaGroups=[];
    for(let s=0;s<12;s++){
      const g=ps.filter(p=>tara.includes(planetEN[String(p?.name||'')])&&signOfLon(lon(p))===s).map(pName);
      if(g.length>1)yuthaGroups.push(`${canonSign(s)}: ${g.join(', ')}`);
    }

    // Yogi / Saha Yogi / Ava Yogi: Yoga point = Sun + Moon + 93°20′;
    // Saha Yogi is the Yoga-point sign lord; Ava Yogi is the Nakshatra lord
    // at Yoga point + 186°40′.
    const sun=pByEN('Sun'), moon=pByEN('Moon');
    let yogi='—', sahyogi='—', avayogi='—';
    let yogaPoint=NaN, avayogaPoint=NaN;
    if(Number.isFinite(lon(sun))&&Number.isFinite(lon(moon))){
      yogaPoint=((lon(sun)+lon(moon)+93+20/60)%360+360)%360;
      const yi=nakIndexOfLon(yogaPoint), ys=signOfLon(yogaPoint);
      const avp=((yogaPoint+186+40/60)%360+360)%360, ai=nakIndexOfLon(avp);
      yogi=ta?planetTA[nakLordEN[yi]]:nakLordEN[yi];
      sahyogi=ta?planetTA[lordEN[ys]]:lordEN[ys];
      avayogi=ta?planetTA[nakLordEN[ai]]:nakLordEN[ai];
    }

    // Thithi Shunya (Daghda) Rashis.
    // IMPORTANT: Only Tithi 15 (Purnima) and Tithi 30 (Amavasya)
    // have no Shunya Rasis. Do not treat every unmapped value as Purnima/Amavasya.
    // Dagdha / Thithi Shunya is based on the Tithi at the native's birth
    // date + birth time.  Krishna Paksha 1-14 repeats the same Dagdha-Rasi
    // rule as Shukla Paksha 1-14; only Purnima (15) and Amavasya (30) have none.
    // Sign indexes: Aries=0 ... Pisces=11.
    const tsMap={
      1:[6,9],  // Libra, Capricorn
      2:[8,11], // Sagittarius, Pisces
      3:[4,9],  // Leo, Capricorn
      4:[1,10], // Taurus, Aquarius
      5:[2,5],  // Gemini, Virgo
      6:[0,4],  // Aries, Leo
      7:[3,8],  // Cancer, Sagittarius
      8:[2,5],  // Gemini, Virgo
      9:[4,7],  // Leo, Scorpio
      10:[4,7], // Leo, Scorpio
      11:[8,11],// Sagittarius, Pisces
      12:[6,9], // Libra, Capricorn
      13:[1,4], // Taurus, Leo
      14:[2,5,8,11] // Gemini, Virgo, Sagittarius, Pisces
    };
    const tithiNamesEn=['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima','Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Amavasya'];
    const tithiNamesTa=['பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி','ஷஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','பௌர்ணமி','பிரதமை','துவிதியை','திரிதியை','சதுர்த்தி','பஞ்சமி','ஷஷ்டி','சப்தமி','அஷ்டமி','நவமி','தசமி','ஏகாதசி','துவாதசி','திரயோதசி','சதுர்த்தசி','அமாவாசை'];
    const calcSpecialTithi=(diff,multiplier)=>{
      if(!Number.isFinite(diff)) return null;
      const angle=((diff*multiplier)%360+360)%360;
      const n=Math.min(30,Math.floor(angle/12)+1);
      return {number:n,angle,name:ta?tithiNamesTa[n-1]:tithiNamesEn[n-1],paksha:n<=15?(ta?'சுக்ல பக்ஷம்':'Shukla Paksha'):(ta?'கிருஷ்ண பக்ஷம்':'Krishna Paksha')};
    };
    let tithiNo=0, shunyaSigns=[], baseDiff=NaN;
    if(Number.isFinite(lon(sun))&&Number.isFinite(lon(moon))){
      baseDiff=((lon(moon)-lon(sun))%360+360)%360;
      tithiNo=Math.min(30,Math.floor(baseDiff/12)+1);
    }
    // Use the Panchang calculated for the entered birth date + birth time as
    // the authoritative Tithi. This prevents today's Tithi or a stale value
    // from being used in Bhava Special Features.
    const bpTithi=Number(birthPanchang?.tithi?.number);
    if(Number.isFinite(bpTithi) && bpTithi>=1 && bpTithi<=30) tithiNo=bpTithi;
    // Krishna Paksha Tithis 16-29 correspond to numbered Tithis 1-14 for the
    // Dagdha/Shunya table. Purnima (15) and Amavasya (30) have no Shunya Rasi.
    const dagdhaTithiNo=tithiNo>15&&tithiNo<30?tithiNo-15:tithiNo;
    shunyaSigns=tsMap[dagdhaTithiNo]||[];
    const shunyaPlanets=ps.filter(p=>shunyaSigns.includes(signOfLon(lon(p)))).map(pName);
    const shunyaText=tithiNo?(
      shunyaSigns.length
        ? `${ta?'திதி':'Tithi'} · ${tithiNo>15&&tithiNo<30?(ta?'கிருஷ்ண பக்ஷம்':'Krishna Paksha'):(tithiNo<=15?(ta?'சுக்ல பக்ஷம்':'Shukla Paksha'):'')} · ${ta?'சூன்ய ராசிகள்':'Shunya Rasis'}: ${shunyaSigns.map(canonSign).join(', ')} · ${ta?'உள்ள கிரகங்கள்':'Planets'}: ${uniqJoin(shunyaPlanets)}`
        : (tithiNo===15
            ? (ta?'பௌர்ணமி — திதி சூன்யம் இல்லை':'Purnima — no Thithi Shunya')
            : tithiNo===30
              ? (ta?'அமாவாசை — திதி சூன்யம் இல்லை':'Amavasya — no Thithi Shunya')
              : `${ta?'திதி':'Tithi'} · ${ta?'சூன்ய ராசிகள் இல்லை':'No Shunya Rasis in the configured table'}`
          )
    ):'—';

    // Special tithis used for specific matters:
    // Santana = 5× Moon-Sun arc, Dana/Dhana = 2×, Karma = 10×.
    // Each produces a 1–30 lunar-day number.
    const santanaTithi=calcSpecialTithi(baseDiff,5);
    const danaTithi=calcSpecialTithi(baseDiff,2);
    const karmaTithi=calcSpecialTithi(baseDiff,10);
    const specialTithiText=(x)=>x
      ? `${ta?'திதி':'Tithi'} ${x.number} · ${x.name} · ${x.paksha}`
      : '—';

    // Mudakku is calculated from the natal Sun Nakshatra using the supplied
    // South-Indian Mudakku reference: count Moola from Sun's star, then the
    // same count from Purva Ashadha; Mudakku Rasi is derived from Sagittarius.
    const mudakkuBySunNak={
      'Ashwini':['Purva Phalguni','Leo'],'Bharani':['Magha','Leo'],'Krittika':['Ashlesha','Cancer'],'Rohini':['Pushya','Cancer'],
      'Mrigashira':['Punarvasu','Gemini'],'Ardra':['Ardra','Gemini'],'Punarvasu':['Mrigashira','Taurus'],'Pushya':['Rohini','Taurus'],
      'Ashlesha':['Krittika','Aries'],'Magha':['Bharani','Aries'],'Purva Phalguni':['Ashwini','Aries'],'Uttara Phalguni':['Revati','Pisces'],
      'Hasta':['Uttara Bhadrapada','Pisces'],'Chitra':['Purva Bhadrapada','Aquarius'],'Swati':['Shatabhisha','Aquarius'],'Vishakha':['Dhanishtha','Capricorn'],
      'Anuradha':['Shravana','Capricorn'],'Jyeshtha':['Uttara Ashadha','Sagittarius'],'Mula':['Purva Ashadha','Sagittarius'],'Purva Ashadha':['Mula','Sagittarius'],
      'Uttara Ashadha':['Jyeshtha','Scorpio'],'Shravana':['Anuradha','Scorpio'],'Dhanishtha':['Vishakha','Libra'],'Shatabhisha':['Swati','Libra'],
      'Purva Bhadrapada':['Chitra','Virgo'],'Uttara Bhadrapada':['Hasta','Virgo'],'Revati':['Uttara Phalguni','Leo']
    };
    const sunNakIdx=nakIndexOfLon(lon(sun));
    let sunNak=sunNakIdx>=0?nakEN[sunNakIdx]:'';
    if(sun?.nakshatra){
      const q=String(sun.nakshatra).toLowerCase().replace(/[\s_-]+/g,'');
      const nakAliases={mrigashira:'Mrigashira',mrigashirsha:'Mrigashira',mriga:'Mrigashira',punarvasu:'Punarvasu',pushya:'Pushya',ashlesha:'Ashlesha',magha:'Magha',purvaphalguni:'Purva Phalguni',uttaraphalguni:'Uttara Phalguni',chitra:'Chitra',vishakha:'Vishakha',anuradha:'Anuradha',jyeshtha:'Jyeshtha',mula:'Mula',purvaashadha:'Purva Ashadha',uttaraashadha:'Uttara Ashadha',shravan:'Shravana',shravana:'Shravana',dhanishtha:'Dhanishtha',shatabhisha:'Shatabhisha',purvabhadrapada:'Purva Bhadrapada',uttarabhadrapada:'Uttara Bhadrapada',revati:'Revati'};
      const ix=nakEN.findIndex(n=>q.includes(n.toLowerCase().replace(/\s+/g,'')));
      if(ix>=0)sunNak=nakEN[ix]; else if(nakAliases[q])sunNak=nakAliases[q];
    }
    const md=mudakkuBySunNak[sunNak]||null;
    const mudNak=md?.[0]||'—', mudRasi=md?.[1]||'—';
    const mudNakPlanets=ps.filter(p=>{const ni=nakIndexOfLon(lon(p));return ni>=0&&nakEN[ni]===mudNak;}).map(pName);
    const mudRasiIndex=enR.indexOf(mudRasi);
    const mudRasiPlanets=ps.filter(p=>signOfLon(lon(p))===mudRasiIndex).map(pName);
    const mudRasiText=md?`${ta?taR[enR.indexOf(mudRasi)]:mudRasi} · ${ta?'உள்ள கிரகங்கள்':'Planets'}: ${uniqJoin(mudRasiPlanets)}`:'—';
    const mudNakText=md?`${ta?nakTA[nakEN.indexOf(mudNak)]:mudNak} · ${ta?'உள்ள கிரகங்கள்':'Planets'}: ${uniqJoin(mudNakPlanets)}`:'—';

    const rows=[
      [ta?'புஷ்கர நவாம்சம்':'Pushkara Navamsa',uniqJoin(push)],
      [ta?'வர்க்கோத்தமம்':'Vargottama',uniqJoin(vargo)],
      [ta?'கிரக யுத்தம் / யுதி':'Graha Yutha',yuthaGroups.join(' · ')||'—'],
      [ta?'யோகி':'Yogi',yogi],
      [ta?'சஹ யோகி':'Saha Yogi',sahyogi],
      [ta?'அவ யோகி':'Ava Yogi',avayogi],
      [ta?'சந்தான திதி':'Santana Thithi',specialTithiText(santanaTithi)],
      [ta?'தான திதி':'Dana Thithi',specialTithiText(danaTithi)],
      [ta?'கர்ம திதி':'Karma Thithi',specialTithiText(karmaTithi)],
      // Keep Bhava Special Features intact. Only the Thithi NUMBER is hidden
      // in the Thithi Soonyam result; the section itself must remain visible.
      [ta?'திதி சூன்யம்':'Thithi Soonyam',shunyaText],
      [ta?'முடக்கு ராசி':'Mudakku Rasi',mudRasiText],
      [ta?'முடக்கு நட்சத்திரம்':'Mudakku Nakshatra',mudNakText]
    ];
    return `<div class="adv-section bhava-special-features"><h3>🔎 ${ta?'பாவ சிறப்பு அம்சங்கள்':'Bhava Special Features'}</h3><div class="adv-table-wrap"><table class="adv-wide bhava-special-table"><thead><tr><th>${ta?'அம்சம்':'Feature'}</th><th>${ta?'கிரகங்கள் / முடிவு':'Planets / Result'}</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${escv(r[0])}</th><td>${escv(r[1])}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function mountBhavaSpecialFeatures(d,birthPanchang,rootId){
    const root=document.getElementById(rootId);
    if(!root) return;
    // Always remove an older instance before mounting the current one.
    root.querySelectorAll('.bhava-special-features').forEach(el=>el.remove());
    const host=root.querySelector('.part1-chart-analysis') || root.querySelector('.smv-advanced-part') || root;
    // buildBhavaSpecialFeatures() returns an HTML STRING, not a DOM Node.
    // appendChild(string) throws TypeError, so the old code silently failed
    // inside loadAdvancedAstrology's catch blocks and the whole module vanished.
    host.insertAdjacentHTML('beforeend', buildBhavaSpecialFeatures(d,birthPanchang));
    const mounted=root.querySelector('.bhava-special-features');
    // If Advanced Analysis has already been organized, ensure this newly
    // mounted section is routed into Part I / Chart Analysis immediately.
    try{
      const advancedBox=root.classList?.contains('advanced-astro-grid')
        ? root
        : (root.querySelector('.advanced-astro-grid') || root.querySelector('.smv-advanced-shell')?.parentElement);
      const route=advancedBox?.__smvRouteAdvancedSections;
      if(typeof route==='function') route();
    }catch(_routeErr){ /* rendering must not fail because of organization */ }
    return mounted;
  }

  function render(d){
    const result=$('tamilHoroscopeResult');
    const name=($('tamilAstroName')?.value||'அன்பார்ந்தவர்').trim()||'அன்பார்ந்தவர்';
    const created=new Date().toLocaleDateString('ta-IN',{day:'2-digit',month:'long',year:'numeric'});
    const current=d.planets.find(x=>x.name==='சந்திரன்');
    result.setAttribute('aria-busy','false');
    result.innerHTML=`<div class="card" style="background:linear-gradient(180deg,#fffaf0,#fff)">
      <div class="home-rule"><span>☾</span><span>தமிழ் ஜாதக கணக்கீடு</span><span>☀</span></div>
      <h2 style="text-align:center">${esc(name)}</h2>
      <p class="small" style="text-align:center">பிறந்த தேதி: ${esc(fmtDate(d.birth.date))} · நேரம்: ${esc(d.birth.time)} · பிறந்த இடம்: ${esc($('tamilBirthPlace')?.value||d.birth?.place||'—')}</p>
      <div class="grid" style="margin-top:15px">
        <div class="stat"><span class="small">🔱 லக்னம்</span><p><b>${esc(d.lagna.rasi)}</b> · ${esc(d.lagna.degree)}</p><p class="small">${esc(d.lagna.nakshatra)} · பாதம் ${d.lagna.pada}<br>நெடுவரை: ${Number(d.lagna.longitude).toFixed(4)}°</p></div>
        <div class="stat"><span class="small">🌙 சந்திர ராசி</span><p><b>${esc(d.moonRasi)}</b> · ${esc(d.moonNakshatra)}<br>பாதம் ${d.moonPada}</p></div>
        </div>
      <div id="birthTimePanchangSlot" class="birth-panchang-before-rasi"></div>
      <div id="tamilDailyTransitPanchangSlot" class="daily-transit-panchang-slot"></div>
      <div class="smv-navagraha-prayer">
        <div class="smv-prayer-title">🕉️ NAVAGRAHA STOTRAM</div>
        <div class="smv-prayer-mantra">Om Namah Suryaya Chandraya<br/>Mangalaya Budhaya Cha |<br/>Guru Shukra Shanibhyashcha<br/>Rahave Ketave Namah ||</div>
      </div>
      <h3 style="margin-top:22px">🗺️ Rasi Chart (D-1)</h3>
      <div id="rasiChart" class="south-indian-chart" aria-label="ராசி கட்டம்"></div>
      <h3 style="margin-top:22px">🪷 Navamsa Chart ( D-9)</h3>
      <p class="small">ஒவ்வொரு கிரகத்தின் D9 நவாம்ச ராசி, லக்ன நவாம்சம் உட்பட.</p>
      <div id="navamsaChart" class="south-indian-chart" aria-label="நவாம்ச கட்டம்"></div>
      <div id="specialLagnasNextToNavamsa"></div>
      <h3 style="margin-top:22px" class="bhava-chart-title">📐 Bhava Chart</h3>
      <div id="bhavaChart" class="south-indian-chart bhava-chart" aria-label="Bhava Chart"></div>
      <h3 style="margin-top:22px" class="bhava-table-title">📋 Bhava Table</h3>
      <div class="data-table-wrap bhava-table-wrap"><table class="data-table bhava-table"><thead><tr><th>பாவம்</th><th>ஆரம்பம்</th><th>மத்தியம்</th><th>முடிவு</th><th>ராசி</th><th>கிரகங்கள்</th></tr></thead><tbody>${(d.bhavas||[]).map(b=>{const ps=(d.planets||[]).filter(p=>p.bhava===b.house).map(p=>p.name).join(', ');return `<tr><td><b>${b.house}</b></td><td>${esc(b.arambha||'—')}</td><td><b>${esc(b.madhya||b.degree||'—')}</b></td><td>${esc(b.antya||'—')}</td><td>${esc(b.rasi||'—')}</td><td>${esc(ps||'—')}</td></tr>`}).join('')}</tbody></table></div>
      <h3 style="margin-top:22px">🪷 நவாம்ச நிலைகள்</h3>
      <div class="data-table-wrap"><table class="data-table navamsa-table"><thead><tr><th>கிரகம்</th><th>Rasi Chart</th><th>D9 நவாம்ச ராசி</th><th>நவாம்ச பாதம்</th><th>பாவம்</th></tr></thead><tbody>${(d.planets||[]).map(p=>`<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.rasi)}</td><td>${esc(p.navamsa?.rasi||'—')}</td><td>${p.navamsa?.pada||'—'}</td><td>${p.bhava||'—'}</td></tr>`).join('')}</tbody></table></div>
      <h3 style="margin-top:22px">🪐 கிரக நிலைகள்</h3><p class="small">ஒவ்வொரு கிரகமும் தனி வரியில்: ராசி · பாகை · நட்சத்திரம் · பாதம்.</p>
      <div class="data-table-wrap"><table class="data-table"><thead><tr><th>கிரகம்</th><th>ராசி</th><th>பாகை</th><th>நட்சத்திரம்</th><th>பாதம்</th></tr></thead><tbody>${rows(d.planets,d.lagna,d.upagrahas?.maandi)}</tbody></table></div>
      <h3 class="base-planet-strength" style="margin-top:22px">💪 கிரக வலிமை & நிலை</h3>
      <p class="small">வக்கிரம், அஸ்தமனம் (Combustion), உச்சம்/நீசம், சுய ராசி மற்றும் மூலத்திரிகோணம் ஆகிய அடிப்படை நிலைகள்.</p>
      <div class="data-table-wrap"><table class="data-table strength-table"><thead><tr><th>கிரகம்</th><th>வக்கிரம்</th><th>அஸ்தமனம்</th><th>சூரிய தூரம்</th><th>ராசி நிலை</th></tr></thead><tbody>${(d.planets||[]).map(p=>{const s=p.strength||{};return `<tr><td><b>${esc(p.name)}</b></td><td>${s.retrograde?'ஆம்':'இல்லை'}</td><td>${s.combustion?'ஆம்':'இல்லை'}</td><td>${Number(s.sunDistance||0).toFixed(2)}°</td><td>${esc(s.relationship||'—')}</td></tr>`}).join('')}</tbody></table></div>
      <h3 class="base-shadbala" style="margin-top:22px">💪 Classical Parashari Shadbala</h3>
      <p class="small"><b>சூரியன் முதல் சனி வரை 7 கிரகங்களுக்கு</b> Classical-style Shadbala கணக்கீடு. 1 Rupa = 60 Virupa. Rahu/Ketu இந்த classical Shadbala total-ல் சேர்க்கப்படவில்லை.</p>
      <div class="data-table-wrap"><table class="data-table phase3-shadbala-table"><thead><tr><th>கிரகம்</th><th>ஸ்தான பலம்</th><th>திக் பலம்</th><th>கால பலம்</th><th>சேஷ்டா பலம்</th><th>நைசர்கிக பலம்</th><th>த்ரிக் பலம்</th><th>மொத்தம் / தேவையானது</th></tr></thead><tbody>${(d.planets||[]).filter(p=>p.strength3?.available).map(p=>{const s=p.strength3||{},c=s.components||{},k=c.kala||{},st=c.sthana||{};const total=Number(s.totalVirupa||0),req=Number(s.requiredVirupa||0),ratio=Number(s.ratio||0);return `<tr><td><b>${esc(p.name)}</b></td><td>${Number(st.total||0).toFixed(1)}<br><span class="small">உச்ச ${Number(st.uccha||0).toFixed(1)} · வர்க ${Number(st.saptavargaja||0).toFixed(1)}</span></td><td>${Number(c.dig||0).toFixed(1)}</td><td>${Number(k.total||0).toFixed(1)}<br><span class="small">நாதோ ${Number(k.natonnatha||0).toFixed(1)} · பக்ஷ ${Number(k.paksha||0).toFixed(1)} · அயன ${Number(k.ayana||0).toFixed(1)}</span></td><td>${Number(c.cheshta||0).toFixed(1)}</td><td>${Number(c.naisargika||0).toFixed(1)}</td><td>${Number(c.drik||0).toFixed(1)}</td><td><b>${total.toFixed(1)}</b> / ${req.toFixed(0)}<br><span class="small">${ratio>=1?'வலிமை':'தேவையான அளவுக்கு குறைவு'} · ${ratio.toFixed(2)}×</span></td></tr>`}).join('')}</tbody></table></div>
      <p class="small"><b>குறிப்பு:</b> Phase 3-ல் Sthana (Uchcha + Saptavargaja + Ojayugma + Kendradi + Drekkana), Dig, Kala, Cheshta, Naisargika மற்றும் Drik ஆகிய ஆறு classical components தனித்தனியாகக் கணக்கிடப்படுகின்றன. Cheshta/காலக் கணக்கீட்டில் பயன்படுத்தப்படும் சில time/mean-motion conventions lineage-க்கு ஏற்ப மாறக்கூடும்; ஆகவே இதை reference-grade software parity என்று கூறவில்லை.</p>
      <div class="transit-before-vimsottari"></div>
      <h3 style="margin-top:22px">📅 விம்சோத்தரி தசா</h3>
      <p class="small">மகாதசையை touch செய்தால் <b>புக்தி / அந்தர்தசை</b> திறக்கும். புக்தியை touch செய்தால் <b>அந்தரம் / பிரத்யந்தர்தசை</b> திறக்கும்.</p>
      <p class="small">பிறந்த நேர சந்திரனின் நட்சத்திரத்தை அடிப்படையாகக் கொண்ட ஆரம்ப மகாதசா balance: <b>${d.dashas.balanceYears} ஆண்டுகள்</b>.</p>
      <div id="dashaTree" class="dasha-tree"></div>
      <p class="small" style="margin-top:15px"><b>குறிப்பு:</b> இது astronomical ephemeris அடிப்படையிலான கணக்கீட்டு layer. பாரம்பரிய ஜோதிட பலன்கள் விளக்க/நம்பிக்கை சார்ந்தவை; முக்கிய வாழ்க்கை முடிவுகளுக்கு இதை ஒரே ஆதாரமாக பயன்படுத்த வேண்டாம்.</p>
      <div class="action-row horoscope-export-actions"><button class="btn smv-real-pdf-download" type="button" id="downloadTamilHoroscopePdf" hidden>⬇ Download Horoscope PDF</button><button class="btn gray" type="button" id="copyTamilHoroscope">📋 Copy Text</button></div>
    </div>`;
    const advHost=document.createElement('div');
    advHost.id='tamilAdvancedAstrology';
    advHost.className='hidden';
    advHost.style.marginTop='20px';
    result.appendChild(advHost);
    // Bhava Special Features is mounted only after Advanced Analysis is ready.
    // It is intentionally not placed in the core horoscope DOM, so an old copy
    // can never flash below Bhava Table while Transit/Panchang is loading.
    const chart=$('rasiChart');
    if(chart){
      // V165: display dynamic HOUSE numbers instead of zodiac symbols.
      // The sign boxes remain fixed; house 1 starts at the calculated D-1 Lagna sign.
      const signOrder=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
      const lagnaIndex=rasiIndex(d.lagna?.rasi);
      const houseForSign=si=>lagnaIndex>=0?((si-lagnaIndex+12)%12)+1:null;
      const bySign=Array.from({length:12},()=>[]);
      (d.planets||[]).forEach(p=>{const si=rasiIndex(p.rasi); if(si>=0) bySign[si].push({type:'planet',p});});
      if(d.upagrahas?.maandi?.rasi){ const si=rasiIndex(d.upagrahas.maandi.rasi); if(si>=0) bySign[si].push({type:'maandi',p:{...d.upagrahas.maandi,name:'மாந்தி',displayShort:'Md'}}); }
      let html='';
      signOrder.forEach((si,pos)=>{
        if(si===null){
          if(pos===5){
            html+=`<div class="south-chart-center">Rasi</div>`;
          }
          return;
        }
        const houseNo=houseForSign(si);
        const isLagna=si===lagnaIndex;
        const items=bySign[si].slice();
        const chartLang=getHoroscopeLang();
        const planetLines=items.map(item=>{ const p=item.p; const nm=item.type==='maandi'?'<span class="maandi-mark">Md</span>':planetDisplayName(p,chartLang); return `<div class="planet-line"><span class="planet-glyph">${nm}${degreeOnly(p)}</span></div>`; }).join('');
        html+=`<div class="south-rasi-cell"><div class="dynamic-rasi-number">${isLagna?'':(houseNo??'—')}</div>${isLagna?'<div class="lagna">'+(document.documentElement.lang==='ta'?'ல':'As')+'</div>':''}${planetLines}</div>`;
      });
      chart.innerHTML=html;
    }
    const navChart=$('navamsaChart');
    if(navChart){
      // V165: D9 house numbers also start from the calculated Navamsa Lagna.
      const order=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
      const bySign=Array.from({length:12},()=>[]);
      (d.planets||[]).forEach(p=>{const r=p.navamsa?.rasi; const si=rasiIndex(r); if(si>=0)bySign[si].push(p);});
      const lagnaD9=rasiIndex(d.navamsa?.lagna?.rasi);
      const houseForD9=si=>lagnaD9>=0?((si-lagnaD9+12)%12)+1:null;
      let h='';
      order.forEach((si,pos)=>{
        if(si===null){if(pos===5)h+=`<div class="south-chart-center">Navamsa</div>`;return;}
        const houseNo=houseForD9(si);
        const isLagna=si===lagnaD9;
        const chartLang=getHoroscopeLang();
        const ps=bySign[si].map(p=>`<div class="planet-line navamsa-planet-only"><span class="planet-glyph">${esc(shortPlanetName(p.name,chartLang))}</span></div>`).join('');
        h+=`<div class="south-rasi-cell"><div class="dynamic-rasi-number">${isLagna?'':(houseNo??'—')}</div>${isLagna?'<div class="lagna">'+(document.documentElement.lang==='ta'?'ல':'As')+'</div>':''}${ps||'<div class="small">—</div>'}</div>`;
      });
      navChart.innerHTML=h;
    }
    const bhChart=$('bhavaChart');
    if(bhChart){
      // Bhava Chalit: keep the 12 sidereal Rasi boxes fixed, but place each
      // planet in the Rasi/sign belonging to its calculated Bhava.  The
      // Bhava number is shown separately as a Roman numeral (I-XII).
      // Do NOT append the Bhava number to the planet name: e.g. Rahu in the
      // 3rd Bhava must render as "III" + "Ra" inside the Scorpio box, not "Ra III"
      // inside the 2nd-house/Rasi box.
      const bhavas=d.bhavas||[];
      const bhavaHouseBySign=Array.from({length:12},()=>[]);
      const bhavaSignByHouse=Array(13).fill(-1);
      bhavas.forEach(b=>{
        const house=Number(b.house);
        const si=Number.isFinite(b.rasiIndex)?b.rasiIndex:rasiIndex(b.rasi);
        if(house>=1 && house<=12 && si>=0){
          bhavaHouseBySign[si].push(house);
          bhavaSignByHouse[house]=si;
        }
      });
      const planetsByBhavaSign=Array.from({length:12},()=>[]);
      // IMPORTANT: Bhava Chart placement is driven by the Bhava Table.
      // Example: Bhava I -> Sphuta Rasi Virgo, Bhava II -> Libra,
      // Bhava III -> Scorpio. A planet's p.bhava determines the house;
      // the Bhava Table determines which fixed Rasi box receives it.
      // Therefore Jupiter with p.bhava=2 goes to Libra/II, while Rahu
      // with p.bhava=3 goes to Scorpio/III. Never append the house number
      // to the planet label (no "Ju II" or "Ra III").
      (d.planets||[]).forEach(p=>{
        const house=Number(p.bhava);
        const bhava=bhavas.find(b=>Number(b.house)===house);
        const si=bhava ? (Number.isFinite(Number(bhava.rasiIndex)) ? Number(bhava.rasiIndex) : rasiIndex(bhava.rasi)) : -1;
        if(si>=0) planetsByBhavaSign[si].push(p);
      });
      const bhOrder=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
      const romanHouse=n=>['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][Number(n)-1]||'—';
      let h='';
      bhOrder.forEach((si,pos)=>{
        if(si===null){ if(pos===5) h+=`<div class="south-chart-center">Bhava</div>`; return; }
        const chartLang=getHoroscopeLang();
        const houseLabels=bhavaHouseBySign[si].map(n=>`<div class="bhava-cusp"><span class="bhava-house-no">${romanHouse(n)}</span></div>`).join('');
        const ps=planetsByBhavaSign[si].map(p=>`<div class="planet-line"><span class="planet-glyph">${esc(shortPlanetName(p.name,chartLang))}</span></div>`).join('');
        h+=`<div class="south-rasi-cell bhava-rasi-cell">${houseLabels}${ps||'<div class="small">—</div>'}</div>`;
      });
      bhChart.innerHTML=h;
    }
    const dashaTree=$('dashaTree');
    if(dashaTree){
      const planetTa={
        'கேது':'கேது','சுக்கிரன்':'சுக்கிரன்','சூரியன்':'சூரியன்','சந்திரன்':'சந்திரன்','செவ்வாய்':'செவ்வாய்','ராகு':'ராகு','குரு':'குரு','சனி':'சனி','புதன்':'புதன்'
      };
      const periodHtml=(p,level,path)=>{
        const child=level===1?(p.antardashas||[]):[];
        const has=child.length>0;
        const mdName=planetTa[p.lord]||p.lord;
        return `<div class="dasha-node" data-level="1" data-path="${esc(path+'>'+p.lord)}">
          <button type="button" class="dasha-head" aria-expanded="false"><span><span class="dasha-title">${esc(mdName)}</span> <span class="dasha-dates">${esc(p.start)} → ${esc(p.end)}</span></span><span class="dasha-arrow">▶</span></button>
          <div class="dasha-body"><div class="dasha-breadcrumb">${esc(mdName+' Dasa')}</div>
            ${has?`<div class="small" style="margin-bottom:8px">Bhukthi — 9 துணைக் காலங்கள்</div>${child.map(x=>`<div class="dasha-node" data-level="2" data-path="${esc(p.lord+'>'+x.lord)}"><button type="button" class="dasha-head" aria-expanded="false"><span><span class="dasha-title">${esc(planetTa[x.lord]||x.lord)}</span> <span class="dasha-dates">${esc(x.start)} → ${esc(x.end)}</span></span><span class="dasha-arrow">▶</span></button><div class="dasha-body"><div class="dasha-breadcrumb">${esc((planetTa[p.lord]||p.lord)+' Dasa - '+(planetTa[x.lord]||x.lord)+' Bhukthi')}</div>${x.pratyantars?.length?`<table class="dasha-subtable"><thead><tr><th data-antara-header="1">Antharam</th><th>தொடக்கம்</th><th>முடிவு</th></tr></thead><tbody>${x.pratyantars.map(y=>`<tr><td><b>${esc(planetTa[y.lord]||y.lord)}</b></td><td>${esc(y.start)}</td><td>${esc(y.end)}</td></tr>`).join('')}</tbody></table>`:'<div class="dasha-empty">அந்தர காலங்கள் இல்லை.</div>'}</div></div>`).join('')}`:'<div class="dasha-empty">புக்தி தகவல் இல்லை.</div>'}
          </div></div>`;
      };
      const periods=d.dashas.periods||[];
      dashaTree.innerHTML=periods.map(p=>periodHtml(p,1,'மகாதசை')).join('');
      // Dasha interaction handlers are bound by bindHoroscopeInteractions(), including copied English results.
      // V147: show the current/next Bhukti and Antara immediately, while retaining full tap-to-expand details.
      const now=new Date();
      const contains=(x)=>{const a=new Date(String(x.start)+'T00:00:00');const b=new Date(String(x.end)+'T23:59:59');return a<=now&&now<=b;};
      let curMd=periods.find(contains)||periods[0];
      let curBi=curMd?.antardashas?.find(contains)||curMd?.antardashas?.[0];
      const mdIndex=Math.max(0,periods.indexOf(curMd));
      const biIndex=curMd?.antardashas?Math.max(0,curMd.antardashas.indexOf(curBi)):-1;
      const nextMd=periods[mdIndex+1]||null;
      const nextBi=(curMd?.antardashas?.[biIndex+1])||nextMd?.antardashas?.[0]||null;
      const nextAnt=curBi?.pratyantars?.find(contains);
      const antIndex=curBi?.pratyantars?Math.max(0,curBi.pratyantars.indexOf(nextAnt)):-1;
      const nextAntNext=(curBi?.pratyantars?.[antIndex+1])||nextBi?.pratyantars?.[0]||null;
      // V34: mark only the CURRENT Dasa / Bhukthi / Antharam for visual indication.
      const mdNodes=[...dashaTree.querySelectorAll(':scope > .dasha-node[data-level="1"]')];
      const currentMdNode=mdNodes[mdIndex]||null;
      if(currentMdNode) currentMdNode.classList.add('smv-current-dasha');
      const biNodes=currentMdNode?[...currentMdNode.querySelectorAll(':scope > .dasha-body > .dasha-node[data-level="2"]')]:[];
      const currentBiNode=biIndex>=0?(biNodes[biIndex]||null):null;
      if(currentBiNode) currentBiNode.classList.add('smv-current-bhukthi');
      const antRows=currentBiNode?[...currentBiNode.querySelectorAll(':scope > .dasha-body .dasha-subtable tbody tr')]:[];
      if(antIndex>=0 && antRows[antIndex]) antRows[antIndex].classList.add('smv-current-antharam');

      const summary=document.createElement('div'); summary.className='smv-dasha-next';
      const lord=(x)=>x?.lord||'—', dates=x=>x?`${x.start} → ${x.end}`:'—';
      summary.innerHTML=`<b>Current / Next Dasha</b><br>Mahadasha: <b>${esc(lord(curMd))}</b> (${esc(dates(curMd))})<br>Bhukti: <b>${esc(lord(curBi))}</b> (${esc(dates(curBi))}) → Next: <b>${esc(lord(nextBi))}</b> (${esc(dates(nextBi))})<br>Antara: <b>${esc(lord(nextAnt))}</b> (${esc(dates(nextAnt))}) → Next: <b>${esc(lord(nextAntNext))}</b> (${esc(dates(nextAntNext))})`;
      dashaTree.prepend(summary);
      // Open the current Mahadasha and current Bhukti so the next levels are visible without requiring multiple taps.
      const mdNode=dashaTree.querySelector('.dasha-node.smv-current-dasha')||dashaTree.querySelector('.dasha-node[data-level="1"]');
      if(mdNode){mdNode.classList.add('open');mdNode.querySelector(':scope > .dasha-head')?.setAttribute('aria-expanded','true');}
      const firstOpen=mdNode?.querySelector('.dasha-node.smv-current-bhukthi')||mdNode?.querySelector('.dasha-node[data-level="2"]');
      if(firstOpen){firstOpen.classList.add('open');firstOpen.querySelector(':scope > .dasha-head')?.setAttribute('aria-expanded','true');}
    }
    result.classList.remove('hidden');
    if(getHoroscopeLang()==='en') applyEnglishToHoroscope(result);
    // V171: export actions are bound once at document level in capture phase.
    // This survives result re-renders and copied English DOM without relying on
    // inline onclick handlers or a specific result element.
    if(!window.__smvExportGlobalBound){
      window.__smvExportGlobalBound=true;
      const showExportToast=(msg,ok=true,scope=null)=>{
        const host=scope||document.body;
        let t=host.querySelector?.('.smv-export-toast');
        if(!t){
          t=document.createElement('div');
          t.className='smv-export-toast';
          t.setAttribute('role','status');
          host.appendChild(t);
        }
        t.textContent=msg;
        t.classList.toggle('error',!ok);
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer=setTimeout(()=>t.classList.remove('show'),2200);
      };
      const copyTextFallback=async(text)=>{
        try{
          if(navigator.clipboard && typeof navigator.clipboard.writeText==='function'){
            await navigator.clipboard.writeText(text);
            return true;
          }
        }catch(_e){}
        try{
          const ta=document.createElement('textarea');
          ta.value=text;
          ta.setAttribute('readonly','');
          ta.style.position='fixed';ta.style.left='-10000px';ta.style.top='0';
          ta.style.width='1px';ta.style.height='1px';ta.style.opacity='0';
          document.body.appendChild(ta);
          ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);
          const ok=document.execCommand('copy');
          ta.remove();
          return !!ok;
        }catch(_e){return false;}
      };
      document.addEventListener('click',async(ev)=>{
        const btn=ev.target?.closest?.('#downloadTamilHoroscopePdf,#copyTamilHoroscope');
        if(!btn)return;
        ev.preventDefault();ev.stopImmediatePropagation();
        const scope=btn.closest('#tamilHoroscopeResult,#englishHoroscopeResult')||document.body;
        if(btn.id==='copyTamilHoroscope'){
          const text=scope.innerText||scope.textContent||'';
          const ok=await copyTextFallback(text);
          showExportToast(ok?'✓ Horoscope text copied':'Copy is not available in this browser. Long-press the text to copy.',ok,scope);
          return;
        }
        const paid=window.__smvHoroscopePaidState;
        if(!paid?.token){showExportToast('Paid Customer Login is required for PDF download.',false,scope);return;}
        const text=(scope.innerText||scope.textContent||'').replace(/\n{3,}/g,'\n\n').trim();
        showExportToast('Preparing horoscope PDF…',true,scope);
        try{
          const r=await fetch((paid.backend||'')+'/horoscope-feature/pdf',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',Authorization:'Bearer '+paid.token},body:JSON.stringify({feature:'advanced_analysis',language:document.documentElement.lang==='ta'?'ta':'en',title:(document.documentElement.lang==='ta'?'SMV ஜாதக அறிக்கை':'SMV Horoscope Report'),text})});
          if(!r.ok){const j=await r.json().catch(()=>({}));throw Error(j.error||'PDF generation failed.');}
          const blob=await r.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SMV-Horoscope.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);showExportToast('✓ Horoscope PDF downloaded',true,scope);
        }catch(e){showExportToast(e.message||'PDF download failed.',false,scope);}
      },true);
    }
    bindHoroscopeInteractions(result,d,name,getHoroscopeLang());
    result.scrollIntoView({behavior:'smooth',block:'start'});
  }
  if(!window.__smvPdfPaidListenerBound){window.__smvPdfPaidListenerBound=true;window.addEventListener('smv:horoscope-paid-access',ev=>{if(ev.detail?.feature!=='advanced_analysis')return;document.querySelectorAll('.smv-real-pdf-download').forEach(b=>b.hidden=false);});}
  function bindHoroscopeInteractions(root,d,name,lang){
    if(!root)return;
    // V151: use delegated interaction for BOTH Tamil and copied English results.
    // The English result is a newly-created DOM tree; direct listeners can be lost
    // when the result is copied/re-rendered. Delegation keeps the handler alive.
    if(root.dataset.smvDashaDelegated!=='1'){
      root.dataset.smvDashaDelegated='1';
      let lastToggleAt=0;
      const toggleFromEvent=(ev)=>{
        const btn=ev.target?.closest?.('.dasha-head');
        if(!btn || !root.contains(btn))return;
        if(ev.type==='pointerup' && ev.pointerType==='mouse')return;
        if(ev.type==='click' && Date.now()-lastToggleAt<450)return;
        ev.preventDefault(); ev.stopPropagation();
        const node=btn.closest('.dasha-node');
        if(!node)return;
        const open=!node.classList.contains('open');
        node.classList.toggle('open',open);
        btn.setAttribute('aria-expanded',String(open));
        if(ev.type!=='click')lastToggleAt=Date.now();
      };
      root.addEventListener('pointerup',toggleFromEvent,true);
      root.addEventListener('click',toggleFromEvent,true);
      root.addEventListener('keydown',(ev)=>{
        if(ev.key!=='Enter' && ev.key!==' ')return;
        const btn=ev.target?.closest?.('.dasha-head');
        if(!btn || !root.contains(btn))return;
        ev.preventDefault(); ev.stopPropagation();
        const node=btn.closest('.dasha-node');
        if(!node)return;
        const open=!node.classList.contains('open');
        node.classList.toggle('open',open);
        btn.setAttribute('aria-expanded',String(open));
      },true);
    }
    // Keep the buttons explicitly interactive on mobile browsers.
    root.querySelectorAll('.dasha-head').forEach(btn=>{
      btn.type='button';
      btn.style.pointerEvents='auto';
      btn.style.touchAction='manipulation';
      btn.tabIndex=0;
    });
    const mdNode=root.querySelector('.dasha-node.smv-current-dasha')||root.querySelector('.dasha-node[data-level="1"]');
    if(mdNode){
      mdNode.classList.add('open');
      mdNode.querySelector(':scope > .dasha-head')?.setAttribute('aria-expanded','true');
      const bhuktiNode=mdNode.querySelector(':scope > .dasha-body .dasha-node.smv-current-bhukthi')||mdNode.querySelector(':scope > .dasha-body .dasha-node[data-level="2"]');
      if(bhuktiNode){
        bhuktiNode.classList.add('open');
        bhuktiNode.querySelector(':scope > .dasha-head')?.setAttribute('aria-expanded','true');
      }
    }
    const aiBtn=root.querySelector('#generateAIFuture');
    if(aiBtn && aiBtn.dataset.smvBound!=='1'){
      aiBtn.dataset.smvBound='1';
      aiBtn.type='button';
      aiBtn.addEventListener('click',(ev)=>{
        ev.preventDefault(); ev.stopPropagation();
        generateAIFuture(d,name,lang,root);
      });
    }
  }

  async function generateAIFuture(d,name,langOverride,root){
    const scope=root||document;
    const btn=scope.querySelector('#generateAIFuture'), box=scope.querySelector('#aiFutureResult');
    if(!btn||!box)return;
    const lang=langOverride==='ta'||langOverride==='en'?langOverride:getHoroscopeLang();
    btn.disabled=true; btn.textContent=lang==='en'?'⏳ Generating AI Future Insights...':'⏳ AI பலன் உருவாக்கப்படுகிறது...';
    box.classList.remove('hidden'); box.innerHTML=`<p class="small">${lang==='en'?'AI is interpreting the verified horoscope data...':'சரிபார்க்கப்பட்ட ஜாதகத் தரவை AI விளக்குகிறது...'}</p>`;
    const chart={
      moonRasi:d.moonRasi, moonNakshatra:d.moonNakshatra, moonPada:d.moonPada,
      lagna:d.lagna, ayanamsa:d.ayanamsa, ayanamsaName:d.ayanamsaName,
      planets:(d.planets||[]).map(p=>({name:p.name,rasi:p.rasi,degree:p.degree,nakshatra:p.nakshatra,pada:p.pada,bhava:p.bhava,navamsa:p.navamsa?.rasi||null})),
      bhavas:(d.bhavas||[]).map(b=>({house:b.house,arambha:b.arambha,madhya:b.madhya,antya:b.antya,rasi:b.rasi})),
      dashas:(d.dashas?.mahadashas||d.dashas?.periods||[]).slice(0,12).map(x=>({name:x.name,start:x.start,end:x.end}))
    };
    try{
      const r=await fetch((window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||''))+'/api/horoscope/ai-future',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chart,language:lang})});
      const body=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(body.error||`AI generation failed (HTTP ${r.status})`);
      const text=String(body.text||'').trim();
      box.innerHTML=`<div class="home-rule"><span><img class="smv-brand-symbol" src="./assets/smv-brand-logo-v17.png" alt="" aria-hidden="true" width="20" height="20"></span><span>${lang==='en'?'AI Future Insights':'AI எதிர்கால பலன்'}</span><span><img class="smv-brand-symbol" src="./assets/smv-brand-logo-v17.png" alt="" aria-hidden="true" width="20" height="20"></span></div><p class="small">${esc(name)} · ${esc(body.model||'Gemini')}</p><div style="white-space:pre-wrap;line-height:1.75">${esc(text)}</div><p class="small" style="margin-top:14px"><b>${lang==='en'?'Note':'குறிப்பு'}:</b> ${lang==='en'?'This is a traditional astrology interpretation based on verified horoscope data; it is not a guarantee of future events.':'இது சரிபார்க்கப்பட்ட ஜாதகத் தரவை அடிப்படையாகக் கொண்ட பாரம்பரிய ஜோதிட விளக்கம் மட்டுமே; எதிர்கால நிகழ்வுகளுக்கான உத்தரவாதம் அல்ல.'}</p>`;
    }catch(e){box.innerHTML=`<div class="error"><b>${lang==='en'?'AI Future Insights could not be generated.':'AI பலன் உருவாக்க முடியவில்லை.'}</b><p class="small">${esc(e?.message||String(e))}</p></div>`;}
    finally{btn.disabled=false;btn.textContent=lang==='en'?'🔮 Generate AI Future Insights':'🔮 AI எதிர்கால பலன் உருவாக்குக';}
  }


/* SMV V8 NUMEROLOGY — source: user-provided Numerology.pdf (pp. 1–8).
   Body Number = birth-day digit total; Life Number = full DOB digit total;
   Name Number = source A–Z value table. Source pair matrix is keyed by Body-Life. */
(function(){
  const MATRIX={"1-1":[["1,10,19,28","6,15,24","4,13,22,31"],["மஞ்சள்","இளம் நீலம்"],["கனகபுஷ்பராகம்","மாணிக்கம்","தங்கபுஷ்பராகம்"],["கருப்பு","சிகப்பு","காப்பிகலர்"],["8,17,26"]],"1-2":[["1,10,19,28","6,15,24","7,16,25"],["இளம்மஞ்சள்","லேசான நீலம்","இளம்பச்சை"],["கனகபுஷ்பராகம்","முத்து","வைடுரியம்"],["கருப்பு","சிகப்பு"],["8,17,26","9,18,27"]],"1-3":[["1,10,19,28","3,12,21,30","5,14,23"],["இளம்மஞ்சள்","இளம்நீலம்","ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ நிறம்"],["கனகபுஷ்பராகம்","எமிதிஸ்ட்"],["கருப்பு","பச்சை"],["8,17,26"]],"1-4":[["1,10,19,28","6,15,24"],["மஞ்சள்","இளம்நீலம்"],["கனகபுஷ்பராகம்","இளம்நீலக்கல்"],["கருப்பு","சிவப்பு"],["8,17,26"]],"1-5":[["1,10,19,28","5,14,23","6,15,24"],["மஞ்சள்","இளம்நீலம்","சாம்பல்நிறம்"],["மாணிக்கம்","வைரம்","கனகபுஷ்பராகம்"],["கருப்பு","காப்பிகலர்"],["8,17,26"]],"1-6":[["1,10,19,28","6,15,24","9,18,27"],["மஞ்சள்","இளம்நீலம்","பச்சை"],["கனகபுஷ்பராகம்","மாணிக்கம்","மரகதம்"],["கருப்பு","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30","8,17,26"]],"1-7":[["1,10,19,28","2,11,20,29","6,15,24"],["மஞ்சள்","இளம்நீலம்","இளம்பச்சை"],["கனகபுஷ்பராகம்","தங்கபுஷ்பராகம்","வைடுரியம்","முத்து"],["கருப்பு","சிவப்பு"],["9,18,27","8,17,26"]],"1-8":[["1,10,19,28","5,14,23","6,15,24"],["மஞ்சள்","நீலம்"],["தங்கபுஷ்பராகம்","கனகபுஷ்பராகம்"],["கருப்பு","சிவப்பு"],["8,17,26"]],"1-9":[["1,10,19,28","9,18,27","6,15,24"],["மஞ்சள்","நீலம்"],["கனகபுஷ்பராகம்","மாணிக்கம்","தங்கபுஷ்பராகம்"],["கருப்பு","பச்சை"],["7,16,25","8,17,26"]],"2-1":[["7,16,25","6,15,24","1,10,19,28"],["மஞ்சள்","வெளிர்நீலம்","இளம்பச்சை"],["தங்கபுஷ்பராகம்","வைடுரியம்","முத்து"],["கருப்பு","சிவப்பு"],["9,18,27","8,17,26"]],"2-2":[["7,16,25","6,15,24"],["பச்சை","இளநீலம்"],["வைடுரியம்","முத்து"],["சிகப்பு"],["9,18,27"]],"2-3":[["7,16,25","3,12,21,30","5,14,23"],["இளம்மஞ்சள்","இளநீலம்"],["வைடுரியம்","முத்து"],["சிகப்பு"],["9,18,27","6,15,24"]],"2-4":[["6,15,24","2,11,20,29","1,10,19,28"],["இளம்மஞ்சள்","இளநீலம்","பச்சை"],["வைடுரியம்","முத்து"],["கருப்பு","சிவப்பு"],["9,18,27","8,17,26"]],"2-5":[["7,16,25","5,14,23","6,15,24"],["பச்சை","சாம்பல்நிறம்"],["வைடுரியம்","முத்து","சந்திரகாந்தக்கல்"],["சிவப்பு"],["9,18,27"]],"2-6":[["7,16,25","6,15,24"],["இளநீலம்","பச்சை"],["வைடுரியம்","சந்திரகாந்தக்கல்","ஜேட்"],["சிவப்பு","ஆரஞ்சு","ரோஸ்","கத்தரிப்பூ"],["9,18,27"]],"2-7":[["6,15,24","7,16,25"],["இளம்மஞ்சள்","வெளிர்நீலம்","பச்சை"],["வைடுரியம்","முத்து","சந்திரகாந்தக்கல்","ஜேட்"],["சிவப்பு"],["9,18,27"]],"2-8":[["7,16,25","5,14,23","6,15,24"],["பச்சை","கருநீலம்","மஞ்சள்"],["வைடுரியம்","முத்து","சந்திரகாந்தக்கல்"],["கருப்பு","சிவப்பு"],["9,18,27"]],"2-9":[["6,15,24","5,14,23"],["இளநீலம்","இளம்மஞ்சள்"],["வைடுரியம்","முத்து","சந்திரகாந்தக்கல்"],["சிவப்பு"],["9,18,27"]],"3-1":[["3,12,21,30","9,18,27","1,10,19,28"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","நீலம்","மஞ்சள்"],["தங்கபுஷ்பராகம்","கனகபுஷ்பராகம்","எமிதிஸ்ட்"],["கருப்பு","பச்சை"],["6,15,24"]],"3-2":[["3,12,21,30","7,16,25","5,14,23"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["எமிதிஸ்ட்","சந்திரகாந்தக்கல்","டைகர்ஸ் ஐ"],["பச்சை","சிகப்பு"],["6,15,24","9,18,27"]],"3-3":[["3,12,21,30","9,18,27","5,14,23"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["எமிதிஸ்ட்"],["பச்சை"],["6,15,24"]],"3-4":[["3,12,21,30","1,10,19,28"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","இளம்மஞ்சள்","இளம்நீலம்"],["கனகபுஷ்பராகம்","எமிதிஸ்ட்"],["பச்சை"],["6,15,24"]],"3-5":[["3,12,21,30","5,14,23","9,18,27"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","சாம்பல்நிறம்","இளம்நீலம்"],["எமிதிஸ்ட்","வைரம்","சிர்கான்"],["பச்சை"],["6,15,24"]],"3-6":[["1,10,19,28","9,18,27"],["இளநீலம்","இளமஞ்சள்"],["தங்கபுஷ்பராகம்","கனகபுஷ்பராகம்","வெண்புஷ்பராகம்"],[],[]],"3-7":[["2,11,20,29","3,12,21,30"],["இளநீலம்","ஆரஞ்சு","கத்தரிப்பூ","மஞ்சள்"],["எமிதிஸ்ட்","வைடுரியம்"],["சிகப்பு"],["6,15,24"]],"3-8":[["3,12,21,30","5,14,23","1,10,19"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","மஞ்சள்"],["எமிதிஸ்ட்","நீலக்கல்"],["சிகப்பு","கருப்பு","பச்சை"],["6,15,24","8,17,26"]],"3-9":[["3,12,21,30","5,14,23","1,10,19"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","சிகப்பு"],["எமிதிஸ்ட்","பவளம்","நவரத்தினம்"],["பச்சை"],["6,15,24","2,11,20,29","7,16,25"]],"4-1":[["1,10,19,28","6,15,24"],["மஞ்சள்","நீலம்"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு"],["8,17,26"]],"4-2":[["6,15,24","1,10,19,28"],["மஞ்சள்","இளம்நீலம்","சந்தனகலர்","வெளிர்பச்சை"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு","காபிகலர்"],["8,17,26"]],"4-3":[["1,10,19,28","3,12,21,30"],["மஞ்சள்","இளம்நீலம்","கத்தரிப்பூ","ரோஸ்","ஆரஞ்சு"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு","பச்சை"],["8,17,26","6,15,24"]],"4-4":[["1,10,19,28","6,15,24"],["மஞ்சள்","இளம்நீலம்","சந்தனகலர்"],["கோமேதகம்","வெளிர்நீலக்கல்"],["கருப்பு","சிகப்பு","காபிகலர்"],["8,17,26"]],"4-5":[["1,10,19,28","6,15,24","5,14,23"],["மஞ்சள்","இளம்நீலம்","சந்தனகலர்","சாம்பல்நிறம்"],["கோமேதகம்","வைரம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு","காபிகலர்"],["8,17,26"]],"4-6":[["1,10,19,28","6,15,24"],["மஞ்சள்","இளம்நீலம்","இளம்பச்சை"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு","கத்தரிப்பூ"],["8,17,26","3,12,21,30"]],"4-7":[["6,15,24","1,10,19,28"],["மஞ்சள்","இளம்நீலம்","இளம்பச்சை"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","சிகப்பு","காபிகலர்"],["8,17,26","9,18,27"]],"4-8":[["1,10,19,28","6,15,24","5,14,23"],["மஞ்சள்","நீலம்","இளம்நீலம்"],["கோமேதகம்","நீலக்கல்"],["கருப்பு","சிகப்பு","காபிகலர்"],["8,17,26"]],"4-9":[["6,15,24","1,10,19,28","5,14,23"],["மஞ்சள்","நீலம்","சிவப்பு"],["கோமேதகம்","இளம்நீலக்கல்"],["கருப்பு","காபிகலர்"],["8,17,26","2,11,20,29","7,16,25"]],"5-1":[["5,14,23","1,10,19,28","6,15,24"],["சாம்பல்நிறம்","மஞ்சள்","இளநீலம்"],["வைரம்","ஜிர்கான்","கனகபுஷ்பராகம்"],["கருப்பு"],[]],"5-2":[["5,14,23","7,16,25"],["சாம்பல்நிறம்","இளம்பச்சை","இளநீலம்"],["வைரம்","ஜிர்கான்","டைகர்ஸ் ஐ","மூன்ஸ்டோன்"],["சிகப்பு"],["9,18,27"]],"5-3":[["5,14,23","3,12,21,30","9,18,27"],["இளநீலம்","சாம்பல்நிறம்","ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["வைரம்","ஜிர்கான்","எமிதிஸ்ட்"],["பச்சை"],["6,15,24"]],"5-4":[["5,14,23","1,10,19,28","6,15,24"],["இளமஞ்சள்","இளநீலம்","சாம்பல்நிறம்"],["வைரம்","ஜிர்கான்","கோமேதகம்"],["கருப்பு"],[]],"5-5":[["5,14,23","9,18,27","3,12,21,30"],["சாம்பல்நிறம்"],["வைரம்","ஜிர்கான்"],[],[]],"5-6":[["5,14,23","6,15,24","1,10,19,28"],["சாம்பல்நிறம்","இளம்பச்சை","இளநீலம்"],["வைரம்","ஜிர்கான்","மரகதம்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"5-7":[["5,14,23","2,11,20,29","6,15,24"],["சாம்பல்நிறம்","பச்சை","இளநீலம்","இளமஞ்சள்"],["வைரம்","ஜிர்கான்"],["சிகப்பு"],["9,18,27"]],"5-8":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","சாம்பல்நிறம்"],["வைரம்","ஜிர்கான்"],["கருப்பு","சிகப்பு"],[]],"5-9":[["5,14,23","9,18,27","6,15,24","3,12,21,30"],["சிகப்பு","சாம்பல்நிறம்"],["வைரம்","ஜிர்கான்","பவளம்"],["பச்சை"],["2,11,20,29","7,16,25"]],"6-1":[["1,10,19,28","6,15,24","9,18,27"],["மஞ்சள்","பச்சை"],["எமரால்ட் (மரகதம்)"],["ஆரஞ்சு","ரோஸ்"],["3,12,21,30"]],"6-2":[["6,15,24","7,16,25","1,10,19,28"],["பச்சை","இளநீலம்"],["மரகதம்","ஜேட்","டைகர்ஸ் ஐ","மூன்ஸ்டோன்"],["சிகப்பு","ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"6-3":[["1,10,19,28","9,18,27"],["இளம்மஞ்சள்","இளநீலம்"],["தங்கபுஷ்பராகம்","கனகபுஷ்பராகம்"],[],[]],"6-4":[["6,15,24","1,10,19,28"],["பச்சை","இளநீலம்","மஞ்சள்"],["மரகதம்","கோமேதகம்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","கருப்பு","சிவப்பு"],["3,12,21,30"]],"6-5":[["6,15,24","1,10,19,28","5,14,23"],["பச்சை","நீலம்","சாம்பல்நிறம்","மஞ்சள்"],["மரகதம்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"6-6":[["1,10,19,28","6,15,24","9,18,27"],["பச்சை","வெளிர்நீலம்"],["மரகதம்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"6-7":[["6,15,24","2,11,20,29"],["பச்சை","இளநீலம்","இளம்மஞ்சள்"],["மரகதம்","ஜேட்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ","சிவப்பு"],["3,12,21,30","9,18,27"]],"6-8":[["6,15,24","5,14,23"],["நீலம்","பச்சை","மஞ்சள்"],["மரகதம்","நீலக்கல்"],["கருப்பு","சிவப்பு","ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"6-9":[["6,15,24","9,18,27"],["இளம்பச்சை","சிகப்பு","இளநீலம்"],["மரகதம்","பவளம்"],["ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["3,12,21,30"]],"7-1":[["6,15,24","1,10,19,28","2,11,20,29"],["பச்சை","மஞ்சள்","நீலம்","சந்தனநிறம்"],["மூன்ஸ்டோன்","முத்து","வைடுரியம்","தங்கபுஷ்பராகம்","கனகபுஷ்பராகம்"],["கருப்பு","சிகப்பு"],["9,18,27","8,17,26"]],"7-2":[["6,15,24","2,11,20,29"],["பச்சை","இளநீலம்","மஞ்சள்"],["வைடுரியம்","சந்திரகாந்தக்கல்","டைகர்ஸ் ஐ"],["சிகப்பு"],["9,18,27"]],"7-3":[["2,11,20,29","5,14,23","3,12,21,30"],["இளநீலம்","இளம்மஞ்சள்"],["வைடுரியம்","முத்து","மூன்ஸ்டோன்","டைகர்ஸ் ஐ"],["சிகப்பு"],["9,18,27","6,15,24"]],"7-4":[["6,15,24","1,10,19,28","2,11,20,29"],["பச்சை","மஞ்சள்","நீலம்"],["வைடுரியம்","மூன்ஸ்டோன்","கோமேதகம்","டைகர்ஸ் ஐ"],["சிகப்பு","கருப்பு"],["9,18,27","8,17,26"]],"7-5":[["2,11,20,29","5,14,23","6,15,24"],["பச்சை","மஞ்சள்","சாம்பல்நிறம்","லேசானநீலம்"],["வைடுரியம்","டைகர்ஸ் ஐ","மூன்ஸ்டோன்","வைரம்"],["சிகப்பு","கருப்பு"],["9,18,27"]],"7-6":[["2,11,20,29","6,15,24","1,10,19,28"],["பச்சை","இளநீலம்","இளம்மஞ்சள்"],["வைடுரியம்","மூன்ஸ்டோன்","டைகர்ஸ் ஐ"],["ரோஸ்","ஆரஞ்சு","சிகப்பு","கத்தரிப்பூ"],["9,18,27","3,12,21,30"]],"7-7":[["2,11,20,29","6,15,24","5,14,23"],["பச்சை","இளநீலம்","இளம்மஞ்சள்"],["வைடுரியம்","முத்து","மூன்ஸ்டோன்","டைகர்ஸ் ஐ"],["சிகப்பு"],["9,18,27"]],"7-8":[["2,11,20,29","5,14,23","6,15,24"],["பச்சை","நீலம்","மஞ்சள்"],["வைடுரியம்","மூன்ஸ்டோன்","டைகர்ஸ் ஐ"],["சிகப்பு"],["9,18,27","8,17,26"]],"7-9":[["6,15,24","5,14,23"],["இளநீலம்","இளம்மஞ்சள்","மஞ்சள்"],["வைடுரியம்","மூன்ஸ்டோன்","டைகர்ஸ் ஐ"],[],[]],"8-1":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","மஞ்சள்"],["நீலக்கல்","கனகபுஷ்பராகம்","நீல அக்வாமரின்"],["கருப்பு","சிகப்பு"],["8,17,26"]],"8-2":[["5,14,23","6,15,24","7,16,25"],["நீலம்","பச்சை","மஞ்சள்"],["நீலக்கல்","வைடுரியம்","சந்திரகாந்தக்கல்","டைகர்ஸ் ஐ"],["கருப்பு","சிகப்பு"],["9,18,27","8,17,26"]],"8-3":[["5,14,23","3,12,21,30","1,10,19,28"],["நீலம்","மஞ்சள்","கத்தரிப்பூ"],["நீலக்கல்","எமிதிஸ்ட்"],["கருப்பு","சிகப்பு","பச்சை"],["8,17,26","6,15,24"]],"8-4":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","மஞ்சள்"],["நீலக்கல்","இளம்நீலக்கல்","கோமேதகம்"],["கருப்பு","சிகப்பு"],["9,18,27"]],"8-5":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","மஞ்சள்","சாம்பல்நிறம்"],["நீலக்கல்","வைரம்"],["கருப்பு","சிகப்பு"],["8,17,26"]],"8-6":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","பச்சை","மஞ்சள்"],["நீலக்கல்","மரகதம்"],["கருப்பு","சிகப்பு"],["3,12,21,30","8,17,26"]],"8-7":[["5,14,23","6,15,24"],["நீலம்","மஞ்சள்","பச்சை"],["முத்து","நீலக்கல்","வைடுரியம்","மூன்ஸ்டோன்"],["கருப்பு","சிகப்பு"],["8,17,26"]],"8-8":[["5,14,23","6,15,24","1,10,19,28"],["நீலம்","மஞ்சள்"],["நீலக்கல்"],["கருப்பு","சிகப்பு"],["9,18,27"]],"8-9":[["5,14,23","6,15,24","9,18,27","1,10,19,28"],["நீலம்","மஞ்சள்"],["நீலக்கல்","நீல அக்வாமரின்"],["கருப்பு","பச்சை"],["8,17,26","7,16,25","2,11,20,29"]],"9-1":[["5,14,23","6,15,24","9,18,27","1,10,19,28"],["இளநீலம்","மஞ்சள்","சிகப்பு"],["பவளம்","மாணிக்கம்","கனகபுஷ்பராகம்","தங்கபுஷ்பராகம்","நவரத்தினம்"],["கருப்பு","பச்சை"],["2,11,20,29","7,16,25"]],"9-2":[["6,15,24","5,14,23"],["இளநீலம்","மஞ்சள்","நீலம்"],["மூன்ஸ்டோன்","வைடுரியம்","டைகர்ஸ் ஐ"],[],[]],"9-3":[["9,18,27","5,14,23","3,12,21,30"],["இளநீலம்","மஞ்சள்","சிகப்பு","கத்தரிப்பூ","ரோஸ்","ஆரஞ்சு"],["பவளம்","எமிதிஸ்ட்","நவரத்தினம்"],["பச்சை"],["2,11,20,29","7,16,25"]],"9-4":[["9,18,27","5,14,23","1,10,19,28","6,15,24"],["இளநீலம்","சிகப்பு","இளம்மஞ்சள்"],["பவளம்","கோமேதகம்","இளம்நீலக்கல்","நவரத்தினம்"],["பச்சை","கருப்பு"],["2,11,20,29","7,16,25"]],"9-5":[["9,18,27","5,14,23","6,15,24"],["இளநீலம்","சிகப்பு","சாம்பல்நிறம்"],["பவளம்","வைரம்","நவரத்தினம்"],["பச்சை"],["2,11,20,29","7,16,25"]],"9-6":[["9,18,27","1,10,19,28","6,15,24"],["இளநீலம்","சிகப்பு","இளம்மஞ்சள்"],["பவளம்"],["கரும்பச்சை","ரோஸ்","ஆரஞ்சு","கத்தரிப்பூ"],["2,11,20,29","7,16,25"]],"9-7":[["6,15,24"],["இளநீலம்","மஞ்சள்"],["மூன்ஸ்டோன்","வைடுரியம்"],[],[]],"9-8":[["6,15,24","5,14,23","9,18,27"],["சிகப்பு","நீலம்","மஞ்சள்"],["பவளம்","நீலக்கல்"],["கருப்பு","காப்பிகலர்","பச்சை"],["2,11,20,29","7,16,25","8,17,26"]],"9-9":[["6,15,24","5,14,23","9,18,27"],["சிகப்பு","நீலம்","மஞ்சள்"],["பவளம்"],["பச்சை"],["2,11,20,29","7,16,25"]]};
  const PLANETS={1:['Sun','சூரியன்'],2:['Moon','சந்திரன்'],3:['Jupiter','குரு'],4:['Rahu','ராகு'],5:['Mercury','புதன்'],6:['Venus','சுக்கிரன்'],7:['Ketu','கேது'],8:['Saturn','சனி'],9:['Mars','செவ்வாய்']};
  const LETTER={A:1,J:1,I:1,Y:1,Q:1,B:2,K:2,R:2,C:3,G:3,L:3,S:3,D:4,M:4,T:4,E:5,H:5,N:5,X:5,U:6,V:6,W:6,O:7,Z:7,F:8,P:8};
  const COLOR_EN={'மஞ்சள்':'Yellow','இளம் நீலம்':'Light Blue','இளநீலம்':'Light Blue','இளம்மஞ்சள்':'Light Yellow','இளமஞ்சள்':'Light Yellow','லேசான நீலம்':'Pale Blue','லேசானநீலம்':'Pale Blue','வெளிர்நீலம்':'Pale Blue','பச்சை':'Green','இளம்பச்சை':'Light Green','வெளிர்பச்சை':'Pale Green','நீலம்':'Blue','கருநீலம்':'Dark Blue','சாம்பல்நிறம்':'Grey','ரோஸ்':'Rose / Pink','ஆரஞ்சு':'Orange','கத்தரிப்பூ':'Violet','கத்தரிப்பூ நிறம்':'Violet','சிகப்பு':'Red','சிவப்பு':'Red','சந்தனகலர்':'Sandal','சந்தனநிறம்':'Sandal','கருப்பு':'Black','காப்பிகலர்':'Coffee / Brown','கரும்பச்சை':'Dark Green'};
  const GEM_EN={'கனகபுஷ்பராகம்':'Kanaka Pushparagam','மாணிக்கம்':'Ruby','தங்கபுஷ்பராகம்':'Thanga Pushparagam','முத்து':'Pearl','வைடுரியம்':"Cat's Eye",'எமிதிஸ்ட்':'Amethyst','இளம்நீலக்கல்':'Light Blue Stone','வெளிர்நீலக்கல்':'Pale Blue Stone','மரகதம்':'Emerald','எமரால்ட் (மரகதம்)':'Emerald','சந்திரகாந்தக்கல்':'Moonstone','மூன்ஸ்டோன்':'Moonstone','ஜேட்':'Jade','டைகர்ஸ் ஐ':"Tiger's Eye",'கோமேதகம்':'Hessonite','வைரம்':'Diamond','சிர்கான்':'Zircon','ஜிர்கான்':'Zircon','பவளம்':'Coral','நவரத்தினம்':'Navaratna','நீலக்கல்':'Blue Sapphire','நீல அக்வாமரின்':'Blue Aquamarine','வெண்புஷ்பராகம்':'White Pushparagam'};
  const reduce=n=>{n=Math.abs(Number(n)||0); while(n>9)n=String(n).split('').reduce((a,c)=>a+(+c||0),0); return n||0;};
  const tamilToLatin=(src)=>{
    let s=String(src||'').normalize('NFC');
    const indep={'அ':'A','ஆ':'A','இ':'I','ஈ':'I','உ':'U','ஊ':'U','எ':'E','ஏ':'E','ஐ':'AI','ஒ':'O','ஓ':'O','ஔ':'AU'};
    const cons={'க':'K','ங':'N','ச':'S','ஞ':'N','ட':'T','ண':'N','த':'T','ந':'N','ப':'P','ம':'M','ய':'Y','ர':'R','ல':'L','வ':'V','ழ':'L','ள':'L','ற':'R','ன':'N','ஜ':'J','ஷ':'S','ஸ':'S','ஹ':'H'};
    const vowel={'ா':'A','ி':'I','ீ':'I','ு':'U','ூ':'U','ெ':'E','ே':'E','ை':'AI','ொ':'O','ோ':'O','ௌ':'AU'};
    let out='';
    for(let i=0;i<s.length;i++){
      const ch=s[i];
      if(indep[ch]){out+=indep[ch];continue;}
      if(cons[ch]){
        const nx=s[i+1]||''; out+=cons[ch];
        if(nx==='்'){i++;continue;}
        if(vowel[nx]){out+=vowel[nx];i++;continue;}
        out+='A'; continue;
      }
      if(/[A-Za-z]/.test(ch))out+=ch.toUpperCase();
    }
    return out;
  };
  const calc=(name,dob)=>{
    const parts=String(dob||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!parts)return null;
    const y=parts[1],m=parts[2],d=parts[3];
    const body=reduce(Number(d));
    const life=reduce((y+m+d).split('').reduce((a,c)=>a+(+c||0),0));
    const latin=/[\u0B80-\u0BFF]/.test(String(name||''))?tamilToLatin(name):String(name||'').toUpperCase();
    const nameTotal=[...latin].reduce((a,c)=>a+(LETTER[c]||0),0);
    const nameNumber=nameTotal?reduce(nameTotal):0;
    return {body,life,nameNumber,nameTotal,latin,profile:MATRIX[body+'-'+life]||null};
  };
  const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=(arr,lang,kind)=>{if(!arr||!arr.length)return lang==='ta'?'இல்லை':'None'; return arr.map(x=>lang==='ta'?x:(kind==='color'?(COLOR_EN[x]||x):kind==='gem'?(GEM_EN[x]||x):x)).join(', ');};
  window.__smvRenderNumerologyModule=function(name,dob,lang){
    const ta=lang==='ta', r=calc(name,dob);
    if(!r)return `<div class="adv-section numerology-module"><p class="small">${ta?'எண் கணிதத்திற்கு பிறந்த தேதி தேவை.':'Date of birth is required for Numerology.'}</p></div>`;
    const p=r.profile||[[],[],[],[],[]];
    const planet=n=>n?(ta?PLANETS[n][1]:PLANETS[n][0]):'—';
    const num=n=>n?`${n} (${planet(n)})`:'—';
    const rows=[
      [ta?'பிறந்த தேதி':'Date of Birth',dob],
      [ta?'பெயர்':'Name',name||'—'],
      [ta?'உடல் எண்':'Body Number',num(r.body)],
      [ta?'உயிர் எண்':'Life Number',num(r.life)],
      [ta?'பெயர் எண்':'Name Number',num(r.nameNumber)],
      [ta?'யோகமான தேதிகள்':'Lucky Dates',list(p[0],lang)],
      [ta?'யோகமான நிறங்கள்':'Lucky Colors',list(p[1],lang,'color')],
      [ta?'யோகமான மோதிரக்கல்':'Lucky Gemstones',list(p[2],lang,'gem')],
      [ta?'ஆகாத நிறங்கள்':'Unfavourable Colors',list(p[3],lang,'color')],
      [ta?'ஆகாத தேதிகள்':'Unfavourable Dates',list(p[4],lang)]
    ];
    const trs=rows.map(x=>`<tr><th style="text-align:left;white-space:normal">${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`).join('');
    const translit=/[\u0B80-\u0BFF]/.test(String(name||''))?`<p class="small" style="margin-top:10px">${ta?'குறிப்பு: PDF-இல் பெயர் எண் A–Z எழுத்து மதிப்புகளால் கொடுக்கப்பட்டுள்ளது. தமிழ் பெயர் உள்ளீட்டில் phonetic transliteration செய்து அதே A–Z மதிப்புகள் பயன்படுத்தப்படுகின்றன.':'Note: the source defines Name Number with A–Z values. Tamil-script names are phonetically transliterated before applying the same A–Z values.'}</p>`:'';
    return `<div class="adv-section numerology-module"><h3>🔢 ${ta?'எண் கணித முடிவு':'Numerology Result'}</h3><div class="adv-table-wrap"><table class="adv-wide"><tbody>${trs}</tbody></table></div>${translit}</div>`;
  };
})();

  function renderAdvancedAstrology(data, lang, rootId){
    window.__smvDeitiesData=data;
    const box=document.getElementById(rootId); if(!box)return;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // Shared rendering helpers must be initialized before any Phase 1/2/3 section uses them.
    const escSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ta=lang==='ta';
    const R=ta?['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const planetMap={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
    const nakMap={அஸ்வினி:'Ashwini',பரணி:'Bharani',கார்த்திகை:'Krittika',ரோகிணி:'Rohini',மிருகசீரிஷம்:'Mrigashira',திருவாதிரை:'Ardra',புனர்பூசம்:'Punarvasu',பூசம்:'Pushya',ஆயில்யம்:'Ashlesha',மகம்:'Magha',பூரம்:'Purva Phalguni',உத்திரம்:'Uttara Phalguni',ஹஸ்தம்:'Hasta',சித்திரை:'Chitra',சுவாதி:'Swati',விசாகம்:'Vishakha',அனுஷம்:'Anuradha',கேட்டை:'Jyeshtha',மூலம்:'Mula',பூராடம்:'Purva Ashadha',உத்திராடம்:'Uttara Ashadha',திருவோணம்:'Shravana',அவிட்டம்:'Dhanishtha',சதயம்:'Shatabhisha',பூரட்டாதி:'Purva Bhadrapada',உத்திரட்டாதி:'Uttara Bhadrapada',ரேவதி:'Revati'};
    const raw=v=>{if(v&&typeof v==='object'){return v.name??v.label??v.value??v.rasi??v.planet??v.nakshatra??'';}return v??'';};
    const arr=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
    const P=v=>{const q=raw(v);const rev={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};return ta?(rev[q]||String(q)):planetMap[q]||String(q);}; const PS=v=>{const q=raw(v);const m={சூரியன்:'Su',சந்திரன்:'Mo',செவ்வாய்:'Ma',புதன்:'Me',குரு:'Ju',சுக்கிரன்:'Ve',சனி:'Sa',ராகு:'Ra',கேது:'Ke',Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke'};return m[q]||String(q||'');};
    const N=v=>nakEnglish(raw(v));
    const nakEnglish=v=>{const q=String(v??'').trim().replace('மிருகசீரிடம்','மிருகசீரிஷம்');const en=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];const ta=['அஸ்வினி','பரணி','கார்த்திகை','ரோகிணி','மிருகசீரிஷம்','திருவாதிரை','புனர்பூசம்','பூசம்','ஆயில்யம்','மகம்','பூரம்','உத்திரம்','ஹஸ்தம்','சித்திரை','சுவாதி','விசாகம்','அனுஷம்','கேட்டை','மூலம்','பூராடம்','உத்திராடம்','திருவோணம்','அவிட்டம்','சதயம்','பூரட்டாதி','உத்திரட்டாதி','ரேவதி'];let i=en.findIndex(n=>q.toLowerCase()===n.toLowerCase()||q.toLowerCase().includes(n.toLowerCase()));if(i>=0)return en[i];i=ta.findIndex(n=>q===n||q.includes(n));return i>=0?(en[i]||q):q||'—'};
    const rasiMap={மேஷம்:'Aries',ரிஷபம்:'Taurus',மிதுனம்:'Gemini',கடகம்:'Cancer',சிம்மம்:'Leo',கன்னி:'Virgo',துலாம்:'Libra',விருச்சிகம்:'Scorpio',தனுசு:'Sagittarius',மகரம்:'Capricorn',கும்பம்:'Aquarius',மீனம்:'Pisces'};
    const S=v=>{const q=raw(v);return ta?String(q):rasiMap[q]||String(q);};
    const labels=ta?{bav:'BAV — பின்னாஷ்டகவர்க்கம்',sav:'SAV — சர்வாஷ்டகவர்க்கம்',refs:'கணக்கீட்டில் பயன்படுத்திய ஆதாரங்கள்',total:'மொத்தம்',validate:'சரிபார்ப்பு',varga:'வர்க்க கட்டங்கள்',avas:'அவஸ்தை',avk:'அவகஹடா சக்கரம்',kota:'கோட்டா சக்கரம்',sud:'சுதர்சன சக்கரம்',sbc:'சர்வதோபத்ர சக்கரம்',planet:'கிரகம்',rasi:'ராசி',degree:'பாகை',nak:'நட்சத்திரம்',pada:'பாதம்',house:'பாவம்',motion:'நிலை'}:{bav:'BAV — Bhinnashtakavarga',sav:'SAV — Sarvashtakavarga',total:'Total',varga:'Divisional Charts',avas:'Avastha',avk:'Avakhada Chakra',kota:'Kota Chakra',sud:'Sudarshana Chakra',sbc:'Sarvatobhadra Chakra',planet:'Planet',rasi:'Rasi',degree:'Degree',nak:'Nakshatra',pada:'Pada',house:'House',motion:'Motion'};
    const title=(en,taText)=>ta?taText:en;
    const dmsLocal=v=>{const x=((Number(v)%30)+30)%30;if(!Number.isFinite(x))return '—';const d=Math.floor(x);const mf=(x-d)*60;const m=Math.floor(mf);let sec=Math.round((mf-m)*60);if(sec>=60)return `${d}°${String(m+1).padStart(2,'0')}′00″`;return `${d}°${String(m).padStart(2,'0')}′${String(sec).padStart(2,'0')}″`;};
    const englishPlanetNames={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu',Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu'};
    const englishizePlanets=v=>{let q=String(v??'—');for(const [taName,enName] of Object.entries(englishPlanetNames)){if(/[\u0B80-\u0BFF]/.test(taName))q=q.split(taName).join(enName);}return q;};
    const av=data.ashtakavarga||{}, bh=Array.isArray(av.bhinna)?av.bhinna:[], sav=Array.isArray(av.sarva)?av.sarva:Array(12).fill(0);
    const signs=R.map((x,i)=>`<th>${i+1}<br>${x}</th>`).join('');
    let h='';
    h+=`<div class="adv-section"><h3>🪐 ${labels.bav}</h3><div class="adv-table-wrap adv-bav-wrap"><table class="adv-wide adv-bav"><thead><tr><th>${labels.planet}</th>${signs}<th>${labels.total}</th></tr></thead><tbody>${bh.map(x=>`<tr><th>${P(x.planet)}</th>${(x.bindus||[]).map(v=>`<td>${v}</td>`).join('')}<td><b>${x.total??''}</b></td></tr>`).join('')}</tbody></table></div>`;
    h+=`<div class="adv-table-wrap adv-sav-wrap"><table class="adv-wide adv-sav"><thead><tr><th>${ta?'ராசி':'Rasi'}</th>${signs}<th>${labels.total}</th></tr></thead><tbody><tr><th>${ta?'SAV':'SAV'}</th>${sav.map(v=>`<td><b>${v}</b></td>`).join('')}<td><b>${av.sarvaTotal??sav.reduce((a,b)=>a+Number(b||0),0)}</b></td></tr></tbody></table></div>`;


    // Book-based Prastaara Ashtakavarga (PAV) and Kakshya presentation.
    const pRefs=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Lagna'];
    const pavBlocks=bh.map(x=>{
      const grid=Array.isArray(x.prastara)?x.prastara:[];
      const rows=pRefs.map((ref,j)=>`<tr><th>${esc(ref)}</th>${Array.from({length:12},(_,si)=>`<td>${grid?.[si]?.[j]?'✓':'·'}</td>`).join('')}</tr>`).join('');
      return `<h4>${P(x.planet)} — ${title('PAV','PAV')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${title('From','இருந்து')}</th>${R.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }).join('');
    h+=`<div class="adv-section v5-module"><h3>📋 ${title('Prastaara Ashtakavarga (PAV)','பிரஸ்தார அஷ்டகவர்க்கம் (PAV)')}</h3>${pavBlocks}</div>`;
    const kitems=arr(av.kakshya?.items);
    h+=`<div class="adv-section v5-module"><h3>🔢 ${title('Kakshya Chart','கக்ஷ்யா அட்டவணை')}</h3><p class="small">${title('Each sign is divided into eight 3°45′ kakshyas; the first is ruled by Saturn.','ஒவ்வொரு ராசியும் 3°45′ கொண்ட 8 கக்ஷ்யாக்களாகப் பிரிக்கப்படுகிறது; முதல் கக்ஷ்யா சனியால் ஆளப்படுகிறது.')}</p>${simpleTable([labels.planet,labels.rasi,title('Degree','பாகை'),title('Kakshya','கக்ஷ்யா'),title('Lord','அதிபதி'),title('Rekha','ரேகை')],kitems.map(x=>`<tr><td>${P(x.planet)}</td><td>${S(x.rasi)}</td><td>${esc((()=>{const v=Number(x.degree);return Number.isFinite(v)?(dmsLocal(v)):x.degree})())}</td><td>${esc(x.kakshyaIndex)}</td><td>${String(x.lord||'')==='லக்கினம்'?'Lagna':P(x.lord)}</td><td>${x.hasRekha?'✓':'·'}</td></tr>`))}</div>`;
    const rel=data.planetRelations||{};
    const relRows=arr(rel.rows).map(x=>{const map={friend:ta?'நட்பு':'Friend',enemy:ta?'பகை':'Enemy',neutral:ta?'சமம்':'Neutral',adhimitra:ta?'அதிமித்திரம்':'Adhimitra',mitra:ta?'மித்திரம்':'Mitra',sama:ta?'சமம்':'Sama',satru:ta?'சத்ரு':'Satru',adhisatru:ta?'அதிசத்ரு':'Adhisatru'};return `<tr><td>${P(x.from)}</td><td>${P(x.to)}</td><td>${map[x.temporary]}</td><td>${map[x.natural]}</td><td><b>${map[x.compound]}</b></td><td>${esc(x.houseFrom)}</td></tr>`}).join('');
    h+=`<div class="adv-section v5-module"><h3>🤝 ${title('Planet Relations','கிரக உறவுகள்')}</h3>${simpleTable([title('Planet','கிரகம்'),title('Other Planet','மற்ற கிரகம்'),title('Temporary','தற்காலிகம்'),title('Naisargika','நைசர்கிகம்'),title('Panchadha / Compound','பஞ்சத / இணைந்த உறவு'),title('House From','இருந்த பாவம்')],relRows)}</div>`;
    const rem=data.remedies||{};
    const remRows=arr(rem.rows).map(x=>`<tr><td><b>${P(x.planet)}</b></td><td>${esc(x.gemstone)}</td><td>${esc(x.metal)}</td><td>${esc(x.goodDeed)}</td><td>${esc(x.grain)}</td><td>${esc(x.deity)}</td></tr>`).join('');
    h+=`<div class="adv-section v5-module remedial-module"><h3>🪔 ${title('Remedial Measures','பரிகார நடவடிக்கைகள்')}</h3>${simpleTable([title('Planet','கிரகம்'),title('Gemstone','ரத்தினம்'),title('Metal','உலோகம்'),title('Good Deed / Service','நல்ல செயல் / சேவை'),title('Grain','தானியம்'),title('Deity','தெய்வம்')],remRows)}</div>`;

    const avc=av.validation||{}, checks=avc.checks||{};

    h+=`<div class="adv-section"><h3>📊 ${labels.varga}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>Varga</th><th>${labels.planet}</th><th>${labels.rasi}</th><th>${labels.degree}</th><th>${labels.nak}</th><th>${labels.pada}</th></tr></thead><tbody>`;
    arr(data.vargas).forEach(v=>(v.planets||[]).forEach(p=>h+=`<tr><td><b>${esc(v.division)}</b></td><td>${P(p.planet)}</td><td>${S(p.rasi||"—")}</td><td>${esc(p.degree)}</td><td>${esc(nakEnglish(p.nakshatra))}</td><td>${p.pada??''}</td></tr>`)); h+=`</tbody></table></div></div>`;
    h+=`<div class="adv-section"><h3>🌟 ${labels.avas}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>${labels.rasi}</th><th>${labels.degree}</th><th>Avastha</th><th>Dignity</th><th>${labels.nak}</th><th>${labels.pada}</th></tr></thead><tbody>${arr(data.avastha).map(p=>`<tr><td>${P(p.planet)}</td><td>${S(p.rasi||"—")}</td><td>${esc(p.degree)}</td><td><b>${esc(p.balaAvastha)}</b></td><td>${esc(p.dignity)}</td><td>${esc(nakEnglish(p.nakshatra))}</td><td>${p.pada??''}</td></tr>`).join('')}</tbody></table></div></div>`;
    // §15.4.2–15.4.4: book-based Avastha predictions. Existing §15.4.1 table above is preserved.
    const av154=Array.isArray(data.avastha154?.activity)?data.avastha154:(window.__smvAvastha154?window.__smvAvastha154(data,lang):null);
    const av154Data=av154||null;
    if(av154Data){
      const aLabel=lang==='ta'?{alert:'விழிப்பு நிலை (Alertness)',mood:'மனநிலை / அணுகுமுறை (Attitude & Mood)',act:'⭐ செயல்நிலை / Sayanaadi Avastha',initial:'பெயர் ஆரம்ப ஒலி',sound:'ஒலி எண்',state:'நிலை',meaning:'பொருள்',strength:'செயல் வலிமை',result:'பலன் அளவு',prediction:'தானியங்கி பலன்',calc:'கணக்கீட்டு விவரம்'}:{alert:'Alertness-related Avastha',mood:'Attitude & Mood Avastha',act:'⭐ Activity-related / Sayanaadi Avastha',initial:'Native Initial / Name Sound',sound:'Sound No.',state:'State',meaning:'Meaning',strength:'Activity Strength',result:'Result Level',prediction:'Automatic Prediction',calc:'Calculation Details'};
      const alertRows=arr(av154Data.alertness).map(x=>`<tr><td>${P(x.planet)}</td><td><b>${esc(x.alertState)}</b></td></tr>`).join('');
      h+=`<div class="adv-section avastha154-section"><h3>👁️ ${aLabel.alert}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>${aLabel.state}</th></tr></thead><tbody>${alertRows}</tbody></table></div></div>`;
      h+=`<div class="adv-section avastha154-section"><h3>🧠 ${aLabel.mood}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>${aLabel.state}</th><th>${ta?'விளக்கம்':'Interpretation'}</th></tr></thead><tbody>${arr(av154Data.alertness).map(x=>{const desc={Deepta:ta?'பிரகாசம் / உயர்ந்த வெளிப்பாடு':'Bright / elevated expression',Svastha:ta?'சுயநிலை / இயல்பு':'Comfortable / natural',Mudita:ta?'மகிழ்ச்சி':'Delighted',Saanta:ta?'அமைதி':'Peaceful',Deena:ta?'சோர்வு / தாழ்வு':'Sad / depressed',Duhkhita:ta?'துயரம்':'Distressed',Vikala:ta?'குழப்பம் / குறைபாடு':'Confused / constrained',Khala:ta?'தந்திரமான போக்கு':'Scheming tendency',Kopita:ta?'கோபம்':'Angry',Lajjita:ta?'வெட்கம்':'Ashamed',Garvita:ta?'பெருமை':'Proud',Kshudhita:ta?'பசி / திருப்தியின்மை':'Hungry / dissatisfied',Trishita:ta?'தாகம்':'Thirsty',Kshobhita:ta?'அதிர்ச்சி / கலக்கம்':'Agitated'};return `<tr><td>${P(x.planet)}</td><td><b>${esc(x.moodState)}</b></td><td>${desc[x.moodState]||'—'}</td></tr>`}).join('')}</tbody></table></div></div>`;
      const rows=arr(av154Data.activity).filter(x=>x&&!x.error).map(x=>`<tr><td><b>${P(x.planet)}</b></td><td>${x.house??'—'}</td><td>${esc(x.state)}</td><td>${esc(ta?(x.stateTa||x.meaning||'—'):(x.state||x.meaning||'—'))}</td><td>${esc(x.activityStrength)}</td><td><b>${esc(x.resultLevel)}</b></td><td>${esc(x.prediction)}</td></tr>`).join('');
      h+=`<div class="adv-section avastha154-section avastha154-important"><h3>${aLabel.act}</h3><div class="kota-name-details"><div><b>${aLabel.initial}</b><span>${esc(av154Data.nativeInitial||'—')}</span></div><div><b>${aLabel.sound}</b><span>${av154Data.soundNumber??arr(av154Data.activity)[0]?.sound??'—'}</span></div></div><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>${labels.house}</th><th>${aLabel.state}</th><th>${aLabel.meaning}</th><th>${aLabel.strength}</th><th>${aLabel.result}</th><th>${aLabel.prediction}</th></tr></thead><tbody>${rows}</tbody></table></div><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>C</th><th>P</th><th>A</th><th>M</th><th>G</th><th>L</th><th>Index</th><th>Activity</th><th>Result</th></tr></thead><tbody>${arr(av154Data.activity).filter(x=>x&&!x.error).map(x=>`<tr><td>${P(x.planet)}</td><td>${x.C}</td><td>${x.P}</td><td>${x.A}</td><td>${x.M}</td><td>${x.G}</td><td>${x.L}</td><td>${x.index}</td><td>${esc(x.activityStrength)}</td><td>${esc(x.resultLevel)}</td></tr>`).join('')}</tbody></table></div><p class="small"><b>${aLabel.calc}:</b> ${ta?'Cheshta = முழுப் பலன் · Drishti = மிதமான பலன் · Vicheshta = மிகக் குறைந்த பலன்.':'Cheshta = full results · Drishti = medium results · Vicheshta = very little results.'}</p></div>`;
    }
    h+=`<div class="adv-section"><h3>🏰 ${labels.kota}</h3><div class="kota-summary-grid">
      <div><b>${ta?'ஜன்ம ராசி':'Janma Rashi'}</b><span>${S(data.kota?.moonRasi||'—')}</span></div>
      <div><b>${ta?'ஜன்ம நட்சத்திரம்':'Janma Nakshatra'}</b><span>${N(data.kota?.janmaNakshatra||'—')} · ${data.kota?.janmaNakshatraPada??'—'}</span></div>
      <div><b>${ta?'கோட்டா சுவாமி':'Kota Swami / Durgapati'}</b><span><strong>${P(data.kota?.kotaSwami?.planet||'—')}</strong></span></div>
      <div><b>${ta?'கோட்டா பாலா':'Kota Paala'}</b><span><strong>${data.kota?.kotaPala?.planet?P(data.kota.kotaPala.planet):'—'}</strong></span></div>
    </div><div class="kota-zones-grid">
      <div><b>Stambha</b><span>4, 11, 18, 25</span></div><div><b>Durgantara / Madhya</b><span>3, 5, 10, 12, 17, 19, 24, 26</span></div><div><b>Prakaara</b><span>2, 6, 9, 13, 16, 20, 23, 27</span></div><div><b>Bahya</b><span>1, 7, 8, 14, 15, 21, 22, 28</span></div>
    </div><div class="kota-path-grid"><div><b>${ta?'நுழைவு பாதை':'Entry Path'}</b><span>${(data.kota?.entryPath||[]).join(' · ')}</span></div><div><b>${ta?'வெளியேறும் பாதை':'Exit Path'}</b><span>${(data.kota?.exitPath||[]).join(' · ')}</span></div></div>
    <div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>#</th><th>${ta?'நட்சத்திரம்':'Nakshatra'}</th><th>${ta?'பகுதி':'Zone'}</th><th>${ta?'கிரகங்கள்':'Planets'}</th></tr></thead><tbody>${arr(data.kota?.nakshatras).map(x=>{const occ=arr(data.kota?.planets).filter(p=>p.relativeNakshatra===x.relative);return `<tr><td>${x.relative}</td><td>${N(x.nakshatra)}</td><td>${esc(x.zone)}</td><td>${occ.map(p=>`${P(p.planet)} ${esc(p.degree||'')}`).join(', ')||'—'}</td></tr>`}).join('')}</tbody></table></div>
    <div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>${labels.rasi}</th><th>${labels.nak}</th><th>${labels.pada}</th><th>${labels.degree}</th><th>${ta?'பகுதி':'Zone'}</th></tr></thead><tbody>${arr(data.kota?.planets).map(p=>`<tr><td>${P(p.planet)}</td><td>${S(p.rasi||'—')}</td><td>${esc(nakEnglish(p.nakshatra))}</td><td>${p.pada??'—'}</td><td>${esc(p.degree||'—')}</td><td>${esc(p.zone||'—')}</td></tr>`).join('')}</tbody></table></div>
    <div class="kota-name-details"><div><b>${ta?'பெயர்':'Native Name'}</b><span>${esc(data.kota?.nativeName||'—')}</span></div><div><b>${ta?'பெயர் ஆரம்ப ஒலி':'Name Initial'}</b><span>${esc(data.kota?.nameInitial||'—')}</span></div><div><b>${ta?'ஜன்ம பாத ஒலி':'Janma Pada Sound'}</b><span>${esc(data.kota?.janmaNakshatraSound||'—')}</span></div><div><b>${ta?'பெயர் நட்சத்திரம்':'Name Nakshatra'}</b><span>${N(data.kota?.nameNakshatra||'—')} · ${data.kota?.nameNakshatraPada??'—'}</span></div><div><b>${ta?'பெயர் ஒலி':'Matched Sound'}</b><span>${esc(data.kota?.nameSyllable||'—')}</span></div><div><b>${ta?'பொருத்த விதி':'Match Rule'}</b><span>${esc(data.kota?.nameMatchType||'—')}</span></div></div></div>`;
    h+=`<div class="adv-section"><h3>🕉️ ${labels.sud}</h3><p class="small">${ta?'லக்னம், சந்திரன், சூரியன் ஆகிய மூன்று reference points-லிருந்து 12 பாவங்கள் பார்க்கப்படுகின்றன.':'Three reference points are used: Lagna, Moon and Sun. Each ring shows the 12 houses from that reference.'}</p>`;
    arr(data.sudarshana?.rings).forEach(r=>{const sn=ta?({ 'Lagna Chakra':'லக்ன சக்கரம்','Chandra Chakra':'சந்திர சக்கரம்','Surya Chakra':'சூரிய சக்கரம்'}[r.name]||r.name):r.name;const sc=ta?({Lagna:'லக்னம்',Moon:'சந்திரன்',Sun:'சூரியன்','லக்னம்':'லக்னம்','சந்திரன்':'சந்திரன்','சூரியன்':'சூரியன்'}[r.center]||r.center):r.center;h+=`<h4>${esc(sn)} — ${esc(sc)}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.house}</th><th>${labels.rasi}</th><th>${labels.planet}</th><th>${labels.degree}</th><th>${labels.nak}</th><th>${labels.pada}</th></tr></thead><tbody>${arr(r.houses).map(x=>`<tr><td>${x.house}</td><td>${S(x.rasi)}</td><td>${arr(x.planetDetails).map(p=>P(p.planet)).join(', ')||'—'}</td><td>${arr(x.planetDetails).map(p=>esc(p.degree)).join(', ')||'—'}</td><td>${arr(x.planetDetails).map(p=>N(p.nakshatra)).join(', ')||'—'}</td><td>${arr(x.planetDetails).map(p=>p.pada??'').join(', ')||'—'}</td></tr>`).join('')}</tbody></table></div>`}); h+=`</div>`;
    const sb=data.sarvatobhadra||{};
    h+=`<div class="adv-section sbc-section"><h3>🔯 ${labels.sbc}</h3><div class="sbc-info"><b>${ta?'ஜன்ம நட்சத்திரம்':'Janma Nakshatra'}:</b> ${N(sb.centerNakshatra||'')}<br><b>${ta?'கிரகங்கள்':'Planets'}:</b> ${arr(sb.planetMarks).map(p=>P(p.planet)).join(', ')}<br><span class="small">${ta?'81 கட்டங்கள்: 28 நட்சத்திரங்கள் (அபிஜித் உட்பட) + 12 ராசிகள் + 16 உயிரெழுத்து இடங்கள் + 20 மெய்/அக்ஷர இடங்கள் + 5 திதி/வாரக் குழுக்கள்.':'81 cells: 28 Nakshatras including Abhijit + 12 Rashis + 16 vowel cells + 20 consonant cells + 5 Tithi/weekday groups.'}</span></div><div class="sbc-traditional-meta"><div><b>${ta?'வெளிப்புற வளையம்':'Outer Ring'}</b><span>${ta?'28 நட்சத்திரங்கள் + மூலை உயிரெழுத்துகள்':'28 Nakshatras + corner vowels'}</span></div><div><b>${ta?'அக்ஷர வளையம்':'Akshara Ring'}</b><span>${ta?'20 மெய்/பெயர் ஒலி இடங்கள்':'20 consonant/name-sound cells'}</span></div><div><b>${ta?'ராசி வளையம்':'Rasi Ring'}</b><span>${ta?'12 ராசிகள்':'12 Rashis'}</span></div><div><b>${ta?'திதி வளையம்':'Tithi Ring'}</b><span>${ta?'நந்தா · பத்ரா · ஜயா · ரிக்தா · பூர்ணா':'Nanda · Bhadra · Jaya · Rikta · Poorna'}</span></div><div><b>${ta?'கிரக அமைப்பு':'Planet Placement'}</b><span>${ta?'நட்சத்திர பெட்டி + பாதம் விவரம்':'Nakshatra cell + Pada detail'}</span></div></div><div class="sbc-wrap"><div class="sbc-edge-wrap"><span class="sbc-edge-label sbc-edge-north">North</span><span class="sbc-edge-label sbc-edge-south">South</span><span class="sbc-edge-label sbc-edge-east">East</span><span class="sbc-edge-label sbc-edge-west">West</span><div class="sbc-grid-full">${arr(sb.grid).flatMap(row=>arr(row)).map(x=>`<div class="sbc-cell sbc-${x.type||'other'}${arr(x.planets).length?' has-planet':''}${(x.vedha||[]).length?' has-vedha':''}"><span class="sbc-main">${esc(x.label||'—')}</span>${arr(x.planets).length?`<em class="sbc-planet-row">${arr(x.planets).map(p=>PS(p)).join(', ')}</em>`:''}${arr(x.vedha).map(v=>`<small>${PS(v.planet)}</small>`).join('')}</div>`).join('')}</div></div></div><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${labels.planet}</th><th>#</th><th>${labels.nak}</th><th>${labels.pada}</th><th>${labels.rasi}</th><th>${labels.degree}</th><th>${ta?'வக்கிரம்':'Motion'}</th></tr></thead><tbody>${arr(sb.planetMarks).map(p=>`<tr><td>${P(p.planet)}</td><td>${p.nakshatraIndex}</td><td>${esc(nakEnglish(p.nakshatra))}</td><td>${p.pada??''}</td><td>${esc(p.rasi||"—")}</td><td>${esc(p.degree)}</td><td>${p.retrograde?(ta?'வக்கிரம்':'Retrograde'):(ta?'நேர்கதி':'Direct')}</td></tr>`).join('')}</tbody></table></div><div class="adv-detail-grid"><div><b>${ta?'திதி குழுக்கள்':'Tithi groups'}</b><ul>${arr(sb.tithiGroups).map(t=>`<li><b>${esc(t.name)}</b>: ${esc(t.tithis)} · ${esc(t.weekdays)}</li>`).join('')}</ul></div><div><b>${ta?'வேத விதி':'Vedha rule'}</b><p class="small">${esc(sb.vedhaRules?.lines||'')}</p><p class="small">${esc(sb.vedhaRules?.special||'')}</p></div></div></div>`;
    // V5 optional modules: each section is rendered independently and tolerates missing data.
    const vx=data.v5||{};
    const p1=data?.v5?.phase1||{};
    const safeRows=v=>arr(v).filter(x=>x&&typeof x==='object');
    function simpleTable(heads,rows){ const rr=Array.isArray(rows)?rows:(rows==null?[]:[rows]); const body=rr.map(r=>{ if(typeof r==='string') return r; if(Array.isArray(r)) return `<tr>${r.map(x=>`<td>${escSafe(x??'—')}</td>`).join('')}</tr>`; if(r&&typeof r==='object') return `<tr>${Object.values(r).map(x=>`<td>${escSafe(x??'—')}</td>`).join('')}</tr>`; return `<tr><td>${escSafe(r??'—')}</td></tr>`; }).join(''); return `<div class="adv-table-wrap"><table class="adv-wide"><thead><tr>${heads.map(x=>`<th>${escSafe(x)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`; }
    const p1Title=(en,taText)=>lang==='en'?en:taText;
    const p1Esc=v=>escSafe(v??'—');
    const p1P=v=>{
  const q=raw(v);
  const planetEnglish={
    'சூரியன்':'Sun',
    'சந்திரன்':'Moon',
    'செவ்வாய்':'Mars',
    'புதன்':'Mercury',
    'குரு':'Jupiter',
    'சுக்கிரன்':'Venus',
    'சனி':'Saturn',
    'ராகு':'Rahu',
    'கேது':'Ketu',
    'Sun':'Sun',
    'Moon':'Moon',
    'Mars':'Mars',
    'Mercury':'Mercury',
    'Jupiter':'Jupiter',
    'Venus':'Venus',
    'Saturn':'Saturn',
    'Rahu':'Rahu',
    'Ketu':'Ketu'
  };
  return escSafe(planetEnglish[String(q).trim()]||q||'—');
};
    // The 12-Lagna display is intentionally rendered once, immediately below D-9 Navamsa.
    // Do not render the old separate Phase-1 Special Lagnas cards here.
    if(p1.arudhas){
      h+=`<div class="adv-section phase1-module"><h3>🔱 ${p1Title('Arudha Padas A1–A12','ஆரூட பாதங்கள் A1–A12')}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>#</th><th>${p1Title('Arudha','ஆரூடம்')}</th><th>${p1Title('Source sign','மூல ராசி')}</th><th>${p1Title('Lord','அதிபதி')}</th><th>${p1Title('Lord sign','அதிபதி ராசி')}</th><th>${p1Title('Result','பலன் ராசி')}</th></tr></thead><tbody>${safeRows(p1.arudhas.items).map(x=>`<tr><td>${p1Esc(x.house)}</td><td><b>${p1Esc(x.name)}</b></td><td>${S(x.sourceSign)}</td><td>${p1P(x.lord)}</td><td>${S(x.lordSign)}</td><td><b>${S(x.rasi)}</b></td></tr>`).join('')}</tbody></table></div><p class="small">${p1Esc(p1.arudhas.method)}</p></div>`;
    }
    if(p1.grahaArudhas){
      h+=`<div class="adv-section phase1-module"><h3>🪐 ${p1Title('Graha Arudhas','கிரக ஆரூடங்கள்')}</h3>${simpleTable([p1Title('Planet','கிரகம்'),p1Title('Source sign','மூல ராசி'),p1Title('Lord','அதிபதி'),p1Title('Arudha','ஆரூட ராசி')],safeRows(p1.grahaArudhas.items).map(x=>`<tr><td>${p1P(x.planet)}</td><td>${S(x.sourceSign)}</td><td>${p1P(x.lord)}</td><td>${S(x.arudha)}</td></tr>`))}<p class="small">${p1Esc(p1.grahaArudhas.method)}</p></div>`;
    }
    if(p1.grahaDrishti){
      h+=`<div class="adv-section phase1-module"><h3>👁️ ${p1Title('Graha Drishti','கிரக பார்வை')}</h3>${simpleTable([p1Title('Planet','கிரகம்'),p1Title('From','இருந்து'),p1Title('Aspects','பார்வைகள்')],safeRows(p1.grahaDrishti.items).map(x=>`<tr><td>${p1P(x.planet)}</td><td>${S(x.from)}</td><td>${arr(x.aspects).map(a=>`${p1Esc(a.house)} → ${S(a.rasi)}`).join(' · ')}</td></tr>`))}<p class="small">${p1Esc(p1.grahaDrishti.method)}</p></div>`;
    }
    if(p1.rasiDrishti){
      h+=`<div class="adv-section phase1-module"><h3>♈ ${p1Title('Rasi Drishti','ராசி பார்வை')}</h3>${simpleTable([p1Title('Planet','கிரகம்'),p1Title('From','இருந்து'),p1Title('Type','வகை'),p1Title('Aspected signs','பார்க்கும் ராசிகள்')],safeRows(p1.rasiDrishti.items).map(x=>`<tr><td>${p1P(x.planet)}</td><td>${S(x.from)}</td><td>${p1Esc(x.type)}</td><td>${arr(x.aspects).map(S).join(' · ')}</td></tr>`))}<p class="small">${p1Esc(p1.rasiDrishti.method)}</p></div>`;
    }
    if(p1.argala){
      h+=`<div class="adv-section phase1-module"><h3>⚖️ ${p1Title('Argala & Virodhargala','ஆர்கலா & விரோதார்கலா')}</h3>${simpleTable([p1Title('Target sign','இலக்கு ராசி'),p1Title('Argala sources','ஆர்கலா ஆதாரங்கள்'),p1Title('Obstructions','தடைகள்')],safeRows(p1.argala.items).map(x=>`<tr><td><b>${S(x.targetSign)}</b>${x.ketuReversed?`<br><span class="small">${p1Title('Ketu reversal','கேது எதிர்திசை கணக்கு')}</span>`:''}</td><td>${arr(x.argala).map(a=>`<div><b>${p1Esc(a.position)}</b>: ${S(a.sourceSign)}${arr(a.planets).length?' — '+a.planets.map(p1P).join(', '):''}</div>`).join('')}</td><td>${arr(x.virodhargala).map(a=>`<div>${p1Esc(a.blocksPosition)} ← ${S(a.sourceSign)}${arr(a.planets).length?' — '+a.planets.map(p1P).join(', '):''}</div>`).join('')}</td></tr>`))}<p class="small">${p1Esc(p1.argala.method)}</p></div>`;
    }
    const planetLabel=v=>P(v);
    const baseUpRows=arr(vx.upagrahas?.items).map(x=>`<tr><td><b>${esc(x.name||'—')}</b></td><td>${S(x.rasi||'—')}</td><td>${esc(x.degree||'—')}</td><td>${esc(nakEnglish(x.nakshatra||'—'))}</td><td>${esc(x.pada??'—')}</td></tr>`);
    if(vx.bookUpagrahas?.gulika) baseUpRows.push(`<tr><td><b>${title('Gulika','குளிகை')}</b></td><td>${S(vx.bookUpagrahas.gulika.rasi||'—')}</td><td>${esc(vx.bookUpagrahas.gulika.degree||'—')}</td><td>${esc(nakEnglish(vx.bookUpagrahas.gulika.nakshatra||'—'))}</td><td>${esc(vx.bookUpagrahas.gulika.pada??'—')}</td></tr>`);
    if(vx.bookUpagrahas?.maandi) baseUpRows.push(`<tr><td><b>${title('Maandi','மாந்தி')}</b></td><td>${S(vx.bookUpagrahas.maandi.rasi||'—')}</td><td>${esc(vx.bookUpagrahas.maandi.degree||'—')}</td><td>${esc(nakEnglish(vx.bookUpagrahas.maandi.nakshatra||'—'))}</td><td>${esc(vx.bookUpagrahas.maandi.pada??'—')}</td></tr>`);
    h+=`<div class="adv-section v5-module"><h3>🪐 ${title('Upagrahas','உபகிரகங்கள்')}</h3>${simpleTable([title('Upagraha','உபகிரகம்'),title('Rasi','ராசி'),title('Degree','பாகை'),title('Nakshatra','நட்சத்திரம்'),title('Pada','பாதம்')],baseUpRows)}</div>`;

    h+=`<div class="adv-section v5-module"><h3>📿 ${title('Sodhya Pinda Benefits','சோத்ய பிண்ட பலன்கள்')}</h3><h4>${title('Rasi Pinda','ராசி பிண்டம்')}</h4>${simpleTable([labels.rasi,title('SAV Bindus','SAV பிந்துக்கள்'),title('Sign Pinda','ராசி பிண்டம்')],safeRows(vx.sodhyaPinda?.rasiPinda).map(x=>`<tr><td>${S(x.rasi)}</td><td>${esc(x.bindus)}</td><td>${esc(x.signPinda)}</td></tr>`))}<h4>${title('Graha Pinda','கிரக பிண்டம்')}</h4>${simpleTable([labels.planet,title('Bindus','பிந்துக்கள்'),title('Pinda','பிண்டம்')],safeRows(vx.sodhyaPinda?.grahaPinda).map(x=>`<tr><td>${P(x.planet)}</td><td>${esc(x.bindus)}</td><td>${esc(x.pinda)}</td></tr>`))}</div>`;
    h+=`<div class="adv-section v5-module"><h3>⭐ ${title('Sahams','சஹம்கள்')}</h3>${simpleTable([title('Saham','சஹம்'),labels.rasi,labels.degree],safeRows(vx.sahams?.items).map(x=>{const sl=Number(x.longitude);const rr=Number.isFinite(sl)?R[Math.floor((((sl%360)+360)%360)/30)]:((x.rasi&&x.rasi!=='—')?S(x.rasi):'—');return`<tr><td>${esc(x.name)}</td><td>${esc(rr)}</td><td>${esc(x.degreeDms??x.degree??'—')}</td></tr>`}))}</div>`;
    const tj=data.tajaka||{};
    if(tj && (tj.returnInfo||tj.muntha||tj.yogas||tj.annualDasas)){
      const tRows=arr(tj.aspects).map(x=>`<tr><td>${P(x.a)}</td><td>${P(x.b)}</td><td>${esc(title(x.aspect,({'Semi-sextile':'அரை அறுபதாம் பார்வை','Sextile':'அறுபதாம் பார்வை','Square':'சதுர பார்வை','Trine':'திரிகோண பார்வை','Opposition':'எதிர் பார்வை'}[x.aspect]||x.aspect)))}</td><td>${esc(title(x.ithasala?'Ithasala':x.eesarpha?'Eesarpha':'—',x.ithasala?'இத்தசால':x.eesarpha?'ஈஸர்பா':'—'))}</td></tr>`).join('');
      const tajakaText=v=>{let q=String(v??'—');if(!ta)return q;const m={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது','applying':'பயன்படும்','separating':'பிரியும்','connects':'இணைக்கிறது','within deeptaamsa':'தீப்தாம்சத்தில்','strong':'வலுவாக','weak':'பலவீனமாக','faster planet':'வேகமான கிரகம்','slower planet':'மெதுவான கிரகம்'};Object.entries(m).forEach(([a,b])=>{q=q.replace(new RegExp(a,'gi'),b);});return q;};
      const yRows=arr(tj.yogas).map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(englishizePlanets(tajakaText(x.reason)))}</td><td>${esc(tajakaText(x.meaning))}</td></tr>`).join('');
      const pRows=arr(tj.annualDasas?.patyayini).map(x=>`<tr><td>${P(x.name)}</td><td>${esc(x.krisamsa)}</td><td>${esc(x.patyamsa)}</td><td>${esc(x.days)}</td><td>${esc(x.start)}</td><td>${esc(x.end)}</td></tr>`).join('');
      const hRows=arr(tj.harshaBala).map(x=>`<tr><td>${P(x.planet)}</td><td>${esc(x.units)}</td></tr>`).join('');
      h+=`<div class="adv-section v5-module tajaka-module"><h3>☀️ ${title('Tajaka Analysis','தாஜக பகுப்பாய்வு')}</h3>
        <div class="kota-summary-grid"><div><b>${title('Solar Return','சூரிய திரும்புகை')}</b><span>${esc(tj.returnInfo?.returnDate||'—')} ${esc(tj.returnInfo?.returnTime||'')}</span></div><div><b>${title('Muntha','முன்தா')}</b><span>${S(tj.muntha?.rasi||'—')} · ${esc(tj.muntha?.house||'—')}</span></div><div><b>${title('Year Lord','வருட அதிபதி')}</b><span><strong>${P(tj.yearLord||'—')}</strong></span></div><div><b>${title('Trirasi Lord','திரிராசி அதிபதி')}</b><span>${P(tj.trirasiLord||'—')}</span></div></div>
        <h4>${title('Tajaka Aspects','தாஜக பார்வைகள்')}</h4>${simpleTable([title('Planet A','கிரகம் A'),title('Planet B','கிரகம் B'),title('Aspect','பார்வை'),title('Relationship','தொடர்பு')],tRows||`<tr><td colspan="4">${title('No supported Tajaka aspect detected.','ஆதரிக்கப்படும் தாஜக பார்வை கண்டறியப்படவில்லை.')}</td></tr>`)}
        <h4>${title('Tajaka Yogas','தாஜக யோகங்கள்')}</h4>${simpleTable([title('Yoga','யோகம்'),title('Rule detected','கண்டறியப்பட்ட விதி'),title('Indication','குறிப்பு')],yRows||`<tr><td colspan="3">${title('No fully matched Tajaka Yoga.','முழுமையாகப் பொருந்திய தாஜக யோகம் இல்லை.')}</td></tr>`)}
        <h4>${title('Harsha Bala','ஹர்ஷ பலம்')}</h4>${simpleTable([title('Planet','கிரகம்'),title('Units','அலகுகள்')],hRows)}
        <h4>${title('Patyayini Dasa','பத்யாயினி தசா')}</h4>${simpleTable([title('Lagna / Planet','லக்னம் / கிரகம்'),'Krisamsa','Patyamsa',title('Days','நாட்கள்'),title('Start','தொடக்கம்'),title('End','முடிவு')],pRows)}
        </div>`;
    }


    const p2=data.phase2||{}; const ys=Array.isArray(p2.yogas?.items)?p2.yogas.items:[];
    h+=`<div class="adv-section v5-module phase2-yoga-engine"><h3>🕉️ ${title('Yogas','Yogas')}</h3>${simpleTable([title('Yoga','யோகம்'),title('Category','வகை'),title('Detected rule','கண்டறியப்பட்ட விதி'),title('Indication','குறிப்பு')],ys.length?ys.map(x=>`<tr><td><b>${esc(x.name||'—')}</b></td><td>${esc(x.category||'—')}</td><td>${esc(englishizePlanets(x.reason||'—'))}</td><td>${esc(x.meaning||'—')}</td></tr>`):[`<tr><td><b>—</b></td><td>—</td><td>${title('No fully matched Yoga condition','முழுமையாகப் பொருந்திய யோக விதி இல்லை')}</td><td>—</td></tr>`])}<p class="small"><b>${title('Detected','கண்டறியப்பட்டது')}:</b> ${esc(p2.yogas?.summary?.count??0)} · <b>${title('Seven-planet distinct signs','ஏழு கிரக தனித்த ராசிகள்')}:</b> ${esc(p2.yogas?.summary?.sevenPlanetDistinctSigns??'—')}</p></div>`;
    h+=`<div class="adv-section v5-module"><h3>🔱 ${title('Jaimini / Karakamsha','ஜைமினி / காரகாம்சம்')}</h3>${simpleTable([title('Chara Karaka','சர காரகம்'),labels.planet,title('Degree in Sign','ராசி பாகை')],safeRows(p2.charaKarakas).map(x=>`<tr><td>${esc(x.karaka)}</td><td>${planetLabel(x.planet)}</td><td>${esc(x.degreeInSignDms??x.degreeInSign??'—')}</td></tr>`))}<p><b>${title('Atmakaraka → Karakamsha','ஆத்மகாரக → காரகாம்சம்')}:</b> ${S(p2.karakamsha||'—')}</p><p class="small">${title('Karakamsa is the Navamsa sign occupied by Atmakaraka, following the supplied reference.','வழங்கப்பட்ட reference படி, ஆத்மகாரகன் D-9 Navamsa-வில் இருக்கும் ராசியே காரகாம்சம்.')}</p></div>`;

    // V8.6 / Phase 4 — source-based Dasa expansion.
    // Kept inside the existing renderer so no backend change is required.
    // The supplied reference explicitly separates Nakshatra and Rasi dasas and
    // defines their intended uses; low-level longevity timing is displayed as
    // an astrological reference, not as a certainty.
    try{
      const d4=(()=>{
        const vv=arr(data.vargas);
        const d1=vv.find(v=>/^(D?1|RASI|D-1)$/i.test(String(v.division||'').replace(/\s+/g,'')))||vv.find(v=>/rasi/i.test(String(v.division||'')))||vv[0]||{};
        return {rows:arr(d1.planets), division:d1.division||'D1'};
      })();
      const rNames=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      const rShort=['Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi'];
      const normR=v=>{const q=String(raw(v)||'').trim().toLowerCase();const maps={aries:0,mesha:0,ar:0,மேஷம்:0,taurus:1,vrishabha:1,vrisha:1,ta:1,ரிஷபம்:1,gemini:2,mithuna:2,ge:2,மிதுனம்:2,cancer:3,karkata:3,karka:3,cn:3,கடகம்:3,leo:4,simha:4,le:4,சிம்மம்:4,virgo:5,kanya:5,vi:5,கன்னி:5,libra:6,thula:6,li:6,துலாம்:6,scorpio:7,vrischika:7,sc:7,விருச்சிகம்:7,sagittarius:8,dhanus:8,sg:8,தனுசு:8,capricorn:9,makara:9,cp:9,மகரம்:9,aquarius:10,kumbha:10,aq:10,கும்பம்:10,pisces:11,meena:11,pi:11,மீனம்:11};return maps[q]??-1;};
      const lordOf=[0,5,2,2,4,4,6,7,8,9,10,11];
      const planetByName={Sun:0,Moon:1,Mars:2,Mercury:3,Jupiter:4,Venus:5,Saturn:6,Rahu:7,Ketu:8};
      const d1Rows=d4.rows.map(x=>({name:P(x.planet), idx:normR(x.rasi), degree:Number(String(x.degree??'').match(/[0-9]+(?:\.[0-9]+)?/)?.[0]||0), longitude:normR(x.rasi)>=0?normR(x.rasi)*30+Number(String(x.degree??'').match(/[0-9]+(?:\.[0-9]+)?/)?.[0]||0):NaN})).filter(x=>x.idx>=0);
      const planetR=Object.fromEntries(d1Rows.map(x=>[x.name,x.idx]));
      const moonRow=d1Rows.find(x=>x.name==='Moon')||{};
      const lagnaItem=arr(p1.specialLagnas?.items).find(x=>/^(lagna|ascendant)$/i.test(String(x.name||'')))||{};
      const lagnaIdx=normR(lagnaItem.rasi)>=0?normR(lagnaItem.rasi):normR(data.lagna||data.rasiLagna);
      const moonLon=Number.isFinite(moonRow.longitude)?moonRow.longitude:NaN;
      const slItem=arr(p1.specialLagnas?.items).find(x=>/sree\s*lagna|sri\s*lagna|ஸ்ரீ லக்னம்|ஸ்ரீ லக்ன/i.test(String(x.name||'')))||{};
      const slIdx=normR(slItem.rasi);
      const alIdx=normR(p2.karakamsha?.arudhaLagna||p2.arudhaLagna||vx.jaimini?.arudhaLagna||'');
      const ulItem=arr(p1.arudhas?.items).find(x=>/upapada|ul\b/i.test(String(x.name||'')))||{};
      const ulIdx=normR(ulItem.rasi);
      const hIdx=(r,h,dir=1)=>((r+(h-1)*dir)%12+12)%12;
      const oddSign=i=>[0,2,4,6,8,10].includes(i);
      const signType=i=>[0,3,6,9].includes(i)?'movable':([1,4,7,10].includes(i)?'fixed':'dual');
      const rasiAspects=i=>{
        if(i<0)return[]; if([1,4,7,10].includes(i))return [0,3,6,9].filter(x=>x!==i); if([0,3,6,9].includes(i))return [1,4,7,10].filter(x=>x!==i); return [((i+4)%12),((i+8)%12)];
      };
      const occupied=i=>d1Rows.filter(x=>x.idx===i);
      const strongerRasi=(a,b)=>{
        if(a<0)return b;if(b<0)return a;
        const oa=occupied(a).length,ob=occupied(b).length;if(oa!==ob)return oa>ob?a:b;
        const score=i=>{const l=lordOf[i];let n=0;if(planetR.Jupiter===i)n++;if(planetR.Mercury===i)n++;if(planetR[rNames[l]]===i)n++;if(rasiAspects(i).includes(planetR.Jupiter))n++;if(rasiAspects(i).includes(planetR.Mercury))n++;if(rasiAspects(i).includes(planetR[rNames[l]]))n++;return n};
        const sa=score(a),sb=score(b);if(sa!==sb)return sa>sb?a:b;return a;
      };
      const lordRasi=i=>{if(i<0)return-1;const l=lordOf[i];const pn=['Sun','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][i];return planetR[pn]??-1;};
      const exalted={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6}; const debilitated={Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0};
      const narayanaLen=i=>{const lr=lordRasi(i);if(lr<0)return 1;const dir=oddSign(i)?1:-1;let c=((lr-i)*dir%12+12)%12+1;let y=c-1;if(c===1)y=12;const pn=['Sun','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'][i];if(exalted[pn]===lr)y++;if(debilitated[pn]===lr)y--;return Math.max(1,Math.min(12,y));};
      const seqStep=(seed,step,dir)=>Array.from({length:12},(_,k)=>((seed+(k*step*dir))%12+12)%12);
      const narayanaSeq=seed=>{const t=signType(seed),dir=oddSign(hIdx(seed,9))?1:-1;if(t==='movable')return seqStep(seed,1,dir);if(t==='fixed'){let base=seqStep(seed,5,dir);const sat=planetR.Saturn===seed,ket=planetR.Ketu===seed;if(sat)base=seqStep(seed,1,dir);if(ket)base=seqStep(seed,1,-dir);return base;}const out=[];let cur=seed;for(let k=0;k<12;k++){out.push(cur);cur=k===0?((seed+4*dir)%12+12)%12:k===1?((seed+4*dir*2)%12+12)%12:((cur+1*dir)%12+12)%12;}return out;};
      const addYears=(date,years)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+Math.round(years*365.2425));return d;};
      const fmtDate=d=>{if(!(d instanceof Date)||isNaN(d))return'—';return d.toISOString().slice(0,10);};
      const birthDate=(document.getElementById('birthDate')?.value)||data.birthDate||data.date||new Date().toISOString().slice(0,10);
      const makeRasiPeriods=(name,seq,lengthFn,firstFrac=1,cycle=1)=>{let cur=new Date(birthDate+'T00:00:00Z'),rows=[];seq.forEach((r,i)=>{const full=lengthFn(r,i),years=i===0?full*firstFrac:full;const st=new Date(cur),en=addYears(cur,years);rows.push({r,years,start:fmtDate(st),end:fmtDate(en),full});cur=en;});return rows;};
      const subRasi=(rows,seedFn)=>rows.map(md=>{const seed=seedFn(md.r);const ar=seed>=0?seqStep(seed,1,oddSign(seed)?1:-1):[];let cur=new Date(md.start+'T00:00:00Z');const each=md.years/12;return {...md,antardasas:ar.map((r)=>{const st=new Date(cur),en=addYears(cur,each);cur=en;const adSeed=strongerRasi(r,(r+6)%12);let pdSeed=lordRasi(adSeed);if(pdSeed<0)pdSeed=adSeed;let pdDir=oddSign(pdSeed)?1:-1;if(planetR.Saturn===pdSeed)pdDir=1;if(planetR.Ketu===pdSeed)pdDir=-pdDir;const pdSeq=seqStep(pdSeed,1,pdDir);let pc=new Date(st),pds=[];const pe=each/12;pdSeq.forEach(pr=>{const pst=new Date(pc),pen=addYears(pc,pe);pds.push({r:pr,start:fmtDate(pst),end:fmtDate(pen),years:pe});pc=pen;});return{r,start:fmtDate(st),end:fmtDate(en),years:each,pratyantars:pds};})};});
      const ashtOrder=['Sun','Moon','Mars','Mercury','Saturn','Jupiter','Rahu','Venus'],ashtYears={Sun:6,Moon:15,Mars:8,Mercury:17,Saturn:10,Jupiter:19,Rahu:12,Venus:21};
      const ashtArcs=[[66+40/60,120,'Sun'],[120,160,'Moon'],[160,213+20/60,'Mars'],[213+20/60,253+20/60,'Mercury'],[253+20/60,293+20/60,'Saturn'],[293+20/60,333+20/60,'Jupiter'],[333+20/60,386+40/60,'Rahu'],[26+40/60,66+40/60,'Venus']];
      const findAsht=lon=>{let L=((lon%360)+360)%360;let z=L<26+40/60?L+360:L;for(const a of ashtArcs){if(z>=a[0]&&z<a[1])return a;}return ashtArcs[0];};
            // Phase 4 is loaded asynchronously after the existing Advanced report is painted.
      // This prevents Dasa calculation/rendering from blocking the main Horoscope UI.
      h+=`<div id="smvPhase4DasaSlot" class="adv-section phase4-dasa-slot"><h3>🕉️ ${ta?'Special Dasa System':'Special Dasa System'}</h3><div class="small">⏳ ${ta?'தசா கணக்கீடு ஏற்றப்படுகிறது...':'Loading Dasa calculations...'}</div></div>`;
    }catch(e){
      h+=`<div class="adv-section"><h3>⚠️ ${ta?'Special Dasa System':'Special Dasa System'}</h3><p class="small">${esc(e?.message||e)}</p></div>`;
    }


    /* PART 1 — Chart Analysis additions.
       Existing calculation data is reused; presentation is split into separate
       Chart Analysis modules so every requested item is independently visible.
    */
    try{
      const caTitle=(en,taText)=>ta?taText:en;
      const caRasiNames=ta
        ? ['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']
        : ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      // Keep the calculation map language-independent. The previous version
      // accidentally used the displayed Tamil names as the parser map when the
      // report was rendered in Tamil, causing House Classification/Baadhaka to
      // become empty for English backend rasi values.
      const caRasiMap={Aries:0,Taurus:1,Gemini:2,Cancer:3,Leo:4,Virgo:5,Libra:6,Scorpio:7,Sagittarius:8,Capricorn:9,Aquarius:10,Pisces:11,
        ar:0,ta:1,ge:2,cn:3,le:4,vi:5,li:6,sc:7,sg:8,cp:9,aq:10,pi:11,
        மேஷம்:0,ரிஷபம்:1,மிதுனம்:2,கடகம்:3,சிம்மம்:4,கன்னி:5,துலாம்:6,விருச்சிகம்:7,தனுசு:8,மகரம்:9,கும்பம்:10,மீனம்:11};
      const caNormR=v=>{
        // Accept every chart shape used by the natal/advanced engines.
        // Prefer an explicit rasi/sign/value over a display name such as
        // "Ascendant"; if only longitude is available, derive the sign.
        if(v&&typeof v==='object'){
          const direct=[v.rasi,v.sign,v.value,v.label,v.name];
          for(const item of direct){
            const q=String(item??'').trim();
            if(caRasiMap[q]!==undefined)return caRasiMap[q];
            const ql=q.toLowerCase();
            if(caRasiMap[ql]!==undefined)return caRasiMap[ql];
          }
          const lon=Number(v.longitude??v.lon??v.degreeLongitude);
          if(Number.isFinite(lon))return Math.floor((((lon%360)+360)%360)/30);
          return -1;
        }
        const q=String(v??'').trim();
        if(caRasiMap[q]!==undefined)return caRasiMap[q];
        const ql=q.toLowerCase();
        return caRasiMap[ql]!==undefined?caRasiMap[ql]:-1;
      };
      const caLordNames=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
      const caPlanetTa={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
      const caP=v=>ta?(caPlanetTa[String(raw(v))]||String(raw(v)||'—')):(planetMap[String(raw(v))]||String(raw(v)||'—'));
      const caRows=Array.isArray(data.bhavas)?data.bhavas:[];
      const lagnaObj=data.lagna||data.rasiLagna||data.ascendant||data.asc||{};
      const lagnaCandidates=[lagnaObj,data.lagnaRasi,data.rasiLagna,data.ascendantRasi,data.ascendantSign,data.asc];
      let lagnaR=-1;
      for(const candidate of lagnaCandidates){
        const idx=caNormR(candidate);
        if(idx>=0){lagnaR=idx;break;}
      }
      if(lagnaR<0 && caRows.length){
        for(const b of caRows){
          const idx=caNormR(b?.rasi??b?.sign??b);
          if(idx>=0){lagnaR=idx;break;}
        }
      }
      const baadhakaNumber=lagnaR>=0?([0,3,6,9].includes(lagnaR)?11:([1,4,7,10].includes(lagnaR)?9:7)):-1;
      const baadhakaR=baadhakaNumber>0&&lagnaR>=0?(lagnaR+baadhakaNumber-1)%12:-1;
      const caPlanets=Array.isArray(data.planets)?data.planets:[];
      const baadhakaOccupants=baadhakaR>=0?caPlanets.filter(p=>caNormR(p?.rasi??p?.sign??p)===baadhakaR).map(p=>caP(p?.planet??p?.name??p)).join(', '):'—';
      const naturalKarakas=[
        ['Sun','Atma / Father','ஆத்மா / தந்தை'],['Moon','Mind / Mother','மனம் / தாய்'],['Mars','Siblings / Property','சகோதரர்கள் / சொத்து'],
        ['Mercury','Intelligence / Learning','அறிவு / கல்வி'],['Jupiter','Children / Wisdom','புத்திரர் / ஞானம்'],['Venus','Marriage / Vehicles','திருமணம் / வாகனங்கள்'],['Saturn','Longevity / Work','ஆயுள் / தொழில்']
      ];
      const nkRows=naturalKarakas.map(x=>`<tr><td><b>${caP(x[0])}</b></td><td>${caTitle(x[1],x[2])}</td></tr>`).join('');
      const ck=Array.isArray(p2.charaKarakas)?p2.charaKarakas:[];
      const ckRows=ck.map(x=>`<tr><td>${escSafe(x.karaka||'—')}</td><td><b>${caP(x.planet)}</b></td><td>${escSafe(x.degreeInSignDms??x.degreeInSign??'—')}</td></tr>`).join('');
      // House Classification is calculated directly from Bhava number, so it
      // remains populated even when the backend's bhavas array is absent or uses
      // a different field shape. The sign is taken from the actual Lagna sign
      // and advances one sign per house.
      const houseClassMap={
        1:['Kendra','Trikona'],
        2:['Panapara','Maraka'],
        3:['Apoklima','Upachaya'],
        4:['Kendra'],
        5:['Trikona','Panapara'],
        6:['Dusthana / Trik','Upachaya','Apoklima'],
        7:['Kendra','Maraka'],
        8:['Dusthana / Trik','Panapara'],
        9:['Trikona','Apoklima'],
        10:['Kendra','Upachaya'],
        11:['Panapara','Upachaya'],
        12:['Dusthana / Trik','Apoklima']
      };
      const classTa={
        'Kendra':'கேந்திரம்','Trikona':'திரிகோணம்','Dusthana / Trik':'துஷ்டானம் / திரிக்',
        'Upachaya':'உபசயம்','Maraka':'மாரக','Panapara':'பணபர','Apoklima':'அபோக்லிம'
      };
      const bhClassRows=Array.from({length:12},(_,i)=>{
        const hNo=i+1;
        const groups=(houseClassMap[hNo]||[]).map(x=>caTitle(x,classTa[x]||x));
        const fallbackSign=lagnaR>=0?caRasiNames[(lagnaR+hNo-1)%12]:'—';
        const existing=caRows.find(b=>Number(b?.house)===hNo)||caRows[i];
        const signIdx=caNormR(existing?.rasi??existing?.sign??existing);
        const sign=signIdx>=0?caRasiNames[signIdx]:String(existing?.rasi||fallbackSign||'—');
        return `<tr><td><b>${hNo}</b></td><td>${S(sign)}</td><td><b>${groups.join(' · ')}</b></td></tr>`;
      }).join('');
      // Planetary Strength / Classical Parashari Shadbala is part of Chart Analysis.
      // The calculation values are taken directly from the existing strength3 payload;
      // no second strength engine is introduced.
      const shadbalaRows=caPlanets.filter(p=>p?.strength3?.available).map(p=>{
        const s=p.strength3||{},c=s.components||{},k=c.kala||{},st=c.sthana||{};
        const total=Number(s.totalVirupa||0),req=Number(s.requiredVirupa||0),ratio=Number(s.ratio||0);
        return `<tr><td><b>${caP(p.name)}</b></td><td>${Number(st.total||0).toFixed(1)}</td><td>${Number(c.dig||0).toFixed(1)}</td><td>${Number(k.total||0).toFixed(1)}</td><td>${Number(c.cheshta||0).toFixed(1)}</td><td>${Number(c.naisargika||0).toFixed(1)}</td><td>${Number(c.drik||0).toFixed(1)}</td><td><b>${total.toFixed(1)}</b> / ${req.toFixed(0)}<br><span class="small">${ratio>=1?caTitle('Strong','வலிமை'):caTitle('Below required','தேவையான அளவுக்கு குறைவு')} · ${ratio.toFixed(2)}×</span></td></tr>`;
      }).join('');
      h+=`<div class="adv-section part1-planetary-strength"><h4>💪 ${caTitle('Planetary Strength / Shadbala','கிரக வலிமை / ஷட்பலம்')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Planet','கிரகம்')}</th><th>${caTitle('Sthana','ஸ்தான')}</th><th>${caTitle('Dig','திக்')}</th><th>${caTitle('Kala','கால')}</th><th>${caTitle('Cheshta','சேஷ்டா')}</th><th>${caTitle('Naisargika','நைசர்கிக')}</th><th>${caTitle('Drik','த்ரிக்')}</th><th>${caTitle('Total / Required','மொத்தம் / தேவையானது')}</th></tr></thead><tbody>${shadbalaRows||`<tr><td colspan="8">${caTitle('No classical Shadbala data available.','Classical Shadbala தரவு இல்லை.')}</td></tr>`}</tbody></table></div></div>`;
      h+=`<div class="adv-section adv-ishta-kashta"><h4>✨ ${caTitle('Ishta Bala / Kashta Bala','இஷ்ட பலம் / கஷ்ட பலம்')}</h4><p class="small">${caTitle('Calculated from the existing Shadbala Uccha Bala and Cheshta Bala. Ishta = √(Uccha × Cheshta); Kashta = √((60−Uccha) × (60−Cheshta)).','ஏற்கனவே கணக்கிடப்பட்ட Shadbala-வின் உச்ச பலம் மற்றும் சேஷ்டா பலத்தைப் பயன்படுத்தி கணக்கிடப்படுகிறது. Ishta = √(Uccha × Cheshta); Kashta = √((60−Uccha) × (60−Cheshta)).')}</p><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Planet','கிரகம்')}</th><th>Uccha</th><th>Cheshta</th><th>Ishta</th><th>Kashta</th><th>${caTitle('Result','முடிவு')}</th></tr></thead><tbody>${(data.planets||[]).filter(p=>p.strength3?.available).map(p=>{const st=p.strength3||{},c=st.components||{},u=Math.max(0,Math.min(60,Number(c.sthana?.uccha||0))),ch=Math.max(0,Math.min(60,Number(c.cheshta||0))),ib=Math.sqrt(u*ch),kb=Math.sqrt((60-u)*(60-ch));return `<tr><td><b>${P(p.name)}</b></td><td>${u.toFixed(2)}</td><td>${ch.toFixed(2)}</td><td><b>${ib.toFixed(2)}</b></td><td><b>${kb.toFixed(2)}</b></td><td>${ib>kb?caTitle('Ishta dominant','இஷ்ட பலம் அதிகம்'):ib<kb?caTitle('Kashta dominant','கஷ்ட பலம் அதிகம்'):caTitle('Balanced','சமநிலை')}</td></tr>`}).join('')}</tbody></table></div></div>`;

      h+=`<div class="adv-section part1-natural-karakas"><h4>🪷 ${caTitle('Natural Karakas','இயற்கை காரகர்கள்')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Planet','கிரகம்')}</th><th>${caTitle('Natural Karaka','இயற்கை காரகம்')}</th></tr></thead><tbody>${nkRows}</tbody></table></div></div>`;
      h+=`<div class="adv-section part1-chara-karakas"><h4>🔱 ${caTitle('Chara Karakas','சர காரகர்கள்')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Chara Karaka','சர காரகம்')}</th><th>${caTitle('Planet','கிரகம்')}</th><th>${caTitle('Degree in Sign','ராசி பாகை')}</th></tr></thead><tbody>${ckRows||`<tr><td colspan="3">${caTitle('No Chara Karaka data available.','சர காரக தரவு இல்லை.')}</td></tr>`}</tbody></table></div></div>`;
      h+=`<div class="adv-section part1-baadhaka"><h4>🚧 ${caTitle('Baadhaka','பாதக ஸ்தானம்')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Reference','ஆதாரம்')}</th><th>${caTitle('Baadhaka Sthana','பாதக ஸ்தானம்')}</th><th>${caTitle('Baadhaka Sign','பாதக ராசி')}</th><th>${caTitle('Lord','அதிபதி')}</th><th>${caTitle('Occupants','உள்ள கிரகங்கள்')}</th></tr></thead><tbody><tr><td>${caTitle('Lagna','லக்னம்')}</td><td>${baadhakaNumber>0?baadhakaNumber:'—'}</td><td>${baadhakaR>=0?caRasiNames[baadhakaR]:'—'}</td><td>${baadhakaR>=0?caP(caLordNames[baadhakaR]):'—'}</td><td>${escSafe(baadhakaOccupants)}</td></tr></tbody></table></div></div>`;
      h+=`<div class="adv-section part1-house-classification"><h4>🏠 ${caTitle('House Classification','பாவ வகைப்பாடு')}</h4><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${caTitle('Bhava','பாவம்')}</th><th>${caTitle('Rasi','ராசி')}</th><th>${caTitle('Classification','வகைப்பாடு')}</th></tr></thead><tbody>${bhClassRows||`<tr><td colspan="3">${caTitle('No Bhava data available.','பாவ தரவு இல்லை.')}</td></tr>`}</tbody></table></div></div>`;
    }catch(_part1ChartAnalysisError){ console.warn('Part 1 Chart Analysis additions failed:',_part1ChartAnalysisError); }

    // V166: Preserve the single Bhava Special Features node created by the
    // core renderer, then place it into the correct Advanced Analysis part.

    /* SMV V8 NUMEROLOGY MODULE APPEND */
    try{
      const __numName=(lang==='ta'?document.getElementById('tamilAstroName')?.value:document.getElementById('englishAstroName')?.value)||'';
      const __numDob=(lang==='ta'?document.getElementById('tamilDob')?.value:document.getElementById('englishDob')?.value)||data?.birthDate||data?.date||'';
      if(typeof window.__smvRenderNumerologyModule==='function') h+=window.__smvRenderNumerologyModule(__numName,__numDob,lang);
    }catch(__numErr){console.warn('Numerology section failed:',__numErr);}

    const pendingBhavaSpecial=box.querySelector('.bhava-special-features');
    box.innerHTML=h;
    if(pendingBhavaSpecial) box.appendChild(pendingBhavaSpecial);
    // V159: Present the complete Advanced report in five orderly parts without
    // changing any calculation/rendering logic. Existing section nodes are only
    // moved into containers after they have been generated, so IDs and handlers
    // remain intact. This also keeps Acode/mobile output deterministic.
    const organizeAdvancedSections=(advancedBox, language, resultHost)=>{
      if(!advancedBox) return;
      const rootHost=resultHost || advancedBox.closest('.horoscope-result') || advancedBox.parentElement;
      const direct=Array.from(advancedBox.children).filter(n=>
        n.nodeType===1 &&
        n.classList?.contains('adv-section') &&
        !n.classList?.contains('smv-internal-placeholder')
      );

      const shell=document.createElement('div');
      shell.className='smv-advanced-shell';
      shell.setAttribute('data-scope','advanced-analysis');
      shell.setAttribute('data-version','V12-six-part-with-numerology');

      const quickNav=document.createElement('div');
      quickNav.className='smv-advanced-quick-nav';
      quickNav.setAttribute('aria-label',language==='ta'?'மேம்பட்ட ஜாதக பகுதிகள்':'Advanced horoscope sections');

      const makePart=(cls,en,taText,roman)=>{
        const p=document.createElement('section');
        p.className=`smv-advanced-part ${cls}`;
        p.dataset.smvAccordion='1'; p.dataset.smvOpen='0';
        const partId=`smv-${cls}-panel`; p.id=partId;
        const head=document.createElement('div');
        head.className='smv-advanced-part-title smv-accordion-trigger';
        head.setAttribute('role','button'); head.setAttribute('tabindex','0');
        head.setAttribute('aria-expanded','false'); head.setAttribute('aria-controls',partId+'-content');
        head.innerHTML=`<span class="smv-part-medallion" aria-hidden="true">${roman}</span><span class="smv-part-heading"><h3>${language==='ta'?taText:en}</h3><span class="smv-part-tap">☝ ${language==='ta'?'தொடுவதன் மூலம் பார்க்கவும்':'Tap to view'}</span></span><span class="smv-part-chevron" aria-hidden="true">⌄</span>`;
        const content=document.createElement('div');
        content.className='smv-advanced-part-content'; content.id=partId+'-content'; content.hidden=true;
        p.appendChild(head); p.appendChild(content); p.__smvContent=content;
        const card=document.createElement('button'); card.type='button';
        card.className='smv-advanced-quick-card'; card.dataset.smvTarget=cls;
        card.innerHTML=`<span class="smv-quick-medallion">${roman}</span><span class="smv-quick-title"><b>${language==='ta'?taText:en}</b><small>☝ ${language==='ta'?'தொடுவதன் மூலம் பார்க்கவும்':'Tap to view'}</small></span><span class="smv-quick-chevron">⌄</span>`;
        quickNav.appendChild(card);
        return p;
      };

      const advTitle=document.createElement('div');
      advTitle.className='smv-advanced-title';
      advTitle.innerHTML=language==='ta'?'<h2>மேம்பட்ட பகுப்பாய்வு</h2>':'<h2>ADVANCED ANALYSIS</h2>';
      shell.appendChild(advTitle);

      const chartPart=makePart('chart-analysis','CHART ANALYSIS','ஜாதக பகுப்பாய்வு','I');
      const dasaPart=makePart('dasa-analysis','DASA ANALYSIS','தசா பகுப்பாய்வு','II');
      const tajakaPart=makePart('tajaka-analysis','TAJAKA ANALYSIS','தாஜக பகுப்பாய்வு','III');
      const transitPart=makePart('transit-analysis','TRANSIT ANALYSIS','கோச்சார பகுப்பாய்வு','IV');
      const remedyPart=makePart('remedial-analysis','REMEDIAL MEASURES','பரிகார நடவடிக்கைகள்','V');
      const numerologyPart=makePart('numerology-analysis','NUMEROLOGY','எண் கணிதம்','VI');
      const mantraPart=makePart('daily-mantras-analysis','DAILY LIFE MANTRAS','தினசரி வாழ்க்கையில் சொல்ல வேண்டிய மந்திரங்கள்','VII');
      const adhidevataPart=makePart('adhidevata-analysis','ADHIDEVATAS','அதிதேவதைகள்','VIII');
      const deitiesPart=makePart('deities-analysis','DEITIES','தெய்வங்கள்','IX');
      const predictionPart=makePart('integrated-predictions','INTEGRATED PREDICTIONS','ஒருங்கிணைந்த பலன்கள்','X');
      [chartPart,dasaPart,tajakaPart,transitPart,remedyPart,numerologyPart,mantraPart,adhidevataPart,deitiesPart,predictionPart].forEach(p=>shell.appendChild(p));
      const accordionParts=[chartPart,dasaPart,tajakaPart,transitPart,remedyPart,numerologyPart,mantraPart,adhidevataPart,deitiesPart,predictionPart];

      const parts={chart:chartPart,dasa:dasaPart,tajaka:tajakaPart,transit:transitPart,remedy:remedyPart,numerology:numerologyPart,mantras:mantraPart,adhidevata:adhidevataPart,deities:deitiesPart,predictions:predictionPart};
      window.__smvRenderDeitiesV92?.(deitiesPart,language,data);

      const textOf=n=>String(
        n.querySelector?.('h2,h3,h4,h5')?.textContent || n.textContent || ''
      ).toLowerCase();

      const classify=(node)=>{
        if(!node || node.classList?.contains('smv-advanced-part') ||
           node.classList?.contains('smv-advanced-title')) return null;
        const txt=textOf(node);

        // DASA — all eight special-dasa systems stay together in Part II.
        if(node.classList.contains('phase4-dasa-slot') ||
           node.classList.contains('phase4-dasa-module') ||
           node.classList.contains('phase4-warning') ||
           /special dasa system|ashtottari|narayana dasa|narayana|lagna kendradi|kendradi|sudasa|drigdasa|niryaana shoola|shoola dasa|kalachakra/.test(txt))
          return dasaPart;

        // TAJAKA — the complete Tajaka module stays together in Part III.
        if(node.classList.contains('tajaka-module') ||
           /tajaka analysis|tajaka aspects|tajaka yogas|harsha bala|pratyayini|patyayini/.test(txt))
          return tajakaPart;

        // TRANSIT — all three chakras and transit modules go to Part IV.
        if(node.classList.contains('book-transit-analysis') ||
           node.classList.contains('topic26-special') ||
           /kota chakra|கோட்டா சக்கரம்|sudarshana|sudharsana|sarvatobhadra|சுதர்சன|சர்வதோபத்ர|planetary transit|transit analysis|special nakshatra transit/.test(txt))
          return transitPart;

        // REMEDIAL — only the actual remedial module goes to Part V.
        if(node.classList.contains('remedial-module') ||
           /remedial measures|பரிகார|remedial/.test(txt))
          return remedyPart;

        // NUMEROLOGY — source-based Body/Life/Name number result.
        if(node.classList.contains('numerology-module') || /numerology|எண் கணித/.test(txt))
          return numerologyPart;

        return chartPart;
      };

      // Move ONLY the modules that existed directly under advancedBox.
      // This is deterministic and prevents nested "part inside part" layers.
      direct.forEach(n=>{
        const target=classify(n);
        if(target) (target.__smvContent||target).appendChild(n);
      });
      (mantraPart.__smvContent||mantraPart).insertAdjacentHTML('beforeend', `
<div class="smv-fixed-text-section smv-vii-text">
<h3>🙏 Daily Life Mantras</h3>

<h4>For recovery from illness</h4>
<div class="smv-mantra">Om Namo Bhagavate Vasudevaya Dhanvantaraye Amrita Kalasha Hastaya<br>
Sarva Amaya Nashanaya Trailokya Nathaya Sri Maha Vishnave Namah.</div>

<h4>Sri Sudarshana Mala Mantra for success in undertakings</h4>
<div class="smv-mantra">Om Shreem Hreem Kleem Krishnaya Govindaya Gopijana Vallabhaya ... Sri Maha Sudarshanaya ... Hum Phat ... Svaha.</div>

<h4>Sri Santana Gopala Mantra for child blessing</h4>
<div class="smv-mantra">Om Devaki Suta Govinda Vasudeva Jagatpate |<br>
Dehime Tanayam Krishna Tvamaham Sharanam Gatah ||<br>
Deva Deva Jagannatha Gotra Vriddhi Karo Prabhu |<br>
Dehime Tanayam Sheeghram Ayushmantam Yashasvinam ||</div>

<h4>Sri Ashta Lakshmi Mala Mantra</h4>
<div class="smv-mantra">Om Namo Bhagavate Loka Vashikara Mohini, Om Shreem Hreem Kleem; Adi Lakshmi, Santana Lakshmi, Gaja Lakshmi, Dhana Lakshmi, Dhanya Lakshmi, Vijaya Lakshmi, Veera Lakshmi, Aishwarya Lakshmi ... Svaha.</div>

<h4>Lakshmi Hayagriva Mantra for education and knowledge</h4>
<div class="smv-mantra">Jnanandamayam Devam Nirmala Sphatikakritim |<br>
Adharam Sarva Vidyanam Hayagrivam Upasmahe ||</div>

<h4>Swayamvara Parvati Mantra for marriage</h4>
<div class="smv-mantra">Om Hreem Yogini Yogini Yogeshwari Yoga Bhayankari |<br>
Sakala Sthavara Jangamasya Mukha Hridayam Mamavasham Akarshaya Svaha ||</div>

<h4>Mahalakshmi Moola Mantra</h4>
<div class="smv-mantra">Om Shreem Hreem Shreem Kamale Kamalalaye |<br>
Praseeda Praseeda Shreem Hreem Shreem Om Mahalakshmyai Namah ||</div>

<h4>Mahalakshmi Gayatri</h4>
<div class="smv-mantra">Om Mahadevyai Cha Vidmahe Vishnupatnyai Cha Dheemahi |<br>
Tanno Lakshmih Prachodayat ||</div>

<h4>Panchamukha Hanuman Mala Mantra</h4>
<div class="smv-mantra">Om Ramadutaya Anjaneyaya Vayuputraya Mahabalaya ...<br>
Sita Hanumat Ramachandra Paramatmane ... Panchamukhi Hanumate Namah.</div>

<h4>Sri Narasimha Maha Mantra</h4>
<div class="smv-mantra">Om Ugram Veeram Maha Vishnum Jvalantam Sarvato Mukham |<br>
Nrisimham Bhishanam Bhadram Mrityor Mrityum Namamyaham ||</div>

<h4>Maha Mrityunjaya Mantra</h4>
<div class="smv-mantra">Om Tryambakam Yajamahe Sugandhim Pushtivardhanam |<br>
Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat ||</div>

<p class="smv-note-fixed">Section VII is fixed and is shown identically for every horoscope.</p>
</div>
`);
      (adhidevataPart.__smvContent||adhidevataPart).insertAdjacentHTML('beforeend', `
<div class="smv-fixed-text-section smv-viii-adhidevata">
<h3>🕉️ ADHIDEVATAS</h3>
<p>A fixed reference of the associated deities for Nakshatra, Tithi, Yoga and Karana.</p>

<h4>27 Nakshatras – Adhidevatas</h4>
<div class="adv-table-wrap smv-viii-table-scroll"><table class="smv-ref-table"><tr><th>Nakshatra</th><th>Adhidevata / Worship Deity</th></tr><tr><td>Ashwini</td><td>Sri Saraswati Devi</td></tr><tr><td>Bharani</td><td>Sri Durga Devi (Ashtabhuja)</td></tr><tr><td>Krittika</td><td>Sri Saravanabhava / Lord Muruga</td></tr><tr><td>Rohini</td><td>Sri Krishna / Vishnu</td></tr><tr><td>Mrigashira</td><td>Sri Chandra Choodeshwara / Shiva</td></tr><tr><td>Ardra</td><td>Lord Shiva</td></tr><tr><td>Punarvasu</td><td>Sri Rama / Vishnu</td></tr><tr><td>Pushya</td><td>Sri Dakshinamurti / Shiva</td></tr><tr><td>Ashlesha</td><td>Sri Adishesha / Naga Devi</td></tr><tr><td>Magha</td><td>Surya Bhagavan / Surya Narayana</td></tr><tr><td>Purva Phalguni</td><td>Sri Andal Devi</td></tr><tr><td>Uttara Phalguni</td><td>Sri Mahalakshmi Devi</td></tr><tr><td>Hasta</td><td>Sri Gayatri Devi</td></tr><tr><td>Chitra</td><td>Sri Chakrathazhwar</td></tr><tr><td>Swati</td><td>Sri Narasimha</td></tr><tr><td>Vishakha</td><td>Lord Muruga</td></tr><tr><td>Anuradha</td><td>Sri Lakshmi Narayana</td></tr><tr><td>Jyeshtha</td><td>Sri Varaha Perumal / Hayagriva</td></tr><tr><td>Mula</td><td>Sri Anjaneya</td></tr><tr><td>Purva Ashadha</td><td>Sri Jambukeshwara / Shiva</td></tr><tr><td>Uttara Ashadha</td><td>Sri Vinayaka</td></tr><tr><td>Shravana</td><td>Sri Hayagriva / Vishnu</td></tr><tr><td>Dhanishtha</td><td>Sri Anantha Sayana Perumal / Vishnu</td></tr><tr><td>Shatabhisha</td><td>Sri Mrityunjayeshwara / Shiva</td></tr><tr><td>Purva Bhadrapada</td><td>Sri Ekapada / Shiva</td></tr><tr><td>Uttara Bhadrapada</td><td>Sri Maha Ishwara / Shiva</td></tr><tr><td>Revati</td><td>Sri Ranganatha</td></tr></table></div>

<h4>Tithis – Adhidevatas</h4><h4>Shukla Paksha</h4><div class="adv-table-wrap smv-tithi-table-scroll"><table class='smv-ref-table smv-tithi-table'><tr><th>Tithi</th><th>Adhidevata / Deity</th></tr><tr><td>Pratipada</td><td>Kubera and Brahma</td></tr><tr><td>Dwitiya</td><td>Brahma</td></tr><tr><td>Tritiya</td><td>Shiva and Gauri Mata</td></tr><tr><td>Chaturthi</td><td>Yama and Ganesha</td></tr><tr><td>Panchami</td><td>Tripurasundari</td></tr><tr><td>Shashti</td><td>Mars</td></tr><tr><td>Saptami</td><td>Rishi and Indra</td></tr><tr><td>Ashtami</td><td>Kala Bhairava</td></tr><tr><td>Navami</td><td>Saraswati</td></tr><tr><td>Dashami</td><td>Veerabhadra and Dharmaraja</td></tr><tr><td>Ekadashi</td><td>Maha Rudra and Maha Vishnu</td></tr><tr><td>Dwadashi</td><td>Maha Vishnu</td></tr><tr><td>Trayodashi</td><td>Manmatha</td></tr><tr><td>Chaturdashi</td><td>Kali</td></tr><tr><td>Purnima</td><td>Lalitambika</td></tr></table></div><h4>Krishna Paksha</h4><div class="adv-table-wrap smv-tithi-table-scroll"><table class='smv-ref-table smv-tithi-table'><tr><th>Tithi</th><th>Adhidevata / Deity</th></tr><tr><td>Pratipada</td><td>Durga</td></tr><tr><td>Dwitiya</td><td>Vayu</td></tr><tr><td>Tritiya</td><td>Agni</td></tr><tr><td>Chaturthi</td><td>Yama and Ganesha</td></tr><tr><td>Panchami</td><td>Naga Devata</td></tr><tr><td>Shashti</td><td>Muruga</td></tr><tr><td>Saptami</td><td>Surya</td></tr><tr><td>Ashtami</td><td>Maha Rudra and Durga</td></tr><tr><td>Navami</td><td>Saraswati</td></tr><tr><td>Dashami</td><td>Yama and Durga</td></tr><tr><td>Ekadashi</td><td>Maha Rudra and Maha Vishnu</td></tr><tr><td>Dwadashi</td><td>Shukra</td></tr><tr><td>Trayodashi</td><td>Nandi</td></tr><tr><td>Chaturdashi</td><td>Rudra</td></tr><tr><td>Amavasya</td><td>Pitrs and Kali</td></tr></table></div>

<h4>27 Yogas – Adhidevatas</h4>
<div class="adv-table-wrap smv-viii-table-scroll"><table class="smv-ref-table"><tr><th>Yoga</th><th>Adhidevata</th></tr><tr><td>Vishkumbha</td><td>Yama</td></tr><tr><td>Priti</td><td>Vishnu</td></tr><tr><td>Ayushman</td><td>Chandra Deva</td></tr><tr><td>Saubhagya</td><td>Brahma</td></tr><tr><td>Shobhana</td><td>Brihaspati</td></tr><tr><td>Atiganda</td><td>Chandra Deva</td></tr><tr><td>Sukarma</td><td>Indra</td></tr><tr><td>Dhriti</td><td>Jala / Water deity</td></tr><tr><td>Shoola</td><td>Naga Deva</td></tr><tr><td>Ganda</td><td>Agni</td></tr><tr><td>Vriddhi</td><td>Surya Deva</td></tr><tr><td>Dhruva</td><td>Bhumi / Earth deity</td></tr><tr><td>Vyaghata</td><td>Vayu</td></tr><tr><td>Harshana</td><td>Bhaga Deva</td></tr><tr><td>Vajra</td><td>Varuna</td></tr><tr><td>Siddhi</td><td>Ganesha</td></tr><tr><td>Vyatipata</td><td>Rudra</td></tr><tr><td>Variyana</td><td>Kubera</td></tr><tr><td>Parigha</td><td>Vishvakarma</td></tr><tr><td>Shiva</td><td>Mitra Deva</td></tr><tr><td>Siddha</td><td>Kartikeya</td></tr><tr><td>Sadhya</td><td>Savitri</td></tr><tr><td>Shubha</td><td>Lakshmi</td></tr><tr><td>Shukla</td><td>Parvati</td></tr><tr><td>Brahma</td><td>Ashvini Devas</td></tr><tr><td>Indra</td><td>Pitrs</td></tr><tr><td>Vaidhriti</td><td>Dhriti</td></tr></table></div>

<h4>11 Karanas – Lord, Animal, Adhidevata & Temple</h4>
<div class="adv-table-wrap smv-viii-table-scroll"><table class="smv-ref-table smv-karana-source-table"><tr><th>Karana</th><th>Planet / Karana Lord</th><th>Animal</th><th>Adhidevata</th><th>Temple for Worship</th></tr><tr><td>Bava</td><td>Mars</td><td>Lion</td><td>Narasimha</td><td>Namakkal Lakshmi Narasimha Temple</td></tr><tr><td>Balava</td><td>Rahu</td><td>Tiger</td><td>Ayyappa</td><td>Sabarimala Ayyappa Temple / village deities</td></tr><tr><td>Kaulava</td><td>Saturn</td><td>Boar</td><td>Sri Varaha Murti</td><td>Srimushnam Sri Varaha Murti Temple, Cuddalore district</td></tr><tr><td>Taitila</td><td>Venus</td><td>Donkey</td><td>Jyeshtha Devi</td><td>Jyeshtha Devi at Brahmapureeswarar Temple, Perunagar, Kanchipuram district</td></tr><tr><td>Gara</td><td>Moon</td><td>Elephant</td><td>Ganesha</td><td>Pillaiyarpatti Ganesha Temple</td></tr><tr><td>Vanija</td><td>Sun</td><td>Bull</td><td>Nandi</td><td>Nandi Bhagavan at the Shiva temple in Thirumazhapadi, Ariyalur district</td></tr><tr><td>Vishti / Bhadra</td><td>Ketu</td><td>Rooster</td><td>Muruga</td><td>Tiruchendur Muruga Temple</td></tr><tr><td>Shakuni</td><td>Saturn</td><td>Crow</td><td>Shaneeswara</td><td>Thirunallar Shaneeswara Temple</td></tr><tr><td>Chatushpada</td><td>Jupiter</td><td>Dog</td><td>Bhairava</td><td>Kala Bhairava at Kshetrapalapuram, Kumbakonam–Kuthalam</td></tr><tr><td>Naga</td><td>Rahu</td><td>Snake</td><td>Nagaraja</td><td>Nagaraja Temple, Nagercoil</td></tr><tr><td>Kimstughna</td><td>Mercury</td><td>Worm / leech</td><td>Srirangam Ranganatha or Dhanvantari</td><td>Srirangam Ranganatha Temple or Dhanvantari Jeeva Samadhi at Vaitheeswaran Temple</td></tr></table></div>


</div>
`);

      const lagnaSlot=rootHost?.querySelector?.('#specialLagnasNextToNavamsa');
      if(lagnaSlot && lagnaSlot.parentElement!==(chartPart.__smvContent||chartPart)){
        const wrap=document.createElement('div');
        wrap.className='adv-section phase1-module special-lagnas-moved';
        wrap.appendChild(lagnaSlot);
        (chartPart.__smvContent||chartPart).appendChild(wrap);
      }

      const bhavaSpecial=rootHost?.querySelector?.('.bhava-special-features');
      if(bhavaSpecial && bhavaSpecial.parentElement!==(chartPart.__smvContent||chartPart)){
        (chartPart.__smvContent||chartPart).insertBefore(bhavaSpecial,(chartPart.__smvContent||chartPart).children[1]||null);
      }

      const chartKey=n=>{
        const t=textOf(n);
        if(n.classList.contains('part1-chart-analysis')) return 0;
        if(n.classList.contains('bhava-special-features')) return 1;
        if(n.classList.contains('special-lagnas-moved')||t.includes('special lagnas')||t.includes('சிறப்பு லக்ன')) return 2;
        if(t.includes('arudha padas')) return 3;
        if(t.includes('graha arudhas')) return 4;
        if(t.includes('graha drishti')) return 5;
        if(t.includes('rasi drishti')) return 6;
        if(t.includes('argala')) return 7;
        if(t.includes('ashtakavarga')||t.includes('bav')) return 8;
        if(t.includes('pav')||t.includes('prastaara')) return 9;
        if(t.includes('kakshya')) return 10;
        if(t.includes('planet relations')) return 11;
        if(t.includes('strength')||t.includes('shadbala')) return 12;
        if(t.includes('divisional')||t.includes('varga')) return 13;
        if(t.includes('upagraha')) return 14;
        if(t.includes('yogas')) return 15;
        if(t.includes('sahams')) return 16;
        if(n.classList.contains('part1-natural-karakas')) return 17;
        if(n.classList.contains('part1-chara-karakas')) return 18;
        if(n.classList.contains('part1-baadhaka')||t.includes('baadhaka')) return 19;
        if(n.classList.contains('part1-house-classification')||t.includes('house classification')) return 20;
        return 50;
      };

      Array.from(chartPart.__smvContent.children)
        .sort((a,b)=>chartKey(a)-chartKey(b))
        .forEach(n=>chartPart.__smvContent.appendChild(n));

      Object.values(parts).forEach(p=>p.classList.add('smv-advanced-part-ready'));

      const setAccordion=(target,open)=>{
        accordionParts.forEach(part=>{
          const isOpen=target===null?open:(part===target?open:part.dataset.smvOpen==='1');
          part.dataset.smvOpen=isOpen?'1':'0';
          const trigger=part.querySelector('.smv-accordion-trigger');
          const content=part.__smvContent;
          if(trigger) trigger.setAttribute('aria-expanded',isOpen?'true':'false');
          if(content) content.hidden=!isOpen;
          part.classList.toggle('is-expanded',isOpen);
        });
        quickNav.querySelectorAll('.smv-advanced-quick-card').forEach(card=>card.classList.toggle('is-active',!!target&&card.dataset.smvTarget===target.classList[1]&&open));
        if(target&&open) setTimeout(()=>target.scrollIntoView({behavior:'smooth',block:'start'}),20);
      };
      quickNav.querySelectorAll('.smv-advanced-quick-card').forEach(card=>card.addEventListener('click',()=>{
        const target=accordionParts.find(x=>x.classList.contains(card.dataset.smvTarget));
        if(target) setAccordion(target,target.dataset.smvOpen!=='1');
      }));
      accordionParts.forEach(part=>{
        const trigger=part.querySelector('.smv-accordion-trigger'); if(!trigger) return;
        const toggle=()=>setAccordion(part,part.dataset.smvOpen!=='1');
        trigger.addEventListener('click',toggle);
        trigger.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
      });

      advancedBox.innerHTML='';
      advancedBox.appendChild(shell);
      advancedBox.dataset.smvAdvancedOrganized='1';

      // Public helper used by async Dasa/Tajaka/Transit renderers.
      advancedBox.__smvRouteAdvancedSections=()=>{
        const movable=Array.from(advancedBox.querySelectorAll('.adv-section'));
        const seen=new Set();
        movable.forEach(n=>{
          if(seen.has(n)) return;
          seen.add(n);
          // Never move the five containers or anything nested inside a Dasa/Tajaka
          // module; their internal tables/modules belong to that parent.
          if(n.classList.contains('smv-advanced-part')) return;
          if(n.parentElement?.classList.contains('phase4-dasa-slot')) return;
          if(n.parentElement?.classList.contains('tajaka-module')) return;
          if(n.parentElement?.closest('.tajaka-module,.phase4-dasa-slot,.numerology-module,.remedial-module,.book-transit-analysis,.topic26-special'))return;
          const owner=n.closest('.smv-advanced-part');
          const target=classify(n);
          if(target && n.parentElement!==(target.__smvContent||target)) (target.__smvContent||target).appendChild(n);
          else if(owner && target && owner!==target) target.appendChild(n);
        });
      };
      advancedBox.__smvRouteAdvancedSections();
      // V60: all Advanced Analysis sections I-X start minimized.
      // Results remain fully rendered; only visibility is collapsed until the user opens a section.
      setAccordion(null,false);
    };

    const refreshAdvancedLateSections=(advancedBox)=>{
      const route=advancedBox?.__smvRouteAdvancedSections;
      if(typeof route==='function') route();
    };
    const _advancedResultHost=box.closest('.horoscope-result')||box.parentElement;
    box.classList.remove('hidden');
    // Render the single 12-Lagna table into the actual Navamsa slot AFTER the
    // horoscope DOM has been painted. The previous implementation tried to
    // write to the slot before box.innerHTML=h, so the slot was never populated.
    try{
      const specialLagnasForNavamsa=data?.v5?.phase1?.specialLagnas;
      const resultHost=box.closest('.horoscope-result')||box.parentElement;
      const navamsaLagnaSlot=resultHost?.querySelector?.('#specialLagnasNextToNavamsa');
      if(navamsaLagnaSlot && specialLagnasForNavamsa){
        const sourceItems=Array.isArray(specialLagnasForNavamsa.items)?specialLagnasForNavamsa.items:[];
        const aliases=[
          ['Lagna','லக்னம்'],['Bhava Lagna','பாவ லக்னம்'],['Hora Lagna','ஹோரா லக்னம்'],
          ['Ghati Lagna','கதி லக்னம்'],['Vighati Lagna','விகதி லக்னம்'],['Varnada Lagna','வர்ணத லக்னம்'],
          ['Sree Lagna','ஸ்ரீ லக்னம்'],['Indu Lagna','இந்து லக்னம்'],['Arudha Lagna (A1)','ஆரூட லக்னம் (A1)'],
          ['Pranapada Lagna','பிராணபத லக்னம்'],['Karakamsa Lagna','காரகாம்ச லக்னம்'],['Upapada Lagna (A12)','உபபத லக்னம் (A12)'],['Paaka Lagna','பாக லக்னம்'],['Chandra Lagna','சந்திர லக்னம்'],['Ravi Lagna','ரவி லக்னம்']
        ];
        const findItem=(en,taName)=>sourceItems.find(x=>{
          const n=String(x?.englishName||x?.name||'').trim().toLowerCase();
          return n===en.toLowerCase() || n===taName.toLowerCase() || n.replace(/\s+/g,' ')===en.toLowerCase();
        })||{};
        const purposeFallback={
          'Lagna':'Self, body and primary chart reference','Bhava Lagna':'Bhava / body reference','Hora Lagna':'Wealth, money and prosperity','Ghati Lagna':'Fame, power and authority',
          'Vighati Lagna':'Fine-grained time-sensitive reference','Varnada Lagna':'Social / professional reference','Sree Lagna':'Prosperity and wealth','Indu Lagna':'Special wealth / prosperity reference',
          'Arudha Lagna (A1)':'Public image / manifest perception','Pranapada Lagna':'Life-force and fine birth-time reference','Karakamsa Lagna':'Jaimini / Atmakaraka reference','Upapada Lagna (A12)':'Marriage / spouse reference','Paaka Lagna':'Physical self reference (textbook)','Chandra Lagna':'Mind / mental perspective reference (textbook)','Ravi Lagna':'Soul / physical vitality reference (textbook)'
        };
        const purposeTa={
          'Lagna':'சுயம் / உடல் / வாழ்க்கையின் அடிப்படை','Bhava Lagna':'பாவ / உடல் சார்ந்த குறிப்பு','Hora Lagna':'செல்வம், பணம், வளம்','Ghati Lagna':'புகழ், அதிகாரம், ஆட்சி',
          'Vighati Lagna':'மிக நுணுக்கமான நேரக் குறிப்பு','Varnada Lagna':'சமூக நிலை / தொழில் சார்ந்த குறிப்பு','Sree Lagna':'செழிப்பு / வளம்','Indu Lagna':'செல்வம் மற்றும் வளம் சார்ந்த சிறப்பு லக்னம்',
          'Arudha Lagna (A1)':'உலகப் பார்வை / வெளிப்படையான உருவம்','Pranapada Lagna':'உயிர்சக்தி / பிறப்பு நேர நுணுக்கம்','Karakamsa Lagna':'ஜைமினி / ஆத்மகாரக ஆய்வு','Upapada Lagna (A12)':'திருமணம் / துணை சார்ந்த ஆய்வு','Paaka Lagna':'உடல் / பௌதிக சுயத்தின் குறிப்பு (பாடநூல்)','Chandra Lagna':'மனம் / மனப்பாங்கின் குறிப்பு (பாடநூல்)','Ravi Lagna':'ஆத்மா / உடல் உயிர்சக்தியின் குறிப்பு (பாடநூல்)'
        };
        const rows12=aliases.map(([en,taName],i)=>{
          const x=findItem(en,taName);
          const displayName=ta?taName:en;
          const purpose=String(x.purpose||'').trim() || (ta?purposeTa[en]:purposeFallback[en]);
          return `<tr><td>${i+1}</td><td><b>${escSafe(displayName)}</b></td><td>${S(x.rasi||'—')}</td><td>${escSafe(x.degree||'—')}</td><td>${N(x.nakshatra||'—')}</td><td>${escSafe(x.pada??'—')}</td><td>${escSafe(purpose)}</td></tr>`;
        }).join('');
        navamsaLagnaSlot.innerHTML=`<div class="adv-section special-lagnas-next-navamsa"><h3>🧭 ${title('Special Lagnas','சிறப்பு லக்னங்கள்')}</h3><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>#</th><th>${title('Lagna','லக்னம்')}</th><th>${title('Rasi','ராசி')}</th><th>${title('Degree','பாகை')}</th><th>${title('Nakshatra','நட்சத்திரம்')}</th><th>${title('Pada','பாதம்')}</th><th>${title('Purpose','பயன்பாடு')}</th></tr></thead><tbody>${rows12}</tbody></table></div>${(Array.isArray(specialLagnasForNavamsa.indusKalas)&&specialLagnasForNavamsa.indusKalas.length)||(Array.isArray(specialLagnasForNavamsa.indusSteps)&&specialLagnasForNavamsa.indusSteps.length)||(Array.isArray(specialLagnasForNavamsa.indusResults)&&specialLagnasForNavamsa.indusResults.length)?`<div class="indu-results"><h4>${title('Indu Lagna / Special Dhana Lagna','இந்து லக்னம் / சிறப்பு தன லக்னம்')}</h4><h5>${title('Kalas (Root Numbers)','கலா (மூல எண்கள்)')}</h5><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>${title('Planet','கிரகம்')}</th><th>${title('Kalas','கலா')}</th></tr></thead><tbody>${(specialLagnasForNavamsa.induKalas||[]).map(r=>`<tr><td>${escSafe(r[0])}</td><td>${escSafe(r[1])}</td></tr>`).join('')}</tbody></table></div><h5>${title('How to find Indu Lagna?','இந்து லக்னத்தை எவ்வாறு கண்டறிவது?')}</h5><ol>${(specialLagnasForNavamsa.induSteps||[]).map(x=>`<li>${escSafe(x)}</li>`).join('')}</ol><h5>${title('Results','பலன்கள்')}</h5><ul>${(specialLagnasForNavamsa.induResults||[]).map(x=>`<li>${escSafe(x)}</li>`).join('')}</ul></div>`:''}</div>`;
      }
    }catch(_lagnaRenderError){ console.warn('12-Lagna Navamsa slot render failed:',_lagnaRenderError); }
    try{
      organizeAdvancedSections(box,lang,_advancedResultHost);
      box.__smvRefreshAdvancedLateSections=refreshAdvancedLateSections;
      // Dasa/Tajaka/Transit modules are asynchronous. Re-run the non-cloning
      // organizer after those modules finish so their actual tables always land
      // under II/III/IV instead of remaining at the bottom of Chart Analysis.
      refreshAdvancedLateSections(box);
    }catch(_advancedOrganizationError){ console.warn('Advanced section organization failed:',_advancedOrganizationError); }

  }
  // V8.3: expose the advanced renderer globally because some legacy horoscope
  // generator handlers run outside this ES-module scope. Without this bridge,
  // Vimshottari Dasha and everything after it stops with:
  // "renderAdvancedAstrology is not defined".
  window.renderAdvancedAstrology = renderAdvancedAstrology;
  async function loadPhase4Dasa(chartOrPayload,lang,rootId){
    const root=document.getElementById(rootId); if(!root)return;
    const slot=root.querySelector('#smvPhase4DasaSlot'); if(!slot)return;
    const escSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    try{
      const base=window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||'');
      let chart=chartOrPayload;
      if(!chart || !Array.isArray(chart.planets) || !chart.lagna){
        const p=chartOrPayload||{};
        const r=await fetch(base+'/api/horoscope/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
        const b=await r.json().catch(()=>({})); if(!r.ok)throw new Error(b.error||`HTTP ${r.status}`); chart=b;
      }
      const r=await fetch(base+'/api/horoscope/dasa',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chart})});
      const b=await r.json().catch(()=>({})); if(!r.ok)throw new Error(b.error||`HTTP ${r.status}`);
      renderPhase4Dasa(b.phase4||{},lang,slot);
      try{
        const host=root.closest('.horoscope-result')||root.parentElement;
        const ab=host?.querySelector?.('.advanced-astro-grid');
        if(ab?.__smvRouteAdvancedSections) ab.__smvRouteAdvancedSections();
      }catch(_routeDasa){}
    }catch(e){ slot.innerHTML=`<h3>⚠️ ${lang==='ta'?'Special Dasa System':'Special Dasa System'}</h3><p class="small error">${escSafe(e?.message||e)}</p>`; }
  }
  function renderPhase4Dasa(data,lang,slot){
    const ta=lang==='ta', escSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const names=ta?['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const planetNames=ta?{Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'}:{};
    const label=x=>typeof x==='number'&&x>=0&&x<12?names[x]:planetNames[x]||String(x??'—');
    const modules=[['ashtottari','🌙','Ashtottari Dasa','108-year Nakshatra Dasa'],['narayana','🪐','Narayana Dasa','Rasi Dasa'],['lagnaKendradi','🧭','Lagna Kendradi Rasi Dasa','Kendra → Panaphara → Apoklima'],['sudasa','💰','Sudasa','Sree Lagna based'],['drigdasa','👁️','Drigdasa','9th/10th/11th house groups'],['niryaanaShoola','⚔️','Niryaana Shoola Dasa','longevity timing reference'],['shoola','🕉️','Shoola Dasa','9-year rasi Dasa'],['kalachakra','⏳','Kalachakra Dasa','Nakshatra/Savya-Apasavya']];
    let h=`<h3>🕉️ ${ta?'Special Dasa System':'Special Dasa System'}</h3>`;
    for(const [key,icon,title,desc] of modules){const d=data[key]; if(!d?.available)continue; const seq=Array.isArray(d.sequence)?d.sequence:[]; const sid='smv_dasa_'+key; h+=`<div class="adv-section phase4-dasa-module"><h4>${icon} ${title}</h4><p class="small">${desc}</p>${d.seed!=null&&d.seed>=0?`<p class="small"><b>${ta?'தொடக்கம்':'Seed'}:</b> ${label(d.seed)}</p>`:''}<div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>#</th><th>${ta?'ராசி / அதிபதி':'Rasi / Lord'}</th><th>${ta?'ஆண்டுகள்':'Years'}</th><th>${ta?'தொடக்கம்':'Start'}</th><th>${ta?'முடிவு':'End'}</th><th>${ta?'உள் காலம்':'Sub-periods'}</th></tr></thead><tbody>`; seq.forEach((x,i)=>{const nm=x.rasi!=null?label(typeof x.rasi==='string'?(({'Ar':0,'Ta':1,'Ge':2,'Cn':3,'Le':4,'Vi':5,'Li':6,'Sc':7,'Sg':8,'Cp':9,'Aq':10,'Pi':11}[x.rasi] ?? x.rasi)):x.rasi):x.lord; h+=`<tr><td>${i+1}</td><td><b>${escSafe(nm)}</b></td><td>${escSafe(Number(x.years||0).toFixed(2))}</td><td>${escSafe(x.start)}</td><td>${escSafe(x.end)}</td><td>${Array.isArray(x.antardasas)?`<button type="button" class="btn gray smv-dasa-expand" data-key="${key}" data-index="${i}">${ta?'Antardasa காட்டு':'Show Antardasas'}</button><div class="smv-dasa-sub hidden"></div>`:'—'}</td></tr>`;}); h+=`</tbody></table></div>${key==='kalachakra'&&d.meta?`<p class="small">${escSafe(JSON.stringify(d.meta))}</p>`:''}</div>`;}
    h+=`<div class="adv-section phase4-warning"><p class="small"><b>${ta?'குறிப்பு':'Important:'}</b> ${ta?'இந்த தசா முறைகள் பாரம்பரிய ஜோதிட timing systems. குறிப்பாக Kalachakra மற்றும் longevity-related systems-ஐ உறுதியான எதிர்கால முடிவாகக் கருத வேண்டாம்.':'These are traditional astrological timing systems. Kalachakra and longevity-related systems should not be treated as certainty.'}</p></div>`; slot.innerHTML=h;
    slot.querySelectorAll('.smv-dasa-expand').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.key,idx=Number(btn.dataset.index),md=data[key]?.sequence?.[idx],box=btn.nextElementSibling;if(!md||!box)return; if(!box.classList.contains('hidden')){box.classList.add('hidden');return;} const subs=Array.isArray(md.antardasas)?md.antardasas:[]; box.innerHTML=subs.map((a,j)=>{const nm=a.rasi!=null?label(typeof a.rasi==='string'?(({'Ar':0,'Ta':1,'Ge':2,'Cn':3,'Le':4,'Vi':5,'Li':6,'Sc':7,'Sg':8,'Cp':9,'Aq':10,'Pi':11}[a.rasi] ?? a.rasi)):a.rasi):a.lord;return `<div class="small" style="padding:4px 0;border-bottom:1px solid #eee">${j+1}. <b>${escSafe(nm)}</b> · ${escSafe(a.start)} → ${escSafe(a.end)}</div>`;}).join('')||`<div class="small">${ta?'தரவு இல்லை':'No sub-period data.'}</div>`;window.__smvLocalizeTamilResult?.(box,lang);box.classList.remove('hidden');}));
  }
  window.__smvLoadPhase4Dasa=loadPhase4Dasa;
  window.__smvRenderPhase4Dasa=(data,lang,rootId)=>{const root=document.getElementById(rootId);const slot=root?.querySelector('#smvPhase4DasaSlot');if(slot)renderPhase4Dasa(data||{},lang,slot);};


  async function loadTransitPanchang({date,time,lat,lon,lang,rootId}){
    const root=document.getElementById(rootId); if(!root)return;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const ta=lang!=='en'; const R=ta?['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const base=window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||''); const payload={date,time,lat:Number(lat),lon:Number(lon),language:lang,utcOffsetMinutes:Number(document.getElementById('birthUtcOffset')?.value??5.5)*60};
    try{
      const [tr,pa]=await Promise.all([fetch(base+'/api/horoscope/transit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),fetch(base+'/api/horoscope/panchang',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})]);
      const td=await tr.json().catch(()=>({})), pd=await pa.json().catch(()=>({})); if(!tr.ok)throw new Error(td.error||'Transit calculation failed'); if(!pa.ok)throw new Error(pd.error||'Panchang calculation failed');
      let h=`<div class="adv-section"><h3>🪐 ${ta?'கிரக கோச்சாரம்':'Planetary Transit'}</h3><div class="adv-scroll"><table class="adv-wide"><thead><tr><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'ராசி':'Rasi'}</th><th>${ta?'பாகை':'Degree'}</th><th>${ta?'நட்சத்திரம்':'Nakshatra'}</th><th>${ta?'பாதம்':'Pada'}</th><th>${ta?'நிலை':'Status'}</th></tr></thead><tbody>`;
      (td.planets||[]).forEach(x=>h+=`<tr><td>${esc(x.name)}</td><td>${S(x.rasi)}</td><td>${esc(x.degree)}</td><td>${esc(x.nakshatra)}</td><td>${esc(x.pada)}</td><td>${x.retrograde?'↶ Retrograde':'Direct'}</td></tr>`); h+=`</tbody></table></div></div>`;
      h+=`<div class="adv-section"><h3>📅 ${ta?'தினசரி பஞ்சாங்கம்':'Daily Panchang'}</h3><div class="adv-scroll"><table class="adv-wide"><tbody><tr><th>${ta?'சூரிய ராசி':'Sun Sign'}</th><td>${S(pd.solarSign)}</td><th>${ta?'சந்திர ராசி':'Moon Sign'}</th><td>${S(pd.moonSign)}</td></tr><tr><th>${ta?'திதி':'Tithi'}</th><td>${esc(pd.tithi?.number)} — ${esc(pd.tithi?.name)}</td><th>${ta?'பக்ஷம்':'Paksha'}</th><td>${esc(pd.tithi?.half)}</td></tr><tr><th>${ta?'நட்சத்திரம்':'Nakshatra'}</th><td>${esc(pd.nakshatra?.number)} — ${esc(pd.nakshatra?.name)} / ${esc(pd.nakshatra?.pada)}</td><th>${ta?'யோகம்':'Yoga'}</th><td>${esc(pd.yoga?.number)} — ${esc(pd.yoga?.name)}</td></tr><tr><th>${ta?'கரணம்':'Karana'}</th><td>${esc(pd.karana?.name)}</td><th>${ta?'சூரிய உதயம்':'Sunrise'}</th><td>${esc(pd.sunrise)}</td></tr><tr><th>${ta?'சூரிய அஸ்தமனம்':'Sunset'}</th><td>${esc(pd.sunset)}</td><th>${ta?'அயனாம்சம்':'Ayanamsa'}</th><td>${esc(pd.ayanamsa)}</td></tr></tbody></table></div></div>`;
      root.insertAdjacentHTML('beforeend',h);
    }catch(e){root.insertAdjacentHTML('beforeend',`<div class="error"><b>${ta?'கோச்சாரம் / பஞ்சாங்கம் உருவாக்க முடியவில்லை.':'Transit / Panchang could not be calculated.'}</b><p class="small">${esc(e?.message||e)}</p></div>`);}
  }
  function renderBookTransitAnalysis(natal, transit, lang, rootId){
    const root=document.getElementById(rootId); if(!root)return;
    const ta=lang==='ta';
    const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const table=(headers,rows)=>`<div class="adv-table-wrap"><table class="adv-wide"><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows||''}</tbody></table></div>`;
    const planets=Array.isArray(transit?.planets)?transit.planets:[];
    const natalPlanets=Array.isArray(natal?.planets)?natal.planets:[];
    const pmap={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
    const nmap={Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn',Rahu:'Rahu',Ketu:'Ketu'};
    const rmap={மேஷம்:'Aries',ரிஷபம்:'Taurus',மிதுனம்:'Gemini',கடகம்:'Cancer',சிம்மம்:'Leo',கன்னி:'Virgo',துலாம்:'Libra',விருச்சிகம்:'Scorpio',தனுசு:'Sagittarius',மகரம்:'Capricorn',கும்பம்:'Aquarius',மீனம்:'Pisces'};
    const R=ta?['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்']:['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const P_EN=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
    const pLabel=x=>{const q=typeof x==='object'?(x?.name??x?.planet??''):x; const en=pmap[q]||nmap[q]||q||'—'; return ta?({Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'}[en]||en):en;};
    const rLabel=x=>{const q=typeof x==='object'?(x?.name??x?.rasi??x?.sign??''):x; return ta?String(q||'—'):(rmap[q]||q||'—');};
    const lonOf=x=>Number(x?.longitude);
    const signOf=lon=>Number.isFinite(lon)?Math.floor((((lon%360)+360)%360)/30):null;
    const houseFrom=(baseLon,targetLon)=>{const a=signOf(baseLon),b=signOf(targetLon);return a==null||b==null?'—':((b-a+12)%12)+1;};
    const natalMoon=natalPlanets.find(x=>(pmap[x.name]||x.name)==='Moon');
    const natalLagnaLon=lonOf(natal?.lagna);
    const moonLon=lonOf(natalMoon);
    const snapshot={
      Sun:[['Bad','Financial loss, many travels, discomfort'],['Bad','Unhappiness, eye troubles, fear'],['Good','Wealth, good health, victory'],['Bad','Marital disharmony, loss of name'],['Bad','Bad health, fear from enemies'],['Good','Success over enemies, good health'],['Bad','Travels, physical pain'],['Bad','Disease, setbacks in marriage'],['Bad','Mental worries, obstacles'],['Good','Success, honors, gains'],['Good','Good health, prosperity, honors'],['Bad','Expenditure, losses']],
      Moon:[['Good','Comfort, good spirits'],['Bad','Obstacles, losses'],['Good','Gains, happiness'],['Bad','Lack of peace of mind, distrust'],['Bad','Failures, disappointments, sadness'],['Good','Happiness, health, wealth'],['Good','Respect, gains'],['Bad','Losses, tension, worries'],['Bad','Mental uneasiness'],['Good','Success, gains, authority'],['Good','Prosperity, comforts, gains'],['Bad','Injuries, expenditure, sadness']],
      Mars:[['Bad','Troubles, bodily afflictions'],['Bad','Accidents, losses, thefts, quarrels'],['Good','Gains, power, wealth'],['Bad','Stomach problems, fevers, bad health'],['Bad','Troubles from enemies, trouble with children'],['Good','Success over enemies, wealth, success, well-being'],['Bad','Quarrels, marital troubles, eye problems'],['Bad','Worries, accidents, bad name, losses'],['Bad','Losses, insults, illness'],['Bad','Change of place, unexpected wealth'],['Good','Authority, gains, good name'],['Bad','Expenses, quarrels with wife, diseases']],
      Mercury:[['Bad','Quarrels, imprisonment, losses, poor advice'],['Good','Success, wealth, gains'],['Bad','Wandering, losses, trouble from authorities'],['Good','Prosperity in family, gains'],['Bad','Quarrels with wife and children, suffering'],['Good','Renown, success, ornaments'],['Bad','Quarrels, mental discomfort, addictions'],['Good','Childbirth, happiness, gains, success'],['Bad','Mental worries, obstacles'],['Good','Money, happiness, domestic harmony, success'],['Good','Childbirth, happiness, wealth'],['Bad','Disease, domestic disharmony, disease, losses']],
      Jupiter:[['Bad','Loss of money and intelligence, wandering'],['Good','Happiness, domestic harmony, success'],['Bad','Obstacles, loss of position, travels'],['Bad','Troubles, defeat, losses'],['Good','Childbirth, intelligence, prosperity, wealth'],['Bad','Mental uneasiness, enemies, worries'],['Good','Health, happiness, erotic pleasures, sense of well-being'],['Bad','Disease, imprisonment, illness, grief'],['Good','Success, wealth, childbirth, religiousness'],['Bad','Loss of position and money, ill-health, wandering'],['Good','Recovery of health and position, happiness'],['Bad','Fall from grace, misconduct, grief']],
      Venus:[['Good','Comforts, pleasures, happiness, good spirits'],['Good','Money, fortune, erotic pleasures, childbirth'],['Good','Respect, wealth, good spirits'],['Good','Prosperity, success of enemies, comforts'],['Good','Fame, power, good name'],['Bad','Loss of fame, bad name, quarrels'],['Bad','Humiliation, disease, troubles'],['Bad','Fears, mental worries, injuries, troubles from women'],['Good','Fortune, luxuries, marital happiness'],['Bad','Virtuous acts, troubles, unpleasant events, disgrace'],['Good','Gains, happiness, prosperity, comforts'],['Bad','New friends, money, pleasures, gains']],
      Saturn:[['Bad','Fear of incarceration, worries, foreign trips'],['Bad','Physical weakness, discomfort, wealth, unhappiness'],['Good','Wealth, health, happiness, all-round success'],['Bad','Stomach problems, wickedness, separation from family'],['Bad','Separation from children, uneasiness, quarrels'],['Good','Freedom from disease and enemies, success'],['Bad','Wandering, quarrels with spouse, trouble from authorities'],['Bad','Suffering, loss of status and balance, imprisonment'],['Bad','Diseases, suffering, loss of status'],['Bad','Loss of money, bad name, changes in career, laziness'],['Good','Wealth, success, gains'],['Bad','Grief, misery, losses, ill-health, frustration']]
    };
    // Janma-Rasi transit configuration requested by the user:
    // Rahu uses Saturn's house-wise result pattern; Ketu uses Mars' result pattern.
    const snapFor=(en,house)=>{
      const mapped=en==='Rahu'?'Saturn':en==='Ketu'?'Mars':en;
      const x=snapshot[mapped]?.[Math.max(0,house-1)];
      return x||['—','—'];
    };
    const moonRows=planets.map(x=>{const en=pmap[x.name]||x.name; const h=houseFrom(moonLon,lonOf(x)); const ss=snapFor(en,h); return `<tr><td>${pLabel(x.name)}</td><td>${rLabel(x.rasi)}</td><td>${esc(h)}</td><td><b>${esc(ss[0])}</b></td><td>${esc(ss[1])}</td></tr>`;}).join('');
    const lagnaRows=planets.map(x=>{const h=houseFrom(natalLagnaLon,lonOf(x)); return `<tr><td>${pLabel(x.name)}</td><td>${rLabel(x.rasi)}</td><td>${esc(h)}</td><td>${esc(lonOf(x).toFixed(4))}°</td></tr>`;}).join('');
    const contacts=[];
    for(const t of planets){const tl=lonOf(t);if(!Number.isFinite(tl))continue;for(const n of natalPlanets){const nl=lonOf(n);if(!Number.isFinite(nl))continue;let d=Math.abs(((tl-nl+540)%360)-180);if(d<=3)contacts.push(`<tr><td>${pLabel(t.name)}</td><td>${pLabel(n.name)}</td><td>${esc(d.toFixed(2))}°</td><td>${esc(t.retrograde?'Retrograde':'Direct')}</td></tr>`);}}
    const divs=[];
    const natalD9=natalPlanets.map(n=>({planet:pLabel(n.name),sign:signOf(lonOf(n))==null?null:Math.floor((((((lonOf(n)%30)+30)%30))/ (30/9))),lon:lonOf(n)}));
    for(const t of planets){const tl=lonOf(t);if(!Number.isFinite(tl))continue;const s=signOf(tl),within=((tl%30)+30)%30;const p9=Math.min(8,Math.floor(within/(30/9)));const start=s%3===0?s:s%3===1?(s+8)%12:(s+4)%12;const d9=(start+p9)%12;const hit=natalPlanets.filter(n=>{const nl=lonOf(n);if(!Number.isFinite(nl))return false;const ns=signOf(nl),nw=((nl%30)+30)%30,np9=Math.min(8,Math.floor(nw/(30/9))),nst=ns%3===0?ns:ns%3===1?(ns+8)%12:(ns+4)%12;return (nst+np9)%12===d9;}).map(n=>pLabel(n.name));divs.push(`<tr><td>${pLabel(t.name)}</td><td>${R[d9]}</td><td>${hit.length?hit.join(', '):'—'}</td></tr>`);}
    const currentSpecial=[];
    const sahams=(natal?.sahams?.items||[]); for(const s of sahams){const sl=Number(s.longitude);if(!Number.isFinite(sl))continue;for(const t of planets){const tl=lonOf(t);if(!Number.isFinite(tl))continue;const d=Math.abs(((tl-sl+540)%360)-180);if(d<=1)currentSpecial.push(`<tr><td>${pLabel(t.name)}</td><td>${esc(s.name)}</td><td>${esc(d.toFixed(2))}°</td><td>${rLabel(s.rasi||R[signOf(sl)])}</td></tr>`);}}
    const body=`<div class="adv-section v5-module book-transit-analysis"><h3>🧭 ${ta?'Transit Analysis':'Transit Analysis'}</h3>
      <h4>${ta?'ஜன்ம ராசியிலிருந்து கோச்சாரம்':'Transits from Janma Rasi'}</h4>${table([ta?'கிரகம்':'Planet',ta?'கோச்சார ராசி':'Transit Rasi',ta?'சந்திரனிலிருந்து பாவம்':'House from Moon',ta?'நிலை':'Snapshot',ta?'பாடநூல் குறிப்பிட்ட பொதுப் பலன்':'Textbook Typical Result'],moonRows||`<tr><td colspan="5">${ta?'தரவு இல்லை':'No transit data.'}</td></tr>`)}
      <h4>${ta?'லக்னத்திலிருந்து கோச்சாரம்':'Transits from Natal Lagna'}</h4>${table([ta?'கிரகம்':'Planet',ta?'கோச்சார ராசி':'Transit Rasi',ta?'லக்னத்திலிருந்து பாவம்':'House from Lagna',ta?'நீளவியல்':'Longitude'],lagnaRows)}
      <h4>${ta?'நடப்பு கிரகம் ↔ பிறப்பு கிரகம் நெருக்கம்':'Transit → Natal Planet Contacts'}</h4>${table([ta?'கோச்சார கிரகம்':'Transit Planet',ta?'பிறப்பு கிரகம்':'Natal Planet',ta?'தூரம்':'Orb',ta?'நிலை':'Motion'],contacts.join('')||`<tr><td colspan="4">${ta?'3°க்குள் குறிப்பிடத்தக்க நெருக்கம் இல்லை.':'No major contact within 3°.'}</td></tr>`)}
      <h4>${ta?'D-9 கோச்சார செயல்படுத்தல்':'Natal Rasi ↔ Transit Navamsa (D-9)'}</h4>${table([ta?'கோச்சார கிரகம்':'Transit Planet',ta?'கோச்சார D-9 ராசி':'Transit D-9 Sign',ta?'அதே D-9 ராசியில் பிறப்பு கிரகங்கள்':'Natal planets activated'],divs.join(''))}
      <h4>${ta?'சஹம் அருகாமை':'Transit Near Natal Sahams'}</h4>${table([ta?'கோச்சார கிரகம்':'Transit Planet',ta?'சஹம்':'Saham',ta?'தூரம்':'Orb',ta?'ராசி':'Rasi'],currentSpecial.join('')||`<tr><td colspan="4">${ta?'1°க்குள் சஹம் நெருக்கம் இல்லை.':'No transit planet is within 1° of a natal Saham.'}</td></tr>`)}
</div>`;
    const target=root.querySelector?.('.smv-advanced-part.transit-analysis')||root; target.insertAdjacentHTML('beforeend',body);
  }

  function renderTopic26SpecialNakshatraDetails(natal, transit, lang, rootId){
    const root=document.getElementById(rootId); if(!root)return; const ta=lang==='ta';
    const esc=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const nakNames=['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishtha','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
    const pmap={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
    const pkey=v=>{const q=typeof v==='object'?(v?.name??v?.planet??''):v;return pmap[q]||q||''};
    const natalPlanets=Array.isArray(natal?.planets)?natal.planets:[], transitPlanets=Array.isArray(transit?.planets)?transit.planets:[];
    const nakIndex=x=>{const q=String(x?.nakshatra?.name??x?.nakshatra??'').toLowerCase();let i=nakNames.findIndex(n=>q===n.toLowerCase()||q.includes(n.toLowerCase())); if(i>=0)return i; const lon=Number(x?.longitude); return Number.isFinite(lon)?Math.floor((((lon%360)+360)%360)/(360/27)):-1;};
    const moon=natalPlanets.find(x=>pkey(x.name)==='Moon')||{}, janma=nakIndex(moon), lagnaNak=nakIndex(natal?.lagna||{}), countFrom=(a,b)=>a>=0&&b>=0?((b-a+27)%27)+1:null;
    const taraNames=['Janma Tara','Sampat Tara','Vipat Tara','Kshema Tara','Pratyak Tara','Saadhana Tara','Naidhana/Vadha Tara','Mitra Tara','Parama Mitra Tara'];
    const special=[['Janma Nakshatra',1,'General well-being'],['Jaati Nakshatra',4,'Community / class / nature / profession'],['Naidhana Nakshatra',7,'Death / suffering'],['Desa Nakshatra',12,'Country'],['Abhisheka / Raajya Nakshatra',13,'Power / authority'],['Sanghaatika Nakshatra',16,'Group / social activities'],['Saamudaayika Nakshatra',18,'Crowd / group activities'],['Aadhaana Nakshatra',19,'Family well-being'],['Vainaasika / Vinaasana Nakshatra',22,'Destruction'],['Maanasa Nakshatra',25,'Mental state'],['Karma Nakshatra',10,'Profession / workplace']];
    const taraInfo=i=>{const c=countFrom(janma,i);if(!c)return['—','—'];const k=(c-1)%9;return[taraNames[k],[1,2,4,6,8,9].includes(k+1)?'Favorable':k===0?'Mixed':'Unfavorable']};
    const specialRows=special.map(([n,c,m])=>{const ni=janma>=0?(janma+c-1)%27:-1;return`<tr><td>${esc(n)}</td><td>${c}</td><td><b>${esc(nakNames[ni]||'—')}</b></td><td>${esc(m)}</td></tr>`}).join('');
    const rasiNames=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const rasiAliases={மேஷம்:0,ரிஷபம்:1,மிதுனம்:2,கடகம்:3,சிம்மம்:4,கன்னி:5,துலாம்:6,விருச்சிகம்:7,தனுசு:8,மகரம்:9,கும்பம்:10,மீனம்:11,aries:0,taurus:1,gemini:2,cancer:3,leo:4,virgo:5,libra:6,scorpio:7,sagittarius:8,capricorn:9,aquarius:10,pisces:11};
    const rasiIndex=x=>{const lon=Number(x?.longitude);if(Number.isFinite(lon))return Math.floor((((lon%360)+360)%360)/30);const q=String(x?.rasi??'').trim().toLowerCase();if(Object.prototype.hasOwnProperty.call(rasiAliases,q))return rasiAliases[q];return rasiNames.findIndex(r=>q.includes(r.toLowerCase()))};
    const natalMoonRasi=rasiIndex(moon);
    const vedha={Sun:{3:9,6:12,10:4,11:5},Moon:{1:5,3:9,6:12,7:2,10:4,11:8},Mars:{3:12,6:9,11:5},Mercury:{2:5,4:3,6:9,8:1,10:8,11:12},Jupiter:{2:12,5:4,7:3,9:10,11:8},Venus:{1:8,2:7,3:1,4:10,5:9,8:5,9:11,11:6,12:3},Saturn:{3:12,6:9,11:5}};
    const gochRows=transitPlanets.filter(x=>vedha[pkey(x.name)]).map(x=>{const ti=rasiIndex(x),from=natalMoonRasi>=0&&ti>=0?((ti-natalMoonRasi+12)%12)+1:null,vh=from?vedha[pkey(x.name)]?.[from]:null;const blockers=vh?transitPlanets.filter(y=>{const yi=rasiIndex(y);return yi>=0&&natalMoonRasi>=0&&((yi-natalMoonRasi+12)%12)+1===vh&&pkey(y.name)!==pkey(x.name)&&!((pkey(x.name)==='Sun'&&pkey(y.name)==='Saturn')||(pkey(x.name)==='Saturn'&&pkey(y.name)==='Sun')||(pkey(x.name)==='Moon'&&pkey(y.name)==='Mercury')||(pkey(x.name)==='Mercury'&&pkey(y.name)==='Moon'))}).map(y=>pkey(y.name)):[];return`<tr><td>${esc(pkey(x.name))}</td><td>${esc(x.rasi||'—')}</td><td>${from??'—'}</td><td>${vh??'—'}</td><td>${esc(blockers.join(', ')||'—')}</td></tr>`}).join('');
    const aspectOffsets={Sun:[14,15],Moon:[14,15],Mars:[1,3,7,8,15],Mercury:[1,15],Venus:[1,15],Jupiter:[10,15,19],Saturn:[3,5,15,19]};
    const aspRows=transitPlanets.filter(x=>aspectOffsets[pkey(x.name)]).flatMap(x=>aspectOffsets[pkey(x.name)].map(o=>{const ni=nakIndex(x),target=ni>=0?(ni+o-1)%27:-1;return`<tr><td>${esc(pkey(x.name))}</td><td>${esc(nakNames[ni]||'—')}</td><td>${o}</td><td>${esc(nakNames[target]||'—')}</td><td>${['Moon','Mercury','Jupiter','Venus'].includes(pkey(x.name))?'Benefic':'Malefic'}</td></tr>`})).join('');
    const latta={Sun:[12,1],Mars:[3,1],Jupiter:[6,1],Saturn:[8,1],Moon:[22,-1],Mercury:[7,-1],Venus:[5,-1],Rahu:[9,-1]};
    const latRows=transitPlanets.filter(x=>latta[pkey(x.name)]).map(x=>{const ni=nakIndex(x),[n,dir]=latta[pkey(x.name)],target=ni>=0?(ni+dir*(n-1)+270)%27:-1;return`<tr${target===janma||target===lagnaNak?' class="highlight-row"':''}><td>${esc(pkey(x.name))}</td><td>${esc(nakNames[ni]||'—')}</td><td>${n}</td><td>${dir>0?'Forward':'Backward'}</td><td>${esc(nakNames[target]||'—')}</td><td>${target===janma||target===lagnaNak?'Hits Janma/Lagna Nakshatra':'—'}</td></tr>`}).join('');
    const body=[['Sun',[['1','Mouth / Face','Destruction'],['2–5','Head','Influx of wealth'],['6–9','Chest','Victory'],['10–13','Right hand','Wealth'],['14–19','Two feet','Poverty'],['20–23','Left hand','Physical ailments'],['24–25','Eyes','Gains'],['26–27','Private parts','Death']]],['Moon',[['1–2','Face','Great fear'],['3–6','Head','Well-being'],['7–8','Back','Victory over enemies'],['9–10','Eyes','Money'],['11–15','Heart','Comforts and peace'],['16–18','Left hand','Quarrels'],['19–24','Two feet','Going abroad'],['25–27','Right hand','Financial gains']]],['Mars',[['1–2','Mouth / Face','Death'],['3–8','Two feet','Separation'],['9–11','Chest','Victory'],['12–15','Left hand','Poverty'],['16–17','Head','Gains'],['18–21','Face','Great fear'],['22–25','Right hand','Well-being'],['26–27','Eyes','Going abroad']]],['Mercury / Jupiter / Venus',[['1–3','Head','Grief'],['4–6','Face','Gains'],['7–12','Two hands','Misfortune'],['13–17','Stomach','Amassing of wealth'],['18–19','Private parts','Destruction'],['20–27','Two feet','Honor and fame']]],['Saturn / Rahu / Ketu',[['1','Face','Grief'],['2–5','Right hand','Comforts'],['6–8','Right leg','Travels'],['9–11','Left leg','Destruction'],['12–15','Left hand','Gains'],['16–20','Stomach','Pleasures'],['21–23','Head','Comforts'],['24–25','Eyes','Comforts'],['26–27','Back','Death']]]];
    const bodyHtml=body.map(([pn,rs])=>`<h5>${esc(pn)}</h5><div class="adv-table-wrap"><table class="adv-wide"><thead><tr><th>Janma-star count</th><th>Body part</th><th>Standard result</th></tr></thead><tbody>${rs.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>`).join('');
    const murthiRows=transitPlanets.map(x=>{const ti=rasiIndex(x),h=natalMoonRasi>=0&&ti>=0?((ti-natalMoonRasi+12)%12)+1:null;const m=h&&[1,6,11].includes(h)?['Swarna','Highly favorable']:h&&[2,5,9].includes(h)?['Rajata','Favorable']:h&&[3,7,10].includes(h)?['Taamra','Unfavorable']:h&&[4,8,12].includes(h)?['Loha','Highly unfavorable']:['—','—'];return`<tr><td>${esc(pkey(x.name))}</td><td>${esc(x.rasi||'—')}</td><td>${h??'—'}</td><td>${m[0]}</td><td>${m[1]}</td></tr>`}).join('');
    const transitRows=transitPlanets.map(x=>{const ni=nakIndex(x),c=countFrom(janma,ni),[tara,result]=taraInfo(ni),hit=special.filter(s=>c===s[1]).map(s=>s[0]).join(', ');return`<tr${hit?' class="highlight-row"':''}><td>${esc(pkey(x.name))}</td><td>${esc(nakNames[ni]||'—')}</td><td>${c??'—'}</td><td>${esc(tara)}</td><td>${esc(result)}</td><td>${esc(hit||'—')}</td></tr>`}).join('');
    const simple=(heads,body)=>`<div class="adv-table-wrap"><table class="adv-wide"><thead><tr>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
    const html=`<div class="adv-section v5-module topic26-special"><h3>🌟 ${ta?'சிறப்பு நட்சத்திர கோச்சார விவரங்கள்':'Special Nakshatra Transit Details'}</h3><h4>Murthis</h4>${simple(['Planet','Rasi','House from Natal Moon','Murthi','Result'],murthiRows)}<h4>Rasi Gochara Vedha</h4>${simple(['Planet','Transit Rasi','House','Vedha House','Obstructors'],gochRows||'<tr><td colspan="5">No supported vedha detected.</td></tr>')}<h4>Taras & Special Nakshatras</h4>${simple(['Transit Planet','Transit Nakshatra','Count from Janma','Tara','Result','Special Nakshatra'],transitRows)}<h5>Special Nakshatra Definitions</h5>${simple(['Name','Count','Nakshatra Name','Area'],specialRows)}<h4>Nakshatra-based Aspects</h4>${simple(['Planet','From Nakshatra','Offset','Aspected Nakshatra','Nature'],aspRows)}<h4>Constellations & Body Parts</h4>${bodyHtml}<h4>Latta</h4>${simple(['Planet','Transit Nakshatra','Count','Direction','Latta Nakshatra','Janma/Lagna Hit'],latRows)}<p class="small"><b>Janma Nakshatra:</b> ${esc(nakNames[janma]||'—')} · <b>Lagna Nakshatra:</b> ${esc(nakNames[lagnaNak]||'—')}</p></div>`;
    const transitTarget =
      root.querySelector?.('.smv-advanced-part.transit-analysis') ||
      root.querySelector?.('.smv-advanced-shell .transit-analysis') ||
      root;
    transitTarget.insertAdjacentHTML('beforeend',html);
  }

    async function loadAdvancedAstrology({date,time,lat,lon,lang,rootId,name='',chart=null,generationId=null}){
    const root=document.getElementById(rootId); if(!root)return;
    const escSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const isCurrent=()=>generationId==null || Number(generationId)===Number(window.__smvHoroscopeGenerationId||generationId);
    const base=window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||'');

    // FAST/SAFE FIX: cancel any older advanced horoscope request before starting
    // a new one.  This prevents hidden Tamil/English copies from continuing to
    // consume the Render server after a newer horoscope has taken over.
    try{ window.__smvAdvancedAbortController?.abort(); }catch(_e){}
    const advancedAbortController=new AbortController();
    window.__smvAdvancedAbortController=advancedAbortController;
    if(root){ root.innerHTML=''; root.classList.add('hidden'); }

    const payload={date,time,lat:Number(lat),lon:Number(lon),height:0,utcOffsetMinutes:Number(document.getElementById('birthUtcOffset')?.value??5.5)*60,houseSystem:'S',language:lang,name:String(name||'')};
    // Keep the Advanced host hidden until the first advanced response is ready.
    // This prevents an old/partial module from flashing below the fresh horoscope.
    root.classList.add('hidden');
    const post=(path,body=payload)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(body),signal:advancedAbortController.signal}).then(async r=>{const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||`HTTP ${r.status}`);return b;});

    // Birth Panchang is calculated for the native's birth date/time.
    // Daily Panchang + Planetary Transit are calculated for TODAY/NOW.
    const now=new Date();
    const pad=n=>String(n).padStart(2,'0');
    const dailyDate=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
    const dailyTime=`${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const dailyPayload={...payload,date:dailyDate,time:dailyTime};
    const resultHost=root.closest('.horoscope-result')||root.parentElement;
    const birthSlot=resultHost?.querySelector?.('#birthTimePanchangSlot');
    if(birthSlot) birthSlot.innerHTML=renderBirthTimePanchang({requested:{date,time}},lang,date,time);
    let transitSlot=resultHost?.querySelector?.('.daily-transit-panchang-slot');
    if(!transitSlot && birthSlot){
      transitSlot=document.createElement('div');
      transitSlot.className='daily-transit-panchang-slot';
      birthSlot.insertAdjacentElement('afterend',transitSlot);
    }
    if(transitSlot) transitSlot.id=rootId==='englishAdvancedAstrology'?'englishDailyTransitPanchangSlot':'tamilDailyTransitPanchangSlot';

    // FINAL LOADING FIX: start ALL calculations at the same time.
    // The existing page loading/progress UI remains untouched.  Nothing is
    // released individually; Birth Panchang, Daily Panchang, Transit and all
    // Advanced features are rendered together only after every calculation
    // has completed.  This makes the results appear as one single batch.
    // Render the entire horoscope as one server-side batch. The browser does
    // not reveal any section until core chart + advanced astrology + birth
    // panchang + daily panchang + transit + special dasha are all complete.
    return post('/api/horoscope/full',{...payload,dailyDate,dailyTime,tajakaYear:new Date().getFullYear()}).then(async (full)=>{
      if(full?.ok!==true || full?.meta?.complete!==true) throw new Error(full?.error||'Full horoscope calculation was not completed.');
      let advancedData=full?.advanced||{};
  /* SMV KOTA NAME SOUND / NAME NAKSHATRA */
try{
  advancedData=window.__smvApplyKotaNameCalculation(
    advancedData,
    name,
    lang
  );
}catch(_e){}
      // Backward-compatible fallback: older Render deployments may not yet expose
      // §15.4.2–15.4.4 in /api/horoscope/full. Fetch the same verified advanced
      // chart once and merge only the new Avastha block; all existing features stay intact.
      if(!advancedData.avastha154){
        try{
          const av154Resp=await post('/api/horoscope/advanced',{...payload,tajakaYear:new Date().getFullYear()});
          if(av154Resp?.ok) advancedData={...advancedData,avastha154:av154Resp.avastha154};
        }catch(_e){ /* preserve existing full result if fallback is unavailable */ }
      }
      const required=['ashtakavarga','vargas','avastha','avakhada','kota','sudarshana','sarvatobhadra','planetRelations','remedies','phase2','tajaka'];
      const missing=required.filter(k=>!Object.prototype.hasOwnProperty.call(advancedData,k));
      if(missing.length) throw new Error('Full horoscope is incomplete. Missing features: '+missing.join(', '));

      // KOTA NAME-SOUND COMPATIBILITY FIX:
      // Accept both Tamil-script and English/Roman names. The backend remains
      // the source of truth; this only fills missing name-sound fields so the
      // Kota/Sarvatobhadra presentation never depends on the input script.
      const kotaPadaSounds=[
        {en:"Ashwini",p:["Chu", "Che", "Cho", "La"],ta:["\u0b9a\u0bc2", "\u0b9a\u0bc7", "\u0b9a\u0bcb", "\u0bb2\u0bbe"]},{en:"Bharani",p:["Li", "Lu", "Le", "Lo"],ta:["\u0bb2\u0bbf", "\u0bb2\u0bc1", "\u0bb2\u0bc7", "\u0bb2\u0bcb"]},{en:"Krittika",p:["A", "E", "U", "Ae"],ta:["\u0b85", "\u0b88", "\u0b89", "\u0b8f"]},{en:"Rohini",p:["O", "Va", "Vi", "Vu"],ta:["\u0b93", "\u0bb5\u0bbe", "\u0bb5\u0bbf", "\u0bb5\u0bc1"]},{en:"Mrigashira",p:["Ve", "Vo", "Ka", "Ki"],ta:["\u0bb5\u0bc7", "\u0bb5\u0bcb", "\u0b95\u0bbe", "\u0b95\u0bbf"]},{en:"Ardra",p:["Ku", "Gha", "Na", "Cha"],ta:["\u0b95\u0bc1", "\u0b95", "\u0ba8", "\u0b9a"]},{en:"Punarvasu",p:["Ke", "Ko", "Ha", "Hi"],ta:["\u0b95\u0bc7", "\u0b95\u0bcb", "\u0bb9", "\u0bb9\u0bbf"]},{en:"Pushya",p:["Hu", "He", "Ho", "Da"],ta:["\u0bb9\u0bc1", "\u0bb9\u0bc7", "\u0bb9\u0bcb", "\u0b9f"]},{en:"Ashlesha",p:["Di", "Du", "De", "Do"],ta:["\u0b9f\u0bbf", "\u0b9f\u0bc1", "\u0b9f\u0bc7", "\u0b9f\u0bcb"]},{en:"Magha",p:["Ma", "Mi", "Mu", "Me"],ta:["\u0bae", "\u0bae\u0bbf", "\u0bae\u0bc1", "\u0bae\u0bc7"]},{en:"Purva Phalguni",p:["Mo", "Ta", "Ti", "Tu"],ta:["\u0bae\u0bcb", "\u0b9f", "\u0b9f\u0bbf", "\u0b9f\u0bc1"]},{en:"Uttara Phalguni",p:["Te", "To", "Pa", "Pi"],ta:["\u0ba4\u0bc7", "\u0ba4\u0bcb", "\u0baa", "\u0baa\u0bbf"]},{en:"Hasta",p:["Pu", "Sha", "Na", "Tha"],ta:["\u0baa\u0bc1", "\u0bb7", "\u0ba3", "\u0ba4"]},{en:"Chitra",p:["Pe", "Po", "Ra", "Ri"],ta:["\u0baa\u0bc7", "\u0baa\u0bcb", "\u0bb0\u0bbe", "\u0bb0\u0bbf"]},{en:"Swati",p:["Ru", "Re", "Ro", "Ta"],ta:["\u0bb0\u0bc1", "\u0bb0\u0bc7", "\u0bb0\u0bcb", "\u0ba4"]},{en:"Vishakha",p:["Ti", "Tu", "Te", "To"],ta:["\u0ba4\u0bbf", "\u0ba4\u0bc1", "\u0ba4\u0bc7", "\u0ba4\u0bcb"]},{en:"Anuradha",p:["Na", "Ni", "Nu", "Ne"],ta:["\u0ba8", "\u0ba8\u0bbf", "\u0ba9\u0bc1", "\u0ba8\u0bc7"]},{en:"Jyeshtha",p:["No", "Ya", "Yi", "Yu"],ta:["\u0ba8\u0bcb", "\u0baf", "\u0baf\u0bbf", "\u0baf\u0bc1"]},{en:"Mula",p:["Ye", "Yo", "Bha", "Bhi"],ta:["\u0baf\u0bc7", "\u0baf\u0bcb", "\u0baa", "\u0baa\u0bbf"]},{en:"Purva Ashadha",p:["Bhu", "Dha", "Pha", "Da"],ta:["\u0baa\u0bc2", "\u0ba4", "\u0baa", "\u0b9f"]},{en:"Uttara Ashadha",p:["Bhe", "Bho", "Ja", "Ji"],ta:["\u0baa\u0bc7", "\u0baa\u0bcb", "\u0b9c", "\u0b9c\u0bbf"]},{en:"Shravana",p:["Ju", "Je", "Jo", "Gha"],ta:["\u0b9c\u0bc1", "\u0b9c\u0bc7", "\u0b9c\u0bcb", "\u0b95"]},{en:"Dhanishtha",p:["Ga", "Gi", "Gu", "Ge"],ta:["\u0b95", "\u0b95\u0bbf", "\u0b95\u0bc1", "\u0b95\u0bc7"]},{en:"Shatabhisha",p:["Go", "Sa", "Si", "Su"],ta:["\u0b95\u0bcb", "\u0b9a", "\u0b9a\u0bbf", "\u0b9a\u0bc1"]},{en:"Purva Bhadrapada",p:["Se", "So", "Da", "Di"],ta:["\u0b9a\u0bc7", "\u0b9a\u0bcb", "\u0ba4", "\u0ba4\u0bbf"]},{en:"Uttara Bhadrapada",p:["Du", "Tha", "Jha", "Na"],ta:["\u0ba4\u0bc1", "\u0ba4", "\u0b9c", "\u0ba8"]},{en:"Revati",p:["De", "Do", "Cha", "Chi"],ta:["\u0ba4\u0bc7", "\u0ba4\u0bcb", "\u0b9a", "\u0b9a\u0bbf"]}
      ];
      const kotaFindNameSound=(value)=>{
        const q=String(value??'').trim();
        if(!q)return null;
        const tamil=/[\u0B80-\u0BFF]/.test(q);
        const list=kotaPadaSounds.flatMap((x,ni)=>x.p.map((s,pi)=>({nak:x.en,pada:pi+1,en:s,ta:x.ta[pi],ni})));
        list.sort((a,b)=>(tamil?b.ta.length-a.ta.length:b.en.length-a.en.length));
        const low=q.toLowerCase();
        return list.find(x=>tamil?q.startsWith(x.ta):low.startsWith(x.en.toLowerCase()))||null;
      };
      const kotaSoundForBirth=(nak,pada)=>{
        const q=String(nak??'').trim().toLowerCase();
        const i=kotaPadaSounds.findIndex(x=>x.en.toLowerCase()===q || q.includes(x.en.toLowerCase()));
        const p=Math.max(1,Math.min(4,Number(pada)||1));
        if(i<0)return null;
        return {en:kotaPadaSounds[i].p[p-1],ta:kotaPadaSounds[i].ta[p-1],nak:kotaPadaSounds[i].en,pada:p};
      };
      const kotaInputName=String(name||'').trim();
      const kotaNameMatch=kotaFindNameSound(kotaInputName);
      const kotaBirthMatch=kotaSoundForBirth(
        (full?.chart||chart)?.moonNakshatra||(full?.chart||chart)?.moonNak||(full?.chart||chart)?.moon?.nakshatra||'',
        (full?.chart||chart)?.moonPada||(full?.chart||chart)?.moon?.pada||1
      );
      if(advancedData?.kota){
        advancedData.kota.nativeName=kotaInputName||advancedData.kota.nativeName||'';
        if(kotaNameMatch){
          if(!advancedData.kota.nameInitial) advancedData.kota.nameInitial=kotaNameMatch.en;
          if(!advancedData.kota.nameNakshatra) advancedData.kota.nameNakshatra=kotaNameMatch.en;
          if(!advancedData.kota.nameNakshatraPada) advancedData.kota.nameNakshatraPada=kotaNameMatch.pada;
          if(!advancedData.kota.nameSyllable) advancedData.kota.nameSyllable=lang==='ta'?kotaNameMatch.ta:kotaNameMatch.en;
        }
        if(kotaBirthMatch && !advancedData.kota.janmaNakshatraSound)
          advancedData.kota.janmaNakshatraSound=lang==='ta'?kotaBirthMatch.ta:kotaBirthMatch.en;
      }
      const bp=full?.birthPanchang||{};
      const pr=full?.dailyPanchang||{};
      const tr=full?.transit||{};
      const fullChart=full?.chart||chart;
      if(full?.phase4) window.__smvPhase4DataByRoot=window.__smvPhase4DataByRoot||{}, window.__smvPhase4DataByRoot[rootId]=full.phase4;
      if(!isCurrent()) return;

      // Prepare every section first; do not reveal any individual result.
      if(birthSlot) birthSlot.innerHTML=renderBirthTimePanchang(bp||{requested:{date,time}},lang,date,time);
      if(bp) mountBhavaSpecialFeatures({...((chart&&typeof chart==='object')?chart:{}), ...((bp&&typeof bp==='object')?bp:{})},bp,rootId);

      window.__smvAdvancedDataByRoot=window.__smvAdvancedDataByRoot||{};
      window.__smvAdvancedDataByRoot[rootId]=advancedData;
      try{
       renderAdvancedAstrology(
  window.__smvApplyKotaNameCalculation(
    {
      ...((chart&&typeof chart==='object')?chart:{}),
      ...((advancedData&&typeof advancedData==='object')?advancedData:{})
    },
    name,
    lang
  ),
  lang,
  rootId
);
        if(full?.phase4 && typeof window.__smvRenderPhase4Dasa==='function') window.__smvRenderPhase4Dasa(full.phase4,lang,rootId);
        else await window.__smvLoadPhase4Dasa(fullChart||payload,lang,rootId);

        if(transitSlot){
          transitSlot.innerHTML='';
          renderTransitPanchang(tr||{},pr||{},lang,transitSlot.id);
          const _natalForTransit={...(chart||{}),sahams:advancedData?.v5?.sahams||chart?.sahams||{}};
          renderTopic26SpecialNakshatraDetails(_natalForTransit,tr||{},lang,rootId);
          renderBookTransitAnalysis(_natalForTransit,tr||{},lang,rootId);
        }

        root.__smvRouteAdvancedSections?.();
        root.querySelectorAll('.smv-advanced-part').forEach(part=>{const content=part.querySelector('.smv-advanced-part-content');if(content)[...part.children].filter(n=>n!==content&&!n.classList.contains('smv-advanced-part-title')).forEach(n=>content.appendChild(n));});
        window.dispatchEvent(new CustomEvent('smv:horoscope-full-ready',{detail:{full,payload,lang,rootId}}));
        // SINGLE RELEASE: all new features become visible in the same tick.
        root.classList.remove('hidden');
        if(transitSlot) transitSlot.classList.remove('hidden');
      }catch(e){
        root.classList.remove('hidden');
        if(transitSlot) transitSlot.classList.remove('hidden');
        throw e;
      }
    }).catch(e=>{
      if(!isCurrent()) return;
      if(birthSlot) birthSlot.innerHTML=`<div class="card birth-time-panchang" style="margin:0 0 18px"><h3>📅 ${lang==='ta'?'பிறந்த பஞ்சாங்கம்':'Birth Panchang'}</h3><div class="error"><b>${lang==='en'?'Horoscope calculation could not be completed.':'ஜாதக கணக்கீடு முடிக்க முடியவில்லை.'}</b><p class="small">${escSafe(e?.message||e||'Calculation failed')}</p></div></div>`;
      if(transitSlot) transitSlot.innerHTML='';
      root.classList.remove('hidden');
      throw e;
    });

  }
  
function renderBirthTimePanchang(p,lang,fallbackDate='',fallbackTime=''){
    const ta=lang==='ta',
      enM=['January','February','March','April','May','June','July','August','September','October','November','December'],
      taM=['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];

    const date=String(p?.requested?.date||fallbackDate||''),
          tm=String(p?.requested?.time||fallbackTime||'');
    let text=date,dm=date.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    const e=v=>String(v??'—').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const f=v=>{if(v&&typeof v==='object')v=v.name??v.label??v.value??'';return e(v)};
    const valueOf=v=>{if(v&&typeof v==='object')return v.name??v.label??v.value??'';return v??''};

    let gy=null,gm=null,gd=null;
    if(dm){
      gy=+dm[1]; gm=+dm[2]; gd=+dm[3];
      const ts=p?.tamilSolar;
      if(ts && ts.monthTa && Number.isFinite(Number(ts.day))){
        text=`${ta?ts.monthTa:ts.monthEn} - ${ts.day}, ${ta?taM[gm-1]:enM[gm-1]} ${gd}, ${gy}`;
      } else {
        text=`${ta?'தமிழ் தேதி':'Tamil date'}, ${ta?taM[gm-1]:enM[gm-1]} ${gd}, ${gy}`;
      }
    }

    const traditionalStart=(gy==null)?null:((gm>4||(gm===4&&gd>=14))?gy:gy-1);
    const delta=(traditionalStart==null)?0:traditionalStart-2026;
    const range=(n)=>`${n}\u2013${n+1}`;

    const cycleEn=[
      'Prabhava','Vibhava','Shukla','Pramodoota','Prajotpatti','Angirasa','Srimukha','Bhava','Yuva','Dhata',
      'Ishvara','Bahudhanya','Pramadi','Vikrama','Vrisha','Chitrabhanu','Svabhanu','Tarana','Parthiva','Vyaya',
      'Sarvajit','Sarvadhari','Virodhi','Vikruti','Khara','Nandana','Vijaya','Jaya','Manmatha','Durmukhi',
      'Hevilambi','Vilambi','Vikari','Sharvari','Plava','Shubhakrit','Shobhakrit','Krodhi','Vishvavasu','Parabhava',
      'Plavanga','Kilaka','Saumya','Sadharana','Virodhikrit','Paridhavi','Pramadicha','Ananda','Rakshasa','Nala',
      'Pingala','Kalayukti','Siddharthi','Raudri','Durmati','Dundubhi','Rudhirodgari','Raktakshi','Krodhana','Akshaya'
    ];
    const cycleTa=[
      'பிரபவ','விபவ','சுக்ல','பிரமோதூத','பிரசோற்பத்தி','ஆங்கீரச','ஸ்ரீமுக','பவ','யுவ','தாது',
      'ஈஸ்வர','வெகுதானிய','பிரமாதி','விக்கிரம','விஷு','சித்திரபானு','சுபானு','தாரண','பார்த்திப','விய',
      'சர்வஜித்','சர்வதாரி','விரோதி','விகிருதி','கர','நந்தன','விஜய','ஜய','மன்மத','துன்முகி',
      'ஹேவிளம்பி','விளம்பி','விகாரி','சார்வரி','பிலவ','சுபகிருது','சோபகிருது','குரோதி','விசுவாவசு','பராபவ',
      'பிலவங்க','கீலக','சௌமிய','சாதாரண','விரோதிகிருது','பரிதாபி','பிரமாதீச','ஆனந்த','ராட்சச','நள',
      'பிங்கள','காளயுக்தி','சித்தார்த்தி','ரௌத்திரி','துன்மதி','துந்துபி','ருத்ரோத்காரி','ரக்தாட்சி','குரோதன','அட்சய'
    ];
    const mod=(n,m)=>((n%m)+m)%m;
    const southIndex=traditionalStart==null?39:mod(traditionalStart-1987,60);
    const northIndex=traditionalStart==null?50:mod(50+delta,60);

    const eraRows=[
      [ta?'கலியுகாதி':'Kali Yuga', 5128+delta],
      [ta?'சாலிவாகன':'Salivahana (Shaka)', 1948+delta],
      [ta?'கொல்லமாண்டு':'Kollam Era', range(1201+delta)],
      [ta?'திருவள்ளுவர்':'Thiruvalluvar Year', range(2057+delta)],
      [ta?'விக்கிரம சகாப்தம்':'Vikrama Sakabda', range(2083+delta)],
      [ta?'தென்னிந்திய ஆண்டு':'South Indian Year', ta?cycleTa[southIndex]:cycleEn[southIndex]],
      [ta?'சௌராஷ்டிர விஜயம்':'Saurashtra Vijaya', 714+delta],
      [ta?'ஸ்ரீராமானுஜப்தம்':'Sri Ramanujabdam', 1010+delta],
      [ta?'ஆங்கில ஆண்டு':'English Year', range(2026+delta)],
      [ta?'பசலி':'Fasli', range(1435+delta)],
      [ta?'பிரபவாதி':'Prabhavadi', `${southIndex+1}${ta?'வது':'th'}`],
      [ta?'வட இந்திய ஆண்டு':'North Indian Year', ta?cycleTa[northIndex]:cycleEn[northIndex]]
    ];

    const horaNames=ta
      ?{Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி'}
      :{Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn'};
    const birthTimeMinutes=(()=>{
      const m=tm.match(/^(\d{1,2}):(\d{2})$/);
      if(!m)return null;
      const hh=Number(m[1]),mm=Number(m[2]);
      return hh>=0&&hh<24&&mm>=0&&mm<60?hh*60+mm:null;
    })();
    const horaForBirth=Array.isArray(p?.hora)&&birthTimeMinutes!=null
      ?p.hora.find(h=>{
        const st=Number(h?.start),en=Number(h?.end);
        if(!Number.isFinite(st)||!Number.isFinite(en))return false;
        return st<=en?birthTimeMinutes>=st&&birthTimeMinutes<en:birthTimeMinutes>=st||birthTimeMinutes<en;
      }):null;
    const horaHtml=`<span class="birth-hora-result">${e(horaNames[horaForBirth?.planetEn]||horaForBirth?.planetEn||'—')}</span>`;
    const splitDateTime=v=>{const m=String(v??'—').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);return m?{date:`${m[3]}/${m[2]}/${m[1]}`,time:m[4]}:{date:String(v??'—'),time:''};};
    const eventRangeHtml=o=>{const a=splitDateTime(o?.start),b=splitDateTime(o?.end);return `<small class="panchang-event-range"><span class="event-date" style="color:#00BFFF!important;-webkit-text-fill-color:#00BFFF!important">${e(a.date)}</span> <span class="event-time" style="color:#FF1493!important;-webkit-text-fill-color:#FF1493!important">${e(a.time)}</span> <strong class="event-to">to</strong> <span class="event-date" style="color:#00BFFF!important;-webkit-text-fill-color:#00BFFF!important">${e(b.date)}</span> <span class="event-time" style="color:#FF1493!important;-webkit-text-fill-color:#FF1493!important">${e(b.time)}</span></small>`;};

    const ts=p?.tamilSolar||{};
    const tamilDate=(ts?.monthTa&&Number.isFinite(Number(ts?.day)))
      ?`${ta?ts.monthTa:(ts.monthEn||ts.monthTa)} ${ts.day}`:'—';
    const vara=valueOf(p?.vara)||'—',
          tithi=valueOf(p?.tithi?.name||p?.tithi?.group)||'—',
          paksha=valueOf(p?.tithi?.half)||'—',
          nak=valueOf(p?.nakshatra?.name)||'—',
          pada=p?.nakshatra?.pada||'—',
          yoga=valueOf(p?.yoga?.name)||'—',
          karana=valueOf(p?.karana?.name)||'—',
          sunSign=valueOf(p?.solarSign)||'—',
          moonSign=valueOf(p?.moonSign)||'—';

    const invocation=ta?'ஓம் ஸ்ரீ மதுரை வீரன் துணை':'Om Sri Madurai Veeran Thunai';

    const summarySentence=ta
      ?`${e(tamilDate)} (${e(text)}) அன்று ${e(tm||'—')} மணிக்கு, ${e(vara)} வாரத்தில், ${e(tithi)} ${e(paksha)} திதி, ${e(nak)} நட்சத்திரம் ${e(pada)}-ஆம் பாதம், ${e(yoga)} யோகம், ${e(karana)} கரணம், ${e(sunSign)} சூரிய ராசி மற்றும் ${e(moonSign)} சந்திர ராசி நிலையில் பிறப்பு பஞ்சாங்கம் அமைந்துள்ளது.`
      :`For ${e(tamilDate)} (${e(text)}) at ${e(tm||'—')}, the birth Panchang falls on ${e(vara)}, with ${e(tithi)} ${e(paksha)} Tithi, ${e(nak)} Nakshatra Pada ${e(pada)}, ${e(yoga)} Yoga, ${e(karana)} Karana, Sun in ${e(sunSign)} and Moon in ${e(moonSign)}.`;

    const prelude=`<div class="smv-birth-prelude">
      <div class="smv-ganesha-prayer">
        <img class="smv-ganesha-img" src="data:image/png;base64,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" alt="Lord Ganesha"/>
        <div class="smv-prayer-title">🕉️ Lord Vinayakar Prayer</div>
        <div class="smv-prayer-mantra">Om Gam Ganapataye Namah</div>
        <div class="smv-prayer-mantra">Vakratunda Mahakaya<br/>Surya Koti Samaprabha<br/>Nirvighnam Kurume Deva<br/>Sarva Karyeshu Sarvada</div>
        <div class="smv-prayer-meaning"><b>Meaning:</b> O Lord Ganesha, with the curved trunk and mighty form, shining like a crore suns, remove all obstacles from all our endeavors and bless us with success always.</div>
      </div>
      <div class="smv-invocation">${e(invocation)}</div>
      <div class="smv-year-reckoning">
        <h3>📜 ${ta?'வருட-வர்த்தமானங்கள்':'Traditional Year Reckoning'}</h3>
        <div class="smv-year-grid">${eraRows.map(r=>`<div><b>${e(r[0])}</b><span>${e(r[1])}</span></div>`).join('')}</div>
      </div>
      <div class="smv-birth-summary">
        <h3>🕉️ ${ta?'பிறப்பு பஞ்சாங்கச் சுருக்கம்':'Birth Panchang Summary'}</h3>
        <div class="smv-summary-grid">
          <div><b>${ta?'தமிழ் நாள்':'Tamil Date'}</b><span>${e(tamilDate)}</span></div>
          <div><b>${ta?'பிறந்த நேரம்':'Birth Time'}</b><span>${e(tm||'—')}</span></div>
          <div><b>${ta?'வாரம்':'Vara'}</b><span>${e(vara)}</span></div>
          <div><b>${ta?'திதி / பக்ஷம்':'Tithi / Paksha'}</b><span>${e(tithi)} · ${e(paksha)}</span></div>
          <div><b>${ta?'நட்சத்திரம் / பாதம்':'Nakshatra / Pada'}</b><span>${e(nak)} · ${e(pada)}</span></div>
          <div><b>${ta?'யோகம்':'Yoga'}</b><span>${e(yoga)}</span></div>
          <div><b>${ta?'கரணம்':'Karana'}</b><span>${e(karana)}</span></div>
          <div><b>${ta?'சூரிய ராசி':'Sun Sign'}</b><span>${e(sunSign)}</span></div>
          <div><b>${ta?'சந்திர ராசி':'Moon Sign'}</b><span>${e(moonSign)}</span></div>
          <div><b>${ta?'சூரிய உதயம்':'Sunrise'}</b><span class="panchang-time-result">${e(p?.sunrise)}</span></div>
          <div><b>${ta?'சூரிய அஸ்தமனம்':'Sunset'}</b><span class="panchang-time-result">${e(p?.sunset)}</span></div>
          <div><b>${ta?'அயனாம்சம்':'Ayanamsa'}</b><span>${e(p?.ayanamsa)}</span></div>
        </div>
        <p class="smv-panchang-sentence">${summarySentence}</p>
      </div>
    </div>`;

    const birthRows=[
      [ta?'தேதி':'Date',`<span class="panchang-date-result" style="color:#111!important;-webkit-text-fill-color:#111!important">${e(text)}</span>`],
      [ta?'பிறந்த நேரம்':'Birth Time',`<span class="panchang-time-result" style="color:#00BFFF!important;-webkit-text-fill-color:#00BFFF!important">${e(tm)}</span>`],
      [ta?'வாரம்':'Vara',f(p?.vara)], [ta?'சூரிய ராசி':'Sun Sign',f(p?.solarSign)],
      [ta?'சந்திர ராசி':'Moon Sign',f(p?.moonSign)],
      [ta?'திதி':'Tithi',`${f(p?.tithi?.name||p?.tithi?.group)} · ${f(p?.tithi?.half)}${eventRangeHtml(p?.tithi)}`],
      [ta?'நட்சத்திரம்':'Nakshatra',`${f(p?.nakshatra?.name)} · ${e(p?.nakshatra?.pada||'')}${eventRangeHtml(p?.nakshatra)}`],
      [ta?'யோகம்':'Yoga',`${f(p?.yoga?.name)}${eventRangeHtml(p?.yoga)}`],
      [ta?'கரணம்':'Karana',`${f(p?.karana?.name)}${eventRangeHtml(p?.karana)}`],
      [ta?'சூரிய உதயம்':'Sunrise',`<span class="panchang-time-result">${e(p?.sunrise)}</span>`],
      [ta?'சூரிய அஸ்தமனம்':'Sunset',`<span class="panchang-time-result">${e(p?.sunset)}</span>`],
      [ta?'அயனாம்சம்':'Ayanamsa',e(p?.ayanamsa)],
      [ta?'ராகு காலம்':'Rahu Kalam',`<span class="panchang-time-result">${e(p?.rahuKalam)}</span>`],
      [ta?'எமகண்டம்':'Yamagandam',`<span class="panchang-time-result">${e(p?.yamagandam)}</span>`],
      [ta?'குளிகை':'Gulikai',`<span class="panchang-time-result">${e(p?.gulikai)}</span>`],
      [ta?'நல்ல நேரம்':'Nalla Neram',`<span class="nalla-neram-time">${Array.isArray(p?.nallaNeram)?p.nallaNeram.map(e).join(' · '):e(p?.nallaNeram)}</span>`]
    ];
    const birthTable=`<div class="adv-table-wrap"><table class="data-table panchang-data-table"><thead><tr><th>${ta?'விவரம்':'Details'}</th><th>${ta?'முடிவு':'Result'}</th></tr></thead><tbody>${birthRows.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>`;
    return `${prelude}<div class="card birth-time-panchang" style="margin:0 0 18px"><h3>📅 ${ta?'பிறந்த பஞ்சாங்கம்':'Birth Panchang'}</h3><div class="small">${ta?'திருக்கணித பஞ்சாங்க கணிப்பு':'Thirukanitha Panchang calculation'}</div>${birthTable}<div class="hora-section birth-current-hora"><b>${ta?'ஹோரா :':'Hora :'}</b>${horaHtml}</div></div>`;
  }

function renderTransitPanchang(t,p,lang,rootId){
    const box=document.getElementById(rootId); if(!box)return;
    const ta=lang==='ta';
    const rmap={மேஷம்:'Aries',ரிஷபம்:'Taurus',மிதுனம்:'Gemini',கடகம்:'Cancer',சிம்மம்:'Leo',கன்னி:'Virgo',துலாம்:'Libra',விருச்சிகம்:'Scorpio',தனுசு:'Sagittarius',மகரம்:'Capricorn',கும்பம்:'Aquarius',மீனம்:'Pisces'};
    const pmap={சூரியன்:'Sun',சந்திரன்:'Moon',செவ்வாய்:'Mars',புதன்:'Mercury',குரு:'Jupiter',சுக்கிரன்:'Venus',சனி:'Saturn',ராகு:'Rahu',கேது:'Ketu'};
    const nmap={அஸ்வினி:'Ashwini',அசுவினி:'Ashwini',பரணி:'Bharani',கார்த்திகை:'Krittika',கிருத்திகை:'Krittika',ரோகிணி:'Rohini',மிருகசீரிஷம்:'Mrigashira',மிருகசீரிடம்:'Mrigashira',மிருகசீரிடம்‌:'Mrigashira',திருவாதிரை:'Ardra',ஆதிரை:'Ardra',புனர்பூசம்:'Punarvasu',புனர்வசு:'Punarvasu',பூசம்:'Pushya',புஷ்யம்:'Pushya',ஆயில்யம்:'Ashlesha',ஆசிலேஷா:'Ashlesha',மகம்:'Magha',மகா:'Magha',பூரம்:'Purva Phalguni',பூர்வபல்குனி:'Purva Phalguni',உத்திரம்:'Uttara Phalguni',உத்தரபல்குனி:'Uttara Phalguni',ஹஸ்தம்:'Hasta',அஸ்தம்:'Hasta',சித்திரை:'Chitra',சித்ரா:'Chitra',சுவாதி:'Swati',ஸ்வாதி:'Swati',விசாகம்:'Vishakha',விசாகா:'Vishakha',அனுஷம்:'Anuradha',அனுராதா:'Anuradha',கேட்டை:'Jyeshtha',ஜ்யேஷ்டா:'Jyeshtha',மூலம்:'Mula',மூலா:'Mula',பூராடம்:'Purva Ashadha',பூர்வாஷாடா:'Purva Ashadha',உத்திராடம்:'Uttara Ashadha',உத்தராஷாடா:'Uttara Ashadha',திருவோணம்:'Shravana',ஸ்ரவணம்:'Shravana',அவிட்டம்:'Dhanishtha',தனிஷ்டா:'Dhanishtha',சதயம்:'Shatabhisha',சதபிஷா:'Shatabhisha',பூரட்டாதி:'Purva Bhadrapada',பூர்வபாத்ரபதா:'Purva Bhadrapada',உத்திரட்டாதி:'Uttara Bhadrapada',உத்தரபாத்ரபதா:'Uttara Bhadrapada',ரேவதி:'Revati'};
    // English-only normalization for the Transit table. Backend Tamil spellings/variants
    // are canonicalized here without changing any horoscope calculation.
    const transitKey=v=>String(v??'').normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g,'').trim();
    const transitPlanetEn=v=>{const q=transitKey(v);return pmap[q]||({Surya:'Sun',Chandra:'Moon',Kuja:'Mars',Budha:'Mercury',Guru:'Jupiter',Shukra:'Venus',Sukra:'Venus',Shani:'Saturn'}[q])||q||'—';};
    const transitRasiEn=v=>{const q=transitKey(v);return rmap[q]||({Mesha:'Aries',Vrishabha:'Taurus',Rishabha:'Taurus',Mithuna:'Gemini',Karka:'Cancer',Kataka:'Cancer',Simha:'Leo',Kanya:'Virgo',Tula:'Libra',Vrischika:'Scorpio',Dhanu:'Sagittarius',Dhanus:'Sagittarius',Makara:'Capricorn',Kumbha:'Aquarius',Meena:'Pisces'}[q])||q||'—';};
    const transitNakEn=v=>{const q=transitKey(v);return nmap[q]||q||'—';};
    const varamap={ஞாயிறு:'Sunday',திங்கள்:'Monday',செவ்வாய்:'Tuesday',புதன்:'Wednesday',வியாழன்:'Thursday',வெள்ளி:'Friday',சனி:'Saturday'};
    const karanamap={கிம்ஸ்துக்னம்:'Kimstughna',பவம்:'Bava',பாலவம்:'Balava',கௌலவம்:'Kaulava',தைத்திலம்:'Taitila',கரசை:'Garaja',வணிஜம்:'Vanija',விஷ்டி:'Vishti',சகுனி:'Shakuni',சதுஷ்பாதம்:'Chatushpada',நாகம்:'Naga'};
    const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const splitDateTime=v=>{const m=String(v??'—').match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);return m?{date:`${m[3]}/${m[2]}/${m[1]}`,time:m[4]}:{date:String(v??'—'),time:''};};
    const eventRangeHtml=o=>{const a=splitDateTime(o?.start),b=splitDateTime(o?.end);return `<small class="panchang-event-range"><span class="event-date" style="color:#00BFFF!important;-webkit-text-fill-color:#00BFFF!important">${esc2(a.date)}</span> <span class="event-time" style="color:#FF1493!important;-webkit-text-fill-color:#FF1493!important">${esc2(a.time)}</span> <strong class="event-to">to</strong> <span class="event-date" style="color:#00BFFF!important;-webkit-text-fill-color:#00BFFF!important">${esc2(b.date)}</span> <span class="event-time" style="color:#FF1493!important;-webkit-text-fill-color:#FF1493!important">${esc2(b.time)}</span></small>`;};
    const fmt=v=>{if(v&&typeof v==='object')v=v.name??v.label??v.value??v.rasi??v.planet??v.nakshatra??'';return ta?String(v??''):pmap[v]||rmap[v]||nmap[v]||varamap[v]||karanamap[v]||String(v??'')}; const horaNames=ta?{Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி'}:{Sun:'Sun',Moon:'Moon',Mars:'Mars',Mercury:'Mercury',Jupiter:'Jupiter',Venus:'Venus',Saturn:'Saturn'};
    const horaClass={Sun:'hora-sun',Moon:'hora-moon',Mars:'hora-mars',Mercury:'hora-mercury',Jupiter:'hora-jupiter',Venus:'hora-venus',Saturn:'hora-saturn'};
    const currentClock=String(t?.requested?.time||p?.requested?.time||'');
    const clockMinutes=v=>{const m=String(v||'').match(/(\d{1,2}):(\d{2})/);return m?(Number(m[1])*60+Number(m[2])):null;};
    // Current Hora must follow the visitor/device clock, not the horoscope/birth requested time.
    const deviceNow=new Date();
    const nowMinutes=(deviceNow.getHours()*60)+deviceNow.getMinutes();
    const isCurrentHora=h=>{const parts=String(h?.range||'').split('-').map(x=>clockMinutes(x.trim()));if(parts.length!==2||parts.some(x=>x==null)||nowMinutes==null)return false;let [a,b]=parts,n=nowMinutes;if(b<=a)b+=1440;if(n<a)n+=1440;return n>=a&&n<b;};
    // Hora indication: waxing Moon/Mercury/Jupiter/Venus = green; waning Moon/Sun/Mars/Saturn = red.
    // The weekday's own Hora is shown brighter. Only the TIME result is coloured.
    const phaseText=String(p?.tithi?.half||p?.tithi?.paksha||p?.tithi?.group||'').toLowerCase();
    const waxingMoon=/shukla|waxing|வளர்பிறை|சுக்ல/.test(phaseText);
    const waningMoon=/krishna|waning|தேய்பிறை|கிருஷ்ண/.test(phaseText);
    const varaEn=varamap[p?.vara]||String(p?.vara||'');
    const weekdayLord={Sunday:'Sun',Monday:'Moon',Tuesday:'Mars',Wednesday:'Mercury',Thursday:'Jupiter',Friday:'Venus',Saturday:'Saturn'}[varaEn]||'';
    const horaNature=planet=>planet==='Moon'?(waxingMoon?'green':(waningMoon?'red':'')):(['Mercury','Jupiter','Venus'].includes(planet)?'green':(['Sun','Mars','Saturn'].includes(planet)?'red':''));
    const horaTimeClass=h=>{const nature=horaNature(h?.planetEn);if(!nature)return '';const own=h?.planetEn===weekdayLord;const current=isCurrentHora(h);if(own)return nature==='green'?' smv-hora-bright-green':' smv-hora-bright-red';if(current)return nature==='green'?' smv-hora-current-green':' smv-hora-current-red';return '';};
    const horaBlock=(items,title)=>`<div class="hora-vertical-block"><div class="hora-band">${title}</div><div class="hora-table-wrap"><table class="data-table hora-table hora-vertical"><thead><tr><th>${ta?'எண்':'No.'}</th><th>${ta?'கிரகம்':'Planet'}</th><th>${ta?'நேரம்':'Time'}</th></tr></thead><tbody>${items.map(h=>`<tr><td>${esc2(h.number)}</td><td class="${horaClass[h.planetEn]||''}"><b>${esc2(horaNames[h.planetEn]||h.planetEn||'—')}</b></td><td class="hora-time${horaTimeClass(h)}">${esc2(h.range||'—')}</td></tr>`).join('')}</tbody></table></div></div>`;
    const horaHtml=Array.isArray(p?.hora)&&p.hora.length?`${horaBlock(p.hora.slice(0,12),ta?'பகல் ஹோரா (1 - 12)':'Day Hora (1 - 12)')}${horaBlock(p.hora.slice(12,24),ta?'இரவு ஹோரா (13 - 24)':'Night Hora (13 - 24)')}`:'—';
    const planets=Array.isArray(t?.planets)?t.planets:[];
    const dailyTamilDate=(()=>{const v=String(p?.requested?.date||t?.requested?.date||'');const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '—';const y=+m[1],mi=+m[2]-1,d=+m[3];const en=['January','February','March','April','May','June','July','August','September','October','November','December'];const taM=['ஜனவரி','பிப்ரவரி','மார்ச்','ஏப்ரல்','மே','ஜூன்','ஜூலை','ஆகஸ்ட்','செப்டம்பர்','அக்டோபர்','நவம்பர்','டிசம்பர்'];const ts=p?.tamilSolar;if(ts?.monthTa&&Number.isFinite(Number(ts.day)))return ta?`${ts.monthTa} - ${ts.day}, ${taM[mi]} ${d}, ${y}`:`${ts.monthEn}-${ts.day}, ${en[mi]} ${d}, ${y}`;return `${ta?'தமிழ் தேதி':'Tamil date'}, ${ta?taM[mi]:en[mi]} ${d}, ${y}`;})();
    const dailyRows=[
      [ta?'தேதி':'Date',dailyTamilDate],
      [ta?'சூரிய ராசி':'Sun Sign',fmt(p?.solarSign)], [ta?'சந்திர ராசி':'Moon Sign',fmt(p?.moonSign)], [ta?'வாரம்':'Vara',fmt(p?.vara||'—')],
      [ta?'திதி':'Tithi',`${fmt(p?.tithi?.name||p?.tithi?.group||'')} · ${fmt(p?.tithi?.half||'')}${eventRangeHtml(p?.tithi)}`],
      [ta?'நட்சத்திரம்':'Nakshatra',`${fmt(p?.nakshatra?.name)} · ${esc2(p?.nakshatra?.pada||'')}${eventRangeHtml(p?.nakshatra)}`],
      [ta?'யோகம்':'Yoga',`${fmt(p?.yoga?.name||'—')}${eventRangeHtml(p?.yoga)}`], [ta?'கரணம்':'Karana',`${fmt(p?.karana?.name||'—')}${eventRangeHtml(p?.karana)}`],
      [ta?'சூரிய உதயம்':'Sunrise',`<span class="panchang-time-result">${esc2(p?.sunrise||'—')}</span>`], [ta?'சூரிய அஸ்தமனம்':'Sunset',`<span class="panchang-time-result">${esc2(p?.sunset||'—')}</span>`],
      [ta?'அயனாம்சம்':'Ayanamsa',esc2(p?.ayanamsa||'—')], [ta?'ராகு காலம்':'Rahu Kalam',`<span class="panchang-time-result">${esc2(p?.rahuKalam||'—')}</span>`],
      [ta?'எமகண்டம்':'Yamagandam',`<span class="panchang-time-result">${esc2(p?.yamagandam||'—')}</span>`], [ta?'குளிகை':'Gulikai',`<span class="panchang-time-result">${esc2(p?.gulikai||'—')}</span>`],
      [ta?'நல்ல நேரம்':'Nalla Neram',`<span class="nalla-neram-time">${Array.isArray(p?.nallaNeram)?p.nallaNeram.map(esc2).join(' · '):esc2(p?.nallaNeram||'—')}</span>`]
    ];
    const dailyTable=`<div class="adv-table-wrap"><table class="data-table panchang-data-table"><thead><tr><th>${ta?'விவரம்':'Details'}</th><th>${ta?'முடிவு':'Result'}</th></tr></thead><tbody>${dailyRows.map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>`;
    let h=`<div class="transit-panchang-grid"><div class="card panchang-card"><h3>📅 ${ta?'தினசரி பஞ்சாங்கம்':'Daily Panchang'}</h3><div class="small">${ta?'திருக்கணித பஞ்சாங்க கணிப்பு':'Thirukanitha Panchang calculation'}</div>${dailyTable}</div></div>`;
    h+=`<div class="card hora-card"><h3>🕐 ${ta?'தினசரி ஹோரா':'Daily Hora'}</h3><div class="hora-section">${horaHtml}</div></div>`;
    const signIndex=v=>{const en=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];const taR=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];let i=en.indexOf(String(v));return i>=0?i:taR.indexOf(String(v));};
    const short={Sun:'Su',Moon:'Mo',Mars:'Ma',Mercury:'Me',Jupiter:'Ju',Venus:'Ve',Saturn:'Sa',Rahu:'Ra',Ketu:'Ke','சூரியன்':'சூ','சந்திரன்':'சந்','செவ்வாய்':'செ','புதன்':'பு','குரு':'கு','சுக்கிரன்':'சு','சனி':'ச','ராகு':'ரா','கேது':'கே'};
    const bySign=Array.from({length:12},()=>[]); planets.forEach(x=>{const i=signIndex(x.rasi);if(i>=0)bySign[i].push(x);});
    const lagnaIndex=signIndex(t?.lagna?.rasi); const order=[11,0,1,2,10,null,null,3,9,null,null,4,8,7,6,5];
    let transitChart=''; order.forEach((si,pos)=>{if(si===null){if(pos===5)transitChart+=`<div class="south-chart-center">Transit Chart</div>`;return;}const isLagna=si===lagnaIndex;const houseNo=lagnaIndex>=0?((si-lagnaIndex+12)%12)+1:null;const ps=bySign[si].map(x=>{const nm=short[x.name]||short[fmt(x.name)]||esc2(fmt(x.name));const c=x.combustion?'<span class="rasi-status-marker status-c">(C)</span>':'';const isNode=['Rahu','Ketu','ராகு','கேது'].includes(String(x.name));const r=(x.retrograde||isNode)?'<span class="rasi-status-marker status-r">(R)</span>':'';const lon=Number(x.longitude??x.lon??x.degreeLongitude);let deg='';if(Number.isFinite(lon)){const d=((lon%30)+30)%30,dd=Math.floor(d),mm=Math.floor((d-dd)*60);deg=`<span class="rasi-degree transit-degree">${dd}°</span>`;}else if(x.degree!=null&&String(x.degree).trim()){deg=`<span class="rasi-degree transit-degree">${esc2(x.degree)}</span>`;}return `<div class="planet-line"><span class="planet-glyph">${nm}${c}${r}${deg}</span></div>`;}).join('');transitChart+=`<div class="south-rasi-cell"><div class="dynamic-rasi-number">${isLagna?'':(houseNo??'—')}</div>${isLagna?'<div class="lagna">'+(document.documentElement.lang==='ta'?'ல':'As')+'</div>':''}${ps||'<div class="small">—</div>'}</div>`;});
    const dms=v=>{const n=Number(v);if(!Number.isFinite(n))return esc2(v??'—');const d=((n%30)+30)%30,dd=Math.floor(d),mf=(d-dd)*60,mm=Math.floor(mf),ss=Math.round((mf-mm)*60);return `${String(dd).padStart(2,'0')}° ${String(mm).padStart(2,'0')}′ ${String(ss%60).padStart(2,'0')}″`;};
    const transitRows=[];
    if(t?.lagna){const ll=Number(t.lagna.longitude??t.lagna.lon??t.lagna.degreeLongitude??t.lagna.degree);transitRows.push({name:'Asc',rasi:transitRasiEn(t.lagna.rasi),degree:dms(ll),nak:transitNakEn(t.lagna.nakshatra?.name||t.lagna.nakshatra),pada:t.lagna.nakshatra?.pada||t.lagna.pada||'—',status:'—'});}
    planets.forEach(x=>{const isNode=['Rahu','Ketu','ராகு','கேது'].includes(String(x.name));const lon=Number(x.longitude??x.lon??x.degreeLongitude??x.degree);const enName=transitPlanetEn(x.name);const enRasi=transitRasiEn(x.rasi);const rawNak=x.nakshatra?.name||x.nakshatra||'—';const enNak=transitNakEn(rawNak);transitRows.push({name:(short[enName]||enName)+((x.retrograde||isNode)?'(R)':''),rasi:enRasi,degree:dms(lon),nak:enNak,pada:x.nakshatra?.pada||x.pada||'—',status:(x.retrograde||isNode)?'Retrograde':'Direct'});});
    const transitTable=`<div class="card transit-table-card"><h3>🪐 Transit Planetary Positions</h3><div class="adv-scroll"><table class="data-table transit-position-table"><thead><tr><th>Planet</th><th>Rasi</th><th>Degree</th><th>Nakshatra</th><th>Pada</th><th>Status</th></tr></thead><tbody>${transitRows.map(r=>`<tr><td><b>${esc2(r.name)}</b></td><td>${esc2(r.rasi)}</td><td class="transit-table-degree">${r.degree}</td><td>${esc2(r.nak)}</td><td>${esc2(r.pada)}</td><td>${esc2(r.status)}</td></tr>`).join('')}</tbody></table></div></div>`;
    h+=`<div class="card transit-card"><h3>🪐 ${ta?'Transit Chart':'Transit Chart'}</h3><div class="south-indian-chart transit-chart">${transitChart}</div><p class="small">${ta?'Transit தேதி/நேரம்:':'Transit date/time:'} ${esc2(t?.requested?.date||'')} ${esc2(t?.requested?.time||'')}</p>${transitTable}</div></div>`;
    // IMPORTANT: replace the slot instead of appending. The Daily Panchang
    // response can arrive before Transit; appending both versions created
    // duplicate Daily Panchang / Planetary Transit cards on mobile.
    box.innerHTML=h;
    // Keep Daily Panchang + Daily Hora in their original slot, but place
    // Transit Chart + Transit Planetary Positions immediately before Vimsottari Dasa.
    const reportHost=box.closest('.horoscope-result')||box.parentElement;
    const transitTarget=reportHost?.querySelector?.('.transit-before-vimsottari');
    const transitCard=box.querySelector('.transit-card');
    if(transitTarget&&transitCard) transitTarget.replaceChildren(transitCard);
  }
  // V2.1 FIX: expose advanced loader because the English horoscope module runs in a separate IIFE.
 /* ============================================================
   SMV ASTRO — KOTA CHAKRA NAME SOUND / NAME NAKSHATRA
   ENGLISH + TAMIL NAME SUPPORT
   Surgical patch — does not replace existing calculations
   ============================================================ */

(function(){

  const SMV_KOTA_NAKSHATRAS = [
    {
      en:"Ashwini", ta:"அசுவினி",
      sounds:["Chu","Che","Cho","La"],
      taSounds:["சு","சே","சோ","லா"]
    },
    {
      en:"Bharani", ta:"பரணி",
      sounds:["Li","Lu","Le","Lo"],
      taSounds:["லி","லு","லே","லோ"]
    },
    {
      en:"Krittika", ta:"கார்த்திகை",
      sounds:["A","E","U","Ae"],
      taSounds:["அ","ஈ","உ","ஏ"]
    },
    {
      en:"Rohini", ta:"ரோகிணி",
      sounds:["O","Va","Vi","Vu"],
      taSounds:["ஓ","வா","வி","வு"]
    },
    {
      en:"Mrigashira", ta:"மிருகசீரிடம்",
      sounds:["Ve","Vo","Ka","Ki"],
      taSounds:["வே","வோ","கா","கி"]
    },
    {
      en:"Ardra", ta:"திருவாதிரை",
      sounds:["Ku","Gha","Nga","Chha"],
      taSounds:["கு","க","ங","ச"]
    },
    {
      en:"Punarvasu", ta:"புனர்பூசம்",
      sounds:["Ke","Ko","Ha","Hi"],
      taSounds:["கே","கோ","ஹ","ஹி"]
    },
    {
      en:"Pushya", ta:"பூசம்",
      sounds:["Hu","He","Ho","Da"],
      taSounds:["ஹு","ஹே","ஹோ","ட"]
    },
    {
      en:"Ashlesha", ta:"ஆயில்யம்",
      sounds:["Di","Du","De","Do"],
      taSounds:["டி","டு","டே","டோ"]
    },
    {
      en:"Magha", ta:"மகம்",
      sounds:["Ma","Mi","Mu","Me"],
      taSounds:["மா","மி","மு","மே"]
    },
    {
      en:"Purva Phalguni", ta:"பூரம்",
      sounds:["Mo","Ta","Ti","Tu"],
      taSounds:["மோ","ட","டி","டு"]
    },
    {
      en:"Uttara Phalguni", ta:"உத்திரம்",
      sounds:["Te","To","Pa","Pi"],
      taSounds:["தே","தோ","பா","பி"]
    },
    {
      en:"Hasta", ta:"ஹஸ்தம்",
      sounds:["Pu","Sha","Na","Tha"],
      taSounds:["பு","ஷ","ண","த"]
    },
    {
      en:"Chitra", ta:"சித்திரை",
      sounds:["Pe","Po","Ra","Ri"],
      taSounds:["பே","போ","ரா","ரி"]
    },
    {
      en:"Swati", ta:"சுவாதி",
      sounds:["Ru","Re","Ro","Ta"],
      taSounds:["ரு","ரே","ரோ","த"]
    },
    {
      en:"Vishakha", ta:"விசாகம்",
      sounds:["Ti","Tu","Te","To"],
      taSounds:["தி","து","தே","தோ"]
    },
    {
      en:"Anuradha", ta:"அனுஷம்",
      sounds:["Na","Ni","Nu","Ne"],
      taSounds:["நா","நி","நு","நே"]
    },
    {
      en:"Jyeshtha", ta:"கேட்டை",
      sounds:["No","Ya","Yi","Yu"],
      taSounds:["நோ","ய","யி","யு"]
    },
    {
      en:"Mula", ta:"மூலம்",
      sounds:["Ye","Yo","Ba","Bi"],
      taSounds:["யே","யோ","ப","பி"]
    },
    {
      en:"Purva Ashadha", ta:"பூராடம்",
      sounds:["Bu","Dha","Bha","Da"],
      taSounds:["பு","த","ப","த"]
    },
    {
      en:"Uttara Ashadha", ta:"உத்திராடம்",
      sounds:["Be","Bo","Ja","Ji"],
      taSounds:["பே","போ","ஜ","ஜி"]
    },
    {
      en:"Shravana", ta:"திருவோணம்",
      sounds:["Ju","Je","Jo","Gha"],
      taSounds:["ஜு","ஜே","ஜோ","க"]
    },
    {
      en:"Dhanishtha", ta:"அவிட்டம்",
      sounds:["Ga","Gi","Gu","Ge"],
      taSounds:["க","கி","கு","கே"]
    },
    {
      en:"Shatabhisha", ta:"சதயம்",
      sounds:["Go","Sa","Si","Su"],
      taSounds:["கோ","ச","சி","சு"]
    },
    {
      en:"Purva Bhadrapada", ta:"பூரட்டாதி",
      sounds:["Se","So","Da","Di"],
      taSounds:["சே","சோ","த","தி"]
    },
    {
      en:"Uttara Bhadrapada", ta:"உத்திரட்டாதி",
      sounds:["Du","Tha","Jha","Na"],
      taSounds:["து","த","ஜ","ந"]
    },
    {
      en:"Revati", ta:"ரேவதி",
      sounds:["De","Do","Cha","Chi"],
      taSounds:["தே","தோ","ச","சி"]
    }
  ];

  /* ------------------------------------------------------------
     Normalise English names
     ------------------------------------------------------------ */
  function smvKotaEnglishName(v){

    return String(v || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"")
      .toLowerCase()
      .replace(/[^a-z]/g,"");
  }

  /* ------------------------------------------------------------
     Normalise Tamil names
     Keep Tamil Unicode characters.
     ------------------------------------------------------------ */
  function smvKotaTamilName(v){

    return String(v || "")
      .normalize("NFC")
      .replace(/[\u200C\u200D\uFEFF]/g,"")
      .replace(/\s+/g,"")
      .trim();
  }

  /* ------------------------------------------------------------
     Tamil → comparable phonetic form

     This is intentionally conservative.
     We don't modify the customer's original name.
     ------------------------------------------------------------ */
  function smvKotaTamilPhonetic(v){

    let s=smvKotaTamilName(v);

    const map=[
      ["க்ஷ","ksha"],
      ["ஸ்ரீ","sri"],
      ["ஸ","sa"],
      ["ஷ","sha"],
      ["ஜ","ja"],
      ["ஹ","ha"],
      ["ற","ra"],
      ["ள","la"],
      ["ழ","la"],
      ["ண","na"],
      ["ங","nga"],
      ["ஞ","nya"],
      ["ந","na"],
      ["ன","na"],
      ["ம","ma"],
      ["ப","pa"],
      ["வ","va"],
      ["ய","ya"],
      ["ர","ra"],
      ["ல","la"],
      ["ச","cha"],
      ["க","ka"],
      ["ட","ta"],
      ["த","tha"],
      ["அ","a"],
      ["ஆ","aa"],
      ["இ","i"],
      ["ஈ","ee"],
      ["உ","u"],
      ["ஊ","oo"],
      ["எ","e"],
      ["ஏ","ae"],
      ["ஐ","ai"],
      ["ஒ","o"],
      ["ஓ","oo"],
      ["ஔ","au"]
    ];

    for(const [a,b] of map){
      s=s.replaceAll(a,b);
    }

    return s.toLowerCase();
  }

  /* ------------------------------------------------------------
     Remove common English pronunciation differences.
     ------------------------------------------------------------ */
  function smvKotaEnglishPhonetic(v){

    let s=smvKotaEnglishName(v);

    const replacements=[
      ["sh","sha"],
      ["sch","sha"],
      ["ch","cha"],
      ["th","tha"],
      ["dh","dha"],
      ["ph","pha"],
      ["bh","bha"],
      ["kh","kha"],
      ["gh","gha"],
      ["j","ja"],
      ["c","k"],
      ["q","k"],
      ["x","ks"],
      ["w","v"]
    ];

    for(const [a,b] of replacements){
      s=s.replaceAll(a,b);
    }

    return s;
  }

  /* ------------------------------------------------------------
     Match name against traditional Nakshatra pada sounds.
     ------------------------------------------------------------ */
  function smvKotaFindNameNakshatra(name){

    const original=String(name || "").trim();

    if(!original){
      return {
        name:original,
        initial:"",
        nakshatra:"",
        nakshatraTamil:"",
        pada:null,
        sound:"",
        tamilSound:"",
        matchType:"No name"
      };
    }

    const isTamil=/[\u0B80-\u0BFF]/.test(original);

    const normalized=isTamil
      ? smvKotaTamilName(original)
      : smvKotaEnglishName(original);

    const phonetic=isTamil
      ? smvKotaTamilPhonetic(original)
      : smvKotaEnglishPhonetic(original);

    let best=null;

    for(const nak of SMV_KOTA_NAKSHATRAS){

      for(let p=0;p<4;p++){

        const enSound=nak.sounds[p].toLowerCase();
        const taSound=nak.taSounds[p];

        let matched=false;

        if(isTamil){

          const ts=smvKotaTamilName(original);

          matched=
            ts.startsWith(taSound) ||
            phonetic.startsWith(
              smvKotaEnglishPhonetic(enSound)
            );

        }else{

          const en=smvKotaEnglishName(original);

          matched=
            en.startsWith(enSound) ||
            phonetic.startsWith(
              smvKotaEnglishPhonetic(enSound)
            );

        }

        if(matched){

          best={
            name:original,
            initial:original.trim().slice(0,1),
            nakshatra:nak.en,
            nakshatraTamil:nak.ta,
            pada:p+1,
            sound:nak.sounds[p],
            tamilSound:nak.taSounds[p],
            matchType:isTamil
              ? "Tamil name sound"
              : "English name sound"
          };

          return best;
        }
      }
    }

    /* ----------------------------------------------------------
       Safe first-letter fallback.
       This prevents the Kota section from remaining blank when
       a modern spelling is not an exact traditional syllable.
       ---------------------------------------------------------- */

    const first=isTamil
      ? smvKotaTamilPhonetic(original)
      : smvKotaEnglishPhonetic(original);

    const fallbackGroups=[
      [["a","e","u","ae"],0],
      [["ka","ki","ku","ke","k"],4],
      [["ga","gi","gu","ge","go"],22],
      [["ma","mi","mu","me","mo"],9],
      [["na","ni","nu","ne","no"],16],
      [["pa","pi","pu","pe","po"],11],
      [["ra","ri","ru","re","ro"],13],
      [["sa","si","su","se","so"],23],
      [["ta","ti","tu","te","to"],15],
      [["va","vi","vu","ve","vo"],3],
      [["ya","yi","yu","ye","yo"],17],
      [["la","li","lu","le","lo"],1]
    ];

    for(const [sounds,index] of fallbackGroups){

      for(let p=0;p<sounds.length;p++){

        if(first.startsWith(sounds[p])){

          const nak=SMV_KOTA_NAKSHATRAS[index];

          return {
            name:original,
            initial:original.trim().slice(0,1),
            nakshatra:nak.en,
            nakshatraTamil:nak.ta,
            pada:p+1,
            sound:nak.sounds[p],
            tamilSound:nak.taSounds[p],
            matchType:isTamil
              ? "Tamil phonetic match"
              : "English phonetic match"
          };
        }
      }
    }

    return {
      name:original,
      initial:original.trim().slice(0,1),
      nakshatra:"",
      nakshatraTamil:"",
      pada:null,
      sound:"",
      tamilSound:"",
      matchType:"No traditional syllable match"
    };
  }

  /* ------------------------------------------------------------
     PUBLIC helper
     ------------------------------------------------------------ */
  window.__smvKotaNameNakshatra=smvKotaFindNameNakshatra;

  /* ------------------------------------------------------------
     Merge calculated name information into existing Kota data.

     IMPORTANT:
     Existing backend Kota values are preserved when available.
     We only fill missing/incorrect name fields.
     ------------------------------------------------------------ */
  window.__smvApplyKotaNameCalculation=function(data,name,lang){

    try{

      if(!data || typeof data!=="object"){
        return data;
      }

      const original=String(
        name ??
        data?.kota?.nativeName ??
        ""
      ).trim();

      if(!original){
        return data;
      }

      const result=smvKotaFindNameNakshatra(original);

      data.kota=data.kota || {};

      /* Keep customer's original name */
      data.kota.nativeName=original;

      /* Always update name input-derived fields */
      data.kota.nameInitial=result.initial || "";

      data.kota.nameNakshatra=
        lang==="ta"
          ? (result.nakshatraTamil || result.nakshatra || "")
          : (result.nakshatra || "");

      data.kota.nameNakshatraPada=
        result.pada ?? null;

      data.kota.nameSyllable=
        lang==="ta"
          ? (result.tamilSound || result.sound || "")
          : (result.sound || "");

      data.kota.nameSound=
        lang==="ta"
          ? (result.tamilSound || result.sound || "")
          : (result.sound || "");

      data.kota.nameMatchType=result.matchType || "";

      /*
       * Do not change Janma Nakshatra.
       * It comes from birth Moon calculation.
       */
      return data;

    }catch(err){

      console.warn(
        "SMV Kota name calculation:",
        err
      );

      return data;
    }
  };

})();
  window.__smvLoadAdvancedAstrology=loadAdvancedAstrology;


  async function generate(loadAdvanced=true){
    const date=$('tamilDob')?.value||'', time=$('tamilTob')?.value||'';
    const lat=$('tamilLat')?.value||'', lon=$('tamilLon')?.value||'';
    if(!date||!time){alert('பிறந்த தேதி மற்றும் பிறந்த நேரத்தை உள்ளிடவும்.');return;}
   const placeValue=String($('tamilBirthPlace')?.value||'').trim();

if(!placeValue){
  alert('பிறந்த இடத்தை உள்ளிடவும்.');
  return;
}

if(lat===''||lon===''){
  alert('Location பட்டியலில் இடம் கிடைக்கவில்லை என்றால், Place of Birth, Latitude மற்றும் Longitude-ஐ கைமுறையாக உள்ளிடவும்.');
  return;
      }
    if(window.__smvHoroscopeGenerating) return;
    window.__smvHoroscopeGenerating=true;
    const generationId=(window.__smvHoroscopeGenerationId=Number(window.__smvHoroscopeGenerationId||0)+1);
    const btn=$('generateTamilHoroscope');
    const resultBox=$('tamilHoroscopeResult');
    // FINAL HOROSCOPE RELEASE RULE: while calculating, keep the entire horoscope
    // result (chart + all advanced/new features) hidden. Only the Create Horoscope
    // button shows the loading state. Nothing is revealed until every calculation
    // in the advanced batch has completed.
    if(resultBox){
      resultBox.classList.add('hidden');
      resultBox.setAttribute('aria-busy','true');
      resultBox.innerHTML='';
    }
    if(btn){btn.disabled=true;btn.textContent='⏳ ஜாதகம் உருவாக்கப்படுகிறது…';}
    let progress=$('tamilHoroscopeProgress'); if(!progress&&btn){progress=document.createElement('div');progress.id='tamilHoroscopeProgress';progress.className='smv-horoscope-progress';progress.innerHTML='<span class="spin"></span><span>ஜாதகம் உருவாக்கப்படுகிறது…<br>அனைத்து கணக்கீடுகளும் தயார் செய்யப்படுகின்றன…</span>';btn.insertAdjacentElement('afterend',progress);}
    try{
      // Native mobile time inputs normally return HH:mm (for example 22:05 for 10:05 PM).
      // Normalize common 12-hour text values too, so the API always receives HH:mm.
      function normalizeHoroscopeTime(value){
        const s=String(value||'').trim();
        let m=s.match(/^(\d{1,2}):([0-5]\d)$/);
        if(m){ const h=Number(m[1]); if(h>=0&&h<=23) return `${String(h).padStart(2,'0')}:${m[2]}`; }
        m=s.match(/^(\d{1,2})[.:]([0-5]\d)\s*(AM|PM)$/i);
        if(m){ let h=Number(m[1]); const ap=m[3].toUpperCase(); if(h<1||h>12)return ''; if(ap==='AM')h=h===12?0:h;else h=h===12?12:h+12; return `${String(h).padStart(2,'0')}:${m[2]}`; }
        return '';
      }
      const normalizedTime=normalizeHoroscopeTime(time);
      if(!normalizedTime) throw new Error('பிறந்த நேரம் சரியாக உள்ளிடவும். உதாரணம்: 22:05 (10:05 PM).');
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),120000);
      let r;
      try{
        r=await fetch((window.SMV_BACKEND_URL||(window.SMV_BACKEND_URL||''))+'/api/horoscope/calculate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,time:normalizedTime,lat:Number(lat),lon:Number(lon),height:0,utcOffsetMinutes:Number(document.getElementById('birthUtcOffset')?.value??5.5)*60,houseSystem:'S'}),signal:controller.signal});
      }finally{clearTimeout(timeout);}
      const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||`Calculation failed (HTTP ${r.status})`);
      // Render the core horoscope into the hidden result container first.
      render(d);
      const advRoot=$('tamilAdvancedAstrology');
      if(loadAdvanced && advRoot && typeof window.__smvLoadAdvancedAstrology==='function'){
        const runAdvancedAfterAccess=async()=>{
          resultBox?.classList.add('hidden');
          resultBox?.setAttribute('aria-busy','true');
          advRoot.innerHTML='';
          await window.__smvLoadAdvancedAstrology({date,time:normalizedTime,lat,lon,lang:getHoroscopeLang(),rootId:'tamilAdvancedAstrology',name:($('tamilAstroName')?.value||'').trim(),chart:d,generationId});
          resultBox?.classList.remove('hidden');
          resultBox?.setAttribute('aria-busy','false');
        };
        // Paid Advanced Analysis must be authorized BEFORE any advanced calculation.
        // Waiting for the user's payment must NOT keep the main Horoscope spinner alive.
        if(typeof window.__smvRequireHoroscopeFeatureAccess==='function'){
          resultBox?.classList.remove('hidden');
          resultBox?.setAttribute('aria-busy','false');
          advRoot.classList.remove('hidden');
          const allowed=await window.__smvRequireHoroscopeFeatureAccess('advanced_analysis',advRoot,runAdvancedAfterAccess);
          if(!allowed){
            requestAnimationFrame(()=>resultBox?.scrollIntoView({behavior:'smooth',block:'start'}));
            return d;
          }
        }
        await runAdvancedAfterAccess();
      }
      // SINGLE RELEASE: chart + all new features become visible together.
      if(resultBox){
        resultBox.classList.remove('hidden');
        resultBox.setAttribute('aria-busy','false');
        requestAnimationFrame(()=>resultBox.scrollIntoView({behavior:'smooth',block:'start'}));
      }
      return d;
    }catch(e){
      if(e?.name==='AbortError') alert('Horoscope calculation timed out after 120 seconds. Please check the Render server and try again.');
      else alert(e?.message||String(e));
    }
    finally{
      if(resultBox) resultBox.setAttribute('aria-busy','false');
      if(btn){btn.disabled=false;btn.textContent='தமிழில் ஜாதகம் உருவாக்குக';} if(progress) progress.remove();
      window.__smvHoroscopeGenerating=false;
    }
  }
  $('generateTamilHoroscope')?.addEventListener('click',()=>{
    try{localStorage.setItem('smvLanguage','ta');}catch(_e){}
    $('englishHoroscopeResult')?.classList.add('hidden');
    if($('englishHoroscopeResult'))$('englishHoroscopeResult').innerHTML='';
    generate();
  });
  $('clearTamilHoroscope')?.addEventListener('click',()=>{['tamilAstroName','tamilDob','tamilTob','tamilBirthPlace','tamilNakshatra','tamilLat','tamilLon'].forEach(id=>{if($(id))$(id).value='';});if($('tamilBirthPlace')){$('tamilBirthPlace').dataset.locationSelected='0';$('tamilBirthPlace').dataset.latitude='';$('tamilBirthPlace').dataset.longitude='';}if($('tamilRasi'))$('tamilRasi').value='மேஷம்';if($('tamilHoroscopeResult')){$('tamilHoroscopeResult').classList.add('hidden');$('tamilHoroscopeResult').innerHTML='';}if($('englishHoroscopeResult')){$('englishHoroscopeResult').classList.add('hidden');$('englishHoroscopeResult').innerHTML='';}});
  // V149: expose horoscope helpers so the separate English section can safely
  // reuse the renderer without relying on JavaScript lexical scope from another IIFE.
  window.__smvHoroscopeEnglishDictionary = EN;
  window.__smvApplyEnglishToHoroscope = applyEnglishToHoroscope;
  window.__smvBindHoroscopeInteractions = bindHoroscopeInteractions;
  window.__smvGenerateAIFuture = generateAIFuture;
  window.__smvGenerateHoroscopeEngine=generate;
})();
