import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { readSourceImageInfo } from '../services/sourceImageSize.js';
import { deleteSourceWithCompensation } from '../services/sourceLifecycle.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import {
  getSourcePages,
  getSourcePagesByProjectionNote,
  requestSourcePageImages,
  waitForScheduledSourcePageImages,
  type SourcePageRenderer,
} from '../services/sourcePageImages.js';
import { resolveCanvasAssetPath } from '../services/sourceProjectionMaterializer.js';
import { rematerializeSource } from '../services/sourceReprojection.js';

type Db = Awaited<ReturnType<typeof initDb>>;

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngOf(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const rows = Buffer.alloc(height * (1 + width * 3), 0x80);
  for (let row = 0; row < height; row += 1) rows[row * (1 + width * 3)] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Header-complete only: enough for intake's signature and for the size reader.
function jpegOf(width: number, height: number, orientation?: number): Buffer {
  const segment = (marker: number, data: Buffer) => {
    const head = Buffer.alloc(4);
    head[0] = 0xff; head[1] = marker; head.writeUInt16BE(data.length + 2, 2);
    return Buffer.concat([head, data]);
  };
  const parts = [Buffer.from([0xff, 0xd8])];
  if (orientation) {
    const tiff = Buffer.alloc(26);
    tiff.write('MM', 0, 'latin1'); tiff.writeUInt16BE(42, 2); tiff.writeUInt32BE(8, 4);
    tiff.writeUInt16BE(1, 8);
    tiff.writeUInt16BE(0x0112, 10); tiff.writeUInt16BE(3, 12); tiff.writeUInt32BE(1, 14); tiff.writeUInt16BE(orientation, 18);
    parts.push(segment(0xe1, Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff])));
  }
  const frame = Buffer.alloc(15);
  frame[0] = 8; frame.writeUInt16BE(height, 1); frame.writeUInt16BE(width, 3); frame[5] = 3;
  parts.push(segment(0xc0, frame), Buffer.from([0xff, 0xd9]));
  return Buffer.concat(parts);
}

function webpOf(width: number, height: number): Buffer {
  const data = Buffer.alloc(30);
  data.write('RIFF', 0, 'latin1'); data.writeUInt32LE(22, 4); data.write('WEBP', 8, 'latin1');
  data.write('VP8X', 12, 'latin1'); data.writeUInt32LE(10, 16);
  data.writeUIntLE(width - 1, 24, 3); data.writeUIntLE(height - 1, 27, 3);
  return data;
}

interface Context {
  db: Db; userId: string; sourceId: string; noteId: string; materializationId: string;
  sourceRootDir: string; canvasAssetRootDir: string; rendererOpens: () => number;
}

async function withImage(body: Buffer, file: { name: string; mime: string }, run: (context: Context) => Promise<void>) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-image-pages-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  const userId = uuidv4();
  const courseId = uuidv4();
  let opens = 0;
  // The PDF renderer and the docx converter must stay out of an image's way.
  const openPageRenderer = async (): Promise<SourcePageRenderer> => { opens += 1; throw new Error('an image must not open the page renderer'); };
  try {
    const db = await initDb(':memory:');
    db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
    db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic project')").run(courseId, userId);
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
    const path = join(sourceRootDir, '.tmp', 'synthetic.upload');
    writeFileSync(path, body);
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId, origin_entry_kind: 'project_upload',
      file: { path, originalname: file.name, mimetype: file.mime, size: body.length },
    }, { rootDir: sourceRootDir });
    const published = await materializeSourceNow(db, userId, intake.source.id, { sourceRootDir, canvasAssetRootDir, openPageRenderer });
    assert.equal(published.status, 'materialized');
    await waitForScheduledSourcePageImages();
    await run({ db, userId, sourceId: intake.source.id, noteId: published.projection_note_id!,
      materializationId: published.materialization_id, sourceRootDir, canvasAssetRootDir, rendererOpens: () => opens });
  } finally {
    await waitForScheduledSourcePageImages();
    closeDb();
    rmSync(root, { recursive: true, force: true });
  }
}

const pageAsset = (db: Db, materializationId: string) => db.prepare(
  'SELECT storage_key, mime_type, filename, width, height, origin_note_id FROM canvas_assets WHERE id = ?',
).get(`source-page-image:${materializationId}:1`) as
  { storage_key: string; mime_type: string; filename: string; width: number; height: number; origin_note_id: string } | undefined;

const pageFiles = (root: string, userId: string) => {
  const folder = join(root, userId, 'source-materializations');
  return existsSync(folder) ? readdirSync(folder).filter((name) => name.includes('-page-')) : [];
};

