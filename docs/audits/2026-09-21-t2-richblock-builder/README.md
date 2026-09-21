> **状态 (Status)**: active（builder 证据；STOP，未获收口放行）
> **层 (Layer)**: 审计 / Builder evidence
> **日期 (Updated)**: 2026-09-21
> **权威 (Authoritative)**: 否；只记录本次实际施工与验证

# T2 富块提案管线 · builder 证据

实现已落地；**服务端全量仍有两项 Python/MinerU 环境失败，因此停线，工单保持 ready，不宣称全量全绿或完成放行**。未绕过失败、未排除既有用例、未修改 Python 环境或相关产品代码。T1 的 HQ 已收口记录不代替 T2 当前环境的实测。

## 证据索引

| 文件 | 内容 |
|---|---|
| [files-and-lines.json](files-and-lines.json) | 本单 22 个实现、测试和说明文件的逐件行号、字节数、SHA-256 |
| [prompt-hashes.json](prompt-hashes.json) | 旧生成提示词、新节、追加后、移除新节还原件的哈希与字节数 |
| [gate-result.json](gate-result.json) | 25 个非 git/secrets 验证组件的命令、退出码、耗时、原始日志位置 |
| [final-checks-result.json](final-checks-result.json) | 说明书同步与最终实现后的知识闸、评测类型检查、server 构建、文档闸复验 |
| [client-final-result.json](client-final-result.json) | 两处收件箱接线后的 client 全库与构建 |
| [server-all-result.json](server-all-result.json) | 递归枚举 server/src 与 server/scripts 的 111 文件全量；零排除、每文件 600000 ms |
| [server-stop.json](server-stop.json) | 两项停线失败及精确原始日志行号；wilderness 确认在全量清单 |
| [server-recheck-result.json](server-recheck-result.json) | 修正凭据隔离路径后的失败集复验：原 10 项目录配置失败消失，只剩 Python 两项 |
| [targeted-result.json](targeted-result.json) / [agent-result.json](agent-result.json) | 富块定向与 agent 族独立回归 |
| [eval-scoreboard.json](eval-scoreboard.json) / [eval-scoreboard.md](eval-scoreboard.md) | 既有 13 场景 + 新场景，14/14，125/125 断言 |
| [scenario-14.json](scenario-14.json) | 新零轮 scripted 场景原始合成数据库证据、逐型落行与 warning |

## 实测数字与射程

| 验证 | 实测结果 |
|---|---|
| 富块定向 6 文件 | 54/54，0 skipped；新文件自身 8 条测试，覆盖多型/边界/降级/归门/恢复/amendment |
| client 全库（最终代码） | 230 文件，2341/2341；最终 client build exit 0 |
| server 全量（最终代码） | 111 文件；Node 报告 1118 tests，1116 pass、2 fail、0 skipped/cancelled、0 flaky retry；exit 1 |
| server 失败集与最新定向复验 | 69 tests，67 pass、2 fail；exit 1 |
| agent 族独立回归 | 339/339，0 skipped/cancelled、0 flaky retry |
| 既有 13 scripted 场景 | 13/13，122/122 断言 |
| 新 rich-block 场景 | 3/3 断言；0 user turns、0 provider/tool rounds，chat 调用计数 0 |
| runtime 门授权子集 | **非 git/secrets 的 25 组件，25/25 exit 0**；不是完整 27 组件门通过 |
| 最终说明书/知识/构建复验 | 知识测试 29/29；知识 check、评测场类型检查、server build、docs:check 全 exit 0 |

各组存在重叠，不相加当作独立用例数。`v2SourceMineruWiring.test.ts` 在模块加载阶段失败，其内部用例没有获得通过证明；1118 是 Node 实际报告口径。server 全量没有按 120 秒截断：每文件预算 600 秒，实际本轮约 109 秒完成；`scripts/v13WildernessExecute.test.ts` 明列于 111 文件清单。

## 停线证据

1. `.codex-tmp/t2-richblock/server-all.log:61806`：`v2SourceMineruWiring.test.ts` 文件加载失败；相邻堆栈为 `spawnSync python.exe ENOENT`。失败集复验同形，见 `server-recheck.log:5913`。
2. `.codex-tmp/t2-richblock/server-all.log:62646`：`v2SourceRegionCells.test.ts` 的 MinerU 表区域功能用例，固定 uv CPython 启动失败，code 101。失败集复验同形，见 `server-recheck.log:5954`。

首次全量为 1106 pass / 12 fail：其中 10 项源于 builder 测试启动器将空凭据目录设在仓内，被现役凭据服务按设计拒绝；已把**测试隔离目录**改为系统临时目录下的新建空目录，复验和第二次零排除全量证实这 10 项恢复。没有改产品凭据服务，也没有读取真实凭据。首次原始日志保留为 `server-all-initial.log`，不可将其结果冒充最终结果。

## 出生公约与边界

- table/component/toc 载荷经人门 `createNoteBlockSchema` 下同一份 strict Zod；组件另外限现役三个内建 kind。
- B3 原只有客户端形状；新增一份服务端 `paragraphFurnitureSchema`，人门创建与提案归一化共用。furniture 保持 paragraph 的 placement 外观，键下只准 variant 和 source/label 文本。
- 生成与 apply 均重验；未知类型、未知 kind 或错误载荷降成 paragraph，原文进入 plain_text/body，warning 同时留块级与提案级、apply 返回。无自动 apply。
- 新生成文字只写现役 TextFlow 形状与语义角色；章节角色保留 heading/heading_1/heading_2/heading_3，删除的标题不参与判断。无 TextFlow schema 扩展。
- 新生产代码没有 CSS、颜色值、字体值、私有间距、坐标字段或新的 `--sk-` token。文字内容允许自由文本；「零视觉字面值」指无样式参数，不将材料中的字词误判为视觉指令。
- C2 主 prompt、note_patch、read_note 输出 schema、坐标契约、Relation/判断域、工具名/效果归类、数据库表列和依赖清单零改。源码改动仅富块管线、预览、评测及同源 furniture 校验。
- 无 git 写操作；未跑门尾 git 检查或 secrets 扫描，均留 HQ。既存未跟踪文件未修改。所有新合成凭据仅 `synthetic`/`syn-t2` 等短值，未新增安全对抗用例；功能边界用例是工单指定范围。

## 未做与后续承接

HQ 需在可用 Python 环境复跑 server 全量并补门尾 git/secrets 两组件，再决定放行。真实模型效果、全保真预览、真实用户库与主观浏览器签收均未做，也不在本单施工射程。确定性合成仅识别显式 Markdown 表格、日期行、引用和提示语法；图表支持载荷与生成指导，回退不从文字猜数字。

所有原始测试日志、隔离运行器、施工前生成器副本及评测 worker 日志留 `.codex-tmp/t2-richblock/`。代码只由主 builder 串行编辑；子 agent 仅只读核对前置与代码，未另开施工线。
