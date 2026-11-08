// Fixtures that pass intake as native-image (right magic bytes) but whose size the reader cannot get, to reach the
// "page fails, note stands, Retry" path (builder's (b)):
//  - unread-png-zero-width.png : a real PNG whose IHDR width is rewritten to 0 (CRC left stale).
//  - unread-jpeg-no-sof.jpg    : SOI + JFIF APP0 + a COM segment + EOI, no SOF at all.
//  - unread-webp-unknown.webp  : RIFF/WEBP with a single unknown 'XYZW' chunk.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import crypto from 'node:crypto';
const require = createRequire('<repo>/server/package.json');
const { createCanvas } = require('@napi-rs/canvas');
const FIX = new URL('./fixtures/', import.meta.url);
const names = ['unread-png-zero-width.png', 'unread-jpeg-no-sof.jpg', 'unread-webp-unknown.webp'];
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', FIX), 'utf8')).filter((m) => !names.includes(m.name));
const put = (name, mime, buf) => { fs.writeFileSync(new URL(name, FIX), buf); manifest.push({ name, mime, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex'), expect: 'page-fails-note-stands' }); };
const c = createCanvas(640, 480); const g = c.getContext('2d'); g.fillStyle = '#d9e4f0'; g.fillRect(0, 0, 640, 480); g.fillStyle = '#333'; g.font = '30px sans-serif'; g.fillText('zero width IHDR', 120, 240);
const png = Buffer.from(c.encodeSync('png')); png.writeUInt32BE(0, 16); put(names[0], 'image/png', png);
const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
const com = Buffer.concat([Buffer.from([0xff, 0xfe, 0x00, 0x12]), Buffer.from('no frame header  ', 'latin1')]);
put(names[1], 'image/jpeg', Buffer.concat([Buffer.from([0xff, 0xd8]), app0, com, Buffer.from([0xff, 0xd9])]));
const data = Buffer.from('not an image chunk', 'latin1'); const len = Buffer.alloc(4); len.writeUInt32LE(data.length);
const body = Buffer.concat([Buffer.from('WEBPXYZW', 'latin1'), len, data]); const rl = Buffer.alloc(4); rl.writeUInt32LE(body.length);
put(names[2], 'image/webp', Buffer.concat([Buffer.from('RIFF', 'latin1'), rl, body]));
fs.writeFileSync(new URL('manifest.json', FIX), JSON.stringify(manifest, null, 1));
console.log('manifest now', manifest.length);
