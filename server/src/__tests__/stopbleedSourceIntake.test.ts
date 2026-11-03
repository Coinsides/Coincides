import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import { waitForScheduledPurposeDrafts } from '../services/purposeDrafting.js';
import { getSourceRecordDetail } from '../services/sourceFileIntake.js';
import {
  materializeSourceNow,
  waitForScheduledSourceMaterializations,
} from '../services/sourceMaterialization.js';
import { runWithSourceMaterializationConcurrency } from '../services/sourceMaterializationConcurrency.js';
import { MINERU_PARSER_KEY } from '../services/sourceMineruParser.js';
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

function storedZip(entries: Array<[string, string | Buffer]>): Buffer {
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

const WORD_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const MATH = '<m:oMath><m:r><m:t>x+1</m:t></m:r></m:oMath>';

function docx(body: string): Buffer {
  return storedZip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ['word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document ${WORD_NS}><w:body>${body}</w:body></w:document>`],
  ]);
}

const MATH_DOCX = docx(`<w:p><w:r><w:t>PV = </w:t></w:r>${MATH}<w:r><w:t> = </w:t></w:r>${MATH}</w:p>`);
const PLAIN_DOCX = docx('<w:p><w:r><w:t>Plain paragraph.</w:t></w:r></w:p>');
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface Fixture {
  db: Db;
  userId: string;
  courseId: string;
  rootDir: string;
  canvasDir: string;
  upload: (name: string, body: string | Buffer, mime: string) => Promise<{ status: number; source: { id: string } }>;
  status: (filename: string) => { status: string; attempt_count: number; projection_note_id: string | null } | undefined;
}

