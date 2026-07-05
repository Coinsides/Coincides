import type Database from 'better-sqlite3';

const PAGE_FRAME_COLLECTION_KEY = 'canvas_engine_page_frames_v1';
const NOTE_LAYOUT_KEY = 'better_notebook_layout';

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

function pageFrameObjectId(noteId: string, frameId: string): string {
  return `canvas-object:${noteId}:page-frame:${frameId}`;
}

function pageFramePlacementId(noteId: string, frameId: string): string {
  return `canvas-placement:${noteId}:page-frame:${frameId}`;
}

function blockProjectionObjectId(noteId: string, placementId: string): string {
  return `canvas-object:${noteId}:block-placement:${placementId}`;
}

function boundaryRoleForLayout(layout: Record<string, unknown>): string {
  const surface = layout.surface;
  if (surface === 'formal_page') return 'inside';
  if (surface === 'canvas_workspace') return 'outside';
  return 'inside';
}

function visibilityStateForLayout(layout: Record<string, unknown>): string {
  if (layout.export_role === 'scratch') return 'scratch';
  if (layout.ai_visibility === 'hidden') return 'ai_hidden';
  if (layout.export_role === 'excluded') return 'export_hidden';
  return 'normal';
}

function numeric(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function createCanvasTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS canvas_objects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      backing TEXT NOT NULL DEFAULT 'none',
      object_class TEXT NOT NULL DEFAULT 'pure',
      status TEXT NOT NULL DEFAULT 'active',
      source_json TEXT NOT NULL DEFAULT '{}',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_canvas_objects_note_kind
      ON canvas_objects(user_id, note_id, kind, status);
    CREATE INDEX IF NOT EXISTS idx_canvas_objects_canvas
      ON canvas_objects(user_id, canvas_id, status);

    CREATE TABLE IF NOT EXISTS canvas_placements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      object_id TEXT NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 0,
      height REAL NOT NULL DEFAULT 0,
      rotation REAL NOT NULL DEFAULT 0,
      frame_id TEXT,
      surface TEXT NOT NULL DEFAULT 'formal_page',
      boundary_role TEXT NOT NULL DEFAULT 'inside',
      z_index INTEGER NOT NULL DEFAULT 0,
      snap_state_json TEXT NOT NULL DEFAULT '{}',
      visibility_state TEXT NOT NULL DEFAULT 'normal',
      render_visibility TEXT NOT NULL DEFAULT 'visible',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_canvas_placements_note
      ON canvas_placements(user_id, note_id, surface, z_index);
    CREATE INDEX IF NOT EXISTS idx_canvas_placements_object
      ON canvas_placements(object_id);
    CREATE INDEX IF NOT EXISTS idx_canvas_placements_frame
      ON canvas_placements(user_id, note_id, frame_id);

    CREATE TABLE IF NOT EXISTS content_mounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      object_id TEXT NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
      target_kind TEXT NOT NULL,
      target_id TEXT NOT NULL,
      projection_mode TEXT NOT NULL DEFAULT 'owned',
      sync_policy TEXT NOT NULL DEFAULT 'manual',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_content_mounts_target
      ON content_mounts(user_id, target_kind, target_id);
    CREATE INDEX IF NOT EXISTS idx_content_mounts_object
      ON content_mounts(object_id);

    CREATE TABLE IF NOT EXISTS page_frame_extensions (
      frame_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      object_id TEXT NOT NULL REFERENCES canvas_objects(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL,
      page_stack_id TEXT,
      page_index INTEGER,
      page_size TEXT,
      content_inset_json TEXT NOT NULL DEFAULT '{}',
      typography_json TEXT NOT NULL DEFAULT '{}',
      background_json TEXT NOT NULL DEFAULT '{}',
      template_id TEXT,
      template_json TEXT NOT NULL DEFAULT '{}',
      slots_json TEXT NOT NULL DEFAULT '{}',
      exportable INTEGER NOT NULL DEFAULT 1,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_page_frame_extensions_note
      ON page_frame_extensions(user_id, note_id, page_stack_id, page_index);
    CREATE INDEX IF NOT EXISTS idx_page_frame_extensions_object
      ON page_frame_extensions(object_id);

    CREATE TABLE IF NOT EXISTS canvas_page_collections (
      note_id TEXT PRIMARY KEY REFERENCES notes(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      canvas_id TEXT NOT NULL,
      primary_frame_id TEXT,
      selected_frame_id TEXT,
      primary_stack_id TEXT,
      selected_stack_id TEXT,
      page_stacks_json TEXT NOT NULL DEFAULT '[]',
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_canvas_page_collections_user_note
      ON canvas_page_collections(user_id, note_id);
  `);
}

function backfillPageFrameCollections(db: Database.Database): void {
  const notes = db.prepare(`
    SELECT id, user_id, course_id, metadata
    FROM notes
    WHERE metadata IS NOT NULL
  `).all() as Array<{ id: string; user_id: string; course_id: string; metadata: string | null }>;

  const insertObject = db.prepare(`
    INSERT OR REPLACE INTO canvas_objects (
      id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
      status, source_json, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @canvas_id, 'page_frame', 'none', 'pure',
      'active', @source_json, @metadata, datetime('now'), datetime('now')
    )
  `);
  const insertPlacement = db.prepare(`
    INSERT OR REPLACE INTO canvas_placements (
      id, user_id, course_id, note_id, object_id, canvas_id,
      x, y, width, height, rotation, frame_id, surface, boundary_role,
      z_index, snap_state_json, visibility_state, render_visibility, metadata,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
      @x, @y, @width, @height, 0, @frame_id, 'formal_page', 'inside',
      @z_index, '{}', 'normal', 'visible', @metadata,
      datetime('now'), datetime('now')
    )
  `);
  const insertExtension = db.prepare(`
    INSERT OR REPLACE INTO page_frame_extensions (
      frame_id, user_id, course_id, note_id, object_id, canvas_id,
      page_stack_id, page_index, page_size, content_inset_json,
      typography_json, background_json, template_id, template_json,
      slots_json, exportable, metadata, created_at, updated_at
    )
    VALUES (
      @frame_id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
      @page_stack_id, @page_index, @page_size, @content_inset_json,
      @typography_json, @background_json, @template_id, '{}',
      '{}', @exportable, @metadata, datetime('now'), datetime('now')
    )
  `);
  const upsertCollection = db.prepare(`
    INSERT INTO canvas_page_collections (
      note_id, user_id, course_id, canvas_id, primary_frame_id, selected_frame_id,
      primary_stack_id, selected_stack_id, page_stacks_json, metadata,
      created_at, updated_at
    )
    VALUES (
      @note_id, @user_id, @course_id, @canvas_id, @primary_frame_id, @selected_frame_id,
      @primary_stack_id, @selected_stack_id, @page_stacks_json, @metadata,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(note_id) DO UPDATE SET
      canvas_id = excluded.canvas_id,
      primary_frame_id = excluded.primary_frame_id,
      selected_frame_id = excluded.selected_frame_id,
      primary_stack_id = excluded.primary_stack_id,
      selected_stack_id = excluded.selected_stack_id,
      page_stacks_json = excluded.page_stacks_json,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `);
  const updateNoteMetadata = db.prepare('UPDATE notes SET metadata = ?, updated_at = datetime(\'now\') WHERE id = ?');

  for (const note of notes) {
    const metadata = parseJson<Record<string, unknown>>(note.metadata, {});
    const collection = metadata[PAGE_FRAME_COLLECTION_KEY];
    if (!isRecord(collection) || !Array.isArray(collection.pageFrames)) continue;

    const pageStacks = Array.isArray(collection.pageStacks) ? collection.pageStacks : [];
    const canvasId = note.id;
    upsertCollection.run({
      note_id: note.id,
      user_id: note.user_id,
      course_id: note.course_id,
      canvas_id: canvasId,
      primary_frame_id: optionalText(collection.primaryFrameId),
      selected_frame_id: optionalText(collection.selectedFrameId),
      primary_stack_id: optionalText(collection.primaryStackId),
      selected_stack_id: optionalText(collection.selectedStackId),
      page_stacks_json: stringifyJson(pageStacks, []),
      metadata: stringifyJson({ imported_from: PAGE_FRAME_COLLECTION_KEY, version: collection.version }, {}),
    });

    const stackByFrame = new Map<string, { stackId: string; index: number }>();
    pageStacks.forEach((stack) => {
      if (!isRecord(stack) || typeof stack.id !== 'string' || !Array.isArray(stack.frameIds)) return;
      const stackId = stack.id;
      stack.frameIds.forEach((frameId, index) => {
        if (typeof frameId === 'string') stackByFrame.set(frameId, { stackId, index });
      });
    });

    collection.pageFrames.forEach((frame, index) => {
      if (!isRecord(frame) || typeof frame.id !== 'string') return;
      const objectId = pageFrameObjectId(note.id, frame.id);
      const stackInfo = stackByFrame.get(frame.id);
      insertObject.run({
        id: objectId,
        user_id: note.user_id,
        course_id: note.course_id,
        note_id: note.id,
        canvas_id: canvasId,
        source_json: stringifyJson({ imported_from: PAGE_FRAME_COLLECTION_KEY }, {}),
        metadata: stringifyJson({ frame_id: frame.id }, {}),
      });
      insertPlacement.run({
        id: pageFramePlacementId(note.id, frame.id),
        user_id: note.user_id,
        course_id: note.course_id,
        note_id: note.id,
        object_id: objectId,
        canvas_id: canvasId,
        x: numeric(frame.x, 0),
        y: numeric(frame.y, 0),
        width: numeric(frame.width, 0),
        height: numeric(frame.height, 0),
        frame_id: frame.id,
        z_index: index,
        metadata: stringifyJson({ placement_kind: 'page_frame' }, {}),
      });
      insertExtension.run({
        frame_id: frame.id,
        user_id: note.user_id,
        course_id: note.course_id,
        note_id: note.id,
        object_id: objectId,
        canvas_id: canvasId,
        page_stack_id: stackInfo?.stackId || null,
        page_index: stackInfo?.index ?? null,
        page_size: optionalText(frame.pageSize),
        content_inset_json: stringifyJson(frame.contentInset, {}),
        typography_json: stringifyJson(frame.documentTypography, {}),
        background_json: stringifyJson(frame.background, {}),
        template_id: optionalText(frame.templateId),
        exportable: frame.exportable === false ? 0 : 1,
        metadata: stringifyJson({ role: optionalText(frame.role) }, {}),
      });
    });

    const nextMetadata = { ...metadata };
    delete nextMetadata[PAGE_FRAME_COLLECTION_KEY];
    updateNoteMetadata.run(stringifyJson(nextMetadata, {}), note.id);
  }
}

function backfillBlockLayouts(db: Database.Database): void {
  const rows = db.prepare(`
    SELECT
      nbp.id AS placement_id,
      nbp.note_id,
      nbp.block_id,
      nbp.display_overrides_json,
      nb.user_id,
      nb.course_id
    FROM note_block_placements nbp
    JOIN note_blocks nb ON nb.id = nbp.block_id
    WHERE nbp.display_overrides_json IS NOT NULL
  `).all() as Array<{
    placement_id: string;
    note_id: string;
    block_id: string;
    display_overrides_json: string | null;
    user_id: string;
    course_id: string;
  }>;

  const upsertObject = db.prepare(`
    INSERT INTO canvas_objects (
      id, user_id, course_id, note_id, canvas_id, kind, backing, object_class,
      status, source_json, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @canvas_id, 'paragraph_block_projection',
      'note_block', 'block_backed', 'active', @source_json, @metadata,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      note_id = excluded.note_id,
      canvas_id = excluded.canvas_id,
      status = excluded.status,
      source_json = excluded.source_json,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `);
  const upsertPlacement = db.prepare(`
    INSERT INTO canvas_placements (
      id, user_id, course_id, note_id, object_id, canvas_id,
      x, y, width, height, rotation, frame_id, surface, boundary_role,
      z_index, snap_state_json, visibility_state, render_visibility, metadata,
      created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @object_id, @canvas_id,
      @x, @y, @width, @height, @rotation, @frame_id, @surface, @boundary_role,
      @z_index, @snap_state_json, @visibility_state, 'visible', @metadata,
      datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      object_id = excluded.object_id,
      canvas_id = excluded.canvas_id,
      x = excluded.x,
      y = excluded.y,
      width = excluded.width,
      height = excluded.height,
      rotation = excluded.rotation,
      frame_id = excluded.frame_id,
      surface = excluded.surface,
      boundary_role = excluded.boundary_role,
      z_index = excluded.z_index,
      snap_state_json = excluded.snap_state_json,
      visibility_state = excluded.visibility_state,
      render_visibility = excluded.render_visibility,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `);
  const upsertMount = db.prepare(`
    INSERT INTO content_mounts (
      id, user_id, course_id, note_id, object_id, target_kind, target_id,
      projection_mode, sync_policy, metadata, created_at, updated_at
    )
    VALUES (
      @id, @user_id, @course_id, @note_id, @object_id, 'note_block', @target_id,
      'owned', 'manual', @metadata, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      object_id = excluded.object_id,
      target_id = excluded.target_id,
      metadata = excluded.metadata,
      updated_at = excluded.updated_at
  `);
  const updatePlacement = db.prepare(`
    UPDATE note_block_placements
    SET display_overrides_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  for (const row of rows) {
    const overrides = parseJson<Record<string, unknown>>(row.display_overrides_json, {});
    const layout = overrides[NOTE_LAYOUT_KEY];
    if (!isRecord(layout)) continue;
    const canvasId = row.note_id;
    const objectId = blockProjectionObjectId(row.note_id, row.placement_id);
    const surface = layout.surface === 'canvas_workspace' ? 'canvas_workspace' : 'formal_page';

    upsertObject.run({
      id: objectId,
      user_id: row.user_id,
      course_id: row.course_id,
      note_id: row.note_id,
      canvas_id: canvasId,
      source_json: stringifyJson({ imported_from: `display_overrides_json.${NOTE_LAYOUT_KEY}` }, {}),
      metadata: stringifyJson({ block_id: row.block_id, placement_id: row.placement_id }, {}),
    });
    upsertPlacement.run({
      id: row.placement_id,
      user_id: row.user_id,
      course_id: row.course_id,
      note_id: row.note_id,
      object_id: objectId,
      canvas_id: canvasId,
      x: numeric(layout.x, 0),
      y: numeric(layout.y, 0),
      width: numeric(layout.width, 0),
      height: numeric(layout.height, 0),
      rotation: numeric(layout.rotation, 0),
      frame_id: optionalText(layout.frame_id),
      surface,
      boundary_role: boundaryRoleForLayout(layout),
      z_index: 0,
      snap_state_json: stringifyJson({ state: surface === 'formal_page' ? 'snapped' : 'free' }, {}),
      visibility_state: visibilityStateForLayout(layout),
      metadata: stringifyJson({
        layout_policy: {
          export_role: optionalText(layout.export_role),
          ai_visibility: optionalText(layout.ai_visibility),
          width_mode: optionalText(layout.width_mode),
        },
      }, {}),
    });
    upsertMount.run({
      id: `content-mount:${row.placement_id}`,
      user_id: row.user_id,
      course_id: row.course_id,
      note_id: row.note_id,
      object_id: objectId,
      target_id: row.block_id,
      metadata: stringifyJson({ created_from: NOTE_LAYOUT_KEY }, {}),
    });

    const nextOverrides = { ...overrides };
    delete nextOverrides[NOTE_LAYOUT_KEY];
    updatePlacement.run(stringifyJson(nextOverrides, {}), row.placement_id);
  }
}

export default {
  id: '035_v2_canvas_objects',
  description: 'Add durable CanvasObject, CanvasPlacement, ContentMount, and PageFrame extension tables',
  up(db: Database.Database): void {
    createCanvasTables(db);
    backfillPageFrameCollections(db);
    backfillBlockLayouts(db);
  },
};
