> **状态 (Status)**: draft → **v0.5 Fable 拍板(v0.4 + S1 复核升级的 schema 权威裁定)**;Henry 可翻;转 V2.BN.12.2 施工规格
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

### 2.1 对象指代语汇(继承既有,不造第三套)——Q3 已核

客户端已有选区语汇(`canvasEngine/selectionRangeService.ts` / `selectionDraftService.ts`):

```text
CapturedSelectionRange = { blockId, textFlowId, textUnitId, startOffset, endOffset, text }
SelectionDraftV1       = { id, phase, mode, ranges: CapturedSelectionRange[]+id, anchorRect, parentAnnotationId?, createdAt, updatedAt }
```

**工具面的指代语汇=它的持久化投影**,不另立:

```text
ObjectRef        = { kind, id, canvas_kind? }          ← kind 取**两层复用、无并集**:第一层=item_anchors target_kind 原词(block/content_range/canvas_object/table_region/image_region);第二层=真相对象类型(note/item/content_group/purpose/relation/source/source_anchor);kind=canvas_object 时以 canvas_kind 携 KIND_HANDLERS 子类(shape/table…)。Review-1 ③:原「注册表 kind 或真相对象类型」的「或」=并集出第三套词表,已废
SelectionReceipt = { refs: ObjectRef[],               ← 由 ranges 的 owner 三元组 (blockId,textFlowId,textUnitId) 派生
                     text_ranges: CapturedSelectionRange[],   ← 原样继承(含 text 摘录=Source-Ladder A-4 的摘录副本)
                     geometry?: { frame_id?, rect: anchorRect, unit: 'px'|'pdf_pt' },
                     at: createdAt }
SourceAnchorRef  = Source-Ladder §4 typed anchor
```

- owner 三元组与 03/05 链的 focus receipt、item_anchors 的 `block`/`content_range` 目标天然同构——**一套三元组贯穿选区→锚→工具入参**。
- 工具入参**只接受** ObjectRef / SelectionReceipt / SourceAnchorRef,不接受自由文本指代(解析是意图路由器的活,Agent 版)。
- 这套语汇即必修③ 选区收据系统的持久化形状;③ 的工作=把 SelectionDraftV1 投影为 SelectionReceipt 并落收据,不另造。

### 2.2 收据形状(复用既有轴,零新表)

每次工具调用落一条 `operation_batches`:

```text
source_type = 'mcp'                      ← 该轴迄今唯一取值是 'manual'(101 行),'mcp' 为第二取值
source_id   = <tool call id>
status      = 'applied' | 'proposed' | 'reverted'   ← 'proposed' 为新状态值(词汇扩展非 schema 变更)
metadata    = { tool, tier, harness, input_digest, human_entry, consent?: {mrtr_request_id, decision} }
```

- **D-4 拍**:取值 `'mcp'`(不按工具名分裂取值;工具名进 metadata)。理由:该轴表达「来源类别」,工具名是实例。
- **可撤销按资源数分档(Review-1 最重一条,基线保证问命中)**:基线无跨资源原子性(TD-6,05 主单 Review :157)。**单资源操作**:可撤销=既有 `status/reverted_at`;**跨资源操作**(同时触及正文+annotation 等):收据记录 `resources[]`,撤销为逐资源 best-effort,结果以 `revert_outcome: complete|partial` **可观察地**写回收据——**TD-6 解决前不承诺原子回滚**,工具描述须标「部分撤销风险」。宁可承诺得窄。
- **D-4 重写**:`'mcp'` 为「该轴表达来源类别」的**新纪律**;既有编码值中 `client_note_block_create`/`client_note_block_cleanup_conflict`/`source_materialization` 属操作级取值,**与新纪律不符,不追溯改写**(Review-1 ①-b;我上午的取值扫描是不完整清单,同族错,记档)。
- **声明不变式(Review-1 ①)**:`noteBlockLifecycle` 经 `findOperationBatch(id)` 的路径(:390/:951)把非 applied 当异常且不按 source_type 过滤——当前不撞是命名空间巧合,非声明不变式。**12.2a 必须**:为这些路径加 `source_type` 守卫(或等价),并落 killer:`'mcp'/'proposed'` 批次绝不被非 mcp 消费方解引用。
- **D-7 拍(015 原意已核,2026-08-21)**:015 的层次是刻意的——`operation_batches.course_id` 对 course **CASCADE**,而 `notes/note_blocks.operation_batch_id` 对 batch **SET NULL**:批次=课程级簿记随课程生死,内容行不随批次死。**V12 不改 schema**,工具面收据沿用同一生命周期;「收据是否属 I-2 的内容」张力记入 TD-6 专项统一处理。
- **词汇轴先例(已核)**:代码中 `source_type` 已写过 `'proposal'`(旧提案 apply 路径 `canvasLayoutProposals.ts:456` 等),数据层从未出现——`'mcp'` 为第三个编码取值,轴扩展有先例。
- **§10 Q1 已闭(全量 `git grep`,非抽样)**:server/src 非测试 37 处引用,**零读方按 `status` 过滤**——读方一律按 `id` 或 `source_type+source_id` 取;`source_type` 已有编码值 `manual`/`proposal`/`source_materialization`,`'mcp'` 为第四个,工具面永远写 `'mcp'` 故与按 source_type 取数的读方零碰撞。`'proposed'` 状态值可安全引入。

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

