import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { v4 as uuidv4 } from 'uuid';
import { closeDb, initDb } from '../db/init.js';
import { intakeSourceTempFile } from '../services/sourceFileIntake.js';
import { materializeSourceNow, waitForScheduledSourceMaterializations } from '../services/sourceMaterialization.js';

interface ProjectedBlock {
  block_type: string;
  text: string;
  writing_role: string;
}

// Pins what md and txt projections do today, read back from the stored note.
async function project(filename: string, mimetype: string, body: string | Buffer): Promise<ProjectedBlock[]> {
  const root = mkdtempSync(join(tmpdir(), 'coincides-faithful-'));
  const sourceRootDir = join(root, 'sources');
  const canvasAssetRootDir = join(root, 'assets');
  mkdirSync(join(sourceRootDir, '.tmp'), { recursive: true });
  try {
    const db = await initDb(':memory:');
    const userId = uuidv4();
    const courseId = uuidv4();
    db.prepare("INSERT OR REPLACE INTO database_meta (key, value) VALUES ('coordinate_contract', 'v2')").run();
    db.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?,?,'synthetic','Synthetic')").run(userId, `${userId}@example.test`);
    db.prepare("INSERT INTO courses (id,user_id,name) VALUES (?,?,'Synthetic')").run(courseId, userId);
    const path = join(sourceRootDir, '.tmp', `${uuidv4()}.upload`);
    const bytes = Buffer.from(body);
    writeFileSync(path, bytes);
    const intake = await intakeSourceTempFile(db, userId, {
      course_id: courseId,
      origin_entry_kind: 'project_upload',
      file: { path, originalname: filename, mimetype, size: bytes.length },
    }, { rootDir: sourceRootDir });
    const published = await materializeSourceNow(db, userId, intake.source.id, { sourceRootDir, canvasAssetRootDir });
    assert.equal(published.status, 'materialized');
    const rows = db.prepare(`
      SELECT nb.block_type, nb.plain_text, nb.content_json
      FROM note_block_placements p
      JOIN note_blocks nb ON nb.id = p.block_id
      WHERE p.note_id = ?
      ORDER BY p.order_index ASC
    `).all(published.projection_note_id) as Array<{ block_type: string; plain_text: string; content_json: string }>;
    await waitForScheduledSourceMaterializations();
    closeDb();
    return rows.map((row) => ({
      block_type: row.block_type,
      text: row.plain_text,
      writing_role: JSON.parse(row.content_json).text_flow.units[0].writing_role,
    }));
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  }
}

const MARKDOWN = [
  '# 宏观经济学 Chapter 1',
  '',
  '第一段正文,含中文标点、English words 和数字 3.14。',
  '第一段的第二行。',
  '',
  '## 二级标题',
  '',
  '- 列表项一',
  '- 列表项二',
  '',
  '1. 有序一',
  '2. 有序二',
  '',
  '```',
  'code = 1',
  '```',
  '',
  '> 引用 quote',
  '',
  '###### 六级标题',
  '',
  '####### 七个井号不是标题',
].join('\n');

const nonWhitespace = (value: string) => value.replace(/\s+/g, '');

test('markdown: headings become heading blocks in order, and no body character is lost', async () => {
  const blocks = await project('notes.md', 'text/markdown', MARKDOWN);
  const headings = blocks.filter((block) => block.writing_role === 'heading');
  assert.deepEqual(headings.map((block) => block.text), ['宏观经济学 Chapter 1', '二级标题', '六级标题']);
  assert.ok(headings.every((block) => block.block_type === 'heading'));
  // The only characters a projection may drop are the heading markers.
  const expected = nonWhitespace(MARKDOWN.replace(/^#{1,6}\s+/gm, ''));
  assert.equal(nonWhitespace(blocks.map((block) => block.text).join('')), expected);
});

test('markdown today: a list stays one paragraph with its markers, in order, not one block per item', async () => {
  const blocks = await project('notes.md', 'text/markdown', MARKDOWN);
  const list = blocks.find((block) => block.text.includes('列表项一'))!;
  assert.equal(list.writing_role, 'paragraph');
  assert.equal(list.text.replace(/\r?\n/g, '\n'), '- 列表项一\n- 列表项二');
  const ordered = blocks.find((block) => block.text.includes('有序一'))!;
  assert.equal(ordered.text.replace(/\r?\n/g, '\n'), '1. 有序一\n2. 有序二');
  const order = ['宏观经济学', '第一段', '二级标题', '列表项一', '有序一', 'code = 1', '引用 quote', '六级标题', '七个井号']
    .map((needle) => blocks.findIndex((block) => block.text.includes(needle)));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.ok(!order.includes(-1));
});

test('txt: paragraphs split on blank lines, line breaks inside survive, Chinese is byte-exact', async () => {
  const text = '第一段第一行\n第一段第二行\n\n第二段:𠮷野家 emoji 😀 全角,标点。\n\n\n\n第三段 trailing';
  const blocks = await project('plain.txt', 'text/plain', text);
  assert.deepEqual(blocks.map((block) => block.text.replace(/\r?\n/g, '\n')), [
    '第一段第一行\n第一段第二行',
    '第二段:𠮷野家 emoji 😀 全角,标点。',
    '第三段 trailing',
  ]);
  assert.ok(blocks.every((block) => block.writing_role === 'paragraph'));
  assert.ok(!blocks.some((block) => block.text.includes('�')));
});

test('txt: Windows line endings lose no text', async () => {
  const blocks = await project('crlf.txt', 'text/plain', '第一段\r\n续行\r\n\r\n第二段');
  assert.equal(blocks.length, 2);
  assert.equal(nonWhitespace(blocks.map((block) => block.text).join('')), '第一段续行第二段');
});

test('a markdown heading in a .txt file stays literal text', async () => {
  const blocks = await project('literal.txt', 'text/plain', '# 不是标题\n\n正文');
  assert.equal(blocks[0].text, '# 不是标题');
  assert.equal(blocks[0].writing_role, 'paragraph');
});
