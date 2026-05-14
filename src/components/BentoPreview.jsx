import { useRef } from 'react'

function useCursorGlow() {
  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    e.currentTarget.style.setProperty('--mouse-x', `${x}%`)
    e.currentTarget.style.setProperty('--mouse-y', `${y}%`)
  }
  return { onMouseMove: handleMouseMove }
}

function Tile({ className, children, shimmer }) {
  const glow = useCursorGlow()
  return (
    <div className={`bento-tile${shimmer ? ' shimmer' : ''} ${className || ''}`} {...glow}>
      {children}
    </div>
  )
}

export default function BentoPreview() {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', display: 'inline-block' }} />
        Live Report Preview
      </div>
      <div className="bento-preview">

        {/* Big leakage KPI */}
        <Tile className="span-4">
          <div className="spark" />
          <div className="bento-label">Total Annual Leakage</div>
          <div className="bento-value danger">₹4,82,000</div>
          <div className="bento-sub">Estimated across 3 patterns</div>
          <div className="bento-bar"><div className="bento-bar-fill danger" style={{ width: '78%' }} /></div>
        </Tile>

        {/* Recovery */}
        <Tile className="span-2">
          <div className="spark success" />
          <div className="bento-label">Recoverable</div>
          <div className="bento-value success" style={{ fontSize: 20 }}>₹3,10,000</div>
          <div className="bento-sub">With fixes applied</div>
        </Tile>

        {/* Pattern 1 */}
        <Tile className="span-3">
          <div className="spark" />
          <div className="bento-label">#1 — Critical</div>
          <div className="bento-pattern-name">Settlement Funding Gap</div>
          <div className="bento-pattern-val">₹1,85,000 / yr</div>
          <div className="bento-bar"><div className="bento-bar-fill danger" style={{ width: '92%' }} /></div>
        </Tile>

        {/* Pattern 2 */}
        <Tile className="span-3" shimmer>
          <div className="bento-label">#2 — High</div>
          <div className="bento-pattern-name">Failed Transaction Retries</div>
          <div className="bento-pattern-val">₹1,20,000 / yr</div>
          <div className="bento-bar"><div className="bento-bar-fill danger" style={{ width: '65%' }} /></div>
        </Tile>

        {/* Confidence */}
        <Tile className="span-2">
          <div className="spark primary" />
          <div className="bento-label">AI Confidence</div>
          <div className="bento-value primary" style={{ fontSize: 24 }}>87%</div>
          <div className="bento-sub">Data quality: Good</div>
        </Tile>

        {/* Quick wins */}
        <Tile className="span-4" shimmer>
          <div className="bento-label">⚡ Quick Wins This Week</div>
          <div className="bento-patterns">
            {['Enable mid-month Razorpay settlement', 'Retry failed UPI txns via alternate gateway', 'Audit platform subscription fees'].map((w, i) => (
              <div className="bento-pattern-row" key={i}>
                <span>{w}</span>
                <span style={{ color: 'var(--success)', fontSize: 10 }}>✓ Act Now</span>
              </div>
            ))}
          </div>
        </Tile>

      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'var(--text-mono)' }}>
        Sample output · Your report will use your actual data
      </div>
    </div>
  )
}
