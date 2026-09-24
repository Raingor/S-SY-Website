import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowRight, BusFront, CalendarDays, Check, ChevronRight, CircleDollarSign, Info,
  Clock3, CloudSun, Compass, Euro, Heart, Landmark, Mail, Map, MapPin,
  MessageCircle, Phone, Plane, Search, ShipWheel, Sparkles, SunMedium,
  Users, Waves, X, Headphones, LockKeyhole, Pause, Play, RotateCcw, Home as HomeIcon, UserRound,
} from 'lucide-react'
import AdminPage from './admin-element'
import { AttractionsIndex, AttractionDetail, CityGuidePage, ItinerariesIndex, ItineraryDetail, CustomTripPage } from './attractions'
import { assetPath, ComplianceNotice, ContentActions, Eyebrow, Footer, GoldCTA, Header, InnerHero, Logo, SectionTitle, images } from './chrome'
import { translate, useLanguage } from './i18n'
import './user-experience.css'
import { SiteContentProvider, useSiteContent, visibleRecords } from './site-content'
import { clearRecentContent, readRecentContent, readSavedContent, recordRecentContent, removeSavedContent, userContentChangeEvent } from './web-user-state'

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
  const { content } = useSiteContent()
  const settings = { ...fallbackSeoSettings, ...(content.settings || {}) }
  const dynamicContent = content
  useEffect(() => {
    const config = { ...fallbackSeoSettings, ...settings }
    const path = pathname || '/'
    const query = new URLSearchParams(search).get('q')
    const routeMatch = path.match(/^\/routes\/([^/]+)$/)
    const matchedRoute = routeMatch ? dynamicContent.routes.find((item) => item.id === decodeURIComponent(routeMatch[1])) : null
    const destMatch = path.match(/^\/destinations\/([^/]+)$/)
    const matchedDestination = destMatch ? dynamicContent.destinations.find((item) => item.id === decodeURIComponent(destMatch[1])) : null
    const params = new URLSearchParams(search)
    const queryId = params.get('id') || ''
    const attractionMatch = path.match(/^\/attractions\/([^/]+)$/)
    const aliasAttractionId = path === '/pages/attraction/detail' ? queryId : ''
    const matchedAttraction = dynamicContent.attractions.find((item) => item.id === decodeURIComponent(attractionMatch?.[1] || aliasAttractionId)) || null
    const cityMatch = path.match(/^\/attractions\/city\/([^/]+)(?:\/spots)?$/)
    const aliasCityId = path === '/pages/city/index' || path === '/pages/city/spots' ? queryId : ''
    const matchedCity = dynamicContent.cities.find((item) => item.id === (cityMatch?.[1] || aliasCityId)) || null
    const itineraryMatch = path.match(/^\/itineraries\/([^/]+)$/)
    const aliasItineraryId = path === '/itinerary/detail' || path === '/pages/itinerary/detail' ? queryId : ''
    const matchedItinerary = dynamicContent.sampleItineraries.find((item) => item.id === decodeURIComponent(itineraryMatch?.[1] || aliasItineraryId)) || null
    const guideMatch = path.match(/^\/guides\/([^/]+)$/)
    const aliasGuideId = path === '/pages/guide/guide' ? (queryId || 'richard-li') : ''
    const matchedGuide = dynamicContent.guides.find((item) => item.id === decodeURIComponent(guideMatch?.[1] || aliasGuideId)) || null
    const luxuryType = path === '/pages/luxury/detail' ? params.get('type') : ''
    const luxurySlug = path.match(/^\/experiences\/([^/]+)$/)?.[1] || luxuryType
    const matchedExperience = (dynamicContent.experiences || dynamicContent.settings?.experiences || []).find((item) => item.id === luxurySlug || item.shareType === luxuryType)
    const knowledgeMatch = path.match(/^\/knowledge-base\/([^/]+)$/)
    const matchedKnowledgeSpot = knowledgeMatch ? dynamicContent.attractions.find((item) => item.id === decodeURIComponent(knowledgeMatch[1])) : null
    const pages = {
      '/': [`${config.homeTitle || '只为一生美好回忆'}｜${config.siteName || '希腊旅行管家'}`, config.homeDescription || config.defaultDescription],
      '/customize': ['希腊行程咨询｜提交需求沟通方案', '告诉我们出行时间、人数与偏好，先沟通需求范围与行程规划方式。'],
      '/search': [`搜索${query ? `“${query}”` : '希腊旅行'}｜Greece Travel Butler`, `搜索希腊路线、目的地和私人定制旅行灵感。${query ? `当前关键词：${query}。` : ''}`],
      '/tools': ['希腊行前信息工具箱｜签证 · 汇率 · 天气 · 行程日历', '出发前准备希腊申根签证、欧元汇率、天气和每日行程的信息工具箱。'],
      '/heritage-guidance': ['古迹人文讲解预约｜希腊文化咨询', '预约雅典、德尔斐与克里特等古迹的人文知识讲解。'],
      '/vehicle-consultation': ['在地用车资源对接咨询｜希腊出行信息', '咨询希腊本地车型、司导资质与用车资源对接方式。'],
      '/knowledge-base': ['景点付费文史知识库｜免费预览', '浏览希腊景点的历史、神话与建筑知识预览。'],
      '/attractions': ['希腊景点导览｜城市 · 景点 · 参观指南', '按 Website 已发布内容浏览城市、景点、参观指南与关联行程。'],
      '/itineraries': ['参考行程｜雅典 · 圣托里尼 · 世界遗产环线', '浏览参考行程框架，正式行程按需求定制后通过专属链接发送。'],
      '/business-travel': ['希腊商旅随行咨询｜商务语言与行程规划', '提供商务陪同、语言翻译、企业拜访与人文行程的咨询。'],
      '/my': ['我的｜希腊旅行管家', '查看保存在当前浏览器的收藏和浏览记录；小程序账户资料不与 Website 共享。'],
      '/pages/itinerary/index': ['参考行程｜希腊旅行管家', '浏览可公开查看的参考行程框架。'],
      '/pages/customize/customize': ['希腊行程咨询｜提交需求沟通方案', '告诉我们出行时间、人数与偏好，先沟通需求范围与行程规划方式。'],
      '/pages/knowledge/knowledge': ['景点文史知识库｜免费预览', '从精选城市进入景点历史、神话与参观知识预览。'],
      '/pages/travel-guide/travel-guide': ['希腊旅行工具箱｜出行指南', '签证、汇率、天气与行程日历等出行前信息。'],
      '/pages/vehicle/vehicle': ['在地用车资源对接咨询｜希腊出行信息', '咨询希腊本地车型、司导资质与用车资源对接方式。'],
      '/pages/business/business': ['希腊商旅随行咨询｜商务语言与行程规划', '提供商务陪同、语言翻译、企业拜访与人文行程的咨询。'],
      '/manage-9f3k7': ['网站管理后台｜希腊旅行管家', '希腊旅行管家网站内容与 SEO 管理后台'],
    }
    const [pageTitle, description] = matchedRoute
      ? [`${matchedRoute.title}｜${matchedRoute.days || ''}希腊定制路线`, matchedRoute.desc || '希腊路线咨询']
      : matchedDestination
        ? [`${matchedDestination.name || matchedDestination.id}旅行指南`, matchedDestination.description || matchedDestination.desc || '查看已发布的目的地关联内容。']
        : matchedCity
          ? [`${matchedCity.name}景点导览｜${matchedCity.subtitle || matchedCity.country}`, `${matchedCity.name}：${matchedCity.description || ''}`]
          : matchedAttraction
            ? [matchedAttraction.shareTitle || `${matchedAttraction.name}参观指南｜${matchedAttraction.en}`, matchedAttraction.summary || '']
            : matchedItinerary
              ? [`${matchedItinerary.title}｜参考行程`, matchedItinerary.summary || '']
              : matchedGuide
                ? [`${matchedGuide.name}｜${matchedGuide.role || '希腊私人导游'}`, matchedGuide.intro || matchedGuide.storyNote || '希腊历史人文与私人路线顾问。']
                : matchedKnowledgeSpot
                  ? [`${matchedKnowledgeSpot.name}文史知识｜免费预览`, matchedKnowledgeSpot.summary || '查看该景点已发布的文史与参观内容。']
                  : matchedExperience
                    ? [`${matchedExperience.title}｜体验服务`, matchedExperience.desc || matchedExperience.summary || '按实际条件咨询服务。']
                    : (pages[path] || [config.defaultTitle, config.defaultDescription])
    const isPrivate = path.startsWith('/trip/')
    const isAdmin = path === '/manage-9f3k7'
    const title = pageTitle.includes('SY') ? pageTitle : `${pageTitle} | ${config.siteName}`
    const baseUrl = String(config.siteUrl || window.location.origin).replace(/\/$/, '')
    const canonical = `${baseUrl}${path === '/' ? '/' : path}`
    const selectedOgImage = matchedAttraction?.shareImage || matchedAttraction?.image || matchedGuide?.fullImage || matchedGuide?.avatar || matchedCity?.mosaic?.[0] || matchedItinerary?.cover || config.ogImage
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
      graph.push({ '@context': 'https://schema.org', '@type': 'ItemList', name: '希腊参考行程', itemListElement: visibleRecords(dynamicContent.sampleItineraries).map((trip, index) => ({ '@type': 'ListItem', position: index + 1, name: trip.title, description: trip.summary, url: `${baseUrl}/itineraries/${encodeURIComponent(trip.id)}` })) })
      graph.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: '希腊私人定制旅行多久可以出方案？', acceptedAnswer: { '@type': 'Answer', text: '提交出行时间、人数与预算后，定制师会在 24 小时内提供首版方案。' } }, { '@type': 'Question', name: '希腊旅行是否提供中文服务？', acceptedAnswer: { '@type': 'Answer', text: '雅典在地团队提供一对一中文定制师、中文司导和出行中的中文应急管家。' } }, { '@type': 'Question', name: '可以只定制圣托里尼或雅典吗？', acceptedAnswer: { '@type': 'Answer', text: '可以按目的地、天数、预算和旅行主题灵活定制单岛或多城行程。' } }] })
    }
    if (matchedDestination) graph.push({ '@context': 'https://schema.org', '@type': 'TouristDestination', name: matchedDestination.name || matchedDestination.id, description, containedInPlace: matchedDestination.country ? { '@type': 'Country', name: matchedDestination.country } : undefined })
    if (matchedRoute) graph.push({ '@context': 'https://schema.org', '@type': 'TouristTrip', name: matchedRoute.title, description: matchedRoute.desc || '', provider: { '@type': 'Organization', name: config.siteName, url: baseUrl } })
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

