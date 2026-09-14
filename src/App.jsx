import React, { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, BusFront, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, CloudSun, Compass, Euro, Heart, Landmark, Mail, Map, MapPin,
  Menu, MessageCircle, Phone, Plane, Search, ShipWheel, Sparkles, SunMedium,
  Users, Waves, X,
} from 'lucide-react'
import AdminPage from './admin'
import { LanguageSwitcher, translate, useLanguage } from './i18n'

const isRootPortableFile = window.location.protocol === 'file:' && !window.location.pathname.includes('/dist/')
const IMG = isRootPortableFile ? './public/images/' : '/images/'

const images = {
  santorini: `${IMG}santorini.png`,
  athens: `${IMG}athens.png`,
  plaka: `${IMG}plaka.png`,
  delphi: `${IMG}delphi.png`,
  meteora: `${IMG}meteora.png`,
  meteoraSquare: `${IMG}meteora-square.png`,
  nafplio: `${IMG}nafplio.png`,
  couple: `${IMG}couple.png`,
  jet: `${IMG}jet.png`,
  yacht: `${IMG}yacht.png`,
  mykonos: `${IMG}mykonos.png`,
  zakynthos: `${IMG}zakynthos.png`,
  richardAvatar: `${IMG}richard-avatar.png`,
  richardProfile: `${IMG}richard-profile.png`,
  crete: `${IMG}crete.png`,
  corinth: `${IMG}corinth.png`,
}

const routes = [
  {
    slug: 'athens-3d', days: '3 天 2 晚', kicker: '雅典市区精华', title: '雅典古城漫步', tags: '短途 · 中转 · 商务间隙', desc: '卫城、宪法广场与普拉卡老城，把雅典的精华浓缩进从容的三天。', image: images.plaka, eyebrow: '3 DAYS · ATHENS CITY BREAK', destinations: ['athens'],
    intro: '为转机、商务间隙或首次到访设计的雅典精华三日：不赶路、不早起，用最从容的节奏看懂卫城与老城，随时可衔接海岛延伸行程。',
    itinerary: [
      ['D1', '抵达雅典 · 专人接机 · 普拉卡老城漫步', '华人司导举牌接机，入住宪法广场周边精品酒店。傍晚漫步普拉卡石板巷与阿纳菲奥提卡彩色小屋区，晚餐推荐屋顶餐厅远眺卫城夜景。'],
      ['D2', '雅典卫城 · 卫城博物馆 · 宪法广场换岗', '上午避开人流深度游览卫城与卫城博物馆（含中文讲解），下午观看整点换岗仪式，黄昏在 Ermou 街与中央市场感受本地生活。'],
      ['D3', '国家考古博物馆 · 蒙纳斯提拉奇跳蚤市场 · 送机', '上午在国家考古博物馆看阿伽门农黄金面具，中午逛蒙纳斯提拉奇跳蚤市场，专车送机，可无缝衔接圣托里尼等海岛延伸行程。'],
    ],
    summary: [['天数', '3 天 2 晚（可延住升级）'], ['起止', '雅典进出'], ['适合', '转机 / 商务间隙 / 首次到访'], ['包含', '酒店 · 司导 · 门票讲解 · 部分餐食']],
  },
  {
    slug: 'honeymoon-5d', days: '5 天 4 晚', kicker: '雅典 · 圣托里尼', title: '爱琴海蜜月之旅', tags: '蜜月 · 情侣 · 纪念日', desc: '伊亚落日、悬崖酒店与双体船巡航，给两个人一段只属于爱琴海的时间。', image: images.couple, featured: true, eyebrow: '5 DAYS · ATHENS + SANTORINI', destinations: ['athens', 'santorini'],
    intro: '三天雅典与蓝白圣岛的经典组合：前两天看古迹、吃老城，后三天把时间留给爱琴海。全程华人司导接送、悬崖酒店日落房型优先锁定、伊亚旅拍机位随行推荐——你只负责浪漫，其余的交给我们。',
    itinerary: [
      ['D1', '抵达雅典 · 专人接机 · 普拉卡老城欢迎晚宴', '华人司导举牌接机，入住宪法广场精品酒店。傍晚漫步普拉卡石板巷，晚餐安排屋顶餐厅远眺卫城夜景，附赠气泡酒。'],
      ['D2', '雅典卫城 · 宪法广场换岗 · 利卡贝托山日落', '上午深度游览卫城与卫城博物馆（含中文讲解），下午看整点换岗仪式，黄昏乘缆车登利卡贝托山看全城日落。'],
      ['D3', '飞抵圣托里尼 · 入住悬崖酒店 · 费拉小镇', '早班机直飞圣岛，免去 8 小时轮渡，专车接至伊亚悬崖酒店。下午自由探索费拉蓝顶教堂与悬崖步道，预留日落房型。'],
      ['D4', '爱琴海双体船出海 · 火山温泉 · 船上日落晚宴', '午后登双体船巡游火山岛、红沙滩浮潜、火山温泉泡汤，船上 BBQ 晚餐配圣岛葡萄酒，在甲板上迎接爱琴海日落。'],
      ['D5', '伊亚清晨旅拍 · 酒庄品鉴 · 送机返程', '清晨无人时段进行 1 小时旅拍，中午圣岛百年酒庄品鉴 Assyrtiko，专车送机。可延住升级 7 天行程。'],
    ],
    summary: [['天数', '5 天 4 晚（可延住升级 7 天）'], ['起止', '雅典进出，含内陆航班'], ['适合', '蜜月 / 情侣 / 纪念日，2 人成行'], ['包含', '酒店 · 司导 · 内陆机票 · 出海 · 部分餐食']],
  },
  {
    slug: 'family-7d', days: '7 天 6 晚', kicker: '雅典 · 伯罗奔尼撒', title: '经典三城家庭游', tags: '亲子 · 家庭 · 闺蜜', desc: '神话遗迹、海滨古城与在地美食，兼顾不同年龄的节奏与兴趣。', image: images.corinth, eyebrow: '7 DAYS · ATHENS + PELOPONNESE', destinations: ['athens', 'nafplio'],
    intro: '把雅典的博物馆与伯罗奔尼撒的神话遗迹串成一条线：每天车程控制在两小时内，孩子看城堡、大人逛老城，节奏松紧由家庭自己定。',
    itinerary: [
      ['D1', '抵达雅典 · 专人接机 · 宪法广场周边适应时差', '华人司导举牌接机，入住适合家庭的公寓式酒店。傍晚在宪法广场看换岗、国家花园散步，早睡倒时差。'],
      ['D2', '雅典卫城 · 卫城博物馆 · 普拉卡亲子寻宝', '上午深度游览卫城与卫城博物馆，下午在普拉卡老城进行亲子寻宝游戏（定制任务卡），晚餐安排希腊烤肉家庭餐。'],
      ['D3', '科林斯运河 · 纳夫普利翁 · 帕拉米迪城堡', '驱车跨越科林斯运河，抵达海边老城纳夫普利翁。乘车上帕拉米迪城堡俯瞰海湾，傍晚老城自由漫步与冰淇淋时间。'],
      ['D4', '迈锡尼遗址 · 埃皮达鲁斯古剧场', '上午探秘狮子门与阿伽门农墓（希腊神话现场课），下午到埃皮达鲁斯古剧场测试传声奇迹，孩子可在剧场中心朗读体验。'],
      ['D5', '波罗斯岛跳岛 · 海鲜午餐 · 海滩下午', '从加拉塔斯乘船 10 分钟登波罗斯岛，岛上钟楼与柠檬林漫步，海鲜午餐后安排海滩自由活动与游泳。'],
      ['D6', '返回雅典 · 利卡贝托山日落 · 告别晚宴', '上午返回雅典，下午乘缆车登利卡贝托山看全城日落，晚上安排普拉卡告别晚宴与民俗歌舞表演。'],
      ['D7', '国家考古博物馆 · 送机返程', '上午在国家考古博物馆看阿伽门农黄金面具（衔接迈锡尼行程），专车送机返程。'],
    ],
    summary: [['天数', '7 天 6 晚'], ['起止', '雅典进出，伯罗奔尼撒环线'], ['适合', '亲子 / 家庭 / 闺蜜，4 人成行'], ['包含', '酒店 · 司导 · 门票 · 跳岛船票 · 部分餐食']],
  },
  {
    slug: 'heritage-9d', days: '9 天 8 晚', kicker: '全遗产环游', title: '希腊全遗产深度环游', tags: '深度 · 私人定制 · 文化爱好者', desc: '从雅典到德尔斐、梅黛奥拉，跟着中文向导读懂古典希腊。', image: images.delphi, eyebrow: '9 DAYS · UNESCO HERITAGE TOUR', destinations: ['athens', 'delphi', 'meteora'],
    intro: '一条为文化爱好者设计的深度环线：雅典、德尔斐、梅黛奥拉三大世界遗产全收录，全程中文向导随行讲解，把神话与历史讲成故事。',
    itinerary: [
      ['D1', '抵达雅典 · 专人接机 · 老城欢迎晚宴', '华人司导举牌接机，入住宪法广场周边精品酒店，傍晚普拉卡老城漫步与屋顶餐厅欢迎晚宴。'],
      ['D2', '雅典卫城 · 卫城博物馆 · 古代市集', '全天雅典考古核心：卫城、卫城博物馆与古代市集（含中文向导讲解），梳理古典雅典的城市脉络。'],
      ['D3', '德尔斐 · 阿波罗神庙 · 阿拉霍瓦小镇', '驱车沿帕纳索斯山抵达"世界中心"德尔斐，游览阿波罗神庙、宝库与古剧场，傍晚宿山脚小镇阿拉霍瓦。'],
      ['D4', '梅黛奥拉 · 悬空修道院（上）', '前往卡兰巴卡，游览梅黛奥拉两座修道院（大梅黛奥拉与瓦尔拉姆），黄昏在观景台看石柱群光影。'],
      ['D5', '梅黛奥拉 · 悬空修道院（下）· 返回雅典', '清晨再访圣三一修道院（007 取景地），午后驱车返回雅典，晚上自由休整。'],
      ['D6', '国家考古博物馆 · 凯拉米克斯遗址', '上午国家考古博物馆精讲（青铜车夫像与基克拉泽斯雕像），下午凯拉米克斯古城墙遗址。'],
      ['D7', '苏尼翁角 · 波塞冬神庙日落', '上午自由活动或卫城补拍，黄昏驱车至阿提卡最南端苏尼翁角，在波塞冬神庙看爱琴海日落。'],
      ['D8', '埃伊纳岛一日跳岛 · 阿菲亚神庙', '乘船登埃伊纳岛，游览保存最完好的阿菲亚神庙，品尝岛上开心果甜品，傍晚返回雅典。'],
      ['D9', '自由活动 · 专车送机返程', '根据航班时间自由活动或补购手信，专车送机，结束九天古典希腊深度环游。'],
    ],
    summary: [['天数', '9 天 8 晚'], ['起止', '雅典进出，含德尔斐与梅黛奥拉'], ['适合', '深度游 / 文化爱好者 / 银发慢游'], ['包含', '酒店 · 司导 · 中文向导 · 全部门票 · 早餐']],
  },
]

