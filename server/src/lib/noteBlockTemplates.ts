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
    template_id: 'text.heading',
    label: 'Heading',
    system_type: 'text',
    learning_role: 'note',
    description: 'Section heading.',
    fields: [{ key: 'body', label: 'Heading', kind: 'text', required: true }],
    default_content: { body: '' },
    render_hint: 'heading',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'heading',
  },
  {
    template_id: 'concept.basic',
    label: 'Concept',
    system_type: 'text',
    learning_role: 'concept',
    description: 'A core idea or concept.',
    fields: [{ key: 'body', label: 'Concept', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'paragraph',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
  {
    template_id: 'definition.basic',
    label: 'Definition',
    system_type: 'text',
    learning_role: 'definition',
    description: 'A precise definition.',
    fields: [{ key: 'body', label: 'Definition', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'definition',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'definition',
  },
  {
    template_id: 'theorem.basic',
    label: 'Theorem',
    system_type: 'text',
    learning_role: 'theorem',
    description: 'A theorem or formal statement.',
    fields: [{ key: 'body', label: 'Statement', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'theorem',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'theorem',
  },
  {
    template_id: 'proof.basic',
    label: 'Proof',
    system_type: 'text',
    learning_role: 'proof',
    description: 'A proof or derivation.',
    fields: [{ key: 'body', label: 'Proof', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'proof',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'proof',
  },
  {
    template_id: 'formula.math',
    label: 'Formula',
    system_type: 'latex',
    learning_role: 'formula',
    description: 'A math formula or equation.',
    fields: [{ key: 'body', label: 'Formula', kind: 'latex', required: true }],
    default_content: { body: '' },
    render_hint: 'formula',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'formula',
  },
  {
    template_id: 'example.general',
    label: 'Example',
    system_type: 'text',
    learning_role: 'example',
    description: 'A worked or illustrative example.',
    fields: [{ key: 'body', label: 'Example', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'example',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'example',
  },
  {
    template_id: 'exercise.general',
    label: 'Exercise',
    system_type: 'task',
    learning_role: 'exercise',
    description: 'A practice prompt or exercise.',
    fields: [{ key: 'body', label: 'Exercise', kind: 'textarea', required: true }],
    default_content: { body: '', done: false },
    render_hint: 'exercise',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'exercise',
  },
  {
    template_id: 'answer.general',
    label: 'Answer',
    system_type: 'text',
    learning_role: 'answer',
    description: 'An answer or solution.',
    fields: [{ key: 'body', label: 'Answer', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'answer',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'answer',
  },
  {
    template_id: 'source.quote',
    label: 'Source Quote',
    system_type: 'source_quote',
    learning_role: 'source',
    description: 'A source-grounded quote or excerpt.',
    fields: [{ key: 'body', label: 'Quote', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'quote',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'paragraph',
  },
  {
    template_id: 'warning.callout',
    label: 'Callout',
    system_type: 'text',
    learning_role: 'warning',
    description: 'A warning, reminder, or important note.',
    fields: [{ key: 'body', label: 'Callout', kind: 'textarea', required: true }],
    default_content: { body: '' },
    render_hint: 'callout',
    proposal_allowed: true,
    source_reference_allowed: true,
    legacy_block_type: 'sidenote',
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
  heading: 'text.heading',
  paragraph: 'text.paragraph',
  definition: 'definition.basic',
  theorem: 'theorem.basic',
  proof: 'proof.basic',
  formula: 'formula.math',
  example: 'example.general',
  exercise: 'exercise.general',
  answer: 'answer.general',
  sidenote: 'warning.callout',
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
