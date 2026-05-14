function fmt(n, currency = '$') {
  if (n == null) return '—'
  return currency + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function SeverityBadge({ severity }) {
  const cls = severity?.toLowerCase() === 'critical' ? 'badge-critical'
    : severity?.toLowerCase() === 'high' ? 'badge-high' : 'badge-medium'
  return <span className={`badge ${cls}`}>{severity}</span>
}

function PriorityBadge({ priority }) {
  const cls = priority?.toLowerCase() === 'immediate' ? 'badge-immediate'
    : priority?.toLowerCase().includes('short') ? 'badge-short' : 'badge-long'
  return <span className={`badge ${cls}`}>{priority}</span>
}

function PatternCard({ pattern, rank, currency }) {
  return (
    <div className="pattern-card">
      <div className="pattern-header">
        <div className={`rank-badge rank-${rank}`}>#{rank}</div>
        <div className="pattern-meta">
          <div className="pattern-name">{pattern.pattern_name}</div>
          <div className="pattern-tags">
            {pattern.severity && <SeverityBadge severity={pattern.severity} />}
            {pattern.priority && <PriorityBadge priority={pattern.priority} />}
            {pattern.category && <span className="badge badge-category">{pattern.category}</span>}
          </div>
        </div>
        <div className="pattern-amounts">
          <div className="amount-block">
            <div className="amt-label">Annual Loss</div>
            <div className="amt-value amt-loss">{fmt(pattern.estimated_annual_loss, currency)}</div>
          </div>
          <div className="amount-block">
            <div className="amt-label">Recoverable</div>
            <div className="amt-value amt-recovery">{fmt(pattern.estimated_recovery_amount, currency)}</div>
          </div>
        </div>
      </div>

      <div className="pattern-body">
        <p className="pattern-description">{pattern.description}</p>

        {pattern.evidence && (
          <div className="evidence-block">
            <strong>Evidence</strong>
            {pattern.evidence}
          </div>
        )}

        {pattern.actionable_fix && (
          <div className="fix-block">
            <h5>Fix</h5>
            <div className="fix-text">{pattern.actionable_fix}</div>
          </div>
        )}

        {pattern.implementation_steps?.length > 0 && (
          <div className="steps-block">
            <h5>Steps</h5>
            <div className="steps-list">
              {pattern.implementation_steps.map((step, i) => (
                <div className="step-item" key={i}>
                  <div className="step-num">{i + 1}</div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(pattern.timeline || pattern.effort) && (
          <div className="timeline-row">
            {pattern.timeline && <span>Timeline: <strong>{pattern.timeline}</strong></span>}
            {pattern.effort && <span>Effort: <strong>{pattern.effort}</strong></span>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AnalysisResults({ analysis, fileName, userProfile, usage, onReset }) {
  const patterns = analysis?.leakage_patterns ?? []
  const currency = userProfile?.currency ?? '$'
  const totalLoss = patterns.reduce((s, p) => s + (Number(p.estimated_annual_loss) || 0), 0)
  const totalRecovery = patterns.reduce((s, p) => s + (Number(p.estimated_recovery_amount) || 0), 0)

  function handleDownload() {
    window.print()
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Revenue Leakage Report — ${fileName}`)
    const body = encodeURIComponent(
      `Revenue Leakage Report\n\nFile: ${fileName}\nTransactions Analysed: ${analysis?.transactions_analysed ?? '—'}\n\n` +
      `Total Annual Leakage: ${currency}${totalLoss.toLocaleString()}\n` +
      `Recovery Potential: ${currency}${totalRecovery.toLocaleString()}\n` +
      `Confidence: ${analysis?.confidence_score ?? '—'}%\n\n` +
      patterns.map((p, i) =>
        `#${i+1} ${p.pattern_name}\nLoss: ${currency}${Number(p.estimated_annual_loss).toLocaleString()} | Recoverable: ${currency}${Number(p.estimated_recovery_amount).toLocaleString()}\nFix: ${p.actionable_fix}`
      ).join('\n\n')
    )
    window.open(`mailto:${userProfile?.email || ''}?subject=${subject}&body=${body}`)
  }

  return (
    <div>
      <div className="results-header">
        <div className="results-title">
          <h2>Revenue Leakage Report</h2>
          <p>{fileName} · {analysis?.transactions_analysed?.toLocaleString() ?? '—'} transactions · {userProfile?.country}</p>
        </div>
        <div className="results-actions">
          <button className="btn-secondary" onClick={handleEmail}>📧 Email</button>
          <button className="btn-secondary" onClick={handleDownload}>⬇ Download PDF</button>
          <button className="btn-secondary" onClick={onReset}>← New</button>
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-card danger">
          <div className="label">Total Annual Leakage</div>
          <div className="value">{fmt(totalLoss, currency)}</div>
          <div className="sub">Across {patterns.length} patterns</div>
        </div>
        <div className="summary-card success">
          <div className="label">Recovery Potential</div>
          <div className="value">{fmt(totalRecovery, currency)}</div>
          <div className="sub">With recommended fixes</div>
        </div>
        <div className="summary-card primary">
          <div className="label">Confidence</div>
          <div className="value">{analysis?.confidence_score ?? '—'}%</div>
          <div className="sub">Based on data quality</div>
        </div>
      </div>

      <div className="patterns-section">
        <h3>Top Leakage Patterns</h3>
        {patterns.map((p, i) => (
          <PatternCard key={i} pattern={p} rank={i + 1} currency={currency} />
        ))}
      </div>

      {analysis?.quick_wins?.length > 0 && (
        <div className="quick-wins">
          <h3>⚡ Quick Wins — This Week</h3>
          <div className="wins-grid">
            {analysis.quick_wins.map((w, i) => (
              <div className="win-item" key={i}>
                <span className="win-check">✓</span>
                <span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="results-footer">
        <span className="usage-info">
          {usage && `${usage.input_tokens?.toLocaleString()} tokens in · ${usage.output_tokens?.toLocaleString()} out`}
          {usage?.cache_read_input_tokens > 0 && ` · ${usage.cache_read_input_tokens?.toLocaleString()} cached`}
        </span>
        <span className="ai-badge">⚡ AI Analysis</span>
      </div>
    </div>
  )
}
