# T7 非 git/secrets 验证门记录

2026-09-21 · Codex builder。**25/25 组件最终通过**；不是含 HQ 两组件的 27/27。原始 `verify:v2-bn8-runtime` 只排除工单明令留 HQ 的 `git diff --check`、`npm run check:changed-file-secrets`。组件清单、隔离参数、全部首次结果与最终补跑收据都在 `.codex-tmp/t7-presets/`。

| 序号 | 现役组件 | 最终 exit | 墙钟 ms | 原始日志 |
| --- | --- | --- | --- | --- |
| 1 | npm run check:test-wiring | 0 | 181 | `gate-01-check-test-wiring.log` |
| 2 | npm run test:agent-knowledge | 0 | 3132 | `gate-02-test-agent-knowledge.log` |
| 3 | npm run check:agent-knowledge | 0 | 348 | `gate-03-check-agent-knowledge.log` |
| 4 | npm run check:tech-debt-table | 0 | 195 | `gate-04-check-tech-debt-table.log` |
| 5 | npm run test:unit | 0 | 152914 | `client-full-direct.log` |
| 6 | npm run test:tool-face-registry | 0 | 621 | `gate-06-test-tool-face-registry.log` |
| 7 | npm run test:tool-face-manifest | 0 | 3619 | `gate-07-test-tool-face-manifest.log` |
| 8 | npm run check:tool-face-manifest | 0 | 577 | `gate-08-check-tool-face-manifest.log` |
| 9 | npm run test:tool-face-parity | 0 | 5297 | `gate-09-test-tool-face-parity.log` |
| 10 | npm run check:tool-face-parity | 0 | 523 | `gate-10-check-tool-face-parity.log` |
| 11 | npm run check:server-shared-runtime-import | 0 | 555 | `gate-11-check-server-shared-runtime-import.log` |
| 12 | npm run check:owned-helper-contract | 0 | 504 | `gate-12-check-owned-helper-contract.log` |
| 13 | npm run test:owned-helper-contract | 0 | 1209 | `gate-13-test-owned-helper-contract.log` |
| 14 | npm run check:canvas-runtime-boundary | 0 | 479 | `gate-14-check-canvas-runtime-boundary.log` |
| 15 | npm run check:group-gallery-shell | 0 | 469 | `gate-15-check-group-gallery-shell.log` |
| 16 | npm run check:groups-rail-shell | 0 | 458 | `gate-16-check-groups-rail-shell.log` |
| 17 | npm run check:single-editor-shell | 0 | 440 | `gate-17-check-single-editor-shell.log` |
| 18 | npm run check:source-experience | 0 | 942 | `gate-18-check-source-experience.log` |
| 19 | npm run check:v2-bn11-legacy-shutdown | 0 | 445 | `gate-19-check-v2-bn11-legacy-shutdown.log` |
| 20 | npm run check:v2-bn11-relation-freshness | 0 | 452 | `gate-20-check-v2-bn11-relation-freshness.log` |
| 21 | npm run smoke:canvas-engine-model-contract | 0 | 2005 | `gate-21-smoke-canvas-engine-model-contract.log` |
| 22 | npm run build:client | 0 | 59372 | `verified-build-client.log` |
| 23 | npm run build | 0 | 1359 | `gate-23-build.log` |
| 24 | npm run smoke:canvas-engine-performance | 0 | 1370 | `gate-24-smoke-canvas-engine-performance.log` |
| 25 | npm run docs:check | 0 | 559 | `verified-docs-check.log` |

## 补跑说明

首次 `gate-results.json` 是 23/25：第 5 项 client 全库失败、第 25 项生成索引过期；其余 23 项通过。

- 第 5 项：首次全库有预览缺 pageStack 的真实断言问题，已修复；两次私有包装又吞掉 maxWorkers，日志显示内层实际只跑 `vitest run`。最后在 client cwd 直接 `node node_modules/vitest/vitest.mjs run --maxWorkers=2`，**236 文件 / 2431 tests 全通过**，零排除、未改 testTimeout。不是把局部补跑拼成全库。最终命令与时间见 `client-full-direct.json`，前两次失败日志保留。
- 第 22 项：最终代码改完后再次完整 tsc+Vite 构建，退出 0，见 `verified-build-client.json`。首次与中间构建日志也保留。
- 第 25 项：仅通过现役 `node scripts/docs-index.mjs` 更新生成索引后，完整 `npm run docs:check` 通过；包括索引、inventory 和 glossary shape 检查。

`gate-final-results.json` 为最终合并收据：补跑项保留 `initial` 原始失败/构建记录，其余直接使用首次通过记录。没有改项目现役验证门来绕过规则；实际全量 server 另行执行并如实报告两项环境阻断，不混入这张 25 组件绿表。
