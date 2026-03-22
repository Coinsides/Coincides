import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createTagGroupSchema, updateTagGroupSchema } from '../validators/index.js';
import { ZodError } from 'zod';

import { execute, queryAll, queryOne } from '../db/pool.js';

const router = Router();

// GET /api/tag-groups?course_id=xxx
router.get('/', async (req: AuthRequest, res: Response) => {
  const courseId = req.query.course_id as string | undefined;

  if (!courseId) {
    throw new AppError(400, 'course_id query parameter is required');
  }

  const groups = await queryAll(`SELECT * FROM tag_groups WHERE course_id = $1 AND user_id = $2 ORDER BY order_index ASC, name ASC`, [courseId, req.userId!]);

  // Fetch tags for each group
  const result = groups.map((group) => ({
    ...group,
    tags: await queryAll(`SELECT id, name, color, tag_group_id FROM tags WHERE tag_group_id = $1 AND user_id = $2 ORDER BY name ASC`, [group.id, req.userId!]),
  }));

  res.json({ tag_groups: result });
});

// POST /api/tag-groups
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createTagGroupSchema.parse(req.body);
    // Verify course belongs to user
    const course = await queryOne(`SELECT id FROM courses WHERE id = $1 AND user_id = $2`, [data.course_id, req.userId!]);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    // Check uniqueness within course
    const existing = await queryOne(`SELECT id FROM tag_groups WHERE course_id = $1 AND name = $2`, [data.course_id, data.name]);
    if (existing) {
      throw new AppError(409, 'A tag group with this name already exists in this course');
    }

    // Get next order_index
    const maxOrder = await queryOne(`SELECT COALESCE(MAX(order_index), -1) as max_idx FROM tag_groups WHERE course_id = $1`, [data.course_id]);

    const id = uuidv4();
    const now = new Date().toISOString();

    await execute(`INSERT INTO tag_groups (id, course_id, user_id, name, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [id, data.course_id, req.userId!, data.name, (maxOrder?.max_idx ?? -1]) + 1, now);

    const created = await queryOne(`SELECT * FROM tag_groups WHERE id = $1`, [id]);
    res.status(201).json(created);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/tag-groups/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = updateTagGroupSchema.parse(req.body);
    const existing = await queryOne(`SELECT * FROM tag_groups WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
    if (!existing) {
      throw new AppError(404, 'Tag group not found');
    }

    // Check name uniqueness within course
    const duplicate = await queryOne(`SELECT id FROM tag_groups WHERE course_id = $1 AND name = $2 AND id != $3`, [existing.course_id, data.name, req.params.id]);
    if (duplicate) {
      throw new AppError(409, 'A tag group with this name already exists in this course');
    }

    await execute(`UPDATE tag_groups SET name = $1 WHERE id = $2`, [data.name, req.params.id]);

    const updated = await queryOne(`SELECT * FROM tag_groups WHERE id = $1`, [req.params.id]);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/tag-groups/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne(`SELECT * FROM tag_groups WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId!]);
  if (!existing) {
    throw new AppError(404, 'Tag group not found');
  }

  // CASCADE handles tags and card_tags cleanup
  await execute(`DELETE FROM tag_groups WHERE id = $1`, [req.params.id]);

  res.json({ message: 'Tag group deleted' });
});

export default router;
