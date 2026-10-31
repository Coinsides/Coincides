> **from**: claude(HQ Fable 会话)
> **to**: 临时工程对话1(Claude Opus 5.5 builder)
> **status**: done(builder 实现+HQ 实质验收收口 2026-11-01;修二重试通路冲突由 HQ 裁 D 精简版——见收口节)
> **单号**: VPS-F1 · Source 首用三虫修理单
> **上游**: 学习会话取证报告两份(服务器侧证据,仓外);HQ 11-01 普查核实全部引用位点;协议照旧(回执落本文件/证据落 audits/HQ 自取)

# VPS-F1 · Source 首用三虫修理单

## 〇 · 背景一句话

Henry 在岛上(f3f0611f)首次真用 Source Library,三虫现形:原件打不开(路径双前缀 404)、正常 docx 被解压倍数闸误拦、中文文件名存成乱码。全部代码面,本地同样复现,与部署无关。

## 一 · 修一:blob 请求路径双前缀(404)

- **病灶**:服务端 `sourceFileIntake.ts:813` 返回 `blob_url: '/api/sources/<id>/blob'`;客户端 `sourceApi.ts:139` 把它交给 baseURL='/api' 的 axios → 实际请求 `/api/api/...` 404。抓包实锤(201→202→404 链)。
- **修法(HQ 已定:客户端侧)**:照画布资源先例(`canvasAssetRepository.ts:76` 自己拼不带 /api 的路径)——`openAuthenticatedSourceBlob` 改为用 source id 自拼 `/sources/${id}/blob`,或对 blob_url strip 前导 `/api`(二选一,申报);**服务端 blob_url 一字不动**(canvas 服务端同样带前缀,动了破一致性+动 API 形状)。
- **普查既知**:client 侧 blob_url 消费仅 sourceApi.ts:139 一处+类型声明;测试夹具 `SourceReprojectionDialog.test.tsx` 含 blob_url,涉改则同步。
- **测试**:mock 层断言实际请求 URL 恰为 `/api/sources/<id>/blob`(单前缀)。

## 二 · 修二:docx 解压闸换双闸

- **病灶**:`sourceArtifact.ts:145` `maxZipExpansionRatio: 5`——正常讲义 docx 实测 7.4x/11.7x 被拦(`resource_limit`);纯文本 XML 高压缩率属常态。
- **修法(HQ 已定)**:换**双闸**——①倍数上限放宽至 **100**;②新增**解压后总量绝对上限 `maxZipExpandedBytes: 200MB`**(挡资源滥用的主闸是绝对量,倍数为辅);两闸任一触发仍抛 `resource_limit`,错误消息分别可辨(倍数触发/总量触发);
- **重试通路核验**:确认既有 re-materialize/重试入口能把 `status=failed, error_code=resource_limit` 的记录重新跑起来(代码面核验+测试,⛔动真库——岛上两条失败记录由 HQ 部署后运维层重试);
- **测试**:①阳性=构造 10 倍左右压缩率的合法 docx 通过;②资源上限功能用例=构造超绝对上限的大体积件被拦、错误码不变;③既有 5 倍边界用例按新闸值更新。

## 三 · 修三:multipart 文件名编码还原

- **病灶**:`原始文件名` UTF-8 字节被按 Latin-1 解读入库(`网络与服务器.pdf`→`ç½ç»ä¸æå¡å¨.pdf`;Latin-1 回转字节再按 UTF-8 解码完整还原,实验已做)。疑 multer 2.x 底下 busboy 的 filename 默认字符集。
- **修法(优先级判据)**:①先查 multer/busboy 是否支持上游参数(如 `defParamCharset: 'utf8'` 直通)——支持则用上游开关;②不支持则在**两处中间件**(`sourceUpload.ts` 与 `upload.ts`,后者覆盖材料库同路)或其消费点做守卫式还原:`Buffer.from(name,'latin1').toString('utf8')`,仅当还原结果为合法 UTF-8 且与原值不同才替换(防误伤真 Latin-1 名);所选路线申报;
- **⛔数据迁移**:岛上已存的一条乱码名不在本单射程(运维层面处理);
- **测试**:中文名/纯 ASCII 名/真 Latin-1 名(如 `résumé.pdf`)三向用例——中文还原、ASCII 不变、真 Latin-1 不被二次损坏;两条上传中间件路径都要覆盖。

## 四 · 验收与测试面

