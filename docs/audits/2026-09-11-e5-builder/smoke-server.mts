// Run from server/: node --import tsx ../docs/audits/2026-09-11-e5-builder/smoke-server.mts
// Synthetic local-only data; this never selects the application's normal database.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const fixtureDir = resolve(repo, '.codex-tmp/e5-builder');
mkdirSync(fixtureDir, { recursive: true });
process.env.DB_PATH = resolve(fixtureDir, 'smoke.db');
process.env.PORT = '3105';
process.env.DOTENV_CONFIG_PATH = resolve(fixtureDir, 'no-env');
process.env.CANVAS_ASSET_DIR = resolve(fixtureDir, 'assets');
const { initDb, closeDb } = await import('../../../server/src/db/init.ts');
const { seedNoteMetadataFixture, seedNoteMetadataSourceNavigationFixture } = await import('../../../server/src/__tests__/helpers/v13NoteMetadataFixture.ts');
const { default: bcrypt } = await import('../../../server/node_modules/bcryptjs/index.js');
const db = await initDb();
const userId = 'e5-browser';
if (!db.prepare('SELECT id FROM users WHERE id=?').get(userId)) {
  db.prepare(`INSERT INTO users (id,email,password_hash,name,settings,onboarding_completed) VALUES (?,?,?,?,?,1)`)
    .run(userId, 'e5-browser@example.test', bcrypt.hashSync('E5-browser-fixture-only', 4), 'E5 synthetic browser', JSON.stringify({theme:'dark'}));
  const fixture = seedNoteMetadataFixture(db, userId);
  writeFileSync(resolve(fixtureDir, 'before-placements.json'), JSON.stringify(db.prepare('SELECT * FROM note_block_placements WHERE note_id=?').all(fixture.noteId), null, 2));
} else {
  seedNoteMetadataSourceNavigationFixture(db, userId);
}
closeDb();
await import('../../../server/src/index.ts');
