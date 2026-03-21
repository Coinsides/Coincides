# Coincides — Changelog Index

本文件是变更日志的索引，指向各版本的详细日志。

---

## 版本日志

| 版本 | 文件 | 说明 |
|------|------|------|
| v1.7.1 | [CHANGELOG-v1.7.md](../releases/CHANGELOG-v1.7.md) | Agent 效率深度优化：并行执行 + Playbook + Context 预注入 |
| v1.3.1 | [CHANGELOG-v1.3.1.md](../releases/CHANGELOG-v1.3.1.md) | 补丁版本：3 个 bug 修复 + Windows 兼容性 + Agent 稳定性 |
| v1.3 | [CHANGELOG-v1.3.md](../releases/CHANGELOG-v1.3.md) | Time Block + AI 排期 + L1 入驻流 + 设计宪法审计 |
| v1.2 | [CHANGELOG-v1.2.md](../releases/CHANGELOG-v1.2.md) | AI 交互重构 + Goal Manager + 新用户引导 + i18n |
| v1.1 | [CHANGELOG-v1.1.md](../releases/CHANGELOG-v1.1.md) | UX 痛点修复 + 技术债 + DB Migration |
| v1.0 | [CHANGELOG-v1.0.md](./CHANGELOG-v1.0.md) | Phase 0 → Round 4 完整建设日志（780+ 行） |

## 规则

- 每个版本维护独立的 CHANGELOG 文件（v1.1+ 存于 `releases/` 目录）
- 命名格式：`CHANGELOG-v{版本号}.md`
- 新版本的日志从该版本第一个 commit 开始记录
- 单个 CHANGELOG 文件内按时间倒序排列（最新在最上面）
- 每个 Step 完成时同步更新日志（遵循 Workflow 中的同步规则）
- **Release Notes 是单独的文件**，存于 `releases/RELEASE-NOTES-v{版本号}.md`
