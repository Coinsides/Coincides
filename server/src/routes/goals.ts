import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { createGoalSchema, updateGoalSchema, createTaskSchema } from '../validators/index.js';
import { ZodError } from 'zod';

const router = Router();

function parseTask(task: any): any {
  if (task && task.checklist && typeof task.checklist === 'string') {
    try { task.checklist = JSON.parse(task.checklist); } catch { task.checklist = null; }
  }
  return task;
}

// GET /api/goals
router.get('/', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { course_id, parent_id } = req.query;

  let query = 'SELECT * FROM goals WHERE user_id = ?';
  const params: unknown[] = [req.userId!];

  if (course_id) {
    query += ' AND course_id = ?';
    params.push(course_id);
  }

  if (parent_id === 'null') {
    query += ' AND parent_id IS NULL';
  } else if (parent_id) {
    query += ' AND parent_id = ?';
    params.push(parent_id);
  }

  query += ' ORDER BY sort_order ASC, created_at ASC';

  const goals = db.prepare(query).all(...params) as any[];

  // Enrich each goal with its dependency info
  const depsStmt = db.prepare(
    'SELECT depends_on_goal_id FROM goal_dependencies WHERE goal_id = ?'
  );
  for (const goal of goals) {
    const deps = depsStmt.all(goal.id) as Array<{ depends_on_goal_id: string }>;
    goal.dependencies = deps.map(d => d.depends_on_goal_id);
  }

  res.json(goals);
});

// GET /api/goals/:id/children
router.get('/:id/children', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  const children = db.prepare('SELECT * FROM goals WHERE parent_id = ? AND user_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.params.id, req.userId!);
  res.json(children);
});

// GET /api/goals/:id/progress — compute progress for a goal and its descendants
router.get('/:id/progress', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!goal) {
    throw new AppError(404, 'Goal not found');
  }

  // Get all tasks under this goal
  const directTasks = db.prepare(
    'SELECT id, status FROM tasks WHERE goal_id = ? AND user_id = ?'
  ).all(req.params.id, req.userId!) as any[];

  // Get all descendant goals recursively
  function getDescendantGoalIds(parentId: string): string[] {
    const children = db.prepare(
      'SELECT id FROM goals WHERE parent_id = ? AND user_id = ?'
    ).all(parentId, req.userId!) as any[];
    const ids: string[] = [];
    for (const child of children) {
      ids.push(child.id);
      ids.push(...getDescendantGoalIds(child.id));
    }
    return ids;
  }

  const goalId = req.params.id as string;
  const descendantIds = getDescendantGoalIds(goalId);

  // Get tasks from all descendant goals
  let descendantTasks: any[] = [];
  if (descendantIds.length > 0) {
    const placeholders = descendantIds.map(() => '?').join(',');
    descendantTasks = db.prepare(
      `SELECT id, status FROM tasks WHERE goal_id IN (${placeholders}) AND user_id = ?`
    ).all(...descendantIds, req.userId!) as any[];
  }

  const allTasks = [...directTasks, ...descendantTasks];
  const totalCount = allTasks.length;
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Get direct children count
  const childrenCount = db.prepare(
    'SELECT COUNT(*) as count FROM goals WHERE parent_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId!) as any;

  res.json({
    goal_id: req.params.id,
    direct_tasks: { total: directTasks.length, completed: directTasks.filter(t => t.status === 'completed').length },
    all_tasks: { total: totalCount, completed: completedCount },
    progress,
    children_count: childrenCount.count,
    descendant_goal_count: descendantIds.length,
  });
});

// PUT /api/goals/reorder — batch update sort_order and parent_id
router.put('/reorder', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { items } = req.body;

  if (!Array.isArray(items)) {
    throw new AppError(400, 'items must be an array');
  }

  // Validate all items
  for (const item of items) {
    if (!item.id || typeof item.sort_order !== 'number') {
      throw new AppError(400, 'Each item must have id and sort_order');
    }
  }

  const updateStmt = db.prepare(
    'UPDATE goals SET sort_order = ?, parent_id = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  );

  const now = new Date().toISOString();

  db.transaction(() => {
    for (const item of items) {
      updateStmt.run(
        item.sort_order,
        item.parent_id ?? null,
        now,
        item.id,
        req.userId!
      );
    }
  })();

  // Return updated goals
  const goals = db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY sort_order ASC, created_at ASC').all(req.userId!);
  res.json(goals);
});

