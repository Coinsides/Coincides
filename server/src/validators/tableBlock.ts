import { z } from 'zod';

export const TABLE_MAX_COLUMNS = 64;
export const TABLE_MAX_ROWS = 64;
export const TABLE_MAX_TEXT_LENGTH = 65536;

/** Plain-text cells only; an empty headers array means the header is disabled. */
export const tableBlockContentSchema = z.object({
  caption: z.string().optional(),
  headers: z.array(z.string()).max(TABLE_MAX_COLUMNS),
  rows: z.array(z.array(z.string()).min(1).max(TABLE_MAX_COLUMNS)).max(TABLE_MAX_ROWS),
}).strict().superRefine((table, ctx) => {
  const width = table.headers.length || table.rows[0]?.length || 0;
  if (width === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['rows'], message: 'A table must contain at least one row or a header' });
  }
  table.rows.forEach((row, index) => {
    if (row.length !== width) ctx.addIssue({ code: z.ZodIssueCode.custom,
      path: ['rows', index], message: 'Every table row must have the same number of columns' });
  });
  const textLength = (table.caption?.length ?? 0)
    + table.headers.reduce((length, cell) => length + cell.length, 0)
    + table.rows.reduce((length, row) => length + row.reduce((count, cell) => count + cell.length, 0), 0);
  if (textLength > TABLE_MAX_TEXT_LENGTH) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Table text exceeds 65536 UTF-16 code units' });
  }
});

export type TableBlockContent = z.infer<typeof tableBlockContentSchema>;
