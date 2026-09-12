// Read-only comparison of B1d product sources to the captured pre-edit source.
// Run from the repository root. Writes only changed-request-check.json here.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('../../../../client/node_modules/typescript');
const root = process.cwd();
const baseline = path.resolve(__dirname, '../baseline-source');
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else files.push(file);
  }
}
walk(baseline);
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
function inspect(file, source) {
  if (!/\.[jt]sx?$/.test(file) || /\.test\.[jt]sx?$/.test(file)) return null;
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const requests = [];
  const imports = [];
  const requestEffects = [];
  const requestPattern = /\b(?:(?:api|axios)\.(?:get|post|put|patch|delete|request)|fetch)\s*(?:<[^;]*?>)?\s*\(/;
  function visit(node) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      imports.push(node.getText(sf));
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(sf);
      if (/^(?:(?:api|axios)\.(?:get|post|put|patch|delete|request)|fetch)$/.test(callee)) {
        requests.push(node.getText(sf));
      }
      if (/^(?:React\.)?use(?:Layout)?Effect$/.test(callee) && requestPattern.test(node.getText(sf))) {
        requestEffects.push(node.getText(sf));
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return { requests, requestEffects, imports };
}
const rows = files.map(file => {
  const relative = path.relative(baseline, file).replaceAll('\\', '/');
  const before = fs.readFileSync(file, 'utf8');
  const after = fs.readFileSync(path.join(root, relative), 'utf8');
  const pre = inspect(relative, before), post = inspect(relative, after);
  return {
    file: relative, changed: before !== after, beforeSha256: hash(before), afterSha256: hash(after),
    inspectedRuntime: Boolean(pre),
    beforeRequests: pre?.requests ?? [], afterRequests: post?.requests ?? [],
    requestCallsEqual: JSON.stringify(pre?.requests) === JSON.stringify(post?.requests),
    requestEffectsEqual: JSON.stringify(pre?.requestEffects) === JSON.stringify(post?.requestEffects),
    addedImports: post?.imports.filter(value => !pre.imports.includes(value)) ?? [],
  };
});
const report = {
  status: rows.every(row => row.requestCallsEqual && row.requestEffectsEqual) ? 'passed' : 'review-required',
  method: 'Compare direct HTTP call expressions and HTTP-bearing effect expressions in captured B1d pre-edit sources against current sources; enumerate added import declarations for manual review.',
  boundary: 'Direct API/fetch scan complements the full-client mock/value-import census. It does not prove arbitrary wrapper calls or unexecuted branches harmless. CSS and test files are hashed but not interpreted as runtime request sources.',
  files: rows.length, runtimeFiles: rows.filter(row => row.inspectedRuntime).length,
  addedDirectRequests: rows.reduce((n, row) => n + row.afterRequests.filter(call => !row.beforeRequests.includes(call)).length, 0),
  changedRequestEffects: rows.filter(row => !row.requestEffectsEqual).length,
  rows,
};
fs.writeFileSync(path.join(__dirname, 'changed-request-check.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, files: report.files, runtimeFiles: report.runtimeFiles, addedDirectRequests: report.addedDirectRequests, changedRequestEffects: report.changedRequestEffects, addedImports: rows.filter(row => row.addedImports.length).map(({ file, addedImports }) => ({ file, addedImports })) }, null, 2));
if (report.status !== 'passed') process.exitCode = 1;
