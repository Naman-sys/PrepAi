import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import useGroq from '../hooks/useGroq'

const COUNT_BY_DIFFICULTY = {
  Beginner: 2,
  Intermediate: 2,
  Expert: 3,
}

const TIME_BY_DIFFICULTY_SECONDS = {
  Beginner: 10 * 60,
  Intermediate: 15 * 60,
  Expert: 20 * 60,
}

const DRAFT_STORAGE_KEY = 'prepai_coding_draft_v1'

function getQuestionDraftKey(question, index) {
  const safeTitle = String(question?.title || '').trim()
  return `${index}::${safeTitle}`
}

const ZERO_SCORE = {
  relevance: 0,
  clarity: 0,
  depth: 0,
  confidence: 0,
  overall: 0,
  feedback: 'Skipped question. Score is 0 for this coding challenge.',
}

function resolveEditorLanguage(languageName) {
  const value = (languageName || '').toLowerCase()
  if (value.includes('python')) return 'python'
  if (value.includes('java')) return 'java'
  if (value.includes('c++')) return 'cpp'
  if (value.includes('typescript')) return 'typescript'
  return 'javascript'
}

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds)
  const minutes = String(Math.floor(safe / 60)).padStart(2, '0')
  const seconds = String(safe % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function safeStringify(value) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatArgs(args = []) {
  if (!Array.isArray(args)) return safeStringify(args)
  return args.map((arg) => safeStringify(arg)).join(', ')
}

function isEqualOutput(actual, expected) {
  return safeStringify(actual) === safeStringify(expected)
}

function detectFunctionName(code = '') {
  const match = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/)
  return match?.[1] || ''
}

function runHiddenJsTests({ code, functionName, testCases }) {
  const cases = Array.isArray(testCases) ? testCases : []
  if (!cases.length) {
    return {
      passed: 0,
      total: 0,
      runtimeError: '',
      summary: 'No hidden tests were available for local execution.',
    }
  }

  try {
    const resolvedName = functionName || detectFunctionName(code) || 'solve'
    const factory = new Function(`${code}\nreturn typeof ${resolvedName} === 'function' ? ${resolvedName} : null`)
    const fn = factory()

    if (typeof fn !== 'function') {
      return {
        passed: 0,
        total: cases.length,
        runtimeError: `Function ${resolvedName} not found in submitted code.`,
        summary: `Hidden tests: 0/${cases.length} passed. Function ${resolvedName} not found.`,
      }
    }

    let passed = 0
    let firstFailure = ''

    cases.forEach((testCase, index) => {
      if (firstFailure) return

      try {
        let actual
        if (Array.isArray(testCase?.args)) {
          actual = fn(...testCase.args)
        } else if ('input' in (testCase || {})) {
          actual = fn(testCase.input)
        } else {
          actual = fn()
        }

        if (isEqualOutput(actual, testCase?.expected)) {
          passed += 1
        } else {
          firstFailure = `Case ${index + 1} failed. Expected ${safeStringify(testCase?.expected)} but got ${safeStringify(actual)}.`
        }
      } catch (error) {
        firstFailure = `Case ${index + 1} threw: ${error?.message || 'Unknown runtime error'}`
      }
    })

    return {
      passed,
      total: cases.length,
      runtimeError: firstFailure,
      summary: firstFailure
        ? `Hidden tests: ${passed}/${cases.length} passed. ${firstFailure}`
        : `Hidden tests: ${passed}/${cases.length} passed.`,
    }
  } catch (error) {
    return {
      passed: 0,
      total: cases.length,
      runtimeError: error?.message || 'Failed to evaluate submission',
      summary: `Hidden tests: 0/${cases.length} passed. Runtime setup error: ${error?.message || 'Unknown error'}`,
    }
  }
}

