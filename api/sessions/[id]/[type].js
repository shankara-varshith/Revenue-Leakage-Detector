import { getOutputReports, getBankStatements } from '../../mongo.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { id, type } = req.query   // Vercel passes dynamic segments via req.query

  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid ID' })

  try {
    if (type === 'report') {
      const col    = await getOutputReports()
      const report = await col.findOne({ _id: new ObjectId(id) })
      if (!report) return res.status(404).json({ error: 'Report not found' })
      return res.status(200).json({
        sessionId:         id,
        timestamp:         report.timestamp,
        email:             report.email,
        profileType:       report.profileType,
        country:           report.country,
        currency:          report.currency,
        fileName:          report.fileName,
        rowCount:          report.rowCount,
        totalLeakage:      report.totalLeakage,
        recoveryPotential: report.recoveryPotential,
        confidence:        report.confidence,
        patterns:          report.patterns,
        report:            report.report,
      })
    }

    if (type === 'statement') {
      // Find the report first to get the statementId cross-reference
      const reportCol = await getOutputReports()
      const report    = await reportCol.findOne({ _id: new ObjectId(id) }, { projection: { statementId: 1, fileName: 1 } })
      if (!report) return res.status(404).json({ error: 'Report not found' })

      const stmtCol   = await getBankStatements()
      const statement = await stmtCol.findOne({ _id: report.statementId })
      if (!statement) return res.status(404).json({ error: 'Statement not found' })

      res.setHeader('Content-Disposition', `attachment; filename="${statement.fileName || 'statement'}.json"`)
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json({
        fileName:  statement.fileName,
        rowCount:  statement.rowCount,
        columns:   statement.columns,
        timestamp: statement.timestamp,
        data:      statement.data,
      })
    }

    return res.status(400).json({ error: 'type must be "statement" or "report"' })
  } catch (err) {
    console.error('Session fetch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
