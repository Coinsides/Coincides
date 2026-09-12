export const BOARD_VIEWPORT_BOOKMARK_LIMIT = 24;
export const BOARD_VIEWPORT_BOOKMARK_NAME_LIMIT = 32;

/** A named camera snapshot. It contains no board membership or layout state. */
export interface CreateBoardViewportBookmarkInput {
  name: string;
  x: number;
  y: number;
  zoom: number;
}

export interface BoardViewportBookmark extends CreateBoardViewportBookmarkInput {
  id: string;
  board_id: string;
  user_id: string;
  created_at: string;
}
