import { v4 as uuidv4 } from 'uuid';
import { BOARD_ACTION_TOOLS } from '../../toolFace/boardActions.js';
import { executeAgentBoardAction } from '../../services/agentBoardActions.js';
import { getDb } from '../../db/init.js';
import { getEmbeddingProvider } from '../../embedding/index.js';
import { VectorStore } from '../../embedding/vectorStore.js';
import { saveMemory, searchMemories } from '../memory/service.js';
import { normalizeCardContent } from './normalizeContent.js';
import { createGoal } from '../../services/goals.js';
import { createTask, completeTask, linkTaskCard } from '../../services/tasks.js';
import { createDeck } from '../../services/decks.js';
import { createSection } from '../../services/sections.js';
import { createTimeBlocks, updateTimeBlock } from '../../services/timeBlocks.js';
import { recordAgentAction, type AgentActionContext } from '../../services/recordAgentAction.js';
import { recordChatTranscription } from '../../services/recordChatTranscription.js';
import { deleteTimeBlockWithAuthorization } from '../../services/agentAuthorizations.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  CREATE_GOAL_TOOL, CREATE_SUB_GOAL_TOOL, CREATE_TASK_TOOL, CREATE_DECK_TOOL,
  CREATE_SECTION_TOOL, CREATE_TIME_BLOCKS_TOOL, UPDATE_TIME_BLOCK_TOOL,
  LINK_TASK_CARDS_TOOL, COMPLETE_TASK_TOOL,
  AGENT_READ_TOOLS,
} from '../../toolFace/registry.js';
import { goalReceiptHash } from '../../services/toolFaceReceiptRevert.js';
import { CHAT_PROPOSAL_TYPES } from '../../services/proposalTypes.js';
import { createOrganizedNoteProposalSchema, proposalTypeSchema } from '../../validators/index.js';
import { createProposal } from '../../services/proposals.js';
import { createOrganizedNoteProposal } from '../../services/organizedNoteProposals.js';
import { createNotePatchProposal } from '../../services/notePatchProposals.js';
import { readNoteForAgent, readBoardForAgent } from '../../services/agentReadSurfaces.js';
import { readContentGroupsForAgent, readAnnotationsRelationsForAgent } from '../../services/agentReadKnowledge.js';
import { AGENT_UI_TOOLS } from '../../toolFace/uiActions.js';
import { executeAgentUiCommand, type AgentUiRunState } from './uiCommands.js';

