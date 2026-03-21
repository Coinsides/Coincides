# Coincides — 需求池（Product Backlog）

> 所有已确认的待开发需求。按功能领域分组，标注优先级、分配版本和当前状态。
> 新需求先加到这里，版本归属是第二步。
>
> 最后更新：2026-03-21
> 来源：Session 1 ~ Session 6 会议记录 · 全面需求汇总

---

## 状态说明

| 标记 | 含义 |
|------|------|
| `pending` | 已确认，尚未开始 |
| `in-progress` | 开发中 |
| `done` | 已完成 |
| `deferred` | 暂缓，等待后续版本 |

---

## Time Block 系统

### Layer 1（可视化补全）

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| TB-L1a | 24h 刻度线 + 横线网格 | 低 | v1.4 | done |
| TB-L1b | Time Block 时间标签显示 | 低 | v1.4 | done |
| TB-L1c | 右键编辑/删除 Time Block | 低-中 | v1.4 | done |

### Layer 2（重构：图层嵌套 + 编辑模式 + 任务关联）

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| TB-R1 | 周视图 Bug：框选 Time Block 后误触 Day Detail 面板 | 低 | v1.4 | done | v1.4 hotfix 修复 |
| TB-R2 | 图层嵌套渲染：长 Block 包裹短 Block，缩进显示 | 高 | v1.5 | done | |
| TB-R3 | 去掉默认网格线，浮空预览视图 | 中 | v1.5 | done | |
| TB-R4 | 动态时间范围：视图起止 = 当周最早/最晚 Block ± 留白 | 中 | v1.5 | done | |
| TB-R5 | 编辑模式切换：图标按钮进入/退出编辑模式 | 中 | v1.5 | done | |
| TB-R6 | 网格线显示偏好开关 | 低 | v1.5 | done | |
| TB-R7 | 删除重叠警告，嵌套叠加为正常功能 | 低 | v1.5 | done | |
| TB-R8 | 任务显式关联 Time Block（DB + UI） | 高 | v1.5 | done | |
| TB-R9 | Agent 读取可用学习时间 | 中 | v1.5 | done | |
| TB-R10 | 单层约束：每天最多 1 个 Study Block | 低 | v1.5 | done | |
| TB-R11 | 创建交互重构：框选后编辑面板 | 中 | v1.5 | done | |
| TB-R12 | 全局内容区拓宽 | 低 | v1.5 | done | |

### Layer 2.1（v1.5.1 UX 优化）

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| TB-P1 | Bug：框选后右键创建 TB 不生效 | 低 | v1.5.1 | done |
| TB-P2 | 类型即名字：去掉独立 label 字段 | 中 | v1.5.1 | done |
| TB-P3 | 开放类型系统：预设 + 自定义类型 | 中 | v1.5.1 | done |
| TB-P4 | 优先级 Badge | 中 | v1.5.1 | done |
| TB-P5 | Day Detail 居中浮层 | 低 | v1.5.1 | done |

### Layer 2.2（v1.5.2~v1.5.3 补充）

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| TB-P6 | Task-Block 关联 UI 修复 | 低 | v1.5.2 | done | hover 面板 + allDay 隐藏 |
| TB-P7 | Agent TB 工具（create/update/delete_time_blocks） | 中 | v1.5.3 | done | 原 TB-L2c |
| TB-P8 | 问卷收集 + 双模式排期 + 文档感知 | 高 | v1.5.3 | done | 含 PreferenceForm + TimePickerInline |

### Layer 3（高级交互）

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| TB-L2a | Time Block 模板系统（预设日程模板） | 高 | v1.9 | pending |
| TB-L2b | 格子点选创建交互（替代拖拽框选） | 中 | v1.9 | pending |

---

## 卡片数据模型升级

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| CD-1 | 卡片详情视图放大 | 低 | v1.4 | done | |
| CD-2 | 所有卡片类型增加 Example 字段 | 中 | v1.4 | done | |
| CD-3 | Theorem 增加 Condition 字段 | 中 | v1.4 | done | v1.3 已实现 |
| CD-4 | AI 写推导过程按钮（仅 Theorem） | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| CD-5 | Review "撕胶带"遮挡交互 | 中-高 | Backlog | deferred | 原 v1.6，已推迟 |
| CD-6 | 各类型独立复习模板系统 | 高 | v1.8 | pending | |

---

## Course 中心化 + UI 结构重组（v1.6 新增）

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| CU-1 | Course 详情页（Goals + Decks + Docs 聚合展示） | 中 | v1.6 | done | `/courses/:courseId` 路由 |
| CU-2 | 侧边栏移除 Review 导航项 | 低 | v1.6 | done | Review 改为 Deck 卡片按钮入口 |
| CU-3 | Deck 列表 + Course 详情 Review 按钮 | 低 | v1.6 | done | 跳转 `/review?deckId=xxx` |
| CU-4 | Card Section 强制化（DB 迁移 + API + Agent + UI） | 中 | v1.6 | done | 禁止 section_id=NULL |
| CU-5 | Agent Section-First Card Creation 协议 | 低 | v1.6 | done | 先建章节再建卡片 |

