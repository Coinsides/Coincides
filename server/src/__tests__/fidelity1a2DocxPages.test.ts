import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import { derivedDocxPdfStorageKey, docxPdfConverterConfigured, sweepDerivedDocxPdfs } from '../services/sourceDocxPdf.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { deleteSourceWithCompensation } from '../services/sourceLifecycle.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import {
  getSourcePages,
  requestSourcePageImages,
  resumeSourcePageImages,
  scheduleSourcePageImages,
  waitForScheduledSourcePageImages,
} from '../services/sourcePageImages.js';
import { rematerializeSource } from '../services/sourceReprojection.js';

type Db = Awaited<ReturnType<typeof initDb>>;

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function storedZip(entries: Array<[string, string]>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBytes = Buffer.from(name);
    const body = Buffer.from(content);
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + body.length;
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

const docxWith = (text: string) => storedZip([
  ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
  ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
  ['word/document.xml', '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>'],
]);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function pdfWith(labels: string[]): Buffer {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];
  objects.push(`<< /Type /Pages /Kids [${labels.map((_, index) => `${3 + index * 3} 0 R`).join(' ')}] /Count ${labels.length} >>`);
  labels.forEach((label, index) => {
    const base = 3 + index * 3;
    const content = `BT /F1 14 Tf 72 700 Td (${label}) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${base + 1} 0 R /Resources << /Font << /F1 ${base + 2} 0 R >> >> >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    + offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

// Stands in for soffice: same placeholders and output name, and it leaves a line per
// run in a log. Its behaviour for the next run is read from a mode file.
const FAKE_CONVERTER = String.raw`
const { appendFileSync, copyFileSync, existsSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const [fixtureDir, input, outdir] = process.argv.slice(2);
const mode = existsSync(join(fixtureDir, 'mode')) ? readFileSync(join(fixtureDir, 'mode'), 'utf8').trim() : 'ok';
appendFileSync(join(fixtureDir, 'runs.log'), JSON.stringify({ mode, input, marker: process.env.SYNTHETIC_PARENT_MARKER ?? null }) + '\n');
if (mode === 'fail') { console.error('synthetic converter failure'); process.exit(3); }
if (mode === 'hang') { setInterval(() => {}, 1000); return; }
if (mode === 'garbage') { writeFileSync(join(outdir, 'source.pdf'), 'not a pdf at all'); process.exit(0); }
if (mode === 'silent') { console.error('synthetic converter diagnostic'); process.exit(0); }
if (mode === 'holder') {
  // A grandchild whose parent is already gone keeps this output pipe open. The tree
  // kill walks parent links, so it cannot reach it.
  const holder = "require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)'], { detached: true, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true }).unref()";
  require('node:child_process').spawnSync(process.execPath, ['-e', holder], { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
  copyFileSync(join(fixtureDir, 'fixture.pdf'), join(outdir, 'source.pdf'));
  process.exit(0);
}
const busy = join(fixtureDir, 'busy');
if (mode === 'slow') {
  if (existsSync(busy)) appendFileSync(join(fixtureDir, 'overlaps.log'), 'overlap\n');
  writeFileSync(busy, '');
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
  require('node:fs').rmSync(busy);
}
if (!readFileSync(input).subarray(0, 2).equals(Buffer.from('PK'))) process.exit(4);
copyFileSync(join(fixtureDir, 'fixture.pdf'), join(outdir, 'source.pdf'));
`;

interface Fixture {
  db: Db;
  userId: string;
  sourceRootDir: string;
  canvasAssetRootDir: string;
  fixtureDir: string;
  options: { sourceRootDir: string; canvasAssetRootDir: string };
  setMode: (mode: 'ok' | 'fail' | 'hang' | 'garbage' | 'silent' | 'slow' | 'holder') => void;
  runs: () => Array<{ mode: string; input: string; marker: string | null }>;
  uploadDocx: (text?: string) => Promise<{ sourceId: string; fileId: string; materializationId: string; noteId: string }>;
  derivedPath: (fileId: string) => string;
  assetFiles: () => string[];
}

async function fixture(t: TestContext, options: { converter?: boolean; pages?: string[] } = {}): Promise<Fixture> {
  const root = mkdtempSync(join(tmpdir(), 'coincides-docx-pages-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  const fixtureDir = join(root, 'converter');
  mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
  mkdirSync(fixtureDir);
  writeFileSync(join(fixtureDir, 'fake-soffice.cjs'), FAKE_CONVERTER);
  writeFileSync(join(fixtureDir, 'fixture.pdf'), pdfWith(options.pages ?? ['Page one', 'Page two']));
  const previous = {
    command: process.env.COINCIDES_DOCX_PDF_COMMAND_JSON,
    timeout: process.env.COINCIDES_DOCX_PDF_COMMAND_TIMEOUT_MS,
    marker: process.env.SYNTHETIC_PARENT_MARKER,
  };
  process.env.SYNTHETIC_PARENT_MARKER = 'parent-marker';
  if (options.converter === false) delete process.env.COINCIDES_DOCX_PDF_COMMAND_JSON;
  else {
    process.env.COINCIDES_DOCX_PDF_COMMAND_JSON = JSON.stringify([
      process.execPath, join(fixtureDir, 'fake-soffice.cjs'), fixtureDir, '{input}', '{outdir}',
    ]);
  }
  const db = await initDb(':memory:');
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic project')").run(courseId, userId);
  t.after(async () => {
    await waitForScheduledSourcePageImages();
    closeDb();
    for (const [key, value] of [
      ['COINCIDES_DOCX_PDF_COMMAND_JSON', previous.command],
      ['COINCIDES_DOCX_PDF_COMMAND_TIMEOUT_MS', previous.timeout],
      ['SYNTHETIC_PARENT_MARKER', previous.marker],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  });
  const storage = { sourceRootDir, canvasAssetRootDir };
  return {
    db, userId, sourceRootDir, canvasAssetRootDir, fixtureDir, options: storage,
    setMode: (mode) => writeFileSync(join(fixtureDir, 'mode'), mode),
    runs: () => {
      const log = join(fixtureDir, 'runs.log');
      return existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line)) : [];
    },
    uploadDocx: async (text = 'Docx body text.') => {
      const path = join(sourceRootDir, '.tmp', `${uuidv4()}.upload`);
      const DOCX = docxWith(text);
      writeFileSync(path, DOCX);
      const intake = await intakeSourceTempFile(db, userId, {
        course_id: courseId,
        origin_entry_kind: 'project_upload',
        file: { path, originalname: `论文-${uuidv4().slice(0, 4)}.docx`, mimetype: DOCX_MIME, size: DOCX.length },
      }, { rootDir: sourceRootDir });
      const published = await materializeSourceNow(db, userId, intake.source.id, storage);
      assert.equal(published.status, 'materialized');
      return {
        sourceId: intake.source.id,
        fileId: intake.source.file.id,
        materializationId: published.materialization_id,
        noteId: published.projection_note_id!,
      };
    },
    derivedPath: (fileId) => join(sourceRootDir, derivedDocxPdfStorageKey(userId, fileId)),
    assetFiles: () => {
      const folder = join(canvasAssetRootDir, userId);
      if (!existsSync(folder)) return [];
      return (readdirSync(folder, { recursive: true }) as string[])
        .filter((name) => name.endsWith('.png'));
    },
  };
}

function projectionBlocks(db: Db, noteId: string): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM note_block_placements WHERE note_id = ?').get(noteId) as { n: number }).n;
}

test('with a converter, a docx gets real page images from its derived PDF and keeps its text projection', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  const register = getSourcePages(f.db, f.userId, docx.sourceId);
  assert.equal(register.supported, true);
  assert.equal(register.status, 'complete');
  assert.equal(register.expected, 2);
  assert.deepEqual(register.pages.map((page) => page.page_number), [1, 2]);
  assert.equal(Math.round(register.pages[0].pdf_width), 595);
  assert.equal(Math.round(register.pages[0].pdf_height), 842);
  assert.equal(register.pages[0].image_width, 1240);
  assert.equal(f.assetFiles().length, 2);
  assert.ok(projectionBlocks(f.db, docx.noteId) > 0);
  assert.ok(existsSync(f.derivedPath(docx.fileId)));
  assert.equal(f.runs().length, 1);
  assert.match(f.runs()[0].input, /source\.docx$/, 'the converter sees a fixed name, not the upload name');
  assert.equal(f.runs()[0].marker, null, 'the converter does not inherit the parent environment');
  assert.equal(
    (f.db.prepare('SELECT COUNT(*) AS n FROM source_records').get() as { n: number }).n,
    1,
    'the derived PDF is not a Source of its own',
  );
  assert.deepEqual(readdirSync(join(f.sourceRootDir, '.derived-runs')), [], 'the working folder is gone');
});

test('without a converter a docx behaves as before, and an older docx cannot start one', async (t) => {
  const f = await fixture(t, { converter: false });
  assert.equal(docxPdfConverterConfigured(), false);
  const docx = await f.uploadDocx();
  assert.deepEqual(getSourcePages(f.db, f.userId, docx.sourceId), {
    source_id: docx.sourceId, supported: false, text_view: true, status: 'none', expected: 0, completed: 0, failed_pages: [], pages: [],
  });
  assert.equal(f.runs().length, 0);
  assert.throws(() => requestSourcePageImages(f.db, f.userId, docx.sourceId, f.options), (error: any) => {
    assert.equal(error.statusCode, 409);
    assert.equal(error.details.code, 'source_pages_converter_unavailable');
    return true;
  });
  assert.ok(projectionBlocks(f.db, docx.noteId) > 0);
});

test('an unusable command setting reads as no converter rather than breaking the reader', async (t) => {
  await fixture(t);
  for (const value of ['not json', '[]', '["soffice"]', '{"a":1}', '   ']) {
    process.env.COINCIDES_DOCX_PDF_COMMAND_JSON = value;
    assert.equal(docxPdfConverterConfigured(), false, value);
  }
});

test('an older docx goes through the generate route once a converter exists', async (t) => {
  const f = await fixture(t);
  f.setMode('fail');
  const docx = await f.uploadDocx();
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'failed');
  f.db.prepare("UPDATE source_records SET metadata = json_remove(metadata, '$.page_images') WHERE id = ?").run(docx.sourceId);
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'none');
  f.setMode('ok');
  const previousBlob = process.env.SOURCE_BLOB_DIR;
  const previousCanvas = process.env.CANVAS_ASSET_DIR;
  process.env.SOURCE_BLOB_DIR = f.sourceRootDir;
  process.env.CANVAS_ASSET_DIR = f.canvasAssetRootDir;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = f.userId; next(); });
  app.use('/api/sources', sourceRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (previousBlob === undefined) delete process.env.SOURCE_BLOB_DIR;
    else process.env.SOURCE_BLOB_DIR = previousBlob;
    if (previousCanvas === undefined) delete process.env.CANVAS_ASSET_DIR;
    else process.env.CANVAS_ASSET_DIR = previousCanvas;
  });
  const response = await fetch(
    `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources/${docx.sourceId}/pages/generate`,
    { method: 'POST' },
  );
  assert.ok(response.ok);
  await waitForScheduledSourcePageImages();
  const register = getSourcePages(f.db, f.userId, docx.sourceId);
  assert.equal(register.status, 'complete');
  assert.equal(register.pages.length, 2);
});

for (const [mode, expected] of [
  ['fail', /exited abnormally \(code 3\)/],
  ['silent', /no usable PDF/],
  ['garbage', /no usable PDF/],
] as const) {
  test(`a converter that ends as ${mode} fails only the images, leaves no derived file, and can be retried`, async (t) => {
    const f = await fixture(t);
    f.setMode(mode);
    const docx = await f.uploadDocx();
    const register = getSourcePages(f.db, f.userId, docx.sourceId);
    assert.equal(register.supported, true);
    assert.equal(register.status, 'failed');
    assert.equal(register.pages.length, 0);
    const metadata = JSON.parse((f.db.prepare('SELECT metadata FROM source_records WHERE id = ?').get(docx.sourceId) as { metadata: string }).metadata);
    assert.match(metadata.page_images.error, expected);
    assert.equal(existsSync(f.derivedPath(docx.fileId)), false);
    const materialization = f.db.prepare('SELECT status, projection_note_id FROM source_materializations WHERE id = ?').get(docx.materializationId) as any;
    assert.equal(materialization.status, 'materialized', 'the text projection stands');
    assert.equal(materialization.projection_note_id, docx.noteId);

    f.setMode('ok');
    requestSourcePageImages(f.db, f.userId, docx.sourceId, f.options);
    await waitForScheduledSourcePageImages();
    assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');
  });
}

test('a converter past its time limit is killed and reads as a failure', async (t) => {
  const f = await fixture(t);
  process.env.COINCIDES_DOCX_PDF_COMMAND_TIMEOUT_MS = '1500';
  f.setMode('hang');
  const docx = await f.uploadDocx();
  const metadata = JSON.parse((f.db.prepare('SELECT metadata FROM source_records WHERE id = ?').get(docx.sourceId) as { metadata: string }).metadata);
  assert.equal(metadata.page_images.status, 'failed');
  assert.match(metadata.page_images.error, /timed out after 1500ms/);
  assert.deepEqual(readdirSync(join(f.sourceRootDir, '.derived-runs')), []);
});

test('resume after a crash: a truncated derived PDF is rebuilt, a whole one is reused, finished pages stay', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  assert.equal(f.runs().length, 1);
  const crash = () => {
    f.db.prepare('DELETE FROM source_pages WHERE materialization_id = ? AND page_number = 2').run(docx.materializationId);
    f.db.prepare("UPDATE source_records SET metadata = json_set(metadata, '$.page_images.status', 'partial') WHERE id = ?").run(docx.sourceId);
  };

  crash();
  assert.equal(resumeSourcePageImages(f.db, f.options), 1);
  await waitForScheduledSourcePageImages();
  assert.equal(f.runs().length, 1, 'a whole derived PDF is not converted again');
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');

  crash();
  const whole = readFileSync(f.derivedPath(docx.fileId));
  writeFileSync(f.derivedPath(docx.fileId), whole.subarray(0, Math.floor(whole.length / 2)));
  resumeSourcePageImages(f.db, f.options);
  await waitForScheduledSourcePageImages();
  assert.equal(f.runs().length, 2, 'a truncated one is');
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');
  assert.deepEqual(readFileSync(f.derivedPath(docx.fileId)), whole);
});

test('a derived PDF that passes the quick check but will not open is rebuilt once', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  f.db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(docx.materializationId);
  writeFileSync(f.derivedPath(docx.fileId), '%PDF-1.4\nbroken body padding\n%%EOF\n');
  await scheduleSourcePageImages(f.db, f.userId, docx.sourceId, f.options);
  assert.equal(f.runs().length, 2);
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');
});

test('the startup sweep clears crashed run folders and orphans, and keeps a live derived PDF', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  const crashed = join(f.sourceRootDir, '.derived-runs', 'crashed-run', 'out');
  mkdirSync(crashed, { recursive: true });
  writeFileSync(join(crashed, 'source.pdf'), 'partial');
  const orphan = f.derivedPath(uuidv4());
  writeFileSync(orphan, 'orphan');
  const foreign = join(f.sourceRootDir, f.userId, 'not-derived.docx');
  writeFileSync(foreign, 'kept');
  assert.equal(sweepDerivedDocxPdfs(f.db, { rootDir: f.sourceRootDir }), 2);
  assert.equal(existsSync(join(f.sourceRootDir, '.derived-runs', 'crashed-run')), false);
  assert.equal(existsSync(orphan), false);
  assert.equal(existsSync(foreign), true);
  assert.ok(existsSync(f.derivedPath(docx.fileId)));
});

test('rebuilding the projection keeps the pages and the derived PDF; a lost derived PDF is converted again only if pages need it', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  const before = getSourcePages(f.db, f.userId, docx.sourceId).pages.map((page) => page.asset_id);
  const rebuilt = await rematerializeSource(f.db, f.userId, docx.sourceId, f.options);
  await waitForScheduledSourcePageImages();
  assert.notEqual(rebuilt.projection_note_id, docx.noteId);
  assert.deepEqual(getSourcePages(f.db, f.userId, docx.sourceId).pages.map((page) => page.asset_id), before);
  const origins = f.db.prepare('SELECT DISTINCT origin_note_id FROM canvas_assets WHERE id IN (SELECT image_asset_id FROM source_pages WHERE materialization_id = ?)').all(docx.materializationId) as Array<{ origin_note_id: string }>;
  assert.deepEqual(origins.map((row) => row.origin_note_id), [rebuilt.projection_note_id]);
  assert.equal(f.runs().length, 1);

  rmSync(f.derivedPath(docx.fileId));
  await rematerializeSource(f.db, f.userId, docx.sourceId, f.options);
  await waitForScheduledSourcePageImages();
  assert.equal(f.runs().length, 1, 'every page is still there, so nothing asks for the PDF');

  f.db.prepare('DELETE FROM source_pages WHERE materialization_id = ? AND page_number = 1').run(docx.materializationId);
  await rematerializeSource(f.db, f.userId, docx.sourceId, f.options);
  await waitForScheduledSourcePageImages();
  assert.equal(f.runs().length, 2);
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');
  assert.ok(existsSync(f.derivedPath(docx.fileId)));
});

test('deleting the Source leaves no derived PDF, page row, asset row or image file', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  assert.equal(f.assetFiles().length, 2);
  const result = deleteSourceWithCompensation(f.db, f.userId, docx.sourceId, f.options);
  assert.equal(result.cleanup_jobs_created, 0);
  assert.equal(existsSync(f.derivedPath(docx.fileId)), false);
  assert.deepEqual(f.assetFiles(), []);
  assert.equal((f.db.prepare('SELECT COUNT(*) AS n FROM source_pages').get() as { n: number }).n, 0);
  assert.equal((f.db.prepare("SELECT COUNT(*) AS n FROM canvas_assets WHERE id LIKE 'source-page-image:%'").get() as { n: number }).n, 0);
});

test('a derived PDF that cannot be removed at deletion leaves a cleanup job', async (t) => {
  const f = await fixture(t);
  const docx = await f.uploadDocx();
  const derived = f.derivedPath(docx.fileId);
  const result = deleteSourceWithCompensation(f.db, f.userId, docx.sourceId, {
    ...f.options,
    unlinkFile: (path: string) => {
      if (String(path) === derived) throw Object.assign(new Error('synthetic busy file'), { code: 'EBUSY' });
      rmSync(path);
    },
  } as any);
  assert.equal(result.cleanup_jobs_created, 1);
  const job = f.db.prepare('SELECT storage_domain, operation, source_storage_key FROM managed_file_cleanup_jobs').get() as any;
  assert.deepEqual(job, {
    storage_domain: 'source_blob', operation: 'delete', source_storage_key: derivedDocxPdfStorageKey(f.userId, docx.fileId),
  });
});

test('a Source deleted during its conversion gets no derived file', async (t) => {
  const f = await fixture(t);
  f.setMode('fail');
  const docx = await f.uploadDocx();
  f.setMode('slow');
  const runsBefore = f.runs().length;
  requestSourcePageImages(f.db, f.userId, docx.sourceId, f.options);
  while (f.runs().length === runsBefore) await new Promise((resolve) => setTimeout(resolve, 20));
  deleteSourceWithCompensation(f.db, f.userId, docx.sourceId, f.options);
  await waitForScheduledSourcePageImages();
  assert.equal(existsSync(f.derivedPath(docx.fileId)), false);
  assert.deepEqual(f.assetFiles(), []);
  const runs = join(f.sourceRootDir, '.derived-runs');
  assert.deepEqual(existsSync(runs) ? readdirSync(runs) : [], []);
});

test('conversions wait in the one page image queue, so two documents never convert at once', async (t) => {
  const f = await fixture(t);
  const first = await f.uploadDocx('First document.');
  const second = await f.uploadDocx('Second document.');
  assert.equal(f.runs().length, 2);
  for (const { materializationId, fileId } of [first, second]) {
    f.db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    rmSync(f.derivedPath(fileId));
  }
  f.setMode('slow');
  await Promise.all([first, second].map((docx) => scheduleSourcePageImages(f.db, f.userId, docx.sourceId, f.options)));
  assert.equal(f.runs().length, 4);
  assert.equal(existsSync(join(f.fixtureDir, 'overlaps.log')), false);
  assert.equal(getSourcePages(f.db, f.userId, second.sourceId).status, 'complete');
});

test('a converter that exits 0 with no PDF still leaves its output in the log', async (t) => {
  const f = await fixture(t);
  f.setMode('silent');
  const warned: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warned.push(args.join(' ')); };
  t.after(() => { console.warn = original; });
  await f.uploadDocx();
  assert.ok(warned.some((line) => line.includes('synthetic converter diagnostic')), warned.join('|'));
});

test('a process left holding the converter output cannot stop the queue: the wait ends, the run fails, the next one works', async (t) => {
  const f = await fixture(t);
  f.setMode('holder');
  const started = Date.now();
  const docx = await f.uploadDocx();
  const elapsed = Date.now() - started;
  const metadata = JSON.parse((f.db.prepare('SELECT metadata FROM source_records WHERE id = ?').get(docx.sourceId) as { metadata: string }).metadata);
  assert.equal(metadata.page_images.status, 'failed');
  assert.match(metadata.page_images.error, /still held PID/);
  assert.ok(elapsed < 15000, `waited ${elapsed}ms`);
  assert.equal(existsSync(f.derivedPath(docx.fileId)), false);

  f.setMode('ok');
  requestSourcePageImages(f.db, f.userId, docx.sourceId, f.options);
  await waitForScheduledSourcePageImages();
  assert.equal(getSourcePages(f.db, f.userId, docx.sourceId).status, 'complete');
});
