import { useCallback, useMemo, useRef, useState } from 'react'
import { parseScoreResponse } from '../utils/scoreParser'

const MODEL = 'llama-3.1-8b-instant'

function looksLikeCodingPrompt(text = '') {
  return /\b(function|implement|write\s+code|coding|algorithm|class|return\s+the\s+string|duplicate\s+characters|array|string\s+input)\b/i.test(text)
}

function fallbackCodingQuestions({ domain, count, languageLabel }) {
  const templates = [
    {
      title: `${domain} Array Analysis`,
      prompt: `Write a function that receives an array of numbers and returns the second largest distinct value. Return null if it does not exist. Explain time complexity.`,
      functionName: 'secondLargest',
      starterCode: `function secondLargest(nums) {\n  // TODO: implement\n  return null\n}`,
      testCases: [
        { args: [[2, 5, 3, 5, 1]], expected: 3 },
        { args: [[9]], expected: null },
      ],
    },
    {
      title: `${domain} Data Grouping`,
      prompt: `Given a list of records with a category field, return a map/object counting how many items belong to each category. Handle empty input safely.`,
      functionName: 'groupCounts',
      starterCode: `function groupCounts(items) {\n  // TODO: implement\n  return {}\n}`,
      testCases: [
        {
          args: [[{ category: 'a' }, { category: 'b' }, { category: 'a' }]],
          expected: { a: 2, b: 1 },
        },
        { args: [[]], expected: {} },
      ],
    },
    {
      title: `${domain} Optimization Task`,
      prompt: `Implement a function that returns the first non-repeating character in a string. Return an empty string when none exists.`,
      functionName: 'firstUniqueChar',
      starterCode: `function firstUniqueChar(text) {\n  // TODO: implement\n  return ''\n}`,
      testCases: [
        { args: ['swiss'], expected: 'w' },
        { args: ['aabb'], expected: '' },
      ],
    },
  ]

  return templates.slice(0, Math.max(1, Math.min(3, count))).map((item) => ({
    ...item,
    language: languageLabel,
  }))
}

