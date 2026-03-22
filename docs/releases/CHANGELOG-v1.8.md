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

### Step 2.1 — jiti v2 兼容性 + Windows 路径修复
- **问题1**：jiti v2 不再提供 `register.cjs`，`--require jiti/register.cjs` 启动失败
- **问题2**：Electron 内置 Node 的 ABI 版本与系统 Node 不同，better-sqlite3 无法加载
- **问题3**：jiti v2 的 ESM hooks 在 Windows 下返回裸路径（`D:\...`）而非 `file://` URL，导致 `ERR_UNSUPPORTED_ESM_URL_SCHEME`
- **方案**：
  - 用系统 Node（`findSystemNode()`）替代 Electron 内置 Node 运行 server 子进程
  - 直接用 `node --import jiti/register src/index.ts`（与 server 的 dev 命令一致）
  - 新增 `scripts/patch-jiti-windows.cjs` 修复 jiti-hooks.mjs 的 Windows 路径问题
  - `electron:dev` / `electron:dist` 命令自动运行 patch
- 移除废弃的 `electron/jiti-register.cjs`

---

### 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `electron/main.ts` | 新增/修改 | Electron 主进程，findSystemNode + --import jiti/register |
| `electron/tsconfig.json` | 新增 | CommonJS 输出配置 |
| `scripts/patch-jiti-windows.cjs` | 新增 | 修复 jiti ESM hooks 的 Windows 路径问题 |
| `package.json` | 修改 | electron-builder + scripts + patch:jiti + v1.8.0 |
| `server/src/index.ts` | 修改 | express.static + SPA fallback |
| `server/src/db/init.ts` | 修改 | 支持 DB_PATH 环境变量 |
| `server/src/middleware/upload.ts` | 修改 | 支持 UPLOAD_DIR 环境变量 |
