import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const bytes=file=>fs.readFileSync(path.join(root,file));
const res='smvastroproduction/src/main/res';
const maxBytes=300000;

function jpegDimensions(data,file){
  assert.deepEqual([...data.subarray(0,3)],[0xFF,0xD8,0xFF],file+' must be JPEG');
  let offset=2;
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

test('SMV ASTRO Android launcher source is the exact user-uploaded ICON file and stays separate from PWA assets',()=>{
  const sourcePath='ICON/SMV ASTRO.jpg';
  const source=bytes(sourcePath);
  assert.deepEqual(jpegDimensions(source,sourcePath),{width:1024,height:1024});
  const script=read('prepare-smv-astro-production-icon.sh');
  assert.ok(script.includes('source_icon="ICON/SMV ASTRO.jpg"'));
  assert.ok(script.includes('SmvProductLauncherIconGenerator'));
  assert.ok(!script.includes('public/assets/'));
  const workflow=read('.github/workflows/build-smv-astro-production-apk.yml');
  for(const marker of ['ICON/SMV ASTRO.jpg','tools/SmvProductLauncherIconGenerator.java','test/android-launcher-icon.test.mjs']){
    assert.ok(workflow.includes(marker),'ASTRO build trigger must include '+marker);
  }
});

test('SMV ASTRO manifest retains the existing package label and launcher resource names',()=>{
  const manifest=read('smvastroproduction/src/main/AndroidManifest.xml');
  assert.ok(manifest.includes('android:icon="@mipmap/ic_launcher"'));
  assert.ok(manifest.includes('android:roundIcon="@mipmap/ic_launcher_round"'));
  assert.ok(manifest.includes('android:label="@string/app_name"'));
});

test('SMV ASTRO generated square, round and adaptive artwork is JPEG and each file is below 300 KB',()=>{
  const outputs=[
    [res+'/mipmap-nodpi/ic_launcher.jpg',512],
    [res+'/mipmap-nodpi/ic_launcher_round.jpg',512],
    [res+'/drawable-nodpi/ic_launcher_foreground.jpg',432]
  ];
  for(const [file,size] of outputs){
    const image=bytes(file);
    assert.ok(image.length>1000,file+' must not be empty');
    assert.ok(image.length<=maxBytes,file+' must be at most 300,000 bytes');
    assert.deepEqual(jpegDimensions(image,file),{width:size,height:size});
  }
});

test('SMV ASTRO adaptive XML keeps the white background and foreground file reference',()=>{
  for(const name of ['ic_launcher','ic_launcher_round']){
    const xml=read(res+'/mipmap-anydpi-v26/'+name+'.xml');
    assert.ok(xml.includes('@color/smv_launcher_background'));
    assert.ok(xml.includes('@drawable/ic_launcher_foreground'));
  }
  assert.ok(read(res+'/values/colors.xml').includes('<color name="smv_launcher_background">#FFFFFF</color>'));
});
