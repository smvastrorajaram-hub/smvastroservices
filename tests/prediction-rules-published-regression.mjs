import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const eq=(actual,expected,message)=>{assert.equal(actual,expected,message);checks++;};
const staticSource=fs.readFileSync(new URL('../public/horoscope/prediction-rules-published.js',import.meta.url),'utf8');
const adminSource=fs.readFileSync(new URL('../public/horoscope/prediction-admin.mjs',import.meta.url),'utf8');
const syncSource=fs.readFileSync(new URL('../public/horoscope/prediction-rules-sync.mjs',import.meta.url),'utf8');
const staticContext={window:{}};
vm.runInNewContext(staticSource,staticContext,{timeout:5000});
const raw=staticContext.window.SMVPUBLISHED_PREDICTION_RULES;
ok(Array.isArray(raw)&&raw.length===24,'static offline fallback includes 24 versioned contextual rules');
eq(new Set(raw.map(rule=>rule.id)).size,24,'static rule IDs are unique');
ok(raw.every(rule=>rule.channel==='natal'&&rule.sourceSection==='I'&&rule.enabled===true&&
  rule.effect?.mode==='append'&&rule.effect.ta.trim()&&rule.effect.en.trim()),
  'each static rule is bilingual, enabled, natal-channel, source-gated and append-only');

globalThis.SMVPUBLISHED_PREDICTION_RULES=raw;
const E=require('../public/horoscope/prediction-rule-engine.js');
const normalized=E.normalizeRules(raw);
eq(normalized.length,24,'rule engine normalizes every published rule without dropping malformed entries');
ok(normalized.every(rule=>E.allowedField(rule.conditions[0].field)),
  'all house-lord evidence fields are allowed by the fail-closed field whitelist');
E.setPublishedRules(normalized);

const dusthanaFacts={'section.I.available':true,'house.1.lordHouse':8};
const dusthanaEn=E.run(E.getPublishedRules(),dusthanaFacts,'natal',1,'en');
const dusthanaTa=E.run(E.getPublishedRules(),dusthanaFacts,'natal',1,'ta');
eq(dusthanaEn.length,1,'dusthana placement triggers one contextual rule, not conflicting duplicates');
ok(dusthanaEn[0].text.includes('not a denial'),'English dusthana wording does not deny the house or promise a fatal outcome');
ok(dusthanaTa[0].text.includes('மறுப்பு'),'Tamil dusthana wording is present and non-fatalistic');
eq(E.run(E.getPublishedRules(),{'section.I.available':true,'house.1.lordHouse':10},'natal',1,'en').length,1,
  'Kendra/Trikona placement triggers the corresponding contextual modifier');
eq(E.run(E.getPublishedRules(),{'section.I.available':true,'house.1.lordHouse':3},'natal',1,'en').length,0,
  'unmatched house-lord placements add no rule text');
eq(E.run(E.getPublishedRules(),{'section.I.available':false,'house.1.lordHouse':8},'natal',1,'en').length,0,
  'unavailable Section I evidence blocks static contextual rules');

ok(adminSource.includes('if(!rules.length){status('),
  'Admin Publish explicitly blocks publishing an empty rule set');
ok(adminSource.includes('const baseline=E.getPublishedRules();')&&
   adminSource.includes('if(baseline.length)E.setLocalRules(baseline);'),
  'verified Admin login seeds an empty local Draft from the reviewed static/loaded rules without publishing them');
ok(adminSource.includes('Static fallback விதிகள் Draft-இல் தயாராக உள்ளன'),
  'Admin receives a clear status that the seeded fallback must be reviewed before publication');
ok(syncSource.includes('const staticFallback=')&&syncSource.includes('staticFallback();try{localStorage.removeItem(CACHE);}catch{}'),
  'missing/empty remote publication falls back to the version-controlled static rules');
ok(syncSource.includes('data.rules.length===0)return false'),
  'empty Firestore publications cannot overwrite the fallback rule set');
ok(syncSource.includes("if(e?.code==='permission-denied'){staticFallback();"),
  'permission-denied clears stale cache and restores static snapshot rather than pretending an empty list is a valid publication');

console.log(JSON.stringify({pass:true,checks,staticRules:raw.length,caseCoverage:[
 'normalization','unique IDs','Tamil/English append-only text','dusthana positive','Kendra/Trikona positive',
 'unmatched negative','section unavailable negative','empty admin publish blocker','empty remote fallback','permission-denied fallback'
]},null,2));
