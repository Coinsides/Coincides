> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-07(证据:textFlowService.ts:83-103,198-210 拆 flow 清空 inline;textUnitEditorService.ts:86-94,437-482 合并未重映射);Henry 过夜清债令⑦的安全子集(HQ 收口:⛔开插入命令⛔收编——F1 坐标契约候专场)
> **单号**: 13.5 · B8 · inline 生命周期加固(TF-07 安全子集)

# 13.5 B8 · inline 加固

**使命**:既有 inline 结构(inline_formula/inline_code 的 range 记录)在普通文本编辑与拆并手术中**存活**——⛔被清空⛔被错挂。**⛔解禁插入命令⛔formula/code 收编⛔F1 坐标裁定**(全候专场)。

## 零 · 裁定(⛔复议)

1. **拆分**:unit 拆分时,inline range 按 offset 归属落到对应新 unit,anchor_range 相应调整;骑跨拆分点的 inline→显式降级(沿既有 range 降级语义),⛔静默丢;
2. **合并**:inline 的 parent_text_unit_id 重映射到合并后 unit,offset 平移;冲突重命名同步;
3. **文本编辑**:inline anchor 前/后的插入删除→anchor 平移;触及 anchor 内部→降级⛔裁切出错误范围;
4. **undo/redo**:B4 的 flow 全量快照理应已覆盖 inline 字段——验证并补断言,缺则修;
5. ⛔改 inline 渲染/插入入口(命令保持禁用);⛔碰 formula/code 块型;⛔新 schema。

## 一 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①带 inline 的 unit 拆分→inline 归属新 unit、anchor 正确(修前断言现状红:被清空);②合并→parent 重映射+offset 平移(修前红:错挂/丢失);③anchor 前/后/内的插入删除→平移或显式降级;④undo/redo 恢复 inline 逐字段;⑤B4-B7 全回归+全库。

## 二 · Result 格式

`## Result`:numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
