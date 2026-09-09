import type Database from 'better-sqlite3';
import { Router, type Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { listItemSummaries } from '../services/itemSummaries.js';
import {
  castItem,
  collectItemAnchor,
  createItem,
  discardPoolItemAnchor,
  getItem,
  listItems,
  listPoolItemAnchors,
  retireItem,
  updateItem,
} from '../services/items.js';
import {
  castItemSchema,
  collectItemAnchorSchema,
  createItemSchema,
  itemListQuerySchema,
  itemSummariesSchema,
  itemPoolQuerySchema,
  retireItemSchema,
  updateItemSchema,
} from '../validators/index.js';

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

/** Database injection keeps isolated fixtures on the same post-auth route path. */
export function createItemRouter(database: () => Database.Database = getDb): Router {
  const router = Router();

  router.get('/anchors', (req: AuthRequest, res: Response) => {
    try {
      const query = itemPoolQuerySchema.parse(req.query);
      res.json(listPoolItemAnchors(database(), req.userId!, query.pool_scope_kind, query.pool_scope_id));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/anchors', (req: AuthRequest, res: Response) => {
    try {
      const data = collectItemAnchorSchema.parse(req.body);
      res.status(201).json(collectItemAnchor(database(), req.userId!, data));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.delete('/anchors/:anchorId', (req: AuthRequest, res: Response) => {
    res.json(discardPoolItemAnchor(database(), req.userId!, String(req.params.anchorId)));
  });

  router.post('/cast', (req: AuthRequest, res: Response) => {
    try {
      const data = castItemSchema.parse(req.body);
      res.status(201).json(castItem(database(), req.userId!, data));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.get('/', (req: AuthRequest, res: Response) => {
    try {
      const query = itemListQuerySchema.parse(req.query);
      res.json(listItems(database(), req.userId!, query));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/', (req: AuthRequest, res: Response) => {
    try {
      const data = createItemSchema.parse(req.body);
      res.status(201).json(createItem(database(), req.userId!, data));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/summaries', (req: AuthRequest, res: Response) => {
    try {
      const data = itemSummariesSchema.parse(req.body);
      res.json(listItemSummaries(database(), req.userId!, data.item_ids));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.get('/:itemId', (req: AuthRequest, res: Response) => {
    res.json(getItem(database(), req.userId!, String(req.params.itemId)));
  });

  router.put('/:itemId', (req: AuthRequest, res: Response) => {
    try {
      const data = updateItemSchema.parse(req.body);
      res.json(updateItem(database(), req.userId!, String(req.params.itemId), data));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/:itemId/retire', (req: AuthRequest, res: Response) => {
    try {
      const data = retireItemSchema.parse(req.body);
      res.json(retireItem(database(), req.userId!, String(req.params.itemId), data));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  return router;
}

const router = createItemRouter();
export default router;
