# 音频权益矩阵（2026-10-22 改版）

本文件描述当前实现，不表示已部署或已修改生产音频配置。

## 权益矩阵

| 权益 | 普通景点音频（`online`/`attraction`） | 真人讲解（`expert`） | 文史节目（`heritage`） |
| --- | --- | --- | --- |
| 未购买 | 试听 | 试听 | 试听 |
| 普通单景点 ¥9.9 | 对应 attractionId | 不解锁 | 不解锁 |
| 城市包 ¥69.9 | 城市下已发布景点 | **该城市内景点关联的真人讲解** | 不解锁 |
| 年会员 ¥199/年 | 完整收听 | 完整收听 | **完整收听** |

### 核心规则

1. **普通景点音频**：单景点购买 / 所属城市包 / 年会员，三者任一即可完整收听。
2. **真人讲解**：**不单篇售卖，不单独定价**。景点真人讲解随「该景点所属城市包」或「年会员」解锁；跨城市不串用。
3. **文史版块**：**仅年会员**可听完整内容（含文史真人讲解）；未开通年会员只能试听。代码层面对 `category=heritage` 强制年会员判定，历史遗留的 `free`/`locked`/`album` 记录也不会对非会员开放。
4. `locked` 仍表示仅试听，不被任何购买或会员越过。

### 已停售商品

- **文史专辑 ¥9.9**：停售。文史已改为年会员专属，专辑单售无意义；`products.album.enabled` 被服务端强制为 `false`，`POST /api/miniprogram/orders` 对 `productType=album` 返回 `PAYMENT_PRODUCT_UNAVAILABLE`。
- **真人单篇 ¥39.8（原候选价）**：**不再定价、不再售卖**。`products.expertTrack.enabled` 被服务端强制为 `false`，即使管理员尝试开启也会被拒绝，`productType=expertTrack` 下单返回 `PAYMENT_PRODUCT_UNAVAILABLE`。

## 商品配置

`GET /api/miniprogram/knowledge/config` 的 `products` 中：

- `attraction`（¥9.9）、`city`（¥69.9）、`annualMembership`（¥199，365 天）为在售商品。
- `album`、`expertTrack` 恒为 `enabled:false`，仅保留字段兼容。

## 权益投影

`GET /api/miniprogram/entitlements` 返回：

```json
{
  "member": false,
  "unlockedAttractions": ["..."],
  "unlockedCities": ["..."],
  "unlockedAlbums": [],
  "unlockedExpertTracks": ["..."]
}
```

- `unlockedExpertTracks`：年会员返回全部已发布 expert 音轨；城市包返回**该城市内**景点关联的 expert 音轨；否则为空数组。
- `unlockedAlbums`：年会员返回全部已发布专辑；不再有专辑购买来源。

## 播放鉴权

`GET /api/miniprogram/audio/:id/access` 是完整播放权限的唯一来源。

- `access === 'full'` 时**必定**返回正数 `expiresIn`（300 秒）与带 `token` 的 `fullUrl`；二者与 `access` 同源于同一个授权布尔，不存在分叉。
- `access === 'preview'` 时 `expiresIn` 与 `fullUrl` 均为 `null`。
- 每次命中都重新签发新签名；旧签名在过期（401）或权益撤销（403）后失效。

## 音频规则校验

后台保存音轨时（`validateHeritageRecord`）：

- `category=heritage` 只允许 `unlockMode=membership`，其它模式（`free`/`attraction`/`album`/`expert`/`locked`）返回 422。
- `category=expert` 只允许 `unlockMode=expert`，使用 `attraction` 或其它模式返回 422。
- `unlockMode=album` 已整体停用，返回「专辑单售已取消」。

## 批量配置

`POST /api/admin/audioTracks/bulk-attraction-unlock/{preview,apply}` 用于把普通 `online` 音轨批量改为单景点解锁：

- 候选条件：`category=online` + `status=published` + 所属景点 `published` + 音频资源完整 + 非 `attraction` 模式。expert 与 heritage 类别天然不在候选内。
- `preview` 返回 `count`、`trackIds`、`previewHash`、`criteria`；`apply` 必须同时提交 `confirmed:true`、匹配的 `previewHash` 和完整 `trackIds`，否则 409 `AUDIO_UNLOCK_PREVIEW_STALE`。
- 每次 apply 写入 `data.audioUnlockBatchAudits`（保留最近 100 批），`GET .../audits` 可查。

## 契约测试

`node scripts/test-expert-contract-fixtures.mjs --output /tmp/<name>.json` 在隔离临时 JSON 服务上采集真实 HTTP 响应（36 case），去敏后输出回放 fixture：

- 覆盖：匿名/普通购买/城市包/年会员四条链路；真人讲解随城市包解锁、跨城市隔离；文史仅年会员；album/expertTrack 下单被拒；管理员尝试重新启用被拒；会员过期、撤权后旧签名 full 返回 403；签名过期返回 401。
- 去敏规则：身份/会话/签名 token 全部替换为 `fixture-*` 占位符，订单 ID 一致重映射，不含私有文件名与 base URL。脚本运行结束自动关闭临时服务并清理目录。

## 历史说明

2026-10-22 之前曾实现「真人单篇 ¥39.8」与「文史专辑 ¥9.9 单售」，均已在本次改版中撤销：真人讲解并入城市包/年会员，文史改为年会员专属。生产订单与用户为零，无需数据迁移。
