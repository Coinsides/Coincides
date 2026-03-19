import type Database from 'better-sqlite3';

export default {
  id: '008_goal_dependencies',
  description: 'Add goal_dependencies table (DAG-compatible, v1.3 linear chain only)',
  up(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS goal_dependencies (
        id TEXT PRIMARY KEY,
        goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        depends_on_goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(goal_id, depends_on_goal_id)
      );

      CREATE INDEX IF NOT EXISTS idx_goal_deps_goal ON goal_dependencies(goal_id);
      CREATE INDEX IF NOT EXISTS idx_goal_deps_depends ON goal_dependencies(depends_on_goal_id);
    `);
  },
};
