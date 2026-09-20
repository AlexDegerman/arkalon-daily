import 'server-only'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl:
    process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
})

export default pool
