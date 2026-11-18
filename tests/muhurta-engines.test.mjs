import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TAMIL_ACTIVITIES,PAN_INDIAN_ACTIVITIES, toAstronomyFacts,
  evaluateTamilMuhurta,evaluatePanIndianMuhurta,
  listTamilMuhurtaRules,listPanIndianMuhurtaRules
} from '../public/horoscope/muhurta/index.mjs';

function facts(overrides={}){
  return {
    schema:'smv.muhurta.astronomy-facts.v1',
    date:'2026-11-19',time:'12:00',latitude:11.2342,longitude:78.8808,
    timezone:'Asia/Kolkata',utcOffsetMinutes:330,weekdayIndex:4,
    tithiNumber:5,tithiName:'Panchami',paksha:'Shukla Paksha',
    nakshatraNumber:8,nakshatraName:'Pushya',nakshatraPada:1,
    yogaNumber:16,yogaName:'Siddhi',karanaNumber:10,karanaName:'Taitila',
    sunrise:'06:10',sunset:'17:48',rahuKalam:'13:30 - 15:00',
    yamagandam:'06:10 - 07:40',gulikai:'09:10 - 10:40',
    lagnaSignIndex:0,lagnaName:'Aries',planets:[],
    houseOccupants:Array.from({length:12},()=>[]),
    panchangaBoundaries:{},...overrides
  };
}

test('Tamil and Pan-Indian activity registries are distinct and non-empty',()=>{
  assert.ok(TAMIL_ACTIVITIES.length>=15);
  assert.ok(PAN_INDIAN_ACTIVITIES.length>=12);
  assert.ok(TAMIL_ACTIVITIES.some(x=>x.id==='grihapravesha'));
  assert.ok(PAN_INDIAN_ACTIVITIES.some(x=>x.id==='vadhupravesha'));
  assert.notDeepEqual(
    TAMIL_ACTIVITIES.map(x=>x.id),
    PAN_INDIAN_ACTIVITIES.map(x=>x.id)
  );
});

test('Tamil rule list never imports Pan-Indian rule identifiers',()=>{
  const ids=listTamilMuhurtaRules().map(x=>x.id);
  assert.ok(ids.length>0);
  assert.ok(ids.every(id=>id.startsWith('TML_')));
});

test('Pan-Indian rule list never imports Tamil rule identifiers',()=>{
  const ids=listPanIndianMuhurtaRules().map(x=>x.id);
  assert.ok(ids.length>0);
  assert.ok(ids.every(id=>id.startsWith('PAN_')));
});

test('Pan-Indian Cintamani 1.22 rejects only the cited activity-specific combinations',()=>{
  const house=evaluatePanIndianMuhurta('grihapravesha',facts({weekdayIndex:2,nakshatraNumber:1}));
  assert.equal(house.status,'REJECTED');
  assert.ok(house.rules.some(r=>r.id==='PAN_MC01_22_GRIHAPRAVESHA_TUESDAY_ASHWINI'&&r.state==='prohibited'));

  const travel=evaluatePanIndianMuhurta('yatra',facts({weekdayIndex:6,nakshatraNumber:4}));
  assert.equal(travel.status,'REJECTED');
  assert.ok(travel.rules.some(r=>r.id==='PAN_MC01_22_YATRA_SATURDAY_ROHINI'&&r.state==='prohibited'));

  const marriage=evaluatePanIndianMuhurta('vivaha',facts({weekdayIndex:4,nakshatraNumber:8}));
  assert.equal(marriage.status,'REJECTED');
  assert.ok(marriage.rules.some(r=>r.id==='PAN_MC01_22_VIVAHA_THURSDAY_PUSHYA'&&r.state==='prohibited'));
});

test('a non-matching Pan-Indian combination remains conditional, never automatically eligible',()=>{
  const result=evaluatePanIndianMuhurta('vivaha',facts({weekdayIndex:1,nakshatraNumber:3}));
  assert.equal(result.status,'CONDITIONAL');
  assert.equal(result.complete,false);
});

test('conflicting Vidhānamālai tithi schemes remain pending and cannot certify a muhurta',()=>{
  const result=evaluateTamilMuhurta('vivaha',facts({tithiNumber:5}));
  assert.equal(result.status,'CONDITIONAL');
  assert.equal(result.complete,false);
  assert.ok(result.rules.some(r=>r.id==='TML_VM02_MARRIAGE_TITHI_5'&&r.state==='pending'));
  assert.ok(result.rules.some(r=>r.id==='TML_VM02_PAKSHA_CHIDRA_START_NAZHIGAI'&&r.state==='pending'));
});

test('source-pending rules are exposed but do not silently veto or approve',()=>{
  const result=evaluateTamilMuhurta('grihapravesha',facts());
  assert.equal(result.complete,false);
  assert.ok(result.rules.some(r=>r.id==='TML_VM25_GRIHAPRAVESHA_HOUSE_SHUDDHI'&&r.state==='pending'));
});

test('marriage matching data remains outside electional-time evaluation',()=>{
  const result=evaluatePanIndianMuhurta('vivaha',facts());
  assert.ok(!result.rules.some(r=>/KUTA|RAJJU|YONI|NADI/i.test(r.id)));
  assert.ok(result.status==='CONDITIONAL'||result.status==='REJECTED');
});

test('neutral astronomy adapter copies existing Panchanga/transit values without recomputation',()=>{
  const daily={
    en:{
      p:{
        requested:{date:'2026-11-19',time:'12:00',latitude:11.2342,longitude:78.8808},
        tithi:{number:5,name:'Panchami',half:'Shukla Paksha',start:'09:12',end:'07:10'},
        nakshatra:{number:8,name:'Pushya',pada:2,start:'08:10',end:'06:20'},
        yoga:{number:16,name:'Siddhi',start:'10:10',end:'08:15'},
        karana:{number:10,name:'Taitila',start:'09:12',end:'15:10'},
        sunrise:'06:10',sunset:'17:48',rahuKalam:'13:30 - 15:00',
        yamagandam:'06:10 - 07:40',gulikai:'09:10 - 10:40'
      },
      t:{
        requested:{date:'2026-11-19',time:'12:00',latitude:11.2342,longitude:78.8808},
        lagna:{rasi:'Aries'},
        planets:[{name:'Sun',rasi:'Scorpio',longitude:234,retrograde:false,combustion:false}]
      }
    }
  };
  const result=toAstronomyFacts(daily,{timezone:'Asia/Kolkata',utcOffsetMinutes:330});
  assert.equal(result.schema,'smv.muhurta.astronomy-facts.v1');
  assert.equal(result.tithiNumber,5);
  assert.equal(result.nakshatraNumber,8);
  assert.equal(result.lagnaSignIndex,0);
  assert.deepEqual(result.houseOccupants[8],['Sun']);
  assert.equal(result.timezone,'Asia/Kolkata');
});

test('invalid activity identifiers never get an eligible status',()=>{
  assert.equal(evaluateTamilMuhurta('private-consultation',facts()).status,'NOT_VERIFIED');
  assert.equal(evaluatePanIndianMuhurta('private-consultation',facts()).status,'NOT_VERIFIED');
});
