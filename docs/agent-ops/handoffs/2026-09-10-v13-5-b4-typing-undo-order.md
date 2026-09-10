> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查回执 §4(两案与共同验收边界,证据行号全在案);Henry 09-10 拍板方案 A 提前施工;V14 硬前置 2(打字撤销=机械闸法源)
> **单号**: 13.5 · B4 · 打字入撤销栈(方案 A:同 Note 会话快照接现有 runtime history)

# 13.5 B4 · 打字撤销(方案 A)

**使命**:纸上打字进入应用撤销栈——同 Note 会话内,打字/失焦/结构动作/布局动作按真实时序可撤可重放。**⛔ 另造第二根文本专用栈**(接现有 runtime 双栈 reversibleEdit)。

## 零 · 射程裁定(依 B2 §4,⛔复议)

1. **编辑会话聚合器**:首次 before + 连续输入 after;记录 note/block、flow 前后、selection 前后、**本次编辑触及的 annotation/board range 前后快照**(按 ID 局部,⛔整 Note 覆盖后来新建的批注);
2. **分组封口**(B2 §4.2.1 全条款):同 Note/block/unit、连续选区、同输入类别才合并;选区移动/切 unit 或 block/粘贴/Enter 与 merge/role 与 indent/slash 结构动作/布局动作/blur 或离开 Note/undo-redo 前一律封组;⛔跨一次布局操作把前后打字合成同一 entry;
3. **IME**(§4.2.2):composition 期间⛔封组⛔结构拆分;compositionend=一次完整输入;Ctrl/Cmd+Z/Y 只为受管 TextFlow 编辑器接管(其他表单保持原生,⛔双撤销并发);
4. **TF-04 必要输入边界随本单**:选中文字后 Enter/结构化粘贴须替换**整个选区**(selectionEnd 补传)+composition guard;
5. **范围可逆**(§4.2.3):恢复字符串+unit 身份+被触及的 annotation/board range 状态与坐标(before 快照恢复,⛔拿反向 rebase 冒充);结构动作独立成 entry;
6. **保存与异常**(§4.2.4):typing finalize/blur save/undo save 统一排队有序;部分成功/抛异常/stale_epoch 不丢 entry 不虚报成功,保留恢复入口,重试⛔重复造历史;成功才移栈;
7. **Note 边界**(§4.2.5):按 note+generation 隔离,旧响应⛔进新 Note;接入既有 blur→flushPendingSaves→导航边界;
8. **⛔清偿声明**:本单⛔碰 TD-6 服务端原子性(TF-06 另案);⛔TF-02 光标穿行/TF-03 跨界选择/TF-07 inline 生命周期;⛔改 CanvasCommand 空间域;⛔跨会话持久史记(TD-28 另案);会话内有界撤销=本单全部承诺。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟八条:①打字→失焦→应用栈 Ctrl+Z 恢复文字(修前此路径断言现状:字回不来);②打字→挪块→打字→逐次撤销,时序正确逐层还原;③IME 组字中途不封组不拆分,compositionend 成一组,撤销恢复整段输入;④选中文字后 Enter/多行粘贴替换整个选区(修前断言现状红);⑤带批注+板文字引用的编辑→撤销→范围状态与坐标恢复(before 快照);⑥保存失败/stale_epoch 注入→entry 不丢/不虚报/可重试且不重复造史;⑦切 Note 隔离(A 笔记的撤销不漏进 B),离开笔记走既有 flush 边界;⑧板级 undo 与既有命令栈/tray/修五六七全回归。

## 二 · Result 格式

`## Result`:numstat + 八冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触(全走内存合成);⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。发现射程裁定与现物冲突→停线举证⛔自行改判。

## Result

> **日期**: 2026-09-10 · **执行者**: Codex builder
> **交付状态**: 工作树部分实现 + 合成验证回执；**停线，未完成整单，保留 ready**。不作验收放行。
> **核对基线**: 当前分支 `fable/v2-bn12-exoskeleton`，收尾 HEAD `7cdf45a7e0c56dd83045912234af4ded0995f92d`；未 stage/commit/push。
> **上游定位更正**: B2 回执实际在 `2026-09-10-v13-5-b2-textflow-debt-survey-order.md` 的 Result §4；本 B4 文件原文只有裁定/验证/Result 格式。已先读 B2 再改生产码。CodeGraph CLI/MCP 不可用，rg 亦不可用，使用限定路径的读取与检索，未新建索引。

