import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

export function createPool(config?: PoolConfig): Pool {
  if (pool) {
    return pool;
  }

  const poolConfig: PoolConfig = config || {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    return createPool();
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
