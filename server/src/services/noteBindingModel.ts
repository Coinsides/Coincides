import type { NoteBindingSettings, NoteBindingSettingsV2, NoteBindingSection, NoteBindingSlotName } from '../../../shared/types/noteBinding.js';

// Server production has a separate runtime root; shared imports are type-only.
// Cross-end tests lock these construction defaults.
export function upgradeNoteBindingSettings(settings: NoteBindingSettings | null | undefined): NoteBindingSettingsV2 {
  if (settings?.version === 2) return settings;
  const slots = ['header-left', 'header-center', 'header-right', 'footer-left', 'footer-center', 'footer-right'] as NoteBindingSlotName[];
  const section: NoteBindingSection = { id: 'default', startPage: 1, headerFooterEnabled: true,
    pageNumber: { enabled: true, startAt: 1, format: 'arabic', prefix: '', suffix: '', slot: 'footer-center' },
    slots: Object.fromEntries(slots.map((slot) => [slot, { text: '', offsetX: 0, offsetY: 0, style: {} }])) as NoteBindingSection['slots'],
  };
  return { ...(settings ?? { enabled: true, dropFolioOnCover: true, sections: [section] }),
    version: 2, coverPage: { frameId: null, exportIncluded: true }, cover: null };
}

export function getNoteBindingCoverPage(settings: NoteBindingSettings | null | undefined) {
  return settings?.version === 2 ? settings.coverPage : { frameId: null, exportIncluded: true };
}

export function getNoteBindingCover(settings: NoteBindingSettings | null | undefined) {
  return settings?.version === 2 ? settings.cover : null;
}
