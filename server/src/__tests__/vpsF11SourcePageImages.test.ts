import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { errorHandler } from '../middleware/errorHandler.js';
import sourceRoutes from '../routes/sources.js';
import { deleteProjectWithSourcePolicy } from '../services/courseLifecycle.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { deleteSourceWithCompensation } from '../services/sourceLifecycle.js';
import { materializeSourceNow, waitForScheduledSourceMaterializations } from '../services/sourceMaterialization.js';
import {
  getSourcePages,
  getSourcePagesByProjectionNote,
  requestSourcePageImages,
  resumeSourcePageImages,
  waitForScheduledSourcePageImages,
  type SourcePageRenderer,
} from '../services/sourcePageImages.js';
import { sweepOrphanSourceProjectionAssets } from '../services/sourceProjectionMaterializer.js';
import { previewSourceReprojection, rematerializeSource } from '../services/sourceReprojection.js';

type Db = Awaited<ReturnType<typeof initDb>>;

const hex = (text: string) => `<${[...text].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('')}>`;
const HELVETICA = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
const STSONG = '<< /Type /Font /Subtype /Type0 /BaseFont /STSong-Light /Encoding /UniGB-UCS2-H /DescendantFonts [<< /Type /Font /Subtype /CIDFontType0 /BaseFont /STSong-Light /CIDSystemInfo << /Registry (Adobe) /Ordering (GB1) /Supplement 2 >> >>] >>';

interface PageSpec { width: number; height: number; content: string; font: string }

