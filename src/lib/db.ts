import 'server-only'
import { Pool, PoolConfig } from 'pg'

function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    return {
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl:
        process.env.DATABASE_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false
    }
  }

  let searchPath: string | null = null
  try {
    const url = new URL(connectionString)
    searchPath = url.searchParams.get('search_path')
  } catch {}

  return {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
    options: searchPath ? `-c search_path=${searchPath},public` : undefined
  }
}

// Prevents connection leaks during Next.js HMR in development
const globalForPg = globalThis as unknown as { pgPool?: Pool }
const pool = globalForPg.pgPool ?? new Pool(getPoolConfig())

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool
}

const connStr = process.env.DATABASE_URL
if (connStr) {
  try {
    const url = new URL(connStr)
    const searchPath = url.searchParams.get('search_path')
    if (searchPath) {
      pool.on('connect', (client) => {
        client.query(`SET search_path TO "${searchPath}", public`)
      })
    }
  } catch {}
}

export default pool
