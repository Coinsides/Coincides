> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B10 v1.5 记账兑现(Henry 波次 C 全拍);B10 双块原子迁移端点(unit-transfer)现成
> **单号**: 13.5 · C3 · 跨块迁居(把手拖 unit 进另一文本块)

# 13.5 C3 · 跨块迁居

**使命**:单元把手拖到**同一笔记内另一个文本块的行间**→落点指示线→松手=该 unit 迁入目标块该位置,role/批注/板引用/inline 锚全随行。

## 零 · 裁定(⛔复议)

1. 手势与视觉沿 B10(块内重排的落点线同款,跨块时显示在目标块行间);
2. 机制=B10 的同 note 双块原子迁移端点家族(双 revision+锚归属同事务),目标从"新块"换"既有块指定位置";
3. **目标限文本块**(TextBlockProjection 种类);⛔非文本块⛔跨 note;IME 组字中拒;
4. **源块最后一行被迁走=留空块⛔自动删**(用户自删,保守);
5. undo=一步双块逐字段恢复(B6b/B10 机器);⛔改 B10 拽出成新块行为(两手势并存:拖到空白=成新块,拖进块=迁入)。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①拖 unit 进另一块行间→落点线→迁入正确位置,role 随行(修前断言现状行为并申报);②undo 一步双块逐字段恢复,redo 重放;③批注/板引用/inline 锚归属迁移逐字段;④源块最后一行迁走→留空块,B10 拽出成新块回归不破;⑤IME 拒+B4-B10/C1/C2 全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-10 · Codex builder · **部分实现已验证；C3 未完成，needs: HQ。保持 ready，不翻 done。**

### 停线：普通文本块的局部 ID 碰撞

- 日常创建链路把每块初始 unit 持久化为同一个 `tu-1`：`textFlowService.ts` 的 `createTextBlockContentV1` → `useDraftBlockController.ts` → `useNoteCanvasDataAdapter.ts` → `noteBlockLifecycle.ts`。服务端不做随机 ID 映射；后续新增行也使用块内 `tu-N`。
- B10 `atomicTextUnitTransfer.ts` 要求迁移 unit/inline ID 保持、目标不存在同 ID。**两个普通新块的首行因此无法合流**；不只影响人工构造的边缘数据。inline ID 亦可能碰撞。
- 新功能证据 `v13AtomicTextSave.test.ts` 的 `C3 pre-fix identity evidence` 使用真实 `createClientNoteBlock` 连建两块，确认均保存 `tu-1`，迁移返回 409，双块、批注、板引用、note 与 placement 逐字段不变。
- 已向用户提出补裁：是否允许碰撞时使用可逆 ID 映射，并在同一事务内同步 unit/inline/批注/板引用，undo 恢复原 ID。**截至本回执尚未收到答复；未自行增加映射、改默认身份或放宽 B10 守门。**这是 §零之外发现的身份机制缺口；无冲突样本的通过不能代表日常 C3 已闭合。

### 已实现范围

- 同一写作面内的真实 TextBlockProjection 行间命中，使用 B10 同款指示线；松手经 `onMoveTextUnit` → `useTextFlowHistory.moveUnit` → 既有 `transferTextUnit` / `unit-transfer` 双块原子端点。
- C3 与 B10 共用双块写入、双 revision、响应未确认时原方向重试和现有 runtime history。C3 不创建/删除块，保留源空块；B10 的 create/placement/trash/restore 流程保持。
- 保留完整双块快照，支持一步 undo/redo、前序 typing 保存依赖和原 revision 重试。修复本轮新增测试发现的恢复可见性问题：请求失败且数据未变时，React 批处理不能把恢复入口的重绘吞掉。
- 仅增加当前写作面落点反馈状态和既有 DocumentTransaction 的 move 数据；没有第二套 undo 栈、持久化门或锚存储。服务端生产代码零改动。

### numstat

代码与测试合计 **12 文件，+899/-41**；含 3 个新增未跟踪文件，以 `git diff --no-index --numstat -- NUL <file>` 补计；本回执 **+56/-0**，本单总计 **13 文件，+955/-41**。未暂存。

| 文件（client 路径均相对 `client/src/pages/Notes/canvasEngine/`） | + | - |
|---|---:|---:|
| `blocks/TextBlockProjection.tsx` | 14 | 4 |
| `blocks/TextBlockProjection.unitHandle.test.tsx` | 22 | 0 |
| `hooks/useNoteCanvasRuntimeController.ts` | 1 | 0 |
| `hooks/useTextFlowHistory.ts` | 147 | 23 |
| `hooks/useTextFlowHistory.move.test.tsx`（新增） | 259 | 0 |
| `hooks/useTextUnitHandleDrag.ts` | 27 | 13 |
| `layers/BlockEditorLayer.tsx` | 10 | 0 |
| `layers/NoteWritingSurfaceLayer.tsx` | 17 | 0 |
| `layers/pageFrameAlignment.test.tsx` | 163 | 0 |
| `textUnitMoveService.ts`（新增） | 22 | 0 |
| `textUnitMoveService.test.ts`（新增） | 39 | 0 |
| `server/src/__tests__/v13AtomicTextSave.test.ts`（仓根相对） | 178 | 1 |

### 五冒烟

