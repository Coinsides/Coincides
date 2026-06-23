import {
  useCallback,
  useState,
} from 'react';
import type { SnapGuide } from '../runtimeLayout';

export type LayoutModeKind = 'off' | 'persistent' | 'temporary';

export function useLayoutInteractionController() {
  const [layoutModeKind, setLayoutModeKind] = useState<LayoutModeKind>('off');
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const clearSnapGuide = useCallback(() => {
    setSnapGuide(null);
  }, []);

  const disableLayoutMode = useCallback(() => {
    clearSnapGuide();
    setLayoutModeKind('off');
  }, [clearSnapGuide]);

  const enablePersistentLayoutMode = useCallback(() => {
    clearSnapGuide();
    setLayoutModeKind('persistent');
  }, [clearSnapGuide]);

  const beginTemporaryLayoutMode = useCallback(() => {
    clearSnapGuide();
    setLayoutModeKind((current) => (current === 'persistent' ? current : 'temporary'));
  }, [clearSnapGuide]);

  const clearTemporaryLayoutMode = useCallback(() => {
    clearSnapGuide();
    setLayoutModeKind((current) => (current === 'temporary' ? 'off' : current));
  }, [clearSnapGuide]);

  const toggleSnapEnabled = useCallback(() => {
    clearSnapGuide();
    setSnapEnabled((value) => !value);
  }, [clearSnapGuide]);

  return {
    beginTemporaryLayoutMode,
    clearSnapGuide,
    clearTemporaryLayoutMode,
    disableLayoutMode,
    enablePersistentLayoutMode,
    layoutMode: layoutModeKind !== 'off',
    layoutModeKind,
    setSnapGuide,
    snapEnabled,
    snapGuide,
    toggleSnapEnabled,
  };
}
