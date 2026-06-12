import type { TemplateOption } from '@/services/templateOptions';

export type FieldValueRecord = Record<string, unknown>;

export type BlockPresentationKind = 'definition' | 'formula' | 'heading' | 'code' | 'sourceQuote' | 'paragraph';

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
  if (block.block_type === 'definition' || templateKey.includes('definition')) return 'definition';
  if (block.block_type === 'formula' || templateKey.includes('formula')) return 'formula';
  if (block.block_type === 'heading' || templateKey.includes('heading')) return 'heading';
  if (templateKey.includes('code') || stringValue(block.content_json?.language)) return 'code';
  if (templateKey.includes('source.quote') || templateKey.includes('quote')) return 'sourceQuote';
  return 'paragraph';
}

export function definitionFieldsFromText(text: string): { concept_name: string; description: string } {
  const trimmed = text.trim();
  return {
    concept_name: '',
    description: trimmed,
  };
}

export function definitionFieldsFromBlock(
  block: BlockContentInput,
  draftText?: string,
  draftFields?: FieldValueRecord,
): { concept_name: string; description: string } {
  if (draftFields) {
    return {
      concept_name: stringValue(draftFields.concept_name),
      description: stringValue(draftFields.description),
    };
  }
  const fields = readFieldValues(block.content_json, block.metadata);
  const bodyFallback = stringValue(block.content_json?.body) || block.plain_text || '';
  const parsed = definitionFieldsFromText(bodyFallback);
  return {
    concept_name: stringValue(fields.concept_name),
    description: draftText !== undefined
      ? draftText
      : firstString(fields.description, parsed.description, bodyFallback),
  };
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
    latex_input: draftFields ? stringValue(effectiveFields.latex_input) : firstString(effectiveFields.latex_input, bodyFallback),
    formula_name: stringValue(effectiveFields.formula_name),
    explanation: stringValue(effectiveFields.explanation),
  };
}

export function combinedDefinitionText(conceptName: string, description: string): string {
  const name = conceptName.trim();
  const body = description.trim();
  if (name && body) return `${name}: ${body}`;
  return name || body;
}

export function formulaPreviewText(latexInput: string): string {
  const trimmed = latexInput.trim();
  if (!trimmed) return '';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}$`;
}

function contentForDefinition(
  text: string,
  previous: Record<string, unknown> = {},
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const fields = fieldValuesOverride
    ? {
      concept_name: stringValue(fieldValuesOverride.concept_name),
      description: stringValue(fieldValuesOverride.description),
    }
    : definitionFieldsFromText(text);
  const body = combinedDefinitionText(fields.concept_name, fields.description);
  const fieldValues = {
    concept_name: fields.concept_name,
    description: fields.description,
  };
  return {
    ...previous,
    body,
    field_values: fieldValues,
    structured_fields: fieldValues,
  };
}

function contentForFormula(
  text: string,
  previous: Record<string, unknown> = {},
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const latex = text.trim();
  const previousFields = readFieldValues(previous);
  const fieldValues = {
    latex_input: fieldValuesOverride ? stringValue(fieldValuesOverride.latex_input) : latex,
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

export function plainTextForBlockContent(kind: BlockPresentationKind, content: Record<string, unknown>, fallback: string): string {
  const fields = readFieldValues(content);
  if (kind === 'definition') {
    return combinedDefinitionText(stringValue(fields.concept_name), stringValue(fields.description));
  }
  if (kind === 'formula') {
    return stringValue(fields.latex_input) || stringValue(content.body) || fallback;
  }
  return stringValue(content.body) || fallback;
}

export function textFromContent(block: BlockContentInput): string {
  const kind = presentationKindForBlock(block);
  if (kind === 'definition') {
    const fields = definitionFieldsFromBlock(block);
    return combinedDefinitionText(fields.concept_name, fields.description);
  }
  if (kind === 'formula') {
    return formulaFieldsFromBlock(block).latex_input;
  }
  const body = block.content_json?.body;
  if (typeof body === 'string') return body;
  return block.plain_text || '';
}

export function contentForTemplate(template: TemplateOption, body: string): Record<string, unknown> {
  if (template.template_key === 'definition.basic' || template.learning_role === 'definition') {
    return contentForDefinition(body, template.default_content || {});
  }
  if (template.template_key === 'formula.math' || template.learning_role === 'formula') {
    return contentForFormula(body, template.default_content || {});
  }
  return {
    ...(template.default_content || {}),
    body,
  };
}

export function contentForEditedBlock(
  block: BlockContentInput,
  body: string,
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const kind = presentationKindForBlock(block);
  if (kind === 'definition') return contentForDefinition(body, block.content_json, fieldValuesOverride);
  if (kind === 'formula') return contentForFormula(body, block.content_json, fieldValuesOverride);
  return { ...block.content_json, body };
}
