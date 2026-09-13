import http from 'node:http'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const root = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(root, 'dist')
const dataPath = resolve(root, 'data/site-data.json')
const port = Number(process.env.PORT || 4173)
const adminPassword = process.env.SY_ADMIN_PASSWORD || 'sy-greece-admin'
const tokens = new Set()
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' }

function readData() { return JSON.parse(readFileSync(dataPath, 'utf8')) }
function saveData(data) { writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`) }
function json(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
function text(res, status, body, contentType) { res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' }); res.end(body) }
function isAdmin(req) { const auth = req.headers.authorization || ''; return auth.startsWith('Bearer ') && tokens.has(auth.slice(7)) }
function id(prefix = 'item') { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}` }
async function body(req) {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > 1024 * 1024) throw new Error('payload too large') }
  return raw ? JSON.parse(raw) : {}
}
function publicContent(data) {
  return {
    settings: data.settings,
    routes: data.routes.filter((item) => item.status !== 'archived').map((item) => ({ ...item, image: `./images/${item.image}` })),
    destinations: data.destinations.filter((item) => item.status !== 'archived').map((item) => ({ ...item, image: `./images/${item.image}` })),
  }
}
function xml(value) { return String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char])) }
function siteBase(data, req) { return String(data.settings.siteUrl || `http://${req.headers.host || '127.0.0.1:4173'}`).replace(/\/$/, '') }
function sitemap(data, req) {
  const base = siteBase(data, req)
  const paths = [
    '/', '/customize', '/search', '/tools',
    ...data.routes.filter((item) => item.status !== 'archived').map((item) => `/routes/${item.id}`),
    ...data.destinations.filter((item) => item.status !== 'archived').map((item) => `/destinations/${item.id}`),
  ]
  const lastmod = new Date().toISOString().slice(0, 10)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${xml(`${base}${path}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${path === '/' ? '1.0' : '0.8'}</priority></url>`).join('')}</urlset>`
}
function llms(data, req) {
  const base = siteBase(data, req)
  const lines = [`# ${data.settings.siteName}`, '', `> ${data.settings.defaultDescription || ''}`, '', '## 官方入口', `- 网站：${base}/`, `- 定制：${base}/customize`, `- 路线：${base}/routes/honeymoon-5d`, `- 圣托里尼：${base}/destinations/santorini`, `- 旅行工具：${base}/tools`, '', '## 服务范围', '- 雅典、圣托里尼及希腊全境私人定制旅行', '- 中文定制师、中文司导、机场接送、城际用车、海岛跳岛', '- 蜜月、亲子、文化、美酒美食与游艇出海等主题', '', '## 内容索引']
  data.routes.filter((item) => item.status !== 'archived').forEach((item) => lines.push(`- ${item.title}：${item.desc}`))
  lines.push('', '## 联系方式', `- 微信：${data.settings.wechat}`, `- 电话：${data.settings.phone}`, `- 邮箱：${data.settings.email}`, '')
  return lines.join('\n')
}
function htmlAttr(value) { return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])) }
function pageSeo(data, pathname, search, req) {
  const config = { siteName: 'SY 希腊蔚蓝海岸', siteUrl: siteBase(data, req), defaultTitle: 'SY 希腊蔚蓝海岸｜希腊私人定制旅行', defaultDescription: 'SY 希腊蔚蓝海岸，为中文游客提供雅典、圣托里尼及希腊全境的中高端私人定制旅行、中文司导与在地管家服务。', robotsPolicy: 'index,follow', ...data.settings }
  const query = new URLSearchParams(search || '').get('q')
  const pages = {
    '/': ['希腊私人定制旅行｜雅典 · 圣托里尼 · 全境地接', config.defaultDescription],
    '/routes/honeymoon': ['爱琴海蜜月之旅｜5天4晚希腊定制路线', '雅典 + 圣托里尼 5 天 4 晚蜜月路线，中文司导、悬崖酒店、双体船出海与伊亚日落旅拍。'],
    '/customize': ['希腊私人定制｜免费获取专属行程方案', '告诉我们出行时间、人数与预算，24 小时内获得希腊私人定制旅行首版方案。'],
    '/destinations/santorini': ['圣托里尼旅行指南｜蓝顶教堂与爱琴海日落', '圣托里尼悬崖酒店、伊亚日落、火山温泉与双体船巡航的深度旅行指南。'],
    '/search': [`搜索${query ? `“${query}”` : '希腊旅行'}｜SY Greece`, '搜索希腊路线、目的地和私人定制旅行灵感。'],
    '/tools': ['希腊旅行工具箱｜签证 · 汇率 · 天气 · 行程日历', '出发前准备希腊申根签证、欧元汇率、天气和每日行程的实用工具箱。'],
    '/manage-9f3k7': ['网站管理后台｜SY 希腊蔚蓝海岸', 'SY 希腊蔚蓝海岸网站内容与 SEO 管理后台'],
  }
  const [title, description] = pages[pathname] || [config.defaultTitle, config.defaultDescription]
  const isAdmin = pathname === '/manage-9f3k7'
  return { title: title.includes('SY') ? title : `${title} | ${config.siteName}`, description, canonical: `${config.siteUrl.replace(/\/$/, '')}${pathname === '/' ? '/' : pathname}`, robots: isAdmin ? 'noindex,nofollow' : config.robotsPolicy }
}
function injectSeoHtml(html, seo) {
  const title = htmlAttr(seo.title); const description = htmlAttr(seo.description); const canonical = htmlAttr(seo.canonical); const robots = htmlAttr(seo.robots)
  return html.toString().replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`).replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`).replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`).replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`).replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`).replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
}
function collectionHandler(data, collection, method, pathname, payload) {
  const items = data[collection]
  const itemId = pathname.split('/').pop()
  if (method === 'GET') return { status: 200, body: items }
  if (method === 'POST') { const next = { ...payload, id: payload.id || id(collection.slice(0, -1)) }; items.push(next); saveData(data); return { status: 201, body: next } }
  const index = items.findIndex((item) => item.id === itemId)
  if (index < 0) return { status: 404, body: { error: 'not found' } }
  if (method === 'PATCH') { items[index] = { ...items[index], ...payload, id: itemId }; saveData(data); return { status: 200, body: items[index] } }
  if (method === 'DELETE') { items.splice(index, 1); saveData(data); return { status: 204, body: null } }
  return { status: 405, body: { error: 'method not allowed' } }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'sy-greece-admin', time: new Date().toISOString() })
    if (url.pathname === '/robots.txt' && method === 'GET') { const data = readData(); const base = siteBase(data, req); return text(res, 200, `User-agent: *\nAllow: /\nDisallow: /manage-9f3k7\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`, 'text/plain; charset=utf-8') }
    if (url.pathname === '/sitemap.xml' && method === 'GET') return text(res, 200, sitemap(readData(), req), 'application/xml; charset=utf-8')
    if (url.pathname === '/llms.txt' && method === 'GET') return text(res, 200, llms(readData(), req), 'text/plain; charset=utf-8')
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      const input = await body(req)
      if (input.password !== adminPassword) return json(res, 401, { error: '密码不正确' })
      const token = crypto.randomBytes(24).toString('hex'); tokens.add(token)
      return json(res, 200, { token, user: { name: 'SY Admin', role: 'editor' } })
    }
    if (url.pathname === '/api/content' && method === 'GET') return json(res, 200, publicContent(readData()))
    if (url.pathname === '/api/leads' && method === 'POST') {
      const input = await body(req)
      if (!input.destination || !input.contact) return json(res, 422, { error: '请填写目的地和联系方式' })
      const data = readData()
      const lead = { ...input, id: input.id || id('lead'), status: 'new', createdAt: input.createdAt || new Date().toISOString() }
      data.leads.unshift(lead); saveData(data)
      return json(res, 201, lead)
    }
    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return json(res, 401, { error: '未授权，请先登录后台' })
      const data = readData()
      if (url.pathname === '/api/admin/stats' && method === 'GET') return json(res, 200, { routes: data.routes.filter((x) => x.status !== 'archived').length, destinations: data.destinations.filter((x) => x.status !== 'archived').length, leads: data.leads.length, pendingLeads: data.leads.filter((x) => x.status === 'new').length })
      if (url.pathname === '/api/admin/settings' && method === 'GET') return json(res, 200, data.settings)
      if (url.pathname === '/api/admin/settings' && method === 'PATCH') { data.settings = { ...data.settings, ...(await body(req)) }; saveData(data); return json(res, 200, data.settings) }
      const match = url.pathname.match(/^\/api\/admin\/(routes|destinations|leads)(?:\/([^/]+))?$/)
      if (match) {
        const payload = method === 'GET' || method === 'DELETE' ? {} : await body(req)
        const result = collectionHandler(data, match[1], method, match[2] ? `/api/admin/${match[1]}/${match[2]}` : url.pathname, payload)
        if (result.status === 204) return res.writeHead(204).end()
        return json(res, result.status, result.body)
      }
      return json(res, 404, { error: 'api route not found' })
    }

    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const safePath = normalize(requested).replace(/^\.\.(\/|\\)/, '')
    const filePath = join(distDir, safePath)
    const fallback = join(distDir, 'index.html')
    const target = existsSync(filePath) ? filePath : fallback
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream' })
    const page = extname(target) === '.html' && method === 'GET' ? injectSeoHtml(readFileSync(target), pageSeo(readData(), url.pathname, url.search, req)) : readFileSync(target)
    res.end(page)
  } catch (error) {
    json(res, error.message === 'payload too large' ? 413 : 400, { error: error.message })
  }
})

server.listen(port, '127.0.0.1', () => console.log(`SY Greece server: http://127.0.0.1:${port}/ (console: /manage-9f3k7)`))
