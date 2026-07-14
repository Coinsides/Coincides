import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '../middleware/errorHandler.js';
import { ensureCurrentItemSnapshot, itemContentHash } from './items.js';
import { getPurposeCompiledScope } from './purposes.js';

export type RelationDirectionality = 'directed' | 'undirected';
export type RelationStatus = 'active' | 'revoked';
export type RelationFreshness = 'fresh' | 'from_changed' | 'to_changed' | 'both_changed';
export type RelationAssessmentVerdict = 'still_holds' | 'questionable';
export type RelationReaffirmFaultPoint =
  | 'after_from_snapshot'
  | 'after_to_snapshot'
  | 'after_relation_update'
  | 'before_commit';

export const RELATION_TYPE_DEFINITIONS = [
  { id: 'derives_to', directionality: 'directed' },
  { id: 'depends_on', directionality: 'directed' },
  { id: 'supports', directionality: 'directed' },
  { id: 'contradicts', directionality: 'directed' },
  { id: 'example_of', directionality: 'directed' },
  { id: 'equivalent_to', directionality: 'undirected' },
  { id: 'analogous_to', directionality: 'undirected' },
  { id: 'contrasts_with', directionality: 'undirected' },
  { id: 'companion_of', directionality: 'undirected' },
] as const satisfies ReadonlyArray<{
  id: string;
  directionality: RelationDirectionality;
}>;

export type RelationTypeId = typeof RELATION_TYPE_DEFINITIONS[number]['id'];

export interface CreateRelationInput {
  from_item_id: string;
  to_item_id: string;
  relation_type: RelationTypeId;
  note?: string | null;
  created_by?: string;
  origin_purpose_id?: string | null;
}

export interface ListRelationsInput {
  item_id?: string;
  purpose_id?: string;
  status?: RelationStatus | 'all';
}

export interface ReaffirmRelationOptions {
  faultInjector?: (point: RelationReaffirmFaultPoint) => void;
}

interface RelationEndpointRow {
  id: string;
  user_id: string;
  plain_text: string;
  item_type: string | null;
  topic: string | null;
  status: 'active' | 'retired';
  retired_into_item_id: string | null;
  updated_at: string;
}

interface RelationRow {
  id: string;
  user_id: string;
  from_item_id: string;
  to_item_id: string;
  relation_type: string;
  directionality: RelationDirectionality;
  from_snapshot_id: string;
  to_snapshot_id: string;
  note: string | null;
  created_by: string;
  origin_purpose_id: string | null;
  status: RelationStatus;
  created_at: string;
  updated_at: string;
  affirmed_at: string;
  from_snapshot_item_id: string;
  from_snapshot_user_id: string;
  from_snapshot_content: string;
  from_snapshot_content_hash: string;
  from_snapshot_created_at: string;
  to_snapshot_item_id: string;
  to_snapshot_user_id: string;
  to_snapshot_content: string;
  to_snapshot_content_hash: string;
  to_snapshot_created_at: string;
  from_item_plain_text: string;
  from_item_type: string | null;
  from_item_topic: string | null;
  from_item_status: 'active' | 'retired';
  from_item_retired_into: string | null;
  from_item_updated_at: string;
  to_item_plain_text: string;
  to_item_type: string | null;
  to_item_topic: string | null;
  to_item_status: 'active' | 'retired';
  to_item_retired_into: string | null;
  to_item_updated_at: string;
  visible_origin_purpose_id: string | null;
  latest_assessment_id: string | null;
  latest_assessment_verdict: RelationAssessmentVerdict | null;
  latest_assessment_model_key: string | null;
  latest_assessment_created_at: string | null;
}

interface RelationIdentityRow {
  id: string;
  user_id: string;
  from_item_id: string;
  to_item_id: string;
  status: RelationStatus;
}

interface RelationAssessmentRow {
  id: string;
  relation_id: string;
  user_id: string;
  verdict: RelationAssessmentVerdict;
  model_key: string;
  created_at: string;
}

