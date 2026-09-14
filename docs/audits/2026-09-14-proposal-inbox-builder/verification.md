> **状态 (Status)**: active
> **层 (Layer)**: 施工验证证据
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否（施工证据；不代替 HQ 放行）

# 提案收件箱验证

最终结果：client 全库 **171 文件 / 1746 tests 全通过**；server 全量 **84 文件 / 779 tests：777 pass、2 fail、0 skipped、0 cancelled**。两项失败均为 Python / MinerU 环境故障。三端 typecheck/build 通过。未新增或排除安全对抗用例。

## 执行边界与命令

执行前已检查根、client、server 的 package scripts、`scripts/run-server-test-suite.mjs`、测试接线门及相关入口。测试子进程使用环境白名单、`NODE_ENV=test`、`DB_PATH=:memory:`、OS 临时目录下独占 provider/资产/fixture 目录、空 `DOTENV_CONFIG_PATH` 与 `COINCIDES_VALIDATION_ENV_DIR`。既有测试使用内存或临时数据库；quick-login 既有回归只加载它自行创建的空 `.env`。未读取真实 `.env` key 或用户库。

Windows 禁止执行 `npm.ps1`，实际以 Node 调用已安装的 `npm-cli.js` 执行同名 scripts；未安装依赖。下表以等价 `npm run` 写法列命令。临时执行器与原始日志只留在 `.codex-tmp/proposal-inbox/`；本证据目录不含原始日志或构建产物。

| 范围 | 命令 | 最终结果 |
| --- | --- | --- |
| client typecheck/build | 根 `npm run build:client`（`tsc -b && vite build`） | exit 0；焦点修正后再次通过，13.65 s；Vite 仅有大 chunk 告警 |
| server typecheck/build | 根 `npm run build`（server manifest check + `tsc` + manifest copy） | exit 0 |
| shared typecheck | `node client/node_modules/typescript/bin/tsc --project shared/tsconfig.json --noEmit` | exit 0 |
| shared build | `node client/node_modules/typescript/bin/tsc -b shared/tsconfig.json` | exit 0 |
| client 全库 | 根 `npm run test:unit` | 171 文件、1746 tests 全通过，31.33 s |
| client 最终定向 | client `npm run test:unit -- src/components/AgentPanel/AgentPanel.proposalInbox.test.tsx src/components/AgentPanel/AgentPanel.contextHint.test.tsx` | 2 文件、15 tests 全通过：收件箱 9 + context 6；由 client_tests agent 亲跑，包含清空后关闭收件箱焦点回聊天输入框 |
| server 全量 | server cwd：`node ../scripts/run-server-test-suite.mjs <全部 84 个 .test.ts 的显式路径>` | 779 tests：777 pass / 2 环境 fail / 0 skip / 0 cancelled，125.49 s |

server 全量清单递归取 `server/src` 与 `server/scripts` 的全部 `.test.ts`，未使用名称过滤、分片或排除。现有 wrapper 无参数只透传 Node 默认发现，因此本次采用显式全清单；清单存于 `.codex-tmp/proposal-inbox/server-inventory.json`。`check:test-wiring` 在终版再次确认 **84 test files / 84 wired / 0 exempted / 0 unwired**。

## runtime 门逐项

用户明令零 git；根 `verify:v2-bn8-runtime` 尾部包含 git 命令，因此保持原脚本不变，逐项执行其余 21 个组成项。

| 根脚本（`npm run …`） | 结果 |
| --- | --- |
| `check:test-wiring` | 绿；84 wired / 0 exempted / 0 unwired |
| `check:tech-debt-table` | 绿；既有 TD-6 / TD-12 / TD-28 历史豁免未改 |
| `test:unit` | 绿；171 文件 / 1746 tests |
| `test:tool-face-registry` | 绿；5/5 |
| `test:tool-face-manifest` | 绿；10/10 |
| `check:tool-face-manifest` | 绿 |
| `test:tool-face-parity` | 绿；10/10，既有反例回归未排除 |
| `check:tool-face-parity` | 绿；14 public entries 的必要条件；该门自身不证明 human journey |
| `check:server-shared-runtime-import` | 绿；262 产品源文件、0 violations、18 个合法 import-type |
| `check:canvas-runtime-boundary` | 绿；174 checks |
| `check:group-gallery-shell` | 绿；8 checks |
| `check:groups-rail-shell` | 绿 |
| `check:single-editor-shell` | 绿 |
| `check:source-experience` | 绿；静态 contract + typecheck + model contract |
| `check:v2-bn11-legacy-shutdown` | 绿 |
| `check:v2-bn11-relation-freshness` | 绿 |
| `smoke:canvas-engine-model-contract` | 绿；60 groups |
| `build:client` | 绿；终版已补验 |
| `build` | 绿 |
| `smoke:canvas-engine-performance` | 绿；5 场景，总 14.64 ms |
| `docs:check` | 绿；初验仅 `docs/agent-ops/INDEX.md` 过期，builder 完成 Result/status 后已用既有生成器更新，并亲跑全条命令 exit 0 |

最终 21 个非 git/secrets 组成项全绿。`docs:check` 包含 INDEX 检查、`node scripts/docs-inventory.mjs --check` 与 glossary K-1～K-3，最终已整条通过。

## server 两项环境红与正常往返

| 失败 | 准确位置与原因 |
| --- | --- |
| `v2SourceMineruWiring.test.ts` 整文件启动失败，计 1 fail | 源码 `server/src/__tests__/v2SourceMineruWiring.test.ts:60`：`spawnSync python.exe ENOENT`。在模块启动阶段失败，文件内用例未展开；没有主动跳过或排除。原始证据 `.codex-tmp/proposal-inbox/server-all-final.log:42348`，失败记录 `:42371`。 |
| `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable`，计 1 fail | `server/src/__tests__/v2SourceRegionCells.test.ts:203`：MinerU code 101，无法启动其配置的 uv Python 3.12.11。原始证据 `.codex-tmp/proposal-inbox/server-all-final.log:43139`。 |

最终 TAP 总计在 `.codex-tmp/proposal-inbox/server-all-final.log:45939`（779 tests），`:45941`（777 pass），`:45942`（2 fail）；结构摘要为同目录 `server-all-final.json`。Python / MinerU 环境修复留 HQ，本单未改解析器、Python 安装或测试机关。

同次全量已覆盖本单 3 个新增正常往返：chat `organized_note` + `batch_cards` 逐条 apply 后 pending 清空、discard 不造卡、`material_reconciliation` 空请求体只记录既有 review shell，分别见原始日志 `:15057`、`:15141`、`:15224`。终版 prompt/context 的 13 项通过；既有材料提案创建、apply、discard 等 server 回归同次通过。UI 定向与真实浏览器证据由相应施工记录给出，不能把这些 API 结果当作真浏览器替代证据。

## 已废弃的首轮执行与未做项

首轮临时执行器误将 `TEMP/TMP` 放在仓库内，触发 `server/src/services/providerCredentials.ts` 的既有仓库内存储禁令，导致多个 provider-stub 回归报 `store_unavailable`。这是验证器隔离目录错误。首轮已中止，仅结束本轮自启进程并确认退出；其结果废弃，不列为产品失败。随后将 fixture 根修正为 OS 临时目录下独占目录，保留空 env 与隔离库，重新运行完整 84 文件，最终结果如上。未为消红修改产品机关或删排测试。

`git diff --check` 与 `check:changed-file-secrets` 均未运行；后者内部调用 git，按工单交 HQ 收口。全程零 git 命令、未碰 `.git`、未 commit。此文档只记录施工验证，不作 HQ 放行结论。
