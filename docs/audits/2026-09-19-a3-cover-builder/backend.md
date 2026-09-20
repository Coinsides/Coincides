> **状态 (Status)**: active
> **日期**: 2026-09-19
> **用途**: A3 builder 后端与共享模型蒸馏证据；原始日志留 `.codex-tmp/a3-cover/`。
> **上游**: `docs/agent-ops/handoffs/2026-09-19-v14-a3-cover-page-order.md`。

# A3 后端与共享模型

## 建模

沿用 A2 的 `notes.binding_settings_json`，没有新增 notes 列、表或迁移。`NoteBindingSettings` 保留 v1 可读，新配置为 v2：

| 字段 | 语义 |
| --- | --- |
| `version: 2` | A2 六槽/装订段/计数器结构原样保留 |
| `coverPage.frameId: string \| null` | 已持久化普通 `page_frame` 的封面身份；null 表示无封面页 |
| `coverPage.exportIncluded: boolean` | 默认 true 的导出选项 |
| `cover: { assetId, card?, page? } \| null` | 唯一封面原图资产与按用途取景框；至少一个框 |
| `cover.card` / `cover.page` | 复用 `NoteCoverFrame { crop: { x,y,width,height }, zoom }`；百分比相对原图 |

共享模型：`shared/types/noteBinding.ts:55`；原卡框数据与取景计算：`shared/types/noteCover.ts:11`。服务器只做类型导入，v1→v2 结构适配在 `server/src/services/noteBindingModel.ts:5`，默认值用跨端功能测试核对。裁剪计算只在客户端调用共享 helper；服务器没有第二套裁剪公式。

封面帧沿用 `canvas_objects`、`canvas_placements`、`page_frame_extensions` 和 `savePageFrameCollection`。封面排在 `pageFrames[0]`，内容首页仍是 primary frame，封面独立页叠，不加入内容流页叠。身份位于装订 JSON，不加 Canvas kind，不改 `page_frame_local` 坐标契约。

## 人类接口与生命周期

`PUT /api/notes/:id/binding-settings` 接收 `{ binding_settings, collection? }`。改变封面身份必须同时给 collection；同事务复用原页帧集合保存。提供 collection 时响应额外返回 `canvas_persistence`（既有 `getNoteCanvasPersistence` 快照），供客户端接回真实页帧和 placement。入口：`server/src/routes/noteBinding.ts:11`；事务：`server/src/services/noteBinding.ts:30`。

移除方案选择**移交首页**：原封面居民的 `canvas_placements.frame_id` 迁到首内容页，文字、投影、媒体、装饰、墨水及非 active 留存居民均保全。只改页籍，不经会四舍五入的读侧布局重新保存，因此 x/y/width/height、小数精度、墨水点与正文均不改；取景和原图保留，恢复封面可复用。测试覆盖文字、题名投影、墨水的移交前后逐值相等（`v14CoverPage.test.ts:76`）。

`note_ref` 是既有 `paragraph_block_projection` 家族的新 NoteBlock 类型，内容仅 `{ field:'title'|'description' }`。不带复制的 title/plain_text，不写 TextFlow schema；编辑使用原笔记题名/述名接口，删除仅退投影。**每张当前封面** active 同字段投影至多一个，重复创建返回既有块；首页历史投影及托盘居民不占新封面名额。入口同原 POST blocks、client-create 收据服务与普通块删除：`noteCoverRules.ts:16`、`noteBlockLifecycle.ts:434`、`routes/notes.ts:286`。

创建到 canvas placement 落位之间，既有 `note_block_placements.display_overrides_json.note_ref_pending_frame_id` 只记录摆放归属提示，不存题述名或坐标副本。已有真实 canvas placement 时，其 frame/surface 绝对优先；只有尚无 canvas placement 时才以 pending 提示占当前封面名额。移除封面事务把未落位提示一并迁到首页，重建同一 frameId 也不会复活旧占位。移除→重建后可添加新题述名且旧首页投影保留；已有同字段封面投影时，旧首页或托盘投影拖回会被拒绝，块内容更新也按当前封面范围检查。正常生命周期功能测试覆盖这些行为，未增加安全对抗测试。

