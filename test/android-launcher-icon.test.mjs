import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const sourcePath = 'icon/astro_512.png';
const res = 'smvastroproduction/src/main/res';
const maxBytes = 300000;

function pngDimensions(data, file) {
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], file + ' must be PNG');
  assert.ok(data.length >= 24, file + ' must contain a PNG IHDR');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

test('SMV ASTRO production launcher source is the existing lowercase icon folder PNG', () => {
  const source = bytes(sourcePath);
  assert.deepEqual(pngDimensions(source, sourcePath), { width: 512, height: 512 });
  assert.ok(source.length < maxBytes, 'source PNG must already be below 300 KB');
  const script = read('prepare-smv-astro-production-icon.sh');
  assert.ok(script.includes('source_icon="icon/astro_512.png"'));
  assert.ok(script.includes('cp "$source_icon" "$res/mipmap-nodpi/ic_launcher.png"'));
  assert.ok(script.includes('cp "$source_icon" "$res/mipmap-nodpi/ic_launcher_round.png"'));
  assert.ok(script.includes('cmp -s "$source_icon" "$asset"'));
  assert.doesNotMatch(script, /SmvProductLauncherIconGenerator|ICON\/SMV ASTRO\.jpg/);
  assert.ok(!script.includes('public/assets/'));
  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  for (const marker of [sourcePath, 'prepare-smv-astro-production-icon.sh', 'test/android-launcher-icon.test.mjs']) {
    assert.ok(workflow.includes(marker), 'ASTRO build workflow must include ' + marker);
  }
});

test('SMV ASTRO production launcher resources are exact, unchanged PNG copies below 300 KB', () => {
  const source = bytes(sourcePath);
  const outputs = [
    res + '/mipmap-nodpi/ic_launcher.png',
    res + '/mipmap-nodpi/ic_launcher_round.png',
    res + '/drawable-nodpi/ic_launcher_foreground.png'
  ];
  for (const file of outputs) {
    const image = bytes(file);
    assert.deepEqual(pngDimensions(image, file), { width: 512, height: 512 });
    assert.ok(image.length < maxBytes, file + ' must be below 300 KB');
    assert.deepEqual(image, source, file + ' must be an exact byte-for-byte copy of ' + sourcePath);
  }
});

test('SMV ASTRO production adaptive launcher resources retain their white background', () => {
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
    assert.ok(xml.includes('@color/smv_launcher_background'));
    assert.ok(xml.includes('@drawable/ic_launcher_foreground'));
  }
  assert.ok(read(res + '/values/colors.xml').includes('<color name="smv_launcher_background">#FFFFFF</color>'));
});
