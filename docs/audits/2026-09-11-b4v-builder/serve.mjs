// From server/: node --import tsx ../docs/audits/2026-09-11-b4v-builder/serve.mjs
// Production BoardPage and boards router, connected to disposable SQLite only.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../../../client/node_modules/vite/dist/node/index.js';
import react from '../../../client/node_modules/@vitejs/plugin-react/dist/index.js';
import { createV13BoardsFixture } from '../../../server/src/__tests__/helpers/v13BoardsFixture.ts';
import { createBoardRouter } from '../../../server/src/routes/boards.ts';
import { AppError } from '../../../server/src/middleware/errorHandler.ts';
import {
  createBoard, createBoardLayer, createBoardVisual, mountBoardMember, createBoardEdge,
} from '../../../server/src/services/boards.ts';
import { createItem } from '../../../server/src/services/items.ts';
import {
  createBoardViewportBookmark, listBoardViewportBookmarks,
} from '../../../server/src/services/boardViewportBookmarks.ts';

const audit = dirname(fileURLToPath(import.meta.url));
const root = resolve(audit, '../../..');
const require = createRequire(new URL('../../../server/package.json', import.meta.url));
const express = require('express');
const OWNER = 'b4v-synthetic-owner';
const INITIAL_VIEWPORT = { x: 120, y: 80, zoom: 0.8 };
const SCENE_TABLES = ['board_members', 'board_visuals', 'board_edges', 'board_layers', 'board_text_ranges'];

