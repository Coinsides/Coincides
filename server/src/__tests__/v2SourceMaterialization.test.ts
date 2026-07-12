import test from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { initDb, closeDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import canvasObjectRoutes from '../routes/canvasObjects.js';
import noteBlockRoutes from '../routes/noteBlocks.js';
import noteRoutes from '../routes/notes.js';
import sourceRoutes from '../routes/sources.js';
import { getSourceRecordDetail, intakeSourceTempFile } from '../services/sourceFileIntake.js';
import {
  SourceArtifactError,
  parseSourceArtifact,
  type SourceArtifact,
  type SourceParser,
} from '../services/sourceArtifact.js';
import {
  claimSourceMaterialization,
  materializeSourceNow,
  sweepSourceMaterializations,
  waitForScheduledSourceMaterializations,
} from '../services/sourceMaterialization.js';
import {
  getTemplateCompatibilityReport,
  getTemplateUsage,
  listTemplateDefinitions,
  seedSystemTemplateDefinitions,
} from '../services/templateDefinitions.js';
import { createTemplateMigrationProposal } from '../services/templateMigrationProposals.js';
import { listDomainBlockSets, seedSystemDomainPackages } from '../services/domainPackages.js';
import { createDomainRefinementProposal } from '../services/domainRefinementProposals.js';
import { generateSourceAnchors } from '../services/sourceAnchors.js';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

async function withDbAndStorage(
  run: (context: {
    db: Awaited<ReturnType<typeof initDb>>;
    sourceRootDir: string;
    canvasAssetRootDir: string;
  }) => void | Promise<void>,
) {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-materialization-'));
  const dbPath = join(dir, 'test.db');
  const sourceRootDir = join(dir, 'source-blobs');
  const canvasAssetRootDir = join(dir, 'canvas-assets');

  try {
    const db = await initDb(dbPath);
    await run({ db, sourceRootDir, canvasAssetRootDir });
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
}

function seedUserCourse(db: Awaited<ReturnType<typeof initDb>>) {
  const userId = uuidv4();
  const courseId = uuidv4();
  db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, 'Materializer User', datetime('now'))")
    .run(userId, `${userId}@example.com`, 'hash');
  db.prepare(`
    INSERT INTO courses (id, user_id, name, created_at, updated_at)
    VALUES (?, ?, 'Materializer Project', datetime('now'), datetime('now'))
  `).run(courseId, userId);
  return { userId, courseId };
}

function writeUpload(
  sourceRootDir: string,
  filename: string,
  contents: Buffer | string,
  mimeType: string,
) {
  const tempDir = join(sourceRootDir, '.tmp');
  const tempPath = join(tempDir, `${uuidv4()}.upload`);
  requireDirectory(tempDir);
  writeFileSync(tempPath, contents);
  return {
    path: tempPath,
    originalname: filename,
    mimetype: mimeType,
    size: Buffer.byteLength(contents),
  };
}

function requireDirectory(path: string) {
  mkdirSync(path, { recursive: true });
}

async function intake(
  db: Awaited<ReturnType<typeof initDb>>,
  userId: string,
  courseId: string,
  sourceRootDir: string,
  filename: string,
  contents: Buffer | string,
  mimeType: string,
) {
  return intakeSourceTempFile(db, userId, {
    course_id: courseId,
    origin_entry_kind: 'project_upload',
    file: writeUpload(sourceRootDir, filename, contents, mimeType),
  }, { rootDir: sourceRootDir });
}

function textArtifact(texts: string[]): SourceArtifact {
  return {
    schema_version: 'source-artifact.v1',
    artifact_kind: 'document',
    parser_key: 'native-text',
    parser_version: 'builtin-v1',
    blocks: texts.map((text, index) => ({
      artifact_block_id: `text-${index + 1}`,
      kind: 'text',
      text,
      writing_role: 'paragraph',
      page_index: null,
      locator: { kind: 'text_paragraph', index: index + 1 },
      metadata: {},
    })),
    metadata: {},
  };
}

async function makePdf(pageTexts: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = pdf.addPage([595, 842]);
    page.drawText(text, { x: 72, y: 760, size: 14, font });
  }
  return Buffer.from(await pdf.save());
}

