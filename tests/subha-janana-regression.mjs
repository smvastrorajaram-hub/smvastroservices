// Sri Math Subha Janana statement and Horoscope/Calendar presentation regression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatOfflineIndiaAdministrativeAreas } from '../public/horoscope/offline/places/place-display.mjs';
import { buildSubhaJanana, getTamilRitu, getBirthTimeAmirthadiYoga } from '../public/horoscope/subha-janana.mjs';
import { localizeTamilText, latinToTamil, tamilToLatin } from '../public/horoscope/offline/places/tamil-transliteration.mjs';
import { solarNoaa, tamilSolarDate, nakshatraIntervalsForLocalDay, thyajyamIntervalsForLocalDay, calculateAhasRatriPramana } from '../public/horoscope/offline/transit_panchang.browser.mjs';
import { calculateSunMoon } from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import { getTamilDayYoga, TAMIL_DAY_YOGA_TABLE } from '../public/horoscope/tamil-day-classifications.mjs';
import { offsetMinutesAt } from '../public/horoscope/offline/places/timezone.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
let checks=0;
for(const [name,fn] of Object.entries({buildSubhaJanana,solarNoaa,tamilSolarDate,nakshatraIntervalsForLocalDay,thyajyamIntervalsForLocalDay,calculateAhasRatriPramana,calculateSunMoon,getTamilDayYoga,offsetMinutesAt,latinToTamil,tamilToLatin,localizeTamilText,getTamilRitu,getBirthTimeAmirthadiYoga})){
  assert.equal(typeof fn,'function','Runtime module export is available: '+name);checks++;
}
const has=(source,part,message)=>{assert.ok(source.includes(part),message||part);checks++;};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const lacks=(source,part,message)=>{assert.equal(source.includes(part),false,message||part);checks++;};

assert.deepEqual(formatOfflineIndiaAdministrativeAreas('Tamil Nadu','Perambalur District','ta'),{admin1:'தமிழ்நாடு',admin2:'பெரம்பலூர்'},'Tamil statement uses verified Tamil Nadu state/district labels');checks++;
assert.deepEqual(formatOfflineIndiaAdministrativeAreas('England','Greater London','en'),{admin1:'England',admin2:'Greater London'},'English place data remains unchanged');checks++;
assert.deepEqual(formatOfflineIndiaAdministrativeAreas('தமிழ்நாடு','பெரம்பலூர்','en'),{admin1:'Tamil Nadu',admin2:'Perambalur'},'Tamil-selected district/state are localized to English');checks++;
equal(localizeTamilText('Rajaram','ta'),'ராஜாராம்','English person name to Tamil');
equal(localizeTamilText('ராஜாராம்','en'),'Rajaram','Tamil person name to English');
equal(localizeTamilText('Perambalur','ta'),'பெரம்பலூர்','English village to Tamil');
equal(localizeTamilText('பெரம்பலூர்','en'),'Perambalur','Tamil village to English');
equal(localizeTamilText('Madurai, Tamil Nadu, India','ta'),'மதுரை, தமிழ்நாடு, இந்தியா','English place to Tamil');
equal(localizeTamilText('மதுரை, தமிழ்நாடு, இந்தியா','en'),'Madurai, Tamil Nadu, India','Tamil place to English');
equal(localizeTamilText('Annapoorani','ta'),'அன்னபூரணி','English mother name to Tamil');
equal(localizeTamilText('ராஜேந்திரன்','en'),'Rajendran','Tamil father name to English');

