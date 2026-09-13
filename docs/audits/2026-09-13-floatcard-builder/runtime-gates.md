> **状态 (Status)**: complete
> **层 (Layer)**: 审计 / Builder 运行门记录
> **记录日期**: 2026-09-13（运行环境日期 2026-09-12）

# 浮卡工单运行门

根 `verify:v2-bn8-runtime` 共23段，本路执行其余18个允许段，**18/18最终通过**。根已执行的 `check:test-wiring`、`check:tech-debt-table` 和 client 全库不重复；`git diff --check`、`check:changed-file-secrets` 按工单交HQ补跑，因此不声称原聚合命令整体通过。逐项命令、退出码、耗时、日志及失败后复跑轨迹见 `runtime-gates.json`；输出在 `runtime-logs/`。

| 检查 | 最终结果 |
|---|---|
| tool-face registry | 5/5测试通过 |
| tool-face manifest 测试 | 10/10测试通过 |
| tool-face manifest freshness | 通过 |
| tool-face parity 测试 | 10/10测试通过 |
| tool-face parity 静态必要条件门 | 通过；该门不证明人面可达性 |
| server shared runtime import | 通过 |
| canvas runtime boundary | 通过 |
| group-gallery / groups-rail / single-editor shell | 三项通过 |
| source experience 静态与模型契约 | 通过 |
| v2-bn11 legacy-shutdown / relation-freshness | 两项通过 |
| canvas engine model contract | 60组通过 |
| client常规构建 `npm run build:client` | 通过，含 `tsc -b` 与 Vite产物 |
| server常规构建 `npm run build` | 通过，含manifest校验、`tsc`、manifest复制 |
| canvas engine performance | 5样本通过，总13.10ms |
| docs:check | 完整三段通过 |

另执行 shared 独立构建 `node server/node_modules/typescript/bin/tsc -b shared`，通过。shared产物刷新后，**常规server构建本身通过**；早前后端隔离输出的编译证据只作为历史attempt留存，最终无需以它代替常规构建。

本路首次客户端构建发现 `SkinFloatCard.test.tsx` 的空值类型及 Testing Library 不支持的 `exact` 选项。根实现者修复后，本路完整复跑构建，退出0。首次 `docs:check` 的INDEX检查已通过，只有对象清单因071迁移/新路由过期；经根明确授权运行生成器，`docs/generated/object-inventory.md` 更新为96张活表、47个HTTP路由模块，复跑完整 `docs:check` 通过。该生成件变化为+33/-31行，原始字节在 `.tmp/floatcard-fixture-baseline/object-inventory-before-runtime.md`。

执行前核对所有命令及相关脚本：使用 `.tmp/floatcard-empty-env` 作为Vite空环境目录，dotenv指向其中自建空文件，临时测试目录限于 `.tmp/floatcard-runtime-tmp`。未运行安全类测试、git、secrets扫描或浏览器，未触用户库。本路仅更新上述生成清单和审计产物，无产品代码改动。
