import fs from 'node:fs';
import path from 'node:path';

const root = 'naelos-ephemeris';
const files = fs.readdirSync(root).filter(x => /^ne-\\d+\\.bin$/.test(x)).sort();
if (files.length !== 12) throw new Error('Expected 12 NAELOS century binaries; found ' + files.length);
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
console.log(JSON.stringify({
  kind: 'NAELOS_BINARY_FORMAT_FORENSICS',
  source: manifest.source,
  frame: manifest.frame,
  targetArcsec: manifest.target_arcsec,
  files: files.map(name => {
    const b = fs.readFileSync(path.join(root, name));
    const f64 = [], f32 = [], u32 = [];
    for (let i = 0; i < Math.min(256, b.length - 7); i += 8) f64.push(Number(b.readDoubleLE(i).toPrecision(12)));
    for (let i = 0; i < Math.min(256, b.length - 3); i += 4) {
      f32.push(Number(b.readFloatLE(i).toPrecision(9)));
      u32.push(b.readUInt32LE(i));
    }
    const ascii = [];
    for (const m of b.toString('latin1').matchAll(/[\\x20-\\x7e]{4,}/g)) {
      if (ascii.length < 24) ascii.push({ offset: m.index, text: m[0].slice(0, 120) });
    }
    const stats = {};
    for (const [label, values] of [['f32', f32], ['f64', f64]]) {
      const finite = values.filter(Number.isFinite);
      stats[label] = {
        finite: finite.length,
        min: finite.length ? Math.min(...finite) : null,
        max: finite.length ? Math.max(...finite) : null,
        first: values.slice(0, 16)
      };
    }
    return {
      name, bytes: b.length,
      first256Hex: b.subarray(0, 256).toString('hex'),
      first32U32LE: u32.slice(0, 32),
      floatStats: stats,
      ascii
    };
  })
}, null, 2));
