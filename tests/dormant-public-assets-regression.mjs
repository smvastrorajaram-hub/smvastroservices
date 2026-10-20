/* Deployment guard for retired public backend/prediction duplicates. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const url=p=>new URL('../'+p,import.meta.url);
const retired=[
 'public/horoscope/server.js',
 'public/horoscope/horoscope-predictions.js'
];
for(const path of retired)ok(!fs.existsSync(url(path)),'Retired static deployment file is absent: '+path);
ok(fs.existsSync(url('server.js')),'The required root backend server remains present');
const pkg=JSON.parse(fs.readFileSync(url('package.json'),'utf8'));
ok(pkg.scripts?.start==='node server.js','Production backend still starts from root server.js');
const html=fs.readFileSync(url('public/horoscope/index.html'),'utf8');
ok(!/src=["'][^"']*horoscope-predictions\.js/i.test(html),'Horoscope HTML has no retired predictions script consumer');
ok(!/src=["'][^"']*server\.js/i.test(html),'Horoscope HTML does not expose/load a backend implementation');
for(const path of ['tests/cg-rajan-ayurdaya-save-pdf-integration-guard.mjs','tests/cg-rajan-ayurdaya-advanced-part-i-placement-qa.mjs']){
 const source=fs.readFileSync(url(path),'utf8');
 ok(source.includes("existsSync(new URL('../public/horoscope/horoscope-predictions.js'"),'Existing regression explicitly protects cleanup: '+path);
}
console.log(JSON.stringify({pass:true,checks,retired,rootServerPreserved:true}));
