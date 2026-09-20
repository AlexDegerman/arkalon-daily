import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(): Promise<NextResponse> {
  try {
    // Verify database connectivity with a cheap query
    const client = await pool.connect()
    try {
      await client.query('SELECT 1')
    } finally {
      client.release()
    }
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
