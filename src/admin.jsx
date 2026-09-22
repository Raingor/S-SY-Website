import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, Check, ChevronDown, ChevronRight, ChevronUp, Copy, CreditCard, FileText, Globe2, Landmark, Link2, LogOut, MapPinned, Plus, RefreshCw, Save, Settings, Smartphone, Trash2, Users, X } from 'lucide-react'
import { assetPath } from './chrome'

const ADMIN_KEY = 'sy-greece-admin-data'
const TOKEN_KEY = 'sy-greece-admin-token'
const defaultSettings = { siteName: '', siteUrl: '', defaultTitle: '', defaultDescription: '', homeEyebrow: '', homeTitle: '', homeDescription: '', homeBanners: [], keywords: '', ogImage: '', googleVerification: '', robotsPolicy: 'index,follow', wechat: '', phone: '', email: '', replyHours: '', miniprogramAccess: true, miniprogramKnowledge: { trialSeconds: 60, products: { attraction: { enabled: true, productType: 'attraction', name: '单景点永久讲解（模拟）', price: 0.01, currency: 'CNY' }, membership: { enabled: true, productType: 'membership', name: '终身会员（模拟）', price: 0.01, currency: 'CNY' } } } }
const emptyRoute = { days: '', kicker: '', title: '', tags: '', desc: '', image: 'santorini.webp', status: 'published' }
const emptyDestination = { name: '', en: '', type: 'culture', cityId: 'athens', image: 'santorini.webp', status: 'published', attractionIds: [], attractionId: '' }
const emptyAttraction = { name: '', en: '', originalName: '', city: 'athens', cityName: '雅典', type: 'landmark', category: '', sizeLabel: '', tags: '', image: 'athens.webp', summary: '', status: 'published', highlights: [], exhibits: [], guide: {}, articles: [], deepDive: { preview: '', locked: [] }, shareTitle: '', shareImage: '' }
const attractionCities = [
  { id: 'athens', name: '雅典' },
  { id: 'santorini', name: '圣托里尼' },
  { id: 'delphi', name: '德尔斐' },
  { id: 'meteora', name: '梅黛奥拉' },
  { id: 'crete', name: '克里特' },
  { id: 'nafplio', name: '纳夫普利翁' },
]
function attractionCityName(cityId, fallback = '') { return attractionCities.find((city) => city.id === cityId)?.name || fallback }
function destinationFormValue(item = {}, attractions = []) {
  const attractionIds = Array.isArray(item.attractionIds)
    ? [...new Set(item.attractionIds.map((value) => String(value || '').trim()).filter(Boolean))]
    : item.attractionId ? [String(item.attractionId).trim()] : []
  const inferredCity = item.cityId || (attractionCities.some((city) => city.id === item.id) ? item.id : attractions.find((attraction) => attractionIds.includes(attraction.id))?.city)
  return { ...emptyDestination, ...item, cityId: inferredCity || '', attractionIds, attractionId: attractionIds[0] || '' }
}
const emptyItinerary = { title: '', tag: '', days: 3, cover: 'santorini.webp', crowd: '', summary: '', status: 'published', itinerary: [] }
const emptyCustomTrip = { client: '', title: '希腊定制旅程', period: '', orderNo: '', travelers: '', language: '中文普通话 / 英语', vehicle: '欧 6 标准及以上七座奔驰商务车', guide: '希腊文旅金牌司导 / 欧美澳高等教育 / 欧盟 + 美国 + 中国驾照', totalFee: '', status: 'active', days: [], notices: [] }
const formTemplates = {
  route: { title: '路线填写模板', intro: '先确定路线定位，再补充天数、客群和卖点。', fields: [['路线名称', '雅典 · 圣托里尼经典 8 日'], ['路线副标题', '古典文明与爱琴海慢旅'], ['天数', '8 天'], ['人群标签', '首次到访 · 亲子 · 文化'], ['行程简介', '用 2–3 句话概括路线亮点和适合人群。'], ['图片', '上传横版路线主图'] ] },
  destination: { title: '目的地填写模板', intro: '名称保持简洁，英文名用于前台双语展示。', fields: [['中文名称', '圣托里尼'], ['英文名称', 'Santorini'], ['分类', '海岛度假 / 文明溯源'], ['图片', '上传目的地代表图']] },
  country: { title: '国家填写模板', intro: '维护国家三语名称、展示排序和代表图片；状态用于控制小程序可见性。', fields: [['国家 ID', 'greece'], ['简体中文', '希腊'], ['繁体中文', '希臘'], ['英文名称', 'Greece'], ['代表图片', '上传国家代表图']] },
  guide: { title: '导游填写模板', intro: '先完善导游身份与三语介绍，再上传头像与形象图，最后用卡片维护背书、擅长方向和客户评价。', fields: [['导游 ID', 'richard-li'], ['姓名 / 角色', 'Richard 李 · 名人导游'], ['简介', '希腊历史人文与私人路线顾问'], ['头像 / 形象图', '上传头像与详情图'], ['背书 / 方向 / 评价', '点击“添加”逐条维护']] },
  attraction: { title: '景点填写模板', intro: '先完善景点基础信息，再在下方添加讲解点。', fields: [['中文名称', '雅典卫城'], ['英文 / 希腊语原名', 'Acropolis of Athens / Ακρόπολη'], ['分类与规模', '世界文化遗产 · 超大型'], ['简介', '用 2–3 句话说明看点、参观价值和适合人群。'], ['图片', '上传景点主图']] },
  itinerary: { title: '参考行程填写模板', intro: '先完善行程定位，再逐日补充城市、说明与关联景点。', fields: [['行程名称', '雅典深度文化 5 日'], ['天数', '5'], ['行程标签', '短途 · 中转'], ['逐日行程', '每天添加标题、说明和景点关联'], ['封面图片', '上传行程封面图']] },
  customTrip: { title: '定制行程填写模板', intro: '先填写客户与日期，再补充服务配置和费用信息。', fields: [['客户称呼', '张先生 / ABC 公司'], ['订单编号', 'SY-20260915-001'], ['日期', '2026-10-01 至 2026-10-08'], ['旅客人数', '2 位成人 + 1 位儿童'], ['语种 / 车型', '中文普通话 / 七座奔驰商务车'], ['服务费总额', '€ 3,800']] },
  travelers: { title: '出行人资料填写模板', intro: '每条资料对应一个小程序用户，护照信息请按证件原文录入。', fields: [['所属用户', '选择已注册用户'], ['姓名', 'ZHANG SAN'], ['关系', '本人 / 配偶 / 子女'], ['护照号', '按护照号码填写']] },
  documents: { title: '签证资料填写模板', intro: '有效期使用日期控件选择，签证状态按当前办理阶段填写。', fields: [['所属用户', '选择已注册用户'], ['资料名称', '护照 / 申根签证'], ['护照号', '按护照号码填写'], ['有效期', '选择证件到期日期'], ['签证状态', '待办理 / 办理中 / 已出签']] },
  coupons: { title: '优惠券填写模板', intro: '优惠券名称要能直接说明权益，代码和有效期用于小程序核销。', fields: [['所属用户', '选择已注册用户'], ['优惠券名称', '机场接送立减 €50'], ['说明', '填写使用条件与适用服务。'], ['优惠码', 'SY-AIRPORT-50'], ['有效期', '选择截止日期']] },
  lead: { title: '咨询 / 预约编辑模板', intro: '先确认联系人与日期，再补充服务需求；状态用于跟进业务进度。', fields: [['联系方式', '微信 / 手机号 / 邮箱'], ['日期', '通过日历选择准确日期'], ['服务需求', '补充客户真正需要确认的内容'], ['状态', '待处理 / 已联系 / 已报价 / 已完成']] },
  miniprogramUser: { title: '小程序用户编辑模板', intro: '仅修正运营需要维护的昵称和手机号，微信头像与身份由小程序同步。', fields: [['用户昵称', '客户希望展示的称呼'], ['手机号', '完整手机号；留空保持原值'], ['头像', '由微信小程序同步']] },
  settings: { title: '站点配置填写模板', intro: 'SEO 文案建议先写清品牌、服务范围和核心关键词，再保存发布。', fields: [['站点名称', '希腊旅行管家'], ['默认页面标题', '只为一生美好回忆｜希腊旅行管家'], ['SEO 描述', '提供希腊私人定制、司导与景点讲解服务。'], ['关键词', '希腊旅行,私人定制,景点讲解'], ['OG 图片', '上传社交分享预览图']] }
}

function demoDate(offset = 0) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function generateCouponCode() { return `SY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}` }
function templateDemo(kind, context = {}) {
  const start = demoDate(14); const end = demoDate(21)
  if (kind === 'route') return { days: '8', kicker: '古典文明与爱琴海慢旅', title: '雅典 · 圣托里尼经典 8 日', tags: '首次到访 · 亲子 · 文化', desc: '从雅典卫城到圣托里尼日落，串联希腊最值得慢慢体验的文明与海岛风景。', image: 'santorini.webp', status: 'published' }
  if (kind === 'destination') return { name: '圣托里尼', en: 'Santorini', type: 'island', image: 'santorini.webp', status: 'published' }
  if (kind === 'country') return { id: 'greece', name: '希腊', nameTw: '希臘', nameEn: 'Greece', enabled: true, sort: 1, heroImage: 'santorini.webp' }
  if (kind === 'guide') return { id: 'richard-li', countryId: 'greece', name: 'Richard 李', nameTw: 'Richard 李', nameEn: 'Richard Li', role: '名人导游', roleTw: '名人導遊', roleEn: 'Signature guide', intro: '希腊历史人文与私人路线顾问', introTw: '希臘歷史人文與私人路線顧問', introEn: 'Greek history, culture and private route specialist', location: '雅典 / 圣托里尼', wechat: 'SY-GREECE-01', avatar: 'richard-avatar.webp', fullImage: 'richard-profile.webp', eyebrow: 'EUROPEAN SIGNATURE GUIDE', proof: '武汉大学双学士 · 英国澳洲双硕士', credentials: [{ index: '01', title: '名校教育', desc: '武汉大学双学士\n英国澳洲双硕士' }, { index: '02', title: '资深履历', desc: '资深定制旅行规划师\n欧洲精品文旅金牌从业者' }, { index: '03', title: '在地资质', desc: '欧盟 · 美国 · 中国\n驾照兼备' }], directions: [{ key: 'history', index: '01', title: '雅典文明', subtitle: '历史与建筑讲解', desc: '从卫城到古市集，把课本里的文明讲成一次有温度的探索。', suitable: '适合：第一次到访 / 亲子家庭', duration: '半日 · 1日' }, { key: 'culture', index: '02', title: '圣地人文', subtitle: '信仰与建筑', desc: '深入德尔斐、梅黛奥拉等圣地，读懂石头背后的信仰与时间。', suitable: '适合：深度文化 / 摄影爱好者', duration: '1日 · 多日' }, { key: 'coast', index: '03', title: '小众秘境', subtitle: '海岸线与岛屿', desc: '避开人潮，沿着海岸线去看当地人才知道的蓝与风。', suitable: '适合：情侣蜜月 / 朋友出行', duration: '1日 · 多日' }, { key: 'photo', index: '04', title: '私人摄影', subtitle: '路线规划与记录', desc: '把光线、节奏和路线交给我，留下自然、不摆拍的旅行影像。', suitable: '适合：纪念日 / 家庭旅拍', duration: '半日 · 1日' }], reviews: [{ quote: '学识渊博，谈吐儒雅。一路上孩子听得入迷，大人也真正看懂了雅典。', name: '北京 · L女士', meta: '亲子文化之旅' }, { quote: '专业靠谱又细心体贴，临时调整路线也安排得很稳，拍照尤其好看。', name: '上海 · K先生', meta: '圣岛蜜月之旅' }, { quote: '不赶景点，更像和一位老朋友探索希腊。小众海岸线比想象中更惊喜。', name: '广州 · M女士', meta: '海岛深度定制' }], storyTitle: '先认识本人，再决定这次如何徐徐深入', story1: '旅居欧美多年，我一直把希腊当成一座可以慢慢读的博物馆。', story2: '我不负责把行程塞满，而是希望你离开时仍记得沿途细节。', storyNote: '旅行最珍贵的，不是走过多少地方，而是终于有人替你读懂沿途的故事。', quoteKicker: 'Richard 李 · 在地深度陪同', quote: '把一簇辉映，变成一段真正有温度的希腊经验', quoteFoot: '武汉大学双学士 · 英国澳洲双硕士 · 欧盟 / 美国 / 中国驾照', featured: true, enabled: true, sort: 1 }
  if (kind === 'attraction') return { name: '雅典卫城', en: 'Acropolis of Athens', originalName: 'Ακρόπολη', city: 'athens', cityName: '雅典', type: 'landmark', category: '世界文化遗产', sizeLabel: '超大型', tags: '古典文明 · 建筑 · 亲子', image: 'athens.webp', summary: '站在帕特农神庙前，读懂雅典城邦、神话与古典建筑共同留下的时间印记。', highlights: [{ name: '帕特农神庙', desc: '雅典卫城的核心建筑，适合结合建筑比例与城邦历史讲解。' }, { name: '卫城山视野', desc: '从山顶眺望雅典城市与爱琴海，建议安排清晨或傍晚参观。' }], exhibits: [{ id: 'demo-exhibit-1', name: '帕特农神庙', author: '古典时期', image: 'athens.webp', duration: '8 分钟', location: { floor: '山顶', hall: '卫城主殿' } }], guide: { hours: '每日 08:00–20:00（夏季）', tickets: '成人票 €20，建议提前预约。', transport: '地铁 2 号线至 Acropoli 站，步行约 10 分钟。', worth: '避开正午高温，清晨光线适合拍摄。', services: '入口处提供人工讲解与寄存服务。', family: '山路较多，建议穿防滑鞋。', map: '南坡入口 → 狄俄尼索斯剧场 → 山门 → 帕特农神庙。', shop: '出口附近设有博物馆商店。', accessibility: '部分区域提供无障碍通道，请提前咨询。', exhibitions: '卫城博物馆常设古雕塑展。', faq: '问：需要提前多久到达？答：建议提前 20 分钟。', notices: '严禁触摸文物，夏季请携带饮水。' }, articles: [{ title: '读懂帕特农神庙的三个角度', date: demoDate(28), summary: '从建筑、神话和城邦政治三个角度重新认识卫城。', cover: 'plaka.webp' }], deepDive: { preview: '本篇将带你从石材、比例与祭祀传统进入雅典卫城的深层故事。', locked: ['建筑比例与视觉校正', '雅典娜神话音频讲解'] }, status: 'published' }
  if (kind === 'itinerary') return { title: '雅典深度文化 5 日', tag: '短途 · 中转', days: 5, crowd: '首次到访 / 亲子 / 文化旅行', cover: 'athens.webp', summary: '以雅典为中心，安排卫城、博物馆与海岸线的舒缓文化旅程。', itinerary: [{ day: 1, title: '抵达雅典 · 城市初见', city: '雅典', desc: '机场接送，入住酒店后漫步普拉卡老城。', attractionIds: ['acropolis-museum'] }, { day: 2, title: '雅典卫城 · 古典文明', city: '雅典', desc: '上午参观卫城，下午走访国家考古博物馆。', attractionIds: ['acropolis', 'national-archaeological-museum'] }], status: 'published' }
  if (kind === 'customTrip') return { client: '张先生家庭', title: '张先生希腊亲子定制旅程', period: periodValue(start, end), orderNo: 'SY-DEMO-2026-001', travelers: '2 位成人 + 1 位儿童', language: '中文普通话', vehicle: '七座奔驰商务车', guide: '中文金牌司导，兼顾亲子节奏与历史讲解。', totalFee: '€ 3,800', status: 'active', days: [0, 1, 2].map((offset, index) => ({ date: tripDayStoredValue(demoDate(14 + offset)), city: index === 2 ? '圣托里尼' : '雅典', slots: [{ period: index === 0 ? '下午' : '上午', time: index === 0 ? '15:00' : '09:30', text: index === 0 ? '机场接送与入住' : '卫城深度讲解', desc: '预留充足休息时间，按家庭节奏灵活调整。', services: index === 0 ? ['接送', '酒店'] : ['陪同', '讲解'], attractionIds: index === 0 ? [] : ['acropolis'] }] })), notices: [{ title: '服务须知', items: ['司导每日提前 15 分钟抵达。', '景点门票按实际预约结果确认。'] }, { title: '亲子提醒', items: ['请准备防晒用品与舒适步行鞋。'] }], status: 'active' }
  if (kind === 'travelers') return { userId: context.users?.[0]?.id || '', name: 'ZHANG SAN', relation: '本人', passportNo: 'P12345678' }
  if (kind === 'documents') return { userId: context.users?.[0]?.id || '', name: '申根签证', passportNo: 'P12345678', expiry: demoDate(180), visaStatus: '办理中' }
  if (kind === 'coupons') return { userId: context.users?.[0]?.id || '', title: '机场接送立减 €50', description: '适用于雅典机场至市区的首次接送服务。', code: generateCouponCode(), expiresAt: demoDate(60), status: 'active' }
  if (kind === 'lead') return { leadType: 'customization', contact: '+30 690 123 4567', destination: '雅典 / 圣托里尼', travelers: '2 位成人 + 1 位儿童', travelDate: demoDate(30), _businessStart: start, _businessEnd: end, serviceLength: '8 天', language: '中文普通话', industryNeeds: '亲子定制与机场接送', themes: '古典文明、海岛、亲子', requirements: '希望安排节奏舒缓、适合儿童的文化路线。', status: 'new' }
  if (kind === 'miniprogramUser') return { nickname: '希腊行程体验官', phone: '+30 690 123 4567' }
  if (kind === 'settings') return { siteName: 'SY 希腊蔚蓝海岸', siteUrl: 'https://sy-greece.com', defaultTitle: '只为一生美好回忆｜SY 希腊蔚蓝海岸', defaultDescription: '提供希腊私人定制、金牌司导与古迹人文讲解服务。', keywords: '希腊旅行,私人定制,司导,景点讲解', googleVerification: '', robotsPolicy: 'index,follow', wechat: 'SY-Greece', phone: '+30 210 123 4567', email: 'hello@sy-greece.com', replyHours: '24 小时内回复', ogImage: 'santorini.webp' }
  return {}
}

function localSeed() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) } catch { return null }
}
function saveLocal(data) { localStorage.setItem(ADMIN_KEY, JSON.stringify(data)) }
function localId(prefix) { return `${prefix}-${Date.now().toString(36)}` }
function isGuideBooking(lead) { return lead.leadType === 'guide-booking' || Boolean(lead.guideSlug) }
function isMiniProgramBooking(lead) { return ['miniprogram', 'wechat-miniprogram'].includes(lead.platform) || ['miniprogram', 'wechat-miniprogram'].includes(lead.source) || lead.leadType === 'mini-program-booking' }
function leadTypeLabel(type) { return ({ customization: '行程咨询', 'guide-booking': '古迹讲解预约', 'vehicle-consultation': '用车咨询', 'knowledge-base': '知识库咨询', 'business-travel': '商旅咨询', 'mini-program-booking': '小程序预约' })[type] || type || '行程咨询' }
function ReloadButton({ onReload }) { return <button type="button" className="admin-secondary small admin-reload-button" onClick={onReload}><RefreshCw size={14} />重新加载</button> }
function adminDate(value) { return value ? new Date(value).toLocaleString('zh-CN') : '—' }
function adminMoney(amount) { return `${Number(amount || 0).toFixed(2)} 元` }
function defaultCommerceStats() { return { totals: { orderCount: 0, paidOrderCount: 0, memberCount: 0, amount: 0 }, windows: { today: { orderCount: 0, paidOrderCount: 0, memberCount: 0, amount: 0 }, last7Days: { orderCount: 0, paidOrderCount: 0, memberCount: 0, amount: 0 }, last30Days: { orderCount: 0, paidOrderCount: 0, memberCount: 0, amount: 0 } } } }

