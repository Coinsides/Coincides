> **状态 (Status)**: draft(Fable 设计稿 v0;待 Opus 首读挑刺 → Fable 拍板 → 转 V2.BN.12.2 施工规格)
> **层 (Layer)**: 分析 / Analysis(必修① 设计稿)
> **日期 (Updated)**: 2026-08-21
> **权威 (Authoritative)**: 否(拍板后其裁定进 current-state 与施工单)
> **上游**: 宪章 §2/§6/§8/§10 · 调研盘 `2026-08-20-mcp-tool-face-survey.md`(D-1..D-8)· `contracts/Source-Ladder-Contract.md`(A-1..A-5)· `contracts/Notebook-Object-Boundary-Contract.md`(I-1..I-8)· Henry 08-20 裁定(v1 退役下放/日历衔接/本质=记录)

# 必修① MCP 工具面设计稿 v0 ——「末端执行器第一次实体化」

## 0. 一句话

**把应用已有的人类操作,以同一道门、同一把钥匙、附守卫与收据,暴露成 MCP 工具——工具清单最后定且可增长;先定「对象怎么被指代」与「操作留什么收据」。**(采调研盘 §4.2 切法:②③④ 依赖的不是清单,是这两个地基决定。)

## 1. 定位与不变式(从宪章直接推)

| 来源 | 不变式 | 在工具面的兑现 |
|---|---|---|
| §2 外骨骼 | 外骨骼=真相层+末端执行器+守卫+收据;**不为任何穿戴者整容** | 工具面是外骨骼的一部分;不为 MCP 改真相层形状(收据轴复用既有 `operation_batches.source_type`) |
| §10 红线 | Agent 能做的人类必须 100% 能做;同门同钥无后门 | **每个工具声明携人类入口坐标,脚本机械校验**(D-8 采纳) |
| §10 管家两层 | 能力层归应用(MCP),编排层归用户 | 工具面只暴露能力,不内置编排/计划/会话状态——**与 MCP 2026-07-28 无状态核心同构** |
| §8 分级放行 | 即时 / 出候选 / 需确认 | 每个工具声明 `tier`;需确认=MRTR `input_required`(协议原生);出候选=候选收据(见 D-6) |
| §8 选区收据 | `{对象 IDs,文字范围,几何,时刻}`=还没保存的锚 | **工具入参的对象指代=同一形状**(③ 的上游) |
| Source-Ladder A-1..A-5 | 锚按 target_kind 判别、不含语义、不可变、单位显式 | 工具返回值中的源侧引用=层1 锚,不另立语汇 |
| Boundary I-1..I-8 | 布局不改内容/删容器不删内容/端点=Item/新鲜度读时派生 | 工具面不得提供任何违反 I-* 的操作;kind 新增=注册三元组(I-8),工具枚举随注册表派生 |
| 调研盘 §2.3 外部教义 | 工具输入来自 LLM,一律不可信 | 同门同钥保证权限对等不保证输入可信:**严格 schema+允许清单+意图级守卫**,不松于人类 UI 的约束 |

## 2. 两个地基决定(先于清单)

### 2.1 对象指代语汇(ObjectRef / SelectionReceipt)

```text
ObjectRef        = { kind: <注册表 kind 或真相对象类型>, id: <runtime id> }
SelectionReceipt = { refs: ObjectRef[], text_range?: {ref, start, end},
                     geometry?: {frame_id?, rect, unit}, at: ISO-time }
SourceAnchorRef  = Source-Ladder §4 的 typed anchor(page_region|element_range|cell_range|slide_region)
```

- 工具入参**只接受** ObjectRef / SelectionReceipt / SourceAnchorRef 指代对象,不接受自由文本「第三段」「那个表格」——**解析是意图路由器(Agent 版)的活,不是工具面的活**。
- 工具返回值中的对象一律以 ObjectRef 给出;涉及源件位置的以 SourceAnchorRef 给出。
- 这套语汇即必修③ 选区收据系统的**持久化形状**;③ 不另造。

### 2.2 收据形状(复用既有轴,零新表)

每次工具调用落一条 `operation_batches`:

```text
source_type = 'mcp'                      ← 该轴迄今唯一取值是 'manual'(101 行),'mcp' 为第二取值
source_id   = <tool call id>
status      = 'applied' | 'proposed' | 'reverted'   ← 'proposed' 为新状态值(词汇扩展非 schema 变更)
metadata    = { tool, tier, harness, input_digest, human_entry, consent?: {mrtr_request_id, decision} }
```

