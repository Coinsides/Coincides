> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次三单 10;裁定依据=对谈拍定三(开箱仪式=一条流三入口)+拍定四(装箱=安家,**v1 过渡=投影插入**,量水深已裁安家实装落 13.5)
> **单号**: 13.4 单 10 · 开箱仪式(板上起草笔记 + 装箱 v1)

# 13.4 单 10 · 开箱仪式

**使命**:板上完成"找到思路→装箱成稿"的最后一跳——**新建笔记不打断工作流**,装卸区的 item 拖进新笔记成为**引用投影块**(v1 过渡形态,⛔ 复制正文⛔ 安家)。

## 零 · HQ 已裁(⛔ 复议)

1. **仪式入口**:板 chrome "New note" 按钮→**简易对话**(两件事:选 project——下拉既有+就地新建 project(仅名字);填 note title 必填)→创建笔记(挂选定 project)→**立即以单 6 弹窗打开**;⛔ 任何跳转打断工作流;
2. **装箱 v1=item 引用投影块**:笔记内新投影块类型(如 `item_ref`,data 只存 item_id——数据形状为将来安家预留,⛔ 存正文副本);卡面=复用共享 ItemSummary 读侧渲染当前正文摘要+出处标识("Referenced item · Born on board X"式);**只读**(⛔ 在块内编辑 item 正文——安家候 13.5);块可移动/删除如普通块;item 正文变→重开笔记块面跟变(读侧天然);
3. **装箱手势 v1**:从**装卸区行拖 item 进弹窗笔记**=落点插 item_ref 块;插入成功后 staging 行**保留**(用户自行 Remove;自动清行候优化,Result 记一笔);
4. **v1 射程收窄**:装箱只支持 **item**(中国历史流程核心);CG/text_range 拖入笔记⛔本单(记未做);"即选即装"(板面直接选成员装箱)⛔本单——v1 唯一装箱通道=装卸区;
5. server 块契约按现物最小扩(若块 type 枚举/校验闸需开 item_ref,按最小开;若块类型体系扩展面大→**停线举证**);⛔ 动 castItem/047;⛔ 新 event verb(建笔记走既有 note_created 若有,无则不造);
6. 弹窗+装卸区并存布局沿单 7 让位态;新建的笔记=真笔记(在 project 的笔记列表照常出现)。

## 一 · 交付面

- 简易对话组件(project 下拉+就地建+title)+创建链(既有 notes/projects API);
- item_ref 块投影组件(渲染/选中/删除/移动,复用块基建)+server 契约最小扩+持久化;
- 装卸区行→弹窗拖放接线(HTML DnD 或 pointer,与单 7 Place 拖放同族);
- 弹窗打开新空笔记的空态(提示"Drag items from staging"级别一句话即可)。

## 二 · 裁量与停线

- 停线举证不改判;块类型扩展面超预期→停线;
- ⛔ 改笔记页行为;⛔ 复制 item 正文进块;⛔ 安家/迁居/摘出(13.5);
- item_ref 块在**笔记页(全页)**也要正常渲染(它是真块,不是弹窗特供)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards+modal+staging+canvasEngine 块面)不破;
- 冒烟六条:①板上 New note→就地建 project+填 title→弹窗打开新笔记且挂对 project;②拖装卸区 item 行进弹窗→笔记内出现 item_ref 块,显 item 当前正文摘要;③改该 item 正文(API/workbench)→重开笔记,块面跟变;④item_ref 块可删除,删除后 item 本体无损;⑤重开板与笔记,全链保持(块在/装卸区行在/板面照常);⑥Enter 全页打开该笔记,item_ref 块渲染一致。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(凭据扫描留 HQ)。

## Result

2026-09-09 · Codex builder · 施工完成，工作树交 HQ 复核/代账；未 commit。§零六条裁决未变更。

### 交付与 numstat

