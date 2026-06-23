import type {
  AnnotationRangeV1,
} from './runtimeDataTypes';

export const CONTENT_GROUP_DRAG_MIME = 'application/x-coincides-content-item';

export type ContentGroupDragPayload =
  | {
    kind: 'draft_range';
    ranges: AnnotationRangeV1[];
    text_preview?: string | null;
    source_note_id?: string | null;
    label?: string | null;
  }
  | {
    kind: 'draft_ranges';
    ranges: AnnotationRangeV1[];
    text_preview?: string | null;
    source_note_id?: string | null;
    label?: string | null;
  }
  | {
    kind: 'label';
    annotation_id: string;
    label?: string | null;
    ranges?: AnnotationRangeV1[];
    text_preview?: string | null;
    source_note_id?: string | null;
  }
  | {
    kind: 'block';
    block_id: string;
    label?: string | null;
    text_preview?: string | null;
    source_note_id?: string | null;
  };

function isValidRange(range: unknown): range is AnnotationRangeV1 {
  if (!range || typeof range !== 'object') return false;
  const candidate = range as Partial<AnnotationRangeV1>;
  if (typeof candidate.target_kind !== 'string') return false;
  return Boolean(
    candidate.block_id
    || candidate.text_flow_id
    || candidate.canvas_object_id
    || candidate.source_region_id,
  );
}

function validRanges(value: unknown): AnnotationRangeV1[] | null {
  if (!Array.isArray(value)) return null;
  const ranges = value.filter(isValidRange);
  return ranges.length > 0 ? ranges : null;
}

export function writeContentGroupDragPayload(
  dataTransfer: DataTransfer,
  payload: ContentGroupDragPayload,
): void {
  dataTransfer.setData(CONTENT_GROUP_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.setData('text/plain', payload.text_preview || payload.label || 'Content item');
  dataTransfer.effectAllowed = 'copyMove';
}

export function readContentGroupDragPayload(dataTransfer: DataTransfer): ContentGroupDragPayload | null {
  const raw = dataTransfer.getData(CONTENT_GROUP_DRAG_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ContentGroupDragPayload;
    if (parsed.kind === 'draft_range' || parsed.kind === 'draft_ranges') {
      const ranges = validRanges(parsed.ranges);
      return ranges ? { ...parsed, ranges } : null;
    }
    if (parsed.kind === 'label' && typeof parsed.annotation_id === 'string') {
      const ranges = parsed.ranges ? validRanges(parsed.ranges) : undefined;
      return ranges ? { ...parsed, ranges } : parsed;
    }
    if (parsed.kind === 'block' && typeof parsed.block_id === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function hasContentGroupDragPayloadType(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(CONTENT_GROUP_DRAG_MIME);
}

function cleanDragText(value: string | null | undefined): string | null {
  const text = (value || '').trim();
  return text || null;
}

export function plainTextFromContentGroupDragPayload(payload: ContentGroupDragPayload): string {
  if (payload.kind === 'draft_range' || payload.kind === 'draft_ranges') {
    return payload.ranges
      .map((range) => cleanDragText(range.range_text_cache))
      .filter((text): text is string => Boolean(text))
      .join('\n');
  }

  if (payload.kind === 'label') {
    const rangeText = payload.ranges
      ?.map((range) => cleanDragText(range.range_text_cache))
      .filter((text): text is string => Boolean(text))
      .join('\n');
    return cleanDragText(rangeText)
      || cleanDragText(payload.text_preview)
      || cleanDragText(payload.label)
      || '';
  }

  if (payload.kind === 'block') {
    return cleanDragText(payload.text_preview) || cleanDragText(payload.label) || '';
  }

  return '';
}
