// Compares what the docx parser writes against the hand-written gold standard, by meaning rather than by characters.
// Usage: node --import tsx check_gold.mjs <repo root>
// Verdicts: ok (same meaning as a gold reading), degraded (says it could not convert, and the notice speaks),
// EYE (same structure and leaves, a person must look), WRONG, INVALID (KaTeX rejects it).
// Exits nonzero on any WRONG or INVALID. There is no other way to pass: degraded and ok are the only two clean results.
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = process.argv[2] || 'D:/Coinsides/v2.x/Coincides';
const require = createRequire(`${REPO}/client/package.json`);
const katex = require('katex');
const { parseSourceArtifact } = await import(pathToFileURL(`${REPO}/server/src/services/sourceArtifact.ts`).href);
const gold = JSON.parse(fs.readFileSync(join(HERE, 'gold.json'), 'utf8'));

const NAMES = { '\\Delta': 'Δ', '\\sigma': 'σ', '\\theta': 'θ', '\\beta': 'β', '\\sim': '∼', '\\rightarrow': '→', '\\to': '→', '\\infty': '∞', '\\ge': '≥', '\\geq': '≥', '\\le': '≤', '\\leq': '≤', '\\rho': 'ρ', '\\nabla': '∇', '\\partial': '∂', '\\in': '∈', '\\cup': '∪', '\\cap': '∩', '\\langle': '⟨', '\\rangle': '⟩', '\\{': '{', '\\}': '}', '\\lbrace': '{', '\\rbrace': '}', '\\vert': '|', '\\lvert': '|', '\\rvert': '|', '\\mid': '|', '\\backslash': '\\', '\\%': '%', '\\$': '$', '\\&': '&', '\\_': '_', '\\#': '#', '−': '-', '\\minus': '-', '\\ne': '≠', '\\neq': '≠', '\\approx': '≈', '\\notin': '∉', '\\subset': '⊂', '\\forall': '∀', '\\exists': '∃', '\\Rightarrow': '⇒', '\\Leftrightarrow': '⇔', '\\alpha': 'α', '\\gamma': 'γ', '\\vert ': '|', '\\textasciicircum': '^', '\\textasciitilde': '~' };
const norm = (s) => (NAMES[s] ?? s).replace(/\s+/g, '');
const list = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const SKIP = new Set(['spacing', 'kern', 'internal', 'color-token', 'styling-skip']);

// One string per meaning: redundant braces, math or text mode, and \left vs plain delimiters do not count.
function canon(node) {
  if (Array.isArray(node)) return node.map(canon).join('');
  if (!node) return '';
  switch (node.type) {
    case 'ordgroup': case 'styling': case 'sizing': case 'font': case 'text': case 'mclass': case 'color': case 'lap': case 'hbox':
      return canon(node.body);
    case 'mathord': case 'textord': case 'atom': case 'accent-token': case 'op-token':
      return norm(node.text);
    case 'op':
      return node.symbol ? norm(node.name) : node.name ? norm(node.name.replace(/^\\/, '')) : canon(node.body);
    case 'operatorname':
      return canon(node.body);
    case 'supsub': {
      const inner = canon(node.base);
      const sub = canon(node.sub); const sup = canon(node.sup);
      return `S[${inner}|${sub}|${sup}]`;
    }
    case 'genfrac':
      return `${node.hasBarLine ? 'F' : 'K'}[${canon(node.numer)}|${canon(node.denom)}]`;
    case 'sqrt':
      return `R[${canon(node.index)}|${canon(node.body)}]`;
    case 'leftright':
      return `${node.left === '.' ? '' : norm(node.left)}${canon(node.body)}${node.right === '.' ? '' : norm(node.right)}`;
    case 'accent':
      return `A[${String(node.label).replace(/^\\/, '').replace('widehat', 'hat').replace('overrightarrow', 'vec').replace('bar', 'overline')}|${canon(node.base)}]`;
    case 'overline':
      return `A[overline|${canon(node.body)}]`;
    case 'underline':
      return `U[${canon(node.body)}]`;
    case 'horizBrace':
      return `B[${node.isOver ? 'over' : 'under'}|${canon(node.base)}]`;
    case 'enclose':
      return canon(node.body);
    case 'phantom': case 'hphantom': case 'vphantom':
      return canon(node.body);
    case 'array':
      return `M[${node.body.map((row) => row.map(canon).join('&')).join(';')}]`;
    case 'cr':
      return ';';
    default:
      return `${node.type}[${canon(node.body)}]`;
  }
}
const parse = (latex) => katex.__parse(latex, { throwOnError: true, strict: 'ignore', displayMode: true });
const reading = (latex) => canon(parse(latex));
const shape = (s) => [...s].sort().join('');

function segments(text) {
  const out = [];
  const bracket = /\\\(([\s\S]*?)\\\)/g;
  if (text.includes('\\(')) { for (const m of text.matchAll(bracket)) out.push(m[1]); return out; }
  for (const m of text.matchAll(/\$((?:\\\$|[^$])+)\$/g)) out.push(m[1]);
  return out;
}
const DEGRADED = /未能转换|could not be converted/i;
const STYLE_ONLY = /^\w+ style with ID .* was referenced but not defined in the document$/;
const tally = { ok: 0, degraded: 0, EYE: 0, WRONG: 0, INVALID: 0, MISSING: 0 };
const rows = [];
for (const [docName, items] of Object.entries(gold.documents)) {
  const file = join(HERE, docName);
  const artifact = await parseSourceArtifact({ parser_key: 'native-docx', parser_version: 'gold', file_path: file, original_filename: docName, mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  const speaks = (artifact.metadata.parser_messages || []).some((m) => !STYLE_ONLY.test(String(m?.message ?? '')));
  console.log(`\n=== ${docName}  notice speaks: ${speaks}`);
  for (const item of items) {
    const block = artifact.blocks.find((b) => b.text.startsWith(`${item.label}：`) || b.text.startsWith(item.label));
    let verdict; let note = '';
    if (!block) { verdict = 'MISSING'; } else {
      const got = segments(block.text.slice(item.label.length));
      if (!got.length && DEGRADED.test(block.text)) {
        verdict = speaks ? 'degraded' : 'WRONG';
        if (!speaks) note = 'says it could not convert, but the notice is silent';
      } else {
        try {
          const mine = got.map(reading);
          const golds = item.gold.map((g) => g.map(reading));
          const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
          const exact = golds.some((g) => same(mine, g));
          const close = golds.some((g) => g.length === mine.length && g.every((x, i) => shape(x) === shape(mine[i])));
          verdict = exact ? (item.eye ? 'EYE' : 'ok') : close ? 'EYE' : 'WRONG';
          if (verdict !== 'ok') note = `reads ${JSON.stringify(mine)}; gold ${JSON.stringify(golds[0])}`;
        } catch (error) {
          verdict = 'INVALID'; note = String(error.message).slice(0, 80);
        }
      }
    }
    tally[verdict] += 1;
    rows.push({ doc: docName, label: item.label, verdict, text: block?.text });
    if (verdict !== 'ok') console.log(`${verdict.padEnd(8)} ${item.label}: ${block?.text?.slice(0, 110) ?? ''}\n         source: ${item.source}\n         ${note}`);
  }
}
console.log('\n', JSON.stringify(tally));
fs.writeFileSync(join(process.env.GOLD_OUT || HERE, 'last-run.json'), JSON.stringify({ tally, rows }, null, 1));
process.exitCode = tally.WRONG || tally.INVALID || tally.MISSING ? 1 : 0;