const RELATION_SELECT = `
  SELECT
    r.*,
    fs.item_id AS from_snapshot_item_id,
    fs.user_id AS from_snapshot_user_id,
    fs.content AS from_snapshot_content,
    fs.content_hash AS from_snapshot_content_hash,
    fs.created_at AS from_snapshot_created_at,
    ts.item_id AS to_snapshot_item_id,
    ts.user_id AS to_snapshot_user_id,
    ts.content AS to_snapshot_content,
    ts.content_hash AS to_snapshot_content_hash,
    ts.created_at AS to_snapshot_created_at,
    fi.plain_text AS from_item_plain_text,
    fi.item_type AS from_item_type,
    fi.topic AS from_item_topic,
    fi.status AS from_item_status,
    fi.retired_into_item_id AS from_item_retired_into,
    fi.updated_at AS from_item_updated_at,
    ti.plain_text AS to_item_plain_text,
    ti.item_type AS to_item_type,
    ti.topic AS to_item_topic,
    ti.status AS to_item_status,
    ti.retired_into_item_id AS to_item_retired_into,
    ti.updated_at AS to_item_updated_at,
    CASE WHEN op.user_id = r.user_id THEN r.origin_purpose_id ELSE NULL END
      AS visible_origin_purpose_id,
    la.id AS latest_assessment_id,
    la.verdict AS latest_assessment_verdict,
    la.model_key AS latest_assessment_model_key,
    la.created_at AS latest_assessment_created_at
  FROM relations r
  JOIN item_snapshots fs
    ON fs.id = r.from_snapshot_id
   AND fs.item_id = r.from_item_id
   AND fs.user_id = r.user_id
  JOIN item_snapshots ts
    ON ts.id = r.to_snapshot_id
   AND ts.item_id = r.to_item_id
   AND ts.user_id = r.user_id
  JOIN items fi
    ON fi.id = r.from_item_id
   AND fi.user_id = r.user_id
  JOIN items ti
    ON ti.id = r.to_item_id
   AND ti.user_id = r.user_id
  LEFT JOIN purposes op ON op.id = r.origin_purpose_id
  LEFT JOIN relation_assessments la
    ON la.id = (
      SELECT candidate.id
      FROM relation_assessments candidate
      WHERE candidate.relation_id = r.id
        AND candidate.user_id = r.user_id
      ORDER BY candidate.created_at DESC, candidate.id ASC
      LIMIT 1
    )
`;

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function relationTypeDefinition(relationType: string) {
  const definition = RELATION_TYPE_DEFINITIONS.find((entry) => entry.id === relationType);
  if (!definition) throw new AppError(400, 'Unsupported Relation type');
  return definition;
}

function ownedEndpoint(
  db: Database.Database,
  userId: string,
  itemId: string,
  requireActive: boolean,
): RelationEndpointRow {
  const row = db.prepare(`
    SELECT id, user_id, plain_text, item_type, topic, status,
           retired_into_item_id, updated_at
    FROM items
    WHERE id = ? AND user_id = ?
  `).get(itemId, userId) as RelationEndpointRow | undefined;
  if (!row) throw new AppError(404, 'Relation endpoint Item not found');
  if (requireActive && row.status !== 'active') {
    throw new AppError(409, 'Relation commands require active Item endpoints');
  }
  return row;
}

function ownedOriginPurpose(
  db: Database.Database,
  userId: string,
  purposeId: string | null,
): string | null {
  if (!purposeId) return null;
  const row = db.prepare('SELECT id FROM purposes WHERE id = ? AND user_id = ?')
    .get(purposeId, userId) as { id: string } | undefined;
  if (!row) throw new AppError(404, 'Origin Purpose not found');
  return row.id;
}

function normalizeEndpoints(
  fromItemId: string,
  toItemId: string,
  directionality: RelationDirectionality,
) {
  if (fromItemId === toItemId) {
    throw new AppError(400, 'A Relation cannot connect an Item to itself');
  }
  if (directionality === 'undirected' && fromItemId > toItemId) {
    return { fromItemId: toItemId, toItemId: fromItemId };
  }
  return { fromItemId, toItemId };
}

export function deriveRelationFreshness(input: {
  from_item_plain_text: string;
  to_item_plain_text: string;
  from_snapshot_content_hash: string;
  to_snapshot_content_hash: string;
}): {
  freshness: RelationFreshness;
  fromChanged: boolean;
  toChanged: boolean;
} {
  const fromChanged = itemContentHash(input.from_item_plain_text) !== input.from_snapshot_content_hash;
  const toChanged = itemContentHash(input.to_item_plain_text) !== input.to_snapshot_content_hash;
  const freshness: RelationFreshness = fromChanged && toChanged
    ? 'both_changed'
    : fromChanged
      ? 'from_changed'
      : toChanged
        ? 'to_changed'
        : 'fresh';
  return { freshness, fromChanged, toChanged };
}

function inspectionCheckpointAt(affirmedAt: string, assessmentAt: string | null): string {
  return assessmentAt && assessmentAt > affirmedAt ? assessmentAt : affirmedAt;
}

