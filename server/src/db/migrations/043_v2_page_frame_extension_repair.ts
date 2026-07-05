import type Database from 'better-sqlite3';

const PAGE_FRAME_COLLECTION_KEY = 'canvas_engine_page_frames_v1';
const DEFAULT_PAGE_SIZE = 'A4';
const DEFAULT_CONTENT_INSET = { top: 96, right: 72, bottom: 96, left: 72 };

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function tableExists(db: Database.Database, name: string): boolean {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(name));
}

function findLegacyFrame(
  metadataJson: string | null,
  frameId: string,
): { frame: Record<string, unknown>; collection: Record<string, unknown> } | null {
  const metadata = parseJson<Record<string, unknown>>(metadataJson, {});
  const collection = metadata[PAGE_FRAME_COLLECTION_KEY];
  if (!isRecord(collection) || !Array.isArray(collection.pageFrames)) return null;
  const frame = collection.pageFrames.find((candidate) => (
    isRecord(candidate) && candidate.id === frameId
  ));
  return isRecord(frame) ? { frame, collection } : null;
}

function findStackInfo(
  collection: Record<string, unknown> | null,
  persistedStacksJson: string | null,
  frameId: string,
): { stackId: string | null; pageIndex: number | null } {
  const stacks = Array.isArray(collection?.pageStacks)
    ? collection.pageStacks
    : parseJson<unknown[]>(persistedStacksJson, []);
  for (const stack of stacks) {
    if (!isRecord(stack) || typeof stack.id !== 'string' || !Array.isArray(stack.frameIds)) continue;
    const pageIndex = stack.frameIds.findIndex((candidate) => candidate === frameId);
    if (pageIndex >= 0) return { stackId: stack.id, pageIndex };
  }
  return { stackId: null, pageIndex: null };
}

function normalizeInset(value: unknown) {
  if (!isRecord(value)) return DEFAULT_CONTENT_INSET;
  return {
    top: numeric(value.top, DEFAULT_CONTENT_INSET.top),
    right: numeric(value.right, DEFAULT_CONTENT_INSET.right),
    bottom: numeric(value.bottom, DEFAULT_CONTENT_INSET.bottom),
    left: numeric(value.left, DEFAULT_CONTENT_INSET.left),
  };
}

export default {
  id: '043_v2_page_frame_extension_repair',
  description: 'Repair missing note-scoped PageFrame extension rows after cutover',
  up(db: Database.Database): void {
    const requiredTables = [
      'canvas_objects',
      'canvas_placements',
      'canvas_page_collections',
      'page_frame_extensions',
      'notes',
    ];
    if (!requiredTables.every((name) => tableExists(db, name))) return;

    const missingFrames = db.prepare(`
      SELECT
        co.id AS object_id,
        co.user_id,
        co.course_id,
        co.note_id,
        co.canvas_id,
        cp.frame_id,
        cpc.page_stacks_json,
        n.metadata AS note_metadata
      FROM canvas_objects co
      JOIN canvas_placements cp
        ON cp.object_id = co.id
        AND cp.user_id = co.user_id
        AND cp.note_id = co.note_id
      JOIN canvas_page_collections cpc
        ON cpc.note_id = co.note_id
        AND cpc.user_id = co.user_id
      JOIN notes n
        ON n.id = co.note_id
        AND n.user_id = co.user_id
      LEFT JOIN page_frame_extensions pfe
        ON pfe.note_id = co.note_id
        AND pfe.frame_id = cp.frame_id
        AND pfe.user_id = co.user_id
      WHERE co.kind = 'page_frame'
        AND co.status = 'active'
        AND cp.frame_id IS NOT NULL
        AND pfe.frame_id IS NULL
      ORDER BY co.note_id ASC, cp.frame_id ASC
    `).all() as Array<{
      object_id: string;
      user_id: string;
      course_id: string;
      note_id: string;
      canvas_id: string;
      frame_id: string;
      page_stacks_json: string | null;
      note_metadata: string | null;
    }>;

    const insertExtension = db.prepare(`
      INSERT OR IGNORE INTO page_frame_extensions (
        frame_id, user_id, course_id, note_id, object_id, canvas_id,
        page_stack_id, page_index, page_size, content_inset_json,
        typography_json, background_json, template_id, template_json,
        slots_json, exportable, metadata, created_at, updated_at
      )
      VALUES (
        @frame_id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
        @page_stack_id, @page_index, @page_size, @content_inset_json,
        @typography_json, @background_json, @template_id, @template_json,
        @slots_json, @exportable, @metadata, datetime('now'), datetime('now')
      )
    `);

    for (const row of missingFrames) {
      const legacy = findLegacyFrame(row.note_metadata, row.frame_id);
      const frame = legacy?.frame || {};
      const stackInfo = findStackInfo(legacy?.collection || null, row.page_stacks_json, row.frame_id);
      const recovered = !legacy;
      const metadata = recovered
        ? {
          recovered: true,
          degraded: true,
          repaired_by: '043_v2_page_frame_extension_repair',
          recovered_reason: 'missing_legacy_page_frame_extension',
        }
        : {
          role: optionalText(frame.role),
          repaired_by: '043_v2_page_frame_extension_repair',
          repaired_from: PAGE_FRAME_COLLECTION_KEY,
        };

      insertExtension.run({
        frame_id: row.frame_id,
        user_id: row.user_id,
        course_id: row.course_id,
        note_id: row.note_id,
        object_id: row.object_id,
        canvas_id: row.canvas_id,
        page_stack_id: stackInfo.stackId,
        page_index: stackInfo.pageIndex,
        page_size: recovered ? DEFAULT_PAGE_SIZE : optionalText(frame.pageSize) || DEFAULT_PAGE_SIZE,
        content_inset_json: stringifyJson(recovered ? DEFAULT_CONTENT_INSET : normalizeInset(frame.contentInset), DEFAULT_CONTENT_INSET),
        typography_json: stringifyJson(recovered ? {} : frame.documentTypography, {}),
        background_json: stringifyJson(recovered ? {} : frame.background, {}),
        template_id: recovered ? null : optionalText(frame.templateId),
        template_json: stringifyJson(recovered ? {} : frame.template, {}),
        slots_json: stringifyJson(recovered ? {} : frame.slots, {}),
        exportable: recovered || frame.exportable !== false ? 1 : 0,
        metadata: stringifyJson(metadata, {}),
      });
    }
  },
};
