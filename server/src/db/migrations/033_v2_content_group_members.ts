import type Database from 'better-sqlite3';

function safeJsonParse(value: string | null): any[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stringifyJson(value: unknown, fallback: unknown): string {
  return JSON.stringify(value ?? fallback);
}

export default {
  id: '033_v2_content_group_members',
  description: 'Add v2 ContentGroupMember entity table',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS content_group_members (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content_group_id TEXT NOT NULL REFERENCES content_groups(id) ON DELETE CASCADE,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,

        kind TEXT NOT NULL,
        target_id TEXT,
        label TEXT,

        current_content TEXT,
        preview_text TEXT,

        content_range_json TEXT,
        source_ref_json TEXT,
        source_sync_status TEXT NOT NULL DEFAULT 'fresh',

        order_index INTEGER NOT NULL DEFAULT 0,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_content_group_members_group_order
        ON content_group_members(user_id, content_group_id, order_index);
      CREATE INDEX IF NOT EXISTS idx_content_group_members_course_note
        ON content_group_members(user_id, course_id, note_id);
      CREATE INDEX IF NOT EXISTS idx_content_group_members_target
        ON content_group_members(user_id, kind, target_id);
      CREATE INDEX IF NOT EXISTS idx_content_group_members_source_status
        ON content_group_members(user_id, source_sync_status);
    `);

    const groups = db.prepare(`
      SELECT id, user_id, course_id, note_id, members_json
      FROM content_groups
      WHERE members_json IS NOT NULL AND members_json != '[]'
    `).all() as Array<{
      id: string;
      user_id: string;
      course_id: string;
      note_id: string | null;
      members_json: string;
    }>;

    const insertMember = db.prepare(`
      INSERT OR IGNORE INTO content_group_members (
        id, user_id, content_group_id, course_id, note_id,
        kind, target_id, label, current_content, preview_text,
        content_range_json, source_ref_json, source_sync_status,
        order_index, metadata, created_at, updated_at
      )
      VALUES (
        @id, @user_id, @content_group_id, @course_id, @note_id,
        @kind, @target_id, @label, @current_content, @preview_text,
        @content_range_json, @source_ref_json, @source_sync_status,
        @order_index, @metadata, datetime('now'), datetime('now')
      )
    `);

    const clearLegacyMembers = db.prepare(`
      UPDATE content_groups
      SET members_json = '[]'
      WHERE id = ?
    `);

    const backfill = db.transaction(() => {
      for (const group of groups) {
        safeJsonParse(group.members_json).forEach((member, index) => {
          if (!member || typeof member !== 'object') return;
          const memberId = typeof member.id === 'string' && member.id.trim()
            ? member.id.trim()
            : `${group.id}-member-${index}`;
          insertMember.run({
            id: memberId,
            user_id: group.user_id,
            content_group_id: group.id,
            course_id: group.course_id,
            note_id: group.note_id,
            kind: typeof member.kind === 'string' && member.kind.trim() ? member.kind.trim() : 'content_range',
            target_id: typeof member.target_id === 'string' ? member.target_id : null,
            label: typeof member.label === 'string' ? member.label : null,
            current_content: typeof member.current_content === 'string' ? member.current_content : null,
            preview_text: typeof member.preview_text === 'string' ? member.preview_text : null,
            content_range_json: member.content_range ? stringifyJson(member.content_range, null) : null,
            source_ref_json: member.source_ref ? stringifyJson(member.source_ref, null) : null,
            source_sync_status: typeof member.source_sync_status === 'string' ? member.source_sync_status : 'fresh',
            order_index: Number.isFinite(member.order_index) ? Math.trunc(member.order_index) : index,
            metadata: stringifyJson(member.metadata, {}),
          });
        });
        clearLegacyMembers.run(group.id);
      }
    });

    backfill();
  },
};
