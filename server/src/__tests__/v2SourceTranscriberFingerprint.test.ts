import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import sourceImprintsMigration from '../db/migrations/049_v2_source_imprints.js';
import transcriberLockfileHashMigration from '../db/migrations/051_v2_transcriber_lockfile_hash.js';
import { closeDb, initDb } from '../db/init.js';
import type { SourceArtifact } from '../services/sourceArtifact.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import {
  sameSourceImprintTranscriber,
  storeSourceImprint,
  type SourceImprintInput,
} from '../services/sourceImprints.js';
import { materializeSourceNow } from '../services/sourceMaterialization.js';

const TRANSCRIBER_LOCKFILE_URL = new URL('../../package-lock.json', import.meta.url);

type TestDb = Awaited<ReturnType<typeof initDb>>;

function sha256(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function currentTranscriberLockfileHash(): string {
  return sha256(readFileSync(TRANSCRIBER_LOCKFILE_URL));
}

function seedUserCourse(db: TestDb): { userId: string; courseId: string } {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).run(userId, `${userId}@example.com`, 'hash', 'Transcriber Fingerprint User');
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, 'Transcriber Fingerprint Project');
  return { userId, courseId };
}

async function withSourceDb(
  run: (context: {
    db: TestDb;
    rootDir: string;
    canvasAssetRootDir: string;
    userId: string;
    courseId: string;
  }) => void | Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-transcriber-fingerprint-'));
  const rootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');
  try {
    const db = await initDb(join(dir, 'test.db'));
    const { userId, courseId } = seedUserCourse(db);
    await run({ db, rootDir, canvasAssetRootDir, userId, courseId });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

async function intakeFixture(
  db: TestDb,
  rootDir: string,
  userId: string,
  courseId: string,
  filename: string,
  mimeType: string,
  bytes: Buffer,
) {
  const tempDir = join(rootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const tempPath = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(tempPath, bytes);
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: {
      path: tempPath,
      originalname: filename,
      mimetype: mimeType,
      size: bytes.length,
    },
  }, { rootDir });
}

function textArtifact(text: string): SourceArtifact {
  return {
    schema_version: 'source-artifact.v1',
    artifact_kind: 'document',
    parser_key: 'native-text',
    parser_version: 'builtin-v1',
    blocks: [{
      artifact_block_id: 'fingerprint-block-1',
      kind: 'text',
      text,
      writing_role: 'paragraph',
      page_index: null,
      locator: { kind: 'text_paragraph', index: 1 },
      metadata: {},
    }],
    metadata: {},
  };
}

function fingerprintedInput(
  sourceFileId: string,
  name: string,
  version: string,
  lockfileHash: string,
  text = 'Alpha',
): SourceImprintInput {
  return {
    source_file_id: sourceFileId,
    transcriber: {
      name,
      version,
      lockfile: 'fixtures/identity-probe.lock',
      lockfile_hash: lockfileHash,
    },
    anchor_fidelity: 'char',
    text_normalization: 'none',
    fragments: [{
      seq: 0,
      text,
      role: 'para',
      anchor: { family: 'flow', path: 'body', char: [0, text.length] },
    }],
    warnings: [],
  };
}

test('K-1 migration appends a nullable hash without rewriting a legacy row or its lockfile path bytes', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    db.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY);
      CREATE TABLE source_files (id TEXT PRIMARY KEY);
      INSERT INTO users (id) VALUES ('legacy-user');
      INSERT INTO source_files (id) VALUES ('legacy-source-file');
    `);
    sourceImprintsMigration.up(db);

    const legacyPath = '_external_tools/mineru/uv.lock';
    db.prepare(`
      INSERT INTO source_imprints (
        id, user_id, source_file_id, transcriber_name, transcriber_version,
        transcriber_lockfile, anchor_fidelity, text_normalization, fragment_count,
        warnings_json, status, rejection_reasons_json, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'legacy-imprint',
      'legacy-user',
      'legacy-source-file',
      'legacy-transcriber',
      '3.4.5',
      legacyPath,
      'page',
      'none',
      0,
      '[]',
      'accepted',
      '[]',
      '2026-08-28T12:34:56.000Z',
    );
    const before = db.prepare(`
      SELECT transcriber_lockfile,
             hex(CAST(transcriber_lockfile AS BLOB)) AS transcriber_lockfile_hex
      FROM source_imprints
      WHERE id = 'legacy-imprint'
    `).get() as { transcriber_lockfile: string; transcriber_lockfile_hex: string };

    transcriberLockfileHashMigration.up(db);
    transcriberLockfileHashMigration.up(db);

    const after = db.prepare(`
      SELECT transcriber_lockfile,
             hex(CAST(transcriber_lockfile AS BLOB)) AS transcriber_lockfile_hex,
             transcriber_lockfile_hash
      FROM source_imprints
      WHERE id = 'legacy-imprint'
    `).get() as {
      transcriber_lockfile: string;
      transcriber_lockfile_hex: string;
      transcriber_lockfile_hash: string | null;
    };
    assert.equal(after.transcriber_lockfile_hash, null);
    assert.equal(after.transcriber_lockfile, before.transcriber_lockfile);
    assert.equal(after.transcriber_lockfile_hex, before.transcriber_lockfile_hex);

    const columns = db.prepare('PRAGMA table_info(source_imprints)').all() as Array<{
      name: string;
      notnull: number;
      dflt_value: string | null;
    }>;
    assert.equal(columns.at(-1)?.name, 'transcriber_lockfile_hash');
    assert.equal(columns.at(-1)?.notnull, 0);
    assert.equal(columns.at(-1)?.dflt_value, null);
  } finally {
    db.close();
  }
});

