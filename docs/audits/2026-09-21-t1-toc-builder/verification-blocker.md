> **状态 (Status)**: blocked（server 全量验收受当前 Python 执行权限阻断；未放行）
> **层 (Layer)**: 验证证据 / Audit Evidence
> **日期 (Updated)**: 2026-09-21
> **单号**: V14 收尾批 T1 目录块；Codex builder 验证子任务

# T1 server 全量验证阻断证据

**结论：server 全量未通过。** 已执行 110 个文件，1107 pass / 2 fail；两项失败分别为 Python 命令缺失和固定 MinerU runtime 的 Python 执行被拒绝。按用户“冲突停线举证”要求停止环境探测和重跑，保留原始失败。没有安装、替换或绕过 Python。

## 全量执行摘要

- 开始：2026-09-21T08:31:53.102Z；结束：2026-09-21T08:33:40.705Z。
- 外层耗时：107603 ms；Node 测试耗时：107205.1595 ms；退出码：1。
- 枚举根：server/src + server/scripts，递归所有 .test.ts，显式文件数组，110/110 文件已尝试，零排除。
- 文件预算：600000 ms；未使用 120 s 文件预算。
- 执行器：现役 scripts/run-server-test-suite.mjs；另加只收集事件的 Node reporter。
- Node：1109 tests；1107 pass；2 fail；0 cancelled；0 skipped；0 todo；flaky-retries=0。
- 具名测试数不代表失败文件中的全部预期用例数：v2SourceMineruWiring 在模块加载时失败，其内部具名用例未执行。
- 验证门非 git/secrets 的 25 组件由 root 另行记录；本文件不声称整个验证门通过。

## Agent、TOC 与 Wilderness

- Agent 族：既定 25 文件全部位于同一次全量，383/383 pass；0 fail / 0 skip，缺覆盖文件 0；未重复执行。
- T1 v14TocBlocks：6/6 pass。
- scripts/v13WildernessExecute.test.ts：27/27 pass；106617.4507 ms，600000 ms 文件预算，未超时。

| Agent 文件（server 相对） | tests | pass | fail | skip |
|---|---:|---:|---:|---:|
| scripts/agent-eval/harness.test.ts | 14 | 14 | 0 | 0 |
| src/__tests__/providerCredentials.test.ts | 5 | 5 | 0 | 0 |
| src/__tests__/v13AgentMemories.test.ts | 1 | 1 | 0 | 0 |
| src/__tests__/v14AgentKnowledgeProjection.test.ts | 9 | 9 | 0 | 0 |
| src/__tests__/v14AgentRouteLifecycle.test.ts | 10 | 10 | 0 | 0 |
| src/__tests__/v14AgentVerbTransfer.test.ts | 50 | 50 | 0 | 0 |
| src/__tests__/v14AgentWriteDoor.test.ts | 6 | 6 | 0 | 0 |
| src/__tests__/v14AttentionContext.test.ts | 6 | 6 | 0 | 0 |
| src/__tests__/v14ClaimObservation.test.ts | 14 | 14 | 0 | 0 |
| src/__tests__/v14ClaimReceipt.test.ts | 28 | 28 | 0 | 0 |
| src/__tests__/v14ContextHint.test.ts | 35 | 35 | 0 | 0 |
| src/__tests__/v14EpisodeContext.test.ts | 10 | 10 | 0 | 0 |
| src/__tests__/v14EpisodeStorage.test.ts | 6 | 6 | 0 | 0 |
| src/__tests__/v14IntentRouter.test.ts | 4 | 4 | 0 | 0 |
| src/__tests__/v14LoopRobustness.test.ts | 14 | 14 | 0 | 0 |
| src/__tests__/v14MemoryQuickwins.test.ts | 17 | 17 | 0 | 0 |
| src/__tests__/v14NotePatch.test.ts | 9 | 9 | 0 | 0 |
| src/__tests__/v14ProposalUnification.test.ts | 16 | 16 | 0 | 0 |
| src/__tests__/v14ReadTools.test.ts | 11 | 11 | 0 | 0 |
| src/__tests__/v14TurnIdentity.test.ts | 7 | 7 | 0 | 0 |
| src/__tests__/v14UiCommands.test.ts | 6 | 6 | 0 | 0 |
| src/__tests__/v2McpArtifact.test.ts | 2 | 2 | 0 | 0 |
| src/__tests__/v2McpTransport.test.ts | 49 | 49 | 0 | 0 |
| src/agent/providers/index.test.ts | 49 | 49 | 0 | 0 |
| src/toolFace/registry.test.ts | 5 | 5 | 0 | 0 |

