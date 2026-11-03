import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('HOROSCOPE and CALENDAR production icons use the same 58dp white-background geometry as SMV ASTRO', () => {
  const generator = read('tools/SmvProductLauncherIconGenerator.java');
  const astroGenerator = read('prepare-smv-astro-production-icon.sh');
  const buildScript = read('prepare-smv-horoscope-calendar-production-icons.sh');

  // Match the existing ASTRO launcher geometry exactly: 58dp tile, 16dp radius,
  // adaptive 108dp canvas and the equivalent 512px legacy/round fallbacks.
  for (const [pattern, label] of [
    [/ADAPTIVE_CANVAS = 432/, '108dp adaptive canvas'],
    [/ADAPTIVE_ART_SIZE = 232/, '58dp adaptive artwork tile'],
    [/ADAPTIVE_CORNER_RADIUS = 64/, '16dp adaptive corner radius'],
    [/LEGACY_CANVAS = 512/, '512px legacy canvas'],
    [/LEGACY_ART_SIZE = 275/, '58dp legacy artwork tile'],
    [/LEGACY_CORNER_RADIUS = 76/, '16dp legacy corner radius'],
    [/<color name="smv_launcher_background">#FFFFFF<\/color>/, 'pure white launcher background']
  ]) {
    assert.match(generator, pattern, 'missing ' + label);
  }

  for (const [pattern, label] of [
    [/ADAPTIVE_CANVAS = 432/, 'ASTRO adaptive canvas'],
    [/ADAPTIVE_ART_SIZE = 232/, 'ASTRO 58dp artwork tile'],
    [/ADAPTIVE_ART_CORNER_RADIUS = 64/, 'ASTRO 16dp adaptive radius'],
    [/ROUND_CANVAS = 512/, 'ASTRO legacy canvas'],
    [/ROUND_ART_SIZE = 275/, 'ASTRO legacy 58dp tile'],
    [/ROUND_ART_CORNER_RADIUS = 76/, 'ASTRO legacy 16dp radius'],
    [/LAUNCHER_BACKGROUND = 0xFFFFFF/, 'ASTRO white background']
  ]) {
    assert.match(astroGenerator, pattern, 'the product icon style must match ' + label);
  }

  assert.match(buildScript, /bash prepare-icons\.sh/);
  assert.match(buildScript, /copy_product_icon smvhoroscope smvhoroscopeproduction/);
  assert.match(buildScript, /copy_product_icon smvcalendar smvcalendarproduction/);
  assert.match(buildScript, /SmvProductLauncherIconGenerator/);
  assert.match(buildScript, /drawable-nodpi\/ic_launcher_foreground\.png/);
  assert.match(buildScript, /mipmap-nodpi\/ic_launcher\.png/);
  assert.match(buildScript, /mipmap-nodpi\/ic_launcher_round\.png/);
  assert.match(buildScript, /mipmap-anydpi-v26\/ic_launcher\.xml/);
  assert.match(buildScript, /values\/colors\.xml/);
  assert.doesNotMatch(buildScript, /public\/(horoscope|assets)\/.*(write|rm|delete)/i);
});

test('The generated adaptive resources preserve the white background and the independent artwork', () => {
  const generator = read('tools/SmvProductLauncherIconGenerator.java');
  const buildScript = read('prepare-smv-horoscope-calendar-production-icons.sh');
  const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');

  assert.match(generator, /@color\/smv_launcher_background/);
  assert.match(generator, /@drawable\/ic_launcher_foreground/);
  assert.match(generator, /removeOuterWhiteBackground/);
  assert.match(generator, /drawAdaptiveForeground/);
  assert.match(generator, /drawLegacyIcon/);
  assert.match(generator, /verifyTransparentCorners/);
  assert.match(generator, /verifyWhiteBackground/);
  assert.match(generator, /Generated 58dp centered launcher artwork/);

  for (const module of ['smvhoroscopeproduction', 'smvcalendarproduction']) {
    assert.ok(buildScript.includes('copy_product_icon ' + (module.startsWith('smvhoroscope') ? 'smvhoroscope' : 'smvcalendar') + ' ' + module));
    assert.ok(workflow.includes(module));
  }
  assert.match(workflow, /tools\/SmvProductLauncherIconGenerator\.java/);
  assert.match(workflow, /test\/android-horoscope-calendar-launcher-icons\.test\.mjs/);
  assert.match(workflow, /#FFFFFF/);
});
