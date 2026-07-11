import type Database from 'better-sqlite3';
import { AppError } from '../middleware/errorHandler.js';

const SOURCE_PROJECTION_KIND = 'source_projection';

interface OwnedNoteKindRow {
  note_class: string | null;
  source_kind: string | null;
}

interface OwnedBlockKindRow {
  source_kind: string | null;
}

function readOnlyError(operation: string): AppError {
  return new AppError(409, 'Source projection content is read-only', {
    code: 'source_projection_read_only',
    operation,
  });
}

function isSourceProjectionNote(row: OwnedNoteKindRow): boolean {
  return row.note_class === SOURCE_PROJECTION_KIND || row.source_kind === SOURCE_PROJECTION_KIND;
}

export function assertSourceProjectionNoteContentWriteAllowed(
  db: Database.Database,
  userId: string,
  noteId: string,
  operation: string,
): void {
  const row = db.prepare(`
    SELECT note_class, source_kind
    FROM notes
    WHERE id = ? AND user_id = ?
  `).get(noteId, userId) as OwnedNoteKindRow | undefined;
  if (row && isSourceProjectionNote(row)) throw readOnlyError(operation);
}

export function assertSourceProjectionNoteUpdateAllowed(
  db: Database.Database,
  userId: string,
  noteId: string,
  update: {
    title?: unknown;
    description?: unknown;
    page_format?: unknown;
    status?: unknown;
  },
): void {
  const changesContentIdentity = update.title !== undefined
    || update.description !== undefined
    || update.page_format !== undefined
    || update.status !== undefined;
  if (changesContentIdentity) {
    assertSourceProjectionNoteContentWriteAllowed(db, userId, noteId, 'update_note_content');
  }
}

export function assertSourceProjectionBlockContentWriteAllowed(
  db: Database.Database,
  userId: string,
  blockId: string,
  operation: string,
): void {
  const row = db.prepare(`
    SELECT source_kind
    FROM note_blocks
    WHERE id = ? AND user_id = ?
  `).get(blockId, userId) as OwnedBlockKindRow | undefined;
  if (row?.source_kind === SOURCE_PROJECTION_KIND) throw readOnlyError(operation);
}

export function legacyScannerBlockPredicate(alias?: string): string {
  if (alias !== undefined && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new Error(`Unsafe SQL alias: ${alias}`);
  }
  const column = alias ? `${alias}.source_kind` : 'source_kind';
  return `COALESCE(${column}, 'manual') != '${SOURCE_PROJECTION_KIND}'`;
}