test('K-2 text-fallback intake persists SHA-256 independently recomputed from raw lockfile bytes', async () => {
  await withSourceDb(async ({ db, rootDir, userId, courseId }) => {
    const expected = createHash('sha256')
      .update(readFileSync(TRANSCRIBER_LOCKFILE_URL))
      .digest('hex');
    const intake = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'fingerprint-fallback.unlisted',
      'application/octet-stream',
      Buffer.from('First line\nSecond line', 'utf8'),
    );
    const row = db.prepare(`
      SELECT transcriber_lockfile_hash
      FROM source_imprints
      WHERE source_file_id = ?
        AND transcriber_name = 'source-intake-text-fallback'
        AND status = 'accepted'
    `).get(intake.source.file.id) as { transcriber_lockfile_hash: string } | undefined;
    assert.ok(row);
    assert.equal(row.transcriber_lockfile_hash, expected);
  });
});

test('K-2 SourceArtifact materialization persists SHA-256 independently recomputed from raw lockfile bytes', async () => {
  await withSourceDb(async ({ db, rootDir, canvasAssetRootDir, userId, courseId }) => {
    const expected = createHash('sha256')
      .update(readFileSync(TRANSCRIBER_LOCKFILE_URL))
      .digest('hex');
    const intake = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'fingerprint-materialization.md',
      'text/markdown',
      Buffer.from('Materialized text', 'utf8'),
    );
    const result = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir: rootDir,
      canvasAssetRootDir,
      parseArtifact: async () => textArtifact('Materialized text'),
    });
    assert.equal(result.status, 'materialized');

    const row = db.prepare(`
      SELECT transcriber_lockfile_hash
      FROM source_imprints
      WHERE source_file_id = ?
        AND transcriber_name = 'native-text'
        AND status = 'accepted'
    `).get(intake.source.file.id) as { transcriber_lockfile_hash: string } | undefined;
    assert.ok(row);
    assert.equal(row.transcriber_lockfile_hash, expected);
  });
});

