/** C4a's only prompt amendment; the existing workflow bytes remain unchanged. */
export function renderUiInstructionPrompt(name: (reference: string) => string = reference => reference): string {
  return `### UI
${name('ui_open_note')}: tab; ${name('ui_focus_object')}: scroll/highlight. No domain writes. 8/turn, 1s debounce. Issued≠displayed: defer for typing; no focus theft or history replay.

`;
}
