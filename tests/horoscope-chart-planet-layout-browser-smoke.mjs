import assert from 'node:assert/strict';
import {mkdir, writeFile, unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

const outputDir = fileURLToPath(new URL('../horoscope-chart-planet-layout-smoke-output/', import.meta.url));
const fixture = new URL('../public/horoscope/__horoscope_chart_planet_layout_fixture.html', import.meta.url);
await mkdir(outputDir, {recursive:true});

function chart(id, kind, emptyDash) {
  const extra = kind === 'bhava' ? ' bhava-rasi-cell' : '';
  const wrapper = kind === 'transit' ? 'transit-card' : '';
  const chartClass = kind === 'transit' ? 'south-indian-chart transit-chart' : 'south-indian-chart';
  const planetCell =
    '<div class="south-rasi-cell' + extra + '">' +
      '<div class="dynamic-rasi-number">2</div>' +
      (kind === 'bhava' ? '<div class="bhava-cusp"><span class="bhava-house-no">II</span></div>' : '') +
      '<div class="planet-line"><span class="planet-glyph">சூ</span></div>' +
      '<div class="planet-line"><span class="planet-glyph">சந்</span></div>' +
    '</div>';
  const emptyCell =
    '<div class="south-rasi-cell' + extra + '">' +
      '<div class="dynamic-rasi-number">3</div>' +
      (kind === 'bhava' ? '<div class="bhava-cusp"><span class="bhava-house-no">III</span></div>' : '') +
      (emptyDash ? '<span class="smv-v342-empty">—</span>' : '') +
    '</div>';
  return '<section class="' + wrapper + '">' +
    '<div id="' + id + '" class="' + chartClass + '" data-chart-kind="' + kind + '">' +
    planetCell + emptyCell + '</div></section>';
}

function resultRoot(id) {
  return '<section id="' + id + '">' +
    chart('rasiChart', 'rasi', true) +
    chart('navamsaChart', 'navamsa', false) +
    chart('transitChart', 'transit', true) +
    chart('bhavaChart', 'bhava', false) +
    '</section>';
}

const html = [
  '<!doctype html><html lang="ta"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<link rel="stylesheet" href="horoscope.css">',
  '<link rel="stylesheet" href="chart-style.css">',
  '</head><body class="smv-v12-theme"><main>',
  resultRoot('tamilHoroscopeResult'),
  resultRoot('englishHoroscopeResult'),
  '</main></body></html>'
].join('');

await writeFile(fixture, html, 'utf8');
const browser = await puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath(),
  headless: true
});
try {
  const page = await browser.newPage();
  for (const width of [390, 768, 1280]) {
    await page.setViewport({width, height:960, deviceScaleFactor:1});
    await page.goto(fixture.href, {waitUntil:'load'});
    const state = await page.evaluate(() => {
      const reports = [];
      for (const rootId of ['tamilHoroscopeResult','englishHoroscopeResult']) {
        const root = document.getElementById(rootId);
        for (const kind of ['rasi','navamsa','transit','bhava']) {
          const chart = [...root.querySelectorAll('[data-chart-kind]')]
            .find(el => el.dataset.chartKind === kind);
          const lines = [...chart.querySelectorAll('.planet-line')];
          const glyphs = [...chart.querySelectorAll('.planet-glyph')];
          const emptyCell = [...chart.querySelectorAll('.south-rasi-cell')]
            .find(cell => !cell.querySelector('.planet-line'));
          const emptyMark = emptyCell && emptyCell.querySelector('.smv-v342-empty');
          const emptyDash = Boolean(emptyMark && emptyMark.textContent.trim() === '—');
          reports.push({
            rootId, kind,
            lineCount:lines.length,
            glyphTexts:glyphs.map(el=>el.textContent.trim()),
            bottomBorders:lines.map(line => ({
              style:getComputedStyle(line).borderBottomStyle,
              width:getComputedStyle(line).borderBottomWidth
            })),
            planetColors:glyphs.map(el=>getComputedStyle(el).color),
            emptyDash
          });
        }
      }
      return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,reports};
    });
    assert.ok(state.documentWidth <= width + 2,
      'Horoscope chart fixture must not cause horizontal page overflow at ' + width + 'px.');
    for (const item of state.reports) {
      assert.equal(item.lineCount, 2, item.rootId + ' ' + item.kind + ': all planet rows must remain present.');
      assert.deepEqual(item.glyphTexts, ['சூ','சந்'],
        item.rootId + ' ' + item.kind + ': planet names must remain unchanged.');
      assert.ok(item.bottomBorders.every(border => border.style === 'none' || border.width === '0px'),
        item.rootId + ' ' + item.kind + ': planet separator borders must be absent: ' + JSON.stringify(item.bottomBorders));
      assert.ok(item.planetColors.every(color => color && color !== 'rgba(0, 0, 0, 0)'),
        item.rootId + ' ' + item.kind + ': planet text colour must remain visible.');
      if (item.kind === 'navamsa' || item.kind === 'bhava') {
        assert.equal(item.emptyDash, false,
          item.rootId + ' ' + item.kind + ': an empty planet cell must remain blank, without a dash.');
      } else {
        assert.equal(item.emptyDash, true,
          item.rootId + ' ' + item.kind + ': keep the pre-existing alternate-layout empty dash.');
      }
    }
    const image = join(outputDir, 'horoscope-four-chart-' + width + '.png');
    await page.screenshot({path:image, fullPage:true});
    console.log('HOROSCOPE FOUR-CHART LAYOUT', JSON.stringify({viewport:width,checks:state.reports.length}));
  }
} finally {
  await browser.close();
  await unlink(fixture).catch(()=>{});
}
console.log('Horoscope four-chart Chromium presentation smoke: PASS');
