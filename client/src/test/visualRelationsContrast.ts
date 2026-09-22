/** DOM relationship scanner. No block kinds, skin names or expected colors live here.
 * jsdom exposes var()/color-mix() instead of resolving them, so the adapter below
 * resolves that supported CSS subset from the actual cascaded production styles.
 * Unknown paint is an error, never a passing/white-background fallback.
 */
type Color = { r: number; g: number; b: number; a: number };
export type ContrastSample = {
  element: string; text: string; foreground: Color; backgrounds: Color[];
  fontSize: number; fontWeight: number; threshold: number; ratio: number;
};
export type ContrastScan = { samples: ContrastSample[]; failures: string[]; exemptions: string[] };

function luminance(color: Color): number {
  const linear = [color.r, color.g, color.b].map((v) => v / 255)
    .map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

function splitArgs(value: string): string[] {
  let depth = 0; let start = 0; const result: string[] = [];
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (value[i] === ',' && depth === 0) { result.push(value.slice(start, i).trim()); start = i + 1; }
  }
  result.push(value.slice(start).trim());
  return result;
}

export function resolveCssValue(value: string, element: Element, chain: string[] = []): string {
  let result = value;
  while (result.includes('var(')) {
    const start = result.indexOf('var('); let end = start + 4; let depth = 1;
    while (end < result.length && depth) { if (result[end] === '(') depth++; if (result[end] === ')') depth--; end++; }
    if (depth) throw new Error(`Malformed CSS: ${value}`);
    const [name, ...fallback] = splitArgs(result.slice(start + 4, end - 1));
    if (chain.includes(name)) throw new Error(`Cyclic CSS token: ${[...chain, name].join(' -> ')}`);
    let owner: Element | null = element; let token = '';
    while (owner) {
      token = getComputedStyle(owner).getPropertyValue(name).trim();
      if (token) break;
      owner = owner.parentElement;
    }
    if (!token || token === 'initial') token = fallback.join(',');
    if (!token) throw new Error(`Unresolved CSS token ${name}`);
    const resolved = resolveCssValue(token, owner ?? element, [...chain, name]);
    result = result.slice(0, start) + resolved + result.slice(end);
  }
  return result.trim();
}

export function readCss(element: Element, property: string): string {
  const value = getComputedStyle(element).getPropertyValue(property).trim();
  if (!value || /^(inherit|unset)$/.test(value)) return element.parentElement ? readCss(element.parentElement, property) : '';
  return resolveCssValue(value, element);
}

export function parseCssColor(value: string): Color {
  const input = value.trim().toLowerCase();
  if (input === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (input.startsWith('color-mix(')) {
    const [space, left, right] = splitArgs(input.slice(10, -1));
    if (space !== 'in srgb' || !left || !right) throw new Error(`Unsupported color space: ${value}`);
    const part = (s: string) => {
      const match = s.match(/^(.*)\s+([\d.]+)%$/);
      return { color: parseCssColor(match ? match[1] : s), weight: match ? Number(match[2]) / 100 : undefined };
    };
    const a = part(left); const b = part(right);
    const aw = a.weight ?? (b.weight === undefined ? 0.5 : 1 - b.weight);
    const bw = b.weight ?? 1 - aw; const total = aw + bw;
    if (![aw, bw, total].every(Number.isFinite) || aw < 0 || bw < 0 || total <= 0) throw new Error(`Invalid color weights: ${value}`);
    const alpha = (a.color.a * aw + b.color.a * bw) / total;
    const channel = (key: 'r' | 'g' | 'b') => alpha === 0 ? 0
      : (a.color[key] * a.color.a * aw + b.color[key] * b.color.a * bw) / (total * alpha);
    return { r: channel('r'), g: channel('g'), b: channel('b'), a: alpha * Math.min(1, total) };
  }
  const hex = input.match(/^#([\da-f]{3,8})$/i);
  if (hex) {
    let digits = hex[1];
    if (digits.length === 3 || digits.length === 4) digits = [...digits].map((x) => x + x).join('');
    if (digits.length !== 6 && digits.length !== 8) throw new Error(`Invalid hex color ${value}`);
    return { r: parseInt(digits.slice(0, 2), 16), g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16), a: digits.length === 8 ? parseInt(digits.slice(6), 16) / 255 : 1 };
  }
  const rgb = input.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const values = rgb[1].split(/[,\s/]+/).filter(Boolean);
    if (values.length < 3 || values.length > 4) throw new Error(`Unsupported RGB syntax: ${value}`);
    const channel = (v: string) => v.endsWith('%') ? parseFloat(v) * 2.55 : Number(v);
    const result = { r: channel(values[0]), g: channel(values[1]), b: channel(values[2]),
      a: values[3] ? (values[3].endsWith('%') ? parseFloat(values[3]) / 100 : Number(values[3])) : 1 };
    if (!Object.values(result).every(Number.isFinite)) throw new Error(`Unresolved RGB channels: ${value}`);
    return result;
  }
  // Ask the platform for named colors, but fail closed for unsupported functions.
  if (/^[a-z]+$/.test(input)) {
    const probe = document.createElement('span'); probe.style.color = input;
    if (!probe.style.color) throw new Error(`Unsupported color: ${value}`);
    document.body.append(probe);
    const rgbValue = getComputedStyle(probe).color; probe.remove();
    if (rgbValue && rgbValue !== input) return parseCssColor(rgbValue);
  }
  throw new Error(`Unsupported color: ${value}`);
}