- 板 chrome 的 New note → 既有 project 下拉/仅名字就地新建 + 必填 title → 既有 notes API → 直接打开单 6 弹窗。复用项目页既有 page-frame 初始化；初始化失败重试沿用同一 note/frame，避免重复创建。创建对话期间板面输入让位。
- `item_ref.content_json` 严格只有 `{ item_id }`，无正文/摘要副本，`plain_text` 为空。共享 ItemSummary 读侧按挂载重读当前摘要与出生出处；正文只读，块沿普通选择、移动、持久化、删除通道。只读块的保存屏障为空操作，不阻断普通托盘移动。
- 装卸区 item 行沿原 HTML DnD 的 board/member 身份拖进弹窗，在落点建立引用块；装卸区行保留。新空笔记显示 “Drag items from staging”。弹窗和全页共用 BlockEditorLayer 的引用渲染。
- Server 只增块枚举、指针数据校验及既有创建/更新入口的分支；现有 TEXT 存储即可承载。没有 schema migration、模板类型体系扩展、castItem/047 改动或新 event verb。

施工代码与测试 **27 文件，+1012 / -28**（不含本工单回执自身；已跟踪文件取 `git diff --numstat`，新增文件按完整行数计入；开工前已有未跟踪文件不计入）：

```text
1    0  client/src/pages/Boards/BoardNoteModal.module.css
5    2  client/src/pages/Boards/BoardNoteModal.tsx
40   0  client/src/pages/Boards/BoardPage.modal.test.tsx
1    1  client/src/pages/Boards/BoardPage.staging.test.tsx
26   8  client/src/pages/Boards/BoardPage.tsx
4    3  client/src/pages/Boards/BoardStaging.tsx
5    1  client/src/pages/Notes/canvasEngine/NoteCanvasRuntimeProvider.tsx
4    0  client/src/pages/Notes/canvasEngine/blockContentService.ts
26   0  client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.test.tsx
7    2  client/src/pages/Notes/canvasEngine/hooks/useNoteCanvasDataAdapter.ts
3    1  client/src/pages/Notes/canvasEngine/layers/BlockControlBarLayer.tsx
8    3  client/src/pages/Notes/canvasEngine/layers/BlockEditorLayer.tsx
38   1  client/src/pages/Notes/canvasEngine/layers/NoteWritingSurfaceLayer.tsx
12   4  server/src/routes/noteBlocks.ts
3    1  server/src/routes/notes.ts
3    1  server/src/services/noteBlockLifecycle.ts
16   0  server/src/validators/index.ts
11   0  client/src/pages/Boards/BoardNewNoteDialog.module.css
162  0  client/src/pages/Boards/BoardNewNoteDialog.test.tsx
130  0  client/src/pages/Boards/BoardNewNoteDialog.tsx
236  0  client/src/pages/Boards/BoardPage.unboxing.test.tsx
18   0  client/src/pages/Boards/boardStagingDrag.ts
16   0  client/src/pages/Notes/canvasEngine/blocks/ItemRefBlockProjection.module.css
28   0  client/src/pages/Notes/canvasEngine/blocks/ItemRefBlockProjection.tsx
186  0  server/src/__tests__/v13ItemRefBlocks.test.ts
19   0  server/src/services/itemRefBlocks.ts
4    0  shared/types/itemRef.ts
```

文档另计：生成索引 `docs/agent-ops/INDEX.md` **+1 / -1**（仅本单 ready → done）；本工单状态更新与 Result 追加不计入施工代码表。回执落盘、索引同步后再次执行 `docs:check` 与独立 `git diff --check` 均通过。

### 六冒烟逐条

证据边界：`client/src/pages/Boards/BoardPage.unboxing.test.tsx` 使用真实 BoardPage、创建对话、BoardNoteModal、NoteCanvasRuntime、adapter、块渲染及 NoteDetail，只替换 HTTP 和 jsdom 几何。`server/src/__tests__/v13ItemRefBlocks.test.ts` 使用显式 SQLite `:memory:`，另经真实 Express notes/blocks/items 路由做本机 HTTP 验证；不连接用户库。以下 PASS 指这些自动化证据，不冒充真实浏览器手势或主观验收。

