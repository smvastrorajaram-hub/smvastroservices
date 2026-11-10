'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SIZE = 256;
const SCALE = 2;
const HI = SIZE * SCALE;
const assetsDir = path.resolve(__dirname, '..', 'assets');
const iconPath = path.join(assetsDir, 'smv-astro.ico');

const palette = {
  background: [43, 15, 32],
  highlight: [57, 23, 41],
  gold: [220, 181, 116],
  paleGold: [242, 216, 164],
  medallion: [64, 25, 48],
  white: [255, 247, 226]
};

const blend = (base, color, alpha) => [
  Math.round(base[0] * (1 - alpha) + color[0] * alpha),
  Math.round(base[1] * (1 - alpha) + color[1] * alpha),
  Math.round(base[2] * (1 - alpha) + color[2] * alpha)
];

function roundedRectStroke(x, y, left, top, right, bottom, radius, width) {
  const qx = Math.abs(x - (left + right) / 2) - ((right - left) / 2 - radius);
  const qy = Math.abs(y - (top + bottom) / 2) - ((bottom - top) / 2 - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return Math.abs(outside + inside - radius) <= width / 2;
}

function ellipseStroke(x, y, cx, cy, rx, ry, width) {
  const normalized = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
  return Math.abs(normalized - 1) * Math.min(rx, ry) <= width / 2;
}

function lineStroke(x, y, x1, y1, x2, y2, width) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length2 = dx * dx + dy * dy;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / length2));
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy)) <= width / 2;
}

function inStar(x, y) {
  const dx = x - 256;
  const dy = y - 256;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx) + Math.PI / 2;
  const segment = ((angle % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4);
  const halfSegment = Math.PI / 8;
  const relative = Math.abs(segment - halfSegment);
  const innerRadius = 34;
  const outerRadius = 82;
  const boundary = innerRadius + (outerRadius - innerRadius) *
    (1 - relative / halfSegment);
  return distance <= boundary;
}

function sampleColor(x, y) {
  const dx = (x - 235) / 410;
  const dy = (y - 210) / 410;
  const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy));
  let color = blend(palette.background, palette.highlight, glow * 0.62);

  if (ellipseStroke(x, y, 256, 256, 161, 161, 2.8)) {
    color = blend(color, palette.gold, 0.64);
  }
  if (ellipseStroke(x, y, 256, 256, 128, 193, 2.4)) {
    color = blend(color, palette.paleGold, 0.42);
  }
  if (lineStroke(x, y, 256, 82, 256, 430, 1.2) ||
      lineStroke(x, y, 84, 256, 428, 256, 1.2)) {
    color = blend(color, palette.gold, 0.33);
  }

  if (roundedRectStroke(x, y, 18, 18, 494, 494, 112, 8)) {
    color = blend(color, palette.gold, 0.98);
  }
  if (roundedRectStroke(x, y, 34, 34, 478, 478, 98, 2.5)) {
    color = blend(color, palette.paleGold, 0.45);
  }

  const radius = Math.hypot(x - 256, y - 256);
  if (radius <= 110) color = palette.medallion;
  if (Math.abs(radius - 110) <= 4) color = palette.gold;
  if (Math.abs(radius - 90) <= 1.5) color = blend(color, palette.white, 0.62);

  const rayDistance = Math.hypot(x - 256, y - 256);
  const rayAngle = Math.atan2(y - 256, x - 256);
  if (rayDistance >= 92 && rayDistance <= 112 &&
      Math.abs(Math.sin(rayAngle * 8)) <= 0.055) {
    color = palette.gold;
  }

  if (inStar(x, y) && radius <= 82) color = palette.gold;
  if (radius <= 16) color = palette.white;

  if (Math.hypot(x - 114, y - 256) <= 10 ||
      Math.hypot(x - 398, y - 250) <= 10) {
    color = palette.gold;
  }

  return color;
}

function makePixels() {
  const highResolution = Buffer.alloc(HI * HI * 4);
  for (let y = 0; y < HI; y += 1) {
    for (let x = 0; x < HI; x += 1) {
      const rgb = sampleColor((x + 0.5) / SCALE, (y + 0.5) / SCALE);
      const offset = (y * HI + x) * 4;
      highResolution[offset] = rgb[2];
      highResolution[offset + 1] = rgb[1];
      highResolution[offset + 2] = rgb[0];
      highResolution[offset + 3] = 255;
    }
  }

  const output = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const target = ((SIZE - 1 - y) * SIZE + x) * 4;
      let blue = 0;
      let green = 0;
      let red = 0;
      for (let oy = 0; oy < SCALE; oy += 1) {
        for (let ox = 0; ox < SCALE; ox += 1) {
          const source = (((y * SCALE + oy) * HI) + (x * SCALE + ox)) * 4;
          blue += highResolution[source];
          green += highResolution[source + 1];
          red += highResolution[source + 2];
        }
      }
      output[target] = Math.round(blue / (SCALE * SCALE));
      output[target + 1] = Math.round(green / (SCALE * SCALE));
      output[target + 2] = Math.round(red / (SCALE * SCALE));
      output[target + 3] = 255;
    }
  }
  return output;
}

function createIco() {
  const pixels = makePixels();
  const maskRowBytes = Math.ceil(SIZE / 32) * 4;
  const mask = Buffer.alloc(maskRowBytes * SIZE);
  const dibSize = 40;
  const imageSize = pixels.length + mask.length;
  const dib = Buffer.alloc(dibSize + imageSize);

  dib.writeUInt32LE(dibSize, 0);
  dib.writeInt32LE(SIZE, 4);
  dib.writeInt32LE(SIZE * 2, 8);
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(0, 16);
  dib.writeUInt32LE(imageSize, 20);
  pixels.copy(dib, dibSize);
  mask.copy(dib, dibSize + pixels.length);

  const header = Buffer.alloc(6 + 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header.writeUInt8(0, 6);
  header.writeUInt8(0, 7);
  header.writeUInt8(0, 8);
  header.writeUInt8(0, 9);
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(dib.length, 14);
  header.writeUInt32LE(header.length, 18);

  return Buffer.concat([header, dib]);
}

const icon = createIco();
fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync(iconPath, icon);
process.stdout.write(`Prepared 256x256 SMV ASTRO Windows icon: ${iconPath} (${icon.length} bytes)\\n`);
