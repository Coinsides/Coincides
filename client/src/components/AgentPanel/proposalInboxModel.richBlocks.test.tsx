import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Proposal } from '@shared/types';
import ProposalInbox from './ProposalInbox';
import { describeOrganizedNoteBlock } from './proposalInboxModel';

const richBlocks = [
  { block_type: 'table', content_json: { headers: ['A', 'B'], rows: [['1', '2'], ['3', '4'], ['5', '6']] } },
  { block_type: 'component', content_json: { component_kind: 'timeline', params: { entries: [{ year: '1069', label: '新法' }, { year: '1072', label: '方田' }] } } },
  { block_type: 'component', content_json: { component_kind: 'chart_bar', params: { x_labels: ['A', 'B', 'C'], series: [{ name: 'N', values: [1, 2, 3] }] } } },
  { block_type: 'component', content_json: { component_kind: 'chart_line', params: { x_labels: ['A'], series: [{ name: 'N', values: [1] }, { name: 'M', values: [2] }] } } },
  { block_type: 'toc', content_json: {} },
  { block_type: 'paragraph', plain_text: '引用原文', display_overrides_json: { paragraph_furniture_v1: { variant: 'quote', source: '宋史' } } },
  { block_type: 'paragraph', plain_text: '注意事项', display_overrides_json: { paragraph_furniture_v1: { variant: 'callout', label: '注意' } } },
  { block_type: 'paragraph', plain_text: '降级后仍保留原文', warnings: ['Block 8: unsupported block_type; downgraded to paragraph.'] },
];
describe('organized-note honest rich-block summaries', () => {
  it('derives counts from live payloads, including headerless and header-only tables', () => {
    expect(richBlocks.map(block => describeOrganizedNoteBlock(block).label)).toEqual([
      '表格 3×2（数据行×列）', '时间线 2 条目', '柱状图 1 组 · 3 点', '折线图 2 组 · 1 点', '目录', '引文 · 宋史', '提示框 · 注意', '文字',
    ]);
    expect(describeOrganizedNoteBlock({ block_type: 'table', content_json: { headers: [], rows: [['A', 'B', 'C']] } }).label).toBe('表格 1×3（数据行×列）');
    expect(describeOrganizedNoteBlock({ block_type: 'table', content_json: { headers: ['A'], rows: [] } }).label).toBe('表格 0×1（数据行×列）');
    expect(describeOrganizedNoteBlock({ block_type: 'component', content_json: { component_kind: 'future' } }).label).toContain('采纳时降级');
  });
  it('shows every block summary and warning, and keeps apply/discard as explicit human actions', () => {
    const proposal = { id: 'rich', user_id: 'user', type: 'organized_note', status: 'pending',
      created_at: '2026-09-21T00:00:00Z', resolved_at: null, conversation_id: 'chat',
      data: { title: '宋史笔记', blocks: richBlocks, warnings: ['降级已记账'] } } as Proposal;
    const resolve = vi.fn().mockResolvedValue(undefined);
    render(<ProposalInbox proposals={[proposal]} loading={false} error="" busy={{}}
      refresh={vi.fn()} resolve={resolve} onClose={vi.fn()} />);
    expect(resolve).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('查看内容块摘要（8）'));
    for (const label of ['表格 3×2', '时间线 2 条目', '柱状图 1 组', '折线图 2 组', '目录', '引文 · 宋史', '提示框 · 注意', '降级后仍保留原文']) {
      expect(screen.getByText(new RegExp(label))).toBeTruthy();
    }
    expect(screen.getByText(/unsupported block_type/)).toBeTruthy();
    expect(screen.getByText('降级已记账')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '采纳' }));
    expect(resolve).toHaveBeenCalledWith(proposal, 'apply');
    fireEvent.click(screen.getByRole('button', { name: '丢弃' }));
    expect(resolve).toHaveBeenCalledWith(proposal, 'discard');
  });
});
