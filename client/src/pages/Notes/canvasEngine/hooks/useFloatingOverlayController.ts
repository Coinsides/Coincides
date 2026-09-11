import {
  useCallback,
  useState,
} from 'react';
import {
  idleInteraction,
  openingMenuInteraction,
  previewingInteraction,
  type RuntimeInteractionState,
} from '../interactionController';

export type FloatingOverlayPanel = 'layout' | 'moreActions' | 'blockTrash' | 'preview' | 'viewOptions';

export interface UseFloatingOverlayControllerOptions {
  setInteractionState: (state: RuntimeInteractionState) => void;
}

export function useFloatingOverlayController({
  setInteractionState,
}: UseFloatingOverlayControllerOptions) {
  const [activeOverlay, setActiveOverlay] = useState<FloatingOverlayPanel | null>(null);
  const [showPreviewBlockTypes, setShowPreviewBlockTypes] = useState(false);
  const [showPreviewAIVisibility, setShowPreviewAIVisibility] = useState(false);
  const [showPreviewExportStatus, setShowPreviewExportStatus] = useState(false);
  const [showPreviewLabelOverlay, setShowPreviewLabelOverlay] = useState(true);

  const setOverlay = useCallback((panel: FloatingOverlayPanel | null) => {
    setActiveOverlay(panel);
    if (!panel) {
      setInteractionState(idleInteraction());
      return;
    }
    setInteractionState(panel === 'preview' ? previewingInteraction() : openingMenuInteraction(panel));
  }, [setInteractionState]);

  const toggleOverlay = useCallback((panel: FloatingOverlayPanel) => {
    setActiveOverlay((current) => {
      const next = current === panel ? null : panel;
      if (!next) {
        setInteractionState(idleInteraction());
      } else {
        setInteractionState(next === 'preview' ? previewingInteraction() : openingMenuInteraction(next));
      }
      return next;
    });
  }, [setInteractionState]);

  const closeOverlay = useCallback(() => {
    setOverlay(null);
  }, [setOverlay]);

  return {
    closeOverlay,
    showExportPreview: activeOverlay === 'preview',
    showBlockTrash: activeOverlay === 'blockTrash',
    showLayoutPanel: activeOverlay === 'layout',
    showMoreActions: activeOverlay === 'moreActions',
    showViewOptions: activeOverlay === 'viewOptions',
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    openLayoutPanel: () => setOverlay('layout'),
    openBlockTrash: () => setOverlay('blockTrash'),
    toggleExportPreview: () => toggleOverlay('preview'),
    toggleMoreActions: () => toggleOverlay('moreActions'),
    toggleViewOptions: () => toggleOverlay('viewOptions'),
    togglePreviewAIVisibility: () => setShowPreviewAIVisibility((value) => !value),
    togglePreviewBlockTypes: () => setShowPreviewBlockTypes((value) => !value),
    togglePreviewExportStatus: () => setShowPreviewExportStatus((value) => !value),
    togglePreviewLabelOverlay: () => setShowPreviewLabelOverlay((value) => !value),
  };
}
