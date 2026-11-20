// Sri Math Subha Janana statement and Horoscope/Calendar presentation regression.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { formatOfflineIndiaAdministrativeAreas } from '../public/horoscope/offline/places/place-display.mjs';
import { buildSubhaJanana, getTamilRitu, getBirthTimeAmirthadiYoga } from '../public/horoscope/subha-janana.mjs';
import { localizeTamilText } from '../public/horoscope/offline/places/tamil-transliteration.mjs';
import { solarNoaa, tamilSolarDate, nakshatraIntervalsForLocalDay, thyajyamIntervalsForLocalDay, calculateAhasRatriPramana } from '../public/horoscope/offline/transit_panchang.browser.mjs';
import { getTamilDayYoga } from '../public/horoscope/tamil-day-classifications.mjs';
import { offsetMinutesAt } from '../public/horoscope/offline/places/timezone.mjs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
let checks=0;
for(const [name,fn] of Object.entries({buildSubhaJanana,solarNoaa,tamilSolarDate,nakshatraIntervalsForLocalDay,thyajyamIntervalsForLocalDay,calculateAhasRatriPramana,getTamilDayYoga,offsetMinutesAt})){
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
const intervalYoga=getBirthTimeAmirthadiYoga([
  {startTimestamp:0,endTimestamp:100,yoga:{key:'marana',ta:'மரண யோகம்',en:'Marana Yogam'}},
  {startTimestamp:100,endTimestamp:200,yoga:{key:'siddha',ta:'சித்த யோகம்',en:'Siddha Yogam'}}
],150);
equal(intervalYoga.key,'siddha','The birth timestamp selects its active Amirthadi interval, not the first day interval');

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
has(horoscope,'if(calendarPanchangSlot)calendarPanchangSlot.innerHTML=dailyTable;','Calendar Daily Panchang source remains populated');
has(horoscope,'data-smv-screen-only="daily-hora"','Calendar Daily Hora markup remains available');
has(horoscope,'window.__smvRenderBasicSnapshot=async','Language switches regenerate the statement in the selected language');

has(prose,'formatOfflineIndiaAdministrativeAreas','State and district use the existing location-display dictionary');
for(const symbol of ['solarNoaa','tamilSolarDate','nakshatraIntervalsForLocalDay','thyajyamIntervalsForLocalDay','calculateAhasRatriPramana','getTamilDayYoga','offsetMinutesAt'])
  has(prose,symbol,'Subha Janana uses existing offline calculations: '+symbol);
for(const phrase of ['புத்திர பாக்கியமாக ஆண் குழந்தை','புத்திரி பாக்கியமாக பெண் குழந்தை','தியாஜ்யம்:','யோகமும் கூடிய சுப தினத்தில்','நாழிகை','விநாழிகை','தீர்க்காயுளும்'])
  has(prose,phrase,'Traditional statement includes '+phrase);
has(prose,'getBirthTimeAmirthadiYoga(segments,birthTs)','Birth-time Amirthadi Yoga is selected from its exact active interval');
lacks(prose,'dayYogaName','Daily first-interval Amirthadi Yoga must not be combined with birth-time Yoga');
lacks(prose,'பிறந்த நேர அமிர்தாதி யோகம்:','Do not show a redundant day-yoga plus birth-yoga parenthesis');
has(prose,'formatOfflineIndiaAdministrativeAreas(meta.state,meta.district','District and state are sourced from selected-location administrative metadata');
has(prose,'if(administrativeAreas.admin2)','District is added only when selected-location metadata contains it');
has(prose,"const village=localizeTamilText(meta.village||'',targetLanguage)",'Village values are localized without changing their source metadata');
has(prose,'parentText=father&&mother?','Both parent names are rendered together when present');
has(prose,':father?(','Father-only input is rendered without an empty mother placeholder');
has(prose,':mother?(','Mother-only input is rendered without an empty father placeholder');
has(prose,"birthTimeGhati+'க்கு (சரியாக '+birthClockTa+' மணிக்கு)",'Tamil birth time is grammatically formatted after sunrise');

has(css,'.smv-subha-janana{','Narrative has its own report styling');
has(css,'.birth-gender-option input:checked+span','Gender choices are rendered as selected button-style radio options');
has(sw,"'./subha-janana.mjs'","New narrative module is precached for offline use");
has(sw,"'./tamil-day-classifications.mjs'","Amirthadi yoga lookup is also precached for offline use");
has(sw,"'./offline/places/tamil-transliteration.mjs'","Two-way Tamil transliteration is precached for offline use");
for(const label of ["'Gender':'பாலினம்'","'Male':'ஆண்'","'Female':'பெண்'","'Village':'கிராமம்'","\"Mother's Name\":'தாயார் பெயர்'","\"Father's Name\":'தந்தையார் பெயர்'"])
  has(language,label,'English field label is translated to Tamil: '+label);

console.log(JSON.stringify({passed:true,assertions:checks}));