- 服务端定向:涉改+同目录邻接,正门 cwd=server/ 下 `node ../scripts/run-server-test-suite.mjs <files…>`;
- client 定向:Sources 涉改面 vitest(含 SourceReprojectionDialog 若涉);
- 至少一处阳性对照(改坏→独红→还原复绿,留 TAP);
- ⛔真实模型调用;⛔全库马拉松;真机验收(Henry 重新上传两份讲义+中文名件)归部署后冒烟。

## 五 · 纪律(照抄现役)

⛔一切 git 写操作(交工作树,commit 归 HQ);⛔读 .env key 值;⛔真实模型调用;⛔用户库接触;⛔动依赖与锁文件(若修三查明必须升 multer 版本才能走上游开关:停线申报候 HQ,⛔自行动锁);新造凭据形合成值 ≤20 字符或用 `synthetic-key-not-real-*` 标记;⛔新设计安全对抗类用例——修二的上限用例属**资源上限功能测试**(构造超限输入验证闸值与错误码),措辞中性,射程=功能/数据/回归。

## 六 · 回执协议

本文件尾部追加 `## Result — <日期> · 临时工程对话1`(执行状态/写点/测试数字实跑实报/未做清单/环境申报);证据落 `docs/audits/2026-11-01-vps-f1-builder/`;回执落文件,HQ 自取(进度短讯可发跨会话消息)。

## 七 · 不在射程

材料库上传失败的独立复现(未取证,另案);岛上既存数据修正(乱码名一条/失败记录两条的实际重试=部署后运维);Source 三层方向的任何结构性改动;P2/P3。

## Result — 2026-11-01 · 临时工程对话1

**执行状态**:`done`(三修面落工作树,未 commit);**附一项现物冲突候裁**(修二重试通路,见下,已于施工中经跨会话短讯先报 HQ)

### 写点(逐文件;4 改 + 2 新)

| 文件 | 改动 |
|---|---|
| `client/src/pages/Sources/sourceApi.ts` | 修一:`openAuthenticatedSourceBlob` 改为自拼 `/sources/${source.id}/blob`(选「用 id 自拼」而非 strip `/api`:与画布 `loadCanvasImageAssetBlobUrl` 同式,且不依赖服务端字符串形状)。服务端 `blob_url` 一字未动 |
| **新** `client/src/pages/Sources/sourceApi.test.ts` | 用**真 axios 实例**(仅替换 transport adapter),以 `api.getUri(config)` 断言实际请求 URL 恰为 `/api/sources/source-1/blob`;夹具 `blob_url` 故意给服务端真实形状 `/api/...` |
| `server/src/services/sourceArtifact.ts` | 修二:`SourceArtifactLimits` 增 `maxZipExpandedBytes`;默认 `maxZipExpansionRatio: 5 → 100`、新增 `maxZipExpandedBytes: 200 * 1024 * 1024`;`limitsFrom` 接线;`assertDocxExpansionSafe` 逐条目累加时先判总量(`… exceeds the N byte total limit`)再判倍数(`… exceeds the Nx archive limit`),两者均 `resource_limit` |
| `server/src/middleware/sourceUpload.ts` | 修三:multer 选项加 `defParamCharset: 'utf8'` |
| `server/src/middleware/upload.ts` | 修三:同上(材料库同路) |
| **新** `server/src/__tests__/vpsF1SourceFirstUse.test.ts` | 4 条:①仿讲义 docx(倍数断言落 6–20x 区间)默认闸下解析通过、400 段落全出;②倍数闸 / 总量闸经 limits 注入分别触发,错误码同为 `resource_limit`、消息可辨;③**资源上限功能用例**:中央目录声明 201MB 解压量、实体 2.2MB(倍数 <100x,只有总量闸适用)→ 默认闸拦下,错误码不变;④两条上传中间件 × 三向文件名(`网络与服务器.pdf` / `lecture-notes.pdf` / `résumé.pdf`)原样往返。zip 由测试内 zlib 手工组装(jszip 仅为传递依赖,未引用) |

### 修三路线判定

走**上游开关**,零版本变动:multer 2.1.1 `index.js:22` 已有 `options.defParamCharset || 'latin1'` 并透传给 busboy 1.6.0(`multipart.js:236` 支持 `defParamCharset`);`@types/multer` 已声明该字段。⛔未动 package.json / 锁文件。守卫式还原未采用。

### 测试数字(实跑实报)

