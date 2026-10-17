/**
 * Independent PRINTED numeric example (not a generated birth chart).
 * C.G. Rajan, Jathaka Kanitham, Part I, printed p. 50 / PDF p. 72.
 * User-supplied scan: 320 pages; no OCR, and no Ayurdaya/Prediction imported.
 * Source arithmetic test ONLY, not five-natal or full Shadbala certification.
 */
import assert from 'node:assert/strict';
const names=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn'];
const printed={
 sthana:[227,479,333,373,420,323,303],
 kala:[133,67,113,227,287,87,263],
 ayana:[42,23,12,83,85,12,94],
 naisargika:[100,86,29,43,57,71,14],
 dig:[60,13,38,96,13,60,26],
 cheshta:[42,27,55,87,85,59,58],
 preDrig:[604,695,580,909,947,612,758],
 drig:[11,6,40,24,4,37,29],
 afterDrig:[615,701,620,933,951,649,787],
 // Printed Yuddha row says Mars 10, yet printed FINAL still equals 620.
 yuddha:[0,0,10,0,0,0,0],
 final:[615,701,620,933,951,649,787]
};
let assertions=0;
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);assertions++};
const sum=(fields,i)=>fields.reduce((a,f)=>a+printed[f][i],0);
for(let i=0;i<names.length;i++){
 eq(sum(['sthana','kala','ayana','naisargika','dig','cheshta'],i),
    printed.preDrig[i],names[i]+' printed six-bala subtotal');
 eq(printed.preDrig[i]+printed.drig[i],printed.afterDrig[i],
    names[i]+' printed subtotal after Drig');
 eq(printed.afterDrig[i],printed.final[i],
    names[i]+' printed FINAL before Yuddha ambiguity');
}
const conflicts=names.flatMap((name,i)=>printed.yuddha[i] &&
 printed.afterDrig[i]+printed.yuddha[i]!==printed.final[i]?
 [{planet:name,printedYuddha:printed.yuddha[i],
   sumIfAdded:printed.afterDrig[i]+printed.yuddha[i],printedFinal:printed.final[i]}]:[]);
eq(conflicts.length,1,'one explicitly unresolved printed Yuddha arithmetic difference');
eq(conflicts[0].planet,'Mars','Mars conflict is not silently corrected');
console.log(JSON.stringify({
 pass:true,assertions,source:'C.G. Rajan Jathaka Kanitham I print p50 PDF p72',
 grahas:7,printedFinalVirupa:printed.final,unresolvedYuddha:conflicts,
 printedTableArithmeticPass:true,fullNatalShadbalaCertified:false,
 ayurdayaIntegrated:false,predictionIntegrated:false
}));
