import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  truncateSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import { createSourceIdentityFloor } from '../services/sourceRecords.js';
import {
  getSourceBlob,
  getSourceRecordDetail,
  inspectSourceTempFile,
  intakeSourceTempFile,
  listSourceRecords,
  sweepSourceStorage,
} from '../services/sourceFileIntake.js';

const PDF_A = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
const PDF_B = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Page >>\nendobj\n%%EOF');

async function withDbAndStorage(
  run: (context: {
    db: Awaited<ReturnType<typeof initDb>>;
    rootDir: string;
  }) => void | Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-intake-'));
  const dbPath = join(dir, 'test.db');
  const rootDir = join(dir, 'source-blobs');

  try {
    const db = await initDb(dbPath);
    await run({ db, rootDir });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourse(
  db: Awaited<ReturnType<typeof initDb>>,
  label = 'Source Intake User',
) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash', label);
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, `${label} Project`);
  return { userId, courseId };
}

function seedCourse(db: Awaited<ReturnType<typeof initDb>>, userId: string, name: string) {
  const courseId = uuidv4();
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run(courseId, userId, name);
  return courseId;
}

function writeTemp(
  rootDir: string,
  filename: string,
  contents: Buffer | string,
  mimeType: string,
) {
  const tempDir = join(rootDir, '.tmp');
  mkdirSync(tempDir, { recursive: true });
  const path = join(tempDir, `${uuidv4()}.upload`);
  writeFileSync(path, contents);
  return {
    path,
    originalname: filename,
    mimetype: mimeType,
    size: Buffer.byteLength(contents),
  };
}

test('Source intake validates extension, MIME, magic/text sanity, empty file, and 50MB limit', async () => {
  await withDbAndStorage(async ({ rootDir }) => {
    const pdf = await inspectSourceTempFile(
      writeTemp(rootDir, 'paper.pdf', PDF_A, 'application/pdf'),
      { rootDir },
    );
    assert.equal(pdf.format, 'pdf');
    assert.equal(pdf.capability, 'materializable');
    assert.match(pdf.content_hash, /^[a-f0-9]{64}$/);

    const docx = await inspectSourceTempFile(
      writeTemp(rootDir, 'notes.docx', Buffer.from('PK\u0003\u0004word/document.xml'),
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      { rootDir },
    );
    assert.equal(docx.format, 'docx');

    const csv = await inspectSourceTempFile(
      writeTemp(rootDir, 'table.csv', 'name,value\nalpha,1\n', 'text/csv'),
      { rootDir },
    );
    assert.equal(csv.capability, 'stored_only');

    await assert.rejects(
      inspectSourceTempFile(
        writeTemp(rootDir, 'fake.pdf', Buffer.from('not a pdf'), 'application/pdf'),
        { rootDir },
      ),
      (error: any) => error?.details?.code === 'invalid_file_signature',
    );
    await assert.rejects(
      inspectSourceTempFile(
        writeTemp(rootDir, 'wrong.txt', Buffer.from([0, 1, 2, 3]), 'text/plain'),
        { rootDir },
      ),
      (error: any) => error?.details?.code === 'invalid_text_encoding',
    );
    await assert.rejects(
      inspectSourceTempFile(writeTemp(rootDir, 'empty.md', '', 'text/markdown'), { rootDir }),
      (error: any) => error?.details?.code === 'empty_file',
    );

    const oversized = writeTemp(rootDir, 'large.pdf', PDF_A, 'application/pdf');
    truncateSync(oversized.path, 50 * 1024 * 1024 + 1);
    await assert.rejects(
      inspectSourceTempFile(oversized, { rootDir }),
      (error: any) => error?.details?.code === 'file_too_large',
    );
  });
});

test('successful intake moves temp to an internal ready blob and returns a path-safe DTO', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const temp = writeTemp(rootDir, 'paper.pdf', PDF_A, 'application/pdf');
    const result = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: temp,
    }, { rootDir });

    assert.equal(result.created, true);
    assert.equal(result.deduplicated, false);
    assert.equal(result.source.file.storage_state, 'ready');
    assert.equal(result.source.file.blob_available, true);
    assert.equal(existsSync(temp.path), false);
    assert.equal('storage_key' in result.source.file, false);
    assert.equal(JSON.stringify(result).includes(rootDir), false);

    const row = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
      .get(result.source.id) as { storage_key: string };
    assert.equal(existsSync(join(rootDir, row.storage_key)), true);
  });
});

