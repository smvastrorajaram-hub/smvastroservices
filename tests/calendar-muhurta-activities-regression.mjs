import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMuhurthamMonthEligibility,
  getVastuMuhurtham,
  getPushkaraNavamsa,
  VASTU_DAY_RULES,
  VASTU_WAKE_MINUTES,
  VASTU_PUJA_MINUTES,
  NAZHIGAI_MINUTES
} from '../public/horoscope/calendar-muhurta-activities.mjs';

const solar=(index,day)=>({index,day});

test('marriage month filter applies Aadi, Purattasi, Margazhi and Masi exclusions',()=>{
  for(const month of [3,5,8,10]){
    const result=getMuhurthamMonthEligibility({tamilSolar:solar(month,12),activity:'marriage'});
    assert.equal(result.available,true);
    assert.equal(result.eligible,false);
  }
  for(const month of [0,1,2,4,6,7,9,11]){
    const result=getMuhurthamMonthEligibility({tamilSolar:solar(month,12),activity:'marriage'});
    assert.equal(result.eligible,true);
    assert.match(result.reason,/other Muhurtham rules are not yet evaluated/);
  }
});

test('general ordinary auspicious month filter blocks only Aadi and Margazhi',()=>{
  assert.equal(getMuhurthamMonthEligibility({tamilSolar:solar(3,5),activity:'general'}).eligible,false);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar:solar(8,5),activity:'general'}).eligible,false);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar:solar(5,5),activity:'general'}).eligible,true);
});

test('the eight Vastu solar dates and sunrise offsets are explicit',()=>{
  assert.deepEqual(Object.keys(VASTU_DAY_RULES).map(Number).sort((a,b)=>a-b),[0,1,3,4,6,7,9,10]);
  assert.deepEqual(
    Object.entries(VASTU_DAY_RULES).map(([month,rule])=>[Number(month),rule.day,rule.sunriseOffsetNazhigai]),
    [[0,10,5],[1,21,8],[3,11,2],[4,6,21],[6,11,2],[7,8,10],[9,12,8],[10,22,8]]
  );
  assert.equal(NAZHIGAI_MINUTES,24);
  assert.equal(VASTU_WAKE_MINUTES,90);
  assert.equal(VASTU_PUJA_MINUTES,36);
});

test('Vastu wake and last 36-minute puja interval are measured from local sunrise',()=>{
  const result=getVastuMuhurtham({tamilSolar:solar(0,10),sunrise:'06:00'});
  assert.equal(result.available,true);
  assert.equal(result.isVastuDay,true);
  assert.equal(result.sunriseOffsetMinutes,120);
  assert.equal(result.wakeStart,'08:00');
  assert.equal(result.wakeEnd,'09:30');
  assert.equal(result.pujaStart,'08:54');
  assert.equal(result.pujaEnd,'09:30');
  assert.equal(result.pujaDurationMinutes,36);
});

test('Aadi 11 is a Vastu-only exception and does not lift the general Aadi block',()=>{
  const tamilSolar=solar(3,11);
  assert.equal(getVastuMuhurtham({tamilSolar,sunrise:'05:50'}).isVastuDay,true);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar,activity:'vastu'}).eligible,true);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar,activity:'general'}).eligible,false);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar,activity:'marriage'}).eligible,false);
});

test('non-Vastu months and wrong Tamil dates are not marked as Vastu days',()=>{
  assert.equal(getVastuMuhurtham({tamilSolar:solar(2,10),sunrise:'06:00'}).isVastuDay,false);
  assert.equal(getVastuMuhurtham({tamilSolar:solar(0,11),sunrise:'06:00'}).isVastuDay,false);
  assert.equal(getVastuMuhurtham({tamilSolar:solar(8,11),sunrise:'06:00'}).isVastuDay,false);
});

test('Vastu date can be known while its local time remains unavailable without sunrise',()=>{
  const result=getVastuMuhurtham({tamilSolar:solar(4,6),sunrise:''});
  assert.equal(result.available,false);
  assert.equal(result.isVastuDay,true);
  assert.equal(result.wakeStart,undefined);
});

test('all 24 Pushkara Navamsa intervals use inclusive starts and exclusive ends',()=>{
  const groups=[
    {signs:[0,4,8],intervals:[[20,23+20/60],[26+40/60,30]],navamsa:[6,8]},
    {signs:[1,5,9],intervals:[[6+40/60,10],[13+20/60,16+40/60]],navamsa:[2,4]},
    {signs:[2,6,10],intervals:[[16+40/60,20],[23+20/60,26+40/60]],navamsa:[5,7]},
    {signs:[3,7,11],intervals:[[0,3+20/60],[6+40/60,10]],navamsa:[0,2]}
  ];
  let count=0;
  for(const group of groups){
    for(const sign of group.signs){
      for(let i=0;i<group.intervals.length;i++){
        const [start,end]=group.intervals[i];
        const navamsaStart=sign%3===0?sign:sign%3===1?(sign+8)%12:(sign+4)%12;
        const expectedNavamsa=(navamsaStart+group.navamsa[i])%12;
        const absoluteStart=sign*30+start;
        const absoluteEnd=sign*30+end;
        const atStart=getPushkaraNavamsa(absoluteStart);
        const justBeforeEnd=getPushkaraNavamsa(absoluteEnd-1e-7);
        const atEnd=getPushkaraNavamsa(absoluteEnd);
        assert.equal(atStart.available,true);
        assert.equal(atStart.isPushkaraNavamsa,true,'sign '+sign+', interval '+i+' start');
        assert.equal(atStart.navamsaSignIndex,expectedNavamsa);
        assert.equal(justBeforeEnd.isPushkaraNavamsa,true,'sign '+sign+', interval '+i+' before end');
        assert.equal(atEnd.isPushkaraNavamsa,false,'sign '+sign+', interval '+i+' exclusive end');
        count++;
      }
    }
  }
  assert.equal(count,24);
});

test('Pushkara Navamsa reports the sidereal sign, degree and Navamsa sign',()=>{
  const result=getPushkaraNavamsa(21.5);
  assert.equal(result.available,true);
  assert.equal(result.isPushkaraNavamsa,true);
  assert.equal(result.signEn,'Aries');
  assert.equal(result.navamsaPart,7);
  assert.equal(result.navamsaSignEn,'Libra');
  assert.deepEqual(result.pushkaraInterval,{start:'20°00′00″',end:'23°20′00″',startDegrees:20,endDegrees:23+20/60});
});

test('invalid solar dates and unknown activities stay unavailable',()=>{
  assert.equal(getMuhurthamMonthEligibility({tamilSolar:null,activity:'marriage'}).available,false);
  assert.equal(getMuhurthamMonthEligibility({tamilSolar:solar(0,10),activity:'namakaranam'}).available,false);
  assert.equal(getVastuMuhurtham({tamilSolar:null,sunrise:'06:00'}).available,false);
  assert.equal(getPushkaraNavamsa(Number.NaN).available,false);
});
