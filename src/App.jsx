import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import DashboardPage from './components/DashboardPage'
import DomainSelect from './components/DomainSelect'
import DifficultySelect from './components/DifficultySelect'
import InterviewScreen from './components/InterviewScreen'
import SessionReport from './components/SessionReport'
import { saveSession as saveLocalSession } from './utils/sessionStorage'
import { DEFAULT_LANGUAGE } from './utils/languages'
import { apiClient } from './services/apiClient'
import { clearAuth, getAuthToken, getStoredUser, storeAuth } from './utils/authStorage'

const CodingRoundScreen = lazy(() => import('./components/CodingRoundScreen'))
const PAGE_EXIT_DURATION_MS = 140

const HAS_API_KEY = Boolean(import.meta.env.VITE_GROQ_API_KEY)

const CODING_REQUIRED_DOMAINS = new Set([
  'Software Engineering',
  'Data Science / ML',
  'DevOps / Cloud',
])

function requiresCodingRound(domain = '') {
  const value = String(domain || '').trim()
  if (!value) return false
  if (CODING_REQUIRED_DOMAINS.has(value)) return true

  const technicalHint = /(software|engineer|developer|coding|programming|data|ml|ai|cloud|devops|backend|frontend|full\s*stack|web|mobile|qa|cyber|security)/i
  return technicalHint.test(value)
}

function ApiKeyBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-amber-50 border-t border-amber-200 px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-amber-500 text-lg">⚠️</span>
        <p className="text-sm font-medium text-amber-800">
          <span className="font-bold">No API key found.</span> AI features are disabled. Add{' '}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">VITE_GROQ_API_KEY</code>{' '}
          to your <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">.env</code> file and restart the dev server.
        </p>
      </div>
      <a
        href="https://console.groq.com/keys"
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition"
      >
        Get API Key →
      </a>
    </div>
  )
}

