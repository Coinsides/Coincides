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
