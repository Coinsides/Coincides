> **状态 (Status)**: active
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: 审计 / Builder 回执
> **工单**: [2026-09-19 A5 纸型自由化](../../agent-ops/handoffs/2026-09-19-v14-a5-paper-freedom-order.md)

# A5 纸型自由化 · Builder 交付

建纸流程固定 A4 纵向并撤下纸型选择；八种纸型与 cm/mm 尺寸调节进入笔记外观浮卡。整本换型、Layout 单页数值/拖调、恢复默认均接入现役保存事务与撤销栈。新页继承笔记默认；Web 长页保持独立的单帧生长路径。

- [实现与逐件行号、八预设几何/物理映射](implementation.md)
- [验证门与客户端最终结果](verification.md)
- [Server 98 文件全量执行及两项环境例外](server-verification.md)
- [真实浏览器验证](browser-verification.md)

收官复核修复了三处问题，并补正向功能回归：拖动预览回流后松手被判无变化；跨页换籍使用显示布局导致 auto 存储宽度被覆盖；A 系列切换 Letter/Legal 时保存事务沿用旧纸型排字度量。现路径分别保留拖动起点快照、使用真实 draft/存储布局、在事务内解析目标纸型度量并尊重用户排字覆盖。未改 A1 引擎或坐标契约。

说明书更新位于 [app-operating-manual.md §一](../../agent-ops/current-state/app-operating-manual.md#L23)。原始日志保留于 [`.codex-tmp/a5-paper/`](../../../.codex-tmp/a5-paper/)。早期失败、中止和重试日志保留，不覆盖最终记录。

未进行 git 写操作或 commit/push/PR；没有新增依赖、迁移、TextFlow 真相字段、Relation/Agent/写门/注册表改动或新安全对抗用例。工作树交 HQ；验证门中的 git 检查、secrets 扫描，以及主观验收与放行留 HQ。既有其他未跟踪文件未改动。
