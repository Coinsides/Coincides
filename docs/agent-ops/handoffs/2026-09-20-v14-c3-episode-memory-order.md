> **状态 (Status)**: ready(HQ 按代理权翻牌;上游=V14 plan 记忆架构「能用版」全款,前夜包 Henry 全拍)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-20
> **单号**: V14 Agent 墙 · C3 对话记忆情节层 v1
> **上游**: `plans/v14-agent-era-plan-draft.md` 记忆架构节(四层架构+「能用版」五点+三裁定:①原始对话 append-only 全量留存,压缩=视图⛔销毁;②沉淀优先(资产>语义>情节);③唤醒优于常驻)+ 现物:agent_messages(append-only,082 后带 meta)/memory 三路检索(memory quickwins 单)/14.2 读工具族/runtime-budget。**设计裁量已完成,照拍施工⛔重开设计。**

# C3 · 对话记忆情节层 v1(管家带地图,不背图书馆)

**性质**:「同一对话窗钻一年 project」的失忆病根治第一刀。唯一新造件=情节层;其余全是现物接线。

## 一 · episode 表(唯一新表,建模申报)

1. `agent_episodes`:id/user_id/conversation_id/seq/summary_text/message_range(首末 message id+时间范围)/**anchor_manifest**(触及的 note/board/item/proposal/memory id 清单,**原文保留⛔随压丢失**)/token_estimate/created_at;migration 顺延;
2. **压缩=视图⛔销毁**:原始 agent_messages 一行不动一行不删(台账三裁定①);episode 只是投影摘要;
3. 锚清单来源=该段消息的工具收据与 meta(机械抽取,⛔模型猜)。

## 二 · token 看门狗与压缩

1. 会话组装超阈(阈值申报,挂现役 runtime-budget 族配置)→ 最老一段(申报切段规则,建议按轮次组)压成一条 episode;
2. **摘要生成**:走现役 provider 通道(会话自身模型,一次调用,提示词申报);**失败回退=确定性抽取式摘要**(段内各轮首句拼接,零模型)——测试全走回退路径(⛔真实模型调用);
3. 压缩幂等:同段重压=同 episode(seq 唯一键),⛔重复行。

## 三 · prompt 组装接线

1. 组装序=常驻包(现物)+**最近 K 条 episode 摘要**(K 申报,含锚清单的 id 行)+未压缩近水消息;
2. 更老 episode ⛔常驻——**唤醒优于常驻**:现役 search_memories 面扩一路 episode 检索(FTS 摘要文本;申报接线,⛔新工具——并入现役记忆检索结果带 kind 标记);
3. 预算申报:episode 段占用上限,超限截老。

## 四 · 人面对称(A4b Episodes 页签)

1. Agent 记忆页(现物 A4 独立页)加「Episodes」页签:按会话分组列 episode(摘要/时间范围/锚清单),可查/可删(删=删 episode 行,原始消息不动——申报删除语义文案);
2. 删除走现役轻仪式(与 agent_memories 删除同级);⛔编辑(摘要是机器视图,人不改机器的账;不满意=删掉重压)。

## 五 · 验收与禁区

1. 定向:episode 建模+看门狗阈值边界+压缩幂等+回退摘要确定性+锚清单机械抽取(收据→manifest 对账)+组装序与预算+episode 检索一路+人面查删;agent 族回归+client 全库+server 全量(**全量补集含 v13WildernessExecute,实测 ~460s,文件预算 ≥600s,⛔按 120s 超时判红**);既有回归零破(C1/C2/记忆三路/收据条/runtime-budget);
2. **评测跟版:随单 2 场景**——①长会话压缩旅程(scripted 多轮灌注→看门狗触发→episode 生成+锚清单对账+原始消息零删→组装含摘要);②唤醒旅程(旧 episode 内容经记忆检索命中,常驻包不含它);
3. 闸群义务:若 episode 检索并入现役读器则指纹 `--update`+说明书 §五 同步;
4. 证据落 `docs/audits/2026-09-20-c3-episode-builder/`(蒸馏件),原始日志留 `.codex-tmp/c3-episode/`;
5. **禁区(全部带射程)**:⛔一切 git 写操作;只读 git 明文允许(含验证门内部);git 检查+secrets 两组件留 HQ,其余按「非 git/secrets N 组件」申报;**注册表/prompt 仅限本单件及义务面**(⛔动 C1/C2 交付⛔新写动词);⛔删改 agent_messages(append-only 铁律);⛔Relation/判断域⛔笔记写权;⛔TextFlow 真相 schema;⛔坐标契约;⛔新依赖;⛔真实模型调用(生产通路走现役 provider resolver,测试全走回退摘要;⛔为测试造真实调用);⛔用户库;⛔新设计安全对抗类用例(既有功能回归全库整跑明文允许零排除);合成凭据形值 ≤20 字符;新 `--sk-` token 后段 ≤18 字符。Result:episode 建模申报+看门狗阈值+摘要提示词与回退规则+组装序申报+逐件行号+两场景断言表+测试数字+说明书申报+未做项。冲突停线举证。
