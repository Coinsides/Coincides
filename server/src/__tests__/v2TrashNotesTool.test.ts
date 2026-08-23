import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';
import { closeDb, initDb } from '../db/init.js';
import { AppError } from '../middleware/errorHandler.js';
import { restoreNoteAsUser, trashNoteAsUser } from '../services/notes.js';
import { revertTrashNotesReceipt } from '../services/toolFaceReceiptRevert.js';
import {
  readToolFaceReceipt,
  writeToolFaceReceipt,
  type ToolFaceReceiptResource,
  type ToolFaceReceiptTier,
} from '../services/toolFaceReceipts.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '66666666-6666-4666-8666-666666666666';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const NOTE_A = '33333333-3333-4333-8333-333333333333';
const NOTE_B = '44444444-4444-4444-8444-444444444444';

async function withReceiptDb(run: (db: Database.Database) => void | Promise<void>): Promise<void> {
  const tempRoot = mkdtempSync(join(tmpdir(), 'coincides-trash-notes-tool-'));
  try {
    const db = await initDb(join(tempRoot, 'test.db'));
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(USER_ID, 'trash-revert@example.com', 'Trash Revert User', '2026-08-23 08:00:00');
    db.prepare("INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, 'hash', ?, ?)")
      .run(OTHER_USER_ID, 'other-trash-revert@example.com', 'Other User', '2026-08-23 08:00:00');
    db.prepare('INSERT INTO courses (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(COURSE_ID, USER_ID, 'Trash Revert Course', '2026-08-23 08:00:00', '2026-08-23 08:00:00');
    const insertNote = db.prepare(`
      INSERT INTO notes (
        id, user_id, course_id, title, description, status, source_kind,
        page_format, metadata, operation_batch_id, created_at, updated_at,
        trashed_at, note_class
      ) VALUES (?, ?, ?, ?, NULL, 'trashed', 'manual', 'flow', '{}', NULL, ?, ?, ?, 'user')
    `);
    for (const [id, title] of [[NOTE_A, 'Trash A'], [NOTE_B, 'Trash B']] as const) {
      insertNote.run(
        id,
        USER_ID,
        COURSE_ID,
        title,
        '2026-08-23 08:00:00',
        '2026-08-23 08:01:00',
        '2026-08-23 08:01:00',
      );
    }
    await run(db);
  } finally {
    closeDb();
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function writeReceipt(input: {
  tool?: string;
  tier?: ToolFaceReceiptTier;
  resources: ToolFaceReceiptResource[];
}) {
  return writeToolFaceReceipt({
    userId: USER_ID,
    callId: `call-${Math.random()}`,
    tool: input.tool ?? 'trash_notes',
    tier: input.tier ?? 'immediate',
    harness: 'trash-notes-test',
    inputDigest: 'sha256:trash-notes-test',
    humanEntry: {
      route: 'DELETE /api/notes/:id',
      client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleTrashNote',
    },
    resources: input.resources,
    intendedInput: { note_ids: [NOTE_A, NOTE_B] },
  });
}

function noteStatus(db: Database.Database, noteId: string): string | null {
  return (db.prepare('SELECT status FROM notes WHERE id = ?').get(noteId) as {
    status: string;
  } | undefined)?.status ?? null;
}

function assertAppError(
  run: () => unknown,
  statusCode: number,
  message: string,
): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.message, message);
    return true;
  });
}

