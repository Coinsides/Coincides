import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

interface LegacyBoard {
  id: string;
  user_id: string;
  title: string;
  project_id: string | null;
  item_id: string | null;
}

export default {
  id: '065_v13_board_item_identity',
  description: 'Bridge boards to unique Item identities with honest, atomic backfill receipts',
  up(db: Database.Database): void {
    const columns = db.pragma('table_info(boards)') as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'item_id')) {
      db.exec('ALTER TABLE boards ADD COLUMN item_id TEXT REFERENCES items(id) ON DELETE NO ACTION');
    }
    // Migration-owned: initDb executes base schema before upgrading existing tables.
    // NO ACTION prevents deleting a live identity, while permitting an account's
    // existing whole-user cascades to remove both rows within the same statement.
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_item ON boards(item_id)');

    const boardIds = db.prepare('SELECT id FROM boards WHERE item_id IS NULL ORDER BY id')
      .all() as Array<{ id: string }>;
    for (const { id: boardId } of boardIds) {
      // One board = one atomic unit even when up() is called directly. The normal
      // runner adds its outer migration transaction; these then become savepoints.
      db.transaction(() => {
        const board = db.prepare('SELECT id, user_id, title, project_id, item_id FROM boards WHERE id = ?')
          .get(boardId) as LegacyBoard | undefined;
        if (!board || board.item_id !== null) return;
        const itemId = uuidv4();
        const now = new Date().toISOString();
        const plainText = `Board: ${board.title}`.replace(/\r\n?/g, '\n').trim();
        // Frozen initial TextFlow/Snapshot format; no dependency on future service writers.
        const body = {
          body: plainText,
          text_flow: {
            textflow_version: 'TextBlockContentV1',
            units: [{
              id: `${itemId}:text-unit:1`, text: plainText, writing_role: 'paragraph',
              indent_level: 0, order_index: 0, metadata: { owner_kind: 'item' }, status: 'active',
            }],
            inline_structures: [],
            metadata: { owner_kind: 'item' },
          },
        };
        const metadata = { board_identity: {
          board_id: board.id, minted_by: 'migration_065', minted_at: now,
          title_at_mint: board.title, project_id_at_mint: board.project_id,
        } };
        db.prepare(`INSERT INTO items (
          id, user_id, body_json, plain_text, item_type, topic, status, retired_into_item_id,
          origin_course_id, origin_note_id, origin_board_id, created_by, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, NULL, 'active', NULL, ?, NULL, NULL, 'system:board-identity', ?, ?, ?)`)
          .run(itemId, board.user_id, JSON.stringify(body), plainText, board.project_id, JSON.stringify(metadata), now, now);
        const hash = `sha256:${createHash('sha256').update(plainText).digest('hex')}`;
        db.prepare(`INSERT INTO item_snapshots (id, item_id, user_id, content, content_hash, created_at)
          VALUES (?, ?, ?, ?, ?, ?)`)
          .run(uuidv4(), itemId, board.user_id, plainText, hash, now);
        db.prepare('UPDATE boards SET item_id = ? WHERE id = ? AND item_id IS NULL').run(itemId, board.id);
        // Board ID/title/project/timestamps and all prior judgments are untouched.
        // The Item metadata above is the retained per-board backfill ledger.
      })();
    }
  },
};
