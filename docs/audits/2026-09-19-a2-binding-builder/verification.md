> **状态 (Status)**: active
> **层 (Layer)**: audit / builder verification
> **日期 (Updated)**: 2026-09-19
> **权威 (Authoritative)**: 否；这是执行证据，不是 HQ 放行

# A2 验证账本

按工单 §五.4，解析根 `package.json` 的 `verify:v2-bn8-runtime`，共 25 个串联组件。只留下 `git diff --check`、`npm run check:changed-file-secrets` 两项给 HQ；其余 **23 个组件全部执行**。没有执行完整门后声称全绿。原命令、时间、退出码与日志映射保存在 `.codex-tmp/a2-binding/gate-results.json`，脚本为 `run-gates.ps1`；初跑结果不会被修复后的日志覆盖。

## 非 git/secrets 的 23 组件

| # | 组件 | 最终结果 / 证据 |
|---|---|---|
| 1 | check:test-wiring | PASS；96 / 96 server inventory 文件接线、0 排除 |
| 2 | test:agent-knowledge | PASS；执行既有功能回归，没有新增对抗用例 |
| 3 | check:agent-knowledge | PASS |
| 4 | check:tech-debt-table | PASS |
| 5 | test:unit | PASS；修复后 client 全库复验，见下文 |
| 6 | test:tool-face-registry | PASS |
| 7 | test:tool-face-manifest | PASS |
| 8 | check:tool-face-manifest | PASS |
| 9 | test:tool-face-parity | PASS |
| 10 | check:tool-face-parity | PASS |
| 11 | check:server-shared-runtime-import | PASS；0 违规 |
| 12 | check:canvas-runtime-boundary | PASS；175 checks |
| 13 | check:group-gallery-shell | PASS |
| 14 | check:groups-rail-shell | PASS |
| 15 | check:single-editor-shell | PASS |
| 16 | check:source-experience | PASS |
| 17 | check:v2-bn11-legacy-shutdown | PASS |
| 18 | check:v2-bn11-relation-freshness | PASS；执行原门，未改 Relation |
| 19 | smoke:canvas-engine-model-contract | FAIL；旧短页高度断言与当前现物不一致，详下 |
| 20 | build:client | PASS；最终构建 `client-build-final.log` |
| 21 | build（server 正式构建） | FAIL；shared 新声明文件缺失，详下 |
| 22 | smoke:canvas-engine-performance | PASS；5 场景，总计 12.86ms |
| 23 | docs:check | PASS；生成索引后复验，见 `docs-check-final.log` |

最终为 **21 / 23 PASS、2 / 23 FAIL**，另有 git/secrets 2 组件未执行、留 HQ。普通 gate 日志文件名为 `gate-<组件名冒号换连字符>.log`；例外复验见表与下文。

## client 最终完整复验

折缝跨页拖动修复和全部测试编辑完成后，重新执行根 `npm run test:unit`：**188 / 188 文件、1896 / 1896 tests 全部通过，0 排除**，exit 0；日志 `client-full-final.log`。最终 `build:client` exit 0（Vite 仍提示大 chunk，非构建失败），日志 `client-build-final.log`；175 项边界门复验 exit 0，日志 `boundary-final.log`。client 的最终 noEmit 检查另留 `client-typecheck.log`。

较早的完整 gate client 首轮 1888 项有 6 个失败：五个严格 unboxing 请求账本缺新增装订 GET，一个新 hook 测试的 beforeEach 意外返回 mock 函数，被 Vitest 当清理函数调用。修复明确请求响应和测试回调后全量复验通过；初轮 `gate-test-unit.log` 保留。后续增加保存竞态、小数输入和折缝手势用例，所以最终项数为 1896；没有删失败例来降范围。

定向证据包括槽服务 18 例、初始折缝 7 文件 / 86 例、最终手势补验 3 文件 / 56 例。它们包含在完整库内，不能与 1896 叠加。测试使用真实 React/jsdom、实际 runtime 和手势保存路径；未作浏览器像素验收。

## 未绿项的具体证据

1. **model-contract**：`client/scripts/canvasEngineModelContractCheck.ts:1642` 要求 height=400 的 frame 被抬为 1278；现物返回 400。`pageFramePrintScaleService.ts:99` 明确纸型族不是最小高度，`:101` 保留显式 height。只读 `git diff --numstat` 对这个门、该 service 和 `pageFrameService.ts` 都是空输出，说明二者在当前 HEAD 已存在且本单没改；未在洁净副本重跑历史版本，因此不宣称历史哪一单门曾失败。未放宽断言或修改分页规则来洗绿。日志 `gate-smoke-canvas-engine-model-contract.log`。
2. **正式 server build**：shared 新类型需生成 `shared/dist/types/noteBinding.d.ts`，`tsc -b shared` 写出遇 EPERM；随后正式 server build TS6305。没有改权限或绕过拒绝写出。临时 noEmit 配置直接检查同一 server/shared 源码通过，只作补证。日志 `shared-typecheck.log`、`gate-build.log`、`server-source-typecheck.log`。
3. **server 全量**：全部 96 个 inventory 文件都有执行尝试，0 排除；77 文件主套件 + 19 文件补跑。初跑、本次兼容回归修复、wrapper IPC 复验、剩余失败的逐项名字及行号见 [server-model.md](./server-model.md)。最终剩 **4 文件、6 个未通过执行节点**：两个 Python 环境节点、两个正式构建叶子测试、两个旧 BoardWave1 断言/连锁叶子测试。未注册或未到达的测试不算执行通过，重试和修复复验的重叠数字不累加成唯一总数。

本次修复曾发生的五个 Note/MCP 响应形状回归后，以独立 binding-settings GET 保持通用 Note 响应不变，相关四文件 **75 / 75** 通过。A2 新增 server 6 例，连既有 foundation/文本迁移/皮/封面定向共 **21 / 21** 通过。上述数字彼此重叠，不合并统计。

## 执行边界与交接

没有 git 写操作、commit、push、PR、权限配置改动或生产数据库迁移；工作树留 HQ。未增加依赖、未新增安全对抗用例。初始已有的 `.claude/settings.local.json`、09-07 / 09-09 audits、根介绍文档未触碰。

`docs/agent-ops/INDEX.md` 由现役索引脚本重生：初始索引缺 A2/队列等已存在文档，docs 门要求同步；仅同步来源元数据。手册 §一已补实际用法。上游设计档的反向同步/放行归 HQ，不在本单替 HQ 修改裁定。

未做：A3 真封面页、自动章名、中文数字、发布前默认关切换、浏览器像素与 Henry 主观验收、HQ 的 git/secrets 两组件、受环境/现物断言不一致阻塞项目的最终收口。本账本不声明“完整 verify 门通过”或“server 全量通过”。
