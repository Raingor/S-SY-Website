import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, Check, ChevronRight, FileText, Globe2, LogOut, MapPinned, Plus, Save, Settings, Smartphone, Trash2, Users, X } from 'lucide-react'

const ADMIN_KEY = 'sy-greece-admin-data'
const TOKEN_KEY = 'sy-greece-admin-token'
const emptyRoute = { days: '', kicker: '', title: '', tags: '', desc: '', image: 'santorini.png', status: 'published' }
const emptyDestination = { name: '', en: '', type: 'culture', image: 'santorini.png', status: 'published' }

function localSeed() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) } catch { return null }
}
function saveLocal(data) { localStorage.setItem(ADMIN_KEY, JSON.stringify(data)) }
function localId(prefix) { return `${prefix}-${Date.now().toString(36)}` }
function isGuideBooking(lead) { return lead.leadType === 'guide-booking' || Boolean(lead.guideSlug) }
function isMiniProgramBooking(lead) { return ['miniprogram', 'wechat-miniprogram'].includes(lead.platform) || ['miniprogram', 'wechat-miniprogram'].includes(lead.source) || lead.leadType === 'mini-program-booking' }

async function callApi(path, options = {}) {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const payload = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(payload?.error || '请求失败')
  return payload
}

function AdminLogin({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setError('')
    try {
      const response = await callApi('/auth/login', { method: 'POST', body: JSON.stringify({ password }) })
      sessionStorage.setItem(TOKEN_KEY, response.token); onLogin(response.token, false)
    } catch (requestError) {
      if (password === 'sy-greece-admin') {
        sessionStorage.setItem(TOKEN_KEY, 'local-demo-token'); onLogin('local-demo-token', true)
      } else setError(requestError.message === 'Failed to fetch' ? '管理服务尚未启动，请运行 npm run start' : requestError.message)
    }
  }
  return <main className="admin-login"><div className="admin-login-card"><div className="admin-mark"><span>SY</span><small>GREECE ADMIN</small></div><h1>网站管理后台</h1><p>管理路线、目的地、线索和站点配置</p><form onSubmit={submit}><label>管理员密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入管理密码" autoFocus /></label><button className="admin-primary" type="submit">进入后台 <ChevronRight size={16} /></button>{error && <div className="admin-error">{error}</div>}</form><small className="admin-hint">本地初始密码：sy-greece-admin</small></div></main>
}