async function callApi(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const payload = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(payload?.error || '请求失败')
  return payload
}

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(e) {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const response = await callApi('/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      sessionStorage.setItem(TOKEN_KEY, response.token); onLogin(response.token, false)
    } catch (requestError) { setError(requestError.message === 'Failed to fetch' ? '管理服务尚未启动，请运行 npm run start' : requestError.message); setSubmitting(false) }
  }
  return <main className="admin-login"><div className="admin-login-card"><div className="admin-mark"><span>SY</span><small>GREECE ADMIN</small></div><h1>网站管理后台</h1><p>管理路线、目的地、线索和站点配置</p><form onSubmit={submit}><label>管理员密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入管理密码" autoFocus /></label><button className="admin-primary" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? '登录中…' : '进入后台'} {!submitting && <ChevronRight size={16} />}</button>{error && <div className="admin-error" role="alert">{error}</div>}</form></div></main>
}

function StatCard({ icon: Icon, label, value, tone = '' }) { return <div className={`admin-stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div> }
const publicationStatusOptions = [{ value: 'published', label: '发布' }, { value: 'unpublished', label: '下架' }]
function publicationValue(status) { return status === 'published' ? 'published' : 'unpublished' }
const customTripStatusOptions = [{ value: 'active', label: '生效中' }, { value: 'archived', label: '已停用' }]
const couponStatusOptions = [{ value: 'active', label: '有效' }, { value: 'used', label: '已使用' }, { value: 'expired', label: '已过期' }]
const visaStatusOptions = [{ value: '', label: '未设置' }, { value: '待办理', label: '待办理' }, { value: '办理中', label: '办理中' }, { value: '已出签', label: '已出签' }, { value: '已拒签', label: '已拒签' }]
function StatusSelect({ value, options, onChange }) {
  const [saving, setSaving] = useState(false)
  const choices = options.some((option) => option.value === value) ? options : [...options, { value, label: value || '未设置' }]
  async function change(event) {
    setSaving(true)
    try { await onChange(event.target.value) } finally { setSaving(false) }
  }
  return <select className={`status-select ${value || 'unset'}`} value={value || ''} onChange={change} disabled={saving} aria-label="修改状态" aria-busy={saving}>{choices.map((option) => <option value={option.value} key={option.value || 'unset'}>{saving && option.value === value ? '保存中…' : option.label}</option>)}</select>
}
function templateKind(template) { return Object.entries(formTemplates).find(([, value]) => value === template)?.[0] || '' }
function setNativeControlValue(control, value) {
  if (value === undefined || value === null || value === '') return
  if (control.type === 'checkbox') { control.checked = Boolean(value); control.dispatchEvent(new Event('change', { bubbles: true })); return }
  const prototype = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(control, String(value)); control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true }))
}
function demoControlValue(kind, label, index, demo) {
  const text = label.replace(/\s+/g, '')
  const keyMap = {
    route: { 天数: 'days', 路线副标题: 'kicker', 路线名称: 'title', 人群标签: 'tags', 行程简介: 'desc' },
    destination: { 中文名称: 'name', 英文名称: 'en', 分类: 'type' },
    attraction: { 中文名称: 'name', 英文名称: 'en', 希腊语原名: 'originalName', 所属城市: 'city', 分类: 'category', 规模标签: 'sizeLabel', 标签: 'tags', 简介: 'summary', 免费预览: 'deepDive.preview', 亮点名称: 'highlights.name', 亮点说明: 'highlights.desc', 讲解点名称: 'exhibits.name', 作者时期: 'exhibits.author', 讲解时长: 'exhibits.duration', 所在楼层: 'exhibits.location.floor', 所在展厅区域: 'exhibits.location.hall', 文章标题: 'articles.title', 发布日期: 'articles.date', 文章摘要: 'articles.summary', 锁定内容: 'deepDive.locked' },
    itinerary: { 行程名称: 'title', 天数: 'days', 行程标签: 'tag', 适合人群: 'crowd', 简介: 'summary', 当天标题: 'itinerary.title', 所在城市: 'itinerary.city', 当天行程说明: 'itinerary.desc' },
    customTrip: { 行程标题: 'title', 客户称呼: 'client', 订单编号: 'orderNo', 旅客人数: 'travelers', 语种需求: 'language', 服务费总额: 'totalFee', 计划车型: 'vehicle', 司导说明: 'guide', 分组标题: 'notices.title', 行程日期: 'days.date', 住宿城市: 'days.city', 时段: 'days.slots.period', 具体时间: 'days.slots.time', 安排标题: 'days.slots.text', 详细说明: 'days.slots.desc' },
    travelers: { 姓名: 'name', 关系: 'relation', 护照号: 'passportNo' },
    documents: { 资料名称: 'name', 护照号: 'passportNo', 有效期: 'expiry', 签证状态: 'visaStatus' },
    coupons: { 优惠券名称: 'title', 说明: 'description', 优惠码: 'code', 有效期: 'expiresAt', 状态: 'status' },
    lead: { 咨询类型: 'leadType', 联系方式: 'contact', 目的地点位: 'destination', 出行人数: 'travelers', 出行日期: 'travelDate', 商务周期开始: '_businessStart', 商务周期结束: '_businessEnd', 服务时长: 'serviceLength', 语种需求: 'language', 行业用车需求: 'industryNeeds', 关注主题: 'themes', 补充说明: 'requirements', 状态: 'status' },
    miniprogramUser: { 用户昵称: 'nickname', 手机号可选: 'phone' },
    settings: { 站点名称: 'siteName', 站点正式网址: 'siteUrl', 默认页面标题: 'defaultTitle', 默认SEO描述: 'defaultDescription', 关键词用逗号分隔: 'keywords', GoogleSearchConsole验证码: 'googleVerification', Robots策略: 'robotsPolicy', 微信号: 'wechat', 联系电话: 'phone', 邮箱: 'email', 回复承诺: 'replyHours' },
  }
  const key = Object.entries(keyMap[kind] || {}).find(([prefix]) => text.startsWith(prefix))?.[1]
  if (!key) return undefined
  if (key.includes('.')) {
    const parts = key.split('.'); const collection = parts[0]; const field = parts.at(-1)
    if (collection === 'deepDive') return demo.deepDive?.[field]?.[index] ?? demo.deepDive?.[field]
    if (collection === 'days' && parts[1] === 'slots') return demo.days?.flatMap((day) => day.slots || [])[index]?.[field]
    if (collection === 'days') return demo.days?.[index]?.[field]
    return demo[collection]?.[index]?.[field]
  }
  return demo[key]
}
function fillTemplateDemo(event, template) {
  const kind = templateKind(template); const demo = templateDemo(kind, {}); const editor = event.currentTarget.closest('.admin-editor-card, .settings-panel'); if (!editor) return
  const counters = {}
  editor.querySelectorAll('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, select').forEach((control) => {
    const label = control.closest('label')?.querySelector(':scope > span')?.textContent || control.closest('label')?.firstChild?.textContent || ''
    const key = label.replace(/\s+/g, ''); const index = counters[key] || 0; counters[key] = index + 1
    setNativeControlValue(control, demoControlValue(kind, label, index, demo))
  })
  editor.querySelectorAll('input[type="checkbox"]').forEach((control) => { if (control.closest('fieldset')?.querySelector('legend')?.textContent?.includes('关联景点')) setNativeControlValue(control, false) })
}
function AdminFormTemplateGuide({ template, onFill }) {
  if (!template) return null
  return <aside className="admin-template-guide" aria-label={template.title}><div className="admin-template-guide-head"><div><span className="admin-eyebrow">FILLING TEMPLATE / 填写引导</span><strong>{template.title}</strong><p>{template.intro}</p></div><div className="admin-template-guide-actions"><span className="admin-template-guide-badge">拟真示例</span><button type="button" className="admin-template-fill" onClick={onFill || ((event) => fillTemplateDemo(event, template))}>一键填写</button></div></div><div className="admin-template-guide-fields">{template.fields.map(([label, example]) => <div key={label}><span>{label}</span><code>{example}</code></div>)}</div><small>示例仅供填写参考，请根据实际内容修改；点击“一键填写”可载入完整拟真数据，保存前请按实际内容调整。</small></aside>
}
function AnchorNav({ items, label = '快速定位' }) {
  const sig = items.map((item) => item.id).join('|')
  const [active, setActive] = useState(items[0]?.id || '')
  useEffect(() => {
    if (!sig || typeof IntersectionObserver === 'undefined') return undefined
    const targets = sig.split('|').map((id) => document.getElementById(id)).filter(Boolean)
    if (!targets.length) return undefined
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (visible?.target?.id) setActive(visible.target.id)
    }, { rootMargin: '-16% 0px -62% 0px', threshold: 0 })
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [sig])
  function jump(id) {
    const target = document.getElementById(id)
    if (!target) return
    setActive(id)
    target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return <nav className="admin-anchor-nav" aria-label={label + '锚点'}><span className="admin-anchor-label"><Link2 size={13} />{label}</span><div className="admin-anchor-list">{items.map((item) => <button type="button" key={item.id} className={active === item.id ? 'active' : ''} aria-current={active === item.id ? 'true' : undefined} onClick={() => jump(item.id)}><span>{item.label}</span>{Number.isFinite(item.count) && <em>{item.count}</em>}</button>)}</div></nav>
}

function AdminEditorPage({ title, template, children, onClose, onFillDemo, anchors = [] }) {
  return <div className="admin-editor-page"><div className="admin-editor-head"><button type="button" className="admin-editor-back" onClick={onClose}><ArrowLeft size={16} />返回列表</button><div><span className="admin-eyebrow">EDIT CONTENT / 独立编辑</span><h2>{title}</h2><p>在独立编辑页面完成内容、图片与日期设置，保存后即可生效。</p></div></div>{anchors.length > 0 && <AnchorNav items={anchors} />}<div className="admin-editor-card"><AdminFormTemplateGuide template={template} onFill={onFillDemo} />{children}</div></div>
}

function ImageUploadField({ label, value, onChange, onUpload, required = false, hint = '支持 PNG、JPG、WebP，单张不超过 6MB' }) {
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  async function uploadFile(file) {
    if (!file || !onUpload) return
    setUploading(true)
    try {
      const next = await onUpload(file)
      if (next) onChange(next)
    } finally {
      setUploading(false)
    }
  }
  function handleChange(event) { uploadFile(event.target.files?.[0]); event.target.value = '' }
  function handleDrop(event) { event.preventDefault(); setDragging(false); uploadFile(event.dataTransfer.files?.[0]) }
  return <label className={`admin-image-field ${dragging ? 'is-dragging' : ''}`} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} aria-busy={uploading}><span>{label}</span>{value ? <div className="admin-image-preview"><img src={assetPath(value)} alt={label + '预览'} /><span>当前图片</span></div> : <div className="admin-image-empty">{dragging ? '松开以上传图片' : '尚未选择图片'}</div>}<span className="admin-file-picker"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} disabled={uploading} required={required && !value} /><strong>{uploading ? '上传中…' : value ? '重新选择图片' : '选择图片上传'}</strong></span><small>{hint} · 也可将图片拖到此处</small></label>
}

function DateField({ label, value, onChange, required = false, min, max, hint = '' }) {
  return <label className="admin-date-field"><span>{label}</span><input type="date" value={value || ''} min={min || undefined} max={max || undefined} required={required} onChange={(event) => onChange(event.target.value)} />{hint && <small>{hint}</small>}</label>
}

function newExhibit() { return { id: localId('exhibit'), name: '', author: '', image: '', duration: '', location: { floor: '', hall: '' } } }
function normalizeExhibits(exhibits) { return Array.isArray(exhibits) ? exhibits.map((exhibit, index) => ({ ...exhibit, id: exhibit.id || `exhibit-${index + 1}`, location: { floor: exhibit.location?.floor || '', hall: exhibit.location?.hall || '' } })) : [] }
function AttractionExhibitsEditor({ exhibits, onChange, onUpload }) {
  const items = normalizeExhibits(exhibits)
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function updateLocation(index, key, value) { update(index, { location: { ...items[index].location, [key]: value } }) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(next) }
  function remove(index) { onChange(items.filter((_, itemIndex) => itemIndex !== index)) }
  return <section className="admin-exhibits-editor"><div className="admin-exhibits-head"><div><span className="admin-eyebrow">EXHIBITS / AUDIO GUIDE</span><h3>讲解点 <small>{items.length} 个</small></h3><p>维护景点页面展示的讲解点、语音时长与现场位置。</p></div><button type="button" className="admin-primary small" onClick={() => onChange([...items, newExhibit()])}><Plus size={15} />添加讲解点</button></div>{items.length ? <div className="admin-exhibits-list">{items.map((item, index) => <article className="admin-exhibit-card" key={item.id}><div className="admin-exhibit-card-head"><div className="admin-exhibit-number">{String(index + 1).padStart(2, '0')}</div><div><strong>{item.name || '未命名讲解点'}</strong><small>讲解点 {index + 1}</small></div><div className="admin-exhibit-actions"><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="上移讲解点" title="上移"><ChevronUp size={15} /></button><button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="下移讲解点" title="下移"><ChevronDown size={15} /></button><button type="button" className="danger" onClick={() => remove(index)} aria-label="删除讲解点" title="删除"><Trash2 size={14} /></button></div></div><div className="admin-form-grid"><label>讲解点名称<input required value={item.name || ''} onChange={(event) => update(index, { name: event.target.value })} /></label><label>作者 / 时期<input value={item.author || ''} onChange={(event) => update(index, { author: event.target.value })} /></label></div><div className="admin-form-grid"><label>讲解时长<input placeholder="如 6 分钟" value={item.duration || ''} onChange={(event) => update(index, { duration: event.target.value })} /></label><label>所在楼层<input placeholder="如 1 层 / 山顶" value={item.location.floor || ''} onChange={(event) => updateLocation(index, 'floor', event.target.value)} /></label></div><label>所在展厅 / 区域<input placeholder="如 主殿 / 女像柱厅" value={item.location.hall || ''} onChange={(event) => updateLocation(index, 'hall', event.target.value)} /></label><ImageUploadField label="讲解点图片" value={item.image} onChange={(image) => update(index, { image })} onUpload={(file) => onUpload(file, 'exhibit')} required /></article>)}</div> : <div className="admin-exhibits-empty"><strong>暂未添加讲解点</strong><span>点击右上角“添加讲解点”，为景点补充可展示的讲解内容。</span></div>}</section>
}

const GUIDE_FIELDS = [
  ['hours', '开放时间'], ['tickets', '门票信息'], ['transport', '交通方式'], ['worth', '最佳时间 / 参观建议'],
  ['services', '现场服务'], ['family', '亲子提示'], ['map', '游览路线'], ['shop', '商店 / 文创'],
  ['accessibility', '无障碍服务'], ['exhibitions', '临时展览'], ['faq', '常见问题'], ['notices', '临时通知'],
]
const TRIP_PERIODS = ['上午', '中午', '下午', '晚上']
const TRIP_SERVICES = ['接送', '陪同', '讲解', '酒店', '门票', '机票', '船票']

function newHighlight() { return { name: '', desc: '' } }
function newArticle() { return { title: '', date: '', summary: '', cover: '' } }
function newItineraryDay(day = 1) { return { day, title: '', city: '', desc: '', attractionIds: [] } }
function newTripDay(date = '') { return { date, city: '', slots: [] } }
function newTripSlot() { return { period: '上午', time: '', text: '', desc: '', services: [], attractionIds: [] } }
function newNotice() { return { title: '', items: [''] } }

function ReorderButtons({ index, count, onMove, onRemove, label }) {
  return <div className="admin-reorder-actions"><button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} aria-label={`上移${label}`} title="上移"><ChevronUp size={14} /></button><button type="button" onClick={() => onMove(index, 1)} disabled={index === count - 1} aria-label={`下移${label}`} title="下移"><ChevronDown size={14} /></button><button type="button" className="danger" onClick={() => onRemove(index)} aria-label={`删除${label}`} title="删除"><Trash2 size={14} /></button></div>
}

function AdminArrayHeader({ eyebrow, title, count, description, onAdd, addLabel }) {
  return <div className="admin-subeditor-head"><div><span className="admin-eyebrow">{eyebrow}</span><h3>{title} <small>{count} 项</small></h3>{description && <p>{description}</p>}</div><button type="button" className="admin-primary small" onClick={onAdd}><Plus size={15} />{addLabel}</button></div>
}

function HighlightsEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : []
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(next) }
  return <section className="admin-subeditor"><AdminArrayHeader eyebrow="HIGHLIGHTS / KEY MOMENTS" title="景点亮点" count={items.length} description="前台会将这些内容作为景点的重点看点展示。" onAdd={() => onChange([...items, newHighlight()])} addLabel="添加亮点" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={index}><div className="admin-array-card-head"><strong>亮点 {String(index + 1).padStart(2, '0')}</strong><ReorderButtons index={index} count={items.length} onMove={move} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex))} label="亮点" /></div><label>亮点名称<input required value={item.name || ''} placeholder="如：帕特农神庙 Parthenon" onChange={(event) => update(index, { name: event.target.value })} /></label><label>亮点说明<textarea required rows="3" value={item.desc || ''} placeholder="说明历史背景、建筑特点或值得关注的细节。" onChange={(event) => update(index, { desc: event.target.value })} /></label></article>)}</div> : <div className="admin-array-empty">暂未添加景点亮点。</div>}</section>
}

function GuideEditor({ value, onChange }) {
  const guide = value || {}
  return <section className="admin-subeditor"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">VISITOR GUIDE / PRACTICAL INFO</span><h3>游览指南</h3><p>把开放时间、门票、交通和现场提醒集中维护，前台会按栏目展示。</p></div></div><div className="admin-guide-grid">{GUIDE_FIELDS.map(([key, label]) => <label key={key}>{label}<textarea rows="3" value={guide[key] || ''} placeholder={`填写${label}…`} onChange={(event) => onChange({ ...guide, [key]: event.target.value })} /></label>)}</div></section>
}

function ArticlesEditor({ value, onChange, onUpload }) {
  const items = Array.isArray(value) ? value : []
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  return <section className="admin-subeditor"><AdminArrayHeader eyebrow="ARTICLES / EDITORIAL" title="相关文章" count={items.length} description="维护景点详情页下方的知识文章卡片。" onAdd={() => onChange([...items, newArticle()])} addLabel="添加文章" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={index}><div className="admin-array-card-head"><strong>文章 {String(index + 1).padStart(2, '0')}</strong><ReorderButtons index={index} count={items.length} onMove={(from, offset) => { const target = from + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[from], next[target]] = [next[target], next[from]]; onChange(next) }} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex))} label="文章" /></div><div className="admin-form-grid"><label>文章标题<input required value={item.title || ''} placeholder="如：读懂帕特农神庙的三个角度" onChange={(event) => update(index, { title: event.target.value })} /></label><DateField label="发布日期" value={item.date} onChange={(date) => update(index, { date })} required /></div><label>文章摘要<textarea required rows="3" value={item.summary || ''} placeholder="用一两句话介绍文章内容。" onChange={(event) => update(index, { summary: event.target.value })} /></label><ImageUploadField label="文章封面" value={item.cover} onChange={(cover) => update(index, { cover })} onUpload={(file) => onUpload(file, 'article')} required /></article>)}</div> : <div className="admin-array-empty">暂未添加相关文章。</div>}</section>
}

function DeepDiveEditor({ value, onChange }) {
  const deepDive = value || {}; const locked = Array.isArray(deepDive.locked) ? deepDive.locked : []
  function updateLocked(index, text) { onChange({ ...deepDive, locked: locked.map((item, itemIndex) => itemIndex === index ? text : item) }) }
  return <section className="admin-subeditor"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">DEEP DIVE / KNOWLEDGE BASE</span><h3>深度内容</h3><p>维护免费预览文案和知识库中需要登录或付费后查看的内容标题。</p></div></div><label>免费预览<textarea rows="3" value={deepDive.preview || ''} placeholder="填写用户未解锁前可以看到的内容预览。" onChange={(event) => onChange({ ...deepDive, preview: event.target.value })} /></label><div className="admin-array-list">{locked.map((item, index) => <div className="admin-inline-row" key={index}><label>锁定内容 {index + 1}<input value={item || ''} placeholder="如：历史与神话音频深度讲解" onChange={(event) => updateLocked(index, event.target.value)} /></label><button type="button" className="table-actions danger" onClick={() => onChange({ ...deepDive, locked: locked.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14} /></button></div>)}</div><button type="button" className="admin-secondary" onClick={() => onChange({ ...deepDive, locked: [...locked, ''] })}><Plus size={14} />添加锁定内容</button></section>
}

function ItineraryDaysEditor({ value, onChange, attractions }) {
  const items = Array.isArray(value) ? value : []
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(next.map((item, itemIndex) => ({ ...item, day: itemIndex + 1 }))) }
  function toggleAttraction(index, attractionId) { const current = items[index].attractionIds || []; update(index, { attractionIds: current.includes(attractionId) ? current.filter((id) => id !== attractionId) : [...current, attractionId] }) }
  return <section className="admin-subeditor"><AdminArrayHeader eyebrow="DAILY PLAN / ATTRACTION LINKS" title="逐日行程" count={items.length} description="逐日补充城市、节奏、说明和景点关联，前台会按天展示。" onAdd={() => onChange([...items, newItineraryDay(items.length + 1)])} addLabel="添加一天" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={index}><div className="admin-array-card-head"><strong>第 {index + 1} 天</strong><ReorderButtons index={index} count={items.length} onMove={move} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex).map((day, dayIndex) => ({ ...day, day: dayIndex + 1 })))} label="行程日" /></div><div className="admin-form-grid"><label>当天标题<input required value={item.title || ''} placeholder="如：雅典卫城 · 卫城博物馆" onChange={(event) => update(index, { title: event.target.value, day: index + 1 })} /></label><label>所在城市<input required value={item.city || ''} placeholder="如：雅典" onChange={(event) => update(index, { city: event.target.value })} /></label></div><label>当天行程说明<textarea required rows="4" value={item.desc || ''} placeholder="按时间顺序描述当天的安排和节奏。" onChange={(event) => update(index, { desc: event.target.value })} /></label><fieldset className="admin-check-field"><legend>关联景点</legend><div className="admin-check-grid">{attractions.map((attraction) => <label key={attraction.id}><input type="checkbox" checked={(item.attractionIds || []).includes(attraction.id)} onChange={() => toggleAttraction(index, attraction.id)} />{attraction.name}</label>)}</div></fieldset></article>)}</div> : <div className="admin-array-empty">暂未添加逐日安排。</div>}</section>
}

function tripDayInputValue(date, period) {
  const value = String(date || '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const code = value.replace(/\D/g, '')
  if (code.length === 4) return `${periodParts(period).start?.slice(0, 4) || new Date().getFullYear()}-${code.slice(0, 2)}-${code.slice(2)}`
  if (code.length === 8) return `${code.slice(0, 4)}-${code.slice(4, 6)}-${code.slice(6)}`
  return ''
}
function tripDayStoredValue(value) { return String(value || '').replace(/-/g, '').slice(4) }

function TripSlotEditor({ value, onChange, onRemove, attractions }) {
  const slot = value || newTripSlot()
  function update(patch) { onChange({ ...slot, ...patch }) }
  function toggle(key, item) { const current = slot[key] || []; update({ [key]: current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item] }) }
  return <article className="admin-slot-card"><div className="admin-array-card-head"><strong>时段安排</strong><button type="button" className="danger admin-icon-button" onClick={onRemove} aria-label="删除时段"><Trash2 size={14} /></button></div><div className="admin-form-grid"><label>时段<select value={slot.period || '上午'} onChange={(event) => update({ period: event.target.value })}>{TRIP_PERIODS.map((period) => <option key={period}>{period}</option>)}</select></label><label>具体时间<input type="time" value={slot.time || ''} onChange={(event) => update({ time: event.target.value })} /></label></div><label>安排标题<input required value={slot.text || ''} placeholder="如：前往雅典卫城" onChange={(event) => update({ text: event.target.value })} /></label><label>详细说明<textarea rows="3" value={slot.desc || ''} placeholder="补充游览内容、餐饮、酒店或注意事项。" onChange={(event) => update({ desc: event.target.value })} /></label><fieldset className="admin-check-field"><legend>服务标记</legend><div className="admin-check-grid">{TRIP_SERVICES.map((service) => <label key={service}><input type="checkbox" checked={(slot.services || []).includes(service)} onChange={() => toggle('services', service)} />{service}</label>)}</div></fieldset><fieldset className="admin-check-field"><legend>关联景点</legend><div className="admin-check-grid">{attractions.map((attraction) => <label key={attraction.id}><input type="checkbox" checked={(slot.attractionIds || []).includes(attraction.id)} onChange={() => toggle('attractionIds', attraction.id)} />{attraction.name}</label>)}</div></fieldset></article>
}

function CustomTripDaysEditor({ value, onChange, period, attractions }) {
  const items = Array.isArray(value) ? value : []
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(next) }
  function addDay() { const parsed = periodParts(period); const base = parsed.start ? new Date(parsed.start + 'T00:00:00') : new Date(); base.setDate(base.getDate() + items.length); const date = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`; onChange([...items, newTripDay(tripDayStoredValue(date))]) }
  const range = periodParts(period)
  return <section className="admin-subeditor"><AdminArrayHeader eyebrow="CUSTOM ITINERARY / DAILY SERVICE" title="每日行程" count={items.length} description="每一天使用日历选择日期，再添加上午、下午或晚上服务安排。" onAdd={addDay} addLabel="添加一天" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card admin-trip-day-card" key={index}><div className="admin-array-card-head"><strong>第 {index + 1} 天</strong><ReorderButtons index={index} count={items.length} onMove={move} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex))} label="行程日" /></div><div className="admin-form-grid"><DateField label="行程日期" value={tripDayInputValue(item.date, period)} min={range.start || undefined} max={range.end || undefined} onChange={(date) => update(index, { date: tripDayStoredValue(date) })} required /><label>住宿城市<input required value={item.city || ''} placeholder="如：雅典" onChange={(event) => update(index, { city: event.target.value })} /></label></div><div className="admin-slot-list">{(item.slots || []).map((slot, slotIndex) => <TripSlotEditor key={slotIndex} value={slot} attractions={attractions} onChange={(next) => update(index, { slots: item.slots.map((entry, entryIndex) => entryIndex === slotIndex ? next : entry) })} onRemove={() => update(index, { slots: item.slots.filter((_, entryIndex) => entryIndex !== slotIndex) })} />)}</div><button type="button" className="admin-secondary" onClick={() => update(index, { slots: [...(item.slots || []), newTripSlot()] })}><Plus size={14} />添加时段</button></article>)}</div> : <div className="admin-array-empty">暂未添加每日行程。</div>}</section>
}

