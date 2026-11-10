import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
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
  assert.ok(data.length < maxBytes, file + ' must already be below 300 KB');
  return data;
}

test('HOROSCOPE and CALENDAR production launcher inputs are the three-app lowercase icon folder PNGs', () => {
  const sources = [
    ['icon/horoscope_512.png', 'smvhoroscopeproduction', 'smv_horoscope'],
    ['icon/calendar_512.png', 'smvcalendarproduction', 'smv_calendar']
  ];
  const script = read('prepare-smv-horoscope-calendar-production-icons.sh');
  for (const [source, module, resourcePrefix] of sources) {
    assertPng(source);
    assert.ok(script.includes('copy_product_icon "' + source + '" ' + module + ' ' + resourcePrefix));
  }
  assert.ok(script.includes('cmp -s "$source_icon" "$asset"'));
  assert.ok(read('smvhoroscopeproduction/src/main/AndroidManifest.xml').includes('@mipmap/smv_horoscope_launcher'));
  assert.ok(read('smvcalendarproduction/src/main/AndroidManifest.xml').includes('@mipmap/smv_calendar_launcher'));
  assert.doesNotMatch(script, /prepare-icons\.sh|SmvProductLauncherIconGenerator|ICON\/SMV/);
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  for (const source of sources.map(item => item[0])) {
    assert.ok(workflow.includes(source), 'production workflow must trigger for ' + source);
  }
});

test('HOROSCOPE and CALENDAR production launcher resources are exact byte-for-byte PNG copies', () => {
  const products = [
    ['icon/horoscope_512.png', 'smvhoroscopeproduction', 'smv_horoscope'],
    ['icon/calendar_512.png', 'smvcalendarproduction', 'smv_calendar']
  ];
  for (const [sourcePath, module, resourcePrefix] of products) {
    const source = assertPng(sourcePath);
    const res = module + '/src/main/res';
    for (const target of [
      res + '/drawable-nodpi/' + resourcePrefix + '_launcher_foreground.png',
      res + '/mipmap-nodpi/' + resourcePrefix + '_launcher.png',
      res + '/mipmap-nodpi/' + resourcePrefix + '_launcher_round.png'
    ]) {
      const actual = bytes(target);
      assert.deepEqual(actual, source, target + ' must exactly match ' + sourcePath);
      assert.ok(actual.length < maxBytes);
    }
    for (const name of [resourcePrefix + '_launcher', resourcePrefix + '_launcher_round']) {
      const xml = read(res + '/mipmap-anydpi-v26/' + name + '.xml');
      assert.ok(xml.includes('@color/smv_launcher_background'));
      assert.ok(xml.includes('@drawable/' + resourcePrefix + '_launcher_foreground'));
    }
    assert.ok(read(res + '/values/colors.xml').includes('<color name="smv_launcher_background">#FFFFFF</color>'));
  }
});