test('K-3 transcriber identity uses only hash: equal is same, while equal name/version with different hash is different', async () => {
  await withSourceDb(async ({ db, rootDir, userId, courseId }) => {
    const intake = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'identity-source.txt',
      'text/plain',
      Buffer.from('Alpha', 'utf8'),
    );
    const hashA = createHash('sha256')
      .update('identity-probe-lockfile-A\n', 'utf8')
      .digest('hex');
    const hashB = createHash('sha256')
      .update('identity-probe-lockfile-B\n', 'utf8')
      .digest('hex');

    const first = storeSourceImprint(
      db,
      userId,
      fingerprintedInput(intake.source.file.id, 'same-name', '3.4.5', hashA),
      { rootDir },
    );
    const sameLabelsDifferentHash = storeSourceImprint(
      db,
      userId,
      fingerprintedInput(intake.source.file.id, 'same-name', '3.4.5', hashB),
      { rootDir },
    );
    const differentLabelsSameHash = storeSourceImprint(
      db,
      userId,
      fingerprintedInput(intake.source.file.id, 'different-name', '99.0.0', hashA),
      { rootDir },
    );

    assert.equal(first.imprint.transcriber_name, sameLabelsDifferentHash.imprint.transcriber_name);
    assert.equal(first.imprint.transcriber_version, sameLabelsDifferentHash.imprint.transcriber_version);
    assert.equal(sameSourceImprintTranscriber(first.imprint, sameLabelsDifferentHash.imprint), false);
    assert.notEqual(first.imprint.transcriber_name, differentLabelsSameHash.imprint.transcriber_name);
    assert.notEqual(first.imprint.transcriber_version, differentLabelsSameHash.imprint.transcriber_version);
    assert.equal(sameSourceImprintTranscriber(first.imprint, differentLabelsSameHash.imprint), true);
    assert.equal(
      sameSourceImprintTranscriber(
        { transcriber_lockfile_hash: null },
        { transcriber_lockfile_hash: null },
      ),
      false,
    );
  });
});

test('K-3 both production gates use hash-only identity for their real deduplication decisions', async () => {
  await withSourceDb(async ({ db, rootDir, canvasAssetRootDir, userId, courseId }) => {
    const currentHash = currentTranscriberLockfileHash();
    const alternateHash = createHash('sha256')
      .update('production-k3-alternate-lockfile-bytes\n', 'utf8')
      .digest('hex');

    const intakePositiveText = 'K3 intake positive';
    const intakePositive = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-intake-positive.md',
      'text/markdown',
      Buffer.from(intakePositiveText, 'utf8'),
    );
    storeSourceImprint(
      db,
      userId,
      fingerprintedInput(
        intakePositive.source.file.id,
        'different-from-fallback',
        '99.0.0',
        currentHash,
        intakePositiveText,
      ),
      { rootDir },
    );
    const intakePositiveDuplicate = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-intake-positive.unlisted',
      'application/octet-stream',
      Buffer.from(intakePositiveText, 'utf8'),
    );
    assert.equal(intakePositiveDuplicate.source.file.id, intakePositive.source.file.id);
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?')
        .get(intakePositive.source.file.id) as { count: number }).count,
      1,
    );

    const intakeNegativeText = 'K3 intake negative';
    const intakeNegative = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-intake-negative.md',
      'text/markdown',
      Buffer.from(intakeNegativeText, 'utf8'),
    );
    storeSourceImprint(
      db,
      userId,
      fingerprintedInput(
        intakeNegative.source.file.id,
        'source-intake-text-fallback',
        '1',
        alternateHash,
        intakeNegativeText,
      ),
      { rootDir },
    );
    const intakeNegativeDuplicate = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-intake-negative.unlisted',
      'application/octet-stream',
      Buffer.from(intakeNegativeText, 'utf8'),
    );
    assert.equal(intakeNegativeDuplicate.source.file.id, intakeNegative.source.file.id);
    const intakeNegativeRows = db.prepare(`
      SELECT transcriber_name, transcriber_version, transcriber_lockfile_hash
      FROM source_imprints
      WHERE source_file_id = ?
      ORDER BY created_at, id
    `).all(intakeNegative.source.file.id) as Array<{
      transcriber_name: string;
      transcriber_version: string;
      transcriber_lockfile_hash: string;
    }>;
    assert.equal(intakeNegativeRows.length, 2);
    assert.deepEqual(
      new Set(intakeNegativeRows.map((row) => row.transcriber_lockfile_hash)),
      new Set([alternateHash, currentHash]),
    );
    assert.equal(intakeNegativeRows.every((row) => row.transcriber_name === 'source-intake-text-fallback'), true);
    assert.equal(intakeNegativeRows.every((row) => row.transcriber_version === '1'), true);

    const materializationPositiveText = 'K3 materialization positive';
    const materializationPositive = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-materialization-positive.md',
      'text/markdown',
      Buffer.from(materializationPositiveText, 'utf8'),
    );
    storeSourceImprint(
      db,
      userId,
      fingerprintedInput(
        materializationPositive.source.file.id,
        'different-from-parser',
        '88.0.0',
        currentHash,
        materializationPositiveText,
      ),
      { rootDir },
    );
    const materializationPositiveResult = await materializeSourceNow(
      db,
      userId,
      materializationPositive.source.id,
      {
        sourceRootDir: rootDir,
        canvasAssetRootDir,
        parseArtifact: async () => textArtifact(materializationPositiveText),
      },
    );
    assert.equal(materializationPositiveResult.status, 'materialized');
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints WHERE source_file_id = ?')
        .get(materializationPositive.source.file.id) as { count: number }).count,
      1,
    );

    const materializationNegativeText = 'K3 materialization negative';
    const materializationNegative = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'k3-materialization-negative.md',
      'text/markdown',
      Buffer.from(materializationNegativeText, 'utf8'),
    );
    storeSourceImprint(
      db,
      userId,
      fingerprintedInput(
        materializationNegative.source.file.id,
        'native-text',
        'builtin-v1',
        alternateHash,
        materializationNegativeText,
      ),
      { rootDir },
    );
    const materializationNegativeResult = await materializeSourceNow(
      db,
      userId,
      materializationNegative.source.id,
      {
        sourceRootDir: rootDir,
        canvasAssetRootDir,
        parseArtifact: async () => textArtifact(materializationNegativeText),
      },
    );
    assert.equal(materializationNegativeResult.status, 'materialized');
    const materializationNegativeRows = db.prepare(`
      SELECT transcriber_name, transcriber_version, transcriber_lockfile_hash
      FROM source_imprints
      WHERE source_file_id = ?
      ORDER BY created_at, id
    `).all(materializationNegative.source.file.id) as Array<{
      transcriber_name: string;
      transcriber_version: string;
      transcriber_lockfile_hash: string;
    }>;
    assert.equal(materializationNegativeRows.length, 2);
    assert.deepEqual(
      new Set(materializationNegativeRows.map((row) => row.transcriber_lockfile_hash)),
      new Set([alternateHash, currentHash]),
    );
    assert.equal(materializationNegativeRows.every((row) => row.transcriber_name === 'native-text'), true);
    assert.equal(materializationNegativeRows.every((row) => row.transcriber_version === 'builtin-v1'), true);
  });
});

