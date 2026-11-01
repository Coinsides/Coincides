# VPS-F8 builder 证据索引(2026-11-01 · 临时工程对话1)

> `*.log` 被仓库 `.gitignore` 忽略,本页是可提交的摘要;原始日志在同目录。

| 证据 | 结果 |
|---|---|
| `client-targeted-vitest.log` | Settings/Courses/Decks/components/stores/canvasEngine 191 文件:2098 pass / 1 fail(PaginationProjection 满载 5000ms 超时,与 F4/F7 同一条) |
| `client-pagination-rerun.log` | 该文件单跑 5/5 |
| `server-targeted-tests.log` | v14 Agent/ContextHint/ReadTools/OrganizedNote/ClaimReceipt/UiCommands/VerbTransfer + vpsF* + v2McpTransport + v2TrashNotesTool + toolFace registry:除 v2McpTransport 文件级 IPC 反序列化异常(`Unable to deserialize cloned data`,与 vitest 并跑时)外全绿 |
| `server-mcp-transport-rerun.log` | v2McpTransport 单跑 49/49 |
| `positive-control-adoption-refresh-off.log` | 关掉采纳后的 store 刷新 → 两条采纳刷新用例红 |
| `positive-control-list-notes-removed.log` | 摘除 list_notes 执行分支 → 5 条列举用例红(定义/分类用例仍绿) |
| `positive-control-settings-save-gate-off.log` | 去掉 Save 的加载门 → 两条晚到用例红 |
| `client-tsc.log` / `server-tsc.log` | client 0;server 87(基线) |
| `settings-full-reload-shows-saved-dashscope.jpg` | 临时实例整页刷新(navigation type = reload)后下拉显示已存 DashScope/qwen-plus |

门禁:`check:agent-knowledge` PASS(指纹 6db84dc9…,说明书 v2 / 2026-11-01);`check:tool-face-manifest` 未过期;`test:agent-knowledge` 29/29;`git diff --check` 干净。