| 条目 | 结果与证据 |
|---|---|
| ① New note → 就地建 project + title → 正确 project 的新笔记弹窗 | PASS：真实组件链确认 course_id/title，URL 保持 `/boards/board`，默认页面框先经实际创建链持久化；独立对话测试另覆盖既有 project、必填、失败重试不重复创建。 |
| ② 装卸区 item 行拖进弹窗 → 当前摘要引用块 | PASS：行 dragStart → 实际落点处理 → adapter 创建/保存位置 → ItemSummary 卡面；content_json 仅 item_id、无正文编辑器、出处可见；装卸区行与 placed=false 保留。 |
| ③ Item 正文变 → 重开笔记块面跟变 | PASS：UI 重挂载读取新摘要；真实 HTTP `PUT /items/:id` 后 `POST /items/summaries` 返回更新正文，重读笔记块仍只有 item_id 且 plain_text=null。 |
| ④ 删除引用块，Item 本体无损 | PASS：UI 普通块菜单 Move to trash 删除引用；真实 HTTP DELETE 后笔记块列表为空，完整 Item 行与删除前逐字段一致，装卸区行保留。 |
| ⑤ 重开板与笔记，全链保持 | PASS：真实 Move block 指针事件改变并保存位置；卸载/重开板与弹窗后同块、同引用、同已存位置、同装卸区行，板 viewport/members/visuals/edges 保持。夹具从无 frame 开始，只认创建链真正保存的 frame。 |
| ⑥ Enter 全页打开，渲染一致 | PASS：关闭弹窗后在板上笔记卡按 Enter，进入真实 NoteDetail；同一 ItemSummary 正文和出处正常渲染。全页不接受 staging 装箱入口。 |

### 验证执行

- `node scripts/run-text-range-validation.mjs --typecheck`：最终 client/shared/server 全通过。
- `node scripts/run-text-range-validation.mjs`：沿现有运行时门的允许阶段运行；客户端 **76 文件、653/653**，registry/manifest/parity、runtime/shell/source 检查、canvas model/performance、client build、server build、docs:check 均通过。该轮后增加的 CG/range 拒绝范围断言，最终另跑 `--client-tests src/pages/Boards/BoardPage.unboxing.test.tsx` **4/4** 通过。
- Server Boards 定向回归 `--server-boards` **31/31**；引用块内存服务/真实 HTTP 测试 **5/5**；adapter 定向回归 **46/46**；New note/板面 modal/staging 定向回归 **23/23**。
- 验证包装器在末尾 `git diff --check` 子进程报 `Not a git repository`（退出 129）；同一工作树独立执行 `git diff --check` 已通过。包装器原始日志：`.codex-tmp/unboxing-validation/runtime-gate.log`。没有把包装器整体记成绿。
- Vite/Vitest 禁止加载环境文件，执行器对子进程仅传 OS/工具路径变量，数据库限定内存。未读取 `.env`、未输出/传送 key、未触碰用户数据库、未执行安全类测试或凭据扫描。原始 `verify:v2-bn8-runtime` 的完整放行仍留 HQ，禁测项未被豁免。

### 未做

- CG/text_range 装箱、板面直接选择成员即选即装：按裁决未做；自动化确认 CG/range 不会创建引用块。
- 安家/迁居/摘出、块内编辑 Item 正文：按裁决留 13.5。
- 插入后自动清除 staging 行：按裁决未做，用户自行 Remove，后续优化候选。
- 真实浏览器原生拖放/视觉走查、用户主观体验签收：未做；六冒烟的自动化射程如上。
- 安全类测试与凭据扫描：本单禁止执行，留 HQ。

### 停线事项

无块类型体系扩展过大的设计停线，也未改判。施工中发现的空 note 缺持久化 frame 与只读块 flush 阻断普通移动，两处均在现有机制内修复并验证；前者用无 frame 夹具先复现失败后转绿。仅有上述验证包装器 Git 环境异常，已用独立 diff 检查补证；完整原门的禁测阶段仍待 HQ。
