import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] || 'smv-output-pdf-audit';
assert.ok(fs.existsSync(dir), 'PDF text output directory must exist');
const files = fs.readdirSync(dir).filter(name => name.endsWith('.txt') && name !== 'smv-output-pdf-audit-summary.txt').sort();
assert.ok(files.length >= 2, 'Expected at least two extracted SMV report PDFs');

const topics = [
  ['Horoscope / பலன்கள்', /horoscope|jathaka|ஜாதக|பலன்|தசா|திசை|கணிப்பு/i],
  ['Ayurdaya', /ayurdaya|ஆயுர்த்தாயம்|ஆயுர்தாயம்|பிண்ட ஆயுள்|நைசர்க்கிக ஆயுள்/i],
  ['Amsa', /amsa|அம்ச/i],
  ['Shadbala', /shadbala|சட்பல|ஷட்பல|ஸ்தான பலம்|Sthana Bala/i],
  ['Matching / பொருத்தம்', /matching|பொருத்தம்|தினம்|கணம்|யோனி|ராசி பொருத்தம்/i],
  ['Marriage / திருமணம்', /marriage|திருமண|களத்திர|மாங்கல்ய/i]
];

const summary = [];
summary.push('SMV output PDF text audit — extraction evidence only; not a mathematical certification.');
summary.push('Files: ' + files.length);
for (const file of files) {
  const text = fs.readFileSync(path.join(dir, file), 'utf8');
  assert.ok(text.trim().length > 500, file + ': extracted text is unexpectedly short; check whether PDF is scanned/image-only');
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  summary.push('');
  summary.push('===== ' + file + ' =====');
  summary.push('Extracted characters: ' + text.length + '; non-empty lines: ' + lines.length);
  for (const [label, pattern] of topics) {
    const hits = lines.filter(line => pattern.test(line));
    summary.push('-- ' + label + ' (' + hits.length + ' matching lines) --');
    for (const line of hits.slice(0, 18)) summary.push(line.slice(0, 360));
  }
}
const out = summary.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'smv-output-pdf-audit-summary.txt'), out);
console.log(out);
