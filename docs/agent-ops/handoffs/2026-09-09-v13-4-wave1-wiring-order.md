> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次一(`plans/v13-4-projection-itemization-plan.md`);现物证据=单 0 侦察(`analysis/2026-09-09-v13-4-s0-recon.md`)+对谈档 §一
> **单号**: 13.4 单 A · 接线批+生命周期批

# 13.4 单 A · 接线批 + 生命周期批

**使命**:把"服务端已备、UI 缺席"的板契约接上,并补齐板/笔记的生命周期动词。五件套,纯接线为主,⛔ 引入新数据概念。

## 一 · 交付面(五件)

### A1 · 板改名 UI
- BoardPage 内板名内联编辑(双击标题或编辑钮),接既有 `PATCH /boards/:boardId`(`server/src/routes/boards.ts:80`);空名拒绝(沿开板 80 字上限);
- BoardList 卡片改名不做(最小面=板内改名)。

### A2 · 落板物一等公民化
- freehand 与搬迁 shape/image/table/connector(board_visuals)选中后可**拖移**;shape/image/table 可**缩放**(resize 手柄),freehand/connector 缩放不做;
- 接既有 `PATCH /boards/:boardId/visuals/:visualId`(`server/src/routes/boards.ts:202`,client `boardRepository` 需补 updateVisual 调用方);复用 member 拖拽手势管线(`BoardPage.tsx` begin/move/end 族);
- 落库时机与 member 一致(end 时 PATCH);失败走 useBoard 既有错误面。

### A3 · 连线 label + 方向
- select 工具下双击边→内联输入 label,PATCH edges(`routes/boards.ts:178`;`boardRepository.updateEdge` 已有实现无调用方);清空=删 label;
- 方向箭头:选中边的 selectionBar 加"无/单向/双向"三态切换,存 edge style 字段,渲染补 marker;
- label 渲染已在(`BoardPage.tsx` L385 附近),对齐即可。

### A4 · 删板
- server 新增 `DELETE /boards/:boardId`:事务内删 members/edges/visuals+板行;**魂(purpose)留存不删**(魂是身份,板是场地;一魂一板唯一索引随删解除占用,同魂可再开新板);
- 走 runRecordedAction 记事件 verb `board_deleted`(新 verb 开闸,HQ 已裁;objects 记 board id+title 快照);
- UI:BoardList 卡片菜单+板内菜单"Delete board",**确认框必须明示射程**:"将删除本板及其 N 件画物、M 条连线与全部摆位;笔记与知识内容不受影响"——搬迁来的画物真身随板删除,数字要真算;
- ⛔ 回收站/软删(候需求)。

### A5 · 笔记 delete 落真
- 现物:笔记 More 浮层 delete/archive/duplicate 均 aria-disabled 占位(`NoteChromeLayer.tsx:623-627`);
- 本单只做 **delete**:优先软删语义(deleted/archived 标记+列表过滤+可恢复入口);先侦察 server 现物(notes 路由有无删除/归档面),按现物选最小实现;若仅硬删可行,**停线举证**候 HQ 裁;
- duplicate/archive/import/export 本单⛔(占位保留);
- 删除确认框明示:"笔记入回收/归档,可恢复"(按实装语义写真话);若笔记有板挂载(board_members 引用),删除后板上卡按既有 missing/unavailable 降级显示,⛔ 静默消失——验证一条。

## 二 · 裁量与停线

- 停线举证不改判:现物与本单假设冲突(行号漂移/字段缺失/A4 级联有未列品类)→ 停线申报,⛔ 自行改设计;
- A2 的 pinned 语义不适用 visuals(无 pinned 字段)——不造新字段;
- 书记官面:除 A4 的 `board_deleted` 外⛔ 新 verb(改名/挪画物/边 label 均不入钢,client 操作不入 events 的图二裁定不变)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;
- 冒烟五条:①改板名重开仍在;②挪一笔画+缩放一图形,重开位置保持;③加 label+切单向箭头,重开保持;④删一板(含≥1 画物),确认框数字正确,同魂可再开新板,events 见 board_deleted;⑤删一篇有板挂载的笔记,恢复后板卡回活,删除期板卡可见降级;
- 既有测试面回归:`useBoard.test.tsx`/`BoardPage.smoke.test.tsx` 不破。

