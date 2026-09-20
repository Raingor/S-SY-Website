import assert from 'node:assert/strict'
import { createCipheriv, createSign, generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { amountToFen, buildMiniProgramPayment, buildWechatAuthorization, createMiniProgramPrepay, decryptWechatNotify, queryWechatTransaction, realPayNotifyReady, realPayRequestReady, verifyWechatNotify } from '../wechat-pay.mjs'

const temp = mkdtempSync(join(tmpdir(), 'sy-wechat-pay-'))
try {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
  const privateKeyPath = join(temp, 'apiclient_key.pem')
  const publicKeyPath = join(temp, 'pub_key.pem')
  writeFileSync(privateKeyPath, privateKey)
  writeFileSync(publicKeyPath, publicKey)
  const config = { appid: 'wx-test-appid', mchid: '1722439618', apiV3Key: '12345678901234567890123456789012', privateKeyPath, serialNo: 'merchant-serial', publicKeyPath, publicKeyId: 'wechat-public-key', notifyUrl: 'https://example.test/api/wechat/pay/notify', apiBase: 'https://api.example.test' }

  assert.equal(realPayRequestReady(config), true)
  assert.equal(realPayNotifyReady(config), true)
  assert.equal(amountToFen(0.01), 1)

  const authorization = buildWechatAuthorization(config, 'POST', '/v3/pay/transactions/jsapi', '{"ok":true}', 1700000000, 'nonce-fixed')
  assert.match(authorization, /^WECHATPAY2-SHA256-RSA2048 /)
  const payment = buildMiniProgramPayment(config, 'wx-prepay-id', 1700000000, 'nonce-payment')
  assert.equal(payment.package, 'prepay_id=wx-prepay-id')
  assert.equal(payment.signType, 'RSA')

  const originalFetch = globalThis.fetch
  let prepayRequest = null
  globalThis.fetch = async (url, options) => {
    prepayRequest = { url, options }
    return { ok: true, status: 200, json: async () => ({ prepay_id: 'wx-prepay-id' }) }
  }
  const prepay = await createMiniProgramPrepay(config, { description: '测试景点讲解', outTradeNo: 'SY-test-order', amountTotal: 1, currency: 'CNY', openid: 'openid-test' })
  globalThis.fetch = originalFetch
  assert.equal(prepay.prepayId, 'wx-prepay-id')
  assert.equal(prepayRequest.url, 'https://api.example.test/v3/pay/transactions/jsapi')
  assert.match(prepayRequest.options.headers.Authorization, /^WECHATPAY2-SHA256-RSA2048 /)
  assert.equal(JSON.parse(prepayRequest.options.body).payer.openid, 'openid-test')

  let queryRequest = null
  globalThis.fetch = async (url, options) => {
    queryRequest = { url, options }
    return { ok: true, status: 200, json: async () => ({ trade_state: 'SUCCESS', trade_state_desc: '支付成功', transaction_id: 'wx-transaction' }) }
  }
  const transaction = await queryWechatTransaction(config, 'SY-test-order')
  globalThis.fetch = originalFetch
  assert.equal(transaction.trade_state, 'SUCCESS')
  assert.equal(queryRequest.url, 'https://api.example.test/v3/pay/transactions/out-trade-no/SY-test-order?mchid=1722439618')
  assert.match(queryRequest.options.headers.Authorization, /^WECHATPAY2-SHA256-RSA2048 /)

  const resourceNonce = '123456789012'
  const associatedData = 'transaction'
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(config.apiV3Key), Buffer.from(resourceNonce))
  cipher.setAAD(Buffer.from(associatedData))
  const plaintext = JSON.stringify({ out_trade_no: 'SY-test-order', trade_state: 'SUCCESS' })
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const resource = { algorithm: 'AEAD_AES_256_GCM', ciphertext: ciphertext.toString('base64'), nonce: resourceNonce, associated_data: associatedData, tag: cipher.getAuthTag().toString('base64') }
  assert.deepEqual(JSON.parse(decryptWechatNotify(config, resource)), JSON.parse(plaintext))

  const rawBody = JSON.stringify({ resource })
  const timestamp = '1700000000'
  const nonce = 'nonce-notify'
  const signer = createSign('RSA-SHA256')
  signer.update(`${timestamp}\n${nonce}\n${rawBody}\n`)
  signer.end()
  const headers = { 'wechatpay-timestamp': timestamp, 'wechatpay-nonce': nonce, 'wechatpay-serial': config.publicKeyId, 'wechatpay-signature': signer.sign(privateKey).toString('base64') }
  assert.equal(verifyWechatNotify(config, headers, rawBody), true)
  console.log('PASS: API v3 request signing, mini program payment signing, notification verification and AES-GCM decryption')
} finally {
  rmSync(temp, { recursive: true, force: true })
}
