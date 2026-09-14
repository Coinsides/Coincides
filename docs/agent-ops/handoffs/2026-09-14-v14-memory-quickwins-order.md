> **状态 (Status)**: ready(队列位 6)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 记忆速赢批
> **上游**: claude-log §147 记忆路审计;**⛔碰生命周期/整合**(睡眠学试点押设计场)

# 记忆速赢批

1. **环境注入换好检索器**:retrieveMemories 的朴素 LIKE(对中文近盲)改走 search_memories 已有的三路合并(语义>FTS5>LIKE,executor 现物)——抽成共享 service 双端调用⛔复制;限 5 保持;
2. **嵌入覆盖补齐**:extractMemories 落库路径也生成嵌入(save_memory 已有的 fire-and-forget 模式);异步失败入日志⛔静默丢;
3. **save_memory 去重**:插入前精确/近似查重(FTS 或嵌入距离,申报口径),命中=返回既有 id⛔重复行;
4. **last_accessed 批量化**:逐行 UPDATE 循环改单条 IN 批;
5. **getDocumentSummaries 排序**:补 ORDER BY created_at DESC(现状=无序 LIMIT 10,新上传的反而看不见);
6. **死码清理**:summarizeOldMessages 未接线=删或接(裁:**删**,史压缩归睡眠学批);extractMemories 无用参数删;英文正则抽取器=**保留但申报现状**(改造归设计场,⛔本单重写);
7. **史序韧性**:getConversationHistory 排序补 rowid 次键,防同毫秒对拆散。

验收:定向(中文检索命中夹具/去重/批量 UPDATE/排序/次键)+agent 族回归+server 全量+client 全库;证据落 `docs/audits/2026-09-14-memory-quickwins-builder/`;git/secrets HQ 收口。禁区:⛔生命周期/衰减/整合;⛔50 条窗口改动;其余照常;合成凭据 ≤20。Result:共享 service 落点+逐项行号+测试数字。冲突停线举证。
