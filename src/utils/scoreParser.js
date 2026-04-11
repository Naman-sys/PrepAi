const DEFAULT_SCORES = {
  relevance: 5,
  clarity: 5,
  depth: 5,
  confidence: 5,
  overall: 5,
  feedback: "We could not generate analysis for this answer. Please try again or elaborate more."
}

function normalizeScore(value) {
  const parsed = Number(value)
  if (Number.isNaN(parsed)) return 5
  return Math.max(0, Math.min(10, parsed))
}

export function parseScoreResponse(raw = '') {
  try {
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    const candidate =
      firstBrace >= 0 && lastBrace >= 0 ? raw.slice(firstBrace, lastBrace + 1) : raw

    const parsed = JSON.parse(candidate)

    return {
      relevance: normalizeScore(parsed.relevance),
      clarity: normalizeScore(parsed.clarity),
      depth: normalizeScore(parsed.depth),
      confidence: normalizeScore(parsed.confidence),
      overall: normalizeScore(parsed.overall),
      feedback: parsed.feedback || "Good attempt, but try to speak clearly and expand on your points.",
    }
  } catch (error) {
    return DEFAULT_SCORES
  }
}

export function defaultScores() {
  return { ...DEFAULT_SCORES }
}
