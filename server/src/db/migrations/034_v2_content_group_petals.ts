import type Database from 'better-sqlite3';

function safeJsonArray(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function integerOrDefault(value: unknown, fallback: number): number {
  return Number.isFinite(value) ? Math.trunc(value as number) : fallback;
}

export default {
  id: '034_v2_content_group_petals',
  description: 'Add v2 ContentGroupFragment and ContentGroupPetal entity tables',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_group_fragments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        source_member_id TEXT NOT NULL REFERENCES content_group_members(id) ON DELETE CASCADE,
        content_range_json TEXT,
        label TEXT,
        preview_text TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_content_group_fragments_group_order
        ON content_group_fragments(user_id, content_group_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_content_group_fragments_source_member
        ON content_group_fragments(user_id, source_member_id);
      CREATE INDEX IF NOT EXISTS idx_content_group_fragments_course_note
        ON content_group_fragments(user_id, course_id, note_id);

      CREATE TABLE IF NOT EXISTS content_group_petals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
        label TEXT NOT NULL,
        role TEXT,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        order_index INTEGER NOT NULL DEFAULT 0,
        members_json TEXT NOT NULL DEFAULT '[]',
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_content_group_petals_group_order
        ON content_group_petals(user_id, content_group_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_content_group_petals_course_note
        ON content_group_petals(user_id, course_id, note_id);

      CREATE TABLE IF NOT EXISTS content_group_petal_fragments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
        petal_id TEXT NOT NULL REFERENCES content_group_petals(id) ON DELETE CASCADE,
        fragment_id TEXT NOT NULL REFERENCES content_group_fragments(id) ON DELETE CASCADE,
        order_index INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, petal_id, fragment_id)
      );

      CREATE INDEX IF NOT EXISTS idx_content_group_petal_fragments_petal_order
        ON content_group_petal_fragments(user_id, petal_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_content_group_petal_fragments_fragment
        ON content_group_petal_fragments(user_id, fragment_id);
    `);

    const groups = db.prepare(`
      SELECT id, user_id, course_id, note_id, fragments_json, petals_json
      FROM content_groups
      WHERE (fragments_json IS NOT NULL AND fragments_json != '[]')
         OR (petals_json IS NOT NULL AND petals_json != '[]')
    `).all() as Array<{
      id: string;
      user_id: string;
      course_id: string;
      note_id: string | null;
      fragments_json: string | null;
      petals_json: string | null;
    }>;

    const insertFragment = db.prepare(`
      INSERT OR IGNORE INTO content_group_fragments (
        id, user_id, content_group_id, course_id, note_id,
        source_member_id, content_range_json, label, preview_text,
        status, order_index, metadata, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @content_group_id, @course_id, @note_id,
        @source_member_id, @content_range_json, @label, @preview_text,
        @status, @order_index, @metadata, datetime('now'), datetime('now')
      )
    `);

    const insertPetal = db.prepare(`
      INSERT OR IGNORE INTO content_group_petals (
        id, user_id, content_group_id, course_id, note_id,
        label, role, summary, status, order_index, members_json, metadata,
        created_at, updated_at
      )
      VALUES (
        @id, @user_id, @content_group_id, @course_id, @note_id,
        @label, @role, @summary, @status, @order_index, @members_json, @metadata,
        datetime('now'), datetime('now')
      )
    `);

    const insertAssignment = db.prepare(`
      INSERT OR IGNORE INTO content_group_petal_fragments (
        id, user_id, content_group_id, petal_id, fragment_id, order_index, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @content_group_id, @petal_id, @fragment_id, @order_index,
        datetime('now'), datetime('now')
      )
    `);

    const clearLegacy = db.prepare(`
      UPDATE content_groups
      SET fragments_json = '[]', petals_json = '[]'
      WHERE id = ?
    `);

    const backfill = db.transaction(() => {
      for (const group of groups) {
        const memberIds = new Set(
          (db.prepare(`
            SELECT id
            FROM content_group_members
            WHERE user_id = ? AND content_group_id = ?
          `).all(group.user_id, group.id) as Array<{ id: string }>).map((row) => row.id),
        );
        const fragmentIds = new Set<string>();

        safeJsonArray(group.fragments_json).forEach((fragment, index) => {
          if (!fragment || typeof fragment !== 'object') return;
          const fragmentId = textOrNull(fragment.id) ?? `${group.id}-fragment-${index}`;
          const sourceMemberId = textOrNull(fragment.source_member_id);
          if (!sourceMemberId || !memberIds.has(sourceMemberId)) return;
          fragmentIds.add(fragmentId);
          insertFragment.run({
            id: fragmentId,
            user_id: group.user_id,
            content_group_id: group.id,
            course_id: group.course_id,
            note_id: group.note_id,
            source_member_id: sourceMemberId,
            content_range_json: fragment.content_range ? stringifyJson(fragment.content_range, null) : null,
            label: textOrNull(fragment.label),
            preview_text: typeof fragment.preview_text === 'string' ? fragment.preview_text : null,
            status: textOrNull(fragment.status) ?? 'active',
            order_index: integerOrDefault(fragment.order_index, index),
            metadata: stringifyJson(safeJsonObject(fragment.metadata), {}),
          });
        });

        safeJsonArray(group.petals_json).forEach((petal, index) => {
          if (!petal || typeof petal !== 'object') return;
          const incomingFragmentIds = Array.isArray(petal.fragment_ids)
            ? petal.fragment_ids.filter((fragmentId: unknown) => typeof fragmentId === 'string')
            : [];
          if (incomingFragmentIds.some((fragmentId: string) => !fragmentIds.has(fragmentId))) return;

          const petalId = textOrNull(petal.id) ?? `${group.id}-petal-${index}`;
          const metadata = safeJsonObject(petal.metadata);
          insertPetal.run({
            id: petalId,
            user_id: group.user_id,
            content_group_id: group.id,
            course_id: group.course_id,
            note_id: group.note_id,
            label: textOrNull(petal.label) ?? `Petal ${index + 1}`,
            role: textOrNull((metadata as any).role),
            summary: textOrNull((metadata as any).summary),
            status: textOrNull(petal.status) ?? 'active',
            order_index: integerOrDefault(petal.order_index, index),
            members_json: stringifyJson(Array.isArray(petal.members) ? petal.members : [], []),
            metadata: stringifyJson(metadata, {}),
          });

          incomingFragmentIds.forEach((fragmentId: string, fragmentIndex: number) => {
            insertAssignment.run({
              id: `${petalId}::${fragmentId}`,
              user_id: group.user_id,
              content_group_id: group.id,
              petal_id: petalId,
              fragment_id: fragmentId,
              order_index: fragmentIndex,
            });
          });
        });

        clearLegacy.run(group.id);
      }
    });

    backfill();
  },
};