const monthNamesTa=['சித்திரை','வைகாசி','ஆனி','ஆடி','ஆவணி','புரட்டாசி','ஐப்பசி','கார்த்திகை','மார்கழி','தை','மாசி','பங்குனி'];
const monthNamesEn=['Chithirai','Vaikasi','Aani','Aadi','Avani','Purattasi','Aippasi','Karthigai','Margazhi','Thai','Masi','Panguni'];
const expectedRituTa=['வசந்த','வசந்த','கிரீஷ்ம','கிரீஷ்ம','வர்ஷ','வர்ஷ','சரத்','சரத்','ஹேமந்த','ஹேமந்த','சிசிர','சிசிர'];
const expectedRituEn=['Vasanta','Vasanta','Grishma','Grishma','Varsha','Varsha','Sharad','Sharad','Hemanta','Hemanta','Shishira','Shishira'];
for(let index=0;index<12;index++){
  const solarMonth={index,monthTa:monthNamesTa[index],monthEn:monthNamesEn[index]};
  equal(getTamilRitu(solarMonth,'ta'),expectedRituTa[index],'Tamil Ritu is derived from '+monthNamesTa[index]);
  equal(getTamilRitu(solarMonth,'en'),expectedRituEn[index],'English Ritu is derived from '+monthNamesEn[index]);
}
equal(getTamilRitu({index:2,monthTa:'தை',monthEn:'Thai'},'ta'),'ருது கணிக்க இயலவில்லை','A mismatched solar month cannot display a stale fixed Ritu');
const yogaClasses=new Map();
for(let weekday=0;weekday<TAMIL_DAY_YOGA_TABLE.length;weekday++){
  for(let star=1;star<=27;star++){
    const yoga=getTamilDayYoga(weekday,star);
    yogaClasses.set(yoga.key,yoga);
  }
}
for(const [key,labelTa,labelEn] of [
  ['siddha','சித்த யோகம்','Siddha Yogam'],
  ['amirtha','அமிர்த யோகம்','Amirtha Yogam'],
  ['marana','மரண யோகம்','Marana Yogam'],
  ['prabalarishta','பிரபலாரிஷ்ட யோகம்','Prabalarishta Yogam']
]){
  assert.ok(yogaClasses.has(key),'The existing Amirthadi lookup contains '+key);checks++;
  equal(yogaClasses.get(key).ta,labelTa,'Tamil Amirthadi label for '+key);
  equal(yogaClasses.get(key).en,labelEn,'English Amirthadi label for '+key);
}
const intervalYoga=getBirthTimeAmirthadiYoga([
  {startTimestamp:0,endTimestamp:100,yoga:{key:'marana',ta:'மரண யோகம்',en:'Marana Yogam'}},
  {startTimestamp:100,endTimestamp:200,yoga:{key:'siddha',ta:'சித்த யோகம்',en:'Siddha Yogam'}}
],150);
equal(intervalYoga.key,'siddha','The birth timestamp selects its active Amirthadi interval, not the first day interval');

await calculateSunMoon({date:'2026-04-25',time:'12:00',lat:11.23,lon:78.88,utcOffsetMinutes:330});

const seasonSamples=[
  ['2026-04-25',0,'வசந்த'],
  ['2026-06-25',2,'கிரீஷ்ம'],
  ['2026-08-25',4,'வர்ஷ'],
  ['2026-10-25',6,'சரத்'],
  ['2026-12-25',8,'ஹேமந்த'],
  ['2027-02-25',10,'சிசிர']
];
for(const [date,monthIndex,ritu] of seasonSamples){
  const solar=tamilSolarDate({date,time:'12:00',lat:11.23,lon:78.88,utcOffsetMinutes:330,mode:'birth'});
  assert.ok(solar,'Tamil solar date calculated for Ritu fixture '+date);checks++;
  equal(solar.index,monthIndex,'Solar month index is correct on '+date);
  equal(getTamilRitu(solar,'ta'),ritu,'Date-derived Ritu changes with Tamil solar month on '+date);
}

