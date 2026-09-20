import type { NoteBlock } from './runtimeDataTypes';
import type { DocumentTypographyProfile } from './types';

/** Table v1 is plain text; no TextFlow, formulas, spans or column types. */
export interface TableBlockPayload {
  caption?: string;
  headers: string[];
  rows: string[][];
}

export const TABLE_MAX_COLUMNS = 64;
export const TABLE_MAX_ROWS = 64;
export const TABLE_MAX_CHARACTERS = 65_536;

export function tableBlockValidationError(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Table content must be an object.';
  const table = value as Record<string, unknown>;
  if (Object.keys(table).some((key) => !['caption', 'headers', 'rows'].includes(key))) {
    return 'Table content supports only caption, headers and rows.';
  }
  if (table.caption !== undefined && typeof table.caption !== 'string') return 'The caption must be plain text.';
  if (!Array.isArray(table.headers) || !table.headers.every((cell) => typeof cell === 'string')) {
    return 'Table headers must be an array of plain text cells.';
  }
  if (!Array.isArray(table.rows) || !table.rows.every((row) => Array.isArray(row)
    && row.every((cell) => typeof cell === 'string'))) return 'Table rows must contain plain text cells.';
  const headers = table.headers as string[];
  const rows = table.rows as string[][];
  const columns = headers.length || rows[0]?.length || 0;
  if (columns < 1 || columns > TABLE_MAX_COLUMNS) return `Use 1–${TABLE_MAX_COLUMNS} columns.`;
  if (rows.length > TABLE_MAX_ROWS) return `Use at most ${TABLE_MAX_ROWS} data rows (plus an optional header).`;
  if (!headers.length && !rows.length) return 'Keep at least one table row.';
  if (rows.some((row) => row.length !== columns)) return 'Every table row must have the same number of columns.';
  const characters = (typeof table.caption === 'string' ? table.caption.length : 0)
    + headers.reduce((sum, cell) => sum + cell.length, 0)
    + rows.reduce((sum, row) => sum + row.reduce((count, cell) => count + cell.length, 0), 0);
  if (characters > TABLE_MAX_CHARACTERS) return `Table text exceeds ${TABLE_MAX_CHARACTERS.toLocaleString('en-US')} UTF-16 characters.`;
  return null;
}

export function readTableBlockPayload(block: Pick<NoteBlock, 'block_type' | 'content_json'>): TableBlockPayload | null {
  if (block.block_type !== 'table' || tableBlockValidationError(block.content_json)) return null;
  return block.content_json as unknown as TableBlockPayload;
}

export function createDefaultTableBlockPayload(): TableBlockPayload {
  return { headers: ['Column 1', 'Column 2'], rows: [['', ''], ['', '']] };
}

export function cloneTableBlockPayload(payload: TableBlockPayload): TableBlockPayload {
  return { ...(payload.caption !== undefined ? { caption: payload.caption } : {}),
    headers: [...payload.headers], rows: payload.rows.map((row) => [...row]) };
}

/** Same lossy projection as read_note: one caption line, then tab-separated rows. */
export function tableBlockPlainText(payload: TableBlockPayload): string {
  const flatten = (value: string) => value.replace(/\r\n|[\t\r\n]/g, ' ');
  return [
    ...(payload.caption ? [flatten(payload.caption)] : []),
    ...(payload.headers.length ? [payload.headers.map(flatten).join('\t')] : []),
    ...payload.rows.map((row) => row.map(flatten).join('\t')),
  ].join('\n');
}

function tableDelimiter(text: string): '\t' | ',' | null {
  let quoted = false;
  let comma = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') index += 1;
      else quoted = !quoted;
    } else if (!quoted && character === '\t') return '\t';
    else if (!quoted && character === ',') comma = true;
  }
  return comma ? ',' : null;
}

export function isTableDelimitedPaste(text: string): boolean {
  return /[\r\n]/.test(text) && tableDelimiter(text) !== null;
}

/** CSV/TSV: quoted delimiters/newlines, doubled quotes, CRLF, ragged-row padding. */
export function parseTableDelimitedText(text: string, hasHeaders = true): TableBlockPayload {
  const source = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (!source) throw new Error('Paste CSV or TSV text first.');
  const delimiter = tableDelimiter(source) ?? ',';
  const grid: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  const finishCell = () => { row.push(cell); cell = ''; closedQuote = false; };
  const finishRow = () => { finishCell(); grid.push(row); row = []; };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character !== '"') cell += character;
      else if (source[index + 1] === '"') { cell += '"'; index += 1; }
      else { quoted = false; closedQuote = true; }
    } else if (character === delimiter) finishCell();
    else if (character === '\n') finishRow();
    else if (character === '"' && !cell && !closedQuote) quoted = true;
    else {
      if (closedQuote) throw new Error('After a closing quote, use a delimiter or a new line.');
      cell += character;
    }
  }
  if (quoted) throw new Error('A quoted cell is missing its closing quote.');
  if (cell || row.length || closedQuote || !source.endsWith('\n')) finishRow();
  const width = Math.max(...grid.map((cells) => cells.length));
  if (width > TABLE_MAX_COLUMNS || grid.length > TABLE_MAX_ROWS + (hasHeaders ? 1 : 0)) {
    throw new Error(`Import supports ${TABLE_MAX_COLUMNS} columns and ${TABLE_MAX_ROWS} data rows, plus an optional header.`);
  }
  const rectangular = grid.map((cells) => [...cells, ...Array<string>(width - cells.length).fill('')]);
  const result = { headers: hasHeaders ? rectangular[0] : [], rows: hasHeaders ? rectangular.slice(1) : rectangular };
  const error = tableBlockValidationError(result);
  if (error) throw new Error(error);
  return result;
}

/** Initial layout estimate only; the existing measurement hook replaces it with DOM height. */
export function estimateTableBlockHeight(payload: TableBlockPayload, width: number,
  typography?: Pick<DocumentTypographyProfile, 'fontSizePx' | 'lineHeightPx'>): number {
  const fontSize = Math.max(8, (typography?.fontSizePx ?? 15) - 2);
  const lineHeight = Math.max(fontSize, (typography?.lineHeightPx ?? 22) - 2);
  const allRows = [...(payload.headers.length ? [payload.headers] : []), ...payload.rows];
  const columns = allRows[0]?.length ?? 1;
  const cellWidth = Math.max(fontSize * 8, Math.min(fontSize * 24, width / columns)) - 20;
  const textWidth = (text: string) => Array.from(text).reduce((sum, character) => sum
    + (character.codePointAt(0)! > 255 ? fontSize : fontSize * 0.55), 0);
  const lineCount = (text: string, available: number) => text.split(/\r\n?|\n/)
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(textWidth(line) / Math.max(1, available))), 0);
  const captionHeight = payload.caption ? lineCount(payload.caption, width) * lineHeight + 10 : 0;
  return Math.ceil(captionHeight + allRows.reduce((sum, cells) => sum
    + Math.max(1, ...cells.map((cellText) => lineCount(cellText, cellWidth))) * lineHeight + 17, 0) + 1);
}
