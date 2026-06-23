import type { TextUnitWritingRole } from './runtimeDataTypes';

export type CommandSurfaceKind =
  | 'text_selection'
  | 'annotation_range_preview'
  | 'annotation_highlight'
  | 'annotation_badge'
  | 'text_unit_handle'
  | 'block_shell';

export type CommandItemKind = 'item' | 'submenu' | 'separator';

export type CommandActionId =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'label'
  | 'turn_into_heading'
  | 'turn_into_quote'
  | 'turn_into_bullet'
  | 'turn_into_numbered'
  | 'turn_into_todo'
  | 'turn_into_toggle'
  | 'turn_into_paragraph'
  | 'inline_formula'
  | 'inline_code'
  | 'link'
  | 'add_selection_to_content_group'
  | 'open_content_groups'
  | 'add_label_to_content_group'
  | 'add_block_to_content_group'
  | 'open_label'
  | 'change_label_color'
  | 'hide_label'
  | 'remove_label_from_range'
  | 'label_text_unit'
  | 'split_block_from_unit'
  | 'extract_unit_to_block'
  | 'duplicate_unit'
  | 'delete_unit'
  | 'save_block'
  | 'label_block'
  | 'toggle_block_export'
  | 'toggle_block_ai_visibility'
  | 'trash_block';

export interface CommandMenuItem {
  id: string;
  kind: CommandItemKind;
  label?: string;
  actionId?: CommandActionId;
  iconName?: string;
  disabled?: boolean;
  disabledReason?: string;
  checked?: boolean;
  children?: CommandMenuItem[];
}

export interface CommandSurfaceMenu {
  id: string;
  kind: CommandSurfaceKind;
  point: {
    x: number;
    y: number;
  };
  title?: string;
  items: CommandMenuItem[];
}

export const WRITING_ROLE_BY_COMMAND: Partial<Record<CommandActionId, TextUnitWritingRole>> = {
  turn_into_paragraph: 'paragraph',
  turn_into_heading: 'heading',
  turn_into_quote: 'quote',
  turn_into_bullet: 'bullet_item',
  turn_into_numbered: 'numbered_item',
  turn_into_todo: 'todo_item',
  turn_into_toggle: 'toggle_item',
};

const reservedInlineCommands: CommandMenuItem[] = [
  {
    id: 'inline-formula',
    kind: 'item',
    label: 'Formula',
    actionId: 'inline_formula',
    iconName: 'sigma',
    disabled: true,
    disabledReason: 'Inline formula rendering is reserved for a later TextFlow pass.',
  },
  {
    id: 'inline-code',
    kind: 'item',
    label: 'Code',
    actionId: 'inline_code',
    iconName: 'code',
    disabled: true,
    disabledReason: 'Inline code rendering is reserved for a later TextFlow pass.',
  },
];

const textTurnIntoCommands: CommandMenuItem[] = [
  { id: 'turn-into-heading', kind: 'item', label: 'Heading', actionId: 'turn_into_heading', iconName: 'heading' },
  { id: 'turn-into-quote', kind: 'item', label: 'Quote', actionId: 'turn_into_quote', iconName: 'quote' },
  { id: 'turn-into-bullet', kind: 'item', label: 'Bullet list', actionId: 'turn_into_bullet', iconName: 'list' },
  { id: 'turn-into-numbered', kind: 'item', label: 'Numbered list', actionId: 'turn_into_numbered', iconName: 'list-ordered' },
  { id: 'turn-into-todo', kind: 'item', label: 'To-do list', actionId: 'turn_into_todo', iconName: 'list-checks' },
  { id: 'turn-into-toggle', kind: 'item', label: 'Toggle list', actionId: 'turn_into_toggle', iconName: 'list-collapse' },
];

export function buildTextSelectionMenu(): CommandMenuItem[] {
  return [
    { id: 'copy', kind: 'item', label: 'Copy', actionId: 'copy', iconName: 'copy' },
    {
      id: 'cut',
      kind: 'item',
      label: 'Cut',
      actionId: 'cut',
      iconName: 'scissors',
      disabled: true,
      disabledReason: 'Custom multi-range cut needs the later TextFlow editing pass.',
    },
    {
      id: 'paste',
      kind: 'item',
      label: 'Paste',
      actionId: 'paste',
      iconName: 'clipboard',
      disabled: true,
      disabledReason: 'Custom paste routing needs the later TextFlow editing pass.',
    },
    { id: 'separator-basic-label', kind: 'separator' },
    {
      id: 'label',
      kind: 'item',
      label: 'Label',
      actionId: 'label',
      iconName: 'tag',
    },
    {
      id: 'turn-into',
      kind: 'submenu',
      label: 'Turn into',
      iconName: 'replace',
      children: textTurnIntoCommands,
    },
    {
      id: 'inline',
      kind: 'submenu',
      label: 'Inline',
      iconName: 'braces',
      children: reservedInlineCommands,
    },
    {
      id: 'link',
      kind: 'item',
      label: 'Link',
      actionId: 'link',
      iconName: 'link',
      disabled: true,
      disabledReason: 'Link editing is reserved for a later TextFlow pass.',
    },
    { id: 'separator-content-group', kind: 'separator' },
    {
      id: 'add-selection-to-content-group',
      kind: 'item',
      label: 'Create group',
      actionId: 'add_selection_to_content_group',
      iconName: 'boxes',
    },
    {
      id: 'open-content-groups',
      kind: 'item',
      label: 'Open groups',
      actionId: 'open_content_groups',
      iconName: 'folder-open',
    },
  ];
}

