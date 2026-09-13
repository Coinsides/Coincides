import { Router, type Response } from 'express';
import type Database from 'better-sqlite3';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { getOwnedPaletteColor, createPaletteColor, deletePaletteColor, listPaletteColors, updatePaletteColor } from '../services/paletteColors.js';
import { createPaletteColorSchema, paletteColorIdSchema, updatePaletteColorSchema } from '../validators/paletteColors.js';
import { AppError } from '../middleware/errorHandler.js';

export function createPaletteColorRouter(database: () => Database.Database = getDb): Router {
  const router = Router();
  const handle = (operation: (req: AuthRequest, res: Response) => void) => (req: AuthRequest, res: Response) => {
    try { operation(req, res); } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      throw error;
    }
  };

  router.get('/', handle((req, res) => { res.json(listPaletteColors(database(), req.userId!)); }));
  router.post('/', handle((req, res) => {
    res.status(201).json(createPaletteColor(database(), req.userId!, createPaletteColorSchema.parse(req.body)));
  }));
  router.patch('/:id', handle((req, res) => {
    const db = database();
    const id = paletteColorIdSchema.parse(req.params.id);
    // Even an invalid edit of a factory row has the same readable immutable-asset response.
    if (getOwnedPaletteColor(db, req.userId!, id).origin === 'factory') {
      throw new AppError(409, 'Factory palette colors cannot be changed or deleted', { code: 'PALETTE_FACTORY_IMMUTABLE' });
    }
    res.json(updatePaletteColor(db, req.userId!, id, updatePaletteColorSchema.parse(req.body)));
  }));
  router.delete('/:id', handle((req, res) => {
    res.json(deletePaletteColor(database(), req.userId!, paletteColorIdSchema.parse(req.params.id)));
  }));
  return router;
}

export default createPaletteColorRouter();
