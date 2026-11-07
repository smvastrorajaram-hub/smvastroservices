import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const horoscope = read('smvhoroscopeproduction/src/main/java/in/smvastroservices/horoscope/MainActivity.java');
const workflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');

test('SMV HOROSCOPE native PDF actions are limited to the trusted report-print page', () => {
  assert.match(horoscope, /webView\.addJavascriptInterface\(new NativePdfBridge\(\), "SMVNativePdf"\)/);
  assert.match(horoscope, /@JavascriptInterface[\s\S]*?public void viewPdf\(\)/);
  assert.match(horoscope, /@JavascriptInterface[\s\S]*?public void downloadPdf\(\)/);
  assert.match(horoscope, /OWN_HOST\.equals\(lower\(uri\.getHost\(\)\)\)/);
  assert.match(horoscope, /"\/report-print\.html"\.equals\(uri\.getPath\(\)\)/);
  assert.match(horoscope, /!isHoroscopePrintPageUrl\(webView\.getUrl\(\)\)/);
});

test('PDF preview and save use Android A4 Print Framework with the existing report HTML', () => {
  assert.match(horoscope, /getSystemService\(android\.content\.Context\.PRINT_SERVICE\)/);
  assert.match(horoscope, /PrintAttributes\.MediaSize\.ISO_A4/);
  assert.match(horoscope, /new PrintAttributes\.Resolution\([^)]*300, 300\)/);
  assert.match(horoscope, /webView\.createPrintDocumentAdapter\(jobName\)/);
  assert.match(horoscope, /printManager\.print\(jobName,/);
  assert.match(horoscope, /Choose ‘Save as PDF’/);
  assert.match(horoscope, /Download PDF/);
  assert.match(horoscope, /window\.print=function\(\)/);
});

test('Mobile report tables scroll horizontally while A4 print CSS remains screen-independent', () => {
  assert.match(horoscope, /report-print\.css/);
  assert.match(horoscope, /sheet\.insertRule\(css,sheet\.cssRules\.length\)/);
  assert.match(horoscope, /@media screen and \(max-width:720px\)/);
  assert.match(horoscope, /smv-android-table-scroll/);
  assert.match(horoscope, /smv-android-wide-table/);
  assert.match(horoscope, /min-width:900px!important/);
  assert.match(horoscope, /south-indian-chart/);
  assert.match(horoscope, /MutationObserver/);
});

test('The PDF fix remains native-only and does not clear saved reports or origin storage', () => {
  assert.doesNotMatch(horoscope, /webView\.clearCache\s*\(/);
  assert.doesNotMatch(horoscope, /localStorage\.clear|sessionStorage\.clear|caches\.delete/);
  for (const file of [
    'smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java',
    'smvcalendarproduction/src/main/java/in/smvastroservices/calendar/MainActivity.java'
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /NativePdfBridge|smvAndroidPdfDownload|smv-android-wide-table/);
  }
  assert.match(workflow, /test\/android-horoscope-pdf-native\.test\.mjs/);
});

test('A Horoscope-only main-branch change does not allocate or publish a new Calendar APK', () => {
  assert.match(workflow, /smvhoroscopeproduction\/\*\|smvhoroscope\/\*\|test\/android-horoscope-pdf-native\.test\.mjs/);
  assert.match(workflow, /node scripts\/next-android-release-version\.mjs \$\{\{ steps\.app_targets\.outputs\.apps \}\}/);
  assert.match(workflow, /SMV_BUILD_HOROSCOPE/);
  assert.match(workflow, /SMV_BUILD_CALENDAR/);
  assert.match(workflow, /steps\.app_targets\.outputs\.horoscope == 'true'/);
  assert.match(workflow, /steps\.app_targets\.outputs\.calendar == 'true'/);
  assert.ok(workflow.includes('public/horoscope/sw.js|public/horoscope/calendar/sw.js'), 'shared offline cache changes must continue to rebuild both Android apps');
  assert.match(workflow, /smv-horoscope-apk-/);
  assert.match(workflow, /smv-calendar-apk-/);
});
