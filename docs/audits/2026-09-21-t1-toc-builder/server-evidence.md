> **状态 (Status)**: complete(builder 服务端施工与只读自查证据；不代替 reviewer/HQ 放行)
> **日期 (Updated)**: 2026-09-21
> **工单**: `docs/agent-ops/handoffs/2026-09-21-v14-t1-toc-block-order.md`
> **范围**: T1 服务端闭集、空载荷生命周期、`read_note` flat 投影，以及客户端保存通道的只读交叉核对。

# T1 服务端证据

服务端施工完成。只读自查未发现本范围内的阻断缺陷；服务端源码和测试冻结后没有再修改。全量服务端与 Agent 族由并行验证任务运行，本件仅申报本人已完成的定向、相邻回归及编译数字。

## 1. 逐件落点

| 事项 | 代码行号 | 结论 |
|---|---|---|
| 现役块型闭集扩一项 | `server/src/validators/index.ts:54`，`server/src/validators/index.ts:67` | 仅增 `toc`；沿原 `note_blocks` 与 placement，没有新表新列。 |
| 空载荷与创建校验 | `server/src/validators/tocBlock.ts:4`；`server/src/validators/index.ts:775` | `content_json` 为 strict `{}`；拒绝章条目、复制的 `plain_text` 或 `title`。普通路由先在 `server/src/routes/notes.ts:239` 解析该 schema。 |
| 客户端幂等创建服务 | `server/src/services/tocBlocks.ts:4`；`server/src/services/noteBlockLifecycle.ts:443` | 服务内再次校验空载荷；沿现役创建/重放/撤销收据链。 |
| 更新、恢复、原子保存 | `server/src/services/noteBlockContent.ts:40`；既有 `server/src/services/atomicTextSave.ts:44` | 按存储中的块型校验，省略 `block_type` 也不能写章副本；原子保存仍走同一更新服务。 |
| 投影族模板绕行 | `server/src/services/noteBlockLifecycle.ts:451`；`server/src/services/noteBlockContent.ts:94`；`server/src/routes/notes.ts:290` | 三处仅将 `toc` 加入现有 `item_ref`/`note_ref` 闭集，防止运行时模板回退为 `text.paragraph`。没有新增模板或扩大提案载荷。 |
| 每块首个存活 heading | `server/src/services/tocBlocks.ts:19` | 匹配 A4 现役 TextFlow 读取条件；支持 `heading`、`heading_1`、`heading_2`、`heading_3`，跳过 deleted unit，保留调用方当前块序；同块仅首个 heading 命名。 |
| flat text | `server/src/services/tocBlocks.ts:32`；`server/src/services/agentReadSurfaces.ts:94` | 内部换行/TAB 扁平化，输出 `目录: 章一 / 第二节`；空树为 `目录: 暂无章节`。只有既有 `text` 字段，没有结构化章槽。 |
| 跨页取章 | `server/src/services/agentReadSurfaces.ts:126`、`:163`、`:165`、`:180` | 全笔记块序先派生 `tocText`，之后才筛当前页并应用既有 200 块 cap；只读取 TOC 所在页仍能看到其他页章节。 |
| 可见范围与封面 | `server/src/services/agentReadSurfaces.ts:152`、`:162`、`:164` | 沿原 outside-page 判定排除非 formal_page（含 tray）、outside/crossing、不可定位页居民；另外按当前 binding 的 cover frame 排除封面标题。 |
| 既有 active/order 读取 | `server/src/services/notes.ts:145`、`:198`、`:200` | 笔记归属、active 状态、placement order 由现役读取服务提供；本单没有改授权或坐标规则。 |
| 输出 schema | 既有 `server/src/toolFace/registry.ts:837`；测试 `server/src/__tests__/v14TocBlocks.test.ts:111` | 输出块仍是 `id/placement_id/kind/role/text`；现役 strict schema 直接解析通过。注册表文件零 diff。 |

## 2. 分页、tray 与保存分支的只读复核

`read_note` 的 `tocText` 在 `pageBlocks` 过滤之前从整本 `locatedBlocks` 派生，因此它不依赖当前页是否含 heading，也不把其他页章节误截掉。跨页定向用例将章一放后页、第二节放 TOC 页，返回仍按正文 placement 序为「章一 / 第二节」，并排除封面及纸外标题（`server/src/__tests__/v14TocBlocks.test.ts:123`）。

