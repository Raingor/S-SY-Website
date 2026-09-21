import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, BusFront, CalendarDays, Check, ChevronRight, CircleDollarSign,
  Clock3, CloudSun, Compass, Euro, Heart, Landmark, Mail, Map, MapPin,
  MessageCircle, Phone, Plane, Search, ShipWheel, Sparkles, SunMedium,
  Users, Waves, X, Headphones, LockKeyhole, Pause, Play, RotateCcw, Home as HomeIcon, UserRound,
} from 'lucide-react'
import AdminPage from './admin'
import { AttractionsIndex, AttractionDetail, CityGuidePage, ItinerariesIndex, ItineraryDetail, CustomTripPage } from './attractions'
import { assetPath, ComplianceNotice, Eyebrow, Footer, GoldCTA, Header, InnerHero, Logo, SectionTitle, images } from './chrome'
import { translate, useLanguage } from './i18n'

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
  siteName: '希腊旅行管家',
  siteUrl: 'https://sy-greece.com',
  defaultTitle: '只为一生美好回忆｜希腊旅行管家',
  defaultDescription: '希腊旅行管家，为访客提供雅典、圣托里尼及希腊全境的人文资讯、行程策划与语言陪同咨询。',
  keywords: '希腊人文咨询,希腊行程策划,圣托里尼文化,雅典历史,中文司导咨询',
  ogImage: 'images/santorini.webp',
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
  const [dynamicContent, setDynamicContent] = useState({ attractions: [], cities: [], sampleItineraries: [] })
  useEffect(() => {
    if (window.location.protocol === 'file:') return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.settings) setSettings((current) => ({ ...current, ...payload.settings }))
      if (payload) setDynamicContent({ attractions: payload.attractions || [], cities: payload.cities || [], sampleItineraries: payload.sampleItineraries || [] })
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
    const attractionMatch = path.match(/^\/attractions\/([^/]+)$/)
    const matchedAttraction = attractionMatch ? dynamicContent.attractions.find((item) => item.id === decodeURIComponent(attractionMatch[1])) : null
    const cityMatch = path.match(/^\/attractions\/city\/([^/]+)$/)
    const matchedCity = cityMatch ? dynamicContent.cities.find((item) => item.id === cityMatch[1]) : null
    const itineraryMatch = path.match(/^\/itineraries\/([^/]+)$/)
    const matchedItinerary = itineraryMatch ? dynamicContent.sampleItineraries.find((item) => item.id === decodeURIComponent(itineraryMatch[1])) : null
    const pages = {
      '/': ['只为一生美好回忆｜希腊旅行管家', `只为一生美好回忆。${config.defaultDescription}`],
      '/customize': ['希腊行程咨询｜提交需求沟通方案', '告诉我们出行时间、人数与偏好，先沟通需求范围与行程规划方式。'],
      '/search': [`搜索${query ? `“${query}”` : '希腊旅行'}｜Greece Travel Butler`, `搜索希腊路线、目的地和私人定制旅行灵感。${query ? `当前关键词：${query}。` : ''}`],
      '/tools': ['希腊行前信息工具箱｜签证 · 汇率 · 天气 · 行程日历', '出发前准备希腊申根签证、欧元汇率、天气和每日行程的信息工具箱。'],
      '/heritage-guidance': ['古迹人文讲解预约｜希腊文化咨询', '预约雅典、德尔斐与克里特等古迹的人文知识讲解。'],
      '/vehicle-consultation': ['在地用车资源对接咨询｜希腊出行信息', '咨询希腊本地车型、司导资质与用车资源对接方式。'],
      '/knowledge-base': ['景点付费文史知识库｜免费预览', '浏览希腊景点的历史、神话与建筑知识预览。'],
      '/knowledge-base/acropolis': ['雅典卫城文史知识库｜免费预览', '预览雅典卫城的历史、神话、建筑与参观知识。'],
      '/knowledge-base/delphi': ['德尔斐文史知识库｜免费预览', '预览德尔斐的神谕、圣路、宝库与古剧场知识。'],
      '/knowledge-base/santorini': ['圣托里尼文史知识库｜免费预览', '预览圣托里尼的火山地质、聚落与葡萄酒文化。'],
      '/knowledge-base/knossos': ['克里特王宫文史知识库｜免费预览', '预览克诺索斯王宫、米诺斯文明与迷宫传说。'],
      '/attractions': ['希腊景点导览｜景点 · 博物馆 · 参观指南', '按城市浏览雅典、圣托里尼、德尔斐等地的景点与博物馆，含展品讲解与参观指南 12 项。'],
      '/itineraries': ['参考行程｜雅典 · 圣托里尼 · 世界遗产环线', '浏览参考行程框架，正式行程按需求定制后通过专属链接发送。'],
      '/business-travel': ['希腊商旅随行咨询｜商务语言与行程规划', '提供商务陪同、语言翻译、企业拜访与人文行程的咨询。'],
      '/my': ['我的｜希腊旅行管家', '微信登录、手机号绑定、预约、行程与个人资料入口。'],
      '/experiences/private-flight': ['私人包机｜希腊奢享体验', '按日期、人数与目的地沟通私人包机协调方案。'],
      '/experiences/private-yacht': ['游艇出海｜希腊奢享体验', '按日期、人数与船型沟通私人游艇出海方案。'],

      '/guides/richard-li': ['Richard 李名人导游｜希腊私人深度旅行与预约', '认识 Richard 李：武汉大学双学士、英国澳洲双硕士，提供希腊历史人文、小众秘境与私人摄影导览。'],
      '/manage-9f3k7': ['网站管理后台｜希腊旅行管家', '希腊旅行管家网站内容与 SEO 管理后台'],
    }
    const [pageTitle, description] = matchedRoute
      ? [`${matchedRoute.title}｜${matchedRoute.days}希腊定制路线`, matchedRoute.desc]
      : matchedDestination
        ? [`${matchedDestination.name}旅行指南｜${matchedDestination.headline}`, matchedDestination.intro[0]]
        : matchedCity
          ? [`${matchedCity.name}景点导览｜${matchedCity.subtitle || matchedCity.country}`, `${matchedCity.name}：${matchedCity.description || ''}`]
          : matchedAttraction
            ? [matchedAttraction.shareTitle || `${matchedAttraction.name}参观指南｜${matchedAttraction.en}`, matchedAttraction.summary || '']
            : matchedItinerary
              ? [`${matchedItinerary.title}｜参考行程`, matchedItinerary.summary || '']
              : (pages[path] || [config.defaultTitle, config.defaultDescription])
    const isPrivate = path.startsWith('/trip/')
    const isAdmin = path === '/manage-9f3k7'
    const title = pageTitle.includes('SY') ? pageTitle : `${pageTitle} | ${config.siteName}`
    const baseUrl = String(config.siteUrl || window.location.origin).replace(/\/$/, '')
    const canonical = `${baseUrl}${path === '/' ? '/' : path}`
    const selectedOgImage = matchedAttraction?.shareImage || matchedAttraction?.image || config.ogImage
    const ogImage = /^https?:\/\//.test(selectedOgImage || '') ? selectedOgImage : `${baseUrl}/${String(selectedOgImage || '').replace(/^\.?\//, '')}`
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'keywords', config.keywords)
    upsertMeta('name', 'robots', isPrivate || isAdmin ? 'noindex,nofollow' : (config.robotsPolicy || 'index,follow'))
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
    const graph = [{ '@context': 'https://schema.org', '@type': 'Organization', name: config.siteName, url: baseUrl, logo: ogImage, description: config.defaultDescription, telephone: config.phone, email: config.email, areaServed: 'GR', knowsLanguage: ['zh-CN', 'en'] }, { '@context': 'https://schema.org', '@type': 'WebSite', name: config.siteName, url: baseUrl, inLanguage: 'zh-CN', potentialAction: { '@type': 'SearchAction', target: `${baseUrl}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }]
    if (path === '/') {
      graph.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: '希腊精选主题路线', itemListElement: routes.map((route, index) => ({ '@type': 'ListItem', position: index + 1, name: route.title, description: route.desc, url: `${baseUrl}${routePath(route)}` })) })
      graph.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: '希腊私人定制旅行多久可以出方案？', acceptedAnswer: { '@type': 'Answer', text: '提交出行时间、人数与预算后，定制师会在 24 小时内提供首版方案。' } }, { '@type': 'Question', name: '希腊旅行是否提供中文服务？', acceptedAnswer: { '@type': 'Answer', text: '雅典在地团队提供一对一中文定制师、中文司导和出行中的中文应急管家。' } }, { '@type': 'Question', name: '可以只定制圣托里尼或雅典吗？', acceptedAnswer: { '@type': 'Answer', text: '可以按目的地、天数、预算和旅行主题灵活定制单岛或多城行程。' } }] })
    }
    if (matchedDestination) graph.push({ '@context': 'https://schema.org', '@type': 'TouristDestination', name: matchedDestination.name, description, touristType: ['情侣', '家庭', '蜜月旅行'], containedInPlace: { '@type': 'Country', name: '希腊' } })
    if (matchedRoute) graph.push({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: matchedRoute.title, description: matchedRoute.desc, itinerary: { '@type': 'ItemList', itemListElement: matchedRoute.itinerary.map(([day, title], index) => ({ '@type': 'ListItem', position: index + 1, name: `${day} ${title}` })) }, provider: { '@type': 'Organization', name: config.siteName, url: baseUrl } })
    let schema = document.head.querySelector('#sy-seo-schema')
    if (!schema) { schema = document.createElement('script'); schema.id = 'sy-seo-schema'; schema.type = 'application/ld+json'; document.head.appendChild(schema) }
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
  }, [pathname, search, settings, dynamicContent])
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
  return null
}

function SearchBox({ initial = '', large = false }) {
  const [value, setValue] = useState(initial)
  const navigate = useNavigate()
  useEffect(() => setValue(initial), [initial])
  function submit(e) {
    e.preventDefault()
    const query = value.trim()
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }
  return (
    <form className={`search-box ${large ? 'search-large' : ''}`} onSubmit={submit} role="search">
      <Search size={18} />
      <input name="query" value={value} onChange={(e) => setValue(e.target.value)} aria-label="搜索" placeholder="搜索路线 / 景点 / 定制需求" />
      {value && <button className="search-clear" type="button" aria-label="清除搜索内容" onClick={() => setValue('')}><X size={16} /></button>}
      <button type="submit">搜索</button>
    </form>
  )
}

const ROUTE_TO_SAMPLE = {
  'athens-3d': 'sample-athens-3d',
  'honeymoon-5d': 'sample-ae-5d',
  'family-7d': 'sample-family-7d',
  'heritage-9d': 'sample-heritage-9d',
}

function routePath(route) {
  const slug = route.slug || route.id || 'honeymoon-5d'
  return ROUTE_TO_SAMPLE[slug] ? `/itineraries/${ROUTE_TO_SAMPLE[slug]}` : `/routes/${slug}`
}

function RouteCard({ route, compact = false }) {
  return (
    <article className={`route-card ${compact ? 'compact' : ''}`}>
      <Link className="route-image" to={routePath(route)} aria-label={`查看${route.title}`}>
        <img src={assetPath(route.image)} alt={route.title} loading="lazy" decoding="async" />
      </Link>
      <div className="route-copy">
        <span className="route-index" aria-hidden="true">{String((route.days || '').match(/\d+/)?.[0] || '01').padStart(2, '0')}</span>
        <Eyebrow>{route.days} · {route.kicker}</Eyebrow>
        <h3><Link to={routePath(route)}>{route.title}</Link></h3>
        <div className="route-tags">{route.tags}</div>
        <p>{route.desc}</p>
        <div className="price-row"><span>参考行程 · 免费浏览</span><Link to={routePath(route)}>查看简版行程 <ArrowRight size={13} /></Link></div>
      </div>
    </article>
  )
}

function DestinationCard({ item }) {
  return (
    <Link to={`/destinations/${item.slug || item.id || 'santorini'}`} className="destination-card">
      <img src={assetPath(item.image)} alt={`${item.name}风光`} loading="lazy" decoding="async" />
      <span><strong>{item.name}</strong><small>{item.en}</small></span>
    </Link>
  )
}

function GuideTeaser({ guide }) {
  const name = guide?.name || 'Richard 李'
  const role = guide?.role || '名人司导'
  const location = guide?.location || '雅典 / 伯罗奔尼撒半岛 / 德尔斐 / 梅黛奥拉 / 圣托里尼'
  const proof = guide?.proof || '武汉大学双学士 · 英国澳洲双硕士 · 欧盟 / 美国 / 中国驾照'
  const avatar = guide?.avatar || images.richardAvatar
  const tags = (guide?.directions || []).slice(0, 3).map((item) => typeof item === 'string' ? item : item.title || item.name).filter(Boolean)
  return (
    <article className="guide-teaser">
      <div className="guide-teaser-avatar"><img src={assetPath(avatar)} alt={`${name}头像`} loading="lazy" decoding="async" /></div>
      <div className="guide-teaser-copy">
        <Eyebrow>Signature Guide · {guide?.nameEn || 'Richard Li'}</Eyebrow>
        <h2>名人导游 · {name}</h2>
        <p>{guide?.intro || guide?.introTw || '旅居欧美多年，深耕希腊历史文化与小众秘境路线。'}</p>
        <div className="guide-teaser-meta"><span>{role}</span><span>{location}</span></div>
        <div className="guide-teaser-credentials">{(tags.length ? tags : ['名校教育', '欧洲精品文旅金牌从业者', '中英美驾照']).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <small className="guide-teaser-proof">{proof}</small>
      </div>
      <Link className="button button-primary" to="/guides/richard-li">查看档案 / 预约时间 <ArrowRight size={15} /></Link>
    </article>
  )
}

function normalizeDestinationCategories(destinations, primary, legacy) {
  const hasPublishedType = (key) => destinations.some((item) => item.status !== 'unpublished' && item.status !== 'archived' && item.type === key)
  const source = Array.isArray(primary) && primary.length > 0 ? primary : (Array.isArray(legacy) && legacy.length > 0 ? legacy : [])
  const normalized = source
    .filter((item) => item && item.enabled !== false && (item.status === undefined || item.status === 'published'))
    .map((item) => ({ ...item, key: item.key || item.id }))
    .filter((item) => item.key && hasPublishedType(item.key))
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  if (normalized.length > 0 || source.length > 0) return normalized
  return ['culture', 'island']
    .filter(hasPublishedType)
    .map((key, index) => ({ key, name: key === 'culture' ? '文明溯源' : '海岛度假', nameTw: key === 'culture' ? '文明溯源' : '海島度假', nameEn: key === 'culture' ? 'Civilization Origins' : 'Aegean Escapes', sort: index + 1 }))
}

function HomeDestinationTile({ item, attraction }) {
  const content = <><img src={assetPath(item.image)} alt={`${item.name}风光`} loading="lazy" decoding="async" /><span><strong>{item.name}</strong><small>{item.nameEn || item.en || 'GREECE'}</small></span>{attraction ? <em>查看景点详情 <ArrowRight size={13} /></em> : <em className="is-unavailable">暂无详情</em>}</>
  if (!attraction) return <article className="destination-card destination-card-disabled" aria-label={`${item.name}暂无关联景点详情`}>{content}</article>
  return <Link to={`/attractions/${attraction.id}`} className="destination-card">{content}</Link>
}

function HomeHero({ countries = [] }) {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]?.id || 'greece')
  const country = countries.find((item) => item.id === selectedCountry) || countries[0]
  const fallbackSlides = [images.santorini, images.athens, images.plaka, images.delphi]
  const slides = [...(country?.heroImage ? [country.heroImage] : []), ...fallbackSlides].filter((source, index, list) => source && list.indexOf(source) === index).map((image) => ({ image }))
  const [active, setActive] = useState(0)
  useEffect(() => { if (countries.length && !countries.some((item) => item.id === selectedCountry)) setSelectedCountry(countries[0].id) }, [countries, selectedCountry])
  useEffect(() => { const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 6500); return () => window.clearInterval(timer) }, [slides.length])
  return <div className="home-hero" style={{ '--hero-image': `url("${assetPath(slides[active]?.image || images.santorini)}")` }}>
    <Header />
    <div className="container hero-content">
      <div className="hero-brand-lockup"><strong>希腊旅行管家</strong><span>Greece Travel Butler</span></div>
      <Eyebrow dark>GREECE TRAVEL BUTLER · TAILOR-MADE JOURNEYS</Eyebrow>
      <h1>只为一生美好回忆</h1>
      <p>希腊在地人文与行程咨询服务。雅典在地团队，<br />一对一中文顾问，提供文化、行程与语言陪同咨询。</p>
      <SearchBox />
      <div className="hero-country-switcher" role="tablist" aria-label="选择国家"><span>探索国家</span>{(countries.length ? countries : [{ id: 'greece', name: '希腊', nameEn: 'Greece' }]).map((item) => <button type="button" className={selectedCountry === item.id ? 'active' : ''} key={item.id} onClick={() => { setSelectedCountry(item.id); setActive(0) }} role="tab" aria-selected={selectedCountry === item.id}>{item.nameEn || item.nameEn === '' ? `${item.name} / ${item.nameEn}` : item.name}</button>)}</div>
      <div className="hero-actions"><Link className="button button-primary" to="/customize">提交行程咨询</Link><a className="button button-ghost" href="#routes">浏览甄选路线</a></div>
      <div className="trust-row"><span><Check size={14} />先沟通需求范围</span><span><Check size={14} />24 小时内回复</span><span><Check size={14} />中文 / English 咨询</span></div>
      <div className="hero-slide-dots" aria-label="品牌头图轮播">{slides.map((slide, index) => <button type="button" key={slide.image} className={active === index ? 'active' : ''} onClick={() => setActive(index)} aria-label={`查看第 ${index + 1} 张头图`} />)}</div>
    </div>
  </div>
}

function SampleItineraryCard({ trip }) {
  return <article className="itinerary-home-card"><Link className="itinerary-home-image" to={`/itineraries/${trip.id}`}><img src={assetPath(trip.cover || trip.image)} alt={trip.title} loading="lazy" decoding="async" /><span>{trip.days} 天</span></Link><div><Eyebrow>{trip.tag || trip.crowd || 'SAMPLE ITINERARY'}</Eyebrow><h3><Link to={`/itineraries/${trip.id}`}>{trip.title}</Link></h3><p>{trip.summary}</p><Link className="text-link" to={`/itineraries/${trip.id}`}>查看参考行程 <ArrowRight size={14} /></Link></div></article>
}

function RouteAudioPreview({ itinerary }) {
  const audioRef = useRef(null)
  const source = itinerary?.audioUrl || itinerary?.audioSrc || (typeof itinerary?.audio === 'string' ? itinerary.audio : '')
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(60)
  const maxDuration = Math.min(60, duration || 60)
  const timeLabel = (value) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
  function toggle() {
    if (!audioRef.current || !source) return
    if (audioRef.current.paused) audioRef.current.play().catch(() => {})
    else audioRef.current.pause()
  }
  function seek(value) {
    if (!audioRef.current || !source) return
    audioRef.current.currentTime = Math.min(Number(value), 60)
    setCurrent(audioRef.current.currentTime)
  }
  return <article className={`route-audio-preview ${source ? 'has-audio' : 'no-audio'}`}>
    {source && <audio ref={audioRef} src={assetPath(source)} preload="metadata" onLoadedMetadata={(event) => setDuration(Math.min(60, event.currentTarget.duration || 60))} onTimeUpdate={(event) => { const value = Math.min(60, event.currentTarget.currentTime); setCurrent(value); if (event.currentTarget.currentTime >= 60) { event.currentTarget.pause(); event.currentTarget.currentTime = 60; setPlaying(false) } }} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
    <div className="route-audio-icon"><Headphones size={21} /></div><div className="route-audio-copy"><Eyebrow>LISTEN BEFORE YOU GO</Eyebrow><h3>甄选路线语音导览</h3><p>{itinerary ? `先听一段「${itinerary.title}」的路线导览，试听时长限制 1 分钟。` : '路线语音导览试听，时长限制 1 分钟。'}</p><div className="route-audio-controls"><button type="button" disabled={!source} onClick={toggle} aria-label={playing ? '暂停试听' : '播放试听'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><input type="range" min="0" max={maxDuration} step="0.1" value={Math.min(current, maxDuration)} disabled={!source} onChange={(event) => seek(event.target.value)} aria-label="试听进度" /><span>{timeLabel(current)} / {timeLabel(maxDuration)}</span><button type="button" disabled={!source} onClick={() => seek(0)} aria-label="从头播放"><RotateCcw size={14} /></button></div>{!source && <small>音频素材待从后台上传，试听控制会在资源可用后启用。</small>}</div>
  </article>
}

const LUXURY_EXPERIENCES = [
  { id: 'private-flight', title: '私人包机', image: images.jet, desc: '雅典往返圣托里尼 / 米克诺斯，跳过轮渡排队，清晨出发，落地即开始假期。', points: ['可协调雅典、圣托里尼、米克诺斯等目的地', '按日期、人数与机型沟通报价', '确认航班、接送与地面安排后再出行'] },
  { id: 'private-yacht', title: '游艇出海', image: images.yacht, desc: '私人游艇 + 船长 + 轻食下午茶，火山湖浮潜、隐秘海湾与海面落日。', points: ['可协调圣托里尼火山湖、隐秘海湾与日落航线', '按日期、人数、船型与餐饮偏好沟通', '出发前确认天气、码头、时长与报价'] },
]

function Home() {
  const [activeCategory, setActiveCategory] = useState('')
  const [content, setContent] = useState({ routes: [], destinations: [], attractions: [], sampleItineraries: [], destinationCategories: [], destinationTypes: [], guides: [], countries: [] })
  useEffect(() => {
    if (window.location.protocol === 'file:') return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((next) => {
      if (next) setContent({
        routes: next.routes || [],
        destinations: next.destinations || [],
        attractions: next.attractions || [],
        sampleItineraries: next.sampleItineraries || [],
        destinationCategories: next.destinationCategories || [],
        destinationTypes: next.destinationTypes || [],
        guides: next.guides || [],
        countries: next.countries || [],
      })
    }).catch(() => {})
  }, [])
  const destinationCategories = useMemo(() => normalizeDestinationCategories(content.destinations, content.destinationCategories, content.destinationTypes), [content.destinations, content.destinationCategories, content.destinationTypes])
  useEffect(() => {
    if (!destinationCategories.some((item) => item.key === activeCategory)) setActiveCategory(destinationCategories[0]?.key || '')
  }, [destinationCategories, activeCategory])
  const featuredGuide = content.guides.find((item) => item.enabled !== false) || null
  const featuredItinerary = content.sampleItineraries[0]
  const services = [
    [Compass, '行程定制', '围绕历史文明、海岛、餐厅与特别安排，沟通一份专属行程规划', '/customize'],
    [Landmark, '古迹讲解', '预约 Richard 李的中文 / 英文文史讲解，先理解，再看见遗址细节', '/heritage-guidance'],
    [BusFront, '在地用车', '咨询车型、司导资质、机场与城际移动等实际用车信息', '/vehicle-consultation'],
    [Map, '文史知识库', '精选城市、景点、参观指南与免费预览，内容随真实数据更新', '/knowledge-base'],
    [Users, '希腊商旅', '商务陪同、语言翻译、企业拜访与人文行程的综合咨询', '/business-travel'],
    [CloudSun, '出行指南', '签证、交通、网络、货币与行前实用攻略，一站式准备出发', '/tools'],
  ]
  const attractionsById = useMemo(() => Object.fromEntries(content.attractions.map((item) => [item.id, item])), [content.attractions])
  return (
    <>
      <HomeHero countries={content.countries} />

      <section id="services" className="section services-section">
        <div className="container">
          <SectionTitle eyebrow="SIX WAYS TO TRAVEL" title="六大服务入口" action={{ to: '/customize', label: '了解全部服务' }} />
          <div className="service-grid">{services.map(([Icon, title, desc, href], index) => <Link to={href} className="service-card" key={title}><span className="service-index" aria-hidden="true">0{index + 1}</span><Icon /><h3>{title}</h3><p>{desc}</p><ArrowRight size={17} /></Link>)}</div>
        </div>
      </section>

      <section className="section home-guide-section">
        <div className="container"><SectionTitle eyebrow="SIGNATURE GUIDE" title="先认识 Richard，再决定如何深入希腊" action={{ to: '/guides/richard-li', label: '查看完整档案' }} /><GuideTeaser guide={featuredGuide} /></div>
      </section>

      <section className="section route-audio-section">
        <div className="container"><RouteAudioPreview itinerary={featuredItinerary} /></div>
      </section>

      <section id="routes" className="section routes-section">
        <div className="container">
          <SectionTitle eyebrow="CURATED ITINERARIES" title="甄选路线" action={{ to: '/itineraries', label: '查看全部参考行程' }} />
          <div className="horizontal-card-track itinerary-home-track">{content.sampleItineraries.map((trip) => <SampleItineraryCard key={trip.id} trip={trip} />)}</div>
        </div>
      </section>

      <section className="section home-customize-section">
        <div className="container customize-entry-banner">
          <div><Eyebrow>TAILOR-MADE CONSULTATION</Eyebrow><strong>定制行程 · 把需求说清楚，再一起规划希腊</strong><span>填写目的地、日期、人数、预算与偏好，顾问会先确认服务范围，再沟通专属方案。</span></div>
          <Link className="button button-gold" to="/customize">填写行程需求 <ArrowRight size={15} /></Link>
        </div>
      </section>

      {destinationCategories.length > 0 && <section className="section destinations-section">
        <div className="container">
          <SectionTitle eyebrow="DESTINATIONS" title="精选目的地" action={{ to: '/attractions', label: '进入城市与景点导览' }} />
          <div className="destination-tabs" role="tablist">{destinationCategories.map((category) => <button type="button" key={category.key} className={activeCategory === category.key ? 'active' : ''} onClick={() => setActiveCategory(category.key)} role="tab" aria-selected={activeCategory === category.key}>{category.name}</button>)}</div>
          {destinationCategories.map((category) => <div key={category.key} className={`destination-group ${activeCategory === category.key ? 'mobile-active' : ''}`}><div className="destination-subhead"><h3>{category.name}</h3><span>{category.nameEn || category.nameTw || category.key}</span></div><div className="destination-grid">{content.destinations.filter((item) => item.status !== 'unpublished' && item.status !== 'archived' && item.type === category.key).map((item) => <HomeDestinationTile key={item.id || item.name} item={item} attraction={item.attractionId ? attractionsById[item.attractionId] : null} />)}</div></div>)}
        </div>
      </section>}

      <section id="experiences" className="section experiences-section">
        <div className="container">
          <SectionTitle dark eyebrow="SIGNATURE EXPERIENCES" title="奢享体验" action={{ to: '/experiences/private-flight', label: '了解奢享定制' }} />
          <div className="horizontal-card-track experience-home-track">{LUXURY_EXPERIENCES.map((item) => <Link className="experience-card" to={`/experiences/${item.id}`} key={item.id}><div className="experience-image"><img src={assetPath(item.image)} alt={item.title} loading="lazy" decoding="async" /><span>高端定制</span></div><div><h3>{item.title}</h3><p>{item.desc}</p><span className="text-link">查看服务内容 <ArrowRight size={14} /></span></div></Link>)}</div>
        </div>
      </section>

      <GoldCTA /><Footer />
    </>
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
        <div className="detail-hero-actions"><strong>咨询费用沟通</strong><Link className="button button-primary" to="/customize">咨询这条线路</Link></div>
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
          <aside className="trip-aside"><div className="summary-card"><h2>行程速览</h2><dl>{route.summary.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl><div className="aside-price"><strong>咨询费用沟通</strong><small>按人数 / 日期报价</small></div><Link className="button button-primary button-block" to="/customize">咨询这条线路 · 沟通费用</Link></div><div className="wechat-tip"><MessageCircle /><span>加定制师微信直接沟通<br /><strong>平均 3 分钟回复 · 先沟通服务范围</strong></span></div></aside>
        </div>
      </main>
      <div className="mobile-sticky-cta"><span>咨询费用沟通</span><Link to="/customize">提交行程咨询</Link></div>
      <Footer />
    </>
  )
}

async function postLead(payload) {
  const next = { ...payload, source: payload.source || 'website', platform: payload.platform || 'website', createdAt: payload.createdAt || new Date().toISOString(), status: 'new' }
  try {
    const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    if (!response.ok) throw new Error('lead api failed')
  } catch {
    const local = JSON.parse(localStorage.getItem('sy-greece-leads') || '[]')
    localStorage.setItem('sy-greece-leads', JSON.stringify([{ ...next, id: `${next.leadType || 'lead'}-${Date.now()}` }, ...local]))
  }
}

function ServiceInquiryForm({ leadType, title = '提交咨询需求', intro = '留下基本信息，我们会先沟通需求范围与服务方式。', fields = [], submitLabel = '提交咨询' }) {
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault(); setSaving(true)
    const form = event.currentTarget
    await postLead({ ...Object.fromEntries(new FormData(form)), leadType })
    form.reset(); setSaving(false); setSent(true); window.setTimeout(() => setSent(false), 5000)
  }
  return <form className="service-inquiry-form" onSubmit={submit}><h2>{title}</h2><p className="form-intro">{intro}</p><div className="field-grid">{fields.map((field) => <label key={field.name}>{field.label}{field.options ? <select name={field.name} defaultValue="" required={field.required}><option value="" disabled>{field.placeholder || '请选择'}</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input name={field.name} type={field.type || 'text'} placeholder={field.placeholder} required={field.required} />}</label>)}</div><label className="service-form-wide">补充说明<textarea name="requirements" rows="4" placeholder="请写下希望了解的内容、时间和特殊要求" /></label><button className="button button-gold button-block submit-button" type="submit" disabled={saving}>{saving ? '正在提交…' : submitLabel}</button>{sent && <p className="success-inline" role="status"><Check size={15} />已收到，我们会尽快联系你沟通。</p>}</form>
}

function ConsultationDock() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  if (pathname.startsWith('/manage-9f3k7')) return null
  const context = pathname.startsWith('/guides/') ? '预约 Richard' : pathname.startsWith('/heritage-guidance') ? '咨询古迹讲解' : pathname.startsWith('/attractions') ? '咨询景点导览' : pathname.startsWith('/business-travel') ? '咨询商旅方案' : pathname.startsWith('/experiences/') ? '咨询奢享体验' : pathname.startsWith('/knowledge-base') ? '咨询知识库' : '在线咨询'
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget
    await postLead({ ...Object.fromEntries(new FormData(form)), leadType: form.leadType.value || 'customization' })
    form.reset(); setSent(true); window.setTimeout(() => { setSent(false); setOpen(false) }, 3500)
  }
  return <div className="consultation-dock">{open && <div id="consultation-form" className="consultation-popover"><button className="consultation-close" onClick={() => setOpen(false)} aria-label="关闭"><X size={17} /></button>{sent ? <div className="consultation-sent"><Check size={22} /><strong>咨询已收到</strong><span>我们会尽快与你沟通需求范围。</span></div> : <form onSubmit={submit}><Eyebrow>ONLINE CONSULTATION</Eyebrow><h3>先说说你想了解什么</h3><p className="consultation-context">当前页面：{context}</p><label>咨询类型<select name="leadType" defaultValue="customization"><option value="customization">行程定制咨询</option><option value="guide-booking">古迹人文讲解预约</option><option value="vehicle-consultation">在地用车资源对接咨询</option><option value="knowledge-base">景点文史知识库</option><option value="business-travel">商旅随行咨询</option></select></label><label>联系方式<input name="contact" required placeholder="微信 / 手机号 / 邮箱" /></label><label>一句话需求<textarea name="requirements" rows="3" placeholder="例如：想了解雅典古迹讲解或商务陪同"></textarea></label><button className="button button-primary button-block" type="submit">提交咨询</button></form>}</div>}<button className="consultation-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="consultation-form"><MessageCircle size={18} />{context}</button></div>
}

function HeritageGuidance() {
  return <><InnerHero eyebrow="CULTURE CONSULTATION" title="古迹人文讲解预约" subtitle="在雅典卫城、古集市、德尔斐与克里特王宫，预约一段有背景、有脉络的现场文史讲解。" breadcrumb="古迹人文讲解" /><main className="service-page section"><div className="container service-page-grid"><div><SectionTitle eyebrow="RICHARD LI · CULTURAL GUIDE" title="把遗址读成一段故事" /><p className="service-lead">可咨询雅典卫城、古集市、德尔斐、克里特王宫等点位的中文或英文文史讲解，时长与人数按需求沟通。</p><div className="service-points"><div><strong>讲解范围</strong><span>历史背景、神话脉络、建筑细节与现场观察方法</span></div><div><strong>预约信息</strong><span>点位、日期、时长、语种和人数</span></div><div><strong>服务边界</strong><span>仅文史知识讲解，不含门票、交通或其他现场费用</span></div></div></div><ServiceInquiryForm leadType="guide-booking" title="预约文史讲解" submitLabel="提交讲解预约" fields={[{ name: 'bookingDate', label: '预约日期', type: 'date', required: true }, { name: 'serviceLength', label: '讲解时长', options: ['1 小时', '半日', '一日'], required: true }, { name: 'site', label: '意向点位', placeholder: '如：雅典卫城', required: true }, { name: 'language', label: '讲解语种', options: ['中文', 'English', '中文 + English'], required: true }, { name: 'travelers', label: '人数', placeholder: '如：2 位成人', required: true }, { name: 'contact', label: '联系方式', placeholder: '微信 / 手机号 / 邮箱', required: true }]} /></div></main><ComplianceNotice /><Footer /></>
}

function VehicleConsultation() {
  return <><InnerHero eyebrow="LOCAL MOBILITY CONSULTATION" title="在地用车资源对接咨询" subtitle="咨询希腊本地用车信息与预约对接方式，先了解车型、司导资质、时间和费用边界。" breadcrumb="用车资源对接" /><main className="service-page section"><div className="container service-page-grid"><div><SectionTitle eyebrow="VEHICLE CONSULTATION" title="按实际场景沟通用车" /><p className="service-lead">可了解欧 6 豪华车型、宝马 SUV / 5 座选择、欧盟持证司导及机场、城际、商务拜访等场景的资源对接信息。</p><div className="service-points"><div><strong>可咨询范围</strong><span>日期、路线、车型、乘坐人数、行李和语言陪同需求</span></div><div><strong>对接边界</strong><span>仅提供信息咨询与预约对接，车辆和劳务由客户与希腊本土主体直接签约结算</span></div></div></div><ServiceInquiryForm leadType="vehicle-consultation" title="提交用车咨询" submitLabel="提交用车咨询" fields={[{ name: 'vehicleDate', label: '用车日期', type: 'date', required: true }, { name: 'vehicleNeed', label: '用车场景', options: ['机场 / 港口接送', '城际移动', '商务拜访', '古迹与城市移动'], required: true }, { name: 'travelers', label: '随行人数', placeholder: '如：4 人 + 行李', required: true }, { name: 'contact', label: '联系方式', placeholder: '微信 / 手机号 / 邮箱', required: true }]} /></div></main><ComplianceNotice /><Footer /></>
}

function BusinessTravel() {
  return <><InnerHero eyebrow="BUSINESS TRAVEL CONSULTATION" title="希腊商旅一站式随行服务" subtitle="面向企业拜访、展会、会议和商务接待的行程策划、语言陪同与资源对接咨询。" breadcrumb="商旅随行服务" /><main className="service-page section"><div className="container service-page-grid"><div><SectionTitle eyebrow="BUSINESS TRAVEL" title="把商务沟通与人文体验放在同一条线上" /><p className="service-lead">Richard 李具备武汉大学及英澳双硕士背景，提供高阶中英双语翻译与商旅行程咨询。</p><div className="business-points"><span>涉外商务全程陪同咨询</span><span>商务会议口译、文件笔译需求沟通</span><span>企业拜访、展厅参观与商务晚宴安排咨询</span><span>商务间隙古迹人文深度解读</span><span>宝马 SUV 私享出行资源对接</span><span>商旅与人文融合的一站式方案咨询</span></div></div><ServiceInquiryForm leadType="business-travel" title="提交商旅咨询" intro="请填写商务周期、陪同时长、行业对接需求与随行人数，我们会先确认服务范围与沟通方式。" submitLabel="提交商旅咨询" fields={[{ name: 'businessPeriod', label: '商务周期', placeholder: '如：2026 年 10 月 12–16 日', required: true }, { name: 'companionDuration', label: '陪同时长', placeholder: '如：3 天 / 每天 8 小时', required: true }, { name: 'industryNeeds', label: '行业对接需求', placeholder: '如：医疗器械企业拜访 / 展会陪同', required: true }, { name: 'travelers', label: '随行人数', placeholder: '如：3 人', required: true }, { name: 'contact', label: '联系方式', placeholder: '微信 / 手机号 / 邮箱', required: true }]} /></div></main><ComplianceNotice /><Footer /></>
}

const knowledgeSpots = [
  { slug: 'acropolis', name: '雅典卫城', en: 'ACROPOLIS', image: images.athens, preview: '免费预览：从山门、帕特农神庙到城市守护神，先建立一张古典雅典的地图。', audio: '1:00 试听片段占位', unlocked: ['历史与神话音频深度讲解', '建筑细节图文手册', '现场观看顺序与知识点'] },
  { slug: 'delphi', name: '德尔斐', en: 'DELPHI', image: images.delphi, preview: '免费预览：为什么古希腊人把德尔斐称为世界中心？从神谕、圣路与山谷开始。', audio: '1:00 试听片段占位', unlocked: ['阿波罗神庙与神谕传统', '宝库、剧场与圣路图文', '一对一线上人文咨询入口'] },
  { slug: 'santorini', name: '圣托里尼', en: 'SANTORINI', image: images.santorini, preview: '免费预览：火山岛、海风与葡萄酒，蓝顶之外的圣岛地质与聚落故事。', audio: '1:00 试听片段占位', unlocked: ['火山地质与岛屿历史音频', '村落、建筑与观景点手册', '行前人文主题咨询'] },
  { slug: 'knossos', name: '克里特王宫', en: 'KNOSSOS', image: images.crete, preview: '免费预览：米诺斯文明的宫殿、迷宫传说与克里特岛的海上交流。', audio: '1:00 试听片段占位', unlocked: ['米诺斯文明时间线', '宫殿布局与神话图文', '深度阅读与视频咨询'] },
]

function KnowledgeBaseIndex() {
  const [content, setContent] = useState({ cities: [], attractions: [] })
  useEffect(() => {
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => setContent({ cities: payload?.cities || [], attractions: payload?.attractions || [] })).catch(() => {})
  }, [])
  const cities = content.cities.filter((city) => city.status !== 'unpublished' && city.status !== 'archived')
  const attractions = content.attractions.filter((item) => item.status !== 'unpublished' && item.status !== 'archived')
  return <><InnerHero image={images.athens} eyebrow="KNOWLEDGE BASE" title="景点文史知识库" subtitle="从精选城市进入城市导览，再打开景点详情、参观指南与免费内容预览。" breadcrumb="景点文史知识库"><div className="hero-actions"><Link className="button button-primary" to="/attractions">进入完整城市导览</Link><Link className="button button-ghost" to="/itineraries">查看关联行程</Link></div></InnerHero><main className="knowledge-index section"><div className="container"><SectionTitle eyebrow="SELECT A CITY" title="精选城市" action={{ to: '/attractions', label: '查看全部城市导览' }} /><div className="knowledge-city-grid">{cities.map((city) => <Link className="knowledge-city-card" to={`/attractions/city/${city.id}`} key={city.id}><div>{(city.mosaic || []).slice(0, 3).map((image, index) => <img key={index} src={assetPath(image)} alt="" loading="lazy" decoding="async" />)}</div><strong>{city.name}</strong><span>{city.subtitle || city.country}</span><small>{city.museumCount || 0} 个景点 · {city.audioMinutes || 0} 分钟讲解</small></Link>)}</div>{attractions.length > 0 && <section className="knowledge-featured-attractions"><SectionTitle eyebrow="FREE PREVIEW" title="从一个景点开始" /><div className="knowledge-grid">{attractions.slice(0, 4).map((item) => <Link className="knowledge-card" to={`/attractions/${item.id}`} key={item.id}><img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" /><div><Eyebrow>{item.en || item.cityName}</Eyebrow><h3>{item.name}</h3><p>{item.summary}</p><span className="text-link">查看景点详情 <ArrowRight size={14} /></span></div></Link>)}</div></section>}<div className="knowledge-notice"><LockKeyhole size={18} /><span>景点详情、参观指南、视频 / 语音字段与关联行程均读取 Website 内容接口；付费解锁能力按当前生产支付与会员状态开放。</span></div></div></main><ComplianceNotice /><Footer /></>
}

function KnowledgeBase() {
  const { slug } = useParams()
  const spot = knowledgeSpots.find((item) => item.slug === slug)
  if (!spot) return <KnowledgeBaseIndex />
  if (spot) return <><InnerHero image={spot.image} eyebrow={`KNOWLEDGE BASE · ${spot.en}`} title={spot.name} subtitle="免费预览一段景点背景，完整音频与图文内容将在真实支付/会员能力接入后开放。" breadcrumb={`景点文史知识库 / ${spot.name}`} /><main className="knowledge-detail section"><div className="container knowledge-detail-grid"><article className="knowledge-preview"><Eyebrow>FREE PREVIEW</Eyebrow><h2>{spot.name}：先听懂，再看见</h2><p>{spot.preview}</p><div className="audio-placeholder"><Headphones size={20} /><span>{spot.audio}</span><button type="button" disabled>试听占位</button></div><p className="knowledge-disclaimer">当前为内容结构与免费预览展示，未上线真实购买、支付或会员权益。</p></article><aside className="knowledge-unlock"><Eyebrow>UNLOCK LATER</Eyebrow><h3>付费解锁板块（占位）</h3>{spot.unlocked.map((item) => <div key={item}><Check size={15} />{item}</div>)}<button className="button button-deep button-block" type="button" disabled>支付 / 会员功能后续接入</button><Link className="text-link" to="/knowledge-base">返回知识库目录 <ChevronRight size={15} /></Link></aside></div></main><ComplianceNotice /><Footer /></>
  return <><InnerHero eyebrow="KNOWLEDGE BASE" title="景点付费文史知识库" subtitle="先从免费预览认识雅典卫城、德尔斐、圣岛与克里特王宫，完整内容能力后续接入。" breadcrumb="景点文史知识库" /><main className="knowledge-index section"><div className="container"><SectionTitle eyebrow="GREEK HISTORY · AUDIO · GUIDE" title="把景点从打卡变成理解" /><div className="knowledge-grid">{knowledgeSpots.map((item) => <article className="knowledge-card" key={item.slug}><img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" /><div><Eyebrow>{item.en}</Eyebrow><h3>{item.name}</h3><p>{item.preview}</p><Link className="text-link" to={`/knowledge-base/${item.slug}`}>查看免费预览 <ArrowRight size={14} /></Link></div></article>)}</div><div className="knowledge-notice"><LockKeyhole size={18} /><span>音频深度讲解、图文手册和会员订阅目前仅做页面占位，真实支付与会员系统需后续接入，不代表已上线购买。</span></div></div></main><ComplianceNotice /><Footer /></>
}

function Customize() {
  const [language] = useLanguage()
  const [themes, setThemes] = useState(['历史文明'])
  const [sent, setSent] = useState(false)
  const [saving, setSaving] = useState(false)
  const themeOptions = ['历史文明', '海滩海岛', '餐厅偏好', '特别安排', '体育活动', '高端私旅', '商务', '司导', '翻译']
  function toggleTheme(theme) { setThemes((current) => current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme]) }
  async function submit(e) {
    e.preventDefault(); setSaving(true)
    const form = e.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), themes, leadType: 'customization', createdAt: new Date().toISOString(), status: 'new' }
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('lead api failed')
    } catch {
      const local = JSON.parse(localStorage.getItem('sy-greece-leads') || '[]')
      localStorage.setItem('sy-greece-leads', JSON.stringify([{ ...payload, id: `lead-${Date.now()}` }, ...local]))
    } finally {
      setSaving(false); setSent(true); form.reset(); setThemes(['历史文明']); setTimeout(() => setSent(false), 5000)
    }
  }
  return (
    <>
      <section className="custom-top"><Header solid /><div className="container custom-intro"><Eyebrow dark>ITINERARY CONSULTATION</Eyebrow><h1>把需求说清楚，再一起规划希腊</h1><p>行程资讯与方案咨询 · 提交后沟通服务范围与咨询费用 · 中文 / English</p></div></section>
      <main className="section form-section">
        <div className="container form-layout">
          <form className="custom-form" onSubmit={submit}>
            <h2>行程定制咨询问卷</h2>
            <div className="field-grid"><label>意向目的地<input name="destination" required placeholder="如：雅典 + 圣托里尼" /></label><label>出行日期<input name="travelDate" type="date" required /></label><label>预计天数<input name="duration" required placeholder="如：7 天" /></label><label>出行人数<input name="travelers" required placeholder="如：2 大 1 小" /></label><label>儿童年龄<input name="childAges" placeholder="如：4 岁、8 岁；无儿童可留空" /></label><label>单日车程上限<input name="maxDriveHours" type="number" min="0" max="12" placeholder="如：3 小时" /></label><label>预算范围<select name="budget" defaultValue=""><option value="">请选择预算范围</option><option>先沟通需求</option><option>1–2 万元 / 人</option><option>2–4 万元 / 人</option><option>4 万元以上 / 人</option></select></label></div>
            <fieldset><legend>关注方向（可多选）</legend><div className="theme-chips">{themeOptions.map((theme) => <button type="button" key={theme} className={themes.includes(theme) ? 'active' : ''} onClick={() => toggleTheme(theme)}>{themes.includes(theme) && <Check size={14} />}{theme}</button>)}</div></fieldset>
            <label>特别需求<textarea name="requirements" rows="5" placeholder="请补充历史兴趣、餐厅偏好、特别安排、体育活动或语言陪同需求" /></label>
            <label>联系电话 / 微信<input name="contact" required placeholder="用于顾问联系你沟通" /></label>
            <button className="button button-gold button-block submit-button" type="submit" disabled={saving}>{saving ? '正在提交…' : '提交行程咨询'}</button>
            <p className="privacy">提交即表示同意我们通过电话 / 微信联系你，信息仅用于咨询沟通与方案规划。</p>
            {sent && <div className="success-message"><Check />需求已收到，定制师会在 24 小时内联系你。</div>}
          </form>
          <aside className="custom-aside"><div className="advisor-card"><h2>{language === 'en' ? 'Prefer a direct conversation?' : language === 'zh-TW' ? '想直接聊聊？' : '更想直接聊？'}</h2><div className="advisor"><img className="advisor-avatar" src={images.consultantAvatar} alt="Jenny" /><div><h3>{language === 'en' ? 'Jenny · Greece Trip Planner' : language === 'zh-TW' ? 'Jenny · 希臘行程規劃師' : 'Jenny · 希腊行程规划师'}</h3><p>{language === 'en' ? 'Local Greece planning for families and businesses' : language === 'zh-TW' ? '希臘在地行程規劃，服務家庭與企業客戶' : '希腊在地行程规划，服务家庭与企业客户'}</p></div></div><p className="advisor-wechat">{language === 'en' ? 'WeChat: SYGJ1130 · replies within 24 hours' : language === 'zh-TW' ? '微信號：SYGJ1130 · 24 小時內回覆' : '微信号：SYGJ1130 · 24 小时内回复'}</p><div className="qr"><img src={images.consultantQr} alt="Jenny WeChat QR code" /><span>{language === 'en' ? 'Scan to add WeChat' : language === 'zh-TW' ? '掃碼添加微信' : '扫码添加微信'}</span></div><a className="advisor-phone" href="tel:+8615071465661">{language === 'en' ? 'Call Jenny · +86 150 7146 5661' : language === 'zh-TW' ? '致電 Jenny · +86 150 7146 5661' : '致电 Jenny · +86 150 7146 5661'}</a></div><div className="promise-card"><h2>咨询流程</h2><p>· 提交问卷 → 需求沟通</p><p>· 输出行程规划建议 → 沟通咨询费用</p><p>· 交通、场地与劳务由客户与本土主体直接确认</p></div></aside>
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
            <section className="included-routes"><SectionTitle eyebrow="TAILOR-MADE" title={`${item.name}暂无固定线路`} action={{ to: '/customize', label: `定制我的${item.name}行程` }} /><div className="empty-state"><Compass /><h2>按你的节奏定制</h2><p>{item.name}目前以行程规划咨询方式沟通，告诉我们出行时间与偏好，我们会先确认需求范围与服务方式。</p><Link className="button button-primary" to="/customize">提交行程咨询</Link></div></section>
          )}
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

const SEARCH_EXPERIENCES = LUXURY_EXPERIENCES.map(({ id, title, desc, image }) => ({ id, title, desc, image }))

function LuxuryExperienceDetail() {
  const { slug } = useParams()
  const item = LUXURY_EXPERIENCES.find((entry) => entry.id === slug)
  const [phone, setPhone] = useState('15071465661')
  useEffect(() => {
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      const configured = payload?.settings?.consultPhone || (payload?.settings?.phone && !String(payload.settings.phone).includes('000 000') ? payload.settings.phone : '')
      if (configured) setPhone(configured)
    }).catch(() => {})
  }, [])
  if (!item) return <NotFound />
  const tel = String(phone).replace(/[^\d+]/g, '')
  return <>
    <InnerHero image={item.image} eyebrow="SIGNATURE EXPERIENCE" title={item.title} subtitle={item.desc} breadcrumb={`奢享体验 / ${item.title}`}>
      <div className="detail-hero-actions"><strong>按日期与人数沟通报价</strong><a className="button button-primary" href={`tel:${tel}`}>直接电话咨询 <Phone size={15} /></a></div>
    </InnerHero>
    <main className="detail-page section luxury-detail-page"><div className="container detail-layout"><div><article className="intro-card"><Eyebrow>PRIVATE ARRANGEMENT</Eyebrow><h2>把重要的时光，交给一份从容安排</h2><p>{item.desc} 我们会先确认出行日期、人数、目的地与服务边界，再提供可执行的协调方案与报价。</p></article><section className="luxury-detail-section"><SectionTitle eyebrow="WHAT WE COORDINATE" title="服务内容" /><div className="service-points">{item.points.map((point) => <div key={point}><Check size={16} /><span>{point}</span></div>)}</div></section><section className="luxury-detail-section"><SectionTitle eyebrow="BEFORE CONFIRMATION" title="准备与确认" /><div className="luxury-preparation"><p>请提前提供预计日期、人数、行李或餐饮偏好，以及希望前往的目的地。实际可行性会结合天气、机位 / 船期、码头与当地运营方确认。</p><p>本页面仅提供文化与行程咨询、资源信息和沟通入口；交通、场地及劳务由客户与希腊本土主体直接确认和结算。</p></div></section></div><aside className="trip-aside"><div className="summary-card"><h2>直接咨询</h2><p>告诉顾问你的日期、人数与目的地，我们会先确认资源与报价。</p><a className="button button-primary button-block" href={`tel:${tel}`}><Phone size={15} />拨打顾问电话</a><Link className="button button-gold button-block" to="/customize">填写详细需求</Link><small className="luxury-phone-note">咨询电话：{phone}</small></div></aside></div></main><GoldCTA /><Footer />
  </>
}

function searchText(item) {
  return Object.values(item).flat(Infinity).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ').toLocaleLowerCase()
}

function SearchAttractionCard({ item }) {
  return <Link className="search-attraction-card" to={`/attractions/${item.id}`}><img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" /><div><Eyebrow>{item.en || item.cityName || 'ATTRACTION'}</Eyebrow><h3>{item.name}</h3><p>{item.summary}</p><span className="text-link">查看景点详情 <ArrowRight size={14} /></span></div></Link>
}

function SearchExperienceCard({ item }) {
  return <article className="experience-card"><div className="experience-image"><img src={assetPath(item.image)} alt={item.title} loading="lazy" decoding="async" /><span>高端定制</span></div><div><h3>{item.title}</h3><p>{item.desc}</p><Link to="/customize">咨询{item.title}方案 <ArrowRight size={14} /></Link></div></article>
}

function SearchPage() {
  const [params] = useSearchParams()
  const keyword = (params.get('q') || '').trim()
  const [filter, setFilter] = useState('all')
  const [content, setContent] = useState({ routes, destinations, attractions: [] })
  useEffect(() => {
    if (window.location.protocol === 'file:') return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!payload) return
      setContent({
        routes: payload.routes?.length ? payload.routes : routes,
        destinations: payload.destinations?.length ? payload.destinations : destinations,
        attractions: payload.attractions || [],
      })
    }).catch(() => {})
  }, [])
  const results = useMemo(() => {
    const records = [
      ...content.routes.map((item) => ({ type: 'route', item })),
      ...content.destinations.map((item) => ({ type: 'destination', item })),
      ...content.attractions.map((item) => ({ type: 'attraction', item })),
      ...SEARCH_EXPERIENCES.map((item) => ({ type: 'experience', item })),
    ]
    if (!keyword) return records
    const normalized = keyword.toLocaleLowerCase()
    return records.filter(({ item }) => searchText(item).includes(normalized))
  }, [content, keyword])
  const counts = useMemo(() => Object.fromEntries(['route', 'destination', 'attraction', 'experience'].map((type) => [type, results.filter((entry) => entry.type === type).length])), [results])
  const filters = [['all', `全部 ${results.length}`], ['route', `路线 ${counts.route}`], ['destination', `目的地 ${counts.destination}`], ['attraction', `景点 ${counts.attraction}`], ['experience', `奢享体验 ${counts.experience}`]].filter(([id]) => id === 'all' || counts[id] > 0)
  useEffect(() => {
    if (!filters.some(([id]) => id === filter)) setFilter('all')
  }, [keyword, results.length])
  const visible = filter === 'all' ? results : results.filter(({ type }) => type === filter)
  const visibleOf = (type) => visible.filter((entry) => entry.type === type).map(({ item }) => item)
  const routeResults = visibleOf('route')
  const destinationResults = visibleOf('destination')
  const attractionResults = visibleOf('attraction')
  const experienceResults = visibleOf('experience')
  return (
    <>
      <section className="search-top"><Header solid /><div className="container search-intro"><Eyebrow dark>SEARCH GREECE TRAVEL BUTLER</Eyebrow><h1>搜索希腊灵感</h1><SearchBox initial={keyword} large /></div></section>
      <main className="search-results section">
        <div className="container"><p className="result-summary">{keyword ? `“${keyword}” 的相关结果` : '全部可探索内容'} · 共 {results.length} 条</p><div className="filter-chips">{filters.map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
          {routeResults.length > 0 && <section><SectionTitle eyebrow="CURATED ROUTES" title="相关路线" /><div className="route-grid">{routeResults.map((route) => <RouteCard compact key={route.id || route.slug || route.title} route={route} />)}</div></section>}
          {destinationResults.length > 0 && <section className="search-destinations"><SectionTitle eyebrow="DESTINATIONS" title="相关目的地" /><div className="destination-grid">{destinationResults.map((item) => <DestinationCard key={item.id || item.slug || item.name} item={item} />)}</div></section>}
          {attractionResults.length > 0 && <section className="search-attractions"><SectionTitle eyebrow="ATTRACTIONS & MUSEUMS" title="相关景点" /><div className="search-attraction-grid">{attractionResults.map((item) => <SearchAttractionCard key={item.id} item={item} />)}</div></section>}
          {experienceResults.length > 0 && <section className="search-experiences"><SectionTitle eyebrow="SIGNATURE EXPERIENCES" title="相关奢享体验" /><div className="experience-grid">{experienceResults.map((item) => <SearchExperienceCard key={item.id} item={item} />)}</div></section>}
          {results.length === 0 && <section className="empty-state"><Search /><h2>没有找到相关内容</h2><p>试试搜索“雅典”“圣托里尼”“古迹”或“蜜月”。</p><Link className="button button-primary" to="/customize">告诉我们你的需求</Link></section>}
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
  const fallbackCopy = translate('guide', language)
  const [guide, setGuide] = useState(null)
  useEffect(() => {
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => setGuide(payload?.guides?.find((item) => item.id === 'richard-li' && item.enabled !== false) || null)).catch(() => {})
  }, [])
  const copy = {
    ...fallbackCopy,
    eyebrow: guide?.eyebrow || fallbackCopy.eyebrow,
    title: guide?.name ? `${guide.name}|${guide.role || fallbackCopy.role}` : fallbackCopy.title,
    role: guide?.role || fallbackCopy.role,
    note: guide?.storyNote || guide?.intro || fallbackCopy.note,
    profileTitle: guide?.name || fallbackCopy.profileTitle,
    profileEyebrow: guide?.nameEn || fallbackCopy.profileEyebrow,
    profileEducation: guide?.proof || fallbackCopy.profileEducation,
    profileBio: guide?.intro || fallbackCopy.profileBio,
    profileTags: (guide?.directions || []).slice(0, 3).map((item) => typeof item === 'string' ? item : item.title || item.name).filter(Boolean).length ? (guide.directions || []).slice(0, 3).map((item) => typeof item === 'string' ? item : item.title || item.name).filter(Boolean) : fallbackCopy.profileTags,
    storyTitle: guide?.storyTitle || fallbackCopy.storyTitle,
    storyParagraphs: [guide?.story1, guide?.story2].filter(Boolean).length ? [guide.story1, guide.story2].filter(Boolean) : fallbackCopy.storyParagraphs,
    quote: guide?.quote || fallbackCopy.quote,
    credentialsTitle: guide?.credentialsTitle || fallbackCopy.credentialsTitle,
    guestbookTitle: guide?.reviewsTitle || fallbackCopy.guestbookTitle,
    quotes: (guide?.reviews || []).map((item) => [item.quote || item.text || item.content, item.author || item.name]).filter(([quote, author]) => quote && author).length ? (guide.reviews || []).map((item) => [item.quote || item.text || item.content, item.author || item.name]).filter(([quote, author]) => quote && author) : fallbackCopy.quotes,
  }
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
      setBookingMessage('提交失败，请稍后重试或直接联系我们。')
      return
    } finally {
      setSubmitting(false)
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
            <div className="guide-avatar"><img src={assetPath(guide?.fullImage || guide?.avatar || images.richardAvatar)} alt={`${guide?.name || 'Richard 李'}头像`} loading="lazy" decoding="async" /></div>
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
          <div className="container"><Eyebrow>{copy.signatureEyebrow}</Eyebrow><h2>{copy.signatureTitle}</h2><p className="section-lead">{copy.signatureLead}</p><div className="signature-grid">{services.map(([title, desc, duration, audience], index) => <article className={`signature-card ${index === 3 ? 'signature-gold' : ''}`} key={title}><img src={signature[index][0]} alt={title} loading="lazy" decoding="async" /><div><h3>{title}</h3><p>{desc}</p><div><span>{duration}</span><small>{audience}</small></div></div></article>)}</div></div>
        </section>

        <section className="guide-section guestbook-section">
          <div className="container"><Eyebrow dark>{copy.guestbookEyebrow}</Eyebrow><h2>{copy.guestbookTitle}</h2><div className="guestbook-grid">{quotes.map(([quote, author]) => <blockquote key={author}><p>{quote}</p><cite>— {author}</cite></blockquote>)}</div></div>
        </section>

        <section className="guide-section reserve-section" id="reserve">
          <div className="container"><Eyebrow>{copy.reserveEyebrow}</Eyebrow><h2>{copy.reserveTitle}</h2><p className="section-lead">{copy.reserveLead}</p><div className="booking-layout">
            <div className="calendar-card"><div className="calendar-head"><div><strong>{copy.calendarTitle}</strong><small>{copy.calendarMonth}</small></div><span>‹</span><span>›</span></div><div className="calendar-week">{(language === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : language === 'zh-TW' ? ['一', '二', '三', '四', '五', '六', '日'] : ['一', '二', '三', '四', '五', '六', '日']).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><div className="calendar-grid">{calendarDays.map((day, index) => day ? <button key={day} type="button" className={`calendar-day ${dateStates[day] || ''} ${selectedDate === `2026-09-${String(day).padStart(2, '0')}` ? 'selected' : ''}`} disabled={dateStates[day] !== 'available'} onClick={() => setSelectedDate(`2026-09-${String(day).padStart(2, '0')}`)}>{day}</button> : <span key={`blank-${index}`} />)}</div><div className="calendar-legend"><span><i className="available-dot" />{copy.available}</span><span><i className="pending-dot" />{copy.pending}</span><span><i className="booked-dot" />{copy.booked}</span></div></div>
            <form className="booking-form" onSubmit={submitBooking}><div className="booking-form-head"><h3>{copy.formTitle}</h3><p>{copy.formLead}</p></div><label>{copy.duration}<select name="serviceLength" defaultValue={copy.durations[0]}>{copy.durations.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.travelers}<select name="travelers" defaultValue={copy.travelerOptions[1]}>{copy.travelerOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.requirements}<input name="requirements" required placeholder={copy.requirementsPlaceholder} /></label><label>{copy.contact}<input name="contact" required placeholder={copy.contactPlaceholder} /></label><button className="button button-deep button-block" type="submit" disabled={submitting}>{submitting ? copy.submitting : copy.submit}</button>{bookingMessage && <p className={`booking-message ${bookingMessage === copy.success ? 'success' : ''}`} role="status">{bookingMessage}</p>}</form>

          </div></div>
        </section>
      </main>
      <section className="guide-final-cta"><div className="container"><h2>{copy.finalTitle}</h2><p>{copy.finalLead}</p><a className="button button-deep" href="#reserve">{bookingLabel} <ArrowRight size={15} /></a></div></section>
      <Footer />
      <div className="guide-mobile-cta"><span>{language === 'en' ? 'Tailored quote' : language === 'zh-TW' ? '專屬報價' : '专属报价'}</span><a href="#reserve">{bookingLabel}</a></div>
    </>
  )
}

function MyPage() {
  return <>
    <InnerHero image={images.athens} eyebrow="MY GREECE TRAVEL BUTLER" title="我的" subtitle="登录、绑定手机号后，在小程序中查看预约、行程与个人资料。" breadcrumb="我的" short />
    <main className="section my-page"><div className="container"><div className="my-profile-card"><div className="my-profile-icon"><UserRound size={25} /></div><div><Eyebrow>WECHAT ACCOUNT</Eyebrow><h2>微信登录与手机号绑定</h2><p>Website 保留同一套内容与咨询入口；微信登录、手机号绑定及个人数据由 MpApp 安全承载。</p></div><Link className="button button-primary" to="/customize">立即联系顾问</Link></div><div className="my-feature-grid"><article><CalendarDays /><h3>预约与行程</h3><p>查看已提交的导游预约、定制需求与专属行程链接。</p></article><article><Heart /><h3>优惠券与收藏</h3><p>小程序登录后查看可用优惠券及已保存的旅行内容。</p></article><article><Users /><h3>出行人资料</h3><p>维护同行人、护照与签证资料，出发前集中查看。</p></article><article><UserRound /><h3>个人资料与关于我们</h3><p>编辑个人资料，了解希腊旅行管家的服务边界与联系方式。</p></article></div><div className="my-about-card"><Eyebrow>GREECE TRAVEL BUTLER</Eyebrow><h2>只为一生美好回忆</h2><p>sy-greece.com 提供希腊文化咨询、行程策划与语言陪同咨询。需要登录或资料协助时，请在微信小程序中完成操作，或直接联系顾问。</p><a className="button button-gold" href="tel:+8615071465661">电话咨询 · +86 150 7146 5661</a></div></div></main><GoldCTA /><Footer />
  </>
}

function PublicBottomNav() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/manage-9f3k7')) return null
  return <nav className="public-bottom-nav" aria-label="主要导航"><Link to="/"><HomeIcon size={18} /><span>首页</span></Link><Link to="/#contact"><Phone size={18} /><span>立即联系</span></Link><Link to="/my"><UserRound size={18} /><span>我的</span></Link></nav>
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
  return <><ScrollToTop /><SEO /><Routes><Route path="/" element={<Home />} /><Route path="/routes/:slug" element={<RouteDetail />} /><Route path="/customize" element={<Customize />} /><Route path="/heritage-guidance" element={<HeritageGuidance />} /><Route path="/vehicle-consultation" element={<VehicleConsultation />} /><Route path="/knowledge-base" element={<KnowledgeBase />} /><Route path="/knowledge-base/:slug" element={<KnowledgeBase />} /><Route path="/attractions" element={<AttractionsIndex />} /><Route path="/attractions/city/:cityId" element={<CityGuidePage />} /><Route path="/attractions/:id" element={<AttractionDetail />} /><Route path="/itineraries" element={<ItinerariesIndex />} /><Route path="/itineraries/:id" element={<ItineraryDetail />} /><Route path="/trip/:token" element={<CustomTripPage />} /><Route path="/business-travel" element={<BusinessTravel />} /><Route path="/experiences/:slug" element={<LuxuryExperienceDetail />} /><Route path="/destinations/:slug" element={<DestinationDetail />} /><Route path="/guides/richard-li" element={<GuidePage />} /><Route path="/search" element={<SearchPage />} /><Route path="/tools" element={<ToolsPage />} /><Route path="/my" element={<MyPage />} /><Route path="/admin" element={<LegacyAdminRedirect />} /><Route path="/manage-9f3k7" element={<AdminPage />} /><Route path="*" element={<NotFound />} /></Routes><ConsultationDock /><PublicBottomNav /></>
}
