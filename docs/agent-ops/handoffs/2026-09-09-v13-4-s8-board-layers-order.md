> **状态 (Status)**: blocked
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 8;现物证据=单 0 侦察附录⑨(z_index 分类各排,跨类型统一层序不存在——分层连带渲染次序重构+edges 跨层规则);Henry 拍定(分层砍薄白话版无异议)
> **单号**: 13.4 单 8 · 板分层薄版

# 13.4 单 8 · 板分层(薄版)

**使命**:板长出图层——"第一层要什么,第二层要什么"的认知外化;**顺带把跨类型层序糊涂账理顺**。v1 薄版:加/删/改名/排序/显隐;⛔ 锁定/透明度/缩略图/揭示播放(14.x)。

## 零 · HQ 已裁(⛔ 复议)

1. **数据**:新迁移 `board_layers`(id/board_id/user_id/name/order_index/visible 默认 1);board_members 与 board_visuals 加 **layer_id nullable FK**——**NULL=默认层**(旧数据零迁移痛);默认层=虚拟行(不占表),面板显示为"Base",可见性可切但⛔可删⛔可排到别处(恒最底);
2. **统一渲染次序(糊涂账清算)**:渲染=按层序低→高逐层容器化(SVG/DOM 分层容器),**层内**沿既有类内次序(edges/freehand 同层内先边后笔、visuals/members 按 z_index)——既有板观感在"全默认层"时不变;
3. **edges 跨层规则**:边渲染归**两端点中较高的层**;任一端点所在层隐藏→边隐藏;
4. **显隐语义**:隐藏层的对象不渲染、不命中(框选/点选/删除/连线起点全排除);staging 名单不受层影响;
5. **UI**:图层面板(chrome 按钮唤出的小浮层):列表(自定义层+Base)、Add layer、双击改名、拖序、眼睛 toggle;**活动层**概念:面板选中的层=新建对象(pen/chalk/搬迁落板/staging Place)的归属层(默认=Base);对象归层:选中(含多选)→selectionBar "Move to layer" 下拉;
6. **删层**:层内对象全部迁回默认层(⛔ 删对象),确认框明示 N 件将迁回;
7. **undo 栈**:对象换层=PATCH 入单 4 命令栈(generic);层自身增删改名排序⛔入栈(v1);
8. ⛔ 新 event verb;⛔ 动 staging/搬迁批次;层数上限 12(常量,防失控)。

## 一 · 交付面

- 迁移+base schema+validators/DTO/hydrate(layers CRUD 路由+member/visual PATCH 收 layer_id);
- 渲染容器化重构(BoardPage 分层渲染管线);
- 图层面板+活动层+Move to layer+显隐+删层迁回。

## 二 · 裁量与停线

- 停线举证不改判;渲染重构若与单 4 命令栈/多选命中织合出乱序或命中错层→停线;
- 全默认层时观感回归:既有 smoke 断言不破(层序清算⛔改变默认观感)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards 全目录+modal/staging/tools)不破;
- 冒烟六条:①建两层,两卡各归一层,拖层序→前后遮挡关系互换,重开保持;②隐藏一层→层内对象不可见不可框选,跨层边(端点在该层)隐藏;恢复显示全回;③删自定义层→N 件确认→对象迁回 Base 不丢,几何不变;④活动层选自定义层→新画一笔/新 chalk 落该层;⑤多选三对象 Move to layer 一步归层,Ctrl+Z 回原层;⑥旧板(全 NULL)渲染观感与既有 smoke 一致。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。

## Result

2026-09-09 · Codex builder。工作分支 `fable/v2-bn12-exoskeleton`，交付时 HEAD `9a17edc087cdb4a841315437d239d2b3c76f1f84`。**主体实现已交付工作树，未 commit；本单不报放行，保留一项已复现的旧搬迁批次兼容停线。** 开工前既有未跟踪的 `.claude/settings.local.json`、audit/brainstorm 文件未改。

### 实现

