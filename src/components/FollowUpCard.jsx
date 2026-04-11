export default function FollowUpCard({ question, onAnswer, onNext, visible }) {
  if (!visible || !question) return null

  return (
    <section className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-4 shadow-sm transition-all duration-300">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">AI Follow-up</p>
      <p className="mt-2 text-blue-900">{question}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={onAnswer}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Answer Follow-up
        </button>
        <button
          onClick={onNext}
          className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-800"
        >
          Next Question
        </button>
      </div>
    </section>
  )
}
