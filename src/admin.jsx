import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, CalendarDays, Check, ChevronRight, FileText, Globe2, Landmark, Link2, LogOut, MapPinned, Plus, Save, Settings, Smartphone, Trash2, Users } from 'lucide-react'
import { assetPath } from './chrome'

const ADMIN_KEY = 'sy-greece-admin-data'
const TOKEN_KEY = 'sy-greece-admin-token'
const emptyRoute = { days: '', kicker: '', title: '', tags: '', desc: '', image: 'santorini.webp', status: 'published' }
const emptyDestination = { name: '', en: '', type: 'culture', image: 'santorini.webp', status: 'published' }
const emptyAttraction = { name: '', en: '', originalName: '', city: 'athens', cityName: '雅典', type: 'landmark', category: '', sizeLabel: '', tags: '', image: 'athens.webp', summary: '', status: 'published' }
const emptyItinerary = { title: '', days: 3, cover: 'santorini.webp', summary: '', status: 'published', itinerary: [] }
const emptyCustomTrip = { client: '', title: '希腊定制旅程', period: '', orderNo: '', travelers: '', language: '中文普通话 / 英语', vehicle: '欧 6 标准及以上七座奔驰商务车', guide: '希腊文旅金牌司导 / 欧美澳高等教育 / 欧盟 + 美国 + 中国驾照', totalFee: '', status: 'active', days: [], notices: [] }

function localSeed() {
  try { return JSON.parse(localStorage.getItem(ADMIN_KEY)) } catch { return null }
}
function saveLocal(data) { localStorage.setItem(ADMIN_KEY, JSON.stringify(data)) }
function localId(prefix) { return `${prefix}-${Date.now().toString(36)}` }
function isGuideBooking(lead) { return lead.leadType === 'guide-booking' || Boolean(lead.guideSlug) }
function isMiniProgramBooking(lead) { return ['miniprogram', 'wechat-miniprogram'].includes(lead.platform) || ['miniprogram', 'wechat-miniprogram'].includes(lead.source) || lead.leadType === 'mini-program-booking' }
function leadTypeLabel(type) { return ({ customization: '行程咨询', 'guide-booking': '古迹讲解预约', 'vehicle-consultation': '用车咨询', 'knowledge-base': '知识库咨询', 'business-travel': '商旅咨询', 'mini-program-booking': '小程序预约' })[type] || type || '行程咨询' }

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
    } catch (requestError) { setError(requestError.message === 'Failed to fetch' ? '管理服务尚未启动，请运行 npm run start' : requestError.message) }
  }
  return <main className="admin-login"><div className="admin-login-card"><div className="admin-mark"><span>SY</span><small>GREECE ADMIN</small></div><h1>网站管理后台</h1><p>管理路线、目的地、线索和站点配置</p><form onSubmit={submit}><label>管理员密码<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入管理密码" autoFocus /></label><button className="admin-primary" type="submit">进入后台 <ChevronRight size={16} /></button>{error && <div className="admin-error">{error}</div>}</form></div></main>
}

function StatCard({ icon: Icon, label, value, tone = '' }) { return <div className={`admin-stat ${tone}`}><Icon /><span>{label}</span><strong>{value}</strong></div> }
const publicationStatusOptions = [{ value: 'published', label: '已发布' }, { value: 'draft', label: '草稿' }, { value: 'archived', label: '归档' }]
const customTripStatusOptions = [{ value: 'active', label: '生效中' }, { value: 'archived', label: '已停用' }]
const couponStatusOptions = [{ value: 'active', label: '有效' }, { value: 'used', label: '已使用' }, { value: 'expired', label: '已过期' }]
const visaStatusOptions = [{ value: '', label: '未设置' }, { value: '待办理', label: '待办理' }, { value: '办理中', label: '办理中' }, { value: '已出签', label: '已出签' }, { value: '已拒签', label: '已拒签' }]
function StatusSelect({ value, options, onChange }) { const choices = options.some((option) => option.value === value) ? options : [...options, { value, label: value || '未设置' }]; return <select className={`status-select ${value || 'unset'}`} value={value || ''} onChange={(event) => onChange(event.target.value)} aria-label="修改状态">{choices.map((option) => <option value={option.value} key={option.value || 'unset'}>{option.label}</option>)}</select> }
function AdminEditorPage({ title, children, onClose }) {
  return <div className="admin-editor-page"><div className="admin-editor-head"><button type="button" className="admin-editor-back" onClick={onClose}><ArrowLeft size={16} />返回列表</button><div><span className="admin-eyebrow">EDIT CONTENT / 独立编辑</span><h2>{title}</h2><p>在独立编辑页面完成内容、图片与日期设置，保存后即可生效。</p></div></div><div className="admin-editor-card">{children}</div></div>
}

function ImageUploadField({ label, value, onChange, onUpload, required = false, hint = '支持 PNG、JPG、WebP，单张不超过 6MB' }) {
  const [uploading, setUploading] = useState(false)
  async function handleChange(event) {
    const file = event.target.files?.[0]
    if (!file || !onUpload) return
    setUploading(true)
    try {
      const next = await onUpload(file)
      if (next) onChange(next)
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }
  return <label className="admin-image-field"><span>{label}</span>{value ? <div className="admin-image-preview"><img src={assetPath(value)} alt={label + '预览'} /><span>当前图片</span></div> : <div className="admin-image-empty">尚未选择图片</div>}<span className="admin-file-picker"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} required={required && !value} /><strong>{uploading ? '上传中…' : value ? '重新选择图片' : '选择图片上传'}</strong></span><small>{hint}</small></label>
}

