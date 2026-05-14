import { useEffect, useRef, useState } from 'react'

const STEP_LABELS = [
  'Parsing transaction data',
  'Detecting anomaly patterns',
  'Quantifying revenue impact',
  'Generating action plans',
  'Financial Report Ready',
]
const REAL_DURATIONS   = [1500, 3000, 2500, 2000]
const SAMPLE_DURATIONS = [700, 1600, 1500, 1200]

const TIPS = [
  'Avoid buying luxury items if you cannot show them off or tell anyone about them.',
  'Hide shopping apps in deep folders and log out — kills instant impulse buying dead.',
  'Match every luxury purchase with an equal, immediate deposit into your investments.',
  'Cancel old app subscriptions. Pay through direct merchant portals to avoid platform fees.',
  'Link a zero-balance secondary account to UPI — protects your primary life savings.',
  'Leave online carts untouched for one full day. Let impulse desires fade naturally.',
  'Scan co-branded merchant QR codes instead of generic ones to catch hidden discounts.',
  'Check prices on mobile apps before buying on desktop — platforms offer app-exclusive deals.',
  "Divide an item's price by your hourly wage to see the literal work hours it costs you.",
  'Enable bank auto-sweep to round up daily changes into background savings automatically.',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function LoadingState({ reportReady = false, isSample = false }) {
  const durations = isSample ? SAMPLE_DURATIONS : REAL_DURATIONS
  const totalMs   = durations.reduce((s, d) => s + d, 0)

  const [activeStep, setActiveStep] = useState(0)
  const [pct, setPct] = useState(0)
  const [tipIdx, setTipIdx] = useState(0)
  const [tipKey, setTipKey] = useState(0)
  const shuffledTips = useRef(shuffle(TIPS))

  // Advance the first 4 timed steps
  useEffect(() => {
    let elapsed = 0
    const timers = durations.map((dur, i) => {
      const t = setTimeout(() => setActiveStep(i + 1), elapsed + dur)
      elapsed += dur
      return t
    })
    return () => timers.forEach(clearTimeout)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When report is ready, mark all steps done (including step 5) and fill ring to 100%
  useEffect(() => {
    if (reportReady) {
      setActiveStep(STEP_LABELS.length) // all green
      setPct(100)
    }
  }, [reportReady])

  // Progress ring: fill to 96% over totalMs, then crawl slowly toward 99% — never reverses
  useEffect(() => {
    if (reportReady) return
    const start = Date.now()
    let rafId

    const frame = () => {
      const elapsed = Date.now() - start
      let p
      if (elapsed < totalMs) {
        p = (elapsed / totalMs) * 96
      } else {
        // Asymptotic crawl: approaches 99% but never reaches it
        const extra = (elapsed - TOTAL_MS) / 1000
        p = 99 - 3 * Math.exp(-extra / 20)
      }
      setPct(Math.round(p))
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [reportReady])

  // Tips cycle independently — navigation is never gated on this
  useEffect(() => {
    const id = setInterval(() => {
      setTipIdx(i => (i + 1) % TIPS.length)
      setTipKey(k => k + 1)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className="loading-state">
      <div className="liquid-ring-wrap">
        <svg className="liquid-ring-svg" viewBox="0 0 130 130">
          <defs>
            <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
          <circle className="liquid-ring-track" cx="65" cy="65" r="54" />
          <circle
            className="liquid-ring-fill"
            cx="65" cy="65" r="54"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div className="liquid-ring-inner">
          <div className="liquid-ring-pct">{pct}%</div>
          <div className="liquid-ring-label">{reportReady ? 'Ready!' : 'Analysing'}</div>
        </div>
      </div>

      <h3>Scanning for leakage</h3>
      <p>AI is analysing your transaction patterns…</p>

      <div className="loading-steps">
        {STEP_LABELS.map((label, i) => {
          const isDone   = i < activeStep
          const isActive = i === activeStep && i < STEP_LABELS.length - 1
          return (
            <div className={`loading-step${isActive ? ' active' : ''}${isDone ? ' done-step' : ''}`} key={i}>
              <div className={`step-icon${isDone ? ' done' : isActive ? ' active' : ''}`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span>{label}</span>
            </div>
          )
        })}
      </div>

      <div className="tip-card">
        <div className="tip-label">💡 Money Hack</div>
        <div className="tip-text tip-fade" key={tipKey}>{shuffledTips.current[tipIdx % TIPS.length]}</div>
      </div>
    </div>
  )
}
