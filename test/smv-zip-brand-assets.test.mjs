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
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
}

test('PWA manifests and image assets retain their pre-existing icon mappings', () => {
  const astro = JSON.parse(read('public/manifest.webmanifest'));
  assert.deepEqual(astro.icons.map(icon => [icon.src, icon.sizes, icon.purpose]), [
    ['/assets/icon-192.png', '192x192', 'any'],
    ['/assets/icon-512.png', '512x512', 'any']
  ]);

  const horoscopes = ['public/horoscope/manifest-en.webmanifest', 'public/horoscope/manifest-ta.webmanifest'];
  for (const file of horoscopes) {
    const manifest = JSON.parse(read(file));
    assert.ok(manifest.icons.length >= 2, file + ' must retain its PWA icons');
    for (const icon of manifest.icons) {
      const target = icon.src.startsWith('/')
        ? 'public' + icon.src
        : 'public/horoscope/' + icon.src;
      assert.ok(exists(target), file + ' references missing icon ' + icon.src);
    }
  }

  const calendars = ['public/horoscope/calendar/manifest-en.webmanifest', 'public/horoscope/calendar/manifest-ta.webmanifest'];
  for (const file of calendars) {
    const manifest = JSON.parse(read(file));
    assert.ok(manifest.icons.length >= 2, file + ' must retain its PWA icons');
    for (const icon of manifest.icons) {
      const target = icon.src.startsWith('/')
        ? 'public' + icon.src
        : 'public/horoscope/calendar/' + icon.src;
      assert.ok(exists(target), file + ' references missing icon ' + icon.src);
    }
  }

  for (const [file,size] of [
    ['public/assets/icon-192.png',192],['public/assets/icon-512.png',512],
    ['public/horoscope/assets/icon-192.png',192],['public/horoscope/assets/icon-512.png',512],
    ['public/horoscope/assets/calendar-192.png',192],['public/horoscope/assets/calendar-512.png',512]
  ]) assert.deepEqual(pngDimensions(file),[size,size],file+' PWA artwork dimensions');
});

test('Each website uses its matching original SMV WEBSITE artwork as its browser favicon', () => {
  const pages = [
    ['public/index.html','favicon-astro'],
    ['public/horoscope/index.html','favicon-horoscope'],
    ['public/horoscope/calendar/index.html','favicon-calendar']
  ];
  for (const [page,prefix] of pages) {
    const html=read(page);
    const folder=page==='public/index.html'?'public/assets':'public/horoscope/assets';
    for (const size of [16,32,64]) {
      const file=folder+'/'+prefix+'-'+size+'.png';
      assert.deepEqual(pngDimensions(file),[size,size],file+' favicon dimensions');
      assert.ok(html.includes(prefix+'-'+size+'.png?v=20261105-active-only-auto-busy-v1'),page+' must reference its own tab icon');
    }
    const ico=folder+'/'+prefix+'.ico';
    assert.ok(exists(ico),ico+' ICO must exist');
    assert.ok(fs.readFileSync(path.join(root,ico)).subarray(0,4).equals(Buffer.from([0,0,1,0])),ico+' must be an ICO file');
    assert.ok(html.includes(prefix+'.ico?v=20261105-active-only-auto-busy-v1'),page+' must reference its own ICO');
  }
  assert.ok(read('public/index.html').includes('href="./manifest.webmanifest?v=20261105-active-only-auto-busy-v1" rel="manifest"'));
});

test('Horoscope and Calendar logo headers are removed while Horoscope controls remain in one row', () => {
  const astro=read('public/index.html');
  const horoscope=read('public/horoscope/index.html');
  const calendar=read('public/horoscope/calendar/index.html');
  const css=read('public/horoscope/horoscope.css');
  assert.ok(exists('public/assets/smv-home-logo.webp'));
  assert.ok(astro.includes('src="./assets/smv-home-logo.webp?v=20261105-brand-header-v1"'));
  assert.ok(!horoscope.includes('smv-horoscope-brandbar'));
  assert.ok(!horoscope.includes('alt="SMV HOROSCOPE logo"'));
  assert.ok(!calendar.includes('smv-calendar-brandbar'));
  assert.ok(!calendar.includes('alt="SMV CALENDAR logo"'));
  assert.ok(horoscope.includes('id="languageTamil"')&&horoscope.includes('id="languageEnglish"'));
  assert.ok(horoscope.includes('data-login')&&horoscope.includes('data-register')&&horoscope.includes('data-logout'));
  assert.ok(css.includes('flex-wrap:nowrap'));
  assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
  assert.ok(calendar.includes('calendar-language-switch'));
  assert.ok(calendar.includes('calendar-topbar'));
});

test('All three independent Service Workers share one new cache release and cache the intended website artwork', () => {
  const workers=[read('public/sw.js'),read('public/horoscope/sw.js'),read('public/horoscope/calendar/sw.js')];
  const versions=workers.map(source=>/const SMV_CACHE_RELEASE='([^']+)'/.exec(source)?.[1]);
  assert.deepEqual(versions,['20261105-active-only-auto-busy-v1','20261105-active-only-auto-busy-v1','20261105-active-only-auto-busy-v1']);
  assert.ok(workers[0].includes("'./assets/favicon-astro.ico'"));
  assert.ok(workers[0].includes("'./assets/smv-home-logo.webp'"));
  assert.ok(workers[1].includes("'./assets/favicon-horoscope.ico'"));
  assert.ok(workers[1].includes("'./assets/smv-horoscope-website.webp'"));
  assert.ok(workers[2].includes("'../assets/favicon-calendar.ico'"));
  assert.ok(workers[2].includes("'../assets/smv-calendar-website.webp'"));
});
