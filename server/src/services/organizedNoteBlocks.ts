import type Database from 'better-sqlite3';
import { createNoteBlockSchema } from '../validators/index.js';
import { BUILTIN_COMPONENT_PARAMS_SCHEMAS } from '../validators/componentBlock.js';
import { PARAGRAPH_FURNITURE_KEY } from '../validators/paragraphFurniture.js';
import { mergeRuntimeNoteBlockTemplateMetadata } from './templateDefinitions.js';

const textTypes = new Set(['heading', 'paragraph', 'definition', 'theorem', 'proof', 'formula',
  'example', 'exercise', 'answer', 'sidenote']);
const richTypes = new Set(['table', 'component', 'toc']);
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function string(value: unknown): string { return typeof value === 'string' ? value : ''; }

/** The existing TextFlow shape, containing semantics only; no schema extension. */
function textContent(text: string, role: string, id: string) {
  return { body: text, text_flow: { textflow_version: 'TextBlockContentV1',
    units: [{ id, text, writing_role: role, indent_level: 0,
      order_index: 0, metadata: {}, status: 'active' }], inline_structures: [], metadata: {} } };
}

/** No block disappears. Generation and apply use this same normalizer; apply revalidates stored data.
 * The human creation schema delegates rich payloads to the existing table/component/TOC validators.
 */
export function normalizeOrganizedNoteBlock(db: Database.Database, userId: string, value: unknown, index: number) {
  const block = record(value);
  const warnings = Array.isArray(block.warnings) ? block.warnings.map(String) : [];
  let type = string(block.block_type) || 'paragraph';
  let content = record(block.content_json);
  const units = record(content.text_flow).units;
  const heading = Array.isArray(units) ? units.map(record).filter(unit => unit.status !== 'deleted')
    .sort((left, right) => Number(left.order_index || 0) - Number(right.order_index || 0))
    .find(unit => ['heading', 'heading_1', 'heading_2', 'heading_3'].includes(string(unit.writing_role))) : undefined;
  let role = heading ? string(heading.writing_role) : type === 'heading' ? 'heading' : 'paragraph';
  const tempId = string(block.temp_id) || `block-${index + 1}`;
  let title = typeof block.title === 'string' ? block.title : null;
  const rawText = string(block.plain_text) || string(content.body) || title
    || (Object.keys(content).length ? JSON.stringify(content) : '');
  let plainText = rawText;
  let overrides = record(block.display_overrides_json);
  const inputMetadata = record(block.metadata);
  let templateId = string(block.template_id) || string(inputMetadata.template_id);
  const downgrade = (reason: string) => {
    warnings.push(`Block ${index + 1}: ${reason}; downgraded to paragraph.`);
    type = 'paragraph'; templateId = ''; overrides = {}; role = 'paragraph';
    content = textContent(rawText, role, `${tempId}-text`);
    plainText = rawText;
  };
  if (!textTypes.has(type) && !richTypes.has(type)) downgrade(`unsupported block_type "${type}"`);

  // Proposal appearance is restricted to B3 semantics. All renderer appearance comes from tokens.
  if (Object.keys(overrides).some(key => key !== PARAGRAPH_FURNITURE_KEY)) {
    warnings.push(`Block ${index + 1}: unsupported display overrides removed.`);
  }
  overrides = Object.prototype.hasOwnProperty.call(overrides, PARAGRAPH_FURNITURE_KEY)
    ? { [PARAGRAPH_FURNITURE_KEY]: overrides[PARAGRAPH_FURNITURE_KEY] } : {};
  if (type === 'component' && !Object.prototype.hasOwnProperty.call(BUILTIN_COMPONENT_PARAMS_SCHEMAS, string(content.component_kind))) {
    downgrade(`unsupported component_kind "${string(content.component_kind)}"`);
  }
  // Validate content and placement semantics with the exact human-door schema. Plain text is
  // a lossless fallback receipt, not the rich payload; do not impose its 20k input limit on a 64k table.
  const checked = createNoteBlockSchema.safeParse({ block_type: type, content_json: content,
    display_overrides_json: overrides,
    ...(type === 'toc' ? { plain_text: string(block.plain_text), title: title ?? undefined } : {}) });
  if (!checked.success) downgrade(checked.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));

  if (type === 'toc') {
    return { temp_id: tempId, block_type: type, title: null, content_json: {}, plain_text: '',
      metadata: {}, display_overrides_json: {}, order_index: index, warnings };
  }
  if (type === 'component') templateId = `component.${content.component_kind}`;
  else if (type === 'table') templateId = 'media.table';
  else if (overrides[PARAGRAPH_FURNITURE_KEY]) templateId = 'text.paragraph';
  else templateId ||= type === 'formula' ? 'formula.math' : 'text.paragraph';
  let resolved = mergeRuntimeNoteBlockTemplateMetadata(db, userId,
    templateId ? { template_id: templateId } : {}, type, { allowUnknownTemplateFallback: true });
  // A text proposal cannot smuggle a media/reference kind in via its template alias.
  if (textTypes.has(type) && !textTypes.has(resolved.template.legacy_block_type)) {
    downgrade(`template "${templateId}" is outside the text family`);
    resolved = mergeRuntimeNoteBlockTemplateMetadata(db, userId, {}, 'paragraph');
  }
  warnings.push(...resolved.warnings);
  if (textTypes.has(type)) {
    if (resolved.template.system_type === 'text') content = textContent(plainText, role, `${tempId}-text`);
    else if (resolved.template.system_type === 'code') content = { body: plainText, language: string(content.language) };
    else {
      const fields = record(content.field_values);
      content = { body: plainText, field_values: {
        latex_input: string(fields.latex_input) || plainText,
        formula_name: string(fields.formula_name), explanation: string(fields.explanation),
      } };
    }
    type = resolved.template.legacy_block_type;
  }
  return { temp_id: tempId, block_type: type, title, content_json: content, plain_text: plainText,
    metadata: resolved.metadata, display_overrides_json: overrides, order_index: index, warnings: [...new Set(warnings)] };
}

