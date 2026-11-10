'use strict';

const fs = require('node:fs');
const path = require('node:path');

const assetsDir = path.resolve(__dirname, '..', 'assets');
const encodedPath = path.join(assetsDir, 'smv-astro-icon.base64');
const iconPath = path.join(assetsDir, 'smv-astro.ico');

const encoded = fs.readFileSync(encodedPath, 'utf8').replace(/\\s+/g, '');
const icon = Buffer.from(encoded, 'base64');

if (
  icon.length < 512 ||
  icon[0] !== 0 ||
  icon[1] !== 0 ||
  icon[2] !== 1 ||
  icon[3] !== 0
) {
  throw new Error('The bundled SMV ASTRO icon is not a valid ICO file.');
}

fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(iconPath, icon);
process.stdout.write(`Prepared Windows app icon: ${iconPath} ( ${icon.length} bytes )\\n`);