function over(fg: Color, bg: Color): Color {
  const a = fg.a + bg.a * (1 - fg.a);
  const c = (key: 'r' | 'g' | 'b') => a === 0 ? 0 : (fg[key] * fg.a + bg[key] * bg.a * (1 - fg.a)) / a;
  return { r: c('r'), g: c('g'), b: c('b'), a };
}
export function contrastRatio(foreground: Color, background: Color): number {
  const a = luminance(over(foreground, background)); const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function backgrounds(element: Element): Color[] {
  const chain: Element[] = []; let current: Element | null = element;
  while (current) { chain.unshift(current); current = current.parentElement; }
  let paints: Color[] = [{ r: 0, g: 0, b: 0, a: 0 }];
  for (const node of chain) {
    const css = getComputedStyle(node);
    const base = parseCssColor(resolveCssValue(css.backgroundColor || 'transparent', node));
    paints = paints.map((paint) => over(base, paint));
    const image = resolveCssValue(css.backgroundImage || 'none', node);
    if (image !== 'none') {
      if (!/^(linear|radial)-gradient\(/.test(image)) throw new Error(`Unmeasured background image: ${image}`);
      // Factory paper gradients have opaque, channel-monotonic sRGB stops.
      // Reject other gradients instead of claiming endpoints bound every hue path.
      const stops = splitArgs(image.slice(image.indexOf('(') + 1, -1)).flatMap((stop, index) => {
        const linearDirection = /^(?:to(?:\s+(?:top|bottom|left|right)){1,2}|-?(?:\d*\.)?\d+(?:deg|grad|rad|turn))$/;
        const radialPosition = /^(?:(?:circle|ellipse|closest-side|farthest-side|closest-corner|farthest-corner)(?:\s|$)|at\s)/;
        if (index === 0 && (image.startsWith('linear-gradient(') ? linearDirection.test(stop) : radialPosition.test(stop))) return [];
        const color = stop.replace(/\s+-?[\d.]+(?:%|px)(?:\s+-?[\d.]+(?:%|px))?$/, '');
        // Only the first direction/position is metadata. Every color stop must
        // be parsed, including named colors, or fail closed rather than vanish.
        return [parseCssColor(color)];
      });
      if (!stops.length) throw new Error(`Unmeasured gradient: ${image}`);
      for (let index = 0; index < stops.length; index++) {
        if (stops[index].a !== 1) throw new Error(`Unmeasured translucent gradient: ${image}`);
        if (!index) continue;
        const differences = (['r', 'g', 'b'] as const).map((key) => stops[index][key] - stops[index - 1][key]);
        if (differences.some((v) => v < 0) && differences.some((v) => v > 0)) throw new Error(`Unmeasured gradient hue path: ${image}`);
      }
      paints = paints.flatMap((paint) => stops.map((stop) => over(stop, paint)));
    }
  }
  if (paints.some((paint) => paint.a < 0.999)) throw new Error('No opaque actual background');
  return paints;
}

function fontSize(element: Element): number {
  const raw = getComputedStyle(element).fontSize;
  if (!raw || /^(inherit|unset)$/.test(raw)) return element.parentElement ? fontSize(element.parentElement) : 16;
  let size = resolveCssValue(raw, element).replace(/^calc\((.*)\)$/, '$1').trim();
  const product = size.match(/^([\d.]+)px\s*\*\s*([\d.]+)$/);
  if (product) size = `${Number(product[1]) * Number(product[2])}px`;
  const match = size.match(/^([\d.]+)(px|em|rem|%)$/);
  if (!match) throw new Error(`Unmeasured font size: ${size}`);
  const parent = element.parentElement ? fontSize(element.parentElement) : 16;
  const rootSize = element === document.documentElement ? 16 : fontSize(document.documentElement);
  return Number(match[1]) * (match[2] === 'px' ? 1 : match[2] === 'rem' ? rootSize : match[2] === '%' ? parent / 100 : parent);
}

function paintVisibility(element: Element) {
  let hidden = false; let opacity = 1;
  for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
    const css = getComputedStyle(ancestor);
    hidden ||= css.display === 'none' || css.visibility === 'hidden' || ancestor.hasAttribute('hidden');
    if (ancestor.matches('details:not([open])') && !ancestor.querySelector('summary')?.contains(element)) hidden = true;
    opacity *= css.opacity ? Number(css.opacity) : 1;
  }
  return { hidden: hidden || opacity === 0, opacity };
}

export function scanTextContrast(root: Element): ContrastScan {
  const result: ContrastScan = { samples: [], failures: [], exemptions: [] };
  for (const element of [root, ...root.querySelectorAll('*')]) {
    // KaTeX exposes a parallel accessible MathML tree; the painted HTML glyphs
    // remain in the scan. jsdom cannot compute style on MathML elements.
    if (element.closest('math')) continue;
    if (element.matches('style, script, title, desc, option') || element.closest('svg:not(:has(text))')) continue;
    if (element instanceof HTMLInputElement && !['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(element.type)) continue;
    const text = element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement
      ? element.value : [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join('').trim();
    if (!text) continue;
    const id = `${element.closest('[data-block-id]')?.getAttribute('data-block-id') ?? 'paper'}:${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`;
    const { hidden, opacity } = paintVisibility(element);
    if (hidden || opacity === 0) { result.exemptions.push(`${id}: hidden`); continue; }
    try {
      if (opacity !== 1) throw new Error('Group opacity requires browser compositing; not measured by this adapter');
      const color = readCss(element, element.namespaceURI?.includes('svg') ? 'fill' : 'color');
      const fg = parseCssColor(color.toLowerCase() === 'currentcolor' ? readCss(element, 'color') : color);
      if (fg.a === 0) {
        // Exempt only the two intentional duplicate paint layers, and require a
        // nontransparent sibling carrying the same text. Transparent content
        // otherwise fails at ratio 1, including a future invisible cover title.
        const twin = [...(element.parentElement?.children ?? [])].find((candidate) => candidate !== element
          && (candidate instanceof HTMLTextAreaElement ? candidate.value : candidate.textContent)?.trim() === text.trim()
          && !paintVisibility(candidate).hidden && paintVisibility(candidate).opacity === 1
          && parseCssColor(readCss(candidate, 'color')).a > 0);
        if (twin && (element.matches('[aria-hidden="true"]') || element instanceof HTMLTextAreaElement)) {
          result.exemptions.push(`${id}: transparent duplicate; painted sibling scanned`); continue;
        }
      }
      fg.a *= opacity;
      const bgs = backgrounds(element); const size = fontSize(element);
      const weightValue = readCss(element, 'font-weight');
      const weight = weightValue === 'bold' ? 700 : Number(weightValue) || 400;
      const threshold = size >= 24 || (size >= 56 / 3 && weight >= 700) ? 3 : 4.5;
      const bgLuminances = bgs.map(luminance);
      const crossesInk = bgs.length > 1 && luminance(fg) >= Math.min(...bgLuminances) && luminance(fg) <= Math.max(...bgLuminances);
      const ratio = crossesInk ? 1 : Math.min(...bgs.map((bg) => contrastRatio(fg, bg)));
      result.samples.push({ element: id, text: text.slice(0, 80), foreground: fg, backgrounds: bgs, fontSize: size, fontWeight: weight, threshold, ratio });
      if (ratio < threshold) result.failures.push(`${id} ${JSON.stringify(text.slice(0, 36))}: ${ratio.toFixed(3)} < ${threshold}`);
    } catch (error) { result.failures.push(`${id}: ${String(error)}`); }
  }
  return result;
}
