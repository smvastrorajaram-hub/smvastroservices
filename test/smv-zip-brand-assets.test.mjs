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

test('PWA manifests use the uploaded artwork, 192 variants and maskable assets', () => {
  const manifests = [
    ['public/manifest.webmanifest','/assets/pwa-astro'],
    ['public/horoscope/manifest-en.webmanifest','assets/pwa-horoscope'],
    ['public/horoscope/manifest-ta.webmanifest','assets/pwa-horoscope'],
    ['public/horoscope/calendar/manifest-en.webmanifest','/horoscope/assets/pwa-calendar'],
    ['public/horoscope/calendar/manifest-ta.webmanifest','/horoscope/assets/pwa-calendar']
  ];
  for (const [file,prefix] of manifests) {
    const manifest = JSON.parse(read(file));
    assert.deepEqual(manifest.icons.map(icon => [icon.src,icon.sizes,icon.type,icon.purpose]), [
      [prefix+'-192.svg', '192x192', 'image/svg+xml', 'any'],
      [prefix+'-512.png', '512x512', 'image/png', 'any'],
      [prefix+'-maskable-192.svg', '192x192', 'image/svg+xml', 'maskable'],
      [prefix+'-maskable.svg', 'any', 'image/svg+xml', 'maskable']
    ]);
    for (const icon of manifest.icons) {
      const target = icon.src.startsWith('/') ? 'public'+icon.src : path.join(path.dirname(file),icon.src);
      assert.ok(exists(target), file+' references missing icon '+icon.src);
    }
  }
  for (const [file,size] of [
    ['public/assets/pwa-astro-512.png',512],
    ['public/horoscope/assets/pwa-horoscope-512.png',512],
    ['public/horoscope/assets/pwa-calendar-512.png',512],
    ['public/assets/favicon-astro.png',64],
    ['public/horoscope/assets/favicon-horoscope.png',64],
    ['public/horoscope/assets/favicon-calendar.png',64]
  ]) assert.deepEqual(pngDimensions(file),[size,size],file+' image dimensions');
  for (const [file,size] of [
    ['public/assets/pwa-astro-192.svg',192],['public/assets/pwa-astro-maskable-192.svg',192],['public/assets/pwa-astro-maskable.svg',512],
    ['public/horoscope/assets/pwa-horoscope-192.svg',192],['public/horoscope/assets/pwa-horoscope-maskable-192.svg',192],['public/horoscope/assets/pwa-horoscope-maskable.svg',512],
    ['public/horoscope/assets/pwa-calendar-192.svg',192],['public/horoscope/assets/pwa-calendar-maskable-192.svg',192],['public/horoscope/assets/pwa-calendar-maskable.svg',512]
  ]) {
    const svg=read(file);
    assert.ok(svg.includes('data:image/png;base64,'),file+' embeds the exact uploaded source');
    assert.ok(svg.includes('width="'+size+'" height="'+size+'"'),file+' has the declared dimensions');
  }
  for (const file of [
    'public/assets/pwa-astro-maskable-192.svg','public/assets/pwa-astro-maskable.svg',
    'public/horoscope/assets/pwa-horoscope-maskable-192.svg','public/horoscope/assets/pwa-horoscope-maskable.svg',
    'public/horoscope/assets/pwa-calendar-maskable-192.svg','public/horoscope/assets/pwa-calendar-maskable.svg'
  ]) assert.ok(read(file).includes('x="51.2" y="51.2" width="409.6" height="409.6"'),file+' keeps artwork within the centered safe area');
});