const destinations = [
  {
    slug: 'athens', name: '雅典', en: 'ATHENS', type: 'culture', image: images.athens, eyebrow: 'ATHENS · ATTICA', headline: '西方文明的起点，也是一座活着的城市',
    intro: ['雅典不只是卫城的明信片。2500 年的帕特农神庙、宪法广场的换岗仪式、普拉卡石板巷里的手风琴声，与 Ermou 街的现代生活叠在同一座城市里。', '我们会为你安排中文讲解的卫城深度游、避开人流的清晨时段，以及本地人才知道的屋顶餐厅与老城酒馆。'],
    facts: [['最佳时间', '3–11 月'], ['建议停留', '2–3 天'], ['抵达方式', '国际直飞雅典机场']],
    routes: ['athens-3d', 'honeymoon-5d', 'family-7d', 'heritage-9d'],
  },
  {
    slug: 'delphi', name: '德尔斐', en: 'DELPHI', type: 'culture', image: images.delphi, eyebrow: 'DELPHI · PARNASSUS', headline: '古人眼中的世界中心，帕纳索斯山上的神谕之地',
    intro: ['古希腊人相信德尔斐是世界的中心（Omphalos），阿波罗神庙的女祭司在此传达神谕，各城邦的宝库至今立在圣路两侧。', '从雅典出发两小时车程，建议与阿拉霍瓦小镇和奥斯·卢卡斯修道院串成一日或两日环线，黄昏时分古剧场的视野最好。'],
    facts: [['最佳时间', '4–10 月'], ['建议停留', '1–2 天'], ['抵达方式', '雅典驱车 2.5 小时']],
    routes: ['heritage-9d'],
  },
  {
    slug: 'meteora', name: '梅黛奥拉', en: 'METEORA', type: 'culture', image: images.meteoraSquare, eyebrow: 'METEORA · THESSALY', headline: '悬在石柱之巅的修道院群，中世纪修士的天空之城',
    intro: ['数百万年风化形成的巨型石柱上，14 世纪起修士们用绳索与吊篮运石建院，鼎盛时期 24 座修道院悬于半空，如今仍有 6 座开放。', '我们安排清晨与黄昏两个观景时段，避开旅行团高峰，并可搭配卡兰巴卡小镇住宿，体验石柱群在晨雾中的样子。'],
    facts: [['最佳时间', '4–10 月'], ['建议停留', '1–2 天'], ['抵达方式', '雅典驱车 4 小时或火车']],
    routes: ['heritage-9d'],
  },
  {
    slug: 'nafplio', name: '纳夫普利翁', en: 'NAFPLIO', type: 'culture', image: images.nafplio, eyebrow: 'NAFPLIO · PELOPONNESE', headline: '希腊人自己的度假后花园，威尼斯风情的老城海港',
    intro: ['纳夫普利翁曾是希腊第一个现代首都：老城的威尼斯城堡、海中的布尔齐要塞与山上的帕拉米迪 999 级台阶，构成最上镜的海港天际线。', '这里是伯罗奔尼撒环线的最佳落脚点，步行可达一切，傍晚在海堤散步是本地人的日常。'],
    facts: [['最佳时间', '4–10 月'], ['建议停留', '2–3 天'], ['抵达方式', '雅典驱车 1.5 小时']],
    routes: ['family-7d'],
  },
  {
    slug: 'santorini', name: '圣托里尼', en: 'SANTORINI', type: 'island', image: images.santorini, eyebrow: 'SANTORINI · CYCLADES', headline: '爱琴海上，最接近日落的地方',
    intro: ['圣托里尼并不只是一张蓝顶教堂的明信片。沿火山口悬崖而建的白色村落、从伊亚一直烧到海平面的落日、黑沙滩与火山温泉，以及在海风中成熟的 Assyrtiko 葡萄，共同组成了这座岛屿真正的质感。', '我们会根据你的节奏安排悬崖步道、日落餐厅、双体船巡航和避开人潮的清晨旅拍，也会为你筛选真正拥有无遮挡海景的房型。'],
    facts: [['最佳时间', '4–10 月'], ['建议停留', '3–4 天'], ['抵达方式', '雅典飞行 45 分钟']],
    routes: ['honeymoon-5d'],
  },
  {
    slug: 'mykonos', name: '米克诺斯', en: 'MYKONOS', type: 'island', image: images.mykonos, eyebrow: 'MYKONOS · CYCLADES', headline: '风车与白墙之间的爱琴海派对之岛',
    intro: ['米克诺斯把两种气质揉在一起：白天是卡特米利风车与小威尼斯海港的慵懒白墙小镇，入夜后是爱琴海最著名的酒吧与海滩俱乐部。', '我们为不同需求准备两套玩法：蜜月与家庭选择安静海湾酒店 + 跳岛提洛斯，派对玩家则安排海滩俱乐部预订与夜生活动线。'],
    facts: [['最佳时间', '5–9 月'], ['建议停留', '2–3 天'], ['抵达方式', '雅典飞行 40 分钟或快船']],
    routes: [],
  },
  {
    slug: 'zakynthos', name: '扎金索斯', en: 'ZAKYNTHOS', type: 'island', image: images.zakynthos, eyebrow: 'ZAKYNTHOS · IONIAN', headline: '沉船湾与蓝洞，爱奥尼亚海最蓝的一抹',
    intro: ['1983 年搁浅的走私船 Panagiotis 让 Navagio 海滩成为全世界最著名的沉船湾，白色卵石与钴蓝海水被陡峭石灰岩崖壁环抱。', '我们安排清晨乘小船登湾避开人潮，下午到蓝洞浮潜，傍晚在岛西端的悬崖观景台看沉船湾全景日落。'],
    facts: [['最佳时间', '5–9 月'], ['建议停留', '2–3 天'], ['抵达方式', '雅典飞行 1 小时']],
    routes: [],
  },
  {
    slug: 'crete', name: '克里特', en: 'CRETE', type: 'island', image: images.crete, eyebrow: 'CRETE · AEGEAN SEA', headline: '米诺斯文明的发源地，希腊最大的岛屿',
    intro: ['克里特是欧洲最古老文明的摇篮：克诺索斯宫的迷宫传说、粉红沙滩 Elafonisi、撒马利亚峡谷徒步与干尼亚威尼斯老港，一座岛装下半个希腊。', '岛大节奏慢，我们建议至少安排 4–5 天，把考古、海滩与峡谷徒步拆成松紧结合的动线。'],
    facts: [['最佳时间', '4–10 月'], ['建议停留', '4–5 天'], ['抵达方式', '雅典飞行 50 分钟']],
    routes: [],
  },
]

