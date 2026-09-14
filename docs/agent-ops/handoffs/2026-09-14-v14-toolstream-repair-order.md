> **状态 (Status)**: ready(队列位 3)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · 工具流修复单(空枪三处+流边缘)
> **上游**: claude-log §147 provider 路审计(空参三连真凶坐实,行号在案)

# 工具流修复单

**性质**:openai.ts 参数拼装把"累积为空"与"解析失败"静默吞成 `{}`,orchestrator 真值判断再吞增量——修"无声空枪"全链。⛔改 chunk 契约形状(types.ts 语义不动),行为修复+可观测。

## 一 · 修复清单

1. **openai.ts 吞错**(~119-125/170-177):解析失败或累积为空=⛔静默 `{}`——发 tool_call_end 时附错误标记(或 error chunk),内容含工具名/finish_reason/原始串长度与前缀(**⛔记录完整参数原文**,防敏感);orchestrator 将其转为 ToolResult 错误喂回模型(模型可见可自纠);
2. **finish_reason 捕获**:读 choices[0].finish_reason;`length`=参数被截断,按 1 的错误路处理并注明截断;请求体显式设 max_tokens(与 anthropic 16384 对齐,申报取值);
3. **index 校验**:`typeof index === 'number'` 校验;缺失时挂到最近注册的调用(OpenAI 续块惯例)⛔挂 undefined 键;
4. **name/id 迟到补登**:后续 delta 携 name/id 而存值为空时补登;fallback id 全局唯一(随机+流内序)⛔跨轮碰撞;
5. **parallel_tool_calls 显式 true**(dashscope 默认关);
6. **SSE 边缘**:读尽后残余 buffer 补解析+decoder 终刷;`data:` 前缀放宽 `/^data:\s?/`;
7. **orchestrator L177 真值坑**:`chunk.tool_call?.arguments` 改语义判空——非空对象才采用;否则解析累积 JSON;解析败=生成工具级错误结果(⛔静默空参);
8. **SSE 事件带 id**:routes/agent.ts tool_start/tool_end 载荷加 tool_call id+tool_end 加 ok 标志(client AgentPanel 兼容改动申报,展示可后续)。

## 二 · 验收

定向:①空串/坏 JSON/截断三情形→模型收到可读错误⛔空参落地②并行同名调用 id 区分③index 缺失回落④parallel 显式⑤anthropic 路零回归;既有 agent/provider 测试全绿;server 全量+client 全库;真机冒烟(隔离库):重放"整理笔记"类长参数场景,空枪率=0 或错误可见。证据落 `docs/audits/2026-09-14-toolstream-repair-builder/`;git/secrets HQ 收口。

## 三 · 禁区与申报

⛔改工具语义/注册表/机关;⛔新设计安全对抗类用例;⛔碰 .git;⛔commit;⛔读 .env key 值;⛔用户库;⛔新依赖;合成凭据 ≤20 字符。Result:逐处修复行号申报+三情形测试证据+未做项。冲突停线举证。