function pdfWith(pages: PageSpec[]): Buffer {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>'];
  const kids = pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ');
  objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  pages.forEach((page, index) => {
    const base = 3 + index * 3;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Contents ${base + 1} 0 R /Resources << /Font << /F1 ${base + 2} 0 R >> >> >>`);
    objects.push(`<< /Length ${Buffer.byteLength(page.content)} >>\nstream\n${page.content}\nendstream`);
    objects.push(page.font);
  });
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(out));
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
    + offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
    + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

const textPage = (label: string, width = 595, height = 842): PageSpec => ({
  width, height, font: HELVETICA, content: `BT /F1 14 Tf 72 ${height - 80} Td (${label}) Tj ET`,
});
const THREE_PAGES = pdfWith([textPage('Page one body'), textPage('Page two body'), textPage('Page three wide', 792, 612)]);

interface Context {
  db: Db;
  userId: string;
  courseId: string;
  sourceId: string;
  noteId: string;
  materializationId: string;
  sourceRootDir: string;
  canvasAssetRootDir: string;
}

async function withSource(
  body: Buffer,
  options: { filename?: string; mimetype?: string; openPageRenderer?: (path: string) => Promise<SourcePageRenderer> },
  run: (context: Context) => Promise<void>,
) {
  const root = mkdtempSync(join(tmpdir(), 'coincides-page-images-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  const userId = uuidv4();
  const courseId = uuidv4();
  try {
    const db = await initDb(':memory:');
    db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
      .run(userId, `${userId}@example.test`);
    db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic project')").run(courseId, userId);
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
    const path = join(sourceRootDir, '.tmp', 'synthetic.upload');
    writeFileSync(path, body);
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: {
        path,
        originalname: options.filename || 'Synthetic.pdf',
        mimetype: options.mimetype || 'application/pdf',
        size: body.length,
      },
    }, { rootDir: sourceRootDir });
    const published = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir, canvasAssetRootDir, openPageRenderer: options.openPageRenderer,
    });
    assert.equal(published.status, 'materialized');
    await run({
      db, userId, courseId, sourceId: intake.source.id, noteId: published.projection_note_id!,
      materializationId: published.materialization_id, sourceRootDir, canvasAssetRootDir,
    });
    await waitForScheduledSourcePageImages();
  } finally {
    await waitForScheduledSourcePageImages();
    closeDb();
    rmSync(root, { recursive: true, force: true });
  }
}

// Draws through a counter so a test can tell which pages were actually rendered.
function countingRenderer(total: number, failPages: number[] = []) {
  const rendered: number[] = [];
  let opened = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]),
    Buffer.from([0, 0, 0x04, 0xd8, 0, 0, 0x06, 0xdb]),
  ]);
  return {
    rendered,
    opens: () => opened,
    open: async (): Promise<SourcePageRenderer> => {
      opened += 1;
      return {
        total,
        render: async (page) => {
          rendered.push(page);
          if (failPages.includes(page)) throw new Error(`synthetic page ${page} failure`);
          return { png, pdf_width: 595, pdf_height: 842 };
        },
        close: async () => undefined,
      };
    },
  };
}

function storedFiles(root: string, userId: string): string[] {
  const folder = join(root, userId, 'source-materializations');
  return existsSync(folder) ? readdirSync(folder).sort() : [];
}

function counts(db: Db, materializationId: string) {
  return {
    pages: (db.prepare('SELECT COUNT(*) AS n FROM source_pages WHERE materialization_id = ?').get(materializationId) as { n: number }).n,
    assets: (db.prepare("SELECT COUNT(*) AS n FROM canvas_assets WHERE id LIKE 'source-page-image:%'").get() as { n: number }).n,
  };
}

function progressOf(db: Db, sourceId: string) {
  const row = db.prepare('SELECT metadata FROM source_records WHERE id = ?').get(sourceId) as { metadata: string };
  return JSON.parse(row.metadata).page_images;
}

test('a real PDF gets one image per page with its size, and text publication is untouched', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, noteId, materializationId, canvasAssetRootDir }) => {
    const progress = progressOf(db, sourceId);
    assert.equal(progress.status, 'complete');
    assert.equal(progress.expected, 3);
    assert.equal(progress.completed, 3);
    assert.deepEqual(progress.failed_pages, []);

    const rows = db.prepare('SELECT * FROM source_pages WHERE materialization_id = ? ORDER BY page_number').all(materializationId) as any[];
    assert.deepEqual(rows.map((row) => row.page_number), [1, 2, 3]);
    assert.equal(rows[0].image_width, 1240);
    assert.equal(Math.round(rows[0].pdf_width), 595);
    assert.equal(Math.round(rows[0].pdf_height), 842);
    assert.equal(Math.round(rows[2].pdf_width), 792, 'a landscape page keeps its own size');
    assert.equal(Math.round(rows[2].pdf_height), 612);
    assert.ok(rows[2].image_height < rows[2].image_width);

    for (const row of rows) {
      const asset = db.prepare('SELECT * FROM canvas_assets WHERE id = ?').get(row.image_asset_id) as any;
      assert.equal(asset.id, `source-page-image:${materializationId}:${row.page_number}`);
      assert.equal(asset.storage_key, `${userId}/source-materializations/${materializationId}-page-${row.page_number}.png`);
      assert.equal(JSON.parse(asset.metadata).managed_by, 'source_materialization');
      assert.equal(asset.origin_note_id, noteId);
      assert.equal(asset.mime_type, 'image/png');
      assert.equal(asset.width, row.image_width);
      assert.equal(asset.height, row.image_height);
      assert.equal(statSync(join(canvasAssetRootDir, asset.storage_key)).size, asset.byte_size);
    }
    const blocks = db.prepare('SELECT COUNT(*) AS n FROM note_block_placements WHERE note_id = ?').get(noteId) as { n: number };
    assert.equal(blocks.n, 3);
  });
});

test('the orphan sweep keeps aged page images, and the managed_by mark is what protects them', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, materializationId, canvasAssetRootDir }) => {
    const folder = join(canvasAssetRootDir, userId, 'source-materializations');
    const old = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (const file of readdirSync(folder)) utimesSync(join(folder, file), old, old);
    const stray = join(folder, 'stray.png');
    writeFileSync(stray, 'stray');
    utimesSync(stray, old, old);

    assert.equal(sweepOrphanSourceProjectionAssets(db, { canvasAssetRootDir }), 1, 'only the stray file is swept');
    assert.equal(existsSync(stray), false);
    assert.equal(storedFiles(canvasAssetRootDir, userId).length, 3);

    db.prepare("UPDATE canvas_assets SET metadata = '{}' WHERE id = ?").run(`source-page-image:${materializationId}:1`);
    assert.equal(sweepOrphanSourceProjectionAssets(db, { canvasAssetRootDir }), 1, 'an unmarked row loses its file');
    assert.equal(storedFiles(canvasAssetRootDir, userId).length, 2);
  });
});

test('both page routes return the same list, in order, only to the owner', async () => {
  await withSource(THREE_PAGES, {}, async ({ userId, sourceId, noteId, materializationId }) => {
    let requester = userId;
    const app = express();
    app.use((req, _res, next) => { (req as any).userId = requester; next(); });
    app.use('/api/sources', sourceRoutes);
    app.use(errorHandler);
    const server = app.listen(0);
    try {
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources`;
      const bySource = await fetch(`${base}/${sourceId}/pages`);
      assert.equal(bySource.status, 200);
      const body = await bySource.json() as any;
      assert.equal(body.status, 'complete');
      assert.equal(body.expected, 3);
      assert.deepEqual(body.pages.map((page: any) => page.page_number), [1, 2, 3]);
      assert.equal(body.pages[0].asset_id, `source-page-image:${materializationId}:1`);
      assert.deepEqual(Object.keys(body.pages[0]).sort(), [
        'asset_id', 'image_height', 'image_width', 'page_number', 'pdf_height', 'pdf_width',
      ]);
      const byNote = await fetch(`${base}/by-projection-note/${noteId}/pages`);
      assert.deepEqual(await byNote.json(), body);

      requester = uuidv4();
      assert.equal((await fetch(`${base}/${sourceId}/pages`)).status, 404);
      assert.equal((await fetch(`${base}/by-projection-note/${noteId}/pages`)).status, 404);
      requester = userId;
      assert.equal((await fetch(`${base}/by-projection-note/${uuidv4()}/pages`)).status, 404);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

test('a PDF register says it has a text view', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId }) => {
    assert.equal(getSourcePages(db, userId, sourceId).text_view, true);
  });
});

