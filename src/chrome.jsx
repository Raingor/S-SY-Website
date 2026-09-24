import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Heart, Link2, Menu, Share2, X } from 'lucide-react'
import { LanguageSwitcher, translate, useLanguage } from './i18n'
import { useSiteContent, visibleRecords } from './site-content'
import { isContentSaved, toggleSavedContent, userContentChangeEvent } from './web-user-state'

export const isRootPortableFile = window.location.protocol === 'file:' && !window.location.pathname.includes('/dist/')
export const IMG = isRootPortableFile ? './public/images/' : '/images/'

export function assetPath(source) {
  if (!source) return ''
  if (/^(?:https?:|data:|\/)/.test(source)) return source
  const normalized = String(source).replace(/^\.\//, '').replace(/^\//, '')
  const filename = normalized.replace(/^(?:public\/)?images\//, '')
  return isRootPortableFile ? `./public/images/${filename}` : `/images/${filename}`
}

export const images = {
  santorini: `${IMG}santorini.webp`,
  athens: `${IMG}athens.webp`,
  plaka: `${IMG}plaka.webp`,
  delphi: `${IMG}delphi.webp`,
  meteora: `${IMG}meteora.webp`,
  meteoraSquare: `${IMG}meteora-square.webp`,
  nafplio: `${IMG}nafplio.webp`,
  couple: `${IMG}couple.webp`,
  jet: `${IMG}jet.webp`,
  yacht: `${IMG}yacht.webp`,
  mykonos: `${IMG}mykonos.webp`,
  zakynthos: `${IMG}zakynthos.webp`,
  richardAvatar: `${IMG}richard-avatar.webp`,
  richardProfile: `${IMG}richard-profile.webp`,
  consultantAvatar: `${IMG}jenny-avatar.jpg`,
  consultantQr: `${IMG}jenny-wechat-qr.png`,
  crete: `${IMG}crete.webp`,
  corinth: `${IMG}corinth.webp`,
}

export function ContentActions({ contentType, contentId, title = '' }) {
  const [saved, setSaved] = useState(() => isContentSaved(contentType, contentId))
  const [message, setMessage] = useState('')
  useEffect(() => {
    const update = () => setSaved(isContentSaved(contentType, contentId))
    window.addEventListener(userContentChangeEvent(), update)
    return () => window.removeEventListener(userContentChangeEvent(), update)
  }, [contentType, contentId])
  function save() {
    const result = toggleSavedContent(contentType, contentId)
    setSaved(result.saved)
    setMessage(result.saved ? '已保存在此浏览器' : '已从收藏移除')
  }
  async function share() {
    const url = window.location.href
    const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
    try {
      if (canNativeShare) await navigator.share({ title: title || document.title, url })
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else {
        const input = document.createElement('textarea')
        input.value = url
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        const copied = document.execCommand('copy')
        input.remove()
        if (!copied) throw new Error('copy failed')
      }
      if (!canNativeShare) setMessage('链接已复制，可粘贴分享')
    } catch (error) {
      if (error?.name !== 'AbortError') setMessage('分享未完成，请复制浏览器地址栏链接')
    }
  }
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  return <div className="content-actions"><button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? '取消收藏' : '收藏到此浏览器'}><Heart size={16} fill={saved ? 'currentColor' : 'none'} />{saved ? '已收藏' : '收藏'}</button><button type="button" onClick={share} aria-label="分享或复制页面链接">{canNativeShare ? <Share2 size={16} /> : <Link2 size={16} />}分享</button>{message && <span role="status">{message}</span>}</div>
}

export function Logo() {
  const { content } = useSiteContent()
  const siteName = content.settings?.siteName || '希腊旅行管家'
  return <Link className="logo" to="/" aria-label={`${siteName}首页`}><span className="temple" aria-hidden="true"><i /><i /><i /></span><span>{siteName}</span></Link>
}

export function Header({ solid = false }) {
  const [open, setOpen] = useState(false)
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  const location = useLocation()
  const { content } = useSiteContent()
  const route = visibleRecords(content.sampleItineraries)[0]
  const destination = visibleRecords(content.destinations)[0]
  const guide = visibleRecords(content.guides).find((item) => item.enabled !== false)
  const experience = visibleRecords(content.experiences || content.settings?.experiences || [])[0]
  useEffect(() => setOpen(false), [location.pathname, location.search])
  useEffect(() => {
    document.body.classList.toggle('nav-menu-open', open)
    return () => document.body.classList.remove('nav-menu-open')
  }, [open])
  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])
  const links = [
    ['/', t('nav.home')], [route ? `/itineraries/${route.id}` : '/itineraries', t('nav.routes')], [experience ? `/experiences/${experience.id}` : '/customize', t('nav.experiences')],
    [destination ? `/destinations/${destination.id}` : '/attractions', t('nav.destinations')], ['/attractions', t('nav.attractions')], [guide ? `/guides/${encodeURIComponent(guide.id)}` : '/', t('nav.guide')], ['/tools', t('nav.tools')], ['/my', '我的'],
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
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? '关闭导航菜单' : '打开导航菜单'}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  )
}

