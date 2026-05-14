import { MongoClient } from 'mongodb'

const URI = process.env.MONGODB_URI
if (!URI) throw new Error('MONGODB_URI not set')

let client
let db

export async function getDb() {
  if (!db) {
    client = new MongoClient(URI)
    await client.connect()
    db = client.db('revenue_leakage_detector')
  }
  return db
}

export async function getBankStatements() {
  const d = await getDb()
  return d.collection('BankStatement')
}

export async function getOutputReports() {
  const d = await getDb()
  return d.collection('OutputReports')
}

// Legacy alias — kept so dashboard-stats still compiles during migration
export async function getSessions() {
  return getOutputReports()
}
