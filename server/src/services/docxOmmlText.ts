import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import JSZip from 'jszip';

const MATH_NAMESPACES = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/math',
  'http://purl.oclc.org/ooxml/officeDocument/math',
]);
const WORD_DOCUMENT_PATH = 'word/document.xml';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

const NARY_COMMANDS: Record<string, string> = {
  '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint',
  '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap', '⋁': '\\bigvee', '⋀': '\\bigwedge',
};
const ACCENT_COMMANDS: Record<string, string> = {
  '̂': '\\hat', '^': '\\hat', '̃': '\\tilde', '~': '\\tilde', '̄': '\\bar', '̅': '\\bar',
  '⃗': '\\vec', '→': '\\vec', '̇': '\\dot', '̈': '\\ddot', '́': '\\acute', '̀': '\\grave',
  '̌': '\\check', '̆': '\\breve',
};
const DELIMITERS: Record<string, string> = {
  '(': '(', ')': ')', '[': '[', ']': ']', '|': '|', '/': '/',
  '{': '\\{', '}': '\\}', '⟨': '\\langle', '⟩': '\\rangle', '〈': '\\langle', '〉': '\\rangle',
  '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil', '‖': '\\|', '∥': '\\|',
};
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan',
  'log', 'ln', 'lg', 'exp', 'max', 'min', 'sup', 'inf', 'lim', 'det', 'gcd', 'arg', 'deg', 'dim', 'ker',
]);
const LIMIT_OPERATORS = new Set(['lim', 'max', 'min', 'sup', 'inf']);
// Children that only hold other content, with no structure of their own.
const WRAPPERS = new Set(['e', 'num', 'den', 'sub', 'sup', 'deg', 'lim', 'fName', 'box', 'borderBox', 'ins', 'moveTo', 'sdt', 'sdtContent', 'smartTag', 'customXml', 'hyperlink']);
// Nothing a reader sees: tracked deletions and bookkeeping marks.
const SILENT = new Set(['del', 'moveFrom', 'bookmarkStart', 'bookmarkEnd', 'proofErr', 'commentRangeStart', 'commentRangeEnd', 'commentReference', 'lastRenderedPageBreak']);
const SYMBOL_FONT: Record<string, string> = {
  A: 'Α', B: 'Β', C: 'Χ', D: 'Δ', E: 'Ε', F: 'Φ', G: 'Γ', H: 'Η', I: 'Ι', J: 'ϑ', K: 'Κ', L: 'Λ', M: 'Μ', N: 'Ν', O: 'Ο', P: 'Π', Q: 'Θ', R: 'Ρ', S: 'Σ', T: 'Τ', U: 'Υ', V: 'ς', W: 'Ω', X: 'Ξ', Y: 'Ψ', Z: 'Ζ',
  a: 'α', b: 'β', c: 'χ', d: 'δ', e: 'ε', f: 'φ', g: 'γ', h: 'η', i: 'ι', j: 'ϕ', k: 'κ', l: 'λ', m: 'μ', n: 'ν', o: 'ο', p: 'π', q: 'θ', r: 'ρ', s: 'σ', t: 'τ', u: 'υ', v: 'ϖ', w: 'ω', x: 'ξ', y: 'ψ', z: 'ζ',
  '£': '≤', '³': '≥', '¹': '≠', '»': '≈', '±': '±', '´': '×', '¸': '÷', '¥': '∞', 'Ö': '√',
  'å': '∑', 'ò': '∫', 'Õ': '∏', '®': '→', '¬': '←', 'Þ': '⇒', 'Î': '∈', '¶': '∂', 'Ñ': '∇',
};
const UNCONVERTED_NOTE = '公式未能转换,见原页';
const DELIMITER_OPEN = '\\(';
const DELIMITER_CLOSE = '\\)';

// Thrown for anything this code cannot read with confidence. A wrong formula looks
// right to the reader, so it is never guessed at: the whole formula is declared instead.
class UnconvertibleFormula extends Error {}