function routePath(route) {
  const sampleId = route.sampleItineraryId || (Array.isArray(route.sampleItineraryIds) ? route.sampleItineraryIds[0] : '')
  return sampleId ? `/itineraries/${encodeURIComponent(sampleId)}` : `/routes/${encodeURIComponent(route.id)}`
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
    <Link to={`/destinations/${encodeURIComponent(item.id)}`} className="destination-card">
      <img src={assetPath(item.image)} alt={`${item.name}风光`} loading="lazy" decoding="async" />
      <span><strong>{item.name}</strong><small>{item.en}</small></span>
    </Link>
  )
}

function GuideTeaser({ guide }) {
  if (!guide) return null
  const name = guide.name || guide.id
  const tags = (guide.directions || []).slice(0, 3).map((item) => typeof item === 'string' ? item : item.title || item.name).filter(Boolean)
  return <article className="guide-teaser">
    <div className="guide-teaser-avatar">{guide.avatar ? <img src={assetPath(guide.avatar)} alt={`${name}头像`} loading="lazy" decoding="async" /> : <UserRound size={40} aria-hidden="true" />}</div>
    <div className="guide-teaser-copy"><Eyebrow>{guide.nameEn || guide.role || 'GUIDE'}</Eyebrow><h2>{name}</h2>
      {guide.intro && <p>{guide.intro}</p>}
      <div className="guide-teaser-meta">{guide.role && <span>{guide.role}</span>}{guide.location && <span>{guide.location}</span>}</div>
      {tags.length > 0 && <div className="guide-teaser-credentials">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
      {guide.proof && <small className="guide-teaser-proof">{guide.proof}</small>}
    </div><Link className="button button-primary" to={`/guides/${guide.id}`}>查看档案 / 预约咨询 <ArrowRight size={15} /></Link>
  </article>
}

function destinationAssociationIds(item = {}) {
  if (Array.isArray(item.attractionIds)) return [...new Set(item.attractionIds.map((value) => String(value || '').trim()).filter(Boolean))]
  if (Object.prototype.hasOwnProperty.call(item, 'attractionId')) {
    const value = String(item.attractionId || '').trim()
    return value ? [value] : []
  }
  return []
}
function destinationCityId(item, cities, attractions) {
  const cityIds = new Set(cities.map((city) => city.id))
  if (item.cityId && cityIds.has(item.cityId)) return item.cityId
  if (cityIds.has(item.id)) return item.id
  return destinationAssociationIds(item).map((id) => attractions.find((attraction) => attraction.id === id)?.city).find(Boolean) || ''
}
function visibleDestinations(destinations, cities, attractions) {
  return destinations.filter((item) => {
    if (item.status === 'unpublished' || item.status === 'archived') return false
    const associationConfigured = Array.isArray(item.attractionIds) || Object.prototype.hasOwnProperty.call(item, 'attractionId')
    const associationIds = destinationAssociationIds(item)
    const validAssociations = associationIds.filter((id) => attractions.some((attraction) => attraction.id === id && attraction.status !== 'unpublished' && attraction.status !== 'archived'))
    if (associationConfigured && associationIds.length > 0 && validAssociations.length === 0) return false
    if (associationConfigured && associationIds.length === 0) return false
    const cityId = destinationCityId(item, cities, attractions)
    return Boolean(cityId && attractions.some((attraction) => attraction.city === cityId && attraction.status !== 'unpublished' && attraction.status !== 'archived'))
  })
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
  return []
}

function HomeDestinationTile({ item, cityId }) {
  const content = <><img src={assetPath(item.image)} alt={`${item.name}风光`} loading="lazy" decoding="async" /><span><strong>{item.name}</strong><small>{item.nameEn || item.en || 'GREECE'}</small></span><em>进入城市导览 <ArrowRight size={13} /></em></>
  return <Link to={`/attractions/city/${cityId}`} className="destination-card">{content}</Link>
}

function HomeHero({ countries = [], home = {}, onCountryChange }) {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]?.id || 'greece')
  const country = countries.find((item) => item.id === selectedCountry) || countries[0]
  const configuredSlides = Array.isArray(home.banners) ? home.banners.filter((item) => item?.enabled !== false && item?.image) : []
  const slides = (configuredSlides.length ? configuredSlides : (country?.heroImage ? [{ image: country.heroImage, alt: country.name || '' }] : [])).filter((slide, index, list) => slide.image && list.findIndex((item) => item.image === slide.image) === index)
  const homeEyebrow = home.eyebrow || 'GREECE TRAVEL BUTLER · TAILOR-MADE JOURNEYS'
  const homeTitle = home.title || '只为一生美好回忆'
  const homeDescription = home.description || '希腊在地人文与行程咨询服务。雅典在地团队，一对一中文顾问，提供文化、行程与语言陪同咨询。'
  const [active, setActive] = useState(0)
  useEffect(() => { if (countries.length && !countries.some((item) => item.id === selectedCountry)) { setSelectedCountry(countries[0].id); onCountryChange?.(countries[0].id) } }, [countries, selectedCountry, onCountryChange])
  useEffect(() => { if (slides.length <= 1) return undefined; const timer = window.setInterval(() => setActive((index) => (index + 1) % slides.length), 6500); return () => window.clearInterval(timer) }, [slides.length])
  useEffect(() => setActive((index) => Math.min(index, Math.max(0, slides.length - 1))), [slides.length])
  return <div className="home-hero" style={{ '--hero-image': slides[active]?.image ? `url("${assetPath(slides[active].image)}")` : 'none' }}>
    <Header />
    <div className="container hero-content">
      <div className="hero-brand-lockup"><strong>希腊旅行管家</strong><span>Greece Travel Butler</span></div>
      <Eyebrow dark>{homeEyebrow}</Eyebrow>
      <h1>{homeTitle}</h1>
      <p className="home-hero-description">{homeDescription}</p>
      <SearchBox />
      {countries.length > 0 && <div className="hero-country-switcher" role="tablist" aria-label="选择国家"><span>探索国家</span>{countries.map((item) => <button type="button" className={selectedCountry === item.id ? 'active' : ''} key={item.id} onClick={() => { setSelectedCountry(item.id); setActive(0); onCountryChange?.(item.id) }} role="tab" aria-selected={selectedCountry === item.id}>{item.nameEn || item.nameEn === '' ? `${item.name} / ${item.nameEn}` : item.name}</button>)}</div>}
      <div className="hero-actions"><Link className="button button-primary" to="/customize">提交行程咨询</Link><a className="button button-ghost" href="#routes">浏览甄选路线</a></div>
      <div className="trust-row"><span><Check size={14} />先沟通需求范围</span><span><Check size={14} />24 小时内回复</span><span><Check size={14} />中文 / English 咨询</span></div>
      {slides.length > 1 && <div className="hero-slide-dots" aria-label="品牌头图轮播">{slides.map((slide, index) => <button type="button" key={slide.image} className={active === index ? 'active' : ''} onClick={() => setActive(index)} aria-label={`查看第 ${index + 1} 张头图`} />)}</div>}
    </div>
  </div>
}

function SampleItineraryCard({ trip }) {
  return <article className="itinerary-home-card"><Link className="itinerary-home-image" to={`/itineraries/${trip.id}`}><img src={assetPath(trip.cover || trip.image)} alt={trip.title} loading="lazy" decoding="async" /><span>{trip.days} 天</span></Link><div><Eyebrow>{trip.tag || trip.crowd || 'SAMPLE ITINERARY'}</Eyebrow><h3><Link to={`/itineraries/${trip.id}`}>{trip.title}</Link></h3><p>{trip.summary}</p><Link className="text-link" to={`/itineraries/${trip.id}`}>查看参考行程 <ArrowRight size={14} /></Link></div></article>
}

