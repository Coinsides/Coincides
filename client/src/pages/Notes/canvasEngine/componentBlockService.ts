import type { NoteBlock } from './runtimeDataTypes';
import type { DocumentTypographyProfile } from './types';

/** B2 built-ins are data-backed blocks; their presentation never changes TextFlow truth. */
export type BuiltinComponentKind = 'timeline' | 'chart_bar' | 'chart_line';
export type TimelineComponentParams = {
  title?: string;
  entries: { year: string; label: string; detail?: string }[];
};
export type ChartComponentParams = {
  title?: string;
  x_labels: string[];
  series: { name: string; values: number[] }[];
  y_label?: string;
};
export type ComponentBlockPayload = { component_kind: string; params: Record<string, unknown> };
export type KnownTimelineComponentPayload = { component_kind: 'timeline'; params: TimelineComponentParams };
export type KnownChartComponentPayload = { component_kind: 'chart_bar' | 'chart_line'; params: ChartComponentParams };

/** Hand-maintained closed set. No discovery, dynamic imports or user-supplied renderers. */
export const BUILTIN_COMPONENT_KINDS: readonly BuiltinComponentKind[] = ['timeline', 'chart_bar', 'chart_line'];
export const TIMELINE_MAX_ENTRIES = 64;
export const CHART_MAX_SERIES = 4;
export const CHART_MAX_POINTS = 32;
export const COMPONENT_MAX_CHARACTERS = 65_536;
export const COMPONENT_MAX_KIND_LENGTH = 128;

