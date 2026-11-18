import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getChandrashtamaRasiIndex,
  getNakshatraPadaAtLongitude,
  getChandrashtamaPadaSegments,
  getBirthStarPadasInRasi,
  PADA_DEGREES
} from '../public/horoscope/calendar-chandrashtama.mjs';

test('Chandrashtama Rasi is the eighth sign from Janma Rasi',()=>{
  assert.equal(getChandrashtamaRasiIndex(0),7);  // Mesha -> Vrischika
  assert.equal(getChandrashtamaRasiIndex(5),0);  // Kanni -> Mesha
  assert.equal(getChandrashtamaRasiIndex(11),6); // Meena -> Thula
  assert.equal(getChandrashtamaRasiIndex(-1),null);
});

test('sidereal longitude resolves the correct Rasi, Nakshatra and Pada',()=>{
  const beforeSignBoundary=getNakshatraPadaAtLongitude(26+40/60);
  assert.equal(beforeSignBoundary.signIndex,0);
  assert.equal(beforeSignBoundary.nakshatraIndex,2);
  assert.equal(beforeSignBoundary.pada,1);
  const atSignBoundary=getNakshatraPadaAtLongitude(30);
  assert.equal(atSignBoundary.signIndex,1);
  assert.equal(atSignBoundary.nakshatraIndex,2);
  assert.equal(atSignBoundary.pada,2);
  const wrap=getNakshatraPadaAtLongitude(360);
  assert.equal(wrap.signIndex,0);
  assert.equal(wrap.nakshatraIndex,0);
  assert.equal(wrap.pada,1);
});

test('each Chandrashtama Rasi contains exactly nine 3-degree-20-minute padas',()=>{
  const all=[];
  for(let rasi=0;rasi<12;rasi++){
    const segments=getChandrashtamaPadaSegments(rasi);
    assert.equal(segments.length,9);
    assert.equal(segments[0].fromDegree,0);
    assert.ok(Math.abs(segments.at(-1).toDegree-30)<1e-10);
    for(let i=0;i<segments.length;i++){
      assert.equal(segments[i].index,i);
      assert.ok(Math.abs((segments[i].toDegree-segments[i].fromDegree)-PADA_DEGREES)<1e-10);
      all.push(segments[i].nakshatraIndex+':'+segments[i].pada);
    }
  }
  assert.equal(new Set(all).size,108);
});

test('the nine boundary-crossing birth Nakshatras resolve only to their matching Rasi padas',()=>{
  const examples=[
    [2,0,[1]],[2,1,[2,3,4]],       // Krittika
    [4,1,[1,2]],[4,2,[3,4]],       // Mrigashira
    [6,2,[1,2,3]],[6,3,[4]],       // Punarvasu
    [11,4,[1]],[11,5,[2,3,4]],     // Uttara Phalguni
    [13,5,[1,2]],[13,6,[3,4]],     // Chitra
    [15,6,[1,2,3]],[15,7,[4]],     // Vishakha
    [20,8,[1]],[20,9,[2,3,4]],     // Uttara Ashadha
    [22,9,[1,2]],[22,10,[3,4]],    // Dhanishta
    [24,10,[1,2,3]],[24,11,[4]]    // Purva Bhadrapada
  ];
  for(const [star,rasi,padas] of examples){
    assert.deepEqual(getBirthStarPadasInRasi(star,rasi),padas);
  }
  assert.deepEqual(getBirthStarPadasInRasi(2,2),[]);
});

test('the other eighteen Nakshatras keep all four padas in one Rasi',()=>{
  const split=new Set([2,4,6,11,13,15,20,22,24]);
  for(let star=0;star<27;star++){
    if(split.has(star)) continue;
    const firstRasi=Math.floor((star*13+star*1/3)/30);
    assert.deepEqual(getBirthStarPadasInRasi(star,firstRasi),[1,2,3,4]);
  }
});
