import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import Database from 'better-sqlite3';
import ts from 'typescript';
import { AppError } from '../src/middleware/errorHandler.js';
import { collectOwnedContracts, inspectOwnedSource } from '../../scripts/check-owned-helper-contract.mjs';

const inventory = collectOwnedContracts();

test('every getOwned*/findOwned* definition follows the signature and whole-row contract', () => {
  assert.deepEqual(inventory.violations, []);
  assert.ok(inventory.definitions.some(({ family }) => family === 'get'));
  assert.ok(inventory.definitions.some(({ family }) => family === 'find'));
});

test('the ownership contract is connected to the runtime gate, including this functional suite', () => {
  const root = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const server = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(root.scripts['verify:v2-bn8-runtime'].includes('npm run check:owned-helper-contract'));
  assert.ok(root.scripts['verify:v2-bn8-runtime'].includes('npm run test:owned-helper-contract'));
  assert.ok(server.scripts['test:owned-helper-contract'].includes('scripts/v14OwnershipContract.test.ts'));
});

// Ordinary contract examples: incorrect parameter order, partial row, and
// missing-value policy. These are not authentication/adversarial scenarios.
const getExample = `function getOwnedExample(db: Database.Database, userId: string, exampleId: string) {
  const row = db.prepare('SELECT * FROM examples WHERE id = ? AND user_id = ?').get(exampleId, userId);
  if (!row) throw new AppError(404, 'Example not found');
  return row;
}`;
const findExample = `function findOwnedExample(db: Database.Database, userId: string, exampleId: string) {
  return db.prepare('SELECT * FROM examples WHERE id = ? AND user_id = ?').get(exampleId, userId);
}`;

test('discovery covers exported and unexported readers in both families', () => {
  for (const source of [getExample, `export ${getExample}`, findExample, `export ${findExample}`]) {
    const result = inspectOwnedSource(source);
    assert.equal(result.definitions.length, 1);
    assert.deepEqual(result.violations, []);
  }
});

test('the static gate rejects signature, projection, and missing-value drift', () => {
  for (const source of [
    getExample.replace('userId: string, exampleId: string', 'exampleId: string, userId: string'),
    getExample.replace('SELECT *', 'SELECT id'),
    getExample.replace("if (!row) throw new AppError(404, 'Example not found');", ''),
    getExample.replace('getOwnedExample', 'findOwnedExample'),
    getExample.replace('return row;', 'return { id: row.id };'),
    'const getOwnedExample = (db: Database.Database, userId: string, exampleId: string) => undefined;',
    'export { someReader as getOwnedExample };',
    `import { routeHelper } from '../routes/notes.js';\n${getExample}`,
  ]) assert.ok(inspectOwnedSource(source).violations.length > 0, source);
});

for (const definition of inventory.definitions) {
  test(`${definition.file}:${definition.line} ${definition.name}: complete row and normal absence`, () => {
    assert.ok(definition.table, 'whole-row query must identify its resource table');
    // Execute the exact discovered function body after TypeScript erasure. This
    // also covers private helpers without exporting them or importing unrelated
    // service initialization. Only the real AppError and in-memory db are used.
    const code = ts.transpileModule(`const contractReader = (${definition.source});`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
    }).outputText;
    const reader = runInNewContext(`${code}\ncontractReader;`, { AppError }, { timeout: 1000 }) as
      (db: Database.Database, userId: string, resourceId: string) => Record<string, unknown> | undefined;
    const db = new Database(':memory:');
    try {
      // The additional column detects row projection even when fields are added
      // later. No production schema or persistent database is created/changed.
      db.exec(`CREATE TABLE ${definition.table} (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, status TEXT,
        contract_extra TEXT, metadata TEXT, created_at TEXT
      )`);
      const expected = {
        id: 'resource-1', user_id: 'owner-1', status: 'active',
        contract_extra: 'whole-row', metadata: '{"kept":true}', created_at: '2030-01-02',
      };
      db.prepare(`INSERT INTO ${definition.table} VALUES (@id, @user_id, @status, @contract_extra, @metadata, @created_at)`).run(expected);
      assert.deepEqual(reader(db, 'owner-1', 'resource-1'), expected);
      if (definition.family === 'get') {
        assert.throws(() => reader(db, 'owner-1', 'missing'), (error: unknown) =>
          error instanceof AppError && error.statusCode === 404);
      } else {
        assert.equal(reader(db, 'owner-1', 'missing'), undefined);
      }
    } finally {
      db.close();
    }
  });
}
