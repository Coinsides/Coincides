# Coincides v1.0 发布说明

> 发布日期：2026-03-18

## 版本概述

Coincides 的首个完整版本。从零开始构建了一个面向学生的智能学习管理应用，核心理念是"Minimum Working Flow"——通过每日最低学习量保持学习连续性。

## ✨ 新增功能

### 基础功能
- **用户系统**：注册 / 登录 / JWT 认证
- **课程管理**：课程创建、权重设置（重要/一般/不重要）
- **目标管理**：学习目标创建、进度追踪
- **任务系统**：每日任务三档优先级（Must / Recommended / Optional）

### 知识卡片系统
- 四种卡片模板：Definition / Theorem / Formula / General
- FSRS 间隔重复算法，智能安排复习时间
- KaTeX 数学公式渲染
- 卡组分组 + Section 管理（折叠、搜索、批量操作）
- 拖拽排序（Section 间 + Section 内 + 跨 Section）

### AI 学习助手（Mr. Zero）
- 18+ 个 AI 工具（查询课程/任务/目标、创建卡片、搜索文档等）
- Proposal 机制：AI 生成的所有变更必须经用户审核后才能生效
- SSE 流式对话，实时打字效果
- Agent 短期 + 长期记忆

### 文档系统
- 多格式文档上传（PDF / DOCX / XLSX / 图片 / TXT）
- PDF 双通道解析：原生文本提取 + Claude Vision OCR
- 长文档智能分块存储

### 记忆系统（向量搜索 + RAG）
- Voyage AI 语义向量 + sqlite-vec 向量存储
- FTS5 全文搜索
- 三路混合搜索引擎：语义 > 全文 > 关键词

### 其他
- Daily Brief 页面（每日学习概览 + MWF 最低量）
- 日历视图（月视图 + 日视图）
- 统计面板（纯 SVG 图表）
- 复习界面（左滑答案 / 右滑翻转 / 键盘快捷键 / 多种筛选模式）
- Glassmorphism 设计风格（全 26 个 CSS 模块）
- 快捷键面板

## ℹ️ 更新方式

首次安装：
1. `git clone https://github.com/Coinsides/Coincides.git`
2. `npm run setup`
3. 创建 `.env` 文件填入 API Keys
4. 两个终端分别启动后端和前端
