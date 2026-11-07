/** Focus is moving into a heading structure's window: the structure saves this text itself (commit-2). */
export function isStructureTypingWindow(target: EventTarget | null): boolean {
  return target instanceof HTMLTextAreaElement && target.dataset.structureTypingBuffer === 'true';
}

/** An editor taking focus now would end a composition in progress, whatever then took focus back. */
export function structureTypingHoldsFocus(): boolean {
  const active = document.activeElement;
  return active instanceof HTMLTextAreaElement && active.dataset.structureTypingBuffer === 'true';
}
