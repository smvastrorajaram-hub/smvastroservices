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
const inHostSourceChanged = changed.has('public/index.html')
  || changed.has('public/smvastro.mjs')
  || changed.has('public/dashboard-typography.css')
  || changed.has('public/sitemap.xml')
  || changed.has('public/sitemap.html')
  || [...changed].some(path => path.startsWith('public/astrology-guides/'));
if (!publicSourceChanged) {
  console.log('PASS: No public website/PWA source changed; no cache-version bump is required.');
  process.exit(0);
}

// A narrow exception for SMV ASTRO dashboard-only online-first asset URL updates.
// The HTML query strings bust the browser/SW request URLs; the shared offline shell
// version remains synchronized across all three apps because no shell files changed.
const changedPublic = [...changed].filter(path => path.startsWith('public/')).sort();
const astroDashboardAssets = ['public/dashboard-typography.css','public/index.html','public/smvastro.mjs'].sort();
if (changedPublic.length === astroDashboardAssets.length &&
    changedPublic.every((path, index) => path === astroDashboardAssets[index])) {
  const html = readFileSync('public/index.html', 'utf8');
  const previousHtml = execFileSync('git', ['show', baseRef + ':public/index.html'], { encoding: 'utf8' });
  const currentJs = /smvastro\.mjs\?v=([^"']+)/.exec(html)?.[1] || '';
  const previousJs = /smvastro\.mjs\?v=([^"']+)/.exec(previousHtml)?.[1] || '';
  const currentCss = /dashboard-typography\.css\?v=([^"']+)/.exec(html)?.[1] || '';
  const previousCss = /dashboard-typography\.css\?v=([^"']+)/.exec(previousHtml)?.[1] || '';
  assert.ok(currentJs && currentCss, 'ASTRO index.html must version both dashboard assets.');
  assert.notEqual(currentJs, previousJs, 'SMV ASTRO dashboard module URL must be cache-busted.');
  assert.notEqual(currentCss, previousCss, 'SMV ASTRO dashboard typography URL must be cache-busted.');
  assert.equal(currentJs, currentCss, 'SMV ASTRO dashboard assets must use one release version.');
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.ok(sw.includes("'./smvastro.mjs'") && sw.includes("'./dashboard-typography.css'"), 'ASTRO offline shell must retain both UI assets.');
  assert.ok(sw.includes("fetch(req,{cache:'no-store'})"), 'ASTRO static assets must remain network-first with offline fallback.');
  console.log('PASS: SMV ASTRO dashboard assets use explicit URL cache-busting; shared three-app offline shell releases remain untouched.');
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
  assert.notEqual(releases[i].pages, previous[i].pages,
    workers[i] + ' must bump the Pages.dev cache release for this public-source change.');
  if (inHostSourceChanged) {
    assert.notEqual(releases[i].legacy, previous[i].legacy,
      workers[i] + ' must bump the .in cache release when .in pages/content change.');
  } else {
    assert.equal(releases[i].legacy, previous[i].legacy,
      workers[i] + ' must preserve the .in cache release when the change is Pages.dev-only.');
  }
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
console.log('PASS: Pages.dev cache release ' + releases[0].pages + ' is synchronized across all three apps; .in cache release ' + releases[0].legacy + (inHostSourceChanged ? ' was also bumped for .in content.' : ' was preserved for a Pages.dev-only change.') );
