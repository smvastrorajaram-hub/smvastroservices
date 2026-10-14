"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {evaluate}=require("../public/horoscope/d1-v312-book-transits.js");
const moon={planets:{Moon:{sign:10}}};
const period={from:"2026-01-01",to:"2027-01-01",md:"Venus",ad:"Jupiter"};
const sample=(date="2026-06-01",j=11,s=0)=>({from:"2026-01-01",to:"2027-01-01",date,pos:{Jupiter:{sign:j},Saturn:{sign:s}}});
const timeline=(rows=[sample()])=>({referenceDate:"2026-01-01",end:"2027-01-01",transitYears:rows});
const run=(t=timeline(),p=[period],d=moon)=>evaluate(d,t,p);
test("Moon-relative favorable houses, wraparound and reviewed sources",()=>{
  for(let h=1;h<=12;h++){
    const sign=(10+h-1)%12,r=run(timeline([sample(undefined,sign,sign)]));
    assert.equal(r.matched.length,2);
    for(const row of r.matched){
      assert.equal(row.moonRelativeHouse,h);
      assert.equal(row.favorable,(row.planet==="Jupiter"?[2,5,7,9,11]:[3,6,11]).includes(h));
      assert.equal(row.observedOn,"2026-06-01");
      assert.equal(row.period.ad,"Jupiter");
      assert.ok(row.text.ta.includes(h+"-ஆம்"));
      assert.ok(row.text.ta.includes("2026-06-01"));
      assert.deepEqual(row.sourceRefs.map(x=>x.bookId),["textbook","kudumpa"]);
      assert.deepEqual(row.sourceRefs[0].pdfPages,[326,327,328,329,330,331,332]);
      assert.equal(row.sourceRefs[0].sha256,"1cafa828f34764ed5e85816882df2e8f0bc014c5c57ccdb27169416e117fd4db");
      for(const ref of row.sourceRefs){
        assert.match(ref.sha256,/^[a-f0-9]{64}$/);
        assert.equal(ref.verification,"text-reviewed");
        assert.equal(ref.referenceFrame,"natal-Moon");
      }
    }
  }
  assert.match(run(timeline([sample(undefined,10,10)])).matched[0].text.en,/does not establish an adverse/);
});
test("real calendar validation includes Gregorian century leap rules",()=>{
  for(const [date,valid] of [["2028-02-29",true],["2000-02-29",true],["1900-02-29",false],["2026-02-29",false],["2026-04-31",false],["2026-13-01",false],["2026-06-01T00:00:00Z",false]]){
    const y=date.slice(0,4),from=y+"-01-01",to=(+y+1)+"-01-01";
    const t={referenceDate:from,end:to,transitYears:[{...sample(date),from,to}]};
    assert.equal(run(t,[{...period,from,to}]).matched.length,valid?2:0,date);
  }
});
test("all observed intervals are half open and active MD/AD is unique",()=>{
  assert.equal(run(timeline([sample("2026-01-01")])).matched.length,2);
  assert.equal(run(timeline([sample("2027-01-01")])).matched.length,0);
  assert.equal(run(timeline([{...sample(),to:"2026-06-01"}])).matched.length,0);
  assert.equal(run(timeline(),[{...period,to:"2026-06-01"}]).matched.length,0);
  assert.equal(run(timeline(),[period,{...period,ad:"Saturn"}]).matched.length,0);
  assert.equal(run(timeline(),[{...period,ad:null}]).matched.length,0);
  assert.equal(run(timeline(),[]).matched.length,0);
});
test("requires integer observed signs, ignoring notes and strength",()=>{
  for(const sign of ["10",NaN,12,-1,1.5,null])
    assert.equal(run(timeline(),[period],{planets:{Moon:{sign}}}).matched.length,0);
  const t=timeline([{...sample(),pos:{Jupiter:{notes:"sign 11",strength:11},Saturn:{sign:"0"}}}]);
  assert.equal(run(t).matched.length,0);
  assert.equal(run(t).insufficient.length,2);
  const conflict=run(timeline([sample(),sample(undefined,3,0)]));
  assert.deepEqual(conflict.matched.map(x=>x.planet),["Saturn"]);
  assert.equal(conflict.insufficient[0].reason,"conflicting-position");
  assert.equal(run(timeline([{...sample(),pos:{Jupiter:{sign:11},"குரு":{sign:3}}}])).matched.length,0);
});
test("input and exported source metadata remain independently mutable",()=>{
  const t=timeline(),p=[{...period}],before=JSON.stringify({moon,t,p}),r=run(t,p);
  assert.equal(JSON.stringify({moon,t,p}),before);
  assert.equal(Object.isFrozen(t),false);
  r.matched[0].sourceRefs[0].pdfPages.push(999);
  assert.equal(run().matched[0].sourceRefs[0].pdfPages.includes(999),false);
});
test("UMD exposes the browser API",()=>{
  const fs=require("node:fs"),vm=require("node:vm"),box={};
  vm.runInNewContext(fs.readFileSync(require.resolve("../public/horoscope/d1-v312-book-transits.js"),"utf8"),box);
  assert.equal(typeof box.SMVBookTransitsV312.evaluate,"function");
  assert.equal(box.SMVBookTransitsV312.evaluate(moon,timeline(),[period]).matched.length,2);
});
