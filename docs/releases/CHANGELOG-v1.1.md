# CHANGELOG — v1.1

> 格式：每个 Step 完成后追加一条记录。

---

## Step 1：DB Migration 机制 + 配置验证

**日期**：2026-03-18

### 新增

- `server/src/db/migrate.ts` — Migration Runner
  - 自动扫描 `migrations/` 目录，按文件名排序执行
  - `db_migrations` 表追踪已执行的 migration（id, description, applied_at）
  - 每个 migration 包裹在事务中，失败即回滚
  - 启动时由 `initDb()` 自动调用，已执行的 migration 不会重复运行

- `server/src/db/migrations/001_baseline.ts` — 基线 Migration
  - 将 v1.0 init.ts 中 8 条 ad-hoc `ALTER TABLE` 语句迁入正式 migration
  - 使用 `safeAlter()` 包装，新旧数据库均可安全执行
  - 建立干净的基线：v1.1+ 所有 schema 变更走 migration 机制

- `server/src/db/validateConfig.ts` — 启动配置验证器
  - 检查 `ANTHROPIC_API_KEY`、`VOYAGE_API_KEY`（均为 optional）
  - 缺失 optional key → 打印 warning 继续启动
  - 缺失 required key → 打印错误 + 退出（当前无 required key）
  - 在 `index.ts` 中最先执行，早于数据库初始化

### 修改

- `server/src/db/init.ts`
  - `initDb()` 从同步改为 `async`（因 migration runner 使用 dynamic import）
  - 移除 8 条 ad-hoc `ALTER TABLE` 语句（已迁入 001_baseline）
  - 末尾调用 `await runMigrations(db)`
  - 虚拟表 / 触发器 / FTS5 保留原位（使用 IF NOT EXISTS，天然幂等）

- `server/src/index.ts`
  - 新增 `validateConfig()` 调用（数据库初始化前执行）
  - `initDb()` → `await initDb()`（配合 async 改造）

### 技术决策

- Migration 文件使用 TypeScript + ESM dynamic import，与项目技术栈一致
- 选择文件系统 migration（非 SQL-only）以支持复杂 migration 逻辑（如数据回填）
- `001_baseline` 不改变实际 schema，仅标记基线，确保升级路径安全
