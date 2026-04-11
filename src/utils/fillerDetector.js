export const FILLER_WORDS = [
  // Hesitation sounds
  'um',
  'umm',
  'uh',
  'uhh',
  'er',
  'err',
  'hmm',
  // Verbal fillers
  'like',
  'basically',
  'literally',
  'actually',
  'honestly',
  'seriously',
  'obviously',
  'clearly',
  'simply',
  'just',
  'sort of',
  'kind of',
  'kinda',
  'sorta',
  'you know',
  'you know what i mean',
  'i mean',
  'i guess',
  'i think',
  'i feel like',
  'right',
  'okay',
  'so',
  'anyway',
  'well',
  'look',
  'essentially',
  'at the end of the day',
  'to be honest',
  'to be fair',
  'thing is',
]

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function detectFillerWords(transcript = '') {
  const lower = transcript.toLowerCase()
  const counts = {}

  FILLER_WORDS.forEach((word) => {
    const pattern = new RegExp(`\\b${escapeRegex(word)}\\b`, 'g')
    const matches = lower.match(pattern)
    if (matches?.length) {
      counts[word] = matches.length
    }
  })

  return counts
}

export function countWords(input = '') {
  if (!input.trim()) return 0
  return input.trim().split(/\s+/).filter(Boolean).length
}

export function totalFillerCount(counts = {}) {
  return Object.values(counts).reduce((sum, n) => sum + n, 0)
}
