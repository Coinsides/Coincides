import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { PDFParse } from 'pdf-parse';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { resolveSourceStorageKey } from './sourceFileIntake.js';
import { MINERU_PARSER_KEY } from './sourceMineruParser.js';
import {
  canvasAssetRoot,
  resolveCanvasAssetPath,
  SOURCE_ASSET_FOLDER,
} from './sourceProjectionMaterializer.js';

const PAGE_IMAGE_WIDTH = 1240;
const PAGE_IMAGE_PARSERS = new Set(['native-pdf', MINERU_PARSER_KEY]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export type SourcePageImageStatus = 'none' | 'pending' | 'partial' | 'complete' | 'failed';

interface PageImageProgress {
  expected: number;
  completed: number;
  status: Exclude<SourcePageImageStatus, 'none'>;
  failed_pages: number[];
  error?: string;
  updated_at: string;
}

export interface RenderedSourcePage {
  png: Buffer;
  pdf_width: number;
  pdf_height: number;
}

export interface SourcePageRenderer {
  total: number;
  render: (pageNumber: number) => Promise<RenderedSourcePage>;
  close: () => Promise<void>;
}

export interface SourcePageImageOptions {
  sourceRootDir?: string;
  canvasAssetRootDir?: string;
  now?: Date;
  openPageRenderer?: (filePath: string) => Promise<SourcePageRenderer>;
}

interface PageImageTarget {
  materialization_id: string;
  source_file_id: string;
  parser_key: string;
  projection_note_id: string;
  course_id: string;
  storage_key: string;
  storage_state: string;
}

interface LivePageRow {
  page_number: number;
  storage_key: string;
}

// getScreenshot leaves pdf.js without its font data, so a PDF that relies on the
// base-14 fonts would draw with whatever the host has installed. pdf.js only
// honours these options as plain paths under Node (a file:// URL is ignored), and
// insists on a trailing forward slash on every platform.
function pdfFontDataOptions() {
  try {
    const root = dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json'));
    return {
      cMapUrl: `${join(root, 'cmaps')}/`,
      cMapPacked: true,
      standardFontDataUrl: `${join(root, 'standard_fonts')}/`,
    };
  } catch {
    return {};
  }
}

export async function openPdfPageRenderer(filePath: string): Promise<SourcePageRenderer> {
  const parser = new PDFParse({ data: await readFile(filePath), ...pdfFontDataOptions() });
  try {
    const info = await parser.getInfo();
    return {
      total: info.total,
      async render(pageNumber) {
        const shot = await parser.getScreenshot({
          partial: [pageNumber],
          desiredWidth: PAGE_IMAGE_WIDTH,
          imageBuffer: true,
          imageDataUrl: false,
        });
        const page = shot.pages[0];
        if (!page) throw new Error(`PDF page ${pageNumber} produced no image`);
        return {
          png: Buffer.from(page.data),
          pdf_width: page.width / page.scale,
          pdf_height: page.height / page.scale,
        };
      },
      close: () => parser.destroy(),
    };
  } catch (error) {
    await parser.destroy().catch(() => undefined);
    throw error;
  }
}

function pngSize(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Rendered page is not a PNG image');
  }
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

function timestamp(options: SourcePageImageOptions): string {
  return (options.now || new Date()).toISOString();
}

// Null once the Source is deleted or its projection is gone. A running render
// re-reads this for every page, so it follows a replaced projection and stops
// on a removed one.
function pageImageTarget(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): PageImageTarget | null {
  const row = db.prepare(`
    SELECT sm.id AS materialization_id, sm.source_file_id, sm.parser_key, sm.projection_note_id,
      n.course_id, sf.storage_key, sf.storage_state
    FROM source_materializations sm
    JOIN source_files sf ON sf.id = sm.source_file_id AND sf.user_id = sm.user_id
    JOIN notes n ON n.id = sm.projection_note_id AND n.user_id = sm.user_id
    WHERE sm.source_record_id = ? AND sm.user_id = ? AND sm.status = 'materialized'
  `).get(sourceRecordId, userId) as PageImageTarget | undefined;
  return row && PAGE_IMAGE_PARSERS.has(row.parser_key) && row.storage_state === 'ready' ? row : null;
}

function readProgress(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
): PageImageProgress | null {
  const row = db.prepare(`
    SELECT CASE WHEN json_valid(metadata) THEN json_extract(metadata, '$.page_images') END AS progress
    FROM source_records WHERE id = ? AND user_id = ?
  `).get(sourceRecordId, userId) as { progress: string | null } | undefined;
  if (!row?.progress) return null;
  return JSON.parse(row.progress) as PageImageProgress;
}

function writeProgress(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  progress: Omit<PageImageProgress, 'updated_at'>,
  options: SourcePageImageOptions,
): void {
  db.prepare(`
    UPDATE source_records
    SET metadata = json_set(CASE WHEN json_valid(metadata) THEN metadata ELSE '{}' END, '$.page_images', json(?))
    WHERE id = ? AND user_id = ?
  `).run(JSON.stringify({ ...progress, updated_at: timestamp(options) }), sourceRecordId, userId);
}

function livePages(db: Database.Database, userId: string, materializationId: string): LivePageRow[] {
  return db.prepare(`
    SELECT sp.page_number, ca.storage_key
    FROM source_pages sp
    JOIN canvas_assets ca ON ca.id = sp.image_asset_id AND ca.user_id = sp.user_id
    WHERE sp.materialization_id = ? AND sp.user_id = ?
    ORDER BY sp.page_number ASC
  `).all(materializationId, userId) as LivePageRow[];
}

function pageFileExists(row: LivePageRow, options: SourcePageImageOptions): boolean {
  return existsSync(resolveCanvasAssetPath(canvasAssetRoot(options.canvasAssetRootDir), row.storage_key));
}

function storeRenderedPage(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  target: PageImageTarget,
  pageNumber: number,
  rendered: RenderedSourcePage,
  options: SourcePageImageOptions,
): void {
  const { width, height } = pngSize(rendered.png);
  const assetId = `source-page-image:${target.materialization_id}:${pageNumber}`;
  const storageKey = `${userId}/${SOURCE_ASSET_FOLDER}/${target.materialization_id}-page-${pageNumber}.png`;
  const finalPath = resolveCanvasAssetPath(canvasAssetRoot(options.canvasAssetRootDir), storageKey);
  const tempPath = `${finalPath}.tmp-${uuidv4()}`;
  const now = timestamp(options);
  mkdirSync(dirname(finalPath), { recursive: true });
  try {
    writeFileSync(tempPath, rendered.png);
    renameSync(tempPath, finalPath);
  } catch (error) {
    rmSync(tempPath, { force: true });
    throw error;
  }
  db.transaction(() => {
    // The orphan sweep only spares rows carrying managed_by: without it, every
    // restart deletes these files while the rows stay behind.
    db.prepare(`
      INSERT INTO canvas_assets (
        id, user_id, course_id, origin_note_id, kind, storage_kind, storage_key,
        filename, mime_type, byte_size, width, height, sha256, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'image', 'local_file', ?, ?, 'image/png', ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        course_id = excluded.course_id,
        origin_note_id = excluded.origin_note_id,
        byte_size = excluded.byte_size,
        width = excluded.width,
        height = excluded.height,
        sha256 = excluded.sha256,
        updated_at = excluded.updated_at
    `).run(
      assetId,
      userId,
      target.course_id,
      target.projection_note_id,
      storageKey,
      `page-${pageNumber}.png`,
      rendered.png.length,
      width,
      height,
      createHash('sha256').update(rendered.png).digest('hex'),
      JSON.stringify({
        managed_by: 'source_materialization',
        source_record_id: sourceRecordId,
        source_file_id: target.source_file_id,
        materialization_id: target.materialization_id,
        page_number: pageNumber,
      }),
      now,
      now,
    );
    db.prepare(`
      INSERT INTO source_pages (
        id, user_id, source_record_id, materialization_id, page_number,
        pdf_width, pdf_height, image_asset_id, image_width, image_height, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(materialization_id, page_number) DO UPDATE SET
        pdf_width = excluded.pdf_width,
        pdf_height = excluded.pdf_height,
        image_asset_id = excluded.image_asset_id,
        image_width = excluded.image_width,
        image_height = excluded.image_height
    `).run(
      `source-page:${target.materialization_id}:${pageNumber}`,
      userId,
      sourceRecordId,
      target.materialization_id,
      pageNumber,
      rendered.pdf_width,
      rendered.pdf_height,
      assetId,
      width,
      height,
      now,
    );
  })();
}

function errorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 200);
}

