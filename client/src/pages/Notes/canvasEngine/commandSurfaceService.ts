import type { TextUnitWritingRole } from './runtimeDataTypes';

export type CommandSurfaceKind =
  | 'text_selection'
  | 'annotation_range_preview'
  | 'annotation_highlight'
  | 'annotation_badge'
  | 'text_unit_handle'
  | 'block_shell'
  | 'canvas_blank'
  | 'page_frame_shell';

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
  | 'turn_unit_into_code_line'
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
  | 'trash_block'
  | 'create_page_frame'
  | 'create_page_stack'
  | 'create_shape_rectangle'
  | 'create_shape_ellipse'
  | 'create_sticky_note'
  | 'create_image_object'
  | 'create_table_object'
  | 'add_shape_text'
  | 'edit_shape_text'
  | 'remove_shape_text'
  | 'set_shape_style_default'
  | 'set_shape_style_sticky'
  | 'inspect_canvas_object'
  | 'open_original'
  | 'duplicate_canvas_object'
  | 'toggle_export_visibility'
  | 'start_visual_connector_from_object'
  | 'finish_visual_connector_to_object'
  | 'edit_image_caption'
  | 'edit_image_alt_text'
  | 'toggle_image_fit'
  | 'add_table_row_below'
  | 'add_table_column_right'
  | 'delete_table_row'
  | 'delete_table_column'
  | 'delete_canvas_object'
  | 'add_page_below'
  | 'detach_page_from_stack'
  | 'toggle_page_stack_collapse'
  | 'duplicate_page_frame'
  | 'set_primary_page_frame'
  | 'delete_page_frame';

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

export interface ObjectContextActionAvailability {
  openOriginal?: {
    enabled: boolean;
    disabledReason?: string;
  };
  duplicate?: {
    enabled: boolean;
    disabledReason?: string;
  };
  exportVisibility?: {
    label?: string;
    enabled: boolean;
    disabledReason?: string;
  };
}

