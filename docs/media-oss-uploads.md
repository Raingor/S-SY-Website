# 后台视频与音频上传到 OSS

## 操作

- 视频：在「开发配置 → 攻略视频」编辑记录，使用「上传视频到 OSS」。支持 MP4、最大 2 GiB，上传完成自动回填 OSS 路径、时长与大小。
- 音频：在音频编辑页上传 MP3/M4A，最大 30 MiB。服务器验证音频并生成 1–60 秒内的试听片段；完整音频写入私有前缀，试听同时写入 OSS 公读前缀 `public/audio/`。
- 两者都通过最多 5 MiB 的分片请求上传，显示上传进度，单片暂时失败最多重试两次。成功后仍需点击「保存」，才会绑定内容记录。上传失败保留原表单中的媒体引用。
- 未配置 OSS 返回 503；OSS 上传或合并失败返回 502。不会将仅保存到本机的文件当作上传成功。

## 服务端配置

沿用 `SY_OSS_ACCESS_KEY_ID`、`SY_OSS_ACCESS_KEY_SECRET`、`SY_OSS_BUCKET`、`SY_OSS_HOST`。测试可用 `SY_OSS_ENDPOINT` 指向隔离模拟服务。金钥仅保留在服务端，本地 `.env`、`.env.local`、`ali.md`、`aliyun.md` 不进入 Git。部署时沿用生产环境变量，不提交或同步本地密钥。

本地已通过用户提供的 `ali.md` 只读核对 `sy-mpapp` bucket，区域为 `oss-cn-shenzhen`、ACL 为 private；本机缺少的设置已补入被忽略的 `.env`，权限为 600。未上传真实 bucket 测试对象，未修改 bucket、生产配置或生产内容。

所有付费媒体对象写入时显式设为 private。RAM 权限需允许该 bucket 下 `video/`、`audio/` 的读取、写入、私有 ACL 设置及中止分片；失败清理还需删除本次随机生成对象的权限。代码不会修改 bucket 策略。分片由网站后端转发，不要求浏览器直连 OSS 或新增 OSS CORS 规则。

公开试听对象写入 `public/audio/` 前缀，写入时显式设置对象级 `public-read` 与 `Cache-Control: public, max-age=31536000, immutable`，不依赖 bucket 默认 ACL。RAM 需额外允许 `public/` 前缀的 PUT（含 `x-oss-object-acl`、`Cache-Control` 头）以及以 `x-oss-copy-source` 复制私有对象。公读域名默认 `<SY_OSS_ENDPOINT>/public`，可用 `SY_OSS_PUBLIC_BASE` 覆盖为自有 CDN 域名。

## 上传 API

全部接口要求有效管理员会话，匿名返回 401。

1. `POST /api/admin/media-uploads`：传 `kind:'video'|'audio'`、`name`、`type`、`sizeBytes`；视频还传 `durationSeconds`，音频传 `previewSeconds`。返回 `{id,partSize,partCount}`。
2. `PUT /api/admin/media-uploads/:id/parts/:number`：上传原始二进制分片，编号从 1 开始。服务器检查编号、大小、MP4 文件头并使用 MD5/ETag 验证 OSS 分片写入。
3. `POST /api/admin/media-uploads/:id/complete`：服务器以已确认的分片顺序合并，检查 OSS XML 成功结果及对象大小。视频返回 `{ossKey,durationSeconds,sizeBytes,storage:'oss'}`；音频进一步解码、生成试听并写入两份私有对象，返回 `{audioFile,previewFile,durationSeconds,previewSeconds,storage:'oss'}`。
4. `DELETE /api/admin/media-uploads/:id`：中止未完成任务并删除已上传分片。完成结果可重复读取；清理任务不会删除已成功交回表单的媒体。

同一任务串行处理，最多 8 个未完成任务，闲置一小时过期。任务状态仅在当前 Node 进程内存中；服务重启或刷新页面后须重新选择文件。过期任务在后续创建任务时尽力中止；进程崩溃遗留的 OSS 未完成分片可使用 bucket 生命周期清理。未宣称支持跨重启续传。

