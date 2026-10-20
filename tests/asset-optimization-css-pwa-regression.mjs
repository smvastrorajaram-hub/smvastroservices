/* CSS owner merge + PWA icon identity regression. */
import assert from 'node:assert/strict';
import fs from 'node:fs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const url=p=>new URL('../'+p,import.meta.url);
const horoscopeHtml=fs.readFileSync(url('public/horoscope/index.html'),'utf8');
const geometry=fs.readFileSync(url('public/horoscope/v358-result-layout.css'),'utf8');
const printCss=fs.readFileSync(url('public/horoscope/report-print.css'),'utf8');
const horoscopeFavicon=fs.readFileSync(url('public/horoscope/assets/icon-192.png'));
ok(horoscopeHtml.includes('<link rel="icon" href="assets/icon-192.png" sizes="192x192" type="image/png">'),
 'Horoscope favicon points to the actual PNG app icon rather than the JPEG-encoded smvlogo.png file');
ok(horoscopeFavicon.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) &&
   horoscopeFavicon.readUInt32BE(16)===192 && horoscopeFavicon.readUInt32BE(20)===192,
 'The Horoscope favicon asset is a valid 192x192 PNG, matching its declared media type and size');
ok(horoscopeHtml.includes('v358-result-layout.css'),'Horoscope loads the consolidated geometry stylesheet');
ok(!horoscopeHtml.includes('v359-symmetric-gutters.css'),'Retired second geometry stylesheet is not separately loaded');
ok(!fs.existsSync(url('public/horoscope/v359-symmetric-gutters.css')),'Old geometry stylesheet is removed from deployment');
ok(geometry.includes('main > #smvMarriageMatching')&&geometry.includes('padding:clamp(8px,1.3vw,16px) 6px!important'),
 'The matching host owns its horizontal gutter in the original frame declaration');
ok(!geometry.includes('/* V359 symmetric-gutter rules consolidated under the result-layout stylesheet owner. */')&&
   !geometry.includes('padding-inline:6px!important'),
 'The second symmetric-gutter override block is removed rather than stacked at the end');
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
