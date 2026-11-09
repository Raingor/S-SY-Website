# 后台视频与音频上传到 OSS

## 操作

- 视频：在「开发配置 → 攻略视频」编辑记录，使用「上传视频到 OSS」。支持 MP4、最大 2 GiB，上传完成自动回填 OSS 路径、时长与大小。
- 音频：在音频编辑页上传 MP3/M4A，最大 30 MiB。服务器验证音频并生成 1–60 秒内的试听片段，完整音频和试听均写入私有 OSS。
- 两者都通过最多 5 MiB 的分片请求上传，显示上传进度，单片暂时失败最多重试两次。成功后仍需点击「保存」，才会绑定内容记录。上传失败保留原表单中的媒体引用。
- 未配置 OSS 返回 503；OSS 上传或合并失败返回 502。不会将仅保存到本机的文件当作上传成功。

## 服务端配置

沿用 `SY_OSS_ACCESS_KEY_ID`、`SY_OSS_ACCESS_KEY_SECRET`、`SY_OSS_BUCKET`、`SY_OSS_HOST`。测试可用 `SY_OSS_ENDPOINT` 指向隔离模拟服务。金钥仅保留在服务端，本地 `.env`、`.env.local`、`ali.md`、`aliyun.md` 不进入 Git。部署时沿用生产环境变量，不提交或同步本地密钥。

本地已通过用户提供的 `ali.md` 只读核对 `sy-mpapp` bucket，区域为 `oss-cn-shenzhen`、ACL 为 private；本机缺少的设置已补入被忽略的 `.env`，权限为 600。未上传真实 bucket 测试对象，未修改 bucket、生产配置或生产内容。

所有媒体对象写入时显式设为 private。RAM 权限需允许该 bucket 下 `video/`、`audio/` 的读取、写入、私有 ACL 设置及中止分片；失败清理还需删除本次随机生成对象的权限。代码不会修改 bucket 策略。分片由网站后端转发，不要求浏览器直连 OSS 或新增 OSS CORS 规则。

## 上传 API

全部接口要求有效管理员会话，匿名返回 401。

1. `POST /api/admin/media-uploads`：传 `kind:'video'|'audio'`、`name`、`type`、`sizeBytes`；视频还传 `durationSeconds`，音频传 `previewSeconds`。返回 `{id,partSize,partCount}`。
2. `PUT /api/admin/media-uploads/:id/parts/:number`：上传原始二进制分片，编号从 1 开始。服务器检查编号、大小、MP4 文件头并使用 MD5/ETag 验证 OSS 分片写入。
3. `POST /api/admin/media-uploads/:id/complete`：服务器以已确认的分片顺序合并，检查 OSS XML 成功结果及对象大小。视频返回 `{ossKey,durationSeconds,sizeBytes,storage:'oss'}`；音频进一步解码、生成试听并写入两份私有对象，返回 `{audioFile,previewFile,durationSeconds,previewSeconds,storage:'oss'}`。
4. `DELETE /api/admin/media-uploads/:id`：中止未完成任务并删除已上传分片。完成结果可重复读取；清理任务不会删除已成功交回表单的媒体。

同一任务串行处理，最多 8 个未完成任务，闲置一小时过期。任务状态仅在当前 Node 进程内存中；服务重启或刷新页面后须重新选择文件。过期任务在后续创建任务时尽力中止；进程崩溃遗留的 OSS 未完成分片可使用 bucket 生命周期清理。未宣称支持跨重启续传。

音频临时处理使用 `SY_AUDIO_PRIVATE_DIR`，默认 `private-audio/`；成功和失败均清理本次临时文件。音频原始分片对象只用于处理，成功后清理；不把服务器硬盘作为持久存储。旧 `POST /api/admin/upload-audio` 二进制/JSON 入口仍兼容，同样强制 OSS 成功；新后台统一使用分片入口。

## 播放与发布

上传不自动创建、发布或保存视频/音轨。原音频年会员权限、视频按 `videoId` 单独购买及私有签名播放沿用；公开内容不返回 OSS 路径或未鉴权播放地址。音频 OSS 代理保留 Range 的 206、416 及 Content-Range，兼容播放器请求。

本次验证在隔离环境完成，尚未部署；提交与推送状态以共享日志为准。发布须按仓库 Git 发布流程更新完整服务端源码及两份构建入口；新旧后台、服务端应同时发布。分片路径需允许 PUT，单次请求上限至少 5 MiB；无需提高到整部影片大小。服务重启会终止未完成上传，发布前应等待上传结束。

## 验证与依据

- `npm run test:media-oss-upload`：隔离 OSS 签名模拟服务验证私有上传、分片大小、完整性、重试/中止/重复完成、错误 XML、大小核验、音频试听、临时清理、无配置拒绝。
- `npm run test:audio-oss-migration`、`node scripts/test-heritage-content.mjs`：旧音频读取、OSS 试听及完整播放、权限、Range 与历史内容兼容。
- `npm run test:admin-guide-videos-ui`：真实组件方法验证上传回填、失败保留旧引用、重试和必须单独保存。
- OSS 协议依据：[分片上传](https://www.alibabacloud.com/help/en/oss/user-guide/multipart-upload)、[V1 请求签名](https://www.alibabacloud.com/help/en/oss/developer-reference/include-signatures-in-the-authorization-header)、[合并分片](https://www.alibabacloud.com/help/en/oss/developer-reference/completemultipartupload)。