export async function createB4vFixtureApp() {
  let db;
  let boardId;
  let sceneBefore;
  let boardBefore;
  let resetCount = 0;
  const requests = [];
  const observations = [];
  const scene = () => Object.fromEntries(SCENE_TABLES.map((table) => [table,
    db.prepare(`SELECT * FROM ${table} WHERE board_id = ? ORDER BY id`).all(boardId),
  ]));
  const state = () => {
    const rawBoard = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId) ?? null;
    const sceneNow = scene();
    return {
      isolation: { database: ':memory:', production_database_opened: false, owner: OWNER, reset_count: resetCount },
      board_id: boardId,
      initial_viewport: INITIAL_VIEWPORT,
      board: rawBoard,
      viewport: rawBoard ? JSON.parse(rawBoard.viewport) : null,
      bookmarks: db.prepare('SELECT * FROM board_viewport_bookmarks WHERE board_id = ? ORDER BY created_at, rowid').all(boardId),
      board_before: boardBefore,
      scene_before: sceneBefore,
      scene_now: sceneNow,
      scene_unchanged: JSON.stringify(sceneBefore) === JSON.stringify(sceneNow),
      requests,
      observations,
    };
  };

  async function reset() {
    const next = await createV13BoardsFixture();
    try {
      next.prepare("INSERT INTO users (id,email,password_hash,name) VALUES (?, 'b4v@example.invalid', 'synthetic', 'B4v synthetic owner')").run(OWNER);
      const seeded = next.transaction(() => {
        const { board } = createBoard(next, OWNER, {
          title: 'B4v viewport smoke', purpose: { title: 'Observe camera snapshots without changing the scene' },
          viewport: INITIAL_VIEWPORT,
        });
        const layer = createBoardLayer(next, OWNER, board.id, { name: 'Existing scene layer' });
        const first = createItem(next, OWNER, { plain_text: 'Chapter one — an existing card stays in place.' });
        const second = createItem(next, OWNER, { plain_text: 'Timeline — another existing card stays in place.' });
        const firstMount = mountBoardMember(next, OWNER, board.id, {
          member_kind: 'item', member_id: first.id, x: 60, y: 80, w: 260, h: 150, z_index: 3,
        }).member;
        const secondMount = mountBoardMember(next, OWNER, board.id, {
          member_kind: 'item', member_id: second.id, x: 700, y: 440, w: 260, h: 150, z_index: 9, layer_id: layer.id,
        }).member;
        createBoardEdge(next, OWNER, board.id, {
          from_member_id: firstMount.id, to_member_id: secondMount.id, label: 'Existing relationship',
        });
        createBoardVisual(next, OWNER, board.id, {
          visual_kind: 'shape', x: 410, y: 130, w: 210, h: 160, z_index: 6, layer_id: layer.id,
          data: { tray_source: { object: { metadata: { shape_type: 'ellipse' } },
            backing_blocks: [{ plain_text: 'Fixed landmark' }] } },
        });
        createBoardVisual(next, OWNER, board.id, {
          visual_kind: 'sticky', x: 280, y: 400, w: 240, h: 100, z_index: 4,
          data: { text: 'Only the camera should move.' },
        });
        return board.id;
      })();
      db?.close();
      db = next;
      boardId = seeded;
      boardBefore = db.prepare('SELECT * FROM boards WHERE id = ?').get(boardId);
      sceneBefore = scene();
      requests.length = 0;
      observations.length = 0;
      resetCount += 1;
      return state();
    } catch (error) {
      next.close();
      throw error;
    }
  }
  await reset();

  const app = express();
  app.use(express.json());
  app.get('/__fixture/state', (_req, res) => res.json(state()));
  app.get('/__fixture/evidence', (_req, res) => res.json({ observations }));
  app.post('/__fixture/evidence', (req, res) => {
    observations.push({ received_at: new Date().toISOString(), ...req.body });
    res.json({ recorded: observations.length });
  });
  app.post('/__fixture/reset', (_req, res, next) => { reset().then((value) => res.json(value), next); });
  app.post('/__fixture/fill-limit', (req, res, next) => {
    try {
      const target = req.body?.target_count ?? 24;
      if (!Number.isInteger(target) || target < 0 || target > 24) {
        res.status(400).json({ error: 'Fixture target_count must be an integer between 0 and 24.' });
        return;
      }
      db.transaction(() => {
        const existing = listBoardViewportBookmarks(db, OWNER, boardId).length;
        for (let index = existing; index < target; index += 1) {
          createBoardViewportBookmark(db, OWNER, boardId, {
            name: `Prepared view ${index + 1}`, x: index * -90, y: index * -45, zoom: 0.8,
          });
        }
      })();
      res.json(state());
    } catch (error) { next(error); }
  });
  app.use('/api', (req, res, next) => {
    req.userId = OWNER;
    const path = req.originalUrl;
    res.once('finish', () => requests.push({
      method: req.method, path, status: res.statusCode,
      ...(req.body && Object.keys(req.body).length ? { body: req.body } : {}),
    }));
    next();
  });
  // Unrelated library candidate reads are deliberately empty in this fixture.
  app.get('/api/courses', (_req, res) => res.json([]));
  app.get('/api/items', (_req, res) => res.json([]));
  app.use('/api/boards', createBoardRouter(() => db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Synthetic fixture has no such API.' }));
  app.use((error, _req, res, _next) => {
    res.status(error instanceof AppError ? error.statusCode : 500).json({ error: error.message, details: error.details });
  });
  return { app, state, close: () => db.close() };
}

export async function startB4vFixtureServer(port = 5195) {
  const fixture = await createB4vFixtureApp();
  const server = await createServer({
    configFile: false, envFile: false, root: audit,
    plugins: [{ name: 'b4v-isolated-sqlite', configureServer(vite) { vite.middlewares.use(fixture.app); } }, react()],
    resolve: { alias: {
      '@': resolve(root, 'client/src'),
      '@shared': resolve(root, 'shared'),
      'react-dom': resolve(root, 'client/node_modules/react-dom'),
      'react-router-dom': resolve(root, 'client/node_modules/react-router-dom'),
      react: resolve(root, 'client/node_modules/react'),
      'lucide-react': resolve(root, 'client/node_modules/lucide-react'),
    } },
    server: { host: '127.0.0.1', port, strictPort: true, fs: { allow: [root] } },
  });
  try { await server.listen(); }
  catch (error) { fixture.close(); throw error; }
  const stop = async () => { await server.close(); fixture.close(); };
  return { ...fixture, server, stop };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { stop } = await startB4vFixtureServer();
  console.log('B4v isolated SQLite + real BoardPage: http://127.0.0.1:5195/');
  console.log('Synthetic state: http://127.0.0.1:5195/__fixture/state');
  const finish = async () => { await stop(); process.exit(0); };
  process.on('SIGINT', finish);
  process.on('SIGTERM', finish);
}
