import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';

/**
 * K-7 is deliberately a mechanism-level structure lock. It proves that ZIP
 * expansion stays entry-lazy and stream-based; it does not claim to measure a
 * real process memory peak. K-1 through K-6 are observable result locks.
 */

type TestDb = Awaited<ReturnType<typeof initDb>>;

interface ZipEntryFixture {
  name?: string;
  rawName?: Buffer;
  bytes: Buffer;
  utf8?: boolean;
  corruptCrc?: boolean;
  compression?: 'store' | 'deflate';
}

interface CapturedContainerEntry {
  entry_index: number;
  original_filename: string | null;
  filename_decoding_fallback: boolean;
  status: 'succeeded' | 'failed';
  content_hash: string | null;
  source_record_id: string | null;
  source_file_id: string | null;
}

interface CapturedContainerReport {
  kind: 'zip';
  opened: boolean;
  incomplete: boolean;
  entry_count: number;
  entries: CapturedContainerEntry[];
}

interface SourceRow {
  source_record_id: string;
  source_file_id: string;
  original_filename: string;
  content_hash: string;
  storage_state: string;
  intake_declarations_json: string;
}

function fixtureCrc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildStoredZip(entries: ZipEntryFixture[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const nameBytes = entry.rawName || Buffer.from(entry.name || '', 'utf8');
    const flags = entry.utf8 === false ? 0 : 0x0800;
    const compressionMethod = entry.compression === 'deflate' ? 8 : 0;
    const encodedBytes = compressionMethod === 8 ? deflateRawSync(entry.bytes) : entry.bytes;
    const actualCrc = fixtureCrc32(entry.bytes);
    const recordedCrc = entry.corruptCrc ? (actualCrc ^ 0xffffffff) >>> 0 : actualCrc;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(flags, 6);
    localHeader.writeUInt16LE(compressionMethod, 8);
    localHeader.writeUInt32LE(recordedCrc, 14);
    localHeader.writeUInt32LE(encodedBytes.length, 18);
    localHeader.writeUInt32LE(entry.bytes.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(flags, 8);
    centralHeader.writeUInt16LE(compressionMethod, 10);
    centralHeader.writeUInt32LE(recordedCrc, 16);
    centralHeader.writeUInt32LE(encodedBytes.length, 20);
    centralHeader.writeUInt32LE(entry.bytes.length, 24);
    centralHeader.writeUInt16LE(nameBytes.length, 28);
    centralHeader.writeUInt32LE(localOffset, 42);

    localParts.push(localHeader, nameBytes, encodedBytes);
    centralParts.push(centralHeader, nameBytes);
    localOffset += localHeader.length + nameBytes.length + encodedBytes.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localOffset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

async function withDbAndStorage(
  run: (context: {
    db: TestDb;
    rootDir: string;
    userId: string;
    courseId: string;
  }) => void | Promise<void>,
): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-container-'));
  const rootDir = join(dir, 'source-blobs');
  const dbPath = join(dir, 'test.db');
  try {
    const db = await initDb(dbPath);
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(userId, `${userId}@example.com`, 'hash', 'Container Intake User');
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(courseId, userId, 'Container Intake Project');
    await run({ db, rootDir, userId, courseId });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function writeTempZip(rootDir: string, bytes: Buffer) {
  const tempDir = join(rootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(path, bytes);
  return {
    path,
    originalname: 'container.zip',
    mimetype: 'application/zip',
    size: bytes.length,
  };
}

async function intakeZip(
  db: TestDb,
  rootDir: string,
  userId: string,
  courseId: string,
  bytes: Buffer,
  onContainerExpansion?: (report: CapturedContainerReport) => void,
) {
  const options: Parameters<typeof intakeSourceTempFile>[3] & {
    onContainerExpansion?: (report: CapturedContainerReport) => void;
  } = { rootDir, onContainerExpansion };
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: writeTempZip(rootDir, bytes),
  }, options);
}

function sourceRows(db: TestDb, userId: string): SourceRow[] {
  return db.prepare(`
    SELECT
      sr.id AS source_record_id,
      sf.id AS source_file_id,
      sf.original_filename,
      sf.content_hash,
      sf.storage_state,
      sf.intake_declarations_json
    FROM source_files sf
    JOIN source_records sr ON sr.id = sf.source_record_id AND sr.user_id = sf.user_id
    WHERE sf.user_id = ?
    ORDER BY sr.created_at ASC, sr.id ASC
  `).all(userId) as SourceRow[];
}

function declarations(row: SourceRow): string[] {
  return JSON.parse(row.intake_declarations_json) as string[];
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function snapshotPathsOutsideRoot(rootDir: string): string[] {
  const parent = dirname(rootDir);
  const ignoredRoot = resolve(rootDir);
  const paths: string[] = [];

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = resolve(directory, entry.name);
      if (entryPath === ignoredRoot) continue;
      paths.push(relative(parent, entryPath).split('\\').join('/'));
      if (entry.isDirectory()) walk(entryPath);
    }
  }

  walk(parent);
  return paths.sort();
}

function snapshotFilesWithinRoot(rootDir: string): string[] {
  if (!existsSync(rootDir)) return [];
  const files: string[] = [];

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(entryPath);
      else files.push(relative(rootDir, entryPath).split('\\').join('/'));
    }
  }

  walk(rootDir);
  return files.sort();
}

