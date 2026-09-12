> **状态 (Status)**: active
> **层 (Layer)**: 审计证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否；B1d builder 的实现与机械验证记录，非主观放行

# B1d · 材质追样与表头比例

工单：[B1d](../../agent-ops/handoffs/2026-09-11-v13-5-b1d-material-polish-order.md)。裁定：[token spec §八](../../agent-ops/handoffs/plans/v13-5-b1-skin-token-spec.md#八--材质细则09-11-henry-真机反馈追样预设内部参数新用户-token)。最终交付、像素数字与来源限制见工单 `## Result`。

| 证据 | 内容与复跑 |
| --- | --- |
| [双列对照](browser/warm-paper-comparison-two-column.png) / [HTML](browser/comparison.html) | 左列按 §八原值复原 A 案参数；右列真实 React / HTTP / SQLite 合成笔记。原 Artifact 未在本仓找到，左列不是原图。 |
| [reference-a.html](reference-a.html) | 独立 CSS 参考：精确光晕、纸渐变、三影、装订影、墙线与表头链。正文沿用浏览器合成夹具，元数据简化。 |
| [browser-report.json](browser/browser-report.json) | 四预设表头与墙 idle/hover/drag、命中链、源块及 canvas persistence 前后比较。 |
| [pixel-regression.json](browser/pixel-regression.json) | 原始 PNG 解码、无缩放无容差的逐像素比较；全基线与现状、仅回拨表头的现状各一组。 |
| [browser/](browser/) | `serve.mjs` 启动共享一次性数据库与 5200/5202/5203 三个 Vite 服务；`smoke.mjs` 驱动隔离 Chrome；`pixel-regression.mjs` 解码 PNG。 |
| [baseline-source/](baseline-source/) / [baseline-manifest.json](baseline-manifest.json) | 改动前原件及 SHA256。Vite load 适配保留原模块 ID，避免路径变更改变 CSS module 身份。 |
| [sourceModes.mjs](browser/sourceModes.mjs) | 表头补偿只回拨表头组件/CSS/枚举字号和旧 title weight，保留所有当前材质代码；不会把整套旧材质替换回来冒充零差。 |
| [E1 复审](e1-recheck/README.md) / [summary.json](e1-recheck/summary.json) | 四皮浮层复审与 76 张截图；该 leaf 夹具不替代整页材质及持久化验证。 |
| [最终完整门日志](runtime-gate-final-material.log) / [命令收据](runtime-gate-final-material.json) | 最终材质修正后完整 runtime gate，exit 0；client 142 文件 / 1522 tests。更早 gate 日志仅为迭代记录。 |
| [文档收口](final-docs-check.log) | 追加 Result、更新工单状态并生成 INDEX 后，再验文档门。 |
| [请求普查](e1-recheck/request-census.md) | 全 client AST mock/import 图与新请求差集；无新增请求与请求 effect 变化。 |
| [product-changes.patch](product-changes.patch) / [inventory](product-change-inventory.json) | 14 个产品源码/现役测试改动的 diff 与 SHA256；`node capture-delivery.mjs` 生成，不写 Git index。 |

从仓库根启动浏览器证据服务：

```powershell
node --import ./server/node_modules/tsx/dist/loader.mjs docs/audits/2026-09-11-b1d-builder/browser/serve.mjs
node docs/audits/2026-09-11-b1d-builder/browser/smoke.mjs
node docs/audits/2026-09-11-b1d-builder/browser/pixel-regression.mjs
```

测试数据库和 Chrome profile 位于 `.codex-tmp/`（E1 profile 位于其被忽略的 `runtime-profiles/`），没有连接用户应用数据库。没有 commit、push、PR 或 Git index 写入。保留开工前已有的未跟踪文件。

## 来源与结论边界

原《纸的三种气质》在 `claude-log/2026-09-09.md` §93 记为 Artifact，且记载“临时预览件已清”；§114 记录 Henry 的右缘孤线反馈，未提供截图路径。已在仓内查找并向用户询问路径，未取得原件。因此双列图明确标为 §八参数复原；孤线结论限定于当前原实现的可复现机制，不把它冒称为 Henry 原截图的唯一确定根因。

原墙两侧静息 opacity 均为 0；右侧 12px 命中带可以在没有明显把手的情况下被 hover，只显出右线。新材质为两侧增加规定的常显绘制，左红右灰，保留原 hover/drag 线与事件语义。

## 验证中发现并修复的两处渲染回归

1. Chromium `scrollHeight` 的整数化/字形溢出把 40.8px 单行标题量成约 42px。按行数向上取整会凭空增加一行；现按最近完整行取整，并保留有边界的长内容编辑。
2. Chrome 不接受 `overflow-clip-margin: calc(...)`，将其计算为 0px；现由 JS 输出字面长度，仅暖纸扩至 `80 × scale`，其它皮维持原 `32 × scale`。此外，即便 opacity 为 0，生成的墙伪层仍会改变正文 LCD 抗锯齿；默认/静墨必须完全不生成材质伪层。`pseudo-probe-regression.json` 留有单因素零差证据。

本单未增加安全类测试。遵守既有总门；门内 `git diff --check` 为只读格式检查，`check:changed-file-secrets` 为已有静态扫描，未运行或扩写安全对抗套件。

最终数字：整页浏览器 41/41、E1 260/260、client 全库 1522/1522；默认/静墨各 2,592,000 像素在仅回拨表头后严格 0 差。原始显示差分别为 155,276 / 193,976，详见工单 Result 与 pixel-regression.json。
