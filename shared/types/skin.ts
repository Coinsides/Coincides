/** Presentation tokens shared by paper and board; document typography stays independent. */
export const SKIN_PRESET_IDS = ['default', 'quiet-ink', 'warm-paper', 'workbench'] as const;
export type SkinPresetId = typeof SKIN_PRESET_IDS[number];
export type SkinSuiteReference = `suite:${string}`;
export type SkinBindingId = SkinPresetId | SkinSuiteReference;
export const SKIN_SUITE_REFERENCE_PATTERN = /^suite:[\da-fA-F]{8}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{4}-[\da-fA-F]{12}$/;

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
  preset: SkinBindingId;
  /** Factory material lineage; absence uses the bound suite or factory preset. */
  materialPreset?: SkinPresetId;
  /** Values are #hex6/#hex8 or palette:<uuid>; resolution returns literal SkinTokens. */
  overrides?: Partial<SkinTokens>;
  components?: Partial<SkinComponents>;
}

/** A user suite is one complete resolved appearance snapshot, never a partial color-only asset. */
export interface SkinSuite {
  id: string;
  user_id: string;
  name: string;
  tokens: SkinTokens;
  components: SkinComponents;
  /** Material lineage only; material parameters remain internal to factory presets. */
  materialPreset?: SkinPresetId;
  created_at: string;
}

export interface CreateSkinSuiteInput {
  name: string;
  tokens: SkinTokens;
  components: SkinComponents;
  materialPreset?: SkinPresetId;
}

/** Renaming is independent; replacing appearance always replaces tokens and components together. */
export type UpdateSkinSuiteInput = { name?: string } & (
  { tokens: SkinTokens; components: SkinComponents; materialPreset?: SkinPresetId }
  | { tokens?: never; components?: never; materialPreset?: never }
);

/** Latest literal snapshot used to detach in-memory consumers after the server transaction. */
export interface SkinSuiteDeleteResult {
  id: string;
  tokens: SkinTokens;
  components: SkinComponents;
  materialPreset?: SkinPresetId;
  /** Palette values captured inside the delete transaction, for freezing stale consumer overrides. */
  palette: Record<string, string>;
}
