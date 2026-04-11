import AnimatedLine from './AnimatedLine'

const highlights = [
  {
    title: 'Voice Q&A',
    description: 'Practice naturally with live speech input and spoken AI questions.',
  },
  {
    title: 'Live AI Feedback',
    description: 'Get immediate coaching, scores, and precise improvement tips.',
  },
  {
    title: 'Camera Tracking',
    description: 'Track eye contact and confidence cues while answering.',
  },
]

export default function LandingPage({ onStart, onDashboard }) {
  const scrollToFeatures = () => {
    document.getElementById('platform-features').scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="relative mx-auto flex min-h-screen w-full flex-col px-6 pb-20 pt-16 md:px-10 overflow-hidden">
      
      {/* Animated Single Path Background */}
      <AnimatedLine />

      {/* Ambient hero glows */}
      <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full blur-3xl" style={{ background: 'rgba(201,168,76,0.16)' }} />
      <div className="pointer-events-none absolute -right-24 top-36 h-72 w-72 rounded-full blur-3xl" style={{ background: 'rgba(136,136,128,0.16)' }} />

      {/* TOP NAV STRIP */}
      <header className="mx-auto mb-12 flex w-full max-w-6xl items-center justify-between rounded-full border border-zinc-200/70 bg-white/80 px-4 py-3 shadow-soft backdrop-blur md:px-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-black text-white">PI</div>
          <div>
            <p className="font-display text-sm font-black tracking-wide text-zinc-900">PrepAI</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-400">Mock Interview Studio</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDashboard && (
            <button
              onClick={onDashboard}
              className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-700 transition hover:border-zinc-300"
            >
              Dashboard
            </button>
          )}
          <button
            onClick={onStart}
            className="rounded-full bg-zinc-900 px-5 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-zinc-800"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* HERO SECTION */}
      <div className="text-center w-full max-w-5xl mx-auto mb-20 pt-6 relative z-10">
        <p className="mb-8 inline-block font-mono text-sm font-bold tracking-[0.25em] text-zinc-400 uppercase opacity-0 fill-mode-forwards animate-slideUp" style={{ animationDelay: '0.1s' }}>
          Interview preparation, refined.
        </p>
        <h1 
          className="mb-8 font-display text-6xl font-black tracking-tight text-zinc-900 md:text-8xl lg:text-[7rem] leading-[1.05] opacity-0 fill-mode-forwards animate-slideUp" 
          style={{ 
            animationDelay: '0.2s',
            textShadow: '2px 2px 0 rgba(13,13,13,0.85), 4px 4px 0 rgba(13,13,13,0.65), 12px 18px 30px rgba(0,0,0,0.55)'
          }}
        >
          Master your next <br className="hidden md:block"/> technical interview.
        </h1>
        <p className="mx-auto max-w-3xl text-xl text-zinc-500 font-medium leading-relaxed md:text-2xl opacity-0 fill-mode-forwards animate-slideUp" style={{ animationDelay: '0.3s' }}>
          Step into a hyper-realistic simulation. Leverage real-time neural voice synthesis, computer vision, and expert system evaluation to refine your delivery.
        </p>

        <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 opacity-0 fill-mode-forwards animate-slideUp" style={{ animationDelay: '0.35s' }}>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-4 text-left shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Question realism</p>
            <p className="mt-2 font-display text-3xl font-black text-zinc-900">98%</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-4 text-left shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Response latency</p>
            <p className="mt-2 font-display text-3xl font-black text-zinc-900">&lt; 1s</p>
          </div>
          <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-4 text-left shadow-soft">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Sessions completed</p>
            <p className="mt-2 font-display text-3xl font-black text-zinc-900">10k+</p>
          </div>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-5 opacity-0 fill-mode-forwards animate-slideUp" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={onStart}
            className="rounded-full bg-zinc-900 px-10 py-4 text-base font-bold text-white transition hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 shadow-soft"
          >
            Start Your Interview
          </button>
          <button
            onClick={scrollToFeatures}
            className="rounded-full border border-zinc-200 bg-white px-10 py-4 text-base font-bold text-zinc-700 transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-soft"
          >
            Explore Platform
          </button>
        </div>

        {/* TRUST BADGES OR STATS */}
        <div className="mt-20 pt-10 border-t border-zinc-200/50 flex flex-col md:flex-row gap-8 justify-center items-center text-zinc-400 opacity-0 fill-mode-forwards animate-slideUp" style={{ animationDelay: '0.6s' }}>
           <p className="text-sm font-bold tracking-widest uppercase">Trusted by candidates from</p>
           <div className="flex gap-6 font-display font-black text-xl lg:text-2xl opacity-50 grayscale mix-blend-multiply">
              <span>META</span>
              <span>GOOGLE</span>
              <span>AMAZON</span>
              <span>STRIPE</span>
           </div>
        </div>
      </div>

      {/* CORE FEATURES SECTION */}
      <div id="platform-features" className="w-full max-w-6xl mx-auto py-20 pb-32">
        <div className="grid md:grid-cols-2 gap-16 md:gap-24 items-center mb-32">
           <div>
              <p className="font-mono text-xs font-bold tracking-[0.2em] text-zinc-400 uppercase mb-4">Precision Telemetry</p>
              <h2 className="font-display text-4xl lg:text-5xl font-black tracking-tight text-zinc-900 mb-6">Real-time physiological tracking.</h2>
              <p className="text-lg text-zinc-500 leading-relaxed mb-6">
                Our platform uses advanced device heuristics to track your eye contact, estimated words per minute, and filler word frequency dynamically. 
              </p>
              <ul className="space-y-4 font-medium text-zinc-700">
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></span> Sub-second response latency</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></span> Live visual feedback metrics</li>
                <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-zinc-900 rounded-full"></span> Micro-expression confidence scoring</li>
              </ul>
           </div>
           <div className="relative">
              <div className="aspect-[4/3] rounded-3xl bg-zinc-100 border border-zinc-200/60 shadow-elegant p-8 flex flex-col justify-between">
                 <div className="flex justify-between items-center pb-4 border-b border-zinc-200">
                   <div className="text-xs font-bold tracking-widest uppercase text-zinc-400">Eye Tracking</div>
                   <div className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-bold shadow-sm">ACTIVE // 94%</div>
                 </div>
                 <div className="flex-1 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full border-8 border-zinc-200 border-t-zinc-900 rotate-45 opacity-20"></div>
                 </div>
                 <div className="flex justify-between p-4 bg-white rounded-2xl shadow-sm border border-zinc-200/50 mt-4">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Pace</p>
                      <p className="text-xl font-black text-zinc-900">142<span className="text-sm font-medium text-zinc-500 ml-1">WPM</span></p>
                    </div>
                     <div>
                      <p className="text-[10px] uppercase font-bold text-zinc-400">Fillers</p>
                      <p className="text-xl font-black text-zinc-900">0<span className="text-sm font-medium text-zinc-500 ml-1">Um/Ah</span></p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* HIGHLIGHT BOXES */}
        <div className="text-center mb-12">
            <h3 className="font-display text-sm font-black tracking-[0.2em] text-zinc-900 uppercase">The Foundation</h3>
        </div>
        <section className="grid gap-6 w-full lg:grid-cols-3">
          {highlights.map((item, i) => (
            <article
              key={item.title}
              className="rounded-[2rem] border border-zinc-200/60 bg-white p-10 shadow-soft transition-all hover:shadow-elegant"
            >
              <h4 className="mb-4 font-display text-xl font-bold text-zinc-900">
                {item.title}
              </h4>
              <p className="text-base leading-relaxed text-zinc-500">
                {item.description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </div>
  )
}
