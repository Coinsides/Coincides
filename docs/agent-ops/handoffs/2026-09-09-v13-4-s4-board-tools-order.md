> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-09
> **上游**: 13.4 段 plan 修订二波次四单 4;现物证据=单 0 侦察 §四(串行写队列可作栈落点/恢复两缺口:ID 契约+下板级联)+走查③口径(要什么工具做什么)
> **单号**: 13.4 单 4 · 板工具批(橡皮擦 / 板内撤回 / 多选框选)

# 13.4 单 4 · 板工具批

**使命**:板的三份契约补齐——所做皆可撤(板内 undo/redo)、所见皆可选(多选框选)、外加橡皮擦。

## 零 · HQ 已裁(⛔ 复议)

1. **橡皮擦=整笔擦除,只擦 freehand**:新工具档;复用既有透明 stroke 命中路径,pointer 扫过多笔=合成**一条**撤回命令;⛔ 路径切割引擎;搬迁 shape/image/table/connector 与成员⛔可擦(走删除);
2. **板内 undo/redo=useBoard 队列内命令栈**:覆盖面=**member 几何族**(move/resize/scale/z/pin)、**visual 几何**(move/resize,单 A 已通)、**pen 创建**、**edge**(create/delete/label/direction)、**visual 删除**(含橡皮批)、**chalk**(创建/编辑/删除);**⛔ 含 mount/unmount**(事件面纠缠+级联恢复,候后声明);一次拖拽 end 记一条;失败不推进栈;新编辑清 redo;换板隔离;reload 清栈;80 条上限沿 usePlacementHistory 先例;输入框/弹窗内快捷键避让(弹窗打开时板键盘已让位,单 6 契约沿用);
3. **恢复 ID 契约=队列内活 ID 映射**(侦察缺口①):undo 删除→redo 重建换新 ID 时,栈内后续命令经映射表改指新 ID;⛔ 改 server create 契约(若举证映射不可行→停线);
4. **多选=Set+anchor**:select 工具**空白拖=框选 marquee**(命中 member/edge/visual/chalk),Shift 点选加减;**群拖移**(pinned 跳过并提示)、**群删**;⛔ 群组(group)概念⛔ 对齐分布(候 13.5);群拖=栈内一条;
5. **群删确认框**:选中含 member 时必弹,明示射程("N 张卡将移出名单(不可撤回)+M 件画物/连线(可撤回)");member unmount ⛔入栈,其余入栈;纯 visual/edge/chalk 群删可不弹直删(可撤);
6. ⛔ 动搬迁批次撤销(409 保护不绕);⛔ 新 event verb;⛔ 动纸内块栈。

## 一 · 交付面

- 工具档 UI(橡皮进工具条)+命中扫描;
- useBoard 命令栈(通用 command 条目+活 ID 映射)+Ctrl+Z/Y/Shift+Z 接线;
- marquee 框选(世界坐标矩形命中)+Shift 加减+群拖/群删+确认框;
- selectionBar 适配多选(计数+群动作;单选行为不变)。

## 二 · 裁量与停线

- 停线举证不改判;命令栈与既有串行队列的织合(排队中 undo 的时序)按现物裁量,乱序风险→停线;
- 单 6 弹窗打开时板栈快捷键让位契约不破(回归一条)。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;定向回归(Boards 全目录+modal/staging)不破;
- 冒烟六条:①画三笔→橡皮一手势擦两笔→Ctrl+Z 两笔全回(一条命令)→Ctrl+Y 再擦;②拖一卡→undo 回原位→redo 复位,重开板终态保持;③删一边(带 label)→undo 恢复 label/方向→redo;④undo 恢复被删画物→redo→再对它操作,活 ID 映射不指旧 ID(⛔ 404);⑤框选三对象群拖(含一 pinned 被跳过提示),undo 一步全回;Shift 点选加减正确;⑥群删混合选区弹确认明示两类射程,执行后 visual/edge 可 undo 回、member 不复挂(名单除名有 unmounted 账)。

## 四 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 未做清单 + 停线事项;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件按 09-08 口径整跑,⛔ name-pattern 过滤;凭据扫描留 HQ)。

## Result

2026-09-09 · Codex builder · **停线，未完成**。保留工单 `ready`，未翻为 `done`。完整阅读本单、现物侦察 §四及开工权威材料后，在产品接线前发现下述不可同时满足的契约；停止施工，未自行改判。停线消息送达前并行生成的未接线辅助文件 `boardSelection.ts` 已移除，最终没有产品代码变更。