- migration 062 + base schema：`board_layers`；members/visuals nullable `layer_id` FK、`ON DELETE SET NULL`；Base 不占表行，恒最底；总数上限 12（含 Base，最多 11 个自定义层）。同板同用户校验沿 service，FK 本身负责层存在性。
- layers GET/POST/PATCH/PUT order/DELETE；member/visual/text-range 创建与 PATCH 归层；Base 可见性通过 Board DTO 的 `base_layer_visible` 读写，保存在既有 viewport JSON 内部，普通视口保存保留该状态。
- `boardLayerScene` 同时提供绘制与命中候选；低→高独立 DOM stacking context，每层自己的 SVG 与 DOM 保持原有类内次序。边归较高端点层，任一端点层隐藏即不渲染；隐藏对象不进入框选、直接删除、连接起点或橡皮命中。普通删除确认仍完整计入随可见端点级联删除的隐藏附带边。
- chrome Layers 浮层：添加、双击/F2 改名、拖序/键盘箭头排序、显隐、N 件确认删层迁回 Base。活动层为板编辑会话状态；新笔/chalk/直接挂载/文本粘贴/Place/搬迁落板归活动层。隐藏活动层仍可收隐藏对象，chalk 会提示先显示活动层。Staging 名单保持完整。
- 多选 Move to layer 为一个命令，包含 pinned 对象，Ctrl+Z/redo 还原归属；图层自身操作不入栈；删层同时将历史快照中的该层引用归 Base，避免以后重放已删 FK。新建/删笔重建及 chalk cast 保留归层。
- 搬迁仅透传目标层进入现有创建与快照路径；未改批次规则、历史 receipt 或 event verb。旧批次比较接缝见停线证据。

### numstat

以下为实现、测试与生成清单，**35 文件，+1279 / -155**；不含本工单 Result 自身与开工前已有未跟踪文件。已跟踪文件取 `git diff --numstat`，本单新文件按全部行补计（未 git add）。

```text
added deleted path
15    0       client/scripts/boardLayersSmoke/README.md
55    0       client/scripts/boardLayersSmoke/fixture.tsx
3     0       client/scripts/boardLayersSmoke/index.html
38    0       client/scripts/boardLayersSmoke/start.mjs
34    3       client/scripts/boardToolsSmoke/mockApi.ts
1     0       client/src/pages/Boards/BoardChalk.tsx
34    0       client/src/pages/Boards/BoardLayers.module.css
159   0       client/src/pages/Boards/BoardLayers.tsx
242   0       client/src/pages/Boards/BoardPage.layers.test.tsx
99    33      client/src/pages/Boards/BoardPage.tsx
3     0       client/src/pages/Boards/Boards.module.css
12    0       client/src/pages/Boards/boardActiveLayer.ts
37    2       client/src/pages/Boards/boardCommandHistory.ts
34    0       client/src/pages/Boards/boardLayerScene.ts
1     1       client/src/pages/Boards/boardRepository.test.ts
24    2       client/src/pages/Boards/boardRepository.ts
5     2       client/src/pages/Boards/boardSelection.ts
18    1       client/src/pages/Boards/boardTypes.ts
104   1       client/src/pages/Boards/useBoard.history.test.tsx
32    1       client/src/pages/Boards/useBoard.ts
3     1       client/src/pages/Notes/canvasEngine/hooks/useTrayController.ts
1     1       docs/agent-ops/INDEX.md
88    87      docs/generated/object-inventory.md
6     0       server/src/__tests__/helpers/v13BoardsFixture.ts
1     1       server/src/__tests__/v13BoardChalk.test.ts
2     0       server/src/__tests__/v13BoardServices.test.ts
1     1       server/src/__tests__/v13BoardStaging.test.ts
2     1       server/src/__tests__/v13BoardTextRanges.test.ts
28    0       server/src/db/migrations/062_v13_board_layers.ts
13    0       server/src/db/schema.sql
38    0       server/src/routes/boards.ts
5     3       server/src/services/boardTrayRelocation.ts
115   14      server/src/services/boards.ts
15    0       server/src/validators/boards.ts
11    0       shared/types/boardLayers.ts
```

### 六冒烟逐条

