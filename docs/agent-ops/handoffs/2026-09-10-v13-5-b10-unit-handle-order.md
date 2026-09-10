> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: Henry 09-10 对谈拍定(单元把手 v2 三职能+A案自由落点+形态从简);TextUnitGutterLayer 现物(原生 role select,V12 老住户);B4-B9 地基(历史/多块 entry/inline 随行/阅读序)
> **单号**: 13.5 · B10 · 单元把手 v2(拖动重排+拽出成块+菜单)

# 13.5 B10 · 单元把手 v2

**使命**:gutter 位的单元把手转正——**拖动=块内重排,拽出=独立成块,点击=单元菜单**;丑的原生 role select 退役。

## 零 · 拍定(⛔复议)

1. **形态从简(Henry 拍)**:把手**常显⛔hover 隐藏**,尺寸缩小,继续住现有 gutter 不占字符位;⛔花哨重设计;
2. **拖动=块内重排**:上下一维,拖动中显示落点指示线;unit 身份不变→批注/板引用/inline 锚**天然随行**(逐字段验证⛔重锚);
3. **拽出=独立成块(A 案·自由落点)**:拖到纸面空白松手→该 unit 成为新 paragraph block,**落籍在松手处**(既有落籍引擎);unit 的 writing_role 与全部锚随迁;原块移除该行;
4. **点击=单元菜单**:写作角色切换(Text/Heading/Quote/Bullet/Numbered/Todo/Toggle/Code line)入菜单;既有右键菜单行为保持;**原生 `<select>` 摘除**(视觉语言批该条销账);
5. **undo**:重排=一条 entry;拽出=多块单 entry(B6b 机器,一步恢复两块);
6. **⛔本单**:跨块迁居(拖进另一块行间)=v1.5 候单,便宜顺手可停线申报⛔擅做;⛔改 slash 角色命令;⛔动 B4-B9 语义;IME 组字中⛔拖动。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①把手缩小常显,select 退役,点击菜单换角色(角色切换功能回归,修前断言现状:select 在);②三 unit 块内拖动换序,落点线正确,批注/inline/板引用锚逐字段随行;③重排 undo/redo 一步;④拽出到纸面空白→新块落籍松手处,角色/锚保留,原块少该行;undo 一步双块逐字段恢复;⑤todo/bullet 行拽出保持角色与标记渲染;⑥IME 组字中把手拖动不触发+B4-B9 全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

执行者：Codex builder，2026-09-10。主路径已实现并验证；下列两项适用边界尚未交付，因此保留 `ready`，不将本回执等同于 B10 全量验收或 HQ 放行。§零六条裁定未改写。

### 实现

- gutter 改为常显的小把手：按钮 14×20、图标 12，继续在字符位之外；原生 role select 与其样式删除。点击和右键进入既有单元菜单，八种写作角色齐全；Code line 只补入此菜单，slash 命令不变。浏览器走查另修复该菜单的“鼠标进入已展开、点击反而折叠”问题。
- 拖动预览只画 before/after 插入线；松手后一次 structural edit 重排既有 unit，只改顺序及 `order_index`。unit/inline ID、内容、角色、metadata 及全部锚字段不重建。IME、只读、布局模式拒绝拖动，Escape/pointercancel/失焦取消，拖后 click 不误开菜单。
- 拽出接入 B6b 的同一 document history entry 与原有运行时队列。复用有 `clientCreateKey` 的 draft 创建、落籍确认、trash/restore；落籍未确认时不迁 unit，重试不重复造块。Page/Canvas 成功落点保持释放坐标，使用既有落籍引擎按纸内剩宽生成块宽。
- 原有单块 text-save 无法原子迁移跨 block 的锚归属，故新增同 note 双块 `PUT /note-blocks/:id/unit-transfer`：双 revision、双 body、批注/板引用 owner 在同一事务提交。迁移只改必要的 `block_id/text_flow_id`，可空锚字段仍保留 NULL；unit/inline、offset、excerpt、metadata、status、时间字段保持。未扩展为拖入另一现有块的交互。
- 冻结双块完整 `content_json/plain_text`，undo 恢复原始 body 形状（包括没有 `body` 字段及 `plain_text: null`）。失响应通过双 revision/body/owner 回读确认；结果未知时禁止批注写回旧 owner。批注改名/改色保持原有乐观顺序，确认迁移时只更新归属，避免覆盖后续标签。

### 六冒烟

