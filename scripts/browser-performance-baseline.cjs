#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const targets = [
  { name: 'SMV ASTRO', url: 'https://smvastroservices.in/' },
  { name: 'SMV ASTRO Pages fallback', url: 'https://smvastroservices.pages.dev/' },
  { name: 'SMV HOROSCOPE', url: 'https://horoscope.smvastroservices.in/' },
  { name: 'SMV CALENDAR', url: 'https://calendar.smvastroservices.in/' }
];
const repeatCount = 3;
const reportDir = path.resolve(process.env.PERF_REPORT_DIR || '.browser-performance-reports');
const lighthouseBin = process.env.LIGHTHOUSE_BIN;
if (!lighthouseBin || !fs.existsSync(lighthouseBin)) throw new Error('LIGHTHOUSE_BIN must point to the installed Lighthouse CLI.');
fs.mkdirSync(reportDir, { recursive: true });

function numeric(report, id) {
  const value = report?.audits?.[id]?.numericValue;
  return Number.isFinite(value) ? value : null;
}
function score(report, category) {
  const value = report?.categories?.[category]?.score;
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function fmt(value, suffix = '') { return value == null ? 'n/a' : `${Math.round(value * 10) / 10}${suffix}`; }

const outcomes = [];
for (const [targetIndex, target] of targets.entries()) {
  const readings = [];
  const errors = [];
  for (let sample = 1; sample <= repeatCount; sample++) {
    const safeName = target.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const reportPath = path.join(reportDir, `${safeName}-sample-${sample}.json`);
    const args = [
      target.url, '--quiet', '--output=json', `--output-path=${reportPath}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      '--max-wait-for-load=45000', '--disable-full-page-screenshot',
      '--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage'
    ];
    const result = spawnSync(lighthouseBin, args, { encoding: 'utf8', timeout: 240000, env: process.env });
    if (result.error || result.status !== 0 || !fs.existsSync(reportPath)) {
      const detail = [result.error?.message, result.stderr, result.stdout].filter(Boolean).join('\n').slice(-2500);
      errors.push(`sample ${sample}: ${detail || `exit status ${result.status}`}`);
      continue;
    }
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      readings.push({
        sample, finalUrl: report.finalDisplayedUrl || report.requestedUrl,
        performance: score(report, 'performance'), accessibility: score(report, 'accessibility'),
        bestPractices: score(report, 'best-practices'), seo: score(report, 'seo'),
        fcpMs: numeric(report, 'first-contentful-paint'), lcpMs: numeric(report, 'largest-contentful-paint'),
        tbtMs: numeric(report, 'total-blocking-time'), cls: numeric(report, 'cumulative-layout-shift'),
        speedIndexMs: numeric(report, 'speed-index'),
        transferBytes: numeric(report, 'total-byte-weight')
      });
    } catch (error) { errors.push(`sample ${sample}: invalid Lighthouse JSON: ${error.message}`); }
  }
  const fields = ['performance','accessibility','bestPractices','seo','fcpMs','lcpMs','tbtMs','cls','speedIndexMs','transferBytes'];
  const medians = Object.fromEntries(fields.map(field => [field, median(readings.map(row => row[field]))]));
  outcomes.push({ ...target, readings, errors, medians, samples: readings.length });
}

const lines = [
  '# SMV Website Browser Performance Baseline',
  '',
  `- Date (UTC): ${new Date().toISOString()}`,
  '- Method: Lighthouse CLI with headless Chrome, default mobile emulation/throttling, 3 samples per public URL; report medians to reduce single-run noise.',
  '- This is a lab synthetic baseline, not field CrUX/RUM data and not a before/after improvement claim.',
  '',
  '| Site | Samples | Perf | A11y | Best practices | SEO | FCP ms | LCP ms | TBT ms | CLS | Speed Index ms | Transfer bytes |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'
];
for (const item of outcomes) {
  const m=item.medians;
  lines.push(`| ${item.name} | ${item.samples}/3 | ${fmt(m.performance)} | ${fmt(m.accessibility)} | ${fmt(m.bestPractices)} | ${fmt(m.seo)} | ${fmt(m.fcpMs)} | ${fmt(m.lcpMs)} | ${fmt(m.tbtMs)} | ${fmt(m.cls, '')} | ${fmt(m.speedIndexMs)} | ${fmt(m.transferBytes)} |`);
  if (item.errors.length) lines.push('', `#### ${item.name} sample errors`, ...item.errors.map(error => `- ${error.replace(/\n/g, ' ')}`));
}
lines.push('', '## Individual samples', '');
for (const item of outcomes) {
  lines.push(`### ${item.name}`, '', `URL: ${item.url}`, '');
  for (const row of item.readings) lines.push(`- Sample ${row.sample}: performance ${fmt(row.performance)}, FCP ${fmt(row.fcpMs, ' ms')}, LCP ${fmt(row.lcpMs, ' ms')}, TBT ${fmt(row.tbtMs, ' ms')}, CLS ${fmt(row.cls)}, transfer ${fmt(row.transferBytes, ' bytes')}; final URL: ${row.finalUrl}`);
  lines.push('');
}
const summary = lines.join('\n') + '\n';
fs.writeFileSync(path.join(reportDir, 'summary.md'), summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
process.stdout.write(summary);
const failed = outcomes.filter(item => item.samples === 0);
if (failed.length) {
  console.error(`Lighthouse produced no valid samples for: ${failed.map(item => item.name).join(', ')}`);
  process.exitCode = 1;
}
