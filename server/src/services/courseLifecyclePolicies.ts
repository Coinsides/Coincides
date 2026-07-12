import type Database from 'better-sqlite3';

export type CourseLifecyclePolicy = 'move' | 'delete' | 'preserve' | 'fk-derived';

export interface CourseLifecyclePolicyEntry {
  table: string;
  policy: CourseLifecyclePolicy;
  reason: string;
}

// This registry is deliberately explicit. A new course_id column is a lifecycle
// decision, not an implementation detail that should inherit accidental CASCADE behavior.
export const COURSE_LIFECYCLE_POLICIES: CourseLifecyclePolicyEntry[] = [
  { table: 'annotation_ranges', policy: 'move', reason: 'Projection annotation satellite' },
  { table: 'annotation_truths', policy: 'move', reason: 'Projection annotation truth' },
  { table: 'canvas_assets', policy: 'move', reason: 'Projection-owned asset origin' },
  { table: 'canvas_edges', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'canvas_frames', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'canvas_nodes', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'canvas_objects', policy: 'move', reason: 'Projection CanvasObject' },
  { table: 'canvas_page_collections', policy: 'move', reason: 'Projection PageStack state' },
  { table: 'canvas_placements', policy: 'move', reason: 'Projection layout truth' },
  { table: 'canvas_viewport_states', policy: 'move', reason: 'Projection view state' },
  { table: 'card_decks', policy: 'delete', reason: 'Project-owned study data' },
  { table: 'composition_instance_slots', policy: 'delete', reason: 'Project-owned composition data' },
  { table: 'composition_instances', policy: 'delete', reason: 'Project-owned composition data' },
  { table: 'conflict_review_items', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'content_group_fragments', policy: 'move', reason: 'ContentGroup user work' },
  { table: 'content_group_members', policy: 'move', reason: 'ContentGroup user work' },
  { table: 'content_group_petals', policy: 'move', reason: 'ContentGroup user work' },
  { table: 'content_groups', policy: 'move', reason: 'ContentGroup root user work' },
  { table: 'content_mounts', policy: 'move', reason: 'Projection mount truth' },
  { table: 'documents', policy: 'delete', reason: 'Legacy Project document' },
  { table: 'domain_object_classifications', policy: 'preserve', reason: 'FK retains history with NULL Project' },
  { table: 'domain_refinement_records', policy: 'preserve', reason: 'FK retains history with NULL Project' },
  { table: 'evidence_items', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'evidence_sets', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'excluded_material_scopes', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'goals', policy: 'delete', reason: 'Project-owned planning data' },
  { table: 'group_folders', policy: 'move', reason: 'ContentGroup organization user work' },
  { table: 'image_object_extensions', policy: 'move', reason: 'Projection image object' },
  { table: 'learning_canvases', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'material_reconciliation_decisions', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'material_segments', policy: 'delete', reason: 'Legacy Project source data' },
  { table: 'note_blocks', policy: 'move', reason: 'Projection content truth' },
  { table: 'notes', policy: 'move', reason: 'SourceProjection root' },
  { table: 'object_relations', policy: 'delete', reason: 'Legacy Project relation seed' },
  { table: 'operation_batches', policy: 'move', reason: 'Projection materialization receipt' },
  { table: 'page_frame_extensions', policy: 'move', reason: 'Projection PageFrame state' },
  { table: 'projections', policy: 'delete', reason: 'Legacy Project projection' },
  { table: 'purposes', policy: 'move', reason: 'Purpose user work' },
  { table: 'reconciliation_recovery_events', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'relation_layers', policy: 'delete', reason: 'Legacy Project relation seed' },
  { table: 'source_anchor_links', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_anchors', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_board_nodes', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_boards', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_fragments', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_materials', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_project_placements', policy: 'move', reason: 'Global Source Project lens' },
  { table: 'source_scopes', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_snapshot_pages', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_snapshots', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'structured_object_extensions', policy: 'move', reason: 'Projection structured object' },
  { table: 'tag_groups', policy: 'delete', reason: 'Project-owned taxonomy' },
  { table: 'tasks', policy: 'delete', reason: 'Project-owned planning data' },
  { table: 'template_migration_record_items', policy: 'preserve', reason: 'FK retains history with NULL Project' },
  { table: 'template_migration_records', policy: 'preserve', reason: 'FK retains history with NULL Project' },
  { table: 'visual_connector_extensions', policy: 'move', reason: 'Projection visual connector' },
];

export function listCourseScopedTables(db: Database.Database): string[] {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `).all() as Array<{ name: string }>;
  return tables
    .filter(({ name }) => (
      db.prepare(`PRAGMA table_info(${JSON.stringify(name)})`).all() as Array<{ name: string }>
    ).some((column) => column.name === 'course_id'))
    .map(({ name }) => name);
}

export function assertCourseLifecyclePolicyCoverage(db: Database.Database): void {
  const actual = new Set(listCourseScopedTables(db));
  const registered = new Set(COURSE_LIFECYCLE_POLICIES.map((entry) => entry.table));
  const missing = [...actual].filter((table) => !registered.has(table));
  const stale = [...registered].filter((table) => !actual.has(table));
  if (missing.length || stale.length) {
    throw new Error(`Course lifecycle policy coverage mismatch; missing=[${missing.join(', ')}], stale=[${stale.join(', ')}]`);
  }
}