const fixtureDate='2026-06-25',fixtureTime='10:30',fixtureLat=11.23,fixtureLon=78.88,fixtureZone='Asia/Kolkata';
const fixtureSunrise=solarNoaa(fixtureDate,fixtureLat,fixtureLon,330,true);
assert.ok(fixtureSunrise,'Sunrise fixture is available for birth-time yoga');checks++;
const fixtureTimeline=nakshatraIntervalsForLocalDay({
  date:fixtureDate,time:fixtureSunrise,lat:fixtureLat,lon:fixtureLon,
  utcOffsetMinutes:330,timezone:fixtureZone,language:'ta'
});
assert.ok(fixtureTimeline.available&&fixtureTimeline.intervals.length>0,'Nakshatra timeline is available for the selected birth day');checks++;
const fixtureTimestamp=Date.parse(fixtureDate+'T'+fixtureTime+':00Z')-330*60000;
const fixtureWeekday=new Date(fixtureDate+'T12:00:00Z').getUTCDay();
const fixtureBirthSegment=fixtureTimeline.intervals.find(x=>fixtureTimestamp>=x.startTimestamp&&fixtureTimestamp<x.endTimestamp);
assert.ok(fixtureBirthSegment,'Birth time belongs to one exact Nakshatra interval');checks++;
const fixtureBirthYoga=getTamilDayYoga(fixtureWeekday,fixtureBirthSegment.nakshatraNumber);
assert.notEqual(fixtureBirthYoga.key,'unknown','Birth-time Amirthadi Yoga is available');checks++;
const panchangFixture={
  requested:{date:fixtureDate,time:fixtureTime,latitude:fixtureLat,longitude:fixtureLon},
  tithi:{name:'திருதியை',half:'Shukla'},
  nakshatra:{name:'ரோகிணி',pada:2},
  yoga:{name:'சித்த யோகம்'},
  karana:{name:'பவம்'},
  moonSign:'ரிஷபம்'
};
const chartFixture={lagna:{rasi:'கன்னி'},planets:[]};
const tamilEntry={
  date:fixtureDate,time:fixtureTime,lat:fixtureLat,lon:fixtureLon,timezone:fixtureZone,
  gender:'male',name:'ராஜாராம்',village:'பெரம்பலூர்',fatherName:'ராஜேந்திரன்',
  motherName:'அன்னபூரணி',placeName:'மதுரை',district:'மதுரை',state:'தமிழ்நாடு',country:'இந்தியா'
};
const tamilStatement=await buildSubhaJanana(panchangFixture,chartFixture,tamilEntry,'ta');
const englishStatement=await buildSubhaJanana(panchangFixture,chartFixture,tamilEntry,'en');
const expectedTamilYoga=fixtureBirthYoga.ta.replace(/\s*யோகம்$/u,'')+' யோகமும் கூடிய சுப தினத்தில்';
const expectedEnglishYoga=fixtureBirthYoga.en.replace(/\s*Yogam$/i,'')+' Yogam on this auspicious day';
has(tamilStatement,expectedTamilYoga,'Tamil statement displays only the Amirthadi Yoga active at birth time');
has(tamilStatement,'>'+expectedTamilYoga+'</span> சூரிய உதயாதி','Siddha/Amirthadi phrase flows directly into Surya Udhayadhi without a final dot');
lacks(tamilStatement,'>'+expectedTamilYoga+'</span>. சூரிய உதயாதி','No full stop appears after the Tamil auspicious Yoga phrase');
has(englishStatement,expectedEnglishYoga,'English statement displays only the Amirthadi Yoga active at birth time');
lacks(tamilStatement,'பிறந்த நேர அமிர்தாதி யோகம்:','Tamil statement does not append a second birth-time Yoga label');
has(tamilStatement,'class="smv-sj-result">கிரீஷ்ம</span> ருதுவும்','June Tamil solar month derives Grishma Ritu with result styling');
has(englishStatement,'class="smv-sj-result">Grishma</span> season','English statement derives the same solar Ritu with result styling');
for(const value of ['ராஜாராம்','பெரம்பலூர் கிராமம்','ராஜேந்திரன்','அன்னபூரணி','மதுரை மாவட்டம்','தமிழ்நாடு மாநிலம்'])
  has(tamilStatement,value,'Tamil input remains Tamil in Tamil statement: '+value);
for(const value of ['Rajaram','Perambalur Village','Rajendran','Annapoorani','Madurai District','Tamil Nadu State'])
  has(englishStatement,value,'Tamil input is transliterated in English statement: '+value);

const englishEntry={
  ...tamilEntry,gender:'female',name:'Rajaram',village:'Perambalur',fatherName:'Rajendran',
  motherName:'Annapoorani',placeName:'Madurai',district:'Madurai',state:'Tamil Nadu',country:'India'
};
const tamilFromEnglish=await buildSubhaJanana(panchangFixture,chartFixture,englishEntry,'ta');
has(tamilFromEnglish,'ராஜாராம்','English person name becomes Tamil in the Tamil statement');
has(tamilFromEnglish,'பெரம்பலூர் கிராமம்','English village becomes Tamil in the Tamil statement');
has(tamilFromEnglish,'திரு. ராஜேந்திரன்','English father name becomes Tamil in the Tamil statement');
has(tamilFromEnglish,'திருமதி. அன்னபூரணி','English mother name becomes Tamil in the Tamil statement');
has(tamilFromEnglish,'மதுரை மாவட்டம்','English place selection becomes Tamil in the Tamil statement');
has(tamilFromEnglish,'புத்திரி பாக்கியமாக பெண் குழந்தை','Female gender is retained and rendered in Tamil');

