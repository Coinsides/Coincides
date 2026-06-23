import type { AnnotationTruthV1 } from '../runtimeDataTypes';
import { annotationVisibleInHierarchy } from '../annotationHierarchyService';
import styles from '../../NoteDetail.module.css';

interface AnnotationOverlayLayerProps {
  annotations: AnnotationTruthV1[];
  selectedAnnotationId: string | null;
  showLabelOverlay: boolean;
}

export function AnnotationOverlayLayer({
  annotations,
  selectedAnnotationId,
  showLabelOverlay,
}: AnnotationOverlayLayerProps) {
  if (!showLabelOverlay) return null;
  const activeCount = annotations.filter((annotation) => annotationVisibleInHierarchy({
    annotation,
    annotations,
  })).length;
  if (activeCount === 0) return null;

  return (
    <div
      className={styles.annotationOverlayLayer}
      data-annotation-count={activeCount}
      data-selected-annotation-id={selectedAnnotationId || ''}
      aria-hidden="true"
    />
  );
}
