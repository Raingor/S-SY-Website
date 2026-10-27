import assert from 'node:assert/strict'
import { RECENTS_KEY, RECENTS_LIMIT, clearRecents, describeMenu, pushRecent, readRecents, writeRecents } from '../src/admin-vue/recents.mjs'

const store = () => {
  const map = new Map()
  return { getItem: k => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: k => map.delete(k), _map: map }
}

// Newest first, de-duplicated, capped.
let list = []
for (const id of ['overview', 'attractions', 'audioTracks', 'settings', 'cities', 'leads', 'guides']) list = pushRecent(list, id)
assert.deepEqual(list, ['guides', 'leads', 'cities', 'settings', 'audioTracks', 'attractions'], 'newest first and capped')
assert.equal(list.length, RECENTS_LIMIT)
assert.deepEqual(pushRecent(list, 'cities'), ['cities', 'guides', 'leads', 'settings', 'audioTracks', 'attractions'], 'revisiting moves to front without duplicating')
assert.deepEqual(pushRecent([], 'overview'), ['overview'])
assert.deepEqual(pushRecent(['overview'], ''), ['overview'], 'empty id ignored')
assert.deepEqual(pushRecent(['overview'], '__recents_clear'), ['overview'], 'internal action id is not recorded')
assert.deepEqual(pushRecent(null, 'settings'), ['settings'], 'null list tolerated')

// Persistence round-trip.
const s = store()
writeRecents(s, ['attractions', 'cities'])
assert.equal(s.getItem(RECENTS_KEY), '["attractions","cities"]')
assert.deepEqual(readRecents(s), ['attractions', 'cities'])

// Corrupt or hostile storage must not break the sidebar.
for (const bad of ['not json', '{"a":1}', 'null', '"str"', '[1,2,3]', '["a","a","a"]']) {
  s.setItem(RECENTS_KEY, bad)
  const out = readRecents(s)
  assert.ok(Array.isArray(out), `corrupt value ${bad} yields an array`)
}
s.setItem(RECENTS_KEY, '["attractions","../evil","__proto__","constructor","a b","<script>","audioTracks"]')
assert.deepEqual(readRecents(s), ['attractions', 'audioTracks'], 'non-identifier entries are rejected')
s.setItem(RECENTS_KEY, JSON.stringify(['attractions', 'removedPanel', 'cities']))
assert.deepEqual(readRecents(s, new Set(['attractions', 'cities'])), ['attractions', 'cities'], 'ids of removed panels are dropped')
assert.deepEqual(readRecents(undefined), [], 'missing storage tolerated')
clearRecents(s)
assert.equal(s.getItem(RECENTS_KEY), null)
assert.deepEqual(readRecents(s), [], 'cleared recents read as empty')

// Storage that throws (private mode) must not propagate.
const throwing = { getItem() { throw new Error('denied') }, setItem() { throw new Error('denied') }, removeItem() { throw new Error('denied') } }
assert.deepEqual(readRecents(throwing), [])
assert.doesNotThrow(() => writeRecents(throwing, ['overview']))
assert.doesNotThrow(() => clearRecents(throwing))

// Labels come from the real menu definitions, including sectioned groups.
const groups = [
  { label: '共同数据', items: [['overview', '总览', 'el-icon-s-data']] },
  { label: '路线与目的地', items: [['attractions', '景点管理', 'el-icon-school']] },
  { label: '小程序管理', items: [['miniprogramOrders', '订单管理']], sections: [{ index: 'sec', label: '用户与订单', items: [['miniprogramUsers', '小程序用户', 'el-icon-user']] }] },
]
assert.deepEqual(describeMenu(groups, 'attractions'), { label: '景点管理', group: '路线与目的地', icon: 'el-icon-school' })
assert.deepEqual(describeMenu(groups, 'miniprogramUsers'), { label: '小程序用户', group: '小程序管理', icon: 'el-icon-user' }, 'sections are searched too')
assert.equal(describeMenu(groups, 'nope'), null)
assert.equal(describeMenu(undefined, 'overview'), null)

console.log(`PASS: recents ordering/dedupe/cap, persistence, corrupt and hostile storage, throwing storage, removed-panel pruning, sectioned label lookup (limit ${RECENTS_LIMIT})`)
