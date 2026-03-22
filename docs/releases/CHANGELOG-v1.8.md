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
