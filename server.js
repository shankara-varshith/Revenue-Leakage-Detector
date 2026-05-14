import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '.env')
try {
  readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...rest] = line.trim().split('=')
    if (key && rest.length) process.env[key] = rest.join('=')
  })
} catch {}

import express from 'express'
import analyzeHandler      from './api/analyze.js'
import dashboardHandler    from './api/dashboard-stats.js'
import sessionsHandler     from './api/sessions.js'

const app = express()
app.use(express.json({ limit: '20mb' }))
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.post('/api/analyze',                         (req, res) => analyzeHandler(req, res))
app.get('/api/dashboard-stats',                  (req, res) => dashboardHandler(req, res))
app.get('/api/sessions/:id/:type',               (req, res) => {
  req.params = { id: req.params.id, type: req.params.type }
  sessionsHandler(req, res)
})

app.listen(3001, () => {
  console.log('API server       → http://localhost:3001')
  console.log('API key loaded   :', process.env.ANTHROPIC_API_KEY ? 'YES ✓' : 'NO ✗')
  console.log('MongoDB URI set  :', process.env.MONGODB_URI ? 'YES ✓' : 'NO ✗')
  console.log('Dev dashboard    → http://localhost:5173/#dev')
})
