import type Database from 'better-sqlite3';

export type CourseLifecyclePolicy = 'move' | 'delete' | 'preserve' | 'fk-derived';
export type CourseReferenceDeleteAction = 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT' | 'SET DEFAULT';

export interface CourseLifecyclePolicyEntry {
  table: string;
  column: string;
  policy: CourseLifecyclePolicy;
  onDelete?: CourseReferenceDeleteAction;
  reason: string;
}

interface CourseReference {
  table: string;
  column: string;
  onDelete: string | null;
}

// This registry is deliberately explicit. A Project reference is a lifecycle
// decision, including historical origin receipts whose column is not course_id.
export const COURSE_LIFECYCLE_POLICIES: CourseLifecyclePolicyEntry[] = [
  { table: 'annotation_ranges', column: 'course_id', policy: 'move', reason: 'Projection annotation satellite' },
  { table: 'annotation_truths', column: 'course_id', policy: 'move', reason: 'Projection annotation truth' },
  { table: 'boards', column: 'project_id', policy: 'preserve', onDelete: 'SET NULL', reason: 'Library board weak Project label, never a container boundary' },
  { table: 'canvas_assets', column: 'course_id', policy: 'move', reason: 'Projection-owned asset origin' },
  { table: 'canvas_frames', column: 'course_id', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'canvas_nodes', column: 'course_id', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'canvas_objects', column: 'course_id', policy: 'move', reason: 'Projection CanvasObject' },
  { table: 'canvas_page_collections', column: 'course_id', policy: 'move', reason: 'Projection PageStack state' },
  { table: 'canvas_placements', column: 'course_id', policy: 'move', reason: 'Projection layout truth' },
  { table: 'canvas_viewport_states', column: 'course_id', policy: 'move', reason: 'Projection view state' },
  { table: 'card_decks', column: 'course_id', policy: 'delete', reason: 'Project-owned study data' },
  // 12.10-b:六表已由 053 退役,登记随亡;见 handoffs/2026-08-31-v12-10-b-*.md
  { table: 'conflict_review_items', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'content_group_members', column: 'course_id', policy: 'move', reason: 'ContentGroup user work' },
  { table: 'content_groups', column: 'course_id', policy: 'move', reason: 'ContentGroup root user work' },
  { table: 'content_mounts', column: 'course_id', policy: 'move', reason: 'Projection mount truth' },
  { table: 'documents', column: 'course_id', policy: 'delete', reason: 'Legacy Project document' },
  { table: 'evidence_items', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'evidence_sets', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'excluded_material_scopes', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'goals', column: 'course_id', policy: 'delete', reason: 'Project-owned planning data' },
  { table: 'group_folders', column: 'course_id', policy: 'move', reason: 'ContentGroup organization user work' },
  { table: 'image_object_extensions', column: 'course_id', policy: 'move', reason: 'Projection image object' },
  {
    table: 'items',
    column: 'origin_course_id',
    policy: 'preserve',
    onDelete: 'SET NULL',
    reason: 'Historical Item origin receipt survives Project deletion',
  },
  { table: 'learning_canvases', column: 'course_id', policy: 'delete', reason: 'Legacy Project canvas data' },
  { table: 'material_reconciliation_decisions', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'material_segments', column: 'course_id', policy: 'delete', reason: 'Legacy Project source data' },
  { table: 'note_blocks', column: 'course_id', policy: 'move', reason: 'Projection content truth' },
  { table: 'notes', column: 'course_id', policy: 'move', reason: 'SourceProjection root' },
  { table: 'operation_batches', column: 'course_id', policy: 'move', reason: 'Projection materialization receipt' },
  { table: 'page_frame_extensions', column: 'course_id', policy: 'move', reason: 'Projection PageFrame state' },
  { table: 'projections', column: 'course_id', policy: 'delete', reason: 'Legacy Project projection' },
  { table: 'purposes', column: 'course_id', policy: 'preserve', onDelete: 'SET NULL', reason: 'Library soul weak Project label; legacy note references await explicit migration' },
  { table: 'reconciliation_recovery_events', column: 'course_id', policy: 'delete', reason: 'Project reconciliation data' },
  { table: 'source_anchor_links', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_anchors', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_board_nodes', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_boards', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_fragments', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_materials', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_project_placements', column: 'course_id', policy: 'move', reason: 'Global Source Project lens' },
  {
    table: 'source_records',
    column: 'origin_course_id',
    policy: 'preserve',
    onDelete: 'SET NULL',
    reason: 'Historical Source origin receipt survives Project deletion',
  },
  { table: 'source_scopes', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_snapshot_pages', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'source_snapshots', column: 'course_id', policy: 'delete', reason: 'Legacy Project source seed' },
  { table: 'structured_object_extensions', column: 'course_id', policy: 'move', reason: 'Projection structured object' },
  { table: 'tag_groups', column: 'course_id', policy: 'delete', reason: 'Project-owned taxonomy' },
  { table: 'tasks', column: 'course_id', policy: 'delete', reason: 'Project-owned planning data' },
  { table: 'visual_connector_extensions', column: 'course_id', policy: 'move', reason: 'Projection visual connector' },
];

function referenceKey(reference: Pick<CourseReference, 'table' | 'column'>): string {
  return `${reference.table}.${reference.column}`;
}

export function listCourseReferences(db: Database.Database): CourseReference[] {
  const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name ASC
  `).all() as Array<{ name: string }>;
  const references = new Map<string, CourseReference>();

  for (const { name: table } of tables) {
    const columns = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all() as Array<{ name: string }>;
    const foreignKeys = db.prepare(`PRAGMA foreign_key_list(${JSON.stringify(table)})`).all() as Array<{
      table: string;
      from: string;
      on_delete: string;
    }>;

    for (const column of columns) {
      if (column.name !== 'course_id') continue;
      const foreignKey = foreignKeys.find((candidate) => (
        candidate.table === 'courses' && candidate.from === column.name
      ));
      const reference = { table, column: column.name, onDelete: foreignKey?.on_delete ?? null };
      references.set(referenceKey(reference), reference);
    }

    for (const foreignKey of foreignKeys) {
      if (foreignKey.table !== 'courses') continue;
      const reference = { table, column: foreignKey.from, onDelete: foreignKey.on_delete };
      references.set(referenceKey(reference), reference);
    }
  }

  return [...references.values()].sort((left, right) => referenceKey(left).localeCompare(referenceKey(right)));
}

export function listCourseScopedTables(db: Database.Database): string[] {
  return [...new Set(listCourseReferences(db).map((reference) => reference.table))].sort();
}

export function assertCourseLifecyclePolicyCoverage(
  db: Database.Database,
  policies: CourseLifecyclePolicyEntry[] = COURSE_LIFECYCLE_POLICIES,
): void {
  const actualReferences = listCourseReferences(db);
  const actual = new Map(actualReferences.map((reference) => [referenceKey(reference), reference]));
  const registered = new Map<string, CourseLifecyclePolicyEntry>();
  const duplicate: string[] = [];

  for (const policy of policies) {
    const key = referenceKey(policy);
    if (registered.has(key)) duplicate.push(key);
    registered.set(key, policy);
  }

  const missing = [...actual.keys()].filter((key) => !registered.has(key));
  const stale = [...registered.keys()].filter((key) => !actual.has(key));
  const onDeleteMismatch = [...registered.entries()].flatMap(([key, policy]) => {
    if (!policy.onDelete) return [];
    const actualReference = actual.get(key);
    return actualReference?.onDelete === policy.onDelete
      ? []
      : [`${key}:expected=${policy.onDelete},actual=${actualReference?.onDelete ?? 'none'}`];
  });

  if (missing.length || stale.length || duplicate.length || onDeleteMismatch.length) {
    throw new Error(
      'Course lifecycle policy coverage mismatch; '
      + `missing=[${missing.join(', ')}], stale=[${stale.join(', ')}], `
      + `duplicate=[${duplicate.join(', ')}], onDeleteMismatch=[${onDeleteMismatch.join(', ')}]`,
    );
  }
}