### 1. 已落地的工作树

- 新增一个待封口的 TextFlow 编辑组，将首次 before / 最新 after 接到**现有 runtime reversibleEdit 双栈**；原 80 条上限保留，无第二根文本 undo 栈。组按 Note/generation/block/unit/输入类别/连续选区分隔，布局、失焦、结构动作、undo/redo 与离开边界封组。
- 受管 TextFlow 接管 Ctrl/Cmd+Z/Y；其他表单保持既有原生路径。IME 中禁止结构手术及封组，compositionend 发布最终值并封一组。Enter/结构化粘贴补传 selectionEnd，替换完整区间；传入真实 previousTextFlow，保留 legacy 多行的既有 unit 身份。
- 批注按 annotation ID + range ID、板引用按 range ID 保存触及项的前后快照。回放直接恢复快照，保留后来新增的批注/范围；不以反向 rebase 伪装恢复。被 merge 移除的 unit 对应范围显式降级。
- typing finalize / blur save / replay 使用同一串行队列；blur 整个操作在首次 await 前入队，接原有 blur → flushPendingSaves → 导航。false/throw/stale 保留历史，确认成功才移栈；重试不造新 entry。旧失败的侧挂范围不会被后来只成功保存另一 unit 的操作静默抹掉，重试以当前全文和当前范围补齐。
- adapter 增加可判定 annotation outcome 及保留新草稿的保存选项；layout history 等待真实保存结果。回放保存期间关闭受管编辑输入，保存后在 DOM commit 后恢复真实 caret/selection。Note/generation 换代让旧回调、排队任务和响应失效。
- **结构覆盖有限**：TextFlow 的 Enter/merge/role/indent、结构化 paste 以及 slash writing_role 分支已录史；slash **模板转换**只有封组/IME 守卫，未获完整可逆 entry。详见停线项 1，不能将上列实现写成“所有 slash 结构动作都已可撤”。

### 2. numstat

代码与测试共 **28 文件，+2315 / -197**。下表 `N/` = `client/src/pages/Notes/canvasEngine/`；已跟踪文件来自 `git diff --numstat`，7 个新增未跟踪文件按完整文本行数记 `+N/-0`，未 stage 来凑统计。本工单仅追加 Result，**+85/-0**；含回执合计 **29 文件，+2400/-197**。

| 文件 | + | - |
|---|---:|---:|
| `N/blocks/TextBlockProjection.tsx` | 156 | 22 |
| `N/boardTextRangeEditSession.test.ts` | 57 | 0 |
| `N/boardTextRangeEditSession.ts` | 22 | 1 |
| `N/historyService.ts` | 19 | 7 |
| `N/hooks/useBlockTextFlowEditController.test.tsx` | 69 | 1 |
| `N/hooks/useBlockTextFlowEditController.ts` | 102 | 10 |
| `N/hooks/useLayoutPersistenceController.ts` | 14 | 12 |
| `N/hooks/useNoteCanvasDataAdapter.test.tsx` | 121 | 4 |
| `N/hooks/useNoteCanvasDataAdapter.ts` | 58 | 28 |
| `N/hooks/useNoteCanvasLayerProps.ts` | 2 | 1 |
| `N/hooks/useNoteCanvasRuntimeController.ts` | 51 | 13 |
| `N/hooks/usePlacementHistory.ts` | 139 | 80 |
| `N/hooks/useRuntimeBlockHistoryController.ts` | 33 | 6 |
| `N/hooks/useRuntimeBlockOperationsController.ts` | 14 | 0 |
| `N/hooks/useRuntimeLayoutModelController.ts` | 1 | 1 |
| `N/hooks/useRuntimeNaturalWritingController.test.tsx` | 68 | 0 |
| `N/hooks/useSlashBlockRollbackController.ts` | 1 | 1 |
| `N/hooks/useSlashCommandController.ts` | 39 | 1 |
| `N/layers/BlockEditorLayer.tsx` | 11 | 2 |
| `N/layers/NoteWritingSurfaceLayer.tsx` | 8 | 2 |
| `N/textUnitEditorService.ts` | 9 | 5 |
| `N/blocks/TextBlockProjection.input.test.tsx` | 128 | 0 |
| `N/hooks/usePlacementHistory.test.tsx` | 242 | 0 |
| `N/hooks/useTextFlowHistory.rangeRecovery.test.tsx` | 237 | 0 |
| `N/hooks/useTextFlowHistory.test.tsx` | 245 | 0 |
| `N/hooks/useTextFlowHistory.ts` | 218 | 0 |
| `N/textFlowEditSession.test.ts` | 92 | 0 |
| `N/textFlowEditSession.ts` | 159 | 0 |