function refuse(what: string): never {
  throw new UnconvertibleFormula(what);
}

interface LatexContext {
  /** Direct text of an equation array row, where & marks the alignment point. */
  aligned?: boolean;
}

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function childElements(element: Element): Element[] {
  const children: Element[] = [];
  for (let node = element.firstChild; node; node = node.nextSibling) {
    if (isElement(node)) children.push(node);
  }
  return children;
}

function localName(element: Element): string {
  return element.localName || element.nodeName.split(':').pop() || '';
}

function child(element: Element, name: string): Element | null {
  return childElements(element).find((candidate) => localName(candidate) === name) ?? null;
}

function children(element: Element, name: string): Element[] {
  return childElements(element).filter((candidate) => localName(candidate) === name);
}

function attribute(element: Element, name: string): string | null {
  for (const candidate of Array.from(element.attributes)) {
    if ((candidate.localName || candidate.name.split(':').pop()) === name) return candidate.value;
  }
  return null;
}

// The m:val attribute of a child of the element's properties, such as m:chr in m:naryPr.
function prop(element: Element, propsName: string, name: string): string | null {
  const value = child(child(element, propsName) ?? element, name);
  return value ? attribute(value, 'val') ?? '' : null;
}

function propIsOn(element: Element, propsName: string, name: string): boolean {
  const value = prop(element, propsName, name);
  return value !== null && value !== '0' && value !== 'off' && value !== 'false';
}

function escapeLatex(text: string, context: LatexContext = {}): string {
  return text.replace(/[\\$%&#_{}^~]/g, (char) => {
    if (char === '\\') return '\\backslash ';
    if (char === '&' && context.aligned) return '&';
    if (char === '^') return '\\text{\\textasciicircum}';
    if (char === '~') return '\\text{\\textasciitilde}';
    return `\\${char}`;
  });
}

function escapeText(text: string): string {
  return text.replace(/[\\$%&#_{}^~]/g, (char) => {
    if (char === '\\') return '\\textbackslash{}';
    if (char === '^') return '\\textasciicircum{}';
    if (char === '~') return '\\textasciitilde{}';
    return `\\${char}`;
  });
}

// The characters a reader would see, skipping tracked deletions.
function textOf(element: Element): string[] {
  const parts: string[] = [];
  const visit = (current: Element) => {
    const name = localName(current);
    if (SILENT.has(name)) return;
    if (name === 't') parts.push(current.textContent ?? '');
    else childElements(current).forEach(visit);
  };
  visit(element);
  return parts;
}

function joined(elements: Array<Element | null>, context: LatexContext = {}): string {
  return elements.map((element) => (element ? toLatex(element, context) : '')).join('');
}

function arg(element: Element, name: string): string {
  return joined([child(element, name)]);
}

function delimiter(value: string | null, fallback: string): string {
  const char = value === null ? fallback : value;
  if (char === '') return '.';
  const known = DELIMITERS[char];
  if (!known) refuse(`delimiter ${char}`);
  return known;
}

// A control word swallows a following letter, so it must not touch one.
function closeWord(latex: string): string {
  return /\\[A-Za-z]+$/.test(latex) ? `${latex} ` : latex;
}

function symbolCharacter(element: Element): string {
  if (attribute(element, 'font') !== 'Symbol') refuse('symbol font');
  const code = Number.parseInt(attribute(element, 'char') ?? '', 16);
  const mapped = Number.isFinite(code) ? SYMBOL_FONT[String.fromCharCode(code & 0xff)] : undefined;
  if (!mapped) refuse('symbol character');
  return mapped;
}

function runToLatex(element: Element, context: LatexContext): string {
  const normal = propIsOn(element, 'rPr', 'nor');
  let out = '';
  for (const part of childElements(element)) {
    const name = localName(part);
    if (name.endsWith('Pr') || SILENT.has(name)) continue;
    if (name === 't') {
      const text = part.textContent ?? '';
      out += normal ? (text ? `\\text{${escapeText(text)}}` : '') : escapeLatex(text, context);
    } else if (name === 'sym') out += symbolCharacter(part);
    else refuse(name);
  }
  return out;
}