function hydrateRelation(row: RelationRow) {
  const freshness = deriveRelationFreshness(row);
  return {
    id: row.id,
    user_id: row.user_id,
    from_item_id: row.from_item_id,
    to_item_id: row.to_item_id,
    relation_type: row.relation_type,
    directionality: row.directionality,
    from_snapshot_id: row.from_snapshot_id,
    to_snapshot_id: row.to_snapshot_id,
    note: row.note,
    created_by: row.created_by,
    origin_purpose_id: row.visible_origin_purpose_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    affirmed_at: row.affirmed_at,
    freshness: freshness.freshness,
    from_changed: freshness.fromChanged,
    to_changed: freshness.toChanged,
    inspection_checkpoint_at: inspectionCheckpointAt(
      row.affirmed_at,
      row.latest_assessment_created_at,
    ),
    latest_assessment: row.latest_assessment_id ? {
      id: row.latest_assessment_id,
      relation_id: row.id,
      user_id: row.user_id,
      verdict: row.latest_assessment_verdict,
      model_key: row.latest_assessment_model_key,
      created_at: row.latest_assessment_created_at,
    } : null,
    from_snapshot: {
      id: row.from_snapshot_id,
      item_id: row.from_snapshot_item_id,
      user_id: row.from_snapshot_user_id,
      content: row.from_snapshot_content,
      content_hash: row.from_snapshot_content_hash,
      created_at: row.from_snapshot_created_at,
    },
    to_snapshot: {
      id: row.to_snapshot_id,
      item_id: row.to_snapshot_item_id,
      user_id: row.to_snapshot_user_id,
      content: row.to_snapshot_content,
      content_hash: row.to_snapshot_content_hash,
      created_at: row.to_snapshot_created_at,
    },
    from_item: {
      id: row.from_item_id,
      plain_text: row.from_item_plain_text,
      item_type: row.from_item_type,
      topic: row.from_item_topic,
      status: row.from_item_status,
      retired_into_item_id: row.from_item_retired_into,
      updated_at: row.from_item_updated_at,
    },
    to_item: {
      id: row.to_item_id,
      plain_text: row.to_item_plain_text,
      item_type: row.to_item_type,
      topic: row.to_item_topic,
      status: row.to_item_status,
      retired_into_item_id: row.to_item_retired_into,
      updated_at: row.to_item_updated_at,
    },
  };
}

function getRelationIdentityRow(
  db: Database.Database,
  userId: string,
  relationId: string,
): RelationIdentityRow {
  const row = db.prepare(`
    SELECT id, user_id, from_item_id, to_item_id, status
    FROM relations
    WHERE id = ? AND user_id = ?
  `).get(relationId, userId) as RelationIdentityRow | undefined;
  if (!row) throw new AppError(404, 'Relation not found');
  return row;
}

function listRelationRows(
  db: Database.Database,
  userId: string,
  where: string,
  params: unknown[],
): RelationRow[] {
  return db.prepare(`
    ${RELATION_SELECT}
    WHERE r.user_id = ?
      AND ${where}
    ORDER BY r.created_at DESC, r.id ASC
  `).all(userId, ...params) as RelationRow[];
}

function relationStatusClause(status: RelationStatus | 'all' | undefined) {
  if (!status || status === 'active') return { sql: "r.status = 'active'", params: [] as unknown[] };
  if (status === 'revoked') return { sql: "r.status = 'revoked'", params: [] as unknown[] };
  return { sql: '1 = 1', params: [] as unknown[] };
}

export function listRelationTypes() {
  return RELATION_TYPE_DEFINITIONS.map((entry) => ({ ...entry }));
}

export function getRelation(
  db: Database.Database,
  userId: string,
  relationId: string,
) {
  const row = db.prepare(`
    ${RELATION_SELECT}
    WHERE r.id = ? AND r.user_id = ?
  `).get(relationId, userId) as RelationRow | undefined;
  if (!row) throw new AppError(404, 'Relation not found');
  return hydrateRelation(row);
}

export function createRelation(
  db: Database.Database,
  userId: string,
  input: CreateRelationInput,
) {
  const definition = relationTypeDefinition(input.relation_type);
  const endpoints = normalizeEndpoints(
    input.from_item_id,
    input.to_item_id,
    definition.directionality,
  );

  return db.transaction(() => {
    ownedEndpoint(db, userId, endpoints.fromItemId, true);
    ownedEndpoint(db, userId, endpoints.toItemId, true);
    const originPurposeId = ownedOriginPurpose(db, userId, optionalText(input.origin_purpose_id));
    const existing = db.prepare(`
      SELECT id
      FROM relations
      WHERE user_id = ?
        AND from_item_id = ?
        AND to_item_id = ?
        AND relation_type = ?
        AND status = 'active'
      LIMIT 1
    `).get(userId, endpoints.fromItemId, endpoints.toItemId, definition.id) as { id: string } | undefined;
    if (existing) {
      throw new AppError(
        409,
        'An active Relation already exists for this Item pair and type',
        { code: 'active_relation_exists', relation_id: existing.id },
      );
    }

    const fromSnapshot = ensureCurrentItemSnapshot(db, userId, endpoints.fromItemId);
    const toSnapshot = ensureCurrentItemSnapshot(db, userId, endpoints.toItemId);
    const relationId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO relations (
        id, user_id, from_item_id, to_item_id, relation_type, directionality,
        from_snapshot_id, to_snapshot_id, note, created_by, origin_purpose_id,
        status, created_at, updated_at, affirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      relationId,
      userId,
      endpoints.fromItemId,
      endpoints.toItemId,
      definition.id,
      definition.directionality,
      fromSnapshot.id,
      toSnapshot.id,
      optionalText(input.note),
      optionalText(input.created_by) || 'human',
      originPurposeId,
      now,
      now,
      now,
    );
    return getRelation(db, userId, relationId);
  })();
}