test('K-4 service rejects a real Source imprint write that omits the lockfile hash', async () => {
  await withSourceDb(async ({ db, rootDir, userId, courseId }) => {
    const intake = await intakeFixture(
      db,
      rootDir,
      userId,
      courseId,
      'missing-hash-source.txt',
      'text/plain',
      Buffer.from('Alpha', 'utf8'),
    );
    const before = (db.prepare('SELECT COUNT(*) AS count FROM source_imprints')
      .get() as { count: number }).count;
    const missingHashInput = {
      source_file_id: intake.source.file.id,
      transcriber: {
        name: 'missing-hash-probe',
        version: '1.0.0',
        lockfile: 'fixtures/missing-hash.lock',
      },
      anchor_fidelity: 'char',
      text_normalization: 'none',
      fragments: [{
        seq: 0,
        text: 'Alpha',
        role: 'para',
        anchor: { family: 'flow', path: 'body', char: [0, 5] },
      }],
      warnings: [],
    } as unknown as SourceImprintInput;

    assert.throws(
      () => storeSourceImprint(db, userId, missingHashInput, { rootDir }),
      /transcriber\.lockfile_hash must be a lowercase SHA-256 hex digest/,
    );
    assert.equal(
      (db.prepare('SELECT COUNT(*) AS count FROM source_imprints').get() as { count: number }).count,
      before,
    );
  });
});

test('K-5 changing one byte in an out-of-repository lockfile copy changes the recomputed fingerprint', () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-lockfile-byte-counterexample-'));
  try {
    const originalBytes = readFileSync(TRANSCRIBER_LOCKFILE_URL);
    const copyPath = join(dir, 'package-lock.json');
    writeFileSync(copyPath, originalBytes);
    const before = sha256(readFileSync(copyPath));
    assert.equal(before, currentTranscriberLockfileHash());

    const changedBytes = readFileSync(copyPath);
    changedBytes[0] ^= 0x01;
    writeFileSync(copyPath, changedBytes);
    const after = sha256(readFileSync(copyPath));

    assert.equal(changedBytes.length, originalBytes.length);
    assert.equal(changedBytes.subarray(1).equals(originalBytes.subarray(1)), true);
    assert.notEqual(after, before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