## 四 · Result 格式(工单尾追加)

`## Result`:numstat + 五冒烟逐条结果 + 未做清单 + 停线事项(如有);**⛔ commit**(工作树交 HQ 代账);⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试。

## Result

> **日期**: 2026-09-09
> **From**: codex(builder)
> **结论**: STOPPED — 施工前触发本单 §二“现物与本单假设冲突”停线条件；五件均未实施，不标 done，待 HQ 裁定。
> **取证基线**: `fable/v2-bn12-exoskeleton`，HEAD `b097ebe31dca236437bbbb238a3193d29235a192`；以下行号为本次工作树静态源码证据。

### numstat

本次仅追加本工单回执，产品代码为 `0 additions / 0 deletions`。开工时 tracked diff 为空；原有未跟踪文件未读取、未改动。

```text
44	0	docs/agent-ops/handoffs/2026-09-09-v13-4-wave1-wiring-order.md
```

### 停线事项

1. **A2：visuals 已有 pinned，工单的无字段假设不成立。** 本单 §二（第 42 行）写“pinned 语义不适用 visuals（无 pinned 字段）”；实际 `server/src/db/migrations/057_v13_boards.ts:71` 已声明 `board_visuals.pinned`。`server/src/validators/boards.ts:42` 定义该字段，`:68`、`:77` 将它纳入 visual PATCH；`server/src/services/boards.ts:118` hydrate 为 boolean，`:351` 插入、`:367` 与 `:370` 更新它；`client/src/pages/Boards/boardTypes.ts:66` 的 BoardVisual 继承含 pinned 的 BoardGeometry（`:17`）。这是现有契约事实，不是本次增设字段。依第 41 行停线，不自行决定拖移/缩放是否忽略或遵守 pinned。
2. **A4：objects 标题快照字段缺口。** 本单要求事件 objects 保存 board id + title 快照；`server/src/db/recordEvent.ts:38` 的 objects 元素仅允许 `kind/id`，`:41` 使用 strict，`:65`–`:68` 对不符项抛 `events_invalid_entry`。不能直接放入 title；本次未扩该公共契约，也未改放 summary/meta 代替工单指定位置。`board_deleted` 新 verb 本来就是本单授权新增，不把它尚未存在另算停线原因。

### 其余已核事实（不是冒烟通过）

- **A4 级联**：限定全体 `server/src/db/migrations/*.ts` 与 `server/src/db/schema.sql` 静态核对，只见 members/edges/visuals 指向 boards（schema `:1286`、`:1306`、`:1320`）及 edges 两端指向 members（`:1312`、`:1313`），未发现工单未列品类的 FK 级联。soul FK 为 RESTRICT（`:1273`），一魂一板索引在 `:1280`；未连接任何数据库验证实际存量。
- **A4 搬迁撤销后果**：operation_batches 没有 board FK（schema `:382`–`:394`）；board_id 在搬迁 JSON receipt 内（`server/src/services/boardTrayRelocation.ts:199`）。删板后旧 batch 不随 FK 删除，撤销入口先核旧 board（`:209`），会走 board_not_found（`:29`–`:32`）；同魂新板也不是旧 board id（`:213`）。仅列现有后果，未改批次保留或失效设计。
- **A5 可用软删底座**：`server/src/routes/notes.ts:179` DELETE 已接 trash，`:193` 有 restore；`server/src/services/notes.ts:43`、`:51` 仅改 status/trashed_at，`:123` 默认过滤 active。`client/src/pages/Courses/CourseDetail.tsx:142`、`:193`、`:223` 已有恢复调用、Trash 页签与 Restore 入口。无需因“仅硬删可行”停 A5。
- **A5 板卡降级底座**：`server/src/services/boards.ts:146` 将非 active 笔记解析为 unavailable/note_inactive，`:147` 在 active 时恢复 available；`:213` 仍读取成员。`client/src/pages/Boards/BoardPage.tsx:403`–`:415` 渲染降级卡。`NoteChromeLayer.tsx:623`–`:627` 的笔记内 More 仍占位，未接线。

