import { createContext, useContext, type CSSProperties } from 'react';
import type { SkinPresetId, SkinSelection } from '@shared/types/skin';

export interface PaperSkinContextValue {
  style: CSSProperties;
  preset: SkinPresetId;
  selection: SkinSelection | null;
  inheritedSelection?: SkinSelection | null;
  save: (skin: SkinSelection | null) => Promise<void>;
  saveError?: boolean;
  error: string | null;
  retry: () => void;
}
export const PaperSkinContext = createContext<PaperSkinContextValue | null>(null);
export const usePaperSkin = () => useContext(PaperSkinContext);
