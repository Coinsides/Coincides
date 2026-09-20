import { Router } from 'express';
import type Database from 'better-sqlite3';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { updateNoteBindingSettingsSchema } from '../validators/noteBinding.js';
import { getNoteBindingSettings, updateNoteBindingSettings } from '../services/noteBinding.js';
import { hydrateNote } from '../services/noteHydration.js';
import { getNoteCanvasPersistence } from '../services/canvasObjects.js';

/** Human note subresource, deliberately separate from the Agent tool registry. */
export function createNoteBindingRouter(dbProvider: () => Database.Database = getDb) {
  const router = Router();
  router.get('/:id/binding-settings', (req: AuthRequest, res) => {
    res.json(getNoteBindingSettings(dbProvider(), req.userId!, req.params.id as string));
  });
  router.put('/:id/binding-settings', (req: AuthRequest, res) => {
    const parsed = updateNoteBindingSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
      return;
    }
    const updated = updateNoteBindingSettings(dbProvider(), req.userId!, req.params.id as string,
      parsed.data.binding_settings, parsed.data.collection);
    res.json({ ...hydrateNote(updated), binding_settings: getNoteBindingSettings(dbProvider(), req.userId!, req.params.id as string).binding_settings,
      ...(parsed.data.collection ? { canvas_persistence: getNoteCanvasPersistence(dbProvider(), req.userId!, req.params.id as string) } : {}),
    });
  });
  return router;
}
