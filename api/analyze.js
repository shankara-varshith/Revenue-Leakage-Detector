import Anthropic from '@anthropic-ai/sdk'
import { getSessions } from './mongo.js'

const SYSTEM_PROMPT = `You are an expert financial analyst detecting revenue leakage from transaction data. Identify the top 3 most impactful leakage patterns with precise, actionable fixes.

Look for: failed/declined transactions, excessive fees, settlement delays, chargebacks, pricing inconsistencies, duplicate transactions, authorization issues.

Rules:
- All money values MUST use the currency symbol and code provided by the user. Never mix currencies.
- For merchants: focus on business cash flow, fees, settlement, chargebacks.
- For individuals: focus on subscriptions, impulse spending, hidden fees, savings gaps.
- Keep descriptions under 2 sentences. Evidence must cite specific data points.
- Be direct and specific — no generic advice.

Respond ONLY with valid JSON matching this exact schema:
{
  "transactions_analysed": <number>,
  "confidence_score": <0-100>,
  "leakage_patterns": [
    {
      "pattern_name": "<short name>",
      "category": "<Failed Transactions|Fee Optimisation|Settlement|Chargebacks|Pricing|Subscriptions|Other>",
      "severity": "<Critical|High|Medium>",
      "priority": "<Immediate|Short-term|Long-term>",
      "description": "<max 2 sentences>",
      "evidence": "<specific data points from their data>",
      "estimated_annual_loss": <number>,
      "estimated_recovery_amount": <number>,
      "actionable_fix": "<specific concrete action>",
      "implementation_steps": ["step 1", "step 2", "step 3"],
      "timeline": "<e.g. 1-2 weeks>",
      "effort": "<Low|Medium|High>"
    }
  ],
  "quick_wins": ["<one-line action>", "<one-line action>", "<one-line action>"]
}`

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { transactionData, fileName, userProfile } = req.body
  if (!transactionData?.length) return res.status(400).json({ error: 'No transaction data provided' })

  // SSE headers — keeps Vercel connection alive during long Claude generation
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const sample = transactionData.slice(0, 100)
  const columns = Object.keys(sample[0] || {})
  const currency     = userProfile?.currency     ?? '$'
  const currencyCode = userProfile?.currencyCode ?? 'USD'
  const profileLabel = userProfile?.type === 'individual' ? 'Individual (personal finance)' : 'Business / Merchant'

  // CSV is ~70% fewer tokens than pretty-printed JSON for the same data
  const csvRows = [
    columns.join(','),
    ...sample.map(row => columns.map(c => {
      const v = String(row[c] ?? '').replace(/"/g, '""')
      return v.includes(',') || v.includes('\n') ? `"${v}"` : v
    }).join(','))
  ].join('\n')

  const userMessage = `Analyse this transaction dataset for revenue leakage.

Profile: ${profileLabel}
Location: ${userProfile?.country ?? 'Unknown'}
Currency: ${currency} (${currencyCode}) — use ONLY this currency for all money values
File: ${fileName}
Total rows: ${transactionData.length} (sample: ${sample.length})

Data (CSV):
${csvRows}`

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: userMessage }],
    })

    // Forward each text chunk to keep connection alive
    stream.on('text', (text) => {
      sendEvent(res, { type: 'chunk', text })
    })

    const finalMsg = await stream.finalMessage()
    const raw = finalMsg.content[0]?.text ?? ''

    let analysis
    const tryParse = (str) => {
      try { return JSON.parse(str) } catch { return null }
    }
    analysis = tryParse(raw)
    if (!analysis) {
      // Extract outermost JSON object
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) analysis = tryParse(match[0])
    }
    if (!analysis) {
      // Last resort: truncated JSON — close any open arrays/objects and retry
      const match = raw.match(/\{[\s\S]*/)
      if (match) {
        let s = match[0]
        // Count unclosed brackets and close them
        let opens = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length
        let openBraces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length
        s = s.replace(/,\s*$/, '') // strip trailing comma
        s += ']'.repeat(Math.max(0, opens)) + '}'.repeat(Math.max(0, openBraces))
        analysis = tryParse(s)
      }
    }
    if (!analysis) throw new Error('AI returned invalid JSON — please try again')

    // Persist to MongoDB
    let sessionId = null
    try {
      const col = await getSessions()
      const patterns     = analysis.leakage_patterns?.map(p => p.pattern_name) ?? []
      const totalLeakage = analysis.leakage_patterns?.reduce((s, p) => s + (Number(p.estimated_annual_loss)      || 0), 0) ?? 0
      const recoveryPot  = analysis.leakage_patterns?.reduce((s, p) => s + (Number(p.estimated_recovery_amount) || 0), 0) ?? 0

      const doc = {
        timestamp:         new Date(),
        email:             userProfile?.email    ?? 'unknown',
        profileType:       userProfile?.type     ?? 'unknown',
        country:           userProfile?.country  ?? 'unknown',
        currency,
        currencyCode,
        fileName,
        rowCount:          transactionData.length,
        columns,
        tokensIn:          finalMsg.usage?.input_tokens            ?? 0,
        tokensOut:         finalMsg.usage?.output_tokens           ?? 0,
        tokensCached:      finalMsg.usage?.cache_read_input_tokens ?? 0,
        totalLeakage,
        recoveryPotential: recoveryPot,
        confidence:        analysis.confidence_score ?? 0,
        patterns,
        quickWins:         analysis.quick_wins ?? [],
        statementData:     transactionData,
        reportData:        analysis,
      }

      const result = await col.insertOne(doc)
      sessionId = result.insertedId.toString()
    } catch (dbErr) {
      console.warn('MongoDB log failed:', dbErr.message)
    }

    sendEvent(res, { type: 'done', analysis, usage: finalMsg.usage, sessionId })
    res.end()
  } catch (err) {
    console.error('Analysis error:', err)
    sendEvent(res, { type: 'error', error: err.message || 'Analysis failed' })
    res.end()
  }
}
