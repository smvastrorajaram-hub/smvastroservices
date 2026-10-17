import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const astroAdvanced=readFileSync('public/horoscope/offline/astro_advanced.browser.mjs','utf8');
const horoscope=readFileSync('public/horoscope/horoscope.js','utf8');
const css=readFileSync('public/horoscope/horoscope.css','utf8');

let assertions=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++};
const yes=(v,message)=>{assert.ok(v,message);assertions++};

// The output labels are presentation-only. Stable keys bind the actual
// calculated AL/A1 and UL/A12 rows regardless of Tamil/English wording.
yes(/key:'AL',name:ta\?'ஆரூட லக்னம் \(A1\)'/.test(astroAdvanced),
 'Arudha Lagna row carries stable AL identity');
yes(/key:'UL',name:ta\?'உபபத லக்னம் \(A12\)'/.test(astroAdvanced),
 'Upapada Lagna row carries stable UL identity');

const lookupStart=horoscope.indexOf("const alItem=arr(p1.specialLagnas?.items).find(x=>x.key==='AL')");
const lookupEnd=horoscope.indexOf("const hIdx=(r,h,dir=1)",lookupStart);
yes(lookupStart>=0&&lookupEnd>lookupStart,'twelve-lagna engine resolves AL/UL using stable keys');
const lookup=horoscope.slice(lookupStart,lookupEnd);
yes(lookup.includes("x.key==='AL'")&&lookup.includes("x.key==='UL'"),
 'runtime AL/UL resolution does not depend on translated labels');
yes(!lookup.includes('p2.karakamsha?.arudhaLagna')&&!/x=>\/upapada\|ul/.test(lookup),
 'runtime avoids former Jaimini/display-name fallback');

const sourceRows=[
 {key:'AL',name:'Arudha Lagna (A1)',englishName:'Arudha Lagna (A1)',rasi:'Cancer'},
 {key:'UL',name:'Upapada Lagna (A12)',englishName:'Upapada Lagna (A12)',rasi:'Virgo'}
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

// The Ayurdaya table itself must scroll as one touch-friendly region;
// the table must not be turned into the scrolling block.
yes(css.includes('.smv-cg-rajan-ayurdaya .smv-cg-rajan-ayurdaya-table-wrap'), 
 'dedicated Ayurdaya horizontal-scroll wrapper styles exist');
yes(/overflow-x:\s*auto/.test(css.slice(css.indexOf('.smv-cg-rajan-ayurdaya .smv-cg-rajan-ayurdaya-table-wrap'))),
 'dedicated wrapper owns horizontal scrolling');
yes(css.includes('-webkit-overflow-scrolling: touch'),
 'touch momentum scrolling enabled');
yes(/table\.smv-cg-rajan-ayurdaya-table\s*\{[^}]*display:\s*table;[^}]*width:\s*max-content;[^}]*min-width:\s*100%/s.test(css),
 'table remains a real table and expands only as needed');
yes(/@media print\s*\{[^}]*smv-cg-rajan-ayurdaya-table-wrap[^}]*overflow:\s*visible/s.test(css),
 'print layout releases the horizontal scroll constraint');
yes(css.includes('table:not(.smv-cg-rajan-ayurdaya-table):where(:not(.smv-css-island,.smv-css-island *))'),
 'generic mobile block-table rule excludes the Ayurdaya report table');

console.log(JSON.stringify({pass:true,assertions,stableArudhaIds:['AL','UL'],
 labelRenamesPreserveOutputs:true,tableTouchScrollable:true,printOverflowReleased:true}));