async function fixture(t: TestContext): Promise<Fixture> {
  const db = await initDb(':memory:');
  const userId = uuidv4();
  const courseId = uuidv4();
  const rootDir = mkdtempSync(join(tmpdir(), 'coincides-stopbleed-'));
  const canvasDir = mkdtempSync(join(tmpdir(), 'coincides-stopbleed-canvas-'));
  db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
  db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Economics')").run(courseId, userId);
  const previous = { blob: process.env.SOURCE_BLOB_DIR, canvas: process.env.CANVAS_ASSET_DIR };
  process.env.SOURCE_BLOB_DIR = rootDir;
  process.env.CANVAS_ASSET_DIR = canvasDir;
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => { (req as any).userId = userId; next(); });
  app.use('/api/sources', sourceRoutes);
  app.use(errorHandler);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await waitForScheduledSourceMaterializations();
    await waitForScheduledPurposeDrafts();
    closeDb();
    for (const [key, value] of [['SOURCE_BLOB_DIR', previous.blob], ['CANVAS_ASSET_DIR', previous.canvas]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    rmSync(rootDir, { recursive: true, force: true });
    rmSync(canvasDir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources`;
  return {
    db, userId, courseId, rootDir, canvasDir,
    upload: async (name, body, mime) => {
      const form = new FormData();
      form.set('file', new Blob([Buffer.from(body)], { type: mime }), name);
      form.set('course_id', courseId);
      const response = await fetch(`${base}/upload`, { method: 'POST', body: form });
      const json = await response.json() as { source: { id: string } };
      return { status: response.status, source: json.source };
    },
    status: (filename) => db.prepare(`
      SELECT sm.status, sm.attempt_count, sm.projection_note_id
      FROM source_materializations sm
      JOIN source_files sf ON sf.id = sm.source_file_id
      WHERE sf.original_filename = ? AND sm.user_id = ?
    `).get(filename, userId) as any,
  };
}

test('zip entries materialize on a running process, with no restart and no client call', async (t) => {
  const f = await fixture(t);
  const result = await f.upload('pack.zip', storedZip([
    ['one.txt', 'Entry one'],
    ['two.md', '# Entry two'],
    ['deck.pptx', 'not parsed'],
  ]), 'application/zip');
  assert.equal(result.status, 201);
  await waitForScheduledSourceMaterializations();
  assert.equal(f.status('one.txt')?.status, 'materialized');
  assert.equal(f.status('two.md')?.status, 'materialized');
  assert.ok(f.status('one.txt')?.projection_note_id);
  assert.equal(f.status('deck.pptx')?.status, 'received', 'a stored-only entry is left alone');
  assert.equal(f.status('pack.zip')?.status, 'received', 'the container itself is stored-only');
});

test('a nested zip is stored, never expanded, and its stored-only row does not break the batch', async (t) => {
  const f = await fixture(t);
  await f.upload('outer.zip', storedZip([
    ['inner.zip', storedZip([['deep.txt', 'Deep entry']])],
    ['beside.txt', 'Beside entry'],
  ]), 'application/zip');
  await waitForScheduledSourceMaterializations();
  assert.equal(f.status('inner.zip')?.status, 'received');
  assert.equal(f.status('deep.txt'), undefined);
  assert.equal(f.status('beside.txt')?.status, 'materialized');
});

test('entries that deduplicate onto a settled Source are skipped: materialized and failed alike', async (t) => {
  const f = await fixture(t);
  await f.upload('done.txt', 'Already done', 'text/plain');
  await materializeSourceNow(f.db, f.userId, (f.db.prepare("SELECT sr.id FROM source_records sr JOIN source_files sf ON sf.source_record_id = sr.id WHERE sf.original_filename = 'done.txt'").get() as { id: string }).id);
  await f.upload('broke.txt', 'Failed before', 'text/plain');
  f.db.prepare(`
    UPDATE source_materializations
    SET status = 'failed', error_code = 'parser_failure', error_message = 'synthetic', attempt_count = 1
    WHERE source_file_id = (SELECT id FROM source_files WHERE original_filename = 'broke.txt')
  `).run();
  const doneBefore = f.status('done.txt')!;
  await f.upload('again.zip', storedZip([['a.txt', 'Already done'], ['b.txt', 'Failed before'], ['c.txt', 'Brand new']]), 'application/zip');
  await waitForScheduledSourceMaterializations();
  assert.deepEqual(f.status('done.txt'), doneBefore);
  assert.equal(f.status('broke.txt')?.status, 'failed', 'a retryable failure keeps waiting for its manual retry');
  assert.equal(f.status('broke.txt')?.attempt_count, 1);
  assert.equal(f.status('c.txt')?.status, 'materialized');
});

function noteMetadata(db: Db, noteId: string): Record<string, unknown> {
  return JSON.parse((db.prepare('SELECT metadata FROM notes WHERE id = ?').get(noteId) as { metadata: string }).metadata);
}

test('a docx with swallowed formulas records the messages and the detail reports them', async (t) => {
  const f = await fixture(t);
  const { source } = await f.upload('math.docx', MATH_DOCX, DOCX_MIME);
  await materializeSourceNow(f.db, f.userId, source.id);
  const detail = getSourceRecordDetail(f.db, f.userId, source.id);
  assert.equal(detail.materialization.has_parser_messages, true);
  const messages = noteMetadata(f.db, detail.materialization.projection_note_id!).parser_messages as Array<{ type: string; message: string }>;
  assert.equal(messages[0].type, 'warning');
  assert.match(messages[0].message, /oMath/);
});

test('plain docx and text carry no key at all and report nothing', async (t) => {
  const f = await fixture(t);
  for (const [name, body, mime] of [['plain.docx', PLAIN_DOCX, DOCX_MIME], ['note.txt', 'Plain text', 'text/plain']] as const) {
    const { source } = await f.upload(name, body, mime);
    await materializeSourceNow(f.db, f.userId, source.id);
    const detail = getSourceRecordDetail(f.db, f.userId, source.id);
    assert.equal(detail.materialization.has_parser_messages, false, name);
    assert.equal('parser_messages' in noteMetadata(f.db, detail.materialization.projection_note_id!), false, name);
  }
});

test('an older docx projection gains the record through one rebuild, and a lost projection reports nothing', async (t) => {
  const f = await fixture(t);
  const { source } = await f.upload('old.docx', MATH_DOCX, DOCX_MIME);
  await materializeSourceNow(f.db, f.userId, source.id);
  const first = getSourceRecordDetail(f.db, f.userId, source.id).materialization.projection_note_id!;
  const older = noteMetadata(f.db, first);
  delete older.parser_messages;
  f.db.prepare('UPDATE notes SET metadata = ? WHERE id = ?').run(JSON.stringify(older), first);
  assert.equal(getSourceRecordDetail(f.db, f.userId, source.id).materialization.has_parser_messages, false);

  await rematerializeSource(f.db, f.userId, source.id);
  const rebuilt = getSourceRecordDetail(f.db, f.userId, source.id).materialization;
  assert.equal(rebuilt.has_parser_messages, true);

  f.db.pragma('foreign_keys = OFF');
  f.db.prepare('DELETE FROM notes WHERE id = ?').run(rebuilt.projection_note_id);
  f.db.pragma('foreign_keys = ON');
  const lost = getSourceRecordDetail(f.db, f.userId, source.id).materialization;
  assert.equal(lost.projection_available, false);
  assert.equal(lost.has_parser_messages, false);
});

function gate() {
  let open!: () => void;
  const opened = new Promise<void>((resolve) => { open = resolve; });
  return { opened, open };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

test('native parsing holds three slots, queues in order, and a failure gives its slot back', async () => {
  const gates = Array.from({ length: 6 }, gate);
  const started: number[] = [];
  const runs = gates.map((entry, index) => runWithSourceMaterializationConcurrency('native-pdf', async () => {
    started.push(index);
    await entry.opened;
    if (index === 0) throw new Error('synthetic parse failure');
    return index;
  }));
  await tick();
  assert.deepEqual(started, [0, 1, 2]);
  gates[0].open();
  await assert.rejects(runs[0], /synthetic parse failure/);
  await tick();
  assert.deepEqual(started, [0, 1, 2, 3], 'the failed run released its slot to the next in line');
  for (const entry of gates.slice(1)) entry.open();
  assert.deepEqual(await Promise.all(runs.slice(1)), [1, 2, 3, 4, 5]);
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5]);

  // Every slot is free again once the queue drains.
  const after = Array.from({ length: 3 }, gate);
  let running = 0;
  const again = after.map((entry) => runWithSourceMaterializationConcurrency('native-text', async () => {
    running += 1;
    await entry.opened;
  }));
  await tick();
  assert.equal(running, 3);
  for (const entry of after) entry.open();
  await Promise.all(again);
});

test('MinerU stays at one slot of its own and native parsing never waits for it', async () => {
  const mineru = [gate(), gate()];
  const started: string[] = [];
  const held = mineru.map((entry, index) => runWithSourceMaterializationConcurrency(MINERU_PARSER_KEY, async () => {
    started.push(`mineru-${index}`);
    await entry.opened;
  }));
  await tick();
  assert.deepEqual(started, ['mineru-0']);
  await runWithSourceMaterializationConcurrency('native-pdf', async () => { started.push('native'); });
  assert.deepEqual(started, ['mineru-0', 'native']);

  const natives = [gate(), gate(), gate()];
  const nativeRuns = natives.map((entry) => runWithSourceMaterializationConcurrency('native-pdf', () => entry.opened));
  mineru[0].open();
  await tick();
  assert.deepEqual(started, ['mineru-0', 'native', 'mineru-1'], 'full native slots do not hold MinerU back');
  mineru[1].open();
  for (const entry of natives) entry.open();
  await Promise.all([...held, ...nativeRuns]);
});

test('a batch of materializations through the real path parses at most three at a time and all finish', async (t) => {
  const f = await fixture(t);
  const ids: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    ids.push((await f.upload(`batch-${index}.txt`, `Batch body ${index}`, 'text/plain')).source.id);
  }
  let running = 0;
  let peak = 0;
  const { parseSourceArtifact } = await import('../services/sourceArtifact.js');
  const results = await Promise.all(ids.map((id) => materializeSourceNow(f.db, f.userId, id, {
    parseArtifact: async (input) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 40));
      running -= 1;
      return parseSourceArtifact(input);
    },
  })));
  assert.equal(peak, 3);
  assert.deepEqual(results.map((result) => result.status), Array(7).fill('materialized'));
});
