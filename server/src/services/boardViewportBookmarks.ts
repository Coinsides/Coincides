import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { BoardViewportBookmark } from '../../../shared/types/boardViewportBookmarks.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  BOARD_VIEWPORT_BOOKMARK_LIMIT,
  createBoardViewportBookmarkSchema,
  renameBoardViewportBookmarkSchema,
} from '../validators/boardViewportBookmarks.js';

function requireBoard(db: Database.Database, userId: string, boardId: string): void {
  if (!db.prepare('SELECT id FROM boards WHERE id = ? AND user_id = ?').get(boardId, userId)) {
    throw new AppError(404, 'board_not_found');
  }
}

function requireTransaction(db: Database.Database): void {
  if (!db.inTransaction) throw new Error('Board viewport bookmark writes require a caller-owned transaction');
}

export function listBoardViewportBookmarks(db: Database.Database, userId: string, boardId: string): BoardViewportBookmark[] {
  requireBoard(db, userId, boardId);
  // rowid preserves creation order when multiple snapshots share a millisecond.
  return db.prepare(`SELECT id, board_id, user_id, name, x, y, zoom, created_at
    FROM board_viewport_bookmarks WHERE board_id = ? AND user_id = ? ORDER BY created_at, rowid`)
    .all(boardId, userId) as BoardViewportBookmark[];
}

export function createBoardViewportBookmark(
  db: Database.Database, userId: string, boardId: string, value: unknown,
): BoardViewportBookmark {
  requireTransaction(db);
  const input = createBoardViewportBookmarkSchema.parse(value);
  requireBoard(db, userId, boardId);
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM board_viewport_bookmarks WHERE board_id = ? AND user_id = ?')
    .get(boardId, userId) as { count: number };
  if (count >= BOARD_VIEWPORT_BOOKMARK_LIMIT) {
    throw new AppError(409, 'board_viewport_bookmark_limit_reached', { limit: BOARD_VIEWPORT_BOOKMARK_LIMIT });
  }
  const bookmark: BoardViewportBookmark = {
    ...input, id: uuidv4(), board_id: boardId, user_id: userId, created_at: new Date().toISOString(),
  };
  db.prepare(`INSERT INTO board_viewport_bookmarks (id, board_id, user_id, name, x, y, zoom, created_at)
    VALUES (@id, @board_id, @user_id, @name, @x, @y, @zoom, @created_at)`).run(bookmark);
  return bookmark;
}

export function renameBoardViewportBookmark(
  db: Database.Database, userId: string, boardId: string, bookmarkId: string, value: unknown,
): BoardViewportBookmark {
  requireTransaction(db);
  const { name } = renameBoardViewportBookmarkSchema.parse(value);
  requireBoard(db, userId, boardId);
  const bookmark = db.prepare(`SELECT id, board_id, user_id, name, x, y, zoom, created_at
    FROM board_viewport_bookmarks WHERE id = ? AND board_id = ? AND user_id = ?`)
    .get(bookmarkId, boardId, userId) as BoardViewportBookmark | undefined;
  if (!bookmark) throw new AppError(404, 'board_viewport_bookmark_not_found');
  db.prepare('UPDATE board_viewport_bookmarks SET name = ? WHERE id = ? AND board_id = ? AND user_id = ?')
    .run(name, bookmarkId, boardId, userId);
  return { ...bookmark, name };
}

export function deleteBoardViewportBookmark(
  db: Database.Database, userId: string, boardId: string, bookmarkId: string,
): { deleted: boolean } {
  requireTransaction(db);
  requireBoard(db, userId, boardId);
  const result = db.prepare('DELETE FROM board_viewport_bookmarks WHERE id = ? AND board_id = ? AND user_id = ?')
    .run(bookmarkId, boardId, userId);
  return { deleted: result.changes > 0 };
}
