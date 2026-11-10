import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const bytes = file => fs.readFileSync(path.join(root, file));
const maxBytes = 300000;

function assertPng(file) {
  const data = bytes(file);
  assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], file + ' must be PNG');
  assert.ok(data.length >= 24, file + ' must contain a PNG IHDR');
  assert.deepEqual({ width: data.readUInt32BE(16), height: data.readUInt32BE(20) }, { width: 512, height: 512 });
  assert.ok(data.length < maxBytes, file + ' must remain below 300 KB');
  return data;
}

test('HOROSCOPE and CALENDAR production launcher sources remain the lowercase icon folder PNGs', () => {
  const sources = [
    ['icon/horoscope_512.png', 'smvhoroscopeproduction', 'smv_horoscope'],
    ['icon/calendar_512.png', 'smvcalendarproduction', 'smv_calendar']
  ];
  const script = read('prepare-smv-horoscope-calendar-production-icons.sh');
  const helper = read('tools/prepare_android_launcher_icons.py');
  for (const [source, module, resourcePrefix] of sources) {
    assertPng(source);
    assert.ok(script.includes('copy_product_icon "' + source + '" ' + module + ' ' + resourcePrefix));
  }
  assert.ok(script.includes('python3 tools/prepare_android_launcher_icons.py'));
  assert.ok(script.includes('--content-dp 57'));
  assert.ok(helper.includes('CANVAS_DP = 108.0'));
  assert.ok(helper.includes('TARGET_DP = 57.0'));
  assert.ok(helper.includes('57.0 <= args.content_dp <= 58.0'));
  assert.ok(read('smvhoroscopeproduction/src/main/AndroidManifest.xml').includes('@mipmap/smv_horoscope_launcher'));
  assert.ok(read('smvcalendarproduction/src/main/AndroidManifest.xml').includes('@mipmap/smv_calendar_launcher'));
  assert.doesNotMatch(script, /prepare-icons\.sh|SmvProductLauncherIconGenerator|ICON\/SMV/);
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  for (const source of sources.map(item => item[0])) {
    assert.ok(workflow.includes(source), 'production workflow must trigger for ' + source);
  }
  assert.ok(workflow.includes('tools/prepare_android_launcher_icons.py'));
  assert.match(workflow, /Pillow==11\.3\.0/);
});

