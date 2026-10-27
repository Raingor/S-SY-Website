# 音频、商品及板块规则（2026-10-22）

本文件描述本版本的接口与后台规则，生产发布状态以发布回执和共享日志为准。用户已明确确认：历史终身会员、城市包、专辑和单篇购买不再授予完整收听权限，只有有效年会员可完整收听。发布不迁移或批量改写生产数据，现有记录通过读取规范化应用新规则。

## 唯一内容商品

`annualMembership` 固定为 **CNY 199 元 / 365 天**，`enabled:true`。客户端提交金额、币种或期限不影响服务器计价；后台旧配置也不能改变这些值。商品名称可编辑。

> 价格在服务端与客户端均被写死，**后台不可配置**。若需改价，必须同步修改服务端、客户端校验与三语文案；完整清单见 `docs/annual-membership-pricing.md`。

`attraction`、`city`、`expertTrack`、`album`、`membership` 均强制 `enabled:false`。保留配置字段及历史订单供兼容和查询；新下单返回 422 `PAYMENT_PRODUCT_UNAVAILABLE`，即使旧客户端或管理员尝试开启商品也无效。历史待支付订单回调仍用于记账，但非年会员订单不会产生完整收听权益。

年会员支付成功授予 365 天；有效期内续费从已有年会员订单到期日顺延。失败或待支付订单不授予权益，重复确认支付不会重复续期。后台允许按订单、普通用户或指定未来到期日的年会员三种调整方式；不再支持新增终身会员调整。

## 收听矩阵

| 用户状态 | 专业介绍 | 路线 / 名导音频 | 文史节目 |
| --- | --- | --- | --- |
| 匿名、普通用户 | 试听 | 试听 | 试听 |
| 仅有历史终身 / 城市 / 专辑 / 单篇购买 | 试听 | 试听 | 试听 |
| 年会员已过期或被撤销 | 试听 | 试听 | 试听 |
| 有效年会员 | 完整收听 | 完整收听 | 完整收听 |

上述权限仍要求内容已发布、关联有效且私有完整版和试听文件存在。下架、资源缺失等情况返回 404，不会生成虚假音频或播放地址。所有类别的旧 `free`、`locked`、`attraction`、`expert`、`album` 模式统一按年会员处理。

公开、后台音轨列表及 `/access` 的 `unlockMode` 均规范为 `membership`；后台保存兼容已有模式枚举并持久化为 `membership`，未知枚举仍返回 422。无需批量改写现有业务数据即可生效。`isPinned` 布尔、音频原有排序、路线点位顺序保留。

## 会员及签名媒体契约

`member:true` 仅表示有效年会员，`memberExpiresAt` 必须是未来时间。非年会员四个 `unlocked*` 数组均为空，历史 `purchases` / `orders` 保留查询用途。

`GET /api/miniprogram/audio/:id/access` 是完整播放地址的来源：

- `access:full` 同时返回带签名 token 的 `fullUrl` 和正数 `expiresIn:300`。
- `access:preview` 返回 `fullUrl:null`、`expiresIn:null` 及试听地址。
- 客户端不得自行拼接或伪造 `fullUrl`；不得仅凭旧 `unlockMode`、历史购买记录或缓存的 full 授权继续播放。
- 每次 `/full` 请求重新检查发布状态、资源和当前年会员；旧签名过期返回 401，当前会员已过期、被撤销或仅有旧购买权益时返回 403。

## 景点板块

全部景点统一 `hiddenSections:["route","expert"]`，**专业介绍显示**。`attractions[]`、`attractionDetails[id]`、全局详情页配置输出一致，覆盖历史全局 `online.hidden:true` 及景点 `sectionOverrides.online:true`。

后台保存景点时写入 `{route:true,expert:true}` 并清除旧 online 隐藏；保存全局配置也强制同一规则。「统一板块显隐设置」可显式规范全部景点及全局存储。不自动下架或删除现有名导/路线资料。名导板块隐藏时不公开未鉴权的视频完整 URL。

旧 `POST /api/admin/audioTracks/bulk-attraction-unlock/{preview,apply}` 已停用，返回 410 `AUDIO_UNLOCK_BATCH_RETIRED`；历史 `/audits` 仍只读可查。

## 隔离验证

所有以下脚本只启动临时 JSON 服务，使用纯合成记录与音频，不连接生产或 MariaDB：

- `npm run test:annual-membership`：真实 HTTP 契约，历史权益失效、固定年费、续费、过期、撤权、旧签名、模拟和正式身份鉴权、显隐和停售。可用 `node scripts/test-expert-contract-fixtures.mjs --output /tmp/annual-contract.json` 导出去敏的 schemaVersion 3 回放夹具。
- `npm run test:audio-pinning`：真实 Vue 组件创建、编辑、重新打开、行内置顶，以及会员商品配置、全局显隐、景点显隐、用户年会员调整的 HTTP 保存回读。
- `npm run test:miniprogram-simulation`：下单/失败/幂等/用户隔离、公开契约及身份边界。
- `node scripts/test-heritage-content.mjs`：私有音频上传、试听裁剪、签名流、内容发布、关联和管理 CRUD。

UI 构建使用独立临时目录且 `copyPublicDir:false`，不覆盖仓库 `index.html` / `dist/index.html`。部署使用 Git 提交和生产发布回执记录版本。

## 板块展示名称

`online` 展示为「专业介绍」（繁体「專業介紹」，英文 Professional Introduction），`expert` 展示为「游览攻略」（繁体「遊覽攻略」，英文 Touring Guide）。类别键、内容关联、排序、年会员权限和显隐规则沿用当前实现。历史内置标题在接口读取和后台保存时规范为新名称；其他自定义标题保留。具体上线版本见生产发布回执。
