import assert from 'node:assert/strict'
import { requestAdminDraft, requestAttractionDraft, requestAudioTrackTranslation, sanitizeAttractionDraft, sanitizeAudioTrackTranslation, sanitizeDestinationDraft, sanitizeRouteDraft } from '../attraction-ai-fill.mjs'

const modelResult = {
  name: '雅典卫城', en: 'Acropolis of Athens', originalName: 'Ακρόπολη Αθηνών', cityName: '雅典', type: 'landmark',
  category: '古代城堡', sizeLabel: '山顶遗址', tags: ['古典文明', '考古'], summary: '位于雅典市中心的古代遗址。',
  highlights: [{ name: '帕特农神庙', desc: '卫城核心建筑。', image: 'should-not-pass.webp', id: 'should-not-pass' }],
  exhibits: [{ name: '帕特农神庙', author: '古典时期', duration: '约 8 分钟', location: { floor: '山顶', hall: '主殿' }, id: 'nope' }],
  guide: { hours: '请查询官网', tickets: '', id: 'nope', unknown: 'drop' },
  articles: [{ title: '卫城建筑与雅典城邦', date: '', summary: '介绍建筑与城邦历史。', cover: 'should-not-pass.webp' }],
  deepDive: { preview: '从卫城理解古典雅典。', locked: ['第一章：建筑与城邦。'], image: 'nope.webp' },
  id: 'never-accept-model-id', image: 'never-accept-model-image.webp', linkedDestinationIds: ['nope'], status: 'published',
}
let requestOptions
const progress = []
const encoder = new TextEncoder()
const streamFor = (value) => [
  ...JSON.stringify(value).match(/.{1,73}/gs).map((chunk) => `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`),
  'data: [DONE]\n\n',
]
const streamChunks = [
  'data: {"choices":[{"delta":{"reasoning":"private chain of thought"}}]}\n\n',
  ...streamFor(modelResult),
]
const result = await requestAttractionDraft({
  name: '雅典卫城', apiKey: 'test-token-never-log',
  onProgress: (message) => progress.push(message),
  fetchImpl: async (url, options) => {
    assert.equal(url, 'https://token.sensenova.cn/v1/chat/completions')
    requestOptions = options
    let index = 0
    return { ok: true, status: 200, body: { getReader: () => ({ read: async () => index < streamChunks.length ? { done: false, value: encoder.encode(streamChunks[index++]) } : { done: true } }) } }
  },
})
assert.equal(requestOptions.method, 'POST')
assert.equal(requestOptions.headers.Authorization, 'Bearer test-token-never-log')
const sent = JSON.parse(requestOptions.body)
assert.equal(sent.model, 'sensenova-6.8-flash-lite')
assert.equal(sent.stream, true)
assert.equal(result.name, modelResult.name)
assert.equal(result.tags, '古典文明 · 考古')
assert.deepEqual(result.highlights, [{ name: '帕特农神庙', desc: '卫城核心建筑。' }])
assert.deepEqual(result.exhibits[0], { name: '帕特农神庙', author: '古典时期', duration: '约 8 分钟', description: '', location: { floor: '山顶', hall: '主殿' } })
assert.deepEqual(result.articles, [{ title: '卫城建筑与雅典城邦', date: '', summary: '介绍建筑与城邦历史。' }])
assert.deepEqual(result.deepDive, { preview: '从卫城理解古典雅典。', locked: ['第一章：建筑与城邦。'] })
assert.match(progress.join(' '), /讲解点/)
assert.match(progress.join(' '), /深度章节/)
assert.equal(progress.join(' ').includes('private chain of thought'), false)
assert.deepEqual(Object.keys(result.guide).sort(), ['accessibility', 'exhibitions', 'family', 'faq', 'hours', 'map', 'notices', 'services', 'shop', 'sourceTitle', 'tickets', 'transport', 'worth'].sort())
for (const forbidden of ['id', 'image', 'linkedDestinationIds', 'status']) assert.equal(Object.hasOwn(result, forbidden), false)

const routeDraft = sanitizeRouteDraft({ title: '雅典古城漫步', kicker: '文明遗迹与街巷风情', days: '4', tags: ['历史', '步行'], desc: '路线介绍', image: 'no.webp', status: 'published', destinationIds: ['private-id'] })
assert.deepEqual(routeDraft, { title: '雅典古城漫步', kicker: '文明遗迹与街巷风情', days: 4, tags: '历史 · 步行', desc: '路线介绍' })
assert.equal(sanitizeRouteDraft({ days: 100 }).days, null)
assert.deepEqual(sanitizeDestinationDraft({ name: '圣托里尼', en: 'Santorini', type: 'island', id: 'private-id', image: 'no.webp', cityId: 'secret', status: 'published' }), { name: '圣托里尼', en: 'Santorini', type: 'island' })
for (const [type, expectedKeys, value] of [
  ['route', ['title', 'kicker', 'days', 'tags', 'desc'], { title: '雅典古城漫步', kicker: '遗迹与街巷', days: 3, tags: ['历史'], desc: '从雅典古迹开始。', image: 'no.webp', destinationIds: ['nope'] }],
  ['destination', ['name', 'en', 'type'], { name: '圣托里尼', en: 'Santorini', type: 'island', id: 'nope', image: 'no.webp', cityId: 'nope' }],
]) {
  const messages = []
  let body
  const draft = await requestAdminDraft({
    type, name: type === 'route' ? '雅典古城漫步' : '圣托里尼', apiKey: 'test-token', onProgress: (message) => messages.push(message),
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body)
      let index = 0
      const chunks = streamFor(value)
      return { ok: true, status: 200, body: { getReader: () => ({ read: async () => index < chunks.length ? { done: false, value: encoder.encode(chunks[index++]) } : { done: true } }) } }
    },
  })
  assert.deepEqual(Object.keys(draft).sort(), expectedKeys.sort())
  assert.equal(body.stream, true)
  assert.match(messages.join(' '), /正在连接 SenseNova/)
  assert.match(messages.join(' '), type === 'route' ? /路线资料/ : /目的地资料/)
}