export default function useGroq({ languageName = 'English' } = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const SYSTEM_PROMPT = `You are a strict but fair professional interview coach and evaluator.
You ask clear, direct interview questions and give concise, actionable feedback.
IMPORTANT: You MUST respond entirely in ${languageName}. All questions, feedback, and tips must be in ${languageName} only.
Maintain context of the ongoing interview conversation.`

  const conversationRef = useRef([
    { role: 'system', content: SYSTEM_PROMPT }
  ])

  const apiBaseUrl = useMemo(() => {
    const configured = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api')
    return configured.replace(/\/$/, '')
  }, [])

  const requestCompletion = useCallback(async ({ messages, temperature, maxTokens, responseFormatJson }) => {
    const response = await fetch(`${apiBaseUrl}/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model: MODEL,
        temperature,
        max_tokens: maxTokens,
        ...(responseFormatJson ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error || 'Connection error.')
    }

    return data?.reply || ''
  }, [apiBaseUrl])

  const complete = useCallback(async ({
    prompt,
    temperature = 0.7,
    maxTokens = 300,
    useHistory = false,
    systemPromptOverride = null,
    responseFormatJson = false,
  }) => {
    setError(null)
    setLoading(true)

    try {
      let messages

      if (useHistory) {
        // Add the new user message to rolling history
        conversationRef.current = [
          ...conversationRef.current,
          { role: 'user', content: prompt },
        ]
        messages = conversationRef.current
      } else {
        messages = [
          { role: 'system', content: systemPromptOverride || SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ]
      }

      const reply = await requestCompletion({ messages, temperature, maxTokens, responseFormatJson })

      if (useHistory) {
        // Add AI reply to history to maintain context
        conversationRef.current = [
          ...conversationRef.current,
          { role: 'assistant', content: reply },
        ]
      }

      return reply
    } catch (err) {
      const message = err?.message || 'Unknown error contacting Groq API.'
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [requestCompletion])

  // Reset conversation history (call between sessions)
  const resetConversation = useCallback(() => {
    conversationRef.current = [{ role: 'system', content: SYSTEM_PROMPT }]
    setError(null)
  }, [])

  const generateQuestion = useCallback(async ({ domain, difficulty }) => {
    const prompt = `You are interviewing a candidate. Domain: ${domain}. Difficulty: ${difficulty}. 
Ask ONE clear, direct verbal interview question appropriate to that domain and difficulty. 
Do NOT ask coding tasks, programming exercises, or implementation questions.
Focus on experience, problem solving, trade-offs, debugging, architecture, or decision making.
No preamble, no numbering, no "sure" or "of course". Just the question.`

    const text = await complete({ prompt, temperature: 0.8, maxTokens: 150, useHistory: true })
    const fallback = `Tell me about a challenging ${domain} project you handled and the impact you delivered.`
    if (!text || looksLikeCodingPrompt(text)) return fallback
    return text
  }, [complete])

  const evaluateAnswer = useCallback(async ({ question, transcript }) => {
    const prompt = `The candidate was asked: "${question}"
Their answer: "${transcript}"

Evaluate the answer specifically against this exact question.
Give short spoken coaching feedback in 2-3 sentences. Mention: what was strong, what was missing, one specific improvement.
If the answer is brief but relevant, keep the response brief too.
Be natural and coach-like. No bullet points or lists.`

    // Keep this per-question evaluation isolated to avoid prior conversation drift.
    const text = await complete({ prompt, temperature: 0.7, maxTokens: 300, useHistory: false })
    return text || 'You gave a clear attempt. Add one concrete metric and one trade-off next time. Keep your structure tight: context, action, measurable result.'
  }, [complete])

  const generateFollowUp = useCallback(async ({ transcript, difficulty = 'Intermediate', domain = 'General' } = {}) => {
    const difficultyStyle = {
      Beginner: 'Keep it supportive and clarifying. Ask about one concrete detail.',
      Intermediate: 'Ask for reasoning, trade-offs, or a measurable outcome.',
      Expert: 'Probe deeply for architecture decisions, constraints, and failure handling.',
      Easy: 'Keep it supportive and clarifying. Ask about one concrete detail.',
      Medium: 'Ask for reasoning, trade-offs, or a measurable outcome.',
      Hard: 'Probe deeply for architecture decisions, constraints, and failure handling.',
    }[difficulty] || 'Ask for deeper reasoning and one concrete detail.'

    const prompt = `Based on the candidate's last answer in a ${domain} interview: "${transcript}"

Difficulty: ${difficulty}
Style guidance: ${difficultyStyle}

Ask ONE smart follow-up question that digs deeper into something specific they mentioned.
Keep it short. Just the question, no preamble.`

    const text = await complete({ prompt, temperature: 0.7, maxTokens: 150, useHistory: true })
    return text || 'What was the hardest trade-off you had to make in that situation?'
  }, [complete])

  const generateCodingQuestions = useCallback(async ({
    domain,
    difficulty,
    count = 2,
    languageLabel = 'JavaScript',
  }) => {
    const safeCount = Math.max(1, Math.min(3, Number(count) || 2))

    const prompt = `Generate ${safeCount} coding interview questions.
Domain: ${domain}
Difficulty: ${difficulty}
Preferred language for starter code: ${languageLabel}

Return ONLY valid JSON with this shape:
{"questions":[{"title":"string","prompt":"string","starterCode":"string","functionName":"string","testCases":[{"args":["any"],"expected":"any"}],"language":"string"}]}

Rules:
- Questions must be practical and domain-relevant.
- Include one clear coding task per question.
- Starter code must be minimal and runnable.
- functionName must match the function in starterCode.
- Include 2 hidden testCases per question with args and expected.
- No markdown fences.
- Keep each prompt concise.`

    const text = await complete({
      prompt,
      temperature: 0.7,
      maxTokens: 900,
      useHistory: false,
      responseFormatJson: true,
    })

    try {
      const parsed = JSON.parse(text || '{}')
      const questions = Array.isArray(parsed?.questions) ? parsed.questions : []

      if (!questions.length) {
        return fallbackCodingQuestions({ domain, count: safeCount, languageLabel })
      }

      return questions.slice(0, safeCount).map((question, index) => ({
        title: question?.title || `${domain} Coding Question ${index + 1}`,
        prompt: question?.prompt || 'Write a solution for the given problem.',
        starterCode: question?.starterCode || `function solve(input) {\n  // TODO\n  return input\n}`,
        functionName: question?.functionName || 'solve',
        testCases: Array.isArray(question?.testCases) ? question.testCases.slice(0, 2) : [],
        language: question?.language || languageLabel,
      }))
    } catch {
      return fallbackCodingQuestions({ domain, count: safeCount, languageLabel })
    }
  }, [complete])

  const scoreCodingAnswer = useCallback(async ({ questionTitle, questionPrompt, code, difficulty, domain, localTestSummary = '' }) => {
    const trimmed = (code || '').trim()
    if (!trimmed) {
      return {
        relevance: 0,
        clarity: 0,
        depth: 0,
        confidence: 0,
        overall: 0,
        feedback: 'No code submitted. This question is scored as zero.',
      }
    }

    const scoringSystemPrompt = `You are a strict coding interviewer.
Output ONLY valid JSON without markdown.
Format exactly: {"relevance":0-10,"clarity":0-10,"depth":0-10,"confidence":0-10,"overall":0-10,"feedback":"string"}`

    const prompt = `Evaluate this coding answer.
Domain: ${domain}
Difficulty: ${difficulty}
Question title: ${questionTitle}
Question prompt: ${questionPrompt}

Candidate code:
${trimmed}

Local hidden test execution summary:
${localTestSummary || 'No local test summary available.'}

Score strictly out of 10 for relevance, clarity, depth, confidence, and overall.
Feedback must be short, direct, and actionable in 1-2 sentences.
Return ONLY valid JSON.`

    const text = await complete({
      prompt,
      temperature: 0.1,
      maxTokens: 220,
      useHistory: false,
      systemPromptOverride: scoringSystemPrompt,
      responseFormatJson: true,
    })

    return parseScoreResponse(text || '')
  }, [complete])

  const summarizeCodingImprovements = useCallback(async (codingScores) => {
    const avg = (key) => {
      const vals = codingScores.map((s) => s[key]).filter((val) => Number.isFinite(val))
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A'
    }

    const prompt = `Based on coding interview averages:
- Relevance: ${avg('relevance')}/10
- Clarity: ${avg('clarity')}/10
- Depth: ${avg('depth')}/10
- Confidence: ${avg('confidence')}/10
- Overall: ${avg('overall')}/10

Give 3 concrete tips to improve coding interview performance.
  Number as 1, 2, 3. Keep each tip very short.`

    const text = await complete({ prompt, temperature: 0.5, maxTokens: 220, useHistory: false })
    return text || '1) Start with edge cases before coding. 2) Explain time and space complexity explicitly. 3) Refactor variable names for readability before final submission.'
  }, [complete])

  const scoreAnswer = useCallback(async ({ question, transcript }) => {
    // Standalone scoring call - no history needed, dedicated system prompt
    const scoringSystemPrompt = `You are an expert technical interviewer and strict data evaluator. 
You must output ONLY valid JSON without markdown formatting.
Format exactly like this example: {"relevance": 5, "clarity": 5, "depth": 5, "confidence": 5, "overall": 5, "feedback": "Your concise, constructive feedback here."}`

    const prompt = `Score this interview answer strictly out of 10 for each dimension based on how well it answers the specific question.
Provide a 'feedback' string (1-3 sentences) directly addressing the candidate on what they did well and what they missed.
Return ONLY valid JSON.
Format: {"relevance": 0-10, "clarity": 0-10, "depth": 0-10, "confidence": 0-10, "overall": 0-10, "feedback": "string"}

  Scoring rules:
  - Give 0 only if the answer is empty, nonsensical, or clearly unrelated to the question.
  - If the answer is brief but relevant, give non-zero relevance and clarity, then reduce depth accordingly.

Question: "${question}"
Answer to score: "${transcript}"`

    const text = await complete({ 
      prompt, 
      temperature: 0.1, 
      maxTokens: 100, 
      useHistory: false,
      systemPromptOverride: scoringSystemPrompt,
      responseFormatJson: true
    })
    return parseScoreResponse(text || '')
  }, [complete])

  const summarizeImprovements = useCallback(async (allScores) => {
    const avg = (key) => {
      const vals = allScores.map((s) => s[key]).filter(Boolean)
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A'
    }

    const prompt = `Based on these interview performance averages:
- Relevance: ${avg('relevance')}/10
- Clarity: ${avg('clarity')}/10  
- Depth: ${avg('depth')}/10
- Confidence: ${avg('confidence')}/10
- Overall: ${avg('overall')}/10

Write 3 specific, actionable improvement tips for this candidate. 
Number them 1, 2, 3. Keep each tip to one sentence. Be direct and practical.`

    const text = await complete({ prompt, temperature: 0.6, maxTokens: 250, useHistory: false })
    return text || '1) Add specific impact metrics to your answers. 2) Explain decision trade-offs explicitly. 3) Use the STAR method: Situation, Task, Action, and measurable Result.'
  }, [complete])

  return {
    loading,
    error,
    generateQuestion,
    evaluateAnswer,
    scoreAnswer,
    generateFollowUp,
    generateCodingQuestions,
    scoreCodingAnswer,
    summarizeCodingImprovements,
    summarizeImprovements,
    resetConversation,
    hasApiKey: true,
  }
}
