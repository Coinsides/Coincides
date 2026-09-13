import { Router, type Response } from 'express';
import type Database from 'better-sqlite3';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { createSkinSuite, deleteSkinSuite, listSkinSuites, updateSkinSuite } from '../services/skinSuites.js';
import { createSkinSuiteSchema, skinSuiteIdSchema, updateSkinSuiteSchema } from '../validators/skinSuites.js';

export function createSkinSuiteRouter(database: () => Database.Database = getDb): Router {
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
  router.get('/', handle((req, res) => { res.json(listSkinSuites(database(), req.userId!)); }));
  router.post('/', handle((req, res) => {
    res.status(201).json(createSkinSuite(database(), req.userId!, createSkinSuiteSchema.parse(req.body)));
  }));
  router.patch('/:id', handle((req, res) => {
    res.json(updateSkinSuite(database(), req.userId!, skinSuiteIdSchema.parse(req.params.id), updateSkinSuiteSchema.parse(req.body)));
  }));
  router.delete('/:id', handle((req, res) => {
    res.json(deleteSkinSuite(database(), req.userId!, skinSuiteIdSchema.parse(req.params.id)));
  }));
  return router;
}

export default createSkinSuiteRouter();
