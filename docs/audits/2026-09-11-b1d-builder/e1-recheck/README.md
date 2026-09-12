> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；B1d builder 验证记录

# B1d E1 四预设复审

结果：**PASS，260 / 260 断言**。Chrome/152.0.7977.83，真实 headless Chrome + CDP，1280 × 960 / DPR 1。四个预设各使用独立的合成 profile；没有连接用户的 Chrome profile，也没有后端或数据库。

最终复跑收口：**2026-09-12 04:14 UTC**。本目录四皮截图、报告、汇总与请求普查已全部重生，覆盖表头整行高度 `Math.round` 修正及暖纸 `overflowClipMargin` 数值长度修正后的最终产品树；各产品文件 SHA-256 见 `changed-request-check.json`。抽看默认 Metadata 可见新表头高度已生效。

| 预设 | 断言 | 浮层类 | 状态 | rest / hover 样本 | 嵌套边框 | 分隔线 | forced-hover 目标 | 浏览器 / console 错误 | 截图 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| default | 65 / 65 | 8 | 11 | 22 | 0 | 17 | 114 | 0 / 0 | 19 |
| quiet-ink | 65 / 65 | 8 | 11 | 22 | 0 | 17 | 114 | 0 / 0 | 19 |
| warm-paper | 65 / 65 | 8 | 11 | 22 | 0 | 17 | 114 | 0 / 0 | 19 |
| workbench | 65 / 65 | 8 | 11 | 22 | 0 | 17 | 114 | 0 / 0 | 19 |
| 合计 | 260 / 260 | 8 个唯一类 | 44 | 88 | 0 | 68 | 456 | 0 / 0 | 76 |

机器汇总：[summary.json](summary.json)。各预设子目录保留全部截图与逐断言、逐浮层 CSS 检查报告。抽看暖纸 More/部件样式、默认 Metadata 截图，浮层文字、分隔线、控制与焦点正常。

本审计覆盖 More、Info、Deleted blocks、Layout、Export preview、Delete confirmation、View options、Source snapshot 八类浮层；保留原 E1 的取消 / 确认、readonly / modal、视图切换、回调 ID、文字墨色、越界、rest / hover 内层装饰约束。它只证明真实产品组件的 UI 调度与浮层样式，`syntheticOnly: true`、`persistenceCoverage: false`。没有纸张容器的测试背景不作为暖纸整页材质或默认皮像素差证据；那些证据由本单主浏览器审计提供。

执行源码移植自 B1b E1，未复制旧结果；只改 B1d 标识、Vite 端口 5201、CDP 9392–9395 与隔离 profile 路径，审计逻辑保持原样。

复现（从仓库根，先启动服务，再分别执行四皮，最后汇总）：

```powershell
node docs/audits/2026-09-11-b1d-builder/e1-recheck/serve.mjs
node docs/audits/2026-09-11-b1d-builder/e1-recheck/smoke.mjs default
node docs/audits/2026-09-11-b1d-builder/e1-recheck/smoke.mjs quiet-ink
node docs/audits/2026-09-11-b1d-builder/e1-recheck/smoke.mjs warm-paper
node docs/audits/2026-09-11-b1d-builder/e1-recheck/smoke.mjs workbench
node docs/audits/2026-09-11-b1d-builder/e1-recheck/aggregate.mjs
```

挂载期请求全夹具普查见 [request-census.md](request-census.md)、[mock-census.json](mock-census.json) 与 [changed-request-check.json](changed-request-check.json)。当前 534 源文件 / 142 test 文件、46 API mocks 的 named-export 缺口为 0；本单比较中的新增直接 HTTP 与含 HTTP effect 变化均为 0。

临时合成 profile 的删除命令被自动审批策略拒绝（`blocked by policy`），未绕过。`runtime-profiles/` 暂留并由此目录 `.gitignore` 排除；profile 只属于本次合成测试，浏览器进程已结束。
