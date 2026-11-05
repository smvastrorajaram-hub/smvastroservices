import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file));
const exists = file => fs.existsSync(path.join(root, file));

function pngSize(file) {
  const data = read(file);
  assert.deepEqual(data.subarray(0, 8), Buffer.from([137,80,78,71,13,10,26,10]), file + ' must be a PNG');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), bytes: data.length };
}
function webp(file) {
  const data = read(file);
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', file + ' must use RIFF container');
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', file + ' must be WebP');
  assert.ok(data.length > 1000, file + ' must contain optimized artwork');
}
function assertIcons(manifestPath, expected) {
  const manifest = JSON.parse(read(manifestPath).toString('utf8'));
  for (const icon of expected) {
    const entry = manifest.icons.find(item => item.src === icon.src);
    assert.ok(entry, manifestPath + ' must include ' + icon.src);
    assert.equal(entry.sizes, icon.sizes);
    assert.equal(entry.type, 'image/png');
    assert.equal(entry.purpose, icon.purpose);
    assert.ok(exists(icon.file), 'Missing PWA icon file: ' + icon.file);
    const size = pngSize(icon.file);
    const dimension = Number(icon.sizes.split('x')[0]);
    assert.deepEqual([size.width, size.height], [dimension, dimension], icon.file + ' dimensions');
    assert.ok(size.bytes < 300000, icon.file + ' must stay below 300 KB');
  }
}

test('SMV ASTRO, HOROSCOPE and CALENDAR PWA manifests use their matching ZIP artwork', () => {
  assertIcons('public/manifest.webmanifest', [
    {src:'/assets/icon-192.png',sizes:'192x192',purpose:'any',file:'public/assets/icon-192.png'},
    {src:'/assets/icon-512.png',sizes:'512x512',purpose:'any',file:'public/assets/icon-512.png'},
    {src:'/assets/icon-512-maskable.png',sizes:'512x512',purpose:'maskable',file:'public/assets/icon-512-maskable.png'}
  ]);
  for (const manifest of ['public/horoscope/manifest-en.webmanifest','public/horoscope/manifest-ta.webmanifest']) {
    assertIcons(manifest, [
      {src:'assets/icon-192.png',sizes:'192x192',purpose:'any',file:'public/horoscope/assets/icon-192.png'},
      {src:'assets/icon-512.png',sizes:'512x512',purpose:'any',file:'public/horoscope/assets/icon-512.png'},
      {src:'assets/icon-512-maskable.png',sizes:'512x512',purpose:'maskable',file:'public/horoscope/assets/icon-512-maskable.png'}
    ]);
  }
  for (const manifest of ['public/horoscope/calendar/manifest-en.webmanifest','public/horoscope/calendar/manifest-ta.webmanifest']) {
    assertIcons(manifest, [
      {src:'/horoscope/assets/calendar-192.png',sizes:'192x192',purpose:'any',file:'public/horoscope/assets/calendar-192.png'},
      {src:'/horoscope/assets/calendar-512.png',sizes:'512x512',purpose:'any',file:'public/horoscope/assets/calendar-512.png'},
      {src:'/horoscope/assets/calendar-maskable.png',sizes:'512x512',purpose:'maskable',file:'public/horoscope/assets/calendar-maskable.png'}
    ]);
  }
});

test('Website logo art uses matching optimized WebP files', () => {
  for (const file of [
    'public/assets/smv-home-logo.webp',
    'public/horoscope/assets/smv-horoscope-website.webp',
    'public/horoscope/assets/smv-calendar-website.webp'
  ]) webp(file);
  assert.match(read('public/index.html').toString('utf8'), /src="\.\/assets\/smv-home-logo\.webp\?v=20261105-smv-zip-assets-v1"/);
  assert.match(read('public/horoscope/index.html').toString('utf8'), /smv-horoscope-website\.webp\?v=20261105-smv-zip-assets-v1/);
  assert.match(read('public/horoscope/calendar/index.html').toString('utf8'), /smv-calendar-website\.webp\?v=20261105-smv-zip-assets-v1/);
});

test('The combined favicon strip has exactly three separately named product crops', () => {
  for (const file of [
    'public/assets/favicon-astro-crop.webp',
    'public/horoscope/assets/favicon-horoscope-crop.webp',
    'public/horoscope/assets/favicon-calendar-crop.webp'
  ]) webp(file);
  const sets = [
    ['public/assets/favicon-astro-16.png','public/assets/favicon-astro-32.png','public/assets/favicon-astro-64.png','public/assets/favicon-astro.ico'],
    ['public/horoscope/assets/favicon-horoscope-16.png','public/horoscope/assets/favicon-horoscope-32.png','public/horoscope/assets/favicon-horoscope-64.png','public/horoscope/assets/favicon-horoscope.ico'],
    ['public/horoscope/assets/favicon-calendar-16.png','public/horoscope/assets/favicon-calendar-32.png','public/horoscope/assets/favicon-calendar-64.png','public/horoscope/assets/favicon-calendar.ico']
  ];
  for (const [small,medium,large,ico] of sets) {
    assert.deepEqual([pngSize(small).width,pngSize(small).height],[16,16]);
    assert.deepEqual([pngSize(medium).width,pngSize(medium).height],[32,32]);
    assert.deepEqual([pngSize(large).width,pngSize(large).height],[64,64]);
    const data=read(ico);
    assert.equal(data.readUInt16LE(0),0,'ICO reserved field');
    assert.equal(data.readUInt16LE(2),1,'ICO type field');
    assert.ok(data.readUInt16LE(4)>=1,'ICO must contain at least one icon image');
  }
  assert.deepEqual([pngSize('public/assets/favicon-64.png').width,pngSize('public/assets/favicon-64.png').height],[64,64]);
  assert.ok(exists('public/assets/favicon.ico'));
});

test('Each product website declares its own favicon and social preview', () => {
  const astro=read('public/index.html').toString('utf8');
  const horoscope=read('public/horoscope/index.html').toString('utf8');
  const calendar=read('public/horoscope/calendar/index.html').toString('utf8');
  assert.match(astro,/assets\/favicon\.ico\?v=20261105-smv-zip-assets-v1/);
  assert.match(horoscope,/assets\/favicon-horoscope\.ico\?v=20261105-smv-zip-assets-v1/);
  assert.match(calendar,/assets\/favicon-calendar\.ico\?v=20261105-smv-zip-assets-v1/);
  assert.match(astro,/assets\/smv-home-logo\.webp/);
  assert.match(horoscope,/og:image" content="https:\/\/horoscope\.smvastroservices\.in\/assets\/smv-horoscope-website\.webp"/);
  assert.match(calendar,/og:image" content="https:\/\/calendar\.smvastroservices\.in\/assets\/smv-calendar-website\.webp"/);
});
