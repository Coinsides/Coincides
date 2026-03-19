# 设计宪法审计报告 — v1.3

**审计日期**: 2026-03-19  
**审计范围**: v1.3 全模块（含 Steps 1-4 新增代码）  
**审计人**: Coincides 工程团队

---

## 设计宪法（三条不可违反）

| # | 条款 | 内容 |
|---|------|------|
| §1 | 不替用户做决定 | AI 只拆解、只建议、只执行 |
| §2 | 不监控用户 | 不追踪用时、不判断精力、不主动生成用户没要求的东西 |
| §3 | 不制造挫败感 | 不锁死时间、不自动回顾失败、跳过任务零惩罚 |

**v1.3 附加规则**: `estimated_minutes` 仅限内部调度，禁止暴露给用户界面。

---

## 审计结果总览

| 状态 | 数量 |
|------|------|
| 🔴 P0 违规（已修复） | 3 |
| 🟢 PASS | 9 |
| **总计** | **12** |

---

## P0 违规（已修复）

### V-01: DailyBrief UI 暴露 estimated_minutes

- **文件**: `client/src/pages/DailyBrief/DailyBrief.tsx` (原 line 96)
- **违反条款**: §3 + v1.3 附加规则
- **问题**: MWF 卡片显示 `⏱ ~{estimated_minutes} min`，向用户暴露系统估算的完成时间，可能制造时间压力与挫败感
- **修复**: 移除该行，MWF 卡片仅显示任务数和卡片数（客观事实）

### V-02: DailyBrief UI "behind schedule" 措辞

- **文件**: `client/src/pages/DailyBrief/DailyBrief.tsx` (原 line 224)
- **违反条款**: §3
- **问题**: 循环任务提醒显示 `{days_behind} behind schedule`，措辞具有惩罚性，暗示用户"落后"了
- **修复**: 移除 "behind schedule" 措辞，仅显示 `{completed}/{total} completed`（中性事实陈述）

### V-03: DailyBrief 后端返回 estimated_minutes 和 days_behind

- **文件**: `server/src/routes/dailyBrief.ts` (原 lines 137, 125)
- **违反条款**: §3 + v1.3 附加规则
- **问题**: API 计算并返回 `estimated_minutes` 和 `days_behind` 字段给前端
- **修复**:
  - 移除 `estimatedMinutes` 计算和 `estimated_minutes` 响应字段
  - 移除 `days_behind` 和 `expected_completed` 响应字段
  - 更新 `shared/types/index.ts` 中对应的类型定义

---

## PASS 项目

### P-01: Statistics 模块

- **文件**: `client/src/pages/Statistics/Statistics.tsx`
- **结论**: PASS
- **说明**: 显示学习 streak 🔥、完成率等统计信息，均为被动展示（用户主动进入页面查看），不主动推送，不包含惩罚性措辞

### P-02: Energy Selector（能量选择器）

- **文件**: `client/src/pages/DailyBrief/DailyBrief.tsx`
- **结论**: PASS (§2)
- **说明**: 能量等级由用户手动选择，非 AI 自动判断。系统不追踪用户精力变化趋势

### P-03: Agent 工具 — generate_weekly_review

- **文件**: `server/src/agent/tools/executor.ts`
- **结论**: PASS
- **说明**: 周回顾中包含 `behind_schedule` 字段，但该功能仅在用户主动请求时触发（被动），不会自动生成

### P-04: System Prompt 监控防护

- **文件**: `server/src/agent/system-prompt.ts`
- **结论**: PASS (§2)
- **说明**: System Prompt 明确禁止 AI 主动监控用户行为，`estimated_minutes` 标注为内部调度专用

### P-05: Calendar 上下文菜单

- **文件**: `client/src/pages/Calendar/Calendar.tsx`
- **结论**: PASS (§3)
- **说明**: `contextMenuDanger` 样式仅用于"删除"操作按钮的标准红色样式，非惩罚性视觉元素

### P-06: Calendar — 无逾期惩罚样式

- **文件**: `client/src/pages/Calendar/Calendar.tsx`, `Calendar.module.css`
- **结论**: PASS (§3)
- **说明**: 日历视图中未发现对逾期/未完成任务的红色高亮、警告图标或任何惩罚性视觉处理

### P-07: Time Block 重叠提示

- **文件**: i18n `overlapHint` 键
- **结论**: PASS (§3)
- **说明**: 重叠提示措辞为中性（"时间块重叠" / "Time blocks overlap"），仅陈述事实，无批判性语气

### P-08: study_activity_log 用途

- **文件**: `server/src/routes/review.ts`, `statistics.ts`, `tasks.ts`
- **结论**: PASS (§2)
- **说明**: `study_activity_log` 仅记录 `card_reviewed` 事件用于复习统计，不追踪用户行为模式或时间使用情况

### P-09: Shrink 防护

- **文件**: 全局搜索
- **结论**: PASS (§1)
- **说明**: 未发现 UI 缩小 / resize 相关的强制行为。`ignore` 调用均为标准 try-catch 错误抑制

---

## 类型变更

| 文件 | 变更 |
|------|------|
| `shared/types/index.ts` | `DailyBriefData.minimum_working_flow` 移除 `estimated_minutes` 字段 |
| `shared/types/index.ts` | `RecurringTaskAlert` 移除 `expected_completed` 和 `days_behind` 字段 |

---

## 结论

v1.3 新增的 Time Block、Goal 依赖、调度引擎、L1 Onboarding 等功能均符合设计宪法要求。发现的 3 个 P0 违规（均属于 v1.2 遗留问题）已全部修复。修复原则：**只展示客观事实，不附加主观判断**。
