import crypto from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const categories = new Set(['route', 'online', 'expert', 'heritage'])
const unlockModes = new Set(['free', 'attraction', 'membership', 'locked'])
const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)))
const privateDir = resolve(process.env.SY_AUDIO_PRIVATE_DIR || resolve(projectRoot, 'private-audio'))
for (const publiclyServed of ['public', 'dist']) {
  const exposed = resolve(projectRoot, publiclyServed)
  if (privateDir === exposed || privateDir.startsWith(`${exposed}/`)) throw new Error('私有音频目录不能位于 public 或 dist 下')
}
const integer = (value, fallback = 0) => Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : fallback
const sortByOrder = (a, b) => integer(a.sort) - integer(b.sort) || String(a.id || '').localeCompare(String(b.id || ''))
const text = (value, length = 1000) => String(value ?? '').trim().slice(0, length)
const publicImage = (value) => {
  const image = text(value, 500)
  if (!image || /^(?:https?:)?\/\//i.test(image) || image.startsWith('/')) return image
  return `./images/${image.replace(/^(?:\.\/|\/)?(?:images\/)+/, '')}`
}
const existingFile = (name) => /^[a-f0-9]{32}\.(?:m4a|mp3)$/.test(String(name || '')) && existsSync(resolve(privateDir, name))
const previewName = (name) => name?.replace(/\.(?:m4a|mp3)$/, '-preview.m4a')
const previewExists = (name) => /^[a-f0-9]{32}-preview\.m4a$/.test(String(name || '')) && existsSync(resolve(privateDir, name))
const isPublished = (item) => item?.status === 'published'
const safeText = (item, keys) => Object.fromEntries(keys.map((key) => [key, text(item?.[key])]))
const richTags = new Set(['p', 'div', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'h2', 'h3', 'a', 'img'])
const voidTags = new Set(['br', 'img'])
const escapeHtml = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]))
function decodeEntities(value) {
  return String(value).replace(/&(#(?:x[0-9a-f]+|[0-9]+)|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    if (entity[0] !== '#') return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[entity.toLowerCase()] || match
    const number = entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)
    try { return Number.isFinite(number) && number >= 0 && number <= 0x10ffff ? String.fromCodePoint(number) : '\uFFFD' } catch { return '\uFFFD' }
  })
}
function safeMapImage(value) {
  const raw = text(value, 1000).trim()
  const url = safeUrl(raw, true)
  if (!url) return ''
  return publicImage(url)
}
function safeUrl(value, image = false) {
  const raw = decodeEntities(text(value, 2000)).trim()
  if (!raw || /[\\\\\u0000-\u001f]/.test(raw) || raw.startsWith('//')) return ''
  if (/^https:\/\//i.test(raw)) {
    try { const url = new URL(raw); return url.protocol === 'https:' && !url.username && !url.password ? raw : '' } catch { return '' }
  }
  if (image) {
    let decoded = raw
    try { decoded = decodeURIComponent(raw) } catch { return '' }
    return /^\/?(?:\.\/)?images\/[a-zA-Z0-9_./%-]+$/.test(raw) && !decoded.split('/').includes('..') ? raw : ''
  }
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(raw)) return raw
  return raw.startsWith('/') && !raw.startsWith('//') && !raw.split('/').includes('..') ? raw : ''
}
export function sanitizeRichText(value) {
  const source = String(value ?? '').slice(0, 200_000)
  const root = { name: '', attrs: {}, children: [] }; const stack = [root]
  const tokens = source.match(/<[^>]*>|[^<]+|</g) || []
  for (const token of tokens) {
    if (!token.startsWith('<') || token === '<') { stack.at(-1).children.push({ type: 'text', text: decodeEntities(token) }); continue }
    const closing = token.match(/^<\/\s*([a-zA-Z0-9]+)[^>]*>$/)
    if (closing) {
      const name = closing[1].toLowerCase()
      for (let i = stack.length - 1; i > 0; i -= 1) if (stack[i].name === name) { stack.length = i; break }
      continue
    }
    const opening = token.match(/^<\s*([a-zA-Z0-9]+)\b([^>]*)>$/)
    if (!opening) { stack.at(-1).children.push({ type: 'text', text: token }); continue }
    const name = opening[1].toLowerCase()
    if (!richTags.has(name)) continue
    const attrs = {}; const rawAttrs = opening[2]
    if (name === 'a') {
      const match = rawAttrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)
      const href = safeUrl(match?.[1] ?? match?.[2] ?? match?.[3] ?? '')
      if (href) attrs.href = href
    }
    if (name === 'img') {
      const srcMatch = rawAttrs.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)
      const src = safeUrl(srcMatch?.[1] ?? srcMatch?.[2] ?? srcMatch?.[3] ?? '', true)
      if (!src) continue
      attrs.src = src
      const altMatch = rawAttrs.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i)
      attrs.alt = decodeEntities(text(altMatch?.[1] ?? altMatch?.[2] ?? altMatch?.[3] ?? '', 300))
    }
    const node = { type: 'element', name, attrs, children: [] }
    stack.at(-1).children.push(node)
    if (!voidTags.has(name) && !/\/\s*>$/.test(token)) stack.push(node)
  }
  const serialize = (node) => node.type === 'text' ? escapeHtml(node.text) : `<${node.name}${Object.entries(node.attrs).map(([key, value]) => ` ${key}="${escapeHtml(value)}"`).join('')}${voidTags.has(node.name) ? '/>' : `>${node.children.map(serialize).join('')}</${node.name}>`}`
  return { html: root.children.map(serialize).join(''), nodes: root.children }
}
const legacyHtml = (value) => sanitizeRichText(`<p>${escapeHtml(value || '')}</p>`)
function visitorRichText(guide, kind, legacy) {
  const stem = `${kind}Html`
  return ['','Tw','En'].map((suffix, index) => {
    const localized = guide?.[`${stem}${suffix}`]
    const fallback = guide?.[`${kind}${suffix}`] || (suffix ? '' : legacy)
    return sanitizeRichText(localized || fallback)
  })
}
export function normalizeVisitorSections(sections) {
  if (!Array.isArray(sections)) return []
  const seen = new Set()
  return sections.slice(0, 100).map((section, index) => {
    const sectionId = text(section?.id, 120) || `visitor-section-${index + 1}`
    if (seen.has(sectionId)) throw new Error('参观自定义板块 ID 不可重复')
    seen.add(sectionId)
    const rich = {}
    for (const field of ['bodyHtml', 'bodyHtmlTw', 'bodyHtmlEn']) rich[field] = sanitizeRichText(section?.[field]).html
    return { id: sectionId, kind: 'custom', title: text(section?.title, 200), titleTw: text(section?.titleTw, 200), titleEn: text(section?.titleEn, 200), ...rich, sort: integer(section?.sort, index + 1), status: section?.status === 'published' ? 'published' : 'unpublished' }
  })
}

