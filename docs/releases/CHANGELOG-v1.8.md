# Coincides v1.8 — 云端部署 + PWA 离线支持

> 方向变更：原计划 Electron 桌面打包，因架构不匹配放弃，改为云端部署

## Step 1 — 清理 Electron 残留

### 删除的文件/目录
- `electron/` 目录（main.ts, tsconfig.json, server-loader.cjs）
- `scripts/patch-jiti-windows.cjs`
- `dist-electron/`、`release/` 输出目录
- 根目录 `node_modules/`、`package-lock.json`（Electron 依赖）

### 清理的配置
- `package.json`：移除 electron/electron-builder/electron-updater 依赖、Electron 相关 scripts、build 配置、main 字段
- `.gitignore`：移除 Electron 条目（dist-electron/、release/、*.exe 等）

### 保留的有用改动（云端部署同样需要）
- `server/src/index.ts`：express.static 服务客户端 + SPA fallback
- `server/src/db/init.ts`：支持 `DB_PATH` 环境变量
- `server/src/middleware/upload.ts`：支持 `UPLOAD_DIR` 环境变量

### Electron 尝试的教训记录
在 Electron 打包过程中遇到四层兼容性问题，记录在此以供参考：
1. jiti v2 无 CJS 入口 — Electron 的 CommonJS 环境无法加载 jiti/register
2. Electron Node ABI ≠ 系统 Node ABI — native 模块（better-sqlite3）无法跨运行时加载
3. jiti ESM hooks Windows bug — resolve()/load() 返回裸路径而非 file:// URL
4. 架构不匹配 — 运行时 TS 编译 + ESM + native 模块的组合与 Electron 天然冲突

## Step 2 — SQLite → PostgreSQL 迁移

### Step 2a+2d — PostgreSQL 基础设施
- 新增 `server/src/db/pool.ts`：PostgreSQL 连接池（query/queryOne/queryAll/execute/transaction）
- 重写 `server/src/db/schema.sql`：转换为 PostgreSQL 语法（BOOLEAN, TIMESTAMPTZ, JSONB, GIN 索引等）
- 重写 `server/src/db/init.ts`：PostgreSQL 初始化
- 重写 `server/src/db/migrate.ts`：PostgreSQL 迁移机制，标记 SQLite 001-014 迁移为已应用
- 新增 `server/src/db/migrations-pg/` 目录
- 删除 `server/src/db/migrations/`（旧 SQLite 迁移）

### Step 2b — 自动化 db.prepare() → pool 查询转换
- 自动转换 411 处 `db.prepare().get()`/`.all()`/`.run()` 为 `queryOne()`/`queryAll()`/`execute()`
- `?` 占位符 → `$1, $2, ...` 编号参数

### Step 2c — 向量搜索 + 全文搜索适配
- 重写 `vectorStore.ts`：FTS5 → tsvector/tsquery + GIN 索引
- sqlite-vec → stubbed（pgvector 后续加入）
- 移除 better-sqlite3 和 sqlite-vec npm 依赖

### Step 2 后续修复
- 修复 64 处 TypeScript 语法错误（自动转换遗漏）
- 修复 96 处类型/语义错误（多轮修复）
- 运行时修复：boolean 0/1 → TRUE/FALSE
- 运行时修复：JSONB 字段 JSON.parse 移除（PostgreSQL 自动解析 JSONB）
- 运行时修复：`goals.ts` 动态查询 `?` → `$N`
- **全面修复动态 SQL 查询**：修复 69+ 处动态构建的 SQL 中遗留的 `?` 占位符
  - 涉及 13 个文件：executor.ts, tasks.ts, goals.ts, courses.ts, cards.ts, timeBlocks.ts, review.ts, proposals.ts, decks.ts, sections.ts, tags.ts, manager.ts, scheduling.ts
  - 三类问题：
    1. `fields.push('col = ?')` → `fields.push(\`col = $\${paramIdx++}\`)`（动态 SET 子句）
    2. `sql += ' AND col = ?'` → 带 `$N` 的模板字符串（动态 WHERE 条件）
    3. `ids.map(() => '?')` → `ids.map(() => \`$\${idx++}\`)`（动态 IN 列表）
  - 同时修复：单引号字符串内 `$${paramIdx++}` 无法插值的 bug（必须用反引号模板字符串）
  - 修复 `WHERE id = $1` 与动态 SET 子句的参数编号冲突
  - 修复 SQLite `date('now', '-7 days')` → PostgreSQL `CURRENT_DATE - INTERVAL '7 days'`
  - 修复 `retrieveMemories` 中 LIKE 条件全部引用 `$1` 的逻辑错误
- **全面排查 schema vs 代码字段不匹配**：
  - `time_blocks` 缺失 3 列：`template_id TEXT`, `color TEXT`, `updated_at TIMESTAMPTZ`
  - `task_cards` 缺失 2 列 + PK 错误：添加 `id TEXT PRIMARY KEY`, `checklist_index INTEGER`
  - `time_block_template_sets` 缺失 `updated_at TIMESTAMPTZ`
  - `time_block_templates` 缺失 `color TEXT`，且 `set_id` 应为 `template_set_id`
  - 新增迁移 015：ALTER TABLE 添加以上缺失字段（兼容已有数据库）
  - 修复 `MAX(0, x)` → PostgreSQL `GREATEST(0, x)`（3 处）
  - 修复 `IS $3` → `IS NOT DISTINCT FROM $3`（NULL 值比较）
  - 修复 template items 误写入 `time_blocks` 表 → 改为 `time_block_templates` 表
