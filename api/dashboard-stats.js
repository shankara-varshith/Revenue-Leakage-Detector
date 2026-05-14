import { getOutputReports } from './mongo.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const col = await getOutputReports()
    const sessions = await col.find({}, {
      projection: { report: 0 },   // exclude heavy report payload from list
    }).sort({ timestamp: -1 }).toArray()

    const total = sessions.length

    const uniqueEmails = new Set(sessions.map(s => s.email).filter(Boolean)).size
    const tokensIn     = sessions.reduce((s, x) => s + (x.tokensIn     || 0), 0)
    const tokensOut    = sessions.reduce((s, x) => s + (x.tokensOut    || 0), 0)
    const tokensCached = sessions.reduce((s, x) => s + (x.tokensCached || 0), 0)
    const estimatedCostUSD = (((tokensIn - tokensCached) * 3 + tokensOut * 15) / 1_000_000).toFixed(4)

    const countries = {}
    sessions.forEach(s => { if (s.country) countries[s.country] = (countries[s.country] || 0) + 1 })

    const profileTypes = { merchant: 0, individual: 0 }
    sessions.forEach(s => { if (s.profileType) profileTypes[s.profileType] = (profileTypes[s.profileType] || 0) + 1 })

    const dailyMap = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      dailyMap[d.toISOString().slice(0, 10)] = 0
    }
    sessions.forEach(s => {
      const day = s.timestamp ? new Date(s.timestamp).toISOString().slice(0, 10) : null
      if (day && dailyMap[day] !== undefined) dailyMap[day]++
    })

    const patternCounts = {}
    sessions.forEach(s => s.patterns?.forEach(p => { patternCounts[p] = (patternCounts[p] || 0) + 1 }))
    const topPatterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)

    const totalLeakageDetected   = sessions.reduce((s, x) => s + (x.totalLeakage      || 0), 0)
    const totalRecoveryPotential = sessions.reduce((s, x) => s + (x.recoveryPotential  || 0), 0)
    const avgConfidence = total ? Math.round(sessions.reduce((s, x) => s + (x.confidence || 0), 0) / total) : 0

    const recentSessions = sessions.slice(0, 20).map(s => ({
      id:                s._id.toString(),
      timestamp:         s.timestamp,
      email:             s.email,
      profileType:       s.profileType,
      country:           s.country,
      currency:          s.currency,
      fileName:          s.fileName,
      rowCount:          s.rowCount,
      tokensIn:          s.tokensIn,
      tokensOut:         s.tokensOut,
      tokensCached:      s.tokensCached,
      totalLeakage:      s.totalLeakage,
      recoveryPotential: s.recoveryPotential,
      confidence:        s.confidence,
      patterns:          s.patterns,
    }))

    return res.status(200).json({
      total, uniqueEmails, tokensIn, tokensOut, tokensCached, estimatedCostUSD,
      totalLeakageDetected, totalRecoveryPotential, avgConfidence,
      countries: Object.entries(countries).sort((a, b) => b[1] - a[1]),
      profileTypes, dailyUsage: Object.entries(dailyMap), topPatterns, recentSessions,
    })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    return res.status(500).json({ error: err.message })
  }
}
