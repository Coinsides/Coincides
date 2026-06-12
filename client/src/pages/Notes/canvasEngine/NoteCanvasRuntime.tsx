import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CircleHelp,
  CornerDownLeft,
  Eye,
  EyeOff,
  FileText,
  FileX,
  GripVertical,
  Info,
  LayoutDashboard,
  MoreHorizontal,
  PanelTopClose,
  PanelTopOpen,
  Plus,
  Save,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import api from '@/services/api';
import {
  loadRuntimeTemplateOptions,
  metadataForTemplateOption,
  STATIC_TEMPLATE_OPTIONS,
  type TemplateOption,
} from '@/services/templateOptions';
import { useUIStore } from '@/stores/uiStore';
import KaTeXRenderer from '@/components/KaTeX/KaTeXRenderer';
import sharedTypes from '@shared/types';
import {
  detectSlashTrigger,
  filterSlashCommands,
  findTemplateForCommand,
  removeSlashTrigger,
  SLASH_COMMAND_GROUP_LABELS,
  type NoteSlashCommand,
  type SlashTrigger,
} from '../noteSlashCommands';
import {
  CANVAS_PRIMARY_PAGE_OFFSET_X,
  DEFAULT_CANVAS_WORLD,
  buildNoteCanvasRuntimeModel,
  createPrimaryPageFrame,
  createViewport,
} from './engineModel';
import { useNoteCanvasRuntime } from './hooks/useNoteCanvasRuntime';
import {
  BLOCK_HORIZONTAL_CHROME,
  BLOCK_VERTICAL_CHROME,
  CANVAS_WORKSPACE_HEIGHT,
  CANVAS_WORKSPACE_WIDTH,
  DEFAULT_BLOCK_GAP,
  DEFAULT_BLOCK_HEIGHT,
  DEFAULT_PAGE_CONTENT_WIDTH,
  ELASTIC_AVOIDANCE_ACTIVATION_DISTANCE,
  LAYOUT_MEASURE_SUPPRESSION_MS,
  MIN_BLOCK_HEIGHT,
  MIN_BLOCK_WIDTH,
  NOTE_LAYOUT_KEY,
  SLASH_MENU_HEIGHT_ESTIMATE,
  SLASH_MENU_OFFSET,
  SLASH_MENU_WIDTH,
  SNAP_THRESHOLD,
  STACKED_BLOCK_GAP,
  TEXT_AVERAGE_CHAR_WIDTH,
  TEXT_LINE_HEIGHT,
  type AIVisibility,
  type BlockBoxLayout,
  type BoundaryKind,
  type ExportRole,
  type LayoutHistoryEntry,
  type SnapGuide,
  type SurfaceMode,
} from './runtimeLayout';
import type { BlockPlacementModel } from './types';
import styles from '../NoteDetail.module.css';

const {
  getNoteBlockTemplateLabel,
} = sharedTypes;

interface Note {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: string;
}

interface SourceReference {
  id?: string;
  document_id?: string | null;
  source_page_start?: number | null;
  source_page_end?: number | null;
  source_excerpt?: string | null;
  confidence?: number | null;
}

interface SourceAnchor {
  id: string;
  source_snapshot_id: string;
  source_snapshot_page_id: string | null;
  anchor_kind: string;
  page_start: number | null;
  page_end: number | null;
  metadata: {
    note_block_source_id?: string;
    [key: string]: unknown;
  };
}

interface SourceJumpTarget {
  anchor: SourceAnchor;
  snapshot: {
    id: string;
    title: string;
    source_filename: string;
  };
  page: {
    id: string;
    page_number: number;
    page_label: string | null;
    text_content: string;
  };
  focus: {
    page_start: number | null;
    page_end: number | null;
    text_start_offset: number | null;
    text_end_offset: number | null;
  };
  warnings: string[];
}

interface NoteBlock {
  id: string;
  placement_id: string;
  display_overrides_json: Record<string, unknown>;
  block_type: string;
  title: string | null;
  content_json: Record<string, unknown>;
  plain_text: string | null;
  metadata: Record<string, unknown>;
  order_index: number;
  source_references: SourceReference[];
}

type SlashTarget = {
  target: 'draft' | 'block';
  blockId?: string;
  trigger: SlashTrigger;
  anchor: SlashMenuAnchor | null;
};

interface SlashMenuAnchor {
  x: number;
  y: number;
}

const CANVAS_PAGE_OFFSET_X = CANVAS_PRIMARY_PAGE_OFFSET_X;

type FieldValueRecord = Record<string, unknown>;
type BlockPresentationKind = 'definition' | 'formula' | 'heading' | 'code' | 'sourceQuote' | 'paragraph';
type TemplateCategoryKey = 'default' | 'math' | 'userDefined';

const INSERT_TEMPLATE_CATEGORIES: Array<{ key: TemplateCategoryKey; label: string }> = [
  { key: 'default', label: 'Default' },
  { key: 'math', label: 'Math' },
  { key: 'userDefined', label: 'User Defined' },
];

const DEFAULT_INSERT_TEMPLATE_KEYS = [
  'text.paragraph',
  'text.heading',
  'source.quote',
  'definition.basic',
  'code.snippet',
];

const MATH_INSERT_TEMPLATE_KEYS = [
  'formula.math',
];

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return '';
}

function readFieldValues(content: Record<string, unknown>, metadata?: Record<string, unknown>): FieldValueRecord {
  const fieldValues = content.field_values;
  if (isRecord(fieldValues)) return fieldValues;
  const legacyStructured = content.structured_fields;
  if (isRecord(legacyStructured)) return legacyStructured;
  const metadataFields = metadata?.structured_fields;
  if (isRecord(metadataFields)) return metadataFields;
  return {};
}

function templateKeyForBlock(block: NoteBlock): string {
  return firstString(
    block.metadata?.template_key,
    block.metadata?.template_id,
    block.metadata?.legacy_template_id,
  );
}

function presentationKindForBlock(block: NoteBlock): BlockPresentationKind {
  const templateKey = templateKeyForBlock(block);
  if (block.block_type === 'definition' || templateKey.includes('definition')) return 'definition';
  if (block.block_type === 'formula' || templateKey.includes('formula')) return 'formula';
  if (block.block_type === 'heading' || templateKey.includes('heading')) return 'heading';
  if (templateKey.includes('code') || stringValue(block.content_json?.language)) return 'code';
  if (templateKey.includes('source.quote') || templateKey.includes('quote')) return 'sourceQuote';
  return 'paragraph';
}

function definitionFieldsFromText(text: string): { concept_name: string; description: string } {
  const trimmed = text.trim();
  return {
    concept_name: '',
    description: trimmed,
  };
}

function definitionFieldsFromBlock(
  block: NoteBlock,
  draftText?: string,
  draftFields?: FieldValueRecord,
): { concept_name: string; description: string } {
  if (draftFields) {
    return {
      concept_name: stringValue(draftFields.concept_name),
      description: stringValue(draftFields.description),
    };
  }
  const fields = readFieldValues(block.content_json, block.metadata);
  const bodyFallback = stringValue(block.content_json?.body) || block.plain_text || '';
  const parsed = definitionFieldsFromText(bodyFallback);
  return {
    concept_name: stringValue(fields.concept_name),
    description: draftText !== undefined
      ? draftText
      : firstString(fields.description, parsed.description, bodyFallback),
  };
}

function formulaFieldsFromBlock(
  block: NoteBlock,
  draftText?: string,
  draftFields?: FieldValueRecord,
): { latex_input: string; formula_name: string; explanation: string } {
  const fields = readFieldValues(block.content_json, block.metadata);
  const effectiveFields = draftFields || fields;
  const bodyFallback = draftText !== undefined ? draftText : stringValue(block.content_json?.body) || block.plain_text || '';
  return {
    latex_input: draftFields ? stringValue(effectiveFields.latex_input) : firstString(effectiveFields.latex_input, bodyFallback),
    formula_name: stringValue(effectiveFields.formula_name),
    explanation: stringValue(effectiveFields.explanation),
  };
}

function combinedDefinitionText(conceptName: string, description: string): string {
  const name = conceptName.trim();
  const body = description.trim();
  if (name && body) return `${name}: ${body}`;
  return name || body;
}

function formulaPreviewText(latexInput: string): string {
  const trimmed = latexInput.trim();
  if (!trimmed) return '';
  if (trimmed.includes('$')) return trimmed;
  return `$${trimmed}$`;
}

function contentForDefinition(
  text: string,
  previous: Record<string, unknown> = {},
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const fields = fieldValuesOverride
    ? {
      concept_name: stringValue(fieldValuesOverride.concept_name),
      description: stringValue(fieldValuesOverride.description),
    }
    : definitionFieldsFromText(text);
  const body = combinedDefinitionText(fields.concept_name, fields.description);
  const fieldValues = {
    concept_name: fields.concept_name,
    description: fields.description,
  };
  return {
    ...previous,
    body,
    field_values: fieldValues,
    structured_fields: fieldValues,
  };
}

function contentForFormula(
  text: string,
  previous: Record<string, unknown> = {},
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const latex = text.trim();
  const previousFields = readFieldValues(previous);
  const fieldValues = {
    latex_input: fieldValuesOverride ? stringValue(fieldValuesOverride.latex_input) : latex,
    formula_name: stringValue(fieldValuesOverride?.formula_name) || stringValue(previousFields.formula_name),
    explanation: stringValue(fieldValuesOverride?.explanation) || stringValue(previousFields.explanation),
  };
  const latexInput = fieldValues.latex_input;
  return {
    ...previous,
    body: latexInput,
    field_values: fieldValues,
    structured_fields: {
      latex_input: latexInput,
    },
  };
}

function plainTextForBlockContent(kind: BlockPresentationKind, content: Record<string, unknown>, fallback: string): string {
  const fields = readFieldValues(content);
  if (kind === 'definition') {
    return combinedDefinitionText(stringValue(fields.concept_name), stringValue(fields.description));
  }
  if (kind === 'formula') {
    return stringValue(fields.latex_input) || stringValue(content.body) || fallback;
  }
  return stringValue(content.body) || fallback;
}

function textFromContent(block: NoteBlock): string {
  const kind = presentationKindForBlock(block);
  if (kind === 'definition') {
    const fields = definitionFieldsFromBlock(block);
    return combinedDefinitionText(fields.concept_name, fields.description);
  }
  if (kind === 'formula') {
    return formulaFieldsFromBlock(block).latex_input;
  }
  const body = block.content_json?.body;
  if (typeof body === 'string') return body;
  return block.plain_text || '';
}

function contentForTemplate(template: TemplateOption, body: string): Record<string, unknown> {
  if (template.template_key === 'definition.basic' || template.learning_role === 'definition') {
    return contentForDefinition(body, template.default_content || {});
  }
  if (template.template_key === 'formula.math' || template.learning_role === 'formula') {
    return contentForFormula(body, template.default_content || {});
  }
  return {
    ...(template.default_content || {}),
    body,
  };
}

function contentForEditedBlock(
  block: NoteBlock,
  body: string,
  fieldValuesOverride?: FieldValueRecord,
): Record<string, unknown> {
  const kind = presentationKindForBlock(block);
  if (kind === 'definition') return contentForDefinition(body, block.content_json, fieldValuesOverride);
  if (kind === 'formula') return contentForFormula(body, block.content_json, fieldValuesOverride);
  return { ...block.content_json, body };
}