1. **① PASS。** 修前现状来自原始源码及既有 `BlockEditorLayer.test.tsx` 断言：存在 `select[aria-label="Text unit writing role"]`，不是声称跑过修前截图。修后 CSS 检查常显/小尺寸，真实 Projection 测试无 select，并逐项点击切换 Text/Heading/Quote/Bullet/Numbered/Todo/Toggle/Code line；右键菜单回归通过。Chrome 合成页亲点把手、展开菜单、切换 Code line，确认常显与单击展开行为。
2. **② PASS。** 三 unit 的真实 pointerdown/move/up 覆盖向上、向下重排及 before/after 指示线；松手前没有内容提交。Projection 全对象比较 + `useTextFlowHistory.test.tsx` 逐字段比较批注 ranges、inline 与 board ranges；重排、undo、redo 后均保持原锚字段，不重新锚定。
3. **③ PASS。** 同一次拖动只保存一个结构编辑；真实 `usePlacementHistory` 一步 undo、一步 redo，还验证第二次 undo/redo 均无多余 entry。Chrome 合成页亲拖首行至末行，Runtime undo/redo 各一次，顺序与保存次数符合预期。
4. **④ PASS（仅下述已持久 unit 与可落籍纸内点；两项停线见后）。** 真实 writing surface 测试经过 Page 缩放、Canvas zoom/pan、非零页框原点及 pageOffsetX，释放点经落籍再投影后双轴精确相等；使用真实默认宽 760，并通过真实 layout model 与 Page DOM 确认可见。history 测试检查源块少一行、新块保留 unit/inline、一步 undo 双块与锚恢复、redo 复用同一新块。真实 adapter 验证完整 payload/标签/metadata，服务端合成内存库验证事务及锚逐字段迁回。创建失败、落籍失败、迁移失响应、逆向成功后 trash 失败的恢复均有功能测试。Chrome 拽出只验收到 release point 请求，未将该合成页冒称真实服务端端到端落库验证。
5. **⑤ PASS。** todo_item/bullet_item 分别通过抽出→undo→redo 的完整 unit/inline/锚比较；独立 Projection 渲染保留 todo checked 标记与 bullet 标记。
6. **⑥ PASS。** compositionstart 期间真实 pointer 手势不重排、不提取，compositionend 后可恢复；history 组字边界也拒绝创建。最终 client 全库无过滤整跑 **109 文件、1148 测试全 PASS**，包括原 B4–B9、B6 修一、slash、IME、历史、inline、选区/阅读序及 Board 旧测试。没有修改旧测试的业务预期来掩盖回归；旧 select 的 UI 断言按本单替换。

### 验证记录

- 最终命令在 `client/` 执行：`npm.cmd run test:unit -- --maxWorkers=4`，109/109 文件、1148/1148 测试，32.24s；仅限制并发，未过滤文件或 case。日志：`.codex-tmp/b10-validation/client-tests-final.log`。
- client `tsc --noEmit`、client `npm.cmd run build`（含 tsc）、server `tsc --noEmit` 及 `npm.cmd run build` 全 PASS。Vite 显式使用空 `COINCIDES_VALIDATION_ENV_DIR`，未加载 `.env`。构建日志：同目录 `client-build-final.log`、`server-build.log`。client 有 chunk >500kB 非阻断提示。
- `server/src/__tests__/v13AtomicTextSave.test.ts` 整文件 **13/13 PASS**（原 10 + 本单 3）；仅合成 `:memory:` 数据库。未整跑无关 server 套件。
- `verify:v2-bn8-runtime` 的获准组成项分别完整执行：tool-face registry/manifest/parity 测试 5/10/10 全 PASS；manifest/parity 校验 14 项；server shared runtime-import 0 violations；canvas runtime boundary 159 项；group-gallery 8 项、groups-rail、single-editor、source experience、legacy shutdown、relation freshness 全 PASS；model contract 60 组与 performance 5 场景 PASS。完整聚合命令未执行，因为尾项 `check:changed-file-secrets` 是用户明确留给 HQ 的凭据扫描，不能声称聚合命令原样通过。
- 初轮无界 worker 的全库曾出现旧 Board 用例 5s 超时；另修复了本单测试 fixture/TypeScript 问题及落籍坐标问题。随后在 client 目录直接限制 worker、无筛选整跑，多轮全绿；最终结果以上述日志为准。
- `npm.cmd run docs:check` PASS（index、inventory、glossary K-1～K-3）。开工时已有 B10 工单漏入 index 的过期项，按生成脚本仅更新 `docs/agent-ops/INDEX.md`；未手改正文清单。`git diff --check` PASS，暂存区为空。

