/* GeoNames integration tests: no real GeoNames username/network required. */
'use strict';
const assert=require('node:assert/strict');
const {registerGeoNamesRoutes}=require('../geonames-location-service');
const methods={};
const app={get:(path,fn)=>{methods[path]=fn}};
let requests=[],clock=()=>Date.now();
const fakeFetch=async url=>{
 const u=new URL(url);requests.push(u);
 if(u.searchParams.get('username')!=='fixture_user')throw Error('Wrong GeoNames credentials');
 if(u.pathname==='/searchJSON')return {ok:true,json:async()=>({geonames:[
  {name:'London',adminName1:'England',countryName:'United Kingdom',lat:'51.5074',lng:'-0.1278',geonameId:2643743,countryCode:'GB'},
  {name:'New York',adminName1:'New York',countryName:'United States',lat:'40.7128',lng:'-74.0060',geonameId:5128581,countryCode:'US'}]})};
 if(u.pathname==='/timezoneJSON')return {ok:true,json:async()=>({timezoneId:'Europe/London',countryCode:'GB',rawOffset:0,dstOffset:1})};
 throw Error('Unexpected provider endpoint');
};
registerGeoNamesRoutes(app,{username:'fixture_user',fetchImpl:fakeFetch,now:clock});
function response(){
 return {statusCode:200,headers:{},status(n){this.statusCode=n;return this},set(key,value){this.headers[key]=value;return this},json(body){this.body=body;return this}};
}
async function call(route,query){const r=response();await methods[route]({query},r);return r}
(async()=>{
 let checks=0;
 const ok=(v,msg)=>{assert.ok(v,msg);checks++};
 const search=await call('/api/locations/search',{q:'Lon',limit:70,lang:'en'});
 ok(search.statusCode===200 && search.body.rows.length===2,'Search results');
 ok(search.body.rows[0].timezone===''&&search.body.rows[0].timezoneSource==='geonames-pending','No guessed timezone');
 ok(requests[0].searchParams.get('maxRows')==='70','70 results cap');
 ok(requests[0].searchParams.get('name_startsWith')==='Lon','GeoNames autocomplete');
 const cached=await call('/api/locations/search',{q:'Lon',limit:70,lang:'en'});
 ok(cached.statusCode===200&&requests.length===1,'Search cached');
 const zone=await call('/api/locations/timezone',{lat:'51.5074',lng:'-0.1278'});
 ok(zone.statusCode===200&&zone.body.timezoneId==='Europe/London','Timezone retrieved');
 ok(!Object.hasOwn(zone.body,'dstOffset')&&!Object.hasOwn(zone.body,'rawOffset'),'No current/hardcoded DST offset');
 const cachedZone=await call('/api/locations/timezone',{lat:'51.5074',lng:'-0.1278'});
 ok(cachedZone.statusCode===200&&requests.length===2,'Timezone cached');
 const invalid=await call('/api/locations/timezone',{lat:'99',lng:'-0.1278'});
 ok(invalid.statusCode===400&&requests.length===2,'Coordinates rejected');
 const max=await call('/api/locations/search',{q:'New',limit:1000});
 ok(max.statusCode===200&&requests.at(-1).searchParams.get('maxRows')==='70','Server clamps max 70');
 const status=await call('/api/locations/status',{});
 ok(status.body.configured===true,'Configured status');
 const missing={};registerGeoNamesRoutes({get:(p,fn)=>missing[p]=fn},{username:'',fetchImpl:async()=>{throw Error('Must not contact provider')}});
 const m=response();await missing['/api/locations/timezone']({query:{lat:11,lng:78}},m);
 ok(m.statusCode===503&&!m.body.ok,'Missing credentials safely disabled');
 const fs=require('node:fs'),base=p=>fs.readFileSync(new URL('../'+p,'file://'+__filename),'utf8');
 const browser=base('public/horoscope/location-search-online-offline.js');
 ok(!browser.includes('nominatim.openstreetmap.org'),'Prohibited Nominatim autocomplete removed');
 ok(browser.includes('/api/locations/timezone'),'Timezone service used by browser');
 for(const f of ['public/horoscope/horoscope-form.js','public/horoscope/marriage-matching.js','public/horoscope/daily-calendar.mjs'])
  ok(base(f).includes('__smvResolvePlaceTimezone'),'Timezone selected-place flow in '+f);
 console.log(JSON.stringify({pass:true,checks,providerCalls:requests.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