function findTemplateByKey(options: TemplateOption[], templateKey: string): TemplateOption | null {
  return options.find((template) => template.template_key === templateKey)
    || options.find((template) => template.template_id === templateKey)
    || null;
}

function isUserDefinedTemplate(option: TemplateOption): boolean {
  return option.origin === 'user' || (!option.isRuntime && option.origin === 'user');
}

function pickTemplatesByKey(options: TemplateOption[], templateKeys: string[]): TemplateOption[] {
  return templateKeys
    .map((templateKey) => findTemplateByKey(options, templateKey))
    .filter((template): template is TemplateOption => Boolean(template));
}

function buildInsertTemplateGroups(options: TemplateOption[]): Array<{
  key: TemplateCategoryKey;
  label: string;
  templates: TemplateOption[];
}> {
  const groups = {
    default: pickTemplatesByKey(options, DEFAULT_INSERT_TEMPLATE_KEYS),
    math: pickTemplatesByKey(options, MATH_INSERT_TEMPLATE_KEYS),
    userDefined: options.filter(isUserDefinedTemplate),
  };

  return INSERT_TEMPLATE_CATEGORIES
    .map((category) => ({
      ...category,
      templates: groups[category.key],
    }))
    .filter((category) => category.templates.length > 0);
}

function hydrateClientBlock(raw: any): NoteBlock {
  return {
    ...raw,
    content_json: raw?.content_json && typeof raw.content_json === 'object' ? raw.content_json : {},
    display_overrides_json: raw?.display_overrides_json && typeof raw.display_overrides_json === 'object'
      ? raw.display_overrides_json
      : {},
    metadata: raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
    source_references: Array.isArray(raw?.source_references)
      ? raw.source_references.filter((ref: unknown) => ref !== null)
      : [],
  };
}

function isFormulaLikeBlock(block: NoteBlock): boolean {
  const templateKey = typeof block.metadata?.template_key === 'string' ? block.metadata.template_key : '';
  const templateId = typeof block.metadata?.template_id === 'string' ? block.metadata.template_id : '';
  const legacyTemplateId = typeof block.metadata?.legacy_template_id === 'string' ? block.metadata.legacy_template_id : '';
  return block.block_type === 'formula'
    || templateKey.includes('formula')
    || templateId.includes('formula')
    || legacyTemplateId.includes('formula');
}

function shouldShowPreview(block: NoteBlock, text: string): boolean {
  return isFormulaLikeBlock(block) && text.trim().length > 0;
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function measureBlockContentHeight(element: HTMLElement | null): number {
  if (!element) return DEFAULT_BLOCK_HEIGHT;
  return Math.max(MIN_BLOCK_HEIGHT, Math.ceil(element.scrollHeight + BLOCK_VERTICAL_CHROME));
}

function isEditableDomTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getSlashMenuAnchor(element: HTMLElement | null, container: HTMLElement | null): SlashMenuAnchor | null {
  if (!element || !container) return null;

  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const menuWidth = Math.min(SLASH_MENU_WIDTH, Math.max(0, containerRect.width));
  const maxX = Math.max(0, containerRect.width - menuWidth);
  const x = clamp(elementRect.left - containerRect.left, 0, maxX);
  const belowY = elementRect.bottom - containerRect.top + SLASH_MENU_OFFSET;
  const aboveY = elementRect.top - containerRect.top - SLASH_MENU_HEIGHT_ESTIMATE - SLASH_MENU_OFFSET;
  const wouldOverflowViewport = elementRect.bottom + SLASH_MENU_OFFSET + SLASH_MENU_HEIGHT_ESTIMATE > window.innerHeight;
  const y = wouldOverflowViewport && aboveY > 0 ? aboveY : belowY;

  return { x, y: Math.max(0, y) };
}

function readStoredLayout(block: NoteBlock): Partial<BlockBoxLayout> | null {
  const layout = block.display_overrides_json?.[NOTE_LAYOUT_KEY];
  if (!isRecord(layout)) return null;
  return {
    ...layout,
    rotation: typeof layout.rotation === 'number' ? layout.rotation : undefined,
    export_role: isExportRole(layout.export_role) ? layout.export_role : undefined,
    ai_visibility: isAIVisibility(layout.ai_visibility) ? layout.ai_visibility : undefined,
    surface: isStoredLayoutSurface(layout.surface) ? layout.surface : undefined,
  };
}

function isExportRole(value: unknown): value is ExportRole {
  return value === 'included' || value === 'excluded' || value === 'scratch';
}

function isAIVisibility(value: unknown): value is AIVisibility {
  return value === 'visible' || value === 'hidden';
}

function isStoredLayoutSurface(value: unknown): value is NonNullable<BlockBoxLayout['surface']> {
  return value === 'formal_page' || value === 'canvas_workspace';
}

function isCanvasWorkspaceBlock(block: NoteBlock, contentWidth: number): boolean {
  const stored = readStoredLayout(block);
  if (stored?.surface === 'canvas_workspace') return true;
  if (stored?.surface === 'formal_page') return false;

  // Legacy canvas-workspace placements may not have a surface flag yet.
  return typeof stored?.x === 'number' && stored.x >= contentWidth;
}

function estimateBlockHeightForText(block: NoteBlock, text: string, width: number): number {
  const titleRows = block.title ? 1 : 0;
  const textWidth = Math.max(80, width - BLOCK_HORIZONTAL_CHROME);
  const charsPerLine = Math.max(12, Math.floor(textWidth / TEXT_AVERAGE_CHAR_WIDTH));
  const wrappedRows = text
    .split('\n')
    .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
  const rows = Math.max(1, wrappedRows) + titleRows;
  const previewExtra = shouldShowPreview(block, text) ? 72 : 0;
  const sourceExtra = block.source_references?.length > 0 ? 34 : 0;
  return Math.max(MIN_BLOCK_HEIGHT, BLOCK_VERTICAL_CHROME + rows * TEXT_LINE_HEIGHT + previewExtra + sourceExtra);
}

function estimateBlockHeight(block: NoteBlock, width: number): number {
  return estimateBlockHeightForText(block, textFromContent(block), width);
}

function normalizeBlockLayout(
  block: NoteBlock,
  fallback: BlockBoxLayout,
  contentWidth: number,
  surfaceMode: SurfaceMode,
): BlockBoxLayout {
  const stored = readStoredLayout(block);
  const useStoredPlacement = !(surfaceMode === 'page' && stored?.surface === 'canvas_workspace');
  const width = clamp(
    useStoredPlacement && typeof stored?.width === 'number' ? stored.width : fallback.width,
    MIN_BLOCK_WIDTH,
    Math.max(MIN_BLOCK_WIDTH, contentWidth),
  );
  const x = clamp(
    useStoredPlacement && typeof stored?.x === 'number' ? stored.x : fallback.x,
    0,
    Math.max(0, contentWidth - width),
  );
  const y = Math.max(0, useStoredPlacement && typeof stored?.y === 'number' ? stored.y : fallback.y);
  const naturalHeight = estimateBlockHeight(block, width);
  const height = Math.max(MIN_BLOCK_HEIGHT, naturalHeight);

  return {
    x,
    y,
    width,
    height,
    rotation: typeof stored?.rotation === 'number' ? stored.rotation : undefined,
    export_role: stored?.export_role,
    ai_visibility: stored?.ai_visibility,
    surface: useStoredPlacement ? stored?.surface : undefined,
  };
}

function buildDefaultBlockLayouts(blocks: NoteBlock[], contentWidth: number): Record<string, BlockBoxLayout> {
  let cursorY = 0;
  const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth);
  return blocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
    const height = estimateBlockHeight(block, width);
    acc[block.id] = { x: 0, y: cursorY, width, height };
    cursorY += height + DEFAULT_BLOCK_GAP;
    return acc;
  }, {});
}

function buildLayoutPayload(layout: BlockBoxLayout): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    x: Math.round(layout.x),
    y: Math.round(layout.y),
    width: Math.round(layout.width),
    height: Math.round(layout.height),
    surface: getBoundaryKind(layout) === 'inside' ? 'formal_page' : 'canvas_workspace',
    version: 'V2.BN.8',
  };
  if (typeof layout.rotation === 'number' && layout.rotation !== 0) payload.rotation = layout.rotation;
  if (layout.export_role) payload.export_role = layout.export_role;
  if (layout.ai_visibility) payload.ai_visibility = layout.ai_visibility;
  return payload;
}

function writeLayoutOverride(block: NoteBlock, layout: BlockBoxLayout): Record<string, unknown> {
  return {
    ...block.display_overrides_json,
    [NOTE_LAYOUT_KEY]: buildLayoutPayload(layout),
  };
}

function layoutsEqual(a: BlockBoxLayout, b: BlockBoxLayout): boolean {
  return Math.round(a.x) === Math.round(b.x)
    && Math.round(a.y) === Math.round(b.y)
    && Math.round(a.width) === Math.round(b.width)
    && Math.round(a.height) === Math.round(b.height)
    && Math.round((a.rotation || 0) * 1000) === Math.round((b.rotation || 0) * 1000)
    && a.export_role === b.export_role
    && a.ai_visibility === b.ai_visibility
    && a.surface === b.surface;
}

function buildLayoutHistoryEntry(
  before: Record<string, BlockBoxLayout>,
  after: Record<string, BlockBoxLayout>,
): LayoutHistoryEntry | null {
  const beforeChanged: Record<string, BlockBoxLayout> = {};
  const afterChanged: Record<string, BlockBoxLayout> = {};
  const ids = new Set([...Object.keys(before), ...Object.keys(after)]);

  ids.forEach((id) => {
    const beforeLayout = before[id];
    const afterLayout = after[id];
    if (!beforeLayout || !afterLayout || layoutsEqual(beforeLayout, afterLayout)) return;
    beforeChanged[id] = { ...beforeLayout };
    afterChanged[id] = { ...afterLayout };
  });

  return Object.keys(afterChanged).length > 0
    ? { before: beforeChanged, after: afterChanged }
    : null;
}

function getBoundaryKind(layout: Pick<BlockBoxLayout, 'x' | 'width'>): BoundaryKind {
  if (layout.x >= DEFAULT_PAGE_CONTENT_WIDTH) return 'outside';
  if (layout.x + layout.width <= DEFAULT_PAGE_CONTENT_WIDTH) return 'inside';
  return 'crossing';
}

function getEffectiveExportRole(layout: BlockBoxLayout): ExportRole {
  if (layout.export_role) return layout.export_role;
  return getBoundaryKind(layout) === 'outside' ? 'scratch' : 'included';
}

function getEffectiveAIVisibility(layout: BlockBoxLayout): AIVisibility {
  if (layout.ai_visibility) return layout.ai_visibility;
  return getBoundaryKind(layout) === 'outside' ? 'hidden' : 'visible';
}

function exportRoleLabel(role: ExportRole): string {
  if (role === 'included') return 'Export';
  if (role === 'excluded') return 'Excluded';
  return 'Scratch';
}

function aiVisibilityLabel(visibility: AIVisibility): string {
  return visibility === 'visible' ? 'AI visible' : 'AI hidden';
}

function hasHorizontalOverlap(a: BlockBoxLayout, b: BlockBoxLayout): boolean {
  return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x) + 1;
}

