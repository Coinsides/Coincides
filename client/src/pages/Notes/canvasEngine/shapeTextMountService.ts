import type { NoteBlock } from './runtimeDataTypes';
import { textFromContent } from './blockContentService';
import type { CanvasObject, ContentMount } from './types';

export const SHAPE_BACKING_PROJECTION_KIND = 'block_backed_shape';
export const CANVAS_OBJECT_BACKING_RENDER_SCOPE = 'canvas_object_backing';
export const SHAPE_LAST_BACKING_BLOCK_ID_METADATA_KEY = 'last_backing_block_id';

export function shapeBackedBlockMetadata(objectId: string): Record<string, unknown> {
  return {
    projection_kind: SHAPE_BACKING_PROJECTION_KIND,
    shape_object_id: objectId,
    render_scope: CANVAS_OBJECT_BACKING_RENDER_SCOPE,
  };
}

export function rememberShapeBackingBlock(
  metadata: Record<string, unknown> | undefined,
  blockId: string,
): Record<string, unknown> {
  return {
    ...(metadata || {}),
    [SHAPE_LAST_BACKING_BLOCK_ID_METADATA_KEY]: blockId,
  };
}

export function readRememberedShapeBackingBlockId(
  metadata: Record<string, unknown> | undefined,
): string | null {
  const value = metadata?.[SHAPE_LAST_BACKING_BLOCK_ID_METADATA_KEY];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

export function isCanvasObjectBackingBlock(
  block: { metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  const metadata = block?.metadata || {};
  return metadata.render_scope === CANVAS_OBJECT_BACKING_RENDER_SCOPE
    || metadata.projection_kind === SHAPE_BACKING_PROJECTION_KIND;
}

export function isBlockBackedShapeObject(object: CanvasObject | null | undefined): boolean {
  return object?.kind === 'shape'
    && object.backing === 'note_block'
    && object.objectClass === 'block_backed';
}

export function findShapeTextMount(
  objectId: string,
  mounts: ContentMount[],
): ContentMount | null {
  return mounts.find((mount) => (
    mount.objectId === objectId
    && mount.targetKind === 'note_block'
  )) || null;
}

export function findBackingBlockForShape(
  objectId: string,
  mounts: ContentMount[],
  blocks: NoteBlock[],
): NoteBlock | null {
  const mount = findShapeTextMount(objectId, mounts);
  if (!mount) return null;
  return blocks.find((block) => block.id === mount.targetId) || null;
}

export function buildTextByContentTargetId(blocks: NoteBlock[]): Record<string, string> {
  return blocks.reduce<Record<string, string>>((acc, block) => {
    acc[block.id] = textFromContent(block).trimEnd();
    return acc;
  }, {});
}