// POST /api/goals
router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createGoalSchema.parse(req.body);
    const db = getDb();

    // If parent_id is provided, verify parent exists and belongs to user
    let courseId = data.course_id;
    if (data.parent_id) {
      const parent = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(data.parent_id, req.userId!) as any;
      if (!parent) {
        throw new AppError(404, 'Parent goal not found');
      }
      // Inherit course_id from parent if not explicitly provided differently
      if (!data.course_id || data.course_id === parent.course_id) {
        courseId = parent.course_id;
      }
    }

    // Verify course belongs to user
    const course = db.prepare('SELECT id FROM courses WHERE id = ? AND user_id = ?').get(courseId, req.userId!);
    if (!course) {
      throw new AppError(404, 'Course not found');
    }

    // Auto-assign sort_order: max + 1 among siblings
    const maxOrder = db.prepare(
      data.parent_id
        ? 'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM goals WHERE user_id = ? AND parent_id = ?'
        : 'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM goals WHERE user_id = ? AND parent_id IS NULL'
    ).get(...(data.parent_id ? [req.userId!, data.parent_id] : [req.userId!])) as any;

    const sortOrder = (maxOrder?.max_order ?? -1) + 1;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO goals (id, user_id, course_id, title, description, deadline, exam_mode, status, parent_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)`
    ).run(id, req.userId!, courseId, data.title, data.description || null, data.deadline || null, data.exam_mode ? 1 : 0, data.parent_id || null, sortOrder, now, now);

    const goal = db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
    res.status(201).json(goal);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/goals/:id
router.put('/:id', (req: AuthRequest, res: Response) => {
  try {
    const data = updateGoalSchema.parse(req.body);
    const db = getDb();

    const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
    if (!existing) {
      throw new AppError(404, 'Goal not found');
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.deadline !== undefined) { fields.push('deadline = ?'); values.push(data.deadline); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.exam_mode !== undefined) { fields.push('exam_mode = ?'); values.push(data.exam_mode ? 1 : 0); }
    if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }

    if (fields.length === 0) {
      throw new AppError(400, 'No fields to update');
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE goals SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// PUT /api/goals/:id/exam-mode
router.put('/:id/exam-mode', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!existing) {
    throw new AppError(404, 'Goal not found');
  }

  const newExamMode = existing.exam_mode ? 0 : 1;
  const now = new Date().toISOString();

  db.prepare('UPDATE goals SET exam_mode = ?, updated_at = ? WHERE id = ?').run(newExamMode, now, req.params.id);

  const updated = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/goals/:id/tasks — G-1 fix: add task to existing goal
router.post('/:id/tasks', (req: AuthRequest, res: Response) => {
  try {
    const db = getDb();
    const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
    if (!goal) throw new AppError(404, 'Goal not found');

    const data = createTaskSchema.parse(req.body);

    // Use the goal's course_id if not provided
    const courseId = data.course_id || goal.course_id;

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, order_index, start_time, end_time, description, checklist, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId!, courseId, goal.id, data.title, data.date, data.priority || 'must', data.order_index ?? 0, data.start_time || null, data.end_time || null, data.description || null, data.checklist ? JSON.stringify(data.checklist) : null, now, now);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.status(201).json(parseTask(task));
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    throw err;
  }
});

// DELETE /api/goals/:id
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!existing) {
    throw new AppError(404, 'Goal not found');
  }

  // v1.7.2: Cascade-delete all tasks under this goal and its sub-goals.
  // goals.parent_id has ON DELETE CASCADE, so sub-goals are auto-deleted by SQLite.
  // But tasks.goal_id has ON DELETE SET NULL (not CASCADE), so we must delete tasks
  // explicitly before deleting the goal. We also need to collect sub-goal IDs because
  // once the parent goal is deleted, sub-goals vanish and their task.goal_id becomes NULL.
  const collectGoalIds = (parentId: string): string[] => {
    const children = db.prepare('SELECT id FROM goals WHERE parent_id = ?').all(parentId) as { id: string }[];
    const ids = [parentId];
    for (const child of children) {
      ids.push(...collectGoalIds(child.id));
    }
    return ids;
  };

  const goalId = req.params.id as string;
  const allGoalIds = collectGoalIds(goalId);

  const deleteTransaction = db.transaction(() => {
    // Delete all tasks under these goals (task_cards cleaned via ON DELETE CASCADE on task_id)
    const placeholders = allGoalIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM tasks WHERE goal_id IN (${placeholders}) AND user_id = ?`).run(...allGoalIds, req.userId!);

    // Delete the goal (sub-goals + goal_dependencies auto-cascade)
    db.prepare('DELETE FROM goals WHERE id = ?').run(req.params.id);
  });

  deleteTransaction();

  res.json({ message: 'Goal and associated tasks deleted', tasks_deleted: true });
});

// ── Goal Dependencies (v1.3) ────────────────────────────────

/**
 * DFS cycle detection.
 * Before adding edge "goalId depends on newDepId", check if newDepId
 * can already reach goalId through existing edges → cycle.
 */
function detectCycle(db: any, userId: string, goalId: string, newDependsOnId: string): boolean {
  // If adding A depends on B, check: can we reach A from B through existing deps?
  // i.e., does B transitively depend on A already?
  const visited = new Set<string>();

  function dfs(current: string): boolean {
    if (current === goalId) return true; // cycle found
    if (visited.has(current)) return false;
    visited.add(current);

    const deps = db.prepare(
      `SELECT depends_on_goal_id FROM goal_dependencies
       WHERE goal_id = ? AND goal_id IN (SELECT id FROM goals WHERE user_id = ?)`
    ).all(current, userId) as Array<{ depends_on_goal_id: string }>;

    for (const dep of deps) {
      if (dfs(dep.depends_on_goal_id)) return true;
    }
    return false;
  }

  return dfs(newDependsOnId);
}

