import { GoogleGenerativeAI } from '@google/generative-ai'
import { getBankStatements, getOutputReports } from './mongo.js'

const SYSTEM_PROMPT = `You are a senior financial analyst specialising in revenue leakage detection. Your job is to identify the 3 BIGGEST money problems in the transaction data — the ones that actually matter, not minor nuisances.

WHAT COUNTS AS A MAJOR LEAKAGE:
- A pattern costing at least 1–2% of total transaction volume annually, OR
- A recurring structural problem (repeated failed transactions, systematic overcharging, avoidable fee categories), OR
- Something fixable with a concrete operational change that recovers real money

IGNORE AND DO NOT REPORT:
- One-off anomalies with no clear pattern
- Trivial rounding differences or single small transactions
- Generic advice that applies to every business ("negotiate better rates") without data backing
- Anything below ~0.5% of total transaction volume unless it compounds severely

HOW TO ESTIMATE LOSSES ACCURATELY:
1. Count the affected transactions in the data sample
2. Extrapolate to annual volume (data may cover weeks or months — infer the period from date range)
3. Apply the loss per transaction to get annual figure
4. Recovery amount = realistic portion you can actually reclaim (be conservative, not optimistic)

ANALYSIS RULES:
- All money values MUST use the currency symbol and code the user provides. Never mix currencies.
- For merchants: focus on failed/declined transactions, payment processor fees, settlement delays, chargebacks, duplicate charges.
- For individuals: focus on recurring subscription bleed, high-fee payment methods, avoidable bank charges, missed cashback/rewards.
- Evidence must quote SPECIFIC numbers from the data — transaction counts, exact amounts, dates, merchant names.
- Descriptions: 2 sentences max. Be blunt about the problem. No filler language.
- Fixes must be concrete operational steps, not platitudes.

Respond ONLY with valid JSON matching this exact schema:
{
  "transactions_analysed": <number>,
  "confidence_score": <0-100>,
  "leakage_patterns": [
    {
      "pattern_name": "<short, punchy name — what the problem IS>",
      "category": "<Failed Transactions|Excessive Fees|Settlement Delays|Chargebacks|Duplicate Charges|Subscriptions|Other>",
      "severity": "<Critical|High|Medium>",
      "priority": "<Immediate|Short-term|Long-term>",
      "description": "<2 sentences max — name the problem and why it costs money>",
      "evidence": "<specific: transaction count, total amount, date range, merchant names — from their actual data>",
      "estimated_annual_loss": <number — extrapolated to full year>,
      "estimated_recovery_amount": <number — conservative, realistic>,
      "actionable_fix": "<one concrete action — what exactly to do, with whom, to fix this>",
      "implementation_steps": ["step 1", "step 2", "step 3"],
      "timeline": "<realistic timeframe e.g. '3–5 days' or '2–4 weeks'>",
      "effort": "<Low|Medium|High>"
    }
  ],
  "quick_wins": ["<specific one-liner with a number: e.g. 'Cancel 3 duplicate SaaS subscriptions — saves $X/month'>", "<action>", "<action>"]
}`

function sendEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { transactionData, fileName, userProfile } = req.body
  if (!transactionData?.length) return res.status(400).json({ error: 'No transaction data provided' })

  // SSE headers — keeps Vercel connection alive during generation
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.flushHeaders()

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    systemInstruction: SYSTEM_PROMPT,
  })

  const sample = transactionData.slice(0, 500)
  const columns = Object.keys(sample[0] || {})
  const currency     = userProfile?.currency     ?? '$'
  const currencyCode = userProfile?.currencyCode ?? 'USD'
  const profileLabel = userProfile?.type === 'individual' ? 'Individual (personal finance)' : 'Business / Merchant'

  const csvRows = [
    columns.join(','),
    ...sample.map(row => columns.map(c => {
      const v = String(row[c] ?? '').replace(/"/g, '""')
      return v.includes(',') || v.includes('\n') ? `"${v}"` : v
    }).join(','))
  ].join('\n')

  const userMessage = `Analyse this transaction dataset for the 3 BIGGEST revenue leakage patterns.

Profile: ${profileLabel}
Location: ${userProfile?.country ?? 'Unknown'}
Currency: ${currency} (${currencyCode}) — use ONLY this currency for all money values
File: ${fileName}
Total rows in file: ${transactionData.length} (sending first ${sample.length} rows)

Instructions:
- Infer the time period covered from the date column(s) in the data
- Extrapolate all loss/recovery figures to annual (12-month) amounts
- Only report patterns with material financial impact — skip minor anomalies
- Every evidence field must quote specific numbers, dates, and transaction descriptions from this data

Data (CSV):
${csvRows}`

  try {
    const result = await model.generateContentStream(userMessage)

    let raw = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        raw += text
        sendEvent(res, { type: 'chunk', text })
      }
    }

    const finalResponse = await result.response
    const usage = {
      input_tokens:  finalResponse.usageMetadata?.promptTokenCount     ?? 0,
      output_tokens: finalResponse.usageMetadata?.candidatesTokenCount ?? 0,
    }

    const tryParse = (str) => {
      try { return JSON.parse(str) } catch { return null }
    }
    let analysis = tryParse(raw)
    if (!analysis) {
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) analysis = tryParse(match[0])
    }
    if (!analysis) {
      const match = raw.match(/\{[\s\S]*/)
      if (match) {
        let s = match[0]
        const opens      = (s.match(/\[/g) || []).length - (s.match(/\]/g) || []).length
        const openBraces = (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length
        s = s.replace(/,\s*$/, '')
        s += ']'.repeat(Math.max(0, opens)) + '}'.repeat(Math.max(0, openBraces))
        analysis = tryParse(s)
      }
    }
    if (!analysis) throw new Error('AI returned invalid JSON — please try again')

    // Persist to MongoDB — BankStatement + OutputReports as separate collections
    let sessionId = null
    try {
      const now          = new Date()
      const patterns     = analysis.leakage_patterns?.map(p => p.pattern_name) ?? []
      const totalLeakage = analysis.leakage_patterns?.reduce((s, p) => s + (Number(p.estimated_annual_loss)      || 0), 0) ?? 0
      const recoveryPot  = analysis.leakage_patterns?.reduce((s, p) => s + (Number(p.estimated_recovery_amount) || 0), 0) ?? 0

      // 1. Store raw statement in BankStatement collection
      const stmtCol    = await getBankStatements()
      const stmtResult = await stmtCol.insertOne({
        timestamp:   now,
        email:       userProfile?.email   ?? 'unknown',
        profileType: userProfile?.type    ?? 'unknown',
        country:     userProfile?.country ?? 'unknown',
        currency,
        currencyCode,
        fileName,
        rowCount:    transactionData.length,
        columns,
        data:        transactionData,
      })

      // 2. Store analysis output in OutputReports collection
      const reportCol    = await getOutputReports()
      const reportResult = await reportCol.insertOne({
        timestamp:         now,
        email:             userProfile?.email   ?? 'unknown',
        profileType:       userProfile?.type    ?? 'unknown',
        country:           userProfile?.country ?? 'unknown',
        currency,
        currencyCode,
        fileName,
        rowCount:          transactionData.length,
        statementId:       stmtResult.insertedId,   // cross-reference
        tokensIn:          usage.input_tokens,
        tokensOut:         usage.output_tokens,
        tokensCached:      0,
        totalLeakage,
        recoveryPotential: recoveryPot,
        confidence:        analysis.confidence_score ?? 0,
        patterns,
        quickWins:         analysis.quick_wins ?? [],
        report:            analysis,
      })

      sessionId = reportResult.insertedId.toString()
    } catch (dbErr) {
      console.warn('MongoDB log failed:', dbErr.message)
    }

    sendEvent(res, { type: 'done', analysis, usage, sessionId })
    res.end()
  } catch (err) {
    console.error('Analysis error:', err)
    let message = err.message || 'Analysis failed'
    if (message.includes('429') || message.includes('quota') || message.includes('Too Many Requests')) {
      message = 'Too many requests — free tier limit reached. Please try again in a minute.'
    }
    sendEvent(res, { type: 'error', error: message })
    res.end()
  }
}
