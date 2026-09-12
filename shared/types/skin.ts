/** B1a paper colors only; typography and board presentation stay independent. */
export const SKIN_PRESET_IDS = ['default', 'quiet-ink', 'warm-paper', 'workbench'] as const;
export type SkinPresetId = typeof SKIN_PRESET_IDS[number];

export const SKIN_TOKEN_NAMES = [
  'desk', 'paper', 'ink', 'ink-muted', 'accent', 'annotation', 'hairline', 'danger', 'wall',
] as const;
export type SkinTokenName = typeof SKIN_TOKEN_NAMES[number];
export type SkinTokens = Record<SkinTokenName, string>;

/** Null/absence at a mounting point inherits its parent; a selection replaces the preset snapshot. */
export interface SkinSelection {
  preset: SkinPresetId;
  overrides?: Partial<SkinTokens>;
}
