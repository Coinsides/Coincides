> **状态 (Status)**: active (末批允许范围验证完成；安全禁区与两条环境红仍如实列明)
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-12
> **权威 (Authoritative)**: 否

# 独立末批验证回执

本回执记录主 builder 发出源码 ready 后独立亲跑的结果，不代替 HQ 放行，也不把未执行项算作绿色。所有运行采用本单专用 wrapper，原总门里的 Git/secrets 从未执行。隔离、逐条安全语义排除和首轮失败分析见 [scope](final-verification-scope.md)。没有修改产品源码、正式测试、正式门或主工单。

| 范围 | 结果 | 原始日志 |
|---|---|---|
| client typecheck / shared build / server typecheck | 全部 exit 0 | [final-typecheck.log](final-typecheck.log) |
| client 允许全库 | 150 文件、1572/1572 PASS、0 fail / skip / unhandled；凭据文件另排除 1 文件 / 3 条 | [final-runtime.log](final-runtime.log) |
| shared / client / server 完整 build | 全部 exit 0；client 先 tsc -b 后 Vite build(envFile:false)，server 保留 manifest check / tsc / copy | [final-runtime.log](final-runtime.log) |
| server test:v2 允许范围 | manifest 57 文件，执行 54 文件；428 TAP 条目、426 pass / 2 环境 fail / 0 skip；3 安全文件与 18 精确安全用例另排除 | [final-server-rerun.log](final-server-rerun.log) |
| test wiring | 75/75 文件已挂，0 豁免、0 漏挂 | [final-runtime.log](final-runtime.log) |
| tech debt table | PASS（仅原有 grandfathered 项） | [final-runtime.log](final-runtime.log) |
| boundary / model | 174 checks / 60 groups 全绿 | [final-runtime.log](final-runtime.log) |
| tool registry / manifest / parity 测试 | 4 / 10 / 10 条 PASS；registry 混合存在性泄漏用例 1 条另排除 | [final-runtime.log](final-runtime.log) |
| manifest / parity / server-shared / gallery / rail / editor / source / legacy / relation 静态门 | 全部 exit 0 | [final-runtime.log](final-runtime.log) |
| performance seed | 5 场景 PASS | [final-runtime.log](final-runtime.log) |
| docs:check | 最终补跑 exit 0：索引检查、object inventory、glossary K-1 至 K-3 全绿；自动生成器只更新 docs/agent-ops/INDEX.md 一件 | [final-docs.log](final-docs.log) |
| 隔离完整应用 | 新用户/Project/A4纸页/双 TextFlow/freehand/Board/Note成员/sticky 已 seed；backend/Vite HTTP 200。浏览器执行归主 builder | [isolated-app-start.md](isolated-app-start.md) |
| 浏览器后独立 DB 只读回验 | 文字、双墙 inset、warm-paper、180×90 PNG 与 495 字节实体、Board 新位置、原 freehand 全部 PASS；三个本单服务已确认 PID/端口/启动时间并停止 | [browser-readback-checks.md](browser-readback-checks.md) |
| Git / secrets | **未执行，HQ pending** | [final-runtime.log](final-runtime.log) |

server 两个环境失败保持原单申报：`v2SourceMineruWiring.test.ts` 导入时 `spawnSync python.exe ENOENT`（内部 5 条未跑，TAP计一个文件失败）；`v2SourceRegionCells.test.ts` 的 MinerU Python 进程 code 101。没有修改测试以掩盖环境。首轮 14 红经修正后只剩这两项：主 builder 删除退役 ShapeObjectLayer 静态名单一项；wrapper 将 app-data 从仓库内改至全新 OS TEMP，清除 11 项选址误差。

client 预跑仅 affiliationVisibility K-2 的活几何比较失败；主 builder 修正夹具后，正式全库 1572 条均绿。其原始红证据保留 [prefinal-client.log](prefinal-client.log)，未覆盖。

Node 的 `--test-skip-pattern` 在本机从 TAP 中省略匹配项，故 TAP skip=0 不表示没有排除。精确排除名称在 wrapper 的外层日志和 scope 中逐条列出；已经核查它们没有出现在执行的 `# Subtest` 清单。原无过滤 server 57 文件与原无过滤完整 runtime gate 均**不申报全绿**。

最终文档依赖落盘后，已运行 `node .codex-tmp/purge-final-verification/run.mjs --docs-refresh final-docs`。现成生成器只更新 `docs/agent-ops/INDEX.md` 的派生元信息，随后完整 docs:check 全绿；没有修改 authority 正文或主工单。首轮 docs 索引过期的红证据继续保留于 final-runtime.log，不覆盖历史输出。