const html=read('public/horoscope/index.html');
const form=read('public/horoscope/horoscope-form.js');
const horoscope=read('public/horoscope/horoscope.js');
const prose=read('public/horoscope/subha-janana.mjs');
const css=read('public/horoscope/horoscope.css');
const sw=read('public/horoscope/sw.js');
const language=read('public/horoscope/horoscope-language.js');

for(const name of ['englishBirthGender','tamilBirthGender'])has(html,'name="'+name+'" value="male" required','Gender radio selection must be required: '+name);
has(html,'<legend class="small">பாலினம்</legend>','Tamil gender label is exactly பாலினம்');
lacks(html,'பாலினம் (கட்டாயம்)','Do not add a required-word suffix to the Tamil label');
for(const id of ['englishBirthVillage','englishMotherName','englishFatherName','tamilBirthVillage','tamilMotherName','tamilFatherName'])
  has(html,'id="'+id+'"','Optional input must exist: '+id);
for(const label of ['கிராமம்','தாயார் பெயர்','தந்தையார் பெயர்'])
  has(html,'<b>'+label+'</b>','Tamil optional label must be present: '+label);

const englishOffset=html.indexOf('id="birthUtcOffset"');
const englishVillage=html.indexOf('id="englishBirthVillage"');
const tamilOffset=html.indexOf('id="tamilBirthUtcOffsetDisplay"');
const tamilVillage=html.indexOf('id="tamilBirthVillage"');
assert.ok(englishOffset>=0&&englishVillage>englishOffset,'English optional block follows the calculated UTC offset');checks++;
assert.ok(tamilOffset>=0&&tamilVillage>tamilOffset,'Tamil optional block follows the calculated UTC offset');checks++;
assert.ok(html.indexOf('id="englishBirthGender"')<html.indexOf('id="englishDob"'),'English gender is directly below Name');checks++;
assert.ok(html.indexOf('id="tamilBirthGender"')<html.indexOf('id="tamilDob"'),'Tamil gender is directly below Name');checks++;

has(form,"if(!['male','female'].includes(gender))","Payment/report context rejects missing gender");
has(form,"if(!['male','female'].includes(birthGender))","English generation rejects missing gender");
has(form,"const {localizeTamilText}=await import('./offline/places/tamil-transliteration.mjs')",'English form uses the offline proper-name transliteration module.');
has(form,"copy('englishBirthVillage','tamilBirthVillage','ta')",'English village is transliterated into the Tamil mirror field.');
has(form,"copy('englishAstroName','tamilAstroName','ta')",'English horoscope name is transliterated into the Tamil report field.');
has(horoscope,"['tamilAstroName','englishAstroName']",'Tamil horoscope name is transliterated into the English mirror field.');
has(horoscope,'data-name-ta="${esc(name)}"','Result heading stores the Tamil-script name separately.');
has(horoscope,'data-name-en="${esc($(\'englishAstroName\')?.value||name)}"','Result heading stores the English-script name separately.');
has(language,"root?.querySelector('.smv-horoscope-person-name')",'Result language switch updates the displayed horoscope name.');
has(language,"lang==='ta'?personName.dataset.nameTa:personName.dataset.nameEn",'Name heading selects the matching translated form for Tamil and English.');
has(form,"copy('englishMotherName','tamilMotherName','ta')",'English mother name is transliterated into the Tamil mirror field.');
has(form,"copy('englishFatherName','tamilFatherName','ta')",'English father name is transliterated into the Tamil mirror field.');
has(horoscope,"['tamilBirthVillage','englishBirthVillage']",'Tamil village is transliterated into the English mirror field.');
has(horoscope,"['tamilMotherName','englishMotherName']",'Tamil mother name is transliterated into the English mirror field.');
has(horoscope,"['tamilFatherName','englishFatherName']",'Tamil father name is transliterated into the English mirror field.');
has(horoscope,"if(!['male','female'].includes(birthGender))","Tamil generation rejects missing gender");
for(const key of ['gender','village','motherName','fatherName','district','state','country','timezone'])
  has(form,key+':','Form context carries '+key);
