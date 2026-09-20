import { ADJECTIVES } from './adjectives'
import { ANIMALS } from './animals'

// Generates a recovery code in WORD-WORD-NNNN format.
// Caller is responsible for collision checking and retry logic.
export function generateRecoveryCode(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const digits = String(Math.floor(Math.random() * 9000) + 1000)
  return `${adj}-${animal}-${digits}`
}

// Derives a display name from a recovery code (e.g. "SWIFT-WOLF-4821" -> "SwiftWolf4821").
export function recoveryCodeToDisplayName(code: string): string {
  return code
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}