自动流程使用生产 BoardPage/useBoard/history/repository + 合成 memory HTTP transport，文件 `client/src/pages/Boards/BoardPage.layers.test.tsx`，六条全部通过；浏览器使用相同生产前端的 loopback memory fixture，不连接应用后端。真实浏览器只对下列注明的步骤补证，不冒充用户库旅程或主观验收。

| # | 结果与证据 |
|---|---|
| ① 两层、两卡、拖序、重开 | PASS：自动流程 UI 新建并改名两层、两卡分别归层，拖序后容器排序及 stacking rank 互换、原类内 z 不变，重开保序；内存 HTTP 另证 order reload。Chrome 实际拖序确认 A/B 遮挡互换，重叠处真实指针命中较高层 A。 |
| ② 隐藏、命中、跨层边、恢复 | PASS：隐藏后成员、笔及边均从 DOM 移除、选中清理、框选及 Delete 无目标；Staging 名单仍在；显示后全回。Chrome 复证端点层与跨层边消失、原位置框选无命中、Staging 数量不变、恢复全回。另证删除可见端点的确认正确计入隐藏附带边。 |
| ③ 删层 N 件迁 Base、几何不变 | PASS：自动流程 N=3（含 staging）确认、只删除 layer endpoint，对象数与全部几何字段不变、归属全 NULL；内存 HTTP 复证真实服务。Chrome 确认框明示 3 件，确认后面板 Base=3、原对象与连线仍在。 |
| ④ 活动层、新笔、新 chalk | PASS：自动流程选自定义活动层后画笔、创建 chalk、Staging Place 均归该层，创建 undo/redo 不丢层；内存服务另证 chalk cast 保层、新搬迁目标层进入快照且该新批次可撤回。 |
| ⑤ 多选三对象一步换层、Ctrl+Z | PASS：自动流程两成员+visual 三对象跨旧层（含 Base）一次归层，一次 undo 恢复各自原层；独立 history 测试覆盖 pinned、旧 DTO 省略 layer_id、删层后的历史重放。Chrome 真框选 3 件、Move to layer 后一次 Ctrl+Z 回到原层。 |
| ⑥ 全 NULL 旧板观感 | PASS：自动流程只在 Base 中绘制，原 member/visual z、边先笔后与 Base 原 marker ID 保留；既有 Boards smoke/modal/staging/tools 断言全过。迁移内存证据显示旧行只新增 NULL、旧字段逐项不变。未作用户真实旧板或人工主观视觉签收。 |

### 验证

- `npm.cmd --prefix client run test:unit` **81 文件 / 702 测试全通过**，完整套件、无 test-name 过滤，覆盖 Boards 全目录、modal/staging/tools 及 note tray。最后一次在附带边确认修复之后运行。`useBoard.history` 包含新增 3 条纯功能回归；本单未新增或设计安全类测试。
- `npm.cmd run build:client`（含 `tsc -b`）PASS；server `npm.cmd exec tsc -- --noEmit` 与 `npm.cmd run build` PASS。client build 仅既有大 chunk 提示，无构建错误。
- server `npm.cmd run test:v13-boards` **25/25**；另将 BoardChalk/Staging/TextRanges/TrayRelocation、ItemFloor/ItemRefBlocks、Tray/TrayOrder 八个文件完整运行，**34/34**。既有 fixture 仅补 062 装配及 nullable DTO 形状。
- 内存 HTTP 冒烟：layers CRUD/order、归层创建/PATCH、Base 显隐跨 viewport PATCH、删层保几何、chalk cast、12 层上限 PASS。迁移冒烟：fresh/upgrade 列与 FK 同形、重复执行、旧行 NULL-only、新搬迁活动层与撤回 PASS。
- `verify:v2-bn8-runtime` **未原样调用**：根脚本末尾有 `check:changed-file-secrets`，用户直令凭据扫描留 HQ。其余既有步骤全部按原入口运行：完整 client unit、registry、manifest、manifest/parity checks、server shared import、canvas/gallery/rail/editor/source/legacy/freshness checks、canvas model/performance、client/server builds、docs check、diff check；均通过。docs check 首次因新增 schema 使生成清单过期失败，已运行 `docs:inventory` 更新后重跑 PASS。
- Vitest/Vite build 统一设置 `COINCIDES_VALIDATION_ENV_DIR` 到仓内空目录；浏览器 fixture `configFile:false, envFile:false` 且只绑定 `127.0.0.1:5191`。后端测试/冒烟全为 `:memory:`。没有读 `.env`、没有输出凭据、没有用户数据库接触。
- 原有 CodeGraph CLI/MCP 均不可用，尝试后改用限定源码读取；browser-harness 因无法访问 Chrome DevToolsActivePort 未启动，改用已连接 Chrome CUA 在合成页操作。Windows fixture 的 mock import 路径已统一，避免 Vite 路径双实例。
- 复跑入口：`client/scripts/boardLayersSmoke/README.md`。日志、原样保留的 HTTP/迁移脚本与精确命令在 `.codex-tmp/s8-validation/`，尤其 `client-unit.log`、`client-build.log`、`backend-evidence-commands.md`、`layers-http-smoke.log`、`layers-migration-smoke.log`；该临时目录不进入上述 numstat。

