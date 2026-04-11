export default function BottomMetrics({ fillerCounts, confidence, questionIndex, totalQuestions }) {
  const fillerEntries = Object.entries(fillerCounts)

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Filler Words Detected
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {fillerEntries.length ? (
            fillerEntries.map(([word, count]) => (
              <span
                key={word}
                className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700"
              >
                {word} x{count}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">No filler words yet</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Speaking Confidence
        </p>
        <div className="mt-3 h-3 w-full rounded-full bg-slate-200">
          <div
            style={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
            className="h-3 rounded-full bg-brand-500 transition-all"
          />
        </div>
        <p className="mt-2 text-sm font-semibold text-slate-700">{Math.round(confidence)}%</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Question Progress
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: totalQuestions }).map((_, index) => {
            const isCompleted = index < questionIndex
            const isCurrent = index === questionIndex

            return (
              <span
                key={`progress-${index}`}
                className={`h-3 w-3 rounded-full ${
                  isCurrent
                    ? 'bg-fuchsia-500'
                    : isCompleted
                      ? 'bg-purple-500'
                      : 'bg-slate-300'
                }`}
              />
            )
          })}
        </div>
      </div>
    </section>
  )
}
