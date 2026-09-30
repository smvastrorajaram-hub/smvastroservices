'use strict';
// @pdf-lib/fontkit's Tamil shaping path uses Babel generator helpers.
// Load the runtime before fontkit so Indic shaping works on Node/Render.
require('regenerator-runtime/runtime');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

const A4=[595.28,841.89], M={l:42,r:42,t:64,b:48};
const C={wine:rgb(.545,0,0),gold:rgb(.72,.565,.235),goldSoft:rgb(.86,.79,.62),cream:rgb(1,.992,.965),ink:rgb(.12,.12,.12),muted:rgb(.37,.35,.33),white:rgb(1,1,1)};
const clean=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/[Ø][=><?][^\s]{0,8}\s*/g,'').replace(/!\s*[’']/g,'→').replace(/%¶/g,'').replace(/^[\s•·|]+/,'').trim();
const tamil=v=>/[\u0B80-\u0BFF]/.test(String(v||''));

async function renderStructuredPdf({title='SMV ASTRO Report',language='en',text='',blocks=[],fontPath}){
 const pdf=await PDFDocument.create(); pdf.registerFontkit(fontkit);
 pdf.setTitle(title);pdf.setAuthor('SMV ASTRO SERVICES');pdf.setSubject('Astrology report');pdf.setCreator('SMV ASTRO pdf-lib renderer');
 const helv=await pdf.embedFont(StandardFonts.Helvetica), bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 let taFont=null;if(fontPath&&fs.existsSync(fontPath)){taFont=await pdf.embedFont(fs.readFileSync(fontPath),{subset:true});}
 const font=(s,b=false)=>tamil(s)&&taFont?taFont:(b?bold:helv);
 const width=(s,f,z)=>{try{return f.widthOfTextAtSize(String(s),z)}catch(_){return String(s).length*z*.52}};
 const splitLong=(word,f,z,max)=>{const out=[];let cur='';for(const ch of [...word]){if(cur&&width(cur+ch,f,z)>max){out.push(cur);cur=ch}else cur+=ch}if(cur)out.push(cur);return out};
 const wrap=(s,f,z,max)=>{s=clean(s);if(!s)return [''];const out=[];for(const para of s.split(/\n/)){let line='';for(let w of para.split(/\s+/)){let parts=width(w,f,z)>max?splitLong(w,f,z,max):[w];for(const p of parts){const q=line?line+' '+p:p;if(line&&width(q,f,z)>max){out.push(line);line=p}else line=q}}out.push(line)}return out.filter((x,i,a)=>x||i===a.length-1)};
 let page=null,y=0,pageNo=0,cover=true;
 const chrome=()=>{if(cover)return;page.drawLine({start:{x:M.l,y:A4[1]-43},end:{x:A4[0]-M.r,y:A4[1]-43},thickness:.7,color:C.gold});page.drawText('SMV ASTRO SERVICES',{x:M.l,y:A4[1]-35,size:9,font:bold,color:C.wine});page.drawText('smvastroservices.in',{x:M.l,y:25,size:7,font:helv,color:C.muted});const p=String(pageNo),pw=width(p,bold,8);page.drawText(p,{x:A4[0]-M.r-pw,y:25,size:8,font:bold,color:C.wine});};
 const newPage=()=>{if(page)chrome();page=pdf.addPage(A4);pageNo++;cover=false;y=A4[1]-M.t;};
 const ensure=h=>{if(!page||y-h<M.b)newPage()};
 const drawLines=(s,x,w,z=9,b=false,color=C.ink,gap=2,align='left')=>{const f=font(s,b),lines=wrap(s,f,z,w),lh=z+gap;ensure(lines.length*lh+2);for(const ln of lines){let xx=x;if(align!=='left'){const tw=width(ln,f,z);xx=align==='center'?x+(w-tw)/2:x+w-tw;}page.drawText(ln,{x:Math.max(x,xx),y:y-z,size:z,font:f,color});y-=lh;}return lines.length*lh};
 // cover
 page=pdf.addPage(A4);page.drawLine({start:{x:46,y:748},end:{x:549,y:748},thickness:1,color:C.gold});page.drawText('SMV ASTRO SERVICES',{x:170,y:775,size:20,font:bold,color:C.wine});page.drawText('Sri Madurai Veerayah Astro Services',{x:194,y:755,size:9,font:helv,color:C.muted});const tf=font(title,true),tz=language==='ta'?22:25,tl=wrap(title,tf,tz,470);let ty=590;for(const l of tl){const tw=width(l,tf,tz);page.drawText(l,{x:(A4[0]-tw)/2,y:ty,size:tz,font:tf,color:C.wine});ty-=tz+8;}page.drawLine({start:{x:155,y:ty-8},end:{x:440,y:ty-8},thickness:1.2,color:C.gold});page.drawText('smvastroservices.in',{x:250,y:55,size:8,font:helv,color:C.muted});
 newPage();
 const section=s=>{s=clean(s);if(!s)return;const f=font(s,true),z=13,ls=wrap(s,f,z,A4[0]-M.l-M.r-20),h=Math.max(30,ls.length*(z+3)+12);ensure(h+8);page.drawRectangle({x:M.l,y:y-h+4,width:A4[0]-M.l-M.r,height:h,color:C.cream,borderColor:C.goldSoft,borderWidth:.6});let yy=y-14;for(const l of ls){page.drawText(l,{x:M.l+10,y:yy,size:z,font:f,color:C.wine});yy-=z+3;}y-=h+8;};
 const sub=s=>{s=clean(s);if(!s)return;ensure(26);drawLines(s,M.l+4,A4[0]-M.l-M.r-8,10.5,true,C.wine,2);y-=5;};
 const para=s=>{s=clean(s);if(!s)return;drawLines(s,M.l+4,A4[0]-M.l-M.r-8,8.7,false,C.ink,2.4);y-=5;};
 const chart=b=>{const cells=(b.cells||[]).slice(0,12).map(clean);if(!cells.length)return;const size=310,cell=size/4,x=(A4[0]-size)/2;ensure(size+18);const top=y,slots=[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]];for(let i=0;i<12;i++){const [cx,cy]=slots[i],xx=x+cx*cell,yy=top-(cy+1)*cell;page.drawRectangle({x:xx,y:yy,width:cell,height:cell,color:C.white,borderColor:C.goldSoft,borderWidth:.7});const v=cells[i]||'—',f=font(v,true),ls=wrap(v,f,7.3,cell-8).slice(0,5);let ly=yy+cell-13;for(const l of ls){const tw=width(l,f,7.3);page.drawText(l,{x:xx+(cell-tw)/2,y:ly,size:7.3,font:f,color:C.ink});ly-=9;}}
 page.drawRectangle({x:x+cell,y:top-3*cell,width:2*cell,height:2*cell,color:C.cream,borderColor:C.goldSoft,borderWidth:.7});const c=clean(b.center||'Chart'),cf=font(c,true),cls=wrap(c,cf,13,2*cell-12);let cy=top-2*cell+((cls.length-1)*8);for(const l of cls){const tw=width(l,cf,13);page.drawText(l,{x:x+cell+(2*cell-tw)/2,y:cy,size:13,font:cf,color:C.wine});cy-=16;}y=top-size-14;};
 const table=rows=>{if(!Array.isArray(rows)||!rows.length)return;const n=Math.max(1,...rows.map(r=>Array.isArray(r)?r.length:0)),total=A4[0]-M.l-M.r,cw=total/n;const renderRow=(r,ri)=>{const vals=Array.from({length:n},(_,i)=>clean((r||[])[i]||'')),z=ri===0?7.1:6.9;let wrapped=[],h=22;for(const v of vals){const f=font(v,ri===0),ls=wrap(v,f,z,cw-8);wrapped.push([v,f,ls]);h=Math.max(h,Math.min(70,ls.length*(z+2)+8));}if(y-h<M.b){newPage();if(ri>0&&rows[0])renderRow(rows[0],0);}const yy=y-h;for(let i=0;i<n;i++){page.drawRectangle({x:M.l+i*cw,y:yy,width:cw,height:h,color:ri===0?C.wine:(ri%2?C.white:C.cream),borderColor:C.goldSoft,borderWidth:.35});let ly=y-z-5;for(const l of wrapped[i][2].slice(0,7)){const tw=width(l,wrapped[i][1],z),xx=M.l+i*cw+Math.max(4,(cw-tw)/2);page.drawText(l,{x:xx,y:ly,size:z,font:wrapped[i][1],color:ri===0?C.white:C.ink});ly-=z+2;}}y=yy;};rows.forEach((r,i)=>renderRow(r,i));y-=8;};
 if(blocks.length){for(const b of blocks){switch(String(b?.type||'')){case 'section':section(b.text);break;case 'subhead':sub(b.text);break;case 'chart':chart(b);break;case 'table':table(b.rows);break;case 'text':para(b.text);break;}}}else{for(const l of String(text||'').split(/\n+/).map(clean).filter(Boolean))para(l);}
 chrome();
 return Buffer.from(await pdf.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:100}));
}
module.exports={renderStructuredPdf};
