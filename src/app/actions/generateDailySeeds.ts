'use server'

import 'server-only'

import pool from '@/lib/db'
import { deriveDailySeed, getUtcDateString } from '@/lib/puzzles/hmac'
import { generateWithValidation } from '@/lib/puzzles/validateChallenge'
import { CATEGORY_ORDER } from '@/constants/categories'
import type { PuzzleCategory } from '@/types/puzzle'

// Lazily loads the registry to avoid circular dependencies during initialization.
let familyRegistry: Map<
  string,
  import('@/types/puzzle').PuzzleFamilyDefinition
> | null = null

async function getRegistry() {
  if (!familyRegistry) {
    // Dynamically imported to avoid circular dependency during phased build.
    const mod = await import('@/lib/puzzles/familyRegistry').catch(() => null)
    familyRegistry = mod?.FAMILY_REGISTRY ?? null
  }
  return familyRegistry
}

export interface GenerateDailySeedsResult {
  generated: number
  skipped: number
  errors: string[]
}

// Generates daily puzzle entries for a date.
// Safe to run repeatedly because existing categories are skipped.
export async function generateDailySeeds(
  puzzleDate?: string
): Promise<GenerateDailySeedsResult> {
  const date = puzzleDate ?? getUtcDateString()
  const registry = await getRegistry()

  let generated = 0
  let skipped = 0
  const errors: string[] = []

  const client = await pool.connect()
  try {
    const counterRows = await client.query<{
      category: string
      max_index: number
    }>(
      `SELECT category, MAX(family_index) AS max_index
        FROM daily_puzzles
        GROUP BY category`
    )
    const indexMap = Object.fromEntries(
      counterRows.rows.map((r) => [r.category, r.max_index ?? 0])
    )

    for (const category of CATEGORY_ORDER) {
      try {
        const existing = await client.query(
          `SELECT id FROM daily_puzzles WHERE puzzle_date = $1 AND category = $2`,
          [date, category]
        )
        if (existing.rows.length > 0) {
          skipped++
          continue
        }

        const seed = deriveDailySeed(date, category)

        // Resolves the puzzle family assigned to this category.
        // Each category currently maps to a single family.
        const familyId = getCategoryFamilyId(category)
        let seedData: import('@/types/puzzle').PuzzleSeedData | null = null

        if (registry) {
          const family = registry.get(familyId)
          if (family) {
            seedData = generateWithValidation(seed, family)
          }
        }

        const newIndex = (indexMap[category] ?? 0) + 1
        indexMap[category] = newIndex

        await client.query(
          `INSERT INTO daily_puzzles
              (id, puzzle_date, category, puzzle_family_id, family_index, seed, created_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now())
            ON CONFLICT (puzzle_date, category) DO NOTHING`,
          [date, category, familyId, newIndex, seed]
        )

        generated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${category}: ${msg}`)
      }
    }
  } finally {
    client.release()
  }

  return { generated, skipped, errors }
}

// Returns the canonical family ID assigned to a category.
function getCategoryFamilyId(category: PuzzleCategory): string {
  const map: Record<PuzzleCategory, string> = {
    recall: 'arkalon_vision',
    surge: 'surge_frenzy',
    cipher: 'wild_prediction',
    strike: 'sniper_challenge',
    depths: 'crystal_mine'
  }
  return map[category]
}