function DateField({ label, value, onChange, required = false, min, hint = '' }) {
  return <label className="admin-date-field"><span>{label}</span><input type="date" value={value || ''} min={min || undefined} required={required} onChange={(event) => onChange(event.target.value)} />{hint && <small>{hint}</small>}</label>
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
  const [sampleItineraries, setSampleItineraries] = useState([])
  const [customTrips, setCustomTrips] = useState([])
  const [leads, setLeads] = useState([])
  const [guideBookings, setGuideBookings] = useState([])
  const [miniProgramBookings, setMiniProgramBookings] = useState([])
  const [miniProgramUsers, setMiniProgramUsers] = useState([])
  const [miniProgramTravelers, setMiniProgramTravelers] = useState([])
  const [miniProgramDocuments, setMiniProgramDocuments] = useState([])
  const [miniProgramCoupons, setMiniProgramCoupons] = useState([])
  const [settings, setSettings] = useState({ siteName: '', siteUrl: '', defaultTitle: '', defaultDescription: '', keywords: '', ogImage: '', googleVerification: '', robotsPolicy: 'index,follow', wechat: '', phone: '', email: '', replyHours: '' })
  const [routeForm, setRouteForm] = useState(emptyRoute)
  const [destinationForm, setDestinationForm] = useState(emptyDestination)
  const [attractionForm, setAttractionForm] = useState(emptyAttraction)
  const [itineraryForm, setItineraryForm] = useState(emptyItinerary)
  const [customTripForm, setCustomTripForm] = useState(emptyCustomTrip)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState('')

  const localMode = offline
  const localData = useMemo(() => localSeed() || { routes: [], destinations: [], leads: [], settings }, [settings])
  function notify(message) { setToast(message); window.setTimeout(() => setToast(''), 2500) }
  function applyData(data) { const nextLeads = data.leads || []; const nextGuideBookings = data.guideBookings || nextLeads.filter(isGuideBooking); const nextMiniProgramBookings = data.miniProgramBookings || nextLeads.filter(isMiniProgramBooking); setRoutes(data.routes || []); setDestinations(data.destinations || []); setAttractions(data.attractions || []); setSampleItineraries(data.sampleItineraries || []); setCustomTrips(data.customTrips || []); setLeads(nextLeads); setGuideBookings(nextGuideBookings); setMiniProgramBookings(nextMiniProgramBookings); setSettings(data.settings || settings); setStats({ routes: (data.routes || []).length, destinations: (data.destinations || []).length, leads: nextLeads.length, pendingLeads: nextLeads.filter((lead) => lead.status === 'new').length, customizationLeads: nextLeads.filter((lead) => lead.leadType === 'customization').length, guideBookings: nextGuideBookings.length, pendingGuideBookings: nextGuideBookings.filter((lead) => lead.status === 'new').length, miniProgramBookings: nextMiniProgramBookings.length, vehicleConsultations: nextLeads.filter((lead) => lead.leadType === 'vehicle-consultation').length, knowledgeBaseLeads: nextLeads.filter((lead) => lead.leadType === 'knowledge-base').length, businessTravelLeads: nextLeads.filter((lead) => lead.leadType === 'business-travel').length, attractions: (data.attractions || []).length, sampleItineraries: (data.sampleItineraries || []).length, customTrips: (data.customTrips || []).length }) }
  async function load() {
    if (localMode) return applyData(localData)
    try {
      const auth = { Authorization: `Bearer ${token}` }
      const results = await Promise.allSettled(['/admin/stats', '/admin/routes', '/admin/destinations', '/admin/attractions', '/admin/sampleItineraries', '/admin/customTrips', '/admin/leads', '/admin/guide-bookings', '/admin/miniprogram-bookings', '/admin/settings', '/admin/miniprogram-users', '/admin/miniprogram-travelers', '/admin/miniprogram-documents', '/admin/miniprogram-coupons'].map((path) => callApi(path, { headers: auth })))
      const unauthorized = results.find((result) => result.status === 'rejected' && result.reason?.message?.includes('未授权'))
      if (unauthorized) { sessionStorage.removeItem(TOKEN_KEY); setToken(null); setOffline(false); return }
      const [nextStats, nextRoutes, nextDestinations, nextAttractions, nextSampleItineraries, nextCustomTrips, nextLeads, nextGuideBookings, nextMiniProgramBookings, nextSettings, nextMiniProgramUsers, nextMiniProgramTravelers, nextMiniProgramDocuments, nextMiniProgramCoupons] = results.map((result) => result.status === 'fulfilled' ? result.value : null)
      if (nextStats) setStats(nextStats)
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
    try {
      if (localMode) localUpdate('destinations', (items) => isEdit ? items.map((item) => item.id === editing ? { ...destinationForm, id: editing } : item) : [...items, { ...destinationForm, id: localId('destination') }])
      else await callApi(isEdit ? `/admin/destinations/${editing}` : '/admin/destinations', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(destinationForm) })
      await load(); setEditing(null); setDestinationForm(emptyDestination); notify('目的地已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveAttraction(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...attractionForm, tags: String(attractionForm.tags || '').split(/[,，、\s]+/).filter(Boolean) }
    try {
      if (localMode) localUpdate('attractions', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing } : item) : [...items, { ...payload, id: localId('attraction') }])
      else await callApi(isEdit ? `/admin/attractions/${editing}` : '/admin/attractions', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setAttractionForm(emptyAttraction); notify('景点已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveItinerary(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...itineraryForm, days: Number(itineraryForm.days) || 1 }
    try {
      if (localMode) localUpdate('sampleItineraries', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing } : item) : [...items, { ...payload, id: localId('sample') }])
      else await callApi(isEdit ? `/admin/sampleItineraries/${editing}` : '/admin/sampleItineraries', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setItineraryForm(emptyItinerary); notify('参考行程已保存')
    } catch (error) { notify(error.message) }
  }
  async function saveCustomTrip(e) {
    e.preventDefault()
    const isEdit = editing && editing !== 'new'
    const payload = { ...customTripForm, days: typeof customTripForm.days === 'string' ? [] : customTripForm.days, notices: typeof customTripForm.notices === 'string' ? [] : customTripForm.notices }
    try {
      let saved
      if (localMode) { localUpdate('customTrips', (items) => isEdit ? items.map((item) => item.id === editing ? { ...payload, id: editing, token: item.token } : item) : [...items, { ...payload, id: localId('trip'), token: localId('t') }]); saved = null }
      else saved = await callApi(isEdit ? `/admin/customTrips/${editing}` : '/admin/customTrips', { method: isEdit ? 'PATCH' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      await load(); setEditing(null); setCustomTripForm(emptyCustomTrip); notify(saved?.token ? `定制行程已保存，分享链接 /trip/${saved.token}` : '定制行程已保存')
    } catch (error) { notify(error.message) }
  }
  async function remove(collection, itemId) {
    if (!window.confirm('确定删除这条内容吗？')) return
    try { if (localMode) localUpdate(collection, (items) => items.filter((item) => item.id !== itemId)); else await callApi(`/admin/${collection}/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await load(); notify('已删除') } catch (error) { notify(error.message) }
  }
  async function updateLead(leadId, status) {
    try { if (localMode) localUpdate('leads', (items) => items.map((item) => item.id === leadId ? { ...item, status } : item)); else await callApi(`/admin/leads/${leadId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) }); await load(); notify('线索状态已更新') } catch (error) { notify(error.message) }
  }
  async function updateCollectionStatus(collection, itemId, status) {
    try {
      if (localMode) localUpdate(collection, (items) => items.map((item) => item.id === itemId ? { ...item, status } : item))
      else await callApi(`/admin/${collection}/${itemId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ status }) })
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
  async function removeMiniRecord(collection, itemId) {
    if (!window.confirm('确定删除这条小程序资料吗？')) return
    try { await callApi(`/admin/miniprogram-${collection}/${itemId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await load(); notify('小程序资料已删除') } catch (error) { notify(error.message) }
  }
  if (!token) return <AdminLogin onLogin={login} />
  const menu = [['overview', BarChart3, '总览'], ['routes', FileText, '路线管理'], ['destinations', MapPinned, '目的地'], ['attractions', Landmark, '景点管理'], ['sampleItineraries', MapPinned, '参考行程'], ['customTrips', Link2, '定制行程'], ['leads', Users, '咨询 CRM'], ['guideBookings', CalendarDays, '导游预约'], ['miniProgramBookings', Smartphone, '小程序预约'], ['miniprogramUsers', Users, '小程序用户'], ['miniprogramTrips', MapPinned, '小程序行程'], ['miniprogramTravelers', Users, '出行人资料'], ['miniprogramDocuments', FileText, '签证资料'], ['miniprogramCoupons', CalendarDays, '优惠券'], ['settings', Settings, '站点配置']]
  const menuGroups = [['共同数据', ['overview', 'leads', 'guideBookings']], ['网站管理', ['routes', 'destinations', 'attractions', 'sampleItineraries', 'customTrips', 'settings']], ['小程序管理', ['miniProgramBookings', 'miniprogramUsers', 'miniprogramTrips', 'miniprogramTravelers', 'miniprogramDocuments', 'miniprogramCoupons']]]
  return <main className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span>SY</span><div><strong>希腊蔚蓝海岸</strong><small>CONTENT ADMIN</small></div></div><nav>{menuGroups.map(([group, keys]) => <div className="admin-nav-group" key={group}><span className="admin-nav-group-label">{group}</span>{keys.map((key) => { const item = menu.find((entry) => entry[0] === key); const [menuKey, Icon, label] = item; return <button key={menuKey} className={tab === menuKey ? 'active' : ''} onClick={() => { setEditing(null); setTab(menuKey) }}><Icon size={17} />{label}</button> })}</div>)}</nav><div className="admin-sidebar-foot"><span className={localMode ? 'offline-dot' : ''}>{localMode ? '本地演示模式' : 'API 已连接'}</span><button onClick={logout}><LogOut size={15} />退出</button></div></aside><section className="admin-main"><header className="admin-topbar"><div><span className="admin-eyebrow">SY GREECE / ADMIN</span><h1>{menu.find((item) => item[0] === tab)?.[2]}</h1></div><a href="/#/" className="admin-view-site"><Globe2 size={16} />查看前台</a></header>{toast && <div className="admin-toast"><Check size={15} />{toast}</div>}{tab === 'overview' && <Overview stats={stats} onTab={setTab} leads={leads} />}{tab === 'routes' && <CollectionPanel title="甄选路线" items={routes} type="routes" editing={editing} setEditing={setEditing} form={routeForm} setForm={setRouteForm} onSubmit={saveRoute} onDelete={remove} onAdd={() => { setEditing('new'); setRouteForm(emptyRoute) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} />}{tab === 'destinations' && <CollectionPanel title="精选目的地" items={destinations} type="destinations" editing={editing} setEditing={setEditing} form={destinationForm} setForm={setDestinationForm} onSubmit={saveDestination} onDelete={remove} onAdd={() => { setEditing('new'); setDestinationForm(emptyDestination) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} destination />}{tab === 'attractions' && <AttractionsPanel attractions={attractions} editing={editing} setEditing={setEditing} form={attractionForm} setForm={setAttractionForm} onSubmit={saveAttraction} onDelete={remove} onAdd={() => { setEditing('new'); setAttractionForm(emptyAttraction) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} />}{tab === 'sampleItineraries' && <SampleItinerariesPanel itineraries={sampleItineraries} editing={editing} setEditing={setEditing} form={itineraryForm} setForm={setItineraryForm} onSubmit={saveItinerary} onDelete={remove} onAdd={() => { setEditing('new'); setItineraryForm(emptyItinerary) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} />}{tab === 'customTrips' && <CustomTripsPanel trips={customTrips} editing={editing} setEditing={setEditing} form={customTripForm} setForm={setCustomTripForm} onSubmit={saveCustomTrip} onDelete={remove} onAdd={() => { setEditing('new'); setCustomTripForm(emptyCustomTrip) }} onUpload={uploadImage} onStatusChange={updateCollectionStatus} />}{tab === 'leads' && <LeadPanel leads={leads} onUpdate={updateLead} />}{tab === 'guideBookings' && <BookingPanel title="导游预约" eyebrow="RICHARD LI / GUIDE BOOKINGS" items={guideBookings} onUpdate={updateLead} guide />}{tab === 'miniProgramBookings' && <BookingPanel title="小程序预约" eyebrow="MINIPROGRAM BOOKINGS" items={miniProgramBookings} onUpdate={updateLead} />}{tab === 'miniprogramUsers' && <MiniProgramUsersPanel items={miniProgramUsers} />}{tab === 'miniprogramTrips' && <MiniProgramTripPanel leads={leads} onUpdate={updateLead} />}{tab === 'miniprogramTravelers' && <MiniRecordPanel title="小程序出行人" kind="travelers" items={miniProgramTravelers} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} />}{tab === 'miniprogramDocuments' && <MiniRecordPanel title="小程序签证资料" kind="documents" items={miniProgramDocuments} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} />}{tab === 'miniprogramCoupons' && <MiniRecordPanel title="小程序优惠券" kind="coupons" items={miniProgramCoupons} users={miniProgramUsers} onSave={saveMiniRecord} onDelete={removeMiniRecord} />}{tab === 'settings' && <SettingsPanel settings={settings} setSettings={setSettings} onSubmit={saveSettings} onUpload={uploadOgImage} />}</section></main>
}

function Overview({ stats, onTab, leads }) { return <div className="admin-content"><div className="admin-stat-grid"><StatCard icon={FileText} label="已发布路线" value={stats.routes} /><StatCard icon={MapPinned} label="目的地" value={stats.destinations} tone="gold" /><StatCard icon={Users} label="全部线索" value={stats.leads} tone="green" /><StatCard icon={BarChart3} label="待处理" value={stats.pendingLeads} tone="coral" /><StatCard icon={CalendarDays} label="导游预约" value={stats.guideBookings} tone="gold" /><StatCard icon={Smartphone} label="小程序预约" value={stats.miniProgramBookings} tone="green" /><StatCard icon={Users} label="商旅咨询" value={stats.businessTravelLeads} tone="gold" /></div><div className="admin-overview-grid"><div className="admin-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONTENT FLOW</span><h2>内容工作台</h2></div><button onClick={() => onTab('routes')}>管理内容 <ChevronRight size={15} /></button></div><div className="flow-list"><div><span className="flow-icon blue"><FileText size={17} /></span><span><strong>甄选路线</strong><small>维护首页主题路线与卖点文案</small></span><b>{stats.routes}</b></div><div><span className="flow-icon gold"><MapPinned size={17} /></span><span><strong>精选目的地</strong><small>维护目的地卡片和中英文名称</small></span><b>{stats.destinations}</b></div><div><span className="flow-icon green"><Users size={17} /></span><span><strong>行程咨询</strong><small>跟进用户提交的规划需求</small></span><b>{stats.pendingLeads} 待处理</b></div><div><span className="flow-icon gold"><CalendarDays size={17} /></span><span><strong>导游预约</strong><small>Richard 日期、时长与报价跟进</small></span><b>{stats.pendingGuideBookings} 待处理</b></div></div></div><div className="admin-panel admin-lead-preview"><div className="admin-panel-head"><div><span className="admin-eyebrow">LATEST LEADS</span><h2>最近线索</h2></div><button onClick={() => onTab('leads')}>查看全部 <ChevronRight size={15} /></button></div>{leads.length ? leads.slice(-4).reverse().map((lead) => <div className="mini-lead" key={lead.id}><span>{lead.destination || '希腊定制'}</span><strong>{lead.contact}</strong><small>{lead.status === 'new' ? '待处理' : lead.status}</small></div>) : <div className="admin-empty">还没有新线索。前台提交后会实时出现在这里。</div>}</div></div></div> }

function CollectionPanel({ title, items, type, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange, destination }) { const modalTitle = editing === 'new' ? `新增${destination ? '目的地' : '路线'}` : `编辑${destination ? '目的地' : '路线'}`; return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{destination ? 'DESTINATION LIBRARY' : 'CURATED PACKAGES'}</span><h2>{title}</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增{destination ? '目的地' : '路线'}</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>名称</th><th>{destination ? '分类' : '天数 / 标签'}</th><th>状态</th><th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={assetPath(item.image)} alt="" loading="lazy" decoding="async" />}<span><strong>{destination ? item.name : item.title}</strong><small>{destination ? item.en : item.kicker}</small></span></div></td><td>{destination ? (item.type === 'island' ? '海岛度假' : '文明溯源') : `${item.days} · ${item.tags}`}</td><td><StatusSelect value={item.status} options={publicationStatusOptions} onChange={(status) => onStatusChange(type, item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); destination ? setForm(item) : setForm(item) }}>编辑</button><button className="danger" onClick={() => onDelete(type, item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无内容，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={modalTitle} onClose={() => { setEditing(null); setForm(destination ? emptyDestination : emptyRoute) }}><form className="admin-form" onSubmit={onSubmit}>{destination ? <><label>中文名称<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>英文名称<input required value={form.en} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label><label>分类<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="culture">文明溯源</option><option value="island">海岛度假</option></select></label><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, destination ? 'destination' : 'route')} required /></> : <><div className="admin-form-grid"><label>天数<input required value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label><label>路线副标题<input required value={form.kicker} onChange={(e) => setForm({ ...form, kicker: e.target.value })} /></label></div><label>路线名称<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>人群标签<input required value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label><label>行程简介<textarea required rows="3" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} /></label><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'route')} required /></>}<label>发布状态<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">归档</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div> }

function LeadPanel({ leads, onUpdate }) { return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CONSULTATION CRM</span><h2>咨询 CRM</h2></div><span className="admin-muted">共 {leads.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>目的地 / 主题</th><th>出行计划</th><th>联系方式</th><th>状态</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id}><td>{new Date(lead.createdAt).toLocaleString('zh-CN')}</td><td><strong>{lead.destination || '—'}</strong><small>{leadTypeLabel(lead.leadType)} · {lead.themes?.join(' · ') || '未填写主题'}</small></td><td>{lead.businessPeriod || lead.bookingDate || lead.travelDate || lead.travelMonth || '—'}<small>{lead.companionDuration || lead.serviceLength || lead.duration || ''} · {lead.travelers || ''}</small></td><td>{lead.contact}</td><td><select className={`lead-status ${lead.status}`} value={lead.status} onChange={(e) => onUpdate(lead.id, e.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></td></tr>)}</tbody></table>{!leads.length && <div className="admin-empty">暂无咨询记录。前台提交后，记录会自动进入这里。</div>}</div></div></div> }
function BookingPanel({ title, eyebrow, items, onUpdate, guide = false }) {
  const statusLabels = { new: '待处理', contacted: '已联系', quoted: '已报价', closed: '已完成' }
  function dateLabel(value) { return value ? new Date(value).toLocaleString('zh-CN') : '—' }
  return <div className="admin-content"><div className="admin-panel collection-panel booking-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">{eyebrow}</span><h2>{title}</h2></div><span className="admin-muted">共 {items.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table booking-table"><thead><tr>{guide ? <><th>预约日期</th><th>服务 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源 / 提交时间</th></> : <><th>提交时间</th><th>预约内容</th><th>日期 / 时长 / 人数</th><th>路线 / 需求</th><th>联系方式</th><th>来源</th></>}<th>状态</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{guide ? <><td><strong>{item.bookingDate || item.travelMonth || '—'}</strong><small>{item.status === 'new' ? '待确认时间' : statusLabels[item.status] || item.status}</small></td><td>{item.serviceLength || item.duration || '—'}<small>{item.travelers || '—'}</small></td><td><strong>{item.requirements || item.route || '—'}</strong><small>{item.destination || 'Richard 李'}</small></td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'website'}<small>{dateLabel(item.createdAt)}</small></td></> : <><td>{dateLabel(item.createdAt)}</td><td><strong>{item.destination || item.title || '小程序预约'}</strong><small>{item.leadType || 'mini-program-booking'}</small></td><td>{item.bookingDate || item.travelMonth || '—'}<small>{item.serviceLength || item.duration || '—'} · {item.travelers || '—'}</small></td><td>{item.requirements || item.route || '—'}</td><td>{item.contact || '—'}</td><td>{item.platform || item.source || 'miniprogram'}</td></>}<td><select className={`lead-status ${item.status}`} value={item.status || 'new'} onChange={(event) => onUpdate(item.id, event.target.value)}><option value="new">{statusLabels.new}</option><option value="contacted">{statusLabels.contacted}</option><option value="quoted">{statusLabels.quoted}</option><option value="closed">{statusLabels.closed}</option></select></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无预约记录。新的预约提交后会自动出现在这里。</div>}</div></div></div>
}

function MiniProgramUsersPanel({ items }) { return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM USERS / PROFILE</span><h2>小程序用户</h2></div><span className="admin-muted">共 {items.length} 位</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>手机号</th><th>预约</th><th>行程</th><th>资料</th><th>优惠券</th><th>创建时间</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="table-title">{item.avatarUrl && <img src={item.avatarUrl} alt="" loading="lazy" decoding="async" />}<span><strong>{item.nickname || item.id}</strong><small>{item.id}</small></span></div></td><td>{item.phoneMasked || '未绑定'}</td><td>{item.stats?.appointments || 0}</td><td>{item.stats?.trips || 0}</td><td>{item.stats?.profiles || 0}</td><td>{item.stats?.coupons || 0}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN') : '—'}</td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无小程序用户。</div>}</div></div></div> }

function MiniProgramTripPanel({ leads, onUpdate }) { const items = leads.filter((lead) => isMiniProgramBooking(lead) && ['customization', 'business-travel'].includes(lead.leadType)); return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM TRIPS</span><h2>小程序行程</h2></div><span className="admin-muted">共 {items.length} 条</span></div><div className="admin-table-wrap"><table className="admin-table leads-table"><thead><tr><th>提交时间</th><th>用户</th><th>主题</th><th>日期 / 人数</th><th>联系方式</th><th>状态</th></tr></thead><tbody>{items.map((lead) => <tr key={lead.id}><td>{lead.createdAt ? new Date(lead.createdAt).toLocaleString('zh-CN') : '—'}</td><td>{lead.userId || '—'}</td><td><strong>{lead.destination || '—'}</strong><small>{leadTypeLabel(lead.leadType)}</small></td><td>{lead.businessPeriod || lead.travelDate || lead.travelMonth || '—'}<small>{lead.travelers || ''}</small></td><td>{lead.contact || '—'}</td><td><select className={`lead-status ${lead.status}`} value={lead.status || 'new'} onChange={(e) => onUpdate(lead.id, e.target.value)}><option value="new">待处理</option><option value="contacted">已联系</option><option value="quoted">已报价</option><option value="closed">已完成</option></select></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无小程序行程。</div>}</div></div></div> }

function MiniRecordPanel({ title, kind, items, users, onSave, onDelete }) {
  const [editing, setEditing] = useState(null); const [form, setForm] = useState({})
  const isTraveler = kind === 'travelers'; const isDocument = kind === 'documents'; const isCoupon = kind === 'coupons'
  function openNew() { setEditing('new'); setForm({ userId: users[0]?.id || '', ...(isTraveler ? { name: '', relation: '', passportNo: '' } : isDocument ? { name: '', passportNo: '', expiry: '', visaStatus: '' } : { title: '', description: '', code: '', expiresAt: '', status: 'active' }) }) }
  function openEdit(item) { setEditing(item.id); setForm({ ...item }) }
  function submit(event) { event.preventDefault(); onSave(kind, editing === 'new' ? null : editing, form); setEditing(null) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">MINIPROGRAM / {kind.toUpperCase()}</span><h2>{title}</h2></div><div className="admin-panel-head-actions"><span className="admin-muted">共 {items.length} 条</span><button className="admin-primary small" onClick={openNew}>新增</button></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr>{isTraveler ? <><th>用户</th><th>姓名</th><th>关系</th><th>护照号</th></> : isDocument ? <><th>用户</th><th>资料名称</th><th>护照号</th><th>有效期</th><th>签证状态</th></> : <><th>用户</th><th>优惠券</th><th>代码</th><th>有效期</th><th>状态</th></>}<th>操作</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{isTraveler ? <><td>{item.userNickname || item.userId}</td><td>{item.name}</td><td>{item.relation || '—'}</td><td>{item.passportNo || '—'}</td></> : isDocument ? <><td>{item.userNickname || item.userId}</td><td>{item.name}</td><td>{item.passportNo || '—'}</td><td>{item.expiry || '—'}</td><td><StatusSelect value={item.visaStatus} options={visaStatusOptions} onChange={(status) => onSave(kind, item.id, { visaStatus: status })} /></td></> : <><td>{item.userNickname || item.userId}</td><td>{item.title}</td><td>{item.code || '—'}</td><td>{item.expiresAt || '—'}</td><td><StatusSelect value={item.status} options={couponStatusOptions} onChange={(status) => onSave(kind, item.id, { status })} /></td></>}<td><div className="table-actions"><button onClick={() => openEdit(item)}>编辑</button><button className="danger" onClick={() => onDelete(kind, item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!items.length && <div className="admin-empty">暂无资料记录。</div>}</div></div>{editing && <AdminEditorPage title={`${editing === 'new' ? '新增' : '编辑'}${title}`} onClose={() => setEditing(null)}><form className="admin-form" onSubmit={submit}><label>所属用户<select required disabled={editing !== 'new'} value={form.userId || ''} onChange={(e) => setForm({ ...form, userId: e.target.value })}><option value="">请选择用户</option>{users.map((user) => <option value={user.id} key={user.id}>{user.nickname || user.id}</option>)}</select></label>{isTraveler && <><label>姓名<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>关系<input value={form.relation || ''} onChange={(e) => setForm({ ...form, relation: e.target.value })} /></label><label>护照号<input value={form.passportNo || ''} onChange={(e) => setForm({ ...form, passportNo: e.target.value })} /></label></>}{isDocument && <><label>资料名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>护照号<input value={form.passportNo || ''} onChange={(e) => setForm({ ...form, passportNo: e.target.value })} /></label><DateField label="有效期" value={form.expiry} onChange={(expiry) => setForm({ ...form, expiry })} /><label>签证状态<input value={form.visaStatus || ''} onChange={(e) => setForm({ ...form, visaStatus: e.target.value })} /></label></>}{isCoupon && <><label>优惠券名称<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>说明<textarea rows="3" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label>优惠码<input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label><DateField label="有效期" value={form.expiresAt} onChange={(expiresAt) => setForm({ ...form, expiresAt })} /><label>状态<select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">有效</option><option value="used">已使用</option><option value="expired">已过期</option></select></label></>}<button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function SettingsPanel({ settings, setSettings, onSubmit, onUpload }) { const update = (key, value) => setSettings({ ...settings, [key]: value }); const imageUrl = settings.ogImage?.startsWith('data:') ? settings.ogImage : `/${String(settings.ogImage || '').replace(/^\//, '')}`; return <div className="admin-content"><div className="admin-panel settings-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SITE SETTINGS / SEO</span><h2>站点与 SEO 配置</h2></div></div><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>站点名称<input name="siteName" value={settings.siteName} onChange={(e) => update('siteName', e.target.value)} /></label><label>站点正式网址<input name="siteUrl" type="url" placeholder="https://sy-greece.com" value={settings.siteUrl} onChange={(e) => update('siteUrl', e.target.value)} /></label><label>默认页面标题<input name="defaultTitle" value={settings.defaultTitle} onChange={(e) => update('defaultTitle', e.target.value)} /></label><label className="og-image-field">OG 分享图片{settings.ogImage && <img src={imageUrl} alt="当前 OG 分享图片" />}<input name="ogImageFile" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => onUpload(e.target.files?.[0])} /><small>{settings.ogImage ? '已上传，可重新选择图片替换' : '请选择要上传的分享图片'}</small></label></div><label>默认 SEO 描述<textarea name="defaultDescription" rows="3" value={settings.defaultDescription} onChange={(e) => update('defaultDescription', e.target.value)} /></label><label>关键词（用逗号分隔）<input name="keywords" value={settings.keywords} onChange={(e) => update('keywords', e.target.value)} /></label><div className="admin-form-grid"><label>Google Search Console 验证码<input name="googleVerification" placeholder="粘贴 meta 验证码内容" value={settings.googleVerification} onChange={(e) => update('googleVerification', e.target.value)} /></label><label>Robots 策略<select name="robotsPolicy" value={settings.robotsPolicy} onChange={(e) => update('robotsPolicy', e.target.value)}><option value="index,follow">允许收录（index, follow）</option><option value="noindex,nofollow">暂不收录（noindex, nofollow）</option></select></label></div><div className="admin-form-grid"><label>微信号<input name="wechat" value={settings.wechat} onChange={(e) => update('wechat', e.target.value)} /></label><label>联系电话<input name="phone" value={settings.phone} onChange={(e) => update('phone', e.target.value)} /></label><label>邮箱<input name="email" type="email" value={settings.email} onChange={(e) => update('email', e.target.value)} /></label><label>回复承诺<input name="replyHours" value={settings.replyHours} onChange={(e) => update('replyHours', e.target.value)} /></label></div><button className="admin-primary" type="submit"><Save size={15} />保存配置</button></form></div></div> }

function AttractionsPanel({ attractions, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) {
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">ATTRACTIONS & MUSEUMS</span><h2>景点管理</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增景点</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>景点</th><th>城市 / 类型</th><th>状态</th><th>操作</th></tr></thead><tbody>{attractions.map((item) => <tr key={item.id}><td><div className="table-title">{item.image && <img src={assetPath(item.image)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.name}</strong><small>{item.originalName || item.en}</small></span></div></td><td>{item.cityName}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}<small>{item.type === 'museum' ? '博物馆' : '景点'} · {(item.exhibits || []).length} 讲解点</small></td><td><StatusSelect value={item.status} options={publicationStatusOptions} onChange={(status) => onStatusChange('attractions', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyAttraction, ...item, tags: (item.tags || []).join('、') }) }}>编辑</button><button className="danger" onClick={() => onDelete('attractions', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!attractions.length && <div className="admin-empty">暂无景点，点击右上角新增。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增景点' : '编辑景点'} onClose={() => { setEditing(null); setForm(emptyAttraction) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>中文名称<input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>英文名称<input required value={form.en || ''} onChange={(e) => setForm({ ...form, en: e.target.value })} /></label></div><label>希腊语原名<input value={form.originalName || ''} onChange={(e) => setForm({ ...form, originalName: e.target.value })} /></label><div className="admin-form-grid"><label>所属城市<select value={form.city || 'athens'} onChange={(e) => setForm({ ...form, city: e.target.value, cityName: e.target.selectedOptions[0]?.dataset.name || '' })}><option value="athens" data-name="雅典">雅典</option><option value="santorini" data-name="圣托里尼">圣托里尼</option><option value="delphi" data-name="德尔斐">德尔斐</option><option value="meteora" data-name="梅黛奥拉">梅黛奥拉</option><option value="crete" data-name="克里特">克里特</option><option value="nafplio" data-name="纳夫普利翁">纳夫普利翁</option></select></label><label>类型<select value={form.type || 'landmark'} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="landmark">景点</option><option value="museum">博物馆</option></select></label></div><div className="admin-form-grid"><label>分类（如世界文化遗产）<input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label><label>规模标签<select value={form.sizeLabel || ''} onChange={(e) => setForm({ ...form, sizeLabel: e.target.value })}><option value="">无</option><option value="超大型">超大型</option><option value="大型">大型</option><option value="中型">中型</option></select></label></div><label>标签（逗号分隔）<input value={form.tags || ''} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></label><ImageUploadField label="图片" value={form.image} onChange={(image) => setForm({ ...form, image })} onUpload={(file) => onUpload(file, 'attraction')} required /><label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><label>发布状态<select value={form.status || 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">归档</option></select></label><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function SampleItinerariesPanel({ itineraries, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) {
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">SAMPLE ITINERARIES</span><h2>参考行程</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增参考行程</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>行程</th><th>天数</th><th>状态</th><th>操作</th></tr></thead><tbody>{itineraries.map((item) => <tr key={item.id}><td><div className="table-title">{item.cover && <img src={assetPath(item.cover)} alt="" loading="lazy" decoding="async" />}<span><strong>{item.title}</strong><small>{(item.itinerary || []).length} 天数据</small></span></div></td><td>{item.days} 天</td><td><StatusSelect value={item.status} options={publicationStatusOptions} onChange={(status) => onStatusChange('sampleItineraries', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyItinerary, ...item, itinerary: typeof item.itinerary === 'string' ? [] : (item.itinerary || []) }) }}>编辑</button><button className="danger" onClick={() => onDelete('sampleItineraries', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!itineraries.length && <div className="admin-empty">暂无参考行程。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增参考行程' : '编辑参考行程'} onClose={() => { setEditing(null); setForm(emptyItinerary) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>行程名称<input required value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label><label>天数<input required type="number" min="1" value={form.days || 3} onChange={(e) => setForm({ ...form, days: e.target.value })} /></label></div><ImageUploadField label="封面图片" value={form.cover} onChange={(cover) => setForm({ ...form, cover })} onUpload={(file) => onUpload(file, 'itinerary')} required /><label>简介<textarea required rows="3" value={form.summary || ''} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label><label>发布状态<select value={form.status || 'published'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">归档</option></select></label><p className="admin-muted" style={{ marginTop: 10 }}>逐日行程（itinerary）含景点关联等结构化字段请通过数据文件或 API 维护，此处维护基本信息。</p><button className="admin-primary" type="submit"><Save size={15} />保存</button></form></AdminEditorPage>}</div>
}

function CustomTripsPanel({ trips, editing, setEditing, form, setForm, onSubmit, onDelete, onAdd, onUpload, onStatusChange }) { const period = periodParts(form.period); function updatePeriod(key, value) { const next = { ...period, [key]: value }; setForm({ ...form, period: periodValue(next.start, next.end) }) }
  function copyLink(token) { navigator.clipboard?.writeText(`${window.location.origin}/trip/${token}`).then(() => window.alert('分享链接已复制：/trip/' + token)).catch(() => window.alert('分享链接：/trip/' + token)) }
  return <div className="admin-content"><div className="admin-panel collection-panel"><div className="admin-panel-head"><div><span className="admin-eyebrow">CUSTOM TRIPS · PRIVATE LINKS</span><h2>定制行程</h2></div><button className="admin-primary small" onClick={onAdd}><Plus size={15} />新增定制行程</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>客户 / 订单</th><th>日期 / 人数</th><th>分享链接</th><th>状态</th><th>操作</th></tr></thead><tbody>{trips.map((item) => <tr key={item.id}><td><strong>{item.client}</strong><small>{item.orderNo || item.id}</small></td><td>{item.period}<small>{item.travelers}</small></td><td><button className="table-link" onClick={() => copyLink(item.token)}><Link2 size={13} />/trip/{item.token}</button></td><td><StatusSelect value={item.status} options={customTripStatusOptions} onChange={(status) => onStatusChange('customTrips', item.id, status)} /></td><td><div className="table-actions"><button onClick={() => { setEditing(item.id); setForm({ ...emptyCustomTrip, ...item }) }}>编辑</button><button className="danger" onClick={() => onDelete('customTrips', item.id)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table>{!trips.length && <div className="admin-empty">暂无定制行程。新增后会自动生成私密分享链接，发给客户即可打开。</div>}</div></div>{editing && <AdminEditorPage title={editing === 'new' ? '新增定制行程' : '编辑定制行程'} onClose={() => { setEditing(null); setForm(emptyCustomTrip) }}><form className="admin-form" onSubmit={onSubmit}><div className="admin-form-grid"><label>客户称呼<input required value={form.client || ''} onChange={(e) => setForm({ ...form, client: e.target.value })} /></label><label>订单编号<input value={form.orderNo || ''} onChange={(e) => setForm({ ...form, orderNo: e.target.value })} /></label></div><div className="admin-form-grid"><DateField label="开始日期" value={period.start} onChange={(value) => updatePeriod('start', value)} required /><DateField label="结束日期" value={period.end} min={period.start} onChange={(value) => updatePeriod('end', value)} required /></div><label>旅客人数<input value={form.travelers || ''} onChange={(e) => setForm({ ...form, travelers: e.target.value })} /></label><div className="admin-form-grid"><label>语种需求<input value={form.language || ''} onChange={(e) => setForm({ ...form, language: e.target.value })} /></label><label>服务费总额<input value={form.totalFee || ''} onChange={(e) => setForm({ ...form, totalFee: e.target.value })} /></label></div><label>计划车型<input value={form.vehicle || ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></label><label>司导说明<textarea rows="2" value={form.guide || ''} onChange={(e) => setForm({ ...form, guide: e.target.value })} /></label><label>状态<select value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">生效中</option><option value="archived">已停用</option></select></label><p className="admin-muted" style={{ marginTop: 10 }}>逐日行程（days：时段/服务标记/景点关联）与须知（notices 四组）为结构化字段，请通过数据文件或 API 维护；新增保存后将自动生成私密 token 分享链接。</p><button className="admin-primary" type="submit"><Save size={15} />保存{editing === 'new' ? '并生成链接' : ''}</button></form></AdminEditorPage>}</div>
}
