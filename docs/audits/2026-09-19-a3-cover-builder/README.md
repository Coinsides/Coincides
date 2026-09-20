> **状态 (Status)**: active（builder 完工回执；待 HQ 验收）
> **日期 (Updated)**: 2026-09-19
> **工单**: `docs/agent-ops/handoffs/2026-09-19-v14-a3-cover-page-order.md`

# A3 真封面页与真相绑定块

施工已交工作树。复用 A2 binding JSON/页码钩子、A1 documentPageFlowService、卡面 v1 原图取景；没有新增 notes 列、依赖或另一套裁剪公式。完整验证门未执行，server 两项 Python 环境失败及实机限制仍留 HQ 收口。

## 建模与退档

| v2 字段 | 建模 |
| --- | --- |
| `version:2` | 兼容 v1；A2 enabled/dropFolioOnCover/sections 六槽与计数器沿用 |
| `coverPage.frameId` | 普通持久化 page_frame 的 ID；null 为无封面 |
| `coverPage.exportIncluded` | 默认 true；关闭只影响导出/打印，不移除浏览投影 |
| `cover.assetId` | 唯一原图，存于 binding_settings_json |
| `cover.card?` / `cover.page?` | 同原图的非破坏 crop{x,y,width,height}+zoom，至少一框；复用既有 card 机制 |
| `note_ref.content_json.field` | 仅 title 或 description；真相仍为 notes.title/description |

封面是独立页叠中的真实 frame，排在内容页前，运行时机械号 0；primary 仍指首内容页，内容计数从 1 起。封面不进 A1 reflow，住户全 manual；组件块拒入。移除采用**移交首内容页**，只迁 frame_id，原坐标、正文、墨水、原图和取景不丢；与首页原住户重叠时在 Layout 手动整理。选择该方案是为了退档可逆且不暗中删除内容。

有封面时旧表头带及其裸题述名输入退出，题述名由自由块投影编辑；无封面笔记保持原输入，退档后也恢复。题述名块删除只删投影，同一封面同字段重复添加聚焦既有件。退档重建后可创建新的封面投影，已迁首页或托盘的旧件不占当前封面名额；拖入重复件被拒绝。尚未落位的创建用既有 display_overrides_json 中 `note_ref_pending_frame_id` 关联封面，实际 placement 始终优先，不复制正文或坐标。

## 逐件定位

| 交付项 | 代码位置 |
| --- | --- |
| v2 型别与兼容默认 | `shared/types/noteBinding.ts:55`，`server/src/services/noteBindingModel.ts:5` |
| canonical 原图、card 读槽投影 | `server/src/services/noteCoverStorage.ts:13`，`:23`，`:40` |
| 封面生命周期事务/完整快照 | `server/src/services/noteBinding.ts:30`，`routes/noteBinding.ts:11` |
| frame 创建/移除 | `client/src/pages/Notes/canvasEngine/noteCoverPageCollection.ts:6`、`:19` |
| 绑定块居民规则与去重 | `server/src/services/noteCoverRules.ts:16`、`:24`、`:74`；`noteBlockLifecycle.ts:434` |
| 真相编辑/投影组件 | `client/src/pages/Notes/canvasEngine/blocks/NoteRefBlockProjection.tsx:5`，`NoteTruthBindingContext.tsx:4` |
| 块添加、manual 与既有焦点 | `hooks/useNoteCanvasRuntimeController.ts:614` |
| 原子快照回接、保留并发 metadata | `hooks/useNoteCanvasDataAdapter.ts:911`、`:935` |
| 封面设置与请求互斥 | `layers/NoteCoverPageControls.tsx:20`，`layers/NoteBindingPanel.tsx:13` |
| page 框复用、首图 card 默认 | `pages/Courses/noteCover/geometry.ts:52`、`:57`；`layers/NoteCoverPageControls.tsx:92` |
| 全幅衬底、旧标题带退场 | `layers/NoteCoverUnderlay.tsx:16`，`layers/NoteWritingSurfaceLayer.tsx:497` |
| reflow 隔离/机械序号 | `documentPageFlowService.ts:92`，`engineModel.ts:158`、`:342` |
| Overview/打印/导出/检索 | 详见 [页投影证据](page-projection-evidence.md) 的逐消费者行号 |
| 说明书 | `docs/agent-ops/current-state/app-operating-manual.md:35` 起；§一 已补全封面、双框、退档与 API 用法 |

表中 client 相对路径以 `client/src/pages/Notes/canvasEngine/` 为根，除单列完整路径外；server 相对路径以 `server/src/` 为根。

## 验证与证据

- 非 git/secrets 的 **23/23 组件 PASS**，包括最终 client/server 构建；完整清单和逐次退出码：[runtime-components.md](runtime-components.md)、[runtime-components.json](runtime-components.json)。`git diff --check` 和 secrets 扫描没有执行，留 HQ；不宣称完整 runtime 门已绿。
- client 全库 **193 文件、1940/1940 PASS**；默认并发首轮 17 超时+1书签等待失败，完整单 worker 复跑，不调 timeout、不排除测试。收尾增加的 6 项 controller 正常生命周期回归覆盖题名/述名在当前封面、旧首页、托盘中的去重。
- server 全库 **97 文件、995 项：993 PASS / 2 FAIL / 0 skipped**。仅现有 MinerU/Python 不可执行；没有排除测试或改外部运行时。server 定向 **25/25**、tsc、pretest 均通过。详见 [backend.md](backend.md)。
- 页投影定向 **9 文件、111 PASS**，坐标边界 **175 checks PASS**；裁剪/控件、适配器与 A2 回归亦包含在最终 client 整库中，定向数字不叠加为独立总数。
- [v2 实机](browser-evidence.md)：添加、双向题述名、重复聚焦、manual 拖动、Overview、检索 Page 0、导出开关、无损移交与投影删除均核验。
- 既有 PUT 完整源码锁因 canonical 存储适配续记；保留整段 hash 断言，并以逆变换精确复得旧 hash。证据与授权边界见 backend.md。没有修改产品授权写门、注册表或 Agent 机关。

所有原始日志留 `.codex-tmp/a3-cover/`，包括失败首轮、UI 数据与源码锁证明；这里仅存蒸馏。生成的文档索引与 object inventory 已更新。未修改 Relation 域、TextFlow 真相 schema 或坐标九条，未新增安全对抗用例，未进行 git 写操作/commit/push/PR/merge。

## 未完成的验收

HQ 仍需执行 git/secrets 两组件、在可用 Python/MinerU 环境复跑 server 两失败项、完成图片上传/page 取景与真实打印输出的主观验收。浏览器自动审批拒绝测试图片上传，未绕过；打印对话框在 CUA 标签面不可观测。这里不将组件测试等同于完整实机验收。
