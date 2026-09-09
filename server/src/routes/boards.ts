import type Database from 'better-sqlite3';
import { Router, type RequestHandler, type Response } from 'express';
import { z, ZodError } from 'zod';
import { getDb } from '../db/init.js';
import type { AuthRequest } from '../middleware/auth.js';
import { runRecordedAction, type RecordedActionEvent } from '../middleware/recordedAction.js';
import {
  createBoard, getBoard, listBoards, updateBoard, deleteBoard,
  mountBoardMember, updateBoardMember, unmountBoardMember,
  mountBoardTextRange,
  createBoardEdge, updateBoardEdge, deleteBoardEdge,
  createBoardVisual, updateBoardVisual, deleteBoardVisual,
  listBoardLayers, createBoardLayer, updateBoardLayer, reorderBoardLayers, deleteBoardLayer,
  castBoardSticky,
} from '../services/boards.js';
import { relocateTrayToBoard, undoTrayRelocation } from '../services/boardTrayRelocation.js';
import { createBoardCeremonyNote } from '../services/boardCeremonyNote.js';
import { listBoardTextRanges, updateBoardTextRanges } from '../services/boardTextRanges.js';
import {
  createBoardSchema, updateBoardSchema,
  mountBoardMemberSchema, updateBoardMemberSchema,
  createBoardEdgeSchema, updateBoardEdgeSchema,
  createBoardVisualSchema, updateBoardVisualSchema,
  createBoardLayerSchema, updateBoardLayerSchema, reorderBoardLayersSchema,
  relocateTraySchema,
} from '../validators/boards.js';

const summarySchema = z.string().max(4000).optional();
const boardActionEnvelope = z.object({
  summary: summarySchema,
  purpose_summary: summarySchema,
}).passthrough();
const mountActionEnvelope = z.object({ summary: summarySchema }).passthrough();
const unmountActionSchema = z.object({ summary: summarySchema }).strict();
const listBoardsQuery = z.object({ project_id: z.string().min(1).optional() }).strict();

function handle(action: (req: AuthRequest, res: Response) => void): RequestHandler {
  return (req: AuthRequest, res, next) => {
    try {
      action(req, res);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'Validation error', details: error.errors });
        return;
      }
      next(error);
    }
  };
}

