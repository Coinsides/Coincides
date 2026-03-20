# Coincides — 需求池（Product Backlog）

> 所有已确认的待开发需求。按功能领域分组，标注优先级、分配版本和当前状态。
> 新需求先加到这里，版本归属是第二步。
>
> 最后更新：2026-03-20
> 来源：Session 1 + Session 2 + Session 3 会议记录 · 全面需求汇总

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
| TB-R1 | 周视图 Bug：框选 Time Block 后误触 Day Detail 面板 | 低 | v1.4 | done | v1.4 hotfix 修复：点击日期数字才开 Day Detail |
| TB-R2 | 图层嵌套渲染：长 Block 包裹短 Block，缩进显示 | 高 | v1.5 | pending | 按时长排序 z-index，子 Block 内缩 padding |
| TB-R3 | 去掉默认网格线，浮空预览视图 | 中 | v1.5 | pending | Block 边缘延伸时间标注线，末端显示时间数字 |
| TB-R4 | 动态时间范围：视图起止 = 当周最早/最晚 Block ± 留白 | 中 | v1.5 | pending | 不再固定 0:00–24:00，自动裁剪 |
| TB-R5 | 编辑模式切换：图标按钮进入/退出编辑模式 | 中 | v1.5 | pending | 编辑模式显示网格，支持框选/模板创建 |
| TB-R6 | 网格线显示偏好开关（非编辑模式下可常开） | 低 | v1.5 | pending | 存 Settings / localStorage |
| TB-R7 | 删除重叠警告，嵌套叠加为正常功能 | 低 | v1.5 | pending | overlap 检测 + 警告图标全部移除 |
| TB-R8 | 任务显式关联 Time Block（DB + UI） | 高 | v1.5 | pending | 任务归属具体 Block，Block 内列表展示任务 |
| TB-R9 | Agent 读取可用学习时间（Study Block − 叠加非学习 Block） | 中 | v1.5 | pending | Agent 排期逻辑重写 |
| TB-R10 | 单层约束：每天最多 1 个 Study Block，Meal/Rest/Custom 不限 | 低 | v1.5 | pending | 前端校验 + 后端校验 |
| TB-R11 | 创建交互重构：框选后右键菜单 → 编辑面板（含时间选择器） | 中 | v1.5 | pending | 替代旧的内嵌弹出表单，解决列宽不足问题 |
| TB-R12 | 全局内容区拓宽：去除页面左右多余留白 | 低 | v1.5 | pending | max-width + padding 缩减，日历等宽屏页面擑满 |

### Layer 3（高级交互）

| ID | 需求 | 复杂度 | 版本 | 状态 |
|----|------|--------|------|------|
| TB-L2a | Time Block 模板系统（预设日程模板） | 高 | v1.9 | pending |
| TB-L2b | 格子点选创建交互（替代拖拽框选） | 中 | v1.9 | pending |
| TB-L2c | Agent 工具 create_time_block | 中 | v1.9 | pending |
| TB-L2d | Agent 引导设置 Time Block 流程 | 中 | v1.9 | pending |

---

## 卡片数据模型升级

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| CD-1 | 卡片详情视图放大（纯 CSS，容纳数学内容） | 低 | v1.4 | done | |
| CD-2 | 所有卡片类型增加 Example 字段 | 中 | v1.4 | done | Schema 变更 + 迁移 + UI |
| CD-3 | Theorem 增加 Condition 字段 | 中 | v1.4 | done | v1.3 已实现（conditions + proof_sketch） |
| CD-4 | AI 写推导过程按钮（仅 Theorem） | 中 | v1.6 | pending | 用户主动触发，符合设计宪法 |
| CD-5 | Review "撕胶带"遮挡交互 | 中-高 | v1.6 | pending | 全新 Review UI 组件，分层遮挡 |
| CD-6 | 各类型独立复习模板系统 | 高 | v1.8 | pending | DEF/THM/FML/GEN 各自模板，含浏览+复习 |

---

