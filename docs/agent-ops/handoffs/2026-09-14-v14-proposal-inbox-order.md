> **状态 (Status)**: done
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 · 心智线针二 · 提案收件箱(临时面,Staging 前身)
> **上游**: `analysis/2026-09-14-mr-zero-anatomy-and-redesign.md` §三.2(Henry 09-14"整改当前版本"令;**明示翻案**:HQ 旧裁"⛔过渡提案面"依新令作废)+提案黑洞标本(§143)

# 针二 · 提案收件箱

**性质**:chat 提案落库即失踪(1.0 的提案专页已拆、Staging 未建)——本单立**最小收件箱**堵洞。定位=Staging 谈判桌的前身,Staging 到位整体吸收;⛔按常驻面过度建设。纯 client 面吃既有人门路由,**零新动词零 API 零射程扩**。

## 一 · 形态(最小而诚实)

1. **入口**:AgentPanel 头部「提案」区(pending 计数徽标,零 pending 时收敛不占位);点开=面板内收件箱列表(⛔新路由页);
2. **每条卡**:类型徽标+摘要(从 data 提炼,逐型申报提炼字段)+来源(chat/材料,读 conversation_id 有无)+时间;
3. **动作**:逐条 apply / discard(走既有 `POST /proposals/:id/apply|discard`);**apply 覆盖普查先行**:凡该型 apply 在服务端可用→给按钮;不可用→显示"此类提案暂不支持一键采纳"(诚实降级⛔假按钮⛔报错);
4. 操作后刷新列表+toast;CourseDetail 既有材料提案流零变;
5. system prompt 的「提案真话」段(说明书接线单产物)同步修订:提案可在 Agent 面板的收件箱查看处理(⛔再说"无面")——若接线单已收口则本单顺改并申报。

## 二 · 验收

1. 三端 typecheck/build+全门绿;定向:①收件箱渲染/计数/零态②apply 可用型走通(至少 organized_note+batch_cards 真夹具往返)③不可用型诚实降级④discard⑤CourseDetail 回归零变;client 全库+server 全量(Python/MinerU 环境红按例申报);
2. 冒烟(隔离库,浏览器不可用则申报留 HQ):chat 发提案→面板徽标亮→收件箱见卡→apply→对象落地→列表清;
3. 证据落 `docs/audits/2026-09-14-proposal-inbox-builder/`(⛔构建产物⛔原始日志);git/secrets HQ 收口。

## 三 · 禁区与申报

⛔新动词/新 API;⛔改机关;⛔动 Staging 设计射程(收件箱⛔长成谈判桌);⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符(域数据不在射程)。Result 必含:交付清单+numstat、apply 覆盖普查表(八型逐型:可用/不可用+依据行号)、摘要提炼字段表、测试数字、未做项。冲突停线举证⛔自作主张。

## Result

2026-09-14 · codex(builder) · 工程交付完成，待 HQ 复核；不代行主观验收/放行。

### 交付

- AgentPanel 头部待处理计数，点击展开面板内列表；零 pending 且收件箱关闭时不占位。每条显示类型、data 摘要、conversation_id 有无派生的聊天/材料来源与本地时间。
- 逐条沿既有 GET `/proposals?status=pending`、POST `/proposals/:id/apply|discard`，无新路由、新 API、新动词。成功移除条目、刷新列表并 toast；失败可重试；按 ID 防重复提交，旧列表响应不覆盖新结果。面板打开、对话流状态变化、窗口重新获得焦点时刷新。
- 八个现役类型均有 apply handler；material_reconciliation 空 body 仅建复核壳，按钮明确为“标记已复核”，提示“不采纳候选证据”。未知/退役型无假采纳按钮，显示“此类提案暂不支持一键采纳”，仍可丢弃。
- 使用原有 token/面板布局；320px 真浏览器窄屏检查通过。关闭空收件箱后焦点回聊天输入；处理条目时焦点留在收件箱且不强制滚回顶部。
- **§一.5 已顺改并申报**：`server/src/agent/system-prompt.ts:35` 的“提案真话”仅两句更新，明确收件箱位置与处理限制；其余 prompt 段落字节守恒断言通过。`current-state/app-operating-manual.md` 的对象地图、生命周期及能力现状三处同步。
- CourseDetail 生产代码及材料提案流零改；服务端生产逻辑除获授权的 prompt 措辞外零改。新 API 夹具测试追加到既有已接门 `v14ProposalUnification.test.ts`，未改测试机关、package scripts 或依赖。

