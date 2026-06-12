import {
  useCallback,
  useState,
} from 'react';
import type { SnapGuide } from '../runtimeLayout';

export function useLayoutInteractionController() {
  const [layoutMode, setLayoutMode] = useState(false);
  const [snapGuide, setSnapGuide] = useState<SnapGuide | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const clearSnapGuide = useCallback(() => {
    setSnapGuide(null);
  }, []);

  const toggleLayoutMode = useCallback(() => {
    clearSnapGuide();
    setLayoutMode((value) => !value);
  }, [clearSnapGuide]);

  const toggleSnapEnabled = useCallback(() => {
    clearSnapGuide();
    setSnapEnabled((value) => !value);
  }, [clearSnapGuide]);

  return {
    clearSnapGuide,
    layoutMode,
    setLayoutMode,
    setSnapGuide,
    snapEnabled,
    snapGuide,
    toggleLayoutMode,
    toggleSnapEnabled,
  };
}