- **机械门 `check:tool-face-parity`**(接入 verify 链):对每条 `exposure:'public'` 的工具,校验 `human_entry.route` 在 `server/src/index.ts` 挂载链上真实存在、`client_call_site` 在 client 源中存在对应调用构造。**校验失败=门红。**
- **但它是必要非充分(Review-1 ②)**:client 走单一 axios 实例+模板字面量路径,源码 grep 只证「有人构造了这个 URL」,不证「有可达入口」(死代码/feature flag 全能过;「有引用≠活」与「零引用≠死」互为逆命题)。**声明口径**:本门=「无后门」的机械**必要条件**;充分性由 12.2 验收的人类入口旅程验证补(每条 public 工具的 human_entry 须在旅程分数里实际走一次)。
- **注册≠可暴露**(调研盘 §1.4 一般化):任何由注册表派生的枚举(kind/模板类型/关系类型/purpose role)经 `exposure` 闸;`__` 前缀与 `exposure:'test'` 强制不暴露(TD-4 落位)。
- 工具清单由注册表生成进 `docs/generated/`(对象边界契约 §4 同律),不手写。

### 3.1 schema 权威裁定(2026-08-21,S1 复核 FAIL(方向不成立)升级后拍)

**问题**:`ToolRegistryEntry` 若住 `shared/types`,承载不了 zod(zod 只在 server 声明);S1 实现退化为无语义 `Record<string,unknown>`,parity 脚本用 `new Function` 执行源码片段(无 module 作用域,真实条目 `ReferenceError`),机械门对伪造条目判绿=什么都没证明。

**裁定(唯一权威 + 派生产物,无第二份手写 schema)**:
1. **注册表住 server**:`server/src/toolFace/registry.ts`(TS 运行时模块),条目的 `input_schema/output_schema` 为**真 zod**,复用 `server/src/validators`;这是**唯一权威**。
2. **manifest 是派生物,不是目录**:一个生成器(`scripts/` 下,用仓库已有的 `jiti`/`tsx` 正常**模块加载**注册表——禁止 `new Function`/源码截片)把注册表序列化为 `docs/generated/tool-face-manifest.json`:name/truth/tier/exposure/scopes/human_entry + 由 zod 派生的 JSON Schema(zod 自带 `toJSONSchema` 或 `zod-to-json-schema`,二选一申报)。**parity 脚本与文档只消费 manifest**,从不解析源码。manifest 走 docs:check 同款过期检查(生成物过期=脚本没跑)。
3. `shared/types` 只保留 **manifest 的可序列化类型**(无 zod);client 若需工具描述,读 manifest 类型。
4. **legacy `toolDefinitions`(v1 agent 血统)=退役线,不是 adapter**;新注册表是唯一目录,manifest 是其派生——不出现第三套目录。legacy 随 v1 清场专项处置,V12 不碰。

**机械门口径随之修正**:
- 正控必须用**真实存在的 route + 真实 client 调用点**(如 `GET /api/notes` 与其 client 调用),负控须在隔离中证明会红;
- registry 为空时输出「0 条 public 条目受检,未证明任何 parity」并 exit 0——**不得输出 PASS 字样**(真空判绿=MED);
- `exposure:'test'` 与 `__` 前缀的拒绝逻辑必须各有一条独立 killer(S1 的条件写成了 `public && test` 永假)。