### 五条冒烟逐条结果

| # | 工单冒烟 | 本次结果 |
|---|---|---|
| ① | 改板名，重开仍在 | **未运行**：施工前停线，A1 未实施。 |
| ② | 挪一笔画、缩放一图形，重开保持 | **未运行**：A2 pinned 假设冲突，未改拖移/缩放。 |
| ③ | 加 label、切单向箭头，重开保持 | **未运行**：施工前停线，A3 未实施。 |
| ④ | 删含画物的板、确认计数、同魂重开、board_deleted | **未运行**：A4 未实施；无删板或事件写入。 |
| ⑤ | 删除有板挂载的笔记、删除期可见降级、恢复回活 | **未运行**：只核现有软删链，A5 UI 未实施。 |

### 验证与未做清单

- 已做：完整读取工单、核对相关现物与引用行号、检查本次文档 diff/numstat/空白；CodeGraph 优先尝试但 MCP 未见可用入口、CLI 不在 PATH，rg 也不可用，回落限定路径 PowerShell 静态读取。
- 未做：A1–A5 全部实现；typecheck、build、`useBoard.test.tsx`、`BoardPage.smoke.test.tsx`、`npm run verify:v2-bn8-runtime` 及五条冒烟。停线回执不是产品完工，也不是验证门豁免或通过。
- 未做：任何数据库连接/读写、迁移执行、产品/API/浏览器启动与操作、网络/模型调用、安全类测试；未读取 `.env`，未输出或传输 key。
- 未做：git commit/push/PR/merge；未修改工单既有正文与 ready 状态、current-state、agent 指令或权限配置。工作树仅交 HQ 本停线回执，裁定留 HQ。

## 补遗一(HQ 裁定,2026-09-09,两停线全裁,续工令)

1. **A2 改判**:§二"visuals 无 pinned 字段"假设作废(builder 举证成立,057:71 现物为准)——visuals 拖移/缩放**遵守 pinned**(pinned=拒绝几何变更,与 member 同语义);selectionBar 对选中 visual 提供 Pin/Unpin(PATCH 契约已备,与 member 一致);
2. **A4 改判**:⛔ 扩 recordEvent objects 公共契约——objects=`[{kind:'board', id}]` 即可;板名与射程数字入 **summary**(形如 `Board "<title>" deleted: N members, M edges, K visuals`)与 **meta**(`{title, member_count, edge_count, visual_count}`);
3. **A4 附账认可**:删板后旧搬迁批次撤销走 board_not_found=**可接受的现有后果**,⛔ 本单改批次保留/失效设计;
4. **A5 确认**:按回执已核软删底座(DELETE /notes:179+restore+trash 链)直接接线,恢复入口沿现有 Trash 面;
5. 其余条款照原单;**续工:A1–A5 全做**,typecheck/build+五冒烟+既有测试回归,新 Result 追加于本补遗之后(上方已有停线回执,完工判据认新 Result+产品码 numstat,⛔ 认旧回执)。

## Result

> **日期**: 2026-09-09
> **From**: codex(builder)
> **结论**: A1–A5 全部实施；本单五条功能冒烟、两端 typecheck/build 与既有功能回归 PASS。完整 `verify:v2-bn8-runtime` **不判 PASS**：末项凭据扫描与本轮「禁止安全类测试」冲突，未运行；全部其余子项已分别通过。工单头保留 ready，交 HQ 判断总门与放行，不自行豁免。
> **交付基线**: `fable/v2-bn12-exoskeleton`，本轮核验 HEAD `e0a0e39a26508bc53deec8a8eb221988375b3b00`；仅工作树交付，无 git commit。

### 实施

