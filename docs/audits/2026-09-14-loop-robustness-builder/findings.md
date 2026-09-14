> **状态 (Status)**: active
> **层 (Layer)**: Builder 验证发现
> **日期 (Updated)**: 2026-09-14
> **权威 (Authoritative)**: 否；以下为实跑发现与证据边界

# 验证发现

## F1 · 同毫秒历史重放丢配对，已修

新增工具落史事务把 assistant/tool_result 写入同毫秒时，原 reader 仅按 `created_at DESC` 再 reverse，可能倒置二者，sanitizer 删除整对，包括可见文本。provider 复核与 route 夹具独立复现。已在 `server/src/agent/memory/manager.ts:28` 加 `rowid DESC`；固定 Date 的真实工具写门/收据/重放测试通过，未用延时避开。

原始证据：`.codex-tmp/2026-09-14-loop-robustness-builder/provider-abort/review-history-tie.log`、`route/route-targeted-2.log`。修复后 `route/route-targeted-3.log` 为 9/9；增强 tool_start/tool_end 两种断线点后 `route/route-targeted-4.log` 为 10/10。

## F2 · 初期夹具修正

路由第一轮的合成 course ID 不满足真实 create_deck UUID 校验，修正为合法合成 UUID；没有调整生产工具校验或预期。循环首跑从仓库根启动导致无法解析 server 的 tsx，改为 server 工作目录；第二跑的断线落史断言漏写工单要求的 `[interrupted]` 标记，按要求纠正并新增短 deadline 慢工具用例，最终 `loop-tests/directed-03.log` 为 14/14。初跑日志保留在各自 `.codex-tmp` 子目录，不作为最终通过证据。

## F3 · server 全量两项环境失败，留 HQ

动态枚举并逐文件实跑 86/86，最终 860 tests / 858 pass / 2 fail / 0 cancelled / 0 skipped / 0 todo；84 文件通过、2 文件失败。[全量 summary](server-full-serial-summary.json)。其中一个计数是文件启动失败，不代表内部用例已经展开。

| 文件 | 失败证据 | 边界 |
| --- | --- | --- |
| `v2SourceMineruWiring.test.ts:60` | 原始 `080-server_src___tests___v2SourceMineruWiring.test.ts.log:5`：`spawnSync python.exe ENOENT` | Python 未启动，文件内部用例未展开 |
| `v2SourceRegionCells.test.ts:203` | 原始 `082-server_src___tests___v2SourceRegionCells.test.ts.log:9`：MinerU code 101、`Unable to create process` | 解释器启动失败，未到区域几何断言 |

两份原始日志均在 `.codex-tmp/2026-09-14-loop-robustness-builder/server-full-serial-2026-09-14T08-12-48-951Z-2660/`。与 [上单环境发现](../2026-09-14-prompt-cache-builder/findings.md) 同形。本单未修改相关生产/测试文件、安装依赖、改变解释器配置、排除用例或修改预期，未把 server 全量宣称为全绿。

## HQ 边界

最终 Result/status 回填使派生 `docs/agent-ops/INDEX.md` 过期，首轮 closeout 的 docs check 如实为红；接线和 server build 同轮通过。随后用既有生成器仅更新这一个 INDEX，`docs-final-summary.json` 两步均通过，最终 docs check 为绿。未手改索引或历史文档正文，首轮失败计数保留。

本单未执行 git/secrets 两个收口门、真实外部模型调用或主观浏览器验收。取消和慢工具测试使用确定性 provider 夹具，但运行真实 SDK/adapter、orchestrator、executor、内存数据库与写服务。不能据此宣称真实网络/服务器重启后的作业恢复已验收。
