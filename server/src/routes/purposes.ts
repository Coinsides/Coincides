import type Database from 'better-sqlite3';
import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
import { runRecordedAction } from '../middleware/recordedAction.js';
import {
  createPurpose,
  getPurpose,
  getPurposeCompiledScope,
  listNotePurposes,
  listPurposes,
  replaceNotePurposes,
} from '../services/purposes.js';
import {
  createPurposeRequestSchema,
  listPurposesQuerySchema,
} from '../validators/purposes.js';

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

export function createPurposeRouter(databaseProvider: () => Database.Database = getDb): Router {
  const router = Router();

  router.get('/', (req: AuthRequest, res: Response) => {
    try {
      const input = listPurposesQuerySchema.parse(req.query);
      res.json({ purposes: listPurposes(databaseProvider(), req.userId!, input) });
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/', (req: AuthRequest, res: Response) => {
    try {
      const { summary, ...input } = createPurposeRequestSchema.parse(req.body);
      const purpose = runRecordedAction(databaseProvider(), req, 'POST /api/purposes', (db, userId) => {
        const value = createPurpose(db, userId, input);
        return {
          value,
          events: [{
            verb: 'purpose_created',
            objects: [{ kind: 'purpose', id: value.id }],
            // Missing prose uses the route's explicit mechanical action label.
            summary: summary ?? `Created purpose: ${value.title}`,
          }],
        };
      });
      res.status(201).json({ purpose });
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.get('/by-note/:noteId', (req: AuthRequest, res: Response) => {
    res.json({
      purposes: listNotePurposes(databaseProvider(), req.userId!, String(req.params.noteId)),
    });
  });

  // Retired requests return 410 even for old/invalid payloads: no validation or
  // replacement code may accidentally resurrect this writer.
  router.put('/by-note/:noteId', (req: AuthRequest) => {
    replaceNotePurposes(databaseProvider(), req.userId!, String(req.params.noteId), []);
  });

  router.get('/:purposeId/compiled-scope', (req: AuthRequest, res: Response) => {
    res.json(getPurposeCompiledScope(databaseProvider(), req.userId!, String(req.params.purposeId)));
  });

  router.get('/:purposeId', (req: AuthRequest, res: Response) => {
    res.json({ purpose: getPurpose(databaseProvider(), req.userId!, String(req.params.purposeId)) });
  });

  return router;
}

export default createPurposeRouter();
