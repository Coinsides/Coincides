export type RuntimeInteractionMode =
  | 'idle'
  | 'hoveringBlock'
  | 'selectedBlock'
  | 'editingText'
  | 'draggingBlock'
  | 'resizingBlock'
  | 'panningCanvas'
  | 'openingMenu'
  | 'previewing';

export type RuntimeInteractionTarget = 'block' | 'draft' | 'surface' | 'noteChrome' | 'preview';

export interface RuntimeInteractionState {
  mode: RuntimeInteractionMode;
  target: RuntimeInteractionTarget;
  blockId?: string;
  panel?: 'slashMenu' | 'preview' | 'noteInfo' | 'moreActions' | 'insert';
}

export function idleInteraction(): RuntimeInteractionState {
  return { mode: 'idle', target: 'surface' };
}

export function hoveringBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'hoveringBlock', target: 'block', blockId };
}

export function selectedBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'selectedBlock', target: 'block', blockId };
}

export function editingTextInteraction(blockId?: string): RuntimeInteractionState {
  return { mode: 'editingText', target: blockId ? 'block' : 'draft', blockId };
}

export function draggingBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'draggingBlock', target: 'block', blockId };
}

export function resizingBlockInteraction(blockId: string): RuntimeInteractionState {
  return { mode: 'resizingBlock', target: 'block', blockId };
}

export function panningCanvasInteraction(): RuntimeInteractionState {
  return { mode: 'panningCanvas', target: 'surface' };
}

export function openingMenuInteraction(
  panel: NonNullable<RuntimeInteractionState['panel']>,
  blockId?: string,
): RuntimeInteractionState {
  return { mode: 'openingMenu', target: blockId ? 'block' : 'noteChrome', blockId, panel };
}

export function previewingInteraction(): RuntimeInteractionState {
  return { mode: 'previewing', target: 'preview', panel: 'preview' };
}

export function getInteractionBlockId(state: RuntimeInteractionState): string | null {
  return state.blockId || null;
}
