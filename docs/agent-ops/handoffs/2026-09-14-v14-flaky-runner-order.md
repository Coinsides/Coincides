> **状态 (Status)**: done(HQ 机补验通过,2026-09-14)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 基建小单 · 材料库 IPC flaky 机械化
> **上游**: claude-log §150/§151/§155——`v2MaterialLibrary.test.ts` 在聚合跑中三次撞 Node 22 test-runner IPC 反序列化毛刺(`Unable to deserialize cloned data due to invalid or unsupported version.`,failureType=uncaughtException,文件级),隔离复跑三次均全绿。按"第二次重新发现=候机械化"律,第三次发作=过期,收进 runner。

# 材料库 IPC flaky 机械化小单

**性质**:`scripts/run-server-test-suite.mjs`(HQ 全量 runner)加**窄签名自动隔离复跑**。⛔通用重试机制⛔掩真红。

1. **触发条件(全部满足才触发)**:文件级失败+failureType=uncaughtException+error 文本精确匹配上述 IPC 签名——⛔放宽到任意 uncaughtException⛔匹配断言失败;
2. **动作**:该文件单独进程复跑**一次**;绿→计 pass,但**必须**在输出显著打印 flaky 警报行(文件名+签名+复跑结果),⛔静默吞;红→保持红,原样报;
3. **阳性对照(验收核心,§闸自己也要过阳性对照)**:定向测试两条——①合成 IPC 签名失败→复跑触发且警报行在;②真断言失败→**⛔触发复跑**,红照红;另附③复跑仍红→整体红;
4. 触发次数入 runner 汇总(如 `# flaky-retries 1`),供台账登记发作频率;
5. 验收:runner 定向+HQ 全量正常路径回归(全绿库跑一遍确认零行为变化);证据落 `docs/audits/2026-09-14-flaky-runner-builder/`(只放蒸馏件);
6. 禁区:⛔碰测试文件本体/测试机关/package scripts 语义(runner 内部实现自由);⛔碰 .git;⛔commit;⛔新依赖;合成凭据 ≤20。Result:触发条件行号+阳性对照证据+测试数字+未做项。冲突停线举证。

## Result

**Codex builder · 2026-09-14：实现与核心对照完成；正常全绿验收阻塞，停线，状态保留 ready。** 不将环境红项当成已完成验收，不修改或排除这些测试。

- **触发条件**：`scripts/run-server-test-suite.mjs:7,34`，结构化文件身份(name/file 同一路径、nesting=0、line/column=1) + `failureType=uncaughtException` + error message 精确等于完整 IPC 签名；另显式排除 `ERR_ASSERTION`。`:11,31` 独立 reporter 只在事件流完成后提供诊断，不解析 stdout。
- **一次性隔离与保红**：`:114,122` 每个候选文件独立进程最多复跑一次；`:119,125,127` 警报含文件/签名/复跑结果；`:133` 混合真实失败或取消不翻绿；`:143` 输出 `# flaky-retries N`。旧 Node 没有 summary 时保留原始退出码、红跑不恢复，避免引入正常绿跑误红。
- **核心阳性对照 3/3 PASS**：①实际损坏 V8 IPC 帧触发 Node FileTest 反序列化异常，复跑一次后 exit 0，`retry=PASS` 警报在；②原生 `assert.fail` 使用完全相同错误文本，仍 exit 1、零复跑；③每次都损坏 IPC 帧，复跑一次仍 exit 1、`retry=FAIL`，没有第三次执行。额外近似签名、用例级异常、混合断言、正常绿、缺 summary 绿/红共六条通过；最终 **9/9**，syntax check 通过。
- **真实聚合发作证据**：首轮直接调用现有 `test:v2` 的 runner/72 文件，初跑 **706 tests / 701 pass / 5 fail**，CanvasPersistenceCutover 与 MaterialLibrary 两文件真实命中 IPC，分别隔离 **49/49、59/59**；`flaky-retries 2`，恢复 2/2 后整体仍 exit 1。直接调用缺 `npm_execpath` 多出 manifest hook 断言红，此项是 builder 调用方式问题，已用正式 npm 入口纠正，原始证据保留。
- **正式回归及停线原因**：`server` 内 `npm run test:v2`（含原 pretest）为 **72 文件 / 740 tests / 738 pass / 2 fail / 0 cancelled/skipped/todo / flaky-retries 0 / exit 1**。`v2SourceMineruWiring.test.ts:60` 为 `python.exe ENOENT`，`v2SourceRegionCells.test.ts:203` 为 MinerU Python 启动失败(code 101)。这两项不符合 IPC 签名，未复跑；“全绿库跑一遍”未达，环境修复不在此单权限内。正式全量发生于最终缺 summary 兼容补丁前；该补丁后最终 9/9 定向验证，未宣称最终全量全绿。
- **证据**：[`README`](../../audits/2026-09-14-flaky-runner-builder/README.md)、[`summary.json`](../../audits/2026-09-14-flaky-runner-builder/summary.json) 仅蒸馏件。原始日志、夹具、控制脚本、进程身份与 runner 前后快照均在 `.codex-tmp/2026-09-14-flaky-runner-builder/`。
- **未做项**：Python/MinerU 环境修复、恢复后的全绿回归待 HQ；完整 `verify:v2-bn8-runtime` 含 git/secrets 尾门未调用。未运行 git、未读写 `.git`、未 commit；未改既有测试/测试机关/package scripts/权限文件；无新依赖，新造凭据 0。额外 CLI 筛选参数、覆盖率模式和旧 Node 二进制未实跑。CodeGraph 先行尝试不可用后回退限定读取。

## HQ 收口裁定(2026-09-14)

**停线成立且即此了结**:阻塞项(两 Python/MinerU 环境红)为 builder 沙箱环境性,按例留 HQ——HQ 机全量补验 **747/747 全绿,EXIT 0**,工单第 5 条「全绿库确认零行为变化」达成。补验中机关首次实战:`v2CanvasPersistenceCutover` 命中 IPC 签名(与历史三次发作的 MaterialLibrary 不同文件——签名域设计当场验证),自动隔离复跑 49/49,FLAKY 警报行+`# flaky-retries 1`+`recovered 1/1; result PASS` 齐备。builder 预验里两文件同时发作恢复 2/2 亦在案。状态改 done。