async function renderMissingPages(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: SourcePageImageOptions,
): Promise<void> {
  const first = pageImageTarget(db, userId, sourceRecordId);
  if (!first) return;
  let renderer: SourcePageRenderer | null = null;
  try {
    renderer = await (options.openPageRenderer || openPdfPageRenderer)(
      resolveSourceStorageKey(first.storage_key, options.sourceRootDir),
    );
    const expected = renderer.total;
    const failedPages: number[] = [];
    const report = (materializationId: string, status: PageImageProgress['status']) => writeProgress(db, userId, sourceRecordId, {
      expected,
      completed: livePages(db, userId, materializationId).length,
      status,
      failed_pages: failedPages,
    }, options);
    report(first.materialization_id, 'partial');

    for (let pageNumber = 1; pageNumber <= expected; pageNumber += 1) {
      // Parsing runs on the main loop, so hand it back between pages.
      await new Promise((resolve) => setImmediate(resolve));
      const before = pageImageTarget(db, userId, sourceRecordId);
      if (!before) return;
      const live = livePages(db, userId, before.materialization_id)
        .find((row) => row.page_number === pageNumber);
      if (live && pageFileExists(live, options)) continue;
      try {
        const rendered = await renderer.render(pageNumber);
        // Everything after this await is synchronous, so the file and its row
        // cannot land on a Source deleted while the page was rendering.
        const after = pageImageTarget(db, userId, sourceRecordId);
        if (!after) return;
        storeRenderedPage(db, userId, sourceRecordId, after, pageNumber, rendered, options);
      } catch (error) {
        failedPages.push(pageNumber);
        console.warn(`Source page image failed: ${sourceRecordId} page ${pageNumber}: ${errorMessage(error)}`);
      }
      report(before.materialization_id, 'partial');
    }

    const last = pageImageTarget(db, userId, sourceRecordId);
    if (!last) return;
    const complete = failedPages.length === 0 && livePages(db, userId, last.materialization_id).length === expected;
    report(last.materialization_id, complete ? 'complete' : 'failed');
  } catch (error) {
    // The text projection is already published and stays readable: this never
    // turns the materialization back to failed.
    const current = pageImageTarget(db, userId, sourceRecordId);
    if (current) {
      const previous = readProgress(db, userId, sourceRecordId);
      writeProgress(db, userId, sourceRecordId, {
        expected: previous?.expected ?? 0,
        completed: livePages(db, userId, current.materialization_id).length,
        status: 'failed',
        failed_pages: previous?.failed_pages ?? [],
        error: errorMessage(error),
      }, options);
    }
    console.warn(`Source page images failed: ${sourceRecordId}: ${errorMessage(error)}`);
  } finally {
    await renderer?.close().catch(() => undefined);
  }
}

