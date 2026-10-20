/* Location source regression: preserves ranking semantics and moves scans away from the UI thread. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rankPlaceRows,normalizePlaceQuery,placeShardKeyFor} from '../public/horoscope/offline/places/place-search-core.mjs';
import {searchPlaces} from '../public/horoscope/offline/places/place-search.mjs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const rows=[
 [100,'Perambalur','Tamil Nadu','Perambalur district',11.23,78.88,'Asia/Kolkata',50000,['perambalur','perambalur town']],
 [101,'Perungudi','Tamil Nadu','Chennai district',12.96,80.24,'Asia/Kolkata',40000,['perungudi','perungudi chennai']],
 [102,'Periyakulam','Tamil Nadu','Theni district',10.12,77.55,'Asia/Kolkata',30000,['periyakulam']],
 [103,'Small Perambalur','Tamil Nadu','Perambalur district',11.25,78.9,'Asia/Kolkata',100,['small perambalur']]
];
ok(normalizePlaceQuery('  Pérambalur  ')==='perambalur','Unicode normalization preserves location matching');
ok(placeShardKeyFor('perambalur')==='p'&&placeShardKeyFor('தமிழ்')==='ta','English and Tamil query routing remains deterministic');
const reference=query=>rows.map(row=>{
 const aliases=(row[8]||[]).map(normalizePlaceQuery);let score=99;
 for(const alias of aliases){
  if(alias===query){score=0;break;}
  if(alias.startsWith(query))score=Math.min(score,1);
  else if(alias.includes(' '+query))score=Math.min(score,2);
  else if(alias.includes(query))score=Math.min(score,3);
 }
 return {row,score};
}).filter(item=>item.score<99).sort((a,b)=>a.score-b.score||b.row[7]-a.row[7]||String(a.row[1]).localeCompare(String(b.row[1]))).map(item=>item.row);
const exact=rankPlaceRows(rows,'perambalur');
ok(JSON.stringify(exact.ranked.map(x=>x.row))===JSON.stringify(reference('perambalur')),
 'Shared search ranking matches an independent full-scan reference');
const prefix=rankPlaceRows(rows,'per');
ok(JSON.stringify(prefix.ranked.map(x=>x.row))===JSON.stringify(reference('per')),
 'Exact/prefix/embedded matching and population sort remain unchanged');

const core=fs.readFileSync(new URL('../public/horoscope/offline/places/place-search-core.mjs',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../public/horoscope/offline/places/place-search.worker.mjs',import.meta.url),'utf8');
const main=fs.readFileSync(new URL('../public/horoscope/offline/places/place-search.mjs',import.meta.url),'utf8');
ok(worker.includes('rankPlaceRows')&&worker.includes('getShard(key)')&&worker.includes('self.postMessage({id,rows})'),
 'Worker loads the selected shard and returns matches without DOM access');
ok(!worker.includes('document.')&&main.includes("new Worker(new URL('./place-search.worker.mjs'")&&main.includes("type:'module'"),
 'Browser location search uses a module Worker for shard parsing/scanning');
ok(main.includes('rankPlaceRows(source,normalized)')&&main.includes("typeof Worker!=='function'"),
 'Non-Worker browsers retain the local fallback');
ok(core.includes('new WeakMap()')&&core.includes('normalizePlaceQuery'),
 'Alias normalization is memoized across progressive prefix searches');

const manifest={version:1,source:'fixture',records:rows.length,license:'CC BY 4.0',shards:{p:{file:'p.json',records:rows.length,bytes:0},ta:{file:'ta.json',records:0,bytes:0}}};
const oldFetch=globalThis.fetch;
globalThis.fetch=async input=>{
 const url=String(input);
 if(url.endsWith('/india-manifest.json'))return new Response(JSON.stringify(manifest),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.endsWith('/india/p.json'))return new Response(JSON.stringify(rows),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.endsWith('/india/ta.json'))return new Response('[]',{status:200,headers:{'Content-Type':'application/json'}});
 throw new Error('Unexpected fixture fetch: '+url);
};
try{
 const found=await searchPlaces('perambalur',12);
 ok(found.length===2&&found[0].geonameId===100&&found[0].latitude===11.23&&found[1].geonameId===103,
  'Exact and embedded-alias results retain the existing ranking and coordinates');
 const same=await searchPlaces('perambalur',12);
 ok(same===found,'Result cache avoids rescanning identical queries');
 const limited=await searchPlaces('per',2);
 ok(limited.length===2&&limited[0].population>=limited[1].population,
  'Prefix search respects the limit and stable ranking');
}finally{globalThis.fetch=oldFetch;}
console.log(JSON.stringify({pass:true,checks,scope:'deterministic semantics + worker path/source guard'}));
