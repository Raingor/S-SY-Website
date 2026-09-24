const FAVORITES_KEY = 'sy-website:saved-content:v1'
const RECENT_KEY = 'sy-website:recent-content:v1'
const CHANGE_EVENT = 'sy-website-user-content-change'

function readRecords(key) {
  if (typeof window === 'undefined') return []
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter((item) => item && typeof item.type === 'string' && typeof item.id === 'string') : []
  } catch { return [] }
}

function writeRecords(key, records) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(records))
    window.dispatchEvent(new Event(CHANGE_EVENT))
  } catch { /* Private browsing or storage quota: keep the page usable. */ }
}

export function readSavedContent() { return readRecords(FAVORITES_KEY) }
export function readRecentContent() { return readRecords(RECENT_KEY) }
export function userContentChangeEvent() { return CHANGE_EVENT }

export function isContentSaved(type, id) {
  return readSavedContent().some((item) => item.type === type && item.id === String(id))
}

export function toggleSavedContent(type, id) {
  const stableId = String(id || '').trim()
  if (!type || !stableId) return { saved: false, records: readSavedContent() }
  const records = readSavedContent()
  const exists = records.some((item) => item.type === type && item.id === stableId)
  const next = exists
    ? records.filter((item) => item.type !== type || item.id !== stableId)
    : [{ type, id: stableId, savedAt: new Date().toISOString() }, ...records]
  writeRecords(FAVORITES_KEY, next)
  return { saved: !exists, records: next }
}

export function removeSavedContent(type, id) {
  const stableId = String(id || '')
  const records = readSavedContent().filter((item) => item.type !== type || item.id !== stableId)
  writeRecords(FAVORITES_KEY, records)
  return records
}

export function recordRecentContent(type, id) {
  const stableId = String(id || '').trim()
  if (!type || !stableId) return readRecentContent()
  const records = readRecentContent().filter((item) => item.type !== type || item.id !== stableId)
  const next = [{ type, id: stableId, viewedAt: new Date().toISOString() }, ...records].slice(0, 30)
  writeRecords(RECENT_KEY, next)
  return next
}

export function clearRecentContent() {
  writeRecords(RECENT_KEY, [])
  return []
}