function App() {
  const [currentScreen, setCurrentScreen] = useState(() => (getAuthToken() ? 'dashboard' : 'landing'))
  const [displayScreen, setDisplayScreen] = useState(() => (getAuthToken() ? 'dashboard' : 'landing'))
  const [isScreenEntering, setIsScreenEntering] = useState(true)
  const [selectedDomain, setSelectedDomain] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedQuestionCount, setSelectedQuestionCount] = useState(7)
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE)
  const [interviewData, setInterviewData] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [authUser, setAuthUser] = useState(getStoredUser())
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    if (currentScreen === displayScreen) {
      setIsScreenEntering(true)
      return
    }

    setIsScreenEntering(false)
    const timeoutId = window.setTimeout(() => {
      setDisplayScreen(currentScreen)
      setIsScreenEntering(true)
    }, PAGE_EXIT_DURATION_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentScreen, displayScreen])

  useEffect(() => {
    // Backward compatibility for earlier OAuth key names.
    const currentToken = getAuthToken()
    if (currentToken) return

    const legacyToken = window.localStorage.getItem('auth_token')
    const legacyUserRaw = window.localStorage.getItem('user_data')
    if (!legacyToken || !legacyUserRaw) return

    try {
      const legacyUser = JSON.parse(legacyUserRaw)
      storeAuth(legacyToken, legacyUser)
      window.localStorage.removeItem('auth_token')
      window.localStorage.removeItem('user_data')
      setAuthUser(legacyUser)
    } catch {
      // Ignore malformed legacy data and let normal login flow continue.
    }
  }, [])

  useEffect(() => {
    // Handle OAuth callback
    const query = new URLSearchParams(window.location.search)
    const authToken = query.get('auth_token')
    const authUserStr = query.get('auth_user')
    const authError = query.get('auth_error')

    if (authError) {
      console.error('[OAuth] Error:', authError)
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
      setAuthReady(true)
      return
    }

    if (authToken && authUserStr) {
      try {
        const user = JSON.parse(decodeURIComponent(authUserStr))
        // Store auth and user with canonical keys used by apiClient.
        storeAuth(authToken, user)
        window.localStorage.removeItem('auth_token')
        window.localStorage.removeItem('user_data')
        
        setAuthUser(user)
        setCurrentScreen('dashboard')
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (err) {
        console.error('[OAuth] Failed to parse callback:', err)
      }
      setAuthReady(true)
      return
    }

    // Original auth flow
    const token = getAuthToken()

    if (!token) {
      setAuthReady(true)
      return
    }

    let mounted = true

    apiClient.me()
      .then((response) => {
        if (!mounted) return
        setAuthUser(response.user)
        setCurrentScreen((prev) => (prev === 'landing' ? 'dashboard' : prev))
      })
      .catch(() => {
        if (!mounted) return
        clearAuth()
        setAuthUser(null)
      })
      .finally(() => {
        if (mounted) setAuthReady(true)
      })

    return () => {
      mounted = false
    }
  }, [])

  const handleInterviewComplete = useCallback((data) => {
    setInterviewData(data)

    if (requiresCodingRound(selectedDomain)) {
      setCurrentScreen('coding')
      return
    }

    const verbalAvg = Number(data?.overallScore || 0)
    const enriched = {
      ...data,
      verbalOverallScore: verbalAvg,
      overallScore: verbalAvg,
      codingOverallScore: 0,
      codingQuestionCount: 0,
      codingBreakdown: [],
      codingSummary: 'Coding round skipped for this domain.',
      domain: selectedDomain,
      difficulty: selectedDifficulty,
      language: selectedLanguage.name,
    }

    saveLocalSession(enriched)
    if (authUser) {
      apiClient.createSession(enriched).catch((error) => {
        console.error('[App] Failed to save cloud session:', error)
      })
    }

    setSessionData(enriched)
    setCurrentScreen('report')
  }, [authUser, selectedDifficulty, selectedDomain, selectedLanguage])

  const handleCodingComplete = useCallback(async (codingData) => {
    const verbal = interviewData || {}
    const verbalAvg = Number(verbal.overallScore || 0)
    const verbalCount = Number(verbal?.questionBreakdown?.length || 0)
    const codingAvg = Number(codingData?.codingOverallScore || 0)
    const codingCount = Number(codingData?.codingQuestionCount || 0)
    const totalCount = verbalCount + codingCount

    const combinedOverall = totalCount
      ? ((verbalAvg * verbalCount) + (codingAvg * codingCount)) / totalCount
      : 0

    const enriched = {
      ...verbal,
      ...codingData,
      verbalOverallScore: verbalAvg,
      overallScore: combinedOverall,
      domain: selectedDomain,
      difficulty: selectedDifficulty,
      language: selectedLanguage.name,
    }

    saveLocalSession(enriched)
    if (authUser) {
      try {
        await apiClient.createSession(enriched)
      } catch (error) {
        console.error('[App] Failed to save cloud session:', error)
      }
    }
    setSessionData(enriched)
    setCurrentScreen('report')
  }, [authUser, interviewData, selectedDomain, selectedDifficulty, selectedLanguage])

  const handleAuthenticated = useCallback((user) => {
    setAuthUser(user)
    setCurrentScreen('dashboard')
  }, [])

  const handleLogout = useCallback(() => {
    clearAuth()
    setAuthUser(null)
    setCurrentScreen('landing')
  }, [])

  const screen = useMemo(() => {
    if (displayScreen === 'landing') {
      return (
        <LandingPage
          onStart={() => setCurrentScreen(authUser ? 'domain' : 'auth')}
          onDashboard={authUser ? () => setCurrentScreen('dashboard') : undefined}
          onHowItWorks={() => {
            const features = document.getElementById('platform-features')
            features?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        />
      )
    }

    if (displayScreen === 'auth') {
      return (
        <AuthPage
          onAuthenticated={handleAuthenticated}
          onBack={() => setCurrentScreen('landing')}
        />
      )
    }

    if (displayScreen === 'dashboard') {
      return (
        <DashboardPage
          user={authUser}
          onStartInterview={() => setCurrentScreen('domain')}
          onLogout={handleLogout}
        />
      )
    }

    if (displayScreen === 'domain') {
      return (
        <DomainSelect
          selectedDomain={selectedDomain}
          onDomainSelect={setSelectedDomain}
          selectedLanguage={selectedLanguage}
          onLanguageSelect={setSelectedLanguage}
          onContinue={(domain) => {
            setSelectedDomain(domain)
            setCurrentScreen('difficulty')
          }}
          onBack={() => setCurrentScreen('landing')}
        />
      )
    }

    if (displayScreen === 'difficulty') {
      return (
        <DifficultySelect
          selectedDifficulty={selectedDifficulty}
          onDifficultySelect={setSelectedDifficulty}
          selectedQuestionCount={selectedQuestionCount}
          onQuestionCountSelect={setSelectedQuestionCount}
          onBack={() => setCurrentScreen('domain')}
          onStart={() => setCurrentScreen('interview')}
          isStartDisabled={!selectedDifficulty}
        />
      )
    }

    if (displayScreen === 'interview') {
      return (
        <InterviewScreen
          selectedDomain={selectedDomain}
          selectedDifficulty={selectedDifficulty}
          selectedQuestionCount={selectedQuestionCount}
          selectedLanguage={selectedLanguage}
          onSessionComplete={handleInterviewComplete}
          onExit={() => setCurrentScreen(authUser ? 'dashboard' : 'landing')}
        />
      )
    }

    if (displayScreen === 'coding') {
      return (
        <Suspense
          fallback={
            <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
              <p className="rounded-2xl border border-zinc-200/60 bg-white p-8 text-zinc-500 shadow-sm">
                Loading coding round...
              </p>
            </div>
          }
        >
          <CodingRoundScreen
            selectedDomain={selectedDomain}
            selectedDifficulty={selectedDifficulty}
            selectedLanguage={selectedLanguage}
            onCodingComplete={handleCodingComplete}
            onExit={() => setCurrentScreen(authUser ? 'dashboard' : 'landing')}
          />
        </Suspense>
      )
    }

    return (
      <SessionReport
        sessionData={sessionData}
        onTryAgain={() => {
          setInterviewData(null)
          setSessionData(null)
          setSelectedQuestionCount(7)
          setCurrentScreen('difficulty')
        }}
        onOpenDashboard={authUser ? () => setCurrentScreen('dashboard') : undefined}
        onChangeDomain={() => {
          setInterviewData(null)
          setSessionData(null)
          setSelectedQuestionCount(7)
          setCurrentScreen('domain')
        }}
      />
    )
  }, [
    displayScreen,
    selectedDomain,
    selectedDifficulty,
    selectedQuestionCount,
    selectedLanguage,
    authUser,
    sessionData,
    handleAuthenticated,
    handleInterviewComplete,
    handleCodingComplete,
    handleLogout,
  ])

  if (!authReady) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <p className="rounded-2xl border border-zinc-200/60 bg-white p-8 text-zinc-500 shadow-sm">
            Loading account...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div
        className={`page-transition-shell ${isScreenEntering ? 'page-transition-enter' : 'page-transition-exit'}`}
      >
        {screen}
      </div>
      {!HAS_API_KEY && <ApiKeyBanner />}
    </main>
  )
}

export default App