for (const [label, body, file, mime, extension] of [
  ['png', pngOf(640, 360), { name: 'chart.png', mime: 'image/png' }, 'image/png', '.png'],
  ['jpeg', jpegOf(800, 1200), { name: 'photo.jpg', mime: 'image/jpeg' }, 'image/jpeg', '.jpg'],
  ['webp', webpOf(300, 200), { name: 'scan.webp', mime: 'image/webp' }, 'image/webp', '.webp'],
] as const) {
  test(`a ${label} Source is one original page: the file itself, at its real size, with no text view`, async () => {
    await withImage(body, file, async ({ db, userId, sourceId, noteId, materializationId, canvasAssetRootDir, rendererOpens }) => {
      const info = readSourceImageInfo(body)!;
      const register = getSourcePagesByProjectionNote(db, userId, noteId);
      assert.equal(register.supported, true);
      assert.equal(register.text_view, false);
      assert.equal(register.status, 'complete');
      assert.equal(register.expected, 1);
      assert.deepEqual(register.pages.map((page) => [page.page_number, page.image_width, page.image_height, page.pdf_width, page.pdf_height]),
        [[1, info.width, info.height, info.width, info.height]]);
      const asset = pageAsset(db, materializationId)!;
      assert.equal(asset.mime_type, mime);
      assert.ok(asset.storage_key.endsWith(`-page-1${extension}`));
      assert.deepEqual([asset.width, asset.height, asset.origin_note_id], [info.width, info.height, noteId]);
      assert.ok(readFileSync(resolveCanvasAssetPath(canvasAssetRootDir, asset.storage_key)).equals(body), 'the page image is the original, byte for byte');
      assert.equal(rendererOpens(), 0);
      assert.equal(getSourcePages(db, userId, sourceId).status, 'complete');
    });
  });
}

test('a photo stored on its side is measured the way it is shown', () => {
  assert.deepEqual([readSourceImageInfo(jpegOf(4000, 3000))!.width, readSourceImageInfo(jpegOf(4000, 3000))!.height], [4000, 3000]);
  for (const orientation of [5, 6, 7, 8]) {
    const info = readSourceImageInfo(jpegOf(4000, 3000, orientation))!;
    assert.deepEqual([info.width, info.height], [3000, 4000], `orientation ${orientation}`);
  }
  assert.deepEqual([readSourceImageInfo(jpegOf(4000, 3000, 3))!.width, readSourceImageInfo(jpegOf(4000, 3000, 3))!.height], [4000, 3000]);
});

test('bytes that are not a readable image give no size, never a guessed one', () => {
  assert.equal(readSourceImageInfo(Buffer.from('not an image')), null);
  assert.equal(readSourceImageInfo(pngOf(10, 10).subarray(0, 20)), null);
  assert.equal(readSourceImageInfo(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), null);
  assert.equal(readSourceImageInfo(pngOf(0, 10)), null);
});

test('an image whose size cannot be read fails its page and says so, and the note stays published', async () => {
  // Passes intake's signature, then stops before any frame header.
  const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]), Buffer.from([0xff, 0xd9])]);
  const original = console.warn;
  console.warn = () => undefined;
  try {
    await withImage(broken, { name: 'broken.jpg', mime: 'image/jpeg' }, async ({ db, userId, sourceId, materializationId, canvasAssetRootDir }) => {
      const register = getSourcePages(db, userId, sourceId);
      assert.equal(register.status, 'failed');
      assert.deepEqual([register.expected, register.pages.length, register.failed_pages], [1, 0, [1]]);
      assert.equal(pageAsset(db, materializationId), undefined);
      assert.deepEqual(pageFiles(canvasAssetRootDir, userId), []);
      const status = db.prepare('SELECT status FROM source_materializations WHERE source_record_id = ?').get(sourceId) as { status: string };
      assert.equal(status.status, 'materialized');
    });
  } finally {
    console.warn = original;
  }
});

test('an image published before page images existed gets its page from the generate entry, without a rebuild', async () => {
  await withImage(pngOf(640, 360), { name: 'old.png', mime: 'image/png' }, async ({ db, userId, sourceId, noteId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    const asset = pageAsset(db, materializationId)!;
    db.prepare("UPDATE source_records SET metadata = '{}' WHERE id = ?").run(sourceId);
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    db.prepare("DELETE FROM canvas_assets WHERE id LIKE 'source-page-image:%'").run();
    rmSync(resolveCanvasAssetPath(canvasAssetRootDir, asset.storage_key), { force: true });
    const before = getSourcePages(db, userId, sourceId);
    assert.deepEqual([before.supported, before.text_view, before.status], [true, false, 'none']);

    requestSourcePageImages(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    await waitForScheduledSourcePageImages();
    const after = getSourcePagesByProjectionNote(db, userId, noteId);
    assert.deepEqual([after.status, after.pages.length], ['complete', 1]);
    const note = db.prepare('SELECT COUNT(*) AS count FROM source_materializations WHERE projection_note_id = ?').get(noteId) as { count: number };
    assert.equal(note.count, 1, 'same projection: nothing was rebuilt');
  });
});

test('rebuilding an image keeps its page and moves it to the new note; deleting the Source leaves no page behind', async () => {
  await withImage(pngOf(640, 360), { name: 'chart.png', mime: 'image/png' }, async ({ db, userId, sourceId, noteId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    const replaced = await rematerializeSource(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    await waitForScheduledSourcePageImages();
    assert.notEqual(replaced.projection_note_id, noteId);
    assert.equal(pageAsset(db, materializationId)!.origin_note_id, replaced.projection_note_id);
    assert.equal(getSourcePagesByProjectionNote(db, userId, replaced.projection_note_id).pages.length, 1);
    assert.equal(pageFiles(canvasAssetRootDir, userId).length, 1);

    deleteSourceWithCompensation(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    assert.equal(pageAsset(db, materializationId), undefined);
    const rows = db.prepare('SELECT COUNT(*) AS count FROM source_pages WHERE materialization_id = ?').get(materializationId) as { count: number };
    assert.equal(rows.count, 0);
    assert.deepEqual(pageFiles(canvasAssetRootDir, userId), []);
  });
});