### 停线事项：混删成员与其端点连线，连线无法按承诺恢复

最小反例：板上有成员 A、B 和连线 E(A→B)，框选 `{A,E}` 后确认群删。按 §零.5 与冒烟⑥，A 移出名单且不可撤回，E 则应可撤回恢复。

现物证据（源码静态核对，未访问数据库或调用 API）：

- `server/src/services/boards.ts:344` 的 `unmountBoardMember` 在 `:351` 删除成员行；`:350` 明示端点边随外键级联删除。
- `server/src/db/migrations/057_v13_boards.ts:54`、`:55`：两端均是指向 `board_members(board_id, id)` 的外键，带 `ON DELETE CASCADE`。
- `server/src/validators/boards.ts:58`–`:63`：create edge 必须提供两个成员端点，严格 schema 没有脱离成员的边形态。
- `server/src/services/boards.ts:372` 在恢复创建前调用 `ensureEdgeMembers`；`:361` 在任一端点成员缺失时抛出 `404 board_edge_member_not_found`。

因此，无论先删 E 还是先下板 A，撤回时 A 都已不存在。队列内活 ID 映射可以追踪重建边的新 ID，却不能把已删除且禁止复挂的成员变成活端点；问题不是 UUID 变更或排队乱序。恢复 A 违反 mount/unmount 不入栈及冒烟⑥；将这类 E 改判为不可撤回、转成画物或改接别的端点，均改变 §零的范围或原边身份。本次均未实施。此反例不宣称普通 visual/edge 的活 ID 映射不可行；阻塞的是本单必须覆盖的混删组合。交 HQ 处理停线事项，Codex 不自行缩窄射程。

### numstat

`git diff --numstat`：`34  0  docs/agent-ops/handoffs/2026-09-09-v13-4-s4-board-tools-order.md`。产品代码、测试、配置最终差异：`0 added / 0 deleted`；仅追加本段回执。

### 六冒烟逐条

1. 三笔→一手势擦两笔→Ctrl+Z 全回→Ctrl+Y 再擦：**未执行**，产品施工已停。
2. 拖一卡→undo→redo→重开保持终态：**未执行**。
3. 删除带 label/方向的边→undo 恢复→redo：**未执行**。
4. 删除/恢复/redo 后继续操作，活 ID 不指旧 ID：**未执行**，未把普通 ID 映射误报为不可行。
5. 框选三对象、跳过 pinned 提示、群拖一步 undo、Shift 加减：**未执行**。
6. 混删确认两类射程、visual/edge 可恢复而 member 不复挂、unmounted 账：**未执行；静态反例阻塞**，所选边连接被删成员时无法履约；未以仅选无关联边的样本代替此组合。

### 未做与核对范围

未交付橡皮、命令栈或多选的部分实现；未运行 typecheck/build、Boards/modal/staging 回归或 `verify:v2-bn8-runtime`，不申报验证通过。完整门末项包含凭据扫描，本单继续遵守“凭据扫描留 HQ”，未运行该扫描。未设计/新增安全类测试，未用 name-pattern 过滤，未读 `.env`，未输出 key，未接触用户库、启动产品服务或操作外部账号；未 commit/push/PR/merge，未改 server create、搬迁批次撤销、纸内块栈或 agent 指令。开工已有未跟踪文件未读取、未改动。本次只核对源码证据与回执差异。

## 补遗一(HQ 裁定,2026-09-09:停线成立,群删分类修正,续工令)

1. **停线举证采纳**:§零.5 原分类确有契约矛盾——端点被同批删除的边无法恢复(FK 级联+ensureEdgeMembers 404 现物成立);
2. **改判:连坐归类**——群删时,**与被删成员相连的边随成员归入"不可撤回"类**(它们本就随级联消亡,与 13.3 以来单删成员的既有行为一致);只有两端成员都存活的独立边才入可撤回栈;
3. **确认框三类明示**:"N 张卡及其相连的 K 条连线将移出(不可撤回)+ M 件画物与独立连线(可撤回)"——K 按选区实算(含未选中但因端点被删而级联的边,数字要真);
4. **冒烟⑥改判**:混选 {成员 A、边 E(A→B)、一画物} 群删→确认框三类数字正确→执行后画物可 undo 恢复,A 与 E 不复原且 events 有 unmounted;独立边(两端存活)的删除可撤已由冒烟③覆盖,⛔ 另造;
5. 其余五裁不变;**续工:全单照做**,新 Result 追加于本补遗后(完工判据认新 Result+产品码 numstat,⛔ 认上方停线回执)。

