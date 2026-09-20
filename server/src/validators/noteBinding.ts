import { z } from 'zod';
import type { NoteBindingSettings } from '../../../shared/types/noteBinding.js';
import { noteCoverFrameSchema } from './noteCover.js';

const slotNameSchema = z.enum([
  'header-left', 'header-center', 'header-right',
  'footer-left', 'footer-center', 'footer-right',
]);
const pageOrdinalSchema = z.number().int().min(1).max(999999);
const slotSchema = z.object({
  text: z.string().max(2000),
  offsetX: z.number().finite().min(-1000).max(1000),
  offsetY: z.number().finite().min(-1000).max(1000),
  style: z.object({
    fontFamily: z.enum(['skin', 'serif', 'sans', 'mono']).optional(),
    fontSize: z.number().finite().min(1).max(200).optional(),
    fontWeight: z.number().int().min(100).max(900).optional(),
    colorToken: z.enum(['ink', 'ink-muted', 'accent']).optional(),
    italic: z.boolean().optional(),
  }).strict(),
}).strict();

const sectionSchema = z.object({
  id: z.string().trim().min(1).max(100),
  startPage: pageOrdinalSchema,
  headerFooterEnabled: z.boolean(),
  pageNumber: z.object({
    enabled: z.boolean(),
    startAt: pageOrdinalSchema,
    format: z.enum(['arabic', 'roman-lower', 'roman-upper']),
    prefix: z.string().max(200),
    suffix: z.string().max(200),
    slot: slotNameSchema,
  }).strict(),
  slots: z.object({
    'header-left': slotSchema, 'header-center': slotSchema, 'header-right': slotSchema,
    'footer-left': slotSchema, 'footer-center': slotSchema, 'footer-right': slotSchema,
  }).strict(),
}).strict();

const settingsShape = {
  enabled: z.boolean(),
  dropFolioOnCover: z.boolean(),
  sections: z.array(sectionSchema).min(1).max(1000),
};

export const noteBindingSettingsSchema: z.ZodType<NoteBindingSettings> = z.discriminatedUnion('version', [
  z.object({ version: z.literal(1), ...settingsShape }).strict(),
  z.object({ version: z.literal(2), ...settingsShape,
    coverPage: z.object({ frameId: z.string().min(1).max(220).nullable(), exportIncluded: z.boolean() }).strict(),
    cover: z.object({ assetId: z.string().min(1), card: noteCoverFrameSchema.optional(), page: noteCoverFrameSchema.optional() })
      .strict().refine((cover) => Boolean(cover.card || cover.page), 'A cover requires at least one viewport').nullable(),
  }).strict(),
]).superRefine((settings, context) => {
  const ids = new Set<string>();
  settings.sections.forEach((section, index) => {
    if ((index === 0 && section.startPage !== 1)
      || (index > 0 && section.startPage <= settings.sections[index - 1].startPage)) {
      context.addIssue({ code: z.ZodIssueCode.custom,
        path: ['sections', index, 'startPage'], message: 'Sections must start at page 1 and increase strictly' });
    }
    if (ids.has(section.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom,
        path: ['sections', index, 'id'], message: 'Section ids must be unique' });
    }
    ids.add(section.id);
  });
});

export const updateNoteBindingSettingsSchema = z.object({
  binding_settings: noteBindingSettingsSchema.nullable(),
  collection: z.record(z.unknown()).optional(),
}).strict();
