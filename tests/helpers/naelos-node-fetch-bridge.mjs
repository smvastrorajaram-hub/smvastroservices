// Node-only test adapter for the browser-first NAELOS loader.
// Production runs over HTTP(S); Node integration tests read checked-in DE440 fixtures.
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const dataRoot=path.resolve(fileURLToPath(new URL('../../public/horoscope/offline/naelos-data/',import.meta.url)));
const nativeFetch=globalThis.fetch.bind(globalThis);

globalThis.fetch=async(resource,options)=>{
  const value=typeof resource==='string'?resource:
    (resource instanceof URL?resource.href:resource?.url);
  if(typeof value==='string'){
    const url=new URL(value,'file:///');
    if(url.protocol==='file:'){
      const filename=path.resolve(fileURLToPath(url));
      const relative=path.relative(dataRoot,filename);
      const inside=relative!==''&&relative!=='..'&&
        !relative.startsWith('..'+path.sep)&&!path.isAbsolute(relative);
      if(inside){
        try{
          const bytes=await readFile(filename);
          return new Response(bytes,{
            status:200,
            headers:{'Content-Type':filename.endsWith('.json')?'application/json':'application/octet-stream'}
          });
        }catch(error){
          if(error?.code==='ENOENT')return new Response('not found',{status:404});
          throw error;
        }
      }
    }
  }
  return nativeFetch(resource,options);
};
