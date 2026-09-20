import type { TextBlockContentV1, TextUnitWritingRole } from './runtimeDataTypes';
import { replaceTextUnitText } from './textFlowService';

export type HeadingLevel = 1 | 2 | 3;
export type HeadingWritingRole = 'heading_1' | 'heading_2' | 'heading_3';

/** Legacy heading remains readable and projects as level one; no migration. */
export function headingLevelForRole(role: TextUnitWritingRole): HeadingLevel | null {
  if (role === 'heading' || role === 'heading_1') return 1;
  if (role === 'heading_2') return 2;
  if (role === 'heading_3') return 3;
  return null;
}

export function headingRoleForLevel(level: HeadingLevel): HeadingWritingRole {
  return `heading_${level}`;
}

/** The host applies this edit and isolates its heading through existing block actions. */
export interface HeadingTextFlowStructureRequest {
  previousTextFlow: TextBlockContentV1;
  nextTextFlow: TextBlockContentV1;
  headingUnitId: string;
  focus: { unitId: string; caret: number };
  inputType: 'formatHeading' | 'insertHeading' | 'insertParagraphAfterHeading';
}

/** Only a completed, unindented Markdown prefix opens a chapter. */
export function headingPrefix(text: string): { role: HeadingWritingRole; length: number } | null {
  const match = text.match(/^(#{1,3}) /);
  return match ? { role: headingRoleForLevel(match[1].length as HeadingLevel), length: match[0].length } : null;
}

export function applyHeadingPrefix(flow: TextBlockContentV1, unitId: string, value: string): {
  flow: TextBlockContentV1; prefixLength: number;
} | null {
  const unit = flow.units.find((candidate) => candidate.id === unitId);
  const prefix = headingPrefix(value);
  if (!unit || unit.status === 'deleted' || unit.writing_role === 'code_line' || !prefix) return null;
  // Use the ordinary edit mapper, retaining inline identity and evidence.
  const edited = replaceTextUnitText({ textFlow: flow, textUnitId: unitId, nextText: value });
  const stripped = replaceTextUnitText({ textFlow: edited, textUnitId: unitId, nextText: value.slice(prefix.length),
    edit: { editedStartOffset: 0, editedEndOffset: prefix.length, replacementText: '' } });
  return { flow: { ...stripped, units: stripped.units.map((candidate) => candidate.id === unitId
    ? { ...candidate, writing_role: prefix.role } : candidate) }, prefixLength: prefix.length };
}
