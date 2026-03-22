import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

import { execute, queryAll, queryOne, transaction } from '../db/pool.js';

// Inline types
interface TimeBlockRow {
  id: string; user_id: string; template_id: string | null; label: string;
  type: string; date: string; start_time: string; end_time: string;
  color: string | null; created_at: string; updated_at: string;
}

interface TemplateSetRow {
  id: string; user_id: string; name: string;
  created_at: string; updated_at: string;
}

interface TemplateItemRow {
  id: string; template_set_id: string; user_id: string;
  label: string; type: string; day_of_week: number;
  start_time: string; end_time: string; color: string | null;
  created_at: string; updated_at: string;
}

const router = Router();

// ── Helpers ──────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function toMinuteRanges(startTime: string, endTime: string): Array<{ start: number; end: number }> {
  const s = timeToMinutes(startTime);
  const e = timeToMinutes(endTime);
  if (e > s) return [{ start: s, end: e }];
  const ranges: Array<{ start: number; end: number }> = [];
  if (s < 1440) ranges.push({ start: s, end: 1440 });
  if (e > 0) ranges.push({ start: 0, end: e });
  return ranges;
}

export function detectOverlaps(blocks: Array<{ id: string; start_time: string; end_time: string }>): Array<[string, string]> {
  const expanded = blocks.map(b => ({
    id: b.id,
    ranges: toMinuteRanges(b.start_time, b.end_time),
  }));
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < expanded.length; i++) {
    for (let j = i + 1; j < expanded.length; j++) {
      const hasOverlap = expanded[i].ranges.some(ar =>
        expanded[j].ranges.some(br => ar.start < br.end && br.start < ar.end)
      );
      if (hasOverlap) overlaps.push([expanded[i].id, expanded[j].id]);
    }
  }
  return overlaps;
}

/**
 * Get time block instances for a specific date (v1.7.3 — date-based).
 */
export function getBlocksForDate(userId: string, date: string): TimeBlockRow[] {
  return await queryAll(`SELECT * FROM time_blocks WHERE user_id = $1 AND date = $2 ORDER BY start_time`, [userId, date]);
}

export function getAvailableStudyMinutes(userId: string, date: string): number {
  const blocks = getBlocksForDate(userId, date).filter(b => b.type === 'study');
  if (blocks.length === 0) return 0;

  const ranges = blocks
    .flatMap(b => toMinuteRanges(b.start_time, b.end_time))
    .sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const prev = merged[merged.length - 1];
    if (ranges[i].start <= prev.end) {
      prev.end = Math.max(prev.end, ranges[i].end);
    } else {
      merged.push(ranges[i]);
    }
  }

  return merged.reduce((sum, r) => sum + (r.end - r.start), 0);
}

// ══════════════════════════════════════════════════════════════
// INSTANCE ROUTES — /api/time-blocks
// ══════════════════════════════════════════════════════════════

// GET /api/time-blocks?from=YYYY-MM-DD&to=YYYY-MM-DD  (or ?date=YYYY-MM-DD)
router.get('/', async (req: AuthRequest, res: Response) => {
  const { date, from, to } = req.query;

  if (date) {
    const blocks = getBlocksForDate(req.userId!, date as string);
    const overlaps = detectOverlaps(blocks);
    res.json({ blocks, available_study_minutes: getAvailableStudyMinutes(req.userId!, date as string), overlaps });
    return;
  }

  if (from && to) {
    const blocks = await queryAll(`SELECT * FROM time_blocks WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time`, [req.userId!, from, to]);
    res.json(blocks);
    return;
  }

  // Fallback: all instances
  const blocks = await queryAll(`SELECT * FROM time_blocks WHERE user_id = $1 ORDER BY date, start_time`, [req.userId!]);
  res.json(blocks);
});

// GET /api/time-blocks/week/:date — instances for a full week (Calendar compatibility)
router.get('/week/:date', async (req: AuthRequest, res: Response) => {
  const startDate = new Date(req.params.date as string);
  const day = startDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startDate.setUTCDate(startDate.getUTCDate() + mondayOffset);

  const weekData: Record<string, { blocks: TimeBlockRow[]; available_study_minutes: number; overlaps: Array<[string, string]> }> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const blocks = getBlocksForDate(req.userId!, dateStr);
    weekData[dateStr] = {
      blocks,
      available_study_minutes: getAvailableStudyMinutes(req.userId!, dateStr),
      overlaps: detectOverlaps(blocks),
    };
  }

  res.json(weekData);
});