test('same hash converges to one Source while adding placements across Projects', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const secondCourseId = seedCourse(db, userId, 'Second Project');
    const firstTemp = writeTemp(rootDir, 'same.pdf', PDF_A, 'application/pdf');
    const secondTemp = writeTemp(rootDir, 'same-again.pdf', PDF_A, 'application/pdf');

    const [first, second] = await Promise.all([
      intakeSourceTempFile(db, userId, {
        course_id: courseId,
        origin_entry_kind: 'project_upload',
        file: firstTemp,
      }, { rootDir }),
      intakeSourceTempFile(db, userId, {
        course_id: secondCourseId,
        origin_entry_kind: 'project_upload',
        file: secondTemp,
      }, { rootDir }),
    ]);

    assert.equal(first.source.id, second.source.id);
    assert.equal([first.deduplicated, second.deduplicated].filter(Boolean).length, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_records').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_files').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_materializations').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements').get() as any).count, 2);
    assert.equal(existsSync(firstTemp.path), false);
    assert.equal(existsSync(secondTemp.path), false);
  });
});

test('same display name with different hashes receives a stable suffix', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const first = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: writeTemp(rootDir, 'paper.pdf', PDF_A, 'application/pdf'),
    }, { rootDir });
    const second = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: writeTemp(rootDir, 'paper.pdf', PDF_B, 'application/pdf'),
    }, { rootDir });

    assert.equal(first.source.display_name, 'paper.pdf');
    assert.equal(second.source.display_name, 'paper (1).pdf');
  });
});

test('Source Library intake creates and reuses Home as its placement lens', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId } = seedUserCourse(db);
    const first = await intakeSourceTempFile(db, userId, {
      origin_entry_kind: 'library_upload',
      file: writeTemp(rootDir, 'library.pdf', PDF_A, 'application/pdf'),
    }, { rootDir });

    const home = db.prepare(`
      SELECT id, name, system_kind FROM courses
      WHERE user_id = ? AND system_kind = 'home'
    `).get(userId) as any;
    assert.equal(home.name, 'Home');
    assert.equal(first.source.origin.course_id, home.id);
    assert.equal(first.source.placements[0].course_id, home.id);

    const second = await intakeSourceTempFile(db, userId, {
      origin_entry_kind: 'library_upload',
      file: writeTemp(rootDir, 'library-2.pdf', PDF_B, 'application/pdf'),
    }, { rootDir });
    assert.equal(second.source.placements[0].course_id, home.id);
    assert.equal((db.prepare(`
      SELECT COUNT(*) AS count FROM courses
      WHERE user_id = ? AND system_kind = 'home'
    `).get(userId) as any).count, 1);
  });
});

test('duplicate placement failure keeps the existing Source and removes the second temp file', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const secondCourseId = seedCourse(db, userId, 'Placement Failure Project');
    await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: writeTemp(rootDir, 'shared.pdf', PDF_A, 'application/pdf'),
    }, { rootDir });

    db.exec(`
      CREATE TRIGGER fail_source_placement
      BEFORE INSERT ON source_project_placements
      WHEN NEW.course_id = '${secondCourseId}'
      BEGIN
        SELECT RAISE(ABORT, 'injected placement failure');
      END;
    `);
    const duplicateTemp = writeTemp(rootDir, 'shared-again.pdf', PDF_A, 'application/pdf');
    await assert.rejects(intakeSourceTempFile(db, userId, {
      course_id: secondCourseId,
      origin_entry_kind: 'project_upload',
      file: duplicateTemp,
    }, { rootDir }));

    assert.equal(existsSync(duplicateTemp.path), false);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_records').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_files').get() as any).count, 1);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements').get() as any).count, 1);
  });
});

