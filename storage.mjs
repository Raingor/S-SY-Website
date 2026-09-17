import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import mariadb from 'mariadb'

const root = dirname(fileURLToPath(import.meta.url))
const dataPath = resolve(root, 'data/site-data.json')
function loadLocalEnvFile() {
  const file = resolve(root, '.env')
  if (!existsSync(file)) return
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}
loadLocalEnvFile()
const storageMode = String(process.env.SY_STORAGE || (process.env.SY_DB_NAME ? 'mariadb' : 'json')).toLowerCase()
const dbConfig = {
  host: String(process.env.SY_DB_HOST || '127.0.0.1'),
  port: Number(process.env.SY_DB_PORT || 3306),
  user: String(process.env.SY_DB_USER || ''),
  password: String(process.env.SY_DB_PASSWORD || ''),
  database: String(process.env.SY_DB_NAME || ''),
  socketPath: String(process.env.SY_DB_SOCKET || ''),
  connectionLimit: Number(process.env.SY_DB_CONNECTION_LIMIT || 5),
  connectTimeout: 5000,
  acquireTimeout: 5000,
  charset: 'utf8mb4',
}

let dataCache = null
let pool = null
let storageReady = false
let saveQueue = Promise.resolve()

function readSeedData() {
  if (!existsSync(dataPath)) throw new Error(`seed data not found: ${dataPath}`)
  return JSON.parse(readFileSync(dataPath, 'utf8'))
}

function writeJsonData(data) {
  const tempPath = `${dataPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  writeFileSync(tempPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
  renameSync(tempPath, dataPath)
}

function mariaConfig() {
  if (!dbConfig.user || !dbConfig.database || !dbConfig.password) throw new Error('MariaDB storage requires SY_DB_USER, SY_DB_PASSWORD and SY_DB_NAME')
  const config = { ...dbConfig }
  if (!config.socketPath) delete config.socketPath
  return config
}

async function initMariaDb() {
  pool = mariadb.createPool(mariaConfig())
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sy_site_data (
      data_key VARCHAR(64) NOT NULL PRIMARY KEY,
      payload_json LONGTEXT NOT NULL,
      updated_at DATETIME(6) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  const rows = await pool.query('SELECT payload_json FROM sy_site_data WHERE data_key = ? LIMIT 1', ['main'])
  if (!rows[0]) {
    const seed = readSeedData()
    await pool.query('INSERT INTO sy_site_data (data_key, payload_json, updated_at) VALUES (?, ?, UTC_TIMESTAMP(6))', ['main', JSON.stringify(seed)])
    dataCache = seed
  } else {
    dataCache = JSON.parse(rows[0].payload_json)
  }
}

export async function initStorage() {
  if (storageMode === 'mariadb') await initMariaDb()
  else if (storageMode === 'json') dataCache = readSeedData()
  else throw new Error(`unsupported storage mode: ${storageMode}`)
  storageReady = true
  return storageStatus()
}

export function readData() {
  if (!storageReady || !dataCache) throw new Error('storage is not ready')
  return dataCache
}

export function saveData(data) {
  dataCache = data
  if (storageMode === 'json') return Promise.resolve().then(() => writeJsonData(data))
  saveQueue = saveQueue.then(() => pool.query(
    'INSERT INTO sy_site_data (data_key, payload_json, updated_at) VALUES (?, ?, UTC_TIMESTAMP(6)) ON DUPLICATE KEY UPDATE payload_json = VALUES(payload_json), updated_at = UTC_TIMESTAMP(6)',
    ['main', JSON.stringify(data)],
  ))
  return saveQueue
}

export function storageStatus() {
  return { mode: storageMode, ready: storageReady }
}

export async function closeStorage() {
  if (pool) await pool.end()
  pool = null
  storageReady = false
}
