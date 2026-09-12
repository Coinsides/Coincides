> **状态 (Status)**: active（部分施工完成，验收停在范围冲突）
> **层 (Layer)**: 审计证据 / Audit
> **权威 (Authoritative)**: 仅本轮执行事实；不代表 HQ 放行

# 13.6 flaky 五笔：本轮施工与停线回执

**尚未完成工单，保持 ready。** 三份客户端测试夹具已调整，修改前后定向均为 **3 文件 / 15 tests / 15 pass / 0 fail**；T-1 单例隔离 **1/1**；`check:test-wiring` **75/75 wired，0 exempted，0 unwired**；客户端 TypeScript 检查通过。**未执行默认并发全库三轮，不宣称清基线或全库绿。**

## 五笔逐项

| 项 | 根因证据与确定程度 | 本轮处置 | 复验与剩余 |
|---|---|---|---|
| BoardPage.unboxing | 已证负载下单例 5s 预算不足。`../2026-09-11-f19-builder/validation/runtime-gate.log:392–394,467–471`：长流程 5226ms，明确 `Test timed out in 5000ms`；同目录 `board-timeout-recheck.log:8–15` 隔离同例 613ms。现物运行真实 board/modal/full-page/runtime，并多次挂载。 | 只把该 describe 的单例 timeout 明定为 20,000ms；不改全局并发、Testing Library 等待默认值或任何断言。 | 本轮定向同例修前 676ms、修后 647ms，套件 5/5。高负载三轮仍待执行，不能仅凭此申报已清。 |
| BoardPage.selection | 历史具体红栈未找到。现物 Saved 由 pending/viewportDirty 推导，排队入口同步增加 pending，故没有证实“旧 Saved 先通过”。已知高负载历史首例 2601ms（同一 runtime-gate.log:373–380），当轮 7/7 绿。 | 第一条连续拖动/undo/redo/分层流程的六处原精确位置或 layer 断言放入 waitFor，继续保留 Saved 等待；下一次操作必须在本次夹具精确状态达到后才发出。没有增加 sleep、放宽预期值或改变其余六例。 | 7/7；属于确定性等待硬化，**历史根因未证**，不冒充已复现修复。 |
| groupGalleryPurposeRetirement | 源码有明确 readiness 缺口：`SingleContentGroupEditor.tsx:73` records 出现后能渲染保存按钮，draft 由后续 `:93–101` effect 初始化；测试原先只等按钮，未等草稿。初始 effect 可覆盖过早输入。PUT mock 本身同步更新 groups，因此不能仅把读回早归因于未 await 网络。 | 输入前等待标题精确为 `Original group`；保存后同时等待原来的 PUT 次数恰为 2 与夹具标题精确为 `Saved through editor`，然后卸载重读。 | 3/3；保留全部原断言并增加两个状态断言。历史那次调度窗口未单独强制重现。 |
| DashScope provider 端点 | 按端点标题定位 `server/src/__tests__/v2ImprintEmbedding.test.ts:191`。该例只保存/改/恢复 DASHSCOPE_API_KEY，fetchImpl 为实例注入，没有全局 fetch 残留；未单独隔离 app-data。另一个同为 13 例的 `src/agent/providers/index.test.ts` 有逐例临时凭证目录和 context mock，不能混作本项证据。Node 默认文件进程隔离排除了普通 env/global fetch 跨文件遗留解释；文件路径共享仍需具体证据。 | 只读诊断，未修改、未执行该套件。它在前单被明确列入安全类排除，当前等待范围澄清。 | 历史 actual/expected 未取得，**不宣称已证环境泄漏**。 |
| T-1 登录形状 | 只读 `v2DevQuickLogin.test.ts` 夹具。已有独立临时 DB/blob/asset/upload/空 dotenv，health readiness；端口由 probe 关闭后交给 child，理论上有竞争窗口，但本轮未见端口冲突或 health 失败。没有读取或分析登录产品实现。 | 在 OS 环境白名单、空 dotenv、内存/合成库与临时 app-data 下原样执行用户点名的 T-1 单例；未改夹具、登录逻辑或断言。没有因绿而发明根因。 | **1/1**，9978ms；历史红因仍未证。若后续证据指向产品行为，按工单立即停线交 HQ，不深入。 |

### DashScope 只读诊断补充与可审查方案

**app-data 输入未隔离的夹具缺口已证实，历史前序污染仍未证。** `embedding/dashscope.ts:72–73` 使用 `resolveProviderCredential`；`services/providerCredentials.ts:55–73` 按 app-data、DB 路径或宿主默认目录定位文件，`:116–117` 规定本地凭据优先于 env，`:132–133` 在每次解析时读取。因此该测试设置合成 DASHSCOPE_API_KEY 仍不足以封闭输入，外部文件状态可以改变它的 Authorization 精确断言结果。

只读盘点75份server测试发现的三处凭据写入者（agent/providers/index、providerCredentials、v2DocumentParserPdf）均自建临时app-data，未找到它们向共享目录写入的证据；不能把这个确定的隔离缺口改写成已证实的“前序测试泄漏”。

