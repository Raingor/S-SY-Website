import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Accessibility, ArrowLeft, ArrowRight, Baby, CalendarDays, Check, ChevronRight, Clock3,
  Coins, Compass, Headphones, HelpCircle, Info, Landmark as LandmarkIcon,
  Lightbulb, Map as MapIcon, MapPin, Megaphone, Ship, Sparkles, Star, Store, Ticket,
  TrainFront, Volume2,
} from 'lucide-react'
import { assetPath, ComplianceNotice, Eyebrow, Footer, GoldCTA, Header, InnerHero, SectionTitle, images } from './chrome'
import staticData from './attractions-data.json'

const isFile = window.location.protocol === 'file:'
const FALLBACK_ATTRACTIONS = staticData.attractions || []
const FALLBACK_ITINERARIES = staticData.sampleItineraries || []
const FALLBACK_CITIES = staticData.cities || []

function useSiteContent() {
  const [content, setContent] = useState({ attractions: FALLBACK_ATTRACTIONS, sampleItineraries: FALLBACK_ITINERARIES, cities: FALLBACK_CITIES })
  useEffect(() => {
    if (isFile) return
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!payload) return
      setContent({
        attractions: payload.attractions?.length ? payload.attractions : FALLBACK_ATTRACTIONS,
        sampleItineraries: payload.sampleItineraries?.length ? payload.sampleItineraries : FALLBACK_ITINERARIES,
        cities: payload.cities?.length ? payload.cities : FALLBACK_CITIES,
      })
    }).catch(() => {})
  }, [])
  return content
}

const CITY_EN = { athens: 'ATHENS', santorini: 'SANTORINI', delphi: 'DELPHI', meteora: 'METEORA', crete: 'CRETE', mykonos: 'MYKONOS' }

function sizeLabelOf(item) { return item.sizeLabel || item.scale || '' }
function audioMinutes(attraction) {
  return (attraction.exhibits || []).reduce((total, exhibit) => total + (parseInt(exhibit.duration, 10) || 0), 0)
}

function NotFoundMini() {
  return <main className="section"><div className="container empty-state"><Compass /><h2>没有找到这个页面</h2><p>内容可能已下线，回到景点导览继续探索。</p><Link className="button button-primary" to="/attractions">返回景点导览</Link></div></main>
}

/* ---------------- 景点首页（城市选择） ---------------- */

