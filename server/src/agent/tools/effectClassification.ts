import { AGENT_ACTION_TOOLS, AGENT_READ_TOOLS, AGENT_UI_TOOLS } from '../../toolFace/registry.js';

// Authority: HQ's 2026-09-14 claim-receipt order and second resumption ruling.
// These are effect classes, not admission rules. Never copy the registered lists.
export const DOOR_WRITE_TOOLS: ReadonlySet<string> = new Set(AGENT_ACTION_TOOLS.map(tool => tool.name));
// C4a supplement 1 admits only these two presentation verbs to the channel class.
export const CHANNEL_WRITE_TOOLS: ReadonlySet<string> = new Set(['save_memory', 'create_proposal',
  ...AGENT_UI_TOOLS.map(tool => tool.name)]);
export const READ_TOOLS: ReadonlySet<string> = new Set([
  ...AGENT_READ_TOOLS.map(tool => tool.name),
  'list_courses', 'get_tasks', 'list_goals', 'list_decks', 'list_sections', 'list_cards',
  'get_review_due', 'get_daily_brief', 'get_study_templates', 'get_statistics_overview',
  'suggest_next_topics', 'generate_weekly_review', 'search_memories', 'get_time_blocks',
  'get_goal_dependencies', 'search_documents', 'get_document_content',
  // Only returns a form marker; submitting the form is a separate user message.
  'collect_preferences',
]);

export type ToolEffect = 'door_write' | 'channel_write' | 'read';

export function classifyToolEffect(name: string): ToolEffect | undefined {
  if (DOOR_WRITE_TOOLS.has(name)) return 'door_write';
  if (CHANNEL_WRITE_TOOLS.has(name)) return 'channel_write';
  if (READ_TOOLS.has(name)) return 'read';
  return undefined;
}

/** Called with the actual provider-facing toolDefinitions by the wiring test. */
export function assertToolEffectCoverage(definitions: ReadonlyArray<{ name: string }>): void {
  const exposed = definitions.map(tool => tool.name);
  const classified = [...DOOR_WRITE_TOOLS, ...CHANNEL_WRITE_TOOLS, ...READ_TOOLS];
  const duplicates = (names: string[]) => names.filter((name, index) => names.indexOf(name) !== index);
  const missing = exposed.filter(name => !classifyToolEffect(name));
  const stale = classified.filter(name => !exposed.includes(name));
  const overlapping = duplicates(classified);
  const duplicateDefinitions = duplicates(exposed);
  if (missing.length || stale.length || overlapping.length || duplicateDefinitions.length) {
    throw new Error(`Tool effect coverage failed: ${JSON.stringify({ missing, stale, overlapping, duplicateDefinitions })}`);
  }
}
