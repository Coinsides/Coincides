import type { NoteCoverFrame } from './noteCover.js';

/** Note-owned binding settings. Pages only project this data; they never store it. */
export const NOTE_BINDING_SLOT_NAMES = [
  'header-left', 'header-center', 'header-right',
  'footer-left', 'footer-center', 'footer-right',
] as const;

export type NoteBindingSlotName = typeof NOTE_BINDING_SLOT_NAMES[number];
export type NoteBindingNumberFormat = 'arabic' | 'roman-lower' | 'roman-upper';

export interface NoteBindingSlotStyle {
  fontFamily?: 'skin' | 'serif' | 'sans' | 'mono';
  fontSize?: number;
  fontWeight?: number;
  colorToken?: 'ink' | 'ink-muted' | 'accent';
  italic?: boolean;
}

export interface NoteBindingSlotSettings {
  text: string;
  offsetX: number;
  offsetY: number;
  /** Omitted properties inherit the resolved paper skin. */
  style: NoteBindingSlotStyle;
}

export interface NoteBindingPageNumber {
  enabled: boolean;
  startAt: number;
  format: NoteBindingNumberFormat;
  /** The number itself is always present between these two literal strings. */
  prefix: string;
  suffix: string;
  slot: NoteBindingSlotName;
}

export interface NoteBindingSection {
  id: string;
  /** One-based mechanical page ordinal, inclusive. The first section starts at 1.
   * The next section's startPage is this section's exclusive end. */
  startPage: number;
  headerFooterEnabled: boolean;
  pageNumber: NoteBindingPageNumber;
  slots: Record<NoteBindingSlotName, NoteBindingSlotSettings>;
}

interface NoteBindingSettingsBase {
  enabled: boolean;
  /** Cover pages suppress all folio furniture. */
  dropFolioOnCover: boolean;
  sections: NoteBindingSection[];
}

export interface NoteBindingCoverPage {
  /** Identity of an ordinary, persisted page_frame. Null means no cover page. */
  frameId: string | null;
  exportIncluded: boolean;
}

export interface NoteBindingCover {
  assetId: string;
  card?: NoteCoverFrame;
  /** Same non-destructive viewport as the card frame, sized for the paper. */
  page?: NoteCoverFrame;
}

export interface NoteBindingSettingsV1 extends NoteBindingSettingsBase { version: 1 }
export interface NoteBindingSettingsV2 extends NoteBindingSettingsBase {
  version: 2;
  coverPage: NoteBindingCoverPage;
  cover: NoteBindingCover | null;
}
export type NoteBindingSettings = NoteBindingSettingsV1 | NoteBindingSettingsV2;

export function getNoteBindingCoverPage(settings: NoteBindingSettings | null | undefined): NoteBindingCoverPage {
  return settings?.version === 2 ? settings.coverPage : { frameId: null, exportIncluded: true };
}

export function getNoteBindingCover(settings: NoteBindingSettings | null | undefined): NoteBindingCover | null {
  return settings?.version === 2 ? settings.cover : null;
}

export function upgradeNoteBindingSettings(settings: NoteBindingSettings | null | undefined): NoteBindingSettingsV2 {
  return settings?.version === 2 ? settings : {
    ...(settings ?? createDefaultNoteBindingSettings()), version: 2,
    coverPage: { frameId: null, exportIncluded: true }, cover: null,
  };
}

export function createDefaultNoteBindingSection(id = 'default', startPage = 1): NoteBindingSection {
  return {
    id,
    startPage,
    headerFooterEnabled: true,
    pageNumber: { enabled: true, startAt: 1, format: 'arabic', prefix: '', suffix: '', slot: 'footer-center' },
    slots: Object.fromEntries(NOTE_BINDING_SLOT_NAMES.map((slot) => [slot, {
      text: '', offsetX: 0, offsetY: 0, style: {},
    }])) as Record<NoteBindingSlotName, NoteBindingSlotSettings>,
  };
}

/** Construction-period defaults; turning binding off remains an explicit setting. */
export function createDefaultNoteBindingSettings(): NoteBindingSettingsV2 {
  return { version: 2, enabled: true, dropFolioOnCover: true, sections: [createDefaultNoteBindingSection()],
    coverPage: { frameId: null, exportIncluded: true }, cover: null };
}