test('deleting the Source clears page rows, asset rows and files', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    assert.deepEqual(counts(db, materializationId), { pages: 3, assets: 3 });
    assert.equal(storedFiles(canvasAssetRootDir, userId).length, 3);
    deleteSourceWithCompensation(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    assert.deepEqual(counts(db, materializationId), { pages: 0, assets: 0 });
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
  });
});

test('the register still releases an asset whose origin note was lost', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    db.prepare('UPDATE canvas_assets SET origin_note_id = NULL WHERE id = ?').run(`source-page-image:${materializationId}:2`);
    deleteSourceWithCompensation(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    assert.deepEqual(counts(db, materializationId), { pages: 0, assets: 0 });
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
  });
});

test('replacing the projection reuses the images and moves them to the new note', async () => {
  const first = countingRenderer(3);
  await withSource(THREE_PAGES, { openPageRenderer: first.open }, async ({ db, userId, sourceId, noteId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    assert.deepEqual(first.rendered, [1, 2, 3]);
    const before = db.prepare('SELECT id, sha256 FROM canvas_assets WHERE id LIKE ? ORDER BY id').all('source-page-image:%');
    const second = countingRenderer(3);
    const replaced = await rematerializeSource(db, userId, sourceId, {
      sourceRootDir, canvasAssetRootDir, openPageRenderer: second.open,
    });
    await waitForScheduledSourcePageImages();
    assert.notEqual(replaced.projection_note_id, noteId);
    assert.equal(second.opens(), 0, 'a complete register is not rendered again');
    assert.deepEqual(db.prepare('SELECT id, sha256 FROM canvas_assets WHERE id LIKE ? ORDER BY id').all('source-page-image:%'), before);
    const origins = db.prepare("SELECT DISTINCT origin_note_id AS id FROM canvas_assets WHERE id LIKE 'source-page-image:%'").all() as Array<{ id: string }>;
    assert.deepEqual(origins, [{ id: replaced.projection_note_id }]);
    assert.equal(progressOf(db, sourceId).status, 'complete');
    assert.equal(getSourcePagesByProjectionNote(db, userId, replaced.projection_note_id).pages.length, 3);

    deleteSourceWithCompensation(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    assert.deepEqual(counts(db, materializationId), { pages: 0, assets: 0 });
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
  });
});

test('replacing the projection backfills an older Source and restores a lost file', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    db.prepare("UPDATE source_records SET metadata = '{}' WHERE id = ?").run(sourceId);
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    db.prepare("DELETE FROM canvas_assets WHERE id LIKE 'source-page-image:%'").run();
    rmSync(join(canvasAssetRootDir, userId), { recursive: true, force: true });
    assert.equal(getSourcePages(db, userId, sourceId).status, 'none');

    const options = { sourceRootDir, canvasAssetRootDir };
    await rematerializeSource(db, userId, sourceId, options);
    await waitForScheduledSourceMaterializations();
    assert.equal(progressOf(db, sourceId).status, 'complete');
    assert.equal(storedFiles(canvasAssetRootDir, userId).length, 3);

    rmSync(join(canvasAssetRootDir, userId, 'source-materializations', `${materializationId}-page-2.png`));
    const repair = countingRenderer(3);
    await rematerializeSource(db, userId, sourceId, { ...options, openPageRenderer: repair.open });
    await waitForScheduledSourcePageImages();
    assert.deepEqual(repair.rendered, [2]);
  });
});