export function listRelations(
  db: Database.Database,
  userId: string,
  input: ListRelationsInput,
) {
  const hasItem = Boolean(optionalText(input.item_id));
  const hasPurpose = Boolean(optionalText(input.purpose_id));
  if (hasItem === hasPurpose) {
    throw new AppError(400, 'Exactly one Relation scope is required');
  }
  const status = relationStatusClause(input.status);

  if (hasItem) {
    const itemId = optionalText(input.item_id)!;
    ownedEndpoint(db, userId, itemId, false);
    return listRelationRows(
      db,
      userId,
      `(r.from_item_id = ? OR r.to_item_id = ?) AND ${status.sql}`,
      [itemId, itemId, ...status.params],
    ).map(hydrateRelation);
  }

  const purposeId = optionalText(input.purpose_id)!;
  const scope = getPurposeCompiledScope(db, userId, purposeId);
  const itemIds = scope.items
    .map((entry) => (entry.item as { id?: unknown }).id)
    .filter((itemId): itemId is string => typeof itemId === 'string' && itemId.length > 0);
  if (itemIds.length === 0) return [];
  if (itemIds.length > 30_000) throw new AppError(413, 'Purpose Item scope is too large to inspect');
  const scopeValues = itemIds.map(() => '(?)').join(', ');
  const rows = db.prepare(`
    WITH scope(item_id) AS (VALUES ${scopeValues})
    ${RELATION_SELECT}
    WHERE r.user_id = ?
      AND EXISTS (SELECT 1 FROM scope WHERE scope.item_id = r.from_item_id)
      AND EXISTS (SELECT 1 FROM scope WHERE scope.item_id = r.to_item_id)
      AND ${status.sql}
    ORDER BY r.created_at DESC, r.id ASC
  `).all(...itemIds, userId, ...status.params) as RelationRow[];
  return rows.map(hydrateRelation);
}

export function revokeRelation(
  db: Database.Database,
  userId: string,
  relationId: string,
) {
  return db.transaction(() => {
    const row = getRelationIdentityRow(db, userId, relationId);
    if (row.status === 'revoked') throw new AppError(409, 'Relation is already revoked');
    db.prepare(`
      UPDATE relations
      SET status = 'revoked', updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(new Date().toISOString(), relationId, userId);
    return getRelation(db, userId, relationId);
  })();
}

export function reaffirmRelation(
  db: Database.Database,
  userId: string,
  relationId: string,
  options: ReaffirmRelationOptions = {},
) {
  return db.transaction(() => {
    const relation = getRelationIdentityRow(db, userId, relationId);
    if (relation.status !== 'active') throw new AppError(409, 'Only an active Relation can be reaffirmed');
    ownedEndpoint(db, userId, relation.from_item_id, true);
    ownedEndpoint(db, userId, relation.to_item_id, true);

    const fromSnapshot = ensureCurrentItemSnapshot(db, userId, relation.from_item_id);
    options.faultInjector?.('after_from_snapshot');
    const toSnapshot = ensureCurrentItemSnapshot(db, userId, relation.to_item_id);
    options.faultInjector?.('after_to_snapshot');

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE relations
      SET from_snapshot_id = ?, to_snapshot_id = ?, affirmed_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND status = 'active'
    `).run(fromSnapshot.id, toSnapshot.id, now, now, relationId, userId);
    options.faultInjector?.('after_relation_update');
    options.faultInjector?.('before_commit');
    return getRelation(db, userId, relationId);
  })();
}

export function listRelationAssessments(
  db: Database.Database,
  userId: string,
  relationId: string,
) {
  getRelationIdentityRow(db, userId, relationId);
  return db.prepare(`
    SELECT id, relation_id, user_id, verdict, model_key, created_at
    FROM relation_assessments
    WHERE relation_id = ? AND user_id = ?
    ORDER BY created_at DESC, id ASC
  `).all(relationId, userId) as RelationAssessmentRow[];
}