### 未做

- 未 commit / push / PR / merge；工作树交 HQ 代账。
- 未执行用户数据库迁移或用户真实数据旅程；未替 HQ/Henry 做放行或主观验收。
- 未运行凭据扫描；未设计、新增安全类测试；未读 `.env` 或导出 key。
- 不带锁定、透明度、缩略图、揭示播放；未新增 event verb；未重写 staging/搬迁批次或历史 receipt。
- 旧搬迁批次升级兼容尚未修复，见下一节；因此本单状态为 blocked，不以主体测试绿代替全单放行。

### 停线事项

**STOP-1 · 旧搬迁批次在加 nullable 列后无法撤回，已隔离复现，未改判。**

定位：`server/src/db/migrations/062_v13_board_layers.ts:21` 给目标表增加 `layer_id`；`server/src/services/boardTrayRelocation.ts:39–41` 的 `sameRow` 要求实际行与历史快照键数相同，`:219` 在撤回时调用。062 前的 receipt 没有此字段，062 后目标行即使仍在 Base 也多一个 `layer_id:null`。

内存合成样本先建立真实旧 shape 来源、搬迁目标与旧 receipt：**迁移前生产 undo 成功**（外层事务故意回滚以保留同一样本）；执行 062 后对同一样本再调用生产 undo，**报 `tray_relocation_target_changed`**。旧快照 15 键、当前 16 键，逐字段唯一区别为 `layer_id:null`，目标几何不变、batch 保持 applied。这不是用户库推断，也不是新批次失败。

复现原脚本：`.codex-tmp/s8-validation/legacy-relocation-repro.mjs`；输出：同名 `.log`；执行命令见 `backend-evidence-commands.md`。**该脚本 exit 0 表示成功复现停线，不能算兼容通过。**

已停止该比较接缝的修复，保留现有 `sameRow` 与旧批次证据，不自行归一历史 receipt、不更改批次规则；交 HQ 在本单“⛔动搬迁批次”边界下处理。渲染与单 4 命令栈/多选命中的六项合成验证未出现乱序或命中错层，但不能据此消除此迁移兼容停线。

## 补遗一(HQ 裁定,2026-09-09:STOP-1 采纳,比较接缝定向豁免,续工令)

1. **停线举证采纳**:旧收据 15 键 vs 加列后 16 键的复现成立;⛔动搬迁批次边界由 HQ 就地放宽如下,射程仅此一条;
2. **改判:`sameRow` 加 schema 增列容忍**——比较时,**快照中缺席且当前值为 NULL 的列予以豁免**(schema 长列的默认 NULL ≠ 用户改动);**当前值非 NULL 则照旧判变拒撤**(用户已归层=目标确实变了,拒撤正确);⛔ 重写历史 receipt(收据不可篡);⛔ 其它比较规则放宽;
3. **回归两条**:①062 前收据+目标未归层→迁移后 undo 成功(用你已建的复现样本转正向);②062 前收据+目标已归层(layer_id 非 NULL)→undo 仍拒 tray_relocation_target_changed;
4. **续工:仅此修复+两回归+受影响 server 测试面重跑**,新 Result 追加于本补遗后;其余交付已验,⛔ 重做。
