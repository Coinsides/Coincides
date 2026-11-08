// A-19 fixtures, self-made (nothing downloaded). Each picture: border, both diagonals, a centred circle (turns into an
// ellipse if the aspect is wrong), an arrow pointing UP with the word UP (shows rotation), and a label with the pixel
// size and format. Writes into ./fixtures plus manifest.json: name, mime, bytes, sha256, pixel w/h, displayed w/h
// (after EXIF orientation), what the size reader should see, and what the test expects.
// Run: node gen-images.mjs   (resolves @napi-rs/canvas from the repo's server/node_modules)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
const require = createRequire('<repo>/server/package.json');
const { createCanvas } = require('@napi-rs/canvas');
const OUT = new URL('./fixtures/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

function draw(w, h, { alpha = false, label = '', noise = 0 } = {}) {
  const c = createCanvas(w, h); const g = c.getContext('2d');
  if (!alpha) { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, w, h); }
  const m = Math.min(w, h); const lw = Math.max(1, Math.round(m * 0.01));
  if (noise) { // a band of noise so big files are realistic in size
    const band = Math.round(h * noise); const img = g.createImageData(w, band);
    for (let i = 0; i < img.data.length; i += 4) { const v = (Math.random() * 255) | 0; img.data[i] = v; img.data[i + 1] = (v * 7) & 255; img.data[i + 2] = 255 - v; img.data[i + 3] = 255; }
    g.putImageData(img, 0, h - band);
  }
  g.strokeStyle = '#1d4e89'; g.lineWidth = lw * 2; g.strokeRect(lw, lw, w - 2 * lw, h - 2 * lw);
  g.lineWidth = lw; g.strokeStyle = '#7a2e2e'; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  g.strokeStyle = '#2e7a3c'; g.lineWidth = lw * 1.5; g.beginPath(); g.arc(w / 2, h / 2, m * 0.38, 0, Math.PI * 2); g.stroke();
  // Arrow UP near the top centre.
  const ax = w / 2, ay = m * 0.08, al = m * 0.18;
  g.fillStyle = '#b5651d'; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - al * 0.35, ay + al * 0.4); g.lineTo(ax + al * 0.35, ay + al * 0.4); g.closePath(); g.fill();
  g.fillRect(ax - al * 0.1, ay + al * 0.4, al * 0.2, al * 0.6);
  g.font = `${Math.max(8, Math.round(m * 0.07))}px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#222';
  if (m >= 48) { g.fillText('UP', ax, ay + al * 1.25); g.fillText(label || `${w}x${h}`, w / 2, h / 2 + m * 0.03); }
  return c;
}
// Displayed picture D, stored rotated so that orientation `o` brings it back upright.
function storedFor(display, o) {
  const W = display.width, H = display.height;
  if (o === 3) { const c = createCanvas(W, H); const g = c.getContext('2d'); g.translate(W, H); g.rotate(Math.PI); g.drawImage(display, 0, 0); return c; }
  if (o === 6) { const c = createCanvas(H, W); const g = c.getContext('2d'); g.translate(0, W); g.rotate(-Math.PI / 2); g.drawImage(display, 0, 0); return c; } // 90 CCW
  if (o === 8) { const c = createCanvas(H, W); const g = c.getContext('2d'); g.translate(H, 0); g.rotate(Math.PI / 2); g.drawImage(display, 0, 0); return c; }  // 90 CW
  return display;
}
// Minimal big-endian EXIF APP1 with one IFD0 entry: Orientation.
function withExif(jpeg, o) {
  const tiff = Buffer.alloc(26);
  tiff.write('MM', 0, 'latin1'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4); tiff.writeUInt16BE(1, 8);
  tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(o, 18); tiff.writeUInt16BE(0, 20); tiff.writeUInt32BE(0, 22);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const seg = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([(payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
  // After SOI (and after JFIF APP0 if present, so the file stays a normal JFIF+EXIF shape).
  let at = 2; if (jpeg[2] === 0xff && jpeg[3] === 0xe0) at = 4 + jpeg.readUInt16BE(4);
  return Buffer.concat([jpeg.subarray(0, at), seg, jpeg.subarray(at)]);
}
// webp: pull one chunk out of the VP8X container into a simple-format file.
function webpChunks(buf) { const out = []; let o = 12; while (o + 8 <= buf.length) { const id = buf.subarray(o, o + 4).toString('latin1'); const n = buf.readUInt32LE(o + 4); out.push({ id, data: buf.subarray(o + 8, o + 8 + n) }); o += 8 + n + (n & 1); } return out; }
function simpleWebp(buf, id) {
  const ch = webpChunks(buf).find((c) => c.id === id); if (!ch) throw new Error(`no ${id}`);
  const pad = ch.data.length & 1 ? Buffer.from([0]) : Buffer.alloc(0);
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), Buffer.from(id, 'latin1'), le32(ch.data.length), ch.data, pad]);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), le32(body.length), body]);
}
function le32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }
function stripIccp(buf) { // VP8X container without the ICC chunk (and the ICC flag cleared)
  const chunks = webpChunks(buf).filter((c) => c.id !== 'ICCP');
  const parts = chunks.map((c) => { let d = c.data; if (c.id === 'VP8X') { d = Buffer.from(d); d[0] &= ~0x20; } return Buffer.concat([Buffer.from(c.id, 'latin1'), le32(d.length), d, d.length & 1 ? Buffer.from([0]) : Buffer.alloc(0)]); });
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...parts]);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), le32(body.length), body]);
}

const manifest = [];
const put = (name, mime, buf, meta) => {
  fs.writeFileSync(new URL(name, OUT), buf);
  manifest.push({ name, mime, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), ...meta });
};
const good = (w, h, dw = w, dh = h) => ({ pixel: [w, h], display: [dw, dh], expect: 'visible' });

// PNG
put('png-land-800x600.png', 'image/png', draw(800, 600).encodeSync('png'), good(800, 600));
put('png-tall-1200x4000.png', 'image/png', draw(1200, 4000).encodeSync('png'), good(1200, 4000));
put('png-pano-5000x800.png', 'image/png', draw(5000, 800).encodeSync('png'), good(5000, 800));
put('png-ultrawide-16000x300.png', 'image/png', draw(16000, 300).encodeSync('png'), good(16000, 300));
put('png-huge-6000x4500.png', 'image/png', draw(6000, 4500, { noise: 0.12 }).encodeSync('png'), good(6000, 4500));
put('png-tiny-16x16.png', 'image/png', draw(16, 16).encodeSync('png'), good(16, 16));
put('png-alpha-600x600.png', 'image/png', draw(600, 600, { alpha: true }).encodeSync('png'), good(600, 600));
// JPEG (baseline; the library does not write progressive)
put('jpeg-1600x900.jpg', 'image/jpeg', draw(1600, 900).encodeSync('jpeg', 88), good(1600, 900));
for (const o of [3, 6, 8]) {
  const disp = o === 3 ? draw(1600, 900, { label: `EXIF ${o} shown 1600x900` }) : draw(900, 1600, { label: `EXIF ${o} shown 900x1600` });
  const stored = storedFor(disp, o);
  put(`jpeg-exif${o}-${stored.width}x${stored.height}.jpg`, 'image/jpeg', withExif(stored.encodeSync('jpeg', 88), o),
    { pixel: [stored.width, stored.height], display: [disp.width, disp.height], expect: 'visible', exif: o });
}
put('jpeg-huge-7000x5000.jpg', 'image/jpeg', draw(7000, 5000, { noise: 0.3 }).encodeSync('jpeg', 92), good(7000, 5000));
// WEBP: VP8X as written by the library (ICC + VP8 / ALPH+VP8 / VP8L), and simple VP8 / VP8L without the container.
const w1 = draw(1000, 700); const wa = draw(1000, 700, { alpha: true });
const lossy = w1.encodeSync('webp', 80), lossless = w1.encodeSync('webp', 100), alphaLossy = wa.encodeSync('webp', 80);
put('webp-vp8x-icc-vp8-1000x700.webp', 'image/webp', lossy, good(1000, 700));
put('webp-vp8x-icc-vp8l-1000x700.webp', 'image/webp', lossless, good(1000, 700));
put('webp-vp8x-alpha-1000x700.webp', 'image/webp', stripIccp(alphaLossy), good(1000, 700));
put('webp-simple-vp8-1000x700.webp', 'image/webp', simpleWebp(lossy, 'VP8 '), good(1000, 700));
put('webp-simple-vp8l-1000x700.webp', 'image/webp', simpleWebp(lossless, 'VP8L'), good(1000, 700));
put('webp-simple-vp8-odd-999x701.webp', 'image/webp', simpleWebp(draw(999, 701).encodeSync('webp', 80), 'VP8 '), good(999, 701));
// Unreadable or mismatched
put('bad-garbage.png', 'image/png', crypto.randomBytes(4096), { expect: 'page-fails-note-stands' });
const goodPng = draw(800, 600).encodeSync('png');
put('bad-truncated-800x600.png', 'image/png', goodPng.subarray(0, 200), { pixel: [800, 600], expect: 'size-readable-image-broken' });
put('bad-pngbytes-named.jpg', 'image/jpeg', goodPng, { pixel: [800, 600], expect: 'mismatch-observe' });
put('bad-empty.png', 'image/png', Buffer.alloc(0), { expect: 'observe' });
// Outside the intake list (observation only: does upload refuse cleanly?)
put('other-avif-800x600.avif', 'image/avif', draw(800, 600).encodeSync('avif', 80), { pixel: [800, 600], expect: 'not-accepted-observe' });
fs.writeFileSync(new URL('manifest.json', OUT), JSON.stringify(manifest, null, 1));
for (const m of manifest) console.log(m.name.padEnd(40), String(m.bytes).padStart(9), m.pixel ? m.pixel.join('x') : '', m.display ? '-> ' + m.display.join('x') : '', m.expect);
