> **状态 (Status)**: recorded
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-21
> **范围 (Scope)**: T1 目录组件测试与 builder 内只读交叉检查；非独立 reviewer 判定

# 目录组件定向验证

`client/src/pages/Notes/canvasEngine/blocks/TocBlockProjection.test.tsx`：**1 文件、9/9 测试通过、0 失败**，Vitest duration 1.05s。执行命令（`client/`）：

```text
npm.cmd run test:unit -- --reporter=verbose src/pages/Notes/canvasEngine/blocks/TocBlockProjection.test.tsx
```

原始日志 `.codex-tmp/t1-toc/toc-projection-unit-final.log`。

| 验证 | 用例行号 | 结论 |
|---|---|---|
| 层级缩进、条目、共享导航回调身份、零正文编辑框 | `TocBlockProjection.test.tsx:27` | PASS |
| draft 标题/层级变化即时反映、恢复正文移出目录、原 blocks 不改 | `TocBlockProjection.test.tsx:49` | PASS |
| 空章树占位与未命名章兜底 | `TocBlockProjection.test.tsx:69` | PASS |
| 打印静态页码、页码更新、无交互控件、agenda 不改 | `TocBlockProjection.test.tsx:80` | PASS；页码来源在主 builder 集成测试单验 |
| default / quiet-ink / warm-paper / workbench / silk | `TocBlockProjection.test.tsx:98` | 5/5 PASS；要求的 token 引用存在性级，未用截图 |

皮肤断言同时检查 CSS 中 ink / ink-muted / accent / titleFont / labelFont / document typography 的引用与各皮肤提供的变量；CSS 无字面 hex、无字面长度、字体声明只指向角色 token。层级缩进读现役 `TYPOGRAPHY_UNIT_INDENT_PX`。

两次先行测试的原始日志仍保留：`toc-projection-unit.log`（用例误用不能在 runtime resolve 的 `@shared/types/skin` alias，未收集测试），`toc-projection-unit-fixed.log`（8/9；React 将数值零的 inline CSS 序列化为 `0` 而非 `0px`）。分别改为现役 `@shared/types` 入口和数值比较后，最终 9/9；未为上述用例适配改生产代码。

## 只读交叉检查反馈

已向主 builder 报告两项具体缺口，由主 builder 处理及复验，本文只记录发现时证据：

1. `BlockEditorLayer.tsx` 的 `bodyReadOnly` 与 `onInsertTextUnitBelow` 原排除集未含 toc；选中目录可能暴露正文保存/插入 TextUnit 入口。现役 `supportsTextFlowBlockNavigation` 已用块型白名单拒绝 toc，无须扩它。
2. 初版 `tocPageNumbers` 仅按 frame 索引编号，而现役 `getPagePrintSlices(frame, continuousWeb)` 会把一张 Web 长纸拆成多张物理页；需要同源累计 slice 并读取章节所在 slice，否则长纸后段章节和后续 frame 编号会偏小。

其他已核点：阅读目录 Provider 消费与导航窗格同一章投影和 `selectChapter`；折叠后的跳转沿已有 reveal / pending chapter / heading anchor 通道。打印 Provider 单独消费完整投影数据，不复用屏幕折叠状态。具体真实滚动、完整打印 plan 与导出 HTML 由主 builder 的集成证据收口。
