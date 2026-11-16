# 希腊人文影集接口与后台

本功能复用 `guideVideos` 内容。希腊人文影集（`category: humanities`）仅有效年会员可观看、不单独出售；景点讲解视频仍走 ¥168 单独购买，年会员不解锁。以下为本地实现契约；不会自动把旧景点视频归入人文影集，不新增影片或迁移生产数据。

## 内容接口

`GET /api/content` 的 `guideVideos[]` 只返回已发布视频，新增：

| 字段 | 契约 |
| --- | --- |
| `category` | `attraction`（景点讲解）或 `humanities`（希腊人文影集）；旧记录未设置时为 `attraction` |
| `sort` | 非负整数，默认 `0`；列表升序排列，相同值保持录入顺序 |
| `attractionId` | 单个景点 ID；人文影集允许为空字符串 |

继续公开 `id`、`title/titleTw/titleEn`、`description/descriptionTw/descriptionEn`、`cover`、`durationSeconds` 和 `accessUrl`。繁体、英文缺省时回退简体。不公开 `ossKey`、`sizeBytes` 或播放 URL。

小程序首页影集及影集列表仅取 `category === 'humanities'`；景点详情的视频列表排除该分类。旧记录默认分类不会出现在首页影集。首页位置为视频号之后、目的地之前；没有已发布人文影片时由客户端显示相应空状态，不用旧景点视频填充。

## 后台维护

「开发配置 → 攻略视频」管理两种视频，可编辑分类、三语标题简介、单个可清空的关联景点、封面、排序、OSS 路径、时长、大小和发布状态。

表单顶部及底部的「一键翻译」根据简体标题、简介生成繁体与英文，复用现有管理员翻译接口。结果全部成功后才回填；请求失败、编辑页面改变或翻译期间简体内容改变时保留原译文。翻译仅修改当前表单，核对后仍需保存。未启用 AI 翻译时按钮不可用。

API 沿用 `GET/POST /api/admin/guideVideos`、`PATCH/DELETE /api/admin/guideVideos/:id`。分类只允许上述两个枚举，未设置按景点讲解处理。标题始终必填；发布前必须填写 OSS 路径，景点讲解还必须关联景点，人文影集允许不关联。分类变更也执行相同发布校验。保存、读取时补充默认值，不执行批量迁移。

## 购买与播放

- 详情页只需视频 `id`，无需景点 ID。
- `GET /api/miniprogram/video/:id/access`：
  - 匿名一律返回 `access:'locked', reason:'MINIPROGRAM_LOGIN_REQUIRED'`（不返回 `playUrl` / `product`）。
  - **人文影集**（`category === 'humanities'`，含「漫游希腊」专辑内视频）：仅有效年会员可看。已登录但年会员无效返回 `access:'locked', reason:'ANNUAL_MEMBERSHIP_REQUIRED'` + 提示文案，**不返回 `product`/价格**（避免被当成单独购买）；年会员有效则返回 `access:'full'` + 600 秒私有 OSS 签名 `playUrl`、`unlockedVia:'member'` 和会员到期时间 `validUntil`。
  - **景点讲解**（`category === 'attraction'` 或未设置）：登录未购买返回 `VIDEO_PURCHASE_REQUIRED` 并附带 `product`（¥168）；购买后返回签名 `playUrl`，`unlockedVia:'purchase'`。年会员不解除该限制。
- `POST /api/miniprogram/orders` 的 `guideVideo` 仅适用于景点讲解；对人文影集返回 `VIDEO_NOT_PURCHASABLE`（提示开通年会员）。景点讲解价格固定 CNY 168。
- 2026-11-16 规则变更（覆盖此前「人文影集登录免费」）：人文影集改为年会员专属、不单独出售；会员到期或未生效即回到锁定态。封面公开不授予播放权限。
- 草稿或已下架视频不在公开列表中，播放权限接口返回 404。

## 专辑（guideVideoAlbums）

人文影集专辑把外网博主旅行人文视频按「分区 + 集数」组织，小程序「文史知识库 → 漫游希腊」面板读取该结构。**仅 `category: humanities` 可编入专辑**。真人出镜录制的景点讲解（如卫城 `guide-video-acropolis`）保持 `category: attraction`，通过独立景点视频入口展示，不能编入「漫游希腊」。此规则覆盖此前允许混合专辑的决定，不改变任一类别的播放/付费契约。

`GET /api/content` 新增 `guideVideoAlbums[]`，只返回 `status === 'published'` 的专辑，按 `sort` 升序：

| 字段 | 契约 |
| --- | --- |
| `id` | 专辑 ID，建议 `guide-video-album-` 前缀 |
| `title/titleTw/titleEn` | 三语名称；繁体、英文缺省时回退简体 |
| `description/descriptionTw/descriptionEn` | 三语简介，回退规则相同 |
| `cover` | 专辑封面原样下发（不授予播放权限） |
| `sort` | 非负整数，默认 `0` |
| `status` | 固定为 `published` |
| `sections[]` | `{key, title, titleTw, titleEn, sort}`，按 `sort` 升序；`key` 为必填英文小写分组键 |

