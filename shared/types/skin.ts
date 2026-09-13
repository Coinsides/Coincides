/** Presentation tokens shared by paper and board; document typography stays independent. */
export const SKIN_PRESET_IDS = ['default', 'quiet-ink', 'warm-paper', 'workbench'] as const;
export type SkinPresetId = typeof SKIN_PRESET_IDS[number];

export const SKIN_TOKEN_NAMES = [
  'desk', 'paper', 'ink', 'ink-muted', 'accent', 'annotation', 'hairline', 'danger', 'wall',
  'board-desk', 'card', 'edge', 'chalk',
] as const;
export type SkinTokenName = typeof SKIN_TOKEN_NAMES[number];
export type SkinTokens = Record<SkinTokenName, string>;
/** Stored overrides accept a literal #hex6/#hex8 or a live palette identity. */
export type PaletteColorReference = `palette:${string}`;
export const SKIN_COLOR_VALUE_PATTERN = /^(?:#[\da-fA-F]{6}(?:[\da-fA-F]{2})?|palette:[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12})$/;

export const SKIN_COMPONENT_OPTIONS = {
  titleFont: ['sans', 'serif'],
  labelFont: ['system', 'mono'],
  menuDensity: ['comfortable', 'compact'],
  handleStyle: ['capsule', 'rivet'],
  headerRule: ['visible', 'hidden'],
} as const;
export type SkinComponents = { -readonly [K in keyof typeof SKIN_COMPONENT_OPTIONS]: typeof SKIN_COMPONENT_OPTIONS[K][number] };

/** Null/absence at a mounting point inherits its parent; a selection replaces the preset snapshot. */
export interface SkinSelection {
  preset: SkinPresetId;
  /** Values are #hex6/#hex8 or palette:<uuid>; resolution returns literal SkinTokens. */
  overrides?: Partial<SkinTokens>;
  components?: Partial<SkinComponents>;
}
