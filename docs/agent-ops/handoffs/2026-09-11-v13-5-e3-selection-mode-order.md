> **状态 (Status)**: ready(候 E2 收口后派发)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-11
> **单号**: 13.5 · 波次 E3 · Selection 模式(默认态兼写兼选,墨水可选中)
> **上游**: 09-11 设计日会议记录 §三.2-.3(Henry 拍);现症=Write 模式选不中纸墨水笔画(C4 墨水只有整笔橡皮一条出路)

# E3 · Selection 模式

## 零 · 裁定原文

1. **默认态更名 Selection,兼写兼选**:点空白处=落笔写(现役 Write 行为零变),点对象=选中——把"写"从模式降格为默认态里的一个动作;
2. **墨水笔画升格为可选中对象**:Selection 态下点击 freehand 笔画→选中态视觉(描边/高亮,气质与块选中同族)→可**拖动移动**与 **Delete 键删除**;删除与移动入**现役纸面撤销栈**(机械闸:撤销覆盖不到的操作不许有);v1=单选,⛔框选多选(候后续);
3. **Pen/Eraser=临时工具**:用毕(完成一笔/一擦)⛔自动弹回——维持现役显式切换(Henry 只裁了"临时工具"定位,自动弹回体感待真机再裁,本单⛔做);
4. **三钮 icon 化**:Selection/Pen/Eraser 以 icon 呈现(lucide 现成:MousePointer2/Pen/Eraser 类),tooltip 带全名;Selection 为默认激活态;
5. 文本块/媒体块的现役点击语义零变(点块=进块编辑,不受本单影响)。

## 一 · 交付面

- 模式模型:Write→Selection 更名(状态值/持久化键若有存量,兼容申报);
- 墨水命中:笔画 hit-test(描边邻域容差,细线可点中)、选中态渲染、拖动(placement 移动,复用既有 canvas object 移动语法)、Delete 删除(走 C4 现役删除动词);
- 撤销:移动/删除各成撤销条目入现役栈,undo/redo 对称;
- 工具条:三钮 icon 化+tooltip;E1 的视图钮/⋯钮布局零变。

## 二 · 禁区

⛔框选/多选;⛔自动弹回;⛔动墨水数据 schema(freehand kind 现役);⛔TextFlow 面;⛔安全类测试;⛔碰 .git;⛔改权限配置。收口跑受影响秒级静态门。

## 三 · 验收

- typecheck+build 绿;定向绿+新增:hit-test 容差/选中态/拖动落库/删除入栈 undo-redo 用例;
- 冒烟(真浏览器):①Selection 态点空白打字正常(写行为零变);②点笔画→选中态显现;③拖动笔画→落库,undo 回原位;④Delete→笔画删,undo 复活;⑤Pen 画一笔后仍是 Pen(⛔自动弹回);⑥三钮 icon+tooltip;
- 证据落 `docs/audits/2026-09-11-e3-builder/`。

## 四 · 申报义务

Result 必含:交付清单+diff、hit-test 设计说明、撤销接线申报、冒烟证据、测试数字。冲突停线⛔自作主张。
