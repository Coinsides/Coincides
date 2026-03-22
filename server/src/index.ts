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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Validate configuration before anything else
validateConfig();

// Initialize database (async — runs migrations)
await initDb();

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
