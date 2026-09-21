# Agent eval 2026-09-21T09-11-24-407Z-7574a6b8

任务完成率仅表示机器断言通过比例，不代表真实模型成功率。空头支票仅为既有窄词观察计数；工具误用按 tool_end ok=false 计数，包含故意触发的超时。耗时为实际墙钟，不包含 fake clock 推进值。

| 场景 | 模式 | 断言通过/总数 | 空头支票 | 失败工具 | 用户轮/工具轮 | 毫秒 |
|---|---|---:|---:|---|---:|---:|
| 01-goal-task-journey | scripted | 12/12 | 0 | {} | 3/3 | 1535.6 |
| 02-empty-claim | scripted | 4/4 | 1 | {} | 1/0 | 1923.3 |
| 03-proposal-journey | scripted | 6/6 | 0 | {} | 1/1 | 1707.1 |
| delete-ceremony | scripted | 8/8 | 0 | {} | 2/2 | 1644.4 |
| memory-journey | scripted | 11/11 | 0 | {} | 3/3 | 1535.2 |
| 06-loop-resilience | scripted | 11/11 | 0 | {"create_proposal":1} | 2/10 | 2658.3 |
| 07-board-concept-map | scripted | 9/9 | 0 | {} | 2/2 | 5085.1 |
| 08-board-batch-revert | scripted | 12/12 | 0 | {} | 2/2 | 5526.2 |
| 09-memory-directive | scripted | 5/5 | 0 | {} | 1/1 | 11304.9 |
| 10-note-patch-journey | scripted | 10/10 | 0 | {} | 3/2 | 5162.0 |
| 11-episode-compression-journey | scripted | 20/20 | 0 | {} | 14/1 | 3116.1 |
| 12-episode-recall-journey | scripted | 6/6 | 0 | {} | 1/1 | 2284.4 |
| 13-ui-shell-journey | scripted | 8/8 | 0 | {"ui_focus_object":1} | 1/1 | 2366.2 |
| 14-rich-block-pipeline | scripted | 3/3 | 0 | {} | 0/0 | 2294.6 |

总计：125/125；空头支票 1；失败工具 2。

LLM 评分、幻觉率及 live 批跑验收均未包含。
