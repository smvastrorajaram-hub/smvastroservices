import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMuhurthamMonthEligibility,
  getVastuMuhurtham,
  getPushkaraNavamsa,
  VASTU_DAY_RULES,
  VASTU_WAKE_MINUTES,
  VASTU_PUJA_MINUTES,
  NAZHIGAI_MINUTES,
  classifyDocument50MarriageMuhurtham,
  getDocument50Panchaka,
  DOCUMENT50_LAGNA_DHRUVA,
  DOCUMENT50_MARRIAGE_DATE_SUMMARIES,
  getDocument50TimeRestrictions
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
  assert.deepEqual(Object.keys(VASTU_DAY_RULES).map(Number).sort((a,b)=>a-b),[0,1,3,4,6,7,9,10,11]);
  assert.deepEqual(
    Object.entries(VASTU_DAY_RULES).map(([month,rule])=>[Number(month),rule.day,rule.sunriseOffsetNazhigai]),
    [[0,10,5],[1,21,8],[3,11,2],[4,6,21],[6,11,2],[7,8,10],[9,12,8],[10,22,8],[11,22,8]]
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
  assert.equal(getVastuMuhurtham({tamilSolar:solar(11,22),sunrise:'06:00'}).isVastuDay,true, 'Panguni 22 is included in the 2026–27 Sri Thanigai annual table');
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
        const justBeforeEnd=getPushkaraNavamsa(absoluteEnd-1/3600);
        const atEnd=getPushkaraNavamsa(absoluteEnd);
        assert.equal(atStart.available,true);
        assert.equal(atStart.isPushkaraNavamsa,true,'sign '+sign+', interval '+i+' start');
        assert.equal(atStart.navamsaSignIndex,expectedNavamsa,'sign '+sign+', interval '+i+' Navamsa sign');
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


test('Document 50 annual marriage date tables preserve their printed coverage and counts',()=>{
  assert.equal(DOCUMENT50_MARRIAGE_DATE_SUMMARIES.parabhava2026To2027.transcribedCount,57);
  assert.equal(DOCUMENT50_MARRIAGE_DATE_SUMMARIES.parabhava2026To2027.unresolvedDateRows,0);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-12-13'}).listed,true,
    'The corrected Karthigai 27 / Sunday / Chaturthi / Thiruvonam row belongs to 13 December 2026.');
  assert.equal(DOCUMENT50_MARRIAGE_DATE_SUMMARIES.pilavanga2027To2028.transcribedCount,41);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-04-20'}).listed,true);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-04-22'}).listed,false);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-04-11'}).listed,true);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-04-18'}).listed,true);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-12-10'}).listed,true);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-12-13'}).listed,true);
});

test('Document 50 date lookup does not guess outside the printed annual table ranges',()=>{
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-04-19'}).available,false);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-04-15'}).available,false);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-12-11'}).available,false);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2026-12-18'}).listed,false);
  assert.equal(classifyDocument50MarriageMuhurtham({date:'2027-02-29'}).available,false);
});

test('Document 50 Panchaka uses its own five source-stated Dhruva values only',()=>{
  assert.deepEqual(DOCUMENT50_LAGNA_DHRUVA,{0:5,1:7,9:2,10:4,11:6});
  const result=getDocument50Panchaka({
    weekdayIndex:0, tithiNumber:3, nakshatraNumber:4, lagnaSignIndex:0
  });
  assert.equal(result.available,true);
  assert.equal(result.weekdayCount,1);
  assert.equal(result.tithiCount,3);
  assert.equal(result.nakshatraCount,4);
  assert.equal(result.lagnaCount,1);
  assert.equal(result.dhruva,5);
  assert.equal(result.total,14);
  assert.equal(result.remainder,5);
  assert.equal(result.eligible,true);
});

test('Document 50 Panchaka identifies the printed dosha remainders',()=>{
  for(const remainder of [1,2,4,6,8]){
    // Aries total = weekday(1) + tithi(1) + nakshatra + lagna(1) + Dhruva(5).
    const nakshatraNumber=remainder===1?2:remainder===2?3:remainder===4?5:remainder===6?7:9;
    const result=getDocument50Panchaka({
      weekdayIndex:0,tithiNumber:1,nakshatraNumber,lagnaSignIndex:0
    });
    assert.equal(result.remainder,(1+1+nakshatraNumber+1+5)%9);
    assert.equal(result.eligible,false);
  }
});

