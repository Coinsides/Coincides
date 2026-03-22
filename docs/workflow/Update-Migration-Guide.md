# Coincides — 版本更新与数据迁移规范

> 最后更新：2026-03-22
> 适用范围：v1.x 本地应用 → v1.9 Electron 分发 → v2.0+ 云端

---

## 一、核心原则

1. **用户数据永远不能丢** — 任何版本更新后，用户已有的课程、目标、任务、卡片必须完整保留
2. **Migration 一旦发布，永远不能修改** — 要改就加新 migration
3. **更新对用户无感** — 用户不需要知道数据结构变了，启动即自动升级

---

## 二、Migration 系统工作原理

### 执行流程

```
应用启动
  ↓
schema.sql 执行（CREATE TABLE IF NOT EXISTS — 只对全新数据库有效）
  ↓
Migration Runner 扫描 server/src/db/migrations/ 目录
  ↓
对比 db_migrations 表中已执行记录
  ↓
按文件名顺序执行未执行的 migration
  ↓
每个 migration 在事务中执行（失败回滚）
  ↓
正常启动
```

### 版本跳跃更新

用户可以从任意版本直接更新到任意更高版本：

```
v1.5 → v1.9：自动执行 migration 006-014（所有中间版本的迁移）
v1.7 → v1.9：自动执行 migration 012-014
v1.9 → v1.9.1：自动执行新增的 migration
```

---

## 三、Migration 编写规范

### 文件命名

```
server/src/db/migrations/
├── 001_baseline.ts
├── 002_task_upgrade.ts
├── ...
├── 015_next_feature.ts      ← 递增编号
```

### 文件结构

```typescript
import type Database from 'better-sqlite3';

export default {
  id: '015_next_feature',                    // 唯一标识，与文件名一致
  description: '简要描述这个迁移做了什么',       // 启动时打印到控制台
  up(db: Database.Database): void {
    // 迁移逻辑
  },
};
```

### 危险操作处理

| 操作 | 正确做法 | 错误做法 |
|------|---------|---------|
| 新增表 | `CREATE TABLE IF NOT EXISTS` | 直接 `CREATE TABLE`（可能已存在） |
| 新增列 | `ALTER TABLE ... ADD COLUMN` | 在 schema.sql 里加（迁移前会报错） |
| 删除表 | `DROP TABLE IF EXISTS` | 直接 `DROP TABLE` |
| 重建表 | 先 `RENAME TO _old` → 建新表 → 复制数据 → `DROP _old` | 直接删了重建（丢数据） |
| 改 FK 引用 | `PRAGMA foreign_keys = OFF` → 重建表 → `PRAGMA foreign_keys = ON` | 不关 FK 直接操作 |
| 清空引用列 | 先 `UPDATE ... SET col = NULL` 再改表 | 直接改表（FK 悬空） |

### SQLite 特殊注意

1. **SQLite 不支持 DROP COLUMN** — 需要重建表（RENAME → CREATE → INSERT → DROP old）
2. **ALTER TABLE RENAME 会自动更新其他表的 FK 引用** — 这可能导致 FK 指向错误的表名（v1.7.3 的 bug 教训）
3. **PRAGMA foreign_keys 设置不跨连接** — 在 migration 中关闭 FK 后必须在 finally 中重新开启
4. **schema.sql 中不要放迁移会改掉的结构** — 否则已迁移的数据库在 schema.sql 阶段就会报错

---

## 四、schema.sql 与 Migration 的分工

| | schema.sql | Migration |
|---|---|---|
| **作用** | 为全新数据库创建基线表结构 | 演进已有数据库的结构 |
| **执行时机** | 每次启动都执行 | 只执行一次（按 id 去重） |
| **安全要求** | 所有语句必须 `IF NOT EXISTS` | 需要处理各种已有数据状态 |
| **规则** | 不要放会被迁移改掉的表/索引 | 不要假设数据库是空的 |

### 被迁移管理的表（不在 schema.sql 中定义）

- `time_blocks`（migration 007 创建，013 重建）
- `time_block_overrides`（migration 007 创建，013 删除）
- `time_block_template_sets`（migration 012 创建）
- `time_block_templates`（migration 012 创建）

---

## 五、Electron 分发场景的更新流程

### 自动更新机制（v1.9+）

```
用户运行 Coincides v1.9.0
  ↓
启动时 electron-updater 检查 GitHub Releases
  ↓
发现 v1.9.1 可用
  ↓
后台下载新安装包
  ↓
提示用户"有新版本，是否重启更新？"
  ↓
用户确认 → 替换应用文件 → 重启
  ↓
新版本启动 → Migration Runner 自动执行新 migration
  ↓
用户无感，数据完整
```

### 数据存储位置

| 内容 | 位置 | 更新时 |
|------|------|--------|
| 应用代码 | 安装目录（被替换） | 覆盖 |
| SQLite 数据库 | `%APPDATA%/coincides/data/` | **保留** |
| 用户配置 | `%APPDATA%/coincides/config/` | **保留** |
| 日志 | `%APPDATA%/coincides/logs/` | **保留** |

---

## 六、发版 Checklist

每次发布新版本前：

- [ ] 新 migration 文件编号递增且无重复
- [ ] 新 migration 已通过 TypeScript 编译
- [ ] 在已有数据库上测试迁移（不是空数据库）
- [ ] schema.sql 没有引用被迁移改掉的列/表/索引
- [ ] 已有 migration 文件未被修改（只增不改）
- [ ] CHANGELOG 已更新
- [ ] Git tag 与版本号一致

---

## 七、灾难恢复

如果 migration 失败：

1. Migration Runner 会回滚该 migration 的事务
2. 服务器拒绝启动，打印错误信息
3. 修复 migration 代码 → 发布新版本 → 用户更新后重试
4. 用户数据在失败前的状态保持不变（事务保护）

**最坏情况**：如果用户的数据库损坏了
- SQLite 数据库是单文件，用户可以从备份恢复
- v1.9+ 可考虑在 migration 前自动备份数据库文件