test('native parser registry produces transient PDF, DOCX, TXT, Markdown, and image artifacts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-parser-'));
  try {
    const pdfPath = join(dir, 'two-pages.pdf');
    writeFileSync(pdfPath, await makePdf(['First PDF page', 'Second PDF page']));
    const pdf = await parseSourceArtifact({
      parser_key: 'native-pdf',
      parser_version: '2.4.5',
      file_path: pdfPath,
      original_filename: 'two-pages.pdf',
      mime_type: 'application/pdf',
    });
    assert.equal(pdf.schema_version, 'source-artifact.v1');
    assert.deepEqual([...new Set(pdf.blocks.map((block) => block.page_index))], [1, 2]);

    const docxPath = join(dir, 'single-paragraph.docx');
    writeFileSync(docxPath, readFileSync(join(
      process.cwd(),
      'node_modules',
      'mammoth',
      'test',
      'test-data',
      'single-paragraph.docx',
    )));
    const docx = await parseSourceArtifact({
      parser_key: 'native-docx',
      parser_version: '1.12.0',
      file_path: docxPath,
      original_filename: 'single-paragraph.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    assert.equal(docx.blocks.length > 0, true);
    assert.equal(docx.blocks.every((block) => block.page_index === null), true);

    const textPath = join(dir, 'notes.txt');
    writeFileSync(textPath, 'Alpha paragraph\n\nBeta paragraph');
    const text = await parseSourceArtifact({
      parser_key: 'native-text',
      parser_version: 'builtin-v1',
      file_path: textPath,
      original_filename: 'notes.txt',
      mime_type: 'text/plain',
    });
    assert.deepEqual(text.blocks.map((block) => block.text), ['Alpha paragraph', 'Beta paragraph']);

    const markdownPath = join(dir, 'notes.md');
    writeFileSync(markdownPath, '# Heading\n\nBody paragraph');
    const markdown = await parseSourceArtifact({
      parser_key: 'native-text',
      parser_version: 'builtin-v1',
      file_path: markdownPath,
      original_filename: 'notes.md',
      mime_type: 'text/markdown',
    });
    assert.deepEqual(markdown.blocks.map((block) => block.writing_role), ['heading', 'paragraph']);

    const imagePath = join(dir, 'pixel.png');
    writeFileSync(imagePath, ONE_PIXEL_PNG);
    const image = await parseSourceArtifact({
      parser_key: 'native-image',
      parser_version: 'passthrough-v1',
      file_path: imagePath,
      original_filename: 'pixel.png',
      mime_type: 'image/png',
    });
    assert.equal(image.artifact_kind, 'image');
    assert.equal(image.blocks.length, 0);

    await assert.rejects(parseSourceArtifact({
      parser_key: 'stored-only',
      parser_version: 'none',
      file_path: textPath,
      original_filename: 'table.csv',
      mime_type: 'text/csv',
    }), (error: any) => error instanceof SourceArtifactError && error.code === 'unsupported_format');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('parser limits and corrupt inputs produce stable non-retryable errors', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'coincides-source-parser-limits-'));
  try {
    const pdfPath = join(dir, 'two-pages.pdf');
    writeFileSync(pdfPath, await makePdf(['First page', 'Second page']));
    await assert.rejects(parseSourceArtifact({
      parser_key: 'native-pdf',
      parser_version: '2.4.5',
      file_path: pdfPath,
      original_filename: 'two-pages.pdf',
      mime_type: 'application/pdf',
    }, { limits: { maxPdfPages: 1 } }), (error: any) => (
      error instanceof SourceArtifactError
      && error.code === 'resource_limit'
      && error.retryable === false
    ));

    const textPath = join(dir, 'three-blocks.txt');
    writeFileSync(textPath, 'One\n\nTwo\n\nThree');
    await assert.rejects(parseSourceArtifact({
      parser_key: 'native-text',
      parser_version: 'builtin-v1',
      file_path: textPath,
      original_filename: 'three-blocks.txt',
      mime_type: 'text/plain',
    }, { limits: { maxBlocks: 2 } }), (error: any) => (
      error instanceof SourceArtifactError && error.code === 'resource_limit'
    ));

    const corruptDocxPath = join(dir, 'corrupt.docx');
    writeFileSync(corruptDocxPath, 'not a zip archive');
    await assert.rejects(parseSourceArtifact({
      parser_key: 'native-docx',
      parser_version: '1.12.0',
      file_path: corruptDocxPath,
      original_filename: 'corrupt.docx',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }), (error: any) => (
      error instanceof SourceArtifactError && error.code === 'invalid_or_corrupt'
    ));

    const slowParser: SourceParser = {
      key: 'native-text',
      async parse() {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return textArtifact(['Too late']);
      },
    };
    await assert.rejects(parseSourceArtifact({
      parser_key: 'native-text',
      parser_version: 'slow-test-v1',
      file_path: textPath,
      original_filename: 'slow.txt',
      mime_type: 'text/plain',
    }, {
      parser: slowParser,
      limits: { timeoutMs: 5 },
    }), (error: any) => (
      error instanceof SourceArtifactError && error.code === 'resource_limit'
    ));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('text materialization atomically publishes one read-only projection and is idempotent', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      'lesson.txt',
      'Definition paragraph\n\nExample paragraph',
      'text/plain',
    );

    const first = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(first.status, 'materialized');
    assert.ok(first.projection_note_id);
    assert.equal(
      getSourceRecordDetail(db, userId, uploaded.source.id, { rootDir: sourceRootDir })
        .materialization.projection_available,
      true,
    );

    const note = db.prepare('SELECT note_class, source_kind FROM notes WHERE id = ?')
      .get(first.projection_note_id) as any;
    assert.equal(note.note_class, 'source_projection');
    assert.equal(note.source_kind, 'source_projection');

    const blocks = db.prepare(`
      SELECT id, source_kind, content_json, metadata
      FROM note_blocks
      WHERE operation_batch_id = ?
      ORDER BY created_at, id
    `).all(first.operation_batch_id) as any[];
    assert.equal(blocks.length, 2);
    assert.equal(blocks.every((block) => block.source_kind === 'source_projection'), true);
    assert.equal(blocks.every((block) => JSON.parse(block.content_json).text_flow?.textflow_version === 'TextBlockContentV1'), true);
    assert.equal(blocks.every((block) => JSON.parse(block.metadata).source_materialization_id === uploaded.source.materialization.id), true);

    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM note_block_sources WHERE source_record_id = ?')
      .get(uploaded.source.id) as any).count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM content_mounts WHERE note_id = ?')
      .get(first.projection_note_id) as any).count, 2);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_objects WHERE note_id = ?')
      .get(first.projection_note_id) as any).count >= 3, true);

    const second = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(second.projection_note_id, first.projection_note_id);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM notes WHERE note_class = 'source_projection'").get() as any).count, 1);
    assert.equal((db.prepare('SELECT attempt_count FROM source_materializations WHERE source_record_id = ?')
      .get(uploaded.source.id) as any).attempt_count, 1);
  });
});

