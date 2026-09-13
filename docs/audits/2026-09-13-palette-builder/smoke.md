> **状态 (Status)**: passed
> **层 (Layer)**: 审计 / Builder 真浏览器冒烟
> **日期**: 2026-09-13

# 调色板实际应用冒烟

复现命令（仓库根）：

```text
node client/scripts/paletteSmoke/verify.mjs --isolated-chrome-no-sandbox
```

实际 `server/src/index.ts` + 实际 Vite 应用；API 5197、前端 5198。每次创建全新 `.tmp/palette-validation/smoke/run-*`，SQLite、资源目录、应用数据目录、空 dotenv 与浏览器 profile 均隔离。先等本次子进程明确报启动成功才访问 API，端口冲突不会复用其他进程。未使用 mock API 或用户库。

最终结果：**13 项通过；浏览器应用请求 73、响应 73，全部成功；运行时异常 0；最终截图 11 张**。逐项结果、实际请求路径/响应码与截图名见 [smoke-receipts.json](smoke-receipts.json)。

- 真实首次迁移执行 070；合成用户注册后获得 24 个 factory 色。
- 真实笔记外观 → 纸面外观 → 高级颜色 → 纸面取色器，四区顺序正确。
- 点用户池色，后端保存 `palette:<uuid>`，纸面 CSS 立即跟随。
- 就地将池色修改为 `#AbCDef88`，真实 paper 消费者解析值同步。
- 删除池色后，前后 `--sk-paper` 均逐字为 `#AbCDef88`；API 回读 note override 同样为 `#AbCDef88`，池色已消失。
- 标准蓝点选保存字面量 `#4A6FA5`。
- 加色表单直接输入独立 Hex `#B1C2D3`，新资产入池并绑定引用。
- 自由 Hex `#C6D7E8` 保存字面量，再通过常驻入池按钮沿用当前值、命名并绑定引用。
- 斜杠分组折叠；Escape 关闭并恢复纸面触发器焦点。
- 已打开的取色器缩到 360×740 后边界为 left=8、right=352、top=52、bottom=732。
- 实际页面重新加载后，从后端重新读取的引用仍解析为 `#C6D7E8`。

已查看最终桌面四区与窄屏截图。常规 Chrome 152 和 Edge 153 均可建立浏览器级 CDP 会话，但空白隔离页的 renderer `Runtime.enable/evaluate` 超时；随后使用仓库既有的显式隔离测试参数 `--isolated-chrome-no-sandbox` 完成上述验证。该参数只影响本次临时 Chrome 进程，工具/文件系统沙箱与用户浏览器配置不变。此环境差异记录在 JSON isolation 字段中。

范围说明：窄屏验证针对已打开的统一取色器随窗口缩放；既有外层笔记外观壳在 360px 下的入口布局不在本单内。本轮未据此修改快选条、浮卡或外观壳。
