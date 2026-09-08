/** Pure persisted-placement -> block-layout projection, shared with offline replay.
 * This is the existing read-side mapping; it never changes stored coordinates.
 */
export interface CanvasPlacementLayoutInput {
  x: number; y: number; width: number; height: number; rotation?: number;
  surface?: string; boundary_role?: string; frame_id?: string | null; order_index?: number | null;
}
export function projectCanvasPlacementLayout(row: CanvasPlacementLayoutInput, policy: Record<string, unknown>): Record<string, unknown> {
  const layout: Record<string, unknown> = {
    x: Math.round(Number(row.x || 0)),
    y: Math.round(Number(row.y || 0)),
    width: Math.round(Number(row.width || 0)),
    height: Math.round(Number(row.height || 0)),
    surface: row.surface === 'tray' ? 'tray' : row.surface === 'canvas_workspace' ? 'canvas_workspace' : 'formal_page',
    boundary_role: row.boundary_role === 'crossing' || row.boundary_role === 'outside'
      ? row.boundary_role
      : 'inside',
  };
  if (row.frame_id) layout.frame_id = row.frame_id;
  if (row.order_index != null) layout.order_index = row.order_index;
  if (policy.coordinate_space === 'page_frame_local' || policy.coordinate_space === 'canvas_world') {
    layout.coordinate_space = policy.coordinate_space;
  }
  if (Number(row.rotation || 0) !== 0) layout.rotation = Number(row.rotation || 0);
  if (typeof policy.export_role === 'string') layout.export_role = policy.export_role;
  if (typeof policy.ai_visibility === 'string') layout.ai_visibility = policy.ai_visibility;
  if (policy.width_mode === 'manual') layout.width_mode = 'manual';
  return layout;
}