function NoticesEditor({ value, onChange }) {
  const items = Array.isArray(value) ? value : []
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function updateNoticeItem(groupIndex, itemIndex, text) { update(groupIndex, { items: (items[groupIndex].items || []).map((item, index) => index === itemIndex ? text : item) }) }
  return <section className="admin-subeditor"><AdminArrayHeader eyebrow="NOTICES / TRAVEL NOTES" title="行程须知" count={items.length} description="将服务须知、免费服务、出行提醒等内容分组展示给客户。" onAdd={() => onChange([...items, newNotice()])} addLabel="添加须知组" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={index}><div className="admin-array-card-head"><strong>须知组 {String(index + 1).padStart(2, '0')}</strong><ReorderButtons index={index} count={items.length} onMove={(from, offset) => { const target = from + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[from], next[target]] = [next[target], next[from]]; onChange(next) }} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex))} label="须知组" /></div><label>分组标题<input required value={item.title || ''} placeholder="如：服务须知" onChange={(event) => update(index, { title: event.target.value })} /></label><div className="admin-notice-items">{(item.items || []).map((notice, noticeIndex) => <div className="admin-inline-row" key={noticeIndex}><label>第 {noticeIndex + 1} 条<input required value={notice || ''} placeholder="填写一条清晰、可执行的提醒" onChange={(event) => updateNoticeItem(index, noticeIndex, event.target.value)} /></label><button type="button" className="danger admin-icon-button" onClick={() => update(index, { items: item.items.filter((_, itemIndex) => itemIndex !== noticeIndex) })} aria-label="删除须知"><Trash2 size={14} /></button></div>)}</div><button type="button" className="admin-secondary" onClick={() => update(index, { items: [...(item.items || []), ''] })}><Plus size={14} />添加一条</button></article>)}</div> : <div className="admin-array-empty">暂未添加行程须知。</div>}</section>
}

function dateInputValue(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 8) return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8)
  return ''
}

function periodParts(period) {
  const [start = '', end = ''] = String(period || '').split('~')
  const startInput = dateInputValue(start)
  const endInput = end.length === 4 && startInput ? startInput.slice(0, 4) + '-' + end.slice(0, 2) + '-' + end.slice(2, 4) : dateInputValue(end)
  return { start: startInput, end: endInput }
}

function periodValue(start, end) {
  return start || end ? [start, end].map((value) => String(value || '').replace(/-/g, '')).join('~') : ''
}

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY))
  const [offline, setOffline] = useState(false)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ routes: 0, destinations: 0, leads: 0, pendingLeads: 0, customizationLeads: 0, guideBookings: 0, pendingGuideBookings: 0, miniProgramBookings: 0, vehicleConsultations: 0, knowledgeBaseLeads: 0, businessTravelLeads: 0, attractions: 0, sampleItineraries: 0, customTrips: 0 })
  const [routes, setRoutes] = useState([])
  const [destinations, setDestinations] = useState([])
  const [attractions, setAttractions] = useState([])
