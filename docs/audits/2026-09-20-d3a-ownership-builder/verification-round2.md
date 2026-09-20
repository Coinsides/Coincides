> **状态 (Status)**: active
> **层 (Layer)**: D3a 二轮验证收据
> **日期 (Updated)**: 2026-09-20

# 二轮验证：施工完成，服务端全量仍有环境阻塞

**非全绿，不是最终PASS。** 产品施工、TD-16指定环拆、两族契约闸和台账更新已完成。25个非git/secrets门组件全部PASS；server全量首次1092通过/3失败，随后修复本单授权签名变化触发的整段源码指纹并定向13/13通过；余2失败为当前Python/MinerU环境，不排除、不跳过、不改其测试。原始失败日志保留。

## 验证射程

- client全库：227文件，2319/2319通过；build通过（既有chunk体积提示，无失败）。
- server全库：提交109文件=82主集+27完整补集；显式含scripts/v13WildernessExecute.test.ts和新scripts/v14OwnershipContract.test.ts。命令为node ../scripts/run-server-test-suite.mjs --test-timeout=600000 --test-concurrency=4 <全部109文件>，前置pretest:v2检查/复制manifest。文件预算600s，零路径/标题排除，零自动重试。
- 首轮全量：1095项记账（含1个模块加载失败的文件级测试项），1092 pass /3 fail /0 cancelled /0 skipped /0 todo，100.524s。Python wiring文件在加载时失败，因此不能声称其内部测试已全部执行。
- 新两族契约：12/12；8个现物reader逐一验证完整行与普通查无。另TS checker + initDb(':memory:')/83迁移/PRAGMA证8族类型列完整：17/12/15/29/15/15/7/13，无漏列。ItemRow两个时间列既存string比SQL可空约束窄，未扩本单修改。
- agent族：全量清单含providers、agent-eval harness、AgentRouteLifecycle/WriteDoor/VerbTransfer/KnowledgeProjection、memory、claim、context、intent、episode、note-patch、ui-command等现役测试，失败清单无agent族；root test:agent-knowledge另外通过。无live eval/真实模型调用。
- 隔离：DB_PATH=:memory:；独立临时app-data/assets/blobs；空dotenv/Vite env；继承凭据变量移除。未触用户库。所有raw留.codex-tmp/d3a-ownership。

## 初次失败逐项处置

1. **v2NotesLifecycle源码锁（已解决）**：PUT handler唯一差异为getOwnedNote(noteId, req.userId!)→getOwnedNote(getDb(), req.userId!, noteId)。逆转此处后完整60行逐字节等于旧基线。期望hash从e01b1bec441fbbb2ddbea415c5627d01ee1abf26395bc46917ebb961c8e9c220机械更新为b904e32f0c7769b899383b6d5106fa065059c63d4e45eb3653afb851b96c470d，保留完整源码锁及所有行为断言；该文件复跑13/13 PASS。
2. **v2SourceMineruWiring环境（未解决）**：:59–61模块加载硬调python.exe，ENOENT。明确Python安装位置、命令发现/注册表只读调查未找到可访问解释器；uv目录访问被拒绝，未绕过。HQ提供可访问已装解释器后可仅前置本验证进程PATH复跑。
3. **v2SourceRegionCells环境（未解决）**：:40固定D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe，进程code101无法启动所指base；:128直接调该路径，:192/196清除命令替换并覆盖解释器env，因此不能仅用PATH/env替换。已知uv根权限拒绝，只能证当前不可用/不可访问，不能断言物理缺失。恢复仓外固定环境/访问权限由HQ处理。未安装新依赖、修改仓外venv、改测试跳过或仿造通过。

环境只读调查见raw python-environment-investigation.txt；初次失败对应raw round2-server-full.log；已解决锁见note-lifecycle-source-lock-review.txt与round2-notes-source-lock.log。**不把13项定向复跑拼成一次不存在的全量全绿结果。**

## runtime 门逐组件（27顶层中的非git/secrets 25）

按工单显式排除HQ两组件，未直接执行含这两项的整个npm入口。其余逐项执行，接线本身仍保留完整27项。

