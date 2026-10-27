// Sidebar "Recents": most recently opened admin panels, newest first.
// Stored per browser so it survives reloads without touching the server.
export const RECENTS_KEY = 'sy-greece-admin-recents'
export const RECENTS_LIMIT = 6

const isMenuId = id => typeof id === 'string' && id.length > 0 && id.length < 60 && /^[A-Za-z][A-Za-z0-9]*$/.test(id) && !['constructor', 'prototype', '__proto__'].includes(id)

// Reads recents defensively: a corrupt or hostile sessionStorage value must never
// break the sidebar, and unknown ids (removed panels) are dropped.
export function readRecents(storage, knownIds) {
  try {
    const parsed = JSON.parse(storage?.getItem(RECENTS_KEY) || '[]')
    if (!Array.isArray(parsed)) return []
    const seen = new Set()
    const out = []
    for (const entry of parsed) {
      if (!isMenuId(entry) || seen.has(entry)) continue
      if (knownIds && !knownIds.has(entry)) continue
      seen.add(entry)
      out.push(entry)
      if (out.length === RECENTS_LIMIT) break
    }
    return out
  } catch { return [] }
}

// Returns the new list; the current panel always moves to the front.
export function pushRecent(recents, id) {
  if (!isMenuId(id)) return Array.isArray(recents) ? recents.slice() : []
  return [id, ...(Array.isArray(recents) ? recents : []).filter(entry => entry !== id)].slice(0, RECENTS_LIMIT)
}

export function writeRecents(storage, recents) {
  try { storage?.setItem(RECENTS_KEY, JSON.stringify(recents || [])) } catch { /* private mode: keep in-memory only */ }
}

export function clearRecents(storage) {
  try { storage?.removeItem(RECENTS_KEY) } catch { /* ignore */ }
}

// Label + group label for a menu id, so the list can show context like the reference UI.
export function describeMenu(groups, id) {
  for (const group of groups || []) {
    const pools = [group.items || [], ...(group.sections || []).map(section => section.items || [])]
    for (const pool of pools) {
      const hit = pool.find(entry => entry[0] === id)
      if (hit) return { label: hit[1], group: group.label, icon: hit[2] || '' }
    }
  }
  return null
}
