// V357 source-versus-BPHS I, Chapter 6, PDF pp. 67-80.
// Independent boundary oracle for sign mappings; NOT certification of predictions.
import assert from 'node:assert/strict';
import {vargaSign, vargaLongitude} from '../public/horoscope/offline/astro_advanced.browser.mjs';
const wrap=n=>(n%12+12)%12;
const trimsaOdd=[[5,0],[10,10],[18,8],[25,2],[30,6]];
const trimsaEven=[[5,1],[12,5],[20,11],[25,9],[30,7]];
const expected=(r,d,x)=>{
 const odd=r%2===0;
 if(d===30) return (odd?trimsaOdd:trimsaEven).find(([end])=>x<end)[1];
 const part=Math.min(d-1,Math.floor(x/(30/d)));
 if(d===2)return (odd?[4,3]:[3,4])[part];
 if(d===3)return wrap(r+4*part);
 if(d===4)return wrap(r+3*part);
 if(d===7)return wrap((odd?r:r+6)+part);
 if(d===9)return wrap([r,wrap(r+8),wrap(r+4)][r%3]+part);
 if(d===10)return wrap((odd?r:wrap(r+8))+part);
 if(d===12)return wrap(r+part);
 if(d===16)return wrap([0,4,8][r%3]+part);
 if(d===20)return wrap([0,8,4,0][r%4]+part);
 if(d===24)return wrap((odd?4:3)+part);
 if(d===27)return wrap([0,3,6,9][r%4]+part);
 if(d===40)return wrap((odd?0:6)+part);
 if(d===45)return wrap([0,4,8][r%3]+part);
 throw Error('Unsupported oracle divisor '+d);
};
const divs=[2,3,4,7,9,10,12,16,20,24,27,30,40,45];
let assertions=0;
const check=(actual,reference,label)=>{assert.equal(actual,reference,label);assertions++};
for(let sign=0;sign<12;sign++){
 for(const d of divs){
  const boundaries=d===30?(sign%2===0?[0,5,10,18,25,30]:[0,5,12,20,25,30]):Array.from({length:d+1},(_,k)=>k*30/d);
  const points=new Set([0,0.00001,29.99999]);
  for(const b of boundaries)for(const delta of [-0.00001,0,0.00001]){
   const x=b+delta;if(x>=0&&x<30) points.add(x);
  }
  for(const x of points){
   const lon=sign*30+x, e=expected(sign,d,x),actual=vargaSign(lon,d);
   check(actual,e,'BPHS Varga D'+d+' sign='+sign+' degree='+x);
   const transformed=vargaLongitude(lon,d);
   check(Math.floor((transformed+1e-9)/30)%12,e,'D'+d+' full varga longitude sign='+sign+' degree='+x);
   check(transformed>=0&&transformed<360,true,'D'+d+' normalized longitude');
  }
 }
}
// Published D30 segments must match D30 source varga sign and scaled longitude
// in BOTH odd and even natal signs, especially final 5-degree sections.
for(const sign of [0,1,2,3,10,11]){
 const segments=sign%2===0?trimsaOdd:trimsaEven;
 let start=0;
 for(const [end,target] of segments){
  for(const x of [start,(start+end)/2,end-0.00001]){
   const transformed=vargaLongitude(sign*30+x,30);
   const expectedLongitude=target*30+(x-start)*30/(end-start);
   check(Math.abs(transformed-expectedLongitude)<1e-6,true,'D30 intra-segment longitude');
  }
  start=end;
 }
}
console.log(JSON.stringify({pass:true,assertions,signs:12,divisions:divs.length,reference:'BPHS I chapter 6 PDF pages 67-80',certification:'Varga-mapping boundaries only'}));
