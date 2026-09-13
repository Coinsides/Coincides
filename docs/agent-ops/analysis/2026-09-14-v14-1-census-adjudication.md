> **状态 (Status)**: active(14.1 重铸拆单依据;逐项裁定=对既有宪法/细则的适用,零新立法)
> **层 (Layer)**: 分析 / HQ 裁定书
> **日期**: 2026-09-14
> **上游**: `2026-09-14-v14-1-executor-census.md`(K-0 普查,§6.4 候裁索引)+`design/agent-constitution-bylaws.md`(实施法)+`current-state/agent-constitution.md`
> **候 Henry 复核**: 是——逐项判断点在各裁定内;晨检时任何一条不认,拦对应工单即可(拆单按裁定序,可单条回滚)

# 14.1 普查候裁十项 · HQ 裁定书

## 一 · 归类五项

1. **create_task(拒绝桩)→ B 族,随重铸恢复**:任务=计划域 agent-born 小对象、可逆、用户点名要——非判断域非用户文字;恢复条件=过户到人门 service+actor=agent 同事务入 events+收据+撤销覆盖(即 14.1 全套门),⛔提前单独恢复。
2. **create_card(拒绝桩)→ 退役**:卡片=知识内容,现行 create_proposal 已有卡提案型且实测走通(J3)——保留双通道=同一效果两条路,违"唯一写门"精神。动词退役出 definitions,拒绝桩删除;卡片创建唯一通道=提案。
3. **create_proposal → C 族(自域)**:提案=Agent 对人说话的信道,人类不向自己提案,无人门对称需求;但创建层补齐 `proposal_issued` 事件(词已在闭集,census §5.2 记未接)——自域≠免记账。
4. **search_memories → C 族(自域)**:agent memories=Agent 工作资料(Henry #6 既裁真删⛔回收站,管理面在 settings);access-touch(last_accessed UPDATE)判自域元数据写,⛔入 events(非域写),⛔补人门搜索口(需求出现再议)。
5. **save_memory → C 族(自域)**:同上;创建人门不补(人类经 settings 面管理已够);按细则 agent 自产物条款:未被人核准/引用=可自删留收据。

## 二 · 语义与仪式四项

6. **complete_task ① 语义**:「完成」=对"用户做完了这件事"的事实断言=判断域内核。裁:恢复=**仅 chat 转录通道**——用户在对话中亲口说完成(逐项作答),记 `actor=human, via=chat, 原文锚`(细则 §一.2 逐字适用);Agent 自行推断完成=禁,工具入参强制带 `user_utterance_anchor`,缺锚=拒绝。
7. **delete_time_block ② 仪式**:硬删+FK 置空=效果不可逆。裁:恢复但挂细则 §二仪式——复述确认(chat 一等门,元规则 3):Agent 复述「删除周 X 晚 Y 时间块,挂着的任务将解绑」→用户明确应答=当次授权(结构化对象+单次核销)→执行+事件层收据(含解绑任务清单)。
8. **section order 默认**:裁 **MAX+1**(追加到尾)——人门语义,两端统一;executor 现 0 值行为废。
9. **task-card 批量政策**:裁**跟人门现语义**(INSERT OR IGNORE 跳过+计数)——同门=同语义;但收据义务补齐:返回**实际创建的链接 ID 清单**(census 记现状只返计数),收据无清单=不合格。

## 三 · 制度一项

10. **legacy 注册面过渡地位**:裁**过渡面,以过户终局**——14.1 重铸=写动词逐个过户到 V2 权威注册表(tier/confirm/receipt 全套),chat provider 的 definitions 变为注册表投影;过户未完成前 legacy 面维持现状运行(⛔判翻窗:它是待清偿的历史,不是新开的窗),新增动词一律⛔入 legacy 面。

## 四 · 纯读 D 族与读 GAP:缓议

D 族 16 项+读聚合 GAP(suggest/weekly_review/search_documents hybrid)零宪法写风险——**⛔入 14.1 重铸批**,维持 executor 现状读逻辑;读共用抽取记 tech-debt,后续搭车。理由:重铸预算全花在写门(宪法生效面),读投影差异不流血。

## 五 · 拆单序(依裁定)

- **14.1-A1 · 写门公共机关+试点动词**:agent 写路公共地基——executor 入口带 actor/channel、`recordAgentAction` 包装(与业务写同事务入 events,actor=agent)、agent 写收据(operation_batches 直路)+撤销覆盖准入;**试点=create_goal 全链过户**(最简纯 INSERT,人门 service 抽取自 R/goals.ts:166 闭包)——一个动词端到端走通全套门,机关成型;
- **14.1-A2 · B 族批量过户**:其余 8 写动词按 A1 机关批量过户(含 complete_task 挂裁定 6 转录门/delete_time_block 挂裁定 7 仪式/create_task 恢复/link_task_cards 收据清单/section MAX+1);create_card 退役同批;
- **14.1-A3 · 提案族统一**:agent 5 型+材料库 3 型合枚举/organized_note 入 chat 枚举/board_arrangement+note_patch 新型/proposal_issued 接线——照 plan §14.1 原文;
- 安家 S 案(正文写门)=A3 后独立战役,照 plan。
