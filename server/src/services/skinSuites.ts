import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { CreateSkinSuiteInput, SkinPresetId, SkinSuite, SkinSuiteDeleteResult, SkinTokens, UpdateSkinSuiteInput } from '../../../shared/types/skin.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseStoredSkin } from './skin.js';

interface SkinSuiteRow {
  id: string;
  user_id: string;
  name: string;
  tokens_json: string;
  components_json: string;
  material_preset: SkinPresetId | null;
  created_at: string;
}

function hydrate(row: SkinSuiteRow): SkinSuite {
  const { tokens_json, components_json, material_preset, ...identity } = row;
  return {
    ...identity, tokens: JSON.parse(tokens_json), components: JSON.parse(components_json),
    ...(material_preset == null ? {} : { materialPreset: material_preset }),
  };
}

export function getOwnedSkinSuite(db: Database.Database, userId: string, suiteId: string): SkinSuite {
  const row = db.prepare('SELECT * FROM skin_suites WHERE user_id = ? AND id = ?').get(userId, suiteId) as SkinSuiteRow | undefined;
  if (!row) throw new AppError(404, 'Skin suite not found', { code: 'SKIN_SUITE_NOT_FOUND' });
  return hydrate(row);
}

export function listSkinSuites(db: Database.Database, userId: string): SkinSuite[] {
  return (db.prepare('SELECT * FROM skin_suites WHERE user_id = ? ORDER BY created_at, id').all(userId) as SkinSuiteRow[]).map(hydrate);
}

export function createSkinSuite(db: Database.Database, userId: string, input: CreateSkinSuiteInput): SkinSuite {
  const id = uuidv4();
  db.prepare(`INSERT INTO skin_suites (id, user_id, name, tokens_json, components_json, material_preset, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, userId, input.name, JSON.stringify(input.tokens), JSON.stringify(input.components), input.materialPreset ?? null, new Date().toISOString());
  return getOwnedSkinSuite(db, userId, id);
}

export function updateSkinSuite(db: Database.Database, userId: string, suiteId: string, input: UpdateSkinSuiteInput): SkinSuite {
  return db.transaction(() => {
    const current = getOwnedSkinSuite(db, userId, suiteId);
    // All bound selections keep identity and local deviations; the next resolution follows this entire snapshot.
    db.prepare('UPDATE skin_suites SET name = ?, tokens_json = ?, components_json = ?, material_preset = ? WHERE id = ?')
      .run(input.name ?? current.name, JSON.stringify(input.tokens ?? current.tokens), JSON.stringify(input.components ?? current.components), input.materialPreset ?? current.materialPreset ?? null, current.id);
    return getOwnedSkinSuite(db, userId, current.id);
  }).immediate();
}

/** Closed inventory: inherited selections detach at their owner; notes include archived and trashed rows. */
const SKIN_MOUNTS = [
  { table: 'users', column: 'settings', nested: true, owner: 'id' },
  { table: 'courses', column: 'skin', nested: false, owner: 'user_id' },
  { table: 'notes', column: 'metadata', nested: true, owner: 'user_id' },
  { table: 'boards', column: 'skin', nested: false, owner: 'user_id' },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deleteSkinSuite(db: Database.Database, userId: string, suiteId: string): SkinSuiteDeleteResult {
  return db.transaction(() => {
    const suite = getOwnedSkinSuite(db, userId, suiteId);
    const reference = `suite:${suite.id}`;
    const palette = Object.fromEntries((db.prepare('SELECT id, value FROM palette_colors WHERE user_id = ?')
      .all(userId) as Array<{ id: string; value: string }>).map(({ id, value }) => [id, value]));
    const colorLookup = db.prepare('SELECT value FROM palette_colors WHERE user_id = ? AND id = ?');
    for (const mount of SKIN_MOUNTS) {
      // Identifiers are from this closed inventory. The UUID identifies all persisted bindings, without lifecycle filters.
      const candidates = db.prepare(`SELECT id, ${mount.owner} AS owner, ${mount.column} AS json FROM ${mount.table} WHERE instr(${mount.column}, ?) > 0`)
        .all(reference) as Array<{ id: string; owner: string; json: string }>;
      const update = db.prepare(`UPDATE ${mount.table} SET ${mount.column} = ? WHERE id = ?`);
      for (const row of candidates) {
        const decoded: unknown = JSON.parse(row.json);
        if (!isRecord(decoded)) continue;
        const skin = parseStoredSkin(mount.nested ? decoded.skin : decoded);
        if (skin?.preset !== reference) continue;
        const tokens = { ...suite.tokens };
        for (const key of Object.keys(tokens) as Array<keyof SkinTokens>) {
          const stored = skin.overrides?.[key];
          const value = stored?.startsWith('palette:')
            ? row.owner === userId ? palette[stored.slice(8)]
              : (colorLookup.get(row.owner, stored.slice(8)) as { value: string } | undefined)?.value
            : stored;
          // A missing palette identity already displays the suite baseline; preserve that exact fallback too.
          if (value && /^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)) tokens[key] = value;
        }
        const detached = {
          preset: 'default', materialPreset: skin.materialPreset ?? suite.materialPreset ?? 'default',
          overrides: tokens, components: { ...suite.components, ...skin.components },
        };
        update.run(JSON.stringify(mount.nested ? { ...decoded, skin: detached } : detached), row.id);
      }
    }
    db.prepare('DELETE FROM skin_suites WHERE id = ?').run(suite.id);
    return {
      id: suite.id, tokens: suite.tokens, components: suite.components, palette,
      ...(suite.materialPreset === undefined ? {} : { materialPreset: suite.materialPreset }),
    };
  }).immediate();
}