### numstat

以下为本单代码/测试的 `+/-`；新增未跟踪文件按实际行数列入，没有通过 stage 获取统计。文档统计另列。仓内预存的无关未跟踪文件不计入。

| + | - | 文件 |
|---:|---:|---|
| 30 | 20 | client/src/pages/Notes/NoteDetail.module.css |
| 37 | 0 | client/src/pages/Notes/canvasEngine/atomicTextSaveRepository.ts |
| 41 | 3 | client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.tsx |
| 231 | 0 | client/src/pages/Notes/canvasEngine/blocks/TextBlockProjection.unitHandle.test.tsx（新增） |
| 17 | 0 | client/src/pages/Notes/canvasEngine/boardTextRangeEditSession.ts |
| 3 | 1 | client/src/pages/Notes/canvasEngine/commandSurfaceService.ts |
| 157 | 0 | client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx |
| 117 | 1 | client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts |
| 4 | 0 | client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasRuntimeController.ts |
| 80 | 5 | client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.test.tsx |
| 165 | 1 | client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.ts |
| 189 | 0 | client/src/pages/Notes/canvasEngine/hooks/useTextFlowHistory.extraction.test.tsx（新增） |
| 100 | 0 | client/src/pages/Notes/canvasEngine/hooks/useTextUnitHandleDrag.ts（新增） |
| 3 | 2 | client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.test.tsx |
| 3 | 0 | client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx |
| 1 | 1 | client/src/pages/Notes/canvasEngine/layers/ContextMenuLayer.tsx |
| 49 | 0 | client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx |
| 32 | 23 | client/src/pages/Notes/canvasEngine/layers/TextUnitGutterLayer.tsx |
| 157 | 1 | client/src/pages/Notes/canvasEngine/layers/pageFrameAlignment.test.tsx |
| 12 | 0 | client/src/pages/Notes/canvasEngine/textUnitGutterDeOccupation.test.ts |
| 16 | 0 | client/src/pages/Notes/canvasEngine/textUnitExtractionService.ts（新增） |
| 17 | 0 | client/src/pages/Notes/canvasEngine/textUnitOrderService.ts（新增） |
| 112 | 0 | server/src/__tests__/v13AtomicTextSave.test.ts |
| 14 | 0 | server/src/routes/noteBlocks.ts |
| 111 | 0 | server/src/services/atomicTextUnitTransfer.ts（新增） |

代码/测试共 25 文件，**+1698/-58**。文档：本工单 **+77/-0**，生成的 `docs/agent-ops/INDEX.md` **+2/-1**；本单合计 27 文件，**+1777/-59**。

### 未做

- 未 stage、commit、push、PR；未读 `.env`/key 值，未接触用户库。未设计或执行安全类测试，未执行凭据扫描。
- 未做拖入另一现有块的跨块迁居；未改 slash 角色命令、B4–B9 语义、agent 指令或权限配置。
- 浏览器使用本地合成 fixture，未登录真实用户数据；未做真实操作系统中文输入法实测、真实后端浏览器全链路或 Henry 主观体感验收。
- 未交付旧正文首次拽出及纸内最小宽度之外的自由点，详见停线。

### 停线

1. **落籍边界。** 既有 writer 禁止 `canvas_workspace_retired/canvas_crossing_retired`，并要求最小块宽 36。内容宽 760 时 x=724 可在原点落籍、宽 36；x=725 虽仍在纸内但不够宽，取消于 history/create 之前并提示 `There is not enough room for a block at this point.`。左侧超出内容域也不挪点强塞。没有放宽旧 writer 或把释放点改到边缘；**A 案“所有纸面空白均可落点”尚未全覆盖**，交 HQ 处理既有引擎与本单要求的交界，非重新裁定 A/B 方案。
2. **旧正文身份缺口。** 仅有旧 `body/plain_text`、没有可迁移持久 unit 的块，Projection 虽能画出 fallback 把手，但首次拽出无源 unit 可供现有迁移事务验证；当前明确提示 `Edit and save this block before moving a unit.`。已有编辑保存路径保持不变。未擅自加入 lazy promotion 与旧 raw payload 的逆向转换；**这类块首次直接拽出未交付**。
3. 本回执只交施工现物与验证证据；凭据扫描、上述边界收口及最终放行仍未完成，不代 HQ/Henry 销账。
