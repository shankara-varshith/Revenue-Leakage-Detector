import { getSessions } from './mongo.js'
import { ObjectId } from 'mongodb'

export default async function handler(req, res) {
  const { id, type } = req.params   // type: 'statement' | 'report'

  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid session ID' })

  try {
    const col = await getSessions()
    const session = await col.findOne({ _id: new ObjectId(id) })
    if (!session) return res.status(404).json({ error: 'Session not found' })

    if (type === 'statement') {
      const rows = session.statementData ?? []
      res.setHeader('Content-Disposition', `attachment; filename="${session.fileName || 'statement'}.json"`)
      res.setHeader('Content-Type', 'application/json')
      return res.status(200).json({
        fileName:  session.fileName,
        rowCount:  session.rowCount,
        columns:   session.columns,
        timestamp: session.timestamp,
        data:      rows,
      })
    }

    if (type === 'report') {
      return res.status(200).json({
        sessionId:         id,
        timestamp:         session.timestamp,
        email:             session.email,
        profileType:       session.profileType,
        country:           session.country,
        currency:          session.currency,
        fileName:          session.fileName,
        rowCount:          session.rowCount,
        totalLeakage:      session.totalLeakage,
        recoveryPotential: session.recoveryPotential,
        confidence:        session.confidence,
        patterns:          session.patterns,
        report:            session.reportData,
      })
    }

    return res.status(400).json({ error: 'type must be statement or report' })
  } catch (err) {
    console.error('Session fetch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
