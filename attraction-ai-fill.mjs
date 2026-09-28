const baseUrl = (process.env.SY_SENSENOVA_BASE_URL || 'https://token.sensenova.cn/v1').replace(/\/+$/, '')
const gatewayUrl = `${baseUrl}/chat/completions`
const model = process.env.SY_SENSENOVA_MODEL || 'deepseek-v4-flash'
const textLimit = 1600

const stringValue = (value, limit = textLimit) => typeof value === 'string' ? value.trim().slice(0, limit) : ''

function providerFailure(response, payload) {
  const providerError = payload?.error && typeof payload.error === 'object' ? payload.error : {}
  const retryHeader = response.headers?.get?.('retry-after') || ''
  const retryAfterSeconds = /^\d+$/.test(retryHeader) ? Number(retryHeader) : null
  const providerCode = stringValue(String(providerError.code ?? providerError.type ?? ''), 80).replace(/[^a-z\d_.-]/gi, '')
  const providerMessage = stringValue(providerError.message, 500).toLocaleLowerCase()
  const providerCategory = Number(response.status) === 429 || /rate.?limit|too many requests|quota/.test(providerMessage)
    ? 'rate_limited'
    : Number(response.status) === 401 ? 'authentication'
      : Number(response.status) === 402 ? 'insufficient_balance'
        : Number(response.status) === 403 ? 'forbidden'
          : Number(response.status) === 503 ? 'provider_unavailable'
            : Number(response.status) === 502 ? 'provider_error' : 'http_error'
  const message = response.status === 429
    ? 'SenseNova 请求频率已达限制（429），请稍后重试'
    : `AI 服务暂不可用（${response.status}），请稍后重试`
  const error = new Error(message)
  error.providerDetails = {
    provider: 'sensenova', model, status: Number(response.status) || 0, providerCategory,
    providerCode, retryAfterSeconds,
  }
  return error
}

function parseModelJson(content) {
  const text = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AI 返回内容格式无效，请稍后重试')
  try { return JSON.parse(text.slice(start, end + 1)) } catch { throw new Error('AI 返回内容暂时无法解析，请稍后重试') }
}

export function sanitizeAttractionDraft(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const type = ['landmark', 'museum'].includes(input.type) ? input.type : ''
  const highlights = Array.isArray(input.highlights) ? input.highlights.slice(0, 4).map((item) => ({
    name: stringValue(item?.name, 100),
    desc: stringValue(item?.desc, 500),
  })).filter((item) => item.name || item.desc) : []
  const exhibits = Array.isArray(input.exhibits) ? input.exhibits.slice(0, 6).map((item) => ({
    name: stringValue(item?.name, 100),
    author: stringValue(item?.author, 100),
    duration: stringValue(item?.duration, 50),
    description: stringValue(item?.description, 900),
    location: {
      floor: stringValue(item?.location?.floor, 100),
      hall: stringValue(item?.location?.hall, 100),
    },
  })).filter((item) => item.name) : []
  const guideInput = input.guide && typeof input.guide === 'object' && !Array.isArray(input.guide) ? input.guide : {}
  const guideKeys = ['hours', 'tickets', 'transport', 'worth', 'services', 'family', 'map', 'shop', 'accessibility', 'exhibitions', 'faq', 'notices', 'sourceTitle']
  const guide = Object.fromEntries(guideKeys.map((key) => [key, stringValue(guideInput[key], key === 'sourceTitle' ? 140 : 900)]))
  const articles = Array.isArray(input.articles) ? input.articles.slice(0, 3).map((item) => ({
    title: stringValue(item?.title, 140),
    date: stringValue(item?.date, 40),
    summary: stringValue(item?.summary, 1200),
  })).filter((item) => item.title || item.summary) : []
  const deepDiveInput = input.deepDive && typeof input.deepDive === 'object' && !Array.isArray(input.deepDive) ? input.deepDive : {}
  const deepDive = {
    preview: stringValue(deepDiveInput.preview, 1800),
    locked: Array.isArray(deepDiveInput.locked) ? deepDiveInput.locked.slice(0, 3).map((item) => stringValue(item, 1800)).filter(Boolean) : [],
  }
  return {
    name: stringValue(input.name, 120),
    en: stringValue(input.en, 120),
    originalName: stringValue(input.originalName, 120),
    cityName: stringValue(input.cityName, 100),
    type,
    category: stringValue(input.category, 100),
    sizeLabel: stringValue(input.sizeLabel, 100),
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => stringValue(tag, 40)).filter(Boolean).slice(0, 8).join(' · ') : stringValue(input.tags, 160),
    summary: stringValue(input.summary, 1200),
    highlights,
    exhibits,
    guide,
    articles,
    deepDive,
  }
}