保留开工时已有的 `.claude/settings.local.json`、审计稿及 brainstorm 未跟踪件，未读取权限配置正文、未修改这些文件；未改 server/shared 产品码、current-state 或 agent 指令文件。

### 3. 八条冒烟逐项

以下均为**内存合成 fixture、mock 持久层或 jsdom 真实组件/事件**。测试通过不豁免停线项 1 的射程缺口。

| # | 结果 | 可复核证据与边界 |
|---|---|---|
| ① | **修前红 → 修后 PASS** | 生产修改前全库整跑：`useTextFlowHistory.test.tsx` 输入 → blur 保存 → window Ctrl+Z，断言期望 `original`、实际 `original typed`。修后相同用户路径恢复文字；受管 Ctrl+Z 阻止原生重复撤销。 |
| ② | **具名路径 PASS；完整结构射程未完成** | 同一 projection + runtime history 的“打字 → 挪块 → 打字”，逐次 undo/redo 对正文与 x 坐标逐层断言；选区移动封组、Enter 独立 entry、slash role 走真实 controller 测试均通过。模板转换缺口见停线项 1。 |
| ③ | **PASS（合成 IME）** | composition 中间 input/Enter/Tab/paste/blur/undo 不拆分、不封组、不提前保存；两种 compositionend 与末次 input 事件顺序都只发布一次最终值；完整词组一次撤销。未使用操作系统真实输入法。 |
| ④ | **修前红 → 修后 PASS** | 修前 `alpha SELECT omega` 选择 [6,12]，Enter 和多行粘贴都保留了 `SELECT` 后缀；修后分别得到 `['alpha ', ' omega']` 与 `['alpha first','second',' omega']`。Enter 往返恢复原 unit ID 与 [6,12] 选区；legacy 首次多行编辑往返保留 tu-1/tu-2。 |
| ⑤ | **PASS（分层合成证据）** | controller overlap/移除 unit 测试恢复批注 before offsets/metadata，保留后来标签、annotation 与新 range；board session 测试 drifted → before active/坐标并保留后来 range；真实 hook 同时挂 annotation/board 两 unit 范围，逐次 undo 后板范围恢复原快照。 |
| ⑥ | **PASS（客户端可观察恢复）** | history false/throw 不出栈；adapter 部分确认、reconcile 失败与 stale hydration 返回未确认；旧响应不覆盖新草稿。A 范围失败 → B 另一 unit 成功 → flush 仍拒绝 → 重试当前全文+两范围 → flush 成功；仅两次 undo 后栈空，无重复造史。延迟文本/布局回放期间编辑关闭，完成后恢复 caret。未验证服务端原子性。 |
| ⑦ | **PASS** | A finalize 悬挂时切 B，B flush 不被 A 卡住且 B undo 为空；A 响应、旧 apply/save/undo 均不改 B；旧 flush 拒绝。另测“前序任务阻塞 → blur save → 立即 flush”，flush 必须等到 blur 保存确认。导航生产链继续调用原有 whenDraftIdle/whenIdle。 |
| ⑧ | **PASS（既有套件回归）** | client 全库最终 **98/98 文件、855/855 测试 PASS**，无过滤。包含 Boards/useBoard/boardCommandHistory、tray、page reading/overview/alignment、现有 runtime command 与修五六七相关套件；板命令生产实现未改。 |

修前有效整跑记录：本机测试输出 `06:14:43`，14.82s，5 文件红/92 绿、11 测试红/811 绿（包含预先加入的新功能断言和当时尚未实现模块的失败）；①④的失败是上述具体行为断言。此前第一次试跑的 save mock 缺少 outcome，产生一条 unhandled error，已先修夹具并在**生产修改前**重新整跑；不将那次夹具错误当修前证据。

