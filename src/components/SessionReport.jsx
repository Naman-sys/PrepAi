import { useMemo, useState } from 'react'
import { generateSessionPdf } from '../utils/pdfGenerator'

function barColor(score) {
  if (score < 5) return 'bg-red-500'
  if (score <= 7) return 'bg-amber-500'
  return 'bg-zinc-900'
}

export default function SessionReport({ sessionData, onTryAgain, onChangeDomain, onOpenDashboard }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const fillerEntries = useMemo(
    () => Object.entries(sessionData?.fillerBreakdown || {}),
    [sessionData],
  )
  const codingEntries = useMemo(
    () => sessionData?.codingBreakdown || [],
    [sessionData],
  )
  const skippedCodingCount = useMemo(
    () => codingEntries.filter((entry) => entry.skipped).length,
    [codingEntries],
  )
  const hasCodingRound = codingEntries.length > 0

  const downloadPdf = () => {
    setIsGenerating(true)
    try {
      generateSessionPdf(sessionData)
    } finally {
      setIsGenerating(false)
    }
  }

  if (!sessionData) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
        <p className="rounded-2xl border border-zinc-200/60 bg-white p-8 text-zinc-500 shadow-sm">
          Processing session data...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-20 pt-16 md:px-6">
      
      <header className="rounded-3xl border border-zinc-200/60 bg-white p-8 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="mb-2 uppercase tracking-[0.2em] text-xs font-semibold text-zinc-400">Post-Session Analysis</p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900">
              Evaluation Report
            </h1>
            <p className="mt-3 text-zinc-500">
              Domain: <span className="text-zinc-900 font-medium">{sessionData.domain}</span> | Intensity: <span className="text-zinc-900 font-medium">{sessionData.difficulty}</span>
            </p>
          </div>
          <div className="flex flex-col items-end">
             <div className="text-5xl font-black text-zinc-900 tracking-tighter">
                {sessionData.overallScore.toFixed(1)}
                <span className="text-2xl text-zinc-400 ml-1 font-medium">/10</span>
             </div>
             <p className="text-xs tracking-widest text-zinc-400 mt-2 uppercase font-semibold">Overall Rating</p>
          </div>
        </div>
      </header>

      <section className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <Metric label="Eye Contact" value={`${Math.round(sessionData.eyeContact)}%`} status={sessionData.eyeContact > 60 ? 'good' : 'bad'} />
        <Metric label="Avg Pace" value={`${Math.round(sessionData.averageWpm)} WPM`} status={sessionData.averageWpm >= 120 && sessionData.averageWpm <= 160 ? 'good' : 'warning'} />
        <Metric label="Fillers Count" value={`${sessionData.totalFillers}`} status={sessionData.totalFillers < 5 ? 'good' : 'bad'} />
        <Metric
          label="Pace Quality"
          value={
            sessionData.averageWpm >= 120 && sessionData.averageWpm <= 160 ? 'Optimal' : 'Needs Work'
          }
           status={sessionData.averageWpm >= 120 && sessionData.averageWpm <= 160 ? 'good' : 'warning'}
        />
        {hasCodingRound && (
          <Metric
            label="Coding Score"
            value={`${(sessionData.codingOverallScore || 0).toFixed(1)} / 10`}
            status={(sessionData.codingOverallScore || 0) >= 7 ? 'good' : (sessionData.codingOverallScore || 0) >= 5 ? 'warning' : 'bad'}
          />
        )}
        {hasCodingRound && (
          <Metric
            label="Skipped Coding"
            value={`${skippedCodingCount}`}
            status={skippedCodingCount === 0 ? 'good' : 'warning'}
          />
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-5 mt-8">
        <section className="md:col-span-2 rounded-3xl border border-zinc-200/60 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-semibold text-zinc-900 mb-6">Execution by Phase</h2>
          <div className="space-y-6">
            {(sessionData.questionBreakdown || []).map((score, index) => (
              <div key={`score-${index}`}>
                <div className="mb-2 flex justify-between text-sm font-semibold text-zinc-600">
                  <span>Phase {index + 1}</span>
                  <span className="font-mono text-zinc-900">{score.overall.toFixed(1)} / 10</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    style={{ width: `${(score.overall / 10) * 100}%` }}
                    className={`h-full rounded-full ${barColor(score.overall)}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="md:col-span-3 rounded-3xl border border-zinc-200/60 bg-white p-8 shadow-sm flex flex-col">
          <h2 className="font-display text-xl font-semibold text-zinc-900 mb-6">
            Verbal Habits
          </h2>
          <div className="flex flex-wrap gap-2">
            {fillerEntries.length ? (
              fillerEntries.map(([word, count]) => (
                <span key={word} className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700">
                  {word} <span className="text-zinc-400 ml-1">x{count}</span>
                </span>
              ))
            ) : (
              <span className="text-zinc-500 font-medium">No filler words detected. Excellent clarity.</span>
            )}
          </div>

          <div className="mt-10 pt-8 border-t border-zinc-100">
              <h2 className="font-display text-xl font-semibold text-zinc-900 mb-4">Diagnostic Summary</h2>
              <p className="text-zinc-600 leading-relaxed">{sessionData.summary}</p>
          </div>

          {hasCodingRound && (
            <div className="mt-10 pt-8 border-t border-zinc-100">
              <h2 className="font-display text-xl font-semibold text-zinc-900 mb-4">Coding Round Summary</h2>
              <p className="text-zinc-600 leading-relaxed">{sessionData.codingSummary}</p>
              <div className="mt-6 space-y-4">
                {codingEntries.map((entry, index) => (
                  <div key={`coding-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">Coding Q{index + 1}: {entry.title}</p>
                      <span className="text-sm font-mono text-zinc-700">
                        {entry.score?.overall?.toFixed ? entry.score.overall.toFixed(1) : Number(entry.score?.overall || 0).toFixed(1)} / 10
                      </span>
                    </div>
                    {entry.skipped && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-red-600">Skipped (auto-scored 0)</p>
                    )}
                    <p className="mt-2 text-sm text-zinc-600">{entry.score?.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="mt-12 flex items-center justify-center gap-4">
        <button
          onClick={downloadPdf}
          disabled={isGenerating}
          className="rounded-full bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white transition disabled:opacity-50 hover:bg-zinc-800"
        >
          {isGenerating ? 'Generating...' : 'Export PDF Report'}
        </button>
        <button
          onClick={onTryAgain}
          className="rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Retry Interview
        </button>
        <button
          onClick={onChangeDomain}
          className="rounded-full px-8 py-3.5 text-sm font-semibold text-zinc-500 hover:text-zinc-800 transition"
        >
          Change Settings
        </button>
        {onOpenDashboard && (
          <button
            onClick={onOpenDashboard}
            className="rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
          >
            Open Dashboard
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, status }) {
  const indicatorColor = {
      good: 'bg-emerald-500',
      warning: 'bg-amber-500',
      bad: 'bg-red-500',
  }

  return (
    <div className="relative rounded-2xl border border-zinc-200/60 bg-white p-5 shadow-sm overflow-hidden sm:p-6">
      <div className={`absolute top-0 left-0 w-1 h-full ${indicatorColor[status]}`}></div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-400">{label}</p>
      <p className="break-words text-[2rem] font-black leading-tight text-zinc-900 tracking-tight">{value}</p>
    </div>
  )
}