// GET /api/goals/:id/dependencies
router.get('/:id/dependencies', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!goal) throw new AppError(404, 'Goal not found');

  // Get direct dependencies (what this goal depends on)
  const dependsOn = db.prepare(
    `SELECT gd.*, g.title as depends_on_title, g.status as depends_on_status
     FROM goal_dependencies gd
     JOIN goals g ON g.id = gd.depends_on_goal_id
     WHERE gd.goal_id = ?`
  ).all(req.params.id);

  // Get dependents (what depends on this goal)
  const dependents = db.prepare(
    `SELECT gd.*, g.title as goal_title, g.status as goal_status
     FROM goal_dependencies gd
     JOIN goals g ON g.id = gd.goal_id
     WHERE gd.depends_on_goal_id = ?`
  ).all(req.params.id);

  res.json({ depends_on: dependsOn, dependents });
});

// POST /api/goals/:id/dependencies — add dependency (with cycle detection)
router.post('/:id/dependencies', (req: AuthRequest, res: Response) => {
  const db = getDb();
  const { depends_on_goal_id } = req.body;

  if (!depends_on_goal_id) {
    throw new AppError(400, 'depends_on_goal_id is required');
  }

  // Can't depend on self
  if (req.params.id === depends_on_goal_id) {
    throw new AppError(400, 'A goal cannot depend on itself');
  }

  // Verify both goals exist and belong to user
  const goal = db.prepare('SELECT id, course_id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!) as any;
  if (!goal) throw new AppError(404, 'Goal not found');

  const depGoal = db.prepare('SELECT id, course_id FROM goals WHERE id = ? AND user_id = ?').get(depends_on_goal_id, req.userId!) as any;
  if (!depGoal) throw new AppError(404, 'Dependency goal not found');

  // Check for existing dependency
  const existing = db.prepare(
    'SELECT id FROM goal_dependencies WHERE goal_id = ? AND depends_on_goal_id = ?'
  ).get(req.params.id, depends_on_goal_id);
  if (existing) {
    throw new AppError(409, 'Dependency already exists');
  }

  // DFS cycle detection
  if (detectCycle(db, req.userId!, req.params.id as string, depends_on_goal_id)) {
    throw new AppError(400, 'Adding this dependency would create a circular dependency');
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO goal_dependencies (id, goal_id, depends_on_goal_id, created_at) VALUES (?, ?, ?, ?)'
  ).run(id, req.params.id, depends_on_goal_id, now);

  const created = db.prepare(
    `SELECT gd.*, g.title as depends_on_title
     FROM goal_dependencies gd
     JOIN goals g ON g.id = gd.depends_on_goal_id
     WHERE gd.id = ?`
  ).get(id);

  res.status(201).json(created);
});

// DELETE /api/goals/:id/dependencies/:depId — remove dependency
router.delete('/:id/dependencies/:depId', (req: AuthRequest, res: Response) => {
  const db = getDb();

  // Verify the goal belongs to user
  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!goal) throw new AppError(404, 'Goal not found');

  const dep = db.prepare(
    'SELECT id FROM goal_dependencies WHERE id = ? AND goal_id = ?'
  ).get(req.params.depId, req.params.id);
  if (!dep) throw new AppError(404, 'Dependency not found');

  db.prepare('DELETE FROM goal_dependencies WHERE id = ?').run(req.params.depId);
  res.json({ message: 'Dependency removed' });
});

// GET /api/goals/:id/dependency-chain — full ordered chain (for scheduling)
router.get('/:id/dependency-chain', (req: AuthRequest, res: Response) => {
  const db = getDb();

  const goal = db.prepare('SELECT id FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId!);
  if (!goal) throw new AppError(404, 'Goal not found');

  // Walk backwards through dependencies: A depends on B depends on C → [C, B, A]
  const chain: string[] = [];
  const visited = new Set<string>();

  function walkBack(currentId: string): void {
    if (visited.has(currentId)) return;
    visited.add(currentId);

    const deps = db.prepare(
      'SELECT depends_on_goal_id FROM goal_dependencies WHERE goal_id = ?'
    ).all(currentId) as Array<{ depends_on_goal_id: string }>;

    for (const dep of deps) {
      walkBack(dep.depends_on_goal_id);
    }

    chain.push(currentId);
  }

  walkBack(req.params.id as string);

  // Enrich with goal data
  const goals = chain.map(id =>
    db.prepare('SELECT id, title, status, course_id, deadline FROM goals WHERE id = ?').get(id)
  ).filter(Boolean);

  res.json(goals);
});

export default router;
