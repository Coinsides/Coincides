import type Database from 'better-sqlite3';

// One row per original page of a Source. Page sizes were never recorded before:
// the projection's frames use fixed A4 layout constants.
export default {
  id: '085_v2_source_pages',
  description: 'Add the Source page register for original page images and page sizes',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE source_pages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_record_id TEXT NOT NULL REFERENCES source_records(id) ON DELETE CASCADE,
        materialization_id TEXT NOT NULL REFERENCES source_materializations(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        pdf_width REAL,
        pdf_height REAL,
        image_asset_id TEXT REFERENCES canvas_assets(id) ON DELETE SET NULL,
        image_width INTEGER,
        image_height INTEGER,
        created_at TEXT NOT NULL,
        UNIQUE (materialization_id, page_number)
      );

      CREATE INDEX idx_source_pages_record ON source_pages(source_record_id, page_number);
      CREATE INDEX idx_source_pages_asset ON source_pages(image_asset_id);
    `);
  },
};