test('rename failure removes the staged identity and all temporary filesystem state', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const temp = writeTemp(rootDir, 'rename-failure.pdf', PDF_A, 'application/pdf');

    await assert.rejects(intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: temp,
    }, {
      rootDir,
      renameFile: () => {
        throw Object.assign(new Error('injected rename failure'), { code: 'EIO' });
      },
    }), (error: any) => error?.details?.code === 'blob_commit_failed');

    assert.equal(existsSync(temp.path), false);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_records').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_files').get() as any).count, 0);
  });
});

test('post-stage failure removes the four-layer identity before the blob commit begins', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const temp = writeTemp(rootDir, 'stage-failure.pdf', PDF_A, 'application/pdf');

    await assert.rejects(intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: temp,
    }, {
      rootDir,
      afterIdentityStaged: () => {
        throw new Error('injected failure after identity stage');
      },
    }), (error: any) => error?.details?.code === 'source_stage_failed');

    assert.equal(existsSync(temp.path), false);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_records').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_files').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_materializations').get() as any).count, 0);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM source_project_placements').get() as any).count, 0);
  });
});

test('ready-flip interruption leaves recoverable staging and startup sweep completes it', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const temp = writeTemp(rootDir, 'recoverable.pdf', PDF_A, 'application/pdf');

    await assert.rejects(intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: temp,
    }, {
      rootDir,
      beforeReadyFlip: () => {
        throw new Error('injected crash after rename');
      },
    }), (error: any) => error?.details?.code === 'ready_flip_interrupted');

    const before = db.prepare('SELECT storage_state, storage_key FROM source_files').get() as any;
    assert.equal(before.storage_state, 'staging');
    assert.equal(existsSync(join(rootDir, before.storage_key)), true);

    const report = sweepSourceStorage(db, { rootDir });
    assert.equal(report.recovered_staging, 1);
    const after = db.prepare('SELECT storage_state FROM source_files').get() as any;
    assert.equal(after.storage_state, 'ready');
  });
});

test('startup sweep removes stale DB/temp orphans but preserves fresh staging', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const old = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const fresh = new Date().toISOString();

    const stale = createSourceIdentityFloor(db, userId, {
      course_id: courseId,
      display_name: 'stale.pdf',
      file: {
        original_filename: 'stale.pdf',
        storage_key: `${userId}/${uuidv4()}.pdf`,
        storage_state: 'staging',
        mime_type: 'application/pdf',
        byte_size: PDF_A.length,
        content_hash: 'a'.repeat(64),
        uploaded_at: old,
      },
      materialization: { parser_key: 'native-pdf', parser_version: '2.4.5' },
    });
    const recent = createSourceIdentityFloor(db, userId, {
      course_id: courseId,
      display_name: 'fresh.pdf',
      file: {
        original_filename: 'fresh.pdf',
        storage_key: `${userId}/${uuidv4()}.pdf`,
        storage_state: 'staging',
        mime_type: 'application/pdf',
        byte_size: PDF_B.length,
        content_hash: 'b'.repeat(64),
        uploaded_at: fresh,
      },
      materialization: { parser_key: 'native-pdf', parser_version: '2.4.5' },
    });

    const orphan = writeTemp(rootDir, 'orphan.pdf', PDF_A, 'application/pdf');
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    utimesSync(orphan.path, oldDate, oldDate);

    const report = sweepSourceStorage(db, { rootDir });
    assert.equal(report.removed_stale_staging, 1);
    assert.equal(report.removed_temp_orphans, 1);
    assert.equal(existsSync(orphan.path), false);
    assert.equal(db.prepare('SELECT 1 FROM source_records WHERE id = ?').get(stale.source_record.id), undefined);
    assert.notEqual(db.prepare('SELECT 1 FROM source_records WHERE id = ?').get(recent.source_record.id), undefined);
  });
});