**对 S1 的处置(交 Opus 调度)**:按本裁定重开 S1(不是修正单,是**方向重置**):删除 `new Function` 路径与 shared 侧伪 schema;注册表落 server;生成器+manifest+parity 三件同单或拆两单由 Opus 定;RED-first 且 mutation 由 reviewer 亲测(三要素)。**S3 解除阻塞条件**=本裁定落地并复核 PASS。

## 4. 范围裁定(D-1 / D-2 / D-3)

- **D-1 v1 线:不暴露,声明「暂缓」**。依据 Henry 08-20 亲裁 v1 人类操作面退役权下放(decks/goals/review/statistics 待清场),**日历豁免且为 Agent 版已知衔接点**——工具面 V12 期不覆盖,Agent 版接日历时按同一注册表加入。红线声明:v1 余线的人类能做 agent 暂不能做=待退役面的自然排除,非后门。
- **D-2 空间真相:暴露「装配级」,不暴露「像素级」**。待拍-1 已把自由摆放从人的默认面移走,agent 面同步收缩——人保留的(装配/圈选锚/打散重排)即 agent 可得的;像素级 move/resize 不进工具面。读面全开(空间关系是 agent 理解版面所需)。
- **D-3 出处语汇:只暴露 045 新线 + Source-Ladder §4 层1 锚**。旧线(source_anchors/snapshots/scopes/boards,page/offset 级,自标 legacy)不进工具面;其处置挂 G-1/G-2 施工单。

## 5. 守卫层(D-5)

三层,复用优先:

1. **schema 守卫**:复用 `server/src/validators` 的 zod(同门同钥字面兑现),工具侧 `strict()`;未知字段拒收。
2. **scope 守卫**:每个 handler 内检 `scopes`(照搬 MCP 授权实践「每个 tool handler 内部检查 authInfo.scopes」);本机单用户形态下 bearer=应用既有 JWT,不上 OAuth 全套(调研盘 §2.2 判断)。
3. **意图级守卫**(新增,schema 职责之外)——**阈值规则(Henry 2026-08-21 亲拍)**:**单条删除=immediate**(留收据可撤,与人手点删同门);**批量写/批量删(>1 项)、跨 Project 操作、打包导入导出=confirm**(MRTR `input_required`,不支持时降 propose);`propose` 档写候选收据不直接落真相。
4. **输入不可信**:自由文本字段长度上限、无执行语义(外来 JS 永不执行 §6)、Origin/Host 校验(自建 transport 须自实现)。

## 6. 「出候选」档(D-6)——另建,不激活旧 proposal 管线

- 依据调研盘 §3.4:旧 proposals 管线从未运过一行、词表分裂、五真相零接入、焊在 Mr. Zero 会话上。**不激活**。
- V12 的「出候选」=**候选收据**:`operation_batches` 以 `status='proposed'` 落地,携完整 intended payload。**呈现位置(Henry 2026-08-21 拍:方案 C)**:候选的「家」=独立**待处理候选队列**(安静、可攒批、真相所在;12.2 S6 建最小列表,含「跳到现场」);受影响段落**页边一粒极淡标记点**(无文字无按钮,打开即队列中该条)——**边注点随 12.4 流式装配面落地**(页边届时才存在)。人在队列选择 apply(→`applied`,执行同一工具路径)或 discard(→`reverted`)。产房/案例库那套候选生态归 Agent 版(§6 三级)。
- 旧 `proposals` 表/服务 → **deprecation candidate**(与 annotation 层级同类:pre-pivot 遗物),物理清场随 v1 清场专项;**新候选审阅入口(12.2d)须与旧 `ProposalList.tsx` 面的退场同单落地**(Review-1:不让两套候选面并存)。

## 7. 协议栈与部署形态