## 两项失败与权限事实

1. server/src/__tests__/v2SourceMineruWiring.test.ts:60：模块导入时执行 execFileSync('python.exe', ...)；原始 server-all.log:61215 报 spawnSync python.exe ENOENT，:61238 文件 not ok，:61247 ERR_TEST_FAILURE。当前 PowerShell Get-Command python.exe -All 同样找不到命令。
2. server/src/__tests__/v2SourceRegionCells.test.ts:196：测试强制使用固定 D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe，覆盖外层 COINCIDES_MINERU_PYTHON。原始 server-all.log:62078 not ok；:62084 MinerU code 101，无法启动 uv CPython base；:62090 回到测试 parseSourceArtifact 调用。

固定 venv 的 pyvenv.cfg 指向 C:/Users/70208/AppData/Roaming/uv/python/cpython-3.12.11-windows-x86_64-none；venv launcher 和 base 文件均存在。对 base 仅执行 -B -c "import sys; print(sys.executable); print(sys.version)" 的只读启动探测，返回“程序 python.exe 无法运行: 拒绝访问”，ApplicationFailedException / NativeCommandFailed，exit 1。未执行外部库、未访问用户数据库。

uv.exe 可定位到 C:/Users/70208/.local/bin/uv.exe；发现权限拒绝后未用 uv、复制执行体、切换 shell 或其他运行时绕过。仅增加 PATH 不能解决固定 runtime 的拒绝，外层 runtime 环境变量也会被测试覆盖。此处保留环境阻断，未修测试、未删除/过滤/skip 用例，不能将 1107 pass 报成全量绿。

## 隔离与原始证据

- 继承环境使用 OS 必需项 allowlist，不打印环境；NODE_ENV=test；DB_PATH=:memory:；dotenv/Vite env 指空夹具；uploads/assets 指合成目录。
- COINCIDES_APP_DATA_DIR 为系统 tmp 下新建独立目录，目标核验后已清理；没有读真实凭据库、用户库或真实模型 API 调用。现有 MinerU 测试在本地 Python 启动前失败。
- 本次零 git 操作，未执行 secrets 扫描；未修改源码/依赖/外部 runtime。
- Node 附加 reporter 导致启动时 MaxListenersExceededWarning；它不是失败原因，不影响明确的 tests/fail 数字。

| 证据 | 路径 |
|---|---|
| 完整原始 stdout/stderr | .codex-tmp/t1-toc/server-all.log |
| 明确命令、隔离与110文件清单 | .codex-tmp/t1-toc/server-all-plan.json |
| 起止与退出码 | .codex-tmp/t1-toc/server-all-result.json |
| Node逐文件事件摘要、失败记录 | .codex-tmp/t1-toc/server-all-events.json |
| 全量、Agent25、Toc、Wilderness汇总 | .codex-tmp/t1-toc/server-all-summary.json |
| 只读环境定位文字记录 | .codex-tmp/t1-toc/server-environment-diagnosis.md |
| 原始运行helper | .codex-tmp/t1-toc/run-server-all.mjs |
| 附加reporter | .codex-tmp/t1-toc/server-all-reporter.mjs |

## 全部110文件结果

