> **状态 (Status)**: active（builder 施工回执；HQ 放行待办）
> **日期 (Updated)**: 2026-09-19
> **层 (Layer)**: Evidence / Builder receipt；不新增产品权威
> **工单**: [V14 A4](../../agent-ops/handoffs/2026-09-19-v14-a4-heading-chapters-order.md)

# A4 heading / 章投影 / 导航标题树施工证据

本单以 `note-page-design.md §1.2` 与 A4 工单为施工依据。章只有可重算投影；没有章表、章列、容器块、章成员关系或第二份 agenda 真相。工作树交 HQ，不含 commit。

## 考古与授权边界

- A1 `documentPageFlowService.ts` 已按现役 pageStack 计算完整自动流；manual 块使用既有 placement。折叠不能把删减后的流写回 affiliation。
- 导航窗格已具备三签壳，原 Headings 签为占位；本单接其内容，保留 Pages / Results 界面及既有事件刷新机制。
- TextFlow 契约为 frozen。按 F17 附加 amendment 先例，只扩 `writing_role` 封闭枚举；没有修改历史正文或其他真相 schema。
- 根目录存在 `.codegraph/`，但当前没有可调用 MCP / CLI；`rg` 也不可用，故采用定向文件读取。原始输出在 `.codex-tmp/a4-heading/`。

## 契约 amendment

路径：[`docs/contracts/TextFlow-Contract.md`](../../contracts/TextFlow-Contract.md) 第 177 行，节名 `Amendment — 2026-09-19 · V14 A4 heading roles and derived chapters`。

关键措辞：

> The closed `TextUnit.writing_role` union additionally accepts `heading_1`, `heading_2` and `heading_3`.

> There is no persisted chapter identity, parent, membership, page association or agenda copy.

该节同时铸入单硬行独立标题块、`# / ## / ###` 与 slash 输入、既有 extraction/transfer/save/revision/history 边界、15/22 Typography 比例、折叠分页、封面排除和 Agent 留接口的实装口径。旧 `heading` 可读作一级；不做读取时迁移。

## 实装定位

以下 client 路径均相对 `client/src/pages/Notes/canvasEngine/`，行号是本次交付定位。

| 要求 | 文件与入口 |
|---|---|
| 三级角色读写 | `runtimeDataTypes.ts:63`、`textFlowService.ts:38`、`headingRoleService.ts:8` |
| 行首输入、硬行正规化 | `headingInputService.ts:9` / `:26` / `:40`；两 TextBlock renderer 调同一服务 |
| Typography 四参联动 | `typographyMeasurementService.ts:15` / `:23` / `:101`；`textUnitEditorService.ts:221` 复用原拆分与 inline 映射 |
| 标题块隔离、跨块粘贴 | `hooks/useHeadingStructureController.ts:24`；使用现役文本保存、单元 extraction/transfer 和块 reorder |
| 单动作撤销 | `hooks/useTextFlowHistory.ts:547` 聚合 constituent entries 到既有 `reversibleEdit`；没有第二栈 |
| 块序批量 | `hooks/useNoteCanvasDataAdapter.ts:2729` 调既有 blocks/reorder API，并沿用写跟踪及 note/generation 判定 |
| 章树、agenda、删标题重算 | `chapterProjectionService.ts:40`；折叠派生 `:95`；顺序展开 `:110` |
| 搬章、折叠、编号 | `hooks/useChapterPresentation.ts:88` / `:143`；搬动展开成块序及必要的现役 placement 快照 |
| 编号/箭头/章锚 | `layers/ChapterHeadingFurniture.tsx:9`；独立 furniture，不包裹章内容 |
| A1 折叠共处 | `hooks/useNotePageFlow.ts:75` 单独派生 presentation plan，保留 fullPlan/fullLayouts |
| 标题树与当前章 | `layers/NoteNavigationHeadings.tsx:13` / `:25` / `:60`、`hooks/useNoteNavigationController.ts:16` / `:58`、`layers/NoteNavigationPane.tsx:79`、`layers/NoteRuntimeDocumentLayer.tsx:148` |
| 搜索与打印完整性 | `hooks/useNoteCanvasLayoutModel.ts:349` 全内容搜索投影；导出使用完整块、plan 与 placement |
| 实际输入入口 | `../noteSlashCommands.ts:50` / `:184` 与 `hooks/useSlashCommandController.ts:175` / `:489`：`/h1 /h2 /h3 /body`，数字 trigger、inline 锚映射与 draft 创建回执 |
| 标题把手与封面边界 | `blocks/TextBlockProjection.tsx:1688`、`blocks/PaginatedTextBlockProjection.tsx:487`、`layers/BlockEditorLayer.tsx:596`、`layers/NoteWritingSurfaceLayer.tsx:1787` |

章投影数据形：

```text
ChapterProjection { roots, chapters, agenda }
ChapterAgendaEntry { id, blockId, unitId, level, title, parentId, number[] }
ChapterNode extends ChapterAgendaEntry { children[], startIndex, endIndex, blockIds[] }
```

`id` 由既有 block/unit ID 派生；范围为半开区间，下一同级或更浅标题闭合。缺级不补虚构祖先，首标题之前为正文前言。页、页栈、折叠状态都不进入章数据形。Agent、封面目录等将来消费者可复用该纯接口，本单只接 UI。

## 分页、搬章与封面说明

折叠只改变会话呈现和阅读 plan；完整 A1 plan 继续负责页 affiliation 持久化。已有页 frame 保留，折叠后可出现空页。搜索读完整内容；点击隐藏命中先展开章和祖先，再用当前呈现 plan 定位。打印/导出仍读取完整内容，不打印成删节正文。

