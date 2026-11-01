import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { applyMigrations, type Migration } from '../db/migrate.js';
import materialSourceBridge from '../db/migrations/084_v2_material_source_bridge.js';
import { ensureSegmentsForMaterial, listCourseMaterials, listSourceFragments } from '../services/courseMaterials.js';
import { applyOrganizedNoteProposal, createOrganizedNoteProposal } from '../services/organizedNoteProposals.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { deleteSourceWithCompensation } from '../services/sourceLifecycle.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';
import { rematerializeSource } from '../services/sourceReprojection.js';
import { generateSourceSnapshots } from '../services/sourceSnapshots.js';

// Local fixtures only. No provider key is visible, so proposals use the
// deterministic drafter and no model is ever called.
const originalEnv = process.env;
let appDataDir: string;
beforeEach(() => {
  appDataDir = mkdtempSync(join(tmpdir(), 'coincides-f3-appdata-'));
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

// ---------------------------------------------------------------- runner

function migration(id: string, up: (db: Database.Database) => void, foreignKeysOff?: true): Migration {
  return { id, description: id, up, ...(foreignKeysOff ? { foreignKeysOff } : {}) };
}

function parentChildDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE parent (id TEXT PRIMARY KEY, label TEXT NOT NULL);
    CREATE TABLE child_null (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id) ON DELETE SET NULL);
    CREATE TABLE child_cascade (id TEXT PRIMARY KEY, parent_id TEXT REFERENCES parent(id) ON DELETE CASCADE);
    INSERT INTO parent VALUES ('p1', 'kept');
    INSERT INTO child_null VALUES ('n1', 'p1');
    INSERT INTO child_cascade VALUES ('c1', 'p1');
  `);
  return db;
}

const rebuildParent = (db: Database.Database) => db.exec(`
  CREATE TABLE parent_next (id TEXT PRIMARY KEY, label TEXT);
  INSERT INTO parent_next SELECT id, label FROM parent;
  DROP TABLE parent;
  ALTER TABLE parent_next RENAME TO parent;
`);

test('migration runner leaves unmarked migrations under foreign key enforcement', () => {
  const db = parentChildDb();
  let inside: unknown;
  applyMigrations(db, [migration('900_plain', (target) => { inside = target.pragma('foreign_keys', { simple: true }); })]);
  assert.equal(inside, 1);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  db.close();
});

test('foreignKeysOff migrations rebuild a referenced table without touching its children', () => {
  const db = parentChildDb();
  let inside: unknown;
  applyMigrations(db, [migration('901_rebuild', (target) => {
    inside = target.pragma('foreign_keys', { simple: true });
    rebuildParent(target);
  }, true)]);
  assert.equal(inside, 0);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1, 'enforcement is restored');
  assert.deepEqual(db.prepare('SELECT parent_id FROM child_null').all(), [{ parent_id: 'p1' }]);
  assert.deepEqual(db.prepare('SELECT parent_id FROM child_cascade').all(), [{ parent_id: 'p1' }]);
  const childTarget = (db.prepare('PRAGMA foreign_key_list(child_null)').all() as Array<{ table: string }>)[0]?.table;
  assert.equal(childTarget, 'parent');
  db.close();
});

test('foreignKeysOff migrations roll back and restore enforcement when foreign_key_check fails', () => {
  const db = parentChildDb();
  assert.throws(() => applyMigrations(db, [migration('902_dangling', (target) => {
    target.exec("INSERT INTO child_cascade VALUES ('c2', 'missing-parent')");
  }, true)]), /902_dangling/);
  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.equal((db.prepare("SELECT COUNT(*) AS c FROM child_cascade WHERE id = 'c2'").get() as { c: number }).c, 0);
  assert.equal(db.prepare("SELECT id FROM db_migrations WHERE id = '902_dangling'").get(), undefined);
  db.close();
});

// ---------------------------------------------------------- migration 084

function legacyMaterialDb() {
  // The pre-084 shape (migrations 016/017/019) plus one row in every link we must keep.
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY);
    CREATE TABLE courses (id TEXT PRIMARY KEY);
    CREATE TABLE documents (id TEXT PRIMARY KEY);
    CREATE TABLE document_chunks (id TEXT PRIMARY KEY);
    CREATE TABLE source_records (id TEXT PRIMARY KEY);
    CREATE TABLE source_project_placements (id TEXT PRIMARY KEY);
    CREATE TABLE source_materials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL DEFAULT 'document', title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
      parse_status TEXT NOT NULL DEFAULT 'pending', fragment_status TEXT NOT NULL DEFAULT 'not_started',
      segment_status TEXT NOT NULL DEFAULT 'not_started', proposal_status TEXT NOT NULL DEFAULT 'not_proposed',
      used_in_note_count INTEGER NOT NULL DEFAULT 0, confidence REAL, warnings_json TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}', created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, document_id)
    );
    CREATE TABLE source_fragments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      source_material_id TEXT NOT NULL REFERENCES source_materials(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      document_chunk_id TEXT REFERENCES document_chunks(id) ON DELETE SET NULL,
      fragment_type TEXT NOT NULL DEFAULT 'chunk', title TEXT, content TEXT NOT NULL, page_start INTEGER,
      page_end INTEGER, order_index INTEGER NOT NULL DEFAULT 0, confidence REAL,
      warnings_json TEXT NOT NULL DEFAULT '[]', metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE material_segments (id TEXT PRIMARY KEY, source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE);
    CREATE TABLE material_segment_fragments (
      segment_id TEXT NOT NULL REFERENCES material_segments(id) ON DELETE CASCADE,
      fragment_id TEXT NOT NULL REFERENCES source_fragments(id) ON DELETE CASCADE,
      PRIMARY KEY (segment_id, fragment_id)
    );
    CREATE TABLE evidence_items (
      id TEXT PRIMARY KEY,
      source_material_id TEXT REFERENCES source_materials(id) ON DELETE SET NULL,
      source_fragment_id TEXT REFERENCES source_fragments(id) ON DELETE SET NULL
    );
    CREATE TABLE source_snapshots (id TEXT PRIMARY KEY, source_material_id TEXT REFERENCES source_materials(id) ON DELETE CASCADE);
    INSERT INTO users VALUES ('u1'); INSERT INTO courses VALUES ('k1'); INSERT INTO documents VALUES ('d1');
    INSERT INTO document_chunks VALUES ('ch1');
    INSERT INTO source_materials (id, user_id, course_id, document_id, title) VALUES ('m1', 'u1', 'k1', 'd1', 'Legacy handout');
    INSERT INTO source_fragments (id, user_id, course_id, source_material_id, document_id, document_chunk_id, content)
      VALUES ('f1', 'u1', 'k1', 'm1', 'd1', 'ch1', 'Legacy text');
    INSERT INTO material_segments VALUES ('s1', 'm1');
    INSERT INTO material_segment_fragments VALUES ('s1', 'f1');
    INSERT INTO evidence_items VALUES ('e1', 'm1', 'f1');
    INSERT INTO source_snapshots VALUES ('sn1', 'm1');
  `);
  return db;
}

