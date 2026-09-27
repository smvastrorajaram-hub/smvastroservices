let manifest=null;
const cache=new Map();
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
async function mf(){if(manifest)return manifest;const r=await fetch(new URL('./india-manifest.json',import.meta.url));if(!r.ok)throw new Error('Offline India place database unavailable');manifest=await r.json();return manifest;}
function keyFor(n){const c=n[0]||'';if(c>='a'&&c<='z')return c;if(/[\u0B80-\u0BFF]/u.test(c))return'ta';return'other';}
async function shard(k){if(cache.has(k))return cache.get(k);const m=await mf(),x=m.shards[k];if(!x)return[];const r=await fetch(new URL('./india/'+x.file,import.meta.url));if(!r.ok)throw new Error('Offline India place shard unavailable');const rows=await r.json();cache.set(k,rows);return rows;}
export async function searchPlaces(q,limit=12){
 const n=norm(q);if(n.length<2)return[];
 const rows=await shard(keyFor(n)), out=[];
 for(const x of rows){
   let best=99;
   for(const raw of x[8]||[]){
     const a=norm(raw);
     if(a===n){best=0;break}
     if(a.startsWith(n))best=Math.min(best,1);
     else if(a.includes(' '+n))best=Math.min(best,2);
     else if(a.includes(n))best=Math.min(best,3);
   }
   if(best<99)out.push({x,score:best});
 }
 out.sort((a,b)=>a.score-b.score||b.x[7]-a.x[7]||String(a.x[1]).localeCompare(String(b.x[1])));
 return out.slice(0,limit).map(({x})=>{
   const district=x[3]||'', state=x[2]||'';
   const place=[x[1],district,state,'India'].filter((v,i,a)=>v&&a.indexOf(v)===i).join(', ');
   return {place,name:x[1],admin2:district,admin1:state,country:'India',latitude:x[4],longitude:x[5],timezone:x[6]||'Asia/Kolkata',population:x[7],geonameId:x[0]};
 });
}