| 组件 | 结果 | raw log |
|---|---|---|
| npm run check:test-wiring | exit 0 | round2-gate-check-test-wiring.log |
| npm run test:agent-knowledge | tests=29, pass=29, fail=0, cancelled=0, skipped=0, todo=0 | round2-gate-test-agent-knowledge.log |
| npm run check:agent-knowledge | exit 0 | round2-gate-check-agent-knowledge.log |
| npm run check:tech-debt-table | exit 0 | round2-gate-check-tech-debt-table.log |
| npm run test:unit | 227 files / 2319 tests PASS | round2-client.log |
| npm run test:tool-face-registry | tests=5, pass=5, fail=0, cancelled=0, skipped=0, todo=0 | round2-gate-test-tool-face-registry.log |
| npm run test:tool-face-manifest | tests=10, pass=10, fail=0, cancelled=0, skipped=0, todo=0 | round2-gate-test-tool-face-manifest.log |
| npm run check:tool-face-manifest | exit 0 | round2-gate-check-tool-face-manifest.log |
| npm run test:tool-face-parity | tests=10, pass=10, fail=0, cancelled=0, skipped=0, todo=0 | round2-gate-test-tool-face-parity.log |
| npm run check:tool-face-parity | exit 0 | round2-gate-check-tool-face-parity.log |
| npm run check:server-shared-runtime-import | exit 0 | round2-gate-check-server-shared-runtime-import.log |
| npm run check:owned-helper-contract | exit 0 | round2-gate-check-owned-helper-contract.log |
| npm run test:owned-helper-contract | tests=12, pass=12, fail=0, cancelled=0, skipped=0, todo=0 | round2-gate-test-owned-helper-contract.log |
| npm run check:canvas-runtime-boundary | exit 0 | round2-gate-check-canvas-runtime-boundary.log |
| npm run check:group-gallery-shell | exit 0 | round2-gate-check-group-gallery-shell.log |
| npm run check:groups-rail-shell | exit 0 | round2-gate-check-groups-rail-shell.log |
| npm run check:single-editor-shell | exit 0 | round2-gate-check-single-editor-shell.log |
| npm run check:source-experience | exit 0 | round2-gate-check-source-experience.log |
| npm run check:v2-bn11-legacy-shutdown | exit 0 | round2-gate-check-v2-bn11-legacy-shutdown.log |
| npm run check:v2-bn11-relation-freshness | exit 0 | round2-gate-check-v2-bn11-relation-freshness.log |
| npm run smoke:canvas-engine-model-contract | exit 0 | round2-gate-smoke-canvas-engine-model-contract.log |
| npm run build:client | exit 0 | round2-client-build.log |
| npm run build | exit 0 | round2-gate-build.log |
| npm run smoke:canvas-engine-performance | exit 0 | round2-gate-smoke-canvas-engine-performance.log |
| npm run docs:check | exit 0 | round2-gate-docs-check.log |

HQ保留：git diff --check、npm run check:changed-file-secrets，均未执行。

## 完整补集（27文件）

- `scripts/agent-eval/harness.test.ts`
- `scripts/v13WildernessExecute.test.ts`
- `scripts/v13WildernessShadowRun.test.ts`
- `scripts/v14OwnershipContract.test.ts`
- `scripts/v2Bn12LifecycleMigration.test.ts`
- `src/__tests__/v13BoardCeremonyNote.test.ts`
- `src/__tests__/v13BoardIdentity.test.ts`
- `src/__tests__/v13BoardRoutes.test.ts`
- `src/__tests__/v13BoardSchema.test.ts`
- `src/__tests__/v13BoardServices.test.ts`
- `src/__tests__/v13BoardWave1.test.ts`
- `src/__tests__/v13CoordinateContract.test.ts`
- `src/__tests__/v13ItemFloor.test.ts`
- `src/__tests__/v13RecordedAction.test.ts`
- `src/__tests__/v14AttentionContext.test.ts`
- `src/__tests__/v14BoardSandbox.test.ts`
- `src/__tests__/v14EpisodeContext.test.ts`
- `src/__tests__/v14EpisodeStorage.test.ts`
- `src/__tests__/v14IntentRouter.test.ts`
- `src/__tests__/v14NotePatch.test.ts`
- `src/__tests__/v14UiCommands.test.ts`
- `src/__tests__/v2McpArtifact.test.ts`
- `src/__tests__/v2McpTransport.test.ts`
- `src/__tests__/v2NotesLifecycle.test.ts`
- `src/__tests__/v2NotesListService.test.ts`
- `src/__tests__/v2TrashNotesTool.test.ts`
- `src/toolFace/registry.test.ts`

全部109文件清单及预算见raw round2-server-file-list.json，首次整跑退出码1的收据见round2-server-full.json。