test('publish rollback leaves no half projection and retry reuses the durable run', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'retry.txt', 'Retry body', 'text/plain');

    const failed = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      parseArtifact: async () => textArtifact(['Retry body']),
      hooks: {
        insidePublish: () => {
          throw new Error('injected publish failure');
        },
      },
    });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error_code, 'internal_interrupted');
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM notes WHERE note_class = 'source_projection'").get() as any).count, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM operation_batches WHERE source_type = 'source_materialization'").get() as any).count, 0);

    const retried = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      parseArtifact: async () => textArtifact(['Retry body']),
    });
    assert.equal(retried.status, 'materialized');
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM notes WHERE note_class = 'source_projection'").get() as any).count, 1);
    assert.equal((db.prepare('SELECT attempt_count FROM source_materializations WHERE source_record_id = ?')
      .get(uploaded.source.id) as any).attempt_count, 2);
  });
});

test('concurrent claim has one winner and startup sweep fails stale in-flight work for retry', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'claim.txt', 'Claim body', 'text/plain');

    const first = claimSourceMaterialization(db, userId, uploaded.source.id);
    const second = claimSourceMaterialization(db, userId, uploaded.source.id);
    assert.equal(first.claimed, true);
    assert.equal(second.claimed, false);
    assert.equal((db.prepare('SELECT attempt_count FROM source_materializations WHERE source_record_id = ?')
      .get(uploaded.source.id) as any).attempt_count, 1);

    db.prepare(`
      UPDATE source_materializations
      SET status = 'publishing', started_at = ?, updated_at = ?
      WHERE source_record_id = ?
    `).run('2020-01-01T00:00:00.000Z', '2020-01-01T00:00:00.000Z', uploaded.source.id);
    const swept = sweepSourceMaterializations(db, {
      now: new Date('2026-07-11T12:00:00.000Z'),
      canvasAssetRootDir,
    });
    assert.equal(swept.interrupted_runs_failed, 1);
    const row = db.prepare('SELECT status, error_code FROM source_materializations WHERE source_record_id = ?')
      .get(uploaded.source.id) as any;
    assert.deepEqual(row, { status: 'failed', error_code: 'internal_interrupted' });
  });
});