function resolveStackedLayoutCollisions(
  layouts: Record<string, BlockBoxLayout>,
  orderedBlockIds: string[],
): Record<string, BlockBoxLayout> {
  const nextLayouts = { ...layouts };
  const orderedIds = orderedBlockIds
    .filter((id) => nextLayouts[id])
    .sort((a, b) => {
      const layoutA = nextLayouts[a];
      const layoutB = nextLayouts[b];
      return layoutA.y - layoutB.y || orderedBlockIds.indexOf(a) - orderedBlockIds.indexOf(b);
    });

  orderedIds.forEach((id, index) => {
    let current = nextLayouts[id];
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previous = nextLayouts[orderedIds[previousIndex]];
      if (!hasHorizontalOverlap(current, previous)) continue;
      const minimumY = previous.y + previous.height + STACKED_BLOCK_GAP;
      if (current.y < minimumY && current.y >= previous.y - 1) {
        current = { ...current, y: minimumY };
        nextLayouts[id] = current;
      }
    }
  });

  return nextLayouts;
}

function reflowLayoutsAfterHeightChange(
  layouts: Record<string, BlockBoxLayout>,
  blockId: string,
  previousLayout: BlockBoxLayout,
  nextLayout: BlockBoxLayout,
): Record<string, BlockBoxLayout> {
  const delta = nextLayout.height - previousLayout.height;
  const nextLayouts = { ...layouts, [blockId]: nextLayout };
  if (Math.abs(delta) < 1) return nextLayouts;

  const previousBottom = previousLayout.y + previousLayout.height;
  Object.entries(layouts).forEach(([id, layout]) => {
    if (id === blockId) return;
    if (layout.y < previousBottom - 1) return;
    if (!hasHorizontalOverlap(layout, previousLayout)) return;
    nextLayouts[id] = { ...layout, y: Math.max(0, layout.y + delta) };
  });

  return nextLayouts;
}
function snapToTargets(value: number, targets: number[]): { value: number; snapped?: number } {
  for (const target of targets) {
    if (Math.abs(value - target) <= SNAP_THRESHOLD) {
      return { value: target, snapped: target };
    }
  }
  return { value };
}

function applyMoveSnap(
  layout: BlockBoxLayout,
  blockId: string,
  layouts: Record<string, BlockBoxLayout>,
  contentWidth: number,
): { layout: BlockBoxLayout; guide: SnapGuide | null } {
  const otherLayouts = Object.entries(layouts)
    .filter(([id]) => id !== blockId)
    .map(([, item]) => item);
  const xTargets = [0, contentWidth - layout.width, ...otherLayouts.flatMap((item) => [item.x, item.x + item.width])];
  const yTargets = [0, ...otherLayouts.flatMap((item) => [item.y, item.y + item.height])];
  const snappedX = snapToTargets(layout.x, xTargets);
  const snappedY = snapToTargets(layout.y, yTargets);
  const next = { ...layout, x: snappedX.value, y: snappedY.value };
  const guide = snappedX.snapped !== undefined || snappedY.snapped !== undefined
    ? { x: snappedX.snapped, y: snappedY.snapped }
    : null;
  return { layout: next, guide };
}

