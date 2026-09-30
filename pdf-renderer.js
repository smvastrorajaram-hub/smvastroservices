'use strict';
require('regenerator-runtime/runtime');
const fs=require('fs');
const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const fontkit=require('@pdf-lib/fontkit');

const A4=[595.28,841.89],M={l:36,r:36,t:58,b:42};
const C={wine:rgb(.545,0,0),gold:rgb(.72,.565,.235),goldSoft:rgb(.86,.79,.62),cream:rgb(1,.992,.965),ink:rgb(.10,.10,.10),muted:rgb(.38,.36,.34),white:rgb(1,1,1)};
const INV=/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g;
const clean=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(INV,'').replace(/\s+/g,' ').trim();
const FALL=new Map([['☉','Sun'],['☾','Moon'],['☽','Moon'],['♂','Mars'],['♀','Venus'],['♃','Jupiter'],['♄','Saturn'],['☊','Rahu'],['☋','Ketu'],['→','->'],['←','<-'],['✓','Yes'],['✗','No'],['•','-'],['·','-'],['–','-'],['—','-'],['“','"'],['”','"'],['’',"'"]]);

async function renderStructuredPdf({title='SMV ASTRO Report',language='en',text='',blocks=[],fontPath}){
 const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);pdf.setTitle(title);pdf.setAuthor('SMV ASTRO SERVICES');pdf.setCreator('SMV ASTRO V100 structured renderer');
 const helv=await pdf.embedFont(StandardFonts.Helvetica),bold=await pdf.embedFont(StandardFonts.HelveticaBold);
 // V100: full embedding avoids the Indic subset/shaping omissions seen as square glyphs in V98/V99.
 // The Tamil font is small enough for the accepted 600 KB–1 MB report range and this is also faster
 // than repeatedly constructing a large subset for 300k+ character reports.
 let uni=null;if(fontPath&&fs.existsSync(fontPath))uni=await pdf.embedFont(fs.readFileSync(fontPath),{subset:false});
 const font=(b=false)=>uni||(b?bold:helv);
 const safe=v=>{let s=clean(v);if(uni)return s;let o='';for(const ch of s){const cp=ch.codePointAt(0);if(cp>=32&&cp<=255)o+=ch;else o+=FALL.get(ch)||'?'}return o};
 const widthCache=new Map(),wrapCache=new Map();
 const width=(s,f,z)=>{s=safe(s);const k=z+'|'+s;if(widthCache.has(k))return widthCache.get(k);let w;try{w=f.widthOfTextAtSize(s,z)}catch(_){w=s.length*z*.52}if(widthCache.size<30000)widthCache.set(k,w);return w};
 const splitLong=(word,f,z,max)=>{const out=[];let cur='';for(const ch of [...word]){if(cur&&width(cur+ch,f,z)>max){out.push(cur);cur=ch}else cur+=ch}if(cur)out.push(cur);return out};
 const wrap=(value,f,z,max)=>{const s=safe(value);const key=z+'|'+Math.round(max*10)+'|'+s;if(wrapCache.has(key))return wrapCache.get(key);if(!s)return [''];const out=[];let line='';for(let w of s.split(/\s+/)){const parts=width(w,f,z)>max?splitLong(w,f,z,max):[w];for(const p of parts){const q=line?line+' '+p:p;if(line&&width(q,f,z)>max){out.push(line);line=p}else line=q}}if(line)out.push(line);const v=out.length?out:[''];if(wrapCache.size<20000)wrapCache.set(key,v);return v};
 let page=null,y=0,pageNo=0;
 const chrome=()=>{if(!page)return;page.drawLine({start:{x:M.l,y:A4[1]-38},end:{x:A4[0]-M.r,y:A4[1]-38},thickness:.55,color:C.gold});page.drawText('SMV ASTRO SERVICES',{x:M.l,y:A4[1]-31,size:8.2,font:bold,color:C.wine});page.drawText('smvastroservices.in',{x:M.l,y:21,size:6.5,font:helv,color:C.muted});const p=String(pageNo);page.drawText(p,{x:A4[0]-M.r-width(p,bold,7),y:21,size:7,font:bold,color:C.wine})};
 const newPage=()=>{if(page)chrome();page=pdf.addPage(A4);pageNo++;y=A4[1]-M.t};
 const ensure=h=>{if(!page||y-h<M.b)newPage()};
 const drawLines=(value,x,w,z=8.8,b=false,color=C.ink,gap=2)=>{const f=font(b),ls=wrap(value,f,z,w),lh=z+gap;ensure(ls.length*lh+3);for(const ln of ls){page.drawText(safe(ln),{x,y:y-z,size:z,font:f,color});y-=lh}return ls.length*lh};
 const section=value=>{const s=safe(value);if(!s)return;const f=font(true),z=12,ls=wrap(s,f,z,A4[0]-M.l-M.r-18),h=Math.max(28,ls.length*14+10);ensure(h+8);page.drawRectangle({x:M.l,y:y-h+3,width:A4[0]-M.l-M.r,height:h,color:C.cream,borderColor:C.goldSoft,borderWidth:.5});let yy=y-13;for(const l of ls){page.drawText(l,{x:M.l+9,y:yy,size:z,font:f,color:C.wine});yy-=14}y-=h+7};
 const sub=value=>{const s=safe(value);if(!s)return;ensure(23);drawLines(s,M.l+3,A4[0]-M.l-M.r-6,9.6,true,C.wine,1.8);y-=3};
 const para=value=>{const s=safe(value);if(!s)return;drawLines(s,M.l+3,A4[0]-M.l-M.r-6,8.3,false,C.ink,2.2);y-=4};
 const chart=b=>{const cells=(b.cells||[]).slice(0,12).map(safe);if(!cells.length)return;const size=282,cell=size/4,x=(A4[0]-size)/2;ensure(size+12);const top=y,slots=[[0,0],[1,0],[2,0],[3,0],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3],[0,2],[0,1]];for(let i=0;i<12;i++){const[cx,cy]=slots[i],xx=x+cx*cell,yy=top-(cy+1)*cell;page.drawRectangle({x:xx,y:yy,width:cell,height:cell,color:C.white,borderColor:C.goldSoft,borderWidth:.65});const f=font(false),ls=wrap(cells[i]||'',f,7,cell-7).slice(0,5);let ly=yy+cell-12;for(const l of ls){const tw=width(l,f,7);page.drawText(l,{x:xx+Math.max(3,(cell-tw)/2),y:ly,size:7,font:f,color:C.ink});ly-=8.5}}page.drawRectangle({x:x+cell,y:top-3*cell,width:2*cell,height:2*cell,color:C.cream,borderColor:C.goldSoft,borderWidth:.65});const c=safe(b.center||'Chart'),cf=font(true),cls=wrap(c,cf,11.5,2*cell-10);let cy=top-2*cell+(cls.length-1)*7;for(const l of cls){const tw=width(l,cf,11.5);page.drawText(l,{x:x+cell+(2*cell-tw)/2,y:cy,size:11.5,font:cf,color:C.wine});cy-=14}y=top-size-11};
 const columnWidths=(rows,n,total)=>{const score=Array(n).fill(4);for(const r of rows.slice(0,40))for(let i=0;i<n;i++)score[i]=Math.max(score[i],Math.min(28,[...clean(r?.[i]||'')].length));const min=n>=8?34:n>=6?44:55;let widths=score.map(v=>Math.max(min,v*4.4)),sum=widths.reduce((a,b)=>a+b,0);if(sum>total){const room=total-min*n,extra=Math.max(1,sum-min*n);widths=widths.map(w=>min+(w-min)*room/extra)}else{const add=(total-sum)/n;widths=widths.map(w=>w+add)}return widths};
 const table=(rows,sectionName='')=>{if(!Array.isArray(rows)||!rows.length)return;const n=Math.max(1,...rows.map(r=>Array.isArray(r)?r.length:0)),total=A4[0]-M.l-M.r,widths=columnWidths(rows,n,total),xs=[M.l];for(const w of widths)xs.push(xs[xs.length-1]+w);const dense=/dasa|தசா|bhukti|புக்தி|ashtaka|அஷ்டக|shadbala|சட்பல/i.test(sectionName)||n>=7;const bodyZ=dense?6.2:6.8,headZ=dense?6.3:6.7;
  const renderRow=(r,ri,repeat=false)=>{const vals=Array.from({length:n},(_,i)=>safe(r?.[i]||'')),z=ri===0?headZ:bodyZ,f=font(ri===0);const wrapped=vals.map((v,i)=>wrap(v,font(ri===0),z,widths[i]-6));let h=Math.max(dense?17:19,...wrapped.map(ls=>Math.min(dense?5:7,ls.length)*(z+1.6)+6));if(y-h<M.b){newPage();if(ri>0&&!repeat)renderRow(rows[0],0,true)}const yy=y-h;for(let i=0;i<n;i++){page.drawRectangle({x:xs[i],y:yy,width:widths[i],height:h,color:ri===0?C.wine:(ri%2?C.white:C.cream),borderColor:C.goldSoft,borderWidth:.3});let ly=y-z-4;for(const l of wrapped[i].slice(0,dense?5:7)){const ff=font(ri===0),tw=width(l,ff,z);page.drawText(l,{x:xs[i]+Math.max(3,(widths[i]-tw)/2),y:ly,size:z,font:ff,color:ri===0?C.white:C.ink});ly-=z+1.6}}y=yy};
  rows.forEach((r,i)=>renderRow(r,i));y-=6};
 // Compact title page: no otherwise-empty cover page.
 newPage();section(title);
 let current='';for(const b of blocks||[]){const type=String(b?.type||'');if(type==='section'){current=safe(b.text);section(current)}else if(type==='subhead')sub(b.text);else if(type==='chart')chart(b);else if(type==='table')table(b.rows,b.section||current);else if(type==='text')para(b.text)}
 if(!(blocks||[]).length)for(const l of String(text||'').split(/\n+/).map(clean).filter(Boolean))para(l);
 chrome();return Buffer.from(await pdf.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:250}));
}
module.exports={renderStructuredPdf};
