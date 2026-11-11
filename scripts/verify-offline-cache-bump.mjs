import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] || 'origin/main';
const changedText = execFileSync('git', ['diff', '--name-only', baseRef + '...HEAD'], { encoding: 'utf8' });
const changed = new Set(changedText.split(/\r?\n/).filter(Boolean));

const workers = [
  'public/sw.js',
  'public/horoscope/sw.js',
  'public/horoscope/calendar/sw.js'
];
const publicSourceChanged = [...changed].some(path => path.startsWith('public/'));
if (!publicSourceChanged) {
  console.log('PASS: No public website/PWA source changed; no cache-version bump is required.');
  process.exit(0);
}

const missing = workers.filter(path => !changed.has(path));
assert.deepEqual(missing, [], 'Every public website/PWA change must update all three app service workers. Missing: ' + missing.join(', '));

function releasePair(source, path) {
  const scoped = /const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/.exec(source);
  if (scoped) return { pages: scoped[1], legacy: scoped[2] };
  const single = /const SMV_CACHE_RELEASE='([^']+)'/.exec(source);
  assert.ok(single, path + ' must declare SMV_CACHE_RELEASE');
  return { pages: single[1], legacy: single[1] };
}
function currentRelease(path) {
  return releasePair(readFileSync(path, 'utf8'), path);
}
function baseRelease(path) {
  const source = execFileSync('git', ['show', baseRef + ':' + path], { encoding: 'utf8' });
  return releasePair(source, path);
}

const releases = workers.map(currentRelease);
assert.equal(new Set(releases.map(item => item.pages)).size, 1,
  'ASTRO, HOROSCOPE and CALENDAR must use one synchronized Pages.dev cache release marker.');
assert.equal(new Set(releases.map(item => item.legacy)).size, 1,
  'ASTRO, HOROSCOPE and CALENDAR must preserve one synchronized .in cache release marker.');
const previous = workers.map(baseRelease);
for (let i = 0; i < workers.length; i++) {
  assert.notEqual(releases[i].pages, previous[i].legacy,
    workers[i] + ' must bump the Pages.dev cache release for this public-source change.');
  assert.equal(releases[i].legacy, previous[i].legacy,
    workers[i] + ' must preserve the existing .in cache release.');
}
const expectedCacheNames = [
  "APP_SHELL_CACHE='smv-astro-shell-'+SMV_CACHE_RELEASE",
  "SHELL_CACHE='smv-horoscope-shell-'+SMV_CACHE_RELEASE",
  "CACHE='smv-calendar-forecast-assets-'+SMV_CACHE_RELEASE"
];
for (let i = 0; i < workers.length; i++) {
  const source = readFileSync(workers[i], 'utf8');
  assert.ok(source.includes(expectedCacheNames[i]), workers[i] + ' must derive its own cache namespace from SMV_CACHE_RELEASE.');
}
console.log('PASS: Pages.dev cache release ' + releases[0].pages + ' is synchronized across all three apps; .in keeps ' + releases[0].legacy + '.');