export default function NoteCanvasRuntime() {
  const { noteId } = useNoteCanvasRuntime();
  const navigate = useNavigate();
  const addToast = useUIStore((s) => s.addToast);

  const [note, setNote] = useState<Note | null>(null);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('text.paragraph');
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>(STATIC_TEMPLATE_OPTIONS);
  const [templateWarning, setTemplateWarning] = useState<string | null>(null);
  const [newBlockText, setNewBlockText] = useState('');
  const [savingBlockId, setSavingBlockId] = useState<string | null>(null);
  const [anchorsBySourceRef, setAnchorsBySourceRef] = useState<Record<string, SourceAnchor>>({});
  const [sourceJumpTarget, setSourceJumpTarget] = useState<SourceJumpTarget | null>(null);
  const [sourceJumpBusy, setSourceJumpBusy] = useState<string | null>(null);
  const [draftActive, setDraftActive] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftFocusNonce, setDraftFocusNonce] = useState(0);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [blockTextDrafts, setBlockTextDrafts] = useState<Record<string, string>>({});
  const [slashTarget, setSlashTarget] = useState<SlashTarget | null>(null);
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
  const [showAdvancedInsert, setShowAdvancedInsert] = useState(false);
  const [showNoteInfo, setShowNoteInfo] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const [showPreviewBlockTypes, setShowPreviewBlockTypes] = useState(false);
  const [showPreviewAIVisibility, setShowPreviewAIVisibility] = useState(false);
  const [showPreviewExportStatus, setShowPreviewExportStatus] = useState(false);
  const [layoutMode, setLayoutMode] = useState(false);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('page');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, BlockBoxLayout>>({});
  const [blockFieldDrafts, setBlockFieldDrafts] = useState<Record<string, FieldValueRecord>>({});
  const [draftLayout, setDraftLayout] = useState<BlockBoxLayout | null>(null);
  const [contentWidth, setContentWidth] = useState(DEFAULT_PAGE_CONTENT_WIDTH);
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const draftRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextRef = useRef('');
  const creatingDraftRef = useRef(false);
  const blockListRef = useRef<HTMLDivElement | null>(null);
  const movingBlockIdRef = useRef<string | null>(null);
  const suppressMeasuredReflowUntilRef = useRef(0);
  const layoutUndoStackRef = useRef<LayoutHistoryEntry[]>([]);
  const layoutRedoStackRef = useRef<LayoutHistoryEntry[]>([]);

  const sortedBlocks = useMemo(
    () => [...blocks].sort((a, b) => a.order_index - b.order_index),
    [blocks],
  );

  const defaultTextTemplate = useMemo(
    () => templateOptions.find((template) => template.template_key === 'text.paragraph')
      || templateOptions.find((template) => template.template_id === 'text.paragraph')
      || templateOptions[0]
      || STATIC_TEMPLATE_OPTIONS[0],
    [templateOptions],
  );

  const insertTemplateGroups = useMemo(
    () => buildInsertTemplateGroups(templateOptions),
    [templateOptions],
  );

  const insertTemplateOptions = useMemo(
    () => insertTemplateGroups.flatMap((group) => group.templates),
    [insertTemplateGroups],
  );

  const slashCommands = useMemo(() => (
    slashTarget
      ? filterSlashCommands(slashTarget.trigger.query).map((command) => (
        findTemplateForCommand(command, insertTemplateOptions)
          ? command
          : { ...command, disabledReason: `${command.label} is not enabled in this notebook build yet.` }
      ))
      : []
  ), [slashTarget, insertTemplateOptions]);

  const sourceReferenceCount = useMemo(
    () => sortedBlocks.reduce((total, block) => total + block.source_references.length, 0),
    [sortedBlocks],
  );

  const visibleBlocks = useMemo(
    () => surfaceMode === 'page'
      ? sortedBlocks.filter((block) => !isCanvasWorkspaceBlock(block, contentWidth))
      : sortedBlocks,
    [sortedBlocks, surfaceMode, contentWidth],
  );

  const blockLayouts = useMemo(() => {
    const defaults = buildDefaultBlockLayouts(visibleBlocks, contentWidth);
    const resolvedLayouts = visibleBlocks.reduce<Record<string, BlockBoxLayout>>((acc, block) => {
      const draft = layoutDrafts[block.id];
      acc[block.id] = draft || normalizeBlockLayout(block, defaults[block.id], contentWidth, surfaceMode);
      return acc;
    }, {});
    return resolvedLayouts;
  }, [visibleBlocks, contentWidth, layoutDrafts, surfaceMode]);

  const pageOffsetX = surfaceMode === 'canvas' ? CANVAS_PAGE_OFFSET_X : 0;

  const defaultDraftLayout = useMemo(() => {
    const bottoms = Object.values(blockLayouts).map((layout) => layout.y + layout.height);
    const y = bottoms.length > 0 ? Math.max(...bottoms) + DEFAULT_BLOCK_GAP : 0;
    const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, contentWidth);
    return { x: 0, y, width, height: DEFAULT_BLOCK_HEIGHT };
  }, [blockLayouts, contentWidth]);

  const pageContentHeight = useMemo(() => {
    const blockBottoms = Object.values(blockLayouts).map((layout) => layout.y + layout.height);
    const draftBottom = draftActive ? (draftLayout || defaultDraftLayout).y + (draftLayout || defaultDraftLayout).height : 0;
    const minimumHeight = surfaceMode === 'canvas' ? CANVAS_WORKSPACE_HEIGHT : 580;
    return Math.max(minimumHeight, ...blockBottoms, draftBottom) + 96;
  }, [blockLayouts, draftActive, draftLayout, defaultDraftLayout, surfaceMode]);

  const primaryPageFrame = useMemo(
    () => createPrimaryPageFrame({
      x: pageOffsetX,
      y: 0,
      width: DEFAULT_PAGE_CONTENT_WIDTH,
      height: pageContentHeight,
    }),
    [pageContentHeight, pageOffsetX],
  );

  const canvasBlockPlacements = useMemo<BlockPlacementModel[]>(
    () => visibleBlocks.flatMap((block) => {
      const layout = blockLayouts[block.id];
      if (!layout) return [];
      const boundary = getBoundaryKind(layout);
      return [{
        blockId: block.id,
        x: layout.x + pageOffsetX,
        y: layout.y,
        width: layout.width,
        height: layout.height,
        rotation: layout.rotation || 0,
        surface: boundary === 'inside' ? 'formal_page' : 'canvas_workspace',
      }];
    }),
    [blockLayouts, pageOffsetX, visibleBlocks],
  );

  const noteCanvasRuntime = useMemo(() => {
    const viewport = createViewport({
      width: surfaceMode === 'canvas' ? CANVAS_WORKSPACE_WIDTH : DEFAULT_PAGE_CONTENT_WIDTH,
      height: pageContentHeight,
      zoom: 1,
    });

    return buildNoteCanvasRuntimeModel({
      mode: surfaceMode,
      world: surfaceMode === 'canvas'
        ? DEFAULT_CANVAS_WORLD
        : {
          origin: { x: 0, y: 0 },
          width: DEFAULT_PAGE_CONTENT_WIDTH,
          height: pageContentHeight,
        },
      primaryPageFrame,
      viewport,
      blockPlacements: canvasBlockPlacements,
    });
  }, [canvasBlockPlacements, pageContentHeight, primaryPageFrame, surfaceMode]);

  const exportPreview = useMemo(() => {
    const rows = visibleBlocks.map((block) => {
      const layout = blockLayouts[block.id];
      const boundary = layout ? getBoundaryKind(layout) : 'inside';
      const exportRole = layout ? getEffectiveExportRole(layout) : 'included';
      const aiVisibility = layout ? getEffectiveAIVisibility(layout) : 'visible';
      return { block, layout, boundary, exportRole, aiVisibility };
    });
    const includedRows = rows.filter((row) => row.exportRole === 'included');
    const excludedRows = rows.filter((row) => row.exportRole !== 'included');
    const aiVisibleRows = rows.filter((row) => row.aiVisibility === 'visible');
    const aiHiddenRows = rows.filter((row) => row.aiVisibility === 'hidden');
    return {
      rows,
      includedRows,
      excludedRows,
      aiVisibleRows,
      aiHiddenRows,
      included: includedRows.length,
      excluded: excludedRows.length,
      scratch: rows.filter((row) => row.exportRole === 'scratch').length,
      aiVisible: aiVisibleRows.length,
      aiHidden: aiHiddenRows.length,
      crossing: rows.filter((row) => row.boundary === 'crossing').length,
      outside: rows.filter((row) => row.boundary === 'outside').length,
    };
  }, [visibleBlocks, blockLayouts]);

  const renderExportPreviewGroup = (
    label: string,
    rows: typeof exportPreview.rows,
    meta: (row: typeof exportPreview.rows[number]) => string,
  ) => (
    <details className={styles.exportPreviewGroup}>
      <summary>
        <span>{label}</span>
        <strong>{rows.length}</strong>
      </summary>
      <div className={styles.exportPreviewList}>
        {rows.length === 0 ? (
          <div className={styles.exportPreviewEmpty}>No blocks in this group.</div>
        ) : rows.map((row) => (
          <div key={`${label}-${row.block.id}`} className={styles.exportPreviewRow}>
            <span>{row.block.title || textFromContent(row.block).slice(0, 72) || 'Untitled block'}</span>
            <small>{meta(row)}</small>
          </div>
        ))}
      </div>
    </details>
  );

  const fetchNote = useCallback(async () => {
    if (!noteId) return;
    setLoading(true);
    try {
      const [noteRes, blocksRes] = await Promise.all([
        api.get(`/notes/${noteId}`),
        api.get(`/notes/${noteId}/blocks`),
      ]);
      setNote(noteRes.data);
      setTitleDraft(noteRes.data.title);
      setBlocks((blocksRes.data as any[]).map(hydrateClientBlock));
      setBlockTextDrafts({});
      setLayoutDrafts({});
      setSelectedBlockId(null);
      setDraftLayout(null);
    } catch (err) {
      console.error('Failed to load note:', err);
      addToast('error', 'Failed to load note');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  }, [noteId, addToast, navigate]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  useEffect(() => {
    if (insertTemplateOptions.length === 0) return;
    if (insertTemplateOptions.some((template) => template.template_id === newTemplateId)) return;
    setNewTemplateId(insertTemplateOptions[0].template_id);
  }, [insertTemplateOptions, newTemplateId]);

  useEffect(() => {
    let cancelled = false;
    loadRuntimeTemplateOptions().then(({ options, warning }) => {
      if (cancelled) return;
      setTemplateOptions(options);
      setTemplateWarning(warning);
      setNewTemplateId((current) => (
        buildInsertTemplateGroups(options)
          .flatMap((group) => group.templates)
          .some((template) => template.template_id === current)
          ? current
          : buildInsertTemplateGroups(options)[0]?.templates[0]?.template_id || 'text.paragraph'
      ));
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draftActive) return;
    window.setTimeout(() => {
      draftRef.current?.focus();
      resizeTextarea(draftRef.current);
    }, 0);
  }, [draftActive, draftFocusNonce]);

  useLayoutEffect(() => {
    resizeTextarea(draftRef.current);
    if (!draftActive || !draftRef.current) return;
    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, draftRef.current.scrollHeight + 34);
    setDraftLayout((current) => (
      current && nextHeight > current.height + 2
        ? { ...current, height: nextHeight }
        : current
    ));
  }, [draftText, draftActive]);

  useLayoutEffect(() => {
    const updateContentWidth = () => {
      const width = blockListRef.current?.clientWidth;
      if (width && Number.isFinite(width)) {
        const availableWidth = surfaceMode === 'canvas' ? width - CANVAS_PAGE_OFFSET_X : width;
        setContentWidth(Math.max(MIN_BLOCK_WIDTH, availableWidth));
      }
    };
    updateContentWidth();

    const element = blockListRef.current;
    const observer = typeof ResizeObserver !== 'undefined' && element
      ? new ResizeObserver(updateContentWidth)
      : null;
    observer?.observe(element as Element);

    window.addEventListener('resize', updateContentWidth);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateContentWidth);
    };
  }, [surfaceMode]);

  const fetchSourceAnchors = useCallback(async (courseId: string) => {
    try {
      await api.post('/source-anchors/generate', {
        course_id: courseId,
        target_type: 'note_block',
      });
      const res = await api.get('/source-anchors', { params: { course_id: courseId } });
      const nextAnchors: Record<string, SourceAnchor> = {};
      for (const anchor of res.data as SourceAnchor[]) {
        const sourceRefId = anchor.metadata?.note_block_source_id;
        if (sourceRefId) nextAnchors[sourceRefId] = anchor;
      }
      setAnchorsBySourceRef(nextAnchors);
    } catch (err) {
      console.error('Failed to load source anchors:', err);
      setAnchorsBySourceRef({});
    }
  }, []);

  useEffect(() => {
    if (!note?.course_id || blocks.length === 0) return;
    fetchSourceAnchors(note.course_id);
  }, [note?.course_id, blocks.length, fetchSourceAnchors]);

  const saveTitle = async () => {
    const nextTitle = titleDraft.trim();
    if (!note || !nextTitle || nextTitle === note.title) return;
    try {
      const res = await api.put(`/notes/${note.id}`, { title: nextTitle });
      setNote(res.data);
      setTitleDraft(res.data?.title || nextTitle);
      addToast('success', 'Note renamed');
    } catch (err) {
      console.error('Failed to rename note:', err);
      addToast('error', 'Failed to rename note');
    }
  };

  const createBlock = useCallback(async (
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
      layout?: BlockBoxLayout;
      silent?: boolean;
    } = {},
  ): Promise<NoteBlock | null> => {
    if (!note) return null;
    const body = text.trimEnd();
    try {
      const metadata = {
        ...metadataForTemplateOption(template),
        ...(options.metadataPatch || {}),
      };
      const nextContent = options.contentJson || contentForTemplate(template, body);
      const nextKind: BlockPresentationKind = template.learning_role === 'definition'
        ? 'definition'
        : template.learning_role === 'formula'
          ? 'formula'
          : template.template_key === 'text.heading'
            ? 'heading'
            : template.template_key === 'code.snippet'
              ? 'code'
              : template.template_key === 'source.quote'
                ? 'sourceQuote'
                : 'paragraph';
      const res = await api.post(`/notes/${note.id}/blocks`, {
        block_type: template.legacy_block_type,
        title: options.title || undefined,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, body),
        metadata,
        display_overrides_json: options.layout
          ? { [NOTE_LAYOUT_KEY]: buildLayoutPayload(options.layout) }
          : undefined,
      });
      const created = hydrateClientBlock(res.data);
      setBlocks((current) => [...current, created].sort((a, b) => a.order_index - b.order_index));
      setBlockTextDrafts((current) => ({ ...current, [created.id]: text.trimEnd() }));
      if (!options.silent) addToast('success', 'Block added');
      return created;
    } catch (err) {
      console.error('Failed to create block:', err);
      addToast('error', 'Failed to create block');
      return null;
    }
  }, [note, addToast]);

  const saveBlock = useCallback(async (
    block: NoteBlock,
    text: string,
    options: { silent?: boolean; fieldValues?: FieldValueRecord } = {},
  ): Promise<NoteBlock | null> => {
    const nextText = text.trimEnd();
    const previousText = textFromContent(block).trimEnd();
    const fieldValues = options.fieldValues || blockFieldDrafts[block.id];
    if (nextText === previousText && !fieldValues) return block;
    setSavingBlockId(block.id);
    try {
      const nextContent = contentForEditedBlock(block, nextText, fieldValues);
      const kind = presentationKindForBlock(block);
      const res = await api.put(`/note-blocks/${block.id}`, {
        content_json: nextContent,
        plain_text: plainTextForBlockContent(kind, nextContent, nextText),
      });
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[block.id];
        return next;
      });
      if (!options.silent) addToast('success', 'Block saved');
      return updated;
    } catch (err) {
      console.error('Failed to save block:', err);
      addToast('error', 'Failed to save block');
      return null;
    } finally {
      setSavingBlockId(null);
    }
  }, [addToast, blockFieldDrafts]);

  const applyTemplateToBlock = useCallback(async (
    block: NoteBlock,
    template: TemplateOption,
    text: string,
    options: {
      title?: string | null;
      contentJson?: Record<string, unknown>;
      metadataPatch?: Record<string, unknown>;
    } = {},
  ) => {
    const nextText = text.trimEnd();
    setSavingBlockId(block.id);
    try {
      const metadata = {
        ...metadataForTemplateOption(template),
        ...(options.metadataPatch || {}),
      };
      const nextContent = options.contentJson || contentForTemplate(template, nextText);
      const nextKind: BlockPresentationKind = template.learning_role === 'definition'
        ? 'definition'
        : template.learning_role === 'formula'
          ? 'formula'
          : template.template_key === 'text.heading'
            ? 'heading'
            : 'paragraph';
      const res = await api.put(`/note-blocks/${block.id}`, {
        block_type: template.legacy_block_type,
        title: options.title ?? block.title,
        content_json: nextContent,
        plain_text: plainTextForBlockContent(nextKind, nextContent, nextText),
        metadata,
      });
      const updated = hydrateClientBlock({ ...block, ...res.data, source_references: block.source_references });
      setBlocks((current) => current.map((item) => item.id === block.id ? updated : item));
      setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
      setFocusBlockId(block.id);
      addToast('success', `Converted to ${template.label}`);
      return updated;
    } catch (err) {
      console.error('Failed to convert block:', err);
      addToast('error', 'Failed to convert block');
      return null;
    } finally {
      setSavingBlockId(null);
    }
  }, [addToast]);

  const persistBlockLayout = useCallback(async (block: NoteBlock, layout: BlockBoxLayout) => {
    if (!note) return;
    const displayOverrides = writeLayoutOverride(block, layout);
    try {
      await api.put(`/notes/${note.id}/block-placements/${block.placement_id}`, {
        display_overrides_json: displayOverrides,
      });
      setBlocks((current) => current.map((item) => (
        item.id === block.id
          ? { ...item, display_overrides_json: displayOverrides }
          : item
      )));
      setLayoutDrafts((current) => {
        const next = { ...current };
        delete next[block.id];
        return next;
      });
    } catch (err) {
      console.error('Failed to save block layout:', err);
      addToast('error', 'Failed to save block layout');
    }
  }, [note, addToast]);

  const updateBlockPolicy = useCallback(async (
    block: NoteBlock,
    layout: BlockBoxLayout,
    patch: Pick<BlockBoxLayout, 'export_role'> | Pick<BlockBoxLayout, 'ai_visibility'>,
  ) => {
    const nextLayout = { ...layout, ...patch };
    setLayoutDrafts((current) => ({ ...current, [block.id]: nextLayout }));
    await persistBlockLayout(block, nextLayout);
  }, [persistBlockLayout]);

  const toggleBlockExportRole = useCallback((block: NoteBlock, layout: BlockBoxLayout) => {
    const current = getEffectiveExportRole(layout);
    const nextRole: ExportRole = current === 'included' ? 'excluded' : 'included';
    void updateBlockPolicy(block, layout, { export_role: nextRole });
  }, [updateBlockPolicy]);

  const toggleBlockAIVisibility = useCallback((block: NoteBlock, layout: BlockBoxLayout) => {
    const current = getEffectiveAIVisibility(layout);
    const nextVisibility: AIVisibility = current === 'visible' ? 'hidden' : 'visible';
    void updateBlockPolicy(block, layout, { ai_visibility: nextVisibility });
  }, [updateBlockPolicy]);

  const persistChangedBlockLayouts = useCallback((nextLayouts: Record<string, BlockBoxLayout>) => {
    Object.entries(nextLayouts).forEach(([blockId, nextLayout]) => {
      const previousLayout = blockLayouts[blockId];
      if (previousLayout && layoutsEqual(previousLayout, nextLayout)) return;
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, nextLayout);
    });
  }, [blocks, blockLayouts, persistBlockLayout]);

  const persistLayoutSnapshot = useCallback((layouts: Record<string, BlockBoxLayout>) => {
    Object.entries(layouts).forEach(([blockId, layout]) => {
      const targetBlock = blocks.find((item) => item.id === blockId);
      if (!targetBlock) return;
      void persistBlockLayout(targetBlock, layout);
    });
  }, [blocks, persistBlockLayout]);

  const pushLayoutHistory = useCallback((
    before: Record<string, BlockBoxLayout>,
    after: Record<string, BlockBoxLayout>,
  ) => {
    const entry = buildLayoutHistoryEntry(before, after);
    if (!entry) return;
    layoutUndoStackRef.current = [...layoutUndoStackRef.current, entry].slice(-60);
    layoutRedoStackRef.current = [];
  }, []);

  const undoLayoutHistory = useCallback(() => {
    const entry = layoutUndoStackRef.current.pop();
    if (!entry) return false;
    layoutRedoStackRef.current.push(entry);
    setLayoutDrafts((current) => ({ ...current, ...entry.before }));
    persistLayoutSnapshot(entry.before);
    return true;
  }, [persistLayoutSnapshot]);

  const redoLayoutHistory = useCallback(() => {
    const entry = layoutRedoStackRef.current.pop();
    if (!entry) return false;
    layoutUndoStackRef.current.push(entry);
    setLayoutDrafts((current) => ({ ...current, ...entry.after }));
    persistLayoutSnapshot(entry.after);
    return true;
  }, [persistLayoutSnapshot]);

  useEffect(() => {
    const handleLayoutHistoryKeys = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || isEditableDomTarget(event.target)) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        if (!undoLayoutHistory()) return;
        event.preventDefault();
        return;
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        if (!redoLayoutHistory()) return;
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleLayoutHistoryKeys);
    return () => window.removeEventListener('keydown', handleLayoutHistoryKeys);
  }, [redoLayoutHistory, undoLayoutHistory]);

  const persistDraft = useCallback(async (
    initialText?: string,
    explicitTemplate?: TemplateOption,
  ) => {
    if (!note || creatingDraftRef.current) return;
    const template = explicitTemplate || defaultTextTemplate;
    const textToCreate = (initialText ?? draftTextRef.current).trimEnd();
    if (!template || (!textToCreate.trim() && !explicitTemplate)) return;

    creatingDraftRef.current = true;
    setCreatingDraft(true);
    try {
      const created = await createBlock(template, textToCreate, {
        layout: draftLayout || defaultDraftLayout,
        silent: true,
      });
      if (!created) return;

      const latestText = draftTextRef.current.trimEnd();
      if (latestText.trim() && latestText !== textToCreate) {
        await saveBlock(created, latestText, { silent: true });
      }

      setDraftText('');
      draftTextRef.current = '';
      setDraftActive(false);
      setDraftLayout(null);
      setSlashTarget(null);
      setFocusBlockId(created.id);
    } finally {
      creatingDraftRef.current = false;
      setCreatingDraft(false);
    }
  }, [note, defaultTextTemplate, draftLayout, defaultDraftLayout, createBlock, saveBlock]);

  const activateDraft = useCallback((layout?: BlockBoxLayout) => {
    setDraftLayout(layout || defaultDraftLayout);
    setDraftActive(true);
    setDraftFocusNonce((value) => value + 1);
    setActiveBlockId(null);
    setSelectedBlockId(null);
  }, [defaultDraftLayout]);

  const clearBlockSelection = useCallback(() => {
    setSelectedBlockId(null);
    setActiveBlockId(null);
    setFocusBlockId(null);
  }, []);

  const addBlock = async (): Promise<boolean> => {
    if (!newBlockText.trim()) return false;
    const selectedTemplate = insertTemplateOptions.find((template) => template.template_id === newTemplateId) || insertTemplateOptions[0];
    if (!selectedTemplate) return false;
    const created = await createBlock(selectedTemplate, newBlockText.trim());
    if (created) {
      setNewBlockText('');
      setFocusBlockId(created.id);
      return true;
    }
    return false;
  };

  const trashBlock = async (blockId: string) => {
    try {
      await api.delete(`/note-blocks/${blockId}`);
      setBlocks((current) => current.filter((block) => block.id !== blockId));
      setBlockTextDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      setBlockFieldDrafts((current) => {
        const next = { ...current };
        delete next[blockId];
        return next;
      });
      addToast('success', 'Block moved to trash');
    } catch (err) {
      console.error('Failed to trash block:', err);
      addToast('error', 'Failed to trash block');
    }
  };

  const moveBlock = async (placementId: string, direction: -1 | 1) => {
    if (!note) return;
    const current = sortedBlocks.findIndex((block) => block.placement_id === placementId);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= sortedBlocks.length) return;

    const reordered = [...sortedBlocks];
    [reordered[current], reordered[target]] = [reordered[target], reordered[current]];
    const placements = reordered.map((block, index) => ({
      placement_id: block.placement_id,
      order_index: index,
    }));

    try {
      await api.put(`/notes/${note.id}/blocks/reorder`, { placements });
      setBlocks(reordered.map((block, index) => ({ ...block, order_index: index })));
    } catch (err) {
      console.error('Failed to reorder blocks:', err);
      addToast('error', 'Failed to reorder blocks');
    }
  };

  const handleViewSource = async (anchorId: string) => {
    setSourceJumpBusy(anchorId);
    try {
      const res = await api.get(`/source-anchors/${anchorId}/jump-target`);
      setSourceJumpTarget(res.data);
    } catch (err: any) {
      console.error('Failed to open source anchor:', err);
      addToast('error', err?.response?.data?.error || 'Failed to open source');
    } finally {
      setSourceJumpBusy(null);
    }
  };

  const updateSlashTarget = (
    target: SlashTarget['target'],
    text: string,
    caret: number,
    blockId?: string,
    anchorElement?: HTMLElement | null,
  ) => {
    const trigger = detectSlashTrigger(text, caret);
    setSlashTarget(trigger ? {
      target,
      blockId,
      trigger,
      anchor: getSlashMenuAnchor(anchorElement || null, blockListRef.current),
    } : null);
  };

  const handleDraftChange = (value: string, caret: number, anchorElement?: HTMLElement | null) => {
    setDraftText(value);
    draftTextRef.current = value;
    updateSlashTarget('draft', value, caret, undefined, anchorElement);
  };

  const handleBlockTextChange = (
    blockId: string,
    value: string,
    caret: number,
    anchorElement?: HTMLElement | null,
  ) => {
    setBlockTextDrafts((current) => ({ ...current, [blockId]: value }));
    updateSlashTarget('block', value, caret, blockId, anchorElement);
  };

  const handleSelectSlashCommand = async (command: NoteSlashCommand) => {
    if (!slashTarget) return;
    if (command.disabledReason) {
      addToast('info', command.disabledReason);
      return;
    }

    const template = findTemplateForCommand(command, templateOptions);
    if (!template) {
      addToast('error', `${command.label} template is not available`);
      return;
    }

    if (slashTarget.target === 'draft') {
      const cleanedText = removeSlashTrigger(draftTextRef.current, slashTarget.trigger);
      setSlashTarget(null);
      setDraftText(cleanedText);
      draftTextRef.current = cleanedText;
      await persistDraft(cleanedText, template);
      return;
    }

    const blockId = slashTarget.blockId;
    const block = blockId ? blocks.find((item) => item.id === blockId) : undefined;
    if (!block) return;

    const currentText = blockTextDrafts[block.id] ?? textFromContent(block);
    const cleanedText = removeSlashTrigger(currentText, slashTarget.trigger);
    setSlashTarget(null);
    setBlockTextDrafts((current) => ({ ...current, [block.id]: cleanedText }));

    if (!cleanedText.trim()) {
      await applyTemplateToBlock(block, template, cleanedText);
      return;
    }

    await applyTemplateToBlock(block, template, cleanedText);
  };

  const handleDraftKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' && slashTarget?.target === 'draft') {
      event.preventDefault();
      setSlashTarget(null);
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void persistDraft(draftText);
    }
  };

  const handleBlockKeyDown = (block: NoteBlock, text: string, event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      if (slashTarget?.target === 'block') {
        event.preventDefault();
        setSlashTarget(null);
      }
      return;
    }

    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      void saveBlock(block, text, { silent: true }).then(() => activateDraft());
    }
  };

  const beginMoveBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: NoteBlock,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setLayoutMode(true);
    const startClientX = event.clientX;
    const startClientY = event.clientY;
    const startLayouts = { ...blockLayouts };
    let latestLayouts: Record<string, BlockBoxLayout> = startLayouts;
    movingBlockIdRef.current = block.id;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setLayoutDrafts(() => {
        const baseline = startLayouts;
        const currentLayout = baseline[block.id] || layout;
        const rawLayout = {
          ...currentLayout,
          x: clamp(currentLayout.x + moveEvent.clientX - startClientX, 0, Math.max(0, contentWidth - currentLayout.width)),
          y: Math.max(0, currentLayout.y + moveEvent.clientY - startClientY),
        };
        const snapped = snapEnabled
          ? applyMoveSnap(rawLayout, block.id, baseline, contentWidth)
          : { layout: rawLayout, guide: null };
        const candidateLayouts = { ...baseline, [block.id]: snapped.layout };
        const movedEnoughForElasticAvoidance = Math.abs(snapped.layout.y - currentLayout.y) >= ELASTIC_AVOIDANCE_ACTIVATION_DISTANCE;
        latestLayouts = surfaceMode === 'page' && !snapEnabled && movedEnoughForElasticAvoidance
          ? resolveStackedLayoutCollisions(candidateLayouts, visibleBlocks.map((item) => item.id))
          : candidateLayouts;
        setSnapGuide(snapped.guide);
        return latestLayouts;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
      movingBlockIdRef.current = null;
      setSnapGuide(null);
      pushLayoutHistory(startLayouts, latestLayouts);
      persistChangedBlockLayouts(latestLayouts);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [blockLayouts, contentWidth, persistChangedBlockLayouts, pushLayoutHistory, snapEnabled, surfaceMode, visibleBlocks]);

  const beginResizeBlock = useCallback((
    event: ReactPointerEvent<HTMLElement>,
    block: NoteBlock,
    text: string,
    layout: BlockBoxLayout,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedBlockId(block.id);
    setLayoutMode(true);
    const startClientX = event.clientX;
    let latestLayout = layout;
    let latestLayouts: Record<string, BlockBoxLayout> = blockLayouts;
    const startLayouts = { ...blockLayouts };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const width = clamp(
        layout.width + moveEvent.clientX - startClientX,
        MIN_BLOCK_WIDTH,
        Math.max(MIN_BLOCK_WIDTH, contentWidth - layout.x),
      );
      const snappedRight = snapEnabled
        ? snapToTargets(layout.x + width, [
          contentWidth,
          ...Object.entries(blockLayouts)
            .filter(([id]) => id !== block.id)
            .flatMap(([, item]) => [item.x, item.x + item.width]),
        ])
        : { value: layout.x + width };
      const nextWidth = clamp(snappedRight.value - layout.x, MIN_BLOCK_WIDTH, Math.max(MIN_BLOCK_WIDTH, contentWidth - layout.x));
      latestLayout = {
        ...layout,
        width: nextWidth,
        height: estimateBlockHeightForText(block, text, nextWidth),
      };
      setSnapGuide(snappedRight.snapped !== undefined ? { x: snappedRight.snapped } : null);
      setLayoutDrafts((current) => {
        const previousLayout = current[block.id] || layout;
        const baseline = { ...blockLayouts, ...current };
        const reflowedLayouts = reflowLayoutsAfterHeightChange(baseline, block.id, previousLayout, latestLayout);
        latestLayouts = surfaceMode === 'page'
          ? resolveStackedLayoutCollisions(reflowedLayouts, visibleBlocks.map((item) => item.id))
          : reflowedLayouts;
        return latestLayouts;
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      setSnapGuide(null);
      pushLayoutHistory(startLayouts, latestLayouts);
      persistChangedBlockLayouts(latestLayouts);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp, { once: true });
  }, [blockLayouts, contentWidth, persistChangedBlockLayouts, pushLayoutHistory, snapEnabled, surfaceMode, visibleBlocks]);

  const handlePageSpaceClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const rawX = event.clientX - rect.left - pageOffsetX;
    const rawY = event.clientY - rect.top;
    const availableWidth = Math.max(MIN_BLOCK_WIDTH, contentWidth - rawX);
    const width = Math.min(DEFAULT_PAGE_CONTENT_WIDTH, availableWidth);
    const x = clamp(rawX, 0, Math.max(0, contentWidth - width));
    const y = Math.max(0, rawY);
    activateDraft({ x, y, width, height: DEFAULT_BLOCK_HEIGHT });
  };

  const toggleSurfaceMode = () => {
    setSurfaceMode((current) => current === 'page' ? 'canvas' : 'page');
    setShowAdvancedInsert(false);
    setShowNoteInfo(false);
    setShowMoreActions(false);
    setShowExportPreview(false);
    setSnapGuide(null);
    clearBlockSelection();
  };

  const handleSurfacePointerDown = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('article, aside, button, input, textarea, select, [role="dialog"]')) return;
    clearBlockSelection();
  };

  if (loading || !note) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.chromeWrap}>
        {chromeCollapsed ? (
          <div className={styles.chromeCollapsed}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>
            <button
              className={styles.iconBtn}
              onClick={() => setChromeCollapsed(false)}
              title="Show note tools"
              aria-label="Show note tools"
            >
              <PanelTopOpen size={16} />
            </button>
          </div>
        ) : (
          <div className={styles.noteChrome}>
            <button className={styles.backBtn} onClick={() => navigate(`/projects/${note.course_id}`)}>
              <ArrowLeft size={18} />
              Project
            </button>

            <input
              className={styles.titleInput}
              value={titleDraft}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                void saveTitle();
              }}
              aria-label="Note title"
            />

            <div className={styles.chromeActions}>
              <button
                className={`${styles.modePill} ${surfaceMode === 'canvas' ? styles.modePillActive : ''}`}
                onClick={toggleSurfaceMode}
                title={surfaceMode === 'page' ? 'Switch to open canvas mode' : 'Switch to locked page mode'}
                aria-pressed={surfaceMode === 'canvas'}
              >
                <FileText size={15} />
                {surfaceMode === 'page' ? 'Page' : 'Canvas'}
              </button>
              <button
                className={`${styles.modePill} ${showExportPreview ? styles.modePillActive : ''}`}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowMoreActions(false);
                  setShowExportPreview((value) => !value);
                }}
                title="Preview export boundary"
                aria-pressed={showExportPreview}
              >
                <Eye size={15} />
                Preview
              </button>
              <button
                className={`${styles.modePill} ${layoutMode ? styles.modePillActive : ''}`}
                onClick={() => {
                  setSnapGuide(null);
                  setLayoutMode((value) => !value);
                }}
                title="Toggle layout mode"
                aria-pressed={layoutMode}
              >
                <LayoutDashboard size={15} />
                Layout
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => addToast('info', 'Favorites will become persistent in a later Better Notebook patch')}
                title="Add to favorites"
                aria-label="Add to favorites"
              >
                <Star size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowExportPreview(false);
                  setShowMoreActions(false);
                  setShowNoteInfo((value) => !value);
                }}
                title="View info"
                aria-label="View info"
              >
                <Info size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowExportPreview(false);
                  setShowMoreActions((value) => !value);
                }}
                title="More note actions"
                aria-label="More note actions"
              >
                <MoreHorizontal size={16} />
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  setShowAdvancedInsert(false);
                  setShowNoteInfo(false);
                  setShowMoreActions(false);
                  setShowExportPreview(false);
                  setChromeCollapsed(true);
                }}
                title="Hide note tools"
                aria-label="Hide note tools"
              >
                <PanelTopClose size={16} />
              </button>
            </div>

            {showNoteInfo && (
              <div className={styles.infoPopover}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note info</div>
                    <strong>{note.title || 'Untitled note'}</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={() => setShowNoteInfo(false)} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <dl className={styles.infoGrid}>
                  <div>
                    <dt>Mode</dt>
                    <dd>{surfaceMode === 'page' ? 'Page' : 'Canvas'}</dd>
                  </div>
                  <div>
                    <dt>Blocks</dt>
                    <dd>{sortedBlocks.length}</dd>
                  </div>
                  <div>
                    <dt>Sources</dt>
                    <dd>{sourceReferenceCount}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{note.status}</dd>
                  </div>
                </dl>
                <p className={styles.popoverNote}>
                  Full source, relation, export, and history details will move into the Better Notebook inspector.
                </p>
              </div>
            )}

            {showMoreActions && (
              <div className={`${styles.infoPopover} ${styles.actionsPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Note actions</div>
                    <strong>More</strong>
                  </div>
                  <button className={styles.iconBtn} onClick={() => setShowMoreActions(false)} title="Close">
                    <X size={15} />
                  </button>
                </div>
                <button
                  className={styles.moreAction}
                  onClick={() => {
                    setSnapGuide(null);
                    setSnapEnabled((value) => !value);
                  }}
                >
                  <LayoutDashboard size={15} />
                  <span>Snap alignment</span>
                  <small>
                    {snapEnabled
                      ? 'On: moving and resizing can align to page and neighbor edges.'
                      : 'Off: moving and resizing use free placement.'}
                  </small>
                  <span className={`${styles.togglePill} ${snapEnabled ? styles.togglePillOn : styles.togglePillOff}`}>
                    {snapEnabled ? 'On' : 'Off'}
                  </span>
                </button>
                <p className={styles.popoverNote}>
                  Page settings, history, export, and inspector actions will live here as they become real.
                </p>
              </div>
            )}

            {showExportPreview && (
              <div className={`${styles.infoPopover} ${styles.exportPopover}`}>
                <div className={styles.popoverHeader}>
                  <div>
                    <div className={styles.popoverEyebrow}>Export preview</div>
                    <strong>Boundary seed</strong>
                  </div>
                  <button
                  className={styles.iconBtn}
                  onClick={() => {
                    setShowExportPreview(false);
                  }}
                  title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className={styles.exportStats}>
                  <div>
                    <strong>{exportPreview.included}</strong>
                    <span>Included</span>
                  </div>
                  <div>
                    <strong>{exportPreview.excluded}</strong>
                    <span>Excluded</span>
                  </div>
                  <div>
                    <strong>{exportPreview.aiVisible}</strong>
                    <span>AI visible</span>
                  </div>
                  <div>
                    <strong>{exportPreview.aiHidden}</strong>
                    <span>AI hidden</span>
                  </div>
                </div>
                <div className={styles.previewOverlayControls} aria-label="Preview overlay controls">
                  <div className={styles.previewOverlayControl}>
                    <button
                      type="button"
                      className={`${styles.previewOverlayToggle} ${showPreviewBlockTypes ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
                      onClick={() => setShowPreviewBlockTypes((value) => !value)}
                      aria-label="Toggle block type overlay"
                      aria-pressed={showPreviewBlockTypes}
                      title={showPreviewBlockTypes ? 'Hide block type overlay' : 'Show block type overlay'}
                    >
                      <LayoutDashboard size={20} />
                    </button>
                    <span
                      className={styles.previewOverlayHelp}
                      data-tip="Show or hide block type badges across the page."
                      aria-label="Block type overlay help"
                    >
                      <CircleHelp size={13} />
                    </span>
                  </div>
                  <div className={styles.previewOverlayControl}>
                    <button
                      type="button"
                      className={`${styles.previewOverlayToggle} ${showPreviewAIVisibility ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
                      onClick={() => setShowPreviewAIVisibility((value) => !value)}
                      aria-label="Toggle AI visibility overlay"
                      aria-pressed={showPreviewAIVisibility}
                      title={showPreviewAIVisibility ? 'Hide AI visibility overlay' : 'Show AI visibility overlay'}
                    >
                      {showPreviewAIVisibility ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                    <span
                      className={styles.previewOverlayHelp}
                      data-tip="Show which blocks are visible or hidden from AI context."
                      aria-label="AI visibility overlay help"
                    >
                      <CircleHelp size={13} />
                    </span>
                  </div>
                  <div className={styles.previewOverlayControl}>
                    <button
                      type="button"
                      className={`${styles.previewOverlayToggle} ${showPreviewExportStatus ? styles.previewOverlayToggleOn : styles.previewOverlayToggleOff}`}
                      onClick={() => setShowPreviewExportStatus((value) => !value)}
                      aria-label="Toggle export status overlay"
                      aria-pressed={showPreviewExportStatus}
                      title={showPreviewExportStatus ? 'Hide export status overlay' : 'Show export status overlay'}
                    >
                      {showPreviewExportStatus ? <FileText size={20} /> : <FileX size={20} />}
                    </button>
                    <span
                      className={styles.previewOverlayHelp}
                      data-tip="Show which blocks are included, excluded, or scratch-only."
                      aria-label="Export status overlay help"
                    >
                      <CircleHelp size={13} />
                    </span>
                  </div>
                </div>
                {(exportPreview.crossing > 0 || exportPreview.outside > 0) && (
                  <div className={styles.exportWarning}>
                    {exportPreview.crossing > 0 && <p>{exportPreview.crossing} block crosses the formal page boundary.</p>}
                    {exportPreview.outside > 0 && <p>{exportPreview.outside} block is in the scratch workspace.</p>}
                  </div>
                )}
                <div className={styles.exportPreviewGroups}>
                  {renderExportPreviewGroup('Included in export', exportPreview.includedRows, (row) => `${aiVisibilityLabel(row.aiVisibility)} / ${row.boundary}`)}
                  {renderExportPreviewGroup('Excluded / scratch', exportPreview.excludedRows, (row) => `${aiVisibilityLabel(row.aiVisibility)} / ${row.boundary}`)}
                  {renderExportPreviewGroup('AI visible', exportPreview.aiVisibleRows, (row) => `${exportRoleLabel(row.exportRole)} / ${row.boundary}`)}
                  {renderExportPreviewGroup('AI hidden', exportPreview.aiHiddenRows, (row) => `${exportRoleLabel(row.exportRole)} / ${row.boundary}`)}
                </div>
                <p className={styles.popoverNote}>
                  This is a boundary preview seed, not the final PDF export engine.
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      <div
        className={`${styles.documentShell} ${surfaceMode === 'canvas' ? styles.documentShellCanvas : ''}`}
        onMouseDown={handleSurfacePointerDown}
      >
        {templateWarning && <div className={styles.templateWarning}>{templateWarning}</div>}

        <div className={styles.pageToolRail} aria-label="Page tools">
          <button
            className={styles.pageToolBtn}
            onClick={() => {
              setShowNoteInfo(false);
              setShowMoreActions(false);
              setShowAdvancedInsert((value) => !value);
            }}
            title="Insert block"
            aria-label="Insert block"
          >
            <Plus size={16} />
            Insert
          </button>
        </div>

        {showAdvancedInsert && (
          <aside className={styles.insertPanel} aria-label="Advanced insert panel">
            <div className={styles.popoverHeader}>
              <div>
                <div className={styles.popoverEyebrow}>Block insert</div>
                <strong>Advanced insert</strong>
              </div>
              <button className={styles.iconBtn} onClick={() => setShowAdvancedInsert(false)} title="Close">
                <X size={15} />
              </button>
            </div>
            <p className={styles.popoverNote}>
              Use this when you want to pick a precise block type. The natural path is still clicking the page or typing /.
            </p>
            <div className={styles.addBlock}>
              <select
                className={styles.typeSelect}
                value={newTemplateId}
                onChange={(event) => setNewTemplateId(event.target.value)}
              >
                {insertTemplateGroups.map((group) => (
                  <optgroup key={group.key} label={group.label}>
                    {group.templates.map((template) => (
                      <option key={`${group.key}-${template.template_id}`} value={template.template_id}>
                        {template.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <textarea
                className={styles.newBlockText}
                value={newBlockText}
                onChange={(event) => setNewBlockText(event.target.value)}
                placeholder="Write the block content here."
              />
              <button
                className={styles.addBlockBtn}
                onClick={async () => {
                  const created = await addBlock();
                  if (created) setShowAdvancedInsert(false);
                }}
              >
                <Plus size={16} />
                Add block
              </button>
            </div>
          </aside>
        )}

        {sourceJumpTarget && (
          <div className={styles.sourceJumpPanel}>
            <div className={styles.sourceJumpHeader}>
              <div>
                <div className={styles.sourceJumpEyebrow}>Source snapshot</div>
                <div className={styles.sourceJumpTitle}>{sourceJumpTarget.snapshot.title}</div>
                <div className={styles.sourceJumpMeta}>
                  {sourceJumpTarget.snapshot.source_filename} - {sourceJumpTarget.page.page_label || `p.${sourceJumpTarget.page.page_number}`}
                </div>
              </div>
              <button
                className={styles.iconBtn}
                onClick={() => setSourceJumpTarget(null)}
                title="Close source"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.sourceJumpPage}>
              <div className={styles.sourceJumpPageLabel}>
                Focused source page
                {sourceJumpTarget.focus.page_start ? ` ${sourceJumpTarget.focus.page_start}` : ''}
                {sourceJumpTarget.focus.page_end && sourceJumpTarget.focus.page_end !== sourceJumpTarget.focus.page_start ? `-${sourceJumpTarget.focus.page_end}` : ''}
              </div>
              <p>{sourceJumpTarget.page.text_content}</p>
            </div>
          </div>
        )}

        <section className={`${styles.writingSurface} ${surfaceMode === 'canvas' ? styles.writingSurfaceCanvas : styles.writingSurfacePage}`}>
          <div
            ref={blockListRef}
            className={`${styles.blockList} ${surfaceMode === 'canvas' ? styles.blockListCanvas : styles.blockListPage} ${layoutMode ? styles.layoutMode : ''}`}
            data-canvas-engine-version={noteCanvasRuntime.version}
            data-canvas-engine-route={noteCanvasRuntime.route}
            data-canvas-visible-blocks={noteCanvasRuntime.visibleBlockIds.length}
            data-canvas-page-frame={noteCanvasRuntime.primaryPageFrame?.id || 'none'}
            style={{
              minHeight: pageContentHeight,
              '--formal-page-offset-x': `${pageOffsetX}px`,
              '--formal-page-width': `${primaryPageFrame.width}px`,
              '--canvas-world-width': `${noteCanvasRuntime.world.width}px`,
            } as CSSProperties}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) clearBlockSelection();
            }}
            onDoubleClick={handlePageSpaceClick}
          >
            {surfaceMode === 'canvas' && (
              <>
                <div className={styles.formalPageBoundary} style={{ minHeight: pageContentHeight }} />
                <div className={styles.scratchWorkspaceLabel}>Scratch workspace</div>
              </>
            )}
            {snapGuide?.x !== undefined && (
              <div className={styles.snapGuideVertical} style={{ left: snapGuide.x + pageOffsetX }} />
            )}
            {snapGuide?.y !== undefined && (
              <div className={styles.snapGuideHorizontal} style={{ top: snapGuide.y }} />
            )}
            {visibleBlocks.map((block) => {
              const text = blockTextDrafts[block.id] ?? textFromContent(block);
              const isActive = activeBlockId === block.id || focusBlockId === block.id || selectedBlockId === block.id;
              const layout = blockLayouts[block.id];
              return (
                  <BlockEditor
                  key={block.id}
                  block={block}
                  text={text}
                  layout={layout}
                  fieldDraft={blockFieldDrafts[block.id]}
                  layoutMode={layoutMode}
                  saving={savingBlockId === block.id}
                  active={isActive}
                  autoFocus={focusBlockId === block.id}
                  onFocused={() => {
                    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
                    setSelectedBlockId(block.id);
                    setActiveBlockId(block.id);
                    setFocusBlockId(null);
                  }}
                  onTextChange={(value, caret, anchorElement) => handleBlockTextChange(block.id, value, caret, anchorElement)}
                  onFieldDraftChange={(fieldValues) => {
                    setBlockFieldDrafts((current) => ({ ...current, [block.id]: fieldValues }));
                    const nextText = presentationKindForBlock(block) === 'definition'
                      ? combinedDefinitionText(stringValue(fieldValues.concept_name), stringValue(fieldValues.description))
                      : presentationKindForBlock(block) === 'formula'
                        ? stringValue(fieldValues.latex_input)
                        : text;
                    setBlockTextDrafts((current) => ({ ...current, [block.id]: nextText }));
                  }}
                  onSave={(silent, fieldValues) => saveBlock(block, text, { silent, fieldValues })}
                  onTrash={() => trashBlock(block.id)}
                  onSelect={() => {
                    suppressMeasuredReflowUntilRef.current = Date.now() + LAYOUT_MEASURE_SUPPRESSION_MS;
                    setSelectedBlockId(block.id);
                    setActiveBlockId((current) => current === block.id ? current : null);
                    setFocusBlockId((current) => current === block.id ? current : null);
                  }}
                  onBeginMove={(event) => beginMoveBlock(event, block, layout)}
                  onBeginResize={(event) => beginResizeBlock(event, block, text, layout)}
                  onToggleExportRole={() => toggleBlockExportRole(block, layout)}
                  onToggleAIVisibility={() => toggleBlockAIVisibility(block, layout)}
                  showBlockTypeBadge={showPreviewBlockTypes}
                  showAIStatusBadge={showPreviewAIVisibility}
                  showExportStatusBadge={showPreviewExportStatus}
                  onKeyDown={(event) => handleBlockKeyDown(block, text, event)}
                  onMeasuredHeight={(height) => {
                    const allowActiveFormulaReflow = isActive && presentationKindForBlock(block) === 'formula';
                    if (movingBlockIdRef.current) return;
                    if (!allowActiveFormulaReflow && Date.now() < suppressMeasuredReflowUntilRef.current) return;
                    if (Math.abs(height - layout.height) <= 2) return;
                    setLayoutDrafts((current) => {
                      const previousLayout = current[block.id] || layout;
                      if (Math.abs(height - previousLayout.height) <= 2) return current;
                      const nextLayout = { ...previousLayout, height };
                      const baseline = { ...blockLayouts, ...current };
                      const reflowedLayouts = reflowLayoutsAfterHeightChange(baseline, block.id, previousLayout, nextLayout);
                      return surfaceMode === 'page'
                        ? resolveStackedLayoutCollisions(reflowedLayouts, visibleBlocks.map((item) => item.id))
                        : reflowedLayouts;
                    });
                  }}
                  pageOffsetX={pageOffsetX}
                  anchorsBySourceRef={anchorsBySourceRef}
                  sourceJumpBusy={sourceJumpBusy}
                  onViewSource={handleViewSource}
                />
              );
            })}

            {draftActive && (
              <div
                className={`${styles.block} ${styles.blockBox} ${styles.draftBlock}`}
                style={{
                  left: (draftLayout || defaultDraftLayout).x + pageOffsetX,
                  top: (draftLayout || defaultDraftLayout).y,
                  width: (draftLayout || defaultDraftLayout).width,
                  height: (draftLayout || defaultDraftLayout).height,
                }}
              >
                <textarea
                  ref={draftRef}
                  className={styles.pageTextArea}
                  value={draftText}
                  onChange={(event) => {
                    resizeTextarea(event.currentTarget);
                    const nextHeight = Math.max(DEFAULT_BLOCK_HEIGHT, event.currentTarget.scrollHeight + 34);
                    setDraftLayout((current) => (
                      current ? { ...current, height: nextHeight } : current
                    ));
                    handleDraftChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
                  }}
                  onBlur={() => {
                    if (slashTarget?.target === 'draft') return;
                    if (draftText.trim()) {
                      void persistDraft(draftText);
                    } else {
                      setDraftText('');
                      draftTextRef.current = '';
                      setDraftActive(false);
                      setDraftLayout(null);
                      setSlashTarget(null);
                    }
                  }}
                  onKeyDown={handleDraftKeyDown}
                  placeholder={creatingDraft ? 'Saving block...' : 'Start writing, or type / for blocks'}
                  rows={1}
                />
                <div className={styles.draftHint}>
                  <CornerDownLeft size={13} />
                  Enter for a new line, Ctrl+Enter for the next block.
                </div>
              </div>
            )}

            {slashTarget && (
              <SlashMenu
                commands={slashCommands}
                onSelect={handleSelectSlashCommand}
                anchor={slashTarget.anchor}
              />
            )}

            {!draftActive && sortedBlocks.length === 0 && (
              <button className={styles.emptyPagePrompt} onDoubleClick={() => activateDraft(defaultDraftLayout)}>
                Double-click to start writing
              </button>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

function SlashMenu({
  commands,
  onSelect,
  anchor,
}: {
  commands: NoteSlashCommand[];
  onSelect: (command: NoteSlashCommand) => void;
  anchor: SlashMenuAnchor | null;
}) {
  const grouped = commands.reduce<Record<string, NoteSlashCommand[]>>((acc, command) => {
    acc[command.group] = [...(acc[command.group] || []), command];
    return acc;
  }, {});

  return (
    <div
      className={styles.slashMenu}
      style={anchor ? { left: anchor.x, top: anchor.y } : undefined}
    >
      {commands.length === 0 ? (
        <div className={styles.slashEmpty}>No matching block type</div>
      ) : (
        (Object.keys(grouped) as Array<keyof typeof SLASH_COMMAND_GROUP_LABELS>).map((group) => (
          <div key={group} className={styles.slashGroup}>
            <div className={styles.slashGroupLabel}>{SLASH_COMMAND_GROUP_LABELS[group]}</div>
            {grouped[group].map((command) => (
              <button
                key={command.id}
                className={styles.slashItem}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(command);
                }}
                disabled={Boolean(command.disabledReason)}
                title={command.disabledReason || command.description}
              >
                <span>{command.label}</span>
                <small>{command.disabledReason || command.description}</small>
              </button>
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function BlockEditor({
  block,
  text,
  layout,
  fieldDraft,
  layoutMode,
  pageOffsetX,
  saving,
  active,
  autoFocus,
  onFocused,
  onTextChange,
  onFieldDraftChange,
  onSave,
  onTrash,
  onSelect,
  onBeginMove,
  onBeginResize,
  onToggleExportRole,
  onToggleAIVisibility,
  showBlockTypeBadge,
  showAIStatusBadge,
  showExportStatusBadge,
  onKeyDown,
  onMeasuredHeight,
  anchorsBySourceRef,
  sourceJumpBusy,
  onViewSource,
}: {
  block: NoteBlock;
  text: string;
  layout: BlockBoxLayout;
  fieldDraft?: FieldValueRecord;
  layoutMode: boolean;
  pageOffsetX: number;
  saving: boolean;
  active: boolean;
  autoFocus: boolean;
  onFocused: () => void;
  onTextChange: (value: string, caret: number, anchorElement?: HTMLElement | null) => void;
  onFieldDraftChange: (fieldValues: FieldValueRecord) => void;
  onSave: (silent?: boolean, fieldValues?: FieldValueRecord) => void;
  onTrash: () => void;
  onSelect: () => void;
  onBeginMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onBeginResize: (event: ReactPointerEvent<HTMLElement>) => void;
  onToggleExportRole: () => void;
  onToggleAIVisibility: () => void;
  showBlockTypeBadge: boolean;
  showAIStatusBadge: boolean;
  showExportStatusBadge: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onMeasuredHeight: (height: number) => void;
  anchorsBySourceRef: Record<string, SourceAnchor>;
  sourceJumpBusy: string | null;
  onViewSource: (anchorId: string) => void;
}) {
  const blockContentRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const boundary = getBoundaryKind(layout);
  const exportRole = getEffectiveExportRole(layout);
  const aiVisibility = getEffectiveAIVisibility(layout);
  const presentationKind = presentationKindForBlock(block);
  const definitionFields = presentationKind === 'definition'
    ? definitionFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const formulaFields = presentationKind === 'formula'
    ? formulaFieldsFromBlock(block, fieldDraft ? text : undefined, fieldDraft)
    : null;
  const blockTypeLabel = getNoteBlockTemplateLabel(block.metadata, block.block_type);
  const showContextualTypeBadge = active || showBlockTypeBadge;
  const showStatusBadges = showContextualTypeBadge || showAIStatusBadge || showExportStatusBadge;
  const updateDefinitionDraft = (
    patch: Partial<{ concept_name: string; description: string }>,
    anchorElement?: HTMLElement | null,
  ) => {
    if (!definitionFields) return;
    const nextFields = { ...definitionFields, ...patch };
    const nextText = combinedDefinitionText(nextFields.concept_name, nextFields.description);
    onTextChange(nextText, nextText.length, anchorElement);
    onFieldDraftChange(nextFields);
  };
  const updateFormulaDraft = (
    patch: Partial<{ latex_input: string; formula_name: string; explanation: string }>,
    anchorElement?: HTMLElement | null,
  ) => {
    if (!formulaFields) return;
    const nextFields = { ...formulaFields, ...patch };
    onTextChange(nextFields.latex_input, nextFields.latex_input.length, anchorElement);
    onFieldDraftChange(nextFields);
  };

  useLayoutEffect(() => {
    resizeTextarea(textareaRef.current);
    const element = blockContentRef.current;
    if (!element) {
      onMeasuredHeight(DEFAULT_BLOCK_HEIGHT);
      return undefined;
    }

    const measure = () => onMeasuredHeight(measureBlockContentHeight(element));
    measure();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, layout.width, active, onMeasuredHeight]);

  useEffect(() => {
    if (!autoFocus) return;
    window.setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.selectionStart = textarea.value.length;
      textarea.selectionEnd = textarea.value.length;
      resizeTextarea(textarea);
    }, 0);
  }, [autoFocus]);

  return (
    <article
      className={`${styles.block} ${styles.blockBox} ${layoutMode ? styles.blockBoxLayoutMode : ''} ${active ? styles.blockActive : ''} ${boundary !== 'inside' ? styles.blockScratch : ''}`}
      style={{
        left: layout.x + pageOffsetX,
        top: layout.y,
        width: layout.width,
        minHeight: layout.height,
      }}
      onMouseDown={onSelect}
    >
      {showStatusBadges && (
        <div className={styles.blockStatusBadges}>
          {showContextualTypeBadge && (
            <span className={styles.blockStatusBadge}>{blockTypeLabel}</span>
          )}
          {showAIStatusBadge && (
            <span
              className={`${styles.blockStatusBadge} ${aiVisibility === 'visible' ? styles.blockStatusBadgeOn : styles.blockStatusBadgeMuted}`}
              title={aiVisibilityLabel(aiVisibility)}
            >
              {aiVisibility === 'visible' ? <Eye size={12} /> : <EyeOff size={12} />}
              {aiVisibility === 'visible' ? 'AI' : 'AI hidden'}
            </span>
          )}
          {showExportStatusBadge && (
            <span
              className={`${styles.blockStatusBadge} ${exportRole === 'included' ? styles.blockStatusBadgeOn : styles.blockStatusBadgeMuted}`}
              title={exportRoleLabel(exportRole)}
            >
              {exportRole === 'included' ? <FileText size={12} /> : <FileX size={12} />}
              {exportRoleLabel(exportRole)}
            </span>
          )}
          {showExportStatusBadge && boundary === 'crossing' && (
            <span className={`${styles.blockStatusBadge} ${styles.blockStatusBadgeWarning}`}>Crosses page</span>
          )}
          {showExportStatusBadge && boundary === 'outside' && (
            <span className={`${styles.blockStatusBadge} ${styles.blockStatusBadgeMuted}`}>Page outside</span>
          )}
        </div>
      )}
      <div className={styles.blockToolbar}>
        <div className={styles.blockActions}>
          <button
            className={`${styles.iconBtn} ${styles.dragHandle}`}
            onPointerDown={onBeginMove}
            title="Move block"
            aria-label="Move block"
          >
            <GripVertical size={15} />
          </button>
          <button
            className={`${styles.iconBtn} ${exportRole === 'included' ? styles.policyBtnOn : ''}`}
            onClick={onToggleExportRole}
            title={exportRole === 'included' ? 'Exclude from export' : 'Include in export'}
            aria-label={exportRole === 'included' ? 'Exclude from export' : 'Include in export'}
          >
            <FileText size={15} />
          </button>
          <button
            className={`${styles.iconBtn} ${aiVisibility === 'visible' ? styles.policyBtnOn : ''}`}
            onClick={onToggleAIVisibility}
            title={aiVisibility === 'visible' ? 'Hide from AI context' : 'Allow AI context'}
            aria-label={aiVisibility === 'visible' ? 'Hide from AI context' : 'Allow AI context'}
          >
            <Eye size={15} />
          </button>
          <button className={styles.iconBtn} onClick={() => onSave(false)} disabled={saving} title="Save block">
            <Save size={16} />
          </button>
          <button className={`${styles.iconBtn} ${styles.dangerBtn}`} onClick={onTrash} title="Move to trash">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div ref={blockContentRef}>
        {presentationKind === 'definition' && definitionFields ? (
          <div className={styles.definitionBlock}>
            {active ? (
              <>
                <label className={styles.fieldLabel}>
                  Concept name
                  <input
                    className={styles.fieldInput}
                    value={definitionFields.concept_name}
                    onFocus={onFocused}
                    onChange={(event) => updateDefinitionDraft({ concept_name: event.currentTarget.value }, event.currentTarget)}
                    onBlur={() => onSave(true, definitionFields)}
                    placeholder="Concept name"
                  />
                </label>
                <label className={styles.fieldLabel}>
                  Description
                  <textarea
                    ref={textareaRef}
                    className={`${styles.pageTextArea} ${styles.definitionDescriptionInput}`}
                    value={definitionFields.description}
                    onFocus={onFocused}
                    onChange={(event) => {
                      resizeTextarea(event.currentTarget);
                      updateDefinitionDraft({ description: event.currentTarget.value }, event.currentTarget);
                    }}
                    onBlur={() => onSave(true, definitionFields)}
                    onKeyDown={onKeyDown}
                    placeholder="Write the definition..."
                    rows={1}
                  />
                </label>
              </>
            ) : (
              <>
                <div className={styles.structuredEyebrow}>Definition</div>
                <div className={styles.definitionName}>
                  {definitionFields.concept_name || block.title || 'Untitled concept'}
                </div>
                <div className={styles.definitionDescription}>
                  {definitionFields.description || 'No definition written yet.'}
                </div>
              </>
            )}
          </div>
        ) : presentationKind === 'formula' && formulaFields ? (
          <div className={styles.formulaBlock}>
            {formulaFields.formula_name && <div className={styles.formulaName}>{formulaFields.formula_name}</div>}
            <div className={styles.formulaPreview}>
              {formulaFields.latex_input.trim() ? (
                <KaTeXRenderer text={formulaPreviewText(formulaFields.latex_input)} />
              ) : (
                <span className={styles.emptyStructuredField}>Empty formula</span>
              )}
            </div>
            {active && (
              <label className={styles.fieldLabel}>
                LaTeX input
                <textarea
                  ref={textareaRef}
                  className={`${styles.pageTextArea} ${styles.formulaInput}`}
                  value={formulaFields.latex_input}
                  onFocus={onFocused}
                  onChange={(event) => {
                    resizeTextarea(event.currentTarget);
                    updateFormulaDraft({ latex_input: event.currentTarget.value }, event.currentTarget);
                  }}
                  onBlur={() => onSave(true, formulaFields)}
                  onKeyDown={onKeyDown}
                  placeholder="\\int_a^b f(x)\\,dx"
                  rows={1}
                />
              </label>
            )}
            {formulaFields.explanation && <p className={styles.formulaExplanation}>{formulaFields.explanation}</p>}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            className={`${styles.pageTextArea} ${presentationKind === 'code' ? styles.codeTextArea : ''} ${presentationKind === 'heading' ? styles.headingTextArea : ''} ${presentationKind === 'sourceQuote' ? styles.quoteTextArea : ''}`}
            value={text}
            onFocus={onFocused}
            onChange={(event) => {
              resizeTextarea(event.currentTarget);
              onTextChange(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget);
            }}
            onBlur={() => onSave(true)}
            onKeyDown={onKeyDown}
            rows={1}
          />
        )}

        {block.source_references?.length > 0 && (
          <div className={styles.sources}>
            {block.source_references.map((source, sourceIndex) => {
              const anchor = source.id ? anchorsBySourceRef[source.id] : undefined;
              return (
                <span key={source.id || sourceIndex} className={styles.sourceRef}>
                  <span>
                    Source
                    {source.source_page_start ? ` p.${source.source_page_start}` : ''}
                    {source.source_page_end && source.source_page_end !== source.source_page_start ? `-${source.source_page_end}` : ''}
                  </span>
                  {anchor && (
                    <button
                      type="button"
                      className={styles.sourceRefAction}
                      disabled={sourceJumpBusy === anchor.id}
                      onClick={() => onViewSource(anchor.id)}
                    >
                      <Eye size={13} />
                      View
                    </button>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={styles.resizeHandleRight}
        onPointerDown={onBeginResize}
        title="Resize block"
        aria-label="Resize block"
      />
    </article>
  );
}
