import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const sourcePath = 'icon/astro_512.png';
const res = 'smvastroproduction/src/main/res';
const maxBytes = 700000;

function pngDimensions(data, file) {
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], file + ' must be PNG');
  assert.ok(data.length >= 24, file + ' must contain a PNG IHDR');
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

test('SMV ASTRO production launcher source stays the lowercase icon folder PNG', () => {
  const source = bytes(sourcePath);
  assert.deepEqual(pngDimensions(source, sourcePath), { width: 512, height: 512 });
  assert.ok(source.length < maxBytes, 'source PNG must remain below 700 KB');

  const script = read('prepare-smv-astro-production-icon.sh');
  const helper = read('tools/prepare_android_launcher_icons.py');
  assert.ok(script.includes('source_icon="icon/astro_512.png"'));
  assert.ok(script.includes('python3 tools/prepare_android_launcher_icons.py'));
  assert.ok(script.includes('--content-dp 58'));
  assert.ok(helper.includes('CANVAS_DP = 108.0'));
  assert.ok(helper.includes('TARGET_DP = 58.0'));
  assert.ok(helper.includes('58.0 <= args.content_dp <= 58.0'));
  assert.ok(helper.includes('effective_dp = target_px * CANVAS_DP / CANVAS_PX'));
  assert.doesNotMatch(script, /SmvProductLauncherIconGenerator|ICON\/SMV ASTRO\.jpg/);
  assert.ok(!script.includes('public/assets/'));

  const manifest = read('smvastroproduction/src/main/AndroidManifest.xml');
  assert.ok(manifest.includes('android:icon="@mipmap/smv_astro_launcher"'));
  assert.ok(manifest.includes('android:roundIcon="@mipmap/smv_astro_launcher_round"'));
  assert.doesNotMatch(manifest, /@mipmap\/ic_launcher/);

  const workflow = read('.github/workflows/build-smv-astro-production-apk.yml');
  for (const marker of [sourcePath, 'prepare-smv-astro-production-icon.sh', 'tools/prepare_android_launcher_icons.py', 'test/android-launcher-icon.test.mjs']) {
    assert.ok(workflow.includes(marker), 'ASTRO build workflow must include ' + marker);
  }
  assert.match(workflow, /Pillow==11\.3\.0/);
});

test('SMV ASTRO production launcher artwork is centered at 58.01dp on a 108dp canvas', () => {
  const source = bytes(sourcePath);
  const outputs = [
    res + '/mipmap-nodpi/smv_astro_launcher.png',
    res + '/mipmap-nodpi/smv_astro_launcher_round.png',
    res + '/drawable-nodpi/smv_astro_launcher_foreground.png'
  ];
  for (const file of outputs) {
    const image = bytes(file);
    assert.deepEqual(pngDimensions(image, file), { width: 512, height: 512 });
    assert.ok(image.length < maxBytes, file + ' must be below 300 KB');
    assert.notDeepEqual(image, source, file + ' must be padded/scaled, not copied full-bleed');
  }

  const foreground = outputs[2];
  const python = [
    'from PIL import Image',
    'import sys',
    'fg = Image.open(sys.argv[1]).convert("RGBA")',
    'assert fg.size == (512, 512)',
    'assert fg.getchannel("A").getbbox() == (118, 118, 393, 393)',
    'legacy = Image.open(sys.argv[2]).convert("RGB")',
    'assert legacy.size == (512, 512)',
    'assert legacy.getpixel((0, 0)) == (255, 255, 255)',
    'round_icon = Image.open(sys.argv[3]).convert("RGB")',
    'assert list(legacy.getdata()) == list(round_icon.getdata())'
  ].join('\n');
  execFileSync('python3', ['-c', python, foreground, outputs[0], outputs[1]], { cwd: root, stdio: 'pipe' });
});

test('SMV ASTRO production adaptive launcher resources retain the separate white background layer', () => {
  for (const name of ['smv_astro_launcher', 'smv_astro_launcher_round']) {
    const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
    assert.ok(xml.includes('@color/smv_launcher_background'));
    assert.ok(xml.includes('@drawable/smv_astro_launcher_foreground'));
  }
  assert.ok(read(res + '/values/colors.xml').includes('<color name="smv_launcher_background">#FFFFFF</color>'));
});
