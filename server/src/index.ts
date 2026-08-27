import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/init.js';
import { validateConfig } from './db/validateConfig.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { loadToolFaceManifest } from './mcp/manifest.js';
import {
  createMcpHostOriginGuard,
  createMcpRequestHandler,
} from './mcp/transport.js';

import authRoutes from './routes/auth.js';
import courseRoutes from './routes/courses.js';
import taskRoutes from './routes/tasks.js';
import recurringTaskRoutes from './routes/recurringTasks.js';
import goalRoutes from './routes/goals.js';
import dailyBriefRoutes from './routes/dailyBrief.js';
import dailyStatusRoutes from './routes/dailyStatus.js';
import settingsRoutes from './routes/settings.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import tagRoutes from './routes/tags.js';
import tagGroupRoutes from './routes/tagGroups.js';
import reviewRoutes from './routes/review.js';
import agentRoutes from './routes/agent.js';
import proposalRoutes from './routes/proposals.js';
import statisticsRoutes from './routes/statistics.js';
import sectionRoutes from './routes/sections.js';
import studyTemplateRoutes from './routes/studyTemplates.js';
import documentRoutes from './routes/documents.js';
import embeddingRoutes from './routes/embedding.js';
import timeBlockRoutes from './routes/timeBlocks.js';
import noteRoutes from './routes/notes.js';
import toolReceiptRoutes from './routes/toolReceipts.js';
import noteBlockRoutes from './routes/noteBlocks.js';
import projectionRoutes from './routes/projections.js';
import courseMaterialRoutes from './routes/courseMaterials.js';
import materialSegmentRoutes from './routes/materialSegments.js';
import reconciliationRoutes from './routes/reconciliation.js';
import sourceAnchorRoutes from './routes/sourceAnchors.js';
import sourceBoardRoutes from './routes/sourceBoards.js';
import sourceBoardNodeRoutes from './routes/sourceBoardNodes.js';
import sourceScopeRoutes from './routes/sourceScopes.js';
import sourceSnapshotRoutes from './routes/sourceSnapshots.js';
import templateRoutes from './routes/templates.js';
import compositionTemplateRoutes from './routes/compositionTemplates.js';
import packageManifestRoutes from './routes/packageManifests.js';
import domainBlockSetRoutes from './routes/domainBlockSets.js';
import packageExportRoutes from './routes/packageExports.js';
import packageImportRoutes from './routes/packageImports.js';
import domainRefinementRoutes from './routes/domainRefinements.js';
import contentGroupRoutes from './routes/contentGroups.js';
import groupFolderRoutes from './routes/groupFolders.js';
import canvasObjectRoutes from './routes/canvasObjects.js';
import canvasAssetRoutes from './routes/canvasAssets.js';
import annotationTruthRoutes from './routes/annotationTruths.js';
import purposeRoutes from './routes/purposes.js';
import sourceRoutes from './routes/sources.js';
import itemRoutes from './routes/items.js';
import relationRoutes from './routes/relations.js';
import { sweepSourceStorage } from './services/sourceFileIntake.js';
import {
  resumeReceivedSourceMaterializations,
  sweepSourceMaterializations,
} from './services/sourceMaterialization.js';
import { drainManagedFileCleanupJobs } from './services/managedFileCleanup.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Validate configuration before anything else
const serverConfig = validateConfig();
const toolFaceManifest = loadToolFaceManifest();

// Initialize database (async — runs migrations)
const database = await initDb();
const cleanupSweep = drainManagedFileCleanupJobs(database);
if (cleanupSweep.completed || cleanupSweep.pending) {
  console.log('Managed file cleanup startup sweep:', cleanupSweep);
}
const sourceSweep = sweepSourceStorage(database);
if (sourceSweep.removed_temp_orphans || sourceSweep.recovered_staging || sourceSweep.removed_stale_staging) {
  console.log('Source storage startup sweep:', sourceSweep);
}
const materializationSweep = sweepSourceMaterializations(database);
if (materializationSweep.interrupted_runs_failed || materializationSweep.orphan_projection_assets_removed) {
  console.log('Source materialization startup sweep:', materializationSweep);
}
const resumedMaterializations = resumeReceivedSourceMaterializations(database);
if (resumedMaterializations) {
  console.log(`Scheduled ${resumedMaterializations} received Source materialization(s) after startup.`);
}

const app = express();

// Global middleware
app.use(cors({
  origin: '*',
  credentials: false,
}));
app.use(express.json());
app.use(cookieParser());