export function sanitizeRouteDraft(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const days = Number(input.days)
  return {
    title: stringValue(input.title, 140),
    kicker: stringValue(input.kicker, 140),
    days: Number.isInteger(days) && days >= 1 && days <= 60 ? days : null,
    tags: Array.isArray(input.tags) ? input.tags.map((tag) => stringValue(tag, 40)).filter(Boolean).slice(0, 8).join(' · ') : stringValue(input.tags, 180),
    desc: stringValue(input.desc, 1600),
  }
}

export function sanitizeDestinationDraft(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    name: stringValue(input.name, 120),
    en: stringValue(input.en, 120),
    type: stringValue(input.type, 80),
  }
}

export function sanitizeAdminDraft(type, value) {
  if (type === 'attraction') return sanitizeAttractionDraft(value)
  if (type === 'route') return sanitizeRouteDraft(value)
  if (type === 'destination') return sanitizeDestinationDraft(value)
  throw new Error('不支持的智能填写类型')
}

function promptFor(type, name) {
  const quotedName = JSON.stringify(name)
  if (type === 'route') return `请为旅游网站后台撰写路线资料，路线名称为 ${quotedName}。只返回一个 JSON 对象，不要 Markdown、前言或代码块。
生成简体中文路线副标题、主题标签和介绍，表达清楚适合怎样的旅行体验。若名称明确包含天数可据此填写 days，否则依据名称无法确定时 days 填 null。不要捏造具体酒店、价格、交通班次、每日行程或已确认的可用服务。
严格使用结构：{"title":"","kicker":"","days":null,"tags":["主题标签"],"desc":"路线介绍"}。不要输出路线 ID、目的地 ID、参考行程 ID、图片或发布状态。`
  if (type === 'destination') return `请为旅游网站后台整理目的地资料，目的地名称为 ${quotedName}。只返回一个 JSON 对象，不要 Markdown、前言或代码块。
生成通用、规范的简体中文名称、英文名称及简短分类（如 island、city、region、archaeological-site、coastal-town）；无法确定的字段留空。不要编造宣传简介或具体旅行服务。
严格使用结构：{"name":"","en":"","type":""}。不要输出目的地 ID、城市 ID、景点关联、图片或发布状态。`
  return `请为景点管理后台整理 ${quotedName} 的简体中文资料，并只返回一个 JSON 对象，不要 Markdown、前言或代码块。
只填写可确定的景点通用资料；开放时间、票价、交通、无障碍、展览等可能变动的信息，如果不能确认就留空，不要猜测，不要编造来源或 URL。简要、可直接用于旅游内容管理。
严格使用以下结构；所有字段都要出现，数组最多 3 项：
{"name":"","en":"","originalName":"","cityName":"","type":"landmark 或 museum","category":"","sizeLabel":"","tags":"用 · 分隔","summary":"","highlights":[{"name":"","desc":""}],"exhibits":[{"name":"","author":"","duration":"","description":"讲解点简体介绍","location":{"floor":"","hall":""}}],"guide":{"hours":"","tickets":"","transport":"","worth":"","services":"","family":"","map":"","shop":"","accessibility":"","exhibitions":"","faq":"","notices":"","sourceTitle":""},"articles":[{"title":"","date":"","summary":""}],"deepDive":{"preview":"","locked":["章节内容"]}}
为讲解点生成简洁准确的介绍；文史文章生成标题和摘要；深度内容提供一段免费预览及最多 2 个有实质信息的章节。请尽量填写值得一看之处、亲子建议、游览路线提示、场馆服务、常见问题等相对稳定的内容；开放时间、票价、交通班次、无障碍设施、临时展览等可能变化的信息，如果不能确认就留空，不要猜测，不要编造来源或 URL。不要输出图片、ID、关联目的地或发布状态。简介与说明请用简体中文；类型仅能是 landmark 或 museum，否则留空。sourceTitle 只在确有把握时填写可信官方机构名称。`
}

