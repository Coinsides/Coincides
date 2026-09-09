/** Includes the virtual Base layer, which is always the bottom layer. */
export const BOARD_LAYER_LIMIT = 12;

export interface BoardLayer {
  id: string;
  board_id: string;
  user_id: string;
  name: string;
  order_index: number;
  visible: boolean;
}
