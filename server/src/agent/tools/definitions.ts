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
    description: 'Create a single task for the student.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title' },
        date: { type: 'string', description: 'Task date (YYYY-MM-DD)' },
        priority: { type: 'string', enum: ['must', 'recommended', 'optional'], description: 'Task priority' },
        course_id: { type: 'string', description: 'Course ID' },
        goal_id: { type: 'string', description: 'Optional goal ID' },
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
    description: "List the student's goals, optionally filtered by course.",
    parameters: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Filter by course ID' },
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
        content: { type: 'object', description: 'Card content object (template-specific fields)' },
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
    description: 'Create a proposal for the student to review and approve before applying. Use this for batch card creation, study plans, or schedule adjustments.',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['batch_cards', 'study_plan', 'schedule_adjustment'],
          description: 'Proposal type',
        },
        data: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Proposal title' },
            description: { type: 'string', description: 'Brief description of what this proposal does' },
            items: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of items to create/modify. For batch_cards: card drafts. For study_plan: task drafts. For schedule_adjustment: task modifications.',
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
    description: 'Search long-term memories about the student for relevant context.',
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
];