test('Document 50 Panchaka leaves remainder zero and unstated Dhruva signs unclassified',()=>{
  const zero=getDocument50Panchaka({
    weekdayIndex:0,tithiNumber:1,nakshatraNumber:1,lagnaSignIndex:0
  });
  assert.equal(zero.remainder,9%9);
  assert.equal(zero.eligible,null);
  assert.match(zero.reason,/does not classify remainder 0/);

  const missingDhruva=getDocument50Panchaka({
    weekdayIndex:0,tithiNumber:1,nakshatraNumber:1,lagnaSignIndex:2
  });
  assert.equal(missingDhruva.available,false);
  assert.equal(missingDhruva.dhruva,null);
  assert.match(missingDhruva.reason,/does not state a Lagna-Dhruva/);
});

test('Document 50 Panchaka counts Krishna Paksha Tithi from Pratipada again',()=>{
  const result=getDocument50Panchaka({
    weekdayIndex:1,tithiNumber:17,nakshatraNumber:4,lagnaSignIndex:1
  });
  assert.equal(result.available,true);
  assert.equal(result.tithiCount,2);
});

test('Document 50 Panchaka rejects incomplete or invalid input',()=>{
  assert.equal(getDocument50Panchaka({weekdayIndex:7,tithiNumber:1,nakshatraNumber:1,lagnaSignIndex:0}).available,false);
  assert.equal(getDocument50Panchaka({weekdayIndex:0,tithiNumber:0,nakshatraNumber:1,lagnaSignIndex:0}).available,false);
  assert.equal(getDocument50Panchaka({weekdayIndex:0,tithiNumber:1,nakshatraNumber:28,lagnaSignIndex:0}).available,false);
});


test('Document 50 selected-time screening blocks forbidden Tithis and weekdays',()=>{
  const tithi=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:4,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(tithi.blocked,true);
  assert.match(tithi.reasons.join(' '),/Tithi/);

  const tuesday=getDocument50TimeRestrictions({
    weekdayIndex:2,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(tuesday.blocked,true);
  assert.match(tuesday.reasons.join(' '),/Tuesday/);

  const saturday=getDocument50TimeRestrictions({
    weekdayIndex:6,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(saturday.blocked,true);
  assert.match(saturday.reasons.join(' '),/Saturday/);
});

test('Document 50 treats Sunday as a caution because the scan records practical acceptance',()=>{
  const result=getDocument50TimeRestrictions({
    weekdayIndex:0,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(result.blocked,false);
  assert.match(result.warnings.join(' '),/Sunday/);
});

test('Document 50 selected-time screening checks Rahu, Yamagandam, Kari and Thaniya',()=>{
  const rahu=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'17:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(rahu.blocked,true);
  assert.match(rahu.reasons.join(' '),/Rahu Kalam/);

  const yama=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'09:30',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false
  });
  assert.equal(yama.blocked,true);
  assert.match(yama.reasons.join(' '),/Yamagandam/);

  const dayFlag=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:true,thaniyaDay:false
  });
  assert.equal(dayFlag.blocked,true);
  assert.match(dayFlag.reasons.join(' '),/Kari Naal/);
});


test('Document 50 screening blocks source-backed Marana and Prabalarishta Yoga keys',()=>{
  const marana=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false,dayFlagsAvailable:true,thaniyaAvailable:true,
    yogaKey:'marana'
  });
  assert.equal(marana.blocked,true);
  assert.match(marana.reasons.join(' '),/Amirthadi Yoga is marana/);

  const prabalarishta=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false,dayFlagsAvailable:true,thaniyaAvailable:true,
    yogaKey:'prabalarishta'
  });
  assert.equal(prabalarishta.blocked,true);
});

test('Document 50 screening reports Utpata and unavailable day flags without guessing',()=>{
  const result=getDocument50TimeRestrictions({
    weekdayIndex:1,tithiNumber:3,time:'11:00',
    rahuKalam:'16:30 - 18:00',yamagandam:'09:00 - 10:30',
    kariDay:false,thaniyaDay:false,dayFlagsAvailable:false,thaniyaAvailable:false,
    yogaKey:'siddha'
  });
  assert.equal(result.blocked,false);
  assert.match(result.warnings.join(' '),/Kari Naal classification is unavailable/);
  assert.match(result.warnings.join(' '),/Thaniya Naal source data is unavailable/);
  assert.match(result.warnings.join(' '),/Utpata Yoga is not separately classified/);
});
