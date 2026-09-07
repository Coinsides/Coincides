import type { Census, CoordinateDecision, ShadowPlan } from './model.js';

export interface ShadowReport {
  version: 'v13.2-s3';
  mode: 'synthetic' | 'explicit_readonly_database';
  scopeUserId: string;
  evidence: {
    readonlyConnection: boolean;
    queryOnly: boolean;
    statementsReadonly: boolean;
    totalChangesBefore: number;
    totalChangesAfter: number;
    censusSha256: string;
  };
  census: Census;
  shadow: ShadowPlan;
}

function cell(value: unknown): string {
  return String(value ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\|/g, '&#124;').replace(/`/g, '&#96;').replace(/[\r\n]/g, ' ');
}
function table(headers: string[], rows: unknown[][]): string {
  return ['| ' + headers.map(cell).join(' | ') + ' |', '| ' + headers.map(() => '---').join(' | ') + ' |',
    ...rows.map(row => '| ' + row.map(cell).join(' | ') + ' |')].join('\n');
}
function interpretationCell(coordinate: CoordinateDecision, name: string): string {
  const g = coordinate.interpretations.find(row => row.interpretation === name);
  if (!g) return '缺解释';
  // Retain all pages, including ties and different stacks. No best-page tie breaking.
  const scores = g.page_scores.filter(p => p.ratio > 0)
    .map(p => `${p.frame}@${p.stack ?? '<unstacked>'}:${p.rect} (${p.ratio})`).join('; ') || '无相交页';
  return `${g.state} / ${g.page_state}; ${scores}; 主帧比=${g.primary_ratio ?? 'unknown'}`;
}

export function renderMarkdown(report: ShadowReport): string {
  const { census, shadow, evidence } = report;
  const title = report.mode === 'synthetic' ? '合成演练' : '显式只读 census';
  const lines = [
    '> **状态 (Status)**: frozen',
    '> **层 (Layer)**: 审计 / dry-run 收据',
    '> **权威 (Authoritative)**: 否；只读候选与合成验证，不是迁移放行',
    '', `# V13.2 单 3 · ${title}核对单`, '',
    `user scope: ${cell(report.scopeUserId)}。工具版本 ${report.version}。`, '',
    '本次为 dry-run；所有“after”均为预计保留的行身份，不是迁移后实测。P/O/M 是三张表的独立分母，不相加冒称内容件数。',
    'crossing 一律托盘；50% 参数只产诊断，不启用收编。legacy 原地封存；page_frame 结构行只进原始三表守恒。',
    '去处未明的行保留原地并明确列入待核；守恒通过不表示这些行已裁决。坐标定案仅表示三解释的完整归页结果一致，不选择坐标来源或单个最佳页。',
    '', '## 只读证据', '',
    `readonly=${evidence.readonlyConnection}; query_only=${evidence.queryOnly}; SELECT readonly=${evidence.statementsReadonly}; total_changes=${evidence.totalChangesBefore}→${evidence.totalChangesAfter}。`,
    `census SHA-256: ${evidence.censusSha256}`, '',
    `参数 adoptionThreshold=${shadow.policy.adoptionThreshold}（diagnostic only）；adoptionEnabled=false。`,
    `三表守恒：${shadow.conservationOk ? '全部全等' : '失败'}。placement 歧义 ${shadow.ambiguousPlacements.length}；legacy 歧义 ${shadow.ambiguousLegacy.length}；去处待核 ${shadow.destinationReviews.length} 行。`,
    `全局无主 note 的 legacy 行数（无法划归 user scope，只返回数量）：${census.unscopable_legacy_note_rows}。`,
    '', '## 逐 note 内容矩阵', '',
    table(['note', 'inside 块', 'crossing 块', 'crossing 收编 / 托盘 / 原地（含待核）', 'outside 块', '画物 / 野地画物', 'mount / 野地独占 / mixed', '坐标 定案 / 歧义 / 不适用'],
      census.note_matrix.map(n => {
        const placements = census.placement_inventory.filter(p => p.note === n.note);
        const crossingIds = new Set(placements.filter(p => p.kind === 'paragraph_block_projection' && p.boundary === 'crossing').map(p => p.id));
        const plans = shadow.rows.filter(r => r.note === n.note && r.unit === 'placement');
        const crossing = plans.filter(r => crossingIds.has(r.id));
        return [n.note, n.inside_blocks, n.crossing_blocks,
          ['adopt', 'tray_block', 'original'].map(d => crossing.filter(r => r.route.destination === d).length).join(' / '),
          n.outside_blocks, `${n.drawing_objects} / ${n.wilderness_drawing_objects}`,
          `${n.mounts} / ${n.wilderness_only_mounts} / ${n.mixed_surface_mounts}`,
          ['settled', 'ambiguous', 'not_applicable'].map(s => plans.filter(r => r.coordinate?.status === s).length).join(' / ')];
      })),
    '', '## 逐表守恒（每行一次，预计 after）', '',
    table(['note', '表单位', 'before', '原地（含保留待核）', '收编', '托盘', 'after', '其中待核', '严格全等'],
      shadow.conservation.map(c => [c.note, c.unit, c.before, c.original, c.adopt, c.tray, c.after,
        c.reviewRetained, c.ok ? '✓' : `✗ ${c.errors.join(',')}`])),
    '', '## legacy 分母（封存，不并入三表）', '',
    table(['note', 'legacy 行', 'legacy-only', 'legacy-ambiguous', 'dual-any', 'dual-active'],
      census.denominators.map(d => [d.note, d.legacy_rows, d.legacy_only, d.legacy_ambiguous, d.dual_any, d.dual_active])),
    '', '## 去处分配明细', '',
    table(['note', '单位', '行 ID', '预计去处', '依据', '需人裁', '坐标判定'],
      shadow.rows.map(r => [r.note, r.unit, r.id, r.route.destination, r.route.reason,
        r.route.reviewRequired ? '是（留置保全）' : '否', r.coordinate?.status])),
    '', '## 坐标歧义清单（三解释全部保留）', '',
    table(['note', '单位', '行 ID', '原因', 'world', 'local', 'mixed (x-local + y-world)'],
      [...shadow.ambiguousPlacements.map(r => ({ ...r, coordinate: r.coordinate! })),
        ...shadow.ambiguousLegacy.map(r => ({ ...r, unit: 'legacy' }))]
        .map(r => [r.note, r.unit, r.id, r.coordinate.reason,
          ...['world', 'local', 'mixed'].map(name => interpretationCell(r.coordinate, name))])),
    '', '## 未执行', '',
    '未迁移、未建备份表、未改坐标、未写 events、未改产品行为或 UI；未开启 crossing 收编。真实用户库执行留 HQ/Henry 扳机日。',
    '未测真实存量或大库耗时；旋转/坏帧/无绑定等只报告证据不足。当前文件不能替代坐标消费链切换、真实迁移后复测或人工验收。', '',
  ];
  return lines.join('\n');
}
