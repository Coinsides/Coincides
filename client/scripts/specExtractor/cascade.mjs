import { JSDOM, VirtualConsole } from 'jsdom';

// A deliberately bounded declaration reader, not a layout engine. jsdom supplies
// the HTML/CSSOM, selector matching and declaration parsing. Its computed-style
// implementation does not implement specificity or full font inheritance.
export function splitList(value, separator = ',') {
  const parts = []; let start = 0; let depth = 0; let quote = '';
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (quote) { if (c === quote && value[i - 1] !== '\\') quote = ''; }
    else if (c === '"' || c === "'") quote = c;
    else if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === separator && !depth) { parts.push(value.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(value.slice(start).trim()); return parts;
}

function specificity(selector) {
  // Supported here: type, universal, id, class, attribute, combinators and
  // simple pseudo classes, with :not(simple-selector) (used by the specimen).
  if (/:(?:is|where|has|nth-child|nth-last-child)\(/i.test(selector) || /\\/.test(selector)) return null;
  let rest = selector.replace(/:not\(([^()]*)\)/g, '$1');
  if (/[()]/.test(rest)) return null;
  let b = 0;
  rest = rest.replace(/\[[^\]]*\]/g, () => { b++; return ''; });
  const a = (rest.match(/#[\w-]+/g) || []).length;
  b += (rest.match(/\.[\w-]+|:[\w-]+/g) || []).length;
  rest = rest.replace(/#[\w-]+|\.[\w-]+|:[\w-]+/g, '');
  const c = (rest.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) || []).length;
  return [a, b, c];
}

function compare(a, b) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function resolveVars(value, variables, seen = []) {
  let result = value; let start;
  while ((start = result.indexOf('var(')) !== -1) {
    let depth = 1; let end = start + 4;
    for (; end < result.length && depth; end++) {
      if (result[end] === '(') depth++;
      if (result[end] === ')') depth--;
    }
    if (depth) return null;
    const [name, ...fallback] = splitList(result.slice(start + 4, end - 1));
    if (seen.includes(name)) return null;
    const replacement = variables[name] ?? (fallback.length ? fallback.join(',') : null);
    if (replacement === null) return null;
    const resolved = resolveVars(replacement, variables, [...seen, name]);
    if (resolved === null) return null;
    result = result.slice(0, start) + resolved + result.slice(end);
  }
  return result;
}

export function lengthPx(value, { font = 16, root = 16, percent = null } = {}) {
  const match = /^(-?(?:\d*\.)?\d+)(px|pt|pc|in|cm|mm|em|rem|%)?$/.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  const scale = { px: 1, pt: 96 / 72, pc: 16, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, em: font, rem: root, '%': percent === null ? null : percent / 100 }[match[2] || 'px'];
  return scale === null ? null : n * scale;
}

export function describe(element) {
  if (element.id) return `${element.localName}#${element.id}`;
  const cls = [...element.classList].map(x => `.${x}`).join('');
  const index = element.parentElement ? [...element.parentElement.children].indexOf(element) + 1 : 1;
  return `${element.localName}${cls}:nth-child(${index})`;
}

const INHERITED = new Set(['font-size', 'font-family', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'color', 'visibility']);
const TYPOGRAPHY = ['font-size', 'font-family', 'font-weight', 'line-height', 'letter-spacing'];

export function createCascade(html, environment = {}) {
  const scenario = { media: 'screen', viewportWidthPx: 1280, colorScheme: 'light', reducedMotion: false, ...environment };
  const diagnostics = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => diagnostics.push(error.message));
  // No runScripts or resources option: inline JS and linked styles/fonts never run/load.
  const dom = new JSDOM(html, { virtualConsole });
  const { document } = dom.window;
  const declarations = []; const excludedRules = []; const rules = [];
  function mediaMatches(condition) {
    const choices = splitList(condition).map(part => {
      let text = part.trim().toLowerCase(); let ok = true;
      text = text.replace(/\((max|min)-width:\s*([\d.]+)px\)/g, (_, kind, width) => {
        ok &&= kind === 'max' ? scenario.viewportWidthPx <= Number(width) : scenario.viewportWidthPx >= Number(width); return '';
      }).replace(/\(prefers-color-scheme:\s*(light|dark)\)/g, (_, scheme) => { ok &&= scenario.colorScheme === scheme; return ''; })
        .replace(/\(prefers-reduced-motion:\s*(reduce|no-preference)\)/g, (_, motion) => { ok &&= scenario.reducedMotion === (motion === 'reduce'); return ''; });
      const remainder = text.replace(/\b(?:screen|print|all)\b/g, kind => { ok &&= kind === 'all' || kind === scenario.media; return ''; })
        .replace(/\b(?:and|only)\b/g, '').trim();
      if (remainder) { diagnostics.push(`Unsupported media condition, excluded: ${condition}`); return false; }
      return ok;
    });
    return choices.some(Boolean);
  }
  let order = 0;
  function visit(cssRules, condition = '', active = true, origin = 'style') {
    for (const rule of cssRules) {
      if (rule.type === 4) {
        const next = rule.conditionText || rule.media.mediaText;
        visit(rule.cssRules, [condition, next].filter(Boolean).join(' AND '), active && mediaMatches(next), origin);
      } else if (rule.selectorText && rule.style) {
        const source = `${origin}: ${rule.selectorText}${condition ? ` @ ${condition}` : ''}`;
        const entries = [...Array(rule.style.length)].map((_, i) => {
          const property = rule.style[i];
          return { property, value: rule.style.getPropertyValue(property), important: rule.style.getPropertyPriority(property) === 'important', source, condition, active };
        });
        declarations.push(...entries);
        for (const selector of splitList(rule.selectorText)) {
          const spec = specificity(selector);
          const stateful = /::|:(?:before|after|hover|active|focus|focus-visible|focus-within|visited)\b/.test(selector);
          if (!active || stateful || !spec) {
            excludedRules.push({ selector, condition, reason: !active ? 'inactive scenario' : stateful ? 'pseudo element / interaction state (declarations inventoried)' : 'unsupported specificity syntax' });
            continue;
          }
          rules.push({ selector, spec, entries, order: order++ });
        }
      } else {
        excludedRules.push({ condition, reason: `unmeasured at-rule: ${rule.cssText.slice(0, 120)}` });
      }
    }
  }
  [...document.querySelectorAll('style')].forEach((element, i) => {
    if (element.sheet) visit(element.sheet.cssRules, element.media || '', !element.media || mediaMatches(element.media), `style[${i}]`);
  });
  const matched = new WeakMap();
  for (const rule of rules) {
    try {
      for (const element of document.querySelectorAll(rule.selector)) {
        if (!matched.has(element)) matched.set(element, []);
        matched.get(element).push(rule);
      }
    } catch { diagnostics.push(`Selector not supported by jsdom: ${rule.selector}`); }
  }
  for (const element of document.querySelectorAll('[style]')) {
    for (let i = 0; i < element.style.length; i++) {
      const property = element.style[i];
      declarations.push({ property, value: element.style.getPropertyValue(property), source: `inline ${describe(element)}`, active: true, condition: '' });
    }
  }
  // Static SVG presentation attributes participate in the inventory; generated
  // SVG from scripts is intentionally not created or claimed as measured.
  for (const element of document.querySelectorAll('svg, svg *')) {
    for (const property of ['fill', 'stroke', 'color']) if (element.hasAttribute(property)) {
      declarations.push({ property, value: element.getAttribute(property), source: `SVG ${describe(element)}`, active: true, condition: '' });
    }
  }
  const cache = new WeakMap();
  function get(element) {
    if (cache.has(element)) return cache.get(element);
    const parent = element.parentElement ? get(element.parentElement) : null;
    const variables = { ...parent?.variables };
    const candidates = [];
    for (const rule of matched.get(element) || []) {
      for (const entry of rule.entries) candidates.push({ ...entry, rank: [Number(entry.important), 0, ...rule.spec, rule.order] });
    }
    if (element.style) for (let i = 0; i < element.style.length; i++) {
      const property = element.style[i];
      candidates.push({ property, value: element.style.getPropertyValue(property), source: `inline ${describe(element)}`, rank: [Number(element.style.getPropertyPriority(property) === 'important'), 1, 0, 0, 0, 0] });
    }
    candidates.sort((a, b) => compare(a.rank, b.rank));
    for (const item of candidates) if (item.property.startsWith('--')) variables[item.property] = item.value;
    // Compute custom properties at their defining element before inheritance.
    for (const name of Object.keys(variables)) variables[name] = resolveVars(variables[name], variables) ?? variables[name];
    const style = document.createElement('span').style;
    const sources = {}; const raw = {};
    for (const item of candidates) {
      if (item.property.startsWith('--')) continue;
      let value = resolveVars(item.value, variables);
      if (value === null) {
        diagnostics.push(`Invalid-at-computed variable uses unset, not an earlier declaration: ${item.source} ${item.property}=${item.value}`);
        value = 'unset';
        if (item.property === 'font') for (const property of TYPOGRAPHY) style.setProperty(property, 'inherit');
      }
      // Apply ordered declarations through jsdom so shorthands expand together.
      style.setProperty(item.property, value);
      for (let i = 0; i < style.length; i++) {
        const property = style[i];
          if (item.property === property || item.property === 'font' && (property.startsWith('font-') || property === 'line-height') || property.startsWith(`${item.property}-`)) {
          sources[property] = item.source; raw[property] = item.value;
        }
      }
      sources[item.property] = item.source; raw[item.property] = item.value;
    }
    const ua = dom.window.getComputedStyle(element);
    const specified = {}; const provenance = {};
    for (const property of TYPOGRAPHY) {
      let value = style.getPropertyValue(property);
      if (value === 'inherit' || value === 'unset' || !value && INHERITED.has(property)) {
        // UA headings/strong have their own declarations; do not inherit those.
        const uaOwn = !value && ((property === 'font-weight' && /^(h[1-6]|b|strong|th)$/.test(element.localName)) || (property === 'font-size' && /^(h[1-6]|small|big)$/.test(element.localName)));
        if (!uaOwn && parent) {
          specified[property] = parent.specified[property];
          provenance[property] = parent.provenance[property];
          continue;
        }
        value = uaOwn ? ua.getPropertyValue(property) : '';
      }
      if (value === 'initial' || value === 'revert') value = '';
      specified[property] = value || ({ 'font-size': '16px', 'font-family': 'serif', 'font-weight': 'normal', 'line-height': 'normal', 'letter-spacing': 'normal' }[property]);
      provenance[property] = { raw: raw[property] || specified[property], source: sources[property] || 'UA/default assumption (16px serif base)' };
    }
    const ownSize = style.getPropertyValue('font-size');
    const fontSizePx = !ownSize && parent && !/^h[1-6]$|^small$|^big$/.test(element.localName) || ownSize === 'inherit' || ownSize === 'unset'
      ? parent ? parent.fontSizePx : 16
      : lengthPx(specified['font-size'], { font: parent ? parent.fontSizePx : 16, root: parent ? parent.rootSizePx : 16, percent: parent ? parent.fontSizePx : 16 });
    const rootSizePx = parent ? parent.rootSizePx : fontSizePx;
    if (fontSizePx === null) diagnostics.push(`Unresolved font-size (not replaced with UA size): ${describe(element)} = ${specified['font-size']}`);
    const ownLine = style.getPropertyValue('line-height');
    let lineHeightRatio = null; let lineHeightPx = null;
    if ((!ownLine || ownLine === 'inherit' || ownLine === 'unset') && parent) {
      lineHeightPx = parent.unitlessLine ? fontSizePx === null ? null : parent.lineHeightRatio * fontSizePx : parent.lineHeightPx;
      lineHeightRatio = lineHeightPx === null || !fontSizePx ? null : lineHeightPx / fontSizePx;
    } else if (/^[\d.]+$/.test(specified['line-height'])) {
      lineHeightRatio = Number(specified['line-height']); lineHeightPx = fontSizePx === null ? null : lineHeightRatio * fontSizePx;
    } else {
      lineHeightPx = lengthPx(specified['line-height'], { font: fontSizePx, root: rootSizePx, percent: fontSizePx });
      lineHeightRatio = lineHeightPx === null || !fontSizePx ? null : lineHeightPx / fontSizePx;
    }
    const ownLetter = style.getPropertyValue('letter-spacing');
    const letterSpacingPx = (!ownLetter || ownLetter === 'inherit' || ownLetter === 'unset') && parent ? parent.letterSpacingPx
      : specified['letter-spacing'] === 'normal' ? 0 : lengthPx(specified['letter-spacing'], { font: fontSizePx, root: rootSizePx });
    const weight = specified['font-weight'];
    const fontWeight = weight === 'normal' ? 400 : weight === 'bold' ? 700 : /^\d+$/.test(weight) ? Number(weight) : null;
    const result = { style, variables, specified, provenance, fontSizePx, rootSizePx, lineHeightPx, lineHeightRatio,
      unitlessLine: /^[\d.]+$/.test(specified['line-height']), letterSpacingPx,
      letterSpacingEm: !fontSizePx || letterSpacingPx === null ? null : letterSpacingPx / fontSizePx,
      fontFamily: specified['font-family'], fontWeight };
    cache.set(element, result); return result;
  }
  return { dom, document, get, declarations, excludedRules, diagnostics, scenario };
}