| 文件（server相对） | tests | pass | fail | skip | 时间ms |
|---|---:|---:|---:|---:|---:|
| scripts/agent-eval/harness.test.ts | 14 | 14 | 0 | 0 | 2827.4836 |
| scripts/v13WildernessExecute.test.ts | 27 | 27 | 0 | 0 | 106617.4507 |
| scripts/v13WildernessShadowRun.test.ts | 9 | 9 | 0 | 0 | 3117.7481 |
| scripts/v14OwnershipContract.test.ts | 12 | 12 | 0 | 0 | 94.7367 |
| scripts/v2Bn12LifecycleMigration.test.ts | 5 | 5 | 0 | 0 | 27.0513 |
| scripts/v2OperationBatchTimestampMigration.test.ts | 1 | 1 | 0 | 0 | 1729.0198 |
| src/__tests__/providerCredentials.test.ts | 5 | 5 | 0 | 0 | 670.4391 |
| src/__tests__/textFlowIdentityContract.test.ts | 4 | 4 | 0 | 0 | 4065.2206 |
| src/__tests__/v13AgentMemories.test.ts | 1 | 1 | 0 | 0 | 1089.3765 |
| src/__tests__/v13AtomicTextSave.test.ts | 26 | 26 | 0 | 0 | 16002.4202 |
| src/__tests__/v13AtomicTextSaveMigration.test.ts | 2 | 2 | 0 | 0 | 4382.4908 |
| src/__tests__/v13BoardCeremonyNote.test.ts | 3 | 3 | 0 | 0 | 2335.07 |
| src/__tests__/v13BoardChalk.test.ts | 4 | 4 | 0 | 0 | 2601.539 |
| src/__tests__/v13BoardIdentity.test.ts | 10 | 10 | 0 | 0 | 6836.8029 |
| src/__tests__/v13BoardRoutes.test.ts | 2 | 2 | 0 | 0 | 1836.4724 |
| src/__tests__/v13BoardSchema.test.ts | 4 | 4 | 0 | 0 | 2841.7976 |
| src/__tests__/v13BoardServices.test.ts | 4 | 4 | 0 | 0 | 2822.6255 |
| src/__tests__/v13BoardStaging.test.ts | 2 | 2 | 0 | 0 | 1922.695 |
| src/__tests__/v13BoardTextRanges.test.ts | 6 | 6 | 0 | 0 | 4472.5276 |
| src/__tests__/v13BoardTrayRelocation.test.ts | 9 | 9 | 0 | 0 | 5341.216 |
| src/__tests__/v13BoardViewportBookmarks.test.ts | 6 | 6 | 0 | 0 | 4725.8429 |
| src/__tests__/v13BoardWave1.test.ts | 7 | 7 | 0 | 0 | 1011.4587 |
| src/__tests__/v13CanvasRetirement.test.ts | 3 | 3 | 0 | 0 | 1084.4755 |
| src/__tests__/v13CoordinateContract.test.ts | 5 | 5 | 0 | 0 | 2385.821 |
| src/__tests__/v13EventsLedger.test.ts | 8 | 8 | 0 | 0 | 2597.4971 |
| src/__tests__/v13GraphemeTextRanges.test.ts | 2 | 2 | 0 | 0 | 823.7099 |
| src/__tests__/v13ItemFloor.test.ts | 2 | 2 | 0 | 0 | 1035.8901 |
| src/__tests__/v13ItemRefBlocks.test.ts | 5 | 5 | 0 | 0 | 1006.1285 |
| src/__tests__/v13MediaBlocks.test.ts | 13 | 13 | 0 | 0 | 6129.4843 |
| src/__tests__/v13NoteMetadata.test.ts | 7 | 7 | 0 | 0 | 4437.7188 |
| src/__tests__/v13PagePresets.test.ts | 3 | 3 | 0 | 0 | 2410.0285 |
| src/__tests__/v13PaperInk.test.ts | 2 | 2 | 0 | 0 | 1967.2138 |
| src/__tests__/v13PaperSkin.test.ts | 6 | 6 | 0 | 0 | 7052.66 |
| src/__tests__/v13ProjectDeletionReferences.test.ts | 3 | 3 | 0 | 0 | 3020.4257 |
| src/__tests__/v13RecordedAction.test.ts | 2 | 2 | 0 | 0 | 19.8543 |
| src/__tests__/v13SourceProjectionRepair.test.ts | 10 | 10 | 0 | 0 | 3546.0391 |
| src/__tests__/v13SourceReprojection.test.ts | 8 | 8 | 0 | 0 | 4528.0117 |
| src/__tests__/v13Tray.test.ts | 4 | 4 | 0 | 0 | 1940.8199 |
| src/__tests__/v13TrayOrder.test.ts | 5 | 5 | 0 | 0 | 2663.0386 |
| src/__tests__/v13WallCollectionBatch.test.ts | 2 | 2 | 0 | 0 | 43.6907 |
| src/__tests__/v14AgentKnowledgeProjection.test.ts | 9 | 9 | 0 | 0 | 34.1063 |
| src/__tests__/v14AgentRouteLifecycle.test.ts | 10 | 10 | 0 | 0 | 5283.1471 |
| src/__tests__/v14AgentVerbTransfer.test.ts | 50 | 50 | 0 | 0 | 19594.8215 |
| src/__tests__/v14AgentWriteDoor.test.ts | 6 | 6 | 0 | 0 | 2961.6229 |
| src/__tests__/v14AttentionContext.test.ts | 6 | 6 | 0 | 0 | 3407.4199 |
| src/__tests__/v14BoardLayoutInspector.test.ts | 9 | 9 | 0 | 0 | 17.6902 |
| src/__tests__/v14BoardSandbox.test.ts | 15 | 15 | 0 | 0 | 7571.3629 |
| src/__tests__/v14BoardVisual.test.ts | 12 | 12 | 0 | 0 | 6689.0839 |
| src/__tests__/v14BoardVisualGeometry.test.ts | 19 | 19 | 0 | 0 | 41.9703 |
| src/__tests__/v14CardCover.test.ts | 4 | 4 | 0 | 0 | 2986.5606 |
| src/__tests__/v14ClaimObservation.test.ts | 14 | 14 | 0 | 0 | 93.4525 |
| src/__tests__/v14ClaimReceipt.test.ts | 28 | 28 | 0 | 0 | 9262.9187 |
| src/__tests__/v14ComponentBlocks.test.ts | 11 | 11 | 0 | 0 | 2335.6304 |
| src/__tests__/v14ContextHint.test.ts | 35 | 35 | 0 | 0 | 10071.1298 |
| src/__tests__/v14CoverPage.test.ts | 8 | 8 | 0 | 0 | 4486.7747 |
| src/__tests__/v14DeleteCeremony.test.ts | 16 | 16 | 0 | 0 | 8741.9846 |
| src/__tests__/v14EpisodeContext.test.ts | 10 | 10 | 0 | 0 | 4696.5586 |
| src/__tests__/v14EpisodeStorage.test.ts | 6 | 6 | 0 | 0 | 1800.7298 |
| src/__tests__/v14IntentRouter.test.ts | 4 | 4 | 0 | 0 | 1757.6322 |
| src/__tests__/v14LoopRobustness.test.ts | 14 | 14 | 0 | 0 | 6887.797 |
| src/__tests__/v14MemoryQuickwins.test.ts | 17 | 17 | 0 | 0 | 9634.7103 |
| src/__tests__/v14NoteBinding.test.ts | 6 | 6 | 0 | 0 | 2464.3811 |
| src/__tests__/v14NotePatch.test.ts | 9 | 9 | 0 | 0 | 5245.8125 |
| src/__tests__/v14PaletteColors.test.ts | 7 | 7 | 0 | 0 | 1027.1005 |
| src/__tests__/v14PaperFreedom.test.ts | 1 | 1 | 0 | 0 | 834.0594 |
| src/__tests__/v14ParagraphFurniture.test.ts | 4 | 4 | 0 | 0 | 5630.8834 |
| src/__tests__/v14ProposalUnification.test.ts | 16 | 16 | 0 | 0 | 9058.9944 |
| src/__tests__/v14ReadTools.test.ts | 11 | 11 | 0 | 0 | 8265.7938 |
| src/__tests__/v14SkinSuites.test.ts | 9 | 9 | 0 | 0 | 1013.9805 |
| src/__tests__/v14TableBlocks.test.ts | 9 | 9 | 0 | 0 | 2464.1908 |
| src/__tests__/v14TocBlocks.test.ts | 6 | 6 | 0 | 0 | 2415.337 |
| src/__tests__/v14TurnIdentity.test.ts | 7 | 7 | 0 | 0 | 1151.7225 |
| src/__tests__/v14UiCommands.test.ts | 6 | 6 | 0 | 0 | 2996.5364 |
| src/__tests__/v2BlockRestoreDoor.test.ts | 4 | 4 | 0 | 0 | 2300.566 |
| src/__tests__/v2CanvasPersistenceCutover.test.ts | 49 | 49 | 0 | 0 | 16845.9673 |
| src/__tests__/v2ContentGroups.test.ts | 12 | 12 | 0 | 0 | 7381.8492 |
| src/__tests__/v2DevQuickLogin.test.ts | 3 | 3 | 0 | 0 | 23521.6692 |
| src/__tests__/v2DocumentParserPdf.test.ts | 2 | 2 | 0 | 0 | 3147.3713 |
| src/__tests__/v2GroupFolders.test.ts | 8 | 8 | 0 | 0 | 5146.118 |
| src/__tests__/v2ImprintCitations.test.ts | 9 | 9 | 0 | 0 | 27.0722 |
| src/__tests__/v2ImprintEmbedding.test.ts | 7 | 7 | 0 | 0 | 83.9277 |
| src/__tests__/v2ImprintRetrieval.test.ts | 4 | 4 | 0 | 0 | 49.1642 |
| src/__tests__/v2ItemRelationFloor.test.ts | 8 | 8 | 0 | 0 | 7358.2177 |
| src/__tests__/v2Items.test.ts | 8 | 8 | 0 | 0 | 6129.785 |
| src/__tests__/v2MaterialLibrary.test.ts | 59 | 59 | 0 | 0 | 19623.2382 |
| src/__tests__/v2McpArtifact.test.ts | 2 | 2 | 0 | 0 | 5941.8351 |
| src/__tests__/v2McpTransport.test.ts | 49 | 49 | 0 | 0 | 18168.0315 |
| src/__tests__/v2NoteBlockLifecycle.test.ts | 25 | 25 | 0 | 0 | 10929.6544 |
| src/__tests__/v2NoteFoundation.test.ts | 3 | 3 | 0 | 0 | 2307.0213 |
| src/__tests__/v2NotesLifecycle.test.ts | 13 | 13 | 0 | 0 | 6249.1948 |
| src/__tests__/v2NotesListService.test.ts | 7 | 7 | 0 | 0 | 10923.0281 |
| src/__tests__/v2Purposes.test.ts | 6 | 6 | 0 | 0 | 41.2701 |
| src/__tests__/v2RelationLifecycleClosure.test.ts | 4 | 4 | 0 | 0 | 2813.4903 |
| src/__tests__/v2Relations.test.ts | 8 | 8 | 0 | 0 | 4503.1961 |
| src/__tests__/v2SourceContainerIntake.test.ts | 14 | 14 | 0 | 0 | 5944.7674 |
| src/__tests__/v2SourceFileIntake.test.ts | 12 | 12 | 0 | 0 | 6990.7995 |
| src/__tests__/v2SourceIdentityFloor.test.ts | 7 | 7 | 0 | 0 | 4938.0395 |
| src/__tests__/v2SourceImprints.test.ts | 12 | 12 | 0 | 0 | 10234.7433 |
| src/__tests__/v2SourceLifecycleClosure.test.ts | 8 | 8 | 0 | 0 | 3912.0544 |
| src/__tests__/v2SourceMaterialization.test.ts | 11 | 11 | 0 | 0 | 5395.1651 |
| src/__tests__/v2SourceMineruWiring.test.ts | 1 | 0 | 1 | 0 | 文件加载失败 |
| src/__tests__/v2SourceNeverReject.test.ts | 9 | 9 | 0 | 0 | 4869.6213 |
| src/__tests__/v2SourceRegionCells.test.ts | 1 | 0 | 1 | 0 | 3268.792 |
| src/__tests__/v2SourceT0Alignment.test.ts | 10 | 10 | 0 | 0 | 3612.8001 |
| src/__tests__/v2SourceTranscriberFingerprint.test.ts | 7 | 7 | 0 | 0 | 2975.3322 |
| src/__tests__/v2TemplateStudioDecommission.test.ts | 1 | 1 | 0 | 0 | 1150.9894 |
| src/__tests__/v2TestV2ManifestHook.test.ts | 2 | 2 | 0 | 0 | 491.9137 |
| src/__tests__/v2TrashNotesTool.test.ts | 23 | 23 | 0 | 0 | 9187.5307 |
| src/agent/providers/index.test.ts | 49 | 49 | 0 | 0 | 237.3517 |
| src/toolFace/registry.test.ts | 5 | 5 | 0 | 0 | 27.8622 |
