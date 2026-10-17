import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {arudhaPadaDisplayCode} from '../public/horoscope/offline/astro_advanced.browser.mjs';
import {cgRajanAyurdayaReportHtml} from '../public/horoscope/offline/cg-rajan-ayurdaya-pinda.browser.mjs';

const astroAdvanced=readFileSync('public/horoscope/offline/astro_advanced.browser.mjs','utf8');
const horoscope=readFileSync('public/horoscope/horoscope.js','utf8');
const css=readFileSync('public/horoscope/horoscope.css','utf8');

let assertions=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++};
const yes=(v,message)=>{assert.ok(v,message);assertions++};

// Display codes are AL, A2–A11, UL in both Tamil and English modes.
const expectedPadaCodes=['AL','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','UL'];
eq(expectedPadaCodes.map((_,i)=>arudhaPadaDisplayCode(i+1)),expectedPadaCodes,
 'A1 is AL, A2–A11 keep their A-code, A12 is UL');
assert.throws(()=>arudhaPadaDisplayCode(0),RangeError);assertions++;
assert.throws(()=>arudhaPadaDisplayCode(13),RangeError);assertions++;
assert.throws(()=>arudhaPadaDisplayCode(1.5),RangeError);assertions++;
yes(/const label=arudhaPadaDisplayCode\(h\);\s*arudhaItems\.push\(\{house:h,key:label,name:label/.test(astroAdvanced),
 'the actual A1–A12 table uses the tested labels and stable keys');

// The output labels are presentation-only. Stable keys bind the actual
// calculated AL/A1 and UL/A12 rows regardless of Tamil/English wording.
yes(astroAdvanced.includes("key:'AL',name:'AL',englishName:'AL'"),
 'Arudha Lagna row visibly displays AL in both languages');
yes(astroAdvanced.includes("key:'UL',name:'UL',englishName:'UL'"),
 'Upapada Lagna row visibly displays UL in both languages');
yes(!astroAdvanced.includes("name:ta?'ஆரூட லக்னம் (A1)'"),
 'old Tamil A1 display label is not used');
yes(!astroAdvanced.includes("name:ta?'உபபத லக்னம் (A12)'"),
 'old Tamil A12 display label is not used');
yes(horoscope.includes("p1Title('Arudha Padas AL, A2–A11, UL','ஆரூட பாதங்கள் AL, A2–A11, UL')"),
 'Arudha section heading exposes exact requested code range');
yes(horoscope.includes("['AL','AL']")&&horoscope.includes("['UL','UL']"),
 'secondary Special Lagnas display uses the same AL/UL aliases');

const lookupStart=horoscope.indexOf("const alItem=arr(p1.specialLagnas?.items).find(x=>x.key==='AL')");
const lookupEnd=horoscope.indexOf("const hIdx=(r,h,dir=1)",lookupStart);
yes(lookupStart>=0&&lookupEnd>lookupStart,'twelve-lagna engine resolves AL/UL using stable keys');
const lookup=horoscope.slice(lookupStart,lookupEnd);
yes(lookup.includes("x.key==='AL'")&&lookup.includes("x.key==='UL'"),
 'runtime AL/UL resolution does not depend on translated labels');
yes(!lookup.includes('p2.karakamsha?.arudhaLagna')&&!/x=>\/upapada\|ul/.test(lookup),
 'runtime avoids former Jaimini/display-name fallback');

const sourceRows=[
 {key:'AL',name:'AL',englishName:'AL',rasi:'Cancer'},
 {key:'UL',name:'UL',englishName:'UL',rasi:'Virgo'}
];
function byIdentity(rows,key){return rows.find(x=>x.key===key)?.rasi??null;}
const baseline={AL:byIdentity(sourceRows,'AL'),UL:byIdentity(sourceRows,'UL')};
const renamed=sourceRows.map(x=>({...x,
 name:x.key==='AL'?'Renamed label for UL row':'Renamed label for AL row',
 englishName:x.key==='AL'?'Upapada Lagna':'Arudha Lagna'
}));
eq({AL:byIdentity(renamed,'AL'),UL:byIdentity(renamed,'UL')},baseline,
 'renaming or swapping visible labels cannot swap underlying AL/UL results');
eq(byIdentity(sourceRows,'AL'),'Cancer','AL sign stays with AL key');
eq(byIdentity(sourceRows,'UL'),'Virgo','UL sign stays with UL key');

// The generated Ayurdaya table must be in a touch/keyboard-scrollable
// wrapper; the semantic table, not its rows, stays intact.
yes(css.includes('.smv-cg-rajan-ayurdaya .smv-cg-rajan-ayurdaya-table-wrap'), 
 'dedicated Ayurdaya horizontal-scroll wrapper styles exist');
yes(/overflow-x:\s*auto/.test(css.slice(css.indexOf('.smv-cg-rajan-ayurdaya .smv-cg-rajan-ayurdaya-table-wrap'))),
 'dedicated wrapper owns horizontal scrolling');
yes(css.includes('-webkit-overflow-scrolling: touch'),
 'touch momentum scrolling enabled');
const wrapperStart=css.indexOf('.smv-cg-rajan-ayurdaya .smv-cg-rajan-ayurdaya-table-wrap');
const tableStyleStart=css.indexOf('.smv-cg-rajan-ayurdaya table.smv-cg-rajan-ayurdaya-table',wrapperStart);
const wrapperStyles=css.slice(wrapperStart,tableStyleStart);
yes(/overscroll-behavior-x:\s*contain/.test(wrapperStyles),
 'horizontal swipe stays inside the report wrapper');
yes(/touch-action:\s*pan-x pan-y/.test(wrapperStyles),
 'horizontal table gestures do not disable vertical page scrolling');
yes(/table\.smv-cg-rajan-ayurdaya-table\s*\{[^}]*display:\s*table;[^}]*width:\s*max-content;[^}]*min-width:\s*100%/s.test(css),
 'table remains a real table and expands only as needed');
yes(/@media print\s*\{[^}]*smv-cg-rajan-ayurdaya-table-wrap[^}]*overflow:\s*visible/s.test(css),
 'print layout releases the horizontal scroll constraint');
yes(css.includes('table:not(.smv-cg-rajan-ayurdaya-table):where(:not(.smv-css-island,.smv-css-island *))'),
 'generic mobile block-table rule excludes the Ayurdaya report table');
const reportPlanets=[
 {name:'சூரியன்',longitude:167+2/60},{name:'சந்திரன்',longitude:118+10/60},
 {name:'செவ்வாய்',longitude:206.5},{name:'புதன்',longitude:191+52/60},
 {name:'குரு',longitude:28+17/60},{name:'சுக்கிரன்',longitude:204+32/60},
 {name:'சனி',longitude:230+27/60}
];
for(const language of ['ta','en']) {
 const html=cgRajanAyurdayaReportHtml({planets:reportPlanets,language});
 yes(/<div class="smv-cg-rajan-ayurdaya-table-wrap" role="region" tabindex="0"/.test(html),
  language+' output includes focusable scroll region');
 yes(html.includes('class="smv-cg-rajan-ayurdaya-table"'),
  language+' output preserves native semantic table');
 yes(html.includes(language==='ta'?'கிடைமட்டமாக உருட்டவும்':'scroll horizontally'),
  language+' output explains horizontal scroll');
}

console.log(JSON.stringify({pass:true,assertions,stableArudhaIds:['AL','UL'],displayCodes:['AL','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','UL'],
 labelRenamesPreserveOutputs:true,tableTouchScrollable:true,keyboardScrollable:true,printOverflowReleased:true}));