test('K-1 good and traversal entries are independently adjudicated without rejecting the container', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const zip = buildStoredZip([
      { name: 'good.txt', bytes: Buffer.from('kept child', 'utf8'), compression: 'deflate' },
      { name: '../../escaped/', bytes: Buffer.alloc(0) },
    ]);
    let result: Awaited<ReturnType<typeof intakeZip>> | undefined;
    await assert.doesNotReject(async () => {
      result = await intakeZip(db, rootDir, userId, courseId, zip);
    });
    if (!result) throw new Error('container intake returned no result');
    const storedContainer = result;
    const rows = sourceRows(db, userId);
    const children = rows.filter((row) => row.source_record_id !== storedContainer.source.id);
    assert.deepEqual(children.map((row) => row.original_filename), ['good.txt']);
    assert.equal(children[0].content_hash, sha256(Buffer.from('kept child', 'utf8')));
    assert.equal(declarations(rows.find((row) => row.source_record_id === storedContainer.source.id)!)
      .includes('container_expansion_incomplete'), true);
  });
});

test('K-2 one four-entry fixture keeps piece count, container code, and entry accounting independent', async (t) => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const duplicateBytes = Buffer.from('same lecture bytes', 'utf8');
    const uniqueBytes = Buffer.from('unique notes bytes', 'utf8');
    const failedBytes = Buffer.from('crc failure bytes', 'utf8');
    const fixtures: ZipEntryFixture[] = [
      { name: 'lecture-a.txt', bytes: duplicateBytes },
      { name: 'lecture-b.txt', bytes: duplicateBytes },
      { name: 'notes.txt', bytes: uniqueBytes },
      { name: 'bad-crc.txt', bytes: failedBytes, corruptCrc: true },
    ];
    let report: CapturedContainerReport | null = null;
    const container = await intakeZip(
      db,
      rootDir,
      userId,
      courseId,
      buildStoredZip(fixtures),
      (captured) => { report = captured; },
    );
    const rows = sourceRows(db, userId);
    const childRows = rows.filter((row) => row.source_record_id !== container.source.id);
    const containerRow = rows.find((row) => row.source_record_id === container.source.id)!;

    await t.test('① piece count is exactly +2 because duplicate bytes retain one identity', () => {
      assert.equal(childRows.length, 2);
      assert.equal(childRows.every((row) => row.storage_state === 'ready'), true);
    });

    await t.test('② the container alone carries container_expansion_incomplete for the failed entry', () => {
      assert.equal(declarations(containerRow).includes('container_expansion_incomplete'), true);
    });

    await t.test('③ entry-layer accounting maps 3 successes to pieces and 1 failure to the failure set', () => {
      assert.ok(report, 'container expansion must expose an ephemeral reconciliation report');
      assert.equal(report.opened, true);
      assert.equal(report.incomplete, true);
      assert.equal(report.entry_count, 4);
      assert.deepEqual(
        report.entries.map((entry) => entry.original_filename),
        fixtures.map((fixture) => fixture.name || null),
      );

      const successful = report.entries.filter((entry) => entry.status === 'succeeded');
      const failed = report.entries.filter((entry) => entry.status === 'failed');
      assert.deepEqual(successful.map((entry) => entry.entry_index), [0, 1, 2]);
      assert.deepEqual(failed.map((entry) => entry.entry_index), [3]);

      for (const entry of successful) {
        const expectedHash = sha256(fixtures[entry.entry_index].bytes);
        assert.equal(entry.content_hash, expectedHash);
        const mappedPiece = childRows.find((row) => (
          row.source_record_id === entry.source_record_id
          && row.source_file_id === entry.source_file_id
        ));
        assert.ok(mappedPiece, `successful entry ${entry.entry_index} must map to a stored piece identity`);
        assert.equal(mappedPiece.content_hash, expectedHash);
      }
      assert.equal(failed[0].content_hash, null);
      assert.equal(failed[0].source_record_id, null);
      assert.equal(failed[0].source_file_id, null);

      const successSet = new Set(successful.map((entry) => entry.entry_index));
      const failureSet = new Set(failed.map((entry) => entry.entry_index));
      assert.deepEqual([...successSet].filter((index) => failureSet.has(index)), []);
      assert.deepEqual([...successSet, ...failureSet].sort((left, right) => left - right), [0, 1, 2, 3]);
    });
  });
});