export function isBuiltinComponentKind(kind: string): kind is BuiltinComponentKind {
  return BUILTIN_COMPONENT_KINDS.includes(kind as BuiltinComponentKind);
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function componentBlockValidationError(value: unknown): string | null {
  if (!record(value) || !onlyKeys(value, ['component_kind', 'params'])) {
    return 'Component content supports only component_kind and params.';
  }
  if (typeof value.component_kind !== 'string' || !value.component_kind.trim()
    || value.component_kind.length > COMPONENT_MAX_KIND_LENGTH) return 'Use a component kind of 1–128 characters.';
  if (!record(value.params)) return 'Component params must be an object.';
  const params = value.params;
  const kind = value.component_kind;
  if (!BUILTIN_COMPONENT_KINDS.includes(kind as BuiltinComponentKind)) return null;
  if (params.title !== undefined && typeof params.title !== 'string') return 'The title must be plain text.';
  let characters = typeof params.title === 'string' ? params.title.length : 0;
  if (kind === 'timeline') {
    if (!onlyKeys(params, ['title', 'entries'])) return 'Timeline params support only title and entries.';
    if (!Array.isArray(params.entries) || params.entries.length < 1 || params.entries.length > TIMELINE_MAX_ENTRIES) {
      return `Use 1–${TIMELINE_MAX_ENTRIES} timeline entries.`;
    }
    for (const entry of params.entries) {
      if (!record(entry) || !onlyKeys(entry, ['year', 'label', 'detail'])
        || typeof entry.year !== 'string' || typeof entry.label !== 'string'
        || (entry.detail !== undefined && typeof entry.detail !== 'string')) {
        return 'Each timeline entry needs plain text year and label, with optional detail.';
      }
      characters += entry.year.length + entry.label.length + (typeof entry.detail === 'string' ? entry.detail.length : 0);
    }
  } else {
    if (!onlyKeys(params, ['title', 'x_labels', 'series', 'y_label'])) {
      return 'Chart params support only title, x_labels, series and y_label.';
    }
    if (params.y_label !== undefined && typeof params.y_label !== 'string') return 'The axis label must be plain text.';
    if (!Array.isArray(params.x_labels) || params.x_labels.length < 1 || params.x_labels.length > CHART_MAX_POINTS
      || !params.x_labels.every((label) => typeof label === 'string')) return `Use 1–${CHART_MAX_POINTS} plain text x labels.`;
    if (!Array.isArray(params.series) || params.series.length < 1 || params.series.length > CHART_MAX_SERIES) {
      return `Use 1–${CHART_MAX_SERIES} chart series.`;
    }
    characters += (typeof params.y_label === 'string' ? params.y_label.length : 0)
      + params.x_labels.reduce((sum: number, label: string) => sum + label.length, 0);
    for (const series of params.series) {
      if (!record(series) || !onlyKeys(series, ['name', 'values']) || typeof series.name !== 'string'
        || !Array.isArray(series.values) || series.values.length !== params.x_labels.length
        || !series.values.every((number) => typeof number === 'number' && Number.isFinite(number))) {
        return 'Each series needs a plain text name and one finite number for every x label.';
      }
      characters += series.name.length;
    }
  }
  return characters > COMPONENT_MAX_CHARACTERS
    ? `Component text exceeds ${COMPONENT_MAX_CHARACTERS.toLocaleString('en-US')} UTF-16 characters.` : null;
}

export function isTimelineComponentPayload(payload: ComponentBlockPayload): payload is KnownTimelineComponentPayload {
  return payload.component_kind === 'timeline' && componentBlockValidationError(payload) === null;
}
export function isChartComponentPayload(payload: ComponentBlockPayload): payload is KnownChartComponentPayload {
  return (payload.component_kind === 'chart_bar' || payload.component_kind === 'chart_line')
    && componentBlockValidationError(payload) === null;
}
export function readComponentBlockPayload(block: Pick<NoteBlock, 'block_type' | 'content_json'>): ComponentBlockPayload | null {
  if (block.block_type !== 'component' || componentBlockValidationError(block.content_json)) return null;
  return block.content_json as unknown as ComponentBlockPayload;
}
export function createDefaultComponentBlockPayload(kind: BuiltinComponentKind = 'timeline'): ComponentBlockPayload {
  return kind === 'timeline'
    ? { component_kind: kind, params: { entries: [{ year: '', label: '' }] } }
    : { component_kind: kind, params: { x_labels: ['Period 1', 'Period 2'], series: [{ name: 'Series 1', values: [0, 0] }] } };
}
export function cloneComponentBlockPayload<T extends ComponentBlockPayload>(payload: T): T {
  return structuredClone(payload);
}

/** Existing search and read_note text slot share this intentionally flat projection. */
export function componentBlockPlainText(payload: ComponentBlockPayload): string {
  const flatten = (value: string) => value.replace(/\r\n|[\t\r\n]/g, ' ');
  if (isTimelineComponentPayload(payload)) return [
    ...(payload.params.title ? [flatten(payload.params.title)] : []),
    ...payload.params.entries.map((entry) => [entry.year, entry.label, ...(entry.detail !== undefined ? [entry.detail] : [])]
      .map(flatten).join('\t')),
  ].join('\n');
  if (isChartComponentPayload(payload)) return [
    ...(payload.params.title ? [flatten(payload.params.title)] : []),
    ...(payload.params.y_label ? [flatten(payload.params.y_label)] : []),
    payload.params.x_labels.map(flatten).join('\t'),
    ...payload.params.series.map((series) => [flatten(series.name), ...series.values.map(String)].join('\t')),
  ].join('\n');
  return `${flatten(payload.component_kind)}\n未注册组件`;
}

/** Initial estimate; the B1 DOM measurement path supplies actual presentation height. */
export function estimateComponentBlockHeight(payload: ComponentBlockPayload, width: number,
  typography?: Pick<DocumentTypographyProfile, 'fontSizePx' | 'lineHeightPx'>): number {
  const fontSize = typography?.fontSizePx ?? 15;
  const lineHeight = typography?.lineHeightPx ?? 22;
  const lines = (text: string, available: number) => text.split(/\r\n?|\n/).reduce((sum, line) => sum
    + Math.max(1, Math.ceil(Array.from(line).reduce((length, character) => length
      + (character.codePointAt(0)! > 255 ? fontSize : fontSize * 0.55), 0) / Math.max(fontSize, available))), 0);
  const title = typeof payload.params.title === 'string' && payload.params.title
    ? lines(payload.params.title, width) * lineHeight + 12 : 0;
  if (isTimelineComponentPayload(payload)) return Math.ceil(title + payload.params.entries.reduce((height, entry) => height
    + Math.max(lines(entry.year, 70), lines(entry.label, width - 100)) * lineHeight + 20, 0));
  if (isChartComponentPayload(payload)) return Math.ceil(title + 360 + payload.params.series.length * lineHeight);
  return lineHeight * 2 + 24;
}