test('084 keeps every legacy material, fragment and child link while opening the Source columns', () => {
  const db = legacyMaterialDb();
  applyMigrations(db, [materialSourceBridge as Migration]);

  assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.deepEqual(db.prepare('SELECT id, document_id, source_type, title FROM source_materials').all(),
    [{ id: 'm1', document_id: 'd1', source_type: 'document', title: 'Legacy handout' }]);
  assert.deepEqual(db.prepare('SELECT id, document_id, document_chunk_id, content FROM source_fragments').all(),
    [{ id: 'f1', document_id: 'd1', document_chunk_id: 'ch1', content: 'Legacy text' }]);
  assert.deepEqual(db.prepare('SELECT * FROM evidence_items').all(), [{ id: 'e1', source_material_id: 'm1', source_fragment_id: 'f1' }]);
  assert.deepEqual(db.prepare('SELECT * FROM source_snapshots').all(), [{ id: 'sn1', source_material_id: 'm1' }]);
  assert.deepEqual(db.prepare('SELECT * FROM material_segment_fragments').all(), [{ segment_id: 's1', fragment_id: 'f1' }]);
  for (const child of ['evidence_items', 'source_snapshots', 'material_segments']) {
    const targets = (db.prepare(`PRAGMA foreign_key_list(${child})`).all() as Array<{ table: string }>).map((fk) => fk.table);
    assert.ok(targets.every((table) => !table.endsWith('_v084')), `${child} still points at the live tables`);
  }

  const columns = (table: string) => db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string; notnull: number }>;
  assert.equal(columns('source_materials').find((column) => column.name === 'document_id')?.notnull, 0);
  assert.ok(columns('source_materials').some((column) => column.name === 'source_placement_id'));
  assert.equal(columns('source_fragments').find((column) => column.name === 'document_id')?.notnull, 0);
  assert.ok(columns('source_fragments').some((column) => column.name === 'note_block_id'));

  // Re-running is a no-op that keeps the rows.
  materialSourceBridge.up(db);
  assert.equal((db.prepare('SELECT COUNT(*) AS c FROM source_materials').get() as { c: number }).c, 1);
  db.close();
});

