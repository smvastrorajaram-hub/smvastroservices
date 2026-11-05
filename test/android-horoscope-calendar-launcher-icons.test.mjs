import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const bytes=file=>fs.readFileSync(path.join(root,file));
const maxBytes=300000;

function assertJpeg(file){
 const data=bytes(file);
 assert.deepEqual([...data.subarray(0,3)],[0xFF,0xD8,0xFF],file+' must be a valid JPEG');
 assert.ok(data.length>1000,file+' must contain real image data');
}

test('HOROSCOPE and CALENDAR production launchers use their individual uploaded ICON assets',()=>{
 assertJpeg('ICON/SMV HOROSCOPE.jpg');
 assertJpeg('ICON/SMV CALENDAR.jpg');
 const script=read('prepare-smv-horoscope-calendar-production-icons.sh');
 assert.ok(script.includes('ICON/SMV HOROSCOPE.jpg'));
 assert.ok(script.includes('ICON/SMV CALENDAR.jpg'));
 assert.ok(script.includes('copy_product_icon "ICON/SMV HOROSCOPE.jpg" smvhoroscopeproduction'));
 assert.ok(script.includes('copy_product_icon "ICON/SMV CALENDAR.jpg" smvcalendarproduction'));
 assert.ok(script.includes('SmvProductLauncherIconGenerator'));
 assert.ok(!script.includes('public/horoscope/'));
 assert.match(script,/size > 300000/);
});

test('All three apps use the shared 512px/432px launcher generator and strict 300 KB output cap',()=>{
 const generator=read('tools/SmvProductLauncherIconGenerator.java');
 for(const marker of ['ADAPTIVE_CANVAS = 432','ADAPTIVE_ART_SIZE = 232','LEGACY_CANVAS = 512','LEGACY_ART_SIZE = 275','MAX_ASSET_BYTES = 300000','writeJpegUnderLimit','#FFFFFF']){
  assert.ok(generator.includes(marker),'shared generator must contain '+marker);
 }
 assert.ok(generator.includes('ic_launcher_foreground.jpg'));
 assert.ok(generator.includes('ic_launcher_round.jpg'));
 assert.ok(generator.includes('300,000 bytes'));
 const workflow=read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
 for(const marker of ['ICON/SMV HOROSCOPE.jpg','ICON/SMV CALENDAR.jpg','tools/SmvProductLauncherIconGenerator.java']){
  assert.ok(workflow.includes(marker),'H/C workflow trigger must include '+marker);
 }
});

test('Production manifests preserve the existing icon resource names',()=>{
 for(const module of ['smvhoroscopeproduction','smvcalendarproduction']){
  const manifest=read(module+'/src/main/AndroidManifest.xml');
  assert.ok(manifest.includes('android:icon="@mipmap/ic_launcher"'));
  assert.ok(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
 }
});
