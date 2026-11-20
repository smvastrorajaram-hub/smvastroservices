import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const audit=JSON.parse(await readFile(new URL('../artifacts/sripati-bhava-20k-audit.json',import.meta.url),'utf8'));
const golden=audit.goldenCase;
assert.ok(golden?.pass,'Perambalur Sripati numerical Golden Case must pass before chart presentation is tested.');
assert.deepEqual(golden.bhavas.map(row=>row.rasiIndex),[1,2,2,3,4,6,7,8,8,9,10,0],
  'Golden birth case preserves Gemini II/III and Sagittarius VIII/IX Madhya mapping.');

const horoscopeSource=await readFile(new URL('../public/horoscope/horoscope.js',import.meta.url),'utf8');
const startMarker="const bhChart=result.querySelector('#bhavaChart');";
const endMarker="const dashaTree=result.querySelector('#dashaTree');";
const start=horoscopeSource.indexOf(startMarker);
const end=horoscopeSource.indexOf(endMarker,start);
assert.ok(start>=0&&end>start,'The production Horoscope render(d) Bhava Chart block must remain locatable.');
const productionBhavaRenderer=horoscopeSource.slice(start,end).trim();
assert.ok(productionBhavaRenderer.includes('bhavaHouseBySign[si].map(n=>')&&productionBhavaRenderer.includes('${romanHouse(n)}'),
  'The actual render(d) block must create its Bhava house labels through romanHouse().');

const roman=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
const zodiac=['மேஷம்','ரிஷபம்','மிதுனம்','கடகம்','சிம்மம்','கன்னி','துலாம்','விருச்சிகம்','தனுசு','மகரம்','கும்பம்','மீனம்'];
const devanagari=['१','२','३','४','५','६','७','८','९','१०','११','१२'];
const shortNames={Sun:'சூ',Moon:'சந்',Mars:'செ',Mercury:'பு',Jupiter:'கு',Venus:'சு',Saturn:'ச',Rahu:'ரா',Ketu:'கே'};
const tamilNames={Sun:'சூரியன்',Moon:'சந்திரன்',Mars:'செவ்வாய்',Mercury:'புதன்',Jupiter:'குரு',Venus:'சுக்கிரன்',Saturn:'சனி',Rahu:'ராகு',Ketu:'கேது'};
const planetByHouse=Array.from({length:13},()=>[]);
for(const planet of golden.planets)planetByHouse[planet.house].push(tamilNames[planet.name]||planet.name);
const goldenData={
  bhavas:golden.bhavas,
  planets:golden.planets.map(planet=>({...planet,name:tamilNames[planet.name]||planet.name}))
};
const bhavaNode={innerHTML:''};
const fakeResult={querySelector(selector){assert.equal(selector,'#bhavaChart');return bhavaNode;}};
const executeProductionRenderer=new Function(
  'd','result','rasiIndex','romanHouse','getHoroscopeLang','shortPlanetName','esc',
  productionBhavaRenderer
);
executeProductionRenderer(
  goldenData,fakeResult,
  sign=>zodiac.indexOf(sign),
  house=>roman[Number(house)-1]||'—',
  ()=>'ta',
  name=>shortNames[Object.keys(tamilNames).find(key=>tamilNames[key]===name)]||name,
  value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))
);
assert.ok(bhavaNode.innerHTML,'The production render(d) Bhava Chart renderer must produce HTML.');
for(let house=1;house<=12;house++){
  assert.ok(bhavaNode.innerHTML.includes('data-bhava-house="'+house+'"'),
    'Production Bhava HTML must retain data-bhava-house for house '+house+'.');
  assert.ok(bhavaNode.innerHTML.includes('>'+roman[house-1]+'<'),
    'Production Bhava HTML must initially emit Roman numeral '+roman[house-1]+'.');
}
const bhavaRows=golden.bhavas.map(b=>{
  const names=planetByHouse[b.house].join(', ');
  return '<tr><td>'+b.house+'</td><td>'+b.arambha+'</td><td>'+b.madhya+'</td><td>'+b.antya+'</td><td>'+b.rasi+'</td><td>'+names+'</td></tr>';
}).join('');
const outputDir=fileURLToPath(new URL('../perambalur-sripati-golden-output/',import.meta.url));
const fixture=new URL('../public/horoscope/__perambalur_sripati_golden_fixture.html',import.meta.url);
await mkdir(outputDir,{recursive:true});
const html=[
  '<!doctype html><html lang="ta"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link rel="stylesheet" href="horoscope.css">',
  '<link rel="stylesheet" href="chart-style.css">',
  '<script defer src="chart-style.js"></script>',
  '</head><body class="smv-v12-theme"><main>',
  '<section id="tamilHoroscopeResult"><h3>Bhava Chart</h3>',
  '<div id="bhavaChart" class="south-indian-chart bhava-chart">'+bhavaNode.innerHTML+'</div>',
  '<table class="data-table bhava-table"><thead><tr><th>பாவம்</th><th>ஆரம்பம்</th><th>மத்தியம்</th><th>முடிவு</th><th>ராசி</th><th>கிரகங்கள்</th></tr></thead><tbody>'+bhavaRows+'</tbody></table>',
  '</section></main></body></html>'
].join('');
await writeFile(fixture,html,'utf8');