test('a failed page is recorded, the rest continue, and replacement fills only that page', async () => {
  const flaky = countingRenderer(3, [2]);
  await withSource(THREE_PAGES, { openPageRenderer: flaky.open }, async ({ db, userId, sourceId, sourceRootDir, canvasAssetRootDir }) => {
    assert.deepEqual(flaky.rendered, [1, 2, 3]);
    let progress = progressOf(db, sourceId);
    assert.equal(progress.status, 'failed');
    assert.equal(progress.completed, 2);
    assert.deepEqual(progress.failed_pages, [2]);
    const read = getSourcePages(db, userId, sourceId);
    assert.deepEqual(read.pages.map((page) => page.page_number), [1, 3]);
    assert.deepEqual(read.failed_pages, [2]);
    assert.equal(resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir }), 0, 'a failed run is not retried on restart');

    const retry = countingRenderer(3);
    await rematerializeSource(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir, openPageRenderer: retry.open });
    await waitForScheduledSourcePageImages();
    assert.deepEqual(retry.rendered, [2]);
    progress = progressOf(db, sourceId);
    assert.equal(progress.status, 'complete');
    assert.equal(progress.completed, 3);
    assert.deepEqual(progress.failed_pages, []);
  });
});

test('a document that cannot open marks only the images as failed', async () => {
  const open = async (): Promise<SourcePageRenderer> => { throw new Error('synthetic open failure'); };
  await withSource(THREE_PAGES, { openPageRenderer: open }, async ({ db, sourceId, noteId, materializationId }) => {
    const progress = progressOf(db, sourceId);
    assert.equal(progress.status, 'failed');
    assert.equal(progress.error, 'synthetic open failure');
    const row = db.prepare('SELECT status, projection_note_id FROM source_materializations WHERE id = ?').get(materializationId) as any;
    assert.deepEqual({ ...row }, { status: 'materialized', projection_note_id: noteId });
  });
});

test('a page pdf.js cannot draw does not stop the document', async () => {
  const body = pdfWith([
    textPage('Latin page'),
    { width: 595, height: 842, font: STSONG, content: `BT /F1 18 Tf 72 760 Td ${hex('第一章')} Tj ET` },
    textPage('Another Latin page'),
  ]);
  await withSource(body, {}, async ({ db, sourceId }) => {
    const progress = progressOf(db, sourceId);
    assert.equal(progress.expected, 3);
    assert.equal(progress.completed + progress.failed_pages.length, 3);
    assert.ok(progress.completed >= 2);
  });
});

test('restart resume finishes pending and partial registers, rendering only what is missing', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    db.prepare("DELETE FROM canvas_assets WHERE id = ?").run(`source-page-image:${materializationId}:3`);
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ? AND page_number = 3').run(materializationId);
    rmSync(join(canvasAssetRootDir, userId, 'source-materializations', `${materializationId}-page-3.png`));
    db.prepare(`UPDATE source_records SET metadata = json_set(metadata, '$.page_images.status', 'partial', '$.page_images.completed', 2) WHERE id = ?`).run(sourceId);

    const renderer = countingRenderer(3);
    assert.equal(resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir, openPageRenderer: renderer.open }), 1);
    assert.equal(progressOf(db, sourceId).status, 'pending');
    await waitForScheduledSourcePageImages();
    assert.deepEqual(renderer.rendered, [3]);
    const progress = progressOf(db, sourceId);
    assert.equal(progress.status, 'complete');
    assert.equal(progress.completed, progress.expected);
    assert.equal(resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir }), 0);
  });
});

test('pages become readable one by one while rendering is in progress', async () => {
  let observed: ReturnType<typeof getSourcePages> | null = null;
  let context: { db: Db; userId: string; sourceId: string } | null = null;
  const base = countingRenderer(3);
  const open = async (): Promise<SourcePageRenderer> => {
    const renderer = await base.open();
    return {
      ...renderer,
      render: async (page) => {
        if (page === 3 && context) observed = getSourcePages(context.db, context.userId, context.sourceId);
        return renderer.render(page);
      },
    };
  };
  await withSource(THREE_PAGES, { openPageRenderer: countingRenderer(3).open }, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    db.prepare(`UPDATE source_records SET metadata = json_set(metadata, '$.page_images.status', 'partial') WHERE id = ?`).run(sourceId);
    context = { db, userId, sourceId };
    resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir, openPageRenderer: open });
    await waitForScheduledSourcePageImages();
  });
  const seen = observed as unknown as ReturnType<typeof getSourcePages>;
  assert.equal(seen.status, 'partial');
  assert.deepEqual(seen.pages.map((page) => page.page_number), [1, 2]);
  assert.equal(seen.expected, 3);
});