export function validateAttraction(input, data) {
  const exhibits = Array.isArray(input.exhibits) ? input.exhibits : []
  const ids = new Set()
  for (const exhibit of exhibits) {
    const key = text(exhibit.id, 120)
    if (key && ids.has(key)) return '同一景点的讲解点 ID 不可重复'
    if (key) ids.add(key)
  }
  if (Array.isArray(input.highlights)) for (const highlight of input.highlights) {
    if (highlight.exhibitId && !ids.has(text(highlight.exhibitId, 120))) return '亮点关联的讲解点必须属于该景点'
  }
  try {
    const sections = normalizeVisitorSections(input.visitorSections)
    if (sections.some((section) => section.status === 'published' && !section.title)) return '已发布自定义参观板块必须填写简体标题'
  } catch (error) { return error.message || '自定义参观板块无效' }
  if (input.guide?.mapUrl && !/^https:\/\//i.test(input.guide.mapUrl)) return '地图链接必须以 https:// 开头'
  if (input.guide?.sourceUrl && !/^https:\/\//i.test(input.guide.sourceUrl)) return '来源链接必须以 https:// 开头'
  if (input.guide?.verifiedAt && !/^\d{4}-\d{2}-\d{2}$/.test(input.guide.verifiedAt)) return '核对日期应为 YYYY-MM-DD'
  if (input.guide?.mapImage && !/^(?:images\/|\/images\/|\.\/images\/|https:\/\/)/i.test(input.guide.mapImage)) return '地图图片须使用已上传图片或 HTTPS 链接'
  return ''
}

export function validateHeritageRecord(kind, input, data, current = {}) {
  const value = { ...current, ...input }
  if (!text(value.title, 200)) return '请填写标题'
  if (!['published', 'unpublished'].includes(value.status)) return '请选择发布状态'
  if (kind === 'audioAlbums') return ''
  if (kind === 'audioRoutes') {
    const attraction = (data.attractions || []).find((item) => item.id === value.attractionId)
    if (!attraction) return '请选择有效景点'
    if (!Array.isArray(value.pointIds)) return '请设置路线点位顺序'
    const ids = new Set((attraction.exhibits || []).map((item) => item.id))
    if (value.pointIds.some((item) => !ids.has(item)) || new Set(value.pointIds).size !== value.pointIds.length) return '路线点位须属于该景点且不可重复'
    return ''
  }
  if (!categories.has(value.category)) return '请选择音频类别'
  if (!unlockModes.has(value.unlockMode)) return '请选择音频权限'
  if (value.category === 'heritage') {
    if (!(data.audioAlbums || []).some((item) => item.id === value.albumId)) return '请选择已存在的文史专辑'
    if (value.attractionId || value.exhibitId || value.routeId) return '文史节目不应关联景点导览'
  } else {
    const attraction = (data.attractions || []).find((item) => item.id === value.attractionId)
    if (!attraction) return '请选择有效景点'
    if (value.exhibitId && !(attraction.exhibits || []).some((item) => item.id === value.exhibitId && (item.status == null || item.status === 'published'))) return '音频点位必须属于当前景点且已发布'
    if (value.category === 'route' && !(data.audioRoutes || []).some((item) => item.id === value.routeId && item.attractionId === value.attractionId)) return '路线音频须关联同一景点的路线'
    if (value.category !== 'route' && value.routeId) return '非路线音频不应关联路线'
    if (value.unlockMode === 'attraction' && !value.attractionId) return '单景点权限须设置景点'
  }
  if (value.category === 'heritage' && value.unlockMode === 'attraction') return '文史节目不能使用单景点权益'
  if (!Number.isInteger(Number(value.previewSeconds)) || Number(value.previewSeconds) < 1 || Number(value.previewSeconds) > 60) return '试听时长须为 1 至 60 秒'
  if (value.status === 'published' && (!existingFile(value.audioFile) || !previewExists(value.previewFile))) return '发布前须上传可播放且已生成试听片段的音频'
  if (value.audioFile && !existingFile(value.audioFile)) return '音频文件不存在或不是私有上传文件'
  return ''
}

export function publicHeritage(data, countryId = 'greece') {
  const attractions = (data.attractions || []).filter((item) => isPublished(item) && (item.countryId || 'greece') === countryId)
  const attractionIds = new Set(attractions.map((item) => item.id))
  const routes = (data.audioRoutes || []).filter((item) => isPublished(item) && attractionIds.has(item.attractionId)).sort(sortByOrder)
  const routeIds = new Set(routes.map((item) => item.id))
  const albums = (data.audioAlbums || []).filter((item) => isPublished(item) && (item.countryId || 'greece') === countryId).sort(sortByOrder)
  const albumIds = new Set(albums.map((item) => item.id))
  const tracks = (data.audioTracks || []).filter((item) => isPublished(item) && existingFile(item.audioFile) && previewExists(item.previewFile) && (item.category === 'heritage' ? albumIds.has(item.albumId) : attractionIds.has(item.attractionId) && (item.category !== 'route' || routeIds.has(item.routeId)) && (!item.exhibitId || (attractions.find((attraction) => attraction.id === item.attractionId)?.exhibits || []).some((exhibit) => exhibit.id === item.exhibitId && (exhibit.status == null || exhibit.status === 'published'))))).sort(sortByOrder)
  const trackItem = (item) => ({ id: item.id, category: item.category, title: text(item.title), titleTw: text(item.titleTw), titleEn: text(item.titleEn), description: text(item.description), descriptionTw: text(item.descriptionTw), descriptionEn: text(item.descriptionEn), cover: publicImage(item.cover), language: text(item.language) || 'zh-CN', attractionId: item.attractionId || null, exhibitId: item.exhibitId || null, routeId: item.routeId || null, albumId: item.albumId || null, durationSeconds: integer(item.durationSeconds), previewSeconds: Math.min(60, Math.max(1, integer(item.previewSeconds, 60))), unlockMode: item.unlockMode, sort: integer(item.sort), previewUrl: `/api/miniprogram/audio/${encodeURIComponent(item.id)}/preview`, accessUrl: `/api/miniprogram/audio/${encodeURIComponent(item.id)}/access`, fullUrl: null })
  return {
    attractionDetails: Object.fromEntries(attractions.map((item) => {
      const exhibits = (item.exhibits || []).filter((entry) => entry.status == null || entry.status === 'published').map((entry, index) => ({ ...safeText(entry, ['id', 'name', 'nameTw', 'nameEn', 'description', 'descriptionTw', 'descriptionEn', 'author', 'duration']), location: entry.location || '', image: publicImage(entry.image), sort: integer(entry.sort, index + 1), routeOrder: integer(entry.routeOrder), status: 'published' })).sort(sortByOrder)
      const exhibitIds = new Set(exhibits.map((entry) => entry.id))
      const highlights = (item.highlights || []).map((entry, index) => ({ id: text(entry.id) || `${item.id}-highlight-${index + 1}`, ...safeText(entry, ['name', 'nameTw', 'nameEn', 'desc', 'descTw', 'descEn']), image: publicImage(entry.image), sort: integer(entry.sort, index + 1), exhibitId: exhibitIds.has(entry.exhibitId) ? entry.exhibitId : null })).sort(sortByOrder)
      const guide = item.guide || {}
      const visitorInfo = { ...safeText(guide, ['hours', 'hoursTw', 'hoursEn', 'tickets', 'ticketsTw', 'ticketsEn', 'transport', 'transportTw', 'transportEn', 'map', 'mapTw', 'mapEn', 'notices', 'noticesTw', 'noticesEn', 'sourceTitle', 'sourceTitleTw', 'sourceTitleEn', 'verifiedAt']), mapUrl: safeUrl(guide.mapUrl), sourceUrl: safeUrl(guide.sourceUrl), mapImage: safeMapImage(guide.mapImage) }
      const sectionDefinitions = [
        { id: 'hours', kind: 'hours', title: '开放时间', titleTw: '開放時間', titleEn: 'Opening hours' },
        { id: 'tickets', kind: 'tickets', title: '门票信息', titleTw: '門票資訊', titleEn: 'Tickets' },
        { id: 'transport', kind: 'transport', title: '交通信息', titleTw: '交通資訊', titleEn: 'Transport' },
        { id: 'map', kind: 'map', title: '景点地图', titleTw: '景點地圖', titleEn: 'Map' },
      ]
      const visitorInfoSections = sectionDefinitions.map((section, index) => {
        const values = visitorRichText(guide, section.kind, guide[section.kind] || '')
        const map = section.kind === 'map' ? { image: safeMapImage(guide.mapImage), url: safeUrl(guide.mapUrl), description: values[0].html, descriptionTw: values[1].html, descriptionEn: values[2].html } : null
        return { ...section, nodes: values[0].nodes, nodesTw: values[1].nodes, nodesEn: values[2].nodes, bodyHtml: values[0].html, bodyHtmlTw: values[1].html, bodyHtmlEn: values[2].html, sort: index + 1, status: 'published', ...(map ? { map } : {}), sourceUrl: section.kind === 'map' ? safeUrl(guide.sourceUrl) : '', sourceTitle: section.kind === 'map' ? text(guide.sourceTitle) : '', sourceTitleTw: section.kind === 'map' ? text(guide.sourceTitleTw) : '', sourceTitleEn: section.kind === 'map' ? text(guide.sourceTitleEn) : '', verifiedAt: section.kind === 'map' ? text(guide.verifiedAt) : '' }
      })
      const customSections = normalizeVisitorSections(item.visitorSections).filter((section) => section.status === 'published').sort(sortByOrder).map((section) => {
        const body = sanitizeRichText(section.bodyHtml); const bodyTw = sanitizeRichText(section.bodyHtmlTw); const bodyEn = sanitizeRichText(section.bodyHtmlEn)
        return { ...section, nodes: body.nodes, nodesTw: bodyTw.nodes, nodesEn: bodyEn.nodes }
      })
      const attractionRoutes = routes.filter((route) => route.attractionId === item.id).map((route) => ({ id: route.id, title: text(route.title), titleTw: text(route.titleTw), titleEn: text(route.titleEn), description: text(route.description), sort: integer(route.sort), pointIds: route.pointIds.filter((id) => exhibitIds.has(id)) }))
      return [item.id, { nameTw: text(item.nameTw), summaryTw: text(item.summaryTw), summaryEn: text(item.summaryEn), visitorInfo, visitorInfoSections, customSections, highlights, exhibits, routes: attractionRoutes, audioGuides: tracks.filter((track) => track.category !== 'heritage' && track.attractionId === item.id).map(trackItem) }]
    })),
    audioAlbums: albums.map((album) => ({ id: album.id, ...safeText(album, ['title', 'titleTw', 'titleEn', 'description', 'descriptionTw', 'descriptionEn']), cover: publicImage(album.cover), sort: integer(album.sort), episodes: tracks.filter((item) => item.category === 'heritage' && item.albumId === album.id).map(trackItem) })).filter((album) => album.episodes.length),
    playableTracks: tracks,
  }
}

export function visibleTrack(data, id) {
  const publicData = publicHeritage(data)
  return publicData.playableTracks.find((item) => item.id === id) || null
}

export function audioEntitled(track, entitlements) {
  if (track.unlockMode === 'free') return true
  if (track.unlockMode === 'membership') return entitlements?.member === true
  if (track.unlockMode === 'attraction') return Boolean(entitlements?.purchases?.some((order) => order.status === 'paid' && order.productType === 'attraction' && order.attractionId === track.attractionId))
  return false
}

export function signedAudioToken(trackId, identityKey, secret, ttlSeconds = 300) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
  const payload = Buffer.from(JSON.stringify({ id: trackId, sub: identityKey, exp: expiresAt })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}
export function verifySignedAudioToken(token, secret, trackId) {
  if (!token || !secret) return null
  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) return null
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url')
  if (Buffer.byteLength(expected) !== Buffer.byteLength(signature) || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null
  try { const value = JSON.parse(Buffer.from(payload, 'base64url')); return value.id === trackId && value.exp > Date.now() / 1000 && typeof value.sub === 'string' ? value.sub : null } catch { return null }
}

export function uploadPrivateAudio(input) {
  const name = text(input.name, 160)
  const extension = extname(name).toLowerCase()
  const declaredMime = text(input.type, 80).toLowerCase()
  if (!['.mp3', '.m4a'].includes(extension) || !['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'].includes(declaredMime)) throw new Error('仅支持 MP3 或 M4A 音频')
  if (typeof input.data !== 'string' || !/^data:audio\/[\w-]+;base64,[A-Za-z0-9+/=]+$/.test(input.data)) throw new Error('音频文件格式无效')
  const buffer = Buffer.from(input.data.slice(input.data.indexOf(',') + 1), 'base64')
  if (!buffer.length || buffer.length > 30 * 1024 * 1024) throw new Error('音频须小于 30MB 且不可为空')
  const requestedSeconds = input.previewSeconds == null ? 60 : Number(input.previewSeconds)
  if (!Number.isInteger(requestedSeconds) || requestedSeconds < 1 || requestedSeconds > 60) throw new Error('试听时长须为 1 至 60 秒')
  mkdirSync(privateDir, { recursive: true, mode: 0o700 })
  const basename = crypto.randomBytes(16).toString('hex')
  const audioFile = `${basename}${extension}`
  const previewFile = previewName(audioFile)
  const path = resolve(privateDir, audioFile)
  const previewPath = resolve(privateDir, previewFile)
  try {
    writeFileSync(path, buffer, { mode: 0o600, flag: 'wx' })
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path], { encoding: 'utf8', timeout: 15000 })
    const durationSeconds = Math.ceil(Number(probe.stdout?.trim()))
    if (probe.status !== 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('音频无法解码或时长无效')
    // AAC encoders add padding; leave headroom so the actual preview never exceeds 60s.
    const seconds = Math.min(requestedSeconds === 1 ? 1 : requestedSeconds - 1, 59, durationSeconds)
    const result = spawnSync('ffmpeg', ['-v', 'error', '-nostdin', '-i', path, '-t', String(seconds), '-vn', '-c:a', 'aac', '-b:a', '96k', '-y', previewPath], { encoding: 'utf8', timeout: 45000 })
    if (result.status !== 0 || !existsSync(previewPath) || !statSync(previewPath).size) throw new Error('试听音频生成失败')
    return { audioFile, previewFile, durationSeconds, previewSeconds: seconds }
  } catch (error) { rmSync(path, { force: true }); rmSync(previewPath, { force: true }); throw error }
}

export function streamPrivateAudio(req, res, file, cors = {}) {
  const name = req.url?.includes('/preview') ? file.previewFile : file.audioFile
  if (name !== file.previewFile && name !== file.audioFile) return false
  if (!(name === file.previewFile ? previewExists(name) : existingFile(name))) return false
  const path = resolve(privateDir, name)
  const size = statSync(path).size
  const range = /^bytes=(\d*)-(\d*)$/i.exec(String(req.headers.range || '').trim())
  if (req.headers.range && (!range || (!range[1] && !range[2]))) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true }
  const start = !range ? 0 : range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
  if (range && !range[1] && Number(range[2]) <= 0) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true }
  const end = !range || !range[1] || !range[2] ? size - 1 : Number(range[2])
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return true }
  res.writeHead(range ? 206 : 200, { ...cors, 'Content-Type': name.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4', 'Content-Length': end - start + 1, 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, no-store', ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) })
  if (req.method === 'HEAD') res.end()
  else createReadStream(path, { start, end }).pipe(res)
  return true
}
