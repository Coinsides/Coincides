import { AppError } from '../middleware/errorHandler.js';
import { tocBlockContentSchema } from '../validators/tocBlock.js';

export function assertTocBlockContent(block: {
  block_type: string; content_json?: unknown; plain_text?: string | null; title?: string | null;
}): void {
  if (block.block_type !== 'toc') return;
  tocBlockContentSchema.parse(block.content_json ?? {});
  if (block.plain_text || block.title) throw new AppError(400, 'TOC blocks store only their placement');
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Flat read_note view of A4's agenda: one first live heading per current block.
 * Keep the caller's block order and exclusions; no tree, page number or text cache is written.
 */
export function tocBlockPlainText(blocks: readonly Record<string, unknown>[]): string {
  const titles = blocks.flatMap((block) => {
    const flow = record(record(block.content_json).text_flow);
    // Match the existing TextFlow reader used by deriveChapterProjection.
    if (flow.textflow_version !== 'TextBlockContentV1'
      || !Array.isArray(flow.units) || !Array.isArray(flow.inline_structures)) return [];
    const heading = flow.units.map((unit, index) => ({ unit: record(unit), index }))
      .sort((left, right) => {
        const order = ({ unit, index }: typeof left) => typeof unit.order_index === 'number'
          && Number.isFinite(unit.order_index) ? unit.order_index : index;
        return order(left) - order(right);
      }).find(({ unit }) => unit.status !== 'deleted'
        && ['heading', 'heading_1', 'heading_2', 'heading_3'].includes(String(unit.writing_role)));
    return heading ? [typeof heading.unit.text === 'string'
      ? heading.unit.text.replace(/\r\n|[\t\r\n]/g, ' ') : ''] : [];
  });
  return titles.length ? `目录: ${titles.join(' / ')}` : '目录: 暂无章节';
}