专辑**不内嵌**视频数组；客户端用 `guideVideos[]` 的 `albumId` + `section` + `episode` 自行挂接。

`guideVideos[]` 因此新增三个公开字段（参与上面的挂接）：

| 字段 | 契约 |
| --- | --- |
| `albumId` | 人文视频所属专辑 ID；真人景点讲解固定为空字符串，即使旧数据有错误关联也不会公开下发 |
| `section` | 专辑内分区 `key`，空字符串表示默认分区 |
| `episode` | 分区内集数，非负整数，默认 `0`；与 `section` 一起决定排序 |

非人文视频在后台读取、公开投影及保存时统一归一化为 `albumId: ''`、`section: ''`、`episode: 0`，避免旧脏关联继续生效；仅 GET 不会写回数据库，保存该视频后才持久化清理。视频编辑器仅对 `humanities` 显示专辑/分区/集数字段，切换为景点讲解并保存也会清除关联。

后台「开发配置 → 人文影集专辑」维护专辑：简体名称/简介、封面、分区数组（`key`/分区名称/排序）、排序和发布状态。名称必填；新建默认下架、`sections` 为空。视频编辑器的「所属专辑」「专辑内分区」「集数」决定挂接关系。API 为 `GET/POST /api/admin/guideVideoAlbums`、`PATCH/DELETE /api/admin/guideVideoAlbums/:id`，行为与 `guideVideos` 一致（`404 CONTENT_NOT_FOUND`、`409 DUPLICATE_ID`、`422 CONTENT_VALIDATION_FAILED`）。

> 说明：该专辑能力在生产先落地（release 20261106-video-translation-ee43bb1），本仓源码据此契约重建，公开字段与后台行为已对齐生产 `/api/content` 与 `/api/admin/guideVideoAlbums` 实测结果。

## 正式内容拆分清单（需另行授权后通过后台执行）

本仓 seed 不包含正式视频/专辑内容；源码变更不代表已经部署或清理生产数据库，禁止导入本地 fixture 替代正式数据。

1. `guide-video-acropolis` 保持 `category: attraction`、`attractionId: acropolis`，将 `albumId`/`section` 清空、`episode` 设为 `0`；不得改成 `humanities` 绕过分离规则。
2. `guide-video-program1` 保持 `category: humanities`、`albumId: guide-video-album-roaming-greece`、`section: stories`、`episode: 1`。保留其他确认为博主视频的节目。
3. 「漫游希腊」删除旧嵌套 `videos` 中的真人讲解，删除仅关联卫城的 `monuments` 空章节，保留有博主节目对应的章节。公开 API 不内嵌视频，客户端必须仅从 `humanities` 挂接。
4. 封面使用已确认的博主节目封面或独立专辑配图；不能复制卫城真人封面。没有合适配图时留空，客户端仅从该专辑的 `humanities` 节目回退；不得回退到独立景点讲解。
5. 简介建议（三语）：「收集博主镜头下的希腊旅行片段，漫步城市与海岛，发现旅途中的风景与人文。」／「收集博主鏡頭下的希臘旅行片段，漫步城市與海島，發現旅途中的風景與人文。」／「Explore Greece through travel creators’ videos, from city streets to island scenery and local culture.」章节按实际博主节目内容命名，不再把卫城真人节目列作专辑介绍。
6. 首页第一张 Banner 若为 `guide-video:guide-video-acropolis`，保留独立单视频跳转。权限仍为博主人文登录免费、真人景点讲解单独购买，不因专辑或年会员改变。
7. 经授权操作前备份对应正式记录，操作后核对公开 `/api/content` 中卫城无专辑关联、漫游仅博主节目、封面来源正确、无卫城空章节，同时保留景点入口和原播放权限。

## 验证

`npm run test:guide-video-commerce` 使用临时 JSON 服务与合成内容，覆盖旧分类默认、人文影片无景点发布、分类校验、三语与排序、公开字段边界、人文影集登录免购（含会员）、人文下单拒绝、景点讲解单视频购买隔离、会员不包含景点讲解、下架和删除。

`npm run test:guide-video-albums` 覆盖专辑公开契约（仅发布、按 `sort` 排序、分区三语回退、不内嵌视频）、人文视频 `albumId/section/episode` 挂接、真人景点讲解旧脏关联隔离/后台保存清理/切换分类清理、后台 CRUD（必填校验、重复 ID、默认下架与默认分区排序、`PATCH` 合并、`DELETE` 后公开列表同步消失）。

`npm run test:admin-guide-videos-ui` 验证字段、单选关联、专辑菜单/路由/编辑器字段、创建默认值及人文表单提交。构建与浏览器核验使用临时副本，不覆盖工作区生成文件或读取生产数据。
