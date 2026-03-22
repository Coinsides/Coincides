/**
 * Database Initialization for PostgreSQL
 * 
 * Connects to PostgreSQL, runs schema creation, migrations, and seeds.
 * Called once during server startup.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { initPool, getPool, query, transaction, closePool } from './pool.js';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Initialize the database: connect, create schema, run migrations, seed data.
 */
export async function initDb(): Promise<void> {
  // Initialize connection pool
  const databaseUrl = process.env.DATABASE_URL;
  initPool(databaseUrl);

  // Test connection
  try {
    const result = await query('SELECT NOW() AS now');
    console.log(`PostgreSQL connected: ${result.rows[0].now}`);
  } catch (err: any) {
    console.error('Failed to connect to PostgreSQL:', err.message);
    throw err;
  }

  // Run base schema (CREATE TABLE IF NOT EXISTS — safe to re-run)
  const schemaPath = join(__dirname, 'schema.sql');
  const rawSchema = readFileSync(schemaPath, 'utf-8');

  // Strip SQL comments, then split on semicolons
  const schema = rawSchema
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      await query(stmt);
    } catch (err: any) {
      // Ignore "already exists" errors for indexes/tables
      if (!err.message.includes('already exists')) {
        console.error(`Schema statement failed: ${stmt.substring(0, 80)}...`);
        throw err;
      }
    }
  }

  // Run versioned migrations
  await runMigrations();

  // Seed system data
  await seedStudyTemplates();

  console.log('Database initialization complete.');
}

/**
 * Seed system tags for a new user.
 */
const SYSTEM_TAGS = ['Definition', 'Theorem', 'Formula', 'Important', 'Exam-relevant'];

export async function seedSystemTags(userId: string): Promise<void> {
  for (const tag of SYSTEM_TAGS) {
    await query(
      `INSERT INTO tags (id, user_id, name, is_system, created_at)
       VALUES ($1, $2, $3, TRUE, NOW())
       ON CONFLICT (user_id, name) DO NOTHING`,
      [uuidv4(), userId, tag]
    );
  }
}

/**
 * Seed system study templates.
 */
const SYSTEM_TEMPLATES = [
  {
    name: 'Spaced Repetition',
    slug: 'spaced_repetition',
    description: 'Review material at increasing intervals to combat the forgetting curve. Best for memorization-heavy subjects.',
    strategy: 'Uses the Ebbinghaus forgetting curve principle. Schedule reviews at 1, 3, 7, 14, 30 day intervals. Combine with active recall for maximum effect. Already integrated with FSRS in this app — this mode prioritizes card review tasks.',
    config: { review_intervals: [1, 3, 7, 14, 30], daily_new_cards: 10, daily_review_max: 50 },
  },
  {
    name: 'Interleaving',
    slug: 'interleaving',
    description: 'Alternate between different topics or problem types within a study session. Best for math, physics, and problem-solving subjects.',
    strategy: 'Instead of blocking study by topic, alternate between 2-3 related topics in each session. This forces the brain to discriminate between approaches. Recommended session: 30 min per topic, rotate. Combine with spaced practice.',
    config: { topics_per_session: 3, minutes_per_topic: 30, switch_after_minutes: 30 },
  },
  {
    name: 'Active Recall',
    slug: 'active_recall',
    description: 'Test yourself on material instead of re-reading. Close the book and retrieve from memory. Best for all subjects.',
    strategy: 'After studying, close notes and write/speak everything you remember. Use flashcards, practice questions, or self-quizzing. Students using retrieval practice score ~15% higher on exams.',
    config: { recall_sessions_per_day: 2, minutes_per_session: 20 },
  },
  {
    name: 'Feynman Technique',
    slug: 'feynman_technique',
    description: 'Explain concepts in simple language as if teaching a beginner. Exposes gaps in understanding. Best for deep conceptual learning.',
    strategy: 'Pick a concept → explain it simply → identify where you stumble → study those gaps → re-explain. Creates iterative feedback loops. Good for theoretical subjects.',
    config: { concepts_per_session: 2, explanation_minutes: 15 },
  },
  {
    name: 'Pomodoro',
    slug: 'pomodoro',
    description: '25-minute focused study intervals with 5-minute breaks. After 4 cycles, take a 15-30 minute break. Best for maintaining focus.',
    strategy: 'Time-boxing reduces start-up friction and preserves attention. Each Pomodoro = 25 min work + 5 min rest. After 4 Pomodoros, take 15-30 min break. Great for students who struggle with sustained attention.',
    config: { work_minutes: 25, short_break: 5, long_break: 20, cycles_before_long_break: 4 },
  },
  {
    name: 'Spiral Learning',
    slug: 'spiral_learning',
    description: 'Revisit concepts repeatedly, going deeper each time. Good for long-term courses where topics build on each other.',
    strategy: 'Introduce concept → move to next → circle back to first concept at deeper level. Reduces pressure to master everything on first pass. Good for math, language learning, progressive skill building.',
    config: { revisit_after_days: 7, depth_levels: 3 },
  },
  {
    name: 'Mastery-Based',
    slug: 'mastery_based',
    description: 'Master one concept completely before moving to the next. Best for subjects with strong linear dependencies.',
    strategy: 'Study one concept exclusively until comprehension is solid (self-test passes). Then proceed to next. Use pre-tests and post-tests. Good for sequential subjects like math foundations, programming.',
    config: { mastery_threshold: 0.85, practice_problems_min: 10 },
  },
];

async function seedStudyTemplates(): Promise<void> {
  for (const t of SYSTEM_TEMPLATES) {
    await query(
      `INSERT INTO study_mode_templates (id, user_id, name, slug, description, strategy, is_system, config, created_at)
       VALUES ($1, NULL, $2, $3, $4, $5, TRUE, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [uuidv4(), t.name, t.slug, t.description, t.strategy, JSON.stringify(t.config)]
    );
  }
}

/**
 * Close the database connection pool.
 */
export async function closeDb(): Promise<void> {
  await closePool();
}
