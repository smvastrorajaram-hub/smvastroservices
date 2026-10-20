// V358: non-destructive live-page layout source regression.
// Visual correctness still requires mobile/browser acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('public/horoscope/v358-result-layout.css');
const html=read('public/horoscope/index.html');
const matching=read('public/horoscope/marriage-matching.js');
const print=read('public/horoscope/report-print.html');
let n=0;
const ok=(test,message)=>{assert.ok(test,message);n++};
ok(html.includes('<link rel="stylesheet" href="v358-result-layout.css">'),'V358 browser CSS loaded');
ok(html.indexOf('v358-result-layout.css')>html.indexOf('smv-ui.css'),'Scoped result layout after base UI styles');
ok(css.includes('@media screen{'),'V358 uses screen-only styles');
ok(!css.includes('@media print')&&!print.includes('v358-result-layout.css'),'PDF print layout and covers untouched');
for(const id of ['#smvMarriageMatching','#englishHoroscopeResult','#tamilHoroscopeResult'])ok(css.includes(id),'Result host covered: '+id);
for(const selector of ['#mmNakshatraGate>.mm-person-result.mm-benefits','.mm-full-results','.mm-v281-results','.smv-advanced-part','.adv-section','.mm-base-scroll'])ok(css.includes(selector),'Expected layer/scroll selector present '+selector);
ok(matching.includes('<section class="mm-person-result mm-benefits">'), 'Matching Nakshatra benefits remain within main host, no content deleted');
ok(css.includes('1180px')&&css.includes('calc(100% - 12px)'),'Matches Horoscope input outer width with narrow phone margins');
ok(css.includes('background:transparent!important')&&css.includes('border:0!important'),'Nested visual boxes removed');
ok(!/\\boverflow(?:-[a-z]+)?\\s*:\\s*(?:hidden|clip)\\b/i.test(css)&&css.includes('overflow-wrap:break-word;'),'Avoid clipping charts/tables while retaining safe wrapping for long prose');
ok(html.includes('id="englishHoroscopeResult"')&&html.includes('id="tamilHoroscopeResult"')&&html.includes('id="smvMarriageMatching"'),'Original output placeholders unchanged');
for(const token of ['report-identity.js','report-store.mjs','horoscope.js','marriage-matching.js'])ok(html.includes(token),'Existing report/save/matching scripts preserved: '+token);
console.log(JSON.stringify({pass:true,assertions:n,scope:'Live screen geometry structural invariants; not a browser pixel comparison',printUnaffected:true}));