test('non-retryable parse failure preserves the ready blob and rejects retry', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'limited.txt', 'Original remains', 'text/plain');
    const sourceFile = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
      .get(uploaded.source.id) as any;

    const failed = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      parseArtifact: async () => {
        throw new SourceArtifactError('resource_limit', 'Injected resource limit');
      },
    });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error_code, 'resource_limit');
    assert.equal(failed.retryable, false);
    assert.equal(getSourceRecordDetail(db, userId, uploaded.source.id, { rootDir: sourceRootDir })
      .materialization.retryable, false);
    assert.equal(existsSync(join(sourceRootDir, sourceFile.storage_key)), true);

    await assert.rejects(materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    }), (error: any) => (
      error?.statusCode === 409
      && error?.details?.code === 'materialization_not_retryable'
    ));
    assert.equal((db.prepare('SELECT attempt_count FROM source_materializations WHERE source_record_id = ?')
      .get(uploaded.source.id) as any).attempt_count, 1);
  });
});

test('stored-only Source rejects materialization without changing its durable received run', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(
      db,
      userId,
      courseId,
      sourceRootDir,
      'table.csv',
      'name,value\nalpha,1',
      'text/csv',
    );

    await assert.rejects(materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    }), (error: any) => (
      error?.statusCode === 409
      && error?.details?.code === 'unsupported_format'
      && error?.details?.capability === 'stored_only'
    ));

    const run = db.prepare(`
      SELECT status, attempt_count, error_code, projection_note_id
      FROM source_materializations
      WHERE source_record_id = ?
    `).get(uploaded.source.id) as any;
    assert.deepEqual(run, {
      status: 'received',
      attempt_count: 0,
      error_code: null,
      projection_note_id: null,
    });
  });
});

test('image materialization publishes an independent canvas asset copy', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'pixel.png', ONE_PIXEL_PNG, 'image/png');
    const result = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    assert.equal(result.status, 'materialized');

    const sourceFile = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
      .get(uploaded.source.id) as any;
    const asset = db.prepare('SELECT storage_key, metadata FROM canvas_assets WHERE origin_note_id = ?')
      .get(result.projection_note_id) as any;
    assert.ok(asset);
    assert.notEqual(asset.storage_key, sourceFile.storage_key);
    assert.equal(JSON.parse(asset.metadata).source_record_id, uploaded.source.id);
    assert.equal(existsSync(join(canvasAssetRootDir, asset.storage_key)), true);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM canvas_objects WHERE note_id = ? AND kind = 'image'")
      .get(result.projection_note_id) as any).count, 1);
  });
});

