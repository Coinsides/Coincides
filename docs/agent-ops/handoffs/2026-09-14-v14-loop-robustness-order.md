> **状态 (Status)**: ready(队列位 5)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 循环健壮性批
> **上游**: claude-log §147 循环路审计(行号在案)

# 循环健壮性批

**性质**:orchestrator/routes 五处运行时韧性修复。⛔改工具语义/机关。

1. **流挂起永等**:超时旗改 Promise.race(流迭代 vs 超时)+AbortSignal 贯通(路由 req close/计时→provider fetch/SDK abort);
2. **工具执行零超时**:每工具 Promise.race 预算(60s,申报取值)→超时=错误 ToolResult(既有 catch 模式);
3. **8 轮耗尽静默退场**:耗尽时补一次无工具收尾调用让模型叙述末轮结果;或至少 yield 可区分的 round_limit 事件(择一实现申报);
4. **错误路丢弃已流文本**:各错误 return 前把 textBuffer 落史(标记 interrupted)——用户看见过的字必须在史里;
5. **预算失配**:请求级 deadline 传入 runAgent,轮间检查;路由 300s 平闸与 8×300s 失配消解(申报总预算取值);断线后工具写是否提交=裁**提交**(写门有收据可撤,断线⛔静默丢作业)。

验收:五处定向(挂起流夹具/慢工具夹具/8 轮夹具/错误路史落地/deadline)+agent 族回归+server 全量+client 全库;证据落 `docs/audits/2026-09-14-loop-robustness-builder/`;git/secrets HQ 收口。禁区照常;合成凭据 ≤20。Result:逐处行号+测试数字+取值申报。冲突停线举证。
