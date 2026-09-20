import { NextRequest, NextResponse } from 'next/server'
import { generateDailySeeds } from '@/app/actions/generateDailySeeds'

// Protected endpoint for scheduled daily puzzle generation.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`

  if (!auth || auth !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateDailySeeds()
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
