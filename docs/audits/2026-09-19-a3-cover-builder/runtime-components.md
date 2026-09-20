> **状态 (Status)**: evidence
> **范围**: `verify:v2-bn8-runtime` 的非 git/secrets 23 组件；完整门未执行。

最近一轮逐项结果：**23/23 PASS**。git 检查和 secrets 扫描留 HQ。

| # | 组件 | 最近退出码 | 结果 | 原始日志 |
|---|---|---:|---|---|
| 1 | `check:test-wiring` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-01-check-test-wiring-2.log) |
| 2 | `test:agent-knowledge` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-02-test-agent-knowledge-1.log) |
| 3 | `check:agent-knowledge` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-03-check-agent-knowledge-1.log) |
| 4 | `check:tech-debt-table` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-04-check-tech-debt-table-1.log) |
| 5 | `test:unit` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-05-test-unit-3.log) |
| 6 | `test:tool-face-registry` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-06-test-tool-face-registry-1.log) |
| 7 | `test:tool-face-manifest` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-07-test-tool-face-manifest-1.log) |
| 8 | `check:tool-face-manifest` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-08-check-tool-face-manifest-1.log) |
| 9 | `test:tool-face-parity` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-09-test-tool-face-parity-1.log) |
| 10 | `check:tool-face-parity` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-10-check-tool-face-parity-1.log) |
| 11 | `check:server-shared-runtime-import` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-11-check-server-shared-runtime-import-3.log) |
| 12 | `check:canvas-runtime-boundary` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-12-check-canvas-runtime-boundary-2.log) |
| 13 | `check:group-gallery-shell` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-13-check-group-gallery-shell-1.log) |
| 14 | `check:groups-rail-shell` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-14-check-groups-rail-shell-1.log) |
| 15 | `check:single-editor-shell` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-15-check-single-editor-shell-1.log) |
| 16 | `check:source-experience` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-16-check-source-experience-1.log) |
| 17 | `check:v2-bn11-legacy-shutdown` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-17-check-v2-bn11-legacy-shutdown-1.log) |
| 18 | `check:v2-bn11-relation-freshness` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-18-check-v2-bn11-relation-freshness-1.log) |
| 19 | `smoke:canvas-engine-model-contract` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-19-smoke-canvas-engine-model-contract-1.log) |
| 20 | `build:client` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-20-build-client-3.log) |
| 21 | `build` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-21-build-3.log) |
| 22 | `smoke:canvas-engine-performance` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-22-smoke-canvas-engine-performance-1.log) |
| 23 | `docs:check` | 0 | PASS | [日志](../../../.codex-tmp/a3-cover/gate-23-docs-check-5.log) |

client 全库最近一轮：

- Test Files  193 passed (193)
- Tests  1940 passed (1940)

首轮与重试说明：

- client 默认并发首轮：193 文件、1933 项，17 项触及 5 秒超时，另 1 项未等到书签按钮。单 worker 复验整库，没有按用例类型排除，也没有调高超时。第二轮新增 1 项封面首图初始化 card 框测试；最终轮再增加 6 项题名/述名生命周期测试，验证当前封面聚焦，以及正文页或托盘内旧投影不阻挡重建封面添加。
- server shared 运行时导入首轮 4 处违规已在产品代码修复，静态门未改动。
- docs 检查先报 `docs/agent-ops/INDEX.md` 过期，生成后再报 `docs/generated/object-inventory.md` 过期；各次日志与退出码均保留。
- 最终 client/server 构建在默认 card 框接线、运行时导入和重建封面去重修复后重跑。
- 既有知识检查脚本本轮写出的 CLI 原始日志已复制到 `.codex-tmp/a3-cover/existing-script-logs/agent-knowledge/`。

[完整逐次结果 JSON](runtime-components.json)。原始日志均留 `.codex-tmp/a3-cover/`；server 全量测试由独立收据申报，不计入这里的 23 组件。
