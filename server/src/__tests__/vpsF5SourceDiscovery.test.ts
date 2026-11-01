import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { executeTool } from '../agent/tools/executor.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';

// Tool-level checks with local fixtures. No provider key is visible, so the
// document path's semantic search is skipped and no model is called.
const originalEnv = process.env;
let appDataDir: string;
beforeEach(() => {
  appDataDir = mkdtempSync(join(tmpdir(), 'coincides-f5-appdata-'));
  process.env = {
    ...originalEnv,
    COINCIDES_APP_DATA_DIR: appDataDir,
    ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', GENERIC_API_KEY: '',
    DEEPSEEK_API_KEY: '', DASHSCOPE_API_KEY: '', VOYAGE_API_KEY: '',
  };
});
afterEach(() => {
  process.env = originalEnv;
  rmSync(appDataDir, { recursive: true, force: true });
});

interface Fixture { db: Database.Database; userId: string; courseId: string; sourceRootDir: string; canvasAssetRootDir: string }

async function withFixture(run: (fixture: Fixture) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-f5-'));
  try {
    const db = await initDb(join(dir, 'test.db'));
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'synthetic', 'Finder')")
      .run(userId, `${userId}@example.invalid`);
    db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'Networks')").run(courseId, userId);
    await run({ db, userId, courseId, sourceRootDir: join(dir, 'source-blobs'), canvasAssetRootDir: join(dir, 'canvas-assets') });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

async function uploadSource(fixture: Fixture, filename: string, paragraphs: string[], options: { courseId?: string; materialize?: boolean } = {}) {
  const tempDir = join(fixture.sourceRootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  const body = paragraphs.join('\n\n');
  writeFileSync(path, body);
  const uploaded = await intakeSourceTempFile(fixture.db, fixture.userId, {
    course_id: options.courseId ?? fixture.courseId,
    origin_entry_kind: 'project_upload',
    file: { path, originalname: filename, mimetype: 'text/plain', size: Buffer.byteLength(body) },
  }, { rootDir: fixture.sourceRootDir });
  if (options.materialize !== false) {
    const artifact = {
      schema_version: 'source-artifact.v1', artifact_kind: 'document', parser_key: 'native-text', parser_version: 'builtin-v1',
      blocks: paragraphs.map((text, index) => ({
        artifact_block_id: `text-${index + 1}`, kind: 'text', text, writing_role: 'paragraph',
        page_index: null, locator: { kind: 'text_paragraph', index: index + 1 }, metadata: {},
      })),
      metadata: {},
    } as SourceArtifact;
    await materializeSourceNow(fixture.db, fixture.userId, uploaded.source.id, {
      sourceRootDir: fixture.sourceRootDir, canvasAssetRootDir: fixture.canvasAssetRootDir, parseArtifact: async () => artifact,
    });
  }
  return uploaded.source.id;
}

async function search(fixture: Fixture, args: Record<string, unknown>) {
  return JSON.parse(await executeTool('search_documents', args, fixture.userId)) as {
    results: Array<Record<string, any>>;
    source_results: Array<Record<string, any>>;
    document_total?: number;
    source_total?: number;
    message?: string;
  };
}

const lecture = ['Ports name one service on a host.', 'Sockets pair an address with a port.', 'Routing picks the next hop.'];

test('a natural-language question finds a Source by its extracted text and points at read_note', async () => {
  await withFixture(async (fixture) => {
    const sourceId = await uploadSource(fixture, 'week3-lecture.txt', lecture);
    const projectionNoteId = (fixture.db.prepare('SELECT projection_note_id FROM source_materializations WHERE source_record_id = ?')
      .get(sourceId) as { projection_note_id: string }).projection_note_id;

    const found = await search(fixture, { query: 'what does a socket pair with?' });
    assert.equal(found.source_results.length, 1);
    // F8: a Sources-only hit must not read as an empty search.
    assert.equal(found.document_total, 0);
    assert.equal(found.source_total, 1);
    const [hit] = found.source_results;
    assert.equal(hit.source_record_id, sourceId);
    assert.equal(hit.projection_note_id, projectionNoteId);
    assert.equal(hit.matched_on, 'content');
    assert.equal(hit.snippets[0].content, 'Sockets pair an address with a port.');
    assert.equal(hit.course_id, fixture.courseId);
    // The projection note is readable through the existing read tool.
    const note = JSON.parse(await executeTool('read_note', { note_id: projectionNoteId }, fixture.userId));
    assert.match(JSON.stringify(note), /Routing picks the next hop/);
  });
});

test('a Source is also found by its name, and documents keep their own result list', async () => {
  await withFixture(async (fixture) => {
    await uploadSource(fixture, 'week3-lecture.txt', lecture);
    fixture.db.prepare(`
      INSERT INTO documents (id, user_id, course_id, filename, file_path, file_type, parse_status, summary)
      VALUES ('doc-1', ?, ?, 'week3-notes.pdf', 'synthetic-never-read.pdf', 'pdf', 'completed', 'Legacy week3 notes')
    `).run(fixture.userId, fixture.courseId);

    const found = await search(fixture, { query: 'week3' });
    assert.deepEqual(found.results.map((document) => document.id), ['doc-1']);
    assert.equal(found.results[0].source_record_id, undefined, 'documents rows are not Source rows');
    assert.equal(found.source_results.length, 1);
    assert.equal(found.source_results[0].title, 'week3-lecture.txt');
    assert.equal(found.source_results[0].matched_on, 'title');
  });
});

test('Sources outside the course filter or not yet extracted are not returned', async () => {
  await withFixture(async (fixture) => {
    const otherCourse = uuidv4();
    fixture.db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'History')").run(otherCourse, fixture.userId);
    await uploadSource(fixture, 'other.txt', ['Sockets in another course.'], { courseId: otherCourse });
    await uploadSource(fixture, 'pending.txt', ['Sockets waiting for extraction.'], { materialize: false });

    const found = await search(fixture, { query: 'sockets', course_id: fixture.courseId });
    assert.deepEqual(found.source_results, []);
    const anywhere = await search(fixture, { query: 'sockets' });
    assert.deepEqual(anywhere.source_results.map((hit) => hit.title), ['other.txt']);
  });
});

test('an empty library returns empty lists without an error', async () => {
  await withFixture(async (fixture) => {
    const found = await search(fixture, { query: 'anything at all' });
    assert.deepEqual(found.results, []);
    assert.deepEqual(found.source_results, []);
    assert.equal(found.document_total, 0);
    assert.equal(found.source_total, 0);
    // F8: an empty search is reported as no match, never as proof of absence.
    assert.match(found.message ?? '', /No documents or Sources matched these terms\. This is not proof the content does not exist/);
  });
});