function buildObjectContextActionItems(
  objectActions?: ObjectContextActionAvailability,
): CommandMenuItem[] {
  return [
    {
      id: 'inspect-canvas-object',
      kind: 'item',
      label: 'Inspect object',
      actionId: 'inspect_canvas_object',
      iconName: 'info',
    },
    {
      id: 'open-original',
      kind: 'item',
      label: 'Open original',
      actionId: 'open_original',
      iconName: 'external-link',
      disabled: objectActions?.openOriginal ? !objectActions.openOriginal.enabled : true,
      disabledReason: objectActions?.openOriginal?.disabledReason || 'Only note-block-backed objects have an original block.',
    },
    {
      id: 'duplicate-canvas-object',
      kind: 'item',
      label: 'Duplicate object',
      actionId: 'duplicate_canvas_object',
      iconName: 'copy',
      disabled: objectActions?.duplicate ? !objectActions.duplicate.enabled : true,
      disabledReason: objectActions?.duplicate?.disabledReason || 'This object kind is not safely duplicable yet.',
    },
    {
      id: 'toggle-export-visibility',
      kind: 'item',
      label: objectActions?.exportVisibility?.label || 'Toggle export visibility',
      actionId: 'toggle_export_visibility',
      iconName: 'eye-off',
      disabled: objectActions?.exportVisibility ? !objectActions.exportVisibility.enabled : true,
      disabledReason: objectActions?.exportVisibility?.disabledReason || 'Missing placement.',
    },
  ];
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
        { id: 'turn-unit-into-code-line', kind: 'item', label: 'Code line', actionId: 'turn_unit_into_code_line', iconName: 'code' },
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
      disabledReason: 'Drag the unit handle onto blank paper to extract it.',
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

export function buildCanvasBlankMenu(): CommandMenuItem[] {
  return [
    {
      id: 'create-page-stack',
      kind: 'item',
      label: 'New PageStack',
      actionId: 'create_page_stack',
      iconName: 'files',
    },
    { id: 'separator-canvas-shapes', kind: 'separator' },
    {
      id: 'create-shape-rectangle',
      kind: 'item',
      label: 'Rectangle',
      actionId: 'create_shape_rectangle',
      iconName: 'square',
    },
    {
      id: 'create-shape-ellipse',
      kind: 'item',
      label: 'Ellipse',
      actionId: 'create_shape_ellipse',
      iconName: 'circle',
    },
    {
      id: 'create-image-object',
      kind: 'item',
      label: 'Image',
      actionId: 'create_image_object',
      iconName: 'image',
    },
    {
      id: 'create-table-object',
      kind: 'item',
      label: 'Table',
      actionId: 'create_table_object',
      iconName: 'table',
    },
    {
      id: 'create-sticky-note',
      kind: 'item',
      label: 'Sticky note',
      actionId: 'create_sticky_note',
      iconName: 'sticky-note',
    },
  ];
}

export function buildTableObjectShellMenu({
  connectorDraftState = 'none',
  rowCount = 1,
  columnCount = 1,
  objectActions,
}: {
  connectorDraftState?: 'none' | 'same_object' | 'ready';
  rowCount?: number;
  columnCount?: number;
  objectActions?: ObjectContextActionAvailability;
} = {}): CommandMenuItem[] {
  return [
    ...buildObjectContextActionItems(objectActions),
    { id: 'separator-table-edit', kind: 'separator' },
    {
      id: 'add-table-row-below',
      kind: 'item',
      label: 'Add row below',
      actionId: 'add_table_row_below',
      iconName: 'table',
    },
    {
      id: 'add-table-column-right',
      kind: 'item',
      label: 'Add column right',
      actionId: 'add_table_column_right',
      iconName: 'table',
    },
    {
      id: 'delete-table-row',
      kind: 'item',
      label: 'Delete row',
      actionId: 'delete_table_row',
      iconName: 'trash',
      disabled: rowCount <= 1,
      disabledReason: 'A table needs at least one row.',
    },
    {
      id: 'delete-table-column',
      kind: 'item',
      label: 'Delete column',
      actionId: 'delete_table_column',
      iconName: 'trash',
      disabled: columnCount <= 1,
      disabledReason: 'A table needs at least one column.',
    },
    { id: 'separator-table-connector', kind: 'separator' },
    connectorDraftState === 'ready'
      ? {
        id: 'finish-visual-connector-to-table',
        kind: 'item',
        label: 'Connect to this object',
        actionId: 'finish_visual_connector_to_object',
        iconName: 'arrow-right',
      }
      : {
        id: 'start-visual-connector-from-table',
        kind: 'item',
        label: connectorDraftState === 'same_object' ? 'Connector start selected' : 'Start visual connector',
        actionId: 'start_visual_connector_from_object',
        iconName: 'arrow-right',
        disabled: connectorDraftState === 'same_object',
        disabledReason: 'Pick another object as the endpoint.',
      },
    { id: 'separator-table-delete', kind: 'separator' },
    {
      id: 'delete-canvas-object',
      kind: 'item',
      label: 'Delete object',
      actionId: 'delete_canvas_object',
      iconName: 'trash',
    },
  ];
}

export function buildImageObjectShellMenu({
  fit = 'contain',
  connectorDraftState = 'none',
  objectActions,
}: {
  fit?: 'contain' | 'cover';
  connectorDraftState?: 'none' | 'same_object' | 'ready';
  objectActions?: ObjectContextActionAvailability;
} = {}): CommandMenuItem[] {
  return [
    ...buildObjectContextActionItems(objectActions),
    { id: 'separator-image-edit', kind: 'separator' },
    {
      id: 'edit-image-caption',
      kind: 'item',
      label: 'Edit caption',
      actionId: 'edit_image_caption',
      iconName: 'type',
    },
    {
      id: 'edit-image-alt-text',
      kind: 'item',
      label: 'Edit alt text',
      actionId: 'edit_image_alt_text',
      iconName: 'image',
    },
    {
      id: 'toggle-image-fit',
      kind: 'item',
      label: fit === 'cover' ? 'Fit: contain' : 'Fit: cover',
      actionId: 'toggle_image_fit',
      iconName: 'maximize',
    },
    { id: 'separator-image-connector', kind: 'separator' },
    connectorDraftState === 'ready'
      ? {
        id: 'finish-visual-connector-to-image',
        kind: 'item',
        label: 'Connect to this object',
        actionId: 'finish_visual_connector_to_object',
        iconName: 'arrow-right',
      }
      : {
        id: 'start-visual-connector-from-image',
        kind: 'item',
        label: connectorDraftState === 'same_object' ? 'Connector start selected' : 'Start visual connector',
        actionId: 'start_visual_connector_from_object',
        iconName: 'arrow-right',
        disabled: connectorDraftState === 'same_object',
        disabledReason: 'Pick another object as the endpoint.',
      },
    { id: 'separator-image-delete', kind: 'separator' },
    {
      id: 'delete-canvas-object',
      kind: 'item',
      label: 'Delete object',
      actionId: 'delete_canvas_object',
      iconName: 'trash',
    },
  ];
}

export function buildCanvasObjectShellMenu({
  blockBacked = false,
  sticky = false,
  connectorDraftState = 'none',
  objectActions,
}: {
  blockBacked?: boolean;
  sticky?: boolean;
  connectorDraftState?: 'none' | 'same_object' | 'ready';
  objectActions?: ObjectContextActionAvailability;
} = {}): CommandMenuItem[] {
  return [
    ...buildObjectContextActionItems(objectActions),
    { id: 'separator-canvas-object-text', kind: 'separator' },
    blockBacked
      ? {
        id: 'edit-shape-text',
        kind: 'item',
        label: 'Edit text',
        actionId: 'edit_shape_text',
        iconName: 'type',
      }
      : {
        id: 'add-shape-text',
        kind: 'item',
        label: 'Add text',
        actionId: 'add_shape_text',
        iconName: 'type',
      },
    ...(blockBacked ? [{
      id: sticky ? 'set-shape-style-default' : 'set-shape-style-sticky',
      kind: 'item' as const,
      label: sticky ? 'Use plain shape style' : 'Use sticky note style',
      actionId: sticky ? 'set_shape_style_default' as const : 'set_shape_style_sticky' as const,
      iconName: sticky ? 'square' : 'sticky-note',
    }] : []),
    ...(blockBacked ? [{
      id: 'remove-shape-text',
      kind: 'item' as const,
      label: 'Remove text',
      actionId: 'remove_shape_text' as const,
      iconName: 'eraser',
    }] : []),
    { id: 'separator-canvas-object-connector', kind: 'separator' },
    connectorDraftState === 'ready'
      ? {
        id: 'finish-visual-connector-to-object',
        kind: 'item',
        label: 'Connect to this object',
        actionId: 'finish_visual_connector_to_object',
        iconName: 'arrow-right',
      }
      : {
        id: 'start-visual-connector-from-object',
        kind: 'item',
        label: connectorDraftState === 'same_object' ? 'Connector start selected' : 'Start visual connector',
        actionId: 'start_visual_connector_from_object',
        iconName: 'arrow-right',
        disabled: connectorDraftState === 'same_object',
        disabledReason: 'Pick another object as the endpoint.',
      },
    { id: 'separator-canvas-object-delete', kind: 'separator' },
    {
      id: 'delete-canvas-object',
      kind: 'item',
      label: 'Delete object',
      actionId: 'delete_canvas_object',
      iconName: 'trash',
    },
  ];
}

export function buildVisualConnectorShellMenu({
  objectActions,
}: {
  objectActions?: ObjectContextActionAvailability;
} = {}): CommandMenuItem[] {
  return [
    ...buildObjectContextActionItems(objectActions),
    { id: 'separator-visual-connector-delete', kind: 'separator' },
    {
      id: 'delete-visual-connector',
      kind: 'item',
      label: 'Delete connector',
      actionId: 'delete_canvas_object',
      iconName: 'trash',
    },
  ];
}

export function buildPageFrameShellMenu({
  primary,
  inPageStack,
  stackCollapsed,
}: {
  primary: boolean;
  inPageStack: boolean;
  stackCollapsed: boolean;
}): CommandMenuItem[] {
  return [
    {
      id: 'add-page-below',
      kind: 'item',
      label: 'Add page below',
      actionId: 'add_page_below',
      iconName: 'file-plus-2',
    },
    {
      id: 'detach-page-from-stack',
      kind: 'item',
      label: 'Detach from PageStack',
      actionId: 'detach_page_from_stack',
      iconName: 'unlink',
      disabled: !inPageStack,
      disabledReason: inPageStack ? undefined : 'This page is not attached to a multi-page PageStack.',
    },
    {
      id: 'toggle-page-stack-collapse',
      kind: 'item',
      label: stackCollapsed ? 'Expand PageStack' : 'Collapse PageStack',
      actionId: 'toggle_page_stack_collapse',
      iconName: stackCollapsed ? 'chevrons-down-up' : 'chevrons-up-down',
      disabled: !inPageStack,
      disabledReason: inPageStack ? undefined : 'This page is not attached to a multi-page PageStack.',
    },
    { id: 'separator-page-frame-shapes', kind: 'separator' },
    {
      id: 'create-shape-rectangle',
      kind: 'item',
      label: 'Rectangle',
      actionId: 'create_shape_rectangle',
      iconName: 'square',
    },
    {
      id: 'create-shape-ellipse',
      kind: 'item',
      label: 'Ellipse',
      actionId: 'create_shape_ellipse',
      iconName: 'circle',
    },
    {
      id: 'create-image-object',
      kind: 'item',
      label: 'Image',
      actionId: 'create_image_object',
      iconName: 'image',
    },
    {
      id: 'create-table-object',
      kind: 'item',
      label: 'Table',
      actionId: 'create_table_object',
      iconName: 'table',
    },
    {
      id: 'create-sticky-note',
      kind: 'item',
      label: 'Sticky note',
      actionId: 'create_sticky_note',
      iconName: 'sticky-note',
    },
    { id: 'separator-page-stack', kind: 'separator' },
    {
      id: 'duplicate-page-frame',
      kind: 'item',
      label: 'Duplicate page',
      actionId: 'duplicate_page_frame',
      iconName: 'copy',
    },
    {
      id: 'set-primary-page-frame',
      kind: 'item',
      label: 'Set as primary',
      actionId: 'set_primary_page_frame',
      iconName: 'check',
      disabled: primary,
      disabledReason: primary ? 'This PageFrame is already primary.' : undefined,
      checked: primary,
    },
    { id: 'separator-page-frame-danger', kind: 'separator' },
    {
      id: 'delete-page-frame',
      kind: 'item',
      label: 'Delete page',
      actionId: 'delete_page_frame',
      iconName: 'trash',
    },
  ];
}
