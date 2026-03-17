import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createTagGroupSchema, updateTagGroupSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

// GET /api/tag-groups?course_id=xxx
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const courseId = req.query.course_id as string | undefined;

  if (!courseId) {
    throw new AppError(400, 'course_id query parameter is required');
  }

  const groups = db.prepare(
    'SELECT * FROM tag_groups WHERE course_id = ? AND user_id = ? ORDER BY order_index ASC, name ASC'
  ).all(courseId, req.userId!) as any[];

  // Fetch tags for each group
  const tagStmt = db.prepare(
    'SELECT id, name, color, tag_group_id FROM tags WHERE tag_group_id = ? AND user_id = ? ORDER BY name ASC'
  );

  const result = groups.map((group) => ({
    ...group,
    tags: tagStmt.all(group.id, req.userId!),
  }));

  res.json({ tag_groups: result });
});

// POST /api/tag-groups
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createTagGroupSchema.parse(req.body);
    const db = getDb();

    // Verify course belongs to user
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(data.course_id, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    // Check uniqueness within course
    const existing = db.prepare('SELECT id FROM tag_groups WHERE course_id = ? AND name = ?').get(data.course_id, data.name);
    if (existing) {
      throw new AppError(409, 'A tag group with this name already exists in this course');
    }

    // Get next order_index
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(order_index), -1) as max_idx FROM tag_groups WHERE course_id = ?'
    ).get(data.course_id) as any;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      'INSERT INTO tag_groups (id, course_id, user_id, name, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, data.course_id, req.userId!, data.name, (maxOrder?.max_idx ?? -1) + 1, now);

    const created = db.prepare('SELECT * FROM tag_groups WHERE id = ?').get(id);
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
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateTagGroupSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM tag_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!existing) {
      throw new AppError(404, 'Tag group not found');
    }

    // Check name uniqueness within course
    const duplicate = db.prepare(
      'SELECT id FROM tag_groups WHERE course_id = ? AND name = ? AND id != ?'
    ).get(existing.course_id, data.name, req.params.id);
    if (duplicate) {
      throw new AppError(409, 'A tag group with this name already exists in this course');
    }

    db.prepare('UPDATE tag_groups SET name = ? WHERE id = ?').run(data.name, req.params.id);

    const updated = db.prepare('SELECT * FROM tag_groups WHERE id = ?').get(req.params.id);
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
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM tag_groups WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!existing) {
    throw new AppError(404, 'Tag group not found');
  }

  // CASCADE handles tags and card_tags cleanup
  db.prepare('DELETE FROM tag_groups WHERE id = ?').run(req.params.id);

  res.json({ message: 'Tag group deleted' });
});

export default router;