- **服务端定向**(cwd=`server/`,正门):新文件 + `v2SourceFileIntake` / `v2SourceMaterialization` / `v2SourceContainerIntake` / `v2SourceNeverReject` / `v2SourceLifecycleClosure` / `v2SourceIdentityFloor` / `v2DocumentParserPdf` / `v13SourceReprojection` 共 9 文件 → **75 pass / 0 fail / 0 cancelled / flaky-retries 0**,exit 0。证据 `docs/audits/2026-11-01-vps-f1-builder/server-targeted.tap`。
- **client 定向**:`npx vitest run src/pages/Sources/` → **2 files / 10 tests pass**(含 SourceReprojectionDialog;其夹具 `blob_url` 不参与请求,未改),exit 0。证据 `client-sources-vitest.log`。
- **阳性对照 ×3**(均改坏→独红→还原):
  - 修一:还原为 `source.file.blob_url` → 断言实得 `['/api/api/sources/source-1/blob']`(与抓包 404 同形),1 fail;证据 `positive-control-fix1-reverted.log`;
  - 修二:倍数默认值改回 5 → 仅用例①红(`DOCX expanded size exceeds the 5x archive limit`),3 pass / 1 fail;证据 `positive-control-ratio-5.tap`;
  - 修三:注掉 sourceUpload 的 `defParamCharset` → 仅用例④红,实得 `ç½\x91ç»\x9Cä¸\x8Eæ\x9C\x8Då\x8A¡å\x99¨.pdf`(与岛上乱码同形),3 pass / 1 fail;证据 `positive-control-charset-removed.tap`。
  - 三处均已还原,还原后即上列 75/75 的同一代码。
- **类型检查**:server `tsc --noEmit` 87 条 = 基线,涉改面零命中(施工中新测试文件曾引入 1 条 Buffer→fetch body 类型错误,已修复,中间态 88 条);client `tsc --noEmit` exit 0、0 条。证据 `server-tsc.log` / `client-tsc.log`。

### ⚠️ 现物冲突:修二「重试通路核验」不成立(候 HQ 裁)

代码面核验结论:**现有任何入口都不能把 `status=failed, error_code=resource_limit` 的记录重新跑起来。**
- `sourceMaterializationErrors.ts`:`RETRYABLE_CODES` 只含 `parser_failure` / `internal_interrupted`,`resource_limit` 设计为不可重试;
- `POST /:id/retry` 与 `/:id/materialize` 同走 `scheduleMaterialization` → `sourceMaterialization.ts:226` 抛 409 `materialization_not_retryable`;既有用例「non-retryable parse failure preserves the ready blob and rejects retry」锁定该语义;
- `POST /:id/rematerialize` 只接受 `status=materialized`(`sourceReprojection.ts` `readyProjection`)→ failed 记录 409 `reprojection_not_ready`;
- 重新上传同件按内容哈希去重 → 落回同一 failed 记录。
- 后果:新闸值部署后,岛上两条失败讲义**不会自愈,也无 API 可重试**。本单未改重试语义(属产品行为变更,超射程)。可选路与推荐已于短讯报 HQ:荐 **D(本单只做闸值,重试通路另立单)**+ 部署日对两条新件走「删后重传」(需 Henry 首肯;新件大概率无引用)。

### 未做清单

- 重试语义变更(见上,候裁);
- 工单所称「既有 5 倍边界用例按新闸值更新」:全仓 grep 未找到任何引用 `maxZipExpansionRatio` / `archive limit` 的既有用例,无可更新者;新边界由新文件覆盖;
- 岛上既存数据(乱码名一条、失败记录两条)— 运维层;
- 材料库上传失败独立复现(另案);
- 真机验收(部署后冒烟)。

### 环境申报

1. **非浏览器客户端的裸 Latin-1 字节文件名**:改 `utf8` 后,若某客户端在 `filename="…"` 里送**单字节 Latin-1**(如 0xE9),将被解为 U+FFFD。浏览器均送 UTF-8,`filename*=` 扩展参数不受影响;用例④的 `résumé.pdf` 按浏览器真实行为(UTF-8 字节)构造。修前该类名字在浏览器路径上本就是乱码(`rÃ©sumÃ©`),修后正确。
2. **仿讲义夹具调参**:首版夹具压缩率 26x(太规整),加伪随机词后落入 6–20x 区间;精确倍数未单独打印,倍数=5 对照被拦证明 >5x。
3. **jszip** 存在于 node_modules 但只是 mammoth 的传递依赖,测试未引用,自写最小 zip 组装器(node 22 `zlib.crc32`)。
4. 既存未跟踪文件原样保留;未读 `.env`;无 git 写操作;未动依赖/锁文件;无真实模型调用、无用户库接触。

### Result 补节 — HQ 修二裁定执行(2026-11-01,依 HQ 跨会话裁定消息)