/** Intentionally small deterministic grammar: explicit Markdown tables, dated lines and quote/admonition lines. */
export function deterministicRichContent(text: string): Record<string, unknown>[] {
  const lines = text.split(/\r?\n/);
  const blocks: Record<string, unknown>[] = [];
  const paragraph = (body: string, furniture?: Record<string, string>) => ({ block_type: 'paragraph',
    content_json: { body }, plain_text: body,
    ...(furniture ? { display_overrides_json: { [PARAGRAPH_FURNITURE_KEY]: furniture } } : {}) });
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  const date = /^\s*(?:[-*]\s+)?(\d{3,4}(?:[-/]\d{1,2}(?:[-/]\d{1,2})?)?)(?:年)?\s*(?:[：:]|[-–—])\s*(.+)$/;
  for (let i = 0; i < lines.length;) {
    if (lines[i].includes('|') && i + 1 < lines.length && cells(lines[i + 1]).every(cell => /^:?-{3,}:?$/.test(cell))) {
      const start = i; const headers = cells(lines[i]); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) rows.push(cells(lines[i++]));
      blocks.push({ block_type: 'table', content_json: { headers, rows }, plain_text: lines.slice(start, i).join('\n') });
    } else if (date.test(lines[i])) {
      const start = i; const entries: { year: string; label: string }[] = [];
      while (i < lines.length && date.test(lines[i])) {
        const match = lines[i++].match(date)!; entries.push({ year: match[1], label: match[2] });
      }
      blocks.push({ block_type: 'component', content_json: { component_kind: 'timeline', params: { entries } },
        plain_text: lines.slice(start, i).join('\n') });
    } else if (/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i.test(lines[i])) {
      const start = i++;
      while (i < lines.length && /^\s*>/.test(lines[i])) i++;
      const body = lines.slice(start, i).map(line => line.replace(/^\s*>\s*/, '').replace(/^\[![A-Z]+\]\s*/i, '')).join('\n');
      blocks.push(paragraph(body, { variant: 'callout', label: '注意' }));
    } else if (/^\s*>/.test(lines[i])) {
      const start = i++;
      while (i < lines.length && /^\s*>/.test(lines[i])) i++;
      blocks.push(paragraph(lines.slice(start, i).map(line => line.replace(/^\s*>\s*/, '')).join('\n'), { variant: 'quote', source: '' }));
    } else {
      const line = lines[i++];
      if (line.trim()) blocks.push(paragraph(line));
    }
  }
  return blocks.length ? blocks : [paragraph(text)];
}