test('detail/list/blob stay user-scoped and report a missing ready blob without leaking paths', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const owner = seedUserCourse(db, 'Owner');
    const outsider = seedUserCourse(db, 'Outsider');
    const created = await intakeSourceTempFile(db, owner.userId, {
      course_id: owner.courseId,
      origin_entry_kind: 'project_upload',
      file: writeTemp(rootDir, 'owned.pdf', PDF_A, 'application/pdf'),
    }, { rootDir });

    assert.equal(listSourceRecords(db, owner.userId, {}, { rootDir }).length, 1);
    assert.equal(listSourceRecords(db, outsider.userId, {}, { rootDir }).length, 0);
    assert.throws(() => getSourceRecordDetail(db, outsider.userId, created.source.id, { rootDir }), /not found/i);
    assert.throws(() => getSourceBlob(db, outsider.userId, created.source.id, { rootDir }), /not found/i);

    const row = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
      .get(created.source.id) as { storage_key: string };
    rmSync(join(rootDir, row.storage_key));
    const missing = getSourceRecordDetail(db, owner.userId, created.source.id, { rootDir });
    assert.equal(missing.file.blob_available, false);
    assert.equal(missing.file.issue?.code, 'blob_missing');
    assert.throws(
      () => getSourceBlob(db, owner.userId, created.source.id, { rootDir }),
      (error: any) => error?.details?.code === 'blob_missing',
    );
    assert.equal(JSON.stringify(missing).includes(row.storage_key), false);
  });
});

test('Source routes upload, list, detail, precheck, and stream an authenticated safe blob', async () => {
  await withDbAndStorage(async ({ db, rootDir }) => {
    const owner = seedUserCourse(db, 'Route Owner');
    const outsider = seedUserCourse(db, 'Route Outsider');
    const previousRoot = process.env.SOURCE_BLOB_DIR;
    process.env.SOURCE_BLOB_DIR = rootDir;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).userId = req.header('x-test-user') || owner.userId;
      next();
    });
    app.use('/api/sources', sourceRoutes);
    app.use(errorHandler);

    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const running = app.listen(0, () => resolve(running));
    });
    try {
      const address = server.address() as any;
      const base = `http://127.0.0.1:${address.port}/api/sources`;
      const form = new FormData();
      form.set('course_id', owner.courseId);
      form.set('origin_entry_kind', 'project_upload');
      form.set('file', new Blob([PDF_A], { type: 'application/pdf' }), '数学讲义.pdf');
      const uploaded = await fetch(`${base}/upload`, {
        method: 'POST',
        headers: { 'x-test-user': owner.userId },
        body: form,
      });
      const uploadBody = await uploaded.json() as any;
      assert.equal(uploaded.status, 201, JSON.stringify(uploadBody));
      assert.equal(uploadBody.source.file.storage_state, 'ready');
      assert.equal('storage_key' in uploadBody.source.file, false);

      const listed = await fetch(`${base}?course_id=${owner.courseId}`, {
        headers: { 'x-test-user': owner.userId },
      });
      const listBody = await listed.json() as any[];
      assert.equal(listBody.length, 1);
      assert.equal(listBody[0].id, uploadBody.source.id);

      const precheck = await fetch(`${base}/precheck`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-test-user': owner.userId },
        body: JSON.stringify({
          course_id: owner.courseId,
          origin_entry_kind: 'project_upload',
          content_hash: uploadBody.source.file.content_hash,
        }),
      });
      const precheckBody = await precheck.json() as any;
      assert.equal(precheckBody.exists, true);
      assert.equal(precheckBody.source.id, uploadBody.source.id);

      const blob = await fetch(`${base}/${uploadBody.source.id}/blob`, {
        headers: { 'x-test-user': owner.userId },
      });
      assert.equal(blob.status, 200);
      assert.match(blob.headers.get('content-disposition') || '', /filename\*=UTF-8''/);
      assert.deepEqual(Buffer.from(await blob.arrayBuffer()), PDF_A);

      const forbidden = await fetch(`${base}/${uploadBody.source.id}`, {
        headers: { 'x-test-user': outsider.userId },
      });
      assert.equal(forbidden.status, 404);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => error ? reject(error) : resolve());
      });
      if (previousRoot === undefined) delete process.env.SOURCE_BLOB_DIR;
      else process.env.SOURCE_BLOB_DIR = previousRoot;
    }
  });
});
