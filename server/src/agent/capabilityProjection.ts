import { toolDefinitions } from './tools/definitions.js';
import { AGENT_READ_TOOLS } from '../toolFace/registry.js';
import {
  assertToolEffectCoverage,
  CHANNEL_WRITE_TOOLS,
  DOOR_WRITE_TOOLS,
  READ_TOOLS,
} from './tools/effectClassification.js';

/** Read-only projection of the provider's actual tools; this grants no authority. */
export function projectAgentCapabilities() {
  assertToolEffectCoverage(toolDefinitions);
  const names = new Map(toolDefinitions.map(tool => [tool.name, tool.name]));
  const perception = new Set(AGENT_READ_TOOLS.map(tool => tool.name));
  const group = (effects: ReadonlySet<string>) =>
    toolDefinitions.filter(tool => effects.has(tool.name)).map(tool => tool.name).sort();
  return {
    doorWrite: group(DOOR_WRITE_TOOLS),
    channelWrite: group(CHANNEL_WRITE_TOOLS),
    read: group(READ_TOOLS),
    // Preserve the existing perception surface, not an additional all-tools
    // directory. Membership comes from the registry, never the usage copy below.
    perceptionReaders: toolDefinitions.filter(tool => perception.has(tool.name) && READ_TOOLS.has(tool.name)),
    // Workflow references retain their handwritten meaning, but never emit a
    // retired/missing name as if the provider still exposes that capability.
    name(reference: string): string {
      const name = names.get(reference);
      if (!name) throw new Error(`Agent prompt references an unavailable tool: ${reference}`);
      return name;
    },
  };
}

// Handwritten operating instructions, not a membership list. New registered
// readers get their authoritative description even before bespoke copy exists.
const perceptionUsage: Readonly<Record<string, string>> = {
  read_note: 'for note text one page at a time; follow next_page_index when provided.',
  read_board: 'for board members, links and geometry without screenshots.',
  read_content_groups: 'for group membership and text previews within a course or note.',
  read_annotations_relations: 'for annotations and Item Relation judgments/receipts in the requested scope.',
};

export function renderPerceptionTools(readers: ReadonlyArray<{ name: string; description: string }>): string {
  return readers.map(tool => `- Use ${tool.name} ${perceptionUsage[tool.name] ?? `— ${tool.description}`}`).join('\n');
}

export function renderDoorWriteTools(names: readonly string[]): string {
  return `门内写动词: ${names.join(', ')}. `;
}

export function renderChannelWriteTools(names: readonly string[]): string {
  return `信道写: ${names.join(', ')}.`;
}
