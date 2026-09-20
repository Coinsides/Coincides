import { tableBlockContentSchema } from '../validators/tableBlock.js';

export function assertTableBlockContent(input: { block_type: string; content_json?: unknown }): void {
  if (input.block_type === 'table') tableBlockContentSchema.parse(input.content_json);
}

/** read_note v1: caption, optional header, then TSV rows; embedded whitespace is flattened. */
export function tableBlockPlainText(content: unknown): string {
  const result = tableBlockContentSchema.safeParse(content);
  if (!result.success) return '';
  const table = result.data;
  const flatten = (cell: string) => cell.replace(/\r\n|[\t\r\n]/g, ' ');
  return [
    ...(table.caption ? [flatten(table.caption)] : []),
    ...(table.headers.length ? [table.headers.map(flatten).join('\t')] : []),
    ...table.rows.map((row) => row.map(flatten).join('\t')),
  ].join('\n');
}
