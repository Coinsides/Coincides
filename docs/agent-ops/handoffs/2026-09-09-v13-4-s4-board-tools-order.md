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