- MCP **2026-07-28** 修订;`@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` 架在既有 Express 之后(无状态核心,与「后端保持服务形态」同构);MRTR 承载 `confirm` 档;缓存 `ttlMs/cacheScope` 用于 list/read 类工具(零模型荣誉榜同向)。
- 会话/编排不在工具面:harness(Claude Code/Codex/OpenCode/管家)自带编排;工具面对所有穿戴者一视同仁(不整容)。
- **Q4 更正(Review-1 ④)**:`elicitation/create`(Claude Code CLI ≥2.1.76 支持,Desktop 不支持)与 MRTR `input_required`(7-28 工具级机制)**不是一回事**;MRTR 在两 harness 的支持度**未证**。且失败模式比「不支持」更糟:Codex 侧文档称客户端未实现 handler 时**会话无限期阻塞**——不是降级是挂死。**规则(拍)**:服务端**只在客户端明确宣告支持**(能力协商/协议版本)时才发 `input_required`;否则 `confirm` **立即**降为 `propose` 并返回候选收据——propose 档由此获得第二个存在理由:**它是 confirm 的安全垫**。
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

> **P-3(12.1 旅程实走输入,2026-08-21)**:读面描述内容类型时暴露**单元级 `writing_role`**(heading/paragraph…),不得以块级 `template_key`/`block_type` 冒充「这块是什么」——块级与单元级分属两层(角色与语境同住,唯一结构律),混用会让 agent 与人在同一道门读出两种东西。
> **S2 追加规则(P-2)**:工具面收据**不显式传 `created_at`**,走 DB 默认,保证与存量同格式(时序=收据命根)。

**首发只实装:指代解析 + 读面 + 一两条写·内容(证明 tier 三档与收据链)**;其余由使用长出来(§6 成长律)。

## 9. 切割为施工单(12.2)

| 单 | 内容 | 依赖 |
|---|---|---|
| 12.2a 骨架 | 注册表类型+机械门脚本+收据写入(`'mcp'`/`'proposed'`)+MCP transport 骨架+`resolve_selection` | 无;**D-7 前置调查**随单 |
| 12.2b 读面 | 五真相读工具由注册表派生;缓存头 | 12.2a |
| 12.2c 写面 | 内容/知识写(immediate)、Relation(propose)、一条 confirm(MRTR 端到端) | 12.2a/b |
| 12.2d 候选审阅入口 | 最小「待处理候选」列表(apply/discard) | 12.2c |

每单按 Spark 排单口径(一单一交付物/设计拍死/RED 当靶);方案短笺必问两项(平行机关/基线保证)在 12.2a 前执行。

## 10. 挑刺点状态(Fable 自核四条,Opus 首读请转向整体)

| # | 问题 | 状态 |
|---|---|---|
| Q1 | `status='proposed'` 与既有消费方冲突? | **已闭**:全量 grep 零 status 读方(见 §2.2) |
| Q2 | 机械门对 `client_call_site` 的机械取证可行? | **已闭**:生成器刻意不碰 client/;机械门作**独立脚本**做源码级扫描(与调研盘 44/48 同手段),不扩生成器边界;扫源码故与打包无关 |
| Q3 | 指代语汇与既有 target_kind 对齐? | **已闭**:继承 `CapturedSelectionRange`/`SelectionDraftV1`,owner 三元组贯穿(见 §2.1) |
| Q4 | MRTR 两 harness 支持度? | **已闭(含降级)**:Claude 产品线推开,Codex 未证;confirm→propose 降级(见 §7) |

**Opus Review-1(2528b56)已做整体证伪,五条全采纳入 v0.4**:基线保证问命中(可撤销分档)/①不变式声明/①-b D-4 重写/②机械门必要非充分/③ObjectRef 分层无并集/④MRTR 更正与挂死防护。原请求文本保留备考:**Opus 首读请证伪整体**:①本稿是否违反我自立的两问(平行机关——候选收据是否算在 operation_batches 之外另造机关?我的答案是「不是,它是同一表的新状态值」,请证伪;基线保证——工具面是否试图提供后端不提供的保证?);②12.2a-d 切割是否有隐藏的跨单依赖;③任何「申报宽于实现」的措辞(本稿尚无实现,但裁定表述是否宽于证据)。

## 11. 与 Henry 相关的决定(代拍,可翻)

- 本稿所有裁定在代理授权内(产品方向可定);涉及 Henry 亲裁的仅 D-1(已由 08-20 v1 退役/日历衔接裁定覆盖)。若 Henry 对「空间真相只暴露装配级」或「Relation 写默认出候选」有不同判断,翻即可,均为方向声明可逆。

