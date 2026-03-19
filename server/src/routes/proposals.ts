import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateProposalSchema } from '../validators/index.js';
import { normalizeCardContent } from '../agent/tools/normalizeContent.js';
import { ZodError } from 'zod';

const router = Router();

interface ProposalRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  type: string;
  status: string;
  data: string;
  created_at: string;
  resolved_at: string | null;
}

// GET /api/proposals — list pending proposals
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { status } = req.query;
  let query = 'SELECT * FROM proposals WHERE user_id = ?';
  const params: unknown[] = [req.userId!];
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  } else {
    query += " AND status = 'pending'";
  }
  query += ' ORDER BY created_at DESC';
  const proposals = db.prepare(query).all(...params) as ProposalRow[];
  const result = proposals.map((p) => ({ ...p, data: JSON.parse(p.data) }));
  res.json(result);
});

// GET /api/proposals/:id — get proposal details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const proposal = db.prepare(
    'SELECT * FROM proposals WHERE id = ? AND user_id = ?',
  ).get(req.params.id, req.userId!) as ProposalRow | undefined;

  if (!proposal) throw new AppError(404, 'Proposal not found');
  res.json({ ...proposal, data: JSON.parse(proposal.data) });
});

// POST /api/proposals/:id/apply — apply proposal
router.post('/:id/apply', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const proposal = db.prepare(
    "SELECT * FROM proposals WHERE id = ? AND user_id = ? AND status = 'pending'",
  ).get(req.params.id, req.userId!) as ProposalRow | undefined;

  if (!proposal) throw new AppError(404, 'Proposal not found or already resolved');

  const data = JSON.parse(proposal.data) as { items: Array<Record<string, unknown>> };
  const now = new Date().toISOString();

  const applyTransaction = db.transaction(() => {
    switch (proposal.type) {
      case 'batch_cards': {
        for (const item of data.items) {
          const cardId = uuidv4();
          const templateType = (item.template_type as string) || 'general';
          const rawContent = (item.content as Record<string, unknown>) || {};
          const normalizedContent = normalizeCardContent(templateType, rawContent);
          db.prepare(
            'INSERT INTO cards (id, user_id, deck_id, template_type, title, content, importance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ).run(
            cardId, req.userId!, item.deck_id, templateType,
            item.title, JSON.stringify(normalizedContent), item.importance || 3, now, now,
          );

          // Attach tags
          const tagIds = item.tag_ids as string[] | undefined;
          if (tagIds && tagIds.length > 0) {
            const insertTag = db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)');
            for (const tagId of tagIds) {
              insertTag.run(cardId, tagId);
            }
          }

          // Update deck card count
          db.prepare('UPDATE card_decks SET card_count = card_count + 1, updated_at = ? WHERE id = ?').run(now, item.deck_id);
        }
        break;
      }
      case 'study_plan': {
        for (const item of data.items) {
          const taskId = uuidv4();
          // v1.3: scheduled_date takes precedence over date for calendar placement
          const taskDate = (item.scheduled_date || item.date) as string;
          db.prepare(
            'INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, description, start_time, end_time, checklist, serves_must, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          ).run(
            taskId, req.userId!, item.course_id, item.goal_id || null,
            item.title, taskDate, item.priority || 'must', 'pending',
            item.description || null, item.start_time || null, item.end_time || null,
            item.checklist ? JSON.stringify(item.checklist) : null,
            item.serves_must || null, 0, now, now,
          );
        }
        break;
      }
      case 'goal_breakdown': {
        // Process items in order; goals first, then tasks that may reference them
        const idMap = new Map<string, string>(); // _temp_id -> real ID
        for (const item of data.items) {
          if (item.type === 'goal') {
            const goalId = uuidv4();
            const resolvedParentId = item.parent_id && idMap.has(item.parent_id as string)
              ? idMap.get(item.parent_id as string)
              : item.parent_id || null;
            db.prepare(
              'INSERT INTO goals (id, user_id, course_id, parent_id, title, description, deadline, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ).run(goalId, req.userId!, item.course_id, resolvedParentId, item.title, item.description || null, item.deadline || null, 'active', now, now);
            if (item._temp_id) idMap.set(item._temp_id as string, goalId);
          } else if (item.type === 'task') {
            const taskId = uuidv4();
            const resolvedGoalId = item.goal_id && idMap.has(item.goal_id as string)
              ? idMap.get(item.goal_id as string)
              : item.goal_id || null;
            // v1.3: scheduled_date takes precedence over date
            const taskDate = (item.scheduled_date || item.date) as string;
            db.prepare(
              'INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, description, start_time, end_time, checklist, serves_must, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ).run(
              taskId, req.userId!, item.course_id, resolvedGoalId,
              item.title, taskDate, item.priority || 'must', 'pending',
              item.description || null, item.start_time || null, item.end_time || null,
              item.checklist ? JSON.stringify(item.checklist) : null,
              item.serves_must || null, 0, now, now,
            );
          }
        }
        break;
      }
      case 'schedule_adjustment': {
        for (const item of data.items) {
          if (item.task_id) {
            const updates: string[] = [];
            const params: unknown[] = [];
            if (item.title !== undefined) { updates.push('title = ?'); params.push(item.title); }
            if (item.date !== undefined) { updates.push('date = ?'); params.push(item.date); }
            if (item.priority !== undefined) { updates.push('priority = ?'); params.push(item.priority); }
            if (item.status !== undefined) { updates.push('status = ?'); params.push(item.status); }
            if (updates.length > 0) {
              updates.push('updated_at = ?');
              params.push(now, item.task_id, req.userId!);
              db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
            }
          }
        }
        break;
      }
    }

    // Mark proposal as applied
    db.prepare(
      "UPDATE proposals SET status = 'applied', resolved_at = ? WHERE id = ?",
    ).run(now, proposal.id);
  });

  applyTransaction();
  res.json({ message: 'Proposal applied successfully', items_count: data.items.length });
});

// POST /api/proposals/:id/discard — discard proposal
router.post('/:id/discard', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db.prepare(
    "UPDATE proposals SET status = 'discarded', resolved_at = ? WHERE id = ? AND user_id = ? AND status = 'pending'",
  ).run(now, req.params.id, req.userId!);

  if (result.changes === 0) throw new AppError(404, 'Proposal not found or already resolved');
  res.json({ message: 'Proposal discarded' });
});

// PUT /api/proposals/:id — update proposal data
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const body = updateProposalSchema.parse(req.body);
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(
      "UPDATE proposals SET data = ?, resolved_at = NULL WHERE id = ? AND user_id = ? AND status = 'pending'",
    ).run(JSON.stringify(body.data), req.params.id, req.userId!);

    if (result.changes === 0) throw new AppError(404, 'Proposal not found or already resolved');
    res.json({ message: 'Proposal updated' });
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError(400, 'Validation error', err.errors);
    }
    throw err;
  }
});

export default router;
