/**
 * PostgreSQL Connection Pool
 * 
 * Central database connection management for Coincides.
 * All database access goes through this module.
 * 
 * Usage:
 *   import { query, getClient, transaction } from './pool.js';
 *   
 *   // Simple query
 *   const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
 *   
 *   // Transaction
 *   await transaction(async (client) => {
 *     await client.query('INSERT INTO ...', [...]);
 *     await client.query('UPDATE ...', [...]);
 *   });
 */

import pg from 'pg';
const { Pool } = pg;

let pool: pg.Pool | null = null;

/**
 * Initialize the connection pool.
 * Called once during server startup from init.ts.
 */
export function initPool(databaseUrl?: string): pg.Pool {
  const connectionString = databaseUrl || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Set it in .env or pass it to initPool().\n' +
      'Example: DATABASE_URL=postgresql://user:password@localhost:5432/coincides'
    );
  }

  pool = new Pool({
    connectionString,
    // Connection pool settings
    max: 20,                   // Max concurrent connections
    idleTimeoutMillis: 30000,  // Close idle connections after 30s
    connectionTimeoutMillis: 5000,  // Fail if can't connect in 5s
  });

  // Log connection errors (don't crash the server)
  pool.on('error', (err) => {
    console.error('[PostgreSQL] Unexpected pool error:', err.message);
  });

  return pool;
}

/**
 * Get the current pool instance.
 * Throws if pool hasn't been initialized.
 */
export function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initPool() first.');
  }
  return pool;
}

/**
 * Execute a query using the pool.
 * Automatically acquires and releases a client.
 * 
 * @param text - SQL query with $1, $2, ... placeholders
 * @param params - Parameter values
 * @returns Query result with rows
 */
export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/**
 * Get a single row from a query (like SQLite's .get()).
 * Returns undefined if no rows found.
 */
export async function queryOne<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T | undefined> {
  const result = await query<T>(text, params);
  return result.rows[0];
}

/**
 * Get all rows from a query (like SQLite's .all()).
 */
export async function queryAll<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}

/**
 * Execute a query that modifies data (INSERT/UPDATE/DELETE).
 * Returns the number of affected rows.
 */
export async function execute(
  text: string,
  params?: any[]
): Promise<{ rowCount: number }> {
  const result = await query(text, params);
  return { rowCount: result.rowCount ?? 0 };
}

/**
 * Run multiple queries in a transaction.
 * Automatically handles BEGIN/COMMIT/ROLLBACK.
 * 
 * @param fn - Function that receives a pg.PoolClient to run queries on
 */
export async function transaction<T>(
  fn: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close the connection pool.
 * Called during graceful shutdown.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
