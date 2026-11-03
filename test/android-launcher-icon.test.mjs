import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const res = 'smvastroproduction/src/main/res';

function decodeRgbaPng(file) {
  const data = bytes(file);
  assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', file + ' must be PNG');
  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);
  const bitDepth = data[24];
  const colorType = data[25];
  assert.equal(bitDepth, 8, file + ' must use 8-bit channels');
  assert.equal(colorType, 6, file + ' must contain an RGBA alpha channel');

  const chunks = [];
  let offset = 8;
  while (offset < data.length) {
    const length = data.readUInt32BE(offset);
    const type = data.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(data.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
    if (type === 'IEND') break;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  let rawOffset = 0;

  function paeth(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  }

  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++];
    const rowStart = y * stride;
    const prevStart = rowStart - stride;
    for (let x = 0; x < stride; x++) {
      const value = raw[rawOffset++];
      const left = x >= 4 ? pixels[rowStart + x - 4] : 0;
      const up = y > 0 ? pixels[prevStart + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[prevStart + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      else assert.equal(filter, 0, file + ' uses a supported PNG filter');
      pixels[rowStart + x] = (value + predictor) & 255;
    }
  }
  return {
    width, height, pixels,
    alphaAt(x, y) { return pixels[(y * width + x) * 4 + 3]; }
  };
}

test('Android icon source is isolated from all website and PWA icon assets', () => {
  const sourcePath = 'smvastroproduction/launcher/icon-512.png';
  const source = bytes(sourcePath);
  assert.equal(source.toString('hex', 0, 8), '89504e470d0a1a0a');
  assert.equal(source.toString('ascii', 12, 16), 'IHDR');
  assert.deepEqual([source.readUInt32BE(16), source.readUInt32BE(20)], [512, 512]);
  const script = read('prepare-smv-astro-production-icon.sh');
  assert.match(script, /source_icon="smvastroproduction\/launcher\/icon-512\.png"/);
  assert.doesNotMatch(script, /source_icon="public\/assets\/icon-512\.png"/);
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  assert.equal((workflow.match(/"smvastroproduction\/launcher\/icon-512\.png"/g) || []).length, 2);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /Allocate the next permanent Android release version on main pushes/);
  assert.match(workflow, /release_sequence=\$\(\(GITHUB_RUN_NUMBER - 327\)\)/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
});

test('Production manifest points at adaptive and round launcher resources without changing app identity', () => {
  const manifest = read('smvastroproduction/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
  assert.match(manifest, /android:label="@string\/app_name"/);
  assert.match(manifest, /android:name="asset_statements"/);
  assert.doesNotMatch(manifest, /android:icon="@drawable\/app_icon"/);
});

test('The existing artwork is cleaned only at the outer white canvas and retains the gold-framed center', () => {
  const source = bytes('public/assets/icon-512.png');
  const sourceWidth = source.readUInt32BE(16), sourceHeight = source.readUInt32BE(20);
  assert.deepEqual([sourceWidth, sourceHeight], [512, 512]);

  const square = decodeRgbaPng(res + '/mipmap-nodpi/ic_launcher.png');
  assert.deepEqual([square.width, square.height], [512, 512]);
  for (const [x, y] of [[0,0],[511,0],[0,511],[511,511]]) {
    assert.equal(square.alphaAt(x, y), 0, 'outer square canvas corner must be transparent');
  }
  assert.ok(square.alphaAt(256, 256) > 200, 'the center of the existing SMV ASTRO artwork must remain opaque');
  assert.ok(square.alphaAt(256, 40) > 0, 'the upper gold frame must remain present');
  assert.ok(square.alphaAt(256, 256) > 0, 'the icon artwork must not be erased');
});

test('Adaptive foreground and legacy round fallback preserve the alpha mask', () => {
  const foreground = decodeRgbaPng(res + '/drawable-nodpi/ic_launcher_foreground.png');
  assert.deepEqual([foreground.width, foreground.height], [432, 432]);
  for (const [x, y] of [[0,0],[431,0],[0,431],[431,431]]) {
    assert.equal(foreground.alphaAt(x, y), 0, 'adaptive foreground outer corner must be transparent');
  }
  assert.ok(foreground.alphaAt(216, 216) > 200, 'adaptive icon must retain the central logo');

  const round = decodeRgbaPng(res + '/mipmap-nodpi/ic_launcher_round.png');
  assert.deepEqual([round.width, round.height], [512, 512]);
  for (const [x, y] of [[0,0],[511,0],[0,511],[511,511]]) {
    assert.equal(round.alphaAt(x, y), 0, 'round legacy fallback corners must be transparent');
  }
  assert.ok(round.alphaAt(256, 256) > 200, 'round fallback must retain the central artwork');
});

test('Adaptive XML layers resolve to the dedicated foreground and a separate burgundy background', () => {
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
    assert.match(xml, /<adaptive-icon/);
    assert.match(xml, /@color\/smv_launcher_background/);
    assert.match(xml, /@drawable\/ic_launcher_foreground/);
  }
  assert.match(read(res + '/values/colors.xml'), /<color name="smv_launcher_background">#260719<\/color>/);
});

test('The icon preparation never replaces website assets or downloads another logo', () => {
  const script = read('prepare-smv-astro-production-icon.sh');
  assert.match(script, /public\/assets\/icon-512\.png/);
  assert.match(script, /removeOuterWhiteBackground/);
  assert.match(script, /isOuterBackgroundCandidate/);
  assert.match(script, /verifyTransparentCorners/);
  assert.doesNotMatch(script, /curl|wget|smvastroservices\.in/i);
  assert.doesNotMatch(script, /curl|wget|smvastroservices\.in/i);
  assert.ok(read('.github/workflows/build-smv-astro-production-apk.yml').includes("github.ref == 'refs/heads/fix/android-launcher-mask-background-20261103' && 'v1.7'"));
});
