import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { updateProposalSchema } from '../validators/index.js';
import { normalizeCardContent } from '../agent/tools/normalizeContent.js';
import { ZodError } from 'zod';

import { execute, queryAll, transaction } from '../db/pool.js';

const router = Router();

/**
 * Normalize checklist to [{text, done}] format.
 * Agent might send: string[], [{text}], [{text, done}], or other variants.
 */
function normalizeChecklist(raw: unknown): { text: string; done: boolean }[] | null {
  if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((item: unknown) => {
    if (typeof item === 'string') {
      return { text: item, done: false };
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      return {
        text: String(obj.text || obj.label || obj.content || obj.name || ''),
        done: Boolean(obj.done || obj.completed || false),
      };
    }
    return { text: String(item), done: false };
  }).filter((item) => item.text.length > 0);
}

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
router.get('/', async (req: AuthRequest, res: Response) => {
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
  const proposals = await queryAll(query, params);
  const result = proposals.map((p) => ({ ...p, data: JSON.parse(p.data) }));
  res.json(result);
});

// GET /api/proposals/:id — get proposal details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const proposal = await queryOne('SELECT * FROM proposals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId!]);

  if (!proposal) throw new AppError(404, 'Proposal not found');
  res.json({ ...proposal, data: JSON.parse(proposal.data) });
});