- **D-4 拍**:取值 `'mcp'`(不按工具名分裂取值;工具名进 metadata)。理由:该轴表达「来源类别」,工具名是实例。
- 可撤销=既有 `status/reverted_at` 机制;「大动作全收据可撤销」由此兑现,不造新机制。
- **D-7 拍(015 原意已核,2026-08-21)**:015 的层次是刻意的——`operation_batches.course_id` 对 course **CASCADE**,而 `notes/note_blocks.operation_batch_id` 对 batch **SET NULL**:批次=课程级簿记随课程生死,内容行不随批次死。**V12 不改 schema**,工具面收据沿用同一生命周期;「收据是否属 I-2 的内容」张力记入 TD-6 专项统一处理。
- **词汇轴先例(已核)**:代码中 `source_type` 已写过 `'proposal'`(旧提案 apply 路径 `canvasLayoutProposals.ts:456` 等),数据层从未出现——`'mcp'` 为第三个编码取值,轴扩展有先例。
- **§10 Q1 初步信号(抽样非全扫,按 5-4 只记信号)**:抽样 40 行服务代码未见以 `operation_batches.status='applied'` 过滤的读方;12.2a 须全量 `git grep` 落实后才能据此动 `'proposed'`。

## 3. 注册表与「无后门」机械门(D-8 采纳)

```text
ToolRegistryEntry = {
  name, description, input_schema(zod, strict), output_schema,
  truth: 'content'|'knowledge'|'spatial'|'provenance'|'semantic'|'purpose'|'package',
  tier: 'immediate'|'propose'|'confirm',
  human_entry: { route: '<method> <path>', client_call_site: '<file>#<symbol>' },
  exposure: 'public'|'internal'|'test',
  scopes: string[]
}
```

- **机械门 `check:tool-face-parity`**(接入 verify 链):对每条 `exposure:'public'` 的工具,校验 `human_entry.route` 在 `server/src/index.ts` 挂载链上真实存在、`client_call_site` 在 client 源中真实被调用(与 docs-inventory 同一机械手段,不手写清单)。**校验失败=门红**——「无后门」从纪律变成会红的断言。
- **注册≠可暴露**(调研盘 §1.4 一般化):任何由注册表派生的枚举(kind/模板类型/关系类型/purpose role)经 `exposure` 闸;`__` 前缀与 `exposure:'test'` 强制不暴露(TD-4 落位)。
- 工具清单由注册表生成进 `docs/generated/`(对象边界契约 §4 同律),不手写。

## 4. 范围裁定(D-1 / D-2 / D-3)

- **D-1 v1 线:不暴露,声明「暂缓」**。依据 Henry 08-20 亲裁 v1 人类操作面退役权下放(decks/goals/review/statistics 待清场),**日历豁免且为 Agent 版已知衔接点**——工具面 V12 期不覆盖,Agent 版接日历时按同一注册表加入。红线声明:v1 余线的人类能做 agent 暂不能做=待退役面的自然排除,非后门。
- **D-2 空间真相:暴露「装配级」,不暴露「像素级」**。待拍-1 已把自由摆放从人的默认面移走,agent 面同步收缩——人保留的(装配/圈选锚/打散重排)即 agent 可得的;像素级 move/resize 不进工具面。读面全开(空间关系是 agent 理解版面所需)。
- **D-3 出处语汇:只暴露 045 新线 + Source-Ladder §4 层1 锚**。旧线(source_anchors/snapshots/scopes/boards,page/offset 级,自标 legacy)不进工具面;其处置挂 G-1/G-2 施工单。

## 5. 守卫层(D-5)

三层,复用优先:

1. **schema 守卫**:复用 `server/src/validators` 的 zod(同门同钥字面兑现),工具侧 `strict()`;未知字段拒收。
2. **scope 守卫**:每个 handler 内检 `scopes`(照搬 MCP 授权实践「每个 tool handler 内部检查 authInfo.scopes」);本机单用户形态下 bearer=应用既有 JWT,不上 OAuth 全套(调研盘 §2.2 判断)。
3. **意图级守卫**(新增,schema 职责之外):按 `tier`+阈值——批量写 >N 项、删除、打包导入导出、跨 Project 操作 → 升 `confirm`(MRTR `input_required`,用户在 client 作答后重试);`propose` 档写候选收据不直接落真相。阈值为配置,默认保守。
4. **输入不可信**:自由文本字段长度上限、无执行语义(外来 JS 永不执行 §6)、Origin/Host 校验(自建 transport 须自实现)。

