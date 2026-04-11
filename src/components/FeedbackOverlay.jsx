function scoreColor(overall) {
  if (overall < 5) return '#dc2626'
  if (overall <= 7) return '#d97706'
  return '#16a34a'
}

export default function FeedbackOverlay({ feedback, score, visible, onClose }) {
  if (!visible || !score) return null

  const circumference = 2 * Math.PI * 46
  const progress = (score.overall / 10) * circumference

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-zinc-900/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-soft">
        
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-2xl font-semibold text-zinc-900">
            Live Answer Evaluation
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 transition-all"
              aria-label="Close feedback"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
          <div className="relative h-28 w-28">
            <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" stroke="#e4e4e7" strokeWidth="10" fill="none" />
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke={scoreColor(score.overall)}
                strokeWidth="10"
                fill="none"
                strokeDasharray={`${progress} ${circumference}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-zinc-900">
              {score.overall.toFixed(1)}
            </div>
          </div>

          <div className="w-full space-y-2">
            {['relevance', 'clarity', 'depth', 'confidence'].map((key) => (
              <ScoreRow key={key} label={key} value={score[key]} />
            ))}
          </div>
        </div>

        <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-700">{feedback}</p>
      </div>
    </div>
  )
}

function ScoreRow({ label, value }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm font-semibold text-zinc-700">
        <span className="capitalize">{label}</span>
        <span>{value.toFixed(1)} / 10</span>
      </div>
      <div className="h-2 w-full rounded-full bg-zinc-200">
        <div style={{ width: `${(value / 10) * 100}%` }} className="h-2 rounded-full bg-zinc-900" />
      </div>
    </div>
  )
}
