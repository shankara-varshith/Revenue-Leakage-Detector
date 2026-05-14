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

export async function getSessions() {
  const d = await getDb()
  return d.collection('sessions')
}
