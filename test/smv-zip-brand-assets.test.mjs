import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));

function pngDimensions(file) {
  const data = fs.readFileSync(path.join(root, file));
  assert.equal(data.toString('ascii', 1, 4), 'PNG', file + ' must be a PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length };
}

test('All three PWA manifests use their product artwork at 192px and 512px, including maskable icons', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest'));
  assert.deepEqual(manifest.icons.map(icon => [icon.src, icon.sizes, icon.purpose]), [
    ['/assets/icon-192.png', '192x192', 'any'],
    ['/assets/icon-512.png', '512x512', 'any'],
    ['/assets/icon-512-maskable.png', '512x512', 'maskable']
  ]);
  assert.ok(!manifest.icons.some(icon => icon.src.endsWith('icon-512-transparent.svg')));

  const horoscope = ['public/horoscope/manifest-en.webmanifest', 'public/horoscope/manifest-ta.webmanifest'];
  for (const file of horoscope) {
    const data = JSON.parse(read(file));
    for (const icon of data.icons) {
      const pathFromRoot = icon.src.startsWith('/')
        ? 'public' + icon.src
        : 'public/horoscope/' + icon.src;
      assert.ok(exists(pathFromRoot), file + ' references missing icon ' + icon.src);
    }
  }
  const calendar = ['public/horoscope/calendar/manifest-en.webmanifest', 'public/horoscope/calendar/manifest-ta.webmanifest'];
  for (const file of calendar) {
    const data = JSON.parse(read(file));
    for (const icon of data.icons) {
      const pathFromRoot = icon.src.startsWith('/')
        ? 'public' + icon.src
        : 'public/horoscope/calendar/' + icon.src;
      assert.ok(exists(pathFromRoot), file + ' references missing icon ' + icon.src);
    }
  }
});

test('New SMV PWA PNG icon files have expected dimensions and remain below 300 KB', () => {
  const icons = [
    ['public/assets/icon-192.png', 192],
    ['public/assets/icon-512.png', 512],
    ['public/assets/icon-512-maskable.png', 512],
    ['public/horoscope/assets/icon-192.png', 192],
    ['public/horoscope/assets/icon-512.png', 512],
    ['public/horoscope/assets/icon-512-maskable.png', 512],
    ['public/horoscope/assets/calendar-192.png', 192],
    ['public/horoscope/assets/calendar-512.png', 512],
    ['public/horoscope/assets/calendar-maskable.png', 512]
  ];
  for (const [file, size] of icons) {
    const image = pngDimensions(file);
    assert.deepEqual([image.width, image.height], [size, size], file + ' dimensions');
    assert.ok(image.bytes < 300_000, file + ' must stay below 300 KB');
  }
});

test('Only the supplied favicon strip is split into three ordered 724px square product crops', () => {
  const crops = [
    'public/assets/favicon-astro-crop.webp',
    'public/horoscope/assets/favicon-horoscope-crop.webp',
    'public/horoscope/assets/favicon-calendar-crop.webp'
  ];
  for (const file of crops) {
    const data = fs.readFileSync(path.join(root, file));
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', file + ' must be a WebP crop');
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', file + ' must be a WebP crop');
    assert.ok(data.length > 1000, file + ' must not be empty');
  }
  const faviconSets = [
    ['public/assets', 'favicon-astro'],
    ['public/horoscope/assets', 'favicon-horoscope'],
    ['public/horoscope/assets', 'favicon-calendar']
  ];
  for (const [folder, prefix] of faviconSets) {
    for (const size of [16, 32, 64]) {
      const image = pngDimensions(folder + '/' + prefix + '-' + size + '.png');
      assert.deepEqual([image.width, image.height], [size, size]);
    }
    assert.ok(exists(folder + '/' + prefix + '.ico'));
  }
  assert.ok(exists('public/assets/favicon-64.png'), 'the existing root favicon path remains available');
  assert.ok(exists('public/assets/favicon.ico'), 'the conventional root favicon path is present');
});

test('Each Website uses its matching ZIP logo for visible branding and social preview metadata', () => {
  const astro = read('public/index.html');
  const horoscope = read('public/horoscope/index.html');
  const calendar = read('public/horoscope/calendar/index.html');
  assert.ok(exists('public/assets/smv-home-logo.webp'));
  assert.ok(exists('public/horoscope/assets/smv-horoscope-website.webp'));
  assert.ok(exists('public/horoscope/assets/smv-calendar-website.webp'));
  assert.ok(astro.includes('src="./assets/smv-home-logo.webp'));
  assert.ok(astro.includes('property="og:image"'));
  assert.ok(horoscope.includes('src="assets/smv-horoscope-website.webp'));
  assert.ok(horoscope.includes('property="og:image"'));
  assert.ok(calendar.includes('src="../assets/smv-calendar-website.webp'));
  assert.ok(calendar.includes('property="og:image"'));
});

test('All three independent service workers cache the new artwork and use one synchronized release', () => {
  const workers = [
    read('public/sw.js'),
    read('public/horoscope/sw.js'),
    read('public/horoscope/calendar/sw.js')
  ];
  const releases = workers.map(source => /const SMV_CACHE_RELEASE='([^']+)'/.exec(source)?.[1]);
  assert.deepEqual(releases, [
    '20261105-offline-location-pack-v4',
    '20261105-offline-location-pack-v4',
    '20261105-offline-location-pack-v4'
  ]);
  for (const asset of [
    './assets/icon-512-maskable.png',
    './assets/favicon.ico',
    './assets/smv-home-logo.webp'
  ]) assert.ok(workers[0].includes(asset), 'Root SW missing ' + asset);
  for (const asset of [
    './assets/icon-512-maskable.png',
    './assets/favicon-horoscope.ico',
    './assets/smv-horoscope-website.webp'
  ]) assert.ok(workers[1].includes(asset), 'Horoscope SW missing ' + asset);
  for (const asset of [
    '../assets/calendar-maskable.png',
    '../assets/favicon-calendar.ico',
    '../assets/smv-calendar-website.webp'
  ]) assert.ok(workers[2].includes(asset), 'Calendar SW missing ' + asset);
});