// --------------------------------------------------- Source as a supplier

async function withSourceProject(run: (context: {
  db: Database.Database; userId: string; courseId: string; sourceRootDir: string; canvasAssetRootDir: string;
}) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-f3-bridge-'));
  const sourceRootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');
  try {
    const db = await initDb(join(dir, 'test.db'));
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, 'synthetic', 'Bridge')")
      .run(userId, `${userId}@example.invalid`);
    db.prepare("INSERT INTO courses (id, user_id, name) VALUES (?, ?, 'Networks')").run(courseId, userId);
    await run({ db, userId, courseId, sourceRootDir, canvasAssetRootDir });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function artifact(blocks: Array<{ text: string; role?: 'heading' | 'paragraph' }>): SourceArtifact {
  return {
    schema_version: 'source-artifact.v1', artifact_kind: 'document', parser_key: 'native-text', parser_version: 'builtin-v1',
    blocks: blocks.map((block, index) => ({
      artifact_block_id: `text-${index + 1}`, kind: 'text', text: block.text, writing_role: block.role ?? 'paragraph',
      page_index: null, locator: { kind: 'text_paragraph', index: index + 1 }, metadata: {},
    })),
    metadata: {},
  } as SourceArtifact;
}

async function readySource(
  db: Database.Database, userId: string, courseId: string, sourceRootDir: string, canvasAssetRootDir: string,
  blocks: Array<{ text: string; role?: 'heading' | 'paragraph' }>,
) {
  const tempDir = join(sourceRootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  const body = blocks.map((block) => block.text).join('\n\n');
  writeFileSync(path, body);
  const uploaded = await intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: { path, originalname: 'handout.txt', mimetype: 'text/plain', size: Buffer.byteLength(body) },
  }, { rootDir: sourceRootDir });
  await materializeSourceNow(db, userId, uploaded.source.id, {
    sourceRootDir, canvasAssetRootDir, parseArtifact: async () => artifact(blocks),
  });
  return uploaded.source.id;
}

const handout = [
  { text: 'Ports', role: 'heading' as const },
  { text: 'A port names one service on a host.' },
  { text: 'Sockets pair an address with a port.' },
];

test('a Ready Source becomes Project material and feeds a note proposal end to end', async () => {
  await withSourceProject(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    const sourceId = await readySource(db, userId, courseId, sourceRootDir, canvasAssetRootDir, handout);

    const materials = listCourseMaterials(db, userId, courseId) as Array<Record<string, any>>;
    assert.equal(materials.length, 1);
    assert.equal(materials[0].source_type, 'source');
    assert.equal(materials[0].source_record_id, sourceId);
    assert.equal(materials[0].document_id, null);
    assert.equal(materials[0].parse_status, 'completed');
    assert.equal(materials[0].fragment_status, 'ready');

    const fragments = listSourceFragments(db, userId, materials[0].id) as Array<Record<string, any>>;
    assert.deepEqual(fragments.map((fragment) => [fragment.content, fragment.title]), [
      ['Ports', 'Ports'],
      ['A port names one service on a host.', 'Ports'],
      ['Sockets pair an address with a port.', 'Ports'],
    ]);
    assert.ok(fragments.every((fragment) => fragment.source_record_id === sourceId && fragment.note_block_id));

    ensureSegmentsForMaterial(db, userId, materials[0].id);
    const created = await createOrganizedNoteProposal(db, userId, { course_id: courseId }) as { id: string };
    // Apply the stored row, as the proposals route does.
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(created.id);
    db.transaction(() => applyOrganizedNoteProposal(db, userId, proposal as any))();
    const receipts = db.prepare(`
      SELECT nbs.source_record_id, nbs.document_id FROM note_block_sources nbs
      JOIN note_blocks b ON b.id = nbs.block_id WHERE b.source_kind = 'proposal'
    `).all() as Array<{ source_record_id: string | null; document_id: string | null }>;
    assert.ok(receipts.length > 0, 'the generated note cites its material');
    assert.ok(receipts.every((receipt) => receipt.source_record_id === sourceId && receipt.document_id === null));
  });
});

