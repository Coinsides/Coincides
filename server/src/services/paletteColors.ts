import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import type { CreatePaletteColorInput, PaletteColor, PaletteColorDeleteResult, UpdatePaletteColorInput } from '../../../shared/types/palette.js';
import { seedFactoryPaletteColors } from '../db/paletteSeed.js';
import { AppError } from '../middleware/errorHandler.js';

/** Ownership authority: connection, user scope, target; return the complete owned row. */
export function getOwnedPaletteColor(db: Database.Database, userId: string, colorId: string): PaletteColor {
  const row = db.prepare('SELECT * FROM palette_colors WHERE user_id = ? AND id = ?')
    .get(userId, colorId) as PaletteColor | undefined;
  if (!row) throw new AppError(404, 'Palette color not found', { code: 'PALETTE_COLOR_NOT_FOUND' });
  return row;
}

function requireUserColor(row: PaletteColor): void {
  if (row.origin === 'factory') {
    throw new AppError(409, 'Factory palette colors cannot be changed or deleted', { code: 'PALETTE_FACTORY_IMMUTABLE' });
  }
}

export function listPaletteColors(db: Database.Database, userId: string): PaletteColor[] {
  // Registration seeds immediately; this also supports users created by existing import/fixture paths.
  seedFactoryPaletteColors(db, userId);
  return db.prepare('SELECT * FROM palette_colors WHERE user_id = ? ORDER BY sort, created_at, id')
    .all(userId) as PaletteColor[];
}

export function createPaletteColor(db: Database.Database, userId: string, input: CreatePaletteColorInput): PaletteColor {
  return db.transaction(() => {
    seedFactoryPaletteColors(db, userId);
    const next = db.prepare('SELECT COALESCE(MAX(sort), 0) + 1000 AS sort FROM palette_colors WHERE user_id = ?')
      .get(userId) as { sort: number };
    const id = uuidv4();
    db.prepare(`INSERT INTO palette_colors (id, user_id, name, value, sort, origin, created_at)
      VALUES (?, ?, ?, ?, ?, 'user', ?)`).run(id, userId, input.name, input.value, input.sort ?? next.sort, new Date().toISOString());
    return getOwnedPaletteColor(db, userId, id);
  })();
}

export function updatePaletteColor(db: Database.Database, userId: string, colorId: string, input: UpdatePaletteColorInput): PaletteColor {
  return db.transaction(() => {
    const current = getOwnedPaletteColor(db, userId, colorId);
    requireUserColor(current);
    db.prepare('UPDATE palette_colors SET name = ?, value = ?, sort = ? WHERE id = ?')
      .run(input.name ?? current.name, input.value ?? current.value, input.sort ?? current.sort, current.id);
    return getOwnedPaletteColor(db, userId, colorId);
  })();
}

/** Closed inventory of persisted skin mounts, including inactive/trashed notes. */
const SKIN_MOUNTS = [
  { table: 'users', column: 'settings', nested: true },
  { table: 'courses', column: 'skin', nested: false },
  { table: 'notes', column: 'metadata', nested: true },
  { table: 'boards', column: 'skin', nested: false },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deletePaletteColor(db: Database.Database, userId: string, colorId: string): PaletteColorDeleteResult {
  // The lock covers reading the current color, rewriting every persistent consumer, and deleting it.
  return db.transaction(() => {
    const color = getOwnedPaletteColor(db, userId, colorId);
    requireUserColor(color);
    const reference = `palette:${color.id}`;
    for (const mount of SKIN_MOUNTS) {
      // SQL identifiers come only from the inventory above. A reference UUID is globally unique.
      const candidates = db.prepare(`SELECT id, ${mount.column} AS json FROM ${mount.table} WHERE instr(${mount.column}, ?) > 0`)
        .all(reference) as Array<{ id: string; json: string }>;
      const update = db.prepare(`UPDATE ${mount.table} SET ${mount.column} = ? WHERE id = ?`);
      for (const row of candidates) {
        const decoded: unknown = JSON.parse(row.json);
        if (!isRecord(decoded)) continue;
        const skin = mount.nested ? decoded.skin : decoded;
        if (!isRecord(skin) || !isRecord(skin.overrides)) continue;
        let changed = false;
        for (const token of Object.keys(skin.overrides)) {
          if (skin.overrides[token] !== reference) continue;
          skin.overrides[token] = color.value;
          changed = true;
        }
        if (changed) update.run(JSON.stringify(decoded), row.id);
      }
    }
    db.prepare('DELETE FROM palette_colors WHERE id = ?').run(color.id);
    return { id: color.id, value: color.value };
  }).immediate();
}
