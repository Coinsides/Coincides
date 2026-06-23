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

export type FloatingOverlayPanel = 'layout' | 'noteInfo' | 'moreActions' | 'preview';

export interface UseFloatingOverlayControllerOptions {
  setInteractionState: (state: RuntimeInteractionState) => void;
}

export function useFloatingOverlayController({
  setInteractionState,
}: UseFloatingOverlayControllerOptions) {
  const [chromeCollapsed, setChromeCollapsed] = useState(false);
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

  const collapseChrome = useCallback(() => {
    setActiveOverlay(null);
    setChromeCollapsed(true);
    setInteractionState(idleInteraction());
  }, [setInteractionState]);

  const expandChrome = useCallback(() => {
    setChromeCollapsed(false);
  }, []);

  return {
    chromeCollapsed,
    closeOverlay,
    collapseChrome,
    expandChrome,
    showExportPreview: activeOverlay === 'preview',
    showLayoutPanel: activeOverlay === 'layout',
    showMoreActions: activeOverlay === 'moreActions',
    showNoteInfo: activeOverlay === 'noteInfo',
    showPreviewAIVisibility,
    showPreviewBlockTypes,
    showPreviewExportStatus,
    showPreviewLabelOverlay,
    openLayoutPanel: () => setOverlay('layout'),
    toggleExportPreview: () => toggleOverlay('preview'),
    toggleMoreActions: () => toggleOverlay('moreActions'),
    toggleNoteInfo: () => toggleOverlay('noteInfo'),
    togglePreviewAIVisibility: () => setShowPreviewAIVisibility((value) => !value),
    togglePreviewBlockTypes: () => setShowPreviewBlockTypes((value) => !value),
    togglePreviewExportStatus: () => setShowPreviewExportStatus((value) => !value),
    togglePreviewLabelOverlay: () => setShowPreviewLabelOverlay((value) => !value),
  };
}
