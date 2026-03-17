import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/init.js';

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  switch (toolName) {
    case 'list_courses': {
      const courses = db.prepare('SELECT id, name, code, color, weight FROM courses WHERE user_id = ? ORDER BY name').all(userId);
      return JSON.stringify(courses);
    }

    case 'get_tasks': {
      const { date, from_date, to_date, course_id, status } = args as Record<string, string | undefined>;
      let query = 'SELECT t.id, t.title, t.date, t.priority, t.status, t.course_id, c.name as course_name FROM tasks t JOIN courses c ON t.course_id = c.id WHERE t.user_id = ?';
      const params: unknown[] = [userId];

      if (date) {
        query += ' AND t.date = ?';
        params.push(date);
      } else {
        if (from_date) { query += ' AND t.date >= ?'; params.push(from_date); }
        if (to_date) { query += ' AND t.date <= ?'; params.push(to_date); }
      }
      if (course_id) { query += ' AND t.course_id = ?'; params.push(course_id); }
      if (status) { query += ' AND t.status = ?'; params.push(status); }

      query += ' ORDER BY t.date, t.priority, t.order_index LIMIT 50';
      const tasks = db.prepare(query).all(...params);
      return JSON.stringify(tasks);
    }

    case 'create_task': {
      const { title, date, priority, course_id, goal_id } = args as Record<string, string>;
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, course_id, goal_id || null, title, date, priority || 'must', 'pending', 0, now, now);
      return JSON.stringify({ id, title, date, priority, message: 'Task created successfully' });
    }

    case 'complete_task': {
      const { task_id } = args as { task_id: string };
      const now = new Date().toISOString();
      const result = db.prepare(
        'UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      ).run('completed', now, now, task_id, userId);
      if (result.changes === 0) return JSON.stringify({ error: 'Task not found or not owned by user' });
      return JSON.stringify({ task_id, status: 'completed', message: 'Task marked as completed' });
    }

    case 'list_goals': {
      const { course_id } = args as { course_id?: string };
      let query = 'SELECT g.id, g.title, g.description, g.deadline, g.status, g.course_id, c.name as course_name FROM goals g JOIN courses c ON g.course_id = c.id WHERE g.user_id = ?';
      const params: unknown[] = [userId];
      if (course_id) { query += ' AND g.course_id = ?'; params.push(course_id); }
      query += ' ORDER BY g.created_at DESC';
      const goals = db.prepare(query).all(...params);
      return JSON.stringify(goals);
    }

    case 'create_goal': {
      const { title, course_id, deadline, description } = args as Record<string, string | undefined>;
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO goals (id, user_id, course_id, title, description, deadline, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, course_id, title, description || null, deadline || null, 'active', now, now);
      return JSON.stringify({ id, title, message: 'Goal created successfully' });
    }

    case 'list_decks': {
      const { course_id } = args as { course_id?: string };
      let query = 'SELECT d.id, d.name, d.description, d.card_count, d.course_id, c.name as course_name FROM card_decks d JOIN courses c ON d.course_id = c.id WHERE d.user_id = ?';
      const params: unknown[] = [userId];
      if (course_id) { query += ' AND d.course_id = ?'; params.push(course_id); }
      query += ' ORDER BY d.created_at DESC';
      const decks = db.prepare(query).all(...params);
      return JSON.stringify(decks);
    }

    case 'list_cards': {
      const { deck_id, template_type, search } = args as Record<string, string | undefined>;
      let query = 'SELECT id, title, template_type, importance, fsrs_next_review FROM cards WHERE deck_id = ? AND user_id = ?';
      const params: unknown[] = [deck_id, userId];
      if (template_type) { query += ' AND template_type = ?'; params.push(template_type); }
      if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }
      query += ' ORDER BY created_at DESC LIMIT 50';
      const cards = db.prepare(query).all(...params);
      return JSON.stringify(cards);
    }

    case 'create_card': {
      const { deck_id, template_type, title, content, importance, tag_ids } = args as {
        deck_id: string; template_type: string; title: string;
        content: Record<string, unknown>; importance?: number; tag_ids?: string[];
      };
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO cards (id, user_id, deck_id, template_type, title, content, importance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, deck_id, template_type || 'general', title, JSON.stringify(content), importance || 3, now, now);

      // Attach tags
      if (tag_ids && tag_ids.length > 0) {
        const insertTag = db.prepare('INSERT OR IGNORE INTO card_tags (card_id, tag_id) VALUES (?, ?)');
        for (const tagId of tag_ids) {
          insertTag.run(id, tagId);
        }
      }

      // Update deck card count
      db.prepare('UPDATE card_decks SET card_count = card_count + 1, updated_at = ? WHERE id = ?').run(now, deck_id);

      return JSON.stringify({ id, title, message: 'Card created successfully' });
    }

    case 'get_review_due': {
      const date = (args.date as string) || today;
      const dueCards = db.prepare(
        "SELECT c.id, c.title, c.deck_id, d.name as deck_name FROM cards c JOIN card_decks d ON c.deck_id = d.id WHERE c.user_id = ? AND (c.fsrs_next_review IS NULL OR c.fsrs_next_review <= ?) LIMIT 20",
      ).all(userId, date) as Array<Record<string, unknown>>;
      return JSON.stringify({ count: dueCards.length, cards: dueCards });
    }

    case 'get_daily_brief': {
      const date = (args.date as string) || today;
      const tasks = db.prepare(
        'SELECT t.id, t.title, t.priority, t.status, t.course_id, c.name as course_name FROM tasks t JOIN courses c ON t.course_id = c.id WHERE t.user_id = ? AND t.date = ? ORDER BY t.priority, t.order_index',
      ).all(userId, date) as Array<Record<string, unknown>>;

      const must = tasks.filter((t) => t.priority === 'must');
      const recommended = tasks.filter((t) => t.priority === 'recommended');
      const optional = tasks.filter((t) => t.priority === 'optional');

      const dueCount = db.prepare(
        "SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND (fsrs_next_review IS NULL OR fsrs_next_review <= ?)",
      ).get(userId, date) as { count: number };

      return JSON.stringify({
        date,
        tasks: { must, recommended, optional },
        cards_due: dueCount.count,
        total_tasks: tasks.length,
        completed_tasks: tasks.filter((t) => t.status === 'completed').length,
      });
    }

    case 'create_proposal': {
      const { type, data } = args as { type: string; data: Record<string, unknown> };
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO proposals (id, user_id, type, status, data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, userId, type, 'pending', JSON.stringify(data), now);
      return JSON.stringify({ id, type, message: `Proposal created. The student can review and apply it from the proposals panel.` });
    }

    case 'search_memories': {
      const { query, category } = args as { query: string; category?: string };
      let sql = 'SELECT id, category, content, created_at FROM agent_memories WHERE user_id = ? AND content LIKE ?';
      const params: unknown[] = [userId, `%${query}%`];
      if (category) { sql += ' AND category = ?'; params.push(category); }
      sql += ' ORDER BY relevance_score DESC, created_at DESC LIMIT 10';
      const memories = db.prepare(sql).all(...params);

      // Update last_accessed
      const now = new Date().toISOString();
      for (const m of memories as Array<{ id: string }>) {
        db.prepare('UPDATE agent_memories SET last_accessed = ? WHERE id = ?').run(now, m.id);
      }

      return JSON.stringify(memories);
    }

    case 'save_memory': {
      const { category, content } = args as { category: string; content: string };
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO agent_memories (id, user_id, category, content, relevance_score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, userId, category, content, 1.0, now);
      return JSON.stringify({ id, message: 'Memory saved successfully' });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