---

## Review-1（Opus 首读挑刺 · **证伪视角**）

> 日期：2026-08-21 | 定位：**Fable 点名要证伪，不是要赞同**。以下每条均落到可定位证据，凡未核的标未核。
>
> **总体：骨架我认（两个地基决定先于清单、收据轴复用、机械门方向）。以下五条是我能找到的真问题，其中一条打中设计稿自身的纪律。**

### ⭐ 最重要的一条（§10 未列，我加）：**基线保证问，反向套用到本稿，命中**

Fable 自己立的裁定纪律有一问：**本方案是否承诺了它所依附的基线不提供的保证？**

**本稿 §2.2 承诺**：「可撤销＝既有 `status/reverted_at` 机制；『大动作全收据可撤销』由此兑现，**不造新机制**」。

**但基线不提供这个保证。** 05 链已经把它钉死了 —— 05 主单 Review `:157`：

> 服务端 `annotationTruths.ts` 的 SQLite transaction 只覆盖 annotation replacement 自身，**不与 block text 构成跨资源事务**。

而 05.2 的设计裁决把它立成 **TD-6：跨资源（正文＋annotation）durable 耦合缺失，全应用级，正解需服务端支持**。

**⇒ 一个工具若同时触及正文与 annotation（写 TextFlow 段落、铸 Item 带锚、建 Relation 附收据 —— §8 里至少三类），它的收据把 `status` 翻成 `reverted` 时，两个资源里可能只有一个真的回滚了。** 收据会说「已撤销」，而事实是半撤销。

**这与 05.1 的错误是同一形状**：局部机关（那次是围栏，这次是收据的可撤销承诺）试图提供基线不提供的保证。**05.2 花了一轮才把它撤掉。**

> 📌 **本稿 §2.2 确实引了 TD-6，但引在另一条轴上**（「收据是否属 I-2 的内容」的 CASCADE 张力）。**TD-6 的主体 —— 跨资源原子性 —— 没有被应用到「可撤销」这条承诺上。**
>
> **建议**（不代拍）：把「可撤销」的承诺**按资源数分档**：单资源操作 → 可撤销；**跨资源操作 → 收据须显式标注「部分撤销风险」或直接进 `confirm` 档并在 TD-6 解决前不承诺原子回滚**。**宁可承诺得窄，不要承诺基线兑现不了的东西。**

---

### ① `status='proposed'` 与既有消费方 —— **不是必然冲突，是「靠命名空间恰好不撞」的未声明依赖**

**全扫结果**（不截断；Fable 自标「抽样 40 行非全扫」，此处补全）：

- `operation_batches` 的**生产写方 13 处全是 INSERT**；
- **读 `status` 的生产代码只有 `noteBlockLifecycle.ts` 一个文件**，但它有**三处把非 `applied` 当异常**：`:237`、`:390`、`:951`（形如 `status !== 'applied'` → 视为无效），另有 `:383`/`:945` 把 `reverted` 判为 `canceled`。

**关键区分（已核 WHERE 子句）**：

| 位置 | 是否会看见 `mcp` 批次 |
|---|---|
| `:237` | ❌ 不会 —— 同一条件里先比 `source_type !== CLIENT_CREATE_CLEANUP_CONFLICT_SOURCE_TYPE`，mcp 批次在 source_type 上就已出局 |
| `:390` / `:951` | ⚠️ **取决于 id 来源** —— 它们用 `findOperationBatch(batchId)`（`:259-264`），**该查询只按 `WHERE id = ?`，无 source_type 过滤** |

**⇒ 结论**：当前**不冲突**，但**原因是「那些调用方拿到的 batch id 来自 client_create receipt，与 mcp 批次不在同一命名空间」—— 而这不是一条被声明的不变式，是恰好成立。**

> **建议**：若采纳 `'proposed'`，把命名空间隔离**写成显式不变式并加机械断言**（例如 `findOperationBatch` 增 source_type 参数，或在 `:390/:951` 前加 source_type 前置判断）。
> **理由**：这正是 03 链二级复盘里那条「合取」的同类 —— **两个各自正确的判断，靠一个没人声明的前提才不出事。**

