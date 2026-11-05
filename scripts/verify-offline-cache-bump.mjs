import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseRef = process.argv[2] || 'origin/main';
const changed = new Set(execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], { encoding: 'utf8' })
  .split(/\\r?\\n/).filter(Boolean));

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

function currentRelease(path) {
  const source = readFileSync(path, 'utf8');
  const match = /const SMV_CACHE_RELEASE='([^']+)'/.exec(source);
  assert.ok(match, path + ' must declare SMV_CACHE_RELEASE');
  return match[1];
}
function baseRelease(path) {
  const source = execFileSync('git', ['show', `${baseRef}:${path}`], { encoding: 'utf8' });
  const match = /const SMV_CACHE_RELEASE='([^']+)'/.exec(source);
  return match ? match[1] : '';
}

const releases = workers.map(currentRelease);
assert.equal(new Set(releases).size, 1, 'ASTRO, HOROSCOPE and CALENDAR must use one synchronized cache release marker.');
const previous = workers.map(baseRelease);
for (let i = 0; i < workers.length; i++) {
  assert.notEqual(releases[i], previous[i], workers[i] + ' must bump SMV_CACHE_RELEASE for this public-source change.');
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
console.log('PASS: Every public-source change updates all three independent app caches with synchronized release ' + releases[0] + '.');
