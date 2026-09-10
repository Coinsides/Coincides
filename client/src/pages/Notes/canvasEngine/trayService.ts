import type { CanvasObject, CanvasPlacement, ContentMount } from './types';
import type { NoteBlock } from './runtimeDataTypes';
import { textFromContent } from './blockContentService';
import { sliceGraphemes } from '../../../../../shared/graphemes';

export const TRAY_DRAG_TYPE = 'application/x-coincides-tray-placement';
export interface TrayEntry {
  placement: CanvasPlacement;
  category: 'block' | 'object' | 'mount';
  label: string;
  block?: NoteBlock;
  boardKind?: 'shape' | 'image' | 'table' | 'connector' | 'content_group';
}

export function buildTrayEntries(
  objects: CanvasObject[], placements: CanvasPlacement[], mounts: ContentMount[], blocks: NoteBlock[],
): TrayEntry[] {
  const objectById = new Map(objects.map((object) => [object.objectId, object]));
  return placements.filter((placement) => placement.surface === 'tray')
    .sort((a, b) => (a.orderIndex ?? Number.MAX_SAFE_INTEGER) - (b.orderIndex ?? Number.MAX_SAFE_INTEGER)
      || a.placementId.localeCompare(b.placementId))
    .map((placement) => {
      const object = objectById.get(placement.objectId);
      const ownedMounts = mounts.filter((mount) => mount.objectId === placement.objectId);
      const blockMount = ownedMounts.find((mount) => mount.targetKind === 'note_block');
      const block = object?.kind === 'paragraph_block_projection'
        ? blocks.find((item) => item.placement_id === placement.placementId && item.id === blockMount?.targetId)
        : undefined;
      const boardKind: TrayEntry['boardKind'] = object?.kind === 'visual_connector' ? 'connector'
        : object?.kind === 'shape' || object?.kind === 'image' || object?.kind === 'table' ? object.kind
          : object?.kind === 'content_group_projection' && ownedMounts.length === 1 && ownedMounts[0].targetKind === 'content_group'
            ? 'content_group' : undefined;
      return {
        placement, block, boardKind,
        category: object?.kind === 'paragraph_block_projection' ? 'block' : ownedMounts.length ? 'mount' : 'object',
        label: block ? sliceGraphemes(block.title || textFromContent(block).trim() || 'Empty block', 0, 160)
          : object?.kind || 'Canvas object',
      };
    });
}
