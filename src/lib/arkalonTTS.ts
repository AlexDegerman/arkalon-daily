// Browser SpeechSynthesis wrapper with voice selection, pause handling,
// and cooldown protection for the Arkalon voice system.

let lastSpeakTime = 0
const COOLDOWN_MS = 500

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined') return []
  const v = window.speechSynthesis.getVoices()
  if (v.length > 0) cachedVoices = v
  return cachedVoices
}

function getArkalonVoice(): SpeechSynthesisVoice | null {
  const voices = loadVoices()
  if (!voices.length) return null

  const targetNames = [
    'Google UK English Male',
    'Microsoft David Desktop',
    'Microsoft David - English (United States)',
    'English (United Kingdom)'
  ]

  for (const name of targetNames) {
    const found = voices.find((v) => v.name === name)
    if (found) return found
  }

  return (
    voices.find(
      (v) => v.name.toLowerCase().includes('male') && v.lang.startsWith('en')
    ) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    voices[0]
  )
}

function formatArkalonSpeech(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '') // Remove emojis
    .replace(/[^\w\s.,!?'-]/g, '')
    .replace(/\.{3}/g, '') // Strip existing "..." so the formatter handles pacing cleanly
    .trim()
}

// Call once on first user interaction to unlock SpeechSynthesis on mobile.
export function unlockArkalon(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.getVoices()
  const utterance = new SpeechSynthesisUtterance('')
  utterance.volume = 0
  window.speechSynthesis.speak(utterance)
}

// Preloads available voices. Must be called after user interaction on some browsers.
export function primeArkalonVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  loadVoices()
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
}

// Speaks text with configured voice, pacing, and cooldown handling.
export function speakArkalon(text: string, volume = 0.88): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const now = Date.now()
  if (now - lastSpeakTime < COOLDOWN_MS) return
  lastSpeakTime = now

  const cleaned = formatArkalonSpeech(text)
  if (!cleaned) return

  const words = cleaned.split(' ')

  // Apply dramatic pacing through synthetic pauses
  const mythicalText =
    words.length <= 6
      ? `... ${words.join('... ')} ...`
      : `... ${cleaned.replace(/[.,!?]/g, '...')} ...`

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(mythicalText)

    utterance.rate = 0.75
    utterance.pitch = 0.25
    utterance.volume = volume

    const voice = getArkalonVoice()
    if (voice) utterance.voice = voice

    window.speechSynthesis.speak(utterance)
  }, 50)
}
