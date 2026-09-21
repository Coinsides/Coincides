import type { Proposal, ProposalType } from '@shared/types';

const types = {
  note_patch: { label: '笔记修订', field: 'patches', unit: '处修订' },
  study_plan: { label: '学习计划', field: 'items', unit: '项任务' },
  batch_cards: { label: '卡片', field: 'items', unit: '张卡片' },
  schedule_adjustment: { label: '日程调整', field: 'items', unit: '项调整' },
  goal_breakdown: { label: '目标拆解', field: 'items', unit: '项目标 / 任务' },
  time_block_setup: { label: '时间块', field: 'items', unit: '个时间块' },
  material_map: { label: '材料地图', field: 'segments', unit: '个片段' },
  organized_note: { label: '整理笔记', field: 'blocks', unit: '个内容块' },
  material_reconciliation: { label: '材料协调', field: 'candidate_groups', unit: '组候选' },
} satisfies Record<ProposalType, { label: string; field: string; unit: string }>;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function text(value: unknown): string {
  if (typeof value !== 'string') return '';
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 160 ? `${normalized.slice(0, 160)}…` : normalized;
}

export function describeOrganizedNoteBlock(value: unknown) {
  const block = record(value);
  const content = record(block.content_json);
  const params = record(content.params);
  const furniture = record(record(block.display_overrides_json).paragraph_furniture_v1);
  let label = '文字';
  if (block.block_type === 'table') {
    const rows = Array.isArray(content.rows) ? content.rows : [];
    const headers = Array.isArray(content.headers) ? content.headers : [];
    const width = headers.length || (Array.isArray(rows[0]) ? rows[0].length : 0);
    label = `表格 ${rows.length}×${width}（数据行×列）`;
  } else if (block.block_type === 'component') {
    if (content.component_kind === 'timeline') label = `时间线 ${Array.isArray(params.entries) ? params.entries.length : 0} 条目`;
    else if (content.component_kind === 'chart_bar' || content.component_kind === 'chart_line') {
      label = `${content.component_kind === 'chart_bar' ? '柱状图' : '折线图'} ${Array.isArray(params.series) ? params.series.length : 0} 组 · ${Array.isArray(params.x_labels) ? params.x_labels.length : 0} 点`;
    } else label = '未知组件（采纳时降级为文字）';
  } else if (block.block_type === 'toc') label = '目录';
  else if (furniture.variant === 'quote') label = ['引文', text(furniture.source)].filter(Boolean).join(' · ');
  else if (furniture.variant === 'callout') label = ['提示框', text(furniture.label)].filter(Boolean).join(' · ');
  return { label, text: block.block_type === 'toc' ? '' : text(block.title) || text(block.plain_text),
    warnings: Array.isArray(block.warnings) ? block.warnings.filter((warning): warning is string => typeof warning === 'string') : [] };
}

export function describeProposal(proposal: Proposal) {
  // The persisted queue can also contain retired types. Only the eight current
  // handlers in server/src/routes/proposals.ts are offered an apply action.
  const definition = Object.prototype.hasOwnProperty.call(types, proposal.type) ? types[proposal.type] : undefined;
  const data = record(proposal.data);
  const rawEntries = definition ? data[definition.field] : undefined;
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const first = record(entries[0]);
  let preview = text(first.title);
  if (proposal.type === 'time_block_setup') {
    preview = [text(first.label), text(first.date), [text(first.start_time), text(first.end_time)].filter(Boolean).join('–')].filter(Boolean).join(' · ');
  } else if (proposal.type === 'study_plan') {
    preview = [preview, text(first.scheduled_date) || text(first.date)].filter(Boolean).join(' · ');
  } else if (proposal.type === 'schedule_adjustment') {
    preview = [preview, text(first.date), text(first.priority), text(first.status)].filter(Boolean).join(' · ');
  } else if (proposal.type === 'goal_breakdown') {
    preview = [text(first.type), preview, text(first.deadline)].filter(Boolean).join(' · ');
  } else if (proposal.type === 'batch_cards') {
    preview = [preview, text(first.template_type)].filter(Boolean).join(' · ');
  } else if (proposal.type === 'organized_note') {
    preview ||= text(first.plain_text);
  } else if (proposal.type === 'material_map') {
    preview ||= text(first.summary);
  }
  const reviewOnly = proposal.type === 'material_reconciliation';
  return {
    label: definition?.label || '其他提案',
    summary: text(data.title) || text(data.description) || preview || '未提供摘要',
    description: text(data.title) ? text(data.description) : '',
    detail: definition ? [Array.isArray(rawEntries) ? `${entries.length} ${definition.unit}` : '', preview].filter(Boolean).join(' · ') : '',
    canApply: !!definition && proposal.type !== 'note_patch',
    applyLabel: reviewOnly ? '标记已复核' : '采纳',
    applyMessage: reviewOnly ? '提案已标记复核，未采纳候选证据' : '提案已采纳',
    notice: proposal.type === 'note_patch' ? '逐块查看旧文与新文。采纳由笔记编辑器执行，可在笔记中撤销。' : !definition ? '此类提案暂不支持一键采纳'
      : reviewOnly ? '这里只标记已复核，不采纳候选证据。逐组决策请在项目材料页处理。' : '',
    blocks: proposal.type === 'organized_note' ? entries.map(describeOrganizedNoteBlock) : [],
    warnings: proposal.type === 'organized_note' && Array.isArray(data.warnings)
      ? data.warnings.filter((warning): warning is string => typeof warning === 'string') : [],
  };
}

export function proposalTime(value: string) {
  // SQLite's CURRENT_TIMESTAMP is UTC without a zone suffix.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? { dateTime: undefined, label: '时间未知' }
    : { dateTime: date.toISOString(), label: date.toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }) };
}