const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
try{
  const report={input:golden.input,utc:golden.utc,checks:[]};
  const expectedBySign=Array.from({length:12},()=>[]);
  golden.bhavas.forEach(b=>expectedBySign[b.rasiIndex].push(roman[b.house-1]));
  for(const width of [390,768,1280]){
    const page=await browser.newPage();
    await page.setViewport({width,height:1000,deviceScaleFactor:1});
    await page.goto(fixture.href,{waitUntil:'load'});
    await page.waitForFunction(()=>!!window.SMVChartPresentationV342);
    await page.waitForFunction(()=>document.querySelectorAll('#tamilHoroscopeResult #bhavaChart .bhava-house-no').length===12);
    const south=await page.evaluate(()=>{
      const chart=document.querySelector('#tamilHoroscopeResult #bhavaChart');
      const cells=[...chart.querySelectorAll(':scope > .south-rasi-cell')];
      return cells.map((cell,index)=>({
        sign:[11,0,1,2,10,3,9,4,8,7,6,5][index],
        labels:[...cell.querySelectorAll('.bhava-house-no')].map(el=>el.textContent.trim())
      }));
    });
    const southLabels=south.flatMap(cell=>cell.labels);
    assert.deepEqual([...southLabels].sort((a,b)=>roman.indexOf(a)-roman.indexOf(b)),roman,
      'Tamil South Bhava at '+width+'px displays every Roman house I–XII exactly once.');
    for(const cell of south){
      assert.deepEqual(cell.labels,expectedBySign[cell.sign],
        'Tamil South Bhava at '+width+'px keeps house labels grouped by actual Sripati Sphuta Rasi '+zodiac[cell.sign]+'.');
    }

    await page.evaluate(()=>window.SMVChartPresentationV342.setStyle('north'));
    await page.waitForFunction(()=>document.querySelectorAll('#tamilHoroscopeResult #bhavaChart > .smv-v342-cell[data-house]').length===12);
    const north=await page.evaluate(()=>{
      const chart=document.querySelector('#tamilHoroscopeResult #bhavaChart');
      return [...chart.querySelectorAll(':scope > .smv-v342-cell[data-house]')].map(cell=>{
        const overlay=chart.querySelector(':scope > .smv-v342-sign-number-overlay[data-house="'+cell.dataset.house+'"]');
        return {house:Number(cell.dataset.house),sign:Number(cell.dataset.sign),roman:cell.querySelector('.smv-v342-house-number')?.textContent.trim()||'',digit:overlay?.textContent.trim()||''};
      }).sort((a,b)=>a.house-b.house);
    });
    assert.equal(north.length,12,'North Bhava retains twelve actual house compartments at '+width+'px.');
    assert.deepEqual(north.map(cell=>cell.sign),golden.bhavas.map(b=>b.rasiIndex+1),
      'North Bhava Devanagari sign labels follow actual Perambalur Bhava Madhya Rasi values at '+width+'px.');
    assert.deepEqual(north.map(cell=>cell.roman),roman,
      'North Bhava house compartments retain Roman labels I–XII at '+width+'px.');
    assert.deepEqual(north.map(cell=>cell.digit),golden.bhavas.map(b=>devanagari[b.rasiIndex]),
      'North Bhava Rasi digits are the calculated Devanagari sign numbers at '+width+'px.');

    await page.evaluate(()=>window.SMVChartPresentationV342.setStyle('south'));
    await page.waitForFunction(()=>document.querySelectorAll('#tamilHoroscopeResult #bhavaChart .bhava-house-no').length===12);
    // Simulate late HTML restoration/legacy saved data re-inserting Arabic labels.
    await page.evaluate(()=>{
      for(const label of document.querySelectorAll('#tamilHoroscopeResult #bhavaChart .bhava-house-no')){
        label.textContent=label.dataset.bhavaHouse;
      }
    });
    await page.waitForFunction(()=>{
      const labels=[...document.querySelectorAll('#tamilHoroscopeResult #bhavaChart .bhava-house-no')];
      const sequence=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
      return labels.length===12&&sequence.every(value=>labels.some(label=>label.textContent.trim()===value));
    },{timeout:5000});
    const recovered=await page.evaluate(()=>[...document.querySelectorAll('#tamilHoroscopeResult #bhavaChart .bhava-house-no')].map(el=>el.textContent.trim()));
    assert.deepEqual([...recovered].sort((a,b)=>roman.indexOf(a)-roman.indexOf(b)),roman,
      'Tamil South Bhava auto-restores Roman I–XII after a late legacy Arabic-number DOM mutation at '+width+'px.');

    const screenshot=join(outputDir,'perambalur-sripati-bhava-'+width+'.png');
    await page.screenshot({path:screenshot,fullPage:true});
    report.checks.push({viewport:width,southRoman:true,northSphutaRasi:true,lateRestoreRoman:true});
    await page.close();
  }
  await writeFile(join(outputDir,'perambalur-sripati-golden-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{
  await browser.close();
}
console.log('Perambalur Sripati Golden Birth Case + production Bhava render + Tamil South Roman/North Sphuta browser smoke: PASS');
