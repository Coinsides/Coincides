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
  // NOTE: create_task has been REMOVED from Agent tools.
  // Tasks MUST be created via create_proposal (study_plan / goal_breakdown).
  // The proposal apply route handles actual task insertion.
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
    name: 'create_deck',
    description: 'Create a new card deck for a course. Use this when the student needs cards but no suitable deck exists. Returns the new deck ID.',
    parameters: {
      type: 'object',
      properties: {
        course_id: { type: 'string', description: 'Course ID this deck belongs to' },
        name: { type: 'string', description: 'Deck name (e.g., "Chapter 5 Review", "Midterm Formulas")' },
        description: { type: 'string', description: 'Optional deck description' },
      },
      required: ['course_id', 'name'],
    },
  },
  {
    name: 'list_sections',
    description: 'List sections in a deck. Sections organize cards by chapter/topic within a deck.',
    parameters: {
      type: 'object',
      properties: {
        deck_id: { type: 'string', description: 'Deck ID' },
      },
      required: ['deck_id'],
    },
  },
  {
    name: 'create_section',
    description: 'Create a new section within a deck. Use to organize cards by chapter, topic, or module. Returns the new section ID.',
    parameters: {
      type: 'object',
      properties: {
        deck_id: { type: 'string', description: 'Deck ID this section belongs to' },
        name: { type: 'string', description: 'Section name (e.g., "Chapter 3: Vectors", "Week 5: Integration")' },
        order_index: { type: 'number', description: 'Position in section list (0-based). Higher = further down.' },
      },
      required: ['deck_id', 'name'],
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
  // NOTE: create_card has been REMOVED from Agent tools.
  // Cards MUST be created via create_proposal (batch_cards).
  // The proposal apply route handles actual card insertion.
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
          enum: ['batch_cards', 'study_plan', 'goal_breakdown', 'schedule_adjustment', 'time_block_setup'],
          description: 'Proposal type: batch_cards (flashcards), study_plan (daily tasks with scheduled_date), goal_breakdown (big goal → sub-goals + tasks), schedule_adjustment (modify existing tasks), time_block_setup (create Time Blocks for days missing study blocks)',
        },
        data: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Proposal title' },
            description: { type: 'string', description: 'Brief description of what this proposal does. NEVER include time estimates.' },
            items: {
              type: 'array',
              items: { type: 'object' },
              description: 'Array of items to create/modify. For study_plan: each item should include { title, course_id, priority, goal_id, scheduled_date (YYYY-MM-DD), description, serves_must, time_block_id, checklist?: [{text: string, done: boolean}] }. The checklist MUST be an array of objects with "text" and "done" fields (NOT plain strings). For batch_cards: each item should include { deck_id, section_id, template_type, title, content }. For schedule_adjustment: { task_id, date, priority, status }. For time_block_setup: each item should include { label, date (YYYY-MM-DD), start_time (HH:MM), end_time (HH:MM), type ("study") }.',
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
    description: "Get the student's time block instances for specific dates. Time Blocks are now date-based instances (not weekly templates). Returns blocks for the requested date range plus available study minutes per day.",
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Specific date (YYYY-MM-DD). Returns that day\'s time block instances.' },
        from_date: { type: 'string', description: 'Start of date range (YYYY-MM-DD). Use with to_date.' },
        to_date: { type: 'string', description: 'End of date range (YYYY-MM-DD). Use with from_date.' },
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
  {
    name: 'collect_preferences',
    description: 'Send a structured preference form to the student before creating a study plan. The form appears as interactive cards in the chat. MUST be called before generating any study_plan or goal_breakdown proposal. The student\'s responses will be returned as a structured JSON message in the next conversation turn.',
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique question identifier (e.g., "scheduling_mode", "documents", "daily_limit")' },
              type: { type: 'string', enum: ['single_choice', 'multi_choice', 'number_input', 'document_select', 'date_picker'], description: 'Question type: single_choice (radio), multi_choice (checkboxes), number_input (numeric), document_select (pick from uploaded docs), date_picker (month calendar for selecting study dates — returns sorted string[] of YYYY-MM-DD)' },
              label: { type: 'string', description: 'Question text shown to the student' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    value: { type: 'string', description: 'Machine-readable value' },
                    label: { type: 'string', description: 'Display text' },
                    description: { type: 'string', description: 'Optional helper text' },
                  },
                },
                description: 'Choices for single_choice / multi_choice types',
              },
              default_value: { type: 'string', description: 'Pre-selected value' },
              required: { type: 'boolean', description: 'Whether the student must answer. Default true' },
              max_select: { type: 'number', description: 'Max selections for multi_choice / document_select. Default 3 for document_select' },
              documents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Document ID' },
                    filename: { type: 'string', description: 'File name' },
                    page_count: { type: 'number', description: 'Number of pages' },
                    summary: { type: 'string', description: 'Document summary' },
                    document_type: { type: 'string', description: 'Document type (notes, textbook, slides, etc.)' },
                  },
                },
                description: 'Available documents for document_select type. Get these from search_documents first.',
              },
              placeholder: { type: 'string', description: 'Placeholder text for number_input' },
              date_config: {
                type: 'object',
                properties: {
                  min_date: { type: 'string', description: 'Earliest selectable date (YYYY-MM-DD). Default: tomorrow.' },
                  max_date: { type: 'string', description: 'Latest selectable date (YYYY-MM-DD). Default: 90 days from today.' },
                },
                description: 'Configuration for date_picker type. Controls selectable date range.',
              },
            },
            required: ['id', 'type', 'label'],
          },
          description: 'Array of questions to present to the student',
        },
      },
      required: ['questions'],
    },
  },
  {
    name: 'create_time_blocks',
    description: 'Create one or more Time Block instances for specific dates. Time Blocks are now date-based (each instance belongs to a single date). Use when the student needs time blocks for specific dates that don\'t already have them.',
    parameters: {
      type: 'object',
      properties: {
        blocks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Block label (e.g., "Morning Study", "Lunch Break")' },
              type: { type: 'string', enum: ['study', 'rest', 'meal', 'exercise', 'custom'], description: 'Block type. Use "study" for study sessions.' },
              date: { type: 'string', description: 'Specific date (YYYY-MM-DD) for this time block instance' },
              start_time: { type: 'string', description: 'Start time in HH:MM format (e.g., "08:00")' },
              end_time: { type: 'string', description: 'End time in HH:MM format (e.g., "18:00")' },
              color: { type: 'string', description: 'Optional hex color (e.g., "#4CAF50")' },
            },
            required: ['label', 'type', 'date', 'start_time', 'end_time'],
          },
          description: 'Array of Time Block instances to create',
        },
      },
      required: ['blocks'],
    },
  },
  {
    name: 'update_time_block',
    description: 'Update an existing Time Block instance. Only affects this specific instance (date), not other days.',
    parameters: {
      type: 'object',
      properties: {
        block_id: { type: 'string', description: 'Time Block instance ID to update' },
        label: { type: 'string', description: 'New label' },
        type: { type: 'string', enum: ['study', 'rest', 'meal', 'exercise', 'custom'], description: 'New type' },
        start_time: { type: 'string', description: 'New start time (HH:MM)' },
        end_time: { type: 'string', description: 'New end time (HH:MM)' },
        color: { type: 'string', description: 'New color' },
      },
      required: ['block_id'],
    },
  },
  {
    name: 'delete_time_block',
    description: 'Delete a Time Block instance. Only removes this specific instance (date), not other days.',
    parameters: {
      type: 'object',
      properties: {
        block_id: { type: 'string', description: 'Time Block instance ID to delete' },
      },
      required: ['block_id'],
    },
  },
  {
    name: 'link_task_cards',
    description: 'Batch-create Task-Card associations. Links cards to a task, optionally at the checklist-item level. Use after creating tasks and cards to establish knowledge relationships.',
    parameters: {
      type: 'object',
      properties: {
        task_id: { type: 'string', description: 'Task ID to link cards to' },
        links: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              card_id: { type: 'string', description: 'Card ID to link' },
              checklist_index: { type: 'integer', description: 'Index of the checklist item this card relates to (0-based). Omit for task-level association.' },
            },
            required: ['card_id'],
          },
          description: 'Array of card links to create',
        },
      },
      required: ['task_id', 'links'],
    },
  },
];
