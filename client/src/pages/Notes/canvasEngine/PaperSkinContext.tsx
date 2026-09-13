import { createContext, useContext, type CSSProperties } from 'react';
import type { SkinPresetId, SkinSelection } from '@shared/types/skin';

export interface PaperSkinContextValue {
  style: CSSProperties;
  preset: SkinSelection['preset'];
  /** Effective rendered lineage, including transient whole-paper previews. */
  materialPreset?: SkinPresetId;
  selection: SkinSelection | null;
  inheritedSelection?: SkinSelection | null;
  save: (skin: SkinSelection | null) => Promise<void>;
  saveError?: boolean;
  preview?: (skin: SkinSelection | null) => void;
  error: string | null;
  retry: () => void;
}
export const PaperSkinContext = createContext<PaperSkinContextValue | null>(null);
export const usePaperSkin = () => useContext(PaperSkinContext);
