import { useEffect, useState } from 'react'

const API = ''

function fmtNum(n) { return Number(n || 0).toLocaleString() }
function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function relTime(ts) {
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function KpiCard({ label, value, sub, color = 'primary', mono = false }) {
  const colors = { primary: 'var(--primary-bright)', danger: 'var(--danger)', success: 'var(--success)', warning: 'var(--warning)' }
  return (
    <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${colors[color]}, transparent)` }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: mono ? 'var(--text-mono)' : 'Space Grotesk', fontSize: 28, fontWeight: 800, color: colors[color], letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

function MiniBar({ label, value, max, color = 'var(--primary-bright)' }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--text-mono)' }}>{value}</span>
      </div>
      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
}

function DailyChart({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(([, v]) => v), 1)
  const last14 = data.slice(-14)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 60, marginBottom: 6 }}>
        {last14.map(([day, count]) => (
          <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div title={`${day}: ${count}`} style={{
              width: '100%', borderRadius: 3,
              height: `${Math.max((count / max) * 52, count > 0 ? 4 : 1)}px`,
              background: count > 0 ? 'var(--primary)' : 'var(--surface-3)',
              boxShadow: count > 0 ? '0 0 8px var(--primary-glow)' : 'none',
              transition: 'height 0.6s ease',
            }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--text-mono)' }}>
        <span>{last14[0]?.[0]?.slice(5)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function LinkBtn({ href, label, color = 'var(--primary-bright)' }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 6, border: `1px solid ${color}22`,
      background: `${color}11`, color, fontSize: 10, fontWeight: 700,
      textDecoration: 'none', transition: 'all 0.2s', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}22` }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}11` }}
    >
      ↗ {label}
    </a>
  )
}

export default function DevDashboard({ onExit }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('overview')

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/api/dashboard-stats`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setStats(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const s = stats

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ background: 'rgba(7,7,16,0.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border-subtle)', padding: '0 40px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'secPulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Developer Dashboard</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['overview', 'sessions', 'patterns'].map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--primary-light)' : 'transparent',
                  color: tab === t ? 'var(--primary-bright)' : 'var(--text-3)',
                  fontSize: 13, fontWeight: 600, fontFamily: 'Space Grotesk', transition: 'all 0.2s',
                }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={load} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>↻ Refresh</button>
            <button onClick={onExit} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)', background: 'var(--surface)', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Space Grotesk' }}>← Exit</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '40px 40px 0' }}>
        {loading && <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-2)' }}><div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div><p>Connecting to MongoDB…</p></div>}
        {error && (
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <p style={{ color: 'var(--danger)', marginBottom: 8 }}>Could not load stats: {error}</p>
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Make sure the API server is running (<code style={{ fontFamily: 'var(--text-mono)' }}>npm run dev:api</code>)</p>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {s && tab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <KpiCard label="Total Analyses" value={fmtNum(s.total)} sub="All time" color="primary" mono />
              <KpiCard label="Unique Users" value={fmtNum(s.uniqueEmails)} sub="By email" color="success" mono />
              <KpiCard label="Total Tokens" value={fmtNum(s.tokensIn + s.tokensOut)} sub={`${fmtNum(s.tokensCached)} cached`} color="warning" mono />
              <KpiCard label="API Cost Est." value={fmtMoney(s.estimatedCostUSD)} sub="Sonnet · CSV optimised" color="danger" mono />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Daily Usage — Last 14 Days</div>
                <DailyChart data={s.dailyUsage} />
              </div>
              <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>User Type Split</div>
                {[{ key: 'merchant', label: '🏪 Merchant', color: 'var(--primary-bright)' }, { key: 'individual', label: '👤 Individual', color: 'var(--success)' }].map(({ key, label, color }) => (
                  <MiniBar key={key} label={label} value={s.profileTypes[key] || 0} max={s.total} color={color} />
                ))}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>Token Breakdown</div>
                  {[{ label: 'Input', v: s.tokensIn, c: 'var(--warning)' }, { label: 'Output', v: s.tokensOut, c: 'var(--success)' }, { label: 'Cached', v: s.tokensCached, c: 'var(--primary-bright)' }].map(({ label, v, c }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-2)' }}>{label}</span>
                      <span style={{ fontFamily: 'var(--text-mono)', color: c }}>{fmtNum(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Top Countries</div>
                {s.countries.slice(0, 6).map(([c, n]) => <MiniBar key={c} label={c} value={n} max={s.total} />)}
                {!s.countries.length && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No data yet</p>}
              </div>
              <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>Leakage Intelligence</div>
                {[
                  { label: 'Total Leakage Detected', value: fmtNum(s.totalLeakageDetected), color: 'var(--danger)' },
                  { label: 'Total Recovery Potential', value: fmtNum(s.totalRecoveryPotential), color: 'var(--success)' },
                  { label: 'Avg AI Confidence', value: `${s.avgConfidence}%`, color: 'var(--primary-bright)' },
                  { label: 'Avg Tokens / Analysis', value: s.total ? fmtNum(Math.round((s.tokensIn + s.tokensOut) / s.total)) : '—', color: 'var(--warning)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--text-mono)', fontSize: 14, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* SESSIONS TAB */}
        {s && tab === 'sessions' && (
          <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Recent Sessions (last 20) — MongoDB</div>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--text-mono)' }}>{s.total} total stored</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Time', 'Email', 'Type', 'Country', 'File', 'Rows', 'Leakage', 'Recovery', 'Conf%', 'Tok In', 'Tok Out', 'Statement', 'Report'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border-subtle)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.recentSessions.map(session => (
                    <tr key={session.id}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.2s' }}
                    >
                      <td style={{ padding: '10px 12px', color: 'var(--text-3)', fontFamily: 'var(--text-mono)', whiteSpace: 'nowrap' }}>{relTime(session.timestamp)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.email || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, background: session.profileType === 'merchant' ? 'var(--primary-light)' : 'var(--success-light)', color: session.profileType === 'merchant' ? 'var(--primary-bright)' : 'var(--success)' }}>
                          {session.profileType || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{session.country || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--text-mono)', fontSize: 11 }}>{session.fileName || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-3)', fontFamily: 'var(--text-mono)', textAlign: 'right' }}>{fmtNum(session.rowCount)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--danger)', fontFamily: 'var(--text-mono)', textAlign: 'right', fontWeight: 700 }}>{fmtNum(session.totalLeakage)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--success)', fontFamily: 'var(--text-mono)', textAlign: 'right', fontWeight: 700 }}>{fmtNum(session.recoveryPotential)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--primary-bright)', fontFamily: 'var(--text-mono)', textAlign: 'right' }}>{session.confidence}%</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-3)', fontFamily: 'var(--text-mono)', textAlign: 'right' }}>{fmtNum(session.tokensIn)}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-3)', fontFamily: 'var(--text-mono)', textAlign: 'right' }}>{fmtNum(session.tokensOut)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <LinkBtn href={`${API}/api/sessions/${session.id}/statement`} label="Statement" color="var(--warning)" />
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <LinkBtn href={`${API}/api/sessions/${session.id}/report`} label="Report" color="var(--success)" />
                      </td>
                    </tr>
                  ))}
                  {!s.recentSessions.length && (
                    <tr><td colSpan={13} style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No sessions yet — run your first analysis.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PATTERNS TAB */}
        {s && tab === 'patterns' && (
          <div style={{ background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(20px)', border: '1px solid var(--border-subtle)', borderRadius: 16, padding: '24px 28px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 20 }}>Top Leakage Patterns Across All Users</div>
            {!s.topPatterns.length && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No patterns yet — run some analyses first.</p>}
            {s.topPatterns.map(([pattern, count], i) => (
              <div key={pattern} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: i === 0 ? 'rgba(245,158,11,0.12)' : i === 1 ? 'var(--danger-light)' : 'var(--primary-light)',
                  color: i === 0 ? 'var(--warning)' : i === 1 ? 'var(--danger)' : 'var(--primary-bright)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, fontFamily: 'var(--text-mono)',
                }}>#{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{pattern}</div>
                  <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(count / s.topPatterns[0][1]) * 100}%`, background: 'var(--primary)', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--text-mono)', fontSize: 20, fontWeight: 800, color: 'var(--primary-bright)', width: 40, textAlign: 'right' }}>{count}×</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
