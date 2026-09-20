> **状态 (Status)**: active
> **层 (Layer)**: Audit / C3 builder 验证考古
> **日期 (Updated)**: 2026-09-20
> **权威 (Authoritative)**: 否；工单与现役脚本为准

# C3 验证接线考古

施工依据为 `docs/agent-ops/handoffs/2026-09-20-v14-c3-episode-memory-order.md` §五。本文只记录验证面的考古结论；不是通过收据。

## 隔离与预算

本单 `run-validation.mjs` 从现役 C2 同名证据 runner 复制，仅替换工单路径、日志标识及定向选择中的 Episode 族。保留 OS 环境变量白名单、`:memory:` 数据库、空 dotenv / Vite env / credentials、独立 assets / uploads / temp；不继承 provider 凭据或 NODE_OPTIONS。不读取用户库、不运行 git 写操作、不运行 git/secrets 两门。

server 每个文件独立执行 `node ../scripts/run-server-test-suite.mjs --test-concurrency=1 --test-timeout=600000 <file>`；外层每文件预算 660000 ms，每 45 s 输出心跳。`v13WildernessExecute.test.ts` 不排除，不使用 120 s 超时。现役 wrapper 自带一次限定 IPC 反序列化错误的隔离重试，不能把普通断言失败改判通过。

先做 shared build、工具 manifest check/copy，再执行 server 测试。client 全库沿 `vitest run --maxWorkers=2`，不设置文件或测试过滤。脚本按最终文件系统动态发现全量 server `.test.ts`，不能将此考古时的计数当作交付计数。

## 命令

在仓库根运行以下本单入口，各模式输出日志到 `.codex-tmp/c3-episode/<run-id>/`，摘要写到本目录。`server-full` 与 `targeted` 为逐文件执行；`evals` 自动发现现役全部场景，并通过 worker 的 `scripted` 模式运行，无 live 模型调用。

```text
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs targeted
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs server-full
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs client-full
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs gates
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs typecheck
node docs/audits/2026-09-20-c3-episode-builder/run-validation.mjs evals
```

两个 C3 场景仍须分别断言：长会话 scripted 灌注→阈值触发→episode 与锚清单对账→原始消息零删→组装含摘要；旧 episode 经记忆检索命中且常驻包不含它。所有 C3 摘要测试均走确定性回退。

## 验证门口径

根 `package.json` 的 `verify:v2-bn8-runtime` 当前 25 组件，工单授权运行其中 **23 个非 git/secrets 组件**。本单 runner 从该字符串动态拆解并校验两个 HQ 项恰好各出现一次。不得直接将此结果报告为完整 runtime gate 通过。

保留的组件依原序为：`check:test-wiring`、`test:agent-knowledge`、`check:agent-knowledge`、`check:tech-debt-table`、`test:unit`、`test:tool-face-registry`、`test:tool-face-manifest`、`check:tool-face-manifest`、`test:tool-face-parity`、`check:tool-face-parity`、`check:server-shared-runtime-import`、`check:canvas-runtime-boundary`、`check:group-gallery-shell`、`check:groups-rail-shell`、`check:single-editor-shell`、`check:source-experience`、`check:v2-bn11-legacy-shutdown`、`check:v2-bn11-relation-freshness`、`smoke:canvas-engine-model-contract`、`build:client`、`build`、`smoke:canvas-engine-performance`、`docs:check`。

HQ 保留：`git diff --check`、`npm run check:changed-file-secrets`。验证门内部的只读 git 仍按工单允许，不删除或改写组件。

## 全量补集盘点

考古时 server/src + server/scripts 共 105 个测试文件，`server/package.json#test:v2` 仅列 82 个，补集为 23 个；施工新增文件后必须重新计数。逐文件 `server-full` 自动覆盖以下补集及主集，无排除：

```text
scripts/agent-eval/harness.test.ts
scripts/v13WildernessExecute.test.ts
scripts/v13WildernessShadowRun.test.ts
scripts/v2Bn12LifecycleMigration.test.ts
src/__tests__/v13BoardCeremonyNote.test.ts
src/__tests__/v13BoardIdentity.test.ts
src/__tests__/v13BoardRoutes.test.ts
src/__tests__/v13BoardSchema.test.ts
src/__tests__/v13BoardServices.test.ts
src/__tests__/v13BoardWave1.test.ts
src/__tests__/v13CoordinateContract.test.ts
src/__tests__/v13ItemFloor.test.ts
src/__tests__/v13RecordedAction.test.ts
src/__tests__/v14AttentionContext.test.ts
src/__tests__/v14BoardSandbox.test.ts
src/__tests__/v14IntentRouter.test.ts
src/__tests__/v14NotePatch.test.ts
src/__tests__/v2McpArtifact.test.ts
src/__tests__/v2McpTransport.test.ts
src/__tests__/v2NotesLifecycle.test.ts
src/__tests__/v2NotesListService.test.ts
src/__tests__/v2TrashNotesTool.test.ts
src/toolFace/registry.test.ts
```

## 检索义务与接线门

`app-operating-manual.md` §五（考古时第 100 行）为本单 episode 检索与能力边界说明书更新位置；现记忆纪律为第 120 行。说明书当前日期已为 2026-09-20。

完成说明书与读器接线后，仍按工单显式执行 `npm run check:agent-knowledge -- --update` 并保留日志。`scripts/check-agent-knowledge.ts` 的指纹事实只含注册工具名、效果组与 toolDefinitionNames，不含实现正文或描述；因此不新增工具的本单可能 hash 不变，仍履行显式更新义务。若事实变化，脚本会要求说明书版本/日期戳相应变化，`--update` 不绕过该检查。

新增 server `.test.ts` 必须以明确字面路径列入根或 server 的 package scripts。`server/scripts/check-test-wiring.mjs` 不接受 glob/变量作为接线证明。runner 的定向选择是回归便利；完整覆盖由 `server-full` 的动态全量清单证明。

## 本报告核验

已读工单、AGENT_CONTEXT、相关 current-state、方向宪章头、active ADR-0001；ADR 不另加本单验证门。新 runner 已通过 `node --check`。本考古报告最初生成时尚未启动测试；后续执行结果以本目录各 `*-summary.json` 与 `episode-evals.md` 为准。