// Public routes (no auth)
app.use('/api/auth', authRoutes);

if (process.env.NODE_ENV !== 'production' && process.env.COINCIDES_DEV_QUICK_LOGIN === 'enabled') {
  const { devQuickLoginRouter } = await import('./dev/quickLogin.js');
  app.use('/api/dev', devQuickLoginRouter);
}

// MCP transport: transport security gate, then the existing Bearer JWT gate.
app.post(
  '/api/mcp',
  createMcpHostOriginGuard(serverConfig.mcp),
  authMiddleware,
  createMcpRequestHandler({ manifest: toolFaceManifest }),
);

// Protected routes
app.use('/api/courses', authMiddleware, courseRoutes);
app.use('/api/tasks', authMiddleware, taskRoutes);
app.use('/api/recurring-tasks', authMiddleware, recurringTaskRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/daily-brief', authMiddleware, dailyBriefRoutes);
app.use('/api/daily-status', authMiddleware, dailyStatusRoutes);
app.use('/api/settings', authMiddleware, settingsRoutes);
app.use('/api/decks', authMiddleware, deckRoutes);
app.use('/api/cards', authMiddleware, cardRoutes);
app.use('/api/tags', authMiddleware, tagRoutes);
app.use('/api/tag-groups', authMiddleware, tagGroupRoutes);
app.use('/api/review', authMiddleware, reviewRoutes);
app.use('/api/agent', authMiddleware, agentRoutes);
app.use('/api/proposals', authMiddleware, proposalRoutes);
app.use('/api/statistics', authMiddleware, statisticsRoutes);
app.use('/api/sections', authMiddleware, sectionRoutes);
app.use('/api/study-templates', authMiddleware, studyTemplateRoutes);
app.use('/api/documents', authMiddleware, documentRoutes);
app.use('/api/embedding', authMiddleware, embeddingRoutes);
app.use('/api/time-blocks', authMiddleware, timeBlockRoutes);
app.use('/api/notes', authMiddleware, noteRoutes);
app.use('/api/tool-receipts', authMiddleware, toolReceiptRoutes);
app.use('/api/note-blocks', authMiddleware, noteBlockRoutes);
app.use('/api/projections', authMiddleware, projectionRoutes);
app.use('/api/course-materials', authMiddleware, courseMaterialRoutes);
app.use('/api/material-segments', authMiddleware, materialSegmentRoutes);
app.use('/api/reconciliation', authMiddleware, reconciliationRoutes);
app.use('/api/source-anchors', authMiddleware, sourceAnchorRoutes);
app.use('/api/source-boards', authMiddleware, sourceBoardRoutes);
app.use('/api/source-board-nodes', authMiddleware, sourceBoardNodeRoutes);
app.use('/api/source-scopes', authMiddleware, sourceScopeRoutes);
app.use('/api/source-snapshots', authMiddleware, sourceSnapshotRoutes);
app.use('/api/templates', authMiddleware, templateRoutes);
app.use('/api/composition-templates', authMiddleware, compositionTemplateRoutes);
app.use('/api/package-manifests', authMiddleware, packageManifestRoutes);
app.use('/api/domain-block-sets', authMiddleware, domainBlockSetRoutes);
app.use('/api/package-exports', authMiddleware, packageExportRoutes);
app.use('/api/package-imports', authMiddleware, packageImportRoutes);
app.use('/api/domain-refinements', authMiddleware, domainRefinementRoutes);
app.use('/api/content-groups', authMiddleware, contentGroupRoutes);
app.use('/api/group-folders', authMiddleware, groupFolderRoutes);
app.use('/api/canvas-objects', authMiddleware, canvasObjectRoutes);
app.use('/api/canvas-assets', authMiddleware, canvasAssetRoutes);
app.use('/api/annotation-truths', authMiddleware, annotationTruthRoutes);
app.use('/api/purposes', authMiddleware, purposeRoutes);
app.use('/api/sources', authMiddleware, sourceRoutes);
app.use('/api/items', authMiddleware, itemRoutes);
app.use('/api/relations', authMiddleware, relationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve built client files in production / Electron mode
import { existsSync } from 'fs';
const clientDistPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
if (existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(clientDistPath, 'index.html'));
  });
  console.log(`Serving client from ${clientDistPath}`);
}

// Global error handler (must be after routes)
app.use(errorHandler);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Coincides server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('\nShutting down...');
  server.close(() => {
    closeDb();
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
