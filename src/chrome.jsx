import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Menu, X } from 'lucide-react'
import { LanguageSwitcher, translate, useLanguage } from './i18n'

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
  crete: `${IMG}crete.webp`,
  corinth: `${IMG}corinth.webp`,
}

export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="希腊旅行管家首页">
      <span className="temple" aria-hidden="true"><i /><i /><i /></span>
      <span>希腊旅行管家</span>
    </Link>
  )
}

export function Header({ solid = false }) {
  const [open, setOpen] = useState(false)
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  const location = useLocation()
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
    ['/', t('nav.home')], ['/itineraries/sample-ae-6d', t('nav.routes')], ['/customize', t('nav.experiences')],
    ['/destinations/santorini', t('nav.destinations')], ['/attractions', t('nav.attractions')], ['/guides/richard-li', t('nav.guide')], ['/tools', t('nav.tools')],
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
  const t = (key) => translate(key, language)
  const routeLabels = language === 'en' ? ['3 days · Athens highlights', '5 days · Athens + Santorini', '7 days · Family Greece', '9 days · Heritage circuit'] : language === 'zh-TW' ? ['3天2晚 · 雅典市區精華', '5天4晚 · 雅典 + 聖托里尼', '7天6晚 · 經典三城家庭遊', '9天8晚 · 全遺產環遊'] : ['3天2晚 · 雅典市区精华', '5天4晚 · 雅典 + 圣托里尼', '7天6晚 · 经典三城家庭游', '9天8晚 · 全遗产环游']
  return (
    <footer id="contact" className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo /><p>{t('footer.brand')}</p><strong>sy-greece.com</strong></div>
        <div><h3>{t('footer.routes')}</h3><Link to="/itineraries">参考行程</Link><Link to="/itineraries/sample-athens-3d">{routeLabels[0]}</Link><Link to="/itineraries/sample-ae-6d">{routeLabels[1]}</Link><Link to="/itineraries/sample-family-7d">{routeLabels[2]}</Link><Link to="/itineraries/sample-heritage-7d">{routeLabels[3]}</Link></div>
        <div><h3>{t('footer.services')}</h3><Link to="/customize">{language === 'en' ? 'Private planning' : language === 'zh-TW' ? '私人定制' : '私人定制'}</Link><a href="#services">{language === 'en' ? 'Private transfers' : language === 'zh-TW' ? '專屬用車' : '专属用车'}</a><a href="#experiences">{language === 'en' ? 'Yachts & private flights' : language === 'zh-TW' ? '私人包機 / 遊艇出海' : '私人包机 / 游艇出海'}</a><Link to="/attractions">景点导览</Link><Link to="/knowledge-base">景点文史知识库</Link><Link to="/business-travel">商旅随行咨询</Link><Link to="/tools">{t('nav.tools')}</Link></div>
        <div><h3>{t('footer.contact')}</h3><span>{t('footer.wechat')}</span><span>{t('footer.phone')}</span><span>{t('footer.email')}</span></div>
      </div>
      <div className="container copyright"><span>2026 {language === 'en' ? 'Greece Travel Butler · All rights reserved' : language === 'zh-TW' ? '希臘旅行管家 · 版權所有' : '希腊旅行管家 · 版权所有'}</span><span>{language === 'en' ? 'Cultural consultation, itinerary planning and business language support' : language === 'zh-TW' ? '提供文化諮詢、行程策劃、知識付費與商務語言陪同諮詢' : '提供文化咨询、行程策划、知识付费与商务语言陪同咨询'}</span></div><div className="container footer-disclaimer"><ComplianceNotice /></div>
    </footer>
  )
}
