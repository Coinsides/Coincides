import { describe, expect, it } from 'vitest';
import { appendInlineLink, readInlineLinkTarget, type InlineLinkTarget } from './inlineLinkService';
import { createTextBlockContentV1, projectTextFlowContent, replaceTextUnitText, TEXT_FLOW_CONTENT_KEY } from './textFlowService';
import { mergeTextUnitWithPrevious, splitTextUnitForEnter } from './textUnitEditorService';
import { NOTE_INSERT_COMMANDS, NOTE_SLASH_COMMANDS } from '../noteSlashCommands';
import { buildTextSelectionMenu } from './commandSurfaceService';

const targets: InlineLinkTarget[] = [
  { target_kind: 'heading', block_id: 'heading', unit_id: 'unit' },
  { target_kind: 'block', block_id: 'block' }, { target_kind: 'note', note_id: 'note' },
];
describe('T6 existing inline_link activation', () => {
  it.each(targets)('creates $target_kind with selected UTF-16 evidence and no new truth fields', (target) => {
    const flow = createTextBlockContentV1('前👩‍🔬后文');
    const next = appendInlineLink(flow, { blockId: 'b', textFlowId: 'textflow-b', textUnitId: 'tu-1',
      startOffset: 2, endOffset: 3, text: flow.units[0].text }, target, 'link')!;
    expect(next.inline_structures).toEqual([{ id: 'link', semantic_kind: 'inline_link', parent_text_unit_id: 'tu-1',
      anchor_text: '👩‍🔬', anchor_range: { start: 1, end: 6 }, field_values: target, metadata: {}, status: 'active' }]);
    expect(next.units).toBe(flow.units);
    expect(flow.inline_structures).toEqual([]);
    expect(readInlineLinkTarget(next.inline_structures[0].field_values)).toEqual(target);
    expect(projectTextFlowContent({ [TEXT_FLOW_CONTENT_KEY]: next }, '').plain_text).toBe(flow.units[0].text);
  });
  it('refuses stale or empty selections without rewriting body text', () => {
    const flow = createTextBlockContentV1('new body');
    const selection = { blockId: 'b', textFlowId: 'textflow-b', textUnitId: 'tu-1', startOffset: 0, endOffset: 3, text: 'old body' };
    expect(appendInlineLink(flow, selection, targets[0])).toBeNull();
    expect(appendInlineLink(flow, { ...selection, text: 'new body', endOffset: 0 }, targets[0])).toBeNull();
  });
  it.each(targets)('uses unchanged B8 retention, split/merge and in-anchor degradation for $target_kind', (target) => {
    const flow = createTextBlockContentV1('ab LINK cd');
    const linked = appendInlineLink(flow, { blockId: 'b', textFlowId: 'textflow-b', textUnitId: 'tu-1',
      startOffset: 3, endOffset: 7, text: flow.units[0].text }, target, 'link')!;
    const shifted = replaceTextUnitText({ textFlow: linked, textUnitId: 'tu-1', nextText: '!ab LINK cd',
      edit: { editedStartOffset: 0, editedEndOffset: 0, replacementText: '!' } });
    expect(shifted.inline_structures[0].anchor_range).toEqual({ start: 4, end: 8 });
    const split = splitTextUnitForEnter(shifted, 'tu-1', 3);
    const merged = mergeTextUnitWithPrevious(split, split.units[1].id);
    expect(merged.inline_structures).toEqual(shifted.inline_structures);
    const damaged = replaceTextUnitText({ textFlow: shifted, textUnitId: 'tu-1', nextText: '!ab LXNK cd',
      edit: { editedStartOffset: 5, editedEndOffset: 6, replacementText: 'X' } });
    expect(damaged.inline_structures[0]).toMatchObject({ anchor_range: null, anchor_text: 'LINK', field_values: target,
      metadata: { pre_edit_offsets: { text_unit_id: 'tu-1', start_offset: 4, end_offset: 8, range_text_cache: 'LINK' } } });
  });
  it('adds exactly one shared command while retaining the eight incumbent menu/slash objects and disabled kinds', () => {
    const old = [
      ['insert-table', '表格', 'table', ['table'], 'Insert table'],
      ['insert-timeline', '时间线', 'timeline', ['timeline'], 'Insert timeline'],
      ['insert-bar-chart', '柱图', 'chart_bar', ['bar', 'chart'], 'Insert bar chart'],
      ['insert-line-chart', '折线图', 'chart_line', ['line', 'chart'], 'Insert line chart'],
      ['insert-media', '媒体图', 'media', ['image', 'media']],
      ['quote-frame', '引文框', 'quote_frame', ['quoteframe']],
      ['callout-frame', '提示框', 'callout_frame', ['callout']],
      ['insert-toc', '目录', 'toc', ['toc', 'contents', 'agenda']],
    ].map(([id, label, insertAction, keywords, tooltip]) => ({ id, label, insertAction, keywords,
      ...(tooltip ? { tooltip } : {}), group: 'default', commandKind: 'insert_structure',
      objectKind: 'structured_block', description: `${label} · 与插入菜单相同的入口。` }));
    expect(NOTE_INSERT_COMMANDS.filter((command) => command.insertAction !== 'link')).toEqual(old);
    for (const command of NOTE_INSERT_COMMANDS) expect(NOTE_SLASH_COMMANDS.find((entry) => entry.id === command.id)).toBe(command);
    expect(NOTE_INSERT_COMMANDS).toHaveLength(9);
    expect(NOTE_INSERT_COMMANDS[NOTE_INSERT_COMMANDS.length - 1]).toMatchObject({ label: '链接到…', requiresSelection: true });
    expect(buildTextSelectionMenu().find((entry) => entry.id === 'inline')!.children?.map((entry) => [entry.actionId, entry.disabled]))
      .toEqual([['inline_formula', true], ['inline_code', true]]);
  });
});
