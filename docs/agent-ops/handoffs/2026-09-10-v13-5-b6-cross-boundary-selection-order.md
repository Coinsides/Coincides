> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-03(L 档,证据在案);B4(历史)/B5(穿行)为前序地基;Henry 过夜清债令
> **单号**: 13.5 · B6 · 跨 TextUnit 选择 + 跨 block 光标导航(TF-03)

# 13.5 B6 · 跨界选择与导航

**使命**:①同 block 内**跨 TextUnit 选择**(Shift 选区跨过 textarea 边界);②**跨 block 光标导航**(块尾穿行进下一文本块);③跨 block **选择**=尽力项,工程爆炸即停线拆单⛔硬吞。

## 零 · 规则(HQ 已拍;实现细节裁量申报)

1. **选区模型**:flow 内 (unit,offset)→(unit,offset) 起止对;渲染=自绘高亮层(跨 textarea 无原生选区,几何可复用 B5 的 mirror 测量;方案裁量申报);
2. **跨 unit 选择手势**:Shift+方向键越界延伸;Shift+Click 跨 unit 设定终点;点击/Esc/输入非 Shift 方向=清选区或按语义收敛;
3. **跨选区操作**:Ctrl/Cmd+C=拼接文本(unit 边界以换行连接);Delete/Backspace=删除选区并按既有 merge 语义并接;打字=替换(删+插);Ctrl/Cmd+X=复制+删除——**全部入 B4 历史为独立组,范围快照沿 B4 规则,undo 逐字段恢复**(含 unit 身份);
4. **跨 block 导航**:末 unit 末行 ↓/→ 进入下一**文本**块首 unit(B5 交互规则延伸,sticky column 沿用);顺序=Layout 阅读序(visibleBlocks 渲染序);**item_ref/投影/媒体/只读块跳过⛔停留⛔选入**;
5. **跨 block 选择**:若与现物(每块独立编辑器/历史作用域)冲突过大→交付①②④,③举证停线拆单;
6. **IME**:组字中⛔跨界选择与跨界操作(三重守卫沿用);
7. ⛔改 B4 历史语义⛔改 B5 单元内行为⛔动只读/投影块的可编辑性。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟六条:①Shift+↓/→ 跨 unit 选区正确延伸,高亮几何与文本一致,Ctrl+C 拼接正确(修前断言现状:选区停在边界);②跨选区打字=替换,undo 恢复原文与 unit 身份;③Delete 跨 unit 删除并接,undo/redo 逐字段;④跨 block 导航:块尾 ↓ 进下一文本块,item_ref/投影块跳过;⑤IME 组字中 Shift 方向不动选区;⑥B4 历史/B5 穿行/Enter-Backspace-Tab 全回归+全库整跑。

## 二 · Result 格式

`## Result`:numstat + 六冒烟逐条 + 裁量申报 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
