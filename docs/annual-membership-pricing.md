# 年会员定价与改价影响面

本文件记录 `annualMembership` 的价格在两端被写死的具体位置，以及未来若要改价必须同步修改的清单。**当前价格：CNY 199 / 365 天。**

## 结论先行

年会员价格**不是后台可配置项**。服务端无条件写死，客户端再做一次同值校验作为双保险。因此：

- 后台无论存什么价格，`/api/miniprogram/knowledge/config` 出去永远是 `enabled:true, price:199, currency:'CNY', durationDays:365`。
- **不存在「管理员在后台改价导致购买入口消失」的路径。**
- 客户端 `price === 199` 守卫只会在 config 请求失败、缓存损坏等异常时返回 false，此时是**安全失败**：提示「支付服务尚未配置，请稍后再试」并且不下单，不会错卖。
- 真正的成本是**未来改价必须同时改服务端、客户端、文案三处**，漏改任一会导致失败关闭或文案错价。

## 服务端写死位置（Website 仓库）

`server.mjs` 的 `miniProgramKnowledgeConfig()`：

```js
price: key === 'annualMembership' ? 199 : (Number.isFinite(Number(value.price)) && Number(value.price) >= 0 ? Number(value.price) : product.price),
enabled: key === 'annualMembership',
currency: 'CNY',
...(key === 'annualMembership' ? { durationDays: 365 } : {}),
```

同一函数上方的 `defaultMiniProgramKnowledgeConfig()` 也写死了 199 作为默认值。

下单侧另有硬拦截 `commercePurchaseTarget()`：非 `annualMembership` 一律返回 `PAYMENT_PRODUCT_UNAVAILABLE`。

## 客户端校验与文案位置（MpApp 仓库）

**校验**：`utils/paid-content.js` 的 `annualProductAvailable()`：

```js
return Boolean(product && product.enabled === true && Number(product.price) === 199 && String(product.currency || 'CNY').toUpperCase() === 'CNY');
```

注释原文：「只销售 ¥199 年会员；后台尚未同步新配置时不展示或支付其他价位。」属**有意的安全守卫**，非遗留限制（`git log -S` 仅一次引入，与年会员统一改造同期）。

**调用点**：`utils/city-commerce.js`、`pages/city/index.js`、`pages/city/spots.js`、`pages/attraction/detail.js`、`pages/membership/shop.js`、`pages/audio/detail.js`。

**硬编码 ¥199 文案：20 行、25 条键值、7 个唯一键名**（三语各一套），全部在 `utils/i18n.js`：

| 行 | 语言 | 键 | 条数 |
| --- | --- | --- | --- |
| 272 | zh-CN | `cityPaywallSubtitle`、`annualPlanDesc` | 2 |
| 274 | zh-TW | `cityPaywallSubtitle`、`annualPlanDesc` | 2 |
| 276 | en | `annualPlanDesc` | 1 |
| 288 / 289 | zh-CN | `memberDesc`（contentPage、paidContent 各一） | 2 |
| 293 / 294 | zh-TW | `memberDesc`（同上） | 2 |
| 298 | en | `memberDesc` | 1 |
| 349 / 350 | zh-CN | `expertAccessDesc`、`heritageAccess` | 2 |
| 352 | zh-CN | `memberDesc` | 1 |
| 361 / 362 / 364 | zh-TW | `expertAccessDesc`、`heritageAccess`、`memberDesc` | 3 |
| 373 / 374 / 376 | en | `expertAccessDesc`、`heritageAccess`、`memberDesc` | 3 |
| 381 / 382 / 383 | 简/繁/英 | `vipShopSubtitle`、`vipShopBenefits`（每行各 2 条） | 6 |

合计 **20 行 25 条**。按唯一键名统计：`memberDesc` 8、`annualPlanDesc` 3、`expertAccessDesc` 3、`heritageAccess` 3、`vipShopSubtitle` 3、`vipShopBenefits` 3、`cityPaywallSubtitle` 2。

写法分布：`¥199` **18 处 / 14 行**；`CNY 199` **7 处 / 6 行**（276/298/373/374/376/383，其中 383 行含 2 条）。

> 早前会话记录曾写「6 处 ¥199」，后修正为「24 条」，**两个数字都不准确**。以本表 20 行 25 条为准（脚本逐行扫描 `utils/i18n.js` 复核）。

## 改价清单（若未来调整价格）

按顺序执行，全部完成前不要上线：

1. `server.mjs` `defaultMiniProgramKnowledgeConfig()` 的 `price: 199`
2. `server.mjs` `miniProgramKnowledgeConfig()` 三元表达式里的 `199`
3. `server.mjs` `commercePurchaseTarget()` 错误消息中的「199 元 / 365 天」
4. MpApp `utils/paid-content.js` `annualProductAvailable()` 的 `=== 199`
5. MpApp `utils/i18n.js` 上表 20 行 25 条文案（三语齐全，繁体与英文不可漏；注意 272/274/381/382/383 每行各 2 条）
6. 双端聚焦测试：Website `npm run test:miniprogram-simulation`、`npm run test:wechat-pay`、`npm run test:audio-pinning`；MpApp 支付相关 `.cjs` 回放
7. 更稳妥的长期方案：把价格改为单一来源（服务端下发，客户端只校验 `enabled` 与 `currency`，文案用 `productPriceDisplay()` 动态拼接），消除三处同步成本

## 相关文档

- `docs/audio-commerce-entitlements.md`：唯一内容商品、收听矩阵、签名媒体契约
