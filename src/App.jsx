import { useState, useEffect } from 'react'
import FileUpload from './components/FileUpload'
import LoadingState from './components/LoadingState'
import AnalysisResults from './components/AnalysisResults'
import UserInputForm from './components/UserInputForm'
import BentoPreview from './components/BentoPreview'
import DevDashboard from './components/DevDashboard'
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

export default function App() {
  const [step, setStep] = useState('upload')
  const [fileData, setFileData] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [usage, setUsage] = useState(null)
  const [isDev, setIsDev] = useState(false)

  useEffect(() => {
    const check = () => setIsDev(window.location.hash === '#dev')
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [])

  function handleFileLoaded(data, name) {
    setFileData({ transactions: data, fileName: name })
    setStep('inputs')
  }

  async function handleAnalyze(profile) {
    setUserProfile(profile)
    setStep('loading')
    setError(null)
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
      const json = await res.json()
      setAnalysis(json.analysis)
      setUsage(json.usage)
      setStep('results')
      attachCursorGlow()
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
  }

  if (isDev) {
    return <DevDashboard onExit={() => { window.location.hash = ''; setIsDev(false) }} />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
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
                Upload your bank statement or POS data. Our AI identifies your top revenue leakage patterns with precise recovery estimates.
              </p>
            </div>

            <div className="hero-upload-centrepiece">
              <FileUpload onFileLoaded={handleFileLoaded} />
            </div>

            <div className="hero-features">
              {[
                ['🔍', 'Failed transaction patterns'],
                ['💸', 'Fee optimisation gaps'],
                ['⏱️', 'Settlement delay leakage'],
                ['📊', 'Exact recovery potential'],
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
          />
        )}

        {step === 'loading' && <LoadingState />}

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
