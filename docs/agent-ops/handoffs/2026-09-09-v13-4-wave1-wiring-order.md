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