## Result

2026-09-09 · Codex builder · **单 4 全部实施，工程验证通过；主观验收与放行留 HQ。** 已完整重读本单并按补遗一续工；上方停线回执及 HQ 裁定原文保留。本次没有新增停线事项。

### 交付

- 橡皮工具只擦 freehand 整笔；pointer capture 下沿扫过路径采样，使用现有透明 SVG stroke 的原生命中路径，一手势多笔删除只入一条命令。
- `useBoard` 串行队列内接入板内命令栈：member 几何（move/resize/scale/z/pin）、visual 几何、pen、edge 创建/删除/label/direction、visual 删除（含橡皮批）、chalk 创建/编辑/删除。一次拖动及群拖各一条，80 条上限，成功才推进，新增编辑清 redo，换板隔离、reload 清栈。同步保存已确认 detail，排队中的 undo 排在前项写入之后。
- 队列内逻辑对象到当前服务端 ID 的映射贯穿 create/delete/undo/redo；恢复对象换 ID 后，早先与后续命令均指向活 ID。没有修改 server create 契约。
- Set + anchor 多选：Select 空白拖动按世界坐标框选 member/edge/visual/chalk；Shift 点击加减，群拖跳过 pinned 并提示。边按实际线段与框相交判断，画物计入旋转后的范围。
- 群删按补遗一分类。N 是实选成员数，K 是这些成员全部相连边的去重数（包括未选中的级联边），M 是画物/chalk 与两端存活的独立边数；确认框明确前两类不可撤、后一类可撤。成员下板沿原接口级联，相关历史目标被清理；只将可撤部分组成一条命令。
- 输入框和弹窗内板快捷键让位。原生浏览器发现的混删弹窗关闭后焦点丢失已修复；关闭后回到板，立即 Ctrl+Z 生效。工具栏 Undo/Redo 同样将焦点交回板。保留原有单选、staging 与搬迁交互。

### numstat

工作树产品代码合计 **651 added / 124 deleted**。下列含新文件的完整行数；新增文件未 stage，不能只看默认 `git diff --numstat` 而漏算。

文档另含本回执及工单状态更新；`node scripts/docs-index.mjs` 生成的 `docs/agent-ops/INDEX.md` 仅同步本单 `ready → done`（1 added / 1 deleted）。

```text
257  87  client/src/pages/Boards/BoardPage.tsx
2     2  client/src/pages/Boards/BoardRelocatedVisual.tsx
2     0  client/src/pages/Boards/Boards.module.css
66   35  client/src/pages/Boards/useBoard.ts
249   0  client/src/pages/Boards/boardCommandHistory.ts                 (new)
75    0  client/src/pages/Boards/boardSelection.ts                      (new)
```

测试合计 **501 added / 2 deleted**；浏览器夹具与说明 **204 added / 0 deleted**：

```text
33    0  client/src/pages/Boards/BoardPage.modal.test.tsx
5     2  client/src/pages/Boards/BoardPage.smoke.test.tsx
211   0  client/src/pages/Boards/BoardPage.tools.test.tsx                (new)
252   0  client/src/pages/Boards/useBoard.history.test.tsx               (new)
13    0  client/scripts/boardToolsSmoke/README.md                       (new)
35    0  client/scripts/boardToolsSmoke/fixture.tsx                     (new)
3     0  client/scripts/boardToolsSmoke/index.html                      (new)
117   0  client/scripts/boardToolsSmoke/mockApi.ts                      (new)
36    0  client/scripts/boardToolsSmoke/start.mjs                       (new)
```

既有 smoke 用例仅跟随两处实际契约调整：空白平移明确选择 Pan；队列几何请求断言改为只发送变化字段，同时保留并补足最终完整几何断言。未删用例、未使用 name-pattern 过滤。

### 六冒烟逐条

以下六条均完成 **Chrome 原生交互 + 自动化工作流测试**。浏览器夹具加载生产 `BoardPage`、`useBoard`、`boardRepository`，API 替换为内存 transport；`envFile: false`，不启动应用后端、不接触用户数据库。重开板验证的是内存 transport 保存后的重新挂载；实际服务端行为另由既有隔离路由套件验证。复跑入口见 `client/scripts/boardToolsSmoke/README.md`。

