import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const astro = read('smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java');
const astroWorkflow = read('.github/workflows/build-smv-astro-production-apk.yml');
const horoscope = read('smvhoroscopeproduction/src/main/java/in/smvastroservices/horoscope/MainActivity.java');
const horoscopeIndex = read('public/horoscope/index.html');
const reportPage = read('public/horoscope/report-print.html');
const reportScript = read('public/horoscope/report-print.js');
const reportStore = read('public/horoscope/report-store.mjs');

test('SMV ASTRO PDF route guard matches the real redirected report URL and preserves the legacy route', () => {
  assert.ok(astro.includes("webView.addJavascriptInterface(new NativePdfBridge(), \"SMVAstroNativePdf\")"), "ASTRO native PDF bridge is installed");
  assert.ok(astro.includes("@JavascriptInterface\n        public void viewPdf()"), "View PDF native action remains");
  assert.ok(astro.includes("@JavascriptInterface\n        public void downloadPdf()"), "Download PDF native action remains");
  assert.ok(astro.includes("\"horoscope.smvastroservices.in\".equals(host)"), "Only the canonical Horoscope host is accepted");
  assert.ok(astro.includes("\"/report-print.html\".equals(path)"), "Canonical saved-report route is accepted");
  assert.ok(astro.includes("ownsHost(host)"), "Legacy own-host route remains explicitly supported");
  assert.ok(astro.includes("\"/horoscope/report-print.html\".equals(path)"), "Exact legacy report route is supported");
  assert.ok(astro.includes("(port == -1 || port == 443)"), "Only default HTTPS or port 443 is accepted");
  assert.ok(horoscopeIndex.includes("https://horoscope.smvastroservices.in/"), "The Horoscope shell redirects to the canonical host");
  assert.ok(reportStore.includes("report-print.html?mode="), "The saved-report handoff uses the relative print route");
  assert.ok(astro.includes('NativeWebBridge.install(this, webView)'), 'Existing FCM and native Google sign-in bridge must remain installed');
});;;

test('SMV ASTRO PDF buttons call native bridge through a document capture listener', () => {
  assert.match(astro, /document\.addEventListener\('click',clickHandler,true\)/);
  assert.match(astro, /target\.closest\?target\.closest\('#printNow,#smvAstroAndroidPdfDownload'\)/);
  assert.match(astro, /event\.stopImmediatePropagation\(\)/);
  assert.match(astro, /var bridge=window\.SMVAstroNativePdf/);
  assert.match(astro, /bridge\.viewPdf\(\)/);
  assert.match(astro, /bridge\.downloadPdf\(\)/);
  assert.match(astro, /window\.print=function\(\)\{invoke\(false\);\}/);
  assert.match(reportScript, /button\.onclick=\(\)=>\{document\.title=reportPdfTitle\(report\);window\.print\(\);\}/);
  assert.match(reportStore, /location\.assign\(\`report-print\.html\?mode=/);
});

test('SMV ASTRO PDF preview and Save as PDF use Android A4 Print Framework', () => {
  assert.match(astro, /getSystemService\(Context\.PRINT_SERVICE\)/);
  assert.match(astro, /PrintAttributes\.MediaSize\.ISO_A4/);
  assert.match(astro, /new PrintAttributes\.Resolution\([^)]*300, 300\)/);
  assert.match(astro, /webView\.createPrintDocumentAdapter\(jobName\)/);
  assert.match(astro, /printManager\.print\(jobName,/);
  assert.match(astro, /SMV ASTRO Horoscope PDF View/);
  assert.match(astro, /SMV ASTRO Horoscope PDF Download/);
  assert.match(astro, /Choose ‘Save as PDF’/);
});

test('SMV ASTRO Android mobile and print layouts format charts and wide tables', () => {
  assert.match(reportPage, /report-print\.css/);
  assert.match(astro, /@media screen and \(max-width:720px\)/);
  assert.match(astro, /smv-android-table-scroll/);
  assert.match(astro, /smv-android-wide-table/);
  assert.match(astro, /min-width:900px!important/);
  assert.match(astro, /south-indian-chart/);
  assert.match(astro, /MutationObserver/);
  assert.match(astro, /applyAstroHoroscopeReportLayout\(view, url\)/);
  assert.match(astro, /var printCss='@media print\{/);
  assert.match(astro, /smv-android-table-scroll[^']*overflow:visible!important/);
  assert.match(astro, /table\.smv-android-wide-table\{width:100%!important;min-width:0!important/);
  assert.match(astro, /south-indian-chart\{display:grid!important;width:132mm!important/);
  assert.match(astro, /sbc-grid-full\{width:174mm!important/);
});

test('SMV ASTRO PDF fix does not clear website state or alter SMV HOROSCOPE app source', () => {
  assert.doesNotMatch(astro, /webView\.clearCache\s*\(/);
  assert.doesNotMatch(astro, /localStorage\.clear|sessionStorage\.clear|caches\.delete/);
  assert.doesNotMatch(horoscope, /SMVAstroNativePdf|smvAstroAndroidPdfDownload|applyAstroHoroscopeReportLayout/);
  assert.ok(astro.includes('webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> openExternal(Uri.parse(url)))'),
    'Existing SMV ASTRO download routing must remain intact');
});

test('SMV ASTRO production workflow runs native PDF regression checks and still releases only the ASTRO app', () => {
  assert.match(astroWorkflow, /test\/android-astro-pdf-native\.test\.mjs/);
  assert.match(astroWorkflow, /smvastroproduction\/\*\*/);
  assert.match(astroWorkflow, /node scripts\/next-android-release-version\.mjs astro/);
  assert.match(astroWorkflow, /:smvastroproduction:assembleRelease/);
  assert.match(astroWorkflow, /smv-astro-apk-\$\{\{ env\.SMV_ANDROID_VERSION_NAME \}\}-run-/);
  assert.match(astroWorkflow, /SMV_ANDROID_KEY_ALIAS/);
  assert.match(astroWorkflow, /apksigner" verify --verbose --print-certs/);
  const horoscopeCalendarWorkflow = read('.github/workflows/build-smv-horoscope-calendar-production-apks.yml');
  assert.equal(horoscopeCalendarWorkflow.includes('smvastroproduction/src/main/java/in/smvastroservices/smvastro/MainActivity.java'), false,
    'ASTRO-only Java changes must not trigger the Horoscope/Calendar production workflow');
});