- **A1**：板内标题双击或 Rename board 按钮进入内联编辑，空白拒绝、80 字上限；通过既有 PATCH 保存，只改板名，不改魂名。
- **A2**：freehand / shape / image / table / connector 共用 member 的 begin/move/end 管线，换算 viewport zoom，拖拽结束后 PATCH；shape/image/table 提供 resize 手柄并计入对象 scale。visuals 遵守 pinned，selectionBar 提供 Pin/Unpin；freehand/connector 不提供 resize。失败统一进入 useBoard 错误面，保留原排队与连续拖拽行为。
- **A3**：select 下双击边或 Edit label 进入内联输入，清空发送 null；`style.direction = none | forward | both`，更新时保留其他 style 字段。箭头端点裁到卡边界外，编辑时输入层位于投影之上，避免卡片遮挡。
- **A4**：新增 `DELETE /api/boards/:boardId`，runRecordedAction 同事务删 edges/members/visuals/board 并写 board_deleted；魂、笔记、知识内容、旧搬迁批次保留。objects 仍仅 kind/id，summary/meta 按补遗一保存标题与三项真实计数。058 迁移只扩 events verb CHECK，保留旧收据、序号、索引和触发器；未扩 objects 公共契约。BoardList 与板内 More 均接删除确认框，先重新 GET 实数再允许确认，明示搬迁画物真身随板删除。错误可重试、取消不写、离页后的迟到响应不抢导航。
- **A5**：笔记 More 的 Delete 接既有软删，确认面明示移入 Project Trash、可恢复与板卡暂不可用；成功返回所属 Project，恢复沿既有 Trash/Restore。失败留确认面，跨 note/离页的旧请求不关闭新确认或抢导航。其余占位保留。

### numstat

产品与测试（含 5 个新增文件，标 *；未 git add）：**1275 additions / 54 deletions，24 文件**。

```text
12    0   client/src/pages/Boards/BoardList.tsx
190   1   client/src/pages/Boards/BoardPage.smoke.test.tsx
147   37  client/src/pages/Boards/BoardPage.tsx
7     3   client/src/pages/Boards/BoardRelocatedVisual.tsx
17    1   client/src/pages/Boards/Boards.module.css
3     0   client/src/pages/Boards/boardRepository.ts
103   1   client/src/pages/Boards/useBoard.test.tsx
15    1   client/src/pages/Boards/useBoard.ts
62    0   client/src/pages/Boards/BoardDeleteDialog.tsx *
132   0   client/src/pages/Boards/BoardDeleteDialog.test.tsx *
48    0   client/src/pages/Notes/NoteDetail.module.css
4     1   client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasLayerProps.ts
28    0   client/src/pages/Notes/canvasEngine/hooks/useNoteTrashAction.ts *
132   1   client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.test.tsx
78    2   client/src/pages/Notes/canvasEngine/layers/NoteChromeLayer.tsx
1     1   server/package.json
15    2   server/src/__tests__/v13BoardRoutes.test.ts
189   0   server/src/__tests__/v13BoardWave1.test.ts *
1     0   server/src/db/recordEvent.ts
1     1   server/src/db/schema.sql
52    0   server/src/db/migrations/058_v13_board_deleted_event.ts *
1     1   server/src/middleware/recordedAction.ts
20    1   server/src/routes/boards.ts
17    0   server/src/services/boards.ts
```

随行文档：`docs/generated/object-inventory.md` **89/84**（docs:check 发现生成清单尚缺既有 057 的四张板表与 boards 路由，运行原生成器同步；不是本单新增四张表）。本工单仅在补遗一后追加本 Result，旧 STOPPED 回执及 HQ 裁定原文保留。

### 五条冒烟逐条结果

| # | 结果 | 本轮证据 |
|---|---|---|
| ① 改板名重开 | **PASS** | BoardPage smoke 经真实组件/仓储、mock HTTP 保存并离页重开；server wave1 经真实 PATCH→GET，标题保留、未新增事件。 |
| ② 挪笔画、缩图形重开 | **PASS** | UI smoke 在 2× viewport 移动全部五种 visual，并缩放 scale=1.5 的 shape；重开保持、Pin 后无几何 PATCH 且隐藏 resize，Unpin 恢复。server HTTP 重读核 freehand 数据与形状尺寸/pinned。 |
| ③ label、单向箭头重开 | **PASS** | UI 双击输入、保存、单向 marker 与卡边界坐标、离页重开均核对；另核清空/null、双向/无箭头及 style 其他键保留。server PATCH→GET 核 label/direction 持久化。 |
| ④ 删含画物的板、计数、同魂重开、事件 | **PASS** | 板内/列表两入口分别核真实 scope，列表打开前新增第三画物后重新取数，取消零 DELETE；删除后同魂创建新板。server 另核 2 members / 1 edge / 2 visuals 的真实落库、魂/内容完整保留、board_deleted objects/summary/meta 与事件失败时整体回滚。 |
| ⑤ 删挂板笔记、降级、恢复 | **PASS** | NoteChrome smoke 经真实删除 action→Project Trash→既有 Restore；server 真实 notes DELETE/restore→板 GET，member 身份/位置不变，unavailable/note_inactive→available；BoardPage smoke 核降级卡仍可见、重读恢复后可开笔记。 |

