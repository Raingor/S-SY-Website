# 普通音频、真人讲解与批量配置契约

本文件描述本地实现，不表示已部署、已启用商品或已修改生产音频配置。

## 权益矩阵

| 权益 | 普通景点音频（`attraction`） | 真人单篇（`expert`） | 文史节目（`album`） |
| --- | --- | --- | --- |
| 未购买 | 试听 | 试听 | 试听 |
| 普通单景点购买 | 对应 attractionId | 不解锁 | 不解锁 |
| 城市包 | 城市下已发布景点 | 不解锁 | 不解锁 |
| 真人单篇购买 | 不解锁 | 对应 trackId | 不解锁 |
| 专辑购买 | 不解锁 | 不解锁 | 对应 albumId |
| 有效年会员 / 历史终身会员 | 完整收听 | 完整收听 | 完整收听 |

`free` 仍表示明确免费公开，`membership` 只接受会员，`locked` 仍表示仅试听，不被任何购买或会员越过。发布状态和文件可播放性也必须满足；未上架或资源缺失的音频不能由权益强行开放。普通音频需经管理员预览确认后配置成 `attraction`；真人讲解需明确配置 `category=expert, unlockMode=expert`。不会启动时自动迁移生产记录。

## 商品与订单

`GET /api/miniprogram/knowledge/config` 的 `products` 新增：

```json
{"expertTrack":{"enabled":false,"productType":"expertTrack","name":"名导单篇讲解","price":0,"currency":"CNY"}}
```

0 表示尚未定价，并非免费商品。配置未启用或价格不大于 0 时不能创建该商品订单。不预设 39.8 或任何其它商业价格。后台「城市与专辑定价」增加独立价格/开关，修改需要管理员保存。

`POST /api/miniprogram/orders` 仍使用既有的平面请求体（不是嵌套 target）：

```json
{"productType":"expertTrack","trackId":"<published-expert-track-id>"}
```

服务端要求目标是可公开播放的 `expert` 音轨，且 `unlockMode=expert`。价格、金额、商品类型和目标都由服务端校验，客户端金额不作为依据。真人单篇支付订单携带 `trackId`；确认支付后，订单响应和 `GET /api/miniprogram/entitlements` 新增：

```json
{"member":false,"unlockedExpertTracks":["<track-id>"],"purchases":[{"productType":"expertTrack","trackId":"<track-id>","status":"paid"}]}
```

现有 `unlockedAttractions` / `unlockedCities` / `unlockedAlbums` 不变。真人单篇不授予普通景点权益；普通景点/城市权益不授予真人单篇权益。年会员的 `member=true` 可授权真人内容，`unlockedExpertTracks` 同时列出已发布的 expert 音轨 ID。过期、失败和未支付订单不产生新权益。

**完整播放唯一入口仍是** `GET /api/miniprogram/audio/:id/access`。不要只凭客户端数组推断播放权限。返回形状保持兼容：

```json
{"id":"<track-id>","access":"preview","unlockMode":"expert","previewSeconds":60,"previewUrl":"/api/miniprogram/audio/<track-id>/preview","fullUrl":null,"expiresIn":null,"reason":"AUDIO_ENTITLEMENT_REQUIRED"}
```

授权后 `access=full`，`fullUrl` 为含短期签名的 `/full?token=...`，`expiresIn=300`。实际请求完整版时再次验证发布状态、签名与当前权益。旧 expert 音频误配 `attraction` 时，普通景点/城市权益也不会授权；后续编辑这种记录会要求改用独立真人规则。

## 安全批量配置

入口：「导览音频 / 文史节目 → 线上游览 → 预览批量设为单景点解锁」。这是**全站候选预览**，不受列表筛选条件影响。

1. 管理员 `POST /api/admin/audioTracks/bulk-attraction-unlock/preview`。只读，不保存。
2. 仅列出 `status=published, category=online`，关联已发布有效景点、试听与完整私有文件均存在、且尚未为 `attraction` 的音频。排除 expert/route/heritage、下架、失效关联与缺文件的记录。
3. 返回 `count`、完整 `items`（音频 ID/标题/景点/原规则）、`previewHash`、筛选条件和生成时间。管理员滚动核对清单，并勾选确认框。
4. 管理员 `POST .../apply`：

```json
{"confirmed":true,"previewHash":"<hash-from-preview>","trackIds":["<ids-in-preview-order>"]}
```

5. 服务端重算候选和快照。清单、标题、关联景点、原规则、文件或候选资格变化时返回 409 `AUDIO_UNLOCK_PREVIEW_STALE`，不得继续应用旧清单。未明确确认或 ID 清单不完全匹配也拒绝。
6. 成功只改 `unlockMode`，返回 `auditId`、数量、应用时间及逐条原/新规则。审计保存在现有 JSON payload 中，不修改数据库 schema；保留最近 100 批。管理员可 `GET .../audits` 查询。

管理员预览确认不是授权自动修改生产。本地实现与测试结束后仍需另行确认部署，以及生产预览清单和批量应用。

## 本地验证

- `node --check server.mjs` / `node --check heritage-content.mjs`
- `node scripts/test-heritage-content.mjs`：临时 JSON/音频目录，真实 HTTP 路由、试听/完整版、专家购买/会员、城市隔离、dry-run/确认/stale/audit。
- `npm run test:miniprogram-simulation`：默认配置、城市/专辑/会员订单和独立 expert 权益。
- `npm run test:wechat-pay`：已有签名、通知验证与解密。
- `npm run build`：可在临时构建副本执行，避免覆盖已有根 index.html / dist/index.html。

测试中自行设置的金额仅用于验证可配置性，不是生产定价；测试不请求微信真实扣款，不修改本地真实 seed、MariaDB 或生产数据。

### 提供给 MpApp 的去敏真实 HTTP 回放

运行 `node scripts/test-expert-contract-fixtures.mjs --output /tmp/sy-expert-http-replay-fixtures.json`，在独立临时 JSON 服务中采集 `{ cases: [{ name, request: { method, path, body? }, response: { statusCode, data } }] }`。脚本只继承 PATH/HOME/TMPDIR/LANG/TZ，生成测试正弦音频，不加载生产或真实数据库/支付配置；结束时自动停服并删除临时服务目录。仅保留显式指定的外置、去敏 JSON 输出，不能把该输出写入代码仓库。

身份、会话、订单 ID、签名均替换成 `fixture-*` 标记；私有文件名和临时服务 URL 不输出。binary `/full` 成功响应以 `byteLength` 摘要记录，不携带音频字节。该样本用于小程序真实 utils/播放器的离线回放，不要求小程序仓库会话调用 Website API，也不意味着微信真实支付/真机端到端验收。

覆盖普通/城市购买普通 full 与 expert preview、专家单篇仅命中 trackId、年会员普通/专家 full、关闭/零价拒单、会员已过期、后台撤权后 access 降 preview，及旧签名完整版失权 403/签名过期 401。模拟签名 `/full` 恢复身份时必须保留派生 userId，以便应用最新后台会员覆盖设置。

当前专家商品是单条音轨，不是景点下所有专家片段。原需求“真人老师单个景点”是否应做整包售卖仍需用户确认，不能在当前单条商品上承诺整个景点内容。