### apply 覆盖普查（施工先行；路径均相对 server/src）

| 类型 | 可用/不可用及真实效果 | 依据行号 |
|---|---|---|
| study_plan | 可用，创建任务 | `routes/proposals.ts:197,227` |
| batch_cards | 可用，创建卡片并更新卡组计数 | `routes/proposals.ts:153,176,193` |
| schedule_adjustment | 可用，更新已有任务 | `routes/proposals.ts:272,277,284` |
| goal_breakdown | 可用，创建目标及任务 | `routes/proposals.ts:239,248,259` |
| time_block_setup | 可用，创建时间块 | `routes/proposals.ts:290,294` |
| material_map | 可用，接受材料分段 | `routes/proposals.ts:141`；`services/materialMapProposals.ts:161,181,195` |
| organized_note | 可用，创建笔记、块、placement 与来源 | `routes/proposals.ts:145`；`services/organizedNoteProposals.ts:407,426,443,449,453` |
| material_reconciliation | 可用，但本收件箱空 body 仅记复核壳，0 证据、0 决策 | `routes/proposals.ts:149`；`services/materialReconciliationProposals.ts:622,654,667` |

八型无缺失 handler。额外普查：旧 `canvas_layout` / `composition_template` 在 `routes/proposals.ts:131–132` 返回 410，客户端按不可用型降级；其他未知持久类型也不提供 apply。能力映射仅是客户端展示白名单，不改服务端裁决。

### 摘要提炼字段（data；不显示整份 JSON）

| 类型 | 字段 |
|---|---|
| study_plan | title、description、items.length、items[0].title、scheduled_date 或 date |
| batch_cards | title、description、items.length、items[0].title、template_type |
| schedule_adjustment | title、description、items.length、items[0].title、date、priority、status |
| goal_breakdown | title、description、items.length、items[0].type、title、deadline |
| time_block_setup | title、description、items.length、items[0].label、date、start_time、end_time |
| material_map | title、description、segments.length、segments[0].title 或 summary |
| organized_note | title、description、blocks.length、blocks[0].title 或 plain_text |
| material_reconciliation | title、description、candidate_groups.length、candidate_groups[0].title；复核限制由已普查的空 body handler 语义明示 |

标题优先 title，再 description，再首项预览，最后“未提供摘要”；每个文本值合并空白并限 160 字。数量来自真实数组，不存在数组时不虚报零。SQLite UTC 时间补时区后按本地时间显示；坏时间显示“时间未知”。

### 验证与证据