/** Database injection is for isolated fixtures; production is mounted after authMiddleware. */
export function createBoardRouter(database: () => Database.Database = getDb): Router {
  const router = Router();

  router.get('/', handle((req, res) => {
    res.json({ boards: listBoards(database(), req.userId!, listBoardsQuery.parse(req.query)) });
  }));

  router.get('/text-ranges/by-note/:noteId', handle((req, res) => {
    res.json({ text_ranges: listBoardTextRanges(database(), req.userId!, String(req.params.noteId)) });
  }));

  router.put('/text-ranges/by-note/:noteId', handle((req, res) => {
    const db = database();
    const text_ranges = db.transaction(() => updateBoardTextRanges(db, req.userId!, String(req.params.noteId), req.body))();
    res.json({ text_ranges });
  }));

  router.post('/', handle((req, res) => {
    const { summary, purpose_summary: purposeSummary, ...body } = boardActionEnvelope.parse(req.body);
    const input = createBoardSchema.parse(body);
    const board = runRecordedAction(database(), req, 'POST /api/boards', (db, userId) => {
      const result = createBoard(db, userId, input);
      const events: RecordedActionEvent[] = [];
      if (result.purposeCreated) {
        events.push({
          verb: 'purpose_created',
          objects: [{ kind: 'purpose', id: result.purposeCreated.id }],
          summary: purposeSummary ?? `Created purpose: ${result.purposeCreated.title}`,
        });
      }
      events.push({
        verb: 'board_created',
        objects: [{ kind: 'board', id: result.board.id }, { kind: 'purpose', id: result.board.soul_id }],
        summary: summary ?? `Created board: ${result.board.title}`,
      });
      return { value: result.board, events };
    });
    res.status(201).json({ board });
  }));

  router.get('/:boardId', handle((req, res) => {
    res.json(getBoard(database(), req.userId!, String(req.params.boardId)));
  }));

  router.post('/:boardId/ceremony-note', handle((req, res) => {
    res.status(201).json(createBoardCeremonyNote(database(), req.userId!, String(req.params.boardId), req.body));
  }));

  router.patch('/:boardId', handle((req, res) => {
    const db = database();
    const input = updateBoardSchema.parse(req.body);
    const board = db.transaction(() => updateBoard(db, req.userId!, String(req.params.boardId), input))();
    res.json({ board });
  }));

  router.get('/:boardId/layers', handle((req, res) => {
    res.json({ layers: listBoardLayers(database(), req.userId!, String(req.params.boardId)) });
  }));

  router.post('/:boardId/layers', handle((req, res) => {
    const db = database();
    const input = createBoardLayerSchema.parse(req.body);
    const layer = db.transaction(() => createBoardLayer(db, req.userId!, String(req.params.boardId), input))();
    res.status(201).json({ layer });
  }));

  router.put('/:boardId/layers/order', handle((req, res) => {
    const db = database();
    const input = reorderBoardLayersSchema.parse(req.body);
    const layers = db.transaction(() => reorderBoardLayers(db, req.userId!, String(req.params.boardId), input))();
    res.json({ layers });
  }));

  router.patch('/:boardId/layers/:layerId', handle((req, res) => {
    const db = database();
    const input = updateBoardLayerSchema.parse(req.body);
    const layer = db.transaction(() => updateBoardLayer(
      db, req.userId!, String(req.params.boardId), String(req.params.layerId), input,
    ))();
    res.json({ layer });
  }));

  router.delete('/:boardId/layers/:layerId', handle((req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    const db = database();
    const result = db.transaction(() => deleteBoardLayer(
      db, req.userId!, String(req.params.boardId), String(req.params.layerId),
    ))();
    res.json(result);
  }));

  router.delete('/:boardId', handle((req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'DELETE /api/boards/:boardId', (db, userId) => {
      const value = deleteBoard(db, userId, boardId);
      const { board, member_count, edge_count, visual_count } = value;
      return {
        value,
        events: [{
          verb: 'board_deleted',
          objects: [{ kind: 'board', id: board.id }],
          summary: `Board "${board.title}" deleted: ${member_count} members, ${edge_count} edges, ${visual_count} visuals`,
          meta: { title: board.title, member_count, edge_count, visual_count },
        }],
      };
    });
    res.json(result);
  }));

  router.post('/:boardId/relocate-tray', handle((req, res) => {
    const input = relocateTraySchema.parse(req.body);
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'POST /api/boards/:boardId/relocate-tray', (db, userId) => {
      const { value, members } = relocateTrayToBoard(db, userId, boardId, input);
      return { value, events: members.map((member) => ({
        verb: 'mounted' as const,
        objects: [{ kind: 'board', id: boardId }, { kind: 'board_member', id: member.id },
          { kind: 'content_group', id: member.member_id }],
        summary: `Mounted content_group: ${member.member_id}`,
        meta: { batch_id: value.batch_id },
      })) };
    });
    res.status(201).json(result);
  }));

  router.post('/:boardId/relocate-tray/:batchId/undo', handle((req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'POST /api/boards/:boardId/relocate-tray/:batchId/undo', (db, userId) => {
      const { value, members } = undoTrayRelocation(db, userId, boardId, String(req.params.batchId));
      return { value, events: members.map((member) => ({
        verb: 'unmounted' as const,
        objects: [{ kind: 'board', id: boardId }, { kind: 'board_member', id: member.id },
          { kind: 'content_group', id: member.member_id }],
        summary: `Unmounted content_group: ${member.member_id}`,
        meta: { batch_id: value.batch_id },
      })) };
    });
    res.json(result);
  }));

  router.post('/:boardId/members', handle((req, res) => {
    const { summary, ...body } = mountActionEnvelope.parse(req.body);
    const input = mountBoardMemberSchema.parse(body);
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'POST /api/boards/:boardId/members', (db, userId) => {
      const value = mountBoardMember(db, userId, boardId, input);
      return {
        value,
        events: value.created ? [{
          verb: 'mounted',
          objects: [
            { kind: 'board', id: boardId },
            { kind: 'board_member', id: value.member.id },
            { kind: value.member.member_kind, id: value.member.member_id },
          ],
          summary: summary ?? `Mounted ${value.member.member_kind}: ${value.member.member_id}`,
        }] : [],
      };
    });
    res.status(result.created ? 201 : 200).json(result);
  }));

  router.post('/:boardId/text-ranges', handle((req, res) => {
    const { summary, ...body } = mountActionEnvelope.parse(req.body);
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'POST /api/boards/:boardId/text-ranges', (db, userId) => {
      const value = mountBoardTextRange(db, userId, boardId, body);
      return { value, events: [{
        verb: 'mounted',
        objects: [{ kind: 'board', id: boardId }, { kind: 'board_member', id: value.member.id },
          { kind: 'text_range', id: value.member.member_id }],
        summary: summary ?? `Mounted text_range: ${value.member.member_id}`,
      }] };
    });
    res.status(201).json(result);
  }));

  router.patch('/:boardId/members/:memberId', handle((req, res) => {
    const db = database();
    const input = updateBoardMemberSchema.parse(req.body);
    const member = db.transaction(() => updateBoardMember(
      db, req.userId!, String(req.params.boardId), String(req.params.memberId), input,
    ))();
    res.json({ member });
  }));

  router.delete('/:boardId/members/:memberId', handle((req, res) => {
    const { summary } = unmountActionSchema.parse(req.body ?? {});
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'DELETE /api/boards/:boardId/members/:memberId', (db, userId) => {
      const value = unmountBoardMember(db, userId, boardId, String(req.params.memberId));
      return {
        value,
        events: value.removed && value.member ? [{
          verb: 'unmounted',
          objects: [
            { kind: 'board', id: boardId },
            { kind: 'board_member', id: value.member.id },
            { kind: value.member.member_kind, id: value.member.member_id },
          ],
          summary: summary ?? `Unmounted ${value.member.member_kind}: ${value.member.member_id}`,
        }] : [],
      };
    });
    res.json(result);
  }));

  router.post('/:boardId/edges', handle((req, res) => {
    const db = database();
    const input = createBoardEdgeSchema.parse(req.body);
    const edge = db.transaction(() => createBoardEdge(db, req.userId!, String(req.params.boardId), input))();
    res.status(201).json({ edge });
  }));

  router.patch('/:boardId/edges/:edgeId', handle((req, res) => {
    const db = database();
    const input = updateBoardEdgeSchema.parse(req.body);
    const edge = db.transaction(() => updateBoardEdge(
      db, req.userId!, String(req.params.boardId), String(req.params.edgeId), input,
    ))();
    res.json({ edge });
  }));

  router.delete('/:boardId/edges/:edgeId', handle((req, res) => {
    const db = database();
    const removed = db.transaction(() => deleteBoardEdge(
      db, req.userId!, String(req.params.boardId), String(req.params.edgeId),
    ))();
    res.json({ removed });
  }));

  router.post('/:boardId/visuals', handle((req, res) => {
    const db = database();
    const input = createBoardVisualSchema.parse(req.body);
    const visual = db.transaction(() => createBoardVisual(db, req.userId!, String(req.params.boardId), input))();
    res.status(201).json({ visual });
  }));

  router.patch('/:boardId/visuals/:visualId', handle((req, res) => {
    const db = database();
    const input = updateBoardVisualSchema.parse(req.body);
    const visual = db.transaction(() => updateBoardVisual(
      db, req.userId!, String(req.params.boardId), String(req.params.visualId), input,
    ))();
    res.json({ visual });
  }));

  router.post('/:boardId/visuals/:visualId/cast', handle((req, res) => {
    z.object({}).strict().parse(req.body ?? {});
    const boardId = String(req.params.boardId);
    const result = runRecordedAction(database(), req, 'POST /api/boards/:boardId/visuals/:visualId/cast', (db, userId) => {
      const value = castBoardSticky(db, userId, boardId, String(req.params.visualId));
      return { value, events: [{
        verb: 'mounted',
        objects: [{ kind: 'board', id: boardId }, { kind: 'board_member', id: value.member.id },
          { kind: 'item', id: value.item.id }],
        summary: `Mounted item: ${value.item.id}`,
      }] };
    });
    res.status(201).json(result);
  }));

  router.delete('/:boardId/visuals/:visualId', handle((req, res) => {
    const db = database();
    const removed = db.transaction(() => deleteBoardVisual(
      db, req.userId!, String(req.params.boardId), String(req.params.visualId),
    ))();
    res.json({ removed });
  }));

  return router;
}

export default createBoardRouter();
