import type Database from 'better-sqlite3';
import { Router, type Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runRecordedAction } from '../middleware/recordedAction.js';
import { listContentGroupsHoldingItem } from '../services/contentGroups.js';
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
      // The only caller is a person pressing Cast in the group panel. The member
      // row is written here, so a later group save already counts it as held.
      res.status(201).json(runRecordedAction(database(), req, 'POST /api/items/cast', (db, userId) => {
        const value = castItem(db, userId, data);
        return {
          value,
          events: listContentGroupsHoldingItem(db, userId, value.id).map((groupId) => ({
            verb: 'item_cited' as const,
            objects: [{ kind: 'item', id: value.id }, { kind: 'content_group', id: groupId }],
            summary: 'Cast item into content group',
            meta: { via: 'cast' },
          })),
        };
      }));
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
      const itemId = String(req.params.itemId);
      res.json(runRecordedAction(database(), req, 'PUT /api/items/:itemId', (db, userId) => ({
        value: updateItem(db, userId, itemId, data),
        events: [{
          verb: 'item_edited' as const,
          objects: [{ kind: 'item', id: itemId }],
          summary: 'Edited item',
          meta: { action: 'update', fields: Object.keys(data) },
        }],
      })));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  router.post('/:itemId/retire', (req: AuthRequest, res: Response) => {
    try {
      const data = retireItemSchema.parse(req.body);
      const itemId = String(req.params.itemId);
      res.json(runRecordedAction(database(), req, 'POST /api/items/:itemId/retire', (db, userId) => ({
        value: retireItem(db, userId, itemId, data),
        events: [{
          verb: 'item_edited' as const,
          objects: [{ kind: 'item', id: itemId }],
          summary: 'Retired item',
          meta: { action: 'retire', successor_item_id: data.successor_item_id ?? null },
        }],
      })));
    } catch (err) {
      if (handleValidationError(err, res)) return;
      throw err;
    }
  });

  return router;
}

const router = createItemRouter();
export default router;
