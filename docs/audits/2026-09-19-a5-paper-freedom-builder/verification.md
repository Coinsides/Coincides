> **状态 (Status)**: active
> **日期 (Updated)**: 2026-09-20
> **层 (Layer)**: 审计 / Builder 最终验证

# 最终验证口径

client 全库最终 **204 文件、2066/2066 通过**，命令 `npm.cmd --prefix client run test:unit -- --maxWorkers=4`，零排除，耗时176.98s。[原始日志](../../../.codex-tmp/a5-paper/client-full-final-4workers.log)

生产构建 `npm.cmd run build:client` 通过；server `npm.cmd run build` 通过。[client 构建](../../../.codex-tmp/a5-paper/client-build-final-closure.log)、[server 构建](../../../.codex-tmp/a5-paper/gate-build.log)

新增定向最终3文件28/28：`usePaperSize`17、`paperSizeEditService`5、`paperSizeReplay`6，包含真实共享历史、拖动反馈ref、原始auto布局、目标纸型排字覆盖、后建页/封面拓扑。另有纸型控件8项、核心几何15项、持久化11项及建纸入口18项，均包含于最终client全库，**不再加到2066之上**。[定向日志](../../../.codex-tmp/a5-paper/paper-target-typography-after.log)

## Runtime gate

根脚本共25组件。按工单 §四.4，实际执行并通过的是 **非 git/secrets 的23组件**；不是完整门通过。初轮20通过，client测试/构建与docs检查各有失败；修复与重试后按组件收口，未重跑无关已绿组件。全记录保留在 [初轮结果](../../../.codex-tmp/a5-paper/gate-results.json) 与 [最终逐组件结果](../../../.codex-tmp/a5-paper/gate-final-results.json)。

| 组件 | 最终结果 |
|---|---|
| check:test-wiring | pass |
| test:agent-knowledge | pass |
| check:agent-knowledge | pass |
| check:tech-debt-table | pass |
| test:unit | pass，204文件2066项，4 workers |
| test:tool-face-registry | pass |
| test:tool-face-manifest | pass |
| check:tool-face-manifest | pass |
| test:tool-face-parity | pass |
| check:tool-face-parity | pass |
| check:server-shared-runtime-import | pass |
| check:canvas-runtime-boundary | pass，末轮复跑 |
| check:group-gallery-shell | pass |
| check:groups-rail-shell | pass |
| check:single-editor-shell | pass |
| check:source-experience | pass |
| check:v2-bn11-legacy-shutdown | pass |
| check:v2-bn11-relation-freshness | pass |
| smoke:canvas-engine-model-contract | pass，末轮复跑 |
| build:client | pass，最终源码 |
| build（server） | pass |
| smoke:canvas-engine-performance | pass，末轮复跑 |
| docs:check | pass，生成INDEX后 |

**未运行** `git diff --check` 和 `check:changed-file-secrets`，两组件留HQ。只读git用于差异/范围检查；未执行git写操作。[受保护路径只读检查](../../../.codex-tmp/a5-paper/protected-scope-check.log)

## 中间失败与最终边界

初轮与后续高并发全库出现既有 `BoardPage.bookmarks` 找按钮超时，初轮另有 `BoardPage.smoke` 5秒超时；期间全库2061/2061及2062/2062也通过。最终固定4 workers执行全部2066项通过，没有改这些超时断言或延长测试时限。原日志 `gate-test-unit.log`、`client-full-release.log` 保留。

初轮client构建失败为新增测试类型诊断，已修；最终tsc和生产构建通过。初轮docs检查指出索引过期，运行既有生成器后通过；`docs/agent-ops/INDEX.md`包含当下A4状态与本单状态的自动投影，没有改其他工单正文。

Server全量执行与本门是不同口径：98文件全部执行，但仍有两项Python/MinerU环境失败，不能宣称server全绿；见 [专门回执](server-verification.md)。浏览器证据与未覆盖的实机场景见 [浏览器记录](browser-verification.md)。放行权仍在HQ。
