export const TAMIL_ACTIVITIES = Object.freeze([
  {id:'vivaha',labelTa:'திருமணம்',labelEn:'Marriage',sourceStatus:'partial',personalDataRequired:['brideGroomBirthDetails'],note:'Marriage matching is a separate optional personal assessment.'},
  {id:'nichayathartham',labelTa:'நிச்சயதார்த்தம்',labelEn:'Engagement',sourceStatus:'pending'},
  {id:'pumsavana',labelTa:'பூம்ஸவனம்',labelEn:'Pumsavana',sourceStatus:'partial'},
  {id:'seemantham',labelTa:'சீமந்தம்',labelEn:'Seemantham',sourceStatus:'partial'},
  {id:'namakaranam',labelTa:'நாமகரணம்',labelEn:'Naming ceremony',sourceStatus:'partial'},
  {id:'cradle',labelTa:'தொட்டில் விழா',labelEn:'Cradle ceremony',sourceStatus:'partial'},
  {id:'annaprashana',labelTa:'அன்னப்பிராசனம்',labelEn:'Annaprashana',sourceStatus:'partial'},
  {id:'karnavedha',labelTa:'காதணி விழா',labelEn:'Ear-piercing',sourceStatus:'partial'},
  {id:'chaula',labelTa:'மொட்டை / சௌளம்',labelEn:'Tonsure / Caula',sourceStatus:'partial'},
  {id:'vidyarambha',labelTa:'வித்யாரம்பம்',labelEn:'Vidyarambha',sourceStatus:'partial'},
  {id:'upanayana',labelTa:'உபநயனம்',labelEn:'Upanayana',sourceStatus:'partial'},
  {id:'vastu',labelTa:'பூமி பூஜை / வாஸ்து தொடக்கம்',labelEn:'Vastu / foundation',sourceStatus:'partial'},
  {id:'griharambha',labelTa:'கட்டிடத் தொடக்கம்',labelEn:'Building commencement',sourceStatus:'partial'},
  {id:'grihapravesha',labelTa:'கிரகப்பிரவேசம்',labelEn:'House entry',sourceStatus:'partial'},
  {id:'yatra',labelTa:'பயணத் தொடக்கம்',labelEn:'Journey commencement',sourceStatus:'partial'},
  {id:'vehicle',labelTa:'வாகனம் வாங்குதல் / தொடக்கம்',labelEn:'Vehicle purchase / first use',sourceStatus:'partial'},
  {id:'agriculture',labelTa:'விவசாயம் / விதைப்பு',labelEn:'Agriculture / sowing',sourceStatus:'pending'},
  {id:'business',labelTa:'தொழில் / கடை தொடக்கம்',labelEn:'Business opening',sourceStatus:'pending'},
  {id:'deity_installation',labelTa:'தெய்வப் பிரதிஷ்டை / கும்பாபிஷேகம்',labelEn:'Deity installation / Kumbhabhisheka',sourceStatus:'pending'}
]);

export const PAN_INDIAN_ACTIVITIES = Object.freeze([
  {id:'samskara',labelTa:'சம்ஸ்காரங்கள்',labelEn:'Saṃskāras',sourceStatus:'partial'},
  {id:'jatakarma',labelTa:'ஜாதகர்மம்',labelEn:'Jātakarma',sourceStatus:'partial'},
  {id:'annaprashana',labelTa:'அன்னப்பிராசனம்',labelEn:'Annaprāśana',sourceStatus:'partial'},
  {id:'chaula',labelTa:'சௌளம்',labelEn:'Caula / Cūḍākaraṇa',sourceStatus:'partial'},
  {id:'upanayana',labelTa:'உபநயனம்',labelEn:'Upanayana',sourceStatus:'partial'},
  {id:'vidyarambha',labelTa:'வித்யாரம்பம்',labelEn:'Vidyārambha',sourceStatus:'partial'},
  {id:'vivaha',labelTa:'விவாஹம்',labelEn:'Vivāha',sourceStatus:'partial',personalDataRequired:['brideGroomBirthDetails']},
  {id:'vadhupravesha',labelTa:'வதூப் பிரவேசம்',labelEn:'Vadhū-praveśa',sourceStatus:'partial'},
  {id:'dviragamanam',labelTa:'த்விராகமனம்',labelEn:'Dvirāgamana',sourceStatus:'partial'},
  {id:'agnyadhana',labelTa:'அக்ன்யாதானம்',labelEn:'Agnyādhāna',sourceStatus:'partial'},
  {id:'rajyabhisheka',labelTa:'ராஜ்யாபிஷேகம்',labelEn:'Rājyābhiṣeka',sourceStatus:'partial'},
  {id:'yatra',labelTa:'யாத்திரை',labelEn:'Yātrā',sourceStatus:'partial'},
  {id:'vastu',labelTa:'வாஸ்து / கட்டிடத் தொடக்கம்',labelEn:'Vāstu / building',sourceStatus:'partial'},
  {id:'grihapravesha',labelTa:'கிருஹப்பிரவேசம்',labelEn:'Gṛhapraveśa',sourceStatus:'partial'}
]);

export const ACTIVITY_LABELS = Object.freeze({
  tamil:Object.freeze(Object.fromEntries(TAMIL_ACTIVITIES.map(x=>[x.id,[x.labelTa,x.labelEn]]))),
  panIndian:Object.freeze(Object.fromEntries(PAN_INDIAN_ACTIVITIES.map(x=>[x.id,[x.labelTa,x.labelEn]])))
});