1. **① 修前已先申报、先断言，再改生产。**修前源组件把目标块坐标视作块外提取，目标没有线/内容不变；实际写作层继续拒绝 block shell 落地，因此也不新建。新增双 projection pointer 断言及既有 writing-surface shell 拒绝测试随修前 client 全库 **111 files / 1188 tests PASS**。修后实际 `NoteWritingSurfaceLayer` 前/后落点事件、一次迁移派发、原 role/字段保留已通过；插入后的完整数据由 history + HTTP/SQLite 测试验证。**身份不碰撞路径通过，普通同 ID 路径仍停线。**
2. **② 无身份冲突路径通过。**现有 runtime history 一步恢复两块完整 content/metadata/顺序/inline/批注/板引用；redo 重放，额外 undo/redo 不产生第二项。双 revision 为 0→1→2→3；失败方向保持原 bases，未确认前向响应先解清再逆向；typing 双块快照保持。
3. **③ 无身份冲突路径通过。**服务层逐字段比较迁出锚的必要 `block_id/text_flow_id` 变更、unit role/indent/metadata、inline parent/range/field_values/status，以及目标原有 inline、批注和板引用不变。undo 后恢复原数据；仅 block 写时钟 `updated_at` 与单调 `text_save_revision` 不回退。双 revision 拒绝及晚锚写失败均回滚全部数据。
4. **④ 无身份冲突路径通过；B10 回归通过。**源最后一行迁走后 `units=[]`、空正文，源块仍 active、placement 原样；可迁回该空块显示的占位行。B10 7 条 extraction history 测试、原服务层 3 条 B10 测试、实际写作面 page/canvas 空白提取坐标与新建路径保持通过；新增目标块悬停后转投空白的同一手势仍走 B10。
5. **⑤ 通过（不覆盖上述身份缺口的解决）。**源/目标 IME 组字拒绝，中途 compositionstart 清线并取消；非文本 CodeBlockProjection、另一写作面/另一 note 拒绝迁入且不误生成块。B4–B10/C1/C2 既有 client 测试完整保留、整库无过滤运行：**113 files / 1207 tests PASS**。server 三个功能文件整跑 **21/21 PASS，0 skipped**。

### 验证门与未做

- **通过**：`npm.cmd run test:unit`（全 client）、`npm.cmd run build:client`、`npm.cmd run build`（两项 build 均含 typecheck）、`git diff --check`。所有 Vite 调用均令 `COINCIDES_VALIDATION_ENV_DIR` 指向新建空临时目录，未隐式加载项目 `.env`。
- server 命令（cwd=`server`）：`node ../scripts/run-server-test-suite.mjs src/__tests__/v13AtomicTextSave.test.ts src/__tests__/v13AtomicTextSaveMigration.test.ts src/__tests__/v13GraphemeTextRanges.test.ts`。fixture 为合成内存库；runner 隔离资产目录，不启动用户实例。
- 总门允许项逐项实跑：tool-face registry/manifest/parity 测试及检查、server shared import、canvas boundary、三 shell、source experience、legacy shutdown、relation freshness、canvas model/performance 均通过。**`docs:check` 非绿**：未修改的 `docs/agent-ops/INDEX.md` 已过期；未擅自重生成该全局索引。其后两子项已独立运行，inventory 与 glossary 通过。
- **未运行完整 `verify:v2-bn8-runtime` 聚合**：末尾含本单禁止的 `check:changed-file-secrets`；凭据扫描留 HQ。未新增/执行安全专项或对抗性测试，既有功能文件整跑未过滤；未读取 `.env` / key 值，未接触用户库，未 stage/commit/push。开工既有未跟踪文件未改。
- 验证射程：真实 React pointer/IME 冒泡 + jsdom 布局/命中夹具，真实 history，合成 Express/SQLite 服务。**未做人类体感走查或真实浏览器端到端验收**；不得把夹具几何称为浏览器视觉签收。
- 临时日志/配方：`.codex-tmp/c3-client-before.log`、`c3-test-unit.log`、`c3-server-functional.log`、`c3-allowed-gates.cjs` 与对应 summary；主要计数、逐项结果和重跑命令已入本回执。首轮修后全库发现 3 条失败（恢复入口重绘 + 两处夹具断言），均修复后完整重跑通过。

**结论：无身份冲突路径可供复核；C3 不可放行。身份碰撞补裁待答，完整总门及文档索引红项未闭合。**

## HQ 复核(2026-09-10):停线收货,补裁 ID 碰撞重映射,续建

1. **停线收货**:局部 `tu-1` 命名×迁移端点同名拒收=日常必撞,证据充分(真实创建链两块均 tu-1,迁移 409);
2. **补裁一(⛔复议)**:**碰撞时可逆 ID 重映射**——迁入的 unit/inline ID 若与目标块冲突,映射到目标块未占用 ID;**同一事务内**同步改写所有引用方(inline parent/批注归属/板文字引用的 unit 地址);history entry 记录映射表,**undo 按逆映射恢复源块原 ID**;无碰撞时保持原 ID(现行为);先例=B8 客户端合流的冲突避让,本裁将同一法理落到服务端迁移事务;
3. 锚的 excerpt/offset 零变(文本未动,只换地址簿页码);⛔改创建链默认命名(全局唯一 unit ID=更优终局,随 V14 安家 S 实装一并考虑,记账⛔本单);
4. 补冒烟:两个普通块(均 tu-1,各挂批注+板引用+inline)互迁首行→重映射成功、引用逐字段可解析、undo 逆映射恢复、redo 重放;409 路径转为仅保留给"映射后仍不可行"的真异常。

**裁定:按补裁一续建,做完追加 Result 二。**