const running = new Map<string, Promise<void>>();
let queueTail: Promise<void> = Promise.resolve();

// Never rejects. One document renders at a time, because rendering competes with
// API requests for the main loop.
export function scheduleSourcePageImages(
  db: Database.Database,
  userId: string,
  sourceRecordId: string,
  options: SourcePageImageOptions = {},
): Promise<void> {
  const key = `${userId}:${sourceRecordId}`;
  const existing = running.get(key);
  if (existing) return existing;
  try {
    const target = pageImageTarget(db, userId, sourceRecordId);
    if (!target) return Promise.resolve();
    const progress = readProgress(db, userId, sourceRecordId);
    const live = livePages(db, userId, target.materialization_id);
    if (
      progress?.status === 'complete'
      && live.length === progress.expected
      && live.every((row) => pageFileExists(row, options))
    ) {
      return Promise.resolve();
    }
    writeProgress(db, userId, sourceRecordId, {
      expected: progress?.expected ?? 0,
      completed: live.length,
      status: 'pending',
      failed_pages: [],
    }, options);
  } catch (error) {
    console.warn(`Source page images could not be scheduled: ${sourceRecordId}: ${errorMessage(error)}`);
    return Promise.resolve();
  }
  const task = queueTail
    .then(() => renderMissingPages(db, userId, sourceRecordId, options))
    .catch((error) => {
      console.warn(`Source page images stopped: ${sourceRecordId}: ${errorMessage(error)}`);
    })
    .finally(() => {
      running.delete(key);
    });
  queueTail = task;
  running.set(key, task);
  return task;
}

