import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'smv-output-pdf-audit';
assert.ok(fs.existsSync(dir), 'PDF text output directory must exist');
const files = fs.readdirSync(dir)
  .filter(name => name.endsWith('.txt') && name !== 'smv-output-pdf-audit-summary.txt')
  .sort();
assert.ok(files.length >= 2, 'Expected at least two extracted SMV report PDFs');

const topics = [
  ['Horoscope / பலன்கள்', /horoscope|jathaka|ஜாதக|பலன்|தசா|திசை|கணிப்பு/i],
  ['Ayurdaya', /ayurdaya|ஆயுர்த்தாயம்|ஆயுர்தாயம்|பிண்ட ஆயுள்|நைசர்க்கிக ஆயுள்/i],
  ['Amsa', /amsa|அம்ச/i],
  ['Shadbala', /shadbala|சட்பல|ஷட்பல|ஸ்தான பலம்|Sthana Bala/i],
  ['Vimshottari Dasha', /Vimshottari|விம்சோத்தரி|மகாதசை|Mahadasha/i],
  ['Bhukti', /Bhukti|புக்தி/i],
  ['Antaram', /Antaram|Antharam|அந்தரம்|அந்தர்தசை|Pratyantara/i],
  ['Removed source/status labels', /Uttara Kalamrita இடைக்காலக் கூறுகள்|இறுதி சட்பலச் சான்றிதழ் அல்ல|Yuddha \(UK\)|யுத்தம் \(UK\)|Jathaka Kanitham/i],
  ['Matching / பொருத்தம்', /matching|பொருத்தம்|தினம்|கணம்|யோனி|ராசி பொருத்தம்/i],
  ['Marriage / திருமணம்', /marriage|திருமண|களத்திர|மாங்கல்ய/i]
];

const compact = value => String(value || '')
  .normalize('NFKC')
  .replace(/\s+/g, ' ')
  .replace(/[|•·]+/g, ' ')
  .trim();
const summary = [];
summary.push('SMV output PDF text audit — diagnostics only; not a mathematical or prediction-accuracy certification.');
summary.push('Files: ' + files.length);

for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  assert.ok(text.trim().length > 500, file + ': extracted text is unexpectedly short; check whether PDF is scanned/image-only');
  const pages = text.split('\f').map(page => page.trim()).filter(Boolean);
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  summary.push('');
  summary.push('===== ' + file + ' =====');
  summary.push('Extracted characters: ' + text.length + '; non-empty lines: ' + lines.length + '; non-empty page blocks: ' + pages.length);
  summary.push('Page text characters (first 12 pages): ' + pages.slice(0, 12).map(p => p.length).join(', '));
  const longLines = lines.filter(line => line.length > 180);
  summary.push('Long lines >180 chars: ' + longLines.length);
  for (const line of longLines.slice(0, 10)) summary.push('LONG: ' + line.slice(0, 360));

  for (const [label, pattern] of topics) {
    const hits = lines.filter(line => pattern.test(line));
    summary.push('-- ' + label + ' (' + hits.length + ' matching lines) --');
    for (const line of hits.slice(0, 18)) summary.push(line.slice(0, 360));
  }

  // Repeated full sentences/lines are review leads, not automatic failures:
  // repeated identity, chart-table and report-footer rows can be legitimate.
  const repeatedSentences = new Map();
  const sentenceCandidates = text.replace(/\f/g, '\n').match(/[^.!?।॥\n]{55,}[.!?।॥]/g) || [];
  for (const sentence of sentenceCandidates) {
    const key = compact(sentence);
    if (key.length >= 55) repeatedSentences.set(key, (repeatedSentences.get(key) || 0) + 1);
  }
  const repeatSentences = [...repeatedSentences].filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  summary.push('-- Repeated sentences (>=2 occurrences; review only) (' + repeatSentences.length + ') --');
  for (const [sentence, count] of repeatSentences.slice(0, 18)) summary.push('x' + count + ': ' + sentence.slice(0, 300));

  const repeatedLines = new Map();
  for (const line of lines) {
    const key = compact(line);
    if (key.length >= 65) repeatedLines.set(key, (repeatedLines.get(key) || 0) + 1);
  }
  const repeatLineRows = [...repeatedLines].filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  summary.push('-- Repeated long lines (>=3 occurrences; review only) (' + repeatLineRows.length + ') --');
  for (const [line, count] of repeatLineRows.slice(0, 18)) summary.push('x' + count + ': ' + line.slice(0, 300));

  const columnLike = lines.filter(line => (line.match(/\s{2,}/g) || []).length >= 3 && line.length <= 240);
  summary.push('-- Layout-preserved multi-column lines (' + columnLike.length + '); first 12 --');
  for (const line of columnLike.slice(0, 12)) summary.push(line.slice(0, 240));
}

const out = summary.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'smv-output-pdf-audit-summary.txt'), out);
console.log(out);