## 6. 「出候选」档(D-6)——另建,不激活旧 proposal 管线

- 依据调研盘 §3.4:旧 proposals 管线从未运过一行、词表分裂、五真相零接入、焊在 Mr. Zero 会话上。**不激活**。
- V12 的「出候选」=**候选收据**:`operation_batches` 以 `status='proposed'` 落地,携完整 intended payload;人在既有对象的审阅入口(最小:一个「待处理候选」列表)选择 apply(→`applied`,执行同一工具路径)或 discard(→`reverted`)。产房/案例库那套候选生态归 Agent 版(§6 三级)。
- 旧 `proposals` 表/服务 → **deprecation candidate**(与 annotation 层级同类:pre-pivot 遗物),物理清场随 v1 清场专项。

## 7. 协议栈与部署形态

- MCP **2026-07-28** 修订;`@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` 架在既有 Express 之后(无状态核心,与「后端保持服务形态」同构);MRTR 承载 `confirm` 档;缓存 `ttlMs/cacheScope` 用于 list/read 类工具(零模型荣誉榜同向)。
- 会话/编排不在工具面:harness(Claude Code/Codex/OpenCode/管家)自带编排;工具面对所有穿戴者一视同仁(不整容)。
- 单用户本机/私有云:bearer 复用应用 JWT;多穿戴者并发细则在停车场。

## 8. 工具清单 v0(只定「形状类别」,逐步长)

| 类别 | 形状 | tier | 备注 |
|---|---|---|---|
| 指代解析 | `resolve_selection(SelectionReceipt) → ObjectRef[]` | immediate | ③ 的地基;零模型 |
| 读·五真相 | `list_*/get_*` 按 truth 分组(note/textflow/item/group/purpose/relation/source/anchor/placement) | immediate | 随注册表派生 |
| 写·内容/知识 | create/update item/group/purpose 成员、写 TextFlow 段落 | immediate(单项)/confirm(批量) | 经 zod+意图守卫 |
| 写·装配 | 把对象放入流/区域、圈选→锚 | immediate | 装配级,非像素级 |
| 写·出处 | 建层1 锚(typed)、铸 Item | immediate | 走 Source-Ladder 语汇 |
| 语义 | 建/撤 Relation(端点=Item,附判断收据) | propose 默认 | 判断类写操作默认出候选 |
| 大动作 | package export/import、批量删除 | confirm | MRTR |
| 不暴露 | auth/settings/embedding/agent 旧面/v1 线/`__`/test | — | 守卫面本身不是工具 |

**首发只实装:指代解析 + 读面 + 一两条写·内容(证明 tier 三档与收据链)**;其余由使用长出来(§6 成长律)。

## 9. 切割为施工单(12.2)

| 单 | 内容 | 依赖 |
|---|---|---|
| 12.2a 骨架 | 注册表类型+机械门脚本+收据写入(`'mcp'`/`'proposed'`)+MCP transport 骨架+`resolve_selection` | 无;**D-7 前置调查**随单 |
| 12.2b 读面 | 五真相读工具由注册表派生;缓存头 | 12.2a |
| 12.2c 写面 | 内容/知识写(immediate)、Relation(propose)、一条 confirm(MRTR 端到端) | 12.2a/b |
| 12.2d 候选审阅入口 | 最小「待处理候选」列表(apply/discard) | 12.2c |

每单按 Spark 排单口径(一单一交付物/设计拍死/RED 当靶);方案短笺必问两项(平行机关/基线保证)在 12.2a 前执行。

## 10. 交给 Opus 首读的挑刺点(不是设计判断,是请它证伪)

1. `status='proposed'` 是否与既有 `operation_batches` 消费方(16 个服务)的任何假设冲突(如把非 applied 当异常)?
2. 机械门对「client_call_site」的校验在 client 打包后是否仍可机械取证(源码级 grep 足够吗)?
3. 指代语汇是否与 `item_anchors` 既有 `target_kind` 五种笔记侧目标天然对齐(避免第三套指代)?
4. MRTR 在 Claude Code / Codex 两个 harness 的当前支持度(若 harness 不支持 input_required,confirm 档的降级路径是什么)?

## 11. 与 Henry 相关的决定(代拍,可翻)

- 本稿所有裁定在代理授权内(产品方向可定);涉及 Henry 亲裁的仅 D-1(已由 08-20 v1 退役/日历衔接裁定覆盖)。若 Henry 对「空间真相只暴露装配级」或「Relation 写默认出候选」有不同判断,翻即可,均为方向声明可逆。
