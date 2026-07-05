import {
  Eye,
  EyeOff,
  Trash2,
  X,
} from 'lucide-react';
import {
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type SyntheticEvent,
} from 'react';
import type {
  AnnotationRangeV1,
  AnnotationTruthV1,
} from '../runtimeDataTypes';
import {
  getChildAnnotations,
  resolveAnnotationInspectorRootIds,
} from '../annotationEditorService';
import {
  ANNOTATION_COLOR_OPTIONS,
  annotationColorForToken,
} from '../annotationColorService';
import {
  annotationRangeIsRenderable,
} from '../annotationDisplayService';
import {
  buildAnnotationRangePreviewMenu,
  type CommandActionId,
  type CommandSurfaceMenu,
} from '../commandSurfaceService';
import { ContextMenuLayer } from '../layers/ContextMenuLayer';
import styles from '../../NoteDetail.module.css';

interface AnnotationInspectorPanelProps {
  annotations: AnnotationTruthV1[];
  selectedAnnotationIds: string[];
  onClose: () => void;
  onDelete: (annotationId: string) => void | Promise<void>;
  onRename: (annotationId: string, label: string) => void | Promise<void>;
  onUpdateColor: (annotationId: string, colorToken: string) => void | Promise<void>;
  onHide: (annotationId: string) => void | Promise<void>;
  onRestore: (annotationId: string) => void | Promise<void>;
  onEditRangeText: (input: {
    annotationId: string;
    rangeId: string;
    nextText: string;
  }) => void | Promise<void>;
}

interface AnnotationColorPaletteProps {
  annotation: AnnotationTruthV1;
  onUpdateColor: (annotationId: string, colorToken: string) => void | Promise<void>;
}

function rangePreview(range: AnnotationRangeV1): string {
  const cachedText = range.range_text_cache;
  return cachedText && cachedText.length > 0 ? cachedText : `${range.target_kind} range`;
}

function rangePreviewRows(text: string): number {
  const hardLineCount = text.split(/\r\n|\r|\n/).length;
  const softLineCount = Math.ceil(text.length / 48);
  return Math.max(1, Math.min(4, Math.max(hardLineCount, softLineCount)));
}

function isEditableTextRange(range: AnnotationRangeV1): boolean {
  return (
    (range.target_kind === 'text_span' || range.target_kind === 'text_unit')
    && Boolean(range.block_id && range.text_flow_id && range.text_unit_id)
  );
}

function AnnotationColorPalette({
  annotation,
  onUpdateColor,
}: AnnotationColorPaletteProps) {
  const activeColor = annotationColorForToken(annotation.visual_style.color_token);
  return (
    <div className={styles.annotationColorPalette} aria-label={`${annotation.raw_label} color`}>
      <div>
        {ANNOTATION_COLOR_OPTIONS.map((option) => (
          <button
            key={option.token}
            type="button"
            className={[
              styles.annotationColorSwatch,
              option.token === activeColor.token ? styles.annotationColorSwatchSelected : '',
            ].filter(Boolean).join(' ')}
            style={{
              '--annotation-swatch-accent': option.accent,
              '--annotation-swatch-bg': option.background,
            } as CSSProperties}
            onClick={() => void onUpdateColor(annotation.id, option.token)}
            aria-label={`Set annotation color ${option.label}`}
            title={option.label}
          />
        ))}
      </div>
    </div>
  );
}

