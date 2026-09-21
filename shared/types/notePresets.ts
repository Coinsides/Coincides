import { createDefaultNoteBindingSection, upgradeNoteBindingSettings, type NoteBindingSettings } from './noteBinding.js';

/** Factory inventory only. Applied instances remain ordinary blocks / binding settings. */
export const COVER_PRESETS = [
  { id: 'manual', name: '手册式', kind: 'cover', title: 'title', description: 'description',
    layout: 'center-column', underlay: 'cover-or-paper' },
  { id: 'concise', name: '简明式', kind: 'cover', title: 'title', description: 'description',
    layout: 'horizontal', underlay: 'cover-or-paper' },
] as const;
export type CoverPreset = typeof COVER_PRESETS[number];
export type CoverPresetId = CoverPreset['id'];

export const MANUAL_BINDING_PRESET = {
  id: 'manual-binding', name: '手册式装订', kind: 'binding',
  header: 'note.title', folio: 'sheet-number', footer: 'optional-text',
} as const;
export const NOTE_PRESETS = [...COVER_PRESETS, MANUAL_BINDING_PRESET] as const;

/** Resolve content roles at the human application boundary; appearance inherits the skin. */
export function createManualBindingPreset(value: NoteBindingSettings | null | undefined, title: string, footer = '') {
  const settings = structuredClone(upgradeNoteBindingSettings(value));
  const section = createDefaultNoteBindingSection();
  section.slots['header-center'].text = title;
  section.slots['footer-right'].text = footer;
  section.pageNumber.prefix = '第 ';
  section.pageNumber.suffix = ' 纸';
  return { ...settings, enabled: true, dropFolioOnCover: true, sections: [section] };
}
