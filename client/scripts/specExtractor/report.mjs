/** Human-readable companion to the extractor's JSON; never applies suggested values. */

const METRIC_LABELS = {
  fontSizePx: '字号',
  lineHeightRatio: '行高比',
  letterSpacingEm: '字距',
  fontWeight: '字重',
  fontFamily: '字族栈',
};

const ROLE_LABELS = {
  body: '正文',
  paragraph: '正文',
  h1: '一级标题',
  h2: '二级标题',
  h3: '三级标题',
  h4: '四级标题',
  h5: '五级标题',
  h6: '六级标题',
  caption: '图注',
  folio: '页眉 / 页脚',
  tableCell: '表格 cell',
  table: '表格 cell',
  quote: '引文',
  blockquote: '引文',
  callout: '提示框',
  title: '封面题名',
  'heading-1': '一级标题',
  'heading-2': '二级标题',
  'heading-3': '三级标题',
  'heading-4': '四级标题',
  'heading-5': '五级标题',
  'heading-6': '六级标题',
  'table-caption': '表格标题',
  'table-cell': '表格正文',
  'table-header': '表头',
  'folio-header': '页眉',
  'folio-footer': '页脚',
};

function present(value) {
  if (value === null || value === undefined) return '未取得 / 不适用';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '未取得 / 不适用';
    return String(Object.is(value, -0) ? 0 : Number(value.toFixed(6)));
  }
  if (value === '') return '空值（未解析）';
  if (Array.isArray(value)) return value.length ? value.map(present).join('; ') : '无';
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => `${key}: ${present(item)}`).join('; ') || '无';
  }
  return String(value);
}