function RouteAudioPreview({ itinerary }) {
  const audioRef = useRef(null)
  const source = itinerary?.previewAudioUrl || itinerary?.audioUrl || itinerary?.audioSrc || (typeof itinerary?.audio === 'string' ? itinerary.audio : '')
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
    <div className="route-audio-icon"><Headphones size={21} /></div><div className="route-audio-copy"><Eyebrow>LISTEN BEFORE YOU GO</Eyebrow><h3>甄选路线语音导览</h3><p>{itinerary ? `先听一段「${itinerary.title}」的路线导览，试听时长限制 1 分钟。` : '路线语音导览试听，时长限制 1 分钟。'}</p><div className="route-audio-controls"><button type="button" disabled={!source} onClick={toggle} aria-label={playing ? '暂停试听' : '播放试听'}>{playing ? <Pause size={15} /> : <Play size={15} />}</button><input type="range" min="0" max={maxDuration} step="0.1" value={Math.min(current, maxDuration)} disabled={!source} onChange={(event) => seek(event.target.value)} aria-label="试听进度" /><span>{timeLabel(current)} / {timeLabel(maxDuration)}</span><button type="button" disabled={!source} onClick={() => seek(0)} aria-label="从头播放"><RotateCcw size={14} /></button></div>{!source && <small>尚未配置公开试听音频。</small>}</div>
  </article>
}

function Home() {
  const [activeCategory, setActiveCategory] = useState('')
  const { content, status, error, setCountryId, reload } = useSiteContent()
  const visibleDestinationItems = useMemo(() => visibleDestinations(content.destinations, content.cities, content.attractions), [content.destinations, content.cities, content.attractions])
  const destinationCategories = useMemo(() => normalizeDestinationCategories(visibleDestinationItems, content.destinationCategories, content.destinationTypes), [visibleDestinationItems, content.destinationCategories, content.destinationTypes])
  useEffect(() => {
    if (!destinationCategories.some((item) => item.key === activeCategory)) setActiveCategory(destinationCategories[0]?.key || '')
  }, [destinationCategories, activeCategory])
  const featuredGuide = visibleRecords(content.guides).find((item) => item.enabled !== false && item.featured !== false) || null
  const featuredItinerary = visibleRecords(content.sampleItineraries)[0]
  const experiences = visibleRecords(content.experiences || content.settings?.experiences || [])
  const services = [
    [Compass, '行程定制', '围绕历史文明、海岛、餐厅与特别安排，沟通一份专属行程规划', '/customize'],
    [Landmark, '古迹讲解', '咨询在地导游的文史讲解服务与预约方式', '/heritage-guidance'],
    [BusFront, '在地用车', '咨询车型、司导资质、机场与城际移动等实际用车信息', '/vehicle-consultation'],
    [Map, '文史知识库', '精选城市、景点、参观指南与免费预览，内容随真实数据更新', '/knowledge-base'],
    [Users, '希腊商旅', '商务陪同、语言翻译、企业拜访与人文行程的综合咨询', '/business-travel'],
    [CloudSun, '出行指南', '签证、交通、网络、货币与行前实用攻略，一站式准备出发', '/tools'],
  ]
  return (
    <>
      <HomeHero countries={visibleRecords(content.countries)} home={content.home} onCountryChange={setCountryId} />
      {status === 'error' && <div className="container"><div className="content-state error" role="alert">{error} <button type="button" onClick={reload}>重新加载</button></div></div>}

      <section id="services" className="section services-section">
        <div className="container">
          <SectionTitle eyebrow="SIX WAYS TO TRAVEL" title="六大服务入口" action={{ to: '/customize', label: '了解全部服务' }} />
          <div className="service-grid">{services.map(([Icon, title, desc, href], index) => <Link to={href} className="service-card" key={title}><span className="service-index" aria-hidden="true">0{index + 1}</span><Icon /><h3>{title}</h3><p>{desc}</p><ArrowRight size={17} /></Link>)}</div>
        </div>
      </section>

      {featuredGuide && <section className="section home-guide-section">
        <div className="container"><SectionTitle eyebrow="SIGNATURE GUIDE" title={featuredGuide.name || featuredGuide.role || '导游资料'} action={{ to: `/guides/${featuredGuide.id}`, label: '查看完整档案' }} /><GuideTeaser guide={featuredGuide} /></div>
      </section>}

      {(featuredItinerary?.previewAudioUrl || featuredItinerary?.audioUrl) && <section className="section route-audio-section">
        <div className="container"><RouteAudioPreview itinerary={featuredItinerary} /></div>
      </section>}

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
          {destinationCategories.map((category) => <div key={category.key} className={`destination-group ${activeCategory === category.key ? 'mobile-active' : ''}`}><div className="destination-subhead"><h3>{category.name}</h3><span>{category.nameEn || category.nameTw || category.key}</span></div><div className="destination-grid">{visibleDestinationItems.filter((item) => item.type === category.key).map((item) => <HomeDestinationTile key={item.id || item.name} item={item} cityId={destinationCityId(item, content.cities, content.attractions)} />)}</div></div>)}
        </div>
      </section>}

      {experiences.length > 0 && <section id="experiences" className="section experiences-section">
        <div className="container">
          <SectionTitle dark eyebrow="SIGNATURE EXPERIENCES" title="奢享体验" action={{ to: `/experiences/${experiences[0].id}`, label: '了解奢享定制' }} />
          <div className="horizontal-card-track experience-home-track">{experiences.map((item) => <Link className="experience-card" to={`/experiences/${item.id}`} key={item.id}><div className="experience-image">{item.image && <img src={assetPath(item.image)} alt={item.title} loading="lazy" decoding="async" />}<span>{item.label || '体验服务'}</span></div><div><h3>{item.title}</h3><p>{item.desc || item.summary}</p><span className="text-link">查看服务内容 <ArrowRight size={14} /></span></div></Link>)}</div>
        </div>
      </section>}

      <GoldCTA /><Footer />
    </>
  )
}

function RouteDetail() {
  const { slug } = useParams()
  const { content, status, error } = useSiteContent()
  const route = visibleRecords(content.routes).find((item) => String(item.id) === String(slug))
  const destinationIds = Array.isArray(route?.destinationIds) ? route.destinationIds.map(String) : []
  const itineraryIds = Array.isArray(route?.sampleItineraryIds) ? route.sampleItineraryIds.map(String) : (route?.sampleItineraryId ? [String(route.sampleItineraryId)] : [])
  const relatedDestinations = visibleRecords(content.destinations).filter((item) => destinationIds.includes(String(item.id)))
  const relatedItineraries = visibleRecords(content.sampleItineraries).filter((item) => itineraryIds.includes(String(item.id)))
  useEffect(() => { if (status === 'ready' && route) recordRecentContent('route', route.id) }, [status, route?.id])
  if (status === 'loading') return <><Header solid /><main className="section"><div className="container content-state" role="status">正在读取路线内容…</div></main><Footer /></>
  if (status === 'error') return <><Header solid /><main className="section"><div className="container content-state error" role="alert">{error}。请稍后重试。</div></main><Footer /></>
  if (!route) return <><Header solid /><NotFound /><Footer /></>
  const inquiryUrl = `/customize?routeId=${encodeURIComponent(route.id)}`
  return <>
    <InnerHero image={route.image} eyebrow={route.kicker || route.tags || 'ROUTE'} title={route.title || route.id} subtitle={route.desc || ''} breadcrumb={`甄选路线 / ${route.title || route.id}`}>
      <div className="detail-hero-actions"><strong>咨询费用沟通</strong><Link className="button button-primary" to={inquiryUrl}>咨询这条线路</Link></div>
    </InnerHero>
    <main className="detail-page section"><div className="container"><ContentActions contentType="route" contentId={route.id} title={route.title || route.id} />
      {route.desc && <article className="intro-card"><h2>路线介绍</h2><p>{route.desc}</p></article>}
      {relatedItineraries.length > 0 && <section className="included-routes"><SectionTitle eyebrow="SAMPLE ITINERARIES" title="关联参考行程" /><div className="itinerary-card-grid">{relatedItineraries.map((trip) => <Link to={`/itineraries/${encodeURIComponent(trip.id)}`} className="itinerary-mini-card" key={trip.id}>{trip.cover && <img src={assetPath(trip.cover)} alt={trip.title} loading="lazy" decoding="async" />}<span className="itinerary-days-chip">{trip.days} 天</span><div><h3>{trip.title}</h3><p>{trip.summary}</p></div></Link>)}</div></section>}
      {relatedDestinations.length > 0 && <section className="included-routes"><SectionTitle eyebrow="DESTINATIONS" title="关联目的地"/><div className="destination-grid">{relatedDestinations.map((item) => <DestinationCard key={item.id} item={item}/>)}</div></section>}
      {!relatedItineraries.length && !relatedDestinations.length && <div className="itinerary-notice"><Info size={16}/><span>此路线尚未在后台配置关联的参考行程或目的地；关联后会按稳定 ID 展示。</span></div>}
      <div className="summary-card"><h2>路线速览</h2><dl><div><dt>天数</dt><dd>{route.days || '待配置'}</dd></div><div><dt>主题</dt><dd>{route.tags || '待配置'}</dd></div></dl><Link className="button button-primary" to={inquiryUrl}>咨询这条路线</Link></div>
    </div></main><Footer />
  </>
}

async function postLead(payload) {
  const next = { ...payload, source: payload.source || 'website', platform: payload.platform || 'website', createdAt: payload.createdAt || new Date().toISOString(), status: 'new' }
  const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  if (!response.ok) throw new Error(`lead api failed (${response.status})`)
  return true
}

