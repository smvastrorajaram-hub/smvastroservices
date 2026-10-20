/* CSS owner merge + PWA icon identity regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const url=p=>new URL('../'+p,import.meta.url);
const horoscopeHtml=fs.readFileSync(url('public/horoscope/index.html'),'utf8');
const geometry=fs.readFileSync(url('public/horoscope/v358-result-layout.css'),'utf8');
const printCss=fs.readFileSync(url('public/horoscope/report-print.css'),'utf8');
ok(horoscopeHtml.includes('v358-result-layout.css'),'Horoscope loads the consolidated geometry stylesheet');
ok(!horoscopeHtml.includes('v359-symmetric-gutters.css'),'Retired second geometry stylesheet is not separately loaded');
ok(!fs.existsSync(url('public/horoscope/v359-symmetric-gutters.css')),'Old geometry stylesheet is removed from deployment');
ok(geometry.includes('main > #smvMarriageMatching')&&geometry.includes('padding-inline:6px!important'),
 'Migrated symmetric-gutter rules are owned by v358');
ok(fs.existsSync(url('tests/v358-result-layout-browser-smoke.mjs'))&&
   fs.existsSync(url('tests/v359-symmetric-gutters-browser-smoke.mjs')),
 'Chromium geometry smoke tests remain available after CSS owner merge');
ok(fs.existsSync(url('.github/workflows/horoscope-result-layout-browser-smoke.yml')),
 'Responsive browser smoke workflow remains enabled');
ok(printCss.includes('@page{size:A4')&&fs.existsSync(url('public/horoscope/report-print.js'))&&
   fs.existsSync(url('public/horoscope/report-print.html')),
 'Browser-native print/PDF styles and flow remain present');

const pwaPairs=[
 ['public/manifest.webmanifest','public/assets/icon-512.png','public/assets/icon-512-maskable.png'],
 ['public/horoscope/manifest-en.webmanifest','public/horoscope/assets/icon-512.png','public/horoscope/assets/icon-512-maskable.png'],
 ['public/horoscope/manifest-ta.webmanifest','public/horoscope/assets/icon-512.png','public/horoscope/assets/icon-512-maskable.png']
];
for(const [manifestPath,sharedPng,retiredPng] of pwaPairs){
 const manifest=JSON.parse(fs.readFileSync(url(manifestPath),'utf8'));
 const icons=manifest.icons.filter(icon=>icon.sizes==='512x512');
 const any=icons.find(icon=>String(icon.purpose).split(/\s+/).includes('any'));
 const mask=icons.find(icon=>String(icon.purpose).split(/\s+/).includes('maskable'));
 ok(!!any&&!!mask&&any.src===mask.src,'One identical 512px source serves any + maskable purposes in '+manifestPath);
 ok(fs.existsSync(url(sharedPng))&&!fs.existsSync(url(retiredPng)),'Duplicate maskable PNG is removed while shared icon remains: '+manifestPath);
}
console.log(JSON.stringify({pass:true,checks,cssOwner:'v358-result-layout.css',pwaIcons:'shared identical any/maskable PNG',printFlowPreserved:true}));
