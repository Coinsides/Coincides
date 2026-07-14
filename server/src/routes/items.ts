import { Router, Response } from 'express';
import { ZodError } from 'zod';
import { getDb } from '../db/init.js';
import { AuthRequest } from '../middleware/auth.js';
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
  itemPoolQuerySchema,
  retireItemSchema,
  updateItemSchema,
} from '../validators/index.js';

const router = Router();

function handleValidationError(err: unknown, res: Response): boolean {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.errors });
    return true;
  }
  return false;
}

router.get('/anchors', (req: AuthRequest, res: Response) => {
  try {
    const query = itemPoolQuerySchema.parse(req.query);
    res.json(listPoolItemAnchors(getDb(), req.userId!, query.pool_scope_kind, query.pool_scope_id));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/anchors', (req: AuthRequest, res: Response) => {
  try {
    const data = collectItemAnchorSchema.parse(req.body);
    res.status(201).json(collectItemAnchor(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.delete('/anchors/:anchorId', (req: AuthRequest, res: Response) => {
  res.json(discardPoolItemAnchor(getDb(), req.userId!, String(req.params.anchorId)));
});

router.post('/cast', (req: AuthRequest, res: Response) => {
  try {
    const data = castItemSchema.parse(req.body);
    res.status(201).json(castItem(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const query = itemListQuerySchema.parse(req.query);
    res.json(listItems(getDb(), req.userId!, query));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/', (req: AuthRequest, res: Response) => {
  try {
    const data = createItemSchema.parse(req.body);
    res.status(201).json(createItem(getDb(), req.userId!, data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.get('/:itemId', (req: AuthRequest, res: Response) => {
  res.json(getItem(getDb(), req.userId!, String(req.params.itemId)));
});

router.put('/:itemId', (req: AuthRequest, res: Response) => {
  try {
    const data = updateItemSchema.parse(req.body);
    res.json(updateItem(getDb(), req.userId!, String(req.params.itemId), data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

router.post('/:itemId/retire', (req: AuthRequest, res: Response) => {
  try {
    const data = retireItemSchema.parse(req.body);
    res.json(retireItem(getDb(), req.userId!, String(req.params.itemId), data));
  } catch (err) {
    if (handleValidationError(err, res)) return;
    throw err;
  }
});

export default router;
