import { createHash } from 'node:crypto';
import { createCascade, describe, lengthPx, resolveVars, splitList } from './cascade.mjs';

export const ROLE_SELECTORS = {
  title: '.vtitle, [data-spec-role="title"]',
  'heading-1': 'h1', 'heading-2': 'h2', 'heading-3': 'h3',
  'heading-4': 'h4', 'heading-5': 'h5', 'heading-6': 'h6',
  caption: 'figcaption, .figcap, [data-spec-role="caption"]',
  'table-caption': 'caption',
  'folio-header': '.page-head, [data-spec-role="folio-header"]',
  'folio-footer': '.page-foot, [data-spec-role="folio-footer"]',
  'table-header': 'th', 'table-cell': 'td',
  quote: 'blockquote, .epigraph, [data-spec-role="quote"]',
  callout: 'aside, .u-blue, .funbox, [data-spec-role="callout"]',
  body: 'p, [data-spec-role="body"]',
};
const METRICS = { fontSizePx: 'font-size', lineHeightRatio: 'line-height', letterSpacingEm: 'letter-spacing', fontWeight: 'font-weight', fontFamily: 'font-family' };
const UNITS = { fontSizePx: 'px@900', lineHeightRatio: 'ratio', letterSpacingEm: 'em', fontWeight: 'weight', fontFamily: 'stack-overlap distance', color: 'RGBA Euclidean (0–255)', spacingPx: 'px@900', tableBodyRatio: 'ratio' };
export const round = value => typeof value === 'number' ? Number(value.toFixed(6)) : value;