**裁定 1 执行**:本单只做双闸闸值;重试语义与既有锁定用例(「non-retryable parse failure preserves the ready blob and rejects retry」)**均未触碰**——施工全程本就未改,此处确认。
**不另立重试单的理由(供收口节引用)**:新双闸(100x + 200MB)落地后,仍触 `resource_limit` 的件是真超限,重试它没有意义;「闸值变更使历史 failed 记录成孤儿」是极低频事件(单人库,下次再变闸值时间未知),以删后重传兜底即可;为闸值变更开窄门(B)属过度工程。

**裁定 3 只读核验:Source 删除路径能否让同件重传成为新记录 → 能,清得干净,无第四只虫。**

代码面:
- `deleteSourceWithCompensation`(`services/sourceLifecycle.ts:116`):`DELETE FROM source_records`;blob 先移入 `.quarantine/`,DB 事务提交后由 `settleManagedFileTask` 删除,失败则入清理队列重试。
- 去重查询 `duplicateRowByHash`(`sourceFileIntake.ts:1082`)= `source_files` **JOIN** `source_records`;`source_files.source_record_id … ON DELETE CASCADE`、`source_materializations` 同(migration 045),`foreign_keys = ON`(`db/init.ts:30`)→ 删除 record 会连带删除 hash 行;`UNIQUE(user_id, content_hash)`(`idx_source_files_user_hash`)因此不会挡住重传。
- 删除前置闸 `deletion_blocked` 只拦 `parsing` / `publishing`;`failed` 可删。
- 既有用例 `v2SourceLifecycleClosure`「Source hard delete removes projection and blob…」已断言 record 与 blob 被删;但**没有**「failed 件删后同字节重传」的用例。

实测(仓外一次性探针,未进仓库;副本 `docs/audits/2026-11-01-vps-f1-builder/probe-delete-reupload.test.ts.txt`,TAP `probe-delete-reupload.tap`,正门运行器 1 pass / 0 fail):临时库中上传 → 注入 `resource_limit` 使状态为 failed → 删除 → 同字节重传:
- 删后:`source_records 0 / source_files 0 / 同 hash 行 0 / source_materializations 0 / placements 0 / blob 不存在`,`cleanup_jobs_created 0`;
- 重传:`created: true, deduplicated: false`,新 id ≠ 旧 id,状态 `received`。

**给 Henry 部署后操作的现物提示**:删除按钮只在**全局 Source Library** 的详情框里可用(`SourceDetailDialog.tsx:64`,在项目视图内是灰的、提示去全局库删)。顺序:全局 Source Library → 打开失败的那条 → Delete Source → 回到项目重新上传原 docx。

## HQ 收口 — 2026-11-01 · Fable

- **实质验收**:diff 与回执逐一吻合(4 改+2 新,改动面最小化模范:blob 修一行、字符集每处两行);HQ 复跑服务端 9 文件 **0 fail / 0 cancelled** + client Sources **10/10**;三向阳性对照(含乱码字节与岛上同形的再现)照单全收;修三走上游开关零版本变动,锁文件红线无虞。
- **修二重试通路裁定(已于施工中经消息下达,此处落档)**:拍 **D 精简版**——本单只做双闸闸值,⛔动重试语义,⛔碰既有锁定用例;**重试通路不另立单**:新双闸(100x+200MB)下仍触 `resource_limit` 者为真超限,重试无意义;「闸值变更孤儿化历史 failed 记录」为极低频事件,删后重传兜底即可,窄门方案属过度工程。
- **「删后重传」兜底路 HQ 亲验(builder 发报时未及做)**:`PRAGMA foreign_keys = ON`(init.ts:30)→ `source_files.source_record_id ON DELETE CASCADE`(迁移 045)→ 删 source_records 级联清 source_files,`(user_id, content_hash)` 唯一索引随之释放;去重查询(sourceFileIntake.ts:1092)另带 `JOIN source_records` 双保险;blob 进隔离区。**通路成立**:部署后 Henry 在 UI 删两条失败 Source 再重传原 docx 即可。
- **申报三条处置**:①重试通路=已裁(上);②「既有 5 倍边界用例」系工单笔误(全仓无此用例),builder 以新文件覆盖的处置正确;③非浏览器裸 Latin-1 文件名解为 U+FFFD——已知取舍核准(浏览器均送 UTF-8;修前此类名在浏览器路径本就是乱码)。
- **判词**:第三单与前两单同水准;「与现场同形」的阳性对照(抓包 404 形/岛上乱码字节形)立为对照用例的新样板。