export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  context?: AgentActionContext,
  uiState?: AgentUiRunState,
): Promise<string> {
  const db = getDb();
  if (AGENT_UI_TOOLS.some(tool => tool.name === toolName)) {
    return JSON.stringify(executeAgentUiCommand(db, toolName, args, userId, context, uiState));
  }
  const today = new Date().toISOString().split('T')[0];
  if (BOARD_ACTION_TOOLS.some(tool => tool.name === toolName)) {
    return JSON.stringify(executeAgentBoardAction(db, toolName, args, userId, context));
  }

  const readTool = AGENT_READ_TOOLS.find((tool) => tool.name === toolName);
  if (readTool) {
    const input = readTool.input_schema.parse(args);
    let result: unknown;
    switch (toolName) {
      case 'read_note': result = readNoteForAgent({ userId, noteId: input.note_id, pageIndex: input.page_index }); break;
      case 'read_board': result = readBoardForAgent({ userId, boardId: input.board_id }); break;
      case 'read_content_groups': result = readContentGroupsForAgent(db, userId, input); break;
      case 'read_annotations_relations': result = readAnnotationsRelationsForAgent(db, userId, input); break;
    }
    return JSON.stringify(readTool.output_schema.parse(result));
  }

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
      const { result: task, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_TASK_TOOL, input: args, verb: 'task_created', summary: 'Created a task',
        execute: (input) => createTask(db, userId, input),
        resources: (created) => [{ kind: 'task', id: created.id, outcome: 'created', state_hash: goalReceiptHash(created) }],
        courseId: (created) => created.course_id,
      });
      return JSON.stringify(CREATE_TASK_TOOL.output_schema.parse({
        id: task.id, title: task.title, message: 'Task created successfully', receipt_id: receipt.id,
      }));
    }

    case 'complete_task': {
      const { result: change, receipt } = recordChatTranscription(db, userId, context, {
        tool: COMPLETE_TASK_TOOL, input: args, verb: 'task_completed', summary: 'Transcribed task completion',
        execute: (input) => {
          const data = input as { task_id: string };
          return completeTask(db, userId, data.task_id, { status: 'completed' });
        },
        resources: (changed) => [{
          kind: 'task', id: changed.after.id, outcome: 'completed', state_hash: goalReceiptHash(changed.after),
          before: { status: changed.before.status, completed_at: changed.before.completed_at, updated_at: changed.before.updated_at },
          activity: changed.activity,
          recurring_group_before: changed.recurringGroupBefore,
          recurring_group_after: changed.recurringGroupAfter,
        }],
        courseId: (changed) => changed.after.course_id,
      });
      return JSON.stringify(COMPLETE_TASK_TOOL.output_schema.parse({
        task_id: change.after.id, status: 'completed', message: 'Task marked as completed', receipt_id: receipt.id,
      }));
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
      const { result: goal, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_GOAL_TOOL,
        input: args,
        verb: 'goal_created',
        summary: 'Created a goal',
        execute: (input) => createGoal(db, userId, input),
        resources: (created) => [{ kind: 'goal', id: created.id, outcome: 'created', state_hash: goalReceiptHash(created) }],
        courseId: (created) => created.course_id,
      });
      return JSON.stringify(CREATE_GOAL_TOOL.output_schema.parse({
        id: goal.id, title: goal.title, message: 'Goal created successfully', receipt_id: receipt.id,
      }));
    }

    case 'create_sub_goal': {
      const { result: goal, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_SUB_GOAL_TOOL, input: args, verb: 'goal_created', summary: 'Created a sub-goal',
        execute: (input) => {
          const data = input as { parent_id: string; course_id?: string };
          const parent = db.prepare('SELECT course_id FROM goals WHERE id = ? AND user_id = ?')
            .get(data.parent_id, userId) as { course_id: string } | undefined;
          if (!parent) throw new AppError(404, 'Parent goal not found');
          return createGoal(db, userId, { ...data, course_id: data.course_id ?? parent.course_id });
        },
        resources: (created) => [{ kind: 'goal', id: created.id, outcome: 'created', state_hash: goalReceiptHash(created) }],
        courseId: (created) => created.course_id,
      });
      return JSON.stringify(CREATE_SUB_GOAL_TOOL.output_schema.parse({
        id: goal.id, title: goal.title, parent_id: goal.parent_id, message: 'Sub-goal created successfully', receipt_id: receipt.id,
      }));
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
      const { result: deck, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_DECK_TOOL, input: args, verb: 'deck_created', summary: 'Created a deck',
        execute: (input) => createDeck(db, userId, input),
        resources: (created) => [{ kind: 'deck', id: created.id, outcome: 'created', state_hash: goalReceiptHash(created) }],
        courseId: (created) => created.course_id,
      });
      const course = db.prepare('SELECT name FROM courses WHERE id = ? AND user_id = ?')
        .get(deck.course_id, userId) as { name: string };
      return JSON.stringify(CREATE_DECK_TOOL.output_schema.parse({
        id: deck.id, name: deck.name, course_id: deck.course_id, course_name: course.name,
        message: 'Deck created successfully', receipt_id: receipt.id,
      }));
    }

    case 'list_sections': {
      const { deck_id: secDeckId } = args as { deck_id: string };
      const sections = db.prepare(
        'SELECT id, name, order_index FROM card_sections WHERE deck_id = ? AND user_id = ? ORDER BY order_index ASC, created_at ASC',
      ).all(secDeckId, userId);
      return JSON.stringify(sections);
    }

    case 'create_section': {
      const { result: section, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_SECTION_TOOL, input: args, verb: 'section_created', summary: 'Created a section',
        execute: (input) => createSection(db, userId, input),
        resources: (created) => [{ kind: 'section', id: created.id, outcome: 'created', state_hash: goalReceiptHash(created) }],
        courseId: (created) => (db.prepare('SELECT course_id FROM card_decks WHERE id = ? AND user_id = ?')
          .get(created.deck_id, userId) as { course_id: string }).course_id,
      });
      return JSON.stringify(CREATE_SECTION_TOOL.output_schema.parse({
        id: section.id, name: section.name, deck_id: section.deck_id, order_index: section.order_index,
        message: 'Section created successfully', receipt_id: receipt.id,
      }));
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
      const type = proposalTypeSchema.parse(args.type);
      if (!CHAT_PROPOSAL_TYPES.some((chatType) => chatType === type)) {
        throw new AppError(400, 'Proposal type is not available in chat');
      }
      if (context?.actor !== 'agent' || context.channel !== 'chat' || !context.conversationId?.trim()) {
        throw new AppError(400, 'Proposal creation context is required');
      }
      if (type === 'organized_note') {
        const input = createOrganizedNoteProposalSchema.parse(args.data);
        const proposal = await createOrganizedNoteProposal(db, userId, input, context);
        return JSON.stringify({
          id: proposal.id, type: proposal.type, status: proposal.status,
          course_id: proposal.data.course_id, blocks_count: proposal.data.blocks.length,
          message: 'Organized note proposal created. Review and apply it from the Proposals inbox (「提案」收件箱) in the Agent panel.',
        });
      }
      if (type === 'note_patch') {
        const proposal = createNotePatchProposal(db, userId, args.data, context);
        return JSON.stringify({ id: proposal.id, type, status: proposal.status, note_id: proposal.data.note_id,
          patches_count: proposal.data.patches.length, message: 'Note patch proposed. The human must review each diff and accept through the note text-save door; no note content was changed.' });
      }
      const data = args.data as Record<string, unknown>;

      // Defensive: if data is missing or items is empty, warn the Agent
      if (!data || typeof data !== 'object') {
        return JSON.stringify({ error: 'data must be an object with { title, description, items }' });
      }
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length === 0) {
        console.warn(`[create_proposal] WARNING: Agent created ${type} proposal with 0 items. Args:`, JSON.stringify(args).slice(0, 500));
        return JSON.stringify({ error: `Proposal has 0 items. You must include the actual items in data.items array. Do not call create_proposal with an empty items array.` });
      }

      const proposal = createProposal(db, userId, { type, data, context });
      return JSON.stringify({ id: proposal.id, type, items_count: items.length, message: `Proposal created with ${items.length} items. The student can review and apply it from the proposals panel.` });
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
      return JSON.stringify(await searchMemories(userId, query, { category }));
    }

    case 'save_memory': {
      const { category, content } = args as { category: string; content: string };
      const id = saveMemory(userId, category, content);
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
        const blocks = db.prepare(
          'SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, start_time'
        ).all(userId, from_date, to_date) as any[];

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
        const blocks = db.prepare(
          'SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = ? AND date = ? ORDER BY start_time'
        ).all(userId, date) as any[];
        return JSON.stringify({ date, blocks, available_study_minutes: computeStudyMin(blocks) });
      }

      // Default: return blocks for next 14 days
      const today = new Date().toISOString().split('T')[0];
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const endDate = twoWeeks.toISOString().split('T')[0];
      const blocks = db.prepare(
        'SELECT id, label, type, date, start_time, end_time, color FROM time_blocks WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date, start_time'
      ).all(userId, today, endDate) as any[];
      return JSON.stringify({ from: today, to: endDate, blocks });
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
      const { result: created, receipt } = recordAgentAction(db, userId, context, {
        tool: CREATE_TIME_BLOCKS_TOOL, input: args, verb: 'time_blocks_created', summary: 'Created time blocks',
        execute: (input) => createTimeBlocks(db, userId, input),
        resources: (rows) => rows.map((row) => ({ kind: 'time_block', id: row.id, outcome: 'created', state_hash: goalReceiptHash(row) })),
        courseId: () => null,
      });
      return JSON.stringify(CREATE_TIME_BLOCKS_TOOL.output_schema.parse({
        created, message: 'Created ' + created.length + ' time block(s)', receipt_id: receipt.id,
      }));
    }

    case 'update_time_block': {
      const { result: change, receipt } = recordAgentAction(db, userId, context, {
        tool: UPDATE_TIME_BLOCK_TOOL, input: args, verb: 'time_block_updated', summary: 'Updated a time block',
        execute: (input) => {
          const { block_id, ...patch } = input as { block_id: string } & Record<string, unknown>;
          return updateTimeBlock(db, userId, block_id, patch);
        },
        resources: (changed) => [{
          kind: 'time_block', id: changed.after.id, outcome: 'updated',
          state_hash: goalReceiptHash(changed.after), before: changed.before,
        }],
        courseId: () => null,
      });
      return JSON.stringify(UPDATE_TIME_BLOCK_TOOL.output_schema.parse({
        updated: change.after, message: 'Time block updated', receipt_id: receipt.id,
      }));
    }

    case 'delete_time_block': {
      return JSON.stringify(deleteTimeBlockWithAuthorization(db, userId, context, args));
    }

    case 'link_task_cards': {
      const { result: linked, receipt } = recordAgentAction(db, userId, context, {
        tool: LINK_TASK_CARDS_TOOL, input: args, verb: 'task_cards_linked', summary: 'Linked cards to a task',
        execute: (input) => {
          const data = input as { task_id: string; links: { card_id: string; checklist_index?: number | null }[] };
          return data.links.map((link) => linkTaskCard(db, userId, data.task_id, link));
        },
        resources: (rows) => rows.map((row) => ({ kind: 'task_card', id: row.id, outcome: 'linked', state_hash: goalReceiptHash(row) })),
        courseId: (rows) => (db.prepare('SELECT course_id FROM tasks WHERE id = ? AND user_id = ?')
          .get(rows[0].task_id, userId) as { course_id: string }).course_id,
      });
      return JSON.stringify(LINK_TASK_CARDS_TOOL.output_schema.parse({
        task_id: linked[0].task_id, created: linked.length, links: linked,
        message: 'Linked ' + linked.length + ' card(s) to task', receipt_id: receipt.id,
      }));
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}