// POST /api/time-blocks — create instance(s) for specific date(s)
router.post('/', async (req: AuthRequest, res: Response) => {
  const { blocks } = req.body;
  const items: Array<{
    label: string; type?: string; date: string;
    start_time: string; end_time: string; color?: string; template_id?: string;
  }> = Array.isArray(blocks) ? blocks : [req.body];

  for (const item of items) {
    if (!item.label || !item.date || !item.start_time || !item.end_time) {
      throw new AppError(400, 'Each block requires label, date, start_time, end_time');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      throw new AppError(400, 'date must be YYYY-MM-DD format');
    }
    if (!/^\d{2}:\d{2}$/.test(item.start_time) || !/^\d{2}:\d{2}$/.test(item.end_time)) {
      throw new AppError(400, 'start_time and end_time must be HH:MM format');
    }
  }

  const now = new Date().toISOString();
  const created: any[] = [];

  await transaction(async (client) => {
    for (const item of items) {
      const id = uuidv4();
      await execute(`INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, req.userId!, item.template_id || null, item.label, item.type || 'custom',
        item.date, item.start_time, item.end_time, item.color || null, now, now]);
      created.push({
        id, user_id: req.userId!, template_id: item.template_id || null,
        label: item.label, type: item.type || 'custom', date: item.date,
        start_time: item.start_time, end_time: item.end_time,
        color: item.color || null, created_at: now, updated_at: now,
      });
    }
  });

  res.status(201).json(Array.isArray(blocks) ? created : created[0]);
});

// PUT /api/time-blocks/:id — update a single instance
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT * FROM time_blocks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) throw new AppError(404, 'Time block not found');

  const { label, type, start_time, end_time, color } = req.body;
  const fields: string[] = [];
  const values: unknown[] = [];

  if (label !== undefined) { fields.push('label = ?'); values.push(label); }
  if (type !== undefined) { fields.push('type = ?'); values.push(type); }
  if (start_time !== undefined) { fields.push('start_time = ?'); values.push(start_time); }
  if (end_time !== undefined) { fields.push('end_time = ?'); values.push(end_time); }
  if (color !== undefined) { fields.push('color = ?'); values.push(color); }

  if (fields.length === 0) throw new AppError(400, 'No fields to update');

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(req.params.id);

  await execute(`UPDATE time_blocks SET ${fields.join(', ')} WHERE id = $1`, [...values]);
  const updated = await queryOne(`SELECT * FROM time_blocks WHERE id = $1`, [req.params.id]);
  res.json(updated);
});

// DELETE /api/time-blocks/:id — delete a single instance
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id FROM time_blocks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) throw new AppError(404, 'Time block not found');

  await execute(`DELETE FROM time_blocks WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Time block deleted' });
});

// GET /api/time-blocks/:id/tasks — tasks under a specific time block instance
router.get('/:id/tasks', async (req: AuthRequest, res: Response) => {
  const block = await queryOne(`SELECT id FROM time_blocks WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!block) throw new AppError(404, 'Time block not found');

  const tasks = await queryAll(`SELECT * FROM tasks WHERE time_block_id = $1 AND user_id = $2 ORDER BY order_index, created_at`, [req.params.id, req.userId!]);

  for (const t of tasks as any[]) {
    if (t.checklist && typeof t.checklist === 'string') {
      try { t.checklist = JSON.parse(t.checklist); } catch { t.checklist = null; }
    }
  }

  res.json(tasks);
});

// ══════════════════════════════════════════════════════════════
// TEMPLATE ROUTES — /api/time-blocks/templates
// ══════════════════════════════════════════════════════════════

// GET /api/time-blocks/templates/sets — all template sets
router.get('/templates/sets', async (req: AuthRequest, res: Response) => {
  const sets = await queryAll(`SELECT * FROM time_block_template_sets WHERE user_id = $1 ORDER BY created_at`, [req.userId!]);
  res.json(sets);
});

// POST /api/time-blocks/templates/sets — create template set
router.post('/templates/sets', async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  if (!name) throw new AppError(400, 'name is required');

  const id = uuidv4();
  const now = new Date().toISOString();
  await execute(`INSERT INTO time_block_template_sets (id, user_id, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`, [id, req.userId!, name, now, now]);

  const created = await queryOne(`SELECT * FROM time_block_template_sets WHERE id = $1`, [id]);
  res.status(201).json(created);
});

// PUT /api/time-blocks/templates/sets/:id — rename template set
router.put('/templates/sets/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id FROM time_block_template_sets WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) throw new AppError(404, 'Template set not found');

  const { name } = req.body;
  if (!name) throw new AppError(400, 'name is required');

  const now = new Date().toISOString();
  await execute(`UPDATE time_block_template_sets SET name = $1, updated_at = $2 WHERE id = $3`, [name, now, req.params.id]);

  const updated = await queryOne(`SELECT * FROM time_block_template_sets WHERE id = $1`, [req.params.id]);
  res.json(updated);
});

// DELETE /api/time-blocks/templates/sets/:id — delete template set (CASCADE deletes items)
router.delete('/templates/sets/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT id FROM time_block_template_sets WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) throw new AppError(404, 'Template set not found');

  await execute(`DELETE FROM time_block_template_sets WHERE id = $1`, [req.params.id]);
  res.json({ message: 'Template set deleted' });
});

// GET /api/time-blocks/templates/sets/:setId/items — get template items
router.get('/templates/sets/:setId/items', async (req: AuthRequest, res: Response) => {
  const set = await queryOne(`SELECT id FROM time_block_template_sets WHERE id = $1 AND user_id = $2`, [req.params.setId, req.userId!]);
  if (!set) throw new AppError(404, 'Template set not found');

  const items = await queryAll(`SELECT * FROM time_block_templates WHERE template_set_id = $1 ORDER BY day_of_week, start_time`, [req.params.setId]);

  res.json(items);
});

// POST /api/time-blocks/templates/sets/:setId/items — save (replace all) template items
router.post('/templates/sets/:setId/items', async (req: AuthRequest, res: Response) => {
  const set = await queryOne(`SELECT id FROM time_block_template_sets WHERE id = $1 AND user_id = $2`, [req.params.setId, req.userId!]);
  if (!set) throw new AppError(404, 'Template set not found');

  const { items } = req.body;
  if (!Array.isArray(items)) throw new AppError(400, 'items must be an array');

  for (const item of items) {
    if (!item.label || item.day_of_week === undefined || !item.start_time || !item.end_time) {
      throw new AppError(400, 'Each item requires label, day_of_week, start_time, end_time');
    }
  }

  const now = new Date().toISOString();

  await transaction(async (client) => {
    // Clear existing items for this set
    await execute(`DELETE FROM time_block_templates WHERE template_set_id = $1`, [req.params.setId]);

    // Insert new items
    for (const item of items) {
      await execute(`INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [uuidv4(), req.params.setId, req.userId!, item.label, item.type || 'study',
        item.day_of_week, item.start_time, item.end_time, item.color || null, now, now);
    }
  });

  const saved = await queryAll(`SELECT * FROM time_block_templates WHERE template_set_id = $1 ORDER BY day_of_week, start_time`, [req.params.setId]);

  res.json(saved);
});

// POST /api/time-blocks/templates/sets/:setId/apply — instantiate template to date range
router.post('/templates/sets/:setId/apply', async (req: AuthRequest, res: Response) => {
  const set = await queryOne(`SELECT id FROM time_block_template_sets WHERE id = $1 AND user_id = $2`, [req.params.setId, req.userId!]);
  if (!set) throw new AppError(404, 'Template set not found');

  const { dates, overwrite } = req.body;
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new AppError(400, 'dates must be a non-empty array of YYYY-MM-DD strings');
  }

  const templates = await queryAll(`SELECT * FROM time_block_templates WHERE template_set_id = $1 ORDER BY day_of_week, start_time`, [req.params.setId]);

  const now = new Date().toISOString();
  let createdCount = 0;
  let skippedDates: string[] = [];

  await transaction(async (client) => {
    for (const date of dates as string[]) {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      const matchingTemplates = templates.filter(t => t.day_of_week === dayOfWeek);

      if (matchingTemplates.length === 0) continue; // No templates for this day of week

      // Check if date already has time blocks
      const existing = await queryOne(`SELECT id FROM time_blocks WHERE user_id = $1 AND date = $2 LIMIT 1`, [req.userId!, date]);

      if (existing && !overwrite) {
        skippedDates.push(date);
        continue;
      }

      if (existing && overwrite) {
        // Clear tasks' time_block_id references for blocks we're about to delete
        await execute(`UPDATE tasks SET time_block_id = NULL WHERE time_block_id IN (
            SELECT id FROM time_blocks WHERE user_id = $1 AND date = $2
          )`, [req.userId!, date]);
        // Delete existing blocks for this date
        await execute(`DELETE FROM time_blocks WHERE user_id = $1 AND date = $2`, [req.userId!, date]);
      }

      for (const tmpl of matchingTemplates) {
        await execute(`INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [uuidv4(), req.userId!, tmpl.id, tmpl.label, tmpl.type,
          date, tmpl.start_time, tmpl.end_time, tmpl.color, now, now
        );
        createdCount++;
      }
    }
  });

  res.json({
    message: `Applied template: ${createdCount} time blocks created`,
    created_count: createdCount,
    skipped_dates: skippedDates,
  });
});

export default router;
