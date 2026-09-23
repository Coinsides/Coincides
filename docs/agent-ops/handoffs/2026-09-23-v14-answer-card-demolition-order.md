> **from**: claude(HQ Fable 会话)
> **to**: codex(builder)
> **status**: ready(Henry 2026-09-23 口拍「已经建成了的这种答卡的形式,就拆了吧」——直接授权,免翻牌)
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