has(horoscope,"gender:birthGender","Tamil generation carries gender");
has(horoscope,"motherName:String($('tamilMotherName')","Tamil generation carries parent names");
has(form,"place.dataset.admin2","Selected GeoNames admin2 metadata is retained");

const invocation=horoscope.indexOf('<div class="smv-invocation">');
const statement=horoscope.indexOf('\${subhaJananaHtml||',invocation);
const yearGrid=horoscope.indexOf('<div class="smv-year-reckoning">',invocation);
assert.ok(invocation>=0&&statement>invocation&&yearGrid>statement,'Subha Janana appears immediately below invocation and before Year Reckoning');checks++;
lacks(horoscope,'smv-birth-summary','Duplicate Birth Panchang Summary card is removed');
lacks(horoscope,'const summarySentence','Duplicate explanatory birth-panchang sentence is removed');
has(horoscope,'card birth-time-panchang','Birth Panchang remains');
has(horoscope,'smv-year-reckoning','Traditional Year Reckoning remains');
has(horoscope,'subhaJananaHtml','Birth statement is an explicit renderer parameter');

lacks(horoscope,'data-smv-screen-only="daily-panchang"','Horoscope no longer renders the Daily Panchang card');
has(horoscope,'if(calendarPresentation)h+=','Daily Hora markup is gated to Calendar presentation');
has(horoscope,"${ta?'கோச்சாரம்':'Transit'}","Transit chart centre displays கோச்சாரம் in Tamil");
has(horoscope,'class="planet-line transit-lagna-line"','Transit Lagna is emitted in the planet text row');
has(horoscope,'class="planet-short" data-transit-lagna="true"','Transit Lagna uses the same source label span as a planet short name');
lacks(horoscope,'transit-chart-lagna','Transit Lagna does not use a fixed-size CSS-special label');
const chartStyleSource=read('public/horoscope/chart-style.js');
has(chartStyleSource,"if(house===1&&kind!=='transit')",'Alternate chart layouts do not add a second Transit Lagna marker outside the source planet row');
has(horoscope,'if(calendarPanchangSlot)calendarPanchangSlot.innerHTML=dailyTable;','Calendar Daily Panchang source remains populated');
has(horoscope,'data-smv-screen-only="daily-hora"','Calendar Daily Hora markup remains available');
has(horoscope,'window.__smvRenderBasicSnapshot=async','Language switches regenerate the statement in the selected language');

has(prose,'formatOfflineIndiaAdministrativeAreas','State and district use the existing location-display dictionary');
for(const symbol of ['solarNoaa','tamilSolarDate','nakshatraIntervalsForLocalDay','thyajyamIntervalsForLocalDay','calculateAhasRatriPramana','getTamilDayYoga','getTamilRitu','getBirthTimeAmirthadiYoga','localizeTamilText','offsetMinutesAt'])
  has(prose,symbol,'Subha Janana uses existing offline calculations: '+symbol);
for(const phrase of ['புத்திர பாக்கியமாக ஆண் குழந்தை','புத்திரி பாக்கியமாக பெண் குழந்தை','தியாஜ்யம்:','யோகமும் கூடிய சுப தினத்தில்','நாழிகை','விநாழிகை','தீர்க்காயுளும்'])
  has(prose,phrase,'Traditional statement includes '+phrase);
has(prose,'getBirthTimeAmirthadiYoga(segments,birthTs)','Birth-time Amirthadi Yoga is selected from its exact active interval');
lacks(prose,'dayYogaName','Daily first-interval Amirthadi Yoga must not be combined with birth-time Yoga');
lacks(prose,'பிறந்த நேர அமிர்தாதி யோகம்:','Do not show a redundant day-yoga plus birth-yoga parenthesis');
has(prose,'formatOfflineIndiaAdministrativeAreas(meta.state,meta.district','District and state are sourced from selected-location administrative metadata');
has(prose,'if(district)','District is added only when selected-location metadata contains it');
has(prose,"const village=localizeTamilText(meta.village||'',targetLanguage)",'Village values are localized without changing their source metadata');
has(prose,'parentText=father&&mother?','Both parent names are rendered together when present');
has(prose,'ஸ்ரீமத் சுபஜெனன வாக்கியம்','Tamil heading is preserved');
has(prose,'aria-hidden="true">ॐ','Spiritual symbols flank the statement heading');
has(prose,"'வியாழக்கிழமை'",'Thursday uses the grammatically correct Tamil weekday name');
lacks(prose,'வியாழன்க்கிழமை','Do not render an extra nasal consonant in Thursday');
for(const marker of ['smv-sj-result','smv-sj-time','sjValue(samvatsara)','sjValue(ritu)','sjValue(tithi)','sjValue(nak)','sjValue(karana)','sjSafeValue(parentText)','sjSafeValue(place)'])
  has(prose,marker,'Statement distinguishes Panchang and personal result values: '+marker);
