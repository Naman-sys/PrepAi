import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../services/apiClient'
import AnimatedLine from './AnimatedLine'

function formatDate(value) {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

function buildTrendPath(points, width, height) {
  if (!points.length) return ''
  const stepX = points.length > 1 ? width / (points.length - 1) : width
  return points
    .map((point, index) => {
      const x = index * stepX
      const y = height - (point / 10) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export default function DashboardPage({ user, onStartInterview, onLogout }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setError('')
      try {
        const sessionData = await apiClient.listSessions()

        if (!mounted) return
        setSessions(sessionData.sessions || [])
      } catch (err) {
        if (!mounted) return
        setError(err.message || 'Failed to load dashboard data.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  const meaningfulSessions = useMemo(() => {
    return sessions.filter((session) => {
      const report = session?.report || {}
      const verbalAnswered = Array.isArray(report?.questionBreakdown) ? report.questionBreakdown.length : 0
      const codingAttempted = Array.isArray(report?.codingBreakdown)
        ? report.codingBreakdown.filter((entry) => !entry?.skipped).length
        : 0

      return verbalAnswered > 0 || codingAttempted > 0 || Number(session?.overallScore || 0) > 0
    })
  }, [sessions])

  const recentScores = useMemo(
    () => meaningfulSessions.slice(0, 8).map((session) => Number(session.overallScore || 0)).reverse(),
    [meaningfulSessions],
  )

  const avgOverall = useMemo(() => {
    if (!meaningfulSessions.length) return 0
    const sum = meaningfulSessions.reduce((acc, session) => acc + Number(session.overallScore || 0), 0)
    return sum / meaningfulSessions.length
  }, [meaningfulSessions])

  const avgCoding = useMemo(() => {
    if (!meaningfulSessions.length) return 0
    const sum = meaningfulSessions.reduce((acc, session) => acc + Number(session.codingScore || 0), 0)
    return sum / meaningfulSessions.length
  }, [meaningfulSessions])

  const trendPath = useMemo(() => buildTrendPath(recentScores, 360, 120), [recentScores])

  const latestScore = useMemo(() => {
    if (!meaningfulSessions.length) return 0
    return Number(meaningfulSessions[0].overallScore || 0)
  }, [meaningfulSessions])

  const bestScore = useMemo(() => {
    if (!meaningfulSessions.length) return 0
    return Math.max(...meaningfulSessions.map((session) => Number(session.overallScore || 0)))
  }, [meaningfulSessions])

  const codingCoverage = useMemo(() => {
    if (!meaningfulSessions.length) return 0
    const withCoding = meaningfulSessions.filter((session) => Number(session.codingScore || 0) > 0).length
    return (withCoding / meaningfulSessions.length) * 100
  }, [meaningfulSessions])

  const topDomains = useMemo(() => {
    if (!meaningfulSessions.length) return []
    const domainMap = {}
    meaningfulSessions.forEach((session) => {
      const key = session.domain || 'Unknown'
      if (!domainMap[key]) {
        domainMap[key] = { count: 0, scoreSum: 0 }
      }
      domainMap[key].count += 1
      domainMap[key].scoreSum += Number(session.overallScore || 0)
    })

    return Object.entries(domainMap)
      .map(([domain, value]) => ({
        domain,
        count: value.count,
        avgScore: value.count ? value.scoreSum / value.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
  }, [meaningfulSessions])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedLine />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-zinc-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-72 w-72 rounded-full bg-zinc-400/15 blur-3xl" />

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 pb-12 pt-8 md:px-6">
        <header className="mb-6 rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">User Dashboard</p>
            <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-zinc-900 md:text-4xl">
              {user?.name || 'Candidate'}
            </h1>
            <p className="mt-2 text-zinc-500">Track personal progress, interview history, and readiness over time.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onStartInterview}
              className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Start Interview
            </button>
            <button
              onClick={onLogout}
              className="rounded-full border border-zinc-200 bg-white px-6 py-2.5 text-sm font-semibold text-zinc-700"
            >
              Logout
            </button>
          </div>
        </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(190px,1fr))]">
        <Card label="Total Sessions" value={String(meaningfulSessions.length)} loading={loading} />
        <Card label="Avg Overall" value={`${avgOverall.toFixed(1)} / 10`} loading={loading} />
        <Card label="Avg Coding" value={`${avgCoding.toFixed(1)} / 10`} loading={loading} />
        <Card label="Best Score" value={`${bestScore.toFixed(1)} / 10`} loading={loading} />
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr,1fr]">
        <section className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold text-zinc-900">Performance Pulse</h2>
              <p className="mt-1 text-sm text-zinc-500">Recent overall scores from latest sessions.</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Latest</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{latestScore.toFixed(1)}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            {recentScores.length > 1 ? (
              <svg viewBox="0 0 360 120" className="h-36 w-full">
                <defs>
                  <linearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                </defs>
                {[2, 4, 6, 8].map((grid) => (
                  <line
                    key={grid}
                    x1="0"
                    y1={120 - (grid / 10) * 120}
                    x2="360"
                    y2={120 - (grid / 10) * 120}
                    stroke="#e5e7eb"
                    strokeDasharray="4 4"
                  />
                ))}
                <path d={trendPath} fill="none" stroke="url(#pulse)" strokeWidth="3.2" strokeLinecap="round" />
              </svg>
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-500">
                Complete at least 2 sessions to unlock trend graph.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <MiniStat label="Coding Coverage" value={`${codingCoverage.toFixed(0)}%`} helper="Sessions with coding score > 0" />
            <MiniStat label="Stability" value={recentScores.length > 1 ? `${Math.abs((recentScores.at(-1) || 0) - (recentScores[0] || 0)).toFixed(1)}Δ` : 'N/A'} helper="Score spread in recent set" />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-zinc-900">Top Domains</h2>
          <p className="mt-1 text-sm text-zinc-500">Where you have the most practice.</p>
          <div className="mt-4 space-y-3">
            {topDomains.length ? topDomains.map((item) => (
              <div key={item.domain} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{item.domain}</p>
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{item.count} sessions</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-zinc-900"
                    style={{ width: `${Math.max(6, (Number(item.avgScore || 0) / 10) * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-600">Avg score: {Number(item.avgScore || 0).toFixed(1)} / 10</p>
              </div>
            )) : (
              <p className="text-sm text-zinc-500">No domain history yet.</p>
            )}
          </div>
        </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-zinc-900">Recent Interviews</h2>
          <p className="mt-1 text-sm text-zinc-500">Your latest practice sessions with score snapshots.</p>

          <div className="mt-4 space-y-3">
            {meaningfulSessions.length ? meaningfulSessions.slice(0, 10).map((session) => (
              <div key={session.id} className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{session.domain || 'Unknown'} • {session.difficulty || 'N/A'}</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-mono font-semibold text-zinc-700">
                    {Number(session.overallScore || 0).toFixed(1)} / 10
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{formatDate(session.createdAt)}</p>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
                <p className="text-sm text-zinc-500">No interviews stored yet.</p>
                <button
                  onClick={onStartInterview}
                  className="mt-3 rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-zinc-800"
                >
                  Start your first mock
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold text-zinc-900">Readiness Notes</h2>
          <p className="mt-1 text-sm text-zinc-500">Quick status based on your current history.</p>

          <div className="mt-4 space-y-3">
            <InsightRow
              title="Consistency"
              value={sessions.length >= 5 ? 'Strong' : 'Building'}
              detail={sessions.length >= 5 ? 'You have enough data to identify trends.' : 'Complete a few more sessions for stronger insights.'}
            />
            <InsightRow
              title="Verbal Confidence"
              value={avgOverall >= 7 ? 'Healthy' : 'Needs Focus'}
              detail={avgOverall >= 7 ? 'Your average is trending interview-ready.' : 'Aim for concise answers with concrete outcomes.'}
            />
            <InsightRow
              title="Coding Track"
              value={avgCoding >= 6 ? 'Stable' : 'Opportunity'}
              detail={avgCoding >= 6 ? 'Keep practicing edge cases and complexity explanations.' : 'Boost coding rounds and avoid skips to lift your score.'}
            />
          </div>
        </section>
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, loading = false }) {
  return (
    <div className="rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black tracking-tight text-zinc-900">
        {loading ? <LoadingDots /> : value}
      </p>
    </div>
  )
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Loading" role="status">
      <span className="dashboard-loading-dot" style={{ animationDelay: '0ms' }} />
      <span className="dashboard-loading-dot" style={{ animationDelay: '140ms' }} />
      <span className="dashboard-loading-dot" style={{ animationDelay: '280ms' }} />
    </span>
  )
}

function MiniStat({ label, value, helper }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-black tracking-tight text-zinc-900">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  )
}

function InsightRow({ title, value, detail }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-zinc-900">{title}</p>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{value}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-600">{detail}</p>
    </div>
  )
}