test('K-3 extraction creates no filesystem path outside the managed target root', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const zip = buildStoredZip([
      { name: 'safe.txt', bytes: Buffer.from('safe child', 'utf8') },
      { name: '../escaped-from-container.txt', bytes: Buffer.from('escape attempt', 'utf8') },
    ]);
    const before = snapshotPathsOutsideRoot(rootDir);
    const container = await intakeZip(db, rootDir, userId, courseId, zip);
    const after = snapshotPathsOutsideRoot(rootDir);
    const children = sourceRows(db, userId)
      .filter((row) => row.source_record_id !== container.source.id);
    const allowedBlobPaths = (db.prepare(`
      SELECT storage_key FROM source_files WHERE user_id = ?
    `).all(userId) as Array<{ storage_key: string }>)
      .map((row) => row.storage_key.split('\\').join('/'))
      .sort();
    assert.deepEqual(children.map((row) => row.original_filename), ['safe.txt']);
    assert.deepEqual(after, before);
    assert.deepEqual(snapshotFilesWithinRoot(rootDir), allowedBlobPaths);
    assert.equal(existsSync(join(dirname(rootDir), 'escaped-from-container.txt')), false);
  });
});

test('K-4 CP437 filename fallback is deterministic without declaring non_utf8_text on the UTF-8 child', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const body = Buffer.from('valid UTF-8 body', 'utf8');
    const zip = buildStoredZip([{
      rawName: Buffer.from([0x01, 0x82, 0x2e, 0x74, 0x78, 0x74]),
      bytes: body,
      utf8: false,
    }]);
    const reports: CapturedContainerReport[] = [];
    const container = await intakeZip(
      db,
      rootDir,
      userId,
      courseId,
      zip,
      (captured) => { reports.push(captured); },
    );
    const rows = sourceRows(db, userId);
    const child = rows.find((row) => row.source_record_id !== container.source.id);
    const containerRow = rows.find((row) => row.source_record_id === container.source.id)!;
    assert.ok(child);
    assert.equal(child.storage_state, 'ready');
    assert.equal(child.original_filename, '☺é.txt');
    assert.equal(child.content_hash, sha256(body));
    assert.equal(declarations(child).includes('non_utf8_text'), false);

    assert.equal(reports.length, 1);
    const [report] = reports;
    assert.equal(report.opened, true);
    assert.equal(report.incomplete, false);
    assert.equal(report.entry_count, 1);
    assert.equal(report.entries.length, 1);
    const [entry] = report.entries;
    assert.equal(entry.original_filename, '☺é.txt');
    assert.equal(entry.filename_decoding_fallback, true);
    assert.equal(entry.status, 'succeeded');
    assert.equal(entry.content_hash, sha256(body));
    assert.equal(entry.source_record_id, child.source_record_id);
    assert.equal(entry.source_file_id, child.source_file_id);
    assert.equal(declarations(containerRow).includes('container_expansion_incomplete'), false);
  });
});

