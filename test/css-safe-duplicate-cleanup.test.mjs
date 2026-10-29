import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../public/smvastro.css', import.meta.url), 'utf8');
const occurrences = (source, needle) => source.split(needle).length - 1;

test('safe CSS cleanup removes only exact duplicate declarations in the same source scope', () => {
  const exactBlocks = [
    '.smv-master-top:where(:not(.smv-css-island,.smv-css-island *)){background:#fff8e7!important}',
    '#askNowSection.smv-new-asknow{background:#fff8e7!important;border:0!important;border-radius:0!important;box-shadow:none!important;}',
    '#dashboardContent #astroAnsweredBox .answer-meta-value:where(:not(.smv-css-island,.smv-css-island *)){color:#6b4b1e!important;-webkit-text-fill-color:#6b4b1e!important;}',
    '#dashboardContent #astroQuestionQueue .answer-meta-value:where(:not(.smv-css-island,.smv-css-island *)){color:#6b4b1e!important;-webkit-text-fill-color:#6b4b1e!important;}',
    '#dashboardContent .withdrawal-history-section .withdrawal-meta-value:where(:not(.smv-css-island,.smv-css-island *)){color:#b91c1c!important}'
  ];
  for (const block of exactBlocks) {
    assert.equal(occurrences(css, block), 1, 'expected one canonical copy of '+block.slice(0,100));
  }
});

test('stylesheet keeps essential Astro/dashboard and consultation selectors', () => {
  for (const marker of [
    '#dashboardContent #astroAnsweredBox .answer-meta-value',
    '#dashboardContent #astroQuestionQueue .answer-meta-value',
    '#dashboardContent .withdrawal-history-section .withdrawal-meta-value',
    '#askNowSection.smv-new-asknow',
    '.smv-master-top:where'
  ]) assert.ok(css.includes(marker), 'missing existing CSS selector: '+marker);
});
