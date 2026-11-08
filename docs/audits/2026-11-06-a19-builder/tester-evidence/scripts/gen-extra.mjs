// Extra A-19 fixtures (appended to fixtures/manifest.json):
//  - bad-pngbytes-distinct-810x600.jpg: PNG bytes under a .jpg name and image/jpeg, with bytes of its own (the first
//    version was byte-identical to png-land and the app de-duplicated it to that Source).
//  - webp-exif6-1600x900.webp: VP8X + VP8 + an EXIF chunk with Orientation 6; pixels stored 1600x900, meant to be shown
//    900x1600 (builder's declared gap: the size reader does not read EXIF inside webp).
//  - webp-exif6-prefixed-1600x900.webp: same, EXIF payload starting with "Exif\0\0" (some writers do this).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
const require = createRequire('<repo>/server/package.json');
const { createCanvas } = require('@napi-rs/canvas');
const FIX = new URL('./fixtures/', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8')).filter((m) => !['bad-pngbytes-distinct-810x600.jpg', 'webp-exif6-1600x900.webp', 'webp-exif6-prefixed-1600x900.webp'].includes(m.name));
const le32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; };
const le24 = (n) => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255]);
const chunk = (id, data) => Buffer.concat([Buffer.from(id, 'latin1'), le32(data.length), data, data.length & 1 ? Buffer.from([0]) : Buffer.alloc(0)]);
const chunks = (buf) => { const out = []; let o = 12; while (o + 8 <= buf.length) { const id = buf.subarray(o, o + 4).toString('latin1'); const n = buf.readUInt32LE(o + 4); out.push({ id, data: buf.subarray(o + 8, o + 8 + n) }); o += 8 + n + (n & 1); } return out; };
function draw(w, h, label) {
  const c = createCanvas(w, h); const g = c.getContext('2d'); g.fillStyle = '#eef3f8'; g.fillRect(0, 0, w, h);
  const m = Math.min(w, h); g.strokeStyle = '#1d4e89'; g.lineWidth = m * 0.02; g.strokeRect(m * 0.01, m * 0.01, w - m * 0.02, h - m * 0.02);
  g.strokeStyle = '#2e7a3c'; g.lineWidth = m * 0.015; g.beginPath(); g.arc(w / 2, h / 2, m * 0.38, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#b5651d'; const ax = w / 2, ay = m * 0.08, al = m * 0.18; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax - al * 0.35, ay + al * 0.4); g.lineTo(ax + al * 0.35, ay + al * 0.4); g.closePath(); g.fill(); g.fillRect(ax - al * 0.1, ay + al * 0.4, al * 0.2, al * 0.6);
  g.font = `${Math.round(m * 0.06)}px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#222'; g.fillText('UP', ax, ay + al * 1.25); g.fillText(label, w / 2, h / 2);
  return c;
}
function rotCCW(src) { const c = createCanvas(src.height, src.width); const g = c.getContext('2d'); g.translate(0, src.width); g.rotate(-Math.PI / 2); g.drawImage(src, 0, 0); return c; }
function exifTiff(o) {
  const t = Buffer.alloc(26); t.write('MM', 0, 'latin1'); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4); t.writeUInt16BE(1, 8);
  t.writeUInt16BE(0x0112, 10); t.writeUInt16BE(3, 12); t.writeUInt32BE(1, 14); t.writeUInt16BE(o, 18); t.writeUInt16BE(0, 20); t.writeUInt32BE(0, 22); return t;
}
function webpWithExif(stored, prefixed) {
  const vp8 = chunks(stored.encodeSync('webp', 85)).find((c) => c.id === 'VP8 ');
  const flags = Buffer.from([0x08, 0, 0, 0]); // EXIF present
  const vp8x = Buffer.concat([flags, le24(stored.width - 1), le24(stored.height - 1)]);
  const exif = prefixed ? Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), exifTiff(6)]) : exifTiff(6);
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), chunk('VP8X', vp8x), chunk('VP8 ', vp8.data), chunk('EXIF', exif)]);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), le32(body.length), body]);
}
const put = (name, mime, buf, meta) => { fs.writeFileSync(new URL(name, FIX), buf); manifest.push({ name, mime, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), ...meta }); };
put('bad-pngbytes-distinct-810x600.jpg', 'image/jpeg', draw(810, 600, 'png bytes named .jpg').encodeSync('png'), { pixel: [810, 600], expect: 'mismatch-observe' });
const disp = draw(900, 1600, 'webp EXIF 6 shown 900x1600');
put('webp-exif6-1600x900.webp', 'image/webp', webpWithExif(rotCCW(disp), false), { pixel: [1600, 900], display: [900, 1600], expect: 'visible', exif: 6, note: 'declared gap' });
put('webp-exif6-prefixed-1600x900.webp', 'image/webp', webpWithExif(rotCCW(disp), true), { pixel: [1600, 900], display: [900, 1600], expect: 'visible', exif: 6, note: 'declared gap, Exif prefix' });
fs.writeFileSync(new URL('manifest.json', FIX), JSON.stringify(manifest, null, 1));
console.log('manifest now', manifest.length);
