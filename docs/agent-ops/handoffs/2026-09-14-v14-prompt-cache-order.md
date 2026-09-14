> **状态 (Status)**: ready(队列位 4)
> **From**: fable(HQ) · **To**: codex(builder)
> **日期**: 2026-09-14
> **单号**: V14 心智线 · prompt 缓存单(cache_control)
> **上游**: claude-log §147(8 轮×~7K 静态体零缓存,TTFT+成本可砍 60-90%)

# prompt 缓存单

**性质**:anthropic.ts 加 cache_control ephemeral 断点——system 静态块+tools 数组+对话前缀;8 轮循环是缓存的理想形状。小改,大赚。

1. anthropic.ts:system 与 tools 设 cache_control(SDK 现版语法,申报);对话前缀断点按 SDK 支持度裁量(申报做/不做及原因);
2. openai 路:dashscope 兼容层若支持上下文缓存参数则申报评估,⛔本单实装(不同机制);
3. 验收:定向断言请求体含 cache_control;anthropic 路行为零变(回复/工具流);server 受影响面+全量;真机一次多轮对话,申报 usage 中 cache 命中字段读数(有 key 机器);
4. 禁区照常(⛔机关/⛔注册表/⛔.git/⛔commit/⛔key 值/⛔新依赖;合成凭据 ≤20)。Result:断点位置+命中读数+测试数字。冲突停线举证。