音频临时处理使用 `SY_AUDIO_PRIVATE_DIR`，默认 `private-audio/`；成功和失败均清理本次临时文件。音频原始分片对象只用于处理，成功后清理；不把服务器硬盘作为持久存储。旧 `POST /api/admin/upload-audio` 二进制/JSON 入口仍兼容，同样强制 OSS 成功；新后台统一使用分片入口。

## 公开试听与公读前缀

- 公开可试听的音频（音轨 1–60 秒片段、首页试听）一律放在 OSS `public/audio/`，由 OSS/CDN 直接下发，网站 nginx 的 `/audio/` 不再是媒体源。
- `/api/content`、`/api/miniprogram/home` 与 `/api/miniprogram/audio/:id/access` 的公开试听字段返回 OSS 绝对 URL；付费原片仍只在私有前缀并以 600 秒签名 URL 下发。
- OSS 未配置时（本地开发/测试）保留站内相对路径回退，便于离线实验；生产必须配置，否则后台保存站内路径会尝试上传并失败（502 `OSS_PUBLIC_AUDIO_SYNC_FAILED`）。
- 后台把首页试听保存为站内 `/audio/<name>` 时，服务端自动上传到公读前缀并回填绝对地址；已是公读绝对地址则幂等跳过。
- 历史试听补齐用运维脚本 `npm run media:public-audio`（在生产 release 目录、带 OSS 与 DB 环境变量运行，`--dry-run` 只预演）：本地 `public/audio/*` 上传、私有对象用 `x-oss-copy-source` 复制，逐对象 HEAD 校验大小与 immutable，输出 JSON 汇总，失败退出码 1。脚本只写 OSS，不改数据库。
- 公开片段只接受不含路径的纯文件名（`.m4a`/`.mp3`/`.aac`/`.wav`），既可沿用历史可读文件名（如 `selected-routes-intro.m4a`），也支持 `<32 位十六进制>-preview` 形式；带 `..`、子目录或非音频扩展名的路径不会进入公开字段。

## 播放与发布

上传不自动创建、发布或保存视频/音轨。原音频年会员权限、视频按 `videoId` 单独购买及私有签名播放沿用；公开内容不返回 OSS 路径或未鉴权播放地址。音频 OSS 代理保留 Range 的 206、416 及 Content-Range，兼容播放器请求。

本次验证在隔离环境完成，尚未部署；提交与推送状态以共享日志为准。发布须按仓库 Git 发布流程更新完整服务端源码及两份构建入口；新旧后台、服务端应同时发布。分片路径需允许 PUT，单次请求上限至少 5 MiB；无需提高到整部影片大小。服务重启会终止未完成上传，发布前应等待上传结束。

## 验证与依据

- `npm run test:media-oss-upload`：隔离 OSS 签名模拟服务验证私有上传、分片大小、完整性、重试/中止/重复完成、错误 XML、大小核验、音频试听、临时清理、无配置拒绝；同时断言只有 `public/audio/` 可为 `public-read` 且带 immutable，完整音频永不进入公读前缀。
- `npm run test:public-audio-oss`：模拟 OSS（公读前缀、copy-source、Range）验证绝对 URL 契约、后台站内路径自动发布、幂等、`access` 试听地址、私有不泄露、copy 迁移与 206 透传。
- `npm run test:audio-oss-migration`、`node scripts/test-heritage-content.mjs`：旧音频读取、OSS 试听及完整播放、权限、Range 与历史内容兼容。
- `npm run test:admin-guide-videos-ui`：真实组件方法验证上传回填、失败保留旧引用、重试和必须单独保存。
- OSS 协议依据：[分片上传](https://www.alibabacloud.com/help/en/oss/user-guide/multipart-upload)、[V1 请求签名](https://www.alibabacloud.com/help/en/oss/developer-reference/include-signatures-in-the-authorization-header)、[合并分片](https://www.alibabacloud.com/help/en/oss/developer-reference/completemultipartupload)。
