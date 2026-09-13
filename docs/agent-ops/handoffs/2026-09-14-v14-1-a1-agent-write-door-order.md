> **状态 (Status)**: done(builder BLOCKED 三红全判环境,HQ 本机全量 504/504 定案;收口见末尾)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 主线 · 14.1-A1 · Agent 写门公共机关+试点动词全链过户
> **上游**: `analysis/2026-09-14-v14-1-executor-census.md`(K-0 现物权威)+`analysis/2026-09-14-v14-1-census-adjudication.md`(**裁定书,拆单依据**)+`design/agent-constitution-bylaws.md`(实施法)+`plans/v14-agent-era-plan-draft.md` §14.1

# 14.1-A1 · Agent 写门公共机关 + create_goal 试点

**性质**:同门同钥的地基件。造 agent 写路的**公共机关**(actor 管道/同事务史记/收据/撤销覆盖),并以 **create_goal 一个动词端到端过户**验证机关成型。⛔本单迁移其余动词(A2 的事)。

**法理前置(防误停线)**:create_goal 是现役 legacy 动词(census #06,E:95–103 直写 SQL 在产),本单=把它挪到门后+补记账——**写射程收窄非扩大**,⛔触发"新增动词须 Henry 亲批"条款;legacy 面按裁定书 §三.10=过渡面,⛔判翻窗。

## 一 · 公共机关四件

1. **actor/channel 管道**:executeTool 签名扩展携 `{ actor: 'agent', channel: 'chat', conversationId }`(orchestrator 注入);机关只认结构化 actor,⛔从环境猜;
2. **`recordAgentAction` 包装**(新 service):**同一事务**内=执行业务写+`recordEvent`(actor=agent,channel=chat)+写收据——事务失败全回滚,⛔业务成功史记丢失的裂缝;events 动词闭集与 DB CHECK 触发器随需扩(迁移 073,增 `goal_created`;这是 schema 工程⛔工具注册表变更);
3. **收据**:复用 operation_batches 收据机制(S/toolFaceReceipts.ts 先例),新 source 标记区分 agent chat 写(具体值申报);收据必含**实际对象 ID 清单**(裁定书 §二.9 口径);
4. **撤销覆盖(机械闸兑现)**:试点动词的收据可走 revert 路——create_goal 的 revert=删除该 goal(参照 trash_notes revert 先例 S/toolFaceReceiptRevert.ts 扩点);**撤销覆盖不到=不准过户**,这是闸不是建议。

## 二 · 试点:create_goal 全链过户

1. **service 抽取**:R/goals.ts:166–216 创建闭包抽为 service 函数(签名照 ownership 权威裁定:收 db/返实体行/(db,userId,...));人门 route 改薄壳调它——人门行为契约零变(响应形状/排序/归属校验逐字保持);
2. **agent 路**:executor 的 create_goal case 改调同一 service 经 `recordAgentAction`——SQL 直写删除;create_sub_goal **⛔本单动**(A2);
3. **验收断言(定向新增)**:①人门/agent 门同 service 同校验(zod 共用)②agent 写与 events 同事务(注入失败→全回滚断言)③收据含对象 ID+revert 往返(建→revert→goal 消失+revert 收据)④人门回归零变(既有 goals 测试全绿)⑤actor 记账正确(events 行 actor=agent);
4. 客户端零动(收据/撤销的 UI 面归后续;revert 本单只需 API 级可达)。

## 三 · 台账义务

预期零新增挂载期 API(revert 若需新端点=扩既有 tool-receipts 路由,申报);client 全库必跑;server 全量必跑。

## 四 · 禁区

⛔迁移 create_goal 以外的动词;⛔动 legacy definitions 面其余条目;⛔动提案族;⛔动判断域字段(细则 §一物理只读原则本单不实装判断域,零触碰即可);⛔新设计安全对抗类用例(既有功能回归照跑,全库零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据字符串不在射程)。

## 五 · 验收

1. typecheck+build 三端绿;`check:test-wiring`/`check:tech-debt-table` 绿;受影响静态门绿;
2. §二.3 五断言定向新增+goals 族回归+server 全量绿+client 全库绿;
3. 冒烟(隔离库,可 API 级):agent 会话「帮我建目标 X」→goal 落库+events 行+收据行→revert→消失;人门建 goal 行为逐字如旧;
4. 证据落 `docs/audits/2026-09-14-a1-write-door-builder/`(⛔构建产物⛔原始日志目录);git/secrets HQ 收口。

## 六 · 申报义务

Result 必含:交付清单+numstat、机关四件各自落点、迁移 073 申报、收据 source 标记取值、revert 扩点申报、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

**执行状态：BLOCKED（2026-09-13 UTC 实跑，按本单 2026-09-14 归档）。实现已落工作树，未全量验收，顶部 status 保留 ready，未翻 done。**

停线证据：server 全量 79 文件、673 tests 最终 **670 pass / 3 fail / 0 skipped**。其中两项既有回归需要当前环境不可执行的 Python：`v2SourceMineruWiring.test.ts:60` 找不到 `python.exe`；`v2SourceRegionCells.test.ts:39,198` 固定 MinerU venv 的基础 Python 被沙箱拒绝访问，直接 `--version` 同样失败（code 101）。未找到可用的既有替代 runtime；未安装依赖、改权限或排除用例。第三项为 `v2NotesLifecycle.test.ts:432` 的旧 B1c hash，已逐字追溯到后续合法封面交付所加的资产校验/binding 合并，本单未改 notes.ts，也未盲换基线。需 HQ 恢复运行时可访问性、处理已证实的旧基线，再全量续验。

交付与机关四件：

1. `orchestrator.ts` → `executeTool` 注入结构化 agent/chat/conversationId/callId；`recordAgentAction.ts` 只认明确 context，不从环境猜 actor。
2. `recordAgentAction` 在同一个 immediate 事务中执行业务写 + `recordEvent` + 收据；events/receipt 故障均三表全回滚。真实事件列为 `actor_kind='agent'`，channel=`chat`。
3. 复用 `toolFaceReceipts.ts` / operation_batches，新 **source=`agent_chat`**（harness 同值）；resources 包含实际 goal ID、created outcome 和原态 hash，agent_context 关联会话与 event_seq；executor 响应增 receipt_id。
4. `toolFaceReceiptRevert.ts` 中同一 executable map 驱动撤销准入与实际分派。沿用 **POST /api/tool-receipts/:id/revert**，默认入口 `revertToolReceipt` 新增 goal 创建撤销：精确删除原行 + human/ui rolled_back event + reverted 收据同事务；原 trash_notes 路径保留。新增挂载期 API/新路由均 **0**。已编辑或已有后续引用的 goal 返回 409，避免伤及后续工作。

试点：新 `services/goals.ts#createGoal(db,userId,input)` 抽出原人门闭包，内部用原 createGoalSchema，返回完整实体行；人门响应/排序/归属校验不变。create_goal 的 executor SQL 直写已移除。其注册项加入 V2 权威 registry（immediate/internal/goals:write），chat definition 从生成 manifest 投影原四字段；不扩大到 parent/exam 字段，不新增 MCP 入口。create_sub_goal、其余 case、legacy 其余定义、提案族、判断域与 client 零改。

迁移 **073_v14_agent_goal_event**：扩 events CHECK 的 goal_created；重建保留历史行、seq 高水位、索引与 append-only 触发器，schema.sql 同步；recordEvent 兼容裸 agent 和既有 actor 值；迁移自动扫描，无 init.ts 改动。仅在隔离测试库运行。

验证：新 A1 功能测试 **6/6**；events ledger **8/8**（含新增迁移保史测试）；client **167 文件/1722 tests 全绿**；shared/client/server typecheck+build 全绿；wiring **79/79、0 exemptions**，tech-debt 绿；registry/manifest/parity **5/10/10 tests** 绿；其余静态门、model **60 groups**、performance **5 scenes**、docs:check 全绿。root runtime 前 21 门逐项执行；末尾 git/secrets 按 §五.4 留 HQ，未原样运行总入口。server 全库两轮均零排除，最终未绿，详见首段。

隔离冒烟：真实 runAgent 会话“帮我建目标 X”（仅 provider.chat stub）→业务/事件/实际 ID 收据落库→现有 HTTP revert→goal 消失与撤销事件/收据；还验证撤销收据写失败时完整回滚。人门 parent/exam/default/201 与 ZodError400 同步回归。未调用真实模型。

交付合计 **21 文件，numstat +814 / -100**（含工单、本报告与生成索引）。完整清单、逐文件 numstat、迁移/撤销细节、三项失败的精确路径及证据见 [builder 审计报告](../../audits/2026-09-14-a1-write-door-builder/README.md)。numstat 对比会话编辑前备份，非 git/HEAD；构建产物与原始日志不进 audits。另仅机械再生过期 docs/agent-ops/INDEX.md。

未做项：其它动词/A2/A3、UI、判断域只读部署、用户库迁移、主观验收、git/secrets HQ 收口、commit/push/PR。全程零 git 命令/零 .git 访问，未读真实 .env key，未碰用户库，未新增依赖或安全对抗用例；新造凭据形合成值最长 12 字符。**不以工程已落替代验收已过；待上述续验完成后再翻 done。**

---

## HQ 收口(fable,2026-09-14)

builder 交付实质核验通过,其停线三红全部改判环境项:

1. **本机全量 504/504 零红**——两项 Python/MinerU 红=builder 沙箱不可执行 python(本机可);v2NotesLifecycle 哈希红本机绿(判=builder 沙箱 .tmp 基线镜像/路径差异所致,非产品缺陷,未换任何基线);
2. **机关四件抽查**:recordAgentAction 为教科书级细则实现——结构化 actor 强制(⛔环境猜)/注册+immediate+**撤销覆盖三重准入闸是代码**(hasAgentActionRevert 不过=409,"门优先于自觉"逐字兑现)/同事务三表全回滚/收据强制实际对象 ID 清单;
3. 试点全链:create_goal 人门闭包抽 services/goals.ts,两门同 service 同 zod;registry 注册 internal 面(零新 MCP 入口);迁移 073 保史扩 CHECK;revert 走既有端点扩 executable map,已编辑/被引用的 goal 409 护栏;
4. 测试面:新 A1 6/6+events ledger 8/8+client 1722/1722+wiring 79/79;测试文件两处改动核过(revert 符号改名跟踪+保史扩容,零基线偷换);builder .tmp 基线残渣已清;git/secrets 入收口单链。

A1 关门,机关成型。A2(B 族批量过户)随链派发。
