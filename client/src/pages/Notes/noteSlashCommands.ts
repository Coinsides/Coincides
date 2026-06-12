import type { TemplateOption } from '@/services/templateOptions';

export type SlashCommandGroup = 'default' | 'math' | 'userDefined';

export interface NoteSlashCommand {
  id: string;
  label: string;
  group: SlashCommandGroup;
  description: string;
  templateKey: string;
  keywords: string[];
  disabledReason?: string;
}

export interface SlashTrigger {
  query: string;
  start: number;
  end: number;
}

export const NOTE_SLASH_COMMANDS: NoteSlashCommand[] = [
  {
    id: 'text',
    label: 'Text',
    group: 'default',
    description: 'Plain paragraph block.',
    templateKey: 'text.paragraph',
    keywords: ['paragraph', 'text', 'body'],
  },
  {
    id: 'heading',
    label: 'Heading',
    group: 'default',
    description: 'Section heading.',
    templateKey: 'text.heading',
    keywords: ['title', 'section', 'h1', 'h2'],
  },
  {
    id: 'source-quote',
    label: 'Source Quote',
    group: 'default',
    description: 'Quoted or source-like text.',
    templateKey: 'source.quote',
    keywords: ['source', 'excerpt', 'citation'],
  },
  {
    id: 'definition',
    label: 'Definition',
    group: 'default',
    description: 'Structured definition seed.',
    templateKey: 'definition.basic',
    keywords: ['define', 'concept', 'meaning'],
  },
  {
    id: 'formula',
    label: 'Formula',
    group: 'math',
    description: 'LaTeX formula block.',
    templateKey: 'formula.math',
    keywords: ['math', 'latex', 'equation'],
  },
  {
    id: 'code',
    label: 'Code',
    group: 'default',
    description: 'Code snippet block.',
    templateKey: 'code.snippet',
    keywords: ['snippet', 'programming'],
  },
];

export const SLASH_COMMAND_GROUP_LABELS: Record<SlashCommandGroup, string> = {
  default: 'Default',
  math: 'Math',
  userDefined: 'User Defined',
};

export function detectSlashTrigger(text: string, caretPosition = text.length): SlashTrigger | null {
  const beforeCaret = text.slice(0, caretPosition);
  const match = beforeCaret.match(/(^|\s)\/([a-zA-Z]*)$/);
  if (!match || match.index === undefined) return null;
  const slashOffset = match[1]?.length || 0;
  const start = match.index + slashOffset;
  return {
    query: match[2] || '',
    start,
    end: caretPosition,
  };
}

export function filterSlashCommands(query: string): NoteSlashCommand[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return NOTE_SLASH_COMMANDS;
  return NOTE_SLASH_COMMANDS.filter((command) => (
    command.id.includes(normalized)
    || command.label.toLowerCase().includes(normalized)
    || command.keywords.some((keyword) => keyword.includes(normalized))
  ));
}

export function findTemplateForCommand(
  command: NoteSlashCommand,
  templateOptions: TemplateOption[],
): TemplateOption | null {
  return templateOptions.find((template) => template.template_key === command.templateKey)
    || templateOptions.find((template) => template.template_id === command.templateKey)
    || null;
}

export function removeSlashTrigger(text: string, trigger: SlashTrigger): string {
  return `${text.slice(0, trigger.start)}${text.slice(trigger.end)}`.trimEnd();
}
