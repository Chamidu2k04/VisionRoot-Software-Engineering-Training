import { Pool, QueryResult, QueryResultRow } from 'pg';
import { getDatabaseUrl } from '../config/environment';

let poolInstance: Pool | null = null;

/**
 * Returns the singleton pg.Pool instance, initializing it if not already created.
 */
export function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = getDatabaseUrl();
    poolInstance = new Pool({
      connectionString,
    });

    poolInstance.on('error', (err: Error) => {
      console.error('[PostgreSQL Pool Error] Unexpected idle client error:', err.message);
    });
  }
  return poolInstance;
}

/**
 * Proxy object for direct pool operations (e.g. pool.query, pool.connect, pool.end)
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop: string | symbol) {
    const activePool = getPool();
    const val = (activePool as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return val.bind(activePool);
    }
    return val;
  },
});

/**
 * Parameterized query helper executing SQL against the PostgreSQL connection pool.
 */
export async function query<R extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<R>> {
  return getPool().query<R>(text, params);
}

/**
 * Executes a simple query to verify database connectivity.
 * Returns true if connected, false on any error without throwing or crashing the server.
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error(
      '[Database Health Check] Failed to connect to PostgreSQL:',
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Cleanly closes all clients in the connection pool.
 */
export async function closePool(): Promise<void> {
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
