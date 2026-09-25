import http from 'node:http'
import { createAdminSessionToken, verifyAdminSessionToken } from './admin-session.mjs'
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import tls from 'node:tls'
import { closeStorage, initStorage, readData, saveData, storageStatus } from './storage.mjs'
import { audioEntitled, publicHeritage, signedAudioToken, streamPrivateAudio, uploadPrivateAudio, validateAttraction, validateHeritageRecord, verifySignedAudioToken, normalizeVisitorSections, sanitizeRichText, visibleTrack } from './heritage-content.mjs'
import { amountToFen, createMiniProgramPrepay, decryptWechatNotify, queryWechatTransaction, realPayNotifyReady, realPayRequestReady, verifyWechatNotify, wechatPayConfig } from './wechat-pay.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const demoContentPath = resolve(root, 'seed/content-demo.json')
const demoContent = existsSync(demoContentPath) ? JSON.parse(readFileSync(demoContentPath, 'utf8')) : null
const distDir = resolve(root, 'dist')
const port = Number(process.env.PORT || 4173)
const adminPassword = String(process.env.SY_ADMIN_PASSWORD || '')
const miniProgramTokenSecret = process.env.SY_MINIPROGRAM_TOKEN_SECRET || ''
const wechatApiBase = String(process.env.WX_API_BASE_URL || 'https://api.weixin.qq.com').replace(/\/$/, '')
const allowedOrigin = String(process.env.SY_ALLOWED_ORIGIN || '').replace(/\/$/, '')
const notificationRecipient = '19908621956@163.com'
const smtpHost = String(process.env.SY_SMTP_HOST || 'smtp.qq.com')
const smtpPort = Number(process.env.SY_SMTP_PORT || 465)
const smtpUser = String(process.env.SY_SMTP_USER || 'ro_ye@foxmail.com')
const smtpPassword = String(process.env.SY_SMTP_PASSWORD || '')
const adminTokenTtlMs = 8 * 60 * 60 * 1000
const adminSessionSecret = crypto.createHash('sha256')
  .update(`sy-greece-admin-session-v1\0${process.env.SY_ADMIN_SESSION_SECRET || ''}\0${adminPassword}`)
  .digest()
const wechatPay = wechatPayConfig()
let wechatAccessToken = { value: '', expiresAt: 0 }
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' }
const immutableExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2'])
const runtimeImageDir = resolve(root, 'public/images')
const DEFAULT_HOME_EYEBROW = 'GREECE TRAVEL BUTLER · TAILOR-MADE JOURNEYS'
const DEFAULT_HOME_TITLE = '只为一生美好回忆'
const DEFAULT_HOME_DESCRIPTION = '希腊在地人文与行程咨询服务。雅典在地团队，一对一中文顾问，提供文化、行程与语言陪同咨询。'