最终整跑记录：`06:36:26`，14.52s，98 文件、855 测试全绿。临时完整输出在 `.codex-tmp/b4-validation/before-client.log`、`after-client-final.log`；常驻测试及本段具体断言保留可重导依据，不以临时日志作为结论的唯一副本。

### 4. 其余验证

- client `tsc --noEmit` PASS；最终 `npm run build:client`（含 tsc -b）PASS；server `npm run build` PASS。Vite 使用仓内空目录 `COINCIDES_VALIDATION_ENV_DIR`，没有读取 .env；未启动业务服务。构建有既有 chunk 大小提示，不是失败。
- runtime gate 的 registry/manifest/parity **既有测试套件逐个完整运行**；manifest/parity/server-shared-import、canvas boundary、Gallery/Rail/SingleEditor shell、source experience、legacy shutdown、relation freshness、canvas model/performance 子门均 PASS。最终 canvas boundary 与 `git diff --check` PASS。
- **未宣称 `verify:v2-bn8-runtime` 聚合门 PASS**：其末尾包含本单明禁的 `check:changed-file-secrets`，未执行聚合命令或该扫描；其余子门分别执行。`docs:check` FAIL，具体见停线项 2。

### 5. 未做与停线

1. **功能射程停线：slash 模板转换未完整可逆。** `N/hooks/useSlashCommandController.ts:421` 的 writing_role 分支现走编辑会话，然而 `:527` 模板分支仍调用 `applyTemplateToBlock`；`N/hooks/useNoteCanvasDataAdapter.ts:1891-1897` 的现有正门同时写 `block_type/title/content_json/plain_text/metadata`。B4 §零 1 指定的 flow/selection/范围快照不足以复原这些模板载荷；只录 flow 会把不完整回放冒充结构撤销。**因此不能签收 §零 2/5 的完整结构承诺，也未自行将 block_type/metadata 转型纳入新的命令域或另造栈。** 后续需 HQ 明确模板转换的最小可逆载荷与保存边界；本单保留 ready，工作树待复核。
2. **验证门停线：文档索引过期。** `npm run docs:check` 在 docs-index 阶段报告 `docs/agent-ops/INDEX.md` 过期，exit 1；后续 inventory/glossary 子步未因此执行。不改 HQ 管理的现状/索引来掩盖失败。
3. **按铁律未做**：stage/commit/push、PR、用户库/真实笔记访问、业务 API、.env/key 值读取、凭据扫描、安全类专项测试、操作系统 IME 与人工主观验收。既有 client 及所执行 gate 测试套件均整跑，未过滤。
4. **未扩面、未清偿**：TD-6/TF-06 服务端跨资源原子性；TF-02/03 跨 unit 光标/跨界选择；TF-07 inline 生命周期；CanvasCommand 空间域；TD-28 跨会话历史。以上仍是原债，不因 855 条测试通过而销账。

## HQ 复核(2026-09-10):停线收货,补遗一裁模板转换载荷,续建

1. **主体收货**:八冒烟中①④修前红转绿、②③⑤⑥⑦⑧绿,855 全库,范围快照/失败留栈/IME/Note 隔离全边界落地;停线举证正确——⛔拿 flow 快照冒充整块转换的可逆性;
2. **补遗一(裁定,入本单射程)**:slash 模板转换的 entry=**完整块载荷 before/after 快照**(block_type/title/content_json/plain_text/metadata 五字段+flow+触及范围快照同 B4 规则);回放走**既有转换正门**(adapter 现有五字段写入口),⛔新命令域⛔新栈⛔改正门语义;undo 后块的五字段逐字段恢复,source_references/出处保持;转换前后各自封组(结构动作独立 entry 规则沿用);
3. 裁定依据:机械闸法理——模板转换若不可撤,V14 该动词就不能给 Agent;⛔留洞;
4. 补遗一落地后追加冒烟:⑨段落→formula 模板转换→undo 五字段+flow 逐字段恢复→redo 重放→再 undo,批注/范围快照同恢复;段落→code.snippet(模板分支)同验;
5. docs INDEX 过期=HQ 收口重生成,⛔builder 碰。

**裁定:按补遗一续建,做完追加 Result 二。**
