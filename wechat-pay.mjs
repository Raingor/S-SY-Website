import { createDecipheriv, createSign, createVerify, randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

function envValue(env, key) {
  return String(env[key] || '').trim()
}

export function wechatPayConfig(env = process.env) {
  return {
    appid: envValue(env, 'WX_APPID'),
    mchid: envValue(env, 'WX_PAY_MCHID'),
    apiV3Key: envValue(env, 'WX_PAY_API_V3_KEY'),
    privateKeyPath: envValue(env, 'WX_PAY_PRIVATE_KEY_PATH'),
    serialNo: envValue(env, 'WX_PAY_SERIAL_NO'),
    publicKeyPath: envValue(env, 'WX_PAY_PUBLIC_KEY_PATH'),
    publicKeyId: envValue(env, 'WX_PAY_PUBLIC_KEY_ID'),
    notifyUrl: envValue(env, 'WX_PAY_NOTIFY_URL'),
    apiBase: (envValue(env, 'WX_PAY_API_BASE') || 'https://api.mch.weixin.qq.com').replace(/\/$/, '')
  }
}

export function realPayRequestReady(config) {
  return Boolean(config.appid && config.mchid && config.apiV3Key && config.privateKeyPath && existsSync(config.privateKeyPath) && config.serialNo && /^https:\/\//i.test(config.notifyUrl))
}

export function realPayNotifyReady(config) {
  return Boolean(realPayRequestReady(config) && config.publicKeyPath && existsSync(config.publicKeyPath) && config.publicKeyId)
}

function privateKey(config) {
  return readFileSync(config.privateKeyPath, 'utf8')
}

function signText(text, key) {
  const signer = createSign('RSA-SHA256')
  signer.update(text)
  signer.end()
  return signer.sign(key).toString('base64')
}

export function buildWechatAuthorization(config, method, path, body, timestamp = Math.floor(Date.now() / 1000), nonce = randomBytes(16).toString('hex')) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body || {})
  const message = `${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${payload}\n`
  const signature = signText(message, privateKey(config))
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
}

export function buildMiniProgramPayment(config, prepayId, timestamp = Math.floor(Date.now() / 1000), nonce = randomBytes(16).toString('hex')) {
  const timeStamp = String(timestamp)
  const packageValue = `prepay_id=${prepayId}`
  const paySign = signText(`${config.appid}\n${timeStamp}\n${nonce}\n${packageValue}\n`, privateKey(config))
  return { timeStamp, nonceStr: nonce, package: packageValue, signType: 'RSA', paySign }
}

export async function createMiniProgramPrepay(config, order) {
  const body = {
    appid: config.appid,
    mchid: config.mchid,
    description: order.description,
    out_trade_no: order.outTradeNo,
    notify_url: config.notifyUrl,
    amount: { total: order.amountTotal, currency: order.currency || 'CNY' },
    payer: { openid: order.openid }
  }
  const bodyText = JSON.stringify(body)
  const response = await fetch(`${config.apiBase}/v3/pay/transactions/jsapi`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: buildWechatAuthorization(config, 'POST', '/v3/pay/transactions/jsapi', bodyText)
    },
    body: bodyText,
    signal: AbortSignal.timeout(10000)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.prepay_id) {
    const error = new Error(payload.message || payload.code || '微信支付下单失败')
    error.code = payload.code || 'WECHAT_PAY_PREPAY_FAILED'
    error.status = response.status
    throw error
  }
  return { prepayId: payload.prepay_id, payment: buildMiniProgramPayment(config, payload.prepay_id) }
}

export async function queryWechatTransaction(config, outTradeNo) {
  const path = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.mchid)}`
  const response = await fetch(`${config.apiBase}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: buildWechatAuthorization(config, 'GET', path, '')
    },
    signal: AbortSignal.timeout(10000)
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.trade_state) {
    const error = new Error(payload.message || payload.code || '微信支付订单查询失败')
    error.code = payload.code || 'WECHAT_PAY_QUERY_FAILED'
    error.status = response.status
    throw error
  }
  return payload
}

export function verifyWechatNotify(config, headers, rawBody) {
  const timestamp = String(headers['wechatpay-timestamp'] || '')
  const nonce = String(headers['wechatpay-nonce'] || '')
  const signature = String(headers['wechatpay-signature'] || '')
  const serial = String(headers['wechatpay-serial'] || '')
  if (!timestamp || !nonce || !signature || serial !== config.publicKeyId) return false
  const verifier = createVerify('RSA-SHA256')
  verifier.update(`${timestamp}\n${nonce}\n${rawBody}\n`)
  verifier.end()
  return verifier.verify(readFileSync(config.publicKeyPath, 'utf8'), Buffer.from(signature, 'base64'))
}

export function decryptWechatNotify(config, resource) {
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(config.apiV3Key, 'utf8'), Buffer.from(resource.nonce, 'utf8'))
  decipher.setAAD(Buffer.from(resource.associated_data || '', 'utf8'))
  decipher.setAuthTag(Buffer.from(resource.tag, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(resource.ciphertext, 'base64')), decipher.final()]).toString('utf8')
}

export function amountToFen(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}
