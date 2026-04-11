export default function AIPanel({ isAISpeaking, isRecording, isThinking, currentQuestion, voiceName }) {
  const rings = [
    { size: 120, delay: '0s' },
    { size: 104, delay: '0.15s' },
    { size: 90, delay: '0.3s' },
  ]

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-right font-display text-xl font-semibold text-slate-900">
        AI Interviewer
      </h3>

      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative flex h-[260px] w-[260px] items-center justify-center">
          {rings.map((ring, index) => (
            <div
              key={ring.size}
              style={{ width: ring.size, height: ring.size, animationDelay: ring.delay }}
              className={`absolute rounded-full border border-zinc-300/60 bg-zinc-100/40 animate-ringPulse ${
                isAISpeaking ? '' : 'ring-paused'
              }`}
            />
          ))}

          {/* Female AI Avatar */}
          <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-white shadow-soft">
            {/* Feminine silhouette icon */}
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="7" r="3.5" />
              <path d="M5 21c0-3.5 3.1-6 7-6s7 2.5 7 6" />
              <path d="M9 14.5c-.5 1-1 2.5-.5 4" strokeLinecap="round" />
              <path d="M15 14.5c.5 1 1 2.5.5 4" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="mt-2 flex h-8 items-end gap-1.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              key={`wave-${index}`}
              style={{ animationDelay: `${index * 0.08}s` }}
              className={`w-1.5 rounded-full bg-brand-500 transition-all duration-300 ${
                isAISpeaking ? 'animate-wave h-full' : 'h-1.5'
              }`}
            />
          ))}
        </div>

        <div className="mt-3 flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-zinc-700">
            {isAISpeaking 
              ? 'AI is speaking...' 
              : isThinking 
                ? 'AI is thinking...' 
                : isRecording 
                  ? 'Listening to your answer...' 
                  : 'Ready'}
          </p>
          {voiceName && voiceName !== 'Default' && (
            <p className="text-[11px] text-zinc-400 font-mono tracking-wide">
              🎙 {voiceName}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Current Question
        </p>
        <p className="mt-2 text-zinc-900">{currentQuestion}</p>
      </div>
    </section>
  )
}
