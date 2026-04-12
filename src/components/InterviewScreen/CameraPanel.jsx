export default function CameraPanel({
  videoRef,
  enableCamera,
  isEnabled,
  permissionDenied,
  faceDetected,
  eyeContact,
  confidence,
  wpm,
  cameraError,
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-xl font-semibold text-slate-900">You</h3>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
            faceDetected
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              faceDetected ? 'bg-emerald-500' : 'bg-red-500'
            }`}
          />
          {isEnabled ? (faceDetected ? 'Face detected' : 'No face') : 'Camera off'}
        </span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-slate-900">
        <video ref={videoRef} autoPlay muted playsInline className="h-[280px] w-full object-cover" />
        {permissionDenied && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 p-4">
            <button
              onClick={enableCamera}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Enable camera
            </button>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {cameraError}
        </div>
      )}

      {!permissionDenied && !isEnabled && (
        <div className="mt-3 text-right">
          <button
            onClick={enableCamera}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Enable camera
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-3">
        <MetricCard label="Eye Contact %" value={`${Math.round(eyeContact)}%`} />
        <MetricCard label="Confidence %" value={`${Math.round(confidence)}%`} />
        <MetricCard label="WPM" value={`${Math.round(wpm)}`} />
      </div>
    </section>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  )
}
