import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const res = 'smvastroproduction/src/main/res';

function pngInfo(file) {
  const data = bytes(file);
  assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a', file + ' must be a PNG');
  assert.equal(data.toString('ascii', 12, 16), 'IHDR', file + ' must contain PNG IHDR');
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20),
    bitDepth: data[24],
    colorType: data[25]
  };
}

test('Production Android manifest uses adaptive and round mipmap launcher names', () => {
  const manifest = read('smvastroproduction/src/main/AndroidManifest.xml');
  assert.match(manifest, /android:icon="@mipmap\/ic_launcher"/);
  assert.match(manifest, /android:roundIcon="@mipmap\/ic_launcher_round"/);
  assert.match(manifest, /android:label="@string\/app_name"/);
  assert.match(manifest, /android:name="asset_statements"/);
  assert.doesNotMatch(manifest, /android:icon="@drawable\/app_icon"/);
});

test('Adaptive launcher layers exist and foreground preserves transparent alpha', () => {
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
    assert.match(xml, /<adaptive-icon/);
    assert.match(xml, /@color\/smv_launcher_background/);
    assert.match(xml, /@drawable\/ic_launcher_foreground/);
  }
  const fg = pngInfo(res + '/drawable-nodpi/ic_launcher_foreground.png');
  assert.deepEqual([fg.width, fg.height], [432, 432]);
  assert.equal(fg.colorType, 6, 'adaptive foreground must preserve an alpha channel');
  assert.match(read(res + '/values/colors.xml'), /<color name="smv_launcher_background">#[0-9A-F]{6}<\/color>/);
});

test('Legacy square fallback remains identical to the existing 512px artwork', () => {
  const original = pngInfo('public/assets/icon-512.png');
  const square = pngInfo(res + '/mipmap-nodpi/ic_launcher.png');
  const round = pngInfo(res + '/mipmap-nodpi/ic_launcher_round.png');
  assert.deepEqual([original.width, original.height], [512, 512]);
  assert.deepEqual([square.width, square.height], [512, 512]);
  assert.deepEqual([round.width, round.height], [512, 512]);
  assert.equal(round.colorType, 6, 'round fallback must have transparent corners outside its circular mask');
  assert.deepEqual(bytes('public/assets/icon-512.png'), bytes(res + '/mipmap-nodpi/ic_launcher.png'));
});

test('Android preparation uses repository artwork and never fetches the production website', () => {
  const script = read('prepare-smv-astro-production-icon.sh');
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  assert.match(script, /public\/assets\/icon-512\.png/);
  assert.match(script, /SmvLauncherIconGenerator/);
  assert.doesNotMatch(script, /curl|wget|smvastroservices\.in/i);
  assert.ok(workflow.indexOf('Prepare official SMV ASTRO app icon') < workflow.indexOf('Verify Android adaptive and legacy launcher icon resources'));
  assert.match(workflow, /test\/android-launcher-icon\.test\.mjs/);
});
