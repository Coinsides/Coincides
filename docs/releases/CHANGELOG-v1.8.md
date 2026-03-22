# Coincides v1.8 — Electron 桌面应用打包

## [v1.8.0] Electron 打包

### Step 1 — Electron 骨架 + 数据路径迁移
- **commit**: `ffbe8e4`
- 新增 `electron/main.ts` 主进程，管理窗口生命周期
- 数据目录迁移至 `%APPDATA%/coincides/`（Windows），含 `data/` 和 `uploads/`
- 服务器 `init.ts` 和 `upload.ts` 支持 `DB_PATH` / `UPLOAD_DIR` 环境变量
- `server/src/index.ts` 增加 `express.static` 服务打包后的客户端文件
- `package.json` 增加 electron-builder 配置（NSIS 安装包、GitHub Publish）
- 版本号升级至 1.8.0

### Step 2 — 构建与打包调试
- **commits**: `a42b144`, `f5d162c`, `260f5b6`, `db771f7`, `d6f3d7a`
- 修复 DeckDetail `addToast` 类型错误（解除客户端 build 阻断）
- Electron 主进程从 `import()` 改为 `fork()`，再改为 `spawn()` + `ELECTRON_RUN_AS_NODE`
- tsconfig 输出格式从 ESM 改为 CommonJS
- 禁用 asar 打包（解决路径解析问题）
- 支持从 `%APPDATA%/coincides/.env` 和 `server/.env` 双路径读取 API 密钥

### Step 2.1 — jiti v2 兼容性修复
- **问题**：jiti v2 不再提供 `register.cjs`，`--require jiti/register.cjs` 启动失败
- **方案**：新增 `electron/server-loader.cjs`，使用 jiti 的 `createJiti` + `jiti.import()` 异步加载服务端 TypeScript
  - 绕过 jiti v2 仅提供 ESM register hook 的限制
  - 正确支持 `top-level await` 和 `import.meta.url` 等 ESM 特性
- Electron 主进程 `spawn` 改为直接执行 `server-loader.cjs`（不再依赖 `--require`）
- electron-builder `files` 配置加入 `electron/server-loader.cjs`
- 移除废弃的 `electron/jiti-register.cjs`

---

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `electron/main.ts` | 新增/修改 | Electron 主进程，spawn server-loader.cjs |
| `electron/server-loader.cjs` | 新增 | CJS 引导脚本，jiti async import 加载 TS 服务 |
| `electron/tsconfig.json` | 新增 | CommonJS 输出配置 |
| `package.json` | 修改 | electron-builder + scripts + v1.8.0 |
| `server/src/index.ts` | 修改 | express.static + SPA fallback |
| `server/src/db/init.ts` | 修改 | 支持 DB_PATH 环境变量 |
| `server/src/middleware/upload.ts` | 修改 | 支持 UPLOAD_DIR 环境变量 |