test('image publish rollback removes its prepared copy without touching the Source blob', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'rollback.png', ONE_PIXEL_PNG, 'image/png');
    const sourceFile = db.prepare('SELECT storage_key FROM source_files WHERE source_record_id = ?')
      .get(uploaded.source.id) as any;
    const preparedCopyPath = join(
      canvasAssetRootDir,
      userId,
      'source-materializations',
      `${uploaded.source.materialization.id}.png`,
    );

    const failed = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      hooks: {
        insidePublish: (stage) => {
          if (stage === 'after_content') throw new Error('injected image publish failure');
        },
      },
    });
    assert.equal(failed.status, 'failed');
    assert.equal(failed.error_code, 'internal_interrupted');
    assert.equal(existsSync(preparedCopyPath), false);
    assert.equal(existsSync(join(sourceRootDir, sourceFile.storage_key)), true);
    assert.equal((db.prepare('SELECT COUNT(*) AS count FROM canvas_assets').get() as any).count, 0);
    assert.equal((db.prepare("SELECT COUNT(*) AS count FROM notes WHERE note_class = 'source_projection'").get() as any).count, 0);
  });
});

test('materialize route runs asynchronously and SourceProjection content routes enforce the write policy', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'locked.txt', 'Locked body', 'text/plain');
    const previousSourceRoot = process.env.SOURCE_BLOB_DIR;
    const previousCanvasRoot = process.env.CANVAS_ASSET_DIR;
    process.env.SOURCE_BLOB_DIR = sourceRootDir;
    process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;

    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).userId = userId;
      next();
    });
    app.use('/api/sources', sourceRoutes);
    app.use('/api/notes', noteRoutes);
    app.use('/api/note-blocks', noteBlockRoutes);
    app.use('/api/canvas-objects', canvasObjectRoutes);
    app.use(errorHandler);
    const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
      const running = app.listen(0, () => resolve(running));
    });

    try {
      const address = server.address() as any;
      const base = `http://127.0.0.1:${address.port}/api`;
      const started = await fetch(`${base}/sources/${uploaded.source.id}/materialize`, { method: 'POST' });
      assert.equal(started.status, 202);
      await waitForScheduledSourceMaterializations();

      const run = db.prepare('SELECT projection_note_id, status FROM source_materializations WHERE source_record_id = ?')
        .get(uploaded.source.id) as any;
      assert.equal(run.status, 'materialized');
      const block = db.prepare(`
        SELECT nb.id, nbp.id AS placement_id
        FROM note_blocks nb
        JOIN note_block_placements nbp ON nbp.block_id = nb.id
        WHERE nbp.note_id = ?
      `).get(run.projection_note_id) as any;

      const lockedRequests: Array<[string, string, unknown?]> = [
        ['PUT', `${base}/notes/${run.projection_note_id}`, { title: 'Mutated title' }],
        ['DELETE', `${base}/notes/${run.projection_note_id}`],
        ['POST', `${base}/notes/${run.projection_note_id}/blocks`, {
          block_type: 'paragraph',
          content_json: { body: 'Injected' },
          plain_text: 'Injected',
        }],
        ['PUT', `${base}/notes/${run.projection_note_id}/blocks/reorder`, {
          placements: [{ placement_id: block.placement_id, order_index: 0 }],
        }],
        ['PUT', `${base}/note-blocks/${block.id}`, { plain_text: 'Mutated block' }],
        ['DELETE', `${base}/note-blocks/${block.id}`],
        ['PUT', `${base}/canvas-objects/by-note/${run.projection_note_id}/objects/new-object`, {}],
        ['PUT', `${base}/canvas-objects/by-note/${run.projection_note_id}/block-placements/${block.placement_id}`, {
          block_id: block.id,
          layout: { x: 20, y: 20, width: 300, height: 100 },
        }],
      ];
      for (const [method, url, body] of lockedRequests) {
        const response = await fetch(url, {
          method,
          headers: body === undefined ? undefined : { 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const payload = await response.json() as any;
        assert.equal(response.status, 409, `${method} ${url}: ${JSON.stringify(payload)}`);
        assert.equal(payload.details?.code, 'source_projection_read_only');
      }

      const metadataOnly = await fetch(`${base}/notes/${run.projection_note_id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ metadata: { reading_position: 42 } }),
      });
      assert.equal(metadataOnly.status, 200);

      const displayOverride = await fetch(`${base}/notes/${run.projection_note_id}/block-placements/${block.placement_id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ display_overrides_json: { emphasis: 'quiet' } }),
      });
      assert.equal(displayOverride.status, 200);

      const systemNoteId = uuidv4();
      db.prepare(`
        INSERT INTO notes (id, user_id, course_id, title, source_kind, note_class, metadata)
        VALUES (?, ?, ?, 'System note', 'system', 'system', '{}')
      `).run(systemNoteId, userId, courseId);
      const systemWrite = await fetch(`${base}/notes/${systemNoteId}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'System note updated' }),
      });
      assert.equal(systemWrite.status, 200);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => error ? reject(error) : resolve());
      });
      if (previousSourceRoot === undefined) delete process.env.SOURCE_BLOB_DIR;
      else process.env.SOURCE_BLOB_DIR = previousSourceRoot;
      if (previousCanvasRoot === undefined) delete process.env.CANVAS_ASSET_DIR;
      else process.env.CANVAS_ASSET_DIR = previousCanvasRoot;
    }
  });
});

test('legacy template, domain, compatibility, usage, and source-anchor scanners exclude projection blocks', async () => {
  await withDbAndStorage(async ({ db, sourceRootDir, canvasAssetRootDir }) => {
    const { userId, courseId } = seedUserCourse(db);
    const uploaded = await intake(db, userId, courseId, sourceRootDir, 'scanner.txt', 'Scanner body', 'text/plain');
    const materialized = await materializeSourceNow(db, userId, uploaded.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
    });
    const block = db.prepare('SELECT id, metadata FROM note_blocks WHERE operation_batch_id = ?')
      .get(materialized.operation_batch_id) as any;

    seedSystemTemplateDefinitions(db, userId);
    const template = listTemplateDefinitions(db, userId, { template_key: 'text.paragraph', status: 'active' })[0];
    assert.ok(template);
    seedSystemDomainPackages(db, userId);
    const domain = listDomainBlockSets(db, userId, { domain_key: 'learning.math.basic' })[0];
    assert.ok(domain);
    db.prepare('UPDATE note_blocks SET metadata = ? WHERE id = ?').run(JSON.stringify({
      ...JSON.parse(block.metadata),
      template_definition_id: template.id,
      template_key: template.template_key,
      template_version: template.version,
      template_id: template.template_key,
      current_domain_block_set_id: domain.id,
      current_domain_key: domain.domain_key,
      current_domain_version: domain.version,
    }), block.id);

    assert.equal(getTemplateUsage(db, userId, template.id).total_blocks, 0);
    assert.equal(getTemplateCompatibilityReport(db, userId, { course_id: courseId }).totals.total_blocks, 0);

    const migration = createTemplateMigrationProposal(db, userId, {
      source_template_id: template.id,
      target_template_patch: { label: 'Projection exclusion target' },
      migration_mode: 'soft_migration',
      course_id: courseId,
    });
    assert.equal(migration.data.affected_object_count, 0);

    const refinement = createDomainRefinementProposal(db, userId, {
      source_domain_id: domain.id,
      target_domain_patch: {
        domain_key: 'learning.math.projection-exclusion',
        label: 'Projection exclusion target',
        domain_kind: 'learning',
      },
      refinement_action: 'promote',
      migration_mode: 'soft_migration',
      course_id: courseId,
      object_reclassifications: [],
    });
    assert.equal(refinement.data.affected_counts.note_blocks, 0);

    const anchors = generateSourceAnchors(db, userId, { course_id: courseId });
    assert.equal(anchors.anchors_created_count, 0);
    assert.deepEqual(anchors.warnings, []);
  });
});
