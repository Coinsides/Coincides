> **状态 (Status)**: ready
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 心智线针三 · 宣称-收据对账器
> **上游**: claude-log §143(dashscope"已保存偏好"零 save_memory 行=空头支票标本)+§146 四针+说明书§五"宣称以收据为准⛔回复文字"——本单把这条操作者纪律**机械化进面**

# 针三 · 宣称-收据对账器

**性质**:宣称-效果脱钩(claimed-effect-without-effect)已实测坐实。治法⛔语义判官(NLP 判"它是否在宣称"=高误报),治法=**让收据与宣称并排可见+红旗可数**。三件事:轮次收据摘要(服务端投影)、面上收据条(client)、观测性红旗事件(台账)。**⛔阻断/改写模型回复;⛔新写动词;⛔改写门/注册表机关。**

## 一 · 轮次收据摘要(服务端,derive⛔新表)

1. **单位=一次 runAgent 轮次**。事实源=已持久化的 tool_calls/tool_results(agent_messages 现有列)+权威注册表的读/写分类(AGENT_ACTION_TOOLS vs AGENT_READ_TOOLS)——**摘要=纯投影,零新 SQL 表零新列**;
2. 摘要形状(申报最终字段):每轮 `{write_calls:[{name,ok}], read_calls:[{name,ok}], write_ok_count, write_fail_count}`;分类以注册表现物为准,⛔手写清单;
3. **两条出口**:①流尾 SSE 新事件 `turn_receipt`(done 前发,带本轮摘要);②GET 会话消息端点对历史 assistant 消息**读时投影**同形摘要(旧轮次也能回看,零回填)。

## 二 · 面上收据条(client)

1. AgentPanel 每条 assistant 消息下渲染小收据条:有写动作→逐个 `✓/✗ 动词名`;纯读轮→不占位或极简"仅查阅";**零写动作但消息文本存在→显示「本轮无写动作」**——空头支票从此与宣称并排可见,判断权在人;
2. 视觉从简(既有 token/样式),⛔新面板⛔可交互动作;live 用 turn_receipt 事件,历史用读时投影;
3. 说明书§五「宣称以收据为准」条目顺改:收据条在哪、怎么读(防腐条款义务)。

## 三 · 观测性红旗(台账,⛔碰回复)

1. 服务端流尾检查:本轮 assistant 文本命中**窄效果宣称词表**(中英各≤10 词,如 已保存/已创建/已记住/saved/created/recorded——最终表申报)且 `write_ok_count=0` → 记 `claim_without_receipt` 事件入 events 台账(带 conversation_id/消息 id/命中词);
2. **纯观测**:⛔阻断⛔改写⛔提示注入;误报可容忍(它只是评测集的计数器——幻觉效果率的第一颗探针);
3. system prompt 宣称纪律段若需一句对齐(工具成功后才可宣称效果,措辞按收据),≤3 行顺改并申报字节差。

## 四 · 验收

1. 定向:①摘要投影(写轮/纯读轮/失败写/混合轮/旧史读时投影)②turn_receipt 事件时序(done 前)③红旗事件(命中+零收据=记;命中+有收据=不记;不命中=不记)④client 收据条三态渲染⑤既有 SSE 消费者兼容;
2. agent 族回归+server 全量+client 全库;
3. 证据落 `docs/audits/2026-09-14-claim-receipt-builder/`(**只放蒸馏件**,原始日志留 .codex-tmp);git/secrets HQ 收口。

## 五 · 禁区与申报

⛔新写动词/新表/新列;⛔语义 NLP 判官;⛔阻断改写回复;⛔碰写门/注册表/仪式机关;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;合成凭据 ≤20 字符;既有回归零排除。Result 必含:摘要字段形状+词表全文+逐处行号+测试数字+说明书条目更新申报+未做项。冲突停线举证。
