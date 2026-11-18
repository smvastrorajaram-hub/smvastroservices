import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getChandrashtamaRasiIndex,
  getNakshatraPadaAtLongitude,
  getChandrashtamaPadaSegments,
  getBirthStarPadasInRasi,
  getChandrashtamaPadaProjection,
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


test('birth Nakshatra Pada projects 210 degrees forward into its corresponding eighth-Rasi Pada',()=>{
  const ashwini1=getChandrashtamaPadaProjection(0,1);
  assert.equal(ashwini1.janmaRasiIndex,0);       // Mesha
  assert.equal(ashwini1.targetRasiIndex,7);     // Vrischika
  assert.equal(ashwini1.targetNakshatraIndex,15); // Vishakha
  assert.equal(ashwini1.targetPada,4);
  assert.ok(Math.abs(ashwini1.startLongitude-210)<1e-8);

  const magha4=getChandrashtamaPadaProjection(9,4);
  assert.equal(magha4.janmaRasiIndex,4);         // Simha
  assert.equal(magha4.targetRasiIndex,11);       // Meena
  assert.equal(magha4.targetNakshatraIndex,25);  // Uttara Bhadrapada
  assert.equal(magha4.targetPada,3);
  assert.ok(Math.abs(magha4.startLongitude-340)<1e-8);
});

test('each birth Pada projection remains exactly one 3-degree-20-minute interval inside the eighth Rasi',()=>{
  for(let star=0;star<27;star++){
    for(let pada=1;pada<=4;pada++){
      const projection=getChandrashtamaPadaProjection(star,pada);
      assert.ok(projection);
      assert.equal(projection.targetRasiIndex,getChandrashtamaRasiIndex(projection.janmaRasiIndex));
      assert.ok(Math.abs((projection.endLongitude-projection.startLongitude+360)%360-PADA_DEGREES)<1e-8);
      assert.ok(projection.targetDegreeStart>=0&&projection.targetDegreeStart<30);
      assert.ok(Math.abs(projection.targetDegreeEnd-projection.targetDegreeStart-PADA_DEGREES)<1e-8);
    }
  }
});


test('Ashwini and Bharani birth Padas map only to their corresponding Vrischika transit Padas',()=>{
  const expected=[
    [0,1,15,4], // Ashwini 1 -> Vishakha 4
    [0,2,16,1], // Ashwini 2 -> Anuradha 1
    [0,3,16,2], // Ashwini 3 -> Anuradha 2
    [0,4,16,3], // Ashwini 4 -> Anuradha 3
    [1,1,16,4], // Bharani 1 -> Anuradha 4
    [1,2,17,1], // Bharani 2 -> Jyeshtha 1
    [1,3,17,2], // Bharani 3 -> Jyeshtha 2
    [1,4,17,3]  // Bharani 4 -> Jyeshtha 3
  ];
  for(const [star,birthPada,targetStar,targetPada] of expected){
    const result=getChandrashtamaPadaProjection(star,birthPada);
    assert.equal(result.targetNakshatraIndex,targetStar);
    assert.equal(result.targetPada,targetPada);
    assert.equal(result.targetRasiIndex,7); // Vrischika
  }
});

test('Mesha selector permits Ashwini/Bharani and only Krittika Pada 1; Simha permits Magha/Pooram/Uttara Pada 1',()=>{
  assert.deepEqual(getBirthStarPadasInRasi(0,0),[1,2,3,4]);
  assert.deepEqual(getBirthStarPadasInRasi(1,0),[1,2,3,4]);
  assert.deepEqual(getBirthStarPadasInRasi(2,0),[1]);
  assert.deepEqual(getBirthStarPadasInRasi(9,4),[1,2,3,4]);
  assert.deepEqual(getBirthStarPadasInRasi(10,4),[1,2,3,4]);
  assert.deepEqual(getBirthStarPadasInRasi(11,4),[1]);
});

test('Pooram birth Padas project to Uttara Bhadrapada 4 through Revati 3 in Pisces',()=>{
  const expected=[
    [25,4], // Pooram 1 -> Uttara Bhadrapada 4
    [26,1], // Pooram 2 -> Revati 1
    [26,2], // Pooram 3 -> Revati 2
    [26,3]  // Pooram 4 -> Revati 3
  ];
  for(let birthPada=1;birthPada<=4;birthPada++){
    const result=getChandrashtamaPadaProjection(10,birthPada);
    assert.equal(result.janmaRasiIndex,4); // Simha
    assert.equal(result.targetRasiIndex,11); // Meena
    assert.deepEqual([result.targetNakshatraIndex,result.targetPada],expected[birthPada-1]);
  }
});
