/* Standalone batch oracle input bridge for the production IANA offset engine. */
import {offsetMinutesAt} from '../public/horoscope/offline/places/timezone.mjs';
let raw='';
for await(const chunk of process.stdin)raw+=chunk;
const inputs=JSON.parse(raw);
const results=inputs.map(([zone,date,time])=>{
 try{return offsetMinutesAt(zone,date,time)}
 catch(error){return {error:String(error?.message||error)}}
});
process.stdout.write(JSON.stringify({
 node:process.version,
 icu:process.versions.icu,
 tz:process.versions.tz,
 results
}));
