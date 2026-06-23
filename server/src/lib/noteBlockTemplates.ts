export const NOTE_BLOCK_TAXONOMY_VERSION = 'v2.1.1' as const;

export type NoteBlockSystemType =
  | 'text'
  | 'latex'
  | 'code'
  | 'source_quote'
  | 'task'
  | 'media'
  | 'table';

export type NoteBlockLearningRole =
  | 'note'
  | 'concept'
  | 'definition'
  | 'theorem'
  | 'proof'
  | 'formula'
  | 'example'
  | 'exercise'
  | 'answer'
  | 'warning'
  | 'source';

export type NoteBlockTemplateFieldKind =
  | 'text'
  | 'latex'
  | 'textarea'
  | 'list'
  | 'code'
  | 'checkbox';

export interface NoteBlockTemplateField {
  key: string;
  label: string;
  kind: NoteBlockTemplateFieldKind;
  required?: boolean;
}

export interface NoteBlockTemplateMetadata {
  system_type: NoteBlockSystemType;
  learning_role: NoteBlockLearningRole;
  template_id: string;
  taxonomy_version: typeof NOTE_BLOCK_TAXONOMY_VERSION;
}

export interface NoteBlockTemplateDefinition {
  template_id: string;
  label: string;
  system_type: NoteBlockSystemType;
  learning_role: NoteBlockLearningRole;
  description: string;
  fields: NoteBlockTemplateField[];
  default_content: Record<string, unknown>;
  render_hint: string;
  proposal_allowed: boolean;
  source_reference_allowed: boolean;
  legacy_block_type: 'heading' | 'paragraph' | 'definition' | 'theorem' | 'proof' | 'formula' | 'example' | 'exercise' | 'answer' | 'sidenote';
}

export const NOTE_BLOCK_TEMPLATES: NoteBlockTemplateDefinition[] = [
  {
    template_id: 'text.paragraph',
    label: 'Paragraph',
    system_type: 'text',
    learning_role: 'note',
    description: 'General note text.',
    fields: [{ key: 'body', label: 'Body', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'paragraph',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
  {
    template_id: 'formula.math',
    label: 'Formula',
    system_type: 'latex',
    learning_role: 'formula',
    description: 'A math formula or equation.',
    fields: [
      { key: 'latex_input', label: 'LaTeX input', kind: 'latex', required: true },
      { key: 'formula_name', label: 'Formula name', kind: 'text', required: false },
      { key: 'explanation', label: 'Explanation', kind: 'textarea', required: false },
    ],
    default_content: {
      body: '',
      field_values: {
        latex_input: '',
        formula_name: '',
        explanation: '',
      },
    },
    render_hint: 'formula',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'formula',
  },
  {
    template_id: 'code.snippet',
    label: 'Code Snippet',
    system_type: 'code',
    learning_role: 'example',
    description: 'A code example or snippet.',
    fields: [{ key: 'body', label: 'Code', kind: 'code', required: true }],
    default_content: { body: '', language: '' },
    render_hint: 'code',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
];

const TEMPLATE_BY_ID = new Map(NOTE_BLOCK_TEMPLATES.map((template) => [template.template_id, template]));

const LEGACY_TEMPLATE_BY_BLOCK_TYPE: Record<string, string> = {
  paragraph: 'text.paragraph',
  heading: 'text.paragraph',
  definition: 'text.paragraph',
  theorem: 'text.paragraph',
  proof: 'text.paragraph',
  formula: 'formula.math',
  example: 'text.paragraph',
  exercise: 'text.paragraph',
  answer: 'text.paragraph',
  sidenote: 'text.paragraph',
};

export function listNoteBlockTemplates(): NoteBlockTemplateDefinition[] {
  return NOTE_BLOCK_TEMPLATES;
}

export function getNoteBlockTemplate(templateId: string | undefined | null): NoteBlockTemplateDefinition | undefined {
  return templateId ? TEMPLATE_BY_ID.get(templateId) : undefined;
}

export function inferNoteBlockTemplateMetadata(blockType: string | undefined | null): NoteBlockTemplateMetadata {
  const templateId = LEGACY_TEMPLATE_BY_BLOCK_TYPE[String(blockType || '').toLowerCase()] || 'text.paragraph';
  const template = getNoteBlockTemplate(templateId) || NOTE_BLOCK_TEMPLATES[0];
  return {
    system_type: template.system_type,
    learning_role: template.learning_role,
    template_id: template.template_id,
    taxonomy_version: NOTE_BLOCK_TAXONOMY_VERSION,
  };
}

export function normalizeNoteBlockTemplateMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
): NoteBlockTemplateMetadata {
  const raw = metadata || {};
  const template = getNoteBlockTemplate(
    typeof raw.template_id === 'string' ? raw.template_id : undefined,
  );
  if (template) {
    return {
      system_type: template.system_type,
      learning_role: template.learning_role,
      template_id: template.template_id,
      taxonomy_version: NOTE_BLOCK_TAXONOMY_VERSION,
    };
  }
  return inferNoteBlockTemplateMetadata(fallbackBlockType);
}

export function mergeNoteBlockTemplateMetadata(
  metadata: Record<string, unknown> | null | undefined,
  fallbackBlockType?: string | null,
): Record<string, unknown> {
  return {
    ...(metadata || {}),
    ...normalizeNoteBlockTemplateMetadata(metadata, fallbackBlockType),
  };
}

export function legacyBlockTypeForTemplate(templateId: string | undefined | null): NoteBlockTemplateDefinition['legacy_block_type'] {
  return getNoteBlockTemplate(templateId)?.legacy_block_type || 'paragraph';
}

export function getNoteBlockTemplateLabel(metadata: Record<string, unknown> | null | undefined, fallbackBlockType?: string | null): string {
  const normalized = normalizeNoteBlockTemplateMetadata(metadata, fallbackBlockType);
  return getNoteBlockTemplate(normalized.template_id)?.label || 'Paragraph';
}