---

## Task-Card 联动（v1.7 规划）

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| TC-1 | `task_cards` M:N 关联表 + CRUD API | 中 | v1.7 | pending | 支持任务级 + checklist 条目级关联 |
| TC-2 | Agent `link_task_cards` 工具 | 低 | v1.7 | pending | |
| TC-3 | TaskViewModal（只读查看模式） | 中 | v1.7 | pending | 点击任务→查看→编辑 |
| TC-4 | CardBubble 组件（任务查看中的卡片气泡） | 中 | v1.7 | pending | |
| TC-5 | Agent Task-Card 关联协议 | 低 | v1.7 | pending | |

---

## 复习体验升级

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| RV-1 | 复习模式选择（翻面/填空/选择题/混合） | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| RV-2 | 填空题模式 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| RV-3 | 选择题模式 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| RV-4 | 混合模式 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| RV-5 | 复习模式偏好 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| RV-6 | Time Block 排期 | 中 | Backlog | deferred | 原 v1.6，已推迟 |

---

## 错题本系统

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| WB-1 | 错题记录（评分为 1 的卡片自动标记） | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| WB-2 | 错题本入口 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| WB-3 | 错题本复习 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| WB-4 | 错题本移除 | 中 | Backlog | deferred | 原 v1.6，已推迟 |
| WB-5 | Agent 感知（get_weak_cards 工具） | 中 | Backlog | deferred | 原 v1.6，已推迟 |

---

## 成就系统

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| AC-1 | 成就数据模型 | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| AC-2 | 成就类型定义（里程碑型） | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| AC-3 | 成就检测引擎 | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| AC-4 | 成就展示页面 | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| AC-5 | 解锁通知 | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| AC-6 | 设计宪法合规 | 中 | Backlog | deferred | 原 v1.7，已推迟；无 streak 型 |

---

## Statistics 深度洞察

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| ST-1 | 复习洞察（记忆保持率曲线、卡片难度分布） | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| ST-2 | 学习节奏 | 中 | Backlog | deferred | 原 v1.7，已推迟；被动展示 |
| ST-3 | 课程深度 | 中 | Backlog | deferred | 原 v1.7，已推迟 |
| ST-4 | 数据导出 CSV | 中 | Backlog | deferred | 原 v1.7，已推迟 |

---

## Goal 多依赖 DAG

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| GD-5 | 多依赖选择 UI | 中 | v1.8 | pending |
| GD-6 | DAG 可视化图 | 中-高 | v1.8 | pending |
| GD-7 | Agent DAG 排期 | 中-高 | v1.8 | pending |
| GD-8 | 动态优先级 | 中 | v1.8 | pending |

---

## 基础设施 / 分发

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| INF-1 | Electron 打包 + 分发 | 高 | v1.9 | pending |
| INF-2 | 通知系统 | 中 | v1.9 | pending |
| INF-3 | 自动化测试 | 高 | v1.9 | pending |
| INF-4 | 安全加固 | 中 | v1.9 | pending |

---

## 统计摘要

| 领域 | 总条目 | done | pending/deferred |
|------|--------|------|------------------|
| Time Block 系统 (L1~L2.2) | 21 | 21 | 0 |
| Time Block 高级交互 (L3) | 2 | 0 | 2 |
| 卡片数据模型升级 | 6 | 3 | 3 |
| Course 中心化 (v1.6) | 5 | 5 | 0 |
| Task-Card 联动 (v1.7) | 5 | 0 | 5 |
| 复习体验升级 | 6 | 0 | 6 |
| 错题本系统 | 5 | 0 | 5 |
| 成就系统 | 6 | 0 | 6 |
| Statistics 深度洞察 | 4 | 0 | 4 |
| Goal 多依赖 DAG | 4 | 0 | 4 |
| 基础设施 / 分发 | 4 | 0 | 4 |
| **合计** | **68** | **29** | **39** |

---

## 设计宪法合规备注

所有需求均须符合 [设计宪法](audits/design-constitution-v1.3.md) 三条核心规则：

1. **不替用户做决定** — AI 只拆解、只建议、只执行
2. **不监控用户** — 不追踪用时、不判断精力、不主动生成用户没要求的东西
3. **不制造挫败感** — 不锁死时间、不自动回顾失败、跳过任务零惩罚

特别关注项：
- AC-6：成就系统禁用 streak 型和完成率型指标
- ST-2：学习节奏为被动展示，不推送不对比
- CD-4：AI 推导为用户主动触发
- WB-4：错题本命名为"需要加强"，不强调"错误"