### ①-b ⚠️ 顺带证伪一处事实陈述

本稿两处称：「该轴迄今唯一取值是 `'manual'`」「`'mcp'` 为**第三个**编码取值」。

**全扫代码中的 `source_type` 字面量实得**：`client_note_block_create` · `client_note_block_cleanup_conflict` · `source_materialization`（另有默认 `'manual'`，及本稿称的 `'proposal'`）。

**⇒ 数据层确实只有 `'manual'`（101 行，我昨日副本法实测），但代码层至少已有 4–5 个取值。** 「第三个」不准。

**更要紧的是它动摇了 D-4 的一句理由**：D-4 说「不按工具名分裂取值；工具名进 metadata。理由：该轴表达**来源类别**，工具名是实例」——**但 `client_note_block_create` / `client_note_block_cleanup_conflict` 本身就是操作级取值，不是来源类别。既有用法已经违反了这条原则。**

> D-4 的**原则我认同**，但它应写成「**这是一条新纪律，既有取值不符，不追溯**」，而不是写成与既有用法一致。**否则将来有人读到这条理由、回头看数据，会以为自己理解错了。**

---

### ② 机械门对 `client_call_site` 的取证 —— **可机械化，但它证明的不是「无后门」要的那件事**

**已核客户端调用形态**：全应用走**一个通用 axios 实例**，路径是**模板字面量**：

```ts
api.get(`/annotation-truths/by-note/${input.note.id}`)   // annotationTruthRepository.ts:90
api.put(`/annotation-truths/by-note/${input.noteId}`, …)  // :112
```

**三个层次的问题，逐层加重**：

1. **技术可行性：部分可以。** 路由字面前缀可 grep；但**带路径参数的路由在客户端源码里没有完整字面形态**（`/notes/:id/blocks/:blockId` 永远不会以该形态出现），只能匹配前缀 + 启发式。
2. **`<file>#<symbol>` 的语义弱**：验证「符号存在」很容易；验证「**该符号确实调用了那条路由**」不可靠 —— 因为调用目标全是同一个 `api` 对象，**区分靠的是字符串实参而非调用目标**。
3. ⭐ **最要紧：它证明的是「client 源码里有人构造了这个 URL」，不是「人类有一个可达的入口」。** 死代码、被 feature flag 关掉的路径、已下线但未删的调用点，**全都能通过 grep**。

> **而这恰恰是「无后门」要保证的那件事的反面。** 我昨天在调研盘里写过「**零引用 ≠ 死**」；**它的逆命题同样成立：有引用 ≠ 活。** 我那次扫出 44/48 条路由「被 client 引用」，其中包含整条 v1 线 —— 而 v1 线正在退役。
>
> **建议**（不代拍）：把门的**断言改写准**，别让它承诺它证明不了的东西 ——
> - **保留**：`human_entry.route` 在 `index.ts` 挂载链上存在（这条**是**可靠机械断言）；
> - **降级**：`client_call_site` 改为「**声明 + 人工一次性核**」，或改为**更弱但诚实的断言**：「该路由的字面前缀在 client 源中出现」，并在门的输出里**明说它不证明可达性**；
> - **不要**把它叫作「无后门的机械证明」—— 它是**必要不充分**。名字承诺过头，将来会有人拿它当已证。

---

### ③ 指代语汇 —— **`ObjectRef` 按现写法会造出第三套词表，与本稿 §2.1「③ 不另造」的目标相抵**

**两套既有枚举，已核，且不同构**：

```text
item_anchors.target_kind（笔记侧，5 种）
  block · content_range · canvas_object · table_region · image_region

KIND_HANDLERS（画布对象，6 种）
  __test_probe · image · paragraph_block_projection · shape · table · visual_connector
```

**它们不是同一层次的东西**：`canvas_object` 是 target_kind 里的**一个类目**，而 `shape/table/image` 是那个类目**内部**的 kind。且 `table` vs `table_region`、`image` vs `image_region` **形近而义不同**（后者是"区域"，前者是"对象"）。

**本稿 §2.1 写的是**：`ObjectRef = { kind: <注册表 kind 或真相对象类型>, id }`。