function writeRuntimeImage(filename, buffer) {
  mkdirSync(runtimeImageDir, { recursive: true })
  writeFileSync(join(runtimeImageDir, filename), buffer)
}
function corsHeaders() { return { ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' } : {}), 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } }
function json(res, status, body) { res.writeHead(status, { ...corsHeaders(), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
function text(res, status, body, contentType) { res.writeHead(status, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=300' }); res.end(body) }
function isGuideBooking(lead) { return lead.leadType === 'guide-booking' || Boolean(lead.guideSlug) }
function isMiniProgramBooking(lead) { return ['miniprogram', 'wechat-miniprogram'].includes(lead.platform) || ['miniprogram', 'wechat-miniprogram'].includes(lead.source) || lead.leadType === 'mini-program-booking' }
function leadsOfType(leads, leadType) { return leadType ? leads.filter((lead) => lead.leadType === leadType) : leads }
function isAdmin(req) {
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return false
  return verifyAdminSessionToken(auth.slice(7), adminSessionSecret, adminTokenTtlMs)
}
function isMiniProgramLead(input) { return ['wechat-miniprogram', 'miniprogram'].includes(input.platform) || ['wechat-miniprogram', 'miniprogram'].includes(input.source) }
function isMiniProgramAccessEnabled(data) { return data.settings?.miniprogramAccess !== false }
function miniProgramAccessPayload(data) {
  const accessEnabled = isMiniProgramAccessEnabled(data)
  return accessEnabled
    ? { accessEnabled: true, title: '正常访问', message: '小程序服务正常。' }
    : { accessEnabled: false, title: '正在升级中', message: '小程序正在升级中，请稍后再试。' }
}
function miniProgramMaintenance(res) { return json(res, 503, { code: 'MINIPROGRAM_MAINTENANCE', error: '小程序正在升级中，请稍后再试。', title: '正在升级中', message: '小程序正在升级中，请稍后再试。' }) }
function miniProgramSimulationEnabled() { return process.env.SY_MINIPROGRAM_SIMULATION_ENABLED === 'true' }
function miniProgramRealPayEnabled() { return process.env.SY_MINIPROGRAM_REAL_PAY_ENABLED === 'true' && realPayRequestReady(wechatPay) }
function miniProgramCommerceEnabled() { return miniProgramSimulationEnabled() || miniProgramRealPayEnabled() }
function miniProgramSimulationDisabled(res) { return json(res, 404, { code: 'MINIPROGRAM_SIMULATION_DISABLED', error: '模拟商品服务未开启' }) }
function miniProgramPaymentUnavailable(res) { return json(res, 503, { code: 'MINIPROGRAM_PAYMENT_NOT_CONFIGURED', error: '微信支付服务尚未配置' }) }
function simulationTokenSecret() { return process.env.SY_MINIPROGRAM_SIMULATION_SECRET || miniProgramTokenSecret }
function normalizeSimulationPhone(value) {
  const raw = String(value || '').trim().replace(/[\s()-]/g, '')
  const phone = raw.startsWith('+') ? raw : (/^1\d{10}$/.test(raw) ? `+86${raw}` : `+${raw}`)
  if (!/^\+\d{7,20}$/.test(phone)) throw new Error('请输入有效测试手机号')
  return phone
}
function simulationPhoneHash(phone) { return crypto.createHmac('sha256', simulationTokenSecret()).update(phone).digest('hex') }
function createSimulationToken(phone) {
  const now = Math.floor(Date.now() / 1000); const phoneHash = simulationPhoneHash(phone); const payload = { sub: `sim-phone-${phoneHash.slice(0, 20)}`, phone, phoneHash, iat: now, exp: now + 24 * 60 * 60 }; const encoded = encodeTokenPart(payload); const signature = crypto.createHmac('sha256', simulationTokenSecret()).update(encoded).digest('base64url'); return `smpv1.${encoded}.${signature}`
}
function verifySimulationToken(token) {
  try {
    const [version, encoded, signature] = String(token || '').split('.'); if (version !== 'smpv1' || !encoded || !signature || !simulationTokenSecret()) return null
    const expected = crypto.createHmac('sha256', simulationTokenSecret()).update(encoded).digest('base64url'); const actualBuffer = Buffer.from(signature); const expectedBuffer = Buffer.from(expected); if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null
    const phone = normalizeSimulationPhone(payload.phone); const phoneHash = simulationPhoneHash(phone); return phoneHash === payload.phoneHash ? { key: `phone-${phoneHash}`, userId: payload.sub, phone, phoneHash } : null
  } catch { return null }
}
function defaultMiniProgramKnowledgeConfig() {
  return {
    trialSeconds: 60,
    products: {
      attraction: { enabled: true, productType: 'attraction', name: '单景点永久讲解（模拟）', price: 0.01, currency: 'CNY' },
      membership: { enabled: true, productType: 'membership', name: '终身会员（模拟）', price: 0.01, currency: 'CNY' },
    },
  }
}
function miniProgramKnowledgeConfig(data) {
  const fallback = defaultMiniProgramKnowledgeConfig()
  const configured = data.settings?.miniprogramKnowledge || {}
  const products = Object.fromEntries(Object.entries(fallback.products).map(([key, product]) => {
    const value = configured.products?.[key] || {}
    return [key, {
      ...product,
      ...value,
      enabled: value.enabled !== false,
      productType: key,
      name: String(value.name || product.name).trim().slice(0, 120),
      price: Number.isFinite(Number(value.price)) && Number(value.price) >= 0 ? Number(value.price) : product.price,
      currency: String(value.currency || product.currency).trim().slice(0, 12),
    }]
  }))
  const trialSeconds = Number(configured.trialSeconds)
  return { trialSeconds: Number.isInteger(trialSeconds) && trialSeconds >= 0 && trialSeconds <= 3600 ? trialSeconds : fallback.trialSeconds, products, simulation: miniProgramSimulationEnabled(), payment: miniProgramRealPayEnabled() ? 'wechat-v3' : null }
}
function simulationUserIdentity(req) {
  if (!miniProgramSimulationEnabled()) return null
  const auth = String(req.headers.authorization || '')
  if (auth.startsWith('Bearer smpv1.')) return verifySimulationToken(auth.slice('Bearer '.length))
  const header = String(req.headers['x-sy-simulation-user'] || '')
  const raw = header || (auth.startsWith('Bearer sim-') ? auth.slice('Bearer '.length) : '')
  const key = raw.replace(/^sim[-_:]/i, '').trim().toLowerCase()
  return /^[a-z0-9][a-z0-9_-]{0,40}$/.test(key) ? { key } : null
}
function simulationState(data) {
  data.miniprogramSimulation = data.miniprogramSimulation || {}
  data.miniprogramSimulation.orders = Array.isArray(data.miniprogramSimulation.orders) ? data.miniprogramSimulation.orders : []
  return data.miniprogramSimulation
}
function publishedAttractionIds(data) { return (data.attractions || []).filter((item) => item.status === 'published').map((item) => item.id) }
function simulationFixtureOrders(data, userKey) {
  const attractionId = publishedAttractionIds(data)[0] || ''
  const config = miniProgramKnowledgeConfig(data)
  if (userKey === 'attraction' && attractionId) return [{ id: `sim-fixture-attraction-${attractionId}`, testUser: userKey, status: 'paid', productType: 'attraction', attractionId, name: config.products.attraction.name, price: config.products.attraction.price, currency: config.products.attraction.currency, createdAt: '2026-01-01T00:00:00.000Z', paidAt: '2026-01-01T00:00:00.000Z' }]
  if (userKey === 'membership') return [{ id: 'sim-fixture-membership', testUser: userKey, status: 'paid', productType: 'membership', attractionId: '', name: config.products.membership.name, price: config.products.membership.price, currency: config.products.membership.currency, createdAt: '2026-01-01T00:00:00.000Z', paidAt: '2026-01-01T00:00:00.000Z' }]
  return []
}
function simulationOrders(data, identity) { return [...(identity.phoneHash ? [] : simulationFixtureOrders(data, identity.key)), ...simulationState(data).orders.filter((order) => identity.phoneHash ? order.phoneHash === identity.phoneHash : order.testUser === identity.key)] }
function publicSimulationOrder(order) {
  const { testUser, phoneHash, verifiedPhone, ...safe } = order
  const phone = verifiedPhone || safe.phone || ''
  return { simulation: true, ...safe, phone, phoneMasked: phone ? maskPhone(phone) : null }
}
function simulationEntitlements(data, identity) {
  const orders = simulationOrders(data, identity)
  const paidOrders = orders.filter((order) => order.status === 'paid')
  const member = paidOrders.some((order) => order.productType === 'membership')
  const unlocked = new Set(member ? publishedAttractionIds(data) : paidOrders.filter((order) => order.productType === 'attraction').map((order) => order.attractionId).filter(Boolean))
  return {
    simulation: true,
    testUser: identity.key,
    user: { id: identity.userId || `sim-${identity.key}`, phoneBound: Boolean(identity.phone), phoneMasked: identity.phone ? maskPhone(identity.phone) : null },
    member,
    memberLabel: member ? '终身会员' : '普通用户',
    purchases: paidOrders.map((order) => ({ orderId: order.id, productType: order.productType, attractionId: order.attractionId || '', status: order.status, purchasedAt: order.paidAt || order.createdAt })),
    unlockedAttractions: [...unlocked],
    favorites: [],
    history: [],
    orders: orders.map(publicSimulationOrder),
  }
}
function paymentOrders(data) {
  data.miniprogramOrders = Array.isArray(data.miniprogramOrders) ? data.miniprogramOrders : []
  return data.miniprogramOrders
}
function publicPaymentOrder(order) {
  const { openid, phoneHash, ...safe } = order
  return { ...safe, phoneMasked: order.phone ? maskPhone(order.phone) : null }
}
function realPaymentOrders(data, user) {
  return paymentOrders(data).filter((order) => order.userId === user.id)
}
function realPaymentEntitlements(data, user) {
  const orders = realPaymentOrders(data, user)
  const paidOrders = orders.filter((order) => order.status === 'paid')
  const member = paidOrders.some((order) => order.productType === 'membership')
  const unlocked = new Set(member ? publishedAttractionIds(data) : paidOrders.filter((order) => order.productType === 'attraction').map((order) => order.attractionId).filter(Boolean))
  return {
    simulation: false,
    payment: 'wechat-v3',
    user: publicMiniProgramUser(user),
    member,
    memberLabel: member ? '终身会员' : '普通用户',
    purchases: paidOrders.map((order) => ({ orderId: order.id, productType: order.productType, attractionId: order.attractionId || '', status: order.status, purchasedAt: order.paidAt || order.createdAt })),
    unlockedAttractions: [...unlocked],
    favorites: [],
    history: [],
    orders: orders.map(publicPaymentOrder)
  }
}
function miniProgramCommerceUser(req, data) {
  if (miniProgramSimulationEnabled()) return null
  return miniProgramUserFromRequest(req, data)
}
function realPaymentProduct(data, productType) {
  const product = miniProgramKnowledgeConfig(data).products[productType]
  if (!product || product.enabled === false) return null
  const amountTotal = amountToFen(product.price)
  if (!amountTotal) return null
  return { ...product, amountTotal, description: String(product.name || '').replace(/[（(]模拟[）)]/g, '').trim().slice(0, 127) || '景点文史知识讲解' }
}
function realPaymentOrderResponse(data, user, order, extra = {}) {
  return { simulation: false, payment: 'wechat-v3', order: publicPaymentOrder(order), entitlements: realPaymentEntitlements(data, user), ...extra }
}
async function refreshRealPaymentOrder(data, order) {
  if (!order || order.status !== 'pending' || !order.outTradeNo) return null
  try {
    const transaction = await queryWechatTransaction(wechatPay, order.outTradeNo)
    order.wechatTradeState = transaction.trade_state
    order.wechatTradeStateDescription = transaction.trade_state_desc || ''
    if (transaction.trade_state === 'SUCCESS') {
      order.status = 'paid'
      order.transactionId = transaction.transaction_id || order.transactionId || ''
      order.paidAt = order.paidAt || transaction.success_time || new Date().toISOString()
    } else if (['CLOSED', 'REVOKED'].includes(transaction.trade_state)) {
      order.status = 'closed'
      order.closedAt = order.closedAt || new Date().toISOString()
    } else if (transaction.trade_state === 'PAYERROR') {
      order.status = 'failed'
      order.failedAt = order.failedAt || new Date().toISOString()
    }
    order.updatedAt = new Date().toISOString()
    await saveData(data)
    return transaction
  } catch (error) {
    console.warn('[wechat-pay] order query failed', error.code || error.message)
    return null
  }
}
function simulationUserRequired(res) { return json(res, 401, { code: 'MINIPROGRAM_SIMULATION_USER_REQUIRED', error: '请先使用手机号创建模拟测试会话' }) }
function simulationProduct(data, productType) { return miniProgramKnowledgeConfig(data).products[productType] }
function simulationOrderResponse(data, identity, order, extra = {}) { return { simulation: true, order: publicSimulationOrder(order), entitlements: simulationEntitlements(data, identity), ...extra } }
function miniProgramConfigReady() { return Boolean(process.env.WX_APPID && process.env.WX_APP_SECRET && miniProgramTokenSecret) }
function encodeTokenPart(value) { return Buffer.from(JSON.stringify(value)).toString('base64url') }
function createMiniProgramToken(userId) { const now = Math.floor(Date.now() / 1000); const payload = { sub: userId, iat: now, exp: now + 30 * 24 * 60 * 60 }; const encoded = encodeTokenPart(payload); const signature = crypto.createHmac('sha256', miniProgramTokenSecret).update(encoded).digest('base64url'); return `mpv1.${encoded}.${signature}` }
function verifyMiniProgramToken(token) { try { const [version, encoded, signature] = String(token || '').split('.'); if (version !== 'mpv1' || !encoded || !signature || !miniProgramTokenSecret) return null; const expected = crypto.createHmac('sha256', miniProgramTokenSecret).update(encoded).digest('base64url'); const actualBuffer = Buffer.from(signature); const expectedBuffer = Buffer.from(expected); if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null; const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')); return payload.exp > Math.floor(Date.now() / 1000) ? payload : null } catch { return null } }
function validMiniNickname(value) { const nickname = String(value || '').trim(); if (!nickname || nickname.length > 64 || /^(微信用户|微信用户\d+|用户|用户\d{4})$/u.test(nickname)) return ''; return nickname }
function adminMiniUserPayload(input = {}, current = {}) { const nickname = validMiniNickname(input.nickname ?? current.nickname); if (!nickname) return null; const rawPhone = String(input.phone ?? '').trim(); if (rawPhone && !/^\+?[\d\s()-]{7,24}$/.test(rawPhone)) return null; return { nickname, ...(rawPhone ? { phone: rawPhone.replace(/[^\d+]/g, '') } : {}) } }
function miniProfile(input = {}) { const nickname = validMiniNickname(input.nickname); const avatarUrl = String(input.avatarUrl || '').trim().slice(0, 500); return { nickname, avatarUrl: /^https:\/\//i.test(avatarUrl) ? avatarUrl : '' } }
function fallbackMiniNickname() { return `用户${crypto.randomInt(1000, 10000)}` }
function publicMiniProgramUser(user) { return { id: user.id, phoneBound: Boolean(user.phone), phoneMasked: user.phone ? maskPhone(user.phone) : null, nickname: user.nickname || fallbackMiniNickname(), avatarUrl: user.avatarUrl || '' } }
function maskPhone(phone) { const value = String(phone || ''); return value.length > 7 ? `${value.slice(0, 3)}****${value.slice(-4)}` : '****' }
function miniProgramUserFromRequest(req, data) { const auth = req.headers.authorization || ''; if (!auth.startsWith('Bearer ')) return null; const payload = verifyMiniProgramToken(auth.slice(7)); if (!payload) return null; return (data.miniprogramUsers || []).find((user) => user.id === payload.sub) || null }
function id(prefix = 'item') { return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}` }
async function wechatRequest(path, options = {}) { const response = await fetch(`${wechatApiBase}${path}`, { ...options, signal: AbortSignal.timeout(8000) }); const payload = await response.json(); if (!response.ok || payload.errcode) throw new Error(payload.errmsg || '微信接口请求失败'); return payload }
async function exchangeMiniProgramCode(code) { if (!miniProgramConfigReady()) throw new Error('小程序登录服务尚未配置'); const params = new URLSearchParams({ appid: process.env.WX_APPID, secret: process.env.WX_APP_SECRET, js_code: code, grant_type: 'authorization_code' }); const payload = await wechatRequest(`/sns/jscode2session?${params}`); if (!payload.openid) throw new Error('微信登录 code 无效'); return payload }
async function getWechatAccessToken() { if (wechatAccessToken.value && wechatAccessToken.expiresAt > Date.now() + 60_000) return wechatAccessToken.value; const params = new URLSearchParams({ grant_type: 'client_credential', appid: process.env.WX_APPID, secret: process.env.WX_APP_SECRET }); const payload = await wechatRequest(`/cgi-bin/token?${params}`); if (!payload.access_token) throw new Error('微信服务凭证获取失败'); wechatAccessToken = { value: payload.access_token, expiresAt: Date.now() + Number(payload.expires_in || 7200) * 1000 }; return wechatAccessToken.value }
async function exchangePhoneCode(code) { const accessToken = await getWechatAccessToken(); return wechatRequest(`/wxa/business/getuserphonenumber?access_token=${encodeURIComponent(accessToken)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }) }
function normalizedPhone(phoneInfo = {}) { const raw = phoneInfo.phoneNumber || (phoneInfo.countryCode && phoneInfo.purePhoneNumber ? `+${phoneInfo.countryCode}${phoneInfo.purePhoneNumber}` : phoneInfo.purePhoneNumber); const phone = String(raw || '').replace(/[^\d+]/g, ''); if (!/^\+?\d{7,20}$/.test(phone)) throw new Error('微信未返回有效手机号'); return phone.startsWith('+') ? phone : `+${phone}` }
function ensureMiniCollections(user) { user.travelers = Array.isArray(user.travelers) ? user.travelers : []; user.documents = Array.isArray(user.documents) ? user.documents : []; user.coupons = Array.isArray(user.coupons) ? user.coupons : []; return user }
function maskPassport(value) { const passport = String(value || ''); return passport.length > 4 ? `${passport.slice(0, 2)}****${passport.slice(-2)}` : (passport ? '****' : '') }
function safeTraveler(item, masked = false) { return { id: item.id, name: item.name, relation: item.relation || '', passportNo: masked ? maskPassport(item.passportNo) : (item.passportNo || ''), createdAt: item.createdAt, updatedAt: item.updatedAt } }
function safeDocument(item, masked = false) { return { id: item.id, name: item.name, passportNo: masked ? maskPassport(item.passportNo) : (item.passportNo || ''), expiry: item.expiry || '', visaStatus: item.visaStatus || '', createdAt: item.createdAt, updatedAt: item.updatedAt } }
function editableSensitive(value, current) { const text = String(value ?? '').trim(); return text.includes('*') ? String(current || '') : text.slice(0, 64) }
function travelerPayload(input = {}, current = {}) { const name = String(input.name ?? current.name ?? '').trim().slice(0, 64); if (!name) return null; return { name, relation: String(input.relation ?? current.relation ?? '').trim().slice(0, 32), passportNo: editableSensitive(input.passportNo, current.passportNo) } }
function documentPayload(input = {}, current = {}) { const name = String(input.name ?? current.name ?? '').trim().slice(0, 64); if (!name) return null; return { name, passportNo: editableSensitive(input.passportNo, current.passportNo), expiry: String(input.expiry ?? current.expiry ?? '').trim().slice(0, 32), visaStatus: String(input.visaStatus ?? current.visaStatus ?? '').trim().slice(0, 32) } }
function miniProgramProfile(data, user) { ensureMiniCollections(user); const leads = data.leads.filter((lead) => lead.userId === user.id); const appointments = leads.filter((lead) => ['guide-booking', 'vehicle-consultation'].includes(lead.leadType)).length; const trips = leads.filter((lead) => ['customization', 'business-travel'].includes(lead.leadType)).length; return { user: publicMiniProgramUser(user), stats: { appointments, trips, coupons: user.coupons.length, profiles: user.travelers.length + user.documents.length } } }
function couponPayload(input = {}, current = {}) { const title = String(input.title ?? current.title ?? '').trim().slice(0, 80); if (!title) return null; return { title, description: String(input.description ?? current.description ?? '').trim().slice(0, 240), code: String(input.code ?? current.code ?? '').trim().slice(0, 64), expiresAt: String(input.expiresAt ?? current.expiresAt ?? '').trim().slice(0, 32), status: String(input.status ?? current.status ?? 'active').trim().slice(0, 24) } }
function safeCoupon(item) { return { id: item.id, title: item.title, description: item.description || '', code: item.code || '', expiresAt: item.expiresAt || '', status: item.status || 'active', createdAt: item.createdAt, updatedAt: item.updatedAt } }
function adminMiniUserSummary(data, user) { const profile = miniProgramProfile(data, user); const leads = data.leads.filter((lead) => lead.userId === user.id); const member = paymentOrders(data).some((order) => order.userId === user.id && order.status === 'paid' && order.productType === 'membership'); return { ...profile.user, member, memberLabel: member ? '终身会员' : '普通用户', stats: profile.stats, leadCount: leads.length, createdAt: user.createdAt, updatedAt: user.updatedAt } }
function adminPaymentOrder(data, order) {
  const user = (data.miniprogramUsers || []).find((item) => item.id === order.userId)
  const { openid, phone, ...safe } = order
  return { ...safe, userId: order.userId || null, userNickname: user?.nickname || order.userId || '未知用户', phoneMasked: phone ? maskPhone(phone) : (user?.phone ? maskPhone(user.phone) : null), member: Boolean(user && paymentOrders(data).some((item) => item.userId === user.id && item.status === 'paid' && item.productType === 'membership')) }
}
function adminPaymentMembers(data) {
  const orders = paymentOrders(data)
  return (data.miniprogramUsers || []).flatMap((user) => {
    const paidMemberships = orders.filter((order) => order.userId === user.id && order.status === 'paid' && order.productType === 'membership').sort((a, b) => String(a.paidAt || a.createdAt || '').localeCompare(String(b.paidAt || b.createdAt || '')))
    if (!paidMemberships.length) return []
    const latest = paidMemberships.at(-1)
    return [{ id: user.id, nickname: user.nickname || user.id, phoneMasked: user.phone ? maskPhone(user.phone) : null, memberLabel: '终身会员', paidAt: latest.paidAt || latest.createdAt || null, orderId: latest.id, outTradeNo: latest.outTradeNo || null, orderCount: orders.filter((order) => order.userId === user.id).length, unlockedAttractions: publishedAttractionIds(data).length, createdAt: user.createdAt || null }]
  }).sort((a, b) => String(b.paidAt || '').localeCompare(String(a.paidAt || '')))
}
function beijingWindowStart(days) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).filter((part) => part.type !== 'literal').map((part) => [part.type, Number(part.value)]))
  return Date.UTC(parts.year, parts.month - 1, parts.day) - (8 * 60 * 60 * 1000) - ((days - 1) * 24 * 60 * 60 * 1000)
}
function adminCommerceStats(data) {
  const orders = paymentOrders(data)
  const paidOrders = orders.filter((order) => order.status === 'paid')
  const members = new Set(paidOrders.filter((order) => order.productType === 'membership').map((order) => order.userId).filter(Boolean))
  const amountTotalFen = (items) => items.reduce((total, order) => total + (Number(order.amountTotal) || 0), 0)
  const buildWindow = (days) => {
    const start = beijingWindowStart(days)
    const inWindow = (value) => value && new Date(value).getTime() >= start
    const windowOrders = orders.filter((order) => inWindow(order.createdAt))
    const windowPaid = windowOrders.filter((order) => order.status === 'paid')
    const windowMembers = new Set(windowPaid.filter((order) => order.productType === 'membership' && inWindow(order.paidAt || order.createdAt)).map((order) => order.userId).filter(Boolean))
    return { orderCount: windowOrders.length, paidOrderCount: windowPaid.length, memberCount: windowMembers.size, amountTotalFen: amountTotalFen(windowPaid), amount: amountTotalFen(windowPaid) / 100 }
  }
  return { totals: { orderCount: orders.length, paidOrderCount: paidOrders.length, memberCount: members.size, amountTotalFen: amountTotalFen(paidOrders), amount: amountTotalFen(paidOrders) / 100 }, windows: { today: buildWindow(1), last7Days: buildWindow(7), last30Days: buildWindow(30) } }
}
function adminPaymentSummary(data) { return { items: paymentOrders(data).map((order) => adminPaymentOrder(data, order)).sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))), members: adminPaymentMembers(data) } }
function adminMiniRecords(data, collection) { return (data.miniprogramUsers || []).flatMap((user) => { ensureMiniCollections(user); return user[collection].map((item) => ({ ...((collection === 'travelers' ? safeTraveler : collection === 'documents' ? safeDocument : safeCoupon)(item, true)), userId: user.id, userNickname: user.nickname || user.id })) }) }
function findMiniRecord(data, collection, itemId) { for (const user of data.miniprogramUsers || []) { ensureMiniCollections(user); const item = user[collection].find((entry) => entry.id === itemId); if (item) return { user, items: user[collection], item } } return null }
async function body(req, limit = 1024 * 1024) {
  let raw = ''
  for await (const chunk of req) { raw += chunk; if (raw.length > limit) throw new Error('payload too large') }
  return raw ? JSON.parse(raw) : {}
}
async function rawBody(req, limit = 1024 * 1024) {
  const chunks = []
  let length = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    length += buffer.length
    if (length > limit) throw new Error('payload too large')
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}
async function handleWechatPayNotify(req, res) {
  if (!realPayNotifyReady(wechatPay)) return miniProgramPaymentUnavailable(res)
  const raw = await rawBody(req)
  if (!verifyWechatNotify(wechatPay, req.headers, raw)) return json(res, 401, { code: 'WECHAT_PAY_NOTIFY_SIGNATURE_INVALID', error: '微信支付回调验签失败' })
  try {
    const envelope = JSON.parse(raw)
    const transaction = JSON.parse(decryptWechatNotify(wechatPay, envelope.resource || {}))
    const data = readData()
    const order = paymentOrders(data).find((item) => item.outTradeNo === transaction.out_trade_no)
    if (!order) return json(res, 404, { code: 'WECHAT_PAY_ORDER_NOT_FOUND', error: '支付订单不存在' })
    if (transaction.appid !== wechatPay.appid || transaction.mchid !== wechatPay.mchid || Number(transaction.amount?.total) !== Number(order.amountTotal)) return json(res, 400, { code: 'WECHAT_PAY_ORDER_MISMATCH', error: '支付订单校验失败' })
    if (transaction.trade_state === 'SUCCESS') {
      order.status = 'paid'
      order.transactionId = transaction.transaction_id || order.transactionId || ''
      order.paidAt = order.paidAt || new Date().toISOString()
      order.updatedAt = new Date().toISOString()
      await saveData(data)
    }
    return json(res, 200, { code: 'SUCCESS', message: '成功' })
  } catch (error) {
    return json(res, 400, { code: 'WECHAT_PAY_NOTIFY_DECRYPT_FAILED', error: error.message })
  }
}
function redact(value) {
  return String(value ?? '').replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]').replace(/(password|secret|token|authorization)\s*[:=]\s*[^,\s]+/gi, '$1=[REDACTED]')
}
function leadNotificationText(lead) {
  const fields = Object.entries(lead).filter(([key]) => !['id', 'status'].includes(key)).map(([key, value]) => `${key}: ${redact(Array.isArray(value) ? value.join(', ') : value)}`)
  return fields.join('\n').slice(0, 12000)
}
function smtpCommand(socket, command, expected = /^2|^3/) {
  return new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const lines = String(chunk).split(/\r?\n/).filter(Boolean)
      const line = lines.at(-1) || ''
      if (!expected.test(line)) { socket.off('data', onData); reject(new Error(`SMTP ${line.slice(0, 120)}`)); return }
      if (!line.startsWith(`${line.slice(0, 3)}-`)) { socket.off('data', onData); resolve(line) }
    }
    socket.on('data', onData)
    if (command) socket.write(`${command}\r\n`)
  })
}
async function sendSmtpMail(lead) {
  if (!smtpPassword) { console.warn('[mail] notification skipped: SMTP password is not configured'); return { sent: false, reason: 'not_configured' } }
  const subject = `[SY Website] 新表单提交 · ${lead.leadType || '咨询'}`
  const message = [`From: ${smtpUser}`, `To: ${notificationRecipient}`, `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`, 'Content-Type: text/plain; charset=UTF-8', 'MIME-Version: 1.0', '', leadNotificationText(lead)].join('\r\n')
  const socket = tls.connect({ host: smtpHost, port: smtpPort, servername: smtpHost, timeout: 8000 })
  await new Promise((resolve, reject) => { socket.once('secureConnect', resolve); socket.once('error', reject); socket.once('timeout', () => reject(new Error('SMTP connection timeout'))) })
  await smtpCommand(socket, null)
  await smtpCommand(socket, 'EHLO sy-greece.com')
  await smtpCommand(socket, 'AUTH LOGIN')
  await smtpCommand(socket, Buffer.from(smtpUser).toString('base64'))
  await smtpCommand(socket, Buffer.from(smtpPassword).toString('base64'))
  await smtpCommand(socket, `MAIL FROM:<${smtpUser}>`)
  await smtpCommand(socket, `RCPT TO:<${notificationRecipient}>`)
  await smtpCommand(socket, 'DATA')
  await smtpCommand(socket, `${message}\r\n.`)
  await smtpCommand(socket, 'QUIT')
  socket.end()
  return { sent: true }
}
async function sendLeadNotification(lead) {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await sendSmtpMail(lead)
      if (result.sent) console.info(`[mail] notification sent lead=${lead.id}`)
      return result
    } catch (error) { lastError = error; if (attempt < 3) await delay(attempt * 500) }
  }
  console.error(`[mail] notification failed lead=${lead.id} attempts=3 error=${redact(lastError?.message || lastError)}`)
  return { sent: false, reason: 'delivery_failed' }
}
async function multipartImage(req, limit = 6 * 1024 * 1024) {
  const contentType = String(req.headers['content-type'] || '')
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i)
  if (!boundaryMatch) throw new Error('头像上传格式无效')
  const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`)
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('头像文件不能超过 6MB')
    chunks.push(buffer)
  }
  const payload = Buffer.concat(chunks)
  const headerEnd = payload.indexOf(Buffer.from('\r\n\r\n'))
  if (headerEnd < 0) throw new Error('头像上传内容无效')
  const fileStart = headerEnd + 4
  const fileEnd = payload.indexOf(Buffer.concat([Buffer.from('\r\n'), boundary]), fileStart)
  if (fileEnd < 0) throw new Error('头像上传内容不完整')
  const header = payload.slice(0, headerEnd).toString('utf8')
  const typeMatch = header.match(/\r\nContent-Type:\s*([^\r\n]+)/i)
  const mimeType = String(typeMatch?.[1] || '').trim().toLowerCase()
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) throw new Error('仅支持 PNG、JPG 或 WebP 头像')
  const image = payload.slice(fileStart, fileEnd)
  if (!image.length) throw new Error('头像文件为空')
  return { image, mimeType }
}
function saveMiniProgramAvatar(data, req, image, mimeType) {
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1]
  const filename = `mp-avatar-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${extension}`
  writeRuntimeImage(filename, image)
  return `${siteBase(data, req)}/images/${filename}`
}
function destinationAttractionIds(item = {}) {
  if (Array.isArray(item.attractionIds)) return [...new Set(item.attractionIds.map((value) => String(value || '').trim()).filter(Boolean))]
  if (Object.prototype.hasOwnProperty.call(item, 'attractionId')) {
    const value = String(item.attractionId || '').trim()
    return value ? [value] : []
  }
  return []
}
function homeSettings(data, imageUrl = (value) => value) {
  const settings = data.settings || {}
  const configuredBanners = Array.isArray(data.homeBanners) ? data.homeBanners : (Array.isArray(settings.homeBanners) ? settings.homeBanners : data.home?.banners)
  const banners = Array.isArray(configuredBanners)
    ? configuredBanners
      .filter((item) => item && item.enabled !== false && item.image)
      .map((item, index) => ({ ...item, id: item.id || `home-banner-${index + 1}`, sort: Number(item.sort || index + 1), image: imageUrl(item.image) }))
      .sort((a, b) => a.sort - b.sort)
    : []
  return {
    eyebrow: String(settings.homeEyebrow || DEFAULT_HOME_EYEBROW).trim(),
    title: String(settings.homeTitle || DEFAULT_HOME_TITLE).trim(),
    description: String(settings.homeDescription || DEFAULT_HOME_DESCRIPTION).trim(),
    banners,
  }
}
function normalizeHomeBanner(item = {}, fallbackSort = 1) {
  const sort = Number(item.sort)
  return {
    ...item,
    id: String(item.id || id('home-banner')),
    title: String(item.title || '').trim(),
    alt: String(item.alt || item.title || '').trim(),
    image: String(item.image || '').trim(),
    enabled: item.enabled !== false,
    sort: Number.isFinite(sort) && sort > 0 ? sort : fallbackSort,
  }
}
function setHomeBanners(data, banners) {
  const { homeBanners: _legacyHomeBanners, ...settings } = data.settings || {}
  data.settings = settings
  data.homeBanners = banners
  data.home = { ...(data.home || {}), banners }
}
function normalizePublicDestination(item, cities, attractions) {
  const cityById = new Map(cities.map((city) => [city.id, city]))
  const explicitCityId = String(item.cityId || '').trim()
  const configuredAttractionIds = Object.prototype.hasOwnProperty.call(item, 'attractionIds') || Object.prototype.hasOwnProperty.call(item, 'attractionId')
  const requestedIds = destinationAttractionIds(item)
  const validAttractionIds = requestedIds.filter((attractionId) => attractions.some((attraction) => attraction.id === attractionId))
  let cityId = explicitCityId ? (cityById.has(explicitCityId) ? explicitCityId : '') : (cityById.has(item.id) ? item.id : '')
  if (!cityId) cityId = validAttractionIds.map((attractionId) => attractions.find((attraction) => attraction.id === attractionId)?.city).find((candidate) => cityById.has(candidate)) || ''
  const attractionIds = configuredAttractionIds
    ? validAttractionIds
    : cityId
      ? attractions.filter((attraction) => attraction.city === cityId).map((attraction) => attraction.id)
      : validAttractionIds
  const legacyAttractionId = Object.prototype.hasOwnProperty.call(item, 'attractionId')
    ? (validAttractionIds.includes(String(item.attractionId || '').trim()) ? String(item.attractionId).trim() : '')
    : undefined
  return { ...item, cityId, attractionIds, ...(Object.prototype.hasOwnProperty.call(item, 'attractionId') ? { attractionId: legacyAttractionId } : {}) }
}
function homeBannerPayload(input = {}, current = {}) {
  const title = String(input.title ?? current.title ?? '').trim().slice(0, 120)
  const description = String(input.description ?? current.description ?? '').trim().slice(0, 500)
  const alt = String(input.alt ?? current.alt ?? title).trim().slice(0, 180)
  const image = String(input.image ?? current.image ?? '').trim().slice(0, 500)
  if (!title || !description || !alt || !image) return null
  const sort = Math.max(1, Math.min(9999, Number(input.sort ?? current.sort ?? 1) || 1))
  return { title, description, alt, image, enabled: input.enabled !== undefined ? input.enabled !== false : current.enabled !== false, sort, ...(current.createdAt ? { createdAt: current.createdAt } : {}) }
}
function publicHomeBanners(data) {
  const imageUrl = (value) => { const image = String(value || ''); if (!image || /^(https?:)?\/\//i.test(image) || image.startsWith('/')) return image; const cleaned = image.replace(/^(?:\.\/|\/)?(?:images\/)+/, ''); return cleaned ? `./images/${cleaned}` : image }
  return homeSettings(data, imageUrl).banners.map((item) => ({ ...item, description: item.description || '', alt: item.alt || item.title, enabled: true, sort: Number(item.sort || 0) }))
}
function publicHome(data) {
  return {
    eyebrow: data.settings?.homeEyebrow || 'Greece Travel Butler',
    title: data.settings?.homeTitle || '希腊旅行管家',
    description: data.settings?.homeDescription || '希伴旅 · 只为一生美好回忆',
    banners: publicHomeBanners(data),
  }
}
function demoAttractionContent(item, detail, imageUrl) {
  if (!demoContent) return detail
  const exhibits = detail.exhibits?.length ? detail.exhibits : [{ id: `${item.id}-demo-point`, ...demoContent.exhibit, image: '', sort: 1, status: 'published', isDemo: true }]
  const highlights = detail.highlights?.length ? detail.highlights : [{ id: `${item.id}-demo-highlight`, ...demoContent.highlight, image: '', sort: 1, exhibitId: exhibits[0].id, isDemo: true }]
  const visitorInfo = { ...detail.visitorInfo }
  const demoVisitorFields = []
  const visitorInfoSections = (detail.visitorInfoSections || []).map((section) => {
    if (section.bodyHtml || section.bodyHtmlTw || section.bodyHtmlEn || section.map?.image || section.map?.url) return section
    const { zh, tw, en } = demoContent.visitorInfo[section.id] || {}
    if (!zh) return section
    const body = sanitizeRichText(`<p>${zh}</p>`), bodyTw = sanitizeRichText(`<p>${tw}</p>`), bodyEn = sanitizeRichText(`<p>${en}</p>`)
    visitorInfo[section.id] = zh
    visitorInfo[`${section.id}Tw`] = tw
    visitorInfo[`${section.id}En`] = en
    demoVisitorFields.push(section.id)
    return { ...section, bodyHtml: body.html, bodyHtmlTw: bodyTw.html, bodyHtmlEn: bodyEn.html, nodes: body.nodes, nodesTw: bodyTw.nodes, nodesEn: bodyEn.nodes, ...(section.map ? { map: { ...section.map, description: body.html, descriptionTw: bodyTw.html, descriptionEn: bodyEn.html } } : {}), isDemo: true }
  })
  const routes = detail.routes?.length ? detail.routes : [{ id: `${item.id}-demo-route`, ...demoContent.route, sort: 1, pointIds: exhibits.slice(0, 3).map((point) => point.id), isDemo: true }]
  const audioGuides = detail.audioGuides?.length ? detail.audioGuides : demoContent.audioGuides.map((entry, index) => ({ ...entry, id: `${item.id}-demo-audio-${entry.category}`, cover: imageUrl(item.image) || '', attractionId: item.id, exhibitId: exhibits[0].id, routeId: entry.category === 'route' ? routes[0].id : null, durationSeconds: 0, previewSeconds: 0, previewUrl: '', accessUrl: '', fullUrl: null, playable: false, sort: index + 1, isDemo: true }))
  const summaryIsDemo = !String(item.summary || '').trim()
  return { ...detail, summary: summaryIsDemo ? demoContent.summary.zh : item.summary, ...(summaryIsDemo ? { summaryTw: demoContent.summary.tw, summaryEn: demoContent.summary.en } : {}), visitorInfo, visitorInfoSections, exhibits, highlights, routes, audioGuides, demoFields: { ...(summaryIsDemo ? { summary: true } : {}), ...(!detail.highlights?.length ? { highlights: true } : {}), ...(!detail.exhibits?.length ? { exhibits: true } : {}), ...(!detail.routes?.length ? { routes: true } : {}), ...(!detail.audioGuides?.length ? { audioGuides: true } : {}), ...(demoVisitorFields.length ? { visitorInfo: demoVisitorFields } : {}) } }
}
function publicContent(data, countryId = 'greece') {
  const imageUrl = (value) => {
  if (!value) return value
  const str = String(value)
  if (/^(https?:)?\/\//i.test(str) || str.startsWith('/')) return value
  // Normalise: remove any leading ./images/ or images/ prefix (including doubled images/), then prepend ./images/
  const cleaned = str.replace(/^(?:\.\/|\/)?(?:images\/)+/, '')
  return cleaned ? `./images/${cleaned}` : value
}
  const countries = (data.countries || []).filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  const guides = (data.guides || []).filter((item) => item.enabled !== false && (item.countryId || 'greece') === countryId).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  const scoped = (items) => (items || []).filter((item) => (item.countryId || 'greece') === countryId)
  const heritage = publicHeritage(data, countryId)
  const publicAttractions = scoped(data.attractions).filter((item) => item.status === 'published').map((item) => {
    const { audioGuides: _privateGuides, audioFile: _privateAudio, visitorSections: _privateVisitorSections, ...safe } = item
    const detail = demoAttractionContent(item, heritage.attractionDetails[item.id] || {}, imageUrl)
    const safeGuide = { ...(item.guide || {}) }
    for (const key of ['hoursHtml','hoursHtmlTw','hoursHtmlEn','ticketsHtml','ticketsHtmlTw','ticketsHtmlEn','transportHtml','transportHtmlTw','transportHtmlEn','mapHtml','mapHtmlTw','mapHtmlEn']) if (safeGuide[key] != null) safeGuide[key] = sanitizeRichText(safeGuide[key]).html
    safeGuide.mapUrl = detail.visitorInfo?.mapUrl || ''
    safeGuide.mapImage = detail.visitorInfo?.mapImage || ''
    safeGuide.sourceUrl = detail.visitorInfo?.sourceUrl || ''
    return { ...safe, ...detail, guide: safeGuide, image: imageUrl(item.image), shareTitle: item.shareTitle || '', shareImage: imageUrl(item.shareImage), exhibits: detail.exhibits || [], highlights: detail.highlights || [], articles: (item.articles || []).map((article) => ({ ...article, cover: imageUrl(article.cover) })) }
  })
  const publicCities = scoped(data.cities).filter((item) => item.status !== 'archived').map((item) => ({ ...item, mosaic: (item.mosaic || []).map((image) => `./images/${image}`) }))
  const publicDestinations = scoped(data.destinations).filter((item) => item.status === 'published').map((item) => ({ ...normalizePublicDestination(item, publicCities, publicAttractions), image: imageUrl(item.image) })).filter((item) => item.cityId && item.attractionIds.length > 0)
  const home = homeSettings(data, imageUrl)
  const activeDestinationCategories = (data.destinationCategories || []).filter((item) => item.enabled !== false).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  return {
    settings: { ...data.settings, homeEyebrow: home.eyebrow, homeTitle: home.title, homeDescription: home.description, homeBanners: home.banners },
    home,
    countries: countries.map((item) => ({ ...item, heroImage: imageUrl(item.heroImage) })),
    guides: guides.map((item) => ({ ...item, avatar: imageUrl(item.avatar), fullImage: imageUrl(item.fullImage) })),
    routes: scoped(data.routes).filter((item) => item.status === 'published').map((item) => ({ ...item, image: `./images/${item.image}` })),
    destinations: publicDestinations,
    attractions: publicAttractions,
    audioAlbums: heritage.audioAlbums,
    sampleItineraries: scoped(data.sampleItineraries).filter((item) => item.status === 'published').map((item) => ({ ...item, cover: `./images/${item.cover}` })),
    cities: publicCities,
    destinationCategories: activeDestinationCategories.map((item) => ({ key: item.key, name: item.name, nameTw: item.nameTw || item.name, nameEn: item.nameEn || item.name, sort: item.sort || 0, enabled: true })),
    // Backward-compatible alias for clients that have not moved to destinationCategories yet.
    destinationTypes: activeDestinationCategories.map((item) => ({ id: item.key, name: item.name, description: item.description || '', status: 'published', sort: item.sort || 0 })),
  }
}
function readiness(data) {
  const requiredCollections = ['routes', 'destinations', 'cities', 'attractions', 'sampleItineraries', 'customTrips', 'leads', 'miniprogramUsers']
  const missing = requiredCollections.filter((key) => !Array.isArray(data[key]))
  if (!storageStatus().ready) missing.push(`storage.${storageStatus().mode}`)
  if (!adminPassword) missing.push('SY_ADMIN_PASSWORD')
  if (!miniProgramConfigReady()) missing.push('WX_APPID/WX_APP_SECRET/SY_MINIPROGRAM_TOKEN_SECRET')
  if (!data.settings?.siteUrl) missing.push('settings.siteUrl')
  return { ok: missing.length === 0, missing, storage: storageStatus(), content: { cities: data.cities?.length || 0, attractions: data.attractions?.length || 0, sampleItineraries: data.sampleItineraries?.length || 0 } }
}
function xml(value) { return String(value).replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char])) }
function siteBase(data, req) { return String(data.settings.siteUrl || `http://${req.headers.host || '127.0.0.1:4173'}`).replace(/\/$/, '') }
function sitemap(data, req) {
  const base = siteBase(data, req)
  const paths = [
    '/', '/customize', '/heritage-guidance', '/vehicle-consultation', '/knowledge-base', '/business-travel', '/search', '/tools', '/guides/richard-li',
    ...data.routes.filter((item) => item.status === 'published').map((item) => `/routes/${item.id}`),
    ...data.destinations.filter((item) => item.status === 'published').map((item) => `/destinations/${item.id}`),
    ...(data.guides || []).filter((item) => item.enabled !== false).map((item) => `/guides/${item.id}`),
    ...(data.attractions || []).filter((item) => item.status === 'published').map((item) => `/attractions/${item.id}`),
    ...(data.cities || []).filter((item) => item.status !== 'archived').flatMap((item) => [`/attractions/city/${item.id}`, `/attractions/city/${item.id}/spots`]),
    ...(data.sampleItineraries || []).filter((item) => item.status === 'published').map((item) => `/itineraries/${item.id}`),
  ]
  const lastmod = new Date().toISOString().slice(0, 10)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${xml(`${base}${path}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>${path === '/' ? 'weekly' : 'monthly'}</changefreq><priority>${path === '/' ? '1.0' : '0.8'}</priority></url>`).join('')}</urlset>`
}
function llms(data, req) {
  const base = siteBase(data, req)
  const lines = [`# ${data.settings.siteName}`, '', `> ${data.settings.defaultDescription || '只为一生美好回忆。'}`, '', '## 官方入口', `- 网站：${base}/`, `- 定制：${base}/customize`, `- 路线：${base}/routes/honeymoon-5d`, `- 圣托里尼：${base}/destinations/santorini`, `- 名人导游 Richard 李：${base}/guides/richard-li`, `- 古迹人文讲解：${base}/heritage-guidance`, `- 用车资源对接咨询：${base}/vehicle-consultation`, `- 景点文史知识库：${base}/knowledge-base`, `- 商旅随行咨询：${base}/business-travel`, `- 旅行工具：${base}/tools`, '', '## 服务范围', '- 雅典、圣托里尼及希腊全境的人文资讯与行程策划', '- 古迹讲解、用车资源对接、知识付费与商务语言陪同咨询', '- 历史文明、海岛、餐厅、体育活动与企业拜访等主题', '', '## 内容索引']
  data.routes.filter((item) => item.status === 'published').forEach((item) => lines.push(`- ${item.title}：${item.desc}`))
  lines.push('', '## 联系方式', `- 微信：${data.settings.wechat}`, `- 电话：${data.settings.phone}`, `- 邮箱：${data.settings.email}`, '')
  return lines.join('\n')
}
function htmlAttr(value) { return String(value || '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])) }
function seoImage(data, req, value) {
  const base = siteBase(data, req)
  if (!value) return `${base}/images/santorini.webp`
  const source = String(value)
  if (/^https?:\/\//i.test(source)) return source
  const cleaned = source.replace(/^(?:\.\/|\/)?(?:images\/)+/, '').replace(/^\//, '')
  return `${base}/images/${cleaned}`
}
function pageSeo(data, pathname, search, req) {
  const config = { siteName: '希腊旅行管家', siteUrl: siteBase(data, req), defaultTitle: '只为一生美好回忆｜希腊旅行管家', defaultDescription: '只为一生美好回忆。希腊旅行管家提供雅典、圣托里尼及希腊全境的人文与行程咨询。', robotsPolicy: 'index,follow', ...data.settings }
  const params = new URLSearchParams(search || '')
  const query = params.get('q') || ''
  const queryId = params.get('id') || ''
  const attractionId = pathname.match(/^\/attractions\/([^/]+)$/)?.[1] || (pathname === '/pages/attraction/detail' ? queryId : '')
  const cityId = pathname.match(/^\/attractions\/city\/([^/]+)(?:\/spots)?$/)?.[1] || ((pathname === '/pages/city/index' || pathname === '/pages/city/spots') ? queryId : '')
  const itineraryId = pathname.match(/^\/itineraries\/([^/]+)$/)?.[1] || ((pathname === '/itinerary/detail' || pathname === '/pages/itinerary/detail') ? queryId : '')
  const guideId = pathname.match(/^\/guides\/([^/]+)$/)?.[1] || (pathname === '/pages/guide/guide' ? (queryId || 'richard-li') : '')
  const luxuryType = pathname === '/pages/luxury/detail' ? params.get('type') : ''
  const luxurySlug = pathname.match(/^\/experiences\/([^/]+)$/)?.[1] || (luxuryType === 'jet' ? 'private-flight' : luxuryType === 'yacht' ? 'private-yacht' : '')
  const matchedAttraction = attractionId ? (data.attractions || []).find((item) => item.id === decodeURIComponent(attractionId)) : null
  const matchedCity = cityId ? (data.cities || []).find((item) => item.id === cityId) : null
  const matchedItinerary = itineraryId ? (data.sampleItineraries || []).find((item) => item.id === decodeURIComponent(itineraryId)) : null
  const matchedGuide = guideId ? (data.guides || []).find((item) => item.id === decodeURIComponent(guideId) && item.enabled !== false) : null
  const tripToken = pathname.match(/^\/trip\/([^/]+)$/)?.[1] || ((pathname === '/itinerary/detail' || pathname === '/pages/itinerary/detail') ? params.get('token') : '')
  const matchedTrip = tripToken ? (data.customTrips || []).find((item) => item.token === tripToken) : null
  const pages = {
    '/': [`${config.homeTitle || '只为一生美好回忆'}｜${config.siteName || '希腊旅行管家'}`, config.homeDescription || config.defaultDescription],
    '/routes/honeymoon': ['爱琴海蜜月之旅｜5天4晚希腊定制路线', '雅典 + 圣托里尼 5 天 4 晚蜜月路线，中文司导、悬崖酒店、双体船出海与伊亚日落旅拍。'],
    '/customize': ['希腊行程咨询｜提交需求沟通方案', '告诉我们出行时间、人数与偏好，先沟通需求范围与行程规划方式。'],
    '/destinations/santorini': ['圣托里尼旅行指南｜蓝顶教堂与爱琴海日落', '圣托里尼悬崖酒店、伊亚日落、火山温泉与双体船巡航的深度旅行指南。'],
    '/search': [`搜索${query ? `“${query}”` : '希腊旅行'}｜Greece Travel Butler`, '搜索希腊路线、目的地和私人定制旅行灵感。'],
    '/tools': ['希腊行前信息工具箱｜签证 · 汇率 · 天气 · 行程日历', '出发前准备希腊申根签证、欧元汇率、天气和每日行程的信息工具箱。'],
    '/attractions': ['希腊景点导览｜景点 · 博物馆 · 展品讲解', '按城市浏览雅典、圣托里尼、德尔斐等地的景点与博物馆，含参观指南与展品讲解。'],
    '/itineraries': ['参考行程｜希腊旅行管家', '雅典、圣托里尼与世界遗产环线的参考行程，可按需定制。'],
    '/pages/itinerary/index': ['参考行程｜希腊旅行管家', '浏览可公开查看的参考行程框架。'],
    '/heritage-guidance': ['古迹人文讲解预约｜希腊文化咨询', '预约雅典、德尔斐与克里特等古迹的人文知识讲解。'],
    '/vehicle-consultation': ['在地用车资源对接咨询｜希腊出行信息', '咨询希腊本地车型、司导资质与用车资源对接方式。'],
    '/pages/vehicle/vehicle': ['在地用车资源对接咨询｜希腊出行信息', '咨询希腊本地车型、司导资质与用车资源对接方式。'],
    '/knowledge-base': ['景点付费文史知识库｜免费预览', '浏览希腊景点的历史、神话与建筑知识预览。'],
    '/pages/knowledge/knowledge': ['景点文史知识库｜免费预览', '从精选城市进入景点历史、神话与参观知识预览。'],
    '/pages/travel-guide/travel-guide': ['希腊旅行工具箱｜出行指南', '签证、汇率、天气与行程日历等出行前信息。'],
    '/business-travel': ['希腊商旅随行咨询｜商务语言与行程规划', '提供商务陪同、语言翻译、企业拜访与人文行程的咨询。'],
    '/pages/business/business': ['希腊商旅随行咨询｜商务语言与行程规划', '提供商务陪同、语言翻译、企业拜访与人文行程的咨询。'],
    '/pages/customize/customize': ['希腊行程咨询｜提交需求沟通方案', '告诉我们出行时间、人数与偏好，先沟通需求范围与行程规划方式。'],
    '/guides/richard-li': ['Richard 李名人导游｜希腊私人深度旅行与预约', '认识 Richard 李：武汉大学双学士、英国澳洲双硕士，提供希腊历史人文、小众秘境与私人摄影导览。'],
    '/manage-9f3k7': ['网站管理后台｜希腊旅行管家', '希腊旅行管家网站内容与 SEO 管理后台'],
  }
  const dynamicPage = matchedTrip
    ? [`${matchedTrip.title}｜${matchedTrip.client}`, `${matchedTrip.period} 定制旅程，${matchedTrip.travelers}，${matchedTrip.vehicle}。`]
    : matchedCity
      ? [`${matchedCity.name}景点导览｜${matchedCity.subtitle || matchedCity.country}`, `${matchedCity.name}：${matchedCity.description || ''}含 ${matchedCity.museumCount} 个景点与 ${matchedCity.guidePointCount} 个讲解点。`]
      : matchedAttraction
        ? [`${matchedAttraction.shareTitle || matchedAttraction.name}｜参观指南`, `${matchedAttraction.name}：${matchedAttraction.summary || ''}开放时间、门票、交通与展品讲解。`]
        : matchedItinerary
          ? [`${matchedItinerary.title}｜参考行程`, `${matchedItinerary.title}，${matchedItinerary.days} 天参考行程，${matchedItinerary.summary || ''}`]
          : matchedGuide
            ? [`${matchedGuide.name}｜${matchedGuide.role || '希腊私人导游'}`, matchedGuide.intro || matchedGuide.storyNote || '希腊历史人文与私人路线顾问。']
            : luxurySlug === 'private-flight'
              ? ['私人包机｜希腊奢享体验', '按日期、人数与目的地沟通私人包机协调方案。']
              : luxurySlug === 'private-yacht'
                ? ['游艇出海｜希腊奢享体验', '按日期、人数与船型沟通私人游艇出海方案。']
                : null
  const [title, description] = dynamicPage || pages[pathname] || [config.defaultTitle, config.defaultDescription]
  const isAdmin = pathname === '/manage-9f3k7'
  const canonicalPath = pathname === '/pages/guide/guide' && guideId ? `/guides/${encodeURIComponent(guideId)}`
    : pathname === '/pages/attraction/detail' && attractionId ? `/attractions/${encodeURIComponent(attractionId)}`
      : pathname === '/pages/city/index' && cityId ? `/attractions/city/${encodeURIComponent(cityId)}`
        : pathname === '/pages/city/spots' && cityId ? `/attractions/city/${encodeURIComponent(cityId)}/spots`
          : pathname === '/pages/luxury/detail' && luxurySlug ? `/experiences/${luxurySlug}`
            : pathname === '/pages/itinerary/index' ? '/itineraries'
              : pathname === '/pages/customize/customize' ? '/customize'
                : pathname === '/pages/knowledge/knowledge' ? '/knowledge-base'
                  : pathname === '/pages/travel-guide/travel-guide' ? '/tools'
                    : pathname === '/pages/vehicle/vehicle' ? '/vehicle-consultation'
                      : pathname === '/pages/business/business' ? '/business-travel'
                        : pathname
  const canonicalQuery = (pathname === '/itinerary/detail' || pathname === '/pages/itinerary/detail') && (params.get('token') || params.get('id')) ? `?${params.get('token') ? `token=${encodeURIComponent(params.get('token'))}` : `id=${encodeURIComponent(params.get('id'))}`}` : ''
  const image = seoImage(data, req, matchedAttraction?.shareImage || matchedAttraction?.image || matchedGuide?.fullImage || matchedGuide?.avatar || matchedCity?.mosaic?.[0] || matchedItinerary?.cover || config.ogImage)
  return { title: title.includes('SY') ? title : `${title} | ${config.siteName}`, description, image, canonical: `${config.siteUrl.replace(/\/$/, '')}${canonicalPath === '/' ? '/' : canonicalPath}${canonicalQuery}`, robots: (isAdmin || matchedTrip) ? 'noindex,nofollow' : config.robotsPolicy }
}
function injectSeoHtml(html, seo) {
  const title = htmlAttr(seo.title); const description = htmlAttr(seo.description); const canonical = htmlAttr(seo.canonical); const robots = htmlAttr(seo.robots); const image = htmlAttr(seo.image)
  let output = html.toString().replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`).replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`).replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`).replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`).replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`).replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`).replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`).replace(/<meta property="og:image" content="[^"]*" \/>/, `<meta property="og:image" content="${image}" />`)
  if (/<meta name="twitter:image"/.test(output)) output = output.replace(/<meta name="twitter:image" content="[^"]*" \/>/, `<meta name="twitter:image" content="${image}" />`)
  else output = output.replace('</head>', `<meta name="twitter:image" content="${image}" />\n</head>`)
  return output
}
function normalizeAttractionPayload(data, payload) {
  let normalized = payload
  if (Object.prototype.hasOwnProperty.call(payload, 'visitorSections')) normalized = { ...normalized, visitorSections: normalizeVisitorSections(payload.visitorSections) }
  if (Object.prototype.hasOwnProperty.call(payload, 'guide') && payload.guide && typeof payload.guide === 'object') {
    const guide = { ...payload.guide }
    for (const key of ['hoursHtml','hoursHtmlTw','hoursHtmlEn','ticketsHtml','ticketsHtmlTw','ticketsHtmlEn','transportHtml','transportHtmlTw','transportHtmlEn','mapHtml','mapHtmlTw','mapHtmlEn']) if (guide[key] != null) guide[key] = sanitizeRichText(guide[key]).html
    normalized = { ...normalized, guide }
  }
  if (!Object.prototype.hasOwnProperty.call(normalized, 'city')) return normalized
  const cityId = String(normalized.city || '').trim()
  const city = (data.cities || []).find((item) => item.id === cityId)
  return { ...normalized, cityName: city ? city.name : '' }
}
function normalizeDestinationPayload(payload, method) {
  const next = { ...payload }
  const hasAttractionIds = Object.prototype.hasOwnProperty.call(payload, 'attractionIds')
  const hasLegacyAttractionId = Object.prototype.hasOwnProperty.call(payload, 'attractionId')
  if (hasAttractionIds || hasLegacyAttractionId || method === 'POST') {
    const rawIds = hasAttractionIds
      ? (Array.isArray(payload.attractionIds) ? payload.attractionIds : String(payload.attractionIds || '').split(/[,，、\\s]+/))
      : [payload.attractionId]
    const attractionIds = [...new Set(rawIds.map((value) => String(value || '').trim()).filter(Boolean))]
    next.attractionIds = attractionIds
    // Keep the legacy field in sync for old clients and stored records.
    next.attractionId = attractionIds[0] || ''
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'cityId')) next.cityId = String(payload.cityId || '').trim()
  return next
}
async function collectionHandler(data, collection, method, pathname, payload) {
  const items = data[collection]
  const itemId = pathname.split('/').pop()
  let normalizedPayload
  try {
    normalizedPayload = collection === 'attractions'
      ? normalizeAttractionPayload(data, payload)
      : collection === 'destinations'
        ? normalizeDestinationPayload(payload, method)
        : payload
  } catch (error) { return { status: 422, body: { code: 'ATTRACTION_VALIDATION_FAILED', error: error.message || '景点资料无效' } } }
  if (method === 'GET') return { status: 200, body: items }
  if (collection === 'attractions' && (method === 'POST' || method === 'PATCH')) {
    const previous = method === 'PATCH' ? items.find((item) => item.id === itemId) : null
    const problem = validateAttraction({ ...previous, ...normalizedPayload }, data)
    if (problem) return { status: 422, body: { code: 'ATTRACTION_VALIDATION_FAILED', error: problem } }
  }
  if (method === 'POST') { const next = { ...normalizedPayload, id: normalizedPayload.id || id(collection.slice(0, -1)) }; items.push(next); await saveData(data); return { status: 201, body: next } }
  const index = items.findIndex((item) => item.id === itemId)
  if (index < 0) return { status: 404, body: { error: 'not found' } }
  if (method === 'PATCH') { items[index] = { ...items[index], ...normalizedPayload, id: itemId }; await saveData(data); return { status: 200, body: items[index] } }
  if (method === 'DELETE') { items.splice(index, 1); await saveData(data); return { status: 204, body: null } }
  return { status: 405, body: { error: 'method not allowed' } }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    if (method === 'OPTIONS' && url.pathname.startsWith('/api/')) return res.writeHead(204, corsHeaders()).end()
    if (url.pathname === '/api/health') return json(res, 200, { ok: true, service: 'sy-greece-admin', time: new Date().toISOString() })
    if (url.pathname === '/api/miniprogram/home' && method === 'GET') { const data = readData(); return json(res, 200, { home: publicHome(data) }) }
    if (url.pathname === '/api/readiness' && method === 'GET') { const result = readiness(readData()); return json(res, result.ok ? 200 : 503, result) }
    if (url.pathname === '/robots.txt' && method === 'GET') { const data = readData(); const base = siteBase(data, req); return text(res, 200, `User-agent: *\nAllow: /\nDisallow: /manage-9f3k7\nDisallow: /api/\nSitemap: ${base}/sitemap.xml\n`, 'text/plain; charset=utf-8') }
    if (url.pathname === '/sitemap.xml' && method === 'GET') return text(res, 200, sitemap(readData(), req), 'application/xml; charset=utf-8')
    if (url.pathname === '/llms.txt' && method === 'GET') return text(res, 200, llms(readData(), req), 'text/plain; charset=utf-8')
    if (url.pathname === '/api/auth/login' && method === 'POST') {
      if (!adminPassword) return json(res, 503, { error: '后台安全密码尚未配置' })
      const input = await body(req)
      if (input.password !== adminPassword) return json(res, 401, { error: '密码不正确' })
      const token = createAdminSessionToken(adminSessionSecret, adminTokenTtlMs)
      return json(res, 200, { token, tokenType: 'Bearer', expiresIn: Math.floor(adminTokenTtlMs / 1000), user: { name: 'SY Admin', role: 'editor' } })
    }
    if (url.pathname === '/api/content' && method === 'GET') return json(res, 200, publicContent(readData(), url.searchParams.get('country') || 'greece'))
    if (url.pathname === '/api/miniprogram/access' && method === 'GET') return json(res, 200, miniProgramAccessPayload(readData()))
    if (url.pathname === '/api/wechat/pay/notify' && method === 'POST') return handleWechatPayNotify(req, res)
    if (url.pathname.startsWith('/api/miniprogram/')) {
      const data = readData()
      if (!isMiniProgramAccessEnabled(data)) return miniProgramMaintenance(res)
    }
    const audioRoute = url.pathname.match(/^\/api\/miniprogram\/audio\/([^/]+)\/(preview|access|full)$/)
    if (audioRoute && ['GET', 'HEAD'].includes(method)) {
      const data = readData()
      const track = visibleTrack(data, audioRoute[1])
      if (!track) return json(res, 404, { code: 'AUDIO_NOT_FOUND', error: '音频不存在、未发布或不可播放' })
      const section = audioRoute[2]
      if (section === 'preview') {
        if (streamPrivateAudio(req, res, { previewFile: track.previewFile, audioFile: track.audioFile }, corsHeaders())) return
        return json(res, 404, { code: 'AUDIO_NOT_FOUND', error: '试听文件不可用' })
      }
      const simulation = miniProgramSimulationEnabled()
      const identity = simulation ? simulationUserIdentity(req) : miniProgramUserFromRequest(req, data)
      const subject = simulation ? identity && (identity.phoneHash ? `sim-phone:${identity.phoneHash}` : `sim-key:${identity.key}`) : identity && `user:${identity.id}`
      const entitlements = identity ? (simulation ? simulationEntitlements(data, identity) : realPaymentEntitlements(data, identity)) : null
      const authorized = audioEntitled(track, entitlements)
      const previewUrl = `/api/miniprogram/audio/${encodeURIComponent(track.id)}/preview`
      if (section === 'access') {
        if (method !== 'GET') return json(res, 405, { code: 'METHOD_NOT_ALLOWED', error: 'method not allowed' })
        const access = authorized ? 'full' : 'preview'
        const token = authorized ? signedAudioToken(track.id, subject || 'anonymous', adminSessionSecret) : null
        return json(res, 200, { id: track.id, access, unlockMode: track.unlockMode, previewSeconds: Math.min(60, Math.max(1, Number(track.previewSeconds) || 60)), previewUrl, fullUrl: token ? `/api/miniprogram/audio/${encodeURIComponent(track.id)}/full?token=${encodeURIComponent(token)}` : null, expiresIn: token ? 300 : null, reason: authorized ? null : track.unlockMode === 'locked' ? 'NO_PRODUCT_CONFIGURED' : !identity ? 'MINIPROGRAM_LOGIN_REQUIRED' : 'AUDIO_ENTITLEMENT_REQUIRED' })
      }
      const signedSubject = verifySignedAudioToken(url.searchParams.get('token'), adminSessionSecret, track.id)
      if (!signedSubject) return json(res, 401, { code: 'AUDIO_TOKEN_REQUIRED', error: '请重新获取播放地址' })
      let playbackIdentity = null
      if (signedSubject === 'anonymous' && track.unlockMode === 'free') playbackIdentity = { anonymous: true }
      else if (simulation && signedSubject.startsWith('sim-phone:')) playbackIdentity = { phoneHash: signedSubject.slice(10), key: '' }
      else if (simulation && signedSubject.startsWith('sim-key:')) playbackIdentity = { key: signedSubject.slice(8) }
      else if (!simulation && signedSubject.startsWith('user:')) playbackIdentity = (data.miniprogramUsers || []).find((user) => user.id === signedSubject.slice(5)) || null
      const playbackEntitlements = playbackIdentity ? (playbackIdentity.anonymous ? null : simulation ? simulationEntitlements(data, playbackIdentity) : realPaymentEntitlements(data, playbackIdentity)) : null
      if (!playbackIdentity || !audioEntitled(track, playbackEntitlements)) return json(res, 403, { code: 'AUDIO_ENTITLEMENT_REQUIRED', error: '尚未获得该音频完整播放权限' })
      if (streamPrivateAudio(req, res, { previewFile: track.previewFile, audioFile: track.audioFile }, corsHeaders())) return
      return json(res, 404, { code: 'AUDIO_NOT_FOUND', error: '音频文件不可用' })
    }
    if (url.pathname === '/api/miniprogram/simulation/session' && method === 'POST') {
      if (!miniProgramSimulationEnabled()) return miniProgramSimulationDisabled(res)
      if (!simulationTokenSecret()) return json(res, 503, { code: 'SIMULATION_SECRET_NOT_CONFIGURED', error: '模拟测试会话未配置签名密钥' })
      const input = await body(req)
      try {
        const phone = normalizeSimulationPhone(input.phone); const phoneHash = simulationPhoneHash(phone)
        return json(res, 200, { simulation: true, accessToken: createSimulationToken(phone), tokenType: 'Bearer', expiresIn: 24 * 60 * 60, user: { id: `sim-phone-${phoneHash.slice(0, 20)}`, phoneBound: true, phoneMasked: maskPhone(phone) } })
      } catch (error) { return json(res, 422, { code: 'INVALID_SIMULATION_PHONE', error: error.message }) }
    }
    if (url.pathname === '/api/miniprogram/knowledge/config' && method === 'GET') {
      if (!miniProgramCommerceEnabled()) return miniProgramSimulationDisabled(res)
      if (!miniProgramSimulationEnabled() && !miniProgramRealPayEnabled()) return miniProgramPaymentUnavailable(res)
      return json(res, 200, miniProgramKnowledgeConfig(readData()))
    }
    if (url.pathname === '/api/miniprogram/entitlements' && method === 'GET') {
      if (miniProgramSimulationEnabled()) {
        const data = readData(); const identity = simulationUserIdentity(req)
        if (!identity) return simulationUserRequired(res)
        return json(res, 200, simulationEntitlements(data, identity))
      }
      if (!miniProgramRealPayEnabled()) return miniProgramPaymentUnavailable(res)
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      return json(res, 200, realPaymentEntitlements(data, user))
    }
    if (url.pathname === '/api/miniprogram/orders' && method === 'GET') {
      if (miniProgramSimulationEnabled()) {
        const data = readData(); const identity = simulationUserIdentity(req)
        if (!identity) return simulationUserRequired(res)
        return json(res, 200, { simulation: true, items: simulationOrders(data, identity).map(publicSimulationOrder) })
      }
      if (!miniProgramRealPayEnabled()) return miniProgramPaymentUnavailable(res)
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      return json(res, 200, { simulation: false, payment: 'wechat-v3', items: realPaymentOrders(data, user).map(publicPaymentOrder) })
    }
    if (url.pathname === '/api/miniprogram/orders' && method === 'POST') {
      const data = readData(); const input = await body(req); const productType = String(input.productType || '').trim(); const attractionId = String(input.attractionId || '').trim()
      if (miniProgramSimulationEnabled()) {
        const identity = simulationUserIdentity(req)
        if (!identity) return simulationUserRequired(res)
        if (!identity.phoneHash) return json(res, 422, { code: 'SIMULATION_PHONE_REQUIRED', error: '创建模拟订单前请先使用手机号创建测试会话' })
        const product = simulationProduct(data, productType)
        if (!product || product.enabled === false) return json(res, 422, { code: 'SIMULATION_PRODUCT_UNAVAILABLE', error: '模拟商品不可用' })
        if (productType === 'attraction' && !(data.attractions || []).some((item) => item.id === attractionId && item.status === 'published')) return json(res, 422, { code: 'ATTRACTION_NOT_FOUND', error: '景点不存在或未发布' })
        const now = new Date().toISOString()
        const order = { id: id('sim-order'), testUser: identity.key, userId: identity.userId, verifiedPhone: identity.phone, phoneHash: identity.phoneHash, phone: identity.phone, status: 'pending', productType, attractionId: productType === 'attraction' ? attractionId : '', name: product.name, price: product.price, currency: product.currency, createdAt: now }
        simulationState(data).orders.push(order); await saveData(data)
        return json(res, 201, { simulation: true, order: publicSimulationOrder(order), payment: null })
      }
      if (!miniProgramRealPayEnabled()) return miniProgramPaymentUnavailable(res)
      const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      if (!user.phone) return json(res, 403, { code: 'PHONE_BIND_REQUIRED', error: '支付前请先绑定手机号' })
      const product = realPaymentProduct(data, productType)
      if (!product) return json(res, 422, { code: 'PAYMENT_PRODUCT_UNAVAILABLE', error: '支付商品不可用或价格未配置' })
      if (productType === 'attraction' && !(data.attractions || []).some((item) => item.id === attractionId && item.status === 'published')) return json(res, 422, { code: 'ATTRACTION_NOT_FOUND', error: '景点不存在或未发布' })
      const now = new Date().toISOString()
      const order = { id: id('mp-order'), outTradeNo: `SY${Date.now()}${crypto.randomBytes(5).toString('hex')}`, userId: user.id, openid: user.openid, phone: user.phone, status: 'pending', productType, attractionId: productType === 'attraction' ? attractionId : '', name: product.description, description: product.description, price: product.price, amountTotal: product.amountTotal, currency: product.currency, createdAt: now }
      try {
        const prepay = await createMiniProgramPrepay(wechatPay, { ...order, openid: user.openid })
        order.prepayId = prepay.prepayId
        paymentOrders(data).push(order); await saveData(data)
        return json(res, 201, { simulation: false, paymentMode: 'wechat-v3', order: publicPaymentOrder(order), payment: prepay.payment })
      } catch (error) {
        console.error('[wechat-pay] prepay failed', JSON.stringify({
          status: Number(error.status) || 0,
          code: error.code || 'WECHAT_PAY_PREPAY_FAILED',
          message: redact(error.message || '微信支付下单失败'),
          appid: wechatPay.appid,
          mchid: wechatPay.mchid,
          serialNo: wechatPay.serialNo,
          outTradeNo: order.outTradeNo,
        }))
        return json(res, error.status >= 400 && error.status < 500 ? 422 : 502, { code: error.code || 'WECHAT_PAY_PREPAY_FAILED', error: '微信支付下单失败，请稍后再试' })
      }
    }
    const paymentOrderMatch = url.pathname.match(/^\/api\/miniprogram\/orders\/([^/]+)$/)
    if (paymentOrderMatch && method === 'GET' && !miniProgramSimulationEnabled()) {
      if (!miniProgramRealPayEnabled()) return miniProgramPaymentUnavailable(res)
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      const order = realPaymentOrders(data, user).find((item) => item.id === paymentOrderMatch[1])
      if (!order) return json(res, 404, { code: 'PAYMENT_ORDER_NOT_FOUND', error: '支付订单不存在' })
      const transaction = await refreshRealPaymentOrder(data, order)
      return json(res, 200, realPaymentOrderResponse(data, user, order, transaction ? { wechatTradeState: transaction.trade_state, wechatTradeStateDescription: transaction.trade_state_desc || '' } : {}))
    }
    const simulationOrderMatch = url.pathname.match(/^\/api\/miniprogram\/orders\/([^/]+)\/(simulate-paid|simulate-failed)$/)
    if (simulationOrderMatch && method === 'POST') {
      if (!miniProgramSimulationEnabled()) return miniProgramSimulationDisabled(res)
      const data = readData(); const identity = simulationUserIdentity(req)
      if (!identity) return simulationUserRequired(res)
      const order = simulationState(data).orders.find((item) => item.id === simulationOrderMatch[1] && (identity.phoneHash ? item.phoneHash === identity.phoneHash : item.testUser === identity.key))
      if (!order) return json(res, 404, { code: 'SIMULATION_ORDER_NOT_FOUND', error: '模拟订单不存在' })
      const nextStatus = simulationOrderMatch[2] === 'simulate-paid' ? 'paid' : 'failed'
      if (order.status === nextStatus) return json(res, 200, simulationOrderResponse(data, identity, order, nextStatus === 'failed' ? { code: 'SIMULATED_PAYMENT_FAILED', message: '模拟支付失败，未授予权益。', idempotent: true } : { idempotent: true }))
      if (order.status !== 'pending') return json(res, 409, { code: 'SIMULATION_ORDER_FINALIZED', error: '模拟订单已完成，不能重复改变状态' })
      order.status = nextStatus; order.updatedAt = new Date().toISOString()
      if (nextStatus === 'paid') order.paidAt = order.updatedAt
      if (nextStatus === 'failed') { order.failedAt = order.updatedAt; order.errorCode = 'SIMULATED_PAYMENT_FAILED'; order.errorMessage = '模拟支付失败，未授予权益。' }
      await saveData(data)
      return json(res, 200, simulationOrderResponse(data, identity, order, nextStatus === 'failed' ? { code: 'SIMULATED_PAYMENT_FAILED', message: '模拟支付失败，未授予权益。' } : {}))
    }
    if (url.pathname === '/api/miniprogram/simulation/reset' && method === 'POST') {
      if (!miniProgramSimulationEnabled()) return miniProgramSimulationDisabled(res)
      const data = readData(); const identity = simulationUserIdentity(req)
      if (!identity) return simulationUserRequired(res)
      const state = simulationState(data); state.orders = state.orders.filter((order) => identity.phoneHash ? order.phoneHash !== identity.phoneHash : order.testUser !== identity.key); await saveData(data)
      return json(res, 200, { simulation: true, reset: true, entitlements: simulationEntitlements(data, identity) })
    }
    const tripApiMatch = url.pathname.match(/^\/api\/trip\/([^/]+)$/)
    if (tripApiMatch && method === 'GET') {
      const data = readData()
      const trip = (data.customTrips || []).find((item) => item.token === tripApiMatch[1])
      if (!trip || trip.status === 'archived') return json(res, 404, { error: '行程链接无效或已失效' })
      return json(res, 200, trip)
    }
    if (url.pathname === '/api/miniprogram/auth/wx-login' && method === 'POST') {
      const input = await body(req)
      if (!input.code) return json(res, 422, { code: 'WX_LOGIN_CODE_REQUIRED', error: '缺少微信登录 code' })
      try {
        const session = await exchangeMiniProgramCode(String(input.code)); const profile = miniProfile(input)
        const data = readData(); data.miniprogramUsers = data.miniprogramUsers || []
        let user = data.miniprogramUsers.find((item) => item.openid === session.openid)
        if (!user) { user = { id: id('mpu'), openid: session.openid, unionid: session.unionid || '', phone: '', nickname: profile.nickname || fallbackMiniNickname(), avatarUrl: profile.avatarUrl, createdAt: new Date().toISOString() }; data.miniprogramUsers.push(user) } else {
          if (session.unionid && user.unionid !== session.unionid) user.unionid = session.unionid
          if (!user.nickname && profile.nickname) user.nickname = profile.nickname
          if (profile.avatarUrl) user.avatarUrl = profile.avatarUrl
          if (!user.nickname) user.nickname = fallbackMiniNickname()
        }
        user.updatedAt = new Date().toISOString(); await saveData(data)
        return json(res, 200, { accessToken: createMiniProgramToken(user.id), tokenType: 'Bearer', expiresIn: 30 * 24 * 60 * 60, user: publicMiniProgramUser(user) })
      } catch (error) { return json(res, error.message === '小程序登录服务尚未配置' ? 503 : 502, { code: 'WECHAT_LOGIN_FAILED', error: error.message }) }
    }
    if (url.pathname === '/api/miniprogram/auth/me' && method === 'GET') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      if (!user.nickname) { user.nickname = fallbackMiniNickname(); await saveData(data) }
      return json(res, 200, { user: publicMiniProgramUser(user) })
    }
    if (url.pathname === '/api/miniprogram/auth/phone' && method === 'POST') {
      const input = await body(req); const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      if (!input.code) return json(res, 422, { code: 'WX_PHONE_CODE_REQUIRED', error: '缺少微信手机号 code' })
      try {
        const result = await exchangePhoneCode(String(input.code)); const phone = normalizedPhone(result.phone_info)
        user.phone = phone; user.phoneBoundAt = new Date().toISOString(); user.updatedAt = new Date().toISOString(); await saveData(data)
        return json(res, 200, { user: publicMiniProgramUser(user) })
      } catch (error) { return json(res, error.message === '小程序登录服务尚未配置' ? 503 : 502, { code: 'WECHAT_PHONE_BIND_FAILED', error: error.message }) }
    }
    if (url.pathname === '/api/miniprogram/profile' && method === 'GET') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      return json(res, 200, miniProgramProfile(data, user))
    }
    if (url.pathname === '/api/miniprogram/profile/avatar' && method === 'POST') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      try {
        const upload = await multipartImage(req)
        user.avatarUrl = saveMiniProgramAvatar(data, req, upload.image, upload.mimeType)
        user.updatedAt = new Date().toISOString()
        await saveData(data)
        return json(res, 200, { user: publicMiniProgramUser(user) })
      } catch (error) {
        const status = error.message === 'payload too large' || error.message.includes('不能超过') ? 413 : 422
        return json(res, status, { code: 'MINIPROGRAM_AVATAR_UPLOAD_FAILED', error: error.message })
      }
    }
    if (url.pathname === '/api/miniprogram/profile' && method === 'PATCH') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      const input = await body(req); const nickname = validMiniNickname(input.nickname)
      if (!nickname) return json(res, 422, { code: 'INVALID_NICKNAME', error: '昵称不能为空或使用无效昵称' })
      user.nickname = nickname; user.updatedAt = new Date().toISOString(); await saveData(data)
      return json(res, 200, { user: publicMiniProgramUser(user) })
    }
    if (url.pathname === '/api/miniprogram/leads' && method === 'GET') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      const leadType = url.searchParams.get('leadType'); const status = url.searchParams.get('status')
      const items = data.leads.filter((lead) => lead.userId === user.id && (!leadType || lead.leadType === leadType) && (!status || lead.status === status)).map((lead) => { const { openid, unionid, ...safeLead } = lead; return safeLead })
      return json(res, 200, { items })
    }
    if (url.pathname === '/api/miniprogram/coupons' && method === 'GET') {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      ensureMiniCollections(user); return json(res, 200, { items: user.coupons })
    }
    const miniCollectionMatch = url.pathname.match(/^\/api\/miniprogram\/(travelers|documents)(?:\/([^/]+))?$/)
    if (miniCollectionMatch && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
      const data = readData(); const user = miniProgramUserFromRequest(req, data)
      if (!user) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
      ensureMiniCollections(user)
      const collection = miniCollectionMatch[1]; const itemId = miniCollectionMatch[2]; const items = user[collection]; const serializer = collection === 'travelers' ? safeTraveler : safeDocument
      if (method === 'GET') {
        if (itemId) { const item = items.find((entry) => entry.id === itemId); return item ? json(res, 200, serializer(item)) : json(res, 404, { error: 'not found' }) }
        return json(res, 200, { items: items.map(serializer) })
      }
      if (method === 'POST') {
        const input = await body(req); const payload = collection === 'travelers' ? travelerPayload(input) : documentPayload(input)
        if (!payload) return json(res, 422, { error: '缺少必填字段 name' })
        const now = new Date().toISOString(); const item = { ...payload, id: id(collection === 'travelers' ? 'traveler' : 'document'), createdAt: now, updatedAt: now }; items.push(item); await saveData(data); return json(res, 201, serializer(item))
      }
      const index = items.findIndex((entry) => entry.id === itemId)
      if (index < 0) return json(res, 404, { error: 'not found' })
      if (method === 'DELETE') { items.splice(index, 1); await saveData(data); return res.writeHead(204).end() }
      const input = await body(req); const payload = collection === 'travelers' ? travelerPayload(input, items[index]) : documentPayload(input, items[index])
      if (!payload) return json(res, 422, { error: '缺少必填字段 name' })
      items[index] = { ...items[index], ...payload, updatedAt: new Date().toISOString() }; await saveData(data); return json(res, 200, serializer(items[index]))
    }
    if (url.pathname === '/api/leads' && method === 'POST') {
      const input = await body(req)
      const data = readData(); let miniProgramUser = null
      if (isMiniProgramLead(input)) {
        if (!isMiniProgramAccessEnabled(data)) return miniProgramMaintenance(res)
        miniProgramUser = miniProgramUserFromRequest(req, data)
        if (!miniProgramUser) return json(res, 401, { code: 'MINIPROGRAM_LOGIN_REQUIRED', error: '请先微信登录' })
        if (!miniProgramUser.phone) return json(res, 403, { code: 'PHONE_BIND_REQUIRED', error: '提交前请先绑定手机号' })
      } else if (!input.contact) return json(res, 422, { error: '请填写联系方式' })
      const lead = { ...input, id: input.id || id('lead'), countryId: input.countryId || 'greece', source: input.source || input.platform || 'website', platform: input.platform || input.source || 'website', leadType: input.leadType || 'customization', status: 'new', createdAt: input.createdAt || new Date().toISOString() }
      if (miniProgramUser) { lead.userId = miniProgramUser.id; lead.contact = miniProgramUser.phone; lead.contactType = 'phone' }
      data.leads.unshift(lead); await saveData(data); void sendLeadNotification(lead)
      return json(res, 201, lead)
    }
    if (url.pathname.startsWith('/api/admin/')) {
      if (!isAdmin(req)) return json(res, 401, { error: '未授权，请先登录后台' })
      const data = readData()
      const masterMatch = url.pathname.match(/^\/api\/admin\/(countries|guides)(?:\/([^/]+))?$/)
      if (masterMatch && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        const collection = masterMatch[1]; const itemId = masterMatch[2]
        if (method === 'GET') return json(res, 200, { items: data[collection] || [] })
        data[collection] = Array.isArray(data[collection]) ? data[collection] : []
        if (method === 'POST') { const input = await body(req); const item = { ...input, id: input.id || id(collection.slice(0, -1)), ...(collection === 'guides' ? { countryId: input.countryId || 'greece' } : {}) }; data[collection].push(item); await saveData(data); return json(res, 201, item) }
        const index = data[collection].findIndex((item) => item.id === itemId)
        if (index < 0) return json(res, 404, { error: 'not found' })
        if (method === 'DELETE') { data[collection].splice(index, 1); await saveData(data); return res.writeHead(204).end() }
        data[collection][index] = { ...data[collection][index], ...(await body(req)), id: itemId }; await saveData(data); return json(res, 200, data[collection][index])
      }
      if (url.pathname === '/api/admin/stats' && method === 'GET') return json(res, 200, { routes: data.routes.filter((x) => x.status === 'published').length, destinations: data.destinations.filter((x) => x.status === 'published').length, leads: data.leads.length, pendingLeads: data.leads.filter((x) => x.status === 'new').length, customizationLeads: data.leads.filter((x) => x.leadType === 'customization').length, guideBookings: data.leads.filter(isGuideBooking).length, pendingGuideBookings: data.leads.filter((x) => isGuideBooking(x) && x.status === 'new').length, miniProgramBookings: data.leads.filter(isMiniProgramBooking).length, vehicleConsultations: data.leads.filter((x) => x.leadType === 'vehicle-consultation').length, knowledgeBaseLeads: data.leads.filter((x) => x.leadType === 'knowledge-base').length, businessTravelLeads: data.leads.filter((x) => x.leadType === 'business-travel').length, attractions: (data.attractions || []).filter((x) => x.status === 'published').length, sampleItineraries: (data.sampleItineraries || []).filter((x) => x.status === 'published').length, customTrips: (data.customTrips || []).filter((x) => x.status !== 'archived').length, commerce: adminCommerceStats(data) })
      if (url.pathname === '/api/admin/guide-bookings' && method === 'GET') return json(res, 200, data.leads.filter(isGuideBooking))
      if (url.pathname === '/api/admin/miniprogram-bookings' && method === 'GET') return json(res, 200, data.leads.filter(isMiniProgramBooking))
      if (url.pathname === '/api/admin/miniprogram-orders' && method === 'GET') return json(res, 200, adminPaymentSummary(data))
      if (url.pathname === '/api/admin/settings' && method === 'GET') {
        const { homeBanners: _homeBanners, ...settings } = data.settings || {}
        return json(res, 200, settings)
      }
      if (url.pathname === '/api/admin/settings' && method === 'PATCH') {
        const { homeBanners: _homeBanners, ...input } = await body(req)
        data.settings = { ...data.settings, ...input }
        await saveData(data)
        const { homeBanners: _savedHomeBanners, ...settings } = data.settings
        return json(res, 200, settings)
      }
      const miniProgramBannerMatch = url.pathname.match(/^\/api\/admin\/miniprogram-home-banners(?:\/([^/]+))?$/)
      if (miniProgramBannerMatch && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        data.home = data.home && typeof data.home === 'object' ? data.home : {}
        const current = (Array.isArray(data.homeBanners) ? data.homeBanners : (Array.isArray(data.settings?.homeBanners) ? data.settings.homeBanners : data.home.banners || [])).map((item, index) => normalizeHomeBanner(item, index + 1))
        const itemId = miniProgramBannerMatch[1]
        if (method === 'GET') return json(res, 200, { items: current.sort((a, b) => a.sort - b.sort) })
        if (method === 'POST') {
          const input = await body(req); const payload = homeBannerPayload(input)
          if (!payload) return json(res, 422, { error: '请填写标题、描述、替代文案并上传图片' })
          const now = new Date().toISOString(); const item = { ...payload, id: input.id || id('home-banner'), createdAt: now, updatedAt: now }
          setHomeBanners(data, [...current, item]); await saveData(data); return json(res, 201, item)
        }
        const index = current.findIndex((item) => item.id === itemId)
        if (index < 0) return json(res, 404, { error: 'not found' })
        if (method === 'DELETE') { current.splice(index, 1); setHomeBanners(data, current); await saveData(data); return res.writeHead(204).end() }
        const input = await body(req); const payload = homeBannerPayload(input, current[index])
        if (!payload) return json(res, 422, { error: '请填写标题、描述、替代文案并上传图片' })
        current[index] = { ...current[index], ...payload, id: itemId, updatedAt: new Date().toISOString() }; setHomeBanners(data, current); await saveData(data); return json(res, 200, current[index])
      }
      const homeBannerMatch = url.pathname.match(/^\/api\/admin\/home-banners(?:\/([^/]+))?$/)
      if (homeBannerMatch && ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const bannerId = homeBannerMatch[1] ? decodeURIComponent(homeBannerMatch[1]) : ''
        const current = (Array.isArray(data.homeBanners) ? data.homeBanners : (Array.isArray(data.settings?.homeBanners) ? data.settings.homeBanners : data.home?.banners || [])).map((item, index) => normalizeHomeBanner(item, index + 1))
        if (method === 'GET') {
          const sorted = current.slice().sort((a, b) => a.sort - b.sort)
          if (!bannerId) return json(res, 200, sorted)
          const banner = sorted.find((item) => item.id === bannerId)
          return banner ? json(res, 200, banner) : json(res, 404, { error: 'not found' })
        }
        if (method === 'PUT') {
          const input = await body(req)
          if (!Array.isArray(input.items)) return json(res, 422, { error: 'items 必须是数组' })
          const next = input.items.map((item, index) => normalizeHomeBanner(item, index + 1))
          if (next.some((item) => !item.image)) return json(res, 422, { error: '每个 Banner 必须有图片' })
          if (new Set(next.map((item) => item.id)).size !== next.length) return json(res, 409, { error: 'Banner ID 不能重复' })
          setHomeBanners(data, next)
          await saveData(data)
          return json(res, 200, next.slice().sort((a, b) => a.sort - b.sort))
        }
        if (method === 'POST') {
          const input = await body(req)
          if (!input.image) return json(res, 422, { error: 'Banner 必须有图片' })
          const banner = normalizeHomeBanner({ ...input, id: input.id || id('home-banner') }, current.length + 1)
          if (current.some((item) => item.id === banner.id)) return json(res, 409, { error: 'Banner ID 已存在' })
          setHomeBanners(data, [...current, banner])
          await saveData(data)
          return json(res, 201, banner)
        }
        const index = current.findIndex((item) => item.id === bannerId)
        if (index < 0) return json(res, 404, { error: 'not found' })
        if (method === 'DELETE') {
          current.splice(index, 1)
          setHomeBanners(data, current)
          await saveData(data)
          return res.writeHead(204).end()
        }
        const input = await body(req)
        const banner = normalizeHomeBanner({ ...current[index], ...input, id: bannerId }, index + 1)
        if (!banner.image) return json(res, 422, { error: 'Banner 必须有图片' })
        current[index] = banner
        setHomeBanners(data, current)
        await saveData(data)
        return json(res, 200, banner)
      }
      const heritageAdmin = url.pathname.match(/^\/api\/admin\/(audioAlbums|audioRoutes|audioTracks)(?:\/([^/]+))?$/)
      if (heritageAdmin && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        const collection = heritageAdmin[1]; const itemId = heritageAdmin[2] || ''
        data[collection] = Array.isArray(data[collection]) ? data[collection] : []
        const items = data[collection]
        if (method === 'GET') return json(res, 200, items)
        const index = items.findIndex((item) => item.id === itemId)
        if (method === 'DELETE') {
          if (index < 0) return json(res, 404, { code: 'CONTENT_NOT_FOUND', error: '记录不存在' })
          if (collection === 'audioAlbums' && (data.audioTracks || []).some((track) => track.albumId === itemId)) return json(res, 409, { code: 'CONTENT_IN_USE', error: '专辑仍有关联节目，请先下架或移除节目' })
          if (collection === 'audioRoutes' && (data.audioTracks || []).some((track) => track.routeId === itemId)) return json(res, 409, { code: 'CONTENT_IN_USE', error: '路线仍有关联音频，请先移除音频关联' })
          items.splice(index, 1); await saveData(data); return res.writeHead(204).end()
        }
        if (method === 'PATCH' && index < 0) return json(res, 404, { code: 'CONTENT_NOT_FOUND', error: '记录不存在' })
        const input = await body(req)
        const previous = method === 'PATCH' ? items[index] : {}
        const payload = { ...previous, ...input, id: method === 'PATCH' ? itemId : input.id || id(collection.slice(0, -1)), status: input.status || previous.status || 'unpublished' }
        if (items.some((item, position) => item.id === payload.id && (method === 'POST' || position !== index))) return json(res, 409, { code: 'DUPLICATE_ID', error: 'ID 已存在' })
        // Never accept client-selected paths. Only keys previously issued by the authenticated private upload endpoint.
        if (collection === 'audioTracks' && (payload.audioFile !== previous.audioFile || payload.previewFile !== previous.previewFile || payload.durationSeconds !== previous.durationSeconds || payload.previewSeconds !== previous.previewSeconds)) {
          const uploaded = data.audioUploads?.find((upload) => upload.audioFile === payload.audioFile && upload.previewFile === payload.previewFile && upload.durationSeconds === Number(payload.durationSeconds) && upload.previewSeconds === Number(payload.previewSeconds))
          if (!uploaded) return json(res, 422, { code: 'INVALID_AUDIO_UPLOAD', error: '请通过后台音频上传后再保存' })
        }
        const error = validateHeritageRecord(collection, payload, data, previous)
        if (error) return json(res, 422, { code: 'CONTENT_VALIDATION_FAILED', error })
        if (method === 'POST') items.push(payload)
        else items[index] = payload
        await saveData(data)
        return json(res, method === 'POST' ? 201 : 200, payload)
      }
      if (url.pathname === '/api/admin/upload-audio' && method === 'POST') {
        const input = await body(req, 42 * 1024 * 1024)
        try {
          const result = uploadPrivateAudio(input)
          data.audioUploads = Array.isArray(data.audioUploads) ? data.audioUploads : []
          data.audioUploads.push(result)
          await saveData(data)
          return json(res, 201, result)
        } catch (error) { return json(res, 422, { code: 'INVALID_AUDIO_UPLOAD', error: error.message }) }
      }
      if (url.pathname === '/api/admin/upload-image' && method === 'POST') {
        const input = await body(req, 8 * 1024 * 1024)
        const match = String(input.data || '').match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/)
        if (!match) return json(res, 422, { error: '仅支持 PNG、JPG 或 WebP 图片' })
        const buffer = Buffer.from(match[2], 'base64')
        if (!buffer.length || buffer.length > 6 * 1024 * 1024) return json(res, 413, { error: '图片大小需在 6MB 以内' })
        const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1]
        const prefix = String(input.prefix || 'og').replace(/[^a-z0-9-]/gi, '').slice(0, 20) || 'image'
        const filename = `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${extension}`
        writeRuntimeImage(filename, buffer)
        if (input.updateSettings !== false) {
          data.settings = { ...data.settings, ogImage: `images/${filename}` }
          await saveData(data)
        }
        return json(res, 201, { path: input.updateSettings === false ? filename : `images/${filename}`, url: `/${`images/${filename}`}` })
      }
      if (url.pathname === '/api/admin/miniprogram-users' && method === 'GET') return json(res, 200, { items: (data.miniprogramUsers || []).map((user) => adminMiniUserSummary(data, user)) })
      const miniUserMatch = url.pathname.match(/^\/api\/admin\/miniprogram-users\/([^/]+)$/)
      if (miniUserMatch && method === 'GET') {
        const user = (data.miniprogramUsers || []).find((item) => item.id === miniUserMatch[1])
        if (!user) return json(res, 404, { error: 'not found' })
        ensureMiniCollections(user)
        return json(res, 200, { ...adminMiniUserSummary(data, user), travelers: user.travelers.map((item) => safeTraveler(item, true)), documents: user.documents.map((item) => safeDocument(item, true)), coupons: user.coupons.map(safeCoupon) })
      }
      if (miniUserMatch && method === 'PATCH') {
        const user = (data.miniprogramUsers || []).find((item) => item.id === miniUserMatch[1])
        if (!user) return json(res, 404, { error: 'not found' })
        const payload = adminMiniUserPayload(await body(req), user)
        if (!payload) return json(res, 422, { error: '请输入有效昵称；手机号应为 7–20 位数字' })
        Object.assign(user, payload, { updatedAt: new Date().toISOString() }); await saveData(data)
        return json(res, 200, adminMiniUserSummary(data, user))
      }
      const miniCollectionAdminMatch = url.pathname.match(/^\/api\/admin\/miniprogram-(travelers|documents|coupons)(?:\/([^/]+))?$/)
      if (miniCollectionAdminMatch && ['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) {
        const collection = miniCollectionAdminMatch[1]; const itemId = miniCollectionAdminMatch[2]; const serializer = collection === 'travelers' ? safeTraveler : collection === 'documents' ? safeDocument : safeCoupon
        if (method === 'GET') return json(res, 200, { items: adminMiniRecords(data, collection) })
        if (method === 'POST') {
          const input = await body(req); const user = (data.miniprogramUsers || []).find((item) => item.id === input.userId)
          if (!user) return json(res, 404, { error: 'user not found' })
          ensureMiniCollections(user); const payload = collection === 'travelers' ? travelerPayload(input) : collection === 'documents' ? documentPayload(input) : couponPayload(input)
          if (!payload) return json(res, 422, { error: '缺少必填字段' })
          const now = new Date().toISOString(); const item = { ...payload, id: id(collection === 'travelers' ? 'traveler' : collection === 'documents' ? 'document' : 'coupon'), createdAt: now, updatedAt: now }; user[collection].push(item); await saveData(data); return json(res, 201, { ...(collection === 'travelers' ? safeTraveler(item, true) : collection === 'documents' ? safeDocument(item, true) : serializer(item)), userId: user.id, userNickname: user.nickname || user.id })
        }
        const found = findMiniRecord(data, collection, itemId)
        if (!found) return json(res, 404, { error: 'not found' })
        if (method === 'DELETE') { found.items.splice(found.items.indexOf(found.item), 1); await saveData(data); return res.writeHead(204).end() }
        const input = await body(req); const payload = collection === 'travelers' ? travelerPayload(input, found.item) : collection === 'documents' ? documentPayload(input, found.item) : couponPayload(input, found.item)
        if (!payload) return json(res, 422, { error: '缺少必填字段' })
        Object.assign(found.item, payload, { updatedAt: new Date().toISOString() }); await saveData(data); return json(res, 200, { ...(collection === 'travelers' ? safeTraveler(found.item, true) : collection === 'documents' ? safeDocument(found.item, true) : serializer(found.item)), userId: found.user.id, userNickname: found.user.nickname || found.user.id })
      }
      const match = url.pathname.match(/^\/api\/admin\/(cities|routes|destinations|attractions|sampleItineraries|customTrips|leads|destinationTypes|destinationCategories)(?:\/([^/]+))?$/)
      if (match) {
        const collection = match[1] === 'destinationTypes' ? 'destinationCategories' : match[1]
        if (!data[collection]) data[collection] = []
        if (collection === 'customTrips' && method === 'POST') {
          const input = await body(req)
          if (!input.client || !input.period) return json(res, 422, { error: '请填写客户称呼与行程日期' })
          const now = new Date().toISOString()
          const trip = { ...input, id: input.id || id('customTrip'), token: input.token || `${(input.orderNo || 'trip').toLowerCase().replace(/[^a-z0-9]/g, '')}${crypto.randomBytes(4).toString('hex')}`, status: input.status || 'active', createdAt: input.createdAt || now, updatedAt: now }
          data.customTrips.unshift(trip); await saveData(data)
          return json(res, 201, trip)
        }
        if (collection === 'leads' && method === 'GET' && url.searchParams.has('leadType')) return json(res, 200, leadsOfType(data.leads, url.searchParams.get('leadType')))
        if (collection === 'destinationCategories') {
          if (method === 'GET') return json(res, 200, data.destinationCategories.map((item) => ({ ...item, id: item.key })))
          const input = method === 'DELETE' ? {} : await body(req)
          const payload = { ...input, key: input.key || input.id, enabled: input.enabled !== false }
          const itemId = match[2]
          if (method === 'POST') {
            if (!payload.key || !payload.name) return json(res, 422, { error: '请填写分类 ID 与名称' })
            if (data.destinationCategories.some((item) => item.key === payload.key)) return json(res, 409, { error: '分类 ID 已存在' })
            data.destinationCategories.push(payload); await saveData(data)
            return json(res, 201, { ...payload, id: payload.key })
          }
          const index = data.destinationCategories.findIndex((item) => item.key === itemId)
          if (index < 0) return json(res, 404, { error: 'not found' })
          if (method === 'DELETE') {
            if ((data.destinations || []).some((item) => item.type === itemId)) return json(res, 409, { error: '仍有目的地使用此分类，请先重新分配' })
            data.destinationCategories.splice(index, 1); await saveData(data)
            return res.writeHead(204).end()
          }
          if (method === 'PATCH') {
            data.destinationCategories[index] = { ...data.destinationCategories[index], ...payload, key: itemId }
            await saveData(data); return json(res, 200, { ...data.destinationCategories[index], id: itemId })
          }
          return json(res, 405, { error: 'method not allowed' })
        }
        const payload = method === 'GET' || method === 'DELETE' ? {} : await body(req)
        const result = await collectionHandler(data, collection, method, match[2] ? `/api/admin/${collection}/${match[2]}` : url.pathname, payload)
        if (result.status === 204) return res.writeHead(204).end()
        return json(res, result.status, result.body)
      }
      return json(res, 404, { error: 'api route not found' })
    }

    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)
    const safePath = normalize(requested).replace(/^\.\.(\/|\\)/, '')
    const filePath = join(distDir, safePath)
    const publicImagePath = safePath.startsWith('/images/') ? join(root, 'public', safePath.slice(1)) : ''
    const fallback = join(distDir, 'index.html')
    const target = existsSync(filePath) ? filePath : publicImagePath && existsSync(publicImagePath) ? publicImagePath : fallback
    const extension = extname(target)
    const cacheControl = immutableExtensions.has(extension) ? 'public, max-age=31536000, immutable' : extension === '.html' ? 'no-cache' : 'public, max-age=300'
    if (['.m4a', '.mp3'].includes(extension.toLowerCase()) && ['GET', 'HEAD'].includes(method)) {
      const size = statSync(target).size
      const rangeHeader = method === 'GET' ? req.headers.range : ''
      let start = 0
      let end = size - 1
      let status = 200
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/i.exec(String(rangeHeader).trim())
        if (!match || (!match[1] && !match[2]) || size === 0) {
          res.writeHead(416, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${size}`, 'Content-Length': '0' })
          return res.end()
        }
        if (!match[1]) {
          const suffixLength = Number(match[2])
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            res.writeHead(416, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${size}`, 'Content-Length': '0' })
            return res.end()
          }
          start = Math.max(0, size - suffixLength)
        } else {
          start = Number(match[1])
          end = match[2] ? Number(match[2]) : size - 1
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
            res.writeHead(416, { 'Accept-Ranges': 'bytes', 'Content-Range': `bytes */${size}`, 'Content-Length': '0' })
            return res.end()
          }
          end = Math.min(end, size - 1)
        }
        status = 206
      }
      const headers = {
        'Content-Type': mime[extension] || 'application/octet-stream',
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(size === 0 ? 0 : end - start + 1),
      }
      if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${size}`
      res.writeHead(status, headers)
      if (method === 'HEAD' || size === 0) return res.end()
      const stream = createReadStream(target, { start, end })
      stream.on('error', (error) => { console.error('Static audio stream failed:', error); if (!res.destroyed) res.destroy() })
      return stream.pipe(res)
    }
    res.writeHead(200, { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': cacheControl })
    const page = extension === '.html' && method === 'GET' ? injectSeoHtml(readFileSync(target), pageSeo(readData(), url.pathname, url.search, req)) : readFileSync(target)
    res.end(page)
  } catch (error) {
    console.error('Request handler failed:', error)
    if (res.headersSent) {
      if (!res.writableEnded) res.end()
      return
    }
    json(res, error.message === 'payload too large' ? 413 : 400, { error: error.message })
  }
})