test('deleting the Source during rendering stops cleanly and leaves nothing behind', async () => {
  let deleteNow: (() => void) | null = null;
  const base = countingRenderer(3);
  const open = async (): Promise<SourcePageRenderer> => {
    const renderer = await base.open();
    return {
      ...renderer,
      render: async (page) => {
        const rendered = await renderer.render(page);
        if (page === 2) deleteNow?.();
        return rendered;
      },
    };
  };
  await withSource(THREE_PAGES, { openPageRenderer: countingRenderer(3).open }, async ({ db, userId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    db.prepare("DELETE FROM canvas_assets WHERE id LIKE 'source-page-image:%'").run();
    rmSync(join(canvasAssetRootDir, userId), { recursive: true, force: true });
    db.prepare(`UPDATE source_records SET metadata = json_set(metadata, '$.page_images.status', 'partial') WHERE id = ?`).run(sourceId);
    deleteNow = () => {
      deleteNow = null;
      deleteSourceWithCompensation(db, userId, sourceId, { sourceRootDir, canvasAssetRootDir });
    };
    resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir, openPageRenderer: open });
    await waitForScheduledSourcePageImages();
    assert.deepEqual(base.rendered, [1, 2]);
    assert.deepEqual(counts(db, materializationId), { pages: 0, assets: 0 });
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
  });
});

test('materialization still returns its result when the Source is deleted during rendering', async () => {
  const root = mkdtempSync(join(tmpdir(), 'coincides-page-images-race-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  const userId = uuidv4();
  const courseId = uuidv4();
  try {
    const db = await initDb(':memory:');
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')")
      .run(userId, `${userId}@example.test`);
    db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic project')").run(courseId, userId);
    mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
    const path = join(sourceRootDir, '.tmp', 'synthetic.upload');
    writeFileSync(path, THREE_PAGES);
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: { path, originalname: 'Synthetic.pdf', mimetype: 'application/pdf', size: THREE_PAGES.length },
    }, { rootDir: sourceRootDir });
    const base = countingRenderer(3);
    const result = await materializeSourceNow(db, userId, intake.source.id, {
      sourceRootDir,
      canvasAssetRootDir,
      openPageRenderer: async () => {
        const renderer = await base.open();
        return {
          ...renderer,
          render: async (page) => {
            deleteSourceWithCompensation(db, userId, intake.source.id, { sourceRootDir, canvasAssetRootDir });
            return renderer.render(page);
          },
        };
      },
    });
    assert.equal(result.status, 'materialized');
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
  } finally {
    closeDb();
    rmSync(root, { recursive: true, force: true });
  }
});

test('other formats get no register, and the replacement preview has no page side effects', async () => {
  const body = Buffer.from('# Synthetic heading\n\nFirst body.');
  const renderer = countingRenderer(1);
  await withSource(body, { filename: 'Synthetic.md', mimetype: 'text/markdown', openPageRenderer: renderer.open }, async ({ db, userId, sourceId, materializationId }) => {
    assert.equal(renderer.opens(), 0);
    assert.equal(progressOf(db, sourceId), undefined);
    assert.deepEqual(getSourcePages(db, userId, sourceId), {
      source_id: sourceId, supported: false, text_view: true, status: 'none', expected: 0, completed: 0, failed_pages: [], pages: [],
    });
    assert.throws(() => requestSourcePageImages(db, userId, sourceId), /no original page images/);
    assert.deepEqual(counts(db, materializationId), { pages: 0, assets: 0 });
  });
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, canvasAssetRootDir }) => {
    const before = { rows: counts(db, materializationId), files: storedFiles(canvasAssetRootDir, userId), progress: progressOf(db, sourceId) };
    previewSourceReprojection(db, userId, sourceId);
    assert.deepEqual({ rows: counts(db, materializationId), files: storedFiles(canvasAssetRootDir, userId), progress: progressOf(db, sourceId) }, before);
  });
});

