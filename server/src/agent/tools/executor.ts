import { v4 as uuidv4 } from 'uuid';
import { getEmbeddingProvider } from '../../embedding/index.js';
import { VectorStore } from '../../embedding/vectorStore.js';
import { normalizeCardContent } from './normalizeContent.js';

import { execute, queryAll, queryOne, transaction } from '../../db/pool.js';

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  switch (toolName) {
    case 'list_courses': {
      const courses = await queryAll(`SELECT id, name, code, color, weight FROM courses WHERE user_id = $1 ORDER BY name`, [userId]);
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
      const tasks = await queryAll(query, params);
      return JSON.stringify(tasks);
    }

    case 'create_task': {
      // GUARD: Direct task creation by Agent is blocked. Use create_proposal(study_plan) instead.
      return JSON.stringify({ error: 'BLOCKED: Direct task creation is not allowed. You MUST use create_proposal with type "study_plan" or "goal_breakdown" to create tasks. The student must review and approve the proposal first. This is a Design Constitution requirement — do not attempt to bypass it.' });
    }

    case 'complete_task': {
      const { task_id } = args as { task_id: string };
      const now = new Date().toISOString();
      const result = await execute('UPDATE tasks SET status = $1, completed_at = $2, updated_at = $3 WHERE id = $4 AND user_id = $5', ['completed', now, now, task_id, userId]);
      if (result.rowCount === 0) return JSON.stringify({ error: 'Task not found or not owned by user' });
      return JSON.stringify({ task_id, status: 'completed', message: 'Task marked as completed' });
    }

    case 'list_goals': {
      const { course_id, include_hierarchy } = args as { course_id?: string; include_hierarchy?: boolean };
      let query = 'SELECT g.id, g.title, g.description, g.deadline, g.status, g.course_id, g.parent_id, c.name as course_name FROM goals g JOIN courses c ON g.course_id = c.id WHERE g.user_id = ?';
      const params: unknown[] = [userId];
      if (course_id) { query += ' AND g.course_id = ?'; params.push(course_id); }
      query += ' ORDER BY g.created_at DESC';
      const goals = await queryAll(query, params);

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
        const allTasks = await queryAll(`SELECT id, title, date, priority, status, goal_id, serves_must FROM tasks WHERE user_id = $1 AND goal_id IS NOT NULL ORDER BY date`, [userId])<Record<string, unknown>>;
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
      await execute('INSERT INTO goals (id, user_id, course_id, title, description, deadline, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [id, userId, course_id, title, description || null, deadline || null, 'active', now, now]);
      return JSON.stringify({ id, title, message: 'Goal created successfully' });
    }

    case 'create_sub_goal': {
      const { title, parent_id, course_id, deadline, description } = args as Record<string, string | undefined>;
      // Look up parent to inherit course_id if not provided
      let resolvedCourseId = course_id;
      if (!resolvedCourseId && parent_id) {
        const parent = await queryOne(`SELECT course_id FROM goals WHERE id = $1 AND user_id = $2`, [parent_id, userId]) as { course_id: string } | undefined;
        if (!parent) return JSON.stringify({ error: 'Parent goal not found' });
        resolvedCourseId = parent.course_id;
      }
      if (!resolvedCourseId) return JSON.stringify({ error: 'course_id required (could not inherit from parent)' });
      const id = uuidv4();
      const now = new Date().toISOString();
      await execute('INSERT INTO goals (id, user_id, course_id, parent_id, title, description, deadline, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [id, userId, resolvedCourseId, parent_id || null, title, description || null, deadline || null, 'active', now, now]);
      return JSON.stringify({ id, title, parent_id, message: 'Sub-goal created successfully' });
    }

    case 'list_decks': {
      const { course_id } = args as { course_id?: string };
      let query = 'SELECT d.id, d.name, d.description, d.card_count, d.course_id, c.name as course_name FROM card_decks d JOIN courses c ON d.course_id = c.id WHERE d.user_id = ?';
      const params: unknown[] = [userId];
      if (course_id) { query += ' AND d.course_id = ?'; params.push(course_id); }
      query += ' ORDER BY d.created_at DESC';
      const decks = await queryAll(query, params);
      return JSON.stringify(decks);
    }

    case 'create_deck': {
      const { course_id, name, description } = args as { course_id: string; name: string; description?: string };
      // Verify course exists and belongs to user
      const course = await queryOne(`SELECT id, name FROM courses WHERE id = $1 AND user_id = $2`, [course_id, userId]) as { id: string; name: string } | undefined;
      if (!course) return JSON.stringify({ error: 'Course not found' });
      const deckId = uuidv4();
      const now = new Date().toISOString();
      await execute('INSERT INTO card_decks (id, user_id, course_id, name, description, card_count, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 0, $6, $7)', [deckId, userId, course_id, name, description || null, now, now]);
      return JSON.stringify({ id: deckId, name, course_id, course_name: course.name, message: 'Deck created successfully' });
    }

    case 'list_sections': {
      const { deck_id: secDeckId } = args as { deck_id: string };
      const sections = await queryAll('SELECT id, name, order_index FROM card_sections WHERE deck_id = $1 AND user_id = $2 ORDER BY order_index ASC, created_at ASC', [secDeckId, userId]);
      return JSON.stringify(sections);
    }

    case 'create_section': {
      const { deck_id: csDeckId, name: csName, order_index: csOrder } = args as { deck_id: string; name: string; order_index?: number };
      // Verify deck exists and belongs to user
      const csDeck = await queryOne(`SELECT id FROM card_decks WHERE id = $1 AND user_id = $2`, [csDeckId, userId]);
      if (!csDeck) return JSON.stringify({ error: 'Deck not found' });
      const csId = uuidv4();
      const csNow = new Date().toISOString();
      // Default order_index: append after existing sections
      let resolvedOrder = csOrder;
      if (resolvedOrder === undefined) {
        const maxOrder = await queryOne('SELECT MAX(order_index) as mx FROM card_sections WHERE deck_id = $1 AND user_id = $2', [csDeckId, userId]);
        resolvedOrder = (maxOrder?.mx ?? -1) + 1;
      }
      await execute('INSERT INTO card_sections (id, deck_id, user_id, name, order_index, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [csId, csDeckId, userId, csName, resolvedOrder, csNow]);
      return JSON.stringify({ id: csId, name: csName, deck_id: csDeckId, order_index: resolvedOrder, message: 'Section created successfully' });
    }

    case 'list_cards': {
      const { deck_id, template_type, search } = args as Record<string, string | undefined>;
      let query = 'SELECT id, title, template_type, importance, fsrs_next_review FROM cards WHERE deck_id = ? AND user_id = ?';
      const params: unknown[] = [deck_id, userId];
      if (template_type) { query += ' AND template_type = ?'; params.push(template_type); }
      if (search) { query += ' AND title LIKE ?'; params.push(`%${search}%`); }
      query += ' ORDER BY created_at DESC LIMIT 50';
      const cards = await queryAll(query, params);
      return JSON.stringify(cards);
    }

    case 'create_card': {
      // GUARD: Direct card creation by Agent is blocked. Use create_proposal(batch_cards) instead.
      return JSON.stringify({ error: 'BLOCKED: Direct card creation is not allowed. You MUST use create_proposal with type "batch_cards" to create cards. The student must review and approve the proposal first. This is a Design Constitution requirement — do not attempt to bypass it.' });
    }

    case 'get_review_due': {
      const date = (args.date as string) || today;
      const dueCards = await queryAll(`SELECT c.id, c.title, c.deck_id, d.name as deck_name FROM cards c JOIN card_decks d ON c.deck_id = d.id WHERE c.user_id = $1 AND (c.fsrs_next_review IS NULL OR c.fsrs_next_review <= $2) LIMIT 20`, [userId, date]) as Array<Record<string, unknown>>;
      return JSON.stringify({ count: dueCards.length, cards: dueCards });
    }

    case 'get_daily_brief': {
      const date = (args.date as string) || today;
      const tasks = await queryAll('SELECT t.id, t.title, t.priority, t.status, t.course_id, c.name as course_name FROM tasks t JOIN courses c ON t.course_id = c.id WHERE t.user_id = $1 AND t.date = $2 ORDER BY t.priority, t.order_index', [userId, date]);

      const must = tasks.filter((t) => t.priority === 'must');
      const recommended = tasks.filter((t) => t.priority === 'recommended');
      const optional = tasks.filter((t) => t.priority === 'optional');

      const dueCount = await queryOne(`SELECT COUNT(*) as count FROM cards WHERE user_id = $1 AND (fsrs_next_review IS NULL OR fsrs_next_review <= $2)`, [userId, date]) as { count: number };

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

      // Defensive: if data is missing or items is empty, warn the Agent
      if (!data || typeof data !== 'object') {
        return JSON.stringify({ error: 'data must be an object with { title, description, items }' });
      }
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        console.warn(`[create_proposal] WARNING: Agent created ${type} proposal with 0 items. Args:`, JSON.stringify(args).slice(0, 500));
        return JSON.stringify({ error: `Proposal has 0 items. You must include the actual items in data.items array. Do not call create_proposal with an empty items array.` });
      }

      const id = uuidv4();
      const now = new Date().toISOString();
      await execute('INSERT INTO proposals (id, user_id, type, status, data, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [id, userId, type, 'pending', JSON.stringify(data), now]);
      return JSON.stringify({ id, type, items_count: items.length, message: `Proposal created with ${items.length} items. The student can review and apply it from the proposals panel.` });
    }

    case 'get_study_templates': {
      const templates = await queryAll(`SELECT id, name, slug, description, strategy, config, is_system FROM study_mode_templates WHERE user_id IS NULL OR user_id = $1 ORDER BY is_system DESC, name`, [userId]);
      return JSON.stringify(templates.map((t: any) => {
        try { t.config = JSON.parse(t.config); } catch { /* keep */ }
        return t;
      }));
    }

    case 'get_statistics_overview': {
      // Streak calculation
      const activityDates = await queryAll(`SELECT DISTINCT date FROM (
           SELECT date FROM tasks WHERE user_id = $1 AND status = 'completed'
           UNION
           SELECT date FROM study_activity_log WHERE user_id = $2 AND activity_type = 'card_reviewed'
         ) ORDER BY date DESC`, [userId, userId]) as { date: string }[];

      const dateSet = new Set(activityDates.map(d => d.date));
      let currentStreak = 0;
      const cursor = new Date(today);
      while (dateSet.has(cursor.toISOString().split('T')[0])) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      }

      // Today stats
      const todayTasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE user_id = $1 AND date = $2`, [userId, today]);

      const todayCards = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = $1 AND date = $2 AND activity_type = 'card_reviewed'`, [userId, today]);

      // This week
      const d = new Date(today);
      const day = d.getDay();
      const diff = day === 0 ? 6 : day - 1;
      d.setDate(d.getDate() - diff);
      const weekStart = d.toISOString().split('T')[0];

      const weekTasks = await queryOne(`SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tasks WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStart, today]);

      const weekCards = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = $1 AND date >= $2 AND date <= $3 AND activity_type = 'card_reviewed'`, [userId, weekStart, today]);

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
      const courseStats = await queryAll(`SELECT c.id, c.name, c.code,
                (SELECT COUNT(*) FROM tasks WHERE course_id = c.id AND user_id = $1 AND status = 'completed') as tasks_completed,
                (SELECT COUNT(*) FROM tasks WHERE course_id = c.id AND user_id = $2) as tasks_total,
                (SELECT COUNT(*) FROM cards ca JOIN card_decks d ON ca.deck_id = d.id WHERE d.course_id = c.id AND d.user_id = $3) as cards_total,
                (SELECT COUNT(*) FROM cards ca JOIN card_decks d ON ca.deck_id = d.id WHERE d.course_id = c.id AND d.user_id = $4 AND ca.fsrs_reps > 0) as cards_reviewed
         FROM courses c WHERE c.user_id = $5${courseFilter} ORDER BY c.name`, [userId, userId, userId, userId, ...params]);

      // Recent completed tasks (last 7 days)
      const recentTasks = await queryAll(`SELECT t.title, t.date, t.course_id, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = $1 AND t.status = 'completed' AND t.date >= date('now', '-7 days')
         ORDER BY t.date DESC LIMIT 20`, [userId]);

      // Active goals
      const goals = await queryAll(`SELECT g.title, g.deadline, g.course_id, c.name as course_name, g.exam_mode
         FROM goals g JOIN courses c ON g.course_id = c.id
         WHERE g.user_id = $1 AND g.status = 'active' ORDER BY g.deadline`, [userId]);

      // Pending tasks
      const pendingTasks = await queryAll(`SELECT t.title, t.date, t.priority, t.course_id, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = $1 AND t.status = 'pending' AND t.date >= $2
         ORDER BY t.date LIMIT 20`, [userId, today]);

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
      const taskStats = await queryOne(`SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
         FROM tasks WHERE user_id = $1 AND date >= $2 AND date <= $3`, [userId, weekStartStr, weekEndStr]);

      // Cards reviewed this week
      const cardStats = await queryOne(`SELECT COUNT(*) as count FROM study_activity_log
         WHERE user_id = $1 AND date >= $2 AND date <= $3 AND activity_type = 'card_reviewed'`, [userId, weekStartStr, weekEndStr]);

      // Completed tasks by course
      const byCourse = await queryAll(`SELECT c.name as course_name, COUNT(*) as completed
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = $1 AND t.date >= $2 AND t.date <= $3 AND t.status = 'completed'
         GROUP BY c.name ORDER BY completed DESC`, [userId, weekStartStr, weekEndStr]);

      // Behind-schedule items (pending tasks with past dates)
      const behindSchedule = await queryAll(`SELECT t.title, t.date, c.name as course_name
         FROM tasks t JOIN courses c ON t.course_id = c.id
         WHERE t.user_id = $1 AND t.status = 'pending' AND t.date < $2 AND t.date >= $3
         ORDER BY t.date LIMIT 10`, [userId, today, weekStartStr]);

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
      const keywordMemories = await queryAll(keywordSql, keywordParams);

      // --- Path 2: FTS5 full-text search ---
      const ftsResults = await store.ftsSearchMemories(query, 10, userId);

      // --- Path 3: Semantic vector search (if provider available) ---
      let semanticMapped: Array<{ id: string; category: string; content: string; created_at: string; similarity_score: number }> = [];
      try {
        const provider = await getEmbeddingProvider(userId);
        if (provider) {
          const queryEmbeddings = await provider.embed([query], 'query');
          if (queryEmbeddings.length > 0) {
            const semanticResults = await store.searchMemoriesWithContent(queryEmbeddings[0], 10, userId);
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
        await execute(`UPDATE agent_memories SET last_accessed = $1 WHERE id = $2`, [now, m.id]);
      }

      return JSON.stringify(results);
    }

    case 'save_memory': {
      const { category, content } = args as { category: string; content: string };
      const id = uuidv4();
      const now = new Date().toISOString();
      await execute('INSERT INTO agent_memories (id, user_id, category, content, relevance_score, created_at) VALUES ($1, $2, $3, $4, $5, $6)', [id, userId, category, content, 1.0, now]);

      // Generate embedding asynchronously (don't block tool response)
      (async () => {
        try {
          const provider = await getEmbeddingProvider(userId);
          if (!provider) return;
          const embeddings = await provider.embed([content], 'document');
          if (embeddings.length > 0) {
            const store = new VectorStore();
            await store.upsertMemoryEmbedding(id, embeddings[0]);
          }
        } catch (err) {
          console.warn('Failed to generate memory embedding:', err);
        }
      });

      return JSON.stringify({ id, message: 'Memory saved successfully' });
    }

    case 'get_time_blocks': {
      // v1.7.3: Date-based instances (no more weekly templates / overrides)
      const { date, from_date, to_date } = args as { date?: string; from_date?: string; to_date?: string };

      const computeStudyMin = (blocks: any[]): number => {
        let total = 0;
        for (const b of blocks) {
          if (b.type === 'study') {
            const [sh, sm] = b.start_time.split(':').map(Number);
            const [eh, em] = b.end_time.split(':').map(Number);
            total += (eh * 60 + em) - (sh * 60 + sm);
          }
        }
        return Math.max(total, 0);
      };

      if (from_date && to_date) {
        const blocks = await queryAll(`SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time`, [userId, from_date, to_date]);

        // Group by date
        const byDate: Record<string, any[]> = {};
        for (const b of blocks) {
          if (!byDate[b.date]) byDate[b.date] = [];
          byDate[b.date].push(b);
        }

        const result: Record<string, any> = {};
        // Fill in all dates in range (including empty ones)
        const cur = new Date(from_date + 'T00:00:00');
        const end = new Date(to_date + 'T00:00:00');
        while (cur <= end) {
          const ds = cur.toISOString().split('T')[0];
          const dayBlocks = byDate[ds] || [];
          result[ds] = { blocks: dayBlocks, available_study_minutes: computeStudyMin(dayBlocks) };
          cur.setDate(cur.getDate() + 1);
        }
        return JSON.stringify(result);
      }

      if (date) {
        const blocks = await queryAll(`SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = $1 AND date = $2 ORDER BY start_time`, [userId, date]);
        return JSON.stringify({ date, blocks, available_study_minutes: computeStudyMin(blocks) });
      }

      // Default: return blocks for next 14 days
      const today = new Date().toISOString().split('T')[0];
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const endDate = twoWeeks.toISOString().split('T')[0];
      const blocks = await queryAll(`SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date, start_time`, [userId, today, endDate]);
      return JSON.stringify({ from: today, to: endDate, blocks });
    }

    case 'get_goal_dependencies': {
      const { goal_id, course_id: depCourseId, include_chain } = args as { goal_id?: string; course_id?: string; include_chain?: boolean };

      if (goal_id) {
        const deps = await queryAll(`SELECT gd.id, gd.goal_id, gd.depends_on_goal_id, g.title as depends_on_title FROM goal_dependencies gd JOIN goals g ON gd.depends_on_goal_id = g.id WHERE gd.goal_id = $1`, [goal_id]);

        if (include_chain) {
          // Recursive chain: follow depends_on_goal_id
          const chain: Array<{ goal_id: string; title: string }> = [];
          const visited = new Set<string>();
          let current = goal_id;
          while (current && !visited.has(current)) {
            visited.add(current);
            const dep = await queryOne(`SELECT gd.depends_on_goal_id, g.title FROM goal_dependencies gd JOIN goals g ON gd.depends_on_goal_id = g.id WHERE gd.goal_id = $1 LIMIT 1`, [current]);
            if (!dep) break;
            chain.unshift({ goal_id: dep.depends_on_goal_id, title: dep.title });
            current = dep.depends_on_goal_id;
          }
          return JSON.stringify({ goal_id, dependencies: deps, chain });
        }

        return JSON.stringify({ goal_id, dependencies: deps });
      }

      if (depCourseId) {
        const deps = await queryAll(`SELECT gd.id, gd.goal_id, g1.title as goal_title, gd.depends_on_goal_id, g2.title as depends_on_title
           FROM goal_dependencies gd
           JOIN goals g1 ON gd.goal_id = g1.id
           JOIN goals g2 ON gd.depends_on_goal_id = g2.id
           WHERE g1.course_id = $1`, [depCourseId]);
        return JSON.stringify({ course_id: depCourseId, dependencies: deps });
      }

      // All dependencies for user
      const deps = await queryAll(`SELECT gd.id, gd.goal_id, g1.title as goal_title, gd.depends_on_goal_id, g2.title as depends_on_title
         FROM goal_dependencies gd
         JOIN goals g1 ON gd.goal_id = g1.id
         JOIN goals g2 ON gd.depends_on_goal_id = g2.id
         WHERE g1.user_id = $1`, [userId]);
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
        return await queryAll(docSql, docParams);
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
        const provider = await getEmbeddingProvider(userId);
        if (provider) {
          const queryEmbeddings = await provider.embed([query], 'query');
          if (queryEmbeddings.length > 0) {
            const semanticChunks = await store.searchChunksWithContent(queryEmbeddings[0], 10, userId);
            addChunks(semanticChunks, 'semantic');
          }
        }
      } catch (err) {
        console.warn('Semantic document search failed:', err);
      }

      // --- Path 2: FTS5 full-text search ---
      const ftsChunks = await store.ftsSearchChunks(query, 10, userId);
      addChunks(ftsChunks, 'fulltext');

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
      const keywordDocs = await queryAll(keywordSql, keywordParams);

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
      const doc = await queryOne(`SELECT id, filename, file_type, extracted_text, summary, page_count, document_type, chunk_count, parse_status FROM documents WHERE id = $1 AND user_id = $2`, [document_id, userId]) as {
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
        const chunk = await queryOne(`SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = $1 AND chunk_index = $2`, [document_id, chunk_index]) as { chunk_index: number; content: string; heading: string | null; page_start: number | null; page_end: number | null } | undefined;

        if (!chunk) {
          return JSON.stringify({ ...meta, error: `Chunk index ${chunk_index} not found. Valid range: 0–${doc.chunk_count - 1}` });
        }
        return JSON.stringify({ ...meta, chunk });
      }

      if (include_all_chunks) {
        const chunks = await queryAll(`SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index`, [document_id]);
        return JSON.stringify({ ...meta, chunks });
      }

      // Default: return first 3 chunks
      const chunks = await queryAll(`SELECT chunk_index, content, heading, page_start, page_end FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index LIMIT 3`, [document_id]);
      return JSON.stringify({
        ...meta,
        chunks,
        message: `Showing chunks 0–${chunks.length - 1} of ${doc.chunk_count}. Use chunk_index to fetch specific chunks, or include_all_chunks=true for all.`,
      });
    }

    case 'collect_preferences': {
      const { questions } = args as { questions: Array<Record<string, unknown>> };
      // Return a special marker that the orchestrator will detect
      // and send as a preference_form SSE event to the frontend
      return JSON.stringify({
        __type: 'preference_form',
        questions,
        message: 'Preference form sent to student. Wait for their response in the next message.',
      });
    }

    case 'create_time_blocks': {
      // v1.7.3: Date-based instances
      const { blocks } = args as {
        blocks: Array<{
          label: string; type?: string; date: string;
          start_time: string; end_time: string; color?: string;
        }>;
      };

      if (!blocks || blocks.length === 0) {
        return JSON.stringify({ error: 'No blocks provided' });
      }

      for (const item of blocks) {
        if (!item.label || !item.date || !item.start_time || !item.end_time) {
          return JSON.stringify({ error: 'Each block requires label, date, start_time, end_time' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
          return JSON.stringify({ error: 'date must be YYYY-MM-DD format' });
        }
        if (!/^\d{2}:\d{2}$/.test(item.start_time) || !/^\d{2}:\d{2}$/.test(item.end_time)) {
          return JSON.stringify({ error: 'start_time and end_time must be HH:MM format' });
        }
      }

      const now = new Date().toISOString();
      const created: Array<{ id: string; label: string; type: string; date: string; start_time: string; end_time: string }> = [];

      await transaction(async (client) => {
        for (const item of blocks) {
          const id = uuidv4();
          await execute(`INSERT INTO time_blocks (id, user_id, template_id, label, type, date, start_time, end_time, color, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [id, userId, null, item.label, item.type || 'custom', item.date, item.start_time, item.end_time, item.color || null, now, now]);
          created.push({
            id, label: item.label, type: item.type || 'custom',
            date: item.date, start_time: item.start_time, end_time: item.end_time,
          });
        }
      });

      return JSON.stringify({ created, message: `Created ${created.length} time block(s)` });
    }

    case 'update_time_block': {
      const { block_id, label, type, start_time, end_time, color } = args as {
        block_id: string; label?: string; type?: string;
        start_time?: string; end_time?: string; color?: string;
      };

      const existing = await queryOne(`SELECT * FROM time_blocks WHERE id = $1 AND user_id = $2`, [block_id, userId]);
      if (!existing) {
        return JSON.stringify({ error: 'Time block not found' });
      }

      const fields: string[] = [];
      const values: unknown[] = [];

      if (label !== undefined) { fields.push('label = ?'); values.push(label); }
      if (type !== undefined) { fields.push('type = ?'); values.push(type); }
      if (start_time !== undefined) { fields.push('start_time = ?'); values.push(start_time); }
      if (end_time !== undefined) { fields.push('end_time = ?'); values.push(end_time); }
      if (color !== undefined) { fields.push('color = ?'); values.push(color); }

      if (fields.length === 0) {
        return JSON.stringify({ error: 'No fields to update' });
      }

      fields.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(block_id);

      await execute(`UPDATE time_blocks SET ${fields.join(', ')} WHERE id = $1`, [...values]);

      const updated = await queryOne(`SELECT * FROM time_blocks WHERE id = $1`, [block_id]);
      return JSON.stringify({ updated, message: 'Time block updated' });
    }

    case 'delete_time_block': {
      const { block_id } = args as { block_id: string };

      const existing = await queryOne(`SELECT id FROM time_blocks WHERE id = $1 AND user_id = $2`, [block_id, userId]);
      if (!existing) {
        return JSON.stringify({ error: 'Time block not found' });
      }

      await execute(`DELETE FROM time_blocks WHERE id = $1`, [block_id]);
      return JSON.stringify({ message: 'Time block deleted' });
    }

    case 'link_task_cards': {
      const { task_id, links } = args as { task_id: string; links: { card_id: string; checklist_index?: number }[] };

      // Verify task belongs to user
      const taskRow = await queryOne(`SELECT id FROM tasks WHERE id = $1 AND user_id = $2`, [task_id, userId]);
      if (!taskRow) {
        return JSON.stringify({ error: 'Task not found' });
      }

      let created = 0;
      let skipped = 0;

      const batch = await transaction(async (client) => {
        for (const link of links) {
          // Verify card belongs to user
          const cardRow = await queryOne(`SELECT id FROM cards WHERE id = $1 AND user_id = $2`, [link.card_id, userId]);
          if (!cardRow) {
            skipped++;
            continue;
          }
          const linkId = uuidv4();
          const result = await execute(`INSERT INTO task_cards (id, task_id, card_id, checklist_index) VALUES ($1, $2, $3, $4)`, [linkId, task_id, link.card_id, link.checklist_index ?? null]);
          if (result.rowCount > 0) created++;
          else skipped++;
        }
      });
      return JSON.stringify({ task_id, created, skipped, message: `Linked ${created} card(s) to task` });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
