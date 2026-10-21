import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const html = read("public/index.html");
const css = read("public/smvastro.css");
const uiCss = read("public/smv-ui.css");
const languageJs = read("public/smv-language.js");
const publicContent = read("public/public-content.mjs");
const horoscopeHtml = read("public/horoscope/index.html");
const calendarHtml = read("public/horoscope/calendar/index.html");

const tamilButton = html.indexOf('data-smv-site-language="ta"');
const subtitle = html.indexOf('class="smv-site-subtitle"');
const englishButton = html.indexOf('data-smv-site-language="en"');

assert.ok(tamilButton >= 0, "Tamil control must exist in the SMV ASTRO header");
assert.ok(subtitle > tamilButton, "Tamil control must be left of the subtitle");
assert.ok(englishButton > subtitle, "English control must be right of the subtitle");
assert.match(html, /smv-language\.js\?v=20261021-sitetranslation-v1/);
assert.match(html, /smvastro\.css\?v=20261021-sitetranslation-v1/);
assert.match(html, /smv-ui\.css\?v=20261021-sitetranslation-v1/);

assert.match(languageJs, /const STORAGE_KEY = "smv-astro-site-language-v1"/);
assert.match(languageJs, /localStorage\.setItem\(STORAGE_KEY, nextLanguage\)/);
assert.match(languageJs, /data-smv-site-language/);
assert.match(languageJs, /MutationObserver/);
assert.match(languageJs, /document\.documentElement\.lang = nextLanguage/);
assert.match(languageJs, /window\.dispatchEvent\(new CustomEvent\("smv-astro-language-change"/);
assert.match(languageJs, /"Traditional Wisdom\.": "மரபு ஞானம்\."/);
assert.match(languageJs, /"Have a Question About Your Life\?": "உங்கள் வாழ்க்கை குறித்து கேள்வி உள்ளதா\?"/);
assert.doesNotMatch(languageJs, /localStorage\.(?:getItem|setItem)\(["']smvLanguage["']/);
assert.doesNotMatch(languageJs, /smv-calendar-language/);

assert.match(publicContent, /smv-astro-site-language-v1/);
assert.match(publicContent, /window\.__smvApplyAstroLanguage/);
assert.match(css, /#smvPremiumHeaderV9 \.smv9-language-row/);
assert.match(css, /background:#74172a!important/);
assert.match(css, /background:#ffd66b!important/);
assert.match(uiCss, /\.smv9-language-row \.smv-site-subtitle/);
assert.doesNotMatch(horoscopeHtml, /smv-language\.js|data-smv-site-language/);
assert.doesNotMatch(calendarHtml, /smv-language\.js|data-smv-site-language/);

const enToTaBlock = languageJs.match(/const EN_TO_TA = Object\.freeze\(\{([\s\S]*?)\n  \}\);/);
assert.ok(enToTaBlock, "translation dictionary must be present");
const dictionaryEntries = (enToTaBlock[1].match(/^\s*".*":\s*"/gm) || []).length;
assert.ok(dictionaryEntries >= 200, `expected broad SMV ASTRO UI translation coverage, found ${dictionaryEntries}`);

assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, "CSS braces must balance");
console.log(`PASS: SMV ASTRO Tamil/English switch source checks (${dictionaryEntries} dictionary entries)`);