function limit(element: Element, script: '_' | '^'): string {
  const base = arg(element, 'e');
  const bound = arg(element, 'lim');
  if (LIMIT_OPERATORS.has(base)) return `\\${base}${script}{${bound}}`;
  if (/^[A-Za-z]{2,}( [A-Za-z]+)*$/.test(base)) return `\\operatorname*{${base}}${script}{${bound}}`;
  if (/^\\(underbrace|overbrace)\{/.test(base)) return `${base}${script}{${bound}}`;
  return `${script === '_' ? '\\underset' : '\\overset'}{${bound}}{${base}}`;
}

function toLatex(element: Element, context: LatexContext = {}): string {
  const name = localName(element);
  if (name.endsWith('Pr') || SILENT.has(name)) return '';
  if (WRAPPERS.has(name)) return childElements(element).map((part) => toLatex(part, context)).join('');
  switch (name) {
    case 'r':
      return runToLatex(element, context);
    case 'f': {
      const num = arg(element, 'num');
      const den = arg(element, 'den');
      return prop(element, 'fPr', 'type') === 'noBar' ? `{${num} \\atop ${den}}` : `\\frac{${num}}{${den}}`;
    }
    case 'sSup':
      return `{${arg(element, 'e')}}^{${arg(element, 'sup')}}`;
    case 'sSub':
      return `{${arg(element, 'e')}}_{${arg(element, 'sub')}}`;
    case 'sSubSup':
      return `{${arg(element, 'e')}}_{${arg(element, 'sub')}}^{${arg(element, 'sup')}}`;
    case 'sPre':
      return `{}_{${arg(element, 'sub')}}^{${arg(element, 'sup')}}{${arg(element, 'e')}}`;
    case 'rad': {
      const degree = arg(element, 'deg');
      return `\\sqrt${degree ? `[${degree}]` : ''}{${arg(element, 'e')}}`;
    }
    case 'nary': {
      const char = prop(element, 'naryPr', 'chr') || '∫';
      const command = NARY_COMMANDS[char];
      if (!command) refuse(`operator ${char}`);
      const sub = arg(element, 'sub');
      const sup = arg(element, 'sup');
      return `${command}${sub ? `_{${sub}}` : ''}${sup ? `^{${sup}}` : ''}{${arg(element, 'e')}}`;
    }
    case 'd': {
      const separatorChar = prop(element, 'dPr', 'sepChr');
      const separator = separatorChar === '' ? '' : ` ${closeWord(delimiter(separatorChar, '|'))} `;
      const parts = children(element, 'e').map((part) => joined([part]));
      return `\\left${closeWord(delimiter(prop(element, 'dPr', 'begChr'), '('))}${parts.join(separator)}\\right${closeWord(delimiter(prop(element, 'dPr', 'endChr'), ')'))}`;
    }
    case 'func': {
      const fn = arg(element, 'fName');
      const body = arg(element, 'e');
      if (FUNCTIONS.has(fn)) return `\\${fn}{${body}}`;
      return /^[A-Za-z]{2,}( [A-Za-z]+)*$/.test(fn) ? `\\operatorname{${fn}}{${body}}` : `${fn}{${body}}`;
    }
    case 'limLow':
      return limit(element, '_');
    case 'limUpp':
      return limit(element, '^');
    case 'm': {
      const rows = children(element, 'mr').map((row) => children(row, 'e').map((cell) => joined([cell])).join(' & '));
      return `\\begin{matrix} ${rows.join(' \\\\ ')} \\end{matrix}`;
    }
    case 'eqArr': {
      const rows = children(element, 'e').map((row) => joined([row], { aligned: true }));
      return `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
    }
    case 'acc': {
      const char = prop(element, 'accPr', 'chr') ?? '̂';
      const command = ACCENT_COMMANDS[char];
      if (!command) refuse(`accent ${char}`);
      return `${command}{${arg(element, 'e')}}`;
    }
    case 'bar':
      // ECMA-376: m:pos defaults to bot on a bar.
      return `${prop(element, 'barPr', 'pos') === 'top' ? '\\overline' : '\\underline'}{${arg(element, 'e')}}`;
    case 'groupChr': {
      const char = prop(element, 'groupChrPr', 'chr') || '⏟';
      const above = prop(element, 'groupChrPr', 'pos') === 'top';
      if (char === '⏟') return `\\underbrace{${arg(element, 'e')}}`;
      if (char === '⏞') return `\\overbrace{${arg(element, 'e')}}`;
      if (char.length !== 1 || /[A-Za-z0-9\\{}$%&#_^~]/.test(char)) refuse(`group character ${char}`);
      return `${above ? '\\overset' : '\\underset'}{${char}}{${arg(element, 'e')}}`;
    }
    case 'phant':
      return prop(element, 'phantPr', 'show') === '0' ? `\\phantom{${arg(element, 'e')}}` : arg(element, 'e');
    default:
      return refuse(name);
  }
}

function withoutSpace(text: string): string {
  return text.replace(/\s+/g, '');
}

// Order is not compared: a limit legitimately writes its bound before its base.
// ^ and ~ become named text commands, so they cannot be found by character.
function keepsEveryCharacter(latex: string, source: string[]): boolean {
  const available = new Map<string, number>();
  for (const char of withoutSpace(latex)) available.set(char, (available.get(char) ?? 0) + 1);
  for (const char of withoutSpace(source.join(''))) {
    if (char === '^' || char === '~') continue;
    const left = available.get(char) ?? 0;
    if (left === 0) return false;
    available.set(char, left - 1);
  }
  return true;
}

function runBreaksLine(element: Element): boolean {
  return localName(element) === 'r' && (Boolean(child(element, 'br')) || propIsOn(element, 'rPr', 'brk'));
}

// A line break can only be honoured between top-level pieces; each line is its own formula.
function ommlLines(oMath: Element): string[] {
  const lines: string[] = [''];
  for (const part of childElements(oMath)) {
    if (!runBreaksLine(part)) {
      lines[lines.length - 1] += toLatex(part);
      continue;
    }
    const manualBreak = propIsOn(part, 'rPr', 'brk');
    if (manualBreak) lines.push('');
    for (const piece of childElements(part)) {
      const name = localName(piece);
      if (name === 'br') lines.push('');
      else if (name === 't') lines[lines.length - 1] += propIsOn(part, 'rPr', 'nor')
        ? `\\text{${escapeText(piece.textContent ?? '')}}` : escapeLatex(piece.textContent ?? '');
      else if (name === 'sym') lines[lines.length - 1] += symbolCharacter(piece);
      else if (!name.endsWith('Pr') && !SILENT.has(name)) refuse(name);
    }
  }
  return lines.filter(Boolean);
}

export interface ConvertedFormula {
  text: string;
  unconverted: boolean;
}

function unconvertedText(source: string): string {
  const original = source.trim();
  return original ? `[${UNCONVERTED_NOTE};原文字符:${original}]` : `[${UNCONVERTED_NOTE}]`;
}

export function convertOmml(oMath: Element): ConvertedFormula {
  const source = textOf(oMath);
  try {
    const lines = ommlLines(oMath);
    if (!keepsEveryCharacter(lines.join(''), source)) refuse('characters did not survive');
    return { text: lines.map((line) => `${DELIMITER_OPEN}${closeWord(line)}${DELIMITER_CLOSE}`).join(' '), unconverted: false };
  } catch (error) {
    if (!(error instanceof UnconvertibleFormula)) throw error;
    return { text: unconvertedText(source.join('')), unconverted: true };
  }
}

function isMath(element: Element, name: string): boolean {
  return localName(element) === name && MATH_NAMESPACES.has(element.namespaceURI ?? '');
}

function outermostFormulas(root: Element): Element[] {
  const found: Element[] = [];
  const visit = (element: Element) => {
    if (isMath(element, 'oMath') || isMath(element, 'oMathPara')) found.push(element);
    else childElements(element).forEach(visit);
  };
  visit(root);
  return found;
}

function hasParagraphAncestor(element: Element, wordNamespace: string): boolean {
  for (let parent = element.parentNode; parent; parent = parent.parentNode) {
    if (isElement(parent) && localName(parent) === 'p' && parent.namespaceURI === wordNamespace) return true;
  }
  return false;
}

// Returns how many formulas had to be declared rather than converted.
function replaceFormula(formula: Element, document: Document, wordNamespace: string, prefix: string): number {
  const converted = (isMath(formula, 'oMathPara') ? children(formula, 'oMath') : [formula]).map(convertOmml);
  const text = converted.map((part) => part.text).filter(Boolean).join(' ');
  const parent = formula.parentNode!;
  if (!text) {
    parent.removeChild(formula);
    return 0;
  }
  const name = (local: string) => `${prefix}${local}`;
  const run = document.createElementNS(wordNamespace, name('r'));
  const textElement = document.createElementNS(wordNamespace, name('t'));
  textElement.setAttributeNS(XML_NAMESPACE, 'xml:space', 'preserve');
  textElement.appendChild(document.createTextNode(text));
  run.appendChild(textElement);
  if (hasParagraphAncestor(formula, wordNamespace)) {
    parent.replaceChild(run, formula);
  } else {
    // A display formula may sit directly in the body or a table cell.
    const paragraph = document.createElementNS(wordNamespace, name('p'));
    paragraph.appendChild(run);
    parent.replaceChild(paragraph, formula);
  }
  return converted.filter((part) => part.unconverted).length;
}

export interface InlinedDocx {
  buffer: Buffer;
  /** Formulas left as a visible note in the text; the reader must be told. */
  unconverted: number;
}

// Word stores formulas as OMML, which mammoth drops. They become ordinary text runs here,
// so the rest of the pipeline is untouched. A document with no formula comes back as is.
export async function inlineDocxFormulas(buffer: Buffer): Promise<InlinedDocx> {
  const untouched = { buffer, unconverted: 0 };
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file(WORD_DOCUMENT_PATH);
  if (!part) return untouched;
  const xml = await part.async('string');
  if (!xml.includes('oMath')) return untouched;
  // A warning counts too: xmldom recovers from broken XML by quietly dropping the rest.
  // mammoth's own parser refuses what this refuses, so no good document is lost here.
  const fail = (message: string) => { throw new Error(`document.xml could not be read: ${message}`); };
  const document = new DOMParser({
    errorHandler: { warning: fail, error: fail, fatalError: fail },
  }).parseFromString(xml, 'text/xml') as unknown as Document;
  const root = document.documentElement;
  if (!root) return untouched;
  const formulas = outermostFormulas(root as unknown as Element);
  if (!formulas.length) return untouched;
  const wordNamespace = root.namespaceURI ?? '';
  const prefix = root.prefix ? `${root.prefix}:` : '';
  let unconverted = 0;
  for (const formula of formulas) unconverted += replaceFormula(formula, document, wordNamespace, prefix);
  zip.file(WORD_DOCUMENT_PATH, new XMLSerializer().serializeToString(document as never));
  return { buffer: await zip.generateAsync({ type: 'nodebuffer' }), unconverted };
}

// Formula handling must never cost an import: on any failure the original goes through.
export async function inlineDocxFormulasOrOriginal(
  buffer: Buffer,
  inline: (input: Buffer) => Promise<InlinedDocx> = inlineDocxFormulas,
): Promise<InlinedDocx> {
  try {
    return await inline(buffer);
  } catch (error) {
    console.warn(`Docx formula handling skipped: ${error instanceof Error ? error.message : String(error)}`);
    return { buffer, unconverted: 0 };
  }
}