export function AttractionsIndex() {
  const { attractions, sampleItineraries, cities } = useSiteContent()
  const enriched = useMemo(() => cities.map((city) => {
    const items = attractions.filter((item) => item.city === city.id)
    return {
      ...city,
      items,
      points: items.reduce((total, item) => total + (item.exhibits || []).length, 0),
      minutes: items.reduce((total, item) => total + audioMinutes(item), 0),
    }
  }), [attractions, cities])
  return (
    <>
      <InnerHero image={images.athens} eyebrow="ATTRACTIONS & MUSEUMS" title="景点导览" subtitle="选择一座城市，开始景点与博物馆导览：路线导览、展品讲解与完整参观指南。" breadcrumb="景点导览">
        <div className="hero-actions"><Link className="button button-primary" to="/itineraries">浏览参考行程</Link><a className="button button-ghost" href="#cities">查看精选城市</a></div>
      </InnerHero>
      <main className="section">
        <div className="container">
          <div id="cities" className="city-card-grid">
            {enriched.map((city) => (
              <Link to={`/attractions/city/${city.id}`} className="city-entry-card" key={city.id}>
                <div className="city-entry-mosaic">
                  {(city.mosaic || []).slice(0, 4).map((image, index) => <img src={assetPath(image)} alt="" loading="lazy" decoding="async" key={index} />)}
                  <div className="city-entry-overlay">
                    <Eyebrow dark>{CITY_EN[city.id] || city.name}</Eyebrow>
                    <h3>{city.name}</h3>
                    <small>{city.country}</small>
                  </div>
                </div>
                <div className="city-entry-stats">
                  <span><strong>{city.museumCount}</strong>个景点</span>
                  <span><strong>{city.points}</strong>个讲解点</span>
                  <span><strong>{city.minutes}</strong>分钟讲解</span>
                  <em>进入导览<ArrowRight size={14} /></em>
                </div>
              </Link>
            ))}
          </div>
          {sampleItineraries.length > 0 && (
            <section className="included-routes">
              <SectionTitle eyebrow="SAMPLE ITINERARIES" title="这些景点怎么串成行程" action={{ to: '/itineraries', label: '全部参考行程' }} />
              <div className="itinerary-card-grid">
                {sampleItineraries.map((item) => (
                  <Link to={`/itineraries/${item.id}`} className="itinerary-mini-card" key={item.id}>
                    <img src={assetPath(item.cover)} alt={item.title} loading="lazy" decoding="async" />
                    <span className="itinerary-days-chip">{item.days} 天</span>
                    <div><h3>{item.title}</h3><p>{item.summary}</p></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

/* ---------------- 城市介绍页（深色 mosaic + 统计 + 双 CTA） ---------------- */

export function CityGuidePage({ cityIdOverride = '' }) {
  const { cityId: routeCityId } = useParams()
  const cityId = cityIdOverride || routeCityId || ''
  const { attractions, cities } = useSiteContent()
  const city = cities.find((item) => item.id === cityId)
  const cityAttractions = attractions.filter((item) => item.city === cityId)
  const stats = [
    [city?.museumCount ?? cityAttractions.length, '个景点'],
    [city?.guidePointCount ?? cityAttractions.reduce((t, i) => t + (i.exhibits || []).length, 0), '个讲解点'],
    [city?.audioMinutes ?? cityAttractions.reduce((t, i) => t + audioMinutes(i), 0), '分钟讲解'],
  ]
  if (!city && !cityAttractions.length) return <><Header solid /><NotFoundMini /><Footer /></>
  const mosaic = (city?.mosaic || cityAttractions.map((item) => item.image)).slice(0, 4)
  const mosaicRows = mosaic.length >= 3 ? [mosaic.slice(0, 2), mosaic.slice(2, 4)] : [mosaic]
  return (
    <>
      <div className="city-guide-hero">
        <Header />
        <div className="city-guide-back"><Link to="/attractions"><ArrowLeft size={16} />返回城市选择</Link></div>
        <div className="city-mosaic" aria-hidden="true">
          {mosaicRows.map((row, rowIndex) => <div className="city-mosaic-row" key={rowIndex}>{row.map((image, index) => <img src={assetPath(image)} alt="" key={index} />)}</div>)}
          <div className="city-mosaic-shade" />
        </div>
        <div className="container city-guide-content">
          <h1>{city?.name || cityAttractions[0]?.cityName}</h1>
          <p className="city-guide-country">{city?.country || '希腊'}</p>
          {city?.subtitle && <p className="city-guide-subtitle">{city.subtitle}</p>}
          <div className="city-guide-stats">
            {stats.map(([value, label]) => <div key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></div>)}
          </div>
          <Link to="#city-guide-note" className="city-guide-link"><Lightbulb size={15} />了解「SY 希腊」导览讲解的不同之处</Link>
          <div className="city-guide-actions">
            <a className="city-guide-buy" href="#city-guide-note">购买 {city?.price || ''}</a>
            <Link className="city-guide-view" to={`#city-attractions`} onClick={(event) => { event.preventDefault(); document.getElementById('city-attractions')?.scrollIntoView({ behavior: 'smooth' }) }}>查看</Link>
          </div>
        </div>
      </div>
      <main className="section">
        <div className="container">
          <div className="city-guide-note" id="city-guide-note">
            <Eyebrow>WHAT MAKES US DIFFERENT</Eyebrow>
            <p>{city?.description || ''}每个景点配有逐展品的中文语音讲解、路线导览与完整参观指南（开放时间、门票、交通、亲子、无障碍等 12 项）。</p>
            <div className="city-guide-note-pricing">
              <div><strong>{city?.price || '€9.99'}</strong><span>{city?.purchaseNote || '一次购买，城市内全部景点讲解永久有效。'}</span></div>
              <Link className="button button-gold" to="/customize">咨询购买讲解</Link>
            </div>
            <p className="knowledge-disclaimer">当前为内容结构与免费预览展示，真实支付能力接入前，讲解内容请通过顾问咨询获取。</p>
          </div>

          <section id="city-attractions">
            <SectionTitle eyebrow={`${CITY_EN[cityId] || ''} · ATTRACTIONS`} title={`${city?.name || ''}的景点与博物馆`} />
            {cityAttractions.length ? <div className="city-attraction-list">
              {cityAttractions.map((item) => (
                <Link to={`/attractions/${item.id}`} className="dark-attraction-card" key={item.id}>
                  <div className="dark-attraction-image">
                    <img src={assetPath(item.image)} alt={item.name} loading="lazy" decoding="async" />
                    {sizeLabelOf(item) && <span className="scale-badge">{sizeLabelOf(item)}</span>}
                  </div>
                  <div className="dark-attraction-copy">
                    <div className="dark-attraction-head">
                      <span className="attraction-logo"><LandmarkIcon size={16} /></span>
                      <div>
                        <h3>{item.name}</h3>
                        <small>{item.originalName || item.en}</small>
                      </div>
                    </div>
                    <p>{item.summary}</p>
                  </div>
                </Link>
              ))}
            </div> : <div className="empty-state"><Compass /><h2>该城市暂时没有可展示的景点</h2><p>内容可能尚未发布或已下线，请返回城市选择继续浏览。</p><Link className="button button-primary" to="/attractions">返回精选城市</Link></div>}
          </section>
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

/* ---------------- 景点详情页 ---------------- */

const GUIDE_ITEMS = [
  ['hours', '开放时间', Clock3], ['tickets', '门票信息', Ticket], ['transport', '交通信息', TrainFront], ['worth', '值得一去', Star],
  ['services', '馆内服务', Sparkles], ['family', '亲子参观', Baby], ['map', '馆内地图', MapIcon], ['shop', '博物馆商店', Store],
  ['accessibility', '无障碍服务', Accessibility], ['exhibitions', '临时展览', Megaphone], ['faq', '常见问题', HelpCircle], ['notices', '临时通知', Info],
]

export function AttractionDetail({ idOverride = '' }) {
  const { id: routeId } = useParams()
  const id = idOverride || routeId || ''
  const { attractions, sampleItineraries } = useSiteContent()
  const attraction = attractions.find((item) => item.id === id)
  const [guideTab, setGuideTab] = useState('all')
  useEffect(() => { setGuideTab('all') }, [id])
  if (!attraction) return <><Header solid /><NotFoundMini /><Footer /></>
  const relatedItineraries = sampleItineraries.filter((trip) => (trip.itinerary || []).some((day) => (day.attractionIds || []).includes(attraction.id)))
  const guideEntries = GUIDE_ITEMS.filter(([key]) => attraction.guide?.[key])
  const guideGroups = [
    ['实用信息', guideEntries.filter(([key]) => ['hours', 'tickets', 'transport'].includes(key))],
    ['游览建议', guideEntries.filter(([key]) => ['worth', 'services', 'family'].includes(key))],
    ['馆内设施', guideEntries.filter(([key]) => ['map', 'shop', 'accessibility', 'exhibitions'].includes(key))],
    ['常见问题与通知', guideEntries.filter(([key]) => ['faq', 'notices'].includes(key))],
  ]
  return (
    <>
      <InnerHero image={attraction.image} eyebrow={`${attraction.en} · ${CITY_EN[attraction.city] || attraction.cityName}`} title={attraction.name} subtitle={attraction.summary} breadcrumb={`景点导览 / ${attraction.name}`}>
        <div className="detail-hero-actions"><strong>{attraction.category}{sizeLabelOf(attraction) ? ` · ${sizeLabelOf(attraction)}` : ''}</strong><Link className="button button-primary" to="/customize">咨询讲解与行程</Link></div>
      </InnerHero>
      <main className="detail-page section">
        <div className="container detail-layout">
          <div>
            <div className="attraction-tag-row">{(attraction.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>

            {(attraction.highlights || []).length > 0 && (
              <section>
                <h2 className="timeline-title">路线导览</h2>
                <div className="timeline">
                  {(attraction.highlights || []).map((highlight, index) => (
                    <article className="day-card" key={highlight.name}><span className={index > 3 ? 'gold' : ''}>{String(index + 1).padStart(2, '0')}</span><div><h3>{highlight.name}</h3><p>{highlight.desc}</p></div></article>
                  ))}
                </div>
              </section>
            )}

            {(attraction.exhibits || []).length > 0 && (
              <section className="exhibit-section">
                <SectionTitle eyebrow="EXHIBITS & AUDIO GUIDE" title="展品与讲解点" />
                <div className="exhibit-grid">
                  {(attraction.exhibits || []).map((exhibit) => (
                    <article className="exhibit-card" key={exhibit.id}>
                      <div className="exhibit-image"><img src={assetPath(exhibit.image)} alt={exhibit.name} loading="lazy" decoding="async" /><span className="exhibit-duration"><Headphones size={13} />{exhibit.duration}</span></div>
                      <div className="exhibit-copy">
                        <h3>{exhibit.name}</h3>
                        <small>{exhibit.author}</small>
                        {exhibit.location && <span className="exhibit-location"><MapPin size={12} />{exhibit.location.floor}{exhibit.location.hall ? ` · ${exhibit.location.hall}` : ''}</span>}
                      </div>
                    </article>
                  ))}
                </div>
                <p className="exhibit-note"><Volume2 size={14} /> 语音讲解与楼层定位为内容结构展示，完整深度讲解将在付费能力接入后开放。</p>
              </section>
            )}

            {guideEntries.length > 0 && (
              <section className="guide-section">
                <SectionTitle eyebrow="VISITOR GUIDE" title="参观指南" />
                <div className="guide-group-tabs">
                  <button className={guideTab === 'all' ? 'active' : ''} onClick={() => setGuideTab('all')}>全部 {guideEntries.length} 项</button>
                  {guideGroups.filter(([, entries]) => entries.length > 0).map(([label, entries]) => (
                    <button key={label} className={guideTab === label ? 'active' : ''} onClick={() => setGuideTab(label)}>{label} {entries.length}</button>
                  ))}
                </div>
                {guideGroups.map(([label, entries]) => {
                  if (!entries.length || (guideTab !== 'all' && guideTab !== label)) return null
                  return (
                    <div key={label}>
                      {guideTab === 'all' && <h3 className="guide-group-title">{label}</h3>}
                      <div className="guide-grid">
                        {entries.map(([key, guideLabel, Icon]) => (
                          <article className="guide-item" key={key}><div className="guide-item-icon"><Icon size={18} /></div><div><h4>{guideLabel}</h4><p>{attraction.guide[key]}</p></div></article>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {(attraction.articles || []).length > 0 && (
              <section className="included-routes">
                <SectionTitle eyebrow="ARTICLES & TIPS" title="资讯攻略" />
                <div className="article-grid">
                  {(attraction.articles || []).map((article) => (
                    <article className="article-card" key={article.title}>
                      <div className="article-image"><img src={assetPath(article.cover)} alt={article.title} loading="lazy" decoding="async" /></div>
                      <div><span className="article-date"><CalendarDays size={13} />{article.date}</span><h3>{article.title}</h3><p>{article.summary}</p></div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {relatedItineraries.length > 0 && (
              <section className="included-routes">
                <SectionTitle eyebrow="SAMPLE ITINERARIES" title={`包含${attraction.name}的参考行程`} action={{ to: '/itineraries', label: '全部参考行程' }} />
                <div className="itinerary-card-grid">
                  {relatedItineraries.map((trip) => (
                    <Link to={`/itineraries/${trip.id}`} className="itinerary-mini-card" key={trip.id}>
                      <img src={assetPath(trip.cover)} alt={trip.title} loading="lazy" decoding="async" />
                      <span className="itinerary-days-chip">{trip.days} 天</span>
                      <div><h3>{trip.title}</h3><p>{trip.summary}</p></div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="trip-aside">
            <div className="summary-card">
              <h2>景点速览</h2>
              <dl>
                <div><dt>城市</dt><dd>{attraction.cityName}</dd></div>
                <div><dt>类型</dt><dd>{attraction.type === 'museum' ? '博物馆' : '景点'}</dd></div>
                <div><dt>讲解点</dt><dd>{(attraction.exhibits || []).length} 个 · 约 {audioMinutes(attraction)} 分钟</dd></div>
                <div><dt>开放时间</dt><dd>{attraction.guide?.hours ? String(attraction.guide.hours).split('；')[0] : '详见参观指南'}</dd></div>
              </dl>
              {attraction.deepDive && (
                <div className="deep-dive-box">
                  <Eyebrow>FREE PREVIEW</Eyebrow>
                  <p>{attraction.deepDive.preview}</p>
                  <div className="audio-placeholder"><Headphones size={18} /><span>深度讲解 · 试听占位</span><button type="button" disabled>即将开放</button></div>
                </div>
              )}
              <Link className="button button-primary button-block" to="/customize">预约讲解 · 咨询行程</Link>
              <Link className="text-link" to={`/attractions/city/${attraction.city}`} style={{ marginTop: 12 }}>返回{attraction.cityName}导览 <ChevronRight size={15} /></Link>
            </div>
            <div className="wechat-tip"><MapPin /><span>把景点串进你的行程<br /><strong>一对一顾问 · 24 小时回复</strong></span></div>
          </aside>
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

/* ---------------- 参考行程（简单版） ---------------- */

export function ItinerariesIndex() {
  const { sampleItineraries } = useSiteContent()
  return (
    <>
      <InnerHero image={images.santorini} eyebrow="SAMPLE ITINERARIES" title="参考行程" subtitle="几种经典玩法框架，正式行程按你的需求定制后通过专属链接发送。" breadcrumb="参考行程">
        <div className="hero-actions"><Link className="button button-gold" to="/customize">定制行程 · 填写需求，获取专属方案</Link><a className="button button-ghost" href="#list">浏览全部参考行程</a></div>
      </InnerHero>
      <main className="section" id="list">
        <div className="container">
          <div className="itinerary-notice"><Info size={16} /><span>以下为参考行程框架（简版），用于了解节奏与组合方式；每一段正式行程都会按出行时间、人数与偏好单独定制，并通过专属链接发送。行程中的景点可直接点击查看详情。</span></div>
          <div className="itinerary-list">
            {sampleItineraries.map((trip) => (
              <article className="itinerary-row-card" key={trip.id}>
                <Link className="itinerary-row-image" to={`/itineraries/${trip.id}`}><img src={assetPath(trip.cover)} alt={trip.title} loading="lazy" decoding="async" /><span className="itinerary-days-chip">{trip.days} 天</span></Link>
                <div className="itinerary-row-copy">
                  <Eyebrow>{trip.days} DAYS · SAMPLE</Eyebrow>
                  <h2><Link to={`/itineraries/${trip.id}`}>{trip.title}</Link></h2>
                  <p>{trip.summary}</p>
                  <div className="itinerary-day-strip">
                    {(trip.itinerary || []).map((day) => <span key={day.day}><strong>D{day.day}</strong>{day.title.split('·').pop().trim()}</span>)}
                  </div>
                  <div className="price-row"><span>行程框架 · 免费浏览</span><Link to={`/itineraries/${trip.id}`}>查看逐日安排 <ArrowRight size={13} /></Link></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

export function ItineraryDetail({ idOverride = '' }) {
  const { id: routeId } = useParams()
  const id = idOverride || routeId || ''
  const { attractions, sampleItineraries } = useSiteContent()
  const trip = sampleItineraries.find((item) => item.id === id)
  if (!trip) return <><Header solid /><NotFoundMini /><Footer /></>
  const attractionById = (attractionId) => attractions.find((item) => item.id === attractionId)
  return (
    <>
      <InnerHero image={trip.cover} eyebrow={`${trip.days} DAYS · SAMPLE ITINERARY`} title={trip.title} subtitle={trip.summary} breadcrumb={`参考行程 / ${trip.title}`}>
        <div className="detail-hero-actions"><strong>参考行程框架</strong><Link className="button button-primary" to="/customize">按此定制我的行程</Link></div>
      </InnerHero>
      <main className="detail-page section">
        <div className="container detail-layout">
          <div>
            <h2 className="timeline-title">逐日安排</h2>
            <div className="timeline">
              {(trip.itinerary || []).map((day) => (
                <article className="day-card" key={day.day}>
                  <span className={day.day > 3 ? 'gold' : ''}>D{day.day}</span>
                  <div>
                    <h3>{day.title}<small className="day-city">{day.city}</small></h3>
                    <p>{day.desc}</p>
                    {(day.attractionIds || []).length > 0 && (
                      <div className="attraction-pill-row">
                        {(day.attractionIds || []).map((attractionId) => {
                          const attraction = attractionById(attractionId)
                          return attraction ? <Link key={attractionId} className="attraction-pill" to={`/attractions/${attractionId}`}><LandmarkIcon size={13} />{attraction.name}</Link> : null
                        })}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <aside className="trip-aside">
            <div className="summary-card">
              <h2>行程速览</h2>
              <dl>
                <div><dt>天数</dt><dd>{trip.days} 天</dd></div>
                <div><dt>性质</dt><dd>参考行程框架</dd></div>
                <div><dt>关联景点</dt><dd>{[...new Set((trip.itinerary || []).flatMap((day) => day.attractionIds || []))].length} 个可点击查看</dd></div>
              </dl>
              <div className="aside-price"><strong>行程内容沟通定制</strong><small>按人数 / 日期专属报价</small></div>
              <Link className="button button-primary button-block" to="/customize">按此框架定制行程</Link>
            </div>
            <div className="wechat-tip"><Compass /><span>调整天数与节奏？<br /><strong>告诉我们你的想法</strong></span></div>
          </aside>
        </div>
      </main>
      <GoldCTA /><Footer />
    </>
  )
}

/* ---------------- 定制行程（详细版 · 专属链接） ---------------- */

const SERVICE_KEYS = ['接送', '陪同', '讲解', '酒店', '门票', '机票', '船票']
const PERIODS = ['上午', '中午', '下午', '晚上']

function formatDate(dateCode) {
  const value = String(dateCode || '')
  return value.length === 4 ? `${Number(value.slice(0, 2))}月${Number(value.slice(2))}日` : value
}

export function CustomTripPage({ tokenOverride = '' }) {
  const { token: routeToken } = useParams()
  const token = tokenOverride || routeToken || ''
  const [trip, setTrip] = useState(null)
  const [state, setState] = useState('loading')
  const [attractionNames, setAttractionNames] = useState({})
  useEffect(() => {
    fetch('/api/content').then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload?.attractions) setAttractionNames(Object.fromEntries(payload.attractions.map((item) => [item.id, item.name])))
    }).catch(() => {})
  }, [])
  useEffect(() => {
    fetch(`/api/trip/${token}`).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (payload) { setTrip(payload); setState('ready') } else setState('missing')
    }).catch(() => setState('missing'))
  }, [token])
  useEffect(() => { if (trip) document.title = `${trip.title}｜${trip.client} · 希腊旅行管家` }, [trip])

  if (state === 'loading') return <main className="trip-loading"><Header solid /><div className="container section"><p>正在加载行程…</p></div></main>
  if (state === 'missing') return (
    <>
      <Header solid />
      <main className="section"><div className="container empty-state"><Info /><h2>行程链接无效或已失效</h2><p>请确认链接是否完整，或联系我们重新发送。</p><Link className="button button-primary" to="/customize">联系我们</Link></div></main>
      <Footer />
    </>
  )

  const headerRows = [
    ['行程日期 / PERIOD', trip.period], ['订单编号 / NUMBER', trip.orderNo], ['旅客人数 / VISITORS', trip.travelers],
    ['语种需求 / LANGUAGES', trip.language], ['计划车型 / VEHICLE', trip.vehicle], ['推荐司导 / GUIDE', trip.guide], ['服务费总额 / TOTAL', trip.totalFee],
  ]
  return (
    <>
      <Header solid />
      <section className="trip-hero">
        <div className="container">
          <Eyebrow dark>TAILOR-MADE ITINERARY</Eyebrow>
          <h1>{trip.title}</h1>
          <p>{trip.client} · {trip.period} · 订单 {trip.orderNo}</p>
        </div>
      </section>
      <main className="trip-page section">
        <div className="container">
          <div className="trip-info-grid">
            {headerRows.map(([label, value]) => (
              <div className="trip-info-cell" key={label}><small>{label}</small><strong>{value || '—'}</strong></div>
            ))}
          </div>

          <div className="service-legend">
            <span className="service-legend-title">服务图例</span>
            {SERVICE_KEYS.map((service) => <span key={service}><i>★</i>{service}</span>)}
          </div>

          <h2 className="timeline-title">每日行程</h2>
          <div className="trip-days">
            {(trip.days || []).map((day, dayIndex) => (
              <article className="trip-day" key={dayIndex}>
                <header className="trip-day-head">
                  <strong>第 {dayIndex + 1} 天</strong>
                  <span>{formatDate(day.date)}</span>
                  <em>夜宿 · {day.city}</em>
                </header>
                {PERIODS.map((period) => {
                  const slots = (day.slots || []).filter((slot) => slot.period === period)
                  if (!slots.length) return null
                  return (
                    <div className="trip-period" key={period}>
                      <span className="period-badge">{period}</span>
                      <div className="trip-slots">
                        {slots.map((slot, slotIndex) => (
                          <div className="trip-slot" key={slotIndex}>
                            {slot.time && <span className="slot-time">{slot.time}</span>}
                            <div className="slot-body">
                              <strong>{slot.text}</strong>
                              {slot.desc && <p>{slot.desc}</p>}
                              {(slot.services || []).length > 0 && (
                                <div className="slot-services">{SERVICE_KEYS.map((service) => (slot.services || []).includes(service) ? <span key={service}><i>★</i>{service}</span> : null)}</div>
                              )}
                              {(slot.attractionIds || []).length > 0 && (
                                <div className="attraction-pill-row">
                                  {(slot.attractionIds || []).map((attractionId) => (
                                    <Link key={attractionId} className="attraction-pill" to={`/attractions/${attractionId}`}><LandmarkIcon size={13} />{attractionNames[attractionId] || attractionId}</Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </article>
            ))}
          </div>

          {(trip.notices || []).length > 0 && (
            <section className="trip-notices">
              <h2 className="timeline-title">行程须知</h2>
              {(trip.notices || []).map((group, groupIndex) => (
                <details className="notice-group" key={groupIndex} open={groupIndex === 0}>
                  <summary><ChevronRight size={15} />{group.title}<small>{group.items.length} 条</small></summary>
                  <ul>{group.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
                </details>
              ))}
            </section>
          )}

          <div className="trip-contact">
            <div><Headphones size={20} /><div><strong>行程服务群</strong><span>签约后将建立微信专属服务群，行程确认信息即时同步</span></div></div>
            <div><Ship size={20} /><div><strong>希腊旅行管家</strong><span>Ikoniou 94, Nea Smyrni 17123, Athens · 手机 +30-6973573863</span></div></div>
            <Link className="button button-gold" to="/customize">联系顾问调整行程</Link>
          </div>
          <ComplianceNotice />
        </div>
      </main>
      <Footer />
    </>
  )
}