const [destinationTypes, setDestinationTypes] = useState([])
  const [sampleItineraries, setSampleItineraries] = useState([])
  const [customTrips, setCustomTrips] = useState([])
  const [countries, setCountries] = useState([])
  const [guides, setGuides] = useState([])
  const [leads, setLeads] = useState([])
  const [guideBookings, setGuideBookings] = useState([])
  const [miniProgramBookings, setMiniProgramBookings] = useState([])
  const [miniProgramUsers, setMiniProgramUsers] = useState([])
  const [miniProgramOrders, setMiniProgramOrders] = useState([])
  const [miniProgramTravelers, setMiniProgramTravelers] = useState([])
  const [miniProgramDocuments, setMiniProgramDocuments] = useState([])
  const [miniProgramCoupons, setMiniProgramCoupons] = useState([])
  const [settings, setSettings] = useState(defaultSettings)
  const [routeForm, setRouteForm] = useState(emptyRoute)
  const [destinationForm, setDestinationForm] = useState(emptyDestination)
  const [attractionForm, setAttractionForm] = useState(emptyAttraction)
  const [itineraryForm, setItineraryForm] = useState(emptyItinerary)
  const [customTripForm, setCustomTripForm] = useState(emptyCustomTrip)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState('')
  const [commerceStats, setCommerceStats] = useState(defaultCommerceStats)

  const localMode = offline
  const localData = useMemo(() => localSeed() || { routes: [], destinations: [], leads: [], settings }, [settings])
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2500) }
  function applyData(data) { const nextLeads = data.leads || []; const nextGuideBookings = data.guideBookings || nextLeads.filter(isGuideBooking); const nextMiniProgramBookings = data.miniProgramBookings || nextLeads.filter(isMiniProgramBooking); const nextDestinationTypes = (data.destinationCategories || data.destinationTypes || []).map((item) => ({ ...item, id: item.key || item.id, key: item.key || item.id, enabled: item.enabled !== false, status: item.enabled === false ? 'unpublished' : (item.status || 'published') })); setDestinationTypes(nextDestinationTypes); setCountries(data.countries || []); setGuides(data.guides || []); setRoutes(data.routes || []); setDestinations(data.destinations || []); setAttractions(data.attractions || []); setSampleItineraries(data.sampleItineraries || []); setCustomTrips(data.customTrips || []); setLeads(nextLeads); setGuideBookings(nextGuideBookings); setMiniProgramBookings(nextMiniProgramBookings); setMiniProgramUsers(data.miniprogramUsers || []); setMiniProgramOrders(data.miniprogramOrders || []); setSettings({ ...defaultSettings, ...(data.settings || {}) }); setStats({ routes: (data.routes || []).length, destinations: (data.destinations || []).length, leads: nextLeads.length, pendingLeads: nextLeads.filter((lead) => lead.status === 'new').length, customizationLeads: nextLeads.filter((lead) => lead.leadType === 'customization').length, guideBookings: nextGuideBookings.length, pendingGuideBookings: nextGuideBookings.filter((lead) => lead.status === 'new').length, miniProgramBookings: nextMiniProgramBookings.length, vehicleConsultations: nextLeads.filter((lead) => lead.leadType === 'vehicle-consultation').length, knowledgeBaseLeads: nextLeads.filter((lead) => lead.leadType === 'knowledge-base').length, businessTravelLeads: nextLeads.filter((lead) => lead.leadType === 'business-travel').length, attractions: (data.attractions || []).length, sampleItineraries: (data.sampleItineraries || []).length, customTrips: (data.customTrips || []).length }); setCommerceStats(data.commerce || defaultCommerceStats()) }
  async function load() {
    if (localMode) return applyData(localData)
    try {
      const auth = { Authorization: `Bearer ${token}` }
      const results = await Promise.allSettled(['/admin/stats', '/admin/routes', '/admin/destinations', '/admin/attractions', '/admin/sampleItineraries', '/admin/customTrips', '/admin/leads', '/admin/guide-bookings', '/admin/miniprogram-bookings', '/admin/settings', '/admin/miniprogram-users', '/admin/miniprogram-travelers', '/admin/miniprogram-documents', '/admin/miniprogram-coupons', '/admin/countries', '/admin/guides', '/admin/destinationCategories', '/admin/miniprogram-orders'].map((path) => callApi(path, { headers: auth })))
      const unauthorized = results.find((result) => result.status === 'rejected' && result.reason?.message?.includes('未授权'))
      if (unauthorized) { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setOffline(false); return }
      const [nextStats, nextRoutes, nextDestinations, nextAttractions, nextSampleItineraries, nextCustomTrips, nextLeads, nextGuideBookings, nextMiniProgramBookings, nextSettings, nextMiniProgramUsers, nextMiniProgramTravelers, nextMiniProgramDocuments, nextMiniProgramCoupons, nextCountries, nextGuides, nextDestinationTypes, nextMiniProgramOrders] = results.map((result) => result.status === 'fulfilled' ? result.value : null)
      if (nextCountries) setCountries(nextCountries.items || nextCountries)
      if (nextGuides) setGuides(nextGuides.items || nextGuides)
      if (nextDestinationTypes) setDestinationTypes((nextDestinationTypes.items || nextDestinationTypes).map((item) => ({ ...item, id: item.key || item.id, key: item.key || item.id, enabled: item.enabled !== false, status: item.enabled === false ? 'unpublished' : (item.status || 'published') })))
      if (nextStats) { setStats(nextStats); setCommerceStats(nextStats.commerce || defaultCommerceStats()) }
      if (nextRoutes) setRoutes(nextRoutes)
      if (nextDestinations) setDestinations(nextDestinations)
      if (nextAttractions) setAttractions(nextAttractions)
      if (nextSampleItineraries) setSampleItineraries(nextSampleItineraries)
      if (nextCustomTrips) setCustomTrips(nextCustomTrips)
      if (nextLeads) setLeads(nextLeads)
      if (nextGuideBookings) setGuideBookings(nextGuideBookings)
      if (nextMiniProgramBookings) setMiniProgramBookings(nextMiniProgramBookings)
      if (nextSettings) setSettings(nextSettings)
      if (nextMiniProgramUsers) setMiniProgramUsers(nextMiniProgramUsers.items || [])
      if (nextMiniProgramOrders) setMiniProgramOrders(nextMiniProgramOrders.items || [])
      if (nextMiniProgramTravelers) setMiniProgramTravelers(nextMiniProgramTravelers.items || [])
      if (nextMiniProgramDocuments) setMiniProgramDocuments(nextMiniProgramDocuments.items || [])
      if (nextMiniProgramCoupons) setMiniProgramCoupons(nextMiniProgramCoupons.items || [])
      const failed = results.find((result) => result.status === 'rejected')
      if (failed) notify(`部分管理数据加载失败：${failed.reason?.message || '请求失败'}`)
    } catch (error) { notify(`管理数据加载失败：${error.message}`) }
  }
  useEffect(() => { if (token) load() }, [token, offline])
  function login(nextToken, isOffline) { setOffline(isOffline); setToken(nextToken) }
  function logout() { sessionStorage.removeItem(TOKEN_KEY); setToken(null) }
  function localUpdate(key, updater) { const current = localSeed() || { routes: [], destinations: [], leads: [], settings }; const next = { ...current, [key]: updater(current[key]) }; saveLocal(next); applyData(next) }
  async function saveRoute(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    try {
      if (localMode) localUpdate('routes', (items) => isEdit ? items.map((item) => item.id === editing ? { ...routeForm, id: editing } : item) : [...items, { ...routeForm, id: localId('route') }])
      else await callApi(isEdit ? `/admin/routes/${editing}` : '/admin/routes', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(routeForm) })
      await load(); setEditing(null); setRouteForm(emptyRoute); notify('路线已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveDestination(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const attractionIds = [...new Set((Array.isArray(destinationForm.attractionIds) ? destinationForm.attractionIds : destinationForm.attractionId ? [destinationForm.attractionId] : []).map((value) => String(value || '').trim()).filter(Boolean))]
    const payload = { ...destinationForm, cityId: String(destinationForm.cityId || '').trim(), attractionIds, attractionId: attractionIds[0] || '' }
    try {
      if (localMode) localUpdate('destinations', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing } : item) : [...items, { ...payload, id: localId('destination') }])
      else await callApi(isEdit ? `/admin/destinations/${editing}` : '/admin/destinations', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setDestinationForm(emptyDestination); notify('目的地已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveAttraction(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...attractionForm, cityName: attractionCityName(attractionForm.city, attractionForm.cityName), tags: String(attractionForm.tags || '').split(/[,，、\s]+/).filter(Boolean), highlights: Array.isArray(attractionForm.highlights) ? attractionForm.highlights : [], exhibits: normalizeExhibits(attractionForm.exhibits), guide: attractionForm.guide || {}, articles: Array.isArray(attractionForm.articles) ? attractionForm.articles : [], deepDive: attractionForm.deepDive || { preview: '', locked: [] } }
    try {
      if (localMode) localUpdate('attractions', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing } : item) : [...items, { ...payload, id: localId('attraction') }])
      else await callApi(isEdit ? `/admin/attractions/${editing}` : '/admin/attractions', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setAttractionForm(emptyAttraction); notify('景点已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveItinerary(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...itineraryForm, days: Number(itineraryForm.days) || 1, itinerary: Array.isArray(itineraryForm.itinerary) ? itineraryForm.itinerary.map((item, index) => ({ ...item, day: index + 1, attractionIds: Array.isArray(item.attractionIds) ? item.attractionIds : [] })) : [] }
    try {
      if (localMode) localUpdate('sampleItineraries', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing } : item) : [...items, { ...payload, id: localId('sample') }])
      else await callApi(isEdit ? `/admin/sampleItineraries/${editing}` : '/admin/sampleItineraries', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setItineraryForm(emptyItinerary); notify('参考行程已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveCustomTrip(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...customTripForm, days: Array.isArray(customTripForm.days) ? customTripForm.days : [], notices: Array.isArray(customTripForm.notices) ? customTripForm.notices : [] }
    try {
      let saved
      if (localMode) { localUpdate('customTrips', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing, token: item.token } : item) : [...items, { ...payload, id: localId('trip'), token: localId('t') }]); saved = null }
      else saved = await callApi(isEdit ? `/admin/customTrips/${editing}` : '/admin/customTrips', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setCustomTripForm(emptyCustomTrip); notify(saved?.token ? `定制行程已保存，分享链接 /trip/${saved.token}` : '定制行程已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveDestinationType(editingId, form, done) {
    const isEdit = editingId !== 'new'
    const payload = { key: form.key || form.id, name: form.name, nameTw: form.nameTw || form.name, nameEn: form.nameEn || form.name, description: form.description || '', enabled: form.enabled !== false, sort: Number(form.sort) || 0 }
    try {
      if (localMode) localUpdate('destinationCategories', (items) => isEdit ? items.map((item) => (item.key || item.id) === editingId ? { ...item, ...payload } : item) : [...items, payload])
      else await callApi(isEdit ? `/admin/destinationCategories/${editingId}` : '/admin/destinationCategories', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); done && done(); notify('目的地分类已保存')
    } catch (error) { notify(error.message) }
  }
  async function remove(collection, itemId) {
    if (!window.confirm('确定删除这条内容吗？')) return
    try { if (localMode) localUpdate(collection, (items) => items.filter((item) => item.id !== itemId)); else await callApi(`/admin/${collection}/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await load(); notify('已删除') } catch (error) { notify(error.message) }
  }
  async function updateLead(leadId, changes) {
    const payload = typeof changes === 'string' ? { status: changes } : changes
    try { if (localMode) localUpdate('leads', (items) => items.map((item) => item.id === leadId ? { ...item, ...payload } : item)); else await callApi(`/admin/leads/${leadId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await load(); notify(payload.status ? '线索状态已更新' : '线索已保存') } catch (error) { notify(error.message) }
  }
  async function updateCollectionStatus(collection, itemId, status) {
    const payload = typeof status === 'string' ? { status } : status
    try {
      if (localMode) localUpdate(collection, (items) => items.map((item) => (item.key || item.id) === itemId ? { ...item, ...payload } : item))
      else await callApi(`/admin/${collection}/${itemId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); notify('状态已更新')
    } catch (error) { notify(error.message) }
  }
  async function uploadOgImage(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('请选择图片文件')
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    try {
      if (localMode) localUpdate('settings', (current) => ({ ...current, ogImage: dataUrl }))
      else { const result = await callApi('/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: file.name, type: file.type, data: dataUrl }) }); setSettings((current) => ({ ...current, ogImage: result.path })) }
      notify('OG 分享图片已上传')
    } catch (error) { notify(error.message) }
  }
  async function uploadImage(file, prefix = 'image') {
    if (!file) return ''
    if (!/^image\/(?:png|jpeg|webp)$/.test(file.type)) { notify('请选择 PNG、JPG 或 WebP 图片'); return '' }
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    try {
      if (localMode) return dataUrl
      const result = await callApi('/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: file.name, type: file.type, data: dataUrl, prefix, updateSettings: false }) })
      return result.path
    } catch (error) { notify(error.message); return '' }
  }
  async function saveSettings(e) {
    e.preventDefault()
    try { if (localMode) localUpdate('settings', () => settings); else await callApi('/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(settings) }); await load(); notify('站点配置已保存') } catch (error) { notify(error.message) }
  }
  async function saveMiniRecord(collection, itemId, payload) {
    try { await callApi(`/admin/miniprogram-${collection}${itemId ? `/${itemId}` : ''}`, { method: itemId ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await load(); notify('小程序资料已保存') } catch (error) { notify(error.message) }
  }
  async function saveMiniUser(userId, payload) {
    try { if (localMode) localUpdate('miniprogramUsers', (items) => items.map((item) => item.id === userId ? { ...item, ...payload } : item)); else await callApi(`/admin/miniprogram-users/${userId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await load(); notify('小程序用户已保存') } catch (error) { notify(error.message) }
  }
  async function removeMiniRecord(collection, itemId) {
    if (!window.confirm('确定删除这条小程序资料吗？')) return
    try { await callApi(`/admin/miniprogram-${collection}/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await load(); notify('小程序资料已删除') } catch (error) { notify(error.message) }
  }
  if (!token) return <AdminLogin onLogin={login} />
  const menu = [['overview', BarChart3, '总览'], ['countries', MapPinned, '国家管理'], ['guides', Users, '导游管理'], ['routes', FileText, '路线管理'], ['destinationTypes', MapPinned, '目的地分类'], ['destinations', MapPinned, '目的地'], ['attractions', Landmark, '景点管理'], ['sampleItineraries', MapPinned, '参考行程'], ['customTrips', Link2, '定制行程'], ['leads', Users, '咨询 CRM'], ['guideBookings', CalendarDays, '导游预约'], ['miniProgramBookings', Smartphone, '小程序预约'], ['miniprogramUsers', Users, '小程序用户'], ['miniprogramOrders', CreditCard, '订单管理'], ['miniprogramTrips', MapPinned, '小程序行程'], ['miniprogramTravelers', Users, '出行人资料'], ['miniprogramDocuments', FileText, '签证资料'], ['miniprogramCoupons', CalendarDays, '优惠券'], ['settings', Settings, '站点配置']]
  const menuGroups = [['共同数据', ['overview', 'countries', 'guides', 'leads', 'guideBookings']], ['网站管理', ['routes', 'destinationTypes', 'destinations', 'attractions', 'sampleItineraries', 'customTrips', 'settings']], ['小程序管理', ['miniProgramBookings', 'miniprogramUsers', 'miniprogramOrders', 'miniprogramTrips', 'miniprogramTravelers', 'miniprogramDocuments', 'miniprogramCoupons']]]
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span>SY</span><div><strong>希腊旅行管家</strong><small>CONTENT ADMIN</small></div></div><nav>{menuGroups.map(([group, keys]) => <div className="admin-nav-group" key={group}><span className="admin-nav-group-label">{group}</span>{keys.map((key) => { const item = menu.find((entry) => entry[0] === key); const [menuKey, Icon, label] = item; return <button key={menuKey} className={tab === menuKey ? 'active' : ''} onClick={() => { setEditing(null); setTab(menuKey) }}><Icon size={17} />{label}</button> })}</div>)}</nav><div className="admin-sidebar-foot"><span className={localMode ? 'offline-dot' : ''}>{localMode ? '本地演示模式' : 'API 已连接'}</span><button onClick={logout}><LogOut size={15} />退出</button></div></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">GREECE TRAVEL BUTLER / ADMIN</span><h1>{menu.find((item) => item[0] === tab)?.[2]}</h1></div><a href="/#/" className="admin-view-site"><Globe2 size={16} />查看前台</a></header>{toast && <div className="admin-toast" role="status" aria-live="polite"><Check size={15} />{toast}</div>}{tab === 'overview' && <Overview stats={stats} commerceStats={commerceStats} onTab={setTab} onReload={load} leads={leads} />}{tab === 'countries' && <MasterPanel title="国家管理" collection="countries" items={countries} fields={['id','name','nameTw','nameEn','enabled','sort','heroImage']} token={token} onReload={load} notify={notify} />}{tab === 'guides' && <MasterPanel title="导游管理" collection="guides" items={guides} fields={['id','countryId','name','nameTw','nameEn','role','roleTw','roleEn','intro','introTw','introEn','location','wechat','avatar','fullImage','eyebrow','proof','credentials','directions','reviews','featured','enabled','sort']} token={token} onReload={load} notify={notify} />}{tab === 'routes' && <CollectionPanel title="甄选路线" items={routes} type="routes" editing={editing} setEditing={setEditing} form={routeForm} setForm={setRouteForm} onSubmit={saveRoute} onDelete={remove} onAdd={() => { setEditing('new'); setRouteForm(emptyRoute) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} onReload={load} />}{tab === 'destinationTypes' && <DestinationTypesPanel title="目的地分类" items={destinationTypes} onSave={saveDestinationType} onDelete={remove} onStatusChange={updateCollectionStatus} onReload={load} />}{tab === 'destinations' && <CollectionPanel title="精选目的地" items={destinations} type="destinations" editing={editing} setEditing={setEditing} form={destinationForm} setForm={setDestinationForm} onSubmit={saveDestination} onDelete={remove} onAdd={() => { setEditing('new'); setDestinationForm(emptyDestination) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} onReload={load} destination attractions={attractions} types={destinationTypes} />}{tab === 'attractions' && <AttractionsPanel attractions={attractions} editing={editing} setEditing={setEditing} form={attractionForm} setForm={setAttractionForm} onSubmit={saveAttraction} onDelete={remove} onAdd={() => { setEditing('new'); setAttractionForm(emptyAttraction) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} onReload={load} />}{tab === 'sampleItineraries' && <SampleItinerariesPanel itineraries={sampleItineraries} editing={editing} setEditing={setEditing} form={itineraryForm} setForm={setItineraryForm} onSubmit={saveItinerary} onDelete={remove} onAdd={() => { setEditing('new'); setItineraryForm(emptyItinerary) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} onReload={load} />}{tab === 'customTrips' && <CustomTripsPanel trips={customTrips} editing={editing} setEditing={setEditing} form={customTripForm} setForm={setCustomTripForm} onSubmit={saveCustomTrip} onDelete={remove} onAdd={() => { setEditing('new'); setCustomTripForm(emptyCustomTrip) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} onReload={load} />}{tab === 'leads' && <LeadPanel leads={leads} onUpdate={updateLead} onReload={load} />}{tab === 'guideBookings' && <BookingPanel title="导游预约" eyebrow="RICHARD LI / GUIDE BOOKINGS" items={guideBookings} onUpdate={updateLead} onReload={load} guide />}{tab === 'miniProgramBookings' && <BookingPanel title="小程序预约" eyebrow="MINIPROGRAM BOOKINGS" items={miniProgramBookings} onUpdate={updateLead} onReload={load} />}{tab === 'miniprogramUsers' && <MiniProgramUsersPanel items={miniProgramUsers} onReload={load} />}{tab === 'miniprogramOrders' && <MiniProgramOrdersPanel orders={miniProgramOrders} onReload={load} />}{tab === 'miniprogramTrips' && <MiniProgramTripPanel leads={leads} onUpdate={updateLead} onReload={load} />}{tab === 'miniprogramTravelers' && <MiniRecordPanel title="小程序出行人" kind="travelers" items={miniProgramTravelers} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} onReload={load} />}{tab === 'miniprogramDocuments' && <MiniRecordPanel title="小程序签证资料" kind="documents" items={miniProgramDocuments} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} onReload={load} />}{tab === 'miniprogramCoupons' && <MiniRecordPanel title="小程序优惠券" kind="coupons" items={miniProgramCoupons} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} onReload={load} />}{tab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} onSubmit={saveSettings} onUpload={uploadOgImage} onUploadImage={uploadImage} />}</section></main>
}

function Overview({ stats, commerceStats, onTab, onReload, leads }) {
  const windows = [['today', '今天'], ['last7Days', '近 7 天'], ['last30Days', '近 30 天']]
  return <div className="admin-content"><div className="admin-stat-grid"><StatCard icon={FileText} label="已发布路线" value={stats.routes} /><StatCard icon={MapPinned} label="目的地" value={stats.destinations} tone="gold" /><StatCard icon={Users} label="全部线索" value={stats.leads} tone="green" /><StatCard icon={BarChart3} label="待处理" value={stats.pendingLeads} tone="coral" /><StatCard icon={CalendarDays} label="导游预约" value={stats.guideBookings} tone="gold" /><StatCard icon={Smartphone} label="小程序预约" value={stats.miniProgramBookings} tone="green" /><StatCard icon={CreditCard} label="已支付订单" value={commerceStats.totals.paidOrderCount} tone="green" /><StatCard icon={Users} label="终身会员" value={commerceStats.totals.memberCount} tone="gold" /><StatCard icon={CreditCard} label="累计支付" value={adminMoney(commerceStats.totals.amount)} tone="coral" /></div><div className="admin-panel admin-commerce-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">PAYMENT / MEMBERSHIP</span><h2>支付经营概览</h2><p className="admin-muted">按北京时间统计订单、已支付订单、终身会员和支付金额。</p></div><ReloadButton onReload={onReload} /></div><div className="admin-table-wrap"><table className="admin-table admin-commerce-table"><thead><tr><th>时间范围</th><th>订单量</th><th>已支付订单</th><th>终身会员</th><th>支付金额</th></tr></thead><tbody>{windows.map(([key, label]) => { const item = commerceStats.windows[key] || {}; return <tr key={key}><td><strong>{label}</strong></td><td>{item.orderCount || 0}</td><td>{item.paidOrderCount || 0}</td><td>{item.memberCount || 0}</td><td>{adminMoney(item.amount)}</td></tr> })}</tbody></table></div></div><div className="admin-overview-grid"><div className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONTENT FLOW</span><h2>内容工作台</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button onClick={() => onTab('routes')}>管理内容 <ChevronRight size={15} /></button></div></div><div className="flow-list"><div><span className="flow-icon blue"><FileText size={17} /></span><span><strong>甄选路线</strong><small>维护首页主题路线与卖点文案</small></span><b>{stats.routes}</b></div><div><span className="flow-icon gold"><MapPinned size={17} /></span><span><strong>精选目的地</strong><small>维护目的地卡片和中英文名称</small></span><b>{stats.destinations}</b></div><div><span className="flow-icon green"><Users size={17} /></span><span><strong>行程咨询</strong><small>跟进用户提交的规划需求</small></span><b>{stats.pendingLeads} 待处理</b></div><div><span className="flow-icon gold"><CalendarDays size={17} /></span><span><strong>导游预约</strong><small>Richard 日期、时长与报价跟进</small></span><b>{stats.pendingGuideBookings} 待处理</b></div></div></div><div className="admin-panel admin-lead-preview"><div className="admin-panel-head"><div><span className="admin-eyebrow">LATEST LEADS</span><h2>最近线索</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button onClick={() => onTab('leads')}>查看全部 <ChevronRight size={15} /></button></div></div>{leads.length ? leads.slice(-4).reverse().map((lead) => <div className="mini-lead" key={lead.id}><span>{lead.destination || '希腊定制'}</span><strong>{lead.contact}</strong><small>{lead.status === 'new' ? '待处理' : lead.status}</small></div>) : <div className="admin-empty">还没有新线索。前台提交后会实时出现在这里。</div>}</div></div></div>
}

function GuideArrayEditor({ value, onChange, kind }) {
  const items = Array.isArray(value) ? value : []
  const config = {
    credentials: { eyebrow: 'CREDENTIALS / TRUST', title: '专业背书', addLabel: '添加背书', description: '用卡片维护教育背景、从业履历和当地资质，前台会按顺序展示。', empty: '还没有专业背书。', newItem: (nextIndex) => ({ index: String(nextIndex).padStart(2, '0'), title: '', desc: '' }), fields: [['title', '背书标题', '如：名校教育'], ['desc', '背书说明', '填写教育、履历或资质说明']] },
    directions: { eyebrow: 'DIRECTIONS / SPECIALTIES', title: '擅长方向', addLabel: '添加方向', description: '每个方向包含主题、简介、适合人群和建议时长，方便客户快速选择。', empty: '还没有擅长方向。', newItem: (nextIndex) => ({ key: `direction-${nextIndex}`, index: String(nextIndex).padStart(2, '0'), title: '', subtitle: '', desc: '', suitable: '', duration: '' }), fields: [['title', '方向标题', '如：雅典文明'], ['subtitle', '方向副标题', '如：历史与建筑讲解'], ['desc', '方向说明', '用一两句话说明具体服务内容'], ['suitable', '适合人群', '如：适合首次到访 / 亲子家庭'], ['duration', '建议时长', '如：半日 · 1日']] },
    reviews: { eyebrow: 'REVIEWS / SOCIAL PROOF', title: '客户评价', addLabel: '添加评价', description: '每条评价单独维护，保留客户称呼和行程类型，避免直接编辑大段 JSON。', empty: '还没有客户评价。', newItem: () => ({ quote: '', name: '', meta: '' }), fields: [['quote', '评价内容', '客户对讲解或服务的真实反馈'], ['name', '客户称呼', '如：北京 · L女士'], ['meta', '行程类型', '如：亲子文化之旅']] },
  }[kind]
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(next) }
  return <section className={`admin-subeditor guide-array-editor guide-array-${kind}`}><AdminArrayHeader eyebrow={config.eyebrow} title={config.title} count={items.length} description={config.description} onAdd={() => onChange([...items, config.newItem(items.length + 1)])} addLabel={config.addLabel} />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={index}><div className="admin-array-card-head"><div><strong>{String(index + 1).padStart(2, '0')} · {item.title || item.name || '待填写'}</strong><small>{kind === 'credentials' ? '专业背书' : kind === 'directions' ? '服务方向' : '客户反馈'}</small></div><ReorderButtons index={index} count={items.length} onMove={move} onRemove={(removeIndex) => onChange(items.filter((_, itemIndex) => itemIndex !== removeIndex))} label={config.title} /></div><div className="admin-form-grid">{config.fields.map(([field, label, placeholder]) => <label key={field} className={field === 'desc' || field === 'quote' ? 'wide-field' : ''}><span>{label}</span>{field === 'desc' || field === 'quote' ? <textarea rows="3" value={item[field] || ''} placeholder={placeholder} onChange={(event) => update(index, { [field]: event.target.value })} /> : <input value={item[field] || ''} placeholder={placeholder} onChange={(event) => update(index, { [field]: event.target.value })} />}</label>)}</div></article>)}</div> : <div className="admin-array-empty">{config.empty} 点击右上角“{config.addLabel}”开始维护。</div>}</section>
}

function MasterField({ label, value, onChange, type = 'text', placeholder = '', required = false }) {
  if (type === 'textarea') return <label className="wide-field"><span>{label}</span><textarea rows="3" value={value || ''} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} /></label>
  return <label><span>{label}</span><input type={type} value={value ?? ''} placeholder={placeholder} required={required} onChange={(event) => onChange(event.target.value)} /></label>
}

function DestinationTypesPanel({ title, items, onSave, onDelete, onStatusChange, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  function openNew() { setEditing('new'); setForm({ key: '', name: '', nameTw: '', nameEn: '', description: '', enabled: true, sort: Math.max(0, ...items.map((item) => Number(item.sort) || 0)) + 1 }) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">DESTINATION CATEGORIES</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={openNew}><Plus size={15} />新增分类</button></div></div><div className="destination-types-context"><span>小程序首页 Tab</span><p>名称控制 Tab 文案，排序控制显示顺序。</p></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>名称</th><th>说明</th><th>排序</th><th>状态</th><th>操作</th></tr></thead><tbody>{[...items].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0)).map((item) => <tr key={item.key || item.id}><td>{item.key || item.id}</td><td><strong>{item.name}</strong><small>{item.nameTw || item.name} / {item.nameEn || item.name}</small></td><td>{item.description || '—'}</td><td>{item.sort ?? 0}</td><td><StatusSelect value={item.enabled === false ? 'unpublished' : 'published'} options={publicationStatusOptions} onChange={(status) => onStatusChange('destinationCategories', item.key || item.id, status === 'published' ? { enabled: true } : { enabled: false })} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.key || item.id); setForm({ ...item }) }}>编辑</button><button className="danger" onClick={() => { if (window.confirm(`删除“${item.name}”前，请先将关联目的地改到其他分类；否则它们不会显示在小程序首页。\n\n仍要删除吗？`)) onDelete('destinationCategories', item.key || item.id) }}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无分类，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}目的地分类`} onClose={() => setEditing(null)}><form className="admin-form" onSubmit={(event) => { event.preventDefault(); onSave(editing, form, () => setEditing(null)) }}><div className="admin-form-grid"><label>分类 ID（目的地的 type 字段引用它，如 culture / island）<input required pattern="[a-z0-9-]+" value={form.key || form.id || ''} onChange={(e) => setForm({ ...form, key: e.target.value })} disabled={editing !== 'new'} /></label><label>简体名称（小程序 Tab 名）<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label></div><div className="admin-form-grid"><label>繁体名称<input required value={form.nameTw || ''} onChange={(e) => setForm({ ...form, nameTw: e.target.value })} /></label><label>英文名称<input required value={form.nameEn || ''} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} /></label></div><label>说明备注<textarea rows="2" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="admin-form-grid"><label>状态<select value={form.enabled === false ? 'unpublished' : 'published'} onChange={(e) => setForm({ ...form, enabled: e.target.value === 'published' })}><option value="published">启用</option><option value="unpublished">停用</option></select></label><label>排序（数字越小越靠前）<input type="number" value={form.sort ?? 0} onChange={(e) => setForm({ ...form, sort: Number(e.target.value) || 0 })} /></label></div><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function MasterPanel({ title, collection, items, fields, token, onReload, notify, labels: labelsProp }) {
  const [editing, setEditing] = useState(null)
  const [copying, setCopying] = useState(false)
  const [form, setForm] = useState({})
  const isGuide = collection === 'guides'
  const template = isGuide ? formTemplates.guide : formTemplates.country
  const labels = { id: '唯一 ID', countryId: '所属国家 ID', name: '简体中文姓名', nameTw: '繁体中文姓名', nameEn: '英文姓名', role: '简体中文角色', roleTw: '繁体中文角色', roleEn: '英文角色', intro: '简体中文简介', introTw: '繁体中文简介', introEn: '英文简介', location: '服务地区', wechat: '微信号', eyebrow: '英文眉题', proof: '背书摘要', storyTitle: '故事标题', story1: '故事正文一', story2: '故事正文二', storyNote: '故事引语', quoteKicker: '引语眉题', quote: '主引语', quoteFoot: '引语脚注', heroImage: '国家代表图', avatar: '导游头像', fullImage: '详情形象图', enabled: '发布状态', featured: '首页推荐', sort: '展示排序', ...(labelsProp || {}) }
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })) }
  async function uploadImage(file, field) {
    if (!file) return ''
    if (!/^image\/(?:png|jpeg|webp)$/.test(file.type)) { notify('请选择 PNG、JPG 或 WebP 图片'); return '' }
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    try { const result = await callApi('/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: file.name, type: file.type, data, prefix: field }) }); return result.path } catch (error) { notify(error.message); return '' }
  }
  async function save(event) {
    event.preventDefault()
    const payload = { ...form }
    try { await callApi(`/admin/${collection}${editing && editing !== 'new' ? `/${editing}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await onReload(); setEditing(null); setCopying(false); notify(`${title}已保存`) } catch (error) { notify(error.message) }
  }
  async function updateStatus(itemId, status) { try { await callApi(`/admin/${collection}/${itemId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ enabled: status === 'published' }) }); await onReload(); notify('状态已更新') } catch (error) { notify(error.message) } }
  function openNew() { setCopying(false); setEditing('new'); setForm(isGuide ? { countryId: 'greece', enabled: true, featured: false, sort: 1, credentials: [], directions: [], reviews: [] } : { enabled: true, sort: 1 }) }
  function copyGuide(item) {
    const copy = JSON.parse(JSON.stringify(item))
    const suffix = Date.now().toString(36).slice(-6)
    copy.id = `${item.id || 'guide'}-copy-${suffix}`
    copy.name = `${item.name || '导游'}（副本）`
    copy.nameTw = `${item.nameTw || item.name || '導遊'}（副本）`
    copy.nameEn = `${item.nameEn || item.name || 'Guide'} (Copy)`
    copy.enabled = false
    copy.featured = false
    copy.sort = Math.max(0, ...items.map((entry) => Number(entry.sort) || 0)) + 1
    setCopying(true); setEditing('new'); setForm(copy); notify('已复制导游资料，请编辑后保存')
  }
  function field(field) { return <MasterField label={labels[field] || field} value={form[field]} onChange={(value) => update(field, value)} type={['intro', 'introTw', 'introEn', 'storyTitle', 'story1', 'story2', 'storyNote', 'quote', 'quoteFoot', 'proof'].includes(field) ? 'textarea' : field === 'sort' ? 'number' : 'text'} /> }
  function renderGuideForm() {
    return <>
      <section className="admin-subeditor master-editor-section"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">IDENTITY / GUIDE PROFILE</span><h3>导游身份与三语资料</h3><p>先维护导游的基本身份、展示名称和对外联系方式。</p></div></div><div className="admin-form-grid"><div>{field('id')}</div><div>{field('countryId')}</div><div>{field('name')}</div><div>{field('nameTw')}</div><div>{field('nameEn')}</div><div>{field('role')}</div><div>{field('roleTw')}</div><div>{field('roleEn')}</div><div>{field('location')}</div><div>{field('wechat')}</div><div>{field('eyebrow')}</div><div>{field('proof')}</div></div><div className="admin-form-grid"><div>{field('intro')}</div><div>{field('introTw')}</div><div>{field('introEn')}</div></div></section>
      <section className="admin-subeditor master-editor-section"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">VISUAL / IMAGE ASSETS</span><h3>头像与形象图</h3><p>点击图片上传或拖拽图片到卡片中，上传后会立即显示预览。</p></div></div><div className="master-image-grid"><ImageUploadField label="导游头像" value={form.avatar} onChange={(value) => update('avatar', value)} onUpload={(file) => uploadImage(file, 'guide-avatar')} required /><ImageUploadField label="详情形象图" value={form.fullImage} onChange={(value) => update('fullImage', value)} onUpload={(file) => uploadImage(file, 'guide-profile')} /></div></section>
      <section className="admin-subeditor master-editor-section"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">STORY / QUOTE</span><h3>故事与引语</h3><p>这些内容用于导游详情页的故事区和品牌引语区。</p></div></div><div className="admin-form-grid"><div>{field('storyTitle')}</div><div>{field('quoteKicker')}</div><div>{field('story1')}</div><div>{field('story2')}</div><div>{field('storyNote')}</div><div>{field('quote')}</div><div>{field('quoteFoot')}</div></div></section>
      <GuideArrayEditor kind="credentials" value={form.credentials} onChange={(value) => update('credentials', value)} />
      <GuideArrayEditor kind="directions" value={form.directions} onChange={(value) => update('directions', value)} />
      <GuideArrayEditor kind="reviews" value={form.reviews} onChange={(value) => update('reviews', value)} />
      <section className="admin-subeditor master-editor-section master-publish-section"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">PUBLISH / VISIBILITY</span><h3>发布设置</h3><p>列表中的状态也可以直接切换；这里用于保存推荐和排序设置。</p></div></div><div className="admin-form-grid"><label><span>发布状态</span><select value={String(form.enabled ?? true)} onChange={(event) => update('enabled', event.target.value === 'true')}><option value="true">发布</option><option value="false">下架</option></select></label><label><span>首页推荐</span><select value={String(form.featured ?? false)} onChange={(event) => update('featured', event.target.value === 'true')}><option value="true">推荐</option><option value="false">不推荐</option></select></label><div>{field('sort')}</div></div></section>
    </>
  }
  function renderCountryForm() { return <section className="admin-subeditor master-editor-section"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">COUNTRY / MASTER DATA</span><h3>国家基础资料</h3><p>维护三语国家名称、展示排序和代表图片。</p></div></div><div className="admin-form-grid"><div>{field('id')}</div><div>{field('name')}</div><div>{field('nameTw')}</div><div>{field('nameEn')}</div><div>{field('sort')}</div></div><ImageUploadField label="国家代表图" value={form.heroImage} onChange={(value) => update('heroImage', value)} onUpload={(file) => uploadImage(file, 'country-hero')} required /></section> }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MASTER DATA / {collection.toUpperCase()}</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={openNew}><Plus size={15} />新增</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>名称</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td><div className="table-title">{(item.avatar || item.heroImage) && <img src={assetPath(item.avatar || item.heroImage)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.name || item.nameEn || item.id}</strong><small>{isGuide ? (item.role || item.roleEn || '导游资料') : (item.nameEn || '国家资料')}</small></span></div></td><td><StatusSelect value={publicationValue(item.enabled === false ? 'unpublished' : 'published')} options={publicationStatusOptions} onChange={(status) => updateStatus(item.id, status)} /></td><td><div className="table-actions">{isGuide && <button className="table-copy-button" onClick={() => copyGuide(item)}><Copy size={14} />复制</button>}<button onClick={() => { setCopying(false); setEditing(item.id); setForm({ ...item }) }}>编辑</button><button className="danger" onClick={async () => { if (window.confirm('确认删除？')) { await callApi(`/admin/${collection}/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); onReload() } }}>删除</button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无数据，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? (copying ? '复制' : '新增') : '编辑'}${title}`} template={template} onClose={() => { setEditing(null); setCopying(false) }} onFillDemo={() => setForm(templateDemo(isGuide ? 'guide' : 'country'))}><form className="admin-form master-editor-form" onSubmit={save}>{isGuide ? renderGuideForm() : renderCountryForm()}<button className="admin-primary" type="submit"><Save size={15} />保存{editing === 'new' ? '并发布' : ''}</button></form></AdminEditorPage>}</div>
}

function LegacyMasterPanel2({ title, collection, items, fields, token, onReload, notify }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const isGuide = collection === 'guides'
  const jsonFields = ['credentials', 'directions', 'reviews']
  const imageFields = isGuide ? ['avatar', 'fullImage'] : ['heroImage']
  const textAreas = ['intro', 'introTw', 'introEn', 'storyTitle', 'story1', 'story2', 'storyNote', 'quote', 'quoteFoot']
  const labels = { id: '唯一 ID', countryId: '所属国家', name: '简体中文名称', nameTw: '繁体中文名称', nameEn: '英文名称', role: '简体中文角色', roleTw: '繁体中文角色', roleEn: '英文角色', intro: '简体中文简介', introTw: '繁体中文简介', introEn: '英文简介', location: '所在地区', wechat: '微信号', avatar: '头像', fullImage: '详情形象图', heroImage: '国家代表图', eyebrow: '英文眉题', proof: '背书摘要', storyTitle: '故事标题', story1: '故事正文一', story2: '故事正文二', storyNote: '故事引语', quoteKicker: '引语眉题', quote: '主引语', quoteFoot: '引语脚注', credentials: '三项背书 JSON', directions: '四个擅长方向 JSON', reviews: '客户评价 JSON', featured: '首页推荐', enabled: '发布状态', sort: '排序' }
  const editorFields = isGuide ? [...fields, 'storyTitle', 'story1', 'story2', 'storyNote', 'quoteKicker', 'quote', 'quoteFoot'].filter((field, index, list) => list.indexOf(field) === index) : fields
  const template = isGuide ? formTemplates.guide : formTemplates.country
  async function uploadImage(file, field) {
    if (!file) return ''
    if (!/^image\/(?:png|jpeg|webp)$/.test(file.type)) { notify('请选择 PNG、JPG 或 WebP 图片'); return '' }
    const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })
    try { const result = await callApi('/admin/upload-image', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ name: file.name, type: file.type, data, prefix: field }) }); return result.path } catch (error) { notify(error.message); return '' }
  }
  async function save(event) {
    event.preventDefault()
    const payload = { ...form }
    for (const field of jsonFields) if (typeof payload[field] === 'string') { try { payload[field] = JSON.parse(payload[field]) } catch { notify(`${labels[field]}必须是有效 JSON`); return } }
    try { await callApi(`/admin/${collection}${editing && editing !== 'new' ? `/${editing}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await onReload(); setEditing(null); notify(`${title}已保存`) } catch (error) { notify(error.message) }
  }
  async function updateStatus(itemId, status) { try { await callApi(`/admin/${collection}/${itemId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ enabled: status === 'published' }) }); await onReload(); notify('状态已更新') } catch (error) { notify(error.message) } }
  function fieldEditor(field) {
    if (imageFields.includes(field)) return <ImageUploadField label={labels[field]} value={form[field]} onChange={(value) => setForm({ ...form, [field]: value })} onUpload={(file) => uploadImage(file, field)} required={field === 'avatar' || field === 'heroImage'} />
    if (jsonFields.includes(field)) return <textarea rows="7" value={typeof form[field] === 'string' ? form[field] : JSON.stringify(form[field] ?? [], null, 2)} onChange={(event) => setForm({ ...form, [field]: event.target.value })} placeholder="请输入 JSON 数组" />
    if (field === 'enabled' || field === 'featured') return <select value={String(form[field] ?? (field === 'enabled'))} onChange={(event) => setForm({ ...form, [field]: event.target.value === 'true' })}><option value="true">启用</option><option value="false">停用</option></select>
    if (textAreas.includes(field)) return <textarea rows="3" value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
    return <input type={field === 'sort' ? 'number' : field === 'wechat' ? 'text' : 'text'} value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />
  }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MASTER DATA / {collection.toUpperCase()}</span><h2>{title}</h2></div><button className="admin-primary small" onClick={() => { setEditing('new'); setForm({ enabled: true, featured: false, sort: 1, ...(isGuide ? { countryId: 'greece' } : {}) }) }}><Plus size={15} />新增</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>名称</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td><div className="table-title">{(item.avatar || item.heroImage) && <img src={assetPath(item.avatar || item.heroImage)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.name || item.nameEn || item.id}</strong><small>{isGuide ? (item.role || item.roleEn || '导游资料') : (item.nameEn || '国家资料')}</small></span></div></td><td><StatusSelect value={publicationValue(item.enabled === false ? 'unpublished' : 'published')} options={publicationStatusOptions} onChange={(status) => updateStatus(item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...item }) }}>编辑</button><button className="danger" onClick={async () => { if (window.confirm('确认删除？')) { await callApi(`/admin/${collection}/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); onReload() } }}>删除</button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无数据，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}${title}`} template={template} onClose={() => setEditing(null)} onFillDemo={() => setForm(templateDemo(isGuide ? 'guide' : 'country'))}><form className="admin-form" onSubmit={save}>{editorFields.map((field) => imageFields.includes(field) ? fieldEditor(field) : <label key={field}><span>{labels[field] || field}</span>{fieldEditor(field)}</label>)}<button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function LegacyMasterPanel({ title, collection, items, fields, token, onReload, notify }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const jsonFields = ['credentials', 'directions', 'reviews']
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  async function save(event) {
    event.preventDefault()
    const payload = { ...form }
    for (const field of jsonFields) if (typeof payload[field] === 'string') { try { payload[field] = JSON.parse(payload[field]) } catch { notify(`${field} 必须是有效 JSON`) ; return } }
    try { await callApi(`/admin/${collection}${editing && editing !== 'new' ? `/${editing}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await onReload(); setEditing(null); notify('已保存') } catch (error) { notify(error.message) }
  }
  function fieldEditor(field) {
    if (jsonFields.includes(field)) return <textarea rows="6" value={typeof form[field] === 'string' ? form[field] : JSON.stringify(form[field] ?? [], null, 2)} onChange={(event) => update(field, event.target.value)} placeholder="请输入 JSON 数组" />
    if (field === 'enabled' || field === 'featured') return <select value={String(form[field] ?? true)} onChange={(event) => update(field, event.target.value === 'true')}><option value="true">启用</option><option value="false">下架</option></select>
    return <input value={form[field] ?? ''} onChange={(event) => update(field, event.target.value)} />
  }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MASTER DATA / {collection.toUpperCase()}</span><h2>{title}</h2></div><button className="admin-primary small" onClick={() => { setEditing('new'); setForm({ enabled: true, sort: 1 }) }}><Plus size={15} />新增</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>名称</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.name || item.nameEn || item.id}</td><td>{item.enabled === false ? '下架' : '启用'}</td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm(item) }}>编辑</button><button className="danger" onClick={async () => { if (window.confirm('确认删除？')) { await callApi(`/admin/${collection}/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); onReload() } }}>删除</button></div></td></tr>)}</tbody></table></div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}${title}`} onClose={() => setEditing(null)}><form className="admin-form" onSubmit={save}>{fields.map((field) => <label key={field}>{field}{fieldEditor(field)}</label>)}<button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function LegacyMasterPanelOld({ title, collection, items, setItems, fields, token, onReload, notify }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const jsonFields = ['credentials', 'directions', 'reviews']
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const save = async (event) => { event.preventDefault(); const payload = { ...form }; jsonFields.forEach((field) => { if (typeof payload[field] === 'string') { try { payload[field] = JSON.parse(payload[field]) } catch { /* keep text so the server can report invalid data */ } } }); try { await callApi(`/admin/${collection}${editing && editing !== 'new' ? `/${editing}` : ''}`, { method: editing === 'new' ? 'POST' : 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }); await onReload(); setEditing(null); notify('已保存') } catch (error) { notify(error.message) } }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MASTER DATA / {collection.toUpperCase()}</span><h2>{title}</h2></div><button className="admin-primary small" onClick={() => { setEditing('new'); setForm({ enabled: true, sort: 1 }) }}><Plus size={15} />新增</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>名称</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.id}</td><td>{item.name || item.nameEn || item.id}</td><td>{item.enabled === false ? '下架' : '启用'}</td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm(item) }}>编辑</button><button className="danger" onClick={async () => { if (window.confirm('确认删除？')) { await callApi(`/admin/${collection}/${item.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); onReload() } }}>删除</button></div></td></tr>)}</tbody></table></div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}${title}`} onClose={() => setEditing(null)}><form className="admin-form" onSubmit={save}>{fields.map((field) => <label key={field}>{field}<input value={form[field] ?? ''} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></label>)}<button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div> }

function AttractionMultiSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const selectedIds = Array.isArray(value) ? value : []
  const selectedSet = new Set(selectedIds)
  const selectedItems = options.filter((item) => selectedSet.has(item.id))
  useEffect(() => {
    if (!open) return undefined
    function closeOnOutside(event) { if (!containerRef.current?.contains(event.target)) setOpen(false) }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [open])
  function toggle(id) {
    onChange(selectedSet.has(id) ? selectedIds.filter((itemId) => itemId !== id) : [...selectedIds, id])
  }
  function selectAll() { onChange([...new Set([...selectedIds, ...options.map((item) => item.id)])]) }
  function clear() { onChange([]) }
  const label = selectedItems.length
    ? selectedItems.slice(0, 2).map((item) => item.name).join('、') + (selectedItems.length > 2 ? ` 等 ${selectedItems.length} 个景点` : '')
    : selectedIds.length ? `${selectedIds.length} 个已关联景点` : '请选择关联景点'
  return <div className="destination-attraction-select" ref={containerRef}>
    <button type="button" className={`destination-attraction-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox" disabled={!options.length}>
      <span>{options.length ? label : '暂无可关联景点'}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div className="destination-attraction-menu" role="listbox" aria-multiselectable="true" aria-label="关联景点选项">
      <div className="destination-attraction-menu-head"><span>已选择 {selectedIds.length} 个</span><div><button type="button" onClick={selectAll}>全选</button><button type="button" onClick={clear}>清空</button></div></div>
      <div className="destination-attraction-menu-options">{options.map((item) => <label key={item.id} className={selectedSet.has(item.id) ? 'is-selected' : ''} role="option" aria-selected={selectedSet.has(item.id)}>
        <input type="checkbox" checked={selectedSet.has(item.id)} onChange={() => toggle(item.id)} />
        <span><strong>{item.name}</strong><small>{item.id} · {item.cityName || item.city}{item.status !== 'published' ? ' · 已停用' : ''}</small></span>
      </label>)}</div>
    </div>}
  </div>
}

function CollectionPanel({ title, items, type, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange, onReload, destination, attractions = [], types = [] }) {
  const modalTitle = editing === 'new' ? `新增${destination ? '目的地' : '路线'}` : `编辑${destination ? '目的地' : '路线'}`
  const selectedAttractionIds = Array.isArray(form?.attractionIds) ? form.attractionIds : (form?.attractionId ? [form.attractionId] : [])
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{destination ? 'DESTINATION LIBRARY' : 'CURATED PACKAGES'}</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增{destination ? '目的地' : '路线'}</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>名称</th><th>{destination ? '分类 / 城市 / 关联景点' : '天数 / 标签'}</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={assetPath(item.image)} alt="" loading="lazy" decoding="async" />}<span><strong>{destination ? item.name : item.title}</strong><small>{destination ? item.en : item.kicker}</small></span></div></td><td>{destination ? <><StatusSelect value={item.type || ''} options={types.map((t) => ({ value: t.id, label: t.name }))} onChange={(value) => onStatusChange(type, item.id, { type: value })} /><small>{item.cityId || '未设置城市'} · {Array.isArray(item.attractionIds) ? item.attractionIds.length : item.attractionId ? 1 : 0} 个关联景点</small></> : `${item.days} · ${item.tags}`}</td><td><StatusSelect value={publicationValue(item.status)} options={publicationStatusOptions} onChange={(status) => onStatusChange(type, item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm(destination ? destinationFormValue(item, attractions) : item) }}>编辑</button><button className="danger" onClick={() => onDelete(type, item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无内容，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={modalTitle} template={destination ? formTemplates.destination : formTemplates.route} onClose={() => { setEditing(null); setForm(destination ? emptyDestination : emptyRoute) }} onFillDemo={() => setForm(templateDemo(destination ? 'destination' : 'route'))}><form className="admin-form" onSubmit={onSubmit}>{destination ? <><div className="admin-form-grid"><label>中文名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>英文名称<input required value={form.en || ''} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label></div><div className="admin-form-grid"><label>分类<select required value={form.type || ''} onChange={(e) => setForm({ ...form, type: e.target.value })}>{types.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}</select></label><label>城市聚合页<select required value={form.cityId || ''} onChange={(e) => setForm({ ...form, cityId: e.target.value })}><option value="">请选择城市</option>{attractionCities.map((city) => <option value={city.id} key={city.id}>{city.name} · {city.id}</option>)}</select></label></div><fieldset className="destination-attraction-picker"><legend>关联景点（多选下拉框，使用稳定景点 ID）</legend><AttractionMultiSelect options={attractions} value={selectedAttractionIds} onChange={(next) => setForm({ ...form, attractionIds: next, attractionId: next[0] || '' })} /><small className="admin-muted">旧数据中的单个 attractionId 会自动回显为一项；打开下拉框后可全选、清空或逐项调整。前台仅展示有效且已发布的景点。</small></fieldset><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'destination')} required /></> : <><div className="admin-form-grid"><label>天数<input required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label><label>路线副标题<input required value={form.kicker} onChange={(e) => setForm({ ...form, kicker: e.target.value })} /></label></div><label>路线名称<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>人群标签<input required value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label><label>行程简介<textarea required rows="3" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'route')} required /></>}<label>发布状态<select value={publicationValue(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">发布</option><option value="unpublished">下架</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function LegacyLeadPanel({ leads, onUpdate }) { return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONSULTATION CRM</span><h2>咨询 CRM</h2></div><span className="admin-muted">共 {leads.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>目的地 / 主题</th><th>出行计划</th><th>联系方式</th><th>状态</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>{new Date(lead.createdAt).toLocaleString('zh-CN')}</td><td><strong>{lead.destination || '—'}</strong><small>{leadTypeLabel(lead.leadType)} · {lead.themes?.join(' · ') || '未填写主题'}</small></td><td>{lead.businessPeriod || lead.bookingDate || lead.travelDate || lead.travelMonth || '—'}<small>{lead.companionDuration || lead.serviceLength || lead.duration || ''} · {lead.travelers || ''}</small></td><td>{lead.contact}</td><td><select className={`lead-status ${lead.status}`} value={lead.status} onChange={(e) => onUpdate(lead.id, e.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></td></tr>)}</tbody></table>{!leads.length && <div className="admin-empty">暂无咨询记录。前台提交后，记录会自动进入这里。</div>}</div></div></div> }
function LegacyBookingPanel({ title, eyebrow, items, onUpdate, guide = false }) {
  const statusLabels = { new: '待处理', contacted: '已联系', quoted: '已报价', closed: '已完成' }
  function dateLabel(value) { return value ? new Date(value).toLocaleString('zh-CN') : '—' }
  return <div className="admin-content"><div className="admin-panel collection-panel booking-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="admin-muted">共 {items.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr>{guide ? <><th>预约日期</th><th>服务 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源 / 提交时间</th></> : <><th>提交时间</th><th>预约内容</th><th>日期 / 时长 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源</th></>}<th>状态</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{guide ? <><td><strong>{item.bookingDate || item.travelMonth || '—'}</strong><small>{item.status === 'new' ? '待确认时间' : statusLabels[item.status] || item.status}</small></td><td>{item.serviceLength || item.duration || '—'}<small>{item.travelers || '—'}</small></td><td><strong>{item.requirements || item.route || '—'}</strong><small>{item.destination || 'Richard 李'}</small></td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'website'}<small>{dateLabel(item.createdAt)}</small></td></> : <><td>{dateLabel(item.createdAt)}</td><td><strong>{item.destination || item.title || '小程序预约'}</strong><small>{item.leadType || 'mini-program-booking'}</small></td><td>{item.bookingDate || item.travelMonth || '—'}<small>{item.serviceLength || item.duration || '—'} · {item.travelers || '—'}</small></td><td>{item.requirements || item.route || '—'}</td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'miniprogram'}</td></>}<td><select className={`lead-status ${item.status}`} value={item.status || 'new'} onChange={(event) => onUpdate(item.id, event.target.value)}><option value="new">{statusLabels.new}</option><option value="contacted">{statusLabels.contacted}</option><option value="quoted">{statusLabels.quoted}</option><option value="closed">{statusLabels.closed}</option></select></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无预约记录。新的预约提交后会自动出现在这里。</div>}</div></div></div>
}

function LegacyMiniProgramUsersPanel({ items }) { return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM USERS / PROFILE</span><h2>小程序用户</h2></div><span className="admin-muted">共 {items.length} 位</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>手机号</th><th>预约</th><th>行程</th><th>资料</th><th>优惠券</th><th>创建时间</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.avatarUrl && <img src={item.avatarUrl} alt="" loading="lazy" decoding="async" />}<span><strong>{item.nickname || item.id}</strong><small>{item.id}</small></span></div></td><td>{item.phoneMasked || '未绑定'}</td><td>{item.stats?.appointments || 0}</td><td>{item.stats?.trips || 0}</td><td>{item.stats?.profiles || 0}</td><td>{item.stats?.coupons || 0}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '—'}</td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无小程序用户。</div>}</div></div></div> }

function LegacyMiniProgramTripPanel({ leads, onUpdate }) { const items = leads.filter((lead) => isMiniProgramBooking(lead) && ['customization', 'business-travel'].includes(lead.leadType)); return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM TRIPS</span><h2>小程序行程</h2></div><span className="admin-muted">共 {items.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>用户</th><th>主题</th><th>日期 / 人数</th><th>联系方式</th><th>状态</th></tr></thead><tbody>{items.map((lead) => <tr key={lead.id}><td>{lead.createdAt ? new Date(lead.createdAt).toLocaleString('zh-CN') : '—'}</td><td>{lead.userId || '—'}</td><td><strong>{lead.destination || '—'}</strong><small>{leadTypeLabel(lead.leadType)}</small></td><td>{lead.businessPeriod || lead.travelDate || lead.travelMonth || '—'}<small>{lead.travelers || ''}</small></td><td>{lead.contact || '—'}</td><td><select className={`lead-status ${lead.status}`} value={lead.status || 'new'} onChange={(e) => onUpdate(lead.id, e.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无小程序行程。</div>}</div></div></div> }

function MiniRecordPanel({ title, kind, items, users, onSave, onDelete, onReload }) {
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({})
  const isTraveler = kind === 'travelers'; const isDocument = kind === 'documents'; const isCoupon = kind === 'coupons'
  function openNew() { setEditing('new'); setForm({ userId: users[0]?.id || '', ...(isTraveler ? { name: '', relation: '', passportNo: '' } : isDocument ? { name: '', passportNo: '', expiry: '', visaStatus: '' } : { title: '', description: '', code: '', expiresAt: '', status: 'active' }) }) }
  function fillDemo() { setForm(templateDemo(kind, { users })) }
  function generateCode() { let code = generateCouponCode(); while (items.some((item) => item.code === code)) code = generateCouponCode(); setForm((current) => ({ ...current, code })) }
  function openEdit(item) { setEditing(item.id); setForm({ ...item }) }
  function submit(event) { event.preventDefault(); onSave(kind, editing === 'new' ? null : editing, form); setEditing(null) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM / {kind.toUpperCase()}</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><span className="admin-muted">共 {items.length} 条</span><button className="admin-primary small" onClick={openNew}>新增</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{isTraveler ? <><th>用户</th><th>姓名</th><th>关系</th><th>护照号</th></> : isDocument ? <><th>用户</th><th>资料名称</th><th>护照号</th><th>有效期</th><th>签证状态</th></> : <><th>用户</th><th>优惠券</th><th>代码</th><th>有效期</th><th>状态</th></>}<th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{isTraveler ? <><td>{item.userNickname || item.userId}</td><td>{item.name}</td><td>{item.relation || '—'}</td><td>{item.passportNo || '—'}</td></> : isDocument ? <><td>{item.userNickname || item.userId}</td><td>{item.name}</td><td>{item.passportNo || '—'}</td><td>{item.expiry || '—'}</td><td><StatusSelect value={item.visaStatus} options={visaStatusOptions} onChange={(status) => onSave(kind, item.id, { visaStatus: status })} /></td></> : <><td>{item.userNickname || item.userId}</td><td>{item.title}</td><td>{item.code || '—'}</td><td>{item.expiresAt || '—'}</td><td><StatusSelect value={item.status} options={couponStatusOptions} onChange={(status) => onSave(kind, item.id, { status })} /></td></>}<td><div className="table-actions"><button onClick={() => openEdit(item)}>编辑</button><button className="danger" onClick={() => onDelete(kind, item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无资料记录。</div>}</div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}${title}`} template={formTemplates[kind]} onClose={() => setEditing(null)} onFillDemo={fillDemo}><form className="admin-form" onSubmit={submit}><label>所属用户<select required disabled={editing !== 'new'} value={form.userId || ''} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">请选择用户</option>{users.map((user) => <option value={user.id} key={user.id}>{user.nickname || user.id}</option>)}</select></label>{isTraveler && <><label>姓名<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>关系<input value={form.relation || ''} onChange={(e) => setForm({ ...form, relation: e.target.value })} /></label><label>护照号<input value={form.passportNo || ''} onChange={(e) => setForm({ ...form, passportNo: e.target.value })} /></label></>}{isDocument && <><label>资料名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>护照号<input value={form.passportNo || ''} onChange={(e) => setForm({ ...form, passportNo: e.target.value })} /></label><DateField label="有效期" value={form.expiry} onChange={(expiry) => setForm({ ...form, expiry })} /><label>签证状态<input value={form.visaStatus || ''} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })} /></label></>}{isCoupon && <><label>优惠券名称<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>说明<textarea rows="3" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="admin-code-field">优惠码<div className="admin-field-with-action"><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /><button type="button" className="admin-secondary" onClick={generateCode}>自动生成优惠码</button></div><small>点击生成格式化优惠码，也可以手动修改。</small></label><DateField label="有效期" value={form.expiresAt} onChange={(expiresAt) => setForm({ ...form, expiresAt })} /><label>状态<select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">有效</option><option value="used">已使用</option><option value="expired">已过期</option></select></label></>}<button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function AttractionsPanel({ attractions = [], editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange, onReload }) {
  const itemForm = (item) => ({ ...emptyAttraction, ...item, cityName: attractionCityName(item.city, item.cityName), tags: (item.tags || []).join('、'), highlights: item.highlights || [], exhibits: normalizeExhibits(item.exhibits), guide: item.guide || {}, articles: item.articles || [], deepDive: item.deepDive || { preview: '', locked: [] } })
  const anchors = [
    { id: 'attraction-basic', label: '基础信息' },
    { id: 'attraction-share', label: '分享设置' },
    { id: 'attraction-highlights', label: '景点亮点', count: (form.highlights || []).length },
    { id: 'attraction-exhibits', label: '讲解点', count: normalizeExhibits(form.exhibits).length },
    { id: 'attraction-guide', label: '游览指南', count: GUIDE_FIELDS.filter(([key]) => form.guide?.[key]).length },
    { id: 'attraction-articles', label: '相关文章', count: (form.articles || []).length },
    { id: 'attraction-deepdive', label: '深度内容', count: (form.deepDive?.locked || []).length },
    { id: 'attraction-publish', label: '发布状态' },
  ]
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">ATTRACTIONS & MUSEUMS</span><h2>景点管理</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增景点</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>景点</th><th>城市 / 类型</th><th>状态</th><th>操作</th></tr></thead><tbody>{attractions.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={assetPath(item.image)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.name}</strong><small>{item.originalName || item.en}</small></span></div></td><td>{item.cityName}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}<small>{item.type === 'museum' ? '博物馆' : '景点'} · {(item.exhibits || []).length} 讲解点 · {(item.highlights || []).length} 亮点</small></td><td><StatusSelect value={publicationValue(item.status)} options={publicationStatusOptions} onChange={(status) => onStatusChange('attractions', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm(itemForm(item)) }}>编辑</button><button className="danger" onClick={() => onDelete('attractions', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!attractions.length && <div className="admin-empty">暂无景点，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增景点' : '编辑景点'} template={formTemplates.attraction} anchors={anchors} onClose={() => { setEditing(null); setForm(emptyAttraction) }} onFillDemo={() => setForm(templateDemo('attraction'))}>
<form className="admin-form" onSubmit={onSubmit}>
<section className="admin-anchor-section" id="attraction-basic">
<div className="admin-form-grid">
<label>中文名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
</label>
<label>英文名称<input required value={form.en || ''} onChange={(e) => setForm({ ...form, en: e.target.value })} />
</label>
</div>
<label>希腊语原名<input value={form.originalName || ''} onChange={(e) => setForm({ ...form, originalName: e.target.value })} />
</label>
<div className="admin-form-grid">
<label>所属城市<select value={form.city || 'athens'} onChange={(e) => setForm({ ...form, city: e.currentTarget.value, cityName: attractionCityName(e.currentTarget.value) })}>
{attractionCities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}
</select>
</label>
<label>类型<select value={form.type || 'landmark'} onChange={(e) => setForm({ ...form, type: e.target.value })}>
<option value="landmark">景点</option>
<option value="museum">博物馆</option>
</select>
</label>
</div>
<div className="admin-form-grid">
<label>分类（如世界文化遗产）<input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
</label>
<label>规模标签<select value={form.sizeLabel || ''} onChange={(e) => setForm({ ...form, sizeLabel: e.target.value })}>
<option value="">无</option>
<option value="超大型">超大型</option>
<option value="大型">大型</option>
<option value="中型">中型</option>
</select>
</label>
</div>
<label>标签（逗号分隔）<input value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
</label>
<ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'attraction')} required />
<label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
</label>
</section>
<section className="admin-anchor-section" id="attraction-share">
<div className="admin-subeditor-head"><div><span className="admin-eyebrow">MINIPROGRAM SHARE</span><h3>小程序分享设置</h3><p>仅影响小程序景点详情页的分享卡片。标题/图片留空时，客户端自动回退为景点名称与主图。</p></div></div>
<label>分享标题<input value={form.shareTitle || ''} placeholder="留空则使用景点名称" onChange={(e) => setForm({ ...form, shareTitle: e.target.value })} /></label>
<ImageUploadField label="分享图片" value={form.shareImage} onChange={(image) => setForm({ ...form, shareImage: image })} onUpload={(file) => onUpload(file, 'attraction-share')} hint="留空则使用景点主图；支持远程图片地址" />
</section>
<section className="admin-anchor-section" id="attraction-highlights">
<HighlightsEditor value={form.highlights} onChange={(highlights) => setForm({ ...form, highlights })} />
</section>
<section className="admin-anchor-section" id="attraction-exhibits">
<AttractionExhibitsEditor exhibits={form.exhibits} onChange={(exhibits) => setForm({ ...form, exhibits })} onUpload={onUpload} />
</section>
<section className="admin-anchor-section" id="attraction-guide">
<GuideEditor value={form.guide} onChange={(guide) => setForm({ ...form, guide })} />
</section>
<section className="admin-anchor-section" id="attraction-articles">
<ArticlesEditor value={form.articles} onChange={(articles) => setForm({ ...form, articles })} onUpload={onUpload} />
</section>
<section className="admin-anchor-section" id="attraction-deepdive">
<DeepDiveEditor value={form.deepDive} onChange={(deepDive) => setForm({ ...form, deepDive })} />
</section>
<section className="admin-anchor-section" id="attraction-publish">
<label>发布状态<select value={publicationValue(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}>
<option value="published">发布</option>
<option value="unpublished">下架</option>
</select>
</label>
</section>
<button className="admin-primary admin-anchor-save" type="submit"><Save size={15} />保存</button>
</form>
</AdminEditorPage>}</div>
}

function SampleItinerariesPanel({ itineraries, attractions = [], editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange, onReload }) {
  const attractionOptions = useAdminAttractions(attractions)
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SAMPLE ITINERARIES</span><h2>参考行程</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增参考行程</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>行程</th><th>天数</th><th>状态</th><th>操作</th></tr></thead><tbody>{itineraries.map((item) => <tr key={item.id}><td><div className="table-title">{item.cover && <img src={assetPath(item.cover)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.title}</strong><small>{(item.itinerary || []).length} 天数据 · {item.tag || '未分类'}</small></span></div></td><td>{item.days} 天</td><td><StatusSelect value={publicationValue(item.status)} options={publicationStatusOptions} onChange={(status) => onStatusChange('sampleItineraries', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyItinerary, ...item, itinerary: Array.isArray(item.itinerary) ? item.itinerary : [] }) }}>编辑</button><button className="danger" onClick={() => onDelete('sampleItineraries', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!itineraries.length && <div className="admin-empty">暂无参考行程。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增参考行程' : '编辑参考行程'} template={formTemplates.itinerary} onClose={() => { setEditing(null); setForm(emptyItinerary) }} onFillDemo={() => setForm(templateDemo('itinerary'))}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>行程名称<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>天数<input required type="number" min="1" value={form.days || 3} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label></div><div className="admin-form-grid"><label>行程标签<input value={form.tag || ''} placeholder="如：短途 · 中转" onChange={(e) => setForm({ ...form, tag: e.target.value })} /></label><label>适合人群<input value={form.crowd || ''} placeholder="如：首次到访 / 亲子 / 商务" onChange={(e) => setForm({ ...form, crowd: e.target.value })} /></label></div><ImageUploadField label="封面图片" value={form.cover} onChange={(cover) => setForm({ ...form, cover })} onUpload={(file) => onUpload(file, 'itinerary')} required /><label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><ItineraryDaysEditor value={form.itinerary} onChange={(itinerary) => setForm({ ...form, itinerary })} attractions={attractionOptions} /><label>发布状态<select value={publicationValue(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">发布</option><option value="unpublished">下架</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function CustomTripsPanel({ trips, attractions = [], editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onStatusChange, onReload }) { const period = periodParts(form.period); function updatePeriod(key, value) { const next = { ...period, [key]: value }; setForm({ ...form, period: periodValue(next.start, next.end) }) }
  const attractionOptions = useAdminAttractions(attractions)
  function copyLink(token) { navigator.clipboard?.writeText(`${window.location.origin}/trip/${token}`).then(() => window.alert('分享链接已复制：/trip/' + token)).catch(() => window.alert('分享链接：/trip/' + token)) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CUSTOM TRIPS · PRIVATE LINKS</span><h2>定制行程</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增定制行程</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>客户 / 订单</th><th>日期 / 人数</th><th>分享链接</th><th>状态</th><th>操作</th></tr></thead><tbody>{trips.map((item) => <tr key={item.id}><td><strong>{item.client}</strong><small>{item.orderNo || item.id}</small></td><td>{item.period}<small>{item.travelers}</small></td><td><button className="table-link" onClick={() => copyLink(item.token)}><Link2 size={13} />/trip/{item.token}</button></td><td><StatusSelect value={item.status} options={customTripStatusOptions} onChange={(status) => onStatusChange('customTrips', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyCustomTrip, ...item, days: Array.isArray(item.days) ? item.days : [], notices: Array.isArray(item.notices) ? item.notices : [] }) }}>编辑</button><button className="danger" onClick={() => onDelete('customTrips', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!trips.length && <div className="admin-empty">暂无定制行程。新增后会自动生成私密分享链接，发给客户即可打开。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增定制行程' : '编辑定制行程'} template={formTemplates.customTrip} onClose={() => { setEditing(null); setForm(emptyCustomTrip) }} onFillDemo={() => setForm(templateDemo('customTrip'))}><form className="admin-form" onSubmit={onSubmit}><label>行程标题<input required value={form.title || ''} placeholder="如：希腊家庭定制旅程" onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><div className="admin-form-grid"><label>客户称呼<input required value={form.client || ''} onChange={(e) => setForm({ ...form, client: e.target.value })} /></label><label>订单编号<input value={form.orderNo || ''} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} /></label></div><div className="admin-form-grid"><DateField label="开始日期" value={period.start} onChange={(value) => updatePeriod('start', value)} required /><DateField label="结束日期" value={period.end} min={period.start} onChange={(value) => updatePeriod('end', value)} required /></div><label>旅客人数<input value={form.travelers || ''} onChange={(e) => setForm({ ...form, travelers: e.target.value })} /></label><div className="admin-form-grid"><label>语种需求<input value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></label><label>服务费总额<input value={form.totalFee || ''} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} /></label></div><label>计划车型<input value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label><label>司导说明<textarea rows="2" value={form.guide || ''} onChange={(e) => setForm({ ...form, guide: e.target.value })} /></label><CustomTripDaysEditor value={form.days} onChange={(days) => setForm({ ...form, days })} period={form.period} attractions={attractionOptions} /><NoticesEditor value={form.notices} onChange={(notices) => setForm({ ...form, notices })} /><label>状态<select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">生效中</option><option value="archived">已停用</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存{editing === 'new' ? '并生成链接' : ''}</button></form></AdminEditorPage>}</div>
}

function useAdminAttractions(fallback = []) { const [items, setItems] = useState(fallback); useEffect(() => { if (fallback.length) return; callApi('/admin/attractions', { headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` } }).then((next) => setItems(Array.isArray(next) ? next : [])).catch(() => {}) }, [fallback.length]); return items }
const LEAD_TYPES = [{ value: 'customization', label: '行程定制咨询' }, { value: 'guide-booking', label: '古迹人文讲解预约' }, { value: 'vehicle-consultation', label: '用车资源对接咨询' }, { value: 'knowledge-base', label: '景点文史知识库' }, { value: 'business-travel', label: '商旅随行咨询' }, { value: 'mini-program-booking', label: '小程序预约' }]
function leadDateField(lead) { if (lead.leadType === 'guide-booking' || lead.bookingDate) return 'bookingDate'; if (lead.leadType === 'vehicle-consultation' || lead.vehicleDate) return 'vehicleDate'; return 'travelDate' }
function parseLeadRange(value) { const compact = String(value || '').replace(/\s/g, ''); const stored = compact.match(/^(\d{8})~(\d{4})$/); if (stored) return { start: dateInputValue(stored[1]), end: `${stored[1].slice(0, 4)}-${stored[2].slice(0, 2)}-${stored[2].slice(2)}` }; const match = compact.match(/(\d{4})[^\d]?(\d{1,2})[^\d]?(\d{1,2})[^\d]*(?:到|至|[-–—])[^\d]*(\d{1,2})[^\d]?(\d{1,2})?/); if (!match) return { start: '', end: '' }; const year = match[1]; const month = String(match[2]).padStart(2, '0'); const startDay = String(match[3]).padStart(2, '0'); const endMonth = match[5] ? String(match[5]).padStart(2, '0') : month; const endDay = String(match[6] || match[4]).padStart(2, '0'); return { start: `${year}-${month}-${startDay}`, end: `${year}-${endMonth}-${endDay}` } }
function LeadEditorPage({ title, lead, onClose, onSave }) {
  const [form, setForm] = useState(() => { const range = parseLeadRange(lead.businessPeriod); return { ...lead, themes: Array.isArray(lead.themes) ? lead.themes.join('、') : (lead.themes || ''), _businessStart: range.start, _businessEnd: range.end } })
  const dateKey = leadDateField(form)
  function update(key, value) { setForm((current) => ({ ...current, [key]: value })) }
  async function submit(event) { event.preventDefault(); const payload = { ...form, themes: String(form.themes || '').split(/[,，、\s]+/).filter(Boolean) }; if (form._businessStart || form._businessEnd) payload.businessPeriod = periodValue(form._businessStart, form._businessEnd); delete payload._businessStart; delete payload._businessEnd; delete payload.id; delete payload.createdAt; delete payload.source; delete payload.platform; delete payload.userId; delete payload.guideSlug; await onSave(lead.id, payload); onClose() }
  return <AdminEditorPage title={title} template={formTemplates.lead} onClose={onClose} onFillDemo={() => setForm(templateDemo('lead'))}><form className="admin-form" onSubmit={submit}><div className="admin-form-grid"><label>咨询类型<select value={form.leadType || 'customization'} onChange={(event) => update('leadType', event.target.value)}>{LEAD_TYPES.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>联系方式<input required value={form.contact || ''} onChange={(event) => update('contact', event.target.value)} /></label></div><div className="admin-form-grid"><label>目的地 / 点位<input value={form.site || form.destination || ''} onChange={(event) => update(form.site !== undefined ? 'site' : 'destination', event.target.value)} /></label><label>出行人数<input value={form.travelers || ''} onChange={(event) => update('travelers', event.target.value)} /></label></div><DateField label={dateKey === 'bookingDate' ? '预约日期' : dateKey === 'vehicleDate' ? '用车日期' : '出行日期'} value={form[dateKey]} onChange={(value) => update(dateKey, value)} /><div className="admin-form-grid"><DateField label="商务周期开始" value={form._businessStart} onChange={(value) => update('_businessStart', value)} /><DateField label="商务周期结束" value={form._businessEnd} min={form._businessStart} onChange={(value) => update('_businessEnd', value)} /></div><div className="admin-form-grid"><label>服务时长<input value={form.serviceLength || form.companionDuration || form.duration || ''} onChange={(event) => update(form.serviceLength ? 'serviceLength' : form.companionDuration ? 'companionDuration' : 'duration', event.target.value)} /></label><label>语种需求<input value={form.language || ''} onChange={(event) => update('language', event.target.value)} /></label></div><div className="admin-form-grid"><label>行业 / 用车需求<input value={form.industryNeeds || form.vehicleNeed || ''} onChange={(event) => update(form.industryNeeds ? 'industryNeeds' : 'vehicleNeed', event.target.value)} /></label><label>关注主题<input value={form.themes || ''} onChange={(event) => update('themes', event.target.value)} /></label></div><label>补充说明<textarea rows="5" value={form.requirements || ''} onChange={(event) => update('requirements', event.target.value)} /></label><label>状态<select value={form.status || 'new'} onChange={(event) => update('status', event.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>
}

function LeadPanel({ leads, onUpdate, onReload }) { const [editing, setEditing] = useState(null); return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONSULTATION CRM</span><h2>咨询 CRM</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><span className="admin-muted">共 {leads.length} 条</span></div></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>目的地 / 主题</th><th>出行计划</th><th>联系方式</th><th>状态</th><th>操作</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>{lead.createdAt ? new Date(lead.createdAt).toLocaleString('zh-CN') : '—'}</td><td><strong>{lead.destination || lead.site || '—'}</strong><small>{leadTypeLabel(lead.leadType)} · {(lead.themes || []).join?.(' · ') || '未填写主题'}</small></td><td>{lead.businessPeriod || lead.bookingDate || lead.travelDate || lead.travelMonth || '—'}<small>{lead.companionDuration || lead.serviceLength || lead.duration || ''} · {lead.travelers || ''}</small></td><td>{lead.contact || '—'}</td><td><StatusSelect value={lead.status || 'new'} options={[{ value: 'new', label: '待处理' }, { value: 'contacted', label: '已联系' }, { value: 'quoted', label: '已报价' }, { value: 'closed', label: '已完成' }]} onChange={(status) => onUpdate(lead.id, status)} /></td><td><button className="table-edit-button" onClick={() => setEditing(lead)}>编辑</button></td></tr>)}</tbody></table>{!leads.length && <div className="admin-empty">暂无咨询记录。前台提交后，记录会自动进入这里。</div>}</div></div>{editing && <LeadEditorPage title="编辑咨询记录" lead={editing} onClose={() => setEditing(null)} onSave={onUpdate} />}</div> }

function BookingPanel({ title, eyebrow, items, onUpdate, onReload, guide = false }) { const [editing, setEditing] = useState(null); return <div className="admin-content"><div className="admin-panel collection-panel booking-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><span className="admin-muted">共 {items.length} 条</span></div></div><div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr><th>提交时间</th><th>{guide ? '预约日期' : '预约内容'}</th><th>日期 / 时长 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '—'}</td><td><strong>{guide ? (item.bookingDate || item.travelMonth || '—') : (item.destination || item.title || '小程序预约')}</strong><small>{guide ? (item.serviceLength || item.duration || '—') : leadTypeLabel(item.leadType)}</small></td><td>{item.bookingDate || item.travelDate || item.travelMonth || '—'}<small>{item.serviceLength || item.companionDuration || item.duration || '—'} · {item.travelers || '—'}</small></td><td>{item.requirements || item.route || item.site || '—'}</td><td>{item.contact || '—'}</td><td><StatusSelect value={item.status || 'new'} options={[{ value: 'new', label: '待处理' }, { value: 'contacted', label: '已联系' }, { value: 'quoted', label: '已报价' }, { value: 'closed', label: '已完成' }]} onChange={(status) => onUpdate(item.id, status)} /></td><td><button className="table-edit-button" onClick={() => setEditing(item)}>编辑</button></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无预约记录。新的预约提交后会自动出现在这里。</div>}</div></div>{editing && <LeadEditorPage title={`编辑${title}记录`} lead={editing} onClose={() => setEditing(null)} onSave={onUpdate} />}</div> }

function paymentStatusLabel(status) { return ({ paid: '已支付', pending: '待支付', closed: '已关闭', failed: '失败' })[status] || status || '未知' }
function MiniProgramOrdersPanel({ orders, onReload }) {
  const [selectedOrder, setSelectedOrder] = useState(null)
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM / ORDERS</span><h2>订单管理</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><span className="admin-muted">共 {orders.length} 条</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>订单编号</th><th>用户</th><th>支付金额</th><th>支付时间</th><th>支付项目</th><th>支付状态</th><th>操作</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong className="admin-order-id">{order.id}</strong><small>{order.outTradeNo || '—'}</small></td><td><strong>{order.userNickname}</strong><small>{order.phoneMasked || '未绑定'}</small></td><td>{adminMoney((Number(order.amountTotal) || 0) / 100)}</td><td>{adminDate(order.paidAt)}</td><td>{order.productType === 'membership' ? '终身会员' : order.name || order.productType || '—'}{order.attractionId && <small>{order.attractionId}</small>}</td><td><span className={`status-pill ${order.status || ''}`}>{paymentStatusLabel(order.status)}</span></td><td><button className="table-link" type="button" onClick={() => setSelectedOrder(order)}>查看详情</button></td></tr>)}</tbody></table>{!orders.length && <div className="admin-empty">暂无支付订单。</div>}</div></div>{selectedOrder && <div className="admin-order-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedOrder(null) }}><section className="admin-order-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="order-detail-title"><div className="admin-order-detail-head"><div><span className="admin-eyebrow">ORDER DETAIL</span><h2 id="order-detail-title">订单详情</h2></div><button className="admin-icon-button" type="button" aria-label="关闭订单详情" onClick={() => setSelectedOrder(null)}><X size={17} /></button></div><div className="admin-order-detail-grid"><div><span>订单编号</span><strong>{selectedOrder.id}</strong></div><div><span>用户</span><strong>{selectedOrder.userNickname}</strong></div><div><span>手机号</span><strong>{selectedOrder.phoneMasked || '未绑定'}</strong></div><div><span>支付项目</span><strong>{selectedOrder.productType === 'membership' ? '终身会员' : selectedOrder.name || selectedOrder.productType || '—'}</strong></div><div><span>支付金额</span><strong>{adminMoney((Number(selectedOrder.amountTotal) || 0) / 100)}</strong></div><div><span>支付时间</span><strong>{adminDate(selectedOrder.paidAt)}</strong></div><div><span>支付状态</span><strong><span className={`status-pill ${selectedOrder.status || ''}`}>{paymentStatusLabel(selectedOrder.status)}</span></strong></div><div><span>微信交易状态</span><strong>{selectedOrder.wechatTradeState || '—'}</strong></div><div><span>创建时间</span><strong>{adminDate(selectedOrder.createdAt)}</strong></div><div><span>商户订单号</span><strong>{selectedOrder.outTradeNo || '—'}</strong></div><div><span>微信交易号</span><strong>{selectedOrder.transactionId || '—'}</strong></div></div></section></div>}</div>
}

function MiniProgramUsersPanel({ items, onReload, onSave = async (userId, payload) => { await callApi(`/admin/miniprogram-users/${userId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` }, body: JSON.stringify(payload) }); window.location.reload() } }) { const [editing, setEditing] = useState(null); return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM USERS / PROFILE</span><h2>小程序用户</h2></div><div className="admin-panel-head-actions"><ReloadButton onReload={onReload} /><span className="admin-muted">共 {items.length} 位</span></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>手机号</th><th>会员</th><th>预约</th><th>行程</th><th>资料</th><th>优惠券</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.avatarUrl && <img src={item.avatarUrl} alt="" loading="lazy" decoding="async" />}<span><strong>{item.nickname || item.id}</strong><small>{item.id}</small></span></div></td><td>{item.phoneMasked || '未绑定'}</td><td>{item.member ? <span className="status-pill paid">{item.memberLabel || '终身会员'}</span> : <span className="status-pill">普通用户</span>}</td><td>{item.stats?.appointments || 0}</td><td>{item.stats?.trips || 0}</td><td>{item.stats?.profiles || 0}</td><td>{item.stats?.coupons || 0}</td><td><button className="table-edit-button" onClick={() => setEditing(item)}>编辑</button></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无小程序用户。</div>}</div></div>{editing && <MiniUserEditorPage user={editing} onClose={() => setEditing(null)} onSave={onSave} />}</div> }

function MiniUserEditorPage({ user, onClose, onSave }) { const [form, setForm] = useState({ nickname: user.nickname || '', phone: '' }); async function submit(event) { event.preventDefault(); await onSave(user.id, form); onClose() } return <AdminEditorPage title="编辑小程序用户" template={formTemplates.miniprogramUser} onClose={onClose} onFillDemo={() => setForm(templateDemo('miniprogramUser'))}><form className="admin-form" onSubmit={submit}><div className="admin-user-identity">{user.avatarUrl ? <img src={user.avatarUrl} alt="用户头像" /> : <span>{(user.nickname || '用').slice(0, 1)}</span>}<div><strong>{user.nickname || user.id}</strong><small>{user.id} · 微信头像由小程序同步维护</small></div></div><label>用户昵称<input required value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></label><label>手机号（可选）<input type="tel" value={form.phone} placeholder={`当前：${user.phoneMasked || '未绑定'}，留空保持不变`} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><p className="admin-muted">头像与微信身份信息由小程序同步，后台不提供图片地址输入框。</p><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage> }

function MiniProgramTripPanel({ leads, onUpdate, onReload }) { const items = leads.filter((lead) => isMiniProgramBooking(lead) && ['customization', 'business-travel'].includes(lead.leadType)); return <BookingPanel title="小程序行程" eyebrow="MINIPROGRAM TRIPS" items={items} onUpdate={onUpdate} onReload={onReload} /> }

function MiniKnowledgeSettings({ value, onChange }) {
  const config = { trialSeconds: 60, products: { attraction: {}, membership: {} }, ...(value || {}) }
  const products = { attraction: { name: '单景点永久讲解（模拟）', price: 0.01, currency: 'CNY', enabled: true, ...(config.products?.attraction || {}) }, membership: { name: '终身会员（模拟）', price: 0.01, currency: 'CNY', enabled: true, ...(config.products?.membership || {}) } }
  function updateProduct(productType, key, next) { onChange({ ...config, products: { ...products, [productType]: { ...products[productType], [key]: next } } }) }
  return <section className="mini-knowledge-config" aria-labelledby="mini-knowledge-title"><div><span className="admin-eyebrow">MINI PROGRAM / SIMULATION</span><h3 id="mini-knowledge-title">知识库试看与模拟商品</h3><p>仅供联调使用，不会发起真实微信支付；接口是否开放由服务器环境变量控制。</p></div><div className="mini-knowledge-fields"><label>试看时长（秒）<input type="number" min="0" max="3600" value={config.trialSeconds} onChange={(e) => onChange({ ...config, trialSeconds: e.target.value })} /></label>{Object.entries(products).map(([productType, product]) => <fieldset key={productType}><legend>{productType === 'attraction' ? '单景点永久讲解' : '终身会员'}</legend><label><input type="checkbox" checked={product.enabled !== false} onChange={(e) => updateProduct(productType, 'enabled', e.target.checked)} />启用模拟商品</label><label>商品名称<input value={product.name || ''} onChange={(e) => updateProduct(productType, 'name', e.target.value)} /></label><div className="admin-form-grid"><label>模拟价格<input type="number" min="0" step="0.01" value={product.price ?? 1} onChange={(e) => updateProduct(productType, 'price', e.target.value)} /></label><label>货币<input value={product.currency || 'CNY'} maxLength="12" onChange={(e) => updateProduct(productType, 'currency', e.target.value)} /></label></div></fieldset>)}</div></section>
}

function HomeBannersEditor({ value, onChange, onUpload }) {
  const items = Array.isArray(value) ? value : []
  function withSort(next) { return next.map((item, index) => ({ ...item, sort: index + 1 })) }
  function update(index, patch) { onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)) }
  function move(index, offset) { const target = index + offset; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; onChange(withSort(next)) }
  function add() { onChange([...items, { id: localId('home-banner'), title: '', alt: '', image: '', enabled: true, sort: items.length + 1 }]) }
  return <section className="admin-subeditor home-banners-editor"><AdminArrayHeader eyebrow="HOME / BANNERS" title="首页 Banner" count={items.length} description="维护首页轮播图片、替代文本、排序和启停状态；保存站点配置后前台立即从内容接口读取。" onAdd={add} addLabel="新增 Banner" />{items.length ? <div className="admin-array-list">{items.map((item, index) => <article className="admin-array-card" key={item.id || index}><div className="admin-array-card-head"><div><strong>Banner {String(index + 1).padStart(2, '0')} · {item.title || '未命名'}</strong><small>{item.enabled === false ? '已停用' : '启用中'} · 排序 {item.sort || index + 1}</small></div><ReorderButtons index={index} count={items.length} onMove={move} onRemove={(removeIndex) => onChange(withSort(items.filter((_, itemIndex) => itemIndex !== removeIndex)))} label="首页 Banner" /></div><div className="admin-form-grid"><label>Banner 标题<input value={item.title || ''} placeholder="如：探索希腊的另一种方式" onChange={(event) => update(index, { title: event.target.value })} /></label><label>排序<input type="number" min="1" value={item.sort ?? index + 1} onChange={(event) => update(index, { sort: Number(event.target.value) || index + 1 })} /></label></div><label>图片替代文本<input value={item.alt || ''} placeholder="用于无障碍与图片说明" onChange={(event) => update(index, { alt: event.target.value })} /></label><ImageUploadField label="Banner 图片" value={item.image} onChange={(image) => update(index, { image })} onUpload={(file) => onUpload(file, 'home-banner')} required /><label><span>发布状态</span><select value={item.enabled === false ? 'unpublished' : 'published'} onChange={(event) => update(index, { enabled: event.target.value === 'published' })}><option value="published">启用</option><option value="unpublished">停用</option></select></label></article>)}</div> : <div className="admin-array-empty">暂未配置首页 Banner，将使用系统安全回退图片。</div>}</section>
}

function SettingsPanel({ settings, setSettings, onSubmit, onUpload, onUploadImage }) { const update = (key, value) => setSettings({ ...settings, [key]: value }); const [accessSaving, setAccessSaving] = useState(false); const accessEnabled = settings.miniprogramAccess !== false; async function onAccessChange(enabled) { if (accessSaving || accessEnabled === enabled) return; setAccessSaving(true); try { await callApi('/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${sessionStorage.getItem(TOKEN_KEY)}` }, body: JSON.stringify({ miniprogramAccess: enabled }) }); setSettings({ ...settings, miniprogramAccess: enabled }); } catch (error) { window.alert(`小程序访问设置失败：${error.message}`) } finally { setAccessSaving(false) } }; const imageUrl = settings.ogImage?.startsWith('data:') ? settings.ogImage : `/${String(settings.ogImage || '').replace(/^\//, '')}`; return <div className="admin-content"><div className="admin-panel settings-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SITE SETTINGS / SEO</span><h2>站点与 SEO 配置</h2></div></div><section className="mini-access-control" aria-labelledby="mini-access-title"><div className="mini-access-copy"><span className="admin-eyebrow">MINI PROGRAM / ACCESS</span><h3 id="mini-access-title">小程序访问控制</h3><p>关闭后，小程序会显示“正在升级中”，并暂停登录、表单提交和个人资料接口；官网前台不受影响。</p></div><div className="mini-access-actions"><span className={`mini-access-status ${accessEnabled ? 'is-enabled' : 'is-disabled'}`} role="status" aria-live="polite">{accessSaving ? '正在保存…' : accessEnabled ? '当前：正常访问' : '当前：升级维护中'}</span><div className="mini-access-buttons"><button type="button" className={accessEnabled ? 'active' : ''} onClick={() => onAccessChange(true)} aria-pressed={accessEnabled} disabled={accessSaving}>{accessSaving ? '保存中…' : '开启访问'}</button><button type="button" className={!accessEnabled ? 'active danger' : 'danger'} onClick={() => onAccessChange(false)} aria-pressed={!accessEnabled} disabled={accessSaving}>{accessSaving ? '保存中…' : '关闭访问'}</button></div></div></section><MiniKnowledgeSettings value={settings.miniprogramKnowledge} onChange={(value) => update('miniprogramKnowledge', value)} /><AdminFormTemplateGuide template={formTemplates.settings} onFill={() => setSettings({ ...templateDemo('settings'), homeEyebrow: 'GREECE TRAVEL BUTLER · TAILOR-MADE JOURNEYS', homeTitle: '只为一生美好回忆', homeDescription: '希腊在地人文与行程咨询服务。雅典在地团队，一对一中文顾问，提供文化、行程与语言陪同咨询。', homeBanners: settings.homeBanners, miniprogramAccess: accessEnabled, miniprogramKnowledge: settings.miniprogramKnowledge })} /><HomeBannersEditor value={settings.homeBanners} onChange={(homeBanners) => update('homeBanners', homeBanners)} onUpload={onUploadImage} /><form className="admin-form" onSubmit={onSubmit}><section className="admin-subeditor home-copy-editor"><div className="admin-subeditor-head"><div><span className="admin-eyebrow">HOME / HERO COPY</span><h3>首页标题与描述</h3><p>首页首屏文案由内容接口提供；接口异常时前台使用安全默认文案。</p></div></div><div className="admin-form-grid"><label>首页眉题<input value={settings.homeEyebrow || ''} placeholder="GREECE TRAVEL BUTLER · TAILOR-MADE JOURNEYS" onChange={(e) => update('homeEyebrow', e.target.value)} /></label><label>首页标题<input value={settings.homeTitle || ''} placeholder="只为一生美好回忆" onChange={(e) => update('homeTitle', e.target.value)} /></label></div><label>首页描述<textarea rows="3" value={settings.homeDescription || ''} placeholder="首页首屏介绍文案" onChange={(e) => update('homeDescription', e.target.value)} /></label></section><div className="admin-form-grid"><label>站点名称<input name="siteName" value={settings.siteName} onChange={(e) => update('siteName', e.target.value)} /></label><label>站点正式网址<input name="siteUrl" type="url" placeholder="https://sy-greece.com" value={settings.siteUrl} onChange={(e) => update('siteUrl', e.target.value)} /></label><label>默认页面标题<input name="defaultTitle" value={settings.defaultTitle} onChange={(e) => update('defaultTitle', e.target.value)} /></label><label className="og-image-field">OG 分享图片{settings.ogImage && <img src={imageUrl} alt="当前 OG 分享图片" />}<input name="ogImageFile" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onUpload(e.target.files?.[0])} /><small>{settings.ogImage ? '已上传，可重新选择图片替换' : '请选择要上传的分享图片'}</small></label></div><label>默认 SEO 描述<textarea name="defaultDescription" rows="3" value={settings.defaultDescription} onChange={(e) => update('defaultDescription', e.target.value)} /></label><label>关键词（用逗号分隔）<input name="keywords" value={settings.keywords} onChange={(e) => update('keywords', e.target.value)} /></label><div className="admin-form-grid"><label>Google Search Console 验证码<input name="googleVerification" placeholder="粘贴 meta 验证码内容" value={settings.googleVerification} onChange={(e) => update('googleVerification', e.target.value)} /></label><label>Robots 策略<select name="robotsPolicy" value={settings.robotsPolicy} onChange={(e) => update('robotsPolicy', e.target.value)}><option value="index,follow">允许收录（index, follow）</option><option value="noindex,nofollow">暂不收录（noindex, nofollow）</option></select></label></div><div className="admin-form-grid"><label>微信号<input name="wechat" value={settings.wechat} onChange={(e) => update('wechat', e.target.value)} /></label><label>联系电话<input name="phone" value={settings.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>邮箱<input name="email" type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} /></label><label>回复承诺<input name="replyHours" value={settings.replyHours} onChange={(e) => update('replyHours', e.target.value)} /></label></div><button className="admin-primary" type="submit"><Save size={15} />保存配置</button></form></div></div> }

function LegacyAttractionsPanel({ attractions, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) {
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">ATTRACTIONS & MUSEUMS</span><h2>景点管理</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增景点</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>景点</th><th>城市 / 类型</th><th>状态</th><th>操作</th></tr></thead><tbody>{attractions.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={assetPath(item.image)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.name}</strong><small>{item.originalName || item.en}</small></span></div></td><td>{item.cityName}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}<small>{item.type === 'museum' ? '博物馆' : '景点'} · {(item.exhibits || []).length} 讲解点</small></td><td><StatusSelect value={publicationValue(item.status)} options={publicationStatusOptions} onChange={(status) => onStatusChange('attractions', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyAttraction, ...item, tags: (item.tags || []).join('、'), exhibits: normalizeExhibits(item.exhibits) }) }}>编辑</button><button className="danger" onClick={() => onDelete('attractions', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!attractions.length && <div className="admin-empty">暂无景点，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增景点' : '编辑景点'} template={formTemplates.attraction} onClose={() => { setEditing(null); setForm(emptyAttraction) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>中文名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>英文名称<input required value={form.en || ''} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label></div><label>希腊语原名<input value={form.originalName || ''} onChange={(e) => setForm({ ...form, originalName: e.target.value })} /></label><div className="admin-form-grid"><label>所属城市<select value={form.city || 'athens'} onChange={(e) => setForm({ ...form, city: e.target.value, cityName: e.target.selectedOptions[0]?.dataset.name || '' })}><option value="athens" data-name="雅典">雅典</option><option value="santorini" data-name="圣托里尼">圣托里尼</option><option value="delphi" data-name="德尔斐">德尔斐</option><option value="meteora" data-name="梅黛奥拉">梅黛奥拉</option><option value="crete" data-name="克里特">克里特</option><option value="nafplio" data-name="纳夫普利翁">纳夫普利翁</option></select></label><label>类型<select value={form.type || 'landmark'} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="landmark">景点</option><option value="museum">博物馆</option></select></label></div><div className="admin-form-grid"><label>分类（如世界文化遗产）<input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>规模标签<select value={form.sizeLabel || ''} onChange={(e) => setForm({ ...form, sizeLabel: e.target.value })}><option value="">无</option><option value="超大型">超大型</option><option value="大型">大型</option><option value="中型">中型</option></select></label></div><label>标签（逗号分隔）<input value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'attraction')} required /><AttractionExhibitsEditor exhibits={form.exhibits} onChange={(exhibits) => setForm({ ...form, exhibits })} onUpload={onUpload} /><label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><label>发布状态<select value={publicationValue(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">发布</option><option value="unpublished">下架</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function LegacySampleItinerariesPanel({ itineraries, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) {
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SAMPLE ITINERARIES</span><h2>参考行程</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增参考行程</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>行程</th><th>天数</th><th>状态</th><th>操作</th></tr></thead><tbody>{itineraries.map((item) => <tr key={item.id}><td><div className="table-title">{item.cover && <img src={assetPath(item.cover)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.title}</strong><small>{(item.itinerary || []).length} 天数据</small></span></div></td><td>{item.days} 天</td><td><StatusSelect value={publicationValue(item.status)} options={publicationStatusOptions} onChange={(status) => onStatusChange('sampleItineraries', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyItinerary, ...item, itinerary: typeof item.itinerary === 'string' ? [] : (item.itinerary || []) }) }}>编辑</button><button className="danger" onClick={() => onDelete('sampleItineraries', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!itineraries.length && <div className="admin-empty">暂无参考行程。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增参考行程' : '编辑参考行程'} template={formTemplates.itinerary} onClose={() => { setEditing(null); setForm(emptyItinerary) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>行程名称<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>天数<input required type="number" min="1" value={form.days || 3} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label></div><ImageUploadField label="封面图片" value={form.cover} onChange={(cover) => setForm({ ...form, cover })} onUpload={(file) => onUpload(file, 'itinerary')} required /><label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><label>发布状态<select value={publicationValue(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">发布</option><option value="unpublished">下架</option></select></label><p className="admin-muted" style={{ marginTop: 10 }}>逐日行程（itinerary）含景点关联等结构化字段请通过数据文件或 API 维护，此处维护基本信息。</p><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function LegacyCustomTripsPanel({ trips, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) { const period = periodParts(form.period); function updatePeriod(key, value) { const next = { ...period, [key]: value }; setForm({ ...form, period: periodValue(next.start, next.end) }) }
  function copyLink(token) { navigator.clipboard?.writeText(`${window.location.origin}/trip/${token}`).then(() => window.alert('分享链接已复制：/trip/' + token)).catch(() => window.alert('分享链接：/trip/' + token)) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CUSTOM TRIPS · PRIVATE LINKS</span><h2>定制行程</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增定制行程</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>客户 / 订单</th><th>日期 / 人数</th><th>分享链接</th><th>状态</th><th>操作</th></tr></thead><tbody>{trips.map((item) => <tr key={item.id}><td><strong>{item.client}</strong><small>{item.orderNo || item.id}</small></td><td>{item.period}<small>{item.travelers}</small></td><td><button className="table-link" onClick={() => copyLink(item.token)}><Link2 size={13} />/trip/{item.token}</button></td><td><StatusSelect value={item.status} options={customTripStatusOptions} onChange={(status) => onStatusChange('customTrips', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyCustomTrip, ...item }) }}>编辑</button><button className="danger" onClick={() => onDelete('customTrips', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!trips.length && <div className="admin-empty">暂无定制行程。新增后会自动生成私密分享链接，发给客户即可打开。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增定制行程' : '编辑定制行程'} template={formTemplates.customTrip} onClose={() => { setEditing(null); setForm(emptyCustomTrip) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>客户称呼<input required value={form.client || ''} onChange={(e) => setForm({ ...form, client: e.target.value })} /></label><label>订单编号<input value={form.orderNo || ''} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} /></label></div><div className="admin-form-grid"><DateField label="开始日期" value={period.start} onChange={(value) => updatePeriod('start', value)} required /><DateField label="结束日期" value={period.end} min={period.start} onChange={(value) => updatePeriod('end', value)} required /></div><label>旅客人数<input value={form.travelers || ''} onChange={(e) => setForm({ ...form, travelers: e.target.value })} /></label><div className="admin-form-grid"><label>语种需求<input value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></label><label>服务费总额<input value={form.totalFee || ''} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} /></label></div><label>计划车型<input value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label><label>司导说明<textarea rows="2" value={form.guide || ''} onChange={(e) => setForm({ ...form, guide: e.target.value })} /></label><label>状态<select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">生效中</option><option value="archived">已停用</option></select></label><p className="admin-muted" style={{ marginTop: 10 }}>逐日行程（days：时段/服务标记/景点关联）与须知（notices 四组）为结构化字段，请通过数据文件或 API 维护；新增保存后将自动生成私密 token 分享链接。</p><button className="admin-primary" type="submit"><Save size={15} />保存{editing === 'new' ? '并生成链接' : ''}</button></form></AdminEditorPage>}</div>
}
