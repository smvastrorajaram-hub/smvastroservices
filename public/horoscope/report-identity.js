/* Shared payment identity. Display names and language never grant a new entitlement. */
(function(root){'use strict';
 function birth(value){
  const b=value||{},date=String(b.date||''),raw=String(b.time||'');
  const m=raw.match(/^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!m||+m[1]>23||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Valid birth date and time are required.');
  const coord=(v,max)=>{if(v==null||String(v).trim()===''||!Number.isFinite(+v)||Math.abs(+v)>max)throw Error('Valid birth coordinates are required.');return (+v).toFixed(6);};
  const offset=b.utcOffsetMinutes==null?330:Number(b.utcOffsetMinutes);if(!Number.isFinite(offset)||Math.abs(offset)>840)throw Error('Valid UTC offset is required.');
  return {date,time:m[1].padStart(2,'0')+':'+m[2]+':'+(m[3]||'00'),lat:coord(b.lat??b.latitude,90),lon:coord(b.lon??b.longitude,180),utcOffsetMinutes:offset};
 }
 function canonical(feature,value){if(feature==='advanced_analysis')return JSON.stringify({v:1,feature,birth:birth(value)});if(feature==='marriage_matching')return JSON.stringify({v:1,feature,bride:birth(value?.bride),groom:birth(value?.groom)});throw Error('Invalid report feature.');}
 const api={birth,canonical};if(typeof module==='object'&&module.exports)module.exports=api;else root.SMVReportIdentity=api;
})(typeof globalThis==='object'?globalThis:this);
