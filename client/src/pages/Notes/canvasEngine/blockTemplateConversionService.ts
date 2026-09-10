import { metadataForTemplateOption, type TemplateOption } from '@/services/templateOptions';
import { contentForTemplate, plainTextForBlockContent } from './blockContentService';
import type { NoteBlock } from './runtimeDataTypes';

export type BlockTemplatePayload = Pick<NoteBlock,
  'block_type' | 'title' | 'content_json' | 'plain_text' | 'metadata'>;

/** Freeze the existing conversion door's payload without regenerating it on replay. */
export function buildBlockTemplatePayload(
  block: NoteBlock,
  template: TemplateOption,
  text: string,
  options: {
    title?: string | null;
    contentJson?: Record<string, unknown>;
    metadataPatch?: Record<string, unknown>;
  } = {},
): BlockTemplatePayload {
  const nextText = text.trimEnd();
  const nextContent = options.contentJson || contentForTemplate(template, nextText);
  const nextKind = template.learning_role === 'formula'
    ? 'formula' : template.template_key === 'code.snippet' ? 'code' : 'paragraph';
  return {
    block_type: template.legacy_block_type,
    title: options.title ?? block.title,
    content_json: nextContent,
    plain_text: plainTextForBlockContent(nextKind, nextContent, nextText),
    metadata: { ...metadataForTemplateOption(template), ...(options.metadataPatch || {}) },
  };
}
