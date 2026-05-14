import { useState } from 'react'

const COUNTRIES = [
  { name: 'India', currency: '₹', code: 'INR' },
  { name: 'United States', currency: '$', code: 'USD' },
  { name: 'United Kingdom', currency: '£', code: 'GBP' },
  { name: 'European Union', currency: '€', code: 'EUR' },
  { name: 'Australia', currency: 'A$', code: 'AUD' },
  { name: 'Canada', currency: 'C$', code: 'CAD' },
  { name: 'Singapore', currency: 'S$', code: 'SGD' },
  { name: 'UAE', currency: 'AED', code: 'AED' },
  { name: 'Nigeria', currency: '₦', code: 'NGN' },
  { name: 'Kenya', currency: 'KSh', code: 'KES' },
  { name: 'South Africa', currency: 'R', code: 'ZAR' },
  { name: 'Brazil', currency: 'R$', code: 'BRL' },
  { name: 'Mexico', currency: 'MX$', code: 'MXN' },
  { name: 'Indonesia', currency: 'Rp', code: 'IDR' },
  { name: 'Philippines', currency: '₱', code: 'PHP' },
  { name: 'Japan', currency: '¥', code: 'JPY' },
  { name: 'Other', currency: '$', code: 'USD' },
]

export default function UserInputForm({ fileName, rowCount, onSubmit, onBack }) {
  const [profileType, setProfileType] = useState('merchant')
  const [country, setCountry] = useState('India')
  const [email, setEmail] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const selected = COUNTRIES.find(c => c.name === country) || COUNTRIES[0]
    onSubmit({
      type: profileType,
      country,
      currency: selected.currency,
      currencyCode: selected.code,
      email,
    })
  }

  const isValid = country && email && email.includes('@')

  return (
    <div className="inputs-screen">
      <div className="section-title">Quick setup</div>
      <div className="section-sub">Tell us about yourself so we can personalise your report.</div>

      <div className="file-chip">
        <span>📄</span>
        <span className="file-chip-name">{fileName}</span>
        <span style={{ color: 'var(--text-3)', fontSize: 12 }}>{rowCount?.toLocaleString()} rows</span>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-card">
          <label>I am analysing for</label>
          <div className="toggle-group">
            <button type="button" className={`toggle-btn${profileType === 'merchant' ? ' active' : ''}`} onClick={() => setProfileType('merchant')}>
              <span className="toggle-icon">🏪</span>
              Business / Merchant
            </button>
            <button type="button" className={`toggle-btn${profileType === 'individual' ? ' active' : ''}`} onClick={() => setProfileType('individual')}>
              <span className="toggle-icon">👤</span>
              Personal Finance
            </button>
          </div>
        </div>

        <div className="input-card">
          <label>Business location</label>
          <select className="select-input" value={country} onChange={e => setCountry(e.target.value)}>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.name}>{c.name} ({c.currency} {c.code})</option>
            ))}
          </select>
        </div>

        <div className="input-card">
          <label>Email — report will be sent here</label>
          <input
            type="email"
            className="text-input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-primary btn-large" disabled={!isValid}>
          🔍 Analyse My Transactions
        </button>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="btn-secondary" onClick={onBack} style={{ fontSize: 12 }}>
            ← Change file
          </button>
        </div>
      </form>
    </div>
  )
}
