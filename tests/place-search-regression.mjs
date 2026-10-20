/* Location regression: preserve GeoNames results, split-manifest integrity and cancellable Worker loading. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchPlaces} from '../public/horoscope/offline/places/place-search.mjs';

let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const root=new URL('../public/horoscope/offline/places/',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('india-manifest.json',root),'utf8'));
ok(manifest.records===557995,'The complete 557,995-record India place manifest remains authoritative');
const declaredTotal=Object.values(manifest.shards).reduce((n,info)=>n+Number(info.records||0),0);
ok(declaredTotal===manifest.records,'All letter-shard record counts sum to the published complete database total');
for(const [key,info] of Object.entries(manifest.shards)){
 const parts=Array.isArray(info.parts)?info.parts:[info];
 const count=parts.reduce((n,part)=>n+Number(part.records||0),0);
 ok(count===Number(info.records),key+' shard parts preserve its declared record count');
 for(const part of parts)ok(fs.existsSync(new URL('india/'+part.file,root)),key+' data part is present: '+part.file);
}

const rowsA=[
 [100,'Perambalur','Tamil Nadu','Perambalur district',11.23,78.88,'Asia/Kolkata',50000,['perambalur','perambalur town']],
 [101,'Perungudi','Tamil Nadu','Chennai district',12.96,80.24,'Asia/Kolkata',40000,['perungudi','perungudi chennai']]
];
const rowsB=[
 [102,'Periyakulam','Tamil Nadu','Theni district',10.12,77.55,'Asia/Kolkata',30000,['periyakulam']],
 [103,'Small Perambalur','Tamil Nadu','Perambalur district',11.25,78.9,'Asia/Kolkata',100,['small perambalur']]
];
const fixtureManifest={version:1,source:'fixture',records:4,license:'CC BY 4.0',shards:{
 p:{records:4,bytes:0,parts:[{file:'p-00.json',records:2,bytes:0},{file:'p-01.json',records:2,bytes:0}]}
}};
const fetched=[];
const oldFetch=globalThis.fetch;
globalThis.fetch=async input=>{
 const url=String(input);fetched.push(url);
 if(url.endsWith('/india-manifest.json'))return new Response(JSON.stringify(fixtureManifest),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.endsWith('/india/p-00.json'))return new Response(JSON.stringify(rowsA),{status:200,headers:{'Content-Type':'application/json'}});
 if(url.endsWith('/india/p-01.json'))return new Response(JSON.stringify(rowsB),{status:200,headers:{'Content-Type':'application/json'}});
 throw new Error('Unexpected fixture fetch: '+url);
};
try{
 const found=await searchPlaces('perambalur',12);
 ok(found.length===2&&found[0].geonameId===100&&found[1].geonameId===103,
  'Exact and embedded aliases retain their deterministic rank order');
 ok(found[0].latitude===11.23&&found[0].longitude===78.88&&found[0].timezone==='Asia/Kolkata',
  'Selected-place coordinates and timezone are preserved');
 ok(fetched.some(url=>url.endsWith('/india/p-00.json'))&&fetched.some(url=>url.endsWith('/india/p-01.json')),
  'All parts in a selected letter are assembled into the same search candidate set');
 const same=await searchPlaces('perambalur',12);
 ok(same===found,'Result cache avoids repeated scanning for identical queries');
 const broad=await searchPlaces('per',2);
 ok(broad.length===2&&broad[0].population>=broad[1].population,
  'Prefix search respects result limits and the population tie-breaker');
}finally{globalThis.fetch=oldFetch;}

const main=fs.readFileSync(new URL('../public/horoscope/offline/places/place-search.mjs',import.meta.url),'utf8');
const engine=fs.readFileSync(new URL('../public/horoscope/offline/places/place-search-worker.mjs',import.meta.url),'utf8');
const calendar=fs.readFileSync(new URL('../public/horoscope/calendar/sw.js',import.meta.url),'utf8');
ok(main.includes("new Worker(new URL('./place-search-worker.mjs'")&&main.includes("type:'module'"),
 'Production location search uses the existing module Worker');
ok(engine.includes('Array.isArray(info.parts)')&&engine.includes('Promise.all(info.parts.map(loadPart)'),
 'Large letter datasets load from bounded physical shard parts');
ok(engine.includes('if(++count%1200===0)')&&engine.includes('isCancelled()'),
 'Worker scanning yields between batches and checks cancellation');
ok(main.includes("{kind:'cancel',id}")&&engine.includes("data?.kind==='cancel'"),
 'Superseded location searches can be cancelled without background rescans');
ok(!main.includes('place-search.worker.mjs')&&!fs.existsSync(new URL('../public/horoscope/offline/places/place-search-core.mjs',import.meta.url)),
 'No duplicate second Worker/core implementation remains');
ok(!calendar.includes('PLACE_SHARDS')&&!calendar.includes('...PLACE_SHARDS.map'),
 'Calendar install does not bulk-cache every location shard');

console.log(JSON.stringify({pass:true,checks,fullDatasetRecords:manifest.records,letterShards:Object.keys(manifest.shards).length,scope:'manifest/data integrity + split data + worker search semantics'}));
