import type {
  CanvasObject,
  CanvasObjectPresentationRef,
  CanvasObjectStyleMetadata,
  CanvasObjectStylePresetId,
} from './types';

export const CANVAS_OBJECT_STYLE_METADATA_KEY = 'object_style';
export const DEFAULT_SHAPE_STYLE_PRESET_ID: CanvasObjectStylePresetId = 'shape.default';
export const STICKY_NOTE_STYLE_PRESET_ID: CanvasObjectStylePresetId = 'shape.sticky_note';

const DEFAULT_TEXT_INSET = 10;
const STICKY_TEXT_INSET = 12;

export interface ResolvedCanvasObjectStyle extends CanvasObjectStyleMetadata {
  cssClassName: 'canvasObjectStyleDefaultShape' | 'canvasObjectStyleStickyNote';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  opacity: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTextInset(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(32, Math.max(0, Math.round(value)));
}

export function normalizeCanvasObjectStyleMetadata(value: unknown): CanvasObjectStyleMetadata {
  if (!isRecord(value)) {
    return {
      presetId: DEFAULT_SHAPE_STYLE_PRESET_ID,
      family: 'shape',
      variant: 'default',
      textInset: DEFAULT_TEXT_INSET,
    };
  }

  const presetId = value.preset_id === STICKY_NOTE_STYLE_PRESET_ID
    ? STICKY_NOTE_STYLE_PRESET_ID
    : DEFAULT_SHAPE_STYLE_PRESET_ID;
  if (presetId === STICKY_NOTE_STYLE_PRESET_ID) {
    return {
      presetId,
      family: 'shape',
      variant: 'yellow',
      textInset: normalizeTextInset(value.text_inset, STICKY_TEXT_INSET),
    };
  }

  return {
    presetId: DEFAULT_SHAPE_STYLE_PRESET_ID,
    family: 'shape',
    variant: 'default',
    textInset: normalizeTextInset(value.text_inset, DEFAULT_TEXT_INSET),
  };
}

export function readCanvasObjectStyleMetadata(
  metadata: Record<string, unknown> | null | undefined,
): CanvasObjectStyleMetadata {
  return normalizeCanvasObjectStyleMetadata(metadata?.[CANVAS_OBJECT_STYLE_METADATA_KEY]);
}

export function serializeCanvasObjectStyleMetadata(
  style: CanvasObjectStyleMetadata,
): Record<string, unknown> {
  return {
    preset_id: style.presetId,
    family: style.family,
    variant: style.variant,
    text_inset: style.textInset,
  };
}

export function writeCanvasObjectStyleMetadata(
  metadata: Record<string, unknown> | null | undefined,
  style: CanvasObjectStyleMetadata,
): Record<string, unknown> {
  return {
    ...(metadata || {}),
    [CANVAS_OBJECT_STYLE_METADATA_KEY]: serializeCanvasObjectStyleMetadata(style),
  };
}

export function ensureDefaultShapeStyle(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return writeCanvasObjectStyleMetadata(metadata, {
    presetId: DEFAULT_SHAPE_STYLE_PRESET_ID,
    family: 'shape',
    variant: 'default',
    textInset: DEFAULT_TEXT_INSET,
  });
}

export function ensureDefaultStyleForPureShape(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return ensureDefaultShapeStyle(metadata);
}

export function ensureStickyStyleForBlockBackedShape(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return writeCanvasObjectStyleMetadata(metadata, {
    presetId: STICKY_NOTE_STYLE_PRESET_ID,
    family: 'shape',
    variant: 'yellow',
    textInset: STICKY_TEXT_INSET,
  });
}

export function isStickyNoteCanvasObject(object: CanvasObject | null | undefined): boolean {
  if (!object || object.kind !== 'shape') return false;
  if (object.backing !== 'note_block' || object.objectClass !== 'block_backed') return false;
  return readCanvasObjectStyleMetadata(object.metadata).presetId === STICKY_NOTE_STYLE_PRESET_ID;
}

export function resolveCanvasObjectStyle(
  object: CanvasObject | null | undefined,
): ResolvedCanvasObjectStyle {
  const style = readCanvasObjectStyleMetadata(object?.metadata);
  if (style.presetId === STICKY_NOTE_STYLE_PRESET_ID) {
    return {
      ...style,
      cssClassName: 'canvasObjectStyleStickyNote',
      fill: 'var(--canvas-sticky-note-fill, #2f2817)',
      stroke: 'var(--canvas-sticky-note-stroke, #d8a429)',
      strokeWidth: 1,
      borderRadius: 7,
      opacity: 1,
    };
  }

  return {
    ...style,
    cssClassName: 'canvasObjectStyleDefaultShape',
    fill: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
    stroke: 'color-mix(in srgb, var(--accent-primary) 70%, var(--border-default))',
    strokeWidth: 2,
    borderRadius: 8,
    opacity: 1,
  };
}

export function createCanvasObjectPresentationRef(
  object: CanvasObject | null | undefined,
  textBacked: boolean,
): CanvasObjectPresentationRef | undefined {
  if (!object || object.kind !== 'shape') return undefined;
  const style = readCanvasObjectStyleMetadata(object.metadata);
  return {
    presetId: style.presetId,
    family: style.family,
    variant: style.variant,
    textBacked,
    textInset: style.textInset,
  };
}