function StatCard({ icon: Icon, label, value, tone = '' }) { return <div className={`admin-stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div> }
function AdminModal({ title, children, onClose }) { return <div className="admin-modal-backdrop"><div className="admin-modal"><div className="admin-modal-head"><h2>{title}</h2><button onClick={onClose} aria-label="关闭"><X size={18} /></button></div>{children}</div></div> }

export default function AdminPage() {
  const [token, setToken] = useState(sessionStorage.getItem(TOKEN_KEY))
  const [offline, setOffline] = useState(false)
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState({ routes: 0, destinations: 0, leads: 0, pendingLeads: 0, guideBookings: 0, pendingGuideBookings: 0, miniProgramBookings: 0 })
  const [routes, setRoutes] = useState([])
  const [destinations, setDestinations] = useState([])
  const [leads, setLeads] = useState([])
  const [guideBookings, setGuideBookings] = useState([])
  const [miniProgramBookings, setMiniProgramBookings] = useState([])
  const [settings, setSettings] = useState({ siteName: '', siteUrl: '', defaultTitle: '', defaultDescription: '', keywords: '', ogImage: '', googleVerification: '', robotsPolicy: 'index,follow', wechat: '', phone: '', email: '', replyHours: '' })
  const [routeForm, setRouteForm] = useState(emptyRoute)
  const [destinationForm, setDestinationForm] = useState(emptyDestination)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState('')

  const localMode = offline || token === 'local-demo-token'
  const localData = useMemo(() => localSeed() || { routes: [], destinations: [], leads: [], settings }, [settings])
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2500) }
  function applyData(data) { const nextLeads = data.leads || []; const nextGuideBookings = data.guideBookings || nextLeads.filter(isGuideBooking); const nextMiniProgramBookings = data.miniProgramBookings || nextLeads.filter(isMiniProgramBooking); setRoutes(data.routes || []); setDestinations(data.destinations || []); setLeads(nextLeads); setGuideBookings(nextGuideBookings); setMiniProgramBookings(nextMiniProgramBookings); setSettings(data.settings || settings); setStats({ routes: (data.routes || []).length, destinations: (data.destinations || []).length, leads: nextLeads.length, pendingLeads: nextLeads.filter((lead) => lead.status === 'new').length, guideBookings: nextGuideBookings.length, pendingGuideBookings: nextGuideBookings.filter((lead) => lead.status === 'new').length, miniProgramBookings: nextMiniProgramBookings.length }) }
  async function load() {
    if (localMode) return applyData(localData)
    try {
      const auth = { Authorization: `Bearer ${token}` }
      const [nextStats, nextRoutes, nextDestinations, nextLeads, nextGuideBookings, nextMiniProgramBookings, nextSettings] = await Promise.all(['/admin/stats', '/admin/routes', '/admin/destinations', '/admin/leads', '/admin/guide-bookings', '/admin/miniprogram-bookings', '/admin/settings'].map((path) => callApi(path, { headers: auth })))
      setStats(nextStats); setRoutes(nextRoutes); setDestinations(nextDestinations); setLeads(nextLeads); setGuideBookings(nextGuideBookings); setMiniProgramBookings(nextMiniProgramBookings); setSettings(nextSettings)
    } catch (error) { setOffline(true); notify(`管理服务不可用，已切换本地演示：${error.message}`) }
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
    try {
      if (localMode) localUpdate('destinations', (items) => isEdit ? items.map((item) => item.id === editing ? { ...destinationForm, id: editing } : item) : [...items, { ...destinationForm, id: localId('destination') }])
      else await callApi(isEdit ? `/admin/destinations/${editing}` : '/admin/destinations', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(destinationForm) })
      await load(); setEditing(null); setDestinationForm(emptyDestination); notify('目的地已保存')
    } catch (error) { notify(error.message) }
  }
  async function remove(collection, itemId) {
    if (!window.confirm('确定删除这条内容吗？')) return
    try { if (localMode) localUpdate(collection, (items) => items.filter((item) => item.id !== itemId)); else await callApi(`/admin/${collection}/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await load(); notify('已删除') } catch (error) { notify(error.message) }
  }
  async function updateLead(leadId, status) {
    try { if (localMode) localUpdate('leads', (items) => items.map((item) => item.id === leadId ? { ...item, status } : item)); else await callApi(`/admin/leads/${leadId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) }); await load(); notify('线索状态已更新') } catch (error) { notify(error.message) }
  }
  async function saveSettings(e) {
    e.preventDefault()
    try { if (localMode) localUpdate('settings', () => settings); else await callApi('/admin/settings', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(settings) }); await load(); notify('站点配置已保存') } catch (error) { notify(error.message) }
  }
  if (!token) return <AdminLogin onLogin={login} />
  const menu = [['overview', BarChart3, '总览'], ['routes', FileText, '路线管理'], ['destinations', MapPinned, '目的地'], ['leads', Users, '定制线索'], ['guideBookings', CalendarDays, '导游预约'], ['miniProgramBookings', Smartphone, '小程序预约'], ['settings', Settings, '站点配置']]
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span>SY</span><div><strong>希腊蔚蓝海岸</strong><small>CONTENT ADMIN</small></div></div><nav>{menu.map(([key, Icon, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={17} />{label}</button>)}</nav><div className="admin-sidebar-foot"><span className={localMode ? 'offline-dot' : ''}>{localMode ? '本地演示模式' : 'API 已连接'}</span><button onClick={logout}><LogOut size={15} />退出</button></div></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">SY GREECE / ADMIN</span><h1>{menu.find((item) => item[0] === tab)?.[2]}</h1></div><a href="/#/" className="admin-view-site"><Globe2 size={16} />查看前台</a></header>{toast && <div className="admin-toast"><Check size={15} />{toast}</div>}{tab === 'overview' && <Overview stats={stats} onTab={setTab} leads={leads} />}{tab === 'routes' && <CollectionPanel title="甄选路线" items={routes} type="routes" editing={editing} setEditing={setEditing} form={routeForm} setForm={setRouteForm} onSubmit={saveRoute} onDelete={remove} onAdd={() => { setEditing('new'); setRouteForm(emptyRoute) }} />}{tab === 'destinations' && <CollectionPanel title="精选目的地" items={destinations} type="destinations" editing={editing} setEditing={setEditing} form={destinationForm} setForm={setDestinationForm} onSubmit={saveDestination} onDelete={remove} onAdd={() => { setEditing('new'); setDestinationForm(emptyDestination) }} destination />}{tab === 'leads' && <LeadPanel leads={leads} onUpdate={updateLead} />}{tab === 'guideBookings' && <BookingPanel title="导游预约" eyebrow="RICHARD LI / GUIDE BOOKINGS" items={guideBookings} onUpdate={updateLead} guide />}{tab === 'miniProgramBookings' && <BookingPanel title="小程序预约" eyebrow="MINIPROGRAM BOOKINGS" items={miniProgramBookings} onUpdate={updateLead} />}{tab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} onSubmit={saveSettings} />}</section></main>
}

function Overview({ stats, onTab, leads }) { return <div className="admin-content"><div className="admin-stat-grid"><StatCard icon={FileText} label="已发布路线" value={stats.routes} /><StatCard icon={MapPinned} label="目的地" value={stats.destinations} tone="gold" /><StatCard icon={Users} label="全部线索" value={stats.leads} tone="green" /><StatCard icon={BarChart3} label="待处理" value={stats.pendingLeads} tone="coral" /><StatCard icon={CalendarDays} label="导游预约" value={stats.guideBookings} tone="gold" /><StatCard icon={Smartphone} label="小程序预约" value={stats.miniProgramBookings} tone="green" /></div><div className="admin-overview-grid"><div className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONTENT FLOW</span><h2>内容工作台</h2></div><button onClick={() => onTab('routes')}>管理内容 <ChevronRight size={15} /></button></div><div className="flow-list"><div><span className="flow-icon blue"><FileText size={17} /></span><span><strong>甄选路线</strong><small>维护首页主题路线与卖点文案</small></span><b>{stats.routes}</b></div><div><span className="flow-icon gold"><MapPinned size={17} /></span><span><strong>精选目的地</strong><small>维护目的地卡片和中英文名称</small></span><b>{stats.destinations}</b></div><div><span className="flow-icon green"><Users size={17} /></span><span><strong>定制线索</strong><small>跟进用户提交的旅行需求</small></span><b>{stats.pendingLeads} 待处理</b></div><div><span className="flow-icon gold"><CalendarDays size={17} /></span><span><strong>导游预约</strong><small>Richard 日期、时长与报价跟进</small></span><b>{stats.pendingGuideBookings} 待处理</b></div></div></div><div className="admin-panel admin-lead-preview"><div className="admin-panel-head"><div><span className="admin-eyebrow">LATEST LEADS</span><h2>最近线索</h2></div><button onClick={() => onTab('leads')}>查看全部 <ChevronRight size={15} /></button></div>{leads.length ? leads.slice(-4).reverse().map((lead) => <div className="mini-lead" key={lead.id}><span>{lead.destination || '希腊定制'}</span><strong>{lead.contact}</strong><small>{lead.status === 'new' ? '待处理' : lead.status}</small></div>) : <div className="admin-empty">还没有新线索。前台提交后会实时出现在这里。</div>}</div></div></div> }

function CollectionPanel({ title, items, type, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, destination }) { const modalTitle = editing === 'new' ? `新增${destination ? '目的地' : '路线'}` : `编辑${destination ? '目的地' : '路线'}`; return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{destination ? 'DESTINATION LIBRARY' : 'CURATED PACKAGES'}</span><h2>{title}</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增{destination ? '目的地' : '路线'}</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>名称</th><th>{destination ? '分类' : '天数 / 标签'}</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={`./images/${item.image}`} alt="" loading="lazy" decoding="async" />}<span><strong>{destination ? item.name : item.title}</strong><small>{destination ? item.en : item.kicker}</small></span></div></td><td>{destination ? (item.type === 'island' ? '海岛度假' : '文明溯源') : `${item.days} · ${item.tags}`}</td><td><span className={`status-pill ${item.status}`}>{item.status === 'published' ? '已发布' : item.status}</span></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); destination ? setForm(item) : setForm(item) }}>编辑</button><button className="danger" onClick={() => onDelete(type, item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无内容，点击右上角新增。</div>}</div></div>{editing && <AdminModal title={modalTitle} onClose={() => { setEditing(null); setForm(destination ? emptyDestination : emptyRoute) }}><form className="admin-form" onSubmit={onSubmit}>{destination ? <><label>中文名称<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>英文名称<input required value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label><label>分类<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="culture">文明溯源</option><option value="island">海岛度假</option></select></label><label>图片文件名<input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label></> : <><div className="admin-form-grid"><label>天数<input required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label><label>路线副标题<input required value={form.kicker} onChange={(e) => setForm({ ...form, kicker: e.target.value })} /></label></div><label>路线名称<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>人群标签<input required value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label><label>行程简介<textarea required rows="3" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label><label>图片文件名<input required value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} /></label></>}<label>发布状态<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">归档</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminModal>}</div> }

function LeadPanel({ leads, onUpdate }) { return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">TAILOR-MADE REQUESTS</span><h2>定制线索</h2></div><span className="admin-muted">共 {leads.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>目的地 / 主题</th><th>出行计划</th><th>联系方式</th><th>状态</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>{new Date(lead.createdAt).toLocaleString('zh-CN')}</td><td><strong>{lead.destination || '—'}</strong><small>{lead.themes?.join(' · ') || '未填写主题'}</small></td><td>{lead.travelMonth || '—'}<small>{lead.duration || ''} · {lead.travelers || ''}</small></td><td>{lead.contact}</td><td><select className={`lead-status ${lead.status}`} value={lead.status} onChange={(e) => onUpdate(lead.id, e.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></td></tr>)}</tbody></table>{!leads.length && <div className="admin-empty">暂无线索。提交定制表单后，线索会自动进入这里。</div>}</div></div></div> }
function BookingPanel({ title, eyebrow, items, onUpdate, guide = false }) {
  const statusLabels = { new: '待处理', contacted: '已联系', quoted: '已报价', closed: '已完成' }
  function dateLabel(value) { return value ? new Date(value).toLocaleString('zh-CN') : '—' }
  return <div className="admin-content"><div className="admin-panel collection-panel booking-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="admin-muted">共 {items.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr>{guide ? <><th>预约日期</th><th>服务 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源 / 提交时间</th></> : <><th>提交时间</th><th>预约内容</th><th>日期 / 时长 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源</th></>}<th>状态</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{guide ? <><td><strong>{item.bookingDate || item.travelMonth || '—'}</strong><small>{item.status === 'new' ? '待确认时间' : statusLabels[item.status] || item.status}</small></td><td>{item.serviceLength || item.duration || '—'}<small>{item.travelers || '—'}</small></td><td><strong>{item.requirements || item.route || '—'}</strong><small>{item.destination || 'Richard 李'}</small></td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'website'}<small>{dateLabel(item.createdAt)}</small></td></> : <><td>{dateLabel(item.createdAt)}</td><td><strong>{item.destination || item.title || '小程序预约'}</strong><small>{item.leadType || 'mini-program-booking'}</small></td><td>{item.bookingDate || item.travelMonth || '—'}<small>{item.serviceLength || item.duration || '—'} · {item.travelers || '—'}</small></td><td>{item.requirements || item.route || '—'}</td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'miniprogram'}</td></>}<td><select className={`lead-status ${item.status}`} value={item.status || 'new'} onChange={(event) => onUpdate(item.id, event.target.value)}><option value="new">{statusLabels.new}</option><option value="contacted">{statusLabels.contacted}</option><option value="quoted">{statusLabels.quoted}</option><option value="closed">{statusLabels.closed}</option></select></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无预约记录。新的预约提交后会自动出现在这里。</div>}</div></div></div>
}

function SettingsPanel({ settings, setSettings, onSubmit }) { const update = (key, value) => setSettings({ ...settings, [key]: value }); return <div className="admin-content"><div className="admin-panel settings-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SITE SETTINGS / SEO</span><h2>站点与 SEO 配置</h2></div></div><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>站点名称<input name="siteName" value={settings.siteName} onChange={(e) => update('siteName', e.target.value)} /></label><label>站点正式网址<input name="siteUrl" type="url" placeholder="https://sy-greece.com" value={settings.siteUrl} onChange={(e) => update('siteUrl', e.target.value)} /></label><label>默认页面标题<input name="defaultTitle" value={settings.defaultTitle} onChange={(e) => update('defaultTitle', e.target.value)} /></label><label>OG 分享图片<input name="ogImage" placeholder="images/santorini.png" value={settings.ogImage} onChange={(e) => update('ogImage', e.target.value)} /></label></div><label>默认 SEO 描述<textarea name="defaultDescription" rows="3" value={settings.defaultDescription} onChange={(e) => update('defaultDescription', e.target.value)} /></label><label>关键词（用逗号分隔）<input name="keywords" value={settings.keywords} onChange={(e) => update('keywords', e.target.value)} /></label><div className="admin-form-grid"><label>Google Search Console 验证码<input name="googleVerification" placeholder="粘贴 meta 验证码内容" value={settings.googleVerification} onChange={(e) => update('googleVerification', e.target.value)} /></label><label>Robots 策略<select name="robotsPolicy" value={settings.robotsPolicy} onChange={(e) => update('robotsPolicy', e.target.value)}><option value="index,follow">允许收录（index, follow）</option><option value="noindex,nofollow">暂不收录（noindex, nofollow）</option></select></label></div><div className="admin-form-grid"><label>微信号<input name="wechat" value={settings.wechat} onChange={(e) => update('wechat', e.target.value)} /></label><label>联系电话<input name="phone" value={settings.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>邮箱<input name="email" type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} /></label><label>回复承诺<input name="replyHours" value={settings.replyHours} onChange={(e) => update('replyHours', e.target.value)} /></label></div><button className="admin-primary" type="submit"><Save size={15} />保存配置</button></form></div></div> }
