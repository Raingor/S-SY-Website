import React, { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ArrowRight, Check, ChevronRight, Menu, X } from 'lucide-react'
import { LanguageSwitcher, translate, useLanguage } from './i18n'

export const isRootPortableFile = window.location.protocol === 'file:' && !window.location.pathname.includes('/dist/')
export const IMG = isRootPortableFile ? './public/images/' : '/images/'

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
    <Link className="logo" to="/" aria-label="SY 希腊蔚蓝海岸首页">
      <span className="temple" aria-hidden="true"><i /><i /><i /></span>
      <span>SY 希腊蔚蓝海岸</span>
    </Link>
  )
}

export function Header({ solid = false }) {
  const [open, setOpen] = useState(false)
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  const location = useLocation()
  useEffect(() => setOpen(false), [location.pathname])
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
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航菜单">
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

export function GoldCTA() {
  const [language] = useLanguage()
  const t = (key) => translate(key, language)
  return (
    <section className="gold-cta">
      <div className="container gold-cta-inner">
        <div>
          <h2>只为一生美好回忆</h2>
          <p>1v1 · 24h · {language === 'en' ? 'Scope and service fee discussed first' : language === 'ja' ? '内容と費用を先にご相談' : language === 'el' ? 'Πρώτα συζητάμε το αντικείμενο και την αμοιβή' : '先沟通需求范围与咨询费用'}</p>
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
  const routeLabels = language === 'en' ? ['3 days · Athens highlights', '5 days · Athens + Santorini', '7 days · Family Greece', '9 days · Heritage circuit'] : language === 'ja' ? ['3日 · アテネの魅力', '5日 · アテネ + サントリーニ', '7日 · 家族で巡るギリシャ', '9日 · 世界遺産ルート'] : language === 'el' ? ['3 ημέρες · Αθήνα', '5 ημέρες · Αθήνα + Σαντορίνη', '7 ημέρες · Οικογενειακή Ελλάδα', '9 ημέρες · Πολιτιστική διαδρομή'] : ['3天2晚 · 雅典市区精华', '5天4晚 · 雅典 + 圣托里尼', '7天6晚 · 经典三城家庭游', '9天8晚 · 全遗产环游']
  return (
    <footer id="contact" className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand"><Logo /><p>{t('footer.brand')}</p><strong>sy-greece.com</strong></div>
        <div><h3>{t('footer.routes')}</h3><Link to="/itineraries">参考行程</Link><Link to="/itineraries/sample-athens-3d">{routeLabels[0]}</Link><Link to="/itineraries/sample-ae-6d">{routeLabels[1]}</Link><Link to="/itineraries/sample-family-7d">{routeLabels[2]}</Link><Link to="/itineraries/sample-heritage-7d">{routeLabels[3]}</Link></div>
        <div><h3>{t('footer.services')}</h3><Link to="/customize">{language === 'en' ? 'Private planning' : language === 'ja' ? 'プライベート旅行' : language === 'el' ? 'Ιδιωτικός σχεδιασμός' : '私人定制'}</Link><a href="#services">{language === 'en' ? 'Private transfers' : language === 'ja' ? '専用車' : language === 'el' ? 'Ιδιωτικές μετακινήσεις' : '专属用车'}</a><a href="#experiences">{language === 'en' ? 'Yachts & private flights' : language === 'ja' ? 'ヨット / プライベートフライト' : language === 'el' ? 'Yacht / private flights' : '私人包机 / 游艇出海'}</a><Link to="/attractions">景点导览</Link><Link to="/knowledge-base">景点文史知识库</Link><Link to="/business-travel">商旅随行咨询</Link><Link to="/tools">{t('nav.tools')}</Link></div>
        <div><h3>{t('footer.contact')}</h3><span>{t('footer.wechat')}</span><span>{t('footer.phone')}</span><span>{t('footer.email')}</span></div>
      </div>
      <div className="container copyright"><span>2026 SY Greece · {language === 'en' ? 'All rights reserved' : language === 'ja' ? '無断転載禁止' : language === 'el' ? 'Με επιφύλαξη παντός δικαιώματος' : '希腊蔚蓝海岸 · 版权所有'}</span><span>仅提供文化咨询、行程策划、知识付费与商务语言陪同咨询</span></div><div className="container footer-disclaimer"><ComplianceNotice /></div>
    </footer>
  )
}
