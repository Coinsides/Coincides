> **状态 (Status)**: ready
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
