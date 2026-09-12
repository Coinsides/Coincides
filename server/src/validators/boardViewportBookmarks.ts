import { z } from 'zod';
import { boardViewportSchema } from './boards.js';

// Mirrored in shared/types/boardViewportBookmarks.ts; server runtime stays local.
export const BOARD_VIEWPORT_BOOKMARK_LIMIT = 24;
export const BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT = 32;
const bookmarkNameSchema = z.string().trim().min(1).max(BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT);

export const createBoardViewportBookmarkSchema = boardViewportSchema.extend({ name: bookmarkNameSchema }).strict();
export const renameBoardViewportBookmarkSchema = z.object({ name: bookmarkNameSchema }).strict();
