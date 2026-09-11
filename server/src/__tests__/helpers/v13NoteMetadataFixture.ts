import type Database from 'better-sqlite3';

/** Caller supplies a disposable database and an already-created synthetic user. */
export function seedNoteMetadataFixture(db: Database.Database, userId: string) {
  const id = (suffix: string) => `${userId}-e5-${suffix}`;
  const courseId = id('project');
  const noteId = id('paper');
  const now = '2026-09-11T12:00:00.000Z';
  db.prepare('INSERT INTO courses (id,user_id,name) VALUES (?,?,?)').run(courseId, userId, 'E5 synthetic project');
  for (const [suffix, title] of [['paper', 'E5 cover'], ['empty', 'E5 quiet cover'], ['origin', 'Item birth note'], ['anchor-origin', 'Item anchor note']]) {
    db.prepare('INSERT INTO notes (id,user_id,course_id,title) VALUES (?,?,?,?)').run(id(suffix), userId, courseId, title);
  }
  const block = (suffix: string, paper: string, kind = 'paragraph', content: object = { body: 'Synthetic E5 content' }) => {
    db.prepare('INSERT INTO note_blocks (id,user_id,course_id,block_type,content_json,plain_text) VALUES (?,?,?,?,?,?)')
      .run(id(suffix), userId, courseId, kind, JSON.stringify(content), kind === 'item_ref' ? null : 'Synthetic E5 content');
    db.prepare('INSERT INTO note_block_placements (id,note_id,block_id,order_index) VALUES (?,?,?,?)')
      .run(id(`${suffix}-placement`), id(paper), id(suffix), suffix === 'ref' ? 1 : 0);
  };
  block('body', 'paper');
  block('origin-body', 'anchor-origin');
  for (const [suffix, origin] of [['quoted-item', 'origin'], ['born-item', 'paper'], ['anchored-item', null], ['unrelated-item', null]]) {
    db.prepare('INSERT INTO items (id,user_id,plain_text,origin_note_id) VALUES (?,?,?,?)')
      .run(id(suffix!), userId, `Synthetic ${suffix}`, origin ? id(origin) : null);
  }
  block('ref', 'paper', 'item_ref', { item_id: id('quoted-item') });
  const anchor = (suffix: string, item: string, targetKind: string, target: string, range: object | null) => {
    db.prepare('INSERT INTO item_anchors (id,user_id,item_id,target_kind,target_id,range_json,excerpt) VALUES (?,?,?,?,?,?,?)')
      .run(id(suffix), userId, id(item), targetKind, id(target), range ? JSON.stringify(range) : null, 'Synthetic anchor');
  };
  anchor('quoted-anchor', 'quoted-item', 'block', 'origin-body', null);
  anchor('anchored-1', 'anchored-item', 'block', 'body', null);
  anchor('anchored-2', 'anchored-item', 'content_range', 'body', { block_id: id('body'), start_offset: 0, end_offset: 4 });
  db.prepare('INSERT INTO documents (id,user_id,course_id,filename,file_path,file_type) VALUES (?,?,?,?,?,?)')
    .run(id('document'), userId, courseId, 'E5 source document.txt', 'synthetic-never-read.txt', 'txt');
  db.prepare('INSERT INTO document_chunks (id,document_id,chunk_index,content) VALUES (?,?,0,?)')
    .run(id('chunk'), id('document'), 'Synthetic source');
  db.prepare('INSERT INTO source_records (id,user_id,display_name,origin_course_id) VALUES (?,?,?,?)')
    .run(id('source'), userId, 'E5 global source', courseId);
  db.prepare('INSERT INTO note_block_sources (id,block_id,document_id) VALUES (?,?,?)')
    .run(id('reference-document'), id('body'), id('document'));
  db.prepare('INSERT INTO note_block_sources (id,block_id,document_chunk_id) VALUES (?,?,?)')
    .run(id('reference-chunk'), id('body'), id('chunk'));
  db.prepare('INSERT INTO note_block_sources (id,block_id,source_record_id) VALUES (?,?,?)')
    .run(id('reference-source'), id('body'), id('source'));
  db.prepare('INSERT INTO content_groups (id,user_id,course_id,note_id,title) VALUES (?,?,?,?,?)')
    .run(id('group'), userId, courseId, id('origin'), 'E5 downstream group');
  for (const [index, item] of ['born-item', 'anchored-item', 'unrelated-item'].entries()) {
    db.prepare(`INSERT INTO content_group_members (id,user_id,content_group_id,course_id,kind,item_id,order_index)
      VALUES (?,?,?,?,'item',?,?)`).run(id(`group-member-${index}`), userId, id('group'), courseId, id(item), index);
  }
  for (const suffix of ['board', 'staged-board', 'unmounted-board']) {
    db.prepare('INSERT INTO purposes (id,user_id,course_id,title,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run(id(`${suffix}-soul`), userId, courseId, 'E5 question', now, now);
    db.prepare('INSERT INTO boards (id,user_id,title,soul_id,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run(id(suffix), userId, `E5 ${suffix}`, id(`${suffix}-soul`), now, now);
  }
  for (const suffix of ['board', 'unmounted-board']) {
    db.prepare(`INSERT INTO board_text_ranges (id,user_id,board_id,note_id,block_id,text_flow_id,text_unit_id,excerpt,at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id(`${suffix}-range`), userId, id(suffix), noteId, id('body'), 'synthetic-flow', 'synthetic-unit', 'Synthetic range', now, now, now);
  }
  const member = (suffix: string, board: string, kind: string, target: string, placed = 1) => {
    db.prepare(`INSERT INTO board_members (id,board_id,member_kind,member_id,placed,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?)`).run(id(suffix), id(board), kind, id(target), placed, now, now);
  };
  member('note-card', 'board', 'note', 'paper');
  member('range-card', 'board', 'text_range', 'board-range');
  member('item-card', 'board', 'item', 'anchored-item');
  member('group-card', 'board', 'content_group', 'group');
  member('staged-card', 'staged-board', 'item', 'born-item', 0);
  seedNoteMetadataSourceNavigationFixture(db, userId);
  return { id, userId, courseId, noteId, emptyNoteId: id('empty') };
}

/** Idempotent supplement for an existing isolated E5 fixture. No blob is needed
 * for the legacy parsed-page jump or the materialized projection-note jump. */
export function seedNoteMetadataSourceNavigationFixture(db: Database.Database, userId: string) {
  const id = (suffix: string) => `${userId}-e5-${suffix}`;
  const courseId = id('project');
  const text = 'E5 source navigation evidence. This parsed source page is synthetic and belongs only to the isolated browser fixture.';
  const now = '2026-09-11T12:00:00.000Z';
  if (!db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id('paper'), userId)) {
    throw new Error('E5 synthetic paper must exist before seeding source navigation');
  }
  db.transaction(() => {
    db.prepare(`INSERT OR IGNORE INTO source_snapshots
      (id,user_id,course_id,document_id,title,source_filename,page_count,chunk_count)
      VALUES (?,?,?,?,?,?,1,1)`).run(id('snapshot'), userId, courseId, id('document'), 'E5 parsed source evidence', 'E5 source document.txt');
    db.prepare(`INSERT OR IGNORE INTO source_snapshot_pages
      (id,user_id,course_id,source_snapshot_id,document_id,page_number,page_label,text_content,chunk_ids)
      VALUES (?,?,?,?,?,1,'p.1',?,?)`).run(id('snapshot-page'), userId, courseId, id('snapshot'), id('document'), text, JSON.stringify([id('chunk')]));
    db.prepare('UPDATE document_chunks SET page_start = 1, page_end = 1 WHERE id = ?').run(id('chunk'));
    for (const suffix of ['reference-document', 'reference-chunk']) {
      db.prepare(`UPDATE note_block_sources SET source_page_start = 1, source_page_end = 1, source_excerpt = ?
        WHERE id = ?`).run(text, id(suffix));
      db.prepare(`INSERT OR IGNORE INTO source_anchors
        (id,user_id,course_id,source_snapshot_id,source_snapshot_page_id,document_id,document_chunk_id,
        anchor_kind,page_start,page_end,text_start_offset,text_end_offset,metadata)
        VALUES (?,?,?,?,?,?,?,'note_block_source',1,1,0,?,?)`).run(id(`${suffix}-anchor`), userId, courseId,
        id('snapshot'), id('snapshot-page'), id('document'), suffix === 'reference-chunk' ? id('chunk') : null,
        text.length, JSON.stringify({ note_block_source_id: id(suffix), source_excerpt: text, generated_from: 'note_block_sources' }));
      db.prepare(`INSERT OR IGNORE INTO source_anchor_links
        (id,user_id,course_id,source_anchor_id,target_type,target_id,link_role)
        VALUES (?,?,?,?,'note_block_source',?,'source_reference')`).run(id(`${suffix}-link`), userId, courseId,
        id(`${suffix}-anchor`), id(suffix));
    }
    db.prepare(`INSERT OR IGNORE INTO notes
      (id,user_id,course_id,title,note_class,source_kind,metadata)
      VALUES (?,?,?,?,'source_projection','source_projection',?)`).run(id('source-projection'), userId,
      courseId, 'E5 global source projection', JSON.stringify({ source_projection_version: 'v1', source_record_id: id('source'),
        source_file_id: id('source-file'), source_materialization_id: id('materialization'), content_policy: 'source_locked' }));
    db.prepare(`INSERT OR IGNORE INTO note_blocks (id,user_id,course_id,block_type,plain_text,content_json)
      VALUES (?,?,?,'paragraph',?,?)`).run(id('projection-body'), userId, courseId, text, JSON.stringify({ body: text }));
    db.prepare(`INSERT OR IGNORE INTO note_block_placements (id,note_id,block_id,order_index)
      VALUES (?,?,?,0)`).run(id('projection-placement'), id('source-projection'), id('projection-body'));
    // Staging explicitly signals that this fixture has no raw-file blob. The
    // tested jump uses the retained note, never pretends raw-file viewing passed.
    db.prepare(`INSERT OR IGNORE INTO source_files
      (id,source_record_id,user_id,original_filename,storage_key,storage_state,mime_type,byte_size,content_hash,uploaded_at)
      VALUES (?,?,?,?,?,'staging','text/plain',0,?,?)`).run(id('source-file'), id('source'), userId,
      'E5 synthetic source.txt', 'synthetic-no-raw-blob.txt', id('synthetic-file-hash'), now);
    db.prepare(`INSERT OR IGNORE INTO source_materializations
      (id,source_record_id,source_file_id,user_id,parser_key,parser_version,status,projection_note_id)
      VALUES (?,?,?,?,'synthetic-e5','1','materialized',?)`).run(id('materialization'), id('source'), id('source-file'), userId, id('source-projection'));
  })();
  return { snapshotId: id('snapshot'), pageId: id('snapshot-page'), projectionNoteId: id('source-projection'),
    documentAnchorId: id('reference-document-anchor'), chunkAnchorId: id('reference-chunk-anchor') };
}
