import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateSwiss} from '../public/horoscope/offline/swiss_vedic.browser.mjs';
import {panchang} from '../public/horoscope/offline/transit_panchang.browser.mjs';
import {buildSubhaJananaData} from '../public/horoscope/subha-janana.browser.mjs';
import {readFile} from 'node:fs/promises';

test('birth statement calculates Ghati, Ahas/Ratri, event ranges and both Amirthadi Yogas', async () => {
  const input={date:'1992-07-31',time:'22:05',lat:11.23,lon:78.88,utcOffsetMinutes:330,timezone:'Asia/Kolkata',mode:'birth',language:'ta'};
  const chart=calculateSwiss(input);
  const birthPanchang=panchang(input,chart);
  const result=await buildSubhaJananaData(input,birthPanchang);
  assert.equal(result.available,true);
  assert.ok(result.sunrise);
  assert.ok(result.sunset);
  assert.ok(result.ahas&&result.ratri);
  assert.equal(result.ahas.totalTharparai+result.ratri.totalTharparai,216000);
  assert.ok(result.elapsedSinceSunrise.nazhigai>0);
  assert.ok(result.ranges.tithi.start&&result.ranges.tithi.end);
  assert.ok(result.ranges.nakshatra.start&&result.ranges.nakshatra.end);
  assert.ok(result.ranges.yoga.start&&result.ranges.yoga.end);
  assert.ok(result.ranges.karana.start&&result.ranges.karana.end);
  assert.ok(result.dayAmirthadiYoga.ta);
  assert.ok(result.birthAmirthadiYoga.ta);
  assert.equal(result.referenceDate,input.date);
});

test('a pre-sunrise birth uses the previous sunrise-based Panchang day', async () => {
  const input={date:'1992-07-31',time:'04:30',lat:11.23,lon:78.88,utcOffsetMinutes:330,timezone:'Asia/Kolkata',mode:'birth',language:'ta'};
  const chart=calculateSwiss(input);
  const birthPanchang=panchang(input,chart);
  const result=await buildSubhaJananaData(input,birthPanchang);
  assert.equal(result.available,true);
  assert.equal(result.referenceDate,'1992-07-30');
  assert.ok(result.elapsedSinceSunrise.nazhigai>=0);
});

test('statement layout and form controls preserve the requested product boundary', async () => {
  const [html,report,form,worker,calendarWorker,rootWorker]=await Promise.all([
    readFile(new URL('../public/horoscope/index.html',import.meta.url),'utf8'),
    readFile(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8'),
    readFile(new URL('../public/horoscope/horoscope-form.js',import.meta.url),'utf8'),
    readFile(new URL('../public/horoscope/sw.js',import.meta.url),'utf8'),
    readFile(new URL('../public/horoscope/calendar/sw.js',import.meta.url),'utf8'),
    readFile(new URL('../public/sw.js',import.meta.url),'utf8')
  ]);
  assert.match(html,/<b>பாலினம்<\/b>/);
  assert.doesNotMatch(html,/பாலினம்[^<]{0,40}கட்டாயம்/);
  assert.match(html,/name="tamilBirthGender" value="male" required/);
  assert.match(html,/name="tamilBirthGender" value="female" required/);
  assert.match(html,/id="tamilBirthVillage"/);
  assert.match(html,/id="tamilMotherName"/);
  assert.match(html,/id="tamilFatherName"/);
  assert.match(report,/ஸ்ரீமத் சுபஜெனன வாக்கியம்/);
  assert.match(report,/\.smv-invocation/);
  assert.match(report,/வருட-வர்த்தமானங்கள்/);
  assert.match(report,/பிறந்த பஞ்சாங்கம்/);
  assert.doesNotMatch(report,/data-smv-screen-only="daily-panchang"/);
  assert.doesNotMatch(report,/data-smv-screen-only="daily-hora"/);
  assert.match(report,/if\(calendarPresentation\)h\+=/);
  assert.match(form,/Choose a gender/);
  assert.match(form,/birthVillage/);
  for (const source of [worker,calendarWorker,rootWorker]) {
    assert.match(source,/20261120-subha-janana-v1/);
  }
  assert.match(worker,/subha-janana\.browser\.mjs/);
  assert.match(worker,/tamil-day-classifications\.mjs/);
});
