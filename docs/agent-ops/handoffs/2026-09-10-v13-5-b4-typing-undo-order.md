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