住户检查复用现役 renderer 的分类口径：text-role 变体仍算 text，formula/code 模板、非空 `content_json.language` 和 Item 投影不入封面；文本/题名/述名/媒体块必须 manual。已有封面块改内容/模板时也检查该约束。`noteCoverRules.ts:74`、`noteBlockContent.ts:34`；集合普通保存还保证封面第一位且不入内容流页叠（`canvasObjects.ts:1796`）。

## 唯一封面资产与卡框兼容

canonical 资产引用与 card/page 参数均住 v2 装订 JSON。原 `metadata.binding.cover` **读取协议保留**，`hydrateNote` 从 canonical 数据投影卡框；写入后 metadata 仅留 null 兼容槽，不再存第二份资产或框参数。旧 metadata-only 卡面在 GET binding 时只读投成可用 v2，读操作不迁移数据库；首次卡面/装订写入归家。canonical null 明确遮蔽旧槽，避免已清除图重生。

原卡面 POST/PUT 输入形状不改，内部 `adaptCardCoverWrite` 保存 canonical card 并保留 page；page 保存保留已有 card。新 page 图没有既有 card 时，客户端从原图 natural size 调用共享 helper 一并提交 card 初始框，服务器验证而不计算。相关实现：`noteCoverStorage.ts:13/23/40`、`routes/notes.ts:117/184`；实 HTTP 双向保存/替换/零复制存储测试：`v14CoverPage.test.ts:201`。

资产引用计数新增 canonical JSON 槽，note/course 最终清理沿既有收尾流程；删除封面页或改取景本身不释原图。`canvasAssets.ts:194/279/351`。

## 既有 PUT 完整源码锁续记

既有 `v2NotesLifecycle.test.ts:417` 锁住整个 PUT handler。A3 只增加 canonical binding/metadata 适配；将该适配的调用、SELECT 字段/类型及字段赋值剔除，并恢复 `stringifyJson(metadata,{})` 后，精确得到上一授权卡面基线：

- 旧锁及逆变换结果：`41593a991c0fba093d9057f79a4781f6a5b0966b81006a3e0052842a4fae776c`。
- A3 完整 handler：`e01b1bec441fbbb2ddbea415c5627d01ee1abf26395bc46917ebb961c8e9c220`。
- 原始证明：`.codex-tmp/a3-cover/verify-put-baseline.mjs`、`put-baseline-proof.json`。

源码锁只续记授权基线，完整 handler 断言保留；原 source-projection/page-preset guards 没有改动。Relation 域、授权写门、注册表、Agent 机关均未修改。

## 验证

- A3 新增 8 项功能测试，已加入现有 `server/package.json` 的全库线路。
- 最终定向（A3/A2/item_ref/card/manifest lifecycle）25/25 PASS：`server-targeted-rebuild.log`；A3 单文件 8/8 PASS：`server-rebuild-targeted.log`。
- server `tsc --noEmit` PASS：`server-typecheck-rebuild.log`；既有 `pretest:v2` PASS：`server-pretest-rebuild.log`。
- server/shared runtime-import 门 PASS，0 违规：`server-runtime-import.log`。
- 最终 server 全库：97 个 `.test.ts`，995 tests / 993 pass / 2 fail / 0 skipped / 0 cancelled / 0 flaky retries，115.28 秒，退出 1。完整集合为 `server-full-rebuild-files.txt`（src/scripts 无排除），日志 `server-full-rebuild.log`。两项失败均为下述现有 Python/MinerU 环境限制，故不宣称 server 全绿。

首轮全库为 994 tests / 990 pass / 4 fail。源码锁已按上述证明续记，npm lifecycle 所需 `npm_execpath` 已补正并定向通过。另两项现有 MinerU/Python 环境失败：`v2SourceMineruWiring` 的 `python.exe` 不在可用 PATH；`v2SourceRegionCells` 固定 MinerU venv 的 shim 无法启动其用户 uv Python。用户 Python 目录读取亦被当前权限拒绝；未改外部运行时、fixture 或测试门来豁免。

最终全库中 A3 八项（含重建封面去重）、A2 装订、卡面封面、Item 引用、既有 PUT 源码锁和 npm lifecycle 均通过；没有排除任一文件或测试名。整库环境为系统 TEMP/TMP、空 dotenv 与 validation env 目录、`DB_PATH=:memory:`、空 `NODE_OPTIONS` 和已安装 npm 的明确 `npm_execpath`。
