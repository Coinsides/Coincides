import type { ToolDefinition } from '../providers/types.js';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: 'list_courses',
    description: "List the student's courses with IDs, names, codes, and colors.",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_tasks',
    description: 'Get tasks filtered by date range, course, or status.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Specific date (YYYY-MM-DD)' },
        from_date: { type: 'string', description: 'Start of date range (YYYY-MM-DD)' },
        to_date: { type: 'string', description: 'End of date range (YYYY-MM-DD)' },
        course_id: { type: 'string', description: 'Filter by course ID' },
        status: { type: 'string', enum: ['pending', 'completed'], description: 'Filter by status' },
      },
      required: [],
    },
  },
  {
    name: 'create_task',
    description: 'Create a single task for the student. For recommended/optional tasks, use serves_must to annotate which Must task it supports.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        date: { type: 'string', description: 'Task date (YYYY-MM-DD)' },
        priority: { type: 'string', enum: ['must', 'recommended', 'optional'], description: 'Task priority' },
        course_id: { type: 'string', description: 'Course ID' },
        goal_id: { type: 'string', description: 'Optional goal ID' },
        description: { type: 'string', description: 'Brief task description' },
        start_time: { type: 'string', description: 'Start time (ISO 8601 datetime)' },
        end_time: { type: 'string', description: 'End time (ISO 8601 datetime)' },
        checklist: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, done: { type: 'boolean' } } }, description: 'Sub-steps checklist' },
        serves_must: { type: 'string', description: 'For recommended/optional: which Must task this serves' },
      },
      required: ['title', 'date', 'priority', 'course_id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to complete' },
      },
      required: ['task_id'],
    },
  },
  {
    name: 'list_goals',
    description: "List the student's goals, optionally filtered by course. Use include_hierarchy=true to get full tree with children and tasks.",
    parameters: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Filter by course ID' },
        include_hierarchy: { type: 'boolean', description: 'If true, return goals with their sub-goals (children) and associated tasks' },
      },
      required: [],
    },
  },
  {
    name: 'create_goal',
    description: 'Create a new goal for a course.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title' },
        course_id: { type: 'string', description: 'Course ID' },
        deadline: { type: 'string', description: 'Optional deadline (YYYY-MM-DD)' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['title', 'course_id'],
    },
  },
  {
    name: 'create_sub_goal',
    description: 'Create a sub-goal under an existing goal. Inherits course_id from parent if not specified.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Sub-goal title' },
        parent_id: { type: 'string', description: 'Parent goal ID' },
        course_id: { type: 'string', description: 'Course ID (optional, inherited from parent)' },
        deadline: { type: 'string', description: 'Optional deadline (YYYY-MM-DD)' },
        description: { type: 'string', description: 'Optional description' },
      },
      required: ['title', 'parent_id'],
    },
  },
  {
    name: 'list_decks',
    description: "List the student's card decks, optionally filtered by course.",
    parameters: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Filter by course ID' },
      },
      required: [],
    },
  },
  {
    name: 'list_cards',
    description: 'List cards in a deck with optional filters.',
    parameters: {
      type: 'object',
      properties: {
        deck_id: { type: 'string', description: 'Deck ID' },
        template_type: { type: 'string', enum: ['definition', 'theorem', 'formula', 'general'], description: 'Filter by template type' },
        search: { type: 'string', description: 'Search keyword in title' },
      },
      required: ['deck_id'],
    },
  },
  {
    name: 'create_card',
    description: 'Create a single flashcard in a deck.',
    parameters: {
      type: 'object',
      properties: {
        deck_id: { type: 'string', description: 'Deck ID' },
        template_type: { type: 'string', enum: ['definition', 'theorem', 'formula', 'general'], description: 'Card template type' },
        title: { type: 'string', description: 'Card title (front)' },
        content: { type: 'object', description: 'Card content object. MUST match template_type: definition→{definition,example?,notes?}, theorem→{statement,conditions?,proof_sketch?,notes?}, formula→{formula,variables?,applicable_conditions?,notes?}, general→{body,notes?}' },
        importance: { type: 'number', description: 'Importance 1-5, default 3' },
        tag_ids: { type: 'array', items: { type: 'string' }, description: 'Tag IDs to attach' },
      },
      required: ['deck_id', 'template_type', 'title', 'content'],
    },
  },
  {
    name: 'get_review_due',
    description: 'Get the count and list of cards due for review.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD), defaults to today' },
      },
      required: [],
    },
  },
  {
    name: 'get_daily_brief',
    description: "Get today's daily brief with tasks organized by priority.",
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date (YYYY-MM-DD), defaults to today' },
      },
      required: [],
    },
  },
  {
    name: 'create_proposal',
    description: 'Create a proposal for the student to review and approve before applying. Use for batch cards, study plans, goal breakdowns, or schedule adjustments.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['batch_cards', 'study_plan', 'goal_breakdown', 'schedule_adjustment'],
          description: 'Proposal type: batch_cards (flashcards), study_plan (daily tasks with scheduled_date), goal_breakdown (big goal → sub-goals + tasks), schedule_adjustment (modify existing tasks)',
        },
        data: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Proposal title' },
            description: { type: 'string', description: 'Brief description of what this proposal does. NEVER include time estimates.' },
            items: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of items to create/modify. For study_plan: each item should include { title, course_id, priority, goal_id, scheduled_date (YYYY-MM-DD), description, serves_must }. The scheduled_date determines which day the task lands on in the calendar. For batch_cards: card drafts. For schedule_adjustment: { task_id, date, priority, status }.',
            },
          },
          required: ['title', 'description', 'items'],
        },
      },
      required: ['type', 'data'],
    },
  },
  {
    name: 'get_study_templates',
    description: 'Get available study mode templates. Show these to the student when they ask for help creating a study plan, so they can choose their preferred learning approach.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_statistics_overview',
    description: "Get the student's learning statistics: streak, task completion rates, review counts.",
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'suggest_next_topics',
    description: "Based on the student's current courses, completed tasks, and cards, suggest what they should study next. Use your reasoning to identify gaps and logical next steps.",
    parameters: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Focus on a specific course' },
      },
      required: [],
    },
  },
  {
    name: 'generate_weekly_review',
    description: "Generate a weekly review summary: what was accomplished, what fell behind, and suggested focus for next week.",
    parameters: {
      type: 'object',
      properties: {
        week_offset: { type: 'number', description: '0 = this week (default), -1 = last week' },
      },
      required: [],
    },
  },
  {
    name: 'search_memories',
    description: 'Search long-term memories about the student using semantic similarity. Finds memories related to the query even without exact keyword matches. Results include similarity scores when semantic search is available.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        category: { type: 'string', enum: ['preference', 'course_context', 'decision', 'general'], description: 'Filter by category' },
      },
      required: ['query'],
    },
  },
  {
    name: 'save_memory',
    description: 'Save an important piece of information about the student to long-term memory.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['preference', 'course_context', 'decision', 'general'], description: 'Memory category' },
        content: { type: 'string', description: 'Memory content' },
      },
      required: ['category', 'content'],
    },
  },
  {
    name: 'get_time_blocks',
    description: "Get the student's time block schedule. Returns weekly template blocks and/or resolved blocks for a date range, plus available study minutes per day. Use this before scheduling tasks to understand the student's time structure.",
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Specific date to get resolved blocks for (YYYY-MM-DD). Returns that day\'s blocks with overrides applied.' },
        week_of: { type: 'string', description: 'Get resolved blocks for the entire week containing this date (YYYY-MM-DD). Returns 7 days of data.' },
        templates_only: { type: 'boolean', description: 'If true, return only the weekly template blocks (no date-specific resolution). Default false.' },
      },
      required: [],
    },
  },
  {
    name: 'get_goal_dependencies',
    description: "Get dependency information for goals. Returns which goals depend on which, and the full dependency chain. Use this before scheduling to respect prerequisite ordering.",
    parameters: {
      type: 'object',
      properties: {
        goal_id: { type: 'string', description: 'Get dependencies for a specific goal' },
        course_id: { type: 'string', description: 'Get all dependencies for goals in a course' },
        include_chain: { type: 'boolean', description: 'If true, return the full recursive dependency chain (A→B→C). Default false.' },
      },
      required: [],
    },
  },
  {
    name: 'search_documents',
    description: 'Search uploaded documents using semantic similarity and keyword matching. Returns matching documents with relevant content snippets from the most similar passages. For simple questions, the snippets may contain enough context to answer directly without calling get_document_content.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query. Semantic search finds related content even without exact keyword matches.' },
        course_id: { type: 'string', description: 'Optional: filter by course ID' },
        file_type: { type: 'string', enum: ['pdf', 'docx', 'xlsx', 'image', 'txt', 'md'], description: 'Optional: filter by file type' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_document_content',
    description: 'Get the text content of a document. For short documents, returns the full extracted text. For long chunked documents, returns chunks. Use chunk_index to paginate through long documents.',
    parameters: {
      type: 'object',
      properties: {
        document_id: { type: 'string', description: 'Document ID (from search_documents results)' },
        chunk_index: { type: 'number', description: 'Optional: specific chunk index to retrieve (0-based). If omitted for a chunked document, returns the first 3 chunks.' },
        include_all_chunks: { type: 'boolean', description: 'If true, return ALL chunks (caution: may be very large). Default false.' },
      },
      required: ['document_id'],
    },
  },
];