1. **通过**：画三笔，橡皮一个连续手势擦两笔；第三笔保留，Ctrl+Z 一次两笔全回，Ctrl+Y 再擦两笔。Chrome 使用原生 `getScreenCTM` / `isPointInStroke`，不依赖 jsdom 替身。
2. **通过**：单卡拖动，undo 回原位、redo 回终位；重开板仍在保存终位且撤回栈为空。原生样本 B 从 `(480,80)` 到 `(560,130)`，重开保持后者。
3. **通过**：删两端均存活且有 label/方向的独立边；undo 以新 ID 恢复 label 与箭头方向，redo 再删，其余边不受影响。自动化另覆盖双向箭头。
4. **通过**：删除画物后 undo/redo/undo，恢复 ID 连续变化；继续拖动保存并再 undo/redo，命令使用当前 ID，无旧 ID 请求/404。Chrome 中 `visual-7 → visual-8 → visual-9` 后拖动仍成功。
5. **通过**：框选三对象（普通卡、pinned 卡、chalk），群拖只移动可动对象，显示跳过 1 个 pinned；undo 一步恢复整体。Shift 点击 pinned 对象使计数 `3 → 2 → 3`。
6. **通过，按补遗改判**：混选 A、E(A→B)、一画物，另有未选中的 C→A。确认框实算 `N=1 / K=2 / M=1`；执行后 A 与两条相连边消失；立即 Ctrl+Z 只恢复画物，A/E 均不复挂。夹具写入记录只有 member DELETE、visual DELETE/POST，无 member POST。夹具的 `unmounted` 是模拟记录；真实 FK 级联及 `unmounted` 记账由既有 `server/src/__tests__/v13BoardRoutes.test.ts` 整文件实跑证明。

### typecheck / build / 定向回归

验证命令经既有 `scripts/run-isolated-coordinate-validation.mjs` 包装执行，使用空 Vite envDir、内存数据库及合成资源。所有选中的既有测试文件/套件均整跑，没有测试名过滤。

- 最终客户端全套 `npm run test:unit`：**80 文件，693/693**。Boards 全目录加外部 staging hook：**17 文件，128/128**；最终焦点修复后 tools/smoke/modal 三文件 **25/25**，随后客户端全套再次通过。
- 新六工作流 **6/6**；history 新八例与既有 useBoard 八例合计 **16/16**，覆盖排队中撤回、全部几何字段、活 ID、80 条、换板/reload、失败不推进及批量失败补偿。modal 整文件 **8/8**，使用非空 undo/redo 栈验证弹窗让位。
- `npm run build:client`（含 `tsc -b`、Vite）与 `npm run build`（含 server `tsc`）均 **exit 0**；最终焦点修改后重新跑客户端构建通过。
- 服务端既有 `test:v13-boards` **25/25**；staging、tray relocation、visual manipulation 三个既有文件完整运行 **9/9**。未增加或修改服务端测试。
- runtime 其余组成项均 **exit 0**：`test:tool-face-registry`（5/5）、`test:tool-face-manifest`（10/10）、`check:tool-face-manifest`、`test:tool-face-parity`（10/10）、`check:tool-face-parity`、`check:server-shared-runtime-import`、`check:canvas-runtime-boundary`、`check:group-gallery-shell`、`check:groups-rail-shell`、`check:single-editor-shell`、`check:source-experience`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`smoke:canvas-engine-model-contract`、`smoke:canvas-engine-performance`。
- 回执落盘后 `npm run docs:check` 与 `git diff --check` 通过。
- 一次客户端测试与构建并行时，未改动的 Gallery 测试出现瞬时失败；该文件整跑 3/3、随后客户端全套单独重跑 693/693 通过。没有修改 Gallery 或过滤失败用例。

### 未做清单 / 停线事项

- **没有未完成的单 4 产品项，也无新的停线事项。** 每对象 HTTP 的可撤批量写采用已成功子项逆操作补偿；若补偿本身也失败，暴露错误与已确认状态，不承诺服务端原子事务。成员下板已成功的部分始终不可撤，不因后续请求失败而重新挂载。
- **凭据扫描留 HQ**：没有执行 `check:changed-file-secrets`；`verify:v2-bn8-runtime` 原命令包含该扫描，因此本次按组成项执行其余验证，**不宣称原命令完整通过**。主观验收、HQ 放行未代行。
- 未设计/新增安全类测试；未读 `.env`、未使 key 出境、未触碰用户数据库；未 commit/push/PR/merge。未改 server create、event verb、搬迁撤销/409 保护、纸内块栈或 agent 权限/操作指令。开工已存在的无关未跟踪文件保持原样。
