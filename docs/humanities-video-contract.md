# 希腊人文影集接口与后台

本功能复用 `guideVideos` 内容。希腊人文影集（`category: humanities`）登录后免费观看；景点讲解视频仍走 ¥168 单独购买。以下为本地实现契约；不会自动把旧景点视频归入人文影集，不新增影片或迁移生产数据。

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
  - **人文影集**（`category === 'humanities'`）：登录后直接 `access:'full'` + 有效期 600 秒的私有 OSS 签名 `playUrl`，`unlockedVia:'free'`；不返回 `VIDEO_PURCHASE_REQUIRED`，不下发 `guideVideo` 商品。
  - **景点讲解**（`category === 'attraction'` 或未设置）：登录未购买返回 `VIDEO_PURCHASE_REQUIRED` 并附带 `product`（¥168）；购买后返回签名 `playUrl`，`unlockedVia:'purchase'`。
- `POST /api/miniprogram/orders` 的 `guideVideo` 仅适用于景点讲解；对人文影集返回 `VIDEO_NOT_PURCHASABLE`。景点讲解价格固定 CNY 168。
- 年会员不包含景点讲解视频；人文影集与会员状态无关，登录即可看。封面公开不授予播放权限。
- 草稿或已下架视频不在公开列表中，播放权限接口返回 404。

## 专辑（guideVideoAlbums）

人文影集专辑把多集视频按「分区 + 集数」组织，小程序「文史知识库 → 漫游希腊」面板读取该结构。同一张专辑可同时编入景点讲解与人文影集视频。

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
| `albumId` | 所属专辑 ID，空字符串表示不属于任何专辑 |
| `section` | 专辑内分区 `key`，空字符串表示默认分区 |
| `episode` | 分区内集数，非负整数，默认 `0`；与 `section` 一起决定排序 |

后台「开发配置 → 人文影集专辑」维护专辑：简体名称/简介、封面、分区数组（`key`/分区名称/排序）、排序和发布状态。名称必填；新建默认下架、`sections` 为空。视频编辑器的「所属专辑」「专辑内分区」「集数」决定挂接关系。API 为 `GET/POST /api/admin/guideVideoAlbums`、`PATCH/DELETE /api/admin/guideVideoAlbums/:id`，行为与 `guideVideos` 一致（`404 CONTENT_NOT_FOUND`、`409 DUPLICATE_ID`、`422 CONTENT_VALIDATION_FAILED`）。

> 说明：该专辑能力在生产先落地（release 20261106-video-translation-ee43bb1），本仓源码据此契约重建，公开字段与后台行为已对齐生产 `/api/content` 与 `/api/admin/guideVideoAlbums` 实测结果。

## 验证

`npm run test:guide-video-commerce` 使用临时 JSON 服务与合成内容，覆盖旧分类默认、人文影片无景点发布、分类校验、三语与排序、公开字段边界、人文影集登录免购（含会员）、人文下单拒绝、景点讲解单视频购买隔离、会员不包含景点讲解、下架和删除。

`npm run test:guide-video-albums` 覆盖专辑公开契约（仅发布、按 `sort` 排序、分区三语回退、不内嵌视频）、视频 `albumId/section/episode` 挂接、后台 CRUD（必填校验、重复 ID、默认下架与默认分区排序、`PATCH` 合并、`DELETE` 后公开列表同步消失）。

`npm run test:admin-guide-videos-ui` 验证字段、单选关联、专辑菜单/路由/编辑器字段、创建默认值及人文表单提交。构建与浏览器核验使用临时副本，不覆盖工作区生成文件或读取生产数据。