// POST /api/proposals/:id/apply — apply proposal
router.post('/:id/apply', async (req: AuthRequest, res: Response) => {
  const proposal = await queryOne(`SELECT * FROM proposals WHERE id = $1 AND user_id = $2 AND status = 'pending'`, [req.params.id, req.userId!]) as ProposalRow | undefined;

  if (!proposal) throw new AppError(404, 'Proposal not found or already resolved');

  const data = JSON.parse(proposal.data) as { items: Array<Record<string, unknown>>; deck_id?: string };
  const now = new Date().toISOString();

  const applyTransaction = await transaction(async (client) => {
    switch (proposal.type) {
      case 'batch_cards': {
        // Resolve deck_id: item-level > proposal-level top-level field
        const topLevelDeckId = data.deck_id as string | undefined;

        for (const item of data.items) {
          const deckId = (item.deck_id as string) || topLevelDeckId;
          if (!deckId) {
            throw new AppError(400, `Card "${item.title || 'Untitled'}" is missing deck_id. Please select a deck before applying.`);
          }

          // Verify deck exists and belongs to user
          const deck = await queryOne('SELECT id FROM card_decks WHERE id = $1 AND user_id = $2', [deckId, req.userId!]);
          if (!deck) {
            throw new AppError(400, `Deck not found (id: ${deckId.slice(0, 8)}...). The deck may have been deleted. Please create a new deck and try again.`);
          }

          const cardId = uuidv4();
          const templateType = (item.template_type as string) || 'general';
          const rawContent = (item.content as Record<string, unknown>) || {};
          const normalizedContent = normalizeCardContent(templateType, rawContent);
          const sectionId = (item.section_id as string) || null;
          await execute('INSERT INTO cards (id, user_id, deck_id, section_id, template_type, title, content, importance, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [cardId, req.userId!, deckId, sectionId, templateType,
            item.title || 'Untitled', JSON.stringify(normalizedContent), item.importance || 3, now, now
          ]);

          // Attach tags
          const tagIds = item.tag_ids as string[] | undefined;
          if (tagIds && tagIds.length > 0) {
            for (const tagId of tagIds) {
              await execute(`INSERT INTO card_tags (card_id, tag_id) VALUES ($1, $2)`, [cardId, tagId]);
            }
          }

          // Update deck card count
          await execute(`UPDATE card_decks SET card_count = card_count + 1, updated_at = $1 WHERE id = $2`, [now, deckId]);
        }
        break;
      }
      case 'study_plan': {
        for (const item of data.items) {
          const taskId = uuidv4();
          // v1.3: scheduled_date takes precedence over date for calendar placement
          const taskDate = (item.scheduled_date || item.date) as string;

          // v1.7.2: Defensive time_block_id fill — if Agent omitted it, look up by day_of_week.
          // Also validate any Agent-provided ID actually exists (FK safety).
          let timeBlockId: string | null = (item.time_block_id as string) || null;

          // If Agent provided an ID, verify it exists in DB
          if (timeBlockId) {
            const exists = await queryOne('SELECT id FROM time_blocks WHERE id = $1 AND user_id = $2', [timeBlockId, req.userId!]);
            if (!exists) {
              timeBlockId = null; // Invalid ID — clear it to avoid FK violation
            }
          }

          // v1.7.3: If still no time_block_id, try to find one by date
          if (!timeBlockId && taskDate) {
            const matchingBlock = await queryOne(`SELECT id FROM time_blocks WHERE user_id = $1 AND date = $2 AND type = 'study' ORDER BY start_time ASC LIMIT 1`, [req.userId!, taskDate]) as { id: string } | undefined;
            if (matchingBlock) {
              timeBlockId = matchingBlock.id;
            }
          }

          await execute('INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, description, start_time, end_time, checklist, serves_must, time_block_id, order_index, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)', [taskId, req.userId!, item.course_id, item.goal_id || null,
            item.title, taskDate, item.priority || 'must', 'pending',
            item.description || null, item.start_time || null, item.end_time || null,
            (() => { const cl = normalizeChecklist(item.checklist); return cl ? JSON.stringify(cl) : null; })(),
            item.serves_must || null, timeBlockId, 0, now, now
          ]);
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
            await execute('INSERT INTO goals (id, user_id, course_id, parent_id, title, description, deadline, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [goalId, req.userId!, item.course_id, resolvedParentId, item.title, item.description || null, item.deadline || null, 'active', now, now]);
            if (item._temp_id) idMap.set(item._temp_id as string, goalId);
          } else if (item.type === 'task') {
            const taskId = uuidv4();
            const resolvedGoalId = item.goal_id && idMap.has(item.goal_id as string)
              ? idMap.get(item.goal_id as string)
              : item.goal_id || null;
            // v1.3: scheduled_date takes precedence over date
            const taskDate = (item.scheduled_date || item.date) as string;
            await execute('INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, description, start_time, end_time, checklist, serves_must, order_index, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)', [taskId, req.userId!, item.course_id, resolvedGoalId,
              item.title, taskDate, item.priority || 'must', 'pending',
              item.description || null, item.start_time || null, item.end_time || null,
              (() => { const cl = normalizeChecklist(item.checklist); return cl ? JSON.stringify(cl) : null; })(),
              item.serves_must || null, 0, now, now
            ]);
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
              await execute(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $1 AND user_id = $2`, [...params]);
            }
          }
        }
        break;
      }
      case 'time_block_setup': {
        // v1.7.3: Create date-based Time Block instances from proposal items
        for (const item of data.items) {
          const blockId = uuidv4();
          await execute('INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)', [blockId, req.userId!,
            null,
            item.label || `Study Block`,
            item.type || 'study',
            item.date,
            item.start_time,
            item.end_time,
            item.color || null,
            now, now,]);
        }
        break;
      }
    }

    // Mark proposal as applied
    await execute(`UPDATE proposals SET status = 'applied', resolved_at = $1 WHERE id = $2`, [now, proposal.id]);
  });

  applyTransaction();
  res.json({ message: 'Proposal applied successfully', items_count: data.items.length });
});

// POST /api/proposals/:id/discard — discard proposal
router.post('/:id/discard', async (req: AuthRequest, res: Response) => {
  const now = new Date().toISOString();
  const result = await execute(`UPDATE proposals SET status = 'discarded', resolved_at = $1 WHERE id = $2 AND user_id = $3 AND status = 'pending'`, [now, req.params.id, req.userId!]);

  if (result.rowCount === 0) throw new AppError(404, 'Proposal not found or already resolved');
  res.json({ message: 'Proposal discarded' });
});

// PUT /api/proposals/:id — update proposal data
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = updateProposalSchema.parse(req.body);
    const now = new Date().toISOString();
    const result = await execute(`UPDATE proposals SET data = $1, resolved_at = NULL WHERE id = $2 AND user_id = $3 AND status = 'pending'`, [JSON.stringify(body.data), req.params.id, req.userId!]);

    if (result.rowCount === 0) throw new AppError(404, 'Proposal not found or already resolved');
    res.json({ message: 'Proposal updated' });
  } catch (err) {
    if (err instanceof ZodError) {
      throw new AppError(400, 'Validation error', err.errors);
    }
    throw err;
  }
});

export default router;