function ServiceInquiryForm({ leadType, title = '提交咨询需求', intro = '留下基本信息，我们会先沟通需求范围与服务方式。', fields = [], submitLabel = '提交咨询' }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError(''); setSent(false)
    const form = event.currentTarget
    try {
      await postLead({ ...Object.fromEntries(new FormData(form)), leadType })
      form.reset(); setSent(true); window.setTimeout(() => setSent(false), 5000)
    } catch { setError('提交失败，服务器尚未收到这条咨询。请稍后重试或使用页面上的联系信息。') }
    finally { setSaving(false) }
  }
  return <form className="service-inquiry-form" onSubmit={submit}><h2>{title}</h2><p className="form-intro">{intro}</p><div className="field-grid">{fields.map((field) => <label key={field.name}>{field.label}{field.options ? <select name={field.name} defaultValue="" required={field.required}><option value="" disabled>{field.placeholder || '请选择'}</option>{field.options.map((option) => <option key={option}>{option}</option>)}</select> : <input name={field.name} type={field.type || 'text'} placeholder={field.placeholder} required={field.required} />}</label>)}</div><label className="service-form-wide">补充说明<textarea name="requirements" rows="4" placeholder="请写下希望了解的内容、时间和特殊要求" /></label><button className="button button-gold button-block submit-button" type="submit" disabled={saving}>{saving ? '正在提交…' : submitLabel}</button>{error && <p className="form-error" role="alert">{error}</p>}{sent && <p className="success-inline" role="status"><Check size={15} />咨询已由服务器接收，后续将联系沟通。</p>}</form>
}