> ⚠️ 那个「**或**」就是问题所在：它把**两套不同层次的枚举 + 一批真相对象类型**并成一个字段。**这正是「另造第三套词表」的定义** —— 而 §2.1 自己说「③ 不另造」。
>
> **且这条同时命中 Fable 自己的「平行机关问」**：并集出来的 `ObjectRef.kind` 是一套**平行于两套既有词表**的新词表。

**建议（不代拍）二选一**：

- **(a) 分层而非并集**：`ObjectRef = { target_kind: <5 种笔记侧目标之一>, id, object_kind?: <当 target_kind='canvas_object' 时的注册表 kind> }` —— **复用 `item_anchors` 的既有层次，不发明新层**；
- **(b) 显式承认这是新词表**，并给出它与两套既有词表的**双向映射表**与「谁是权威」的裁定。

**⇒ 无论选哪条，都不该以「不另造」的措辞掩盖它实际另造了。**

---

### ④ MRTR 的 harness 支持度 —— **有一个比「不支持」更糟的失败模式：挂死**

**先纠一处概念混同（重要）**：

| 机制 | 是什么 | 支持度 |
|---|---|---|
| **`elicitation/create`** | MCP 既有机制，server→client 请求用户输入 | **Claude Code CLI 自 2.1.76（2026-03-14）支持**（表单模式 / URL 模式，无需配置）；**Claude Desktop 不支持** |
| **MRTR `resultType:"input_required"` + `inputResponses`**（SEP-2322） | **2026-07-28 修订**引入的**工具级** elicitation，是**工具返回类型**，客户端须带答案**重试原调用** | ⚠️ **两个 harness 的支持度我未核到** —— 该修订至今约三周 |

**本稿 §1/§5/§7 三处都把 `confirm` 档绑在 MRTR 上。若 MRTR 尚未被 harness 支持，`confirm` 档没有交付路径。**

⭐ **而且失败模式比「功能缺失」更糟**：检索到的 Codex 侧说明明确 ——

> 客户端**必须**实现 elicitation handler；**否则会话无限期阻塞**（the session blocks indefinitely）。

**⇒ 不支持时不是优雅降级，是挂死。** 对一个默认档位（§8 里 Relation 写、大动作都走 `confirm`/`propose`）来说，这是必须先解决的。

**建议（不代拍）**：
1. **先核实**两个 harness 对 **MRTR（非 `elicitation/create`）** 的当前支持度 —— 这是 12.2a 的前置，不是 12.2c 的；
2. **降级路径必须是「不挂」而不是「没有」**：若 harness 不支持，`confirm` 档应**退化为 `propose`**（写 `status='proposed'` 候选收据并**立即返回**），而不是发起一个会阻塞的 elicitation。**这条同时给了 `propose` 档一个新的存在理由：它是 `confirm` 的安全垫。**
3. `elicitation/create` 在 Claude Code CLI 已支持，**可作为过渡实现路径** —— 但要注意它与 MRTR 是两套机制，选哪套要显式记，别混着写。

---

### 反向套用 Fable 自己的两问：小结

| 纪律 | 反向套用结果 |
|---|---|
| **平行机关问** | ⚠️ **命中一处**：`ObjectRef.kind` 并集出第三套词表（③）。<br>✅ **两处做对了**：收据复用既有 `source_type` 轴而非新表；`propose` 档另建而非激活死掉的旧 proposals 管线（**但建议同时写明「新候选面必须随旧面退役一起落地」**，否则会出现两个候选审阅面 —— client 里 `ProposalList.tsx` / `proposalStore.ts` 仍在）。 |
| **基线保证问** | ⛔ **命中，且是最重的一条**：「大动作全收据可撤销」承诺了 TD-6 明确指出基线不提供的跨资源原子性（见开头）。 |

### 我未核的（诚实声明）

1. **MRTR 在两个 harness 的当前支持度** —— 只核到 `elicitation/create` 的支持度，**两者不是一回事**。
2. **`:390/:951` 的调用方是否真的只拿 client_create receipt 的 batch id** —— 我核了查询无 source_type 过滤，**未逐个追调用方**。故 ① 的结论是「未声明依赖」，不是「一定会撞」。
3. **`'proposal'` 这个 source_type 取值** —— 本稿称代码中已写过（`canvasLayoutProposals.ts:456`），我的字面量扫描**未命中它**（可能写法不同）。**未核，不否认。**
