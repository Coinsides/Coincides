import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.cwd());
const scratch = join(root, '.codex-tmp/t4-bloodline');
const engine = 'client/src/pages/Notes/canvasEngine/';
const audit = join(root, 'docs/audits/2026-09-21-t4-bloodline-builder');
const slash = value => value.replaceAll('\\', '/');
function enumerate(directory) {
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error(`Linked input: ${directory}/${entry.name}`);
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? enumerate(path) : [path];
  });
}
const all = enumerate(engine.slice(0, -1)).sort();
const candidates = all.filter(path => /\.(?:ts|tsx|css)$/.test(path) && !/\.test\./.test(path));
candidates.push('client/src/pages/Notes/NoteDetail.module.css');
const colors = /#[\da-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\([^\n]*?\)/g;
const fontLocations = {
  'blocks/ParagraphFurniture.module.css': { 9: ['Aptos, Calibri, "Segoe UI", Arial, sans-serif'] },
  'layers/PageFrameSlotsLayer.tsx': { 13: ['Georgia, serif', 'Arial, sans-serif', 'monospace'] },
  'typographyProfileService.ts': { 21: ['Aptos, Calibri, "Segoe UI", Arial, sans-serif'], 37: ['Arial, sans-serif'], 42: ['Georgia, serif'], 47: ['"Times New Roman", Times, serif'], 52: ['Cambria, Georgia, serif'], 57: ['Consolas, "Courier New", monospace'], 62: ['Inter, "Segoe UI", Arial, sans-serif'] },
  'typographyMeasurementService.ts': { 111: ['ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace'] },
  '../NoteDetail.module.css': { 1540: ['Aptos, Calibri, "Segoe UI", Arial, sans-serif'], 3648: ['Aptos, Calibri, "Segoe UI", Arial, sans-serif'], 3790: ["ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"], 3802: ["ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace"], 4571: ['ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'], 4900: ['ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'], 5234: ['ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'] },
};
const sourceFiles = new Set(['paperSkinDefaults.css', 'paperSkinStyles.ts', 'pageFrameTemplateService.ts', 'typographyProfileService.ts']);
const supplyFiles = new Set(['annotationColorService.ts', 'freehandService.ts', 'objectStyleService.ts', 'typographyMeasurementService.ts']);
const paperLayers = new Set(['AnnotationOverlayLayer', 'BlockEditorLayer', 'BlockSourceReferenceLayer', 'BlockStatusBadgeLayer',
  'ChapterHeadingFurniture', 'DraftBlockEditorLayer', 'DraftWritingEntryLayer', 'ExportPreviewLayer', 'NoteAnswerCards',
  'NoteCoverMetadata', 'NoteCoverUnderlay', 'NoteHeaderSeparator', 'NotePageGapLayer', 'NotePageThumbnail', 'NotePaperHeader',
  'NotePrintLayer', 'NoteReadOnlyPageContent', 'NoteRuntimeDocumentLayer', 'NoteWritingSurfaceLayer', 'PageFrameSlotsLayer',
  'PageFrameWallLayer', 'PaperInkLayer', 'PaperInkSvg', 'TextUnitGutterLayer']);
