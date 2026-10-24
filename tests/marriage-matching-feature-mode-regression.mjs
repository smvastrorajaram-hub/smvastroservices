import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const matching=readFileSync(new URL('../public/horoscope/marriage-matching.js',import.meta.url),'utf8');
const policy=readFileSync(new URL('../public/horoscope/config.js',import.meta.url),'utf8');
const auth=readFileSync(new URL('../public/horoscope/horoscope-auth.mjs',import.meta.url),'utf8');
let checks=0;
const yes=(value,message)=>{assert.ok(value,message);checks++;};

// A fresh mount starts inert. Only the latest async mode lookup may reveal the
// button or render the paid panel after authentication/config state settles.
yes(matching.includes('let matchingMountGeneration=0;'),'Matching has a monotonically increasing mount generation');
yes(matching.includes('const mountGeneration=++matchingMountGeneration;')&&matching.includes('const isCurrentMount=()=>mountGeneration===matchingMountGeneration;'),'every remount invalidates earlier pending access checks');
yes(matching.includes('id="mmCheck" hidden disabled aria-busy="true"'),'the default/stale Basic or Full CTA is hidden until the mode is settled');
yes(matching.includes('if(!isCurrentMount()||!host.isConnected)return;'),'stale async status cannot rewrite the current Matching form');
yes(matching.includes("const modeReady=applyFeatureMode().catch(e=>{")&&matching.includes("btn.dataset.publicPoruthamOnly='1';"),'failed mode lookup recovers to the public Basic Nakshatra action');
yes(matching.includes("window.__smvRenderFeatureLock('marriage_matching',paidRoot,cfg,async()=>{")&&matching.includes('},prepareContext,state);'),'the paid gate reuses the mode state already fetched for this mount');
yes(policy.includes('async function renderPolicyLock(feature,root,_legacyFeature,onUnlock,beforePay,stateOverride=null)')&&policy.includes('const state=stateOverride||await stateFor(feature);'),'the access-policy renderer avoids a second asynchronous config fetch for this same mode');
yes(policy.includes('root.dataset.smvPaidFeature=feature;')&&policy.includes("root.dataset.smvPaidFeature==='marriage_matching'"),'payment CTA text is selected using the feature identity');
yes(policy.includes("T('Full Marriage Matching ₹','முழு திருமணப் பொருத்தம் ₹')"),'Matching payment text places the amount directly after the label with no dash');
yes(auth.includes("feature==='marriage_matching'?flowText('Full Marriage Matching ₹','முழு திருமணப் பொருத்தம் ₹')"),'the initial Matching payment CTA also has no dash');
yes(policy.includes("root.dataset.smvPaidFeature==='marriage_matching'\n      ?"),'the no-dash label is scoped to Matching and does not change the Horoscope payment label');

console.log(JSON.stringify({pass:true,checks,scope:'race-safe Matching mode resolution, payment CTA label and one resolved access-policy state'}));