test('K-5 all three container code production cases are covered, including the empty negative control', async (t) => {
  await t.test('partial expansion adds the code', async () => {
    await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
      const result = await intakeZip(db, rootDir, userId, courseId, buildStoredZip([
        { name: 'kept.txt', bytes: Buffer.from('kept', 'utf8') },
        { name: '../blocked.txt', bytes: Buffer.from('blocked', 'utf8') },
      ]));
      const row = sourceRows(db, userId).find((candidate) => candidate.source_record_id === result.source.id)!;
      assert.equal(declarations(row).includes('container_expansion_incomplete'), true);
    });
  });

  await t.test('an unreadable whole package is still stored and adds the code', async () => {
    await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
      const unreadableZip = Buffer.from('this has no ZIP header or central directory', 'utf8');
      let result: Awaited<ReturnType<typeof intakeZip>> | undefined;
      await assert.doesNotReject(async () => {
        result = await intakeZip(db, rootDir, userId, courseId, unreadableZip);
      });
      if (!result) throw new Error('container intake returned no result');
      const storedContainer = result;
      const rows = sourceRows(db, userId);
      const row = rows.find((candidate) => candidate.source_record_id === storedContainer.source.id)!;
      assert.equal(declarations(row).includes('container_expansion_incomplete'), true);
      assert.equal(rows.filter((candidate) => candidate.source_record_id !== storedContainer.source.id).length, 0);
    });
  });

  await t.test('an empty package is a complete empty and has zero declarations', async () => {
    await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
      const result = await intakeZip(db, rootDir, userId, courseId, buildStoredZip([]));
      const rows = sourceRows(db, userId);
      const row = rows.find((candidate) => candidate.source_record_id === result.source.id)!;
      assert.deepEqual(declarations(row), []);
      assert.equal(rows.filter((candidate) => candidate.source_record_id !== result.source.id).length, 0);
    });
  });

  await t.test('an interrupted ready transition leaves a pessimistic code before expansion starts', async () => {
    await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
      const zip = buildStoredZip([{ name: 'good.txt', bytes: Buffer.from('good', 'utf8') }]);
      await assert.rejects(() => intakeSourceTempFile(db, userId, {
        course_id: courseId,
        origin_entry_kind: 'project_upload',
        file: writeTempZip(rootDir, zip),
      }, {
        rootDir,
        beforeReadyFlip: () => { throw new Error('simulated process interruption'); },
      }));
      const rows = sourceRows(db, userId);
      assert.equal(rows.length, 1);
      assert.equal(declarations(rows[0]).includes('container_expansion_incomplete'), true);
    });
  });
});

test('K-6 two entries with identical bytes still produce exactly one child piece', async () => {
  await withDbAndStorage(async ({ db, rootDir, userId, courseId }) => {
    const bytes = Buffer.from('one content identity', 'utf8');
    const zip = buildStoredZip([
      { name: 'copy-a.txt', bytes },
      { name: 'copy-b.txt', bytes },
    ]);
    const container = await intakeZip(db, rootDir, userId, courseId, zip);
    const children = sourceRows(db, userId)
      .filter((row) => row.source_record_id !== container.source.id);
    assert.equal(children.length, 1);
    assert.equal(children[0].content_hash, sha256(bytes));

    const secondCourseId = uuidv4();
    db.prepare(`
      INSERT INTO courses (id, user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(secondCourseId, userId, 'Second Container Project');
    const disguisedUpload = writeTempZip(rootDir, zip);
    disguisedUpload.originalname = 'same-container.bin';
    disguisedUpload.mimetype = 'application/octet-stream';
    const duplicateContainer = await intakeSourceTempFile(db, userId, {
      course_id: secondCourseId,
      origin_entry_kind: 'project_upload',
      file: disguisedUpload,
    }, { rootDir });
    assert.equal(duplicateContainer.deduplicated, true);
    assert.equal(duplicateContainer.source.id, container.source.id);
    const childPlacement = db.prepare(`
      SELECT 1 FROM source_project_placements
      WHERE user_id = ? AND source_record_id = ? AND course_id = ?
    `).get(userId, children[0].source_record_id, secondCourseId);
    assert.ok(childPlacement, 'canonical ZIP identity must re-expand children into the new Project');
    assert.equal(sourceRows(db, userId).length, 2);
  });
});

test('K-7 ZIP intake is lazy-entry and stream based without whole-archive buffering', () => {
  const servicePath = fileURLToPath(new URL('../services/sourceContainerIntake.ts', import.meta.url));
  if (!existsSync(servicePath)) {
    assert.fail('sourceContainerIntake.ts must exist before the streaming structure can be verified');
    return;
  }
  const source = readFileSync(servicePath, 'utf8');
  assert.match(source, /yauzl\.openPromise\s*\(\s*input\.zipPath\s*,\s*\{[\s\S]*?lazyEntries\s*:\s*true[\s\S]*?decodeStrings\s*:\s*false[\s\S]*?\}\s*\)/);
  assert.match(source, /zipFile\.openReadStreamPromise\s*\(\s*entry\s*\)/);
  assert.doesNotMatch(source, /\b(?:fromBuffer|readFile|readFileSync)\s*\(/);
});
