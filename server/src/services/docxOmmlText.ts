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
  '⃗': '\\vec', '̇': '\\dot', '̈': '\\ddot', '́': '\\acute', '̀': '\\grave', '̌': '\\check',
  '̆': '\\breve',
};
const DELIMITERS: Record<string, string> = {
  '{': '\\{', '}': '\\}', '⟨': '\\langle', '⟩': '\\rangle', '〈': '\\langle', '〉': '\\rangle',
  '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil', '‖': '\\|', '∥': '\\|',
};
const FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan',
  'log', 'ln', 'lg', 'exp', 'max', 'min', 'sup', 'inf', 'lim', 'det', 'gcd', 'arg', 'deg', 'dim', 'ker',
]);
const LIMIT_OPERATORS = new Set(['lim', 'max', 'min', 'sup', 'inf']);

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

// The m:val attribute of a child of the element's properties, such as m:chr in m:naryPr.
function prop(element: Element, propsName: string, name: string): string | null {
  const value = child(child(element, propsName) ?? element, name);
  if (!value) return null;
  for (const attribute of Array.from(value.attributes)) {
    if ((attribute.localName || attribute.name.split(':').pop()) === 'val') return attribute.value;
  }
  return '';
}

function propIsOn(element: Element, propsName: string, name: string): boolean {
  const value = prop(element, propsName, name);
  return value !== null && value !== '0' && value !== 'off' && value !== 'false';
}

