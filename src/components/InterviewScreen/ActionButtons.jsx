export default function ActionButtons({
  isAISpeaking,
  isRecording,
  onStart,
  onDone,
  onSkip,
  isPaused,
  onPauseToggle,
}) {
  if (isAISpeaking) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center font-semibold text-slate-700">
        Listen carefully
      </div>
    )
  }

  if (!isRecording) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-center font-semibold text-slate-600">
          Waiting for input...
        </div>
        <button
          onClick={onStart}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Start Recording
        </button>
        <button
          onClick={onPauseToggle}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
        >
          {isPaused ? 'Resume Session' : 'Pause Session'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
        Recording
      </div>
      <button
        onClick={onDone}
        className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
      >
        Done Answering
      </button>
      <button
        onClick={onSkip}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
      >
        Skip Question
      </button>
      <button
        onClick={onPauseToggle}
        className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
      >
        {isPaused ? 'Resume Session' : 'Pause Session'}
      </button>
    </div>
  )
}
