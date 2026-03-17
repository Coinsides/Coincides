import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initDb, closeDb } from './db/init.js';
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

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Initialize database
initDb();

const app = express();

// Global middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be after routes)
app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`Coincides server running on http://localhost:${PORT}`);
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