has(prose,'sjTime(time12(solar.rise))','Sunrise digits use the numeric time colour in railway time');
has(prose,'sjTime(time12(solar.set))','Sunset digits use the numeric time colour in railway time');
has(prose,'ghatiMarkup(pramana?.ahasNazhigai?.totalVighati,ta)','Ahas digits are coloured separately from the plain Nazhigai/Vinazhigai words');
has(prose,'ghatiMarkup(pramana?.ratriNazhigai?.totalVighati,ta)','Ratri digits are coloured separately from the plain Nazhigai/Vinazhigai words');
has(prose,'String(Number(m[1])).padStart(2,\'0\')+\':\'+m[2]','Clock values are formatted as zero-padded 24-hour railway time');
lacks(prose,'AM','No AM suffix appears anywhere in the statement builder');
lacks(prose,'PM','No PM suffix appears anywhere in the statement builder');
lacks(prose,'சூரிய உதயம் காலை','Sunrise has no morning word before 24-hour time');
lacks(prose,'அஸ்தமனம் மாலை','Sunset has no evening word before 24-hour time');
lacks(prose,'const t=mins(point.time),part=','Event boundaries have no morning/afternoon/evening prefix');
has(prose,':father?(','Father-only input is rendered without an empty mother placeholder');
has(prose,':mother?(','Mother-only input is rendered without an empty father placeholder');
has(prose,"const birthTimeGhati=ghatiMarkup(birthVighati,ta),birthClockMarkup=sjTime(time12(time))",'Birth time uses separate Ghati number and 24-hour clock markup');
has(prose,"சூரிய உதயாதி '+birthTimeGhati+'க்கு (சரியாக '+birthClockMarkup+' மணிக்கு)",'Tamil birth time is displayed in railway time with no AM/PM or day-part label');

has(css,'.smv-subha-janana{','Narrative has its own report styling');
const statementStyleStart=css.indexOf('.smv-subha-janana{');
assert.ok(statementStyleStart>=0,'Compact Subha Janana style block exists');checks++;
const statementStyle=css.slice(statementStyleStart,statementStyleStart+1400);
has(statementStyle,'border:0','Subha Janana does not add a separate card or panel layer');
has(statementStyle,'background:transparent','Subha Janana uses the existing report surface');
has(statementStyle,'text-align:start','Statement text keeps natural word spacing and does not justify each line');
lacks(statementStyle,'text-align:justify','Statement text does not stretch word gaps'); 
has(statementStyle,'overflow-wrap:anywhere','Long content wraps within the available width');
has(css,'color:#8b1e2d','Heading uses an auspicious traditional maroon');
has(css,'color:#28634b','Panchang and personal result values use a distinct traditional green');
has(css,'color:#28518a','Time values use a separate deep blue');
has(css,'color:#b18a36','Spiritual symbols use an auspicious gold accent');
has(css,'.birth-gender-option input:checked+span','Gender choices are rendered as selected button-style radio options');
has(sw,"'./subha-janana.mjs'","New narrative module is precached for offline use");
has(sw,"'./tamil-day-classifications.mjs'","Amirthadi yoga lookup is also precached for offline use");
has(sw,"'./offline/places/tamil-transliteration.mjs'","Two-way Tamil transliteration is precached for offline use");
for(const worker of ['public/sw.js','public/horoscope/calendar/sw.js'])
  has(read(worker),'tamil-transliteration.mjs','Shared place-display dependency is precached in '+worker);
for(const label of ["'Gender':'பாலினம்'","'Male':'ஆண்'","'Female':'பெண்'","'Village':'கிராமம்'","\"Mother's Name\":'தாயார் பெயர்'","\"Father's Name\":'தந்தையார் பெயர்'"])
  has(language,label,'English field label is translated to Tamil: '+label);

console.log(JSON.stringify({passed:true,assertions:checks}));