- 三端：client `tsc -b + vite build`、server `tsc + manifest check/copy`、shared `tsc --noEmit` 与 `tsc -b` 全通过。最终焦点修正后 client build 补验通过。
- Client 全库 **171 文件 / 1746 tests 通过**；最终定向 **2 文件 / 15 tests 通过**（9 收件箱正常用例 + 6 原 context）；CourseDetail 既有回归包含于全库，生产零变。
- Server 显式枚举全部 **84 文件**，**779 tests = 777 pass / 2 fail / 0 skip / 0 cancelled**，既有回归零排除。两红：`v2SourceMineruWiring.test.ts:60` 启动 `python.exe` ENOENT；`v2SourceRegionCells.test.ts:203` MinerU 退出 101，配置的 uv Python 3.12.11 无法启动。按例留 HQ，不改环境或排除测试。
- organized_note + batch_cards 真夹具逐条 apply 后核对笔记/块/来源/卡片落地及 pending 2→1→0；discard 无副作用；reconciliation 0 证据/0 决策已测。所在既有 suite **16/16**；prompt/context server suite **13/13**。
- 总 runtime 门拆项执行全部 **21 个非 git/secrets 组成项**，不改变原机关；最终文档索引生成及 docs:check 通过。wiring **84 wired / 0 exempted / 0 unwired**；模型契约 **60 组**，性能 **5 场景**。
- **真实 Chrome 冒烟通过**：隔离内存库 + 模拟 provider，经真实 AgentPanel/SSE/orchestrator/create_proposal/人门 apply，验证徽标→列表→卡片落地→清空，含 320×640 窄屏与空态关闭焦点。详情见 [browser-smoke.md](../../audits/2026-09-14-proposal-inbox-builder/browser-smoke.md)。无“真浏览器不可用”欠项。
- 完整检查摘要见 [verification.md](../../audits/2026-09-14-proposal-inbox-builder/verification.md)。证据目录无构建产物、无原始日志；临时 runner/夹具/日志仅在 `.codex-tmp/proposal-inbox/`。

### numstat（无 git，按本轮修改前副本逐行 LCS 比较；不是 HEAD diff）

<!-- INBOX_NUMSTAT_START -->
| 文件 | 新增 | 删除 |
|---|---:|---:|
| `client/src/components/AgentPanel/AgentPanel.contextHint.test.tsx` | 5 | 1 |
| `client/src/components/AgentPanel/AgentPanel.module.css` | 45 | 0 |
| `client/src/components/AgentPanel/AgentPanel.proposalInbox.test.tsx` | 241 | 0 |
| `client/src/components/AgentPanel/AgentPanel.tsx` | 29 | 0 |
| `client/src/components/AgentPanel/ProposalInbox.module.css` | 112 | 0 |
| `client/src/components/AgentPanel/ProposalInbox.tsx` | 54 | 0 |
| `client/src/components/AgentPanel/proposalInboxModel.ts` | 69 | 0 |
| `client/src/components/AgentPanel/useProposalInbox.ts` | 76 | 0 |
| `docs/agent-ops/INDEX.md` | 1 | 1 |
| `docs/agent-ops/current-state/app-operating-manual.md` | 3 | 2 |
| `docs/agent-ops/handoffs/2026-09-14-v14-proposal-inbox-order.md` | 85 | 1 |
| `docs/audits/2026-09-14-proposal-inbox-builder/browser-smoke.md` | 25 | 0 |
| `docs/audits/2026-09-14-proposal-inbox-builder/verification.md` | 73 | 0 |
| `server/src/__tests__/v14ContextHint.test.ts` | 7 | 5 |
| `server/src/__tests__/v14ProposalUnification.test.ts` | 83 | 0 |
| `server/src/agent/system-prompt.ts` | 2 | 2 |
| **合计（16 文件）** | **910** | **12** |
<!-- INBOX_NUMSTAT_END -->

### 未做项 / 留 HQ

- **git / secrets 收口留 HQ**：全程零 git 命令、零 `.git` 访问、零 commit；原总门尾部 `git diff --check` 与依赖 git 的 changed-file-secrets 未执行。未读 `.env` key 值、未读用户库、未新增依赖；新造凭据形合成值均 ≤20 字符；新增测试仅正常功能，无新安全对抗用例，旧回归无排除。
- 两项 Python/MinerU 环境红留 HQ；未把环境修理扩入本单。
- 冒烟使用认证后测试夹具与本地固定 provider，不涵盖真实模型质量、真实账号登录或用户主库验收。未扩 Staging、未增加编辑/批量采纳/谈判桌。主观验收与放行留 HQ。
- 无真冲突。CodeGraph CLI/MCP 与 rg 不可用后使用定域 PowerShell 读码；无索引重建。独立只读 review 的零态关闭失焦问题已修复并在定向与真浏览器复验。