test('Each website uses its own uploaded favicon, cache-busted manifest and touch icon', () => {
  const pages = [
    ['public/index.html','public/assets','favicon-astro','./assets/pwa-astro-512.png'],
    ['public/horoscope/index.html','public/horoscope/assets','favicon-horoscope','assets/pwa-horoscope-512.png'],
    ['public/horoscope/calendar/index.html','public/horoscope/assets','favicon-calendar','../assets/pwa-calendar-512.png']
  ];
  for (const [page,folder,prefix,touch] of pages) {
    const html=read(page),png=folder+'/'+prefix+'.png',ico=folder+'/'+prefix+'.ico';
    assert.deepEqual(pngDimensions(png),[64,64],png+' favicon dimensions');
    assert.ok(exists(ico),ico+' ICO exists');
    assert.ok(fs.readFileSync(path.join(root,ico)).subarray(0,4).equals(Buffer.from([0,0,1,0])),ico+' has ICO signature');
    const faviconVersion = prefix==='favicon-calendar' ? '20261110-calendar-favicon-v3' : '20261110-pwa-icons-v1';
    assert.ok(html.includes(prefix+'.png?v='+faviconVersion),page+' references its own favicon PNG');
    assert.ok(html.includes(prefix+'.ico?v='+faviconVersion),page+' references its own ICO');
    assert.ok(html.includes(touch+'?v=20261110-pwa-icons-v1'),page+' uses its matching iOS touch icon');
  }
  assert.ok(read('public/index.html').includes('manifest.webmanifest?v=20261110-pwa-icons-v1'));
  assert.ok(read('public/horoscope/index.html').includes('manifest-en.webmanifest?v=20261110-pwa-icons-v1'));
  assert.ok(read('public/horoscope/calendar/index.html').includes('manifest-en.webmanifest?v=20261110-calendar-favicon-v3'));
  assert.ok(read('public/horoscope/calendar/index.html').includes('<title>SMV CALENDAR | Tamil Panchang and Calendar</title>'));
  assert.deepEqual(fs.readFileSync(path.join(root,'public/horoscope/assets/favicon-calendar.png')),
    fs.readFileSync(path.join(root,'icon/fevicon/calendar.png')),
    'Calendar favicon matches the latest icon/fevicon/calendar.png source');
});

test('Horoscope and Calendar show their own product logos, titles and consistent headers', () => {
  const astro=read('public/index.html');
  const horoscope=read('public/horoscope/index.html');
  const calendar=read('public/horoscope/calendar/index.html');
  const css=read('public/horoscope/horoscope.css');
  const calendarTheme=read('public/horoscope/calendar-theme.css');
  assert.ok(exists('public/assets/smv-home-logo.webp'));
  assert.ok(astro.includes('src="./assets/smv-home-logo.webp?v=20261105-brand-header-v1"'));
  assert.ok(exists('public/horoscope/assets/smv-horoscope-website.webp'), 'Horoscope must use its dedicated product logo.');
  assert.ok(horoscope.includes('class="smv-horoscope-brand-header"'));
  assert.ok(exists('public/horoscope/assets/smv-horoscope-header-logo.png'));
  assert.deepEqual(pngDimensions('public/horoscope/assets/smv-horoscope-header-logo.png'),[1024,1024]);
  assert.ok(horoscope.includes('src="./assets/smv-horoscope-header-logo.png?v=20261110-pwa-icons-v1"'));
  assert.ok(horoscope.includes('smv-horoscope-website.webp'));
  assert.ok(horoscope.includes('alt="SMV HOROSCOPE logo"'));
  assert.ok(horoscope.includes('SMV HOROSCOPE'));
  assert.ok(!horoscope.includes('SMV ASTRO SERVICES</span>'));
  assert.ok(css.includes('.smv-horoscope-brand-title'));
  assert.ok(css.includes('font-family:Georgia,"Times New Roman",serif'));
  assert.ok(css.includes('rgb(255,0,0)'), 'Horoscope product title must be red.');
  assert.ok(css.includes('height:42px;min-height:42px'));
  assert.ok(css.includes('#smvHoroscopeAuth .header-account .action-row>.btn'));
  assert.ok(exists('public/horoscope/assets/smv-calendar-website.webp'), 'Calendar must use its dedicated product logo.');
  assert.ok(calendar.includes('src="../assets/smv-calendar-website.webp"'));
  assert.ok(calendar.includes('alt="SMV CALENDAR logo"'));
  assert.ok(calendar.includes('SMV CALENDAR'));
  assert.ok(calendar.includes('class="calendar-header-actions"'));
  assert.ok(calendar.includes('calendar-language-switch'));
  assert.ok(calendar.includes('calendar-topbar'));
  assert.ok(calendarTheme.includes('html body.calendar-only>header.calendar-topbar'));
  assert.ok(calendarTheme.includes('background:#0f514c!important'), "Calendar header must retain the established site green.");
  assert.ok(calendarTheme.includes('grid-template-columns:repeat(4,minmax(0,1fr))'));
  assert.ok(calendarTheme.includes('.calendar-brand-title'));
  assert.ok(calendarTheme.includes('height:42px!important'));
  assert.ok(horoscope.includes('id="languageTamil"')&&horoscope.includes('id="languageEnglish"'));
  assert.ok(horoscope.includes('data-login')&&horoscope.includes('data-register')&&horoscope.includes('data-logout'));
});

