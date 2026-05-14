import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import LoadingState from './components/LoadingState'
import AnalysisResults from './components/AnalysisResults'
import UserInputForm from './components/UserInputForm'
import BentoPreview from './components/BentoPreview'
import DevDashboard from './components/DevDashboard'
import {
  SAMPLE_TRANSACTIONS,
  SAMPLE_FILE_NAME,
  SAMPLE_REPORT_MERCHANT,
  SAMPLE_REPORT_INDIVIDUAL,
} from './utils/sampleData'
import './App.css'

function attachCursorGlow() {
  setTimeout(() => {
    document.querySelectorAll('.summary-card, .pattern-card').forEach(el => {
      if (el._glowAttached) return
      el._glowAttached = true
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mouse-x', `${((e.clientX - r.left) / r.width) * 100}%`)
        el.style.setProperty('--mouse-y', `${((e.clientY - r.top) / r.height) * 100}%`)
      })
    })
  }, 200)
}

// Dev dashboard login — shown before DevDashboard when not yet authenticated
function DevLogin({ onLogin, onCancel }) {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (email === 'shankaravarshith@gmail.com' && pass === '1436') {
      onLogin()
    } else {
      setErr('Invalid credentials')
    }
  }

  return (
    <div className="dev-login-wrap">
      <div className="dev-login-card">
        <div className="dev-login-icon">🔒</div>
        <h2 className="dev-login-title">Developer Dashboard</h2>
        <p className="dev-login-sub">Restricted access — sign in to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            className="text-input dev-login-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErr('') }}
            autoFocus
          />
          <input
            className="text-input dev-login-input"
            type="password"
            placeholder="Password"
            value={pass}
            onChange={e => { setPass(e.target.value); setErr('') }}
          />
          {err && <p className="dev-login-err">{err}</p>}
          <button className="btn-primary btn-large" type="submit">Sign In</button>
        </form>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
          onClick={onCancel}
        >
          ← Back to App
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [step, setStep]               = useState('upload')
  const [fileData, setFileData]       = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [analysis, setAnalysis]       = useState(null)
  const [error, setError]             = useState(null)
  const [usage, setUsage]             = useState(null)
  const [isDev, setIsDev]             = useState(() => window.location.hash.toLowerCase() === '#dev')
  const [devAuthd, setDevAuthd]       = useState(false)
  const [reportReady, setReportReady] = useState(false)
  const [isSample, setIsSample]       = useState(false)

  useEffect(() => {
    const check = () => {
      const next = window.location.hash.toLowerCase() === '#dev'
      setIsDev(next)
      if (!next) setDevAuthd(false)
    }
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  function handleFileLoaded(data, name) {
    setFileData({ transactions: data, fileName: name })
    setIsSample(false)
    setStep('inputs')
  }

  function handleTestSample() {
    setFileData({ transactions: SAMPLE_TRANSACTIONS, fileName: SAMPLE_FILE_NAME })
    setIsSample(true)
    setStep('inputs')
  }

  async function handleAnalyze(profile) {
    setUserProfile(profile)
    setStep('loading')
    setError(null)

    // Sample mode: animated buffer, no API call
    if (isSample) {
      const reportData = profile.type === 'individual'
        ? SAMPLE_REPORT_INDIVIDUAL
        : SAMPLE_REPORT_MERCHANT
      // Fire reportReady 200ms after the sample step animation completes (5000ms total)
      setTimeout(() => {
        setAnalysis(reportData)
        setUsage(null)
        setReportReady(true)
        setTimeout(() => {
          setStep('results')
          setReportReady(false)
          attachCursorGlow()
        }, 900)
      }, 5200)
      return
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionData: fileData.transactions,
          fileName: fileData.fileName,
          userProfile: profile,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const evt = JSON.parse(line.slice(6))
          if (evt.type === 'done') {
            setAnalysis(evt.analysis)
            setUsage(evt.usage)
            setReportReady(true)
            setTimeout(() => {
              setStep('results')
              setReportReady(false)
              attachCursorGlow()
            }, 900)
            return
          }
          if (evt.type === 'error') throw new Error(evt.error)
        }
      }
    } catch (e) {
      setError(e.message)
      setStep('error')
    }
  }

  function handleReset() {
    setStep('upload')
    setFileData(null)
    setUserProfile(null)
    setAnalysis(null)
    setError(null)
    setUsage(null)
    setReportReady(false)
    setIsSample(false)
  }

  if (isDev) {
    if (!devAuthd) {
      return (
        <DevLogin
          onLogin={() => setDevAuthd(true)}
          onCancel={() => { window.location.hash = ''; setIsDev(false) }}
        />
      )
    }
    return (
      <DevDashboard
        onExit={() => { window.location.hash = ''; setIsDev(false); setDevAuthd(false) }}
      />
    )
  }

  const isResultsStep = step === 'results'

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div
            className={`logo${isResultsStep ? ' logo-clickable' : ''}`}
            onClick={isResultsStep ? handleReset : undefined}
            title={isResultsStep ? 'Back to Home' : undefined}
          >
            <div className="logo-icon">💰</div>
            <div>
              <h1>Revenue Leakage Detector</h1>
              <p>AI-powered transaction analysis</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="header-badge">⚡ AI Powered</span>
            <button
              onClick={() => { window.location.hash = '#dev' }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-3)', padding: '4px 8px' }}
              title="Developer Dashboard"
            >⚙</button>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {step === 'upload' && (
          <div className="hero">
            <div className="hero-top">
              <div className="hero-eyebrow">
                <div className="hero-eyebrow-dot" />
                AI Financial Analysis
              </div>
              <h2 className="hero-title">
                Stop losing <span className="mono">money</span> <span className="accent">silently.</span>
              </h2>
              <p className="hero-sub">
                Upload your bank statement. Our AI scans every transaction and shows you exactly where money is slipping away — and how to get it back.
              </p>
            </div>

            <div className="hero-upload-centrepiece">
              <FileUpload onFileLoaded={handleFileLoaded} onTestSample={handleTestSample} />
            </div>

            <div className="hero-features">
              {[
                ['🔍', 'Recover failed transaction losses'],
                ['💸', 'Cut unnecessary fee spend'],
                ['⏱️', 'Fix settlement timing losses'],
                ['📊', 'Know exactly what you can recover'],
              ].map(([icon, text]) => (
                <div className="feature-pill" key={text}>
                  <span className="feature-pill-icon">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <div className="hero-bento-section">
              <p className="bento-section-label">Sample report preview</p>
              <BentoPreview />
            </div>
          </div>
        )}

        {step === 'inputs' && (
          <UserInputForm
            fileName={fileData?.fileName}
            rowCount={fileData?.transactions?.length}
            onSubmit={handleAnalyze}
            onBack={handleReset}
            defaultCurrency="USD"
            isSample={isSample}
          />
        )}

        {step === 'loading' && <LoadingState reportReady={reportReady} isSample={isSample} />}

        {step === 'error' && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Analysis Failed</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={handleReset}>Start Over</button>
          </div>
        )}

        {step === 'results' && (
          <AnalysisResults
            analysis={analysis}
            fileName={fileData?.fileName}
            userProfile={userProfile}
            usage={usage}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  )
}
