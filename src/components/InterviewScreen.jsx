import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CameraPanel from './InterviewScreen/CameraPanel'
import AIPanel from './InterviewScreen/AIPanel'
import TranscriptBox from './InterviewScreen/TranscriptBox'
import ActionButtons from './InterviewScreen/ActionButtons'
import BottomMetrics from './InterviewScreen/BottomMetrics'
import FeedbackOverlay from './FeedbackOverlay'
import useSpeechSynthesis from '../hooks/useSpeechSynthesis'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import useCamera from '../hooks/useCamera'
import useGroq from '../hooks/useGroq'
import { countWords, detectFillerWords, totalFillerCount } from '../utils/fillerDetector'

const AUTO_FINALIZE_SILENCE_MS = 6500
const AUTO_NEXT_QUESTION_DELAY_MS = 700
const INTERVIEW_DRAFT_STORAGE_KEY = 'prepai_interview_draft_v1'

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

function sumCounts(list) {
  return list.reduce((acc, item) => {
    Object.entries(item).forEach(([word, count]) => {
      acc[word] = (acc[word] || 0) + count
    })
    return acc
  }, {})
}

export default function InterviewScreen({
  selectedDomain,
  selectedDifficulty,
  selectedQuestionCount = 7,
  selectedLanguage,
  onSessionComplete,
  onExit,
}) {
  const [elapsed, setElapsed] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState('Preparing your first question...')
  const [transcript, setTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [visibleTranscript, setVisibleTranscript] = useState('')
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [localRecording, setLocalRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [wpm, setWpm] = useState(0)
  const [feedbackText, setFeedbackText] = useState('')
  const [currentScore, setCurrentScore] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [scores, setScores] = useState([])
  const [wpmList, setWpmList] = useState([])
  const [fillerPerQuestion, setFillerPerQuestion] = useState([])
  const [captureWarning, setCaptureWarning] = useState('')

  const answerStartRef = useRef(null)
  const activeQuestionRef = useRef('')
  const autoFinalizeArmedRef = useRef(false)
  const finalizeInFlightRef = useRef(false)
  const nextMainQuestionRef = useRef('')
  const nextQuestionTimeoutRef = useRef(null)
  const silenceTimeoutRef = useRef(null)
  const listenRetryTimeoutRef = useRef(null)
  const restoredFromDraftRef = useRef(false)
  const lastTranscriptUpdateRef = useRef(Date.now())

  const autosaveId = `${selectedDomain}::${selectedDifficulty}::${selectedLanguage?.code || 'en-US'}::${selectedQuestionCount}`

  const speech = useSpeechSynthesis({ langCode: selectedLanguage?.code || 'en-US' })
  const {
    loading: groqLoading,
    error: groqError,
    generateQuestion,
    generateFollowUp,
    evaluateAnswer,
    scoreAnswer,
    summarizeImprovements,
    resetConversation,
    hasApiKey,
  } = useGroq({ languageName: selectedLanguage?.name || 'English' })
  const {
    videoRef,
    enableCamera,
    isEnabled: cameraEnabled,
    permissionDenied,
    faceDetected,
    eyeContact,
    confidence,
    eyeTimeline,
    cameraError,
  } = useCamera()

  const {
    start: startRecognition,
    stop: stopRecognition,
    reset: resetRecognition,
    supported: recognitionSupported,
    isRecording: recognitionIsRecording,
    lastError: recognitionLastError,
  } = useSpeechRecognition({
    langCode: selectedLanguage?.code || 'en-US',
    onTranscript: ({ transcript: nextTranscript, finalTranscript: nextFinalTranscript, interimTranscript: nextInterimTranscript }) => {
      setTranscript(nextTranscript)
      setFinalTranscript(nextFinalTranscript || '')
      setInterimTranscript(nextInterimTranscript || '')
      if (nextTranscript.trim()) {
        setVisibleTranscript(nextTranscript)
      }
      lastTranscriptUpdateRef.current = Date.now()

      if (nextTranscript.trim()) {
        autoFinalizeArmedRef.current = true
      }

      if (answerStartRef.current) {
        const durationSeconds = (Date.now() - answerStartRef.current) / 1000
        const words = countWords(nextTranscript)
        const nextWpm = durationSeconds > 0 ? (words / durationSeconds) * 60 : 0
        setWpm(nextWpm)
      }
    },
  })

  const liveFillerCounts = useMemo(() => detectFillerWords(transcript), [transcript])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed((value) => value + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INTERVIEW_DRAFT_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null

      if (!parsed || parsed.autosaveId !== autosaveId) {
        restoredFromDraftRef.current = false
        return
      }

      const hasProgress =
        Number(parsed.questionIndex || 0) > 0 ||
        (Array.isArray(parsed.scores) && parsed.scores.length > 0) ||
        Boolean(String(parsed.transcript || '').trim())

      if (!hasProgress) {
        restoredFromDraftRef.current = false
        return
      }

      setElapsed(Number(parsed.elapsed || 0))
      setQuestionIndex(Number(parsed.questionIndex || 0))
      setCurrentQuestion(String(parsed.currentQuestion || 'Preparing your first question...'))
      setTranscript(String(parsed.transcript || ''))
      setFinalTranscript(String(parsed.transcript || ''))
      setInterimTranscript('')
      setVisibleTranscript(String(parsed.transcript || ''))
      setWpm(Number(parsed.wpm || 0))
      setScores(Array.isArray(parsed.scores) ? parsed.scores : [])
      setWpmList(Array.isArray(parsed.wpmList) ? parsed.wpmList : [])
      setFillerPerQuestion(Array.isArray(parsed.fillerPerQuestion) ? parsed.fillerPerQuestion : [])

      activeQuestionRef.current = String(parsed.currentQuestion || '')
      if (String(parsed.transcript || '').trim()) {
        autoFinalizeArmedRef.current = true
      }

      restoredFromDraftRef.current = true
    } catch {
      restoredFromDraftRef.current = false
    }
  }, [autosaveId])

  const startListening = useCallback(() => {
    if (!recognitionSupported) {
      console.warn('Speech recognition not supported')
      setLocalRecording(false)
      return
    }

    if (window.speechSynthesis?.speaking || speech.isSpeaking) {
      if (listenRetryTimeoutRef.current) {
        window.clearTimeout(listenRetryTimeoutRef.current)
      }
      // Some browsers report speaking=true briefly after onEnd. Retry once shortly after.
      listenRetryTimeoutRef.current = window.setTimeout(() => {
        startListening()
      }, 250)
      return
    }

    resetRecognition()
    setTranscript('')
    setFinalTranscript('')
    setInterimTranscript('')
    setVisibleTranscript('')
    setWpm(0)
    setCaptureWarning('')
    lastTranscriptUpdateRef.current = Date.now()
    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current)
    }
    setLocalRecording(true)
    answerStartRef.current = Date.now()
    autoFinalizeArmedRef.current = false
    console.log('[InterviewScreen] Starting speech recognition')
    startRecognition()
  }, [recognitionSupported, resetRecognition, speech.isSpeaking, startRecognition])

  const askQuestionAndSpeak = useCallback(
    async (questionText) => {
      activeQuestionRef.current = questionText
      setCurrentQuestion(questionText)
      setIsAISpeaking(true)

      speech.speak(questionText, {
        onEnd: () => {
          setIsAISpeaking(false)
          startListening()
        },
        onError: () => {
          setIsAISpeaking(false)
          startListening()
        },
      })
    },
    [speech, startListening],
  )

  const fetchAndAskQuestion = useCallback(async () => {
    const question = await generateQuestion({
      domain: selectedDomain,
      difficulty: selectedDifficulty,
    })
    await askQuestionAndSpeak(question)
  }, [askQuestionAndSpeak, generateQuestion, selectedDifficulty, selectedDomain])

  useEffect(() => {
    enableCamera()
    if (restoredFromDraftRef.current) return

    resetConversation()
    fetchAndAskQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const payload = {
      autosaveId,
      updatedAt: Date.now(),
      elapsed,
      questionIndex,
      currentQuestion,
      transcript,
      wpm,
      scores,
      wpmList,
      fillerPerQuestion,
    }

    try {
      localStorage.setItem(INTERVIEW_DRAFT_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore autosave failures.
    }
  }, [autosaveId, elapsed, fillerPerQuestion, currentQuestion, questionIndex, scores, transcript, wpm, wpmList])

  useEffect(() => {
    return () => {
      if (nextQuestionTimeoutRef.current) {
        window.clearTimeout(nextQuestionTimeoutRef.current)
      }
      if (silenceTimeoutRef.current) {
        window.clearTimeout(silenceTimeoutRef.current)
      }
      if (listenRetryTimeoutRef.current) {
        window.clearTimeout(listenRetryTimeoutRef.current)
      }
    }
  }, [])

  const endSession = useCallback(async () => {
    stopRecognition()
    speech.cancel()

    const allFillers = sumCounts(fillerPerQuestion)
    const totalFillers = totalFillerCount(allFillers)
    const avgScore =
      scores.length > 0
        ? scores.reduce((acc, item) => acc + item.overall, 0) / scores.length
        : 0
    const averageWpm =
      wpmList.length > 0
        ? wpmList.reduce((acc, value) => acc + value, 0) / wpmList.length
        : 0

    const summary = await summarizeImprovements(scores)

    try {
      localStorage.removeItem(INTERVIEW_DRAFT_STORAGE_KEY)
    } catch {
      // Ignore cleanup failures.
    }

    onSessionComplete({
      date: Date.now(),
      domain: selectedDomain,
      difficulty: selectedDifficulty,
      overallScore: avgScore,
      eyeContact,
      eyeTimeline,
      totalFillers,
      fillerBreakdown: allFillers,
      averageWpm,
      questionBreakdown: scores,
      questionCount: selectedQuestionCount,
      summary,
    })
  }, [
    stopRecognition,
    speech,
    fillerPerQuestion,
    scores,
    wpmList,
    summarizeImprovements,
    onSessionComplete,
    selectedDomain,
    selectedDifficulty,
    selectedQuestionCount,
    eyeContact,
    eyeTimeline,
    autosaveId,
  ])

  const moveNextQuestion = useCallback(() => {
    setShowFeedback(false)
    setFeedbackText('')
    setCurrentScore(null)
    setCaptureWarning('')
    setVisibleTranscript('')
    setInterimTranscript('')

    if (questionIndex + 1 >= selectedQuestionCount) {
      endSession()
      return
    }

    setQuestionIndex((value) => value + 1)
    setTimeout(() => {
      const queuedFollowUp = nextMainQuestionRef.current.trim()
      nextMainQuestionRef.current = ''

      if (queuedFollowUp) {
        askQuestionAndSpeak(queuedFollowUp)
        return
      }

      fetchAndAskQuestion()
    }, 350)
  }, [askQuestionAndSpeak, endSession, fetchAndAskQuestion, questionIndex, selectedQuestionCount])

  const finalizeAnswer = useCallback(async (source = 'manual') => {
    if (finalizeInFlightRef.current) return
    finalizeInFlightRef.current = true

    try {
      stopRecognition()
      setLocalRecording(false)
      autoFinalizeArmedRef.current = false

      const spokenTranscript = transcript.trim()
      const answerText = spokenTranscript
      const wordCount = countWords(answerText)

      if (wordCount < 2) {
        setCaptureWarning('Transcript is too short. Please speak at least one clear sentence, then click Done Answering.')
        setLocalRecording(false)
        setIsAISpeaking(false)

        if (source === 'silence' && !isPaused && !speech.isSpeaking) {
          // If auto-finalize fired on weak capture, resume listening instead of stalling.
          startListening()
        }
        return
      }

      const safeAnswer = answerText || 'No answer provided.'

      const fillerCounts = detectFillerWords(safeAnswer)
      setFillerPerQuestion((prev) => [...prev, fillerCounts])
      setWpmList((prev) => [...prev, wpm])

      const [feedback, score] = await Promise.all([
        evaluateAnswer({ question: activeQuestionRef.current, transcript: safeAnswer }),
        scoreAnswer({ question: activeQuestionRef.current, transcript: safeAnswer }),
      ])

      const followUp = await generateFollowUp({
        transcript: safeAnswer,
        difficulty: selectedDifficulty,
        domain: selectedDomain,
      })
      nextMainQuestionRef.current = (followUp || '').trim()

      const safeFeedback =
        (feedback || 'Good effort. Keep answers concise and include one measurable impact.').trim()

      setFeedbackText(safeFeedback)
      setCurrentScore(score)
      setShowFeedback(true)
      setScores((prev) => [...prev, score])

      setIsAISpeaking(true)
      speech.speak(safeFeedback, {
        onEnd: () => {
          setIsAISpeaking(false)
          if (nextQuestionTimeoutRef.current) {
            window.clearTimeout(nextQuestionTimeoutRef.current)
          }
          nextQuestionTimeoutRef.current = window.setTimeout(() => {
            moveNextQuestion()
          }, AUTO_NEXT_QUESTION_DELAY_MS)
        },
        onError: () => {
          setIsAISpeaking(false)
          moveNextQuestion()
        },
      })
    } finally {
      finalizeInFlightRef.current = false
    }
  }, [
    evaluateAnswer,
    generateFollowUp,
    moveNextQuestion,
    scoreAnswer,
    selectedDifficulty,
    selectedDomain,
    speech,
    stopRecognition,
    startListening,
    transcript,
    isPaused,
    wpm,
  ])

  const handleCloseFeedback = useCallback(() => {
    if (nextQuestionTimeoutRef.current) {
      window.clearTimeout(nextQuestionTimeoutRef.current)
      nextQuestionTimeoutRef.current = null
    }

    speech.cancel()
    setIsAISpeaking(false)
    setShowFeedback(false)
  }, [speech])

  useEffect(() => {
    if (isAISpeaking || speech.isSpeaking || isPaused) return
    if (!localRecording) return
    if (!autoFinalizeArmedRef.current || !transcript.trim()) return

    if (silenceTimeoutRef.current) {
      window.clearTimeout(silenceTimeoutRef.current)
    }

    const silenceForMs = Math.max(0, AUTO_FINALIZE_SILENCE_MS - (Date.now() - lastTranscriptUpdateRef.current))
    silenceTimeoutRef.current = window.setTimeout(() => {
      if (finalizeInFlightRef.current) return
      finalizeAnswer('silence')
    }, silenceForMs)

    return () => {
      if (silenceTimeoutRef.current) {
        window.clearTimeout(silenceTimeoutRef.current)
      }
    }
  }, [
    finalizeAnswer,
    isAISpeaking,
    isPaused,
    localRecording,
    speech.isSpeaking,
    transcript,
  ])

  const handlePauseToggle = () => {
    if (!isPaused) {
      stopRecognition()
      speech.cancel()
      if (nextQuestionTimeoutRef.current) {
        window.clearTimeout(nextQuestionTimeoutRef.current)
      }
      if (silenceTimeoutRef.current) {
        window.clearTimeout(silenceTimeoutRef.current)
      }
      autoFinalizeArmedRef.current = false
      setLocalRecording(false)
      setIsAISpeaking(false)
      setIsPaused(true)
      return
    }

    setIsPaused(false)
    if (!isAISpeaking) {
      startListening()
    }
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1340px] px-4 pb-8 pt-4 md:px-6">
      {!recognitionSupported && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Warning: For optimal performance, please use Chrome or Edge.
        </div>
      )}

      {!hasApiKey && (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-600">
          Running in demo mode — add <code className="font-mono text-xs bg-zinc-100 px-1 rounded">VITE_GROQ_API_KEY</code> to .env for live AI evaluations.
        </div>
      )}

      {recognitionLastError && recognitionLastError !== 'no-speech' && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Speech recognition issue: {recognitionLastError}. Please check browser mic permission and use pause/resume once.
        </div>
      )}

      {recognitionLastError === 'no-speech' && (
        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          We're not hearing any speech. Please check microphone permissions and selected input device in Chrome/Windows.
        </div>
      )}

      {captureWarning && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {captureWarning}
        </div>
      )}

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
        <h1 className="font-display text-2xl font-bold tracking-tight text-zinc-900">
          PrepAI
        </h1>

        <div className="flex flex-wrap gap-2 text-xs font-semibold tracking-wide uppercase">
          <Pill text={selectedDomain} />
          <Pill text={selectedDifficulty} />
          <Pill text="Live Session" withDot />
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
            Phase <span className="text-zinc-900">{Math.min(questionIndex + 1, selectedQuestionCount)}</span> / {selectedQuestionCount}
          </span>
          <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm font-mono font-medium text-zinc-700">
            {formatTime(elapsed)}
          </span>
          <button
            onClick={endSession}
            className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
          >
            End Session
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <CameraPanel
          videoRef={videoRef}
          enableCamera={enableCamera}
          isEnabled={cameraEnabled}
          permissionDenied={permissionDenied}
          faceDetected={faceDetected}
          eyeContact={eyeContact}
          confidence={confidence}
          wpm={wpm}
          cameraError={cameraError}
        />
        <AIPanel
          isAISpeaking={isAISpeaking || speech.isSpeaking}
          isRecording={localRecording || recognitionIsRecording}
          isThinking={groqLoading}
          currentQuestion={currentQuestion}
          voiceName={speech.voiceName}
        />
      </div>

      <div className="mt-6 space-y-6">
        <div className="text-xs font-mono text-zinc-500 mb-2">
          <span>
            Recognition: {recognitionSupported ? (recognitionIsRecording ? '🔴 RECORDING' : '⚪ READY') : '❌ NOT SUPPORTED'}
          </span>
        </div>
        <TranscriptBox
          transcript={visibleTranscript || finalTranscript || transcript}
          finalTranscript={finalTranscript}
          interimTranscript={interimTranscript}
          isRecording={localRecording || recognitionIsRecording}
        />

        <BottomMetrics
          fillerCounts={liveFillerCounts}
          confidence={confidence}
          questionIndex={questionIndex}
          totalQuestions={selectedQuestionCount}
        />

        <ActionButtons
          isAISpeaking={isAISpeaking || speech.isSpeaking}
          isRecording={localRecording || recognitionIsRecording}
          onStart={startListening}
          onDone={() => finalizeAnswer('manual')}
          onSkip={moveNextQuestion}
          isPaused={isPaused}
          onPauseToggle={handlePauseToggle}
        />
      </div>

      <FeedbackOverlay
        feedback={feedbackText}
        score={currentScore}
        visible={showFeedback}
        onClose={handleCloseFeedback}
      />

      <div className="mt-8 text-center md:text-right pb-4">
        <button
          onClick={onExit}
          className="rounded-full px-6 py-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 transition hover:text-zinc-800"
        >
          Exit to Home
        </button>
      </div>

      {groqLoading && (
        <div className="fixed bottom-6 right-6 rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-semibold tracking-wide text-zinc-900 shadow-elegant animate-pulse z-50">
          AI is analyzing...
        </div>
      )}

      {groqError && (
        <div className="fixed bottom-6 left-6 right-auto max-w-sm rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800 shadow-elegant z-50">
          <p className="font-bold mb-1">AI Error</p>
          <p className="text-xs text-red-600">{groqError}</p>
        </div>
      )}
    </div>
  )
}

function Pill({ text, withDot = false }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-zinc-600">
      {withDot && <span className="h-1.5 w-1.5 rounded-full bg-zinc-900 animate-pulse" />}
      {text}
    </span>
  )
}