**证据边界**：client 是 jsdom 的生产组件/路由/hooks + mock HTTP，server 是生产路由/服务 + 自建内存 SQLite + loopback 随机端口；两层分别取证。不是连接用户数据的浏览器端到端，也未声称真人体感验收。jsdom 的 dialog/pointer capture 仅补测试平台方法，不等于真实浏览器原生弹窗/命中测试。

### 验证

- client `test:unit`：最终 **62 文件 / 535 条 PASS**，包含 `useBoard.test.tsx` **8/8**、`BoardPage.smoke.test.tsx` **11/11**、`BoardDeleteDialog.test.tsx` **4/4**、`NoteChromeLayer.test.tsx` **9/9**。日志：`.codex-tmp/v13-4-validation/test-unit-final.log`。
- server `test:v13-boards`：**25/25 PASS**（旧板面 18 + 新 wave1 7，含五个子冒烟及 058 迁移保留验证）；server `tsc --noEmit` 与 `npm run build` PASS。
- client `build:client`（含 `tsc -b`）PASS。构建保留既有大 chunk、server recursive-schema 提示，无错误。
- 总门其余功能子项全部分别 PASS：tool-face registry / manifest 测试及校验、parity 测试及校验、server/shared runtime import、canvas runtime boundary、group-gallery / groups-rail / single-editor shell、source experience、V11 legacy shutdown / relation freshness、canvas model contract **60 组**、canvas performance **5 场景**、docs:check、git diff --check。日志在 `.codex-tmp/v13-4-validation/`；未改总门脚本。
- 验证过程保留：新增测试曾因不支持的 Testing Library `exact` 类型参数使 build 失败，已修正并重建 PASS；docs:check 初次因上述生成清单过期失败，同步后 PASS。一次默认并行全量出现未改动的 `groupGalleryPurposeRetirement.test.tsx:111` 短暂失败，随后该文件专项 **3/3**、最终全量 **535/535** 均通过；未修改其测试或产品代码，具体时序原因尚未证明。

### 未做清单与停线举证

- **总门冲突留 HQ**：`package.json` 的 `verify:v2-bn8-runtime` 最后一项是 `npm run check:changed-file-secrets`，指向 `scripts/changedFileSecretScan.mjs`。它枚举并读取变更文件检查凭据，属于本轮禁止的安全类检查；**未运行该项、未原样执行完整总门、未宣布总门 PASS 或豁免**。已执行并通过的是允许子项，不以换名或改脚本绕过。
- A2/A4 原两条停线已按补遗一解决，无新增数据契约/级联假设冲突。旧搬迁批次删板后撤销仍 board_not_found，按 HQ 已认可后果保留。
- 不做：BoardList 改名、freehand/connector resize、板软删/回收站、笔记 duplicate/archive/import/export、其他新 event verb、批次保留/失效设计变更。
- 未读 `.env`。每个 Vitest/Vite 进程使用 `COINCIDES_VALIDATION_ENV_DIR` 指向新建空目录 `.codex-tmp/v13-4-validation-env`；server 验证不启动应用入口，固定内存 fixture。未连接/读取/写入用户数据库，未在用户库执行迁移；无外部模型请求、key 输出/传输或安全类测试。
- 未 git commit/push/PR/merge，未改 agent 指令/权限文件。开工前已有未跟踪配置、审计、研究文件原样保留；工作树交 HQ。