function ConsultationDock() {
  const { pathname } = useLocation()
  const { content } = useSiteContent()
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')
  if (pathname.startsWith('/manage-9f3k7')) return null
  const guideId = pathname.startsWith('/guides/') ? decodeURIComponent(pathname.slice('/guides/'.length).split('/')[0]) : ''
  const guide = visibleRecords(content.guides).find((item) => String(item.id) === guideId)
  const context = guide ? `预约${guide.name || guide.id}` : pathname.startsWith('/heritage-guidance') ? '咨询古迹讲解' : pathname.startsWith('/attractions') ? '咨询景点导览' : pathname.startsWith('/business-travel') ? '咨询商旅方案' : pathname.startsWith('/experiences/') ? '咨询奢享体验' : pathname.startsWith('/knowledge-base') ? '咨询知识库' : '在线咨询'
  async function submit(event) {
    event.preventDefault(); const form = event.currentTarget; setSubmitError('')
    try {
      await postLead({ ...Object.fromEntries(new FormData(form)), leadType: form.leadType.value || 'customization' })
      form.reset(); setSent(true); window.setTimeout(() => { setSent(false); setOpen(false) }, 3500)
    } catch { setSubmitError('提交失败，服务器尚未收到咨询。请稍后重试。') }
  }
  return <div className="consultation-dock">{open && <div id="consultation-form" className="consultation-popover"><button className="consultation-close" onClick={() => setOpen(false)} aria-label="关闭"><X size={17} /></button>{sent ? <div className="consultation-sent"><Check size={22} /><strong>咨询已收到</strong><span>我们会尽快与你沟通需求范围。</span></div> : <form onSubmit={submit}><Eyebrow>ONLINE CONSULTATION</Eyebrow><h3>先说说你想了解什么</h3><p className="consultation-context">当前页面：{context}</p><label>咨询类型<select name="leadType" defaultValue="customization"><option value="customization">行程定制咨询</option><option value="guide-booking">古迹人文讲解预约</option><option value="vehicle-consultation">在地用车资源对接咨询</option><option value="knowledge-base">景点文史知识库</option><option value="business-travel">商旅随行咨询</option></select></label><label>联系方式<input name="contact" required placeholder="微信 / 手机号 / 邮箱" /></label><label>一句话需求<textarea name="requirements" rows="3" placeholder="例如：想了解雅典古迹讲解或商务陪同"></textarea></label><button className="button button-primary button-block" type="submit">提交咨询</button>{submitError && <p className="form-error" role="alert">{submitError}</p>}</form>}</div>}<button className="consultation-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="consultation-form"><MessageCircle size={18} />{context}</button></div>
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

function KnowledgeBaseIndex() {
  const { content, status, error } = useSiteContent()
  const cities = visibleRecords(content.cities)
  const attractions = visibleRecords(content.attractions)
  return <><InnerHero image={visibleRecords(content.countries)[0]?.heroImage} eyebrow="KNOWLEDGE BASE" title="景点文史知识库" subtitle="按 Website 已发布的城市与景点内容浏览参观资料和免费预览。" breadcrumb="景点文史知识库"><div className="hero-actions"><Link className="button button-primary" to="/attractions">进入城市导览</Link><Link className="button button-ghost" to="/itineraries">查看参考行程</Link></div></InnerHero><main className="knowledge-index section"><div className="container">
    {status === 'loading' && <div className="content-state" role="status">正在读取 Website 内容…</div>}{status === 'error' && <div className="content-state error" role="alert">{error}</div>}
    <SectionTitle eyebrow="SELECT A CITY" title="已发布城市" action={{ to: '/attractions', label: '查看全部城市导览' }} /><div className="knowledge-city-grid">{cities.map((city) => <Link className="knowledge-city-card" to={`/attractions/city/${city.id}`} key={city.id}><div>{(city.mosaic || []).slice(0, 3).map((image, index) => <img key={index} src={assetPath(image)} alt="" loading="lazy" decoding="async" />)}</div><strong>{city.name}</strong><span>{city.subtitle || city.country}</span><small>{city.museumCount ?? ''}{city.audioMinutes ? ` · ${city.audioMinutes} 分钟音频` : ''}</small></Link>)}</div>
    {attractions.length > 0 && <section className="knowledge-featured-attractions"><SectionTitle eyebrow="PUBLISHED ATTRACTIONS" title="景点免费预览" /><div className="knowledge-grid">{attractions.slice(0, 4).map((item) => <Link className="knowledge-card" to={`/knowledge-base/${item.id}`} key={item.id}>{item.image && <img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" />}<div><Eyebrow>{item.en || item.cityName || item.city}</Eyebrow><h3>{item.name}</h3><p>{item.deepDive?.preview || item.summary}</p><span className="text-link">查看内容 <ArrowRight size={14} /></span></div></Link>)}</div></section>}
    {status === 'ready' && !cities.length && !attractions.length && <div className="empty-state"><Compass/><h2>暂未发布城市或景点内容</h2><p>内容发布后会在这里显示。</p></div>}
    <div className="knowledge-notice"><LockKeyhole size={18} /><span>Web 只展示后台公开字段和公开媒体地址；城市购买、会员和微信支付尚未形成可验证的 Web 权益链路，不能在此解锁付费内容。</span></div>
  </div></main><ComplianceNotice /><Footer /></>
}

function KnowledgeBase() {
  const { slug } = useParams()
  const { content, status, error } = useSiteContent()
  const spot = visibleRecords(content.attractions).find((item) => item.id === slug)
  useEffect(() => { if (slug && status === 'ready' && spot) recordRecentContent('attraction', spot.id) }, [slug, status, spot?.id])
  if (!slug) return <KnowledgeBaseIndex />
  if (status === 'loading') return <main className="section"><div className="container content-state" role="status">正在读取景点内容…</div></main>
  if (status === 'error') return <main className="section"><div className="container content-state error" role="alert">{error}</div></main>
  if (!spot) return <ContentNotFound title="没有找到此景点内容" description="该 attractionId 尚未发布或已下架。" backTo="/knowledge-base" backLabel="返回知识库" />
  const preview = spot.deepDive?.preview || spot.summary || ''
  const previewAudio = spot.deepDive?.previewAudioUrl || spot.deepDive?.audioUrl || ''
  const locked = Array.isArray(spot.deepDive?.locked) ? spot.deepDive.locked : []
  return <><InnerHero image={spot.image} eyebrow={`KNOWLEDGE BASE · ${spot.en || spot.city}`} title={spot.name} subtitle={spot.summary || ''} breadcrumb={`景点文史知识库 / ${spot.name}`} />
    <main className="knowledge-detail section"><div className="container"><ContentActions contentType="attraction" contentId={spot.id} title={spot.name}/><div className="knowledge-detail-grid"><article className="knowledge-preview"><Eyebrow>PUBLIC PREVIEW</Eyebrow><h2>{spot.name}</h2>{preview && <p>{preview}</p>}{previewAudio ? <audio className="exhibit-audio" controls preload="none" src={assetPath(previewAudio)}>当前浏览器不支持音频播放。</audio> : <p className="knowledge-disclaimer">该景点尚未配置公开试听音频。</p>}<Link className="text-link" to={`/attractions/${spot.id}`}>查看完整参观指南 <ArrowRight size={14}/></Link></article>
      <aside className="knowledge-unlock"><Eyebrow>WEB LIMITATION</Eyebrow><h3>付费权益未在 Website 开通</h3>{locked.map((item, index) => <div key={typeof item === 'string' ? item : item.id || index}><Check size={15}/>{typeof item === 'string' ? item : item.title || item.text}</div>)}<p>小程序城市购买仍处于接入说明状态，且其支付曾返回商户权限错误。Web 不模拟支付或解锁状态。</p><Link className="button button-deep button-block" to={`/customize?attractionId=${encodeURIComponent(spot.id)}`}>咨询该景点内容</Link><Link className="text-link" to="/knowledge-base">返回知识库目录 <ChevronRight size={15} /></Link></aside></div></div></main><ComplianceNotice/><Footer/>
  </>
}

function Customize() {
  const [language] = useLanguage()
  const [params] = useSearchParams()
  const linkedIds = Object.fromEntries(['routeId', 'destinationId', 'cityId', 'attractionId', 'experienceId'].map((key) => [key, params.get(key) || '']).filter(([, value]) => value))
  const [themes, setThemes] = useState(['历史文明'])
  const [sent, setSent] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const themeOptions = ['历史文明', '海滩海岛', '餐厅偏好', '特别安排', '体育活动', '高端私旅', '商务', '司导', '翻译']
  function toggleTheme(theme) { setThemes((current) => current.includes(theme) ? current.filter((t) => t !== theme) : [...current, theme]) }
  async function submit(e) {
    e.preventDefault(); setSaving(true)
    const form = e.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), ...linkedIds, themes, leadType: 'customization', createdAt: new Date().toISOString(), status: 'new' }
    setSubmitError(''); setSent(false)
    try {
      await postLead(payload)
      form.reset(); setThemes(['历史文明']); setSent(true); setTimeout(() => setSent(false), 5000)
    } catch { setSubmitError('提交失败，服务器尚未收到这条需求。请稍后重试或直接联系顾问。') }
    finally { setSaving(false) }
  }
  return (
    <>
      <section className="custom-top"><Header solid /><div className="container custom-intro"><Eyebrow dark>ITINERARY CONSULTATION</Eyebrow><h1>把需求说清楚，再一起规划希腊</h1><p>行程资讯与方案咨询 · 提交后沟通服务范围与咨询费用 · 中文 / English</p></div></section>
      <main className="section form-section">
        <div className="container form-layout">
          <form className="custom-form" onSubmit={submit}>
            <h2>行程定制咨询问卷</h2>
            {Object.entries(linkedIds).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
            <div className="field-grid"><label>意向目的地<input name="destination" required placeholder="如：雅典 + 圣托里尼" /></label><label>出行日期<input name="travelDate" type="date" required /></label><label>预计天数<input name="duration" required placeholder="如：7 天" /></label><label>出行人数<input name="travelers" required placeholder="如：2 大 1 小" /></label><label>儿童年龄<input name="childAges" placeholder="如：4 岁、8 岁；无儿童可留空" /></label><label>单日车程上限<input name="maxDriveHours" type="number" min="0" max="12" placeholder="如：3 小时" /></label><label>预算范围<select name="budget" defaultValue=""><option value="">请选择预算范围</option><option>先沟通需求</option><option>1–2 万元 / 人</option><option>2–4 万元 / 人</option><option>4 万元以上 / 人</option></select></label></div>
            <fieldset><legend>关注方向（可多选）</legend><div className="theme-chips">{themeOptions.map((theme) => <button type="button" key={theme} className={themes.includes(theme) ? 'active' : ''} onClick={() => toggleTheme(theme)}>{themes.includes(theme) && <Check size={14} />}{theme}</button>)}</div></fieldset>
            <label>特别需求<textarea name="requirements" rows="5" placeholder="请补充历史兴趣、餐厅偏好、特别安排、体育活动或语言陪同需求" /></label>
            <label>联系电话 / 微信<input name="contact" required placeholder="用于顾问联系你沟通" /></label>
            <button className="button button-gold button-block submit-button" type="submit" disabled={saving}>{saving ? '正在提交…' : '提交行程咨询'}</button>
            <p className="privacy">提交即表示同意我们通过电话 / 微信联系你，信息仅用于咨询沟通与方案规划。</p>
            {submitError && <p className="form-error" role="alert">{submitError}</p>}
            {sent && <div className="success-message"><Check />服务器已接收需求，顾问会按页面公布的回复时限联系你。</div>}
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
  const { content, status, error } = useSiteContent()
  const destinationsById = visibleRecords(content.destinations)
  const cities = visibleRecords(content.cities)
  const attractions = visibleRecords(content.attractions)
  const item = destinationsById.find((entry) => entry.id === slug)
  const city = item?.cityId ? cities.find((entry) => entry.id === item.cityId) : null
  const associationIds = Array.isArray(item?.attractionIds) ? item.attractionIds.map(String) : item?.attractionId ? [String(item.attractionId)] : []
  const attractionIds = new Set(associationIds)
  const relatedAttractions = attractions.filter((entry) => attractionIds.has(String(entry.id)))
  const relatedRoutes = visibleRecords(content.routes).filter((route) => (route.destinationIds || []).map(String).includes(String(item?.id)))
  const relatedItineraries = visibleRecords(content.sampleItineraries).filter((trip) => (trip.itinerary || []).some((day) => (day.attractionIds || []).some((id) => attractionIds.has(String(id)))))
  useEffect(() => { if (status === 'ready' && item) recordRecentContent('destination', item.id) }, [status, item?.id])
  if (status === 'loading') return <main className="section"><div className="container content-state" role="status">正在读取目的地内容…</div></main>
  if (status === 'error') return <main className="section"><div className="container content-state error" role="alert">{error}。请稍后重试。</div></main>
  if (!item) return <NotFound />
  const heading = item.name || item.title || item.id
  const summary = city?.description || city?.summary || item.description || item.desc || ''
  return <>
    <InnerHero image={item.image || city?.mosaic?.[0]} eyebrow={item.nameEn || item.type || 'DESTINATION'} title={heading} subtitle={summary} breadcrumb={`精选目的地 / ${heading}`} />
    <main className="destination-detail section"><div className="container"><ContentActions contentType="destination" contentId={item.id} title={heading} />
      <article className="destination-intro"><div><Eyebrow>{city?.nameEn || item.nameEn || 'DESTINATION GUIDE'}</Eyebrow><h2>{city?.subtitle || heading}</h2>{summary && <p>{summary}</p>}{city?.country && <p>{city.country}</p>}</div>
        {(city?.mosaic || []).length > 0 && <div className="destination-mosaic">{city.mosaic.map((image, index) => <img key={`${image}-${index}`} src={assetPath(image)} alt="" loading="lazy" decoding="async" />)}</div>}
      </article>
      {relatedAttractions.length > 0 && <section className="included-routes"><SectionTitle eyebrow="ATTRACTIONS" title={`${heading} · 景点导览`} /><div className="search-attraction-grid">{relatedAttractions.map((attraction) => <SearchAttractionCard key={attraction.id} item={attraction} />)}</div></section>}
      {relatedItineraries.length > 0 && <section className="included-routes"><SectionTitle eyebrow="SAMPLE ITINERARIES" title="关联参考行程" /><div className="itinerary-card-grid">{relatedItineraries.map((trip) => <Link to={`/itineraries/${trip.id}`} className="itinerary-mini-card" key={trip.id}><img src={assetPath(trip.cover)} alt={trip.title} loading="lazy" decoding="async"/><div><h3>{trip.title}</h3><p>{trip.summary}</p></div></Link>)}</div></section>}
      {relatedRoutes.length > 0 && <section className="included-routes"><SectionTitle eyebrow="CURATED ROUTES" title="关联路线" action={{ to: `/customize?destinationId=${encodeURIComponent(item.id)}`, label: '咨询此目的地' }} /><div className="route-grid">{relatedRoutes.map((route) => <RouteCard key={route.id} route={route} />)}</div></section>}
      {!relatedAttractions.length && !relatedItineraries.length && !relatedRoutes.length && <div className="itinerary-notice"><Info size={16}/><span>此目的地目前没有配置关联景点、参考行程或路线。可提交咨询，后台配置后会在此展示。</span></div>}
    </div></main><GoldCTA /><Footer />
  </>
}

function LuxuryExperienceDetail({ slugOverride = '' }) {
  const { slug: routeSlug } = useParams()
  const slug = slugOverride || routeSlug || ''
  const { content, status, error } = useSiteContent()
  const experiences = visibleRecords(content.experiences || content.settings?.experiences || [])
  const item = experiences.find((entry) => entry.id === slug)
  const phone = String(content.settings?.consultPhone || content.settings?.phone || '').trim()
  const tel = phone.replace(/[^\d+]/g, '')
  useEffect(() => { if (status === 'ready' && item) recordRecentContent('experience', item.id) }, [status, item?.id])
  if (status === 'loading') return <main className="section"><div className="container content-state" role="status">正在读取体验内容…</div></main>
  if (status === 'error') return <main className="section"><div className="container content-state error" role="alert">{error}</div></main>
  if (!item) return <NotFound />
  const points = Array.isArray(item.points) ? item.points : []
  return <>
    <InnerHero image={item.image} eyebrow={item.nameEn || item.label || 'EXPERIENCE'} title={item.title} subtitle={item.desc || item.summary} breadcrumb={`体验服务 / ${item.title}`}>
      <div className="detail-hero-actions"><strong>按实际条件咨询</strong><Link className="button button-primary" to={`/customize?experienceId=${encodeURIComponent(item.id)}`}>咨询此项服务 <ArrowRight size={15} /></Link></div>
    </InnerHero>
    <main className="detail-page section luxury-detail-page"><div className="container"><ContentActions contentType="experience" contentId={item.id} title={item.title} /></div><div className="container detail-layout"><div>
      {(item.desc || item.summary) && <article className="intro-card"><Eyebrow>{item.nameEn || item.label || 'EXPERIENCE'}</Eyebrow><h2>{item.subtitle || item.title}</h2><p>{item.desc || item.summary}</p></article>}
      {points.length > 0 && <section className="luxury-detail-section"><SectionTitle eyebrow="SERVICE DETAILS" title="服务内容" /><div className="service-points">{points.map((point, index) => <div key={typeof point === 'string' ? point : point.id || index}><Check size={16} /><span>{typeof point === 'string' ? point : point.text || point.title}</span></div>)}</div></section>}
      {item.notice && <section className="luxury-detail-section"><SectionTitle eyebrow="BEFORE CONFIRMATION" title="说明" /><div className="luxury-preparation"><p>{item.notice}</p></div></section>}
      <div className="itinerary-notice"><Info size={16}/><span>页面仅用于咨询；资源、可行性和费用需经服务方确认，本页面不收款。</span></div>
    </div><aside className="trip-aside"><div className="summary-card"><h2>咨询服务</h2><p>提交日期、人数及需求，由顾问确认资源与服务范围。</p>{tel && <a className="button button-primary button-block" href={`tel:${tel}`}><Phone size={15} />拨打咨询电话</a>}<Link className="button button-gold button-block" to={`/customize?experienceId=${encodeURIComponent(item.id)}`}>填写详细需求</Link>{phone && <small className="luxury-phone-note">咨询电话：{phone}</small>}</div></aside></div></main><GoldCTA /><Footer />
  </>
}

function searchText(item) {
  return Object.values(item).flat(Infinity).filter((value) => typeof value === 'string' || typeof value === 'number').join(' ').toLocaleLowerCase()
}

function SearchAttractionCard({ item }) {
  return <Link className="search-attraction-card" to={`/attractions/${item.id}`}><img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" /><div><Eyebrow>{item.en || item.cityName || 'ATTRACTION'}</Eyebrow><h3>{item.name}</h3><p>{item.summary}</p><span className="text-link">查看景点详情 <ArrowRight size={14} /></span></div></Link>
}

function SearchExperienceCard({ item }) {
  return <article className="experience-card"><div className="experience-image">{item.image && <img src={assetPath(item.image)} alt={item.title} loading="lazy" decoding="async" />}<span>{item.label || '体验服务'}</span></div><div><h3>{item.title}</h3><p>{item.desc || item.summary}</p><Link to={`/experiences/${item.id}`}>查看服务详情 <ArrowRight size={14} /></Link></div></article>
}

function SearchPage() {
  const [params] = useSearchParams()
  const keyword = (params.get('q') || '').trim()
  const [filter, setFilter] = useState('all')
  const { content, status, error } = useSiteContent()
  const experiences = visibleRecords(content.experiences || content.settings?.experiences || [])
  const results = useMemo(() => {
    const records = [
      ...visibleRecords(content.routes).map((item) => ({ type: 'route', item })),
      ...visibleRecords(content.destinations).map((item) => ({ type: 'destination', item })),
      ...visibleRecords(content.attractions).map((item) => ({ type: 'attraction', item })),
      ...experiences.map((item) => ({ type: 'experience', item })),
    ]
    if (!keyword) return records
    const normalized = keyword.toLocaleLowerCase()
    return records.filter(({ item }) => searchText(item).includes(normalized))
  }, [content, experiences, keyword])
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
        <div className="container">{status === 'loading' && <div className="content-state" role="status">正在搜索 Website 内容…</div>}{status === 'error' && <div className="content-state error" role="alert">{error}</div>}<p className="result-summary">{keyword ? `“${keyword}” 的相关结果` : '全部可探索内容'} · 共 {results.length} 条</p><div className="filter-chips">{filters.map(([id, label]) => <button key={id} className={filter === id ? 'active' : ''} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}</div>
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
  const { content, status, error } = useSiteContent()
  const [cny, setCny] = useState('')
  const [startDate, setStartDate] = useState('')
  const [selectedTripId, setSelectedTripId] = useState('')
  const tools = content.settings?.travelTools || {}
  const trips = visibleRecords(content.sampleItineraries)
  const rate = Number(tools.eurCny || 0)
  const eur = rate > 0 ? (Number(cny || 0) / rate).toFixed(2) : ''
  const weatherCities = Array.isArray(tools.weatherCities) ? tools.weatherCities : []
  const visa = tools.visa && typeof tools.visa === 'object' ? tools.visa : {}
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId)
  useEffect(() => { if (trips.length && !trips.some((trip) => trip.id === selectedTripId)) setSelectedTripId(trips[0].id) }, [trips, selectedTripId])
  function exportCalendar() {
    if (!selectedTrip || !startDate) return
    const base = new Date(`${startDate}T12:00:00`)
    const escape = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
    const events = (selectedTrip.itinerary || []).map((day, index) => {
      const start = new Date(base); start.setDate(start.getDate() + Math.max(0, Number(day.day || index + 1) - 1))
      const end = new Date(start); end.setDate(end.getDate() + 1)
      const dateCode = (date) => `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`
      const summary = `D${day.day || index + 1} ${day.title || selectedTrip.title}`
      const description = [day.city, day.desc].filter(Boolean).join(' · ')
      return ['BEGIN:VEVENT', `UID:${selectedTrip.id}-${index + 1}@sy-greece`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART;VALUE=DATE:${dateCode(start)}`, `DTEND;VALUE=DATE:${dateCode(end)}`, `SUMMARY:${escape(summary)}`, `DESCRIPTION:${escape(description)}`, `URL:${window.location.origin}/itineraries/${encodeURIComponent(selectedTrip.id)}`, 'END:VEVENT'].join('\r\n')
    })
    const calendar = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SY Greece Website//Trip Calendar//ZH', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n')
    const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = `${selectedTrip.id}.ics`; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <>
    <section className="tools-top"><Header solid /><div className="container tools-intro"><Eyebrow dark>TRAVEL ESSENTIALS</Eyebrow><h1>希腊旅行工具箱</h1><p>公开参考资料由 Website 后台维护；汇率和天气不会被标记为实时数据。</p></div></section>
    <main className="tools-section section"><div className="container tool-grid">
      {status === 'error' && <div className="content-state error" role="alert">{error}</div>}
      <article className="tool-card"><div className="tool-icon"><Landmark /></div><div><Eyebrow>SCHENGEN VISA</Eyebrow><h2>{visa.title || '签证参考'}</h2>{visa.summary && <p>{visa.summary}</p>}{Array.isArray(visa.checklist) && visa.checklist.length > 0 ? <ul>{visa.checklist.map((item, index) => <li key={index}>{typeof item === 'string' ? item : item.text || item.title}</li>)}</ul> : <p>Website 后台尚未配置签证材料清单；出行前请以官方签证机构信息为准。</p>}{visa.url && <a href={visa.url} target="_blank" rel="noreferrer">查看参考来源 <ArrowRight size={14} /></a>}</div></article>
      <article className="tool-card"><div className="tool-icon"><Euro /></div><div><Eyebrow>EXCHANGE RATE</Eyebrow><h2>汇率换算</h2>{rate > 0 ? <><div className="rate-banner">1 EUR <span>≈</span> {rate} CNY</div><label className="converter"><span>人民币 CNY</span><input name="cny" type="number" min="0" value={cny} onChange={(e) => setCny(e.target.value)} /><strong>≈ {eur} EUR</strong></label><p>后台参考数据{tools.rateUpdatedAt ? ` · ${tools.rateUpdatedAt}` : ''}{tools.rateSource ? ` · ${tools.rateSource}` : ''}，不代表实时成交汇率。</p></> : <p>后台尚未配置参考汇率，暂不显示换算结果。</p>}</div></article>
      <article className="tool-card"><div className="tool-icon"><CloudSun /></div><div><Eyebrow>WEATHER REFERENCE</Eyebrow><h2>希腊天气参考</h2>{weatherCities.length ? <div className="weather-list">{weatherCities.map((item, index) => <div key={item.id || item.name || index}><span>{item.name}</span><strong>{item.temperature || item.temp || '—'}</strong><small>{item.condition || ''}</small></div>)}</div> : <p>后台尚未配置天气参考资料；此页面不调用实时天气服务。</p>}{tools.weatherUpdatedAt && <small>参考更新时间：{tools.weatherUpdatedAt}</small>}</div></article>
      <article className="tool-card"><div className="tool-icon"><CalendarDays /></div><div><Eyebrow>TRIP CALENDAR</Eyebrow><h2>参考行程日历</h2><p>选择一条已发布参考行程和开始日期，可下载按日拆分的 iCalendar（.ics）文件。本工具不会读取私人订单或锁定服务。</p>{trips.length ? <><label className="calendar-export-field">参考行程<select value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.title}</option>)}</select></label><label className="calendar-export-field">开始日期<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><button className="button button-primary" type="button" disabled={!startDate || !selectedTrip || !selectedTrip.itinerary?.length} onClick={exportCalendar}>下载日历文件</button></> : <p>{status === 'loading' ? '正在读取参考行程…' : '暂无已发布参考行程。'}</p>}</div></article>
    </div></main><GoldCTA /><Footer />
  </>
}

function GuidePage({ guideIdOverride = '' }) {
  const { id: routeGuideId } = useParams()
  const guideId = guideIdOverride || routeGuideId || 'richard-li'
  const [language] = useLanguage()
  const labels = translate('guide', language)
  const { content, status, error } = useSiteContent()
  const guide = visibleRecords(content.guides).find((item) => item.id === guideId && item.enabled !== false)
  const directions = Array.isArray(guide?.directions) ? guide.directions : []
  const guideCredentials = Array.isArray(guide?.credentials) ? guide.credentials : []
  const guideReviews = Array.isArray(guide?.reviews) ? guide.reviews : []
  useEffect(() => { if (status === 'ready' && guide) recordRecentContent('guide', guide.id) }, [status, guide?.id])
  const copy = {
    ...labels,
    eyebrow: guide?.eyebrow || guide?.nameEn || '',
    title: `${guide?.name || guide?.id || ''}|${guide?.role || ''}`,
    role: guide?.role || '',
    note: guide?.storyNote || guide?.intro || '',
    profileTitle: guide?.name || guide?.id || '',
    profileEyebrow: guide?.nameEn || '',
    profileEducation: guide?.proof || '',
    profileBio: guide?.intro || '',
    profileTags: directions.slice(0, 3).map((item) => typeof item === 'string' ? item : item.title || item.name).filter(Boolean),
    storyTitle: guide?.storyTitle || guide?.name || '',
    storyParagraphs: [guide?.story1, guide?.story2].filter(Boolean),
    quote: guide?.quote || '',
    credentialsTitle: guide?.credentialsTitle || labels.credentialsTitle,
    guestbookTitle: guide?.reviewsTitle || labels.guestbookTitle,
    signature: directions.map((item) => typeof item === 'string' ? [item, '', '', ''] : [item.title || item.name || '', item.desc || '', item.duration || '', item.suitable || '']),
    credentials: guideCredentials.map((item) => [item.title || '', item.desc || '', '']),
    quotes: guideReviews.map((item) => [item.quote || item.text || item.content || '', item.name || item.author || '']).filter(([quote, author]) => quote && author),
    reserveLead: '选择一个意向日期并提交需求；此页面不读取实时档期，也不会自动锁定服务。',
    calendarTitle: '选择预约意向日期',
    formTitle: `提交${guide?.name || '导游'}预约意向`,
    formLead: `成功提交后由顾问人工确认实际档期与服务范围，预计 ${Number(content.settings?.replyHours) || 24} 小时内回复。`,
  }
  const bookingLabel = `${guide?.name || '导游'} 的预约咨询`
  const [selectedDate, setSelectedDate] = useState('')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingSucceeded, setBookingSucceeded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const minimumBookingDate = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }, [])
  const signature = directions.map((item, index) => [typeof item === 'string' ? '' : item.image || '', ...copy.signature[index]])
  const credentials = copy.credentials.map(([title, line1, line2], index) => [`0${index + 1}`, title, `${line1}\n${line2}`])
  const quotes = copy.quotes
  const services = copy.signature
  async function submitBooking(event) {
    event.preventDefault()
    if (!selectedDate) { setBookingMessage(copy.chooseDate); return }
    setSubmitting(true); setBookingMessage(''); setBookingSucceeded(false)
    const form = event.currentTarget
    const payload = { ...Object.fromEntries(new FormData(form)), guideId: guide.id, guideName: guide.name || guide.id, guideSlug: guide.id, bookingDate: selectedDate, leadType: 'guide-booking', destination: `${guide.name || guide.id} 导游预约`, createdAt: new Date().toISOString(), status: 'new' }
    try {
      const response = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!response.ok) throw new Error('booking api failed')
      setBookingMessage('预约申请已提交，档期需由顾问确认后生效。'); setBookingSucceeded(true)
    } catch {
      setBookingMessage('提交失败，预约尚未发送。请稍后重试或直接联系我们。'); setBookingSucceeded(false)
    } finally {
      setSubmitting(false)
    }
  }
  if (status === 'loading') return <main className="section"><div className="container content-state" role="status">正在读取导游资料…</div></main>
  if (status === 'error') return <main className="section"><div className="container content-state error" role="alert">{error}。请稍后重试。</div></main>
  if (!guide) return <ContentNotFound title="没有找到这位导游" description="该导游资料尚未发布或链接中的 guideId 无效。" backTo="/" backLabel="返回首页" />
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
            <div className="guide-avatar">{(guide.fullImage || guide.avatar) ? <img src={assetPath(guide.fullImage || guide.avatar)} alt={`${guide.name || guide.id}头像`} loading="lazy" decoding="async" /> : <UserRound size={48} aria-hidden="true" />}</div>
            <h2>{copy.profileTitle}</h2><Eyebrow>{copy.profileEyebrow}</Eyebrow>
            <div className="profile-rule" />
            <p><strong>{copy.profileEducation}</strong><br />{copy.profileBio}</p>
            <div className="profile-tags">{copy.profileTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </div>
        </div>
      </section>
      <div className="container guide-content-actions"><ContentActions contentType="guide" contentId={guide.id} title={guide.name || guide.id} /></div>

      <main>
        {(copy.storyParagraphs.length > 0 || copy.quote) && <section className="guide-section guide-story-section">
          <div className="container guide-story-grid">
            <div className="guide-story-copy"><Eyebrow>{copy.storyEyebrow}</Eyebrow><h2>{copy.storyTitle.split('|').map((line) => <React.Fragment key={line}>{line}<br /></React.Fragment>)}</h2>{copy.storyParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            <blockquote className="guide-quote"><span>“</span><p>{copy.quote}</p><small>— {guide.name || guide.id} / {guide.role || 'GUIDE'}</small></blockquote>
          </div>
        </section>}

        {credentials.length > 0 && <section className="guide-section credentials-section">
          <div className="container"><Eyebrow>{copy.credentialsEyebrow}</Eyebrow><h2>{copy.credentialsTitle}</h2><div className="credentials-grid">{credentials.map(([number, title, text]) => <article key={number} className="credential-card"><small>{number}</small><h3>{title}</h3><p>{text.split('\n').filter(Boolean).map((line) => <span key={line}>{line}</span>)}</p></article>)}</div></div>
        </section>}

        {services.length > 0 && <section className="guide-section signature-section">
          <div className="container"><Eyebrow>{copy.signatureEyebrow}</Eyebrow><h2>{copy.signatureTitle}</h2><p className="section-lead">{copy.signatureLead}</p><div className="signature-grid">{services.map(([title, desc, duration, audience], index) => <article className="signature-card" key={title}>{signature[index]?.[0] && <img src={assetPath(signature[index][0])} alt={title} loading="lazy" decoding="async" />}<div><h3>{title}</h3><p>{desc}</p><div><span>{duration}</span><small>{audience}</small></div></div></article>)}</div></div>
        </section>}

        {quotes.length > 0 && <section className="guide-section guestbook-section">
          <div className="container"><Eyebrow dark>{copy.guestbookEyebrow}</Eyebrow><h2>{copy.guestbookTitle}</h2><div className="guestbook-grid">{quotes.map(([quote, author]) => <blockquote key={author}><p>{quote}</p><cite>— {author}</cite></blockquote>)}</div></div>
        </section>}

        <section className="guide-section reserve-section" id="reserve">
          <div className="container"><Eyebrow>{copy.reserveEyebrow}</Eyebrow><h2>{copy.reserveTitle}</h2><p className="section-lead">{copy.reserveLead}</p><div className="booking-layout">
            <div className="calendar-card"><div className="calendar-head"><div><strong>{copy.calendarTitle}</strong><small>提交后由顾问确认实际档期</small></div></div><label className="booking-date-field">选择意向日期<input type="date" name="bookingDate" value={selectedDate} min={minimumBookingDate} required onChange={(event) => setSelectedDate(event.target.value)} /></label><p className="booking-date-note">此页面不连接实时日历库存；日期仅表示预约意向，不代表已锁定档期。</p></div>
            <form className="booking-form" onSubmit={submitBooking}><div className="booking-form-head"><h3>{copy.formTitle}</h3><p>{copy.formLead}</p></div><label>{copy.duration}<select name="serviceLength" defaultValue={copy.durations[0]}>{copy.durations.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.travelers}<select name="travelers" defaultValue={copy.travelerOptions[1]}>{copy.travelerOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label>{copy.requirements}<input name="requirements" required placeholder={copy.requirementsPlaceholder} /></label><label>{copy.contact}<input name="contact" required placeholder={copy.contactPlaceholder} /></label><button className="button button-deep button-block" type="submit" disabled={submitting}>{submitting ? copy.submitting : copy.submit}</button>{bookingMessage && <p className={`booking-message ${bookingSucceeded ? 'success' : ''}`} role="status">{bookingMessage}</p>}</form>

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
  const { content, status, error } = useSiteContent()
  const [saved, setSaved] = useState(() => readSavedContent())
  const [recent, setRecent] = useState(() => readRecentContent())
  useEffect(() => {
    const refresh = () => { setSaved(readSavedContent()); setRecent(readRecentContent()) }
    window.addEventListener(userContentChangeEvent(), refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(userContentChangeEvent(), refresh); window.removeEventListener('storage', refresh) }
  }, [])
  const collections = {
    city: visibleRecords(content.cities), attraction: visibleRecords(content.attractions),
    itinerary: visibleRecords(content.sampleItineraries), destination: visibleRecords(content.destinations),
    route: visibleRecords(content.routes), guide: visibleRecords(content.guides), experience: visibleRecords(content.experiences || content.settings?.experiences || []),
  }
  const labels = { city: '城市', attraction: '景点', itinerary: '参考行程', destination: '目的地', route: '路线', guide: '导游', experience: '体验' }
  const paths = { city: (id) => `/attractions/city/${id}`, attraction: (id) => `/attractions/${id}`, itinerary: (id) => `/itineraries/${id}`, destination: (id) => `/destinations/${id}`, route: (id) => `/routes/${id}`, guide: (id) => `/guides/${id}`, experience: (id) => `/experiences/${id}` }
  const resolveRecord = (entry) => collections[entry.type]?.find((item) => item.id === entry.id) || null
  const siteName = content.settings?.miniprogramName || content.settings?.siteName || '希腊旅行管家'
  const phone = String(content.settings?.consultPhone || content.settings?.phone || '').trim()
  const tel = phone.replace(/[^\d+]/g, '')
  function contentCard(entry, recentItem = false) {
    const item = resolveRecord(entry)
    const title = item?.title || item?.name || item?.id || entry.id
    const image = item?.cover || item?.image
    const href = item && paths[entry.type] ? paths[entry.type](item.id) : ''
    const timestamp = entry.savedAt || entry.viewedAt
    return <article className="web-user-content-card" key={`${entry.type}:${entry.id}`}>
      {image && <img src={assetPath(image)} alt="" loading="lazy" decoding="async" />}
      <div className="web-user-content-copy"><small>{labels[entry.type] || '内容'}{timestamp ? ` · ${new Date(timestamp).toLocaleDateString()}` : ''}</small>
        {href ? <Link to={href}><strong>{title}</strong></Link> : <strong>{title}（已下架或不可用）</strong>}
      </div>
      {!recentItem && <button type="button" className="web-user-remove" onClick={() => removeSavedContent(entry.type, entry.id)}>移除收藏</button>}
    </article>
  }
  return <>
    <InnerHero image={images.athens} eyebrow="MY GREECE TRAVEL BUTLER" title="我的" subtitle="此页面提供仅保存在当前浏览器的收藏与浏览记录；账户资料和跨设备数据仍需安全登录。" breadcrumb="我的" short />
    <main className="section my-page"><div className="container">
      <div className="my-profile-card"><div className="my-profile-icon"><UserRound size={25} /></div><div><Eyebrow>WEB · LOCAL ONLY</Eyebrow><h2>浏览器收藏与记录</h2><p>Website 不会用小程序身份令牌冒充网页登录，也不会在本地保存手机号、证件或订单资料。</p></div><Link className="button button-primary" to="/customize">联系顾问</Link></div>
      <section className="web-user-section"><div className="web-user-section-head"><div><Eyebrow>SAVED CONTENT</Eyebrow><h2>我的收藏 <small>{saved.length}</small></h2></div><p>仅在此浏览器可见；清理浏览器数据后将无法恢复。</p></div>
        {status === 'loading' && <div className="content-state" role="status">正在读取收藏对应的公开内容…</div>}
        {status === 'error' && <div className="content-state error" role="alert">{error}</div>}
        {saved.length ? <div className="web-user-content-list">{saved.map((entry) => contentCard(entry))}</div> : <div className="web-user-empty"><Heart size={20}/><span>还没有收藏内容。打开城市、景点或参考行程页面后，使用“收藏”按钮即可保存。</span></div>}
      </section>
      <section className="web-user-section"><div className="web-user-section-head"><div><Eyebrow>RECENTLY VIEWED</Eyebrow><h2>最近浏览 <small>{recent.length}</small></h2></div><button className="web-user-remove" type="button" onClick={() => { clearRecentContent(); setRecent([]) }} disabled={!recent.length}>清除记录</button></div>
        {recent.length ? <div className="web-user-content-list">{recent.map((entry) => contentCard(entry, true))}</div> : <div className="web-user-empty"><Clock3 size={20}/><span>浏览过的公开城市、景点、路线和参考行程会记录在当前浏览器。</span></div>}
      </section>
      <div className="my-feature-grid"><article><CalendarDays /><h3>预约与订单</h3><p>Website 暂无登录态查询接口；提交的咨询会由顾问跟进，私密订单请在微信小程序中查看。</p></article><article><Heart /><h3>会员与优惠券</h3><p>小程序收藏/观看历史目前仅显示计数；Web 收藏独立保存在本机，不跨端同步。</p></article><article><Users /><h3>出行人和证件</h3><p>需要认证后的安全账户接口。当前 Web 不收集护照、签证或同行人证件资料。</p></article><article><UserRound /><h3>登录与支付</h3><p>微信登录、手机号授权和支付属于小程序原生能力；Web 不声明等价登录或支付。</p></article></div>
      <div className="my-about-card"><Eyebrow>{siteName}</Eyebrow><h2>微信原生账户功能</h2><p>如需手机号绑定、订单/预约、优惠券或私密资料，请在微信中搜索“{siteName}”。城市讲解购买尚未接通；小程序支付曾遇到商户权限错误，请以实际开通状态为准。</p>{tel && <a className="button button-gold" href={`tel:${tel}`}>电话咨询 · {phone}</a>}</div>
    </div></main><GoldCTA /><Footer />
  </>
}

function GuideSharePage() {
  const [params] = useSearchParams()
  return <GuidePage guideIdOverride={params.get('id') || 'richard-li'} />
}

function AttractionSharePage() {
  const [params] = useSearchParams()
  const id = params.get('id') || ''
  return id ? <AttractionDetail idOverride={id} /> : <ContentNotFound title="缺少景点 ID" description="请使用有效的 attractionId 打开景点详情。" backTo="/attractions" backLabel="返回景点导览" />
}

function CitySharePage() {
  const [params] = useSearchParams()
  const id = params.get('id') || ''
  return id ? <CityGuidePage cityIdOverride={id} /> : <ContentNotFound title="缺少城市 ID" description="请使用有效的 cityId 打开城市导览。" backTo="/attractions" backLabel="返回城市选择" />
}

function ItinerarySharePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const id = params.get('id') || ''
  if (token) return <CustomTripPage tokenOverride={token} />
  if (id) return <ItineraryDetail idOverride={id} />
  return <ContentNotFound title="缺少行程参数" description="请使用有效的 token 或 id 打开行程详情。" backTo="/itineraries" backLabel="返回参考行程" />
}

function LuxurySharePage() {
  const [params] = useSearchParams()
  const { content } = useSiteContent()
  const id = params.get('id') || ''
  const type = params.get('type') || ''
  const experience = visibleRecords(content.experiences || content.settings?.experiences || []).find((item) => item.id === id || item.shareType === type)
  return experience ? <LuxuryExperienceDetail slugOverride={experience.id} /> : <ContentNotFound title="没有找到此项体验" description="请使用 Website 后台配置的体验 ID 或分享类型链接。" backTo="/" backLabel="返回首页" />
}

function PublicBottomNav() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/manage-9f3k7')) return null
  return <nav className="public-bottom-nav" aria-label="主要导航"><Link to="/"><HomeIcon size={18} /><span>首页</span></Link><Link to="/#contact"><Phone size={18} /><span>立即联系</span></Link><Link to="/my"><UserRound size={18} /><span>我的</span></Link></nav>
}

function ContentNotFound({ title = '没有找到这条内容', description = '内容可能已下线或链接参数无效。', backTo = '/', backLabel = '返回首页' }) {
  return <main className="section"><div className="container empty-state"><Compass /><h2>{title}</h2><p>{description}</p><Link className="button button-primary" to={backTo}>{backLabel}</Link></div></main>
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
  return <SiteContentProvider><AppRoutes /></SiteContentProvider>
}

function AppRoutes() {
  const isAdminRoute = useLocation().pathname === '/manage-9f3k7'
  return <><ScrollToTop /><SEO /><Routes>
    <Route path="/" element={<Home />} />
    <Route path="/routes/:slug" element={<RouteDetail />} />
    <Route path="/customize" element={<Customize />} />
    <Route path="/heritage-guidance" element={<HeritageGuidance />} />
    <Route path="/vehicle-consultation" element={<VehicleConsultation />} />
    <Route path="/knowledge-base" element={<KnowledgeBase />} />
    <Route path="/knowledge-base/:slug" element={<KnowledgeBase />} />
    <Route path="/attractions" element={<AttractionsIndex />} />
    <Route path="/attractions/city/:cityId/spots" element={<CityGuidePage />} />
    <Route path="/attractions/city/:cityId" element={<CityGuidePage />} />
    <Route path="/attractions/:id" element={<AttractionDetail />} />
    <Route path="/itineraries" element={<ItinerariesIndex />} />
    <Route path="/itineraries/:id" element={<ItineraryDetail />} />
    <Route path="/itinerary/detail" element={<ItinerarySharePage />} />
    <Route path="/trip/:token" element={<CustomTripPage />} />
    <Route path="/business-travel" element={<BusinessTravel />} />
    <Route path="/experiences/:slug" element={<LuxuryExperienceDetail />} />
    <Route path="/destinations/:slug" element={<DestinationDetail />} />
    <Route path="/guides/:id" element={<GuidePage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/tools" element={<ToolsPage />} />
    <Route path="/my" element={<MyPage />} />
    <Route path="/pages/guide/guide" element={<GuideSharePage />} />
    <Route path="/pages/attraction/detail" element={<AttractionSharePage />} />
    <Route path="/pages/city/index" element={<CitySharePage />} />
    <Route path="/pages/city/spots" element={<CitySharePage />} />
    <Route path="/pages/itinerary/index" element={<ItinerariesIndex />} />
    <Route path="/pages/itinerary/detail" element={<ItinerarySharePage />} />
    <Route path="/pages/luxury/detail" element={<LuxurySharePage />} />
    <Route path="/pages/customize/customize" element={<Customize />} />
    <Route path="/pages/knowledge/knowledge" element={<KnowledgeBaseIndex />} />
    <Route path="/pages/travel-guide/travel-guide" element={<ToolsPage />} />
    <Route path="/pages/vehicle/vehicle" element={<VehicleConsultation />} />
    <Route path="/pages/business/business" element={<BusinessTravel />} />
    <Route path="/admin" element={<LegacyAdminRedirect />} />
    <Route path="/manage-9f3k7" element={<AdminPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>{!isAdminRoute && <><ConsultationDock /><PublicBottomNav /></>}</>
}