function escapeLatex(text: string): string {
  return text.replace(/[\\$%&#_{}]/g, (char) => (char === '\\' ? '\\backslash ' : `\\${char}`));
}

function textOf(element: Element): string[] {
  const parts: string[] = [];
  const visit = (current: Element) => {
    if (localName(current) === 't') parts.push(current.textContent ?? '');
    else childElements(current).forEach(visit);
  };
  visit(element);
  return parts;
}

function joined(elements: Array<Element | null>): string {
  return elements.map((element) => (element ? toLatex(element) : '')).join('');
}

function arg(element: Element, name: string): string {
  return joined([child(element, name)]);
}

function delimiter(value: string | null, fallback: string): string {
  const char = value === null ? fallback : value;
  return char === '' ? '.' : DELIMITERS[char] ?? char;
}

function limitBase(element: Element, script: '_' | '^'): string {
  const base = arg(element, 'e');
  const limit = arg(element, 'lim');
  if (LIMIT_OPERATORS.has(base)) return `\\${base}${script}{${limit}}`;
  return `${script === '_' ? '\\underset' : '\\overset'}{${limit}}{${base}}`;
}

function runToLatex(element: Element): string {
  const text = escapeLatex(textOf(element).join(''));
  if (!text) return '';
  return propIsOn(element, 'rPr', 'nor') ? `\\text{${text}}` : text;
}

function toLatex(element: Element): string {
  switch (localName(element)) {
    case 'r':
      return runToLatex(element);
    case 't':
      return escapeLatex(element.textContent ?? '');
    case 'f': {
      const type = prop(element, 'fPr', 'type');
      const num = arg(element, 'num');
      const den = arg(element, 'den');
      if (type === 'lin' || type === 'skw') return `${num}/${den}`;
      if (type === 'noBar') return `{${num} \\atop ${den}}`;
      return `\\frac{${num}}{${den}}`;
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
      const sub = arg(element, 'sub');
      const sup = arg(element, 'sup');
      return `${NARY_COMMANDS[char] ?? char}${sub ? `_{${sub}}` : ''}${sup ? `^{${sup}}` : ''}{${arg(element, 'e')}}`;
    }
    case 'd': {
      const separator = delimiter(prop(element, 'dPr', 'sepChr'), '|');
      const parts = children(element, 'e').map((part) => joined([part]));
      return `\\left${delimiter(prop(element, 'dPr', 'begChr'), '(')}${parts.join(` ${separator} `)}\\right${delimiter(prop(element, 'dPr', 'endChr'), ')')}`;
    }
    case 'func': {
      const name = arg(element, 'fName');
      const body = arg(element, 'e');
      if (FUNCTIONS.has(name)) return `\\${name}{${body}}`;
      return /^[A-Za-z]+$/.test(name) ? `\\operatorname{${name}}{${body}}` : `${name}{${body}}`;
    }
    case 'limLow':
      return limitBase(element, '_');
    case 'limUpp':
      return limitBase(element, '^');
    case 'm': {
      const rows = children(element, 'mr').map((row) => children(row, 'e').map((cell) => joined([cell])).join(' & '));
      return `\\begin{matrix} ${rows.join(' \\\\ ')} \\end{matrix}`;
    }
    case 'eqArr': {
      const rows = children(element, 'e').map((row) => joined([row]));
      return `\\begin{aligned} ${rows.join(' \\\\ ')} \\end{aligned}`;
    }
    case 'acc': {
      const char = prop(element, 'accPr', 'chr') ?? '̂';
      const command = ACCENT_COMMANDS[char];
      return command ? `${command}{${arg(element, 'e')}}` : `{${arg(element, 'e')}}^{${escapeLatex(char)}}`;
    }
    case 'bar':
      return `${prop(element, 'barPr', 'pos') === 'bot' ? '\\underline' : '\\overline'}{${arg(element, 'e')}}`;
    case 'groupChr': {
      const below = (prop(element, 'groupChrPr', 'pos') ?? 'bot') !== 'top';
      return `${below ? '\\underbrace' : '\\overbrace'}{${arg(element, 'e')}}`;
    }
    // Properties carry no text. Everything else, known wrapper or not, keeps its text.
    case 'rPr': case 'ctrlPr': case 'oMathParaPr':
      return '';
    default:
      return childElements(element).map(toLatex).join('');
  }
}

function withoutSpace(text: string): string {
  return text.replace(/\s+/g, '');
}

function keepsEveryCharacter(latex: string, source: string[]): boolean {
  const target = withoutSpace(latex);
  let position = 0;
  for (const char of withoutSpace(source.join(''))) {
    position = target.indexOf(char, position);
    if (position < 0) return false;
    position += char.length;
  }
  return true;
}

// Falls back to the formula's plain text if a conversion ever loses a character.
export function ommlToLatex(oMath: Element): string {
  const source = textOf(oMath);
  const latex = childElements(oMath).map(toLatex).join('');
  return keepsEveryCharacter(latex, source) ? latex : source.join('');
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

function replaceFormula(formula: Element, document: Document, wordNamespace: string, prefix: string): void {
  const parts = isMath(formula, 'oMathPara')
    ? children(formula, 'oMath').map(ommlToLatex)
    : [ommlToLatex(formula)];
  const text = parts.filter(Boolean).map((part) => `$${part}$`).join(' ');
  const parent = formula.parentNode!;
  if (!text) {
    parent.removeChild(formula);
    return;
  }
  const name = (local: string) => `${prefix}${local}`;
  const run = document.createElementNS(wordNamespace, name('r'));
  const textElement = document.createElementNS(wordNamespace, name('t'));
  textElement.setAttributeNS(XML_NAMESPACE, 'xml:space', 'preserve');
  textElement.appendChild(document.createTextNode(text));
  run.appendChild(textElement);
  if (hasParagraphAncestor(formula, wordNamespace)) {
    parent.replaceChild(run, formula);
    return;
  }
  // A display formula may sit directly in the body or a table cell.
  const paragraph = document.createElementNS(wordNamespace, name('p'));
  paragraph.appendChild(run);
  parent.replaceChild(paragraph, formula);
}

// Word stores formulas as OMML, which mammoth drops. They become ordinary text runs here,
// so the rest of the pipeline is untouched. A document with no formula comes back as is.
export async function inlineDocxFormulas(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file(WORD_DOCUMENT_PATH);
  if (!part) return buffer;
  const xml = await part.async('string');
  if (!xml.includes('oMath')) return buffer;
  const fail = (message: string) => { throw new Error(`document.xml could not be read: ${message}`); };
  const document = new DOMParser({
    errorHandler: { warning: () => undefined, error: fail, fatalError: fail },
  }).parseFromString(xml, 'text/xml') as unknown as Document;
  const root = document.documentElement;
  if (!root) return buffer;
  const formulas = outermostFormulas(root as unknown as Element);
  if (!formulas.length) return buffer;
  const wordNamespace = root.namespaceURI ?? '';
  const prefix = root.prefix ? `${root.prefix}:` : '';
  for (const formula of formulas) replaceFormula(formula, document, wordNamespace, prefix);
  zip.file(WORD_DOCUMENT_PATH, new XMLSerializer().serializeToString(document as never));
  return zip.generateAsync({ type: 'nodebuffer' });
}

// Formula handling must never cost an import: on any failure the original goes through.
export async function inlineDocxFormulasOrOriginal(
  buffer: Buffer,
  inline: (input: Buffer) => Promise<Buffer> = inlineDocxFormulas,
): Promise<Buffer> {
  try {
    return await inline(buffer);
  } catch (error) {
    console.warn(`Docx formula handling skipped: ${error instanceof Error ? error.message : String(error)}`);
    return buffer;
  }
}