既有 `getNoteCanvasPersistence` 的 block layout SQL 读取包括 tray 在内的现役 placement（`server/src/services/canvasObjects.ts:1743`），返回的 `surface` 经过原 layout 投影保留；TOC 与原 `read_note` 均由 `surface !== 'formal_page'` 分支排除 tray。本次实测覆盖 legacy tray layout；持久化 tray 的读取链经代码只读核对，没有为此新增安全对抗测试。

客户端 `saveBlock` 在 `client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts:1905` 对 TOC 返回已保存的 no-op；这是正确的投影语义：目录没有可刷新的正文草稿，placement/tray 操作通过保存屏障时不应失败。`:2429` 禁止把 TOC 走普通模板正文转换，创建时 `:1420` 输出空 metadata，和服务端三处投影族模板绕行一致。这些分支均未拦截 TOC 的普通 placement、删除或恢复服务。

## 3. 已完成验证

工作目录为 `server/`；两次运行均使用现有测试 runner、`--test-timeout=600000`，没有安装依赖、连接用户库或调用真实模型。

| 验证 | 命令/范围 | 实测结果 | 原始日志 |
|---|---|---|---|
| T1 定向 | `node ../scripts/run-server-test-suite.mjs --test-timeout=600000 src/__tests__/v14TocBlocks.test.ts` | 6 tests，6 pass，0 fail/cancelled/skipped/todo，0 flaky retries；1143.6094 ms | `.codex-tmp/t1-toc/server-toc-directed.log` |
| 相邻回归 | 同一 runner：`v14TocBlocks`、`v14TableBlocks`、`v14ComponentBlocks`、`v14ReadTools`、`v14CoverPage`、`v2NoteBlockLifecycle` 六文件 | 70 tests，70 pass，0 fail/cancelled/skipped/todo，0 flaky retries；4119.3735 ms。包含前述 6 条，不能相加申报 76 条独立测试。 | `.codex-tmp/t1-toc/server-toc-neighbors.log` |
| 服务端编译 | `node node_modules/typescript/bin/tsc -b --pretty false` | 最终 exit 0，无诊断 | `.codex-tmp/t1-toc/server-toc-typecheck-final.log` |
| 只读禁区核对 | 保护目录 diff 与 TOC 当前行号摘录 | `server/src/agent`、`server/src/toolFace`、`server/src/db`、`shared` 无 diff；服务端只在本件列明的源文件与测试落笔 | `.codex-tmp/t1-toc/server-toc-readonly-audit.log` |

定向六件的起始行号为 `server/src/__tests__/v14TocBlocks.test.ts:58`（schema）、`:67`（创建/重放/更新/恢复/撤销与空载荷）、`:89`（首个 heading/层级/空树）、`:102`（改名/删除即时投影、现役 executor、strict schema）、`:123`（跨页/封面/纸外）、`:154`（HTTP 创建/更新/重开/删除）。每次直接读取前后比较内存 DB 字节（`:48`），目录行的存储载荷另在 `:116` 核对保持 `{}`、null 正文、null 标题。

初次编译曾误用根 `node_modules/typescript` 路径，记录在 `server-toc-typecheck.log`；切换现有 server 本地 TypeScript 后发现测试 helper 的 UUID 默认值将参数收窄为 UUID 模板类型，记录在 `server-toc-typecheck-local.log`。补显式 `key: string` 后最终编译通过；两份早期失败日志保留，未掩盖。

## 4. 出生公约与禁区自查

服务端没有视觉取值、色值、字体族或间距常量。出生公约服务端自查：零字面视觉值；客户端 token 取值与五皮肤断言由客户端证据负责，本件不冒认其验证。

本范围未新增章缓存或章持久字段；未改 TextFlow 真相 schema、坐标契约、read_note 输出 schema、工具注册表、organized_note 载荷、prompt、Relation/判定域；未新增依赖、迁移、工具或安全对抗用例。合成凭据仅 `synthetic`（9 字符），fixture 使用 `:memory:`。Git 仅执行只读 diff/status；未执行 add/commit/push/reset 或修改 `.git`。完整 verify 的 git 检查与 secrets 扫描仍留 HQ。

## 5. 未做项

- 本件不重复正在运行的服务端全量、Agent 全族回归，也不把它们算入上表。
- 本件未执行真实浏览器主观验收、真实模型调用、用户库读取或写入。
- 结构化目录输出槽、Agent 提案写入 TOC、额外显示参数均未做，保持工单范围。
- 本件是 builder 自查证据，最终 reviewer/HQ 放行不在此件。
