import { SKIN_COMPONENT_OPTIONS, SKIN_PRESET_IDS, SKIN_TOKEN_NAMES, type SkinComponents, type SkinPresetId, type SkinSelection, type SkinTokens } from '@shared/types';

/** Factory snapshots. The default column is the incumbent paper palette, not a redesign. */
export const SKIN_PRESETS: Record<SkinPresetId, SkinTokens> = {
  default: { desk: '#0f0f10', paper: '#101114', ink: '#f5f5f5', 'ink-muted': '#b7b8bd', accent: '#2563eb', annotation: '#facc15', hairline: '#2c2d31', danger: '#ef4444', wall: '#777a8270', 'board-desk': '#0b0b0c', card: '#151516', edge: '#b7b8bd', chalk: '#f5f5f5' },
  'quiet-ink': { desk: '#101114', paper: '#17181C', ink: '#E7E8EB', 'ink-muted': '#8B909A', accent: '#7FA3D7', annotation: '#B89B4C', hairline: '#FFFFFF12', danger: '#C4766B', wall: '#FFFFFF14', 'board-desk': '#0E0F12', card: '#17181C', edge: '#8B909A', chalk: '#E7E8EB' },
  'warm-paper': { desk: '#1D1A17', paper: '#F7F3EA', ink: '#2B2620', 'ink-muted': '#837A6C', accent: '#33604F', annotation: '#B8912E', hairline: '#E6DECE', danger: '#A04A38', wall: '#D8CFBC', 'board-desk': '#211D19', card: '#F7F3EA', edge: '#837A6C', chalk: '#F2EDE1' },
  workbench: { desk: '#12151A', paper: '#1A1E25', ink: '#DEE3EA', 'ink-muted': '#7E8794', accent: '#E5A33C', annotation: '#E5A33C', hairline: '#2E3642', danger: '#D46A5A', wall: '#33507A', 'board-desk': '#12151A', card: '#1A1E25', edge: '#E5A33C', chalk: '#DEE3EA' },
};

const defaultComponents: SkinComponents = { titleFont: 'sans', labelFont: 'system', menuDensity: 'comfortable', handleStyle: 'capsule', headerRule: 'visible' };
export const SKIN_PRESET_COMPONENTS: Record<SkinPresetId, SkinComponents> = {
  default: { ...defaultComponents },
  'quiet-ink': { ...defaultComponents },
  'warm-paper': { ...defaultComponents, titleFont: 'serif' },
  workbench: { ...defaultComponents, labelFont: 'mono', menuDensity: 'compact', handleStyle: 'rivet' },
};

export const SKIN_LABELS: Record<SkinPresetId, string> = {
  default: '默认', 'quiet-ink': '静墨', 'warm-paper': '暖纸', workbench: '工作台',
};

export function readSkin(value: unknown): SkinSelection | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<SkinSelection>;
  if (!SKIN_PRESET_IDS.includes(raw.preset as SkinPresetId)) return null;
  const overrides = Object.fromEntries(SKIN_TOKEN_NAMES.flatMap((key) => {
    const color = raw.overrides?.[key];
    return typeof color === 'string' && /^#[\da-f]{6}([\da-f]{2})?$/i.test(color) ? [[key, color]] : [];
  }));
  const components = Object.fromEntries(Object.entries(SKIN_COMPONENT_OPTIONS).flatMap(([key, options]) => {
    const option = raw.components?.[key as keyof SkinComponents];
    return option && (options as readonly string[]).includes(option) ? [[key, option]] : [];
  })) as Partial<SkinComponents>;
  return { preset: raw.preset!, ...(Object.keys(overrides).length ? { overrides } : {}), ...(Object.keys(components).length ? { components } : {}) };
}

/** An absent mounting point inherits. A named snapshot replaces its parent's palette. */
export function resolveSkin(global?: SkinSelection | null, project?: SkinSelection | null, local?: SkinSelection | null) {
  let preset: SkinPresetId = 'default';
  let tokens = { ...SKIN_PRESETS.default };
  let components = { ...SKIN_PRESET_COMPONENTS.default };
  for (const candidate of [global, project, local]) {
    const skin = readSkin(candidate);
    if (!skin) continue;
    preset = skin.preset;
    tokens = { ...SKIN_PRESETS[preset], ...skin.overrides };
    components = { ...SKIN_PRESET_COMPONENTS[preset], ...skin.components };
  }
  return { preset, tokens, components };
}
