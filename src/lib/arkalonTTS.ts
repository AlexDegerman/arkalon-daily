// Browser SpeechSynthesis wrapper with voice selection, pause handling,
// and cooldown protection.

const COOLDOWN_MS = 800
const PAUSE_DURATION_MS = 320

let lastSpokenAt = 0
let voicesLoaded = false

// Replaces "..." in text with silence padding via multiple utterances.
// SpeechSynthesis has no SSML support in browsers, so pauses are
// simulated by splitting on "..." and chaining utterances with delays.
function buildPausedUtterances(
  text: string,
  volume: number
): SpeechSynthesisUtterance[] {
  const voice = pickVoice()
  const segments = text.split('...')
  return segments.map((segment) => {
    const utt = new SpeechSynthesisUtterance(segment.trim())
    utt.rate = 0.82
    utt.pitch = 0.7
    utt.volume = Math.min(1, Math.max(0, volume))
    if (voice) utt.voice = voice
    return utt
  })
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  const preferred = [
    'Google UK English Male',
    'Microsoft David',
    'Microsoft Mark',
    'en-GB',
    'en-US'
  ]
  for (const name of preferred) {
    const match = voices.find(
      (v) => v.name.includes(name) || v.lang.startsWith(name)
    )
    if (match) return match
  }
  // Fall back to a generic English voice if preferred voices are unavailable.
  return (
    voices.find(
      (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
    ) ||
    voices.find((v) => v.lang.startsWith('en')) ||
    null
  )
}

// Call once on first user interaction to unlock SpeechSynthesis on mobile.
export function unlockArkalon(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const utt = new SpeechSynthesisUtterance('')
  utt.volume = 0
  window.speechSynthesis.speak(utt)
}

// Preloads available voices. Must be called after user interaction on some browsers.
export function primeArkalonVoices(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  if (voicesLoaded) return
  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    voicesLoaded = true
    return
  }
  window.speechSynthesis.onvoiceschanged = () => {
    voicesLoaded = true
  }
}

// Speaks text with configured voice, pacing, and cooldown handling.
// Respects cooldown; cancels any currently speaking utterance before starting.
export function speakArkalon(text: string, volume = 0.5): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const now = Date.now()
  if (now - lastSpokenAt < COOLDOWN_MS) return
  lastSpokenAt = now

  window.speechSynthesis.cancel()

  const utterances = buildPausedUtterances(text, volume)
  if (utterances.length === 0) return

  let index = 0
  function speakNext() {
    if (index >= utterances.length) return
    const utt = utterances[index]
    utt.onend = () => {
      index++
      if (index < utterances.length) {
        setTimeout(speakNext, PAUSE_DURATION_MS)
      }
    }
    window.speechSynthesis.speak(utt)
  }

  speakNext()
}
