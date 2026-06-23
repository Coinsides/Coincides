import type { TemplateOption } from '@/services/templateOptions';
import type { TextUnitWritingRole } from './canvasEngine/runtimeDataTypes';

export type SlashCommandGroup = 'default' | 'math' | 'userDefined';
export type SlashCommandKind = 'create_block' | 'convert_block' | 'insert_structure' | 'inline_action' | 'annotation_action';
export type SlashCommandObjectKind =
  | 'text_block'
  | 'structured_block'
  | 'writing_role'
  | 'inline_structure'
  | 'annotation'
  | 'navigation'
  | 'future';

export interface NoteSlashCommand {
  id: string;
  label: string;
  group: SlashCommandGroup;
  description: string;
  templateKey?: string;
  commandKind: SlashCommandKind;
  objectKind: SlashCommandObjectKind;
  writingRole?: TextUnitWritingRole;
  annotationAction?: 'create_annotation';
  annotationLabel?: string;
  requiresSelection?: boolean;
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
    commandKind: 'create_block',
    objectKind: 'text_block',
    writingRole: 'paragraph',
    keywords: ['paragraph', 'text', 'body'],
  },
  {
    id: 'heading',
    label: 'Heading',
    group: 'default',
    description: 'Section heading.',
    commandKind: 'convert_block',
    objectKind: 'writing_role',
    writingRole: 'heading',
    keywords: ['title', 'section', 'h1', 'h2'],
  },
  {
    id: 'bullet-list',
    label: 'Bullet List',
    group: 'default',
    description: 'Future TextUnit bullet writing role.',
    commandKind: 'insert_structure',
    objectKind: 'writing_role',
    writingRole: 'bullet_item',
    keywords: ['bullet', 'list', 'ul'],
  },
  {
    id: 'numbered-list',
    label: 'Numbered List',
    group: 'default',
    description: 'Future TextUnit numbered writing role.',
    commandKind: 'insert_structure',
    objectKind: 'writing_role',
    writingRole: 'numbered_item',
    keywords: ['numbered', 'ordered', 'list', 'ol'],
  },
  {
    id: 'todo-list',
    label: 'Todo List',
    group: 'default',
    description: 'Future TextUnit todo writing role.',
    commandKind: 'insert_structure',
    objectKind: 'writing_role',
    writingRole: 'todo_item',
    keywords: ['todo', 'task', 'check'],
  },
  {
    id: 'toggle-list',
    label: 'Toggle List',
    group: 'default',
    description: 'Future TextUnit toggle writing role.',
    commandKind: 'insert_structure',
    objectKind: 'writing_role',
    writingRole: 'toggle_item',
    keywords: ['toggle', 'collapse', 'disclosure'],
  },
  {
    id: 'source-quote',
    label: 'Source Quote',
    group: 'default',
    description: 'Quoted or source-like text.',
    commandKind: 'convert_block',
    objectKind: 'writing_role',
    writingRole: 'quote',
    keywords: ['source', 'excerpt', 'citation'],
  },
  {
    id: 'definition',
    label: 'Definition',
    group: 'default',
    description: 'Mark selected text as a definition annotation.',
    commandKind: 'annotation_action',
    objectKind: 'annotation',
    annotationAction: 'create_annotation',
    annotationLabel: 'definition',
    requiresSelection: true,
    keywords: ['define', 'concept', 'meaning'],
  },
  {
    id: 'formula',
    label: 'Formula',
    group: 'math',
    description: 'LaTeX formula block.',
    templateKey: 'formula.math',
    commandKind: 'create_block',
    objectKind: 'structured_block',
    keywords: ['math', 'latex', 'equation'],
  },
  {
    id: 'inline-formula',
    label: 'Inline Formula',
    group: 'math',
    description: 'Future selected-text inline formula action.',
    commandKind: 'inline_action',
    objectKind: 'inline_structure',
    keywords: ['inline', 'math', 'latex', 'equation'],
    disabledReason: 'Inline formula is reserved for the inline structure pass.',
  },
  {
    id: 'code',
    label: 'Code',
    group: 'default',
    description: 'Code block.',
    templateKey: 'code.snippet',
    commandKind: 'create_block',
    objectKind: 'structured_block',
    writingRole: 'code_line',
    keywords: ['snippet', 'programming'],
  },
  {
    id: 'divider',
    label: 'Divider',
    group: 'default',
    description: 'Future lightweight divider structure.',
    commandKind: 'insert_structure',
    objectKind: 'future',
    keywords: ['line', 'separator', 'break'],
    disabledReason: 'Divider is reserved for the TextUnit/editor polish pass.',
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
  if (!command.templateKey) return null;
  return templateOptions.find((template) => template.template_key === command.templateKey)
    || templateOptions.find((template) => template.template_id === command.templateKey)
    || null;
}

export function removeSlashTrigger(text: string, trigger: SlashTrigger): string {
  return `${text.slice(0, trigger.start)}${text.slice(trigger.end)}`.trimEnd();
}
