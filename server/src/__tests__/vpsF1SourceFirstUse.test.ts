import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { crc32, deflateRawSync } from 'node:zlib';
import { parseSourceArtifact, SourceArtifactError } from '../services/sourceArtifact.js';

// Synthetic archives only. Entry sizes in the central directory are what the
// expansion gate reads, so a declared size can exceed the bytes actually stored.
interface ZipEntry { name: string; data: Buffer; stored?: boolean; declaredSize?: number }

function zip(entries: ZipEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const body = entry.stored ? entry.data : deflateRawSync(entry.data);
    const method = entry.stored ? 0 : 8;
    const crc = crc32(entry.data);
    const size = entry.declaredSize ?? entry.data.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const CONTENT_TYPES = '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
const RELS = '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';

// Lecture-like prose: repeated run markup plus varied words, which deflates
// to roughly the 7-12x observed on real lecture handouts.
function lectureDocx(paragraphs: number): Buffer {
  const words = ['network', 'server', 'packet', 'routing', 'latency', 'socket', 'protocol', 'address',
    'gateway', 'firewall', 'bandwidth', 'session', 'handshake', 'segment', 'frame', 'header'];
  let seed = 7;
  const next = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed; };
  const body = Array.from({ length: paragraphs }, (_, index) => {
    const sentence = Array.from({ length: 14 }, () => (next() % 2
      ? words[next() % words.length]
      : Array.from({ length: 3 + (next() % 6) }, () => String.fromCharCode(97 + (next() % 26))).join(''))).join(' ');
    return `<w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:rPr><w:lang w:val="en-US"/></w:rPr>`
      + `<w:t xml:space="preserve">Point ${index + 1} (${next() % 997}): ${sentence}.</w:t></w:r></w:p>`;
  }).join('');
  const document = '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body>${body}</w:body></w:document>`;
  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES) },
    { name: '_rels/.rels', data: Buffer.from(RELS) },
    { name: 'word/document.xml', data: Buffer.from(document) },
  ]);
}

function expansionRatio(archive: Buffer): number {
  // Sum declared uncompressed sizes from the central directory, as the gate does.
  const end = archive.length - 22;
  let cursor = archive.readUInt32LE(end + 16);
  let total = 0;
  for (let index = 0; index < archive.readUInt16LE(end + 10); index++) {
    total += archive.readUInt32LE(cursor + 24);
    cursor += 46 + archive.readUInt16LE(cursor + 28);
  }
  return total / archive.length;
}

async function parseDocx(archive: Buffer, limits?: Record<string, number>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-docx-gate-'));
  try {
    const path = join(dir, 'lecture.docx');
    writeFileSync(path, archive);
    return await parseSourceArtifact({
      parser_key: 'native-docx',
      parser_version: '1.12.0',
      file_path: path,
      original_filename: 'lecture.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }, limits ? { limits } : undefined);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function resourceLimit(pattern: RegExp) {
  return (error: unknown) => {
    assert.ok(error instanceof SourceArtifactError);
    assert.equal(error.code, 'resource_limit');
    assert.match(error.message, pattern);
    return true;
  };
}

test('a lecture-like docx at about 10x expansion parses under the default limits', async () => {
  const archive = lectureDocx(400);
  const ratio = expansionRatio(archive);
  assert.ok(ratio > 6 && ratio < 20, `fixture ratio ${ratio.toFixed(1)}x should sit near real handouts`);
  const artifact = await parseDocx(archive);
  assert.equal(artifact.blocks.length, 400);
  assert.match(artifact.blocks[0].text, /^Point 1 /);
});

test('docx expansion gates report ratio and total-size limits separately', async () => {
  const archive = lectureDocx(400);
  await assert.rejects(parseDocx(archive, { maxZipExpansionRatio: 2 }), resourceLimit(/2x archive limit/));
  await assert.rejects(parseDocx(archive, { maxZipExpandedBytes: 4096 }), resourceLimit(/4096 byte total limit/));
});

test('docx declaring more than 200MB expanded is stopped by the default total-size limit', async () => {
  // Stored padding keeps the declared ratio under 100x, so only the total-size gate applies.
  const padding = Buffer.alloc(2_200_000);
  const declaredSize = 201 * 1024 * 1024;
  const archive = zip([
    { name: 'pad.bin', data: padding, stored: true },
    { name: 'word/document.xml', data: Buffer.from('<w:document/>'), declaredSize },
  ]);
  assert.ok(expansionRatio(archive) < 100);
  await assert.rejects(parseDocx(archive), resourceLimit(/209715200 byte total limit/));
});

// Multipart filenames: browsers put raw UTF-8 bytes inside filename="...".
// Both upload middlewares must keep Chinese, ASCII and accented names intact.
function multipartBody(boundary: string, filename: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="`),
    filename,
    Buffer.from(`"\r\nContent-Type: application/pdf\r\n\r\n%PDF-synthetic\r\n--${boundary}--\r\n`),
  ]);
}

async function uploadedName(
  middleware: import('express').RequestHandler,
  filename: string,
): Promise<string> {
  const express = (await import('express')).default;
  const app = express();
  app.post('/upload', middleware, (req, res) => {
    res.json({ name: (req as { file?: { originalname: string } }).file?.originalname });
  });
  const server = await new Promise<import('node:http').Server>((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const boundary = 'synthetic-boundary';
    const response = await fetch(`http://127.0.0.1:${address.port}/upload`, {
      method: 'POST',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      body: new Uint8Array(multipartBody(boundary, Buffer.from(filename, 'utf8'))),
    });
    assert.equal(response.status, 200);
    return ((await response.json()) as { name: string }).name;
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('multipart filenames survive both upload middlewares as UTF-8', async () => {
  const uploadDir = mkdtempSync(join(tmpdir(), 'coincides-upload-names-'));
  const previousUploadDir = process.env.UPLOAD_DIR;
  // upload.ts reads UPLOAD_DIR at import time; SOURCE_BLOB_DIR comes from the suite runner.
  process.env.UPLOAD_DIR = uploadDir;
  try {
    const { upload } = await import('../middleware/upload.js');
    const { sourceFileUpload } = await import('../middleware/sourceUpload.js');
    const paths = { materials: upload.single('file'), sources: sourceFileUpload.single('file') };
    for (const [path, middleware] of Object.entries(paths)) {
      for (const name of ['网络与服务器.pdf', 'lecture-notes.pdf', 'résumé.pdf']) {
        assert.equal(await uploadedName(middleware, name), name, `${path}: ${name}`);
      }
    }
  } finally {
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    rmSync(uploadDir, { recursive: true, force: true });
  }
});