export function buildAnnotationRangePreviewMenu(): CommandMenuItem[] {
  return buildTextSelectionMenu().filter((item) => (
    item.id !== 'turn-into'
  ));
}

export function buildAnnotationHighlightMenu(): CommandMenuItem[] {
  return [
    { id: 'open-label', kind: 'item', label: 'Open label', actionId: 'open_label', iconName: 'panel-right-open' },
    { id: 'add-label-to-content-group', kind: 'item', label: 'Create group from label', actionId: 'add_label_to_content_group', iconName: 'boxes' },
    {
      id: 'change-label-color',
      kind: 'item',
      label: 'Change color',
      actionId: 'change_label_color',
      iconName: 'palette',
      disabled: true,
      disabledReason: 'Use the Annotation Stack color palette in this version.',
    },
    { id: 'hide-label', kind: 'item', label: 'Hide label', actionId: 'hide_label', iconName: 'eye-off' },
    {
      id: 'remove-label-from-range',
      kind: 'item',
      label: 'Remove label from this range',
      actionId: 'remove_label_from_range',
      iconName: 'eraser',
      disabled: true,
      disabledReason: 'Range-level removal needs multi-range disambiguation.',
    },
    { id: 'copy-highlight', kind: 'item', label: 'Copy', actionId: 'copy', iconName: 'copy' },
  ];
}

export function buildTextUnitHandleMenu(): CommandMenuItem[] {
  return [
    {
      id: 'turn-into-unit',
      kind: 'submenu',
      label: 'Turn into',
      iconName: 'replace',
      children: [
        { id: 'turn-into-paragraph', kind: 'item', label: 'Text', actionId: 'turn_into_paragraph', iconName: 'pilcrow' },
        ...textTurnIntoCommands,
      ],
    },
    { id: 'label-text-unit', kind: 'item', label: 'Label this unit', actionId: 'label_text_unit', iconName: 'tag' },
    { id: 'separator-text-unit-structure', kind: 'separator' },
    {
      id: 'split-block-from-unit',
      kind: 'item',
      label: 'Split block from here',
      actionId: 'split_block_from_unit',
      iconName: 'split',
      disabled: true,
      disabledReason: 'Block split is reserved for the later TextFlow structure pass.',
    },
    {
      id: 'extract-unit-to-block',
      kind: 'item',
      label: 'Extract to new block',
      actionId: 'extract_unit_to_block',
      iconName: 'move-up-right',
      disabled: true,
      disabledReason: 'Extraction is reserved for the later TextFlow structure pass.',
    },
    {
      id: 'duplicate-unit',
      kind: 'item',
      label: 'Duplicate unit',
      actionId: 'duplicate_unit',
      iconName: 'copy-plus',
      disabled: true,
      disabledReason: 'TextUnit duplication is reserved for the later editor pass.',
    },
    {
      id: 'delete-unit',
      kind: 'item',
      label: 'Delete unit',
      actionId: 'delete_unit',
      iconName: 'trash',
      disabled: true,
      disabledReason: 'TextUnit deletion needs undo and merge rules first.',
    },
  ];
}

export function buildBlockShellMenu(): CommandMenuItem[] {
  return [
    { id: 'save-block', kind: 'item', label: 'Save block', actionId: 'save_block', iconName: 'check' },
    { id: 'label-block', kind: 'item', label: 'Label block', actionId: 'label_block', iconName: 'tag' },
    { id: 'add-block-to-content-group', kind: 'item', label: 'Create group from block', actionId: 'add_block_to_content_group', iconName: 'boxes' },
    { id: 'separator-block-visibility', kind: 'separator' },
    {
      id: 'toggle-block-export',
      kind: 'item',
      label: 'Toggle export',
      actionId: 'toggle_block_export',
      iconName: 'panel-right-open',
    },
    {
      id: 'toggle-block-ai-visibility',
      kind: 'item',
      label: 'Toggle AI visibility',
      actionId: 'toggle_block_ai_visibility',
      iconName: 'eye-off',
    },
    { id: 'separator-block-danger', kind: 'separator' },
    { id: 'trash-block', kind: 'item', label: 'Move to trash', actionId: 'trash_block', iconName: 'trash' },
  ];
}
