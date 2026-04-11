import { FILLER_WORDS } from '../../utils/fillerDetector'

const FILLER_SET = new Set(FILLER_WORDS)

export default function TranscriptBox({ transcript, finalTranscript = '', interimTranscript = '', isRecording = false }) {
  const displayTranscript = `${finalTranscript || transcript || ''} ${interimTranscript || ''}`.trim()
  const words = displayTranscript ? displayTranscript.split(/\s+/) : []

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live Transcript</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold text-zinc-500">Words: {words.length}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isRecording ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isRecording ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
            {isRecording ? 'Listening' : 'Idle'}
          </span>
        </div>
      </div>
      <div className="min-h-[88px] max-h-[180px] overflow-y-auto rounded-xl bg-zinc-50 p-3 leading-relaxed text-zinc-900">
        {words.length === 0 && <span className="text-zinc-500">Start speaking to see your transcript live...</span>}
        {words.map((word, index) => {
          const normalized = word.toLowerCase().replace(/[^a-z]/g, '')
          const isFiller = FILLER_SET.has(normalized)

          return (
            <span key={`${word}-${index}`} className="mr-1 inline-block">
              {isFiller ? (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  {word}
                </span>
              ) : (
                word
              )}
            </span>
          )
        })}
        <span className="transcript-cursor">&nbsp;</span>
      </div>
    </section>
  )
}
