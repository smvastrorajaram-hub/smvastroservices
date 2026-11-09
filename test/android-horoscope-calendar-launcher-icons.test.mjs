import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const bytes=file=>fs.readFileSync(path.join(root,file));
const maxBytes=300000;

function jpegDimensions(data,file){
 let offset=2;
 assert.deepEqual([...data.subarray(0,3)],[0xFF,0xD8,0xFF],file+' must be JPEG');
 while(offset<data.length-9){
  if(data[offset]!==0xFF){offset++;continue;}
  while(data[offset]===0xFF)offset++;
  const marker=data[offset++];
  if(marker===0xD8||marker===0xD9||(marker>=0xD0&&marker<=0xD7))continue;
  if(offset+2>data.length)break;
  const length=data.readUInt16BE(offset);
  if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
   return {height:data.readUInt16BE(offset+3),width:data.readUInt16BE(offset+5)};
  }
  if(length<2)break;
  offset+=length;
 }
 assert.fail(file+' must contain a readable JPEG frame header');
}
function assertJpeg(file){
 const data=bytes(file);
 const dimensions=jpegDimensions(data,file);
 assert.ok(dimensions.width>=512 && dimensions.width===dimensions.height,file+' must be square and at least 512px');
 assert.ok(data.length>1000,file+' must contain real image data');
}

test('HOROSCOPE and CALENDAR production launchers use their own module-local square master artwork',()=>{
 assertJpeg('smvhoroscopeproduction/launcher/icon-master.jpg');
 assertJpeg('smvcalendarproduction/launcher/icon-master.jpg');
 const script=read('prepare-smv-horoscope-calendar-production-icons.sh');
 assert.ok(script.includes('smvhoroscopeproduction/launcher/icon-master.jpg'));
 assert.ok(script.includes('smvcalendarproduction/launcher/icon-master.jpg'));
 assert.ok(script.includes('copy_product_icon "smvhoroscopeproduction/launcher/icon-master.jpg" smvhoroscopeproduction'));
 assert.ok(script.includes('copy_product_icon "smvcalendarproduction/launcher/icon-master.jpg" smvcalendarproduction'));
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
 for(const marker of ['smvhoroscopeproduction/launcher/icon-master.jpg','smvcalendarproduction/launcher/icon-master.jpg','tools/SmvProductLauncherIconGenerator.java']){
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
