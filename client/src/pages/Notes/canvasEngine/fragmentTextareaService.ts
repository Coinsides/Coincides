/** Native offsets belong to a displayed slice; receipts always name the unit. */
export function textareaUnitStart(textarea: HTMLTextAreaElement): number {
  return Number(textarea.dataset.textStart || 0);
}

export function textareaUnitText(textarea: HTMLTextAreaElement): string {
  return textarea.dataset.textStart === undefined ? textarea.value : textarea.dataset.textUnitText ?? textarea.value;
}

export function findUnitTextarea(
  candidates: readonly HTMLTextAreaElement[], blockId: string, unitId: string, offset: number,
): HTMLTextAreaElement | undefined {
  const editors = candidates.filter((node) => node.dataset.blockId === blockId && node.dataset.textUnitId === unitId);
  // Prefer the following fragment at a wrap boundary, except at the unit's end.
  return [...editors].reverse().find((node) => offset >= textareaUnitStart(node)
    && offset <= Number(node.dataset.textEnd ?? node.value.length)) || editors[0];
}
