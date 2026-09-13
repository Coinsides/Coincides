import type Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

/** Factory names and exact hex strings are the V14 palette asset contract. */
export const FACTORY_PALETTE_COLORS = [
  ['暖调/杏黄', '#E8B04B'], ['暖调/赭石', '#B8703F'], ['暖调/绯红', '#C25B4E'],
  ['暖调/玫瑰', '#C97B8E'], ['暖调/暖棕', '#8A6248'], ['暖调/奶油', '#F2E3C6'],
  ['冷调/墨蓝', '#4A6FA5'], ['冷调/青碧', '#4E8D7C'], ['冷调/黛紫', '#6E5E8E'],
  ['冷调/湖蓝', '#5B9BB5'], ['冷调/松绿', '#4F7350'], ['冷调/靛蓝', '#3D5273'],
  ['中性/炭黑', '#2B2B2E'], ['中性/石墨', '#55565C'], ['中性/暖灰', '#8C8578'],
  ['中性/冷灰', '#7E8794'], ['中性/米白', '#EDE8DC'], ['中性/纸白', '#F7F4EC'],
  ['点缀/琥珀', '#E5A33C'], ['点缀/朱砂', '#D14B3A'], ['点缀/苔绿', '#7C9A4E'],
  ['点缀/天青', '#6BB3C9'], ['点缀/藕荷', '#B48EAD'], ['点缀/金驼', '#C9A15F'],
] as const;

export function seedFactoryPaletteColors(db: Database.Database, userId: string): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO palette_colors (id, user_id, name, value, sort, origin, created_at)
    VALUES (?, ?, ?, ?, ?, 'factory', ?)
  `);
  db.transaction(() => {
    const now = new Date().toISOString();
    FACTORY_PALETTE_COLORS.forEach(([name, value], sort) => {
      insert.run(uuidv4(), userId, name, value, (sort + 1) * 1000, now);
    });
  })();
}