function fileScope(local) {
  if (sourceFiles.has(local)) return '来源定义';
  if (supplyFiles.has(local)) return '投影供值';
  if (local === '../NoteDetail.module.css') return '混合CSS：仅纸面选择器';
  const name = local.split('/').at(-1).replace(/(?:\.module)?\.(?:css|tsx|ts)$/, '');
  if (local.startsWith('blocks/')) return ['MediaImageEditor', 'ComponentBlockEditor', 'TableBlockEditor', 'ParagraphFurnitureEditor'].includes(name)
    ? '壳：编辑浮层' : name === 'ParagraphFurniture' ? '混合CSS：source/fragment纸面；editor壳' : '纸面组件/编辑投影';
  if (local.startsWith('layers/')) return paperLayers.has(name) ? '纸面或纸面复用投影（壳控件不修改）' : '壳/导航/工具层';
  if (local.startsWith('panels/')) return '壳：面板';
  if (local === 'NoteCanvasRuntime.tsx') return '混合根：纸面宿主与壳';
  return '扩展筛查：上下文/数据/行为服务，非直接样式';
}
const rows = [];
const fileRows = [];
const lexical = [];
for (const path of candidates) {
  const bytes = readFileSync(join(root, path));
  const text = bytes.toString('utf8');
  const lines = text.split(/\r?\n/);
  const local = slash(relative(join(root, engine), join(root, path)));
  const fileHits = [];
  for (const [index, line] of lines.entries()) {
    if (/font-family|fontFamily|\bfont\s*:|\b(?:serif|sans-serif|monospace|Aptos|Georgia|Consolas|SFMono-Regular)\b/.test(line)) {
      lexical.push({ file: path, line: index + 1, text: line.trim() });
    }
    let selector = '';
    if (path.endsWith('.css')) {
      const prefix = lines.slice(0, index + 1).join('\n');
      selector = prefix.slice(Math.max(prefix.lastIndexOf('}'), prefix.lastIndexOf(';', prefix.lastIndexOf('{'))) + 1, prefix.lastIndexOf('{')).trim();
      if (selector.length > 160) selector = selector.slice(-160);
    }
    const occurrences = [...line.matchAll(colors)].map(match => ({ kind: 'color',
      value: match[0].includes('${') ? line.slice(match.index, line.indexOf('`', match.index)) : match[0], column: match.index + 1 }));
    for (const value of fontLocations[local]?.[index + 1] ?? []) {
      if (!line.includes(value)) throw new Error(`Font input drift: ${path}:${index + 1}`);
      occurrences.push({ kind: 'font', value, column: line.indexOf(value) + 1 });
    }
    for (const occurrence of occurrences) {
      const row = { file: path, line: index + 1, ...occurrence, element: selector || line.trim(), source: line.trim(), tier: sourceFiles.has(local) ? 'source' : supplyFiles.has(local) ? 'supply' : 'projection', classification: 'B', reason: '' };
      const before = lines.slice(0, index + 1).join('\n');
      if (local === 'annotationColorService.ts') row.element = `${[...before.matchAll(/token: '([^']+)'/g)].at(-1)?.[1]}.${line.trim().split(':')[0]}`;
      if (local === 'paperSkinDefaults.css') row.element = `:root / ${line.trim().split(':')[0]}`;
      if (local === 'paperSkinStyles.ts') row.element = line.includes('baseline:')
        ? `PAPER_DERIVED_COLORS.${line.trim().match(/^'([^']+)'/)?.[1]}`
        : [...before.matchAll(/['"`]((?:--)[\w$\{.()* \-]+)(?:['"`]|\])/g)].at(-1)?.[1] ?? line.trim();
      if (local === 'paperSkinStyles.ts' && row.line === 121) row.element = 'buildPaperSkinStyles / --paper-shadow-${Math.round(opacity * 100)}';
      if (local === 'blocks/ParagraphFurniture.module.css') row.element = '.source / 引文出处';
      if (local === 'typographyMeasurementService.ts') row.element = 'typographyTextMetrics / code_line.fontFamily';
      if (local === 'pageFrameTemplateService.ts') row.element = `${[...before.matchAll(/const (\w+): PageFrameBackgroundStyle/g)].at(-1)?.[1]}.${line.trim().split(':')[0]}`;
      if (local === 'typographyProfileService.ts') row.element = row.line === 21 ? 'DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE.fontFamily' : `DOCUMENT_FONT_FAMILY_OPTIONS.${[...before.matchAll(/id: '([^']+)'/g)].at(-1)?.[1]}`;
      if (local === 'blocks/MediaImageEditor.module.css') { row.classification = 'OUT'; row.reason = '编辑模态 body portal 遮罩，应用壳，工单排除。'; }
      else if (local === 'visualConnectorService.ts') { row.classification = 'OUT'; row.reason = 'visualConnectorSavePayload 持久化默认色，不是 CSS/内联投影取值。'; }
      else if (local === '../NoteDetail.module.css' && [4571, 4900, 5234].includes(row.line)) { row.classification = 'OUT'; row.reason = 'ContentGroupPanel 独占的角色徽章/收据摘要/状态栏；面板壳层。'; }
      else if (local === 'blocks/ParagraphFurniture.module.css') { row.classification = 'C'; row.reason = '引文出处固定字族与 paragraphFurniture.ts:11–13,45–47 测量绑定；无固定出处字族角色，document 会随用户设置变，label 在 workbench 为 mono；本单不造 token/改几何。'; }
      else if (local === 'typographyMeasurementService.ts' || (local === '../NoteDetail.module.css' && [3790, 3802].includes(row.line))) { row.classification = 'C'; row.reason = '代码正文/行号及分页 DOM 测量需保持同一等宽栈；现有 title/label 并非代码角色，--font-mono 仅消费无定义，缺专用角色。'; }
      else if (local === 'layers/PageFrameSlotsLayer.tsx') { row.reason = 'slot.style.fontFamily 的显式用户覆盖；skin 默认已走 --sk-label-font。改成角色会抹除显式 serif/sans/mono 选择，候裁不动。'; }
      else if (local === '../NoteDetail.module.css') { row.reason = '现有 --document-font-family 角色的默认回退，与默认 profile 同栈；保留用户 Typography 覆盖。'; }
      else if (local === 'annotationColorService.ts') { row.reason = '已优先取 --paper-annotation-*；兼容回退与 paperSkinDefaults 同值，ReferenceTag 等全局消费者也使用且不保证纸面 CSS 已加载；候裁不删回退。'; }
      else if (local === 'freehandService.ts') { row.reason = '纸笔已优先取 --sk-ink；仅末级兼容 fallback，不是覆盖皮肤的颜色。'; }
      else if (local === 'objectStyleService.ts') { row.reason = '便签已优先取 --canvas-sticky-note-*；保留独立模型/旧面兼容 fallback，现纸面由 paperSkinStyles 定义。'; }
      else if (local === 'paperSkinDefaults.css') { row.reason = '固定现役渲染别名的 :root 定义源头；纸面皮肤可覆盖，合法源头候裁登记。'; }
      else if (local === 'paperSkinStyles.ts') { row.reason = '工厂基线、皮肤派生或材质绘制定义源头；现有测试明确保持默认色与用户覆盖，非消费者私自取色。'; }
      else if (local === 'pageFrameTemplateService.ts') { row.reason = '页框模板背景工厂快照；pageFrameTemplateToCssVars 投影为现有变量，非消费侧违约。'; }
      else if (local === 'typographyProfileService.ts') { row.reason = '默认文档排印快照/显式用户可选字体枚举源头，不能用皮肤角色替换持久化选择。'; }
      else throw new Error(`Unclassified candidate: ${path}:${row.line}`);
      row.id = `T4-${String(rows.length + 1).padStart(3, '0')}`;
      rows.push(row); fileHits.push(row);
    }
  }
  const fonts = fontLocations[local];
  if (fonts) for (const line of Object.keys(fonts)) if (Number(line) > lines.length) throw new Error('Font input missing');
  fileRows.push({ file: path, scope: fileScope(local), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
    lexicalColorHits: fileHits.filter(row => row.kind === 'color').length,
    hardcodedFontHits: fileHits.filter(row => row.kind === 'font').length,
    classifiedHits: fileHits.filter(row => row.classification !== 'OUT').length,
    disposition: sourceFiles.has(local) ? '来源定义（B登记）' : supplyFiles.has(local) ? '投影供值链' : local === '../NoteDetail.module.css' ? '传递样式：逐选择器分纸面/壳层' : /^(?:blocks|layers)\//.test(local) || /\.css$|\.tsx$/.test(local) ? '组件/CSS候选：查色、字族与font简写；壳命中另列' : '扩展扫服务/hooks：动态传递非字面；非样式逻辑不修改' });
}
const inScope = rows.filter(row => row.classification !== 'OUT');
const summary = { candidateFiles: candidates.length, enumeratedEngineFiles: all.length, excludedTests: all.filter(path => /\.test\./.test(path)).length,
  inScopeHits: inScope.length, colors: inScope.filter(row => row.kind === 'color').length, fonts: inScope.filter(row => row.kind === 'font').length,
  classes: Object.fromEntries(['A', 'B', 'C'].map(value => [value, inScope.filter(row => row.classification === value).length])),
  tiers: Object.fromEntries(['projection', 'supply', 'source'].map(value => [value, inScope.filter(row => row.tier === value).length])),
  excludedHits: rows.length - inScope.length, hitFiles: fileRows.filter(row => row.classifiedHits).length,
  zeroHitFiles: fileRows.filter(row => !row.classifiedHits).length, coverage: { full: candidates.length, processed: fileRows.length, remaining: 0 },
  modifiedElements: 0, evidenceScope: 'canvasEngine 非测试 TS/TSX/CSS + NoteDetail 传递纸面选择器；来源与消费分层计数；不包含全球 UI、Boards、shared 工厂的额外计数。' };
const escape = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const table = (headers, records) => `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${records.map(record => `| ${record.map(escape).join(' | ')} |`).join('\n')}\n`;
mkdirSync(audit, { recursive: true });
writeFileSync(join(audit, 'census.json'), JSON.stringify({ summary, rows, files: fileRows, enumeratedEngineFiles: all }, null, 2) + '\n');
writeFileSync(join(scratch, 'font-lexical-candidates.json'), JSON.stringify(lexical, null, 2) + '\n');
writeFileSync(join(audit, 'census.md'), '# T4 逐处普查表\n\n日期：2026-09-21；性质：builder 审计证据，非设计裁定。行号与 SHA 对应本次输入；每个字面色/每个完整字体栈记一处（同一行可多处）。`font` 简写、TS family 映射、变量 fallback 均已查。inherit/currentColor/transparent/none、纯动态用户值与只含 var 的字族不算硬编码字族。\n\n来源快照与消费者分层记录，不把定义本身当成违约；🅱 是候裁登记，不代 HQ 豁免。🅰 0 项，修复清单为空。\n\n' + table(['指标', '值'], Object.entries(summary).map(([k,v]) => [k, typeof v === 'object' ? JSON.stringify(v) : v])) + '\n' + table(['ID', '文件:行:列', '类/层', '值', '所在元素/供值', '判定理由'], inScope.map(row => [row.id, `${row.file}:${row.line}:${row.column}`, `${row.classification}/${row.tier}`, row.value, row.element, row.reason])));
writeFileSync(join(audit, 'coverage.md'), '# T4 文件分母与零命中登记\n\n枚举 canvasEngine 全树，排除测试文件后逐个扫描 TS/TSX/CSS；追加实际 import 的 NoteDetail.module.css。310 是扩展筛查候选分母，不是 310 个纸面组件。每个文件的纸面/壳/源头/供值/非样式边界逐行明示。full = processed + remaining。表中 0 为两项字面值均未检出（或仅有另列的壳/非样式命中），不是“该文件没有样式”的宣称。每个候选文件已在 census.json 留 SHA-256。\n\n' + table(['文件', '字面色', '硬字族', '射程内处数', '射程'], fileRows.map(row => [row.file,row.lexicalColorHits,row.hardcodedFontHits,row.classifiedHits,row.scope])) + '\n## 已发现但排除的命中\n\n' + table(['文件:行', '值', '排除理由'], rows.filter(row => row.classification === 'OUT').map(row => [`${row.file}:${row.line}`,row.value,row.reason])));
console.log(JSON.stringify(summary, null, 2));