assert.equal(sanitizeAttractionDraft({ type: 'unknown' }).type, '')
await assert.rejects(() => requestAttractionDraft({ name: '', apiKey: 'test-token-never-log' }), /请先填写景点名称/)
await assert.rejects(() => requestAttractionDraft({ name: '测试景点', apiKey: '' }), /本地 AI 服务尚未配置/)
await assert.rejects(() => requestAttractionDraft({ name: '测试景点', apiKey: 'test-token', fetchImpl: async () => ({ ok: false, status: 503 }) }), /503/)
let rateLimitError
try {
  await requestAttractionDraft({
    name: '隐私景点名称', apiKey: 'secret-test-token',
    fetchImpl: async () => ({
      ok: false, status: 429,
      headers: { get: (name) => name === 'retry-after' ? '37' : null },
      json: async () => ({ error: { code: 429, message: 'Rate limit exceeded for free models. Please try again later.' } }),
    }),
  })
} catch (error) { rateLimitError = error }
assert.match(rateLimitError.message, /SenseNova 请求频率已达限制/)
assert.deepEqual(rateLimitError.providerDetails, {
  provider: 'sensenova', model: 'sensenova-6.8-flash-lite', status: 429, providerCategory: 'rate_limited',
  providerCode: '429',
  retryAfterSeconds: 37,
})
assert.equal(JSON.stringify(rateLimitError.providerDetails).includes('隐私景点名称'), false)
assert.equal(JSON.stringify(rateLimitError.providerDetails).includes('secret-test-token'), false)
await assert.rejects(() => requestAttractionDraft({ name: '测试景点', apiKey: 'test-token', fetchImpl: async () => ({ ok: true, status: 200, body: { getReader: () => { let read = false; return { read: async () => read ? { done: true } : (read = true, { done: false, value: encoder.encode('data: {"choices":[{"delta":{"content":"not-json"}}]}\n\n') }) } } } }) }), /格式无效/)

let translationRequest
const translatedAudioText = { titleTw: '雅典衛城', titleEn: 'The Acropolis of Athens', descriptionTw: '雅典衛城的簡介。', descriptionEn: 'An introduction to the Acropolis of Athens.', id: 'must-not-pass' }
const audioTranslation = await requestAudioTrackTranslation({
  title: '雅典卫城', description: '雅典卫城的简介。', apiKey: 'test-translation-token',
  fetchImpl: async (url, options) => {
    assert.equal(url, 'https://token.sensenova.cn/v1/chat/completions')
    translationRequest = options
    return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify(translatedAudioText) } }] }) }
  },
})
assert.equal(translationRequest.method, 'POST')
assert.equal(translationRequest.headers.Authorization, 'Bearer test-translation-token')
const translationBody = JSON.parse(translationRequest.body)
assert.equal(translationBody.stream, false)
assert.match(translationBody.messages[0].content, /雅典卫城的简介/)
assert.deepEqual(audioTranslation, { titleTw: '雅典衛城', titleEn: 'The Acropolis of Athens', descriptionTw: '雅典衛城的簡介。', descriptionEn: 'An introduction to the Acropolis of Athens.' })
assert.deepEqual(sanitizeAudioTrackTranslation({ titleTw: '雅典衛城', titleEn: 'Acropolis', descriptionTw: 'ignored', descriptionEn: 'ignored' }, { title: '雅典卫城', description: '' }), { titleTw: '雅典衛城', titleEn: 'Acropolis', descriptionTw: '', descriptionEn: '' })
await assert.rejects(() => requestAudioTrackTranslation({ title: '', apiKey: 'test-token' }), /请先填写简体标题/)
await assert.rejects(() => requestAudioTrackTranslation({ title: '题'.repeat(201), apiKey: 'test-token' }), /200 字以内/)
await assert.rejects(() => requestAudioTrackTranslation({ title: '测试', description: '文'.repeat(1601), apiKey: 'test-token' }), /1600 字以内/)
await assert.rejects(() => requestAudioTrackTranslation({ title: '测试标题', description: '测试简介', apiKey: '', fetchImpl: async () => { throw new Error('must not call') } }), /本地 AI 服务尚未配置/)
await assert.rejects(() => requestAudioTrackTranslation({ title: '测试标题', apiKey: 'test-token', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: JSON.stringify({ titleTw: '', titleEn: '' }) } }] }) }) }), /未返回完整的繁体与英文标题/)
await assert.rejects(() => requestAudioTrackTranslation({ title: '测试标题', apiKey: 'test-token', fetchImpl: async () => ({ ok: false, status: 429, headers: { get: () => '30' }, json: async () => ({ error: { message: 'Rate limit exceeded' } }) }) }), /请求频率已达限制/)
console.log('Attraction AI fill and audio-track translation unit tests passed.')