const fallbackSeoSettings = {
  siteName: 'SY 希腊蔚蓝海岸',
  siteUrl: 'https://sy-greece.com',
  defaultTitle: 'SY 希腊蔚蓝海岸｜希腊私人定制旅行',
  defaultDescription: 'SY 希腊蔚蓝海岸，为中文游客提供雅典、圣托里尼及希腊全境的中高端私人定制旅行、中文司导与在地管家服务。',
  keywords: '希腊旅游,希腊私人定制,圣托里尼旅行,雅典旅游,希腊地接,中文司导',
  ogImage: 'images/santorini.png',
  googleVerification: '',
  robotsPolicy: 'index,follow',
  phone: '+30 210 000 0000',
  email: 'hello@sy-greece.com',
}

function upsertMeta(attribute, key, content) {
  let node = document.head.querySelector(`meta[${attribute}="${key}"]`)
  if (!node) { node = document.createElement('meta'); node.setAttribute(attribute, key); document.head.appendChild(node) }
  node.setAttribute('content', content || '')
}

function upsertLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`)
  if (!node) { node = document.createElement('link'); node.setAttribute('rel', rel); document.head.appendChild(node) }
  node.setAttribute('href', href)
}

function SEO() {
  const { pathname, search } = useLocation()
  const [settings, setSettings] = useState(fallbackSeoSettings)
  useEffect(() => {
    if (window.location.protocol === 'file:') return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.settings) setSettings((current) => ({ ...current, ...payload.settings }))
    }).catch(() => {})
  }, [])
  useEffect(() => {
    const config = { ...fallbackSeoSettings, ...settings }
    const path = pathname || '/'
    const query = new URLSearchParams(search).get('q')
    const routeMatch = path.match(/^\/routes\/([^/]+)$/)
    const matchedRoute = routeMatch ? routes.find((item) => item.slug === routeMatch[1]) : null
    const destMatch = path.match(/^\/destinations\/([^/]+)$/)
    const matchedDestination = destMatch ? destinations.find((item) => item.slug === destMatch[1]) : null
    const pages = {
      '/': ['希腊私人定制旅行｜雅典 · 圣托里尼 · 全境地接', config.defaultDescription],
      '/customize': ['希腊私人定制｜免费获取专属行程方案', '告诉我们出行时间、人数与预算，24 小时内获得希腊私人定制旅行首版方案。'],
      '/search': [`搜索${query ? `“${query}”` : '希腊旅行'}｜SY Greece`, `搜索希腊路线、目的地和私人定制旅行灵感。${query ? `当前关键词：${query}。` : ''}`],
      '/tools': ['希腊旅行工具箱｜签证 · 汇率 · 天气 · 行程日历', '出发前准备希腊申根签证、欧元汇率、天气和每日行程的实用工具箱。'],
      '/guides/richard-li': ['Richard 李名人导游｜希腊私人深度旅行与预约', '认识 Richard 李：武汉大学双学士、英国澳洲双硕士，提供希腊历史人文、小众秘境与私人摄影导览。'],
      '/manage-9f3k7': ['网站管理后台｜SY 希腊蔚蓝海岸', 'SY 希腊蔚蓝海岸网站内容与 SEO 管理后台'],
    }
    const [pageTitle, description] = matchedRoute
      ? [`${matchedRoute.title}｜${matchedRoute.days}希腊定制路线`, matchedRoute.desc]
      : matchedDestination
        ? [`${matchedDestination.name}旅行指南｜${matchedDestination.headline}`, matchedDestination.intro[0]]
        : (pages[path] || [config.defaultTitle, config.defaultDescription])
    const isAdmin = path === '/manage-9f3k7'
    const title = pageTitle.includes('SY') ? pageTitle : `${pageTitle} | ${config.siteName}`
    const baseUrl = String(config.siteUrl || window.location.origin).replace(/\/$/, '')
    const canonical = `${baseUrl}${path === '/' ? '/' : path}`
    const ogImage = /^https?:\/\//.test(config.ogImage || '') ? config.ogImage : `${baseUrl}/${String(config.ogImage || '').replace(/^\.?\//, '')}`
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', config.keywords)
    upsertMeta('name', 'robots', isAdmin ? 'noindex,nofollow' : (config.robotsPolicy || 'index,follow'))
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', canonical)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:type', path === '/' ? 'website' : 'article')
    upsertMeta('property', 'og:site_name', config.siteName)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    upsertLink('canonical', canonical)
    let verification = document.head.querySelector('meta[name="google-site-verification"]')
    if (config.googleVerification) {
      if (!verification) { verification = document.createElement('meta'); verification.name = 'google-site-verification'; document.head.appendChild(verification) }
      verification.content = config.googleVerification
    } else if (verification) verification.remove()
    const graph = [{ '@context': 'https://schema.org', '@type': 'TravelAgency', name: config.siteName, url: baseUrl, logo: ogImage, description: config.defaultDescription, telephone: config.phone, email: config.email, areaServed: 'GR', knowsLanguage: ['zh-CN', 'en'] }, { '@context': 'https://schema.org', '@type': 'WebSite', name: config.siteName, url: baseUrl, inLanguage: 'zh-CN', potentialAction: { '@type': 'SearchAction', target: `${baseUrl}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }]
    if (path === '/') {
      graph.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: '希腊精选主题路线', itemListElement: routes.map((route, index) => ({ '@type': 'ListItem', position: index + 1, name: route.title, description: route.desc, url: `${baseUrl}/routes/${route.slug}` })) })
      graph.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: '希腊私人定制旅行多久可以出方案？', acceptedAnswer: { '@type': 'Answer', text: '提交出行时间、人数与预算后，定制师会在 24 小时内提供首版方案。' } }, { '@type': 'Question', name: '希腊旅行是否提供中文服务？', acceptedAnswer: { '@type': 'Answer', text: '雅典在地团队提供一对一中文定制师、中文司导和出行中的中文应急管家。' } }, { '@type': 'Question', name: '可以只定制圣托里尼或雅典吗？', acceptedAnswer: { '@type': 'Answer', text: '可以按目的地、天数、预算和旅行主题灵活定制单岛或多城行程。' } }] })
    }
    if (matchedDestination) graph.push({ '@context': 'https://schema.org', '@type': 'TouristDestination', name: matchedDestination.name, description, touristType: ['情侣', '家庭', '蜜月旅行'], containedInPlace: { '@type': 'Country', name: '希腊' } })
    if (matchedRoute) graph.push({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: matchedRoute.title, description: matchedRoute.desc, itinerary: { '@type': 'ItemList', itemListElement: matchedRoute.itinerary.map(([day, title], index) => ({ '@type': 'ListItem', position: index + 1, name: `${day} ${title}` })) }, provider: { '@type': 'TravelAgency', name: config.siteName, url: baseUrl } })
    let schema = document.head.querySelector('#sy-seo-schema')
    if (!schema) { schema = document.createElement('script'); schema.id = 'sy-seo-schema'; schema.type = 'application/ld+json'; document.head.appendChild(schema) }
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  }, [pathname, search, settings])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function Logo() {
  return (
    <Link className="logo" to="/" aria-label="SY 希腊蔚蓝海岸首页">
      <span className="temple" aria-hidden="true"><i /><i /><i /></span>
      <span>SY 希腊蔚蓝海岸</span>
    </Link>
  )
}

function Header({ solid = false }) {
  const [open, setOpen] = useState(false)
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
  const links = [
    ['/', t('nav.home')], ['/routes/honeymoon-5d', t('nav.routes')], ['/customize', t('nav.experiences')],
    ['/destinations/santorini', t('nav.destinations')], ['/guides/richard-li', t('nav.guide')], ['/tools', t('nav.tools')],
  ]
  return (
    <header className={`site-header ${solid ? 'solid' : ''}`}>
      <div className="nav-shell">
        <Logo />
        <nav className={open ? 'nav-open' : ''} aria-label="主导航">
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          <Link className="nav-mobile-cta" to="/customize">{t('nav.customize')}</Link>
        </nav>
        <LanguageSwitcher />
        <Link className="button button-gold nav-cta" to="/customize">{t('nav.customize')}</Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航菜单">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  )
}

function Eyebrow({ children, dark = false }) {
  return <div className={`eyebrow ${dark ? 'eyebrow-dark' : ''}`}>{children}</div>
}

function SectionTitle({ eyebrow, title, action, dark = false }) {
  return (
    <div className={`section-heading ${dark ? 'on-dark' : ''}`}>
      <div><Eyebrow dark={dark}>{eyebrow}</Eyebrow><h2>{title}</h2></div>
      {action && <Link className="text-link" to={action.to}>{action.label}<ChevronRight size={15} /></Link>}
    </div>
  )
}

function SearchBox({ initial = '', large = false }) {
  const [value, setValue] = useState(initial)
  const navigate = useNavigate()
  function submit(e) {
    e.preventDefault()
    navigate(`/search?q=${encodeURIComponent(value || '圣托里尼')}`)
  }
  return (
    <form className={`search-box ${large ? 'search-large' : ''}`} onSubmit={submit} role="search">
      <Search size={18} />
      <input name="query" value={value} onChange={(e) => setValue(e.target.value)} aria-label="搜索" placeholder="搜索路线 / 景点 / 定制需求" />
      <button type="submit">搜索</button>
    </form>
  )
}

function routePath(route) {
  return `/routes/${route.slug || 'honeymoon-5d'}`
}

function RouteCard({ route, compact = false }) {
  return (
    <article className={`route-card ${compact ? 'compact' : ''}`}>
      <Link className="route-image" to={routePath(route)} aria-label={`查看${route.title}`}>
        <img src={route.image} alt={route.title} />
      </Link>
      <div className="route-copy">
        <Eyebrow>{route.days} · {route.kicker}</Eyebrow>
        <h3><Link to={routePath(route)}>{route.title}</Link></h3>
        <div className="route-tags">{route.tags}</div>
        <p>{route.desc}</p>
        <div className="price-row"><span>价格电询</span><Link to="/customize">一对一顾问报价 <ArrowRight size={13} /></Link></div>
      </div>
    </article>
  )
}

function DestinationCard({ item }) {
  return (
    <Link to={`/destinations/${item.slug || item.id || 'santorini'}`} className="destination-card">
      <img src={item.image} alt={`${item.name}风光`} />
      <span><strong>{item.name}</strong><small>{item.en}</small></span>
    </Link>
  )
}

function GuideTeaser() {
  return (
    <article className="guide-teaser">
      <div className="guide-teaser-avatar"><img src={images.richardAvatar} alt="Richard 李" /></div>
      <div className="guide-teaser-copy">
        <Eyebrow>Signature Guide · Richard Li</Eyebrow>
        <h2>名人导游 · Richard 李</h2>
        <p>武汉大学双学士、英国澳洲双硕士，旅居欧美多年，深耕希腊历史文化与小众秘境路线。</p>
        <div className="guide-teaser-credentials"><span>名校教育</span><span>欧洲精品文旅金牌从业者</span><span>中英美驾照</span></div>
      </div>
      <Link className="button button-primary" to="/guides/richard-li">查看档案 / 预约时间 <ArrowRight size={15} /></Link>
    </article>
  )
}

function GoldCTA() {
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  return (
    <section className="gold-cta">
      <div className="container gold-cta-inner">
        <div>
          <h2>{language === 'en' ? 'Tell us what you have in mind. We know Greece.' : language === 'ja' ? 'あなたの想いを、ギリシャへ。' : language === 'el' ? 'Πείτε μας το όραμά σας. Αναλαμβάνουμε την Ελλάδα.' : '告诉我你的想法，希腊交给我们'}</h2>
          <p>1v1 · 24h · {language === 'en' ? 'No planning fee' : language === 'ja' ? 'プラン作成無料' : language === 'el' ? 'χωρίς χρέωση σχεδιασμού' : '定制不收方案费'}</p>
        </div>
        <div className="gold-actions">
          <Link className="button button-deep" to="/customize">{t('common.customize')}</Link>
          <a className="button button-outline-light" href="#contact">{t('common.addWechat')}</a>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  const routeLabels = language === 'en' ? ['3 days · Athens highlights', '5 days · Athens + Santorini', '7 days · Family Greece', '9 days · Heritage circuit'] : language === 'ja' ? ['3日 · アテネの魅力', '5日 · アテネ + サントリーニ', '7日 · 家族で巡るギリシャ', '9日 · 世界遺産ルート'] : language === 'el' ? ['3 ημέρες · Αθήνα', '5 ημέρες · Αθήνα + Σαντορίνη', '7 ημέρες · Οικογενειακή Ελλάδα', '9 ημέρες · Πολιτιστική διαδρομή'] : ['3天2晚 · 雅典市区精华', '5天4晚 · 雅典 + 圣托里尼', '7天6晚 · 经典三城家庭游', '9天8晚 · 全遗产环游']
  return (
    <footer id="contact" className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo /><p>{t('footer.brand')}</p><strong>sy-greece.com</strong></div>
        <div><h3>{t('footer.routes')}</h3><Link to="/routes/athens-3d">{routeLabels[0]}</Link><Link to="/routes/honeymoon-5d">{routeLabels[1]}</Link><Link to="/routes/family-7d">{routeLabels[2]}</Link><Link to="/routes/heritage-9d">{routeLabels[3]}</Link></div>
        <div><h3>{t('footer.services')}</h3><Link to="/customize">{language === 'en' ? 'Private planning' : language === 'ja' ? 'プライベート旅行' : language === 'el' ? 'Ιδιωτικός σχεδιασμός' : '私人定制'}</Link><a href="#services">{language === 'en' ? 'Private transfers' : language === 'ja' ? '専用車' : language === 'el' ? 'Ιδιωτικές μετακινήσεις' : '专属用车'}</a><a href="#experiences">{language === 'en' ? 'Yachts & private flights' : language === 'ja' ? 'ヨット / プライベートフライト' : language === 'el' ? 'Yacht / private flights' : '私人包机 / 游艇出海'}</a><Link to="/tools">{t('nav.tools')}</Link></div>
        <div><h3>{t('footer.contact')}</h3><span>{t('footer.wechat')}</span><span>{t('footer.phone')}</span><span>{t('footer.email')}</span><Link className="footer-admin-link" to="/manage-9f3k7">{language === 'en' ? 'Admin' : language === 'ja' ? '管理画面' : language === 'el' ? 'Διαχείριση' : '后台管理'}</Link></div>
      </div>
      <div className="container copyright"><span>2026 SY Greece · {language === 'en' ? 'All rights reserved' : language === 'ja' ? '無断転載禁止' : language === 'el' ? 'Με επιφύλαξη παντός δικαιώματος' : '希腊蔚蓝海岸 · 版权所有'}</span><span>沪ICP备 XXXXXXXX 号</span></div>
    </footer>
  )
}

function Home() {
  const [destTab, setDestTab] = useState('culture')
  const [content, setContent] = useState({ routes, destinations })
  useEffect(() => {
    if (window.location.protocol === 'file:') return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((next) => {
      if (next) setContent({ routes: next.routes?.length ? next.routes : routes, destinations: next.destinations?.length ? next.destinations : destinations })
    }).catch(() => {})
  }, [])
  const services = [
    [Waves, '蔚蓝海岸', '圣托里尼、米克诺斯跳岛度假与海岛酒店，一价打包'],
    [Compass, '私人定制', '1v1 中文定制师，按预算与主题逐日打磨专属行程'],
    [BusFront, '专属用车', '华人司导全程服务，机场接送与城际包车自由安排'],
    [Map, '旅行工具', '签证指引、汇率换算、天气与行程日历，行前一站备齐'],
  ]
  return (
    <>
      <div className="home-hero">
        <Header />
        <div className="container hero-content">
          <Eyebrow dark>SY GREECE · TAILOR-MADE JOURNEYS</Eyebrow>
          <h1>把希腊，交给懂它的人</h1>
          <p>深耕希腊本土 · 中高端私人定制地接服务商。雅典在地团队，<br />一对一中文定制师，行程、用车、海岛跳岛，全程管家式服务。</p>
          <SearchBox />
          <div className="hero-actions"><Link className="button button-primary" to="/customize">免费获取定制方案</Link><a className="button button-ghost" href="#routes">浏览甄选路线</a></div>
          <div className="trust-row"><span><Check size={14} />免费出方案</span><span><Check size={14} />24 小时内回复</span><span><Check size={14} />全程中文管家服务</span></div>
        </div>
      </div>

      <section id="services" className="section services-section">
        <div className="container">
          <SectionTitle eyebrow="OUR SERVICES" title="不只是行程，更是在地服务" action={{ to: '/customize', label: '了解全部服务' }} />
          <div className="service-grid">{services.map(([Icon, title, desc]) => <Link to={title === '旅行工具' ? '/tools' : '/customize'} className="service-card" key={title}><Icon /><h3>{title}</h3><p>{desc}</p><ArrowRight size={17} /></Link>)}</div>
          <GuideTeaser />
        </div>
      </section>

      <section id="routes" className="section routes-section">
        <div className="container">
          <SectionTitle eyebrow="CURATED PACKAGES" title="甄选主题路线" action={{ to: '/routes/heritage-9d', label: '查看全部路线' }} />
          <div className="route-grid">{content.routes.map((route) => <RouteCard key={route.id || route.title} route={route} />)}</div>
        </div>
      </section>

      <section id="experiences" className="section experiences-section">
        <div className="container">
          <SectionTitle dark eyebrow="SIGNATURE EXPERIENCES" title="奢享体验" action={{ to: '/customize', label: '了解奢享定制' }} />
          <div className="experience-grid">
            {[
              [images.jet, '私人包机', '雅典往返圣托里尼 / 米克诺斯，跳过轮渡排队，清晨出发，落地即开始假期。'],
              [images.yacht, '游艇出海', '私人游艇 + 船长 + 轻食下午茶，火山湖浮潜、隐秘海湾与海面落日。'],
            ].map(([image, title, desc]) => <article className="experience-card" key={title}><div className="experience-image"><img src={image} alt={title} /><span>高端定制</span></div><div><h3>{title}</h3><p>{desc}</p><Link to="/customize">咨询{title}方案 <ArrowRight size={14} /></Link></div></article>)}
          </div>
        </div>
      </section>

      <section className="section destinations-section">
        <div className="container">
          <SectionTitle eyebrow="DESTINATIONS" title="精选目的地" action={{ to: '/destinations/santorini', label: '全部 14 个目的地' }} />
          <div className="destination-tabs" role="tablist"><button className={destTab === 'culture' ? 'active' : ''} onClick={() => setDestTab('culture')}>文明溯源</button><button className={destTab === 'island' ? 'active' : ''} onClick={() => setDestTab('island')}>海岛度假</button></div>
          {['culture', 'island'].map((type) => <div key={type} className={`destination-group ${destTab === type ? 'mobile-active' : ''}`}><div className="destination-subhead"><h3>{type === 'culture' ? '文明溯源' : '海岛度假'}</h3><span>{type === 'culture' ? '伯罗奔尼撒 · 阿拉霍瓦 · 塞萨洛尼基 · 比雷埃夫斯' : '科孚 · 埃伊纳'}</span></div><div className="destination-grid">{content.destinations.filter((d) => d.type === type).map((item) => <DestinationCard item={item} key={item.id || item.name} />)}</div></div>)}
        </div>
      </section>
      <GoldCTA /><Footer />
    </>
  )
}

function InnerHero({ eyebrow, title, subtitle, breadcrumb, image = images.santorini, children, short = false }) {
  return (
    <section className={`inner-hero ${short ? 'short' : ''}`} style={{ '--hero-image': `url(${image})` }}>
      <Header />
      <div className="container inner-hero-content">
        {breadcrumb && <div className="breadcrumb">首页 / {breadcrumb}</div>}
        <Eyebrow dark>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
        {children}
      </div>
    </section>
  )
}

function RouteDetail() {
  const { slug } = useParams()
  const route = routes.find((item) => item.slug === slug)
  if (!route) return <NotFound />
  const relatedDestinations = destinations.filter((item) => (route.destinations || []).includes(item.slug))
  return (
    <>
      <InnerHero image={route.image} eyebrow={route.eyebrow} title={route.title} subtitle={`${route.days} · ${route.kicker} · ${route.tags} · 2 人即成行`} breadcrumb={`甄选路线 / ${route.title}`}>
        <div className="detail-hero-actions"><strong>价格电询</strong><Link className="button button-primary" to="/customize">咨询这条线路</Link></div>
      </InnerHero>
      <main className="detail-page section">
        <div className="container detail-layout">
          <div>
            <article className="intro-card"><h2>为什么选择这条线</h2><p>{route.intro}</p></article>
            <h2 className="timeline-title">逐日行程</h2>
            <div className="timeline">{route.itinerary.map(([day, title, desc], index) => <article className="day-card" key={day}><span className={index > 1 ? 'gold' : ''}>{day}</span><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div>
            {relatedDestinations.length > 0 && (
              <section className="included-routes">
                <SectionTitle eyebrow="DESTINATIONS" title="这条线经过的目的地" />
                <div className="destination-grid">{relatedDestinations.map((item) => <DestinationCard key={item.slug} item={item} />)}</div>
              </section>
            )}
          </div>
          <aside className="trip-aside"><div className="summary-card"><h2>行程速览</h2><dl>{route.summary.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl><div className="aside-price"><strong>价格电询</strong><small>按人数 / 日期报价</small></div><Link className="button button-primary button-block" to="/customize">咨询这条线路 · 免费报价</Link></div><div className="wechat-tip"><MessageCircle /><span>加定制师微信直接沟通<br /><strong>平均 3 分钟回复 · 方案免费</strong></span></div></aside>
        </div>
      </main>
      <div className="mobile-sticky-cta"><span>价格电询</span><Link to="/customize">免费咨询报价</Link></div>
      <Footer />
    </>
  )
}

function Customize() {
  const [themes, setThemes] = useState(['蜜月婚礼'])
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const themeOptions = ['蜜月婚礼', '亲子家庭', '深度文化', '海岛度假', '美酒美食']
  function toggleTheme(theme) { setThemes((current) => current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme]) }
  async function submit(e) {
    e.preventDefault(); setSaving(true)
    const form = e.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), themes, createdAt: new Date().toISOString(), status: 'new' }
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('lead api failed')
    } catch {
      const local = JSON.parse(localStorage.getItem('sy-greece-leads') || '[]')
      localStorage.setItem('sy-greece-leads', JSON.stringify([{ ...payload, id: `lead-${Date.now()}` }, ...local]))
    } finally {
      setSaving(false); setSent(true); form.reset(); setThemes(['蜜月婚礼']); setTimeout(() => setSent(false), 5000)
    }
  }
  return (
    <>
      <section className="custom-top"><Header solid /><div className="container custom-intro"><Eyebrow dark>TAILOR-MADE REQUEST</Eyebrow><h1>告诉我你的想法，希腊交给我们</h1><p>1v1 中文定制师 · 24 小时内出首版方案 · 定制不收取方案费</p></div></section>
      <main className="section form-section">
        <div className="container form-layout">
          <form className="custom-form" onSubmit={submit}>
            <h2>免费获取定制方案</h2>
            <div className="field-grid"><label>出行目的地<input name="destination" required placeholder="如：雅典 + 圣托里尼" /></label><label>预计出行时间<input name="travelMonth" type="month" required /></label><label>出行天数<input name="duration" required placeholder="如：7 天" /></label><label>出行人数<input name="travelers" required placeholder="如：2 大 1 小" /></label><label>人均预算<select name="budget" defaultValue=""><option value="" disabled>请选择预算范围</option><option>1 万元以内</option><option>1–2 万元 / 人</option><option>2–4 万元 / 人</option><option>4 万元以上 / 人</option></select></label></div>
            <fieldset><legend>旅行主题（可多选）</legend><div className="theme-chips">{themeOptions.map((theme) => <button type="button" key={theme} className={themes.includes(theme) ? 'active' : ''} onClick={() => toggleTheme(theme)}>{themes.includes(theme) && <Check size={14} />}{theme}</button>)}</div></fieldset>
            <label>需求描述<textarea name="requirements" rows="5" placeholder="想去的地方、特别的纪念日、饮食禁忌、酒店偏好……写得越细，方案越准" /></label>
            <label>联系电话 / 微信<input name="contact" required placeholder="用于顾问联系你出方案" /></label>
            <button className="button button-gold button-block submit-button" type="submit" disabled={saving}>{saving ? '正在提交…' : '提交需求 · 免费获取定制方案'}</button>
            <p className="privacy">提交即表示同意我们通过电话 / 微信联系你，信息仅用于定制方案，绝不外泄</p>
            {sent && <div className="success-message"><Check />需求已收到，定制师会在 24 小时内联系你。</div>}
          </form>
          <aside className="custom-aside"><div className="advisor-card"><h2>更想直接聊？</h2><div className="advisor"><span><Users /></span><div><h3>雅典定制师 · 小蓝</h3><p>8 年希腊地接 · 服务 2000+ 组家庭</p></div></div><p>添加微信直接沟通，平均 3 分钟回复</p><div className="qr"><Sparkles size={36} /><span>微信二维码</span></div></div><div className="promise-card"><h2>定制服务承诺</h2><p>· 24 小时内出首版方案，免费修改 3 次</p><p>· 报价逐项透明，无隐蔽消费、不拼团</p><p>· 出行中 7×24 中文应急管家在线</p></div></aside>
        </div>
      </main>
      <Footer />
    </>
  )
}

function DestinationDetail() {
  const { slug } = useParams()
  const item = destinations.find((entry) => entry.slug === slug)
  if (!item) return <NotFound />
  const factIcons = [SunMedium, Clock3, Plane]
  const relatedRoutes = routes.filter((route) => (route.destinations || []).includes(item.slug))
  return (
    <>
      <InnerHero image={item.image} eyebrow={item.eyebrow} title={item.name} subtitle={item.headline} breadcrumb={`精选目的地 / ${item.name}`} />
      <main className="destination-detail section">
        <div className="container">
          <article className="destination-intro"><div><Eyebrow>ABOUT {item.en}</Eyebrow><h2>{item.headline}</h2>{item.intro.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div><div className="destination-facts">{item.facts.map(([label, value], index) => { const Icon = factIcons[index] || SunMedium; return <div key={label}><Icon /><span><small>{label}</small><strong>{value}</strong></span></div> })}</div></article>
          {relatedRoutes.length > 0 && (
            <section className="included-routes"><SectionTitle eyebrow="CURATED ROUTES" title={`含${item.name}的线路`} action={{ to: '/customize', label: `定制我的${item.name}行程` }} /><div className="route-grid">{relatedRoutes.map((route) => <RouteCard key={route.slug} route={route} />)}</div></section>
          )}
          {relatedRoutes.length === 0 && (
            <section className="included-routes"><SectionTitle eyebrow="TAILOR-MADE" title={`${item.name}暂无固定线路`} action={{ to: '/customize', label: `定制我的${item.name}行程` }} /><div className="empty-state"><Compass /><h2>按你的节奏定制</h2><p>{item.name}目前以私人定制方式安排，告诉我们出行时间与偏好，24 小时内出首版方案。</p><Link className="button button-primary" to="/customize">免费获取定制方案</Link></div></section>
          )}
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

function SearchPage() {
  const [params] = useSearchParams()
  const keyword = params.get('q') || '圣托里尼'
  const [filter, setFilter] = useState('all')
  const filters = [['all', '全部 8'], ['route', '路线 3'], ['destination', '目的地 3'], ['experience', '奢享体验 2']]
  return (
    <>
      <section className="search-top"><Header solid /><div className="container search-intro"><Eyebrow dark>SEARCH SY GREECE</Eyebrow><h1>搜索希腊灵感</h1><SearchBox initial={keyword} large /></div></section>
      <main className="search-results section">
        <div className="container"><p className="result-summary">“{keyword}” 的相关结果</p><div className="filter-chips">{filters.map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>
          {(filter === 'all' || filter === 'route') && <section><SectionTitle eyebrow="CURATED ROUTES" title="相关路线" /><div className="route-grid">{routes.slice(0, 3).map((route) => <RouteCard compact key={route.title} route={route} />)}</div></section>}
          {(filter === 'all' || filter === 'destination') && <section className="search-destinations"><SectionTitle eyebrow="DESTINATIONS" title="相关目的地" /><div className="destination-grid">{destinations.slice(4, 7).map((item) => <DestinationCard key={item.name} item={item} />)}</div></section>}
          {(filter === 'experience') && <section className="empty-state"><ShipWheel /><h2>两项专属体验</h2><p>圣岛双体船日落巡航与私人包机服务，需要根据日期和人数专属报价。</p><Link className="button button-primary" to="/customize">咨询奢享体验</Link></section>}
        </div>
      </main><Footer />
    </>
  )
}

function ToolsPage() {
  const [cny, setCny] = useState(783)
  const eur = useMemo(() => (Number(cny || 0) / 7.83).toFixed(2), [cny])
  return (
    <>
      <section className="tools-top"><Header solid /><div className="container tools-intro"><Eyebrow dark>TRAVEL ESSENTIALS</Eyebrow><h1>希腊旅行工具箱</h1><p>签证、汇率、天气与行程日历，出发前最需要的信息都在这里。</p></div></section>
      <main className="tools-section section"><div className="container tool-grid">
        <article className="tool-card"><div className="tool-icon"><Landmark /></div><div><Eyebrow>SCHENGEN VISA</Eyebrow><h2>签证指引</h2><p>希腊属于申根区，建议至少提前 45 天准备申请。</p><ul><li>护照、照片、申请表与在职 / 在读证明</li><li>机酒预订单、旅行保险与银行流水</li><li>按常住地选择北京、上海或广州领区</li></ul><Link to="/customize">获取材料清单与预审服务 <ArrowRight size={14} /></Link></div></article>
        <article className="tool-card"><div className="tool-icon"><Euro /></div><div><Eyebrow>EXCHANGE RATE</Eyebrow><h2>汇率换算</h2><div className="rate-banner">1 EUR <span>≈</span> 7.83 CNY</div><label className="converter"><span>人民币 CNY</span><input name="cny" type="number" value={cny} onChange={(e) => setCny(e.target.value)} /><strong>≈ {eur} EUR</strong></label><p>建议在国内兑换少量欧元现金，大额消费使用免货币转换费的银行卡。</p></div></article>
        <article className="tool-card"><div className="tool-icon"><CloudSun /></div><div><Eyebrow>WEATHER NOW</Eyebrow><h2>希腊天气</h2><div className="weather-list"><div><span>雅典</span><strong>28°</strong><small>晴</small></div><div><span>圣托里尼</span><strong>25°</strong><small>海风</small></div><div><span>米克诺斯</span><strong>24°</strong><small>晴间云</small></div></div><p>岛上日照强、风力大，建议携带 SPF50 防晒与薄外套。天气为行前示意。</p></div></article>
        <article className="tool-card"><div className="tool-icon"><CalendarDays /></div><div><Eyebrow>TRIP CALENDAR</Eyebrow><h2>行程日历</h2><p>定制方案确认后，可将每日酒店、用车、航班与预约信息同步到手机日历，并支持离线查看。</p><div className="calendar-preview"><span>OCT</span><strong>12</strong><small>雅典卫城 · 09:00</small></div><Link className="button button-primary" to="/customize">开始定制我的行程</Link></div></article>
      </div></main><GoldCTA /><Footer />
    </>
  )
}

function GuidePage() {
  const [language] = useLanguage()
  const copy = translate('guide', language)
  const bookingLabel = translate('common.booking', language)
  const [selectedDate, setSelectedDate] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dateStates = { 8: 'booked', 9: 'booked', 12: 'pending', 16: 'available', 17: 'available', 21: 'pending', 24: 'available', 25: 'available' }
  const calendarDays = [null, null, ...Array.from({ length: 30 }, (_, index) => index + 1)]
  const signatureImages = [images.athens, images.meteora, images.zakynthos, images.delphi]
  const signature = copy.signature.map((item, index) => [signatureImages[index], ...item])
  const credentials = copy.credentials.map(([title, line1, line2], index) => [`0${index + 1}`, title, `${line1}\n${line2}`])
  const quotes = copy.quotes
  const services = copy.signature
  async function submitBooking(event) {
    event.preventDefault()
    if (!selectedDate) { setBookingMessage(copy.chooseDate); return }
    setSubmitting(true); setBookingMessage('')
    const form = event.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), guide: 'Richard 李', guideSlug: 'richard-li', bookingDate: selectedDate, leadType: 'guide-booking', destination: 'Richard 李私人导游预约', createdAt: new Date().toISOString(), status: 'new' }
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('booking api failed')
    } catch {
      const local = JSON.parse(localStorage.getItem('sy-greece-leads') || '[]')
      localStorage.setItem('sy-greece-leads', JSON.stringify([{ ...payload, id: `guide-${Date.now()}` }, ...local]))
    } finally {
      setSubmitting(false); setBookingMessage(copy.success); form.reset(); setSelectedDate('')
    }
  }
  return (
    <>
      <section className="guide-hero">
        <Header />
        <div className="container guide-hero-grid">
          <div className="guide-hero-copy">
            <Eyebrow dark>{copy.eyebrow}</Eyebrow>
            <h1>{copy.title.split('|').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h1>
            <p className="guide-role">{copy.role}</p>
            <p className="guide-hero-note">{copy.note}</p>
            <div className="guide-hero-actions"><a className="button button-gold" href="#reserve">{bookingLabel} <ArrowRight size={15} /></a><a className="button button-ghost" href="#contact">{translate('common.addWechat', language)}</a></div>
          </div>
          <div className="guide-profile-card">
            <div className="guide-avatar"><img src={images.richardAvatar} alt="Richard 李头像" /></div>
            <h2>{copy.profileTitle}</h2><Eyebrow>{copy.profileEyebrow}</Eyebrow>
            <div className="profile-rule" />
            <p><strong>{copy.profileEducation}</strong><br />{copy.profileBio}</p>
            <div className="profile-tags">{copy.profileTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </div>
      </section>

      <main>
        <section className="guide-section guide-story-section">
          <div className="container guide-story-grid">
            <div className="guide-story-copy"><Eyebrow>{copy.storyEyebrow}</Eyebrow><h2>{copy.storyTitle.split('|').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h2>{copy.storyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <blockquote className="guide-quote"><span>“</span><p>{copy.quote}</p><small>— Richard Li / SIGNATURE GUIDE</small></blockquote>
          </div>
        </section>

        <section className="guide-section credentials-section">
          <div className="container"><Eyebrow>{copy.credentialsEyebrow}</Eyebrow><h2>{copy.credentialsTitle}</h2><div className="credentials-grid">{credentials.map(([number, title, text]) => <article key={number} className="credential-card"><small>{number}</small><h3>{title}</h3><p>{text.split('\n').map((line) => <span key={line}>{line}</span>)}</p></article>)}</div></div>
        </section>

        <section className="guide-section signature-section">
          <div className="container"><Eyebrow>{copy.signatureEyebrow}</Eyebrow><h2>{copy.signatureTitle}</h2><p className="section-lead">{copy.signatureLead}</p><div className="signature-grid">{services.map(([title, desc, duration, audience], index) => <article className={`signature-card ${index === 3 ? 'signature-gold' : ''}`} key={title}><img src={signature[index][0]} alt={title} /><div><h3>{title}</h3><p>{desc}</p><div><span>{duration}</span><small>{audience}</small></div></div></article>)}</div></div>
        </section>

        <section className="guide-section guestbook-section">
          <div className="container"><Eyebrow dark>{copy.guestbookEyebrow}</Eyebrow><h2>{copy.guestbookTitle}</h2><div className="guestbook-grid">{quotes.map(([quote, author]) => <blockquote key={author}><p>{quote}</p><cite>— {author}</cite></blockquote>)}</div></div>
        </section>

        <section className="guide-section reserve-section" id="reserve">
          <div className="container"><Eyebrow>{copy.reserveEyebrow}</Eyebrow><h2>{copy.reserveTitle}</h2><p className="section-lead">{copy.reserveLead}</p><div className="booking-layout">
            <div className="calendar-card"><div className="calendar-head"><div><strong>{copy.calendarTitle}</strong><small>{copy.calendarMonth}</small></div><span>‹</span><span>›</span></div><div className="calendar-week">{(language === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : language === 'ja' ? ['月', '火', '水', '木', '金', '土', '日'] : language === 'el' ? ['Δ', 'Τ', 'Τ', 'Π', 'Π', 'Σ', 'Κ'] : language === 'zh-TW' ? ['一', '二', '三', '四', '五', '六', '日'] : ['一', '二', '三', '四', '五', '六', '日']).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => day ? <button key={day} type="button" className={`calendar-day ${dateStates[day] || ''} ${selectedDate === `2026-09-${String(day).padStart(2, '0')}` ? 'selected' : ''}`} disabled={dateStates[day] !== 'available'} onClick={() => setSelectedDate(`2026-09-${String(day).padStart(2, '0')}`)}>{day}</button> : <span key={`blank-${index}`} />)}</div><div className="calendar-legend"><span><i className="available-dot" />{copy.available}</span><span><i className="pending-dot" />{copy.pending}</span><span><i className="booked-dot" />{copy.booked}</span></div></div>
            <form className="booking-form" onSubmit={submitBooking}><div className="booking-form-head"><h3>{copy.formTitle}</h3><p>{copy.formLead}</p></div><label>{copy.duration}<select name="serviceLength" defaultValue={copy.durations[0]}>{copy.durations.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.travelers}<select name="travelers" defaultValue={copy.travelerOptions[1]}>{copy.travelerOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.requirements}<input name="requirements" required placeholder={copy.requirementsPlaceholder} /></label><label>{copy.contact}<input name="contact" required placeholder={copy.contactPlaceholder} /></label><button className="button button-deep button-block" type="submit" disabled={submitting}>{submitting ? copy.submitting : copy.submit}</button>{bookingMessage && <p className={`booking-message ${bookingMessage === copy.success ? 'success' : ''}`} role="status">{bookingMessage}</p>}</form>

          </div></div>
        </section>
      </main>
      <section className="guide-final-cta"><div className="container"><h2>{copy.finalTitle}</h2><p>{copy.finalLead}</p><a className="button button-deep" href="#reserve">{bookingLabel} <ArrowRight size={15} /></a></div></section>
      <Footer />
      <div className="guide-mobile-cta"><span>{language === 'en' ? 'Tailored quote' : language === 'ja' ? '専属見積り' : language === 'el' ? 'Εξατομικευμένη προσφορά' : '专属报价'}</span><a href="#reserve">{bookingLabel}</a></div>
    </>
  )
}

function NotFound() {
  return <main className="not-found"><Logo /><h1>这片海域还没有航线</h1><p>回到首页，继续探索你的希腊旅程。</p><Link className="button button-primary" to="/">返回首页</Link></main>
}

function LegacyAdminRedirect() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/', { replace: true }) }, [navigate])
  return null
}

export default function App() {
  return <><ScrollToTop /><SEO /><Routes><Route path="/" element={<Home />} /><Route path="/routes/:slug" element={<RouteDetail />} /><Route path="/customize" element={<Customize />} /><Route path="/destinations/:slug" element={<DestinationDetail />} /><Route path="/guides/richard-li" element={<GuidePage />} /><Route path="/search" element={<SearchPage />} /><Route path="/tools" element={<ToolsPage />} /><Route path="/admin" element={<LegacyAdminRedirect />} /><Route path="/manage-9f3k7" element={<AdminPage />} /><Route path="*" element={<NotFound />} /></Routes></>
}
