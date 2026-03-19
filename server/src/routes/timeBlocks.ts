import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// Inline types (mirroring shared/types for server-side use)
interface TimeBlockRow {
  id: string; user_id: string; label: string; type: string;
  day_of_week: number; start_time: string; end_time: string;
  color: string | null; created_at: string; updated_at: string;
}

interface TimeBlockOverrideRow {
  id: string; user_id: string; time_block_id: string;
  override_date: string; start_time: string | null;
  end_time: string | null; created_at: string;
}

interface ResolvedTimeBlock {
  id: string; label: string; type: string; day_of_week: number;
  start_time: string; end_time: string; color: string | null;
  is_override: boolean; override_id?: string;
}

const router = Router();

// ── Helpers ──────────────────────────────────────────────────

/**
 * Convert "HH:MM" to total minutes from midnight.
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Detect overlapping time blocks. Returns pairs of overlapping IDs.
 * Does NOT prevent saving — visual-only concern (Design Constitution §2).
 */
export function detectOverlaps(blocks: Array<{ id: string; start_time: string; end_time: string }>): Array<[string, string]> {
  const overlaps: Array<[string, string]> = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time);
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);
      // Overlap = ranges intersect
      if (aStart < bEnd && bStart < aEnd) {
        overlaps.push([a.id, b.id]);
      }
    }
  }
  return overlaps;
}

/**
 * Get resolved time blocks for a specific date.
 * Merges weekly template with any single-day overrides.
 */
function getResolvedBlocksForDate(userId: string, date: string): ResolvedTimeBlock[] {
  const db = getDb();
  const d = new Date(date);
  const dayOfWeek = d.getUTCDay(); // 0=Sun

  // Get template blocks for this day of week
  const templates = db.prepare(
    'SELECT * FROM time_blocks WHERE user_id = ? AND day_of_week = ?'
  ).all(userId, dayOfWeek) as TimeBlockRow[];

  // Get overrides for this specific date
  const overrides = db.prepare(
    'SELECT * FROM time_block_overrides WHERE user_id = ? AND override_date = ?'
  ).all(userId, date) as TimeBlockOverrideRow[];

  const overrideMap = new Map<string, TimeBlockOverrideRow>();
  for (const o of overrides) {
    overrideMap.set(o.time_block_id, o);
  }

  const resolved: ResolvedTimeBlock[] = [];
  for (const tmpl of templates) {
    const override = overrideMap.get(tmpl.id);
    if (override) {
      // start_time is null → block deleted for this day
      if (override.start_time === null) continue;
      resolved.push({
        id: tmpl.id,
        label: tmpl.label,
        type: tmpl.type as any,
        day_of_week: dayOfWeek,
        start_time: override.start_time!,
        end_time: override.end_time!,
        color: tmpl.color,
        is_override: true,
        override_id: override.id,
      });
    } else {
      resolved.push({
        id: tmpl.id,
        label: tmpl.label,
        type: tmpl.type as any,
        day_of_week: dayOfWeek,
        start_time: tmpl.start_time,
        end_time: tmpl.end_time,
        color: tmpl.color,
        is_override: false,
      });
    }
  }

  return resolved;
}

/**
 * Get available study minutes for a specific date.
 * Only counts type='study' blocks; merges overlapping ranges (union).
 */
export function getAvailableStudyMinutes(userId: string, date: string): number {
  const blocks = getResolvedBlocksForDate(userId, date)
    .filter(b => b.type === 'study');

  if (blocks.length === 0) return 0;

  // Convert to minute ranges, merge overlapping, sum
  const ranges = blocks.map(b => ({
    start: timeToMinutes(b.start_time),
    end: timeToMinutes(b.end_time),
  })).sort((a, b) => a.start - b.start);

  // Merge overlapping ranges
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


// ── Routes ───────────────────────────────────────────────────

// GET /api/time-blocks — all template blocks for user
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const blocks = db.prepare(
    'SELECT * FROM time_blocks WHERE user_id = ? ORDER BY day_of_week, start_time'
  ).all(req.userId!);
  res.json(blocks);
});

