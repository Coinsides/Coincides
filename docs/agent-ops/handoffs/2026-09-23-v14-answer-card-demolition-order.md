> **from**: claude(HQ Fable 会话)
> **to**: codex(builder)
> **status**: done(Henry 2026-09-23 口拍「已经建成了的这种答卡的形式,就拆了吧」——直接授权,免翻牌)
> **单号**: V14 · 答卡 v1 拆除单(小单)
> **上游**: 会议记录 09-16 §三点三十(答卡废除 verdict 全案)/ 翻牌简报第 2 件终拍(2c 修订)/ 路线图 N6 废戳 / C2 原单 `2026-09-20-v14-c2-intent-router-order.md` §五(被拆对象的出生记录)

# 答卡 v1 拆除单

## 一 · Verdict(方向已拍,⛔重开)

Henry 09-23:就地答(圈选→页边答卡)除原子小问外皆是注意力碎裂——思维有连续性,回答必须回会话面(连续对话流)。**拆答卡呈现,⛔拆圈选指认**。

## 二 · 拆什么 / 留什么(核心刀线)

**拆(答卡=在哪儿答)**:
1. client `NoteAnswerCards.tsx` 页边答卡投影组件整体移除(含定位/散去/插入为块两出口 UI);
2. client `agentStore.ts` 中 answer_card meta 的读取与投影状态(约 :234 一带,以现物为准);
3. server `orchestrator.ts` 停写 `agent_messages.meta.answer_card`(约 :154/:384,以现物为准);
4. 「插入为块」作为**答卡出口**的动线移除;`useNoteAgentHumanEditor` 若同时服务 note_patch/其他人门路径,**只拆答卡专属分支,共享路径不动**(先查用例再动刀,动手前看现物);
5. 操作说明书 `docs/agent-ops/current-state/app-operating-manual.md` §C2「圈块问 Agent」段改写:圈选与选区语境保留,回答呈现在会话面板,页边答卡与插入出口已废。

**留(圈选=指哪儿,一根汗毛都不许动)**:
1. 选区→`contextHint` selection 载荷全链路(选块 1-32、read_note 投影拼语境、8 页/16000 字符预算、截断申报)原样保留,回归必须全绿;
2. migration 082 的 `meta` JSON 列保留(通用列,`intent_plan` 等还住着);⛔新 migration ⛔改 082;
3. 多轮最终正文投影修复(server 权威 content + client done/EOF 采用)——它服务会话面正确性,**⛔随手回滚**;只摘 answer_card 专属部分;
4. 会话历史:旧消息 meta 里既存的 answer_card 键不清洗(死数据无投影即无害),⛔数据迁移。

## 三 · 测试面(功能/回归,单内冒烟)

- 答卡相关用例改写为**负断言**(回答不再产生页边投影;meta 不再写 answer_card)或删除,⛔留死测试;
- 选区 contextHint 往返、note_patch 全生命周期、收件箱、收据条既有回归**零破**;
- 定向:client 受影响文件族 + server C2/Agent 邻接定向;全库压测留 HQ 收口,⛔马拉松。

## 四 · 纪律(照抄现役)

⛔一切 git 写操作(commit/push/PR 由 HQ);⛔读 .env key 值,key 零出境;⛔真实模型调用(scripted provider);⛔用户库接触;合成凭据表单值 ≤20 字符;措辞中性(测试面=功能/回归)。证据落 `docs/audits/2026-09-23-answer-card-demolition/`,回执追加本单文件尾部(status 改 done + 写点/测试数字/未做清单)。

## 五 · 不在本单射程

岸案 UI(开阔地准备区/河独立窗)整体施工——候工作台线按岸案重排后另单;宋史手册样张与视觉宪章文本(样张=设计小说,HQ 已处理记录侧)。

## Result · Codex builder · 2026-09-23

**状态：done。测试面：功能/回归定向。**

### 写点

1. 删除 `NoteAnswerCards.tsx`、专属 CSS 与旧正例测试,移除 `NoteWritingSurfaceLayer` 的答卡挂载。
2. `agentStore` 不再接收答卡投影状态,现役 meta 仅投影 `intent_plan`;保留持久 message ID 与服务端最终 content,done/EOF 均采用权威正文,且不依赖 meta 是否存在。
3. `orchestrator` 删除 `answer_card` 构造及 meta UPDATE;通用 `message_meta` 继续提供最终持久正文,覆盖选区/普通对话。共享类型删除答卡声明,旧历史 meta 不清洗。
4. 经消费者审计,`insertAnswer` 只服务答卡。仅删除该方法、hook 专属实现及调用参数;`applyPatch`、共享保存/等待/失效判断/回滚/Undo/Redo 保留。
5. 操作说明书 C2「圈块问 Agent」已改为选区语境保留、回答进入会话面板、答卡及其插入出口退役。

### 测试数字与证据

- Client 主定向：11 文件 **87/87**;共享编辑及撤销：4 文件 **35/35**。
- Server C2/Agent 邻接：9 文件 **121/121**。最终合计 **24 文件、243/243 通过、0 失败**。
- 前后端 TypeScript `--noEmit --incremental false`、Agent 知识事实检查、`git diff --check` 均通过。
- 答卡用例已改负断言或删除;覆盖旧 SSE 不再生成答卡状态、真实笔记页无答卡/插入出口、新消息不写答卡 meta、旧行完整保留,并保留选区往返/预算/截断、note_patch 生命周期、计划卡、收件箱和收据回归。
- 服务端初跑 **110/121**（11 个旧事件尾位置断言失败）,中间 **120/121**（新增测试 helper 未返回 ID）,均已修正并保留原始日志;最终全绿,不把初跑失败计入最终通过数。
- 独立只读边界复核：23 个受保护文件与开工 HEAD 内容一致（仅归一化行尾作比较）;83 个 migration 文件清单一致且无 diff;限定源码/scripts 的1001个非测试文件中答卡模式零命中,退役组件三文件已不存在。无放行/主观验收结论。
- 证据总入口：[docs/audits/2026-09-23-answer-card-demolition/README.md](../../audits/2026-09-23-answer-card-demolition/README.md);含命令、数字、日志、隔离运行器及独立边界复核。

### 未做清单 / 保留边界

- 未动选区 contextHint 全链路,未改 migration 082 或新增 migration,未清洗历史答卡键,未回滚多轮最终正文修复。
- 未改 note_patch 共享人门、收件箱与收据生产路径;未施工岸案 UI、河独立窗、样张或视觉宪章。
- 未执行全库 `verify:v2-bn8-runtime`、全库测试或压测：按本次直接指令与本单§三限定定向功能/回归,全库收口留 HQ。
- 未执行任何 git 写操作、commit/push/PR/merge;未读取 `.env` key 值、未调用真实模型、未接触用户库。测试使用 scripted/mock provider、内存 SQLite/临时目录,无凭据表单交互。
- 未做真实浏览器旅程或用户主观验收;未修改 agent 操作指令/权限配置;开工已有未跟踪文件未动。