test('SMV HOROSCOPE roundIcon keeps its square corners inside Android 66dp circular safe zone', () => {
  const source = assertPng('icon/horoscope_512.png');
  const script = read('prepare-smv-horoscope-round-icon.sh');
  const helper = read('tools/prepare_android_round_launcher_icon.py');
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  const manifest = read('smvhoroscopeproduction/src/main/AndroidManifest.xml');
  const res = 'smvhoroscopeproduction/src/main/res';
  const roundForeground = res + '/drawable-nodpi/smv_horoscope_launcher_round_foreground.png';
  const roundLegacy = res + '/mipmap-nodpi/smv_horoscope_launcher_round.png';
  const ordinaryForeground = res + '/drawable-nodpi/smv_horoscope_launcher_foreground.png';
  const roundXml = read(res + '/mipmap-anydpi-v26/smv_horoscope_launcher_round.xml');

  assert.ok(source.length < maxBytes);
  assert.ok(script.includes('icon/horoscope_512.png'));
  assert.ok(script.includes('tools/prepare_android_round_launcher_icon.py'));
  assert.ok(script.includes('--roundIcon'));
  assert.ok(helper.includes('TARGET_DP = 46.0'));
  assert.ok(helper.includes('SAFE_CIRCLE_DP = 66.0'));
  assert.ok(helper.includes('diagonal_dp = effective_dp * sqrt(2)'));
  assert.ok(workflow.includes('Prepare round-mask-safe SMV HOROSCOPE roundIcon only'));
  assert.ok(workflow.includes('Verify SMV HOROSCOPE roundIcon fits the 66dp circular safe zone'));
  assert.ok(workflow.includes('prepare-smv-horoscope-round-icon.sh|tools/prepare_android_round_launcher_icon.py'));
  assert.ok(manifest.includes('android:roundIcon="@mipmap/smv_horoscope_launcher_round"'));
  assert.ok(roundXml.includes('@drawable/smv_horoscope_launcher_round_foreground'));
  assert.ok(roundXml.includes('@color/smv_launcher_background'));

  const roundFg = assertPng(roundForeground);
  const legacy = assertPng(roundLegacy);
  const regularFg = assertPng(ordinaryForeground);
  assert.notDeepEqual(roundFg, regularFg, 'HOROSCOPE roundIcon must use its own smaller foreground');
  assert.notDeepEqual(legacy, bytes(res + '/mipmap-nodpi/smv_horoscope_launcher.png'));

  const python = [
    'from PIL import Image',
    'from math import sqrt',
    'import sys',
    'fg = Image.open(sys.argv[1]).convert("RGBA")',
    'assert fg.size == (512, 512)',
    'assert fg.getchannel("A").getbbox() == (147, 147, 365, 365)',
    'legacy = Image.open(sys.argv[2]).convert("RGB")',
    'assert legacy.size == (512, 512)',
    'assert legacy.getpixel((0, 0)) == (255, 255, 255)',
    'effective_dp = 218 * 108 / 512',
    'assert effective_dp * sqrt(2) <= 66.0'
  ].join('\\n');
  execFileSync('python3', ['-c', python, roundForeground, roundLegacy], { cwd: root, stdio: 'pipe' });
});

test('HOROSCOPE and CALENDAR production launchers fit complete source artwork at 56.95dp', () => {
  const products = [
    ['icon/horoscope_512.png', 'smvhoroscopeproduction', 'smv_horoscope'],
    ['icon/calendar_512.png', 'smvcalendarproduction', 'smv_calendar']
  ];
  const pythonArgs = [];
  for (const [sourcePath, module, resourcePrefix] of products) {
    const source = assertPng(sourcePath);
    const res = module + '/src/main/res';
    const foreground = res + '/drawable-nodpi/' + resourcePrefix + '_launcher_foreground.png';
    const legacy = res + '/mipmap-nodpi/' + resourcePrefix + '_launcher.png';
    const round = res + '/mipmap-nodpi/' + resourcePrefix + '_launcher_round.png';
    for (const target of [foreground, legacy, round]) {
      const actual = assertPng(target);
      assert.notDeepEqual(actual, source, target + ' must be padded/scaled, not a full-bleed copy');
    }
    pythonArgs.push(foreground, legacy, round);

    for (const name of [resourcePrefix + '_launcher', resourcePrefix + '_launcher_round']) {
      const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
      assert.ok(xml.includes('@color/smv_launcher_background'));
      assert.ok(xml.includes('@drawable/' + resourcePrefix + '_launcher_foreground'));
    }
    assert.ok(read(res + '/values/colors.xml').includes('<color name="smv_launcher_background">#FFFFFF</color>'));
  }

  const python = [
    'from PIL import Image',
    'import sys',
    'for index in (1, 4):',
    '  fg = Image.open(sys.argv[index]).convert("RGBA")',
    '  assert fg.size == (512, 512)',
    '  assert fg.getchannel("A").getbbox() == (121, 121, 391, 391)',
    '  legacy = Image.open(sys.argv[index + 1]).convert("RGB")',
    '  assert legacy.size == (512, 512)',
    '  assert legacy.getpixel((0, 0)) == (255, 255, 255)',
    '  round_icon = Image.open(sys.argv[index + 2]).convert("RGB")',
    '  assert list(legacy.getdata()) == list(round_icon.getdata())'
  ].join('\n');
  execFileSync('python3', ['-c', python, ...pythonArgs], { cwd: root, stdio: 'pipe' });
});