async function start() {
  try {
    await initStorage()
    const data = readData()
    const defaultCountry = { id: 'greece', name: '希腊', nameTw: '希臘', nameEn: 'Greece', enabled: true, sort: 1, heroImage: 'santorini.webp' }
    const defaultGuide = { id: 'richard-li', countryId: 'greece', name: 'Richard 李', nameTw: 'Richard 李', nameEn: 'Richard Li', role: '名人导游', roleTw: '名人導遊', roleEn: 'Signature guide', intro: '希腊历史人文与私人路线顾问', introTw: '希臘歷史人文與私人路線顧問', introEn: 'Greek history, culture and private route specialist', avatar: 'richard-avatar.webp', fullImage: 'richard-profile.webp', location: '雅典 / 圣托里尼', wechat: 'SY-GREECE-01', eyebrow: 'EUROPEAN SIGNATURE GUIDE', proof: '武汉大学双学士 · 英国澳洲双硕士', credentials: [], directions: [], reviews: [], featured: true, enabled: true, sort: 1 }
    data.countries = Array.isArray(data.countries) && data.countries.length ? data.countries.map((item) => ({ ...defaultCountry, ...item })) : [defaultCountry]
    data.guides = Array.isArray(data.guides) && data.guides.length ? data.guides.map((item) => ({ ...defaultGuide, ...item })) : [defaultGuide]
    const richardDetails = { storyTitle: '先认识本人，再决定这次如何徐徐深入', story1: '旅居欧美多年，我一直把希腊当成一座可以慢慢读的博物馆。历史、人文、秘境与镜头感，交给真正生活在这里的人。', story2: '我不负责把行程塞满，而是希望你离开时，仍记得某一束光、某一段海岸，以及途中那些没有被攻略写下的细节。', storyNote: '旅行最珍贵的，不是走过多少地方，而是终于有人替你读懂沿途的故事。', quoteKicker: 'Richard 李 · 在地深度陪同', quote: '把一簇辉映，变成一段真正有温度的希腊经验', quoteFoot: '武汉大学双学士 · 英国澳洲双硕士 · 欧盟 / 美国 / 中国驾照', credentialsTitle: '三项背书，足够放心与他一起探索希腊', credentials: [{ index: '01', title: '名校教育', desc: '武汉大学双学士\n英国澳洲双硕士' }, { index: '02', title: '资深履历', desc: '资深定制旅行规划师\n欧洲精品文旅金牌从业者' }, { index: '03', title: '在地资质', desc: '欧盟 · 美国 · 中国\n驾照兼备' }], signatureTitle: '他最擅长的四种希腊时光', directions: [{ key: 'history', index: '01', title: '雅典文明', subtitle: '历史与建筑讲解', desc: '从卫城到古市集，把课本里的文明讲成一次有温度的探索。', suitable: '适合：第一次到访 / 亲子家庭', duration: '半日 · 1日' }, { key: 'culture', index: '02', title: '圣地人文', subtitle: '信仰与建筑', desc: '深入德尔斐、梅黛奥拉等圣地，读懂石头背后的信仰与时间。', suitable: '适合：深度文化 / 摄影爱好者', duration: '1日 · 多日' }, { key: 'coast', index: '03', title: '小众秘境', subtitle: '海岸线与岛屿', desc: '避开人潮，沿着海岸线去看当地人才知道的蓝与风。', suitable: '适合：情侣蜜月 / 朋友出行', duration: '1日 · 多日' }, { key: 'photo', index: '04', title: '私人摄影', subtitle: '路线规划与记录', desc: '把光线、节奏和路线交给我，留下自然、不摆拍的旅行影像。', suitable: '适合：纪念日 / 家庭旅拍', duration: '半日 · 1日' }], reviewsTitle: '他们这样记住 Richard', reviews: [{ quote: '学识渊博，谈吐儒雅。一路上孩子听得入迷，大人也真正看懂了雅典。', name: '北京 · L女士', meta: '亲子文化之旅' }, { quote: '专业靠谱又细心体贴，临时调整路线也安排得很稳，拍照尤其好看。', name: '上海 · K先生', meta: '圣岛蜜月之旅' }, { quote: '不赶景点，更像和一位老朋友探索希腊。小众海岸线比想象中更惊喜。', name: '广州 · M女士', meta: '海岛深度定制' }] }
    data.guides = data.guides.map((item) => item.id === 'richard-li' ? { ...richardDetails, ...item, credentials: Array.isArray(item.credentials) && item.credentials.length ? item.credentials : richardDetails.credentials, directions: Array.isArray(item.directions) && item.directions.length ? item.directions : richardDetails.directions, reviews: Array.isArray(item.reviews) && item.reviews.length ? item.reviews : richardDetails.reviews } : item)
    for (const collection of ['routes', 'destinations', 'attractions', 'sampleItineraries', 'cities']) for (const item of data[collection] || []) item.countryId = item.countryId || 'greece'
    // Keep the denormalised city label aligned with the city ID for existing records too.
    for (const attraction of data.attractions || []) Object.assign(attraction, normalizeAttractionPayload(data, attraction))
    // Migrate legacy destinationTypes once, without changing destinations[].type.
    if (!Array.isArray(data.destinationCategories) || !data.destinationCategories.length) {
      const defaults = {
        culture: { name: '文明溯源', nameTw: '文明溯源', nameEn: 'Civilization Origins', description: '古典文明遗址，历史古城', sort: 1 },
        mountain: { name: '山海遗堡', nameTw: '山海遺堡', nameEn: 'Mountain & Sea Heritage', description: '山地古堡与自然遗迹', sort: 2 },
        island: { name: '爱琴海境', nameTw: '愛琴海境', nameEn: 'Aegean Escapes', description: '岛屿海岸线旅游地', sort: 3 },
      }
      const legacy = Array.isArray(data.destinationTypes) ? data.destinationTypes : []
      data.destinationCategories = (legacy.length ? legacy : Object.entries(defaults).map(([id, item]) => ({ id, ...item }))).map((item) => {
        const key = item.key || item.id
        const fallback = defaults[key] || {}
        return { key, name: item.name || fallback.name || key, nameTw: item.nameTw || fallback.nameTw || '', nameEn: item.nameEn || fallback.nameEn || '', description: item.description || fallback.description || '', sort: Number(item.sort ?? fallback.sort) || 0, enabled: item.enabled !== false && item.status !== 'archived' }
      })
    }
    // Keep legacy admin routes and stored consumers functional during the migration.
    data.destinationTypes = data.destinationCategories.map((item) => ({ id: item.key, name: item.name, description: item.description || '', sort: item.sort || 0, status: item.enabled === false ? 'unpublished' : 'published' }))
    data.home = data.home && typeof data.home === 'object' ? data.home : {}
    data.home.banners = Array.isArray(data.home.banners) ? data.home.banners : []
    for (const lead of data.leads || []) lead.countryId = lead.countryId || 'greece'
    await saveData(data)
    server.listen(port, '127.0.0.1', () => console.log(`Greece Travel Butler server: http://127.0.0.1:${port}/ (console: /manage-9f3k7)`))
  } catch (error) {
    console.error(`Storage initialization failed: ${error.message}`)
    process.exitCode = 1
  }
}

process.once('SIGTERM', async () => { await closeStorage(); process.exit(0) })
process.once('SIGINT', async () => { await closeStorage(); process.exit(0) })
start()