export default function CodingRoundScreen({
  selectedDomain,
  selectedDifficulty,
  selectedLanguage,
  onCodingComplete,
  onExit,
}) {
  const [questions, setQuestions] = useState([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [codeByQuestion, setCodeByQuestion] = useState({})
  const [results, setResults] = useState([])
  const [loadingQuestions, setLoadingQuestions] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [localFeedback, setLocalFeedback] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(TIME_BY_DIFFICULTY_SECONDS[selectedDifficulty] || 600)
  const actionInFlightRef = useRef(false)
  const timeoutHandledQuestionRef = useRef(-1)

  const {
    generateCodingQuestions,
    scoreCodingAnswer,
    summarizeCodingImprovements,
    error: groqError,
    loading: groqLoading,
  } = useGroq({ languageName: selectedLanguage?.name || 'English' })

  const questionCount = COUNT_BY_DIFFICULTY[selectedDifficulty] || 2
  const timeLimitSeconds = TIME_BY_DIFFICULTY_SECONDS[selectedDifficulty] || 600
  const autosaveId = `${selectedDomain}::${selectedDifficulty}::${selectedLanguage?.name || 'English'}`
  const legacyAutosaveId = `${selectedDomain}::${selectedDifficulty}`

  useEffect(() => {
    let mounted = true

    async function loadQuestions() {
      setLoadingQuestions(true)
      const nextQuestions = await generateCodingQuestions({
        domain: selectedDomain,
        difficulty: selectedDifficulty,
        count: questionCount,
        languageLabel: 'JavaScript',
      })

      if (!mounted) return

      setQuestions(nextQuestions)

      let restoredByTitle = {}
      try {
        const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
        const parsed = raw ? JSON.parse(raw) : {}
        if (parsed?.autosaveId === autosaveId && parsed?.byTitle && typeof parsed.byTitle === 'object') {
          restoredByTitle = parsed.byTitle
        }
      } catch {
        restoredByTitle = {}
      }

      const initialCode = {}
      nextQuestions.forEach((question, index) => {
        initialCode[index] = restoredByTitle[question.title] || question.starterCode || ''
      })

      setCodeByQuestion(initialCode)
      setLoadingQuestions(false)
    }

    loadQuestions()

    return () => {
      mounted = false
    }
  }, [autosaveId, generateCodingQuestions, questionCount, selectedDifficulty, selectedDomain])

  useEffect(() => {
    if (!questions.length) return

    const byTitle = {}
    questions.forEach((question, index) => {
      byTitle[question.title] = codeByQuestion[index] || ''
    })

    try {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({ autosaveId, byTitle, updatedAt: Date.now() }),
      )
    } catch {
      // Ignore autosave failures.
    }
  }, [autosaveId, codeByQuestion, questions])

  useEffect(() => {
    if (loadingQuestions || !questions.length || submitting) return
    if (secondsLeft <= 0) return

    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => value - 1)
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [loadingQuestions, questions.length, secondsLeft, submitting])

  const currentQuestion = questions[questionIndex]
  const currentCode = codeByQuestion[questionIndex] || ''

  const progressText = useMemo(() => {
    if (!questions.length) return 'Preparing coding challenges...'
    return `Challenge ${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`
  }, [questionIndex, questions.length])

  const clock = useMemo(() => formatClock(secondsLeft), [secondsLeft])

  const handleEditorBeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme('prepai-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'F5F0E8', background: '111315' },
      ],
      colors: {
        'editor.background': '#111315',
        'editor.foreground': '#F5F0E8',
        'editorLineNumber.foreground': '#7F7A70',
        'editorLineNumber.activeForeground': '#C9A84C',
        'editorCursor.foreground': '#C9A84C',
        'editor.selectionBackground': '#C9A84C33',
        'editor.inactiveSelectionBackground': '#C9A84C22',
        'editorIndentGuide.background1': '#2A2A2A',
        'editorIndentGuide.activeBackground1': '#3D3D3D',
      },
    })
  }, [])

  const finalizeRound = useCallback(async (finalResults) => {
    const scoring = finalResults.map((item) => item.score)
    const codingOverallScore = scoring.length
      ? scoring.reduce((acc, item) => acc + item.overall, 0) / scoring.length
      : 0
    const codingSummary = await summarizeCodingImprovements(scoring)

    onCodingComplete({
      codingOverallScore,
      codingSummary,
      codingBreakdown: finalResults,
      codingQuestionCount: questions.length,
    })

    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY)
    } catch {
      // Ignore cleanup failures.
    }
  }, [onCodingComplete, questions.length, summarizeCodingImprovements])

  const goNext = useCallback(async (nextEntry) => {
    const updated = [...results, nextEntry]
    setResults(updated)

    if (questionIndex + 1 >= questions.length) {
      await finalizeRound(updated)
      return
    }

    timeoutHandledQuestionRef.current = -1
    setSecondsLeft(timeLimitSeconds)
    setQuestionIndex((value) => value + 1)
    setLocalFeedback(nextEntry.score.feedback || '')
  }, [finalizeRound, questionIndex, questions.length, results, timeLimitSeconds])

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || submitting || actionInFlightRef.current) return

    actionInFlightRef.current = true
    setSubmitting(true)
    try {
      const editorLanguage = resolveEditorLanguage(currentQuestion.language)
      const hiddenTestResult = editorLanguage === 'javascript'
        ? runHiddenJsTests({
          code: currentCode,
          functionName: currentQuestion.functionName,
          testCases: currentQuestion.testCases,
        })
        : {
          passed: 0,
          total: 0,
          runtimeError: '',
          summary: 'Local hidden tests are currently enabled for JavaScript only.',
        }

      const score = await scoreCodingAnswer({
        questionTitle: currentQuestion.title,
        questionPrompt: currentQuestion.prompt,
        code: currentCode,
        difficulty: selectedDifficulty,
        domain: selectedDomain,
        localTestSummary: hiddenTestResult.summary,
      })

      await goNext({
        title: currentQuestion.title,
        prompt: currentQuestion.prompt,
        code: currentCode,
        skipped: false,
        hiddenTests: hiddenTestResult,
        score,
      })
    } finally {
      setSubmitting(false)
      actionInFlightRef.current = false
    }
  }, [
    currentCode,
    currentQuestion,
    goNext,
    scoreCodingAnswer,
    selectedDifficulty,
    selectedDomain,
    submitting,
  ])

  const handleSkip = useCallback(async (reason = 'manual') => {
    if (!currentQuestion || submitting || actionInFlightRef.current) return
    actionInFlightRef.current = true
    setSubmitting(true)

    const skipFeedback = reason === 'timeout'
      ? 'Time expired. Skipped question. Score is 0 for this coding challenge.'
      : ZERO_SCORE.feedback

    try {
      await goNext({
        title: currentQuestion.title,
        prompt: currentQuestion.prompt,
        code: currentCode,
        skipped: true,
        hiddenTests: { passed: 0, total: 0, summary: 'Question skipped before local test execution.' },
        score: { ...ZERO_SCORE, feedback: skipFeedback },
      })
    } finally {
      setSubmitting(false)
      actionInFlightRef.current = false
    }
  }, [currentCode, currentQuestion, goNext, submitting])

  useEffect(() => {
    if (!questions.length || loadingQuestions || submitting) return
    if (secondsLeft > 0) return
    if (timeoutHandledQuestionRef.current === questionIndex) return

    timeoutHandledQuestionRef.current = questionIndex
    handleSkip('timeout')
  }, [handleSkip, loadingQuestions, questionIndex, questions.length, secondsLeft, submitting])

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1340px] px-4 pb-8 pt-4 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900">Coding Round</h1>
          <p className="text-sm text-zinc-500">{selectedDomain} • {selectedDifficulty}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-lg px-3 py-1.5 text-sm font-mono font-medium ${secondsLeft <= 60 ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-700'}`}>
            {clock}
          </span>
          <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-mono font-medium text-zinc-700">
            {progressText}
          </span>
        </div>
      </header>

      {(groqError || !questions.length) && !loadingQuestions && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {groqError || 'Using fallback coding challenges.'}
        </div>
      )}

      {loadingQuestions ? (
        <div className="rounded-2xl border border-zinc-200/60 bg-white p-8 shadow-sm">
          <p className="text-zinc-600">Preparing coding questions...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1.4fr]">
          <section className="rounded-2xl border border-zinc-200/60 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Current Challenge</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-zinc-900">{currentQuestion?.title}</h2>
            <p className="mt-4 whitespace-pre-line text-zinc-700">{currentQuestion?.prompt}</p>
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
              Skipping this challenge sets score to 0.
            </div>
            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600">
              Timer auto-skips at 00:00.
            </div>
            {!!currentQuestion?.testCases?.length && (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Sample Test Cases</p>
                <div className="mt-3 space-y-3">
                  {currentQuestion.testCases.map((testCase, index) => (
                    <div key={`${currentQuestion.title}-sample-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-xs text-zinc-700">
                      <p className="font-semibold text-zinc-900">Case {index + 1}</p>
                      <p className="mt-1 font-mono">Input: {formatArgs(testCase?.args)}</p>
                      <p className="mt-1 font-mono">Expected: {safeStringify(testCase?.expected)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {localFeedback && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Last feedback: {localFeedback}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200/60 bg-white p-4 shadow-sm">
            <Editor
              beforeMount={handleEditorBeforeMount}
              height="500px"
              theme="prepai-dark"
              language={resolveEditorLanguage(currentQuestion?.language)}
              value={currentCode}
              onChange={(value) => {
                const nextCode = value || ''
                setCodeByQuestion((prev) => ({
                  ...prev,
                  [questionIndex]: nextCode,
                }))
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={onExit}
                className="rounded-full border border-zinc-200 bg-white px-5 py-2 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
              >
                Exit to Home
              </button>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSkip}
                  disabled={submitting || groqLoading}
                  className="rounded-full border border-red-200 bg-red-50 px-5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Skip (0)
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || groqLoading}
                  className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Evaluating...' : 'Submit Code'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}