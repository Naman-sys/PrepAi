import { useEffect, useState } from 'react'
import clsx from 'clsx'
import AnimatedLine from './AnimatedLine'

const levels = [
  {
    key: 'Beginner',
    desc: 'Foundational, friendly prompts to warm up your response structure.',
  },
  {
    key: 'Intermediate',
    desc: 'Balanced technical depth and scenario-based decision making.',
  },
  {
    key: 'Expert',
    desc: 'High-pressure, nuanced questions with strict follow-up probing.',
  },
]

const questionCounts = [5, 7, 10]

export default function DifficultySelect({
  selectedDifficulty,
  onDifficultySelect,
  selectedQuestionCount,
  onQuestionCountSelect,
  onBack,
  onStart,
  isStartDisabled,
}) {
  const [countdown, setCountdown] = useState(null)

  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      onStart()
      return
    }

    const timer = setTimeout(() => setCountdown((value) => value - 1), 900)
    return () => clearTimeout(timer)
  }, [countdown, onStart])

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-20 pt-20 md:px-10 overflow-hidden">
      
      {/* Animated Single Path Background */}
      <AnimatedLine />

      <div className="mb-14 text-center max-w-3xl mx-auto relative z-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
          Select intensity level
        </h1>
        <p className="mt-4 text-zinc-500 font-medium">
          Determine the interviewing style and strictness of the evaluator.
        </p>
      </div>

      <div className="mx-auto w-full grid gap-5 md:grid-cols-3">
        {levels.map((level) => {
          const selected = selectedDifficulty === level.key
          return (
            <button
              key={level.key}
              onClick={() => onDifficultySelect(level.key)}
              className={clsx(
                'group relative overflow-hidden p-8 text-left transition-all duration-200 rounded-2xl',
                selected
                  ? 'border-2 border-zinc-900 bg-white shadow-soft ring-1 ring-[#c9a84c]/45'
                  : 'border border-zinc-200/60 bg-white hover:border-zinc-300 hover:shadow-soft',
              )}
            >
              {selected && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#c9a84c] shadow-[0_0_0_4px_rgba(201,168,76,0.18)]" />}
              <h2 className={clsx(
                "font-display text-xl font-bold mb-3 transition-colors",
                selected ? 'text-zinc-900' : 'text-zinc-800'
              )}>
                {level.key}
              </h2>
              <p className={clsx(
                "text-sm leading-relaxed transition-colors",
                selected ? "text-zinc-600" : "text-zinc-500"
              )}>{level.desc}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-12 rounded-3xl border border-zinc-200/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Mock Length</p>
            <h2 className="mt-1 font-display text-xl font-bold text-zinc-900">Choose number of verbal questions</h2>
          </div>
          <p className="text-sm text-zinc-500">Pick how long the mock interview should run.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {questionCounts.map((count) => {
            const selected = selectedQuestionCount === count
            return (
              <button
                key={count}
                onClick={() => onQuestionCountSelect(count)}
                className={clsx(
                    'relative overflow-hidden rounded-2xl border p-4 text-left transition-all',
                  selected
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-soft ring-1 ring-[#c9a84c]/45'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:shadow-soft',
                )}
              >
                  {selected && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#c9a84c] shadow-[0_0_0_4px_rgba(201,168,76,0.18)]" />}
                <p className={clsx('text-sm font-semibold uppercase tracking-wide', selected ? 'text-zinc-300' : 'text-zinc-400')}>
                  Questions
                </p>
                <p className={clsx('mt-2 font-display text-3xl font-black', selected ? 'text-white' : 'text-zinc-900')}>
                  {count}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-16 flex justify-center gap-4 pb-10">
        <button
          onClick={onBack}
          className="rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Go Back
        </button>
        <button
          disabled={isStartDisabled}
          onClick={() => setCountdown(3)}
          className="rounded-full bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Start Session
        </button>
      </div>

      {countdown !== null && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
          <div className="rounded-3xl border border-[#2a2a2a] bg-[#111315] px-20 py-16 text-center shadow-elegant">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8c887e]">
              System Ready
            </p>
            <p className="mt-4 animate-countdownPop font-display text-8xl font-black text-[#f5f0e8] tracking-tight">
              {countdown === 0 ? 'GO' : countdown}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
