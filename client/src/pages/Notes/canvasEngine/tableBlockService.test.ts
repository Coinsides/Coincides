import { describe, expect, it } from 'vitest';
import {
  TABLE_MAX_CHARACTERS, cloneTableBlockPayload, createDefaultTableBlockPayload,
  estimateTableBlockHeight, isTableDelimitedPaste, parseTableDelimitedText,
  readTableBlockPayload, tableBlockPlainText, tableBlockValidationError,
} from './tableBlockService';
import { XINING_REFORMS_TABLE } from './fixtures/xiningReformsTable';

describe('table v1 payload', () => {
  it('accepts header-only, unheaded and the nine-row Chinese specimen', () => {
    expect(tableBlockValidationError({ headers: ['Name'], rows: [] })).toBeNull();
    expect(tableBlockValidationError({ headers: [], rows: [['']] })).toBeNull();
    expect(tableBlockValidationError(XINING_REFORMS_TABLE)).toBeNull();
    expect(XINING_REFORMS_TABLE.rows).toHaveLength(9);
    expect(XINING_REFORMS_TABLE.headers).toHaveLength(3);
  });

  it('enforces rectangular plain-text cells and the declared payload keys', () => {
    expect(tableBlockValidationError({ headers: ['A', 'B'], rows: [['one']] })).toContain('same number');
    expect(tableBlockValidationError({ headers: [], rows: [] })).toBeTruthy();
    expect(tableBlockValidationError({ headers: ['A'], rows: [[1]] })).toContain('plain text');
    expect(tableBlockValidationError({ headers: ['A'], rows: [], caption: 3 })).toContain('plain text');
    expect(tableBlockValidationError({ headers: ['A'], rows: [], extra: true })).toContain('only');
  });

  it('accepts 64 columns and 64 data rows plus a header, but rejects either next boundary', () => {
    const headers = Array<string>(64).fill('');
    const rows = Array.from({ length: 64 }, () => [...headers]);
    expect(tableBlockValidationError({ headers, rows })).toBeNull();
    expect(tableBlockValidationError({ headers: [...headers, ''], rows: [] })).toContain('64 columns');
    expect(tableBlockValidationError({ headers, rows: [...rows, [...headers]] })).toContain('64 data rows');
  });

  it('counts caption, header and every cell together in UTF-16 code units', () => {
    const exact = { caption: '标题', headers: ['名'], rows: [['文'.repeat(TABLE_MAX_CHARACTERS - 5), '']] };
    exact.headers.push('目');
    exact.rows[0][1] = '值';
    expect(tableBlockValidationError(exact)).toBeNull();
    expect(tableBlockValidationError({ ...exact, caption: '标题多' })).toContain('65,536');
    expect(tableBlockValidationError({ headers: [], rows: [['😀'.repeat(TABLE_MAX_CHARACTERS / 2)]] })).toBeNull();
    expect(tableBlockValidationError({ headers: [], rows: [['😀'.repeat(TABLE_MAX_CHARACTERS / 2) + '多']] })).toContain('65,536');
  });

  it('reads only table payloads and gives each draft independent cells', () => {
    const payload = createDefaultTableBlockPayload();
    expect(tableBlockValidationError(payload)).toBeNull();
    expect(readTableBlockPayload({ block_type: 'table', content_json: { ...payload } })).toEqual(payload);
    expect(readTableBlockPayload({ block_type: 'media', content_json: { ...payload } })).toBeNull();
    expect(readTableBlockPayload({ block_type: 'table', content_json: {} })).toBeNull();
    const draft = cloneTableBlockPayload(payload);
    draft.rows[0][0] = 'changed';
    draft.headers[0] = 'changed';
    expect(payload.headers[0]).toBe('Column 1');
    expect(payload.rows[0][0]).toBe('');
  });

  it('flattens caption and cells to the read_note/search projection without mixing cell line breaks with rows', () => {
    expect(tableBlockPlainText({ caption: '题\n名', headers: ['甲\t乙', '丙'], rows: [['一\r\n二', '三'], ['四', '五']] }))
      .toBe('题 名\n甲 乙\t丙\n一 二\t三\n四\t五');
    expect(tableBlockPlainText({ caption: '', headers: [], rows: [['无表头']] })).toBe('无表头');
  });

  it('estimates tall content and typography changes without using TextFlow', () => {
    const short = { headers: [], rows: [['one']] };
    const tall = { headers: [], rows: [['one\ntwo\nthree']] };
    expect(estimateTableBlockHeight(tall, 300)).toBeGreaterThan(estimateTableBlockHeight(short, 300));
    expect(estimateTableBlockHeight(short, 300, { fontSizePx: 24, lineHeightPx: 32 }))
      .toBeGreaterThan(estimateTableBlockHeight(short, 300));
  });
});

describe('CSV and TSV table import', () => {
  it('handles quoted commas, doubled quotes, embedded newlines and final CRLF', () => {
    expect(parseTableDelimitedText('\uFEFFName,Detail\r\n"青苗,免役","line 1\r\nline ""2"""\r\n'))
      .toEqual({ headers: ['Name', 'Detail'], rows: [['青苗,免役', 'line 1\nline "2"']] });
  });

  it('detects TSV before CSV while preserving commas and padding short rows', () => {
    expect(parseTableDelimitedText('名称\t目的\t年份\n青苗法\t周转,互助\t1069\n免役法\t生产'))
      .toEqual({ headers: ['名称', '目的', '年份'], rows: [['青苗法', '周转,互助', '1069'], ['免役法', '生产', '']] });
    expect(parseTableDelimitedText('"甲\t乙"\t丙\n丁\t戊', false))
      .toEqual({ headers: [], rows: [['甲\t乙', '丙'], ['丁', '戊']] });
  });

  it('preserves the first row with no header, internal empty rows and trailing empty cells', () => {
    expect(parseTableDelimitedText('A,B\n\nC,\n', false))
      .toEqual({ headers: [], rows: [['A', 'B'], ['', ''], ['C', '']] });
  });

  it('reports incomplete quotes and import size limits without truncating', () => {
    expect(() => parseTableDelimitedText('A,B\n"unfinished,B')).toThrow('closing quote');
    expect(() => parseTableDelimitedText('A,B\n"one" tail,B')).toThrow('After a closing quote');
    expect(() => parseTableDelimitedText('')).toThrow('first');
    expect(() => parseTableDelimitedText(Array<string>(65).fill('a').join(','))).toThrow('64 columns');
    expect(() => parseTableDelimitedText(Array<string>(66).fill('a,b').join('\n'))).toThrow('64 data rows');
  });

  it('only auto-imports multiline delimited pastes, preserving ordinary multiline cell text', () => {
    expect(isTableDelimitedPaste('A,B\nC,D')).toBe(true);
    expect(isTableDelimitedPaste('A\tB\nC\tD')).toBe(true);
    expect(isTableDelimitedPaste('A,B')).toBe(false);
    expect(isTableDelimitedPaste('line one\nline two')).toBe(false);
    expect(isTableDelimitedPaste('"line,one\nline,two"')).toBe(false);
  });
});