test('rebuilding a Source projection rebuilds its fragments and segments', async () => {
  await withSourceProject(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    const sourceId = await readySource(db, userId, courseId, sourceRootDir, canvasAssetRootDir, handout);
    const [material] = listCourseMaterials(db, userId, courseId) as Array<Record<string, any>>;
    ensureSegmentsForMaterial(db, userId, material.id);
    db.prepare("UPDATE material_segments SET status = 'accepted' WHERE source_material_id = ?").run(material.id);

    await rematerializeSource(db, userId, sourceId, {
      sourceRootDir, canvasAssetRootDir, parseArtifact: async () => artifact([{ text: 'Revised handout body.' }]),
    });

    listCourseMaterials(db, userId, courseId);
    const fragments = listSourceFragments(db, userId, material.id) as Array<Record<string, any>>;
    assert.deepEqual(fragments.map((fragment) => fragment.content), ['Revised handout body.']);
    assert.equal((db.prepare("SELECT COUNT(*) AS c FROM material_segments WHERE source_material_id = ? AND status = 'accepted'")
      .get(material.id) as { c: number }).c, 0);
  });
});

test('deleting the Source or removing its Project placement removes the material', async () => {
  await withSourceProject(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    const count = (table: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get() as { c: number }).c;

    const deleted = await readySource(db, userId, courseId, sourceRootDir, canvasAssetRootDir, handout);
    const [material] = listCourseMaterials(db, userId, courseId) as Array<Record<string, any>>;
    ensureSegmentsForMaterial(db, userId, material.id);
    assert.ok(count('source_fragments') > 0 && count('material_segments') > 0);
    deleteSourceWithCompensation(db, userId, deleted, { sourceRootDir, canvasAssetRootDir });
    assert.deepEqual([count('source_materials'), count('source_fragments'), count('material_segments')], [0, 0, 0]);

    await readySource(db, userId, courseId, sourceRootDir, canvasAssetRootDir, [{ text: 'Second handout.' }]);
    listCourseMaterials(db, userId, courseId);
    assert.equal(count('source_materials'), 1);
    db.prepare('DELETE FROM source_project_placements WHERE course_id = ?').run(courseId);
    assert.deepEqual([count('source_materials'), count('source_fragments')], [0, 0]);
    assert.equal(count('source_records'), 1, 'removing a placement keeps the Source itself');
  });
});

test('snapshots refuse a Source material with a clear error and skip it project-wide', async () => {
  await withSourceProject(async ({ db, userId, courseId, sourceRootDir, canvasAssetRootDir }) => {
    await readySource(db, userId, courseId, sourceRootDir, canvasAssetRootDir, handout);
    const [material] = listCourseMaterials(db, userId, courseId) as Array<Record<string, any>>;

    assert.throws(() => generateSourceSnapshots(db, userId, { course_id: courseId, source_material_id: material.id }),
      (error: any) => error?.statusCode === 409 && error?.details?.code === 'source_material_snapshot_unsupported');
    const projectWide = generateSourceSnapshots(db, userId, { course_id: courseId }) as { warnings: string[] };
    assert.ok(projectWide.warnings.some((warning) => /snapshots are not available for Sources/.test(warning)));
  });
});