export async function waitForScheduledSourcePageImages(): Promise<void> {
  while (running.size) await Promise.all([...running.values()]);
}

export function resumeSourcePageImages(
  db: Database.Database,
  options: SourcePageImageOptions = {},
): number {
  const rows = db.prepare(`
    SELECT sr.id AS source_record_id, sr.user_id
    FROM source_records sr
    JOIN source_materializations sm ON sm.source_record_id = sr.id AND sm.user_id = sr.user_id
    WHERE sm.status = 'materialized' AND sm.projection_note_id IS NOT NULL
      AND json_valid(sr.metadata)
      AND json_extract(sr.metadata, '$.page_images.status') IN ('pending', 'partial')
    ORDER BY sr.created_at ASC, sr.id ASC
  `).all() as Array<{ source_record_id: string; user_id: string }>;
  for (const row of rows) {
    void scheduleSourcePageImages(db, row.user_id, row.source_record_id, options);
  }
  return rows.length;
}

// A replacement keeps the same materialization and the same file, so the images
// stay valid. Deleting the old note nulled origin_note_id; deletion relies on it.
export function adoptSourcePageImages(
  db: Database.Database,
  userId: string,
  materializationId: string,
  projectionNoteId: string,
  courseId: string,
  now: string,
): void {
  db.prepare(`
    UPDATE canvas_assets
    SET origin_note_id = ?, course_id = ?, updated_at = ?
    WHERE user_id = ? AND id IN (
      SELECT image_asset_id FROM source_pages WHERE materialization_id = ? AND image_asset_id IS NOT NULL
    )
  `).run(projectionNoteId, courseId, now, userId, materializationId);
}

export function sourcePageImageAssetIds(
  db: Database.Database,
  userId: string,
  materializationId: string,
): string[] {
  return (db.prepare(`
    SELECT image_asset_id FROM source_pages
    WHERE materialization_id = ? AND user_id = ? AND image_asset_id IS NOT NULL
    ORDER BY page_number ASC
  `).all(materializationId, userId) as Array<{ image_asset_id: string }>).map((row) => row.image_asset_id);
}

export function getSourcePages(db: Database.Database, userId: string, sourceRecordId: string) {
  const materialization = db.prepare(`
    SELECT id, projection_note_id FROM source_materializations
    WHERE source_record_id = ? AND user_id = ?
  `).get(sourceRecordId, userId) as { id: string; projection_note_id: string | null } | undefined;
  if (!materialization) throw new AppError(404, 'Source not found');
  const progress = readProgress(db, userId, sourceRecordId);
  // Project deletion can remove the projection and its images but keep the Source.
  if (!progress || !materialization.projection_note_id) {
    return { status: 'none' as const, expected: 0, completed: 0, failed_pages: [] as number[], pages: [] };
  }
  const pages = db.prepare(`
    SELECT page_number, image_asset_id AS asset_id, image_width, image_height, pdf_width, pdf_height
    FROM source_pages
    WHERE materialization_id = ? AND user_id = ? AND image_asset_id IS NOT NULL
    ORDER BY page_number ASC
  `).all(materialization.id, userId) as Array<{
    page_number: number;
    asset_id: string;
    image_width: number;
    image_height: number;
    pdf_width: number;
    pdf_height: number;
  }>;
  return {
    status: progress.status,
    expected: progress.expected,
    completed: pages.length,
    failed_pages: progress.failed_pages,
    pages,
  };
}

export function getSourcePagesByProjectionNote(db: Database.Database, userId: string, noteId: string) {
  // projection_note_id has no UNIQUE constraint; every publish mints a new note,
  // so more than one match means the one-to-one assumption has broken.
  const rows = db.prepare(`
    SELECT source_record_id FROM source_materializations
    WHERE projection_note_id = ? AND user_id = ?
    ORDER BY updated_at DESC, id DESC
    LIMIT 2
  `).all(noteId, userId) as Array<{ source_record_id: string }>;
  if (!rows.length) throw new AppError(404, 'Source projection not found');
  if (rows.length > 1) {
    throw new AppError(500, 'Source projection belongs to more than one Source', { code: 'source_projection_ambiguous' });
  }
  return getSourcePages(db, userId, rows[0].source_record_id);
}