function familyParts(value) { return splitList(value.toLowerCase()).map(x => x.replace(/["']/g, '').trim()); }

function colorReader(document, window) {
  const cache = new Map();
  const probe = document.createElement('span'); document.body.append(probe);
  return value => {
    if (cache.has(value)) return cache.get(value);
    probe.style.color = ''; probe.style.color = value;
    if (!probe.style.color || /^(?:currentcolor|inherit|initial|unset|var\()/i.test(value)) return null;
    const computed = window.getComputedStyle(probe).color;
    const match = /^rgba?\(([^)]+)\)$/.exec(computed);
    const parts = match?.[1].split(',').map(Number);
    const result = parts && parts.every(Number.isFinite) ? { css: computed, channels: [parts[0], parts[1], parts[2], (parts[3] ?? 1) * 255] } : null;
    cache.set(value, result); return result;
  };
}

function snap(value, metric, grid, readColor) {
  if (value === null || value === undefined) return { nearest: null, distance: null };
  let nearest = null; let distance = Infinity;
  for (const point of grid?.[metric] || []) {
    let candidate = Infinity;
    if (metric === 'color') {
      const a = readColor(value); const b = readColor(point.value);
      if (a && b) candidate = Math.hypot(...a.channels.map((n, i) => n - b.channels[i]));
    } else if (typeof value === 'number' && typeof point.value === 'number') candidate = Math.abs(value - point.value);
    else if (metric === 'fontFamily' && typeof point.value === 'string') {
      const a = new Set(familyParts(value)); const b = new Set(familyParts(point.value));
      candidate = 1 - [...a].filter(x => b.has(x)).length / new Set([...a, ...b]).size;
    }
    if (candidate < distance) { distance = candidate; nearest = point; }
  }
  return { nearest, distance: Number.isFinite(distance) ? round(distance) : null };
}

function measure(raw, value, metric, product, readColor, extras = {}) {
  return { raw, normalized: round(value), ...snap(value, metric, product.grids, readColor), unit: UNITS[metric], ...extras };
}

function colorCategory(property) {
  if (property.startsWith('--')) return 'token';
  if (/background|^fill$/.test(property)) return 'background';
  if (/border|outline|stroke|decoration/.test(property)) return 'line';
  if (property === 'color' || /text.*color|caret/.test(property)) return 'text';
  return 'other';
}

function colorsIn(value, readColor) {
  const direct = readColor(value.trim());
  if (direct) return [direct.css];
  const colors = value.match(/#[\da-f]{3,8}\b|(?:rgba?|hsla?)\([^()]*\)|\b[a-z]+\b/gi) || [];
  return colors.map(color => readColor(color)?.css).filter(Boolean);
}

function inferPaper(cascade, selector) {
  const { document, get } = cascade;
  const page = selector ? document.querySelector(selector)
    : ['[data-spec-paper]', '.page', 'main', 'article'].map(candidate => document.querySelector(candidate)).find(Boolean);
  if (!page) throw new Error('No paper element. Supply --paper-selector with an element whose width or ancestor width is declared.');
  // Width provenance is a declaration basis, never a claimed bounding box.
  for (let element = page; element; element = element.parentElement) {
    const computed = get(element);
    for (const property of ['width', 'max-width']) {
      const declared = computed.style.getPropertyValue(property);
      if (declared && !/%|\b(?:vw|vh)\b/.test(declared)) {
        const px = lengthPx(declared, { font: computed.fontSizePx, root: computed.rootSizePx });
        if (px > 0) return { widthPx: px, evidence: `${describe(element)} ${property}: ${declared}`, page: describe(page), basis: property === 'max-width' ? 'declared desktop width cap; actual used width unmeasured' : 'declared width; actual border box unmeasured' };
      }
    }
  }
  throw new Error('Paper has no resolvable CSS width / max-width basis; no 900px fallback is allowed.');
}

export function extractSpec(html, { sourcePath = '(synthetic)', product = { grids: {}, comparisons: [] }, paperSelector, environment } = {}) {
  const cascade = createCascade(html, environment);
  const { document, dom, get } = cascade;
  try {
    const paper = inferPaper(cascade, paperSelector);
    const factor = 900 / paper.widthPx;
    const elements = [...document.body.querySelectorAll('*')].filter(el => !/^(script|style|link|meta)$/.test(el.localName));
    const readColor = colorReader(document, dom.window);
    const roots = new Map(); const roleRoots = new Map();
    for (const [role, selector] of Object.entries(ROLE_SELECTORS)) {
      const matches = [...document.querySelectorAll(selector)]; roleRoots.set(role, matches);
      for (const element of matches) if (!roots.has(element)) roots.set(element, role);
    }
    function roleFor(element) {
      // Context containers own paragraphs within them; header/cell/caption own
      // their inline descendants. Avoid classifying a callout p as body text.
      let own = null;
      for (let node = element; node; node = node.parentElement) {
        const role = roots.get(node);
        if (role && role !== 'body') return role;
        if (role) own = role;
      }
      return own;
    }
    const samples = elements.filter(el => roots.has(el) || [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim()));
    const roles = Object.keys(ROLE_SELECTORS).map(role => {
      const selected = samples.filter(el => roleFor(el) === role);
      const metrics = {};
      for (const [metric, property] of Object.entries(METRICS)) {
        const groups = new Map();
        for (const element of selected) {
          const style = get(element); const value = style[metric];
          const raw = style.provenance[property]?.raw ?? style.specified[property];
          const normalized = metric === 'fontSizePx' && value !== null ? value * factor : value;
          const key = JSON.stringify([raw, round(normalized)]);
          if (!groups.has(key)) groups.set(key, measure(raw, normalized, metric, product, readColor, {
            resolved: round(value), frequency: 0, rootFrequency: 0, evidence: [],
            note: value === null ? 'unresolved / normal is font-dependent; not a layout measurement' : undefined,
          }));
          const item = groups.get(key); item.frequency++;
          const calloutBody = element.matches('.u-blue p, .anscard .a, .funbox, [data-spec-role="callout"]')
            || element.localName === 'p' && element.closest('aside:not(.anscard)');
          if (role === 'callout' ? calloutBody : roots.get(element) === role) item.rootFrequency++;
          const evidence = `${describe(element)} ← ${style.provenance[property]?.source}`;
          if (item.evidence.length < 5 && !item.evidence.includes(evidence)) item.evidence.push(evidence);
        }
        metrics[metric] = [...groups.values()].sort((a, b) => b.rootFrequency - a.rootFrequency || b.frequency - a.frequency);
      }
      return { role, selector: ROLE_SELECTORS[role], count: selected.length, rootCount: roleRoots.get(role).filter(el => roleFor(el) === role).length, metrics };
    });
    const primary = (role, metric) => roles.find(x => x.role === role)?.metrics[metric]?.[0]?.normalized ?? null;
    const paletteMap = new Map();
    const rootVariables = get(document.documentElement).variables;
    function addColor(color, category, source, applied = false) {
      if (!paletteMap.has(color)) paletteMap.set(color, measure(color, color, 'color', product, readColor, {
        frequency: 0, categories: { text: 0, background: 0, line: 0, other: 0, token: 0 }, applied: { text: 0, background: 0, line: 0, other: 0 }, evidence: [],
      }));
      const item = paletteMap.get(color);
      if (applied) item.applied[category]++;
      else { item.frequency++; item.categories[category]++; }
      if (item.evidence.length < 6 && !item.evidence.includes(source)) item.evidence.push(source);
    }
    for (const declaration of cascade.declarations) {
      if (!/color|background|border|outline|shadow|fill|stroke|^--/.test(declaration.property)) continue;
      const resolved = resolveVars(declaration.value, rootVariables);
      // Literal entries include inactive media / custom definitions. Variable
      // uses are interpreted in the declared baseline and labelled as such.
      const colors = colorsIn(resolved ?? declaration.value, readColor);
      for (const color of colors) addColor(color, colorCategory(declaration.property), `${declaration.source} ${declaration.property}: ${declaration.value}${declaration.value.includes('var(') ? ' [baseline variable resolution]' : ''}`);
    }
    for (const element of elements) {
      const style = get(element).style;
      // Count explicit cascaded property slots only, not inherited duplicate ink
      // or border defaults. This is CSS usage frequency, never pixel coverage.
      for (const property of ['color', 'background-color', 'background-image', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'outline-color', 'box-shadow', 'text-shadow', 'fill', 'stroke']) {
        const value = style.getPropertyValue(property);
        if (!value) continue;
        for (const color of colorsIn(value, readColor)) addColor(color, colorCategory(property), `${describe(element)} ${property}`, true);
      }
    }
    const spacingMap = new Map();
    for (const declaration of cascade.declarations) {
      if (!/^(?:margin|padding)(?:-|$)|^(?:gap|row-gap|column-gap)$/.test(declaration.property)) continue;
      // A declaration-level rhythm census cannot choose a local variable's
      // element context. Retain it, instead of silently substituting :root.
      const resolved = declaration.value;
      // A shorthand contributes one occurrence per scalar term, not four
      // expanded edges; repeated declarations are not actual box gaps.
      for (const token of resolved.match(/(?:var|calc|min|max|clamp)\([^)]*\)|[^\s]+/g) || []) {
        const px = /em|rem|%|vw|vh/.test(token) ? null : lengthPx(token);
        const key = token;
        if (!spacingMap.has(key)) spacingMap.set(key, measure(token, px === null ? null : px * factor, 'spacingPx', product, readColor, { frequency: 0, properties: [], evidence: [], note: px === null ? 'context/layout dependent declaration; not converted' : 'declaration scalar cluster, not measured gap' }));
        const item = spacingMap.get(key); item.frequency++;
        if (!item.properties.includes(declaration.property)) item.properties.push(declaration.property);
        if (item.evidence.length < 5) item.evidence.push(`${declaration.source} ${declaration.property}: ${declaration.value}`);
      }
    }
    const body = primary('body', 'fontSizePx');
    const tableBodyRatios = [];
    for (const role of ['table-cell', 'table-header']) for (const item of roles.find(x => x.role === role).metrics.fontSizePx) {
      const ratio = body && item.normalized !== null ? item.normalized / body : null;
      tableBodyRatios.push(measure(`${role} ${item.raw} / body mode`, ratio, 'tableBodyRatio', product, readColor, { role, frequency: item.frequency, evidence: item.evidence }));
    }
    const comparisons = (product.comparisons || []).map(item => {
      const specimen = item.metric === 'tableBodyRatio' ? tableBodyRatios.find(row => row.role === item.role)?.normalized ?? null : primary(item.role, item.metric);
      const productNormalized = item.normalized ?? item.value;
      const delta = typeof specimen === 'number' && typeof productNormalized === 'number' ? round(specimen - productNormalized) : null;
      return { id: item.id, role: item.role, metric: item.metric, productValue: item.value, productNormalized, specimenValue: specimen, delta, unit: UNITS[item.metric], source: item.source, note: [item.note, specimen === null ? 'no measurable specimen value for this role/metric' : 'specimen modal role value; delta = specimen@900 − product@900; candidate only'].filter(Boolean).join('; ') };
    });
    const report = {
      schemaVersion: 'spec-extractor.v1', source: { path: sourcePath, sha256: createHash('sha256').update(html).digest('hex') },
      environment: { engine: 'jsdom 26.1.0 + bounded declaration cascade', ...cascade.scenario, scriptsExecuted: false, externalResourcesLoaded: false, roleMapping: 'semantic tags + documented specimen class aliases; text-bearing descendants grouped by nearest semantic container' },
      normalization: { targetWidthPx: 900, specimenWidthPx: paper.widthPx, factor, formula: 'fontPx900 = cssFontPx × 900 / CSS-declared-paper-width; productPx900 = productLogicalPx × 900 / productPaperWidth; ratios and em unchanged', paperEvidence: paper },
      coverage: { elementCount: elements.length, roleSampleCount: roles.reduce((n, x) => n + x.count, 0), unclassifiedTextElements: samples.filter(el => !roleFor(el)).length, roles: Object.keys(ROLE_SELECTORS), measurementClass: '级联量' },
      roles, palette: [...paletteMap.values()].sort((a, b) => b.frequency - a.frequency), spacing: [...spacingMap.values()].sort((a, b) => b.frequency - a.frequency), tableBodyRatios, comparisons, product,
      declarations: { count: cascade.declarations.length, excludedRules: cascade.excludedRules, externalStylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(el => el.getAttribute('href')), scriptCount: document.scripts.length },
      layoutUnmeasured: ['actual paper/content bounding boxes and used width', 'actual inter-box gaps, margin collapse, flex/grid distribution', 'line wrapping, line count, overflow and pagination', 'font download/availability, glyph metrics, normal line-height', 'pseudo-element generated text, interaction states and JS-created DOM/SVG', 'pixel coverage and perceptual color appearance'],
      limitations: [
        '所有数值是级联量（声明/声明派生），没有布局量；纸宽使用 CSS 声明基准，非 getBoundingClientRect。',
        '默认桌面 screen / 1280px / light / no-preference；不执行脚本或加载外链字体样式，空页脚只测其声明。移动/暗色/交互/伪元素规则仍入声明清单，未声称在基线生效。',
        '支持普通选择器及 :not(simple)，!important/inline/优先级/源序、custom properties、font 继承、px/pt/em/rem/% 派生；不支持的选择器/媒体规则列明排除。不支持 layout/calc() 字号等返回 null。',
        '字号、间距格点按双方纸宽折算到900px；line-height:normal 保留 null，letter-spacing:normal 以排印基线0计（非字形间距实测）。字族栈只读声明，不等于已加载字体。',
        '色板 frequency=每条声明中的色值出现次数（含非当前状态与 token 定义）；applied=当前元素显式级联属性槽次数（border 四边分计），不是像素面积。CSS var 用基线根变量解释，局部变量以 applied 为准。间距中的 var() / 相对单位因逐元素上下文不同保留原声明、归一为 null。',
        '归格距离：数值绝对差；字体栈 1−集合交并比；色彩RGBA四通道欧氏距离（alpha×255），不冒充感知色差。所有最近格点仅为候选，既不自动写产品，也不表示语义已获批准。',
        '角色对照用根元素众数（再按样本频率破同票）；提示框改用正文 .u-blue p / .anscard .a / .funbox 众数，避免无文字容器的16px默认值冒充内容。图注与表格caption分开。整套变体与比例保留在JSON，不能用主值覆盖例外。无格点或不可测值明确 null，不造零距离。',
      ], diagnostics: [...new Set(cascade.diagnostics)],
    };
    return report;
  } finally { dom.window.close(); }
}