const progressStages = {
  attraction: [
  ['"highlights"', '正在整理景点亮点…'],
  ['"exhibits"', '正在生成讲解点与讲解介绍…'],
  ['"guide"', '正在补充参观服务信息…'],
  ['"articles"', '正在整理景点文史文章…'],
  ['"deepDive"', '正在生成免费预览与深度章节…'],
  ],
  route: [['"kicker"', '正在撰写路线副标题…'], ['"days"', '正在核对路线时长…'], ['"desc"', '正在整理路线介绍与主题…']],
  destination: [['"en"', '正在整理目的地英文名称…'], ['"type"', '正在识别目的地分类…']],
}

function emitContentProgress(type, content, onProgress, emitted) {
  const next = progressStages[type].find(([key]) => !emitted.has(key) && content.includes(key))
  if (next) {
    emitted.add(next[0])
    onProgress(next[1])
  }
}

export async function requestAdminDraft({ type, name, apiKey, fetchImpl = fetch, onProgress = () => {} }) {
  if (!['attraction', 'route', 'destination'].includes(type)) throw new Error('不支持的智能填写类型')
  const attractionName = stringValue(name, 120)
  if (!attractionName) throw new Error(`请先填写${({ attraction: '景点', route: '路线', destination: '目的地' })[type]}名称`)
  if (!apiKey) throw new Error('本地 AI 服务尚未配置，请检查 Website 本地环境变量')
  let response
  onProgress('正在连接 SenseNova…')
  try {
    response = await fetchImpl(gatewayUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: promptFor(type, attractionName) }],
        temperature: 0.2,
        max_tokens: 6200,
        stream: true,
      }),
      signal: AbortSignal.timeout(60000),
    })
  } catch {
    throw new Error('连接 AI 服务失败，请检查网络后重试')
  }
  if (!response.ok) {
    let providerPayload = null
    try { providerPayload = await response.json() } catch { /* provider error bodies are optional */ }
    throw providerFailure(response, providerPayload)
  }
  if (!response.body?.getReader) throw new Error('AI 服务未提供实时内容流，请稍后重试')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let streamError = null
  const emitted = new Set()
  const entityLabel = ({ attraction: '景点', route: '路线', destination: '目的地' })[type]
  onProgress(`已连接，正在搜索并整理${entityLabel}资料…`)
  const consumeEvent = (eventText) => {
    const dataLines = eventText.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart())
    if (!dataLines.length) return
    const data = dataLines.join('\n')
    if (data === '[DONE]') return
    let event
    try { event = JSON.parse(data) } catch { return }
    if (event.error) {
      const providerError = event.error && typeof event.error === 'object' ? event.error : {}
      streamError = new Error('AI 服务暂不可用，请稍后重试')
      streamError.providerDetails = {
        provider: 'sensenova', model, status: Number(providerError.code) || 0,
        providerCategory: 'stream_error', providerCode: stringValue(String(providerError.code || ''), 80).replace(/[^a-z\d_.-]/gi, ''),
      }
      return
    }
    const delta = event.choices?.[0]?.delta
    const chunk = typeof delta?.content === 'string' ? delta.content : ''
    if (!chunk) return // Deliberately discard provider reasoning; UI receives only safe stage labels.
    content += chunk
    if (content.length === chunk.length) onProgress('已收到资料，正在生成结构化内容…')
    emitContentProgress(type, content, onProgress, emitted)
  }
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
      let boundary
      while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const eventText = buffer.slice(0, boundary)
        const separator = buffer.slice(boundary).match(/^\r?\n\r?\n/)[0]
        buffer = buffer.slice(boundary + separator.length)
        consumeEvent(eventText)
      }
      if (done) break
    }
    if (buffer.trim()) consumeEvent(buffer)
  } catch {
    throw new Error('接收 AI 实时内容失败，请稍后重试')
  }
  if (streamError) throw streamError
  onProgress('内容已生成，正在校验并整理表单…')
  const draft = sanitizeAdminDraft(type, parseModelJson(content))
  if (type === 'attraction' && !draft.name) draft.name = attractionName
  if (type === 'route' && !draft.title) draft.title = attractionName
  if (type === 'destination' && !draft.name) draft.name = attractionName
  return draft
}

export function requestAttractionDraft(options) { return requestAdminDraft({ ...options, type: 'attraction' }) }
