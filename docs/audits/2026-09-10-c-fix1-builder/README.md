> **状态 (Status)**: active
> **层 (Layer)**: evidence / builder 真机回执
> **日期 (Updated)**: 2026-09-10

# C 走查修一真机证据

结论与六冒烟逐条说明见 [工单 Result](../../agent-ops/handoffs/2026-09-10-v13-5-c-fix1-order.md#result)。

F15、三态及本轮识别出的页眉槽坐标修复已落地。Client 116 文件／1244 测试全过、client/server build 通过；**真机⑥发现既有 Board range 撤销后仍 drifted，停线**。另有 docs INDEX 过期、F16 缺少 Henry 原图唯一对应、凭据扫描留 HQ。不可把本目录当完整放行证明。

- `01-*`：新把手菜单及 Layout 明显禁用。
- `02-visible-line.png`：真机按住时的蓝色插入线；配套 `02-final-drag-events.json` 记录 trusted pointer 及 frame。
- `02-reorder-result.png`、`02-extract-result.png`、`02-cross-block-result-fixed.png`：实际重排、新块、迁入目标的结果；分别在异步变更后核对 DOM 和截图。
- `03-*`、`04-*`：默认／hover／选中颜色及矩形、header/footer/page-number 对齐。F16 原截图未附，本轮识别对象为页眉槽的细实线。
- `05-*`：真实总览与生产打印生命周期 DOM 检查；没有运行系统打印预览或物理打印。
- `06-*`：键盘、Layout 块拖动、墨迹与 Undo；`06-board-range-undo-gap.json` 保留失败的客户端请求和最终库状态对照。
- `before-*` 与 `cross-block-failure-events.json`：修前观察，不能当最终通过证据。
- `final-synthetic-db.json`：本进程新建 `:memory:` 数据库及真实路由请求；`final-synthetic-runtime.json` 为生产运行时 DOM 输出。均为合成数据。
- `client-full-unit.log`：最后一次完整未过滤全库（仅 `--maxWorkers=2`）；两个 build 日志与 `docs-check.log` 同目录。其余17项允许子命令的日志位于仓根 `.codex-tmp/c-fix1-gate-*.log`。
- `numstat.txt`：最终 tracked diff 及本轮新增文件的行数／二进制大小（此清单自身不递归统计）。未 stage／commit／push。

截图是多个实际交互时点，并非同一张静态初始页面。笔迹为本轮原生画笔动作，后半程部分截图中的白色短线是该墨迹。未修改或拼接截图。合成 fixture 的可重复启动说明见 `client/scripts/cFix1Smoke/README.md`。