export function Eyebrow({ children, dark = false }) {
  return <div className={`eyebrow ${dark ? 'eyebrow-dark' : ''}`}>{children}</div>
}

export function SectionTitle({ eyebrow, title, action, dark = false }) {
  return (
    <div className={`section-heading ${dark ? 'on-dark' : ''}`}>
      <div><Eyebrow dark={dark}>{eyebrow}</Eyebrow><h2>{title}</h2></div>
      {action && <Link className="text-link" to={action.to}>{action.label}<ChevronRight size={15} /></Link>}
    </div>
  )
}

export function InnerHero({ eyebrow, title, subtitle, breadcrumb, image = images.santorini, children, short = false }) {
  return (
    <section className={`inner-hero ${short ? 'short' : ''}`} style={{ '--hero-image': `url(${assetPath(image)})` }}>
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

export function GoldCTA() {
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  return (
    <section className="gold-cta">
      <div className="container gold-cta-inner">
        <div>
          <h2>只为一生美好回忆</h2>
          <p>1v1 · 24h · {language === 'en' ? 'Scope and service fee discussed first' : language === 'zh-TW' ? '先溝通需求範圍與諮詢費用' : '先沟通需求范围与咨询费用'}</p>
        </div>
        <div className="gold-actions">
          <Link className="button button-deep" to="/customize">{t('common.customize')}</Link>
          <a className="button button-outline-light" href="#contact">{t('common.addWechat')}</a>
        </div>
      </div>
    </section>
  )
}

export function ComplianceNotice() {
  return <p className="compliance-notice">免责声明：仅提供文化咨询、行程策划、知识付费、商务语言陪同咨询服务，不从事旅游业务。涉及交通、场地、劳务等事项，由客户与希腊本土主体直接确认和结算。</p>
}

export function Footer() {
  const [language] = useLanguage()
  const { content } = useSiteContent()
  const t = (key) => translate(key, language)
  const settings = content.settings || {}
  const trips = visibleRecords(content.sampleItineraries).slice(0, 4)
  const experiences = visibleRecords(content.experiences || settings.experiences || [])
  return (
    <footer id="contact" className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo /><p>{t('footer.brand')}</p><strong>sy-greece.com</strong></div>
        <div><h3>{t('footer.routes')}</h3><Link to="/itineraries">参考行程</Link>{trips.map((trip) => <Link key={trip.id} to={`/itineraries/${trip.id}`}>{trip.title}</Link>)}</div>
        <div><h3>{t('footer.services')}</h3><Link to="/customize">{language === 'en' ? 'Private planning' : '行程咨询'}</Link><Link to="/attractions">{t('nav.attractions')}</Link><Link to="/knowledge-base">景点文史知识库</Link><Link to="/business-travel">商旅随行咨询</Link><Link to="/tools">{t('nav.tools')}</Link>{experiences.length > 0 && <Link to={`/experiences/${experiences[0].id}`}>{experiences[0].title}</Link>}</div>
        <div><h3>{t('footer.contact')}</h3>{settings.wechat && <span>微信：{settings.wechat}</span>}{settings.phone && <a href={`tel:${String(settings.phone).replace(/[^\d+]/g, '')}`}>电话：{settings.phone}</a>}{settings.email && <a href={`mailto:${settings.email}`}>邮箱：{settings.email}</a>}</div>
      </div>
      <div className="container copyright"><span>2026 {language === 'en' ? 'Greece Travel Butler · All rights reserved' : language === 'zh-TW' ? '希臘旅行管家 · 版權所有' : '希腊旅行管家 · 版权所有'}</span><span>{language === 'en' ? 'Cultural consultation, itinerary planning and business language support' : language === 'zh-TW' ? '提供文化諮詢、行程策劃、知識付費與商務語言陪同諮詢' : '提供文化咨询、行程策划、知识付费与商务语言陪同咨询'}</span></div><div className="container footer-disclaimer"><ComplianceNotice /></div>
    </footer>
  )
}
