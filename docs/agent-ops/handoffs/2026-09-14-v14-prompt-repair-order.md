> **状态 (Status)**: ready(候说明书接线单收口后派——同文件串行)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · prompt 修缮单(四路审计 prompt 项全量清偿)
> **上游**: claude-log §147 审计记录+`analysis/2026-09-14-mr-zero-anatomy-and-redesign.md`;审计带行号证据,以现物复核为准(行号可能因针一交付漂移)

# prompt 修缮单

**性质**:system-prompt.ts 按审计发现全量修缮。⛔改工具/注册表/机关;纯 prompt+定向测试。

## 一 · 修缮清单(逐项,议毕申报)

1. **`week_of` 遗物**(high):调度协议引用的参数不存在——改为 `from_date`/`to_date`(与 definitions 现物一致);
2. **extra_notes 用 number_input 装自由文本**(high):collect_preferences 无自由文本型——从表单删除 extra_notes,特殊约束在对话步收集(⛔擅加新题型);
3. **四读器零提及**(high):产品说明下新增「感知能力」小节——read_note(逐页,next_page_index 翻页)/read_board(免截图读板)/read_content_groups/read_annotations_relations 各一句"何时用",加截断旗纪律(truncated/has_more 要看);~150 token 预算;
4. **"MANDATORY no exceptions"自相矛盾**(high):改题为"生成批走提案优先",直写豁免动词列为规则⛔例外;全文清剿残余四处"submit for review/approve"话术→统一为"请学生在对话中确认或驳回+说明可见性限制"口径;
5. **产品说明按门分域**(medium):材料三型"可在项目页处理"改为按**提交门**分域——材料库门提交的在项目页;凡 chat 门提交(含 organized_note)现无界面(收件箱单落地后再改此句,申报现状措辞);
6. **changelog 口吻遗物**(medium):"now/replaced/v1.7.3"改现在时陈述,删对旧版 prompt 的比较句;
7. **通用错误自纠契约**(medium):宣称纪律下加三行——工具报错=读结构化错误→修参→本轮预算内重试一次;同一调用两败=停止并如实报告;仪式类 400/409=走确认流(漂移则重新复述)⛔当故障;
8. **NEVER 锁时刻 vs 日历模式矛盾**(medium):规则处就地限定作用域(Time Block 模式不锁分钟;Calendar Event 模式学生自选显式时刻,可调);
9. **organized_note 工作流条**(low):Key Rules 提案清单补一行(course_id+源选择,⛔自写 blocks);
10. **energyLevel 死参数**(low):删参数+orchestrator 对应查询(宪法 §2 紧张源);
11. **重复段合并**(medium,量力):卡生成/学习规划/文档问答各收敛为单一权威段+紧凑表,删散落复述——申报删减 token 数;⛔改变任何行为语义。

## 二 · 验收

三端 typecheck/build+全门绿;定向:①关键词断言(week_of 消失/from_date 在/四读器名在/错误契约在)②既有 prompt 测试全绿③静态体 token 估计前后对比;server 全量+client 全库(Python/MinerU 环境红按例申报);证据落 `docs/audits/2026-09-14-prompt-repair-builder/`;git/secrets HQ 收口。

## 三 · 禁区与申报

⛔工具/注册表/机关/新 API;⛔新设计安全对抗类用例(既有回归照跑零排除);⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;新造凭据形合成值 ≤20 字符。Result:逐项修缮申报+token 前后对比+测试数字+未做项。冲突停线举证⛔自作主张。
