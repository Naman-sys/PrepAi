import { useMemo, useState } from 'react'
import clsx from 'clsx'
import AnimatedLine from './AnimatedLine'
import { LANGUAGES } from '../utils/languages'

const domains = [
  'Software Engineering',
  'Data Science / ML',
  'Product Management',
  'Marketing',
  'Finance / Banking',
  'HR / Behavioural',
  'DevOps / Cloud',
  'UI/UX Design',
  'Custom',
]

export default function DomainSelect({ selectedDomain, onDomainSelect, onContinue, onBack, selectedLanguage, onLanguageSelect }) {
  const [customDomain, setCustomDomain] = useState('')

  const activeDomain = useMemo(() => {
    if (selectedDomain === 'Custom') {
      return customDomain.trim()
    }
    return selectedDomain
  }, [customDomain, selectedDomain])

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-20 pt-20 md:px-10 overflow-hidden">
      
      {/* Animated Single Path Background */}
      <AnimatedLine />

      <div className="mb-10 text-center max-w-3xl mx-auto relative z-10">
        <h1 className="font-display text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
          Choose your domain
        </h1>
        <p className="mt-4 text-zinc-500 font-medium">
          Pick a focus area to tailor technical questions and scenarios.
        </p>

        {/* Language Picker */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mr-2">Language:</span>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => onLanguageSelect(lang)}
              className={clsx(
                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all',
                selectedLanguage?.code === lang.code
                  ? 'bg-zinc-900 text-white ring-1 ring-[#c9a84c]/45 shadow-soft'
                  : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400'
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => {
          const selected = selectedDomain === domain
          return (
            <button
              key={domain}
              onClick={() => onDomainSelect(domain)}
              className={clsx(
                'group relative overflow-hidden p-6 text-left transition-all duration-200 rounded-2xl',
                selected
                  ? 'border-2 border-zinc-900 bg-white shadow-soft ring-1 ring-[#c9a84c]/45'
                  : 'border border-zinc-200/60 bg-white hover:border-zinc-300 hover:shadow-soft',
              )}
            >
              {selected && <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[#c9a84c] shadow-[0_0_0_4px_rgba(201,168,76,0.18)]" />}
              <p className={clsx(
                "font-semibold transition-colors text-base",
                selected ? "text-zinc-900" : "text-zinc-600 group-hover:text-zinc-900"
              )}>{domain}</p>
            </button>
          )
        })}
      </div>

      {selectedDomain === 'Custom' && (
        <div className="mx-auto mt-8 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <label className="mb-3 block text-xs font-semibold tracking-wide text-zinc-500 uppercase">
            Custom Domain
          </label>
          <input
            value={customDomain}
            onChange={(event) => setCustomDomain(event.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            placeholder="e.g. Cybersecurity, Rust Backend..."
          />
        </div>
      )}

      <div className="mt-16 flex justify-center gap-4 pb-10">
        <button
          onClick={onBack}
          className="rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-sm font-semibold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50"
        >
          Go Back
        </button>
        <button
          onClick={() => onContinue(activeDomain)}
          disabled={!activeDomain}
          className="rounded-full bg-zinc-900 px-10 py-3.5 text-sm font-semibold text-white transition disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 flex items-center gap-2 group"
        >
          Continue
          <svg className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </div>
  )
}
