// Uses the browser's bundled IANA tz database; no network request.
export function offsetMinutesAt(timeZone,date,time){
 const [y,m,d]=String(date).split('-').map(Number),[hh,mm]=String(time).split(':').map(Number);
 // Iterate because the entered wall-clock time is in the target zone.
 let guess=Date.UTC(y,m-1,d,hh,mm,0);
 const dtf=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<3;i++){
  const p=Object.fromEntries(dtf.formatToParts(new Date(guess)).filter(x=>x.type!=='literal').map(x=>[x.type,Number(x.value)]));
  const shown=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second||0);
  guess+=Date.UTC(y,m-1,d,hh,mm,0)-shown;
 }
 return Math.round((Date.UTC(y,m-1,d,hh,mm,0)-guess)/60000);
}
