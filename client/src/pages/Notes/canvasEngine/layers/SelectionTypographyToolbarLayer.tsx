import {
  RotateCcw,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  type ChangeEvent,
  type MouseEvent,
} from 'react';
import { placeSelectionToolbar } from '../overlayService';
import type { CapturedSelectionRange } from '../selectionRangeService';
import type { DocumentTypographyProfile } from '../types';
import {
  DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE,
  DOCUMENT_FONT_FAMILY_OPTIONS,
  DOCUMENT_TYPOGRAPHY_LIMITS,
  patchDocumentTypographyProfile,
} from '../typographyProfileService';
import styles from '../../NoteDetail.module.css';

interface SelectionTypographyToolbarLayerProps {
  selection: {
    range: CapturedSelectionRange;
    anchorRect: DOMRect;
  } | null;
  typographyProfile: DocumentTypographyProfile;
  onSaveTypographyProfile: (profile: DocumentTypographyProfile) => void | Promise<void>;
  onClose: () => void;
  onCopyBoardReference?: () => void | Promise<void>;
}

export function SelectionTypographyToolbarLayer({
  selection,
  typographyProfile,
  onSaveTypographyProfile,
  onClose,
  onCopyBoardReference,
}: SelectionTypographyToolbarLayerProps) {
  const savePatch = useCallback((patch: Partial<DocumentTypographyProfile>) => {
    const nextProfile = patchDocumentTypographyProfile(typographyProfile, patch);
    void onSaveTypographyProfile(nextProfile);
  }, [onSaveTypographyProfile, typographyProfile]);

  const handleFontFamilyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    savePatch({ fontFamily: event.currentTarget.value });
  }, [savePatch]);

  const handleFontSizeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    savePatch({ fontSizePx: Number(event.currentTarget.value) });
  }, [savePatch]);

  const handleLineHeightChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    savePatch({ lineHeightPx: Number(event.currentTarget.value) });
  }, [savePatch]);

  const handleParagraphSpacingChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    savePatch({ paragraphSpacingPx: Number(event.currentTarget.value) });
  }, [savePatch]);

  const handleReset = useCallback(() => {
    void onSaveTypographyProfile(DEFAULT_DOCUMENT_TYPOGRAPHY_PROFILE);
  }, [onSaveTypographyProfile]);

  const handleToolbarMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (
      target instanceof HTMLElement
      && target.closest('input, select')
    ) {
      return;
    }
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!selection) return undefined;
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selection]);

  if (!selection) return null;

  const placement = placeSelectionToolbar({
    anchorRect: selection.anchorRect,
    toolbarWidth: onCopyBoardReference ? 710 : 520,
    toolbarHeight: 44,
  });
  const minimumLineHeightPx = Math.max(
    typographyProfile.fontSizePx + 2,
    DOCUMENT_TYPOGRAPHY_LIMITS.minLineHeightPx,
  );

  return (
    <div
      className={styles.selectionTypographyToolbar}
      style={{ left: placement.x, top: placement.y }}
      role="toolbar"
      aria-label="Selection typography toolbar"
      data-selection-typography-toolbar="true"
      data-selection-typography-scope="document"
      onMouseDown={handleToolbarMouseDown}
    >
      {onCopyBoardReference && (
        <button
          type="button"
          className={`${styles.selectionTypographyButton} ${styles.selectionBoardReferenceButton}`}
          onClick={() => { void onCopyBoardReference(); }}
        >
          Copy as board reference
        </button>
      )}
      <span className={styles.selectionTypographyScope}>Document typography</span>
      <select
        className={styles.selectionTypographySelect}
        value={typographyProfile.fontFamily}
        onChange={handleFontFamilyChange}
        aria-label="Document font family"
        data-selection-typography-font-family="true"
      >
        {DOCUMENT_FONT_FAMILY_OPTIONS.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        className={styles.selectionTypographyNumber}
        type="number"
        min={DOCUMENT_TYPOGRAPHY_LIMITS.minFontSizePx}
        max={DOCUMENT_TYPOGRAPHY_LIMITS.maxFontSizePx}
        step={1}
        value={typographyProfile.fontSizePx}
        onChange={handleFontSizeChange}
        aria-label="Document font size"
        data-selection-typography-font-size="true"
      />
      <input
        className={styles.selectionTypographyNumber}
        type="number"
        min={minimumLineHeightPx}
        max={DOCUMENT_TYPOGRAPHY_LIMITS.maxLineHeightPx}
        step={1}
        value={typographyProfile.lineHeightPx}
        onChange={handleLineHeightChange}
        aria-label="Document line height"
        data-selection-typography-line-height="true"
      />
      <input
        className={styles.selectionTypographyNumber}
        type="number"
        min={DOCUMENT_TYPOGRAPHY_LIMITS.minParagraphSpacingPx}
        max={DOCUMENT_TYPOGRAPHY_LIMITS.maxParagraphSpacingPx}
        step={1}
        value={typographyProfile.paragraphSpacingPx}
        onChange={handleParagraphSpacingChange}
        aria-label="Document paragraph spacing"
        data-selection-typography-paragraph-spacing="true"
      />
      <button
        type="button"
        className={styles.selectionTypographyButton}
        onClick={handleReset}
        aria-label="Reset document typography"
      >
        <RotateCcw size={13} />
      </button>
      <button
        type="button"
        className={styles.selectionTypographyButton}
        onClick={onClose}
        aria-label="Close typography toolbar"
      >
        <X size={13} />
      </button>
    </div>
  );
}