最小方案已写成 [dashscope-fixture.proposed.patch](dashscope-fixture.proposed.patch)：仅追加逐例临时app-data目录、恢复变量和回收目录的hooks；合成key、实例fetch和原断言一律保留。**该提案未应用，也未执行**，待安全类范围澄清后采用。没有读取任何实际凭据文件。

## 实跑与证据

| 执行 | 结果 | 证据 |
|---|---|---|
| 三客户端目标文件，修改前 | 15/15，exit 0，4.823s 墙钟 | [targeted-before.log](targeted-before.log) |
| 三客户端目标文件，修改后 | 15/15，exit 0，4.741s 墙钟 | [targeted-after.log](targeted-after.log) |
| T-1 原样单例 | 1/1，exit 0，10.196s 墙钟 | [t1-before.log](t1-before.log) |
| check:test-wiring | 75 files / 75 wired / 0 exempted / 0 unwired，exit 0 | [check-test-wiring.log](check-test-wiring.log) |
| Client tsc --noEmit | exit 0，零诊断 | [typecheck-client.log](typecheck-client.log) |
| 原断言保全检查 | 三客户端测试的 127 个原 expect 表达式全部保留；新增 2 个。三份 server 测试快照逐字不变。 | [integrity.json](integrity.json)、[check-integrity.mjs](check-integrity.mjs) |

上述定向前后不是两轮全库；T-1 使用名称过滤只执行被点名功能例，不把未执行的 T-2/T-3 算作通过。三客户端文件仍运行完整 15 例（5+7+3），没有过滤或 skip。原断言检查只覆盖六份快照文件，不是 Git diff 或全仓产品字节证明。

### 默认并发全库三轮

| 轮次 | client | server | 原因 |
|---|---|---|---|
| 1 | 未执行 | 未执行 | 等待安全类执行范围澄清 |
| 2 | 未执行 | 未执行 | 同上 |
| 3 | 未执行 | 未执行 | 同上 |

已备好 [run-validation.mjs](run-validation.mjs) 的 client/server 模式，未设置 maxWorkers、fileParallelism 或 test-concurrency。server 从现有 test:v2 显式清单与其余测试文件构成完整盘点，并保留 npm pretest manifest 钩子。**这些模式尚未执行，脚本存在不代表验收完成。**

## 两条 Python 环境红：一次诊断，未装环境

[python-prerequisites.json](python-prerequisites.json) 记录两个解释器各一次 `-B -c "import sys; print(sys.version)"`，5s 上限；不加载产品、样本或用户库。

1. **MineruWiring**：`python.exe` → `ENOENT`，没有进程退出码。与 `v2SourceMineruWiring.test.ts:59–61` 顶层探针一致：PATH 无法解析解释器，内部用例尚不能注册；该合成 runner 只用标准库，未验证到 MinerU 包。
2. **c-1b-2**：测试固定的 `D:/Coinsides/v12.9-selection/tools/mineru/.venv/Scripts/python.exe` → **exit 101**，报无法用所引用的 uv CPython 3.12.11 基底创建进程。当前路径存在不等于可启动；没有证据可写成包缺失。Python ≥3.12、MinerU、pypdfium2 等后续前置仍未验证。

这两项继续申报为环境红，没有修改测试预期、安装解释器或修产品。

## 范围冲突与 HQ 待处理

本单“验收”要求默认并发 client+server 全库三轮，而“禁区”同时写 **`⛔安全类测试`**。前单现物 `../2026-09-13-purge-builder/final-server.log:2–22` 明确排除了多份安全类套件/子例，**第20行正是本单点名的 DashScope 端点例**；`docs/agent-ops/claude-log/2026-09-09.md:894` 记录当时由 HQ 补跑无过滤全库，builder 不执行安全类。

本轮已请求明确：既有安全断言是否允许原样随功能全库回归执行（不新增、不修改），或由 HQ 接过无过滤三轮。答复到达前不凭“全库”二字自行突破同时存在的明禁，也不私自过滤后称全库。本会话无可用的外部 HQ 直连，故将同样的卡点和可复核交付写回共享工单；未声称消息已发给 HQ。

## 未做项与射程

- 未跑三轮全库、DashScope 套件或安全专项；五笔尚未清基线，工单未翻 done。
- 未运行完整 `verify:v2-bn8-runtime`；其 client 全库执行范围尚待澄清，末尾 Git/secrets 门按工单由 HQ 补跑。仅上述 wiring 和类型门有本轮结果。
- 未改产品代码、登录逻辑、权限文件、全局测试配置、package scripts 或 current-state；未删除用例、放宽断言、添加豁免、commit 或使用 Git/访问 `.git`。
- 未读取真实 `.env`、凭据文件或用户库；测试仅合成数据。临时隔离目录留在系统临时区，未装或改 Python 环境。
- CodeGraph 与 rg 均已优先尝试但当前终端不可用，采用限定路径的 PowerShell/Node 读查。历史查证为 docs/audits 中 2026-09-09..13 开头目录的 .log；未找到 DashScope/T-1 的原始 not-ok 段，不把 absence 当作没有发生过。
