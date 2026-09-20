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

export interface NoteBindingSettings {
  version: 1;
  enabled: boolean;
  /** Reserved cover-page hook; this setting does not create a cover page. */
  dropFolioOnCover: boolean;
  sections: NoteBindingSection[];
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
export function createDefaultNoteBindingSettings(): NoteBindingSettings {
  return { version: 1, enabled: true, dropFolioOnCover: true, sections: [createDefaultNoteBindingSection()] };
}