export function AnnotationInspectorPanel({
  annotations,
  selectedAnnotationIds,
  onClose,
  onDelete,
  onRename,
  onUpdateColor,
  onHide,
  onRestore,
  onEditRangeText,
}: AnnotationInspectorPanelProps) {
  const selectedRootAnnotationIds = resolveAnnotationInspectorRootIds({
    annotations,
    selectedAnnotationIds,
  });
  const selectedAnnotations = selectedRootAnnotationIds
    .map((id) => annotations.find((annotation) => annotation.id === id && annotation.status !== 'deleted'))
    .filter((annotation): annotation is AnnotationTruthV1 => Boolean(annotation));
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});
  const [rangeDrafts, setRangeDrafts] = useState<Record<string, string>>({});
  const [activeRootAnnotationId, setActiveRootAnnotationId] = useState<string | null>(null);
  const [rangeContextMenu, setRangeContextMenu] = useState<{
    annotationId: string;
    rangeId: string;
    point: { x: number; y: number };
  } | null>(null);

  const stopInspectorEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    selectedAnnotations.forEach((annotation) => {
      nextDrafts[annotation.id] = annotation.raw_label;
      getChildAnnotations({ parent: annotation, annotations, includeHidden: true }).forEach((child) => {
        nextDrafts[child.id] = child.raw_label;
      });
    });
    setLabelDrafts(nextDrafts);
  }, [selectedRootAnnotationIds.join('|'), annotations]);

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    selectedAnnotations.forEach((annotation) => {
      annotation.ranges.forEach((range) => {
        nextDrafts[range.id] = rangePreview(range);
      });
      getChildAnnotations({ parent: annotation, annotations, includeHidden: true }).forEach((child) => {
        child.ranges.forEach((range) => {
          nextDrafts[range.id] = rangePreview(range);
        });
      });
    });
    setRangeDrafts(nextDrafts);
  }, [selectedRootAnnotationIds.join('|'), annotations]);

  useEffect(() => {
    const firstAnnotationId = selectedAnnotations[0]?.id || null;
    if (!firstAnnotationId) {
      setActiveRootAnnotationId(null);
      return;
    }
    setActiveRootAnnotationId((current) => (
      current && selectedAnnotations.some((annotation) => annotation.id === current)
        ? current
        : firstAnnotationId
    ));
  }, [selectedRootAnnotationIds.join('|')]);

  useEffect(() => {
    if (selectedAnnotations.length === 0) return undefined;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedAnnotations.length]);

  if (selectedAnnotations.length === 0) return null;

  const handleRename = async (annotation: AnnotationTruthV1) => {
    const label = labelDrafts[annotation.id]?.trim() || '';
    if (!label || label === annotation.raw_label) return;
    await onRename(annotation.id, label);
  };

  const handleInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    annotation: AnnotationTruthV1,
  ) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void handleRename(annotation);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const handleRangePreviewContextMenu = (
    event: ReactMouseEvent<HTMLElement | HTMLTextAreaElement>,
    annotation: AnnotationTruthV1,
    range: AnnotationRangeV1,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setRangeContextMenu({
      annotationId: annotation.id,
      rangeId: range.id,
      point: { x: event.clientX, y: event.clientY },
    });
  };

  const handleRangeTextCommit = async (
    annotation: AnnotationTruthV1,
    range: AnnotationRangeV1,
  ) => {
    const nextText = rangeDrafts[range.id] ?? rangePreview(range);
    if (nextText === rangePreview(range)) return;
    await onEditRangeText({
      annotationId: annotation.id,
      rangeId: range.id,
      nextText,
    });
  };

  const handleRangePreviewCommand = async (actionId: CommandActionId) => {
    const annotation = annotations.find((item) => item.id === rangeContextMenu?.annotationId);
    const range = annotation?.ranges.find((item) => item.id === rangeContextMenu?.rangeId);
    if (!annotation || !range) return;

    if (actionId === 'copy') {
      const text = rangeDrafts[range.id] ?? rangePreview(range);
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        // Clipboard can be unavailable in local browser harness contexts.
      }
      return;
    }
  };

  const renderLabelInput = (annotation: AnnotationTruthV1, ariaLabel: string) => (
    <input
      className={styles.annotationLabelInput}
      value={labelDrafts[annotation.id] ?? annotation.raw_label}
      onChange={(event) => {
        const { value } = event.currentTarget;
        setLabelDrafts((current) => ({
          ...current,
          [annotation.id]: value,
        }));
      }}
      onBlur={() => void handleRename(annotation)}
      onKeyDown={(event) => handleInputKeyDown(event, annotation)}
      aria-label={ariaLabel}
    />
  );

  const renderAnnotationActions = (annotation: AnnotationTruthV1) => (
    <div className={styles.annotationInspectorIconActions}>
      {annotation.status === 'hidden' ? (
        <button type="button" className={styles.iconBtn} onClick={() => void onRestore(annotation.id)} aria-label="Show annotation">
          <Eye size={14} />
        </button>
      ) : (
        <button type="button" className={styles.iconBtn} onClick={() => void onHide(annotation.id)} aria-label="Hide annotation">
          <EyeOff size={14} />
        </button>
      )}
      <button
        type="button"
        className={`${styles.iconBtn} ${styles.annotationDeleteButton}`}
        onClick={() => void onDelete(annotation.id)}
        aria-label="Delete annotation"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );

  const renderRangeList = (annotation: AnnotationTruthV1) => (
    <div className={styles.annotationRangeList}>
      {annotation.ranges.map((range, index) => {
        const preview = rangePreview(range);
        const draftValue = rangeDrafts[range.id] ?? preview;
        const rangeRenderable = annotationRangeIsRenderable(range);
        return (
          <div key={`${annotation.id}-${range.id || index}`} className={styles.annotationRangeRow}>
            {!rangeRenderable && (
              <span className={styles.annotationRangeNeedsReview}>
                Needs review
              </span>
            )}
            {isEditableTextRange(range) ? (
              <textarea
                className={styles.annotationRangePreview}
                value={draftValue}
                rows={rangePreviewRows(draftValue)}
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  setRangeDrafts((current) => ({ ...current, [range.id]: value }));
                }}
                onBlur={() => void handleRangeTextCommit(annotation, range)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleRangeTextCommit(annotation, range);
                    event.currentTarget.blur();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setRangeDrafts((current) => ({ ...current, [range.id]: preview }));
                    event.currentTarget.blur();
                  }
                }}
                onContextMenu={(event) => handleRangePreviewContextMenu(event, annotation, range)}
                title="Edit source text."
              />
            ) : (
              <div
                className={styles.annotationRangePreview}
                onContextMenu={(event) => handleRangePreviewContextMenu(event, annotation, range)}
                title="Annotation range preview"
              >
                {preview}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const activeAnnotation = selectedAnnotations.find((annotation) => annotation.id === activeRootAnnotationId)
    || selectedAnnotations[0];
  const annotationRangePreviewMenu: CommandSurfaceMenu | null = rangeContextMenu ? {
    id: `annotation-range-preview-menu-${rangeContextMenu.annotationId}-${rangeContextMenu.rangeId}`,
    kind: 'annotation_range_preview',
    point: rangeContextMenu.point,
    title: 'Range',
    items: buildAnnotationRangePreviewMenu(),
  } : null;

  return (
    <aside
      className={styles.annotationInspector}
      aria-label="Annotation inspector"
      role="dialog"
      onPointerDown={stopInspectorEvent}
      onMouseDown={stopInspectorEvent}
      onClick={stopInspectorEvent}
      onDoubleClick={stopInspectorEvent}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className={styles.annotationInspectorHeader}>
        <strong>Annotation stack</strong>
        <div className={styles.annotationInspectorIconActions}>
          <button type="button" className={styles.iconBtn} onClick={onClose} aria-label="Close annotation inspector">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className={styles.annotationStackList}>
        {selectedAnnotations.map((annotation) => {
          const children = getChildAnnotations({ parent: annotation, annotations, includeHidden: true });
          const annotationColor = annotationColorForToken(annotation.visual_style.color_token);
          const expanded = annotation.id === activeAnnotation.id;
          if (!expanded) {
            return (
              <button
                key={annotation.id}
                type="button"
                className={styles.annotationStackSummary}
                onClick={() => setActiveRootAnnotationId(annotation.id)}
                style={{
                  '--annotation-summary-accent': annotationColor.accent,
                  '--annotation-summary-bg': annotationColor.background,
                } as CSSProperties}
              >
                <span>{annotation.raw_label}</span>
              </button>
            );
          }

          return (
            <section key={annotation.id} className={styles.annotationStackCard}>
              <div className={styles.annotationCardHeader}>
                <div className={styles.annotationLabelEditRow}>
                  <span
                    className={styles.annotationColorDot}
                    style={{ '--annotation-summary-accent': annotationColor.accent } as CSSProperties}
                    aria-hidden="true"
                  />
                  {renderLabelInput(annotation, 'Label name')}
                </div>
                {renderAnnotationActions(annotation)}
              </div>
              <AnnotationColorPalette annotation={annotation} onUpdateColor={onUpdateColor} />
              {renderRangeList(annotation)}

              {children.length > 0 && (
                <div className={styles.annotationChildrenList}>
                  {children.map((child) => {
                    const childColor = annotationColorForToken(child.visual_style.color_token);
                    return (
                    <section
                      key={child.id}
                      className={[
                        styles.annotationChildCard,
                        selectedAnnotationIds.includes(child.id) ? styles.annotationChildCardFocused : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className={styles.annotationChildHeader}>
                        <div className={styles.annotationLabelEditRow}>
                          <span
                            className={styles.annotationColorDot}
                            style={{ '--annotation-summary-accent': childColor.accent } as CSSProperties}
                            aria-hidden="true"
                          />
                          {renderLabelInput(child, 'Child annotation label')}
                        </div>
                        {renderAnnotationActions(child)}
                      </div>
                      <AnnotationColorPalette annotation={child} onUpdateColor={onUpdateColor} />
                      {renderRangeList(child)}
                    </section>
                    );
                  })}
                </div>
              )}

              <details className={styles.annotationInspectorDetails}>
                <summary>Details</summary>
                <dl className={styles.annotationInspectorMeta}>
                  <div>
                    <dt>Created by</dt>
                    <dd>{annotation.created_by}</dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{annotation.status}</dd>
                  </div>
                  <div>
                    <dt>Ranges</dt>
                    <dd>{annotation.ranges.length}</dd>
                  </div>
                  <div>
                    <dt>Children</dt>
                    <dd>{children.length}</dd>
                  </div>
                </dl>
              </details>
            </section>
          );
        })}
      </div>
      <ContextMenuLayer
        menu={annotationRangePreviewMenu}
        onClose={() => setRangeContextMenu(null)}
        onAction={(actionId) => handleRangePreviewCommand(actionId)}
      />
    </aside>
  );
}