test('K-b5 trash_notes binding delegates each lifecycle decision to trashNoteAsUser', () => {
  const bindingSource = readFileSync(
    resolve(REPO_ROOT, 'server/src/mcp/bindings.ts'),
    'utf8',
  ).replace(/\r\n?/g, '\n');
  assert.match(bindingSource, /const listNotesBinding[\s\S]*?listNotes\(\{/,
    'positive control must see the existing canonical list_notes binding');

  const binding = bindingSource.match(/const trashNotesBinding[\s\S]*?\n\};/)?.[0];
  assert.ok(binding, 'trash_notes binding initializer must exist');
  assert.match(bindingSource, /import\s+\{[^}]*\btrashNoteAsUser\b[^}]*\}\s+from\s+'\.\.\/services\/notes\.js';/);
  assert.match(binding, /note_ids\.map\(/);
  assert.match(binding, /trashNoteAsUser\(\{\s*userId:\s*context\.userId,\s*noteId/);
  assert.doesNotMatch(binding, /\btrashNote\s*\(/);
  assert.doesNotMatch(binding, /UPDATE\s+notes/i);
  assert.doesNotMatch(binding, /\.prepare\s*\(/);
});

test('K-b5 lifecycle orchestration keeps ownership and projection error catches narrow', () => {
  const serviceSource = readFileSync(
    resolve(REPO_ROOT, 'server/src/services/notes.ts'),
    'utf8',
  ).replace(/\r\n?/g, '\n');

  assert.match(
    serviceSource,
    /error instanceof AppError\s*&&\s*error\.statusCode === 404\s*&&\s*error\.message === 'Note not found'/,
  );
  assert.match(serviceSource, /error instanceof AppError\) \|\| error\.statusCode !== 409/);
  assert.match(serviceSource, /source_projection_read_only/);
  assert.ok(
    (serviceSource.match(/throw error;/g) ?? []).length >= 2,
    'unexpected ownership and guard errors must be rethrown instead of becoming business outcomes',
  );
});

test('K-b7 complete reverts every causally trashed note and ignores non-causal resources', async () => {
  await withReceiptDb((db) => {
    const receipt = writeReceipt({
      resources: [
        { kind: 'note', id: NOTE_A, outcome: 'trashed' },
        { kind: 'note', id: NOTE_B, outcome: 'trashed' },
        { kind: 'note', id: '99999999-9999-4999-8999-999999999999', outcome: 'missing' },
        { kind: 'note', id: NOTE_A, outcome: 'skipped', reason: 'already_trashed' },
      ],
    });

    const reverted = revertTrashNotesReceipt({ userId: USER_ID, receiptId: receipt.id });

    assert.equal(noteStatus(db, NOTE_A), 'active');
    assert.equal(noteStatus(db, NOTE_B), 'active');
    assert.equal(reverted.status, 'reverted');
    assert.equal(reverted.metadata.revert_outcome, 'complete');
    assert.deepEqual(reverted.metadata.revert_details, {
      restored: [NOTE_A, NOTE_B],
      failed: [],
    });
  });
});

test('K-b7 hard-deleted receipt resource produces a partial revert', async () => {
  await withReceiptDb((db) => {
    const receipt = writeReceipt({
      resources: [
        { kind: 'note', id: NOTE_A, outcome: 'trashed' },
        { kind: 'note', id: NOTE_B, outcome: 'trashed' },
      ],
    });
    assert.equal(db.prepare('DELETE FROM notes WHERE id = ?').run(NOTE_B).changes, 1);

    const reverted = revertTrashNotesReceipt({ userId: USER_ID, receiptId: receipt.id });

    assert.equal(noteStatus(db, NOTE_A), 'active');
    assert.equal(noteStatus(db, NOTE_B), null);
    assert.equal(reverted.metadata.revert_outcome, 'partial');
    assert.deepEqual(reverted.metadata.revert_details, {
      restored: [NOTE_A],
      failed: [NOTE_B],
    });
  });
});

test('K-b7 an already active note is a successful causal revert, not a failure', async () => {
  await withReceiptDb((db) => {
    const receipt = writeReceipt({
      resources: [
        { kind: 'note', id: NOTE_A, outcome: 'trashed' },
        { kind: 'note', id: NOTE_B, outcome: 'trashed' },
      ],
    });
    assert.deepEqual(
      restoreNoteAsUser({ userId: USER_ID, noteId: NOTE_B }),
      { outcome: 'restored' },
      'positive control must model a human restore before receipt revert',
    );

    const reverted = revertTrashNotesReceipt({ userId: USER_ID, receiptId: receipt.id });

    assert.equal(noteStatus(db, NOTE_A), 'active');
    assert.equal(noteStatus(db, NOTE_B), 'active');
    assert.equal(reverted.metadata.revert_outcome, 'complete');
    assert.deepEqual(reverted.metadata.revert_details, {
      restored: [NOTE_A, NOTE_B],
      failed: [],
    });
  });
});

test('K-b7 rejects foreign, non-applied, and wrong-tool receipts before note side effects', async () => {
  await withReceiptDb((db) => {
    const foreignReceipt = writeReceipt({
      resources: [{ kind: 'note', id: NOTE_A, outcome: 'trashed' }],
    });
    assertAppError(
      () => revertTrashNotesReceipt({ userId: OTHER_USER_ID, receiptId: foreignReceipt.id }),
      403,
      'Tool face receipt is not owned by user',
    );
    assert.equal(readToolFaceReceipt(foreignReceipt.id).status, 'applied');
    assert.equal(noteStatus(db, NOTE_A), 'trashed');

    const proposedReceipt = writeReceipt({
      tier: 'propose',
      resources: [{ kind: 'note', id: NOTE_A, outcome: 'pending' }],
    });
    assertAppError(
      () => revertTrashNotesReceipt({ userId: USER_ID, receiptId: proposedReceipt.id }),
      409,
      'Only an applied trash_notes receipt can be reverted',
    );
    assert.equal(readToolFaceReceipt(proposedReceipt.id).status, 'proposed');
    assert.equal(noteStatus(db, NOTE_A), 'trashed');

    const wrongToolReceipt = writeReceipt({
      tool: 'list_notes',
      resources: [{ kind: 'note', id: NOTE_A, outcome: 'trashed' }],
    });
    assertAppError(
      () => revertTrashNotesReceipt({ userId: USER_ID, receiptId: wrongToolReceipt.id }),
      409,
      'Tool face receipt is not for trash_notes',
    );
    assert.equal(readToolFaceReceipt(wrongToolReceipt.id).status, 'applied');
    assert.equal(noteStatus(db, NOTE_A), 'trashed');
  });
});

test('K-b7 an already reverted receipt is rejected before a newly trashed note is touched', async () => {
  await withReceiptDb((db) => {
    const receipt = writeReceipt({
      resources: [{ kind: 'note', id: NOTE_A, outcome: 'trashed' }],
    });
    const first = revertTrashNotesReceipt({ userId: USER_ID, receiptId: receipt.id });
    assert.equal(first.status, 'reverted');
    assert.deepEqual(
      trashNoteAsUser({ userId: USER_ID, noteId: NOTE_A }),
      { outcome: 'trashed' },
      'positive control must create a new lifecycle effect after the first revert',
    );

    assertAppError(
      () => revertTrashNotesReceipt({ userId: USER_ID, receiptId: receipt.id }),
      409,
      'Only an applied trash_notes receipt can be reverted',
    );
    assert.equal(noteStatus(db, NOTE_A), 'trashed');
    assert.equal(readToolFaceReceipt(receipt.id).status, 'reverted');
  });
});

function runParity(manifest?: unknown) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath
    ? process.execPath
    : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmExecPath
    ? [npmExecPath, 'run', 'check:tool-face-parity']
    : ['run', 'check:tool-face-parity'];
  const tempRoot = manifest === undefined
    ? null
    : mkdtempSync(join(tmpdir(), 'coincides-trash-notes-parity-'));
  try {
    let manifestPath: string | undefined;
    if (tempRoot) {
      manifestPath = join(tempRoot, 'tool-face-manifest.json');
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    }
    return spawnSync(command, args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      shell: !npmExecPath && process.platform === 'win32',
      env: {
        ...process.env,
        ...(manifestPath && {
          NODE_ENV: 'test',
          TOOL_FACE_PARITY_TEST_MANIFEST_PATH: manifestPath,
        }),
      },
      timeout: 60_000,
      windowsHide: true,
    });
  } finally {
    if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  }
}

function parityReceipt(result: ReturnType<typeof spawnSync>): string {
  return [
    `exit=${String(result.status)}`,
    result.stdout,
    result.stderr,
    result.error?.stack,
  ].filter(Boolean).join('\n');
}

test('K-b8 production parity is green before and after the wrong human symbol is red', () => {
  const manifest = JSON.parse(readFileSync(
    resolve(REPO_ROOT, 'docs/generated/tool-face-manifest.json'),
    'utf8',
  )) as Array<Record<string, any>>;
  const trashEntry = manifest.find((entry) => entry.name === 'trash_notes');
  assert.ok(trashEntry, 'positive control must see trash_notes in the generated manifest');
  const wrongCallSite = manifest.map((entry) => entry.name === 'trash_notes'
    ? {
        ...entry,
        human_entry: {
          ...entry.human_entry,
          client_call_site: 'client/src/pages/Courses/CourseDetail.tsx#handleRestoreNote',
        },
    }
    : entry);

  const greenBefore = runParity();
  assert.equal(greenBefore.error, undefined, parityReceipt(greenBefore));
  assert.equal(greenBefore.status, 0, parityReceipt(greenBefore));
  assert.match(String(greenBefore.stdout), /\[PASS\] tool-face necessary-condition gate:/);

  const red = runParity(wrongCallSite);
  assert.equal(red.error, undefined, parityReceipt(red));
  assert.equal(red.status, 1, parityReceipt(red));
  assert.match(
    `${red.stdout}\n${red.stderr}`,
    /does not construct DELETE \/api\/notes\/:id/,
  );

  const greenAfter = runParity();
  assert.equal(greenAfter.error, undefined, parityReceipt(greenAfter));
  assert.equal(greenAfter.status, 0, parityReceipt(greenAfter));
  assert.match(String(greenAfter.stdout), /\[PASS\] tool-face necessary-condition gate:/);
});
