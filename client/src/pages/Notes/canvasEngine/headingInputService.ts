import type { TextBlockContentV1 } from './runtimeDataTypes';
import { applyHeadingPrefix, headingLevelForRole, headingPrefix, type HeadingTextFlowStructureRequest } from './headingRoleService';
import { replaceTextUnitText } from './textFlowService';
import { setTextUnitWritingRole, splitTextUnitAtOffset } from './textUnitEditorService';

type HeadingFocus = HeadingTextFlowStructureRequest['focus'];

/** Hard lines keep the ordinary unit/inline split rules; no chapter ownership is stored. */
export function normalizeHeadingTextFlow(flow: TextBlockContentV1, focus: HeadingFocus): {
  flow: TextBlockContentV1; focus: HeadingFocus;
} {
  let next = flow;
  let nextFocus = focus;
  for (const unit of flow.units) {
    const lineEnd = unit.text.indexOf('\n');
    if (unit.status === 'deleted' || !headingLevelForRole(unit.writing_role) || lineEnd < 0) continue;
    next = setTextUnitWritingRole(next, unit.id, unit.writing_role);
    if (nextFocus.unitId === unit.id && nextFocus.caret > lineEnd) {
      const index = next.units.findIndex((candidate) => candidate.id === unit.id);
      nextFocus = { unitId: next.units[index + 1].id, caret: nextFocus.caret - lineEnd - 1 };
    }
  }
  return { flow: next, focus: nextFocus };
}

export function headingStructureRequestForEdit(previous: TextBlockContentV1, next: TextBlockContentV1,
  focus: HeadingFocus): HeadingTextFlowStructureRequest | null {
  const heading = next.units.find((unit) => unit.status !== 'deleted' && headingLevelForRole(unit.writing_role));
  if (!heading) return null;
  const needsStructure = next.units.filter((unit) => unit.status !== 'deleted').length > 1
    || heading.text.includes('\n')
    || previous.units.find((unit) => unit.id === heading.id)?.writing_role !== heading.writing_role;
  if (!needsStructure) return null;
  const normalized = normalizeHeadingTextFlow(next, focus);
  return { previousTextFlow: previous, nextTextFlow: normalized.flow, headingUnitId: heading.id,
    focus: normalized.focus, inputType: 'formatHeading' };
}

/** The current logical line may follow Shift+Enter inside an existing paragraph. */
export function applyHeadingInputAtLine(flow: TextBlockContentV1, unitId: string, value: string,
  caret: number): HeadingTextFlowStructureRequest | null {
  const original = flow.units.find((unit) => unit.id === unitId);
  if (!original || original.status === 'deleted' || original.writing_role === 'code_line') return null;
  const lineStart = value.lastIndexOf('\n', Math.max(0, caret - 1)) + 1;
  const prefix = headingPrefix(value.slice(lineStart));
  if (!prefix || caret < lineStart + prefix.length) return null;
  let edited = replaceTextUnitText({ textFlow: flow, textUnitId: unitId, nextText: value });
  let headingUnitId = unitId;
  if (lineStart > 0) {
    edited = splitTextUnitAtOffset(edited, unitId, lineStart);
    const index = edited.units.findIndex((unit) => unit.id === unitId);
    headingUnitId = edited.units[index + 1].id;
    const preceding = edited.units[index];
    edited = replaceTextUnitText({ textFlow: edited, textUnitId: unitId, nextText: preceding.text.slice(0, -1),
      edit: { editedStartOffset: preceding.text.length - 1, editedEndOffset: preceding.text.length, replacementText: '' } });
  }
  const unit = edited.units.find((candidate) => candidate.id === headingUnitId)!;
  const heading = applyHeadingPrefix(edited, headingUnitId, unit.text);
  if (!heading) return null;
  const normalized = normalizeHeadingTextFlow(heading.flow,
    { unitId: headingUnitId, caret: caret - lineStart - prefix.length });
  // The keystroke that completed the prefix is not in the previous text yet; a draft's text already is.
  const previousText = original.text;
  const beforeCaret = Math.max(0, Math.min(previousText.length, caret - Math.max(0, value.length - previousText.length)));
  return { previousTextFlow: flow, nextTextFlow: normalized.flow, headingUnitId,
    focus: normalized.focus, beforeCaret, inputType: 'insertHeading' };
}

/** The draft textarea has no heading shortcut, so a `# ` typed there arrives as text. The first such line takes the same request the durable editor makes; the caret stays where the reader is. */
export function headingRequestForDraftText(flow: TextBlockContentV1, caret: { unitId: string; offset: number }):
HeadingTextFlowStructureRequest | null {
  const live = flow.units.filter((candidate) => candidate.status !== 'deleted');
  if (live.length < 2) return null;
  const unit = live.find((candidate) => !headingLevelForRole(candidate.writing_role) && headingPrefix(candidate.text));
  if (!unit) return null;
  const onHeading = unit.id === caret.unitId;
  const request = applyHeadingInputAtLine(flow, unit.id, unit.text, onHeading ? Math.max(caret.offset, headingPrefix(unit.text)!.length) : unit.text.length);
  if (!request || onHeading) return request;
  return { ...request, focus: { unitId: caret.unitId, caret: caret.offset } };
}
