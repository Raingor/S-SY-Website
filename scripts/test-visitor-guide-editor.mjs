import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { attractionEditorFieldGroups, attractionFieldGroup, visitorGuideHtml, updateVisitorGuide } from '../src/admin-vue/visitor-guide-editor.mjs'
import { publicHeritage, sanitizeRichText } from '../heritage-content.mjs'

assert.deepEqual(attractionEditorFieldGroups.map(group => group.key), ['basic', 'visitor', 'highlights', 'exhibits', 'media'])
for (const key of ['visitorSections', 'articles', 'deepDive', 'sizeLabel', 'unknown']) assert.equal(attractionFieldGroup(key), 'hidden')
for (const key of ['onlineCoverImage', 'expertCoverImage', 'expertVideoUrl']) assert.equal(attractionFieldGroup(key), 'media')
assert.equal(attractionFieldGroup('highlights'), 'highlights')
assert.equal(attractionFieldGroup('exhibits'), 'exhibits')
assert.equal(attractionFieldGroup('linkedDestinationIds'), 'basic')

const original = {
  hours: '09:00–18:00；周一休息', transport: '地铁 2 号线；https://example.com/transport?a=1&b=2',
  mapImage: '/images/fixture-map.webp', mapUrl: 'https://example.com/map',
  sourceUrl: 'https://example.com/official', sourceTitle: '景点官网', sourceTitleTw: '景點官網', sourceTitleEn: 'Official site', verifiedAt: '2026-10-27',
  worth: '保留的历史游览建议', services: '历史场馆服务', family: '历史亲子说明',
  hoursTw: '繁體開放時間', hoursHtmlTw: '<p>繁體時段</p>', hoursEn: 'English hours',
}
const before = JSON.stringify(original)
assert.equal(visitorGuideHtml(original, 'hours'), '<p>09:00–18:00</p><p>周一休息</p>')
assert.match(visitorGuideHtml(original, 'transport'), /<a href="https:\/\/example.com\/transport\?a=1&amp;b=2">/)
assert.equal(visitorGuideHtml(original, 'hours', 'Tw'), original.hoursHtmlTw)
assert.equal(visitorGuideHtml(original, 'hours', 'En'), '<p>English hours</p>')
assert.equal(visitorGuideHtml({}, 'hours'), '')
assert.equal(JSON.stringify(original), before, 'opening/cancelling must not migrate stored fields')
assert.equal(visitorGuideHtml({ hours: '<img src=x onerror=evil()>' }, 'hours'), '<p>&lt;img src=x onerror=evil()&gt;</p>')

let guide = original
for (const [kind, title] of [['hours','开放时间'], ['tickets','门票信息'], ['transport','交通信息'], ['map','地图文字说明']]) {
  guide = updateVisitorGuide(guide, kind, '', `<h3>${title}</h3><p><strong>说明</strong></p><ul><li>第一项</li></ul><p><a href="https://example.com/${kind}">官方网站</a></p>`, `${title}\n说明\n第一项\n官方网站`)
}
assert.equal(original.hoursHtml, undefined, 'updates are immutable')
for (const key of Object.keys(original).filter(key => !['hours','transport'].includes(key))) assert.equal(guide[key], original[key], `hidden/translated field preserved: ${key}`)
const record = { id: 'fixture-spot', name: '测试景点', status: 'published', guide }
const details = publicHeritage({ attractions: [record] }).attractionDetails[record.id]
assert.deepEqual(details.hiddenSections, ['route', 'expert'], 'editing does not expose touring guides')
assert.deepEqual(details.visitorInfoSections.map(section => section.kind), ['hours', 'tickets', 'transport', 'map'])
for (const section of details.visitorInfoSections) {
  assert.ok(section.bodyHtml.includes('<h3>') && section.bodyHtml.includes('<strong>') && section.bodyHtml.includes('<ul>'), 'layout survives public contract')
  const nodes = JSON.stringify(section.nodes)
  assert.ok(nodes.includes(`https://example.com/${section.kind}`), 'copyable official link survives in nodes')
}
assert.equal(details.visitorInfoSections[0].bodyHtmlTw, '<p>繁體時段</p>')
const map = details.visitorInfoSections[3]
assert.equal(map.map.image, original.mapImage)
assert.equal(map.map.description, guide.mapHtml)
assert.equal(map.sourceUrl, original.sourceUrl)
assert.equal(map.map.url, original.mapUrl)
const cleared = updateVisitorGuide(guide, 'hours', '', '', '')
assert.equal(visitorGuideHtml(cleared, 'hours'), '')
assert.equal(publicHeritage({ attractions: [{ ...record, guide: cleared }] }).attractionDetails[record.id].visitorInfoSections[0].bodyHtml, '', 'cleared rich text must not resurrect legacy text')
assert.equal(cleared.hoursHtmlTw, original.hoursHtmlTw, 'clearing one language preserves other languages')
const unsafe = sanitizeRichText('<p onclick="evil()"><a href="javascript:evil()">bad</a><a href="https://example.com/safe" onclick="evil()">safe</a></p>')
assert.ok(!/onclick|javascript:/i.test(unsafe.html))
assert.ok(unsafe.html.includes('href="https://example.com/safe"'))

const fixtureIndex = process.argv.indexOf('--fixture')
if (fixtureIndex !== -1) {
  const payload = JSON.stringify({ schemaVersion: 1, synthetic: true, source: 'publicHeritage', attractionDetails: { [record.id]: details } }, null, 2) + '\n'
  writeFileSync(process.argv[fixtureIndex + 1], payload)
  console.log(`Synthetic fixture SHA256: ${createHash('sha256').update(payload).digest('hex')}`)
}
console.log('PASS: compact admin allowlist, legacy display without mutation, rich layout + HTTPS nodes, map image/text, language/hidden-data preservation, explicit clear and unchanged visibility')
