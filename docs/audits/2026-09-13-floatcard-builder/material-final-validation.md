> **状态 (Status)**: complete / 综合验证收据；保留已允环境失败
> **层 (Layer)**: 审计 / Builder materialPreset 补遗验收
> **日期 (Updated)**: 2026-09-13
> **执行者**: Codex builder / verify_prepare（汇总已有执行证据）

# materialPreset 最终验证收据

本轮已执行三端正式构建、client 全库、server 非安全全量及全部 21 个允许的 runtime 分段；首轮失败与补验分别保留。首轮原始账本 [material-validation.json](material-validation.json) 仍为 `completed_with_failures`，没有回填成全绿。综合结果为：正式构建通过；client 全库唯一失败已在所属文件定向补验通过；server 同一 56 文件清单复跑后仅余补遗明确允许申报的两处 Python/MinerU 环境失败。没有宣称最终 client 整库重新跑绿或原聚合门整体通过。

## 执行与补验

| 项目 | 首轮事实 | 最后有效证据 |
|---|---|---|
| shared 正式构建 | `node server/node_modules/typescript/bin/tsc -b shared`，exit 0 | [shared 日志](material-logs/run-bOYU1R-01-shared-build.log) |
| server 正式构建 | 根 `npm run build`，含 manifest 校验、TypeScript 与 manifest 复制，exit 0 | [server 构建日志](material-logs/run-bOYU1R-02-build.log) |
| client 正式构建 | 首次 exit 1：新增测试两处 `Array.at` 不受既有 TypeScript target 支持 | 改为兼容既有 target 的数组访问后，根 `npm run build:client` 完整补跑 exit 0，含 `tsc -b` 与 Vite；[补验账本](material-client-build-final.json)、[补验日志](material-client-build-final.log) |
| client 全库 | 直接 Vitest `run --maxWorkers=1`；157 文件，1644 测试：156 文件 / 1643 测试通过，1 文件 / 1 测试失败，exit 1 | [全库原日志](material-logs/run-bOYU1R-04-client-full.log)；唯一失败所属 `useNoteCanvasDataAdapter.skin.test.tsx` 修正后补验 12/12、exit 0，见 [定向补验日志](material-client-supplement.log) |
| server 非安全全量 | 56 文件，462 项：446 通过、16 失败，exit 1 | 修正隔离目录位置后，**相同 56 文件完整复跑**：462 项，460 通过、2 失败，0 skipped / cancelled，exit 1；[补验账本](material-server-supplement.json)、[完整补验日志](material-logs/coincides-mat-3uXYgn-server-full-allowed.log) |
| 其余 runtime 允许分段 | 19 个分段首轮通过，包含 test-wiring、tech-debt-table、相关静态门、工具面 registry/manifest/parity、模型契约、性能及 docs:check | 逐项命令、退出码、耗时与日志路径完整留在 [首轮账本](material-validation.json)；另两个分段为上表的 client build 与 client test |

client 全库唯一失败是旧 detach 精确断言尚未包含新增 `materialPreset: 'default'`，用例为“keeps a pending suite-detach save bound to its original paper after navigation”。修约后同步预期并补跑该文件 12/12；这 12 项包含在原全库范围内，不能将 1643 与 12 相加，亦不能声称最终 157 文件 / 1644 项曾整库重跑全绿。原全库失败日志与首轮构建失败日志均保留。

首轮 server 的额外 14 项失败由验证 runner 的隔离路径引起：TEMP 与 COINCIDES_APP_DATA_DIR 位于仓库内，既有 credential-storage 目录守卫在这些测试到达目标行为前拒绝仓库路径。补验改用新建系统临时目录 `coincides-mat-3uXYgn`，继承系统启动变量，继续使用空 dotenv、独立 app-data/assets/blobs 与短合成 JWT；没有继承用户凭据或 provider 变量。补验的 56 文件列表与首轮相同，未增减断言或跳过失败项。

## 已允环境失败

server 补验仍有两项失败，按工单补遗一第 4 条保留申报：

1. `src/__tests__/v2SourceMineruWiring.test.ts`：既档 Python 可执行文件启动失败；Node 将文件本身记为失败项。该问题在原阶段已记录为 `python.exe ENOENT`。
2. `src/__tests__/v2SourceRegionCells.test.ts` 的 `V12.9c c-1b-2 keeps MinerU table regions honest and declares cell geometry unavailable`：MinerU Python 启动器无法创建解释器进程，退出码 101，返回 `parser_failure`。

本轮没有将这两项排除出全量执行，也没有据此修改 Python/MinerU 产品代码。详细失败块保存在 [server 补验账本](material-server-supplement.json)。

## 分段门与收口边界

根 `verify:v2-bn8-runtime` 含 23 段。本轮逐项执行其中 21 个允许段；git/secrets 两段明确 `excluded_hq`。首轮允许段为 19 通过 / 2 失败，后续 client build 完整补跑通过，client test 的唯一失败文件定向补验通过；原始计数不回写。shared 独立构建与 server 非安全全量属于另加验证，不混算进这 21 段。

以下安全文件均未执行，交 HQ 收口：

- `server/src/__tests__/providerCredentials.test.ts`
- `server/src/__tests__/v2DevQuickLogin.test.ts`
- `server/src/agent/providers/index.test.ts`

`git diff --check` 与 `check:changed-file-secrets` 同样交 HQ，未调用原聚合命令。Vite 大 chunk 提示保留。本综合收据、浏览器文档及工单 done Result 写入后，主 builder 重新生成 `docs/agent-ops/INDEX.md` 并执行 `npm.cmd run docs:check`，exit 0；索引、对象台账、glossary 门均通过，见 [最终文档检查](material-docs-final.log)。

本档只汇总已产生的工程执行证据，未重新运行测试。暖纸“存套装→切走→切回→删除”的纸纹、阴影、墙材质真实浏览器验收由本轮浏览器收据单独记录；builder 自检与 HQ 放行职责仍各自独立。
