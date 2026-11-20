import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const baseRef = process.argv[2] || 'origin/main';
const workerPaths = [
  'public/sw.js',
  'public/horoscope/sw.js',
  'public/horoscope/calendar/sw.js'
];
const changedText = execFileSync('git', ['diff', '--name-only', baseRef + '...HEAD'], { encoding: 'utf8' });
const changed = changedText.split(/\r?\n/).filter(Boolean);
const publicChanged = changed.some(path => path.startsWith('public/'));

if (!publicChanged) {
  console.log('PASS: No public source changed; the synchronized cache release is unchanged.');
  process.exit(0);
}

const tracked = execFileSync('git', ['ls-files', '-z', 'public'], { encoding: 'utf8' })
  .split('\0').filter(Boolean).sort();

function isPagesDevOnly(path) {
  return path.startsWith('public/pages-dev-') || path.split('/').pop().startsWith('pages-dev-');
}

function normalizedSource(path) {
  let source = readFileSync(path);
  if (workerPaths.includes(path)) {
    const text = source.toString('utf8');
    const marker = /(const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*)(?:'[^']+'|[A-Za-z0-9-]+)(\s*:\s*)(?:'[^']+'|[A-Za-z0-9-]+)/;
    if (!marker.test(text)) throw new Error(path + ' does not declare the expected host-specific SMV_CACHE_RELEASE.');
    source = Buffer.from(text.replace(marker, '$1__PAGES_DEV_RELEASE__$2__PRODUCTION_RELEASE__'));
  }
  return source;
}

function releaseFor(paths) {
  const hash = createHash('sha256');
  for (const path of paths) {
    hash.update(path, 'utf8');
    hash.update(Buffer.from([0]));
    hash.update(normalizedSource(path));
    hash.update(Buffer.from([0]));
  }
  return 'smv-' + hash.digest('hex').slice(0, 16);
}

const pagesFiles = tracked;
const productionFiles = tracked.filter(path => !isPagesDevOnly(path));
const pagesRelease = releaseFor(pagesFiles);
const productionRelease = releaseFor(productionFiles);

for (const path of workerPaths) {
  const source = readFileSync(path, 'utf8');
    const marker = /(const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*)'[^']+'(\s*:\s*)'[^']+'/;
  if (!marker.test(source)) throw new Error(path + ' does not declare the expected host-specific SMV_CACHE_RELEASE.');
  const updated = source.replace(marker, `$1'${pagesRelease}'$2'${productionRelease}'`);
  if (updated !== source) writeFileSync(path, updated, 'utf8');
}

console.log('Synchronized cache release generated from tracked public assets.');
console.log('Pages.dev: ' + pagesRelease);
console.log('.in production: ' + productionRelease);