// POST /api/time-blocks — create single or batch
router.post('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { blocks } = req.body;

  // Support both single block and batch
  const items: Array<{
    label: string; type?: string; day_of_week: number;
    start_time: string; end_time: string; color?: string;
  }> = Array.isArray(blocks) ? blocks : [req.body];

  // Validate
  for (const item of items) {
    if (!item.label || item.day_of_week === undefined || !item.start_time || !item.end_time) {
      throw new AppError(400, 'Each block requires label, day_of_week, start_time, end_time');
    }
    if (item.day_of_week < 0 || item.day_of_week > 6) {
      throw new AppError(400, 'day_of_week must be 0-6');
    }
    if (!/^\d{2}:\d{2}$/.test(item.start_time) || !/^\d{2}:\d{2}$/.test(item.end_time)) {
      throw new AppError(400, 'start_time and end_time must be HH:MM format');
    }
  }

  const stmt = db.prepare(
    `INSERT INTO time_blocks (id, user_id, label, type, day_of_week, start_time, end_time, color, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date().toISOString();
  const created: any[] = [];

  db.transaction(() => {
    for (const item of items) {
      const id = uuidv4();
      stmt.run(id, req.userId!, item.label, item.type || 'custom', item.day_of_week, item.start_time, item.end_time, item.color || null, now, now);
      created.push({
        id, user_id: req.userId!, label: item.label, type: item.type || 'custom',
        day_of_week: item.day_of_week, start_time: item.start_time, end_time: item.end_time,
        color: item.color || null, created_at: now, updated_at: now,
      });
    }
  })();

  res.status(201).json(Array.isArray(blocks) ? created : created[0]);
});

// PUT /api/time-blocks/:id — update a template block
router.put('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM time_blocks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!);
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

  db.prepare(`UPDATE time_blocks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM time_blocks WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/time-blocks/:id — delete template block (cascades overrides)
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM time_blocks WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!);
  if (!existing) throw new AppError(404, 'Time block not found');

  db.prepare('DELETE FROM time_blocks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Time block deleted' });
});

// GET /api/time-blocks/day/:date — resolved blocks for a single day
router.get('/day/:date', (req: AuthRequest, res: Response) => {
  const date = req.params.date as string;
  const blocks = getResolvedBlocksForDate(req.userId!, date);
  const studyMinutes = getAvailableStudyMinutes(req.userId!, date);
  const overlaps = detectOverlaps(blocks);
  res.json({ blocks, available_study_minutes: studyMinutes, overlaps });
});

// GET /api/time-blocks/week/:date — resolved blocks for a full week
router.get('/week/:date', (req: AuthRequest, res: Response) => {
  const startDate = new Date(req.params.date as string);
  // Snap to Monday (ISO week start)
  const day = startDate.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  startDate.setUTCDate(startDate.getUTCDate() + mondayOffset);

  const weekData: Record<string, { blocks: ResolvedTimeBlock[]; available_study_minutes: number; overlaps: Array<[string, string]> }> = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const blocks = getResolvedBlocksForDate(req.userId!, dateStr);
    weekData[dateStr] = {
      blocks,
      available_study_minutes: getAvailableStudyMinutes(req.userId!, dateStr),
      overlaps: detectOverlaps(blocks),
    };
  }

  res.json(weekData);
});

// POST /api/time-blocks/override — create a single-day override
router.post('/override', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { time_block_id, override_date, start_time, end_time } = req.body;

  if (!time_block_id || !override_date) {
    throw new AppError(400, 'time_block_id and override_date are required');
  }

  // Verify the time block belongs to user
  const block = db.prepare(
    'SELECT id FROM time_blocks WHERE id = ? AND user_id = ?'
  ).get(time_block_id, req.userId!);
  if (!block) throw new AppError(404, 'Time block not found');

  // Check if override already exists for this block + date
  const existing = db.prepare(
    'SELECT id FROM time_block_overrides WHERE time_block_id = ? AND override_date = ? AND user_id = ?'
  ).get(time_block_id, override_date, req.userId!) as any;

  if (existing) {
    // Update existing override
    db.prepare(
      'UPDATE time_block_overrides SET start_time = ?, end_time = ? WHERE id = ?'
    ).run(start_time ?? null, end_time ?? null, existing.id);

    const updated = db.prepare('SELECT * FROM time_block_overrides WHERE id = ?').get(existing.id);
    res.json(updated);
    return;
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO time_block_overrides (id, user_id, time_block_id, override_date, start_time, end_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId!, time_block_id, override_date, start_time ?? null, end_time ?? null, now);

  const created = db.prepare('SELECT * FROM time_block_overrides WHERE id = ?').get(id);
  res.status(201).json(created);
});

// DELETE /api/time-blocks/override/:id — remove an override (restore template)
router.delete('/override/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const existing = db.prepare(
    'SELECT id FROM time_block_overrides WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!);
  if (!existing) throw new AppError(404, 'Override not found');

  db.prepare('DELETE FROM time_block_overrides WHERE id = ?').run(req.params.id);
  res.json({ message: 'Override deleted' });
});

export default router;
