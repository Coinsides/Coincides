import type { TemplateOption } from '@/services/templateOptions';
import type {
  NoteBlock,
  TextBlockContentV1,
  TextUnitWritingRole,
} from './runtimeDataTypes';
import {
  attachFreshTextFlow,
  getTextFlowContent,
  projectTextFlowContent,
  TEXT_FLOW_CONTENT_KEY,
} from './textFlowService';

export type FieldValueRecord = Record<string, unknown>;

export type BlockPresentationKind = 'formula' | 'code' | 'paragraph';

export interface BlockContentInput {
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function readFieldValues(content: Record<string, unknown>, metadata?: Record<string, unknown>): FieldValueRecord {
  const fieldValues = content.field_values;
  if (isRecord(fieldValues)) return fieldValues;
  const legacyStructured = content.structured_fields;
  if (isRecord(legacyStructured)) return legacyStructured;
  const metadataFields = metadata?.structured_fields;
  if (isRecord(metadataFields)) return metadataFields;
  return {};
}

function templateKeyForBlock(block: BlockContentInput): string {
  return firstString(
    block.metadata?.template_key,
    block.metadata?.template_id,
    block.metadata?.legacy_template_id,
  );
}

export function presentationKindForBlock(block: BlockContentInput): BlockPresentationKind {
  const templateKey = templateKeyForBlock(block);
  if (block.block_type === 'formula' || templateKey.includes('formula')) return 'formula';
  if (templateKey.includes('code') || stringValue(block.content_json?.language)) return 'code';
  return 'paragraph';
}

export function formulaFieldsFromBlock(
  block: BlockContentInput,
  draftText?: string,
  draftFields?: FieldValueRecord,
): { latex_input: string; formula_name: string; explanation: string } {
  const fields = readFieldValues(block.content_json, block.metadata);
  const effectiveFields = draftFields || fields;
  const bodyFallback = draftText !== undefined ? draftText : stringValue(block.content_json?.body) || block.plain_text || '';
  return {
    latex_input: draftFields
      ? stringValue(effectiveFields.latex_input)
      : normalizeFormulaLatexInput(firstString(effectiveFields.latex_input, bodyFallback)),
    formula_name: stringValue(effectiveFields.formula_name),
    explanation: stringValue(effectiveFields.explanation),
  };
}

export function formulaPreviewText(latexInput: string): string {
  const trimmed = latexInput.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) return trimmed;
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
    const body = trimmed.slice(1, -1).trim();
    if (body.includes('\n') || body.startsWith('\\begin')) {
      return `$$\n${body}\n$$`;
    }
    return `$${body}$`;
  }
  if (trimmed.includes('$')) return trimmed;
  return `$$\n${trimmed}\n$$`;
}

export function normalizeFormulaLatexInput(latexInput: string): string {
  const trimmed = latexInput.trim();
  if (!trimmed) return '';
  const wrappedPairs = [
    ['$$', '$$'],
    ['\\[', '\\]'],
    ['\\(', '\\)'],
    ['$', '$'],
  ] as const;

  for (const [open, close] of wrappedPairs) {
    if (!trimmed.startsWith(open) || !trimmed.endsWith(close)) continue;
    const body = trimmed.slice(open.length, trimmed.length - close.length).trim();
    return body;
  }

  return trimmed;
}

function writingRoleForKind(kind: BlockPresentationKind): TextUnitWritingRole {
  if (kind === 'code') return 'code_line';
  return 'paragraph';
}

function contentWithTextFlow(
  content: Record<string, unknown>,
  body: string,
  kind: BlockPresentationKind,
): Record<string, unknown> {
  return attachFreshTextFlow(content, body, writingRoleForKind(kind));
}

function contentForFormula(
  text: string,
  previous: Record<string, unknown> = {},
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const latex = normalizeFormulaLatexInput(text);
  const previousFields = readFieldValues(previous);
  const fieldValues = {
    latex_input: fieldValuesOverride ? normalizeFormulaLatexInput(stringValue(fieldValuesOverride.latex_input)) : latex,
    formula_name: stringValue(fieldValuesOverride?.formula_name) || stringValue(previousFields.formula_name),
    explanation: stringValue(fieldValuesOverride?.explanation) || stringValue(previousFields.explanation),
  };
  const latexInput = fieldValues.latex_input;
  return {
    ...previous,
    body: latexInput,
    field_values: fieldValues,
    structured_fields: {
      latex_input: latexInput,
    },
  };
}

function textFlowPlainText(content: Record<string, unknown>, fallback = ''): string | null {
  if (!getTextFlowContent(content)) return null;
  return projectTextFlowContent(content, fallback).plain_text;
}

export function plainTextForBlockContent(kind: BlockPresentationKind, content: Record<string, unknown>, fallback: string): string {
  const fields = readFieldValues(content);
  if (kind === 'formula') {
    return stringValue(fields.latex_input) || stringValue(content.body) || fallback;
  }
  const textFlowText = textFlowPlainText(content, fallback);
  if (textFlowText !== null) return textFlowText;
  const body = stringValue(content.body);
  if (body) return body;
  return projectTextFlowContent(content, fallback).plain_text || fallback;
}

export function textFromContent(block: BlockContentInput): string {
  const kind = presentationKindForBlock(block);
  if (kind === 'formula') {
    return formulaFieldsFromBlock(block).latex_input;
  }
  const textFlowText = textFlowPlainText(block.content_json, block.plain_text || '');
  if (textFlowText !== null) return textFlowText;
  const body = block.content_json?.body;
  if (typeof body === 'string') return body;
  const projected = projectTextFlowContent(block.content_json, block.plain_text || '');
  if (projected.plain_text) return projected.plain_text;
  return block.plain_text || '';
}

export function hasMeaningfulRenderableBlockContent(block: NoteBlock): boolean {
  if (block.title?.trim()) return true;
  if (textFromContent(block).trim() || block.plain_text?.trim()) return true;
  if (block.source_references.length > 0) return true;
  const fields = readFieldValues(block.content_json, block.metadata);
  if (Object.values(fields).some((value) => typeof value === 'string' && value.trim().length > 0)) {
    return true;
  }
  const textFlow = getTextFlowContent(block.content_json);
  return Boolean(textFlow?.inline_structures.length);
}

export function contentForTemplate(template: TemplateOption, body: string): Record<string, unknown> {
  if (template.template_key === 'formula.math' || template.learning_role === 'formula') {
    return contentForFormula(body, template.default_content || {});
  }
  const kind = template.template_key === 'code.snippet' ? 'code' : 'paragraph';
  return contentWithTextFlow({
    ...(template.default_content || {}),
    body,
  }, body, kind);
}

export function contentForEditedBlock(
  block: BlockContentInput,
  body: string,
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const kind = presentationKindForBlock(block);
  if (kind === 'formula') return contentForFormula(body, block.content_json, fieldValuesOverride);
  return contentWithTextFlow({ ...block.content_json, body }, body, kind);
}

export function contentForEditedTextFlowBlock(
  block: BlockContentInput,
  textFlow: TextBlockContentV1,
): Record<string, unknown> {
  const projection = projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: textFlow }, block.plain_text || '');
  return {
    ...block.content_json,
    body: projection.plain_text,
    [TEXT_FLOW_CONTENT_KEY]: textFlow,
  };
}
