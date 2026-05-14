import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '..', 'usage-log.json')

function read() {
  if (!existsSync(DB_PATH)) return { sessions: [] }
  try { return JSON.parse(readFileSync(DB_PATH, 'utf8')) }
  catch { return { sessions: [] } }
}

function write(data) {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2))
}

export function logSession(session) {
  const db = read()
  db.sessions.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...session,
  })
  write(db)
}

export function getSessions() {
  return read().sessions
}
