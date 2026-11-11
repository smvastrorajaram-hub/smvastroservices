'use strict';
const fs = require('node:fs');
const path = require('node:path');
const SIZE=256, SCALE=2, HI=512;
const folder=path.basename(path.resolve(__dirname,'..'));
const calendar=folder.includes('calendar');
const filename=calendar?'smv-calendar.ico':'smv-horoscope.ico';
const base=calendar?[18,66,62]:[59,20,45];
const light=calendar?[25,92,82]:[91,33,59];
const gold=[225,188,119], pale=[255,239,204], paper=[250,244,226], ink=[70,34,53], accent=calendar?[91,132,105]:[180,116,79];
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v*(1-t)+b[i]*t));
const dist=(x,y,cx,cy)=>Math.hypot(x-cx,y-cy);
const line=(x,y,x1,y1,x2,y2,w)=>{const dx=x2-x1,dy=y2-y1,t=Math.max(0,Math.min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)));return dist(x,y,x1+t*dx,y1+t*dy)<=w/2};
const rounded=(x,y,l,t,r,b,rad)=>{const qx=Math.abs(x-(l+r)/2)-((r-l)/2-rad),qy=Math.abs(y-(t+b)/2)-((b-t)/2-rad);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)<=rad};
const roundedStroke=(x,y,l,t,r,b,rad,w)=>{const qx=Math.abs(x-(l+r)/2)-((r-l)/2-rad),qy=Math.abs(y-(t+b)/2)-((b-t)/2-rad),d=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0);return Math.abs(d-rad)<=w/2};
const star=(x,y,cx,cy,inner,outer)=>{const dx=x-cx,dy=y-cy,d=Math.hypot(dx,dy);let a=Math.atan2(dy,dx)+Math.PI/2;a=((a%(Math.PI/4))+Math.PI/4)%(Math.PI/4);const z=Math.abs(a-Math.PI/8),edge=outer-(outer-inner)*z/(Math.PI/8);return d<=edge};
function color(x,y){let c=mix(base,light,Math.max(0,1-dist(x,y,82,76)/300)*.72);if(roundedStroke(x,y,14,14,242,242,42,5))c=gold;if(roundedStroke(x,y,27,27,229,229,34,1.6))c=mix(c,pale,.35);
if(!calendar){const r=dist(x,y,128,128);if(r<92)c=mix(base,ink,.7);if(Math.abs(r-94)<2)c=gold;if(Math.abs(r-75)<1.2)c=pale;if(Math.abs(Math.abs(x-128)+Math.abs(y-128)-65)<2)c=gold;if(line(x,y,128,61,128,195,2)||line(x,y,61,128,195,128,2))c=gold;if(line(x,y,81,81,175,175,1.5)||line(x,y,175,81,81,175,1.5))c=mix(c,pale,.55);if(star(x,y,128,128,18,47))c=gold;if(r<7)c=pale;}
else{if(rounded(x,y,53,39,203,216,16))c=paper;if(roundedStroke(x,y,53,39,203,216,16,4))c=gold;if(rounded(x,y,56,42,200,87,12))c=ink;if(line(x,y,56,90,200,90,2))c=gold;if(line(x,y,83,28,83,62,5)||line(x,y,173,28,173,62,5))c=gold;if(dist(x,y,83,32)<7||dist(x,y,173,32)<7)c=pale;if(line(x,y,72,113,184,113,1.4)||line(x,y,72,145,184,145,1.4)||line(x,y,72,177,184,177,1.4)||line(x,y,110,101,110,194,1.4)||line(x,y,147,101,147,194,1.4))c=mix(ink,paper,.65);for(const [cx,cy] of [[91,128],[128,128],[166,128],[91,160],[128,160],[166,160],[91,192],[128,192],[166,192]])if(dist(x,y,cx,cy)<5)c=accent;if(star(x,y,128,70,4,12))c=gold;}
return c;}
function bitmap(){const hi=Buffer.alloc(HI*HI*4);for(let y=0;y<HI;y++)for(let x=0;x<HI;x++){const c=color((x+.5)/SCALE,(y+.5)/SCALE),i=(y*HI+x)*4;hi[i]=c[2];hi[i+1]=c[1];hi[i+2]=c[0];hi[i+3]=255;}const p=Buffer.alloc(SIZE*SIZE*4);for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const o=((SIZE-1-y)*SIZE+x)*4;let b=0,g=0,r=0;for(let yy=0;yy<2;yy++)for(let xx=0;xx<2;xx++){const i=(((y*2+yy)*HI)+x*2+xx)*4;b+=hi[i];g+=hi[i+1];r+=hi[i+2];}p[o]=Math.round(b/4);p[o+1]=Math.round(g/4);p[o+2]=Math.round(r/4);p[o+3]=255;}return p;}
function ico(){const pixels=bitmap(),mask=Buffer.alloc(32*256),dib=Buffer.alloc(40+pixels.length+mask.length);dib.writeUInt32LE(40,0);dib.writeInt32LE(256,4);dib.writeInt32LE(512,8);dib.writeUInt16LE(1,12);dib.writeUInt16LE(32,14);dib.writeUInt32LE(pixels.length+mask.length,20);pixels.copy(dib,40);mask.copy(dib,40+pixels.length);const h=Buffer.alloc(22);h.writeUInt16LE(1,2);h.writeUInt16LE(1,4);h.writeUInt16LE(1,10);h.writeUInt16LE(32,12);h.writeUInt32LE(dib.length,14);h.writeUInt32LE(22,18);return Buffer.concat([h,dib]);}
const assets=path.resolve(__dirname,'..','assets');fs.mkdirSync(assets,{recursive:true});const bytes=ico();fs.writeFileSync(path.join(assets,filename),bytes);process.stdout.write('Generated '+filename+' 256x256 ('+bytes.length+' bytes)\\n');