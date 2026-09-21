> **状态 (Status)**: stopped — validation blocked
> **日期 (Updated)**: 2026-09-21
> **范围**: V14 T1 目录块 builder 实现、验证与停线收据；非放行。

# T1 builder 证据

实现已落，验收未收口。完整各节结论、逐点行号、出生公约与未做项已追加到[工单 Result](../../agent-ops/handoffs/2026-09-21-v14-t1-toc-block-order.md#result)。

- client：229 文件，2339/2339 PASS。
- server：110 文件零排除，1109 tests，1107 PASS / 2 FAIL；Agent 25 文件 383/383 PASS、Wilderness 27/27 PASS 均已包含其中。两红为现役 Python/MinerU 启动环境，权限拒绝后停线。
- verify：非 git/secrets 25 组件，24 PASS / 1 FAIL（docs 索引过期）；两组件仍留 HQ。

| 证据 | 内容 |
|---|---|
| [insert-entry-evidence.md](insert-entry-evidence.md) | 同词双入口、原 22 slash 对象不变、92/92 定向 |
| [projection-component-evidence.md](projection-component-evidence.md) | 目录渲染/动态/空态/静态页码/五皮肤，9/9 |
| [server-evidence.md](server-evidence.md) | 空载荷生命周期、read_note flat、6/6 与相邻70/70 |
| [verification-blocker.md](verification-blocker.md) | 服务端两红的精确失败与执行权限冲突 |
| [validation-summary.json](validation-summary.json) | 全库/Agent/验证门机器数字；集合有包含关系 |
| [source-manifest.json](source-manifest.json) | 31 个源码、测试与package文件 SHA-256 |

原始日志全部保留在 `.codex-tmp/t1-toc/`。`tracked-source.diff` 保存已有跟踪源码差异；新增源码列表由 manifest 补足。没有运行 git 写操作或 secrets 扫描。

交叉检查的两项实现遗漏已在最终 client 全库前修复：TOC 的正文工具栏排除（BlockEditorLayer:540/546）、Web 打印切片页号（tocProjectionService:20/39）。源码在停线后没有继续修改。停线后的唯一写入是证据与工单 Result。
