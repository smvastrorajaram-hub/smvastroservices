/* Shared SMV prediction rules: lazy single Firestore GET on first calculation
 * or verified admin entry. NO background reads for homepage visitors,
 * MutationObservers, polling, listeners, language-switch reads or recalculation.
 * Customer reports see ONLY admin-published global rules; local drafts ignored.
 * Existing smv_content security: public reads published:true, writes admin-only.
 * Static approved JS and last-fetched cache remain available offline.
 */
const E=window.SMVPredictionRules;
const FIREBASE_CONFIG={apiKey:'AIzaSyCKXyfZ9sjGmej7ygxHpzHNcNysMXHuvSs',authDomain:(location.hostname==='smvastroservices.pages.dev'||location.hostname.endsWith('.smvastroservices.pages.dev')?'smv-astro.firebaseapp.com':'auth.smvastroservices.in'),projectId:'smv-astro',storageBucket:'smv-astro.firebasestorage.app',messagingSenderId:'299081899217',appId:'1:299081899217:web:8d558df08e86037ea539f0'};
const COLLECTION='smv_content',DOC_ID='prediction_rules_v1',CACHE='smv-global-prediction-rules-cache-v1';
let settled=false,initial=null;
const staticFallback=()=>{
 const rules=E?.normalizeRules(window.SMVPUBLISHED_PREDICTION_RULES||[])||[];
 E?.setPublishedRules(rules);
 return rules.length;
};
const cached=()=>{try{const c=JSON.parse(localStorage.getItem(CACHE)||'null');if(c?.published===true&&c?.schemaVersion===1&&Array.isArray(c.rules)&&c.rules.length>0){const parsed=E?.normalizeRules(c.rules);if(parsed?.length===c.rules.length&&parsed.length>0)E.setPublishedRules(parsed);else localStorage.removeItem(CACHE);}else if(c?.published===true&&Array.isArray(c.rules)&&c.rules.length===0)localStorage.removeItem(CACHE);}catch{}};
cached();
export function acceptPublished(data,rebroadcast=true){
 if(!E||data?.published!==true||data?.schemaVersion!==1||!Array.isArray(data.rules)||data.rules.length===0)return false;
 const accepted=E.normalizeRules(data.rules);
 if(accepted.length!==data.rules.length)return false;
 E.setPublishedRules(accepted);
 try{localStorage.setItem(CACHE,JSON.stringify({published:true,schemaVersion:1,rules:accepted,updatedAt:Date.now()}));}catch{}
 if(rebroadcast)try{const ch=new BroadcastChannel('smv-published-prediction-rules');ch.postMessage({kind:'updated',rules:accepted});ch.close();}catch{}
 return true;
}
try{const ch=new BroadcastChannel('smv-published-prediction-rules');ch.onmessage=e=>{if(e.data?.kind==='updated'&&Array.isArray(e.data.rules))acceptPublished({published:true,schemaVersion:1,rules:e.data.rules},false);};}catch{}
async function fetchPublished(){
 try{
  const [{getApps,initializeApp},{getFirestore,doc,getDocFromServer}]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js')
  ]);
  const app=getApps().find(x=>x.name==='smv-prediction-rules-public')||initializeApp(FIREBASE_CONFIG,'smv-prediction-rules-public');
  const snap=await getDocFromServer(doc(getFirestore(app),COLLECTION,DOC_ID));
  if(snap.exists()&&snap.data()?.published===true&&acceptPublished(snap.data()))return;
  // Missing, empty or malformed publication falls back to the version-controlled
  // static snapshot. Do not silently replace a non-empty reviewed baseline with [].
  staticFallback();try{localStorage.removeItem(CACHE);}catch{}
 }catch(e){
  // Permission denied means this document is not currently public. Never
  // continue using an obsolete cached rule list as though still published.
  if(e?.code==='permission-denied'){staticFallback();try{localStorage.removeItem(CACHE);}catch{}}
  console.info('SMV prediction rules: offline/static fallback',e?.code||e?.message||'unavailable');
 }
}
function ensureReady(){
 if(initial)return initial;
 if(typeof navigator!=='undefined'&&navigator.onLine===false){settled=true;initial=Promise.resolve();return initial;}
 let timeoutId;
 const timeout=new Promise(resolve=>{timeoutId=setTimeout(resolve,4500);});
 initial=Promise.race([fetchPublished(),timeout]).finally(()=>{clearTimeout(timeoutId);settled=true;});
 return initial;
}
window.SMVPredictionRulesSync=Object.freeze({acceptPublished,ensureReady});
// No visitor Firestore read occurs until they actually request a fresh report.
// Hold exactly the first English/Tamil/Matching calculation click until its
// published rule set is ready (or offline/timeout fallback is chosen).
document.addEventListener('click',event=>{
 const button=event.target?.closest?.('#generateEnglishHoroscope,#generateTamilHoroscope,#mmCheck');
 if(!button||settled)return;
 event.preventDefault();event.stopImmediatePropagation();
 ensureReady().then(()=>{if(button.isConnected)button.click();});
},true);
