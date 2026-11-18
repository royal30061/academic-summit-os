import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RES = join(ROOT, 'android', 'app', 'src', 'main', 'res');

const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
const crc32 = (b) => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
};
const png = (w, h, rgba) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = w * 4 + 1, raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) { raw[y * stride] = 0; rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))
  ]);
};

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const BG = hex('#062B22'), BG2 = hex('#0A3A2E'), BIG = hex('#10B981'), SMALL = hex('#34D399'), CAP = hex('#ECFDF5'), TIP = hex('#2DD4BF');
const tri = (px, py, ax, ay, bx, by, cx, cy) => {
  const s = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = s(px, py, ax, ay, bx, by), d2 = s(px, py, bx, by, cx, cy), d3 = s(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0, pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
};
const poly = (px, py, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const CAP_PTS = [54, 28, 62, 42, 58, 40, 54, 44, 50, 40, 46, 42];
const TIP_PTS = [54, 28, 57, 33.5, 54, 32, 51, 33.5];

function sample(u, v, mode) {
  // u,v in 0..108 design space; mode: 'square' | 'round' | 'foreground'
  if (mode === 'square') {
    const r = 24, x = u * 108, y = v * 108;
    const cx = Math.min(Math.max(x, r), 108 - r), cy = Math.min(Math.max(y, r), 108 - r);
    if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) return null;
  }
  if (mode === 'round' && (u - 0.5) ** 2 + (v - 0.5) ** 2 > 0.25) return null;
  const x = u * 108, y = v * 108;
  let col = null;
  if (mode !== 'foreground') col = y > 72 - (x / 108) * 32 ? BG2 : BG;
  if (tri(x, y, 38, 48, 56, 82, 22, 82)) col = SMALL;
  if (tri(x, y, 54, 28, 84, 82, 24, 82)) col = BIG;
  if (poly(x, y, CAP_PTS)) col = CAP;
  if (poly(x, y, TIP_PTS)) col = TIP;
  if (col === null && mode === 'foreground') return null;
  if (col === null) col = BG;
  return col;
}

function render(size, mode) {
  const buf = Buffer.alloc(size * size * 4), SS = 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = sample((x + (sx + 0.5) / SS) / size, (y + (sy + 0.5) / SS) / size, mode);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255; }
    }
    const n = SS * SS, i = (y * size + x) * 4;
    if (a === 0) { buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0; }
    else { buf[i] = Math.round(r / (a / 255)); buf[i + 1] = Math.round(g / (a / 255)); buf[i + 2] = Math.round(b / (a / 255)); buf[i + 3] = Math.round(a / n); }
  }
  return png(size, size, buf);
}

const LAUNCH = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FORE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
let count = 0;
for (const [q, s] of Object.entries(LAUNCH)) {
  const dir = join(RES, 'mipmap-' + q); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher.png'), render(s, 'square')); count++;
  writeFileSync(join(dir, 'ic_launcher_round.png'), render(s, 'round')); count++;
}
for (const [q, s] of Object.entries(FORE)) {
  const dir = join(RES, 'mipmap-' + q); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ic_launcher_foreground.png'), render(s, 'foreground')); count++;
}
console.log('Summit icons written: ' + count + ' PNGs');