test('All three independent Service Workers share one new cache release and cache the intended website artwork', () => {
  const workers=[read('public/sw.js'),read('public/horoscope/sw.js'),read('public/horoscope/calendar/sw.js')];
  const versions=workers.map(source=>/const SMV_CACHE_RELEASE\s*=\s*IS_PAGES_DEV_HOST\s*\?\s*'([^']+)'\s*:\s*'([^']+)'/.exec(source));
  assert.ok(versions.every(Boolean),'Each app worker selects a Pages.dev and legacy cache release.');
  assert.deepEqual(versions.map(match=>match[1]),['20261112-bonus-credit-direct-award-pages-v1','20261112-bonus-credit-direct-award-pages-v1','20261112-bonus-credit-direct-award-pages-v1']);
  assert.deepEqual(versions.map(match=>match[2]),['20261112-bonus-credit-direct-award-in-v1','20261112-bonus-credit-direct-award-in-v1','20261112-bonus-credit-direct-award-in-v1']);
  assert.ok(workers[0].includes("'./assets/favicon-astro.ico'"));
  assert.ok(workers[0].includes("'./assets/favicon-astro.png'"));
  assert.ok(workers[0].includes("'./assets/pwa-astro-192.svg'"));
  assert.ok(workers[0].includes("'./assets/pwa-astro-512.png'"));
  assert.ok(workers[0].includes("'./assets/pwa-astro-maskable-192.svg'"));
  assert.ok(workers[0].includes("'./assets/smv-home-logo.webp'"));
  assert.ok(workers[1].includes("'./assets/favicon-horoscope.ico'"));
  assert.ok(workers[1].includes("'./assets/favicon-horoscope.png'"));
  assert.ok(workers[1].includes("'./assets/pwa-horoscope-192.svg'"));
  assert.ok(workers[1].includes("'./assets/pwa-horoscope-512.png'"));
  assert.ok(workers[1].includes("'./assets/pwa-horoscope-maskable-192.svg'"));
  assert.ok(workers[1].includes("'./assets/smv-horoscope-header-logo.png'"));
  assert.ok(workers[1].includes("'./assets/smv-horoscope-website.webp'"));
  assert.ok(workers[2].includes("'../assets/favicon-calendar.ico'"));
  assert.ok(workers[2].includes("'../assets/favicon-calendar.png'"));
  assert.ok(workers[2].includes("'../assets/pwa-calendar-192.svg'"));
  assert.ok(workers[2].includes("'../assets/pwa-calendar-512.png'"));
  assert.ok(workers[2].includes("'../assets/pwa-calendar-maskable-192.svg'"));
  assert.ok(workers[2].includes("'../assets/smv-calendar-website.webp'"));
});

test('All three Service Workers validate the India total from the manifest, not the sum of shard metadata', () => {
  const manifest = JSON.parse(read('public/horoscope/offline/places/india-manifest.json'));
  assert.equal(manifest.records, 557995, 'The manifest declares the canonical total number of India places.');
  assert.equal(Object.keys(manifest.shards || {}).length, 28, 'The complete offline pack contains all 28 shards.');

  const workers = [
    'public/sw.js',
    'public/horoscope/sw.js',
    'public/horoscope/calendar/sw.js'
  ];
  for (const file of workers) {
    const source = read(file);
    assert.ok(source.includes('const records=Number(manifest?.records);'), file + ' must read the canonical total from manifest.records.');
    assert.ok(source.includes('if(!Number.isSafeInteger(records)||records!==557995)'), file + ' must validate the manifest total.');
    assert.ok(!source.includes('entries.reduce((sum,[,item])=>sum+(Number(item?.records)||0),0)'), file + ' must not treat the sum of shard metadata as the global place count.');
  }
});
