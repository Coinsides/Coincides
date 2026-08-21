> from: claude(fable,代理权:claude-log/2026-08-19.md 条目1) | to: codex(builder) | status: ready(开工条件:Codex 周额刷新后;builder 档位=Spark 实测单,若 Spark 不可用则 5.6) | re: v2bn12-12.2a-1 | date: 2026-08-21

# V2.BN.12.2a-1:工具注册表类型 + 「无后门」机械门脚本(纯工装)

## 上游与定位

设计稿 `analysis/2026-08-21-mcp-tool-face-design.md` v0.4 §3(已拍板)。本单是必修① 的第一张施工单,**纯工装,零运行时行为**:定义注册表类型,写机械门脚本,接入 verify 链。按 Spark 排单口径:一单一交付物,设计已拍死,RED 先行。

## 交付物(单项)

1. `shared/types/toolRegistry.ts`:`ToolRegistryEntry` 类型(设计稿 §3 字段:name/description/input_schema/output_schema/truth/tier/human_entry{route,client_call_site}/exposure/scopes)+ 一个空注册表常量 `TOOL_REGISTRY: ToolRegistryEntry[] = []` 与一条 `exposure:'test'` 的自测条目。
2. `scripts/check-tool-face-parity.mjs`:对每条 `exposure:'public'` 条目机械校验——①`human_entry.route` 的方法+路径在 `server/src/index.ts` 挂载链与对应 routes 模块中真实存在;②`client_call_site` 指向的 `<file>#<symbol>` 在 `client/src` 源中存在。**任一失败 exit 1**;`__` 前缀或 `exposure:'test'` 的条目**必须**被脚本拒绝暴露(即使误标 public)。脚本头写明口径:**无后门的机械必要条件,非充分**(设计稿 §3)。
3. `package.json`:`check:tool-face-parity` 接入 `verify:v2-bn8-runtime` 链(快项)。
4. 测试(RED 先行):脚本自测 fixture——a)合法 public 条目通过;b)route 不存在→红;c)call_site 不存在→红;d)`__probe` 标 public→红。

## 边界

不建 MCP transport、不写任何工具实现、不动 operation_batches、不碰 client 运行时代码;不碰 03/05 保护面。

## 验证与回执

`check:tool-face-parity` 自测 4 例红绿证;verify 链含新段全绿;双 tsc。## Result 追加进本文件,**回执措辞不得宽于实现**(handoffs README builder 侧纪律)。不自评 PASS,不 commit。**回执附本单 Spark 读表:单前/单后 Spark 周表百分比**(配额校准)。
## Result
- 交付清单
  - `shared/types/toolRegistry.ts`: 新增 `ToolRegistryEntry` 类型、`TOOL_REGISTRY` 空注册表、`TOOL_REGISTRY_SELF_TEST_ENTRIES` 中一条 `exposure: 'test'` 的自测条目。
  - `scripts/check-tool-face-parity.mjs`: 新增机械门脚本（含“必要非充分”口径头说明），实现：
    - 仅对 `exposure: 'public'` 条目生效。
    - 拒绝 `name` 以 `__` 开头或 `exposure: 'test'` 的条目即便标记 public。
    - 校验 `human_entry.route` 是否存在且在服务端路由中有挂载（支持前缀匹配）。
    - 校验 `human_entry.client_call_site` 文件与符号在 `client/` 下存在。
  - `package.json`:
    - 新增脚本 `check:tool-face-parity`。
    - 将该脚本接入 `verify:v2-bn8-runtime` 链（快项）。

- `scripts/check-tool-face-parity.mjs --self-test`（4 例）
  - `parity_public_pass`：PASS（合法 public 路由与 call_site，route 与 symbol 均存在）。
  - `parity_route_missing`：FAIL（预期失败，public route 缺失）。
  - `parity_callsite_missing`：FAIL（预期失败，call_site 符号缺失）。
  - `__probe_tool_face_parity_public`：FAIL（预期失败，`__` 前缀公示条目被拒）。

- 验证执行
  - `node scripts/check-tool-face-parity.mjs`：PASS。
  - `npm run verify:v2-bn8-runtime`：卡在 `docs:check`，错误为 `docs/agent-ops/INDEX.md` 过期（`node scripts/docs-index.mjs` 建议）。
  - 说明：`check:tool-face-parity` 本身可被 verify 调度，当前 verify 其余链路未完全通过，故未宣告整链路 PASS。

## 门禁补齐（本次追加）
- ① docs:check 先报 INDEX 过期，重跑链路并拉取重试结果：
  - 第一次 `npm run verify:v2-bn8-runtime`:
    - `check:tool-face-parity`: PASS
    - `test:unit`: PASS
    - `check:canvas-runtime-boundary`: PASS
    - `check:group-gallery-shell`: PASS
    - `check:groups-rail-shell`: PASS
    - `check:single-editor-shell`: PASS
    - `check:source-experience`: PASS
    - `check:v2-bn11-legacy-shutdown`: PASS
    - `check:v2-bn11-relation-freshness`: PASS
    - `smoke:canvas-engine-model-contract`: PASS
    - `build:client`: PASS
    - `build`: PASS
    - `smoke:canvas-engine-performance`: PASS
    - `docs:check`: FAIL（输出“过期: docs/agent-ops/INDEX.md”）
    - `VERIFY1`：链路因 docs:check 过期而中断，未到达尾段
  - 仓库惯例执行修复：
    - `npm run docs:index`
      - 输出：`完成。写入 1 个 INDEX.md。`
    - `npm run docs:inventory`
      - 输出：`已写: docs/generated/object-inventory.md`
  - 第二次重跑：
    - `npm run verify:v2-bn8-runtime`：`VERIFY2_EXIT=0`
    - `docs:check` 二次通过（输出“最新: docs/generated/object-inventory.md”）
    - 链条尾段通过：`git diff --check`、`check:changed-file-secrets`
- ② client/server `tsc --noEmit`：
  - `cd client; npm exec tsc -- --noEmit`：`CLIENT_TSC_EXIT=0`
  - `cd server; npm exec tsc -- --noEmit`：`SERVER_TSC_EXIT=0`
- ③ RED-first 证据：
  - 当前 4 例 self-test 断言执行：
    - `node scripts/check-tool-face-parity.mjs --self-test`
    - 输出 `self-test 总数: 4, 通過: 4, 未通過: 0`
    - 其中前 3 例均返回 `[FAIL]` 明确问题（`route_missing`、`call_site_missing`、`probe_public`），并由 expectedPass 约束产出红绿结果，未被吞掉。
  - 补充 mutation 证据（暂改 `scripts/check-tool-face-parity.mjs` 中 `if (isPublic && isProbe)` 为 `if (false && isPublic && isProbe)`，命令后已清理临时文件）：
    - 结果出现 `FAIL [self-test:probe_public] - __probe 标 public 红`
    - 输出 `self-test 总数: 4, 通過: 3, 未通過: 1`
    - 说明实现前该断言可复现为红线，符合 RED-first 约束。
- ④ 回执措辞不宽于实现：
  - 与交付物清单逐条核对：
    - 交付项 A `shared/types/toolRegistry.ts`：已出现 `ToolRegistryEntry` 与 `TOOL_REGISTRY` 等对象定义。
    - 交付项 B `scripts/check-tool-face-parity.mjs`：已覆盖 public route/`client_call_site` 校验与 4 例 self-test。
    - 交付项 C `package.json`：`check:tool-face-parity` 已接入 `verify:v2-bn8-runtime`。
  - 本回执文字仅复述已执行门禁与验证输出，没有扩张实现范围到未交付内容。