test('Project deletion follows the projection: images leave with it or move home with it', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, courseId, sourceId, materializationId, sourceRootDir, canvasAssetRootDir }) => {
    deleteProjectWithSourcePolicy(db, userId, courseId, 'delete_projection', { sourceRootDir, canvasAssetRootDir });
    assert.equal(counts(db, materializationId).assets, 0);
    assert.deepEqual(storedFiles(canvasAssetRootDir, userId), []);
    assert.equal(getSourcePages(db, userId, sourceId).status, 'none');
    assert.equal(resumeSourcePageImages(db, { sourceRootDir, canvasAssetRootDir }), 0);
  });
  await withSource(THREE_PAGES, {}, async ({ db, userId, courseId, sourceId, noteId, sourceRootDir, canvasAssetRootDir }) => {
    const result = deleteProjectWithSourcePolicy(db, userId, courseId, 'move_to_home', { sourceRootDir, canvasAssetRootDir });
    assert.equal(getSourcePagesByProjectionNote(db, userId, noteId).pages.length, 3);
    assert.equal(storedFiles(canvasAssetRootDir, userId).length, 3);
    const courses = db.prepare("SELECT DISTINCT course_id AS id FROM canvas_assets WHERE id LIKE 'source-page-image:%'").all();
    assert.deepEqual(courses, [{ id: result.home_course_id }]);
    assert.equal(getSourcePages(db, userId, sourceId).status, 'complete');
  });
});

test('the generate route backfills an older Source once, then does nothing', async () => {
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, materializationId, canvasAssetRootDir, sourceRootDir }) => {
    db.prepare("UPDATE source_records SET metadata = '{}' WHERE id = ?").run(sourceId);
    db.prepare('DELETE FROM source_pages WHERE materialization_id = ?').run(materializationId);
    db.prepare("DELETE FROM canvas_assets WHERE id LIKE 'source-page-image:%'").run();
    rmSync(join(canvasAssetRootDir, userId), { recursive: true, force: true });
    const before = getSourcePages(db, userId, sourceId);
    assert.equal(before.status, 'none');
    assert.equal(before.supported, true, 'the client offers the door only on this flag');

    const first = countingRenderer(3);
    const options = { sourceRootDir, canvasAssetRootDir, openPageRenderer: first.open };
    assert.equal(requestSourcePageImages(db, userId, sourceId, options).status, 'pending');
    await waitForScheduledSourcePageImages();
    assert.deepEqual(first.rendered, [1, 2, 3]);
    assert.equal(getSourcePages(db, userId, sourceId).status, 'complete');

    const second = countingRenderer(3);
    const again = requestSourcePageImages(db, userId, sourceId, { ...options, openPageRenderer: second.open });
    await waitForScheduledSourcePageImages();
    assert.equal(again.status, 'complete');
    assert.equal(second.opens(), 0);
  });
});

test('the generate route answers by owner, format and readiness', async () => {
  const routeApp = (requester: () => string) => {
    const app = express();
    app.use((req, _res, next) => { (req as any).userId = requester(); next(); });
    app.use('/api/sources', sourceRoutes);
    app.use(errorHandler);
    return app.listen(0);
  };
  await withSource(THREE_PAGES, {}, async ({ db, userId, sourceId, noteId, sourceRootDir, canvasAssetRootDir }) => {
    let requester = userId;
    const server = routeApp(() => requester);
    // The route takes its storage roots from the environment, as in production.
    process.env.CANVAS_ASSET_DIR = canvasAssetRootDir;
    process.env.SOURCE_BLOB_DIR = sourceRootDir;
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources/${sourceId}/pages/generate`;
      const done = await fetch(url, { method: 'POST' });
      assert.equal(done.status, 200, 'a complete register is a no-op');
      assert.equal((await done.json() as any).status, 'complete');
      requester = uuidv4();
      assert.equal((await fetch(url, { method: 'POST' })).status, 404);
      requester = userId;
      db.prepare('DELETE FROM notes WHERE id = ?').run(noteId);
      const orphaned = await fetch(url, { method: 'POST' });
      assert.equal(orphaned.status, 409);
      assert.equal((await orphaned.json() as any).details.code, 'source_pages_not_ready');
    } finally {
      delete process.env.CANVAS_ASSET_DIR;
      delete process.env.SOURCE_BLOB_DIR;
      await new Promise((resolve) => server.close(resolve));
    }
  });
  await withSource(Buffer.from('# Heading\n\nBody.'), { filename: 'Synthetic.md', mimetype: 'text/markdown' }, async ({ userId, sourceId }) => {
    const server = routeApp(() => userId);
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sources/${sourceId}/pages/generate`;
      const response = await fetch(url, { method: 'POST' });
      assert.equal(response.status, 409);
      assert.equal((await response.json() as any).details.code, 'source_pages_unsupported');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
