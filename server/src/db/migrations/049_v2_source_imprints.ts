import type Database from 'better-sqlite3';

function assertTable(db: Database.Database, tableName: string): void {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(tableName);
  if (!row) throw new Error(`Migration 049 failed to create ${tableName}`);
}

export default {
  id: '049_v2_source_imprints',
  description: 'Add Source imprint birth certificates and anchored fragment storage',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS source_imprints (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_file_id TEXT NOT NULL REFERENCES source_files(id) ON DELETE CASCADE,
        transcriber_name TEXT NOT NULL,
        transcriber_version TEXT NOT NULL,
        transcriber_lockfile TEXT NOT NULL,
        anchor_fidelity TEXT NOT NULL
          CHECK (anchor_fidelity IN (
            'region', 'block', 'page', 'char', 'element', 'section', 'cell'
          )),
        text_normalization TEXT NOT NULL
          CHECK (text_normalization IN ('none', 'punctuation', 'whitespace')),
        fragment_count INTEGER NOT NULL CHECK (fragment_count >= 0),
        warnings_json TEXT NOT NULL DEFAULT '[]'
          CHECK (json_valid(warnings_json) AND json_type(warnings_json) = 'array'),
        status TEXT NOT NULL CHECK (status IN ('accepted', 'rejected')),
        rejection_reasons_json TEXT NOT NULL DEFAULT '[]'
          CHECK (
            json_valid(rejection_reasons_json)
            AND json_type(rejection_reasons_json) = 'array'
          ),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CHECK (
          (status = 'accepted' AND json_array_length(rejection_reasons_json) = 0)
          OR
          (status = 'rejected' AND json_array_length(rejection_reasons_json) > 0)
        )
      );

      CREATE INDEX IF NOT EXISTS idx_source_imprints_user_created
        ON source_imprints(user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_source_imprints_source_file_created
        ON source_imprints(source_file_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS imprint_fragments (
        id TEXT PRIMARY KEY,
        imprint_id TEXT NOT NULL REFERENCES source_imprints(id) ON DELETE CASCADE,
        seq INTEGER NOT NULL CHECK (seq >= 0),
        text TEXT NOT NULL CHECK (length(text) > 0),
        role TEXT NOT NULL CHECK (role IN (
          'heading', 'para', 'list_item', 'table_row', 'cell',
          'slide_shape', 'caption', 'code_line', 'footnote', 'blank'
        )),
        anchor_json TEXT NOT NULL CHECK (
          json_valid(anchor_json)
          AND json_type(anchor_json) = 'object'
          AND json_extract(anchor_json, '$.family')
            IN ('page', 'flow', 'table', 'slide', 'time')
        ),
        style_json TEXT CHECK (
          style_json IS NULL
          OR (json_valid(style_json) AND json_type(style_json) = 'object')
        ),
        lang TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_imprint_fragments_imprint_seq
        ON imprint_fragments(imprint_id, seq);
    `);

    assertTable(db, 'source_imprints');
    assertTable(db, 'imprint_fragments');
  },
};
