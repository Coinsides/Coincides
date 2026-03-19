import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/init.js';
import { getEmbeddingProvider } from '../../embedding/index.js';
import { VectorStore } from '../../embedding/vectorStore.js';
import { normalizeCardContent } from './normalizeContent.js';

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
      const { title, date, priority, course_id, goal_id, description, start_time, end_time, checklist, serves_must } = args as Record<string, any>;
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO tasks (id, user_id, course_id, goal_id, title, date, priority, status, description, start_time, end_time, checklist, serves_must, order_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, course_id, goal_id || null, title, date, priority || 'must', 'pending', description || null, start_time || null, end_time || null, checklist ? JSON.stringify(checklist) : null, serves_must || null, 0, now, now);
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
      const { course_id, include_hierarchy } = args as { course_id?: string; include_hierarchy?: boolean };
      let query = 'SELECT g.id, g.title, g.description, g.deadline, g.status, g.course_id, g.parent_id, c.name as course_name FROM goals g JOIN courses c ON g.course_id = c.id WHERE g.user_id = ?';
      const params: unknown[] = [userId];
      if (course_id) { query += ' AND g.course_id = ?'; params.push(course_id); }
      query += ' ORDER BY g.created_at DESC';
      const goals = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

      if (include_hierarchy) {
        // Enrich each goal with children and tasks
        const goalMap = new Map<string, Record<string, unknown>>();
        for (const g of goals) {
          g.children = [];
          g.tasks = [];
          goalMap.set(g.id as string, g);
        }
        // Attach children
        for (const g of goals) {
          if (g.parent_id && goalMap.has(g.parent_id as string)) {
            (goalMap.get(g.parent_id as string)!.children as unknown[]).push(g);
          }
        }
        // Attach tasks to their goals
        const allTasks = db.prepare(
          'SELECT id, title, date, priority, status, goal_id, serves_must FROM tasks WHERE user_id = ? AND goal_id IS NOT NULL ORDER BY date'
        ).all(userId) as Array<Record<string, unknown>>;
        for (const t of allTasks) {
          if (t.goal_id && goalMap.has(t.goal_id as string)) {
            (goalMap.get(t.goal_id as string)!.tasks as unknown[]).push(t);
          }
        }
        // Return only top-level goals (parent_id is null)
        const topLevel = goals.filter(g => !g.parent_id);
        return JSON.stringify(topLevel);
      }

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

    case 'create_sub_goal': {
      const { title, parent_id, course_id, deadline, description } = args as Record<string, string | undefined>;
      // Look up parent to inherit course_id if not provided
      let resolvedCourseId = course_id;
      if (!resolvedCourseId && parent_id) {
        const parent = db.prepare('SELECT course_id FROM goals WHERE id = ? AND user_id = ?').get(parent_id, userId) as { course_id: string } | undefined;
        if (!parent) return JSON.stringify({ error: 'Parent goal not found' });
        resolvedCourseId = parent.course_id;
      }
      if (!resolvedCourseId) return JSON.stringify({ error: 'course_id required (could not inherit from parent)' });
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO goals (id, user_id, course_id, parent_id, title, description, deadline, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, resolvedCourseId, parent_id || null, title, description || null, deadline || null, 'active', now, now);
      return JSON.stringify({ id, title, parent_id, message: 'Sub-goal created successfully' });
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

    case 'create_deck': {
      const { course_id, name, description } = args as { course_id: string; name: string; description?: string };
      // Verify course exists and belongs to user
      const course = db.prepare('SELECT id, name FROM courses WHERE id = ? AND user_id = ?').get(course_id, userId) as { id: string; name: string } | undefined;
      if (!course) return JSON.stringify({ error: 'Course not found' });
      const deckId = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO card_decks (id, user_id, course_id, name, description, card_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      ).run(deckId, userId, course_id, name, description || null, now, now);
      return JSON.stringify({ id: deckId, name, course_id, course_name: course.name, message: 'Deck created successfully' });
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

      // Normalize content to match expected template structure
      const resolvedType = template_type || 'general';
      const normalizedContent = normalizeCardContent(resolvedType, content || {});

      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO cards (id, user_id, deck_id, template_type, title, content, importance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).run(id, userId, deck_id, resolvedType, title, JSON.stringify(normalizedContent), importance || 3, now, now);

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

    case 'get_study_templates': {
      const templates = db.prepare(
        'SELECT id, name, slug, description, strategy, config, is_system FROM study_mode_templates WHERE user_id IS NULL OR user_id = ? ORDER BY is_system DESC, name'
      ).all(userId) as any[];
      return JSON.stringify(templates.map((t: any) => {
        try { t.config = JSON.parse(t.config); } catch { /* keep */ }
        return t;
      }));
    }

    case 'get_statistics_overview': {
      // Streak calculation
      const activityDates = db.prepare(
        `SELECT DISTINCT date FROM (
           SELECT date FROM tasks WHERE user_id = ? AND status = 'completed'
           UNION
           SELECT date FROM study_activity_log WHERE user_id = ? AND activity_type = 'card_reviewed'
         ) ORDER BY date DESC`
      ).all(userId, userId) as { date: string }[];

      const dateSet = new Set(activityDates.map(d => d.date));
      let currentStreak = 0;
      const cursor = new Date(today);
      while (dateSet.has(cursor.toISOString().split('T')[0])) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // Today stats
      const todayTasks = db.prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE user_id = ? AND date = ?`
      ).get(userId, today) as any;

      const todayCards = db.prepare(
        `SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = ? AND date = ? AND activity_type = 'card_reviewed'`
      ).get(userId, today) as any;

      // This week
      const d = new Date(today);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      const weekStart = d.toISOString().split('T')[0];

      const weekTasks = db.prepare(
        `SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE user_id = ? AND date >= ? AND date <= ?`
      ).get(userId, weekStart, today) as any;

      const weekCards = db.prepare(
        `SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = ? AND date >= ? AND date <= ? AND activity_type = 'card_reviewed'`
      ).get(userId, weekStart, today) as any;

      return JSON.stringify({
        streak: { current: currentStreak },
        today: { tasks_completed: todayTasks.completed || 0, tasks_total: todayTasks.total, cards_reviewed: todayCards.count },
        this_week: { tasks_completed: weekTasks.completed || 0, tasks_total: weekTasks.total, cards_reviewed: weekCards.count },
      });
    }

    case 'suggest_next_topics': {
      const { course_id } = args as { course_id?: string };

      let courseFilter = '';
      const params: unknown[] = [userId];
      if (course_id) {
        courseFilter = ' AND c.id = ?';
        params.push(course_id);
      }

      // Get courses with task and card stats
      const courseStats = db.prepare(
        `SELECT c.id, c.name, c.code,
                (SELECT COUNT(*) FROM tasks WHERE course_id = c.id AND user_id = ? AND status = 'completed') as tasks_completed,
                (SELECT COUNT(*) FROM tasks WHERE course_id = c.id AND user_id = ?) as tasks_total,
                (SELECT COUNT(*) FROM cards ca JOIN card_decks d ON ca.deck_id = d.id WHERE d.course_id = c.id AND d.user_id = ?) as cards_total,
                (SELECT COUNT(*) FROM cards ca JOIN card_decks d ON ca.deck_id = d.id WHERE d.course_id = c.id AND d.user_id = ? AND ca.fsrs_reps > 0) as cards_reviewed
         FROM courses c WHERE c.user_id = ?${courseFilter} ORDER BY c.name`
      ).all(userId, userId, userId, userId, ...params) as any[];

      // Recent completed tasks (last 7 days)
      const recentTasks = db.prepare(
        `SELECT t.title, t.date, t.course_id, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = ? AND t.status = 'completed' AND t.date >= date('now', '-7 days')
         ORDER BY t.date DESC LIMIT 20`
      ).all(userId) as any[];

      // Active goals
      const goals = db.prepare(
        `SELECT g.title, g.deadline, g.course_id, c.name as course_name, g.exam_mode
         FROM goals g JOIN courses c ON g.course_id = c.id
         WHERE g.user_id = ? AND g.status = 'active' ORDER BY g.deadline`
      ).all(userId) as any[];

      // Pending tasks
      const pendingTasks = db.prepare(
        `SELECT t.title, t.date, t.priority, t.course_id, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = ? AND t.status = 'pending' AND t.date >= ?
         ORDER BY t.date LIMIT 20`
      ).all(userId, today) as any[];

      return JSON.stringify({
        course_stats: courseStats,
        recent_completed: recentTasks,
        active_goals: goals,
        upcoming_pending: pendingTasks,
        analysis_hint: 'Use this data to suggest what topics the student should focus on next. Consider: incomplete tasks, goals with close deadlines, courses with low completion rates, and gaps in card coverage.',
      });
    }

    case 'generate_weekly_review': {
      const weekOffset = (args.week_offset as number) || 0;
      const refDate = new Date(today);
      refDate.setDate(refDate.getDate() + weekOffset * 7);

      const refDay = refDate.getDay();
      const mondayDiff = refDay === 0 ? 6 : refDay - 1;
      const monday = new Date(refDate);
      monday.setDate(monday.getDate() - mondayDiff);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);

      const weekStartStr = monday.toISOString().split('T')[0];
      const weekEndStr = sunday.toISOString().split('T')[0];

      // Tasks completed vs total this week
      const taskStats = db.prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM tasks WHERE user_id = ? AND date >= ? AND date <= ?`
      ).get(userId, weekStartStr, weekEndStr) as any;

      // Cards reviewed this week
      const cardStats = db.prepare(
        `SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = ? AND date >= ? AND date <= ? AND activity_type = 'card_reviewed'`
      ).get(userId, weekStartStr, weekEndStr) as any;

      // Completed tasks by course
      const byCourse = db.prepare(
        `SELECT c.name as course_name, COUNT(*) as completed
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = ? AND t.date >= ? AND t.date <= ? AND t.status = 'completed'
         GROUP BY c.name ORDER BY completed DESC`
      ).all(userId, weekStartStr, weekEndStr) as any[];

      // Behind-schedule items (pending tasks with past dates)
      const behindSchedule = db.prepare(
        `SELECT t.title, t.date, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = ? AND t.status = 'pending' AND t.date < ? AND t.date >= ?
         ORDER BY t.date LIMIT 10`
      ).all(userId, today, weekStartStr) as any[];

      return JSON.stringify({
        week: { start: weekStartStr, end: weekEndStr },
        tasks: { total: taskStats.total, completed: taskStats.completed || 0, pending: taskStats.pending || 0 },
        cards_reviewed: cardStats.count,
        completed_by_course: byCourse,
        behind_schedule: behindSchedule,
        narrative_hint: 'Use this data to narrate a weekly review: celebrate wins, highlight missed items, and suggest focus areas for next week.',
      });
    }

    case 'search_memories': {
      const { query, category } = args as { query: string; category?: string };
      const store = new VectorStore();

      // --- Path 1: LIKE keyword search (always runs as baseline) ---
      let keywordSql = 'SELECT id, category, content, created_at FROM agent_memories WHERE user_id = ? AND content LIKE ?';
      const keywordParams: unknown[] = [userId, `%${query}%`];
      if (category) { keywordSql += ' AND category = ?'; keywordParams.push(category); }
      keywordSql += ' ORDER BY relevance_score DESC, created_at DESC LIMIT 10';
      const keywordMemories = db.prepare(keywordSql).all(...keywordParams) as Array<{
        id: string; category: string; content: string; created_at: string;
      }>;

      // --- Path 2: FTS5 full-text search ---
      const ftsResults = store.ftsSearchMemories(query, 10, userId);

      // --- Path 3: Semantic vector search (if provider available) ---
      let semanticMapped: Array<{ id: string; category: string; content: string; created_at: string; similarity_score: number }> = [];
      try {
        const provider = getEmbeddingProvider(userId);
        if (provider) {
          const queryEmbeddings = await provider.embed([query], 'query');
          if (queryEmbeddings.length > 0) {
            const semanticResults = store.searchMemoriesWithContent(queryEmbeddings[0], 10, userId);
            semanticMapped = semanticResults.map((r) => ({
              id: r.memory_id,
              category: r.category,
              content: r.content,
              created_at: r.created_at,
              similarity_score: Math.round((1 - r.distance) * 100) / 100,
            }));
          }
        }
      } catch (err) {
        console.warn('Semantic memory search failed:', err);
      }

      // --- Three-way merge: semantic > FTS5 > LIKE, deduplicate ---
      let results: Array<{ id: string; category: string; content: string; created_at: string; similarity_score?: number }> = [];
      const seenIds = new Set<string>();
      for (const m of semanticMapped) { if (!seenIds.has(m.id)) { seenIds.add(m.id); results.push(m); } }
      for (const r of ftsResults) {
        if (!seenIds.has(r.memory_id)) {
          seenIds.add(r.memory_id);
          results.push({ id: r.memory_id, category: r.category, content: r.content, created_at: r.created_at });
        }
      }
      for (const m of keywordMemories) {
        if (!seenIds.has(m.id)) { seenIds.add(m.id); results.push(m); }
      }

      results = results.slice(0, 10);

      // Update last_accessed
      const now = new Date().toISOString();
      for (const m of results) {
        db.prepare('UPDATE agent_memories SET last_accessed = ? WHERE id = ?').run(now, m.id);
      }

      return JSON.stringify(results);
    }

    case 'save_memory': {
      const { category, content } = args as { category: string; content: string };
      const id = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        'INSERT INTO agent_memories (id, user_id, category, content, relevance_score, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(id, userId, category, content, 1.0, now);

      // Generate embedding asynchronously (don't block tool response)
      (async () => {
        try {
          const provider = getEmbeddingProvider(userId);
          if (!provider) return;
          const embeddings = await provider.embed([content], 'document');
          if (embeddings.length > 0) {
            const store = new VectorStore();
            store.upsertMemoryEmbedding(id, embeddings[0]);
          }
        } catch (err) {
          console.warn('Failed to generate memory embedding:', err);
        }
      })();

      return JSON.stringify({ id, message: 'Memory saved successfully' });
    }

    case 'get_time_blocks': {
      const { date, week_of, templates_only } = args as { date?: string; week_of?: string; templates_only?: boolean };

      if (templates_only) {
        const templates = db.prepare(
          'SELECT id, label, type, day_of_week, start_time, end_time, color FROM time_blocks WHERE user_id = ? ORDER BY day_of_week, start_time'
        ).all(userId);
        return JSON.stringify({ templates });
      }

      if (week_of) {
        // Import helper logic inline — compute resolved blocks for 7 days
        const startDate = new Date(week_of);
        const dayOW = startDate.getUTCDay();
        const mondayOff = dayOW === 0 ? -6 : 1 - dayOW;
        startDate.setUTCDate(startDate.getUTCDate() + mondayOff);

        const weekResult: Record<string, any> = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(startDate);
          d.setUTCDate(d.getUTCDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const dow = d.getUTCDay();

          const tmpl = db.prepare('SELECT * FROM time_blocks WHERE user_id = ? AND day_of_week = ?').all(userId, dow) as any[];
          const overrides = db.prepare('SELECT * FROM time_block_overrides WHERE user_id = ? AND override_date = ?').all(userId, dateStr) as any[];
          const overMap = new Map(overrides.map((o: any) => [o.time_block_id, o]));

          const blocks: any[] = [];
          let studyMin = 0;
          for (const t of tmpl) {
            const ov = overMap.get(t.id) as any;
            if (ov && ov.start_time === null) continue; // deleted for this day
            const st = ov ? ov.start_time : t.start_time;
            const et = ov ? ov.end_time : t.end_time;
            blocks.push({ id: t.id, label: t.label, type: t.type, start_time: st, end_time: et });
            if (t.type === 'study') {
              const [sh, sm] = st.split(':').map(Number);
              const [eh, em] = et.split(':').map(Number);
              studyMin += (eh * 60 + em) - (sh * 60 + sm);
            }
          }
          weekResult[dateStr] = { blocks, available_study_minutes: Math.max(studyMin, 0) };
        }
        return JSON.stringify(weekResult);
      }

      if (date) {
        const d = new Date(date);
        const dow = d.getUTCDay();
        const tmpl = db.prepare('SELECT * FROM time_blocks WHERE user_id = ? AND day_of_week = ?').all(userId, dow) as any[];
        const overrides = db.prepare('SELECT * FROM time_block_overrides WHERE user_id = ? AND override_date = ?').all(userId, date) as any[];
        const overMap = new Map(overrides.map((o: any) => [o.time_block_id, o]));

        const blocks: any[] = [];
        let studyMin = 0;
        for (const t of tmpl) {
          const ov = overMap.get(t.id) as any;
          if (ov && ov.start_time === null) continue;
          const st = ov ? ov.start_time : t.start_time;
          const et = ov ? ov.end_time : t.end_time;
          blocks.push({ id: t.id, label: t.label, type: t.type, start_time: st, end_time: et });
          if (t.type === 'study') {
            const [sh, sm] = st.split(':').map(Number);
            const [eh, em] = et.split(':').map(Number);
            studyMin += (eh * 60 + em) - (sh * 60 + sm);
          }
        }
        return JSON.stringify({ date, blocks, available_study_minutes: Math.max(studyMin, 0) });
      }

      // Default: return templates
      const templates = db.prepare(
        'SELECT id, label, type, day_of_week, start_time, end_time, color FROM time_blocks WHERE user_id = ? ORDER BY day_of_week, start_time'
      ).all(userId);
      return JSON.stringify({ templates });
    }

    case 'get_goal_dependencies': {
      const { goal_id, course_id: depCourseId, include_chain } = args as { goal_id?: string; course_id?: string; include_chain?: boolean };

      if (goal_id) {
        const deps = db.prepare(
          'SELECT gd.id, gd.goal_id, gd.depends_on_goal_id, g.title as depends_on_title FROM goal_dependencies gd JOIN goals g ON gd.depends_on_goal_id = g.id WHERE gd.goal_id = ?'
        ).all(goal_id);

        if (include_chain) {
          // Recursive chain: follow depends_on_goal_id
          const chain: Array<{ goal_id: string; title: string }> = [];
          const visited = new Set<string>();
          let current = goal_id;
          while (current && !visited.has(current)) {
            visited.add(current);
            const dep = db.prepare(
              'SELECT gd.depends_on_goal_id, g.title FROM goal_dependencies gd JOIN goals g ON gd.depends_on_goal_id = g.id WHERE gd.goal_id = ? LIMIT 1'
            ).get(current) as any;
            if (!dep) break;
            chain.unshift({ goal_id: dep.depends_on_goal_id, title: dep.title });
            current = dep.depends_on_goal_id;
          }
          return JSON.stringify({ goal_id, dependencies: deps, chain });
        }

        return JSON.stringify({ goal_id, dependencies: deps });
      }

      if (depCourseId) {
        const deps = db.prepare(
          `SELECT gd.id, gd.goal_id, g1.title as goal_title, gd.depends_on_goal_id, g2.title as depends_on_title
           FROM goal_dependencies gd
           JOIN goals g1 ON gd.goal_id = g1.id
           JOIN goals g2 ON gd.depends_on_goal_id = g2.id
           WHERE g1.course_id = ?`
        ).all(depCourseId);
        return JSON.stringify({ course_id: depCourseId, dependencies: deps });
      }

      // All dependencies for user
      const deps = db.prepare(
        `SELECT gd.id, gd.goal_id, g1.title as goal_title, gd.depends_on_goal_id, g2.title as depends_on_title
         FROM goal_dependencies gd
         JOIN goals g1 ON gd.goal_id = g1.id
         JOIN goals g2 ON gd.depends_on_goal_id = g2.id
         WHERE g1.user_id = ?`
      ).all(userId);
      return JSON.stringify({ dependencies: deps });
    }

    case 'search_documents': {
      const { query, course_id, file_type } = args as { query: string; course_id?: string; file_type?: string };
      const store = new VectorStore();

      // Helper: look up document metadata for a set of document IDs
      interface DocResult {
        id: string; filename: string; file_type: string; summary: string;
        page_count: number; document_type: string; chunk_count: number;
        course_id: string; course_name: string;
        relevant_chunks?: Array<{ content: string; chunk_index: number; similarity: number; source: string }>;
      }

      const lookupDocs = (docIds: string[]): DocResult[] => {
        if (docIds.length === 0) return [];
        const placeholders = docIds.map(() => '?').join(',');
        let docSql = `SELECT d.id, d.filename, d.file_type, d.summary, d.page_count, d.document_type, d.chunk_count,
                             d.course_id, c.name as course_name
                      FROM documents d JOIN courses c ON d.course_id = c.id
                      WHERE d.user_id = ? AND d.id IN (${placeholders})`;
        const docParams: unknown[] = [userId, ...docIds];
        if (course_id) { docSql += ' AND d.course_id = ?'; docParams.push(course_id); }
        if (file_type) { docSql += ' AND d.file_type = ?'; docParams.push(file_type); }
        return db.prepare(docSql).all(...docParams) as DocResult[];
      };

      // Accumulator: doc_id -> chunk snippets (from all sources)
      const docChunkMap = new Map<string, Array<{ content: string; chunk_index: number; similarity: number; source: string }>>();
      const addChunks = (chunks: Array<{ document_id: string; content: string; chunk_index: number; distance: number }>, source: string) => {
        for (const chunk of chunks) {
          if (!docChunkMap.has(chunk.document_id)) docChunkMap.set(chunk.document_id, []);
          const existing = docChunkMap.get(chunk.document_id)!;
          // Deduplicate by chunk_id content
          if (!existing.some((e) => e.chunk_index === chunk.chunk_index)) {
            existing.push({
              content: chunk.content.slice(0, 500),
              chunk_index: chunk.chunk_index,
              similarity: Math.round((1 - chunk.distance) * 100) / 100,
              source,
            });
          }
        }
      };

      // --- Path 1: Semantic vector search ---
      try {
        const provider = getEmbeddingProvider(userId);
        if (provider) {
          const queryEmbeddings = await provider.embed([query], 'query');
          if (queryEmbeddings.length > 0) {
            const semanticChunks = store.searchChunksWithContent(queryEmbeddings[0], 10, userId);
            addChunks(semanticChunks, 'semantic');
          }
        }
      } catch (err) {
        console.warn('Semantic document search failed:', err);
      }

      // --- Path 2: FTS5 full-text search ---
      const ftsChunks = store.ftsSearchChunks(query, 10, userId);
      addChunks(ftsChunks, 'fts5');

      // --- Path 3: LIKE keyword search on filename + summary ---
      let keywordSql = `SELECT d.id, d.filename, d.file_type, d.summary, d.page_count, d.document_type, d.chunk_count,
                                d.course_id, c.name as course_name
                         FROM documents d JOIN courses c ON d.course_id = c.id
                         WHERE d.user_id = ? AND d.parse_status = 'completed'
                         AND (d.filename LIKE ? OR d.summary LIKE ?)`;
      const searchPattern = `%${query}%`;
      const keywordParams: unknown[] = [userId, searchPattern, searchPattern];
      if (course_id) { keywordSql += ' AND d.course_id = ?'; keywordParams.push(course_id); }
      if (file_type) { keywordSql += ' AND d.file_type = ?'; keywordParams.push(file_type); }
      keywordSql += ' ORDER BY d.created_at DESC LIMIT 10';
      const keywordDocs = db.prepare(keywordSql).all(...keywordParams) as DocResult[];

      // --- Three-way merge: semantic+FTS5 docs first (with chunks), then LIKE docs ---
      let results: DocResult[] = [];
      const seenIds = new Set<string>();

      // Documents found via chunk search (semantic + FTS5)
      if (docChunkMap.size > 0) {
        const chunkDocIds = Array.from(docChunkMap.keys());
        const chunkDocs = lookupDocs(chunkDocIds);
        for (const doc of chunkDocs) {
          doc.relevant_chunks = (docChunkMap.get(doc.id) || []).sort((a, b) => b.similarity - a.similarity);
        }
        // Sort by best chunk similarity
        chunkDocs.sort((a, b) => {
          const bestA = Math.max(...(a.relevant_chunks || []).map((c) => c.similarity), 0);
          const bestB = Math.max(...(b.relevant_chunks || []).map((c) => c.similarity), 0);
          return bestB - bestA;
        });
        for (const doc of chunkDocs) { seenIds.add(doc.id); results.push(doc); }
      }

      // Add LIKE keyword docs that weren't found by chunk search
      for (const doc of keywordDocs) {
        if (!seenIds.has(doc.id)) { seenIds.add(doc.id); results.push(doc); }
      }

      results = results.slice(0, 10);

      if (results.length === 0) {
        return JSON.stringify({ results: [], message: 'No documents found matching your query.' });
      }
      return JSON.stringify({ results, total: results.length });
    }

    case 'get_document_content': {
      const { document_id, chunk_index, include_all_chunks } = args as {
        document_id: string; chunk_index?: number; include_all_chunks?: boolean;
      };

      // Get document (verify ownership)
      const doc = db.prepare(
        'SELECT id, filename, file_type, extracted_text, summary, page_count, document_type, chunk_count, parse_status FROM documents WHERE id = ? AND user_id = ?'
      ).get(document_id, userId) as {
        id: string; filename: string; file_type: string; extracted_text: string | null;
        summary: string | null; page_count: number | null; document_type: string | null;
        chunk_count: number; parse_status: string;
      } | undefined;

      if (!doc) {
        return JSON.stringify({ error: 'Document not found' });
      }
      if (doc.parse_status !== 'completed') {
        return JSON.stringify({ error: `Document is not ready (status: ${doc.parse_status})` });
      }

      const meta = {
        id: doc.id,
        filename: doc.filename,
        file_type: doc.file_type,
        summary: doc.summary,
        page_count: doc.page_count,
        document_type: doc.document_type,
        chunk_count: doc.chunk_count,
      };

      // If document is NOT chunked, return full text
      if (doc.chunk_count === 0) {
        // Truncate if extremely long (> 50K chars) to avoid overloading context
        const text = doc.extracted_text || '';
        const truncated = text.length > 50000 ? text.slice(0, 50000) + '\n\n[... text truncated at 50,000 characters]' : text;
        return JSON.stringify({ ...meta, content: truncated });
      }

      // Document IS chunked
      if (chunk_index !== undefined) {
        // Return specific chunk
        const chunk = db.prepare(
          'SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = ? AND chunk_index = ?'
        ).get(document_id, chunk_index) as { chunk_index: number; content: string; heading: string | null; page_start: number | null; page_end: number | null } | undefined;

        if (!chunk) {
          return JSON.stringify({ ...meta, error: `Chunk index ${chunk_index} not found. Valid range: 0–${doc.chunk_count - 1}` });
        }
        return JSON.stringify({ ...meta, chunk });
      }

      if (include_all_chunks) {
        const chunks = db.prepare(
          'SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = ? ORDER BY chunk_index'
        ).all(document_id) as any[];
        return JSON.stringify({ ...meta, chunks });
      }

      // Default: return first 3 chunks
      const chunks = db.prepare(
        'SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = ? ORDER BY chunk_index LIMIT 3'
      ).all(document_id) as any[];
      return JSON.stringify({
        ...meta,
        chunks,
        message: `Showing chunks 0–${chunks.length - 1} of ${doc.chunk_count}. Use chunk_index to fetch specific chunks, or include_all_chunks=true for all.`,
      });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
