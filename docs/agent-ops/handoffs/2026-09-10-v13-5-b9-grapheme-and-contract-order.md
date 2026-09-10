> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-10
> **上游**: B2 调查 TF-08(证据:selectionReceiptProjection.ts:19-25 slice 切片)+TF-09 契约整理子集;Henry 过夜清债令⑧收尾
> **单号**: 13.5 · B9 · 字素安全切片(TF-08)+ TextFlow 契约冻结子集(TF-09)

# 13.5 B9 · 切片与契约

## 一 · TF-08 字素安全切片

**坐标裁定(HQ 已拍,⛔复议)**:**存储坐标单位=UTF-16 offset 保持不变**(兼容全部既有锚,⛔数据迁移);**交互与切片=字素簇(grapheme cluster)边界**——

1. **摘录切片字素安全**:offset 落在代理对/组合簇(ZWJ emoji/组合变音)内部时,摘录**扩到包含完整簇**,⛔切裂字符;builder 侦察申报全部切片点(selection receipt/板范围 excerpt/annotation excerpt/复制拼接等)统一处理;
2. **选区与光标字素吸附**:B5/B6 的 offset 产生点(方向键/Shift 延伸/点击命中)吸附字素边界(Shift+→ 一步跨过整个 emoji);
3. 纯 ASCII/CJK 单码点路径行为逐字节不变;
4. 实现建议 `Intl.Segmenter`(grapheme 粒度,现代运行时内建);⛔引第三方分词库。

## 二 · TF-09 契约冻结子集(文档工作)

- `docs/contracts/TextFlow-Contract.md` 从 draft 推进:**照现物写实**——units/roles/inline 字段现状语义 + B4-B8 新立行为(历史封组规则/原子保存与 revision/inline 生命周期与降级/文档级选区模型/字素切片口径);
- **⛔发明新语义⛔写富样式**(候裁);状态头按文档系统规范(状态/层/日期/权威);与代码现物一致性自查申报。

## 三 · 验证(单内纪律)

- typecheck + build 全绿;client 全库整跑⛔过滤;
- 冒烟五条:①代理对 emoji/ZWJ 序列/组合变音在摘录切片不被切裂(修前断言现状红:slice 切裂);②Shift+→ 一步跨整 emoji,光标不落簇内;③纯 ASCII/CJK 既有路径行为逐字节不变;④B4-B8 全回归+全库;⑤契约文档 docs 检查过+现物一致自查申报。

## 四 · Result 格式

`## Result`:切片点侦察申报 + numstat + 五冒烟逐条 + 未做 + 停线;**⛔ commit**;⛔ 读 .env;⛔ key 出境;⛔ 用户库接触;⛔ 安全类测试(既有套件整跑⛔过滤;凭据扫描留 HQ)。
