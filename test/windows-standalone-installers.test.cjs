'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const cases=[
 {folder:'desktop/horoscope-windows',name:'SMV HOROSCOPE',appId:'in.smvastroservices.horoscope.desktop',url:'https://horoscope.smvastroservices.in/',partition:'persist:smv-horoscope-windows',icon:'smv-horoscope.ico',artifact:'SMV-HOROSCOPE-Setup-${version}-${arch}.${ext}',forbidden:['https://smvastroservices.in/','https://calendar.smvastroservices.in/']},
 {folder:'desktop/calendar-windows',name:'SMV CALENDAR',appId:'in.smvastroservices.calendar.desktop',url:'https://calendar.smvastroservices.in/',partition:'persist:smv-calendar-windows',icon:'smv-calendar.ico',artifact:'SMV-CALENDAR-Setup-${version}-${arch}.${ext}',forbidden:['https://smvastroservices.in/','https://horoscope.smvastroservices.in/']}
];
for(const item of cases){
 const dir=path.join(root,item.folder);
 test(item.name+' has a unique app identity and installer name',()=>{
  const p=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));
  assert.equal(p.productName,item.name);assert.equal(p.build.appId,item.appId);
  assert.equal(p.build.win.artifactName,item.artifact);assert.equal(p.build.nsis.shortcutName,item.name);
  assert.deepEqual(p.build.win.target[0].arch,['x64']);assert.equal(p.scripts['dist:win'],'electron-builder --win nsis --x64');
 });
 test(item.name+' opens its own website only, with isolated Electron settings',()=>{
  const m=fs.readFileSync(path.join(dir,'main.cjs'),'utf8');
  assert.ok(m.includes(item.url));assert.ok(m.includes(item.partition));assert.match(m,/require\('electron'\)/);
  assert.match(m,/contextIsolation:\s*true/);assert.match(m,/nodeIntegration:\s*false/);assert.match(m,/sandbox:\s*true/);assert.match(m,/webSecurity:\s*true/);
  for(const other of item.forbidden)assert.ok(!m.includes(other),'unexpected website in '+item.name+': '+other);
 });
 test(item.name+' icon is a valid 256x256 Windows ICO',()=>{
  execFileSync(process.execPath,[path.join(dir,'scripts','prepare-icon.cjs')]);
  const ico=fs.readFileSync(path.join(dir,'assets',item.icon));
  assert.deepEqual([...ico.subarray(0,6)],[0,0,1,0,1,0]);assert.equal(ico.readUInt16LE(10),1);
  assert.equal(ico.readUInt16LE(12),32);assert.equal(ico.readUInt32LE(18),22);
  assert.equal(ico.readUInt32LE(22),40);assert.equal(ico.readInt32LE(26),256);assert.equal(ico.readInt32LE(30),512);
  assert.ok(ico.length>256*256*4);
 });
}
