import {
  Eye,
  EyeOff,
  FileText,
  FileX,
} from 'lucide-react';
import {
  aiVisibilityLabel,
  exportRoleLabel,
} from '../exportPreviewService';
import type {
  AIVisibility,
  BoundaryKind,
  ExportRole,
} from '../runtimeLayout';
import styles from '../../NoteDetail.module.css';

interface BlockStatusBadgeLayerProps {
  blockTypeLabel: string;
  boundary: BoundaryKind;
  exportRole: ExportRole;
  aiVisibility: AIVisibility;
  showContextualTypeBadge: boolean;
  showAIStatusBadge: boolean;
  showExportStatusBadge: boolean;
}

export function BlockStatusBadgeLayer({
  blockTypeLabel,
  boundary,
  exportRole,
  aiVisibility,
  showContextualTypeBadge,
  showAIStatusBadge,
  showExportStatusBadge,
}: BlockStatusBadgeLayerProps) {
  const showStatusBadges = showContextualTypeBadge || showAIStatusBadge || showExportStatusBadge;
  if (!showStatusBadges) return null;

  return (
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
  );
}