function cell(value) {
  return present(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;')
    .replaceAll('*', '&#42;')
    .replaceAll('_', '&#95;')
    .replaceAll('[', '&#91;')
    .replaceAll(']', '&#93;')
    .replaceAll('\\', '&#92;')
    .replace(/\r?\n/g, '<br>');
}

function table(headers, rows) {
  return [
    `| ${headers.map(cell).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
    '',
  ].join('\n');
}

function listing(values, empty = '无。') {
  if (!values?.length) return `${empty}\n`;
  return `${values.map((value) => `- ${cell(value)}`).join('\n')}\n`;
}

function nearestText(nearest) {
  if (!nearest) return '无可比较格点（不自动补值）';
  return `${present(nearest.id)} = ${present(nearest.value)}${nearest.source ? `；来源: ${present(nearest.source)}` : ''}`;
}

function distanceText(record) {
  if (record.distance === null || record.distance === undefined || !Number.isFinite(record.distance)) {
    return '未取得 / 不适用';
  }
  return `${present(record.distance)}${record.unit ? ` ${record.unit}` : ''}`;
}

function measurementRow(record) {
  return [
    record.raw,
    nearestText(record.nearest),
    distanceText(record),
    record.normalized,
    record.unit,
    record.frequency,
  ];
}

function signedDelta(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return present(value);
  return value > 0 ? `+${value}` : present(value);
}

function labeledEntries(object) {
  return Object.entries(object ?? {}).map(([key, value]) => [key, value]);
}

/**
 * Render an extraction report without mutating its input or consulting product files.
 * Missing values remain missing; in particular CSS `normal` is never rendered as zero.
 */
export function renderReport(report) {
  const roles = report.roles ?? [];
  const palette = report.palette ?? [];
  const spacing = report.spacing ?? [];
  const ratios = report.tableBodyRatios ?? [];
  const comparisons = report.comparisons ?? [];
  const normalization = report.normalization ?? {};
  const declarations = report.declarations ?? {};
  const sections = [
    '# T9 规格提取报告 · 首航候拍清单',
    '',
    '> 本报告仅提取、归一、列出最近产品格点与差值。所有候选均待 HQ / Henry 翻牌；工具未自动落值。',
    '',
    '## 来源与运行环境',
    '',
    table(['项', '值'], [
      ['数据结构版本', report.schemaVersion],
      ['标本路径（只读输入）', report.source?.path],
      ['标本 SHA-256', report.source?.sha256],
      ...labeledEntries(report.environment),
    ]),
    '## 同尺度归一',
    '',
    table(['项', '值'], [
      ['目标纸宽（px）', normalization.targetWidthPx],
      ['标本纸宽（CSS 声明解析，px）', normalization.specimenWidthPx],
      ['归一系数', normalization.factor],
      ['归一公式', normalization.formula],
      ['纸宽来源证据', normalization.paperEvidence],
      ['当前产品纸宽（px）', report.product?.paperWidthPx],
    ]),
    '字号的归一值用于同尺度比较；比例、字重和字族等非长度量按各自单位比较。归一只改变报告中的比较尺度，不改标本或产品。CSS 声明纸宽不等于浏览器实测纸盒宽度。',
    '',
    '## 测量面与覆盖',
    '',
    table(['测量面', '账目', '解释'], [
      ['角色字号、行高比、字距、字重、字族栈', '级联量', '按语义角色汇总声明 / 可解析计算样式；行高 normal、未解析值与缺失值保留 null；字距 normal 记0em排印基线。'],
      ['色板与文字 / 底 / 线分类', '级联量', '记录声明出现频次和应用频次；并非屏幕像素占比、可见面积或视觉显著度。'],
      ['间距声明值聚类', '级联量', '节奏候选，来源于 CSS 声明；不是实际盒距，不能证明 margin 折叠后的距离。'],
      ['表格 cell / 正文比', '级联量', '由可解析字号推导的比例；不是表格排版密度或文本占用率。'],
      ['实际盒距、真实行数与换行、字体实际命中', '布局量（未测）', 'jsdom 不提供真实排版，未以零尺寸或零距离代替测量。'],
    ]),
    table(['覆盖项', '统计 / 口径'], [
      ...labeledEntries(report.coverage),
      ['角色分组数', roles.length],
      ['色板条目数', palette.length],
      ['间距聚类条目数', spacing.length],
      ['表格 / 正文比例条目数', ratios.length],
      ['当前产品对照条目数', comparisons.length],
      ['CSS 声明数', declarations.count],
      ['标本 script 数（不执行）', declarations.scriptCount],
    ]),
    '### 解析与比较限制',
    '',
    listing(report.limitations, '未提供限制清单；不可据此认定无解析限制。'),
    '### 布局量（未测）清单',
    '',
    listing(report.layoutUnmeasured, '未提供明细；实际盒距、换行和字体渲染均不在本次 jsdom 测量范围内。'),
    '## 按语义角色提取（级联量）',
    '',
    '每条记录保留「原始值 / 最近产品格点 / 距离」三列。归一值是比较用数值；最近格点是候选，不是采用决定。频次与证据用于检查角色内部的分布。',
    '',
  ];

  if (!roles.length) sections.push('未提取到语义角色。', '');
  for (const role of roles) {
    const label = ROLE_LABELS[role.role] ?? role.role;
    sections.push(
      `### ${cell(label)}（${cell(role.role)}）`,
      '',
      `计数：${cell(role.count)}；角色根数：${cell(role.rootCount)}。`,
      '',
    );
    const rows = [];
    for (const [metric, records] of Object.entries(role.metrics ?? {})) {
      for (const record of records ?? []) {
        rows.push([
          METRIC_LABELS[metric] ?? metric,
          ...measurementRow(record),
          record.evidence,
          record.note ?? '—',
        ]);
      }
    }
    sections.push(rows.length
      ? table(['指标', '原始值', '最近产品格点', '距离', '归一 / 比较值', '单位', '频次', '证据', '说明'], rows)
      : '此角色无可报告指标。\n');
  }

  sections.push(
    '## 全局色板（级联量）',
    '',
    '分类项记录文字 text、底 background、线 line、其他 other 与 token 声明；应用分类 applied 独立列出。未应用声明仍可能出现在声明色板中。颜色距离的定义见运行环境 / 解析限制，不能直接当作感知色差。',
    '',
    palette.length
      ? table(['原始值', '最近产品格点', '距离', '归一 / 比较值', '单位', '声明频次', '声明分类', '应用分类', '证据', '说明'],
        palette.map((record) => [...measurementRow(record), record.categories, record.applied, record.evidence, record.note ?? '—']))
      : '未提取到色板条目。\n',
    '## 间距声明聚类（级联量；节奏候选）',
    '',
    spacing.length
      ? table(['原始值', '最近产品格点', '距离', '归一 / 比较值', '单位', '频次', '属性', '证据', '说明'],
        spacing.map((record) => [...measurementRow(record), record.properties, record.evidence, record.note ?? '—']))
      : '未提取到间距声明。\n',
    '## 表格 cell / 正文比（级联推导量）',
    '',
    ratios.length
      ? table(['原始值', '最近产品格点', '距离', '归一 / 比较值', '单位', '频次', '证据', '说明'],
        ratios.map((record) => [...measurementRow(record), record.evidence, record.note ?? '—']))
      : '未取得可比较的表格 cell / 正文比；未补造比例。\n',
    '## 当前产品逐项 delta 对照 · 待 HQ / Henry 翻牌',
    '',
    'delta = 标本同尺度值 − 当前产品同尺度值；正值表示标本更大，负值表示标本更小。字号的「当前产品值」为产品内部逻辑 px；其余字号数值与 delta 为 px@900。非数值或不可比较项保留原值与原因，不填写伪数值。表内每行都是候拍信息，未触发 profile、token、CSS 或装订件的写回。',
    '',
    comparisons.length
      ? table(['对照项', '角色', '指标', '当前产品值', '产品同尺度值', '标本同尺度值', 'delta', '单位', '产品来源', '说明'],
        comparisons.map((record) => [
          record.id,
          record.role,
          METRIC_LABELS[record.metric] ?? record.metric,
          record.productValue,
          record.productNormalized,
          record.specimenValue,
          signedDelta(record.delta),
          record.unit,
          record.source,
          record.note ?? '—',
        ]))
      : '没有可用产品对照；本次不能据此判断产品与标本一致。\n',
    '### 产品值来源',
    '',
    Array.isArray(report.product?.sources)
      ? listing(report.product.sources)
      : table(['来源', '信息'], labeledEntries(report.product?.sources)),
    '### 当前产品对照口径',
    '',
    listing(report.product?.notes),
    '## 解析诊断与排除项',
    '',
    listing(report.diagnostics, '无已记录诊断。'),
    '### 排除的规则',
    '',
    declarations.excludedRules?.length
      ? table(['选择器', '条件', '排除原因'], declarations.excludedRules.map((rule) => [rule.selector, rule.condition, rule.reason]))
      : '无已记录排除规则。\n',
    '### 外部样式表',
    '',
    listing(declarations.externalStylesheets, '无已记录外部样式表。'),
    '## 本次未做',
    '',
    '- 未写回产品值；未替 HQ / Henry 作采用决定。',
    '- 未修改标本；未执行其中的脚本或请求远程模型。',
    '- 未做浏览器布局、真实换行、实际字体命中或主观视觉验收。',
    '- 本报告不替代测试与验证门回执；验证结果另见本工单 Result 与原始日志。',
    '',
  );
  return `${sections.join('\n').trimEnd()}\n`;
}