搬章从投影展开实际块 ID：同栈自动流改顺序后由 A1 重灌；跨栈流块通过已有 frame affiliation 移到目标栈；manual 块按既有坐标转换保存批量 placement。块序及这些 placement 快照在同一现役 undo/redo entry。批量期间暂停 A1 新持久化并等在途写结束，再恢复完整流计算；不更改 `page_frame_local` 坐标契约。

manual 跟随自动流标题时，以重排后的完整 A1 标题锚计算世界坐标差量。若标题进入本次新派生、尚未落盘的页，manual 使用既有目标 frame 的局部坐标表达同一世界位置，不向未落盘 frame 发 placement；其 frame affiliation 仍是该既有目标页，A1 不自动重挂 manual。既有坐标转换不夹限局部 y，片段投影按世界矩形与页相交计算；本单未新增页创建入口。

标题是普通 text 家族块。本单内容面升格/输入操作不允许封面 resident 成为正文 heading，消费者也排除封面居民。服务端现有封面白名单仍按块家族判定，未新增服务器 role 禁令；已有封面 text 即便含旧角色，也不进入正文章投影。封面 title/description 仍由 binding 管理。

说明书已更新 [`current-state/app-operating-manual.md §一`](../../agent-ops/current-state/app-operating-manual.md) 第 24 行，替换「章题暂用【】」旧说明，补三级输入、章移动/解散、折叠/编号、标题树和封面关系。

## 验证

client 全库最终 **199 文件、2014/2014 PASS**（`client-full-final2.log`）。正式 client 构建通过（`gate-build-client-final3.log`，现有 chunk-size 警告）；server 正式构建通过（`gate-build.log`）。原始失败日志保留：旧 `heading` 枚举断言按三级角色更新，纯数字 slash 普通文本回归通过收紧 trigger 修复；两处新增 fixture 类型错误已修复。

代表性定向证据如下；与全库及彼此重叠，数字不相加：

| 验证面 | 数字 | 原始日志 |
|---|---:|---|
| heading 角色、硬行、两个 renderer | 6 文件 106/106 | `heading-boundaries-targeted-green.log` |
| 跨块粘贴、真实历史栈、inline 与 slash | 4 文件 47/47 | `heading-document-host-green.log` |
| 多行 draft 创建回执后转标题 | 3 文件 40/40 | `heading-draft-targeted.log` |
| 章范围、树、缺级、解散、agenda | 11/11 | `chapter-unit.log` |
| 章搬移与真实撤销（含 manual / 跨栈） | 13/13 | `chapter-placement.log` |
| 折叠 A1 持久化隔离 | 6/6 | `pageflow-collapse.log` |
| 导航标题树、搜索隐藏正文、跳转高亮 | 6 文件 52/52 | `nav-folded-search.log` |
| 折叠前后真实 hook 导出一致 | 5/5 | `nav-folded-export.log` |
| 三种角色服务端保存/撤销快照/重做 revision | 26/26（新增 3） | `server-heading.log` |

runtime 验证门按工单拆分运行，**只申报非 git/secrets 的 23 组件**；逐项最终退出码与日志在同目录 `validation.json`。这包括 client 全库、两侧构建、现有墙/分页/坐标/Source/Relation 回归和 model/performance smoke；没有跳过既有安全回归。git/secrets 两组件留 HQ，**不能据此宣称完整门已绿**。

服务端全量首轮：767 项，763 pass / 4 fail。两项 Node IPC `Unable to deserialize cloned data` 由现役 wrapper 重跑通过（CanvasPersistenceCutover 49/49、MaterialLibrary 59/59）。另外两项各自定向重跑仍失败：

| 失败 | 直接证据 | 与本单关系 |
|---|---|---|
| `v2SourceMineruWiring.test.ts` 模块启动 | `python.exe` `ENOENT`，尚未执行测试正文 | 当前 Python 执行环境；失败测试及 parser / wrapper 无改动 |
| `v2SourceRegionCells.test.ts` MinerU cell geometry | 固定 venv 退出 101；基础 Python 单独 `--version` 为 `EPERM` | 不进入 PDF 业务即可复现；未绕过权限或修改环境 |

对应日志：`server-full.log`、`server-regression-mineru.log`、`server-regression-region.log`、`server-regression-runtime.log`、`server-regression-baseline.log`。只读 git 确认两失败测试及相关源文件最后修改为 2026-08-29，当前 server 产品码无本单改动。A1/A2 已有 HQ 回执也记载同类 Python/MinerU 环境基线。**服务端全量本轮仍申报失败，不改写为全绿。**

## 未做项与移交

- Agent 章级动词、工具/注册表接线、目录页均未做；Relation、中央写门、schema migration、依赖和坐标契约未改。
- 没有 git 写操作或 commit；预存的 `.claude/settings.local.json`、09-07/09-09 audit 和用户介绍文件未动。
- 完整 runtime 门内的 git/secrets 两组件交 HQ，本证据不会把部分门称为完整门绿。早期子任务曾单独执行一次只读 `git diff --check`；当时新增文件尚未纳入 tracked diff，该结果没有列入 builder 验证门数字，之后未再执行。secrets 扫描未运行。
- 无新安全对抗用例；新测试只覆盖本单正常输入、投影、移动、撤销和呈现功能。无新增凭据形合成值。
- HQ 负责 git/secrets 门、主观验收与最终放行；Python 环境失败保留原样移交，不跨本单修改 Source/MinerU。
- 浏览器验收未完成：仅启动已有 Vite 前端，新标签页进入 `/#/login`，AX/截图确认登录墙；未注册、登录或触碰账号。证据 `browser-smoke.log`、`browser-vite.log`；测试标签页与本次 Vite 已关闭，原用户页未动。自动化宿主验证不能替代这项实浏览器验收。