## 复习体验升级

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| RV-1 | 复习模式选择（翻面/填空/选择题/混合） | 中 | v1.6 | pending | |
| RV-2 | 填空题模式（自动遮掩 → 输入 → 对比 → 评分） | 中 | v1.6 | pending | |
| RV-3 | 选择题模式（同 Deck/Section 卡片生成干扰项） | 中 | v1.6 | pending | |
| RV-4 | 混合模式（三种模式随机切换） | 中 | v1.6 | pending | |
| RV-5 | 复习模式偏好（Settings 设默认 + 临时切换） | 中 | v1.6 | pending | |
| RV-6 | Time Block 排期（Agent 将复习排入 study Time Block） | 中 | v1.6 | pending | |

---

## 错题本系统

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| WB-1 | 错题记录（评分为 1 的卡片自动标记） | 中 | v1.6 | pending | |
| WB-2 | 错题本入口（Review 页面"需要加强"入口） | 中 | v1.6 | pending | |
| WB-3 | 错题本复习（直接发起复习会话） | 中 | v1.6 | pending | |
| WB-4 | 错题本移除（连续 2 次 ≥3 自动移出 + 手动移除） | 中 | v1.6 | pending | 符合设计宪法：不强调"错误" |
| WB-5 | Agent 感知（get_weak_cards 工具） | 中 | v1.6 | pending | |

---

## 成就系统

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| AC-1 | 成就数据模型（achievements + user_achievements 表） | 中 | v1.7 | pending | |
| AC-2 | 成就类型定义（里程碑型，覆盖复习/任务/目标） | 中 | v1.7 | pending | |
| AC-3 | 成就检测引擎（被动检测，已有事件触发点检查） | 中 | v1.7 | pending | |
| AC-4 | 成就展示页面（卡片式布局） | 中 | v1.7 | pending | |
| AC-5 | 解锁通知（Toast 一次性提示，可关闭） | 中 | v1.7 | pending | |
| AC-6 | 设计宪法合规（无 streak 型、无完成率型成就） | 中 | v1.7 | pending | 硬性约束 |

---

## Statistics 深度洞察

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| ST-1 | 复习洞察（记忆保持率曲线、卡片难度分布、每周复习量趋势） | 中 | v1.7 | pending | |
| ST-2 | 学习节奏（基于 Task 完成时间戳分析——被动展示） | 中 | v1.7 | pending | 符合设计宪法：不监控用户 |
| ST-3 | 课程深度（Goal 完成进度、卡片掌握度分布、错题卡片数） | 中 | v1.7 | pending | |
| ST-4 | 数据导出（用户可导出 Statistics 数据为 CSV） | 中 | v1.7 | pending | |

---

## Goal 多依赖 DAG

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| GD-5 | 多依赖选择（编辑 Goal 时支持多选前置 Goal） | 中 | v1.8 | pending | |
| GD-6 | DAG 可视化（Goal Manager 显示完整 DAG 图） | 中-高 | v1.8 | pending | |
| GD-7 | Agent DAG 排期（理解 DAG 拓扑序） | 中-高 | v1.8 | pending | |
| GD-8 | 动态优先级（考试模式紧急度权重） | 中 | v1.8 | pending | |

---

## 基础设施 / 分发

| ID | 需求 | 复杂度 | 版本 | 状态 | 备注 |
|----|------|--------|------|------|------|
| INF-1 | Electron 打包 + 分发 | 高 | v1.9 | pending | |
| INF-2 | 通知系统 | 中 | v1.9 | pending | |
| INF-3 | 自动化测试 | 高 | v1.9 | pending | |
| INF-4 | 安全加固 | 中 | v1.9 | pending | |

---

## 统计摘要

| 领域 | 条目数 | 来源 |
|------|--------|------|
| Time Block 系统 (L1) | 3 | Session 2，v1.4 已完成 |
| Time Block 重构 (L2) | 12 | Session 3 新增 + Session 4 补充，v1.5 |
| Time Block 高级交互 (L3) | 4 | Session 2，v1.9 |
| 卡片数据模型升级 | 6 | Session 2 新增 |
| 复习体验升级 | 6 | Session 1 原规划 |
| 错题本系统 | 5 | Session 1 原规划 |
| 成就系统 | 6 | Session 1 原规划 |
| Statistics 深度洞察 | 4 | Session 1 原规划 |
| Goal 多依赖 DAG | 4 | Session 1 原规划 |
| 基础设施 / 分发 | 4 | Session 1 路线图 |
| **合计** | **54** | |

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
